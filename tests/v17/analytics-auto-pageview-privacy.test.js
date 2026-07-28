const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const files = ['index.html', 'app-v17.html'];
const payloadAllowlist = {
  v17_session_started: ['locale'],
  v17_session_completed: ['route'],
  v17_result_reached: ['cycleIndex', 'route'],
  v17_subtheme_restarted: ['route', 'cycleCount']
};

function configBlocks(source) {
  const blocks = [];
  const re = /gtag\(\s*['"]config['"]\s*,([\s\S]*?)\);/g;
  let match;
  while ((match = re.exec(source))) blocks.push(match[0]);
  return blocks;
}

function extractPayload(source, eventName) {
  const needle = `trackEvent('${eventName}'`;
  const result = [];
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
        if (depth === 0) { result.push(source.slice(start, i + 1)); closed = true; break; }
      }
    }
    assert.equal(closed, true, `${eventName} payload braces must balance`);
    from = i + 1;
  }
  return result;
}

function keys(payload) {
  return [...payload.matchAll(/\b([A-Za-z_$][\w$]*)\s*:/g)].map((match) => match[1]);
}

for (const file of files) {
  test(`${file} disables GA4 automatic pageview without URL analytics`, () => {
    const source = fs.readFileSync(path.join(__dirname, '../../', file), 'utf8');
    const blocks = configBlocks(source);
    assert.equal(blocks.length >= 1, true);
    for (const block of blocks) {
      assert.match(block, /send_page_view\s*:\s*false/);
      assert.doesNotMatch(block, /send_page_view\s*:\s*true/);
      assert.doesNotMatch(block, /(?:location|search|href|hash|referrer|document\.URL)/i);
    }
    assert.doesNotMatch(source, /gtag\(\s*['"]event['"]\s*,\s*['"]page_view['"]/i);
    assert.doesNotMatch(source, /(?:page_location|page_path|page_referrer|window\.location\.(?:href|search|hash)|document\.(?:URL|referrer))/i);
    assert.match(source, /googletagmanager\.com\/gtag\/js\?id=G-TH1504X2CK/);
    assert.match(source, /gtag\(\s*['"]config['"]\s*,\s*['"]G-TH1504X2CK['"]/);
    for (const [eventName, allowed] of Object.entries(payloadAllowlist)) {
      for (const payload of extractPayload(source, eventName)) assert.deepEqual(keys(payload), allowed);
    }
    for (const sentinel of ['PRIVATE_OAUTH_CODE', 'PRIVATE_OAUTH_STATE', 'PRIVATE_CHECKOUT_RETURN', 'PRIVATE_PORTAL_RETURN']) {
      assert.equal(source.includes(sentinel), false);
    }
  });
}
