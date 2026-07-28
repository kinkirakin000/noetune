// POST /api/stripe-webhook
// Receives and verifies Stripe webhook events, updates profiles.plan_status.
//
// IMPORTANT — raw body:
//   Stripe signature verification requires the exact raw bytes Stripe sent.
//   Vercel's plain Node.js runtime (api/*.js without Next.js framework) does NOT
//   auto-parse the body, so we read from the stream directly. Do not add a body
//   parser middleware or the signature check will always fail.
//
// Handled events:
//   checkout.session.completed
//   customer.subscription.created
//   customer.subscription.updated
//   customer.subscription.deleted
//   invoice.payment_succeeded
//   invoice.payment_failed
//
// All other event types are acknowledged (200) and ignored.

const { getSupabaseAdmin } = require('../lib/supabase-admin');

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function toIsoTimestamp(unixSeconds) {
  if (unixSeconds == null) return null;
  const seconds = Number(unixSeconds);
  if (!Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

function subscriptionStatusToPlanStatus(status, event) {
  if (status === 'active' || status === 'trialing') return 'plus';
  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') return 'past_due';
  if (status === 'canceled' || status === 'incomplete_expired') return 'canceled';
  if (status != null) {
    logWebhook(event, 'unknown-subscription-status', {
      reason: 'unknown_status',
      status: String(status)
    });
  }
  return 'free';
}

function getPrimarySubscriptionItem(subscription) {
  const items = subscription && subscription.items && subscription.items.data;
  if (!Array.isArray(items) || !items.length) return null;
  return items[0] || null;
}

function getPriceObject(price) {
  if (!price) return null;
  return typeof price === 'object' ? price : null;
}

function getPriceId(price) {
  if (!price) return null;
  if (typeof price === 'string') return price;
  if (typeof price.id === 'string') return price.id;
  return null;
}

function getProductId(product) {
  if (!product) return null;
  if (typeof product === 'string') return product;
  if (typeof product.id === 'string') return product.id;
  return null;
}

function extractSubscriptionSnapshot(subscription, event, opts) {
  const item = getPrimarySubscriptionItem(subscription);
  const price = getPriceObject(item && item.price);
  const priceId = getPriceId(item && item.price);
  const productId = getProductId(price && price.product);
  return {
    stripe_subscription_status: subscription && subscription.status ? String(subscription.status) : null,
    cancel_at_period_end: !!(subscription && subscription.cancel_at_period_end),
    current_period_end: subscription && subscription.current_period_end != null
      ? toIsoTimestamp(subscription.current_period_end)
      : null,
    stripe_price_id: priceId,
    stripe_product_id: productId,
    subscription_currency: price && price.currency ? String(price.currency) : null,
    subscription_unit_amount: price && price.unit_amount != null ? Number(price.unit_amount) : null,
    subscription_interval: price && price.recurring && price.recurring.interval
      ? String(price.recurring.interval)
      : null,
    subscription_interval_count: price && price.recurring && price.recurring.interval_count != null
      ? Number(price.recurring.interval_count)
      : null,
    stripe_livemode: typeof (subscription && subscription.livemode) === 'boolean'
      ? subscription.livemode
      : null,
    stripe_subscription_updated_at: toIsoTimestamp(event && event.created),
    stripe_customer_id: subscription && subscription.customer ? String(subscription.customer) : null,
    subscription_id: subscription && subscription.id ? String(subscription.id) : null,
    plan_status: subscriptionStatusToPlanStatus(subscription && subscription.status ? subscription.status : null, event),
    _source: opts && opts.source ? String(opts.source) : 'subscription'
  };
}

function isMissingColumnError(error) {
  if (!error) return false;
  const message = String(error.message || '');
  return error.code === '42703' || error.code === 'PGRST204' || /column .* does not exist/i.test(message);
}

function logWebhook(event, stage, details) {
  const parts = [
    '[stripe-webhook]',
    'stage=' + stage,
    'type=' + String(event && event.type || 'unknown'),
    'id=' + String(event && event.id || 'unknown')
  ];
  if (details && typeof details === 'object') {
    if (details.hasSubscription != null) parts.push('hasSubscription=' + String(!!details.hasSubscription));
    if (details.hasCustomer != null) parts.push('hasCustomer=' + String(!!details.hasCustomer));
    if (details.hasProfile != null) parts.push('hasProfile=' + String(!!details.hasProfile));
    if (details.reason) parts.push('reason=' + String(details.reason));
    if (details.status) parts.push('status=' + String(details.status));
  }
  console.error(parts.join(' '));
}

function isNewerOrEqualTimestamp(existingValue, incomingValue) {
  if (!existingValue) return true;
  if (!incomingValue) return false;
  const existingMs = Date.parse(existingValue);
  const incomingMs = Date.parse(incomingValue);
  if (Number.isNaN(existingMs) || Number.isNaN(incomingMs)) return null;
  return incomingMs >= existingMs;
}

function getValueId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value.id === 'string') return value.id;
  return null;
}

