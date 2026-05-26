// GET /api/me
// Returns the current user's Noetune profile.
// Requires:  Authorization: Bearer <supabase-access-token>
// Returns:   { id, email, plan_status, trial_used_count, trial_limit }
//            or 401 if unauthenticated.
//
// Used by index.html to determine:
//   - Whether the user is logged in
//   - Whether they are on a paid plan (plan_status === 'plus')
//   - How many trial sessions remain

// TODO (Commit 2 — Supabase Auth scaffold):
//   - Parse JWT from Authorization header
//   - Verify with supabase.auth.getUser(token)
//   - Query profiles table for matching id
//   - Return profile fields

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.status(501).json({
    status: 'not_implemented',
    message: 'Coming in Commit 2: Supabase Auth scaffold',
  });
};
