function loginWithGoogle() {
  if (!supabaseClient || !supabaseClient.auth) return;
  var msg = document.getElementById('auth-modal-msg');
  var btn = document.getElementById('auth-google-btn');
  if (msg) msg.textContent = '';
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  if (typeof trackEvent === 'function') trackEvent('google_login_started', { lang: lang });
  supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname
    }
  })
  .then(function(result) {
    if (result.error) {
      if (msg) msg.textContent = T('authErrorRetry');
      if (btn) { btn.disabled = false; setGoogleAuthButtonLabel(btn); }
    }
  })
  .catch(function() {
    if (msg) msg.textContent = T('authError');
    if (btn) { btn.disabled = false; setGoogleAuthButtonLabel(btn); }
  });
}

function submitAuthEmail() {
  if (!supabaseClient) return;
  var inp   = document.getElementById('auth-email-input');
  var msg   = document.getElementById('auth-modal-msg');
  var btn   = document.getElementById('auth-submit-btn');
  var email = inp ? inp.value.trim() : '';
  if (!email || !email.includes('@')) {
    if (msg) msg.textContent = T('authInvalidEmail');
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  if (msg) msg.textContent = '';
  supabaseClient.auth.signInWithOtp({
    email: email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname }
  })
  .then(function(result) {
    if (result.error) {
      if (msg) msg.textContent = T('authSendErrorRetry');
      if (btn) { btn.disabled = false; btn.textContent = T('authEmailButton'); }
    } else {
      if (msg) msg.textContent = T('authEmailSentMessage');
      if (inp) inp.disabled = true;
      if (btn) { btn.disabled = true; btn.textContent = T('authSent'); }
    }
  })
  .catch(function() {
    if (msg) msg.textContent = T('authSendError');
    if (btn) { btn.disabled = false; btn.textContent = T('authEmailButton'); }
  });
}

function handleAuthenticatedSession(event, session) {
  currentUser    = session ? session.user : currentUser;
  currentProfile = null;
  savePendingResultIfNeeded();
  savePendingProgressIfNeeded().then(loadSavedProgress).then(claimGuestFirstSessionIfNeeded).then(function() {
    fetchProfile();
    if (event === 'SIGNED_IN') closeAuthModal();
    if (_checkoutSuccessPending) refreshProfileAfterCheckout();
    updateLoginButton();
  });
}

function fetchProfile() {
  if (!supabaseClient || !currentUser) return;
  supabaseClient.auth.getSession()
    .then(function(result) {
      var token = result.data && result.data.session ? result.data.session.access_token : null;
      if (!token) return;
      return fetch('/api/me', { headers: { 'Authorization': 'Bearer ' + token } })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(data) {
          if (data && data.loggedIn) {
            currentProfile = data.profile;
            updatePortalButton();
            updatePricingCTA();
            if (!_checkoutSuccessPending) enforceTrialLock();
          }
        });
    })
    .catch(function() {});
}

function refreshProfileAfterCheckout() {
  if (!supabaseClient || !currentUser) return;
  var started = Date.now();
  var maxMs = 8000;

  function poll() {
    supabaseClient.auth.getSession()
      .then(function(result) {
        var token = result.data && result.data.session ? result.data.session.access_token : null;
        if (!token) return null;
        return fetch('/api/me', { headers: { 'Authorization': 'Bearer ' + token } })
          .then(function(r) { return r.ok ? r.json() : null; });
      })
      .then(function(data) {
        if (data && data.loggedIn) {
          currentProfile = data.profile;
          updatePortalButton();
          updatePricingCTA();
          if (isUnlimited()) { _checkoutSuccessPending = false; return; }
        }
        if (Date.now() - started < maxMs) {
          setTimeout(poll, 1000);
        } else {
          _checkoutSuccessPending = false;
          enforceTrialLock();
        }
      })
      .catch(function() {
        if (Date.now() - started < maxMs) {
          setTimeout(poll, 1000);
        } else {
          _checkoutSuccessPending = false;
        }
      });
  }

  poll();
}

function logoutUser() {
  function finishLogout() {
    currentUser = null;
    currentProfile = null;
    _checkoutSuccessPending = false;
    closeAuthModal();
    updatePortalButton();
    updatePricingCTA();
    updateLoginButton();
    if (typeof showScreenDirect === 'function') showScreenDirect('s-landing');
  }

  trackEvent('logout_clicked', { lang: lang });
  if (!supabaseClient || !supabaseClient.auth) { finishLogout(); return; }
  supabaseClient.auth.signOut()
    .then(function() { finishLogout(); })
    .catch(function() { finishLogout(); });
}

window.loginWithGoogle = loginWithGoogle;
window.submitAuthEmail = submitAuthEmail;
window.handleAuthenticatedSession = handleAuthenticatedSession;
window.fetchProfile = fetchProfile;
window.refreshProfileAfterCheckout = refreshProfileAfterCheckout;
window.logoutUser = logoutUser;
