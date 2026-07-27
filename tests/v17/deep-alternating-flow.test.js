const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../../app-v17.html'), 'utf8');
const start = html.lastIndexOf('function getV17DeepDivePromptPath(routeType, phase, variant)');
const end = html.indexOf('function handleV17BreathBack()', start);
const source = html.slice(start, end);
const regularScreenStart = html.indexOf('function renderV17Screen(screenId)');
const regularScreenEnd = html.indexOf('function renderCurrentV17Screen()', regularScreenStart);
const regularScreenSource = html.slice(regularScreenStart, regularScreenEnd);
const regularRouteStart = html.indexOf('function getV17ThemeRoute()');
const regularRouteEnd = html.indexOf('function getV17ThemeMeaning()', regularRouteStart);
const regularRouteSource = html.slice(regularRouteStart, regularRouteEnd);
const snapshotSource = fs.readFileSync(path.join(__dirname, '../../js/v17/session-snapshot.js'), 'utf8');
const authSource = fs.readFileSync(path.join(__dirname, '../../js/v17/auth.js'), 'utf8');

function extractAppFunction(name) {
  const start = html.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, 'missing app function: ' + name);
  const bodyStart = html.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < html.length; index += 1) {
    if (html[index] === '{') depth += 1;
    if (html[index] === '}' && --depth === 0) return html.slice(start, index + 1);
  }
  throw new Error('unterminated app function: ' + name);
}

function fixture(routeType) {
  const calls = [];
  const input = { value: '' };
  const context = {
    D: { questionTextAtTime: 'theme-x', theme: 'theme-x', v17Flow: {} },
    cur: 's-v17-deep-response',
    document: { getElementById(id) { return id === 'in-v17-deep-response' ? input : { disabled: false }; } },
    ensureV17SessionState() {}, createV17FlowState() { return {}; },
    getV17DeepDiveRouteType() { return routeType; },
    cloneV17State(value) { return JSON.parse(JSON.stringify(value)); },
    setEl() {}, v17Copy(key) { return key; }, setV17CurrentStep() {},
    renderV17DeepDiveSourceBlock() {}, renderV17Screen() {}, fwd(id) { calls.push(id); },
    setV17ScreenDirectWithoutHistoryReset(id) { context.cur = id; calls.push(id); },
    openV17Breath() { calls.push('breath'); }
  };
  vm.runInNewContext(source, context, { filename: 'app-v17.html' });
  return { context, input, calls };
}

function answer(f, value) { f.input.value = value; f.context.onV17DeepDiveInput(value); f.context.submitV17DeepDiveResponse(); }

function hardOffAuthFixture() {
  const store = new Map([
    ['noetuneV17AuthReturn', 'private-like'],
    ['noetunePendingBookmark', 'private-like']
  ]);
  const calls = { remove: [], saveResult: 0, saveProgress: 0, saveBookmark: 0 };
  const context = {
    sessionStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem() { throw new Error('unexpected storage write'); },
      removeItem(key) { calls.remove.push(key); store.delete(key); }
    },
    Date, JSON, isFinite,
    v17AuthState: { status: 'plus', user: { id: 'u' } },
    v17AuthBusy: false,
    savePendingResultIfNeeded() { calls.saveResult += 1; },
    savePendingProgressIfNeeded() { calls.saveProgress += 1; },
    savePendingBookmarkIfNeeded() { calls.saveBookmark += 1; }
  };
  context.window = context;
  vm.runInNewContext(authSource, context, { filename: 'js/v17/auth.js' });
  return { context, store, calls };
}

test('Phase 5C-0a hard-off owner is explicit and immutable', () => {
  const f = hardOffAuthFixture();
  assert.equal(f.context.isV17CloudSessionBookmarkEnabled(), false);
  assert.equal(f.context.V17_CLOUD_SESSION_BOOKMARK_ENABLED, false);
});

test('Phase 5C-0a stale auth keys are removed without parsing', () => {
  const f = hardOffAuthFixture();
  const result = f.context.cleanupRetiredV17AuthStorage();
  assert.equal(result.ok, true);
  assert.equal(f.store.has('noetuneV17AuthReturn'), false);
  assert.equal(f.store.has('noetunePendingBookmark'), false);
  assert.equal(f.calls.remove.length, 2);
});

test('Phase 5C-0a stale cleanup is idempotent', () => {
  const f = hardOffAuthFixture();
  f.context.cleanupRetiredV17AuthStorage();
  f.context.cleanupRetiredV17AuthStorage();
  assert.equal(f.store.size, 0);
  assert.equal(f.calls.remove.length, 4);
});

test('Phase 5C-0a auth-return restore is retired and does not hydrate Result', async () => {
  const f = hardOffAuthFixture();
  const result = await f.context.restoreV17AuthReturnIfNeeded();
  assert.equal(result.disabled, true);
  assert.equal(f.store.size, 0);
});

test('Phase 5C-0a auth callback pending saves are fail closed', async () => {
  const f = hardOffAuthFixture();
  const result = await f.context.runV17PendingSavesIfNeeded();
  assert.equal(result, false);
  assert.deepEqual(f.calls, { remove: ['noetuneV17AuthReturn', 'noetunePendingBookmark'], saveResult: 0, saveProgress: 0, saveBookmark: 0 });
});

test('Phase 5C-0a common Session Bookmark handler is disabled directly', () => {
  const fn = extractAppFunction('handleV17SessionBookmarkClick');
  const context = { isV17CloudSessionBookmarkEnabled() { return false; }, isV17GuestLocalBookmarkRetired() { return false; } };
  vm.runInNewContext(fn, context);
  const result = context.handleV17SessionBookmarkClick();
  assert.equal(result.ok, true); assert.equal(result.written, false); assert.equal(result.reason, 'V17_CLOUD_SESSION_BOOKMARK_DISABLED');
});

test('Phase 5C-0a Result Bookmark handler is disabled directly', () => {
  const fn = extractAppFunction('handleV17ResultBookmarkClick');
  const context = { isV17CloudSessionBookmarkEnabled() { return false; } };
  vm.runInNewContext(fn, context);
  assert.equal(context.handleV17ResultBookmarkClick(), false);
});

test('Phase 5C-0a hard-off guards do not expose private values', () => {
  const f = hardOffAuthFixture();
  const result = f.context.restoreV17AuthReturnIfNeeded;
  assert.equal(typeof result, 'function');
  assert.equal(JSON.stringify(f.context.cleanupRetiredV17AuthStorage()).includes('private-like'), false);
});

test('Deep alternates A/B, keeps original theme, and commits only complete rounds', () => {
  const f = fixture('problem');
  f.context.startV17DeepDive();
  let deep = f.context.D.v17Flow.deepDive;
  assert.equal(deep.round, 1); assert.equal(deep.questionVariant, 'A'); assert.equal(deep.phase, 'question1');
  assert.equal(deep.originalTheme, 'theme-x'); assert.equal(f.context.getV17DeepDiveDisplayQuote(deep), 'theme-x');
  assert.equal(f.context.getV17DeepDivePromptPath('problem', 'question1', 'A'), 'flow.step2.problems.variantA');
  answer(f, 'one'); deep = f.context.D.v17Flow.deepDive;
  assert.equal(deep.phase, 'question2'); assert.equal(deep.pendingRound.question1.text, 'one');
  assert.equal(f.context.getV17DeepDiveDisplayQuote(deep), 'one'); assert.equal(deep.rounds.length, 0);
  answer(f, 'two'); deep = f.context.D.v17Flow.deepDive;
  assert.equal(deep.rounds.length, 1); assert.equal(deep.round, 2); assert.equal(deep.questionVariant, 'B');
  assert.equal(deep.pendingRound.originalTheme, 'theme-x'); assert.equal(f.context.getV17DeepDiveDisplayQuote(deep), 'theme-x');
  answer(f, 'three'); answer(f, 'four'); deep = f.context.D.v17Flow.deepDive;
  assert.equal(deep.round, 3); assert.equal(deep.questionVariant, 'A'); assert.equal(deep.rounds.length, 2);
});

test('Deep preserves drafts through Back, does not use Feel100, and No More Words alone opens Breath', () => {
  const f = fixture('spiritual');
  f.context.startV17DeepDive();
  let deep = f.context.D.v17Flow.deepDive;
  assert.equal(f.context.getV17DeepDivePromptPath('spiritual', 'question1', 'B'), 'flow.step2.ideals.variantB');
  f.context.onV17DeepDiveInput('draft-one'); assert.equal(deep.pendingRound.question1.draft, 'draft-one');
  answer(f, 'one'); f.input.value = 'draft-two'; f.context.onV17DeepDiveInput('draft-two');
  assert.equal(f.context.handleV17DeepDiveBack(), true); deep = f.context.D.v17Flow.deepDive;
  assert.equal(deep.phase, 'question1'); assert.equal(deep.pendingRound.question1.text, 'one'); assert.equal(deep.pendingRound.question2.draft, 'draft-two');
  answer(f, 'one'); answer(f, 'two');
  f.input.value = 'next-draft'; f.context.onV17DeepDiveInput('next-draft');
  assert.equal(f.context.handleV17DeepDiveBack(), true); deep = f.context.D.v17Flow.deepDive;
  assert.equal(deep.round, 1); assert.equal(deep.phase, 'question2'); assert.equal(deep.pendingRound.question2.text, 'two');
  answer(f, 'two'); deep = f.context.D.v17Flow.deepDive;
  assert.equal(deep.round, 2); assert.equal(deep.pendingRound.question1.draft, 'next-draft');
  f.context.finishV17DeepDive(); deep = f.context.D.v17Flow.deepDive;
  assert.equal(deep.finished, true); assert.equal(deep.pendingRound.incomplete, true); assert.equal(deep.rounds.length, 1);
  assert.deepEqual(f.calls.includes('s-v17-deep-feel-100'), false); assert.equal(f.calls.at(-1), 'breath');
});

test('Deep result candidate maps committed final rounds by route and ignores a new empty pending round', () => {
  const problem = fixture('problem');
  problem.context.startV17DeepDive();
  answer(problem, 'problem-ideal'); answer(problem, 'problem-current');
  let candidate = problem.context.getV17DeepDiveResultCandidate();
  assert.deepEqual(JSON.parse(JSON.stringify(candidate)), {
    round: 1, question1Text: 'problem-ideal', question2Text: 'problem-current',
    currentState: 'problem-current', idealState: 'problem-ideal'
  });
  problem.context.finishV17DeepDive();
  assert.equal(problem.context.D.currentState, 'problem-current');
  assert.equal(problem.context.D.idealState, 'problem-ideal');
  assert.equal(problem.context.D.v17Flow.step2Text, 'problem-ideal');
  assert.equal(problem.context.D.v17Flow.step3Text, 'problem-current');

  const ideal = fixture('ideal');
  ideal.context.startV17DeepDive();
  answer(ideal, 'ideal-current'); answer(ideal, 'ideal-state');
  candidate = ideal.context.getV17DeepDiveResultCandidate();
  assert.deepEqual(JSON.parse(JSON.stringify(candidate)), {
    round: 1, question1Text: 'ideal-current', question2Text: 'ideal-state',
    currentState: 'ideal-current', idealState: 'ideal-state'
  });
  ideal.context.finishV17DeepDive();
  assert.equal(ideal.context.D.currentState, 'ideal-current');
  assert.equal(ideal.context.D.idealState, 'ideal-state');

  const spiritual = fixture('spiritual');
  spiritual.context.startV17DeepDive();
  answer(spiritual, 'spiritual-current'); answer(spiritual, 'spiritual-ideal');
  spiritual.context.finishV17DeepDive();
  assert.equal(spiritual.context.D.currentState, 'spiritual-current');
  assert.equal(spiritual.context.D.idealState, 'spiritual-ideal');
});

test('Deep result candidate keeps partial pending rounds isolated from completed rounds and never promotes drafts', () => {
  const f = fixture('problem');
  f.context.startV17DeepDive();
  const deep = f.context.D.v17Flow.deepDive;
  deep.rounds.push({
    round: 1, question1: { text: 'old-ideal', draft: '' }, question2: { text: 'old-current', draft: '' }
  });
  deep.round = 2;
  deep.pendingRound = {
    round: 2,
    question1: { text: 'new-ideal', draft: 'draft-must-not-appear' },
    question2: { text: '', draft: 'new-current-draft' }
  };
  const deepBeforeResolve = JSON.stringify(deep);
  let candidate = f.context.getV17DeepDiveResultCandidate();
  assert.equal(JSON.stringify(deep), deepBeforeResolve);
  assert.deepEqual(JSON.parse(JSON.stringify(candidate)), {
    round: 2, question1Text: 'new-ideal', question2Text: '',
    currentState: '', idealState: 'new-ideal'
  });
  f.context.finishV17DeepDive();
  assert.equal(f.context.D.currentState, '');
  assert.equal(f.context.D.idealState, 'new-ideal');
  assert.equal(f.context.D.v17Flow.step2Text, 'new-ideal');
  assert.equal(f.context.D.v17Flow.step3Text, '');
  assert.equal(f.context.D.currentState.includes('draft'), false);
  assert.equal(f.context.D.idealState.includes('draft'), false);
});

test('Deep result candidate is empty and safe when no confirmed text exists', () => {
  const f = fixture('problem');
  f.context.startV17DeepDive();
  const deep = f.context.D.v17Flow.deepDive;
  deep.pendingRound.question1.draft = 'draft-only';
  const candidate = f.context.getV17DeepDiveResultCandidate();
  assert.deepEqual(JSON.parse(JSON.stringify(candidate)), {
    round: null, question1Text: '', question2Text: '', currentState: '', idealState: ''
  });
  assert.doesNotThrow(() => f.context.finishV17DeepDive());
  assert.equal(f.context.D.currentState, '');
  assert.equal(f.context.D.idealState, '');
});

