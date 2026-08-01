// GET /api/me
// Returns the current user's Noetune profile.
// Requires:  Authorization: Bearer <supabase-access-token>
// Returns:   { loggedIn, user, profile }
//   - loggedIn: false + nulls when unauthenticated or Supabase not configured
//   - loggedIn: true  + user/profile when token is valid
//
// Always returns 200. The app must not break when this endpoint returns loggedIn: false.

const { getSupabaseAdmin } = require('../lib/supabase-admin');

function isMissingColumnError(error) {
  if (!error) return false;
  const message = String(error.message || '');
  return error.code === '42703' || error.code === 'PGRST204' || /column .* does not exist/i.test(message);
}

function asBooleanOrNull(value) {
  return typeof value === 'boolean' ? value : null;
}

function asNumberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asStringOrNull(value) {
  return typeof value === 'string' && value ? value : null;
}

function deriveBillingState(profile) {
  const status = asStringOrNull(profile && profile.stripe_subscription_status);
  const planStatus = asStringOrNull(profile && profile.plan_status);
  const cancelAtPeriodEnd = asBooleanOrNull(profile && profile.cancel_at_period_end);
  const hasStripeCustomer = Boolean(profile && profile.stripe_customer_id);

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

function buildSafeSubscription(profile) {
  return {
    status: asStringOrNull(profile && profile.stripe_subscription_status),
    cancelAtPeriodEnd: asBooleanOrNull(profile && profile.cancel_at_period_end),
    currentPeriodEnd: asStringOrNull(profile && profile.current_period_end),
    price: {
      currency: asStringOrNull(profile && profile.subscription_currency),
      unitAmount: asNumberOrNull(profile && profile.subscription_unit_amount),
      interval: asStringOrNull(profile && profile.subscription_interval),
      intervalCount: asNumberOrNull(profile && profile.subscription_interval_count)
    }
  };
}

function logDiagnostic(marker) {
  console.info(marker);
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    logDiagnostic('api_me_admin_unavailable');
    return res.status(200).json({ loggedIn: false, user: null, profile: null });
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    logDiagnostic('api_me_token_missing');
    return res.status(200).json({ loggedIn: false, user: null, profile: null });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      logDiagnostic('api_me_auth_validation_failed');
      return res.status(200).json({ loggedIn: false, user: null, profile: null });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('plan_status, trial_used_count, trial_limit, current_period_end, stripe_subscription_status, cancel_at_period_end, subscription_currency, subscription_unit_amount, subscription_interval, subscription_interval_count, stripe_customer_id, subscription_id, stripe_price_id, stripe_product_id, stripe_livemode, stripe_subscription_updated_at')
      .eq('id', user.id)
      .single();

    if (profileError) {
      if (isMissingColumnError(profileError)) {
        logDiagnostic('api_me_profile_query_failed');
        return res.status(500).json({ error: 'Profile schema is not ready' });
      }
      if (profileError.code === 'PGRST116' || profileError.code === 'PGRST117' || /No rows found/i.test(String(profileError.message || ''))) {
        logDiagnostic('api_me_profile_missing');
        return res.status(200).json({
          loggedIn: true,
          user: { id: user.id, email: user.email },
          profile: null,
        });
      }
      logDiagnostic('api_me_profile_query_failed');
      return res.status(200).json({ loggedIn: false, user: null, profile: null });
    }

    const billingState = deriveBillingState(profile);
    const safeProfile = profile
      ? {
          plan_status: asStringOrNull(profile.plan_status) || 'free',
          trial_used_count: asNumberOrNull(profile.trial_used_count) ?? 0,
          trial_limit: asNumberOrNull(profile.trial_limit) ?? 5,
          current_period_end: asStringOrNull(profile.current_period_end),
          billing_state: billingState,
          hasStripeCustomer: Boolean(profile.stripe_customer_id),
          subscription: buildSafeSubscription(profile),
        }
      : null;

    const response = {
      loggedIn: true,
      user: { id: user.id, email: user.email },
      profile: safeProfile,
    };
    logDiagnostic('api_me_success');
    return res.status(200).json(response);
  } catch (e) {
    logDiagnostic('api_me_unexpected_failure');
    return res.status(200).json({ loggedIn: false, user: null, profile: null });
  }
};
