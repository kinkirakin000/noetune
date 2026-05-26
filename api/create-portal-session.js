// POST /api/create-portal-session
// Creates a Stripe Customer Portal session for subscription management.
// The portal lets users cancel, update payment, or view invoices.
//
// Flow:
//   1. Verify Supabase JWT from Authorization header
//   2. Fetch stripe_customer_id from profile
//   3. Create Stripe Billing Portal session with return_url = NEXT_PUBLIC_APP_URL
//   4. Return { url } — redirect user to Stripe-hosted portal
//
// Requires:  Authorization: Bearer <supabase-access-token>
//            profiles.stripe_customer_id must be set (user must have subscribed at least once)

// TODO (Commit 7 — Customer Portal):
//   const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
//   const { supabaseAdmin } = require('../lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.status(501).json({
    status: 'not_implemented',
    message: 'Coming in Commit 7: Customer Portal',
  });
};