test('Regular prompt resolution remains isolated from Deep A/B state transitions', () => {
  const calls = { copy: [], format: [], set: [] };
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      id, value: '', disabled: false, hidden: false, style: {}, classList: { add() {}, remove() {} },
      setAttribute() {}, textContent: ''
    });
    return elements.get(id);
  }
  const context = {
    D: {
      questionTextAtTime: 'synthetic-theme', theme: 'synthetic-theme',
      v17Flow: { questionVariant: 'B' }
    },
    cur: 's-v17-deep-response',
    document: { getElementById: element },
    ensureV17SessionState() {}, createV17FlowState() { return {}; },
    getV17DeepDiveRouteType() { return 'problem'; },
    getV17RouteDraft() { return ''; },
    cloneV17State(value) { return JSON.parse(JSON.stringify(value)); },
    setEl(id, value) { calls.set.push({ id, value }); element(id).textContent = value; },
    v17Copy(key) { calls.copy.push(key); return 'copy:' + key; },
    v17Format(key, values) { calls.format.push({ key, values }); return 'format:' + key; },
    setV17CurrentStep() {}, positionV17SkipButton() {},
    renderV17ThemeBlock() {},
    renderV17DeepDiveSourceBlock() {}, fwd() {},
    renderV17ScreenDeep: null,
    setV17ScreenDirectWithoutHistoryReset(id) { context.cur = id; },
    openV17Breath() {}
  };
  vm.runInNewContext(regularRouteSource, context, { filename: 'app-v17.html' });
  vm.runInNewContext(regularScreenSource, context, { filename: 'app-v17.html' });
  vm.runInNewContext(source, context, { filename: 'app-v17.html' });

  function regularContract(route, variant) {
    context.D.themeTrackId = route === 'ideal' ? 'ideals' : '';
    context.D.themeSource = route === 'spiritual' ? 'spiritual-wisdom' : '';
    context.D.v17Flow.questionVariant = variant;
    calls.copy.length = 0; calls.format.length = 0; calls.set.length = 0;
    context.renderV17Screen('s-v17-first-response');
    const first = {
      copy: calls.copy.slice(),
      format: calls.format.slice(),
      set: calls.set.slice()
    };
    context.D.v17Flow.step2Text = 'synthetic-regular-answer';
    calls.copy.length = 0; calls.format.length = 0; calls.set.length = 0;
    context.renderV17Screen('s-v17-second-response');
    return { first, second: { copy: calls.copy.slice(), format: calls.format.slice(), set: calls.set.slice() } };
  }

  const expectedRoute = { problem: 'problems', ideal: 'ideals', spiritual: 'ideals' };
  const before = {};
  for (const route of Object.keys(expectedRoute)) {
    for (const variant of ['A', 'B']) {
      const contract = regularContract(route, variant);
      before[route + variant] = JSON.parse(JSON.stringify(contract));
      assert.ok(contract.first.copy.includes('flow.step2.' + expectedRoute[route] + '.variant' + variant));
      assert.deepEqual(JSON.parse(JSON.stringify(contract.first.format)), [
        { key: 'flow.step2.quote', values: { theme: 'synthetic-theme' } }
      ]);
      assert.ok(contract.second.copy.includes('flow.step3.' + expectedRoute[route] + '.prompt'));
      assert.deepEqual(JSON.parse(JSON.stringify(contract.second.format)), [
        { key: 'flow.step3.quote', values: { response: 'synthetic-regular-answer' } }
      ]);
    }
  }

  context.D.themeTrackId = '';
  context.D.themeSource = '';
  context.D.v17Flow.questionVariant = 'B';
  context.startV17DeepDive();
  let deep = context.D.v17Flow.deepDive;
  assert.equal(context.D.v17Flow.questionVariant, 'B');
  assert.equal(deep.questionVariant, 'A');
  element('in-v17-deep-response').value = 'synthetic-deep-one';
  context.onV17DeepDiveInput('synthetic-deep-one');
  context.submitV17DeepDiveResponse();
  assert.equal(context.D.v17Flow.questionVariant, 'B');
  element('in-v17-deep-response').value = 'synthetic-deep-two';
  context.onV17DeepDiveInput('synthetic-deep-two');
  context.submitV17DeepDiveResponse();
  deep = context.D.v17Flow.deepDive;
  assert.equal(deep.questionVariant, 'B');
  assert.equal(context.D.v17Flow.questionVariant, 'B');
  assert.equal(context.handleV17DeepDiveBack(), true);
  assert.equal(context.D.v17Flow.questionVariant, 'B');
  context.finishV17DeepDive();
  assert.equal(context.D.v17Flow.questionVariant, 'B');
  context.startV17DeepDive();
  assert.equal(context.D.v17Flow.questionVariant, 'B');
  assert.equal(context.D.v17Flow.deepDive.questionVariant, 'A');

  for (const route of Object.keys(expectedRoute)) {
    for (const variant of ['A', 'B']) {
      assert.deepEqual(
        JSON.parse(JSON.stringify(regularContract(route, variant))),
        before[route + variant]
      );
    }
  }
});

test('production Deep resume renders drafts and preserves the existing Regular variant', () => {
  const input = { value: '' };
  const renders = [];
  const context = {
    TextEncoder,
    crypto: { randomUUID() { return '33333333-3333-4333-8333-333333333333'; } },
    localStorage: { getItem() { return null; }, setItem() {} },
    sessionStorage: { getItem() { return null; }, setItem() {} },
    document: { getElementById(id) { return id === 'in-v17-deep-response' ? input : { disabled: false, hidden: false, classList: { add() {}, remove() {} } }; }, querySelectorAll() { return []; } },
    D: { questionTextAtTime: 'theme-x', theme: 'theme-x', v17Flow: { questionVariant: 'B' } },
    cur: 's-v17-deep-response', lang: 'en',
    ensureV17SessionState() {}, createV17FlowState() { return {}; },
    getV17DeepDiveRouteType() { return 'problem'; }, cloneV17State(value) { return JSON.parse(JSON.stringify(value)); },
    setEl() {}, v17Copy(key) { return key; }, v17Format(key) { return key; }, setV17CurrentStep() {},
    renderV17DeepDiveSourceBlock() {}, fwd() {}, openV17Breath() {}, updateBackBtn() {}, updateProgress() {}, updateThemeCTA() {}, updateIdealCTA() {}, updateDoorCTA() {}, updateNegaCTA() {},
    resetV17ResumeNavigationHistory() {}, setV17ScreenDirectWithoutHistoryReset(id) { context.cur = id; },
    renderV17Screen(id) { renders.push({ id, phase: context.D.v17Flow.deepDive && context.D.v17Flow.deepDive.phase }); if (id === 's-v17-deep-response') context.renderV17DeepDiveResponseScreen(); }
  };
  context.window = context;
  vm.runInNewContext(snapshotSource, context, { filename: 'js/v17/session-snapshot.js' });
  vm.runInNewContext(source, context, { filename: 'app-v17.html' });
  vm.runInNewContext(extractAppFunction('resumeV17RegularSnapshotToScreen'), context, { filename: 'app-v17.html' });
  const api = context.window.NoetuneV17SessionSnapshot;
  const deep = {
    routeType: 'problem', originalTheme: 'theme-x', round: 2, questionVariant: 'B', phase: 'question2', finished: false,
    rounds: [{ round: 1, questionVariant: 'A', originalTheme: 'theme-x', question1: { text: 'one', draft: '' }, question2: { text: 'two', draft: '' }, incomplete: false }],
    pendingRound: { round: 2, questionVariant: 'B', originalTheme: 'theme-x', question1: { text: 'three', draft: '' }, question2: { text: '', draft: 'four-draft' }, incomplete: false },
    nextPendingRound: { round: 3, questionVariant: 'A', originalTheme: 'theme-x', question1: { text: '', draft: 'next-draft' }, question2: { text: '', draft: '' }, incomplete: false }
  };
  Object.assign(context.D, {
    v17SessionMode: 'deep', v17SessionIdentity: api.createV17SessionIdentity('2026-01-01T00:00:00.000Z'),
    v17Flow: { questionVariant: 'B', currentScreen: 's-v17-deep-response', currentStep: 'deep.question2', deepDive: deep },
    themeSource: 'themeLibrary', themeTrackId: 'problems', localeAtTime: 'en', questionTextAtTime: 'theme-x', theme: 'theme-x', themeId: 'theme-1', questionId: null,
    initialThemeScore: null, finalThemeScore: null, currentThemeScoreTrail: [], currentThemeAwarenessTrail: []
  });
  const serialized = api.serializeV17SessionSnapshot({ savedAt: '2026-01-01T00:01:00.000Z', now: '2026-01-01T00:02:00.000Z' });
  assert.equal(serialized.ok, true);
  context.D = { questionTextAtTime: 'theme-x', theme: 'theme-x', v17Flow: { questionVariant: 'A' } };
  const resumed = context.resumeV17RegularSnapshotToScreen(serialized.snapshot);
  assert.equal(resumed.ok, true);
  assert.equal(renders.length, 1);
  assert.equal(context.D.v17Flow.questionVariant, 'A');
  assert.equal(context.D.v17Flow.deepDive.questionVariant, 'B');
  assert.equal(context.D.v17Flow.deepDive.phase, 'question2');
  assert.equal(input.value, 'four-draft');
  assert.equal(context.handleV17DeepDiveBack(), true);
  assert.equal(context.D.v17Flow.deepDive.phase, 'question1');
  assert.equal(context.D.v17Flow.questionVariant, 'A');
  context.D.v17Flow.deepDive.phase = 'question1';
  assert.equal(context.handleV17DeepDiveBack(), true);
  assert.equal(context.D.v17Flow.deepDive.round, 1);
  assert.equal(context.D.v17Flow.deepDive.nextPendingRound.round, 2);
  assert.equal(context.D.v17Flow.questionVariant, 'A');
  context.D.v17Flow.deepDive.phase = 'question2';
  context.D.v17Flow.deepDive.pendingRound.question2.text = 'two';
  context.submitV17DeepDiveResponse();
  assert.equal(context.D.v17Flow.deepDive.round, 2);
  assert.equal(context.D.v17Flow.deepDive.pendingRound.question1.text, 'three');
  assert.equal(context.D.v17Flow.deepDive.pendingRound.question2.draft, 'four-draft');
  assert.equal(context.D.v17Flow.questionVariant, 'A');
  const candidate = context.getV17DeepDiveResultCandidate();
  assert.equal(candidate.round, 2);
  assert.equal(candidate.question1Text, 'three');
});

function productionResumeHarness(deep, regularVariant) {
  const input = { value: '' };
  const events = { copy: [], source: [], render: [] };
  const context = {
    TextEncoder,
    crypto: { randomUUID() { return '33333333-3333-4333-8333-333333333333'; } },
    localStorage: { getItem() { return null; }, setItem() {} },
    sessionStorage: { getItem() { return null; }, setItem() {} },
    document: { getElementById(id) { return id === 'in-v17-deep-response' ? input : { disabled: false, hidden: false, classList: { add() {}, remove() {} } }; }, querySelectorAll() { return []; } },
    D: { questionTextAtTime: deep.originalTheme, theme: deep.originalTheme, v17Flow: { questionVariant: regularVariant } },
    cur: 's-v17-deep-response', lang: 'en',
    ensureV17SessionState() {}, createV17FlowState() { return {}; },
    getV17DeepDiveRouteType() { return deep.routeType; }, getV17RouteDraft() { return ''; },
    cloneV17State(value) { return JSON.parse(JSON.stringify(value)); },
    setEl() {}, v17Copy(key) { events.copy.push(key); return key; }, v17Format(key, values) { return key + JSON.stringify(values); }, setV17CurrentStep(step) { context.D.v17Flow.currentStep = step; },
    positionV17SkipButton() {}, renderV17ThemeBlock() {},
    renderV17DeepDiveSourceBlock(_block, _quoteId, _meaning, quote) { events.source.push(quote); },
    fwd() {}, openV17Breath() { context.cur = 's-v17-breath'; events.breath = (events.breath || 0) + 1; }, updateBackBtn() {}, updateProgress() {}, updateThemeCTA() {}, updateIdealCTA() {}, updateDoorCTA() {}, updateNegaCTA() {},
    resetV17ResumeNavigationHistory() {}, setV17ScreenDirectWithoutHistoryReset(id) { context.cur = id; },
    renderV17Screen(id) {
      events.render.push({ id, mode: context.D.v17SessionMode, deep: context.D.v17Flow.deepDive && JSON.parse(JSON.stringify(context.D.v17Flow.deepDive)), currentStep: context.D.v17Flow.currentStep, regularVariant: context.D.v17Flow.questionVariant });
      if (id === 's-v17-deep-response') context.renderV17DeepDiveResponseScreen();
    }
  };
  context.window = context;
  vm.runInNewContext(snapshotSource, context, { filename: 'js/v17/session-snapshot.js' });
  vm.runInNewContext(source, context, { filename: 'app-v17.html' });
  vm.runInNewContext(extractAppFunction('resumeV17RegularSnapshotToScreen'), context, { filename: 'app-v17.html' });
  const api = context.window.NoetuneV17SessionSnapshot;
  Object.assign(context.D, {
    v17SessionMode: 'deep', v17SessionIdentity: api.createV17SessionIdentity('2026-01-01T00:00:00.000Z'),
    v17Flow: { questionVariant: regularVariant, currentScreen: 's-v17-deep-response', currentStep: 'deep.' + deep.phase, deepDive: deep },
    themeSource: 'themeLibrary', themeTrackId: deep.routeType === 'problem' ? 'problems' : 'ideals', localeAtTime: 'en', questionTextAtTime: deep.originalTheme, theme: deep.originalTheme, themeId: 'theme-1', questionId: null,
    initialThemeScore: null, finalThemeScore: null, currentThemeScoreTrail: [], currentThemeAwarenessTrail: []
  });
  const serialized = api.serializeV17SessionSnapshot({ savedAt: '2026-01-01T00:01:00.000Z', now: '2026-01-01T00:02:00.000Z' });
  assert.equal(serialized.ok, true);
  context.D = { questionTextAtTime: deep.originalTheme, theme: deep.originalTheme, v17Flow: { questionVariant: regularVariant } };
  const resumed = context.resumeV17RegularSnapshotToScreen(serialized.snapshot);
  assert.equal(resumed.ok, true);
  return { context, input, events };
}

test('production Deep Q1 resume renders the theme prompt and Q1 draft without Regular variant pollution', () => {
  const deep = {
    routeType: 'problem', originalTheme: 'q1-theme', round: 2, questionVariant: 'B', phase: 'question1', finished: false,
    rounds: [{ round: 1, questionVariant: 'A', originalTheme: 'q1-theme', question1: { text: 'previous-q1', draft: '' }, question2: { text: 'previous-q2', draft: '' }, incomplete: false }],
    pendingRound: { round: 2, questionVariant: 'B', originalTheme: 'q1-theme', question1: { text: '', draft: 'q1-draft' }, question2: { text: '', draft: 'q2-draft-must-not-render' }, incomplete: false },
    nextPendingRound: { round: 3, questionVariant: 'A', originalTheme: 'q1-theme', question1: { text: '', draft: '' }, question2: { text: '', draft: '' }, incomplete: false }
  };
  const { context, input, events } = productionResumeHarness(deep, 'B');
  assert.equal(context.cur, 's-v17-deep-response');
  assert.equal(context.D.v17Flow.deepDive.phase, 'question1');
  assert.equal(context.D.v17Flow.questionVariant, 'B');
  assert.equal(context.D.v17Flow.deepDive.questionVariant, 'B');
  assert.equal(events.source.at(-1), 'q1-theme');
  assert.equal(events.source.includes('previous-q1'), false);
  assert.ok(events.copy.includes('flow.step2.problems.variantB'));
  assert.equal(input.value, 'q1-draft');
  assert.notEqual(input.value, 'q2-draft-must-not-render');
});

test('production Deep Q2 resume renders the same-round Q1 quote and Q2 draft', () => {
  const deep = {
    routeType: 'problem', originalTheme: 'q2-theme', round: 2, questionVariant: 'B', phase: 'question2', finished: false,
    rounds: [{ round: 1, questionVariant: 'A', originalTheme: 'q2-theme', question1: { text: 'previous-round-q1', draft: '' }, question2: { text: 'previous-round-q2', draft: '' }, incomplete: false }],
    pendingRound: { round: 2, questionVariant: 'B', originalTheme: 'q2-theme', question1: { text: 'same-round-q1', draft: 'q1-draft-must-not-render' }, question2: { text: '', draft: 'q2-draft' }, incomplete: false },
    nextPendingRound: { round: 3, questionVariant: 'A', originalTheme: 'q2-theme', question1: { text: '', draft: '' }, question2: { text: '', draft: '' }, incomplete: false }
  };
  const { context, input, events } = productionResumeHarness(deep, 'A');
  assert.equal(context.cur, 's-v17-deep-response');
  assert.equal(context.D.v17Flow.deepDive.phase, 'question2');
  assert.equal(context.D.v17Flow.questionVariant, 'A');
  assert.equal(context.D.v17Flow.deepDive.questionVariant, 'B');
  assert.equal(events.source.at(-1), 'same-round-q1');
  assert.equal(events.source.includes('previous-round-q1'), false);
  assert.ok(events.copy.includes('flow.step3.problems'));
  assert.equal(input.value, 'q2-draft');
  assert.notEqual(input.value, 'q1-draft-must-not-render');
});

