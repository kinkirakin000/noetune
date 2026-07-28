const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const schema = fs.readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8');
const migrationDir = path.join(root, 'supabase/migrations');
const migrations = fs.readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort()
  .map((name) => ({ name, source: fs.readFileSync(path.join(migrationDir, name), 'utf8') }));
const migrationSource = migrations.map(({ source }) => source).join('\n');
const effectiveSql = `${schema}\n${migrationSource}`;
const browserFiles = [
  'app-v17.html',
  'index.html',
  ...fs.readdirSync(path.join(root, 'js/v17')).filter((name) => name.endsWith('.js')).map((name) => `js/v17/${name}`),
].map((file) => ({ file, source: fs.readFileSync(path.join(root, file), 'utf8') }));

const tables = {
  profiles: { owner: 'id', policy: 'users can read own profile', delete: false },
  saved_results: { owner: 'user_id', policy: 'users can read own saved results', delete: false },
  saved_progress: { owner: 'user_id', policy: 'users can read own saved progress', delete: false },
  bookmarks: { owner: 'user_id', policy: 'users can read own bookmarks', delete: true },
};

function policyBlock(source, policyName) {
  const escaped = policyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`create policy "${escaped}"[\\s\\S]*?(?=\\n\\s*(?:drop policy|create policy|create or replace|-- ──|$))`, 'i'));
  assert.ok(match, `missing policy: ${policyName}`);
  return match[0];
}

test('exact application tables have owner FKs, cascades, and RLS enabled', () => {
  assert.deepEqual(Object.keys(tables).sort(), ['bookmarks', 'profiles', 'saved_progress', 'saved_results']);
  for (const [table, contract] of Object.entries(tables)) {
    assert.match(effectiveSql, new RegExp(`create table if not exists public\\.${table}\\s*\\(`, 'i'));
    assert.match(effectiveSql, new RegExp(`${contract.owner}[^\\n]*references auth\\.users\\(id\\) on delete cascade`, 'i'));
    assert.match(effectiveSql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    for (const migration of migrations) {
      assert.doesNotMatch(migration.source, new RegExp(`alter table public\\.${table} disable row level security`, 'i'));
    }
  }
});

test('effective policies are owner-bound with no permissive or anonymous override', () => {
  for (const [table, contract] of Object.entries(tables)) {
    const block = policyBlock(effectiveSql, contract.policy);
    assert.match(block, new RegExp(`auth\\.uid\\(\\)\\s*=\\s*${contract.owner}`, 'i'));
    assert.doesNotMatch(block, /using\s*\(\s*true\s*\)|with check\s*\(\s*true\s*\)/i);
    assert.doesNotMatch(migrationSource, new RegExp(`create policy[\\s\\S]*on public\\.${table}[\\s\\S]*?(?:using|with check)\\s*\\(\\s*true`, 'i'));
    assert.doesNotMatch(migrationSource, new RegExp(`create policy[\\s\\S]*on public\\.${table}[\\s\\S]*?(?:to\\s+public|to\\s+anon)`, 'i'));
    assert.doesNotMatch(migrationSource, new RegExp(`alter table public\\.${table} disable row level security`, 'i'));
  }
  const bookmarkDelete = policyBlock(effectiveSql, 'users can delete own bookmarks');
  assert.match(bookmarkDelete, /for delete/i);
  assert.match(bookmarkDelete, /auth\.uid\(\)\s*=\s*user_id/i);
  for (const table of ['profiles', 'saved_results', 'saved_progress']) {
    assert.doesNotMatch(effectiveSql, new RegExp(`create policy[^\\n]*\\n\\s*on public\\.${table}\\s*\\n\\s*for (?:insert|update|delete)`, 'i'));
  }
});

test('source-level anonymous and User A/User B negative matrix is explicit', () => {
  const matrix = {
    anonymous: { select: 'DENIED BY RLS', insert: 'NO POLICY — DENIED', update: 'NO POLICY — DENIED', delete: 'NO POLICY — DENIED' },
    userA: { ownSelect: 'ALLOWED', otherSelect: 'DENIED', ownInsert: 'DENIED', otherInsert: 'DENIED', ownUpdate: 'DENIED', otherUpdate: 'DENIED', ownDelete: 'DENIED except bookmarks', otherDelete: 'DENIED' },
    serviceRole: 'BYPASSES RLS; API owner filter remains mandatory',
  };
  assert.equal(matrix.anonymous.select, 'DENIED BY RLS');
  assert.equal(matrix.anonymous.insert, 'NO POLICY — DENIED');
  assert.equal(matrix.userA.ownSelect, 'ALLOWED');
  assert.equal(matrix.userA.otherSelect, 'DENIED');
  assert.equal(matrix.userA.ownDelete, 'DENIED except bookmarks');
  assert.equal(matrix.userA.otherDelete, 'DENIED');
  assert.match(matrix.serviceRole, /owner filter remains mandatory/);
});

test('v17 browser has no direct application-table/RPC access or service secrets', () => {
  const source = browserFiles.map(({ source }) => source).join('\n');
  for (const table of Object.keys(tables)) {
    assert.doesNotMatch(source, new RegExp(`\\.from\\(\\s*['"]${table}['"]\\s*\\)`, 'i'));
  }
  assert.doesNotMatch(source, /\.rpc\(\s*['"]consume_trial['"]/i);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET/);
});

test('public config exposes only public configuration fields', () => {
  const config = fs.readFileSync(path.join(root, 'api/config.js'), 'utf8');
  assert.match(config, /supabaseUrl/);
  assert.match(config, /supabaseAnonKey/);
  assert.match(config, /stripePublishableKey/);
  assert.match(config, /posthogKey|posthogHost/);
  const responseContract = config.slice(config.indexOf('res.status(200).json'));
  assert.doesNotMatch(responseContract, /SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET/);
});

test('repository contract is source-only and performs no database connection or SQL execution', () => {
  const privilegeMigration = migrations.find(({ name }) => name.includes('restrict_consume_trial_rpc')).source;
  assert.doesNotMatch(privilegeMigration, /psql|supabase-js|fetch\(|createClient/i);
  assert.doesNotMatch(privilegeMigration, /create table|alter table|create policy|drop policy/i);
});
