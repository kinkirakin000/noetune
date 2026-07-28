const test = require('node:test');
const assert = require('node:assert/strict');
const { validateRequest, validateOrigin, deleteCustomer } = require('../../lib/v17-account-deletion');

function req(overrides = {}) { return Object.assign({ method: 'DELETE', headers: { authorization: 'Bearer synthetic-token', host: 'app.invalid' }, body: { confirmation: 'DELETE' } }, overrides); }

test('request boundary rejects unsafe methods, auth, confirmation, fields, and origin', () => {
  assert.equal(validateRequest(req({ method: 'POST' })).ok, true); // method guard is handler-owned
  assert.equal(validateRequest(req({ headers: { host: 'app.invalid' } })).status, 401);
  for (const value of [undefined, 'delete', 'Delete', ' DELETE', true]) assert.equal(validateRequest(req({ body: value === undefined ? {} : { confirmation: value } })).status, 400);
  for (const key of ['userId', 'user_id', 'email', 'stripeCustomerId', 'subscription_id', 'sessionText']) assert.equal(validateRequest(req({ body: { confirmation: 'DELETE', [key]: 'PRIVATE' } })).status, 400);
  assert.equal(validateOrigin(req({ headers: { authorization: 'Bearer x', host: 'app.invalid', origin: 'https://evil.invalid' } })), false);
  assert.equal(validateOrigin(req({ headers: { authorization: 'Bearer x', host: 'app.invalid', origin: 'http://app.invalid' } })), true);
  assert.equal(validateOrigin(req()), true);
});

test('customer deletion retrieves then deletes, and converges for absent resources', async () => {
  const calls = [];
  const stripe = { customers: { retrieve: async () => { calls.push('retrieve'); return { id: 'synthetic' }; }, del: async () => { calls.push('delete'); return { deleted: true }; } } };
  assert.deepEqual(await deleteCustomer(stripe, 'synthetic'), { ok: true });
  assert.deepEqual(calls, ['retrieve', 'delete']);
  const absent = { customers: { retrieve: async () => ({ deleted: true }), del: async () => { throw new Error('must not call'); } } };
  assert.deepEqual(await deleteCustomer(absent, 'synthetic'), { ok: true, absent: true });
});

test('customer absent and missing ID are safe skips', async () => {
  assert.deepEqual(await deleteCustomer(null, null), { ok: true, skipped: true });
  const stripe = { customers: { retrieve: async () => { const e = new Error('PRIVATE'); e.code = 'resource_missing'; throw e; }, del: async () => { throw new Error('must not call'); } } };
  assert.deepEqual(await deleteCustomer(stripe, 'synthetic'), { ok: true, absent: true });
});

test('provider failure does not reach application cleanup in the ordered contract', async () => {
  let cleaned = false;
  const stripe = { customers: { retrieve: async () => { const e = new Error('PRIVATE'); e.code = 'api_error'; throw e; }, del: async () => { throw new Error('PRIVATE'); } } };
  await assert.rejects(() => deleteCustomer(stripe, 'synthetic'));
  assert.equal(cleaned, false);
});

test('no private values are present in fixed logging contract source', () => {
  const fs = require('node:fs'); const source = fs.readFileSync(require.resolve('../../api/account.js'), 'utf8');
  assert.doesNotMatch(source, /console\.error\([^)]*(?:error|token|user|email|stripe|body)/i);
  assert.match(source, /\[account-delete\] application cleanup failed/);
});