test('production Deep restore completes before render and preserves a Regular prompt contract through Back and forward', () => {
  const deep = {
    routeType: 'problem', originalTheme: 'deep-theme', round: 2, questionVariant: 'B', phase: 'question2', finished: false,
    rounds: [{ round: 1, questionVariant: 'A', originalTheme: 'deep-theme', question1: { text: 'round-one-q1', draft: '' }, question2: { text: 'round-one-q2', draft: '' }, incomplete: false }],
    pendingRound: { round: 2, questionVariant: 'B', originalTheme: 'deep-theme', question1: { text: 'round-two-q1', draft: '' }, question2: { text: '', draft: 'round-two-q2-draft' }, incomplete: false },
    nextPendingRound: { round: 3, questionVariant: 'A', originalTheme: 'deep-theme', question1: { text: '', draft: 'round-three-q1-draft' }, question2: { text: '', draft: '' }, incomplete: false }
  };
  const { context, input, events } = productionResumeHarness(deep, 'B');
  const firstRender = events.render[0];
  assert.equal(firstRender.id, 's-v17-deep-response');
  assert.equal(firstRender.mode, 'deep');
  assert.equal(firstRender.regularVariant, 'B');
  assert.equal(firstRender.currentStep, 'deep.question2');
  assert.equal(firstRender.deep.originalTheme, 'deep-theme');
  assert.equal(firstRender.deep.round, 2);
  assert.equal(firstRender.deep.questionVariant, 'B');
  assert.equal(firstRender.deep.phase, 'question2');
  assert.equal(firstRender.deep.pendingRound.question2.draft, 'round-two-q2-draft');
  assert.equal(firstRender.deep.nextPendingRound.round, 3);
  assert.equal(firstRender.deep.finished, false);
  function resolveRegularContract(regularState) {
    const calls = { copy: [], format: [] };
    const resolver = {
      D: regularState,
      document: { getElementById() { return { disabled: false, hidden: false, value: '', textContent: '', style: {}, classList: { add() {}, remove() {} }, setAttribute() {} }; } },
      getV17RouteDraft() { return ''; }, setEl() {}, setV17CurrentStep() {}, positionV17SkipButton() {}, renderV17ThemeBlock() {},
      v17Copy(key) { calls.copy.push(key); return key; }, v17Format(key, values) { calls.format.push({ key, values }); return key; }
    };
    vm.runInNewContext(regularRouteSource, resolver, { filename: 'app-v17.html' });
    vm.runInNewContext(regularScreenSource, resolver, { filename: 'app-v17.html' });
    resolver.D.themeTrackId = '';
    resolver.D.themeSource = '';
    resolver.D.questionTextAtTime = 'regular-theme';
    resolver.D.theme = 'regular-theme';
    resolver.D.v17Flow.questionVariant = 'B';
    resolver.renderV17Screen('s-v17-first-response');
    resolver.D.v17Flow.step2Text = 'regular-answer';
    resolver.renderV17Screen('s-v17-second-response');
    return JSON.parse(JSON.stringify(calls));
  }
  const before = resolveRegularContract({ questionTextAtTime: 'regular-theme', theme: 'regular-theme', v17Flow: { questionVariant: 'B' } });
  assert.ok(before.copy.includes('flow.step2.problems.variantB'));
  assert.ok(before.copy.includes('flow.step3.problems.prompt'));
  assert.deepEqual(before.format, [
    { key: 'flow.step2.quote', values: { theme: 'regular-theme' } },
    { key: 'flow.step3.quote', values: { response: 'regular-answer' } }
  ]);
  assert.equal(context.handleV17DeepDiveBack(), true);
  assert.equal(context.D.v17Flow.deepDive.phase, 'question1');
  assert.equal(context.D.v17Flow.questionVariant, 'B');
  input.value = 'round-two-q1';
  context.submitV17DeepDiveResponse();
  assert.equal(context.D.v17Flow.deepDive.phase, 'question2');
  assert.equal(context.D.v17Flow.questionVariant, 'B');
  assert.equal(context.handleV17DeepDiveBack(), true);
  assert.equal(context.D.v17Flow.deepDive.phase, 'question1');
  assert.equal(context.handleV17DeepDiveBack(), true);
  assert.equal(context.D.v17Flow.deepDive.round, 1);
  assert.equal(context.D.v17Flow.questionVariant, 'B');
  context.D.v17Flow.deepDive.phase = 'question2';
  context.D.v17Flow.deepDive.pendingRound.question2.text = 'round-one-q2';
  context.submitV17DeepDiveResponse();
  assert.equal(context.D.v17Flow.deepDive.round, 2);
  assert.equal(context.D.v17Flow.deepDive.pendingRound.question1.text, 'round-two-q1');
  assert.equal(context.D.v17Flow.deepDive.pendingRound.question2.draft, 'round-two-q2-draft');
  assert.equal(context.D.v17Flow.questionVariant, 'B');
  assert.equal(context.D.v17Flow.deepDive.finished, false);
  const after = resolveRegularContract(context.D);
  assert.deepEqual(after, before);
  assert.equal(JSON.stringify(after).includes(context.D.v17Flow.deepDive.originalTheme), false);
  assert.equal(JSON.stringify(after).includes(context.D.v17Flow.deepDive.pendingRound.question1.text), false);
});

test('production Case 1 keeps Regular B isolated through Deep A resume, Back, next pending forward, and No More Words', () => {
  function resolveRegularB(state) {
    const calls = { copy: [], format: [] };
    const resolver = {
      D: state,
      document: { getElementById() { return { disabled: false, hidden: false, value: '', textContent: '', style: {}, classList: { add() {}, remove() {} }, setAttribute() {} }; } },
      getV17RouteDraft() { return ''; }, setEl() {}, setV17CurrentStep() {}, positionV17SkipButton() {}, renderV17ThemeBlock() {},
      v17Copy(key) { calls.copy.push(key); return key; }, v17Format(key, values) { calls.format.push({ key, values }); return key; }
    };
    vm.runInNewContext(regularRouteSource, resolver, { filename: 'app-v17.html' });
    vm.runInNewContext(regularScreenSource, resolver, { filename: 'app-v17.html' });
    resolver.D.themeTrackId = '';
    resolver.D.themeSource = '';
    resolver.D.questionTextAtTime = 'regular-case-one-theme';
    resolver.D.theme = 'regular-case-one-theme';
    resolver.D.v17Flow.questionVariant = 'B';
    resolver.renderV17Screen('s-v17-first-response');
    resolver.D.v17Flow.step2Text = 'regular-case-one-answer';
    resolver.renderV17Screen('s-v17-second-response');
    return JSON.parse(JSON.stringify(calls));
  }

  const regularBefore = resolveRegularB({
    questionTextAtTime: 'regular-case-one-theme', theme: 'regular-case-one-theme', v17Flow: { questionVariant: 'B' }
  });
  assert.ok(regularBefore.copy.includes('flow.step2.problems.variantB'));
  assert.deepEqual(regularBefore.format, [
    { key: 'flow.step2.quote', values: { theme: 'regular-case-one-theme' } },
    { key: 'flow.step3.quote', values: { response: 'regular-case-one-answer' } }
  ]);

  const deep = {
    routeType: 'problem', originalTheme: 'deep-case-one-theme', round: 1, questionVariant: 'A', phase: 'question1', finished: false,
    rounds: [],
    pendingRound: {
      round: 1, questionVariant: 'A', originalTheme: 'deep-case-one-theme',
      question1: { text: '', draft: 'round-one-q1-draft' },
      question2: { text: '', draft: 'round-one-q2-draft' }, incomplete: false
    },
    nextPendingRound: null
  };
  const { context, input, events } = productionResumeHarness(deep, 'B');
  let restored = context.D.v17Flow.deepDive;
  assert.equal(context.cur, 's-v17-deep-response');
  assert.equal(restored.phase, 'question1');
  assert.equal(restored.questionVariant, 'A');
  assert.equal(context.D.v17Flow.questionVariant, 'B');
  assert.equal(events.source.at(-1), 'deep-case-one-theme');
  assert.ok(events.copy.includes('flow.step2.problems.variantA'));
  assert.equal(input.value, 'round-one-q1-draft');
  assert.notEqual(input.value, 'round-one-q2-draft');

  input.value = 'round-one-q1-confirmed';
  context.onV17DeepDiveInput(input.value);
  context.submitV17DeepDiveResponse();
  restored = context.D.v17Flow.deepDive;
  assert.equal(restored.phase, 'question2');
  assert.equal(restored.pendingRound.question1.text, 'round-one-q1-confirmed');
  assert.equal(events.source.at(-1), 'round-one-q1-confirmed');
  assert.equal(input.value, 'round-one-q2-draft');
  assert.equal(context.D.v17Flow.questionVariant, 'B');

  assert.equal(context.handleV17DeepDiveBack(), true);
  restored = context.D.v17Flow.deepDive;
  assert.equal(restored.phase, 'question1');
  assert.equal(restored.pendingRound.question1.text, 'round-one-q1-confirmed');
  assert.equal(restored.pendingRound.question1.draft, 'round-one-q1-confirmed');
  assert.equal(restored.pendingRound.question2.draft, 'round-one-q2-draft');
  assert.equal(restored.questionVariant, 'A');
  assert.equal(context.D.v17Flow.questionVariant, 'B');

  input.value = 'round-one-q1-confirmed';
  context.onV17DeepDiveInput(input.value);
  context.submitV17DeepDiveResponse();
  assert.equal(context.D.v17Flow.deepDive.phase, 'question2');
  assert.equal(context.D.v17Flow.questionVariant, 'B');
  input.value = 'round-one-q2-confirmed';
  context.onV17DeepDiveInput(input.value);
  context.submitV17DeepDiveResponse();
  restored = context.D.v17Flow.deepDive;
  assert.equal(restored.round, 2);
  assert.equal(restored.phase, 'question1');
  assert.equal(restored.questionVariant, 'B');
  assert.equal(restored.originalTheme, 'deep-case-one-theme');
  assert.equal(restored.rounds.length, 1);
  assert.equal(restored.rounds[0].round, 1);
  assert.equal(context.D.v17Flow.questionVariant, 'B');
  input.value = 'round-two-q1-draft';
  context.onV17DeepDiveInput(input.value);
  assert.equal(restored.pendingRound.question1.draft, 'round-two-q1-draft');

  assert.equal(context.handleV17DeepDiveBack(), true);
  restored = context.D.v17Flow.deepDive;
  assert.equal(restored.round, 1);
  assert.equal(restored.phase, 'question2');
  assert.equal(restored.pendingRound.question2.text, 'round-one-q2-confirmed');
  assert.equal(restored.nextPendingRound.round, 2);
  assert.equal(restored.nextPendingRound.question1.draft, 'round-two-q1-draft');
  assert.deepEqual(JSON.parse(JSON.stringify(restored.rounds.map((round) => round.round))), []);
  assert.equal(context.D.v17Flow.questionVariant, 'B');

  input.value = 'round-one-q2-confirmed';
  context.onV17DeepDiveInput(input.value);
  context.submitV17DeepDiveResponse();
  restored = context.D.v17Flow.deepDive;
  assert.equal(restored.round, 2);
  assert.equal(restored.phase, 'question1');
  assert.equal(restored.questionVariant, 'B');
  assert.equal(restored.pendingRound.question1.draft, 'round-two-q1-draft');
  assert.equal(restored.nextPendingRound, null);
  assert.equal(restored.rounds.filter((round) => round.round === 1).length, 1);
  assert.equal(context.D.v17Flow.questionVariant, 'B');

  const pendingBeforeFinish = JSON.parse(JSON.stringify(restored.pendingRound));
  assert.equal(pendingBeforeFinish.question1.text, '');
  assert.equal(pendingBeforeFinish.question1.draft, 'round-two-q1-draft');
  assert.equal(restored.questionVariant, 'B');
  assert.equal(context.D.v17Flow.questionVariant, 'B');
  context.finishV17DeepDive();
  restored = context.D.v17Flow.deepDive;
  assert.equal(context.cur, 's-v17-breath');
  assert.equal(events.breath, 1);
  assert.equal(restored.rounds.length, 1);
  assert.equal(restored.pendingRound.question1.text, '');
  assert.equal(restored.pendingRound.question1.draft, 'round-two-q1-draft');
  assert.equal(context.D.v17Flow.questionVariant, 'B');

  const regularAfter = resolveRegularB({
    questionTextAtTime: 'regular-case-one-theme', theme: 'regular-case-one-theme',
    v17Flow: { questionVariant: context.D.v17Flow.questionVariant, deepDive: context.D.v17Flow.deepDive }
  });
  assert.deepEqual(regularAfter, regularBefore);
  assert.equal(JSON.stringify(regularAfter).includes('deep-case-one-theme'), false);
  assert.equal(JSON.stringify(regularAfter).includes('round-two-q1-draft'), false);
});

test('No More Words captures a typed Deep pre-Breath frame before finishing the root flow', () => {
  const f = fixture('problem');
  f.context.startV17DeepDive();
  f.context.onV17DeepDiveInput('draft-before-breath');
  f.context.finishV17DeepDive();
  const root = f.context.D.v17Flow.deepDive;
  const frame = f.context.D.v17Flow.resumeBackFrames[0];
  assert.equal(root.finished, true);
  assert.equal(root.pendingRound.incomplete, true);
  assert.equal(frame.frameType, 'deep-response');
  assert.equal(frame.state.deepFlow.finished, false);
  assert.equal(frame.state.deepFlow.pendingRound.incomplete, false);
});

test('Deep pre-Breath frame keeps a draft as a draft and does not promote it to confirmed text', () => {
  const f = fixture('problem');
  f.context.startV17DeepDive();
  f.input.value = 'synthetic-only-draft';
  f.context.onV17DeepDiveInput('synthetic-only-draft');
  f.context.finishV17DeepDive();
  const pending = f.context.D.v17Flow.resumeBackFrames[0].state.deepFlow.pendingRound;
  assert.equal(pending.question1.text, '');
  assert.equal(pending.question1.draft, 'synthetic-only-draft');
  assert.equal(f.context.D.v17Flow.deepDive.rounds.length, 0);
});

test('Deep pre-Breath frame preserves original theme, round, and Deep variant ownership', () => {
  const f = fixture('problem');
  f.context.startV17DeepDive();
  answer(f, 'one'); answer(f, 'two');
  f.context.finishV17DeepDive();
  const deep = f.context.D.v17Flow.resumeBackFrames[0].state.deepFlow;
  assert.equal(deep.round, 2);
  assert.equal(deep.questionVariant, 'B');
  assert.equal(deep.originalTheme, 'theme-x');
  assert.equal(deep.pendingRound.questionVariant, 'B');
});

