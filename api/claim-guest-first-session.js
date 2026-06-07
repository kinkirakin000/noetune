// POST /api/claim-guest-first-session
// Marks a completed guest first session as the user's first free trial session.
// Safe no-op for Plus users and users who already have trial usage.

const { getSupabaseAdmin } = require('../lib/supabase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(200).json({ loggedIn: false, claimed: false });
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(200).json({ loggedIn: false, claimed: false });
  }

  try {
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return res.status(200).json({ loggedIn: false, claimed: false });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan_status, trial_used_count, trial_limit')
      .eq('id', user.id)
      .single();

    if (!profile) {
      const { data: inserted } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          plan_status: 'free',
          plan_name: 'free',
          trial_used_count: 1,
          trial_limit: 5,
        })
        .select('plan_status, trial_used_count, trial_limit')
        .single();

      return res.status(200).json({
        loggedIn: true,
        claimed: !!inserted,
        profile: inserted || null,
      });
    }

    if (profile.plan_status === 'plus') {
      return res.status(200).json({ loggedIn: true, claimed: false, skipped: 'plus', profile });
    }

    if (Number(profile.trial_used_count || 0) > 0) {
      return res.status(200).json({ loggedIn: true, claimed: false, skipped: 'already_counted', profile });
    }

    const { data: updated } = await supabaseAdmin
      .from('profiles')
      .update({ trial_used_count: 1 })
      .eq('id', user.id)
      .eq('trial_used_count', 0)
      .neq('plan_status', 'plus')
      .select('plan_status, trial_used_count, trial_limit')
      .single();

    return res.status(200).json({
      loggedIn: true,
      claimed: !!updated,
      profile: updated || profile,
    });
  } catch (e) {
    console.error('[claim-guest-first-session]', e.message);
    return res.status(200).json({ loggedIn: false, claimed: false });
  }
};
