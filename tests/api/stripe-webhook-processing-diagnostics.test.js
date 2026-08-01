const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../api/stripe-webhook.js'), 'utf8');

const markers = [
  'stripe_webhook_profile_lookup_failed',
  'stripe_webhook_profile_not_found',
  'stripe_webhook_subscription_retrieve_failed',
  'stripe_webhook_snapshot_validation_failed',
  'stripe_webhook_profile_update_failed',
  'stripe_webhook_identifier_conflict',
  'stripe_webhook_missing_required_linkage',
  'stripe_webhook_unexpected_failure'
];

test('all post-signature diagnostic markers are fixed and present', () => {
  for (const marker of markers) {
    assert.match(source, new RegExp(`logDiagnostic\\(['"]${marker}['"]`));
  }
  assert.match(source, /function logDiagnostic\(marker, error\)/);
  assert.match(source, /function normalizeSubscriptionSnapshot\(subscription, event, opts\)/);
  assert.match(source, /stripe_webhook_handler_dispatch_failed/);
  assert.match(source, /stripe_webhook_response_failed/);
  assert.match(source, /stripe_webhook_event_reference_failed/);
});

test('handler reference extraction is the only newly classified stage', () => {
  assert.match(source, /try \{\n    subscriptionLike = event\.data && event\.data\.object/);
  assert.match(source, /catch \(error\) \{\n    logDiagnostic\('stripe_webhook_event_reference_failed', error\);\n    throw error;/);
  assert.doesNotMatch(source, /customerId\s*:\s*String\(/);
});

test('dispatch and response boundaries classify only unclassified failures', () => {
  assert.match(source, /catch \(error\) \{\n      logDiagnostic\('stripe_webhook_handler_dispatch_failed', error\);\n      throw error;/);
  assert.match(source, /catch \(error\) \{\n      logDiagnostic\('stripe_webhook_response_failed', error\);\n      throw error;/);
  assert.match(source, /default:\n          return res\.status\(200\)\.json\(\{ received: true \}\);/);
});

test('profile update chain catches synchronous and rejected failures', () => {
  assert.match(source, /\.from\('profiles'\)/);
  assert.match(source, /\.select\('id'\)/);
  assert.match(source, /\} catch \(updateError\)/);
  assert.match(source, /logDiagnostic\('stripe_webhook_profile_update_failed', updateError\)/);
  assert.match(source, /logDiagnostic\('stripe_webhook_profile_update_failed', error\)/);
});

test('normalization exceptions are distinct from validation failures', () => {
  assert.match(source, /catch \(error\) \{\n    logDiagnostic\('stripe_webhook_snapshot_normalization_failed', error\);/);
  assert.match(source, /logDiagnostic\('stripe_webhook_snapshot_validation_failed', incompleteError\)/);
  assert.equal((source.match(/extractSubscriptionSnapshot\(subscription, event/g) || []).length, 2);
});

test('terminal diagnostics do not include request or provider values', () => {
  assert.match(source, /console\.error\(marker\)/);
  assert.doesNotMatch(source, /console\.error\(marker\s*,/);
});

test('processing failures retain the generic external response and one fallback marker', () => {
  assert.match(source, /return res\.status\(500\)\.json\(\{ error: 'Webhook processing failed' \}\)/);
  assert.match(source, /logDiagnostic\('stripe_webhook_unexpected_failure', error\)/);
  assert.doesNotMatch(source, /stripe_webhook_unexpected_failure[^\n]*\n[^\n]*stripe_webhook_/);
});

test('success, missing-profile, and unsupported-event responses remain unchanged', () => {
  assert.match(source, /return \{ status: 200, body: \{ received: true \} \};/);
  assert.match(source, /return res\.status\(result\.status\)\.json\(result\.body\)/);
  assert.match(source, /default:\n          return res\.status\(200\)\.json\(\{ received: true \}\);/);
});

test('diagnostics contain no private or provider-bearing logging statements', () => {
  const diagnosticBlock = source.match(/function logDiagnostic[\s\S]*?\n}\n/);
  assert.ok(diagnosticBlock);
  assert.doesNotMatch(diagnosticBlock[0], /event|payload|token|email|customer|subscription|price|url|provider|supabase|stack|message/i);
});
