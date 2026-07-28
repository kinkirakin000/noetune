const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
}

async function runClaim({ profile, selectError, insertError, updateError, user = { id: 'SYNTHETIC_USER', email: 'synthetic@example.invalid' }, token = 'SYNTHETIC_TOKEN', expectedToken = 'SYNTHETIC_TOKEN', body = undefined }) {
  const originalLoad = Module._load;
  const calls = { mutations: 0, filters: [], body };
  const admin = {
    auth: { async getUser(receivedToken) { calls.token = receivedToken; return receivedToken === expectedToken ? { data: { user }, error: null } : { data: { user: null }, error: { code: 'invalid' } }; } },
    from() {
      const chain = {
        select() { return this; },
        insert(value) { calls.mutations += 1; calls.insert = value; return this; },
        update(value) { calls.mutations += 1; calls.update = value; return this; },
        eq(field, value) { calls.filters.push([field, value]); return this; },
        neq(field, value) { calls.filters.push([field, value]); return this; },
        async single() {
          if (calls.mutations === 0) { if (selectError) throw selectError; return { data: profile, error: null }; }
          if (calls.insert) { if (insertError) throw insertError; return { data: { plan_status: 'free', trial_used_count: 1, trial_limit: 5 }, error: null }; }
          if (updateError) throw updateError;
          return { data: { plan_status: 'free', trial_used_count: 1, trial_limit: 5 }, error: null };
        }
      };
      return chain;
    }
  };
  Module._load = function(requestName, parent, isMain) {
    if (requestName === '../lib/supabase-admin') return { getSupabaseAdmin() { return admin; } };
    return originalLoad.call(this, requestName, parent, isMain);
  };
  delete require.cache[require.resolve('../../api/claim-guest-first-session')];
  const handler = require('../../api/claim-guest-first-session');
  const logs = [];
  const originalError = console.error;
  console.error = (...args) => logs.push(args);
  try {
    const req = { method: 'POST', headers: token === null ? {} : { authorization: 'Bearer ' + token }, body };
    const res = response();
    await handler(req, res);
    return { res, logs, calls };
  } finally {
    console.error = originalError;
    Module._load = originalLoad;
    delete require.cache[require.resolve('../../api/claim-guest-first-session')];
  }
}

function assertFixedFailure(result) {
  assert.equal(result.res.statusCode, 200);
  assert.deepEqual(result.res.body, { loggedIn: false, claimed: false });
  assert.deepEqual(result.logs, [['[claim-guest-first-session] claim operation failed']]);
  assert.equal(JSON.stringify(result.logs).includes('PRIVATE_'), false);
  assert.equal(JSON.stringify(result.res.body).includes('PRIVATE_'), false);
}

test('profile select exception is redacted', async () => {
  const error = new Error('PRIVATE_CLAIM_SELECT_MESSAGE'); error.stack = 'PRIVATE_CLAIM_SELECT_STACK';
  assertFixedFailure(await runClaim({ selectError: error, body: { user_id: 'PRIVATE_CLIENT_USER_ID', sessionText: 'PRIVATE_SESSION_CONTENT', snapshot: 'PRIVATE_SNAPSHOT_CONTENT' } }));
});

test('profile insert exception is redacted', async () => {
  const error = new Error('PRIVATE_CLAIM_INSERT_MESSAGE'); error.stack = 'PRIVATE_CLAIM_INSERT_STACK';
  const result = await runClaim({ profile: null, insertError: error });
  assertFixedFailure(result);
  assert.equal(JSON.stringify(result.calls).includes('PRIVATE_'), false);
});

test('claim update exception is redacted', async () => {
  const error = new Error('PRIVATE_CLAIM_UPDATE_MESSAGE'); error.stack = 'PRIVATE_CLAIM_UPDATE_STACK';
  const result = await runClaim({ profile: { plan_status: 'free', trial_used_count: 0, trial_limit: 5 }, updateError: error });
  assertFixedFailure(result);
  assert.equal(JSON.stringify(result.calls).includes('PRIVATE_'), false);
});

test('missing and invalid token remain generic and perform no mutation', async () => {
  const missing = await runClaim({ token: null });
  assert.deepEqual(missing.res.body, { loggedIn: false, claimed: false });
  assert.equal(missing.calls.mutations, 0);
  assert.deepEqual(missing.logs, []);
  const invalid = await runClaim({ token: 'INVALID_TOKEN', expectedToken: 'SYNTHETIC_TOKEN' });
  assert.deepEqual(invalid.res.body, { loggedIn: false, claimed: false });
  assert.equal(invalid.calls.mutations, 0);
  assert.deepEqual(invalid.logs, []);
});

test('Plus and already-counted users remain skipped', async () => {
  const plus = await runClaim({ profile: { plan_status: 'plus', trial_used_count: 0, trial_limit: 5 } });
  assert.deepEqual(plus.res.body, { loggedIn: true, claimed: false, skipped: 'plus', profile: plus.res.body.profile });
  assert.equal(plus.calls.mutations, 0);
  const counted = await runClaim({ profile: { plan_status: 'free', trial_used_count: 1, trial_limit: 5 } });
  assert.equal(counted.res.body.skipped, 'already_counted');
  assert.equal(counted.res.body.claimed, false);
  assert.equal(counted.calls.mutations, 0);
});

test('successful claim uses server-derived identity and preserves response shape', async () => {
  const result = await runClaim({ profile: { plan_status: 'free', trial_used_count: 0, trial_limit: 5 }, body: { user_id: 'PRIVATE_CLIENT_USER_ID', sessionText: 'PRIVATE_SESSION_CONTENT', snapshot: 'PRIVATE_SNAPSHOT_CONTENT' } });
  assert.equal(result.res.statusCode, 200);
  assert.equal(result.res.body.loggedIn, true);
  assert.equal(result.res.body.claimed, true);
  assert.equal(result.calls.filters.some(([field, value]) => field === 'id' && value === 'SYNTHETIC_USER'), true);
  assert.equal(result.calls.update.trial_used_count, 1);
  assert.equal(JSON.stringify(result.logs).includes('PRIVATE_'), false);
  assert.equal(JSON.stringify(result.res.body).includes('PRIVATE_'), false);
});
