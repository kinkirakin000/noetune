const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

function storageStub() {
  const calls = { get: 0, set: 0, remove: 0 };
  return {
    calls,
    getItem() { calls.get += 1; return null; },
    setItem() { calls.set += 1; },
    removeItem() { calls.remove += 1; }
  };
}

const source = fs.readFileSync(path.join(__dirname, '../../js/v17/session-snapshot.js'), 'utf8');
const appSource = fs.readFileSync(path.join(__dirname, '../../app-v17.html'), 'utf8');

function extractAppFunction(name) {
  const start = appSource.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, 'missing app function: ' + name);
  const bodyStart = appSource.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < appSource.length; index += 1) {
    if (appSource[index] === '{') depth += 1;
    if (appSource[index] === '}') {
      depth -= 1;
      if (depth === 0) return appSource.slice(start, index + 1);
    }
  }
  throw new Error('unterminated app function: ' + name);
}
const localStorage = storageStub();
const sessionStorage = storageStub();
const sideEffects = { dom: 0, network: 0, uuid: 0, analytics: 0 };
const context = {
  window: {}, TextEncoder, localStorage, sessionStorage,
  document: { getElementById() { sideEffects.dom += 1; } },
  fetch() { sideEffects.network += 1; },
  XMLHttpRequest: function XMLHttpRequest() { sideEffects.network += 1; },
  crypto: { randomUUID() { sideEffects.uuid += 1; return '33333333-3333-4333-8333-333333333333'; } },
  analytics: { track() { sideEffects.analytics += 1; } },
  gtag() { sideEffects.analytics += 1; }
};
context.window.document = context.document;
context.window.fetch = context.fetch;
context.window.XMLHttpRequest = context.XMLHttpRequest;
context.window.crypto = context.crypto;
context.window.analytics = context.analytics;
context.window.gtag = context.gtag;
vm.runInNewContext(source, context, { filename: 'js/v17/session-snapshot.js' });
const validate = context.window.NoetuneV17SessionSnapshot.validateV17SessionSnapshot;

function fixture() {
  return {
    snapshotSchemaVersion: 1,
    appVersion: 'v17',
    sessionId: '11111111-1111-4111-8111-111111111111',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    savedAt: '2026-01-01T00:01:00.000Z',
    updatedAt: '2026-01-01T00:02:00.000Z',
    completedAt: null,
    discardedAt: null,
    revision: 0,
    currentScreen: 's-v17-first-response',
    summary: {
      locale: 'en', sessionMode: 'regular', routeType: 'problem', entryType: 'life_theme',
      themeId: 'theme-1', themeLabel: 'Theme', subthemeLabel: null, themeDescription: null,
      categoryId: null, categoryLabel: null, track: 'problems', freeInputTheme: null,
      questionId: null, questionTextAtTime: 'Question'
    },
    currentCycle: {
      cycleId: '22222222-2222-4222-8222-222222222222', cycleIndex: 0,
      startedAt: '2026-01-01T00:00:00.000Z', resultReachedAt: null, resultEventSent: false
    },
    currentState: {
      currentScreen: 's-v17-first-response', currentStep: 'first-response', routeType: 'problem',
      entryType: 'life_theme', locale: 'en',
      entry: {
        entryType: 'life_theme', themeId: 'theme-1', questionId: null, themeLabel: 'Theme',
        themeDescription: null, categoryId: null, categoryLabel: null, trackId: 'problems',
        themeMeaning: null, freeInputTheme: null, questionTextAtTime: 'Question', localeAtSelection: 'en'
      },
      measurement: {
        before: { state: 'unset', value: null, touched: false },
        after: { state: 'unset', value: null, touched: false }
      },
      responses: {
        current: { state: 'unset', text: '', draft: '' },
        ideal: { state: 'unset', text: '', draft: '' }
      },
      semanticState: { current: null, ideal: null },
      regularFlow: { activeScreen: 'first', questionVariant: 'A', firstResponseRole: 'ideal', secondResponseRole: 'current' },
      scoreTrail: [], awarenessTrail: [], deepFlow: null
    },
    repeatState: null,
    resumeBackFrames: []
  };
}

