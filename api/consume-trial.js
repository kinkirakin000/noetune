// POST /api/consume-trial
// Increments trial_used_count by 1 for the authenticated user.
//
// Rules:
//   - Call ONLY when the result screen is viewed (not on abandoned sessions).
//   - If plan_status === 'plus', do nothing and return { unlimited: true }.
//   - If trial_used_count >= trial_limit, return { locked: true }.
//   - Otherwise increment and return { trial_used_count, trial_limit, remaining }.
//
// Requires:  Authorization: Bearer <supabase-access-token>

// TODO (Commit 4 — Trial limit logic):
//   - Verify JWT
//   - Fetch profile; check plan_status
//   - If plus → return { unlimited: true }
//   - If trial_used_count >= trial_limit → return { locked: true }
//   - Otherwise → increment trial_used_count via service role, return updated counts

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.status(501).json({
    status: 'not_implemented',
    message: 'Coming in Commit 4: Trial limit logic',
  });
};
