#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

/**
 * Island Run architecture guard.
 *
 * Mode: allowlist ratchet
 * - Known legacy sites are WARN-only (temporary exception).
 * - New forbidden usages FAIL.
 */

const repoRoot = process.cwd();

const trackedFiles = execSync("rg --files src scripts docs", { encoding: 'utf8' })
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean)
  .filter((p) => p.endsWith('.ts') || p.endsWith('.tsx') || p.endsWith('.mjs'));

const RULES = [
  {
    id: 'no_merge_conflict_markers',
    description: 'Tracked source/docs/scripts files must not contain unresolved git merge conflict markers.',
    patterns: [
      /^<<<<<<< .+/gm,
      /^=======\s*$/gm,
      /^>>>>>>> .+/gm,
    ],
    allowlist: new Set([]),
    include: () => true,
  },
  {
    id: 'no_ui_persist_patch',
    description: 'UI/features should not directly call persistIslandRunRuntimeStatePatch for gameplay writes.',
    patterns: [
      /\bpersistIslandRunRuntimeStatePatch\s*\(/g,
      /import\s*\{[^}]*\bpersistIslandRunRuntimeStatePatch\b[^}]*\}\s*from\s*['"][^'"]*islandRunRuntimeState['"]/g,
    ],
    allowlist: new Set([
      // TEMP allowlist (migration exceptions) — remove as slices land.
      'src/features/gamification/level-worlds/services/islandRunRuntimeState.ts',
      'src/features/gamification/level-worlds/services/islandRunTileRewardAction.ts',
      'src/features/gamification/level-worlds/services/__tests__/islandRunRuntimeState.integration.test.ts',
    ]),
    include: (file) => file.startsWith('src/features/') && file.endsWith('.tsx'),
  },
  {
    id: 'no_new_runtime_state_mirror',
    description: 'Do not introduce new gameplay runtimeState React mirrors in components.',
    patterns: [
      /\bconst\s*\[\s*runtimeState\s*,\s*setRuntimeState\s*\]\s*=\s*useState\s*\(/g,
      /\bsetRuntimeState\s*\(/g,
    ],
    allowlist: new Set([
      // TEMP allowlist (existing migration surface)
      'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx',
    ]),
    include: (file) => file.startsWith('src/features/') && file.endsWith('.tsx'),
  },
  {
    id: 'no_ui_runtime_read',
    description: 'UI/features should avoid direct readIslandRunRuntimeState where canonical hook/store should be used.',
    patterns: [
      /\breadIslandRunRuntimeState\s*\(/g,
      /import\s*\{[^}]*\breadIslandRunRuntimeState\b[^}]*\}\s*from\s*['"][^'"]*islandRunRuntimeState['"]/g,
    ],
    allowlist: new Set([
      // TEMP allowlist (known migration paths)
      'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx',
      'src/features/gamification/ScoreTab.tsx',
      'src/features/habits/DailyHabitTracker.tsx',
      'src/features/gamification/level-worlds/services/islandRunRuntimeState.ts',
      'src/features/gamification/level-worlds/services/__tests__/islandRunRuntimeState.integration.test.ts',
    ]),
    include: (file) => file.startsWith('src/features/') && file.endsWith('.tsx'),
  },
];

function countMatches(content, pattern) {
  const m = content.match(pattern);
  return m ? m.length : 0;
}

let failCount = 0;
let warnCount = 0;

for (const file of trackedFiles) {
  const abs = resolve(repoRoot, file);
  const content = readFileSync(abs, 'utf8');

  for (const rule of RULES) {
    if (!rule.include(file)) continue;

    const hits = rule.patterns.reduce((sum, p) => sum + countMatches(content, p), 0);
    if (hits === 0) continue;

    if (rule.allowlist.has(file)) {
      warnCount += 1;
      console.warn(`[IslandRunGuard][WARN][${rule.id}] allowlisted legacy usage in ${file} (hits=${hits})`);
    } else {
      failCount += 1;
      console.error(`[IslandRunGuard][FAIL][${rule.id}] ${rule.description} File: ${file} (hits=${hits})`);
    }
  }
}

if (failCount > 0) {
  console.error(`\n[IslandRunGuard] FAILED with ${failCount} violating file(s).`);
  process.exit(1);
}

console.log(`\n[IslandRunGuard] PASS. Violations: 0. Allowlisted warnings: ${warnCount}.`);
