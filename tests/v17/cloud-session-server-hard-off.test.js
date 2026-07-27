const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '@supabase/supabase-js') return { createClient() { return {}; } };
  return originalLoad.call(this, request, parent, isMain);
};

const routes = {
  bookmarks: require('../../api/bookmarks'),
  progress: require('../../api/save-progress'),
  result: require('../../api/save-result')
};
Module._load = originalLoad;

function response() {
  return {
    headers: {}, statusCode: 200, body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }
  };
}

function request(method, options = {}) {
  const req = { method, headers: options.headers || {}, query: options.query || {} };
  Object.defineProperty(req, 'body', {
    get() { options.bodyReads = (options.bodyReads || 0) + 1; return options.body; }
  });
  return req;
}

async function assertDisabled(route, method, options = {}) {
  const res = response();
  await route(request(method, options), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, 'CLOUD_SESSION_FEATURE_DISABLED');
  assert.equal(res.body.error, 'CLOUD_SESSION_FEATURE_DISABLED');
  assert.deepEqual(Object.keys(res.body).sort(), ['code', 'error', 'ok']);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(options.bodyReads || 0, 0);
}

test('server hard-off owner is a fixed false value', () => {
  const hardOff = require('../../lib/v17-cloud-session-hard-off');
  assert.equal(hardOff.V17_CLOUD_SESSION_SERVER_ENABLED, false);
  assert.equal(hardOff.isV17CloudSessionServerEnabled(), false);
});

test('Bookmark GET is disabled before auth or DB access', async () => {
  await assertDisabled(routes.bookmarks, 'GET', { headers: { authorization: 'Bearer valid' } });
});

test('Bookmark POST is disabled before body parsing', async () => {
  const options = { body: JSON.stringify({ stableThemeKey: 'theme:x' }) };
  await assertDisabled(routes.bookmarks, 'POST', options);
});

test('Bookmark hard-off ignores query and feature headers', async () => {
  await assertDisabled(routes.bookmarks, 'GET', {
    query: { enabled: 'true', feature: 'on' },
    headers: { authorization: 'Bearer pro', 'x-feature-flag': 'true', 'x-entitlement': 'plus' }
  });
});

test('Progress GET is disabled before auth or payload handling', async () => {
  await assertDisabled(routes.progress, 'GET', { headers: { authorization: 'Bearer valid' } });
});

test('Progress POST rejects malformed and oversized bodies before parsing', async () => {
  await assertDisabled(routes.progress, 'POST', { body: '{malformed' });
  await assertDisabled(routes.progress, 'POST', { body: 'x'.repeat(100000) });
});

test('Result POST is disabled before result parsing or profile lookup', async () => {
  await assertDisabled(routes.result, 'POST', { body: JSON.stringify({ userAnswers: { private: true } }) });
});

test('Result hard-off is identical for unauthenticated and forged Pro requests', async () => {
  const a = response(); const b = response();
  await routes.result(request('POST', { body: 'not-json' }), a);
  await routes.result(request('POST', { headers: { authorization: 'Bearer forged-pro', 'x-plan': 'plus' }, body: '{}' }), b);
  assert.deepEqual(a.body, b.body);
  assert.equal(a.statusCode, b.statusCode);
});

test('Unknown methods retain existing 405 contract', async () => {
  const res = response();
  await routes.result(request('PATCH'), res);
  assert.equal(res.statusCode, 405);
});

test('Bookmark DELETE remains an owner-only cleanup path', () => {
  const source = fs.readFileSync('api/bookmarks.js', 'utf8');
  assert.match(source, /req\.method !== 'DELETE'/);
  assert.match(source, /\.eq\('user_id', user\.id\)/);
});

test('server hard-off response contains no private or provider data', async () => {
  const options = { body: JSON.stringify({ response: 'private', token: 'secret', email: 'private@example.test' }) };
  const res = response();
  await routes.bookmarks(request('POST', options), res);
  const serialized = JSON.stringify(res.body);
  assert.equal(serialized.includes('private'), false);
  assert.equal(serialized.includes('secret'), false);
  assert.equal(serialized.includes('email'), false);
});
