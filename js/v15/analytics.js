function initPostHog(cfg) {
  if (!cfg || !cfg.posthogKey) return;
  var host = cfg.posthogHost || 'https://us.i.posthog.com';
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/posthog-js@1.376.3/dist/array.full.js';
  s.integrity = 'sha384-Uu5xCi3lU8Ydnx6H+cKic5VDv43LUd0icwW2kQWVPz103bH8Y5gjPKvi9BBRQWWa';
  s.crossOrigin = 'anonymous';
  s.onload = function() {
    try {
      window.posthog.init(cfg.posthogKey, {
        api_host: host,
        autocapture: false,
        capture_pageview: false,
        loaded: function(ph) {
          _posthog = ph;
          trackEvent('app_opened', { lang: lang });
          try {
            var params = new URLSearchParams(window.location.search);
            if (params.get('checkout') === 'success') {
              // Only fire once — remove the param from history so refreshes don't re-trigger.
              trackEvent('subscription_active', { source: 'checkout_success', lang: lang });
              _checkoutSuccessPending = true;
              history.replaceState(null, '', window.location.pathname);
              refreshProfileAfterCheckout();
            }
          } catch(e) {}
        }
      });
    } catch(e) {}
  };
  s.onerror = function() {};
  document.head.appendChild(s);
}

function trackEvent(name, props) {
  try { if (typeof gtag === 'function') gtag('event', name); } catch(e) {}
  try { if (_posthog) _posthog.capture(name, props || {}); } catch(e) {}
}

window.initPostHog = initPostHog;
window.trackEvent = trackEvent;
