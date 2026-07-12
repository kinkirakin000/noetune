var v17AuthState = {
  status: 'idle',
  user: null,
  profile: null,
  error: null
};

var v17SupabaseClient = null;
var v17SupabaseReadyPromise = null;
var v17SupabaseSdkPromise = null;
var v17AuthBusy = false;
var v17PendingSavePromise = null;

var V17_PENDING_BOOKMARK_STORAGE_KEY = 'noetunePendingBookmark';

function syncV17AuthCompatibilityState() {
  if (typeof currentUser !== 'undefined') currentUser = v17AuthState.user || null;
  if (typeof currentProfile !== 'undefined') currentProfile = v17AuthState.profile || null;
  if (typeof supabaseClient !== 'undefined') supabaseClient = v17SupabaseClient || null;
}

function getV17BillingNormalizer() {
  if (typeof window !== 'undefined' && typeof window.normalizeV17BillingProfile === 'function') {
    return window.normalizeV17BillingProfile;
  }
  return null;
}

function getV17PendingAccessSnapshot() {
  if (typeof window === 'undefined' || typeof window.getV17AccessSnapshot !== 'function') return null;
  try {
    return window.getV17AccessSnapshot();
  } catch (error) {
    return null;
  }
}

function canFlushV17PendingSavedData() {
  try {
    var snapshot = getV17PendingAccessSnapshot();
    if (snapshot && snapshot.billingState === 'unknown') return false;
    if (snapshot && snapshot.billingState === 'guest') return false;
    if (snapshot && snapshot.canWriteProData === true) return true;
    if (snapshot && snapshot.canWriteProData === false) return false;
    if (typeof window !== 'undefined' && typeof window.canV17WriteSavedProData === 'function') {
      return window.canV17WriteSavedProData() === true;
    }
    if (typeof window !== 'undefined' && typeof window.canV17WriteProData === 'function') {
      return window.canV17WriteProData() === true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

function shouldDiscardV17PendingSavedData() {
  if (v17AuthState && v17AuthState.user && v17AuthState.status === 'free' && !v17AuthState.profile) {
    return true;
  }
  var snapshot = getV17PendingAccessSnapshot();
  if (!snapshot) return false;
  if (snapshot.billingState === 'guest' || snapshot.billingState === 'unknown') return false;
  return snapshot.canWriteProData === false;
}

function clearV17PendingCloudSaveState() {
  try {
    if (typeof clearPendingResult === 'function') clearPendingResult();
  } catch (error) {}
  try {
    if (typeof clearPendingProgress === 'function') clearPendingProgress();
  } catch (error) {}
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(V17_PENDING_BOOKMARK_STORAGE_KEY);
  } catch (error) {}
  v17PendingSavePromise = null;
}

function syncV17AuthBillingAndAccess(loggedIn, profile) {
  var client = v17SupabaseClient || null;
  if (client && typeof window !== 'undefined' && typeof window.setV17BillingClient === 'function') {
    try {
      window.setV17BillingClient(client);
    } catch (error) {}
  }

  var normalizedBilling = null;
  var normalizer = getV17BillingNormalizer();
  if (normalizer) {
    try {
      normalizedBilling = normalizer(profile, { loggedIn: !!loggedIn });
    } catch (error) {
      normalizedBilling = null;
    }
  }

  if (typeof window !== 'undefined' && typeof window.setV17AccessContext === 'function') {
    try {
      window.setV17AccessContext({ loggedIn: !!loggedIn, profile: profile || null });
    } catch (error) {}
  }

  v17AuthState.billing = normalizedBilling || null;
  if (normalizedBilling) {
    v17AuthState.billingSnapshot = normalizedBilling;
  } else {
    delete v17AuthState.billingSnapshot;
  }
}

function setV17AuthState(patch) {
  v17AuthState = Object.assign({}, v17AuthState, patch || {});
  syncV17AuthCompatibilityState();
  syncV17AuthBillingAndAccess(!!v17AuthState.user, v17AuthState.profile || null);
  renderV17AccountUI();
  refreshV17BillingUI();
  if (typeof renderV17BookmarkUI === 'function') renderV17BookmarkUI(false);
  return v17AuthState;
}

function runV17PendingSavesIfNeeded() {
  if (!v17AuthState.user || v17AuthState.status === 'guest' || v17AuthState.status === 'idle') {
    return Promise.resolve(false);
  }
  if (!canFlushV17PendingSavedData()) {
    if (shouldDiscardV17PendingSavedData()) {
      clearV17PendingCloudSaveState();
    }
    return Promise.resolve(false);
  }
  if (v17PendingSavePromise) return v17PendingSavePromise;
  v17PendingSavePromise = Promise.resolve()
    .then(function() {
      if (typeof savePendingResultIfNeeded === 'function') {
        return Promise.resolve(savePendingResultIfNeeded());
      }
      return null;
    })
    .then(function() {
      if (typeof savePendingProgressIfNeeded === 'function') {
        return Promise.resolve(savePendingProgressIfNeeded());
      }
      return null;
    })
    .then(function() {
      if (typeof savePendingBookmarkIfNeeded === 'function') {
        return Promise.resolve(savePendingBookmarkIfNeeded());
      }
      return null;
    })
    .catch(function(error) {
      if (error && error.status === 403) {
        clearV17PendingCloudSaveState();
      }
      return false;
    })
    .then(function(result) {
      v17PendingSavePromise = null;
      return result !== false;
  });
  return v17PendingSavePromise;
}

function refreshV17BillingUI() {
  try {
    if (typeof updatePricingCTA === 'function') {
      updatePricingCTA();
    }
  } catch (error) {
    console.warn('v17 billing ui update failed: updatePricingCTA', error);
  }
  try {
    if (typeof updatePricingAccountState === 'function') {
      updatePricingAccountState();
    }
  } catch (error) {
    console.warn('v17 billing ui update failed: updatePricingAccountState', error);
  }
  try {
    if (typeof updatePortalButton === 'function') {
      updatePortalButton();
    }
  } catch (error) {
    console.warn('v17 billing ui update failed: updatePortalButton', error);
  }
}

function getV17AccountChipLabelForState(state) {
  if (typeof v17Copy === 'function') {
    var value = v17Copy('flow.app.account');
    if (value) return value;
  }
  return state === 'free' ? 'Free' : state === 'plus' ? 'Pro' : 'Account';
}

function resetV17AuthModalUI() {
  var msg = getV17AuthMsg();
  var btn = getV17GoogleButton();
  if (msg) msg.textContent = '';
  if (btn) {
    btn.style.display = '';
    btn.disabled = v17AuthBusy;
    btn.setAttribute('aria-busy', v17AuthBusy ? 'true' : 'false');
    btn.onclick = loginV17WithGoogle;
    if (typeof setGoogleAuthButtonLabel === 'function') setGoogleAuthButtonLabel(btn);
  }
}

function getV17AuthModal() {
  return document.getElementById('auth-modal');
}

function getV17AuthMsg() {
  return document.getElementById('auth-modal-msg');
}

function getV17GoogleButton() {
  return document.getElementById('auth-google-btn');
}

function getV17AuthApiConfig() {
  return fetch('/api/config')
    .then(function(response) {
      return response && response.ok ? response.json() : null;
    });
}

function loadV17SupabaseSdk() {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    return Promise.resolve(true);
  }
  if (v17SupabaseSdkPromise) return v17SupabaseSdkPromise;
  v17SupabaseSdkPromise = new Promise(function(resolve) {
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.106.2/dist/umd/supabase.min.js';
    script.crossOrigin = 'anonymous';
    script.onload = function() { resolve(true); };
    script.onerror = function() {
      v17SupabaseSdkPromise = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });
  return v17SupabaseSdkPromise;
}

function ensureV17SupabaseReady() {
  if (v17SupabaseReadyPromise) return v17SupabaseReadyPromise;
  v17SupabaseReadyPromise = getV17AuthApiConfig()
    .then(function(cfg) {
      if (!cfg) {
        setV17AuthState({ status: 'error', user: null, profile: null, error: 'config' });
        return false;
      }
      if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
        setV17AuthState({ status: 'error', user: null, profile: null, error: 'missing_config' });
        return false;
      }
      return loadV17SupabaseSdk().then(function(ok) {
        if (!ok || !window.supabase || typeof window.supabase.createClient !== 'function') {
          setV17AuthState({ status: 'error', user: null, profile: null, error: 'sdk' });
          return false;
        }
        if (!v17SupabaseClient) {
          try {
            v17SupabaseClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
            syncV17AuthCompatibilityState();
            syncV17AuthBillingAndAccess(!!v17AuthState.user, v17AuthState.profile || null);
            v17SupabaseClient.auth.onAuthStateChange(function(event, session) {
              if (session && session.user) {
                if (v17AuthState.user && v17AuthState.user.id && v17AuthState.user.id !== session.user.id) {
                  clearV17PendingCloudSaveState();
                }
                setV17AuthState({
                  status: 'loading',
                  user: session.user,
                  profile: null,
                  error: null
                });
                closeV17AuthModal();
                fetchV17Profile().then(function() {
                  return runV17PendingSavesIfNeeded();
                });
              } else {
                if (v17AuthState.user) clearV17PendingCloudSaveState();
                setV17AuthState({ status: 'guest', user: null, profile: null, error: null });
              }
            });
          } catch (e) {
            setV17AuthState({ status: 'error', user: null, profile: null, error: 'create_client' });
            return false;
          }
        }
        return true;
      });
    })
    .catch(function() {
      setV17AuthState({ status: 'error', user: null, profile: null, error: 'config' });
      return false;
    })
    .then(function(ok) {
      if (!ok) v17SupabaseReadyPromise = null;
      return !!ok;
    });
  return v17SupabaseReadyPromise;
}

function isV17ProfilePlus(profile) {
  return !!(profile && profile.plan_status === 'plus');
}

async function fetchV17Profile() {
  if (!v17SupabaseClient || !v17SupabaseClient.auth) {
    setV17AuthState({ status: 'guest', user: null, profile: null, error: null });
    return null;
  }
  try {
    var sessionResult = await v17SupabaseClient.auth.getSession();
    var session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
    var token = session ? session.access_token : null;
    if (!token) {
      setV17AuthState({ status: 'guest', user: null, profile: null, error: null });
      return null;
    }
    var response = await fetch('/api/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!response.ok) {
      if (response.status === 401) {
        if (v17AuthState.user) clearV17PendingCloudSaveState();
        setV17AuthState({ status: 'guest', user: null, profile: null, error: null });
        return null;
      }
      setV17AuthState({ status: 'error', user: session && session.user ? session.user : null, profile: null, error: 'profile' });
      return null;
    }
    var data = await response.json();
    if (data && data.loggedIn) {
      var profile = data.profile || null;
      setV17AuthState({
        status: isV17ProfilePlus(profile) ? 'plus' : 'free',
        profile: profile,
        user: session && session.user ? session.user : v17AuthState.user,
        error: null
      });
      if (!profile) {
        clearV17PendingCloudSaveState();
      }
      return profile;
    }
    setV17AuthState({ status: 'guest', user: null, profile: null, error: null });
    return null;
  } catch (e) {
    setV17AuthState({ status: 'error', user: v17AuthState.user || null, profile: null, error: 'profile' });
    return null;
  }
}

async function restoreV17Session() {
  setV17AuthState({ status: 'loading', error: null });
  var ready = await ensureV17SupabaseReady();
  if (!ready || !v17SupabaseClient || !v17SupabaseClient.auth) {
    if (v17AuthState.status !== 'error') setV17AuthState({ status: 'error', user: null, profile: null, error: 'init' });
    return false;
  }
  try {
    var result = await v17SupabaseClient.auth.getSession();
    var session = result && result.data ? result.data.session : null;
    if (!session || !session.user) {
      setV17AuthState({ status: 'guest', user: null, profile: null, error: null });
      return false;
    }
    setV17AuthState({ status: 'loading', user: session.user, profile: null, error: null });
    await fetchV17Profile();
    await runV17PendingSavesIfNeeded();
    return true;
  } catch (e) {
    setV17AuthState({ status: 'error', user: null, profile: null, error: 'session' });
    return false;
  }
}

async function loginV17WithGoogle() {
  if (v17AuthBusy) return false;
  v17AuthBusy = true;
  var btn = getV17GoogleButton();
  if (btn) {
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
  }
  try {
    var ready = await ensureV17SupabaseReady();
    if (!ready || !v17SupabaseClient || !v17SupabaseClient.auth || typeof v17SupabaseClient.auth.signInWithOAuth !== 'function') {
      showV17AuthError('auth init failed');
      return false;
    }
    var result = await v17SupabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });
    if (result && result.error) {
      showV17AuthError(result.error.message || 'oauth failed');
      return false;
    }
    return true;
  } catch (e) {
    showV17AuthError(e && e.message ? e.message : 'oauth failed');
    return false;
  } finally {
    v17AuthBusy = false;
    if (btn) {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
    }
  }
}

