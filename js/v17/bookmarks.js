var v17BookmarkState = {
  currentThemeKey: '',
  currentThemeSnapshot: null,
  currentBookmark: null,
  bookmarks: [],
  loadedUserId: '',
  loadedThemeKey: '',
  loading: false,
  loadingPromise: null,
  pendingPayload: null,
  pendingSavePromise: null,
  statusText: '',
  statusTimer: null,
  error: null
};

var V17_BOOKMARK_PENDING_KEY = 'noetunePendingBookmark';

function getV17BookmarkButton() {
  return document.getElementById('btn-save-result');
}

function getV17BookmarkStatus() {
  return document.getElementById('save-result-status');
}

function getV17BookmarkUser() {
  return currentUser || (v17AuthState && v17AuthState.user) || null;
}

function getV17BookmarkAccessSnapshot() {
  if (typeof window === 'undefined' || typeof window.getV17AccessSnapshot !== 'function') return null;
  try {
    return window.getV17AccessSnapshot();
  } catch (e) {
    return null;
  }
}

function canV17ReadBookmarkData() {
  if (typeof window !== 'undefined' && typeof window.canV17ReadSavedProData === 'function') {
    try {
      return !!window.canV17ReadSavedProData();
    } catch (e) {}
  }
  return !!getV17BookmarkUser();
}

function canV17WriteBookmarkData() {
  if (typeof window !== 'undefined' && typeof window.canV17WriteSavedProData === 'function') {
    try {
      return !!window.canV17WriteSavedProData();
    } catch (e) {}
  }
  return !!getV17BookmarkUser();
}

function readV17ResponseErrorCode(body) {
  if (!body || typeof body !== 'object') return null;
  return typeof body.error === 'string' && body.error ? body.error : null;
}

async function readV17ResponseBody(response) {
  if (!response || typeof response.json !== 'function') return null;
  try {
    return await response.json();
  } catch (e) {
    return null;
  }
}

function getV17BookmarkThemeSnapshot() {
  if (typeof getV17QuestionSnapshot !== 'function') return null;
  var snapshot = getV17QuestionSnapshot();
  if (!snapshot) return null;
  return {
    questionId: snapshot.questionId || null,
    themeId: snapshot.themeId || null,
    questionTextAtTime: snapshot.questionTextAtTime || '',
    localeAtTime: snapshot.localeAtTime || lang || 'ja',
    freeInputTheme: snapshot.freeInputTheme || '',
    themeSource: snapshot.themeSource || '',
    themeCategoryId: snapshot.themeCategoryId || '',
    themeCategoryLabelAtTime: snapshot.themeCategoryLabelAtTime || '',
    themeTrackId: snapshot.themeTrackId || '',
    themeMeaning: snapshot.themeMeaning || ''
  };
}