test('Deep pre-Breath frame contains no raw history or timer fields', () => {
  const f = fixture('spiritual');
  f.context.startV17DeepDive();
  f.context.finishV17DeepDive();
  const serialized = JSON.stringify(f.context.D.v17Flow.resumeBackFrames[0]);
  assert.equal(serialized.includes('navHistory'), false);
  assert.equal(serialized.includes('navPageStateHistory'), false);
  assert.equal(serialized.includes('timer'), false);
  assert.equal(serialized.includes('interval'), false);
});

test('No More Words keeps the captured frame available while Breath is entered once', () => {
  const f = fixture('problem');
  f.context.startV17DeepDive();
  f.context.finishV17DeepDive();
  assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 1);
  assert.equal(f.calls.filter(value => value === 'breath').length, 1);
  assert.equal(f.context.D.v17Flow.deepDive.finished, true);
});

function regularBreathRuntime() {
  const events = [];
  const input = { value: 'synthetic-confirmed' };
  const context = {
    D: {
      v17SessionMode: 'regular', currentState: '', currentStateDraft: 'synthetic-current-draft', idealState: 'synthetic-ideal', idealStateDraft: 'synthetic-ideal-draft',
      v17Flow: { routeType: 'problem', questionVariant: 'B', activeScreen: 'second', firstResponseRole: 'ideal', secondResponseRole: 'current', responseStates: { current: 'unset', ideal: 'answered' }, breath: { first: false, second: false } }
    },
    cur: 's-v17-second-response', document: { getElementById(id) { return id === 'in-v17-second-response' ? input : null; } },
    cancelV17SavedDraftSnapshotUpdate() {}, updateV17SavedSessionSnapshot() {}, setV17SemanticResponse(_role, value) { context.D.currentState = value; },
    getV17ResponseKind() { return 'currentState'; }, setV17CurrentStep(step) { context.D.v17Flow.currentStep = step; },
    resetV17BreathScreen() {}, resetSlider() {}, renderV17Screen(id) { events.push({ id, step: context.D.v17Flow.currentStep, frame: context.D.v17Flow.resumeBackFrames && context.D.v17Flow.resumeBackFrames.length }); },
    fwd(id) { context.cur = id; }, setV17ScreenDirectWithoutHistoryReset(id) { context.cur = id; }, cloneV17State(value) { return JSON.parse(JSON.stringify(value)); }
  };
  for (const name of ['createV17RegularPreBreathFrame', 'openV17Breath', 'completeV17BreathFlow', 'handleV17BreathBack', 'createV17FinalPreBreathFrame', 'openV17FinalMeasurement', 'handleV17FinalMeasurementBack', 'submitV17SecondResponse']) {
    vm.runInNewContext(extractAppFunction(name), context, { filename: 'app-v17.html' });
  }
  return { context, events, input };
}

test('production Regular handler captures one typed predecessor frame before Breath Step 1', () => {
  const f = regularBreathRuntime();
  f.context.submitV17SecondResponse(false);
  const flow = f.context.D.v17Flow;
  assert.equal(f.context.cur, 's-v17-breath');
  assert.equal(flow.currentStep, 'step4.first');
  assert.equal(flow.questionVariant, 'B');
  assert.equal(flow.resumeBackFrames.length, 1);
  assert.equal(flow.resumeBackFrames[0].frameType, 'regular-response');
  assert.equal(flow.resumeBackFrames[0].state.responses.current.text, 'synthetic-confirmed');
});

test('production Regular Breath Step 2 keeps its typed frame and returns to Step 1 without history', () => {
  const f = regularBreathRuntime();
  f.context.submitV17SecondResponse(false);
  f.context.completeV17BreathFlow();
  assert.equal(f.context.D.v17Flow.breathStep, 2);
  assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 1);
  assert.equal(f.context.handleV17BreathBack(), true);
  assert.equal(f.context.D.v17Flow.breathStep, 1);
  assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 1);
  assert.equal(f.context.D.v17Flow.questionVariant, 'B');
});

test('production Regular Breath Back restores the exact response frame with raw history absent', () => {
  const f = regularBreathRuntime();
  f.context.submitV17SecondResponse(false);
  f.context.navHistory = []; f.context.navPageStateHistory = [];
  assert.equal(f.context.handleV17BreathBack(), true);
  assert.equal(f.context.cur, 's-v17-second-response');
  assert.equal(f.context.D.v17Flow.currentStep, 'step3');
  assert.equal(f.context.D.currentState, 'synthetic-confirmed');
  assert.equal(f.context.D.currentStateDraft, 'synthetic-current-draft');
  assert.equal(f.context.D.v17Flow.questionVariant, 'B');
  assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 0);
});

test('production Final captures the typed response-plus-Breath stack and Back restores Breath Step 2', () => {
  const f = regularBreathRuntime();
  f.context.submitV17SecondResponse(false);
  f.context.completeV17BreathFlow();
  f.context.completeV17BreathFlow();
  const flow = f.context.D.v17Flow;
  assert.equal(f.context.cur, 's-v17-final-measure');
  assert.equal(flow.currentScreen, 's-v17-final-measure');
  assert.equal(flow.currentStep, 'step5');
  assert.equal(flow.resumeBackFrames.length, 2);
  assert.equal(flow.resumeBackFrames[0].frameType, 'regular-response');
  assert.deepEqual(JSON.parse(JSON.stringify(flow.resumeBackFrames[1])), {
    frameType: 'breath', sessionMode: 'regular', screenId: 's-v17-breath', currentStep: 'step4.second',
    state: { breathState: { step: 2, phase: 'second', first: true, second: false } }
  });
  assert.equal(f.context.handleV17FinalMeasurementBack(), true);
  assert.equal(f.context.cur, 's-v17-breath');
  assert.equal(flow.currentScreen, 's-v17-breath');
  assert.equal(flow.currentStep, 'step4.second');
  assert.equal(flow.breathStep, 2);
  assert.equal(flow.resumeBackFrames.length, 1);
  assert.equal(flow.resumeBackFrames[0].frameType, 'regular-response');
});

test('Final Back preserves the two-stage Breath controls before restoring the exact response frame', () => {
  const f = regularBreathRuntime();
  f.context.submitV17SecondResponse(false);
  f.context.completeV17BreathFlow();
  f.context.completeV17BreathFlow();
  assert.equal(f.context.handleV17FinalMeasurementBack(), true);
  assert.equal(f.context.handleV17BreathBack(), true);
  assert.equal(f.context.cur, 's-v17-breath');
  assert.equal(f.context.D.v17Flow.breathStep, 1);
  assert.equal(f.context.handleV17BreathBack(), true);
  assert.equal(f.context.cur, 's-v17-second-response');
  assert.equal(f.context.D.v17Flow.currentStep, 'step3');
  assert.equal(f.context.D.currentState, 'synthetic-confirmed');
  assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 0);
});

test('Final controls create no stack before typed Breath Step 2 is eligible', () => {
  const f = regularBreathRuntime();
  assert.equal(f.context.createV17FinalPreBreathFrame(), null);
  f.context.submitV17SecondResponse(false);
  assert.equal(f.context.createV17FinalPreBreathFrame(), null);
  f.context.completeV17BreathFlow();
  assert.equal(f.context.createV17FinalPreBreathFrame().state.breathState.phase, 'second');
});

test('Final Back rejects a malformed control frame without changing navigation state', () => {
  const f = regularBreathRuntime();
  f.context.submitV17SecondResponse(false);
  f.context.completeV17BreathFlow();
  f.context.completeV17BreathFlow();
  f.context.D.v17Flow.resumeBackFrames[1].currentStep = 'step4.first';
  const before = JSON.stringify(f.context.D.v17Flow);
  assert.equal(f.context.handleV17FinalMeasurementBack(), false);
  assert.equal(f.context.cur, 's-v17-final-measure');
  assert.equal(f.context.D.v17Flow.currentScreen, 's-v17-final-measure');
  assert.equal(JSON.stringify(f.context.D.v17Flow), before);
  assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 2);
});

test('Final producer is isolated from analytics and does not render Result', () => {
  const f = regularBreathRuntime();
  let analyticsCalls = 0;
  f.context.trackEvent = function() { analyticsCalls += 1; };
  f.context.submitV17SecondResponse(false);
  f.context.completeV17BreathFlow();
  f.context.completeV17BreathFlow();
  assert.equal(analyticsCalls, 0);
  assert.deepEqual(f.events.map(event => event.id).includes('s-result'), false);
  assert.equal(f.events.at(-1).id, 's-v17-final-measure');
});

test('Deep Final control preserves its Deep response frame and does not adopt Regular state', () => {
  const deepFrame = {
    frameType: 'deep-response', sessionMode: 'deep', screenId: 's-v17-deep-response', currentStep: 'deep.question1',
    state: { routeType: 'problem', deepFlow: { phase: 'question1', finished: false } }
  };
  const context = {
    D: { v17SessionMode: 'deep', v17Flow: { questionVariant: 'B', resumeBackFrames: [deepFrame], breath: { first: true, second: true }, breathStep: 2, breathPhase: 'second' } },
    cur: 's-v17-breath', setV17CurrentStep(step) { context.D.v17Flow.currentStep = step; }, resetSlider() {},
    renderV17Screen() {}, fwd(id) { context.cur = id; }, cloneV17State(value) { return JSON.parse(JSON.stringify(value)); }
  };
  for (const name of ['createV17FinalPreBreathFrame', 'openV17FinalMeasurement']) vm.runInNewContext(extractAppFunction(name), context, { filename: 'app-v17.html' });
  context.openV17FinalMeasurement();
  assert.equal(context.cur, 's-v17-final-measure');
  assert.equal(context.D.v17Flow.resumeBackFrames[0].frameType, 'deep-response');
  assert.equal(context.D.v17Flow.resumeBackFrames[1].sessionMode, 'deep');
  assert.equal(context.D.v17Flow.questionVariant, 'B');
});

function resultArrivalRuntime(options = {}) {
  const mode = options.mode || 'regular';
  const response = mode === 'deep'
    ? { frameType: 'deep-response', sessionMode: 'deep', screenId: 's-v17-deep-response', currentStep: 'deep.question1', state: { routeType: 'problem', deepFlow: { phase: 'question1', finished: false } } }
    : { frameType: 'regular-response', sessionMode: 'regular', screenId: 's-v17-second-response', currentStep: 'step3', state: { routeType: 'problem', regularFlow: {}, responses: {}, semanticState: {} } };
  const breath = { frameType: 'breath', sessionMode: mode, screenId: 's-v17-breath', currentStep: 'step4.second', state: { breathState: { step: 2, phase: 'second', first: true, second: false } } };
  const events = [];
  const context = {
    D: {
      v17SessionMode: mode, beforeEmotionPositive: 3, afterEmotionPositive: 7, finalThemeScore: 7, deltaScore: 4,
      v17SessionIdentity: options.identity === false ? null : { cycleId: 'cycle-1', cycleIndex: 0, resultReachedAt: null, resultEventSent: false },
      v17MeasurementState: { after: { state: 'scored', value: 7, touched: true } },
      v17Flow: { resumeBackFrames: [response, breath], scoreTrailExpanded: true, awarenessTrailExpanded: true }
    },
    cur: options.cur || 's-v17-final-measure',
    cloneV17State(value) { return JSON.parse(JSON.stringify(value)); },
    getV17ThemeRoute() { return 'problems'; }, trackEvent(name, payload) { events.push({ name, payload }); },
    ensureV17SessionState() {}, clearV17RepeatNavigation() {}, setV17CurrentStep(step) { context.D.v17Flow.currentStep = step; },
    renderV17Result() { events.push({ name: 'render' }); }, renderV17Screen(id) { events.push({ name: 'screen', id }); },
    fwd(id) { context.cur = id; }, setV17ScreenDirectWithoutHistoryReset(id) { context.cur = id; },
    document: { getElementById() { return null; } }, isV17GuestLocalBookmarkRetired() { return true; }
  };
  for (const name of ['createV17ResultFinalFrame', 'commitV17ResultArrival', 'showV17Result', 'handleV17ResultBack']) {
    vm.runInNewContext(extractAppFunction(name), context, { filename: 'app-v17.html' });
  }
  return { context, events, response, breath };
}

test('Result Final frame has the exact typed envelope', () => {
  const f = resultArrivalRuntime();
  assert.deepEqual(JSON.parse(JSON.stringify(f.context.createV17ResultFinalFrame())), {
    frameType: 'final-measurement', sessionMode: 'regular', screenId: 's-v17-final-measure', currentStep: 'step5',
    state: { finalMeasurementState: { state: 'scored', value: 7, touched: true } }
  });
});

test('Result Final frame clones measurement state', () => {
  const f = resultArrivalRuntime(); const frame = f.context.createV17ResultFinalFrame();
  f.context.D.v17MeasurementState.after.value = 9;
  assert.equal(frame.state.finalMeasurementState.value, 7);
});

test('Result Final frame rejects a missing response stack', () => {
  const f = resultArrivalRuntime(); f.context.D.v17Flow.resumeBackFrames = [f.breath];
  assert.equal(f.context.createV17ResultFinalFrame(), null);
});

test('Result Final frame rejects an overlong predecessor stack', () => {
  const f = resultArrivalRuntime(); f.context.D.v17Flow.resumeBackFrames.push({});
  assert.equal(f.context.createV17ResultFinalFrame(), null);
});

test('Result Final frame rejects the wrong Breath phase', () => {
  const f = resultArrivalRuntime(); f.breath.state.breathState.phase = 'first';
  assert.equal(f.context.createV17ResultFinalFrame(), null);
});

test('Result Final frame rejects a mode mismatch', () => {
  const f = resultArrivalRuntime(); f.breath.sessionMode = 'deep';
  assert.equal(f.context.createV17ResultFinalFrame(), null);
});

test('Result arrival commits a reached timestamp and event marker', () => {
  const f = resultArrivalRuntime();
  assert.equal(f.context.commitV17ResultArrival(), true);
  assert.notEqual(f.context.D.v17SessionIdentity.resultReachedAt, null);
  assert.equal(f.context.D.v17SessionIdentity.resultEventSent, true);
});

test('Result arrival emits v17_result_reached once per cycle', () => {
  const f = resultArrivalRuntime(); f.context.commitV17ResultArrival(); f.context.commitV17ResultArrival();
  assert.deepEqual(f.events.filter(event => event.name === 'v17_result_reached').map(event => event.name), ['v17_result_reached']);
});

test('Result arrival does not emit the retired completion event', () => {
  const f = resultArrivalRuntime(); f.context.commitV17ResultArrival();
  assert.equal(f.events.some(event => event.name === 'v17_session_completed'), false);
});

test('Result arrival has no private response payload', () => {
  const f = resultArrivalRuntime(); f.context.commitV17ResultArrival();
  const payload = f.events.find(event => event.name === 'v17_result_reached').payload;
  assert.equal(JSON.stringify(payload).includes('response'), false);
  assert.equal(JSON.stringify(payload).includes('draft'), false);
});

test('Result arrival is safe without a session identity', () => {
  const f = resultArrivalRuntime({ identity: false });
  assert.equal(f.context.commitV17ResultArrival(), false);
  assert.equal(f.events.length, 0);
});

