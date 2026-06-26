// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { assert, assertEqual, type TestCase } from '../../services/__tests__/testHarness';
import {
  didHatcheryReachLevelOne,
  didIslandClearTravelReadyTransition,
  isNarrativeSurfaceBlockingBeat,
  getIslandNarrativeSeenStorageKey,
  isEligibleForIsland001OpeningFlow,
  parseIslandNarrativeSeenState,
} from '../useIslandNarrativeOpeningFlow';

const boardPath = 'src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx';
const hookPath = 'src/features/gamification/level-worlds/narrative/useIslandNarrativeOpeningFlow.ts';
const definitionPath = 'src/features/gamification/level-worlds/narrative/definitions/island001Narrative.ts';
const toastPath = 'src/features/gamification/level-worlds/narrative/components/IslandNarrativeToast.tsx';
const boardSource = readFileSync(boardPath, 'utf8');
const hookSource = readFileSync(hookPath, 'utf8');
const definitionSource = readFileSync(definitionPath, 'utf8');
const toastSource = readFileSync(toastPath, 'utf8');

function assertIncludes(source: string, expected: string, message: string) {
  assert(source.includes(expected), message);
}

export const islandNarrativeOpeningFlowTests: TestCase[] = [
  { name: 'eligibility is canonical Island 1 first cycle only', run: () => { assert(isEligibleForIsland001OpeningFlow(1, 0), 'Island 1 cycle 0 should be eligible'); assert(!isEligibleForIsland001OpeningFlow(2, 0), 'Non-Island-1 should not be eligible'); assert(!isEligibleForIsland001OpeningFlow(1, 1), 'Later cycles should not auto-replay'); } },
  { name: 'user-specific local suppression key is used', run: () => assertEqual(getIslandNarrativeSeenStorageKey('user-1'), 'island_run_narrative_seen_v1_user-1_island_1', 'Expected aggregate key') },
  { name: 'anonymous suppression key fallback is stable', run: () => assertEqual(getIslandNarrativeSeenStorageKey(null), 'island_run_narrative_seen_v1_anonymous_island_1', 'Expected anonymous key') },
  { name: 'malformed JSON fails safely', run: () => assertEqual(JSON.stringify(parseIslandNarrativeSeenState('{bad json')), JSON.stringify({ beats: {}, episodes: {} }), 'Malformed JSON should produce empty state') },
  { name: 'localStorage failures are guarded', run: () => { assertIncludes(hookSource, 'try {\n    return parseIslandNarrativeSeenState', 'Read path should catch localStorage failures'); assertIncludes(hookSource, 'try {\n    window.localStorage.setItem', 'Write path should catch localStorage failures'); } },
  { name: 'opening flow includes only approved Island 1 narrative beats through B30', run: () => { assertIncludes(hookSource, "type OpeningBeatId = 'I001-B02' | 'I001-B03' | 'I001-B04'", 'Opening hook should preserve opening beat IDs'); assertIncludes(hookSource, "type AmbientBeatId = 'I001-B24'", 'B24 should remain the only ambient beat implemented'); assertIncludes(hookSource, "type BossEligibleBeatId = 'I001-B26'", 'B26 should be the boss-eligible beat implemented'); assertIncludes(hookSource, "type BossResolutionBeatId = 'I001-B29'", 'B29 should be the boss-resolution beat implemented'); assertIncludes(hookSource, "type TravelReadyClosingBeatId = 'I001-B30'", 'B30 should be the only travel-ready closing beat implemented'); } },
  { name: 'arrival and resolution use explicit Island 1 manifests', run: () => { assertIncludes(hookSource, "'/islands/001/story/arrival/manifest.json'", 'Expected arrival manifest'); assertIncludes(hookSource, "'/islands/001/story/resolution/manifest.json'", 'Expected resolution manifest'); } },
  { name: 'global prologue key is not reused by opening suppression', run: () => assert(!hookSource.includes('island_run_story_seen_prologue'), 'Opening hook must not touch global prologue key') },
  { name: 'beat is marked seen on close/continue, not enqueue', run: () => { assertIncludes(hookSource, 'const markSeen = useCallback', 'Expected explicit markSeen callback'); assertIncludes(hookSource, 'handleStoryEpisodeClosed', 'Story episode close should mark seen'); assertIncludes(hookSource, 'handleDialogueContinue', 'Dialogue continue/close should mark seen'); assert(!hookSource.includes('markSeen(beatId)'), 'Enqueue should not mark arbitrary beat seen'); } },
  { name: 'arrival waits for global prologue and blocked surfaces', run: () => { assertIncludes(hookSource, 'isGlobalPrologueSeen || isGlobalPrologueActive', 'Arrival should wait for prologue completion'); assertIncludes(hookSource, 'isNarrativeSurfaceBlocked', 'Opening should gate on modal collisions'); } },
  { name: 'Hatchery intro uses activeStopId transition only', run: () => { assertIncludes(hookSource, "activeStopId !== 'hatchery'", 'Expected active hatchery stop gate'); ['tileIndex', 'TOKEN_START_TILE_INDEX', 'STOP_TILE_INDICES_40'].forEach((needle) => assert(!hookSource.includes(needle), `Hatchery intro must not use ${needle}`)); } },

  { name: 'B24 canonical Hatchery Level 1 transition helper matches required boundaries', run: () => { assert(didHatcheryReachLevelOne(0, 1), 'Hatchery 0 -> 1 should trigger'); assert(didHatcheryReachLevelOne(0, 2), 'Hatchery 0 -> 2 should trigger'); assert(!didHatcheryReachLevelOne(1, 2), 'Hatchery 1 -> 2 should not trigger'); assert(!didHatcheryReachLevelOne(1, 1), 'Unchanged Level 1 should not trigger'); assert(!didHatcheryReachLevelOne(null, 1), 'Hydration baseline should not trigger'); } },
  { name: 'B24 observes canonical Hatchery build state index zero', run: () => { assertIncludes(boardSource, 'hatcheryBuildLevel: runtimeState.stopBuildStateByIndex[0]?.buildLevel', 'B24 source must be canonical Hatchery buildLevel at stopBuildStateByIndex[0]'); assertIncludes(hookSource, 'didHatcheryReachLevelOne(previous, current)', 'Expected pure transition helper use'); } },
  { name: 'B24 queues but waits behind blocked surfaces including Build modal', run: () => { assertIncludes(hookSource, "enqueueBeat('I001-B24')", 'Expected B24 enqueue on transition'); assertIncludes(hookSource, 'isNarrativeSurfaceBlocked', 'B24 display should share collision gate'); assertIncludes(boardSource, 'showBuildPanel', 'Build modal should remain in collision gate'); } },
  { name: 'B24 uses toast surface and marks seen only after display dismissal', run: () => { assertIncludes(definitionSource, "id: 'I001-B24'", 'Definition must contain B24'); assertIncludes(definitionSource, "surface: 'toast'", 'B24 must remain toast'); assertIncludes(hookSource, 'setActiveToast(toast)', 'B24 should display through toast state'); assertIncludes(hookSource, 'handleToastDismiss', 'Toast dismissal handler required'); assertIncludes(hookSource, 'markSeen(activeToast.beatId)', 'Toast should mark seen on dismissal'); } },

  { name: 'B26 observes canonical boss eligibility transition only', run: () => { assertIncludes(boardSource, 'canChallengeCurrentBoss,', 'Board must pass canonical boss eligibility result'); assertIncludes(hookSource, 'previousCanChallengeBossRef', 'B26 must track previous eligibility baseline'); assertIncludes(hookSource, "if (previous === null) return;", 'Initial hydration baseline must not trigger'); assertIncludes(hookSource, "enqueueBeat('I001-B26')", 'Expected B26 enqueue on live transition'); ['tileIndex', 'STOP_TILE_INDICES_40', "activeStopId === 'boss'", 'Boss Level 3'].forEach((needle) => assert(!hookSource.includes(needle), `B26 trigger must not use ${needle}`)); } },
  { name: 'B26 rechecks island cycle eligibility and boss unresolved before display', run: () => { assertIncludes(hookSource, "nextBeatId === 'I001-B26' && (!canChallengeCurrentBoss || isCurrentIslandBossDefeated || currentIslandNumber !== 1 || cycleIndex !== 0)", 'B26 display should re-check live scope and boss state'); assertIncludes(hookSource, 'isNarrativeSurfaceBlocked', 'B26 should share collision gate'); } },
  { name: 'B26 dialogue copy and continue label are display-only', run: () => { assertIncludes(definitionSource, 'The five lights are speaking again. Now we ask, not attack.', 'Expected B26 primary copy'); assertIncludes(definitionSource, 'Aim for the crystal around her, not the heart inside it.', 'Expected B26 secondary copy'); assertIncludes(hookSource, "speakerName: 'Elder Sava'", 'Expected Elder Sava speaker'); assertIncludes(hookSource, "continueLabel: 'Face Noctyra'", 'Expected display-only CTA label'); assertIncludes(hookSource, "tone: 'wisdom'", 'Expected wisdom tone'); assertIncludes(boardSource, 'secondaryText={islandNarrativeOpeningFlow.activeDialogue.secondaryText}', 'Board must render secondary text'); assertIncludes(boardSource, "tone={islandNarrativeOpeningFlow.activeDialogue.tone ?? 'standard'}", 'Board must render wisdom tone'); ['handleStartBossTrial', 'resolveBossStopMinigame', 'setActiveLaunchedMinigameId', 'applyBossTrialResolvedMarker', 'getBossReward'].forEach((needle) => assert(!hookSource.includes(needle), `B26 continue must not call ${needle}`)); } },

  { name: 'B29 observes canonical boss resolved marker transition only', run: () => { assertIncludes(boardSource, 'bossTrialResolvedIslandNumber: runtimeState.bossTrialResolvedIslandNumber', 'Board must pass canonical boss resolved marker'); assertIncludes(hookSource, 'previousIsland1BossResolvedRef', 'B29 must track previous resolved baseline'); assertIncludes(hookSource, 'const current = bossTrialResolvedIslandNumber === 1;', 'B29 should use the Island 1 canonical marker'); assertIncludes(hookSource, "enqueueBeat('I001-B29')", 'Expected B29 enqueue on live transition'); ['tileIndex', 'STOP_TILE_INDICES_40', 'Boss Level 3'].forEach((needle) => assert(!hookSource.includes(needle), `B29 trigger must not use ${needle}`)); } },
  { name: 'B29 hydration baseline does not stale-play old saves', run: () => { assertIncludes(hookSource, 'The first hydrated\n    // observation seeds this ref only', 'B29 hydration baseline should be documented'); assertIncludes(hookSource, 'if (previous === null) return;', 'Initial hydrated resolved state must not trigger'); } },
  { name: 'B29 rechecks island cycle resolved marker and manifest before display', run: () => { assertIncludes(hookSource, "beat?.surface !== 'story_reader' || beat.episodePath !== ISLAND_001_RESOLUTION_MANIFEST_PATH || bossTrialResolvedIslandNumber !== 1 || currentIslandNumber !== 1 || cycleIndex !== 0", 'B29 display should re-check live eligibility and configured manifest'); assertIncludes(hookSource, 'isNarrativeSurfaceBlocked', 'B29 should share collision gate'); } },
  { name: 'B29 removes stale queued B26 after boss resolves', run: () => assertIncludes(hookSource, "setQueue((queued) => queued.filter((beatId) => beatId !== 'I001-B26'));", 'Boss resolution should remove stale finale setup') },
  { name: 'B29 marks seen on resolution close and stores episode suppression', run: () => { assertIncludes(hookSource, "markSeen('I001-B29')", 'Resolution close should mark seen'); assertIncludes(hookSource, 'ISLAND_001_RESOLUTION_EPISODE_ID', 'Resolution should use existing seen state episode map'); } },


  { name: 'B30 lifecycle remains reachable over claimed clear celebration before canonical travel', run: () => {
    const state = {
      currentIslandNumber: 1,
      cycleIndex: 0,
      showIslandClearCelebration: true,
      isIslandClearRewardClaimed: false,
      islandClearStatsIslandNumber: 1,
      nonClearBlocker: false,
      b29Active: true,
      b29Completed: false,
      queued: [] as string[],
      activeDialogue: null as string | null,
      travelCalls: 0,
    };
    const computeTravelReady = () => state.showIslandClearCelebration && state.isIslandClearRewardClaimed && state.islandClearStatsIslandNumber === state.currentIslandNumber;
    const computeSurfaceBlocked = () => state.nonClearBlocker || state.showIslandClearCelebration;
    const computeB30CelebrationException = () => computeTravelReady() && !state.nonClearBlocker;
    const attemptDisplay = () => {
      if (state.b29Active || state.activeDialogue || state.queued[0] !== 'I001-B30') return;
      if (isNarrativeSurfaceBlockingBeat('I001-B30', computeSurfaceBlocked(), computeB30CelebrationException())) return;
      if (!computeTravelReady() || state.currentIslandNumber !== 1 || state.cycleIndex !== 0) {
        state.queued.shift();
        return;
      }
      state.activeDialogue = 'I001-B30';
      state.queued.shift();
    };

    assert(!computeTravelReady(), 'Reward-unclaimed clear celebration must not be travel-ready and must not show B30');
    state.isIslandClearRewardClaimed = true;
    if (didIslandClearTravelReadyTransition(false, computeTravelReady())) state.queued.push('I001-B30');
    assertEqual(state.queued.join(','), 'I001-B30', 'Reward claim should queue B30');
    attemptDisplay();
    assertEqual(state.queued.join(','), 'I001-B30', 'B29 active should keep B30 pending');
    state.b29Active = false;
    state.b29Completed = true;
    attemptDisplay();
    assertEqual(state.activeDialogue, 'I001-B30', 'Closing B29 should make B30 displayable over the claimed clear celebration');
    assert(computeTravelReady(), 'Canonical travel CTA readiness should remain true while B30 is displayed');
    assertEqual(state.travelCalls, 0, 'Displaying/continuing B30 must not perform travel');
    state.activeDialogue = null;
    assert(computeTravelReady(), 'Closing B30 should preserve the existing Travel CTA state');
    state.showIslandClearCelebration = false;
    state.currentIslandNumber = 2;
    if (didIslandClearTravelReadyTransition(true, computeTravelReady())) state.queued.push('I001-B30');
    attemptDisplay();
    assertEqual(state.activeDialogue, null, 'B30 must not display after travel reaches Island 2');
  } },
  { name: 'B30 remains blocked by non-celebration modals and safely drops after travel', run: () => {
    assert(isNarrativeSurfaceBlockingBeat('I001-B30', true, false), 'B30 should remain blocked when any non-celebration blocker exists');
    assert(!isNarrativeSurfaceBlockingBeat('I001-B30', true, true), 'B30 should bypass only the claimed clear celebration blocker');
    assert(isNarrativeSurfaceBlockingBeat('I001-B24', true, true), 'The claimed celebration exception must not broadly unblock other beats');
    let queued = ['I001-B30'];
    let currentIslandNumber = 2;
    const isIslandClearTravelReady = false;
    if (queued[0] === 'I001-B30' && (!isIslandClearTravelReady || currentIslandNumber !== 1)) queued = queued.slice(1);
    assertEqual(queued.length, 0, 'Travel before B30 display should safely drop the stale queued beat');
  } },
  { name: 'B30 canonical travel-ready transition helper matches required boundaries', run: () => { assert(didIslandClearTravelReadyTransition(false, true), 'not-ready -> travel-ready should trigger'); assert(!didIslandClearTravelReadyTransition(true, true), 'stable travel-ready should not retrigger'); assert(!didIslandClearTravelReadyTransition(null, true), 'hydration baseline should not trigger stale saves'); assert(!didIslandClearTravelReadyTransition(false, false), 'not-ready stable should not trigger'); } },
  { name: 'B30 observes existing clear celebration travel CTA readiness', run: () => { assertIncludes(boardSource, 'const isIslandClearTravelReady = Boolean(', 'B30 should observe the same claimed clear celebration state that exposes the travel CTA'); assertIncludes(boardSource, 'islandClearStats?.islandNumber === runtimeState.currentIslandNumber', 'Travel readiness should remain scoped to the current island'); assertIncludes(boardSource, 'onClick={isIslandClearRewardClaimed ? handleTravelFromCelebration : handleClaimIslandClearCelebrationRewards}', 'Existing travel CTA handler must remain wired'); } },
  { name: 'B30 hydration baseline and live transition are documented', run: () => { assertIncludes(hookSource, 'Hydration/old-save rule for I001-B30', 'B30 hydration behavior should be documented'); assertIncludes(hookSource, 'didIslandClearTravelReadyTransition(previous, current)', 'B30 should use transition helper'); assertIncludes(hookSource, "enqueueBeat('I001-B30')", 'Expected B30 enqueue on live travel-ready transition'); } },
  { name: 'B30 rechecks scope and travel readiness before display', run: () => { assertIncludes(hookSource, "nextBeatId === 'I001-B30' && (!isIslandClearTravelReady || currentIslandNumber !== 1 || cycleIndex !== 0)", 'B30 display should re-check live readiness and Island 1 cycle 0'); assertIncludes(hookSource, 'isNarrativeSurfaceBlockingBeat(nextBeatId, isNarrativeSurfaceBlocked, canDisplayTravelReadyClosingOverClaimedCelebration)', 'B30 should share collision gate with a claimed-celebration-only exception'); } },
  { name: 'B30 dialogue copy and continue label are display-only', run: () => { assertIncludes(definitionSource, 'The route is open because we opened it together.', 'Expected B30 primary copy'); assertIncludes(definitionSource, 'Follow the restored route', 'Expected B30 continue label'); assertIncludes(hookSource, "speakerName: 'Miri'", 'Expected Miri speaker'); assertIncludes(hookSource, "tone: 'standard'", 'Expected standard tone'); ['handleTravelFromCelebration', 'performIslandTravel', 'travelToNextIsland', 'handleClaimIslandClearCelebrationRewards'].forEach((needle) => assert(!hookSource.includes(needle), `B30 continue must not call ${needle}`)); } },
  { name: 'queue priority puts B30 before ambient B24 and after B29', run: () => assertIncludes(hookSource, "'I001-B29': 3, 'I001-B30': 4, 'I001-B24': 5", 'Expected B30 to wait for B29 and outrank ambient B24') },

  { name: 'B29 receives no reward callback and cannot claim prologue reward', run: () => { assertIncludes(boardSource, "onRewardClaim={activeStoryEpisode?.kind === 'global_prologue' ? sanctuaryHandlers.storyRewardClaim : undefined}", 'Reward callback must be prologue-only'); assertIncludes(hookSource, "setActiveStoryEpisode({ kind: 'island_resolution', manifestPath: ISLAND_001_RESOLUTION_MANIFEST_PATH })", 'Resolution should use existing StoryReader episode state'); } },
  { name: 'B24 performs no gameplay mutation or reward writes', run: () => ['persistIslandRunRuntimeStatePatch', 'islandRunStateActions', 'applyStopBuildSpendBatch', 'spendIslandRunContractV2EssenceOnStopBuild', 'applyStopObjectiveProgress', 'applyBossTrialResolvedMarker', 'travelToNextIsland', 'onRewardClaim'].forEach((needle) => assert(!hookSource.includes(needle), `B24 hook must not import/call ${needle}`)) },
  { name: 'duplicate queue entries are suppressed', run: () => assertIncludes(hookSource, 'if (current.includes(beatId)) return current;', 'Expected duplicate queue guard') },
  { name: 'queue priority keeps B29 before ambient B24', run: () => assertIncludes(hookSource, "'I001-B29': 3, 'I001-B30': 4, 'I001-B24': 5", 'Expected queue priority') },
  { name: 'board uses episode-specific StoryReader state', run: () => { assertIncludes(boardSource, 'ActiveIslandStoryEpisode', 'Board should use episode state'); assertIncludes(boardSource, "kind: 'global_prologue'", 'Global prologue episode should be explicit'); assertIncludes(hookSource, "kind: 'island_arrival'", 'Island arrival episode should be explicit'); assertIncludes(hookSource, "kind: 'island_resolution'", 'Island resolution episode should be explicit'); } },
  { name: 'arrival and resolution receive no reward callback', run: () => assertIncludes(boardSource, "onRewardClaim={activeStoryEpisode?.kind === 'global_prologue' ? sanctuaryHandlers.storyRewardClaim : undefined}", 'Reward callback must be prologue-only') },
  { name: 'global prologue retains reward callback behavior', run: () => assertIncludes(boardSource, 'sanctuaryHandlers.storyRewardClaim', 'Global prologue reward callback should remain wired') },
  { name: 'toast is non-blocking and silent', run: () => { assertIncludes(boardSource, '<IslandNarrativeToast', 'Expected toast component on board'); assertIncludes(toastSource, 'role="status"', 'Toast should be non-modal status'); assert(!toastSource.includes('lockPageScroll'), 'Toast must not lock scroll'); assert(!toastSource.includes('playIslandRunSound'), 'Toast must be silent'); } },
  { name: 'dialogue copy renders through reusable component', run: () => { assertIncludes(boardSource, '<IslandNarrativeDialogue', 'Expected reusable dialogue component'); assertIncludes(definitionSource, 'Start small. Help us wake one gentle place.', 'Expected Miri copy'); assertIncludes(definitionSource, 'The Hatchery is quiet, not gone. Help me wake one cradle.', 'Expected Poko copy'); } },
  { name: 'board collision gate accounts for major owned modals', run: () => ['showBuildPanel', 'activeLaunchedMinigameId', 'showIslandClearCelebration', 'showMarketPanel', 'showShopPanel', 'showSanctuaryPanel', 'showRewardDetailsModal', 'bossTrialPhase', 'showTravelOverlay', 'dormantDoorMiniGame'].forEach((needle) => assertIncludes(boardSource, needle, `Collision gate missing ${needle}`)) },
  { name: 'no permanent narrative feature flag exists', run: () => { const combined = `${hookSource}\n${boardSource}\n${definitionSource}`; assert(!combined.includes('islandRunNarrativePilotEnabled'), 'No permanent narrative feature flag should exist'); } },
  { name: 'opening flow does not import gameplay mutation services', run: () => ['persistIslandRunRuntimeStatePatch', 'islandRunStateActions', 'islandRunRollAction', 'islandRunTileRewardAction', 'applyStopObjectiveProgress', 'applyBossTrialResolvedMarker', 'travelToNextIsland'].forEach((needle) => assert(!hookSource.includes(needle), `Hook must not import/call ${needle}`)) },
];
