// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { assert, assertEqual, type TestCase } from '../../services/__tests__/testHarness';
import {
  getIslandNarrativeSeenStorageKey,
  isEligibleForIsland001OpeningFlow,
  parseIslandNarrativeSeenState,
} from '../useIslandNarrativeOpeningFlow';

const boardPath = 'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx';
const hookPath = 'src/features/gamification/level-worlds/narrative/useIslandNarrativeOpeningFlow.ts';
const definitionPath = 'src/features/gamification/level-worlds/narrative/definitions/island001Narrative.ts';
const boardSource = readFileSync(boardPath, 'utf8');
const hookSource = readFileSync(hookPath, 'utf8');
const definitionSource = readFileSync(definitionPath, 'utf8');

function assertIncludes(source: string, expected: string, message: string) {
  assert(source.includes(expected), message);
}

export const islandNarrativeOpeningFlowTests: TestCase[] = [
  { name: 'eligibility is canonical Island 1 first cycle only', run: () => { assert(isEligibleForIsland001OpeningFlow(1, 0), 'Island 1 cycle 0 should be eligible'); assert(!isEligibleForIsland001OpeningFlow(2, 0), 'Non-Island-1 should not be eligible'); assert(!isEligibleForIsland001OpeningFlow(1, 1), 'Later cycles should not auto-replay'); } },
  { name: 'user-specific local suppression key is used', run: () => assertEqual(getIslandNarrativeSeenStorageKey('user-1'), 'island_run_narrative_seen_v1_user-1_island_1', 'Expected aggregate key') },
  { name: 'anonymous suppression key fallback is stable', run: () => assertEqual(getIslandNarrativeSeenStorageKey(null), 'island_run_narrative_seen_v1_anonymous_island_1', 'Expected anonymous key') },
  { name: 'malformed JSON fails safely', run: () => assertEqual(JSON.stringify(parseIslandNarrativeSeenState('{bad json')), JSON.stringify({ beats: {}, episodes: {} }), 'Malformed JSON should produce empty state') },
  { name: 'localStorage failures are guarded', run: () => { assertIncludes(hookSource, 'try {\n    return parseIslandNarrativeSeenState', 'Read path should catch localStorage failures'); assertIncludes(hookSource, 'try {\n    window.localStorage.setItem', 'Write path should catch localStorage failures'); } },
  { name: 'only opening beats B02 B03 B04 are queued/displayed', run: () => { assertIncludes(hookSource, "type OpeningBeatId = 'I001-B02' | 'I001-B03' | 'I001-B04'", 'Opening hook should restrict beat IDs'); ['I001-B24', 'I001-B26', 'I001-B29', 'I001-B30'].forEach((id) => assert(!hookSource.includes(`'${id}'`), `Opening hook must not implement ${id}`)); } },
  { name: 'arrival uses Island 1 arrival manifest only', run: () => { assertIncludes(hookSource, "'/islands/001/story/arrival/manifest.json'", 'Expected arrival manifest'); assert(!hookSource.includes('/islands/001/story/resolution/manifest.json'), 'Resolution manifest must not be wired'); } },
  { name: 'global prologue key is not reused by opening suppression', run: () => assert(!hookSource.includes('island_run_story_seen_prologue'), 'Opening hook must not touch global prologue key') },
  { name: 'beat is marked seen on close/continue, not enqueue', run: () => { assertIncludes(hookSource, 'const markSeen = useCallback', 'Expected explicit markSeen callback'); assertIncludes(hookSource, 'handleStoryEpisodeClosed', 'Arrival close should mark seen'); assertIncludes(hookSource, 'handleDialogueContinue', 'Dialogue continue/close should mark seen'); assert(!hookSource.includes('markSeen(beatId)'), 'Enqueue should not mark arbitrary beat seen'); } },
  { name: 'arrival waits for global prologue and blocked surfaces', run: () => { assertIncludes(hookSource, 'isGlobalPrologueSeen || isGlobalPrologueActive', 'Arrival should wait for prologue completion'); assertIncludes(hookSource, 'isNarrativeSurfaceBlocked', 'Opening should gate on modal collisions'); } },
  { name: 'Hatchery trigger uses activeStopId transition only', run: () => { assertIncludes(hookSource, "activeStopId !== 'hatchery'", 'Expected active hatchery stop gate'); ['tileIndex', 'TOKEN_START_TILE_INDEX', 'STOP_TILE_INDICES_40', 'buildLevel'].forEach((needle) => assert(!hookSource.includes(needle), `Hatchery intro must not use ${needle}`)); } },
  { name: 'duplicate queue entries are suppressed', run: () => assertIncludes(hookSource, 'if (current.includes(beatId)) return current;', 'Expected duplicate queue guard') },
  { name: 'queue priority puts arrival before dialogue', run: () => assertIncludes(hookSource, "const QUEUE_PRIORITY: Record<OpeningBeatId, number> = { 'I001-B02': 0, 'I001-B03': 1, 'I001-B04': 2 }", 'Expected queue priority') },
  { name: 'board uses episode-specific StoryReader state', run: () => { assertIncludes(boardSource, 'ActiveIslandStoryEpisode', 'Board should use episode state'); assertIncludes(boardSource, "kind: 'global_prologue'", 'Global prologue episode should be explicit'); assertIncludes(hookSource, "kind: 'island_arrival'", 'Island arrival episode should be explicit'); } },
  { name: 'arrival receives no reward callback', run: () => assertIncludes(boardSource, "onRewardClaim={activeStoryEpisode?.kind === 'global_prologue' ? sanctuaryHandlers.storyRewardClaim : undefined}", 'Reward callback must be prologue-only') },
  { name: 'global prologue retains reward callback behavior', run: () => assertIncludes(boardSource, 'sanctuaryHandlers.storyRewardClaim', 'Global prologue reward callback should remain wired') },
  { name: 'dialogue copy renders through reusable component', run: () => { assertIncludes(boardSource, '<IslandNarrativeDialogue', 'Expected reusable dialogue component'); assertIncludes(definitionSource, 'Start small. Help us wake one gentle place.', 'Expected Miri copy'); assertIncludes(definitionSource, 'The Hatchery is quiet, not gone. Help me wake one cradle.', 'Expected Poko copy'); } },
  { name: 'board collision gate accounts for major owned modals', run: () => ['showBuildPanel', 'activeLaunchedMinigameId', 'showIslandClearCelebration', 'showMarketPanel', 'showShopPanel', 'showSanctuaryPanel', 'showRewardDetailsModal', 'bossTrialPhase', 'showTravelOverlay', 'dormantDoorMiniGame'].forEach((needle) => assertIncludes(boardSource, needle, `Collision gate missing ${needle}`)) },
  { name: 'no permanent narrative feature flag exists', run: () => { const combined = `${hookSource}\n${boardSource}\n${definitionSource}`; assert(!combined.includes('islandRunNarrativePilotEnabled'), 'No permanent narrative feature flag should exist'); } },
  { name: 'opening flow does not import gameplay mutation services', run: () => ['persistIslandRunRuntimeStatePatch', 'islandRunStateActions', 'islandRunRollAction', 'islandRunTileRewardAction', 'applyStopObjectiveProgress', 'applyBossTrialResolvedMarker', 'travelToNextIsland'].forEach((needle) => assert(!hookSource.includes(needle), `Hook must not import/call ${needle}`)) },
];
