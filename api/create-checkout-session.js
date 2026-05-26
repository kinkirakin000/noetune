// POST /api/create-checkout-session
// Creates a Stripe Checkout Session for Noetune Professional.
//
// Product:   Noetune Professional — Plus monthly
// Currency:  USD $9.99 / month
// Price ID:  process.env.STRIPE_PRICE_PLUS_MONTHLY
//
// Flow:
//   1. Verify Supabase JWT from Authorization header
//   2. Get or create stripe_customer_id on profile
//   3. Create Stripe Checkout Session (subscription mode)
//   4. Return { url } — redirect user to Stripe-hosted checkout
//
// After payment:
//   - Stripe fires checkout.session.completed webhook → /api/stripe-webhook
//   - Webhook updates profiles.plan_status = 'plus'
//
// Requires:  Authorization: Bearer <supabase-access-token>

// TODO (Commit 5 — Stripe Checkout):
//   const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
//   const { supabaseAdmin } = require('../lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.status(501).json({
    status: 'not_implemented',
    message: 'Coming in Commit 5: Stripe Checkout',
  });
};
