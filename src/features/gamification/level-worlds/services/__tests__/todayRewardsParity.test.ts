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
    name: 'habit bonus spin in Today surfaces is once-per-day via local marker',
    run: async () => {
      const dailyTracker = await readSource('src/features/habits/DailyHabitTracker.tsx');
      const unifiedToday = await readSource('src/features/habits/UnifiedTodayView.tsx');
      assert(
        dailyTracker.includes('lifegoal:daily-spin-habit-bonus:')
          && dailyTracker.includes('await updateSpinsAvailable(session.user.id, 1);'),
        'DailyHabitTracker should gate habit bonus spins by a once-per-day marker.',
      );
      assert(
        dailyTracker.includes('await refreshDailySpinStatus();'),
        'DailyHabitTracker should refresh daily-spin status after bonus grant so UI alerts return immediately.',
      );
      assert(
        unifiedToday.includes('lifegoal:daily-spin-habit-bonus:')
          && unifiedToday.includes('await updateSpinsAvailable(session.user.id, 1);'),
        'UnifiedTodayView should gate habit bonus spins by the same once-per-day marker.',
      );
    },
  },
  {
    name: 'Today offer copy guides bonus-spin earn flow and strong available state',
    run: async () => {
      const todayTracker = await readSource('src/features/habits/DailyHabitTracker.tsx');
      assert(
        todayTracker.includes('Complete 1 habit to earn your bonus spin.')
          && todayTracker.includes('Spin Ready')
          && todayTracker.includes('Bonus Spin'),
        'Today Offer should surface bonus-spin guidance at 0 spins and Spin Ready state when spins are available.',
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