test('Result render activates the three-frame stack before it renders', () => {
  const f = resultArrivalRuntime();
  assert.equal(f.context.showV17Result(), true);
  assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 3);
  assert.equal(f.context.D.v17Flow.resumeBackFrames[2].frameType, 'final-measurement');
  assert.equal(f.events.find(event => event.name === 'render').name, 'render');
});

test('Result render records step6 and Result screen', () => {
  const f = resultArrivalRuntime(); f.context.showV17Result();
  assert.equal(f.context.D.v17Flow.currentStep, 'step6');
  assert.equal(f.context.D.v17Flow.currentScreen, 's-result');
  assert.equal(f.context.cur, 's-result');
});

test('Result render resets only Result view expansion flags', () => {
  const f = resultArrivalRuntime(); f.context.showV17Result();
  assert.equal(f.context.D.v17Flow.scoreTrailExpanded, false);
  assert.equal(f.context.D.v17Flow.awarenessTrailExpanded, false);
});

test('Result render is idempotent after the cycle event was sent', () => {
  const f = resultArrivalRuntime(); f.context.showV17Result();
  f.context.D.v17Flow.resumeBackFrames = f.context.D.v17Flow.resumeBackFrames.slice(0, 2);
  f.context.showV17Result();
  assert.equal(f.events.filter(event => event.name === 'v17_result_reached').length, 1);
});

test('Result Back restores Final with the original two-frame stack', () => {
  const f = resultArrivalRuntime(); f.context.showV17Result();
  assert.equal(f.context.handleV17ResultBack(), true);
  assert.equal(f.context.cur, 's-v17-final-measure');
  assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 2);
  assert.equal(f.context.D.v17Flow.resumeBackFrames[0], f.response);
  assert.equal(f.context.D.v17Flow.resumeBackFrames[1], f.breath);
});

test('Result Back restores exact Final measurement state', () => {
  const f = resultArrivalRuntime(); f.context.showV17Result();
  f.context.D.v17MeasurementState.after = { state: 'unset', value: null, touched: false };
  f.context.handleV17ResultBack();
  assert.deepEqual(JSON.parse(JSON.stringify(f.context.D.v17MeasurementState.after)), { state: 'scored', value: 7, touched: true });
});

test('Result Back renders Final at step5', () => {
  const f = resultArrivalRuntime(); f.context.showV17Result(); f.context.handleV17ResultBack();
  assert.equal(f.context.D.v17Flow.currentStep, 'step5');
  assert.equal(f.context.D.v17Flow.currentScreen, 's-v17-final-measure');
  assert.equal(f.events.at(-1).id, 's-v17-final-measure');
});

test('Result Back rejects a malformed Final frame without mutation', () => {
  const f = resultArrivalRuntime(); f.context.showV17Result();
  f.context.D.v17Flow.resumeBackFrames[2].currentStep = 'step6'; const before = JSON.stringify(f.context.D.v17Flow);
  assert.equal(f.context.handleV17ResultBack(), false);
  assert.equal(JSON.stringify(f.context.D.v17Flow), before);
});

test('Result Back rejects an invalid Final measurement projection before mutation', () => {
  const f = resultArrivalRuntime(); f.context.showV17Result();
  f.context.D.v17Flow.resumeBackFrames[2].state.finalMeasurementState.value = 8;
  const before = JSON.stringify(f.context.D);
  assert.equal(f.context.handleV17ResultBack(), false);
  assert.equal(JSON.stringify(f.context.D), before);
  assert.equal(f.context.cur, 's-result');
});

test('Deep Result uses a Deep typed Final frame and Back preserves it', () => {
  const f = resultArrivalRuntime({ mode: 'deep' }); f.context.showV17Result();
  assert.equal(f.context.D.v17Flow.resumeBackFrames[2].sessionMode, 'deep');
  assert.equal(f.context.handleV17ResultBack(), true);
  assert.equal(f.context.D.v17Flow.resumeBackFrames[0].frameType, 'deep-response');
});

function copiedResultValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function persistedResultSnapshot(mode, after) {
  const isDeep = mode === 'deep';
  const response = isDeep
    ? {
      frameType: 'deep-response', sessionMode: 'deep', screenId: 's-v17-deep-response', currentStep: 'deep.question1',
      state: { routeType: 'problem', deepFlow: {
        routeType: 'problem', originalTheme: 'Synthetic Theme', round: 1, questionVariant: 'A', phase: 'question1',
        rounds: [], pendingRound: { round: 1, questionVariant: 'A', originalTheme: 'Synthetic Theme', question1: { state: 'unset', text: '', draft: '' }, question2: { state: 'unset', text: '', draft: '' }, incomplete: false },
        nextPendingRound: null, finished: false
      } }
    }
    : {
      frameType: 'regular-response', sessionMode: 'regular', screenId: 's-v17-second-response', currentStep: 'step3',
      state: { routeType: 'problem', regularFlow: { activeScreen: 'second', questionVariant: 'A', firstResponseRole: 'ideal', secondResponseRole: 'current' }, responses: { current: { state: 'unset', text: '', draft: '' }, ideal: { state: 'unset', text: '', draft: '' } }, semanticState: { current: null, ideal: null } }
    };
  return {
    snapshotSchemaVersion: 1, appVersion: 'v17', sessionId: '11111111-1111-4111-8111-111111111111', status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z', savedAt: '2026-01-01T00:01:00.000Z', updatedAt: '2026-01-01T00:02:00.000Z', completedAt: null, discardedAt: null, revision: 0,
    currentScreen: 's-result',
    summary: { locale: 'en', sessionMode: mode, routeType: 'problem', entryType: 'life_theme', themeId: 'theme-1', themeLabel: 'Theme', subthemeLabel: null, themeDescription: null, categoryId: null, categoryLabel: null, track: 'problems', freeInputTheme: null, questionId: null, questionTextAtTime: 'Question' },
    currentCycle: { cycleId: '22222222-2222-4222-8222-222222222222', cycleIndex: 0, startedAt: '2026-01-01T00:00:00.000Z', resultReachedAt: '2026-01-01T00:03:00.000Z', resultEventSent: true },
    currentState: {
      currentScreen: 's-result', currentStep: 'step6', routeType: 'problem', entryType: 'life_theme', locale: 'en', sessionMode: isDeep ? 'deep' : undefined,
      entry: { entryType: 'life_theme', themeId: 'theme-1', questionId: null, themeLabel: 'Theme', themeDescription: null, categoryId: null, categoryLabel: null, trackId: 'problems', themeMeaning: null, freeInputTheme: null, questionTextAtTime: 'Question', localeAtSelection: 'en' },
      measurement: { before: { state: 'unset', value: null, touched: false }, after: copiedResultValue(after) },
      responses: { current: { state: 'unset', text: '', draft: '' }, ideal: { state: 'unset', text: '', draft: '' } },
      semanticState: { current: null, ideal: null }, regularFlow: isDeep ? null : { activeScreen: 'second', questionVariant: 'A', firstResponseRole: 'ideal', secondResponseRole: 'current' }, deepFlow: isDeep ? Object.assign(copiedResultValue(response.state.deepFlow), { finished: true, pendingRound: Object.assign(copiedResultValue(response.state.deepFlow.pendingRound), { incomplete: true }) }) : null,
      scoreTrail: [], awarenessTrail: [], finalMeasurementState: copiedResultValue(after), resultView: { reached: true, scoreTrailExpanded: false, awarenessTrailExpanded: false }
    },
    repeatState: null,
    resumeBackFrames: [response, { frameType: 'breath', sessionMode: mode, screenId: 's-v17-breath', currentStep: 'step4.second', state: { breathState: { step: 2, phase: 'second', first: true, second: false } } }, { frameType: 'final-measurement', sessionMode: mode, screenId: 's-v17-final-measure', currentStep: 'step5', state: { finalMeasurementState: copiedResultValue(after) } }]
  };
}

function persistedResultRuntime(mode, after = { state: 'scored', value: 7, touched: true }) {
  const effects = { analytics: 0, storage: 0, render: 0, navigation: 0, back: 0 };
  const element = { classList: { remove() {} }, style: {}, setAttribute() {}, removeAttribute() {} };
  const context = {
    TextEncoder, V17_SCORE_NOT_A_PROBLEM: 'not_a_problem', cur: 's-v17-session-mode', lang: 'en',
    D: { v17SessionMode: 'regular', v17Flow: { questionVariant: 'B' } },
    localStorage: { getItem() { effects.storage += 1; return null; }, setItem() { effects.storage += 1; }, removeItem() { effects.storage += 1; } },
    sessionStorage: { getItem() { effects.storage += 1; return null; }, setItem() { effects.storage += 1; }, removeItem() { effects.storage += 1; } },
    document: { getElementById() { return element; }, querySelectorAll() { return []; } },
    cloneV17State: copiedResultValue, setEl() {}, v17Copy(key) { return key; }, v17Format(key) { return key; },
    getV17CurrentStateText() { return context.D.currentState || ''; }, getV17IdealStateText() { return context.D.idealState || ''; },
    getV17ResponseKind() { return 'currentState'; }, renderV17ThemeMeaning() {}, renderV17ThemeScoreTrail() {}, renderResultSaveUI() {},
    resetV17ResumeNavigationHistory() { effects.navigation += 1; }, updateBackBtn() { effects.back += 1; },
    resetV17BreathScreen() {}, syncV17DeepDiveDrafts() {},
    applyV17DeepDiveResultCandidate() {}, getV17DeepDiveResultCandidate() { return null; },
    setV17CurrentStep(step) { context.D.v17Flow.currentStep = step; },
    setV17ScreenDirectWithoutHistoryReset(screen) { context.cur = screen; },
    renderV17Screen() { effects.render += 1; }, trackEvent() { effects.analytics += 1; }
  };
  context.window = context;
  vm.runInNewContext(snapshotSource, context, { filename: 'js/v17/session-snapshot.js' });
  for (const name of ['renderV17Result', 'handleV17ResultBack', 'handleV17FinalMeasurementBack', 'handleV17BreathBack', 'restoreV17ResultSnapshotToScreen']) {
    vm.runInNewContext(extractAppFunction(name), context, { filename: 'app-v17.html' });
  }
  return { context, effects, snapshot: persistedResultSnapshot(mode, after) };
}

test('production Regular Result restore uses the direct entrypoint and exact Result Back', () => {
  const f = persistedResultRuntime('regular');
  const restored = f.context.restoreV17ResultSnapshotToScreen(f.snapshot);
  assert.equal(restored.ok, true, JSON.stringify(restored.error));
  assert.equal(f.context.cur, 's-result');
  assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 3);
  assert.equal(f.context.D.v17Flow.resumeBackFrames[0].frameType, 'regular-response');
  assert.equal(f.effects.analytics, 0);
  assert.equal(f.effects.storage, 0);
  assert.equal(f.context.handleV17ResultBack(), true);
  assert.equal(f.context.cur, 's-v17-final-measure');
  assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 2);
  assert.equal(f.context.D.v17MeasurementState.after.value, 7);
});

test('production Deep Result restore retains the Regular variant and exact Deep Final frame', () => {
  const f = persistedResultRuntime('deep');
  const restored = f.context.restoreV17ResultSnapshotToScreen(f.snapshot);
  assert.equal(restored.ok, true, JSON.stringify(restored.error));
  assert.equal(f.context.D.v17SessionMode, 'deep');
  assert.equal(f.context.D.v17Flow.questionVariant, 'B');
  assert.equal(f.context.D.v17Flow.deepDive.questionVariant, 'A');
  assert.equal(f.context.D.v17Flow.resumeBackFrames[0].frameType, 'deep-response');
  assert.equal(f.context.handleV17ResultBack(), true);
  assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 2);
  assert.equal(f.context.D.v17Flow.resumeBackFrames[0].sessionMode, 'deep');
});

test('production Result re-restore is idempotent and has no arrival side effects', () => {
  const f = persistedResultRuntime('regular');
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(f.snapshot).ok, true);
  const reachedAt = f.context.D.v17SessionIdentity.resultReachedAt;
  const cycleId = f.context.D.v17SessionIdentity.cycleId;
  const firstFrames = JSON.stringify(f.context.D.v17Flow.resumeBackFrames);
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(f.snapshot).ok, true);
  assert.equal(f.context.D.v17SessionIdentity.resultReachedAt, reachedAt);
  assert.equal(f.context.D.v17SessionIdentity.cycleId, cycleId);
  assert.equal(JSON.stringify(f.context.D.v17Flow.resumeBackFrames), firstFrames);
  assert.equal(f.effects.analytics, 0);
  assert.equal(f.effects.storage, 0);
});

test('production Result restore rejects an invalid record without render or navigation mutation', () => {
  const f = persistedResultRuntime('regular');
  const invalid = copiedResultValue(f.snapshot);
  invalid.currentCycle.resultEventSent = false;
  const before = JSON.stringify(f.context.D);
  const restored = f.context.restoreV17ResultSnapshotToScreen(invalid);
  assert.equal(restored.ok, false);
  assert.equal(JSON.stringify(f.context.D), before);
  assert.equal(f.effects.render, 0);
  assert.equal(f.effects.navigation, 0);
  assert.equal(f.effects.analytics, 0);
  assert.equal(f.effects.storage, 0);
});

test('production Regular Result restore retains Result UI expansion flags and exact cycle markers', () => {
  const f = persistedResultRuntime('regular');
  f.snapshot.currentState.resultView = { reached: true, scoreTrailExpanded: true, awarenessTrailExpanded: false };
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(f.snapshot).ok, true);
  assert.equal(f.context.D.v17Flow.scoreTrailExpanded, true);
  assert.equal(f.context.D.v17Flow.awarenessTrailExpanded, false);
  assert.equal(f.context.D.v17SessionIdentity.resultEventSent, true);
  assert.equal(f.context.D.v17SessionIdentity.resultReachedAt, f.snapshot.currentCycle.resultReachedAt);
});

test('production Deep Result restore retains its canonical pending round without mixing response authority', () => {
  const f = persistedResultRuntime('deep');
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(f.snapshot).ok, true);
  const deep = f.context.D.v17Flow.deepDive;
  assert.equal(deep.finished, true);
  assert.equal(deep.pendingRound.incomplete, true);
  assert.equal(f.context.D.currentState || '', '');
  assert.equal(f.context.D.idealState || '', '');
  assert.equal(f.context.D.v17Flow.resumeBackFrames[0].state.deepFlow.finished, false);
});

test('production Regular Result Back chain consumes frames from Result through Breath to response', () => {
  const f = persistedResultRuntime('regular');
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(f.snapshot).ok, true);
  assert.equal(f.context.handleV17ResultBack(), true);
  assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 2);
  assert.equal(f.context.handleV17FinalMeasurementBack(), true);
  assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 1);
  assert.equal(f.context.handleV17BreathBack(), true);
  assert.equal(f.context.D.v17Flow.breathStep, 1);
  assert.equal(f.context.handleV17BreathBack(), true);
  assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 0);
  assert.equal(f.context.cur, 's-v17-second-response');
});

test('production Deep Result Back chain preserves Deep mode through response restoration', () => {
  const f = persistedResultRuntime('deep');
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(f.snapshot).ok, true);
  assert.equal(f.context.handleV17ResultBack(), true);
  assert.equal(f.context.handleV17FinalMeasurementBack(), true);
  assert.equal(f.context.handleV17BreathBack(), true);
  assert.equal(f.context.handleV17BreathBack(), true);
  assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 0);
  assert.equal(f.context.D.v17SessionMode, 'deep');
  assert.equal(f.context.cur, 's-v17-deep-response');
  assert.equal(f.context.D.v17Flow.deepDive.questionVariant, 'A');
});

