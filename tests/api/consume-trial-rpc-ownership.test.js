const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260728_restrict_consume_trial_rpc.sql', 'utf8');
const api = fs.readFileSync('api/consume-trial.js', 'utf8');

const exactRevokes = [
  'revoke execute on function public.consume_trial(uuid) from public;',
  'revoke execute on function public.consume_trial(uuid) from anon;',
  'revoke execute on function public.consume_trial(uuid) from authenticated;',
];

function assertPrivilegeContract(source) {
  for (const statement of exactRevokes) assert.match(source.toLowerCase(), new RegExp(statement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(source.toLowerCase(), /grant execute on function public\.consume_trial\(uuid\) to service_role;/);
  assert.doesNotMatch(source.toLowerCase(), /revoke execute on all functions/);
  assert.doesNotMatch(source.toLowerCase(), /grant execute on all functions/);
}

test('exact consume_trial(uuid) privilege contract is service-role only', () => {
  assertPrivilegeContract(migration);
  assertPrivilegeContract(schema);
  assert.equal((migration.match(/revoke execute on function public\.consume_trial\(uuid\)/gi) || []).length, 3);
  assert.equal((migration.match(/grant execute on function public\.consume_trial\(uuid\) to service_role/gi) || []).length, 1);
  assert.doesNotMatch(migration.toLowerCase(), /create or replace function|alter table|create policy|drop policy/);
});

test('canonical function and API ownership contracts remain unchanged', () => {
  const functionBody = schema.slice(schema.indexOf('create or replace function public.consume_trial'));
  assert.match(functionBody, /create or replace function public\.consume_trial\(p_user_id uuid\)/i);
  assert.match(functionBody, /returns jsonb/i);
  assert.match(functionBody, /security definer set search_path = public/i);
  assert.match(functionBody, /where id = p_user_id for update/i);
  assert.match(api, /authorization/i);
  assert.match(api, /Bearer /i);
  assert.match(api, /auth\.getUser\(token\)/);
  assert.match(api, /rpc\('consume_trial', \{ p_user_id: user\.id \}\)/);
  assert.doesNotMatch(api, /req\.body[^\n]*(user|id)|req\.query[^\n]*(user|id)/i);
  assert.doesNotMatch(api, /console\.(log|info|warn|error).*token|console\.(log|info|warn|error).*user\.id/i);
});

test('privilege hardening does not alter table policies or browser callers', () => {
  assert.doesNotMatch(migration.toLowerCase(), /saved_results|saved_progress|bookmarks|profiles|rls|policy/);
  assert.doesNotMatch(fs.readFileSync('js/v17/auth.js', 'utf8'), /rpc\(['"]consume_trial/);
  assert.doesNotMatch(fs.readFileSync('js/v17/bookmarks.js', 'utf8'), /rpc\(['"]consume_trial/);
  assert.doesNotMatch(fs.readFileSync('app-v17.html', 'utf8'), /rpc\(['"]consume_trial/);
});
