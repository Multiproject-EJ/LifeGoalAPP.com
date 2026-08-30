import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (relativePath) => readFileSync(resolve(root, relativePath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const lab = read('src/dev/VaultCasinoLab.tsx');
const model = read('src/features/gamification/level-worlds/services/islandRunVaultCasino.ts');
const modal = read('src/features/gamification/level-worlds/components/VaultIslandCollectionModal.tsx');
const board = read('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx');
const main = read('src/main.tsx');

for (const gameId of ['vault-rush', 'crown-dice', 'solar-orrery', 'prism-cascade', 'treasury-organ']) {
  assert(model.includes(`'${gameId}'`), `Vault Casino catalog is missing ${gameId}.`);
}

for (const policyToken of [
  "entrySource: 'island-run-earned'",
  "rewards: 'virtual-only'",
  'directAttemptPurchaseEnabled: false',
  'virtualCashOutEnabled: true',
  "virtualCashOutDestination: 'in-game-cash'",
  'realMoneyCashOutEnabled: false',
  "adjacentMicrotransactions: 'allowed'",
  'repeatPurchasesEnabled: true',
  'highAggregateSpendPossible: true',
  'externalValueTransferEnabled: false',
  "sessionLoop: 'repeatable-bounded'",
  'sessionEndRequired: true',
  "automaticSequences: 'bounded-only'",
]) {
  assert(model.includes(policyToken), `Vault Casino closed-loop policy is missing ${policyToken}.`);
}

assert(main.includes("const VAULT_CASINO_LAB_PATH = '/dev/vault-casino-lab';"), 'Vault Casino dev route is missing.');
assert(lab.includes("mode = readLabMode()"), 'Vault Casino lab must retain explicit prototype and inspect modes.');
assert(lab.includes('Play opens from Island Run'), 'Inspect mode must explain that play opens from Island Run.');
assert(modal.includes('<VaultCasinoLab') && modal.includes('mode="inspect"'), 'Vault Island must open the casino in inspect mode.');
assert(board.includes('casinoAvailableGameId={vaultCasinoAvailableGameId}'), 'Vault availability must be supplied by Island Run state.');

const forbiddenWriteSymbols = [
  'claimVaultRushReward',
  'persistIslandRunRuntimeStatePatch',
  'islandRunStateActions',
  'createCheckout',
];
for (const symbol of forbiddenWriteSymbols) {
  assert(!lab.includes(symbol), `Vault Casino presentation layer must not reference ${symbol}.`);
}

const forbiddenCommerceCopy = /\b(buy|purchase|checkout|microtransaction|paid retry|ticket shop)\b/i;
assert(!forbiddenCommerceCopy.test(lab), 'Vault Casino lab must not present a commerce or paid retry route.');

console.log('Vault Casino 2.0 contract checks passed.');
