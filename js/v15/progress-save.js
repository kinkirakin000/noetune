function renderProgressSaveUI() {
  var button = document.getElementById('btn-save-progress');
  var status = document.getElementById('save-progress-status');
  if (!button || !status) return;
  var buttonKey = _progressSaveState === 'saved' ? 'saveProgressSaved' : 'saveProgressButton';
  var statusKey = _progressSaveState === 'saving' ? 'saveProgressSaving'
    : _progressSaveState === 'saved' ? 'saveProgressSaved'
    : _progressSaveState === 'error' ? 'saveProgressError' : '';
  button.textContent = T(buttonKey);
  button.disabled = _progressSaveState === 'saving' || _progressSaveState === 'saved';
  status.textContent = statusKey ? T(statusKey) : '';
}

function setProgressSaveState(state) {
  _progressSaveState = state;
  renderProgressSaveUI();
}

function renderResumeProgressUI() {
  var button = document.getElementById('btn-resume-progress');
  if (!button) return;
  button.textContent = T('resumeSavedTheme');
  button.style.display = _savedProgress ? 'block' : 'none';
}

var PROGRESS_STATE_KEYS = [
    'theme','themeKey','themePositive','themeNegative','freeInputType','freeInputValue','freeInputNextStep',
    'issue','ideal','shiftNote','reactionAnswer','idealAnswer','entryMode','doorKey','doorSentence',
    'breathEaseBefore','breathEaseAfter','breathMode','selectedWishGroup','selectedWish','selectedWishTheme',
    'v13InitialTheme','v13OriginalTheme','v13CurrentTheme','v13History','v13CurrentNonIdeal','v13StepNumber',
    'v13BeforeNaturalness','v13AfterNaturalness','v13PendingScreen'
  ];

function progressStateSnapshot() {
  var state = {};
  PROGRESS_STATE_KEYS.forEach(function(key) { state[key] = D[key] === undefined ? null : D[key]; });
  return state;
}

function buildCurrentProgressPayload() {
  var history = Array.isArray(D.v13History) ? D.v13History : [];
  return {
    themeKey: D.themeKey || D.selectedWishTheme || null,
    wishKey: D.selectedWish || null,
    wishGroupKey: D.selectedWishGroup || null,
    wishThemeKey: D.selectedWishTheme || null,
    themeLabel: D.v13OriginalTheme || D.themePositive || D.theme || '',
    currentStep: D.v13PendingScreen || 's-v13-nonideal',
    nonidealAnswers: history.map(function(item) { return item.nonIdeal || ''; }).filter(Boolean)
      .concat(D.v13CurrentNonIdeal ? [D.v13CurrentNonIdeal] : []),
    idealAnswers: history.map(function(item) { return item.ideal || ''; }).filter(Boolean),
    beforeScore: D.breathEaseBefore == null ? null : String(D.breathEaseBefore),
    currentScore: D.v13AfterNaturalness == null ? null : String(D.v13AfterNaturalness),
    language: lang,
    progressData: progressStateSnapshot()
  };
}

