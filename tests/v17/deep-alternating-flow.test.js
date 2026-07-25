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
