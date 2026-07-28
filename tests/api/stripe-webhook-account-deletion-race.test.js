const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../api/stripe-webhook.js'), 'utf8');

test('missing profiles acknowledge safely and never recreate profiles', () => {
  const missingCount = (source.match(/return \{ status: 200, body: \{ received: true \} \};/g) || []).length;
  assert.ok(missingCount >= 4);
  assert.doesNotMatch(source, /\.insert\(|\.upsert\(/);
  assert.doesNotMatch(source, /email.*lookup|lookup.*email/i);
});

test('update race distinguishes zero rows from database errors', () => {
  assert.match(source, /\.select\('id'\)/);
  assert.match(source, /data\.length === 0/);
  assert.match(source, /if \(error\)/);
});

test('webhook logs contain only fixed classifications', () => {
  assert.match(source, /\[stripe-webhook\] profile absent/);
  assert.match(source, /\[stripe-webhook\] event ignored/);
  assert.doesNotMatch(source, /type=' \+|id=' \+|status=' \+/);
  assert.doesNotMatch(source, /console\.error\([^)]*event\./);
});

test('unsupported events remain generic acknowledgements', () => {
  assert.match(source, /default:\s*return res\.status\(200\)\.json\(\{ received: true \}\)/);
  assert.match(source, /event\.type === 'customer\.subscription\.deleted'/);
});

test('no profile resurrection or alternate billing mutation was added', () => {
  assert.doesNotMatch(source, /auth\.admin\.createUser|createUser\(/);
  assert.doesNotMatch(source, /customers\.create|subscriptions\.cancel|refunds\./);
});