function getPendingProgress() {
  try {
    var raw = sessionStorage.getItem('noetunePendingProgress');
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function setPendingProgress(payload) {
  try { sessionStorage.setItem('noetunePendingProgress', JSON.stringify(payload)); } catch(e) {}
}

function clearPendingProgress() {
  try { sessionStorage.removeItem('noetunePendingProgress'); } catch(e) {}
}

function openProgressSaveAuth(payload) {
  setPendingProgress(payload);
  openAuthModal();
  setEl('auth-modal-title', T('saveProgressLoginTitle'));
  setEl('auth-modal-body', T('saveProgressLoginBody'));
}

function saveCurrentProgress() {
  if (_progressSaveInFlight || _progressSaveState === 'saved') return;
  var payload = buildCurrentProgressPayload();
  if (!currentUser) {
    openProgressSaveAuth(payload);
    return;
  }
  requestProgressSave(payload, false);
}

function savePendingProgressIfNeeded() {
  var payload = getPendingProgress();
  if (_progressSaveInFlight) return _progressSavePromise || Promise.resolve(false);
  if (!currentUser || !payload) return Promise.resolve(false);
  return requestProgressSave(payload, true);
}

function requestProgressSave(payload, fromPendingLogin) {
  if (_progressSaveInFlight) return _progressSavePromise || Promise.resolve(false);
  if (!supabaseClient || !currentUser) return Promise.resolve(false);
  _progressSaveInFlight = true;
  setProgressSaveState('saving');
  _progressSavePromise = supabaseClient.auth.getSession()
    .then(function(result) {
      var token = result.data && result.data.session ? result.data.session.access_token : null;
      if (!token) throw new Error('missing session');
      return fetch('/api/save-progress', {
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
      if (!data || !data.saved || !data.progress) throw new Error('save failed');
      clearPendingProgress();
      _savedProgress = data.progress;
      setProgressSaveState('saved');
      renderResumeProgressUI();
      showResultSaveToast(T('saveProgressSaved'));
      trackEvent('progress_saved', { lang: payload.language, after_login: !!fromPendingLogin });
      return true;
    })
    .catch(function() {
      setProgressSaveState('error');
      if (fromPendingLogin) showResultSaveToast(T('saveProgressError'));
      return false;
    })
    .finally(function() {
      _progressSaveInFlight = false;
      _progressSavePromise = null;
    });
  return _progressSavePromise;
}

function loadSavedProgress() {
  if (_progressSaveInFlight) {
    return (_progressSavePromise || Promise.resolve(false)).then(loadSavedProgress);
  }
  if (!supabaseClient || !currentUser) return Promise.resolve(false);
  return supabaseClient.auth.getSession()
    .then(function(result) {
      var token = result.data && result.data.session ? result.data.session.access_token : null;
      if (!token) return null;
      return fetch('/api/save-progress', { headers: { 'Authorization': 'Bearer ' + token } });
    })
    .then(function(response) { return response && response.ok ? response.json() : null; })
    .then(function(data) {
      _savedProgress = data && data.progress ? data.progress : null;
      renderResumeProgressUI();
      return !!_savedProgress;
    })
    .catch(function() { return false; });
}

function resumeSavedProgress() {
  if (!_savedProgress || !_savedProgress.progressData) return;
  var savedState = _savedProgress.progressData;
  PROGRESS_STATE_KEYS.forEach(function(key) {
    if (savedState[key] !== undefined && savedState[key] !== null) D[key] = savedState[key];
  });
  _savedProgressResumeActive = true;
  themeChosen = true;
  setV13MeasurementTitles();
  var step = _savedProgress.currentStep || D.v13PendingScreen;
  if (step === 's-v13-ideal') showV13Ideal();
  else showV13NonIdeal();
  trackEvent('progress_resumed', { lang: lang, themeKey: D.themeKey || D.selectedWishTheme || '' });
}

function clearSavedProgress() {
  var hadProgress = !!_savedProgress;
  _savedProgress = null;
  _savedProgressResumeActive = false;
  renderResumeProgressUI();
  if (!hadProgress || !supabaseClient || !currentUser) return Promise.resolve(false);
  return supabaseClient.auth.getSession()
    .then(function(result) {
      var token = result.data && result.data.session ? result.data.session.access_token : null;
      if (!token) return null;
      return fetch('/api/save-progress', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      });
    })
    .then(function(response) { return !!(response && response.ok); })
    .catch(function() { return false; });
}

window.renderProgressSaveUI = renderProgressSaveUI;
window.setProgressSaveState = setProgressSaveState;
window.renderResumeProgressUI = renderResumeProgressUI;
window.saveCurrentProgress = saveCurrentProgress;
window.savePendingProgressIfNeeded = savePendingProgressIfNeeded;
window.loadSavedProgress = loadSavedProgress;
window.resumeSavedProgress = resumeSavedProgress;
window.clearSavedProgress = clearSavedProgress;
window.buildCurrentProgressPayload = buildCurrentProgressPayload;
window.requestProgressSave = requestProgressSave;
