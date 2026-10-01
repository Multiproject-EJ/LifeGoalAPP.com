/**
 * Drift Voyage: the post-120 endgame loop (user decision 2026-10-01).
 *
 * Finishing Island 120 completes the Great Drift. The campaign then wraps to
 * Island 1 on the next cycle, as it always has, but each further voyage is
 * framed as a "Drift Voyage": the islands drift back with a different
 * current every visit, so replays pay and feel different, and the Mega
 * Museum (Vol 2) is teased as what comes next.
 *
 * Pure rules only. The drift current's reward bonus is applied inside the
 * canonical boss-reward resolver, so every reward path agrees.
 */
export type DriftCurrentId = 'golden-tide' | 'lucky-winds' | 'starlit-spin' | 'treasure-swell';

export interface DriftCurrent {
  id: DriftCurrentId;
  icon: string;
  title: string;
  /** One line shown on arrival and in the island-clear celebration. */
  blurb: string;
  essenceMultiplier: number;
  bonusDice: number;
  bonusSpinTokens: number;
}

export const DRIFT_CURRENTS: readonly DriftCurrent[] = [
  {
    id: 'golden-tide', icon: '🌅', title: 'Golden Tide',
    blurb: '+50% essence when you clear this island.',
    essenceMultiplier: 1.5, bonusDice: 0, bonusSpinTokens: 0,
  },
  {
    id: 'lucky-winds', icon: '🍃', title: 'Lucky Winds',
    blurb: '+10 bonus dice when you clear this island.',
    essenceMultiplier: 1, bonusDice: 10, bonusSpinTokens: 0,
  },
  {
    id: 'starlit-spin', icon: '✨', title: 'Starlit Current',
    blurb: '+2 Lucky Spin tokens when you clear this island.',
    essenceMultiplier: 1, bonusDice: 0, bonusSpinTokens: 2,
  },
  {
    id: 'treasure-swell', icon: '🌊', title: 'Treasure Swell',
    blurb: '+25% essence and +5 dice when you clear this island.',
    essenceMultiplier: 1.25, bonusDice: 5, bonusSpinTokens: 0,
  },
];

function safeInt(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

/** Cycle 0 is the Great Drift itself; every later cycle is a Drift Voyage. */
export function isDriftVoyageCycle(cycleIndex: number): boolean {
  return safeInt(cycleIndex, 0) >= 1;
}

/** The voyage number players see: Drift Voyage 1 is the first replay. */
export function getDriftVoyageNumber(cycleIndex: number): number {
  return Math.max(0, safeInt(cycleIndex, 0));
}

/**
 * Deterministic current for an island visit. Neighbouring islands never
 * share a current, and the same island gets a different one each voyage.
 */
export function resolveDriftCurrent(cycleIndex: number, islandNumber: number): DriftCurrent | null {
  if (!isDriftVoyageCycle(cycleIndex)) return null;
  const cycle = safeInt(cycleIndex, 1);
  const island = Math.max(1, safeInt(islandNumber, 1));
  const index = (island + cycle) % DRIFT_CURRENTS.length;
  return DRIFT_CURRENTS[index]!;
}

export interface DriftRewardable {
  dice: number;
  essence: number;
  spinTokens: number;
}

export function applyDriftCurrentToReward<T extends DriftRewardable>(reward: T, current: DriftCurrent | null): T {
  if (!current) return reward;
  return {
    ...reward,
    dice: reward.dice + current.bonusDice,
    essence: Math.round(reward.essence * current.essenceMultiplier),
    spinTokens: reward.spinTokens + current.bonusSpinTokens,
  };
}

/** True for the trip that completes the Great Drift (or a later voyage). */
export function isDriftVoyageCompletionTravel(options: {
  fromIslandNumber: number;
  toIslandNumber: number;
}): boolean {
  return safeInt(options.fromIslandNumber, 0) === 120 && safeInt(options.toIslandNumber, 0) === 1;
}

export interface DriftVoyageIntro {
  voyageNumber: number;
  title: string;
  lines: readonly string[];
  teaser: { title: string; body: string };
}

/** The ceremony shown once when a new Drift Voyage begins on Island 1. */
export function resolveDriftVoyageIntro(cycleIndex: number): DriftVoyageIntro | null {
  if (!isDriftVoyageCycle(cycleIndex)) return null;
  const voyageNumber = getDriftVoyageNumber(cycleIndex);
  return {
    voyageNumber,
    title: voyageNumber === 1 ? 'The Great Drift is complete' : `Drift Voyage ${voyageNumber - 1} is complete`,
    lines: [
      'All 120 islands are restored. The currents are shifting, and the islands drift back to you.',
      `Drift Voyage ${voyageNumber} begins: every island carries a new drift current with its own bonus when you clear it.`,
      'Rewards and challenges rise with every voyage, and your events keep running as normal.',
    ],
    teaser: {
      title: 'Coming next: the Mega Museum',
      body: 'A new storyline across 120 museum rooms, where the treasures you found on your voyage go on display.',
    },
  };
}

export function getDriftVoyageIntroSeenKey(cycleIndex: number): string {
  return `drift-voyage-intro:${Math.max(0, safeInt(cycleIndex, 0))}`;
}

/** Travel-interlude caption override for the trip that completes a voyage. */
export const DRIFT_VOYAGE_COMPLETION_CAPTION = 'The Great Drift is complete. Rest easy — the currents are carrying you home to Island 1.';
