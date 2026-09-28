import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/services/telemetry.ts', import.meta.url), 'utf8');
const dedupeStart = source.indexOf('if (dedupe.databaseKey) {');
const normalInsertStart = source.indexOf(".from('telemetry_events')\n      .insert(payload)", dedupeStart);

assert.ok(dedupeStart >= 0, 'deduplicated telemetry branch must exist');
assert.ok(normalInsertStart > dedupeStart, 'normal telemetry insert must follow the dedupe branch');

const dedupeBranch = source.slice(dedupeStart, normalInsertStart);
assert.match(dedupeBranch, /ignoreDuplicates:\s*true/);
assert.doesNotMatch(
  dedupeBranch,
  /\.select\s*\(/,
  'deduplicated writes must not request a single representation because ignored duplicates return no row',
);
assert.match(source.slice(normalInsertStart), /\.select\(\)\s*\n\s*\.maybeSingle<TelemetryEventRow>\(\)/);

console.log('Telemetry dedupe 406 regression check passed.');
