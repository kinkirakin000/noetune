function isUnlimited() {
  if (currentProfile && currentProfile.plan_status === 'plus') return true;
  return false;
}

function isTrialExhausted() {
  if (!currentProfile || isUnlimited()) return false;
  var used = Number(currentProfile.trial_used_count || 0);
  return used >= FREE_THEME_LIMIT;
}

function enforceTrialLock() {
  if (_savedProgress) return false;
  if (!isTrialExhausted()) return false;
  trackEvent('trial_limit_reached', { source: 'profile' });
  if (cur !== 's-lock') fwd('s-lock');
  return true;
}

function requireActiveAccess() {
  if (_savedProgressResumeActive) return false;
  if (!isUnlimited() && isTrialExhausted()) {
    fwd('s-lock');
    return true;
  }
  return false;
}

function hasCompletedGuestFirstSession() {
  try { return localStorage.getItem('first_session_completed') === 'true'; }
  catch(e) { return false; }
}

function markGuestFirstSessionCompleted() {
  if (currentUser) return;
  try { localStorage.setItem('first_session_completed', 'true'); } catch(e) {}
  trackEvent('first_session_completed', { lang: lang });
}

function requireLoginAfterGuestFirstSession(source) {
  if (currentUser || !hasCompletedGuestFirstSession()) return false;
  trackEvent('login_required', { source: source || 'guest_second_session', lang: lang });
  fwd('s-lock');
  return true;
}

function consumeTrialOnResult() {
  if (_trialConsumedThisSession) return;
  if (isUnlimited()) return;
  if (!supabaseClient || !currentUser) return;
  _trialConsumedThisSession = true;
  supabaseClient.auth.getSession()
    .then(function(result) {
      var token = result.data && result.data.session ? result.data.session.access_token : null;
      if (!token) return null;
      return fetch('/api/consume-trial', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      }).then(function(r) { return r.ok ? r.json() : null; });
    })
    .then(function(data) {
      if (!data) return;
      if (data.locked) { trackEvent('trial_limit_reached', {}); fwd('s-lock'); return; }
      if (data.allowed && !data.unlimited) {
        if (currentProfile) {
          currentProfile.trial_used_count = data.trialUsedCount != null
            ? Number(data.trialUsedCount)
            : FREE_THEME_LIMIT;
        }
        trackEvent('trial_consumed', { used: currentProfile ? currentProfile.trial_used_count : FREE_THEME_LIMIT });
      }
    })
    .catch(function() {});
}

window.isUnlimited = isUnlimited;
window.isTrialExhausted = isTrialExhausted;
window.enforceTrialLock = enforceTrialLock;
window.requireActiveAccess = requireActiveAccess;
window.hasCompletedGuestFirstSession = hasCompletedGuestFirstSession;
window.markGuestFirstSessionCompleted = markGuestFirstSessionCompleted;
window.requireLoginAfterGuestFirstSession = requireLoginAfterGuestFirstSession;
window.consumeTrialOnResult = consumeTrialOnResult;