function result(value) { return validate(value); }
function accepted(value) { assert.equal(result(value).ok, true); }
function rejected(value) { assert.equal(result(value).ok, false); }

test('accepts the canonical valid snapshot', () => accepted(fixture()));

test('serializes Guest Regular Before without Regular Flow metadata', () => {
  context.window.D = {
    v17SessionMode: 'regular',
    v17SessionIdentity: context.window.NoetuneV17SessionSnapshot.createV17SessionIdentity('2026-01-01T00:00:00.000Z'),
    v17Flow: {
      currentScreen: 's-v17-before',
      currentStep: 'before',
      responseStates: { current: 'unset', ideal: 'unset' },
      questionVariant: 'A'
    },
    themeSource: 'themeLibrary',
    themeTrackId: 'problems',
    localeAtTime: 'en',
    questionTextAtTime: 'Question',
    theme: 'Theme',
    themeId: 'theme-1',
    questionId: null,
    initialThemeScore: null,
    finalThemeScore: null,
    currentThemeScoreTrail: [],
    currentThemeAwarenessTrail: []
  };
  context.window.lang = 'en';
  context.window.localStorage = localStorage;
  const api = context.window.NoetuneV17SessionSnapshot;
  const serialized = api.serializeV17SessionSnapshot({
    savedAt: '2026-01-01T00:01:00.000Z',
    now: '2026-01-01T00:02:00.000Z'
  });
  assert.equal(serialized.ok, true);
  assert.equal(serialized.snapshot.currentScreen, 's-v17-before');
  assert.equal(serialized.snapshot.currentState.regularFlow, null);
  assert.equal(api.validateV17SessionSnapshot(serialized.snapshot).ok, true);
  const record = api.createV17LocalSessionRecord(serialized.snapshot);
  assert.equal(record.ok, true);
  assert.equal(api.writeV17LocalSessionRecord(record.record).ok, true);
  assert.equal(localStorage.calls.set > 0, true);
});

function unselectedSessionModeFixture() {
  const value = fixture();
  value.currentScreen = 's-v17-session-mode';
  value.summary.sessionMode = null;
  value.currentState.currentScreen = 's-v17-session-mode';
  value.currentState.currentStep = 'session-mode';
  value.currentState.sessionMode = null;
  value.currentState.regularFlow = null;
  value.currentState.deepFlow = null;
  value.resumeBackFrames = [];
  return value;
}

test('serializes and validates the canonical unselected Session Mode snapshot', () => {
  context.window.D = {
    v17SessionMode: null,
    v17SessionIdentity: context.window.NoetuneV17SessionSnapshot.createV17SessionIdentity('2026-01-01T00:00:00.000Z'),
    v17Flow: null,
    themeSource: 'themeLibrary',
    themeTrackId: 'problems',
    localeAtTime: 'en',
    questionTextAtTime: 'Question',
    theme: 'Theme',
    themeId: 'theme-1',
    questionId: null,
    initialThemeScore: null,
    finalThemeScore: null,
    currentThemeScoreTrail: [],
    currentThemeAwarenessTrail: []
  };
  context.window.cur = 's-v17-session-mode';
  context.window.lang = 'en';
  const api = context.window.NoetuneV17SessionSnapshot;
  const serialized = api.serializeV17SessionSnapshot({
    savedAt: '2026-01-01T00:01:00.000Z',
    now: '2026-01-01T00:02:00.000Z'
  });
  assert.equal(serialized.ok, true);
  assert.equal(serialized.snapshot.currentScreen, 's-v17-session-mode');
  assert.equal(serialized.snapshot.summary.sessionMode, null);
  assert.equal(serialized.snapshot.currentState.sessionMode, null);
  assert.equal(serialized.snapshot.currentState.currentStep, 'session-mode');
  assert.equal(serialized.snapshot.currentState.regularFlow, null);
  assert.equal(serialized.snapshot.currentState.deepFlow, null);
  assert.equal(serialized.snapshot.resumeBackFrames.length, 0);
  assert.equal(api.validateV17SessionSnapshot(serialized.snapshot).ok, true);
});

