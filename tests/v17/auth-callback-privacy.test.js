const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const v17Source = fs.readFileSync(path.join(__dirname, '../../js/v17/auth.js'), 'utf8');
const v15Source = fs.readFileSync(path.join(__dirname, '../../js/v15/auth-core.js'), 'utf8');
const forbiddenEndpoints = new Set([
  '/api/save-result',
  '/api/save-progress',
  '/api/bookmarks',
  '/api/claim-guest-first-session'
]);

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

function storageWithPendingPayload() {
  const values = new Map([['pending', 'opaque-pending-payload']]);
  const removed = [];
  return {
    removed,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { if (values.has(key)) removed.push(key); values.delete(key); }
  };
}

function authTestContext() {
  const calls = { pending: 0, claim: 0, profile: 0, endpoints: [] };
  const sessionStorage = storageWithPendingPayload();
  let authListener = null;
  const session = { user: { id: 'test-user' }, access_token: 'test-token' };
  const auth = {
    onAuthStateChange(listener) { authListener = listener; },
    getSession() { return Promise.resolve({ data: { session } }); }
  };
  const context = {
    window: {},
    document: {
      head: { appendChild() {} },
      getElementById() { return null; },
      createElement() { return {}; }
    },
    sessionStorage,
    console: { warn() {}, error() {} },
    Promise,
    setTimeout,
    clearTimeout,
    fetch(url) {
      if (forbiddenEndpoints.has(url)) calls.endpoints.push(url);
      if (url === '/api/config') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ supabaseUrl: 'https://example.invalid', supabaseAnonKey: 'key' }) });
      }
      if (url === '/api/me') {
        calls.profile += 1;
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ loggedIn: true, profile: { plan_status: 'free' } }) });
      }
      throw new Error('unexpected request: ' + url);
    },
    savePendingResultIfNeeded() { calls.pending += 1; },
    savePendingProgressIfNeeded() { calls.pending += 1; },
    savePendingBookmarkIfNeeded() { calls.pending += 1; },
    claimGuestFirstSessionIfNeeded() { calls.claim += 1; },
    clearPendingResult() { throw new Error('pending result must not be cleared'); },
    clearPendingProgress() { throw new Error('pending progress must not be cleared'); }
  };
  context.window = Object.assign(context.window, {
    document: context.document,
    supabase: { createClient() { return { auth }; } }
  });
  return { context, calls, sessionStorage, emit(event) { authListener(event, session); } };
}

test('v17 auth initialization, restore, and SIGNED_IN keep pending payload inert', async () => {
  const fixture = authTestContext();
  vm.runInNewContext(v17Source, fixture.context, { filename: 'js/v17/auth.js' });

  await fixture.context.ensureV17SupabaseReady();
  await fixture.context.restoreV17Session();
  fixture.emit('SIGNED_IN');
  await flush();
  await flush();

  assert.equal(fixture.calls.pending, 0);
  assert.equal(fixture.calls.claim, 0);
  assert.deepEqual(fixture.calls.endpoints, []);
  assert.equal(fixture.calls.profile > 0, true);
  assert.deepEqual(fixture.sessionStorage.removed, []);
  assert.equal(fixture.context.v17AuthState.status, 'free');
});

test('v15 authenticated callback keeps pending payload inert while refreshing profile UI', async () => {
  const fixture = authTestContext();
  fixture.context.supabaseClient = {
    auth: { getSession() { return Promise.resolve({ data: { session: { access_token: 'test-token' } } }); } }
  };
  fixture.context.currentUser = null;
  fixture.context.currentProfile = null;
  fixture.context._checkoutSuccessPending = false;
  fixture.context.closeAuthModal = function() {};
  fixture.context.updateLoginButton = function() {};
  fixture.context.updatePortalButton = function() {};
  fixture.context.updatePricingCTA = function() {};
  fixture.context.enforceTrialLock = function() {};
  fixture.context.T = function() { return ''; };

  vm.runInNewContext(v15Source, fixture.context, { filename: 'js/v15/auth-core.js' });
  fixture.context.handleAuthenticatedSession('SIGNED_IN', { user: { id: 'test-user' } });
  await flush();
  await flush();

  assert.equal(fixture.calls.pending, 0);
  assert.equal(fixture.calls.claim, 0);
  assert.deepEqual(fixture.calls.endpoints, []);
  assert.equal(fixture.calls.profile, 1);
  assert.deepEqual(fixture.sessionStorage.removed, []);
  assert.equal(fixture.context.currentProfile.plan_status, 'free');
});

