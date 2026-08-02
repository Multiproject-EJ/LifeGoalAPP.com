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
import {
  ISLAND_NARRATIVE_TRACK_COPY,
  getNarrativeBeatForPlayback,
  listNarrativeBeatsForPlayback,
} from '../islandNarrativeTrack';

const hookPath = 'src/features/gamification/level-worlds/narrative/useIslandNarrativeOpeningFlow.ts';
const hookSource = readFileSync(hookPath, 'utf8');

export const islandNarrativeRegistryTests: TestCase[] = [
  {
    name: 'registry enumerates islands with authored narrative content',
    run: () => {
      const islands = getRegisteredNarrativeIslandNumbers();
      assert(islands.includes(1), 'Island 1 is registered');
      assert(!islands.includes(82), 'Island 82 recurring-villain payoff remains documentation-only');
      assert(!islands.includes(115), 'Late Memory/Perfect Memory concept remains documentation-only');
      assert(!islands.includes(117), 'Island 117 paradise concept remains documentation-only');
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
    name: 'all currently shipped gameplay beats are explicitly on the included Island Mission track',
    run: () => getAllIslandNarrativeDefinitions().forEach((definition) => {
      definition.beats.forEach((beat) => assertEqual(
        beat.track,
        'island_mission',
        `${beat.id} must remain available in the free main loop`,
      ));
    }),
  },
  {
    name: 'track vocabulary has stable player-facing names',
    run: () => {
      assertEqual(ISLAND_NARRATIVE_TRACK_COPY.island_mission.playerFacingName, 'Island Mission', 'Track 1 name');
      assertEqual(ISLAND_NARRATIVE_TRACK_COPY.full_story.playerFacingName, 'Full Story Mode', 'Track 2 name');
      assertEqual(ISLAND_NARRATIVE_TRACK_COPY.full_story.accessLabel, 'Pro', 'Track 2 access label');
    },
  },
  {
    name: 'game loop and Pro Story Mode remain separate playback contexts',
    run: () => {
      const source = getIslandNarrativeDefinition(1)!;
      const coreBeat = source.beats[0];
      const fullStoryBeat = { ...source.beats[1], id: 'I001-B99', track: 'full_story' as const };
      const mixed = { ...source, beats: [coreBeat, fullStoryBeat] };

      assertEqual(listNarrativeBeatsForPlayback(mixed, { context: 'game_loop', isPro: false }).map((beat) => beat.id).join(','), coreBeat.id, 'Free loop gets Track 1');
      assertEqual(listNarrativeBeatsForPlayback(mixed, { context: 'game_loop', isPro: true }).map((beat) => beat.id).join(','), coreBeat.id, 'Pro loop still gets Track 1, not duplicate full story');
      assertEqual(listNarrativeBeatsForPlayback(mixed, { context: 'story_mode', isPro: false }).length, 0, 'Free cannot play Track 2');
      assertEqual(listNarrativeBeatsForPlayback(mixed, { context: 'story_mode', isPro: true }).map((beat) => beat.id).join(','), fullStoryBeat.id, 'Pro Story Mode gets Track 2');
      assertEqual(getNarrativeBeatForPlayback(mixed, fullStoryBeat.id, { context: 'game_loop', isPro: true }), null, 'Track 2 never leaks into the game loop');
    },
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
      const fullStoryOnly = {
        ...getIslandNarrativeDefinition(1)!,
        beats: [{ ...getIslandNarrativeDefinition(1)!.beats.find((beat) => beat.id === 'I001-B09')!, track: 'full_story' as const }],
      };
      assert(!islandHasReactionBeats(1, fullStoryOnly), 'Full Story Mode beats never count as game-loop reactions');
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
