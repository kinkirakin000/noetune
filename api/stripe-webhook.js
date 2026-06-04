// POST /api/stripe-webhook
// Receives and verifies Stripe webhook events, updates profiles.plan_status.
//
// IMPORTANT — raw body:
//   Stripe signature verification requires the exact raw bytes Stripe sent.
//   Vercel's plain Node.js runtime (api/*.js without Next.js framework) does NOT
//   auto-parse the body, so we read from the stream directly. Do not add a body
//   parser middleware or the signature check will always fail.
//
// Handled events:
//   checkout.session.completed    → plan_status = 'plus', store customer + subscription IDs
//   customer.subscription.updated → sync plan_status from subscription.status
//   customer.subscription.deleted → plan_status = 'canceled'
//   invoice.payment_succeeded     → plan_status = 'plus', update current_period_end
//   invoice.payment_failed        → plan_status = 'past_due'
//
// All other event types are acknowledged (200) and ignored.
// Processing errors after a valid signature return 200 to prevent Stripe retries.

const { getSupabaseAdmin } = require('../lib/supabase-admin');

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function subscriptionStatusToPlanStatus(status) {
  if (status === 'active' || status === 'trialing') return 'plus';
  if (status === 'past_due' || status === 'unpaid')  return 'past_due';
  if (status === 'canceled' || status === 'incomplete_expired') return 'canceled';
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'DB not configured' });
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  let rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (e) {
    return res.status(400).json({ error: 'Could not read request body' });
  }

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('[stripe-webhook] Signature verification failed:', e.message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${e.message}` });
  }

  // Process the event. Any error here returns 200 so Stripe does not retry — the
  // event was authentic; retrying a processing bug won't help and may cause duplicates.
  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = (session.metadata && session.metadata.user_id) || session.client_reference_id;
        if (!userId) break;

        await supabaseAdmin
          .from('profiles')
          .update({
            stripe_customer_id: session.customer,
            subscription_id:    session.subscription,
            plan_status:        'plus',
            plan_name:          'plus',
          })
          .eq('id', userId);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const planStatus = subscriptionStatusToPlanStatus(sub.status);
        if (!planStatus) break;

        const updates = { plan_status: planStatus };
        if (planStatus === 'plus')     updates.plan_name = 'plus';
        if (planStatus === 'canceled') updates.plan_name = 'free';
        if (sub.current_period_end) {
          updates.current_period_end = new Date(sub.current_period_end * 1000).toISOString();
        }

        // Look up by subscription_id; fall back to stripe_customer_id
        const { data: bySubId } = await supabaseAdmin
          .from('profiles')
          .update(updates)
          .eq('subscription_id', sub.id)
          .select('id');

        if (!bySubId || bySubId.length === 0) {
          await supabaseAdmin
            .from('profiles')
            .update(updates)
            .eq('stripe_customer_id', sub.customer);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const updates = { plan_status: 'canceled', plan_name: 'free' };

        const { data: bySubId } = await supabaseAdmin
          .from('profiles')
          .update(updates)
          .eq('subscription_id', sub.id)
          .select('id');

        if (!bySubId || bySubId.length === 0) {
          await supabaseAdmin
            .from('profiles')
            .update(updates)
            .eq('stripe_customer_id', sub.customer);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (!invoice.customer) break;

        const updates = { plan_status: 'plus', plan_name: 'plus' };
        const firstLine = invoice.lines && invoice.lines.data && invoice.lines.data[0];
        if (firstLine && firstLine.period && firstLine.period.end) {
          updates.current_period_end = new Date(firstLine.period.end * 1000).toISOString();
        }

        await supabaseAdmin
          .from('profiles')
          .update(updates)
          .eq('stripe_customer_id', invoice.customer);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (!invoice.customer) break;

        await supabaseAdmin
          .from('profiles')
          .update({ plan_status: 'past_due' })
          .eq('stripe_customer_id', invoice.customer);
        break;
      }

      default:
        // Unhandled event type — acknowledge and ignore
        break;
    }
  } catch (e) {
    console.error('[stripe-webhook] Processing error for event', event.type, ':', e.message);
    // Still return 200 — the event was valid; retrying won't fix a processing bug
  }

  return res.status(200).json({ received: true });
};
