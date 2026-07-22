import { assert, type TestCase } from './testHarness';

declare const process: { cwd: () => string };

async function readSource(relativePath: string): Promise<string> {
  // @ts-ignore island-run test tsconfig omits node type libs
  const fsMod = await import('fs');
  // @ts-ignore island-run test tsconfig omits node type libs
  const pathMod = await import('path');
  const absolutePath = pathMod.resolve(process.cwd(), relativePath);
  return fsMod.readFileSync(absolutePath, 'utf8');
}

export const todayRewardsParityTests: TestCase[] = [
  {
    name: 'Vision Star dice route through dailyTreats helper with Island Run session parity',
    run: async () => {
      const source = await readSource('src/features/habits/DailyHabitTracker.tsx');
      assert(
        source.includes('awardDailyTreatDice({')
          && source.includes("sourceLabel: 'Vision Star reward'")
          && source.includes('islandRunSession: session'),
        'Vision Star reward should award dice via awardDailyTreatDice with islandRunSession parity.',
      );
    },
  },
  {
    name: 'daily spin service seeds one free spin and caps at two',
    run: async () => {
      const source = await readSource('src/services/dailySpin.ts');
      assert(
        source.includes('const DAILY_FREE_SPINS = 1;')
          && source.includes('spinsAvailable: DAILY_FREE_SPINS')
          && source.includes('const baseSpins = isNewDay ? DAILY_FREE_SPINS : currentState.spinsAvailable;'),
        'Daily spin service should seed one free spin and use day-boundary base-spin logic.',
      );
      assert(
        source.includes('const newSpins = clampSpinsForStrictDailyLimit(rawNewSpins);'),
        'Daily spin updates should route through strict clamp for max policy enforcement.',
      );
    },
  },
  {
    name: 'habit bonus spin in Today surfaces uses server idempotency helper',
    run: async () => {
      const dailyTracker = await readSource('src/features/habits/DailyHabitTracker.tsx');
      const unifiedToday = await readSource('src/features/habits/UnifiedTodayView.tsx');
      assert(
        dailyTracker.includes('claimDailySpinHabitBonusOncePerDay'),
        'DailyHabitTracker should gate habit bonus spins through the server idempotency helper.',
      );
      assert(
        dailyTracker.includes('await refreshDailySpinStatus();'),
        'DailyHabitTracker should refresh daily-spin status after bonus grant so UI alerts return immediately.',
      );
      assert(
        unifiedToday.includes('claimDailySpinHabitBonusOncePerDay'),
        'UnifiedTodayView should gate habit bonus spins through the same server idempotency helper.',
      );
    },
  },
  {
    name: 'Daily Momentum launcher lives in the Island Run quick-action column',
    run: async () => {
      const todayTracker = await readSource('src/features/habits/DailyHabitTracker.tsx');
      const levelWorldsHub = await readSource('src/features/gamification/level-worlds/LevelWorldsHub.tsx');
      const islandRunBoard = await readSource('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx');
      assert(
        !todayTracker.includes('habit-day-nav__todays-offer-spin')
          && todayTracker.includes("badgeLabelOverride: 'Open'"),
        'Today\'s Offer should remain a shop-only entry without Daily Spin status coupling.',
      );
      assert(
        levelWorldsHub.includes('onOpenDailySpinWheel={onOpenDailySpinWheel}')
          && islandRunBoard.includes('island-run-board__daily-momentum-btn')
          && islandRunBoard.includes('dailySpinAvailable'),
        'Island Run should own a Daily Momentum launcher with available/collected presentation.',
      );
    },
  },
  {
    name: 'Daily Momentum modal stacks above the full-screen Island Run entry layer',
    run: async () => {
      const dailySpinCss = await readSource('src/features/spin-wheel/NewDailySpinWheel.css');
      const appCss = await readSource('src/index.css');
      assert(
        dailySpinCss.includes('z-index: 11050;')
          && appCss.includes('.level-worlds-entry-modal {')
          && appCss.includes('z-index: 9999;'),
        'Daily Momentum must render above the Island Run full-screen entry layer when launched from the board.',
      );
    },
  },

  {
    name: 'Today row exposes normal and Egg Mania hatching circles',
    run: async () => {
      const todayTracker = await readSource('src/features/habits/DailyHabitTracker.tsx');
      const offerRow = await readSource('src/features/habits/TimeBoundOfferRow.tsx');
      assert(
        todayTracker.includes('getUnresolvedEggSlotsForIsland(islandRunState.perIslandEggs, activeIsland)')
          && todayTracker.includes('visibleEggSlotsOnActiveIsland.map')
          && todayTracker.includes('`egg_hatch_${slotIndex}`')
          && todayTracker.includes('label: isReadyToHatch ? `${eggLabelPrefix} Ready` : `${eggLabelPrefix} Hatching`')
          && todayTracker.includes('expiresAtMs: isReadyToHatch ? null : entry.hatchAtMs'),
        'DailyHabitTracker should build one Today carousel hatch offer per normal or Egg Mania slot, including incubating countdowns.',
      );
      assert(
        offerRow.includes('export type EggHatchOfferId = `egg_hatch_${number}`;'),
        'TimeBoundOfferRow should accept slot-specific Egg Mania hatch offer ids.',
      );
    },
  },
  {
    name: 'Today reward paths do not write spinTokens directly',
    run: async () => {
      const todayTracker = await readSource('src/features/habits/DailyHabitTracker.tsx');
      const dailyTreats = await readSource('src/services/dailyTreats.ts');
      assert(!todayTracker.includes('spinTokens'), 'DailyHabitTracker should not directly touch spinTokens.');
      assert(!dailyTreats.includes('spinTokens'), 'dailyTreats rewards should not directly touch spinTokens.');
    },
  },
  {
    name: 'Daily spin modal no longer includes Today\'s prizes copy block',
    run: async () => {
      const source = await readSource('src/features/spin-wheel/NewDailySpinWheel.tsx');
      assert(
        !source.includes("Today&apos;s Prizes") && !source.includes("Today's Prizes"),
        'Daily spin modal should not render the Today\'s Prizes legend heading.',
      );
    },
  },
];
