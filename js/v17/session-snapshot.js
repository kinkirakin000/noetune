(function(global) {
  'use strict';

  var STORAGE_KEY = 'noetune:v17:active-session:v1';
  var CURRENT_SNAPSHOT_SCHEMA_VERSION = 1;
  var SCHEMA_VERSION = CURRENT_SNAPSHOT_SCHEMA_VERSION;
  var APP_VERSION = 'v17';
  var MAX_BYTES = 1024 * 1024;
  var MAX_RESUME_BACK_FRAMES = 3;
  var SCHEMA_KNOWN_SCREENS = [
    's-v17-session-mode',
    's-v17-before',
    's-v17-first-response',
    's-v17-second-response',
    's-v17-deep-response',
    's-v17-deep-feel-100',
    's-v17-breath',
    's-v17-final-measure',
    's-result'
  ];
  var SERIALIZABLE_SCREENS = [
    's-v17-session-mode',
    's-v17-before',
    's-v17-first-response',
    's-v17-second-response',
    's-v17-deep-response',
    's-v17-breath'
  ];
  var RESTORABLE_SCREENS = [
    's-v17-session-mode',
    's-v17-before',
    's-v17-first-response',
    's-v17-second-response',
    's-v17-deep-response',
    's-v17-breath'
  ];
  var SCHEMA_VALIDATABLE_SCREENS = SERIALIZABLE_SCREENS.concat(['s-v17-deep-response']);
  var ALLOWED_SESSION_STATUSES = ['active', 'completed', 'discarded'];
  var ALLOWED_ENTRY_TYPES = ['life_theme', 'free_input', 'spiritual_wisdom'];
  var ALLOWED_ROUTE_TYPES = ['problem', 'ideal', 'spiritual'];
  var ALLOWED_MEASUREMENT_STATES = ['scored', 'not_a_problem', 'skipped', 'unset'];
  var ALLOWED_RESPONSE_STATES = ['answered', 'skipped', 'unset'];
  var ALLOWED_FLOW_RESPONSE_STATES = ['answered', 'skipped', 'unset'];
  var ALLOWED_QUESTION_VARIANTS = ['A', 'B'];
  var ALLOWED_REGULAR_FLOW_ACTIVE_SCREENS = ['first', 'second', 'completed'];
  var ALLOWED_REGULAR_FLOW_RESPONSE_ROLES = ['current', 'ideal'];
  var ALLOWED_CURRENT_STEPS = ['session-mode', 'before', 'first-response', 'second-response', 'step1', 'step2', 'step3', 'step4.first', 'step4.second', 'deep.question1', 'deep.question2'];
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

  function isV17LocaleLeaf(value) {
    return typeof value === 'string' && ['ja', 'en', 'zh-TW'].indexOf(value) >= 0;
  }

  function isV17RouteTypeLeaf(value) {
    return typeof value === 'string' && ALLOWED_ROUTE_TYPES.indexOf(value) >= 0;
  }

  function isV17EntryTypeLeaf(value) {
    return typeof value === 'string' && ALLOWED_ENTRY_TYPES.indexOf(value) >= 0;
  }

  function isV17FiniteNumberLeaf(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function isV17NullableFiniteNumberLeaf(value) {
    return value === null || isV17FiniteNumberLeaf(value);
  }

  function isV17BooleanLeaf(value) {
    return typeof value === 'boolean';
  }

  function isV17MeasurementV1Leaf(value) {
    if (!isPlainObject(value)) return false;
    if (!Object.prototype.hasOwnProperty.call(value, 'state') ||
        !Object.prototype.hasOwnProperty.call(value, 'value') ||
        !Object.prototype.hasOwnProperty.call(value, 'touched')) return false;
    if (validateExactObjectKeys(value, ['state', 'value', 'touched'], '', 'INVALID_MEASUREMENT_OBJECT')) return false;
    if (ALLOWED_MEASUREMENT_STATES.indexOf(value.state) < 0) return false;
    if (!isV17BooleanLeaf(value.touched)) return false;
    if (value.state === 'scored') return isV17FiniteNumberLeaf(value.value);
    return value.value === null;
  }

  function isV17ResponseValueV1Leaf(value) {
    if (!isPlainObject(value)) return false;
    if (!Object.prototype.hasOwnProperty.call(value, 'state') ||
        !Object.prototype.hasOwnProperty.call(value, 'text') ||
        !Object.prototype.hasOwnProperty.call(value, 'draft')) return false;
    if (validateExactObjectKeys(value, ['state', 'text', 'draft'], '', 'INVALID_RESPONSE_OBJECT')) return false;
    if (ALLOWED_RESPONSE_STATES.indexOf(value.state) < 0) return false;
    if (typeof value.text !== 'string' || typeof value.draft !== 'string') return false;
    if (value.state === 'answered') return !!value.text || !!value.draft;
    if (value.state === 'unset') return !value.text && !value.draft;
    return true;
  }

  function isV17RegularFlowV1Leaf(value) {
    if (!isPlainObject(value)) return false;
    var requiredKeys = ['activeScreen', 'questionVariant', 'firstResponseRole', 'secondResponseRole'];
    for (var i = 0; i < requiredKeys.length; i += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, requiredKeys[i])) return false;
    }
    if (validateExactObjectKeys(value, requiredKeys, '', 'INVALID_REGULAR_FLOW')) return false;
    if (ALLOWED_REGULAR_FLOW_ACTIVE_SCREENS.indexOf(value.activeScreen) < 0) return false;
    if (ALLOWED_QUESTION_VARIANTS.indexOf(value.questionVariant) < 0) return false;
    if (ALLOWED_REGULAR_FLOW_RESPONSE_ROLES.indexOf(value.firstResponseRole) < 0) return false;
    if (ALLOWED_REGULAR_FLOW_RESPONSE_ROLES.indexOf(value.secondResponseRole) < 0) return false;
    return true;
  }

  function isV17CurrentCycleV1Leaf(value) {
    if (!isPlainObject(value)) return false;
    var requiredKeys = ['cycleId', 'cycleIndex', 'startedAt', 'resultReachedAt', 'resultEventSent'];
    for (var i = 0; i < requiredKeys.length; i += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, requiredKeys[i])) return false;
    }
    if (validateExactObjectKeys(value, requiredKeys, '', 'INVALID_CURRENT_CYCLE')) return false;
    if (!isUuid(value.cycleId)) return false;
    if (!Number.isInteger(value.cycleIndex) || value.cycleIndex < 0) return false;
    if (typeof value.startedAt !== 'string' || toIsoOrNull(value.startedAt) === null) return false;
    if (value.resultReachedAt !== null && (typeof value.resultReachedAt !== 'string' || toIsoOrNull(value.resultReachedAt) === null)) return false;
    if (!isV17BooleanLeaf(value.resultEventSent)) return false;
    return true;
  }

  function isV17EntryStateV1Leaf(value) {
    if (!isPlainObject(value)) return false;
    var requiredKeys = [
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
    for (var i = 0; i < requiredKeys.length; i += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, requiredKeys[i])) return false;
    }
    if (validateExactObjectKeys(value, requiredKeys, '', 'INVALID_ENTRY_STATE')) return false;
    if (!isV17EntryTypeLeaf(value.entryType)) return false;
    if (typeof value.themeLabel !== 'string' || !value.themeLabel.trim()) return false;
    if (!isV17LocaleLeaf(value.localeAtSelection)) return false;
    var nullableStringKeys = [
      'themeId',
      'questionId',
      'themeDescription',
      'categoryId',
      'categoryLabel',
      'trackId',
      'themeMeaning',
      'freeInputTheme',
      'questionTextAtTime'
    ];
    for (var nullableIndex = 0; nullableIndex < nullableStringKeys.length; nullableIndex += 1) {
      var fieldName = nullableStringKeys[nullableIndex];
      if (value[fieldName] !== null && typeof value[fieldName] !== 'string') return false;
    }
    return true;
  }

  function isV17StrictPlainObject(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    var prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function validateV17ResumeBackFrameEnvelope(frame, path) {
    path = path || 'resumeBackFrames';
    if (!isV17StrictPlainObject(frame)) return createError('INVALID_RESUME_BACK_FRAME', path);
    var requiredKeys = ['frameType', 'sessionMode', 'screenId', 'currentStep', 'state'];
    for (var r = 0; r < requiredKeys.length; r += 1) {
      if (!Object.prototype.hasOwnProperty.call(frame, requiredKeys[r])) {
        return createError('INVALID_RESUME_BACK_FRAME', path + '.' + requiredKeys[r]);
      }
    }
    var keysError = validateExactObjectKeys(frame, ['frameType', 'sessionMode', 'screenId', 'currentStep', 'state'], path, 'INVALID_RESUME_BACK_FRAME');
    if (keysError) return keysError;
    if ((frame.frameType !== 'regular-response' && frame.frameType !== 'deep-response') ||
        (frame.sessionMode !== 'regular' && frame.sessionMode !== 'deep')) return createError('INVALID_RESUME_BACK_FRAME', path);
    if ((frame.frameType === 'regular-response' && frame.sessionMode !== 'regular') ||
        (frame.frameType === 'deep-response' && frame.sessionMode !== 'deep')) return createError('INVALID_RESUME_BACK_FRAME', path);
    if (typeof frame.screenId !== 'string' || (frame.frameType === 'deep-response' ? frame.screenId !== 's-v17-deep-response' :
      frame.screenId !== 's-v17-first-response' && frame.screenId !== 's-v17-second-response')) {
      return createError('INVALID_RESUME_BACK_FRAME_SCREEN', path + '.screenId');
    }
    if (typeof frame.currentStep !== 'string' || !frame.currentStep) return createError('INVALID_RESUME_BACK_FRAME_STATE', path + '.currentStep');
    if (!isV17StrictPlainObject(frame.state)) return createError('INVALID_RESUME_BACK_FRAME_STATE', path + '.state');
    if (frame.frameType === 'deep-response') {
      if (validateExactObjectKeys(frame.state, ['routeType', 'deepFlow'], path + '.state', 'INVALID_RESUME_BACK_FRAME_STATE')) {
        return createError('INVALID_RESUME_BACK_FRAME_STATE', path + '.state');
      }
      var deepError = validateDeepFlowV1(frame.state.deepFlow, path + '.state.deepFlow', frame.state.routeType);
      if (deepError) return deepError;
      if (frame.currentStep !== 'deep.' + frame.state.deepFlow.phase || frame.state.deepFlow.finished !== false) return createError('INVALID_RESUME_BACK_FRAME_STATE', path);
    } else {
      var regularKeysError = validateExactObjectKeys(frame.state, ['routeType', 'regularFlow', 'responses', 'semanticState'], path + '.state', 'INVALID_RESUME_BACK_FRAME_STATE');
      if (regularKeysError) return regularKeysError;
      if (ALLOWED_ROUTE_TYPES.indexOf(frame.state.routeType) < 0 || !isPlainObject(frame.state.regularFlow) ||
          !isPlainObject(frame.state.responses) || !isPlainObject(frame.state.semanticState)) return createError('INVALID_RESUME_BACK_FRAME_STATE', path + '.state');
      var expectedRegular = deriveV17RegularFlow(frame.screenId, frame.state.routeType);
      if (!expectedRegular || frame.currentStep !== (frame.screenId === 's-v17-first-response' ? 'step2' : 'step3') ||
          frame.state.regularFlow.activeScreen !== expectedRegular.activeScreen ||
          frame.state.regularFlow.firstResponseRole !== expectedRegular.firstResponseRole ||
          frame.state.regularFlow.secondResponseRole !== expectedRegular.secondResponseRole ||
          ALLOWED_QUESTION_VARIANTS.indexOf(frame.state.regularFlow.questionVariant) < 0) return createError('INVALID_RESUME_BACK_FRAME_STATE', path);
      var firstResponseError = validateResponsePair(frame.state.responses.current, path + '.state.responses.current');
      var secondResponseError = validateResponsePair(frame.state.responses.ideal, path + '.state.responses.ideal');
      if (firstResponseError || secondResponseError ||
          (typeof frame.state.semanticState.current !== 'string' && frame.state.semanticState.current !== null) ||
          (typeof frame.state.semanticState.ideal !== 'string' && frame.state.semanticState.ideal !== null)) return createError('INVALID_RESUME_BACK_FRAME_STATE', path + '.state');
    }
    return null;
  }

  function validateV17ResumeBackFrames(frames, options) {
    options = isPlainObject(options) ? options : {};
    var path = typeof options.path === 'string' && options.path ? options.path : 'resumeBackFrames';
    var allowNonEmpty = options.allowNonEmpty === true;
    if (!Array.isArray(frames)) return createError('INVALID_RESUME_BACK_FRAMES', path);
    if (frames.length > MAX_RESUME_BACK_FRAMES) return createError('INVALID_RESUME_BACK_FRAMES', path);
    if (!allowNonEmpty && frames.length !== 0) return createError('INVALID_RESUME_BACK_FRAMES', path);
    for (var i = 0; i < frames.length; i += 1) {
      var frameError = validateV17ResumeBackFrameEnvelope(frames[i], path + '[' + i + ']');
      if (frameError) return frameError;
    }
    if (frames.length > 1) return createError('INVALID_RESUME_BACK_FRAMES', path);
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
    if (screenId === 's-v17-deep-response') {
      var deep = flow && flow.deepDive;
      return deep && (deep.phase === 'question1' || deep.phase === 'question2') ? 'deep.' + deep.phase : null;
    }
    if (screenId === 's-v17-breath') {
      return flow && flow.breathStep === 2 ? 'step4.second' : 'step4.first';
    }
    return null;
  }

  function getDeepResponseValue(value) {
    value = isPlainObject(value) ? value : {};
    var text = typeof value.text === 'string' ? value.text : '';
    var draft = typeof value.draft === 'string' ? value.draft : '';
    return { state: text ? 'answered' : 'unset', text: text, draft: draft };
  }

  function getDeepRoundV1(value) {
    value = isPlainObject(value) ? value : {};
    return {
      round: value.round,
      questionVariant: value.questionVariant,
      originalTheme: typeof value.originalTheme === 'string' ? value.originalTheme : '',
      question1: getDeepResponseValue(value.question1),
      question2: getDeepResponseValue(value.question2),
      incomplete: value.incomplete === true
    };
  }

  function getDeepFlowV1(value) {
    if (!isPlainObject(value)) return null;
    return {
      routeType: value.routeType,
      originalTheme: typeof value.originalTheme === 'string' ? value.originalTheme : '',
      round: value.round,
      questionVariant: value.questionVariant,
      phase: value.phase,
      rounds: Array.isArray(value.rounds) ? value.rounds.map(getDeepRoundV1) : null,
      pendingRound: getDeepRoundV1(value.pendingRound),
      nextPendingRound: value.nextPendingRound === null ? null : getDeepRoundV1(value.nextPendingRound),
      finished: value.finished === true
    };
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
    // This derives a response flow only.  Breath/Final/Result are not
    // response screens and must never be used as an implicit source of a
    // Regular response record.
    if (currentScreen !== 's-v17-first-response' && currentScreen !== 's-v17-second-response') {
      return null;
    }
    var activeScreen = currentScreen === 's-v17-first-response'
      ? 'first'
      : 'second';
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
    var breathFrame = screenId === 's-v17-breath' && flow && Array.isArray(flow.resumeBackFrames) && flow.resumeBackFrames.length === 1
      ? flow.resumeBackFrames[0] : null;
    // A Breath screen has no response semantics.  Its root Regular flow is
    // the canonical response flow captured before the Breath mutation.
    var regularFlow = breathFrame && breathFrame.frameType === 'regular-response' && breathFrame.state
      ? clone(breathFrame.state.regularFlow)
      : deriveV17RegularFlow(flow && typeof flow.currentScreen === 'string' && flow.currentScreen ? flow.currentScreen : screenId, routeType);
    if (regularFlow) regularFlow.questionVariant = normalizeV17QuestionVariant(flow && flow.questionVariant);
    var isBreath = screenId === 's-v17-breath';
    var isDeepResponse = sessionMode === 'deep' && screenId === 's-v17-deep-response';
    var isDeepBreath = sessionMode === 'deep' && isBreath;
    var deepFlow = (isDeepResponse || isDeepBreath) ? getDeepFlowV1(flow && flow.deepDive) : null;
    var breathState = isBreath ? {
      step: flow && flow.breathStep === 2 ? 2 : 1,
      phase: flow && flow.breathPhase === 'second' ? 'second' : 'first',
      first: !!(flow && flow.breath && flow.breath.first),
      second: !!(flow && flow.breath && flow.breath.second)
    } : null;
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
      sessionMode: screenId === 's-v17-session-mode' ? null : undefined,
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
      responses: (isDeepResponse || isDeepBreath) ? {
        current: { state: 'unset', text: '', draft: '' },
        ideal: { state: 'unset', text: '', draft: '' }
      } : {
        current: currentResponse,
        ideal: idealResponse
      },
      semanticState: (isDeepResponse || isDeepBreath) ? { current: null, ideal: null } : {
        current: currentStateValue,
        ideal: idealStateValue
      },
      regularFlow: (isDeepResponse || isDeepBreath) ? null : regularFlow,
      scoreTrail: scoreTrail,
      awarenessTrail: awarenessTrail,
      deepFlow: deepFlow,
      breathState: breathState
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
      resumeBackFrames: isBreath && flow && Array.isArray(flow.resumeBackFrames) ? clone(flow.resumeBackFrames) : []
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
    if (flow.currentScreen !== null && (typeof flow.currentScreen !== 'string' || !flow.currentScreen || SERIALIZABLE_SCREENS.indexOf(flow.currentScreen) < 0)) {
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

  function expectedDeepVariant(round) {
    return round % 2 === 1 ? 'A' : 'B';
  }

  function validateDeepResponseValue(value, path, requireConfirmed) {
    if (!isPlainObject(value)) return createError('INVALID_DEEP_RESPONSE', path);
    var keysError = validateExactObjectKeys(value, ['state', 'text', 'draft'], path, 'INVALID_DEEP_RESPONSE');
    if (keysError) return keysError;
    if (value.state !== 'answered' && value.state !== 'unset') return createError('INVALID_DEEP_RESPONSE_STATE', path + '.state');
    if (typeof value.text !== 'string' || typeof value.draft !== 'string') return createError('INVALID_DEEP_RESPONSE', path);
    if (value.state === 'unset' && value.text) return createError('INVALID_DEEP_RESPONSE_STATE', path + '.state');
    if (value.state === 'answered' && !value.text) return createError('INVALID_DEEP_RESPONSE_STATE', path + '.state');
    if (requireConfirmed && (!value.text || value.state !== 'answered')) return createError('DEEP_CONFIRMED_RESPONSE_REQUIRED', path + '.text');
    return null;
  }

  function validateDeepRound(round, path, root, kind, expectedRound) {
    if (!isPlainObject(round)) return createError('INVALID_DEEP_ROUND', path);
    var keysError = validateExactObjectKeys(round, ['round', 'questionVariant', 'originalTheme', 'question1', 'question2', 'incomplete'], path, 'INVALID_DEEP_ROUND');
    if (keysError) return keysError;
    if (!Number.isInteger(round.round) || round.round < 1 || round.round !== expectedRound) return createError('INVALID_DEEP_ROUND_NUMBER', path + '.round');
    if (round.questionVariant !== expectedDeepVariant(round.round) || round.questionVariant !== root.questionVariant && round.round === root.round) return createError('INVALID_DEEP_VARIANT', path + '.questionVariant');
    if (round.originalTheme !== root.originalTheme) return createError('DEEP_THEME_MISMATCH', path + '.originalTheme');
    if (typeof round.incomplete !== 'boolean') return createError('INVALID_DEEP_ROUND', path + '.incomplete');
    var completed = kind === 'completed';
    if (completed && round.incomplete !== false) return createError('INVALID_DEEP_COMPLETED_ROUND', path + '.incomplete');
    var q1Error = validateDeepResponseValue(round.question1, path + '.question1', completed || root.phase === 'question2' && kind === 'pending');
    if (q1Error) return q1Error;
    var q2Error = validateDeepResponseValue(round.question2, path + '.question2', completed);
    if (q2Error) return q2Error;
    return null;
  }

  function validateDeepFlowV1(value, path, routeType) {
    if (!isPlainObject(value)) return createError('INVALID_DEEP_FLOW', path);
    var keysError = validateExactObjectKeys(value, ['routeType', 'originalTheme', 'round', 'questionVariant', 'phase', 'rounds', 'pendingRound', 'nextPendingRound', 'finished'], path, 'INVALID_DEEP_FLOW');
    if (keysError) return keysError;
    if (ALLOWED_ROUTE_TYPES.indexOf(value.routeType) < 0 || value.routeType !== routeType) return createError('INVALID_DEEP_ROUTE', path + '.routeType');
    if (typeof value.originalTheme !== 'string' || !value.originalTheme.trim()) return createError('INVALID_DEEP_THEME', path + '.originalTheme');
    if (!Number.isInteger(value.round) || value.round < 1) return createError('INVALID_DEEP_ROUND_NUMBER', path + '.round');
    if (value.questionVariant !== expectedDeepVariant(value.round)) return createError('INVALID_DEEP_VARIANT', path + '.questionVariant');
    if (value.phase !== 'question1' && value.phase !== 'question2') return createError('INVALID_DEEP_PHASE', path + '.phase');
    if (value.finished !== false) return createError('DEEP_FINISHED_NOT_SUPPORTED', path + '.finished');
    if (!Array.isArray(value.rounds) || value.rounds.length !== value.round - 1) return createError('INVALID_DEEP_ROUNDS', path + '.rounds');
    for (var i = 0; i < value.rounds.length; i += 1) {
      var completedError = validateDeepRound(value.rounds[i], path + '.rounds[' + i + ']', value, 'completed', i + 1);
      if (completedError) return completedError;
    }
    var pendingError = validateDeepRound(value.pendingRound, path + '.pendingRound', value, 'pending', value.round);
    if (pendingError) return pendingError;
    if (value.pendingRound.incomplete !== false) return createError('INVALID_DEEP_PENDING_ROUND', path + '.pendingRound.incomplete');
    if (value.nextPendingRound !== null) {
      var nextError = validateDeepRound(value.nextPendingRound, path + '.nextPendingRound', value, 'next', value.round + 1);
      if (nextError) return nextError;
      if (value.nextPendingRound.incomplete !== false) return createError('INVALID_DEEP_NEXT_PENDING', path + '.nextPendingRound.incomplete');
    }
    return null;
  }

  function validateSnapshotStructure(snapshot) {
    if (!isPlainObject(snapshot)) return createError('INVALID_SNAPSHOT', '');
    if (snapshot.snapshotSchemaVersion !== CURRENT_SNAPSHOT_SCHEMA_VERSION) {
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
    if (SCHEMA_VALIDATABLE_SCREENS.indexOf(snapshot.currentScreen) < 0) return createError('UNSUPPORTED_SCREEN_PHASE_4A', 'currentScreen');
    if (!isPlainObject(snapshot.summary)) return createError('INVALID_SUMMARY', 'summary');
    if (!isPlainObject(snapshot.currentCycle)) return createError('INVALID_CURRENT_CYCLE', 'currentCycle');
    if (!isPlainObject(snapshot.currentState)) return createError('INVALID_CURRENT_STATE', 'currentState');
    if (snapshot.repeatState !== null) return createError('INVALID_REPEAT_STATE', 'repeatState');
    var isBreathScreen = snapshot.currentScreen === 's-v17-breath';
    var resumeBackFramesError = validateV17ResumeBackFrames(snapshot.resumeBackFrames, { allowNonEmpty: isBreathScreen });
    if (resumeBackFramesError) return resumeBackFramesError;
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
    var isUnselectedSessionMode = snapshot.currentScreen === 's-v17-session-mode';
    if (isUnselectedSessionMode) {
      if (summary.sessionMode !== null) return createError('INVALID_SESSION_MODE', 'summary.sessionMode');
    } else if (snapshot.currentScreen === 's-v17-deep-response' || (isBreathScreen && summary.sessionMode === 'deep')) {
      if (summary.sessionMode !== 'deep') return createError('INVALID_SESSION_MODE', 'summary.sessionMode');
    } else if (summary.sessionMode !== 'regular') {
      return createError('INVALID_SESSION_MODE', 'summary.sessionMode');
    }
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
    var isDeepResponse = snapshot.currentScreen === 's-v17-deep-response';
    var isDeepBreath = isBreathScreen && summary.sessionMode === 'deep';
    if (isUnselectedSessionMode) {
      if (!Object.prototype.hasOwnProperty.call(state, 'sessionMode') || state.sessionMode !== null) {
        return createError('INVALID_SESSION_MODE', 'currentState.sessionMode');
      }
      if (state.currentStep !== 'session-mode') return createError('INVALID_CURRENT_STEP', 'currentState.currentStep');
    } else if (Object.prototype.hasOwnProperty.call(state, 'sessionMode') && state.sessionMode !== summary.sessionMode) {
      return createError('INVALID_SESSION_MODE', 'currentState.sessionMode');
    }
    routeError = validateRouteType(state.routeType, 'currentState.routeType');
    if (routeError) return routeError;
    entryError = validateEntryType(state.entryType, 'currentState.entryType');
    if (entryError) return entryError;
    if (!Array.isArray(state.scoreTrail) || !Array.isArray(state.awarenessTrail)) return createError('INVALID_TRAIL', 'currentState');
    if (isDeepResponse) {
      if (state.regularFlow !== null) return createError('INVALID_REGULAR_FLOW', 'currentState.regularFlow');
      var deepFlowError = validateDeepFlowV1(state.deepFlow, 'currentState.deepFlow', state.routeType);
      if (deepFlowError) return deepFlowError;
      if (state.currentStep !== 'deep.' + state.deepFlow.phase) return createError('INVALID_CURRENT_STEP', 'currentState.currentStep');
    } else if (isDeepBreath) {
      if (state.regularFlow !== null) return createError('INVALID_REGULAR_FLOW', 'currentState.regularFlow');
      if (!isPlainObject(state.deepFlow) || state.deepFlow.finished !== true || !state.deepFlow.pendingRound || state.deepFlow.pendingRound.incomplete !== true) return createError('INVALID_DEEP_FLOW', 'currentState.deepFlow');
      var rootDeep = deepClone(state.deepFlow);
      rootDeep.finished = false;
      rootDeep.pendingRound.incomplete = false;
      var rootDeepError = validateDeepFlowV1(rootDeep, 'currentState.deepFlow', state.routeType);
      if (rootDeepError) return rootDeepError;
    } else if (state.deepFlow !== null) return createError('INVALID_DEEP_FLOW', 'currentState.deepFlow');
    if (isBreathScreen) {
      var breath = state.breathState;
      if (!isPlainObject(breath) || validateExactObjectKeys(breath, ['step', 'phase', 'first', 'second'], 'currentState.breathState', 'INVALID_BREATH_STATE') ||
          (breath.step !== 1 && breath.step !== 2) || breath.phase !== (breath.step === 2 ? 'second' : 'first') ||
          typeof breath.first !== 'boolean' || typeof breath.second !== 'boolean' ||
          state.currentStep !== (breath.step === 2 ? 'step4.second' : 'step4.first') || snapshot.resumeBackFrames.length !== 1) return createError('INVALID_BREATH_STATE', 'currentState.breathState');
      var frame = snapshot.resumeBackFrames[0];
      if (!frame || frame.sessionMode !== summary.sessionMode) return createError('INVALID_RESUME_BACK_FRAME', 'resumeBackFrames[0]');
      if (isDeepBreath && frame.frameType !== 'deep-response') return createError('INVALID_RESUME_BACK_FRAME', 'resumeBackFrames[0]');
      if (!isDeepBreath && frame.frameType !== 'regular-response') return createError('INVALID_RESUME_BACK_FRAME', 'resumeBackFrames[0]');
      if (!isDeepBreath) {
        var rootRegular = state.regularFlow;
        var frameRegular = frame.state && frame.state.regularFlow;
        if (!isPlainObject(rootRegular) || !isPlainObject(frameRegular) ||
            rootRegular.activeScreen !== frameRegular.activeScreen ||
            rootRegular.questionVariant !== frameRegular.questionVariant ||
            rootRegular.firstResponseRole !== frameRegular.firstResponseRole ||
            rootRegular.secondResponseRole !== frameRegular.secondResponseRole ||
            state.routeType !== frame.state.routeType ||
            state.responses.current.state !== frame.state.responses.current.state ||
            state.responses.current.text !== frame.state.responses.current.text ||
            state.responses.current.draft !== frame.state.responses.current.draft ||
            state.responses.ideal.state !== frame.state.responses.ideal.state ||
            state.responses.ideal.text !== frame.state.responses.ideal.text ||
            state.responses.ideal.draft !== frame.state.responses.ideal.draft) {
          return createError('INVALID_RESUME_BACK_FRAME', 'resumeBackFrames[0]');
        }
      }
    } else if (Object.prototype.hasOwnProperty.call(state, 'breathState') && state.breathState !== null) return createError('INVALID_BREATH_STATE', 'currentState.breathState');
    if (isUnselectedSessionMode && state.regularFlow !== null) return createError('INVALID_REGULAR_FLOW', 'currentState.regularFlow');
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
    var runtimeScreenId = getRuntimeScreenId();
    var runtimeSessionMode = getRuntimeSessionMode();
    var isBreath = runtimeScreenId === 's-v17-breath';
    var isDeepResponse = runtimeSessionMode === 'deep' && runtimeScreenId === 's-v17-deep-response';
    var isDeepBreath = runtimeSessionMode === 'deep' && isBreath;
    if (runtimeSessionMode === 'deep' && !isDeepResponse && !isDeepBreath) {
      return { ok: false, error: createError('UNSUPPORTED_SESSION_MODE_PHASE_4A', 'sessionMode') };
    }
    if (runtimeScreenId === 's-v17-session-mode' && getRuntimeSessionMode() !== null) {
      return { ok: false, error: createError('INVALID_SESSION_MODE', 'sessionMode') };
    }
    if (global.D && global.D.v17Flow) {
      if (global.D.v17Flow.currentScreen !== null && (typeof global.D.v17Flow.currentScreen !== 'string' || !global.D.v17Flow.currentScreen || SERIALIZABLE_SCREENS.indexOf(global.D.v17Flow.currentScreen) < 0)) {
        return { ok: false, error: createError('RUNTIME_SCREEN_INVALID', 'v17Flow.currentScreen') };
      }
      if (global.D.v17Flow.currentScreen === null) {
        return { ok: false, error: createError('RUNTIME_SCREEN_INVALID', 'v17Flow.currentScreen') };
      }
      if (isDeepResponse) {
        var deepFlow = getDeepFlowV1(global.D.v17Flow.deepDive);
        var deepFlowError = validateDeepFlowV1(deepFlow, 'v17Flow.deepDive', getRuntimeRouteType());
        if (deepFlowError) return { ok: false, error: deepFlowError };
        if (global.D.v17Flow.currentStep !== 'deep.' + deepFlow.phase || getCurrentStep(runtimeScreenId, global.D.v17Flow) !== 'deep.' + deepFlow.phase) {
          return { ok: false, error: createError('INVALID_CURRENT_STEP', 'v17Flow.currentStep') };
        }
      } else if (isDeepBreath) {
        if (!global.D.v17Flow.deepDive || global.D.v17Flow.deepDive.finished !== true || !Array.isArray(global.D.v17Flow.resumeBackFrames) || global.D.v17Flow.resumeBackFrames.length !== 1) {
          return { ok: false, error: createError('INVALID_BREATH_STATE', 'v17Flow') };
        }
      } else {
        var responseStateError = validateRuntimeResponseStates(global.D.v17Flow, 'v17Flow.responseStates');
        if (responseStateError) return { ok: false, error: responseStateError };
      }
      if (!isDeepResponse && !isDeepBreath && !isBreath && global.D.v17Flow.currentScreen !== 's-v17-before' && global.D.v17Flow.currentScreen !== 's-v17-session-mode') {
        var regularFlowError = validateRegularFlowMetadata({
          currentScreen: global.D.v17Flow.currentScreen,
          activeScreen: deriveV17RegularFlow(global.D.v17Flow.currentScreen, getRuntimeRouteType()) && deriveV17RegularFlow(global.D.v17Flow.currentScreen, getRuntimeRouteType()).activeScreen,
          firstResponseRole: deriveV17RegularFlow(global.D.v17Flow.currentScreen, getRuntimeRouteType()) && deriveV17RegularFlow(global.D.v17Flow.currentScreen, getRuntimeRouteType()).firstResponseRole,
          secondResponseRole: deriveV17RegularFlow(global.D.v17Flow.currentScreen, getRuntimeRouteType()) && deriveV17RegularFlow(global.D.v17Flow.currentScreen, getRuntimeRouteType()).secondResponseRole
        }, getRuntimeRouteType(), 'v17Flow');
        if (regularFlowError) return { ok: false, error: regularFlowError };
      }
      if (isBreath && !isDeepBreath) {
        var runtimeFrame = Array.isArray(global.D.v17Flow.resumeBackFrames) && global.D.v17Flow.resumeBackFrames.length === 1
          ? global.D.v17Flow.resumeBackFrames[0] : null;
        var runtimeFrameError = validateV17ResumeBackFrameEnvelope(runtimeFrame, 'v17Flow.resumeBackFrames[0]');
        if (runtimeFrameError) return { ok: false, error: runtimeFrameError };
      }
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
    if (input.snapshotSchemaVersion !== CURRENT_SNAPSHOT_SCHEMA_VERSION) {
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
    if (RESTORABLE_SCREENS.indexOf(snapshot.currentScreen) < 0) {
      return { ok: false, error: createError('RESTORE_SCREEN_NOT_SUPPORTED', 'currentScreen') };
    }
    var isUnselectedSessionMode = snapshot.currentScreen === 's-v17-session-mode' && snapshot.summary && snapshot.summary.sessionMode === null;
    var isDeepResponse = snapshot.currentScreen === 's-v17-deep-response' && snapshot.summary && snapshot.summary.sessionMode === 'deep';
    var isBreath = snapshot.currentScreen === 's-v17-breath';
    var isDeepBreath = isBreath && snapshot.summary && snapshot.summary.sessionMode === 'deep';
    if (!isPlainObject(snapshot.summary) || (snapshot.summary.sessionMode !== 'regular' && !isUnselectedSessionMode && !isDeepResponse && !isDeepBreath)) {
      return { ok: false, error: createError('RESTORE_DEEP_NOT_SUPPORTED', 'summary.sessionMode') };
    }
    if (!isPlainObject(snapshot.currentState)) {
      return { ok: false, error: createError('RESTORE_SNAPSHOT_INVALID', 'currentState') };
    }
    var routeType = snapshot.currentState.routeType;
    var frame = isBreath && snapshot.resumeBackFrames ? snapshot.resumeBackFrames[0] : null;
    var regularFlow = (isDeepResponse || isDeepBreath) ? null : (isBreath
      ? snapshot.currentState.regularFlow
      : deriveV17RegularFlow(snapshot.currentScreen, routeType));
    var isSessionModeOrBefore = snapshot.currentScreen === 's-v17-session-mode' || snapshot.currentScreen === 's-v17-before';
    if (!regularFlow && !isSessionModeOrBefore && !isDeepResponse && !isDeepBreath) {
      return { ok: false, error: createError('RESTORE_DEEP_NOT_SUPPORTED', 'currentScreen') };
    }
    var regularFlowSnapshot = snapshot.currentState.regularFlow;
    if (regularFlow && (!isPlainObject(regularFlowSnapshot) ||
      regularFlowSnapshot.activeScreen !== regularFlow.activeScreen ||
      regularFlowSnapshot.firstResponseRole !== regularFlow.firstResponseRole ||
      regularFlowSnapshot.secondResponseRole !== regularFlow.secondResponseRole)) {
      return { ok: false, error: createError('RESTORE_REGULAR_FLOW_MISMATCH', 'currentState.regularFlow') };
    }
    // The root variant belongs to Regular.  A Deep snapshot deliberately has
    // no authority over it, so retain the runtime value while restoring Deep.
    var questionVariant = regularFlow ? normalizeV17QuestionVariant(regularFlowSnapshot.questionVariant) : null;
    var deepFlowSnapshot = (isDeepResponse || isDeepBreath) ? deepClone(snapshot.currentState.deepFlow) : null;
    if (isDeepResponse) {
      var restoredDeepError = validateDeepFlowV1(deepFlowSnapshot, 'currentState.deepFlow', routeType);
      if (restoredDeepError) return { ok: false, error: createError('RESTORE_SNAPSHOT_INVALID', restoredDeepError.path) };
    }
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
    if (isUnselectedSessionMode) {
      staged.v17Flow = null;
    }
    stagedFlow.currentScreen = snapshot.currentScreen;
    stagedFlow.currentStep = snapshot.currentState.currentStep;
    stagedFlow.questionVariant = questionVariant;
    stagedFlow.routeType = routeType;
    stagedFlow.responseStates = {
      current: staged.responseStates.current,
      ideal: staged.responseStates.ideal
    };
    var step2Response = responseCurrent;
    var step3Response = responseIdeal;
    if (regularFlow) {
      step2Response = regularFlowSnapshot.firstResponseRole === 'ideal' ? responseIdeal : responseCurrent;
      step3Response = regularFlowSnapshot.secondResponseRole === 'ideal' ? responseIdeal : responseCurrent;
    }
    stagedFlow.step2Text = step2Response && typeof step2Response.text === 'string' ? step2Response.text : '';
    stagedFlow.step2Draft = step2Response && typeof step2Response.draft === 'string' ? step2Response.draft : '';
    stagedFlow.step3Text = step3Response && typeof step3Response.text === 'string' ? step3Response.text : '';
    stagedFlow.step3Draft = step3Response && typeof step3Response.draft === 'string' ? step3Response.draft : '';
    stagedFlow.currentState = staged.currentState;
    stagedFlow.currentStateText = staged.currentStateText;
    stagedFlow.currentStateDraft = staged.currentStateDraft;
    stagedFlow.idealState = staged.idealState;
    stagedFlow.idealStateText = staged.idealStateText;
    stagedFlow.idealStateDraft = staged.idealStateDraft;
    stagedFlow.activeScreen = regularFlow ? regularFlow.activeScreen : null;
    stagedFlow.firstResponseRole = regularFlow ? regularFlow.firstResponseRole : null;
    stagedFlow.secondResponseRole = regularFlow ? regularFlow.secondResponseRole : null;
    if (isDeepResponse || isDeepBreath) {
      var candidateRound = (deepFlowSnapshot.pendingRound.question1.text || deepFlowSnapshot.pendingRound.question2.text)
        ? deepFlowSnapshot.pendingRound : null;
      if (!candidateRound && deepFlowSnapshot.rounds.length) candidateRound = deepFlowSnapshot.rounds[deepFlowSnapshot.rounds.length - 1];
      var question1Text = candidateRound ? candidateRound.question1.text : '';
      var question2Text = candidateRound ? candidateRound.question2.text : '';
      staged.currentState = routeType === 'problem' ? question2Text : question1Text;
      staged.currentStateText = staged.currentState;
      staged.idealState = routeType === 'problem' ? question1Text : question2Text;
      staged.idealStateText = staged.idealState;
      staged.currentStateDraft = '';
      staged.idealStateDraft = '';
      staged.responseStates = { current: staged.currentState ? 'answered' : 'unset', ideal: staged.idealState ? 'answered' : 'unset' };
      stagedFlow.responseStates = staged.responseStates;
      stagedFlow.currentState = staged.currentState;
      stagedFlow.currentStateText = staged.currentStateText;
      stagedFlow.currentStateDraft = '';
      stagedFlow.idealState = staged.idealState;
      stagedFlow.idealStateText = staged.idealStateText;
      stagedFlow.idealStateDraft = '';
      stagedFlow.step2Text = question1Text;
      stagedFlow.step2Draft = deepFlowSnapshot.pendingRound.question1.draft;
      stagedFlow.step3Text = question2Text;
      stagedFlow.step3Draft = deepFlowSnapshot.pendingRound.question2.draft;
      stagedFlow.deepDive = deepFlowSnapshot;
    }
    if (isBreath) {
      stagedFlow.breathStep = snapshot.currentState.breathState.step;
      stagedFlow.breathPhase = snapshot.currentState.breathState.phase;
      stagedFlow.breath = { first: snapshot.currentState.breathState.first, second: snapshot.currentState.breathState.second };
      stagedFlow.resumeBackFrames = deepClone(snapshot.resumeBackFrames);
    }
    if (!isUnselectedSessionMode) staged.v17Flow = stagedFlow;
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
    if (isUnselectedSessionMode) {
      global.D.v17Flow = null;
      return {
        ok: true,
        sessionId: snapshot.sessionId,
        currentScreen: snapshot.currentScreen,
        sessionMode: null,
        appliedGroups: ['identity', 'entry', 'mode_route_screen', 'measurement', 'responses']
      };
    }
    global.D.v17Flow = global.D.v17Flow && typeof global.D.v17Flow === 'object' ? global.D.v17Flow : {};
    global.D.v17Flow.currentScreen = stagedFlow.currentScreen;
    global.D.v17Flow.currentStep = stagedFlow.currentStep;
    if (!isDeepResponse && !isDeepBreath) global.D.v17Flow.questionVariant = stagedFlow.questionVariant;
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
    if (isDeepResponse || isDeepBreath) global.D.v17Flow.deepDive = deepClone(stagedFlow.deepDive);
    if (isBreath) {
      global.D.v17Flow.breathStep = stagedFlow.breathStep;
      global.D.v17Flow.breathPhase = stagedFlow.breathPhase;
      global.D.v17Flow.breath = stagedFlow.breath;
      global.D.v17Flow.resumeBackFrames = stagedFlow.resumeBackFrames;
    }
    return {
      ok: true,
      sessionId: snapshot.sessionId,
      currentScreen: snapshot.currentScreen,
      sessionMode: snapshot.summary.sessionMode,
      appliedGroups: (isDeepResponse || isDeepBreath)
        ? ['identity', 'entry', 'mode_route_screen', 'measurement', 'deepFlow', 'breathState', 'resumeBackFrames', 'resultAdapter']
        : ['identity', 'entry', 'mode_route_screen', 'measurement', 'responses', 'regularFlow', 'breathState', 'resumeBackFrames']
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
    CURRENT_SNAPSHOT_SCHEMA_VERSION: CURRENT_SNAPSHOT_SCHEMA_VERSION,
    SCHEMA_VERSION: SCHEMA_VERSION,
    APP_VERSION: APP_VERSION,
    MAX_BYTES: MAX_BYTES,
    SCHEMA_KNOWN_SCREENS: SCHEMA_KNOWN_SCREENS.slice(),
    SCHEMA_VALIDATABLE_SCREENS: SCHEMA_VALIDATABLE_SCREENS.slice(),
    SERIALIZABLE_SCREENS: SERIALIZABLE_SCREENS.slice(),
    RESTORABLE_SCREENS: RESTORABLE_SCREENS.slice(),
    ALLOWED_SCREENS: SERIALIZABLE_SCREENS.slice(),
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
    resumeGuestV17RegularFromLocalRecord: resumeGuestV17RegularFromLocalRecord,
    __test: Object.freeze({
      normalizeDeepFlowV1: getDeepFlowV1,
      validateDeepFlowV1: function(value, routeType) {
        return validateDeepFlowV1(value, 'deepFlow', routeType);
      }
    })
  });
})(window);
