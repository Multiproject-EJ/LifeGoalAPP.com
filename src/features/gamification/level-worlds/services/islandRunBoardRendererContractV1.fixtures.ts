import type { IslandRunRuntimeState } from './islandRunRuntimeState';
import { selectBoardRendererContractV1 } from './islandRunBoardRendererAdapterV1';
import { assertBoardRendererContractV1, type BoardRendererContractV1 } from './islandRunBoardRendererContractV1';

function makeRuntimeState(overrides: Partial<IslandRunRuntimeState> = {}): IslandRunRuntimeState {
  return {
    runtimeVersion: 1,
    firstRunClaimed: true,
    dailyHeartsClaimedDayKey: null,
    onboardingDisplayNameLoopCompleted: true,
    storyPrologueSeen: true,
    audioEnabled: true,
    currentIslandNumber: 4,
    cycleIndex: 12,
    bossTrialResolvedIslandNumber: null,
    activeEggTier: null,
    activeEggSetAtMs: null,
    activeEggHatchDurationMs: null,
    activeEggIsDormant: false,
    perIslandEggs: {},
    islandStartedAtMs: 1_700_000_000_000,
    islandExpiresAtMs: 1_700_100_000_000,
    islandShards: 0,
    tokenIndex: 3,
    hearts: 5,
    coins: 10,
    spinTokens: 2,
    dicePool: 3,
    shardTierIndex: 1,
    shardClaimCount: 0,
    shields: 0,
    shards: 0,
    diamonds: 0,
    creatureTreatInventory: { basic: 0, favorite: 0, rare: 0 },
    companionBonusLastVisitKey: null,
    completedStopsByIsland: {},
    marketOwnedBundlesByIsland: {},
    creatureCollection: [],
    activeCompanionId: null,
    perfectCompanionIds: [],
    perfectCompanionReasons: {},
    perfectCompanionComputedAtMs: null,
    perfectCompanionModelVersion: null,
    perfectCompanionComputedCycleIndex: null,
    activeStopIndex: 1,
    activeStopType: 'habit',
    stopStatesByIndex: [
      { objectiveComplete: true, buildComplete: true, completedAtMs: 1_700_000_000_001 },
      { objectiveComplete: true, buildComplete: false },
      { objectiveComplete: false, buildComplete: false },
      { objectiveComplete: false, buildComplete: false },
      { objectiveComplete: false, buildComplete: false },
    ],
    stopBuildStateByIndex: [
      { requiredEssence: 100, spentEssence: 100, buildLevel: 1 },
      { requiredEssence: 100, spentEssence: 40, buildLevel: 0 },
      { requiredEssence: 100, spentEssence: 0, buildLevel: 0 },
      { requiredEssence: 100, spentEssence: 0, buildLevel: 0 },
      { requiredEssence: 100, spentEssence: 0, buildLevel: 0 },
    ],
    bossState: { unlocked: false, objectiveComplete: false, buildComplete: false },
    essence: 65,
    essenceLifetimeEarned: 70,
    essenceLifetimeSpent: 5,
    diceRegenState: null,
    rewardBarProgress: 4,
    rewardBarThreshold: 10,
    rewardBarClaimCountInEvent: 0,
    rewardBarEscalationTier: 0,
    rewardBarLastClaimAtMs: null,
    rewardBarBoundEventId: 'feeding_frenzy:1700000000000',
    rewardBarLadderId: 'feeding_frenzy_ladder_v1',
    activeTimedEvent: {
      eventId: 'feeding_frenzy:1700000000000',
      eventType: 'feeding_frenzy',
      startedAtMs: 1_700_000_000_000,
      expiresAtMs: 1_700_000_900_000,
      version: 1,
    },
    activeTimedEventProgress: { feedingActions: 1, tokensEarned: 0, milestonesClaimed: 0 },
    stickerProgress: { fragments: 3 },
    stickerInventory: { feeding_frenzy_sticker: 1 },
    ...overrides,
  };
}

function makeFixture(params: {
  runtimeState: IslandRunRuntimeState;
  nowMs: number;
  movementPreviewRoll?: number;
  busy?: Partial<BoardRendererContractV1['ui']['busy']>;
  errors?: BoardRendererContractV1['ui']['errors'];
}): BoardRendererContractV1 {
  return assertBoardRendererContractV1(selectBoardRendererContractV1({
    runtimeState: params.runtimeState,
    islandNumber: params.runtimeState.currentIslandNumber,
    nowMs: params.nowMs,
    movementPreviewRoll: params.movementPreviewRoll,
    busy: params.busy,
    errors: params.errors,
  }));
}

export const boardRendererContractV1Fixtures = {
  idle: makeFixture({
    runtimeState: makeRuntimeState(),
    nowMs: 1_700_000_100_000,
  }),
  midMovePreview: makeFixture({
    runtimeState: makeRuntimeState({ tokenIndex: 8 }),
    nowMs: 1_700_000_100_000,
    movementPreviewRoll: 3,
    busy: { roll: true },
  }),
  activeStopBuildable: makeFixture({
    runtimeState: makeRuntimeState({
      essence: 75,
      stopBuildStateByIndex: [
        { requiredEssence: 100, spentEssence: 100, buildLevel: 1 },
        { requiredEssence: 100, spentEssence: 25, buildLevel: 0 },
        { requiredEssence: 100, spentEssence: 0, buildLevel: 0 },
        { requiredEssence: 100, spentEssence: 0, buildLevel: 0 },
        { requiredEssence: 100, spentEssence: 0, buildLevel: 0 },
      ],
    }),
    nowMs: 1_700_000_100_000,
  }),
  lowEssence: makeFixture({
    runtimeState: makeRuntimeState({ essence: 0 }),
    nowMs: 1_700_000_100_000,
  }),
  rewardClaimable: makeFixture({
    runtimeState: makeRuntimeState({ rewardBarProgress: 10, rewardBarThreshold: 10 }),
    nowMs: 1_700_000_100_000,
  }),
  eventEndingSoon: makeFixture({
    runtimeState: makeRuntimeState({
      activeTimedEvent: {
        eventId: 'feeding_frenzy:1700000000000',
        eventType: 'feeding_frenzy',
        startedAtMs: 1_700_000_000_000,
        expiresAtMs: 1_700_000_105_000,
        version: 1,
      },
    }),
    nowMs: 1_700_000_100_000,
  }),
} as const;

export type BoardRendererContractV1FixtureName = keyof typeof boardRendererContractV1Fixtures;
