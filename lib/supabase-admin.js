// Server-side Supabase client using the service role key.
// Used only in /api/* serverless functions — never in the browser.
// The service role key bypasses Row Level Security.
//
// Lazily initialized so missing env vars do not crash cold starts.
// Always call getSupabaseAdmin() and check for null before use.

const { createClient } = require('@supabase/supabase-js');

let _client = null;

function getSupabaseAdmin() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}

module.exports = { getSupabaseAdmin };
