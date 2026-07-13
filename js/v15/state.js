/*
 * v15 shared state.
 * These var declarations intentionally create window properties for existing
 * inline handlers and split scripts.
 */
var currentUser    = null;
var currentProfile = null;
var supabaseClient = null;
var _posthog       = null;
var _checkoutSuccessPending = false;
var _resultSaveState = 'idle';
var _resultSaveInFlight = false;
var _saveResultToastTimer = null;
var _progressSaveState = 'idle';
var _progressSaveInFlight = false;
var _progressSavePromise = null;
var _savedProgress = null;
var _savedProgressResumeActive = false;

function isV17SupportedLocale(locale) {
  return locale === 'ja' || locale === 'en' || locale === 'zh-TW';
}

function normalizeV17PreferredLocale(value) {
  var text = String(value || '').trim();
  if (!text) return null;
  var lower = text.toLowerCase();
  if (lower === 'ja' || lower.indexOf('ja-') === 0) return 'ja';
  if (lower === 'en' || lower.indexOf('en-') === 0) return 'en';
  if (lower === 'zh' || lower.indexOf('zh-') === 0) {
    if (lower === 'zh-tw' || lower === 'zh-hant' || lower === 'zh-hant-tw' || lower === 'zh-hk' || lower === 'zh-mo') {
      return 'zh-TW';
    }
    return 'zh-TW';
  }
  return null;
}

function getStoredV17Language() {
  try {
    var source = localStorage.getItem('ntn_lang_source');
    if (source !== 'manual') return null;
    var stored = localStorage.getItem('ntn_lang');
    return isV17SupportedLocale(stored) ? stored : null;
  } catch(e) {
    return null;
  }
}

function getBrowserPreferredV17Language() {
  var candidates = [];
  try {
    if (typeof navigator !== 'undefined' && navigator.languages && navigator.languages.length) {
      candidates = Array.prototype.slice.call(navigator.languages);
    } else if (typeof navigator !== 'undefined' && navigator.language) {
      candidates = [navigator.language];
    }
  } catch(e) {}
  for (var i = 0; i < candidates.length; i += 1) {
    var locale = normalizeV17PreferredLocale(candidates[i]);
    if (locale) return locale;
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return normalizeV17PreferredLocale(navigator.language);
    }
  } catch(e) {}
  return null;
}

function resolveV17InitialLanguage() {
  return getStoredV17Language() || getBrowserPreferredV17Language() || 'en';
}

var lang = resolveV17InitialLanguage();
var themeMode = (function() {
  try {
    var saved = localStorage.getItem('noetuneThemeMode');
    return saved === 'light' || saved === 'dark' ? saved : 'auto';
  } catch(e) { return 'auto'; }
})();
var interfaceLanguagePending = false;

var D = {
  theme:'', themeKey:null,
  themePositive:'', themeNegative:'',
  freeInputType:'', freeInputValue:'', freeInputNextStep:'',
  issue:'', ideal:'', shiftNote:'',
  reactionAnswer:'', idealAnswer:'',
  entryMode: null,
  doorKey: null, doorSentence:'',
  breathEaseBefore:null, breathEaseAfter:null,
  beforeEmotionNegative:null, afterEmotionNegative:null,
  breathMode: null,
  v13InitialTheme: '',
  v13OriginalTheme: '',
  v13CurrentTheme: '',
  v13History: [],
  v13CurrentNonIdeal: '',
  v13StepNumber: 1,
  v13BeforeNaturalness: null,
  v13AfterNaturalness: null,
  v13PendingScreen: ''
};

var currentLocale = null;
var fallbackLocale = null;
var currentLang = lang;
var wishThemeVisibleCounts = {};

var themeVisibleCount = 3;
var themeChosen = false;
var negaFreeText = '';
var v12Mode = '';
var v12Invalidates = '';
var coreVisibleCount = 2;
var v12SituationCategory = '';
var v12SituationLabel = '';

var situationThemeVisibleCount = 2;
var currentSituationThemeItems = [];
var situationStep = null;
var currentSituationSmallTitle = '';
var currentSituationMajorKey = '';
var currentSituationMiddleKey = '';
var currentSituationCategoryId = null;

var cur = 's-landing';
var navHistory = [];
var navPageStateHistory = [];
var landingLang = lang;

var _trialConsumedThisSession = false;
var _doorSentences = {A:'', B:'', C:''};
var _selectedDoorCard = null;
var breathing = false, breathCount = 0;

Object.assign(window, {
  currentUser: currentUser,
  currentProfile: currentProfile,
  supabaseClient: supabaseClient,
  _posthog: _posthog,
  _checkoutSuccessPending: _checkoutSuccessPending,
  _resultSaveState: _resultSaveState,
  _resultSaveInFlight: _resultSaveInFlight,
  _saveResultToastTimer: _saveResultToastTimer,
  _progressSaveState: _progressSaveState,
  _progressSaveInFlight: _progressSaveInFlight,
  _progressSavePromise: _progressSavePromise,
  _savedProgress: _savedProgress,
  _savedProgressResumeActive: _savedProgressResumeActive,
  lang: lang,
  themeMode: themeMode,
  interfaceLanguagePending: interfaceLanguagePending,
  D: D,
  currentLocale: currentLocale,
  fallbackLocale: fallbackLocale,
  currentLang: currentLang,
  wishThemeVisibleCounts: wishThemeVisibleCounts,
  themeVisibleCount: themeVisibleCount,
  themeChosen: themeChosen,
  negaFreeText: negaFreeText,
  v12Mode: v12Mode,
  v12Invalidates: v12Invalidates,
  coreVisibleCount: coreVisibleCount,
  v12SituationCategory: v12SituationCategory,
  v12SituationLabel: v12SituationLabel,
  situationThemeVisibleCount: situationThemeVisibleCount,
  currentSituationThemeItems: currentSituationThemeItems,
  situationStep: situationStep,
  currentSituationSmallTitle: currentSituationSmallTitle,
  currentSituationMajorKey: currentSituationMajorKey,
  currentSituationMiddleKey: currentSituationMiddleKey,
  currentSituationCategoryId: currentSituationCategoryId,
  cur: cur,
  navHistory: navHistory,
  navPageStateHistory: navPageStateHistory,
  landingLang: landingLang,
  _trialConsumedThisSession: _trialConsumedThisSession,
  _doorSentences: _doorSentences,
  _selectedDoorCard: _selectedDoorCard,
  breathing: breathing,
  breathCount: breathCount
});
