import { assert, assertEqual, type TestCase } from './testHarness';
import {
  DRIFT_CURRENTS,
  DRIFT_VOYAGE_COMPLETION_CAPTION,
  applyDriftCurrentToReward,
  getDriftVoyageIntroSeenKey,
  isDriftVoyageCycle,
  resolveDriftCurrent,
  resolveDriftVoyageIntro,
} from '../islandRunDriftVoyage';
import { getIslandRunBossReward, getIslandRunIslandClearDice } from '../islandRunBossReward';
import { resolveTravelInterludePlan } from '../islandTravelInterlude';

async function readSource(path: string): Promise<string> {
  // @ts-ignore island-run test tsconfig omits node type libs
  const fsMod = await import('fs');
  return fsMod.readFileSync(`src/features/gamification/level-worlds/${path}`, 'utf8');
}

export const islandRunDriftVoyageTests: TestCase[] = [
  {
    name: 'drift voyage: the Great Drift (cycle 0) has no currents and unchanged boss rewards',
    run: () => {
      assert(!isDriftVoyageCycle(0), 'cycle 0 is the Great Drift');
      for (const island of [1, 7, 60, 120]) {
        assertEqual(resolveDriftCurrent(0, island), null, `no current on Island ${island}`);
        const reward = getIslandRunBossReward(island);
        assertEqual(reward.dice, getIslandRunIslandClearDice(island), 'base dice');
        assertEqual(JSON.stringify(getIslandRunBossReward(island, { cycleIndex: 0 })), JSON.stringify(reward), 'cycle 0 explicit matches default');
      }
    },
  },
  {
    name: 'drift voyage: every replayed island carries a current; neighbours and voyages differ',
    run: () => {
      for (const cycle of [1, 2, 5]) {
        assert(isDriftVoyageCycle(cycle), `cycle ${cycle} is a Drift Voyage`);
        for (let island = 1; island <= 120; island += 1) {
          const current = resolveDriftCurrent(cycle, island);
          assert(current !== null, `current on ${cycle}:${island}`);
          assert(current!.id !== resolveDriftCurrent(cycle, island + 1)!.id, `neighbours differ at ${island}`);
        }
      }
      assert(resolveDriftCurrent(1, 10)!.id !== resolveDriftCurrent(2, 10)!.id, 'same island, new voyage, new current');
      const seen = new Set(Array.from({ length: 8 }, (_, i) => resolveDriftCurrent(1, i + 1)!.id));
      assertEqual(seen.size, DRIFT_CURRENTS.length, 'all currents appear early in a voyage');
    },
  },
  {
    name: 'drift voyage: the current bonus lands in the canonical boss reward',
    run: () => {
      for (let island = 1; island <= 120; island += 7) {
        const base = getIslandRunBossReward(island);
        const current = resolveDriftCurrent(1, island)!;
        const drift = getIslandRunBossReward(island, { cycleIndex: 1 });
        assertEqual(JSON.stringify(drift), JSON.stringify(applyDriftCurrentToReward(base, current)), `island ${island}`);
        assert(drift.dice >= base.dice && drift.essence >= base.essence && drift.spinTokens >= base.spinTokens, 'never smaller');
        assert(drift.dice + drift.essence + drift.spinTokens > base.dice + base.essence + base.spinTokens, 'always a real bonus');
      }
      const golden = DRIFT_CURRENTS.find((current) => current.id === 'golden-tide')!;
      assertEqual(applyDriftCurrentToReward({ dice: 50, essence: 105, spinTokens: 0 }, golden).essence, 158, 'essence ×1.5 rounded');
    },
  },
  {
    name: 'drift voyage: every boss-reward caller passes the canonical cycle',
    run: async () => {
      const board = await readSource('components/IslandRunBoardPrototype.tsx');
      assert(!/getBossReward\(islandNumber\)/.test(board), 'board reward displays include the cycle');
      assertEqual((board.match(/getBossReward\(islandNumber, \{ cycleIndex \}\)/g) ?? []).length, 5, 'all five board call sites');
      const arena = await readSource('services/islandRunCreatureArenaBattleAction.ts');
      assert(arena.includes('getIslandRunBossReward(options.islandNumber, { cycleIndex: current.cycleIndex })'), 'arena battle grant');
      const assembly = await readSource('services/islandRunSignatureMissionAction.ts');
      assert(assembly.includes('getIslandRunBossReward(FIRST_LIGHT_ASSEMBLY_ISLAND_NUMBER, { cycleIndex: state.cycleIndex })'), 'Island 001 assembly finale grant');
    },
  },
  {
    name: 'drift voyage: a new voyage is announced once on Island 1, with the Mega Museum teaser',
    run: async () => {
      assertEqual(resolveDriftVoyageIntro(0), null, 'no intro during the Great Drift');
      const first = resolveDriftVoyageIntro(1)!;
      assertEqual(first.voyageNumber, 1, 'Drift Voyage 1');
      assertEqual(first.title, 'The Great Drift is complete', 'first voyage title');
      assert(first.teaser.title.includes('Mega Museum'), 'Vol 2 teaser');
      assertEqual(resolveDriftVoyageIntro(3)!.title, 'Drift Voyage 2 is complete', 'later voyages');
      assert(getDriftVoyageIntroSeenKey(1) !== getDriftVoyageIntroSeenKey(2), 'seen once per voyage');
      assertEqual(resolveTravelInterludePlan({ fromIslandNumber: 120, toIslandNumber: 1, reducedMotion: false }).caption, DRIFT_VOYAGE_COMPLETION_CAPTION, 'the trip home has its own caption');
      const board = await readSource('components/IslandRunBoardPrototype.tsx');
      assert(board.includes('getDriftVoyageIntroSeenKey(cycleIndex)') && board.includes('<DriftVoyageIntroModal'), 'board shows the intro');
      const modal = await readSource('components/DriftVoyageIntroModal.tsx');
      assert(modal.includes('createPortal(') && modal.includes('useControllerShopScrollLock()'), 'portal + scroll lock');
      assert(!/islandRunStateActions|persistIslandRunRuntimeStatePatch|commitIslandRunState/.test(modal), 'presentation only');
    },
  },
];
