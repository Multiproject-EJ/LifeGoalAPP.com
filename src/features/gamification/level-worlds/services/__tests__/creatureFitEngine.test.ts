import { CREATURE_CATALOG } from '../creatureCatalog';
import {
  computeCreatureFitScore,
  DEFAULT_CREATURE_FIT_CONFIG,
  rankCreatureFitsForPlayer,
  selectPerfectCompanions,
  type PlayerHandContext,
} from '../creatureFitEngine';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

const sampleContext: PlayerHandContext = {
  dominantArchetypeIds: ['visionary', 'explorer'],
  secondaryArchetypeIds: ['guardian'],
  supportArchetypeIds: ['architect'],
  weaknessTags: ['stress_fragility', 'decision_confusion'],
  preferredShipZones: ['cosmic'],
};

export const creatureFitEngineTests: TestCase[] = [
  {
    name: 'computeCreatureFitScore returns bounded weighted score and reason fields',
    run: () => {
      const creature = CREATURE_CATALOG.find((entry) => entry.id === 'rare-nebula-wisp');
      assert(Boolean(creature), 'Expected fixture creature rare-nebula-wisp');
      const result = computeCreatureFitScore(creature!, sampleContext, DEFAULT_CREATURE_FIT_CONFIG);
      assert(result.score >= 0 && result.score <= 100, 'Expected bounded score range');
      assert(Array.isArray(result.matchedArchetypes), 'Expected matched archetypes array');
      assert(Array.isArray(result.matchedWeaknessTags), 'Expected matched weakness tags array');
      assertEqual(result.creatureId, 'rare-nebula-wisp', 'Expected score result to reference scored creature id');
    },
  },
  {
    name: 'rankCreatureFitsForPlayer sorts descending and deterministic by id tie-break',
    run: () => {
      const rankedFirst = rankCreatureFitsForPlayer(CREATURE_CATALOG, sampleContext);
      const rankedSecond = rankCreatureFitsForPlayer(CREATURE_CATALOG, sampleContext);
      assertEqual(rankedFirst.length, 45, 'Expected ranking for all catalog creatures');
      assertDeepEqual(
        rankedFirst.map((entry) => entry.creatureId),
        rankedSecond.map((entry) => entry.creatureId),
        'Expected deterministic ranking order for identical inputs',
      );
      for (let i = 1; i < rankedFirst.length; i += 1) {
        assert(
          rankedFirst[i - 1].score >= rankedFirst[i].score,
          'Expected descending score order across ranking results',
        );
      }
    },
  },
  {
    name: 'selectPerfectCompanions enforces max 3, determinism, and unique picks',
    run: () => {
      const ranked = rankCreatureFitsForPlayer(CREATURE_CATALOG, sampleContext);
      const seedContext = { userId: 'user-123', cycleIndex: 2, islandNumber: 17 };
      const first = selectPerfectCompanions(ranked, 3, seedContext);
      const second = selectPerfectCompanions(ranked, 3, seedContext);
      assertEqual(first.length, 3, 'Expected max 3 perfect companions');
      assertDeepEqual(first, second, 'Expected deterministic perfect companion selection');
      const uniqueIds = new Set(first.map((entry) => entry.creatureId));
      assertEqual(uniqueIds.size, first.length, 'Expected unique companion picks');
    },
  },
  {
    name: 'selectPerfectCompanions clamps invalid maxCount into safe range',
    run: () => {
      const ranked = rankCreatureFitsForPlayer(CREATURE_CATALOG, sampleContext);
      const seedContext = { userId: 'user-123', cycleIndex: 2, islandNumber: 17 };
      const low = selectPerfectCompanions(ranked, 0, seedContext);
      const high = selectPerfectCompanions(ranked, 99, seedContext);
      assertEqual(low.length, 0, 'Expected non-positive maxCount to produce empty selection');
      assertEqual(high.length, 3, 'Expected maxCount to clamp at 3 companions');
    },
  },
];
