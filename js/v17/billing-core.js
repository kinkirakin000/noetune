(function() {
  'use strict';

  var v17BillingCoreState = {
    supabaseClient: null,
    inFlightAction: null
  };

  function isValidClient(client) {
    return !!client && typeof client === 'object';
  }

  function setV17BillingClient(client) {
    v17BillingCoreState.supabaseClient = isValidClient(client) ? client : null;
    return !!v17BillingCoreState.supabaseClient;
  }

  function getAuthClientFromV17AuthState() {
    if (typeof window === 'undefined') return null;
    var authState = window.v17AuthState;
    if (!authState || typeof authState !== 'object') return null;
    return isValidClient(authState.supabaseClient) ? authState.supabaseClient : null;
  }

  function getV17BillingClient() {
    if (isValidClient(v17BillingCoreState.supabaseClient)) return v17BillingCoreState.supabaseClient;
    if (typeof window !== 'undefined' && isValidClient(window.supabaseClient)) return window.supabaseClient;
    return getAuthClientFromV17AuthState();
  }

  async function getV17BillingAccessToken() {
    var client = getV17BillingClient();
    if (!client || !client.auth || typeof client.auth.getSession !== 'function') {
      var unavailableError = new Error('Billing client unavailable');
      unavailableError.code = 'client_unavailable';
      throw unavailableError;
    }

    var result = await client.auth.getSession();
    if (!result || result.error) {
      var sessionError = new Error((result && result.error && result.error.message) || 'Session unavailable');
      sessionError.code = 'session_error';
      sessionError.cause = result && result.error ? result.error : null;
      throw sessionError;
    }

    var session = result.data && result.data.session ? result.data.session : null;
    var token = session && session.access_token ? String(session.access_token) : '';
    if (!token) {
      var authError = new Error('Authentication required');
      authError.code = 'auth_required';
      throw authError;
    }

    return token;
  }

  async function readSafeResponseBody(response) {
    try {
      return await response.text();
    } catch (error) {
      return '';
    }
  }

  function normalizeErrorCode(code) {
    var value = String(code || '').trim();
    return value || 'unknown_error';
  }

  function makeResult(ok, code, extras) {
    var result = {
      ok: !!ok,
      code: normalizeErrorCode(code)
    };
    if (extras && typeof extras === 'object') {
      Object.keys(extras).forEach(function(key) {
        result[key] = extras[key];
      });
    }
    return result;
  }

  function getTrackEventFn() {
    if (typeof window === 'undefined') return null;
    return typeof window.trackEvent === 'function' ? window.trackEvent : null;
  }

  function trackBillingEvent(eventName) {
    var trackEvent = getTrackEventFn();
    if (!trackEvent) return;
    try {
      trackEvent(eventName);
    } catch (error) {
      // Analytics must never break billing flows.
    }
  }

  function isHttpUrl(url) {
    if (typeof url !== 'string') return false;
    var trimmed = url.trim();
    if (!trimmed) return false;
    try {
      var parsed = new URL(trimmed);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  function extractUrlFromResponse(data) {
    if (!data || typeof data !== 'object') return null;
    if (typeof data.url === 'string') return data.url.trim();
    if (data.data && typeof data.data === 'object' && typeof data.data.url === 'string') return data.data.url.trim();
    return null;
  }

  function normalizeResponseErrorMessage(response, rawText) {
    var statusText = response && response.statusText ? String(response.statusText) : '';
    var raw = typeof rawText === 'string' ? rawText.trim() : '';
    if (raw) {
      var snippet = raw.slice(0, 200);
      return statusText ? statusText + ': ' + snippet : snippet;
    }
    return statusText || 'Request failed';
  }

  async function requestV17BillingSession(endpoint, options) {
    var normalizedEndpoint = String(endpoint || '').trim();
    if (!normalizedEndpoint) {
      var invalidEndpointError = new Error('Invalid endpoint');
      invalidEndpointError.code = 'invalid_response';
      return makeResult(false, 'invalid_response', { error: invalidEndpointError });
    }

    var token;
    try {
      token = await getV17BillingAccessToken();
    } catch (error) {
      var authCode = error && error.code ? error.code : 'unknown_error';
      if (authCode === 'client_unavailable') {
        return makeResult(false, 'client_unavailable', { error: error });
      }
      if (authCode === 'session_error') {
        return makeResult(false, 'session_error', { error: error });
      }
      return makeResult(false, 'auth_required', { error: error });
    }

    var fetchOptions = {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: '{}'
    };

    var response;
    try {
      response = await fetch(normalizedEndpoint, fetchOptions);
    } catch (error) {
      return makeResult(false, 'request_failed', { error: error });
    }

    var rawText = await readSafeResponseBody(response);
    var data = null;
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch (error) {
        data = null;
      }
    }

    if (!response.ok) {
      var responseError = new Error(normalizeResponseErrorMessage(response, rawText));
      responseError.code = 'request_failed';
      responseError.status = response.status;
      responseError.response = data;
      return makeResult(false, 'request_failed', {
        error: responseError,
        status: response.status,
        response: data
      });
    }

    var url = extractUrlFromResponse(data);
    if (!isHttpUrl(url)) {
      var invalidResponseError = new Error('Invalid billing session response');
      invalidResponseError.code = 'invalid_response';
      invalidResponseError.response = data;
      return makeResult(false, 'invalid_response', {
        error: invalidResponseError,
        response: data
      });
    }

    return makeResult(true, 'ok', {
      url: url,
      response: data
    });
  }

  async function runBillingAction(actionName, endpoint, options) {
    if (v17BillingCoreState.inFlightAction) {
      return makeResult(false, 'billing_action_in_progress', {
        error: new Error('Billing action already in progress')
      });
    }

    v17BillingCoreState.inFlightAction = actionName;
    try {
      if (options && typeof options.onStart === 'function') {
        try {
          options.onStart();
        } catch (error) {
          // Keep the billing action running even if the callback fails.
        }
      }

      var result = await requestV17BillingSession(endpoint, options);
      if (!result.ok) {
        if (options && typeof options.onError === 'function') {
          try {
            options.onError(result);
          } catch (error) {
            // The billing result should not be affected by callback failures.
          }
        }
        return result;
      }

      if (options && typeof options.onSuccess === 'function') {
        try {
          options.onSuccess(result);
        } catch (error) {
          // Keep redirect and success handling independent from callbacks.
        }
      }

      return result;
    } finally {
      v17BillingCoreState.inFlightAction = null;
    }
  }

  async function startV17Checkout(options) {
    if (typeof window === 'undefined' || typeof window.isV17StripeCheckoutEnabled !== 'function' || window.isV17StripeCheckoutEnabled() !== true) {
      return makeResult(false, 'checkout_unavailable');
    }
    options = options && typeof options === 'object' ? options : {};
    var result = await runBillingAction('checkout', '/api/create-checkout-session', options);
    if (!result.ok) return result;

    trackBillingEvent('checkout_started');

    if (options.redirect === false) {
      return result;
    }

    try {
      if (typeof window !== 'undefined' && window.location && typeof window.location.assign === 'function') {
        window.location.assign(result.url);
      } else {
        var redirectError = new Error('Redirect unavailable');
        redirectError.code = 'redirect_failed';
        return makeResult(false, 'redirect_failed', { error: redirectError, url: result.url });
      }
    } catch (error) {
      return makeResult(false, 'redirect_failed', {
        error: error,
        url: result.url
      });
    }

    return result;
  }

  async function openV17CustomerPortal(options) {
    options = options && typeof options === 'object' ? options : {};
    var result = await runBillingAction('portal', '/api/create-portal-session', options);
    if (!result.ok) return result;

    trackBillingEvent('portal_opened');

    if (options.redirect === false) {
      return result;
    }

    try {
      if (typeof window !== 'undefined' && window.location && typeof window.location.assign === 'function') {
        window.location.assign(result.url);
      } else {
        var portalRedirectError = new Error('Redirect unavailable');
        portalRedirectError.code = 'redirect_failed';
        return makeResult(false, 'redirect_failed', { error: portalRedirectError, url: result.url });
      }
    } catch (error) {
      return makeResult(false, 'redirect_failed', {
        error: error,
        url: result.url
      });
    }

    return result;
  }

  function isV17BillingActionInFlight() {
    return !!v17BillingCoreState.inFlightAction;
  }

  function getV17BillingInFlightAction() {
    return v17BillingCoreState.inFlightAction || null;
  }

  if (typeof window !== 'undefined') {
    window.setV17BillingClient = setV17BillingClient;
    window.getV17BillingClient = getV17BillingClient;
    window.getV17BillingAccessToken = getV17BillingAccessToken;
    window.startV17Checkout = startV17Checkout;
    window.openV17CustomerPortal = openV17CustomerPortal;
    window.isV17BillingActionInFlight = isV17BillingActionInFlight;
    window.getV17BillingInFlightAction = getV17BillingInFlightAction;
  }
})();