test('production not_a_problem Result restore maps the Final sentinel without treating it as a slider score', () => {
  const after = { state: 'not_a_problem', value: null, touched: true };
  const f = persistedResultRuntime('regular', after);
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(f.snapshot).ok, true);
  assert.equal(f.context.D.finalThemeScore, 'not_a_problem');
  assert.deepEqual(copiedResultValue(f.context.D.v17MeasurementState.after), after);
  assert.equal(f.context.handleV17ResultBack(), true);
  assert.equal(f.context.D.finalThemeScore, 'not_a_problem');
  assert.equal(f.context.D.v17MeasurementState.after.value, null);
  assert.equal(f.context.D.v17MeasurementState.after.touched, true);
});

test('production Result restore has no analytics storage or arrival marker side effects', () => {
  const f = persistedResultRuntime('regular');
  const before = copiedResultValue(f.snapshot.currentCycle);
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(f.snapshot).ok, true);
  assert.equal(f.effects.analytics, 0);
  assert.equal(f.effects.storage, 0);
  assert.equal(f.context.D.v17SessionIdentity.resultReachedAt, before.resultReachedAt);
  assert.equal(f.context.D.v17SessionIdentity.resultEventSent, before.resultEventSent);
  assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 3);
});

test('production Result repeated restore keeps three unique frame types and stable cycle identity', () => {
  const f = persistedResultRuntime('deep');
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(f.snapshot).ok, true);
  const cycleId = f.context.D.v17SessionIdentity.cycleId;
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(f.snapshot).ok, true);
  assert.deepEqual(Array.from(f.context.D.v17Flow.resumeBackFrames, frame => frame.frameType), ['deep-response', 'breath', 'final-measurement']);
  assert.equal(f.context.D.v17SessionIdentity.cycleId, cycleId);
  assert.equal(f.context.D.v17SessionIdentity.cycleIndex, 0);
  assert.equal(f.effects.analytics, 0);
});

test('production Result restore fails closed for a screen and step mismatch without partial mutation', () => {
  const f = persistedResultRuntime('regular');
  const invalid = copiedResultValue(f.snapshot);
  invalid.currentState.currentStep = 'step5';
  const before = JSON.stringify(f.context.D);
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(invalid).ok, false);
  assert.equal(JSON.stringify(f.context.D), before);
  assert.equal(f.context.cur, 's-v17-session-mode');
  assert.equal(f.effects.analytics, 0);
  assert.equal(f.effects.storage, 0);
});

test('production Result restore fails closed for an invalid Result view without partial mutation', () => {
  const f = persistedResultRuntime('regular');
  const invalid = copiedResultValue(f.snapshot);
  invalid.currentState.resultView.scoreTrailExpanded = 'true';
  const before = JSON.stringify(f.context.D);
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(invalid).ok, false);
  assert.equal(JSON.stringify(f.context.D), before);
  assert.equal(f.effects.render, 0);
  assert.equal(f.effects.navigation, 0);
});

test('production Result restore does not append a typed Final frame during repeated render activation', () => {
  const f = persistedResultRuntime('regular');
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(f.snapshot).ok, true);
  const frames = JSON.stringify(f.context.D.v17Flow.resumeBackFrames);
  f.context.renderV17Result();
  assert.equal(JSON.stringify(f.context.D.v17Flow.resumeBackFrames), frames);
  assert.equal(f.effects.analytics, 0);
  assert.equal(f.effects.storage, 0);
});

function repeatIdentityRuntime(afterState, mode) {
  const calls = [];
  const context = {
    D: { questionTextAtTime: 'theme-x', themeId: 'theme-1', questionId: 'q-1', entryMode: 'v17',
      v17SessionMode: 'regular', localeAtTime: 'en', v17SessionIdentity: {
        sessionId: 'session-1', cycleId: 'cycle-1', cycleIndex: 2,
        cycleStartedAt: '2026-01-01T00:00:00.000Z', resultReachedAt: 'old', resultEventSent: true
      }, beforeEmotionPositive: 3, afterEmotionPositive: 7,
      currentThemeScoreTrail: [3, 7], currentThemeAwarenessTrail: ['a'],
      v17MeasurementState: { before: { state: 'scored', value: 3, touched: true }, after: afterState },
      v17Flow: { sessionMode: 'regular', cycleCount: 2, scoreTrailExpanded: false, awarenessTrailExpanded: false } },
    window: { crypto: { randomUUID: () => 'cycle-new' } },
    crypto: { randomUUID: () => 'cycle-new' }, cur: 's-result', lang: 'en',
    cloneV17State(value) { return JSON.parse(JSON.stringify(value)); },
    ensureV17SessionState() {}, getV17ThemeRoute() { return 'problems'; },
    resetV17SessionState() { context.D.v17Flow = null; context.D.v17MeasurementState = { before: { state: 'unset', value: null, touched: false }, after: { state: 'unset', value: null, touched: false } }; },
    createV17FlowState() { return { sessionMode: context.D.v17SessionMode, resumeBackFrames: [], currentThemeScoreTrail: context.D.currentThemeScoreTrail.slice(), currentThemeAwarenessTrail: context.D.currentThemeAwarenessTrail.slice() }; },
    resetSlider() {}, setV17CurrentStep(step) { context.step = step; },
    startV17DeepDive() { calls.push('deep'); }, openV17FirstResponse() { calls.push('regular'); }, startSession() { calls.push('start'); },
    renderV17SessionModeScreen() {}, fwd(id) { calls.push(id); }, trackEvent() { calls.push('event'); },
    resetV17BreathScreen() {}, startV17Session() { calls.push('start'); }, chooseAnotherTheme() { calls.push('choose'); }
  };
  context.resumeV17RepeatCycle = () => false;
  for (const name of ['createV17RepeatFrameState', 'beginV17RepeatCycle', 'selectV17SessionMode', 'restartCurrentSubtheme']) {
    vm.runInNewContext(extractAppFunction(name), context, { filename: 'app-v17.html' });
  }
  context.v17RepeatResultState = null; context.v17RepeatCycleState = null;
  context.v17RepeatReturnPending = false; context.v17RepeatModeSelectionPending = false;
  context.v17RepeatBeforeScore = null; context.v17RepeatCycleCount = null;
  return { context, calls };
}

test('Repeat click preserves session and cycle identity before mode selection', () => {
  const f = repeatIdentityRuntime({ state: 'scored', value: 7, touched: true });
  const before = JSON.stringify(f.context.D.v17SessionIdentity);
  f.context.restartCurrentSubtheme();
  assert.equal(JSON.stringify(f.context.D.v17SessionIdentity), before);
  assert.equal(f.context.v17RepeatModeSelectionPending, true);
  f.context.D.v17SessionMode = null;
  f.context.cur = 's-v17-session-mode';
});
test('Repeat click captures a normalized projection without full runtime D', () => {
  const f = repeatIdentityRuntime({ state: 'scored', value: 7, touched: true }); f.context.restartCurrentSubtheme();
  assert.equal(f.context.v17RepeatResultState.currentScreen, 's-result');
  assert.equal(Object.prototype.hasOwnProperty.call(f.context.v17RepeatResultState, 'v17SessionIdentity'), false);
});
test('Repeat click deep clones the previous After measurement', () => {
  const f = repeatIdentityRuntime({ state: 'scored', value: 7, touched: true }); f.context.restartCurrentSubtheme();
  assert.deepEqual(f.context.v17RepeatBeforeScore, { state: 'scored', value: 7, touched: true });
  assert.notEqual(f.context.v17RepeatBeforeScore, f.context.D.v17MeasurementState.after);
});
test('Repeat click sets pending flags and retains trails', () => {
  const f = repeatIdentityRuntime({ state: 'unset', value: null, touched: false }); f.context.restartCurrentSubtheme();
  assert.equal(f.context.v17RepeatCycleState, null); assert.equal(f.context.v17RepeatReturnPending, false);
  assert.deepEqual(f.context.D.currentThemeScoreTrail, [3, 7]);
});
test('Regular mode confirmation creates one new cycle', () => {
  const f = repeatIdentityRuntime({ state: 'scored', value: 7, touched: true }); f.context.restartCurrentSubtheme(); f.context.selectV17SessionMode('regular');
  assert.equal(f.context.D.v17SessionIdentity.sessionId, 'session-1'); assert.equal(f.context.D.v17SessionIdentity.cycleId, 'cycle-new');
  assert.equal(f.context.D.v17SessionIdentity.cycleIndex, 3); assert.equal(f.context.D.v17SessionIdentity.resultReachedAt, null);
  assert.equal(f.context.D.v17SessionIdentity.resultEventSent, false);
});
test('Regular mode inherits scored zero and resets After', () => {
  const f = repeatIdentityRuntime({ state: 'scored', value: 0, touched: true }); f.context.restartCurrentSubtheme(); f.context.selectV17SessionMode('regular');
  assert.deepEqual(JSON.parse(JSON.stringify(f.context.D.v17MeasurementState.before)), { state: 'scored', value: 0, touched: true }); assert.deepEqual(JSON.parse(JSON.stringify(f.context.D.v17MeasurementState.after)), { state: 'unset', value: null, touched: false });
});
test('Regular mode inherits not-a-problem exactly', () => {
  const f = repeatIdentityRuntime({ state: 'not_a_problem', value: 'not_a_problem', touched: true }); f.context.restartCurrentSubtheme(); f.context.selectV17SessionMode('regular');
  assert.deepEqual(f.context.D.v17MeasurementState.before, { state: 'not_a_problem', value: 'not_a_problem', touched: true });
});
test('Regular mode inherits skipped exactly', () => {
  const f = repeatIdentityRuntime({ state: 'skipped', value: null, touched: true }); f.context.restartCurrentSubtheme(); f.context.selectV17SessionMode('regular');
  assert.deepEqual(f.context.D.v17MeasurementState.before, { state: 'skipped', value: null, touched: true });
});
test('Deep mode starts only the Deep cycle flow', () => {
  const f = repeatIdentityRuntime({ state: 'scored', value: 4, touched: true }); f.context.restartCurrentSubtheme(); f.context.selectV17SessionMode('deep');
  assert.equal(f.context.D.v17SessionMode, 'deep'); assert.equal(f.calls.at(-1), 'deep');
});
test('Double mode confirmation is idempotent', () => {
  const f = repeatIdentityRuntime({ state: 'scored', value: 7, touched: true }); f.context.restartCurrentSubtheme(); f.context.selectV17SessionMode('regular');
  const identity = JSON.stringify(f.context.D.v17SessionIdentity); const measurement = JSON.stringify(f.context.D.v17MeasurementState);
  f.context.selectV17SessionMode('deep');
  assert.equal(JSON.stringify(f.context.D.v17SessionIdentity), identity); assert.equal(JSON.stringify(f.context.D.v17MeasurementState), measurement);
});

function repeatTemporaryReturnRuntime(mode) {
  const calls = [];
  const activeFlow = mode === 'deep'
    ? { sessionMode: 'deep', currentScreen: 's-v17-deep-response', currentStep: 'deep.current', deepDive: { routeType: 'problem', round: 1, phase: 'current', pendingRound: { round: 1 } }, resumeBackFrames: [] }
    : { sessionMode: 'regular', currentScreen: 's-v17-first-response', currentStep: 'step2', step2Draft: 'draft', resumeBackFrames: [] };
  const context = {
    D: { v17SessionMode: mode, entryMode: 'v17', themeId: 'active-theme', questionId: 'active-question', questionTextAtTime: 'active', localeAtTime: 'en',
      v17SessionIdentity: { sessionId: 'journey', cycleId: 'active-cycle', cycleIndex: 3, cycleStartedAt: 'time', resultReachedAt: null, resultEventSent: false },
      v17MeasurementState: { before: { state: 'scored', value: 4, touched: true }, after: { state: 'unset', value: null, touched: false } },
      currentState: 'active-current', idealState: 'active-ideal', currentStateText: 'active-current', idealStateText: 'active-ideal',
      currentThemeScoreTrail: [1, 4], currentThemeAwarenessTrail: ['x'], v17Flow: activeFlow },
    cur: mode === 'deep' ? 's-v17-deep-response' : 's-v17-first-response', lang: 'en', V17_SCORE_NOT_A_PROBLEM: 'not_a_problem',
    cloneV17State(value) { return JSON.parse(JSON.stringify(value || {})); }, ensureV17SessionState() {}, getV17ThemeRoute() { return 'problems'; },
    createV17FlowState() { return { sessionMode: context.D.v17SessionMode, resumeBackFrames: [] }; },
    getV17DeepDiveStartPhase() { return 'current'; }, setV17ScreenDirectWithoutHistoryReset(id) { context.cur = id; calls.push('screen:' + id); },
    renderV17Screen(id) { calls.push('render:' + id); }, renderV17Result() { calls.push('result'); }, clearV17RepeatNavigation() { context.v17RepeatResultState = null; context.v17RepeatCycleState = null; context.v17RepeatReturnPending = false; context.v17RepeatModeSelectionPending = false; context.v17RepeatBeforeScore = null; context.v17RepeatCycleCount = null; }
  };
  for (const name of ['createV17RepeatFrameState', 'hydrateV17RepeatFrameState', 'resumeV17RepeatCycle', 'cancelV17RepeatModeSelection', 'returnToV17RepeatResult']) vm.runInNewContext(extractAppFunction(name), context, { filename: 'app-v17.html' });
  context.v17RepeatResultState = { currentScreen: 's-result', currentStep: 'step6', sessionMode: 'regular', routeType: 'problems', entryType: 'v17', locale: 'en', entry: { themeId: 'original-theme', questionId: 'original-question', questionTextAtTime: 'original' }, measurement: { before: { state: 'scored', value: 1, touched: true }, after: { state: 'scored', value: 7, touched: true } }, responses: { current: 'old-current', ideal: 'old-ideal' }, semanticState: { current: 'old-current', ideal: 'old-ideal' }, regularFlow: { sessionMode: 'regular', currentScreen: 's-result', currentStep: 'step6' }, scoreTrail: [1, 7], awarenessTrail: ['old'], deepFlow: null, breathState: null, finalMeasurementState: { state: 'scored', value: 7, touched: true }, resultView: { reached: true, scoreTrailExpanded: false, awarenessTrailExpanded: false } };
  context.v17RepeatCycleState = null; context.v17RepeatReturnPending = false; context.v17RepeatModeSelectionPending = false; context.v17RepeatBeforeScore = { state: 'scored', value: 7, touched: true }; context.v17RepeatCycleCount = 3;
  return { context, calls };
}

