const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const adminPath = require.resolve('../../lib/supabase-admin');
const handlerPath = require.resolve('../../api/me');

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

async function run(admin, headers = { authorization: 'Bearer PRIVATE_TOKEN' }) {
  delete require.cache[handlerPath];
  require.cache[adminPath] = { id: adminPath, filename: adminPath, loaded: true, exports: { getSupabaseAdmin: () => admin } };
  const handler = require(handlerPath);
  const logs = [];
  const originalInfo = console.info;
  console.info = (...args) => logs.push(args);
  try {
    const res = response();
    await handler({ method: 'GET', headers }, res);
    return { res, logs };
  } finally {
    console.info = originalInfo;
    delete require.cache[handlerPath];
  }
}

function adminFor({ auth, profile }) {
  return {
    auth: { getUser: async () => auth },
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        single: async () => profile,
      };
    },
  };
}

test('each /api/me branch emits exactly one fixed diagnostic marker', async () => {
  const cases = [
    { name: 'admin unavailable', admin: null, expected: 'api_me_admin_unavailable', headers: {} },
    { name: 'token missing', admin: adminFor({}), expected: 'api_me_token_missing', headers: {} },
    { name: 'auth failure', admin: adminFor({ auth: { data: { user: null }, error: { message: 'PRIVATE_PROVIDER_ERROR', stack: 'PRIVATE_STACK' } } }), expected: 'api_me_auth_validation_failed' },
    { name: 'profile missing', admin: adminFor({ auth: { data: { user: { id: 'PRIVATE_USER_ID', email: 'PRIVATE_EMAIL' } }, error: null }, profile: { data: null, error: { code: 'PGRST116', message: 'PRIVATE_PROFILE_ERROR' } } }), expected: 'api_me_profile_missing' },
    { name: 'profile query failure', admin: adminFor({ auth: { data: { user: { id: 'PRIVATE_USER_ID', email: 'PRIVATE_EMAIL' } }, error: null }, profile: { data: null, error: { code: 'XX', message: 'PRIVATE_DB_ERROR' } } }), expected: 'api_me_profile_query_failed' },
    { name: 'success', admin: adminFor({ auth: { data: { user: { id: 'PRIVATE_USER_ID', email: 'PRIVATE_EMAIL' } }, error: null }, profile: { data: { plan_status: 'free' }, error: null } }), expected: 'api_me_success' },
  ];
  for (const entry of cases) {
    const result = await run(entry.admin, entry.headers);
    assert.deepEqual(result.logs, [[entry.expected]], entry.name);
  }
});

test('unexpected failures are fixed-marker-only and responses stay generic', async () => {
  const admin = {
    auth: { getUser: async () => { throw new Error('PRIVATE_PROVIDER_ERROR PRIVATE_TOKEN PRIVATE_URL'); } },
  };
  const { res, logs } = await run(admin);
  assert.deepEqual(logs, [['api_me_unexpected_failure']]);
  assert.deepEqual(res.body, { loggedIn: false, user: null, profile: null });
  const serialized = JSON.stringify({ logs, body: res.body });
  for (const sentinel of ['PRIVATE_PROVIDER_ERROR', 'PRIVATE_TOKEN', 'PRIVATE_URL', 'PRIVATE_USER_ID', 'PRIVATE_EMAIL', 'PRIVATE_SESSION_TEXT']) {
    assert.equal(serialized.includes(sentinel), false, sentinel);
  }
});

test('success response contract remains unchanged', async () => {
  const { res } = await run(adminFor({
    auth: { data: { user: { id: 'PRIVATE_USER_ID', email: 'PRIVATE_EMAIL' } }, error: null },
    profile: { data: { plan_status: 'free', trial_used_count: 1, trial_limit: 5 }, error: null },
  }));
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    loggedIn: true,
    user: { id: 'PRIVATE_USER_ID', email: 'PRIVATE_EMAIL' },
    profile: {
      plan_status: 'free', trial_used_count: 1, trial_limit: 5,
      current_period_end: null, billing_state: 'free', hasStripeCustomer: false,
      subscription: {
        status: null, cancelAtPeriodEnd: null, currentPeriodEnd: null,
        price: { currency: null, unitAmount: null, interval: null, intervalCount: null },
      },
    },
  });
});
