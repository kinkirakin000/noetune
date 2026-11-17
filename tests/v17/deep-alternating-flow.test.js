'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const expected = {
  ja: {
    past: '過去を振り返ってみてください。この状態とは違う自分だったことはありますか？もしあれば、そのときの自分はどんな様子ですか？',
    desirable: 'その状態を、全く体験したことのない人はどんな状態ですか？（より好ましい状態）',
    measure: 'その状態で、どのくらい自然で幸せな自分を感じますか？',
    recommendation: '最推奨：このプロセスをもう一度行う。',
    explanation: '何度も繰り返すことで、あなたが握りしめていた、見えにくい固定観念が見え、それを手放すことができます。特に根深いテーマにおいて、開発者の自己観察では、その過程で、自由幸福度の数値が一時的に低くなることも頻繁に起こりました。\n\n問いに対する回答が全く浮かばなくなり、数値化もできない状態が完了の合図です。',
    button: '再度、同じテーマを繰り返す'
  },
  en: {
    past: 'Think back to the past. Have there been times when you were different from this state? If so, what were you like then?',
    desirable: 'What would someone be like if they had never experienced that state at all? (A more desirable state)',
    measure: 'In that state, how much do you feel like your natural, happy self?',
    recommendation: 'Top recommendation: Repeat this process once more.',
    explanation: "By repeating this process many times, you can begin to recognize the deeply held beliefs that were difficult to see and let them go. In the developer's own self-observation, especially when exploring deeply rooted themes, the freedom and happiness score frequently dropped temporarily during this process.\n\nThe sign of completion is when no answer to the question comes to mind at all, and you can no longer put a number to your state.",
    button: 'Repeat the Same Theme'
  },
  'zh-TW': {
    past: '回想一下過去，你有沒有過和這個狀態不一樣的時候？如果有，那時候的你是什麼樣子？',
    desirable: '一個從未經歷過那種狀態的人，會處於什麼樣的狀態？（更理想的狀態）',
    measure: '在那個狀態下，你有多大程度能感受到自然又幸福的自己？',
    recommendation: '最推薦：再進行一次這個過程。',
    explanation: '透過一次又一次地重複這個過程，你可以逐漸看見那些自己一直緊抓著、卻不容易察覺的固有觀念，並將它們放下。尤其在面對根深蒂固的主題時，根據開發者自身的觀察，在這個過程中，自由幸福度的分數也經常會暫時下降。\n\n當你對這個問題完全想不出任何回答，也無法再用數字衡量自己的狀態時，就是完成的訊號。',
    button: '再次重複同一個主題'
  }
};

function source(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function extractFunction(text, name) {
  const marker = `function ${name}(`;
  const start = text.indexOf(marker);
  assert.notEqual(start, -1, `${name} exists`);
  const open = text.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error(`${name} is not closed`);
}

test('three locale files contain the exact #001, #002, and #003 prompts and #006 copy', () => {
  for (const [locale, copy] of Object.entries(expected)) {
    const data = JSON.parse(source(`locales/${locale}.json`));
    assert.equal(data.flow.step2.ideals.prompt, copy.past, `${locale} #001 step2 ideals`);
    assert.equal(data.flow.step3.problems.prompt, copy.past, `${locale} #001 step3 problems`);
    assert.equal(data.flow.step2.problems.prompt, copy.desirable, `${locale} #002 problem route`);
    assert.equal(data.flow.step3.ideals.prompt, copy.desirable, `${locale} #002 ideal route`);
    assert.equal(data.flow.step1.prompt, copy.measure, `${locale} #003 before`);
    assert.equal(data.flow.step5.prompt, copy.measure, `${locale} #003 after`);
    assert.equal(data.result.repeatRecommendation, copy.recommendation, `${locale} #006 heading`);
    assert.equal(data.result.repeatSameTheme, copy.button, `${locale} #006 button`);
    assert.equal(data.result.repeatExplanation, copy.explanation, `${locale} #006 explanation`);
  }
});

test('problem and ideal route response roles are stable on both V17 entry files', () => {
  for (const file of ['index.html', 'app-v17.html']) {
    const text = source(file);
    const context = { D: { themeTrackId: 'problems' } };
    vm.createContext(context);
    vm.runInContext(extractFunction(text, 'getV17ThemeRoute'), context);
    vm.runInContext(extractFunction(text, 'getV17ResponseKind'), context);
    assert.equal(context.getV17ResponseKind('first'), 'idealState', `${file} problem Q2`);
    assert.equal(context.getV17ResponseKind('second'), 'currentState', `${file} problem Q3`);
    context.D.themeTrackId = 'ideals';
    assert.equal(context.getV17ResponseKind('first'), 'currentState', `${file} ideal Q2`);
    assert.equal(context.getV17ResponseKind('second'), 'idealState', `${file} ideal Q3`);
    const routeInput = extractFunction(text, 'onV17RouteInput');
    assert.doesNotMatch(routeInput, /scheduleV17SavedDraftSnapshot\s*\(/, `${file} has no undefined snapshot call`);
  }
});

test('both result screens show the score, continuation message, and repeat action in order', () => {
  for (const file of ['index.html', 'app-v17.html']) {
    const text = source(file);
    const score = text.indexOf('id="v17-result-scores"');
    const recommendation = text.indexOf('id="v17-result-repeat-heading"');
    const repeat = text.indexOf('id="btn-v17-repeat-theme"');
    const other = text.indexOf('id="btn-v17-restart-subtheme"');
    assert.ok(score >= 0 && score < recommendation && recommendation < repeat && repeat < other, file);
    assert.match(text, /id="btn-v17-choose-another-theme"/);
    assert.doesNotMatch(text, /id="btn-v17-restart-theme"/);
    assert.match(text, /function repeatCurrentTheme\(\)/);
    assert.doesNotMatch(extractFunction(text, 'repeatCurrentTheme'), /return restartCurrentSubtheme\(\)/);
  }
});

test('repeat action starts a new round while subtheme restart retains its own beginning behavior', () => {
  const index = source('index.html');
  const app = source('app-v17.html');
  assert.match(extractFunction(index, 'restartCurrentSubtheme'), /startV17Session\(true\)/);
  assert.match(extractFunction(index, 'repeatCurrentTheme'), /showScreenDirect\('s-v17-first-response'\)/);
  assert.match(extractFunction(app, 'restartCurrentSubtheme'), /renderV17SessionModeScreen\(\)/);
  assert.match(extractFunction(app, 'repeatCurrentTheme'), /startV17RepeatedSubthemeSession\(mode\)/);
});
