const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260801_define_profiles_table_privileges.sql'), 'utf8');
const schema = fs.readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8');

function assertContract(source, label) {
  assert.match(source, /revoke\s+all\s+on\s+table\s+public\.profiles\s+from\s+anon,\s*authenticated,\s*service_role\s*;/i, `${label}: revoke contract`);
  assert.match(source, /grant\s+select\s+on\s+table\s+public\.profiles\s+to\s+authenticated\s*;/i, `${label}: authenticated SELECT`);
  assert.match(source, /grant\s+select,\s*insert,\s*update,\s*delete\s+on\s+table\s+public\.profiles\s+to\s+service_role\s*;/i, `${label}: service_role DML`);
  assert.doesNotMatch(source, /grant[\s\S]*on\s+table\s+public\.profiles[\s\S]*to\s+anon/i, `${label}: anon grant`);
  assert.doesNotMatch(source, /grant\s+(?:insert|update|delete)[\s\S]*on\s+table\s+public\.profiles[\s\S]*to\s+authenticated/i, `${label}: authenticated mutation grant`);
  assert.doesNotMatch(source, /grant[\s\S]*(?:truncate|references|trigger)[\s\S]*on\s+table\s+public\.profiles[\s\S]*to\s+(?:anon|authenticated|service_role)/i, `${label}: forbidden API-role privilege`);
}

test('forward migration defines the exact profiles least-privilege contract', () => {
  assertContract(migration, 'migration');
  assert.match(migration, /public\.profiles/);
  assert.doesNotMatch(migration, /alter\s+table\s+public\.profiles\s+disable\s+row\s+level\s+security/i);
});

test('schema aligns with the same contract and preserves RLS policy', () => {
  assertContract(schema, 'schema');
  assert.match(schema, /alter\s+table\s+public\.profiles\s+enable\s+row\s+level\s+security/i);
  assert.match(schema, /create\s+policy\s+"users can read own profile"[\s\S]*on\s+public\.profiles[\s\S]*for\s+select[\s\S]*using\s*\(auth\.uid\(\)\s*=\s*id\)/i);
});