function privacyFixture({ getSession, oauth, meBody, meOk = true } = {}) {
  const logs = [];
  const msg = { textContent: '' };
  const button = { disabled: false, setAttribute() {}, removeAttribute() {}, style: {} };
  const modal = { classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} } };
  const auth = { onAuthStateChange() {}, getSession: getSession || (() => Promise.resolve({ data: { session: null } })), signInWithOAuth: oauth || (() => Promise.resolve({ error: null })) };
  const context = {
    window: {}, document: { head: { appendChild() {} }, getElementById(id) { return id === 'auth-modal-msg' ? msg : id === 'auth-google-btn' ? button : id === 'auth-modal' ? modal : null; }, createElement() { return {}; } },
    sessionStorage: storageWithPendingPayload(), console: { warn(...args) { logs.push(args); }, error(...args) { logs.push(args); } }, Promise, setTimeout, clearTimeout,
    fetch(url) { if (url === '/api/config') return Promise.resolve({ ok: true, json: () => Promise.resolve({ supabaseUrl: 'https://example.invalid', supabaseAnonKey: 'key' }) }); if (url === '/api/me') return Promise.resolve({ ok: meOk, status: meOk ? 200 : 500, json: () => Promise.resolve(meBody || {}) }); throw new Error('unexpected request'); }
  };
  context.window.supabase = { createClient() { return { auth }; } };
  return { context, logs, msg, button };
}

test('v17 init failures redact provider exception from every sink', async () => {
  const sentinel = 'PRIVATE_INIT_PROVIDER_DETAIL PRIVATE_INIT_STACK_DETAIL';
  const fixture = privacyFixture({ getSession() { const error = new Error(sentinel); error.stack = sentinel; return Promise.reject(error); } });
  vm.runInNewContext(v17Source, fixture.context, { filename: 'js/v17/auth.js' });
  assert.equal(await fixture.context.initV17Auth(), false);
  assert.equal(fixture.context.v17AuthState.error, 'auth_init_failed');
  assert.equal(fixture.msg.textContent, 'Authentication error');
  assert.equal(JSON.stringify(fixture.logs).includes(sentinel), false);
  assert.equal(JSON.stringify(fixture.context.v17AuthState).includes(sentinel), false);
});

test('v17 OAuth failures redact raw error and preserve retry', async () => {
  for (const oauth of [() => Promise.resolve({ error: { message: 'PRIVATE_OAUTH_RESULT_DETAIL' } }), () => { const error = new Error('PRIVATE_OAUTH_THROWN_DETAIL'); error.stack = 'PRIVATE_OAUTH_STACK_DETAIL'; return Promise.reject(error); }]) {
    const fixture = privacyFixture({ oauth });
    vm.runInNewContext(v17Source, fixture.context, { filename: 'js/v17/auth.js' });
    assert.equal(await fixture.context.loginV17WithGoogle(), false);
    assert.equal(fixture.context.v17AuthState.error, 'auth_login_failed');
    assert.equal(fixture.msg.textContent, 'Authentication error');
    assert.equal(fixture.button.disabled, false);
    assert.equal(JSON.stringify(fixture.logs).includes('PRIVATE_'), false);
  }
});

test('v17 /api/me failure body remains absent from auth sinks', async () => {
  const fixture = privacyFixture({ meOk: false, meBody: { detail: 'PRIVATE_PROFILE_RESPONSE_BODY' }, getSession() { return Promise.resolve({ data: { session: { user: { id: 'u' }, access_token: 't' } } }); } });
  vm.runInNewContext(v17Source, fixture.context, { filename: 'js/v17/auth.js' });
  await fixture.context.ensureV17SupabaseReady();
  await fixture.context.restoreV17Session();
  assert.equal(JSON.stringify(fixture.logs).includes('PRIVATE_'), false);
  assert.equal(JSON.stringify(fixture.context.v17AuthState).includes('PRIVATE_'), false);
});
