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

window.loginWithGoogle = loginWithGoogle;
window.submitAuthEmail = submitAuthEmail;