async function logoutV17User() {
  try {
    if (v17SupabaseClient && v17SupabaseClient.auth) {
      await v17SupabaseClient.auth.signOut();
    }
  } catch (e) {}
  clearV17PendingCloudSaveState();
  setV17AuthState({ status: 'guest', user: null, profile: null, error: null, billing: null });
  return true;
}

function renderV17AccountUI() {
  var state = v17AuthState.status;
  var login = document.getElementById('account-login');
  var signup = document.getElementById('account-signup');
  var professional = document.getElementById('account-professional');
  var manage = document.getElementById('account-manage');
  var logout = document.getElementById('account-logout');
  var separator = document.getElementById('account-menu-separator');
  if (login) login.hidden = state !== 'guest';
  if (signup) signup.hidden = state !== 'guest';
  if (professional) professional.hidden = state !== 'free';
  if (manage) manage.hidden = state !== 'plus';
  if (logout) logout.hidden = state === 'guest';
  if (separator) separator.hidden = state === 'guest';

  var chip = document.getElementById('btn-account-chip');
  var chipLabel = document.getElementById('account-chip-label');
  if (chipLabel) {
    var chipText = getV17AccountChipLabelForState(state);
    if (chipText || state !== 'guest') {
      chipLabel.textContent = chipText;
    }
  }
  if (chip) chip.disabled = false;

  var modal = getV17AuthModal();
  var msg = getV17AuthMsg();
  var googleBtn = getV17GoogleButton();
  if (modal) modal.classList.toggle('open', modal.classList.contains('open'));
  if (googleBtn) googleBtn.disabled = v17AuthBusy;
  if (msg && v17AuthState.status === 'error' && !msg.textContent) {
    msg.textContent = 'Authentication error';
  }
}

