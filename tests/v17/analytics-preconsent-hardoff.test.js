const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const surfaces = ['index.html', 'app-v17.html'];
const eventNames = ['v17_session_started', 'v17_session_completed', 'v17_result_reached', 'v17_subtheme_restarted'];

for (const file of surfaces) {
  test(`${file} has no GA provider loading or transport`, () => {
    const source = fs.readFileSync(path.join(__dirname, '../../', file), 'utf8');
    assert.doesNotMatch(source, /googletagmanager\.com\/gtag\/js|gtag\(\s*['"]config['"]|dataLayer|G-TH1504X2CK/);
    assert.doesNotMatch(source, /gtag\(\s*['"]event['"][\s\S]*?page_view|sendBeacon|page_location|page_path|page_referrer/);
    for (const name of eventNames) {
      if (source.includes(`trackEvent('${name}'`)) assert.equal(source.includes(`trackEvent('${name}'`), true);
    }
  });
}

test('PostHog helper and trackEvent are side-effect-free hard-off no-ops', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../js/v15/analytics.js'), 'utf8');
  const calls = { fetch: 0, append: 0, gtag: 0, init: 0, capture: 0, writes: 0, logs: 0 };
  const context = {
    window: { posthog: { init() { calls.init += 1; }, capture() { calls.capture += 1; } } },
    document: { createElement() { calls.append += 1; return {}; }, head: { appendChild() { calls.append += 1; } } },
    fetch() { calls.fetch += 1; },
    gtag() { calls.gtag += 1; },
    console: { log() { calls.logs += 1; }, warn() { calls.logs += 1; }, error() { calls.logs += 1; } },
    localStorage: { setItem() { calls.writes += 1; } },
    sessionStorage: { setItem() { calls.writes += 1; } },
    _posthog: null
  };
  vm.runInNewContext(source, context, { filename: 'js/v15/analytics.js' });
  assert.equal(context.window.trackEvent('PRIVATE_TEST_EVENT', { rawCycleId: 'PRIVATE_CYCLE_ID', privateText: 'PRIVATE_SESSION_TEXT' }), false);
  assert.equal(context.window.initPostHog({ posthogKey: 'PRIVATE_KEY', posthogHost: 'https://provider.invalid' }), false);
  assert.deepEqual(calls, { fetch: 0, append: 0, gtag: 0, init: 0, capture: 0, writes: 0, logs: 0 });
});

test('hard-off has no consent or external re-enable mechanism', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../js/v15/analytics.js'), 'utf8');
  assert.doesNotMatch(source, /consent|enableAnalytics|analyticsEnabled|localStorage|sessionStorage|location\.(search|hash)/i);
  assert.match(source, /function trackEvent\(\)\s*\{\s*return false;/);
});
