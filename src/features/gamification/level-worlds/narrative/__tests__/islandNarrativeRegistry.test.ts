// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { assert, assertEqual, type TestCase } from '../../services/__tests__/testHarness';
import {
  getAllIslandNarrativeDefinitions,
  getIslandNarrativeDefinition,
  getRegisteredNarrativeIslandNumbers,
} from '../islandNarrativeRegistry';
import {
  REACTION_EXCLUDED_BEAT_IDS,
  islandHasReactionBeats,
  resolveReactionBeat,
} from '../islandNarrativeReactionDispatch';
import { validateIslandNarrativeDefinition } from '../islandNarrativeValidation';

const hookPath = 'src/features/gamification/level-worlds/narrative/useIslandNarrativeOpeningFlow.ts';
const hookSource = readFileSync(hookPath, 'utf8');

export const islandNarrativeRegistryTests: TestCase[] = [
  {
    name: 'registry enumerates islands with authored narrative content',
    run: () => {
      const islands = getRegisteredNarrativeIslandNumbers();
      assert(islands.includes(1), 'Island 1 is registered');
      assertEqual(getAllIslandNarrativeDefinitions().length, islands.length, 'definitions match island count');
    },
  },
  {
    name: 'every registered narrative definition passes validation',
    run: () => getAllIslandNarrativeDefinitions().forEach((definition) => {
      const result = validateIslandNarrativeDefinition(definition);
      assert(result.valid, `Island ${definition.islandNumber} invalid: ${result.errors.join('; ')}`);
    }),
  },
  {
    name: 'islandHasReactionBeats is content-driven (true for islands with reaction beats)',
    run: () => {
      assert(islandHasReactionBeats(1), 'Island 1 has reaction beats');
      assert(!islandHasReactionBeats(999), 'Unregistered island has none');
      // A definition with only legacy-owned beats reports no reaction beats.
      const legacyOnly = {
        ...getIslandNarrativeDefinition(1)!,
        beats: getIslandNarrativeDefinition(1)!.beats.filter((beat) => REACTION_EXCLUDED_BEAT_IDS.has(beat.id)),
      };
      assert(!islandHasReactionBeats(1, legacyOnly), 'Legacy-only definition has no reaction beats');
    },
  },
  {
    name: 'every reaction beat round-trips through the dispatch, and legacy beats do not',
    run: () => getAllIslandNarrativeDefinitions().forEach((definition) => {
      for (const beat of definition.beats) {
        const resolved = resolveReactionBeat(beat.trigger, definition.islandNumber, definition);
        if (REACTION_EXCLUDED_BEAT_IDS.has(beat.id)) {
          assert(resolved?.id !== beat.id, `${beat.id} is legacy-owned and must not reaction-resolve`);
        } else {
          assertEqual(resolved?.id, beat.id, `${beat.id} must resolve to itself from its own trigger`);
        }
      }
    }),
  },
  {
    name: 'reaction layer is gated on content, legacy flow stays Island 1 only',
    run: () => {
      assert(hookSource.includes('islandHasReactionBeats(currentIslandNumber)'), 'Reaction eligibility is content-driven');
      assert(hookSource.includes('const reactionEligible ='), 'Hook derives reactionEligible');
      assert(hookSource.includes('isEligibleForIsland001OpeningFlow(currentIslandNumber, cycleIndex)'), 'Legacy opening flow stays Island 1 scoped');
    },
  },
];
