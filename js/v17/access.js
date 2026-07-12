(function() {
  'use strict';

  var V17_ACCESS_DEFAULT_STATE = 'guest';
  var v17AccessState = {
    loggedIn: false,
    profile: null,
    billing: null
  };

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
    var text = String(value || '').trim();
    if (!text) return V17_ACCESS_DEFAULT_STATE;
    text = text.toLowerCase();
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
    return 'unknown';
  }

  function safeNormalizeBillingProfile(profile, options) {
    var normalizer = typeof window !== 'undefined' && typeof window.normalizeV17BillingProfile === 'function'
      ? window.normalizeV17BillingProfile
      : null;
    if (normalizer) {
      try {
        var normalized = normalizer(profile, options);
        if (normalized && normalized.state && normalized.state !== 'unknown') {
          return normalized;
        }
        return buildFallbackBillingSnapshot(profile, options);
      } catch (error) {
        return buildFallbackBillingSnapshot(profile, options);
      }
    }

    var loggedIn = !!(options && options.loggedIn);
    if (!loggedIn) {
      return buildFallbackBillingSnapshot(null, { loggedIn: false });
    }

    return buildFallbackBillingSnapshot(profile, options);
  }

  function buildFallbackBillingSnapshot(profile, options) {
    options = options && typeof options === 'object' ? options : {};
    var loggedIn = !!options.loggedIn;
    var subscription = profile && profile.subscription && typeof profile.subscription === 'object'
      ? profile.subscription
      : null;
    var state = normalizeBillingStateName(
      profile && profile.billing_state !== undefined && profile.billing_state !== null
        ? profile.billing_state
        : (profile && profile.state !== undefined && profile.state !== null ? profile.state : 'unknown')
    );
    var hasStripeCustomer = !!(profile && (
      profile.hasStripeCustomer ||
      profile.stripe_customer_id ||
      profile.stripe_customer ||
      profile.stripeCustomer ||
      profile.customerId ||
      profile.customer_id
    ));
    var subscriptionStatus = subscription && subscription.status !== undefined && subscription.status !== null
      ? String(subscription.status)
      : (profile && profile.stripe_subscription_status !== undefined && profile.stripe_subscription_status !== null
        ? String(profile.stripe_subscription_status)
        : null);
    var cancelAtPeriodEnd = null;
    if (subscription && typeof subscription.cancelAtPeriodEnd === 'boolean') cancelAtPeriodEnd = subscription.cancelAtPeriodEnd;
    else if (subscription && typeof subscription.cancel_at_period_end === 'boolean') cancelAtPeriodEnd = subscription.cancel_at_period_end;
    else if (typeof (profile && profile.cancelAtPeriodEnd) === 'boolean') cancelAtPeriodEnd = profile.cancelAtPeriodEnd;
    else if (typeof (profile && profile.cancel_at_period_end) === 'boolean') cancelAtPeriodEnd = profile.cancel_at_period_end;
    var currentPeriodEnd = null;
    if (subscription && subscription.currentPeriodEnd !== undefined && subscription.currentPeriodEnd !== null) currentPeriodEnd = subscription.currentPeriodEnd;
    else if (subscription && subscription.current_period_end !== undefined && subscription.current_period_end !== null) currentPeriodEnd = subscription.current_period_end;
    else if (profile && profile.currentPeriodEnd !== undefined && profile.currentPeriodEnd !== null) currentPeriodEnd = profile.currentPeriodEnd;
    else if (profile && profile.current_period_end !== undefined && profile.current_period_end !== null) currentPeriodEnd = profile.current_period_end;
    var price = normalizeBillingPriceSnapshot(
      subscription && subscription.price && typeof subscription.price === 'object'
        ? subscription.price
        : (profile && profile.price && typeof profile.price === 'object' ? profile.price : null)
    );

    if (!loggedIn) {
      state = 'guest';
    } else if (!profile || typeof profile !== 'object') {
      state = 'unknown';
    }

    return {
      state: state,
      isLoggedIn: loggedIn,
      hasProfile: !!(profile && typeof profile === 'object'),
      hasStripeCustomer: hasStripeCustomer,
      hasProAccess: false,
      canManageSubscription: false,
      canStartCheckout: false,
      canViewSavedProData: loggedIn && !!(profile && typeof profile === 'object'),
      canWriteProData: false,
      subscriptionStatus: subscriptionStatus,
      cancelAtPeriodEnd: cancelAtPeriodEnd,
      currentPeriodEnd: currentPeriodEnd !== undefined && currentPeriodEnd !== null ? String(currentPeriodEnd) : null,
      price: price
    };
  }

  function normalizeBillingPriceSnapshot(price) {
    var normalized = {
      currency: null,
      unitAmount: null,
      interval: null,
      intervalCount: null
    };
    if (!price || typeof price !== 'object') return normalized;
    normalized.currency = typeof price.currency === 'string' && price.currency.trim()
      ? price.currency.trim().toLowerCase()
      : null;
    if (typeof price.unitAmount === 'number' && isFinite(price.unitAmount)) {
      normalized.unitAmount = price.unitAmount;
    } else if (price.unitAmount === 0) {
      normalized.unitAmount = 0;
    }
    normalized.interval = typeof price.interval === 'string' && price.interval.trim()
      ? price.interval.trim()
      : null;
    normalized.intervalCount = typeof price.intervalCount === 'number' && isFinite(price.intervalCount)
      ? price.intervalCount
      : null;
    return normalized;
  }

  function normalizeAccessSnapshot(billing) {
    var state = normalizeBillingStateName(billing && billing.state);
    var loggedIn = !!(billing && billing.isLoggedIn);
    var hasProfile = !!(billing && billing.hasProfile);
    var hasStripeCustomer = !!(billing && billing.hasStripeCustomer);
    var hasProAccess = typeof window !== 'undefined' && typeof window.hasV17ProAccess === 'function'
      ? !!window.hasV17ProAccess(state)
      : state === 'active' || state === 'cancel_scheduled';
    var canViewSavedProData = typeof window !== 'undefined' && typeof window.canV17ViewSavedProData === 'function'
      ? !!window.canV17ViewSavedProData(state)
      : state !== 'guest';
    var canWriteProData = typeof window !== 'undefined' && typeof window.canV17WriteProData === 'function'
      ? !!window.canV17WriteProData(state)
      : state === 'active' || state === 'cancel_scheduled';

    return {
      loggedIn: loggedIn,
      hasProfile: hasProfile,
      billingState: state,
      hasStripeCustomer: hasStripeCustomer,
      hasProAccess: hasProAccess,
      canUseCoreSession: true,
      canViewSavedProData: canViewSavedProData,
      canWriteProData: canWriteProData,
      subscriptionStatus: billing && billing.subscriptionStatus !== undefined && billing.subscriptionStatus !== null
        ? String(billing.subscriptionStatus)
        : null,
      cancelAtPeriodEnd: typeof (billing && billing.cancelAtPeriodEnd) === 'boolean'
        ? billing.cancelAtPeriodEnd
        : null,
      currentPeriodEnd: billing && billing.currentPeriodEnd !== undefined && billing.currentPeriodEnd !== null
        ? String(billing.currentPeriodEnd)
        : null,
      price: normalizeBillingPriceSnapshot(billing && billing.price)
    };
  }

  function setV17AccessContext(context) {
    var safeContext = context && typeof context === 'object' ? context : {};
    var billing = safeNormalizeBillingProfile(safeContext.profile, {
      loggedIn: !!safeContext.loggedIn
    });
    var snapshot = normalizeAccessSnapshot(billing);

    v17AccessState = {
      loggedIn: snapshot.loggedIn,
      profile: clonePlainObject(safeContext.profile),
      billing: clonePlainObject(billing)
    };

    return snapshot;
  }

  function getV17AccessSnapshot() {
    var billing = v17AccessState && v17AccessState.billing ? clonePlainObject(v17AccessState.billing) : null;
    if (!billing) {
      billing = safeNormalizeBillingProfile(null, {
        loggedIn: !!(v17AccessState && v17AccessState.loggedIn)
      });
    }
    return normalizeAccessSnapshot(clonePlainObject(billing));
  }

  function canUseV17CoreSession() {
    return true;
  }

  function hasV17UnlimitedSessions() {
    // v17 has no session count limit for guest, free, or Pro users.
    return true;
  }

  function hasV17ProFeatureAccess() {
    return !!getV17AccessSnapshot().hasProAccess;
  }

  function canV17ReadSavedProData() {
    return !!getV17AccessSnapshot().canViewSavedProData;
  }

  function canV17WriteSavedProData() {
    return !!getV17AccessSnapshot().canWriteProData;
  }

  function requireV17CoreSessionAccess() {
    return true;
  }

  function requireV17ProFeatureAccess(options) {
    var snapshot = getV17AccessSnapshot();
    if (snapshot.hasProAccess) return true;
    if (options && typeof options.onDenied === 'function') {
      try {
        options.onDenied(clonePlainObject(snapshot));
      } catch (error) {
        // Keep the access decision stable even if the caller's callback fails.
      }
    }
    return false;
  }

  if (typeof window !== 'undefined') {
    window.setV17AccessContext = setV17AccessContext;
    window.getV17AccessSnapshot = getV17AccessSnapshot;
    window.canUseV17CoreSession = canUseV17CoreSession;
    window.hasV17UnlimitedSessions = hasV17UnlimitedSessions;
    window.hasV17ProFeatureAccess = hasV17ProFeatureAccess;
    window.canV17ReadSavedProData = canV17ReadSavedProData;
    window.canV17WriteSavedProData = canV17WriteSavedProData;
    window.requireV17CoreSessionAccess = requireV17CoreSessionAccess;
    window.requireV17ProFeatureAccess = requireV17ProFeatureAccess;
  }
})();
