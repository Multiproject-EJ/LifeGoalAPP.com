export const VAULT_CASINO_GAME_IDS = [
  'vault-rush',
  'crown-dice',
  'solar-orrery',
  'prism-cascade',
  'treasury-organ',
] as const;

export type VaultCasinoGameId = typeof VAULT_CASINO_GAME_IDS[number];
export type VaultCasinoResultTier = 'standard' | 'grand' | 'sovereign';

export interface VaultCasinoGameDefinition {
  id: VaultCasinoGameId;
  name: string;
  shortName: string;
  description: string;
  accent: string;
  format: string;
}

export interface VaultCasinoPrototypeResult {
  tier: VaultCasinoResultTier;
  score: number;
  maxScore: number;
  summary: string;
}

export interface VaultCasinoClosedLoopPolicy {
  entrySource: 'island-run-earned';
  rewards: 'virtual-only';
  directAttemptPurchaseEnabled: false;
  virtualCashOutEnabled: true;
  virtualCashOutDestination: 'in-game-cash';
  realMoneyCashOutEnabled: false;
  adjacentMicrotransactions: 'allowed';
  repeatPurchasesEnabled: true;
  highAggregateSpendPossible: true;
  externalValueTransferEnabled: false;
  boundedRoundRequired: true;
  sessionLoop: 'repeatable-bounded';
  sessionEndRequired: true;
  honestOutcomePresentationRequired: true;
  automaticSequences: 'bounded-only';
}

export const VAULT_CASINO_CLOSED_LOOP_POLICY: Readonly<VaultCasinoClosedLoopPolicy> = Object.freeze({
  entrySource: 'island-run-earned',
  rewards: 'virtual-only',
  directAttemptPurchaseEnabled: false,
  virtualCashOutEnabled: true,
  virtualCashOutDestination: 'in-game-cash',
  realMoneyCashOutEnabled: false,
  adjacentMicrotransactions: 'allowed',
  repeatPurchasesEnabled: true,
  highAggregateSpendPossible: true,
  externalValueTransferEnabled: false,
  boundedRoundRequired: true,
  sessionLoop: 'repeatable-bounded',
  sessionEndRequired: true,
  honestOutcomePresentationRequired: true,
  automaticSequences: 'bounded-only',
});

export const VAULT_CASINO_GAME_DEFINITIONS: readonly VaultCasinoGameDefinition[] = Object.freeze([
  {
    id: 'vault-rush',
    name: 'Vault Rush',
    shortName: 'Rush',
    description: 'Reveal treasury doors until three matching figures answer the lock.',
    accent: '#43d9ff',
    format: 'Memory and reveal',
  },
  {
    id: 'crown-dice',
    name: 'Crown Dice',
    shortName: 'Dice',
    description: 'Keep gemstone dice, reroll twice, then turn one face with the crown.',
    accent: '#ff5678',
    format: 'Set building',
  },
  {
    id: 'solar-orrery',
    name: 'Solar Orrery',
    shortName: 'Orrery',
    description: 'Stop three celestial rings and focus their light through the sun crystal.',
    accent: '#ffc94e',
    format: 'Timing and alignment',
  },
  {
    id: 'prism-cascade',
    name: 'Prism Cascade',
    shortName: 'Prism',
    description: 'Set three mirror gates, then release one crystal through the cascade.',
    accent: '#4fe8d1',
    format: 'Planning and physics',
  },
  {
    id: 'treasury-organ',
    name: 'Treasury Organ',
    shortName: 'Organ',
    description: 'Listen to the jeweled pipes and answer their short ceremonial sequence.',
    accent: '#b984ff',
    format: 'Memory and rhythm',
  },
]);

export function getVaultCasinoGameDefinition(gameId: VaultCasinoGameId): VaultCasinoGameDefinition {
  return VAULT_CASINO_GAME_DEFINITIONS.find((definition) => definition.id === gameId)
    ?? VAULT_CASINO_GAME_DEFINITIONS[0];
}

