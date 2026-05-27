// POST /api/create-checkout-session
// Creates a Stripe Checkout Session for Noetune Professional.
//
// Product:   Noetune Professional — Plus monthly
// Price ID:  process.env.STRIPE_PRICE_PLUS_MONTHLY
//
// Flow:
//   1. Verify Supabase JWT from Authorization header
//   2. Get or create Stripe customer; persist stripe_customer_id on profile
//   3. Create Stripe Checkout Session (subscription mode)
//   4. Return { url } — client redirects to Stripe-hosted checkout
//
// After payment:
//   - Stripe fires checkout.session.completed → /api/stripe-webhook (Commit 6)
//   - Webhook updates profiles.plan_status = 'plus'
//
// Returns non-2xx on auth/config failure so the client can show a fallback.

const { getSupabaseAdmin } = require('../lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_PLUS_MONTHLY) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Auth not configured' });
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Lazy-require stripe so the file loads without error when STRIPE_SECRET_KEY is unset.
    // (The env check above guards against this path being reached without the key.)
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://noetune.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_PLUS_MONTHLY, quantity: 1 }],
      success_url: `${appUrl}/?checkout=success`,
      cancel_url: `${appUrl}/?checkout=cancel`,
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error('[create-checkout-session]', e.message);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
};
