import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const migrationPath =
  'supabase/migrations/20260729171553_restrict_unnecessary_security_definer_client_access.sql';
const sql = readFileSync(migrationPath, 'utf8').toLowerCase();
const databaseTest = readFileSync(
  'supabase/tests/database/security_definer_client_access.test.sql',
  'utf8',
).toLowerCase();
const commitmentService = readFileSync('src/services/commitmentContracts.ts', 'utf8');

function readSourceTree(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        return readSourceTree(entryPath);
      }
      return /\.(?:ts|tsx|js|jsx|mjs)$/.test(entry.name)
        ? [readFileSync(entryPath, 'utf8')]
        : [];
    })
    .join('\n');
}

const applicationSources = readSourceTree('src');

const restrictedSignatures = [
  'evaluate_due_commitment_contracts\\(uuid, integer\\)',
  'get_shared_campaign\\(text\\)',
  'get_shared_campaign_live_events\\(text, integer\\)',
];

for (const signature of restrictedSignatures) {
  assert.match(
    sql,
    new RegExp(`alter function public\\.${signature}[\\s\\S]{0,80}security invoker`),
    `${signature} must execute with the caller's privileges.`,
  );
  assert.match(
    sql,
    new RegExp(
      `revoke execute on function public\\.${signature}[\\s\\S]{0,80}from public, anon, authenticated`,
    ),
    `${signature} must not remain executable by client roles.`,
  );
  assert.match(
    sql,
    new RegExp(`grant execute on function public\\.${signature}[\\s\\S]{0,80}to service_role`),
    `${signature} must retain explicit trusted-server access.`,
  );
  assert.match(
    databaseTest,
    new RegExp(signature),
    `${signature} must have a database privilege regression test.`,
  );
}

assert.match(
  commitmentService,
  /\.rpc\('evaluate_due_commitment_contracts',\s*\{\s*p_max_windows:\s*12,\s*\}\)/s,
  'The client must use the auth.uid()-scoped one-argument evaluator wrapper.',
);
assert.doesNotMatch(
  commitmentService,
  /\.rpc\('evaluate_due_commitment_contracts',\s*\{[^}]*p_user_id:/s,
  'The client must not call the internal user-id evaluator overload.',
);

for (const rpcName of ['get_shared_campaign', 'get_shared_campaign_live_events']) {
  assert.doesNotMatch(
    applicationSources,
    new RegExp(`\\.rpc\\(\\s*['"]${rpcName}['"]`),
    `${rpcName} must remain server-only until a sanitised share client is added.`,
  );
}

assert.doesNotMatch(
  sql,
  /revoke\s+(all|execute)\s+on\s+all functions/i,
  'The migration must not broadly revoke unrelated application RPCs.',
);

console.log('security-definer-client-access: all assertions passed');