export function resolveVaultCasinoRotation(effectiveIslandNumber: number): readonly VaultCasinoGameId[] {
  const safeIsland = Number.isFinite(effectiveIslandNumber)
    ? Math.max(1, Math.floor(effectiveIslandNumber))
    : 1;
  const offset = (safeIsland - 1) % VAULT_CASINO_GAME_IDS.length;
  return Object.freeze([
    ...VAULT_CASINO_GAME_IDS.slice(offset),
    ...VAULT_CASINO_GAME_IDS.slice(0, offset),
  ]);
}

export function resolveVaultCasinoGameForClaim(options: {
  effectiveIslandNumber: number;
  claimCount: number;
}): VaultCasinoGameId | null {
  const claimCount = Number.isFinite(options.claimCount)
    ? Math.max(0, Math.floor(options.claimCount))
    : 0;
  if (claimCount >= VAULT_CASINO_GAME_IDS.length) return null;
  return resolveVaultCasinoRotation(options.effectiveIslandNumber)[claimCount] ?? null;
}

export function resolveVaultCasinoResultTier(score: number, maxScore: number): VaultCasinoResultTier {
  const safeMax = Math.max(1, Math.floor(maxScore));
  const ratio = Math.max(0, Math.min(1, score / safeMax));
  if (ratio >= 0.84) return 'sovereign';
  if (ratio >= 0.55) return 'grand';
  return 'standard';
}

export function resolveVaultCasinoVirtualCashPayout(result: VaultCasinoPrototypeResult): number {
  const safeMax = Math.max(1, Math.floor(result.maxScore));
  const ratio = Math.max(0, Math.min(1, result.score / safeMax));
  const payoutRange: Record<VaultCasinoResultTier, readonly [number, number]> = {
    standard: [120, 300],
    grand: [500, 1_000],
    sovereign: [1_250, 2_500],
  };
  const [minimum, maximum] = payoutRange[result.tier];
  const payout = minimum + (maximum - minimum) * ratio;
  return Math.max(minimum, Math.round(payout / 10) * 10);
}

