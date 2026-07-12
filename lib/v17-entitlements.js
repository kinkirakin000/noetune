'use strict';

function asStringOrNull(value) {
  return typeof value === 'string' && value ? value : null;
}

function asBooleanOrNull(value) {
  return typeof value === 'boolean' ? value : null;
}

function isValidProfileObject(profile) {
  return !!profile && typeof profile === 'object' && !Array.isArray(profile);
}

function deriveV17ServerBillingState(profile) {
  if (!isValidProfileObject(profile)) return 'unknown';

  const status = asStringOrNull(profile.stripe_subscription_status);
  const planStatus = asStringOrNull(profile.plan_status);
  const cancelAtPeriodEnd = asBooleanOrNull(profile.cancel_at_period_end);
  const hasStripeCustomer = Boolean(profile.stripe_customer_id);

  if (!status) {
    if (!planStatus || planStatus !== 'plus') return 'free';
    return 'unknown';
  }

  if (status === 'active' || status === 'trialing') {
    if (cancelAtPeriodEnd === true) return 'cancel_scheduled';
    return 'active';
  }

  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') {
    return 'payment_attention';
  }

  if (status === 'canceled' || status === 'incomplete_expired') {
    return 'ended';
  }

  if (status === 'paused') {
    return 'unknown';
  }

  if (cancelAtPeriodEnd === true) {
    return 'unknown';
  }

  if (planStatus === 'plus' && !hasStripeCustomer) {
    return 'unknown';
  }

  return 'unknown';
}

function canV17ServerReadSavedData(profile) {
  return isValidProfileObject(profile);
}

function canV17ServerWriteSavedData(profile) {
  const billingState = deriveV17ServerBillingState(profile);
  return billingState === 'active' || billingState === 'cancel_scheduled';
}

function canV17ServerDeleteSavedData(profile) {
  // This covers ordinary bookmark/progress/result deletion.
  // It is separate from account deletion / GDPR / full-data purge rights.
  return canV17ServerWriteSavedData(profile);
}

function getV17SavedDataEntitlements(profile) {
  const billingState = deriveV17ServerBillingState(profile);
  const canRead = canV17ServerReadSavedData(profile);
  const canWrite = billingState === 'active' || billingState === 'cancel_scheduled';
  const canDelete = canWrite;

  return {
    billingState,
    canRead,
    canWrite,
    canDelete,
  };
}

module.exports = {
  deriveV17ServerBillingState,
  canV17ServerReadSavedData,
  canV17ServerWriteSavedData,
  canV17ServerDeleteSavedData,
  getV17SavedDataEntitlements,
};
