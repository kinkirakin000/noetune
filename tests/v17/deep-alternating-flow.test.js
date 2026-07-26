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
