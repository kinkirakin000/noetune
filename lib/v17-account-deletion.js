'use strict';

function getBearerToken(req) {
  const value = req && req.headers && req.headers.authorization;
  if (typeof value !== 'string' || !value.startsWith('Bearer ') || value.length <= 7) return null;
  const token = value.slice(7).trim();
  return token || null;
}

function validateOrigin(req) {
  const origin = req && req.headers && req.headers.origin;
  if (!origin) return true;
  const host = req.headers.host;
  if (!host) return false;
  const forwarded = req.headers['x-forwarded-proto'];
  const protocol = forwarded ? String(forwarded).split(',')[0].trim() : (req.headers['x-forwarded-ssl'] === 'on' ? 'https' : 'http');
  try { return new URL(origin).origin === `${protocol}://${host}`; } catch (e) { return false; }
}

function validateRequest(req) {
  if (!validateOrigin(req)) return { ok: false, status: 403, code: 'origin' };
  const token = getBearerToken(req);
  if (!token) return { ok: false, status: 401, code: 'auth' };
  const body = req && req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : null;
  if (!body || body.confirmation !== 'DELETE' || Object.keys(body).length !== 1) return { ok: false, status: 400, code: 'confirmation' };
  return { ok: true, token };
}

function isAlreadyAbsentStripeError(error) {
  return !!error && (error.code === 'resource_missing' || error.statusCode === 404);
}

async function deleteCustomer(stripe, customerId) {
  if (!customerId) return { ok: true, skipped: true };
  let customer;
  try { customer = await stripe.customers.retrieve(customerId); }
  catch (error) { if (isAlreadyAbsentStripeError(error)) return { ok: true, absent: true }; throw error; }
  if (customer && customer.deleted === true) return { ok: true, absent: true };
  try { await stripe.customers.del(customerId); return { ok: true }; }
  catch (error) { if (isAlreadyAbsentStripeError(error)) return { ok: true, absent: true }; throw error; }
}

async function deleteApplicationRows(admin, userId) {
  for (const table of ['saved_results', 'saved_progress', 'bookmarks']) {
    const result = await admin.from(table).delete().eq('user_id', userId);
    if (result && result.error) throw result.error;
  }
}

async function performAccountDeletion({ admin, stripe, user }) {
  const profileResult = await admin.from('profiles').select('stripe_customer_id').eq('id', user.id).single();
  if (profileResult.error) {
    const missing = profileResult.error.code === 'PGRST116' || profileResult.error.code === 'PGRST117';
    return { ok: false, kind: missing ? 'profile_missing' : 'profile_lookup' };
  }
  if (!profileResult.data) return { ok: false, kind: 'profile_missing' };
  try { await deleteCustomer(stripe, profileResult.data.stripe_customer_id); }
  catch (error) { error.__accountDeleteKind = 'billing'; throw error; }
  try { await deleteApplicationRows(admin, user.id); }
  catch (error) { error.__accountDeleteKind = 'application'; throw error; }
  try { await admin.auth.admin.deleteUser(user.id, false); }
  catch (error) { error.__accountDeleteKind = 'auth'; throw error; }
  return { ok: true };
}

module.exports = { getBearerToken, validateOrigin, validateRequest, deleteCustomer, deleteApplicationRows, performAccountDeletion };
