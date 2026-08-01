const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const configPath = require.resolve('../../api/config');
const adminPath = require.resolve('../../lib/supabase-admin');
const checkoutPath = require.resolve('../../api/create-checkout-session');
const ui = fs.readFileSync(path.join(root, 'js/v17/billing-ui.js'), 'utf8');
const core = fs.readFileSync(path.join(root, 'js/v17/billing-core.js'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'js/v17/auth.js'), 'utf8');

function res() { return { statusCode: 0, body: null, setHeader() {}, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; } }; }

test('config exposes strict boolean checkout gate', async () => {
  const old = process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED;
  const values = [undefined, '', 'false', 'TRUE', '1', ' true ', 'true'];
  try {
    for (const value of values) {
      if (value === undefined) delete process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED;
      else process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED = value;
      delete require.cache[configPath];
      const handler = require(configPath);
      const out = res(); await handler({ method: 'GET' }, out);
      assert.equal(out.body.stripeCheckoutEnabled, value === 'true', value);
      assert.equal(typeof out.body.stripeCheckoutEnabled, 'boolean');
      assert.ok('supabaseUrl' in out.body && 'supabaseAnonKey' in out.body);
    }
  } finally {
    if (old === undefined) delete process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED;
    else process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED = old;
  }
});

test('billing sources fail closed and preserve portal path', () => {
  assert.match(auth, /v17StripeCheckoutEnabled\s*=\s*false/);
  assert.match(auth, /cfg\.stripeCheckoutEnabled\s*===\s*true/);
  assert.match(auth, /window\.isV17StripeCheckoutEnabled\s*=\s*isV17StripeCheckoutEnabled/);
  assert.match(ui, /primaryAction\s*=\s*'none'[\s\S]*showCheckout\s*=\s*false/);
  assert.match(ui, /primaryAction === 'checkout'/);
  assert.match(ui, /primaryAction === 'portal'/);
  assert.match(core, /startV17Checkout\(options\)[\s\S]*checkout_unavailable/);
  assert.match(core, /getV17BillingAccessToken/);
});

test('disabled server gate returns before auth, Stripe, or database work', async () => {
  const old = process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED;
  const oldSecret = process.env.STRIPE_SECRET_KEY;
  const oldPrice = process.env.STRIPE_PRICE_PLUS_MONTHLY;
  let authCalls = 0;
  try {
    delete process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED;
    process.env.STRIPE_SECRET_KEY = 'SYNTHETIC_SECRET';
    process.env.STRIPE_PRICE_PLUS_MONTHLY = 'SYNTHETIC_PRICE';
    delete require.cache[checkoutPath];
    require.cache[adminPath] = { id: adminPath, filename: adminPath, loaded: true, exports: { getSupabaseAdmin: () => ({ auth: { getUser: async () => { authCalls += 1; } } }) } };
    const handler = require(checkoutPath);
    const out = res(); await handler({ method: 'POST', headers: {} }, out);
    assert.equal(out.statusCode, 503);
    assert.deepEqual(out.body, { error: 'checkout_unavailable' });
    assert.equal(authCalls, 0);
  } finally {
    if (old === undefined) delete process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED; else process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED = old;
    if (oldSecret === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = oldSecret;
    if (oldPrice === undefined) delete process.env.STRIPE_PRICE_PLUS_MONTHLY; else process.env.STRIPE_PRICE_PLUS_MONTHLY = oldPrice;
    delete require.cache[checkoutPath];
  }
});
