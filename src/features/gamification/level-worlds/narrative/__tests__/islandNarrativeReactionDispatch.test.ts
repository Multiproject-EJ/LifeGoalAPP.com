// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { assert, assertEqual, type TestCase } from '../../services/__tests__/testHarness';
import {
  type IslandNarrativeReactionSnapshot,
  buildExpeditionPhoneTransmission,
  buildReactionDialogue,
  buildReactionToast,
  diffIslandNarrativeReactionTriggers,
  resolveReactionBeat,
} from '../islandNarrativeReactionDispatch';
import { getIslandNarrativeDefinition } from '../islandNarrativeRegistry';
import type { IslandNarrativeTrigger } from '../islandNarrativeTypes';

const hookPath = 'src/features/gamification/level-worlds/narrative/useIslandNarrativeOpeningFlow.ts';
const boardPath = 'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx';
const dispatchPath = 'src/features/gamification/level-worlds/narrative/islandNarrativeReactionDispatch.ts';
const expeditionPhonePath = 'src/features/gamification/level-worlds/narrative/components/ExpeditionPhoneTransmission.tsx';
const concordFirstContactPath = 'src/features/gamification/level-worlds/narrative/components/ConcordFirstContactTransmission.tsx';
const hookSource = readFileSync(hookPath, 'utf8');
const boardSource = readFileSync(boardPath, 'utf8');
const dispatchSource = readFileSync(dispatchPath, 'utf8');
const expeditionPhoneSource = readFileSync(expeditionPhonePath, 'utf8');
const concordFirstContactSource = readFileSync(concordFirstContactPath, 'utf8');

function assertIncludes(source: string, expected: string, message: string) {
  assert(source.includes(expected), message);
}

function snapshot(overrides: Partial<IslandNarrativeReactionSnapshot> = {}): IslandNarrativeReactionSnapshot {
  return {
    activeStopId: null,
    completedStopIds: [],
    landmarkBuildLevels: [0, 0, 0, 0, 0],
    bossChallengeActive: false,
    bossChallengeMidpoint: false,
    bossEligible: false,
    technologyFragmentCount: 0,
    ...overrides,
  };
}

function kinds(triggers: IslandNarrativeTrigger[]): string[] {
  return triggers.map((t) => t.kind);
}

const definition = getIslandNarrativeDefinition(1) ?? null;