function seededUnit(seed: number): number {
  let value = Math.imul((Math.floor(seed) | 0) ^ 0x9e3779b9, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;
  return (value >>> 0) / 0x100000000;
}

function seededInteger(seed: number, min: number, max: number): number {
  return min + Math.floor(seededUnit(seed) * (max - min + 1));
}

export function createCrownDice(seed: number): readonly number[] {
  return Object.freeze(Array.from({ length: 5 }, (_, index) => seededInteger(seed + index * 101, 1, 6)));
}

export function rerollCrownDice(options: {
  dice: readonly number[];
  heldIndices: readonly number[];
  seed: number;
  rerollIndex: number;
}): readonly number[] {
  const held = new Set(options.heldIndices);
  return Object.freeze(Array.from({ length: 5 }, (_, index) => (
    held.has(index)
      ? Math.max(1, Math.min(6, Math.floor(options.dice[index] ?? 1)))
      : seededInteger(options.seed + options.rerollIndex * 809 + index * 131, 1, 6)
  )));
}

export function turnCrownDie(dice: readonly number[], dieIndex: number): readonly number[] {
  return Object.freeze(Array.from({ length: 5 }, (_, index) => {
    const value = Math.max(1, Math.min(6, Math.floor(dice[index] ?? 1)));
    if (index !== dieIndex) return value;
    return value === 6 ? 1 : value + 1;
  }));
}

export function scoreCrownDice(dice: readonly number[]): VaultCasinoPrototypeResult {
  const values = Array.from({ length: 5 }, (_, index) => Math.max(1, Math.min(6, Math.floor(dice[index] ?? 1))));
  const counts = [...new Set(values)].map((value) => values.filter((entry) => entry === value).length).sort((a, b) => b - a);
  const sortedUnique = [...new Set(values)].sort((a, b) => a - b);
  const straight = sortedUnique.length === 5 && (
    sortedUnique.join(',') === '1,2,3,4,5' || sortedUnique.join(',') === '2,3,4,5,6'
  );
  let score = values.reduce((sum, value) => sum + value, 0);
  let summary = 'Treasury hand';
  if (counts[0] === 5) {
    score = 100;
    summary = 'Five crown jewels';
  } else if (counts[0] === 4) {
    score = 86;
    summary = 'Royal four';
  } else if (counts[0] === 3 && counts[1] === 2) {
    score = 78;
    summary = 'Full treasury';
  } else if (straight) {
    score = 72;
    summary = 'Crown procession';
  } else if (counts[0] === 3) {
    score = 60;
    summary = 'Triple setting';
  } else if (counts[0] === 2 && counts[1] === 2) {
    score = 52;
    summary = 'Twin settings';
  } else if (counts[0] === 2) {
    score = 38;
    summary = 'Matched jewels';
  }
  return { tier: resolveVaultCasinoResultTier(score, 100), score, maxScore: 100, summary };
}

function circularDistance(left: number, right: number): number {
  const delta = Math.abs(((left - right) % 360 + 360) % 360);
  return Math.min(delta, 360 - delta);
}

export function createSolarOrreryTargets(seed: number): readonly number[] {
  const anchor = seededInteger(seed, 0, 11) * 30;
  return Object.freeze([anchor, (anchor + 120) % 360, (anchor + 240) % 360]);
}

export function scoreSolarOrrery(
  stoppedAngles: readonly number[],
  targetAngles: readonly number[],
): VaultCasinoPrototypeResult {
  const errors = Array.from({ length: 3 }, (_, index) => circularDistance(
    Number.isFinite(stoppedAngles[index]) ? stoppedAngles[index] : 180,
    Number.isFinite(targetAngles[index]) ? targetAngles[index] : 0,
  ));
  const score = Math.max(0, Math.round(100 - errors.reduce((sum, error) => sum + Math.min(120, error), 0) / 3));
  return {
    tier: resolveVaultCasinoResultTier(score, 100),
    score,
    maxScore: 100,
    summary: score >= 84 ? 'Sovereign alignment' : score >= 55 ? 'Grand alignment' : 'Solar trace',
  };
}

export type PrismMirrorPosition = -1 | 0 | 1;

export interface PrismCascadeResolution {
  lanes: readonly number[];
  result: VaultCasinoPrototypeResult;
}

export function resolvePrismCascade(seed: number, mirrors: readonly PrismMirrorPosition[]): PrismCascadeResolution {
  const lanes = [seededInteger(seed, -2, 2)];
  for (let index = 0; index < 3; index++) {
    const mirror = mirrors[index] ?? 0;
    const drift = seededInteger(seed + index * 211, -1, 1);
    lanes.push(Math.max(-3, Math.min(3, lanes[lanes.length - 1] + mirror + drift)));
  }
  const finalLane = lanes[lanes.length - 1];
  const score = Math.max(20, 100 - Math.abs(finalLane) * 24);
  return {
    lanes: Object.freeze(lanes),
    result: {
      tier: resolveVaultCasinoResultTier(score, 100),
      score,
      maxScore: 100,
      summary: finalLane === 0 ? 'Heart of the prism' : Math.abs(finalLane) === 1 ? 'Jewel channel' : 'Outer treasury',
    },
  };
}

export function createTreasuryOrganSequence(seed: number, length = 5): readonly number[] {
  const safeLength = Math.max(3, Math.min(7, Math.floor(length)));
  return Object.freeze(Array.from({ length: safeLength }, (_, index) => seededInteger(seed + index * 173, 0, 4)));
}

export function scoreTreasuryOrgan(
  expected: readonly number[],
  played: readonly number[],
): VaultCasinoPrototypeResult {
  const maxScore = Math.max(1, expected.length) * 20;
  const correct = expected.reduce((count, note, index) => count + (played[index] === note ? 1 : 0), 0);
  const score = correct * 20;
  return {
    tier: resolveVaultCasinoResultTier(score, maxScore),
    score,
    maxScore,
    summary: correct === expected.length ? 'Perfect treasury chord' : `${correct}/${expected.length} pipes answered`,
  };
}
