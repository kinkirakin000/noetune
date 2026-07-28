const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const files = ['index.html', 'app-v17.html'];
const events = {
  v17_session_started: ['locale'],
  v17_session_completed: ['route'],
  v17_result_reached: ['cycleIndex', 'route'],
  v17_subtheme_restarted: ['route', 'cycleCount']
};
const forbidden = /(?:sessionid|cycleid|themeid|questionid|before|after|delta|score|measurement|userid|user_id|email|token|authorization|customerid|subscriptionid|freeinput|response|draft|sourcequote|snapshot)/i;

function extractCalls(source, eventName) {
  const needle = `trackEvent('${eventName}'`;
  const calls = [];
  let from = 0;
  while ((from = source.indexOf(needle, from)) !== -1) {
    let i = from + needle.length;
    while (/\s/.test(source[i] || '')) i += 1;
    assert.equal(source[i], ',', `${eventName} must provide a payload`);
    i += 1;
    while (/\s/.test(source[i] || '')) i += 1;
    assert.equal(source[i], '{', `${eventName} payload must be an object`);
    const start = i;
    let depth = 0;
    let closed = false;
    let quote = null;
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
        if (depth === 0) { calls.push(source.slice(start, i + 1)); closed = true; break; }
      }
    }
    assert.equal(closed, true, `${eventName} payload braces must balance`);
    from = i + 1;
  }
  return calls;
}

function payloadKeys(payload) {
  return [...payload.matchAll(/\b([A-Za-z_$][\w$]*)\s*:/g)].map((match) => match[1]);
}

for (const file of files) {
  test(`${file} v17 analytics payloads stay minimized`, () => {
    const source = fs.readFileSync(path.join(__dirname, '../../', file), 'utf8');
    for (const [eventName, allowed] of Object.entries(events)) {
      const calls = extractCalls(source, eventName);
      if (!calls.length) continue;
      for (const payload of calls) {
        const keys = payloadKeys(payload);
        assert.deepEqual(keys, allowed, `${file} ${eventName} payload keys`);
        assert.equal(keys.some((key) => forbidden.test(key)), false);
        assert.equal(/(?:hash|digest|btoa|base64|uuid|correlation|anonymous)/i.test(payload), false);
      }
    }
  });
}

test('v17 event inventory remains named and unchanged', () => {
  for (const file of files) {
    const source = fs.readFileSync(path.join(__dirname, '../../', file), 'utf8');
    assert.equal(source.includes("trackEvent('v17_session_started'"), true);
    assert.equal(source.includes("trackEvent('v17_subtheme_restarted'"), true);
    if (file === 'index.html') assert.equal(source.includes("trackEvent('v17_session_completed'"), true);
    if (file === 'app-v17.html') assert.equal(source.includes("trackEvent('v17_result_reached'"), true);
  }
});