export const islandNarrativeReactionDispatchTests: TestCase[] = [
  {
    name: 'first diplomatic-technology fragment emits one canonical trigger',
    run: () => {
      const triggers = diffIslandNarrativeReactionTriggers(
        snapshot({ technologyFragmentCount: 0 }),
        snapshot({ technologyFragmentCount: 1 }),
        1,
      );
      const fragmentTrigger = triggers.find((trigger) => trigger.kind === 'technology_fragment_collected');
      assert(!!fragmentTrigger, 'first fragment trigger emitted');
      assertEqual((fragmentTrigger as { technologyId: string }).technologyId, 'the-concord', 'Island 1 uses the Concord technology id');
      assertEqual((fragmentTrigger as { collectedCount: number }).collectedCount, 1, 'first fragment count retained');
      assertEqual(resolveReactionBeat(fragmentTrigger!, 1, definition)?.id, 'I001-B31', 'first fragment resolves to the Central Command beat');
    },
  },
  {
    name: 'ninth Concord fragment resolves the authored first-contact call',
    run: () => {
      const triggers = diffIslandNarrativeReactionTriggers(
        snapshot({ technologyFragmentCount: 8 }),
        snapshot({ technologyFragmentCount: 9 }),
        1,
      );
      const fragmentTrigger = triggers.find((trigger) => trigger.kind === 'technology_fragment_collected');
      const beat = fragmentTrigger ? resolveReactionBeat(fragmentTrigger, 1, definition) : null;
      assertEqual(beat?.id, 'I001-B32', 'ninth fragment resolves to first contact');
      const dialogue = beat ? buildReactionDialogue(beat, definition) : null;
      assertEqual(dialogue?.speakerName, 'Caretaker', 'first translated voice is the Caretaker');
      assertEqual(dialogue?.headline, 'FIRST CONTACT', 'call owns its display heading');
      assertEqual(dialogue?.objectiveText, 'Restore the five lights of Luma Isle', 'call explains the new purpose');
    },
  },
  {
    name: 'hydration baseline (prev null) emits nothing',
    run: () => assertEqual(diffIslandNarrativeReactionTriggers(null, snapshot({ activeStopId: 'habit' }), 1).length, 0, 'Baseline must not replay'),
  },
  {
    name: 'stop_opened fires on a canonical active-stop change only',
    run: () => {
      assertEqual(kinds(diffIslandNarrativeReactionTriggers(snapshot(), snapshot({ activeStopId: 'habit' }), 1)).join(','), 'stop_opened', 'habit open fires');
      assertEqual(diffIslandNarrativeReactionTriggers(snapshot({ activeStopId: 'habit' }), snapshot({ activeStopId: 'habit' }), 1).length, 0, 'unchanged stop does not fire');
      assertEqual(diffIslandNarrativeReactionTriggers(snapshot({ activeStopId: 'habit' }), snapshot({ activeStopId: null }), 1).length, 0, 'closing to null does not fire');
    },
  },
  {
    name: 'stop_completed fires only for newly completed stops',
    run: () => {
      const triggers = diffIslandNarrativeReactionTriggers(snapshot({ completedStopIds: ['hatchery'] }), snapshot({ completedStopIds: ['hatchery', 'habit'] }), 1);
      assertEqual(triggers.length, 1, 'one new completion');
      assertEqual((triggers[0] as { stopId: string }).stopId, 'habit', 'habit completed');
    },
  },
  {
    name: 'landmark_level_completed fires once per crossed level',
    run: () => {
      const triggers = diffIslandNarrativeReactionTriggers(snapshot(), snapshot({ landmarkBuildLevels: [0, 2, 0, 0, 0] }), 1);
      const levels = triggers.filter((t) => t.kind === 'landmark_level_completed').map((t) => (t as { level: number }).level);
      assertEqual(levels.join(','), '1,2', 'habit 0->2 crosses L1 and L2');
    },
  },
  {
    name: 'majority fires with the exact new L3 count when it rises',
    run: () => {
      const triggers = diffIslandNarrativeReactionTriggers(snapshot({ landmarkBuildLevels: [3, 3, 0, 0, 0] }), snapshot({ landmarkBuildLevels: [3, 3, 3, 0, 0] }), 1);
      const majority = triggers.find((t) => t.kind === 'landmarks_restored_majority') as { threshold: number } | undefined;
      assert(!!majority, 'majority fired');
      assertEqual(majority?.threshold, 3, 'threshold equals the new L3 count');
    },
  },
  {
    name: 'boss_challenge_started fires on false -> true only',
    run: () => {
      assertEqual(kinds(diffIslandNarrativeReactionTriggers(snapshot(), snapshot({ bossChallengeActive: true }), 1)).includes('boss_challenge_started'), true, 'fires on activation');
      assertEqual(diffIslandNarrativeReactionTriggers(snapshot({ bossChallengeActive: true }), snapshot({ bossChallengeActive: true }), 1).length, 0, 'no refire while active');
    },
  },
  {
    name: 'boss_eligible fires once when the boss becomes challengeable',
    run: () => {
      assertEqual(kinds(diffIslandNarrativeReactionTriggers(snapshot(), snapshot({ bossEligible: true }), 1)).includes('boss_eligible'), true, 'fires on eligibility');
      assertEqual(diffIslandNarrativeReactionTriggers(snapshot({ bossEligible: true }), snapshot({ bossEligible: true }), 1).length, 0, 'no refire while eligible');
    },
  },
  {
    name: 'boss_midpoint fires once when the trial reaches halfway',
    run: () => {
      const before = snapshot({ bossChallengeActive: true, bossChallengeMidpoint: false });
      const at = snapshot({ bossChallengeActive: true, bossChallengeMidpoint: true });
      assertEqual(kinds(diffIslandNarrativeReactionTriggers(before, at, 1)).includes('boss_midpoint'), true, 'fires at midpoint');
      assertEqual(diffIslandNarrativeReactionTriggers(at, at, 1).length, 0, 'no refire after midpoint');
      assertEqual(resolveReactionBeat({ kind: 'boss_midpoint', islandNumber: 1 }, 1, definition)?.id, 'I001-B28', 'boss midpoint -> B28');
    },
  },
  {
    name: 'resolveReactionBeat maps authored triggers and excludes legacy-owned beats',
    run: () => {
      assertEqual(resolveReactionBeat({ kind: 'stop_opened', islandNumber: 1, stopId: 'habit' }, 1, definition)?.id, 'I001-B09', 'habit open -> B09');
      assertEqual(resolveReactionBeat({ kind: 'stop_completed', islandNumber: 1, stopId: 'wisdom' }, 1, definition)?.id, 'I001-B20', 'wisdom complete -> B20');
      assertEqual(resolveReactionBeat({ kind: 'landmark_level_completed', islandNumber: 1, stopId: 'hatchery', level: 2 }, 1, definition)?.id, 'I001-B07', 'hatchery L2 -> B07');
      assertEqual(resolveReactionBeat({ kind: 'landmarks_restored_majority', islandNumber: 1, threshold: 3 }, 1, definition)?.id, 'I001-B25', 'majority -> B25');
      assertEqual(resolveReactionBeat({ kind: 'boss_challenge_started', islandNumber: 1 }, 1, definition)?.id, 'I001-B27', 'boss start -> B27');
      assert(resolveReactionBeat({ kind: 'stop_opened', islandNumber: 1, stopId: 'hatchery' }, 1, definition) === null, 'hatchery open is legacy (B04) — excluded');
      assert(resolveReactionBeat({ kind: 'landmark_level_completed', islandNumber: 1, stopId: 'hatchery', level: 1 }, 1, definition) === null, 'hatchery L1 is legacy (B24) — excluded');
      assert(resolveReactionBeat({ kind: 'landmarks_restored_majority', islandNumber: 1, threshold: 4 }, 1, definition) === null, 'no beat authored for threshold 4');
    },
  },
  {
    name: 'surface payloads derive speaker, tone, and copy from content',
    run: () => {
      const b09 = resolveReactionBeat({ kind: 'stop_opened', islandNumber: 1, stopId: 'habit' }, 1, definition)!;
      const dialogue = buildReactionDialogue(b09, definition)!;
      assertEqual(dialogue.speakerName, 'Miri', 'B09 speaker resolves to Miri');
      assertEqual(dialogue.tone, 'standard', 'Miri tone is standard');
      const b20 = resolveReactionBeat({ kind: 'stop_completed', islandNumber: 1, stopId: 'wisdom' }, 1, definition)!;
      const reveal = buildReactionDialogue(b20, definition)!;
      assertEqual(reveal.speakerName, 'Elder Sava', 'B20 speaker resolves to Elder Sava');
      assertEqual(reveal.tone, 'wisdom', 'Sava tone is wisdom');
      assertEqual(reveal.secondaryText, 'Aim to free her, not to fight her.', 'B20 carries the reveal framing');
      const b05 = resolveReactionBeat({ kind: 'stop_completed', islandNumber: 1, stopId: 'hatchery' }, 1, definition)!;
      const toast = buildReactionToast(b05, definition)!;
      assertEqual(toast.speakerName, 'Miri', 'B05 toast speaker resolves to Miri');
      assert(toast.text.length > 0, 'B05 toast has copy');
      assertEqual(buildReactionToast(b09, definition), null, 'A dialogue beat does not build a toast');
      const b31 = resolveReactionBeat({
        kind: 'technology_fragment_collected',
        islandNumber: 1,
        technologyId: 'the-concord',
        collectedCount: 1,
      }, 1, definition)!;
      const transmission = buildExpeditionPhoneTransmission(b31, definition)!;
      assertEqual(transmission.sourceLabel, 'Central Command', 'Phone transmission resolves its command source');
      assertEqual(transmission.headline, 'DIPLOMATIC EFFORT', 'Phone transmission keeps its mission heading');
      assertEqual(transmission.ctaLabel, 'Activate island', 'Phone transmission keeps its acknowledgement label');
    },
  },
  {
    name: 'dispatch module is UI/gameplay/persistence free at runtime',
    run: () => {
      // Only a type-only import of the dialogue tone is allowed.
      assertIncludes(dispatchSource, "import type { IslandNarrativeDialogueTone }", 'tone import must be type-only');
      ['islandRunStateActions', 'persistIslandRunRuntimeStatePatch', 'commitIslandRunState', "from 'react'", 'localStorage'].forEach((needle) =>
        assert(!dispatchSource.includes(needle), `dispatch must not include ${needle}`),
      );
    },
  },
  {
    name: 'Expedition Phone uses the approved clamshell-unflip-then-expand presentation assets',
    run: () => {
      assertIncludes(expeditionPhoneSource, 'const UNFOLD_DURATION_MS = 2450', 'Phone keeps the authored fast-unflip/extension/snap-zoom timing');
      assertIncludes(expeditionPhoneSource, '/tech/ExpeditionPhone_v19_folded.webp', 'Phone uses the compact folded clamshell state');
      assertIncludes(expeditionPhoneSource, '/tech/ExpeditionPhone_v21_opening.webp', 'Phone uses the optimized fast-unflip-height-extension-then-snap-zoom animation');
      assertIncludes(expeditionPhoneSource, '/tech/ExpeditionPhone_v11_open_front.webp', 'Phone hands off to the readable open shell');
      assertIncludes(expeditionPhoneSource, '<h2>Incoming message</h2>', 'Automatic delivery waits at the Bip incoming-message prompt');
      assertIncludes(expeditionPhoneSource, '>\n            Read\n          </button>', 'Read is the explicit automatic-flow opening action');
      assert(!expeditionPhoneSource.includes('persistIslandRunRuntimeStatePatch'), 'Phone presentation must not write gameplay state');
    },
  },
  {
    name: 'hook drives reactions through the pure dispatch and a separate queue',
    run: () => {
      assertIncludes(hookSource, 'diffIslandNarrativeReactionTriggers(previous, nextSnapshot, currentIslandNumber)', 'Hook should diff snapshots');
      assertIncludes(hookSource, 'resolveReactionBeat(trigger, currentIslandNumber)', 'Hook should resolve beats from content');
      assertIncludes(hookSource, 'previousReactionSnapshotRef.current = nextSnapshot', 'Hook should track a snapshot baseline');
      assertIncludes(hookSource, 'if (activeDialogue || activeToast || queue.length > 0) return;', 'Reactions must yield to legacy surfaces and queue');
    },
  },
  {
    name: 'board feeds canonical signals and renders reaction surfaces',
    run: () => {
      assertIncludes(boardSource, 'landmarkBuildLevels: islandArtLandmarkBuildLevels', 'Board feeds per-stop build levels');
      assertIncludes(boardSource, 'completedStopIds: completedStops', 'Board feeds completed stops');
      assertIncludes(boardSource, "bossChallengeActive: bossTrialPhase === 'in_progress'", 'Board feeds boss-trial-active');
      assertIncludes(boardSource, 'islandNarrativeOpeningFlow.activeReactionDialogue', 'Board renders reaction dialogue');
      assertIncludes(boardSource, 'islandNarrativeOpeningFlow.activeReactionToast', 'Board renders reaction toast');
      assertIncludes(boardSource, 'technologyFragmentCount: narrativeTechnologyFragmentCount', 'Board feeds the hydrated canonical fragment count');
      assertIncludes(boardSource, 'islandNarrativeOpeningFlow.activeExpeditionTransmission', 'Board renders the Expedition Phone transmission');
    },
  },
  {
    name: 'active unseen Concord recovers first contact and uses the dedicated call screen',
    run: () => {
      assertIncludes(hookSource, "!isConcordActive || isSeen('I001-B32')", 'Hydration recovery is capability- and seen-ledger-gated');
      assertIncludes(boardSource, "activeReactionDialogue?.beatId === 'I001-B32'", 'Board recognizes the first-contact reaction');
      assertIncludes(boardSource, '<ConcordFirstContactTransmission', 'Board renders the dedicated call screen');
      assertIncludes(concordFirstContactSource, 'LIVE TRANSLATION', 'Call screen clearly communicates translated contact');
      assertIncludes(concordFirstContactSource, 'lockPageScroll', 'Call screen follows the modal viewport contract');
    },
  },
  {
    name: 'board feeds the boss midpoint signal',
    run: () => assertIncludes(boardSource, 'bossChallengeMidpoint:', 'Board computes/feeds the boss midpoint signal'),
  },
  {
    name: 'boss-framing toasts may overlay an in-progress boss trial only',
    run: () => {
      assertIncludes(hookSource, 'const toastOverlayDuringBoss = Boolean(bossChallengeActive)', 'Toast overlay is gated to the boss trial');
      assertIncludes(hookSource, "id !== 'I001-B27' && id !== 'I001-B28'", 'Stale boss-framing beats are dropped after the trial');
    },
  },
];
