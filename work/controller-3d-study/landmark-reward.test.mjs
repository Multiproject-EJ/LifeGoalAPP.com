import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { build } = createRequire(import.meta.resolve('vite'))('esbuild');
const result = await build({ entryPoints: ['src/features/gamification/level-worlds/services/islandRunLandmarkReward.ts'],
  bundle: true, platform: 'node', format: 'cjs', write: false });
const output = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, output, output.exports);
const { settleLandmarkCompletionDice: settle, getLandmarkRewardStatus: status } = output.exports;
const fixture = () => ({ currentIslandNumber: 3, cycleIndex: 0, islandStartedAtMs: 123,
  dicePool: 20, completedStopsByIsland: {},
  stopStatesByIndex: Array.from({ length: 5 }, () => ({ objectiveComplete: false, buildComplete: false })),
  stopBuildStateByIndex: Array.from({ length: 5 }, () => ({ buildLevel: 0 })) });
const change = (record, index, activity, level) => ({ ...record,
  stopStatesByIndex: record.stopStatesByIndex.map((s, i) => i === index ? { ...s, objectiveComplete: activity } : s),
  stopBuildStateByIndex: record.stopBuildStateByIndex.map((s, i) => i === index ? { ...s, buildLevel: level } : s) });
let cases = 0;
for (const first of ['activity', 'building']) for (let index = 0; index < 5; index++) {
  const initial = fixture();
  const partial = change(initial, index, first === 'activity', first === 'building' ? 3 : 0);
  assert.equal(settle(initial, partial).diceAwarded, 0);
  const done = settle(partial, change(partial, index, true, 3));
  assert.equal(done.diceAwarded, 5);
  assert.equal(done.record.dicePool, 25);
  assert.equal(status(done.record, index), 'earned');
  assert.equal(initial.dicePool, 20);
  assert.equal(settle(done.record, done.record).diceAwarded, 0);
  const loaded = JSON.parse(JSON.stringify(done.record));
  assert.equal(settle(loaded, change(loaded, index, true, 3)).diceAwarded, 0);
  const missingReceipt = { ...loaded, stopStatesByIndex: loaded.stopStatesByIndex.map(({completionDiceAwarded, ...rest}) => rest) };
  assert.equal(settle(loaded, missingReceipt).record.stopStatesByIndex[index].completionDiceAwarded, true);
  cases++;
}
const old = change(fixture(), 1, true, 3);
assert.equal(settle(old, { ...old, dicePool: 22 }).diceAwarded, 0);
assert.equal(status(old, 1), 'legacy-complete');
const initial = fixture();
const full = change(initial, 1, true, 3);
for (const key of ['currentIslandNumber', 'cycleIndex', 'islandStartedAtMs']) {
  assert.equal(settle(initial, { ...full, [key]: full[key] + 1 }).diceAwarded, 0);
  cases++;
}
assert.equal(settle(initial, { ...initial, completedStopsByIsland: { 2: ['habit'] } }).diceAwarded, 0);
const built = change(initial, 1, false, 3);
assert.equal(settle(built, { ...built, completedStopsByIsland: { 3: ['habit'] } }).diceAwarded, 5);
assert.equal(settle({ ...initial, currentIslandNumber: 1 }, { ...change(initial, 4, true, 3), currentIslandNumber: 1 }).diceAwarded, 0);
const legacyLedger = { ...built, completedStopsByIsland: { 3: ['habit'] } };
assert.equal(settle(legacyLedger, change(legacyLedger, 1, true, 3)).diceAwarded, 0);
const all = { ...initial, stopStatesByIndex: initial.stopStatesByIndex.map(s => ({ ...s, objectiveComplete: true })),
  stopBuildStateByIndex: initial.stopBuildStateByIndex.map(s => ({ ...s, buildLevel: 3 })), dicePool: 120 };
assert.equal(settle(initial, all).diceAwarded, 25);
assert.equal(settle(initial, all).record.dicePool, 145);
assert.equal(settle(all, all).diceAwarded, 0);
console.log(`PASS ${cases + 8} landmark reward scenarios: both orders, five landmarks, replay, JSON reload, receipt preservation, legacy, visit isolation, off-island eggs and other rewards`);
