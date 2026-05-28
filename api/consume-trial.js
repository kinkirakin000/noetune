// POST /api/consume-trial
// Called once per completed result view. Increments trial_used_count for free users.
// Always returns 200 — the caller must never break on a non-2xx from this endpoint.
//
// Uses the consume_trial(uuid) Postgres RPC which locks the profile row with
// FOR UPDATE before checking and incrementing, preventing TOCTOU race conditions
// when the result screen is shown in multiple concurrent tabs or requests.
//
// Response fields:
//   loggedIn      — false when token is missing/invalid or Supabase not configured
//   allowed       — true if the session should proceed (paid or trial not exhausted)
//   unlimited     — true for plan_status === 'plus'
//   locked        — true when trial exhausted or plan is past_due/canceled
//   trialUsedCount, trialLimit, remaining — present when loggedIn && !unlimited

const { getSupabaseAdmin } = require('../lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    // Supabase not configured — allow session to complete (dev/offline mode)
    return res.status(200).json({ allowed: true, unlimited: false, loggedIn: false });
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    // Unauthenticated — allow session for now (login gate comes in a later commit)
    return res.status(200).json({ allowed: true, unlimited: false, loggedIn: false });
  }

  try {
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return res.status(200).json({ allowed: true, unlimited: false, loggedIn: false });
    }

    // Atomic check-and-increment via Postgres RPC.
    // The consume_trial function locks the row with FOR UPDATE, so concurrent
    // requests cannot both read the same trial_used_count and both increment it.
    const { data, error } = await supabaseAdmin.rpc('consume_trial', { p_user_id: user.id });

    if (error || !data) {
      // RPC failure — allow session to complete rather than blocking the user
      return res.status(200).json({ allowed: true, unlimited: false, loggedIn: true });
    }

    return res.status(200).json(data);
  } catch (e) {
    // Any server error — allow session to complete rather than blocking the user
    return res.status(200).json({ allowed: true, unlimited: false, loggedIn: false });
  }
};
