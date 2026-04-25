import { assert } from './testHarness';
import type { TestCase } from './testHarness';

declare const process: { cwd: () => string };

async function readBoardSource(): Promise<string> {
  // @ts-ignore island-run test tsconfig omits node type libs
  const fsMod = await import('fs');
  // @ts-ignore island-run test tsconfig omits node type libs
  const pathMod = await import('path');
  const boardPath = pathMod.resolve(process.cwd(), 'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx');
  return fsMod.readFileSync(boardPath, 'utf8');
}

export const islandRunBoardEssenceParityTests: TestCase[] = [
  {
    name: 'encounter/boss/sanctuary/wisdom essence awards remain direct runtime-state increments (legacy parity)',
    run: async () => {
      const source = await readBoardSource();

      assert(
        source.includes("essence: prev.essence + totalEncounterEssence") &&
          source.includes("essenceLifetimeEarned: prev.essenceLifetimeEarned + totalEncounterEssence"),
        'Encounter reward should preserve direct runtime-state essence increment semantics.',
      );

      assert(
        source.includes("essence: prev.essence + bossReward.essence") &&
          source.includes("essenceLifetimeEarned: prev.essenceLifetimeEarned + bossReward.essence"),
        'Boss reward should preserve direct runtime-state essence increment semantics.',
      );

      assert(
        source.includes("essence: prev.essence + rewardEssence") &&
          source.includes("essenceLifetimeEarned: prev.essenceLifetimeEarned + rewardEssence"),
        'Sanctuary bond rewards should preserve direct runtime-state essence increment semantics.',
      );

      assert(
        source.includes('essence: prev.essence + WISDOM_ESSENCE_BONUS_AMOUNT') &&
          source.includes('essenceLifetimeEarned: prev.essenceLifetimeEarned + WISDOM_ESSENCE_BONUS_AMOUNT'),
        'Wisdom bonus should preserve direct runtime-state essence increment semantics.',
      );
    },
  },
  {
    name: 'legacy parity guard: board essence reward paths do not call awardContractV2Essence',
    run: async () => {
      const source = await readBoardSource();
      assert(
        !source.includes("awardContractV2Essence(totalEncounterEssence, 'encounter_reward')"),
        'Encounter reward should not route via canonical helper in parity mode.',
      );
      assert(
        !source.includes("awardContractV2Essence(bossReward.essence, 'boss_trial_reward')"),
        'Boss reward should not route via canonical helper in parity mode.',
      );
      assert(
        !source.includes("awardContractV2Essence(rewardEssence, 'sanctuary_bond_reward_claim')"),
        'Sanctuary bond reward should not route via canonical helper in parity mode.',
      );
      assert(
        !source.includes("awardContractV2Essence(WISDOM_ESSENCE_BONUS_AMOUNT, 'wisdom_essence_bonus')"),
        'Wisdom bonus should not route via canonical helper in parity mode.',
      );
    },
  },
  {
    name: 'story and sanctuary duplicate handlers remain removed; active sanctuary/story wiring is kept',
    run: async () => {
      const source = await readBoardSource();
      assert(
        !source.includes('const handleStoryRewardClaim ='),
        'Duplicate local story reward handler should remain removed to prevent split wiring.',
      );
      assert(
        source.includes('onRewardClaim={sanctuaryHandlers.storyRewardClaim}'),
        'IslandStoryReader should remain wired to sanctuaryHandlers.storyRewardClaim.',
      );
      assert(
        !source.includes('const handleClaimSanctuaryBondReward ='),
        'Duplicate sanctuary bond-claim handler should remain removed to prevent split wiring.',
      );
      assert(
        !source.includes('const closeSanctuaryPanel ='),
        'Duplicate sanctuary close handler should remain removed to prevent split wiring.',
      );
      assert(
        !source.includes('const handleSetActiveCompanion ='),
        'Duplicate sanctuary set-active handler should remain removed to prevent split wiring.',
      );
      assert(
        !source.includes('const handleOpenSanctuaryCreature ='),
        'Duplicate sanctuary open handler should remain removed to prevent split wiring.',
      );
      assert(
        !source.includes('const handleFeedSanctuaryCreature ='),
        'Duplicate sanctuary feed handler should remain removed to prevent split wiring.',
      );
      assert(
        source.includes('onClick={() => sanctuaryHandlers.claimBondReward('),
        'Sanctuary claim UI should remain wired to sanctuaryHandlers.claimBondReward.',
      );
      assert(
        source.includes('onClick={() => sanctuaryHandlers.feedCreature('),
        'Sanctuary feed UI should remain wired to sanctuaryHandlers.feedCreature.',
      );
      assert(
        source.includes('onClick={() => sanctuaryHandlers.openCreature('),
        'Sanctuary open UI should remain wired to sanctuaryHandlers.openCreature.',
      );
      assert(
        source.includes('onClick={() => sanctuaryHandlers.setActiveCompanion('),
        'Sanctuary set-active UI should remain wired to sanctuaryHandlers.setActiveCompanion.',
      );
      assert(
        source.includes('onClick={sanctuaryHandlers.closePanel}'),
        'Sanctuary close UI should remain wired to sanctuaryHandlers.closePanel.',
      );
    },
  },
  {
    name: 'roll sync guard: passive regen is gated while roll/hop sync is in-flight',
    run: async () => {
      const source = await readBoardSource();
      assert(
        source.includes("const isRollSyncPendingRef = useRef(false);"),
        'Board should track roll-sync pending window for stale-writer gating.',
      );
      assert(
        source.includes("if (reason !== 'pre_roll' && (isAnimatingRollRef.current || isRollSyncPendingRef.current))"),
        'Passive regen should skip interval/focus/visibility ticks while roll/hop sync is active.',
      );
      assert(
        source.includes('isRollSyncPendingRef.current = true;') &&
          source.includes('isRollSyncPendingRef.current = false;'),
        'Roll handler should bracket post-roll sync window with pending flag set/clear.',
      );
    },
  },
  {
    name: 'tile reward success path updates visible runtimeState essence mirror (not only error path)',
    run: async () => {
      const source = await readBoardSource();
      assert(
        source.includes("if (result.status !== 'ok') return;"),
        'Tile reward success path guard should exist before runtime mirror sync.',
      );
      assert(
        source.includes('essence: result.essence') &&
          source.includes('essenceLifetimeEarned: result.essenceLifetimeEarned') &&
          source.includes('essenceLifetimeSpent: result.essenceLifetimeSpent'),
        'Tile reward success path should hydrate runtimeState essence fields from result.',
      );
      assert(
        source.includes('runtimeStateRef.current = nextRuntimeState;'),
        'Tile reward success path should sync runtimeStateRef immediately for read-after-write safety.',
      );
      assert(
        source.includes('setRuntimeState(readIslandRunRuntimeState(session));'),
        'Error path fallback sync should remain present (separate from success-path mirror sync).',
      );
    },
  },
];
