function pricingCtaClick() {
  var isLock = cur === 's-lock';
  var activeBtn = document.getElementById(isLock ? 'btn-lock-cta' : 'btn-pricing-cta');
  var activeBtnPath = isLock ? 'ui.lock_cta' : 'ui.professionalPlanCta';
  var soonMsg = document.getElementById('t-pricing-soon');
  var fallbackLabel = typeof getPricingAccountCtaLabel === 'function'
    ? getPricingAccountCtaLabel()
    : t(activeBtnPath);

  function showFallback() {
    if (activeBtn) { activeBtn.disabled = false; activeBtn.textContent = fallbackLabel; }
    if (soonMsg) soonMsg.style.display = 'block';
  }

  if (!supabaseClient) { showFallback(); return; }
  if (!currentUser) { openAuthModal(); return; }
  if (isUnlimited()) { startSession(); return; }

  trackEvent('checkout_started', { source: isLock ? 's-lock' : 's-pricing', lang: lang });
  if (activeBtn) { activeBtn.disabled = true; activeBtn.textContent = '…'; }

  supabaseClient.auth.getSession()
    .then(function(result) {
      var token = result.data && result.data.session ? result.data.session.access_token : null;
      if (!token) { showFallback(); return null; }
      return fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      }).then(function(r) { return r.ok ? r.json() : null; });
    })
    .then(function(data) {
      if (data && data.url) { window.location.href = data.url; }
      else showFallback();
    })
    .catch(function() { showFallback(); });
}

function openCustomerPortal() {
  var buttons = getPortalButtons();
  if (!supabaseClient || !currentUser) return;
  buttons.forEach(function(btn) { btn.disabled = true; btn.textContent = '…'; });
  supabaseClient.auth.getSession()
    .then(function(result) {
      var token = result.data && result.data.session ? result.data.session.access_token : null;
      if (!token) { updatePortalButton(); return null; }
      return fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      }).then(function(r) { return r.ok ? r.json() : null; });
    })
    .then(function(data) {
      if (data && data.url) { trackEvent('portal_opened', { lang: lang }); window.location.href = data.url; }
      else updatePortalButton();
    })
    .catch(function() { updatePortalButton(); });
}

function getPortalButtons() {
  return ['account-manage']
    .map(function(id) { return document.getElementById(id); })
    .filter(function(btn) { return !!btn; });
}

function getPortalManageLabel(btn) {
  return T('portal_manage');
}

window.pricingCtaClick = pricingCtaClick;
window.openCustomerPortal = openCustomerPortal;
window.getPortalButtons = getPortalButtons;
window.getPortalManageLabel = getPortalManageLabel;
