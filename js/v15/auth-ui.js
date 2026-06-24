function openAuthModal() {
  var modal = document.getElementById('auth-modal');
  var inp   = document.getElementById('auth-email-input');
  var msg   = document.getElementById('auth-modal-msg');
  var btn   = document.getElementById('auth-submit-btn');
  var googleBtn = document.getElementById('auth-google-btn');
  var title = document.getElementById('auth-modal-title');
  var body  = document.getElementById('auth-modal-body');
  if (!modal) return;
  if (msg)   msg.textContent = '';
  if (inp)   { inp.value = ''; inp.disabled = false; inp.style.display = 'none'; }
  if (title) title.textContent = T('authTitle');
  if (body) {
    body.textContent = T('authBody');
  }
  if (googleBtn) { googleBtn.style.display = ''; googleBtn.disabled = false; setGoogleAuthButtonLabel(googleBtn); }
  if (btn)   { btn.style.display = 'none'; btn.disabled = false; }
  if (inp)   { inp.placeholder = T('authEmailPlaceholder'); }
  modal.classList.add('open');
  setTimeout(function() { if (googleBtn) googleBtn.focus(); }, 80);
}

function closeAuthModal() {
  var modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('open');
}

function updateLoginButton() {
  var show = !!(supabaseClient && !currentUser);
  if (show) {
    var soonMsg = document.getElementById('t-pricing-soon');
    if (soonMsg) soonMsg.style.display = 'none';
  }
  var guestNote = document.getElementById('t-guest-records-note');
  if (guestNote) guestNote.style.display = show && lang !== 'ja' ? '' : 'none';
  updateAccountActions();
  updatePricingCTA();
}

window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.updateLoginButton = updateLoginButton;
