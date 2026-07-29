import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath =
  'supabase/migrations/20260729181905_add_sanitized_campaign_sharing_rpc.sql';
const migration = readFileSync(migrationPath, 'utf8').toLowerCase();
const databaseTest = readFileSync(
  'supabase/tests/database/sanitized_campaign_sharing.test.sql',
  'utf8',
).toLowerCase();
const generatedTypes = readFileSync('src/lib/database.types.ts', 'utf8');

const functions = [
  {
    name: 'get_public_shared_campaign',
    signature: 'get_public_shared_campaign\\(text\\)',
    expectedReturnFields: [
      'title text',
      'description text',
      'campaign_type text',
      'status text',
      'visibility text',
      'starts_on date',
      'ends_on date',
      'life_wheel_category text',
      'published_at timestamptz',
    ],
  },
  {
    name: 'get_public_shared_campaign_live_events',
    signature: 'get_public_shared_campaign_live_events\\(text, integer\\)',
    expectedReturnFields: ['event_type text', 'created_at timestamptz'],
  },
];

for (const { name, signature, expectedReturnFields } of functions) {
  const definitionStart = migration.indexOf(`create or replace function public.${name}(`);
  assert.notEqual(definitionStart, -1, `${name} must be created in the public API schema.`);
  const nextDefinitionStart = migration.indexOf(
    'create or replace function public.',
    definitionStart + 1,
  );
  const definition = migration.slice(
    definitionStart,
    nextDefinitionStart === -1 ? migration.length : nextDefinitionStart,
  );

  assert.match(
    definition,
    /security definer[\s\S]*?set search_path = ''/,
    `${name} must pin an empty search path when crossing RLS.`,
  );
  assert.match(
    definition,
    new RegExp(`revoke execute on function public\\.${signature}[\\s\\S]{0,100}from public, anon, authenticated, service_role`),
    `${name} must remove PostgreSQL's default PUBLIC execute grant first.`,
  );
  assert.match(
    definition,
    new RegExp(`grant execute on function public\\.${signature}[\\s\\S]{0,100}to anon, authenticated, service_role`),
    `${name} must have an explicit public-share role grant.`,
  );
  assert.match(databaseTest, new RegExp(name), `${name} must have a database regression test.`);
  assert.match(generatedTypes, new RegExp(`${name}:`), `${name} must be represented in generated client types.`);

  for (const field of expectedReturnFields) {
    assert.match(
      definition,
      new RegExp(`returns table \\([\\s\\S]*?${field}`),
      `${name} must declare the safe return field ${field}.`,
    );
  }
}

assert.doesNotMatch(
  migration,
  /select\s+[a-z]+\.\*/,
  'Public share readers must never use a wildcard projection.',
);
assert.doesNotMatch(
  migration,
  /returns\s+setof\s+public\.(campaigns|campaign_live_events)/,
  'Public share readers must never return complete table rows.',
);
assert.doesNotMatch(
  migration,
  /profile_snapshot\s+(json|jsonb)|campaign_data\s+(json|jsonb)|live_state\s+(json|jsonb)|event_data\s+(json|jsonb)/,
  'Raw JSON storage must not be part of a public share return contract.',
);
assert.match(
  migration,
  /when e\.event_type ~ '\^\[a-z0-9_\]\{1,64\}\$' then e\.event_type[\s\S]*else 'activity'/,
  'Free-form event types must be normalized before public exposure.',
);
assert.match(
  migration,
  /limit least\(greatest\(coalesce\(p_limit, 50\), 1\), 100\)/,
  'Public activity reads must remain bounded to 1-100 rows.',
);

console.log('sanitized-campaign-sharing: all assertions passed');
