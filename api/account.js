// DELETE /api/account
const { getSupabaseAdmin } = require('../lib/supabase-admin');
const stripeFactory = require('stripe');
const { validateRequest, performAccountDeletion } = require('../lib/v17-account-deletion');

module.exports = async (req, res) => {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const request = validateRequest(req);
  if (!request.ok) {
    if (request.status === 403) return res.status(403).json({ error: 'Forbidden' });
    if (request.status === 401) return res.status(401).json({ error: 'Authentication required' });
    return res.status(400).json({ error: 'Invalid deletion confirmation' });
  }
  const admin = getSupabaseAdmin();
  if (!admin) return res.status(500).json({ error: 'Account deletion failed' });
  try {
    const userResult = await admin.auth.getUser(request.token);
    const user = userResult && userResult.data && userResult.data.user;
    if (userResult.error || !user) return res.status(401).json({ error: 'Authentication required' });
    const stripe = process.env.STRIPE_SECRET_KEY ? stripeFactory(process.env.STRIPE_SECRET_KEY) : null;
    const result = await performAccountDeletion({ admin, stripe, user });
    if (!result.ok && result.kind === 'profile_missing') return res.status(409).json({ error: 'Account profile unavailable' });
    if (!result.ok && result.kind === 'profile_lookup') return res.status(500).json({ error: 'Account deletion failed' });
    return res.status(200).json({ deleted: true });
  } catch (error) {
    const kind = error && error.__accountDeleteKind;
    if (kind === 'billing') console.error('[account-delete] billing operation failed');
    else if (kind === 'auth') console.error('[account-delete] auth deletion failed');
    else console.error('[account-delete] application cleanup failed');
    return res.status(kind === 'billing' ? 502 : 500).json({ error: kind === 'billing' ? 'Billing deletion unavailable' : 'Account deletion failed' });
  }
};
