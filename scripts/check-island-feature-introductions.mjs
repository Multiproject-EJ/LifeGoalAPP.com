import { createServer } from 'vite';

// Focused behavioral smoke runner; the full TypeScript/service suite remains
// a separate release gate. No real account, remote persistence or writes.
process.env.NODE_ENV = 'production';
const server = await createServer({ configFile: false, mode: 'production', appType: 'custom',
  cacheDir: '.tmp-palace-release-vite-cache', optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false }, logLevel: 'error' });
let passed = 0;
let failed = 0;
try {
  for (const [file, name] of [
    ['islandRunFeatureAccess', 'islandRunFeatureAccessTests'],
    ['islandRunOpeningGames', 'islandRunOpeningGamesTests'],
    ['islandRunOpeningGamesAction', 'islandRunOpeningGamesActionTests'],
    ['islandRunTileRewardAction', 'islandRunTileRewardActionTests'],
    ['islandRunStateActions', 'islandRunStateActionsTests'],
    ['islandRunContractV2RewardBar', 'islandRunContractV2RewardBarTests'],
    ['islandRunTrafficLightTile', 'islandRunTrafficLightTileTests'],
    ['islandRunVaultCollection', 'islandRunVaultCollectionTests'],
    ['islandRunMissionTracker', 'islandRunMissionTrackerTests'],
    ['islandRunSignatureMissions', 'islandRunSignatureMissionTests'],
    ['islandRunRollAction', 'islandRunRollActionTests'],
  ]) {
    const module = await server.ssrLoadModule(`/src/features/gamification/level-worlds/services/__tests__/${file}.test.ts`);
    if (!Array.isArray(module[name])) throw Error(`Missing test suite ${name}`);
    for (const test of module[name]) {
      try { await test.run(); passed++; console.log(`PASS ${file}: ${test.name}`); }
      catch (error) { failed++; console.error(`FAIL ${file}: ${test.name}: ${error instanceof Error ? error.message : error}`); }
    }
  }
  console.log(JSON.stringify({ passed, failed, scope: 'focused service behavior; not browser/production acceptance' }));
  if (failed) process.exitCode = 1;
} finally { await server.close(); }