async function fetchProfileById(admin, id) {
  if (!id) return null;
  const { data, error } = await admin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function fetchProfileBySubscriptionId(admin, subscriptionId) {
  if (!subscriptionId) return null;
  const { data, error } = await admin
    .from('profiles')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function fetchProfileByCustomerId(admin, customerId) {
  if (!customerId) return null;
  const { data, error } = await admin
    .from('profiles')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function findProfileForEvent(admin, event, refs) {
  const lookups = [
    refs && refs.userId ? { type: 'user_id', fetch: () => fetchProfileById(admin, refs.userId) } : null,
    refs && refs.subscriptionId ? { type: 'subscription_id', fetch: () => fetchProfileBySubscriptionId(admin, refs.subscriptionId) } : null,
    refs && refs.customerId ? { type: 'customer_id', fetch: () => fetchProfileByCustomerId(admin, refs.customerId) } : null
  ].filter(Boolean);

  const matches = [];
  for (const lookup of lookups) {
    const profile = await lookup.fetch();
    if (profile) {
      matches.push({ type: lookup.type, profile });
    }
  }

  if (!matches.length) return null;

  const uniqueProfiles = [];
  for (const match of matches) {
    if (!uniqueProfiles.some((entry) => entry.profile.id === match.profile.id)) {
      uniqueProfiles.push(match);
    }
  }

  if (uniqueProfiles.length > 1) {
    logWebhook(event, 'identifier-conflict', {
      reason: 'identifier_conflict',
      hasProfile: true,
      hasSubscription: !!refs && !!refs.subscriptionId,
      hasCustomer: !!refs && !!refs.customerId
    });
    const error = new Error('Identifier conflict');
    error.code = 'identifier_conflict';
    throw error;
  }

  return uniqueProfiles[0].profile;
}

async function retrieveSubscriptionSnapshot(stripe, subscriptionId, opts) {
  if (!subscriptionId) {
    const error = new Error('Missing subscription id');
    error.code = 'missing_subscription_id';
    throw error;
  }

  try {
    return await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product']
    });
  } catch (error) {
    if (opts && opts.allowDeletedFallback && error && error.statusCode === 404 && opts.deletedSubscription) {
      return opts.deletedSubscription;
    }
    throw error;
  }
}

function validateSubscriptionSnapshot(event, snapshot, opts) {
  const allowPartialPrice = !!(opts && opts.allowPartialPrice);
  const requiredFields = ['subscription_id', 'stripe_customer_id', 'stripe_subscription_status', 'stripe_livemode'];
  if (!allowPartialPrice) {
    requiredFields.push('stripe_price_id', 'subscription_currency', 'subscription_interval');
  }

  const missingFields = requiredFields.filter((field) => snapshot[field] == null || snapshot[field] === '');
  if (!missingFields.length) {
    return null;
  }

  logWebhook(event, 'incomplete-subscription-snapshot', {
    reason: 'incomplete_subscription_snapshot',
    status: missingFields.join(',')
  });

  const error = new Error('Incomplete subscription snapshot');
  error.code = 'incomplete_subscription_snapshot';
  error.missingFields = missingFields;
  return error;
}

function buildFullProfileUpdates(subscription, event, snapshot) {
  const updates = {
    stripe_customer_id: snapshot.stripe_customer_id,
    subscription_id: snapshot.subscription_id,
    plan_status: snapshot.plan_status,
    plan_name: snapshot.plan_status === 'plus' ? 'plus' : 'free',
    cancel_at_period_end: snapshot.cancel_at_period_end,
    stripe_subscription_updated_at: snapshot.stripe_subscription_updated_at
  };

  if (snapshot.current_period_end !== null && snapshot.current_period_end !== undefined) {
    updates.current_period_end = snapshot.current_period_end;
  }
  if (snapshot.stripe_subscription_status !== null && snapshot.stripe_subscription_status !== undefined) {
    updates.stripe_subscription_status = snapshot.stripe_subscription_status;
  }
  if (snapshot.stripe_price_id !== null && snapshot.stripe_price_id !== undefined) {
    updates.stripe_price_id = snapshot.stripe_price_id;
  }
  if (snapshot.stripe_product_id !== null && snapshot.stripe_product_id !== undefined) {
    updates.stripe_product_id = snapshot.stripe_product_id;
  }
  if (snapshot.subscription_currency !== null && snapshot.subscription_currency !== undefined) {
    updates.subscription_currency = snapshot.subscription_currency;
  }
  if (snapshot.subscription_unit_amount !== null && snapshot.subscription_unit_amount !== undefined) {
    updates.subscription_unit_amount = snapshot.subscription_unit_amount;
  }
  if (snapshot.subscription_interval !== null && snapshot.subscription_interval !== undefined) {
    updates.subscription_interval = snapshot.subscription_interval;
  }
  if (snapshot.subscription_interval_count !== null && snapshot.subscription_interval_count !== undefined) {
    updates.subscription_interval_count = snapshot.subscription_interval_count;
  }
  if (snapshot.stripe_livemode !== null && snapshot.stripe_livemode !== undefined) {
    updates.stripe_livemode = snapshot.stripe_livemode;
  }

  return updates;
}

function isExplicitSubscriptionLinkEvent(eventType) {
  return eventType === 'checkout.session.completed' || eventType === 'customer.subscription.created';
}

async function updateProfileSnapshot(admin, profile, event, snapshot, opts) {
  const incomingUpdatedAt = snapshot.stripe_subscription_updated_at;
  const existingUpdatedAt = profile ? profile.stripe_subscription_updated_at : null;
  const eventType = opts && opts.eventType ? opts.eventType : event && event.type;
  const existingSubscriptionId = profile && profile.subscription_id ? String(profile.subscription_id) : null;
  const incomingSubscriptionId = snapshot && snapshot.subscription_id ? String(snapshot.subscription_id) : null;
  const incomingCustomerId = snapshot && snapshot.stripe_customer_id ? String(snapshot.stripe_customer_id) : null;
  const livemodeMismatch =
    profile &&
    profile.stripe_livemode !== null &&
    profile.stripe_livemode !== undefined &&
    snapshot.stripe_livemode !== null &&
    snapshot.stripe_livemode !== undefined &&
    profile.stripe_livemode !== snapshot.stripe_livemode;

  if (livemodeMismatch) {
    logWebhook(event, 'skip-livemode-mismatch', {
      hasProfile: !!profile,
      hasSubscription: !!snapshot.subscription_id,
      hasCustomer: !!snapshot.stripe_customer_id
    });
    return { skipped: true, reason: 'livemode_mismatch', ok: true };
  }

  if (profile && profile.stripe_customer_id && incomingCustomerId && String(profile.stripe_customer_id) !== incomingCustomerId) {
    logWebhook(event, 'identifier-conflict', {
      hasProfile: true,
      hasSubscription: !!incomingSubscriptionId,
      hasCustomer: !!incomingCustomerId,
      reason: 'customer_id_mismatch'
    });
    const error = new Error('Identifier conflict');
    error.code = 'identifier_conflict';
    throw error;
  }

  if (existingSubscriptionId && incomingSubscriptionId && existingSubscriptionId !== incomingSubscriptionId) {
    if (!isExplicitSubscriptionLinkEvent(eventType)) {
      logWebhook(event, 'subscription-id-mismatch', {
        hasProfile: !!profile,
        hasSubscription: !!incomingSubscriptionId,
        hasCustomer: !!incomingCustomerId,
        reason: 'subscription_id_mismatch'
      });
      return { skipped: true, reason: 'subscription_id_mismatch', ok: true };
    }
  }

  const allowFreshnessCheck = !existingSubscriptionId || existingSubscriptionId === incomingSubscriptionId;
  if (allowFreshnessCheck) {
    const freshness = isNewerOrEqualTimestamp(existingUpdatedAt, incomingUpdatedAt);
    if (freshness === false) {
      logWebhook(event, 'skip-stale-event', {
        hasProfile: !!profile,
        hasSubscription: !!incomingSubscriptionId,
        hasCustomer: !!incomingCustomerId,
        reason: 'stale_event'
      });
      return { skipped: true, reason: 'stale_event', ok: true };
    }
    if (freshness === null) {
      const error = new Error('Unable to compare webhook freshness');
      error.code = 'freshness_compare_failed';
      throw error;
    }
  }

  const fullUpdates = buildFullProfileUpdates(snapshot);
  const { error } = await admin
    .from('profiles')
    .update(fullUpdates)
    .eq('id', profile.id);
  if (error) {
    if (isMissingColumnError(error)) {
      logWebhook(event, 'missing-column-error', {
        hasProfile: true,
        hasSubscription: !!incomingSubscriptionId,
        hasCustomer: !!incomingCustomerId,
        reason: 'missing_column'
      });
    }
    throw error;
  }

  return { ok: true, skipped: false, legacyFallback: false };
}

async function handleSubscriptionLikeEvent(admin, stripe, event, subscriptionLike, refs, opts) {
  const profile = await findProfileForEvent(admin, event, refs);
  if (!profile) {
    logWebhook(event, 'profile-not-found', {
      hasProfile: false,
      hasSubscription: !!(subscriptionLike && subscriptionLike.id),
      hasCustomer: !!(subscriptionLike && subscriptionLike.customer)
    });
    return { status: 500, body: { error: 'Profile not found' } };
  }

  const subscriptionId = subscriptionLike && subscriptionLike.id ? subscriptionLike.id : null;
  const customerId = subscriptionLike && subscriptionLike.customer ? subscriptionLike.customer : null;
  if (!subscriptionId) {
    logWebhook(event, 'missing-subscription-id', {
      hasProfile: true,
      hasSubscription: false,
      hasCustomer: !!customerId
    });
    return { status: 500, body: { error: 'Missing subscription id' } };
  }

  let subscription;
  try {
    subscription = await retrieveSubscriptionSnapshot(stripe, subscriptionId, opts || {});
  } catch (error) {
    if (opts && opts.allowDeletedFallback && error && error.statusCode === 404) {
      subscription = subscriptionLike;
    } else {
      logWebhook(event, 'stripe-retrieve-failed', {
        hasProfile: true,
        hasSubscription: true,
        hasCustomer: !!customerId,
        reason: 'retrieve_failed'
      });
      return { status: 500, body: { error: 'Failed to retrieve subscription' } };
    }
  }

  const snapshot = extractSubscriptionSnapshot(subscription, event, { source: 'subscription' });
  const incompleteError = validateSubscriptionSnapshot(event, snapshot, {
    allowPartialPrice: !!(opts && opts.allowDeletedFallback && subscription === subscriptionLike)
  });
  if (incompleteError) {
    return { status: 500, body: { error: incompleteError.message } };
  }
  const result = await updateProfileSnapshot(admin, profile, event, snapshot, {
    eventType: event.type
  });
  if (!result.ok) {
    return { status: 500, body: { error: 'Failed to update profile snapshot' } };
  }
  return { status: 200, body: { received: true } };
}

async function handleCheckoutSessionCompleted(admin, stripe, event) {
  const session = event.data && event.data.object ? event.data.object : null;
  const userId = (session && session.metadata && session.metadata.user_id) || (session && session.client_reference_id) || null;
  const customerId = session && session.customer ? String(session.customer) : null;
  const subscriptionId = session && session.subscription ? String(session.subscription) : null;

  if (!userId) {
    logWebhook(event, 'missing-user-id', {
      hasProfile: false,
      hasSubscription: !!subscriptionId,
      hasCustomer: !!customerId
    });
    return { status: 500, body: { error: 'Missing user id' } };
  }

  const profile = await findProfileForEvent(admin, event, {
    userId,
    subscriptionId,
    customerId
  });
  if (!profile) {
    logWebhook(event, 'profile-not-found', {
      hasProfile: false,
      hasSubscription: !!subscriptionId,
      hasCustomer: !!customerId
    });
    return { status: 500, body: { error: 'Profile not found' } };
  }

  if (!subscriptionId) {
    logWebhook(event, 'missing-subscription-id', {
      hasProfile: true,
      hasSubscription: false,
      hasCustomer: !!customerId
    });
    return { status: 500, body: { error: 'Missing subscription id' } };
  }

  let subscription;
  try {
    subscription = await retrieveSubscriptionSnapshot(stripe, subscriptionId, {});
  } catch (error) {
    logWebhook(event, 'stripe-retrieve-failed', {
      hasProfile: true,
      hasSubscription: true,
      hasCustomer: !!customerId,
      reason: 'retrieve_failed'
    });
    return { status: 500, body: { error: 'Failed to retrieve subscription' } };
  }

  const snapshot = extractSubscriptionSnapshot(subscription, event, { source: 'checkout_session' });
  const incompleteError = validateSubscriptionSnapshot(event, snapshot, {});
  if (incompleteError) {
    return { status: 500, body: { error: incompleteError.message } };
  }
  const result = await updateProfileSnapshot(admin, profile, event, snapshot, {
    eventType: event.type
  });
  if (!result.ok) {
    return { status: 500, body: { error: 'Failed to update profile snapshot' } };
  }
  return { status: 200, body: { received: true } };
}

async function handleSubscriptionEvent(admin, stripe, event) {
  const subscriptionLike = event.data && event.data.object ? event.data.object : null;
  const refs = {
    userId: subscriptionLike && subscriptionLike.metadata && subscriptionLike.metadata.user_id ? subscriptionLike.metadata.user_id : null,
    subscriptionId: subscriptionLike && subscriptionLike.id ? subscriptionLike.id : null,
    customerId: subscriptionLike && subscriptionLike.customer ? subscriptionLike.customer : null
  };

  if (event.type === 'customer.subscription.deleted') {
    const profile = await findProfileForEvent(admin, event, refs);
    if (!profile) {
      logWebhook(event, 'profile-not-found', {
        hasProfile: false,
        hasSubscription: !!refs.subscriptionId,
        hasCustomer: !!refs.customerId
      });
      return { status: 500, body: { error: 'Profile not found' } };
    }

    let subscription = subscriptionLike;
    try {
      subscription = await retrieveSubscriptionSnapshot(stripe, refs.subscriptionId, {
        allowDeletedFallback: true,
        deletedSubscription: subscriptionLike
      });
    } catch (error) {
      logWebhook(event, 'stripe-retrieve-failed', {
        hasProfile: true,
        hasSubscription: true,
        hasCustomer: !!refs.customerId,
        reason: 'retrieve_failed'
      });
      return { status: 500, body: { error: 'Failed to retrieve subscription' } };
    }

    const snapshot = extractSubscriptionSnapshot(subscription, event, { source: 'deleted' });
    snapshot.plan_status = 'canceled';
    snapshot.plan_name = 'free';
    snapshot.cancel_at_period_end = false;
    if (snapshot.stripe_subscription_status == null && subscriptionLike && subscriptionLike.status) {
      snapshot.stripe_subscription_status = String(subscriptionLike.status);
    }
    const incompleteError = validateSubscriptionSnapshot(event, snapshot, {
      allowPartialPrice: subscription === subscriptionLike
    });
    if (incompleteError) {
      return { status: 500, body: { error: incompleteError.message } };
    }
    const result = await updateProfileSnapshot(admin, profile, event, snapshot, {
      eventType: event.type
    });
    if (!result.ok) {
      return { status: 500, body: { error: 'Failed to update profile snapshot' } };
    }
    return { status: 200, body: { received: true } };
  }

  const profile = await findProfileForEvent(admin, event, refs);
  if (!profile) {
    logWebhook(event, 'profile-not-found', {
      hasProfile: false,
      hasSubscription: !!refs.subscriptionId,
      hasCustomer: !!refs.customerId
    });
    return { status: 500, body: { error: 'Profile not found' } };
  }

  let subscription;
  try {
    subscription = await retrieveSubscriptionSnapshot(stripe, refs.subscriptionId, {});
  } catch (error) {
    logWebhook(event, 'stripe-retrieve-failed', {
      hasProfile: true,
      hasSubscription: true,
      hasCustomer: !!refs.customerId,
      reason: 'retrieve_failed'
    });
    return { status: 500, body: { error: 'Failed to retrieve subscription' } };
  }

  const snapshot = extractSubscriptionSnapshot(subscription, event, { source: 'subscription' });
  const incompleteError = validateSubscriptionSnapshot(event, snapshot, {});
  if (incompleteError) {
    return { status: 500, body: { error: incompleteError.message } };
  }
  const result = await updateProfileSnapshot(admin, profile, event, snapshot, {
    eventType: event.type
  });
  if (!result.ok) {
    return { status: 500, body: { error: 'Failed to update profile snapshot' } };
  }
  return { status: 200, body: { received: true } };
}

async function handleInvoiceEvent(admin, stripe, event) {
  const invoice = event.data && event.data.object ? event.data.object : null;
  const customerId = invoice && invoice.customer ? String(invoice.customer) : null;
  const invoiceSubscriptionId = getValueId(invoice && invoice.subscription);

  const profile = await findProfileForEvent(admin, event, {
    subscriptionId: invoiceSubscriptionId,
    customerId
  });

  if (!profile) {
    logWebhook(event, 'profile-not-found', {
      hasProfile: false,
      hasSubscription: !!invoiceSubscriptionId,
      hasCustomer: !!customerId
    });
    return { status: 500, body: { error: 'Profile not found' } };
  }

  if (!invoiceSubscriptionId) {
    logWebhook(event, 'missing-subscription-id', {
      hasProfile: true,
      hasSubscription: false,
      hasCustomer: !!customerId
    });
    return { status: 500, body: { error: 'Missing subscription id' } };
  }

  let subscription;
  try {
    subscription = await retrieveSubscriptionSnapshot(stripe, invoiceSubscriptionId, {});
  } catch (error) {
    logWebhook(event, 'stripe-retrieve-failed', {
      hasProfile: true,
      hasSubscription: true,
      hasCustomer: !!customerId,
      reason: 'retrieve_failed'
    });
    return { status: 500, body: { error: 'Failed to retrieve subscription' } };
  }

  const snapshot = extractSubscriptionSnapshot(subscription, event, { source: 'invoice' });
  const incompleteError = validateSubscriptionSnapshot(event, snapshot, {});
  if (incompleteError) {
    return { status: 500, body: { error: incompleteError.message } };
  }
  const result = await updateProfileSnapshot(admin, profile, event, snapshot, {
    eventType: event.type
  });
  if (!result.ok) {
    return { status: 500, body: { error: 'Failed to update profile snapshot' } };
  }
  return { status: 200, body: { received: true } };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'DB not configured' });
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  let rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (error) {
    return res.status(400).json({ error: 'Could not read request body' });
  }

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error('[stripe-webhook] signature verification failed');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'WEBHOOK_SIGNATURE_INVALID' });
  }

  try {
    let result;
    switch (event.type) {
      case 'checkout.session.completed':
        result = await handleCheckoutSessionCompleted(supabaseAdmin, stripe, event);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        result = await handleSubscriptionEvent(supabaseAdmin, stripe, event);
        break;

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        result = await handleInvoiceEvent(supabaseAdmin, stripe, event);
        break;

      default:
        return res.status(200).json({ received: true });
    }

    return res.status(result.status).json(result.body);
  } catch (error) {
    logWebhook(event, 'unexpected-error', {
      reason: 'unhandled_exception'
    });
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};
