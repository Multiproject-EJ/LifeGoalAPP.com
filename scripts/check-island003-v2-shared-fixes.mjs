import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({ appType: 'custom', configFile: false, cacheDir: '.vite-cache/shared-fixes', logLevel: 'error', server: {middlewareMode: true, hmr: false} });
try {
  const tracker = await server.ssrLoadModule('/src/features/gamification/level-worlds/services/__tests__/islandRunMissionTracker.test.ts');
  for (const test of tracker.islandRunMissionTrackerTests) { await test.run(); console.log(`PASS ${test.name}`); }
  const pilot = await server.ssrLoadModule('/src/features/gamification/level-worlds/services/__tests__/island5ThreePilotContract.test.ts');
  const selected = pilot.island5ThreePilotContractTests.filter(test => /bounded pop|construction|funded|Build visual/.test(test.name));
  assert(selected.length >= 3, 'construction regression coverage missing');
  for (const test of selected) { await test.run(); console.log(`PASS ${test.name}`); }
} finally { await server.close(); }