function normalizeV17BookmarkText(text) {
  return String(text || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function fallbackV17BookmarkHashHex(text) {
  var value = normalizeV17BookmarkText(text);
  var hash = 2166136261;
  for (var i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
}

async function sha256Hex(value) {
  var normalized = normalizeV17BookmarkText(value);
  if (window.crypto && window.crypto.subtle && typeof window.crypto.subtle.digest === 'function') {
    try {
      var bytes = new TextEncoder().encode(normalized);
      var digest = await window.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest)).map(function(byte) {
        return byte.toString(16).padStart(2, '0');
      }).join('');
    } catch (e) {}
  }
  return fallbackV17BookmarkHashHex(normalized);
}

async function buildV17StableThemeKey(snapshot) {
  if (!snapshot) return null;
  if (snapshot.questionId) return 'hcq:' + String(snapshot.questionId).trim();
  if (snapshot.themeId) {
    var source = String(snapshot.themeSource || '').toLowerCase();
    if (source.indexOf('spiritual') === 0) return 'spiritual:' + String(snapshot.themeId).trim();
    return 'theme:' + String(snapshot.themeId).trim();
  }
  var freeText = snapshot.freeInputTheme || snapshot.questionTextAtTime || '';
  if (!String(freeText || '').trim()) return null;
  return 'free:' + await sha256Hex(freeText);
}

function setV17BookmarkStatus(messageKey, persist) {
  var status = getV17BookmarkStatus();
  if (!status) return;
  status.textContent = messageKey ? v17Copy(messageKey) : '';
  v17BookmarkState.statusText = messageKey ? v17Copy(messageKey) : '';
  if (v17BookmarkState.statusTimer) {
    clearTimeout(v17BookmarkState.statusTimer);
    v17BookmarkState.statusTimer = null;
  }
  if (messageKey && !persist) {
    v17BookmarkState.statusTimer = setTimeout(function() {
      v17BookmarkState.statusText = '';
      if (getV17BookmarkStatus()) getV17BookmarkStatus().textContent = '';
      v17BookmarkState.statusTimer = null;
    }, 2600);
  }
}

function setV17BookmarkButtonState(labelKey, disabled, bookmarked) {
  var button = getV17BookmarkButton();
  if (!button) return;
  button.textContent = v17Copy(labelKey || 'bookmark.primaryCta');
  button.disabled = !!disabled;
  button.setAttribute('aria-busy', disabled ? 'true' : 'false');
  button.setAttribute('aria-pressed', bookmarked ? 'true' : 'false');
}

function getV17PendingBookmarkPayload() {
  try {
    var raw = sessionStorage.getItem(V17_BOOKMARK_PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setV17PendingBookmarkPayload(payload) {
  try {
    if (!payload) sessionStorage.removeItem(V17_BOOKMARK_PENDING_KEY);
    else sessionStorage.setItem(V17_BOOKMARK_PENDING_KEY, JSON.stringify(payload));
  } catch (e) {}
}

function clearV17PendingBookmarkPayload() {
  setV17PendingBookmarkPayload(null);
}

async function getV17BookmarkToken() {
  if (!v17SupabaseClient || !v17SupabaseClient.auth || typeof v17SupabaseClient.auth.getSession !== 'function') {
    return null;
  }
  try {
    var result = await v17SupabaseClient.auth.getSession();
    var session = result && result.data ? result.data.session : null;
    return session && session.access_token ? session.access_token : null;
  } catch (e) {
    return null;
  }
}

async function requestV17Bookmarks() {
  var token = await getV17BookmarkToken();
  if (!token) return null;
  var response = await fetch('/api/bookmarks', {
    headers: { Authorization: 'Bearer ' + token }
  });
  var body = response.ok ? null : await readV17ResponseBody(response);
  if (response.status === 401) {
    var unauthorized = new Error('unauthorized');
    unauthorized.status = 401;
    throw unauthorized;
  }
  if (response.status === 403) {
    var denied = new Error(readV17ResponseErrorCode(body) || 'saved_data_read_not_allowed');
    denied.status = 403;
    denied.code = readV17ResponseErrorCode(body) || 'saved_data_read_not_allowed';
    denied.billingState = body && body.billingState ? body.billingState : 'unknown';
    throw denied;
  }
  if (!response.ok) {
    var error = new Error('bookmark fetch failed');
    error.status = response.status;
    throw error;
  }
  var data = await readV17ResponseBody(response);
  return Array.isArray(data && data.bookmarks) ? data.bookmarks : [];
}

async function createV17Bookmark(payload) {
  var token = await getV17BookmarkToken();
  if (!token) {
    var missing = new Error('missing session');
    missing.status = 401;
    throw missing;
  }
  if (!canV17WriteBookmarkData()) {
    var denied = new Error('saved_data_write_not_allowed');
    denied.status = 403;
    denied.code = 'saved_data_write_not_allowed';
    denied.billingState = (getV17BookmarkAccessSnapshot() && getV17BookmarkAccessSnapshot().billingState) || 'unknown';
    throw denied;
  }
  var response = await fetch('/api/bookmarks', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      stableThemeKey: payload.stableThemeKey,
      themeSnapshot: payload.themeSnapshot
    })
  });
  if (response.status === 401) {
    var unauthorized = new Error('unauthorized');
    unauthorized.status = 401;
    throw unauthorized;
  }
  if (response.status === 403) {
    var body = await readV17ResponseBody(response);
    var limit = new Error(readV17ResponseErrorCode(body) || 'saved_data_write_not_allowed');
    limit.status = 403;
    limit.code = readV17ResponseErrorCode(body) || 'saved_data_write_not_allowed';
    limit.billingState = body && body.billingState ? body.billingState : 'unknown';
    throw limit;
  }
  if (!response.ok) {
    var error = new Error('bookmark save failed');
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function deleteV17Bookmark(payload) {
  var token = await getV17BookmarkToken();
  if (!token) {
    var missing = new Error('missing session');
    missing.status = 401;
    throw missing;
  }
  if (!canV17WriteBookmarkData()) {
    var denied = new Error('saved_data_delete_not_allowed');
    denied.status = 403;
    denied.code = 'saved_data_delete_not_allowed';
    denied.billingState = (getV17BookmarkAccessSnapshot() && getV17BookmarkAccessSnapshot().billingState) || 'unknown';
    throw denied;
  }
  var response = await fetch('/api/bookmarks', {
    method: 'DELETE',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ stableThemeKey: payload.stableThemeKey })
  });
  if (response.status === 401) {
    var unauthorized = new Error('unauthorized');
    unauthorized.status = 401;
    throw unauthorized;
  }
  if (response.status === 403) {
    var body = await readV17ResponseBody(response);
    var denied = new Error(readV17ResponseErrorCode(body) || 'saved_data_delete_not_allowed');
    denied.status = 403;
    denied.code = readV17ResponseErrorCode(body) || 'saved_data_delete_not_allowed';
    denied.billingState = body && body.billingState ? body.billingState : 'unknown';
    throw denied;
  }
  if (!response.ok) {
    var error = new Error('bookmark delete failed');
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function buildV17BookmarkContext() {
  var snapshot = getV17BookmarkThemeSnapshot();
  if (!snapshot) return null;
  var stableThemeKey = await buildV17StableThemeKey(snapshot);
  if (!stableThemeKey) return null;
  return {
    stableThemeKey: stableThemeKey,
    themeSnapshot: snapshot
  };
}

async function refreshV17BookmarkState(force) {
  if (cur !== 's-result') return false;
  var ctx = await buildV17BookmarkContext();
  if (!ctx) {
    v17BookmarkState.currentThemeKey = '';
    v17BookmarkState.currentThemeSnapshot = null;
    v17BookmarkState.currentBookmark = null;
    v17BookmarkState.bookmarks = [];
    v17BookmarkState.loadedUserId = '';
    v17BookmarkState.loadedThemeKey = '';
    v17BookmarkState.loading = false;
    setV17BookmarkButtonState('bookmark.primaryCta', false, false);
    setV17BookmarkStatus('', true);
    return false;
  }
  var user = getV17BookmarkUser();
  var canWrite = canV17WriteBookmarkData();
  v17BookmarkState.currentThemeKey = ctx.stableThemeKey;
  v17BookmarkState.currentThemeSnapshot = ctx.themeSnapshot;
  if (!user) {
    v17BookmarkState.currentBookmark = null;
    v17BookmarkState.bookmarks = [];
    v17BookmarkState.loadedUserId = '';
    v17BookmarkState.loadedThemeKey = ctx.stableThemeKey;
    v17BookmarkState.loading = false;
    setV17BookmarkButtonState('bookmark.primaryCta', false, false);
    setV17BookmarkStatus('', true);
    return false;
  }
  if (!force && v17BookmarkState.loadedUserId === user.id && v17BookmarkState.loadedThemeKey === ctx.stableThemeKey && !v17BookmarkState.loadingPromise) {
    setV17BookmarkButtonState(v17BookmarkState.currentBookmark ? 'bookmark.saved' : 'bookmark.primaryCta', !canWrite, !!v17BookmarkState.currentBookmark);
    if (!v17BookmarkState.statusText) setV17BookmarkStatus('', true);
    return !!v17BookmarkState.currentBookmark;
  }
  if (v17BookmarkState.loadingPromise) return v17BookmarkState.loadingPromise;

  v17BookmarkState.loading = true;
  setV17BookmarkButtonState('bookmark.loading', true, false);
  setV17BookmarkStatus('bookmark.loading', true);

  v17BookmarkState.loadingPromise = requestV17Bookmarks()
    .then(function(bookmarks) {
      v17BookmarkState.bookmarks = Array.isArray(bookmarks) ? bookmarks : [];
      v17BookmarkState.currentBookmark = v17BookmarkState.bookmarks.find(function(row) {
        return row && row.stableThemeKey === ctx.stableThemeKey;
      }) || null;
      v17BookmarkState.loadedUserId = user.id;
      v17BookmarkState.loadedThemeKey = ctx.stableThemeKey;
      v17BookmarkState.error = null;
      setV17BookmarkButtonState(v17BookmarkState.currentBookmark ? 'bookmark.saved' : 'bookmark.primaryCta', !canWrite, !!v17BookmarkState.currentBookmark);
      setV17BookmarkStatus('', true);
      return !!v17BookmarkState.currentBookmark;
    })
    .catch(function(error) {
      if (error && error.status === 401) {
        v17BookmarkState.currentBookmark = null;
        v17BookmarkState.bookmarks = [];
        v17BookmarkState.loadedUserId = '';
        v17BookmarkState.loadedThemeKey = '';
        setV17BookmarkButtonState('bookmark.primaryCta', !canWrite, false);
        setV17BookmarkStatus('', true);
        return false;
      }
      if (error && error.status === 403) {
        v17BookmarkState.error = error;
        v17BookmarkState.loadedUserId = user.id;
        v17BookmarkState.loadedThemeKey = ctx.stableThemeKey;
        setV17BookmarkButtonState(v17BookmarkState.currentBookmark ? 'bookmark.saved' : 'bookmark.primaryCta', !canWrite, !!v17BookmarkState.currentBookmark);
        if (!v17BookmarkState.statusText) {
          setV17BookmarkStatus(error.code === 'profile_unavailable' ? 'bookmark.error' : '', false);
        }
        return false;
      }
      v17BookmarkState.error = error;
      setV17BookmarkButtonState('bookmark.primaryCta', !canWrite, false);
      setV17BookmarkStatus('bookmark.error', false);
      return false;
    })
    .finally(function() {
      v17BookmarkState.loading = false;
      v17BookmarkState.loadingPromise = null;
    });

  return v17BookmarkState.loadingPromise;
}

function renderV17BookmarkUI(force) {
  if (cur !== 's-result') return false;
  var button = getV17BookmarkButton();
  if (!button) return false;
  var ctxReady = !!getV17BookmarkThemeSnapshot();
  if (!ctxReady) {
    setV17BookmarkButtonState('bookmark.primaryCta', false, false);
    setV17BookmarkStatus('', true);
    return false;
  }
  var user = getV17BookmarkUser();
  var canWrite = canV17WriteBookmarkData();
  if (!canV17ReadBookmarkData()) {
    v17BookmarkState.currentBookmark = null;
    v17BookmarkState.bookmarks = [];
    v17BookmarkState.loadedUserId = '';
    v17BookmarkState.loadedThemeKey = v17BookmarkState.currentThemeKey || '';
    v17BookmarkState.loading = false;
    setV17BookmarkButtonState('bookmark.primaryCta', false, false);
    if (!v17BookmarkState.statusText) setV17BookmarkStatus('', true);
    return false;
  }
  if (!user) {
    v17BookmarkState.currentBookmark = null;
    v17BookmarkState.bookmarks = [];
    v17BookmarkState.loadedUserId = '';
    v17BookmarkState.loadedThemeKey = v17BookmarkState.currentThemeKey || '';
    v17BookmarkState.loading = false;
    setV17BookmarkButtonState('bookmark.primaryCta', false, false);
    if (!v17BookmarkState.statusText) setV17BookmarkStatus('', true);
    return false;
  }
  if (v17BookmarkState.loadingPromise) {
    setV17BookmarkButtonState('bookmark.loading', true, false);
    if (!v17BookmarkState.statusText) setV17BookmarkStatus('bookmark.loading', true);
    return true;
  }
  if (force || v17BookmarkState.loadedUserId !== user.id || v17BookmarkState.loadedThemeKey !== v17BookmarkState.currentThemeKey) {
    refreshV17BookmarkState(true);
    return true;
  }
  setV17BookmarkButtonState(v17BookmarkState.currentBookmark ? 'bookmark.saved' : 'bookmark.primaryCta', !canWrite, !!v17BookmarkState.currentBookmark);
  if (!v17BookmarkState.statusText) setV17BookmarkStatus('', true);
  return !!v17BookmarkState.currentBookmark;
}

function loadV17Bookmarks(force) {
  return refreshV17BookmarkState(force);
}

async function savePendingBookmarkIfNeeded() {
  var pending = getV17PendingBookmarkPayload();
  if (!pending || !getV17BookmarkUser()) return false;
  if (!canV17WriteBookmarkData()) {
    clearV17PendingBookmarkPayload();
    v17BookmarkState.pendingPayload = null;
    return false;
  }
  if (v17BookmarkState.pendingSavePromise) return v17BookmarkState.pendingSavePromise;

  v17BookmarkState.pendingSavePromise = (async function() {
    try {
      var result = await createV17Bookmark(pending);
      clearV17PendingBookmarkPayload();
      if (result && result.bookmark) {
        v17BookmarkState.currentBookmark = result.bookmark;
        v17BookmarkState.currentThemeKey = pending.stableThemeKey || v17BookmarkState.currentThemeKey;
        v17BookmarkState.currentThemeSnapshot = pending.themeSnapshot || v17BookmarkState.currentThemeSnapshot;
        v17BookmarkState.loadedUserId = (getV17BookmarkUser() && getV17BookmarkUser().id) || v17BookmarkState.loadedUserId;
        v17BookmarkState.loadedThemeKey = v17BookmarkState.currentThemeKey;
        v17BookmarkState.bookmarks = v17BookmarkState.bookmarks.filter(function(row) {
          return row && row.stableThemeKey !== v17BookmarkState.currentThemeKey;
        }).concat(result.bookmark);
        setV17BookmarkButtonState('bookmark.saved', false, true);
        setV17BookmarkStatus('bookmark.saved', false);
        renderV17BookmarkUI(false);
      }
      return !!(result && result.bookmark);
    } catch (error) {
      if (error && error.status === 403) {
        if (error.code === 'profile_unavailable') {
          setV17BookmarkStatus('bookmark.error', false);
        } else {
          setV17BookmarkStatus('bookmark.proRequired', false);
        }
        clearV17PendingBookmarkPayload();
        v17BookmarkState.pendingPayload = null;
      } else if (error && error.status === 401) {
        openV17AuthModal();
        setEl('auth-modal-title', v17Copy('bookmark.loginRequired'));
        setEl('auth-modal-body', v17Copy('bookmark.loginRequired'));
      } else {
        setV17BookmarkStatus('bookmark.error', false);
      }
      return false;
    } finally {
      v17BookmarkState.pendingSavePromise = null;
    }
  })();

  return v17BookmarkState.pendingSavePromise;
}

async function toggleCurrentThemeBookmark() {
  var ctx = await buildV17BookmarkContext();
  if (!ctx) {
    setV17BookmarkStatus('bookmark.error', false);
    return false;
  }

  var user = getV17BookmarkUser();
  if (user && !canV17WriteBookmarkData()) {
    setV17BookmarkStatus('bookmark.proRequired', false);
    setV17BookmarkButtonState(v17BookmarkState.currentBookmark ? 'bookmark.saved' : 'bookmark.primaryCta', true, !!v17BookmarkState.currentBookmark);
    return false;
  }
  if (!user) {
    v17BookmarkState.pendingPayload = ctx;
    setV17PendingBookmarkPayload(ctx);
    openV17AuthModal();
    setEl('auth-modal-title', v17Copy('bookmark.loginRequired'));
    setEl('auth-modal-body', v17Copy('bookmark.loginRequired'));
    setV17BookmarkStatus('bookmark.loginRequired', false);
    setV17BookmarkButtonState('bookmark.primaryCta', false, false);
    return false;
  }

  if (v17BookmarkState.loadingPromise) {
    await v17BookmarkState.loadingPromise.catch(function() {});
  } else {
    await refreshV17BookmarkState(true);
  }

  if (v17BookmarkState.loadingPromise) {
    await v17BookmarkState.loadingPromise.catch(function() {});
  }

  var current = v17BookmarkState.currentBookmark;
  if (current && current.stableThemeKey === ctx.stableThemeKey) {
    setV17BookmarkButtonState('bookmark.loading', true, true);
    setV17BookmarkStatus('bookmark.loading', true);
    try {
      await deleteV17Bookmark({ stableThemeKey: ctx.stableThemeKey });
      v17BookmarkState.currentBookmark = null;
      v17BookmarkState.bookmarks = v17BookmarkState.bookmarks.filter(function(row) {
        return row && row.stableThemeKey !== ctx.stableThemeKey;
      });
      v17BookmarkState.loadedUserId = user.id;
      v17BookmarkState.loadedThemeKey = ctx.stableThemeKey;
      setV17BookmarkButtonState('bookmark.primaryCta', false, false);
      setV17BookmarkStatus('bookmark.removed', false);
      renderV17BookmarkUI(false);
      return true;
    } catch (error) {
      if (error && error.status === 401) {
        openV17AuthModal();
        setEl('auth-modal-title', v17Copy('bookmark.loginRequired'));
        setEl('auth-modal-body', v17Copy('bookmark.loginRequired'));
      }
      setV17BookmarkButtonState('bookmark.saved', false, true);
      setV17BookmarkStatus('bookmark.error', false);
      return false;
    }
  }

  setV17BookmarkButtonState('bookmark.loading', true, false);
  setV17BookmarkStatus('bookmark.loading', true);
  try {
    var result = await createV17Bookmark(ctx);
    if (result && result.bookmark) {
      v17BookmarkState.currentBookmark = result.bookmark;
      v17BookmarkState.currentThemeKey = ctx.stableThemeKey;
      v17BookmarkState.currentThemeSnapshot = ctx.themeSnapshot;
      v17BookmarkState.loadedUserId = user.id;
      v17BookmarkState.loadedThemeKey = ctx.stableThemeKey;
      v17BookmarkState.bookmarks = v17BookmarkState.bookmarks.filter(function(row) {
        return row && row.stableThemeKey !== ctx.stableThemeKey;
      }).concat(result.bookmark);
      setV17BookmarkButtonState('bookmark.saved', false, true);
      setV17BookmarkStatus('bookmark.saved', false);
      renderV17BookmarkUI(false);
      return true;
    }
    setV17BookmarkButtonState('bookmark.primaryCta', false, false);
    setV17BookmarkStatus('bookmark.error', false);
    return false;
  } catch (error) {
    if (error && error.status === 403) {
      setV17BookmarkButtonState('bookmark.primaryCta', false, false);
      setV17BookmarkStatus('bookmark.proRequired', false);
      return false;
    }
    if (error && error.status === 401) {
      v17BookmarkState.pendingPayload = ctx;
      setV17PendingBookmarkPayload(ctx);
      openV17AuthModal();
      setEl('auth-modal-title', v17Copy('bookmark.loginRequired'));
      setEl('auth-modal-body', v17Copy('bookmark.loginRequired'));
      setV17BookmarkButtonState('bookmark.primaryCta', false, false);
      setV17BookmarkStatus('bookmark.loginRequired', false);
      return false;
    }
    setV17BookmarkButtonState('bookmark.primaryCta', false, false);
    setV17BookmarkStatus('bookmark.error', false);
    return false;
  }
}

async function isCurrentThemeBookmarked() {
  var ctx = await buildV17BookmarkContext();
  if (!ctx) return false;
  if (v17BookmarkState.loadingPromise) await v17BookmarkState.loadingPromise.catch(function() {});
  if (v17BookmarkState.loadedThemeKey !== ctx.stableThemeKey || v17BookmarkState.loadedUserId !== ((getV17BookmarkUser() && getV17BookmarkUser().id) || '')) {
    await refreshV17BookmarkState(true);
  }
  return !!(v17BookmarkState.currentBookmark && v17BookmarkState.currentBookmark.stableThemeKey === ctx.stableThemeKey);
}

window.fetchBookmarks = requestV17Bookmarks;
window.loadV17Bookmarks = loadV17Bookmarks;
window.createBookmark = createV17Bookmark;
window.deleteBookmark = deleteV17Bookmark;
window.isCurrentThemeBookmarked = isCurrentThemeBookmarked;
window.toggleCurrentThemeBookmark = toggleCurrentThemeBookmark;
window.renderV17BookmarkUI = renderV17BookmarkUI;
window.savePendingBookmarkIfNeeded = savePendingBookmarkIfNeeded;
