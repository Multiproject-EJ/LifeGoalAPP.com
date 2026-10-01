import { assert, assertEqual, type TestCase } from './testHarness';
import { ISLAND_AFFIRMATIONS, getIslandAffirmationVisitKey, resolveIslandAffirmation } from '../islandAffirmations';

export const islandAffirmationsTests: TestCase[] = [
  {
    name: 'island affirmations: Island 001 opens with the signature line; every island gets a stable, varied affirmation',
    run: () => {
      assertEqual(resolveIslandAffirmation(1, 0), 'Where others see barren land, you see possibilities!', 'signature line');
      const seen = new Set<string>();
      for (let island = 1; island <= 120; island += 1) {
        const text = resolveIslandAffirmation(island, 0);
        assert(ISLAND_AFFIRMATIONS.includes(text), `Island ${island} uses the pool`);
        assertEqual(resolveIslandAffirmation(island, 0), text, 'stable per island');
        if (island > 1) assert(text !== resolveIslandAffirmation(island - 1, 0), `Island ${island} differs from the island before`);
        seen.add(text);
      }
      assert(seen.size >= ISLAND_AFFIRMATIONS.length - 1, 'the whole pool is used across the archipelago');
      assertEqual(resolveIslandAffirmation(Number.NaN, Number.NaN), ISLAND_AFFIRMATIONS[0], 'invalid input is safe');
      assertEqual(getIslandAffirmationVisitKey(5, 1), '1:5', 'once per island visit');
    },
  },
  {
    name: 'island affirmations: shown after the controller lands, before the mission message',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('if (controllerLandedIslandNumber !== islandNumber || hideControllerForPresentation || doesModalOwnAttention) return;'), 'waits for the landing');
      assert(board.includes('|| islandAffirmation !== null,'), 'the mission message waits for the affirmation');
    },
  },
];
