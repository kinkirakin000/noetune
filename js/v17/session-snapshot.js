(function(global) {
  'use strict';

  var STORAGE_KEY = 'noetune:v17:active-session:v1';
  var SCHEMA_VERSION = 1;
  var APP_VERSION = 'v17';
  var MAX_BYTES = 1024 * 1024;
  var ALLOWED_SCREENS = [
    's-v17-session-mode',
    's-v17-before',
    's-v17-first-response',
    's-v17-second-response'
  ];
  var ALLOWED_SESSION_STATUSES = ['active', 'completed', 'discarded'];
  var ALLOWED_ENTRY_TYPES = ['life_theme', 'free_input', 'spiritual_wisdom'];
  var ALLOWED_ROUTE_TYPES = ['problem', 'ideal', 'spiritual'];
  var ALLOWED_MEASUREMENT_STATES = ['scored', 'not_a_problem', 'skipped', 'unset'];
  var ALLOWED_RESPONSE_STATES = ['answered', 'skipped', 'unset'];
  var ALLOWED_FLOW_RESPONSE_STATES = ['answered', 'skipped', 'unset'];
  var ALLOWED_QUESTION_VARIANTS = ['A', 'B'];
  var ALLOWED_CURRENT_STEPS = ['session-mode', 'before', 'first-response', 'second-response', 'step1', 'step2', 'step3'];
  var FORBIDDEN_KEYS = [
    'navHistory',
    'navPageStateHistory',
    'access_token',
    'refresh_token',
    'supabaseClient',
    'currentUser',
    'currentProfile'
  ];

  function isPlainObject(value) {
    return !!value && Object.prototype.toString.call(value) === '[object Object]';
  }

  function clone(value) {
    return value && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function toIsoOrNull(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    var time = Date.parse(value);
    return Number.isNaN(time) ? null : new Date(time).toISOString();
  }

  function isUuid(value) {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
  }

  function normalizeNullableText(value) {
    if (typeof value !== 'string') return null;
    var text = value.trim();
    return text ? text : null;
  }

  function normalizeText(value) {
    return typeof value === 'string' ? value : '';
  }

  function normalizeInteger(value) {
    return typeof value === 'number' && Number.isInteger(value) ? value : null;
  }

  function deepClone(value) {
    return clone(value);
  }

  function getSnapshotByteSize(value) {
    try {
      var json = typeof value === 'string' ? value : JSON.stringify(value);
      if (typeof json !== 'string') json = String(json || '');
      if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(json).length;
      if (typeof Blob !== 'undefined') return new Blob([json]).size;
      return json.length;
    } catch (e) {
      return 0;
    }
  }

  function createError(code, path) {
    return { code: code, path: path || '' };
  }

  function hasForbiddenOrUnsafeValue(value, path, seen) {
    if (value === null || value === undefined) return null;
    var type = typeof value;
    if (type === 'function') return createError('UNSUPPORTED_FUNCTION', path);
    if (type !== 'object') return null;
    if (typeof Node !== 'undefined' && value instanceof Node) return createError('UNSUPPORTED_DOM_NODE', path);
    if (seen.has(value)) return createError('CIRCULAR_REFERENCE', path);
    seen.add(value);
    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i += 1) {
        var arrayResult = hasForbiddenOrUnsafeValue(value[i], path + '[' + i + ']', seen);
        if (arrayResult) return arrayResult;
      }
      return null;
    }
    if (!isPlainObject(value)) return createError('UNSUPPORTED_OBJECT_TYPE', path);
    var keys = Object.keys(value);
    for (var k = 0; k < keys.length; k += 1) {
      var key = keys[k];
      if (FORBIDDEN_KEYS.indexOf(key) >= 0) return createError('FORBIDDEN_KEY', path ? path + '.' + key : key);
      var nested = hasForbiddenOrUnsafeValue(value[key], path ? path + '.' + key : key, seen);
      if (nested) return nested;
    }
    return null;
  }

  function validateExactObjectKeys(value, allowedKeys, path, code) {
    var keys = Object.keys(value);
    for (var i = 0; i < keys.length; i += 1) {
      if (allowedKeys.indexOf(keys[i]) < 0) {
        return createError(code, path ? path + '.' + keys[i] : keys[i]);
      }
    }
    return null;
  }

  function getGlobalValue(path) {
    var root = global;
    var parts = path.split('.');
    for (var i = 0; i < parts.length; i += 1) {
      if (!root) return undefined;
      root = root[parts[i]];
    }
    return root;
  }

  function getRuntimeScreenId() {
    var flow = getRuntimeFlow();
    var value = flow && typeof flow.currentScreen === 'string' && flow.currentScreen
      ? flow.currentScreen
      : typeof global.cur === 'string' ? global.cur : '';
    return value || 's-v17-session-mode';
  }

  function getRuntimeFlow() {
    return global.D && global.D.v17Flow && typeof global.D.v17Flow === 'object' ? global.D.v17Flow : null;
  }

  function getRuntimeSessionMode() {
    var flow = getRuntimeFlow();
    var mode = global.D && typeof global.D.v17SessionMode === 'string' && global.D.v17SessionMode
      ? global.D.v17SessionMode
      : flow && typeof flow.sessionMode === 'string' ? flow.sessionMode : '';
    return mode === 'regular' ? 'regular' : mode === 'deep' ? 'deep' : null;
  }

  function getRuntimeRouteType() {
    var themeSource = global.D && typeof global.D.themeSource === 'string' ? global.D.themeSource : '';
    if (themeSource === 'spiritual-wisdom') return 'spiritual';
    var trackId = global.D && typeof global.D.themeTrackId === 'string' ? global.D.themeTrackId : '';
    if (trackId === 'problems') return 'problem';
    if (trackId === 'ideals') return 'ideal';
    return null;
  }

  function getEntryType() {
    var themeSource = global.D && typeof global.D.themeSource === 'string' ? global.D.themeSource : '';
    if (themeSource === 'themeLibrary') return 'life_theme';
    if (themeSource === 'freeInput' || themeSource === 'categoryFreeInput' || themeSource === 'customCategoryFreeInput') {
      return 'free_input';
    }
    if (themeSource === 'spiritual-wisdom') return 'spiritual_wisdom';
    return null;
  }

  function getCurrentStep(screenId, flow) {
    if (screenId === 's-v17-session-mode') return 'session-mode';
    if (screenId === 's-v17-before') return flow && typeof flow.currentStep === 'string' && flow.currentStep ? flow.currentStep : 'before';
    if (screenId === 's-v17-first-response') return flow && typeof flow.currentStep === 'string' && flow.currentStep ? flow.currentStep : 'first-response';
    if (screenId === 's-v17-second-response') return flow && typeof flow.currentStep === 'string' && flow.currentStep ? flow.currentStep : 'second-response';
    return null;
  }

  function getMeasurementRuntime(kind) {
    var measurement = global.D && global.D.v17MeasurementState && global.D.v17MeasurementState[kind];
    return isPlainObject(measurement) ? measurement : null;
  }

  function normalizeMeasurement(kind, legacyValue) {
    var runtime = getMeasurementRuntime(kind);
    if (runtime && ALLOWED_MEASUREMENT_STATES.indexOf(runtime.state) >= 0) {
      var normalizedRuntime = {
        state: runtime.state,
        value: runtime.state === 'scored' ? (typeof runtime.value === 'number' && Number.isFinite(runtime.value) ? runtime.value : null) : null,
        touched: !!runtime.touched
      };
      if (runtime.state === 'scored' && normalizedRuntime.value === null && typeof legacyValue === 'number' && Number.isFinite(legacyValue)) {
        normalizedRuntime.value = legacyValue;
      }
      return normalizedRuntime;
    }
    if (legacyValue === global.V17_SCORE_NOT_A_PROBLEM) {
      return { state: 'not_a_problem', value: null, touched: true };
    }
    if (typeof legacyValue === 'number' && Number.isFinite(legacyValue)) {
      return { state: 'scored', value: legacyValue, touched: true };
    }
    return { state: 'unset', value: null, touched: false };
  }

  function getResponsePair(position, role, flow) {
    var confirmedKey = position === 'first' ? 'step2Text' : 'step3Text';
    var draftKey = position === 'first' ? 'step2Draft' : 'step3Draft';
    var semanticConfirmed = role === 'current' ? global.D.currentState : global.D.idealState;
    var semanticDraft = role === 'current' ? global.D.currentStateDraft : global.D.idealStateDraft;
    var flowConfirmed = flow && typeof flow[confirmedKey] === 'string' ? flow[confirmedKey] : '';
    var flowDraft = flow && typeof flow[draftKey] === 'string' ? flow[draftKey] : '';
    var confirmed = flowConfirmed || normalizeText(semanticConfirmed);
    var draft = flowDraft || normalizeText(semanticDraft);
    var state = confirmed || draft ? 'answered' : 'unset';
    return {
      state: state,
      text: confirmed,
      draft: draft
    };
  }

  function getResponseRoles(routeType) {
    if (routeType === 'problem') return { first: 'ideal', second: 'current' };
    return { first: 'current', second: 'ideal' };
  }

  function normalizeEntrySummary(entryType, themeLabel, subthemeLabel, questionTextAtTime, freeInputTheme) {
    if (entryType === 'free_input') {
      return {
        entryType: entryType,
        themeLabel: normalizeNullableText(freeInputTheme || questionTextAtTime),
        subthemeLabel: null,
        questionTextAtTime: normalizeNullableText(questionTextAtTime)
      };
    }
    return {
      entryType: entryType,
      themeLabel: normalizeNullableText(themeLabel || questionTextAtTime),
      subthemeLabel: normalizeNullableText(subthemeLabel || questionTextAtTime),
      questionTextAtTime: normalizeNullableText(questionTextAtTime)
    };
  }

  function getRandomUuid() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    return null;
  }

  function createV17SessionIdentity(now) {
    var createdAt = toIsoOrNull(now) || nowIso();
    var sessionId = getRandomUuid();
    var cycleId = getRandomUuid();
    if (!sessionId || !cycleId) return null;
    return {
      sessionId: sessionId,
      status: 'active',
      createdAt: createdAt,
      savedAt: null,
      updatedAt: createdAt,
      revision: 0,
      cycleId: cycleId,
      cycleIndex: 0,
      cycleStartedAt: createdAt,
      resultReachedAt: null,
      resultEventSent: false
    };
  }

  function getV17SessionIdentity() {
    return isPlainObject(global.D) && isPlainObject(global.D.v17SessionIdentity) ? global.D.v17SessionIdentity : null;
  }

  function startNewV17SessionIdentity(now) {
    var identity = createV17SessionIdentity(now);
    if (!identity) return null;
    if (!isPlainObject(global.D)) return null;
    global.D.v17SessionIdentity = identity;
    return identity;
  }

  function buildEntryState(entryType, themeId, questionId, themeLabel, themeDescription, categoryId, categoryLabel, trackId, themeMeaning, freeInputTheme, questionTextAtTime, selectionLocale) {
    return {
      entryType: entryType,
      themeId: themeId,
      questionId: questionId,
      themeLabel: themeLabel,
      themeDescription: themeDescription,
      categoryId: categoryId,
      categoryLabel: categoryLabel,
      trackId: trackId,
      themeMeaning: themeMeaning,
      freeInputTheme: freeInputTheme,
      questionTextAtTime: questionTextAtTime,
      localeAtSelection: selectionLocale
    };
  }

  function normalizeV17Locale(value) {
    return value === 'ja' || value === 'en' || value === 'zh-TW' ? value : null;
  }

  function normalizeV17QuestionVariant(value) {
    return ALLOWED_QUESTION_VARIANTS.indexOf(value) >= 0 ? value : 'A';
  }

  function getActiveScreenBucket(screenId) {
    return screenId === 's-v17-second-response' ? 'second' : 'first';
  }

  function deriveV17RegularFlow(currentScreen, routeType) {
    if (currentScreen === 's-v17-session-mode' || currentScreen === 's-v17-before') return null;
    if (currentScreen !== 's-v17-first-response' && currentScreen !== 's-v17-second-response' && currentScreen !== 's-v17-breath' && currentScreen !== 's-v17-final-measure' && currentScreen !== 's-result') {
      return null;
    }
    var activeScreen = currentScreen === 's-v17-first-response'
      ? 'first'
      : currentScreen === 's-v17-second-response'
        ? 'second'
        : 'completed';
    var firstResponseRole = routeType === 'problem' ? 'ideal' : 'current';
    var secondResponseRole = routeType === 'problem' ? 'current' : 'ideal';
    if (routeType !== 'problem' && routeType !== 'ideal' && routeType !== 'spiritual') return null;
    return {
      activeScreen: activeScreen,
      firstResponseRole: firstResponseRole,
      secondResponseRole: secondResponseRole
    };
  }

  function normalizeV17ResponseState(value, path) {
    if (typeof value === 'undefined') return { state: 'unset' };
    if (typeof value !== 'string') return null;
    if (ALLOWED_FLOW_RESPONSE_STATES.indexOf(value) < 0) return null;
    return { state: value };
  }

  function getRuntimeResponseState(role, flow, semanticValue, semanticDraft) {
    var flowStates = flow && isPlainObject(flow.responseStates) ? flow.responseStates : null;
    var flowState = flowStates && typeof flowStates[role] === 'string' ? flowStates[role] : null;
    var normalizedFlowState = normalizeV17ResponseState(flowState, 'responseStates.' + role);
    if (normalizedFlowState) {
      return {
        state: normalizedFlowState.state,
        text: normalizeText(semanticValue),
        draft: normalizeText(semanticDraft)
      };
    }
    var text = normalizeText(semanticValue);
    var draft = normalizeText(semanticDraft);
    return {
      state: text || draft ? 'answered' : 'unset',
      text: text,
      draft: draft
    };
  }

  function validateRuntimeResponseStates(flow, path) {
    if (!isPlainObject(flow.responseStates)) return createError('RESPONSE_STATE_INVALID', path);
    var responseStateKeys = ['current', 'ideal'];
    var responseStateShapeError = validateExactObjectKeys(flow.responseStates, responseStateKeys, path, 'RESPONSE_STATE_INVALID');
    if (responseStateShapeError) return responseStateShapeError;
    var currentError = validateFlowResponseState(flow.responseStates.current, path + '.current');
    if (currentError) return currentError;
    var idealError = validateFlowResponseState(flow.responseStates.ideal, path + '.ideal');
    if (idealError) return idealError;
    return null;
  }

  function buildSnapshot(identity, savedAt, now) {
    var screenId = getRuntimeScreenId();
    var flow = getRuntimeFlow();
    var sessionMode = getRuntimeSessionMode();
    var routeType = getRuntimeRouteType();
    var entryType = getEntryType();
    var currentStep = getCurrentStep(screenId, flow);
    var currentLocale = normalizeV17Locale(typeof global.lang === 'string' && global.lang ? global.lang : '');
    var selectionLocale = normalizeV17Locale(global.D && global.D.localeAtTime);
    var themeId = normalizeNullableText(global.D && global.D.themeId);
    var questionId = normalizeNullableText(global.D && global.D.questionId);
    var questionTextAtTime = normalizeNullableText(global.D && global.D.questionTextAtTime);
    var categoryId = normalizeNullableText(global.D && global.D.themeCategoryId);
    var categoryLabel = normalizeNullableText(global.D && global.D.themeCategoryLabelAtTime);
    var track = normalizeNullableText(global.D && global.D.themeTrackId);
    var themeDescription = normalizeNullableText(global.D && global.D.themeMeaning);
    var freeInputTheme = normalizeNullableText(global.D && global.D.freeInputTheme);
    var themeLabel = normalizeNullableText(
      entryType === 'free_input'
        ? (global.D && (global.D.freeInputTheme || global.D.theme || global.D.questionTextAtTime))
        : (global.D && (global.D.theme || global.D.questionTextAtTime))
    );
    var entrySummary = normalizeEntrySummary(entryType, categoryLabel, questionTextAtTime, questionTextAtTime, freeInputTheme);
    var responseRoles = getResponseRoles(routeType);
    var currentStateValue = normalizeNullableText(global.D && global.D.currentState);
    var idealStateValue = normalizeNullableText(global.D && global.D.idealState);
    var beforeMeasurement = normalizeMeasurement('before', global.D && global.D.initialThemeScore);
    var afterMeasurement = normalizeMeasurement('after', global.D && global.D.finalThemeScore);
    var scoreTrail = Array.isArray(global.D && global.D.currentThemeScoreTrail)
      ? clone(global.D.currentThemeScoreTrail) : [];
    var awarenessTrail = Array.isArray(global.D && global.D.currentThemeAwarenessTrail)
      ? clone(global.D.currentThemeAwarenessTrail) : [];
    var firstPair = getResponsePair('first', responseRoles.first, flow);
    var secondPair = getResponsePair('second', responseRoles.second, flow);
    var currentResponse = getRuntimeResponseState('current', flow, global.D && global.D.currentState, global.D && global.D.currentStateDraft);
    var idealResponse = getRuntimeResponseState('ideal', flow, global.D && global.D.idealState, global.D && global.D.idealStateDraft);
    var regularFlow = deriveV17RegularFlow(flow && typeof flow.currentScreen === 'string' && flow.currentScreen ? flow.currentScreen : screenId, routeType);
    if (regularFlow) regularFlow.questionVariant = normalizeV17QuestionVariant(flow && flow.questionVariant);
    var currentCycle = {
      cycleId: identity.cycleId,
      cycleIndex: identity.cycleIndex,
      startedAt: identity.cycleStartedAt,
      resultReachedAt: identity.resultReachedAt === null ? null : identity.resultReachedAt,
      resultEventSent: !!identity.resultEventSent
    };
    var currentState = {
      currentScreen: screenId,
      currentStep: currentStep,
      routeType: routeType,
      entryType: entryType,
      locale: currentLocale,
      entry: buildEntryState(
        entryType,
        themeId,
        questionId,
        themeLabel,
        themeDescription,
        categoryId,
        categoryLabel,
        track,
        themeDescription,
        freeInputTheme,
        questionTextAtTime,
        selectionLocale
      ),
      measurement: {
        before: beforeMeasurement,
        after: afterMeasurement
      },
      responses: {
        current: currentResponse,
        ideal: idealResponse
      },
      semanticState: {
        current: currentStateValue,
        ideal: idealStateValue
      },
      regularFlow: regularFlow,
      scoreTrail: scoreTrail,
      awarenessTrail: awarenessTrail,
      deepFlow: null
    };
    return {
      snapshotSchemaVersion: SCHEMA_VERSION,
      appVersion: APP_VERSION,
      sessionId: identity.sessionId,
      status: identity.status || 'active',
      createdAt: identity.createdAt,
      savedAt: identity.savedAt || savedAt,
      updatedAt: now,
      completedAt: null,
      discardedAt: null,
      revision: identity.revision,
      currentScreen: screenId,
      summary: {
        locale: selectionLocale,
        sessionMode: sessionMode,
        routeType: routeType,
        entryType: entryType,
        themeId: themeId,
        themeLabel: entrySummary.themeLabel,
        subthemeLabel: entrySummary.subthemeLabel,
        themeDescription: themeDescription,
        categoryId: categoryId,
        categoryLabel: categoryLabel,
        track: track,
        freeInputTheme: freeInputTheme,
        questionId: questionId,
        questionTextAtTime: questionTextAtTime
      },
      currentCycle: currentCycle,
      currentState: currentState,
      repeatState: null,
      resumeBackFrames: []
    };
  }

  function validateMeasurementObject(value, path) {
    if (!isPlainObject(value)) return createError('INVALID_MEASUREMENT_OBJECT', path);
    if (ALLOWED_MEASUREMENT_STATES.indexOf(value.state) < 0) return createError('INVALID_MEASUREMENT_STATE', path + '.state');
    if (value.state === 'scored') {
      if (typeof value.value !== 'number' || !Number.isFinite(value.value)) return createError('INVALID_MEASUREMENT_VALUE', path + '.value');
    } else if (value.value !== null) {
      return createError('INVALID_MEASUREMENT_VALUE', path + '.value');
    }
    if (typeof value.touched !== 'boolean') return createError('INVALID_MEASUREMENT_TOUCHED', path + '.touched');
    return null;
  }

  function validateResponsePair(value, path) {
    if (!isPlainObject(value)) return createError('INVALID_RESPONSE_OBJECT', path);
    if (ALLOWED_RESPONSE_STATES.indexOf(value.state) < 0) return createError('INVALID_RESPONSE_STATE', path + '.state');
    if (typeof value.text !== 'string') return createError('INVALID_RESPONSE_TEXT', path + '.text');
    if (typeof value.draft !== 'string') return createError('INVALID_RESPONSE_DRAFT', path + '.draft');
    if (value.state === 'answered' && !value.text && !value.draft) return createError('INVALID_RESPONSE_STATE', path + '.state');
    if (value.state === 'unset' && (value.text || value.draft)) return createError('INVALID_RESPONSE_STATE', path + '.state');
    return null;
  }

  function validateFlowResponseState(value, path) {
    if (typeof value !== 'string') return createError('RESPONSE_STATE_INVALID', path);
    if (ALLOWED_FLOW_RESPONSE_STATES.indexOf(value) < 0) return createError('RESPONSE_STATE_INVALID', path);
    return null;
  }

  function validateRegularFlowMetadata(flow, routeType, path) {
    if (!isPlainObject(flow)) return createError('INVALID_CURRENT_STATE', path);
    if (flow.currentScreen !== null && (typeof flow.currentScreen !== 'string' || !flow.currentScreen || ALLOWED_SCREENS.indexOf(flow.currentScreen) < 0)) {
      return createError('RUNTIME_SCREEN_INVALID', path + '.currentScreen');
    }
    var expectedRegularFlow = deriveV17RegularFlow(flow.currentScreen, routeType);
    if (expectedRegularFlow === null) return createError('RUNTIME_SCREEN_INVALID', path + '.currentScreen');
    if (flow.activeScreen !== expectedRegularFlow.activeScreen) return createError('RUNTIME_SCREEN_INVALID', path + '.activeScreen');
    if (flow.firstResponseRole !== expectedRegularFlow.firstResponseRole) return createError('INVALID_CURRENT_STATE', path + '.firstResponseRole');
    if (flow.secondResponseRole !== expectedRegularFlow.secondResponseRole) return createError('INVALID_CURRENT_STATE', path + '.secondResponseRole');
    if (Object.prototype.hasOwnProperty.call(flow, 'questionVariant') && ALLOWED_QUESTION_VARIANTS.indexOf(flow.questionVariant) < 0) {
      return createError('INVALID_QUESTION_VARIANT', path + '.questionVariant');
    }
    return null;
  }

  function validateRouteType(routeType, path) {
    if (ALLOWED_ROUTE_TYPES.indexOf(routeType) < 0) return createError('UNKNOWN_ROUTE_TYPE', path);
    return null;
  }

  function validateEntryType(entryType, path) {
    if (ALLOWED_ENTRY_TYPES.indexOf(entryType) < 0) return createError('UNSUPPORTED_ENTRY_TYPE', path);
    return null;
  }

  function validateSessionIdentity(identity) {
    if (!isPlainObject(identity)) return createError('SESSION_IDENTITY_REQUIRED', 'identity');
    if (!isUuid(identity.sessionId)) return createError('SESSION_IDENTITY_INVALID', 'identity.sessionId');
    if (ALLOWED_SESSION_STATUSES.indexOf(identity.status) < 0) return createError('SESSION_STATUS_INVALID', 'identity.status');
    if (toIsoOrNull(identity.createdAt) === null) return createError('SESSION_TIMESTAMP_INVALID', 'identity.createdAt');
    if (identity.savedAt !== null && toIsoOrNull(identity.savedAt) === null) return createError('SESSION_TIMESTAMP_INVALID', 'identity.savedAt');
    if (identity.updatedAt !== null && toIsoOrNull(identity.updatedAt) === null) return createError('SESSION_TIMESTAMP_INVALID', 'identity.updatedAt');
    if (!Number.isInteger(identity.revision) || identity.revision < 0) return createError('SESSION_REVISION_INVALID', 'identity.revision');
    if (!isUuid(identity.cycleId)) return createError('CYCLE_ID_INVALID', 'identity.cycleId');
    if (!Number.isInteger(identity.cycleIndex) || identity.cycleIndex < 0) return createError('CYCLE_INDEX_INVALID', 'identity.cycleIndex');
    if (toIsoOrNull(identity.cycleStartedAt) === null) return createError('CYCLE_TIMESTAMP_INVALID', 'identity.cycleStartedAt');
    if (identity.resultReachedAt !== null && toIsoOrNull(identity.resultReachedAt) === null) return createError('CYCLE_TIMESTAMP_INVALID', 'identity.resultReachedAt');
    if (typeof identity.resultEventSent !== 'boolean') return createError('CYCLE_EVENT_STATE_INVALID', 'identity.resultEventSent');
    return null;
  }

  function validateSnapshotStructure(snapshot) {
    if (!isPlainObject(snapshot)) return createError('INVALID_SNAPSHOT', '');
    if (snapshot.snapshotSchemaVersion !== SCHEMA_VERSION) {
      return snapshot.snapshotSchemaVersion === undefined || snapshot.snapshotSchemaVersion === null
        ? createError('MISSING_SCHEMA_VERSION', 'snapshotSchemaVersion')
        : createError('UNSUPPORTED_SCHEMA_VERSION', 'snapshotSchemaVersion');
    }
    if (snapshot.appVersion !== APP_VERSION) return createError('INVALID_APP_VERSION', 'appVersion');
    if (!isUuid(snapshot.sessionId)) return createError('INVALID_SESSION_ID', 'sessionId');
    if (snapshot.status !== 'active') return createError('INVALID_STATUS', 'status');
    if (toIsoOrNull(snapshot.createdAt) === null) return createError('INVALID_TIMESTAMP', 'createdAt');
    if (toIsoOrNull(snapshot.savedAt) === null) return createError('INVALID_TIMESTAMP', 'savedAt');
    if (toIsoOrNull(snapshot.updatedAt) === null) return createError('INVALID_TIMESTAMP', 'updatedAt');
    if (snapshot.completedAt !== null) return createError('INVALID_COMPLETED_AT', 'completedAt');
    if (snapshot.discardedAt !== null) return createError('INVALID_DISCARDED_AT', 'discardedAt');
    if (snapshot.revision !== 0) return createError('INVALID_REVISION', 'revision');
    if (ALLOWED_SCREENS.indexOf(snapshot.currentScreen) < 0) return createError('UNSUPPORTED_SCREEN_PHASE_4A', 'currentScreen');
    if (!isPlainObject(snapshot.summary)) return createError('INVALID_SUMMARY', 'summary');
    if (!isPlainObject(snapshot.currentCycle)) return createError('INVALID_CURRENT_CYCLE', 'currentCycle');
    if (!isPlainObject(snapshot.currentState)) return createError('INVALID_CURRENT_STATE', 'currentState');
    if (snapshot.repeatState !== null) return createError('INVALID_REPEAT_STATE', 'repeatState');
    if (!Array.isArray(snapshot.resumeBackFrames) || snapshot.resumeBackFrames.length !== 0) {
      return createError('INVALID_RESUME_BACK_FRAMES', 'resumeBackFrames');
    }
    var unsafe = hasForbiddenOrUnsafeValue(snapshot, '', new WeakSet());
    if (unsafe) return unsafe;

    var summary = snapshot.summary;
    var cycle = snapshot.currentCycle;
    var state = snapshot.currentState;
    var routeError = validateRouteType(summary.routeType, 'summary.routeType');
    if (routeError) return routeError;
    var entryError = validateEntryType(summary.entryType, 'summary.entryType');
    if (entryError) return entryError;
    if (summary.locale !== null && summary.locale !== 'ja' && summary.locale !== 'en' && summary.locale !== 'zh-TW') {
      return createError('INVALID_LOCALE', 'summary.locale');
    }
    if (summary.sessionMode !== 'regular') return createError('INVALID_SESSION_MODE', 'summary.sessionMode');
    if (typeof summary.themeLabel !== 'string' && summary.themeLabel !== null) return createError('INVALID_THEME_LABEL', 'summary.themeLabel');
    if (typeof summary.subthemeLabel !== 'string' && summary.subthemeLabel !== null) return createError('INVALID_SUBTHEME_LABEL', 'summary.subthemeLabel');
    if (typeof summary.themeDescription !== 'string' && summary.themeDescription !== null) return createError('INVALID_THEME_DESCRIPTION', 'summary.themeDescription');
    if (typeof summary.categoryId !== 'string' && summary.categoryId !== null) return createError('INVALID_CATEGORY_ID', 'summary.categoryId');
    if (typeof summary.categoryLabel !== 'string' && summary.categoryLabel !== null) return createError('INVALID_CATEGORY_LABEL', 'summary.categoryLabel');
    if (typeof summary.track !== 'string' && summary.track !== null) return createError('INVALID_TRACK', 'summary.track');
    if (typeof summary.freeInputTheme !== 'string' && summary.freeInputTheme !== null) return createError('INVALID_FREE_INPUT_THEME', 'summary.freeInputTheme');
    if (typeof summary.questionId !== 'string' && summary.questionId !== null) return createError('INVALID_QUESTION_ID', 'summary.questionId');
    if (typeof summary.questionTextAtTime !== 'string' && summary.questionTextAtTime !== null) return createError('INVALID_QUESTION_TEXT', 'summary.questionTextAtTime');

    if (!isUuid(cycle.cycleId)) return createError('INVALID_CYCLE_ID', 'currentCycle.cycleId');
    if (!Number.isInteger(cycle.cycleIndex) || cycle.cycleIndex < 0) return createError('INVALID_CYCLE_INDEX', 'currentCycle.cycleIndex');
    if (toIsoOrNull(cycle.startedAt) === null) return createError('INVALID_TIMESTAMP', 'currentCycle.startedAt');
    var cycleKeysError = validateExactObjectKeys(cycle, ['cycleId', 'cycleIndex', 'startedAt', 'resultReachedAt', 'resultEventSent'], 'currentCycle', 'INVALID_CURRENT_CYCLE_KEY');
    if (cycleKeysError) return cycleKeysError;
    if (cycle.resultReachedAt !== null && toIsoOrNull(cycle.resultReachedAt) === null) return createError('INVALID_RESULT_REACHED_AT', 'currentCycle.resultReachedAt');
    if (cycle.resultEventSent !== false && cycle.resultEventSent !== true) return createError('INVALID_RESULT_EVENT_SENT', 'currentCycle.resultEventSent');
    if (!isPlainObject(state.measurement) || !isPlainObject(state.responses) || !isPlainObject(state.semanticState)) {
      return createError('INVALID_CURRENT_STATE', 'currentState');
    }
    if (state.locale !== 'ja' && state.locale !== 'en' && state.locale !== 'zh-TW') {
      return createError('INVALID_LOCALE', 'currentState.locale');
    }
    if (!isPlainObject(state.entry)) return createError('INVALID_CURRENT_STATE', 'currentState.entry');
    if (state.entry.localeAtSelection !== 'ja' && state.entry.localeAtSelection !== 'en' && state.entry.localeAtSelection !== 'zh-TW') {
      return createError('LOCALE_AT_SELECTION_REQUIRED', 'currentState.entry.localeAtSelection');
    }
    var entry = state.entry;
    var entryKeys = [
      'entryType',
      'themeId',
      'questionId',
      'themeLabel',
      'themeDescription',
      'categoryId',
      'categoryLabel',
      'trackId',
      'themeMeaning',
      'freeInputTheme',
      'questionTextAtTime',
      'localeAtSelection'
    ];
    var entryFieldError;
    for (var entryKeyIndex = 0; entryKeyIndex < entryKeys.length; entryKeyIndex += 1) {
      if (!Object.prototype.hasOwnProperty.call(entry, entryKeys[entryKeyIndex])) {
        return createError('ENTRY_STATE_INCOMPLETE', 'currentState.entry.' + entryKeys[entryKeyIndex]);
      }
    }
    var entryShapeError = validateExactObjectKeys(entry, entryKeys, 'currentState.entry', 'ENTRY_STATE_INCOMPLETE');
    if (entryShapeError) return entryShapeError;
    entryFieldError = validateEntryType(entry.entryType, 'currentState.entry.entryType');
    if (entryFieldError) return entryFieldError;
    if (typeof entry.themeLabel !== 'string' || !entry.themeLabel.trim()) return createError('ENTRY_THEME_LABEL_INVALID', 'currentState.entry.themeLabel');
    if (entry.localeAtSelection !== 'ja' && entry.localeAtSelection !== 'en' && entry.localeAtSelection !== 'zh-TW') {
      return createError('ENTRY_LOCALE_INVALID', 'currentState.entry.localeAtSelection');
    }
    var nullableEntryFields = ['themeId', 'questionId', 'themeDescription', 'categoryId', 'categoryLabel', 'trackId', 'themeMeaning', 'freeInputTheme', 'questionTextAtTime'];
    for (var nullableIndex = 0; nullableIndex < nullableEntryFields.length; nullableIndex += 1) {
      var fieldName = nullableEntryFields[nullableIndex];
      if (entry[fieldName] !== null && typeof entry[fieldName] !== 'string') {
        return createError('ENTRY_FIELD_TYPE_INVALID', 'currentState.entry.' + fieldName);
      }
    }
    if (entry.entryType === 'free_input') {
      if (entry.themeId !== null) return createError('ENTRY_CONTEXT_MISMATCH', 'currentState.entry.themeId');
      if (entry.questionId !== null) return createError('ENTRY_CONTEXT_MISMATCH', 'currentState.entry.questionId');
      if (entry.themeDescription !== null) return createError('ENTRY_CONTEXT_MISMATCH', 'currentState.entry.themeDescription');
      if (entry.themeMeaning !== null) return createError('ENTRY_CONTEXT_MISMATCH', 'currentState.entry.themeMeaning');
      if (typeof entry.freeInputTheme !== 'string' || !entry.freeInputTheme.trim()) {
        return createError('ENTRY_CONTEXT_MISMATCH', 'currentState.entry.freeInputTheme');
      }
      if (typeof entry.questionTextAtTime !== 'string' || !entry.questionTextAtTime.trim()) {
        return createError('ENTRY_CONTEXT_MISMATCH', 'currentState.entry.questionTextAtTime');
      }
    } else if (entry.entryType === 'life_theme') {
      if (typeof entry.themeId !== 'string' || !entry.themeId.trim()) return createError('ENTRY_CONTEXT_MISMATCH', 'currentState.entry.themeId');
      if (entry.questionId !== null) return createError('ENTRY_CONTEXT_MISMATCH', 'currentState.entry.questionId');
      if (entry.freeInputTheme !== null) return createError('ENTRY_CONTEXT_MISMATCH', 'currentState.entry.freeInputTheme');
      if (entry.themeDescription !== null) return createError('ENTRY_CONTEXT_MISMATCH', 'currentState.entry.themeDescription');
      if (entry.themeMeaning !== null) return createError('ENTRY_CONTEXT_MISMATCH', 'currentState.entry.themeMeaning');
      if (typeof entry.questionTextAtTime !== 'string' || !entry.questionTextAtTime.trim()) {
        return createError('ENTRY_CONTEXT_MISMATCH', 'currentState.entry.questionTextAtTime');
      }
    } else if (entry.entryType === 'spiritual_wisdom') {
      if (typeof entry.themeId !== 'string' || !entry.themeId.trim()) return createError('ENTRY_CONTEXT_MISMATCH', 'currentState.entry.themeId');
      if (entry.questionId !== null) return createError('ENTRY_CONTEXT_MISMATCH', 'currentState.entry.questionId');
      if (entry.freeInputTheme !== null) return createError('ENTRY_CONTEXT_MISMATCH', 'currentState.entry.freeInputTheme');
      if (typeof entry.questionTextAtTime !== 'string' || !entry.questionTextAtTime.trim()) {
        return createError('ENTRY_CONTEXT_MISMATCH', 'currentState.entry.questionTextAtTime');
      }
    }
    var stateBefore = validateMeasurementObject(state.measurement.before, 'currentState.measurement.before');
    if (stateBefore) return stateBefore;
    var stateAfter = validateMeasurementObject(state.measurement.after, 'currentState.measurement.after');
    if (stateAfter) return stateAfter;
    var stateRespCurrent = validateResponsePair(state.responses.current, 'currentState.responses.current');
    if (stateRespCurrent) return stateRespCurrent;
    var stateRespIdeal = validateResponsePair(state.responses.ideal, 'currentState.responses.ideal');
    if (stateRespIdeal) return stateRespIdeal;
    if (typeof state.semanticState.current !== 'string' && state.semanticState.current !== null) return createError('INVALID_CURRENT_STATE', 'currentState.semanticState.current');
    if (typeof state.semanticState.ideal !== 'string' && state.semanticState.ideal !== null) return createError('INVALID_CURRENT_STATE', 'currentState.semanticState.ideal');
    if (state.currentScreen !== snapshot.currentScreen) return createError('INVALID_CURRENT_SCREEN', 'currentState.currentScreen');
    if (ALLOWED_CURRENT_STEPS.indexOf(state.currentStep) < 0) return createError('INVALID_CURRENT_STEP', 'currentState.currentStep');
    routeError = validateRouteType(state.routeType, 'currentState.routeType');
    if (routeError) return routeError;
    entryError = validateEntryType(state.entryType, 'currentState.entryType');
    if (entryError) return entryError;
    if (!Array.isArray(state.scoreTrail) || !Array.isArray(state.awarenessTrail)) return createError('INVALID_TRAIL', 'currentState');
    if (state.deepFlow !== null) return createError('INVALID_DEEP_FLOW', 'currentState.deepFlow');
    if (state.regularFlow !== null) {
      if (!isPlainObject(state.regularFlow)) return createError('INVALID_REGULAR_FLOW', 'currentState.regularFlow');
      if (Object.prototype.hasOwnProperty.call(state.regularFlow, 'questionVariant') && ALLOWED_QUESTION_VARIANTS.indexOf(state.regularFlow.questionVariant) < 0) {
        return createError('INVALID_QUESTION_VARIANT', 'currentState.regularFlow.questionVariant');
      }
    }
    return null;
  }

  function validateV17SessionSnapshot(snapshot) {
    var cloneSnapshot;
    try {
      cloneSnapshot = deepClone(snapshot);
    } catch (e) {
      return { ok: false, error: createError('INVALID_SNAPSHOT', '') };
    }
    var error = validateSnapshotStructure(cloneSnapshot);
    if (error) return { ok: false, error: error };
    if (getSnapshotByteSize(cloneSnapshot) > MAX_BYTES) {
      return { ok: false, error: createError('SNAPSHOT_TOO_LARGE', '') };
    }
    return { ok: true, snapshot: cloneSnapshot };
  }

  function serializeV17SessionSnapshot(options) {
    options = options && typeof options === 'object' ? options : {};
    var identity = getV17SessionIdentity();
    var identityError = validateSessionIdentity(identity);
    if (identityError) return { ok: false, error: identityError };
    if (getRuntimeSessionMode() === 'deep') {
      return { ok: false, error: createError('UNSUPPORTED_SESSION_MODE_PHASE_4A', 'sessionMode') };
    }
    if (global.D && global.D.v17Flow) {
      if (global.D.v17Flow.currentScreen !== null && (typeof global.D.v17Flow.currentScreen !== 'string' || !global.D.v17Flow.currentScreen || ALLOWED_SCREENS.indexOf(global.D.v17Flow.currentScreen) < 0)) {
        return { ok: false, error: createError('RUNTIME_SCREEN_INVALID', 'v17Flow.currentScreen') };
      }
      if (global.D.v17Flow.currentScreen === null) {
        return { ok: false, error: createError('RUNTIME_SCREEN_INVALID', 'v17Flow.currentScreen') };
      }
      var responseStateError = validateRuntimeResponseStates(global.D.v17Flow, 'v17Flow.responseStates');
      if (responseStateError) return { ok: false, error: responseStateError };
      var regularFlowError = validateRegularFlowMetadata({
        currentScreen: global.D.v17Flow.currentScreen,
        activeScreen: deriveV17RegularFlow(global.D.v17Flow.currentScreen, getRuntimeRouteType()) && deriveV17RegularFlow(global.D.v17Flow.currentScreen, getRuntimeRouteType()).activeScreen,
        firstResponseRole: deriveV17RegularFlow(global.D.v17Flow.currentScreen, getRuntimeRouteType()) && deriveV17RegularFlow(global.D.v17Flow.currentScreen, getRuntimeRouteType()).firstResponseRole,
        secondResponseRole: deriveV17RegularFlow(global.D.v17Flow.currentScreen, getRuntimeRouteType()) && deriveV17RegularFlow(global.D.v17Flow.currentScreen, getRuntimeRouteType()).secondResponseRole
      }, getRuntimeRouteType(), 'v17Flow');
      if (regularFlowError) return { ok: false, error: regularFlowError };
    }
    var savedAt = toIsoOrNull(options.savedAt) || nowIso();
    var now = toIsoOrNull(options.now) || savedAt;
    var snapshot = buildSnapshot(identity, savedAt, now);
    var validated = validateV17SessionSnapshot(snapshot);
    if (!validated.ok) return validated;
    if (!identity.savedAt) identity.savedAt = validated.snapshot.savedAt;
    identity.updatedAt = validated.snapshot.updatedAt;
    return validated;
  }

  function migrateV17SessionSnapshot(input) {
    if (!isPlainObject(input)) return { ok: false, error: createError('INVALID_SNAPSHOT', '') };
    if (!Object.prototype.hasOwnProperty.call(input, 'snapshotSchemaVersion') || input.snapshotSchemaVersion === null || typeof input.snapshotSchemaVersion === 'undefined') {
      return { ok: false, error: createError('MISSING_SCHEMA_VERSION', 'snapshotSchemaVersion') };
    }
    if (input.snapshotSchemaVersion !== SCHEMA_VERSION) {
      return { ok: false, error: createError('UNSUPPORTED_SCHEMA_VERSION', 'snapshotSchemaVersion') };
    }
    var migrated = deepClone(input);
    if (migrated.currentState && isPlainObject(migrated.currentState.regularFlow)
        && !Object.prototype.hasOwnProperty.call(migrated.currentState.regularFlow, 'questionVariant')) {
      migrated.currentState.regularFlow.questionVariant = 'A';
    }
    return validateV17SessionSnapshot(migrated);
  }

  function createV17LocalSessionRecord(snapshot, sync) {
    var validatedSnapshot = validateV17SessionSnapshot(snapshot);
    if (!validatedSnapshot.ok) return validatedSnapshot;
    var record = {
      storageSchemaVersion: 1,
      snapshot: validatedSnapshot.snapshot,
      sync: {
        ownerUserId: null,
        pendingSync: false,
        serverRevision: 0,
        lastSyncedAt: null,
        lastErrorCode: null
      }
    };
    if (isPlainObject(sync)) {
      if (Object.prototype.hasOwnProperty.call(sync, 'ownerUserId')) record.sync.ownerUserId = sync.ownerUserId === null ? null : normalizeNullableText(sync.ownerUserId);
      if (Object.prototype.hasOwnProperty.call(sync, 'pendingSync')) record.sync.pendingSync = !!sync.pendingSync;
      if (Object.prototype.hasOwnProperty.call(sync, 'serverRevision')) {
        record.sync.serverRevision = Number.isInteger(sync.serverRevision) && sync.serverRevision >= 0 ? sync.serverRevision : null;
      }
      if (Object.prototype.hasOwnProperty.call(sync, 'lastSyncedAt')) {
        record.sync.lastSyncedAt = sync.lastSyncedAt === null ? null : toIsoOrNull(sync.lastSyncedAt);
      }
      if (Object.prototype.hasOwnProperty.call(sync, 'lastErrorCode')) {
        record.sync.lastErrorCode = sync.lastErrorCode === null ? null : normalizeNullableText(sync.lastErrorCode);
      }
    }
    if (record.sync.serverRevision === null || (record.sync.lastSyncedAt === undefined) || (record.sync.lastErrorCode === undefined)) {
      return { ok: false, error: createError('INVALID_SYNC_STATE', 'sync') };
    }
    return validateV17LocalSessionRecord(record);
  }

  function validateV17LocalSessionRecord(record) {
    if (!isPlainObject(record)) return { ok: false, error: createError('INVALID_LOCAL_RECORD', '') };
    if (record.storageSchemaVersion !== 1) {
      return record.storageSchemaVersion === undefined || record.storageSchemaVersion === null
        ? { ok: false, error: createError('MISSING_SCHEMA_VERSION', 'storageSchemaVersion') }
        : { ok: false, error: createError('UNSUPPORTED_SCHEMA_VERSION', 'storageSchemaVersion') };
    }
    var snapshotResult = validateV17SessionSnapshot(record.snapshot);
    if (!snapshotResult.ok) return snapshotResult;
    if (!isPlainObject(record.sync)) return { ok: false, error: createError('INVALID_SYNC_STATE', 'sync') };
    var sync = record.sync;
    if (sync.ownerUserId !== null && typeof sync.ownerUserId !== 'string') return { ok: false, error: createError('INVALID_SYNC_STATE', 'sync.ownerUserId') };
    if (typeof sync.pendingSync !== 'boolean') return { ok: false, error: createError('INVALID_SYNC_STATE', 'sync.pendingSync') };
    if (!Number.isInteger(sync.serverRevision) || sync.serverRevision < 0) return { ok: false, error: createError('INVALID_SYNC_STATE', 'sync.serverRevision') };
    if (sync.lastSyncedAt !== null && toIsoOrNull(sync.lastSyncedAt) === null) return { ok: false, error: createError('INVALID_SYNC_STATE', 'sync.lastSyncedAt') };
    if (sync.lastErrorCode !== null && typeof sync.lastErrorCode !== 'string') return { ok: false, error: createError('INVALID_SYNC_STATE', 'sync.lastErrorCode') };
    return { ok: true, record: deepClone(record) };
  }

  function readV17LocalSessionRecord() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ok: true, record: null };
      var parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        return { ok: false, error: createError('INVALID_LOCAL_RECORD', 'storage') };
      }
      return validateV17LocalSessionRecord(parsed);
    } catch (e) {
      return { ok: false, error: createError('LOCAL_STORAGE_READ_FAILED', 'storage') };
    }
  }

  function restoreV17SessionRuntime(snapshot) {
    var validatedSnapshot = validateV17SessionSnapshot(snapshot);
    if (!validatedSnapshot.ok) {
      return { ok: false, error: createError('RESTORE_SNAPSHOT_INVALID', validatedSnapshot.error ? validatedSnapshot.error.path : '') };
    }
    snapshot = validatedSnapshot.snapshot;
    if (!isPlainObject(snapshot.summary) || snapshot.summary.sessionMode !== 'regular') {
      return { ok: false, error: createError('RESTORE_DEEP_NOT_SUPPORTED', 'summary.sessionMode') };
    }
    if (!isPlainObject(snapshot.currentState)) {
      return { ok: false, error: createError('RESTORE_SNAPSHOT_INVALID', 'currentState') };
    }
    var routeType = snapshot.currentState.routeType;
    var regularFlow = deriveV17RegularFlow(snapshot.currentScreen, routeType);
    var isSessionModeOrBefore = snapshot.currentScreen === 's-v17-session-mode' || snapshot.currentScreen === 's-v17-before';
    if (!regularFlow && !isSessionModeOrBefore) {
      return { ok: false, error: createError('RESTORE_DEEP_NOT_SUPPORTED', 'currentScreen') };
    }
    var regularFlowSnapshot = snapshot.currentState.regularFlow;
    if (regularFlow && (!isPlainObject(regularFlowSnapshot) ||
      regularFlowSnapshot.activeScreen !== regularFlow.activeScreen ||
      regularFlowSnapshot.firstResponseRole !== regularFlow.firstResponseRole ||
      regularFlowSnapshot.secondResponseRole !== regularFlow.secondResponseRole)) {
      return { ok: false, error: createError('RESTORE_REGULAR_FLOW_MISMATCH', 'currentState.regularFlow') };
    }
    var questionVariant = regularFlow ? normalizeV17QuestionVariant(regularFlowSnapshot.questionVariant) : 'A';
    var entry = snapshot.currentState.entry;
    if (!isPlainObject(entry)) return { ok: false, error: createError('RESTORE_SNAPSHOT_INVALID', 'currentState.entry') };
    var responseCurrent = snapshot.currentState.responses && snapshot.currentState.responses.current;
    var responseIdeal = snapshot.currentState.responses && snapshot.currentState.responses.ideal;
    if (!isPlainObject(snapshot.currentCycle)) return { ok: false, error: createError('RESTORE_SNAPSHOT_INVALID', 'currentCycle') };
    var staged = {};
    var stagedFlow = {};
    staged.v17SessionIdentity = deepClone(snapshot.currentCycle);
    staged.v17SessionIdentity.sessionId = snapshot.sessionId;
    staged.v17SessionIdentity.status = snapshot.status;
    staged.v17SessionIdentity.createdAt = snapshot.createdAt;
    staged.v17SessionIdentity.savedAt = snapshot.savedAt;
    staged.v17SessionIdentity.updatedAt = snapshot.updatedAt;
    staged.v17SessionIdentity.revision = snapshot.revision;
    staged.v17SessionIdentity.cycleId = snapshot.currentCycle.cycleId;
    staged.v17SessionIdentity.cycleIndex = snapshot.currentCycle.cycleIndex;
    staged.v17SessionIdentity.cycleStartedAt = snapshot.currentCycle.startedAt;
    staged.v17SessionIdentity.resultReachedAt = snapshot.currentCycle.resultReachedAt;
    staged.v17SessionIdentity.resultEventSent = snapshot.currentCycle.resultEventSent;
    staged.v17SessionIdentity.status = 'active';
    staged.currentScreen = snapshot.currentScreen;
    staged.v17SessionMode = snapshot.summary.sessionMode || null;
    staged.themeSource = entry.entryType === 'free_input'
      ? (entry.categoryId === 'custom' ? 'customCategoryFreeInput' : 'categoryFreeInput')
      : entry.entryType === 'life_theme'
        ? 'themeLibrary'
        : entry.entryType === 'spiritual_wisdom'
          ? 'spiritual-wisdom'
          : null;
    if (!staged.themeSource) return { ok: false, error: createError('RESTORE_SNAPSHOT_INVALID', 'currentState.entry.entryType') };
    staged.themeId = entry.themeId;
    staged.questionId = entry.questionId;
    staged.theme = entry.themeLabel;
    staged.themeMeaning = entry.themeMeaning;
    staged.themeCategoryId = entry.categoryId;
    staged.themeCategoryLabelAtTime = entry.categoryLabel;
    staged.themeTrackId = entry.trackId;
    staged.freeInputTheme = entry.freeInputTheme;
    staged.questionTextAtTime = entry.questionTextAtTime;
    staged.localeAtTime = entry.localeAtSelection;
    staged.v17MeasurementState = {
      before: deepClone(snapshot.currentState.measurement.before),
      after: deepClone(snapshot.currentState.measurement.after)
    };
    staged.initialThemeScore = snapshot.currentState.measurement.before.state === 'scored' ? snapshot.currentState.measurement.before.value : null;
    staged.finalThemeScore = snapshot.currentState.measurement.after.state === 'scored' ? snapshot.currentState.measurement.after.value : null;
    staged.currentState = responseCurrent && typeof responseCurrent.text === 'string' ? responseCurrent.text : '';
    staged.currentStateText = responseCurrent && typeof responseCurrent.text === 'string' ? responseCurrent.text : '';
    staged.currentStateDraft = responseCurrent && typeof responseCurrent.draft === 'string' ? responseCurrent.draft : '';
    staged.idealState = responseIdeal && typeof responseIdeal.text === 'string' ? responseIdeal.text : '';
    staged.idealStateText = responseIdeal && typeof responseIdeal.text === 'string' ? responseIdeal.text : '';
    staged.idealStateDraft = responseIdeal && typeof responseIdeal.draft === 'string' ? responseIdeal.draft : '';
    staged.responseStates = {
      current: responseCurrent && responseCurrent.state ? responseCurrent.state : 'unset',
      ideal: responseIdeal && responseIdeal.state ? responseIdeal.state : 'unset'
    };
    stagedFlow.currentScreen = snapshot.currentScreen;
    stagedFlow.currentStep = snapshot.currentState.currentStep;
    stagedFlow.questionVariant = questionVariant;
    stagedFlow.routeType = routeType;
    stagedFlow.responseStates = {
      current: staged.responseStates.current,
      ideal: staged.responseStates.ideal
    };
    stagedFlow.step2Text = staged.currentState;
    stagedFlow.step2Draft = staged.currentStateDraft;
    stagedFlow.step3Text = staged.idealState;
    stagedFlow.step3Draft = staged.idealStateDraft;
    stagedFlow.currentState = staged.currentState;
    stagedFlow.currentStateText = staged.currentStateText;
    stagedFlow.currentStateDraft = staged.currentStateDraft;
    stagedFlow.idealState = staged.idealState;
    stagedFlow.idealStateText = staged.idealStateText;
    stagedFlow.idealStateDraft = staged.idealStateDraft;
    stagedFlow.activeScreen = regularFlow ? regularFlow.activeScreen : null;
    stagedFlow.firstResponseRole = regularFlow ? regularFlow.firstResponseRole : null;
    stagedFlow.secondResponseRole = regularFlow ? regularFlow.secondResponseRole : null;
    staged.v17Flow = stagedFlow;
    if (!global.D || typeof global.D !== 'object') {
      return { ok: false, error: createError('RESTORE_SNAPSHOT_INVALID', 'runtime') };
    }
    global.D.v17SessionIdentity = staged.v17SessionIdentity;
    global.D.v17SessionMode = staged.v17SessionMode;
    global.D.themeSource = staged.themeSource;
    global.D.themeId = staged.themeId;
    global.D.questionId = staged.questionId;
    global.D.theme = staged.theme;
    global.D.themeMeaning = staged.themeMeaning;
    global.D.themeCategoryId = staged.themeCategoryId;
    global.D.themeCategoryLabelAtTime = staged.themeCategoryLabelAtTime;
    global.D.themeTrackId = staged.themeTrackId;
    global.D.freeInputTheme = staged.freeInputTheme;
    global.D.questionTextAtTime = staged.questionTextAtTime;
    global.D.localeAtTime = staged.localeAtTime;
    global.D.v17MeasurementState = staged.v17MeasurementState;
    global.D.initialThemeScore = staged.initialThemeScore;
    global.D.finalThemeScore = staged.finalThemeScore;
    global.D.currentState = staged.currentState;
    global.D.currentStateText = staged.currentStateText;
    global.D.currentStateDraft = staged.currentStateDraft;
    global.D.idealState = staged.idealState;
    global.D.idealStateText = staged.idealStateText;
    global.D.idealStateDraft = staged.idealStateDraft;
    global.D.v17Flow = global.D.v17Flow && typeof global.D.v17Flow === 'object' ? global.D.v17Flow : {};
    global.D.v17Flow.currentScreen = stagedFlow.currentScreen;
    global.D.v17Flow.currentStep = stagedFlow.currentStep;
    global.D.v17Flow.questionVariant = stagedFlow.questionVariant;
    global.D.v17Flow.routeType = stagedFlow.routeType;
    global.D.v17Flow.responseStates = stagedFlow.responseStates;
    global.D.v17Flow.step2Text = stagedFlow.step2Text;
    global.D.v17Flow.step2Draft = stagedFlow.step2Draft;
    global.D.v17Flow.step3Text = stagedFlow.step3Text;
    global.D.v17Flow.step3Draft = stagedFlow.step3Draft;
    global.D.v17Flow.currentState = stagedFlow.currentState;
    global.D.v17Flow.currentStateText = stagedFlow.currentStateText;
    global.D.v17Flow.currentStateDraft = stagedFlow.currentStateDraft;
    global.D.v17Flow.idealState = stagedFlow.idealState;
    global.D.v17Flow.idealStateText = stagedFlow.idealStateText;
    global.D.v17Flow.idealStateDraft = stagedFlow.idealStateDraft;
    global.D.v17Flow.activeScreen = stagedFlow.activeScreen;
    global.D.v17Flow.firstResponseRole = stagedFlow.firstResponseRole;
    global.D.v17Flow.secondResponseRole = stagedFlow.secondResponseRole;
    return {
      ok: true,
      sessionId: snapshot.sessionId,
      currentScreen: snapshot.currentScreen,
      sessionMode: snapshot.summary.sessionMode,
      appliedGroups: ['identity', 'entry', 'mode_route_screen', 'measurement', 'responses', 'regularFlow']
    };
  }

  function resumeGuestV17RegularFromLocalRecord() {
    var readResult = readV17LocalSessionRecord();
    if (!readResult.ok) {
      if (readResult.error && readResult.error.code === 'LOCAL_STORAGE_READ_FAILED') {
        return { ok: false, error: createError('LOCAL_RECORD_INVALID', readResult.error.path || 'storage') };
      }
      return { ok: false, error: createError('LOCAL_RECORD_INVALID', readResult.error && readResult.error.path ? readResult.error.path : 'storage') };
    }
    if (!readResult.record) return { ok: false, error: createError('LOCAL_RECORD_NOT_FOUND', 'storage') };
    var validatedRecord = validateV17LocalSessionRecord(readResult.record);
    if (!validatedRecord.ok) {
      if (validatedRecord.error && validatedRecord.error.code === 'UNSUPPORTED_SCHEMA_VERSION') {
        return { ok: false, error: createError('LOCAL_STORAGE_SCHEMA_UNSUPPORTED', validatedRecord.error.path || 'storageSchemaVersion') };
      }
      if (validatedRecord.error && validatedRecord.error.code === 'MISSING_SCHEMA_VERSION') {
        return { ok: false, error: createError('LOCAL_STORAGE_SCHEMA_UNSUPPORTED', validatedRecord.error.path || 'storageSchemaVersion') };
      }
      return { ok: false, error: createError('LOCAL_RECORD_INVALID', validatedRecord.error ? validatedRecord.error.path : 'storage') };
    }
    if (validatedRecord.record.sync.ownerUserId !== null) {
      return { ok: false, error: createError('LOCAL_RECORD_NOT_GUEST', 'sync.ownerUserId') };
    }
    if (validatedRecord.record.snapshot.status !== 'active') {
      return { ok: false, error: createError('LOCAL_RECORD_NOT_ACTIVE', 'snapshot.status') };
    }
    var migrated = migrateV17SessionSnapshot(validatedRecord.record.snapshot);
    if (!migrated.ok) {
      if (migrated.error && migrated.error.code === 'UNSUPPORTED_SCHEMA_VERSION') {
        return { ok: false, error: createError('LOCAL_STORAGE_SCHEMA_UNSUPPORTED', migrated.error.path || 'snapshotSchemaVersion') };
      }
      if (migrated.error && migrated.error.code === 'UNSUPPORTED_SCREEN_PHASE_4A') {
        return { ok: false, error: createError('RESTORE_SCREEN_NOT_SUPPORTED', migrated.error.path || 'currentScreen') };
      }
      if (migrated.error && migrated.error.code === 'UNSUPPORTED_SESSION_MODE_PHASE_4A') {
        return { ok: false, error: createError('RESTORE_DEEP_NOT_SUPPORTED', migrated.error.path || 'summary.sessionMode') };
      }
      return { ok: false, error: createError('LOCAL_RECORD_INVALID', migrated.error ? migrated.error.path : 'snapshot') };
    }
    var resumeResult = global.resumeV17RegularSnapshotToScreen(migrated.snapshot);
    return resumeResult && resumeResult.ok
      ? {
        ok: true,
        source: 'guest-local',
        sessionId: resumeResult.sessionId,
        currentScreen: resumeResult.currentScreen,
        sessionMode: resumeResult.sessionMode
      }
      : resumeResult;
  }

  function writeV17LocalSessionRecord(record) {
    var validated = validateV17LocalSessionRecord(record);
    if (!validated.ok) return validated;
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(validated.record));
      return { ok: true, record: validated.record };
    } catch (e) {
      return { ok: false, error: createError('LOCAL_STORAGE_WRITE_FAILED', 'storage') };
    }
  }

  function removeV17LocalSessionRecord() {
    try {
      global.localStorage.removeItem(STORAGE_KEY);
      return { ok: true, removed: true };
    } catch (e) {
      return { ok: false, error: createError('LOCAL_STORAGE_REMOVE_FAILED', 'storage') };
    }
  }

  var constants = Object.freeze({
    STORAGE_KEY: STORAGE_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    APP_VERSION: APP_VERSION,
    MAX_BYTES: MAX_BYTES,
    ALLOWED_SCREENS: ALLOWED_SCREENS.slice(),
    ALLOWED_ENTRY_TYPES: ALLOWED_ENTRY_TYPES.slice(),
    ALLOWED_ROUTE_TYPES: ALLOWED_ROUTE_TYPES.slice(),
    ALLOWED_MEASUREMENT_STATES: ALLOWED_MEASUREMENT_STATES.slice(),
    ALLOWED_RESPONSE_STATES: ALLOWED_RESPONSE_STATES.slice()
  });

  global.NoetuneV17SessionSnapshot = Object.freeze({
    constants: constants,
    createV17SessionIdentity: createV17SessionIdentity,
    getV17SessionIdentity: getV17SessionIdentity,
    startNewV17SessionIdentity: startNewV17SessionIdentity,
    serializeV17SessionSnapshot: serializeV17SessionSnapshot,
    validateV17SessionSnapshot: validateV17SessionSnapshot,
    migrateV17SessionSnapshot: migrateV17SessionSnapshot,
    createV17LocalSessionRecord: createV17LocalSessionRecord,
    validateV17LocalSessionRecord: validateV17LocalSessionRecord,
    readV17LocalSessionRecord: readV17LocalSessionRecord,
    writeV17LocalSessionRecord: writeV17LocalSessionRecord,
    removeV17LocalSessionRecord: removeV17LocalSessionRecord,
    getV17SnapshotByteSize: getSnapshotByteSize,
    restoreV17SessionRuntime: restoreV17SessionRuntime,
    resumeGuestV17RegularFromLocalRecord: resumeGuestV17RegularFromLocalRecord
  });
})(window);
