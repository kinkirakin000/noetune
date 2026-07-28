const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'app-v17.html'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'js/v17/auth.js'), 'utf8');
const required = ['entry','title','warning','providerRetention','confirmPrompt','confirmLabel','cancel','submit','processing','successTitle','successBody','returnHome','errorSession','errorUnconfirmed','errorConflict','errorBilling','errorGeneric'];

test('authenticated account deletion entry and accessible dialog exist', () => {
  assert.match(html, /id="account-delete"/);
  assert.match(html, /id="account-delete-dialog"[^>]*role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /for="account-delete-confirm"/);
  assert.match(auth, /deletion\.hidden = state === 'guest'/);
  assert.match(auth, /openV17AccountDeletion/);
});

test('exact DELETE confirmation and single request contract are source-enforced', () => {
  assert.match(auth, /input\.value !== 'DELETE'/);
  assert.match(auth, /v17AccountDeletionBusy/);
  assert.match(auth, /fetch\('\/api\/account'/);
  assert.match(auth, /method: 'DELETE'/);
  assert.match(auth, /JSON\.stringify\(\{ confirmation: 'DELETE' \}\)/);
  assert.doesNotMatch(auth, /JSON\.stringify\([^)]*(?:userId|email|stripeCustomer|subscriptionId|sessionText)/i);
});

test('success cleanup is gated by deleted true and preserves preferences', () => {
  assert.match(auth, /!response\.ok \|\| !data \|\| data\.deleted !== true/);
  for (const key of ['noetuneV17AuthReturn','noetunePendingBookmark','noetunePendingResult','noetunePendingProgress','noetune:v17:active-session:v1','noetune_v16_free_verb']) assert.match(auth, new RegExp(key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')));
  assert.doesNotMatch(auth, /localStorage\.clear\(\)|sessionStorage\.clear\(\)/);
  assert.match(auth, /signOut\(\{ scope: 'local' \}\)/);
  assert.match(auth, /location\.replace\('index\.html'\)/);
});

test('all locales contain the deletion semantic contract', () => {
  for (const locale of ['en','ja','zh-TW']) {
    const data = JSON.parse(fs.readFileSync(path.join(root, `locales/${locale}.json`), 'utf8'));
    for (const key of required) assert.equal(typeof data.account.delete[key], 'string', `${locale}:${key}`);
    assert.match(data.account.delete.warning + data.account.delete.providerRetention, /account|アカウント|帳戶/i);
    assert.doesNotMatch(JSON.stringify(data.account.delete), /all data|すべて.*消去|所有.*資料.*立即/i);
  }
});

test('failure paths retain authenticated state and do not log response details', () => {
  assert.match(auth, /if \(!response\.ok \|\| !data \|\| data\.deleted !== true\)/);
  assert.match(auth, /errorGeneric/);
  assert.doesNotMatch(auth, /console\.(log|warn|error).*response/);
});