test('fails closed for invalid Session Mode contracts and null mode outside Session Mode', () => {
  for (const sessionMode of ['regular', 'deep']) {
    const invalid = unselectedSessionModeFixture();
    invalid.summary.sessionMode = sessionMode;
    rejected(invalid);
  }
  const mismatch = unselectedSessionModeFixture();
  mismatch.currentState.sessionMode = 'regular';
  rejected(mismatch);
  const regularFlow = unselectedSessionModeFixture();
  regularFlow.currentState.regularFlow = fixture().currentState.regularFlow;
  rejected(regularFlow);
  const deepFlow = unselectedSessionModeFixture();
  deepFlow.currentState.deepFlow = {};
  rejected(deepFlow);
  const before = fixture();
  before.currentScreen = 's-v17-before';
  before.currentState.currentScreen = 's-v17-before';
  before.currentState.currentStep = 'before';
  before.currentState.regularFlow = null;
  before.summary.sessionMode = null;
  before.currentState.sessionMode = null;
  rejected(before);
});

test('restores unselected Session Mode without creating or selecting a flow', () => {
  const api = context.window.NoetuneV17SessionSnapshot;
  context.window.D = { v17SessionMode: 'regular', v17Flow: { currentScreen: 's-v17-before' } };
  const restored = api.restoreV17SessionRuntime(unselectedSessionModeFixture());
  assert.equal(restored.ok, true);
  assert.equal(restored.sessionMode, null);
  assert.equal(context.window.D.v17SessionMode, null);
  assert.equal(context.window.D.v17Flow, null);
  assert.equal(context.window.D.v17SessionIdentity.sessionId, '11111111-1111-4111-8111-111111111111');
});

test('resume Back runtime frames reset stale history and preserve an unselected Session Mode frame', () => {
  assert.match(appSource, /function resetV17ResumeNavigationHistory\(\)[\s\S]*?navHistory\.length = 0;[\s\S]*?navPageStateHistory\.length = 0;/);
  assert.match(appSource, /frame\.D\.v17SessionMode = null;[\s\S]*?frame\.D\.v17Flow = null;/);
  assert.match(appSource, /var sessionModeFrameForQ1 = buildV17ResumeSessionModeNavigationFrame\(\);[\s\S]*?appendV17ResumeNavigationFrame\(sessionModeFrameForQ1\);[\s\S]*?appendV17ResumeNavigationFrame\(beforeFrame\);/);
  assert.match(appSource, /var sessionModeFrameForQ2 = buildV17ResumeSessionModeNavigationFrame\(\);[\s\S]*?appendV17ResumeNavigationFrame\(sessionModeFrameForQ2\);[\s\S]*?appendV17ResumeNavigationFrame\(beforeFrameForQ2\);[\s\S]*?appendV17ResumeNavigationFrame\(questionOneFrameForQ2\);/);
});

