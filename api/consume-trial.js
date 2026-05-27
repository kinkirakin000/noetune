// POST /api/consume-trial
// Called once per completed result view. Increments trial_used_count for free users.
// Always returns 200 — the caller must never break on a non-2xx from this endpoint.
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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('plan_status, trial_used_count, trial_limit')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // Profile missing — allow session (will auto-create on next auth event)
      return res.status(200).json({ allowed: true, unlimited: false, loggedIn: true });
    }

    const { plan_status, trial_used_count, trial_limit } = profile;

    if (plan_status === 'plus') {
      return res.status(200).json({ allowed: true, unlimited: true, loggedIn: true });
    }

    if (plan_status === 'past_due' || plan_status === 'canceled') {
      return res.status(200).json({
        allowed: false, locked: true, loggedIn: true,
        trialUsedCount: trial_used_count, trialLimit: trial_limit, remaining: 0,
      });
    }

    // plan_status === 'free' — enforce trial limit
    if (trial_used_count >= trial_limit) {
      return res.status(200).json({
        allowed: false, locked: true, loggedIn: true,
        trialUsedCount: trial_used_count, trialLimit: trial_limit, remaining: 0,
      });
    }

    // Consume one trial
    const newCount = trial_used_count + 1;
    await supabaseAdmin
      .from('profiles')
      .update({ trial_used_count: newCount })
      .eq('id', user.id);

    const remaining = trial_limit - newCount;
    return res.status(200).json({
      allowed: true, locked: false, loggedIn: true,
      trialUsedCount: newCount, trialLimit: trial_limit, remaining,
    });
  } catch (e) {
    // Any server error — allow session to complete rather than blocking the user
    return res.status(200).json({ allowed: true, unlimited: false, loggedIn: false });
  }
};
