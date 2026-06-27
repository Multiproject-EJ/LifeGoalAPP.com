// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { assert, assertEqual, type TestCase } from '../../services/__tests__/testHarness';
import {
  createEmptyIslandNarrativeSeenState,
  isIslandNarrativeSeenStateEqual,
  mergeIslandNarrativeSeenState,
  sanitizeIslandNarrativeSeenState,
} from '../islandNarrativeSeenState';

const hookPath = 'src/features/gamification/level-worlds/narrative/useIslandNarrativeOpeningFlow.ts';
const boardPath = 'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx';
const storePath = 'src/features/gamification/level-worlds/services/islandRunGameStateStore.ts';
const actionsPath = 'src/features/gamification/level-worlds/services/islandRunStateActions.ts';
const hookSource = readFileSync(hookPath, 'utf8');
const boardSource = readFileSync(boardPath, 'utf8');
const storeSource = readFileSync(storePath, 'utf8');
const actionsSource = readFileSync(actionsPath, 'utf8');

function assertIncludes(source: string, expected: string, message: string) {
  assert(source.includes(expected), message);
}

export const islandNarrativeSeenStateTests: TestCase[] = [
  {
    name: 'empty ledger is a stable fresh shape',
    run: () => assertEqual(JSON.stringify(createEmptyIslandNarrativeSeenState()), JSON.stringify({ beats: {}, episodes: {} }), 'Expected empty ledger'),
  },
  {
    name: 'sanitize drops non-numeric and non-object inputs',
    run: () => {
      assertEqual(JSON.stringify(sanitizeIslandNarrativeSeenState(null)), JSON.stringify({ beats: {}, episodes: {} }), 'null -> empty');
      assertEqual(JSON.stringify(sanitizeIslandNarrativeSeenState([1, 2])), JSON.stringify({ beats: {}, episodes: {} }), 'array -> empty');
      const cleaned = sanitizeIslandNarrativeSeenState({ beats: { 'I001-B02': 5, bad: 'x', nan: Number.NaN }, episodes: { e1: 9 } });
      assertEqual(JSON.stringify(cleaned), JSON.stringify({ beats: { 'I001-B02': 5 }, episodes: { e1: 9 } }), 'Non-finite/non-number values are dropped');
    },
  },
  {
    name: 'merge unions keys and keeps the most-recent timestamp',
    run: () => {
      const merged = mergeIslandNarrativeSeenState(
        { beats: { a: 10, b: 50 }, episodes: { e: 1 } },
        { beats: { b: 20, c: 30 }, episodes: { f: 2 } },
      );
      assertEqual(merged.beats.a, 10, 'a carried from left');
      assertEqual(merged.beats.b, 50, 'b keeps max(50,20)');
      assertEqual(merged.beats.c, 30, 'c carried from right');
      assertEqual(merged.episodes.e, 1, 'episode e from left');
      assertEqual(merged.episodes.f, 2, 'episode f from right');
    },
  },
  {
    name: 'merge tolerates null/undefined sides',
    run: () => {
      assertEqual(JSON.stringify(mergeIslandNarrativeSeenState(null, undefined)), JSON.stringify({ beats: {}, episodes: {} }), 'both empty');
      assertEqual(JSON.stringify(mergeIslandNarrativeSeenState({ beats: { a: 1 }, episodes: {} }, null)), JSON.stringify({ beats: { a: 1 }, episodes: {} }), 'left only');
    },
  },
  {
    name: 'equality is order-independent and content-sensitive',
    run: () => {
      assert(isIslandNarrativeSeenStateEqual({ beats: { a: 1, b: 2 }, episodes: {} }, { beats: { b: 2, a: 1 }, episodes: {} }), 'Same content, different order is equal');
      assert(!isIslandNarrativeSeenStateEqual({ beats: { a: 1 }, episodes: {} }, { beats: { a: 2 }, episodes: {} }), 'Different timestamp is unequal');
      assert(!isIslandNarrativeSeenStateEqual({ beats: { a: 1 }, episodes: {} }, { beats: { a: 1, b: 1 }, episodes: {} }), 'Extra key is unequal');
    },
  },
  {
    name: 'hook accepts the canonical ledger and mirrors seen beats outward',
    run: () => {
      assertIncludes(hookSource, 'persistedNarrativeSeenState', 'Hook should accept the canonical seen-ledger input');
      assertIncludes(hookSource, 'onPersistNarrativeSeen?.(next)', 'markSeen should mirror to the canonical record');
      assertIncludes(hookSource, 'mergeIslandNarrativeSeenState(seenStateRef.current, persistedNarrativeSeenState)', 'Hook should union the canonical ledger into local');
    },
  },
  {
    name: 'hook stays free of gameplay mutation services (callback-prop pattern)',
    run: () => ['islandRunStateActions', 'persistIslandRunRuntimeStatePatch', 'applyNarrativeSeenStateMarker'].forEach((needle) =>
      assert(!hookSource.includes(needle), `Hook must persist via callback prop, not ${needle}`),
    ),
  },
  {
    name: 'board wires cross-device persistence through the canonical action',
    run: () => {
      assertIncludes(boardSource, 'applyNarrativeSeenStateMarker', 'Board should persist via the canonical action');
      assertIncludes(boardSource, 'persistedNarrativeSeenState: runtimeState.narrativeSeenState', 'Board should feed the canonical ledger to the hook');
      assertIncludes(boardSource, 'onPersistNarrativeSeen: handlePersistNarrativeSeen', 'Board should wire the persist callback');
    },
  },
  {
    name: 'canonical record persists the narrative seen-ledger column',
    run: () => {
      assertIncludes(storeSource, 'narrativeSeenState: IslandNarrativeSeenState;', 'Record type should include the ledger');
      assertIncludes(storeSource, 'narrative_seen_state: record.narrativeSeenState', 'Serialize should write the column');
      assertIncludes(storeSource, 'mergeIslandNarrativeSeenState(remote.narrativeSeenState, local.narrativeSeenState)', 'Remote+local hydration should union the ledger');
      assertIncludes(storeSource, ',narrative_seen_state,', 'Select projection should include the column');
    },
  },
  {
    name: 'canonical action unions and short-circuits no-op writes',
    run: () => {
      assertIncludes(actionsSource, 'export function applyNarrativeSeenStateMarker', 'Action should exist');
      assertIncludes(actionsSource, 'isIslandNarrativeSeenStateEqual(current.narrativeSeenState, merged)', 'Action should skip no-op writes');
      assertIncludes(actionsSource, "triggerSource: triggerSource ?? 'apply_narrative_seen_state_marker'", 'Action should tag its trigger source');
    },
  },
];
