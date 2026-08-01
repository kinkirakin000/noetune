(function() {
  'use strict';

  var V17_BILLING_UI_DEFAULT_STATE = 'unknown';
  var v17BillingUIModelState = null;

  function clonePlainObject(value) {
    if (!value || typeof value !== 'object') return null;
    return JSON.parse(JSON.stringify(value));
  }

  function getBillingStates() {
    if (typeof window === 'undefined') return null;
    return window.V17_BILLING_STATES || null;
  }

  function normalizeBillingStateName(value) {
    var states = getBillingStates();
    var text = String(value || '').trim().toLowerCase();
    if (!text) return V17_BILLING_UI_DEFAULT_STATE;
    if (states) {
      if (text === states.GUEST ||
          text === states.FREE ||
          text === states.ACTIVE ||
          text === states.CANCEL_SCHEDULED ||
          text === states.PAYMENT_ATTENTION ||
          text === states.ENDED ||
          text === states.UNKNOWN) {
        return text;
      }
    } else if (text === 'guest' || text === 'free' || text === 'active' || text === 'cancel_scheduled' || text === 'payment_attention' || text === 'ended' || text === 'unknown') {
      return text;
    }
    return V17_BILLING_UI_DEFAULT_STATE;
  }

  function safeGetAccessSnapshot() {
    if (typeof window !== 'undefined' && typeof window.getV17AccessSnapshot === 'function') {
      try {
        return window.getV17AccessSnapshot();
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function safeIsBillingActionInFlight() {
    if (typeof window !== 'undefined' && typeof window.isV17BillingActionInFlight === 'function') {
      try {
        return !!window.isV17BillingActionInFlight();
      } catch (error) {
        return false;
      }
    }
    return false;
  }

  function isCheckoutEnabled() {
    if (typeof window === 'undefined' || typeof window.isV17StripeCheckoutEnabled !== 'function') return false;
    try { return window.isV17StripeCheckoutEnabled() === true; } catch (error) { return false; }
  }

  function safeInvoke(fn, args) {
    if (typeof fn !== 'function') return null;
    try {
      return fn.apply(null, args || []);
    } catch (error) {
      return null;
    }
  }

  function getSafePriceShape(price) {
    var normalized = {
      currency: null,
      unitAmount: null,
      interval: null,
      intervalCount: null
    };
    if (!price || typeof price !== 'object') return normalized;
    normalized.currency = typeof price.currency === 'string' && price.currency.trim() ? price.currency.trim().toLowerCase() : null;
    if (typeof price.unitAmount === 'number' && isFinite(price.unitAmount)) {
      normalized.unitAmount = price.unitAmount;
    } else if (price.unitAmount === 0) {
      normalized.unitAmount = 0;
    }
    normalized.interval = typeof price.interval === 'string' && price.interval.trim() ? price.interval.trim() : null;
    normalized.intervalCount = typeof price.intervalCount === 'number' && isFinite(price.intervalCount) && price.intervalCount > 0
      ? price.intervalCount
      : null;
    return normalized;
  }

  function getLocaleFromDocument(locale) {
    if (locale && typeof locale === 'string' && locale.trim()) return locale.trim();
    if (typeof document !== 'undefined' && document.documentElement && typeof document.documentElement.lang === 'string' && document.documentElement.lang.trim()) {
      return document.documentElement.lang.trim();
    }
    return 'en';
  }

  function isValidDateInput(value) {
    if (value === null || value === undefined || value === '') return false;
    var date = new Date(value);
    return !isNaN(date.getTime());
  }

  function formatV17BillingDate(value, locale) {
    if (!isValidDateInput(value)) return '';
    var resolvedLocale = getLocaleFromDocument(locale);
    try {
      return new Intl.DateTimeFormat(resolvedLocale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'UTC'
      }).format(new Date(value));
    } catch (error) {
      return '';
    }
  }

  function getCurrencyDigits(currency) {
    var zeroDecimalCurrencies = {
      TWD: true,
      JPY: true,
      KRW: true
    };
    var code = String(currency || '').trim().toUpperCase();
    if (!code) return null;
    if (zeroDecimalCurrencies[code]) return 0;
    try {
      var formatter = new Intl.NumberFormat('en', {
        style: 'currency',
        currency: currency,
        currencyDisplay: 'symbol'
      });
      return formatter.resolvedOptions().maximumFractionDigits;
    } catch (error) {
      return null;
    }
  }

  function isSupportedCurrencyCode(currency, locale) {
    try {
      var formatter = new Intl.NumberFormat(locale || 'en', {
        style: 'currency',
        currency: currency
      });
      var resolved = formatter.resolvedOptions();
      if (!resolved || !resolved.currency) return false;
      return resolved.currency.toUpperCase() !== 'XXX';
    } catch (error) {
      return false;
    }
  }

  function formatV17BillingPrice(price, locale) {
    var normalized = getSafePriceShape(price);
    if (!normalized.currency || typeof normalized.unitAmount !== 'number') return '';

    var resolvedLocale = getLocaleFromDocument(locale);
    var currency = normalized.currency.toUpperCase();
    if (!isSupportedCurrencyCode(currency, resolvedLocale)) return '';
    var fractionDigits = getCurrencyDigits(currency);
    if (fractionDigits === null || fractionDigits < 0) return '';
    var amount = normalized.unitAmount / Math.pow(10, fractionDigits);

    try {
      return new Intl.NumberFormat(resolvedLocale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits
      }).format(amount);
    } catch (error) {
      try {
        return new Intl.NumberFormat(resolvedLocale, {
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits
        }).format(amount) + ' ' + currency;
      } catch (fallbackError) {
        return String(amount) + ' ' + currency;
      }
    }
  }

  function buildV17BillingUIModel(accessSnapshot) {
    var access = accessSnapshot && typeof accessSnapshot === 'object'
      ? accessSnapshot
      : safeGetAccessSnapshot();
    var normalizedState = normalizeBillingStateName(access && access.billingState);
    var hasStripeCustomer = !!(access && access.hasStripeCustomer);
    var hasProAccess = !!(access && access.hasProAccess);
    var canViewSavedProData = !!(access && access.canViewSavedProData);
    var canWriteProData = !!(access && access.canWriteProData);
    var isLoggedIn = !!(access && access.loggedIn);
    var primaryAction = 'none';
    var primaryEnabled = false;
    var showCheckout = false;
    var showPortal = false;
    var showSubscriptionDetails = false;
    var showPaymentAttention = false;
    var showUnknownWarning = false;
    var checkoutEnabled = isCheckoutEnabled();

    if (normalizedState === 'guest') {
      primaryAction = 'auth';
      primaryEnabled = true;
      showCheckout = true;
      showPortal = false;
      showSubscriptionDetails = false;
    } else if (normalizedState === 'free') {
      primaryAction = 'checkout';
      primaryEnabled = true;
      showCheckout = true;
      showPortal = hasStripeCustomer === true;
    } else if (normalizedState === 'active') {
      if (hasStripeCustomer) {
        primaryAction = 'portal';
        primaryEnabled = true;
        showCheckout = false;
        showPortal = true;
        showSubscriptionDetails = true;
      } else {
        primaryAction = 'none';
        primaryEnabled = false;
        showCheckout = false;
        showPortal = false;
        showSubscriptionDetails = true;
        showUnknownWarning = true;
      }
    } else if (normalizedState === 'cancel_scheduled') {
      if (hasStripeCustomer) {
        primaryAction = 'portal';
        primaryEnabled = true;
        showCheckout = false;
        showPortal = true;
        showSubscriptionDetails = true;
      } else {
        primaryAction = 'none';
        primaryEnabled = false;
        showCheckout = false;
        showPortal = false;
        showSubscriptionDetails = true;
        showUnknownWarning = true;
      }
    } else if (normalizedState === 'payment_attention') {
      if (hasStripeCustomer) {
        primaryAction = 'portal';
        primaryEnabled = true;
        showPortal = true;
        showCheckout = false;
      } else {
        primaryAction = 'checkout';
        primaryEnabled = true;
        showPortal = false;
        showCheckout = true;
      }
      showPaymentAttention = true;
    } else if (normalizedState === 'ended') {
      primaryAction = 'checkout';
      primaryEnabled = true;
      showCheckout = true;
      showPortal = hasStripeCustomer === true;
      showSubscriptionDetails = true;
    } else {
      primaryAction = 'none';
      primaryEnabled = false;
      showCheckout = false;
      showPortal = false;
      showUnknownWarning = true;
    }

    if (!checkoutEnabled && (primaryAction === 'checkout')) {
      primaryAction = 'none';
      primaryEnabled = false;
      showCheckout = false;
    }

    if (!canViewSavedProData) {
      showSubscriptionDetails = false;
    }

    if (normalizedState === 'guest') {
      showPaymentAttention = false;
      showUnknownWarning = false;
    }

    var price = getSafePriceShape(access && access.price);
    var model = {
      state: normalizedState,
      isLoggedIn: isLoggedIn,
      hasStripeCustomer: hasStripeCustomer,
      hasProAccess: hasProAccess,
      canViewSavedProData: canViewSavedProData,
      canWriteProData: canWriteProData,
      primaryAction: primaryAction,
      primaryEnabled: primaryEnabled,
      primaryLoading: safeIsBillingActionInFlight(),
      showCheckout: showCheckout,
      showPortal: showPortal,
      showSubscriptionDetails: showSubscriptionDetails,
      showPaymentAttention: showPaymentAttention,
      showUnknownWarning: showUnknownWarning,
      price: price,
      subscriptionStatus: access && access.subscriptionStatus !== undefined && access.subscriptionStatus !== null ? String(access.subscriptionStatus) : null,
      cancelAtPeriodEnd: typeof (access && access.cancelAtPeriodEnd) === 'boolean' ? access.cancelAtPeriodEnd : null,
      currentPeriodEnd: access && access.currentPeriodEnd !== undefined && access.currentPeriodEnd !== null ? String(access.currentPeriodEnd) : null
    };

    if (normalizedState === 'unknown') {
      model.hasProAccess = false;
      model.canWriteProData = false;
    }

    return model;
  }

  function getV17BillingUIModel() {
    return buildV17BillingUIModel(safeGetAccessSnapshot());
  }

  function refreshV17BillingUIModel() {
    v17BillingUIModelState = buildV17BillingUIModel(safeGetAccessSnapshot());
    return clonePlainObject(v17BillingUIModelState);
  }

  function getCurrentV17BillingUIModel() {
    if (!v17BillingUIModelState) return null;
    return clonePlainObject(v17BillingUIModelState);
  }

  function performV17BillingPrimaryAction(options) {
    options = options && typeof options === 'object' ? options : {};
    var model = v17BillingUIModelState || getV17BillingUIModel();
    if (!model || !model.state) {
      return { ok: false, code: 'billing_state_unavailable' };
    }

    if (model.primaryAction === 'auth') {
      if (typeof options.onAuthRequired === 'function') {
        try {
          options.onAuthRequired(clonePlainObject(model));
        } catch (error) {}
      }
      return { ok: false, code: 'auth_required' };
    }

    if (model.primaryAction === 'checkout') {
      if (typeof window === 'undefined' || typeof window.startV17Checkout !== 'function') {
        return { ok: false, code: 'billing_core_unavailable' };
      }
      return safeInvoke(window.startV17Checkout, [options]) || { ok: false, code: 'unknown_error' };
    }

    if (model.primaryAction === 'portal') {
      if (typeof window === 'undefined' || typeof window.openV17CustomerPortal !== 'function') {
        return { ok: false, code: 'billing_core_unavailable' };
      }
      return safeInvoke(window.openV17CustomerPortal, [options]) || { ok: false, code: 'unknown_error' };
    }

    if (model.primaryAction === 'none') {
      return { ok: false, code: 'billing_state_unavailable' };
    }

    return { ok: false, code: 'billing_state_unavailable' };
  }

  if (typeof window !== 'undefined') {
    window.buildV17BillingUIModel = buildV17BillingUIModel;
    window.getV17BillingUIModel = getV17BillingUIModel;
    window.refreshV17BillingUIModel = refreshV17BillingUIModel;
    window.getCurrentV17BillingUIModel = getCurrentV17BillingUIModel;
    window.performV17BillingPrimaryAction = performV17BillingPrimaryAction;
    window.formatV17BillingPrice = formatV17BillingPrice;
    window.formatV17BillingDate = formatV17BillingDate;
  }
})();
