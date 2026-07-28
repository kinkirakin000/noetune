const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function response() {
  return {
    headers: {}, statusCode: 200, body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }
  };
}

function request(body, signature) {
  const listeners = {};
  return {
    method: 'POST',
    headers: { 'stripe-signature': signature },
    on(name, listener) { listeners[name] = listener; if (name === 'data') listener(Buffer.from(body)); if (name === 'end') listener(); }
  };
}

test('signature verification failure is a fixed, non-cacheable response', async () => {
  const originalLoad = Module._load;
  const originalEnv = { STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET, SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY };
  const calls = { construct: null, processing: 0 };
  const providerMessage = 'SENTINEL_STRIPE_PROVIDER_DETAIL';
  const rawBody = 'SENTINEL_RAW_REQUEST_BODY';
  const signature = 'SENTINEL_SIGNATURE';
  const secret = 'SENTINEL_WEBHOOK_SECRET';
  process.env.STRIPE_SECRET_KEY = 'SENTINEL_STRIPE_KEY';
  process.env.STRIPE_WEBHOOK_SECRET = secret;
  process.env.SUPABASE_URL = 'https://supabase.invalid';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'SENTINEL_SERVICE_ROLE';
  Module._load = function(requestName, parent, isMain) {
    if (requestName === '../lib/supabase-admin') return { getSupabaseAdmin() { return {}; } };
    if (requestName === 'stripe') return function() { return { webhooks: { constructEvent(body, sig, configuredSecret) { calls.construct = { body, sig, configuredSecret }; throw new Error(providerMessage); } } }; };
    return originalLoad.call(this, requestName, parent, isMain);
  };
  delete require.cache[require.resolve('../../api/stripe-webhook')];
  const handler = require('../../api/stripe-webhook');
  const originalError = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);
  try {
    const res = response();
    await handler(request(rawBody, signature), res);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: 'WEBHOOK_SIGNATURE_INVALID' });
    assert.equal(res.headers['Cache-Control'], 'no-store');
    const responseText = JSON.stringify(res.body);
    for (const sentinel of [providerMessage, rawBody, signature, secret, 'SENTINEL_STRIPE_KEY', 'SENTINEL_SERVICE_ROLE', 'customer', 'subscription', 'email', 'user']) {
      assert.equal(responseText.includes(sentinel), false);
    }
    assert.deepEqual(calls.construct, { body: Buffer.from(rawBody), sig: signature, configuredSecret: secret });
    assert.deepEqual(logs, [['[stripe-webhook] signature verification failed']]);
    assert.equal(logs.flat().some(value => String(value).includes(providerMessage)), false);
    assert.equal(calls.processing, 0);
  } finally {
    console.error = originalError;
    Module._load = originalLoad;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    delete require.cache[require.resolve('../../api/stripe-webhook')];
  }
});