function openV17AuthModal() {
  var modal = getV17AuthModal();
  if (!modal) return;
  resetV17AuthModalUI();
  modal.classList.add('open');
}

function closeV17AuthModal() {
  var modal = getV17AuthModal();
  if (!modal) return;
  modal.classList.remove('open');
}

function showV17AuthError(message) {
  var msg = getV17AuthMsg();
  if (msg) msg.textContent = message || 'Authentication error';
  setV17AuthState({ status: 'error', error: message || 'error' });
}

function refreshV17AuthBillingContext() {
  syncV17AuthCompatibilityState();
  syncV17AuthBillingAndAccess(!!v17AuthState.user, v17AuthState.profile || null);
  return v17AuthState;
}

window.initV17Auth = initV17Auth;
window.loginV17WithGoogle = loginV17WithGoogle;
window.logoutV17User = logoutV17User;
window.openV17AuthModal = openV17AuthModal;
window.closeV17AuthModal = closeV17AuthModal;
window.restoreV17Session = restoreV17Session;
window.refreshV17AuthBillingContext = refreshV17AuthBillingContext;

syncV17AuthBillingAndAccess(false, null);

async function initV17Auth() {
  try {
    var ready = await ensureV17SupabaseReady();
    if (!ready) return false;
    await restoreV17Session();
    return true;
  } catch (error) {
    console.error(error);
    showV17AuthError('auth init failed: ' + (error && error.message ? error.message : String(error)));
    return false;
  }
}
