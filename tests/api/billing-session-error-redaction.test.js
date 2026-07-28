const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
}

function request() {
  return { method: 'POST', headers: { authorization: 'Bearer SYNTHETIC_TOKEN' } };
}

async function runHandler(file, { profile, stripe, user = { id: 'SYNTHETIC_USER', email: 'synthetic@example.invalid' } }) {
  const originalLoad = Module._load;
  const originalEnv = {};
  for (const key of ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_PLUS_MONTHLY', 'NEXT_PUBLIC_APP_URL']) originalEnv[key] = process.env[key];
  process.env.STRIPE_SECRET_KEY = 'SYNTHETIC_STRIPE_KEY';
  process.env.STRIPE_PRICE_PLUS_MONTHLY = 'SYNTHETIC_PRICE';
  process.env.NEXT_PUBLIC_APP_URL = 'https://synthetic.example.invalid';
  const admin = {
    auth: { async getUser(token) { assert.equal(token, 'SYNTHETIC_TOKEN'); return { data: { user }, error: null }; } },
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        async single() { return { data: profile, error: null }; },
        update() { return this; }
      };
    }
  };
  Module._load = function(requestName, parent, isMain) {
    if (requestName === '../lib/supabase-admin') return { getSupabaseAdmin() { return admin; } };
    if (requestName === 'stripe') return function() { return stripe; };
    return originalLoad.call(this, requestName, parent, isMain);
  };
  delete require.cache[require.resolve(`../../api/${file}.js`)];
  const handler = require(`../../api/${file}.js`);
  handler.__cleanup = function() {
    Module._load = originalLoad;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    delete require.cache[require.resolve(`../../api/${file}.js`)];
  };
  return handler;
}

async function capture(handler, stripe, profile) {
  const logs = [];
  const originalError = console.error;
  const originalEnv = {};
  for (const key of ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_PLUS_MONTHLY', 'NEXT_PUBLIC_APP_URL']) originalEnv[key] = process.env[key];
  process.env.STRIPE_SECRET_KEY = 'SYNTHETIC_STRIPE_KEY';
  process.env.STRIPE_PRICE_PLUS_MONTHLY = 'SYNTHETIC_PRICE';
  process.env.NEXT_PUBLIC_APP_URL = 'https://synthetic.example.invalid';
  console.error = (...args) => logs.push(args);
  try {
    const res = response();
    await handler(request(), res);
    return { res, logs };
  } finally {
    console.error = originalError;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    if (handler.__cleanup) handler.__cleanup();
  }
}

test('Checkout customer creation exception is fully redacted', async () => {
  const message = 'PRIVATE_CHECKOUT_CUSTOMER_MESSAGE';
  const error = new Error(message); error.stack = 'PRIVATE_CHECKOUT_CUSTOMER_STACK';
  const handler = await runHandler('create-checkout-session', { profile: { stripe_customer_id: null }, stripe: { customers: { create: async () => { throw error; } } } });
  const { res, logs } = await capture(handler);
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: 'Failed to create checkout session' });
  assert.deepEqual(logs, [['[create-checkout-session] provider operation failed']]);
  assert.equal(JSON.stringify(logs).includes('PRIVATE_'), false);
  assert.equal(JSON.stringify(res.body).includes('PRIVATE_'), false);
});

test('Checkout session creation exception is fully redacted', async () => {
  const error = new Error('PRIVATE_CHECKOUT_SESSION_MESSAGE'); error.stack = 'PRIVATE_CHECKOUT_SESSION_STACK';
  const stripe = { customers: {}, checkout: { sessions: { create: async () => { throw error; } } } };
  const handler = await runHandler('create-checkout-session', { profile: { stripe_customer_id: 'SYNTHETIC_CUSTOMER' }, stripe });
  const { res, logs } = await capture(handler);
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: 'Failed to create checkout session' });
  assert.deepEqual(logs, [['[create-checkout-session] provider operation failed']]);
  assert.equal(JSON.stringify(logs).includes('PRIVATE_'), false);
});

test('Portal session creation exception is fully redacted', async () => {
  const error = new Error('PRIVATE_PORTAL_MESSAGE'); error.stack = 'PRIVATE_PORTAL_STACK';
  const stripe = { billingPortal: { sessions: { create: async () => { throw error; } } } };
  const handler = await runHandler('create-portal-session', { profile: { stripe_customer_id: 'SYNTHETIC_CUSTOMER' }, stripe });
  const { res, logs } = await capture(handler);
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: 'Failed to create portal session' });
  assert.deepEqual(logs, [['[create-portal-session] provider operation failed']]);
  assert.equal(JSON.stringify(logs).includes('PRIVATE_'), false);
});

test('Checkout success contract remains unchanged', async () => {
  const calls = {};
  const stripe = {
    customers: { async create(input) { calls.customer = input; return { id: 'SYNTHETIC_CUSTOMER' }; } },
    checkout: { sessions: { async create(input) { calls.session = input; return { url: 'https://checkout.stripe.test/session' }; } } }
  };
  const handler = await runHandler('create-checkout-session', { profile: { stripe_customer_id: null }, stripe });
  const { res, logs } = await capture(handler);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { url: 'https://checkout.stripe.test/session' });
  assert.equal(calls.session.mode, 'subscription');
  assert.deepEqual(calls.session.line_items, [{ price: 'SYNTHETIC_PRICE', quantity: 1 }]);
  assert.equal(calls.session.success_url, 'https://synthetic.example.invalid/?checkout=success');
  assert.equal(calls.session.cancel_url, 'https://synthetic.example.invalid/?checkout=cancel');
  assert.deepEqual(logs, []);
});

test('Portal success contract remains unchanged', async () => {
  const calls = {};
  const stripe = { billingPortal: { sessions: { async create(input) { calls.session = input; return { url: 'https://billing.stripe.test/session' }; } } } };
  const handler = await runHandler('create-portal-session', { profile: { stripe_customer_id: 'SYNTHETIC_CUSTOMER' }, stripe });
  const { res, logs } = await capture(handler);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { url: 'https://billing.stripe.test/session' });
  assert.deepEqual(calls.session, { customer: 'SYNTHETIC_CUSTOMER', return_url: 'https://synthetic.example.invalid/' });
  assert.deepEqual(logs, []);
});
