// GET /api/config
// Returns public client-side configuration values.
// These are the Supabase anon key and URL — both are designed to be public.
// Returns null values if env vars are not configured (app degrades gracefully).

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    supabaseUrl:     process.env.NEXT_PUBLIC_SUPABASE_URL || null,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null,
    posthogKey:      process.env.NEXT_PUBLIC_POSTHOG_KEY || null,
    posthogHost:     process.env.NEXT_PUBLIC_POSTHOG_HOST || null,
  });
};
