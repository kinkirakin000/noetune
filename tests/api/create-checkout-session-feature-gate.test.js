const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const handlerPath = require.resolve('../../api/create-checkout-session');
const adminPath = require.resolve('../../lib/supabase-admin');

function response() {
  return { statusCode: 0, body: null, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; } };
}

async function run({ flag, method = 'POST', admin, stripe, headers = { authorization: 'Bearer PRIVATE_TOKEN' } }) {
  const original = process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED;
  if (flag === undefined) delete process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED;
  else process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED = flag;
  const originalLoad = Module._load;
  let stripeLoads = 0;
  Module._load = function(request, parent, isMain) {
    if (request === 'stripe') { stripeLoads += 1; return () => stripe; }
    return originalLoad.call(this, request, parent, isMain);
  };
  delete require.cache[handlerPath];
  require.cache[adminPath] = { id: adminPath, filename: adminPath, loaded: true, exports: { getSupabaseAdmin: () => admin } };
  try {
    const handler = require(handlerPath);
    const out = response();
    await handler({ method, headers }, out);
    return { out, stripeLoads };
  } finally {
    Module._load = originalLoad;
    delete require.cache[handlerPath];
    if (original === undefined) delete process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED;
    else process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED = original;
  }
}

test('non-POST remains 405 and disabled POST fails before dependencies', async () => {
  let adminCalls = 0;
  const admin = { auth: { getUser: async () => { adminCalls += 1; } } };
  const method = await run({ flag: undefined, method: 'GET', admin });
  assert.equal(method.out.statusCode, 405);
  const disabled = await run({ flag: undefined, admin, stripe: {} });
  assert.equal(disabled.out.statusCode, 503);
  assert.deepEqual(disabled.out.body, { error: 'checkout_unavailable' });
  assert.equal(disabled.stripeLoads, 0);
  assert.equal(adminCalls, 0);
});

test('only exact true enables the existing stubbed path', async () => {
  for (const flag of ['false', 'TRUE', '1', ' true', 'true ']) {
    const result = await run({ flag, admin: null, stripe: {} });
    assert.equal(result.out.statusCode, 503, flag);
    assert.deepEqual(result.out.body, { error: 'checkout_unavailable' });
  }

  const calls = { auth: 0, profile: 0, customer: 0, session: 0 };
  const admin = {
    auth: { getUser: async () => { calls.auth += 1; return { data: { user: { id: 'PRIVATE_USER_ID', email: 'PRIVATE_EMAIL' } }, error: null }; } },
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        single: async () => { calls.profile += 1; return { data: { stripe_customer_id: 'PRIVATE_CUSTOMER_ID' }, error: null }; },
        update() { return this; },
      };
    },
  };
  const stripe = {
    customers: { create: async () => { calls.customer += 1; return { id: 'PRIVATE_CUSTOMER_ID' }; } },
    checkout: { sessions: { create: async () => { calls.session += 1; return { url: 'https://checkout.invalid/session' }; } } },
  };
  process.env.STRIPE_SECRET_KEY = 'PRIVATE_SECRET';
  process.env.STRIPE_PRICE_PLUS_MONTHLY = 'PRIVATE_PRICE';
  const enabled = await run({ flag: 'true', admin, stripe });
  assert.equal(enabled.out.statusCode, 200);
  assert.deepEqual(enabled.out.body, { url: 'https://checkout.invalid/session' });
  assert.equal(calls.auth, 1);
  assert.equal(calls.profile, 1);
  assert.equal(calls.session, 1);
});

test('disabled response is fixed and contains no private values', async () => {
  const result = await run({ flag: 'PRIVATE_VALUE', admin: null, stripe: null, headers: { authorization: 'PRIVATE_TOKEN' } });
  const serialized = JSON.stringify(result.out.body);
  for (const value of ['PRIVATE_VALUE', 'PRIVATE_TOKEN', 'PRIVATE_EMAIL', 'PRIVATE_USER_ID', 'PRIVATE_CUSTOMER_ID', 'PRIVATE_PRICE', 'PRIVATE_SECRET', 'https://']) {
    assert.equal(serialized.includes(value), false, value);
  }
});