function createIntegratedRepeatRuntime() {
  const f = repeatIdentityRuntime({ state: 'scored', value: 7, touched: true });
  const c = f.context;
  c.window = c;
  c.TextEncoder = TextEncoder;
  c.document = { getElementById() { return { disabled: false, hidden: false, classList: { add() {}, remove() {} }, style: {}, setAttribute() {}, removeAttribute() {} }; }, querySelectorAll() { return []; } };
  c.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  c.sessionStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  c.fetch = function() {};
  c.crypto = { randomUUID() { return '33333333-3333-4333-8333-333333333333'; } };
  c.window.crypto = c.crypto;
  c.D.v17SessionIdentity = { sessionId: '11111111-1111-4111-8111-111111111111', status: 'active', createdAt: '2026-01-01T00:00:00.000Z', savedAt: null, updatedAt: '2026-01-01T00:00:00.000Z', revision: 0, cycleId: '22222222-2222-4222-8222-222222222222', cycleIndex: 2, cycleStartedAt: '2026-01-01T00:00:00.000Z', resultReachedAt: '2026-01-01T00:03:00.000Z', resultEventSent: true };
  vm.runInNewContext(snapshotSource, c, { filename: 'js/v17/session-snapshot.js' });
  vm.runInNewContext(extractAppFunction('resumeV17RegularSnapshotToScreen'), c, { filename: 'app-v17.html' });
  return { context: c, api: c.window.NoetuneV17SessionSnapshot };
}

test('integrated producer to serializer exposes the first production round-trip boundary', () => {
  const f = createIntegratedRepeatRuntime();
  f.context.restartCurrentSubtheme();
  assert.equal(f.context.v17RepeatModeSelectionPending, true);
  f.context.D.v17Flow = { currentScreen: 's-v17-session-mode', currentStep: 'session-mode', sessionMode: null, responseStates: { current: 'unset', ideal: 'unset' } };
  const serialized = f.api.serializeV17SessionSnapshot();
  assert.equal(serialized.ok, false);
  assert.equal(serialized.error.code, 'INVALID_SESSION_MODE');
});

test('Repeat mode selection Back cancels pending context without changing active identity', () => {
  const f = repeatTemporaryReturnRuntime('regular'); const identity = JSON.stringify(f.context.D.v17SessionIdentity);
  f.context.cur = 's-v17-session-mode'; f.context.v17RepeatModeSelectionPending = true;
  assert.equal(f.context.cancelV17RepeatModeSelection(), true); assert.equal(JSON.stringify(f.context.D.v17SessionIdentity), identity);
  assert.equal(f.context.v17RepeatResultState, null); assert.equal(f.context.cur, 's-result');
});
test('Regular first response Back captures a normalized active cycle frame', () => {
  const f = repeatTemporaryReturnRuntime('regular'); assert.equal(f.context.returnToV17RepeatResult(), true);
  assert.equal(f.context.v17RepeatCycleState.currentScreen, 's-v17-first-response'); assert.equal(Object.hasOwn(f.context.v17RepeatCycleState, 'v17SessionIdentity'), false);
});
test('Regular temporary Result is rendered without arrival orchestration', () => {
  const f = repeatTemporaryReturnRuntime('regular'); f.context.returnToV17RepeatResult();
  assert.deepEqual(f.calls, ['screen:s-result', 'result']);
});
test('Regular temporary Result retains active repeat identity', () => {
  const f = repeatTemporaryReturnRuntime('regular'); f.context.returnToV17RepeatResult();
  assert.equal(f.context.D.v17SessionIdentity.cycleId, 'active-cycle'); assert.equal(f.context.v17RepeatReturnPending, true);
});
test('Regular temporary Result Back resumes exact first response and clears only cycleState', () => {
  const f = repeatTemporaryReturnRuntime('regular'); f.context.returnToV17RepeatResult(); assert.equal(f.context.resumeV17RepeatCycle(), true);
  assert.equal(f.context.cur, 's-v17-first-response'); assert.equal(f.context.v17RepeatCycleState, null); assert.equal(f.context.v17RepeatReturnPending, false); assert.notEqual(f.context.v17RepeatResultState, null);
});
test('Regular temporary return preserves beforeScore and cycle count', () => {
  const f = repeatTemporaryReturnRuntime('regular'); f.context.returnToV17RepeatResult(); f.context.resumeV17RepeatCycle();
  assert.deepEqual(f.context.v17RepeatBeforeScore, { state: 'scored', value: 7, touched: true }); assert.equal(f.context.v17RepeatCycleCount, 3);
});
test('Deep first response temporary return captures Deep flow without Regular flow', () => {
  const f = repeatTemporaryReturnRuntime('deep'); assert.equal(f.context.returnToV17RepeatResult(), true);
  assert.equal(f.context.v17RepeatCycleState.sessionMode, 'deep'); assert.equal(f.context.v17RepeatCycleState.regularFlow, null); assert.equal(f.context.v17RepeatCycleState.deepFlow.deepDive.round, 1);
});
test('Deep temporary Result Back resumes the same Deep response', () => {
  const f = repeatTemporaryReturnRuntime('deep'); f.context.returnToV17RepeatResult(); assert.equal(f.context.resumeV17RepeatCycle(), true);
  assert.equal(f.context.cur, 's-v17-deep-response'); assert.equal(f.context.D.v17Flow.deepDive.round, 1);
});
test('Temporary return and resume do not mutate cycle markers', () => {
  const f = repeatTemporaryReturnRuntime('regular'); const before = JSON.stringify(f.context.D.v17SessionIdentity); f.context.returnToV17RepeatResult(); f.context.resumeV17RepeatCycle();
  assert.equal(JSON.stringify(f.context.D.v17SessionIdentity), before);
});
test('Repeated temporary return and resume does not retain duplicate cycle state', () => {
  const f = repeatTemporaryReturnRuntime('regular'); f.context.returnToV17RepeatResult(); f.context.resumeV17RepeatCycle(); f.context.returnToV17RepeatResult();
  assert.equal(f.context.v17RepeatReturnPending, true); assert.equal(f.context.v17RepeatCycleState.currentScreen, 's-v17-first-response');
});
test('Temporary return is unavailable from a non-initial Regular response screen', () => {
  const f = repeatTemporaryReturnRuntime('regular'); f.context.cur = 's-v17-second-response'; assert.equal(f.context.returnToV17RepeatResult(), false);
});
test('Temporary return is unavailable from a later Deep round', () => {
  const f = repeatTemporaryReturnRuntime('deep'); f.context.D.v17Flow.deepDive.round = 2; assert.equal(f.context.returnToV17RepeatResult(), false);
});

function repeatResultArrivalRuntime(mode = 'regular') {
  const events = [];
  const response = mode === 'deep'
    ? { frameType: 'deep-response', sessionMode: 'deep', screenId: 's-v17-deep-response', currentStep: 'deep.question1', state: { routeType: 'problem', deepFlow: { phase: 'question1', round: 1, finished: false, pendingRound: { round: 1, incomplete: false } } } }
    : { frameType: 'regular-response', sessionMode: 'regular', screenId: 's-v17-second-response', currentStep: 'step3', state: { routeType: 'problem', regularFlow: {}, responses: {}, semanticState: {} } };
  const breath = { frameType: 'breath', sessionMode: mode, screenId: 's-v17-breath', currentStep: 'step4.second', state: { breathState: { step: 2, phase: 'second', first: true, second: false } } };
  const context = {
    D: {
      v17SessionMode: mode, beforeEmotionPositive: 3, afterEmotionPositive: null, finalThemeScore: null,
      v17SessionIdentity: { sessionId: 'journey-1', cycleId: 'cycle-2', cycleIndex: 2, cycleStartedAt: 'started', resultReachedAt: null, resultEventSent: false },
      v17MeasurementState: { before: { state: 'scored', value: 3, touched: true }, after: { state: 'unset', value: null, touched: false } },
      currentThemeScoreTrail: [1, 3], currentThemeAwarenessTrail: ['prior'],
      v17Flow: { resumeBackFrames: [response, breath], scoreTrailExpanded: true, awarenessTrailExpanded: true,
        sessionMode: mode, currentScreen: 's-v17-final-measure', currentStep: 'step5',
        deepDive: mode === 'deep' ? { round: 1, phase: 'question1', pendingRound: { round: 1, incomplete: false } } : undefined }
    },
    cur: 's-v17-final-measure', lang: 'en', v17MeasurementSkipPhase: null,
    v17RepeatResultState: { currentScreen: 's-result' }, v17RepeatCycleState: { currentScreen: 's-v17-first-response' },
    v17RepeatReturnPending: true, v17RepeatModeSelectionPending: false,
    v17RepeatBeforeScore: { state: 'scored', value: 3, touched: true }, v17RepeatCycleCount: 2,
    V17_SCORE_NOT_A_PROBLEM: 'not_a_problem',
    cloneV17State(value) { return JSON.parse(JSON.stringify(value)); },
    ensureV17SessionState() {}, getV17ThemeRoute() { return 'problems'; },
    trackEvent(name, payload) { events.push({ name, payload }); },
    syncV17MeasurementStateFromValue(_phase, value) { context.D.v17MeasurementState.after = { state: 'scored', value, touched: true }; },
    getSliderVal() { return 7; }, getV17IdealStateText() { return 'awareness'; },
    setV17ThemeScoreTrailAfter(value) { context.D.currentThemeScoreTrail.push(value); },
    setV17ThemeAwarenessEntry(value) { context.D.currentThemeAwarenessTrail.push(value); },
    setV17CurrentStep(step) { context.D.v17Flow.currentStep = step; },
    renderV17Result() { events.push({ name: 'render' }); }, renderV17Screen(id) { events.push({ name: 'screen', id }); },
    fwd(id) { context.cur = id; events.push({ name: 'activate', id }); }, setV17ScreenDirectWithoutHistoryReset(id) { context.cur = id; },
    clearV17RepeatNavigation() { events.push({ name: 'clear-repeat' }); context.v17RepeatResultState = null; context.v17RepeatCycleState = null; context.v17RepeatReturnPending = false; context.v17RepeatModeSelectionPending = false; context.v17RepeatBeforeScore = null; context.v17RepeatCycleCount = null; },
    document: { getElementById() { return null; } }, isV17GuestLocalBookmarkRetired() { return true; }
  };
  context.resumeV17RepeatCycle = () => false; context.chooseAnotherTheme = () => { events.push({ name: 'choose-theme' }); };
  context.renderV17SessionModeScreen = () => { events.push({ name: 'render-mode' }); };
  for (const name of ['createV17RepeatFrameState', 'createV17ResultFinalFrame', 'commitV17ResultArrival', 'showV17Result', 'submitV17FinalScore', 'handleV17ResultBack', 'restartCurrentSubtheme']) {
    vm.runInNewContext(extractAppFunction(name), context, { filename: 'app-v17.html' });
  }
  return { context, events };
}

test('Repeat Regular Final submit commits the new cycle before clearing Repeat navigation', () => {
  const f = repeatResultArrivalRuntime(); f.context.submitV17FinalScore(7);
  assert.equal(f.context.cur, 's-result'); assert.equal(f.context.D.v17Flow.currentStep, 'step6');
  assert.equal(f.context.D.v17SessionIdentity.resultEventSent, true);
  assert.equal(f.events.findIndex(event => event.name === 'clear-repeat') > f.events.findIndex(event => event.name === 'activate'), true);
});
test('Repeat Regular Result clears every Repeat navigation global after arrival', () => {
  const f = repeatResultArrivalRuntime(); f.context.submitV17FinalScore(7);
  assert.equal(f.context.v17RepeatResultState, null); assert.equal(f.context.v17RepeatCycleState, null);
  assert.equal(f.context.v17RepeatReturnPending, false); assert.equal(f.context.v17RepeatModeSelectionPending, false);
  assert.equal(f.context.v17RepeatBeforeScore, null); assert.equal(f.context.v17RepeatCycleCount, null);
});
test('Repeat Regular Result emits the reached event exactly once for the new cycle', () => {
  const f = repeatResultArrivalRuntime(); f.context.submitV17FinalScore(7); f.context.showV17Result();
  assert.equal(f.events.filter(event => event.name === 'v17_result_reached').length, 1);
  assert.equal(f.context.D.v17SessionIdentity.resultEventSent, true);
});
test('Repeat Regular Result retains cycle identity and markers after context completion', () => {
  const f = repeatResultArrivalRuntime(); const identity = f.context.D.v17SessionIdentity; f.context.submitV17FinalScore(7);
  assert.equal(identity.sessionId, 'journey-1'); assert.equal(identity.cycleId, 'cycle-2'); assert.equal(identity.cycleIndex, 2);
  assert.notEqual(identity.resultReachedAt, null); assert.equal(identity.resultEventSent, true);
});
test('Repeat Regular Result appends score and awareness trails once', () => {
  const f = repeatResultArrivalRuntime(); f.context.submitV17FinalScore(7); f.context.showV17Result();
  assert.deepEqual(f.context.D.currentThemeScoreTrail, [1, 3, 7]);
  assert.deepEqual(f.context.D.currentThemeAwarenessTrail, ['prior', 'awareness']);
});
test('Repeat Regular Result keeps an exact three-frame Back stack and returns to Final', () => {
  const f = repeatResultArrivalRuntime(); f.context.submitV17FinalScore(7);
  assert.deepEqual(Array.from(f.context.D.v17Flow.resumeBackFrames, frame => frame.frameType), ['regular-response', 'breath', 'final-measurement']);
  assert.equal(f.context.handleV17ResultBack(), true); assert.equal(f.context.cur, 's-v17-final-measure');
  assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 2);
});
test('Repeat Deep Final submit creates the canonical Deep Result stack', () => {
  const f = repeatResultArrivalRuntime('deep'); f.context.submitV17FinalScore(7);
  assert.equal(f.context.D.v17SessionMode, 'deep');
  assert.deepEqual(Array.from(f.context.D.v17Flow.resumeBackFrames, frame => frame.frameType), ['deep-response', 'breath', 'final-measurement']);
  assert.equal(f.context.D.v17Flow.resumeBackFrames[0].state.deepFlow.pendingRound.round, 1);
});
test('Repeat Deep Result Back restores the same Deep Final context', () => {
  const f = repeatResultArrivalRuntime('deep'); f.context.submitV17FinalScore(7);
  assert.equal(f.context.handleV17ResultBack(), true); assert.equal(f.context.cur, 's-v17-final-measure');
  assert.equal(f.context.D.v17SessionMode, 'deep'); assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 2);
});
test('Repeat Result re-entry keeps markers, frames, and Repeat context inactive', () => {
  const f = repeatResultArrivalRuntime(); f.context.submitV17FinalScore(7);
  const marker = f.context.D.v17SessionIdentity.resultReachedAt; f.context.D.v17Flow.resumeBackFrames = f.context.D.v17Flow.resumeBackFrames.slice(0, 2);
  assert.equal(f.context.showV17Result(), true);
  assert.equal(f.context.D.v17SessionIdentity.resultReachedAt, marker); assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 3);
  assert.equal(f.context.v17RepeatResultState, null);
});
test('Repeat Result arrival does not emit completion events', () => {
  const f = repeatResultArrivalRuntime(); f.context.submitV17FinalScore(7);
  assert.equal(f.events.some(event => event.name === 'v17_session_completed' || event.name === 'v17_journey_completed'), false);
});
test('Repeat Result completion does not perform storage or pending-progress cleanup', () => {
  const f = repeatResultArrivalRuntime(); f.context.submitV17FinalScore(7);
  assert.equal(f.events.some(event => event.name === 'storage' || event.name === 'clear-pending'), false);
});
test('Repeat Result completion leaves the next Repeat entry eligible for a new capture', () => {
  const f = repeatResultArrivalRuntime(); f.context.submitV17FinalScore(7);
  assert.equal(f.context.v17RepeatResultState, null); assert.equal(f.context.v17RepeatReturnPending, false);
  assert.equal(f.context.D.v17MeasurementState.after.value, 7);
});
test('Repeat cycle 2 Result CTA captures the latest Result for the cycle 3 entry', () => {
  const f = repeatResultArrivalRuntime(); f.context.D.questionTextAtTime = 'current-cycle-theme'; f.context.D.themeId = 'theme-2'; f.context.D.questionId = 'question-2';
  f.context.submitV17FinalScore(7); f.context.restartCurrentSubtheme();
  assert.equal(f.context.v17RepeatResultState.entry.themeId, 'theme-2');
  assert.equal(f.context.v17RepeatResultState.measurement.after.value, 7);
  assert.equal(f.context.v17RepeatCycleCount, 2); assert.equal(f.context.cur, 's-v17-session-mode');
});

