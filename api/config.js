// GET /api/config
// Returns public client-side configuration values.
// All values here are NEXT_PUBLIC_* — safe to expose in the browser.
// STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and SUPABASE_SERVICE_ROLE_KEY
// are never returned here.
// Returns null values if env vars are not configured (app degrades gracefully).

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    supabaseUrl:          process.env.NEXT_PUBLIC_SUPABASE_URL || null,
    supabaseAnonKey:      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null,
    stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null,
    stripeCheckoutEnabled: process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED === 'true',
    posthogKey:           process.env.NEXT_PUBLIC_POSTHOG_KEY || null,
    posthogHost:          process.env.NEXT_PUBLIC_POSTHOG_HOST || null,
  });
};
