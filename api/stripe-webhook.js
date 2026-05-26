// POST /api/stripe-webhook
// Receives and verifies Stripe webhook events.
// Must verify the stripe-signature header on every request.
//
// Handled events and resulting profile updates:
//
//   checkout.session.completed
//     → profiles.plan_status      = 'plus'
//     → profiles.stripe_customer_id = event.data.object.customer
//     → profiles.subscription_id   = event.data.object.subscription
//
//   customer.subscription.updated
//     → sync plan_status from subscription.status
//       (active → 'plus', past_due → 'past_due', canceled → 'canceled')
//     → update current_period_end
//
//   customer.subscription.deleted
//     → profiles.plan_status = 'canceled'
//
//   invoice.payment_succeeded
//     → profiles.plan_status      = 'plus'
//     → profiles.current_period_end = invoice.lines.data[0].period.end (as timestamptz)
//
//   invoice.payment_failed
//     → profiles.plan_status = 'past_due'
//
// Requires:
//   stripe-signature header (Stripe sends this automatically)
//   STRIPE_WEBHOOK_SECRET env var
//
// IMPORTANT:
//   Vercel serverless functions parse the body by default.
//   Stripe signature verification requires the raw body.
//   Must set bodyParser = false and read raw buffer.

// TODO (Commit 6 — Stripe Webhook):
//   const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
//   const { supabaseAdmin } = require('../lib/supabase-admin');
//   module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.status(501).json({
    status: 'not_implemented',
    message: 'Coming in Commit 6: Stripe Webhook',
  });
};
