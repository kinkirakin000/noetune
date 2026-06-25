function buildCurrentResultPayload() {
  var card = document.getElementById('result-card');
  var history = (D.v13History || []).map(function(item) {
    return {
      step: item.step,
      theme: item.theme || '',
      nonIdeal: item.nonIdeal || '',
      ideal: item.ideal || ''
    };
  });
  return {
    clientRef: createResultClientRef(),
    selectedThemeKey: D.themeKey || D.selectedWishTheme || null,
    wishGroupKey: D.selectedWishGroup || null,
    wishKey: D.selectedWish || null,
    wishThemeKey: D.selectedWishTheme || null,
    themeLabel: D.v13OriginalTheme || D.themePositive || D.theme || D.ideal || '',
    userAnswers: {
      entryMode: D.entryMode || null,
      freeInputType: D.freeInputType || null,
      freeInputValue: D.freeInputValue || null,
      issue: D.issue || '',
      ideal: D.ideal || '',
      themeNegative: D.themeNegative || '',
      reactionAnswer: D.reactionAnswer || '',
      idealAnswer: D.idealAnswer || '',
      doorKey: D.doorKey || null,
      doorSentence: D.doorSentence || '',
      v13History: history,
      shiftNote: D.shiftNote || ''
    },
    beforeScore: D.breathEaseBefore == null ? null : String(D.breathEaseBefore),
    afterScore: D.breathEaseAfter == null ? null : String(D.breathEaseAfter),
    resultSummary: card ? (card.innerText || card.textContent || '').trim() : '',
    resultCardData: {
      theme: resultText('t-result-from'),
      essence: resultText('t-result-sub'),
      beforeScore: resultText('r-be-b'),
      afterScore: resultText('r-be-a'),
      shiftNote: resultText('t-shift-note-display'),
      meaning: resultText('t-result-meaning')
    },
    language: lang
  };
}

function saveCurrentResult() {
  if (_resultSaveInFlight || _resultSaveState === 'saved') return;
  var payload = buildCurrentResultPayload();
  if (!currentUser) {
    openResultSaveAuth(payload);
    return;
  }
  requestResultSave(payload, false);
}

function savePendingResultIfNeeded() {
  if (!currentUser || _resultSaveInFlight) return;
  var payload = getPendingResult();
  if (payload) requestResultSave(payload, true);
}

function requestResultSave(payload, fromPendingLogin) {
  if (_resultSaveInFlight || !supabaseClient || !currentUser) return;
  _resultSaveInFlight = true;
  setResultSaveState('saving');
  supabaseClient.auth.getSession()
    .then(function(result) {
      var token = result.data && result.data.session ? result.data.session.access_token : null;
      if (!token) throw new Error('missing session');
      return fetch('/api/save-result', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    })
    .then(function(response) {
      if (!response.ok) throw new Error('save failed');
      return response.json();
    })
    .then(function(data) {
      if (!data || !data.saved) throw new Error('save failed');
      clearPendingResult();
      setResultSaveState('saved');
      showResultSaveToast(T('saveResultSaved'));
      trackEvent('result_saved', { lang: payload.language, after_login: !!fromPendingLogin });
    })
    .catch(function() {
      setResultSaveState('error');
      if (fromPendingLogin) showResultSaveToast(T('saveResultError'));
    })
    .finally(function() {
      _resultSaveInFlight = false;
    });
}

window.buildCurrentResultPayload = buildCurrentResultPayload;
window.saveCurrentResult = saveCurrentResult;
window.savePendingResultIfNeeded = savePendingResultIfNeeded;
window.requestResultSave = requestResultSave;
