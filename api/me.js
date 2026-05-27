// GET /api/me
// Returns the current user's Noetune profile.
// Requires:  Authorization: Bearer <supabase-access-token>
// Returns:   { loggedIn, user, profile }
//   - loggedIn: false + nulls when unauthenticated or Supabase not configured
//   - loggedIn: true  + user/profile when token is valid
//
// Always returns 200. The app must not break when this endpoint returns loggedIn: false.

const { getSupabaseAdmin } = require('../lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(200).json({ loggedIn: false, user: null, profile: null });
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(200).json({ loggedIn: false, user: null, profile: null });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(200).json({ loggedIn: false, user: null, profile: null });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan_status, trial_used_count, trial_limit, subscription_id, current_period_end')
      .eq('id', user.id)
      .single();

    return res.status(200).json({
      loggedIn: true,
      user: { id: user.id, email: user.email },
      profile: profile || { plan_status: 'free', trial_used_count: 0, trial_limit: 5 },
    });
  } catch (e) {
    return res.status(200).json({ loggedIn: false, user: null, profile: null });
  }
};
