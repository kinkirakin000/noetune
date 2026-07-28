const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const files = ['index.html', 'app-v17.html'];
const eventNames = ['v17_session_started', 'v17_session_completed', 'v17_result_reached', 'v17_subtheme_restarted'];
const forbiddenTransport = /(?:googletagmanager\.com\/gtag\/js|gtag\(\s*['"]config['"]|gtag\(\s*['"]event['"]\s*,\s*['"]page_view['"]|sendBeacon|page_location|page_path|page_referrer|window\.location\.(?:href|search|hash)|document\.(?:URL|referrer))/i;

function extractPayloads(source, eventName) {
  const needle = `trackEvent('${eventName}'`;
  const payloads = [];
  let from = 0;
  while ((from = source.indexOf(needle, from)) !== -1) {
    let i = from + needle.length;
    while (/\s/.test(source[i] || '')) i += 1;
    if (source[i] !== ',') { from = i + 1; continue; }
    i += 1;
    while (/\s/.test(source[i] || '')) i += 1;
    if (source[i] !== '{') { from = i + 1; continue; }
    const start = i;
    let depth = 0;
    let quote = null;
    let closed = false;
    for (; i < source.length; i += 1) {
      const ch = source[i];
      if (quote) {
        if (ch === '\\') i += 1;
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
      if (ch === '{') depth += 1;
      if (ch === '}') {
        depth -= 1;
        if (depth === 0) { payloads.push(source.slice(start, i + 1)); closed = true; break; }
      }
    }
    assert.equal(closed, true, `${eventName} payload braces must balance`);
    from = i + 1;
  }
  return payloads;
}

for (const file of files) {
  test(`${file} has no GA initialization or alternate pageview transport`, () => {
    const source = fs.readFileSync(path.join(__dirname, '../../', file), 'utf8');
    assert.doesNotMatch(source, forbiddenTransport);
    for (const sentinel of ['PRIVATE_OAUTH_CODE', 'PRIVATE_OAUTH_STATE', 'PRIVATE_OAUTH_ERROR', 'PRIVATE_CHECKOUT_RETURN', 'PRIVATE_PORTAL_RETURN', 'PRIVATE_GENERIC_QUERY', 'PRIVATE_REFERRER_SENTINEL']) {
      assert.equal(source.includes(sentinel), false);
    }
    for (const eventName of eventNames) {
      const payloads = extractPayloads(source, eventName);
      for (const payload of payloads) assert.doesNotMatch(payload, /(?:sessionId|cycleId|themeId|questionId|before|after|delta|score|measurement|email|token|snapshot|draft|response|sourceQuote)/i);
    }
  });
}
