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
  var ALLOWED_ENTRY_TYPES = ['life_theme', 'free_input', 'spiritual_wisdom'];
  var ALLOWED_ROUTE_TYPES = ['problem', 'ideal', 'spiritual'];
  var ALLOWED_MEASUREMENT_STATES = ['scored', 'not_a_problem', 'skipped', 'unset'];
  var ALLOWED_RESPONSE_STATES = ['answered', 'unset'];
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
    var value = typeof global.cur === 'string' ? global.cur : '';
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
    if (themeSource === 'freeInput') return 'free_input';
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

  function normalizeV17Locale(value) {
    return value === 'ja' || value === 'en' || value === 'zh-TW' ? value : null;
  }

  function getActiveScreenBucket(screenId) {
    return screenId === 's-v17-second-response' ? 'second' : 'first';
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
    var themeId = global.D && global.D.themeId ? global.D.themeId : null;
    var questionId = global.D && global.D.questionId ? global.D.questionId : null;
    var questionTextAtTime = normalizeNullableText(global.D && global.D.questionTextAtTime);
    var categoryId = normalizeNullableText(global.D && global.D.themeCategoryId);
    var categoryLabel = normalizeNullableText(global.D && global.D.themeCategoryLabelAtTime);
    var track = normalizeNullableText(global.D && global.D.themeTrackId);
    var themeDescription = normalizeNullableText(global.D && global.D.themeMeaning);
    var freeInputTheme = normalizeNullableText(global.D && global.D.freeInputTheme);
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
    var currentResponse = responseRoles.first === 'current' ? firstPair : secondPair;
    var idealResponse = responseRoles.first === 'ideal' ? firstPair : secondPair;
    var currentCycle = {
      cycleId: identity.cycleId,
      cycleIndex: identity.cycleIndex,
      startedAt: identity.cycleStartedAt,
      resultReachedAt: null,
      resultEventSent: false
    };
    var currentState = {
      currentScreen: screenId,
      currentStep: currentStep,
      routeType: routeType,
      entryType: entryType,
      locale: currentLocale,
      entry: {
        localeAtSelection: selectionLocale
      },
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
      regularFlow: {
        activeScreen: getActiveScreenBucket(screenId),
        firstResponseRole: responseRoles.first,
        secondResponseRole: responseRoles.second
      },
      scoreTrail: scoreTrail,
      awarenessTrail: awarenessTrail,
      deepFlow: null
    };
    return {
      snapshotSchemaVersion: SCHEMA_VERSION,
      appVersion: APP_VERSION,
      sessionId: identity.sessionId,
      status: 'active',
      createdAt: identity.createdAt,
      savedAt: savedAt,
      updatedAt: now,
      completedAt: null,
      discardedAt: null,
      revision: 0,
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

  function validateRouteType(routeType, path) {
    if (ALLOWED_ROUTE_TYPES.indexOf(routeType) < 0) return createError('UNKNOWN_ROUTE_TYPE', path);
    return null;
  }

  function validateEntryType(entryType, path) {
    if (ALLOWED_ENTRY_TYPES.indexOf(entryType) < 0) return createError('UNSUPPORTED_ENTRY_TYPE', path);
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
    var identity = options.identity && typeof options.identity === 'object' ? options.identity : null;
    if (!identity || !isUuid(identity.sessionId) || !isUuid(identity.cycleId) || !Number.isInteger(identity.cycleIndex) || identity.cycleIndex < 0) {
      return { ok: false, error: createError('IDENTITY_REQUIRED', 'identity') };
    }
    if (toIsoOrNull(identity.createdAt) === null || toIsoOrNull(identity.cycleStartedAt) === null) {
      return { ok: false, error: createError('IDENTITY_REQUIRED', 'identity') };
    }
    if (getRuntimeSessionMode() === 'deep') {
      return { ok: false, error: createError('UNSUPPORTED_SESSION_MODE_PHASE_4A', 'sessionMode') };
    }
    var savedAt = toIsoOrNull(options.savedAt) || nowIso();
    var now = toIsoOrNull(options.now) || savedAt;
    var snapshot = buildSnapshot({
      sessionId: identity.sessionId,
      cycleId: identity.cycleId,
      cycleIndex: identity.cycleIndex,
      createdAt: toIsoOrNull(identity.createdAt),
      cycleStartedAt: toIsoOrNull(identity.cycleStartedAt)
    }, savedAt, now);
    return validateV17SessionSnapshot(snapshot);
  }

  function migrateV17SessionSnapshot(input) {
    if (!isPlainObject(input)) return { ok: false, error: createError('INVALID_SNAPSHOT', '') };
    if (!Object.prototype.hasOwnProperty.call(input, 'snapshotSchemaVersion') || input.snapshotSchemaVersion === null || typeof input.snapshotSchemaVersion === 'undefined') {
      return { ok: false, error: createError('MISSING_SCHEMA_VERSION', 'snapshotSchemaVersion') };
    }
    if (input.snapshotSchemaVersion !== SCHEMA_VERSION) {
      return { ok: false, error: createError('UNSUPPORTED_SCHEMA_VERSION', 'snapshotSchemaVersion') };
    }
    return validateV17SessionSnapshot(input);
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
    serializeV17SessionSnapshot: serializeV17SessionSnapshot,
    validateV17SessionSnapshot: validateV17SessionSnapshot,
    migrateV17SessionSnapshot: migrateV17SessionSnapshot,
    createV17LocalSessionRecord: createV17LocalSessionRecord,
    validateV17LocalSessionRecord: validateV17LocalSessionRecord,
    readV17LocalSessionRecord: readV17LocalSessionRecord,
    writeV17LocalSessionRecord: writeV17LocalSessionRecord,
    removeV17LocalSessionRecord: removeV17LocalSessionRecord,
    getV17SnapshotByteSize: getSnapshotByteSize
  });
})(window);