test('retires Guest local bookmark public paths before Cloud bookmarks are available', () => {
  assert.match(appSource, /function isV17GuestLocalBookmarkRetired\(\)[\s\S]*?return true;/);
  assert.match(appSource, /function updateV17SessionBookmarkVisibility\(\)[\s\S]*?if \(isV17GuestLocalBookmarkRetired\(\)\)[\s\S]*?button\.hidden = true;/);
  assert.match(appSource, /function writeCurrentV17SessionSnapshot\(\)\s*\{\s*if \(isV17GuestLocalBookmarkRetired\(\)\)[\s\S]*?written: false/);
  assert.match(appSource, /function updateV17SavedSessionSnapshot\(reason\)\s*\{\s*if \(isV17GuestLocalBookmarkRetired\(\)\)[\s\S]*?updated: false/);
  assert.match(appSource, /function handleV17SessionBookmarkClick\(\)\s*\{\s*if \(isV17GuestLocalBookmarkRetired\(\)\)[\s\S]*?written: false/);
  assert.match(appSource, /function handleV17ResumeProgressClick\(\)\s*\{\s*if \(isV17GuestLocalBookmarkRetired\(\)\)[\s\S]*?resumed: false/);
  assert.match(appSource, /function updateV17ResumeControlVisibility\(\)[\s\S]*?retireV17GuestLocalSessionRecord\(snapshotApi\);[\s\S]*?if \(isV17GuestLocalBookmarkRetired\(\)\) return;[\s\S]*?readV17LocalSessionRecord/);
});

test('retires the Result Bookmark CTA and keeps its write handler unreachable', () => {
  assert.match(appSource, /id="btn-save-result" onclick="handleV17ResultBookmarkClick\(\)"/);
  assert.match(appSource, /function updateV17ResultBookmarkAvailability\(\)[\s\S]*?if \(!isV17GuestLocalBookmarkRetired\(\)\)[\s\S]*?button\.hidden = true;[\s\S]*?button\.disabled = true;[\s\S]*?status\.hidden = true;/);
  assert.match(appSource, /function renderResultSaveUI\(\)[\s\S]*?if \(updateV17ResultBookmarkAvailability\(\)\) return;/);
  assert.match(appSource, /window\.renderV17BookmarkUI = function\(force\) \{[\s\S]*?if \(isV17GuestLocalBookmarkRetired\(\)\)[\s\S]*?return false;/);
  assert.match(appSource, /function showV17Result\(\)[\s\S]*?if \(!isV17GuestLocalBookmarkRetired\(\) && typeof renderV17BookmarkUI === 'function'\) renderV17BookmarkUI\(true\);/);
  assert.match(appSource, /id="btn-save-image"/);
  assert.match(appSource, /id="btn-v17-restart-subtheme"/);
  assert.match(appSource, /id="btn-v17-restart-theme"/);
  assert.match(appSource, /id="btn-v17-choose-another-theme"/);

  let oldBookmarkCalls = 0;
  const handlerContext = {
    window: {
      toggleCurrentThemeBookmark() { oldBookmarkCalls += 1; }
    },
    isV17GuestLocalBookmarkRetired() { return true; }
  };
  vm.runInNewContext(extractAppFunction('handleV17ResultBookmarkClick'), handlerContext, {
    filename: 'app-v17-result-bookmark-retirement.js'
  });
  assert.equal(handlerContext.handleV17ResultBookmarkClick(), false);
  assert.equal(oldBookmarkCalls, 0);
});

test('retirement cleanup deletes only malformed or Guest local records and is idempotent', () => {
  let raw = null;
  let removals = 0;
  const cleanupContext = {
    window: {
      localStorage: {
        getItem() { return raw; }
      }
    },
    JSON,
    Array,
    Object
  };
  const snapshotApi = {
    removeV17LocalSessionRecord() {
      removals += 1;
      raw = null;
      return { ok: true, removed: true };
    }
  };
  vm.runInNewContext(
    "var V17_LOCAL_SESSION_STORAGE_KEY = 'noetune:v17:active-session:v1';\n" + extractAppFunction('retireV17GuestLocalSessionRecord'),
    cleanupContext,
    { filename: 'app-v17-retirement-cleanup.js' }
  );
  const cleanup = cleanupContext.retireV17GuestLocalSessionRecord;
  for (const value of [
    '{',
    '[]',
    JSON.stringify({}),
    JSON.stringify({ sync: {} }),
    JSON.stringify({ sync: { ownerUserId: null } }),
    JSON.stringify({ sync: { ownerUserId: '' } }),
    JSON.stringify({ sync: { ownerUserId: '   ' } })
  ]) {
    raw = value;
    const result = cleanup(snapshotApi);
    assert.equal(result.ok, true);
    assert.equal(raw, null);
  }
  const removalsAfterInvalidRecords = removals;
  raw = JSON.stringify({ sync: { ownerUserId: 'cloud-owner' }, snapshot: null });
  const preserved = cleanup(snapshotApi);
  assert.equal(preserved.ok, true);
  assert.equal(preserved.reason, 'OWNER_RECORD_PRESERVED');
  assert.notEqual(raw, null);
  raw = JSON.stringify({ sync: { ownerUserId: null } });
  cleanup(snapshotApi);
  cleanup(snapshotApi);
  assert.equal(removals, removalsAfterInvalidRecords + 1);
});

test('characterizes CurrentCycleV1 public-root validation boundaries', () => {
  accepted(fixture());

  for (const value of [undefined, null, '', 'not-a-uuid', '22222222-2222-4222-8222-22222222222z', 1, [], {}]) {
    const invalid = fixture();
    invalid.currentCycle.cycleId = value;
    rejected(invalid);
  }

  for (const value of [undefined, '0', 0.5, -1, NaN, Infinity, -Infinity, null, true, []]) {
    const invalid = fixture();
    if (value === undefined) delete invalid.currentCycle.cycleIndex;
    else invalid.currentCycle.cycleIndex = value;
    rejected(invalid);
  }
  const numericString = fixture();
  numericString.currentCycle.cycleIndex = '1';
  rejected(numericString);

  for (const value of [undefined, null, '', 'not-a-timestamp', 1, true, [], {}]) {
    const invalid = fixture();
    if (value === undefined) delete invalid.currentCycle.startedAt;
    else invalid.currentCycle.startedAt = value;
    rejected(invalid);
  }

  for (const value of ['2026-01-01T00:03:00.000Z', null]) {
    const valid = fixture();
    valid.currentCycle.resultReachedAt = value;
    accepted(valid);
  }
  for (const value of ['', 1, true, [], {}]) {
    const invalid = fixture();
    invalid.currentCycle.resultReachedAt = value;
    rejected(invalid);
  }

  for (const value of [true, false]) {
    const valid = fixture();
    valid.currentCycle.resultEventSent = value;
    accepted(valid);
  }
  const missingEventState = fixture();
  delete missingEventState.currentCycle.resultEventSent;
  rejected(missingEventState);
  for (const value of ['true', 'false', 0, 1, null, [], {}]) {
    const invalid = fixture();
    invalid.currentCycle.resultEventSent = value;
    rejected(invalid);
  }

  for (const value of [Object.assign({}, fixture().currentCycle, { extra: true }), [], null, 'cycle', 1, true]) {
    const invalid = fixture();
    invalid.currentCycle = value;
    rejected(invalid);
  }
});

test('CurrentCycleV1 validation does not mutate fixtures or cause external side effects', () => {
  const value = fixture();
  const before = JSON.stringify(value);
  const storageBefore = JSON.stringify({ localStorage: localStorage.calls, sessionStorage: sessionStorage.calls });
  const sideEffectsBefore = JSON.stringify(sideEffects);
  assert.equal(validate(value).ok, true);
  assert.equal(JSON.stringify(value), before);
  assert.equal(JSON.stringify({ localStorage: localStorage.calls, sessionStorage: sessionStorage.calls }), storageBefore);
  assert.equal(JSON.stringify(sideEffects), sideEffectsBefore);
});

test('accepts measurement extra keys and rejects invalid measurement boundaries', () => {
  const extra = fixture();
  extra.currentState.measurement.before.extra = 'ignored';
  accepted(extra);
  for (const value of [NaN, Infinity, '1', null]) {
    const invalid = fixture();
    invalid.currentState.measurement.before.value = value;
    invalid.currentState.measurement.before.state = 'scored';
    rejected(invalid);
  }
  for (const state of ['scored', 'not_a_problem', 'skipped', 'unset']) {
    const valid = fixture();
    valid.currentState.measurement.before.state = state;
    valid.currentState.measurement.before.value = state === 'scored' ? 0 : null;
    accepted(valid);
  }
  const invalidState = fixture();
  invalidState.currentState.measurement.before.state = 'unknown';
  rejected(invalidState);
});

test('accepts response extra keys and rejects invalid response boundaries', () => {
  const extra = fixture();
  extra.currentState.responses.current.extra = 'ignored';
  accepted(extra);
  for (const state of ['answered', 'skipped', 'unset']) {
    const valid = fixture();
    valid.currentState.responses.current.state = state;
    valid.currentState.responses.current.text = state === 'answered' ? 'x' : '';
    accepted(valid);
  }
  for (const value of [null, 1, true]) {
    const invalid = fixture();
    invalid.currentState.responses.current.text = value;
    rejected(invalid);
  }
  const invalidState = fixture();
  invalidState.currentState.responses.current.state = 'unknown';
  rejected(invalidState);
});

test('accepts enum boundaries and rejects enum values outside them', () => {
  for (const locale of ['ja', 'en', 'zh-TW']) {
    const valid = fixture();
    valid.summary.locale = locale;
    valid.currentState.locale = locale;
    valid.currentState.entry.localeAtSelection = locale;
    accepted(valid);
  }
  for (const locale of ['unknown', null, 1]) {
    const invalid = fixture();
    invalid.summary.locale = locale;
    invalid.currentState.locale = locale;
    invalid.currentState.entry.localeAtSelection = locale;
    rejected(invalid);
  }
  for (const routeType of ['problem', 'ideal', 'spiritual']) {
    const valid = fixture();
    valid.summary.routeType = routeType;
    valid.currentState.routeType = routeType;
    accepted(valid);
  }
  for (const routeType of ['', 'Problem', 1, null]) {
    const invalid = fixture();
    invalid.summary.routeType = routeType;
    rejected(invalid);
  }
  for (const variant of ['A', 'B']) {
    const valid = fixture();
    valid.currentState.regularFlow.questionVariant = variant;
    accepted(valid);
  }
  const invalidVariant = fixture();
  invalidVariant.currentState.regularFlow.questionVariant = 'C';
  rejected(invalidVariant);
  for (const entryType of ['life_theme', 'free_input', 'spiritual_wisdom']) {
    const valid = fixture();
    valid.summary.entryType = entryType;
    valid.currentState.entryType = entryType;
    valid.currentState.entry.entryType = entryType;
    if (entryType === 'free_input') {
      valid.currentState.entry.themeId = null;
      valid.currentState.entry.freeInputTheme = 'sample';
      valid.currentState.entry.questionTextAtTime = 'sample';
    }
    accepted(valid);
  }
  for (const entryType of ['unknown', undefined]) {
    const invalid = fixture();
    invalid.summary.entryType = entryType;
    invalid.currentState.entryType = entryType;
    invalid.currentState.entry.entryType = entryType;
    rejected(invalid);
  }
});

test('observes root and regularFlow extra-key behavior', () => {
  const rootExtra = fixture();
  rootExtra.extra = 'ignored';
  accepted(rootExtra);
  const flowExtra = fixture();
  flowExtra.currentState.regularFlow.extra = 'ignored';
  accepted(flowExtra);
});

test('rejects missing or wrong types without coercion', () => {
  for (const field of ['snapshotSchemaVersion', 'appVersion', 'sessionId', 'status', 'createdAt', 'savedAt', 'updatedAt']) {
    const missing = fixture();
    delete missing[field];
    rejected(missing);
  }
  for (const value of ['1', 1, true, null]) {
    const invalid = fixture();
    invalid.revision = value;
    rejected(invalid);
  }
  const missingNested = fixture();
  delete missingNested.currentState.responses.current.text;
  rejected(missingNested);
  for (const value of [null, []]) {
    const invalid = fixture();
    invalid.currentState.measurement = value;
    rejected(invalid);
  }
});

test('does not perform validator side effects or mutate fixtures', () => {
  const value = fixture();
  const before = JSON.stringify(value);
  const storageBefore = JSON.stringify({ localStorage: localStorage.calls, sessionStorage: sessionStorage.calls });
  const result = validate(value);
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(value), before);
  assert.equal(JSON.stringify({ localStorage: localStorage.calls, sessionStorage: sessionStorage.calls }), storageBefore);
  assert.equal(Object.prototype.hasOwnProperty.call(globalThis, 'NoetuneV17SessionSnapshot'), false);
});
