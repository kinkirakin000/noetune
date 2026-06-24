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

var lang = (function() { try { return localStorage.getItem('ntn_lang') || 'en'; } catch(e) { return 'en'; } })();
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
var currentLang = 'ja';
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
var landingLang = 'en';

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
  landingLang: landingLang,
  _trialConsumedThisSession: _trialConsumedThisSession,
  _doorSentences: _doorSentences,
  _selectedDoorCard: _selectedDoorCard,
  breathing: breathing,
  breathCount: breathCount
});