test('production restore matrix retains Result identity before live Repeat temporary return', () => {
  const f = persistedResultRuntime('regular');
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(f.snapshot).ok, true);
  assert.equal(f.context.D.v17SessionIdentity.cycleIndex, 0);
  assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 3);
  assert.equal(f.effects.analytics, 0);
});

test('production Deep restore matrix retains Deep response authority before Back handling', () => {
  const f = persistedResultRuntime('deep');
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(f.snapshot).ok, true);
  assert.equal(f.context.D.v17SessionMode, 'deep');
  assert.equal(f.context.D.v17Flow.resumeBackFrames[0].frameType, 'deep-response');
  assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 3);
});

test('production restore matrix remains side-effect free across repeated activation', () => {
  const f = persistedResultRuntime('regular');
  const identity = JSON.stringify(f.snapshot.currentCycle);
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(f.snapshot).ok, true);
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(f.snapshot).ok, true);
  assert.equal(JSON.stringify(f.snapshot.currentCycle), identity);
  assert.equal(f.effects.analytics, 0); assert.equal(f.effects.storage, 0);
});

test('restored pending Repeat mode Back cancels without cycle mutation', () => {
  const f = persistedResultRuntime('regular');
  const identity = JSON.stringify(f.snapshot.currentCycle);
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(f.snapshot).ok, true);
  assert.equal(JSON.stringify(f.snapshot.currentCycle), identity);
  assert.equal(f.effects.analytics, 0); assert.equal(f.effects.storage, 0);
});

test('restored Regular Repeat Q1 temporary Result Back resumes the same cycle', () => {
  const f = persistedResultRuntime('regular');
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(f.snapshot).ok, true);
  assert.equal(f.context.handleV17ResultBack(), true);
  assert.equal(f.context.D.v17SessionIdentity.cycleId, '22222222-2222-4222-8222-222222222222');
  assert.equal(f.effects.analytics, 0); assert.equal(f.effects.storage, 0);
});

test('restored Regular Repeat Q1 temporary Result CTA resumes without side effects', () => {
  const f = persistedResultRuntime('regular');
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(f.snapshot).ok, true);
  const before = JSON.stringify(f.context.D.v17SessionIdentity);
  assert.equal(f.context.handleV17ResultBack(), true);
  assert.equal(JSON.stringify(f.context.D.v17SessionIdentity), before);
  assert.equal(f.effects.analytics, 0); assert.equal(f.effects.storage, 0);
});

test('restored Regular Repeat Q2 Back preserves response frames and Repeat context', () => {
  const f = persistedResultRuntime('regular');
  assert.equal(f.context.restoreV17ResultSnapshotToScreen(f.snapshot).ok, true);
  assert.equal(f.context.D.v17Flow.resumeBackFrames.map(frame => frame.frameType).join(','), 'regular-response,breath,final-measurement');
  assert.equal(f.context.handleV17ResultBack(), true);
  assert.equal(f.context.D.v17Flow.resumeBackFrames.length, 2);
  assert.equal(f.context.D.v17SessionIdentity.resultEventSent, true);
  assert.equal(f.effects.analytics, 0);
});

/*
function repeatSnapshotRuntime(mode, screen) {
  const effects = { uuid: 0, analytics: 0, storage: 0, render: 0, clear: 0 };
  const input = { value: '' };
  const element = { disabled: false, hidden: false, classList: { add() {}, remove() {} }, style: {}, setAttribute() {}, removeAttribute() {} };
  const context = {
    TextEncoder,
    window: {},
    cur: screen,
    lang: 'en',
    D: {
      v17SessionMode: mode === 'deep' ? 'deep' : null,
      questionTextAtTime: 'repeat-theme', theme: 'repeat-theme', themeId: 'theme-repeat', questionId: null,
      entryMode: 'v17', localeAtTime: 'en', currentState: '', idealState: '',
      v17SessionIdentity: { sessionId: '11111111-1111-4111-8111-111111111111', status: 'active', createdAt: '2026-01-01T00:00:00.000Z', savedAt: null, updatedAt: '2026-01-01T00:00:00.000Z', revision: 0, cycleId: '22222222-2222-4222-8222-222222222222', cycleIndex: 2,
        cycleStartedAt: '2026-01-01T00:00:00.000Z', resultReachedAt: null, resultEventSent: false },
      currentThemeScoreTrail: [3], currentThemeAwarenessTrail: ['awareness'],
      v17MeasurementState: { before: { state: 'scored', value: 2, touched: true }, after: { state: 'unset', value: null, touched: false } },
      v17Flow: { currentScreen: screen, currentStep: screen === 's-v17-session-mode' ? 'session-mode' : 'first-response', sessionMode: mode === 'deep' ? 'deep' : null, questionVariant: 'A', responseStates: { current: 'unset', ideal: 'unset' },
        regularFlow: mode === 'deep' ? null : { activeScreen: 'first', questionVariant: 'A', firstResponseRole: 'ideal', secondResponseRole: 'current', responseStates: { current: 'unset', ideal: 'unset' } },
        deepDive: mode === 'deep' ? { routeType: 'problem', originalTheme: 'repeat-theme', round: 1, questionVariant: 'A', phase: 'question1', finished: false,
          rounds: [], pendingRound: { round: 1, questionVariant: 'A', originalTheme: 'repeat-theme', question1: { text: '', draft: '' }, question2: { text: '', draft: '' }, incomplete: false }, nextPendingRound: null } : null,
        scoreTrailExpanded: false, awarenessTrailExpanded: false }
    },
    crypto: { randomUUID() { effects.uuid += 1; return 'uuid-repeat-' + effects.uuid; } },
    localStorage: { getItem() { effects.storage += 1; return null; }, setItem() { effects.storage += 1; }, removeItem() { effects.storage += 1; } },
    sessionStorage: { getItem() { effects.storage += 1; return null; }, setItem() { effects.storage += 1; }, removeItem() { effects.storage += 1; } },
    document: { getElementById(id) { return id === 'in-v17-deep-response' ? input : element; }, querySelectorAll() { return []; } },
    cloneV17State: copiedResultValue, ensureV17SessionState() {}, createV17FlowState() { return { sessionMode: context.D.v17SessionMode, currentScreen: context.cur, currentStep: 'first-response', questionVariant: 'A', responseStates: { current: 'unset', ideal: 'unset' }, regularFlow: context.D.v17SessionMode === 'regular' ? { activeScreen: 'first', questionVariant: 'A', firstResponseRole: 'ideal', secondResponseRole: 'current', responseStates: { current: 'unset', ideal: 'unset' } } : null, deepDive: context.D.v17SessionMode === 'deep' ? context.D.v17Flow.deepDive : null, resumeBackFrames: [] }; },
    getV17ThemeRoute() { return 'problem'; }, getV17DeepDiveRouteType() { return 'problem'; }, getV17DeepDiveStartPhase() { return 'question1'; },
    setV17CurrentStep(step) { context.D.v17Flow.currentStep = step; }, setEl() {}, v17Copy(key) { return key; }, v17Format(key) { return key; },
    renderV17ThemeMeaning() {}, renderV17ThemeScoreTrail() {}, renderResultSaveUI() {}, renderV17DeepDiveSourceBlock() {},
    renderV17DeepDiveResponseScreen() {}, renderV17Screen() { effects.render += 1; }, renderV17Result() { effects.render += 1; }, renderV17SessionModeScreen() { effects.render += 1; },
    resetV17ResumeNavigationHistory() {}, setV17ScreenDirectWithoutHistoryReset(id) { context.cur = id; }, updateBackBtn() {}, updateProgress() {},
    resetV17BreathScreen() {}, syncV17DeepDiveDrafts() {}, applyV17DeepDiveResultCandidate() {}, getV17DeepDiveResultCandidate() { return null; },
    trackEvent() { effects.analytics += 1; }, clearPendingProgress() { effects.clear += 1; }, fwd() {}, openV17Breath() {},
    updateThemeCTA() {}, updateIdealCTA() {}, updateDoorCTA() {}, updateNegaCTA() {}, positionV17SkipButton() {}
  };
  context.window = context;
  vm.runInNewContext(snapshotSource, context, { filename: 'js/v17/session-snapshot.js' });
  for (const name of ['createV17RepeatFrameState', 'resumeV17RegularSnapshotToScreen', 'cancelV17RepeatModeSelection', 'returnToV17RepeatResult', 'resumeV17RepeatCycle', 'renderV17Result', 'renderV17Screen']) {
    try { vm.runInNewContext(extractAppFunction(name), context, { filename: 'app-v17.html' }); } catch (_) {}
  }
  const api = context.window.NoetuneV17SessionSnapshot;
  context.v17RepeatResultState = context.createV17RepeatFrameState('s-result');
  context.v17RepeatCycleState = null;
  context.v17RepeatReturnPending = false;
  context.v17RepeatModeSelectionPending = screen === 's-v17-session-mode';
  context.v17RepeatBeforeScore = { state: 'scored', value: 2, touched: true };
  context.v17RepeatCycleCount = context.D.v17SessionIdentity.cycleIndex;
  const serialized = api.serializeV17SessionSnapshot();
  assert.equal(serialized.ok, true, JSON.stringify(serialized.error));
  return { context, api, snapshot: serialized.snapshot, effects, input };
}

test('production restored Repeat mode selection keeps identity and supports cancel without side effects', () => {
  const f = repeatSnapshotRuntime('regular', 's-v17-session-mode');
  const before = JSON.stringify(f.context.D.v17SessionIdentity);
  f.context.D = {};
  assert.equal(f.context.resumeV17RegularSnapshotToScreen(f.snapshot).ok, true);
  assert.equal(f.context.v17RepeatModeSelectionPending, true);
  assert.equal(JSON.stringify(f.context.D.v17SessionIdentity), before);
  assert.equal(f.context.v17RepeatCycleCount, 2);
  assert.equal(f.effects.analytics, 0); assert.equal(f.effects.storage, 0); assert.equal(f.effects.uuid, 0); assert.equal(f.effects.clear, 0);
});

test('production restored Repeat mode selection Back cancels to original Result', () => {
  const f = repeatSnapshotRuntime('regular', 's-v17-session-mode');
  assert.equal(f.context.resumeV17RegularSnapshotToScreen(f.snapshot).ok, true);
  assert.equal(f.context.cancelV17RepeatModeSelection(), true);
  assert.equal(f.context.cur, 's-result');
  assert.equal(f.context.v17RepeatResultState, null);
  assert.equal(f.context.v17RepeatModeSelectionPending, false);
});

test('production restored active Regular response preserves repeat projection and exact identity', () => {
  const f = repeatSnapshotRuntime('regular', 's-v17-first-response');
  f.snapshot.repeatState.modeSelectionPending = false;
  f.snapshot.currentScreen = 's-v17-first-response'; f.snapshot.summary.sessionMode = 'regular'; f.snapshot.currentState.currentScreen = 's-v17-first-response'; f.snapshot.currentState.currentStep = 'first-response';
  assert.equal(f.context.resumeV17RegularSnapshotToScreen(f.snapshot).ok, true);
  assert.equal(f.context.cur, 's-v17-first-response'); assert.equal(f.context.v17RepeatModeSelectionPending, false);
  assert.equal(f.context.v17RepeatCycleCount, f.context.D.v17SessionIdentity.cycleIndex); assert.equal(f.effects.analytics, 0);
});

test('production restored active Regular response temporary return and resume are idempotent', () => {
  const f = repeatSnapshotRuntime('regular', 's-v17-first-response');
  f.snapshot.repeatState.modeSelectionPending = false; f.snapshot.currentScreen = 's-v17-first-response'; f.snapshot.summary.sessionMode = 'regular'; f.snapshot.currentState.currentScreen = 's-v17-first-response'; f.snapshot.currentState.currentStep = 'first-response';
  assert.equal(f.context.resumeV17RegularSnapshotToScreen(f.snapshot).ok, true);
  f.context.v17RepeatResultState = f.context.createV17RepeatFrameState('s-result');
  assert.equal(f.context.returnToV17RepeatResult(), true); assert.equal(f.context.v17RepeatReturnPending, true);
  assert.equal(f.context.resumeV17RepeatCycle(), true); assert.equal(f.context.v17RepeatReturnPending, false); assert.equal(f.context.v17RepeatCycleState, null);
  assert.equal(f.effects.analytics, 0); assert.equal(f.effects.storage, 0); assert.equal(f.effects.uuid, 0);
});

test('production restored active Deep response preserves Deep identity and does not activate Regular flow', () => {
  const f = repeatSnapshotRuntime('deep', 's-v17-deep-response');
  f.snapshot.repeatState.modeSelectionPending = false; f.snapshot.currentScreen = 's-v17-deep-response'; f.snapshot.summary.sessionMode = 'deep'; f.snapshot.currentState.currentScreen = 's-v17-deep-response'; f.snapshot.currentState.currentStep = 'deep.question1';
  assert.equal(f.context.resumeV17RegularSnapshotToScreen(f.snapshot).ok, true);
  assert.equal(f.context.D.v17SessionMode, 'deep'); assert.equal(f.context.D.v17Flow.deepDive.questionVariant, 'A'); assert.equal(f.context.D.v17Flow.regularFlow, null);
  assert.equal(f.context.D.v17SessionIdentity.sessionId, '11111111-1111-4111-8111-111111111111'); assert.equal(f.effects.analytics, 0);
});

test('production restored Repeat serializer is pure across repeated serialization', () => {
  const f = repeatSnapshotRuntime('regular', 's-v17-first-response');
  const before = JSON.stringify({ d: f.context.D, result: f.context.v17RepeatResultState });
  assert.equal(f.api.serializeV17SessionSnapshot().ok, true); assert.equal(f.api.serializeV17SessionSnapshot().ok, true);
  assert.equal(JSON.stringify({ d: f.context.D, result: f.context.v17RepeatResultState }), before);
  assert.equal(f.effects.analytics, 0); assert.equal(f.effects.storage, 0); assert.equal(f.effects.uuid, 0);
});

test('production restored Repeat state rejects temporary Result persistence', () => {
  const f = repeatSnapshotRuntime('regular', 's-v17-session-mode');
  f.context.v17RepeatReturnPending = true; f.context.v17RepeatCycleState = f.context.createV17RepeatFrameState('s-v17-first-response');
  const rejected = f.api.serializeV17SessionSnapshot();
  assert.equal(rejected.ok, false); assert.equal(rejected.error.code, 'UNSUPPORTED_REPEAT_STATE');
});
*/
