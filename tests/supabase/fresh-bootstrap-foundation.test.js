const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const foundation = read('supabase/migrations/20260619_create_profiles_foundation.sql');
const schema = read('supabase/schema.sql');

function position(source, needle) {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `missing SQL: ${needle}`);
  return index;
}

test('foundation migration is first and preserves dependency order', () => {
  const files = fs.readdirSync(path.join(root, 'supabase/migrations'))
    .filter((name) => name.endsWith('.sql')).sort();
  assert.ok(files.indexOf('20260619_create_profiles_foundation.sql') < files.indexOf('20260620_create_saved_results.sql'));

  assert.ok(position(foundation, 'create table if not exists public.profiles') < position(foundation, 'create or replace function public.handle_new_user()'));
  assert.ok(position(foundation, 'create or replace function public.handle_new_user()') < position(foundation, 'create trigger on_auth_user_created'));
  assert.ok(position(foundation, 'create or replace function public.set_updated_at()') < position(foundation, 'create trigger profiles_updated_at'));
  assert.ok(position(foundation, 'create or replace function public.consume_trial(p_user_id uuid)') < position(foundation, 'revoke execute on function public.consume_trial(uuid)'));
});

test('foundation excludes later-owned objects', () => {
  for (const forbidden of [
    'public.saved_results', 'public.saved_progress', 'public.bookmarks',
    'stripe_subscription_status', 'stripe_price_id', 'stripe_product_id'
  ]) assert.doesNotMatch(foundation, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(read('supabase/migrations/20260712_add_stripe_subscription_contract_fields.sql'), /alter table public\.profiles/);
  assert.match(read('supabase/migrations/20260728_restrict_consume_trial_rpc.sql'), /public\.consume_trial\(uuid\)/);
});

test('schema creates consume_trial before granting privileges', () => {
  const fn = position(schema, 'create or replace function public.consume_trial(p_user_id uuid)');
  const grant = position(schema, 'revoke execute on function public.consume_trial(uuid)');
  assert.ok(fn < grant);
  assert.equal((schema.match(/revoke execute on function public\.consume_trial\(uuid\)/g) || []).length, 3);
  assert.equal((schema.match(/grant execute on function public\.consume_trial\(uuid\) to service_role/g) || []).length, 1);
});
