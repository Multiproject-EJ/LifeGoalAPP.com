import { LIFE_WHEEL_AREAS, type LifeWheelArea } from '../../../life-wheel/lifeWheelTaxonomy';
import type { GameLifeIntakeStage } from '../../../../services/gameLifeIntake';

/**
 * Per-island content recipe layer.
 *
 * The 120 islands share one board and one tagged content pool. Rather than
 * hand-authoring every island, `getIslandContentPlan` derives — deterministically
 * from the island number — which "band" (act) the island is in, how deep the
 * info collection should go, and how the Habit Landmark should pick areas:
 *
 *  - Early islands (1..ONBOARDING_LAST_ISLAND) run a FIXED onboarding curriculum
 *    that walks the player across foundational life areas in a predictable order.
 *  - Later islands switch to ADAPTIVE selection driven by the player's latest
 *    check-in (weak/uncovered areas first).
 *
 * The act also sets the intake stage, so the life-data curriculum deepens as the
 * player progresses (baseline -> habit fit -> motivation -> environment -> reflection).
 */
export const MAX_ISLANDS = 120;

/** Last island that uses the fixed onboarding curriculum. */
export const ONBOARDING_LAST_ISLAND = 5;

export type IslandActKey = 'awakening' | 'growth' | 'power' | 'mastery' | 'transcendence';

export type IslandAct = {
  number: 1 | 2 | 3 | 4 | 5;
  key: IslandActKey;
  name: string;
  islandRange: readonly [number, number];
};

const ACTS: readonly IslandAct[] = [
  { number: 1, key: 'awakening', name: 'Awakening', islandRange: [1, 24] },
  { number: 2, key: 'growth', name: 'Growth', islandRange: [25, 48] },
  { number: 3, key: 'power', name: 'Power', islandRange: [49, 72] },
  { number: 4, key: 'mastery', name: 'Mastery', islandRange: [73, 96] },
  { number: 5, key: 'transcendence', name: 'Transcendence', islandRange: [97, 120] },
] as const;

const INTAKE_STAGE_BY_ACT: Record<IslandActKey, GameLifeIntakeStage> = {
  awakening: 'baseline',
  growth: 'habit_fit',
  power: 'motivation',
  mastery: 'environment',
  transcendence: 'reflection',
};

/**
 * Fixed onboarding focus areas for islands 1..ONBOARDING_LAST_ISLAND. Walks the
 * player across foundational areas so they build breadth before the adaptive
 * engine takes over. Indexed by island number (1-based).
 */
const ONBOARDING_CURRICULUM: Record<number, LifeWheelArea> = {
  1: 'Health',
  2: 'Mind',
  3: 'Work',
  4: 'Connections',
  5: 'Home',
};

export type HabitSelectionMode = 'fixed_curriculum' | 'adaptive';

export type IslandContentPlan = {
  islandNumber: number;
  act: IslandAct;
  depthTier: 1 | 2 | 3 | 4 | 5;
  intakeStage: GameLifeIntakeStage;
  habitSelectionMode: HabitSelectionMode;
  /** For fixed-curriculum islands, the focus areas to lead with. Empty when adaptive. */
  curriculumAreas: LifeWheelArea[];
};

export function clampIslandNumber(islandNumber: number): number {
  if (!Number.isFinite(islandNumber)) return 1;
  return Math.min(MAX_ISLANDS, Math.max(1, Math.floor(islandNumber)));
}

export function getIslandAct(islandNumber: number): IslandAct {
  const safe = clampIslandNumber(islandNumber);
  return ACTS.find((act) => safe >= act.islandRange[0] && safe <= act.islandRange[1]) ?? ACTS[0];
}

export function getIslandContentPlan(islandNumber: number): IslandContentPlan {
  const safe = clampIslandNumber(islandNumber);
  const act = getIslandAct(safe);
  const isOnboarding = safe <= ONBOARDING_LAST_ISLAND;
  const curriculumArea = ONBOARDING_CURRICULUM[safe];

  return {
    islandNumber: safe,
    act,
    depthTier: act.number,
    intakeStage: INTAKE_STAGE_BY_ACT[act.key],
    habitSelectionMode: isOnboarding ? 'fixed_curriculum' : 'adaptive',
    curriculumAreas: isOnboarding && curriculumArea ? [curriculumArea] : [],
  };
}

/**
 * Order the areas to display in the Habit Landmark for a given island.
 *
 * Fixed-curriculum islands lead with their curriculum area, then the remaining
 * adaptive picks. Adaptive islands return the adaptive picks unchanged. Either
 * way, the result is de-duplicated and only contains valid areas.
 */
export function orderAreasForIsland(
  islandNumber: number,
  adaptiveAreas: readonly LifeWheelArea[],
): LifeWheelArea[] {
  const plan = getIslandContentPlan(islandNumber);
  const ordered: LifeWheelArea[] = [];
  const seen = new Set<LifeWheelArea>();

  const pushArea = (area: LifeWheelArea) => {
    if (!seen.has(area) && LIFE_WHEEL_AREAS.includes(area)) {
      seen.add(area);
      ordered.push(area);
    }
  };

  if (plan.habitSelectionMode === 'fixed_curriculum') {
    plan.curriculumAreas.forEach(pushArea);
  }
  adaptiveAreas.forEach(pushArea);

  // Curriculum islands guarantee at least the curriculum area even if the
  // adaptive list was empty.
  if (ordered.length === 0) {
    plan.curriculumAreas.forEach(pushArea);
  }
  return ordered;
}
