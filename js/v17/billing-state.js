(function() {
  'use strict';

  var V17_BILLING_STATES = Object.freeze({
    GUEST: 'guest',
    FREE: 'free',
    ACTIVE: 'active',
    CANCEL_SCHEDULED: 'cancel_scheduled',
    PAYMENT_ATTENTION: 'payment_attention',
    ENDED: 'ended',
    UNKNOWN: 'unknown'
  });

  function normalizeV17BillingStateName(state) {
    var value = String(state || '').trim();
    if (!value) return V17_BILLING_STATES.UNKNOWN;
    value = value.toLowerCase();
    if (value === V17_BILLING_STATES.GUEST ||
        value === V17_BILLING_STATES.FREE ||
        value === V17_BILLING_STATES.ACTIVE ||
        value === V17_BILLING_STATES.CANCEL_SCHEDULED ||
        value === V17_BILLING_STATES.PAYMENT_ATTENTION ||
        value === V17_BILLING_STATES.ENDED ||
        value === V17_BILLING_STATES.UNKNOWN) {
      return value;
    }
    return V17_BILLING_STATES.UNKNOWN;
  }

  function toPositiveIntegerOrNull(value) {
    if (typeof value !== 'number' || !isFinite(value) || value <= 0 || Math.floor(value) !== value) return null;
    return value;
  }

  function normalizeV17BillingPrice(price) {
    var normalized = {
      currency: null,
      unitAmount: null,
      interval: null,
      intervalCount: null
    };
    if (!price || typeof price !== 'object') return normalized;
    if (price.currency !== null && price.currency !== undefined) {
      normalized.currency = String(price.currency).trim().toLowerCase() || null;
    }
    if (typeof price.unitAmount === 'number' && isFinite(price.unitAmount)) {
      normalized.unitAmount = price.unitAmount;
    } else if (price.unitAmount === 0) {
      normalized.unitAmount = 0;
    }
    if (price.interval !== null && price.interval !== undefined) {
      var interval = String(price.interval).trim();
      normalized.interval = interval || null;
    }
    normalized.intervalCount = toPositiveIntegerOrNull(price.intervalCount);
    return normalized;
  }

  function normalizeV17BillingDate(value) {
    if (value === null || value === undefined || value === '') return null;
    var text = String(value).trim();
    if (!text) return null;
    var time = new Date(text).getTime();
    return isFinite(time) ? text : null;
  }

  function extractV17Subscription(profile) {
    if (!profile || typeof profile !== 'object') return null;
    return profile.subscription && typeof profile.subscription === 'object'
      ? profile.subscription
      : null;
  }

  function getV17SubscriptionStatus(profile) {
    var subscription = extractV17Subscription(profile);
    var status = subscription && subscription.status !== undefined && subscription.status !== null
      ? String(subscription.status).trim().toLowerCase()
      : '';
    return status || null;
  }

  function getV17CancelAtPeriodEnd(profile) {
    var subscription = extractV17Subscription(profile);
    if (subscription && typeof subscription.cancelAtPeriodEnd === 'boolean') return subscription.cancelAtPeriodEnd;
    if (profile && typeof profile.cancelAtPeriodEnd === 'boolean') return profile.cancelAtPeriodEnd;
    return null;
  }

  function getV17CurrentPeriodEnd(profile) {
    var subscription = extractV17Subscription(profile);
    var raw = subscription && subscription.currentPeriodEnd !== undefined && subscription.currentPeriodEnd !== null
      ? subscription.currentPeriodEnd
      : (profile && profile.current_period_end !== undefined ? profile.current_period_end : profile && profile.currentPeriodEnd);
    return normalizeV17BillingDate(raw);
  }

  function getV17BillingStateCandidate(profile) {
    if (!profile || typeof profile !== 'object') return null;
    var raw = profile.billing_state !== undefined && profile.billing_state !== null
      ? profile.billing_state
      : profile.state;
    return normalizeV17BillingStateName(raw);
  }

  function hasV17Subscription(profile) {
    return !!extractV17Subscription(profile);
  }

  function hasV17ProAccess(billingState) {
    var state = normalizeV17BillingStateName(billingState);
    return state === V17_BILLING_STATES.ACTIVE || state === V17_BILLING_STATES.CANCEL_SCHEDULED;
  }

  function canV17ManageSubscription(billingState) {
    var state = normalizeV17BillingStateName(billingState);
    return state === V17_BILLING_STATES.ACTIVE ||
      state === V17_BILLING_STATES.CANCEL_SCHEDULED ||
      state === V17_BILLING_STATES.PAYMENT_ATTENTION ||
      state === V17_BILLING_STATES.ENDED;
  }

  function canV17StartCheckout(billingState) {
    var state = normalizeV17BillingStateName(billingState);
    return state === V17_BILLING_STATES.GUEST ||
      state === V17_BILLING_STATES.FREE ||
      state === V17_BILLING_STATES.PAYMENT_ATTENTION ||
      state === V17_BILLING_STATES.ENDED;
  }

  function canV17ViewSavedProData(billingState) {
    var state = normalizeV17BillingStateName(billingState);
    return state !== V17_BILLING_STATES.GUEST;
  }

  function canV17WriteProData(billingState) {
    var state = normalizeV17BillingStateName(billingState);
    return state === V17_BILLING_STATES.ACTIVE ||
      state === V17_BILLING_STATES.CANCEL_SCHEDULED;
  }

  function normalizeV17BillingProfile(profile, options) {
    options = options && typeof options === 'object' ? options : {};
    var loggedIn = !!options.loggedIn;
    if (!loggedIn) {
      return {
        state: V17_BILLING_STATES.GUEST,
        isLoggedIn: false,
        hasProfile: false,
        hasStripeCustomer: false,
        hasProAccess: false,
        canManageSubscription: false,
        canStartCheckout: false,
        canViewSavedProData: false,
        canWriteProData: false,
        subscriptionStatus: null,
        cancelAtPeriodEnd: null,
        currentPeriodEnd: null,
        price: normalizeV17BillingPrice(null)
      };
    }

    if (!profile || typeof profile !== 'object') {
      return {
        state: V17_BILLING_STATES.UNKNOWN,
        isLoggedIn: true,
        hasProfile: false,
        hasStripeCustomer: false,
        hasProAccess: false,
        canManageSubscription: false,
        canStartCheckout: false,
        canViewSavedProData: true,
        canWriteProData: false,
        subscriptionStatus: null,
        cancelAtPeriodEnd: null,
        currentPeriodEnd: null,
        price: normalizeV17BillingPrice(null)
      };
    }

    var candidate = getV17BillingStateCandidate(profile);
    var subscription = extractV17Subscription(profile);
    var subscriptionStatus = getV17SubscriptionStatus(profile);
    var cancelAtPeriodEnd = getV17CancelAtPeriodEnd(profile);
    var hasStripeCustomer = !!profile.hasStripeCustomer || !!profile.stripe_customer || !!profile.stripeCustomer || !!profile.customerId || !!profile.customer_id;
    var hasProfile = true;
    var state = candidate;

    if (state === V17_BILLING_STATES.UNKNOWN) {
      // keep unknown
    } else if (state === V17_BILLING_STATES.FREE) {
      if (!subscription && !hasStripeCustomer) {
        // valid free profile
      }
    } else if (state === V17_BILLING_STATES.ACTIVE) {
      if (!subscription || !hasStripeCustomer) state = V17_BILLING_STATES.UNKNOWN;
      else if (subscriptionStatus !== 'active' && subscriptionStatus !== 'trialing') state = V17_BILLING_STATES.UNKNOWN;
    } else if (state === V17_BILLING_STATES.CANCEL_SCHEDULED) {
      if (!subscription || !hasStripeCustomer) state = V17_BILLING_STATES.UNKNOWN;
      else if (subscriptionStatus !== 'active' && subscriptionStatus !== 'trialing') state = V17_BILLING_STATES.UNKNOWN;
      else if (cancelAtPeriodEnd !== true) state = V17_BILLING_STATES.UNKNOWN;
    } else if (state === V17_BILLING_STATES.PAYMENT_ATTENTION) {
      if (!subscription) state = V17_BILLING_STATES.UNKNOWN;
      else if (subscriptionStatus !== 'past_due' && subscriptionStatus !== 'unpaid' && subscriptionStatus !== 'incomplete') state = V17_BILLING_STATES.UNKNOWN;
    } else if (state === V17_BILLING_STATES.ENDED) {
      if (!subscription) state = V17_BILLING_STATES.UNKNOWN;
      else if (subscriptionStatus !== 'canceled' && subscriptionStatus !== 'incomplete_expired') state = V17_BILLING_STATES.UNKNOWN;
    }

    if (state === V17_BILLING_STATES.UNKNOWN && !hasStripeCustomer && subscription) {
      // still unknown, but keep normalized fields below
    }

    var price = normalizeV17BillingPrice(
      subscription && subscription.price ? subscription.price : profile.price
    );

    return {
      state: state,
      isLoggedIn: true,
      hasProfile: hasProfile,
      hasStripeCustomer: hasStripeCustomer,
      hasProAccess: hasV17ProAccess(state),
      canManageSubscription: canV17ManageSubscription(state) && hasStripeCustomer,
      canStartCheckout: canV17StartCheckout(state),
      canViewSavedProData: canV17ViewSavedProData(state),
      canWriteProData: canV17WriteProData(state),
      subscriptionStatus: subscriptionStatus,
      cancelAtPeriodEnd: cancelAtPeriodEnd,
      currentPeriodEnd: getV17CurrentPeriodEnd(profile),
      price: price
    };
  }

  if (typeof window !== 'undefined') {
    window.V17_BILLING_STATES = V17_BILLING_STATES;
    window.normalizeV17BillingProfile = normalizeV17BillingProfile;
    window.hasV17ProAccess = hasV17ProAccess;
    window.canV17ManageSubscription = canV17ManageSubscription;
    window.canV17StartCheckout = canV17StartCheckout;
    window.canV17ViewSavedProData = canV17ViewSavedProData;
    window.canV17WriteProData = canV17WriteProData;
  }
})();
