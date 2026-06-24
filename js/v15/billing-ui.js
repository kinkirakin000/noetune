function updatePricingCTA() {
  var isPlus = isUnlimited();
  var soonMsg = document.getElementById('t-pricing-soon');
  var plusLabel = T('professionalSessionCta');
  [
    { id: 'btn-pricing-cta', path: 'ui.professionalPlanCta' },
    { id: 'btn-lock-cta',    path: 'ui.lock_cta' }
  ].forEach(function(item) {
    var btn = document.getElementById(item.id);
    if (!btn) return;
    btn.textContent = isPlus ? plusLabel : t(item.path);
  });
  if (isPlus && soonMsg) soonMsg.style.display = 'none';
}

function updatePortalButton() {
  var buttons = getPortalButtons();
  if (!buttons.length) return;
  var isPlus = isUnlimited();
  buttons.forEach(function(btn) {
    btn.hidden = !isPlus;
    btn.disabled = false;
    if (isPlus) btn.textContent = T('manageSubscription');
  });
  updateAccountActions();
  if (isPlus) {
    if (!updatePortalButton._plusTracked) {
      updatePortalButton._plusTracked = true;
      trackEvent('subscription_active', { source: 'profile' });
    }
  }
}

window.updatePricingCTA = updatePricingCTA;
window.updatePortalButton = updatePortalButton;
