// POST /api/create-portal-session
// Creates a Stripe Customer Portal session for subscription management.
// The portal lets paid users cancel, update payment method, or view invoices.
//
// Flow:
//   1. Verify Supabase JWT from Authorization header
//   2. Fetch stripe_customer_id from profile (must exist — user must have subscribed)
//   3. Create Stripe Billing Portal session with return_url = NEXT_PUBLIC_APP_URL
//   4. Return { url } — client redirects to Stripe-hosted portal

const { getSupabaseAdmin } = require('../lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
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

    if (!profile.stripe_customer_id) {
      return res.status(404).json({ error: 'No subscription found for this account' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://noetune.com';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/`,
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (e) {
    console.error('[create-portal-session] provider operation failed');
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
};
