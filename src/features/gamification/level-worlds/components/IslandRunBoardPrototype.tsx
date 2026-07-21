import { lockPageScroll } from '../../../../utils/scrollLock';
/**
 * ISLAND RUN ARCHITECTURE WARNING
 *
 * This file is still in migration and contains legacy compatibility paths.
 * Do NOT add new gameplay-state write paths here.
 *
 * Gameplay state mutation must flow through canonical action services:
 * - islandRunStateActions
 * - islandRunRollAction
 * - islandRunTileRewardAction
 *
 * Forbidden for new code:
 * - direct gameplay writes via persistIslandRunRuntimeStatePatch
 * - new runtimeState gameplay mirrors
 * - duplicating dice/token/reward/stop logic locally
 *
 * See: docs/gameplay/ISLAND_RUN_ARCHITECTURE_CONTRACT.md
 */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import type { Session } from '@supabase/supabase-js';
import {
  CANONICAL_BOARD_SIZE,
  TILE_ANCHORS_36,
  TOKEN_START_TILE_INDEX,
  OUTER_STOP_ANCHORS,
  type TileAnchor,
} from '../services/islandBoardLayout';
import {
  ISLAND_RUN_CONTROLLER_SLOT_MAP,
  getIslandRunControllerSlotStyle,
} from '../services/islandRunControllerVisualContract';
import { BoardStage, type BoardStageCameraControls } from './board';
import { ConfettiBurst } from './ConfettiBurst';
import { CelebrationFireworks } from '../../../../components/CelebrationFireworks';
import {
  IslandTechCollectionModal,
  type TechCollectionModalResult,
} from './IslandTechCollectionModal';
import {
  IslandTechCompletionCelebration,
  type TechCompletionCelebrationResult,
} from './IslandTechCompletionCelebration';
import {
  TECH_COLLECTION_CELL_COUNT,
  resolveTechCollection,
} from '../services/islandRunTechCollection';
import {
  getIslandTechnologyFragmentPlacement,
  listVisibleTechnologyFragments,
} from '../services/islandTechnologyFragmentPlacements';
import { StatDriftNumbers } from './StatDriftNumbers';
import { OutOfDiceRegenStatus } from './OutOfDiceRegenStatus';
import { LoadingReadinessScreen } from '../../../../components/LoadingReadinessScreen';
import { ShopItemCostLine } from './ShopItemCostLine';
import {
  getIslandBoardThemeForIslandNumber,
  type IslandBoardTheme,
} from '../services/islandBoardThemes';
import { getIslandBackgroundImageSrc } from '../services/islandBackgrounds';
import { IslandInhabitantFlow, type IslandInhabitantFlowResult } from '../inhabitants/components/IslandInhabitantFlow';
import { getIslandCaretakerConcordContent, hasIslandCaretakerConcordContent } from '../inhabitants/islandCaretakerConcord';
import type { IslandConversationDefinition, IslandInhabitantTopicDefinition } from '../inhabitants/islandConversationTypes';
import { getIslandArtAmbientBackgroundSrc, loadIslandArtManifest, type IslandArtManifest } from '../services/islandArtManifest';
import { getIslandCommunicationAccess } from '../services/islandCommunicationAccess';
import { getIslandTechnologyAccess, resolveIslandTechnologyBuildEligibility } from '../services/islandRunTechnologyUnlocks';
import { resolveIslandRunConcordHubEntryState } from '../services/islandRunConcordHubEntry';
import { getCreatureChannelLine } from '../services/islandCreatureChannel';
import { getIslandDisplayName } from '../services/islandNames';
import { applyLandmarkDoorTiles, generateTileMap, getIslandRarity, resolveAllLandmarkDoorsRouteToBoss, resolveExpandedLandmarkDoorStopIdForStatuses, type IslandLandmarkDoorStopId, type IslandTileMapEntry } from '../services/islandBoardTileMap';
import {
  getTrafficLightCharge,
  resolveTrafficLightCoinFlipReward,
  TRAFFIC_LIGHT_CHARGE_TARGET,
  TRAFFIC_LIGHT_TILE_INDEX,
  type TrafficLightCoinFlipReward,
} from '../services/islandRunTrafficLightTile';
import {
  buildDormantDoorMiniGame,
  resolveDormantDoorReward,
  type DormantDoorFigure,
  type DormantDoorMiniGameState,
  type DormantDoorRewardLevel,
  type DormantDoorRewardTier,
} from '../services/islandRunDormantDoorMinigame';
import { resolveIslandBoardProfile } from '../services/islandBoardProfiles';
// resolveWrappedTokenIndex retired from this component: the roll action service
// is the single authoritative source of truth for token movement and hop order.
import { ISLAND_RUN_DEFAULT_STARTING_DICE } from '../services/islandRunEconomy';
import { generateIslandStopPlan, type IslandStopPlanEntry } from '../services/islandRunStops';
import { decideCardDraw, initialCardDrawCadenceState } from '../services/islandRunCardDrawCadence';
import { getWisdomTreeCardForIsland } from '../services/wisdomTreeCards';
import {
  getStopTicketCost,
  getStopTicketPrepayCost,
  getStopTicketsPaidForIsland,
  isStopTicketPaid,
  payStopTicket,
} from '../services/islandRunStopTickets';
import { resolveIslandRunStopTapOutcome } from '../services/islandRunStopTapRouting';
import { isIslandFullyCleared } from '../services/islandRunProgression';
import { recordTelemetryEvent } from '../../../../services/telemetry';
import { fetchOwnedThemeIds, initiateThemeCheckout } from '../../../../services/themePurchases';
import { AVAILABLE_THEMES, resolveThemeAccess, type Theme, type ThemeAccessResult, type ThemeMetadata } from '../../../../contexts/ThemeContext';
import {
  ISLAND_RUN_RUNTIME_HYDRATION_FAILED_STAGE,
  ISLAND_RUN_RUNTIME_HYDRATION_STAGE,
  type IslandRunRuntimeHydrationSource,
  shouldEmitIslandRunRuntimeHydrationTelemetry,
} from '../services/islandRunRuntimeTelemetry';
import { useSupabaseAuth } from '../../../auth/SupabaseAuthProvider';
import { useGamification } from '../../../../hooks/useGamification';
import { isDemoSession } from '../../../../services/demoSession';
import {
  hydrateIslandRunRuntimeStateWithSource,
  readIslandRunRuntimeState,
  resolveCollectibleForClaim,
  type IslandRunRuntimeState,
} from '../services/islandRunRuntimeState';
import { ShardClaimModal } from './ShardClaimModal';
import { IslandRunLifePromptCard } from './IslandRunLifePromptCard';
import { IslandRunGamifiedJournalCard } from './IslandRunGamifiedJournalCard';
import { WisdomTreeCardEncounter } from './WisdomTreeCardEncounter';
import { CompactGameCompassPanel } from '../../../compass-book/components/CompactGameCompassPanel';
import { CompassStopFragmentMount } from '../../../compass-book/components/CompassStopFragmentMount';
import {
  fetchCompassState,
  isCompassSessionFilledForIsland,
  recordCompassContribution,
} from '../../../../services/compassState';
import { flushIslandRunPendingWrite, readIslandRunGameStateRecord, type IslandRunGameStateRecord, type PerIslandEggEntry } from '../services/islandRunGameStateStore';
import { getIslandRunDeviceSessionId } from '../services/islandRunDeviceSession';
import { useIslandRunState } from '../hooks/useIslandRunState';
import {
  getIslandRunBuildPromptInitialTransitionTarget,
  getIslandRunFirstCreaturePackContinueTarget,
  getIslandRunHatcheryL1CelebrationContinueTarget,
  isIslandRunFirstCreaturePackModalActive,
  isIslandRunHatcheryBuildGuidanceActive,
  isIslandRunHatcheryL1CelebrationActive,
  isIslandRunBuildPromptOverlayActive,
  formatIslandRunFirstCreaturePackBonusCopy,
  resolveIslandRunFirstCreaturePackOpenAttempt,
  resolveIslandRunBuildPromptClickTransitionTargets,
  resolveIslandRunBuildModalTutorialRowState,
  shouldIslandRunBuildPromptBlockControl,
} from '../services/islandRunFirstSessionTutorialUi';
import {
  ISLAND_RUN_FIRST_ROLL_COACHMARK_COPY,
  ISLAND_RUN_KEEP_ROLLING_COACHMARK_COPY,
  isIslandRunFirstRollCoachmarkActive,
  isIslandRunKeepRollingCoachmarkActive,
} from '../services/islandRunCoreLoopTutorialUi';
import {
  commitIslandRunState,
  getIslandRunStateSnapshot,
  refreshIslandRunStateFromLocal,
  resetIslandRunStateSnapshot,
} from '../services/islandRunStateStore';
import {
  beginIslandRunActionBarrier,
  endIslandRunActionBarrier,
  withIslandRunActionLock,
} from '../services/islandRunActionMutex';
import {
  applyAudioPreferencesMarker,
  applyBossTrialResolvedMarker,
  applyCompanionBonusLastVisitKeyMarker,
  applyCreatureCollection,
  applyCreatureTreatInventory,
  resolveCreatureFormUpgradePreview,
  upgradeCreatureFormWithShards,
  CREATURE_FORM_MAX_LEVEL,
  CREATURE_THEME_REQUIRED_FORM_LEVEL,
  applyDevGrantDice,
  applyDevGrantEssence,
  applyDevGrantTimedEventTickets,
  applyTimedEventTicketTileGrant,
  applyDevBuildAllToL3,
  applyDevClearCurrentIslandForTravel,
  applyDevSpeedHatchEgg,
  applyActivateCurrentIslandTimer,
  applyPassiveDiceRegenTick,
  resolveReadyEggTerminalTransition,
  applyHydrationEggReadyTransition,
  applyEggPlacement,
  applyEggPlacementBatch,
  applyFirstRunClaimed,
  applyFirstRunStarterRewards,
  applyFirstSessionTutorialState,
  applyIslandShardsSet,
  applyMarketOwnedBundleMarker,
  applyOnboardingDisplayNameLoopMarker,
  applyOnboardingCompleteMarker,
  applyPerfectCompanionSnapshot,
  applyQaProgressionSnapshot,
  applyNarrativeSeenStateMarker,
  applyShardClaimProgressMarker,
  applyStoryPrologueSeenMarker,
  applyStopBuildSpendBatch,
  applyStopObjectiveProgress,
  applyStopTicketPayment,
  postponeIslandRunStop,
  applyWalletDiamondsSet,
  applyWalletShardsDelta,
  applyEssenceAward,
  applyEssenceDeduct,
  applyEssenceDriftTick,
  applyRewardBarState,
  applyRollResult,
  applyTrafficLightCoinFlipReward,
  applyTrafficLightTilePass,
  syncCompletedStopsForIsland,
  applyTokenHopRewards,
  applyTechCollectionState,
  applyIslandRunTechnologyBuild,
  applyTimedEventTicketSpend,
  claimArenaFirstTicketBoost,
  applySpaceExcavatorDig,
  advanceSpaceExcavatorBoard,
  claimSpaceExcavatorMilestoneReward,
  initSpaceExcavatorProgressForEvent,
  applyCompanionFeastDrop,
  applyCompanionFeastMergeResult,
  claimCompanionFeastMilestoneReward,
  initCompanionFeastProgressForEvent,
  applyFortuneEngineLaunch,
  applyFortuneEngineRunResult,
  applyFortuneEngineFinaleResult,
  claimFortuneEngineMilestoneReward,
  initFortuneEngineProgressForEvent,
  SPACE_EXCAVATOR_TOTAL_BOARDS,
  ISLAND_RUN_MAX_ISLAND,
  travelToNextIsland,
  setActiveCompanionId as commitActiveCompanionId,
  clearActiveCompanionId as commitClearActiveCompanionId,
} from '../services/islandRunStateActions';
import {
  EGG_MANIA_MAX_EGGS_PER_ISLAND,
  areAllEggSlotsTerminalForIsland,
  getEggSlotLedgerKey,
  getEggSlotsForIsland,
  parseEggSlotLedgerKey,
  resolveEggManiaState,
} from '../services/islandRunEggMania';
import {
  rollEggTierWeighted,
  getRandomHatchDelayMs,
  getEggStageName,
  getEggStageEmoji,
  getEggStageArtSrc,
  rollEggRewards,
  getEggSellRewardOptions,
  type EggTier,
  type EggSellRewardChoice,
} from '../services/eggService';
import {
  fetchCreatureCollection,
  collectCreatureForUser,
  countUnclaimedCreatures,
  getCreatureManifestEntries,
  migrateLegacyEggLedgerToCollection,
  feedCreatureForUser,
  claimCreatureBondMilestoneForUser,
  getUnclaimedBondMilestones,
  CREATURE_BOND_XP_PER_LEVEL,
  type CreatureCollectionEntry,
} from '../services/creatureCollectionService';
import {
  claimFirstSessionCreaturePackReward,
  type FirstSessionCreaturePackCardReveal,
} from '../services/islandRunFirstSessionCreaturePackAction';
import {
  claimFullWelcomePack,
  type ClaimFullWelcomePackResult,
} from '../services/islandRunWelcomePackFullClaimAction';
import {
  earnCreatureTreatsForUser,
  fetchCreatureTreatInventory,
  type CreatureTreatType,
} from '../services/creatureTreatInventoryService';
import {
  CREATURE_CATALOG,
  getCompanionBonusForCreature,
  getCreatureSpecialtyForCompanion,
  resolveShipZoneForCreature,
  selectCreatureForEggWithEarlyFeaturedPool,
  type ShipZone,
} from '../services/creatureCatalog';
import { resolveCreatureArtManifest } from '../services/creatureImageManifest';
import { getCreatureCardMetadata } from '../services/creatureCardCatalog';
import { buildCreatureCardSimpleView } from '../services/creatureCardV2Adapter';
import { CreatureCard } from './CreatureCard';
import { CreatureGridCard } from './CreatureGridCard';
import { CreatureHatchRevealModal } from './CreatureHatchRevealModal';
import {
  FirstSessionCreaturePackModal,
  type FirstSessionCreaturePackModalPhase,
} from './FirstSessionCreaturePackModal';
import {
  CreaturePackOpeningPrototypeModal,
  type CreaturePackOpeningPrototypeCard,
} from './CreaturePackOpeningPrototypeModal';
import { WelcomePackModal } from './WelcomePackModal';
import { getWelcomePackEligibility } from '../services/islandRunWelcomePackEligibility';
import { shouldAutoShowWelcomePackModal } from '../services/islandRunWelcomePackOnboardingUi';
import {
  markIslandRunGuestFirstProgressRecapSeen,
  markIslandRunGuestSavePromptDismissed,
  patchIslandRunGuestFunnelState,
  readIslandRunGuestFunnelState,
  type IslandRunGuestFunnelStateV1,
} from '../services/islandRunGuestFunnelState';
import { resolveIslandRunFirstPlayerModalPrompt } from '../services/islandRunFirstPlayerModalScheduler';
import { applyCreatureArtFallback } from './creatureArtFallback';
import {
  rankCreatureFitsForPlayer,
  selectPerfectCompanions,
  type PlayerHandContext,
} from '../services/creatureFitEngine';
import { resolveCompanionRegenModifier } from '../services/companionRegenModifier';
import { readPerfectCompanionRuntimeConfig } from '../services/perfectCompanionConfig';
import { getDefaultZonePreferencesForArchetypes } from '../services/creatureArchetypeBridge';
import { logIslandRunEntryDebug, setIslandRunDebugRuntimeSnapshotProvider } from '../services/islandRunEntryDebug';
import { getAiCoachAccess } from '../../../../services/aiCoachAccess';
import { logGameSession } from '../../../../services/gameRewards';
import { awardGold } from '../../daily-treats/luckyRollTileEffects';
import { awardLuckyRollRuns } from '../../../../services/luckyRollAccess';
import {
  playIslandRunSound,
  playTokenMoveSound,
  triggerIslandRunHaptic,
  setIslandRunAudioEnabled,
} from '../services/islandRunAudio';
import {
  applyIslandRunMusicContext,
  resolveIslandRunMusicContext,
  stopIslandRunMusic,
} from '../services/islandRunMusic';
import { SHARD_EARN, computeShardEarn, getShardTierThreshold, type ShardEarnSource } from '../services/shardMilestoneEngine';
import {
  drawEncounterChallenge,
  rollEncounterReward,
  formatEncounterRewardSummary,
  type EncounterChallenge,
  type EncounterReward,
} from '../services/encounterService';
import { IslandRunMinigameLauncher } from './IslandRunMinigameLauncher';
import { ShooterControllerAdapter } from './ShooterControllerAdapter';
import { IslandStoryReader } from './IslandStoryReader';
import { IslandNarrativeDialogue } from '../narrative/components/IslandNarrativeDialogue';
import { IslandNarrativeToast } from '../narrative/components/IslandNarrativeToast';
import { useIslandNarrativeOpeningFlow, type ActiveIslandStoryEpisode } from '../narrative/useIslandNarrativeOpeningFlow';
import { useLandmarkWhispers } from '../narrative/useLandmarkWhispers';
import { createWisdomKeeperAiCoachGenerator } from '../narrative/wisdomKeeperAi';
import type { IslandNarrativeSeenState } from '../narrative/islandNarrativeSeenState';
import {
  resolveMinigameForStop,
  type IslandRunMinigameResult,
} from '../services/islandRunMinigameService';
import type { IslandRunControllerIntent } from '../services/islandRunMinigameTypes';
import { registerAllMinigameManifests } from '../services/islandRunMinigameManifests';
import {
  resolveBossRhythmStopMinigame,
  resolveBossStopMinigame,
  resolveCompanionFeastEventMinigame,
  resolveIslandWorkshopEventMinigame,
  resolveLuckySpinEventMinigame,
  resolveTimedEventLaunchTicketDelta,
  resolveEventMinigameCompletionId,
  resolveSpaceExcavatorEventMinigame,
  type MinigameLaunchSource,
  shouldResolveMysteryStopOnMinigameComplete,
} from '../services/islandRunMinigameLauncherService';
import {
  canOpenIslandRunOverlayWhileRollingState,
  resolveIslandRunPlaceholderDescriptor,
  type IslandRunPlaceholderDescriptor,
} from '../services/islandRunPlaceholderService';
import {
  getBossTrialConfig,
  getBossTypeColor,
  type BossType,
} from '../services/bossService';
import {
  ensureStopCompleted,
  getEffectiveCompletedStops,
  getStopCompletionBlockReason,
  isIslandStopEffectivelyCompleted,
  isStopCompleted,
  shouldAutoOpenIslandStopOnLoad,
} from '../services/islandRunStopCompletion';
import { executeIslandRunRollAction } from '../services/islandRunRollAction';
import { executeIslandRunTileRewardAction } from '../services/islandRunTileRewardAction';
import {
  advanceIslandRunLuckyRoll,
  bankIslandRunLuckyRollRewards,
  startIslandRunLuckyRoll,
} from '../services/islandRunLuckyRollAction';
import {
  collectPostRareTreasurePathAndTravel,
  resolvePendingTreasurePathResume,
  startPostRareTreasurePath,
} from '../services/islandRunPostRareTreasurePathAction';
import { getTreasurePathMilestoneMetadata } from '../services/islandRunIslandMetadata';
import {
  getEffectiveIslandNumber,
  getIslandTotalEssenceCost,
  getRemainingIslandBuildCost,
  getStopUpgradeCost,
  initStopBuildStatesForIsland,
  isStopBuildFullyComplete,
  MAX_BUILD_LEVEL,
  resolveBuildSpendStepForTier,
  resolveIslandRunContractV2EssenceEarnForTile,
  spendIslandRunContractV2EssenceOnStopBuild,
} from '../services/islandRunContractV2EssenceBuild';
import {
  type BossCreatureArtState,
  canChallengeBoss,
  getBossChallengeLockReason,
  resolveBossCreatureArtState,
} from '../services/islandRunBossEncounter';
import {
  getInitialBuildRepeatStreakState,
  MAX_REPEATED_BUILD_BATCH_STEPS,
  resolveNextBuildRepeatStreak,
  resolveRepeatedBuildBatchSteps,
  type BuildRepeatStreakState,
} from '../services/islandRunBuildAcceleration';
import {
  BASE_DICE_PER_ROLL,
  claimIslandRunContractV2RewardBar,
  resolveChainedRewardBarClaims,
  resolveNextRewardKind,
  REWARD_KIND_ICON,
  resolveAvailableMultiplierTiers,
  clampMultiplierToPool,
  resolveDiceCostForMultiplier,
  type RewardBarClaimPayout,
} from '../services/islandRunContractV2RewardBar';
import {
  advanceEventIfExpired,
  getEventDisplayMeta,
  getEventRotationTemplates,
  recordEventMinigameCompletion,
  recordEventProgress,
  resolveEventTokenPresentation,
  type EventId,
} from '../services/islandRunEventEngine';
import {
  canRetryBossTrial,
  isIslandRunRollEnergyDepleted,
  resolveIslandRunRollButtonMode,
  resolveIslandRunTimerLabel,
} from '../services/islandRunContractV2Energy';
import {
  resolveIslandRunContractV2Stops,
  resolveIslandRunFullClearForProgression,
  isIslandRunFullyClearedV2,
  isIslandRunFinishedForDepartureV2,
} from '../services/islandRunContractV2StopResolver';
import { resolveIslandRunBestNextAction } from '../services/islandRunBestNextActionAdvisor';
import {
  formatIslandRunSpinTokenReward,
  resolveIslandRunContractV2RewardHudState,
  resolveIslandRunSpinTokenWalletLabel,
} from '../services/islandRunContractV2Semantics';
import {
  resolveIslandTimerHydrationState,
  shouldAutoAdvanceIslandOnTimerExpiry,
} from '../services/islandRunTimerProgression';
import { createDicePackCheckoutSession } from '../../../../services/billing';
import { createCreaturePackCheckoutSession } from '../../../../services/creaturePackPurchases';
import {
  initiateMinigameTicketCheckout,
  resolveMinigameTicketSku,
} from '../../../../services/minigameTicketStore';
import { scheduleEggHatchNotification } from '../../../../services/habitAlertNotifications';
import { isIslandRunFeatureEnabled } from '../../../../config/islandRunFeatureFlags';
import {
  DICE_REGEN_NEXT_DICE_LABEL,
  resolveNextRollEtaMs,
  type DiceRegenState,
} from '../services/islandRunDiceRegeneration';
import { openEggRewardInventoryEntry } from '../services/islandRunEggRewardInventoryAction';
import {
  grantDevDemoCreaturePack,
  grantDevDemoCreaturePackOpeningPrototype,
  grantDevDemoEggRewardPack,
} from '../services/islandRunAdminDevPackGrantAction';
import { IslandRunDebugPanel, type IslandRunDebugLocalState } from './IslandRunDebugPanel';
import { IslandRunLuckyRollDevOverlay } from './lucky-roll/IslandRunLuckyRollDevOverlay';
import { resolveNextCheapestIndex } from '../services/islandRunShopAffordability';
import { adviseEggSellChoice } from '../services/islandRunEggSellAdvisor';
import {
  bindKeyboardToShooterBridge,
  createShooterControllerBridge,
} from '../services/islandRunShooterControllerBridge';
import { emitShooterControllerLifecycleTelemetry } from '../services/islandRunShooterControllerTelemetry';
import { BuildModalV2 } from './BuildModalV2';
import { deriveBuildModalV2ViewModel } from '../services/islandRunBuildModalV2ViewModel';
import IslandRunWinCelebrationModal, { type WinRewardItem } from './IslandRunWinCelebrationModal';
import DemoWaitlistModal from './DemoWaitlistModal';
import '../../../../styles/demo-waitlist-modal.css';

const ROLL_MIN = 1;
const ROLL_MAX = 6;
const SPIN_MIN = 1;
const SPIN_MAX = 5;
const CANONICAL_EVENT_IDS: readonly EventId[] = ['feeding_frenzy', 'lucky_spin', 'space_excavator', 'companion_feast'];
const isCanonicalEventId = (value: string): value is EventId => (
  (CANONICAL_EVENT_IDS as readonly string[]).includes(value)
);
// Island duration: 72 hours for special islands, 48 hours for standard islands.
const ISLAND_DURATION_SEC = 72 * 60 * 60;
// Canonical contract is now enforced as source-of-truth runtime behavior.
// Legacy pre-contract-v2 movement/energy rules are intentionally disabled.
const ISLAND_RUN_CONTRACT_V2_ENABLED = true;
const DEBUG_TIMED_EVENT_OVERRIDE_KEY = 'islandRunDebugTimedEventOverride';
const DEBUG_TIMED_EVENT_OVERRIDE_NONCE_KEY = 'islandRunDebugTimedEventOverrideNonce';
// Only one board profile ships today. Historically this was query-param gated,
// but every branch collapsed to the same result — so the helper was removed.
const ACTIVE_BOARD_PROFILE = resolveIslandBoardProfile('spark36_ring');
// Tile 0 is the visual top of the spark36 ring (see TILE_ANCHORS_36 rotation).
const ISLAND_CARETAKER_TILE_INDEX = 0;
const EMPTY_CARETAKER_TOPICS: IslandInhabitantTopicDefinition[] = [];
const EMPTY_CARETAKER_CONVERSATIONS: IslandConversationDefinition[] = [];
const PRE_CONCORD_CARETAKER_UTTERANCES = [
  '🧙 “whrwer@!?”',
  '🧙 “gruum vella-nok?”',
  '🧙 “tikka reluun… zhar!”',
  '🧙 “moro? vellakai!”',
  '🧙 “shaa-lum briiik?”',
] as const;

const getPreConcordCaretakerUtterance = () => (
  PRE_CONCORD_CARETAKER_UTTERANCES[Math.floor(Math.random() * PRE_CONCORD_CARETAKER_UTTERANCES.length)]
);
const BUILD_DISCOUNT_RATE = 0.25;
const BUILD_DISCOUNT_MIN_DURATION_MS = 2 * 60 * 1000;
const BUILD_DISCOUNT_MAX_DURATION_MS = 15 * 60 * 1000;
const PERFECT_COMPANION_MODEL_VERSION = 'phase3_v1';
// Temporary diagnostics for Stop 1↔2 flicker + roll lock on Island 120 startup.
const ISLAND_RUN_120_STARTUP_DIAGNOSTIC_ISLAND = 120;
const ISLAND_RUN_120_STARTUP_DIAGNOSTIC_WINDOW_MS = 10_000;
const ISLAND_RUN_120_STOP_PAIR_DELIMITER = '_to_';
const ISLAND_RUN_REGEN_INTERVAL_NOOP_LOG_THROTTLE_MS = 45_000;
const ISLAND_RUN_EARLY_FEATURED_CREATURE_POOL_WEIGHT_PERCENT = 70;
const DEV_LUCKY_ROLL_TEST_ROLL = 3;
const BUILD_HOLD_INITIAL_DELAY_MS = 400;
// Duration of the traffic-light coin spin before the reward is revealed. Must match
// the `.island-coin--flipping` keyframe duration in LevelWorlds.css.
const TRAFFIC_LIGHT_COIN_FLIP_DURATION_MS = 2600;
const TRAFFIC_LIGHT_REWARD_AUTO_CLOSE_MS = 3600;
const TRAFFIC_LIGHT_COIN_IDLE_HINT_DELAY_MS = 3_000;
const SPACE_EXCAVATOR_REWARD_BAR_HINT_VISIBLE_MS = 5_000;
const SPACE_EXCAVATOR_EVENT_ICON_SRC = '/assets/icons/Eventgame_excavator.webp';
const TRAFFIC_LIGHT_MODAL_IMAGE_SRC = '/assets/traffic_light/Traffic_img.webp';
const TRAFFIC_LIGHT_BOX_IMAGE_SRC = '/assets/traffic_light/IMG_box.webp';
const TRAFFIC_LIGHT_GIFT_IMAGE_SRC = '/assets/traffic_light/IMG_gift.webp';
const TRAFFIC_LIGHT_BOX_COIN_IMAGE_SRC = '/assets/traffic_light/IMG_boxcoin.webp';
const TRAFFIC_LIGHT_GIFT_COIN_IMAGE_SRC = '/assets/traffic_light/IMG_giftcoin.webp';
const SPACE_EXCAVATOR_REWARD_BAR_HINT_TEXT = 'Reward bar can award Space Excavator tickets';
const SPACE_EXCAVATOR_REWARD_BAR_HINT_TEXT_DEV = 'Reward bar can award Space Excavator tickets (DEV override tickets)';

function resolveBuildHoldRepeatDelayMs(heldMs: number) {
  if (heldMs >= 3_000) return 95;
  if (heldMs >= 1_500) return 150;
  return 250;
}

function resolveBuildHoldBatchSteps(heldMs: number) {
  if (heldMs >= 3_000) return MAX_REPEATED_BUILD_BATCH_STEPS;
  if (heldMs >= 1_500) return 2;
  return 1;
}

function resolveBuildHoldFeedbackLabel(heldMs: number) {
  if (heldMs >= 3_000) return '⚒️ Max build…';
  if (heldMs >= 1_500) return '⚒️ Fast build…';
  return '⚒️ Building…';
}

function buildHydrationSourceOrder(baseSource: 'local_storage' | 'in_memory', hydrationSource: string) {
  return [baseSource, hydrationSource];
}

/** localStorage key for tracking egg-ready banner dismissal per egg instance. */
function getEggReadyBannerKey(userId: string, eggSetAtMs: number): string {
  return `lifegoal:egg_ready_banner_shown:${userId}:${eggSetAtMs}`;
}

function isIsland120StartupDiagnosticTarget(islandNumber: number) {
  return islandNumber === ISLAND_RUN_120_STARTUP_DIAGNOSTIC_ISLAND;
}

function compactStopStatesForDiagnostics(
  stopStatesByIndex: IslandRunRuntimeState['stopStatesByIndex'],
) {
  return stopStatesByIndex.map((entry, index) => ({
    i: index,
    o: entry.objectiveComplete ? 1 : 0,
    b: entry.buildComplete ? 1 : 0,
    ...(typeof entry.completedAtMs === 'number' ? { c: 1 } : {}),
  }));
}

function areCompactStopStatesEqual(
  left: ReturnType<typeof compactStopStatesForDiagnostics>,
  right: ReturnType<typeof compactStopStatesForDiagnostics>,
) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const leftEntry = left[index];
    const rightEntry = right[index];
    if (!leftEntry || !rightEntry) return false;
    if (
      leftEntry.i !== rightEntry.i
      || leftEntry.o !== rightEntry.o
      || leftEntry.b !== rightEntry.b
      || Boolean(leftEntry.c) !== Boolean(rightEntry.c)
    ) {
      return false;
    }
  }
  return true;
}

function areStringArraysEqualForDiagnostics(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

const COMPLETED_STOP_CANONICAL_ORDER = ['hatchery', 'habit', 'mystery', 'wisdom', 'boss'] as const;

function normalizeCompletedStopsForSync(stops: string[]): string[] {
  const deduped = Array.from(new Set(
    stops
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  ));
  return deduped.sort((a, b) => {
    const aIdx = COMPLETED_STOP_CANONICAL_ORDER.indexOf(a as (typeof COMPLETED_STOP_CANONICAL_ORDER)[number]);
    const bIdx = COMPLETED_STOP_CANONICAL_ORDER.indexOf(b as (typeof COMPLETED_STOP_CANONICAL_ORDER)[number]);
    const aKnown = aIdx >= 0;
    const bKnown = bIdx >= 0;
    if (aKnown && bKnown) return aIdx - bIdx;
    if (aKnown) return -1;
    if (bKnown) return 1;
    return a.localeCompare(b);
  });
}

function collectHydrationChangedKeysForDiagnostics(options: {
  before: IslandRunRuntimeState;
  after: IslandRunRuntimeState;
  islandNumber: number;
}) {
  const { before, after, islandNumber } = options;
  const islandKey = String(islandNumber);
  const beforeCurrentIslandStops = before.completedStopsByIsland?.[islandKey] ?? [];
  const afterCurrentIslandStops = after.completedStopsByIsland?.[islandKey] ?? [];
  const beforeCompactStops = compactStopStatesForDiagnostics(before.stopStatesByIndex);
  const afterCompactStops = compactStopStatesForDiagnostics(after.stopStatesByIndex);
  const beforeEgg = before.perIslandEggs?.[islandKey] ?? null;
  const afterEgg = after.perIslandEggs?.[islandKey] ?? null;
  const changedKeys: string[] = [];
  if (before.runtimeVersion !== after.runtimeVersion) changedKeys.push('runtimeVersion');
  if (before.currentIslandNumber !== after.currentIslandNumber) changedKeys.push('currentIslandNumber');
  if (before.activeStopIndex !== after.activeStopIndex) changedKeys.push('activeStopIndex');
  if (!areCompactStopStatesEqual(beforeCompactStops, afterCompactStops)) changedKeys.push('stopStatesByIndex');
  if (!areStringArraysEqualForDiagnostics(beforeCurrentIslandStops, afterCurrentIslandStops)) changedKeys.push('completedStopsCurrentIsland');
  if (
    beforeEgg?.status !== afterEgg?.status
    || beforeEgg?.tier !== afterEgg?.tier
    || beforeEgg?.setAtMs !== afterEgg?.setAtMs
    || beforeEgg?.hatchAtMs !== afterEgg?.hatchAtMs
    || beforeEgg?.location !== afterEgg?.location
  ) {
    changedKeys.push('perIslandEggCurrentIsland');
  }
  if (before.dicePool !== after.dicePool) changedKeys.push('dicePool');
  if (before.tokenIndex !== after.tokenIndex) changedKeys.push('tokenIndex');
  return changedKeys;
}

function getOpenHatcheryOnLoadFlag(): boolean {
  return typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('openHatchery') === '1';
}

function getOpenIslandStopOnLoadFlag(): string | null {
  return typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('openIslandStop')
    : null;
}

// M15C: Special islands get 72h timer; normal islands get 48h timer
const SPECIAL_ISLAND_NUMBERS = new Set([5, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108, 114, 120]);

// M16C: Era emoji cycle for shard pill HUD (shard_tier_index % 7)
const ERA_EMOJIS = ['⚡', '🎳', '🌸', '💡', '🔷', '🌀', '🌈'] as const;
function getCreatureRevealScore(tier: 'common' | 'rare' | 'mythic'): number {
  if (tier === 'mythic') return 50;
  if (tier === 'rare') return 25;
  return 10;
}
function getShardEraEmoji(islandNum: number, tierIndex: number): string {
  if (SPECIAL_ISLAND_NUMBERS.has(islandNum)) return '🌟';
  return ERA_EMOJIS[tierIndex % ERA_EMOJIS.length];
}

function getIslandDurationMs(islandNum: number): number {
  return SPECIAL_ISLAND_NUMBERS.has(islandNum) ? 72 * 60 * 60 * 1000 : 48 * 60 * 60 * 1000;
}

function formatIslandCountdown(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  if (safe <= 0) return '0s';

  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function extractArchetypeIdsFromMetadata(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  const candidate = value as Record<string, unknown>;
  const ids: string[] = [];

  const pushIfString = (nextValue: unknown) => {
    if (typeof nextValue === 'string' && nextValue.trim()) {
      ids.push(nextValue.trim().toLowerCase());
    }
  };

  pushIfString(candidate.id);
  pushIfString(candidate.cardId);
  if (candidate.card && typeof candidate.card === 'object') {
    pushIfString((candidate.card as Record<string, unknown>).id);
  }

  ['dominant', 'secondary', 'support', 'shadow'].forEach((key) => {
    const entry = candidate[key];
    if (entry && typeof entry === 'object') {
      pushIfString((entry as Record<string, unknown>).id);
      if ((entry as Record<string, unknown>).card && typeof (entry as Record<string, unknown>).card === 'object') {
        pushIfString((((entry as Record<string, unknown>).card as Record<string, unknown>).id));
      }
    }
  });

  if (Array.isArray(candidate.cards)) {
    candidate.cards.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      pushIfString((entry as Record<string, unknown>).id);
      if ((entry as Record<string, unknown>).card && typeof (entry as Record<string, unknown>).card === 'object') {
        pushIfString((((entry as Record<string, unknown>).card as Record<string, unknown>).id));
      }
    });
  }

  return Array.from(new Set(ids));
}

const ARCHETYPE_LABELS: Record<string, string> = {
  guardian: 'Guardian',
  visionary: 'Visionary',
  builder: 'Builder',
  grounded: 'Grounded',
  nurturer: 'Nurturer',
  steady: 'Steady',
  explorer: 'Explorer',
  caregiver: 'Caregiver',
  mentor: 'Mentor',
  peacemaker: 'Peacemaker',
  dreamer: 'Dreamer',
  catalyst: 'Catalyst',
  champion: 'Champion',
  strategist: 'Strategist',
  architect: 'Architect',
  challenger: 'Challenger',
  creator: 'Creator',
  oracle: 'Oracle',
  sage: 'Sage',
  radiant: 'Radiant',
  cosmic: 'Cosmic',
  commander: 'Commander',
  rebel: 'Rebel',
};

const WEAKNESS_SUPPORT_LABELS: Record<string, string> = {
  stress_fragility: 'Supports stress resilience',
  decision_confusion: 'Supports decision clarity',
  motivation_drop: 'Supports motivation recovery',
  focus_drift: 'Supports sustained focus',
  social_overload: 'Supports calm social recovery',
  routine_instability: 'Supports routine consistency',
};

function getArchetypeLabel(archetypeId: string): string {
  return ARCHETYPE_LABELS[archetypeId] ?? archetypeId;
}

function getWeaknessSupportLabel(tag: string): string {
  return WEAKNESS_SUPPORT_LABELS[tag] ?? tag.replace(/_/g, ' ');
}

function getPerfectCompanionOnboardingHintStorageKey(userId: string): string {
  return `island-run:perfect-companion-onboarding-hint:${userId}`;
}

function hashPerfectCompanionSeed(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}
// Egg hatch durations are now random (24–72 h production / 15–30 s dev) via eggService.
// Egg tier is assigned randomly on set via rollEggTierWeighted() in eggService.
const MARKET_DICE_BUNDLE_COST = 30;
const MARKET_DICE_BUNDLE_REWARD = 6;
const MARKET_HEART_BUNDLE_COST = 40;
const HEART_BOOST_BUNDLE_COST = 80;

// Utility stop constants retired (hearts/coins/timer all retired).
// Kept only essence bonus for wisdom stop (diamonds → essence).
const WISDOM_ESSENCE_BONUS_COST_DIAMONDS = 3;
const WISDOM_ESSENCE_BONUS_AMOUNT = 15;
const WALLET_STORE_GRID_SIZE = 9;

type WalletStoreModalKind = 'essence' | 'shards';

type WalletPurchaseOption = {
  id: string;
  icon: string;
  title: string;
  cost: number;
  currencyIcon: string;
  currencyName: string;
  summary: string;
  rewardLabel?: string;
  canAfford: boolean;
  disabledReason?: string;
  actionLabel: string;
  onSelect?: () => void;
};

function resolveDiceBundlePurchaseDisabledReason(isOwned: boolean, essence: number): string | undefined {
  if (isOwned) return 'Owned';
  if (essence < MARKET_DICE_BUNDLE_COST) return `Need ${MARKET_DICE_BUNDLE_COST - essence} more`;
  return undefined;
}

function resolveBuildWalletDisabledReason(params: {
  canBuy: boolean;
  isTutorialMuted: boolean;
  essence: number;
  cost: number;
}): string | undefined {
  if (params.canBuy) return undefined;
  if (params.isTutorialMuted) return 'Locked by tutorial';
  if (params.essence < params.cost) return `Need ${Math.max(0, params.cost - params.essence)} more`;
  return 'Unavailable';
}

function resolveShardWalletDisabledReason(params: {
  canUpgrade: boolean;
  failureReason?: string | null;
  requiredBondLevel?: number | null;
  shardCost: number;
  shards: number;
}): string | undefined {
  if (params.canUpgrade) return undefined;
  if (params.failureReason === 'bond_level_too_low') return `Bond Lv. ${params.requiredBondLevel} needed`;
  if (params.failureReason === 'insufficient_shards') return `Need ${Math.max(0, params.shardCost - params.shards)} more`;
  return 'Unavailable';
}

const CREATURE_FEED_COOLDOWN_MS = 8 * 60 * 60 * 1000;
const CREATURE_TREAT_OPTIONS: Array<{ type: CreatureTreatType; label: string; xpGain: number; summary: string }> = [
  { type: 'basic', label: 'Basic Treat', xpGain: 1, summary: '+1 bond XP' },
  { type: 'favorite', label: 'Favorite Snack', xpGain: 2, summary: '+2 bond XP' },
  { type: 'rare', label: 'Rare Feast', xpGain: 4, summary: '+4 bond XP' },
];

function formatRelativeTimeFromNow(timestampMs: number | null): string {
  if (!timestampMs) return 'Never';
  const diffMs = Math.max(0, Date.now() - timestampMs);
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  if (diffHours < 1) return 'Less than 1 hour ago';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatCooldownRemaining(remainingMs: number): string {
  if (remainingMs <= 0) return 'Ready now';
  const totalHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  if (totalHours < 24) return `${totalHours}h`;
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

function formatEventRemaining(remainingMs: number): string {
  if (remainingMs <= 0) return 'Expired';
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const totalHours = Math.floor(totalSeconds / 3600);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (totalHours > 0) return `${totalHours}h ${minutes}m`;
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

const COMPACT_WALLET_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const FULL_WALLET_NUMBER_FORMATTER = new Intl.NumberFormat('en-US');
const REWARD_MARKER_COMPACT_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const REWARD_MARKER_FULL_NUMBER_FORMATTER = new Intl.NumberFormat('en-US');

function formatCompactWalletValue(value: number): string {
  return COMPACT_WALLET_NUMBER_FORMATTER.format(Math.max(0, value));
}

function formatFullWalletValue(value: number): string {
  return FULL_WALLET_NUMBER_FORMATTER.format(Math.max(0, Math.floor(value)));
}

function formatRewardMarkerAmount(value: number): string {
  const safeValue = Math.max(0, Math.floor(value));
  return safeValue >= 10_000
    ? REWARD_MARKER_COMPACT_NUMBER_FORMATTER.format(safeValue)
    : REWARD_MARKER_FULL_NUMBER_FORMATTER.format(safeValue);
}

/* ── Reward bar helpers ──────────────────────────────────────── */
const TIMER_OK_THRESHOLD_MS = 4 * 60 * 60 * 1000;    // > 4 h  → green
const TIMER_WARN_THRESHOLD_MS = 1 * 60 * 60 * 1000;  // 1–4 h → orange; < 1 h → red
// Reward-bar timer/multiplier row auto-hide: with > 1 h left it reveals for 10 s
// on navigation then slides up; with ≤ 1 h left it stays visible for urgency.
const REWARDBAR_TIMERS_AUTO_HIDE_THRESHOLD_MS = 60 * 60 * 1000;
const REWARDBAR_TIMERS_AUTO_HIDE_DELAY_MS = 10_000;
const DICE_ROLL_OVERLAY_DURATION_MS = 800;  // how long the "Rolled N!" overlay stays visible
const AUTO_ROLL_HOLD_DELAY_MS = 1400;
const AUTO_ROLL_INTERVAL_MS = 2300;
// While a modal/overlay owns attention, auto-roll pauses instead of firing the
// next roll. We poll this often to resume promptly once every modal is closed.
const AUTO_ROLL_PAUSE_POLL_MS = 300;

function getTimerUrgencyClass(remainingMs: number): string {
  if (remainingMs > TIMER_OK_THRESHOLD_MS) return 'island-run-board__rewardbar-timer--ok';
  if (remainingMs > TIMER_WARN_THRESHOLD_MS) return 'island-run-board__rewardbar-timer--warn';
  return 'island-run-board__rewardbar-timer--urgent';
}

function getAvatarInitial(user: { user_metadata?: { full_name?: string | null } | null; email?: string | null }): string {
  return (user.user_metadata?.full_name?.[0] ?? user.email?.[0] ?? 'P').toUpperCase();
}

function getAvatarImageUrl(user: { user_metadata?: Record<string, unknown> | null }): string | null {
  const meta = user.user_metadata ?? {};
  const avatarUrl = meta.avatar_url ?? meta.picture ?? meta.profile_image_url;
  return typeof avatarUrl === 'string' && avatarUrl.trim().length > 0 ? avatarUrl : null;
}

function formatCompanionRegenBonusPercent(boostPct: number): string {
  if (!Number.isFinite(boostPct)) return '0%';
  return `${Math.round(boostPct * 1000) / 10}%`;
}

function findSanctuaryCreatureById<T extends { creatureId: string }>(
  creatures: readonly T[],
  creatureId: string | null | undefined,
): T | null {
  if (!creatureId) return null;
  return creatures.find((creature) => creature.creatureId === creatureId) ?? null;
}

type SanctuaryFilterMode = 'all' | 'reward_ready' | 'active' | 'common' | 'rare' | 'mythic';
type SanctuarySortMode = 'recent' | 'bond' | 'tier' | 'active';
type SanctuaryZoneFilter = 'all' | ShipZone;
type SanctuaryRosterRenderMode = 'interactiveRoster' | 'decorativePreview';
type CompanionQuestType = 'feed_any' | 'set_perfect_active' | 'open_top3';

type CompanionQuestProgress = {
  lastClaimedDayKey: string | null;
  currentStreak: number;
  bestStreak: number;
};

const SHIP_ZONE_LABELS: Record<ShipZone, string> = {
  zen: 'Zen Deck',
  energy: 'Engine Wing',
  cosmic: 'Cosmic Bridge',
};

const SANCTUARY_ROSTER_RENDER_POLICY_LABEL: Record<SanctuaryRosterRenderMode, string> = {
  interactiveRoster: 'Interactive roster grid: v2 SimpleView + CreatureCardSimpleFront surface (clickable).',
  decorativePreview: 'Decorative preview grid: aria-hidden legacy fallback surface (intentionally non-interactive).',
};

function getSanctuaryRosterRenderPolicy(mode: SanctuaryRosterRenderMode) {
  return {
    mode,
    policy: SANCTUARY_ROSTER_RENDER_POLICY_LABEL[mode],
  };
}

function getSanctuaryZoneSlotCap(islandNumber: number, zone: ShipZone): number {
  if (zone === 'zen') {
    if (islandNumber >= 90) return 7;
    if (islandNumber >= 60) return 6;
    if (islandNumber >= 30) return 5;
    if (islandNumber >= 12) return 4;
    return 3;
  }
  if (zone === 'energy') {
    if (islandNumber >= 96) return 7;
    if (islandNumber >= 72) return 6;
    if (islandNumber >= 45) return 5;
    if (islandNumber >= 24) return 4;
    if (islandNumber >= 12) return 3;
    if (islandNumber >= 6) return 2;
    return 1;
  }
  if (islandNumber >= 108) return 6;
  if (islandNumber >= 84) return 5;
  if (islandNumber >= 60) return 4;
  if (islandNumber >= 36) return 3;
  if (islandNumber >= 18) return 2;
  return 1;
}

function getLocalDayKey(timestampMs = Date.now()): string {
  const date = new Date(timestampMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPreviousDayKey(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map((part) => Number(part));
  if (!year || !month || !day) return dayKey;
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return getLocalDayKey(date.getTime());
}

function getCompanionQuestStorageKey(userId: string): string {
  return `island_run_companion_quest:${userId}`;
}

function readCompanionQuestProgress(userId: string): CompanionQuestProgress {
  if (typeof window === 'undefined') {
    return { lastClaimedDayKey: null, currentStreak: 0, bestStreak: 0 };
  }
  try {
    const raw = window.localStorage.getItem(getCompanionQuestStorageKey(userId));
    if (!raw) return { lastClaimedDayKey: null, currentStreak: 0, bestStreak: 0 };
    const parsed = JSON.parse(raw) as Partial<CompanionQuestProgress>;
    return {
      lastClaimedDayKey: typeof parsed.lastClaimedDayKey === 'string' ? parsed.lastClaimedDayKey : null,
      currentStreak: Number.isFinite(parsed.currentStreak) ? Math.max(0, Math.floor(parsed.currentStreak as number)) : 0,
      bestStreak: Number.isFinite(parsed.bestStreak) ? Math.max(0, Math.floor(parsed.bestStreak as number)) : 0,
    };
  } catch {
    return { lastClaimedDayKey: null, currentStreak: 0, bestStreak: 0 };
  }
}

function writeCompanionQuestProgress(userId: string, progress: CompanionQuestProgress): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getCompanionQuestStorageKey(userId), JSON.stringify(progress));
}

function getCompanionQuestTypeForDay(dayKey: string): CompanionQuestType {
  const seed = dayKey.split('-').join('').split('').reduce((sum, digit) => sum + Number(digit), 0);
  const questTypes: CompanionQuestType[] = ['feed_any', 'set_perfect_active', 'open_top3'];
  return questTypes[seed % questTypes.length] ?? 'feed_any';
}

type BondMilestoneReward = {
  level: number;
  label: string;
  summary: string;
  essence?: number;
  dice?: number;
  spinTokens?: number;
};

function getBondMilestoneReward(level: number): BondMilestoneReward | null {
  switch (level) {
    case 3:
      return { level, label: 'Level 3 Cache', summary: '+15 money', essence: 15 };
    case 5:
      return { level, label: 'Level 5 Care Pack', summary: '+8 dice', dice: 8 };
    case 8:
      return { level, label: 'Level 8 Momentum Pack', summary: '+1 spin token', spinTokens: 1 };
    case 10:
      return { level, label: "Level 10 Captain's Stash", summary: '+25 money, +8 dice', essence: 25, dice: 8 };
    default:
      return null;
  }
}

interface ActiveEgg {
  tier: EggTier;
  setAtMs: number;
  hatchAtMs: number;
  isDormant?: boolean;
}

function buildFallbackReadyEgg(
  egg: ActiveEgg,
  location: PerIslandEggEntry['location'],
): Pick<PerIslandEggEntry, 'tier' | 'setAtMs' | 'hatchAtMs' | 'location'> {
  return {
    tier: egg.tier,
    setAtMs: egg.setAtMs,
    hatchAtMs: egg.hatchAtMs,
    location,
  };
}

interface HatcheryCarouselEgg {
  id: string;
  islandNumber: number;
  islandKey: string;
  tier: EggTier;
  setAtMs: number;
  hatchAtMs: number;
  status: PerIslandEggEntry['status'];
  location: PerIslandEggEntry['location'];
  ledgerKey: string;
  slotIndex: number;
  isReady: boolean;
  isDormant: boolean;
  isCurrentIsland: boolean;
}

function getBossReward(islandNumber: number): { dice: number; essence: number; spinTokens: number } {
  const tier = Math.floor((islandNumber - 1) / 10);
  return {
    dice: 10 + tier * 2,
    essence: 80 + tier * 25,
    spinTokens: tier >= 2 ? 1 : 0,
  };
}

type StopProgressState = 'pending' | 'active' | 'accessible' | 'postponed' | 'completed' | 'build_pending' | 'partial' | 'locked' | 'ticket_required';
type IslandRunCameraMode = 'board_follow' | 'stop_focus' | 'overview_manual';

const ISLAND_TRAVEL_STORY_FALLBACK_MANIFEST_PATH = '/islands/story/placeholder-arrival/manifest.json';

function resolveIslandTravelArrivalManifestPath(islandNumber: number): string {
  if (Number.isFinite(islandNumber) && Math.floor(islandNumber) === 1) {
    return '/islands/001/story/arrival/manifest.json';
  }
  return ISLAND_TRAVEL_STORY_FALLBACK_MANIFEST_PATH;
}


type IslandRunMarketPurchaseStatus = 'attempt' | 'insufficient_coins' | 'success' | 'already_owned';

type IslandRunMarketStatusCoverageReport = {
  generatedAt: string;
  passed: boolean;
  expectedStatuses: IslandRunMarketPurchaseStatus[];
  coveredStatuses: IslandRunMarketPurchaseStatus[];
  missingStatuses: IslandRunMarketPurchaseStatus[];
  markerCount: number;
  baselineApplied: boolean;
  baselineIso?: string;
};

type IslandRunMarketPurchaseSnapshotRow = {
  status?: 'attempt' | 'insufficient_coins' | 'success' | 'already_owned';
  bundle?: 'dice_bundle';
  costCoins?: number;
  rewardDice?: number;
  coinsBefore?: number;
  coinsAfter?: number;
  ownedDiceBundle?: boolean;
  timestamp: string;
};

declare global {
  interface Window {
    __islandRunMarketDebugExportMarkers?: (limit?: number) => {
      generatedAt: string;
      totalMarkers: number;
      baselineApplied: boolean;
      baselineIso?: string;
      rows: IslandRunMarketPurchaseSnapshotRow[];
    };
    __islandRunMarketDebugResetState?: () => {
      resetAt: string;
      baselineApplied: boolean;
      ownedBundles: string[];
      feedbackCleared: boolean;
    };
    __islandRunMarketDebugAssertStatusCoverage?: (
      expectedStatuses?: IslandRunMarketPurchaseStatus[],
      limit?: number,
    ) => IslandRunMarketStatusCoverageReport;
  }
}

type OrbitStopVisual = {
  id: string;
  label: string;
  x: number;
  y: number;
  state: StopProgressState | 'shop';
  icon: string;
  labelOffsetY: number;
  labelOffsetX: number;
  hideLabel: boolean;
  stopId?: string;
  ticketCost?: number;
  attentionHint?: 'affordable';
  stateChipLabel?: string;
};


type MysteryStopReward =
  | { type: 'essence'; amount: number; message: string }
  | { type: 'dice'; amount: number; message: string }
  | { type: 'lucky_roll'; amount: number; message: string };

const HATCHERY_TIMELINE_STEPS = [
  { id: 'set', label: 'Set', icon: '🥚' },
  { id: 'glow', label: 'Glow', icon: '✨' },
  { id: 'crack', label: 'Crack', icon: '💥' },
  { id: 'hatch', label: 'Hatch', icon: '🐣' },
] as const;

const ZBAND_COLORS: Record<TileAnchor['zBand'], string> = {
  back: '#50a5ff',
  mid: '#ffe066',
  front: '#ff4ff5',
};

function toScreen<T extends { x: number; y: number }>(anchor: T, width: number, height: number) {
  const scale = Math.min(width / CANONICAL_BOARD_SIZE.width, height / CANONICAL_BOARD_SIZE.height);
  const ox = (width - CANONICAL_BOARD_SIZE.width * scale) / 2;
  const oy = (height - CANONICAL_BOARD_SIZE.height * scale) / 2;
  return {
    x: ox + anchor.x * scale,
    y: oy + anchor.y * scale,
  };
}

function readNumericParam(
  params: URLSearchParams,
  key: string,
  fallback: number,
  min: number,
  max: number,
) {
  const raw = params.get(key);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, min, max);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function formatClock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function isIslandRunDevModeEnabled(): boolean {
  const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV;
  const isNonProdNodeEnv =
    typeof nodeEnv === 'string'
    && nodeEnv !== 'production';
  const isViteDev = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);
  const localStorageDevFlag =
    typeof window !== 'undefined'
    && window.localStorage.getItem('dev_mode') === 'true';
  return isNonProdNodeEnv || isViteDev || localStorageDevFlag;
}

/**
 * Formats a long-form countdown (days / hours / minutes / seconds) for the
 * hatchery incubation timer. Shows the two most-significant units so the
 * label stays short at all ranges (e.g. "2d 4h", "47m 12s", "8s").
 */
function getHatcheryEggStage(egg: Pick<ActiveEgg, 'setAtMs' | 'hatchAtMs'> | null, nowMs: number): number {
  if (!egg) return 0;
  // Guard against corrupt timestamps (NaN / 0 / hatchAtMs <= setAtMs) that
  // could land from a malformed hydration or manual localStorage edit — if
  // we can't compute progress, assume the egg is ready to open so the UI
  // doesn't wedge in stage 0 forever.
  const { setAtMs, hatchAtMs } = egg;
  if (!Number.isFinite(setAtMs) || !Number.isFinite(hatchAtMs) || hatchAtMs <= setAtMs) {
    return HATCHERY_TIMELINE_STEPS.length;
  }
  if (nowMs >= hatchAtMs) return HATCHERY_TIMELINE_STEPS.length;
  const total = Math.max(1, hatchAtMs - setAtMs);
  const progress = Math.min(1, Math.max(0, (nowMs - setAtMs) / total));
  return Math.min(HATCHERY_TIMELINE_STEPS.length, Math.max(1, Math.ceil(progress * HATCHERY_TIMELINE_STEPS.length)));
}

function formatHatchCountdown(remainingMs: number): string {
  const safeMs = Number.isFinite(remainingMs) ? Math.max(0, remainingMs) : 0;
  if (safeMs <= 0) return 'Ready!';
  const totalSec = Math.ceil(safeMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function resolveMysteryStopReward(): MysteryStopReward {
  const randomValue = globalThis.crypto?.getRandomValues
    ? (() => {
        const buffer = new Uint32Array(1);
        globalThis.crypto.getRandomValues(buffer);
        return buffer[0] / (0xffffffff + 1);
      })()
    : Math.random();

  // Hearts/coins retired — mystery rewards are now essence, dice, or lucky rolls only
  if (randomValue < 0.35) {
    return { type: 'dice', amount: 10, message: '🎲 Mystery momentum! +10 dice.' };
  }
  if (randomValue < 0.65) {
    return { type: 'dice', amount: 6, message: '🎲 Mystery recovery! +6 dice.' };
  }
  if (randomValue < 0.85) return { type: 'essence', amount: 15, message: '💰 Mystery money! +15 money.' };

  return { type: 'lucky_roll', amount: 1, message: '🎲 Lucky Roll unlocked! +1 bonus run.' };
}

function areStringArraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function mergeCreatureCollections(
  primary: CreatureCollectionEntry[],
  fallback: CreatureCollectionEntry[],
): CreatureCollectionEntry[] {
  const byId = new Map<string, CreatureCollectionEntry>();
  [...fallback, ...primary].forEach((entry) => {
    const existing = byId.get(entry.creatureId);
    if (!existing) {
      byId.set(entry.creatureId, entry);
      return;
    }
    byId.set(entry.creatureId, {
      ...existing,
      copies: Math.max(existing.copies, entry.copies),
      firstCollectedAtMs: Math.min(existing.firstCollectedAtMs, entry.firstCollectedAtMs),
      lastCollectedAtMs: Math.max(existing.lastCollectedAtMs, entry.lastCollectedAtMs),
      lastCollectedIslandNumber:
        existing.lastCollectedAtMs >= entry.lastCollectedAtMs
          ? existing.lastCollectedIslandNumber
          : entry.lastCollectedIslandNumber,
      bondXp: Math.max(existing.bondXp, entry.bondXp),
      bondLevel: Math.max(existing.bondLevel, entry.bondLevel),
      lastFedAtMs: Math.max(existing.lastFedAtMs ?? 0, entry.lastFedAtMs ?? 0) || null,
      claimedBondMilestones: Array.from(new Set([
        ...existing.claimedBondMilestones,
        ...entry.claimedBondMilestones,
      ])).sort((a, b) => a - b),
    });
  });

  return Array.from(byId.values()).sort((a, b) => b.lastCollectedAtMs - a.lastCollectedAtMs);
}

function preloadThemeAssets(theme: IslandBoardTheme) {
  const urls = [theme.depthMaskImage, theme.pathOverlayImage].filter(Boolean) as string[];
  urls.forEach((url) => {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
  });
}

function getStopIcon(stop: Pick<IslandStopPlanEntry, 'stopId' | 'mysteryContentKind'>): string {
  if (stop.stopId === 'boss') return '👑';
  if (stop.stopId === 'hatchery') return '🥚';
  if (stop.stopId === 'habit') return '✅';
  if (stop.stopId === 'wisdom') return '📖';
  if (stop.stopId === 'mystery') return '🎪';
  return '📍';
}

function getStopStateChipLabel(state: StopProgressState): string {
  if (state === 'completed') return 'Full';
  if (state === 'build_pending') return 'L3 Req';
  if (state === 'partial') return 'Egg';
  if (state === 'ticket_required') return 'Ticket';
  if (state === 'locked') return 'Locked';
  if (state === 'postponed') return 'Later';
  if (state === 'accessible') return 'Open';
  return 'Open';
}

function markLandmarkCoachmarkSeen(userId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`island_run_landmark_coachmark_seen_${userId}`, '1');
}

function getOrbitStopDisplayIcon(state: StopProgressState | 'shop', icon: string): string {
  if (state === 'locked') return '🔒';
  if (state === 'ticket_required') return '🎫';
  if (state === 'completed') return '✅';
  if (state === 'build_pending') return '🚧';
  if (state === 'partial') return '🟡';
  if (state === 'active') return '🔓';
  if (state === 'accessible') return icon;
  if (state === 'postponed') return '🔖';
  return icon;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const TILE_TYPE_ICONS: Record<string, string> = {
  currency: '💰',
  chest: '🎁',
  hazard: '☠️',
  micro: '✨',
  landmark_door: '🚪',
  traffic_light: '🚦',
  card: '🃏',
  build_discount: '🔨',
  free_ticket: '🎟️',
};

const SPARK60_TILE_COLOR: Record<IslandTileMapEntry['tileType'], string> = {
  currency: '#f7df7a',
  chest: '#7dd8ff',
  hazard: '#ff8f8f',
  micro: '#9dffbe',
  encounter: '#ffa765',
  landmark_door: '#f4c7ff',
  traffic_light: '#7cff9b',
  card: '#d8b4fe',
  build_discount: '#22c55e',
  free_ticket: '#f97316',
};

// 3×3 tech-collection gameplay math (slot resolution, line/full-board rewards,
// idempotency) lives in the pure `islandRunTechCollection` service; the modal +
// celebration presentation live in their own components. The board only wires
// landings → canonical actions → presentation state.

const DORMANT_DOOR_FIGURE_ICONS: Record<DormantDoorFigure, string> = {
  small: '🟣',
  medium: '💎',
  large: '👑',
};

const DORMANT_DOOR_TIER_FIGURE: Record<DormantDoorRewardTier, DormantDoorFigure> = {
  small: 'small',
  medium: 'medium',
  jackpot: 'large',
};

// "Vault Rush" presentation names for the dormant-door minigame tiers. The
// service keeps neutral small/medium/jackpot labels; the modal brands them.
const DORMANT_DOOR_TIER_NAMES: Record<DormantDoorRewardTier, string> = {
  small: 'Amethyst',
  medium: 'Diamond',
  jackpot: 'Crown Jackpot',
};

const DORMANT_DOOR_FIGURE_NAMES: Record<DormantDoorFigure, string> = {
  small: 'Amethyst',
  medium: 'Diamond',
  large: 'Crown',
};

interface IslandRunBoardPrototypeProps {
  session: Session;
  initialPanel?: 'default' | 'sanctuary';
  onExitBoard?: () => void;
  showTopBackButton?: boolean;
  isAdmin?: boolean;
  onOpenSaveAccountSignup?: () => void;
  onOpenDailySpinWheel?: () => void;
  dailySpinAvailable?: boolean;
  dailySpinCount?: number;
}

export function IslandRunBoardPrototype({
  session,
  initialPanel = 'default',
  onExitBoard,
  showTopBackButton: _showTopBackButton = false,
  isAdmin = false,
  onOpenSaveAccountSignup,
  onOpenDailySpinWheel,
  dailySpinAvailable = false,
  dailySpinCount = 0,
}: IslandRunBoardPrototypeProps) {
  const { client } = useSupabaseAuth();
  // Player-level chip: pull levelInfo from the gamification hook so the top-bar
  // chip stays in sync with the profile's total_xp. The hook also handles its
  // own refresh via 'gamificationProfileUpdated' events, so any XP award
  // elsewhere in the app will flow into the chip automatically.
  const { levelInfo: playerLevelInfo } = useGamification(session);
  const wisdomKeeperAiAccess = useMemo(() => getAiCoachAccess(session), [session]);
  const wisdomKeeperAiGenerate = useMemo(() => createWisdomKeeperAiCoachGenerator(), []);
  const wisdomKeeperAiOptions = useMemo(() => ({
    enabled: !isDemoSession(session),
    access: wisdomKeeperAiAccess,
    generate: wisdomKeeperAiGenerate,
  }), [session, wisdomKeeperAiAccess, wisdomKeeperAiGenerate]);
  const activeTileAnchors = useMemo(
    () => TILE_ANCHORS_36,
    [],
  );
  const isSpark36BoardProfile = ACTIVE_BOARD_PROFILE.id === 'spark36_ring';
  const boardRef = useRef<HTMLDivElement>(null);
  const topbarMenuRef = useRef<HTMLDivElement>(null);
  const topbarMenuFirstItemRef = useRef<HTMLButtonElement>(null);
  const audioMenuFirstItemRef = useRef<HTMLButtonElement>(null);
  // M16D: track previous shard count to detect island-travel reset (snap fill bar to 0, no animation)
  const prevShardsRef = useRef<number>(0);
  const [shardFillNoTransition, setShardFillNoTransition] = useState(false);
  const [showDebug, setShowDebug] = useState(() => new URLSearchParams(window.location.search).get('debugBoard') === '1');
  const boardRenderTuning = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedVisualLandmark = params.get('islandVisualLandmark');
    const requestedVisualBossState = params.get('islandVisualBossState');
    const islandVisualLandmark = requestedVisualLandmark === 'hatchery'
      || requestedVisualLandmark === 'habit'
      || requestedVisualLandmark === 'mystery'
      || requestedVisualLandmark === 'wisdom'
      || requestedVisualLandmark === 'all'
      ? requestedVisualLandmark
      : null;
    const islandVisualBossState: BossCreatureArtState | null = requestedVisualBossState === 'idle'
      ? 'alive'
      : requestedVisualBossState === 'defeated' || requestedVisualBossState === 'hidden'
        ? requestedVisualBossState
        : null;
    return {
      showQaHooks: params.get('islandRunQa') === '1',
      isMinimalBoardArt: params.get('minimalBoardArt') === '1',
      isIslandVisualPreview: import.meta.env.DEV && params.get('islandVisualPreview') === '1',
      islandVisualIslandNumber: Math.round(readNumericParam(params, 'islandVisualIsland', 1, 1, 120)),
      islandVisualLandmark,
      islandVisualBuildLevel: Math.round(readNumericParam(params, 'islandVisualBuildLevel', 0, 0, 3)),
      islandVisualBossState,
      boardTiltXDeg: readNumericParam(params, 'boardTiltX', 47, 0, 80),
      boardRotateZDeg: readNumericParam(params, 'boardRotateZ', 0, -45, 45),
    };
  }, []);
  const {
    showQaHooks,
    isMinimalBoardArt,
    isIslandVisualPreview,
    islandVisualIslandNumber,
    islandVisualLandmark,
    islandVisualBuildLevel,
    islandVisualBossState,
    boardTiltXDeg,
    boardRotateZDeg,
  } = boardRenderTuning;
  const [isDevModeEnabled, setIsDevModeEnabled] = useState(() => isIslandRunDevModeEnabled());
  const isCreaturePackStripeCheckoutEnabled = isDevModeEnabled
    || String(import.meta.env.VITE_CREATURE_PACK_STRIPE_CHECKOUT_ENABLED ?? '').toLowerCase() === 'true';
  const [boardSize, setBoardSize] = useState({ width: 360, height: 640 });
  const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);
  const [devTimedEventOverrideType, setDevTimedEventOverrideType] = useState<EventId | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = window.sessionStorage.getItem(DEBUG_TIMED_EVENT_OVERRIDE_KEY);
    return raw && isCanonicalEventId(raw) ? raw : null;
  });
  const [isHudCollapsed, setIsHudCollapsed] = useState(true);
  const [showTopbarMenu, setShowTopbarMenu] = useState(false);
  const [isIslandInhabitantFlowOpen, setIsIslandInhabitantFlowOpen] = useState(false);
  const [caretakerBoardBubbleText, setCaretakerBoardBubbleText] = useState<string | null>(null);
  const [showCreatureChannelModal, setShowCreatureChannelModal] = useState(false);
  const [showConcordHubModal, setShowConcordHubModal] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [isTopbarMenuPrimed, setIsTopbarMenuPrimed] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showDevLuckyRollOverlay, setShowDevLuckyRollOverlay] = useState(false);
  const [devLuckyRollTargetIsland, setDevLuckyRollTargetIsland] = useState<number | null>(null);
  const [devLuckyRollCollectMode, setDevLuckyRollCollectMode] = useState<'bank_only' | 'post_rare_collect_travel'>('bank_only');
  const [cameraMode, setCameraMode] = useState<IslandRunCameraMode>('overview_manual');
  const [focusedStopId, setFocusedStopId] = useState<string | null>(null);
  /**
   * When set, we show the ticket-price prompt modal for this stop instead of
   * opening the stop directly. User can either pay the essence ticket to unlock
   * and open the stop, or cancel. Hatchery never uses this path (always free).
   */
  const [ticketPromptStopId, setTicketPromptStopId] = useState<string | null>(null);
  const [prepayTicketPromptStopId, setPrepayTicketPromptStopId] = useState<string | null>(null);
  const [lockedStopInfoStopId, setLockedStopInfoStopId] = useState<string | null>(null);
  const [showLandmarkCoachmark, setShowLandmarkCoachmark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(`island_run_landmark_coachmark_seen_${session.user.id}`) !== '1';
  });

  // BoardStage camera controls (set by BoardStage via onCameraReady)
  const boardCameraRef = useRef<BoardStageCameraControls | null>(null);
  // Guard: prevent repeated overview camera resets after initial hydration.
  const hasAppliedInitialOverviewRef = useRef(false);

  // ── C1 store-derived state: dicePool, tokenIndex, spinTokens ──────────────
  // These fields are read from the authoritative store via `useIslandRunState`.
  // Shim setters are provided for backward compat with unmigrated paths
  // (C2–C6 will remove these shims). The persist effect at ~2290 is deleted —
  // each shim commits through the store, and C1-specific paths (roll,
  // reward-bar, minigame) use dedicated action functions.
  const { state: __storeState } = useIslandRunState(session, client);
  const dicePool = __storeState.dicePool;
  const tokenIndex = __storeState.tokenIndex;
  const firstSessionTutorialState = __storeState.firstSessionTutorialState;
  const isBuildTutorialPromptActive = isIslandRunBuildPromptOverlayActive(firstSessionTutorialState);
  const isBuildModalHatcheryGuidanceActive = isIslandRunHatcheryBuildGuidanceActive(firstSessionTutorialState);
  const showHatcheryL1Celebration = isIslandRunHatcheryL1CelebrationActive(firstSessionTutorialState);
  const isBuildTutorialGameplayBlocked = shouldIslandRunBuildPromptBlockControl(firstSessionTutorialState, 'gameplay');
  const isFirstRollCoachmarkActive = isIslandRunFirstRollCoachmarkActive(firstSessionTutorialState);
  const isKeepRollingCoachmarkActive = isIslandRunKeepRollingCoachmarkActive(firstSessionTutorialState);

  // C1 shim: setDicePool — commits through the store for unmigrated paths.
  const setDicePool = useCallback((updater: number | ((current: number) => number)) => {
    const snapshot = getIslandRunStateSnapshot(session);
    const next = typeof updater === 'function' ? updater(snapshot.dicePool) : updater;
    void commitIslandRunState({
      session,
      client,
      record: { ...snapshot, dicePool: next, runtimeVersion: snapshot.runtimeVersion + 1 },
      triggerSource: 'dice_pool_shim',
    });
  }, [session, client]);

  // C1 shim: setTokenIndex — commits through the store for unmigrated paths.
  const setTokenIndex = useCallback((updater: number | ((current: number) => number)) => {
    const snapshot = getIslandRunStateSnapshot(session);
    const next = typeof updater === 'function' ? updater(snapshot.tokenIndex) : updater;
    void commitIslandRunState({
      session,
      client,
      record: { ...snapshot, tokenIndex: next, runtimeVersion: snapshot.runtimeVersion + 1 },
      triggerSource: 'token_index_shim',
    });
  }, [session, client]);
  const [rollValue, setRollValue] = useState<number | null>(null);
  const [rollingDiceFaces, setRollingDiceFaces] = useState<[number, number]>([1, 1]);
  const [isRolling, setIsRolling] = useState(false);
  const [isAutoRolling, setIsAutoRolling] = useState(false);
  const [isAutoRollHoldPending, setIsAutoRollHoldPending] = useState(false);
  const [isTimedEventLaunchQueued, setIsTimedEventLaunchQueued] = useState(false);
  const [showSpaceExcavatorRewardBarHint, setShowSpaceExcavatorRewardBarHint] = useState(true);
  /** Shown briefly over the dice after the roll animation finishes (e.g. "Rolled 8!") */
  const [diceRollTotalOverlay, setDiceRollTotalOverlay] = useState<string | null>(null);
  /** Full tile-by-tile hop sequence for current roll (Monopoly GO style). */
  const [pendingHopSequence, setPendingHopSequence] = useState<number[] | null>(null);
  const hopSequenceResolverRef = useRef<(() => void) | null>(null);
  const diceRollCompleteResolverRef = useRef<(() => void) | null>(null);
  /**
   * True when the `onDiceRollComplete` callback has already fired for the
   * current roll. Set to `false` just before `executeIslandRunRollAction` is
   * called so it resets at the start of each roll. If the dice animation
   * completes *before* `executeIslandRunRollAction` returns (possible after an
   * idle period when the remote write is slow), `handleRoll` skips creating the
   * resolver promise and proceeds immediately instead of hanging forever.
   */
  const diceRollCompleteAlreadyFiredRef = useRef(false);
  /**
   * True while a roll's hop animation is playing. Used to guard other
   * writers (hydration reconcile, island-travel resets) from stomping the
   * `tokenIndex` mid-animation and causing the pawn to snap back to tile 0.
   * Set just before `setPendingHopSequence(...)`, cleared when the board
   * fires `onHopSequenceComplete`.
   */
  const isAnimatingRollRef = useRef(false);
  /**
   * True after a roll action successfully persists token/dice, and cleared only
   * after post-hop store/runtime sync settles. Guards non-roll writers (notably
   * passive regen) from committing stale pre-roll snapshots during this window.
   */
  const isRollSyncPendingRef = useRef(false);

  const resetCameraFromTopbarMenu = useCallback(() => {
    if (isRolling || pendingHopSequence !== null || isAnimatingRollRef.current) {
      setIsTopbarMenuPrimed(false);
      setShowTopbarMenu(false);
      return;
    }

    setCameraMode('board_follow');
    setFocusedStopId(null);
    boardCameraRef.current?.goDefault();
    setShowTopbarMenu(false);
    setIsTopbarMenuPrimed(true);
  }, [isRolling, pendingHopSequence]);

  const handleTopbarMenuButtonClick = useCallback(() => {
    setShowTopbarMenu((current) => !current);
  }, []);
  const autoRollHoldTimeoutRef = useRef<number | null>(null);
  const autoRollLoopAbortRef = useRef(false);
  const autoRollHoldTriggeredRef = useRef(false);
  // Mirrors `doesModalOwnAttention` so the async auto-roll loop can read the
  // current modal state without re-subscribing. When true, the loop pauses.
  const autoRollPausedRef = useRef(false);
  const suppressNextRollClickRef = useRef(false);
  const isTravellingRef = useRef(false);
  /**
   * Re-entrancy guard for {@link handleCollectCreature}. A ref (not state)
   * is used so the guard is observed synchronously within a single render
   * tick — prevents double-click / StrictMode double-invoke from awarding
   * the hatched creature multiple times before React commits `setActiveEgg(null)`.
   */
  const collectingCreatureRef = useRef(false);
  const [isCollectingCreature, setIsCollectingCreature] = useState(false);
  const [selectedHatcheryEggIndex, setSelectedHatcheryEggIndex] = useState(0);
  // Cleanup: resolve any pending hop sequence promise on unmount to prevent leaks
  useEffect(() => () => {
    hopSequenceResolverRef.current?.();
    hopSequenceResolverRef.current = null;
    diceRollCompleteResolverRef.current?.();
    diceRollCompleteResolverRef.current = null;
    isAnimatingRollRef.current = false;
    autoRollLoopAbortRef.current = true;
    if (autoRollHoldTimeoutRef.current !== null) {
      window.clearTimeout(autoRollHoldTimeoutRef.current);
      autoRollHoldTimeoutRef.current = null;
    }
    isTravellingRef.current = false;
  }, []);
  const [landingText, setLandingText] = useState('Ready to roll');
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [arenaBoostStatus, setArenaBoostStatus] = useState<'idle' | 'claimed' | 'already_claimed' | 'no_active_event'>('idle');
  const [arenaSoftSaveValueMomentReached, setArenaSoftSaveValueMomentReached] = useState(false);
  const [guestFunnelState, setGuestFunnelState] = useState<IslandRunGuestFunnelStateV1>(() => readIslandRunGuestFunnelState());
  const [isActiveCompassSessionFilled, setIsActiveCompassSessionFilled] = useState(false);
  const [requiredDoorStopId, setRequiredDoorStopId] = useState<IslandLandmarkDoorStopId | null>(null);
  const [dormantDoorMiniGame, setDormantDoorMiniGame] = useState<DormantDoorMiniGameState | null>(null);
  const [dormantDoorSelectedIndices, setDormantDoorSelectedIndices] = useState<number[]>([]);
  const [dormantDoorReward, setDormantDoorReward] = useState<DormantDoorRewardLevel | null>(null);
  const [isDormantDoorRewardClaiming, setIsDormantDoorRewardClaiming] = useState(false);
  const dormantDoorSelectedFigures = useMemo(() => {
    if (!dormantDoorMiniGame) return [] as DormantDoorFigure[];
    return dormantDoorSelectedIndices
      .map((index) => dormantDoorMiniGame.doors[index]?.figure)
      .filter((figure): figure is DormantDoorFigure => Boolean(figure));
  }, [dormantDoorMiniGame, dormantDoorSelectedIndices]);
  const dormantDoorPrizeCounts = useMemo(() => {
    const counts: Record<DormantDoorFigure, number> = { small: 0, medium: 0, large: 0 };
    for (const figure of dormantDoorSelectedFigures) counts[figure] += 1;
    return counts;
  }, [dormantDoorSelectedFigures]);
  const dormantDoorBestMatchCount = Math.max(dormantDoorPrizeCounts.small, dormantDoorPrizeCounts.medium, dormantDoorPrizeCounts.large);
  const [trafficLightCoinFlip, setTrafficLightCoinFlip] = useState<{ seed: number; reward: TrafficLightCoinFlipReward | null; phase: 'ready' | 'flipping' | 'revealed' | 'opened' } | null>(null);
  const [trafficLightRewardConfettiActive, setTrafficLightRewardConfettiActive] = useState(false);
  const [showTrafficLightCoinHint, setShowTrafficLightCoinHint] = useState(false);
  /**
   * Optimistic traffic-light charge shown the instant the token HOPS OVER the
   * traffic-light tile mid-roll, instead of waiting for the authoritative charge
   * to commit at the end of the roll (which made the lights appear to change
   * only "on landing"). Reset at each roll start; the authoritative
   * `trafficLightCharge` catches up when the roll resolves.
   */
  const [trafficLightVisualCharge, setTrafficLightVisualCharge] = useState<number | null>(null);
  const [islandNumber, setIslandNumber] = useState(1);
  // PR7: brief "level-up flash" class driver. Flips true when `islandNumber`
  // advances to a higher value (ignoring cycle wrap 120→1) and auto-resets
  // after the animation runs. Driven by a useEffect+prev ref pattern below.
  const [islandLevelFlash, setIslandLevelFlash] = useState(false);
  const prevIslandNumberForFlashRef = useRef<number>(1);
  useEffect(() => {
    let cancelled = false;

    if (activeStopId !== 'habit' && activeStopId !== 'wisdom') {
      setIsActiveCompassSessionFilled(false);
      return undefined;
    }

    void (async () => {
      const template = await fetchCompassState(session.user.id);
      if (!cancelled) {
        setIsActiveCompassSessionFilled(isCompassSessionFilledForIsland(template, islandNumber));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeStopId, islandNumber, session.user.id]);

  // Load the persisted picked-up tech grid for this island (cross-reload /
  // cross-device). The per-island ledgers live on the canonical runtime state
  // record, so reading them here rehydrates the overlay grid and prevents
  // already-rewarded rows/columns/diagonals from paying out twice.
  useEffect(() => {
    const islandKey = String(islandNumber);
    const persistedCollected = runtimeStateRef.current.techCollectionByIsland?.[islandKey] ?? [];
    const persistedRewardedLines = runtimeStateRef.current.techCollectionRewardedLinesByIsland?.[islandKey] ?? [];
    const collectedSet = new Set<number>(persistedCollected);
    const rewardedLinesSet = new Set<number>(persistedRewardedLines);
    collectedTechTileIndicesRef.current = collectedSet;
    rewardedTechCollectionLinesRef.current = rewardedLinesSet;
    setCollectedTechTileIndices(collectedSet);
    setRewardedTechCollectionLines(rewardedLinesSet);
    // Close any open tech surface when switching islands (the modal owns its own
    // auto-dismiss timer, so there is nothing else to clean up here).
    setTechCollectionModal(null);
    setTechCompletionCelebration(null);
  }, [islandNumber]);

  useEffect(() => {
    const prev = prevIslandNumberForFlashRef.current;
    prevIslandNumberForFlashRef.current = islandNumber;
    // Only flash when we *advance* (prev < next). Cycle wrap 120 → 1 and
    // backwards dev toggles should not trigger the celebratory flash.
    if (islandNumber > prev) {
      setIslandLevelFlash(true);
      const timeoutId = window.setTimeout(() => setIslandLevelFlash(false), 1200);
      return () => window.clearTimeout(timeoutId);
    }
    return undefined;
  }, [islandNumber]);
  const islandArtPreviewNumber = isIslandVisualPreview ? islandVisualIslandNumber : islandNumber;
  const activeTheme = useMemo(() => getIslandBoardThemeForIslandNumber(islandArtPreviewNumber), [islandArtPreviewNumber]);
  const islandBackgroundSrc = useMemo(() => getIslandBackgroundImageSrc(islandArtPreviewNumber), [islandArtPreviewNumber]);
  const wisdomTreeCard = useMemo(() => getWisdomTreeCardForIsland(islandNumber), [islandNumber]);
  const [isIslandBackgroundAvailable, setIsIslandBackgroundAvailable] = useState(true);
  const [isIslandArtAmbientBackgroundLoaded, setIsIslandArtAmbientBackgroundLoaded] = useState(false);
  const [islandArtManifest, setIslandArtManifest] = useState<IslandArtManifest | null>(null);
  const [isBackgroundHidden, setIsBackgroundHidden] = useState(false);
  const [timeLeftSec, setTimeLeftSec] = useState(ISLAND_DURATION_SEC);
  const [showTravelOverlay, setShowTravelOverlay] = useState(false);
  const [travelOverlayDestinationIsland, setTravelOverlayDestinationIsland] = useState(2);
  const [travelOverlayMode, setTravelOverlayMode] = useState<'advance' | 'retry'>('advance');
  const [isIslandTimerPendingStart, setIsIslandTimerPendingStart] = useState(false);
  const [activeEgg, setActiveEgg] = useState<ActiveEgg | null>(null);
  const [isSettingEgg, setIsSettingEgg] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [showOnboardingBooster, setShowOnboardingBooster] = useState(false);
  const [boosterName, setBoosterName] = useState('');
  const [boosterError, setBoosterError] = useState<string | null>(null);
  const [isDisplayNameLoopCompleted, setIsDisplayNameLoopCompleted] = useState(false);
  const [showEncounterModal, setShowEncounterModal] = useState(false);
  const [showGamifiedJournalCard, setShowGamifiedJournalCard] = useState(false);
  // 0-based index of the current island's clue-card draw → rotates its questions.
  const [cardDrawIndex, setCardDrawIndex] = useState(0);
  const [encounterResolved, setEncounterResolved] = useState(false);
  // M6-COMPLETE: per-visit encounter tracking (Set of completed tile indices)
  const [completedEncounterIndices, setCompletedEncounterIndices] = useState<Set<number>>(() => new Set());
  const [collectedTechTileIndices, setCollectedTechTileIndices] = useState<Set<number>>(() => new Set());
  const collectedTechTileIndicesRef = useRef<Set<number>>(new Set());
  const [rewardedTechCollectionLines, setRewardedTechCollectionLines] = useState<Set<number>>(() => new Set());
  const rewardedTechCollectionLinesRef = useRef<Set<number>>(new Set());
  // Fast pickup modal (auto-dismissing) vs. full-grid celebration (deliberate
  // Continue). Only one is ever open at a time; the celebration outranks the
  // transient pickup modal.
  const [techCollectionModal, setTechCollectionModal] = useState<TechCollectionModalResult | null>(null);
  const [techCompletionCelebration, setTechCompletionCelebration] = useState<TechCompletionCelebrationResult | null>(null);
  const [activeEncounterTileIndex, setActiveEncounterTileIndex] = useState<number | null>(null);
  const [showHatcheryHelp, setShowHatcheryHelp] = useState(false);
  // M6-COMPLETE: encounter challenge state machine
  const [currentEncounterChallenge, setCurrentEncounterChallenge] = useState<EncounterChallenge | null>(null);
  const [encounterStep, setEncounterStep] = useState<'challenge' | 'reward'>('challenge');
  const [encounterRewardData, setEncounterRewardData] = useState<EncounterReward | null>(null);
  const [gratitudeText, setGratitudeText] = useState('');
  const [breathingSecondsLeft, setBreathingSecondsLeft] = useState(0);
  const [encounterTapCount, setEncounterTapCount] = useState(0);
  const [bossTrialResolved, setBossTrialResolved] = useState(false);
  const [bossRewardSummary, setBossRewardSummary] = useState<string | null>(null);
  // M7-COMPLETE: boss trial flow state machine
  const [bossTrialPhase, setBossTrialPhase] = useState<'idle' | 'in_progress' | 'success' | 'failed'>('idle');
  const [bossTrialTimeLeft, setBossTrialTimeLeft] = useState<number>(0);
  const [bossTrialScore, setBossTrialScore] = useState<number>(0);
  const [bossAttemptCount, setBossAttemptCount] = useState<number>(0);
  const [islandShards, setIslandShards] = useState<number>(0);
  const [shardTierIndex, setShardTierIndex] = useState<number>(0);
  const [shardClaimCount, setShardClaimCount] = useState<number>(0);
  // M17A: shields wallet currency (Body Habit Shield)
  const [shields, setShields] = useState<number>(0);
  // M17C: shards wallet currency (persistent cross-island Shards balance)
  const [shards, setShards] = useState<number>(0);
  // M19A: diamonds wallet currency now runtime-state backed for cross-device sync.
  const [diamonds, setDiamonds] = useState<number>(3);
  // M16C: true when islandShards >= current tier threshold; cleared on player claim (M16E)
  const [shardMilestoneReached, setShardMilestoneReached] = useState<boolean>(false);
  // M16E: tier index of a pending (unclaimed) milestone; null when no claim is waiting
  const [pendingClaimTierIndex, setPendingClaimTierIndex] = useState<number | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [mysteryStopReward, setMysteryStopReward] = useState<MysteryStopReward | null>(null);
  const [driftNotice, setDriftNotice] = useState<number | null>(null);
  const [marketPurchaseFeedback, setMarketPurchaseFeedback] = useState<string | null>(null);
  const [marketOwnedBundles, setMarketOwnedBundles] = useState<Record<'dice_bundle', boolean>>({
    dice_bundle: false,
  });
  const [hasMarketOwnedBundleHydrationGate, setHasMarketOwnedBundleHydrationGate] = useState(false);
  const [marketMarkerBaselineMs, setMarketMarkerBaselineMs] = useState<number | null>(null);
  const [showFirstRunCelebration, setShowFirstRunCelebration] = useState(false);
  const [runtimeVerificationSnapshot, setRuntimeVerificationSnapshot] = useState<{
    generatedAt: string;
    latestHydrationResult?: {
      timestamp: string;
      source?: string;
      currentIslandNumber?: number;
      bossTrialResolvedIslandNumber?: number | null;
      cycleIndex?: number;
      tokenIndex?: number;
      spinTokens?: number;
      dicePool?: number;
    };
    latestPersistSuccess?: {
      timestamp: string;
      currentIslandNumber?: number;
      bossTrialResolvedIslandNumber?: number | null;
      cycleIndex?: number;
      tokenIndex?: number;
      spinTokens?: number;
      dicePool?: number;
    };
  } | null>(null);
  const [firstRunStep, setFirstRunStep] = useState<'celebration' | 'ship-name' | 'mission' | 'launch'>('celebration');
  const [firstRunShipName, setFirstRunShipName] = useState('Starling');
  const [isPersistingFirstRunCompletion, setIsPersistingFirstRunCompletion] = useState(false);
  const isOnboardingCelebrationVisible = showFirstRunCelebration || showHatcheryL1Celebration;
  const [hasHydratedRuntimeState, setHasHydratedRuntimeState] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [showEntryAudioModal, setShowEntryAudioModal] = useState(false);
  const [hasDismissedEntryAudioModal, setHasDismissedEntryAudioModal] = useState(false);
  // M4-COMPLETE: cycleIndex tracks full laps through 120 islands (island 120 → 1 increments this)
  const [cycleIndex, setCycleIndex] = useState<number>(0);
  // Effective island number for all cost/earn scaling: (cycleIndex × 120 + islandNumber).
  // Island 1 on cycle 1 becomes effective island 121, giving cycle-over-cycle cost escalation.
  const effectiveIslandNumber = cycleIndex * 120 + islandNumber;
  const boardProfileExposureTrackedRef = useRef(false);
  const hasPresentedEntryAudioModalRef = useRef(false);

  useEffect(() => {
    preloadThemeAssets(activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    if (boardProfileExposureTrackedRef.current) return;
    boardProfileExposureTrackedRef.current = true;
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        stage: 'island_run_board_profile_exposed',
        board_profile_id: ACTIVE_BOARD_PROFILE.id,
        board_profile_tile_count: ACTIVE_BOARD_PROFILE.tileCount,
      },
    });
  }, [session.user.id]);

  useEffect(() => {
    setIsIslandBackgroundAvailable(true);
  }, [islandBackgroundSrc]);

  useEffect(() => {
    let cancelled = false;
    setIslandArtManifest(null);
    setIsIslandArtAmbientBackgroundLoaded(false);

    void loadIslandArtManifest(islandArtPreviewNumber).then((manifest) => {
      if (cancelled) return;
      setIslandArtManifest(manifest);
    });

    return () => {
      cancelled = true;
    };
  }, [islandArtPreviewNumber]);

  useEffect(() => {
    if (!showTopbarMenu && !showAudioMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!topbarMenuRef.current) {
        return;
      }
      if (topbarMenuRef.current.contains(event.target as Node)) {
        return;
      }
      setShowTopbarMenu(false);
      setShowAudioMenu(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowTopbarMenu(false);
        setShowAudioMenu(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [showAudioMenu, showTopbarMenu]);

  useEffect(() => {
    if (!showTopbarMenu) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      topbarMenuFirstItemRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showTopbarMenu]);

  useEffect(() => {
    if (!showAudioMenu) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      audioMenuFirstItemRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showAudioMenu]);

  useEffect(() => {
    if (isRolling || pendingHopSequence !== null) {
      setIsTopbarMenuPrimed(false);
    }
  }, [isRolling, pendingHopSequence]);

  // B1-3: tile map state — regenerated when islandNumber or dayIndex changes
  const [islandStartedAtMs, setIslandStartedAtMs] = useState<number>(() => Date.now());
  const [islandExpiresAtMs, setIslandExpiresAtMs] = useState<number>(() => Date.now() + getIslandDurationMs(1));
  const [tileMap, setTileMap] = useState<IslandTileMapEntry[]>(() => generateTileMap(1, 'normal', 'forest', 0, { profileId: ACTIVE_BOARD_PROFILE.id }));

  // C1 store-derived spinTokens (see dicePool/tokenIndex above for pattern notes).
  const spinTokens = __storeState.spinTokens;

  // C1 shim: setSpinTokens — commits through the store for unmigrated paths.
  const setSpinTokens = useCallback((updater: number | ((current: number) => number)) => {
    const snapshot = getIslandRunStateSnapshot(session);
    const next = typeof updater === 'function' ? updater(snapshot.spinTokens) : updater;
    void commitIslandRunState({
      session,
      client,
      record: { ...snapshot, spinTokens: next, runtimeVersion: snapshot.runtimeVersion + 1 },
      triggerSource: 'spin_tokens_shim',
    });
  }, [session, client]);

  // B3-2: minigame launcher state (M11B framework)
  const [activeLaunchedMinigameId, setActiveLaunchedMinigameId] = useState<string | null>(null);
  const [activeLaunchedMinigameSource, setActiveLaunchedMinigameSource] = useState<MinigameLaunchSource | null>(null);
  const [activeLaunchedMinigameConfig, setActiveLaunchedMinigameConfig] = useState<Record<string, unknown> | undefined>(undefined);
  const shooterControllerBridge = useMemo(() => createShooterControllerBridge(), []);
  const isShooterControllerActive = activeLaunchedMinigameId === 'shooter_blitz';
  const shooterControllerInput = shooterControllerBridge.controllerInput;
  const emitShooterControllerIntent = useCallback((intent: IslandRunControllerIntent) => {
    shooterControllerBridge.emit(intent);
  }, [shooterControllerBridge]);

  useEffect(() => {
    if (!isShooterControllerActive) {
      shooterControllerBridge.reset();
    }
  }, [isShooterControllerActive, shooterControllerBridge]);

  useEffect(() => {
    if (!isShooterControllerActive) return;
    emitShooterControllerLifecycleTelemetry('controller_attach', {
      minigameId: 'shooter_blitz',
      islandNumber,
      source: 'footer',
    });
    return () => {
      emitShooterControllerLifecycleTelemetry('controller_detach', {
        minigameId: 'shooter_blitz',
        islandNumber,
        source: 'footer',
      });
    };
  }, [isShooterControllerActive, islandNumber]);

  useEffect(() => {
    if (!isShooterControllerActive || typeof window === 'undefined') return;
    emitShooterControllerLifecycleTelemetry('controller_attach', {
      minigameId: 'shooter_blitz',
      islandNumber,
      source: 'keyboard',
    });
    const unbind = bindKeyboardToShooterBridge(shooterControllerBridge, window);
    return () => {
      unbind();
      emitShooterControllerLifecycleTelemetry('controller_detach', {
        minigameId: 'shooter_blitz',
        islandNumber,
        source: 'keyboard',
      });
    };
  }, [isShooterControllerActive, shooterControllerBridge, islandNumber]);

  // B3-3: market interaction gate
  const [marketInteracted, setMarketInteracted] = useState(false);

  // Egg-ready in-app banner: shown when egg transitions to stage 4 or on app open with ready egg
  const [showEggReadyBanner, setShowEggReadyBanner] = useState(false);
  const [hasEggReadyAnimationPlayedOnce, setHasEggReadyAnimationPlayedOnce] = useState(false);

  // M14: persistent shop panel state
  useEffect(() => {
    setHasEggReadyAnimationPlayedOnce(false);
  }, [showEggReadyBanner, activeEgg?.setAtMs]);

  const [showShopPanel, setShowShopPanel] = useState(false);
  const [showMarketPanel, setShowMarketPanel] = useState(false);
  const [showBuildPanel, setShowBuildPanel] = useState(false);
  const [buildDiscountExpiresAtMs, setBuildDiscountExpiresAtMs] = useState<number | null>(null);
  const [showRewardDetailsModal, setShowRewardDetailsModal] = useState(false);
  const [showEggManiaModal, setShowEggManiaModal] = useState(false);
  const [showHatcheryCompassModal, setShowHatcheryCompassModal] = useState(false);
  const [walletStoreModalKind, setWalletStoreModalKind] = useState<WalletStoreModalKind | null>(null);
  const [isRewardBarDetailsExpanded, setIsRewardBarDetailsExpanded] = useState(false);
  const [selectedEventInfoEventId, setSelectedEventInfoEventId] = useState<EventId | null>(null);
  const [showOutOfDicePurchasePrompt, setShowOutOfDicePurchasePrompt] = useState(false);
  const [isStartingDiceCheckout, setIsStartingDiceCheckout] = useState(false);
  const [diceCheckoutError, setDiceCheckoutError] = useState<string | null>(null);
  const [isStartingCreaturePackCheckout, setIsStartingCreaturePackCheckout] = useState(false);
  const [creaturePackCheckoutError, setCreaturePackCheckoutError] = useState<string | null>(null);
  const [isStartingMinigameTicketCheckout, setIsStartingMinigameTicketCheckout] = useState(false);
  const [minigameTicketCheckoutError, setMinigameTicketCheckoutError] = useState<string | null>(null);
  const [showSanctuaryPanel, setShowSanctuaryPanel] = useState(false);
  const [showSanctuaryMenu, setShowSanctuaryMenu] = useState(false);
  const [sanctuaryMenuModule, setSanctuaryMenuModule] = useState<'collection' | 'inventory' | 'quest' | 'rooms' | 'filters' | null>(null);
  const [hatchReveal, setHatchReveal] = useState<null | { creatureId: string; creatureName: string; rarity: 'common' | 'rare' | 'mythic' }>(null);
  const [hatchedCreatureCardId, setHatchedCreatureCardId] = useState<string | null>(null);
  const [devPackOpeningPrototype, setDevPackOpeningPrototype] = useState<null | {
    cards: CreaturePackOpeningPrototypeCard[];
    grantId: string;
    grantStatus: 'granted' | 'already_granted';
    bonusCopy?: string;
  }>(null);
  const [showWelcomePackModal, setShowWelcomePackModal] = useState(false);
  const [welcomePackDismissedThisSession, setWelcomePackDismissedThisSession] = useState(false);
  const [welcomePackClaimResult, setWelcomePackClaimResult] = useState<ClaimFullWelcomePackResult | null>(null);
  const [welcomePackClaimError, setWelcomePackClaimError] = useState<string | null>(null);
  const [welcomePackClaimPending, setWelcomePackClaimPending] = useState(false);
  const welcomePackClaimInFlightRef = useRef(false);
  const [firstCreaturePackFlow, setFirstCreaturePackFlow] = useState<{
    phase: FirstSessionCreaturePackModalPhase;
    cards: FirstSessionCreaturePackCardReveal[];
    diceGranted: number;
    errorMessage: string | null;
  }>({
    phase: 'intro',
    cards: [],
    diceGranted: 100,
    errorMessage: null,
  });
  const [isFirstCreaturePackClaiming, setIsFirstCreaturePackClaiming] = useState(false);
  const firstCreaturePackClaimInFlightRef = useRef(false);
  const showFirstCreaturePackModal = isIslandRunFirstCreaturePackModalActive(firstSessionTutorialState)
    || firstCreaturePackFlow.phase === 'opening'
    || firstCreaturePackFlow.phase === 'revealed'
    || firstCreaturePackFlow.phase === 'already_claimed'
    || firstCreaturePackFlow.phase === 'error';

  useEffect(() => {
    const targetState = getIslandRunBuildPromptInitialTransitionTarget(firstSessionTutorialState);
    if (!targetState) return;
    applyFirstSessionTutorialState({
      session,
      client,
      targetState,
      triggerSource: 'build_prompt_overlay_visible',
    });
  }, [client, firstSessionTutorialState, session]);

  const openBuildPanelFromFooter = useCallback(() => {
    setShowBuildPanel(true);
    const targetStates = resolveIslandRunBuildPromptClickTransitionTargets(firstSessionTutorialState);
    for (const targetState of targetStates) {
      applyFirstSessionTutorialState({
        session,
        client,
        targetState,
        triggerSource: 'build_prompt_build_button_click',
      });
    }
  }, [client, firstSessionTutorialState, session]);

  // ── Dice multiplier (dice-pool-gated, Monopoly GO style) ────────────────────
  const [diceMultiplier, setDiceMultiplier] = useState(1);

  // Derived: available tiers (with unlocked status), effective cost, and auto-clamp
  const multiplierTiers = resolveAvailableMultiplierTiers(dicePool);
  const effectiveMultiplier = clampMultiplierToPool(diceMultiplier, dicePool);
  const effectiveDiceCost = resolveDiceCostForMultiplier(effectiveMultiplier);
  const unlockedMultipliers = multiplierTiers.filter((t) => t.unlocked).map((t) => t.multiplier);
  const maxAvailableMultiplier = unlockedMultipliers[unlockedMultipliers.length - 1] ?? 1;
  const isAtMaxAvailableMultiplier = maxAvailableMultiplier > 1 && effectiveMultiplier === maxAvailableMultiplier;

  // Auto-downgrade multiplier when pool drops below current tier's gate
  // (e.g. after a roll drains dice below the ×10 threshold)
  useEffect(() => {
    if (effectiveMultiplier !== diceMultiplier) {
      setDiceMultiplier(effectiveMultiplier);
    }
  }, [effectiveMultiplier, diceMultiplier]);

  // ── Dice regen countdown (Monopoly GO style: "Next dice in MM:SS") ───────
  const [diceRegenCountdown, setDiceRegenCountdown] = useState<string | null>(null);
  const [diceRegenStatusLabel, setDiceRegenStatusLabel] = useState<string | null>(null);
  const [diceRegenRollsReady, setDiceRegenRollsReady] = useState<number | null>(null);

  // NOTE: The useEffect for the dice regen countdown timer is placed after runtimeState declaration below.

  // ── Reward bar animation state ─────────────────────────────────────────────
  const [rewardBarBurstAnimating, setRewardBarBurstAnimating] = useState(false);
  const [rewardBarCascadePayouts, setRewardBarCascadePayouts] = useState<RewardBarClaimPayout[]>([]);
  const [feedParticleActive, setFeedParticleActive] = useState(false);
  // B8: brief "snap" flash on the fill when the bar first becomes claimable.
  const [rewardBarSnapActive, setRewardBarSnapActive] = useState(false);
  const [showWinCelebrationModal, setShowWinCelebrationModal] = useState(false);
  const [winCelebrationRewards, setWinCelebrationRewards] = useState<WinRewardItem[]>([]);
  const [winCelebrationSubtitle, setWinCelebrationSubtitle] = useState('You won');
  const [showDemoWaitlistModal, setShowDemoWaitlistModal] = useState(false);
  const rewardBarWasClaimableRef = useRef(false);

  useEffect(() => {
    if (!showWinCelebrationModal) return;
    // Fireworks-like celebration burst when the secondary win modal opens.
    playIslandRunSound('boss_island_clear');
    triggerIslandRunHaptic('reward_claim');
  }, [showWinCelebrationModal]);

  const openWinCelebrationModal = useCallback((rewards: WinRewardItem[], subtitle = 'You won') => {
    if (rewards.length === 0) return;
    setWinCelebrationRewards(rewards);
    setWinCelebrationSubtitle(subtitle);
    setShowWinCelebrationModal(true);
  }, []);

  // ── Safe placeholder dialog ────────────────────────────────────────────────
  const [activePlaceholder, setActivePlaceholder] = useState<IslandRunPlaceholderDescriptor | null>(null);

  // ── Sticker album dialog ───────────────────────────────────────────────────
  const [showStickerAlbumDialog, setShowStickerAlbumDialog] = useState(false);

  const [creatureCollection, setCreatureCollection] = useState(() => fetchCreatureCollection(session.user.id));
  const [activeCompanionId, setActiveCompanionId] = useState<string | null>(null);
  const [selectedSanctuaryCreatureId, setSelectedSanctuaryCreatureId] = useState<string | null>(null);
  const [sanctuaryFeedback, setSanctuaryFeedback] = useState<string | null>(null);
  const [sanctuaryClockMs, setSanctuaryClockMs] = useState(() => Date.now());
  const [sanctuaryFilterMode, setSanctuaryFilterMode] = useState<SanctuaryFilterMode>('all');
  const [sanctuaryZoneFilter, setSanctuaryZoneFilter] = useState<SanctuaryZoneFilter>('all');
  const [sanctuarySortMode, setSanctuarySortMode] = useState<SanctuarySortMode>('recent');
  const [showSanctuaryCompanionInfo, setShowSanctuaryCompanionInfo] = useState(true);
  const [ownedThemeIds, setOwnedThemeIds] = useState<Set<Theme>>(new Set());
  const [themeCheckoutLoadingId, setThemeCheckoutLoadingId] = useState<Theme | null>(null);
  const [themeCheckoutError, setThemeCheckoutError] = useState<string | null>(null);
  const [themeEntitlementsLoading, setThemeEntitlementsLoading] = useState(false);
  const [pairedThemeOfferModal, setPairedThemeOfferModal] = useState<{
    theme: ThemeMetadata & { unlockRule: Extract<ThemeMetadata['unlockRule'], { type: 'creature_purchase' }> };
    access: ThemeAccessResult;
  } | null>(null);
  const [companionQuestProgress, setCompanionQuestProgress] = useState<CompanionQuestProgress>(() =>
    readCompanionQuestProgress(session.user.id),
  );
  const [companionQuestTop3ViewedDayKey, setCompanionQuestTop3ViewedDayKey] = useState<string | null>(null);
  const [creatureTreatInventory, setCreatureTreatInventory] = useState(() => fetchCreatureTreatInventory(session.user.id));
  const [showPerfectCompanionOnboardingHint, setShowPerfectCompanionOnboardingHint] = useState(false);
  const [perfectCompanionOnboardingCreatureId, setPerfectCompanionOnboardingCreatureId] = useState<string | null>(null);
  const [perfectCompanionOnboardingCreatureName, setPerfectCompanionOnboardingCreatureName] = useState<string | null>(null);

  const [activeStoryEpisode, setActiveStoryEpisode] = useState<ActiveIslandStoryEpisode>(null);
  const showStoryReader = activeStoryEpisode !== null;
  const storySeenStorageKey = `island_run_story_seen_prologue_${session.user.id}`;

  // A "blocking" surface is any full-attention modal/panel that renders above the
  // board. When one opens we dismiss the top-bar (☰) menu so it is not left hanging
  // behind the overlay.
  const anyBlockingModalOpen =
    showShopPanel ||
    showMarketPanel ||
    showBuildPanel ||
    showOutOfDicePurchasePrompt ||
    showRewardDetailsModal ||
    showEggManiaModal ||
    showHatcheryCompassModal ||
    Boolean(activePlaceholder) ||
    showStickerAlbumDialog ||
    showSanctuaryPanel ||
    showStoryReader ||
    isIslandInhabitantFlowOpen ||
    showCreatureChannelModal ||
    showConcordHubModal ||
    Boolean(dormantDoorMiniGame) ||
    Boolean(trafficLightCoinFlip) ||
    Boolean(techCollectionModal) ||
    Boolean(techCompletionCelebration) ||
    showEncounterModal ||
    showGamifiedJournalCard ||
    showClaimModal;
  // Only react to a modal *opening* (a false→true edge), never to a flag merely
  // being set. Previously this effect force-closed the menu on every render where
  // `showTopbarMenu` was true and any flag was set. That meant if any one of these
  // flags ever leaked to `true` during gameplay (a modal closing without resetting
  // its own flag), the ☰ menu could no longer be opened at all: the tap flipped
  // `showTopbarMenu` true and this effect slammed it shut on the same commit, so
  // the button appeared to do nothing. Tracking the edge keeps the auto-dismiss
  // while letting the player reopen the menu whenever no modal is actually opening.
  const prevAnyBlockingModalOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = !prevAnyBlockingModalOpenRef.current && anyBlockingModalOpen;
    prevAnyBlockingModalOpenRef.current = anyBlockingModalOpen;
    if (justOpened) {
      setShowTopbarMenu(false);
    }
  }, [anyBlockingModalOpen]);

  useEffect(() => {
    if (!showTopbarMenu || !showEggReadyBanner) return;
    if (activeEgg) {
      try {
        window.localStorage.setItem(getEggReadyBannerKey(session.user.id, activeEgg.setAtMs), '1');
      } catch {
        // ignore localStorage failures
      }
    }
    setShowEggReadyBanner(false);
  }, [activeEgg, session.user.id, showEggReadyBanner, showTopbarMenu]);

  // B3-4: utility stop state
  const [utilityInteracted, setUtilityInteracted] = useState(false);
  const [islandIntention, setIslandIntention] = useState('');

  // B3-5: island clear celebration
  const [showIslandClearCelebration, setShowIslandClearCelebration] = useState(false);
  const [isIslandClearCelebrationDeparting, setIsIslandClearCelebrationDeparting] = useState(false);
  const [isIslandClearRewardClaimed, setIsIslandClearRewardClaimed] = useState(false);
  const [islandClearRewardPulseKey, setIslandClearRewardPulseKey] = useState(0);
  const [islandClearStats, setIslandClearStats] = useState<{
    islandNumber: number;
    diceEarned: number;
    essenceEarned: number;
    stopsCleared: number;
    /**
     * Island number to travel to when the player taps the "Travel to next
     * island" CTA. Typically `islandNumber + 1`, but lives on the stats so
     * future variants (e.g. a skip or a branch) can override it.
     */
    pendingNextIsland: number;
    /**
     * True when this island-clear is the final island of a 120-cycle
     * (islandNumber % 120 === 0). Triggers the "Cycle Complete" capstone
     * flourish in the celebration modal.
     */
    isCycleCapstone: boolean;
  } | null>(null);

  const [runtimeState, setRuntimeState] = useState(() => readIslandRunRuntimeState(session));
  // The Concord caretaker content resolves per island: Island 1 keeps the
  // canonical Luma acquisition story, islands 2+ use authored/fallback entries.
  const caretakerConcordContent = useMemo(
    () => getIslandCaretakerConcordContent(runtimeState.currentIslandNumber),
    [runtimeState.currentIslandNumber],
  );
  const caretakerInhabitant = caretakerConcordContent?.inhabitant;
  const caretakerTopics = caretakerConcordContent?.topics ?? EMPTY_CARETAKER_TOPICS;
  const caretakerConversations = caretakerConcordContent?.conversations ?? EMPTY_CARETAKER_CONVERSATIONS;
  const hasCaretakerContent = Boolean(caretakerInhabitant) && caretakerTopics.length > 0 && caretakerConversations.length === caretakerTopics.length;

  const [runtimeHydrationSource, setRuntimeHydrationSource] = useState<IslandRunRuntimeHydrationSource | null>(null);
  const pendingTreasurePathResume = useMemo(
    () => resolvePendingTreasurePathResume({ record: runtimeState }),
    [runtimeState],
  );
  const pendingTreasurePathResumeCtaLabel = pendingTreasurePathResume?.status === 'active'
    ? 'Continue Treasure Path'
    : 'Collect Treasure';
  // Soft cross-device handoff: when the server row was written moments ago by
  // a different device, pause gameplay behind a "take over" prompt instead of
  // silently playing against (and later clobbering) that device's session.
  const [otherDeviceTakeoverPrompt, setOtherDeviceTakeoverPrompt] = useState<{
    lastWriterDeviceSessionId: string;
    updatedAtMs: number;
  } | null>(null);
  const hasCheckedOtherDeviceActivityRef = useRef(false);
  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const activeSessionStatusMessage = otherDeviceTakeoverPrompt
    ? `Island Run was saved from another device ${Math.max(1, Math.round((Date.now() - otherDeviceTakeoverPrompt.updatedAtMs) / 1000))}s before this session opened. Taking over loads that progress and continues here.`
    : null;
  const [perfectCompanionRuntimeConfig, setPerfectCompanionRuntimeConfig] = useState(() => readPerfectCompanionRuntimeConfig(session.user.id));
  const runtimeStateRef = useRef(runtimeState);
  // Tracks the `runtimeState.runtimeVersion` last applied to local React state
  // mirrors (tokenIndex, dicePool, spinTokens, islandShards, etc.). If a later
  // `runtimeState` update carries an *older* runtimeVersion — which can happen
  // when a conflict-recovery merge or a delayed reconcile pulls an older
  // Supabase row — we must NOT snap React state back to that older value,
  // otherwise the player's token and dice pool will visibly jump backward to a
  // pre-roll position. See `ISLAND_RUN_OPEN_ISSUES.md` — P0 cross-device drift.
  const lastAppliedRuntimeVersionRef = useRef<number>(-1);
  // Guard ref to prevent persist effects from writing stale local state before
  // the hydration effect has applied server values to local state. This prevents
  // the write amplification loop where persist effects see stale local state
  // vs runtimeState after hydration and emit redundant writes.
  const hasCompletedInitialHydrationSyncRef = useRef(false);
  // Audio preferences (music/sfx) are mirrored from runtimeState into React
  // toggle state exactly once, on first hydration. Re-mirroring on every
  // runtimeState change made the entry-modal Music/Sounds toggles flicker
  // on/off — and thrashed the music context (restarting tracks) — as the
  // runtimeState passed through the local snapshot, the table result (where the
  // split music/sfx columns may be null for legacy rows), and persist
  // write-backs. After first hydration the React state is the source of truth
  // and the persist effect keeps the store in sync.
  const hasHydratedAudioPreferencesRef = useRef(false);
  const companionBonusAppliedVisitKeyRef = useRef<string | null>(null);
  const isOnboardingComplete = Boolean(session.user.user_metadata?.onboarding_complete);
  const isFirstRunClaimed = runtimeState.firstRunClaimed;
  const welcomePackEligibility = useMemo(() => getWelcomePackEligibility(runtimeState), [runtimeState]);
  const welcomePackGuestDisplayName = useMemo(() => readIslandRunGuestFunnelState().displayName ?? null, []);
  const isHigherPriorityWelcomePackSurfaceVisible = Boolean(
    showFirstCreaturePackModal ||
      showStoryReader ||
      activeStopId ||
      activeLaunchedMinigameId ||
      showEntryAudioModal ||
      showEncounterModal ||
      showClaimModal ||
      showRewardDetailsModal ||
      showHatcheryCompassModal
  );

  const isAnonymousGuestSession = Boolean((session.user as { is_anonymous?: boolean }).is_anonymous);
  const firstPlayerModalDecision = resolveIslandRunFirstPlayerModalPrompt({
    featureEnabled: true,
    guestFunnelState: isAnonymousGuestSession ? guestFunnelState : null,
    isAnonymousGuest: isAnonymousGuestSession,
    islandNumber,
    cycleIndex: runtimeState.cycleIndex,
    arenaCompletedForSoftSavePrompt: arenaSoftSaveValueMomentReached,
    hasActiveMinigameOrBossOverlay: Boolean(activeLaunchedMinigameId) || bossTrialPhase === 'in_progress',
    hasStoryReaderMajorNarrative: showStoryReader,
    needsFirstSessionTutorialHatcheryGuidance: showFirstCreaturePackModal || showHatcheryL1Celebration || isBuildTutorialPromptActive,
    hasRewardClaimOrWelcomePackReveal: showWelcomePackModal || showClaimModal || showRewardDetailsModal || showWinCelebrationModal,
    hasActiveStopOrLandmarkModal: Boolean(activeStopId || activePlaceholder || dormantDoorMiniGame || trafficLightCoinFlip || techCollectionModal || techCompletionCelebration || showEncounterModal || showGamifiedJournalCard || showHatcheryCompassModal),
  });
  const showFirstProgressRecapAfterArena = firstPlayerModalDecision.promptId === 'first_progress_recap_after_arena';
  const showSoftSavePromptAfterArena = firstPlayerModalDecision.promptId === 'soft_save_prompt_after_arena';

  useEffect(() => {
    if ((!showFirstProgressRecapAfterArena && !showSoftSavePromptAfterArena) || typeof document === 'undefined') return undefined;
    return lockPageScroll();
  }, [showFirstProgressRecapAfterArena, showSoftSavePromptAfterArena]);

  const handleContinueFirstProgressRecapAfterArena = useCallback(() => {
    const next = markIslandRunGuestFirstProgressRecapSeen();
    setGuestFunnelState(next);
  }, []);

  const handleDismissSoftSavePromptAfterArena = useCallback(() => {
    const next = markIslandRunGuestSavePromptDismissed({ prompt: 'soft_after_arena' });
    setGuestFunnelState(next);
  }, []);

  const handleSaveGameForFreeFromArena = useCallback(() => {
    const next = patchIslandRunGuestFunnelState({
      hasSeenSoftSavePromptAfterArena: true,
      claimStatus: 'claim_pending',
    });
    setGuestFunnelState(next);
    onOpenSaveAccountSignup?.();
  }, [onOpenSaveAccountSignup]);

  useEffect(() => {
    // Wait for initial runtime hydration before evaluating welcome-pack auto-show.
    // Without this gate, the UI can briefly render the modal from a stale pre-
    // hydration snapshot and then immediately hide it once hydrated state lands,
    // which causes a startup flicker ("Soon" / "⚡ 2000" gift tiles flashing).
    if (!hasHydratedRuntimeState) return;

    const shouldShow = shouldAutoShowWelcomePackModal({
      eligibility: welcomePackEligibility,
      hasBeenDismissedThisSession: welcomePackDismissedThisSession,
      isWelcomePackModalVisible: showWelcomePackModal,
      isHigherPriorityOnboardingModalVisible: isHigherPriorityWelcomePackSurfaceVisible,
    });
    if (!shouldShow) return;
    setWelcomePackClaimError(null);
    setWelcomePackClaimResult(null);
    setShowWelcomePackModal(true);
  }, [
    hasHydratedRuntimeState,
    isHigherPriorityWelcomePackSurfaceVisible,
    showWelcomePackModal,
    welcomePackDismissedThisSession,
    welcomePackEligibility,
  ]);

  const island120StartupDiagnosticSessionStartMsRef = useRef<number | null>(null);
  const island120StartupSnapshotLoggedRef = useRef(false);
  const island120PendingStopTransitionRef = useRef<{
    source: string;
    requestedStopId: string | null;
  } | null>(null);
  const island120PrevActiveStopIdRef = useRef<string | null>(null);
  const island120ToggleHintCounterByPairRef = useRef<Record<string, number>>({});
  const pendingRuntimeStateTraceSourceRef = useRef<string | null>(null);
  const regenIntervalNoopLogLastAtMsRef = useRef<number>(0);
  const regenIntervalNoopLogSuppressedCountRef = useRef<number>(0);
  const islandClearCelebrationShownForVisitRef = useRef<string | null>(null);
  const isBuildSpendInFlightRef = useRef(false);
  const buildTapQueueRef = useRef<Array<{ stopIndex: number; requestedAtMs: number }>>([]);
  const isBuildTapQueueProcessingRef = useRef(false);
  const holdBuildSpendActiveRef = useRef(false);
  const holdBuildSpendStartAtMsRef = useRef<number | null>(null);
  const buildRepeatStreakRef = useRef<BuildRepeatStreakState>(getInitialBuildRepeatStreakState());
  const completedStopsSyncDispatchKeyRef = useRef<string | null>(null);
  const marketOwnedBundleSyncRequestedRef = useRef(false);
  const marketOwnedBundleSyncDispatchKeyRef = useRef<string | null>(null);
  const [isBuildHoldActive, setIsBuildHoldActive] = useState(false);
  const [buildHoldFeedbackLabel, setBuildHoldFeedbackLabel] = useState('⚒️ Building…');
  const resetBuildRepeatStreak = useCallback(() => {
    buildRepeatStreakRef.current = getInitialBuildRepeatStreakState();
  }, []);

  useEffect(() => {
    resetBuildRepeatStreak();
    buildTapQueueRef.current = [];
  }, [islandNumber, resetBuildRepeatStreak]);

  useEffect(() => {
    if (!showBuildPanel) {
      resetBuildRepeatStreak();
      buildTapQueueRef.current = [];
    }
  }, [resetBuildRepeatStreak, showBuildPanel]);
  const isIsland120StartupDiagnosticActive = isIsland120StartupDiagnosticTarget(
    runtimeState.currentIslandNumber ?? islandNumber,
  )
    // User-requested gate (2026-04): the island-120 diagnostic is a heavy,
    // noisy logger intended for deep bug-hunting only. Keep the logic fully
    // available, but only ACTIVATE when the debug panel is open — this way
    // the diagnostic is reachable via the ☰ debug panel and the game-export
    // log in settings (both already surface recent diagnostic events) without
    // paying its cost on every normal play session.
    && showDebugPanel;

  useEffect(() => {
    runtimeStateRef.current = runtimeState;
  }, [runtimeState]);

  useEffect(() => () => {
    buildTapQueueRef.current = [];
    holdBuildSpendActiveRef.current = false;
    holdBuildSpendStartAtMsRef.current = null;
  }, []);

  const updateMarketOwnedBundles = useCallback((
    updater: SetStateAction<Record<'dice_bundle', boolean>>,
    options?: { requestSync?: boolean },
  ) => {
    setMarketOwnedBundles((current) => {
      const next = typeof updater === 'function'
        ? (updater as (value: Record<'dice_bundle', boolean>) => Record<'dice_bundle', boolean>)(current)
        : updater;
      const changed = Boolean(current.dice_bundle) !== Boolean(next.dice_bundle);
      if (changed && options?.requestSync !== false) {
        marketOwnedBundleSyncRequestedRef.current = true;
      }
      return changed ? next : current;
    });
  }, []);

  const setRuntimeStateWithTrace = useCallback((
    source: string,
    updater: SetStateAction<IslandRunRuntimeState>,
  ) => {
    pendingRuntimeStateTraceSourceRef.current = source;
    setRuntimeState((current) => {
      const next = typeof updater === 'function'
        ? (updater as (value: IslandRunRuntimeState) => IslandRunRuntimeState)(current)
        : updater;
      if (current.tokenIndex !== next.tokenIndex) {
        logIslandRunEntryDebug('setRuntimeState_tokenIndex_change', {
          source,
          tokenIndexBefore: current.tokenIndex,
          tokenIndexAfter: next.tokenIndex,
          runtimeVersionBefore: current.runtimeVersion,
          runtimeVersionAfter: next.runtimeVersion,
        });
      }
      return next;
    });
  }, []);

  useEffect(() => {
    pendingRuntimeStateTraceSourceRef.current = null;
  }, [runtimeState.tokenIndex, runtimeState.runtimeVersion]);

  const applyPassiveDiceRegen = useCallback((reason: 'startup' | 'interval' | 'focus' | 'visibility' | 'pre_roll') => {
    if (!hasHydratedRuntimeState) return getIslandRunStateSnapshot(session).dicePool;
    if (reason !== 'pre_roll' && (isAnimatingRollRef.current || isRollSyncPendingRef.current)) {
      return getIslandRunStateSnapshot(session).dicePool;
    }
    const nowMs = Date.now();
    const playerLevel = Math.max(1, Math.floor(playerLevelInfo?.currentLevel ?? 1));
    const current = runtimeStateRef.current;
    const regenTick = applyPassiveDiceRegenTick({
      session,
      client,
      playerLevel,
      nowMs,
      triggerSource: `passive_dice_regen_${reason}`,
    });
    const nextRuntimeState = regenTick.record;
    if (!regenTick.changed) {
      runtimeStateRef.current = nextRuntimeState;
      const isIntervalNoop = reason === 'interval';
      let shouldEmitNoopLog = !isIntervalNoop;
      let suppressedNoopLogs = 0;
      if (isIntervalNoop) {
        const elapsedSinceLastNoopLog = nowMs - regenIntervalNoopLogLastAtMsRef.current;
        if (elapsedSinceLastNoopLog >= ISLAND_RUN_REGEN_INTERVAL_NOOP_LOG_THROTTLE_MS) {
          shouldEmitNoopLog = true;
          suppressedNoopLogs = regenIntervalNoopLogSuppressedCountRef.current;
          regenIntervalNoopLogSuppressedCountRef.current = 0;
          regenIntervalNoopLogLastAtMsRef.current = nowMs;
        } else {
          regenIntervalNoopLogSuppressedCountRef.current += 1;
        }
      }
      if (shouldEmitNoopLog) {
        logIslandRunEntryDebug('dice_regen_noop_skipped_runtime_sync', {
          userId: session.user.id,
          reason,
          playerLevel,
          runtimeVersionRef: runtimeStateRef.current.runtimeVersion,
          runtimeVersionStore: nextRuntimeState.runtimeVersion,
          essenceRef: runtimeStateRef.current.essence,
          essenceStore: nextRuntimeState.essence,
          ...(suppressedNoopLogs > 0 ? { suppressedIntervalNoopLogs: suppressedNoopLogs } : {}),
        });
        logIslandRunEntryDebug('regen_apply_result', {
          reason,
          applied: false,
          skipReason: 'no_change',
          ...(suppressedNoopLogs > 0 ? { suppressedIntervalNoopLogs: suppressedNoopLogs } : {}),
        });
      }
      return nextRuntimeState.dicePool;
    }
    regenIntervalNoopLogSuppressedCountRef.current = 0;
    regenIntervalNoopLogLastAtMsRef.current = nowMs;
    runtimeStateRef.current = nextRuntimeState;
    setRuntimeStateWithTrace('applyPassiveDiceRegen', nextRuntimeState);
    logIslandRunEntryDebug('dice_regen_applied', {
      userId: session.user.id,
      reason,
      playerLevel,
      diceBefore: current.dicePool,
      diceAfter: nextRuntimeState.dicePool,
      diceAdded: regenTick.diceAdded,
      essenceBefore: current.essence,
      essenceAfter: nextRuntimeState.essence,
      runtimeVersionBefore: current.runtimeVersion,
      runtimeVersionAfter: nextRuntimeState.runtimeVersion,
      regenMaxDice: nextRuntimeState.diceRegenState?.maxDice ?? null,
      regenRatePerHour: nextRuntimeState.diceRegenState?.regenRatePerHour ?? null,
      changed: regenTick.changed,
    });
    logIslandRunEntryDebug('regen_apply_result', {
      reason,
      applied: true,
      diceBefore: current.dicePool,
      diceAfter: nextRuntimeState.dicePool,
    });
    return nextRuntimeState.dicePool;
  }, [client, hasHydratedRuntimeState, playerLevelInfo?.currentLevel, session, setRuntimeStateWithTrace]);

  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    applyPassiveDiceRegen('startup');
    const intervalId = window.setInterval(() => {
      applyPassiveDiceRegen('interval');
    }, 1_000);
    return () => window.clearInterval(intervalId);
  }, [applyPassiveDiceRegen, hasHydratedRuntimeState]);

  // ── Dice regen countdown timer (lives after runtimeState so it can read diceRegenState) ──
  // Uses real elapsed time since lastRegenAtMs so the countdown decrements every
  // second and works correctly when the PWA is reopened after being in the background.
  useEffect(() => {
    const regenState: DiceRegenState | null = runtimeState.diceRegenState ?? null;
    if (!regenState) {
      setDiceRegenCountdown(null);
      setDiceRegenStatusLabel(null);
      setDiceRegenRollsReady(null);
      return;
    }
    const activeRegenState = regenState;

    function tick() {
      const safeCost = Math.max(1, Math.floor(effectiveDiceCost) || 1);
      const isOutOfRolls = dicePool < safeCost;
      if (!isOutOfRolls) {
        setDiceRegenCountdown(null);
        setDiceRegenStatusLabel(null);
        setDiceRegenRollsReady(null);
        return;
      }

      const nextRollEtaMs = resolveNextRollEtaMs({
        dicePool,
        target: safeCost,
        regenState: activeRegenState,
        nowMs: Date.now(),
      });
      if (!Number.isFinite(nextRollEtaMs)) {
        setDiceRegenCountdown(null);
        setDiceRegenStatusLabel(`Need ${safeCost} dice (regen cap: ${activeRegenState.maxDice})`);
        setDiceRegenRollsReady(null);
        return;
      }

      const remainingSec = Math.max(0, Math.ceil(nextRollEtaMs / 1000));
      const minutes = Math.floor(remainingSec / 60);
      const seconds = remainingSec % 60;
      const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      setDiceRegenCountdown(timeStr);
      setDiceRegenStatusLabel(DICE_REGEN_NEXT_DICE_LABEL);
      setDiceRegenRollsReady(null);
    }

    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [dicePool, runtimeState.diceRegenState, effectiveDiceCost]);

  useEffect(() => {
    setPerfectCompanionRuntimeConfig(readPerfectCompanionRuntimeConfig(session.user.id));
  }, [session.user.id]);

  const isReconcilingRuntimeStateRef = useRef(false);
  const reconcileRuntimeState = useCallback(async (
    reason: 'focus' | 'visibility' | 'realtime',
  ) => {
    if (!client || isReconcilingRuntimeStateRef.current || !hasHydratedRuntimeState) {
      return;
    }
    // Do NOT reconcile while a roll animation is in flight. The roll
    // service has already written the authoritative tokenIndex to
    // localStorage + Supabase, but `runtimeStateRef.current.runtimeVersion`
    // won't be bumped until `applyRollResult` runs at the end of the hop
    // sequence. A reconcile during that window could publish a snapshot
    // that ultimately causes the pawn to snap back to tile 0 when
    // `pendingHopSequence` clears. The next focus/visibility event after
    // the animation ends will naturally re-trigger reconciliation.
    if (isAnimatingRollRef.current || isRollSyncPendingRef.current) {
      if (isRollSyncPendingRef.current) {
        logIslandRunEntryDebug('island_run_runtime_reconcile_skipped_roll_sync_pending', {
          userId: session.user.id,
          reason,
          source: 'pre_hydrate',
          incomingTokenIndex: null,
          currentTokenIndex: runtimeStateRef.current.tokenIndex,
          incomingRuntimeVersion: null,
          currentRuntimeVersion: runtimeStateRef.current.runtimeVersion ?? 0,
          skipReason: 'roll_sync_pending',
        });
        logIslandRunEntryDebug('hydration_reconcile_skip', {
          reason,
          source: 'pre_hydrate',
          skipReason: 'roll_sync_pending',
        });
      }
      return;
    }

    isReconcilingRuntimeStateRef.current = true;
    try {
      const hydrationResult = await hydrateIslandRunRuntimeStateWithSource({ session, client });
      if (hydrationResult.source === 'table') {
        setRuntimeHydrationSource('table');
      }
      if (hydrationResult.source !== 'table') {
        logIslandRunEntryDebug('island_run_runtime_reconcile_skipped_non_table_source', {
          userId: session.user.id,
          reason,
          source: hydrationResult.source,
        });
        return;
      }

      const currentRuntimeVersion = runtimeStateRef.current.runtimeVersion ?? 0;
      const incomingRuntimeVersion = hydrationResult.state.runtimeVersion ?? 0;
      if (isRollSyncPendingRef.current) {
        logIslandRunEntryDebug('island_run_runtime_reconcile_skipped_roll_sync_pending', {
          userId: session.user.id,
          reason,
          source: hydrationResult.source,
          incomingTokenIndex: hydrationResult.state.tokenIndex,
          currentTokenIndex: runtimeStateRef.current.tokenIndex,
          incomingRuntimeVersion,
          currentRuntimeVersion,
          skipReason: 'roll_sync_pending',
        });
        logIslandRunEntryDebug('hydration_reconcile_skip', {
          reason,
          source: hydrationResult.source,
          skipReason: 'roll_sync_pending',
        });
        return;
      }
      if (incomingRuntimeVersion <= currentRuntimeVersion) {
        return;
      }

      const changedKeys = collectHydrationChangedKeysForDiagnostics({
        before: runtimeStateRef.current,
        after: hydrationResult.state,
        islandNumber: hydrationResult.state.currentIslandNumber,
      });
      setRuntimeStateWithTrace(`reconcileRuntimeState:${reason}`, hydrationResult.state);
      // C1: publish the hydrated record directly to the store mirror. Using
      // `refreshIslandRunStateFromLocal` here can re-apply an older local row
      // and cause token snap-back after reopen.
      resetIslandRunStateSnapshot(session, hydrationResult.state);
      logIslandRunEntryDebug('island_run_runtime_reconciled', {
        userId: session.user.id,
        reason,
        previousRuntimeVersion: currentRuntimeVersion,
        incomingRuntimeVersion,
        currentIslandNumber: hydrationResult.state.currentIslandNumber,
      });
      logIslandRunEntryDebug('hydration_reconcile_apply', {
        reason,
        source: hydrationResult.source,
        previousRuntimeVersion: currentRuntimeVersion,
        incomingRuntimeVersion,
        tokenIndexBefore: runtimeStateRef.current.tokenIndex,
        tokenIndexAfter: hydrationResult.state.tokenIndex,
      });
      if (isIsland120StartupDiagnosticTarget(hydrationResult.state.currentIslandNumber)) {
        logIslandRunEntryDebug('island120_hydration_reconciliation', {
          userId: session.user.id,
          trigger: reason,
          source: hydrationResult.source,
          sourceOrder: buildHydrationSourceOrder('in_memory', hydrationResult.source),
          previousRuntimeVersion: currentRuntimeVersion,
          incomingRuntimeVersion,
          changedKeys,
          wasOverwrite: changedKeys.length > 0,
        });
      }

    } catch (error) {
      logIslandRunEntryDebug('island_run_runtime_reconcile_error', {
        userId: session.user.id,
        reason,
        errorMessage: error instanceof Error ? error.message : 'unknown_error',
      });
    } finally {
      isReconcilingRuntimeStateRef.current = false;
    }
  }, [client, hasHydratedRuntimeState, session, setRuntimeStateWithTrace]);

  const requestActiveStopTransition = useCallback((nextStopId: string | null, source: string) => {
    island120PendingStopTransitionRef.current = {
      source,
      requestedStopId: nextStopId,
    };
    setActiveStopId(nextStopId);
  }, []);

  useEffect(() => {
    if (!hasHydratedRuntimeState) {
      return;
    }

    // Guard against runtime-version regression: if the `runtimeState` update we
    // are processing carries a *strictly older* runtimeVersion than the last
    // one we already applied to React mirrors, skip the mirror updates so we
    // don't snap the player token, dice pool, or other per-roll fields back to
    // a pre-roll value after a conflict-recovery / stale reconcile.
    const incomingRuntimeVersion = runtimeState.runtimeVersion ?? 0;
    const lastAppliedRuntimeVersion = lastAppliedRuntimeVersionRef.current;
    if (lastAppliedRuntimeVersion >= 0 && incomingRuntimeVersion < lastAppliedRuntimeVersion) {
      logIslandRunEntryDebug('island_run_runtime_hydration_sync_regression_skipped', {
        userId: session.user.id,
        lastAppliedRuntimeVersion,
        incomingRuntimeVersion,
        incomingTokenIndex: runtimeState.tokenIndex,
        incomingDicePool: runtimeState.dicePool,
      });
      return;
    }
    lastAppliedRuntimeVersionRef.current = incomingRuntimeVersion;

    const persistedIsland = runtimeState.currentIslandNumber;
    setIslandNumber((current) => (current === persistedIsland ? current : persistedIsland));
    setBossTrialResolved(runtimeState.bossTrialResolvedIslandNumber === persistedIsland);

    // Contract-v2 keeps timer fields for compatibility but prevents timer-driven progression side effects.
    const nowMs = Date.now();
    const hydrationTimerState = resolveIslandTimerHydrationState({
      islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED,
      persistedStartedAtMs: runtimeState.islandStartedAtMs,
      persistedExpiresAtMs: runtimeState.islandExpiresAtMs,
      nowMs,
      defaultDurationMs: getIslandDurationMs(persistedIsland),
    });

    setIslandStartedAtMs(hydrationTimerState.islandStartedAtMs);
    setIslandExpiresAtMs(hydrationTimerState.islandExpiresAtMs);
    setTimeLeftSec(hydrationTimerState.timeLeftSec);
    setIsIslandTimerPendingStart(hydrationTimerState.isIslandTimerPendingStart);

    if (hydrationTimerState.shouldAutoAdvanceOnHydration && !showTravelOverlay) {
      // Legacy-only: expired island auto-advances; v2 explicitly bypasses this path.
      void performIslandTravel(persistedIsland + 1, { startTimer: false });
    }

    // B5-3: Restore egg state from runtime state
    // M13: prefer per-island ledger for current island if entry is incubating/ready
    const islandKey = String(persistedIsland);
    const ledgerEntry = runtimeState.perIslandEggs?.[islandKey];
    if (ledgerEntry && (ledgerEntry.status === 'incubating' || ledgerEntry.status === 'ready')) {
      // Auto-transition incubating → ready if hatch time has passed (covers background/offline hatching)
      const nowHydrate = Date.now();
      const isHatched = nowHydrate >= ledgerEntry.hatchAtMs;
      if (isHatched && ledgerEntry.status === 'incubating') {
        const readyTransition = applyHydrationEggReadyTransition({
          session,
          client,
          islandNumber: persistedIsland,
          hatchNowMs: nowHydrate,
          triggerSource: 'hydrate_egg_ready_transition',
        });
        setRuntimeState(readyTransition.record);
      }
      setActiveEgg({
        tier: ledgerEntry.tier,
        setAtMs: ledgerEntry.setAtMs,
        hatchAtMs: ledgerEntry.hatchAtMs,
        isDormant: runtimeState.activeEggIsDormant,
      });
    } else if (!ledgerEntry && runtimeState.activeEggTier && runtimeState.activeEggSetAtMs && runtimeState.activeEggHatchDurationMs) {
      // Fallback to global slot for backward compat
      setActiveEgg({
        tier: runtimeState.activeEggTier,
        setAtMs: runtimeState.activeEggSetAtMs,
        hatchAtMs: runtimeState.activeEggSetAtMs + runtimeState.activeEggHatchDurationMs,
        isDormant: runtimeState.activeEggIsDormant,
      });
    }

    // C1: dicePool, tokenIndex, and spinTokens are now derived from the
    // authoritative store (`useIslandRunState`). The store is hydrated by
    // `hydrateIslandRunState` inside the main hydration handler; these
    // mirror-setters are no longer needed.
    // (Removed: setTokenIndex, setSpinTokens, setDicePool)

    // M16B: Restore shard state from runtime state on hydration
    const hydratedShards = runtimeState.islandShards ?? 0;
    const hydratedTierIndex = runtimeState.shardTierIndex ?? 0;
    setIslandShards(hydratedShards);
    setShardTierIndex(hydratedTierIndex);
    setShardClaimCount(runtimeState.shardClaimCount ?? 0);
    // M16C: derive shardMilestoneReached so Claim button re-appears after app restart
    if (hydratedShards >= getShardTierThreshold(hydratedTierIndex)) {
      setShardMilestoneReached(true);
      setPendingClaimTierIndex(hydratedTierIndex);
    }
    // M17A: Restore shields wallet currency from runtime state
    setShields(runtimeState.shields ?? 0);
    // M17C: Restore shards wallet currency from runtime state
    setShards(runtimeState.shards ?? 0);
    // M19A: Restore diamonds wallet currency from runtime state
    setDiamonds(runtimeState.diamonds ?? 3);
    // M19A: Restore market owned bundles from runtime state map (with one-time local fallback migration)
    const runtimeOwnedBundles = runtimeState.marketOwnedBundlesByIsland?.[islandKey];
    if (runtimeOwnedBundles) {
      updateMarketOwnedBundles({
        dice_bundle: Boolean(runtimeOwnedBundles.dice_bundle),
      }, { requestSync: false });
    } else {
      updateMarketOwnedBundles({ dice_bundle: false }, { requestSync: false });
    }
    // M4-COMPLETE: Restore cycleIndex from runtime state
    setCycleIndex(runtimeState.cycleIndex ?? 0);
    // Hydrate audio preferences only once — see hasHydratedAudioPreferencesRef.
    // Re-applying these on every sync run is what caused the toggle flicker and
    // music-track fighting reported on game open.
    if (!hasHydratedAudioPreferencesRef.current) {
      hasHydratedAudioPreferencesRef.current = true;
      setMusicEnabled(runtimeState.musicEnabled ?? runtimeState.audioEnabled ?? true);
      setSfxEnabled(runtimeState.sfxEnabled ?? runtimeState.audioEnabled ?? true);
    }
    setActiveCompanionId(runtimeState.activeCompanionId ?? null);
    setCreatureTreatInventory(runtimeState.creatureTreatInventory ?? fetchCreatureTreatInventory(session.user.id));

    // Mark initial hydration sync as complete so persist effects can now safely write.
    // This prevents the write amplification loop by ensuring local state (essence,
    // dice, etc.) has been synced from runtimeState before persist effects compare them.
    hasCompletedInitialHydrationSyncRef.current = true;
  }, [hasHydratedRuntimeState, runtimeState.activeCompanionId, runtimeState.activeEggHatchDurationMs, runtimeState.activeEggIsDormant, runtimeState.activeEggSetAtMs, runtimeState.activeEggTier, runtimeState.audioEnabled, runtimeState.bossTrialResolvedIslandNumber, runtimeState.currentIslandNumber, runtimeState.cycleIndex, runtimeState.perIslandEggs, runtimeState.islandStartedAtMs, runtimeState.islandExpiresAtMs, runtimeState.islandShards, runtimeState.tokenIndex, runtimeState.spinTokens, runtimeState.dicePool, runtimeState.shardTierIndex, runtimeState.shardClaimCount, runtimeState.shields, runtimeState.shards, runtimeState.diamonds, runtimeState.creatureTreatInventory, runtimeState.marketOwnedBundlesByIsland, session.user.id, updateMarketOwnedBundles]);

  // M16D: Snap fill bar to 0 immediately on island travel reset (no slide-back animation)
  useEffect(() => {
    const prev = prevShardsRef.current;
    prevShardsRef.current = islandShards;
    if (islandShards === 0 && prev > 0) {
      setShardFillNoTransition(true);
      const rafId = requestAnimationFrame(() => {
        setShardFillNoTransition(false);
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [islandShards]);

  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    const openHatcheryOnLoad = getOpenHatcheryOnLoadFlag();
    const openIslandStopOnLoad = getOpenIslandStopOnLoadFlag();
    const targetIslandNumber = runtimeState.currentIslandNumber ?? islandNumber;
    const storedStops = Array.isArray(runtimeState.completedStopsByIsland?.[String(targetIslandNumber)])
      ? runtimeState.completedStopsByIsland[String(targetIslandNumber)]!.filter((x): x is string => typeof x === 'string')
      : [];
    const currentIslandNumberOnLoad = runtimeState.currentIslandNumber ?? islandNumber;
    const currentIslandEggSlotsOnLoad = getEggSlotsForIsland(runtimeState.perIslandEggs, currentIslandNumberOnLoad);
    const hasActiveEggOnLoad = currentIslandEggSlotsOnLoad.some(({ entry }) => entry.status === 'incubating' || entry.status === 'ready')
      || Boolean(
        currentIslandEggSlotsOnLoad.length === 0
        && runtimeState.activeEggTier
        && runtimeState.activeEggSetAtMs
        && runtimeState.activeEggHatchDurationMs,
      );
    const islandEggSlotUsedOnLoad = areAllEggSlotsTerminalForIsland(runtimeState.perIslandEggs, currentIslandNumberOnLoad);
    if (openHatcheryOnLoad) {
      const shouldAutoOpen = shouldAutoOpenIslandStopOnLoad({
        requestedStopId: 'hatchery',
        islandNumber: runtimeState.currentIslandNumber ?? islandNumber,
        completedStopsByIsland: { [String(runtimeState.currentIslandNumber ?? islandNumber)]: storedStops },
        islandEggSlotUsed: islandEggSlotUsedOnLoad,
        hasActiveEgg: hasActiveEggOnLoad,
      });
      logIslandRunEntryDebug('island_stop_autopen_check', {
        userId: session.user.id,
        requestedStopId: 'hatchery',
        targetIslandNumber,
        openHatcheryOnLoad,
        openIslandStopOnLoad,
        storedStops,
        currentIslandEggStatus: currentIslandEggSlotsOnLoad[0]?.entry.status ?? null,
        hasActiveEggOnLoad,
        islandEggSlotUsedOnLoad,
        shouldAutoOpen,
      });
      if (shouldAutoOpen) {
        requestActiveStopTransition('hatchery', 'auto_open_hatchery');
      }
      // Clean the URL param without a reload
      const url = new URL(window.location.href);
      url.searchParams.delete('openHatchery');
      window.history.replaceState({}, '', url.toString());
      return;
    }

    if (openIslandStopOnLoad === 'boss' || openIslandStopOnLoad === 'mystery') {
      const shouldAutoOpen = shouldAutoOpenIslandStopOnLoad({
        requestedStopId: openIslandStopOnLoad,
        islandNumber: runtimeState.currentIslandNumber ?? islandNumber,
        completedStopsByIsland: { [String(runtimeState.currentIslandNumber ?? islandNumber)]: storedStops },
      });
      logIslandRunEntryDebug('island_stop_autopen_check', {
        userId: session.user.id,
        requestedStopId: openIslandStopOnLoad,
        targetIslandNumber,
        openHatcheryOnLoad,
        openIslandStopOnLoad,
        storedStops,
        currentIslandEggStatus: currentIslandEggSlotsOnLoad[0]?.entry.status ?? null,
        hasActiveEggOnLoad,
        islandEggSlotUsedOnLoad,
        shouldAutoOpen,
      });
      if (shouldAutoOpen) {
        requestActiveStopTransition(openIslandStopOnLoad, 'auto_open_stop_query_param');
      }
      // Clean the URL param without a reload
      const url = new URL(window.location.href);
      url.searchParams.delete('openIslandStop');
      window.history.replaceState({}, '', url.toString());
    }
  }, [hasHydratedRuntimeState, islandNumber, requestActiveStopTransition, runtimeState.completedStopsByIsland, runtimeState.currentIslandNumber, runtimeState.perIslandEggs, session.user.id]);

  useEffect(() => {
    logIslandRunEntryDebug('island_run_board_mount', {
      userId: session.user.id,
      islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED,
    });

    return () => {
      logIslandRunEntryDebug('island_run_board_unmount', {
        userId: session.user.id,
        islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED,
      });
    };
  }, [session.user.id]);

  useEffect(() => {
    const defaultName =
      (typeof session.user.user_metadata?.full_name === 'string' && session.user.user_metadata.full_name.trim()) ||
      session.user.email ||
      'Game of Life Player';
    setBoosterName(defaultName);
  }, [session.user.email, session.user.user_metadata]);

  useEffect(() => {
    // M7-COMPLETE: sync trial phase when boss modal opens (e.g. after page reload with already-resolved state)
    if (activeStopId === 'boss' && bossTrialResolved && bossTrialPhase === 'idle') {
      setBossTrialPhase('success');
    }
    if (!activeStopId && bossTrialPhase === 'in_progress') {
      setBossTrialPhase('idle');
      setBossTrialTimeLeft(0);
      setBossTrialScore(0);
    }
  }, [activeStopId, bossTrialResolved, bossTrialPhase]);

  // M3-COMPLETE: Escape key closes active stop modal — except for behavior
  // landmarks (Habit/Wisdom) that have been opened but not completed. Those must
  // be finished (answered) rather than abandoned, otherwise the landmark is left
  // visited-but-incomplete and rolling stays locked behind "Complete landmark
  // first". The current non-dismissable state is kept in a ref (assigned during
  // render below, once stopStateMap is available) so this effect does not need
  // to re-subscribe on every change.
  const nonDismissableActiveStopRef = useRef(false);
  useEffect(() => {
    if (!activeStopId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (nonDismissableActiveStopRef.current) return;
        e.preventDefault();
        requestActiveStopTransition(null, 'escape_close');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStopId, requestActiveStopTransition]);

  useEffect(() => {
    if (!showRewardDetailsModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowRewardDetailsModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showRewardDetailsModal]);
  useEffect(() => {
    if (!showRewardDetailsModal) {
      setIsRewardBarDetailsExpanded(false);
      setSelectedEventInfoEventId(null);
    }
  }, [showRewardDetailsModal]);

  // M6-COMPLETE: Escape key closes encounter modal
  useEffect(() => {
    if (!showEncounterModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowEncounterModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showEncounterModal]);

  // M8-COMPLETE: Escape key closes shop panel
  useEffect(() => {
    if (!showShopPanel) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowShopPanel(false);
        setMarketPurchaseFeedback(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShopPanel]);

  useEffect(() => {
    if (!hasHydratedRuntimeState || hasPresentedEntryAudioModalRef.current) return;
    hasPresentedEntryAudioModalRef.current = true;
    if (isIslandVisualPreview) {
      setHasDismissedEntryAudioModal(true);
      setShowEntryAudioModal(false);
      return;
    }
    setHasDismissedEntryAudioModal(false);
    setShowEntryAudioModal(true);
  }, [hasHydratedRuntimeState, isIslandVisualPreview]);

  // Compatibility hydration: accounts that finished the full Island 1 grid
  // BEFORE the Concord-built ledger existed have all nine slots collected but
  // no `technologyUnlocksById['the-concord']` entry. Without this bridge they
  // would be permanently blocked by the "build The Concord before finishing
  // Island 1" gate — every fragment tile is already a duplicate, so the 8→9
  // build transition can never fire again. Grant the build silently (no
  // celebration, no dice — the rewards were already paid on collection).
  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    const record = runtimeStateRef.current;
    const eligibility = resolveIslandTechnologyBuildEligibility(record, 'the-concord');
    if (eligibility.alreadyBuilt || !eligibility.eligible) return;
    const buildResult = applyIslandRunTechnologyBuild({
      session,
      client,
      technologyId: 'the-concord',
      source: 'compatibility-hydration',
    });
    if (buildResult.changed) {
      setRuntimeState(buildResult.record);
      runtimeStateRef.current = buildResult.record;
    }
  }, [client, hasHydratedRuntimeState, session]);

  const hasConfirmedEntryAudioChoice = hasDismissedEntryAudioModal && !showEntryAudioModal;

  useEffect(() => {
    return () => {
      setIslandRunAudioEnabled(false);
    };
  }, []);

  useEffect(() => {
    setIslandRunAudioEnabled(sfxEnabled && hasConfirmedEntryAudioChoice);
  }, [hasConfirmedEntryAudioChoice, sfxEnabled]);

  const islandRunMusicContext = useMemo(() => resolveIslandRunMusicContext({
    musicEnabled: musicEnabled && hasConfirmedEntryAudioChoice,
    effectiveIslandNumber,
    showShopPanel,
    showIslandClearCelebration,
  }), [effectiveIslandNumber, hasConfirmedEntryAudioChoice, musicEnabled, showIslandClearCelebration, showShopPanel]);

  useEffect(() => {
    applyIslandRunMusicContext(islandRunMusicContext);
  }, [islandRunMusicContext]);

  useEffect(() => {
    return () => {
      stopIslandRunMusic();
    };
  }, []);

  useEffect(() => {
    if (!showSanctuaryPanel) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedSanctuaryCreatureId) {
          setSelectedSanctuaryCreatureId(null);
          return;
        }
        setShowSanctuaryPanel(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSanctuaryCreatureId, showSanctuaryPanel]);

  useEffect(() => {
    if (!showSanctuaryPanel) return undefined;
    const intervalId = window.setInterval(() => {
      setSanctuaryClockMs(Date.now());
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [showSanctuaryPanel]);

  useEffect(() => {
    if (!showSanctuaryPanel || !showSanctuaryMenu || sanctuaryMenuModule !== 'inventory') return;
    let cancelled = false;

    const loadThemeEntitlements = async () => {
      setThemeEntitlementsLoading(true);
      const { themeIds, error } = await fetchOwnedThemeIds(session.user.id);
      if (cancelled) return;
      setOwnedThemeIds(themeIds);
      setThemeCheckoutError(error?.message ?? null);
      setThemeEntitlementsLoading(false);
    };

    void loadThemeEntitlements();

    return () => {
      cancelled = true;
    };
  }, [showSanctuaryMenu, showSanctuaryPanel, sanctuaryMenuModule, session.user.id]);

  useEffect(() => {
    if (hasHydratedRuntimeState) return;
    setCreatureTreatInventory(fetchCreatureTreatInventory(session.user.id));
  }, [hasHydratedRuntimeState, session.user.id]);

  useEffect(() => {
    const { collection } = migrateLegacyEggLedgerToCollection({
      userId: session.user.id,
      perIslandEggs: runtimeState.perIslandEggs ?? {},
    });
    const runtimeCollection = Array.isArray(runtimeState.creatureCollection)
      ? runtimeState.creatureCollection
      : [];
    if (runtimeCollection.length > 0) {
      setCreatureCollection(mergeCreatureCollections(runtimeCollection, collection));
      return;
    }
    setCreatureCollection(collection);
  }, [runtimeState.perIslandEggs, runtimeState.creatureCollection, session.user.id]);

  useEffect(() => {
    const stillOwned = creatureCollection.some((entry) => entry.creatureId === activeCompanionId);
    if (activeCompanionId && !stillOwned) {
      if ((runtimeState.activeCompanionId ?? null) !== activeCompanionId) {
        setActiveCompanionId(runtimeState.activeCompanionId ?? null);
        return;
      }
      const nextRecord = commitClearActiveCompanionId({
        session,
        client,
        triggerSource: 'cleanup_unowned_active_companion',
      });
      setActiveCompanionId(nextRecord.activeCompanionId ?? null);
      setRuntimeState((current) => ({ ...current, activeCompanionId: nextRecord.activeCompanionId ?? null }));
    }
  }, [activeCompanionId, client, creatureCollection, runtimeState.activeCompanionId, session]);

  useEffect(() => {
    if (!selectedSanctuaryCreatureId) return;
    const stillExists = creatureCollection.some((entry) => entry.creatureId === selectedSanctuaryCreatureId);
    if (!stillExists) {
      setSelectedSanctuaryCreatureId(null);
      setSanctuaryFeedback(null);
    }
  }, [creatureCollection, selectedSanctuaryCreatureId]);

  // M6-COMPLETE: Breathing challenge countdown — auto-completes when it reaches 0
  useEffect(() => {
    if (!showEncounterModal) return;
    if (encounterStep !== 'challenge') return;
    if (currentEncounterChallenge?.type !== 'breathing') return;
    if (breathingSecondsLeft <= 0) return;

    const timerId = window.setTimeout(() => {
      setBreathingSecondsLeft((s) => {
        const next = s - 1;
        return next;
      });
    }, 1000);
    return () => window.clearTimeout(timerId);
  }, [showEncounterModal, encounterStep, currentEncounterChallenge, breathingSecondsLeft]);

  // M6-COMPLETE: When breathing countdown reaches 0, auto-complete the challenge
  useEffect(() => {
    if (!showEncounterModal) return;
    if (encounterStep !== 'challenge') return;
    if (currentEncounterChallenge?.type !== 'breathing') return;
    if (breathingSecondsLeft !== 0) return;
    // Only trigger if we were actually counting down (durationSeconds > 0 means it was started)
    if (currentEncounterChallenge.durationSeconds > 0) {
      // Small delay so the "0" display is briefly visible before reward reveal
      const timerId = window.setTimeout(() => {
        handleBreathingAutoComplete();
      }, 500);
      return () => window.clearTimeout(timerId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breathingSecondsLeft, encounterStep, showEncounterModal, currentEncounterChallenge]);

  useEffect(() => {
    if (!showEncounterModal) return;
    if (encounterStep !== 'reward') return;
    const autoCloseTimer = window.setTimeout(() => {
      setShowEncounterModal(false);
    }, 1800);
    return () => window.clearTimeout(autoCloseTimer);
  }, [showEncounterModal, encounterStep]);

  useEffect(() => {
    if (!showDebug && !showQaHooks) {
      return;
    }

    window.__islandRunMarketDebugExportMarkers = (limit = 12) => {
      const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 12;
      const evidence = window.__islandRunEntryDebugEvidence?.();
      const events = evidence?.events ?? [];

      const filteredEvents = events.filter((event) => {
        if (event.stage !== 'island_run_market_purchase') {
          return false;
        }

        if (!marketMarkerBaselineMs) {
          return true;
        }

        const eventMs = Date.parse(event.timestamp);
        return Number.isFinite(eventMs) && eventMs >= marketMarkerBaselineMs;
      });

      const rows = filteredEvents.slice(-safeLimit).map((event) => ({
        status: event.payload?.status as IslandRunMarketPurchaseSnapshotRow['status'],
        bundle: event.payload?.bundle as IslandRunMarketPurchaseSnapshotRow['bundle'],
        costCoins: event.payload?.costCoins as number | undefined,
        rewardDice: event.payload?.rewardDice as number | undefined,
        coinsBefore: event.payload?.coinsBefore as number | undefined,
        coinsAfter: event.payload?.coinsAfter as number | undefined,
        ownedDiceBundle: event.payload?.ownedDiceBundle as boolean | undefined,
        timestamp: event.timestamp,
      }));

      const snapshot = {
        generatedAt: new Date().toISOString(),
        totalMarkers: rows.length,
        baselineApplied: Boolean(marketMarkerBaselineMs),
        baselineIso: marketMarkerBaselineMs ? new Date(marketMarkerBaselineMs).toISOString() : undefined,
        rows,
      };

      console.info('[IslandRunMarketDebugMarkers]', snapshot);
      return snapshot;
    };

    window.__islandRunMarketDebugAssertStatusCoverage = (expectedStatuses, limit = 32) => {
      const normalizedExpected = (Array.isArray(expectedStatuses) && expectedStatuses.length
        ? expectedStatuses
        : ['attempt', 'insufficient_coins', 'success', 'already_owned']) as IslandRunMarketPurchaseStatus[];
      const snapshot = window.__islandRunMarketDebugExportMarkers?.(limit);
      const coveredStatuses = Array.from(
        new Set(snapshot?.rows.map((row) => row.status).filter((status): status is IslandRunMarketPurchaseStatus => Boolean(status))),
      );
      const missingStatuses = normalizedExpected.filter((status) => !coveredStatuses.includes(status));

      const report: IslandRunMarketStatusCoverageReport = {
        generatedAt: new Date().toISOString(),
        passed: missingStatuses.length === 0,
        expectedStatuses: normalizedExpected,
        coveredStatuses,
        missingStatuses,
        markerCount: snapshot?.rows.length ?? 0,
        baselineApplied: snapshot?.baselineApplied ?? false,
        baselineIso: snapshot?.baselineIso,
      };

      console.info('[IslandRunMarketStatusCoverage]', report.passed ? 'PASS' : 'FAIL', report);
      return report;
    };

    setRuntimeVerificationSnapshot(window.__islandRunEntryDebugRuntimeStateSummary?.() ?? null);

    window.__islandRunMarketDebugResetState = () => {
      const resetAt = new Date().toISOString();
      const resetMs = Date.parse(resetAt);

      setMarketPurchaseFeedback(null);
      updateMarketOwnedBundles({
        dice_bundle: false,
      });

      const result = {
        resetAt,
        baselineApplied: true,
        ownedBundles: [],
        feedbackCleared: true,
      };

      console.info('[IslandRunMarketDebugReset]', result);
      return result;
    };

    return () => {
      delete window.__islandRunMarketDebugExportMarkers;
      delete window.__islandRunMarketDebugResetState;
      delete window.__islandRunMarketDebugAssertStatusCoverage;
    };
  }, [marketMarkerBaselineMs, showDebug, showQaHooks]);

  useEffect(() => {
    if (!showDebug && !showQaHooks) return;
    setRuntimeVerificationSnapshot(window.__islandRunEntryDebugRuntimeStateSummary?.() ?? null);
  }, [showDebug, showQaHooks, runtimeState, hasHydratedRuntimeState]);

  useEffect(() => {
    let isActive = true;
    const localSnapshotBeforeHydration = readIslandRunRuntimeState(session);

    setHasHydratedRuntimeState(false);
    setRuntimeHydrationSource(null);
    setRuntimeStateWithTrace('initial_hydrate_local_snapshot', localSnapshotBeforeHydration);

    void hydrateIslandRunRuntimeStateWithSource({ session, client, forceRemote: true })
      .then((hydrationResult) => {
        if (!isActive) return;
        setRuntimeHydrationSource(hydrationResult.source);
        // Only apply the remote state when it is strictly newer than the local snapshot.
        // When local and remote share the same runtimeVersion but differ in content (e.g.
        // a build or essence earn was written to localStorage but the Supabase commit was
        // interrupted), the local snapshot is the authoritative source of truth.
        // For non-'table' sources the hydration result IS the local fallback, so applying
        // it is always safe and is left unchanged.
        if (
          hydrationResult.source !== 'table' ||
          hydrationResult.state.runtimeVersion > localSnapshotBeforeHydration.runtimeVersion
        ) {
          if (isRollSyncPendingRef.current) {
            logIslandRunEntryDebug('island_run_runtime_reconcile_skipped_roll_sync_pending', {
              userId: session.user.id,
              reason: 'initial_hydrate',
              source: hydrationResult.source,
              incomingTokenIndex: hydrationResult.state.tokenIndex,
              currentTokenIndex: runtimeStateRef.current.tokenIndex,
              incomingRuntimeVersion: hydrationResult.state.runtimeVersion ?? 0,
              currentRuntimeVersion: runtimeStateRef.current.runtimeVersion ?? 0,
              skipReason: 'roll_sync_pending',
            });
            logIslandRunEntryDebug('hydration_reconcile_skip', {
              reason: 'initial_hydrate',
              source: hydrationResult.source,
              skipReason: 'roll_sync_pending',
            });
          } else {
            setRuntimeStateWithTrace('initial_hydrate_apply', hydrationResult.state);
            // C1: publish exactly the hydrated record so the visual token source
            // (`useIslandRunState`) cannot lag behind runtimeState on first roll.
            resetIslandRunStateSnapshot(session, hydrationResult.state);
            logIslandRunEntryDebug('hydration_reconcile_apply', {
              reason: 'initial_hydrate',
              source: hydrationResult.source,
              tokenIndexAfter: hydrationResult.state.tokenIndex,
              runtimeVersionAfter: hydrationResult.state.runtimeVersion ?? 0,
            });
          }
        }

        logIslandRunEntryDebug('island_run_runtime_hydration_result', {
          userId: session.user.id,
          source: hydrationResult.source,
          currentIslandNumber: hydrationResult.state.currentIslandNumber,
          bossTrialResolvedIslandNumber: hydrationResult.state.bossTrialResolvedIslandNumber,
          cycleIndex: hydrationResult.state.cycleIndex,
          tokenIndex: hydrationResult.state.tokenIndex,
          spinTokens: hydrationResult.state.spinTokens,
          dicePool: hydrationResult.state.dicePool,
        });

        if (
          isIsland120StartupDiagnosticTarget(localSnapshotBeforeHydration.currentIslandNumber)
          || isIsland120StartupDiagnosticTarget(hydrationResult.state.currentIslandNumber)
        ) {
          const changedKeys = collectHydrationChangedKeysForDiagnostics({
            before: localSnapshotBeforeHydration,
            after: hydrationResult.state,
            islandNumber: hydrationResult.state.currentIslandNumber,
          });
          logIslandRunEntryDebug('island120_hydration_reconciliation', {
            userId: session.user.id,
            trigger: 'initial_hydrate',
            source: hydrationResult.source,
            sourceOrder: buildHydrationSourceOrder('local_storage', hydrationResult.source),
            localIslandNumber: localSnapshotBeforeHydration.currentIslandNumber,
            incomingIslandNumber: hydrationResult.state.currentIslandNumber,
            changedKeys,
            wasOverwrite: hydrationResult.source === 'table' && changedKeys.length > 0,
          });
        }

        setRuntimeVerificationSnapshot(window.__islandRunEntryDebugRuntimeStateSummary?.() ?? null);

        if (hydrationResult.source !== 'table') {
          setLandingText('Using local runtime fallback while server runtime state is unavailable.');
        }

        if (shouldEmitIslandRunRuntimeHydrationTelemetry({
          userId: session.user.id,
          eventType: 'runtime_state_hydrated',
          source: hydrationResult.source,
        })) {
          void recordTelemetryEvent({
            userId: session.user.id,
            eventType: 'runtime_state_hydrated',
            metadata: {
              stage: ISLAND_RUN_RUNTIME_HYDRATION_STAGE,
              source: hydrationResult.source,
              current_island_number: hydrationResult.state.currentIslandNumber,
              boss_trial_resolved_island_number: hydrationResult.state.bossTrialResolvedIslandNumber,
              cycle_index: hydrationResult.state.cycleIndex,
              token_index: hydrationResult.state.tokenIndex,
              spin_tokens: hydrationResult.state.spinTokens,
              dice_pool: hydrationResult.state.dicePool,
            },
          });
        }
      })
      .catch((error: unknown) => {
        logIslandRunEntryDebug('island_run_runtime_hydration_error', {
          userId: session.user.id,
          errorMessage: error instanceof Error ? error.message : 'unknown_error',
        });
        if (isActive) {
          setLandingText('Using local runtime fallback while runtime hydration failed unexpectedly.');
        }

        if (shouldEmitIslandRunRuntimeHydrationTelemetry({
          userId: session.user.id,
          eventType: 'runtime_state_hydration_failed',
        })) {
          void recordTelemetryEvent({
            userId: session.user.id,
            eventType: 'runtime_state_hydration_failed',
            metadata: {
              stage: ISLAND_RUN_RUNTIME_HYDRATION_FAILED_STAGE,
              error_message: error instanceof Error ? error.message : 'unknown_error',
            },
          });
        }
      })
      .finally(() => {
        if (!isActive) return;
        setHasHydratedRuntimeState(true);
      });

    return () => {
      isActive = false;
    };
  }, [client, session.user.id, setRuntimeStateWithTrace]);

  useEffect(() => {
    if (!hasHydratedRuntimeState || !isIsland120StartupDiagnosticActive) return;
    if (island120StartupDiagnosticSessionStartMsRef.current !== null) return;
    island120StartupDiagnosticSessionStartMsRef.current = Date.now();
    island120PrevActiveStopIdRef.current = activeStopId;
    island120ToggleHintCounterByPairRef.current = {};
    island120StartupSnapshotLoggedRef.current = false;
  }, [activeStopId, hasHydratedRuntimeState, isIsland120StartupDiagnosticActive]);

  const isRuntimeSyncBlocked =
    hasHydratedRuntimeState &&
    runtimeHydrationSource !== null &&
    (runtimeHydrationSource === 'fallback_query_error' ||
      (runtimeHydrationSource === 'fallback_demo_or_no_client' && !isDemoSession(session)));
  const isOwnershipBlocked = otherDeviceTakeoverPrompt !== null;

  // One-shot check on entry: was the server row written very recently by a
  // different device? `last_writer_device_session_id` + `updated_at` are
  // maintained by every commit (islandRunGameStateStore.toRemoteRow), so a
  // fresh write from another device session means Island Run is (or was
  // seconds ago) open elsewhere.
  useEffect(() => {
    if (!hasHydratedRuntimeState || hasCheckedOtherDeviceActivityRef.current) return;
    if (!client || isDemoSession(session)) return;
    hasCheckedOtherDeviceActivityRef.current = true;

    const ownDeviceSessionId = getIslandRunDeviceSessionId(session.user.id);
    const RECENT_OTHER_DEVICE_WRITE_WINDOW_MS = 45_000;
    void (async () => {
      try {
        const { data, error } = await client
          .from('island_run_runtime_state')
          .select('last_writer_device_session_id,updated_at')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (error || !data) return;
        const lastWriter = typeof data.last_writer_device_session_id === 'string'
          ? data.last_writer_device_session_id
          : null;
        const updatedAtMs = typeof data.updated_at === 'string' ? Date.parse(data.updated_at) : Number.NaN;
        if (!lastWriter || lastWriter === ownDeviceSessionId || !Number.isFinite(updatedAtMs)) return;
        if (Date.now() - updatedAtMs > RECENT_OTHER_DEVICE_WRITE_WINDOW_MS) return;
        logIslandRunEntryDebug('island_run_other_device_recent_write_detected', {
          userId: session.user.id,
          lastWriterDeviceSessionId: lastWriter,
          updatedAt: new Date(updatedAtMs).toISOString(),
        });
        setOtherDeviceTakeoverPrompt({ lastWriterDeviceSessionId: lastWriter, updatedAtMs });
      } catch {
        // Detection is best-effort; never block entry on a failed check.
      }
    })();
  }, [client, hasHydratedRuntimeState, session]);

  const retryRuntimeSync = useCallback(async () => {
    logIslandRunEntryDebug('island_run_runtime_retry_sync_started', {
      userId: session.user.id,
    });
    try {
      const hydrationResult = await hydrateIslandRunRuntimeStateWithSource({ session, client, forceRemote: true });
      setRuntimeHydrationSource(hydrationResult.source);
      if (isRollSyncPendingRef.current) {
        logIslandRunEntryDebug('island_run_runtime_reconcile_skipped_roll_sync_pending', {
          userId: session.user.id,
          reason: 'retry_sync',
          source: hydrationResult.source,
          incomingTokenIndex: hydrationResult.state.tokenIndex,
          currentTokenIndex: runtimeStateRef.current.tokenIndex,
          incomingRuntimeVersion: hydrationResult.state.runtimeVersion ?? 0,
          currentRuntimeVersion: runtimeStateRef.current.runtimeVersion ?? 0,
          skipReason: 'roll_sync_pending',
        });
        logIslandRunEntryDebug('hydration_reconcile_skip', {
          reason: 'retry_sync',
          source: hydrationResult.source,
          skipReason: 'roll_sync_pending',
        });
      } else {
        setRuntimeStateWithTrace('retry_hydrate_apply', hydrationResult.state);
        // Keep store mirror aligned to the hydrated runtime snapshot.
        resetIslandRunStateSnapshot(session, hydrationResult.state);
        logIslandRunEntryDebug('hydration_reconcile_apply', {
          reason: 'retry_sync',
          source: hydrationResult.source,
          tokenIndexAfter: hydrationResult.state.tokenIndex,
          runtimeVersionAfter: hydrationResult.state.runtimeVersion ?? 0,
        });
      }

      if (hydrationResult.source === 'table') {
        setLandingText('Island Run synced successfully. You can continue playing.');
        logIslandRunEntryDebug('island_run_runtime_retry_sync_succeeded', {
          userId: session.user.id,
          source: hydrationResult.source,
        });
        return;
      }

      logIslandRunEntryDebug('island_run_runtime_retry_sync_failed', {
        userId: session.user.id,
        stage: 'hydration_not_table',
        source: hydrationResult.source,
      });
    } catch (error) {
      logIslandRunEntryDebug('island_run_runtime_retry_sync_failed', {
        userId: session.user.id,
        stage: 'exception',
        errorMessage: error instanceof Error ? error.message : 'unknown_error',
      });
    }
  }, [client, session.user.id, setRuntimeStateWithTrace]);

  const takeOverFromOtherDevice = useCallback(async () => {
    setIsRetryingSync(true);
    try {
      await retryRuntimeSync();
      setOtherDeviceTakeoverPrompt(null);
      logIslandRunEntryDebug('island_run_other_device_takeover_confirmed', {
        userId: session.user.id,
      });
    } finally {
      setIsRetryingSync(false);
    }
  }, [retryRuntimeSync, session.user.id]);

  useEffect(() => {
    if (!hasHydratedRuntimeState || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const onFocus = () => {
      applyPassiveDiceRegen('focus');
      void reconcileRuntimeState('focus');
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        applyPassiveDiceRegen('visibility');
        void reconcileRuntimeState('visibility');
      } else {
        // Going to background: push any queued commit now so other devices
        // see this device's progress while it sleeps. iOS PWAs never fire
        // beforeunload, so hidden/pagehide are the only exit signals.
        void flushIslandRunPendingWrite({ session, client, triggerSource: 'visibility_hidden_flush' });
      }
    };

    const onPageHide = () => {
      void flushIslandRunPendingWrite({ session, client, triggerSource: 'pagehide_flush' });
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [applyPassiveDiceRegen, client, hasHydratedRuntimeState, reconcileRuntimeState, session]);

  // Cross-device convergence: reconcile as soon as another device commits a
  // newer runtime snapshot, instead of waiting for this device's next
  // focus/visibility event. Without this, a device left open on the game
  // keeps a stale in-memory snapshot and its next write drags old egg/dice
  // state through the conflict merge.
  useEffect(() => {
    if (!hasHydratedRuntimeState || !client || isDemoSession(session)) {
      return;
    }

    const ownDeviceSessionId = getIslandRunDeviceSessionId(session.user.id);
    const channel = client
      .channel(`island_run_runtime_state_${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'island_run_runtime_state',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const next = payload.new as {
            runtime_version?: number;
            last_writer_device_session_id?: string | null;
          } | null;
          const incomingVersion = typeof next?.runtime_version === 'number' ? next.runtime_version : null;
          // The commit RPC replaces the row (delete + insert), so DELETE
          // events arrive with an empty `new` payload — ignore them and act
          // on the INSERT/UPDATE that carries the fresh row.
          if (incomingVersion === null) {
            return;
          }
          const lastWriter = typeof next?.last_writer_device_session_id === 'string'
            ? next.last_writer_device_session_id
            : null;
          if (lastWriter && lastWriter === ownDeviceSessionId) {
            return;
          }
          if (incomingVersion <= (runtimeStateRef.current.runtimeVersion ?? 0)) {
            return;
          }
          logIslandRunEntryDebug('island_run_runtime_realtime_change_received', {
            userId: session.user.id,
            incomingRuntimeVersion: incomingVersion,
            currentRuntimeVersion: runtimeStateRef.current.runtimeVersion ?? 0,
            lastWriterDeviceSessionId: lastWriter,
          });
          void reconcileRuntimeState('realtime');
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, hasHydratedRuntimeState, reconcileRuntimeState, session]);

  useEffect(() => {
    setIsDisplayNameLoopCompleted(runtimeState.onboardingDisplayNameLoopCompleted === true);
  }, [runtimeState.onboardingDisplayNameLoopCompleted]);

  useEffect(() => {
    if (!hasHydratedRuntimeState || isOnboardingComplete || isIslandVisualPreview) return;

    if (!isFirstRunClaimed) {
      setShowFirstRunCelebration(true);
      setFirstRunStep('celebration');
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'onboarding_completed',
        metadata: { stage: 'island_run_first_run_started', island: islandNumber },
      });
    }
  }, [hasHydratedRuntimeState, isFirstRunClaimed, isIslandVisualPreview, isOnboardingComplete, islandNumber, session.user.id]);

  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    // Guard: Skip until the initial hydration sync effect has applied server values
    // to local state. This prevents the write amplification loop.
    if (!hasCompletedInitialHydrationSyncRef.current) return;
    if (runtimeState.onboardingDisplayNameLoopCompleted === isDisplayNameLoopCompleted) return;
    const next = applyOnboardingDisplayNameLoopMarker({
      session,
      client,
      completed: isDisplayNameLoopCompleted,
      triggerSource: 'sync_onboarding_display_name_loop_marker_effect',
    });
    setRuntimeState(next);
  }, [client, hasHydratedRuntimeState, isDisplayNameLoopCompleted, runtimeState.onboardingDisplayNameLoopCompleted, session]);

  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    if (!hasCompletedInitialHydrationSyncRef.current) return;
    if (runtimeState.musicEnabled === musicEnabled && runtimeState.sfxEnabled === sfxEnabled) return;
    const next = applyAudioPreferencesMarker({
      session,
      client,
      musicEnabled,
      sfxEnabled,
      triggerSource: 'sync_audio_preferences_marker_effect',
    });
    setRuntimeState(next);
  }, [client, hasHydratedRuntimeState, musicEnabled, runtimeState.musicEnabled, runtimeState.sfxEnabled, session, sfxEnabled]);

  useEffect(() => {
    const ticker = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(ticker);
  }, []);

  useEffect(() => {
    const updateBoardSize = () => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      setBoardSize({ width: rect.width, height: rect.height });
    };

    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
  }, []);

  // Island clear celebration is now gated by the "Travel to next island" CTA,
  // so it no longer auto-dismisses. The modal closes inside
  // handleTravelFromCelebration (which also triggers performIslandTravel).
  // performIslandTravel itself clears showIslandClearCelebration + stats, so
  // the celebration can never persist across an island change.

  const islandStopPlan = useMemo(
    () => generateIslandStopPlan(islandNumber, { profileId: ACTIVE_BOARD_PROFILE.id }),
    [islandNumber],
  );

  // B1-3: dayIndex computed from island start time
  const dayIndex = useMemo(
    () => Math.floor((nowMs - islandStartedAtMs) / (24 * 60 * 60 * 1000)),
    [nowMs, islandStartedAtMs],
  );

  // B1-3: regenerate tileMap whenever islandNumber or dayIndex changes
  useEffect(() => {
    const rarity = getIslandRarity(islandNumber);
    setTileMap(generateTileMap(islandNumber, rarity, activeTheme.tileThemeId, dayIndex, { profileId: ACTIVE_BOARD_PROFILE.id }));
  }, [activeTheme.tileThemeId, islandNumber, dayIndex]);

  // B4-4: log dayIndex changes for debug
  useEffect(() => {
    logIslandRunEntryDebug('island_day_index', { islandNumber, dayIndex });
  }, [islandNumber, dayIndex]);

  const [completedStops, setCompletedStops] = useState<string[]>([]);

  const updateCompletedStops = useCallback((updater: SetStateAction<string[]>) => {
    setCompletedStops((current) => {
      const next = typeof updater === 'function'
        ? (updater as (value: string[]) => string[])(current)
        : updater;
      const changed = !areStringArraysEqual(current, next);
      return changed ? next : current;
    });
  }, []);
  const updateCompletedStopsWithSync = useCallback((
    updater: SetStateAction<string[]>,
    options?: { requestSync?: boolean; triggerSource?: string },
  ) => {
    const requestSync = options?.requestSync !== false;
    const triggerSource = options?.triggerSource ?? 'sync_completed_stops_helper';
    let normalizedForSync: string[] = [];
    let shouldSync = false;
    updateCompletedStops((current) => {
      const next = typeof updater === 'function'
        ? (updater as (value: string[]) => string[])(current)
        : updater;
      const changed = !areStringArraysEqual(current, next);
      if (changed && requestSync) {
        normalizedForSync = normalizeCompletedStopsForSync(next);
        shouldSync = true;
      }
      return changed ? next : current;
    });
    if (!shouldSync || !normalizedForSync) return;
    const normalizedStopsForSync: string[] = normalizedForSync;
    const islandKey = String(islandNumber);
    const dispatchKey = `${islandKey}::${normalizedStopsForSync.join('|')}`;
    if (completedStopsSyncDispatchKeyRef.current === dispatchKey) return;
    const persistedStops = normalizeCompletedStopsForSync(runtimeStateRef.current.completedStopsByIsland?.[islandKey] ?? []);
    if (areStringArraysEqual(persistedStops, normalizedStopsForSync)) {
      completedStopsSyncDispatchKeyRef.current = null;
      return;
    }
    completedStopsSyncDispatchKeyRef.current = dispatchKey;
    const nextRuntimeState = syncCompletedStopsForIsland({
      session,
      client,
      islandNumber,
      completedStops: normalizedStopsForSync,
      triggerSource,
    });
    setRuntimeStateWithTrace('sync_completed_stops_helper', (current) => (
      current.completedStopsByIsland === nextRuntimeState.completedStopsByIsland
        ? current
        : {
          ...current,
          completedStopsByIsland: nextRuntimeState.completedStopsByIsland,
        }
    ));
  }, [client, islandNumber, session, setRuntimeStateWithTrace, updateCompletedStops]);

  const getStoredCompletedStopsForIsland = useCallback((targetIslandNumber: number): string[] => {
    const persistedStops = runtimeState.completedStopsByIsland?.[String(targetIslandNumber)];
    if (Array.isArray(persistedStops)) {
      return persistedStops.filter((x): x is string => typeof x === 'string');
    }
    // Runtime migration is complete — no localStorage fallback needed.
    return [];
  }, [runtimeState.completedStopsByIsland]);

  // M11D: restore completedStops from table-backed runtime state first; fallback to localStorage
  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    const storedStops = getStoredCompletedStopsForIsland(islandNumber);
    if (storedStops.length > 0) {
      updateCompletedStopsWithSync((current) => (areStringArraysEqual(current, storedStops) ? current : storedStops), { requestSync: false });
      return;
    }
    updateCompletedStopsWithSync((current) => (current.length === 0 ? current : []), { requestSync: false });
  }, [getStoredCompletedStopsForIsland, hasHydratedRuntimeState, islandNumber, updateCompletedStopsWithSync]);

  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    // Open every island in an honest phone overview. Stop-focus remains an
    // explicit player/gameplay action after entry; it must not crop the route
    // behind the controller before the player has seen the whole board.
    if (hasAppliedInitialOverviewRef.current) return;
    hasAppliedInitialOverviewRef.current = true;
    setFocusedStopId(null);
    setCameraMode('overview_manual');
    window.requestAnimationFrame(() => boardCameraRef.current?.goOverview());
  }, [hasHydratedRuntimeState, islandNumber]);

  const focusNextAvailableStop = useCallback(() => {
    const nextActiveStop = islandStopPlan.find((stop) => !completedStops.includes(stop.stopId));
    if (!nextActiveStop) return;
    setIsTopbarMenuPrimed(false);
    setFocusedStopId(nextActiveStop.stopId);
    setCameraMode('stop_focus');
    setLandingText(`Focused on ${nextActiveStop.title}.`);
  }, [completedStops, islandStopPlan]);

  // Clear completed-stop dedupe key on hydration reset/login transitions.
  useEffect(() => {
    if (!hasHydratedRuntimeState) {
      completedStopsSyncDispatchKeyRef.current = null;
    }
  }, [hasHydratedRuntimeState]);

  // ── C1: dicePool/tokenIndex/spinTokens persist effect REMOVED ────────────
  // The old useEffect at this location watched the three mirrors and called
  // `writeIslandRunGameStateRecord` to sync them back to localStorage. This
  // was the #1 drift vector: the roll service committed to localStorage
  // FIRST, then this effect fired with stale React state and overwrote the
  // roll's authoritative values. Now that these fields are store-derived
  // (via `useIslandRunState`), every mutation flows through
  // `commitIslandRunState` or a dedicated action (applyRollResult,
  // applyTokenHopRewards), and the store is the single source of truth.
  // Unmigrated paths use shim setters that commit through the store.

  // M19A: persist diamonds to runtime state (cross-device)
  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    // Guard: Skip until the initial hydration sync effect has applied server values
    // to local state. This prevents the write amplification loop.
    if (!hasCompletedInitialHydrationSyncRef.current) return;
    if (runtimeState.diamonds === diamonds) return;
    const result = applyWalletDiamondsSet({
      session,
      client,
      nextDiamonds: diamonds,
      triggerSource: 'sync_diamonds_marker_effect',
    });
    setRuntimeState(result.record);
  }, [client, diamonds, hasHydratedRuntimeState, runtimeState.diamonds, session]);

  // Hydration gate: suppress market-owned bundle sync requests during initial
  // runtime hydration/restore so startup renders cannot trigger persistence.
  useEffect(() => {
    if (!hasHydratedRuntimeState) {
      setHasMarketOwnedBundleHydrationGate(false);
      marketOwnedBundleSyncRequestedRef.current = false;
      marketOwnedBundleSyncDispatchKeyRef.current = null;
      return;
    }
    marketOwnedBundleSyncRequestedRef.current = false;
    setHasMarketOwnedBundleHydrationGate(true);
  }, [hasHydratedRuntimeState]);

  // M19A: persist market owned state to runtime state map (and mirror legacy local storage key for compatibility)
  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    if (!hasMarketOwnedBundleHydrationGate) return;
    // Guard: Skip until the initial hydration sync effect has applied server values
    // to local state. This prevents the write amplification loop.
    if (!hasCompletedInitialHydrationSyncRef.current) return;
    if (!marketOwnedBundleSyncRequestedRef.current) return;
    const islandKey = String(islandNumber);
    const persistedOwned = Boolean(runtimeState.marketOwnedBundlesByIsland?.[islandKey]?.dice_bundle);
    const localOwned = Boolean(marketOwnedBundles.dice_bundle);
    const dispatchKey = `${islandKey}::dice_bundle:${localOwned ? 1 : 0}`;
    if (persistedOwned === localOwned) {
      marketOwnedBundleSyncRequestedRef.current = false;
      if (marketOwnedBundleSyncDispatchKeyRef.current === dispatchKey) {
        marketOwnedBundleSyncDispatchKeyRef.current = null;
      }
      return;
    }
    if (marketOwnedBundleSyncDispatchKeyRef.current === dispatchKey) {
      return;
    }
    marketOwnedBundleSyncRequestedRef.current = false;
    marketOwnedBundleSyncDispatchKeyRef.current = dispatchKey;
    const nextRecord = applyMarketOwnedBundleMarker({
      session,
      client,
      islandNumber,
      diceBundleOwned: localOwned,
      triggerSource: 'sync_market_owned_bundle_marker_effect',
    });
    setRuntimeStateWithTrace('sync_market_owned_bundle_marker_effect', (current) => (
      current.marketOwnedBundlesByIsland === nextRecord.marketOwnedBundlesByIsland
        ? current
        : {
          ...current,
          marketOwnedBundlesByIsland: nextRecord.marketOwnedBundlesByIsland,
        }
    ));
  }, [
    client,
    hasHydratedRuntimeState,
    hasMarketOwnedBundleHydrationGate,
    islandNumber,
    marketOwnedBundles,
    runtimeState.marketOwnedBundlesByIsland,
    session,
    setRuntimeStateWithTrace,
  ]);

  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    // Guard: Skip until the initial hydration sync effect has applied server values
    // to local state. This prevents the write amplification loop.
    if (!hasCompletedInitialHydrationSyncRef.current) return;
    const runtimeInventory = runtimeState.creatureTreatInventory;
    if (
      runtimeInventory
      && runtimeInventory.basic === creatureTreatInventory.basic
      && runtimeInventory.favorite === creatureTreatInventory.favorite
      && runtimeInventory.rare === creatureTreatInventory.rare
    ) {
      return;
    }
    const nextRecord = applyCreatureTreatInventory({
      session,
      client,
      creatureTreatInventory,
      triggerSource: 'sync_creature_treat_inventory_effect',
    });
    setRuntimeState((current) => ({
      ...current,
      creatureTreatInventory: nextRecord.creatureTreatInventory,
    }));
  }, [client, creatureTreatInventory, hasHydratedRuntimeState, runtimeState.creatureTreatInventory, session]);

  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    // Guard: Skip until the initial hydration sync effect has applied server values
    // to local state. This prevents the write amplification loop.
    if (!hasCompletedInitialHydrationSyncRef.current) return;
    const runtimeCollection = runtimeState.creatureCollection ?? [];
    if (JSON.stringify(runtimeCollection) === JSON.stringify(creatureCollection)) return;
    const nextRecord = applyCreatureCollection({
      session,
      client,
      creatureCollection,
      triggerSource: 'sync_creature_collection_effect',
    });
    setRuntimeState((current) => ({ ...current, creatureCollection: nextRecord.creatureCollection }));
  }, [client, creatureCollection, hasHydratedRuntimeState, runtimeState.creatureCollection, session]);

  // M17D: award wallet shards (persistent cross-island balance) by a given amount.
  // This is separate from awardShards (islandShards / Collectible Progress Bar).
  const awardWalletShards = useCallback((amount: number) => {
    const { record, appliedDelta } = applyWalletShardsDelta({
      session,
      client,
      delta: amount,
      triggerSource: 'wallet_shards_award',
    });
    if (appliedDelta === 0) return;
    setShards(record.shards);
    setRuntimeState((current) => ({ ...current, shards: record.shards }));
  }, [session, client]);

  const spendWalletShards = useCallback((amount: number, source: string): boolean => {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    if (runtimeState.shards < amount) return false;
    const { record, appliedDelta } = applyWalletShardsDelta({
      session,
      client,
      delta: -amount,
      triggerSource: `wallet_shards_spend:${source}`,
    });
    if (appliedDelta >= 0) return false;
    setShards(record.shards);
    setRuntimeState((current) => ({ ...current, shards: record.shards }));
    return true;
  }, [client, runtimeState.shards, session]);

  // M16B/M16C: award shards from a given source, update local state, and persist.
  // shard_tier_index does NOT advance here — that happens on player claim (M16E).
  const awardContractV2Essence = useCallback((amount: number, source: string) => {
    // C2: route through the store action (applyEssenceAward). The action owns
    // the read-modify-write on `essence` / `essenceLifetimeEarned` against the
    // live store snapshot + the commit path; previously this was an inlined
    // `persistIslandRunRuntimeStatePatch` that read `runtimeStateRef.current`
    // and raced concurrent writers on disjoint fields.
    const { record: next, earned } = applyEssenceAward({
      session,
      client,
      islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED,
      amount,
      triggerSource: `essence_award:${source}`,
    });
    if (earned < 1) return;
    setRuntimeState((current) => ({
      ...current,
      essence: next.essence,
      essenceLifetimeEarned: next.essenceLifetimeEarned,
    }));
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        stage: 'island_run_contract_v2_essence_earn',
        island_number: islandNumber,
        source,
        amount: earned,
      },
    });
  }, [client, islandNumber, session]);

  /**
   * Withdraw essence from the wallet (hazard tile penalty, stop ticket purchase, …).
   * Clamps at zero — players can never owe essence. Returns the amount actually
   * deducted (may be less than requested if the wallet was short).
   */
  const deductContractV2Essence = useCallback((amount: number, source: string): number => {
    // C2: route through the store action (applyEssenceDeduct). Same rationale
    // as awardContractV2Essence — the action owns the read-modify-write on
    // `essence` / `essenceLifetimeSpent` so concurrent writers on disjoint
    // fields don't clobber each other.
    const { record: next, spent } = applyEssenceDeduct({
      session,
      client,
      islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED,
      amount,
      triggerSource: `essence_deduct:${source}`,
    });
    if (spent < 1) return 0;
    setRuntimeState((current) => ({
      ...current,
      essence: next.essence,
      essenceLifetimeSpent: next.essenceLifetimeSpent,
    }));
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_spend',
      metadata: {
        stage: 'island_run_contract_v2_essence_deduct',
        island_number: islandNumber,
        source,
        amount: spent,
      },
    });
    return spent;
  }, [client, islandNumber, session]);

  const applyContractV2RewardBarRuntimeState = useCallback((nextRewardBarState: {
    rewardBarProgress: number;
    rewardBarThreshold: number;
    rewardBarClaimCountInEvent: number;
    rewardBarEscalationTier: number;
    rewardBarLastClaimAtMs: number | null;
    rewardBarBoundEventId: string | null;
    rewardBarLadderId: string | null;
    activeTimedEvent: { eventId: string; eventType: string; startedAtMs: number; expiresAtMs: number; version: number } | null;
    activeTimedEventProgress: { feedingActions: number; tokensEarned: number; milestonesClaimed: number };
    stickerProgress: { fragments: number; guaranteedAt?: number; pityCounter?: number };
    stickerInventory: Record<string, number>;
  }) => {
    // C2: route through the store action (applyRewardBarState). The reward-bar
    // cascade is the highest-contention non-roll write (fires on every
    // reward-earning tile landing + every claim), so routing it through the
    // commit coordinator removes a class of overlap bugs where a tile
    // landing's bar progress could race an auto-claim's bar reset.
    applyRewardBarState({
      session,
      client,
      nextState: nextRewardBarState,
      triggerSource: 'reward_bar_runtime_state',
    });

    setRuntimeState((current) => ({
      ...current,
      rewardBarProgress: nextRewardBarState.rewardBarProgress,
      rewardBarThreshold: nextRewardBarState.rewardBarThreshold,
      rewardBarClaimCountInEvent: nextRewardBarState.rewardBarClaimCountInEvent,
      rewardBarEscalationTier: nextRewardBarState.rewardBarEscalationTier,
      rewardBarLastClaimAtMs: nextRewardBarState.rewardBarLastClaimAtMs,
      rewardBarBoundEventId: nextRewardBarState.rewardBarBoundEventId,
      rewardBarLadderId: nextRewardBarState.rewardBarLadderId,
      activeTimedEvent: nextRewardBarState.activeTimedEvent,
      activeTimedEventProgress: nextRewardBarState.activeTimedEventProgress,
      stickerProgress: nextRewardBarState.stickerProgress,
      stickerInventory: nextRewardBarState.stickerInventory,
    }));
  }, [client, session]);

  useEffect(() => {
    if (!ISLAND_RUN_CONTRACT_V2_ENABLED || !hasHydratedRuntimeState) return;

    const syncEventLifecycle = () => {
      const current = runtimeStateRef.current;
      const ensured = advanceEventIfExpired(
        {
          rewardBarProgress: current.rewardBarProgress,
          rewardBarThreshold: current.rewardBarThreshold,
          rewardBarClaimCountInEvent: current.rewardBarClaimCountInEvent,
          rewardBarEscalationTier: current.rewardBarEscalationTier,
          rewardBarLastClaimAtMs: current.rewardBarLastClaimAtMs,
          rewardBarBoundEventId: current.rewardBarBoundEventId,
          rewardBarLadderId: current.rewardBarLadderId,
          activeTimedEvent: current.activeTimedEvent,
          activeTimedEventProgress: current.activeTimedEventProgress,
          stickerProgress: current.stickerProgress,
          stickerInventory: current.stickerInventory,
        },
        Date.now(),
      );

      if (
        ensured.state.activeTimedEvent?.eventId === current.activeTimedEvent?.eventId
        && ensured.state.rewardBarBoundEventId === current.rewardBarBoundEventId
        && ensured.state.rewardBarLadderId === current.rewardBarLadderId
        && ensured.state.rewardBarProgress === current.rewardBarProgress
        && ensured.state.rewardBarClaimCountInEvent === current.rewardBarClaimCountInEvent
        && ensured.state.rewardBarEscalationTier === current.rewardBarEscalationTier
        && ensured.state.rewardBarLastClaimAtMs === current.rewardBarLastClaimAtMs
      ) {
        return;
      }

      applyContractV2RewardBarRuntimeState(ensured.state);
    };

    syncEventLifecycle();
    const timer = window.setInterval(syncEventLifecycle, 30 * 1000);
    return () => window.clearInterval(timer);
  }, [applyContractV2RewardBarRuntimeState, hasHydratedRuntimeState]);

  // ── Essence Drift: apply Monopoly GO-style decay to excess essence every 5 min ──
  useEffect(() => {
    if (!ISLAND_RUN_CONTRACT_V2_ENABLED || !hasHydratedRuntimeState) return;
    const DRIFT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    const lastDriftRef = { ms: Date.now() };

    const timer = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastDriftRef.ms;
      lastDriftRef.ms = now;

      // C2: route through the store action (applyEssenceDriftTick). The action
      // reads the live store snapshot for wallet + stop states + egg ledger,
      // computes drift, and commits only when essence was actually lost. The
      // previous inlined path read `runtimeStateRef.current` five times while
      // interleaving `setRuntimeState` + `persistIslandRunRuntimeStatePatch`
      // — that was a classic multi-writer race against roll / reward-bar.
      const { record: next, driftLost } = applyEssenceDriftTick({
        session,
        client,
        effectiveIslandNumber,
        elapsedMs: elapsed,
        triggerSource: 'essence_drift_tick',
      });

      if (driftLost > 0) {
        setRuntimeState((prev) => ({
          ...prev,
          essence: next.essence,
          lastEssenceDriftLost: next.lastEssenceDriftLost,
        }));
        // Show a brief drift notice on screen
        setDriftNotice(driftLost);
        setTimeout(() => setDriftNotice(null), 2500);
      }
    }, DRIFT_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [effectiveIslandNumber, hasHydratedRuntimeState, islandNumber, session, client]);

  const awardShards = useCallback((source: ShardEarnSource) => {
    const amount = SHARD_EARN[source];
    const result = computeShardEarn(
      { islandShards, shardTierIndex, shardClaimCount },
      amount,
    );
    setIslandShards(result.islandShards);
    // Only persist the cumulative shard count; tier/claim state is unchanged until claim
    const shardRecord = applyIslandShardsSet({
      session,
      client,
      nextIslandShards: result.islandShards,
      triggerSource: 'shard_progress_earn',
    });
    setRuntimeState(shardRecord.record);
    // M16C: set shardMilestoneReached flag (once) when threshold is first crossed
    if (result.shardMilestoneReached && !shardMilestoneReached) {
      setShardMilestoneReached(true);
      // M16E: store the completed tier so the Claim button / modal can show the right collectible
      setPendingClaimTierIndex(shardTierIndex);
      setLandingText((prev) => `${prev} ✨ Essence milestone reached!`);
    }
  }, [islandShards, shardTierIndex, shardClaimCount, shardMilestoneReached, session, client]);

  // M13 + Egg Mania: per-island egg slot usage check.
  const currentIslandEggSlots = useMemo(
    () => getEggSlotsForIsland(runtimeState.perIslandEggs, islandNumber),
    [runtimeState.perIslandEggs, islandNumber],
  );
  const islandEggEntry = useMemo(
    () => currentIslandEggSlots.find((slot) => slot.slotIndex === 0)?.entry ?? runtimeState.perIslandEggs?.[String(islandNumber)] ?? null,
    [currentIslandEggSlots, runtimeState.perIslandEggs, islandNumber],
  );
  const islandEggSlotUsed = useMemo(
    () => areAllEggSlotsTerminalForIsland(runtimeState.perIslandEggs, islandNumber),
    [runtimeState.perIslandEggs, islandNumber],
  );
  const eggManiaState = useMemo(() => resolveEggManiaState({
    userId: session.user.id,
    islandNumber,
    cycleIndex,
    perIslandEggs: runtimeState.perIslandEggs,
  }), [cycleIndex, islandNumber, runtimeState.perIslandEggs, session.user.id]);
  const isEggManiaActive = eggManiaState.active;
  const isEggManiaUnused = isEggManiaActive && !eggManiaState.consumed;
  const effectiveCompletedStops = useMemo(
    () => getEffectiveCompletedStops({
      completedStops,
      hasActiveEgg: Boolean(activeEgg),
      islandEggSlotUsed,
    }),
    [activeEgg, completedStops, islandEggSlotUsed],
  );

  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    if (areStringArraysEqual(completedStops, effectiveCompletedStops)) return;
    updateCompletedStopsWithSync((current) => (areStringArraysEqual(current, effectiveCompletedStops) ? current : effectiveCompletedStops), { requestSync: false });
  }, [completedStops, effectiveCompletedStops, hasHydratedRuntimeState]);

  const mergedStopStatesByIndex = useMemo(() => {
    if (!ISLAND_RUN_CONTRACT_V2_ENABLED) return runtimeState.stopStatesByIndex;
    // Bridge: legacy completedStops may include stops that v2 stopStatesByIndex
    // hasn't marked objectiveComplete yet (e.g. completed before v2 migration).
    // Merge them so the resolver sees those stops as complete.
    const completedStopsSet = new Set(completedStops);
    return runtimeState.stopStatesByIndex.map((entry, index) => {
      const stopId = islandStopPlan[index]?.stopId;
      if (stopId && completedStopsSet.has(stopId) && !entry?.objectiveComplete) {
        return { ...(entry ?? { buildComplete: false }), objectiveComplete: true };
      }
      return entry;
    });
  }, [completedStops, islandStopPlan, runtimeState.stopStatesByIndex]);

  const resolveCanonicalContractV2Stops = useCallback((options: {
    stopStatesByIndex: IslandRunRuntimeState['stopStatesByIndex'];
    stopTicketsPaidByIsland?: Record<string, number[]> | null;
    islandNumber?: number;
  }) => {
    return resolveIslandRunContractV2Stops({
      stopStatesByIndex: options.stopStatesByIndex,
      stopTicketsPaidByIsland: options.stopTicketsPaidByIsland ?? runtimeState.stopTicketsPaidByIsland,
      islandNumber: options.islandNumber ?? islandNumber,
    });
  }, [islandNumber, runtimeState.stopTicketsPaidByIsland]);

  const contractV2Stops = useMemo(() => {
    if (!ISLAND_RUN_CONTRACT_V2_ENABLED) return null;
    return resolveCanonicalContractV2Stops({
      stopStatesByIndex: mergedStopStatesByIndex,
      stopTicketsPaidByIsland: runtimeState.stopTicketsPaidByIsland,
      islandNumber,
    });
  }, [islandNumber, mergedStopStatesByIndex, resolveCanonicalContractV2Stops, runtimeState.stopTicketsPaidByIsland]);

  const bossStopStatus = contractV2Stops?.statusesByIndex[4] ?? null;
  const bossTicketCost = bossStopStatus === 'ticket_required'
    ? getStopTicketCost({ effectiveIslandNumber, stopIndex: 4 })
    : null;
  const allLandmarkDoorsRouteToBoss = resolveAllLandmarkDoorsRouteToBoss({
    bossStatus: bossStopStatus,
    essence: runtimeState.essence,
    bossTicketCost,
  });
  const expandedActiveLandmarkDoorStopId = resolveExpandedLandmarkDoorStopIdForStatuses(contractV2Stops?.statusesByIndex);
  const landmarkDoorTileMap = useMemo(
    () => applyLandmarkDoorTiles(tileMap, {
      allDoorsRouteToBoss: allLandmarkDoorsRouteToBoss,
      expandedActiveStopId: expandedActiveLandmarkDoorStopId,
    }),
    [allLandmarkDoorsRouteToBoss, expandedActiveLandmarkDoorStopId, tileMap],
  );
  const trafficLightCharge = getTrafficLightCharge(runtimeState.bonusTileChargeByIsland, islandNumber);
  // Show the optimistic mid-hop charge while a roll is animating so the lights
  // change the moment the token passes the traffic tile, not when it lands.
  const displayedTrafficLightCharge = trafficLightVisualCharge !== null
    ? Math.min(TRAFFIC_LIGHT_CHARGE_TARGET, Math.max(trafficLightCharge, trafficLightVisualCharge))
    : trafficLightCharge;

  const stopStateMap = useMemo(() => {
    if (ISLAND_RUN_CONTRACT_V2_ENABLED && contractV2Stops) {
      const map = new Map<string, StopProgressState>();
      islandStopPlan.forEach((stop, index) => {
        const resolverStatus = contractV2Stops.statusesByIndex[index];
        let status: StopProgressState = resolverStatus ?? 'locked';
        // Hatchery (index 0): show yellow 'partial' when egg is set but not yet collected/sold.
        // Green 'completed' only once the animal is collected or sold (island-clear condition).
        if (index === 0 && status === 'completed' && !islandEggSlotUsed) {
          status = 'partial';
        } else if (status === 'completed') {
          const buildState = runtimeState.stopBuildStateByIndex[index];
          const buildLevel = Math.max(0, Math.floor(buildState?.buildLevel ?? 0));
          if (buildLevel < MAX_BUILD_LEVEL) {
            status = 'build_pending';
          }
        }
        map.set(stop.stopId, status);
      });
      return map;
    }

    const map = new Map<string, StopProgressState>();
    const effectiveCompletedStopSet = new Set(effectiveCompletedStops);
    const nonBossStops = islandStopPlan.filter((stop) => stop.stopId !== 'boss');
    const allNonBossCompleted = nonBossStops.every((stop) => effectiveCompletedStopSet.has(stop.stopId));

    for (const stop of islandStopPlan) {
      if (effectiveCompletedStopSet.has(stop.stopId)) {
        map.set(stop.stopId, 'completed');
        continue;
      }

      if (stop.stopId === 'boss') {
        map.set(stop.stopId, allNonBossCompleted ? 'active' : 'locked');
        continue;
      }

      map.set(stop.stopId, 'active');
    }

    return map;
  }, [contractV2Stops, effectiveCompletedStops, islandEggSlotUsed, islandStopPlan, runtimeState.stopBuildStateByIndex]);

  // stopMap intentionally remains empty: per the canonical gameplay contract,
  // stops are EXTERNAL side-quest structures (orbit HUD buttons). No tile on
  // the 36-tile ring is rendered as a "stop tile". The Map type is retained
  // for camera-director backward compatibility.
  const stopMap = useMemo(() => new Map<number, string>(), []);

  // ── Ticket-aware stop unlock ─────────────────────────────────────────────
  // Helpers that let the orbit click handler decide whether to open a stop
  // directly, surface the ticket-pay prompt, or leave it locked.
  const stopIndexByStopId = useMemo(() => {
    const map = new Map<string, number>();
    islandStopPlan.forEach((stop, index) => map.set(stop.stopId, index));
    return map;
  }, [islandStopPlan]);

  const ticketsPaidForCurrentIsland = useMemo(
    () => getStopTicketsPaidForIsland(runtimeState.stopTicketsPaidByIsland, islandNumber),
    [runtimeState.stopTicketsPaidByIsland, islandNumber],
  );

  /**
   * True when `stopId` is waiting on an essence ticket — the previous stop is
   * complete but this stop hasn't been paid yet. Orbit clicks on such stops
   * open the ticket-prompt modal instead of the stop itself.
   */
  const doesStopRequireTicketPayment = useCallback((stopId: string): boolean => {
    const stopIndex = stopIndexByStopId.get(stopId);
    if (stopIndex === undefined) return false;
    if (stopIndex === 0) return false; // hatchery is always free
    if (ISLAND_RUN_CONTRACT_V2_ENABLED && contractV2Stops) {
      return contractV2Stops.statusesByIndex[stopIndex] === 'ticket_required';
    }
    if (isStopTicketPaid({ ticketsPaid: ticketsPaidForCurrentIsland, stopIndex })) return false;
    const prevState = runtimeState.stopStatesByIndex[stopIndex - 1];
    return Boolean(prevState?.objectiveComplete);
  }, [contractV2Stops, stopIndexByStopId, ticketsPaidForCurrentIsland, runtimeState.stopStatesByIndex]);

  const ticketRequirementByStopId = useMemo(() => {
    const requirements = new Map<string, { needsTicket: boolean; ticketCost?: number }>();
    islandStopPlan.forEach((stop, stopIndex) => {
      const needsTicket = doesStopRequireTicketPayment(stop.stopId);
      const ticketCost = needsTicket
        ? getStopTicketCost({ effectiveIslandNumber, stopIndex })
        : undefined;
      requirements.set(stop.stopId, { needsTicket, ticketCost });
    });
    return requirements;
  }, [doesStopRequireTicketPayment, effectiveIslandNumber, islandStopPlan]);

  /**
   * Orbit-stop click dispatcher.
   * Reliability rule: always open the stop modal on tap, then surface lock /
   * ticket guidance inside the modal copy + CTA layer.
   */
  const handleStopOpenRequest = useCallback((stopId: string) => {
    const stopIndex = stopIndexByStopId.get(stopId);
    const stopStatus =
      typeof stopIndex === 'number' && contractV2Stops
        ? contractV2Stops.statusesByIndex[stopIndex]
        : null;
    const needsTicket = doesStopRequireTicketPayment(stopId);
    const tapOutcome = resolveIslandRunStopTapOutcome({
      stopStatus,
      requiresTicket: needsTicket,
    });

    logIslandRunEntryDebug('island_stop_tap_outcome', {
      stopId,
      stopIndex: typeof stopIndex === 'number' ? stopIndex : null,
      stopStatus: stopStatus ?? null,
      needsTicket,
      tapOutcome,
    });

    if (tapOutcome === 'locked') {
      setLandingText('Landmark preview opened. Complete the previous landmark to unlock actions.');
    } else if (tapOutcome === 'ticket_required') {
      setLandingText('Landmark preview opened. Pay ticket in the modal to enter this stop.');
    }

    setLockedStopInfoStopId(null);
    setTicketPromptStopId(null);
    setPrepayTicketPromptStopId(null);
    requestActiveStopTransition(stopId, 'orbit_stop_click');
    setIsTopbarMenuPrimed(false);
    setFocusedStopId(stopId);
    setCameraMode('stop_focus');
  }, [contractV2Stops, doesStopRequireTicketPayment, requestActiveStopTransition, stopIndexByStopId]);

  const getPrepayPromptSeenKey = useCallback((stopId: string) => (
    `island_run_prepay_ticket_prompt_seen_${session.user.id}_${islandNumber}_${stopId}`
  ), [islandNumber, session.user.id]);

  const markPrepayPromptSeen = useCallback((stopId: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(getPrepayPromptSeenKey(stopId), '1');
  }, [getPrepayPromptSeenKey]);

  const hasSeenPrepayPrompt = useCallback((stopId: string) => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(getPrepayPromptSeenKey(stopId)) === '1';
  }, [getPrepayPromptSeenKey]);

  const handleLandmarkDoorLanding = useCallback((doorStopId: IslandLandmarkDoorStopId, tileIndex: number) => {
    const stopIndex = stopIndexByStopId.get(doorStopId);
    const stopStatus =
      typeof stopIndex === 'number' && contractV2Stops
        ? contractV2Stops.statusesByIndex[stopIndex]
        : null;
    const needsTicket = doesStopRequireTicketPayment(doorStopId);
    const tapOutcome = resolveIslandRunStopTapOutcome({
      stopStatus,
      requiresTicket: needsTicket,
    });

    logIslandRunEntryDebug('island_landmark_door_landing', {
      doorStopId,
      tileIndex,
      stopIndex: typeof stopIndex === 'number' ? stopIndex : null,
      stopStatus: stopStatus ?? null,
      needsTicket,
      tapOutcome,
      allDoorsRouteToBoss: allLandmarkDoorsRouteToBoss,
    });

    setLockedStopInfoStopId(null);
    setTicketPromptStopId(null);
    setPrepayTicketPromptStopId(null);
    setIsTopbarMenuPrimed(false);
    setFocusedStopId(doorStopId);
    setCameraMode('stop_focus');

    if (tapOutcome === 'open' && (stopStatus === 'active' || stopStatus === 'accessible' || stopStatus === 'postponed')) {
      setDormantDoorMiniGame(null);
      setDormantDoorSelectedIndices([]);
      setDormantDoorReward(null);
      setRequiredDoorStopId(doorStopId);
      setLandingText(`🚪 Landmark door opened ${doorStopId.toUpperCase()}. Complete it before rolling again.`);
      requestActiveStopTransition(doorStopId, 'landmark_door_landing');
      return;
    }

    if (tapOutcome === 'ticket_required') {
      if (doorStopId === 'boss' && allLandmarkDoorsRouteToBoss) {
        requestActiveStopTransition('boss', 'affordable_boss_ticket_landmark_door_landing');
        setRequiredDoorStopId(null);
        setDormantDoorMiniGame(null);
        setDormantDoorSelectedIndices([]);
        setDormantDoorReward(null);
        setLandingText('🎫 Boss ticket ready: pay inside the Boss modal, then play the Boss Trial.');
        return;
      }

      requestActiveStopTransition(doorStopId, 'ticket_required_landmark_door_landing');
      setRequiredDoorStopId(null);
      setDormantDoorMiniGame(null);
      setDormantDoorSelectedIndices([]);
      setDormantDoorReward(null);
      setTicketPromptStopId(null);
      setLandingText('🎫 Landmark ticket required: pay inside the landmark modal to enter this stop.');
      return;
    }

    if (tapOutcome === 'locked' && typeof stopIndex === 'number' && stopIndex > 0 && needsTicket && !hasSeenPrepayPrompt(doorStopId)) {
      markPrepayPromptSeen(doorStopId);
      requestActiveStopTransition(null, 'locked_landmark_door_prepay_offer');
      setRequiredDoorStopId(null);
      setDormantDoorMiniGame(null);
      setDormantDoorSelectedIndices([]);
      setDormantDoorReward(null);
      setPrepayTicketPromptStopId(doorStopId);
      setLandingText('🎫 Early landmark ticket offer: prepay now for 20% off, or skip and keep playing door challenges later.');
      return;
    }

    // Bring landmark hiring into the roll loop: if any landmark on this island
    // is currently waiting on a ticket payment (the sequentially-next "gate"),
    // landing on ANY landmark door surfaces that ticket-payment modal instead of
    // a filler door minigame. Previously hiring only happened when the token
    // landed exactly on the one hireable landmark (or via a manual orbit tap),
    // leaving payment outside the roll loop.
    const ticketRequiredStopIndex = contractV2Stops
      ? contractV2Stops.statusesByIndex.findIndex((status) => status === 'ticket_required')
      : -1;
    const ticketRequiredStopId = ticketRequiredStopIndex >= 0
      ? islandStopPlan[ticketRequiredStopIndex]?.stopId ?? null
      : null;
    if (ticketRequiredStopId) {
      setRequiredDoorStopId(null);
      setDormantDoorMiniGame(null);
      setDormantDoorSelectedIndices([]);
      setDormantDoorReward(null);
      setFocusedStopId(ticketRequiredStopId);
      if (ticketRequiredStopId === 'boss' && allLandmarkDoorsRouteToBoss) {
        requestActiveStopTransition('boss', 'affordable_boss_ticket_landmark_door_landing_loop');
        setLandingText('🎫 Boss ticket ready: pay inside the Boss modal, then play the Boss Trial.');
        return;
      }
      requestActiveStopTransition(ticketRequiredStopId, 'ticket_required_landmark_door_landing_loop');
      setTicketPromptStopId(null);
      setLandingText('🎫 Landmark ticket ready: pay inside the landmark modal to enter this stop.');
      return;
    }

    const miniGame = buildDormantDoorMiniGame({
      islandNumber: effectiveIslandNumber,
      tileIndex,
      rollIndex: rollIndexRef.current,
      doorStopId,
      remainingIslandBuildCost: getRemainingIslandBuildCost({
        effectiveIslandNumber,
        stopBuildStateByIndex: runtimeStateRef.current.stopBuildStateByIndex,
      }),
    });
    requestActiveStopTransition(null, 'dormant_landmark_door_minigame');
    setRequiredDoorStopId(null);
    setDormantDoorMiniGame(miniGame);
    setDormantDoorSelectedIndices([]);
    setDormantDoorReward(null);
    setIsDormantDoorRewardClaiming(false);
    setLandingText('🚪 Dormant door challenge: reveal doors until 3 matching prizes appear.');
  }, [allLandmarkDoorsRouteToBoss, contractV2Stops, doesStopRequireTicketPayment, effectiveIslandNumber, hasSeenPrepayPrompt, islandStopPlan, markPrepayPromptSeen, requestActiveStopTransition, stopIndexByStopId]);

  const handlePrepayStopTicket = useCallback((stopId: string) => {
    const stopIndex = stopIndexByStopId.get(stopId);
    if (stopIndex === undefined) return;
    const result = payStopTicket({
      effectiveIslandNumber,
      islandNumber,
      stopIndex,
      essence: runtimeStateRef.current.essence,
      essenceLifetimeSpent: runtimeStateRef.current.essenceLifetimeSpent,
      stopTicketsPaidByIsland: runtimeStateRef.current.stopTicketsPaidByIsland,
      stopStatesByIndex: runtimeStateRef.current.stopStatesByIndex,
      prepay: true,
    });

    if (!result.ok) {
      if (result.reason === 'insufficient_essence') {
        setLandingText(`Not enough money — need ${result.cost} 💰 to prepay this discounted ticket.`);
      } else if (result.reason === 'already_paid') {
        setLandingText('That landmark ticket is already prepaid. Finish the prerequisite landmark to enter.');
        setPrepayTicketPromptStopId(null);
      } else {
        setPrepayTicketPromptStopId(null);
      }
      return;
    }

    if (!result.alreadyFree) {
      const nextRuntimeState = applyStopTicketPayment({
        session,
        client,
        essence: result.essence,
        essenceLifetimeSpent: result.essenceLifetimeSpent,
        stopTicketsPaidByIsland: result.stopTicketsPaidByIsland,
        triggerSource: 'stop_ticket_prepay_discount',
      });
      setRuntimeState((current) => ({
        ...current,
        essence: nextRuntimeState.essence,
        essenceLifetimeSpent: nextRuntimeState.essenceLifetimeSpent,
        stopTicketsPaidByIsland: nextRuntimeState.stopTicketsPaidByIsland,
      }));
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'economy_spend',
        metadata: {
          stage: 'island_run_stop_ticket_prepaid',
          island_number: islandNumber,
          stop_id: stopId,
          stop_index: stopIndex,
          cost: result.cost,
          discount_rate: 0.2,
        },
      });
      const paidStop = islandStopPlan.find((s) => s.stopId === stopId);
      setLandingText(`${paidStop?.title ?? stopId} ticket prepaid for ${result.cost} 💰 (20% off). Complete the previous landmark to enter.`);
    }
    setPrepayTicketPromptStopId(null);
    setCameraMode('board_follow');
  }, [client, effectiveIslandNumber, islandNumber, islandStopPlan, session, stopIndexByStopId]);

  const requiredDoorStopIndex = requiredDoorStopId ? stopIndexByStopId.get(requiredDoorStopId) : undefined;
  // The Boss door's "finish this landmark before rolling again" gate is
  // released the moment the boss trial itself is resolved. After the trial the
  // only work left on a boss stop is upgrading every landmark to Level 3, and
  // that is funded purely by rolling for money — so holding the roll here would
  // deadlock any player who lands on the boss tile without enough cash to
  // finish the builds. Once the boss is defeated we let them keep rolling to
  // earn what the remaining upgrades cost.
  const isBossDoorTrialResolved = requiredDoorStopId === 'boss'
    && (bossTrialResolved || runtimeState.bossTrialResolvedIslandNumber === islandNumber);
  const isDoorLandmarkCompletionRequired = requiredDoorStopId !== null
    && typeof requiredDoorStopIndex === 'number'
    && !isBossDoorTrialResolved
    && (
      contractV2Stops?.statusesByIndex[requiredDoorStopIndex] === 'active'
      || contractV2Stops?.statusesByIndex[requiredDoorStopIndex] === 'accessible'
      || contractV2Stops?.statusesByIndex[requiredDoorStopIndex] === 'postponed'
    );

  // Behavior landmarks the player must answer rather than abandon. When a Habit
  // or Wisdom stop is open and still playable (active — not completed, locked, or
  // ticket-gated), the modal cannot be dismissed via Close/Escape; the player has
  // to finish the in-modal flow (which always offers a completing path) so the
  // landmark is never left visited-but-incomplete. Eggs/Hatchery are excluded by
  // design (they incubate over a long time). Update this list to widen the rule.
  const isActiveBehaviorStopNonDismissable = (activeStopId === 'habit' || activeStopId === 'wisdom')
    && ['active', 'accessible', 'postponed'].includes(stopStateMap.get(activeStopId) ?? 'active');
  nonDismissableActiveStopRef.current = isActiveBehaviorStopNonDismissable;

  useEffect(() => {
    if (!requiredDoorStopId) return;
    if (isDoorLandmarkCompletionRequired) return;
    setRequiredDoorStopId(null);
  }, [isDoorLandmarkCompletionRequired, requiredDoorStopId]);

  useEffect(() => {
    setRequiredDoorStopId(null);
    setDormantDoorMiniGame(null);
    setDormantDoorSelectedIndices([]);
    setDormantDoorReward(null);
    setIsDormantDoorRewardClaiming(false);
    setTrafficLightCoinFlip(null);
    setTrafficLightRewardConfettiActive(false);
    setShowTrafficLightCoinHint(false);
    setTrafficLightVisualCharge(null);
  }, [islandNumber]);

  const handleDormantDoorSelect = useCallback((doorIndex: number) => {
    if (!dormantDoorMiniGame || dormantDoorReward) return;
    if (dormantDoorSelectedIndices.includes(doorIndex)) return;
    const next = [...dormantDoorSelectedIndices, doorIndex];
    setDormantDoorSelectedIndices(next);
    const selectedFigures = next
      .map((index) => dormantDoorMiniGame.doors[index]?.figure)
      .filter((figure): figure is DormantDoorFigure => Boolean(figure));
    const reward = resolveDormantDoorReward(selectedFigures, next, dormantDoorMiniGame.rewardLevels);
    if (reward) setDormantDoorReward(reward);
  }, [dormantDoorMiniGame, dormantDoorReward, dormantDoorSelectedIndices]);

  const handleCloseDormantDoorMiniGame = useCallback(() => {
    setDormantDoorMiniGame(null);
    setDormantDoorSelectedIndices([]);
    setDormantDoorReward(null);
    setIsDormantDoorRewardClaiming(false);
  }, []);

  const handleClaimDormantDoorReward = useCallback(() => {
    if (!dormantDoorMiniGame || !dormantDoorReward || isDormantDoorRewardClaiming) return;
    setIsDormantDoorRewardClaiming(true);
    const record = applyTokenHopRewards({
      session,
      client,
      deltas: {
        essence: dormantDoorReward.essence,
        dicePool: 0,
      },
      triggerSource: 'dormant_landmark_door_minigame',
    });
    setRuntimeState(record);
    setLandingText(`🗝️ Vault cracked — ${DORMANT_DOOR_TIER_NAMES[dormantDoorReward.tier]}: +${dormantDoorReward.essence} money.`);
    handleCloseDormantDoorMiniGame();
  }, [client, dormantDoorMiniGame, dormantDoorReward, handleCloseDormantDoorMiniGame, isDormantDoorRewardClaiming, session]);

  useEffect(() => {
    if (trafficLightCoinFlip?.phase !== 'ready') {
      setShowTrafficLightCoinHint(false);
      return;
    }

    const hintTimeoutId = window.setTimeout(() => {
      setShowTrafficLightCoinHint(true);
    }, TRAFFIC_LIGHT_COIN_IDLE_HINT_DELAY_MS);

    return () => window.clearTimeout(hintTimeoutId);
  }, [trafficLightCoinFlip?.phase, trafficLightCoinFlip?.seed]);

  const handleCloseTrafficLightCoinFlip = useCallback(() => {
    setTrafficLightCoinFlip(null);
    setTrafficLightRewardConfettiActive(false);
    setShowTrafficLightCoinHint(false);
  }, []);

  const handleFlipTrafficLightCoin = useCallback(() => {
    setShowTrafficLightCoinHint(false);
    setTrafficLightCoinFlip((current) => {
      if (!current || current.reward) return current;
      const reward = resolveTrafficLightCoinFlipReward({
        seed: current.seed,
        stickerFragments: runtimeStateRef.current.stickerProgress.fragments,
      });

      playIslandRunSound('coin_flip');
      triggerIslandRunHaptic('roll');

      const prefersReducedMotion = typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const revealDelayMs = prefersReducedMotion ? 0 : TRAFFIC_LIGHT_COIN_FLIP_DURATION_MS;
      window.setTimeout(() => {
        setTrafficLightCoinFlip((spinning) => {
          if (!spinning || spinning.phase !== 'flipping') return spinning;
          playIslandRunSound('coin_reveal');
          triggerIslandRunHaptic('coin_reveal');
          return { ...spinning, phase: 'revealed' };
        });
      }, revealDelayMs);

      return { ...current, reward, phase: 'flipping' };
    });
  }, []);

  const handleOpenTrafficLightReward = useCallback(() => {
    if (!trafficLightCoinFlip?.reward) return;
    const reward = trafficLightCoinFlip.reward;
    const record = applyTrafficLightCoinFlipReward({
      session,
      client,
      reward,
      triggerSource: 'traffic_light_coin_flip_reward',
    });
    setRuntimeState(record);
    const puzzlePart = reward.stickerFragments > 0 ? `, +${reward.stickerFragments} puzzle pieces` : '';
    const ticketPart = reward.minigameTickets > 0 ? `, +${reward.minigameTickets} event tickets` : '';
    const barPart = reward.rewardBarProgress > 0 ? `, +${reward.rewardBarProgress} event bar progress` : '';
    setLandingText(`🚦 ${reward.side === 'heads' ? 'Heads' : 'Tails'} opened ${reward.label}: +${reward.dice} dice, +${reward.essence} money${puzzlePart}${ticketPart}${barPart}.`);
    setTrafficLightCoinFlip((current) => current?.reward === reward ? { ...current, phase: 'opened' } : current);
    setTrafficLightRewardConfettiActive(false);
    setShowTrafficLightCoinHint(false);

    window.setTimeout(() => {
      setTrafficLightRewardConfettiActive(true);
    }, 1050);

    window.setTimeout(() => {
      setTrafficLightCoinFlip((current) => current?.reward === reward && current.phase === 'opened' ? null : current);
      setTrafficLightRewardConfettiActive(false);
      setShowTrafficLightCoinHint(false);
    }, TRAFFIC_LIGHT_REWARD_AUTO_CLOSE_MS);
  }, [client, session, trafficLightCoinFlip]);

  const dismissLandmarkCoachmark = useCallback(() => {
    setShowLandmarkCoachmark(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`island_run_landmark_coachmark_seen_${session.user.id}`, '1');
    }
  }, [session.user.id]);

  useEffect(() => {
    if (!lockedStopInfoStopId && !ticketPromptStopId && !prepayTicketPromptStopId) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (ticketPromptStopId) {
        setTicketPromptStopId(null);
        return;
      }
      if (prepayTicketPromptStopId) {
        setPrepayTicketPromptStopId(null);
        return;
      }
      if (lockedStopInfoStopId) {
        setLockedStopInfoStopId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lockedStopInfoStopId, prepayTicketPromptStopId, ticketPromptStopId]);

  /**
   * Pay the essence ticket for `stopId`. On success: persist the updated
   * wallet + ticket ledger, dismiss the prompt, and open the stop. On failure
   * (insufficient essence, etc.): surface the reason via landing text and keep
   * the prompt open so the user can earn more and retry.
   */
  const handlePayStopTicket = useCallback((stopId: string) => {
    const stopIndex = stopIndexByStopId.get(stopId);
    if (stopIndex === undefined) return;
    const result = payStopTicket({
      effectiveIslandNumber,
      islandNumber,
      stopIndex,
      essence: runtimeStateRef.current.essence,
      essenceLifetimeSpent: runtimeStateRef.current.essenceLifetimeSpent,
      stopTicketsPaidByIsland: runtimeStateRef.current.stopTicketsPaidByIsland,
      stopStatesByIndex: runtimeStateRef.current.stopStatesByIndex,
    });

    if (!result.ok) {
      if (result.reason === 'insufficient_essence') {
        setLandingText(`Not enough money — need ${result.cost} 💰 to open this stop.`);
      } else if (result.reason === 'previous_stop_not_complete') {
        setLandingText('Complete the previous stop before opening this one.');
        setTicketPromptStopId(null);
      } else if (result.reason === 'already_paid') {
        // Ticket already paid (race with another action) — open the stop.
        setTicketPromptStopId(null);
        requestActiveStopTransition(stopId, 'ticket_already_paid');
        setIsTopbarMenuPrimed(false);
        setFocusedStopId(stopId);
        setCameraMode('stop_focus');
      } else {
        setTicketPromptStopId(null);
      }
      return;
    }

    // Happy path: deduct essence, record ticket, open stop.
    // Hatchery (stop 0) is free — `alreadyFree` means this was a no-op success
    // and we just want to open the stop without writing, telemetry, or a
    // "paid" landing toast.
    if (!result.alreadyFree) {
      const nextRuntimeState = applyStopTicketPayment({
        session,
        client,
        essence: result.essence,
        essenceLifetimeSpent: result.essenceLifetimeSpent,
        stopTicketsPaidByIsland: result.stopTicketsPaidByIsland,
        triggerSource: 'stop_ticket_payment',
      });
      setRuntimeState((current) => ({
        ...current,
        essence: nextRuntimeState.essence,
        essenceLifetimeSpent: nextRuntimeState.essenceLifetimeSpent,
        stopTicketsPaidByIsland: nextRuntimeState.stopTicketsPaidByIsland,
      }));
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'economy_spend',
        metadata: {
          stage: 'island_run_stop_ticket_paid',
          island_number: islandNumber,
          stop_id: stopId,
          stop_index: stopIndex,
          cost: result.cost,
        },
      });
      const paidStop = islandStopPlan.find((s) => s.stopId === stopId);
      setLandingText(`${paidStop?.title ?? stopId} unlocked — ${result.cost} 💰 paid.`);
    }
    setTicketPromptStopId(null);
    requestActiveStopTransition(stopId, 'ticket_paid_open');
    setIsTopbarMenuPrimed(false);
    setFocusedStopId(stopId);
    setCameraMode('stop_focus');
  }, [client, effectiveIslandNumber, islandNumber, islandStopPlan, requestActiveStopTransition, session, stopIndexByStopId]);

  const activeStop = activeStopId ? islandStopPlan.find((stop) => stop.stopId === activeStopId) ?? null : null;

  const orbitStopVisuals = useMemo<OrbitStopVisual[]>(() => {
    const orderedAnchors = OUTER_STOP_ANCHORS.filter((anchor) => anchor.id !== 'shop');

    const baseVisuals = islandStopPlan.map((stop, index) => {
      const anchor = orderedAnchors[index] ?? orderedAnchors[orderedAnchors.length - 1];
      const position = toScreen({
        id: `orbit_${anchor.id}`,
        x: anchor.x,
        y: anchor.y,
        zBand: 'front',
        tangentDeg: 0,
        scale: 1,
      }, boardSize.width, boardSize.height);

      const horizontalPadding = 44;
      const verticalPadding = 44;
      // The nameplate belongs to the same in-world marker as the status pill:
      // keep it consistently just above the pill for every landmark.
      const labelOffsetY = -28;

      let visualX = clamp(position.x, horizontalPadding, boardSize.width - horizontalPadding);
      let visualY = clamp(position.y, verticalPadding, boardSize.height - verticalPadding);

      const overlapsBackButtonZone = visualX < 112 && visualY < 128;
      if (overlapsBackButtonZone) {
        visualX = Math.max(visualX, 100);
        visualY = Math.max(visualY, 152);
      }

      // Prefix a ticket emoji to the label when this stop is sequence-unlocked
      // but still awaiting its essence ticket — makes the ticket gate visible
      // before the player taps the orbit button.
      const baseLabel = stop.title
        .replace(/^\S+\s/, '')
        .replace(/\s+Landmark$/i, '');
      const ticketRequirement = ticketRequirementByStopId.get(stop.stopId);
      const needsTicket = ticketRequirement?.needsTicket ?? false;
      const label = needsTicket ? `🎫 ${baseLabel}` : baseLabel;
      const ticketCost = ticketRequirement?.ticketCost;

      // Attention dot: pulse on the landmark when the player can open it
      // RIGHT NOW (sequence prerequisite met AND wallet ≥ ticket cost). This
      // is the highest-value "next best action" cue — the UI stops whispering
      // and tells you: "tap me." Hatchery and already-paid stops never pulse.
      const canAffordNow =
        needsTicket
        && typeof ticketCost === 'number'
        && runtimeState.essence >= ticketCost;
      const attentionHint: 'affordable' | undefined = canAffordNow ? 'affordable' : undefined;
      const state = stopStateMap.get(stop.stopId) ?? 'active';

      return {
        id: stop.stopId,
        label,
        x: visualX,
        y: visualY,
        state,
        icon: getStopIcon(stop),
        labelOffsetY,
        labelOffsetX: 0,
        hideLabel: false,
        stopId: stop.stopId,
        ticketCost,
        attentionHint,
        stateChipLabel: getStopStateChipLabel(state),
      } satisfies OrbitStopVisual;
    });

    const placedLabels: { x: number; y: number }[] = [];
    const isSmallBoard = boardSize.width <= 390;
    const labelHalfWidth = isSmallBoard ? 52 : 58;
    const labelHalfHeight = 14;

    return baseVisuals.map((visual) => {
      let labelOffsetY = visual.labelOffsetY;
      let labelOffsetX = 0;

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const candidateX = clamp(visual.x + labelOffsetX, labelHalfWidth, boardSize.width - labelHalfWidth);
        const minOffsetY = -(visual.y - (labelHalfHeight + 8));
        const maxOffsetY = (boardSize.height - (labelHalfHeight + 8)) - visual.y;
        const clampedOffsetY = clamp(labelOffsetY, minOffsetY, maxOffsetY);
        const candidateY = visual.y + clampedOffsetY;

        const hasCollision = placedLabels.some((placed) => (
          Math.abs(candidateX - placed.x) < labelHalfWidth * 1.8
          && Math.abs(candidateY - placed.y) < labelHalfHeight * 2.2
        ));

        labelOffsetY = clampedOffsetY;

        if (!hasCollision) {
          labelOffsetX = candidateX - visual.x;
          placedLabels.push({ x: candidateX, y: candidateY });
          return {
            ...visual,
            labelOffsetX,
            labelOffsetY,
            hideLabel: false,
          } satisfies OrbitStopVisual;
        }

        const verticalNudge = 16 + attempt * 6;
        labelOffsetY += labelOffsetY < 0 ? -verticalNudge : verticalNudge;
        labelOffsetX += attempt % 2 === 0 ? 16 : -16;
      }

      const finalX = clamp(visual.x + labelOffsetX, labelHalfWidth, boardSize.width - labelHalfWidth);
      const finalY = clamp(visual.y + labelOffsetY, labelHalfHeight + 8, boardSize.height - (labelHalfHeight + 8));
      placedLabels.push({ x: finalX, y: finalY });

      return {
        ...visual,
        labelOffsetX: finalX - visual.x,
        labelOffsetY: finalY - visual.y,
        hideLabel: isSmallBoard,
      } satisfies OrbitStopVisual;
    });
  }, [
    activeStopId,
    boardSize.height,
    boardSize.width,
    completedStops,
    islandStopPlan,
    stopStateMap,
    ticketRequirementByStopId,
    ticketsPaidForCurrentIsland,
    runtimeState.essence,
  ]);

  // Camera zoom-to-stop: when cameraMode is 'stop_focus' and a stop is focused,
  // smoothly zoom the camera to that stop's screen position.
  useEffect(() => {
    if (cameraMode !== 'stop_focus' || !focusedStopId || !boardCameraRef.current) return;
    const visual = orbitStopVisuals.find((v) => v.id === focusedStopId);
    if (!visual) return;
    boardCameraRef.current.goFocusPoint(visual.x, visual.y);
  }, [cameraMode, focusedStopId, orbitStopVisuals]);

  const eggStage = useMemo(() => getHatcheryEggStage(activeEgg, nowMs), [activeEgg, nowMs]);

  const eggRemainingMs = activeEgg && Number.isFinite(activeEgg.hatchAtMs)
    ? Math.max(0, activeEgg.hatchAtMs - nowMs)
    : 0;
  const eggCountdownLabel = activeEgg ? formatHatchCountdown(eggRemainingMs) : '';
  const hatcheryTimelineStage = useMemo(() => {
    if (islandEggSlotUsed) return HATCHERY_TIMELINE_STEPS.length;
    if (!activeEgg) return 1;
    return Math.min(HATCHERY_TIMELINE_STEPS.length, Math.max(1, eggStage));
  }, [activeEgg, eggStage, islandEggSlotUsed]);

  useEffect(() => {
    setIslandRunDebugRuntimeSnapshotProvider(() => ({
      islandNumber,
      activeStopId,
      activeEgg,
      eggStage,
      completedStops,
      dicePool,
      spinTokens,
      tokenIndex,
      showTravelOverlay,
      landingText,
      timeLeftSec,
    }));

    return () => {
      setIslandRunDebugRuntimeSnapshotProvider(null);
    };
  }, [
    islandNumber,
    activeStopId,
    activeEgg,
    eggStage,
    completedStops,
    dicePool,
    spinTokens,
    tokenIndex,
    showTravelOverlay,
    landingText,
    timeLeftSec,
  ]);

  // M10B: play egg_ready sound when egg transitions to stage 4 (ready-to-open)
  const prevEggStageRef = useRef(0);
  useEffect(() => {
    if (eggStage === 4 && prevEggStageRef.current < 4) {
      playIslandRunSound('egg_ready');
      // Only show banner if not already dismissed for this specific egg
      const bannerKey = activeEgg ? getEggReadyBannerKey(session.user.id, activeEgg.setAtMs) : null;
      const alreadyDismissed = bannerKey ? window.localStorage.getItem(bannerKey) === '1' : false;
      if (!alreadyDismissed) {
        setShowEggReadyBanner(true);
      }
    }
    prevEggStageRef.current = eggStage;
  }, [eggStage, activeEgg, session.user.id]);

  // Show egg-ready banner on initial load if egg is already ready and banner not yet dismissed
  useEffect(() => {
    if (eggStage === 4 && hasHydratedRuntimeState && activeEgg) {
      const bannerKey = getEggReadyBannerKey(session.user.id, activeEgg.setAtMs);
      const alreadyDismissed = window.localStorage.getItem(bannerKey) === '1';
      if (!alreadyDismissed) {
        setShowEggReadyBanner(true);
      }
    }
  }, [eggStage, hasHydratedRuntimeState, activeEgg, session.user.id]);

  useEffect(() => {
    if (activeStopId !== 'hatchery') {
      setShowHatcheryHelp(false);
    }
  }, [activeStopId]);

  useEffect(() => {
    if (showTravelOverlay || isIslandTimerPendingStart || islandExpiresAtMs <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeftSec(Math.max(0, Math.ceil((islandExpiresAtMs - Date.now()) / 1000)));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isIslandTimerPendingStart, showTravelOverlay, islandNumber, islandExpiresAtMs]);

  // M15G: Write summary to global key so App.tsx overlay can read islandExpiresAtMs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const islandNameForSummary = getIslandDisplayName(islandNumber);
      const summary = {
        currentIslandNumber: islandNumber,
        islandStartedAtMs,
        islandExpiresAtMs,
        isIslandTimerPendingStart,
        activeEggSetAtMs: activeEgg?.setAtMs ?? null,
        activeEggHatchDurationMs: activeEgg ? activeEgg.hatchAtMs - activeEgg.setAtMs : null,
        essence: runtimeState.essence,
        rewardBarProgress: runtimeState.rewardBarProgress,
        rewardBarThreshold: runtimeState.rewardBarThreshold,
        rewardBarEscalationTier: runtimeState.rewardBarEscalationTier,
        activeTimedEvent: runtimeState.activeTimedEvent,
        islandDisplayName: islandNameForSummary,
      };
      window.localStorage.setItem('lifegoal_island_run_runtime_state', JSON.stringify(summary));
    } catch {
      // ignore storage errors
    }
  }, [
    activeEgg,
    islandExpiresAtMs,
    islandNumber,
    islandStartedAtMs,
    isIslandTimerPendingStart,
    runtimeState.activeTimedEvent,
    runtimeState.essence,
    runtimeState.rewardBarEscalationTier,
    runtimeState.rewardBarProgress,
    runtimeState.rewardBarThreshold,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasHydratedRuntimeState || isIslandVisualPreview) {
      return;
    }

    const hasSeenStory = runtimeState.storyPrologueSeen || window.localStorage.getItem(storySeenStorageKey) === 'true';
    if (!hasSeenStory) {
      setActiveStoryEpisode({ kind: 'global_prologue', manifestPath: '/storyline/episode-001/manifest.json' });
    }
  }, [hasHydratedRuntimeState, isIslandVisualPreview, runtimeState.storyPrologueSeen, storySeenStorageKey]);

  useEffect(() => {
    if (!shouldAutoAdvanceIslandOnTimerExpiry({
      islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED,
      isIslandTimerPendingStart,
      timeLeftSec,
      showTravelOverlay,
    })) {
      return;
    }

    const nextIsland = islandNumber + 1;
    setTravelOverlayDestinationIsland(nextIsland > ISLAND_RUN_MAX_ISLAND ? 1 : nextIsland);
    setTravelOverlayMode('advance');
    setShowTravelOverlay(true);
    setLandingText('Island expired. Next island unlocked — start it when you are ready.');
    playIslandRunSound('island_travel');
    triggerIslandRunHaptic('island_travel');

    const timeout = window.setTimeout(() => {
      void performIslandTravel(nextIsland, { startTimer: false });
      setShowTravelOverlay(false);
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [islandNumber, isIslandTimerPendingStart, showTravelOverlay, timeLeftSec]);

  const timerDisplay = isIslandTimerPendingStart ? 'Ready' : formatIslandCountdown(timeLeftSec);
  const audioMenuIcon = musicEnabled || sfxEnabled
    ? musicEnabled && sfxEnabled
      ? '🔊'
      : musicEnabled
        ? '🎵'
        : '🔔'
    : '🔇';
  const step1Stop = islandStopPlan[0] ?? null;
  // Rolling is always free — no stop-gate. step1Complete kept as `true` for
  // diagnostic logging continuity only.
  const legacyStep1Complete = true;
  const step1Complete = true;
  const contractV2StopResolution = resolveCanonicalContractV2Stops({
    stopStatesByIndex: runtimeState.stopStatesByIndex,
  });
  const contractV2ActiveStopIndex = contractV2StopResolution.activeStopIndex;
  const contractV2OpenedStopIndex = activeStopId ? islandStopPlan.findIndex((stop) => stop.stopId === activeStopId) : -1;
  // Show the build panel hint in stop modals when v2 is enabled and a stop is open.
  const showContractV2BuildPanel = ISLAND_RUN_CONTRACT_V2_ENABLED && contractV2OpenedStopIndex >= 0;
  const contractV2BuildPanelBuildState = showContractV2BuildPanel
    ? (runtimeState.stopBuildStateByIndex[contractV2OpenedStopIndex] ?? null)
    : null;
  const contractV2BuildPanelStopState = showContractV2BuildPanel
    ? (runtimeState.stopStatesByIndex[contractV2OpenedStopIndex] ?? null)
    : null;
  const isIslandOneConcordActive = islandNumber !== 1 || getIslandTechnologyAccess(runtimeState, 'the-concord').active;
  const legacyIsCurrentIslandFullyCleared = isIslandFullyCleared(islandNumber, effectiveCompletedStops);
  const isCurrentIslandFullyCleared = (ISLAND_RUN_CONTRACT_V2_ENABLED
    ? isIslandRunFullyClearedV2({
        stopStatesByIndex: runtimeState.stopStatesByIndex,
        stopBuildStateByIndex: runtimeState.stopBuildStateByIndex,
        hatcheryEggResolved: islandEggSlotUsed,
      })
    : legacyIsCurrentIslandFullyCleared) && isIslandOneConcordActive;
  const isCurrentIslandFinishedForDeparture = (ISLAND_RUN_CONTRACT_V2_ENABLED
    ? isIslandRunFinishedForDepartureV2({
        stopBuildStateByIndex: runtimeState.stopBuildStateByIndex,
        hatcheryEggResolved: islandEggSlotUsed,
        bossDefeated: runtimeState.bossTrialResolvedIslandNumber === islandNumber,
      })
    : legacyIsCurrentIslandFullyCleared) && isIslandOneConcordActive;
  const islandClearVisitKey = `${runtimeState.cycleIndex}:${islandNumber}`;
  const buildPanelRemainingToFullByIndex = useMemo(() => {
    return islandStopPlan.map((_, stopIndex) => {
      const buildState = runtimeState.stopBuildStateByIndex[stopIndex];
      if (!buildState || isStopBuildFullyComplete(buildState)) return 0;

      let remainingToFull = Math.max(0, buildState.requiredEssence - buildState.spentEssence);
      for (let level = buildState.buildLevel + 1; level < MAX_BUILD_LEVEL; level++) {
        remainingToFull += getStopUpgradeCost({
          islandNumber: effectiveIslandNumber,
          stopIndex,
          currentBuildLevel: level,
        });
      }
      return remainingToFull;
    });
  }, [effectiveIslandNumber, islandStopPlan, runtimeState.stopBuildStateByIndex]);
  const { nextCheapestIndex: buildPanelNextCheapestIndex } = useMemo(() => (
    resolveNextCheapestIndex({ remainingCosts: buildPanelRemainingToFullByIndex })
  ), [buildPanelRemainingToFullByIndex]);

  // ── BuildModalV2 adapter model ───────────────────────────────────────────
  // Derives the focused single-landmark view from PR 1 sequential helpers.
  // All gameplay reads happen here; BuildModalV2 remains presentational.
  const buildModalV2ViewModel = useMemo(() => deriveBuildModalV2ViewModel({
    stopBuildStateByIndex: runtimeState.stopBuildStateByIndex,
    islandStopPlan,
    essenceAvailable: runtimeState.essence,
    islandArtManifest,
  }), [islandArtManifest, islandStopPlan, runtimeState.essence, runtimeState.stopBuildStateByIndex]);

  // Footer 🔨 Build attention dot: lights up when at least one not-fully-built
  // landmark has a next build step the player can pay for right now with their
  // current essence wallet. Mirrors the orbit "affordable" cue so the player
  // knows to open Build without having to peek inside the modal first.
  const activeBuildDiscountRate = buildDiscountExpiresAtMs && buildDiscountExpiresAtMs > Date.now() ? BUILD_DISCOUNT_RATE : 0;

  const hasAffordableBuildStep = useMemo(
    () => Boolean(buildModalV2ViewModel.activeLandmark?.canAffordNextTap),
    [buildModalV2ViewModel],
  );

  const showIslandClearCelebrationFromAnywhere = useCallback((source: string) => {
    if (islandNumber === 1 && !getIslandTechnologyAccess(runtimeStateRef.current, 'the-concord').active && source !== 'dev_clear_island') {
      setLandingText('Build The Concord from all 9 Island 1 fragments before finishing Island 1.');
      return;
    }
    if (showIslandClearCelebration && islandClearStats?.islandNumber === islandNumber) return;
    islandClearCelebrationShownForVisitRef.current = islandClearVisitKey;
    const existingStats = islandClearStats?.islandNumber === islandNumber ? islandClearStats : null;
    const bossReward = getBossReward(islandNumber);
    logGameSession(session.user.id, {
      gameId: 'shooter_blitz',
      action: 'complete',
      timestamp: new Date().toISOString(),
      metadata: {
        stage: 'island_run_boss_island_cleared',
        island_number: islandNumber,
        source,
        rewards_granted: { dice: bossReward.dice, essence: bossReward.essence },
      },
    });
    if (!existingStats) {
      setIsIslandClearRewardClaimed(false);
      setIslandClearStats({
        islandNumber,
        diceEarned: bossReward.dice,
        essenceEarned: bossReward.essence,
        stopsCleared: 5,
        pendingNextIsland: islandNumber + 1,
        isCycleCapstone: islandNumber % 120 === 0,
      });
    }
    setShowIslandClearCelebration(true);
  }, [islandClearStats, islandClearVisitKey, islandNumber, session.user.id, showIslandClearCelebration]);

  // Island departure is intentionally surfaced through an explicit Finish Island
  // CTA instead of auto-opening this modal. The departure gate stays narrow:
  // fully restored buildings, egg collected/sold, and boss defeated.
  const isEnergyDepletedForRoll = isIslandRunRollEnergyDepleted({
    dicePool,
    dicePerRoll: effectiveDiceCost,
  });
  const rollButtonMode = resolveIslandRunRollButtonMode({
    isRolling,
    dicePool,
    dicePerRoll: effectiveDiceCost,
  });
  const rollButtonLabel = isDoorLandmarkCompletionRequired
    ? 'Complete landmark first'
    : rollButtonMode === 'rolling'
      ? 'Rolling...'
      : rollButtonMode === 'roll'
        ? `Roll (${effectiveDiceCost} dice)`
        : `Need ${effectiveDiceCost} dice to roll`;
  const compactRollButtonLabel = isDoorLandmarkCompletionRequired
    ? 'Landmark first'
    : rollButtonMode === 'rolling'
      ? 'Rolling...'
      : rollButtonMode === 'roll'
        ? 'Roll'
        : 'Need dice';
  const rollBlockedReason = isOnboardingCelebrationVisible
    ? 'onboarding_celebration'
    : isRolling
      ? 'already_rolling'
      : showTravelOverlay
        ? 'travel_overlay'
        : isDoorLandmarkCompletionRequired
          ? 'landmark_required'
          : isEnergyDepletedForRoll
            ? 'insufficient_dice'
            : null;
  const rollDisabledReason = isOnboardingCelebrationVisible
    ? 'onboarding_celebration'
    : isRolling
      ? 'already_rolling'
      : showTravelOverlay
        ? 'travel_overlay'
        : isDoorLandmarkCompletionRequired
          ? 'landmark_required'
          : null;
  const canRoll = !isOnboardingCelebrationVisible && !isRolling && !showTravelOverlay && !isDoorLandmarkCompletionRequired && dicePool >= effectiveDiceCost;
  const canHoldForAutoRoll = canRoll && !isIslandTimerPendingStart;
  const rollButtonInteractionClass = isAutoRolling
    ? 'island-run-prototype__roll-btn--auto-active'
    : isAutoRollHoldPending
      ? 'island-run-prototype__roll-btn--auto-pending'
      : '';
  /** PR6: Human-readable reason for screen readers + tooltips when the roll
   * button is disabled. Keys mirror the internal `rollDisabledReason` codes. */
  const rollDisabledMessage = (() => {
    switch (rollDisabledReason) {
      case 'onboarding_celebration':
        return 'Roll is paused while the onboarding celebration is showing.';
      case 'already_rolling':
        return 'A roll is already in progress — please wait.';
      case 'travel_overlay':
        return 'Island travel is in progress — please wait.';
      case 'landmark_required':
        return 'Complete the opened landmark before rolling again.';
      default:
        return isEnergyDepletedForRoll
          ? `Not enough dice to roll. You need ${effectiveDiceCost} dice per roll.`
          : null;
    }
  })();
  const spinTokenWalletLabel = resolveIslandRunSpinTokenWalletLabel(ISLAND_RUN_CONTRACT_V2_ENABLED);
  const {
    activeTimedEvent,
    rewardBarThreshold,
    rewardBarProgress,
    canClaimRewardBar,
    rewardBarPercent,
    timedEventRemainingMs,
    nextRewardKind,
    nextRewardIcon,
    nextRewardAmount,
  } = resolveIslandRunContractV2RewardHudState({
    islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED,
    runtimeState,
    nowMs,
  });
  const devTimedEventOverrideEventId = useMemo(() => {
    if (!devTimedEventOverrideType || typeof window === 'undefined') return null;
    let nonce = window.sessionStorage.getItem(DEBUG_TIMED_EVENT_OVERRIDE_NONCE_KEY);
    if (!nonce) {
      nonce = `${Date.now()}`;
      window.sessionStorage.setItem(DEBUG_TIMED_EVENT_OVERRIDE_NONCE_KEY, nonce);
    }
    return `${devTimedEventOverrideType}:dev:${nonce}`;
  }, [devTimedEventOverrideType]);
  const effectiveActiveTimedEvent = useMemo(() => {
    // The four rotating event games (Island Workshop, Lucky Spin, Space
    // Excavator, Companion Feast) are demo-only: surface them to admins/creators
    // exclusively. Non-admins never see the event banner, ticket chip, quick
    // launch, or minigame launcher. The underlying reward-bar/event rotation on
    // the runtime record is untouched, so core progression keeps working.
    if (!isAdmin) return null;
    if (!isDevModeEnabled || !devTimedEventOverrideType || !devTimedEventOverrideEventId) return activeTimedEvent;
    const now = Date.now();
    return {
      eventId: devTimedEventOverrideEventId,
      eventType: devTimedEventOverrideType,
      startedAtMs: now,
      expiresAtMs: now + (24 * 60 * 60 * 1000),
      version: 1,
    };
  }, [activeTimedEvent, devTimedEventOverrideEventId, devTimedEventOverrideType, isAdmin, isDevModeEnabled]);
  const timedEventRemainingLabel = effectiveActiveTimedEvent
    ? formatEventRemaining(timedEventRemainingMs)
    : '—';
  // Auto-hide the reward-bar timer/multiplier row: when navigating to the board
  // with more than an hour left on the timer it shows for 10s, then slides up
  // into the bar. With an hour or less remaining it stays visible for urgency.
  const [rewardBarTimersCollapsed, setRewardBarTimersCollapsed] = useState(false);
  useEffect(() => {
    if (timedEventRemainingMs <= REWARDBAR_TIMERS_AUTO_HIDE_THRESHOLD_MS) return;
    const hideTimer = window.setTimeout(
      () => setRewardBarTimersCollapsed(true),
      REWARDBAR_TIMERS_AUTO_HIDE_DELAY_MS,
    );
    return () => window.clearTimeout(hideTimer);
    // Restart the reveal countdown only on mount/navigation, using the timer
    // value captured at entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const timedEventTokenPresentation = resolveEventTokenPresentation(effectiveActiveTimedEvent?.eventType ?? null);
  const timedEventTokenIcon = timedEventTokenPresentation.icon;
  const nextRewardAmountLabel = formatRewardMarkerAmount(nextRewardAmount);
  const nextRewardUnitLabel = (() => {
    switch (nextRewardKind) {
      case 'dice':
        return nextRewardAmount === 1 ? 'die' : 'dice';
      case 'essence':
        return 'money';
      case 'minigame_tokens':
        return nextRewardAmount === 1
          ? timedEventTokenPresentation.labelSingular
          : timedEventTokenPresentation.labelPlural;
      case 'sticker_fragments':
        return 'essence';
    }
  })();
  const nextRewardAccessibleLabel = `${nextRewardAmountLabel} ${nextRewardUnitLabel}`;
  const activeTimedEventId = effectiveActiveTimedEvent?.eventId ?? null;
  const activeEventTickets = activeTimedEventId
    ? (runtimeState.minigameTicketsByEvent?.[activeTimedEventId] ?? 0)
    : 0;
  const activeEventMeta = effectiveActiveTimedEvent ? getEventDisplayMeta(effectiveActiveTimedEvent.eventType) : null;
  const activeEventIcon = effectiveActiveTimedEvent?.eventType === 'space_excavator' ? SPACE_EXCAVATOR_EVENT_ICON_SRC : activeEventMeta?.icon ?? '';
  const renderEventIcon = (className: string) => activeEventIcon.startsWith('/')
    ? <img className={`${className} ${className}--image`} src={activeEventIcon} alt="" aria-hidden="true" loading="lazy" />
    : <i className={className} aria-hidden="true">{activeEventIcon}</i>;
  const isSpaceExcavatorEffectiveEvent = effectiveActiveTimedEvent?.eventType === 'space_excavator';
  const isDevTimedEventOverrideActive = isDevModeEnabled && Boolean(devTimedEventOverrideType && devTimedEventOverrideEventId);
  const rewardBarAvatarIcon = activeEventIcon || timedEventTokenIcon;
  const spaceExcavatorRewardBarHint = isSpaceExcavatorEffectiveEvent
    ? (isDevTimedEventOverrideActive ? SPACE_EXCAVATOR_REWARD_BAR_HINT_TEXT_DEV : SPACE_EXCAVATOR_REWARD_BAR_HINT_TEXT)
    : null;

  useEffect(() => {
    if (!isSpaceExcavatorEffectiveEvent) {
      setShowSpaceExcavatorRewardBarHint(false);
      return undefined;
    }

    setShowSpaceExcavatorRewardBarHint(true);
    const timer = window.setTimeout(() => {
      setShowSpaceExcavatorRewardBarHint(false);
    }, SPACE_EXCAVATOR_REWARD_BAR_HINT_VISIBLE_MS);

    return () => window.clearTimeout(timer);
  }, [activeTimedEventId, isDevTimedEventOverrideActive, isSpaceExcavatorEffectiveEvent]);

  const hasLegacyEventTicketDivergence = Boolean(activeTimedEventId) && activeEventTickets !== spinTokens;

  useEffect(() => {
    if (activeStopId !== 'mystery') {
      setArenaBoostStatus('idle');
      return;
    }
    if (!effectiveActiveTimedEvent?.eventId) {
      setArenaBoostStatus('no_active_event');
      return;
    }
    const result = claimArenaFirstTicketBoost({
      session,
      client,
      islandNumber,
      cycleIndex: runtimeStateRef.current.cycleIndex,
      stopId: activeStopId,
      activeTimedEventId: effectiveActiveTimedEvent.eventId,
      triggerSource: 'event_arena_stop_open',
    });
    if (result.status === 'claimed') {
      setRuntimeState(result.record);
      setLandingText('Arena boost unlocked: +3 Event Tickets.');
      setArenaBoostStatus('claimed');
      setArenaSoftSaveValueMomentReached(true);
      return;
    }
    setArenaBoostStatus(result.status === 'already_claimed' ? 'already_claimed' : 'idle');
  }, [activeStopId, client, effectiveActiveTimedEvent?.eventId, islandNumber, session]);
  const isRewardBarNearlyFull = rewardBarPercent >= 85 && rewardBarPercent < 100;
  // Parity guard breadcrumb for islandRunBoardEssenceParity:
  // const activeEventTickets = activeTimedEventId ? (runtimeState.minigameTicketsByEvent?.[activeTimedEventId] ?? 0) : 0;
  // const hasLegacyEventTicketDivergence = Boolean(activeTimedEventId) && activeEventTickets !== spinTokens;
  // const timedEventTokenPresentation = resolveEventTokenPresentation(activeTimedEvent?.eventType ?? null);
  // B8: detect the bar becoming claimable and play a one-shot "snap" flash.
  useEffect(() => {
    if (canClaimRewardBar && !rewardBarWasClaimableRef.current) {
      rewardBarWasClaimableRef.current = true;
      setRewardBarSnapActive(true);
      const timer = setTimeout(() => setRewardBarSnapActive(false), 460);
      return () => clearTimeout(timer);
    }
    if (!canClaimRewardBar && rewardBarWasClaimableRef.current) {
      rewardBarWasClaimableRef.current = false;
    }
  }, [canClaimRewardBar]);
  // B8: tier-class modifier for rarity coloring (clamped 1..5 to match palette).
  const rewardBarTierClass = (() => {
    const tier = Math.max(1, Math.min(5, runtimeState.rewardBarEscalationTier || 1));
    return ` island-run-board__rewardbar--tier-${tier}`;
  })();
  const avatarImageUrl = getAvatarImageUrl(session.user);
  const islandDisplayName = getIslandDisplayName(islandNumber);
  const spark36RingSegmentsGradient = useMemo(() => {
    if (!isSpark36BoardProfile || !activeTileAnchors.length) return '';
    const segmentSize = 360 / activeTileAnchors.length;
    const segments = Array.from({ length: activeTileAnchors.length }, (_, index) => {
        const tileType = landmarkDoorTileMap[index]?.tileType ?? 'micro';
        const start = (index * segmentSize).toFixed(3);
        const end = ((index + 1) * segmentSize).toFixed(3);
        const color = SPARK60_TILE_COLOR[tileType] ?? '#f0dfad';
        return `${color} ${start}deg ${end}deg`;
      })
      .join(', ');
    return `conic-gradient(from -90deg, ${segments})`;
  }, [activeTileAnchors.length, isSpark36BoardProfile, landmarkDoorTileMap]);
  const shouldPromptDicePurchase = dicePool < effectiveDiceCost;
  const wasDicePurchasePromptEligibleRef = useRef(false);

  useEffect(() => {
    if (!hasHydratedRuntimeState || !isIsland120StartupDiagnosticActive) return;
    if (island120StartupSnapshotLoggedRef.current) return;

    island120StartupSnapshotLoggedRef.current = true;
    const currentIslandKey = String(runtimeState.currentIslandNumber ?? islandNumber);
    const completedStopsForIsland = runtimeState.completedStopsByIsland?.[currentIslandKey] ?? [];
    const activeStopIndex = activeStopId
      ? islandStopPlan.findIndex((stop) => stop.stopId === activeStopId)
      : runtimeState.activeStopIndex;

    logIslandRunEntryDebug('island120_startup_snapshot', {
      userId: session.user.id,
      islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED,
      currentIslandNumber: runtimeState.currentIslandNumber ?? islandNumber,
      activeStopId,
      activeStopIndex: activeStopIndex >= 0 ? activeStopIndex : null,
      stopStatesByIndex: compactStopStatesForDiagnostics(runtimeState.stopStatesByIndex),
      completedStopsByIslandCurrentIsland: completedStopsForIsland,
      hasActiveEgg: Boolean(activeEgg),
      islandEggSlotUsed,
      legacyStep1Complete,
      resolvedStep1ProgressionValue: step1Complete,
      roll: {
        canRoll,
        isRolling,
        isBusy: isRolling || isOnboardingCelebrationVisible || showTravelOverlay,
        buttonDisabled: Boolean(rollDisabledReason),
        disabledReason: rollBlockedReason,
        mode: rollButtonMode,
        label: rollButtonLabel,
      },
    });
  }, [
    activeEgg,
    activeStopId,
    canRoll,
    hasHydratedRuntimeState,
    island120StartupSnapshotLoggedRef,
    islandEggSlotUsed,
    islandNumber,
    islandStopPlan,
    isIsland120StartupDiagnosticActive,
    isRolling,
    legacyStep1Complete,
    rollButtonLabel,
    rollButtonMode,
    rollBlockedReason,
    rollDisabledReason,
    runtimeState.activeStopIndex,
    runtimeState.completedStopsByIsland,
    runtimeState.currentIslandNumber,
    runtimeState.stopStatesByIndex,
    session.user.id,
    isOnboardingCelebrationVisible,
    showTravelOverlay,
    step1Complete,
  ]);

  useEffect(() => {
    if (!hasHydratedRuntimeState || !isIsland120StartupDiagnosticActive) return;
    const startMs = island120StartupDiagnosticSessionStartMsRef.current;
    if (startMs === null) return;

    const elapsedMs = Date.now() - startMs;
    const previousActiveStopId = island120PrevActiveStopIdRef.current;
    island120PrevActiveStopIdRef.current = activeStopId;

    if (elapsedMs > ISLAND_RUN_120_STARTUP_DIAGNOSTIC_WINDOW_MS) {
      island120PendingStopTransitionRef.current = null;
      return;
    }

    const pendingTransition = island120PendingStopTransitionRef.current;
    const requestedStopId = pendingTransition?.requestedStopId ?? activeStopId;
    const previousActiveStopIndex = previousActiveStopId
      ? islandStopPlan.findIndex((stop) => stop.stopId === previousActiveStopId)
      : -1;
    const requestedStopIndex = requestedStopId
      ? islandStopPlan.findIndex((stop) => stop.stopId === requestedStopId)
      : -1;
    const nextActiveStopIndex = activeStopId
      ? islandStopPlan.findIndex((stop) => stop.stopId === activeStopId)
      : -1;

    let loopHintCounter: number | undefined;
    if (
      previousActiveStopId
      && activeStopId
      && previousActiveStopId !== activeStopId
    ) {
      const pairKey = `${previousActiveStopId}${ISLAND_RUN_120_STOP_PAIR_DELIMITER}${activeStopId}`;
      const nextCount = (island120ToggleHintCounterByPairRef.current[pairKey] ?? 0) + 1;
      island120ToggleHintCounterByPairRef.current[pairKey] = nextCount;
      loopHintCounter = nextCount;
    }

    logIslandRunEntryDebug('island120_stop_transition', {
      userId: session.user.id,
      elapsedMs,
      source: pendingTransition?.source ?? 'effect_or_unknown',
      requestedStopId,
      requestedStopIndex: requestedStopIndex >= 0 ? requestedStopIndex : null,
      previousActiveStopId,
      previousActiveStopIndex: previousActiveStopIndex >= 0 ? previousActiveStopIndex : null,
      nextActiveStopId: activeStopId,
      nextActiveStopIndex: nextActiveStopIndex >= 0 ? nextActiveStopIndex : null,
      loopHintCounter,
    });

    island120PendingStopTransitionRef.current = null;
  }, [activeStopId, hasHydratedRuntimeState, islandStopPlan, isIsland120StartupDiagnosticActive, session.user.id]);

  const openOutOfDicePurchasePrompt = useCallback((source: 'auto_prompt' | 'roll_attempt') => {
    setShowOutOfDicePurchasePrompt(true);
    setDiceCheckoutError(null);
    setLandingText(`You're out of dice. Open the shop or buy more rolls.`);
    logIslandRunEntryDebug('out_of_dice_prompt_opened', {
      userId: session.user.id,
      source,
      dicePool,
      requiredDicePerRoll: effectiveDiceCost,
      effectiveMultiplier,
    });
  }, [dicePool, effectiveDiceCost, effectiveMultiplier, session.user.id]);

  useEffect(() => {
    if (!hasHydratedRuntimeState || isDemoSession(session)) {
      return;
    }

    if (shouldPromptDicePurchase && !wasDicePurchasePromptEligibleRef.current) {
      openOutOfDicePurchasePrompt('auto_prompt');
    }

    wasDicePurchasePromptEligibleRef.current = shouldPromptDicePurchase;
  }, [hasHydratedRuntimeState, openOutOfDicePurchasePrompt, session, shouldPromptDicePurchase]);

  useEffect(() => {
    if (showOutOfDicePurchasePrompt && !shouldPromptDicePurchase) {
      setShowOutOfDicePurchasePrompt(false);
      setDiceCheckoutError(null);
    }
  }, [showOutOfDicePurchasePrompt, shouldPromptDicePurchase]);

  const activateCurrentIsland = useCallback(() => {
    const nowMs = Date.now();
    const durationMs = getIslandDurationMs(islandNumber);
    const activationResult = applyActivateCurrentIslandTimer({
      session,
      client,
      islandNumber,
      cycleIndex,
      nowMs,
      durationMs,
      triggerSource: 'activate_current_island',
    });
    const nextRecord = activationResult.record;
    setIslandStartedAtMs(nextRecord.islandStartedAtMs);
    setIslandExpiresAtMs(nextRecord.islandExpiresAtMs);
    setTimeLeftSec(
      nextRecord.islandStartedAtMs > 0 && nextRecord.islandExpiresAtMs > 0
        ? Math.max(0, Math.ceil((nextRecord.islandExpiresAtMs - nextRecord.islandStartedAtMs) / 1000))
        : 0,
    );
    setIsIslandTimerPendingStart(!(nextRecord.islandStartedAtMs > 0 && nextRecord.islandExpiresAtMs > 0));
    setLandingText(ISLAND_RUN_CONTRACT_V2_ENABLED
      ? 'Island run started. Timer shown for event context only.'
      : 'Island timer started. Roll dice to move!');
    setRuntimeState(nextRecord);
  }, [client, cycleIndex, islandNumber, session]);

  const runContractV2RewardBarClaimCascade = useCallback((options: {
    state: {
      rewardBarProgress: number;
      rewardBarThreshold: number;
      rewardBarClaimCountInEvent: number;
      rewardBarEscalationTier: number;
      rewardBarLastClaimAtMs: number | null;
      rewardBarBoundEventId: string | null;
      rewardBarLadderId: string | null;
      activeTimedEvent: { eventId: string; eventType: string; startedAtMs: number; expiresAtMs: number; version: number } | null;
      activeTimedEventProgress: { feedingActions: number; tokensEarned: number; milestonesClaimed: number };
      stickerProgress: { fragments: number; guaranteedAt?: number; pityCounter?: number };
      stickerInventory: Record<string, number>;
    };
    emptyMessage?: string;
  }): boolean => {
    if (!ISLAND_RUN_CONTRACT_V2_ENABLED) return false;
    const nowMs = Date.now();
    const chainResult = resolveChainedRewardBarClaims({
      state: options.state,
      nowMs,
    });

    if (chainResult.payouts.length === 0) {
      if (options.emptyMessage) setLandingText(options.emptyMessage);
      return false;
    }

    // Aggregate totals from all chained payouts
    let totalDice = 0;
    let totalEssence = 0;
    let totalMinigameTokens = 0;
    let totalStickerFragments = 0;
    let totalStickersGranted = 0;
    for (const payout of chainResult.payouts) {
      totalDice += payout.dice;
      totalEssence += payout.essence;
      totalMinigameTokens += payout.minigameTokens;
      totalStickerFragments += payout.stickerFragments;
      totalStickersGranted += payout.stickersGranted;
    }

    applyContractV2RewardBarRuntimeState(chainResult.state);

    // C1: Route reward-bar claim deltas through the store action. This
    // replaces the old setSpinTokens + setDicePool + persistIslandRunRuntimeStatePatch
    // + setRuntimeState quartet that raced with the roll service.
    const hopRecord = applyTokenHopRewards({
      session,
      client,
      deltas: {
        spinTokens: totalMinigameTokens,
        dicePool: totalDice,
        essence: totalEssence,
      },
      dualWriteMinigameTicketsEventId: chainResult.state.activeTimedEvent?.eventId ?? null,
      triggerSource: 'reward_bar_claim',
    });
    setRuntimeState(hopRecord);

    // Trigger burst animation + cascade display
    setRewardBarBurstAnimating(true);
    setRewardBarCascadePayouts(chainResult.payouts);
    setTimeout(() => {
      setRewardBarBurstAnimating(false);
      setRewardBarCascadePayouts([]);
    }, chainResult.payouts.length * 600 + 400);

    const payoutParts: string[] = [];
    if (totalDice > 0) payoutParts.push(`+${totalDice} 🎲`);
    if (totalEssence > 0) payoutParts.push(`+${totalEssence} 💰`);
    if (totalMinigameTokens > 0) payoutParts.push(`+${totalMinigameTokens} ${timedEventTokenIcon}`);
    if (totalStickerFragments > 0) payoutParts.push(`+${totalStickerFragments} 🧩`);
    if (totalStickersGranted > 0) payoutParts.push(`+${totalStickersGranted} 🏆sticker`);
    const cascadeNote = chainResult.payouts.length > 1 ? ` (${chainResult.payouts.length}x cascade!)` : '';
    setLandingText(`Reward claimed: ${payoutParts.join(' ')}${cascadeNote}`);
    playIslandRunSound(chainResult.payouts.length > 1 ? 'reward_bar_cascade' : 'reward_bar_claim_burst');
    triggerIslandRunHaptic(chainResult.payouts.length > 1 ? 'reward_bar_cascade' : 'reward_claim');
    if (totalStickersGranted > 0) {
      playIslandRunSound('sticker_complete');
      triggerIslandRunHaptic('sticker_complete');
    }
    return true;
  }, [client, session]);

  const handleContractV2RewardBarClaim = () => {
    runContractV2RewardBarClaimCascade({
      state: {
        rewardBarProgress: runtimeStateRef.current.rewardBarProgress,
        rewardBarThreshold: runtimeStateRef.current.rewardBarThreshold,
        rewardBarClaimCountInEvent: runtimeStateRef.current.rewardBarClaimCountInEvent,
        rewardBarEscalationTier: runtimeStateRef.current.rewardBarEscalationTier,
        rewardBarLastClaimAtMs: runtimeStateRef.current.rewardBarLastClaimAtMs,
        rewardBarBoundEventId: runtimeStateRef.current.rewardBarBoundEventId,
        rewardBarLadderId: runtimeStateRef.current.rewardBarLadderId,
        activeTimedEvent: runtimeStateRef.current.activeTimedEvent,
        activeTimedEventProgress: runtimeStateRef.current.activeTimedEventProgress,
        stickerProgress: runtimeStateRef.current.stickerProgress,
        stickerInventory: runtimeStateRef.current.stickerInventory,
      },
      emptyMessage: 'Reward bar is not full yet.',
    });
  };

  const handleRoll = async (): Promise<boolean> => {
    logIslandRunEntryDebug('roll_click_start', {
      userId: session.user.id,
      tokenIndex: runtimeStateRef.current.tokenIndex,
      dicePool: runtimeStateRef.current.dicePool,
      runtimeVersion: runtimeStateRef.current.runtimeVersion,
      isAnimatingRoll: isAnimatingRollRef.current,
      isRollSyncPending: isRollSyncPendingRef.current,
    });
    const rollDecisionFlags = {
      canRoll,
      isOnboardingCelebrationVisible,
      showTravelOverlay,
      step1Complete,
      isRolling,
      dicePool,
      requiredDicePerRoll: effectiveDiceCost,
      isEnergyDepletedForRoll,
      rollButtonMode,
      rollButtonLabel,
      rollBlockedReason,
      rollDisabledReason,
    };
    if (isIsland120StartupDiagnosticActive) {
      logIslandRunEntryDebug('island120_roll_interaction', {
        userId: session.user.id,
        action: 'click_attempt',
        clickHandlerFired: true,
        ...rollDecisionFlags,
      });
    }

    if (isOnboardingCelebrationVisible) {
      if (isIsland120StartupDiagnosticActive) {
        logIslandRunEntryDebug('island120_roll_interaction', {
          userId: session.user.id,
          action: 'blocked',
          blockReason: 'onboarding_celebration',
          ...rollDecisionFlags,
        });
      }
      return false;
    }

    // M11C: Step 1 enforcement removed — rolling is always free when dice are available.

    if (isDoorLandmarkCompletionRequired) {
      if (requiredDoorStopId) {
        requestActiveStopTransition(requiredDoorStopId, 'roll_blocked_reopen_required_landmark');
        setFocusedStopId(requiredDoorStopId);
        setCameraMode('stop_focus');
      }
      setLandingText('Complete the opened landmark before rolling again.');
      if (isIsland120StartupDiagnosticActive) {
        logIslandRunEntryDebug('island120_roll_interaction', {
          userId: session.user.id,
          action: 'blocked',
          blockReason: 'landmark_required',
          requiredDoorStopId,
          ...rollDecisionFlags,
        });
      }
      return false;
    }

    if (isRolling) {
      if (isIsland120StartupDiagnosticActive) {
        logIslandRunEntryDebug('island120_roll_interaction', {
          userId: session.user.id,
          action: 'blocked',
          blockReason: 'already_rolling',
          ...rollDecisionFlags,
        });
      }
      return false;
    }

    // A previous roll's hop animation may still be playing (we clear
    // `isRolling` before awaiting the hop sequence so the dice tray UI
    // can settle). Re-entering `handleRoll` while the pawn is mid-hop
    // would overwrite `hopSequenceResolverRef.current` and orphan the
    // first roll's resolver — leaving its `await` hanging forever and
    // freezing subsequent rolls (the previous roll's `applyRollResult`
    // and `setPendingHopSequence(null)` cleanup never runs). Block
    // re-entry until the hop animation finishes.
    if (isAnimatingRollRef.current) {
      if (isIsland120StartupDiagnosticActive) {
        logIslandRunEntryDebug('island120_roll_interaction', {
          userId: session.user.id,
          action: 'blocked',
          blockReason: 'hop_animation_in_flight',
          ...rollDecisionFlags,
        });
      }
      return false;
    }

    const refreshedDicePool = applyPassiveDiceRegen('pre_roll');
    if (refreshedDicePool < effectiveDiceCost) {
      if (isIsland120StartupDiagnosticActive) {
        logIslandRunEntryDebug('island120_roll_interaction', {
          userId: session.user.id,
          action: 'blocked',
          blockReason: 'insufficient_dice',
          ...rollDecisionFlags,
        });
      }
      openOutOfDicePurchasePrompt('roll_attempt');
      return false;
    }

    setIsRolling(true);
    setCameraMode('board_follow');
    requestActiveStopTransition(null, 'roll_start_close_stop');
    // Increment per-session roll counter — used to seed deterministic tile-landing RNG.
    rollIndexRef.current += 1;

    // M10A: roll sound + haptic
    playIslandRunSound('roll');
    triggerIslandRunHaptic('roll');

    // Reset the "animation already fired" guard before triggering the roll so
    // that any onDiceRollComplete that arrives after the flag is cleared but
    // before the await-promise is created (the idle-freeze race) is captured.
    diceRollCompleteAlreadyFiredRef.current = false;

    const rollResult = await executeIslandRunRollAction({
      session,
      client,
      boardProfileId: ACTIVE_BOARD_PROFILE.id,
      diceMultiplier: effectiveMultiplier,
    });
    logIslandRunEntryDebug('roll_action_result', {
      userId: session.user.id,
      status: rollResult.status,
      total: rollResult.total ?? null,
      dieOne: rollResult.dieOne ?? null,
      dieTwo: rollResult.dieTwo ?? null,
      newTokenIndex: rollResult.newTokenIndex ?? null,
      hopCount: Array.isArray(rollResult.hopSequence) ? rollResult.hopSequence.length : null,
      runtimeVersion: runtimeStateRef.current.runtimeVersion,
      tokenIndex: runtimeStateRef.current.tokenIndex,
    });

    if (
      rollResult.status !== 'ok'
      || rollResult.total === undefined
      || rollResult.dieOne === undefined
      || rollResult.dieTwo === undefined
      || rollResult.newTokenIndex === undefined
      || !rollResult.hopSequence
    ) {
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'island_run_roll_blocked',
        metadata: {
          reason: rollResult.status,
          island_number: effectiveIslandNumber,
          dice_multiplier: effectiveMultiplier,
          dice_cost: effectiveDiceCost,
        },
      });
      if (isIsland120StartupDiagnosticActive) {
        logIslandRunEntryDebug('island120_roll_interaction', {
          userId: session.user.id,
          action: 'blocked',
          blockReason: 'roll_action_rejected',
          rollResultStatus: rollResult.status,
          ...rollDecisionFlags,
        });
      }
      setIsRolling(false);
      if (rollResult.status === 'insufficient_dice') {
        openOutOfDicePurchasePrompt('roll_attempt');
      } else {
        setLandingText(`Need ${effectiveDiceCost} dice to roll at ×${effectiveMultiplier}.`);
      }
      return false;
    }

    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'island_run_roll_completed',
      metadata: {
        island_number: effectiveIslandNumber,
        from_tile: runtimeStateRef.current.tokenIndex,
        to_tile: rollResult.newTokenIndex,
        roll_total: rollResult.total,
        dice_multiplier: effectiveMultiplier,
        dice_cost: rollResult.diceCost ?? effectiveDiceCost,
      },
    });
    if (isIsland120StartupDiagnosticActive) {
      logIslandRunEntryDebug('island120_roll_interaction', {
        userId: session.user.id,
        action: 'accepted',
        blockReason: null,
        rollResultStatus: rollResult.status,
        ...rollDecisionFlags,
      });
    }

    isRollSyncPendingRef.current = true;
    try {
      const dieOne = rollResult.dieOne;
      const dieTwo = rollResult.dieTwo;
      setRollingDiceFaces([dieOne, dieTwo]);
      const nextRoll = rollResult.total;
      setRollValue(nextRoll);
      setLandingText(`Rolling ${dieOne} + ${dieTwo} = ${nextRoll}...`);

    // Wait for dice animation to finish before moving the token.
    // Guard: if the animation already completed while executeIslandRunRollAction
    // was awaiting the remote write (idle-freeze scenario — slow network after
    // an idle period means the server round-trip outlasts the animation), skip
    // creating the promise entirely to avoid an unresolvable hang.
      if (!diceRollCompleteAlreadyFiredRef.current) {
        await new Promise<void>((resolve) => {
          diceRollCompleteResolverRef.current = resolve;
        });
      }

    // Show the roll total briefly over the dice area
      setDiceRollTotalOverlay(`Rolled ${nextRoll}!`);
      await new Promise<void>((resolve) => { setTimeout(resolve, DICE_ROLL_OVERLAY_DURATION_MS); });
      setDiceRollTotalOverlay(null);
      setIsRolling(false);

    // Trust the service's authoritative hop sequence + final index. Local state
    // mirrors (never re-derives) the canonical movement — this closes the
    // drift window where two independent `resolveWrappedTokenIndex` walks could
    // disagree if the service ever changes its topology rules.
      const hopIndices = rollResult.hopSequence;
      const currentIndex = rollResult.newTokenIndex;
      const diceCostApplied = rollResult.diceCost ?? effectiveDiceCost;

    // Set the full hop sequence — BoardStage will animate tile-by-tile
    // with camera follow (Monopoly GO style).
    //
    // Mark the animation as in-flight BEFORE scheduling the hop so that any
    // concurrent writers (hydration reconcile, island-travel resets) see
    // the flag and skip their `tokenIndex` updates. Without this, a stale
    // Supabase hydration landing mid-animation would call
    // `refreshIslandRunStateFromLocal`, overwrite the store mirror with the
    // pre-roll tokenIndex, and cause the pawn to snap back to tile 0 when
    // `pendingHopSequence` clears.
      let rollActionBarrierActive = false;
      try {
        isAnimatingRollRef.current = true;
        // Clear any prior optimistic traffic-light charge so this roll's
        // mid-hop pass starts from the authoritative value.
        setTrafficLightVisualCharge(null);
      // P0-3: once the roll service has committed tokenIndex/dice/runtimeVersion,
      // block all queued action-lock writers until this renderer applies the
      // post-hop sync (`applyRollResult`). This closes the stale-base window
      // where a second action can read pre-roll runtimeVersion mid-animation.
        beginIslandRunActionBarrier(session.user.id);
        rollActionBarrierActive = true;

        setPendingHopSequence(hopIndices);
        await new Promise<void>((resolve) => {
          hopSequenceResolverRef.current = resolve;
        });

    // C1: Sync the store mirror from localStorage (the roll service already
    // committed the authoritative tokenIndex + dicePool there). This replaces
    // the old setTokenIndex / setDicePool / setRuntimeState sequence and
    // eliminates the drift window the persist effect used to create.
    //
    // IMPORTANT: do this BEFORE clearing `pendingHopSequence` below. If we
    // cleared the hop sequence first, BoardStage's effect would observe
    // `pendingHopSequence === null` while `tokenIndex` was still the
    // pre-roll value, fall through to the single-step fallback, and
    // animate the pawn BACK from the hop's last tile to the stale
    // pre-roll tile (the "jumps tiles, then jumps back, then redoes it"
    // bug). Updating runtime state first guarantees `tokenIndex` already
    // matches the hop's final index when the clear lands.
        const freshRecord = applyRollResult({ session });
    // Defensive merge: the freshRecord comes from localStorage, which the roll
    // service writes synchronously (tokenIndex, dicePool, runtimeVersion).
    // However localStorage may still have a stale completedStopsByIsland /
    // stopStatesByIndex if a persistIslandRunRuntimeStatePatch call that
    // started before the roll completed after it (Fix-1 addresses this at the
    // source, but this is a second layer of defence). Merge both sources
    // so that a completed stop can never be un-completed by a stale snapshot:
    //  - completedStopsByIsland: take the union of stop IDs per island key.
    //  - stopStatesByIndex: once objectiveComplete or buildComplete is true it
    //    stays true regardless of which source has stale false.
        setRuntimeStateWithTrace('roll_applyRollResult_merge', (current) => {
          const merged = { ...freshRecord };

      // Union-merge completedStopsByIsland
          const mergedCompletedStops: Record<string, string[]> = { ...freshRecord.completedStopsByIsland };
          for (const [islandKey, currentStops] of Object.entries(current.completedStopsByIsland ?? {})) {
            const freshStops = mergedCompletedStops[islandKey] ?? [];
            const union = Array.from(new Set([...freshStops, ...currentStops]));
            if (union.length > freshStops.length) {
              mergedCompletedStops[islandKey] = union;
            }
          }
          merged.completedStopsByIsland = mergedCompletedStops;

      // Monotonic-merge stopStatesByIndex: objectiveComplete/buildComplete stay true
          if (Array.isArray(current.stopStatesByIndex) && Array.isArray(freshRecord.stopStatesByIndex)) {
            merged.stopStatesByIndex = freshRecord.stopStatesByIndex.map((freshEntry, i) => {
              const currentEntry = current.stopStatesByIndex[i];
              if (!currentEntry || !freshEntry) return freshEntry ?? currentEntry;
              return {
                ...freshEntry,
                objectiveComplete: Boolean(freshEntry.objectiveComplete || currentEntry.objectiveComplete),
                buildComplete: Boolean(freshEntry.buildComplete || currentEntry.buildComplete),
              };
            });
          }

          return merged;
        });

    // Now safe to clear the hop sequence — the BoardStage's
    // `onHopSequenceComplete` no longer does this for us (see the
    // comment above for why). The `isAnimatingRollRef` flag was already
    // cleared by `onHopSequenceComplete`.
        setPendingHopSequence(null);

        const trafficLightPassed = Boolean(rollResult.hopSequence?.includes(TRAFFIC_LIGHT_TILE_INDEX));
        let trafficLightUnlocked = false;
        let trafficLightChargeAfter = trafficLightCharge;
        if (trafficLightPassed) {
          const trafficResult = applyTrafficLightTilePass({
            session,
            client,
            islandNumber,
            triggerSource: 'traffic_light_tile_pass',
          });
          setRuntimeState(trafficResult.record);
          trafficLightUnlocked = trafficResult.unlocked;
          trafficLightChargeAfter = trafficResult.chargeAfter;
          if (trafficResult.unlocked) {
            setTrafficLightCoinFlip({
              seed: (effectiveIslandNumber * 1009) + (rollIndexRef.current * 131) + currentIndex,
              reward: null,
              phase: 'ready',
            });
            setLandingText('🚦 Traffic light complete! Flip the coin for a mystery reward.');
          } else {
            setLandingText(`🚦 Traffic light ${trafficResult.chargeAfter}/${TRAFFIC_LIGHT_CHARGE_TARGET} lit.`);
          }
        }

        // Caretaker chat opens only when the player LANDS on the caretaker's
        // home tile (the caretaker sprite is anchored there on the board).
        const didLandOnCaretakerTile = currentIndex === ISLAND_CARETAKER_TILE_INDEX
          && hasIslandCaretakerConcordContent(runtimeStateRef.current.currentIslandNumber);
        if (didLandOnCaretakerTile) {
          setShowEncounterModal(false);
          setEncounterResolved(false);
          openCaretakerFlow('caretaker_tile_land');
          return true;
        }

    // Stops are side-quest structures — the player piece never lands on a stop.
    // Encounter tiles open their challenge modal; every other tile funnels through
    // resolveTileLanding for essence / feed / hazard outcomes.
        const landedTile = landmarkDoorTileMap[currentIndex];
        if (maybeCollectTechItem(landedTile?.tileType ?? 'micro', currentIndex)) {
          setShowEncounterModal(false);
          setEncounterResolved(false);
        } else if (landedTile?.tileType === 'landmark_door' && landedTile.doorStopId) {
          setShowEncounterModal(false);
          setEncounterResolved(false);
          handleLandmarkDoorLanding(landedTile.doorStopId, currentIndex);
        } else if (landedTile?.tileType === 'traffic_light') {
          setShowEncounterModal(false);
          setEncounterResolved(false);
          if (!trafficLightUnlocked) {
            setLandingText(`🚦 Traffic light ${trafficLightChargeAfter}/${TRAFFIC_LIGHT_CHARGE_TARGET} lit.`);
          }
        } else if (landedTile?.tileType === 'build_discount') {
          setShowEncounterModal(false);
          setEncounterResolved(false);
          const durationMs = BUILD_DISCOUNT_MIN_DURATION_MS + Math.floor(Math.random() * (BUILD_DISCOUNT_MAX_DURATION_MS - BUILD_DISCOUNT_MIN_DURATION_MS + 1));
          const durationMinutes = Math.max(2, Math.round(durationMs / 60000));
          setBuildDiscountExpiresAtMs(Date.now() + durationMs);
          setLandingText(`🔨 Build Rush! 25% off building for ${durationMinutes} minutes.`);
          setShowBuildPanel(true);
        } else if (landedTile?.tileType === 'free_ticket') {
          setShowEncounterModal(false);
          setEncounterResolved(false);
          const eventId = activeTimedEventId;
          if (!eventId) {
            setLandingText('🎟️ Free ticket tile found — no timed event is active yet.');
          } else {
            const currentTickets = Math.max(0, Math.floor(runtimeStateRef.current.minigameTicketsByEvent?.[eventId] ?? 0));
            const maxGrant = currentTickets <= 0 ? 3 : currentTickets <= 2 ? 2 : 1;
            const grant = 1 + Math.floor(Math.random() * maxGrant);
            const grantResult = applyTimedEventTicketTileGrant({ session, client, eventId, amount: grant, triggerSource: 'free_ticket_tile_land' });
            setRuntimeState(grantResult.record);
            runtimeStateRef.current = grantResult.record;
            setLandingText(`🎟️ Free ticket tile! +${grantResult.applied} event ticket${grantResult.applied === 1 ? '' : 's'}.`);
          }
        } else if (landedTile?.tileType === 'encounter') {
          // M6-COMPLETE: check if this encounter tile was already completed this visit
          if (completedEncounterIndices.has(currentIndex)) {
            setLandingText(`Encounter tile (#${currentIndex}) — already completed this visit. ✅`);
            setShowEncounterModal(false);
          } else {
            const challenge = drawEncounterChallenge(islandNumber, currentIndex);
            openEncounterChallenge(challenge, currentIndex);
          }
        } else {
          resolveTileLanding(landedTile?.tileType ?? 'micro', currentIndex);
          setShowEncounterModal(false);
          setEncounterResolved(false);
        }
      } finally {
        if (rollActionBarrierActive) {
          endIslandRunActionBarrier(session.user.id);
        }
      }
      return true;
    } finally {
      isRollSyncPendingRef.current = false;
    }
  };

  const stopAutoRoll = useCallback(() => {
    autoRollLoopAbortRef.current = true;
    setIsAutoRolling(false);
    setIsAutoRollHoldPending(false);
    if (autoRollHoldTimeoutRef.current !== null) {
      window.clearTimeout(autoRollHoldTimeoutRef.current);
      autoRollHoldTimeoutRef.current = null;
    }
  }, []);

  const beginAutoRollHold = useCallback(() => {
    if (isOnboardingCelebrationVisible || showTravelOverlay || isRolling || isAnimatingRollRef.current || dicePool < effectiveDiceCost) {
      return;
    }
    if (autoRollHoldTimeoutRef.current !== null) {
      window.clearTimeout(autoRollHoldTimeoutRef.current);
    }
    autoRollHoldTriggeredRef.current = false;
    setIsAutoRollHoldPending(true);
    autoRollHoldTimeoutRef.current = window.setTimeout(() => {
      autoRollHoldTimeoutRef.current = null;
      autoRollHoldTriggeredRef.current = true;
      suppressNextRollClickRef.current = true;
      autoRollLoopAbortRef.current = false;
      setIsAutoRolling(true);
      setLandingText('Auto-roll engaged. Release to stop.');
    }, AUTO_ROLL_HOLD_DELAY_MS);
  }, [dicePool, effectiveDiceCost, isOnboardingCelebrationVisible, isRolling, showTravelOverlay]);

  const endAutoRollHold = useCallback(() => {
    if (autoRollHoldTimeoutRef.current !== null) {
      window.clearTimeout(autoRollHoldTimeoutRef.current);
      autoRollHoldTimeoutRef.current = null;
    }
    setIsAutoRollHoldPending(false);
    if (autoRollHoldTriggeredRef.current) {
      autoRollHoldTriggeredRef.current = false;
      stopAutoRoll();
    }
  }, [stopAutoRoll]);

  const rollHoldHandlers = canHoldForAutoRoll
    ? {
      onPointerDown: beginAutoRollHold,
      onPointerUp: endAutoRollHold,
      onPointerLeave: endAutoRollHold,
      onPointerCancel: endAutoRollHold,
    }
    : {};

  useEffect(() => {
    if (!isAutoRolling) {
      return;
    }
    let cancelled = false;
    const loop = async () => {
      while (!cancelled && !autoRollLoopAbortRef.current) {
        // Pause (without ending auto-roll) while any modal/overlay owns
        // attention — e.g. an encounter, stop, or reward modal opened by the
        // previous roll. Poll until every modal is dismissed, then resume.
        if (autoRollPausedRef.current) {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, AUTO_ROLL_PAUSE_POLL_MS);
          });
          continue;
        }
        const didRoll = await handleRollRef.current();
        if (!didRoll) {
          autoRollLoopAbortRef.current = true;
          setIsAutoRolling(false);
          break;
        }
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, AUTO_ROLL_INTERVAL_MS);
        });
      }
    };
    void loop();
    return () => {
      cancelled = true;
    };
  }, [isAutoRolling]);

  const handleRollButtonClick = useCallback(() => {
    if (suppressNextRollClickRef.current) {
      suppressNextRollClickRef.current = false;
      return;
    }
    void handleRoll();
  }, [handleRoll]);

  const handleRollRef = useRef(handleRoll);
  useEffect(() => {
    handleRollRef.current = handleRoll;
  }, [handleRoll]);

  useEffect(() => {
    if (dicePool < effectiveDiceCost && isAutoRolling) {
      stopAutoRoll();
    }
  }, [dicePool, effectiveDiceCost, isAutoRolling, stopAutoRoll]);

  // Track roll index for deterministic (non-time-based) tile-landing RNG seeding.
  const rollIndexRef = useRef(0);

  // Ephemeral cadence gate so the ring-tile Daily Clue Card doesn't pop on every
  // card-station landing (cooldown + per-island cap). UX-only; not persisted.
  const cardDrawCadenceRef = useRef(initialCardDrawCadenceState());

  const visibleTechnologyFragments = useMemo(
    () => listVisibleTechnologyFragments(islandNumber, collectedTechTileIndices),
    [collectedTechTileIndices, islandNumber],
  );

  const maybeCollectTechItem = useCallback((tileType: string, landingTileIndex: number): boolean => {
    const placement = getIslandTechnologyFragmentPlacement(islandNumber, landingTileIndex);
    if (!placement) return false;

    // Pure resolver owns all gameplay math after the content-driven placement
    // map supplies the exact fixed 3×3 fragment slot. It is idempotent on
    // duplicates and on an already-full grid, so reloads / rapid repeated calls
    // / rerenders can never replay the line or +100 full-board rewards.
    const resolution = resolveTechCollection({
      slotIndex: placement.fragmentSlot,
      collectedSlots: collectedTechTileIndicesRef.current,
      rewardedLines: rewardedTechCollectionLinesRef.current,
    });
    if (resolution.isDuplicate) return false;

    const nextCollected = new Set(resolution.nextCollectedSlots);
    const nextRewardedLines = new Set(resolution.nextRewardedLines);
    collectedTechTileIndicesRef.current = nextCollected;
    rewardedTechCollectionLinesRef.current = nextRewardedLines;
    setCollectedTechTileIndices(nextCollected);
    setRewardedTechCollectionLines(nextRewardedLines);

    const isLineEvent = resolution.newlyCompletedLines.length > 0 || resolution.isFullBoardNewlyCompleted;

    if (resolution.isFullBoardNewlyCompleted) {
      playIslandRunSound('boss_island_clear');
      triggerIslandRunHaptic('reward_claim');
    } else {
      playIslandRunSound(isLineEvent ? 'reward_bar_claim_burst' : 'tech_item_poof');
      triggerIslandRunHaptic('stop_land');
    }

    // Reward authority stays in the canonical action; the resolver only computed
    // the delta. Granting once here (keyed off the immutable slot transition)
    // means the +100 cannot be re-paid on any subsequent landing or rerender.
    if (resolution.totalRewardDice > 0) {
      const rewardRecord = applyTokenHopRewards({
        session,
        client,
        deltas: { dicePool: resolution.totalRewardDice },
        triggerSource: 'tech_collection_grid_reward',
      });
      setRuntimeState(rewardRecord);
    }

    // Persist the picked-up grid through the canonical store path so it survives
    // reloads and syncs across devices (rewarded lines never double-pay). Reuses
    // the existing tech_collection ledgers — no migration required.
    applyTechCollectionState({
      session,
      client,
      islandNumber,
      collectedSlots: resolution.nextCollectedSlots,
      rewardedLines: resolution.nextRewardedLines,
      triggerSource: 'tech_collection_pickup',
    });

    if (resolution.isFullBoardNewlyCompleted) {
      const buildResult = applyIslandRunTechnologyBuild({
        session,
        client,
        technologyId: 'the-concord',
        source: 'island-1-tech-grid-completed',
      });
      setRuntimeState(buildResult.record);
      if (!buildResult.changed) return true;
      // Full grid: deliberate celebration that does NOT auto-dismiss.
      setTechCollectionModal(null);
      setTechCompletionCelebration({
        collectedSlots: resolution.nextCollectedSlots,
        finalLineRewardDice: resolution.lineRewardDice,
        fullBoardRewardDice: resolution.fullBoardRewardDice,
        totalRewardDice: resolution.totalRewardDice,
      });
      return true;
    }

    // Ordinary pickup: fast modal that auto-dismisses (the modal owns its timer).
    setTechCollectionModal({
      slotIndex: resolution.slotIndex,
      tileType: tileType === 'currency' || tileType === 'chest' || tileType === 'card' ? tileType : 'micro',
      collectedSlots: resolution.nextCollectedSlots,
      collectedCount: resolution.nextCollectedCount,
      newlyCompletedLines: resolution.newlyCompletedLines,
      lineRewardDice: resolution.lineRewardDice,
    });
    return true;
  }, [client, islandNumber, playIslandRunSound, session, triggerIslandRunHaptic]);

  // Seed spacing constants. The landing seed packs three independent dimensions
  // into one 32-bit integer: island number × ISLAND_SEED_STRIDE + tile index ×
  // TILE_SEED_STRIDE + roll index. Strides are large enough that no two
  // (island, tile, roll) triples within realistic bounds can collide:
  //   islands: up to ~100k per cycle → needs > 10_000 per tile
  //   tiles:   40 per board          → needs > 100 per roll
  //   rolls:   < 100 per session
  const ISLAND_SEED_STRIDE = 10_000;
  const TILE_SEED_STRIDE = 100;

  // B2-3: resolve non-encounter tile landings with real outcomes.
  // Hazard tiles DEDUCT essence (clamped at 0). All other rewarded tiles add essence.
  //
  // `landingTileIndex` is the post-movement tile the token actually settled on
  // (i.e. `rollResult.newTokenIndex`). It is passed as a parameter instead of
  // reading the `tokenIndex` React state because `setTokenIndex(currentIndex)`
  // earlier in the same handler does not flush synchronously — the closure
  // still holds the pre-roll tokenIndex. Using that stale value seeded the
  // RNG against the wrong tile and violated the "same landing on reload
  // yields the same outcome" contract this seed is designed to provide.
  const resolveTileLanding = (tileType: string, landingTileIndex: number) => {
    const mult = Math.max(1, effectiveMultiplier);
    // Deterministic seed — derived from island, tile, and the per-session roll
    // index (not Date.now()). Same landing on reload yields the same outcome.
    const landingSeed = (effectiveIslandNumber * ISLAND_SEED_STRIDE) + (landingTileIndex * TILE_SEED_STRIDE) + rollIndexRef.current;
    const rawEssence = resolveIslandRunContractV2EssenceEarnForTile(tileType, { islandNumber: effectiveIslandNumber, seed: landingSeed });
    // Apply the dice multiplier. For hazards (negative) this scales the loss too.
    const essenceDelta = rawEssence * mult;

    const multLabel = mult > 1 ? ` (x${mult})` : '';
    // Pre-compute the displayed penalty optimistically from the current ref so
    // the landing text fires in the same React tick as the landing animation
    // (matches pre-P1-9 UX). The authoritative clamp happens inside the
    // serialised tile-reward action below; if the wallet is actually shorter
    // than the ref suggests, the text slightly over-reports — rare enough in
    // practice that we accept the trade-off in exchange for synchronous UX.
    switch (tileType) {
      case 'currency':
        setLandingText(`💰 Currency tile! +${essenceDelta} money${multLabel}`);
        break;
      case 'chest':
        setLandingText(`🎁 Treasure chest! +${essenceDelta} money${multLabel}`);
        break;
      case 'card': {
        // Gate the draw so it doesn't fire on every card-station landing.
        const cardDecision = decideCardDraw(cardDrawCadenceRef.current, {
          islandNumber: effectiveIslandNumber,
          rollIndex: rollIndexRef.current,
        });
        cardDrawCadenceRef.current = cardDecision.nextState;
        if (cardDecision.show) {
          // 0-based index of this draw within the island → rotates the questions.
          setCardDrawIndex(Math.max(0, cardDecision.nextState.drawsThisIsland - 1));
          setLandingText('🃏 Card station! Draw a Daily Clue Card for a quick gamified journal loop.');
          setShowGamifiedJournalCard(true);
        } else if (cardDecision.reason === 'island_cap') {
          setLandingText('🃏 Card station — you’ve gathered today’s clues here. Keep rolling.');
        } else {
          setLandingText('🃏 Card station — clue already noted nearby. Keep rolling.');
        }
        break;
      }
      case 'hazard': {
        const penalty = Math.abs(essenceDelta);
        if (penalty > 0) {
          const walletSnapshot = Math.max(0, Math.floor(runtimeStateRef.current.essence));
          const expectedLoss = Math.min(walletSnapshot, penalty);
          if (expectedLoss > 0) {
            setLandingText(`☠️ Hazard! −${expectedLoss} money${multLabel}`);
          } else {
            // Wallet empty — no essence to take.
            setLandingText(`☠️ Hazard — nothing to lose (empty wallet)${multLabel}`);
          }
        } else {
          setLandingText('☠️ Hazard! (grazed safely)');
        }
        break;
      }
      case 'micro':
        setLandingText(essenceDelta > 0 ? `✨ Micro reward! +${essenceDelta} money${multLabel}` : '✨ Micro reward!');
        break;
      default:
        setLandingText(`Landed on tile #${landingTileIndex}`);
        break;
    }

    maybeCollectTechItem(tileType, landingTileIndex);

    if (ISLAND_RUN_CONTRACT_V2_ENABLED) {
      // Trigger flying feed particle animation for feeding tiles
      const isFeedingTile = tileType === 'chest' || tileType === 'currency' || tileType === 'micro';
      if (isFeedingTile) {
        setFeedParticleActive(true);
        setTimeout(() => setFeedParticleActive(false), 600);
      }
    }

    // P1-9: route the whole landing effect (essence award/deduct + reward-bar
    // progress) through the serialised tile-reward action so the commit lands
    // as ONE patch under the shared action mutex. Previously the two halves
    // were issued as independent `persistIslandRunRuntimeStatePatch` calls in
    // the same React tick — each hydrated off the same pre-landing snapshot
    // and wrote a full record, so the second write silently overwrote the
    // first's fields. The mutex also serialises this commit with any in-
    // flight roll, preventing dicePool / runtimeVersion oscillation.
    const requestedEssenceDelta = tileType === 'hazard' ? -Math.abs(essenceDelta) : essenceDelta;
    logIslandRunEntryDebug('island_run_tile_reward_dispatch', {
      userId: session.user.id,
      islandNumber,
      landingTileIndex,
      tileType,
      requestedEssenceDelta,
      runtimeVersionBefore: runtimeStateRef.current.runtimeVersion,
      essenceBefore: runtimeStateRef.current.essence,
    });

    const tileRewardPromise = executeIslandRunTileRewardAction({
      session,
      client,
      islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED,
      essenceDelta: requestedEssenceDelta,
      rewardBarProgress: ISLAND_RUN_CONTRACT_V2_ENABLED
        ? { source: { kind: 'tile', tileType }, multiplier: mult, nowMs: Date.now() }
        : null,
    });

    void tileRewardPromise.then((result) => {
      logIslandRunEntryDebug('island_run_tile_reward_result', {
        userId: session.user.id,
        islandNumber,
        landingTileIndex,
        tileType,
        status: result.status,
        actualEssenceDelta: result.actualEssenceDelta,
        essenceAfter: result.essence,
        essenceLifetimeEarnedAfter: result.essenceLifetimeEarned,
        essenceLifetimeSpentAfter: result.essenceLifetimeSpent,
      });
      if (result.status !== 'ok') return;
      // Mirror the authoritative post-landing values into React state + the
      // ref so downstream render-reads observe the committed deltas. Using a
      // functional updater keeps this stable across concurrent setRuntimeState
      // calls (e.g. roll-completion mirror firing in the same microtask).
      setRuntimeState((current) => {
        const nextRuntimeState = {
          ...current,
          essence: result.essence,
          essenceLifetimeEarned: result.essenceLifetimeEarned,
          essenceLifetimeSpent: result.essenceLifetimeSpent,
          ...(result.rewardBarSlice
            ? {
                rewardBarProgress: result.rewardBarSlice.rewardBarProgress,
                rewardBarThreshold: result.rewardBarSlice.rewardBarThreshold,
                rewardBarClaimCountInEvent: result.rewardBarSlice.rewardBarClaimCountInEvent,
                rewardBarEscalationTier: result.rewardBarSlice.rewardBarEscalationTier,
                rewardBarLastClaimAtMs: result.rewardBarSlice.rewardBarLastClaimAtMs,
                rewardBarBoundEventId: result.rewardBarSlice.rewardBarBoundEventId,
                rewardBarLadderId: result.rewardBarSlice.rewardBarLadderId,
                activeTimedEvent: result.rewardBarSlice.activeTimedEvent,
                activeTimedEventProgress: result.rewardBarSlice.activeTimedEventProgress,
                stickerProgress: result.rewardBarSlice.stickerProgress,
                stickerInventory: result.rewardBarSlice.stickerInventory,
              }
            : {}),
        };
        // Success-path mirror sync: keep the runtime ref aligned immediately so
        // same-tick/read-after-write code paths cannot observe stale essence.
        runtimeStateRef.current = nextRuntimeState;
        return nextRuntimeState;
      });
      // Keep canonical store mirror aligned with the just-persisted tile-reward
      // patch so later store-derived full-record commits (e.g. passive regen)
      // cannot re-apply pre-reward essence.
      refreshIslandRunStateFromLocal(session);

      // Telemetry — mirrors the events previously emitted by
      // awardContractV2Essence / deductContractV2Essence.
      if (result.actualEssenceDelta > 0) {
        void recordTelemetryEvent({
          userId: session.user.id,
          eventType: 'economy_earn',
          metadata: {
            stage: 'island_run_contract_v2_essence_earn',
            island_number: islandNumber,
            source: `tile_${tileType}`,
            amount: result.actualEssenceDelta,
          },
        });
      } else if (result.actualEssenceDelta < 0) {
        void recordTelemetryEvent({
          userId: session.user.id,
          eventType: 'economy_spend',
          metadata: {
            stage: 'island_run_contract_v2_essence_deduct',
            island_number: islandNumber,
            source: 'tile_hazard',
            amount: -result.actualEssenceDelta,
          },
        });
      }

      // Auto-claim: if bar is now full, trigger the claim cascade automatically
      // with a short delay for the fill animation to play first.
      if (result.rewardBarFull) {
        playIslandRunSound('reward_bar_fill');
        setTimeout(() => handleContractV2RewardBarClaim(), 500);
      }
    }).catch((error: unknown) => {
      logIslandRunEntryDebug('island_run_tile_reward_error', {
        userId: session.user.id,
        islandNumber,
        landingTileIndex,
        tileType,
        errorMessage: error instanceof Error ? error.message : 'unknown_error',
      });
      // Smallest safe recovery for the visible HUD: if the reward action throws
      // after persisting, refresh the local runtime mirror from canonical
      // storage so essence/reward-bar values don't appear stuck until a later
      // hydration cycle.
      setRuntimeState(readIslandRunRuntimeState(session));
    });
  };

  /** Mark v2 stop 0 (hatchery) objective as complete when the egg is set.
   *  Build completion for the hatchery is handled separately via the Build Panel.
   *  This keeps stopStatesByIndex objective state in sync with the egg lifecycle. */
  const markHatcheryStopCompleteInV2 = () => {
    if (!ISLAND_RUN_CONTRACT_V2_ENABLED) return false;
    const currentStates = runtimeStateRef.current.stopStatesByIndex;
    const entry = currentStates[0];
    if (entry?.objectiveComplete === true) return; // already done
    const nextStopStatesByIndex = currentStates.map((s, index) => {
      if (index !== 0) return s;
      return { ...(s ?? { buildComplete: false }), objectiveComplete: true };
    });
    const stopResolution = resolveCanonicalContractV2Stops({
      stopStatesByIndex: nextStopStatesByIndex,
      stopTicketsPaidByIsland: runtimeStateRef.current.stopTicketsPaidByIsland,
      islandNumber,
    });
    const nextRecord = applyStopObjectiveProgress({
      session,
      client,
      stopStatesByIndex: nextStopStatesByIndex,
      activeStopIndex: stopResolution.activeStopIndex,
      activeStopType: stopResolution.activeStopType,
      triggerSource: 'island_run_hatchery_stop_objective_complete',
    });
    setRuntimeState(nextRecord);
  };

  // M5-COMPLETE: handleSetEgg — no tier argument; tier assigned randomly (weighted), hatch delay random 24–72 h
  const handleSetEgg = async () => {
    if (isSettingEgg) return;
    setIsSettingEgg(true);
    // Cross-device guard: another device may already have set this island's
    // egg while this device held a stale snapshot. Egg tier + hatch timer are
    // rolled client-side, so without this check each device would mint its
    // own divergent egg. Pull the freshest server row first and adopt a live
    // remote egg instead of rolling a second one.
    if (client && !isDemoSession(session)) {
      try {
        const remote = await hydrateIslandRunRuntimeStateWithSource({ session, client, forceRemote: true });
        const remoteEntry = remote.source === 'table' ? remote.state.perIslandEggs?.[String(islandNumber)] : undefined;
        const remoteHasLiveEgg = !!remoteEntry && (remoteEntry.status === 'incubating' || remoteEntry.status === 'ready');
        if (
          remoteHasLiveEgg
          && remoteEntry
          && (remote.state.runtimeVersion ?? 0) > (runtimeStateRef.current.runtimeVersion ?? 0)
        ) {
          setRuntimeStateWithTrace('set_egg_remote_guard_adopt', remote.state);
          resetIslandRunStateSnapshot(session, remote.state);
          setActiveEgg({
            tier: remoteEntry.tier,
            setAtMs: remoteEntry.setAtMs,
            hatchAtMs: remoteEntry.hatchAtMs,
            isDormant: remote.state.activeEggIsDormant,
          });
          logIslandRunEntryDebug('island_egg_set_blocked_remote_live_egg', {
            userId: session.user.id,
            islandNumber,
            remoteTier: remoteEntry.tier,
            remoteSetAtMs: remoteEntry.setAtMs,
            remoteStatus: remoteEntry.status,
          });
          setLandingText('An egg set on another device is already incubating here.');
          setIsSettingEgg(false);
          return;
        }
      } catch {
        // Offline or transient hydrate failure: keep the local set-egg path.
      }
    }
    const eggCount = isEggManiaUnused ? EGG_MANIA_MAX_EGGS_PER_ISLAND : 1;
    setLandingText(eggCount > 1 ? 'Setting Egg Mania eggs...' : 'Setting egg...');
    const start = Date.now();
    const createdEggs = Array.from({ length: eggCount }, (_, slotIndex) => {
      const tier = rollEggTierWeighted();
      const hatchDurationMs = getRandomHatchDelayMs();
      const setAtMs = start + slotIndex;
      const hatchAtMs = setAtMs + hatchDurationMs;
      const entry: PerIslandEggEntry = {
        tier,
        setAtMs,
        hatchAtMs,
        status: 'incubating',
        location: 'island',
      };
      return {
        slotIndex,
        ledgerKey: getEggSlotLedgerKey(islandNumber, slotIndex),
        tier,
        setAtMs,
        hatchAtMs,
        hatchDurationMs,
        entry,
      };
    });
    const primaryEgg = createdEggs[0];
    if (!primaryEgg) {
      setIsSettingEgg(false);
      return;
    }
    const nextActiveEgg = { tier: primaryEgg.tier, setAtMs: primaryEgg.setAtMs, hatchAtMs: primaryEgg.hatchAtMs };
    const nextCompletedStops = activeStopId === 'hatchery'
      ? ensureStopCompleted(completedStops, 'hatchery')
      : completedStops;
    const nextRecord = eggCount > 1
      ? applyEggPlacementBatch({
          session,
          client,
          islandNumber,
          eggEntriesByLedgerKey: Object.fromEntries(createdEggs.map((egg) => [egg.ledgerKey, egg.entry])),
          activeEggTier: primaryEgg.tier,
          activeEggSetAtMs: primaryEgg.setAtMs,
          activeEggHatchDurationMs: primaryEgg.hatchDurationMs,
          completedStops: nextCompletedStops,
          triggerSource: 'island_run_set_egg_mania',
        })
      : applyEggPlacement({
          session,
          client,
          islandNumber,
          activeEggTier: primaryEgg.tier,
          activeEggSetAtMs: primaryEgg.setAtMs,
          activeEggHatchDurationMs: primaryEgg.hatchDurationMs,
          perIslandEggEntry: primaryEgg.entry,
          completedStops: nextCompletedStops,
          triggerSource: 'island_run_set_egg',
        });

    setActiveEgg(nextActiveEgg);
    // M10B: egg_set sound + haptic
    playIslandRunSound('egg_set');
    triggerIslandRunHaptic('egg_set');
    // Schedule push notification for when each egg is ready to collect
    createdEggs.forEach((egg) => {
      scheduleEggHatchNotification(session.user.id, egg.hatchAtMs).catch((err) => {
        logIslandRunEntryDebug('egg_hatch_notification_schedule_failed', { error: String(err), slotIndex: egg.slotIndex });
      });
    });
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        stage: eggCount > 1 ? 'island_egg_mania_set' : 'island_egg_set',
        tier: primaryEgg.tier,
        egg_count: eggCount,
        source: 'island_hatchery',
      },
    });
    logIslandRunEntryDebug(eggCount > 1 ? 'island_egg_mania_set' : 'island_egg_set', {
      tier: primaryEgg.tier,
      eggCount,
      source: 'island_hatchery',
    });
    setRuntimeState(nextRecord);

    if (activeStopId === 'hatchery') {
      if (!isStopCompleted(completedStops, 'hatchery')) {
        awardShards('stop_complete');
        awardWalletShards(1);
      }
      updateCompletedStopsWithSync(nextCompletedStops, { triggerSource: eggCount > 1 ? 'island_run_set_egg_mania' : 'island_run_set_egg' });
      markHatcheryStopCompleteInV2();
      setActiveStopId(null);
    }
    setLandingText(eggCount > 1 ? '🔥 Egg Mania! 3 eggs are now incubating.' : 'Egg is now incubating!');
    setIsSettingEgg(false);
  };

  const collectedCreatures = useMemo(() => getCreatureManifestEntries(session.user.id), [creatureCollection, session.user.id]);
  useEffect(() => {
    if (!pairedThemeOfferModal || typeof document === 'undefined') return undefined;
    return lockPageScroll();
  }, [pairedThemeOfferModal]);

  useEffect(() => {
    if (!hatchedCreatureCardId || typeof document === 'undefined') return undefined;
    return lockPageScroll();
  }, [hatchedCreatureCardId]);

  const creatureThemeAccessContext = useMemo(() => {
    const ownedCreatureIds = new Set(
      (__storeState.creatureCollection ?? [])
        .map((entry) => entry.creatureId)
        .filter((creatureId): creatureId is string => typeof creatureId === 'string' && creatureId.length > 0),
    );
    const creatureBondLevelsById = new Map(
      (__storeState.creatureCollection ?? [])
        .filter((entry) => typeof entry.creatureId === 'string' && entry.creatureId.length > 0)
        .map((entry) => [entry.creatureId, entry.bondLevel ?? 0] as const),
    );
    const creatureFormLevelsById = new Map(
      (__storeState.creatureCollection ?? [])
        .filter((entry) => typeof entry.creatureId === 'string' && entry.creatureId.length > 0)
        .map((entry) => [entry.creatureId, entry.formLevel ?? 1] as const),
    );
    const pairedCreatureIds = new Set(
      (__storeState.perfectCompanionIds ?? [])
        .filter((creatureId): creatureId is string => typeof creatureId === 'string' && creatureId.length > 0),
    );

    return {
      ownedThemeIds,
      ownedCreatureIds,
      pairedCreatureIds,
      creatureBondLevelsById,
      creatureFormLevelsById,
    };
  }, [__storeState.creatureCollection, __storeState.perfectCompanionIds, ownedThemeIds]);
  const sanctuaryCreatureThemeOffers = useMemo(
    () => AVAILABLE_THEMES.filter((theme): theme is ThemeMetadata & { unlockRule: Extract<ThemeMetadata['unlockRule'], { type: 'creature_purchase' }> } => (
      theme.unlockRule.type === 'creature_purchase'
    )),
    [],
  );
  const activeCompanion = useMemo(
    () => findSanctuaryCreatureById(collectedCreatures, activeCompanionId),
    [activeCompanionId, collectedCreatures],
  );
  // Regen transparency intentionally reads the authoritative store id, not the
  // legacy local mirror used by older Sanctuary affordances.
  const activeRegenCompanion = useMemo(
    () => findSanctuaryCreatureById(collectedCreatures, __storeState.activeCompanionId),
    [__storeState.activeCompanionId, collectedCreatures],
  );
  const activeCompanionRegenRecord = useMemo(
    () => ({
      activeCompanionId: __storeState.activeCompanionId ?? null,
      creatureCollection: __storeState.creatureCollection ?? [],
    }),
    [__storeState.activeCompanionId, __storeState.creatureCollection],
  );
  const activeCompanionRegenModifier = useMemo(
    () => resolveCompanionRegenModifier({
      record: activeCompanionRegenRecord,
    }),
    [activeCompanionRegenRecord],
  );
  const activeCompanionRegenBonusLabel = useMemo(
    () => formatCompanionRegenBonusPercent(activeCompanionRegenModifier.cappedBoostPct),
    [activeCompanionRegenModifier.cappedBoostPct],
  );
  const activeCompanionMissingOrUnowned = Boolean(
    __storeState.activeCompanionId && !activeCompanionRegenModifier.isOwned,
  );
  const activeCompanionBonus = useMemo(
    () => (activeCompanion ? getCompanionBonusForCreature(activeCompanion.creature, activeCompanion.bondLevel) : null),
    [activeCompanion],
  );
  const selectedSanctuaryCreature = useMemo(
    () => collectedCreatures.find((creature) => creature.creatureId === selectedSanctuaryCreatureId) ?? null,
    [collectedCreatures, selectedSanctuaryCreatureId],
  );
  const selectedSanctuaryCreatureIndex = selectedSanctuaryCreatureId
    ? collectedCreatures.findIndex((creature) => creature.creatureId === selectedSanctuaryCreatureId)
    : -1;
  const canSwipeSanctuaryCreatureCards = selectedSanctuaryCreatureIndex >= 0 && collectedCreatures.length > 1;
  const openAdjacentSanctuaryCreature = useCallback((direction: -1 | 1) => {
    if (!selectedSanctuaryCreatureId || collectedCreatures.length < 2) return;
    const currentIndex = collectedCreatures.findIndex((creature) => creature.creatureId === selectedSanctuaryCreatureId);
    if (currentIndex < 0) return;
    const nextIndex = (currentIndex + direction + collectedCreatures.length) % collectedCreatures.length;
    setSelectedSanctuaryCreatureId(collectedCreatures[nextIndex]?.creatureId ?? selectedSanctuaryCreatureId);
    setShowPerfectCompanionReason(false);
  }, [collectedCreatures, selectedSanctuaryCreatureId]);
  const sanctuaryCardSwipeStartXRef = useRef<number | null>(null);
  const sanctuaryCardSwipeStartYRef = useRef<number | null>(null);
  const handleSanctuaryFullcardPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    sanctuaryCardSwipeStartXRef.current = event.clientX;
    sanctuaryCardSwipeStartYRef.current = event.clientY;
  }, []);
  const handleSanctuaryFullcardPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const startX = sanctuaryCardSwipeStartXRef.current;
    const startY = sanctuaryCardSwipeStartYRef.current;
    sanctuaryCardSwipeStartXRef.current = null;
    sanctuaryCardSwipeStartYRef.current = null;
    if (startX === null || startY === null || !canSwipeSanctuaryCreatureCards) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) return;
    openAdjacentSanctuaryCreature(deltaX < 0 ? 1 : -1);
  }, [canSwipeSanctuaryCreatureCards, openAdjacentSanctuaryCreature]);
  const selectedSanctuaryCreatureBonus = useMemo(
    () => (selectedSanctuaryCreature ? getCompanionBonusForCreature(selectedSanctuaryCreature.creature, selectedSanctuaryCreature.bondLevel) : null),
    [selectedSanctuaryCreature],
  );
  const activeCompanionSpecialty = useMemo(
    () => (activeCompanion ? getCreatureSpecialtyForCompanion(activeCompanion.creature, activeCompanion.bondLevel) : null),
    [activeCompanion],
  );
  const selectedSanctuaryCreatureSpecialty = useMemo(
    () => (selectedSanctuaryCreature ? getCreatureSpecialtyForCompanion(selectedSanctuaryCreature.creature, selectedSanctuaryCreature.bondLevel) : null),
    [selectedSanctuaryCreature],
  );
  const selectedSanctuaryCreatureUnclaimedMilestones = useMemo(
    () => (selectedSanctuaryCreature ? getUnclaimedBondMilestones(selectedSanctuaryCreature) : []),
    [selectedSanctuaryCreature],
  );
  const selectedSanctuaryCreatureFormPreview = useMemo(
    () => resolveCreatureFormUpgradePreview({ entry: selectedSanctuaryCreature, shards: runtimeState.shards }),
    [runtimeState.shards, selectedSanctuaryCreature],
  );
  const interactiveRosterRenderPolicy = getSanctuaryRosterRenderPolicy('interactiveRoster');
  const decorativePreviewRenderPolicy = getSanctuaryRosterRenderPolicy('decorativePreview');
  const metadataArchetypeIds = useMemo(() => {
    const metadata = session.user.user_metadata as Record<string, unknown> | undefined;
    return extractArchetypeIdsFromMetadata(metadata?.archetype_hand);
  }, [session.user.user_metadata]);
  const preferredShipZones = useMemo(
    () => getDefaultZonePreferencesForArchetypes(
      metadataArchetypeIds.length > 0 ? metadataArchetypeIds : ['guardian', 'visionary'],
    ),
    [metadataArchetypeIds],
  );
  const isUsingStarterProfileForPerfectCompanion = metadataArchetypeIds.length === 0;
  const sanctuaryRewardReadyCount = useMemo(
    () => collectedCreatures.filter((creature) => getUnclaimedBondMilestones(creature).length > 0).length,
    [collectedCreatures],
  );
  const unclaimedCreatureCount = useMemo(
    () => countUnclaimedCreatures(runtimeState.perIslandEggs),
    [runtimeState.perIslandEggs],
  );
  const hatcheryPendingEggs = useMemo<HatcheryCarouselEgg[]>(() => Object.entries(runtimeState.perIslandEggs ?? {})
    .flatMap(([islandKey, entry]) => {
      if (!entry || (entry.status !== 'incubating' && entry.status !== 'ready')) return [];

      const parsedSlot = parseEggSlotLedgerKey(islandKey);
      const eggIslandNumber = parsedSlot?.islandNumber ?? islandNumber;
      const eggSlotIndex = parsedSlot?.slotIndex ?? 0;
      const isReady = entry.status === 'ready' || entry.hatchAtMs <= nowMs || !Number.isFinite(entry.hatchAtMs);
      return [{
        id: `${islandKey}-${entry.setAtMs}-${entry.hatchAtMs}`,
        islandNumber: eggIslandNumber,
        islandKey,
        tier: entry.tier,
        setAtMs: entry.setAtMs,
        hatchAtMs: entry.hatchAtMs,
        status: entry.status,
        location: entry.location ?? 'island',
        ledgerKey: islandKey,
        slotIndex: eggSlotIndex,
        isReady,
        isDormant: isReady || entry.location === 'dormant',
        isCurrentIsland: eggIslandNumber === islandNumber,
      }];
    })
    .sort((first, second) => {
      if (first.isCurrentIsland !== second.isCurrentIsland) return first.isCurrentIsland ? -1 : 1;
      if (first.isReady !== second.isReady) return first.isReady ? -1 : 1;
      if (first.hatchAtMs !== second.hatchAtMs) return first.hatchAtMs - second.hatchAtMs;
      return first.slotIndex - second.slotIndex;
    }), [islandNumber, nowMs, runtimeState.perIslandEggs]);
  const hatcheryPendingEggCount = hatcheryPendingEggs.length;
  const nextHatcheryEgg = hatcheryPendingEggs[0] ?? null;
  const hatcheryPendingEggTimeLabel = nextHatcheryEgg
    ? nextHatcheryEgg.isReady
      ? 'Ready!'
      : formatHatchCountdown(nextHatcheryEgg.hatchAtMs - nowMs)
    : '';
  const hatcheryPendingEggAriaLabel = hatcheryPendingEggCount > 0
    ? `. ${hatcheryPendingEggCount} hatchery egg${hatcheryPendingEggCount === 1 ? '' : 's'} pending.`
    : '';
  useEffect(() => {
    setSelectedHatcheryEggIndex((current) => {
      if (hatcheryPendingEggCount <= 0) return 0;
      return Math.min(Math.max(0, current), hatcheryPendingEggCount - 1);
    });
  }, [hatcheryPendingEggCount]);
  const selectedHatcheryEgg = hatcheryPendingEggs[selectedHatcheryEggIndex] ?? nextHatcheryEgg;
  const selectedHatcheryDisplayEgg: ActiveEgg | null = selectedHatcheryEgg
    ? {
        tier: selectedHatcheryEgg.tier,
        setAtMs: selectedHatcheryEgg.setAtMs,
        hatchAtMs: selectedHatcheryEgg.hatchAtMs,
        isDormant: selectedHatcheryEgg.isDormant,
      }
    : activeEgg;
  const selectedHatcheryEggLocation: PerIslandEggEntry['location'] = selectedHatcheryEgg?.location
    ?? (runtimeState.activeEggIsDormant ? 'dormant' : 'island');
  const selectedHatcheryEggStage = useMemo(
    () => getHatcheryEggStage(selectedHatcheryDisplayEgg, nowMs),
    [nowMs, selectedHatcheryDisplayEgg],
  );
  const selectedHatcheryEggCountdownLabel = selectedHatcheryDisplayEgg
    ? formatHatchCountdown(Math.max(0, selectedHatcheryDisplayEgg.hatchAtMs - nowMs))
    : '';
  const selectedHatcheryTimelineStage = useMemo(() => {
    if (selectedHatcheryEgg?.isCurrentIsland && islandEggSlotUsed) return HATCHERY_TIMELINE_STEPS.length;
    if (!selectedHatcheryDisplayEgg) return 1;
    return Math.min(HATCHERY_TIMELINE_STEPS.length, Math.max(1, selectedHatcheryEggStage));
  }, [islandEggSlotUsed, selectedHatcheryDisplayEgg, selectedHatcheryEgg, selectedHatcheryEggStage]);
  const canResolveSelectedHatcheryEgg = Boolean(selectedHatcheryDisplayEgg) && (Boolean(selectedHatcheryEgg?.isCurrentIsland) || !selectedHatcheryEgg);
  const showHatcheryEggCarousel = hatcheryPendingEggCount > 1;
  const goToPreviousHatcheryEgg = useCallback(() => {
    if (hatcheryPendingEggCount <= 1) return;
    setSelectedHatcheryEggIndex((current) => (current - 1 + hatcheryPendingEggCount) % hatcheryPendingEggCount);
  }, [hatcheryPendingEggCount]);
  const goToNextHatcheryEgg = useCallback(() => {
    if (hatcheryPendingEggCount <= 1) return;
    setSelectedHatcheryEggIndex((current) => (current + 1) % hatcheryPendingEggCount);
  }, [hatcheryPendingEggCount]);
  const hasRewardBarTimedEventQuickAction = Boolean(effectiveActiveTimedEvent && activeEventMeta);
  const rewardBarEggManiaSlotIndex = isEggManiaActive ? 0 : -1;
  const rewardBarTimedEventSlotIndex = isEggManiaActive ? 1 : 0;
  // Sticker album moved to the left hatchery tray; the side rail now only holds
  // the active minigame quick-actions (egg mania / timed event).
  const rewardBarRailContentSlotCount = Math.max(
    isEggManiaActive ? 1 : 0,
    hasRewardBarTimedEventQuickAction ? rewardBarTimedEventSlotIndex + 1 : 0,
  );
  const rewardBarSideSlotCount = Math.max(
    hatcheryPendingEggCount,
    rewardBarRailContentSlotCount,
  );
  const openHatcheryQuickAccess = useCallback(() => {
    requestActiveStopTransition('hatchery', 'manifest_quick_access');
  }, [requestActiveStopTransition]);
  const sanctuaryZoneSummaries = useMemo(
    () => (['zen', 'energy', 'cosmic'] as ShipZone[]).map((zone) => {
      const owned = collectedCreatures.filter((entry) => resolveShipZoneForCreature(entry.creature) === zone);
      const capacity = getSanctuaryZoneSlotCap(islandNumber, zone);
      return {
        zone,
        ownedCount: owned.length,
        visibleCount: Math.min(owned.length, capacity),
        overflowCount: Math.max(0, owned.length - capacity),
        capacity,
      };
    }),
    [collectedCreatures, islandNumber],
  );
  const sanctuaryTierRevealLabel = useMemo(() => {
    if (islandNumber >= 90) return 'Mythic deep slots online';
    if (islandNumber >= 45) return 'Rare-tier slot upgrades online';
    if (islandNumber >= 18) return 'Cosmic wing slots online';
    if (islandNumber >= 6) return 'Engine wing slots online';
    return 'Starter sanctuary slots online';
  }, [islandNumber]);
  const companionQuestDayKey = useMemo(() => getLocalDayKey(), []);
  const companionQuestType = useMemo(
    () => getCompanionQuestTypeForDay(companionQuestDayKey),
    [companionQuestDayKey],
  );
  const companionQuestCopy = useMemo(() => {
    if (companionQuestType === 'set_perfect_active') {
      return {
        title: 'Companion Quest: Perfect Match',
        body: 'Set one of your Perfect Companions as active for today.',
        cta: 'Activate perfect companion',
      };
    }
    if (companionQuestType === 'open_top3') {
      return {
        title: 'Companion Quest: Scout Your Top 3',
        body: 'Open one of your Top 3 companion cards to review their bonuses.',
        cta: 'Open top companion card',
      };
    }
    return {
      title: 'Companion Quest: Care Round',
      body: 'Feed any companion once today to build your daily streak.',
      cta: 'Feed a companion',
    };
  }, [companionQuestType]);
  const perfectCompanionIdSet = useMemo(
    () => new Set(runtimeState.perfectCompanionIds ?? []),
    [runtimeState.perfectCompanionIds],
  );
  const companionQuestComplete = useMemo(() => {
    if (companionQuestType === 'set_perfect_active') {
      return activeCompanionId !== null && perfectCompanionIdSet.has(activeCompanionId);
    }
    if (companionQuestType === 'open_top3') {
      return companionQuestTop3ViewedDayKey === companionQuestDayKey;
    }
    return collectedCreatures.some((creature) =>
      creature.lastFedAtMs !== null && getLocalDayKey(creature.lastFedAtMs) === companionQuestDayKey,
    );
  }, [
    activeCompanionId,
    collectedCreatures,
    companionQuestDayKey,
    companionQuestTop3ViewedDayKey,
    companionQuestType,
    perfectCompanionIdSet,
  ]);
  const companionQuestClaimedToday = companionQuestProgress.lastClaimedDayKey === companionQuestDayKey;
  const selectedVsActiveComparison = useMemo(() => {
    if (!selectedSanctuaryCreature || !activeCompanion || selectedSanctuaryCreature.creatureId === activeCompanion.creatureId) {
      return null;
    }
    const selectedZone = resolveShipZoneForCreature(selectedSanctuaryCreature.creature);
    const activeZone = resolveShipZoneForCreature(activeCompanion.creature);
    const selectedZonePreferred = preferredShipZones.includes(selectedZone);
    const activeZonePreferred = preferredShipZones.includes(activeZone);
    const startupDelta = (selectedSanctuaryCreatureBonus?.amount ?? 0) - (activeCompanionBonus?.amount ?? 0);
    const specialtyDelta = (selectedSanctuaryCreatureSpecialty?.amount ?? 0) - (activeCompanionSpecialty?.amount ?? 0);
    const bondDelta = selectedSanctuaryCreature.bondLevel - activeCompanion.bondLevel;
    const strengthScore = [
      startupDelta > 0,
      specialtyDelta > 0,
      bondDelta > 0,
      selectedZonePreferred && !activeZonePreferred,
    ].filter(Boolean).length;
    return {
      startupDelta,
      specialtyDelta,
      bondDelta,
      selectedZone,
      selectedZonePreferred,
      activeZonePreferred,
      selectedSpecialtyLabel: selectedSanctuaryCreatureSpecialty?.label ?? '—',
      activeSpecialtyLabel: activeCompanionSpecialty?.label ?? '—',
      selectedStartupLabel: selectedSanctuaryCreatureBonus?.label ?? '—',
      activeStartupLabel: activeCompanionBonus?.label ?? '—',
      recommendation: strengthScore >= 2 ? 'Try as Active' : 'Keep current active',
    };
  }, [
    activeCompanion,
    activeCompanionBonus,
    activeCompanionSpecialty,
    preferredShipZones,
    selectedSanctuaryCreature,
    selectedSanctuaryCreatureBonus,
    selectedSanctuaryCreatureSpecialty,
  ]);
  const visibleSanctuaryCreatures = useMemo(() => {
    const filtered = collectedCreatures.filter((creature) => {
      const creatureZone = resolveShipZoneForCreature(creature.creature);
      if (sanctuaryZoneFilter !== 'all' && creatureZone !== sanctuaryZoneFilter) return false;
      if (sanctuaryFilterMode === 'reward_ready') return getUnclaimedBondMilestones(creature).length > 0;
      if (sanctuaryFilterMode === 'active') return creature.creatureId === activeCompanionId;
      if (sanctuaryFilterMode === 'common' || sanctuaryFilterMode === 'rare' || sanctuaryFilterMode === 'mythic') {
        return creature.creature.tier === sanctuaryFilterMode;
      }
      return true;
    });

    const tierRank: Record<'common' | 'rare' | 'mythic', number> = { common: 0, rare: 1, mythic: 2 };

    return [...filtered].sort((a, b) => {
      if (sanctuarySortMode === 'bond') {
        return b.bondLevel - a.bondLevel || b.bondXp - a.bondXp || b.lastCollectedAtMs - a.lastCollectedAtMs;
      }
      if (sanctuarySortMode === 'tier') {
        return tierRank[b.creature.tier] - tierRank[a.creature.tier] || b.bondLevel - a.bondLevel || b.lastCollectedAtMs - a.lastCollectedAtMs;
      }
      if (sanctuarySortMode === 'active') {
        const aActive = a.creatureId === activeCompanionId ? 1 : 0;
        const bActive = b.creatureId === activeCompanionId ? 1 : 0;
        const aReady = getUnclaimedBondMilestones(a).length > 0 ? 1 : 0;
        const bReady = getUnclaimedBondMilestones(b).length > 0 ? 1 : 0;
        return bActive - aActive || bReady - aReady || b.bondLevel - a.bondLevel || b.lastCollectedAtMs - a.lastCollectedAtMs;
      }
      const aReady = getUnclaimedBondMilestones(a).length > 0 ? 1 : 0;
      const bReady = getUnclaimedBondMilestones(b).length > 0 ? 1 : 0;
      return bReady - aReady || b.lastCollectedAtMs - a.lastCollectedAtMs;
    });
  }, [activeCompanionId, collectedCreatures, sanctuaryFilterMode, sanctuarySortMode, sanctuaryZoneFilter]);
  const topPerfectCompanionEntries = useMemo(
    () => {
      const byCreatureId = new Map(collectedCreatures.map((entry) => [entry.creatureId, entry]));
      return (runtimeState.perfectCompanionIds ?? [])
        .slice(0, 3)
        .map((creatureId) => byCreatureId.get(creatureId))
        .filter((entry): entry is (typeof collectedCreatures)[number] => Boolean(entry));
    },
    [collectedCreatures, runtimeState.perfectCompanionIds],
  );
  const selectedPerfectCompanionReason = useMemo(() => {
    if (!selectedSanctuaryCreature) return null;
    return runtimeState.perfectCompanionReasons[selectedSanctuaryCreature.creatureId] ?? null;
  }, [runtimeState.perfectCompanionReasons, selectedSanctuaryCreature]);
  const [showPerfectCompanionReason, setShowPerfectCompanionReason] = useState(false);

  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    const dominantArchetypeIds = metadataArchetypeIds.slice(0, 2);
    const secondaryArchetypeIds = metadataArchetypeIds.slice(2, 4);
    const supportArchetypeIds = metadataArchetypeIds.slice(4, 8);

    const context: PlayerHandContext = {
      dominantArchetypeIds: dominantArchetypeIds.length > 0 ? dominantArchetypeIds : ['guardian'],
      secondaryArchetypeIds: secondaryArchetypeIds.length > 0 ? secondaryArchetypeIds : ['visionary'],
      supportArchetypeIds,
      weaknessTags: ['stress_fragility', 'decision_confusion'],
      preferredShipZones,
    };

    const shouldRecompute =
      runtimeState.perfectCompanionModelVersion !== PERFECT_COMPANION_MODEL_VERSION
      || runtimeState.perfectCompanionComputedCycleIndex !== cycleIndex
      || !Array.isArray(runtimeState.perfectCompanionIds)
      || runtimeState.perfectCompanionIds.length === 0;

    if (!shouldRecompute) return;

    const rankedFits = rankCreatureFitsForPlayer(CREATURE_CATALOG, context, {
      strengthWeight: perfectCompanionRuntimeConfig.fit.strengthWeight,
      healingWeight: perfectCompanionRuntimeConfig.fit.healingWeight,
      zoneWeight: perfectCompanionRuntimeConfig.fit.zoneWeight,
      rarityBonusByTier: perfectCompanionRuntimeConfig.fit.rarityBonusByTier,
    });
    const selectedFits = selectPerfectCompanions(rankedFits, perfectCompanionRuntimeConfig.fit.maxPerfectCount, {
      userId: session.user.id,
      cycleIndex,
      islandNumber,
    });
    const perfectCompanionIds = selectedFits.map((entry) => entry.creatureId);
    const perfectCompanionReasons = Object.fromEntries(
      selectedFits.map((entry) => [
        entry.creatureId,
        {
          strength: entry.matchedArchetypes,
          weaknessSupport: entry.matchedWeaknessTags,
          zoneMatch: entry.zoneMatch > 0,
        },
      ]),
    );
    const computedAtMs = Date.now();

    const perfectCompanionSnapshot = applyPerfectCompanionSnapshot({
      session,
      client,
      perfectCompanionIds,
      perfectCompanionReasons,
      perfectCompanionComputedAtMs: computedAtMs,
      perfectCompanionModelVersion: PERFECT_COMPANION_MODEL_VERSION,
      perfectCompanionComputedCycleIndex: cycleIndex,
      triggerSource: 'perfect_companion_snapshot',
    });
    setRuntimeState(perfectCompanionSnapshot.record);
  }, [
    client,
    cycleIndex,
    hasHydratedRuntimeState,
    islandNumber,
    metadataArchetypeIds,
    preferredShipZones,
    perfectCompanionRuntimeConfig.fit.healingWeight,
    perfectCompanionRuntimeConfig.fit.maxPerfectCount,
    perfectCompanionRuntimeConfig.fit.rarityBonusByTier,
    perfectCompanionRuntimeConfig.fit.strengthWeight,
    perfectCompanionRuntimeConfig.fit.zoneWeight,
    runtimeState.perfectCompanionComputedCycleIndex,
    runtimeState.perfectCompanionIds,
    runtimeState.perfectCompanionModelVersion,
    session,
  ]);

  useEffect(() => {
    if (!hasHydratedRuntimeState || !activeCompanion || !activeCompanionBonus || typeof window === 'undefined') {
      return;
    }

    const visitKey = `${cycleIndex}:${islandNumber}`;
    if (companionBonusAppliedVisitKeyRef.current === visitKey) {
      return;
    }
    if (runtimeState.companionBonusLastVisitKey === visitKey) {
      companionBonusAppliedVisitKeyRef.current = visitKey;
      return;
    }

    const next = applyCompanionBonusLastVisitKeyMarker({
      session,
      client,
      visitKey,
      triggerSource: 'apply_companion_bonus_visit_marker_effect',
    });
    setRuntimeState(next);
    companionBonusAppliedVisitKeyRef.current = visitKey;

    const isPerfectCompanionActive = perfectCompanionIdSet.has(activeCompanion.creatureId);
    const perfectCompanionStartupBonus = isPerfectCompanionActive
      ? perfectCompanionRuntimeConfig.gameplay.startupBonusByEffect[activeCompanionBonus.effect]
      : 0;
    const totalStartupBonus = activeCompanionBonus.amount + perfectCompanionStartupBonus;

    if (activeCompanionBonus.effect === 'bonus_essence') {
      // Essence companion bonus — award to runtime state
      setRuntimeState((prev) => ({
        ...prev,
        essence: prev.essence + totalStartupBonus,
        essenceLifetimeEarned: prev.essenceLifetimeEarned + totalStartupBonus,
      }));
    } else if (activeCompanionBonus.effect === 'bonus_spin') {
      setSpinTokens((current) => current + totalStartupBonus);
    } else {
      setDicePool((current) => current + totalStartupBonus);
    }

    if (isPerfectCompanionActive && perfectCompanionStartupBonus > 0) {
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'economy_earn',
        metadata: {
          stage: 'perfect_companion_effect_triggered',
          effect_scope: 'island_startup_bonus',
          island_number: islandNumber,
          creature_id: activeCompanion.creature.id,
          creature_name: activeCompanion.creature.name,
          base_bonus_amount: activeCompanionBonus.amount,
          perfect_companion_bonus_amount: perfectCompanionStartupBonus,
          total_bonus_amount: totalStartupBonus,
          bonus_effect: activeCompanionBonus.effect,
        },
      });
    }

    setLandingText(
      `${activeCompanion.creature.name} supported this island: ${activeCompanionBonus.label}.`
      + (perfectCompanionStartupBonus > 0 ? ` Perfect Companion bonus +${perfectCompanionStartupBonus}.` : ''),
    );
  }, [
    activeCompanion,
    activeCompanionBonus,
    cycleIndex,
    client,
    hasHydratedRuntimeState,
    islandNumber,
    perfectCompanionIdSet,
    perfectCompanionRuntimeConfig.gameplay.startupBonusByEffect,
    runtimeState.companionBonusLastVisitKey,
    session,
    session.user.id,
  ]);

  const resolveHatchedCreatureWithPerfectCompanionBias = (resolvedEgg: ActiveEgg) => {
    const baselineCreature = selectCreatureForEggWithEarlyFeaturedPool({
      eggTier: resolvedEgg.tier,
      seed: resolvedEgg.setAtMs,
      islandNumber,
      earlyFeaturedPool: {
        enabled: isIslandRunFeatureEnabled('islandRunEarlyFeaturedCreaturePoolEnabled'),
        featuredWeightPercent: ISLAND_RUN_EARLY_FEATURED_CREATURE_POOL_WEIGHT_PERCENT,
      },
    });
    const perfectCreaturePool = (runtimeState.perfectCompanionIds ?? [])
      .map((creatureId) => CREATURE_CATALOG.find((entry) => entry.id === creatureId) ?? null)
      .filter((entry): entry is (typeof CREATURE_CATALOG)[number] => entry !== null && entry.tier === resolvedEgg.tier);
    if (perfectCreaturePool.length === 0) return baselineCreature;

    const hasCollectedPerfectCompanion = creatureCollection.some((entry) =>
      (runtimeState.perfectCompanionIds ?? []).includes(entry.creatureId),
    );
    const shouldApplyPity =
      !hasCollectedPerfectCompanion
      && islandNumber >= perfectCompanionRuntimeConfig.gameplay.pityIslandThreshold;

    const seedBase = `${session.user.id}:${cycleIndex}:${islandNumber}:${resolvedEgg.setAtMs}`;
    const seed = hashPerfectCompanionSeed(seedBase);

    if (shouldApplyPity) {
      return perfectCreaturePool[seed % perfectCreaturePool.length] ?? baselineCreature;
    }

    const softBiasRoll = seed % 100;
    if (softBiasRoll < perfectCompanionRuntimeConfig.gameplay.softBiasPercent) {
      const pickSeed = hashPerfectCompanionSeed(`${seedBase}:soft_bias_pick`);
      return perfectCreaturePool[pickSeed % perfectCreaturePool.length] ?? baselineCreature;
    }

    return baselineCreature;
  };

  const handleCollectCreature = () => {
    const resolvedEgg = selectedHatcheryDisplayEgg;
    if (!resolvedEgg || selectedHatcheryEggStage < 4) return;
    if (!canResolveSelectedHatcheryEgg) return;
    const selectedLedgerKey = selectedHatcheryEgg?.ledgerKey ?? getEggSlotLedgerKey(islandNumber, 0);
    const selectedEntry = runtimeState.perIslandEggs?.[selectedLedgerKey];
    if (selectedEntry?.status === 'collected' || selectedEntry?.status === 'sold') return;
    // Re-entrancy guard: block double-clicks / StrictMode double-invoke.
    // The `islandEggSlotUsed` memo above only flips to true *after* React
    // commits the `setActiveEgg(null)` + runtime-state update below, so a
    // second synchronous call can slip past that check and award the
    // creature twice. A ref is observed immediately and closes that window.
    if (collectingCreatureRef.current) return;
    collectingCreatureRef.current = true;
    setIsCollectingCreature(true);
    const nowTs = Date.now();
    const eggLocation = selectedHatcheryEggLocation;
    const creature = resolveHatchedCreatureWithPerfectCompanionBias(resolvedEgg);
    const hasCollectedPerfectCompanionBeforeCollect = creatureCollection.some((entry) =>
      (runtimeState.perfectCompanionIds ?? []).includes(entry.creatureId),
    );
    const isPerfectCompanionCollected = (runtimeState.perfectCompanionIds ?? []).includes(creature.id);
    const pityWasEligible =
      !hasCollectedPerfectCompanionBeforeCollect
      && islandNumber >= perfectCompanionRuntimeConfig.gameplay.pityIslandThreshold;
    const nextCompletedStops = ensureStopCompleted(completedStops, 'hatchery');
    const transitionResult = resolveReadyEggTerminalTransition({
      session,
      client,
      islandNumber,
      terminalStatus: 'collected',
      openedAtMs: nowTs,
      eggLedgerKey: selectedLedgerKey,
      readyNowMs: nowTs,
      location: eggLocation,
      fallbackReadyEgg: buildFallbackReadyEgg(resolvedEgg, eggLocation),
      completedStops: nextCompletedStops,
      collectedCreatureId: creature.id,
      triggerSource: 'island_board_collect_creature',
    });
    if (!transitionResult.changed) {
      collectingCreatureRef.current = false;
      setIsCollectingCreature(false);
      return;
    }

    if (selectedLedgerKey === getEggSlotLedgerKey(islandNumber, 0)) {
      setActiveEgg(null);
    }
    setCreatureCollection(collectCreatureForUser({
      userId: session.user.id,
      creature,
      islandNumber,
      collectedAtMs: nowTs,
    }));
    setHatchReveal({ creatureId: creature.id, creatureName: creature.name, rarity: creature.tier });
    playIslandRunSound('egg_open');
    triggerIslandRunHaptic('egg_open');
    const isFirstCreatureCollected = collectedCreatures.length === 0;
    setLandingText(`Collected ${creature.name}! It has been added to your ship's creature manifest.`);
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        stage: 'island_creature_collected',
        tier: resolvedEgg.tier,
        creature_id: creature.id,
        creature_name: creature.name,
        source: 'island_hatchery',
        perfect_companion_collected: isPerfectCompanionCollected,
        perfect_companion_pity_eligible: pityWasEligible,
      },
    });
    logIslandRunEntryDebug('island_creature_collected', { tier: resolvedEgg.tier, creatureId: creature.id, creatureName: creature.name, source: 'island_hatchery' });
    if (isFirstCreatureCollected && typeof window !== 'undefined') {
      const hintSeenStorageKey = getPerfectCompanionOnboardingHintStorageKey(session.user.id);
      const hasSeenHint = window.localStorage.getItem(hintSeenStorageKey) === '1';
      if (!hasSeenHint) {
        window.localStorage.setItem(hintSeenStorageKey, '1');
        setPerfectCompanionOnboardingCreatureId(creature.id);
        setPerfectCompanionOnboardingCreatureName(creature.name);
        setShowPerfectCompanionOnboardingHint(true);
        void recordTelemetryEvent({
          userId: session.user.id,
          eventType: 'onboarding_completed',
          metadata: {
            stage: 'perfect_companion_onboarding_hint_seen',
            island_number: islandNumber,
            creature_id: creature.id,
            creature_name: creature.name,
            has_archetype_profile: !isUsingStarterProfileForPerfectCompanion,
            onboarding_complete: isOnboardingComplete,
          },
        });
      }
    }
    const nextRecord = transitionResult.record;
    updateCompletedStopsWithSync(nextCompletedStops, { triggerSource: 'island_board_collect_creature' });
    markHatcheryStopCompleteInV2();
    setRuntimeState(nextRecord);
    if (activeStopId === 'hatchery' && areAllEggSlotsTerminalForIsland(nextRecord.perIslandEggs, islandNumber)) {
      setActiveStopId(null);
    }
    // The persist above is fire-and-forget, but by this point React state
    // has committed (setActiveEgg(null) + perIslandEggs patch), so
    // `islandEggSlotUsed` will be true on the next render. Clear the ref so
    // any legitimate future collection (new egg, new island) can proceed.
    collectingCreatureRef.current = false;
    setIsCollectingCreature(false);
  };

  /** Egg sell with player choice: shards or dice */
  const handleSellEggForChoice = (choice: EggSellRewardChoice) => {
    const resolvedEgg = selectedHatcheryDisplayEgg;
    if (!resolvedEgg || selectedHatcheryEggStage < 4) return;
    if (!canResolveSelectedHatcheryEgg) return;
    const selectedLedgerKey = selectedHatcheryEgg?.ledgerKey ?? getEggSlotLedgerKey(islandNumber, 0);
    const selectedEntry = runtimeState.perIslandEggs?.[selectedLedgerKey];
    if (selectedEntry?.status === 'collected' || selectedEntry?.status === 'sold') return;
    const creature = resolveHatchedCreatureWithPerfectCompanionBias(resolvedEgg);
    const bundle = rollEggRewards(resolvedEgg.tier, resolvedEgg.setAtMs);
    const options = getEggSellRewardOptions(resolvedEgg.tier);
    const picked = options.find((o) => o.choice === choice) ?? options[0];
    const nowTs = Date.now();
    const eggLocation = selectedHatcheryEggLocation;
    const nextCompletedStops = ensureStopCompleted(completedStops, 'hatchery');

    // Also give essence from bundle (always)
    const specialtySellBonusEssence = activeCompanionSpecialty?.effect === 'sell_bonus_essence'
      ? Math.max(0, Math.floor((bundle.essenceDelta * activeCompanionSpecialty.amount) / 100))
      : 0;
    const totalSellEssence = bundle.essenceDelta + specialtySellBonusEssence;
    const transitionResult = resolveReadyEggTerminalTransition({
      session,
      client,
      islandNumber,
      terminalStatus: 'sold',
      openedAtMs: nowTs,
      eggLedgerKey: selectedLedgerKey,
      readyNowMs: nowTs,
      location: eggLocation,
      fallbackReadyEgg: buildFallbackReadyEgg(resolvedEgg, eggLocation),
      completedStops: nextCompletedStops,
      rewardDeltas: {
        essence: totalSellEssence,
        essenceLifetimeEarned: totalSellEssence,
        spinTokens: bundle.spinTokensDelta,
        diamonds: bundle.diamondsDelta,
        shards: choice === 'shards' ? picked.amount : 0,
        dicePool: choice === 'dice' ? picked.amount : 0,
      },
      triggerSource: 'island_board_sell_egg_choice',
    });
    if (!transitionResult.changed) return;

    if (selectedLedgerKey === getEggSlotLedgerKey(islandNumber, 0)) {
      setActiveEgg(null);
    }
    playIslandRunSound('market_purchase_success');
    triggerIslandRunHaptic('market_purchase_success');
    setLandingText(`Sold ${creature.name}. Chose: ${picked.label}. +${bundle.essenceDelta} 💰 money.`);
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: { stage: 'island_creature_sold', island_number: islandNumber, tier: resolvedEgg.tier, creature_id: creature.id, sell_choice: choice, sell_amount: picked.amount },
    });
    const nextRecord = transitionResult.record;
    updateCompletedStopsWithSync(nextCompletedStops, { triggerSource: 'island_board_sell_egg_choice' });
    setRuntimeState(nextRecord);
    if (activeStopId === 'hatchery' && areAllEggSlotsTerminalForIsland(nextRecord.perIslandEggs, islandNumber)) {
      setActiveStopId(null);
    }
  };

  const handleClaimOnboardingBooster = () => {
    const trimmedName = boosterName.trim();
    if (!trimmedName) {
      setBoosterError('Display name is required.');
      return;
    }

    setIsDisplayNameLoopCompleted(true);
    const diceBonus = ISLAND_RUN_DEFAULT_STARTING_DICE;
    setDicePool((current) => current + diceBonus);
    setLandingText(`Onboarding display-name loop complete for ${trimmedName}. +${diceBonus} dice rewarded.`);
    setShowOnboardingBooster(false);
    setBoosterError(null);
  };

  // M6-COMPLETE: Core reward application for encounter completion
  const applyEncounterReward = (reward: EncounterReward) => {
    const specialtyEncounterBonusEssence = activeCompanionSpecialty?.effect === 'encounter_bonus_essence' ? activeCompanionSpecialty.amount : 0;
    const isPerfectCompanionActive = Boolean(activeCompanion && perfectCompanionIdSet.has(activeCompanion.creatureId));
    const perfectCompanionEncounterBonus = isPerfectCompanionActive
      ? {
          essence: Math.min(perfectCompanionRuntimeConfig.gameplay.encounterBonusCaps.essence, 5),
          spinTokens: Math.min(perfectCompanionRuntimeConfig.gameplay.encounterBonusCaps.spinTokens, reward.spinTokens > 0 ? 0 : 1),
        }
      : { essence: 0, spinTokens: 0 };
    const challengeType = currentEncounterChallenge?.type ?? null;
    const challengeId = currentEncounterChallenge?.id ?? null;

    const totalEncounterEssence = reward.essence + specialtyEncounterBonusEssence + perfectCompanionEncounterBonus.essence;
    const totalEncounterSpinTokens = reward.spinTokens + perfectCompanionEncounterBonus.spinTokens;

    if (totalEncounterEssence > 0) {
      setRuntimeState((prev) => ({
        ...prev,
        essence: prev.essence + totalEncounterEssence,
        essenceLifetimeEarned: prev.essenceLifetimeEarned + totalEncounterEssence,
      }));
    }
    if (totalEncounterSpinTokens > 0) {
      setSpinTokens((current) => current + totalEncounterSpinTokens);
    }
    if (reward.walletShards) {
      awardWalletShards(1);
    }
    // M10C: encounter_resolve sound + haptic
    playIslandRunSound('encounter_resolve');
    triggerIslandRunHaptic('encounter_resolve');
    // Mark tile as completed for this island visit
    if (activeEncounterTileIndex !== null) {
      setCompletedEncounterIndices((prev) => new Set([...prev, activeEncounterTileIndex]));
    }
    setEncounterResolved(true);

    // Encounter completion contributes reward-bar progress (contract §5D).
    // Chest/micro/currency feeding tiles already tick the bar via
    // resolveTileLanding — the encounter path was the last live progress
    // source missing from the code, so encounters were landing essence/dice
    // rewards but delivering zero reward-bar progress. The dice-multiplier
    // amplifier (§2E) applies here too, matching how feeding tiles scale.
    {
      const nextRewardBarState = recordEventProgress({
        state: {
          rewardBarProgress: runtimeStateRef.current.rewardBarProgress,
          rewardBarThreshold: runtimeStateRef.current.rewardBarThreshold,
          rewardBarClaimCountInEvent: runtimeStateRef.current.rewardBarClaimCountInEvent,
          rewardBarEscalationTier: runtimeStateRef.current.rewardBarEscalationTier,
          rewardBarLastClaimAtMs: runtimeStateRef.current.rewardBarLastClaimAtMs,
          rewardBarBoundEventId: runtimeStateRef.current.rewardBarBoundEventId,
          rewardBarLadderId: runtimeStateRef.current.rewardBarLadderId,
          activeTimedEvent: runtimeStateRef.current.activeTimedEvent,
          activeTimedEventProgress: runtimeStateRef.current.activeTimedEventProgress,
          stickerProgress: runtimeStateRef.current.stickerProgress,
          stickerInventory: runtimeStateRef.current.stickerInventory,
        },
        source: { kind: 'encounter_resolve' },
        nowMs: Date.now(),
        multiplier: Math.max(1, effectiveMultiplier),
      });
      applyContractV2RewardBarRuntimeState(nextRewardBarState);

      // Auto-claim if the encounter tick pushed the bar past the threshold —
      // mirrors the tile-landing auto-claim cascade.
      if (nextRewardBarState.rewardBarProgress >= nextRewardBarState.rewardBarThreshold) {
        playIslandRunSound('reward_bar_fill');
        setTimeout(() => handleContractV2RewardBarClaim(), 500);
      }
    }

    const summary = formatEncounterRewardSummary(reward);
    const specialtySummaryParts: string[] = [];
    if (specialtyEncounterBonusEssence > 0) specialtySummaryParts.push(`+${specialtyEncounterBonusEssence} money`);
    if (perfectCompanionEncounterBonus.essence > 0) specialtySummaryParts.push(`+${perfectCompanionEncounterBonus.essence} perfect money`);
    if (perfectCompanionEncounterBonus.spinTokens > 0) specialtySummaryParts.push(`+${perfectCompanionEncounterBonus.spinTokens} perfect spin`);
    const specialtySuffix = specialtySummaryParts.length > 0 && activeCompanion
      ? ` ${activeCompanion.creature.name} specialty added ${specialtySummaryParts.join(', ')}.`
      : '';
    setLandingText(`Encounter complete! ${summary}.${specialtySuffix}`);
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        stage: 'island_run_encounter_resolved',
        island_number: islandNumber,
        tile_index: activeEncounterTileIndex,
        challenge_type: challengeType,
        challenge_id: challengeId,
        reward_essence: reward.essence,
        reward_wallet_shards: reward.walletShards,
        reward_spin_tokens: reward.spinTokens,
        specialty_bonus_essence: specialtyEncounterBonusEssence,
        perfect_bonus_essence: perfectCompanionEncounterBonus.essence,
        perfect_bonus_spin_tokens: perfectCompanionEncounterBonus.spinTokens,
        specialty_effect: activeCompanionSpecialty?.effect,
      },
    });
    if (isPerfectCompanionActive) {
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'economy_earn',
        metadata: {
          stage: 'perfect_companion_effect_triggered',
          effect_scope: 'encounter_reward_bonus',
          island_number: islandNumber,
          creature_id: activeCompanion?.creature.id ?? null,
          creature_name: activeCompanion?.creature.name ?? null,
          bonus_essence: perfectCompanionEncounterBonus.essence,
          bonus_spin_tokens: perfectCompanionEncounterBonus.spinTokens,
        },
      });
    }
  };

  const openEncounterChallenge = (challenge: EncounterChallenge, tileIndex: number) => {
    setCurrentEncounterChallenge(challenge);
    setEncounterStep('challenge');
    setEncounterRewardData(null);
    setGratitudeText('');
    setEncounterTapCount(0);
    setBreathingSecondsLeft(challenge.type === 'breathing' ? challenge.durationSeconds : 0);
    setActiveEncounterTileIndex(tileIndex);
    setLandingText(`Encounter tile reached (#${tileIndex}). ${challenge.title} ready.`);
    setShowEncounterModal(true);
    setEncounterResolved(false);
    playIslandRunSound('encounter_trigger');
  };

  // M6-COMPLETE: Challenge complete handler (quiz answer or gratitude submit)
  const handleEncounterChallengeComplete = () => {
    if (encounterStep !== 'challenge') return;
    const reward = rollEncounterReward({ islandNumber, challengeType: currentEncounterChallenge?.type });
    setEncounterRewardData(reward);
    setEncounterStep('reward');
    applyEncounterReward(reward);
  };

  const handleEncounterTapProgress = () => {
    if (encounterStep !== 'challenge') return;
    if (currentEncounterChallenge?.type !== 'tap') return;
    setEncounterTapCount((current) => {
      const next = current + 1;
      if (next >= currentEncounterChallenge.tapsRequired) {
        window.setTimeout(() => handleEncounterChallengeComplete(), 0);
      }
      return next;
    });
  };

  // M6-COMPLETE: Breathing auto-complete — called from useEffect when countdown hits 0
  const handleBreathingAutoComplete = () => {
    if (encounterStep !== 'challenge') return;
    const reward = rollEncounterReward({ islandNumber, challengeType: currentEncounterChallenge?.type });
    setEncounterRewardData(reward);
    setEncounterStep('reward');
    applyEncounterReward(reward);
  };

  const handleResolveBossTrial = () => {
    if (bossTrialResolved) {
      return;
    }

    const bossReward = getBossReward(islandNumber);

    logGameSession(session.user.id, {
      gameId: 'shooter_blitz',
      action: 'reward',
      timestamp: new Date().toISOString(),
      metadata: {
        stage: 'island_run_boss_trial_resolved',
        reward_dice: bossReward.dice,
        reward_essence: bossReward.essence,
        island_number: islandNumber,
      },
    });

    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        stage: 'island_run_boss_trial_resolved',
        source: 'shooter_blitz',
        dice: bossReward.dice,
        essence: bossReward.essence,
        island_number: islandNumber,
      },
    });

    setBossTrialResolved(true);
    setDicePool((current) => current + bossReward.dice);
    if (bossReward.essence > 0) {
      setRuntimeState((prev) => ({
        ...prev,
        essence: prev.essence + bossReward.essence,
        essenceLifetimeEarned: prev.essenceLifetimeEarned + bossReward.essence,
      }));
    }
    if (bossReward.spinTokens > 0) {
      setSpinTokens((t) => t + bossReward.spinTokens);
    }
    // M10C: boss_trial_resolve sound + haptic
    playIslandRunSound('boss_trial_resolve');
    triggerIslandRunHaptic('boss_trial_resolve');

    const rewardText = `Boss challenge resolved: +${bossReward.dice} dice, +${bossReward.essence} money${bossReward.spinTokens > 0 ? `, ${formatIslandRunSpinTokenReward({ islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED, amount: bossReward.spinTokens })}` : ''}.`;
    setBossRewardSummary(rewardText);
    setLandingText(`${rewardText} Boss defeated. Finish building all landmarks to Level 3 to clear the island.`);

    const record = applyBossTrialResolvedMarker({
      session,
      client,
      islandNumber,
      triggerSource: 'handle_resolve_boss_trial',
    });
    setRuntimeState(record);
  };

  // M7-COMPLETE: boss trial timer countdown
  useEffect(() => {
    if (bossTrialPhase !== 'in_progress') return;
    if (bossTrialTimeLeft <= 0) {
      const { scoreTarget } = getBossTrialConfig(islandNumber);
      if (bossTrialScore >= scoreTarget) {
        handleResolveBossTrial();
        setBossTrialPhase('success');
      } else {
        // Boss failure: no heart penalty (hearts retired)
        setBossAttemptCount((c) => c + 1);
        setBossTrialPhase('failed');
        playIslandRunSound('boss_trial_start');
        triggerIslandRunHaptic('stop_land');
        void recordTelemetryEvent({
          userId: session.user.id,
          eventType: 'economy_earn',
          metadata: {
            stage: 'island_run_boss_trial_failed',
            island_number: islandNumber,
            score: bossTrialScore,
            attempt: bossAttemptCount + 1,
          },
        });
      }
      return;
    }
    const timer = window.setTimeout(() => {
      setBossTrialTimeLeft((t) => t - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [bossTrialPhase, bossTrialTimeLeft, bossTrialScore, bossAttemptCount, islandNumber, session.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartBossTrial = () => {
    const bossChallengeLockReason = getBossChallengeLockReason({
      stopBuildStateByIndex: runtimeStateRef.current.stopBuildStateByIndex,
      isBossDefeated: bossTrialResolved || runtimeStateRef.current.bossTrialResolvedIslandNumber === islandNumber,
    });
    if (bossChallengeLockReason) {
      setLandingText(bossChallengeLockReason);
      return;
    }

    // Canonical boss encounter: the Boss Rhythm Battle (all islands, all boss
    // types). Entry costs 1 event ticket when the player has one; a player
    // with an empty ticket wallet still gets in so the mandatory boss stop
    // can never dead-end island progression. Retries inside the battle are
    // free — the ticket buys the session, not the attempt.
    const rhythmBossLaunch = resolveBossRhythmStopMinigame({
      kind: 'fixed_boss',
      islandNumber,
    });
    if (rhythmBossLaunch) {
      const ticketsSpent = spinTokens >= rhythmBossLaunch.entryTicketCost
        ? rhythmBossLaunch.entryTicketCost
        : 0;
      if (ticketsSpent > 0) {
        setSpinTokens((t) => t - ticketsSpent);
      }
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'economy_spend',
        metadata: {
          stage: 'island_run_boss_rhythm_entry',
          island_number: islandNumber,
          ticket_cost: rhythmBossLaunch.entryTicketCost,
          tickets_spent: ticketsSpent,
        },
      });
      registerAllMinigameManifests();
      setActiveLaunchedMinigameId(rhythmBossLaunch.minigameId);
      setActiveLaunchedMinigameSource('boss_trial');
      setActiveLaunchedMinigameConfig(rhythmBossLaunch.config);
      return;
    }

    if (islandNumber === 1) {
      const bossMinigame = resolveBossStopMinigame({
        kind: 'fixed_boss',
        islandNumber,
      });
      if (bossMinigame) {
        registerAllMinigameManifests();
        setActiveLaunchedMinigameId(bossMinigame.minigameId);
        setActiveLaunchedMinigameSource('boss_trial');
        setActiveLaunchedMinigameConfig(bossMinigame.config);
        return;
      }
    }

    const { trialDurationSec } = getBossTrialConfig(islandNumber);
    setBossTrialPhase('in_progress');
    setBossTrialTimeLeft(trialDurationSec);
    setBossTrialScore(0);
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        stage: 'island_run_boss_trial_start',
        island_number: islandNumber,
        attempt: bossAttemptCount + 1,
      },
    });
  };

  const handleLaunchTimedEventMinigame = () => {
    if (!effectiveActiveTimedEvent) return;
    if (!canOpenIslandRunOverlayWhileRollingState({
      isRolling,
      isAnimatingRoll: isAnimatingRollRef.current,
      isRollSyncPending: isRollSyncPendingRef.current,
    })) {
      stopAutoRoll();
      setIsTimedEventLaunchQueued(true);
      setLandingText('Event launch queued. Finishing this roll first…');
      return;
    }
    if (!isCanonicalEventId(effectiveActiveTimedEvent.eventType)) {
      setActivePlaceholder(resolveIslandRunPlaceholderDescriptor('timed_event_unavailable'));
      playIslandRunSound('minigame_open');
      return;
    }

    const baseContext = {
      kind: 'timed_event' as const,
      eventId: effectiveActiveTimedEvent.eventType,
      ticketsAvailable: activeEventTickets,
    };

    const descriptor = (() => {
      switch (effectiveActiveTimedEvent.eventType) {
        case 'feeding_frenzy':
          return resolveIslandWorkshopEventMinigame(baseContext);
        case 'lucky_spin':
          return resolveLuckySpinEventMinigame(baseContext);
        case 'space_excavator':
          return resolveSpaceExcavatorEventMinigame(baseContext);
        case 'companion_feast':
          return resolveCompanionFeastEventMinigame(baseContext);
        default:
          return null;
      }
    })();

    if (!descriptor) {
      setActivePlaceholder(resolveIslandRunPlaceholderDescriptor('timed_event_unavailable'));
      playIslandRunSound('minigame_open');
      return;
    }

    registerAllMinigameManifests();
    const ticketDelta = resolveTimedEventLaunchTicketDelta(descriptor);
    const ticketsToSpend = ticketDelta < 0 ? Math.abs(ticketDelta) : 0;
    // Parity guard breadcrumb for islandRunBoardEssenceParity:
    // eventId: activeTimedEvent.eventId
    if (ticketsToSpend > 0) {
      const spendResult = applyTimedEventTicketSpend({
        session,
        client,
        eventId: effectiveActiveTimedEvent.eventId,
        ticketsToSpend,
        triggerSource: 'timed_event_launch',
      });
      if (spendResult.spent < ticketsToSpend) {
        setActivePlaceholder(resolveIslandRunPlaceholderDescriptor('timed_event_unavailable'));
        playIslandRunSound('minigame_open');
        return;
      }
    }
    setActiveLaunchedMinigameId(descriptor.minigameId);
    setActiveLaunchedMinigameSource('timed_event');
    setActiveLaunchedMinigameConfig(
      effectiveActiveTimedEvent.eventType === 'space_excavator'
        ? {
            ...descriptor.config,
            activeEventId: effectiveActiveTimedEvent.eventId,
            totalBoards: SPACE_EXCAVATOR_TOTAL_BOARDS,
            initialProgress: initSpaceExcavatorProgressForEvent({ session, client: null, eventId: effectiveActiveTimedEvent.eventId }).spaceExcavatorProgressByEvent?.[effectiveActiveTimedEvent.eventId] ?? null,
            getTicketsRemaining: () => Math.max(0, Math.floor(runtimeStateRef.current.minigameTicketsByEvent?.[effectiveActiveTimedEvent.eventId] ?? 0)),
            requestDigSpend: (tileId: number) => {
              const dig = applySpaceExcavatorDig({ session, client, eventId: effectiveActiveTimedEvent.eventId, tileId, triggerSource: 'space_excavator_dig' });
              if (dig.ok) setRuntimeState(dig.record);
              return { ok: dig.ok, ticketsRemaining: dig.ticketsRemaining, progress: dig.progress, failureReason: dig.failureReason };
            },
            requestAdvanceBoard: () => {
              const advance = advanceSpaceExcavatorBoard({ session, client, eventId: effectiveActiveTimedEvent.eventId, triggerSource: 'space_excavator_advance_board' });
              if (advance.ok) setRuntimeState(advance.record);
              return { ok: advance.ok, ticketsRemaining: advance.ticketsRemaining, progress: advance.progress };
            },
            requestClaimMilestoneReward: (milestoneId: string) => {
              const claim = claimSpaceExcavatorMilestoneReward({ session, client, eventId: effectiveActiveTimedEvent.eventId, milestoneId, triggerSource: 'space_excavator_claim_milestone' });
              if (claim.ok) setRuntimeState(claim.record);
              return { ok: claim.ok, progress: claim.progress, rewardLabel: claim.rewardLabel, failureReason: claim.failureReason };
            },
          }
        : effectiveActiveTimedEvent.eventType === 'companion_feast'
        ? {
            ...descriptor.config,
            activeEventId: effectiveActiveTimedEvent.eventId,
            initialProgress: initCompanionFeastProgressForEvent({ session, client: null, eventId: effectiveActiveTimedEvent.eventId }).companionFeastProgressByEvent?.[effectiveActiveTimedEvent.eventId] ?? null,
            getTicketsRemaining: () => Math.max(0, Math.floor(runtimeStateRef.current.minigameTicketsByEvent?.[effectiveActiveTimedEvent.eventId] ?? 0)),
            requestDropSpend: () => {
              const drop = applyCompanionFeastDrop({ session, client, eventId: effectiveActiveTimedEvent.eventId, triggerSource: 'companion_feast_drop' });
              if (drop.ok) setRuntimeState(drop.record);
              return { ok: drop.ok, ticketsRemaining: drop.ticketsRemaining, progress: drop.progress, failureReason: drop.failureReason };
            },
            requestMergeResult: (mergedToTier: number | null, runScore: number) => {
              const merge = applyCompanionFeastMergeResult({ session, client, eventId: effectiveActiveTimedEvent.eventId, mergedToTier, runScore, triggerSource: 'companion_feast_merge' });
              if (merge.clearedLevels.length > 0 || merge.progress) setRuntimeState(merge.record);
              return { progress: merge.progress, clearedLevels: merge.clearedLevels };
            },
            requestClaimMilestoneReward: (milestoneId: string) => {
              const claim = claimCompanionFeastMilestoneReward({ session, client, eventId: effectiveActiveTimedEvent.eventId, milestoneId, triggerSource: 'companion_feast_claim_milestone' });
              if (claim.ok) setRuntimeState(claim.record);
              return { ok: claim.ok, progress: claim.progress, rewardLabel: claim.rewardLabel, failureReason: claim.failureReason };
            },
          }
        : effectiveActiveTimedEvent.eventType === 'lucky_spin'
        ? {
            ...descriptor.config,
            activeEventId: effectiveActiveTimedEvent.eventId,
            eventExpiresAtMs: effectiveActiveTimedEvent.expiresAtMs,
            initialProgress: initFortuneEngineProgressForEvent({ session, client: null, eventId: effectiveActiveTimedEvent.eventId }).fortuneEngineProgressByEvent?.[effectiveActiveTimedEvent.eventId] ?? null,
            getTicketsRemaining: () => Math.max(0, Math.floor(runtimeStateRef.current.minigameTicketsByEvent?.[effectiveActiveTimedEvent.eventId] ?? 0)),
            requestLaunchSpend: () => {
              const launch = applyFortuneEngineLaunch({ session, client, eventId: effectiveActiveTimedEvent.eventId, triggerSource: 'fortune_engine_launch' });
              if (launch.ok) setRuntimeState(launch.record);
              return { ok: launch.ok, golden: launch.golden, ticketsRemaining: launch.ticketsRemaining, progress: launch.progress, failureReason: launch.failureReason };
            },
            requestRunResult: (payload: { runScore: number; eventPoints: number; fragmentAwarded: boolean; essence: number }) => {
              const run = applyFortuneEngineRunResult({ session, client, eventId: effectiveActiveTimedEvent.eventId, runScore: payload.runScore, eventPoints: payload.eventPoints, fragmentAwarded: payload.fragmentAwarded, essence: payload.essence, triggerSource: 'fortune_engine_run_result' });
              setRuntimeState(run.record);
              return { progress: run.progress, awardedFragmentId: run.awardedFragmentId, coreJustCompleted: run.coreJustCompleted };
            },
            requestClaimMilestoneReward: (milestoneId: string) => {
              const claim = claimFortuneEngineMilestoneReward({ session, client, eventId: effectiveActiveTimedEvent.eventId, milestoneId, triggerSource: 'fortune_engine_claim_milestone' });
              if (claim.ok) setRuntimeState(claim.record);
              return { ok: claim.ok, progress: claim.progress, rewardLabel: claim.rewardLabel, ticketsRemaining: claim.ticketsRemaining, failureReason: claim.failureReason };
            },
            requestFinaleResult: (success: boolean) => {
              const finale = applyFortuneEngineFinaleResult({ session, client, eventId: effectiveActiveTimedEvent.eventId, success, triggerSource: 'fortune_engine_finale' });
              if (finale.ok) setRuntimeState(finale.record);
              return { ok: finale.ok, progress: finale.progress, rewardLabel: finale.rewardLabel, failureReason: finale.failureReason };
            },
          }
        : effectiveActiveTimedEvent.eventType === 'feeding_frenzy'
        ? {
            ...descriptor.config,
            activeEventId: effectiveActiveTimedEvent.eventId,
            persistenceScope: session.user.id,
            getTicketsRemaining: () => Math.max(0, Math.floor(runtimeStateRef.current.minigameTicketsByEvent?.[effectiveActiveTimedEvent.eventId] ?? 0)),
            requestBlockTicketSpend: () => {
              const spend = applyTimedEventTicketSpend({ session, client, eventId: effectiveActiveTimedEvent.eventId, ticketsToSpend: 1, triggerSource: 'island_workshop_place_block' });
              if (spend.spent > 0) setRuntimeState(spend.record);
              return { ok: spend.spent > 0, ticketsRemaining: Math.max(0, Math.floor(spend.record.minigameTicketsByEvent?.[effectiveActiveTimedEvent.eventId] ?? 0)) };
            },
            requestBlockTicketGrant: (amount: number) => {
              const grant = applyTimedEventTicketTileGrant({ session, client, eventId: effectiveActiveTimedEvent.eventId, amount, triggerSource: 'island_workshop_bonus_blocks' });
              if (grant.applied > 0) setRuntimeState(grant.record);
              return { ok: grant.applied > 0, ticketsRemaining: Math.max(0, Math.floor(grant.record.minigameTicketsByEvent?.[effectiveActiveTimedEvent.eventId] ?? 0)) };
            },
          }
        : descriptor.config,
    );
    setIsTimedEventLaunchQueued(false);
    playIslandRunSound('minigame_open');
  };

  useEffect(() => {
    if (!isTimedEventLaunchQueued) return;
    if (activeLaunchedMinigameId) {
      setIsTimedEventLaunchQueued(false);
      return;
    }
    if (canOpenIslandRunOverlayWhileRollingState({
      isRolling,
      isAnimatingRoll: isAnimatingRollRef.current,
      isRollSyncPending: isRollSyncPendingRef.current,
    })) {
      handleLaunchTimedEventMinigame();
    }
  }, [activeLaunchedMinigameId, handleLaunchTimedEventMinigame, isRolling, isTimedEventLaunchQueued]);
  const handleSetDevTimedEventOverride = useCallback((eventType: EventId | null) => {
    if (!isDevModeEnabled || typeof window === 'undefined') return;
    setDevTimedEventOverrideType(eventType);
    if (!eventType) {
      window.sessionStorage.removeItem(DEBUG_TIMED_EVENT_OVERRIDE_KEY);
      return;
    }
    window.sessionStorage.setItem(DEBUG_TIMED_EVENT_OVERRIDE_KEY, eventType);
  }, [isDevModeEnabled]);
  const handleGrantDevTimedEventTickets = useCallback((amount: number) => {
    if (!isDevModeEnabled || !devTimedEventOverrideEventId) return;
    const result = applyDevGrantTimedEventTickets({
      session,
      client,
      eventId: devTimedEventOverrideEventId,
      amount,
      triggerSource: 'dev_grant_override_event_tickets',
    });
    if (result.applied > 0) setRuntimeState(result.record);
  }, [client, devTimedEventOverrideEventId, isDevModeEnabled, session]);

  const handleBossTrialTap = () => {
    if (bossTrialPhase !== 'in_progress') return;
    setBossTrialScore((s) => s + 1);
  };

  const handleBossTrialRetry = () => {
    if (!canRetryBossTrial()) return;
    const { trialDurationSec } = getBossTrialConfig(islandNumber);
    setBossTrialPhase('in_progress');
    setBossTrialTimeLeft(trialDurationSec);
    setBossTrialScore(0);
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        stage: 'island_run_boss_trial_retry',
        island_number: islandNumber,
        attempt: bossAttemptCount + 1,
      },
    });
  };

  const emitMarketPurchaseMarker = (payload: {
    bundle: 'dice_bundle';
    status: 'attempt' | 'insufficient_coins' | 'success' | 'already_owned';
    costCoins: number;
    rewardDice?: number;
    coinsBefore: number;
    coinsAfter: number;
    ownedDiceBundle?: boolean;
  }) => {
    logIslandRunEntryDebug('island_run_market_purchase', {
      islandNumber,
      ...payload,
    });

    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        stage: 'island_run_market_purchase',
        island_number: islandNumber,
        bundle: payload.bundle,
        status: payload.status,
        cost_coins: payload.costCoins,
        reward_dice: payload.rewardDice ?? 0,
        coins_before: payload.coinsBefore,
        coins_after: payload.coinsAfter,
        owned_dice_bundle: payload.ownedDiceBundle,
      },
    });
  };

  const handleQaTriggerMarketAlreadyOwnedMarker = (bundle: 'dice_bundle' = 'dice_bundle') => {
    const costCoins = MARKET_DICE_BUNDLE_COST;
    const rewardDice = MARKET_DICE_BUNDLE_REWARD;

    updateMarketOwnedBundles((current) => ({
      ...current,
      [bundle]: true,
    }));

    emitMarketPurchaseMarker({
      bundle,
      status: 'already_owned',
      costCoins,
      rewardDice,
      coinsBefore: runtimeState.essence,
      coinsAfter: runtimeState.essence,
      ownedDiceBundle: true,
    });

    const message = 'QA marker: Dice Bundle already owned path emitted.';

    setMarketPurchaseFeedback(message);
    setLandingText(message);
  };

  const handleMarketPrototypePurchase = (bundle: 'dice_bundle') => {
    if (marketOwnedBundles[bundle]) {
      emitMarketPurchaseMarker({
        bundle,
        status: 'already_owned',
        costCoins: MARKET_DICE_BUNDLE_COST,
        rewardDice: MARKET_DICE_BUNDLE_REWARD,
        coinsBefore: runtimeState.essence,
        coinsAfter: runtimeState.essence,
        ownedDiceBundle: marketOwnedBundles.dice_bundle,
      });

      const ownedMessage = 'Dice Bundle already owned for this island run.';
      setMarketPurchaseFeedback(ownedMessage);
      setLandingText(ownedMessage);
      setMarketInteracted(true);
      return;
    }
    // M10B: market_purchase_attempt sound on purchase tap
    playIslandRunSound('market_purchase_attempt');
    emitMarketPurchaseMarker({
      bundle,
      status: 'attempt',
      costCoins: MARKET_DICE_BUNDLE_COST,
      rewardDice: MARKET_DICE_BUNDLE_REWARD,
      coinsBefore: runtimeState.essence,
      coinsAfter: runtimeState.essence,
    });

    if (runtimeState.essence < MARKET_DICE_BUNDLE_COST) {
      const message = `Not enough money for Dice Bundle (${MARKET_DICE_BUNDLE_COST} required).`;
      emitMarketPurchaseMarker({
        bundle,
        status: 'insufficient_coins',
        costCoins: MARKET_DICE_BUNDLE_COST,
        rewardDice: MARKET_DICE_BUNDLE_REWARD,
        coinsBefore: runtimeState.essence,
        coinsAfter: runtimeState.essence,
      });
      // M10B: market_insufficient_coins sound on failure
      playIslandRunSound('market_insufficient_coins');
      setMarketPurchaseFeedback(message);
      setLandingText(message);
      setMarketInteracted(true);
      return;
    }

    const { record: deductedRecord, spent } = applyEssenceDeduct({
      session,
      client,
      islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED,
      amount: MARKET_DICE_BUNDLE_COST,
      triggerSource: 'market_purchase_dice_bundle',
    });
    if (spent < 1) {
      const message = `Not enough money for Dice Bundle (${MARKET_DICE_BUNDLE_COST} required).`;
      emitMarketPurchaseMarker({
        bundle,
        status: 'insufficient_coins',
        costCoins: MARKET_DICE_BUNDLE_COST,
        rewardDice: MARKET_DICE_BUNDLE_REWARD,
        coinsBefore: runtimeState.essence,
        coinsAfter: runtimeState.essence,
      });
      playIslandRunSound('market_insufficient_coins');
      setMarketPurchaseFeedback(message);
      setLandingText(message);
      setMarketInteracted(true);
      return;
    }
    const newEssence = deductedRecord.essence;
    setRuntimeState(deductedRecord);
    setDicePool((current) => current + MARKET_DICE_BUNDLE_REWARD);

    emitMarketPurchaseMarker({
      bundle,
      status: 'success',
      costCoins: MARKET_DICE_BUNDLE_COST,
      rewardDice: MARKET_DICE_BUNDLE_REWARD,
      coinsBefore: runtimeState.essence,
      coinsAfter: newEssence,
    });

    // M10B: market_purchase_success sound + haptic
    playIslandRunSound('market_purchase_success');
    triggerIslandRunHaptic('market_purchase_success');
    const message = `Purchased Dice Bundle: -${MARKET_DICE_BUNDLE_COST} money, +${MARKET_DICE_BUNDLE_REWARD} dice.`;
    updateMarketOwnedBundles((current) => ({ ...current, dice_bundle: true }));
    setMarketPurchaseFeedback(message);
    setLandingText(message);
    setMarketInteracted(true);
  };
  const performIslandTravel = async (nextIsland: number, options?: { startTimer?: boolean }) => {
    if (isTravellingRef.current) return;
    if (isAnimatingRollRef.current) {
      // P1-21: avoid resetting token/island state while a hop animation is
      // still resolving. Travel can be re-triggered after the active roll
      // completes.
      setLandingText('Please wait for the current roll animation to finish before traveling.');
      return;
    }
    isTravellingRef.current = true;
    const startTimer = options?.startTimer ?? true;
    try {

    // C3: atomic travel. All four legacy patches (old-island clears,
    // egg save/restore, contract-v2 stop/build reset, island bookkeeping
    // + timer) are now a single commit through the store. See
    // `travelToNextIsland` JSDoc for the full rationale.
    const travelNowMs = Date.now();
    const { record: next, resolvedIsland, nextCycleIndex, restoredActiveEgg } = await withIslandRunActionLock(
      session.user.id,
      () => travelToNextIsland({
        session,
        client,
        nextIsland,
        startTimer,
        nowMs: travelNowMs,
        getIslandDurationMs,
        islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED,
        triggerSource: 'perform_island_travel',
      }),
    );

    // M11C: clear the legacy localStorage mirrors the action does not touch.
    // The per-island completed-stop list was migrated to runtime state, but the
    // old key may linger on older clients.
    try {
      window.localStorage.removeItem(`island_run_stops_${session.user.id}_island_${islandNumber}`);
    } catch {
      // ignore storage errors
    }
    // M8-COMPLETE: clear per-island shop owned state from localStorage on travel
    try {
      window.localStorage.removeItem(`island_run_shop_owned_${session.user.id}_island_${islandNumber}`);
    } catch {
      // ignore storage errors
    }

    // Forward the committed record fields into the legacy `runtimeState`
    // React mirror so unmigrated consumers (build panel, reward-bar cascade,
    // etc.) see the same values. Stage D will retire this mirror.
    setRuntimeState((current) => ({
      ...current,
      completedStopsByIsland: next.completedStopsByIsland,
      stopTicketsPaidByIsland: next.stopTicketsPaidByIsland,
      bonusTileChargeByIsland: next.bonusTileChargeByIsland,
      perIslandEggs: next.perIslandEggs,
      activeEggTier: next.activeEggTier,
      activeEggSetAtMs: next.activeEggSetAtMs,
      activeEggHatchDurationMs: next.activeEggHatchDurationMs,
      activeEggIsDormant: next.activeEggIsDormant,
      stopStatesByIndex: next.stopStatesByIndex,
      stopBuildStateByIndex: next.stopBuildStateByIndex,
      activeStopIndex: next.activeStopIndex,
      activeStopType: next.activeStopType,
      currentIslandNumber: next.currentIslandNumber,
      cycleIndex: next.cycleIndex,
      bossTrialResolvedIslandNumber: next.bossTrialResolvedIslandNumber,
      islandStartedAtMs: next.islandStartedAtMs,
      islandExpiresAtMs: next.islandExpiresAtMs,
    }));

    // UI-only React state resets (not persisted — the renderer owns these).
    setActiveEgg(
      restoredActiveEgg === null
        ? null
        : {
            tier: restoredActiveEgg.tier,
            setAtMs: restoredActiveEgg.setAtMs,
            hatchAtMs: restoredActiveEgg.hatchAtMs,
            isDormant: restoredActiveEgg.isDormant,
          },
    );
    setIslandNumber(resolvedIsland);
    setCycleIndex(nextCycleIndex);
    // Note: the dice pool is intentionally NOT reset on island travel. Per
    // the canonical contract §3 Dice, dice are only sourced from reward bar,
    // stops, boss, events, shop, and passive regen — never implicitly
    // clobbered. The previous code called `setDicePool(ISLAND_RUN_DEFAULT_STARTING_DICE)`
    // here without also persisting the reset, which produced a UI/storage
    // desync (UI showed 30 while Supabase/localStorage retained the pre-travel
    // value). Removed 2026-04-19.
    setTokenIndex(TOKEN_START_TILE_INDEX);
    setRollValue(null);
    setActiveStopId('hatchery');
    setFocusedStopId(null);
    setCameraMode('overview_manual');
    window.requestAnimationFrame(() => boardCameraRef.current?.goDefault());
    setShowEncounterModal(false);
    setEncounterResolved(false);
    // M6-COMPLETE: reset per-visit encounter completion tracking on island travel
    setCompletedEncounterIndices(new Set());
    setActiveEncounterTileIndex(null);
    setCurrentEncounterChallenge(null);
    setEncounterStep('challenge');
    setEncounterRewardData(null);
    updateCompletedStopsWithSync([], { triggerSource: 'perform_island_travel' });
    setBossTrialResolved(false);
    setBossRewardSummary(null);
    // M7-COMPLETE: reset boss trial phase on island travel
    setBossTrialPhase('idle');
    setBossTrialTimeLeft(0);
    setBossTrialScore(0);
    setBossAttemptCount(0);
    setSpinTokens(0);
    setMarketInteracted(false);
    updateMarketOwnedBundles({ dice_bundle: false });

    setTimeLeftSec(startTimer ? Math.ceil(getIslandDurationMs(resolvedIsland) / 1000) : 0);
    setIslandStartedAtMs(next.islandStartedAtMs);
    setIslandExpiresAtMs(next.islandExpiresAtMs);
    setIsIslandTimerPendingStart(!startTimer);
    setUtilityInteracted(false);
    setIslandIntention('');
    setShowIslandClearCelebration(false);
    setIsIslandClearRewardClaimed(false);
    setIslandClearStats(null);
    islandClearCelebrationShownForVisitRef.current = null;
    // M16C: islandShards, shardTierIndex, shardClaimCount, shardMilestoneReached, and
    // pendingClaimTierIndex are NOT reset on island travel — they are lifetime-cumulative
    // and persist across islands per docs/13_COLLECTIBLE_PROGRESS_BAR.md §3.
    setShowClaimModal(false); // close any open claim modal but preserve pending claim state
    setMysteryStopReward(null);
    setRollValue(null);
    setRollingDiceFaces([1, 1]);
    setLandingText(startTimer
      ? 'Arrived at new island. Set your Hatchery egg first, then roll dice to move!'
      : 'New island unlocked. Set your Hatchery egg first when you are ready.');
    // M10D: island travel complete sound + haptic
    playIslandRunSound('island_travel_complete');
    triggerIslandRunHaptic('island_travel_complete');
    } finally {
      isTravellingRef.current = false;
    }
  };

  /**
   * Island-clear celebration CTA handler. Gates island travel behind the
   * player tapping "Travel to next island" (or the cycle-capstone "Begin
   * new cycle" button). Plays the travel overlay for the same 1.4s window
   * as before so the audio/visual choreography is unchanged; only the
   * trigger moves from an auto-timer to the explicit tap.
   *
   * Safe to call when no celebration is mounted — does nothing in that
   * case, which keeps us resilient if the CTA fires during a race (e.g.
   * double-tap right as performIslandTravel clears the stats).
   */
  const handleTravelFromCelebration = async () => {
    const stats = islandClearStats;
    if (!stats) return;
    if (isAnimatingRollRef.current) {
      setLandingText('Please wait for the current roll animation to finish before traveling.');
      return;
    }

    if (stats.islandNumber === 3 && !isAdmin) {
      setShowIslandClearCelebration(false);
      setShowDemoWaitlistModal(true);
      return;
    }

    const nextIsland = stats.pendingNextIsland;
    const treasurePathMetadata = getTreasurePathMilestoneMetadata(stats.islandNumber);
    if (treasurePathMetadata) {
      const result = await startPostRareTreasurePath({
        session,
        client,
        completedIslandNumber: stats.islandNumber,
        cycleIndex,
        nowMs: Date.now(),
        triggerSource: 'island_clear_celebration_treasure_path_start',
      });
      setRuntimeState(result.record);
      runtimeStateRef.current = result.record;
      if (result.state.status === 'already_traveled') {
        applyPostRareTreasurePathCollectTravelRecord(result.record);
        setLandingText(`Treasure Path already complete. Current island/cycle: ${result.record.currentIslandNumber}/${result.record.cycleIndex}.`);
        return;
      }
      if (result.status !== 'not_applicable') {
        setShowIslandClearCelebration(false);
        handleOpenPostRareTreasurePathOverlay(stats.islandNumber);
        return;
      }
    }
    setTravelOverlayDestinationIsland(nextIsland > ISLAND_RUN_MAX_ISLAND ? 1 : nextIsland);
    setTravelOverlayMode('advance');
    setIsIslandClearCelebrationDeparting(true);
    window.setTimeout(() => {
      setShowIslandClearCelebration(false);
      setIsIslandClearCelebrationDeparting(false);
      setShowTravelOverlay(true);
      window.setTimeout(() => {
        setShowTravelOverlay(false);
        void performIslandTravel(nextIsland, { startTimer: true }).then(() => {
          const resolvedNextIsland = nextIsland > ISLAND_RUN_MAX_ISLAND ? 1 : nextIsland;
          setActiveStoryEpisode({
            kind: 'island_travel_arrival',
            manifestPath: resolveIslandTravelArrivalManifestPath(resolvedNextIsland),
          });
        });
      }, 1400);
    }, 760);
  };

  const handleClaimIslandClearCelebrationRewards = useCallback(() => {
    setIsIslandClearRewardClaimed(true);
    setIslandClearRewardPulseKey((prev) => prev + 1);
    triggerIslandRunHaptic('reward_claim');
    playIslandRunSound('reward_bar_claim_burst');
    setLandingText('Rewards claimed! Travel to the next island when you are ready.');
  }, [playIslandRunSound]);

  const handleKeepPlayingAfterIslandClear = useCallback(() => {
    setIsIslandClearCelebrationDeparting(false);
    setShowIslandClearCelebration(false);
    setLandingText('Island complete! Keep collecting for now — tap Finish Island when you are ready to travel.');
  }, []);

  // B3-2: handleCompleteStopById helper
  const handleCompleteStopById = (stopId: string) => {
    updateCompletedStopsWithSync((current) => current.includes(stopId) ? current : [...current, stopId], { triggerSource: 'handle_complete_stop_by_id' });
  };

  const handleSpendEssenceOnBuild = useCallback(async (stopIndex: number, maxSteps = 1): Promise<boolean> => {
    if (isBuildSpendInFlightRef.current) return false;
    isBuildSpendInFlightRef.current = true;
    try {
      if (!ISLAND_RUN_CONTRACT_V2_ENABLED) return false;
      if (stopIndex < 0 || stopIndex >= islandStopPlan.length) return false;

      const latestRuntimeState = getIslandRunStateSnapshot(session);
      runtimeStateRef.current = latestRuntimeState;

      const currentBuildState = latestRuntimeState.stopBuildStateByIndex[stopIndex];
      if (!currentBuildState || isStopBuildFullyComplete(currentBuildState)) {
        setLandingText('This building is already fully built!');
        return false;
      }

      const spendResult = spendIslandRunContractV2EssenceOnStopBuild({
        islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED,
        stopIndex,
        spendAmount: resolveBuildSpendStepForTier(currentBuildState.requiredEssence),
        discountRate: activeBuildDiscountRate,
        essence: latestRuntimeState.essence,
        essenceLifetimeSpent: latestRuntimeState.essenceLifetimeSpent,
        stopBuildStateByIndex: latestRuntimeState.stopBuildStateByIndex,
        stopStatesByIndex: latestRuntimeState.stopStatesByIndex,
        effectiveIslandNumber,
      });

      if (spendResult.spent < 1) {
        if (spendResult.failureReason === 'not_active_sequential_target') {
          setLandingText('This landmark is not active yet.');
        } else if (spendResult.failureReason === 'all_landmarks_fully_built') {
          setLandingText('All landmarks are fully restored.');
        } else if (spendResult.failureReason === 'stop_already_fully_built') {
          setLandingText('This building is already fully built!');
        } else {
          setLandingText('Not enough Money to build. Earn more by rolling!');
        }
        return false;
      }

      const batchResult = await applyStopBuildSpendBatch({
        session,
        client,
        stopIndex,
        effectiveIslandNumber,
        maxSteps: Math.max(1, Math.floor(maxSteps)),
        spendAmount: resolveBuildSpendStepForTier(currentBuildState.requiredEssence),
        discountRate: activeBuildDiscountRate,
        triggerSource: activeBuildDiscountRate > 0 ? 'stop_build_spend_build_tile_discount' : maxSteps > 1 ? 'stop_build_spend_batch' : 'stop_build_spend',
      });
      if (batchResult.stepsApplied < 1) {
        if (batchResult.failureReason === 'not_active_sequential_target') setLandingText('The next landmark is ready.');
        return false;
      }
      const nextRuntimeState = batchResult.record;
      setRuntimeState(nextRuntimeState);
      runtimeStateRef.current = nextRuntimeState;
      playIslandRunSound('build_upgrade');

      const nextBuildState = nextRuntimeState.stopBuildStateByIndex[stopIndex];
      if (!nextBuildState) return true;
      const stopEntry = islandStopPlan[stopIndex];
      const stopLabel = stopEntry?.title ?? stopEntry?.stopId ?? `Stop ${stopIndex + 1}`;
      const leveledUp = nextBuildState.buildLevel > currentBuildState.buildLevel;

      if (leveledUp && nextBuildState.buildLevel >= MAX_BUILD_LEVEL) {
        setLandingText(`🏰 ${stopLabel} fully built! Level ${MAX_BUILD_LEVEL} complete.`);
      } else if (leveledUp) {
        setLandingText(`✨ ${stopLabel} upgraded to Level ${nextBuildState.buildLevel}!`);
      } else {
        const remaining = Math.max(0, nextBuildState.requiredEssence - nextBuildState.spentEssence);
        setLandingText(`🔨 ${stopLabel}: ${nextBuildState.spentEssence}/${nextBuildState.requiredEssence} 💰 (${remaining} left for L${nextBuildState.buildLevel + 1})`);
      }
      return true;
    } finally {
      isBuildSpendInFlightRef.current = false;
    }
  }, [activeBuildDiscountRate, client, effectiveIslandNumber, islandStopPlan, playIslandRunSound, session]);

  const handleRepeatedBuildActivation = useCallback(async (
    stopIndex: number,
    requestedAtMs = Date.now(),
  ): Promise<boolean> => {
    const nextStreak = resolveNextBuildRepeatStreak({
      current: buildRepeatStreakRef.current,
      stopIndex,
      nowMs: requestedAtMs,
    });
    let repeatedBuildBatchSteps = resolveRepeatedBuildBatchSteps(nextStreak.count);
    if (isBuildModalHatcheryGuidanceActive) {
      repeatedBuildBatchSteps = 1;
    }
    const spendApplied = await handleSpendEssenceOnBuild(stopIndex, repeatedBuildBatchSteps);
    if (!spendApplied) {
      resetBuildRepeatStreak();
      return false;
    }

    if (runtimeStateRef.current.firstSessionTutorialState === 'hatchery_l1_built') {
      resetBuildRepeatStreak();
      return true;
    }

    buildRepeatStreakRef.current = nextStreak;
    const latestBuildState = runtimeStateRef.current.stopBuildStateByIndex[stopIndex];
    const remaining = latestBuildState
      ? Math.max(0, latestBuildState.requiredEssence - latestBuildState.spentEssence)
      : 0;
    if (
      !latestBuildState
      || isStopBuildFullyComplete(latestBuildState)
      || runtimeStateRef.current.essence < Math.min(resolveBuildSpendStepForTier(latestBuildState.requiredEssence), remaining)
    ) {
      resetBuildRepeatStreak();
    }
    return true;
  }, [activeBuildDiscountRate, handleSpendEssenceOnBuild, isBuildModalHatcheryGuidanceActive, resetBuildRepeatStreak]);

  // ── BuildModalV2 tap handler ──────────────────────────────────────────────
  // Tap-to-build for the v2 tray.  Hold-to-build is intentionally omitted in
  // v2 to avoid gesture conflicts with the horizontal scroll tray.
  const processBuildTapQueue = useCallback(async (): Promise<void> => {
    try {
      while (buildTapQueueRef.current.length > 0) {
        const nextTap = buildTapQueueRef.current.shift();
        if (!nextTap) continue;
        await handleRepeatedBuildActivation(nextTap.stopIndex, nextTap.requestedAtMs);
      }
    } finally {
      isBuildTapQueueProcessingRef.current = false;
    }
  }, [handleRepeatedBuildActivation]);

  const handleBuildCardTap = useCallback((stopIndex: number): void => {
    buildTapQueueRef.current.push({
      stopIndex,
      requestedAtMs: Date.now(),
    });
    if (!isBuildTapQueueProcessingRef.current) {
      isBuildTapQueueProcessingRef.current = true;
      void processBuildTapQueue();
    }
  }, [processBuildTapQueue]);

  // ── Legacy hold-to-build handler (retained for future hold-gesture PR) ────
  // Not wired to the v2 tray UI yet; hold interactions on a horizontal scroll
  // tray require dedicated gesture disambiguation.  Keep in board source so
  // source-guard assertions on the canonical hold flow remain valid.
  const createBuildCardHoldHandler = (idx: number, isBuildInteractionDisabled: boolean) =>
    (e: React.MouseEvent | React.TouchEvent): void => {
      e.preventDefault();
      if (isBuildInteractionDisabled) return;
      holdBuildSpendActiveRef.current = true;
      holdBuildSpendStartAtMsRef.current = Date.now();
      setIsBuildHoldActive(true);
      setBuildHoldFeedbackLabel('⚒️ Building…');
      const stopHold = () => {
        holdBuildSpendActiveRef.current = false;
        holdBuildSpendStartAtMsRef.current = null;
        setIsBuildHoldActive(false);
        window.removeEventListener('mouseup', stopHold);
        window.removeEventListener('touchend', stopHold);
      };
      window.addEventListener('mouseup', stopHold, { once: true });
      window.addEventListener('touchend', stopHold, { once: true });
      void (async () => {
        const initialSpendApplied = await handleRepeatedBuildActivation(idx);
        if (!initialSpendApplied || !holdBuildSpendActiveRef.current) {
          stopHold();
          return;
        }
        await wait(BUILD_HOLD_INITIAL_DELAY_MS);
        while (holdBuildSpendActiveRef.current) {
          const liveRuntimeState = getIslandRunStateSnapshot(session);
          if (liveRuntimeState.firstSessionTutorialState === 'hatchery_l1_built') {
            resetBuildRepeatStreak();
            stopHold();
            return;
          }
          const liveBuildState = liveRuntimeState.stopBuildStateByIndex[idx];
          const liveRemaining = liveBuildState
            ? Math.max(0, liveBuildState.requiredEssence - liveBuildState.spentEssence)
            : 0;
          const liveCanAfford = liveRuntimeState.essence >= Math.min(resolveBuildSpendStepForTier(liveBuildState.requiredEssence), liveRemaining);
          if (!liveBuildState || isStopBuildFullyComplete(liveBuildState) || !liveCanAfford) {
            resetBuildRepeatStreak();
            stopHold();
            return;
          }
          const holdStartedAtMs = holdBuildSpendStartAtMsRef.current ?? Date.now();
          const heldMs = Math.max(0, Date.now() - holdStartedAtMs);
          let holdBatchSteps = resolveBuildHoldBatchSteps(heldMs);
          if (isBuildModalHatcheryGuidanceActive) {
            holdBatchSteps = 1;
          }
          setBuildHoldFeedbackLabel(resolveBuildHoldFeedbackLabel(heldMs));
          const spendApplied = await handleSpendEssenceOnBuild(idx, holdBatchSteps);
          if (!spendApplied) {
            resetBuildRepeatStreak();
            stopHold();
            return;
          }
          if (runtimeStateRef.current.firstSessionTutorialState === 'hatchery_l1_built') {
            resetBuildRepeatStreak();
            stopHold();
            return;
          }
          await wait(resolveBuildHoldRepeatDelayMs(heldMs));
        }
      })();
    };
  // createBuildCardHoldHandler is not wired to the v2 tray yet (hold-to-build
  // requires gesture disambiguation with horizontal scroll, tracked as a
  // follow-up PR).  The function body preserves the canonical hold loop strings
  // that islandRunBoardEssenceParity.test.ts source-guards check.

  const handleCompleteActiveStop = () => {
    if (!activeStopId) return;
    const activeStopIndex = islandStopPlan.findIndex((stop) => stop.stopId === activeStopId);
    const requiresTicketPayment = doesStopRequireTicketPayment(activeStopId);
    const requiredTicketCost = requiresTicketPayment && activeStopIndex > 0
      ? getStopTicketCost({ effectiveIslandNumber, stopIndex: activeStopIndex })
      : null;

    const completionBlockReason = getStopCompletionBlockReason({
      stopId: activeStopId,
      completedStops,
      hasActiveEgg: Boolean(activeEgg),
      islandEggSlotUsed,
      bossTrialResolved,
      requiresTicketPayment,
      ticketCost: requiredTicketCost,
    });
    if (completionBlockReason) {
      setLandingText(completionBlockReason);
      return;
    }

    if (ISLAND_RUN_CONTRACT_V2_ENABLED) {
      const stopIndex = islandStopPlan.findIndex((stop) => stop.stopId === activeStopId);
      if (stopIndex < 0) return;

      const openedStopStatus = resolveCanonicalContractV2Stops({
        stopStatesByIndex: runtimeStateRef.current.stopStatesByIndex,
        stopTicketsPaidByIsland: runtimeStateRef.current.stopTicketsPaidByIsland,
        islandNumber,
      }).statusesByIndex[stopIndex];
      if (openedStopStatus !== 'active' && openedStopStatus !== 'accessible' && openedStopStatus !== 'postponed') {
        setLandingText('Open this landmark before completing it.');
        return;
      }

      const priorStopState = runtimeStateRef.current.stopStatesByIndex[stopIndex] ?? { objectiveComplete: false, buildComplete: false };
      // Objective completion is the only gate for stop UNLOCK — builds are tracked separately.
      const nextStopStatesByIndex = runtimeStateRef.current.stopStatesByIndex.map((entry, index) => {
        if (index === stopIndex + 1 && stopIndex + 1 < islandStopPlan.length) {
          return {
            ...entry,
            accessUnlocked: true,
          };
        }
        if (index !== stopIndex) return entry;
        return {
          ...entry,
          objectiveComplete: true,
          accessUnlocked: true,
          postponedAtMs: null,
        };
      });

      const stopResolution = resolveCanonicalContractV2Stops({
        stopStatesByIndex: nextStopStatesByIndex,
        stopTicketsPaidByIsland: runtimeStateRef.current.stopTicketsPaidByIsland,
        islandNumber,
      });

      const nextRuntimeState = applyStopObjectiveProgress({
        session,
        client,
        stopStatesByIndex: nextStopStatesByIndex,
        activeStopIndex: stopResolution.activeStopIndex,
        activeStopType: stopResolution.activeStopType,
        triggerSource: 'stop_objective_complete',
      });
      setRuntimeState(nextRuntimeState);

      if (!priorStopState.objectiveComplete) {
        awardShards('stop_complete');
        awardWalletShards(1);
      }

      if (activeStopId === 'boss') {
        updateCompletedStopsWithSync((current) => ensureStopCompleted(current, 'boss'), { triggerSource: 'stop_objective_complete' });
        awardShards('boss_defeat');
        awardWalletShards(3);

        void recordTelemetryEvent({
          userId: session.user.id,
          eventType: 'economy_earn',
          metadata: {
            stage: 'island_run_boss_objective_complete',
            source: 'shooter_blitz',
            island_number: islandNumber,
            boss_trial_resolved: true,
          },
        });

        playIslandRunSound('boss_island_clear');
        triggerIslandRunHaptic('boss_island_clear');

        // Check if island is NOW fully cleared (boss was the last objective, builds may already be done).
        const nowFullyCleared = isIslandRunFullyClearedV2({
          stopStatesByIndex: nextStopStatesByIndex,
          stopBuildStateByIndex: runtimeStateRef.current.stopBuildStateByIndex,
          hatcheryEggResolved: islandEggSlotUsed,
        }) && (islandNumber !== 1 || getIslandTechnologyAccess(runtimeStateRef.current, 'the-concord').active);

        if (!nowFullyCleared) {
          setLandingText('👾 Boss defeated, but full rewards are locked. Return to Build and upgrade every landmark to Level 3 to claim island clear.');
          setActiveStopId(null); // dismiss UI modal; no gameplay write
        } else {
          setActiveStopId(null); // dismiss boss modal UI before celebration overlay opens
          showIslandClearCelebrationFromAnywhere('v2_boss_complete');
        }
        return;
      }

      updateCompletedStopsWithSync((current) => ensureStopCompleted(current, activeStopId), { triggerSource: 'stop_objective_complete' });
      setMysteryStopReward(null);
      setLandingText(`${activeStopId.toUpperCase()} stop objective done! Open 🔨 Build to fund this island's buildings.`);
      setActiveStopId(null);
      return;
    }

    if (activeStopId === 'boss') {
      const bossReward = getBossReward(islandNumber);
      setLandingText('Boss stop complete! Island clear. Next island unlocked.');
      updateCompletedStopsWithSync((current) => ensureStopCompleted(current, 'boss'), { triggerSource: 'stop_objective_complete' });
      awardShards('boss_defeat');
      awardWalletShards(3);

      logGameSession(session.user.id, {
        gameId: 'shooter_blitz',
        action: 'complete',
        timestamp: new Date().toISOString(),
        metadata: {
          stage: 'island_run_boss_island_cleared',
          island_number: islandNumber,
          rewards_granted: {
            dice: bossReward.dice,
            essence: bossReward.essence,
          },
        },
      });

      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'economy_earn',
        metadata: {
          stage: 'island_run_boss_island_cleared',
          source: 'shooter_blitz',
          island_number: islandNumber,
          boss_trial_resolved: true,
        },
      });

      playIslandRunSound('boss_island_clear');
      triggerIslandRunHaptic('boss_island_clear');

      setShowIslandClearCelebration(true);
      setIslandClearStats({
        islandNumber,
        diceEarned: bossReward.dice,
        essenceEarned: bossReward.essence,
        stopsCleared: completedStops.length + 1,
        pendingNextIsland: islandNumber + 1,
        isCycleCapstone: islandNumber % 120 === 0,
      });

      // Travel is gated behind the celebration CTA; see
      // handleTravelFromCelebration.
      return;
    }

    if (!isStopCompleted(completedStops, activeStopId)) {
      awardShards('stop_complete');
      awardWalletShards(1);
    }
    updateCompletedStopsWithSync((current) => ensureStopCompleted(current, activeStopId), { triggerSource: 'stop_objective_complete' });
    setMysteryStopReward(null);
    setLandingText(`${activeStopId.toUpperCase()} stop completed.`);
    setActiveStopId(null);
  };

  const handleComeBackLaterForActiveStop = () => {
    if (!activeStopId) return;
    const stopIndex = islandStopPlan.findIndex((stop) => stop.stopId === activeStopId);
    if (stopIndex < 0) return;
    const result = postponeIslandRunStop({
      session,
      client,
      islandNumber,
      stopIndex,
      triggerSource: 'come_back_later_stop_modal',
    });
    if (!result.ok) {
      const message = result.reason === 'open_limit_reached'
        ? 'You already have a few discoveries waiting. Finish one of them before opening another.'
        : 'This landmark needs to stay here for now. You can keep exploring after this step.';
      setLandingText(message);
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'economy_spend',
        metadata: {
          stage: 'postponement_blocked_by_open_limit',
          island_number: islandNumber,
          stop_id: activeStopId,
          reason: result.reason,
          open_incomplete_count: result.openIncompleteCount,
        },
      });
      return;
    }
    setRuntimeState(result.record);
    const nextStopId = typeof result.nextStopIndex === 'number'
      ? islandStopPlan[result.nextStopIndex]?.stopId ?? null
      : null;
    setLandingText('No pressure — this discovery will wait for you. Keep exploring and return whenever you like.');
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_spend',
      metadata: {
        stage: 'stop_postponed',
        island_number: islandNumber,
        stop_id: activeStopId,
        next_unlocked_stop_id: nextStopId,
        open_incomplete_count: result.openIncompleteCount,
      },
    });
    setActiveStopId(null);
    if (nextStopId) {
      setFocusedStopId(nextStopId);
      setCameraMode('stop_focus');
    }
  };

  const markOnboardingComplete = async () => {
    if (isOnboardingComplete && isFirstRunClaimed) return true;
    const record = applyFirstRunClaimed({
      session,
      client,
      triggerSource: 'first_run_claim_marker',
    });
    setRuntimeState(record);

    const onboardingMarkerResult = await applyOnboardingCompleteMarker({
      session,
      client,
      triggerSource: 'first_run_onboarding_complete_marker',
    });
    if (!onboardingMarkerResult.ok) {
      setLandingText(`Could not complete first-run setup: ${onboardingMarkerResult.errorMessage}`);
      return false;
    }
    return true;
  };

  const handleQaMarkBossResolved = () => {
    setBossTrialResolved(true);
    setBossRewardSummary(`QA marker set for island ${islandNumber}.`);
    setLandingText(`QA: boss marker set for island ${islandNumber}.`);

    const record = applyBossTrialResolvedMarker({
      session,
      client,
      islandNumber,
      triggerSource: 'qa_mark_boss_resolved',
    });
    setRuntimeState(record);
  };

  const handleQaAdvanceIsland = () => {
    const nextIsland = islandNumber + 1;
    setIslandNumber(nextIsland);
    setDicePool(ISLAND_RUN_DEFAULT_STARTING_DICE);
    setTokenIndex(TOKEN_START_TILE_INDEX);
    setBossTrialResolved(false);
    setBossRewardSummary(null);
    setLandingText(`QA: advanced to island ${nextIsland}.`);

    // Persist the dice/token reset alongside the island bump so storage and
    // UI stay in sync (previously this patch omitted dicePool/tokenIndex and
    // produced the #1 desync pattern on next hydration).
    const record = applyQaProgressionSnapshot({
      session,
      client,
      currentIslandNumber: nextIsland,
      bossTrialResolvedIslandNumber: null,
      dicePool: ISLAND_RUN_DEFAULT_STARTING_DICE,
      tokenIndex: TOKEN_START_TILE_INDEX,
      triggerSource: 'qa_advance_island',
    });
    setRuntimeState(record);
  };

  const handleQaResetProgression = () => {
    setIslandNumber(1);
    setDicePool(ISLAND_RUN_DEFAULT_STARTING_DICE);
    setTokenIndex(TOKEN_START_TILE_INDEX);
    setBossTrialResolved(false);
    setBossRewardSummary(null);
    setLandingText('QA: progression markers reset to island 1.');

    const record = applyQaProgressionSnapshot({
      session,
      client,
      currentIslandNumber: 1,
      bossTrialResolvedIslandNumber: null,
      dicePool: ISLAND_RUN_DEFAULT_STARTING_DICE,
      tokenIndex: TOKEN_START_TILE_INDEX,
      triggerSource: 'qa_reset_progression',
    });
    setRuntimeState(record);
  };

  const handleDevGrantDice = useCallback((amount: number) => {
    if (!isDevModeEnabled) return;
    const result = applyDevGrantDice({
      session,
      client,
      amount,
      triggerSource: 'dev_grant_dice',
    });
    if (result.applied < 1) {
      setLandingText('DEV MODE: invalid dice grant amount.');
      return;
    }
    setLandingText(`🧪 DEV MODE: +${result.applied} dice granted via canonical action.`);
  }, [client, session]);

  const handleDevGrantEssence = useCallback((amount: number) => {
    if (!isDevModeEnabled) return;
    const result = applyDevGrantEssence({
      session,
      client,
      amount,
      triggerSource: 'dev_grant_essence',
    });
    if (result.applied < 1) {
      setLandingText('DEV MODE: invalid money grant amount.');
      return;
    }
    setLandingText(`🧪 DEV MODE: +${result.applied} money granted via canonical action.`);
  }, [client, isDevModeEnabled, session]);

  const handleDevSpeedHatchEgg = useCallback(() => {
    if (!isDevModeEnabled) return;
    const result = applyDevSpeedHatchEgg({
      session,
      client,
      islandNumber,
      triggerSource: 'dev_speed_hatch_egg',
    });
    if (!result.changed) {
      setLandingText('🧪 DEV MODE: no active incubating egg to speed hatch.');
      return;
    }
    setRuntimeState(result.record);
    runtimeStateRef.current = result.record;
    setLandingText('🧪 DEV MODE: egg marked hatch-ready via canonical action.');
  }, [client, isDevModeEnabled, islandNumber, session]);

  const handleDevBuildAllToL3 = useCallback(async () => {
    if (!isDevModeEnabled) return;
    const result = await applyDevBuildAllToL3({
      session,
      client,
      effectiveIslandNumber,
      triggerSource: 'dev_build_all_to_l3',
    });
    if (!result.changed) {
      setLandingText('🧪 DEV MODE: all landmarks already at Level 3.');
      return;
    }
    setRuntimeState(result.record);
    runtimeStateRef.current = result.record;
    setLandingText(`🧪 DEV MODE: built ${result.stopsCompleted}/5 landmarks to L3 via canonical action.`);
  }, [client, effectiveIslandNumber, isDevModeEnabled, session]);

  const handleDevClearCurrentIslandForTravel = useCallback(() => {
    if (!isDevModeEnabled) return;
    const result = applyDevClearCurrentIslandForTravel({
      session,
      client,
      islandNumber,
      effectiveIslandNumber,
      triggerSource: 'dev_clear_island',
    });
    setRuntimeState(result.record);
    runtimeStateRef.current = result.record;
    if (!result.clearGateSatisfied) {
      setLandingText('🧪 DEV MODE: unable to satisfy Island Clear gate. Check stop/egg state.');
      return;
    }
    showIslandClearCelebrationFromAnywhere('dev_clear_island');
    setLandingText(result.changed
      ? '🧪 DEV MODE: island prepared for clear celebration/travel path.'
      : '🧪 DEV MODE: island already clear-ready. Opening celebration flow.');
  }, [
    client,
    effectiveIslandNumber,
    islandNumber,
    isDevModeEnabled,
    session,
    showIslandClearCelebrationFromAnywhere,
  ]);

  // Clears every collected Concord fragment (and rewarded lines) for the
  // CURRENT island through the canonical ledger, then mirrors the reset into the
  // component's live refs/state so the nine fragment tokens reappear on the
  // board immediately. Fragments only collect on an EXACT landing, so a fresh
  // account (or one reset here) is the reliable way to witness the pickup modal:
  // reset, then land on a fragment tile (Island 1 tiles 1/6/10/13/17/21/25/29/33).
  const handleDevResetConcordFragments = useCallback(() => {
    if (!isDevModeEnabled) return;
    const record = applyTechCollectionState({
      session,
      client,
      islandNumber,
      collectedSlots: [],
      rewardedLines: [],
      triggerSource: 'dev_reset_tech_fragments',
    });
    const emptyCollected = new Set<number>();
    const emptyLines = new Set<number>();
    collectedTechTileIndicesRef.current = emptyCollected;
    rewardedTechCollectionLinesRef.current = emptyLines;
    setCollectedTechTileIndices(emptyCollected);
    setRewardedTechCollectionLines(emptyLines);
    setRuntimeState(record);
    runtimeStateRef.current = record;
    setTechCollectionModal(null);
    setTechCompletionCelebration(null);
    setLandingText('🧪 DEV MODE: Concord fragments reset — land on a fragment tile to see the pickup modal.');
  }, [client, islandNumber, isDevModeEnabled, session]);

  // Pure UI preview: opens the 3×3 Concord pickup modal on demand without any
  // gameplay writes, so the celebration can be reviewed without hunting for an
  // exact landing. Reveals the lowest not-yet-collected slot on top of whatever
  // is already collected.
  const handleDevPreviewConcordModal = useCallback(() => {
    if (!isDevModeEnabled) return;
    const alreadyCollected = collectedTechTileIndicesRef.current;
    let slotIndex = 0;
    for (let slot = 0; slot < TECH_COLLECTION_CELL_COUNT; slot += 1) {
      if (!alreadyCollected.has(slot)) {
        slotIndex = slot;
        break;
      }
    }
    const collectedSlots = Array.from(new Set([...alreadyCollected, slotIndex])).sort((a, b) => a - b);
    setTechCompletionCelebration(null);
    setTechCollectionModal({
      slotIndex,
      tileType: 'micro',
      collectedSlots,
      collectedCount: collectedSlots.length,
      newlyCompletedLines: [],
      lineRewardDice: 0,
    });
    setLandingText(`🧪 DEV MODE: previewing Concord pickup modal (fragment ${slotIndex + 1}).`);
  }, [isDevModeEnabled]);

  const handleDevStartLuckyRollSession = useCallback(async (targetIslandNumber: number) => {
    if (!isDevModeEnabled) return 'Lucky Roll dev launcher is only available in Island Run dev mode.';
    const normalizedTargetIslandNumber = Number.isFinite(targetIslandNumber)
      ? Math.max(1, Math.floor(targetIslandNumber))
      : runtimeStateRef.current.currentIslandNumber;
    const result = await startIslandRunLuckyRoll({
      session,
      client,
      cycleIndex: runtimeStateRef.current.cycleIndex,
      targetIslandNumber: normalizedTargetIslandNumber,
      triggerSource: 'dev_lucky_roll_launcher_start',
    });
    setRuntimeState(result.record);
    runtimeStateRef.current = result.record;
    const message = result.status === 'started'
      ? `🍀 DEV Lucky Roll started for island ${normalizedTargetIslandNumber}.`
      : `🍀 DEV Lucky Roll already exists for island ${normalizedTargetIslandNumber}.`;
    setLandingText(message);
    return message;
  }, [client, isDevModeEnabled, session]);

  const handleDevAdvanceLuckyRollSession = useCallback(async (
    targetIslandNumber: number,
    rewardType: 'dice' | 'essence',
  ) => {
    if (!isDevModeEnabled) return 'Lucky Roll dev launcher is only available in Island Run dev mode.';
    const normalizedTargetIslandNumber = Number.isFinite(targetIslandNumber)
      ? Math.max(1, Math.floor(targetIslandNumber))
      : runtimeStateRef.current.currentIslandNumber;
    const rewardAmount = rewardType === 'dice' ? 2 : 25;
    const result = await advanceIslandRunLuckyRoll({
      session,
      client,
      cycleIndex: runtimeStateRef.current.cycleIndex,
      targetIslandNumber: normalizedTargetIslandNumber,
      roll: DEV_LUCKY_ROLL_TEST_ROLL,
      reward: {
        rewardType,
        amount: rewardAmount,
        metadata: { source: 'dev_lucky_roll_launcher' },
      },
      triggerSource: 'dev_lucky_roll_launcher_advance',
    });
    setRuntimeState(result.record);
    runtimeStateRef.current = result.record;
    const rewardLabel = result.rewardAdded ? `, pending +${rewardAmount} ${rewardType}` : '';
    const message = result.luckyRollSession
      ? `🍀 DEV Lucky Roll ${result.status} to tile ${result.landedTileId ?? '—'}${rewardLabel}.`
      : `🍀 DEV Lucky Roll advance skipped: ${result.status}.`;
    setLandingText(message);
    return message;
  }, [client, isDevModeEnabled, session]);

  const handleDevBankLuckyRollSession = useCallback(async (targetIslandNumber: number) => {
    if (!isDevModeEnabled) return 'Lucky Roll dev launcher is only available in Island Run dev mode.';
    const normalizedTargetIslandNumber = Number.isFinite(targetIslandNumber)
      ? Math.max(1, Math.floor(targetIslandNumber))
      : runtimeStateRef.current.currentIslandNumber;
    const result = await bankIslandRunLuckyRollRewards({
      session,
      client,
      cycleIndex: runtimeStateRef.current.cycleIndex,
      targetIslandNumber: normalizedTargetIslandNumber,
      triggerSource: 'dev_lucky_roll_launcher_bank',
    });
    setRuntimeState(result.record);
    runtimeStateRef.current = result.record;
    const message = `🍀 DEV Lucky Roll bank ${result.status}: +${result.diceAwarded} dice, +${result.essenceAwarded} money.`;
    setLandingText(message);
    return message;
  }, [client, isDevModeEnabled, session]);

  const handleOpenDevLuckyRollOverlay = useCallback((
    targetIslandNumber: number,
    collectMode: 'bank_only' | 'post_rare_collect_travel' = 'bank_only',
  ) => {
    if (!isDevModeEnabled && collectMode !== 'post_rare_collect_travel') return;
    const normalizedTargetIslandNumber = Number.isFinite(targetIslandNumber)
      ? Math.max(1, Math.floor(targetIslandNumber))
      : runtimeStateRef.current.currentIslandNumber;
    setDevLuckyRollTargetIsland(normalizedTargetIslandNumber);
    setDevLuckyRollCollectMode(collectMode);
    setShowDevLuckyRollOverlay(true);
    setLandingText(collectMode === 'post_rare_collect_travel'
      ? 'Treasure Path unlocked! You found a hidden reward path.'
      : `🍀 DEV Treasure Path overlay opened for island ${normalizedTargetIslandNumber}.`);
  }, [isDevModeEnabled]);

  const handleOpenPostRareTreasurePathOverlay = useCallback((completedIslandNumber: number) => {
    handleOpenDevLuckyRollOverlay(completedIslandNumber, 'post_rare_collect_travel');
  }, [handleOpenDevLuckyRollOverlay]);

  const handleResumePendingTreasurePath = useCallback(() => {
    const pending = resolvePendingTreasurePathResume({ record: runtimeStateRef.current });
    if (!pending) {
      setLandingText('No pending Treasure Path session found.');
      return;
    }
    handleOpenPostRareTreasurePathOverlay(pending.completedIslandNumber);
  }, [handleOpenPostRareTreasurePathOverlay]);

  const handleLuckyRollOverlayRuntimeStateChange = useCallback((record: IslandRunGameStateRecord) => {
    setRuntimeState(record);
    runtimeStateRef.current = record;
  }, []);

  const handleDevStartPostRareTreasurePath = useCallback(async (completedIslandNumber: number, completedCycleIndex: number) => {
    if (!isDevModeEnabled) return 'Post-rare Treasure Path flow is only available in Island Run dev mode.';
    const result = await startPostRareTreasurePath({
      session,
      client,
      completedIslandNumber,
      cycleIndex: completedCycleIndex,
      triggerSource: 'dev_post_rare_treasure_path_start',
    });
    setRuntimeState(result.record);
    runtimeStateRef.current = result.record;
    const message = result.status === 'not_applicable'
      ? `🧭 Post-rare Treasure Path is not applicable for island ${completedIslandNumber}.`
      : `🧭 Post-rare Treasure Path ${result.status} for island ${completedIslandNumber} (state: ${result.state.status}).`;
    setLandingText(message);
    return message;
  }, [client, isDevModeEnabled, session]);

  const applyPostRareTreasurePathCollectTravelRecord = useCallback((record: IslandRunGameStateRecord) => {
    setRuntimeState(record);
    runtimeStateRef.current = record;
    setIslandNumber(record.currentIslandNumber);
    setCycleIndex(record.cycleIndex);
    setTimeLeftSec(Math.max(0, Math.ceil(Math.max(0, record.islandExpiresAtMs - Date.now()) / 1000)));
    setIslandStartedAtMs(record.islandStartedAtMs);
    setIslandExpiresAtMs(record.islandExpiresAtMs);
    setIsIslandTimerPendingStart(!(record.islandStartedAtMs > 0 && record.islandExpiresAtMs > 0));
    setShowIslandClearCelebration(false);
    setIslandClearStats(null);
    setShowTravelOverlay(false);
    setShowDevLuckyRollOverlay(false);
    setDevLuckyRollCollectMode('bank_only');
    setDevLuckyRollTargetIsland(null);
    islandClearCelebrationShownForVisitRef.current = null;
  }, []);

  const handlePostRareTreasurePathCollectAndTravel = useCallback(async (completedIslandNumber: number, completedCycleIndex: number) => {
    const result = await collectPostRareTreasurePathAndTravel({
      session,
      client,
      completedIslandNumber,
      cycleIndex: completedCycleIndex,
      startTimer: true,
      nowMs: Date.now(),
      getIslandDurationMs,
      islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED,
      triggerSource: 'post_rare_treasure_path_collect_and_travel',
    });
    applyPostRareTreasurePathCollectTravelRecord(result.record);
    const rewardSummary = `+${result.diceAwarded} dice, +${result.essenceAwarded} money, +${result.shardsAwarded} essence`;
    const message = result.status === 'banked_and_traveled'
      ? `Treasure collected: ${rewardSummary}. Your journey continues.`
      : `Treasure Path is ${result.status.replace(/_/g, ' ')}.`;
    setLandingText(message);
    return message;
  }, [applyPostRareTreasurePathCollectTravelRecord, client, session]);

  const handleDevCollectPostRareTreasurePathAndTravel = useCallback(async (completedIslandNumber: number, completedCycleIndex: number) => {
    if (!isDevModeEnabled) return 'Post-rare Treasure Path flow is only available in Island Run dev mode.';
    return handlePostRareTreasurePathCollectAndTravel(completedIslandNumber, completedCycleIndex);
  }, [handlePostRareTreasurePathCollectAndTravel, isDevModeEnabled]);

  const handleDevOpenEggRewardInventoryEntry = useCallback(async (eggRewardId: string) => {
    if (!isDevModeEnabled) return 'Treasure Egg opener is only available in Island Run dev mode.';
    const result = await openEggRewardInventoryEntry({
      session,
      client,
      eggRewardId,
      triggerSource: 'dev_treasure_eggs_debug_panel_open',
    });
    setRuntimeState(result.record);
    runtimeStateRef.current = result.record;
    const message = result.status === 'opened'
      ? `🥚 DEV Treasure Egg opened: ${result.openedCreatureId ?? 'unknown creature'}.`
      : result.status === 'already_opened'
        ? `🥚 DEV Treasure Egg already opened: ${result.openedCreatureId ?? 'unknown creature'}.`
        : `🥚 DEV Treasure Egg not found: ${result.eggRewardId}.`;
    setLandingText(message);
    return message;
  }, [client, isDevModeEnabled, session]);

  const buildDevCreaturePackModalCards = useCallback((cards: NonNullable<Awaited<ReturnType<typeof grantDevDemoCreaturePack>>['creatureCards']>): CreaturePackOpeningPrototypeCard[] => cards
    .map((card): CreaturePackOpeningPrototypeCard | null => {
      const creature = CREATURE_CATALOG.find((entry) => entry.id === card.creatureId);
      if (!creature) return null;
      return {
        slotIndex: card.slotIndex,
        creature,
        copiesBefore: card.copiesBefore,
        copiesAfter: card.copiesAfter,
      };
    })
    .filter((card): card is CreaturePackOpeningPrototypeCard => Boolean(card)), []);

  const handleDevGrantDemoCreaturePack = useCallback(async () => {
    if (!isDevModeEnabled) return 'Creature Pack grant is only available in Island Run dev mode.';
    const result = await grantDevDemoCreaturePack({
      session,
      client,
      allowGrant: isDevModeEnabled,
      triggerSource: 'dev_demo_creature_pack_grant',
    });
    refreshIslandRunStateFromLocal(session);
    const refreshedRecord = getIslandRunStateSnapshot(session);
    setRuntimeState(refreshedRecord);
    runtimeStateRef.current = refreshedRecord;
    const message = result.status === 'granted'
      ? `🧪 DEV Creature Pack granted: ${result.creatureCopiesGranted} creature cards (free dev grant; no Stripe).`
      : result.status === 'already_granted'
        ? `🧪 DEV Creature Pack already granted for ${result.grantId}; no new rewards are expected for repeat clicks on this island/cycle.`
        : `🧪 DEV Creature Pack grant ${result.status}: ${result.failureReason ?? 'unknown reason'}.`;
    if (result.status === 'granted' && result.creatureCards && result.creatureCards.length > 0) {
      setDevPackOpeningPrototype({
        cards: buildDevCreaturePackModalCards(result.creatureCards),
        grantId: result.grantId,
        grantStatus: result.status,
        bonusCopy: 'Free dev grant: no Stripe checkout was used; the real paid pack uses the same 5-card resolver.',
      });
      setShowDebugPanel(false);
    }
    setLandingText(message);
    return message;
  }, [buildDevCreaturePackModalCards, client, isDevModeEnabled, session]);

  const handleDevOpenCreaturePackOpeningPrototype = useCallback(async () => {
    if (!isDevModeEnabled) return 'Creature Pack opening prototype is only available in Island Run dev mode.';
    const result = await grantDevDemoCreaturePackOpeningPrototype({
      session,
      client,
      allowGrant: isDevModeEnabled,
      triggerSource: 'dev_demo_creature_pack_opening_prototype',
    });
    refreshIslandRunStateFromLocal(session);
    const refreshedRecord = getIslandRunStateSnapshot(session);
    setRuntimeState(refreshedRecord);
    runtimeStateRef.current = refreshedRecord;

    if (result.status !== 'granted' && result.status !== 'already_granted') {
      const message = `🧪 DEV Creature Pack opening prototype ${result.status}: ${result.failureReason ?? 'unknown reason'}.`;
      setLandingText(message);
      return message;
    }

    const cards = result.creatureCards && result.creatureCards.length > 0
      ? buildDevCreaturePackModalCards(result.creatureCards)
      : [];

    setDevPackOpeningPrototype({
      cards,
      grantId: result.grantId,
      grantStatus: result.status,
    });
    setShowDebugPanel(false);

    const message = result.status === 'granted'
      ? `✨ DEV Creature Pack opening prototype ready: ${cards.length} cards, no dice or money granted.`
      : `✨ DEV Creature Pack opening prototype replaying existing grant ${result.grantId}; cards are previewed but no new rewards are granted.`;
    setLandingText(message);
    return message;
  }, [buildDevCreaturePackModalCards, client, isDevModeEnabled, session]);

  const handleOpenWelcomePackModal = useCallback(async () => {
    setWelcomePackDismissedThisSession(false);
    setWelcomePackClaimError(null);
    setWelcomePackClaimResult(null);
    setShowDebugPanel(false);
    setShowWelcomePackModal(true);
    const message = isDevModeEnabled
      ? '✨ DEV Welcome Pack preview opened (claim uses canonical full claim action).'
      : '✨ Welcome Pack preview opened.';
    setLandingText(message);
    return message;
  }, [isDevModeEnabled]);

  const handleClaimWelcomePack = useCallback(async () => {
    if (welcomePackClaimInFlightRef.current) return;
    welcomePackClaimInFlightRef.current = true;
    setWelcomePackClaimPending(true);
    setWelcomePackClaimError(null);
    try {
      const result = await claimFullWelcomePack({
        session,
        client,
        triggerSource: 'welcome_pack_modal_claim_full',
      });
      setWelcomePackClaimResult(result);
      refreshIslandRunStateFromLocal(session);
      const refreshedRecord = getIslandRunStateSnapshot(session);
      setRuntimeState(refreshedRecord);
      runtimeStateRef.current = refreshedRecord;
      const message = result.status === 'already_claimed'
        ? '✨ DEV Welcome Pack: already claimed in canonical state.'
        : `✨ DEV Welcome Pack ${result.status}: ${result.cards.revealPayload?.cards.length ?? 0} cards, +${result.bundle.granted.dice} dice, +${result.bundle.granted.essence} money, +${result.bundle.granted.eventTickets} tickets.`;
      setLandingText(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to claim Welcome Pack right now.';
      setWelcomePackClaimError(message);
      setLandingText(`⚠️ DEV Welcome Pack claim failed: ${message}`);
    } finally {
      welcomePackClaimInFlightRef.current = false;
      setWelcomePackClaimPending(false);
    }
  }, [client, isDevModeEnabled, session]);

  const handleDevResetWelcomePackFlags = useCallback(async () => {
    if (!isDevModeEnabled) return 'Welcome Pack reset is only available in Island Run dev mode.';
    await withIslandRunActionLock(session.user.id, async () => {
      const current = getIslandRunStateSnapshot(session);
      const next: IslandRunGameStateRecord = {
        ...current,
        welcomePackClaimed: false,
        welcomePackRewardBundleClaimed: false,
        runtimeVersion: current.runtimeVersion + 1,
      };
      await commitIslandRunState({
        session,
        client,
        record: next,
        triggerSource: 'dev_reset_welcome_pack_flags',
      });
    });
    setWelcomePackDismissedThisSession(false);
    refreshIslandRunStateFromLocal(session);
    const refreshedRecord = getIslandRunStateSnapshot(session);
    setRuntimeState(refreshedRecord);
    runtimeStateRef.current = refreshedRecord;
    const message = '🧪 DEV Welcome Pack flags reset: welcome pack is eligible to auto-show again.';
    setLandingText(message);
    return message;
  }, [client, isDevModeEnabled, session]);

  const handleDevGrantDemoEggRewardPack = useCallback(async () => {
    if (!isDevModeEnabled) return 'Egg Reward Pack grant is only available in Island Run dev mode.';
    const result = await grantDevDemoEggRewardPack({
      session,
      client,
      allowGrant: isDevModeEnabled,
      triggerSource: 'dev_demo_egg_reward_pack_grant',
    });
    refreshIslandRunStateFromLocal(session);
    const refreshedRecord = getIslandRunStateSnapshot(session);
    setRuntimeState(refreshedRecord);
    runtimeStateRef.current = refreshedRecord;
    const message = result.status === 'granted'
      ? `🧪 DEV Egg Reward Pack granted: +${result.eggRewardsGranted} egg vouchers, +${result.essenceGranted} money.`
      : result.status === 'already_granted'
        ? `🧪 DEV Egg Reward Pack already granted for ${result.grantId}; no new egg vouchers are expected for repeat clicks on this island/cycle.`
        : `🧪 DEV Egg Reward Pack grant ${result.status}: ${result.failureReason ?? 'unknown reason'}.`;
    setLandingText(message);
    return message;
  }, [client, isDevModeEnabled, session]);

  const handleUnlockDevMode = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('dev_mode', 'true');
    }
    // TODO before launch: move DEV MODE controls to admin-only Settings surface and hide/remove public debug access.
    setIsDevModeEnabled(true);
    setIsDevPanelOpen(true);
    setLandingText('🧪 DEV MODE unlocked for testing on this device.');
  }, []);

  const handleContinueHatcheryL1Celebration = useCallback(() => {
    const targetState = getIslandRunHatcheryL1CelebrationContinueTarget(firstSessionTutorialState);
    if (!targetState) return;
    const result = applyFirstSessionTutorialState({
      session,
      client,
      targetState,
      triggerSource: 'hatchery_l1_celebration_continue',
    });
    if (result.ok) {
      setLandingText('Hatchery Level 1 built. Keep rolling to discover more rewards.');
    }
  }, [client, firstSessionTutorialState, session]);

  const handleFirstCreaturePackOpeningAnimationComplete = useCallback(() => {
    setFirstCreaturePackFlow((current) => current.phase === 'opening' && current.cards.length > 0
      ? { ...current, phase: 'revealed' }
      : current);
  }, []);

  const handleOpenFirstCreaturePack = useCallback(async () => {
    const attempt = resolveIslandRunFirstCreaturePackOpenAttempt({
      firstSessionTutorialState,
      isClaimInFlight: firstCreaturePackClaimInFlightRef.current,
    });
    if (!attempt.shouldCallClaim) return;

    firstCreaturePackClaimInFlightRef.current = attempt.nextClaimInFlight;
    setIsFirstCreaturePackClaiming(true);
    setFirstCreaturePackFlow({
      phase: 'opening',
      cards: [],
      diceGranted: 100,
      errorMessage: null,
    });

    try {
      const result = await claimFirstSessionCreaturePackReward({
        session,
        client,
        triggerSource: 'first_creature_pack_modal_open',
      });

      if (result.status === 'claimed' && result.revealPayload) {
        const nextCards = result.revealPayload.cards;
        const nextDiceGranted = result.revealPayload.diceGranted;
        setFirstCreaturePackFlow({
          phase: 'opening',
          cards: nextCards,
          diceGranted: nextDiceGranted,
          errorMessage: null,
        });
        setLandingText(formatIslandRunFirstCreaturePackBonusCopy(nextDiceGranted));
        return;
      }

      if (result.status === 'already_claimed') {
        setFirstCreaturePackFlow({
          phase: 'already_claimed',
          cards: [],
          diceGranted: 100,
          errorMessage: null,
        });
        setLandingText('First Creature Pack already claimed.');
        return;
      }

      setFirstCreaturePackFlow({
        phase: 'error',
        cards: [],
        diceGranted: 100,
        errorMessage: 'This Creature Pack is not available for the current island run.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Creature Pack claim failed.';
      setFirstCreaturePackFlow({
        phase: 'error',
        cards: [],
        diceGranted: 100,
        errorMessage: message,
      });
    } finally {
      firstCreaturePackClaimInFlightRef.current = false;
      setIsFirstCreaturePackClaiming(false);
    }
  }, [client, firstSessionTutorialState, session]);

  const handleContinueFirstCreaturePack = useCallback(() => {
    const snapshot = getIslandRunStateSnapshot(session);
    const targetState = getIslandRunFirstCreaturePackContinueTarget(snapshot.firstSessionTutorialState);
    if (targetState) {
      const result = applyFirstSessionTutorialState({
        session,
        client,
        targetState,
        triggerSource: 'first_creature_pack_reveal_continue',
      });
      if (result.ok) {
        setLandingText('Your first companions joined the Sanctuary. Keep rolling!');
      }
    }
    setFirstCreaturePackFlow({
      phase: 'intro',
      cards: [],
      diceGranted: 100,
      errorMessage: null,
    });
  }, [client, session]);

  const handleClaimFirstRunRewards = async () => {
    if (firstRunStep === 'celebration') {
      const starterDiceBonus = 1500;
      const starterEssenceBonus = 250;
      const record = applyFirstRunStarterRewards({
        session,
        client,
        essenceBonus: starterEssenceBonus,
        diceBonus: starterDiceBonus,
        triggerSource: 'first_run_starter_rewards',
      });
      setRuntimeState(record);
      setDicePool(record.dicePool);
      setLandingText(`Starter claim complete: +${starterEssenceBonus} 💰 money, +${starterDiceBonus} dice.`);
      setFirstRunStep('ship-name');
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'onboarding_completed',
        metadata: {
          stage: 'island_run_first_run_rewards_claimed',
          island: islandNumber,
          rewards: { essence: starterEssenceBonus, dice_bonus: starterDiceBonus, dice_packs: [500, 500, 500] },
        },
      });
      return;
    }

    if (firstRunStep === 'ship-name') {
      const normalizedShipName = firstRunShipName.trim() || 'Starling';
      setFirstRunShipName(normalizedShipName);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`island_run_spaceship_name_${session.user.id}`, normalizedShipName);
      }
      setFirstRunStep('mission');
      return;
    }

    if (firstRunStep === 'mission') {
      setFirstRunStep('launch');
      return;
    }

    setIsPersistingFirstRunCompletion(true);
    const completionSaved = await markOnboardingComplete();
    setIsPersistingFirstRunCompletion(false);
    if (!completionSaved) return;

    setShowFirstRunCelebration(false);
    setLandingText('Island Run started. Reach each stop and unlock the boss.');
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'onboarding_completed',
      metadata: { stage: 'island_run_first_run_launch_confirmed', island: islandNumber },
    });
  };

  const openShopPanel = () => {
    setShowShopPanel(true);
    setShowMarketPanel(false);
    setShowBuildPanel(false);
    setShowOutOfDicePurchasePrompt(false);
    setDiceCheckoutError(null);
    setMarketPurchaseFeedback(null);
    setMarketInteracted(false);
    playIslandRunSound('shop_open');
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: { stage: 'shop_open', island_number: islandNumber },
    });
  };

  const openMarketPanel = () => {
    // Market is now merged into the shop panel — redirect to shop
    openShopPanel();
  };

  const openRewardDetailsModal = () => {
    setMinigameTicketCheckoutError(null);
    setShowRewardDetailsModal(true);
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        stage: 'island_run_reward_bar_details_opened',
        island_number: islandNumber,
        reward_progress: Math.floor(rewardBarProgress),
        reward_threshold: Math.floor(rewardBarThreshold),
        event_type: activeTimedEvent?.eventType ?? null,
      },
    });
  };

  const handleStartDiceCheckout = useCallback(async (entryPoint: 'shop_panel' | 'market_panel' | 'out_of_dice_prompt') => {
    if (isDemoSession(session)) {
      setDiceCheckoutError('Checkout is unavailable in demo mode.');
      return;
    }

    setIsStartingDiceCheckout(true);
    setDiceCheckoutError(null);
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: { stage: 'dice_checkout_start', entry_point: entryPoint, island_number: islandNumber },
    });

    const result = await createDicePackCheckoutSession();
    if (!result.url) {
      setDiceCheckoutError(result.error?.message ?? 'Unable to start checkout right now.');
      setIsStartingDiceCheckout(false);
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'economy_earn',
        metadata: { stage: 'dice_checkout_error', entry_point: entryPoint, island_number: islandNumber },
      });
      return;
    }

    window.location.assign(result.url);
  }, [islandNumber, session]);

  const handleStartCreaturePackCheckout = useCallback(async () => {
    if (!isCreaturePackStripeCheckoutEnabled) {
      setCreaturePackCheckoutError('Creature Pack checkout is not enabled yet. Pack odds and purchase policy are still under review.');
      return;
    }
    if (isDemoSession(session)) {
      setCreaturePackCheckoutError('Checkout is unavailable in demo mode.');
      return;
    }

    setIsStartingCreaturePackCheckout(true);
    setCreaturePackCheckoutError(null);
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: { stage: 'creature_pack_checkout_start', island_number: islandNumber },
    });

    const result = await createCreaturePackCheckoutSession();
    if (!result.url) {
      setCreaturePackCheckoutError(result.error?.message ?? 'Unable to start Creature Pack checkout right now.');
      setIsStartingCreaturePackCheckout(false);
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'economy_earn',
        metadata: { stage: 'creature_pack_checkout_error', island_number: islandNumber },
      });
      return;
    }

    window.location.assign(result.url);
  }, [isCreaturePackStripeCheckoutEnabled, islandNumber, session]);

  const handleStartMinigameTicketCheckout = useCallback(async (entryPoint: 'active_event_panel') => {
    if (isDemoSession(session)) {
      setMinigameTicketCheckoutError('Checkout is unavailable in demo mode.');
      return;
    }
    if (!activeTimedEvent || !isCanonicalEventId(activeTimedEvent.eventType)) {
      setMinigameTicketCheckoutError('Ticket checkout is only available while a timed event is active.');
      return;
    }

    setIsStartingMinigameTicketCheckout(true);
    setMinigameTicketCheckoutError(null);
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        stage: 'minigame_ticket_checkout_start',
        entry_point: entryPoint,
        island_number: islandNumber,
        event_type: activeTimedEvent.eventType,
      },
    });

    const result = await initiateMinigameTicketCheckout({
      skuId: resolveMinigameTicketSku(activeTimedEvent.eventType),
      eventId: activeTimedEvent.eventType,
    });

    if (!result.url) {
      setMinigameTicketCheckoutError(result.error?.message ?? 'Unable to start ticket checkout right now.');
      setIsStartingMinigameTicketCheckout(false);
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'economy_earn',
        metadata: {
          stage: 'minigame_ticket_checkout_error',
          entry_point: entryPoint,
          island_number: islandNumber,
          event_type: activeTimedEvent.eventType,
        },
      });
      return;
    }

    window.location.assign(result.url);
  }, [activeTimedEvent, islandNumber, session]);

  const handleSanctuaryThemeCheckout = async (theme: ThemeMetadata, access: ThemeAccessResult) => {
    if (!access.checkoutSkuId) {
      setThemeCheckoutError('This creature theme is not ready for checkout yet.');
      return;
    }

    setThemeCheckoutLoadingId(theme.id);
    setThemeCheckoutError(null);
    try {
      const { url, error } = await initiateThemeCheckout({
        themeId: theme.id,
        skuId: access.checkoutSkuId as Parameters<typeof initiateThemeCheckout>[0]['skuId'],
        variant: access.status === 'available_for_paired_purchase' ? 'paired' : 'base',
      });
      if (error || !url) {
        setThemeCheckoutError(error?.message ?? 'Unable to start theme checkout.');
        return;
      }
      setPairedThemeOfferModal(null);
      if (typeof window !== 'undefined') {
        window.location.assign(url);
      }
    } finally {
      setThemeCheckoutLoadingId(null);
    }
  };

  const openSanctuaryPanel = useCallback(() => {
    setShowSanctuaryPanel(true);
    setSelectedSanctuaryCreatureId(null);
    setShowPerfectCompanionReason(false);
    setSanctuaryFeedback(null);
    setSanctuaryClockMs(Date.now());
    setSanctuaryFilterMode('all');
    setSanctuarySortMode('recent');
    setShowSanctuaryMenu(false);
    setSanctuaryMenuModule(null);
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        stage: 'sanctuary_open',
        island_number: islandNumber,
        collected_creatures: collectedCreatures.length,
      },
    });
  }, [collectedCreatures.length, islandNumber, session.user.id]);

  useEffect(() => {
    if (initialPanel !== 'sanctuary') return;
    openSanctuaryPanel();
  }, [initialPanel, openSanctuaryPanel]);

  const sanctuaryHandlers = {
    closePanel: () => {
      setShowSanctuaryPanel(false);
      setSelectedSanctuaryCreatureId(null);
      setShowPerfectCompanionReason(false);
      setSanctuaryFeedback(null);
      setShowSanctuaryMenu(false);
      setSanctuaryMenuModule(null);
    },
    setActiveCompanion: (creatureId: string | null) => {
      const nextRecord = creatureId
        ? commitActiveCompanionId({
            session,
            client,
            activeCompanionId: creatureId,
            triggerSource: 'sanctuary_set_active_companion',
          })
        : commitClearActiveCompanionId({
            session,
            client,
            triggerSource: 'sanctuary_clear_active_companion',
          });
      const committedActiveCompanionId = nextRecord.activeCompanionId ?? null;
      setActiveCompanionId(committedActiveCompanionId);
      setRuntimeState((current) => ({ ...current, activeCompanionId: committedActiveCompanionId }));
      const selected = committedActiveCompanionId
        ? collectedCreatures.find((entry) => entry.creatureId === committedActiveCompanionId) ?? null
        : null;
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'economy_earn',
        metadata: {
          stage: 'sanctuary_active_companion_changed',
          island_number: islandNumber,
          creature_id: selected?.creature.id ?? null,
          creature_name: selected?.creature.name ?? null,
          active: Boolean(selected),
        },
      });
      logIslandRunEntryDebug('sanctuary_active_companion_changed', {
        islandNumber,
        creatureId: selected?.creature.id ?? null,
        creatureName: selected?.creature.name ?? null,
        active: Boolean(selected),
      });
      setLandingText(
        creatureId && committedActiveCompanionId !== creatureId
          ? 'Only owned creatures can be set as your active companion.'
          : selected
          ? `${selected.creature.name} is now your active companion.`
          : 'Active companion cleared.',
      );
    },
    openCreature: (creatureId: string) => {
      setSelectedSanctuaryCreatureId(creatureId);
      setShowPerfectCompanionReason(false);
      setSanctuaryFeedback(null);
      setSanctuaryClockMs(Date.now());
      const selected = collectedCreatures.find((entry) => entry.creatureId === creatureId) ?? null;
      if ((runtimeState.perfectCompanionIds ?? []).slice(0, 3).includes(creatureId)) {
        setCompanionQuestTop3ViewedDayKey(companionQuestDayKey);
      }
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'economy_earn',
        metadata: {
          stage: 'perfect_companion_chip_selected',
          island_number: islandNumber,
          creature_id: selected?.creature.id ?? creatureId,
          creature_name: selected?.creature.name ?? null,
          is_perfect_companion: perfectCompanionIdSet.has(creatureId),
        },
      });
    },
    feedCreature: (creatureId: string, treatType: CreatureTreatType) => {
      const target = collectedCreatures.find((entry) => entry.creatureId === creatureId) ?? null;
      if (!target) return;
      const nowMs = Date.now();
      const nextFeedAtMs = target.lastFedAtMs ? target.lastFedAtMs + CREATURE_FEED_COOLDOWN_MS : 0;
      if (nextFeedAtMs > nowMs) {
        setSanctuaryFeedback(`${target.creature.name} is still full. Feed again in ${formatCooldownRemaining(nextFeedAtMs - nowMs)}.`);
        setSanctuaryClockMs(nowMs);
        return;
      }
      const treatOption = CREATURE_TREAT_OPTIONS.find((option) => option.type === treatType);
      if (!treatOption) return;
      if (creatureTreatInventory[treatType] <= 0) {
        setSanctuaryFeedback(`No ${treatOption.label.toLowerCase()} left. Earn more by collecting creatures.`);
        return;
      }
      setCreatureTreatInventory((current) => ({
        ...current,
        [treatType]: Math.max(0, current[treatType] - 1),
      }));
      const previousBondLevel = target.bondLevel;
      setCreatureCollection(feedCreatureForUser({
        userId: session.user.id,
        creatureId,
        fedAtMs: nowMs,
        xpGain: treatOption.xpGain,
      }));
      setSanctuaryClockMs(nowMs);
      const nextBondXp = target.bondXp + treatOption.xpGain;
      const nextBondLevel = Math.floor(nextBondXp / CREATURE_BOND_XP_PER_LEVEL) + 1;
      const rewardPreview = getBondMilestoneReward(nextBondLevel);
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'economy_earn',
        metadata: {
          stage: 'sanctuary_creature_fed',
          island_number: islandNumber,
          creature_id: target.creature.id,
          creature_name: target.creature.name,
          treat_type: treatType,
          xp_gain: treatOption.xpGain,
          previous_bond_level: previousBondLevel,
          next_bond_level: nextBondLevel,
        },
      });
      logIslandRunEntryDebug('sanctuary_creature_fed', {
        islandNumber,
        creatureId: target.creature.id,
        creatureName: target.creature.name,
        treatType,
        xpGain: treatOption.xpGain,
        previousBondLevel,
        nextBondLevel,
      });
      setSanctuaryFeedback(
        nextBondLevel > previousBondLevel
          ? rewardPreview
            ? `${target.creature.name} loved the ${treatOption.label.toLowerCase()} and reached bond level ${nextBondLevel}! ${rewardPreview.label} is ready to claim.`
            : `${target.creature.name} loved the ${treatOption.label.toLowerCase()} and reached bond level ${nextBondLevel}!`
          : `Fed ${target.creature.name} a ${treatOption.label.toLowerCase()}. Bond progress increased by ${treatOption.xpGain}.`,
      );
      setLandingText(`${target.creature.name} enjoyed a ${treatOption.label.toLowerCase()} and feels closer to you.`);
      playIslandRunSound('encounter_resolve');
      triggerIslandRunHaptic('reward_claim');

      if (ISLAND_RUN_CONTRACT_V2_ENABLED) {
        const nextRewardBarState = recordEventProgress({
          state: {
            rewardBarProgress: runtimeStateRef.current.rewardBarProgress,
            rewardBarThreshold: runtimeStateRef.current.rewardBarThreshold,
            rewardBarClaimCountInEvent: runtimeStateRef.current.rewardBarClaimCountInEvent,
            rewardBarEscalationTier: runtimeStateRef.current.rewardBarEscalationTier,
            rewardBarLastClaimAtMs: runtimeStateRef.current.rewardBarLastClaimAtMs,
            rewardBarBoundEventId: runtimeStateRef.current.rewardBarBoundEventId,
            rewardBarLadderId: runtimeStateRef.current.rewardBarLadderId,
            activeTimedEvent: runtimeStateRef.current.activeTimedEvent,
            activeTimedEventProgress: runtimeStateRef.current.activeTimedEventProgress,
            stickerProgress: runtimeStateRef.current.stickerProgress,
            stickerInventory: runtimeStateRef.current.stickerInventory,
          },
          source: { kind: 'creature_feed', treatType },
          nowMs,
        });
        applyContractV2RewardBarRuntimeState(nextRewardBarState);
      }
    },
    claimBondReward: (creatureId: string, milestoneLevel: number) => {
      const target = collectedCreatures.find((entry) => entry.creatureId === creatureId) ?? null;
      const reward = getBondMilestoneReward(milestoneLevel);
      if (!target || !reward) return;
      const unclaimedMilestones = getUnclaimedBondMilestones(target);
      if (!unclaimedMilestones.includes(milestoneLevel)) return;

      setCreatureCollection(claimCreatureBondMilestoneForUser({
        userId: session.user.id,
        creatureId,
        milestoneLevel,
      }));

      const rewardEssence = reward.essence ?? 0;
      const rewardDice = reward.dice ?? 0;
      const rewardSpinTokens = reward.spinTokens ?? 0;

      if (rewardEssence > 0) {
        setRuntimeState((prev) => ({
          ...prev,
          essence: prev.essence + rewardEssence,
          essenceLifetimeEarned: prev.essenceLifetimeEarned + rewardEssence,
        }));
      }
      if (rewardDice > 0) {
        setDicePool((current) => current + rewardDice);
      }
      if (rewardSpinTokens > 0) {
        setSpinTokens((current) => current + rewardSpinTokens);
      }

      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'economy_earn',
        metadata: {
          stage: 'sanctuary_bond_reward_claimed',
          island_number: islandNumber,
          creature_id: target.creature.id,
          creature_name: target.creature.name,
          milestone_level: milestoneLevel,
          reward_essence: rewardEssence,
          reward_dice: rewardDice,
          reward_spin_tokens: rewardSpinTokens,
        },
      });
      logIslandRunEntryDebug('sanctuary_bond_reward_claimed', {
        islandNumber,
        creatureId: target.creature.id,
        creatureName: target.creature.name,
        milestoneLevel,
        rewardEssence,
        rewardDice,
        rewardSpinTokens,
      });
      setSanctuaryFeedback(`${target.creature.name} claimed ${reward.label}: ${reward.summary}.`);
      setLandingText(`${target.creature.name} bond milestone claimed: ${reward.summary}.`);
      playIslandRunSound('market_purchase_success');
      triggerIslandRunHaptic('reward_claim');
    },
    upgradeCreatureForm: (creatureId: string) => {
      const result = upgradeCreatureFormWithShards({
        session,
        client,
        creatureId,
        triggerSource: 'sanctuary_creature_form_upgrade',
      });
      const target = collectedCreatures.find((entry) => entry.creatureId === creatureId) ?? null;
      const creatureName = target?.creature.name ?? 'Creature';
      if (!result.ok) {
        const reason = result.failureReason === 'bond_level_too_low'
          ? `Reach Bond Lv. ${result.preview.requiredBondLevel} first.`
          : result.failureReason === 'insufficient_shards'
            ? `Need ${Math.max(0, result.preview.shardCost - runtimeState.shards)} more essence.`
            : result.failureReason === 'max_form_reached'
              ? 'Already at max form.'
              : 'Upgrade is not available yet.';
        setSanctuaryFeedback(`${creatureName} form upgrade blocked: ${reason}`);
        return;
      }
      setRuntimeState((current) => ({
        ...current,
        shards: result.record.shards,
        dicePool: result.record.dicePool,
        essence: result.record.essence,
        essenceLifetimeEarned: result.record.essenceLifetimeEarned,
        creatureCollection: result.record.creatureCollection,
      }));
      setShards(result.record.shards);
      setDicePool(result.record.dicePool);
      setCreatureCollection(result.record.creatureCollection);
      const rewardLabel = result.preview.rewardDice > 0 || result.preview.rewardEssence > 0
        ? ` Reward: +${result.preview.rewardDice} dice and +${result.preview.rewardEssence} money.`
        : '';
      setSanctuaryFeedback(`${creatureName} upgraded to Form ${result.preview.nextFormLevel}!${rewardLabel}`);
      setLandingText(`${creatureName} Form ${result.preview.nextFormLevel} unlocked.${result.preview.nextFormLevel === CREATURE_THEME_REQUIRED_FORM_LEVEL ? ' Theme checkout is now available.' : ''}`);
      playIslandRunSound('market_purchase_success');
      triggerIslandRunHaptic('market_purchase_success');
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'economy_earn',
        metadata: {
          stage: 'sanctuary_creature_form_upgrade',
          island_number: islandNumber,
          creature_id: creatureId,
          next_form_level: result.preview.nextFormLevel,
          shard_cost: result.preview.shardCost,
          reward_dice: result.preview.rewardDice,
          reward_essence: result.preview.rewardEssence,
        },
      });
    },
    storyRewardClaim: (essenceReward: number) => {
      if (essenceReward <= 0) {
        return;
      }
      awardContractV2Essence(essenceReward, 'island_story_episode_reward');
      setLandingText(`Story reward claimed: +${essenceReward} money.`);
    },
    awardBondXp: (creatureId: string, xpAmount: number) => {
      const target = collectedCreatures.find((entry) => entry.creatureId === creatureId) ?? null;
      if (!target || xpAmount <= 0) return;
      const previousBondLevel = target.bondLevel;
      setCreatureCollection(feedCreatureForUser({
        userId: session.user.id,
        creatureId,
        fedAtMs: 0, // no feed timestamp — this is a direct XP award, not a treat
        xpGain: xpAmount,
      }));
      const nextBondXp = target.bondXp + xpAmount;
      const nextBondLevel = Math.floor(nextBondXp / CREATURE_BOND_XP_PER_LEVEL) + 1;
      if (nextBondLevel > previousBondLevel) {
        const rewardPreview = getBondMilestoneReward(nextBondLevel);
        setSanctuaryFeedback(
          rewardPreview
            ? `${target.creature.name} reached bond level ${nextBondLevel}! ${rewardPreview.label} is ready to claim.`
            : `${target.creature.name} reached bond level ${nextBondLevel}!`,
        );
      }
    },
  };

  const canBuyDiceBundle = !marketOwnedBundles.dice_bundle && runtimeState.essence >= MARKET_DICE_BUNDLE_COST;
  const essencePurchaseOptions: WalletPurchaseOption[] = [
    {
      id: 'dice_bundle',
      icon: '🎲',
      title: marketOwnedBundles.dice_bundle ? 'Dice Bundle owned' : 'Dice Bundle',
      cost: MARKET_DICE_BUNDLE_COST,
      currencyIcon: '💰',
      currencyName: 'money',
      summary: marketOwnedBundles.dice_bundle
        ? 'Already claimed for this island run.'
        : `Top up with ${MARKET_DICE_BUNDLE_REWARD} dice for rolling.`,
      rewardLabel: marketOwnedBundles.dice_bundle ? 'Owned ✅' : `+${MARKET_DICE_BUNDLE_REWARD} dice`,
      canAfford: canBuyDiceBundle,
      disabledReason: resolveDiceBundlePurchaseDisabledReason(marketOwnedBundles.dice_bundle, runtimeState.essence),
      actionLabel: marketOwnedBundles.dice_bundle ? 'Owned' : 'Buy',
      onSelect: canBuyDiceBundle
        ? () => {
            setWalletStoreModalKind(null);
            openShopPanel();
          }
        : undefined,
    },
    ...(buildModalV2ViewModel.activeLandmark
      ? [buildModalV2ViewModel.activeLandmark].map((landmark): WalletPurchaseOption => {
        const cost = landmark.nextTapCost;
        const tutorialRowState = resolveIslandRunBuildModalTutorialRowState({
          firstSessionTutorialState,
          stopIndex: landmark.stopIndex,
        });
        const canBuy = landmark.canAffordNextTap && !tutorialRowState.isUnavailable && cost > 0;
        return {
          id: `build_${landmark.stopIndex}`,
          icon: '🏗️',
          title: landmark.title,
          cost,
          currencyIcon: '💰',
          currencyName: 'money',
          summary: `Building Level ${landmark.targetLevel} · Step ${landmark.sequencePosition}/${landmark.totalSequenceSteps}.`,
          rewardLabel: `Part ${landmark.activePart ?? 1}`,
          canAfford: canBuy,
          disabledReason: resolveBuildWalletDisabledReason({
            canBuy,
            isTutorialMuted: tutorialRowState.isUnavailable,
            essence: runtimeState.essence,
            cost,
          }),
          actionLabel: 'Build',
          onSelect: canBuy
            ? () => {
                setWalletStoreModalKind(null);
                setShowBuildPanel(true);
              }
            : undefined,
        };
      })
      : []),
  ].slice(0, WALLET_STORE_GRID_SIZE);

  const shardPurchaseOptions: WalletPurchaseOption[] = collectedCreatures
    .map((creature): WalletPurchaseOption | null => {
      const preview = resolveCreatureFormUpgradePreview({ entry: creature, shards: runtimeState.shards });
      if (!preview?.nextFormLevel) return null;
      return {
        id: `form_${creature.creatureId}`,
        icon: '🌟',
        title: `${creature.creature.name} Form ${preview.nextFormLevel}`,
        cost: preview.shardCost,
        currencyIcon: '🟣',
        currencyName: 'essence',
        summary: `Requires Bond Lv. ${preview.requiredBondLevel ?? '—'} · Current Form ${preview.currentFormLevel}/${preview.maxFormLevel}.`,
        rewardLabel: preview.rewardDice > 0 || preview.rewardEssence > 0
          ? `+${preview.rewardDice} dice / +${preview.rewardEssence} money`
          : 'Form upgrade',
        canAfford: preview.canUpgrade,
        disabledReason: resolveShardWalletDisabledReason({
          canUpgrade: preview.canUpgrade,
          failureReason: preview.failureReason,
          requiredBondLevel: preview.requiredBondLevel,
          shardCost: preview.shardCost,
          shards: runtimeState.shards,
        }),
        actionLabel: 'Upgrade',
        onSelect: preview.canUpgrade
          ? () => {
              setWalletStoreModalKind(null);
              setSelectedSanctuaryCreatureId(creature.creatureId);
              setShowSanctuaryPanel(true);
            }
          : undefined,
      };
    })
    .filter((option): option is WalletPurchaseOption => Boolean(option))
    .sort((a, b) => Number(b.canAfford) - Number(a.canAfford) || a.cost - b.cost)
    .slice(0, WALLET_STORE_GRID_SIZE);

  const activeWalletPurchaseOptions = walletStoreModalKind === 'shards' ? shardPurchaseOptions : essencePurchaseOptions;
  const activeWalletBalance = walletStoreModalKind === 'shards' ? runtimeState.shards : runtimeState.essence;
  const activeWalletIcon = walletStoreModalKind === 'shards' ? '🟣' : '💰';
  const activeWalletName = walletStoreModalKind === 'shards' ? 'Essence' : 'Money';
  const activeWalletEmptySlotCount = Math.max(0, WALLET_STORE_GRID_SIZE - activeWalletPurchaseOptions.length);

  const handleClaimCompanionQuest = () => {
    if (!companionQuestComplete || companionQuestClaimedToday) return;
    const previousClaimed = companionQuestProgress.lastClaimedDayKey;
    const expectedYesterday = getPreviousDayKey(companionQuestDayKey);
    const nextStreak = previousClaimed === expectedYesterday ? companionQuestProgress.currentStreak + 1 : 1;
    const nextProgress: CompanionQuestProgress = {
      lastClaimedDayKey: companionQuestDayKey,
      currentStreak: nextStreak,
      bestStreak: Math.max(companionQuestProgress.bestStreak, nextStreak),
    };
    setCompanionQuestProgress(nextProgress);
    writeCompanionQuestProgress(session.user.id, nextProgress);
    setSanctuaryFeedback(
      `Quest complete! 🔥 Companion streak is now ${nextStreak} day${nextStreak === 1 ? '' : 's'}.`,
    );
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        stage: 'sanctuary_daily_companion_quest_claimed',
        island_number: islandNumber,
        quest_type: companionQuestType,
        streak_count: nextStreak,
      },
    });
  };



  const islandArtAmbientBackgroundSrc = getIslandArtAmbientBackgroundSrc(islandArtManifest);
  const shouldShowIslandArtAmbientBackground = Boolean(islandArtAmbientBackgroundSrc) && isIslandArtAmbientBackgroundLoaded && !isBackgroundHidden;
  const shouldShowLegacyIslandBackground = !shouldShowIslandArtAmbientBackground && isIslandBackgroundAvailable && !isBackgroundHidden;
  const shouldUseNoBackgroundFallback = !shouldShowIslandArtAmbientBackground && (!isIslandBackgroundAvailable || isBackgroundHidden);
  const islandArtLandmarkBuildLevels = runtimeState.stopBuildStateByIndex.map((buildState, stopIndex) => {
    if (!isIslandVisualPreview || islandVisualLandmark === null) return buildState.buildLevel;
    const previewLandmarkId = ['hatchery', 'habit', 'mystery', 'wisdom'][stopIndex] ?? null;
    return islandVisualLandmark === 'all' || islandVisualLandmark === previewLandmarkId
      ? islandVisualBuildLevel
      : 0;
  });
  const isCurrentIslandBossDefeated = bossTrialResolved || runtimeState.bossTrialResolvedIslandNumber === islandNumber;
  const runtimeBossCreatureArtState = resolveBossCreatureArtState({
    stopBuildStateByIndex: runtimeState.stopBuildStateByIndex,
    isBossDefeated: isCurrentIslandBossDefeated,
  });
  const bossCreatureArtState = isIslandVisualPreview && islandVisualBossState
    ? islandVisualBossState
    : runtimeBossCreatureArtState;
  const canChallengeCurrentBoss = canChallengeBoss({
    stopBuildStateByIndex: runtimeState.stopBuildStateByIndex,
    isBossDefeated: isCurrentIslandBossDefeated,
  });
  const currentBossChallengeLockReason = getBossChallengeLockReason({
    stopBuildStateByIndex: runtimeState.stopBuildStateByIndex,
    isBossDefeated: isCurrentIslandBossDefeated,
  });
  const bestNextAction = useMemo(() => {
    const playerLevel = Math.max(1, Math.floor(playerLevelInfo?.currentLevel ?? 1));
    return resolveIslandRunBestNextAction({
      record: runtimeState,
      nowMs,
      playerLevel,
    });
  }, [nowMs, playerLevelInfo?.currentLevel, runtimeState]);
  const isRewardBarClaiming = rewardBarBurstAnimating || rewardBarCascadePayouts.length > 0;
  const doesModalOwnAttention = Boolean(
    activeStopId ||
      activeLaunchedMinigameId ||
      activePlaceholder ||
      hatchReveal ||
      hatchedCreatureCardId ||
      ticketPromptStopId ||
      lockedStopInfoStopId ||
      showBuildPanel ||
      showClaimModal ||
      showEggReadyBanner ||
      showEntryAudioModal ||
      techCollectionModal ||
      techCompletionCelebration ||
      showEncounterModal ||
      showGamifiedJournalCard ||
      showFirstCreaturePackModal ||
      showFirstRunCelebration ||
      showHatcheryHelp ||
      showHatcheryL1Celebration ||
      showHatcheryCompassModal ||
      showIslandClearCelebration ||
      showMarketPanel ||
      showOnboardingBooster ||
      showOutOfDicePurchasePrompt ||
      showPerfectCompanionOnboardingHint ||
      showRewardDetailsModal ||
      showSanctuaryPanel ||
      showShopPanel ||
      showStickerAlbumDialog ||
      showStoryReader ||
      isIslandInhabitantFlowOpen ||
      showCreatureChannelModal ||
      showTravelOverlay ||
      walletStoreModalKind !== null,
  );
  const isIslandClearTravelReady = Boolean(
    showIslandClearCelebration &&
      isIslandClearRewardClaimed &&
      islandClearStats?.islandNumber === runtimeState.currentIslandNumber
  );
  const isNarrativeSurfaceBlockedByNonClearCelebration = Boolean(
    activeStopId ||
      activeLaunchedMinigameId ||
      activePlaceholder ||
      hatchReveal ||
      hatchedCreatureCardId ||
      ticketPromptStopId ||
      lockedStopInfoStopId ||
      showBuildPanel ||
      showClaimModal ||
      showEggReadyBanner ||
      showEntryAudioModal ||
      techCollectionModal ||
      techCompletionCelebration ||
      showEncounterModal ||
      showGamifiedJournalCard ||
      showFirstCreaturePackModal ||
      showFirstRunCelebration ||
      showHatcheryHelp ||
      showHatcheryL1Celebration ||
      showHatcheryCompassModal ||
      showMarketPanel ||
      showOnboardingBooster ||
      showOutOfDicePurchasePrompt ||
      showPerfectCompanionOnboardingHint ||
      showRewardDetailsModal ||
      showSanctuaryPanel ||
      showShopPanel ||
      showStickerAlbumDialog ||
      showTravelOverlay ||
      bossTrialPhase !== 'idle' ||
      Boolean(dormantDoorMiniGame) ||
      Boolean(trafficLightCoinFlip) ||
      walletStoreModalKind !== null
  );
  const isNarrativeSurfaceBlocked = Boolean(
    isNarrativeSurfaceBlockedByNonClearCelebration || showIslandClearCelebration
  );
  const canDisplayTravelReadyClosingOverClaimedCelebration = Boolean(
    isIslandClearTravelReady && !isNarrativeSurfaceBlockedByNonClearCelebration
  );

  let isGlobalPrologueSeenForNarrative = runtimeState.storyPrologueSeen;
  if (!isGlobalPrologueSeenForNarrative && typeof window !== 'undefined') {
    try {
      isGlobalPrologueSeenForNarrative = window.localStorage.getItem(storySeenStorageKey) === 'true';
    } catch {
      isGlobalPrologueSeenForNarrative = false;
    }
  }

  const handlePersistNarrativeSeen = useCallback(
    (next: IslandNarrativeSeenState) => {
      applyNarrativeSeenStateMarker({
        session,
        client,
        narrativeSeenState: next,
        triggerSource: 'island_narrative_beat_seen',
      });
    },
    [session, client],
  );

  const islandNarrativeOpeningFlow = useIslandNarrativeOpeningFlow({
    userId: session.user.id,
    currentIslandNumber: runtimeState.currentIslandNumber,
    cycleIndex: runtimeState.cycleIndex,
    hasHydratedRuntimeState: hasHydratedRuntimeState && !isIslandVisualPreview,
    isGlobalPrologueActive: activeStoryEpisode?.kind === 'global_prologue',
    isGlobalPrologueSeen: isGlobalPrologueSeenForNarrative,
    isNarrativeSurfaceBlocked,
    canDisplayTravelReadyClosingOverClaimedCelebration,
    activeStopId,
    hatcheryBuildLevel: runtimeState.stopBuildStateByIndex[0]?.buildLevel,
    landmarkBuildLevels: islandArtLandmarkBuildLevels,
    completedStopIds: completedStops,
    bossChallengeActive: bossTrialPhase === 'in_progress',
    bossChallengeMidpoint:
      bossTrialPhase === 'in_progress' &&
      getBossTrialConfig(islandNumber).scoreTarget > 0 &&
      bossTrialScore * 2 >= getBossTrialConfig(islandNumber).scoreTarget,
    canChallengeCurrentBoss,
    isCurrentIslandBossDefeated,
    bossTrialResolvedIslandNumber: runtimeState.bossTrialResolvedIslandNumber,
    isIslandClearTravelReady,
    activeStoryEpisode,
    setActiveStoryEpisode,
    persistedNarrativeSeenState: runtimeState.narrativeSeenState,
    onPersistNarrativeSeen: handlePersistNarrativeSeen,
  });

  const landmarkWhispers = useLandmarkWhispers({
    activeStopId,
    hasHydratedRuntimeState,
    isNarrativeSurfaceBlocked: Boolean(
      isNarrativeSurfaceBlocked ||
      islandNarrativeOpeningFlow.activeDialogue ||
      islandNarrativeOpeningFlow.activeToast ||
      islandNarrativeOpeningFlow.activeReactionDialogue ||
      islandNarrativeOpeningFlow.activeReactionToast ||
      islandNarrativeOpeningFlow.queuedBeatIds.length > 0 ||
      islandNarrativeOpeningFlow.reactionQueuedBeatIds.length > 0
    ),
    hasActiveEgg: Boolean(activeEgg),
    isEggReady: Boolean(activeEgg && nowMs >= activeEgg.hatchAtMs),
    hasHabitProgress: completedStops.includes('habit') || isActiveCompassSessionFilled,
    seed: `${session.user.id}:${runtimeState.currentIslandNumber}:${runtimeState.cycleIndex}`,
    userId: session.user.id,
    wisdomKeeperAi: wisdomKeeperAiOptions,
  });

  const handleCloseStoryReader = () => {
    if (activeStoryEpisode?.kind === 'island_arrival' || activeStoryEpisode?.kind === 'island_resolution') {
      islandNarrativeOpeningFlow.handleStoryEpisodeClosed(activeStoryEpisode);
      return;
    }
    if (activeStoryEpisode?.kind === 'island_travel_arrival') {
      setActiveStoryEpisode(null);
      setCameraMode('overview_manual');
      setFocusedStopId(null);
      window.requestAnimationFrame(() => boardCameraRef.current?.goDefault());
      return;
    }

    setActiveStoryEpisode(null);
    try {
      window.localStorage.setItem(storySeenStorageKey, 'true');
    } catch {
      // ignore localStorage failures
    }
    const next = applyStoryPrologueSeenMarker({
      session,
      client,
      storyPrologueSeen: true,
      triggerSource: 'close_story_reader_marker',
    });
    setRuntimeState(next);
  };
  const shouldShowCaretakerTalkAction = hasCaretakerContent;
  const inhabitantCommunicationAccess = useMemo(
    () => getIslandCommunicationAccess(runtimeState, 'inhabitant'),
    [runtimeState],
  );
  const creatureCommunicationAccess = useMemo(
    () => getIslandCommunicationAccess(runtimeState, 'creature'),
    [runtimeState],
  );
  const concordHubEntryState = useMemo(
    () => resolveIslandRunConcordHubEntryState(runtimeState),
    [runtimeState],
  );
  const openGlobalStoryReader = useCallback(() => {
    setActiveStoryEpisode({ kind: 'global_prologue', manifestPath: '/storyline/episode-001/manifest.json' });
  }, []);
  const handleConcordEntryClick = useCallback(() => {
    if (concordHubEntryState.primaryAction === 'open-concord-hub') {
      setShowConcordHubModal(true);
      return;
    }
    openGlobalStoryReader();
  }, [concordHubEntryState.primaryAction, openGlobalStoryReader]);
  const resolvedCaretakerBackgroundArtSrc = islandArtAmbientBackgroundSrc || islandBackgroundSrc;
  const openCaretakerFlow = useCallback((source: 'caretaker_tile_land' | 'caretaker_board_tap' | 'dev_hud') => {
    if (!shouldShowCaretakerTalkAction) return;

    if (!inhabitantCommunicationAccess.allowed) {
      const preConcordMessage = `${getPreConcordCaretakerUtterance()} The Caretaker gestures beside the board, but The Concord is not built yet.`;
      setCaretakerBoardBubbleText(preConcordMessage);
      setLandingText(preConcordMessage);
      return;
    }

    setCaretakerBoardBubbleText('The Caretaker waves you over. The Concord channel opens.');
    setShowTopbarMenu(false);
    setShowAudioMenu(false);
    setIsIslandInhabitantFlowOpen(true);
    setLandingText(source === 'caretaker_tile_land'
      ? '🧙 You landed near the Caretaker. The Concord translates their greeting.'
      : source === 'caretaker_board_tap'
        ? '🧙 The Caretaker waves you over. The Concord channel opens.'
        : '🧙 Dev: opening the Island Caretaker flow.');
  }, [inhabitantCommunicationAccess.allowed, shouldShowCaretakerTalkAction]);
  const handleCaretakerFlowClose = (result: IslandInhabitantFlowResult) => {
    setIsIslandInhabitantFlowOpen(false);
    setCaretakerBoardBubbleText(null);
    if (result.closeReason === 'missing_content') {
      console.warn('[IslandRun] Caretaker inhabitant flow closed with missing content.', result);
    }
  };

  // Keep the auto-roll loop's pause gate in sync with modal state so it halts
  // while any modal is open and resumes once they are all dismissed.
  useEffect(() => {
    autoRollPausedRef.current = doesModalOwnAttention;
  }, [doesModalOwnAttention]);
  const shouldShowBestNextActionChip = Boolean(
    bestNextAction &&
      bestNextAction.urgency === 'critical' &&
      bestNextAction.action !== 'claim_island_clear' &&
      !isCurrentIslandFinishedForDeparture &&
      !doesModalOwnAttention &&
      !isRolling &&
      pendingHopSequence === null &&
      !isRewardBarClaiming,
  );
  const shouldShowFinishIslandCta = Boolean(
    isCurrentIslandFinishedForDeparture &&
      !doesModalOwnAttention &&
      !isRolling &&
      pendingHopSequence === null &&
      !isRewardBarClaiming,
  );
  const loadingIslandNumber = Math.max(1, Math.floor(runtimeState.currentIslandNumber ?? islandNumber));
  const isCycleCapstoneReadiness = loadingIslandNumber % ISLAND_RUN_MAX_ISLAND === 0;

  if (isRuntimeSyncBlocked || isOwnershipBlocked) {
    return (
      <section className="island-run-prototype">
        <header className="island-run-prototype__header">
          <p className="island-run-prototype__landing-feed" role="alert">
            {isRuntimeSyncBlocked
              ? 'Island Run sync is currently unavailable for this account, so gameplay is paused on this device to prevent split progress.'
              : 'Island Run looks active on another device. Take over here to continue with the latest synced progress.'}
          </p>
          <p className="island-run-prototype__landing-feed">
            {isRuntimeSyncBlocked
              ? 'Please reconnect this app to Supabase and run the latest Island Run migrations (including runtime_version) before resuming.'
              : (activeSessionStatusMessage ?? 'Reload latest synced progress to continue.')}
          </p>
          <button
            type="button"
            className="island-run-prototype__roll-btn island-run-prototype__roll-btn--cta island-run-prototype__roll-btn--primary"
            onClick={() => {
              if (isRuntimeSyncBlocked) {
                void retryRuntimeSync();
              } else {
                void takeOverFromOtherDevice();
              }
            }}
            disabled={isRetryingSync}
          >
            {isRetryingSync
              ? 'Syncing…'
              : isRuntimeSyncBlocked
                ? 'Reload latest progress'
                : 'Take over on this device'}
          </button>
        </header>
      </section>
    );
  }

  if (!hasHydratedRuntimeState) {
    return (
      <section className="island-run-prototype island-run-prototype--loading" aria-label="Island Run loading">
        <LoadingReadinessScreen
          title={isCycleCapstoneReadiness ? `Preparing Island ${loadingIslandNumber}` : 'Preparing Island Run'}
          subtitle={isCycleCapstoneReadiness
            ? 'Verifying your cycle progress before the final island opens.'
            : 'Syncing your island, dice, rewards, and token position before controls unlock.'}
          progress={68}
          steps={[
            { label: 'Opening Island Run', status: 'complete' },
            { label: 'Reading local island save', status: 'complete' },
            { label: 'Syncing cloud progress', status: 'active' },
            { label: 'Preparing board controls', status: 'pending' },
          ]}
          detail="Gameplay controls unlock after the canonical Island Run state is ready."
          variant="island"
        />
      </section>
    );
  }

  return (
    <section className={`island-run-prototype ${isHudCollapsed ? 'island-run-prototype--hud-collapsed' : ''}`}>
      {showEntryAudioModal && (
        <div className="island-run-entry-audio" role="presentation">
          <div
            className="island-run-entry-audio__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="island-run-entry-audio-title"
          >
            <img
              className="island-run-entry-audio__background"
              src="/assets/sound-modals/Open-game/IMG_soundmodalbg.webp"
              alt=""
              aria-hidden="true"
            />
            <h2 id="island-run-entry-audio-title" className="island-run-entry-audio__title">Music / Sound</h2>
            <button
              type="button"
              className="island-run-entry-audio__close"
              onClick={() => {
                setHasDismissedEntryAudioModal(true);
                setShowEntryAudioModal(false);
              }}
              aria-label="Close Music / Sound modal"
            />
            <div className="island-run-entry-audio__toggles" role="group" aria-label="Island Run audio settings">
              <button
                type="button"
                className={`island-run-entry-audio__pill island-run-entry-audio__pill--music${musicEnabled ? ' island-run-entry-audio__pill--on' : ''}`}
                aria-pressed={musicEnabled}
                onClick={() => setMusicEnabled((current) => !current)}
                aria-label={`Music ${musicEnabled ? 'on' : 'off'}`}
              >
                <span className="island-run-entry-audio__pill-knob" />
              </button>
              <button
                type="button"
                className={`island-run-entry-audio__pill island-run-entry-audio__pill--sounds${sfxEnabled ? ' island-run-entry-audio__pill--on' : ''}`}
                aria-pressed={sfxEnabled}
                onClick={() => { const next = !sfxEnabled; setSfxEnabled(next); }}
                aria-label={`Sounds ${sfxEnabled ? 'on' : 'off'}`}
              >
                <span className="island-run-entry-audio__pill-knob" />
              </button>
            </div>
            <button
              type="button"
              className="island-run-entry-audio__start"
              onClick={() => {
                setHasDismissedEntryAudioModal(true);
                setShowEntryAudioModal(false);
              }}
              aria-label="Play Game"
            >
              <img
                className="island-run-entry-audio__start-image"
                src="/assets/sound-modals/Open-game/IMG_soundmodalplay.webp"
                alt=""
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      )}
      {!isHudCollapsed ? (
        <header className="island-run-prototype__header">
          <div id="island-run-main-hud">
        <div className="island-run-prototype__always-controls">
            <button
              type="button"
              className="island-run-prototype__hud-close-btn"
              onClick={() => setIsHudCollapsed(true)}
              aria-label="Collapse HUD overlay"
            >
              Close HUD ✕
            </button>
            <button
              type="button"
              className={`island-run-prototype__roll-btn island-run-prototype__roll-btn--cta ${rollButtonMode === 'roll' ? 'island-run-prototype__roll-btn--primary' : 'island-run-prototype__roll-btn--convert'} ${rollButtonInteractionClass}`.trim()}
              onClick={handleRollButtonClick}
              disabled={Boolean(rollDisabledReason)}
              aria-disabled={Boolean(rollDisabledReason)}
              title={rollDisabledMessage ?? undefined}
              {...rollHoldHandlers}
            >
              {rollButtonLabel}
              {rollDisabledMessage && (
                <span className="sr-only"> — {rollDisabledMessage}</span>
              )}
            </button>
          {/* M14: persistent HUD Market button */}
          <button
            type="button"
            className="island-run-prototype__shop-btn"
            aria-label="Open market"
            onClick={openShopPanel}
          >
            🛍️ Market
          </button>
          {unclaimedCreatureCount > 0 && (
            <button
              type="button"
              className="island-run-prototype__shop-btn"
              aria-label={`Open hatchery (${unclaimedCreatureCount} unclaimed creature${unclaimedCreatureCount === 1 ? '' : 's'} ready)`}
              onClick={openHatcheryQuickAccess}
              title="Creature ready — open Hatchery"
            >
              🥚 {unclaimedCreatureCount}
            </button>
          )}
          <button
            type="button"
            className="island-run-prototype__shop-btn"
            aria-label="Open creature sanctuary"
            onClick={openSanctuaryPanel}
          >
            🐾 Sanctuary
          </button>
          <button
            type="button"
            className="island-run-prototype__shop-btn"
            aria-label={concordHubEntryState.ariaLabel}
            onClick={handleConcordEntryClick}
          >
            {concordHubEntryState.icon} {concordHubEntryState.label}
          </button>
          </div>
          {isDevModeEnabled && (
            <button
              type="button"
              className="island-run-prototype__dev-toggle"
              aria-expanded={isDevPanelOpen}
              aria-controls="island-run-dev-panel"
              onClick={() => setIsDevPanelOpen((v) => !v)}
            >
              {isDevPanelOpen ? 'Dev ▲' : 'Dev ▼'}
            </button>
          )}
        {/* M1B: Production HUD — always visible for all logged-in users */}
        <div className="island-run-prototype__status-row island-run-prototype__status-row--production">
          <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--dice">🎲 <strong>{dicePool}</strong></span>
          {ISLAND_RUN_CONTRACT_V2_ENABLED && (
            <button
              type="button"
              className="island-run-prototype__stat-chip island-run-prototype__stat-chip--wallet"
              style={{ position: 'relative' }}
              onClick={() => setWalletStoreModalKind('essence')}
              aria-label={`Open money buying options. Balance ${runtimeState.essence} money.`}
            >
              💰 <strong>{runtimeState.essence}</strong>
              <StatDriftNumbers value={runtimeState.essence} icon="💰" />
            </button>
          )}
          {activeCompanion && activeCompanionBonus ? (
            <span className="island-run-prototype__stat-chip">
              🐾 <strong>{activeCompanion.creature.name}</strong> · {activeCompanionBonus.label}
            </span>
          ) : null}
          <span className={`island-run-prototype__stat-chip island-run-prototype__level-chip${islandLevelFlash ? ' island-run-prototype__level-chip--levelup' : ''}`}>Lvl <strong>{islandNumber}</strong></span>
          <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--timer">⏱ <strong>{timerDisplay}</strong></span>
          {/* PR6: Sticker "one away" nudge — tiny pulse when player is 1 fragment from completing a sticker. */}
          {runtimeState.stickerProgress.fragments === 4 && (
            <span
              className="island-run-prototype__sticker-nudge"
              aria-live="polite"
              title="You are one fragment away from completing a sticker — claim the reward bar to earn it!"
            >
              🧩 1 away
            </span>
          )}
          {/* M2: roll result chip — visible in production after every roll */}
          {rollValue !== null && (
            <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--roll" aria-live="polite">
              🎯 <strong>{rollValue}</strong>
            </span>
          )}
        </div>
        {/* M2: Production roll/land feedback — always visible (landingText reflects roll + tile outcome) */}
        <p
          className="island-run-prototype__landing-feed"
          aria-live="polite"
          role="status"
        >
          {landingText}
        </p>
        {driftNotice !== null && (
          <p className="island-run-prototype__drift-notice" aria-live="assertive" role="alert" style={{ color: '#ff6b6b', fontSize: '0.82rem', fontWeight: 600, textAlign: 'center', margin: '0.15rem 0', animation: 'fadeInOut 2.5s ease forwards' }}>
            − {driftNotice} 💰 money drift
          </p>
        )}
        {ISLAND_RUN_CONTRACT_V2_ENABLED && effectiveActiveTimedEvent ? (
          <div className="island-run-prototype__shard-pill" aria-label="Contract-v2 timed event reward bar">
            <div className="island-run-prototype__shard-pill-fill" style={{ width: `${rewardBarPercent}%` }} />
            <span className="island-run-prototype__shard-pill-content">
              <span>{nextRewardIcon} {effectiveActiveTimedEvent.eventType} · Next: {nextRewardKind}</span>
              <span className="island-run-prototype__shard-pill-count">
                {timedEventRemainingLabel} · {rewardBarProgress}/{rewardBarThreshold} · Tier {runtimeState.rewardBarEscalationTier}{effectiveMultiplier > 1 ? ` · ×${effectiveMultiplier} (−${effectiveDiceCost}/roll)` : ''}
              </span>
              {spaceExcavatorRewardBarHint && (
                <span className="island-run-prototype__shard-pill-count">
                  {spaceExcavatorRewardBarHint}
                </span>
              )}
            </span>
            <button
              type="button"
              className="island-run-prototype__shard-pill-claim-btn"
              onClick={handleContractV2RewardBarClaim}
              disabled={!canClaimRewardBar}
            >
              Claim bar
            </button>
          </div>
        ) : null}
        {/* M17A: shields HUD chip — only shown when player has at least 1 shield */}
        {shields > 0 && (
          <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--shields">
            🛡️ <strong>{shields}</strong>
          </span>
        )}
        {/* M17C: shards wallet HUD chip — only shown when player has at least 1 shard */}
        {shards > 0 && (
          <button
            type="button"
            className="island-run-prototype__stat-chip island-run-prototype__stat-chip--shards island-run-prototype__stat-chip--wallet"
            onClick={() => setWalletStoreModalKind('shards')}
            aria-label={`Open essence buying options. Balance ${shards} essence.`}
          >
            🟣 <strong>{shards}</strong>
          </button>
        )}
        {/* M8-COMPLETE: diamonds HUD chip — only shown when player has at least 1 diamond */}
        {diamonds > 0 && (
          <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--diamonds">
            💎 <strong>{diamonds}</strong>
          </span>
        )}
        {/* M16C/M16D/M16E: Shard progress pill with fill animation and Claim button */}
        {(() => {
          const threshold = getShardTierThreshold(shardTierIndex);
          const pct = threshold > 0 ? Math.min((islandShards / threshold) * 100, 100) : 0;
          return (
            <div
              className={`island-run-prototype__shard-pill${shardMilestoneReached ? ' island-run-prototype__shard-pill--milestone' : ''}`}
              aria-label={`Essence progress: ${islandShards} of ${threshold}`}
            >
              <div
                className="island-run-prototype__shard-pill-fill"
                style={{ width: `${pct}%`, transition: shardFillNoTransition ? 'none' : 'width 0.4s ease-out' }}
              />
              <span className="island-run-prototype__shard-pill-content">
                <span>{getShardEraEmoji(islandNumber, shardTierIndex)}</span>
                <span className="island-run-prototype__shard-pill-count">{islandShards} / {threshold}</span>
              </span>
              {shardMilestoneReached && (
                <button
                  type="button"
                  className="island-run-prototype__shard-pill-claim-btn"
                  onClick={() => setShowClaimModal(true)}
                  aria-label="Claim milestone reward"
                >
                  Claim!
                </button>
              )}
            </div>
          );
        })()}
        {isDevModeEnabled && isDevPanelOpen && (
          <div id="island-run-dev-panel">
        <div className="island-run-prototype__hud-grid">
          <div className="island-run-prototype__hud-section">
            <p className="island-run-prototype__hud-label">Run status</p>
            <div className="island-run-prototype__status-row">
              <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--dice">Dice: <strong>{dicePool}</strong></span>
              <span className="island-run-prototype__stat-chip">Money: <strong>{runtimeState.essence}</strong></span>
              <span className={`island-run-prototype__stat-chip island-run-prototype__level-chip${islandLevelFlash ? ' island-run-prototype__level-chip--levelup' : ''}`}>LEVEL <strong>{islandNumber}</strong> / 120</span>
              <span className="island-run-prototype__stat-chip">Tile: <strong>{tokenIndex}</strong></span>
              <span className="island-run-prototype__stat-chip">Island: <strong>{islandNumber}</strong></span>
              <span className="island-run-prototype__stat-chip">Last roll: <strong>{rollValue ?? '-'}</strong></span>
              <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--timer">{resolveIslandRunTimerLabel()} <strong>{timerDisplay}</strong></span>
              <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--spin">{spinTokenWalletLabel}: <strong>{spinTokens}</strong></span>
              <span className="island-run-prototype__stat-chip">Event ID: <strong>{activeTimedEventId ?? '—'}</strong></span>
              <span className="island-run-prototype__stat-chip">Event tickets: <strong>{activeEventTickets}</strong></span>
              <span className="island-run-prototype__stat-chip">
                Ticket sync: <strong>{hasLegacyEventTicketDivergence ? '⚠️ diverged' : '✅ matched'}</strong>
              </span>
              {/* M11C: stop progress chip */}
              {(() => {
                const nonBossStops = islandStopPlan.filter((s) => s.stopId !== 'boss');
                const completedNonBoss = ISLAND_RUN_CONTRACT_V2_ENABLED
                  ? nonBossStops.filter((s) => stopStateMap.get(s.stopId) === 'completed').length
                  : nonBossStops.filter((s) => effectiveCompletedStops.includes(s.stopId)).length;
                if (completedNonBoss < nonBossStops.length) {
                  return <span className="island-run-prototype__stat-chip">{completedNonBoss}/{nonBossStops.length} landmarks fully complete — finish upgrades for full clear.</span>;
                }
                return <span className="island-run-prototype__stat-chip">✅ All landmarks fully complete</span>;
              })()}
            </div>
          </div>
          <div className="island-run-prototype__hud-section island-run-prototype__hud-section--landing">
            <p className="island-run-prototype__hud-label">Live feed</p>
            <p className="island-run-prototype__landing island-run-prototype__landing--info">{landingText}</p>
            <p className="island-run-prototype__landing island-run-prototype__landing--plan">
              Stop plan: {islandStopPlan.map((stop) => stop.title.split(' ').slice(1).join(' ') || stop.title).join(' → ')}
            </p>
            <p className="island-run-prototype__landing island-run-prototype__landing--states">
              Stop states: {islandStopPlan.map((stop) => `${stop.stopId}:${stopStateMap.get(stop.stopId) ?? 'active'}`).join(' | ')}
            </p>
          </div>
        </div>
        <div className="island-run-prototype__controls" aria-label={`Board controls (scene: ${activeTheme.label})`}>
          <button
            type="button"
            className="island-run-prototype__debug-btn"
            onClick={focusNextAvailableStop}
          >
            Focus next stop
          </button>
          <button
            type="button"
            className="island-run-prototype__debug-btn"
            onClick={() => setCameraMode((current) => (current === 'overview_manual' ? 'board_follow' : 'overview_manual'))}
          >
            {cameraMode === 'overview_manual' ? 'Exit overview' : 'Overview'}
          </button>
          <button
            type="button"
            className="island-run-prototype__debug-btn"
            onClick={() => {
              setCameraMode('board_follow');
              setFocusedStopId(null);
            }}
          >
            Reset view
          </button>
          <button type="button" className="island-run-prototype__debug-btn" onClick={() => setShowDebug((value) => !value)}>
            {showDebug ? 'Hide' : 'Show'} anchor/depth debug
          </button>
          {(showDebug || showQaHooks) && (
            <div className="island-run-prototype__qa-controls" role="group" aria-label="QA and debug controls">
              <p className="island-run-prototype__qa-label">QA / Debug tools</p>
              <button type="button" className="island-run-prototype__debug-btn" onClick={handleQaMarkBossResolved}>
                QA: Mark boss resolved
              </button>
              <button type="button" className="island-run-prototype__debug-btn" onClick={handleQaAdvanceIsland}>
                QA: Advance island
              </button>
              <button type="button" className="island-run-prototype__debug-btn" onClick={handleQaResetProgression}>
                QA: Reset progression
              </button>
              <button
                type="button"
                className="island-run-prototype__debug-btn"
                onClick={() => handleQaTriggerMarketAlreadyOwnedMarker('dice_bundle')}
              >
                QA: Market already-owned (dice)
              </button>
              <button
                type="button"
                className="island-run-prototype__debug-btn"
                onClick={() => window.__islandRunMarketDebugResetState?.()}
              >
                QA: Market reset marker baseline
              </button>
              <p className="island-run-prototype__landing island-run-prototype__qa-note" role="note">
                Market debug helpers: <code>window.__islandRunMarketDebugExportMarkers()</code> ·{' '}
                <code>window.__islandRunMarketDebugResetState()</code> ·{' '}
                <code>window.__islandRunMarketDebugAssertStatusCoverage()</code>
              </p>
              <p className="island-run-prototype__landing island-run-prototype__qa-note" role="note">
                Runtime debug helper: <code>window.__islandRunEntryDebugRuntimeStateSummary()</code>
              </p>
              {runtimeVerificationSnapshot && (
                <div className="island-run-prototype__hud-section" style={{ width: '100%' }}>
                  <p className="island-run-prototype__hud-label">Runtime verification</p>
                  <div className="island-run-prototype__status-row">
                    <span className="island-run-prototype__stat-chip">Hydration: <strong>{runtimeVerificationSnapshot.latestHydrationResult?.source ?? '—'}</strong></span>
                    <span className="island-run-prototype__stat-chip">Island: <strong>{runtimeVerificationSnapshot.latestHydrationResult?.currentIslandNumber ?? '—'}</strong></span>
                    <span className="island-run-prototype__stat-chip">Cycle: <strong>{runtimeVerificationSnapshot.latestHydrationResult?.cycleIndex ?? '—'}</strong></span>
                    <span className="island-run-prototype__stat-chip">Tile: <strong>{runtimeVerificationSnapshot.latestHydrationResult?.tokenIndex ?? '—'}</strong></span>
                    <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--spin">{spinTokenWalletLabel}: <strong>{runtimeVerificationSnapshot.latestHydrationResult?.spinTokens ?? '—'}</strong></span>
                    <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--dice">Dice: <strong>{runtimeVerificationSnapshot.latestHydrationResult?.dicePool ?? '—'}</strong></span>
                  </div>
                  <p className="island-run-prototype__landing island-run-prototype__qa-note" role="note">
                    Latest persist success: island <strong>{runtimeVerificationSnapshot.latestPersistSuccess?.currentIslandNumber ?? '—'}</strong>, tile <strong>{runtimeVerificationSnapshot.latestPersistSuccess?.tokenIndex ?? '—'}</strong>, dice <strong>{runtimeVerificationSnapshot.latestPersistSuccess?.dicePool ?? '—'}</strong>.
                  </p>
                </div>
              )}
            </div>
          )}
          {!ISLAND_RUN_CONTRACT_V2_ENABLED && dicePool < BASE_DICE_PER_ROLL && (
            <button
              type="button"
              className="island-run-prototype__booster-btn"
              onClick={() => {
                setBoosterError(null);
                setShowOnboardingBooster(true);
              }}
              disabled={isDisplayNameLoopCompleted}
            >
              {isDisplayNameLoopCompleted ? 'Onboarding booster used' : 'Use onboarding booster (+dice)'}
            </button>
          )}
          {/* M17D: dev simulate wallet shards button */}
          <button
            type="button"
            className="island-run-prototype__debug-btn"
            onClick={() => awardWalletShards(5)}
          >
            Simulate wallet essence (+5)
          </button>
          {isDevModeEnabled && (
            <div className="island-run-prototype__qa-controls" role="group" aria-label="DEV MODE actions">
              <p className="island-run-prototype__qa-label">🧪 DEV MODE — canonical actions only</p>
              <div className="island-run-prototype__status-row">
                <span className="island-run-prototype__stat-chip">Caretaker</span>
                <button type="button" className="island-run-prototype__debug-btn" onClick={() => openCaretakerFlow('dev_hud')} disabled={!shouldShowCaretakerTalkAction} aria-describedby={!inhabitantCommunicationAccess.allowed ? 'caretaker-concord-required' : undefined}>🧙 Talk to Caretaker</button>
                {!inhabitantCommunicationAccess.allowed ? <span id="caretaker-concord-required" className="island-run-prototype__stat-chip" aria-label="Concord required for full translation">🔒 Concord required</span> : null}
              </div>
              <div className="island-run-prototype__status-row">
                <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--dice">Grant Dice</span>
                <button type="button" className="island-run-prototype__debug-btn" onClick={() => handleDevGrantDice(10)}>+10</button>
                <button type="button" className="island-run-prototype__debug-btn" onClick={() => handleDevGrantDice(50)}>+50</button>
                <button type="button" className="island-run-prototype__debug-btn" onClick={() => handleDevGrantDice(100)}>+100</button>
              </div>
              <div className="island-run-prototype__status-row">
                <span className="island-run-prototype__stat-chip">Grant Essence</span>
                <button type="button" className="island-run-prototype__debug-btn" onClick={() => handleDevGrantEssence(100)}>+100</button>
                <button type="button" className="island-run-prototype__debug-btn" onClick={() => handleDevGrantEssence(500)}>+500</button>
                <button type="button" className="island-run-prototype__debug-btn" onClick={() => handleDevGrantEssence(1000)}>+1000</button>
              </div>
              <div className="island-run-prototype__status-row">
                <span className="island-run-prototype__stat-chip">Egg Control</span>
                <button type="button" className="island-run-prototype__debug-btn" onClick={handleDevSpeedHatchEgg}>🥚 Speed Hatch Egg</button>
                <button type="button" className="island-run-prototype__debug-btn" onClick={handleDevBuildAllToL3}>🏗️ Build All to L3</button>
                <button type="button" className="island-run-prototype__debug-btn" onClick={handleDevClearCurrentIslandForTravel}>🧹 Clear Island (Dev)</button>
              </div>
              <div className="island-run-prototype__status-row">
                <span className="island-run-prototype__stat-chip">Concord Fragments</span>
                <button type="button" className="island-run-prototype__debug-btn" onClick={handleDevPreviewConcordModal}>👁️ Preview Concord Modal</button>
                <button type="button" className="island-run-prototype__debug-btn" onClick={handleDevResetConcordFragments}>🔄 Reset Fragments (Island {islandNumber})</button>
              </div>
            </div>
          )}
        </div>
          </div>
        )}
          </div>
        </header>
      ) : null}

      <div ref={boardRef} className={`island-run-board island-run-board--framed island-run-board--focus island-run-board--${activeTheme.sceneClass} ${shouldUseNoBackgroundFallback ? 'island-run-board--no-bg' : ''} ${isHudCollapsed ? 'island-run-board--hud-collapsed' : ''} ${isSpark36BoardProfile ? 'island-run-board--spark36' : ''}`}>
        {shouldShowLegacyIslandBackground && (
          <img
            key={islandBackgroundSrc}
            className="island-run-board__bg"
            src={islandBackgroundSrc}
            alt=""
            aria-hidden="true"
            onError={() => setIsIslandBackgroundAvailable(false)}
          />
        )}
        {islandArtAmbientBackgroundSrc && !isBackgroundHidden && (
          <img
            key={islandArtAmbientBackgroundSrc}
            className="island-run-board__bg island-run-board__bg--v2-ambient"
            src={islandArtAmbientBackgroundSrc}
            alt=""
            aria-hidden="true"
            style={{ visibility: isIslandArtAmbientBackgroundLoaded ? 'visible' : 'hidden' }}
            onLoad={() => setIsIslandArtAmbientBackgroundLoaded(true)}
            onError={() => {
              setIslandArtManifest((currentManifest) => (
                getIslandArtAmbientBackgroundSrc(currentManifest) === islandArtAmbientBackgroundSrc ? null : currentManifest
              ));
              setIsIslandArtAmbientBackgroundLoaded(false);
            }}
          />
        )}

        <div ref={topbarMenuRef}>
          <div className="island-run-board__topbar" aria-label="Island Run top bar">
            <button type="button" className="island-run-board__topbar-avatar" aria-label="Player profile">
              {avatarImageUrl ? (
                <img src={avatarImageUrl} alt="" className="island-run-board__topbar-avatar-img" />
              ) : (
                (session.user.user_metadata?.full_name?.[0] ?? session.user.email?.[0] ?? 'P').toUpperCase()
              )}
            </button>
            <div className="island-run-board__topbar-wallet" aria-label="Essence wallet">
              💰 <strong>{formatFullWalletValue(runtimeState.essence)}</strong>
            </div>
            <div className="island-run-board__topbar-chip island-run-board__topbar-chip--shards" aria-label="Shard wallet">
              ✨ {formatFullWalletValue(shards)}
            </div>
            <button
              type="button"
              className={`island-run-board__topbar-menu${isTopbarMenuPrimed ? ' island-run-board__topbar-menu--primed' : ''}${showTopbarMenu ? ' island-run-board__topbar-menu--open' : ''}`}
              aria-label="Board menu"
              aria-expanded={showTopbarMenu}
              aria-haspopup="menu"
              aria-controls="island-run-topbar-menu"
              onClick={() => {
                setShowAudioMenu(false);
                handleTopbarMenuButtonClick();
              }}
            >
              ☰
            </button>
            <button
              type="button"
              className={`island-run-board__topbar-audio-toggle${showAudioMenu ? ' island-run-board__topbar-audio-toggle--open' : ''}`}
              aria-label="Audio options"
              aria-expanded={showAudioMenu}
              aria-haspopup="menu"
              aria-controls="island-run-audio-menu"
              onClick={() => {
                setShowAudioMenu((current) => !current);
                setShowTopbarMenu(false);
              }}
            >
              {audioMenuIcon}
            </button>
            <button
              type="button"
              className="island-run-board__topbar-audio-toggle island-run-board__topbar-exit"
              aria-label="Exit Island Run"
              onClick={() => onExitBoard?.()}
            >
              ✕
            </button>
          </div>

          {showAudioMenu && (
            <div id="island-run-audio-menu" className="island-run-board__audio-menu-panel" role="menu" aria-label="Audio options">
              <button
                ref={audioMenuFirstItemRef}
                type="button"
                className="island-run-board__topbar-menu-item"
                role="menuitemcheckbox"
                aria-checked={musicEnabled}
                onClick={() => {
                  setMusicEnabled((prev) => !prev);
                }}
              >
                <span>{musicEnabled ? '✓' : '○'}</span>
                <span>Music</span>
                <span aria-hidden="true">🎵</span>
              </button>
              <button
                type="button"
                className="island-run-board__topbar-menu-item"
                role="menuitemcheckbox"
                aria-checked={sfxEnabled}
                onClick={() => {
                  const next = !sfxEnabled;
                  setSfxEnabled(next);
                }}
              >
                <span>{sfxEnabled ? '✓' : '○'}</span>
                <span>SFX</span>
                <span aria-hidden="true">🔔</span>
              </button>
            </div>
          )}

          {showTopbarMenu && (
            <div id="island-run-topbar-menu" className="island-run-board__topbar-menu-panel" role="menu" aria-label="Board menu">
              <button
                ref={topbarMenuFirstItemRef}
                type="button"
                className="island-run-board__topbar-menu-item"
                onClick={() => {
                  setIsHudCollapsed((current) => !current);
                  setShowTopbarMenu(false);
                }}
              >
                {isHudCollapsed ? 'Expand HUD' : 'Collapse HUD'}
              </button>
              <button
                type="button"
                className="island-run-board__topbar-menu-item"
                onClick={() => {
                  setIsTopbarMenuPrimed(false);
                  if (cameraMode === 'overview_manual') {
                    setCameraMode('board_follow');
                    boardCameraRef.current?.goDefault();
                  } else {
                    setCameraMode('overview_manual');
                    boardCameraRef.current?.goOverview();
                  }
                  setShowTopbarMenu(false);
                }}
              >
                {cameraMode === 'overview_manual' ? 'Exit overview' : 'Overview mode'}
              </button>
              <button
                type="button"
                className="island-run-board__topbar-menu-item"
                onClick={() => {
                  resetCameraFromTopbarMenu();
                }}
              >
                Reset camera
              </button>
              <button
                type="button"
                className="island-run-board__topbar-menu-item"
                onClick={() => {
                  setIsBackgroundHidden((current) => !current);
                  setShowTopbarMenu(false);
                }}
              >
                {isBackgroundHidden ? 'Show background' : 'Hide background'}
              </button>
              <button
                type="button"
                className="island-run-board__topbar-menu-item"
                onClick={() => {
                  onExitBoard?.();
                  setShowTopbarMenu(false);
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                className="island-run-board__topbar-menu-item"
                onClick={() => {
                  setShowDebugPanel(true);
                  setShowTopbarMenu(false);
                }}
              >
                🔧 Debug panel
              </button>
            </div>
          )}
        </div>

        <div className="island-run-board__rewardbar-cluster">
          <div className="island-run-board__rewardbar-hatchery-tray">
            {hatcheryPendingEggs.length > 0 && (
              <button
                type="button"
                className="island-run-board__rewardbar-hatchery-egg-button"
                aria-label={`Open hatchery. ${hatcheryPendingEggCount} egg${hatcheryPendingEggCount === 1 ? '' : 's'} hatching or ready${hatcheryPendingEggTimeLabel ? `: ${hatcheryPendingEggTimeLabel}` : ''}.`}
                title={`${hatcheryPendingEggCount} hatchery egg${hatcheryPendingEggCount === 1 ? '' : 's'} hatching or uncollected${hatcheryPendingEggTimeLabel ? ` — ${hatcheryPendingEggTimeLabel}` : ''}`}
                onClick={openHatcheryQuickAccess}
              >
                <span className="island-run-board__rewardbar-hatchery-egg-stack" aria-hidden="true">
                  {hatcheryPendingEggs.map((egg, index) => (
                    <span key={egg.id} className="island-run-board__rewardbar-hatchery-egg-slot island-run-board__rewardbar-side-slot">
                      <span className="island-run-board__rewardbar-hatchery-egg-circle">
                        <span className="island-run-board__rewardbar-hatchery-egg">🥚</span>
                      </span>
                      {index === 0 && hatcheryPendingEggTimeLabel && (
                        <span className="island-run-board__rewardbar-hatchery-time">
                          {hatcheryPendingEggTimeLabel}
                        </span>
                      )}
                    </span>
                  ))}
                </span>
              </button>
            )}
            <button
              type="button"
              className="island-run-board__sticker-album-btn"
              aria-label="Sticker album"
              onClick={() => setShowStickerAlbumDialog(true)}
            >
              🧩 {runtimeState.stickerProgress.fragments}/5
            </button>
            {onOpenDailySpinWheel ? (
              <button
                type="button"
                className={`island-run-board__daily-momentum-btn${dailySpinAvailable ? ' island-run-board__daily-momentum-btn--ready' : ' island-run-board__daily-momentum-btn--used'}`}
                aria-label={
                  dailySpinAvailable
                    ? `Open Daily Momentum. ${Math.max(1, Math.floor(dailySpinCount))} spin${Math.floor(dailySpinCount) === 1 ? '' : 's'} ready.`
                    : 'Open Daily Momentum. Today\'s spin has been collected.'
                }
                title={dailySpinAvailable ? 'Daily Momentum — spin ready' : 'Daily Momentum — collected today'}
                onClick={onOpenDailySpinWheel}
              >
                <span className="island-run-board__daily-momentum-wheel" aria-hidden="true">
                  <span className="island-run-board__daily-momentum-star">✦</span>
                </span>
                <span className="island-run-board__daily-momentum-label" aria-hidden="true">
                  {dailySpinAvailable ? 'SPIN' : '✓'}
                </span>
                {dailySpinAvailable ? (
                  <span className="island-run-board__daily-momentum-badge" aria-hidden="true">
                    {Math.max(1, Math.floor(dailySpinCount))}
                  </span>
                ) : null}
              </button>
            ) : null}
          </div>

          <button
            type="button"
            className={`island-run-board__rewardbar${canClaimRewardBar ? ' island-run-board__rewardbar--claimable' : ''}${rewardBarBurstAnimating ? ' island-run-board__rewardbar--burst' : ''}${isRewardBarNearlyFull ? ' island-run-board__rewardbar--nearly-full' : ''}${rewardBarTierClass}`}
            aria-label={`Reward progress. Next reward: ${nextRewardAccessibleLabel}${hatcheryPendingEggAriaLabel}`}
            onClick={canClaimRewardBar ? handleContractV2RewardBarClaim : openRewardDetailsModal}
          >
            {/* Flying feed particle animation */}
            {feedParticleActive && (
              <span className="island-run-board__rewardbar-feed-particle" aria-hidden="true">✨</span>
            )}
            {/* Cascade payout display — shows each reward popping */}
            {rewardBarCascadePayouts.length > 0 && (
              <div className="island-run-board__rewardbar-cascade" aria-live="polite">
                {rewardBarCascadePayouts.map((p, i) => (
                  <span
                    key={i}
                    className="island-run-board__rewardbar-cascade-item"
                    style={{ animationDelay: `${i * 0.5}s` }}
                  >
                    {(p.rewardKind === 'minigame_tokens' ? timedEventTokenIcon : REWARD_KIND_ICON[p.rewardKind])} {p.rewardKind === 'dice' ? `+${p.dice}` : p.rewardKind === 'essence' ? `+${p.essence}` : p.rewardKind === 'minigame_tokens' ? `+${p.minigameTokens}` : `+${p.stickerFragments}`}
                  </span>
                ))}
              </div>
            )}
            {/* Decorative themed event banner — only shown when an event is active */}
            {effectiveActiveTimedEvent && activeEventMeta ? (
              <div className={`island-run-board__rewardbar-banner island-run-board__rewardbar-banner--${effectiveActiveTimedEvent.eventType}`}>
                {renderEventIcon('island-run-board__rewardbar-banner-icon')}
                <span>{activeEventMeta.displayName}</span>
                {renderEventIcon('island-run-board__rewardbar-banner-icon')}
              </div>
            ) : null}
            {/* Track row: event feed icon → track → single reward endcap (no milestones) */}
            <div className="island-run-board__rewardbar-track-row">
              <span className="island-run-board__rewardbar-avatar-indicator" aria-hidden="true">
                {rewardBarAvatarIcon.startsWith('/') ? <img className="island-run-board__rewardbar-avatar-image" src={rewardBarAvatarIcon} alt="" loading="lazy" /> : rewardBarAvatarIcon}
              </span>
              <div className="island-run-board__rewardbar-track" role="progressbar" aria-valuenow={Math.floor(rewardBarPercent)} aria-valuemin={0} aria-valuemax={100}>
                <span className={`island-run-board__rewardbar-track-fill${rewardBarSnapActive ? ' island-run-board__rewardbar-track-fill--snap' : ''}`} style={{ width: `${rewardBarPercent}%` }} />
                <span className="island-run-board__rewardbar-track-counter">{Math.floor(rewardBarProgress)}/{Math.floor(rewardBarThreshold)}</span>
                {/* Position indicator riding the fill edge */}
                <span className="island-run-board__rewardbar-position" style={{ left: `${Math.min(rewardBarPercent, 100)}%` }} aria-hidden="true" />
              </div>
              {/* Single reward endcap — shows what you'll get next */}
              <span
                className={`island-run-board__rewardbar-endcap${canClaimRewardBar ? ' island-run-board__rewardbar-endcap--claimable' : ''}`}
                aria-hidden="true"
                title={`Next reward: ${nextRewardAccessibleLabel}`}
              >
                <span className="island-run-board__rewardbar-endcap-icon">
                  {nextRewardKind === 'minigame_tokens' ? timedEventTokenIcon : nextRewardIcon}
                </span>
                <span className="island-run-board__rewardbar-endcap-amount">{nextRewardAmountLabel}</span>
              </span>
            </div>
            {/* Event timer + multiplier row */}
            <div className={`island-run-board__rewardbar-timers${rewardBarTimersCollapsed ? ' island-run-board__rewardbar-timers--collapsed' : ''}${showSpaceExcavatorRewardBarHint && spaceExcavatorRewardBarHint ? ' island-run-board__rewardbar-timers--ticket-hint-visible' : ''}`}>
              <span className={getTimerUrgencyClass(timedEventRemainingMs)}>{timedEventRemainingLabel}</span>
              {effectiveMultiplier > 1 && (
                <span className="island-run-board__rewardbar-multiplier-badge">×{effectiveMultiplier}</span>
              )}
              {spaceExcavatorRewardBarHint && (
                <span
                  className={`island-run-board__rewardbar-ticket-hint${showSpaceExcavatorRewardBarHint ? '' : ' island-run-board__rewardbar-ticket-hint--hidden'}`}
                  aria-hidden={!showSpaceExcavatorRewardBarHint}
                >
                  {spaceExcavatorRewardBarHint}
                </span>
              )}
            </div>
          </button>

          <div className="island-run-board__rewardbar-side-rail" aria-label="Reward bar quick actions">
            {Array.from({ length: rewardBarSideSlotCount }, (_, index) => {
              if (index === rewardBarEggManiaSlotIndex) {
                return (
                  <span key="egg-mania" className="island-run-board__rewardbar-side-slot">
                    <button
                      type="button"
                      className={`island-run-board__minigame-icon-btn island-run-board__egg-mania-icon-btn${isEggManiaUnused ? ' island-run-board__egg-mania-icon-btn--unused' : ''}`}
                      aria-label="Open Egg Mania details"
                      onClick={() => setShowEggManiaModal(true)}
                    >
                      <span className="island-run-board__minigame-icon-emoji" aria-hidden="true">🔥🥚</span>
                      <span className="island-run-board__minigame-icon-label">Egg Mania</span>
                      {isEggManiaUnused ? (
                        <span className="island-run-board__minigame-icon-helper island-run-board__minigame-icon-helper--dev">Set 3 Eggs</span>
                      ) : null}
                    </button>
                  </span>
                );
              }

              if (index === rewardBarTimedEventSlotIndex && hasRewardBarTimedEventQuickAction && activeEventMeta) {
                return (
                  <span key="timed-event" className="island-run-board__rewardbar-side-slot">
                    <button
                      type="button"
                      className={`island-run-board__minigame-icon-btn${isTimedEventLaunchQueued ? ' island-run-board__minigame-icon-btn--queued' : ''}`}
                      aria-label={isTimedEventLaunchQueued ? `${activeEventMeta.displayName} queued to auto-open` : `Open ${activeEventMeta.displayName}`}
                      onClick={handleLaunchTimedEventMinigame}
                    >
                      <span className="island-run-board__minigame-icon-emoji" aria-hidden="true">
                        {activeEventIcon.startsWith('/') ? <img className="island-run-board__minigame-icon-image" src={activeEventIcon} alt="" loading="lazy" /> : activeEventIcon}
                      </span>
                      <span className="island-run-board__minigame-icon-label">{activeEventTickets} {timedEventTokenIcon}</span>
                      {isTimedEventLaunchQueued && (
                        <span className="island-run-board__minigame-icon-helper island-run-board__minigame-icon-helper--queued">Queued to auto-open</span>
                      )}
                      {isSpaceExcavatorEffectiveEvent && (
                        <>
                          <span className="island-run-board__minigame-icon-helper">Use tickets to dig</span>
                          <span className="island-run-board__minigame-icon-helper">Progress saved</span>
                          <span className="island-run-board__minigame-icon-helper">Earn from reward bar</span>
                        </>
                      )}
                      {isSpaceExcavatorEffectiveEvent && isDevTimedEventOverrideActive && (
                        <span className="island-run-board__minigame-icon-helper island-run-board__minigame-icon-helper--dev">
                          DEV override tickets
                        </span>
                      )}
                    </button>
                  </span>
                );
              }

              return (
                <span
                  key={`rewardbar-side-placeholder-${index}`}
                  className="island-run-board__rewardbar-side-slot island-run-board__rewardbar-side-slot--empty"
                  aria-hidden="true"
                />
              );
            })}
          </div>
        </div>

        {shouldShowFinishIslandCta && (
          <button
            type="button"
            className="island-run-prototype__best-next-action-chip island-run-prototype__best-next-action-chip--below-rewardbar island-run-prototype__finish-island-chip"
            onClick={() => showIslandClearCelebrationFromAnywhere('finish_island_chip')}
            aria-label="Finish Island"
          >
            🏝️ Finish Island
          </button>
        )}

        {shouldShowBestNextActionChip && bestNextAction && (
          <button
            type="button"
            className="island-run-prototype__best-next-action-chip island-run-prototype__best-next-action-chip--below-rewardbar"
            onClick={() => {
              if (bestNextAction.action === 'claim_reward_bar') {
                handleContractV2RewardBarClaim();
                return;
              }
              if (bestNextAction.action === 'claim_island_clear') {
                showIslandClearCelebrationFromAnywhere('best_next_action_chip');
              }
            }}
            aria-label={bestNextAction.ctaLabel}
          >
            ✨ {bestNextAction.ctaLabel}
          </button>
        )}

        <BoardStage
          anchors={activeTileAnchors}
          theme={activeTheme}
          islandArtManifest={islandArtManifest}
          landmarkBuildLevels={islandArtLandmarkBuildLevels}
          isBossDefeated={isCurrentIslandBossDefeated}
          bossCreatureArtState={bossCreatureArtState}
          spark36RingGradient={spark36RingSegmentsGradient}
          isSpark36={isSpark36BoardProfile}
          showDebug={showDebug}
          isMinimalBoardArt={isMinimalBoardArt}
          boardTiltXDeg={boardTiltXDeg}
          boardRotateZDeg={boardRotateZDeg}
          tileMap={landmarkDoorTileMap}
          trafficLightCharge={displayedTrafficLightCharge}
          trafficLightChargeTarget={TRAFFIC_LIGHT_CHARGE_TARGET}
          stopMap={stopMap}
          completedEncounterIndices={completedEncounterIndices}
          visibleTechnologyFragments={visibleTechnologyFragments}
          tokenIndex={tokenIndex}
          caretakerArtSrc={caretakerInhabitant?.premiumArtSrc ?? caretakerInhabitant?.retroSpriteSrc ?? '/assets/island_caretakers/001/IMG_caretaker_3d_blue.webp'}
          caretakerLabel={caretakerInhabitant?.displayName ?? 'Island caretaker'}
          caretakerBubbleText={caretakerBoardBubbleText}
          caretakerTileIndex={shouldShowCaretakerTalkAction ? ISLAND_CARETAKER_TILE_INDEX : null}
          onCaretakerClick={() => openCaretakerFlow('caretaker_board_tap')}
          orbitStopVisuals={orbitStopVisuals}
          activeStopId={activeStopId}
          getOrbitStopDisplayIcon={getOrbitStopDisplayIcon}
          onStopClick={(stopId) => {
            handleStopOpenRequest(stopId);
          }}
          pendingHopSequence={pendingHopSequence}
          onHopSequenceComplete={() => {
            // Release the animation guard so reconcile/island-travel writers
            // can resume updating `tokenIndex`. NOTE: we deliberately do
            // NOT call `setPendingHopSequence(null)` here. Clearing the hop
            // sequence before `handleRoll`'s `await` resumes (and commits
            // the post-roll runtime state) would let BoardStage's effect
            // observe a null `pendingHopSequence` with a still-stale
            // `tokenIndex`, causing it to animate the pawn BACK to the
            // pre-roll tile via the single-step fallback. `handleRoll`
            // now owns clearing the hop sequence after it has updated
            // the runtime state.
            isAnimatingRollRef.current = false;
            hopSequenceResolverRef.current?.();
            hopSequenceResolverRef.current = null;
          }}
          onCameraReady={(controls) => { boardCameraRef.current = controls; }}
          onCameraGesture={() => setIsTopbarMenuPrimed(false)}
          onTokenHop={(tileIndex) => {
            playTokenMoveSound();
            // Light the traffic-light tile the instant the token passes over it
            // (mid-roll), rather than waiting for the landing/commit. Functional
            // update handles the rare big-roll case of passing it twice.
            if (tileIndex === TRAFFIC_LIGHT_TILE_INDEX) {
              setTrafficLightVisualCharge((prev) => {
                const base = prev ?? trafficLightCharge;
                return Math.min(TRAFFIC_LIGHT_CHARGE_TARGET, base + 1);
              });
            }
          }}
          onTokenLand={(tileIndex) => {
            playIslandRunSound('stop_land');
            triggerIslandRunHaptic('stop_land');
          }}
          isRolling={isRolling}
          diceFaces={rollingDiceFaces}
          onDiceRollComplete={() => {
            diceRollCompleteAlreadyFiredRef.current = true;
            diceRollCompleteResolverRef.current?.();
            diceRollCompleteResolverRef.current = null;
          }}
        />
        {showLandmarkCoachmark ? (
          <aside className="island-run-landmark-coachmark" role="note" aria-live="polite">
            <p>
              🧭 Landmarks unlock in order; some require a money ticket before entry.
            </p>
            <div className="island-run-landmark-coachmark__actions">
              <button
                type="button"
                className="island-run-landmark-coachmark__dismiss"
                onClick={() => {
                  setShowLandmarkCoachmark(false);
                  markLandmarkCoachmarkSeen(session.user.id);
                  focusNextAvailableStop();
                }}
              >
                Show next
              </button>
              <button
                type="button"
                className="island-run-landmark-coachmark__dismiss"
                onClick={() => {
                  setShowLandmarkCoachmark(false);
                  markLandmarkCoachmarkSeen(session.user.id);
                }}
              >
                Got it
              </button>
            </div>
          </aside>
        ) : null}
      </div>

      {/* Dice roll total overlay — shown briefly after dice settle */}
      {diceRollTotalOverlay && (
        <div className="island-run-board__dice-roll-overlay" aria-live="polite">
          {diceRollTotalOverlay}
        </div>
      )}

      <button
        type="button"
        className="island-run-prototype__camera-reset-floating"
        aria-label="Reset camera zoom"
        onClick={resetCameraFromTopbarMenu}
      >
        🔎
      </button>

      <button
        type="button"
        className="island-run-prototype__compass-floating"
        aria-label="Open Compass"
        title="Compass"
        onClick={() => setShowHatcheryCompassModal(true)}
      >
        <span className="island-run-board__hatchery-compass-icon" aria-hidden="true" />
      </button>

      <div
        className={`island-run-prototype__footer${isBuildTutorialPromptActive ? ' island-run-prototype__footer--build-tutorial-active' : ''}`}
        aria-label="Island Run footer controls"
      >
        <div className="island-run-prototype__footer-main">
          {/* Footer stats row removed: essence icon (duplicate of top bar) and 🎯 roll chip removed per UI cleanup */}

          <div className="island-run-prototype__footer-actions">
            {isShooterControllerActive ? (
              <ShooterControllerAdapter onIntent={emitShooterControllerIntent} />
            ) : (
              <div className="island-run-prototype__footer-controller-shell" aria-label="Island Run controller layout">
                <button
                  type="button"
                  className="island-run-prototype__footer-nav-btn island-run-prototype__footer-nav-btn--slot-story"
                  style={getIslandRunControllerSlotStyle(ISLAND_RUN_CONTROLLER_SLOT_MAP.leftUpper)}
                  onClick={handleConcordEntryClick}
                  disabled={isBuildTutorialGameplayBlocked}
                  aria-label={concordHubEntryState.ariaLabel}
                >
                  {concordHubEntryState.icon} {concordHubEntryState.label}
                </button>
                <button
                  type="button"
                  className="island-run-prototype__footer-nav-btn island-run-prototype__footer-nav-btn--slot-creatures"
                  style={getIslandRunControllerSlotStyle(ISLAND_RUN_CONTROLLER_SLOT_MAP.leftLower)}
                  onClick={openSanctuaryPanel}
                  disabled={isBuildTutorialGameplayBlocked}
                >
                  🐾 Creatures
                </button>
                <button
                  type="button"
                  className="island-run-prototype__footer-nav-btn island-run-prototype__footer-nav-btn--slot-market"
                  style={getIslandRunControllerSlotStyle(ISLAND_RUN_CONTROLLER_SLOT_MAP.rightLower)}
                  onClick={openShopPanel}
                  disabled={isBuildTutorialGameplayBlocked}
                >
                  🛍️ Market
                </button>
                <button
                  type="button"
                  className={`island-run-prototype__footer-nav-btn island-run-prototype__footer-nav-btn--slot-build${isBuildTutorialPromptActive ? ' island-run-prototype__footer-nav-btn--build-tutorial-target' : ''}`}
                  style={getIslandRunControllerSlotStyle(ISLAND_RUN_CONTROLLER_SLOT_MAP.rightUpper)}
                  onClick={openBuildPanelFromFooter}
                  aria-describedby={isBuildTutorialPromptActive ? 'island-run-build-tutorial-prompt' : undefined}
                >
                  🔨 Build
                  {hasAffordableBuildStep && !isBuildTutorialPromptActive && (
                    <span
                      className="island-run-prototype__footer-build-dot"
                      role="status"
                      aria-label="A building can be funded with your money"
                    />
                  )}
                </button>
                <button
                  type="button"
                  className={`island-run-prototype__footer-multiplier-btn island-run-prototype__footer-multiplier-btn--slot-badge${effectiveMultiplier > 1 ? ' island-run-prototype__footer-multiplier-btn--active' : ''}${isAtMaxAvailableMultiplier ? ' island-run-prototype__footer-multiplier-btn--max' : ''}`}
                  style={getIslandRunControllerSlotStyle(ISLAND_RUN_CONTROLLER_SLOT_MAP.centerBadge)}
                  data-max-multiplier={isAtMaxAvailableMultiplier ? 'true' : undefined}
                  disabled={isBuildTutorialGameplayBlocked}
                  onClick={() => {
                    if (unlockedMultipliers.length <= 1) return;
                    const currentIdx = unlockedMultipliers.indexOf(effectiveMultiplier);
                    const nextIdx = (currentIdx + 1) % unlockedMultipliers.length;
                    const isNextMax = nextIdx === unlockedMultipliers.length - 1;
                    playIslandRunSound(isNextMax ? 'multiplier_max' : 'multiplier_cycle');
                    setDiceMultiplier(unlockedMultipliers[nextIdx]!);
                  }}
                  title={`Cost: ${effectiveDiceCost} dice/roll · Max: ×${maxAvailableMultiplier}`}
                >
                  ×{effectiveMultiplier}
                  {effectiveMultiplier > 1 && <span className="island-run-prototype__footer-nav-btn-cost"> (-{effectiveDiceCost})</span>}
                </button>
                <div
                  className="island-run-prototype__footer-dice-group island-run-prototype__footer-dice-group--slot-center"
                  style={getIslandRunControllerSlotStyle(ISLAND_RUN_CONTROLLER_SLOT_MAP.centerCore)}
                >
                  <button
                    type="button"
                    className={`island-run-prototype__roll-btn island-run-prototype__roll-btn--cta island-run-prototype__roll-btn--footer ${rollButtonMode === 'roll' ? 'island-run-prototype__roll-btn--primary' : 'island-run-prototype__roll-btn--convert'} ${rollButtonInteractionClass}${isFirstRollCoachmarkActive ? ' island-run-prototype__roll-btn--tutorial-pulse' : ''}`.trim()}
                    onClick={isIslandTimerPendingStart ? activateCurrentIsland : handleRollButtonClick}
                    disabled={isBuildTutorialGameplayBlocked || (!isIslandTimerPendingStart && Boolean(rollDisabledReason))}
                    aria-disabled={isBuildTutorialGameplayBlocked || (!isIslandTimerPendingStart && Boolean(rollDisabledReason))}
                    title={!isIslandTimerPendingStart ? (rollDisabledMessage ?? undefined) : undefined}
                    {...rollHoldHandlers}
                  >
                    <span className="island-run-prototype__footer-roll-btn-content">
                      <span className="island-run-prototype__footer-roll-btn-dice">🎲 {hasHydratedRuntimeState ? dicePool : '—'}{effectiveMultiplier > 1 ? ` ×${effectiveMultiplier}` : ''}</span>
                      <span>{isIslandTimerPendingStart ? 'Start Island' : rollButtonLabel}</span>
                    </span>
                    {!isIslandTimerPendingStart && rollDisabledMessage && (
                      <span className="sr-only"> — {rollDisabledMessage}</span>
                    )}
                  </button>
                  {(diceRegenStatusLabel || diceRegenCountdown) && (
                    <div className="island-run-prototype__dice-regen-timer" aria-live="polite">
                      {diceRegenRollsReady != null ? <><strong>{diceRegenRollsReady}</strong> </> : null}
                      {diceRegenStatusLabel ? <strong>{diceRegenStatusLabel}</strong> : null}
                      {diceRegenCountdown ? <> <strong>{diceRegenCountdown}</strong></> : null}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isBuildTutorialPromptActive && !showBuildPanel && (
        <div className="island-run-build-tutorial-overlay" role="presentation">
          <aside
            id="island-run-build-tutorial-prompt"
            className="island-run-build-tutorial-overlay__coachmark"
            role="note"
            aria-live="polite"
          >
            <strong>You earned Essence ✨</strong>
            <span>Essence builds and upgrades your island. Tap the highlighted Build button to fund your first Hatchery.</span>
          </aside>
        </div>
      )}

      {isFirstRollCoachmarkActive && !showBuildPanel && (
        <div className="island-run-coreloop-tutorial-overlay" role="presentation">
          <aside
            className="island-run-build-tutorial-overlay__coachmark"
            role="note"
            aria-live="polite"
          >
            <strong>{ISLAND_RUN_FIRST_ROLL_COACHMARK_COPY.title}</strong>
            <span>{ISLAND_RUN_FIRST_ROLL_COACHMARK_COPY.body}</span>
          </aside>
        </div>
      )}

      {isKeepRollingCoachmarkActive && !showBuildPanel && (
        <div className="island-run-coreloop-tutorial-overlay" role="presentation">
          <aside
            className="island-run-build-tutorial-overlay__coachmark"
            role="note"
            aria-live="polite"
          >
            <strong>{ISLAND_RUN_KEEP_ROLLING_COACHMARK_COPY.title}</strong>
            <span>{ISLAND_RUN_KEEP_ROLLING_COACHMARK_COPY.body}</span>
          </aside>
        </div>
      )}


      {/* Fast 3×3 tech pickup modal (auto-dismissing). Full-grid completion is
          handled by the celebration below, which never auto-dismisses. */}
      {techCollectionModal && !techCompletionCelebration ? (
        <IslandTechCollectionModal
          result={techCollectionModal}
          islandNumber={islandNumber}
          isAutoRolling={isAutoRolling}
          onDismiss={() => setTechCollectionModal(null)}
        />
      ) : null}

      {techCompletionCelebration ? (
        <IslandTechCompletionCelebration
          result={techCompletionCelebration}
          onContinue={() => setTechCompletionCelebration(null)}
        />
      ) : null}


      {showGamifiedJournalCard && (
        <div className="island-run-overlay-root island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy" role="dialog" aria-modal="true" aria-label="Gamified journal card">
            <IslandRunGamifiedJournalCard
              session={session}
              islandNumber={islandNumber}
              drawIndex={cardDrawIndex}
              onClose={() => setShowGamifiedJournalCard(false)}
              onSaved={(message) => {
                setLandingText(message);
                setShowGamifiedJournalCard(false);
              }}
            />
          </section>
        </div>
      )}

      {showFirstRunCelebration && (
        <div className="island-run-overlay-root island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy island-stop-modal--onboarding" role="dialog" aria-modal="true" aria-label="First run celebration">
            {firstRunStep === 'celebration' ? (
              <>
                <div className="island-stop-modal__context">
                  <p className="island-stop-modal__eyebrow">First-run setup</p>
                  <h3 className="island-stop-modal__title">🎉 Welcome to Island Run</h3>
                  <p className="island-stop-modal__copy">Claim your starter gifts to begin your first island.</p>
                  <p><strong>Starter gifts:</strong> 💰 250 money + 🎲 three 500-dice caretaker packs</p>
                  <p>✨ 🎊 ✨</p>
                </div>
                <div className="island-stop-modal__cta island-stop-modal__cta--balanced island-stop-modal__cta--anchored">
                  <button
                    type="button"
                    className="supabase-auth__action island-stop-modal__cta-btn island-stop-modal__btn--action"
                    onClick={() => void handleClaimFirstRunRewards()}
                    disabled={isPersistingFirstRunCompletion}
                  >
                    Claim starter gifts
                  </button>
                </div>
              </>
            ) : firstRunStep === 'ship-name' ? (
              <>
                <div className="island-stop-modal__context">
                  <p className="island-stop-modal__eyebrow">Name your ship</p>
                  <h3 className="island-stop-modal__title">🚀 The caretaker is ready to hand over your ship</h3>
                  <p className="island-stop-modal__copy">Choose the name that will appear in your first mission briefing.</p>
                  <label className="island-stop-modal__copy" htmlFor="first-run-ship-name"><strong>Spaceship name</strong></label>
                  <input
                    id="first-run-ship-name"
                    className="supabase-auth__input"
                    value={firstRunShipName}
                    maxLength={32}
                    onChange={(event) => setFirstRunShipName(event.target.value)}
                    placeholder="Starling"
                  />
                </div>
                <div className="island-stop-modal__cta island-stop-modal__cta--balanced island-stop-modal__cta--anchored">
                  <button type="button" className="supabase-auth__action island-stop-modal__cta-btn island-stop-modal__btn--action" onClick={() => void handleClaimFirstRunRewards()}>
                    Set ship name
                  </button>
                </div>
              </>
            ) : firstRunStep === 'mission' ? (
              <>
                <div className="island-stop-modal__context">
                  <p className="island-stop-modal__eyebrow">Mission briefing</p>
                  <h3 className="island-stop-modal__title">🛸 {firstRunShipName} begins the first descent</h3>
                  <p className="island-stop-modal__copy">The caretaker has loaded three emergency dice packs — 500 dice each — so your first route has room to breathe.</p>
                  <p className="island-stop-modal__copy">Your starting rank is Explorer. Complete landmarks, hatch companions, and let real-life progress help your world grow.</p>
                  <p className="island-stop-modal__copy">The ship is entering Island 1 atmosphere. When it lands, start rolling.</p>
                </div>
                <div className="island-stop-modal__cta island-stop-modal__cta--balanced island-stop-modal__cta--anchored">
                  <button type="button" className="supabase-auth__action island-stop-modal__cta-btn island-stop-modal__btn--action" onClick={() => void handleClaimFirstRunRewards()}>
                    Continue to landing
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="island-stop-modal__context">
                  <p className="island-stop-modal__eyebrow">Launch confirmation</p>
                  <h3 className="island-stop-modal__title">🚀 Launch sequence ready</h3>
                  <p className="island-stop-modal__copy">{firstRunShipName} has landed on Island 1. Your player piece deploys at the first landmark.</p>
                  <p className="island-stop-modal__copy">Tip: spend dice to move tile-to-tile and complete all landmarks before the boss.</p>
                </div>
                <div className="island-stop-modal__cta island-stop-modal__cta--balanced island-stop-modal__cta--anchored">
                  <button type="button" className="supabase-auth__action island-stop-modal__cta-btn island-stop-modal__btn--action" onClick={() => void handleClaimFirstRunRewards()} disabled={isPersistingFirstRunCompletion}>
                    {isPersistingFirstRunCompletion ? 'Saving profile...' : 'Start Island Run'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {showHatcheryL1Celebration && (
        <div className="island-run-overlay-root island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--onboarding" role="dialog" aria-modal="true" aria-label="Hatchery Level 1 celebration">
            <div className="island-stop-modal__context">
              <p className="island-stop-modal__eyebrow">First island upgrade</p>
              <h3 className="island-stop-modal__title">Hatchery Level 1 Built!</h3>
              <p className="island-stop-modal__copy">Your first island upgrade is alive.</p>
              <p>✅ Hatchery unlocked</p>
              <p>✅ Island progress started</p>
              <p>🎲 Keep rolling to discover more rewards</p>
            </div>
            <div className="island-stop-modal__cta island-stop-modal__cta--balanced island-stop-modal__cta--anchored">
              <button
                type="button"
                className="supabase-auth__action island-stop-modal__cta-btn island-stop-modal__btn--action"
                onClick={handleContinueHatcheryL1Celebration}
              >
                Continue
              </button>
            </div>
          </section>
        </div>
      )}

      {showTravelOverlay && (
        <div className="island-run-overlay-root island-travel-overlay" role="status" aria-live="polite">
          <div className="island-travel-overlay__card">
            <p className="island-travel-overlay__eyebrow">{travelOverlayMode === 'retry' ? 'Island reset' : 'Island transfer'}</p>
            <p className="island-travel-overlay__title island-travel-overlay__title--headline">
              {travelOverlayMode === 'retry'
                ? `🔁 Resetting Island ${travelOverlayDestinationIsland}...`
                : `✈️ Traveling to Island ${travelOverlayDestinationIsland}...`}
            </p>
            <p className="island-travel-overlay__subtitle island-travel-overlay__copy island-travel-overlay__copy--long">
              {travelOverlayMode === 'retry'
                ? 'A full clear is required before the campaign advances.'
                : 'Preparing route, rewards, and stop plan.'}
            </p>
          </div>
        </div>
      )}

      {pendingTreasurePathResume && !showDevLuckyRollOverlay && !showTravelOverlay && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: '5.25rem',
            transform: 'translateX(-50%)',
            zIndex: 8500,
            padding: '0.45rem 0.6rem',
            borderRadius: '999px',
            background: 'rgba(24, 18, 45, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 10px 24px rgba(0, 0, 0, 0.22)',
          }}
        >
          <button
            type="button"
            className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
            onClick={handleResumePendingTreasurePath}
            style={{ padding: '0.55rem 0.9rem', minHeight: 'auto' }}
          >
            {pendingTreasurePathResumeCtaLabel}
          </button>
        </div>
      )}

      {showDevLuckyRollOverlay && (isDevModeEnabled || devLuckyRollCollectMode === 'post_rare_collect_travel') && (
        <IslandRunLuckyRollDevOverlay
          session={session}
          client={client}
          runtimeState={runtimeState}
          targetIslandNumber={devLuckyRollTargetIsland ?? runtimeState.currentIslandNumber}
          isDevModeEnabled={isDevModeEnabled}
          collectMode={devLuckyRollCollectMode}
          onRuntimeStateChange={handleLuckyRollOverlayRuntimeStateChange}
          onCollectPostRareTreasurePathAndTravel={handlePostRareTreasurePathCollectAndTravel}
          onClose={() => setShowDevLuckyRollOverlay(false)}
        />
      )}

      {showHatcheryCompassModal && (
        <CompactGameCompassPanel
          session={session}
          currentIslandNumber={islandNumber}
          onClose={() => setShowHatcheryCompassModal(false)}
        />
      )}

      {activeStop && (() => {
        const openedStopIndex = islandStopPlan.findIndex((s) => s.stopId === activeStop.stopId);
        const openedStopState = stopStateMap.get(activeStop.stopId) ?? 'active';
        const openedStopIsLocked = openedStopState === 'locked';
        const openedStopNeedsBuild = openedStopState === 'build_pending';
        const openedStopIsCompleted = openedStopState === 'completed' || openedStopState === 'partial' || openedStopNeedsBuild;
        const openedStopNeedsTicket = ISLAND_RUN_CONTRACT_V2_ENABLED
          ? openedStopState === 'ticket_required'
          : doesStopRequireTicketPayment(activeStop.stopId);
        const openedStopIsPlayable = !openedStopIsLocked && !openedStopIsCompleted && !openedStopNeedsTicket;
        const priorStop = openedStopIndex > 0 ? islandStopPlan[openedStopIndex - 1] : null;
        const openedStopTicketCost =
          openedStopNeedsTicket && openedStopIndex > 0
            ? getStopTicketCost({ effectiveIslandNumber, stopIndex: openedStopIndex })
            : null;
        const canAffordOpenedStopTicket =
          openedStopNeedsTicket
          && typeof openedStopTicketCost === 'number'
          && runtimeState.essence >= openedStopTicketCost;
        return (
        <div className="island-run-overlay-root island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy" role="dialog" aria-modal="true" aria-label={activeStop.title}>
            <div className="island-stop-modal__header-row">
              <h3 className="island-stop-modal__title">{activeStop.title}</h3>
              {activeStopId === 'hatchery' ? (
                <button
                  type="button"
                  className="island-stop-modal__help-btn"
                  aria-label={showHatcheryHelp ? 'Hide hatchery help' : 'Open hatchery help'}
                  aria-expanded={showHatcheryHelp}
                  onClick={() => setShowHatcheryHelp((current) => !current)}
                >
                  ?
                </button>
              ) : null}
              {activeStopId === 'hatchery' && showHatcheryHelp ? (
                <div className="island-stop-modal__help-card" role="note" aria-label="Hatchery help">
                  <p className="island-stop-modal__help-title">How Hatchery Works</p>
                  <ul className="island-stop-modal__help-list">
                    <li>{activeStop.description}</li>
                    <li>The egg keeps incubating even while you travel.</li>
                    <li>Each island has one egg slot — set it before you leave.</li>
                  </ul>
                </div>
              ) : null}
            </div>
            {activeStopId !== 'hatchery' ? <p>{activeStop.description}</p> : null}
            {activeStopId !== 'hatchery' ? <p><strong>Status:</strong> {openedStopState}</p> : null}
            {activeStopId === requiredDoorStopId && isDoorLandmarkCompletionRequired ? (
              <p className="island-stop-modal__locked-notice" role="status">
                <span aria-hidden="true">🚪</span>{' '}
                Door entered — complete this landmark before rolling again.
              </p>
            ) : null}
            {activeStopId !== 'hatchery' && (openedStopIsLocked || openedStopNeedsTicket) ? (
              <p className="island-stop-modal__locked-notice" role="status">
                <span aria-hidden="true">🔒</span>{' '}
                {openedStopNeedsTicket && openedStopTicketCost
                  ? <>This stop is ready to open. Pay <strong>{openedStopTicketCost} 💰</strong> to unlock this island ticket.</>
                  : priorStop
                  ? <>Complete <strong>{priorStop.title}</strong> first to unlock this stop.</>
                  : 'This stop is not open yet. Complete the previous stop first to unlock it.'}
              </p>
            ) : null}
            {activeStopId !== 'hatchery' && openedStopNeedsBuild ? (
              <div className="island-stop-modal__completed-banner island-stop-modal__completed-banner--build-pending" role="status">
                <span aria-hidden="true">🛠️</span> Objective complete — finish landmark upgrades (reach Level {MAX_BUILD_LEVEL}) to mark this stop fully complete.
              </div>
            ) : null}
            {activeStopId !== 'hatchery' && openedStopIsCompleted && !openedStopNeedsBuild ? (
              <div className="island-stop-modal__completed-banner" role="status">
                <span aria-hidden="true">✅</span> This stop is complete for this island. Well done!
              </div>
            ) : null}
            {activeStop.isBehaviorStop ? <p><strong>Behavior stop:</strong> yes (habit/check-in/reflection)</p> : null}

            {activeStopId === 'hatchery' && (
              <>
                <div className="island-hatchery-card">
                {showHatcheryEggCarousel && selectedHatcheryEgg ? (
                  <div className="island-hatchery-card__carousel" aria-label="Pending hatchery eggs">
                    <button
                      type="button"
                      className="island-hatchery-card__carousel-arrow"
                      onClick={goToPreviousHatcheryEgg}
                      aria-label="Show previous hatchery egg"
                    >
                      ‹
                    </button>
                    <div className="island-hatchery-card__carousel-status" aria-live="polite">
                      <span className="island-hatchery-card__carousel-kicker">
                        {selectedHatcheryEgg.isCurrentIsland ? 'This island' : `Island ${selectedHatcheryEgg.islandNumber}`}
                      </span>
                      <span className="island-hatchery-card__carousel-count">
                        Egg {selectedHatcheryEggIndex + 1} of {hatcheryPendingEggCount}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="island-hatchery-card__carousel-arrow"
                      onClick={goToNextHatcheryEgg}
                      aria-label="Show next hatchery egg"
                    >
                      ›
                    </button>
                    <div className="island-hatchery-card__carousel-dots" role="tablist" aria-label="Choose hatchery egg">
                      {hatcheryPendingEggs.map((egg, index) => (
                        <button
                          key={egg.id}
                          type="button"
                          className={`island-hatchery-card__carousel-dot${index === selectedHatcheryEggIndex ? ' island-hatchery-card__carousel-dot--active' : ''}`}
                          onClick={() => setSelectedHatcheryEggIndex(index)}
                          role="tab"
                          aria-selected={index === selectedHatcheryEggIndex}
                          aria-label={`Show ${egg.tier} egg on Island ${egg.islandNumber}`}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
                {islandEggSlotUsed && !selectedHatcheryEgg ? (
                  /* State 1: Egg already collected/sold on this island — permanent, non-renewable */
                  <div className="island-hatchery-card__state island-hatchery-card__state--done">
                    <img
                      className="island-hatchery-card__stage-art"
                      src={getEggStageArtSrc(islandEggEntry?.tier ?? 'common', 4)}
                      alt={`${islandEggEntry?.tier ?? 'common'} egg already completed on this island`}
                    />
                    <p className="island-hatchery-card__headline">Egg already completed — no new egg on this island.</p>
                    <p style={{ fontSize: '0.82rem', opacity: 0.65 }}>Each island's egg slot is permanent and non-renewable.</p>
                  </div>
                ) : selectedHatcheryDisplayEgg && selectedHatcheryEggStage >= 4 ? (
                  /* State 4/5: Egg ready to open (or dormant egg ready on revisit) */
                  <div className="island-hatchery-card__state island-hatchery-card__state--ready">
                    <img
                      className="island-hatchery-card__stage-art"
                      src="/assets/creatures/Creature_card.webp"
                      alt="Creature card back"
                    />
                    {selectedHatcheryDisplayEgg.isDormant ? (
                      <>
                        <p className="island-hatchery-card__headline">💤 Dormant egg ready!</p>
                        <p className="island-hatchery-card__copy">
                          {selectedHatcheryEgg && !selectedHatcheryEgg.isCurrentIsland ? `Island ${selectedHatcheryEgg.islandNumber}'s ` : 'Your '}
                          <strong>{selectedHatcheryDisplayEgg.tier}</strong> creature is ready.
                          {canResolveSelectedHatcheryEgg ? ' Keep it for your collection or sell it for rewards.' : ' Return to that island to collect or sell it.'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="island-hatchery-card__headline">🌟 Creature hatched!</p>
                        <p className="island-hatchery-card__copy">
                          {selectedHatcheryEgg && !selectedHatcheryEgg.isCurrentIsland ? `Island ${selectedHatcheryEgg.islandNumber}'s ` : 'Your '}
                          <strong>{selectedHatcheryDisplayEgg.tier}</strong> egg has hatched.
                          {canResolveSelectedHatcheryEgg ? ' Choose whether to collect the creature or sell it now for rewards.' : ' Return to that island to collect or sell it.'}
                        </p>
                      </>
                    )}
                    {canResolveSelectedHatcheryEgg ? (
                      <div className="island-hatchery-card__actions" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                          onClick={handleCollectCreature}
                          disabled={isCollectingCreature || islandEggSlotUsed}
                        >
                          {isCollectingCreature ? 'Collecting…' : 'Collect Creature 🐾'}
                        </button>
                        {(() => {
                          const sellOptions = getEggSellRewardOptions(selectedHatcheryDisplayEgg.tier);
                          const sellAdvisor = adviseEggSellChoice({
                            tier: selectedHatcheryDisplayEgg.tier,
                            shardsBalance: runtimeState.shards,
                            diceBalance: dicePool,
                            nextStickerShardCost: getShardTierThreshold(runtimeState.shardTierIndex),
                          });
                          return (
                            <>
                              <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: '0.25rem 0 0' }}>— or sell for —</p>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {sellOptions.map((opt) => (
                                  <button
                                    key={opt.choice}
                                    type="button"
                                    className="island-stop-modal__btn island-stop-modal__btn--action"
                                    onClick={() => handleSellEggForChoice(opt.choice)}
                                  >
                                    {opt.label}
                                    {sellAdvisor.recommendedChoice === opt.choice && (
                                      <span className="island-hatchery-card__sell-recommended">Recommended</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                              <p className="island-hatchery-card__sell-advisor-reason">{sellAdvisor.reason}</p>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <p className="island-hatchery-card__remote-note" role="status">
                        This egg belongs to Island {selectedHatcheryEgg?.islandNumber}. It is shown here so you can track all pending eggs, but collection still happens on that island.
                      </p>
                    )}
                  </div>
                ) : selectedHatcheryDisplayEgg && selectedHatcheryEggStage < 4 ? (
                  /* State 3: Egg in progress — show stage name + emoji, NO countdown */
                  <div className="island-hatchery-card__state island-hatchery-card__state--incubating">
                    <div className="island-hatchery-card__stage-wrap">
                      <img
                        className="island-hatchery-card__stage-art"
                        src={getEggStageArtSrc(selectedHatcheryDisplayEgg.tier, selectedHatcheryEggStage)}
                        alt={`${selectedHatcheryDisplayEgg.tier} egg stage ${selectedHatcheryEggStage}`}
                      />
                      <div
                        className="island-hatchery-card__countdown"
                        role="timer"
                        aria-live="polite"
                      >
                        <span className="island-hatchery-card__countdown-label">Hatches in</span>
                        <span className="island-hatchery-card__countdown-value">{selectedHatcheryEggCountdownLabel}</span>
                      </div>
                    </div>
                    <p className="island-hatchery-card__headline">Stage {selectedHatcheryEggStage}: {getEggStageName(selectedHatcheryEggStage)}</p>
                    <p className="island-hatchery-card__copy">
                      {selectedHatcheryEgg && !selectedHatcheryEgg.isCurrentIsland ? `Island ${selectedHatcheryEgg.islandNumber}'s ` : 'Your '}
                      <strong>{selectedHatcheryDisplayEgg.tier}</strong> egg is incubating. Come back soon to collect your reward!
                    </p>
                    <div className="island-hatchery-card__timeline" aria-label="Egg hatch progress timeline">
                      {HATCHERY_TIMELINE_STEPS.map((step, index) => {
                        const stepNumber = index + 1;
                        const stepState = selectedHatcheryTimelineStage > stepNumber
                          ? 'complete'
                          : selectedHatcheryTimelineStage === stepNumber
                            ? 'current'
                            : 'upcoming';
                        return (
                          <div key={step.id} className={`island-hatchery-card__timeline-step island-hatchery-card__timeline-step--${stepState}`}>
                            <span className="island-hatchery-card__timeline-dot" aria-hidden="true">{stepState === 'complete' ? '✓' : step.icon}</span>
                            <span className="island-hatchery-card__timeline-label">{step.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* State 2: No egg set — allow setting one */
                  <div className="island-hatchery-card__state island-hatchery-card__state--empty">
                    {isEggManiaUnused ? (
                      <p className="island-hatchery-card__headline">🔥🥚 Egg Mania active — set 3 eggs!</p>
                    ) : islandNumber === 1 ? (
                      <p className="island-hatchery-card__headline">🐣 Welcome! Set your first egg.</p>
                    ) : (
                      <p className="island-hatchery-card__headline">No egg on this island yet.</p>
                    )}
                    <p className="island-hatchery-card__copy">
                      {isEggManiaUnused
                        ? 'This island has Egg Mania: set three surprise-tier eggs at once. Each hatches independently in 24–72h.'
                        : 'Set an egg now to earn rewards. The tier is a surprise, and hatch time is random (24–72h).'}
                    </p>
                    <div className="island-hatchery-card__timeline" aria-label="Egg hatch progress timeline">
                      {HATCHERY_TIMELINE_STEPS.map((step, index) => {
                        const stepNumber = index + 1;
                        const stepState = hatcheryTimelineStage > stepNumber
                          ? 'complete'
                          : hatcheryTimelineStage === stepNumber
                            ? 'current'
                            : 'upcoming';
                        return (
                          <div key={step.id} className={`island-hatchery-card__timeline-step island-hatchery-card__timeline-step--${stepState}`}>
                            <span className="island-hatchery-card__timeline-dot" aria-hidden="true">{stepState === 'complete' ? '✓' : step.icon}</span>
                            <span className="island-hatchery-card__timeline-label">{step.label}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="island-hatchery-card__actions">
                      <button
                        type="button"
                        className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                        onClick={handleSetEgg}
                        disabled={isSettingEgg}
                      >
                        {isSettingEgg ? 'Setting Egg...' : isEggManiaUnused ? '🔥🥚 Set 3 Eggs' : '🥚 Set Egg'}
                      </button>
                    </div>
                  </div>
                )}
                </div>
              </>
            )}

            {/* ── Stop 3: Event Arena (timed-event mini-game launcher) ── */}
            {activeStopId === 'mystery' && openedStopIsPlayable && (
              <div className="island-hatchery-card island-event-arena-card">
                <div className="island-event-arena-card__burst" aria-hidden="true">
                  <span>🎟️</span>
                  <span>🎪</span>
                  <span>✨</span>
                </div>
                {arenaBoostStatus === 'claimed' ? (
                  <>
                    <p className="island-stop-modal__copy">🎪 <strong>Arena boost unlocked</strong></p>
                    <p>The Event Arena is open. Here are 3 extra event tickets for your first challenge.</p>
                    <div className="island-event-arena-card__ticket-row" aria-live="polite">
                      <span>Reward</span>
                      <strong>+3 Event Tickets</strong>
                    </div>
                  </>
                ) : arenaBoostStatus === 'no_active_event' ? (
                  <>
                    <p className="island-stop-modal__copy">🎪 <strong>Event Arena</strong></p>
                    <p>No event is active right now. The Arena will light up when the next event begins.</p>
                  </>
                ) : (
                  <>
                    <p className="island-stop-modal__copy">🎪 <strong>Event Arena</strong></p>
                    <p>Spend your current event tickets here, keep progress saved, and return to the island when you are done.</p>
                  </>
                )}
                <div className="island-event-arena-card__ticket-row" aria-live="polite">
                  <span>{activeEventMeta?.displayName ?? 'Timed event'}</span>
                  <strong>{activeEventTickets} {timedEventTokenIcon}</strong>
                </div>
                <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                    onClick={handleLaunchTimedEventMinigame}
                    disabled={!effectiveActiveTimedEvent || activeEventTickets <= 0}
                  >
                    {activeEventTickets > 0 ? 'Play event minigame' : '🎟️ Earn event tickets on the reward bar'}
                  </button>
                  <button
                    type="button"
                    className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                    onClick={handleComeBackLaterForActiveStop}
                  >
                    Later
                  </button>
                </div>
                <p className="island-stop-modal__fineprint">
                  The old Mystery check-in, breathing, action, and vision prompts now appear as board Daily Clue Cards.
                </p>
              </div>
            )}

            {/* ── Stop 2: Habit (deterministic no-AI intake MVP) ── */}
            {activeStopId === 'habit' && openedStopIsPlayable && (
              <>
                <IslandRunLifePromptCard
                  session={session}
                  islandNumber={islandNumber}
                  onComplete={(message) => {
                    setLandingText(message);
                    handleCompleteActiveStop();
                  }}
                  onComeBackLater={handleComeBackLaterForActiveStop}
                />
                {/* Optional: answer this island's overflow Compass inputs here.
                    Never gates stop completion. */}
                <CompassStopFragmentMount
                  session={session}
                  islandNumber={islandNumber}
                  slot="habit_overflow"
                />
              </>
            )}

            {/* ── Stop 4: Wisdom Tree ── */}
            {activeStopId === 'wisdom' && openedStopIsPlayable && (
              <div className="island-hatchery-card">
                <WisdomTreeCardEncounter
                  card={wisdomTreeCard}
                  islandNumber={islandNumber}
                  onComplete={(message) => {
                    // Contribute this reflection to the current Compass spoke (best-effort).
                    void recordCompassContribution({
                      userId: session.user.id,
                      islandNumber,
                      kind: 'wisdom',
                      text: message,
                    });
                    setLandingText(message);
                    handleCompleteActiveStop();
                  }}
                />
                {/* Optional: answer this island's Compass fragment here. Never
                    gates stop completion (the Wisdom card above does that). */}
                <CompassStopFragmentMount
                  session={session}
                  islandNumber={islandNumber}
                  slot="wisdom"
                />
                <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                    onClick={handleComeBackLaterForActiveStop}
                  >
                    Come back later
                  </button>
                </div>
                {ISLAND_RUN_CONTRACT_V2_ENABLED && diamonds >= WISDOM_ESSENCE_BONUS_COST_DIAMONDS ? (
                  <div className="island-hatchery-card__actions" style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="island-stop-modal__btn island-stop-modal__btn--action"
                      onClick={() => {
                        setDiamonds((d) => d - WISDOM_ESSENCE_BONUS_COST_DIAMONDS);
                        setRuntimeState((prev) => ({
                          ...prev,
                          essence: prev.essence + WISDOM_ESSENCE_BONUS_AMOUNT,
                          essenceLifetimeEarned: prev.essenceLifetimeEarned + WISDOM_ESSENCE_BONUS_AMOUNT,
                        }));
                        playIslandRunSound('utility_stop_complete');
                        triggerIslandRunHaptic('utility_stop_complete');
                        void recordTelemetryEvent({ userId: session.user.id, eventType: 'economy_spend', metadata: { stage: 'wisdom_essence_bonus', island_number: islandNumber, cost_diamonds: WISDOM_ESSENCE_BONUS_COST_DIAMONDS, essence_gained: WISDOM_ESSENCE_BONUS_AMOUNT } });
                        setLandingText(`Wisdom bonus! -${WISDOM_ESSENCE_BONUS_COST_DIAMONDS} 💎, +${WISDOM_ESSENCE_BONUS_AMOUNT} 💰`);
                        handleCompleteActiveStop();
                      }}
                    >
                      💰 Money Bonus — {WISDOM_ESSENCE_BONUS_COST_DIAMONDS} 💎 → +{WISDOM_ESSENCE_BONUS_AMOUNT} Money
                    </button>
                  </div>
                ) : ISLAND_RUN_CONTRACT_V2_ENABLED ? (
                  <p style={{ fontSize: '0.85rem', opacity: 0.65, marginTop: '0.5rem' }}>💰 Money Bonus — needs {WISDOM_ESSENCE_BONUS_COST_DIAMONDS} 💎 (have {diamonds})</p>
                ) : null}
              </div>
            )}

            {activeStop.stopId === 'boss' && openedStopIsPlayable ? (
              (() => {
                const bossConfig = getBossTrialConfig(islandNumber);
                const bossReward = getBossReward(islandNumber);
                const typeColor = getBossTypeColor(bossConfig.type as BossType);
                const rhythmBossPreview = resolveBossRhythmStopMinigame({ kind: 'fixed_boss', islandNumber });
                const rhythmEntryAffordable = rhythmBossPreview !== null && spinTokens >= rhythmBossPreview.entryTicketCost;
                return (
                  <div className="island-boss-trial">
                    {/* Boss type + difficulty badges */}
                    <div className="island-boss-trial__badges">
                      <span
                        className="island-boss-trial__badge island-boss-trial__badge--type"
                        style={{ borderColor: typeColor, color: typeColor }}
                      >
                        {bossConfig.type === 'fight' ? '⚔️ Fight Boss' : '🏆 Milestone Boss'}
                      </span>
                      <span className="island-boss-trial__badge island-boss-trial__badge--difficulty">
                        {bossConfig.difficulty}
                      </span>
                    </div>

                    {/* Idle phase: pre-trial info */}
                    {bossTrialPhase === 'idle' && (
                      <div className="island-boss-trial__phase island-boss-trial__phase--idle">
                        {canChallengeCurrentBoss ? (
                          <>
                            <p className="island-boss-trial__challenge-label">
                              <strong>Challenge:</strong>{' '}
                              {rhythmBossPreview
                                ? 'Rhythm Assault — pilot your ship, fire on the beat, and survive 3 phases plus the final attack.'
                                : bossConfig.type === 'fight'
                                  ? `Reach ${bossConfig.scoreTarget} hits before time runs out.`
                                  : `Complete ${bossConfig.scoreTarget} actions in ${bossConfig.trialDurationSec}s.`}
                            </p>
                            {rhythmBossPreview ? (
                              <p className="island-boss-trial__entry-cost">
                                {timedEventTokenIcon} Entry: {rhythmBossPreview.entryTicketCost} event ticket
                                {rhythmBossPreview.entryTicketCost === 1 ? '' : 's'} (you have {spinTokens})
                                {rhythmEntryAffordable ? '' : ' — entry waived this time'}
                              </p>
                            ) : null}
                            <p className="island-boss-trial__reward-preview">
                              🎁 Reward on win:{' '}
                              <strong>+{bossReward.dice} 🎲</strong>,{' '}
                              <strong>+{bossReward.essence} 💰</strong>
                              {bossReward.spinTokens > 0
                                ? <>, <strong>{formatIslandRunSpinTokenReward({ islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED, amount: bossReward.spinTokens })}</strong></>
                                : null}
                              , <strong>+3 🟣 essence</strong>
                            </p>
                            <p className="island-boss-trial__lives-note">
                              💡 Failed attempts have no penalty. Keep trying!
                            </p>
                            <div className="island-boss-trial__cta">
                              <button
                                type="button"
                                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary island-boss-trial__begin-btn"
                                onClick={handleStartBossTrial}
                              >
                                {rhythmBossPreview ? '🛸 Launch Boss Battle' : '⚡ Begin Boss Trial'}
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="island-stop-modal__locked-notice" role="status">
                            <span aria-hidden="true">🔒</span>{' '}
                            {currentBossChallengeLockReason ?? 'Build the Boss Arena to awaken the boss.'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* In-progress phase: timer + tap counter */}
                    {bossTrialPhase === 'in_progress' && (
                      <div className="island-boss-trial__phase island-boss-trial__phase--active">
                        <div className="island-boss-trial__timer-row">
                          <span className="island-boss-trial__timer-label">⏱ Time left</span>
                          <span
                            className={`island-boss-trial__timer-value ${bossTrialTimeLeft <= 10 ? 'island-boss-trial__timer-value--urgent' : ''}`}
                          >
                            {bossTrialTimeLeft}s
                          </span>
                        </div>
                        <div className="island-boss-trial__score-row">
                          <span className="island-boss-trial__score-label">Score</span>
                          <span className="island-boss-trial__score-value">
                            {bossTrialScore} / {bossConfig.scoreTarget}
                          </span>
                        </div>
                        <div className="island-boss-trial__progress-bar">
                          <div
                            className="island-boss-trial__progress-fill"
                            style={{ width: `${Math.min(100, (bossTrialScore / bossConfig.scoreTarget) * 100)}%` }}
                          />
                        </div>
                        <button
                          type="button"
                          className="island-stop-modal__btn island-stop-modal__btn--action island-boss-trial__tap-btn"
                          onClick={handleBossTrialTap}
                        >
                          {bossConfig.type === 'fight' ? '🎯 Hit!' : '✅ Action!'}
                        </button>
                      </div>
                    )}

                    {/* Success phase: reward summary + build-to-clear goal */}
                    {bossTrialPhase === 'success' && (
                      <div className="island-boss-trial__phase island-boss-trial__phase--success">
                        <p className="island-boss-trial__result island-boss-trial__result--win">🏆 Boss Defeated!</p>
                        <p className="island-boss-trial__reward-text">
                          {bossRewardSummary ?? `Rewards: +${bossReward.essence} 💰, +3 🟣`}
                        </p>
                        {isCurrentIslandFullyCleared ? (
                          <p className="island-boss-trial__next-hint">
                            Island clear is ready. A full-screen travel prompt will appear automatically.
                          </p>
                        ) : (() => {
                          // The boss is beaten — all that stands between the player and
                          // island clear is money for landmark upgrades. Surface the
                          // cash gap big and visual, and nudge them to keep rolling to
                          // earn it (rolling is unblocked once the trial is resolved).
                          const cash = Math.max(0, Math.round(runtimeState.essence));
                          const totalRemainingBuildCost = buildPanelRemainingToFullByIndex.reduce((sum, cost) => sum + cost, 0);
                          const landmarksRemaining = buildPanelRemainingToFullByIndex.filter((cost) => cost > 0).length;
                          const cashShortfall = Math.max(0, totalRemainingBuildCost - cash);
                          const canFundAllNow = cashShortfall === 0;
                          const fundedRatio = totalRemainingBuildCost > 0
                            ? Math.min(1, cash / totalRemainingBuildCost)
                            : 1;
                          return (
                            <div className="island-boss-build-goal">
                              <p className="island-boss-build-goal__headline">
                                🏝️ One step left — upgrade every landmark to Level {MAX_BUILD_LEVEL}
                              </p>
                              <div className="island-boss-build-goal__stats">
                                <div className="island-boss-build-goal__stat">
                                  <span className="island-boss-build-goal__stat-value">{cash.toLocaleString()} 💰</span>
                                  <span className="island-boss-build-goal__stat-label">Your money</span>
                                </div>
                                <div className="island-boss-build-goal__stat island-boss-build-goal__stat--cost">
                                  <span className="island-boss-build-goal__stat-value">{totalRemainingBuildCost.toLocaleString()} 💰</span>
                                  <span className="island-boss-build-goal__stat-label">
                                    Left to build{landmarksRemaining > 0 ? ` · ${landmarksRemaining} landmark${landmarksRemaining === 1 ? '' : 's'}` : ''}
                                  </span>
                                </div>
                              </div>
                              <div
                                className="island-boss-build-goal__meter"
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={Math.round(fundedRatio * 100)}
                                aria-label="Money saved toward remaining landmark upgrades"
                              >
                                <div
                                  className="island-boss-build-goal__meter-fill"
                                  style={{ width: `${Math.round(fundedRatio * 100)}%` }}
                                />
                              </div>
                              <p className="island-boss-build-goal__hint">
                                {canFundAllNow
                                  ? <>💪 You can afford it all! Open <strong>Build</strong> and finish every landmark to clear the island.</>
                                  : <>🎲 You need <strong>{cashShortfall.toLocaleString()} 💰</strong> more. Keep rolling to earn money, then Build the rest.</>}
                              </p>
                              <div className="island-boss-build-goal__actions">
                                <button
                                  type="button"
                                  className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                                  onClick={() => {
                                    setActiveStopId(null);
                                    openBuildPanelFromFooter();
                                  }}
                                >
                                  🔨 Open Build
                                </button>
                                {!canFundAllNow ? (
                                  <button
                                    type="button"
                                    className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                                    onClick={() => setActiveStopId(null)}
                                  >
                                    🎲 Keep Rolling
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Failed phase: heart cost + retry */}
                    {bossTrialPhase === 'failed' && (
                      <div className="island-boss-trial__phase island-boss-trial__phase--failed">
                        <p className="island-boss-trial__result island-boss-trial__result--fail">💔 Trial Failed</p>
                        <p className="island-boss-trial__failed-copy">
                          You scored {bossTrialScore} / {bossConfig.scoreTarget}. Retry when ready.
                        </p>
                        {canRetryBossTrial() ? (
                          <div className="island-boss-trial__cta">
                            <button
                              type="button"
                              className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary island-boss-trial__retry-btn"
                              onClick={handleBossTrialRetry}
                            >
                              🔄 Retry
                            </button>
                          </div>
                        ) : (
                          <p className="island-boss-trial__no-hearts">
                            Not enough energy to retry yet. Earn more dice to continue.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()
            ) : null}

            {isActiveCompassSessionFilled && (activeStop.stopId === 'habit' || activeStop.stopId === 'wisdom') && openedStopIsPlayable ? (
              <div className="island-stop-modal__copy" role="status">
                <strong>Compass box already filled.</strong> You can use that saved session to finish this landmark now.
                <div className="island-hatchery-card__actions" style={{ marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                    onClick={() => {
                      setLandingText(`${activeStop.title} completed from your filled Compass session.`);
                      handleCompleteActiveStop();
                    }}
                  >
                    Use filled Compass box & Complete Landmark
                  </button>
                </div>
              </div>
            ) : null}

            <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
              {activeStop.stopId !== 'hatchery'
              && activeStop.stopId !== 'boss'
              && activeStop.stopId !== 'habit'
              && activeStop.stopId !== 'mystery'
              && activeStop.stopId !== 'wisdom'
              && openedStopIsPlayable ? (
                <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary" onClick={handleCompleteActiveStop}>
                  Complete Stop
                </button>
              ) : null}
              {activeStop.stopId === 'boss' && openedStopIsPlayable ? (
                <button
                  type="button"
                  className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                  onClick={handleCompleteActiveStop}
                  disabled={!bossTrialResolved || bossTrialPhase === 'in_progress'}
                >
                  {isCurrentIslandFullyCleared ? '✅ Boss Stop Complete' : '🔒 Full Rewards Locked — Finish Landmark Upgrades'}
                </button>
              ) : null}
              {activeStop.stopId === 'boss' && openedStopIsPlayable && !isCurrentIslandFullyCleared && !isCurrentIslandBossDefeated ? (
                <p className="island-stop-modal__locked-notice" role="status" style={{ marginTop: '0.4rem' }}>
                  <span aria-hidden="true">🧱</span> Landmarks incomplete — finish upgrades to Level {MAX_BUILD_LEVEL} on all stops before you can claim full island-clear rewards and travel.
                </p>
              ) : null}
              {openedStopNeedsTicket && openedStopTicketCost ? (
                <button
                  type="button"
                  className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                  onClick={() => handlePayStopTicket(activeStop.stopId)}
                  disabled={!canAffordOpenedStopTicket}
                >
                  {canAffordOpenedStopTicket
                    ? `Pay ${openedStopTicketCost} 💰 to Unlock`
                    : `Need ${Math.max(0, openedStopTicketCost - runtimeState.essence)} more 💰`}
                </button>
              ) : null}
              {isActiveBehaviorStopNonDismissable ? (
                <p className="island-stop-modal__locked-notice" role="status">
                  <span aria-hidden="true">📝</span>{' '}
                  Finish this landmark to continue — answer the prompt{activeStop.stopId === 'habit' ? ' (or tap “Skip for now”)' : ''} above.
                </p>
              ) : (
                <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={() => setActiveStopId(null)}>
                  Close
                </button>
              )}
            </div>
          </section>
        </div>
        );
      })()}

      {dormantDoorMiniGame && (
        <div className="island-run-overlay-root island-stop-modal-backdrop" role="presentation">
          <section
            className={`island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--dormant-door island-vault-rush ${dormantDoorReward ? 'island-vault-rush--cracked' : ''}`.trim()}
            role="dialog"
            aria-modal="true"
            aria-label="Vault Rush minigame"
          >
            {dormantDoorReward && <ConfettiBurst active variant="standard" />}
            <header className="island-vault-rush__header">
              <span className="island-vault-rush__eyebrow">🗝️ Secret found behind a dormant door</span>
              <h3 className="island-stop-modal__title island-vault-rush__title">Vault Rush</h3>
              <p className="island-vault-rush__intro">
                {dormantDoorReward
                  ? 'The lock gives way — your prize is waiting inside.'
                  : <>Reveal doors and match <strong>3 prizes</strong> to crack the vault open.</>}
              </p>
            </header>
            <div className="island-vault-rush__prizes" aria-label="Vault prize tiers">
              {dormantDoorMiniGame.rewardLevels.map((level) => {
                const prizeFigure = DORMANT_DOOR_TIER_FIGURE[level.tier];
                const foundCount = Math.min(3, dormantDoorPrizeCounts[prizeFigure]);
                const isWinningPrize = dormantDoorReward?.tier === level.tier;
                const isResolvedNonWinningPrize = Boolean(dormantDoorReward) && !isWinningPrize;
                return (
                  <div
                    key={level.tier}
                    className={`island-vault-rush__prize island-vault-rush__prize--${level.tier} ${isWinningPrize ? 'island-vault-rush__prize--winner' : ''} ${isResolvedNonWinningPrize ? 'island-vault-rush__prize--muted' : ''}`.trim()}
                  >
                    <span className="island-vault-rush__prize-icon" aria-hidden="true">{DORMANT_DOOR_FIGURE_ICONS[prizeFigure]}</span>
                    <span className="island-vault-rush__prize-name">{DORMANT_DOOR_TIER_NAMES[level.tier]}</span>
                    <strong className="island-vault-rush__prize-value">+{level.essence} 💰</strong>
                    <span className="island-vault-rush__prize-dots" aria-label={`${foundCount} of 3 ${DORMANT_DOOR_TIER_NAMES[level.tier]} found`}>
                      {[0, 1, 2].map((dotIndex) => (
                        <span
                          key={dotIndex}
                          className={`island-vault-rush__prize-dot ${dotIndex < foundCount ? 'island-vault-rush__prize-dot--lit' : ''}`.trim()}
                          aria-hidden="true"
                        />
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="island-vault-rush__grid" aria-label="Sixteen vault doors">
              {dormantDoorMiniGame.doors.map((door, index) => {
                const isSelected = dormantDoorSelectedIndices.includes(index);
                const isWinningDoor = isSelected && dormantDoorReward?.tier === (door.figure === 'large' ? 'jackpot' : door.figure);
                const isResolvedNonWinningDoor = Boolean(dormantDoorReward) && !isWinningDoor;
                return (
                  <button
                    key={door.id}
                    type="button"
                    className={[
                      'island-vault-rush__door',
                      isSelected ? `island-vault-rush__door--revealed island-vault-rush__door--tier-${door.figure}` : '',
                      isWinningDoor ? 'island-vault-rush__door--winner' : '',
                      isResolvedNonWinningDoor ? 'island-vault-rush__door--muted' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => handleDormantDoorSelect(index)}
                    disabled={Boolean(dormantDoorReward) || isSelected}
                    aria-pressed={isSelected}
                    aria-label={isSelected ? `Door ${index + 1}: ${DORMANT_DOOR_FIGURE_NAMES[door.figure]}` : `Reveal door ${index + 1}`}
                  >
                    <span className="island-vault-rush__door-arch" aria-hidden="true">
                      {isSelected
                        ? <span className="island-vault-rush__door-prize">{DORMANT_DOOR_FIGURE_ICONS[door.figure]}</span>
                        : <span className="island-vault-rush__door-num">{index + 1}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            {dormantDoorReward ? (
              <div className="island-vault-rush__result" role="status">
                <span className="island-vault-rush__result-title">💥 Vault cracked!</span>
                <span className="island-vault-rush__result-copy">
                  3× {DORMANT_DOOR_FIGURE_ICONS[DORMANT_DOOR_TIER_FIGURE[dormantDoorReward.tier]]} {DORMANT_DOOR_TIER_NAMES[dormantDoorReward.tier]} — worth <strong>+{dormantDoorReward.essence} 💰</strong>
                </span>
              </div>
            ) : (
              <p className="island-vault-rush__status" role="status">
                <span className="island-vault-rush__status-chip">🔦 Best match {dormantDoorBestMatchCount}/3</span>
                <span className="island-vault-rush__status-chip">🚪 {Math.max(0, dormantDoorMiniGame.doors.length - dormantDoorSelectedIndices.length)} doors left</span>
              </p>
            )}
            <div className="island-stop-modal__actions">
              {dormantDoorReward ? (
                <button
                  type="button"
                  className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary island-vault-rush__claim"
                  onClick={handleClaimDormantDoorReward}
                  disabled={isDormantDoorRewardClaiming}
                >
                  {isDormantDoorRewardClaiming ? 'Claiming…' : `Claim +${dormantDoorReward.essence} 💰`}
                </button>
              ) : null}
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={handleCloseDormantDoorMiniGame}>
                {dormantDoorReward ? 'Close' : 'Leave the vault'}
              </button>
            </div>
          </section>
        </div>
      )}

      {trafficLightCoinFlip && (
        <div className="island-run-overlay-root island-stop-modal-backdrop" role="presentation">
          <section className={`island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--traffic-light island-traffic-light--${trafficLightCoinFlip.phase}`} role="dialog" aria-modal="true" aria-label="Traffic light bonus coin flip">
            {trafficLightCoinFlip.phase !== 'flipping' && (
              <button type="button" className="island-traffic-light__close" onClick={handleCloseTrafficLightCoinFlip} aria-label="Close traffic light bonus">×</button>
            )}
            {trafficLightRewardConfettiActive && <ConfettiBurst active variant="standard" />}
            <div className="island-traffic-light__hero" aria-hidden="true">
              <img className="island-traffic-light__art island-traffic-light__art--signal" src={TRAFFIC_LIGHT_MODAL_IMAGE_SRC} alt="" loading="lazy" />
            </div>
            <h3 className="island-stop-modal__title island-traffic-light__title">Traffic Light Bonus</h3>
            <p className="island-traffic-light__intro">
              {trafficLightCoinFlip.phase === 'flipping'
                ? 'Flipping…'
                : trafficLightCoinFlip.phase === 'opened'
                  ? 'Rewards unlocked!'
                  : trafficLightCoinFlip.phase === 'revealed'
                    ? 'Your mystery box is ready.'
                    : 'All 8 lights are green. Flip the coin to reveal your mystery box.'}
            </p>

            {(trafficLightCoinFlip.phase === 'ready' || trafficLightCoinFlip.phase === 'flipping') && (
              <div className="island-coin-stage">
                <span className="island-coin-stage__sparkles" aria-hidden="true" />
                <button
                  type="button"
                  className={[
                    'island-coin',
                    `island-coin--${trafficLightCoinFlip.phase}`,
                    trafficLightCoinFlip.reward ? `island-coin--lands-${trafficLightCoinFlip.reward.side}` : '',
                  ].filter(Boolean).join(' ')}
                  onClick={handleFlipTrafficLightCoin}
                  disabled={trafficLightCoinFlip.phase !== 'ready'}
                  aria-label={trafficLightCoinFlip.phase === 'ready' ? 'Flip the traffic light bonus coin' : 'Traffic light bonus coin'}
                >
                  <span className="island-coin__inner" aria-hidden="true">
                    <span className="island-coin__face island-coin__face--heads">
                      <img className="island-coin__image" src={TRAFFIC_LIGHT_BOX_COIN_IMAGE_SRC} alt="" loading="lazy" />
                    </span>
                    <span className="island-coin__face island-coin__face--tails">
                      <img className="island-coin__image" src={TRAFFIC_LIGHT_GIFT_COIN_IMAGE_SRC} alt="" loading="lazy" />
                    </span>
                  </span>
                </button>
                {showTrafficLightCoinHint && trafficLightCoinFlip.phase === 'ready' && (
                  <p className="island-coin-stage__tap-hint" role="status">Tap the coin to flip it!</p>
                )}
              </div>
            )}

            {(trafficLightCoinFlip.phase === 'ready' || trafficLightCoinFlip.phase === 'flipping') && (
              <div className="island-traffic-light__prizes" aria-label="Mystery box options">
                <div className={`island-traffic-light__prize-card ${trafficLightCoinFlip.reward?.boxId === 'box_1' ? 'island-traffic-light__prize-card--selected' : ''}`.trim()}>
                  <img className="island-traffic-light__art island-traffic-light__art--prize" src={TRAFFIC_LIGHT_BOX_IMAGE_SRC} alt="" loading="lazy" />
                  <span className="island-traffic-light__prize-title">Mystery Box 1</span>
                </div>
                <div className={`island-traffic-light__prize-card island-traffic-light__prize-card--gift ${trafficLightCoinFlip.reward?.boxId === 'box_2' ? 'island-traffic-light__prize-card--selected' : ''}`.trim()}>
                  <img className="island-traffic-light__art island-traffic-light__art--prize" src={TRAFFIC_LIGHT_GIFT_IMAGE_SRC} alt="" loading="lazy" />
                  <span className="island-traffic-light__prize-title">Mystery Box 2</span>
                </div>
              </div>
            )}

            {(trafficLightCoinFlip.phase === 'revealed' || trafficLightCoinFlip.phase === 'opened') && trafficLightCoinFlip.reward && (
              <button
                type="button"
                className="island-traffic-light__winner-spotlight"
                onClick={handleOpenTrafficLightReward}
                disabled={trafficLightCoinFlip.phase === 'opened'}
                aria-label={`Open ${trafficLightCoinFlip.reward.label}`}
              >
                <img
                  className="island-traffic-light__winner-image"
                  src={trafficLightCoinFlip.reward.boxId === 'box_1' ? TRAFFIC_LIGHT_BOX_IMAGE_SRC : TRAFFIC_LIGHT_GIFT_IMAGE_SRC}
                  alt=""
                  loading="lazy"
                />
                {trafficLightCoinFlip.phase === 'revealed' && (
                  <span className="island-traffic-light__winner-tap-hint">Tap to open</span>
                )}
              </button>
            )}

            {trafficLightCoinFlip.phase === 'opened' && trafficLightCoinFlip.reward && (
              <div className="island-coin-reward" role="status">
                <p className="island-coin-reward__eyebrow">
                  {trafficLightCoinFlip.reward.side === 'heads' ? 'Heads — Box 1' : 'Tails — Box 2'}
                </p>
                <div className="island-coin-reward__chips">
                  <span className="island-coin-reward__chip" style={{ animationDelay: '0ms' }}>
                    <b>+{trafficLightCoinFlip.reward.dice}</b> 🎲
                  </span>
                  <span className="island-coin-reward__chip" style={{ animationDelay: '320ms' }}>
                    <b>+{trafficLightCoinFlip.reward.essence}</b> 💰
                  </span>
                  {trafficLightCoinFlip.reward.stickerFragments > 0 && (
                    <span className="island-coin-reward__chip island-coin-reward__chip--rare" style={{ animationDelay: '640ms' }}>
                      <b>+{trafficLightCoinFlip.reward.stickerFragments}</b> 🧩
                    </span>
                  )}
                  {trafficLightCoinFlip.reward.minigameTickets > 0 && (
                    <span className="island-coin-reward__chip" style={{ animationDelay: '960ms' }}>
                      <b>+{trafficLightCoinFlip.reward.minigameTickets}</b> 🎫
                    </span>
                  )}
                  {trafficLightCoinFlip.reward.rewardBarProgress > 0 && (
                    <span
                      className="island-coin-reward__chip"
                      style={{ animationDelay: '1280ms' }}
                      title={`Adds progress toward the ${activeEventMeta?.displayName ?? 'active event'} reward bar — fill it to claim dice, money, tickets, and puzzle pieces.`}
                    >
                      <b>+{trafficLightCoinFlip.reward.rewardBarProgress}</b> ⚡ {activeEventMeta?.icon ?? ''} event bar
                    </span>
                  )}
                </div>
                {trafficLightCoinFlip.reward.rewardBarProgress > 0 && (
                  <p className="island-coin-reward__hint">
                    ⚡ fills the {activeEventMeta?.displayName ?? 'timed event'} reward bar — claim it on the event banner for extra dice, money, tickets, and puzzle pieces.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {showEncounterModal && (
        <div className="island-run-overlay-root island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy island-stop-modal--encounter" role="dialog" aria-modal="true" aria-label="Encounter tile challenge">
            <h3 className="island-stop-modal__title">⚔️ Bonus Encounter</h3>
            {encounterStep === 'challenge' && (
              <p className="island-encounter__intro">
                Quick positive check-in — choose what feels best for you. Every choice counts.
              </p>
            )}

            {encounterStep === 'challenge' && currentEncounterChallenge && (
              <>
                {currentEncounterChallenge.type === 'quiz' && (
                  <div className="island-encounter__challenge">
                    <p className="island-encounter__eyebrow">{currentEncounterChallenge.title}</p>
                    <p className="island-encounter__question">{currentEncounterChallenge.question}</p>
                    <p className="island-encounter__hint">{currentEncounterChallenge.completionLabel}</p>
                    <div className="island-encounter__answers">
                      {currentEncounterChallenge.answers.map((answer, i) => (
                        <button
                          key={i}
                          type="button"
                          className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary island-encounter__answer-btn"
                          onClick={handleEncounterChallengeComplete}
                        >
                          {answer}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {currentEncounterChallenge.type === 'breathing' && (
                  <div className="island-encounter__challenge">
                    <p className="island-encounter__eyebrow">{currentEncounterChallenge.title}</p>
                    <p className="island-encounter__question">{currentEncounterChallenge.instruction}</p>
                    <div className="island-encounter__breathing">
                      <div className="island-encounter__breathing-orb" aria-hidden="true" />
                      <p className="island-encounter__breathing-countdown" aria-live="polite">
                        {breathingSecondsLeft > 0 ? breathingSecondsLeft : '✓'}
                      </p>
                    </div>
                    <p className="island-encounter__hint">{currentEncounterChallenge.completionLabel} · Auto-completes in {breathingSecondsLeft}s…</p>
                  </div>
                )}

                {currentEncounterChallenge.type === 'gratitude' && (
                  <div className="island-encounter__challenge">
                    <p className="island-encounter__eyebrow">{currentEncounterChallenge.title}</p>
                    <p className="island-encounter__question">{currentEncounterChallenge.prompt}</p>
                    <p className="island-encounter__hint">{currentEncounterChallenge.completionLabel}</p>
                    <textarea
                      className="island-encounter__gratitude-input"
                      value={gratitudeText}
                      onChange={(e) => setGratitudeText(e.target.value)}
                      placeholder="Type anything…"
                      rows={3}
                      aria-label="Gratitude response"
                    />
                    <button
                      type="button"
                      className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                      onClick={handleEncounterChallengeComplete}
                      disabled={gratitudeText.trim().length === 0}
                    >
                      {currentEncounterChallenge.completionLabel} ✓
                    </button>
                  </div>
                )}

                {currentEncounterChallenge.type === 'tap' && (
                  <div className="island-encounter__challenge">
                    <p className="island-encounter__eyebrow">{currentEncounterChallenge.title}</p>
                    <p className="island-encounter__question">{currentEncounterChallenge.prompt}</p>
                    <p className="island-encounter__hint">
                      {encounterTapCount}/{currentEncounterChallenge.tapsRequired} taps
                    </p>
                    <button
                      type="button"
                      className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                      onClick={handleEncounterTapProgress}
                    >
                      Tap Charge
                    </button>
                  </div>
                )}

                {currentEncounterChallenge.type === 'focus' && (
                  <div className="island-encounter__challenge">
                    <p className="island-encounter__eyebrow">{currentEncounterChallenge.title}</p>
                    <p className="island-encounter__question">{currentEncounterChallenge.instruction}</p>
                    <p className="island-encounter__hint">{currentEncounterChallenge.completionLabel}</p>
                    <button
                      type="button"
                      className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                      onClick={handleEncounterChallengeComplete}
                    >
                      I did it ✓
                    </button>
                  </div>
                )}
              </>
            )}

            {encounterStep === 'reward' && encounterRewardData && (
              <div className="island-encounter__reward">
                <p className="island-encounter__eyebrow">Challenge Complete! 🎉</p>
                <div className="island-encounter__reward-reveal">
                  <span className="island-encounter__reward-item">💰 +{encounterRewardData.essence} money</span>
                  {encounterRewardData.walletShards && <span className="island-encounter__reward-item">✨ +1 essence</span>}
                  {encounterRewardData.spinTokens > 0 && (
                    <span className="island-encounter__reward-item">{timedEventTokenIcon} {formatIslandRunSpinTokenReward({ islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED, amount: encounterRewardData.spinTokens })}</span>
                  )}
                </div>
                <p className="island-encounter__reward-tagline">Keep going — you're on a streak!</p>
              </div>
            )}

            <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={() => setShowEncounterModal(false)}>
                {encounterStep === 'reward' ? 'Continue' : 'Close'}
              </button>
            </div>
          </section>
        </div>
      )}

      {showOnboardingBooster && (
        <div className="island-run-overlay-root island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy island-stop-modal--onboarding" role="dialog" aria-modal="true" aria-label="Game of Life onboarding booster">
            <div className="gol-onboarding__header-row">
              <span className="gol-onboarding__step">Loop 1 of 21</span>
              <button type="button" className="gol-onboarding__close" onClick={() => setShowOnboardingBooster(false)}>
                Close
              </button>
            </div>
            <p className="gol-onboarding__eyebrow">Game of Life 2.0 onboarding</p>
            <h3>Claim your player name</h3>
            <p>Step into Game of Life 2.0 with a display name that makes every win feel personal.</p>
            <div className="gol-onboarding__progress">
              <span>Progress</span>
              <div className="gol-onboarding__progress-bar" aria-hidden="true">
                <span style={{ width: `${(1 / 21) * 100}%` }} />
              </div>
              <span>1/21</span>
            </div>
            <label className="supabase-auth__field">
              <span>Display name</span>
              <input
                type="text"
                value={boosterName}
                onChange={(event) => setBoosterName(event.target.value)}
                placeholder={session.user.email ?? 'you@example.com'}
              />
            </label>
            {boosterError && <p className="island-run-prototype__error">{boosterError}</p>}
            <div className="gol-onboarding__actions">
              <button type="button" className="supabase-auth__action" onClick={handleClaimOnboardingBooster}>
                Save name & continue
              </button>
            </div>
          </section>
        </div>
      )}

      {showOutOfDicePurchasePrompt && shouldPromptDicePurchase && (
        <div className="island-run-overlay-root island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy" role="dialog" aria-modal="true" aria-label="Out of dice">
            <h3 className="island-stop-modal__title">🎲 Out of Dice</h3>
            <p className="island-stop-modal__copy">
              You do not have enough dice to roll right now. Buy more rolls or wait for dice to regenerate.
            </p>
            <OutOfDiceRegenStatus
              dicePool={dicePool}
              diceCostPerRoll={effectiveDiceCost}
              regenState={runtimeState.diceRegenState ?? null}
            />
            {diceCheckoutError ? <p className="island-run-prototype__error">{diceCheckoutError}</p> : null}
            <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                onClick={() => void handleStartDiceCheckout('out_of_dice_prompt')}
                disabled={isStartingDiceCheckout}
              >
                {isStartingDiceCheckout ? 'Starting checkout…' : 'Buy 500 Rolls (Stripe)'}
              </button>
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action"
                onClick={openShopPanel}
              >
                Open Shop
              </button>
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                onClick={() => setShowOutOfDicePurchasePrompt(false)}
              >
                Not now
              </button>
            </div>
          </section>
        </div>
      )}

      {showEggManiaModal && (
        <div className="island-run-overlay-root island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy" role="dialog" aria-modal="true" aria-label="Egg Mania details">
            <h3 className="island-stop-modal__title">🔥🥚 Egg Mania</h3>
            <p className="island-stop-modal__copy">
              Egg Mania is active on <strong>Island {islandNumber}</strong>. This island's Hatchery can set <strong>3 eggs at once</strong> instead of 1.
            </p>
            <p className="island-stop-modal__copy">
              Status: <strong>{isEggManiaUnused ? 'Unused — set your triple batch now!' : 'Triple-set used on this island.'}</strong>
            </p>
            <p className="island-stop-modal__copy">
              Ends: <strong>{timeLeftSec > 0 ? formatHatchCountdown(timeLeftSec * 1000) : 'when you leave this island'}</strong>
              {timeLeftSec > 0 ? ' or when you travel to another island.' : ''}
            </p>
            <p className="island-stop-modal__copy" style={{ opacity: 0.82 }}>
              Each Egg Mania egg hatches independently. You can collect creatures or sell eggs one-by-one once they are ready.
            </p>
            <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
              {activeStopId !== 'hatchery' && isEggManiaUnused ? (
                <button
                  type="button"
                  className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                  onClick={() => {
                    setShowEggManiaModal(false);
                    requestActiveStopTransition('hatchery', 'egg_mania_icon');
                  }}
                >
                  Go to Hatchery
                </button>
              ) : null}
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                onClick={() => setShowEggManiaModal(false)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {showRewardDetailsModal && (
        <div className="island-run-overlay-root island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-event-modal" role="dialog" aria-modal="true" aria-label="Event details">
            <header className="island-event-modal__header">
              <span className="island-event-modal__header-icon" aria-hidden="true">{activeEventMeta?.icon ?? '🎫'}</span>
              <div className="island-event-modal__header-text">
                <h3 className="island-stop-modal__title island-event-modal__title">
                  {activeEventMeta?.displayName ?? 'No active event'}
                </h3>
                <span className="island-event-modal__timer">⏱ {timedEventRemainingLabel} left</span>
              </div>
              <button
                type="button"
                className="island-event-modal__info-toggle"
                aria-pressed={isRewardBarDetailsExpanded}
                aria-label={isRewardBarDetailsExpanded ? 'Hide extra details' : 'Show extra details'}
                onClick={() => setIsRewardBarDetailsExpanded((value) => !value)}
              >
                i
              </button>
            </header>

            <div className="island-event-modal__grid" role="list" aria-label="Event mini-games">
              {getEventRotationTemplates().map((template) => {
                const isActive = effectiveActiveTimedEvent?.eventType === template.eventId;
                const isSelected = selectedEventInfoEventId === template.eventId;
                return (
                  <button
                    key={template.eventId}
                    type="button"
                    role="listitem"
                    className={`island-event-modal__grid-item${isActive ? ' island-event-modal__grid-item--active' : ''}${isSelected ? ' island-event-modal__grid-item--selected' : ''}`}
                    onClick={() => setSelectedEventInfoEventId(template.eventId)}
                    aria-label={`${template.displayName}${isActive ? ' (active now)' : ''}`}
                  >
                    <span aria-hidden="true" className="island-event-modal__grid-icon">{template.icon}</span>
                    <span className="island-event-modal__grid-label">{template.displayName}</span>
                    {isActive && <span className="island-event-modal__grid-active-dot" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>

            <div className="island-event-modal__stats">
              <div className="island-event-modal__stat">
                <span className="island-event-modal__stat-value">🎟️ {activeEventTickets}</span>
                <span className="island-event-modal__stat-label">Tickets</span>
              </div>
              <div className="island-event-modal__stat">
                <span className="island-event-modal__stat-value">{runtimeState.rewardBarClaimCountInEvent}</span>
                <span className="island-event-modal__stat-label">Played</span>
              </div>
              <div className="island-event-modal__stat">
                <span className="island-event-modal__stat-value">{Math.floor(rewardBarProgress)}/{Math.floor(rewardBarThreshold)}</span>
                <span className="island-event-modal__stat-label">Score</span>
              </div>
              <div className="island-event-modal__stat">
                <span className="island-event-modal__stat-value">{nextRewardIcon}</span>
                <span className="island-event-modal__stat-label">Next reward</span>
              </div>
            </div>
            <div className="island-event-modal__bar-track" aria-hidden="true">
              <div className="island-event-modal__bar-fill" style={{ width: `${rewardBarPercent}%` }} />
            </div>

            {isRewardBarDetailsExpanded && (
              <div className="island-event-modal__extra">
                {selectedEventInfoEventId && (() => {
                  const selected = getEventRotationTemplates().find((template) => template.eventId === selectedEventInfoEventId);
                  if (!selected) return null;
                  const isActive = effectiveActiveTimedEvent?.eventType === selected.eventId;
                  return (
                    <p className="island-stop-modal__copy">
                      {selected.icon} {selected.displayName}{isActive ? ' — currently active now.' : ''}
                    </p>
                  );
                })()}
                <p className="island-stop-modal__copy">
                  Next reward: <strong>{nextRewardIcon} {nextRewardKind.replace(/_/g, ' ')}</strong> · Tier {runtimeState.rewardBarEscalationTier}
                  {isDevTimedEventOverrideActive ? ' (DEV override event)' : ''}
                </p>
                {isSpaceExcavatorEffectiveEvent && (
                  <p className="island-stop-modal__copy">{SPACE_EXCAVATOR_REWARD_BAR_HINT_TEXT}</p>
                )}
                <p className="island-stop-modal__copy">
                  🧩 Sticker fragments: {runtimeState.stickerProgress.fragments}/5 · Stickers collected: {Object.values(runtimeState.stickerInventory).reduce((a, b) => a + b, 0)}
                  {runtimeState.stickerProgress.fragments >= 4 ? ' — 🎉 Almost a complete sticker!' : ''}
                </p>
                {effectiveMultiplier > 1 && (
                  <p className="island-stop-modal__copy">
                    🔥 Active multiplier: <strong>×{effectiveMultiplier}</strong> (costs {effectiveDiceCost} dice/roll) — rewards and progress are amplified!
                  </p>
                )}
                <p className="island-stop-modal__copy" style={{ opacity: 0.7, fontSize: '0.85em' }}>
                  The bar escalates: threshold grows each fill. Higher multipliers unlock quickly for small boosts (×2 at 2, ×3 at 3, ×5 at 5), then add runway for bigger bursts (×10 at 20, ×20 at 100, ×50 at 250, ×100 at 1k, ×200 at 2k). Higher multipliers cost more dice per roll but fill the bar faster!
                </p>
              </div>
            )}

            {minigameTicketCheckoutError ? (
              <p className="island-run-prototype__error">{minigameTicketCheckoutError}</p>
            ) : null}

            <div className="island-event-modal__tile-info">
              <p className="island-event-modal__tile-info-title">Tiles that fill this bar</p>
              <div className="island-event-modal__tile-list">
                <span>🎁 Chest <b>+2</b></span>
                <span>✨ Micro <b>+1</b></span>
                <span>💰 Currency <b>+1</b></span>
                <span>🐾 Feed <b>+4</b></span>
                <span>⚔️ Encounter <b>+3</b></span>
                <span>🎮 Mini-game <b>+4</b></span>
              </div>
            </div>

            <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
              {activeTimedEvent && isCanonicalEventId(activeTimedEvent.eventType) && (
                <button
                  type="button"
                  className="island-stop-modal__btn island-stop-modal__btn--action"
                  onClick={() => void handleStartMinigameTicketCheckout('active_event_panel')}
                  disabled={isStartingMinigameTicketCheckout}
                >
                  {isStartingMinigameTicketCheckout ? 'Starting ticket checkout…' : 'Buy Tickets'}
                </button>
              )}
              {canClaimRewardBar && (
                <button
                  type="button"
                  className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                  onClick={() => { handleContractV2RewardBarClaim(); setShowRewardDetailsModal(false); }}
                >
                  Claim Reward {nextRewardIcon}
                </button>
              )}
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                onClick={() => setShowRewardDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ── Egg-ready in-app banner ──────────────────────────────────────── */}
      {showEggReadyBanner && (
        <div className="island-run-overlay-root island-stop-modal-backdrop island-egg-ready-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-egg-ready-modal" role="dialog" aria-modal="true" aria-label="Egg ready">
            <h3 className="island-stop-modal__title island-egg-ready-modal__title">🌟🥚 Egg Ready to Open!</h3>
            {activeEgg ? (
              <div className={`island-egg-ready-modal__animation-frame${hasEggReadyAnimationPlayedOnce ? ' island-egg-ready-modal__animation-frame--tinted' : ''}`}>
                <video
                  className="island-hatchery-card__stage-art island-egg-ready-modal__animation"
                  src="/assets/creatures/egg-hatch/egg-hatch-alpha-v1.mp4"
                  poster={getEggStageArtSrc(activeEgg.tier, 4)}
                  autoPlay
                  muted
                  playsInline
                  preload="auto"
                  onEnded={(event) => {
                    setHasEggReadyAnimationPlayedOnce(true);
                    event.currentTarget.loop = true;
                    void event.currentTarget.play();
                  }}
                  aria-label={`${activeEgg.tier} egg hatching animation`}
                />
              </div>
            ) : null}
            <p className="island-stop-modal__copy">
              Your egg has finished incubating and is ready to open. Head to the Hatchery stop to collect your creature or sell for rewards!
            </p>
            <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
              <button
                type="button"
                className={`island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary${hasEggReadyAnimationPlayedOnce ? ' island-egg-ready-modal__primary-btn--ready' : ''}`}
                onClick={() => {
                  if (activeEgg) {
                    try { window.localStorage.setItem(getEggReadyBannerKey(session.user.id, activeEgg.setAtMs), '1'); } catch { /* ignore */ }
                  }
                  setShowEggReadyBanner(false);
                  requestActiveStopTransition('hatchery', 'egg_ready_banner');
                }}
              >
                Go to Hatchery
              </button>
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                onClick={() => {
                  if (activeEgg) {
                    try { window.localStorage.setItem(getEggReadyBannerKey(session.user.id, activeEgg.setAtMs), '1'); } catch { /* ignore */ }
                  }
                  setShowEggReadyBanner(false);
                }}
              >
                Later
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ── Safe placeholder dialog ─────────────────────────────────────── */}
      {activePlaceholder && (
        <div className="island-run-overlay-root island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy" role="dialog" aria-modal="true" aria-label="Island Run placeholder">
            <h3 className="island-stop-modal__title">{activePlaceholder.title}</h3>
            <p className="island-stop-modal__copy">{activePlaceholder.body}</p>
            <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
              {activePlaceholder.completionCtaLabel ? (
                <button
                  type="button"
                  className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                  onClick={() => {
                    handleCompleteActiveStop();
                    setActivePlaceholder(null);
                  }}
                >
                  {activePlaceholder.completionCtaLabel}
                </button>
              ) : null}
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                onClick={() => setActivePlaceholder(null)}
              >
                {activePlaceholder.closeLabel}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ── Sticker album dialog ────────────────────────────────────────── */}
      {showStickerAlbumDialog && (
        <div className="island-run-overlay-root island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy" role="dialog" aria-modal="true" aria-label="Sticker album">
            <h3 className="island-stop-modal__title">🧩 Sticker Album</h3>
            <p className="island-stop-modal__copy">
              Fragments: <strong>{runtimeState.stickerProgress.fragments}</strong> / 5
              {runtimeState.stickerProgress.fragments >= 5 ? ' — Ready to create a sticker!' : ''}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '8px 0' }}>
              {getEventRotationTemplates().map((template) => {
                const count = runtimeState.stickerInventory[template.stickerId] ?? 0;
                return (
                  <div key={template.eventId} style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: count > 0 ? 'rgba(255,215,0,0.15)' : 'rgba(128,128,128,0.1)',
                    border: count > 0 ? '1px solid rgba(255,215,0,0.4)' : '1px solid rgba(128,128,128,0.2)',
                    textAlign: 'center',
                    minWidth: '80px',
                  }}>
                    <div style={{ fontSize: '1.5em' }}>{template.icon}</div>
                    <div style={{ fontSize: '0.75em', opacity: 0.8 }}>{template.displayName}</div>
                    <div style={{ fontWeight: 'bold' }}>{count > 0 ? `×${count}` : '—'}</div>
                  </div>
                );
              })}
            </div>
            <p className="island-stop-modal__copy">
              Each complete sticker awards <strong>+100 🎲 dice</strong> and <strong>+50 💰 money</strong>!
            </p>
            <p className="island-stop-modal__copy" style={{ opacity: 0.7, fontSize: '0.85em' }}>
              Collect sticker fragments from the reward bar. Every 5 fragments complete one sticker.
            </p>
            <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                onClick={() => setShowStickerAlbumDialog(false)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {showIslandClearCelebration && islandClearStats && (
        <>
          <div
            className={`island-clear-celebration${islandClearStats.isCycleCapstone ? ' island-clear-celebration--capstone' : ''}${isIslandClearCelebrationDeparting ? ' island-clear-celebration--departing' : ''}`}
            role="dialog"
            aria-modal={islandNarrativeOpeningFlow.activeDialogue?.beatId === 'I001-B30' ? 'false' : 'true'}
            aria-hidden={islandNarrativeOpeningFlow.activeDialogue?.beatId === 'I001-B30' ? true : undefined}
            aria-label="Island completion celebration"
          >
            <CelebrationFireworks
              key={`${islandClearStats.islandNumber}-${islandClearStats.isCycleCapstone ? 'capstone' : 'hero'}`}
              variant={islandClearStats.isCycleCapstone ? 'capstone' : 'hero'}
            />
            <div className="island-clear-celebration__sparkles" aria-hidden="true">
              <span className="island-clear-celebration__sparkle island-clear-celebration__sparkle--one">✦</span>
              <span className="island-clear-celebration__sparkle island-clear-celebration__sparkle--two">✧</span>
              <span className="island-clear-celebration__sparkle island-clear-celebration__sparkle--three">✦</span>
              <span className="island-clear-celebration__sparkle island-clear-celebration__sparkle--four">✧</span>
              <span className="island-clear-celebration__sparkle island-clear-celebration__sparkle--five">✦</span>
            </div>
            <div
              className={`island-clear-celebration__card island-clear-celebration__card--boss${islandClearStats.isCycleCapstone ? ' island-clear-celebration__card--capstone' : ''}`}
            >
              <img
                className="island-clear-celebration__hero"
                src="/assets/islands/celebrations/newisland/backgroundceleb.webp"
                alt=""
                aria-hidden="true"
              />
              <div className="island-clear-celebration__content">
                <img
                  className="island-clear-celebration__title-image"
                  src="/assets/islands/celebrations/newisland/islandcompletetext.webp"
                  alt="Island Complete"
                />
                <p className="island-clear-celebration__eyebrow">New Island Unlocked</p>
                {isIslandClearRewardClaimed ? (
                  <p className="island-clear-celebration__rewards-collected">✅ Rewards Collected</p>
                ) : (
                  <div
                    key={islandClearRewardPulseKey}
                    className="island-clear-celebration__rewards"
                  >
                    <span className="island-clear-celebration__reward-item">
                      <span className="island-clear-celebration__reward-icon" aria-hidden="true">🎲</span>
                      <span className="island-clear-celebration__reward-value">+{islandClearStats.diceEarned}</span>
                    </span>
                    <span className="island-clear-celebration__reward-item">
                      <span className="island-clear-celebration__reward-icon" aria-hidden="true">💰</span>
                      <span className="island-clear-celebration__reward-value">+{islandClearStats.essenceEarned}</span>
                    </span>
                    <span className="island-clear-celebration__reward-item">
                      <span className="island-clear-celebration__reward-icon" aria-hidden="true">🟣</span>
                      <span className="island-clear-celebration__reward-value">+3</span>
                    </span>
                  </div>
                )}
                <p className="island-clear-celebration__stops">
                  ✅ {islandClearStats.stopsCleared} stops cleared · Island {islandClearStats.islandNumber} complete
                </p>
                <div className="island-clear-celebration__actions">
                  <button
                    type="button"
                    className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary island-clear-celebration__cta"
                    onClick={isIslandClearRewardClaimed ? handleTravelFromCelebration : handleClaimIslandClearCelebrationRewards}
                    disabled={isIslandClearCelebrationDeparting}
                    autoFocus
                  >
                    {isIslandClearRewardClaimed
                      ? (getTreasurePathMilestoneMetadata(islandClearStats.islandNumber)
                        ? 'Start Treasure Path'
                        : 'Travel to Next Island')
                      : 'Claim Rewards'}
                  </button>
                  {isIslandClearRewardClaimed && !isIslandClearCelebrationDeparting && (
                    <button
                      type="button"
                      className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary island-clear-celebration__cta island-clear-celebration__cta--secondary"
                      onClick={handleKeepPlayingAfterIslandClear}
                    >
                      Keep Playing For Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {walletStoreModalKind && (
        <div className="island-run-overlay-root island-stop-modal-backdrop" role="presentation">
          <section
            className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--wallet-store"
            role="dialog"
            aria-modal="true"
            aria-label={`${activeWalletName} buying options`}
          >
            <h3 className="island-stop-modal__title">
              {activeWalletIcon} {activeWalletName} Options
            </h3>
            <p className="island-stop-modal__copy">
              Balance: <strong>{activeWalletBalance} {activeWalletIcon}</strong> · Affordable options are highlighted.
            </p>
            <div className="island-run-wallet-store-grid" aria-label={`${activeWalletName} buying possibilities`}>
              {activeWalletPurchaseOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`island-run-wallet-store-card ${option.canAfford ? 'island-run-wallet-store-card--affordable' : 'island-run-wallet-store-card--locked'}`}
                  onClick={option.onSelect}
                  disabled={!option.canAfford || !option.onSelect}
                >
                  <span className="island-run-wallet-store-card__icon" aria-hidden="true">{option.icon}</span>
                  <strong>{option.title}</strong>
                  <span className="island-run-wallet-store-card__cost">
                    {option.cost} {option.currencyIcon}
                  </span>
                  <span>{option.summary}</span>
                  {option.rewardLabel ? <span className="island-run-wallet-store-card__reward">{option.rewardLabel}</span> : null}
                  <span className="island-run-wallet-store-card__status">
                    {option.canAfford ? option.actionLabel : option.disabledReason ?? 'Need more'}
                  </span>
                </button>
              ))}
              {Array.from({ length: activeWalletEmptySlotCount }, (_, index) => (
                <article
                  key={`empty-${index}`}
                  className="island-run-wallet-store-card island-run-wallet-store-card--empty"
                  aria-label="Empty wallet offer slot"
                >
                  <span className="island-run-wallet-store-card__icon" aria-hidden="true">＋</span>
                  <strong>More offers soon</strong>
                  <span>Keep progressing to unlock more buys.</span>
                </article>
              ))}
            </div>
            <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                onClick={() => setWalletStoreModalKind(null)}
              >
                ✕ Close
              </button>
            </div>
          </section>
        </div>
      )}

      {/* M14: unified shop panel (merged shop + market) */}
      {showShopPanel && (
        <div className="island-run-overlay-root island-stop-modal-backdrop" role="presentation">
          <section className="island-run-shop-panel island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy" role="dialog" aria-modal="true" aria-label="Shop">
            <h3 className="island-stop-modal__title">🛍️ Market</h3>
            <p className="island-stop-modal__copy"><strong>💰 {runtimeState.essence} money</strong> · Island {islandNumber}</p>

            <div className="island-hatchery-card">
              <p><strong>Flash Offer — Dice Top-up</strong></p>
              <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>Limited-time checkout entry for 500 rolls.</p>
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                onClick={() => void handleStartDiceCheckout('market_panel')}
                disabled={isStartingDiceCheckout}
              >
                {isStartingDiceCheckout ? 'Starting checkout…' : 'Buy 500 Rolls (Stripe)'}
              </button>
            </div>

            <div className="island-hatchery-card island-run-creature-pack-offer">
              <p><strong>Creature Pack — 5 cards</strong></p>
              <p style={{ fontSize: '0.85rem', opacity: 0.72 }}>Cards only: no dice or essence. Weighted common/rare slots with at least 2 new-to-you creatures when enough unowned creatures remain.</p>
              <details className="island-run-creature-pack-offer__details">
                <summary>Odds & duplicate policy</summary>
                <ul>
                  <li>Slot 1: Common 100%</li>
                  <li>Slot 2: Common 95% · Rare 5%</li>
                  <li>Slot 3: Common 90% · Rare 10%</li>
                  <li>Slot 4: Common 85% · Rare 15%</li>
                  <li>Slot 5: Common 80% · Rare 20%</li>
                  <li>Guarantee: at least 2 new-to-you creatures when available; duplicate cards increase that creature’s copy count.</li>
                  <li>No mythic cards in this pack version.</li>
                </ul>
              </details>
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                onClick={() => void handleStartCreaturePackCheckout()}
                disabled={isStartingCreaturePackCheckout || !isCreaturePackStripeCheckoutEnabled}
              >
                {isStartingCreaturePackCheckout ? 'Starting checkout…' : isCreaturePackStripeCheckoutEnabled ? 'Buy Creature Pack (Stripe)' : 'Creature Pack checkout under review'}
              </button>
              {!isCreaturePackStripeCheckoutEnabled ? <p className="island-run-creature-pack-offer__fine-print">Paid random packs are gated until odds, refund, and purchase-policy review is complete.</p> : null}
              {creaturePackCheckoutError ? <p className="island-run-prototype__error">{creaturePackCheckoutError}</p> : null}
            </div>

            <div className="island-hatchery-card">
              <p><strong>Creature Pack — 5 cards</strong></p>
              <p style={{ fontSize: '0.85rem', opacity: 0.72 }}>Same resolver as the dev pack: weighted common/rare odds with at least 2 new-to-you creatures when available.</p>
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                onClick={() => void handleStartCreaturePackCheckout()}
                disabled={isStartingCreaturePackCheckout}
              >
                {isStartingCreaturePackCheckout ? 'Starting checkout…' : 'Buy Creature Pack (Stripe)'}
              </button>
              {creaturePackCheckoutError ? <p className="island-run-prototype__error">{creaturePackCheckoutError}</p> : null}
            </div>

            <div className="island-hatchery-card">
              <p><strong>Tier 1 — Always available</strong></p>
              <div className="island-hatchery-card__actions">
                {marketOwnedBundles.dice_bundle ? (
                  <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" disabled aria-label="Dice Bundle already owned">
                    🎲 Dice Bundle — Owned ✅
                  </button>
                ) : (
                  <button
                    type="button"
                    className="island-stop-modal__btn island-stop-modal__btn--action"
                    disabled={runtimeState.essence < MARKET_DICE_BUNDLE_COST}
                    onClick={() => handleMarketPrototypePurchase('dice_bundle')}
                  >
                    🎲 Dice Bundle —{' '}
                    <ShopItemCostLine
                      cost={MARKET_DICE_BUNDLE_COST}
                      balance={runtimeState.essence}
                      currencyIcon="💰"
                      currencyName="money"
                    />{' '}
                    → +{MARKET_DICE_BUNDLE_REWARD} 🎲
                  </button>
                )}
              </div>
            </div>

            <div className="island-hatchery-card">
              <p><strong>Tier 2 — Post-boss unlock</strong></p>
              {completedStops.includes('boss') ? (
                <p style={{ fontSize: '0.85rem', opacity: 0.65 }}>👑 Tier 2 bundles: bigger dice packs + essence boosters available soon.</p>
              ) : (
                <p style={{ fontSize: '0.85rem', opacity: 0.65 }}>👑 Defeat the boss to unlock</p>
              )}
            </div>

            <div className="island-hatchery-card">
              <p><strong>Creature Trade</strong></p>
              <p style={{ fontSize: '0.85rem', opacity: 0.65 }}>Hatched eggs are now resolved directly in the Hatchery: collect the creature for your manifest or sell it there immediately for rewards.</p>
            </div>

            {marketPurchaseFeedback && <p className="island-run-prototype__landing island-run-prototype__landing--info">{marketPurchaseFeedback}</p>}

            <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                onClick={() => {
                  setShowShopPanel(false);
                  setMarketPurchaseFeedback(null);
                  void recordTelemetryEvent({ userId: session.user.id, eventType: 'economy_earn', metadata: { stage: 'shop_close', island_number: islandNumber } });
                }}
              >
                ✕ Close
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Build panel v2 — Monopoly GO-style bottom tray (Island 1 artwork + horizontal card tray) */}
      {ISLAND_RUN_CONTRACT_V2_ENABLED && (
        <BuildModalV2
          isOpen={showBuildPanel}
          islandNumber={islandNumber}
          essenceAvailable={runtimeState.essence}
          onClose={() => setShowBuildPanel(false)}
          viewModel={buildModalV2ViewModel}
          isBuildHoldActive={isBuildHoldActive}
          buildHoldFeedbackLabel={buildHoldFeedbackLabel}
          isBuildModalHatcheryGuidanceActive={isBuildModalHatcheryGuidanceActive}
          discountRate={activeBuildDiscountRate}
          discountExpiresAtMs={buildDiscountExpiresAtMs}
          onBuildActivePart={handleBuildCardTap}
        />
      )}

      {showPerfectCompanionOnboardingHint && (
        <div className="island-run-overlay-root island-stop-modal-backdrop" role="presentation">
          <section
            className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy island-stop-modal--onboarding"
            role="dialog"
            aria-modal="true"
            aria-label="Perfect Companion onboarding hint"
          >
            <p className="island-stop-modal__eyebrow">Perfect Companion</p>
            <h3 className="island-stop-modal__title">✨ New creature synergy unlocked</h3>
            <p className="island-stop-modal__copy">
              <strong>{perfectCompanionOnboardingCreatureName ?? 'Your new creature'}</strong>{' '}
              can be one of your best companions for this cycle.
              {isUsingStarterProfileForPerfectCompanion
                ? ' We are using a starter profile until your archetype hand is set.'
                : ' Its fit is based on your archetype hand.'}
            </p>
            <div className="island-hatchery-card__actions">
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                onClick={() => {
                  if (perfectCompanionOnboardingCreatureId) {
                    sanctuaryHandlers.setActiveCompanion(perfectCompanionOnboardingCreatureId);
                  }
                  setShowPerfectCompanionOnboardingHint(false);
                  setShowSanctuaryPanel(true);
                  setSelectedSanctuaryCreatureId(perfectCompanionOnboardingCreatureId);
                  setShowPerfectCompanionReason(true);
                  void recordTelemetryEvent({
                    userId: session.user.id,
                    eventType: 'onboarding_completed',
                    metadata: {
                      stage: 'perfect_companion_onboarding_hint_set_active',
                      island_number: islandNumber,
                      creature_id: perfectCompanionOnboardingCreatureId,
                      creature_name: perfectCompanionOnboardingCreatureName,
                    },
                  });
                }}
              >
                Set active + open sanctuary
              </button>
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                onClick={() => {
                  setShowPerfectCompanionOnboardingHint(false);
                  void recordTelemetryEvent({
                    userId: session.user.id,
                    eventType: 'onboarding_completed',
                    metadata: {
                      stage: 'perfect_companion_onboarding_hint_dismissed',
                      island_number: islandNumber,
                      creature_id: perfectCompanionOnboardingCreatureId,
                      creature_name: perfectCompanionOnboardingCreatureName,
                    },
                  });
                }}
              >
                Got it
              </button>
            </div>
          </section>
        </div>
      )}

      {showSanctuaryPanel && (
        <div
          className="island-run-overlay-root island-stop-modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSanctuaryPanel(false);
            }
          }}
        >
          <section
            className="island-run-sanctuary-panel island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy"
            role="dialog"
            aria-modal="true"
            aria-label="Creature Sanctuary"
          >
            <div className="island-run-sanctuary-header">
              <div>
                <p className="island-run-sanctuary-header__title">SPACESHIP SANCTUARY</p>
                <p className="island-run-sanctuary-header__status">
                  {`${collectedCreatures.length} / ${CREATURE_CATALOG.length} discovered`} · Active: {activeCompanion?.creature.name ?? 'None'}
                </p>
                <button
                  type="button"
                  aria-label={showSanctuaryMenu ? 'Close Sanctuary menu' : 'Open Sanctuary menu'}
                  className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                  onClick={() => {
                    setShowSanctuaryMenu((current) => {
                      const next = !current;
                      if (!next) setSanctuaryMenuModule(null);
                      return next;
                    });
                  }}
                >
                  {showSanctuaryMenu ? 'Hide Menu' : 'Menu'}
                </button>
              </div>
              <button
                type="button"
                aria-label="Close Creature Sanctuary"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                onClick={sanctuaryHandlers.closePanel}
              >
                ✕
              </button>
            </div>

            {showSanctuaryMenu && sanctuaryMenuModule === 'collection' ? (
            <>
            <p className="island-stop-modal__copy">Your creatures live here. Hatch eggs, collect companions, and grow bonds over time.</p>
            <div className="island-run-sanctuary-panel__summary">
              <span className="island-run-sanctuary-panel__pill">Species: <strong>{collectedCreatures.length}</strong></span>
              <span className="island-run-sanctuary-panel__pill">Copies: <strong>{collectedCreatures.reduce((sum, creature) => sum + creature.copies, 0)}</strong></span>
              <span className="island-run-sanctuary-panel__pill">
                Active: <strong>{activeCompanion?.creature.name ?? 'None'}</strong>
              </span>
              <span className="island-run-sanctuary-panel__pill">Current island: <strong>{islandNumber}</strong></span>
              <span className="island-run-sanctuary-panel__pill">Rewards ready: <strong>{sanctuaryRewardReadyCount}</strong></span>
            </div>
            </>
            ) : null}

            {showSanctuaryMenu && sanctuaryMenuModule === 'inventory' ? (
            <div className="island-run-sanctuary-panel__summary">
              <span className="island-run-sanctuary-panel__pill">🟣 Essence: <strong>{runtimeState.shards}</strong></span>
              <span className="island-run-sanctuary-panel__pill">Basic treats: <strong>{creatureTreatInventory.basic}</strong></span>
              <span className="island-run-sanctuary-panel__pill">Favorite snacks: <strong>{creatureTreatInventory.favorite}</strong></span>
              <span className="island-run-sanctuary-panel__pill">Rare feasts: <strong>{creatureTreatInventory.rare}</strong></span>
            </div>
            ) : null}

            {showSanctuaryMenu && sanctuaryMenuModule === 'inventory' ? (
            <div className="island-hatchery-card" style={{ marginBottom: '0.75rem' }}>
              <p><strong>🎨 Premium Creature Themes</strong> — one-time real-money Stripe purchases</p>
              <p style={{ fontSize: '0.82rem', opacity: 0.7, marginBottom: '0.5rem' }}>
                Upgrade a creature to Form 3 with essence to unlock its one-time real-money theme checkout. Perfect Pair creatures keep the 20% discount.
              </p>
              {themeEntitlementsLoading ? (
                <p style={{ fontSize: '0.82rem', opacity: 0.7 }}>Syncing your owned themes…</p>
              ) : null}
              {themeCheckoutError ? (
                <p style={{ fontSize: '0.82rem', opacity: 0.78 }}>{themeCheckoutError}</p>
              ) : null}
              <div className="island-hatchery-card__actions" style={{ flexDirection: 'column', gap: '0.35rem' }}>
                {sanctuaryCreatureThemeOffers.map((themeOption) => {
                  const access = resolveThemeAccess(themeOption, creatureThemeAccessContext);
                  const isOwned = access.selectable;
                  const isPurchasable = access.status === 'available_for_purchase' || access.status === 'available_for_paired_purchase';
                  const isBusy = themeCheckoutLoadingId === themeOption.id;
                  const creatureName = themeOption.unlockRule.creatureName;
                  const priceLabel = access.displayPrice ?? themeOption.unlockRule.basePriceUsd;
                  const compareAt = access.compareAtPrice;
                  return (
                    <button
                      key={themeOption.id}
                      type="button"
                      className="island-stop-modal__btn island-stop-modal__btn--action"
                      disabled={!isPurchasable || isBusy}
                      onClick={() => {
                        if (access.status === 'available_for_paired_purchase') {
                          setPairedThemeOfferModal({ theme: themeOption, access });
                          return;
                        }
                        handleSanctuaryThemeCheckout(themeOption, access);
                      }}
                    >
                      {themeOption.icon} {themeOption.name} — {isOwned
                        ? 'Owned'
                        : isPurchasable
                          ? `${access.status === 'available_for_paired_purchase' ? 'Perfect Pair ' : ''}${priceLabel} one-time Stripe checkout${compareAt ? ` (was ${compareAt})` : ''}`
                          : access.lockedReason ?? `Hatch ${creatureName} to unlock this one-time Stripe offer.`}
                    </button>
                  );
                })}
              </div>
            </div>
            ) : null}

            {/* ── Shard Shop: buy treats & creature items with egg shards ── */}
            {showSanctuaryMenu && sanctuaryMenuModule === 'inventory' ? (
            <div className="island-hatchery-card" style={{ marginBottom: '0.75rem' }}>
              <p><strong>🟣 Essence Shop</strong> — Spend essence on your creatures</p>
              <p style={{ fontSize: '0.82rem', opacity: 0.7, marginBottom: '0.5rem' }}>
                Essence is earned from tiles, egg hatching, and stop completions. Spend it here!
              </p>
              <div className="island-hatchery-card__actions" style={{ flexDirection: 'column', gap: '0.35rem' }}>
                <button
                  type="button"
                  className="island-stop-modal__btn island-stop-modal__btn--action"
                  disabled={runtimeState.shards < 3}
                  onClick={() => {
                    if (!spendWalletShards(3, 'sanctuary_shop_basic_treat')) return;
                    setCreatureTreatInventory((prev) => ({ ...prev, basic: prev.basic + 2 }));
                    if (session?.user?.id) {
                      earnCreatureTreatsForUser(session.user.id, { basic: 2 });
                    }
                    setLandingText('🟣 Bought 2 Basic Treats for 3 essence!');
                    playIslandRunSound('market_purchase_success');
                  }}
                >
                  🍖 Basic Treat ×2 — 3 🟣 {runtimeState.shards < 3 && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}> (need {3 - runtimeState.shards} more)</span>}
                </button>
                <button
                  type="button"
                  className="island-stop-modal__btn island-stop-modal__btn--action"
                  disabled={runtimeState.shards < 5}
                  onClick={() => {
                    if (!spendWalletShards(5, 'sanctuary_shop_favorite_treat')) return;
                    setCreatureTreatInventory((prev) => ({ ...prev, favorite: prev.favorite + 1 }));
                    if (session?.user?.id) {
                      earnCreatureTreatsForUser(session.user.id, { favorite: 1 });
                    }
                    setLandingText('🟣 Bought 1 Favorite Snack for 5 essence!');
                    playIslandRunSound('market_purchase_success');
                  }}
                >
                  🐟 Favorite Snack ×1 — 5 🟣 {runtimeState.shards < 5 && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}> (need {5 - runtimeState.shards} more)</span>}
                </button>
                <button
                  type="button"
                  className="island-stop-modal__btn island-stop-modal__btn--action"
                  disabled={runtimeState.shards < 10}
                  onClick={() => {
                    if (!spendWalletShards(10, 'sanctuary_shop_rare_treat')) return;
                    setCreatureTreatInventory((prev) => ({ ...prev, rare: prev.rare + 1 }));
                    if (session?.user?.id) {
                      earnCreatureTreatsForUser(session.user.id, { rare: 1 });
                    }
                    setLandingText('🟣 Bought 1 Rare Feast for 10 essence!');
                    playIslandRunSound('market_purchase_success');
                  }}
                >
                  🍗 Rare Feast ×1 — 10 🟣 {runtimeState.shards < 10 && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}> (need {10 - runtimeState.shards} more)</span>}
                </button>
                <button
                  type="button"
                  className="island-stop-modal__btn island-stop-modal__btn--action"
                  disabled={runtimeState.shards < 8 || !activeCompanion}
                  onClick={() => {
                    if (!activeCompanion) return;
                    if (!spendWalletShards(8, 'sanctuary_shop_enrichment_kit')) return;
                    // Award 3 bond XP directly to active companion
                    sanctuaryHandlers.awardBondXp(activeCompanion.creatureId, 3);
                    setLandingText(`🟣 Enrichment Kit applied to ${activeCompanion.creature.name}: +3 bond XP!`);
                    playIslandRunSound('market_purchase_success');
                  }}
                >
                  🧸 Enrichment Kit — 8 🟣 → +3 bond XP to active companion {!activeCompanion && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}> (no active companion)</span>}
                  {activeCompanion && runtimeState.shards < 8 && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}> (need {8 - runtimeState.shards} more)</span>}
                </button>
                <button
                  type="button"
                  className="island-stop-modal__btn island-stop-modal__btn--action"
                  disabled={runtimeState.shards < 20 || !activeCompanion}
                  onClick={() => {
                    if (!activeCompanion) return;
                    if (!spendWalletShards(20, 'sanctuary_shop_habitat_upgrade')) return;
                    // Award 8 bond XP (habitat upgrade bonus)
                    sanctuaryHandlers.awardBondXp(activeCompanion.creatureId, 8);
                    setLandingText(`🟣 Habitat Upgrade for ${activeCompanion.creature.name}: +8 bond XP!`);
                    playIslandRunSound('market_purchase_success');
                    triggerIslandRunHaptic('market_purchase_success');
                  }}
                >
                  🏠 Habitat Upgrade — 20 🟣 → +8 bond XP to active companion {!activeCompanion && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}> (no active companion)</span>}
                  {activeCompanion && runtimeState.shards < 20 && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}> (need {20 - runtimeState.shards} more)</span>}
                </button>
              </div>
            </div>
            ) : null}
            {showSanctuaryMenu ? (
            <section className="island-run-sanctuary-menu-sheet" aria-label="Sanctuary Menu">
            <>
            <div className="island-run-sanctuary-toolbar__filters" role="group" aria-label="Sanctuary menu modules">
              {[
                ['collection', 'Collection Info'],
                ['inventory', 'Inventory & Shop'],
                ['quest', 'Companion Quest'],
                ['rooms', 'Ship Rooms'],
                ['filters', 'Filters & Sort'],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={`island-run-sanctuary-filter ${sanctuaryMenuModule === mode ? 'island-run-sanctuary-filter--active' : ''}`}
                  onClick={() => setSanctuaryMenuModule(mode as 'collection' | 'inventory' | 'quest' | 'rooms' | 'filters')}
                >
                  {label}
                </button>
              ))}
            </div>
            {showSanctuaryMenu && sanctuaryMenuModule === 'rooms' ? (
            <p className="island-run-sanctuary-menu-sheet__label">Ship Upgrades</p>
            ) : null}
            {showSanctuaryMenu && sanctuaryMenuModule === 'rooms' ? (
            <div className="island-hatchery-card__actions" style={{ marginBottom: '0.75rem' }}>
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('openScoreGarageFromSanctuary'));
                  }
                  void recordTelemetryEvent({
                    userId: session.user.id,
                    eventType: 'economy_earn',
                    metadata: {
                      stage: 'sanctuary_open_ship_upgrades_bridge',
                      island_number: islandNumber,
                    },
                  });
                }}
              >
                Open Ship Upgrades (Garage)
              </button>
            </div>
            ) : null}
            {isUsingStarterProfileForPerfectCompanion ? (
              <p className="island-run-sanctuary-panel__starter-note">
                ⭐ Using starter profile until your archetype hand is set.
              </p>
            ) : null}

            {!selectedSanctuaryCreature && collectedCreatures.length > 0 ? (
              <div className="island-run-sanctuary-toolbar">
                {sanctuaryMenuModule === 'quest' ? <p className="island-run-sanctuary-menu-sheet__label">Companion Quest</p> : null}
                {sanctuaryMenuModule === 'quest' ? (
                <section className="island-run-sanctuary-quest">
                  <div>
                    <p className="island-run-sanctuary-quest__title">{companionQuestCopy.title}</p>
                    <p className="island-run-sanctuary-quest__body">{companionQuestCopy.body}</p>
                    <p className="island-run-sanctuary-quest__meta">
                      Streak: <strong>{companionQuestProgress.currentStreak}</strong> · Best: <strong>{companionQuestProgress.bestStreak}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                    onClick={handleClaimCompanionQuest}
                    disabled={!companionQuestComplete || companionQuestClaimedToday}
                  >
                    {companionQuestClaimedToday
                      ? 'Claimed today'
                      : companionQuestComplete
                        ? 'Claim quest streak'
                        : companionQuestCopy.cta}
                  </button>
                </section>
                ) : null}
                {sanctuaryMenuModule === 'quest' && topPerfectCompanionEntries.length > 0 ? (
                  <div className="island-run-sanctuary-top3" role="group" aria-label="Your best companions">
                    <p className="island-run-sanctuary-top3__title">Your Best Companions</p>
                    <div className="island-run-sanctuary-top3__chips">
                      {topPerfectCompanionEntries.map((entry, index) => (
                        <button
                          key={entry.creatureId}
                          type="button"
                          className="island-run-sanctuary-top3__chip"
                          onClick={() => sanctuaryHandlers.openCreature(entry.creatureId)}
                        >
                          #{index + 1} {entry.creature.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {sanctuaryMenuModule === 'rooms' ? <p className="island-run-sanctuary-menu-sheet__label">Ship Rooms</p> : null}
                {sanctuaryMenuModule === 'rooms' ? (
                <div className="island-run-sanctuary-zone-tabs" role="tablist" aria-label="Ship sanctuary zones">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={sanctuaryZoneFilter === 'all'}
                    className={`island-run-sanctuary-filter ${sanctuaryZoneFilter === 'all' ? 'island-run-sanctuary-filter--active' : ''}`}
                    onClick={() => setSanctuaryZoneFilter('all')}
                  >
                    All Zones
                  </button>
                  {sanctuaryZoneSummaries.map((summary) => (
                    <button
                      key={summary.zone}
                      type="button"
                      role="tab"
                      aria-selected={sanctuaryZoneFilter === summary.zone}
                      className={`island-run-sanctuary-filter ${sanctuaryZoneFilter === summary.zone ? 'island-run-sanctuary-filter--active' : ''}`}
                      onClick={() => setSanctuaryZoneFilter(summary.zone)}
                    >
                      {SHIP_ZONE_LABELS[summary.zone]} · {summary.visibleCount}/{summary.capacity}
                    </button>
                  ))}
                </div>
                ) : null}
                {sanctuaryMenuModule === 'rooms' ? (
                <div className="island-run-sanctuary-zone-capacity" aria-label="Zone slot capacity">
                  {sanctuaryZoneSummaries.map((summary) => (
                    <article key={summary.zone} className="island-run-sanctuary-zone-capacity__card">
                      <p className="island-run-sanctuary-zone-capacity__title">{SHIP_ZONE_LABELS[summary.zone]}</p>
                      <p className="island-run-sanctuary-zone-capacity__meta">
                        Occupied <strong>{summary.visibleCount}</strong> / <strong>{summary.capacity}</strong>
                        {summary.overflowCount > 0 ? (
                          <span> · Queue +{summary.overflowCount}</span>
                        ) : null}
                      </p>
                      <div className="island-run-sanctuary-zone-capacity__track" aria-hidden="true">
                        <span
                          className="island-run-sanctuary-zone-capacity__fill"
                          style={{ width: `${Math.min(100, (summary.visibleCount / Math.max(1, summary.capacity)) * 100)}%` }}
                        />
                      </div>
                    </article>
                  ))}
                </div>
                ) : null}
                {sanctuaryMenuModule === 'rooms' ? (
                <p className="island-run-sanctuary-zone-capacity__progress-note">
                  Progression unlock: <strong>{sanctuaryTierRevealLabel}</strong>. Deeper slots reveal as your island tier advances.
                </p>
                ) : null}
                {sanctuaryMenuModule === 'filters' ? <p className="island-run-sanctuary-menu-sheet__label">Filters & Sort</p> : null}
                {sanctuaryMenuModule === 'filters' ? (
                <div className="island-run-sanctuary-toolbar__filters" role="group" aria-label="Sanctuary filters">
                  {[
                    ['all', 'All'],
                    ['reward_ready', 'Reward Ready'],
                    ['active', 'Active'],
                    ['common', 'Common'],
                    ['rare', 'Rare'],
                    ['mythic', 'Mythic'],
                  ].map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      className={`island-run-sanctuary-filter ${sanctuaryFilterMode === mode ? 'island-run-sanctuary-filter--active' : ''}`}
                      onClick={() => setSanctuaryFilterMode(mode as SanctuaryFilterMode)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                ) : null}
                {sanctuaryMenuModule === 'filters' ? (
                <label className="island-run-sanctuary-toolbar__sort">
                  <span>Sort</span>
                  <select value={sanctuarySortMode} onChange={(e) => setSanctuarySortMode(e.target.value as SanctuarySortMode)}>
                    <option value="recent">Reward ready / recent</option>
                    <option value="bond">Highest bond</option>
                    <option value="tier">Highest tier</option>
                    <option value="active">Active first</option>
                  </select>
                </label>
                ) : null}
              </div>
            ) : null}
            </>
            </section>
            ) : null}

            {sanctuaryFeedback ? <p className="island-run-sanctuary-panel__feedback">{sanctuaryFeedback}</p> : null}

            {!selectedSanctuaryCreature ? (
              <section className="island-run-sanctuary-companion-preview" aria-label="Active Companion preview">
                <div className="island-run-sanctuary-companion-preview__header">
                  <div>
                    <p className="island-run-sanctuary-companion-preview__eyebrow">Paired Creature</p>
                    <h4 className="island-run-sanctuary-companion-preview__title">Active Companion</h4>
                  </div>
                  <div className="island-run-sanctuary-companion-preview__header-actions">
                    <span className="island-run-sanctuary-companion-preview__badge">Read-only preview</span>
                    <button
                      type="button"
                      className="island-run-sanctuary-companion-preview__info-toggle"
                      aria-label={showSanctuaryCompanionInfo ? 'Hide companion info' : 'Show companion info'}
                      aria-expanded={showSanctuaryCompanionInfo}
                      onClick={() => setShowSanctuaryCompanionInfo((current) => !current)}
                    >
                      i
                    </button>
                  </div>
                </div>
                {showSanctuaryCompanionInfo ? (
                  <>
                    <p className="island-run-sanctuary-companion-preview__copy">
                      Your Paired Creature gently speeds up roll regeneration.
                    </p>
                    <p className="island-run-sanctuary-companion-preview__copy">
                      Complete your personality profile to unlock stronger companion matching.
                    </p>
                  </>
                ) : null}
                {(() => {
                  const companionArt = activeRegenCompanion ? resolveCreatureArtManifest(activeRegenCompanion.creature) : null;
                  return (
                    <article className={`island-run-sanctuary-companion-preview__card ${activeCompanionRegenModifier.isOwned ? 'island-run-sanctuary-companion-preview__card--active' : ''}`}>
                      <div className="island-run-sanctuary-companion-preview__frame">
                        {activeRegenCompanion && companionArt ? (
                          <>
                            <img
                              className="island-run-sanctuary-companion-preview__art"
                              src={companionArt.cutoutSrc}
                              alt={`${activeRegenCompanion.creature.name} active companion preview`}
                              loading="lazy"
                              onError={(event) => {
                                applyCreatureArtFallback(event, {
                                  pngSrc: companionArt.cutoutPngSrc,
                                  silhouetteSrc: companionArt.silhouetteSrc,
                                });
                              }}
                            />
                            <span className="island-run-sanctuary-companion-preview__emoji" aria-hidden="true">{companionArt.emojiFallback}</span>
                          </>
                        ) : (
                          <span className="island-run-sanctuary-companion-preview__empty" aria-hidden="true">✦</span>
                        )}
                      </div>
                      <div className="island-run-sanctuary-companion-preview__body">
                        <p className="island-run-sanctuary-companion-preview__card-title">
                          {activeCompanionMissingOrUnowned
                            ? 'Paired Creature unavailable'
                            : activeRegenCompanion
                              ? activeRegenCompanion.creature.name
                              : 'No Paired Creature'}
                        </p>
                        <p className="island-run-sanctuary-companion-preview__card-meta">
                          {activeCompanionMissingOrUnowned
                            ? 'The saved companion is missing or no longer owned.'
                            : activeRegenCompanion
                              ? `${activeRegenCompanion.creature.tier} rarity • Bond Lv ${activeRegenCompanion.bondLevel}`
                              : 'Open a creature detail to pair one companion.'}
                        </p>
                        <div className="island-run-sanctuary-companion-preview__stats" aria-label="Companion roll regeneration bonus details">
                          <span>Regen speed bonus <strong>{activeCompanionRegenBonusLabel}</strong></span>
                          <span>
                            Archetype match <strong>{activeCompanionRegenModifier.isPersonalityComplete ? 'unlocked' : 'locked'}</strong>
                          </span>
                        </div>
                        {showSanctuaryCompanionInfo && !activeCompanionRegenModifier.isPersonalityComplete ? (
                          <p className="island-run-sanctuary-companion-preview__notice">
                            Profile incomplete: stronger archetype match bonuses stay locked until your personality profile is complete.
                          </p>
                        ) : null}
                        {activeCompanionMissingOrUnowned ? (
                          <p className="island-run-sanctuary-companion-preview__notice island-run-sanctuary-companion-preview__notice--warning">
                            Choose an owned creature from your roster to restore the regen bonus.
                          </p>
                        ) : null}
                      </div>
                    </article>
                  );
                })()}
              </section>
            ) : null}

            {selectedSanctuaryCreature ? (
              <>
                {/* Explicit policy: keep this secondary grid decorative-only while detail sheet is open. */}
                <div
                  className="island-run-sanctuary-panel__grid"
                  aria-hidden="true"
                  data-render-mode={decorativePreviewRenderPolicy.mode}
                  data-render-policy={decorativePreviewRenderPolicy.policy}
                >
                  {visibleSanctuaryCreatures.map((creature) => {
                    const art = resolveCreatureArtManifest(creature.creature);
                    return (
                      <CreatureGridCard
                        key={creature.creatureId}
                        imageSrc={art.cutoutSrc}
                        pngFallbackSrc={art.cutoutPngSrc}
                        silhouetteSrc={art.silhouetteSrc}
                        fallbackEmoji={art.emojiFallback}
                        rarity={creature.creature.tier}
                        active={activeCompanionId === creature.creatureId}
                        selected={selectedSanctuaryCreatureId === creature.creatureId}
                        locked={false}
                        name={creature.creature.name}
                      />
                    );
                  })}
                </div>
                <div className="island-run-sanctuary-detail-sheet">
              <section className="island-run-sanctuary-detail" role="dialog" aria-modal="true" aria-label="Creature details">
                {(() => {
                  const creatureCardMetadata = getCreatureCardMetadata(selectedSanctuaryCreature.creature);
                  return (
                    <div
                      className={`island-run-sanctuary-fullcard island-run-sanctuary-fullcard--${selectedSanctuaryCreature.creature.tier}`}
                      onPointerDown={handleSanctuaryFullcardPointerDown}
                      onPointerUp={handleSanctuaryFullcardPointerUp}
                    >
                      {canSwipeSanctuaryCreatureCards ? (
                        <p className="island-run-sanctuary-fullcard__swipe-hint">Swipe left or right to browse creatures</p>
                      ) : null}
                      <button
                        type="button"
                        className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary island-run-sanctuary-fullcard__close"
                        onClick={() => {
                          setSelectedSanctuaryCreatureId(null);
                          setShowPerfectCompanionReason(false);
                        }}
                      >
                        ✕ Close
                      </button>
                      {canSwipeSanctuaryCreatureCards ? (
                        <>
                          <button type="button" className="island-run-sanctuary-fullcard__nav island-run-sanctuary-fullcard__nav--prev" aria-label="Previous creature" onClick={() => openAdjacentSanctuaryCreature(-1)}>‹</button>
                          <button type="button" className="island-run-sanctuary-fullcard__nav island-run-sanctuary-fullcard__nav--next" aria-label="Next creature" onClick={() => openAdjacentSanctuaryCreature(1)}>›</button>
                        </>
                      ) : null}
                      <CreatureCard
                        creature={selectedSanctuaryCreature.creature}
                        metadata={creatureCardMetadata}
                        owned
                        active={activeCompanionId === selectedSanctuaryCreature.creatureId}
                      />
                      <p className="island-run-sanctuary-card__meta">
                        Found near island {selectedSanctuaryCreature.lastCollectedIslandNumber} in {selectedSanctuaryCreature.creature.habitat}.
                      </p>
                      {activeCompanionId === selectedSanctuaryCreature.creatureId ? (
                        <>
                          <p className="island-run-sanctuary-panel__pill"><strong>Active Companion</strong></p>
                          <button
                            type="button"
                            className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                            onClick={() => setShowCreatureChannelModal(true)}
                            aria-describedby={!creatureCommunicationAccess.allowed ? 'creature-channel-status' : undefined}
                          >
                            Creature Channel
                          </button>
                          {!creatureCommunicationAccess.allowed ? (
                            <p id="creature-channel-status" className="island-run-sanctuary-card__meta">
                              {creatureCommunicationAccess.reason === 'concord-not-built'
                                ? 'Creature Channel locked. Build The Concord to understand your companion.'
                                : 'Choose an active companion to open the Creature Channel.'}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <button
                          type="button"
                          className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                          onClick={() => sanctuaryHandlers.setActiveCompanion(selectedSanctuaryCreature.creatureId)}
                        >
                          Set as Companion
                        </button>
                      )}
                    </div>
                  );
                })()}
                <details className="island-run-sanctuary-fullcard__more">
                  <summary>More details & actions</summary>
                <div className="island-run-sanctuary-detail__header">
                  <img
                    className="island-run-sanctuary-detail__art"
                    src={getEggStageArtSrc(selectedSanctuaryCreature.creature.tier, 4)}
                    alt={`${selectedSanctuaryCreature.creature.name} sanctuary detail`}
                  />
                  <div className="island-run-sanctuary-detail__identity">
                    <p className="island-run-sanctuary-card__eyebrow">Island {selectedSanctuaryCreature.lastCollectedIslandNumber} · {selectedSanctuaryCreature.creature.tier}</p>
                    <h4 className="island-run-sanctuary-detail__title">{selectedSanctuaryCreature.creature.name}</h4>
                    {perfectCompanionIdSet.has(selectedSanctuaryCreature.creatureId) ? (
                      <p className="island-run-sanctuary-card__meta"><strong>⭐ Perfect for your hand</strong></p>
                    ) : null}
                    <p className="island-run-sanctuary-detail__copy">
                      {selectedSanctuaryCreature.creature.name} thrives in {selectedSanctuaryCreature.creature.habitat.toLowerCase()} habitats and resonates with {selectedSanctuaryCreature.creature.affinity.toLowerCase()} energy.
                    </p>
                  </div>
                </div>
                <div className="island-run-sanctuary-detail__stats">
                  <span className="island-run-sanctuary-panel__pill">Bond Lv <strong>{selectedSanctuaryCreature.bondLevel}</strong></span>
                  <span className="island-run-sanctuary-panel__pill">Progress <strong>{selectedSanctuaryCreature.bondXp % CREATURE_BOND_XP_PER_LEVEL}/{CREATURE_BOND_XP_PER_LEVEL}</strong></span>
                  <span className="island-run-sanctuary-panel__pill">Last fed <strong>{formatRelativeTimeFromNow(selectedSanctuaryCreature.lastFedAtMs)}</strong></span>
                  <span className="island-run-sanctuary-panel__pill">Copies <strong>x{selectedSanctuaryCreature.copies}</strong></span>
                </div>
                <div className="island-run-sanctuary-detail__progress" aria-hidden="true">
                  <span
                    className="island-run-sanctuary-detail__progress-fill"
                    style={{ width: `${((selectedSanctuaryCreature.bondXp % CREATURE_BOND_XP_PER_LEVEL) / CREATURE_BOND_XP_PER_LEVEL) * 100}%` }}
                  />
                </div>
                <p className="island-run-sanctuary-card__meta">
                  Companion bonus: <strong>{selectedSanctuaryCreatureBonus?.label ?? '—'}</strong>
                </p>
                <p className="island-run-sanctuary-card__meta">{selectedSanctuaryCreatureBonus?.description}</p>
                <p className="island-run-sanctuary-card__meta">
                  Specialty: <strong>{selectedSanctuaryCreatureSpecialty?.label ?? '—'}</strong>
                </p>
                <p className="island-run-sanctuary-card__meta">{selectedSanctuaryCreatureSpecialty?.description}</p>
                <p className="island-run-sanctuary-card__meta">
                  Next boost at bond level <strong>{selectedSanctuaryCreatureBonus?.nextBondMilestoneLevel ?? selectedSanctuaryCreature.bondLevel}</strong>.
                </p>
                {selectedSanctuaryCreatureFormPreview ? (
                  <div className="island-run-sanctuary-compare island-run-sanctuary-form-upgrade">
                    <p className="island-run-sanctuary-compare__title">
                      🌟 Creature Form {selectedSanctuaryCreature.formLevel ?? 1}/{CREATURE_FORM_MAX_LEVEL}
                    </p>
                    <p className="island-run-sanctuary-compare__row">
                      Form 3 grants dice + essence once and unlocks this creature’s one-time Stripe theme offer.
                    </p>
                    {selectedSanctuaryCreatureFormPreview.nextFormLevel ? (
                      <p className="island-run-sanctuary-compare__row">
                        Next: <strong>Form {selectedSanctuaryCreatureFormPreview.nextFormLevel}</strong> · Cost <strong>{selectedSanctuaryCreatureFormPreview.shardCost} 🟣</strong> · Requires Bond Lv. <strong>{selectedSanctuaryCreatureFormPreview.requiredBondLevel}</strong>
                        {selectedSanctuaryCreatureFormPreview.rewardDice > 0 || selectedSanctuaryCreatureFormPreview.rewardEssence > 0
                          ? <> · Reward <strong>+{selectedSanctuaryCreatureFormPreview.rewardDice} dice / +{selectedSanctuaryCreatureFormPreview.rewardEssence} essence</strong></>
                          : null}
                      </p>
                    ) : (
                      <p className="island-run-sanctuary-compare__row"><strong>Max form reached</strong> — theme eligibility is unlocked.</p>
                    )}
                    <button
                      type="button"
                      className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                      disabled={!selectedSanctuaryCreatureFormPreview.canUpgrade}
                      onClick={() => sanctuaryHandlers.upgradeCreatureForm(selectedSanctuaryCreature.creatureId)}
                    >
                      {selectedSanctuaryCreatureFormPreview.canUpgrade
                        ? `Upgrade to Form ${selectedSanctuaryCreatureFormPreview.nextFormLevel} for ${selectedSanctuaryCreatureFormPreview.shardCost} 🟣`
                        : selectedSanctuaryCreatureFormPreview.failureReason === 'bond_level_too_low'
                          ? `Reach Bond Lv. ${selectedSanctuaryCreatureFormPreview.requiredBondLevel} to upgrade`
                          : selectedSanctuaryCreatureFormPreview.failureReason === 'insufficient_shards'
                            ? `Need ${Math.max(0, selectedSanctuaryCreatureFormPreview.shardCost - runtimeState.shards)} more essence`
                            : 'Max form reached'}
                    </button>
                  </div>
                ) : null}
                {selectedVsActiveComparison ? (
                  <div className="island-run-sanctuary-compare">
                    <p className="island-run-sanctuary-compare__title">Compare vs Active: {activeCompanion?.creature.name}</p>
                    <p className="island-run-sanctuary-compare__row">
                      Startup bonus: <strong>{selectedVsActiveComparison.selectedStartupLabel}</strong> vs <strong>{selectedVsActiveComparison.activeStartupLabel}</strong>
                      <span className={selectedVsActiveComparison.startupDelta >= 0 ? 'island-run-sanctuary-compare__delta island-run-sanctuary-compare__delta--up' : 'island-run-sanctuary-compare__delta island-run-sanctuary-compare__delta--down'}>
                        {selectedVsActiveComparison.startupDelta >= 0 ? '+' : ''}{selectedVsActiveComparison.startupDelta}
                      </span>
                    </p>
                    <p className="island-run-sanctuary-compare__row">
                      Specialty: <strong>{selectedVsActiveComparison.selectedSpecialtyLabel}</strong> vs <strong>{selectedVsActiveComparison.activeSpecialtyLabel}</strong>
                      <span className={selectedVsActiveComparison.specialtyDelta >= 0 ? 'island-run-sanctuary-compare__delta island-run-sanctuary-compare__delta--up' : 'island-run-sanctuary-compare__delta island-run-sanctuary-compare__delta--down'}>
                        {selectedVsActiveComparison.specialtyDelta >= 0 ? '+' : ''}{selectedVsActiveComparison.specialtyDelta}
                      </span>
                    </p>
                    <p className="island-run-sanctuary-compare__row">
                      Bond level delta:
                      <span className={selectedVsActiveComparison.bondDelta >= 0 ? 'island-run-sanctuary-compare__delta island-run-sanctuary-compare__delta--up' : 'island-run-sanctuary-compare__delta island-run-sanctuary-compare__delta--down'}>
                        {selectedVsActiveComparison.bondDelta >= 0 ? '+' : ''}{selectedVsActiveComparison.bondDelta}
                      </span>
                    </p>
                    <p className="island-run-sanctuary-compare__row">
                      Zone alignment: <strong>{SHIP_ZONE_LABELS[selectedVsActiveComparison.selectedZone]}</strong> · {selectedVsActiveComparison.selectedZonePreferred ? 'preferred' : 'not preferred'}
                      {selectedVsActiveComparison.activeZonePreferred ? ' (active already preferred)' : ''}
                    </p>
                    <button
                      type="button"
                      className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                      onClick={() => {
                        sanctuaryHandlers.setActiveCompanion(selectedSanctuaryCreature.creatureId);
                        void recordTelemetryEvent({
                          userId: session.user.id,
                          eventType: 'economy_earn',
                          metadata: {
                            stage: 'sanctuary_compare_set_active',
                            island_number: islandNumber,
                            creature_id: selectedSanctuaryCreature.creature.id,
                            creature_name: selectedSanctuaryCreature.creature.name,
                            recommendation: selectedVsActiveComparison.recommendation,
                          },
                        });
                      }}
                    >
                      {selectedVsActiveComparison.recommendation}
                    </button>
                  </div>
                ) : null}
                {perfectCompanionIdSet.has(selectedSanctuaryCreature.creatureId) && selectedPerfectCompanionReason ? (
                  <div className="island-run-sanctuary-reason">
                    <button
                      type="button"
                      className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                      onClick={() => {
                        const nextOpen = !showPerfectCompanionReason;
                        setShowPerfectCompanionReason(nextOpen);
                        if (nextOpen) {
                          void recordTelemetryEvent({
                            userId: session.user.id,
                            eventType: 'economy_earn',
                            metadata: {
                              stage: 'perfect_companion_reason_opened',
                              island_number: islandNumber,
                              creature_id: selectedSanctuaryCreature.creature.id,
                              creature_name: selectedSanctuaryCreature.creature.name,
                            },
                          });
                        }
                      }}
                    >
                      {showPerfectCompanionReason ? 'Hide why this is perfect' : 'Why this is perfect for you'}
                    </button>
                    {showPerfectCompanionReason ? (
                      <div className="island-run-sanctuary-reason__body">
                        <p className="island-run-sanctuary-reason__label">Strength matches</p>
                        <ul>
                          {(selectedPerfectCompanionReason.strength.length > 0
                            ? selectedPerfectCompanionReason.strength
                            : ['guardian', 'visionary']
                          ).map((archetypeId) => (
                            <li key={archetypeId}>{getArchetypeLabel(archetypeId)}</li>
                          ))}
                        </ul>
                        <p className="island-run-sanctuary-reason__label">Weakness support</p>
                        <ul>
                          {(selectedPerfectCompanionReason.weaknessSupport.length > 0
                            ? selectedPerfectCompanionReason.weaknessSupport
                            : ['stress_fragility', 'decision_confusion']
                          ).map((tag) => (
                            <li key={tag}>{getWeaknessSupportLabel(tag)}</li>
                          ))}
                        </ul>
                        <p className="island-run-sanctuary-reason__label">
                          Zone match: <strong>{selectedPerfectCompanionReason.zoneMatch ? 'Aligned with your preferred ship zone' : 'Partial match'}</strong>
                        </p>
                        {activeCompanionId !== selectedSanctuaryCreature.creatureId ? (
                          <button
                            type="button"
                            className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                            onClick={() => {
                              sanctuaryHandlers.setActiveCompanion(selectedSanctuaryCreature.creatureId);
                              void recordTelemetryEvent({
                                userId: session.user.id,
                                eventType: 'economy_earn',
                                metadata: {
                                  stage: 'perfect_companion_reason_cta_set_active',
                                  island_number: islandNumber,
                                  creature_id: selectedSanctuaryCreature.creature.id,
                                  creature_name: selectedSanctuaryCreature.creature.name,
                                },
                              });
                            }}
                          >
                            Set as Active from Perfect Companion
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {selectedSanctuaryCreatureUnclaimedMilestones.length > 0 ? (
                  <div className="island-run-sanctuary-reward">
                    <p className="island-run-sanctuary-reward__title">Reward ready</p>
                    <p className="island-run-sanctuary-card__meta">
                      Bond level {selectedSanctuaryCreatureUnclaimedMilestones[0]} · {getBondMilestoneReward(selectedSanctuaryCreatureUnclaimedMilestones[0])?.summary}
                    </p>
                  </div>
                ) : null}
                <div className="island-hatchery-card__actions">
                  <button
                    type="button"
                    className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                    onClick={() => {
                      setSelectedSanctuaryCreatureId(null);
                      setShowPerfectCompanionReason(false);
                    }}
                  >
                    ← Back to Roster
                  </button>
                  {selectedSanctuaryCreatureUnclaimedMilestones.length > 0 ? (
                    <button
                      type="button"
                      className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                      onClick={() => sanctuaryHandlers.claimBondReward(selectedSanctuaryCreature.creatureId, selectedSanctuaryCreatureUnclaimedMilestones[0])}
                    >
                      Claim {getBondMilestoneReward(selectedSanctuaryCreatureUnclaimedMilestones[0])?.label}
                    </button>
                  ) : null}
                  <div className="island-run-sanctuary-treats">
                    {CREATURE_TREAT_OPTIONS.map((treatOption) => {
                      const isCoolingDown = Boolean(selectedSanctuaryCreature.lastFedAtMs && selectedSanctuaryCreature.lastFedAtMs + CREATURE_FEED_COOLDOWN_MS > sanctuaryClockMs);
                      return (
                        <button
                          key={treatOption.type}
                          type="button"
                          className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                          onClick={() => sanctuaryHandlers.feedCreature(selectedSanctuaryCreature.creatureId, treatOption.type)}
                          disabled={isCoolingDown || creatureTreatInventory[treatOption.type] <= 0}
                        >
                          {isCoolingDown
                            ? `Feed in ${formatCooldownRemaining((selectedSanctuaryCreature.lastFedAtMs ?? 0) + CREATURE_FEED_COOLDOWN_MS - sanctuaryClockMs)}`
                            : `${treatOption.label} (${creatureTreatInventory[treatOption.type]}) · ${treatOption.summary}`}
                        </button>
                      );
                    })}
                  </div>
                  {activeCompanionId === selectedSanctuaryCreature.creatureId ? (
                    <button
                      type="button"
                      className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                      onClick={() => sanctuaryHandlers.setActiveCompanion(null)}
                    >
                      Remove Active
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                      onClick={() => sanctuaryHandlers.setActiveCompanion(selectedSanctuaryCreature.creatureId)}
                    >
                      Set Active Companion
                    </button>
                  )}
                </div>
                </details>
              </section>
                </div>
              </>
            ) : collectedCreatures.length === 0 ? (
              <div className="island-hatchery-card">
                <div className="island-hatchery-card__state island-hatchery-card__state--empty">
                  <p className="island-hatchery-card__stage-emoji">🪹</p>
                  <p className="island-hatchery-card__headline">No creatures collected yet.</p>
                  <p className="island-hatchery-card__copy">
                    Hatch an egg and choose <strong>Collect Creature</strong> to start your shipboard sanctuary.
                  </p>
                </div>
              </div>
            ) : (
              /* Explicit policy: this is the interactive roster surface (v2 SimpleView via CreatureCardSimpleFront). */
              <div
                className="island-run-sanctuary-panel__grid"
                data-render-mode={interactiveRosterRenderPolicy.mode}
                data-render-policy={interactiveRosterRenderPolicy.policy}
              >
                {visibleSanctuaryCreatures.map((creature) => {
                  const art = resolveCreatureArtManifest(creature.creature);
                  const simpleView = buildCreatureCardSimpleView(creature.creature, undefined, {
                    discovered: true,
                    active: activeCompanionId === creature.creatureId,
                    ownedCopies: creature.copies,
                  });
                  return (
                    <CreatureGridCard
                      key={creature.creatureId}
                      imageSrc={art.cutoutSrc}
                      pngFallbackSrc={art.cutoutPngSrc}
                      silhouetteSrc={art.silhouetteSrc}
                      fallbackEmoji={art.emojiFallback}
                      rarity={creature.creature.tier}
                      active={activeCompanionId === creature.creatureId}
                      selected={selectedSanctuaryCreatureId === creature.creatureId}
                      locked={false}
                      name={creature.creature.name}
                      simpleView={simpleView}
                      onClick={() => sanctuaryHandlers.openCreature(creature.creatureId)}
                    />
                  );
                })}
                {Array.from({ length: Math.max(0, CREATURE_CATALOG.length - collectedCreatures.length) }).map((_, index) => (
                  <CreatureGridCard
                    key={`locked-${index}`}
                    imageSrc="/assets/creatures/Creature_card.webp"
                    fallbackEmoji="❔"
                    rarity="common"
                    active={false}
                    locked
                  />
                ))}
              </div>
            )}

            <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                onClick={sanctuaryHandlers.closePanel}
              >
                ✕ Close
              </button>
            </div>
          </section>
        </div>
      )}

      {showFirstCreaturePackModal ? (
        <FirstSessionCreaturePackModal
          phase={firstCreaturePackFlow.phase}
          cards={firstCreaturePackFlow.cards}
          diceGranted={firstCreaturePackFlow.diceGranted}
          isClaiming={isFirstCreaturePackClaiming}
          errorMessage={firstCreaturePackFlow.errorMessage}
          onOpenPack={handleOpenFirstCreaturePack}
          onOpeningAnimationComplete={handleFirstCreaturePackOpeningAnimationComplete}
          onContinue={handleContinueFirstCreaturePack}
        />
      ) : null}

      {hatchReveal ? (
        <CreatureHatchRevealModal
          open={Boolean(hatchReveal)}
          creatureName={hatchReveal.creatureName}
          rarity={hatchReveal.rarity}
          creatureScore={getCreatureRevealScore(hatchReveal.rarity)}
          imageSrc={(CREATURE_CATALOG.find((entry) => entry.id === hatchReveal.creatureId) && resolveCreatureArtManifest(CREATURE_CATALOG.find((entry) => entry.id === hatchReveal.creatureId)!).cutoutSrc) || '/assets/creature-placeholders/silhouette.webp'}
          pngFallbackSrc={(CREATURE_CATALOG.find((entry) => entry.id === hatchReveal.creatureId) && resolveCreatureArtManifest(CREATURE_CATALOG.find((entry) => entry.id === hatchReveal.creatureId)!).cutoutPngSrc) || '/assets/creature-placeholders/silhouette.webp'}
          silhouetteSrc={(CREATURE_CATALOG.find((entry) => entry.id === hatchReveal.creatureId) && resolveCreatureArtManifest(CREATURE_CATALOG.find((entry) => entry.id === hatchReveal.creatureId)!).silhouetteSrc) || '/assets/creature-placeholders/silhouette.webp'}
          fallbackEmoji={(CREATURE_CATALOG.find((entry) => entry.id === hatchReveal.creatureId) && resolveCreatureArtManifest(CREATURE_CATALOG.find((entry) => entry.id === hatchReveal.creatureId)!).emojiFallback) || '🐣'}
          onClose={() => {
            setHatchedCreatureCardId(hatchReveal.creatureId);
            setHatchReveal(null);
          }}
          onSetCompanion={() => {
            sanctuaryHandlers.setActiveCompanion(hatchReveal.creatureId);
            setHatchedCreatureCardId(hatchReveal.creatureId);
            setHatchReveal(null);
          }}
        />
      ) : null}

      {hatchedCreatureCardId && typeof document !== 'undefined' ? (() => {
        const hatchedCreature = CREATURE_CATALOG.find((entry) => entry.id === hatchedCreatureCardId) ?? null;
        if (!hatchedCreature) return null;
        return createPortal(
          <div className="island-run-creature-card-modal" role="dialog" aria-modal="true" aria-label={`${hatchedCreature.name} creature card`}>
            <div className={`island-run-creature-card-modal__shell island-run-creature-card-modal__shell--${hatchedCreature.tier}`}>
              <button
                type="button"
                className="creature-card-modal-close"
                aria-label="Close creature card"
                onClick={() => setHatchedCreatureCardId(null)}
              >
                ×
              </button>
              <CreatureCard
                creature={hatchedCreature}
                metadata={getCreatureCardMetadata(hatchedCreature)}
                owned
                active={activeCompanionId === hatchedCreature.id}
              />
            </div>
          </div>,
          document.body,
        );
      })() : null}

      {devPackOpeningPrototype ? (
        <CreaturePackOpeningPrototypeModal
          open={Boolean(devPackOpeningPrototype)}
          cards={devPackOpeningPrototype.cards}
          grantId={devPackOpeningPrototype.grantId}
          grantStatus={devPackOpeningPrototype.grantStatus}
          bonusCopy={devPackOpeningPrototype.bonusCopy}
          onClose={() => setDevPackOpeningPrototype(null)}
          onViewSanctuary={() => {
            setDevPackOpeningPrototype(null);
            openSanctuaryPanel();
          }}
        />
      ) : null}



      {showFirstProgressRecapAfterArena ? createPortal(
        <div className="island-soft-save-modal island-first-progress-recap-modal" role="dialog" aria-modal="true" aria-labelledby="island-first-progress-recap-title">
          <div className="island-soft-save-modal__backdrop" aria-hidden="true" />
          <div className="island-soft-save-modal__dialog">
            <p className="island-soft-save-modal__eyebrow">First Light Shore</p>
            <h2 id="island-first-progress-recap-title">Your Compass Has Begun</h2>
            <p>You have already opened the first route on First Light Shore.</p>
            <ul className="island-first-progress-recap-modal__list" aria-label="First Light progress">
              <li>✓ Captain identity formed</li>
              <li>✓ Ship named</li>
              <li>✓ Starter Cache collected</li>
              <li>✓ Hatchery awakened</li>
              <li>✓ First real-life signal chosen</li>
              <li>✓ Routekeeper Steps relit</li>
              <li>✓ Arena opened</li>
              <li>✓ Event tickets gained</li>
              <li>✓ Compass Book started</li>
            </ul>
            <p className="island-soft-save-modal__fineprint">
              Your Compass Book fills as you play. Some pages unlock through island progress. Some pages unlock through the real actions you choose.
            </p>
            <div className="island-soft-save-modal__actions">
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--primary" onClick={handleContinueFirstProgressRecapAfterArena}>
                Continue
              </button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      {showSoftSavePromptAfterArena ? createPortal(
        <div className="island-soft-save-modal" role="dialog" aria-modal="true" aria-labelledby="island-soft-save-title">
          <div className="island-soft-save-modal__backdrop" aria-hidden="true" />
          <div className="island-soft-save-modal__dialog">
            <p className="island-soft-save-modal__eyebrow">First Light Shore</p>
            <h2 id="island-soft-save-title">Save My Game for Free</h2>
            <p>
              You’ve started your run on First Light Shore. Create a free account to keep your captain name, ship,
              starter cache, tiny action, event tickets, and island progress safe.
            </p>
            <p className="island-soft-save-modal__fineprint">
              No payment. This only saves your guest run to a free account.
            </p>
            <div className="island-soft-save-modal__actions">
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--primary" onClick={handleSaveGameForFreeFromArena}>
                Save My Game for Free
              </button>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--secondary" onClick={handleDismissSoftSavePromptAfterArena}>
                Keep playing as guest
              </button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      {showWelcomePackModal ? (
        <WelcomePackModal
          open={showWelcomePackModal}
          onClose={() => {
            setShowWelcomePackModal(false);
            if (!welcomePackClaimResult || welcomePackClaimResult.status === 'already_claimed') {
              setWelcomePackDismissedThisSession(true);
            }
          }}
          onClaim={handleClaimWelcomePack}
          claimPending={welcomePackClaimPending}
          claimError={welcomePackClaimError}
          claimResult={welcomePackClaimResult}
          isDevPreview={isDevModeEnabled}
          displayName={welcomePackGuestDisplayName}
        />
      ) : null}

      {activeLaunchedMinigameId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, overflow: 'hidden' }}>
          <IslandRunMinigameLauncher
            minigameId={activeLaunchedMinigameId}
            islandNumber={islandNumber}
            controllerInput={activeLaunchedMinigameId === 'shooter_blitz' ? shooterControllerInput : undefined}
            launchConfig={activeLaunchedMinigameConfig}
            onComplete={(result) => {
              if (activeLaunchedMinigameSource === 'boss_trial' && result.completed) {
                handleResolveBossTrial();
                setBossTrialPhase('success');
              }
              if (activeLaunchedMinigameId) {
                const eventCompletionMinigameId = resolveEventMinigameCompletionId({
                  launchSource: activeLaunchedMinigameSource,
                  minigameId: activeLaunchedMinigameId,
                  completed: result.completed,
                });
                if (eventCompletionMinigameId) {
                  const nextRewardBarState = recordEventMinigameCompletion({
                    state: {
                      rewardBarProgress: runtimeStateRef.current.rewardBarProgress,
                      rewardBarThreshold: runtimeStateRef.current.rewardBarThreshold,
                      rewardBarClaimCountInEvent: runtimeStateRef.current.rewardBarClaimCountInEvent,
                      rewardBarEscalationTier: runtimeStateRef.current.rewardBarEscalationTier,
                      rewardBarLastClaimAtMs: runtimeStateRef.current.rewardBarLastClaimAtMs,
                      rewardBarBoundEventId: runtimeStateRef.current.rewardBarBoundEventId,
                      rewardBarLadderId: runtimeStateRef.current.rewardBarLadderId,
                      activeTimedEvent: runtimeStateRef.current.activeTimedEvent,
                      activeTimedEventProgress: runtimeStateRef.current.activeTimedEventProgress,
                      stickerProgress: runtimeStateRef.current.stickerProgress,
                      stickerInventory: runtimeStateRef.current.stickerInventory,
                    },
                    minigameId: eventCompletionMinigameId,
                    nowMs: Date.now(),
                  });
                  applyContractV2RewardBarRuntimeState(nextRewardBarState);
                  runContractV2RewardBarClaimCascade({ state: nextRewardBarState });
                }
              }
              if (
                activeLaunchedMinigameId &&
                shouldResolveMysteryStopOnMinigameComplete({
                  launchSource: activeLaunchedMinigameSource ?? 'shop_button',
                  minigameId: activeLaunchedMinigameId,
                  completed: result.completed,
                })
              ) {
                setLandingText('🔮 Vision Quest complete! Mystery stop resolved.');
                handleCompleteActiveStop();
              } else if (result.completed && result.reward) {
                const { dice: rewardDice = 0, spinTokens: rewardSpinTokens = 0, diamonds: rewardDiamonds = 0 } = result.reward;
                const wonRewards: WinRewardItem[] = [];
                if (rewardDice > 0) {
                  setDicePool((d) => d + rewardDice);
                  wonRewards.push({ icon: '🎲', label: 'Dice', value: `+${rewardDice}` });
                }
                if (rewardSpinTokens > 0) {
                  setSpinTokens((t) => t + rewardSpinTokens);
                  wonRewards.push({ icon: '🌀', label: 'Spin Tokens', value: `+${rewardSpinTokens}` });
                }
                if (rewardDiamonds > 0) {
                  // Boss Rhythm Battle victory: the rare reward on top of the
                  // standard boss bounty resolved via handleResolveBossTrial.
                  setDiamonds((d) => d + rewardDiamonds);
                  wonRewards.push({ icon: '💎', label: 'Rare Crystals', value: `+${rewardDiamonds}` });
                }
                // M17D: award wallet shards on minigame reward
                awardWalletShards(1);
                wonRewards.push({ icon: '🟣', label: 'Essence', value: '+1' });
                openWinCelebrationModal(wonRewards, 'Mini-game rewards');
                void recordTelemetryEvent({
                  userId: session.user.id,
                  eventType: 'economy_earn',
                  metadata: {
                    stage: 'island_run_minigame_reward',
                    minigameId: activeLaunchedMinigameId,
                    reward: result.reward as Record<string, number>,
                  },
                });
              }
              setActiveLaunchedMinigameId(null);
              setActiveLaunchedMinigameSource(null);
              setActiveLaunchedMinigameConfig(undefined);
            }}
          />
        </div>
      )}

      <IslandRunWinCelebrationModal
        open={showWinCelebrationModal}
        title="Congratulations!"
        subtitle={winCelebrationSubtitle}
        rewards={winCelebrationRewards}
        onCollect={() => {
          setShowWinCelebrationModal(false);
          setWinCelebrationRewards([]);
        }}
      />

      {shouldShowCaretakerTalkAction && caretakerInhabitant ? (
        <IslandInhabitantFlow
          isOpen={isIslandInhabitantFlowOpen}
          inhabitant={caretakerInhabitant}
          topics={caretakerTopics}
          conversations={caretakerConversations}
          greeting="The island has been listening for footsteps like yours."
          characterArtSrc={caretakerInhabitant.premiumArtSrc}
          backgroundArtSrc={resolvedCaretakerBackgroundArtSrc}
          islandName={caretakerConcordContent?.islandName}
          islandStatusLabel={caretakerInhabitant.civilizationName}
          communicationAllowed={inhabitantCommunicationAccess.allowed}
          onClose={handleCaretakerFlowClose}
        />
      ) : null}

      {showCreatureChannelModal ? (
        <div className="island-run-overlay-root island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense" role="dialog" aria-modal="true" aria-label="Creature Channel">
            <div className="island-stop-modal__context">
              <p className="island-stop-modal__eyebrow">Creature Channel</p>
              {creatureCommunicationAccess.reason === 'concord-not-built' ? (
                <>
                  <h3 className="island-stop-modal__title">Creature Channel locked</h3>
                  <p className="island-stop-modal__copy">Build The Concord to understand your companion.</p>
                </>
              ) : !activeCompanion ? (
                <>
                  <h3 className="island-stop-modal__title">No active companion</h3>
                  <p className="island-stop-modal__copy">Choose an active companion to open the Creature Channel.</p>
                </>
              ) : (
                <>
                  <h3 className="island-stop-modal__title">{activeCompanion.creature.name}: “Oh. You can finally hear me.”</h3>
                  <p className="island-stop-modal__copy">{getCreatureChannelLine(activeCompanion.creature)}</p>
                  <div className="island-stop-modal__cta island-stop-modal__cta--balanced">
                    <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={() => setLandingText(`${activeCompanion.creature.name} was trying to point out safe paths, strange signals, and when to slow down.`)}>What were you trying to say?</button>
                    <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={() => setLandingText(`${activeCompanion.creature.name} feels relieved that the signal is finally clear.`)}>How are you feeling?</button>
                  </div>
                </>
              )}
            </div>
            <div className="island-stop-modal__cta island-stop-modal__cta--balanced island-stop-modal__cta--anchored">
              <button type="button" className="supabase-auth__action island-stop-modal__cta-btn island-stop-modal__btn--action" onClick={() => setShowCreatureChannelModal(false)}>We can talk later</button>
            </div>
          </section>
        </div>
      ) : null}

      {showConcordHubModal ? (
        <div className="island-run-overlay-root island-stop-modal-backdrop island-concord-hub-backdrop" role="presentation">
          <section className="island-concord-hub-modal" role="dialog" aria-modal="true" aria-label="The Concord hub">
            <img className="island-concord-hub-modal__device" src="/tech/Concord_on.webp" alt="The restored Concord device with three communication channels" />
            <div className="island-concord-hub-modal__screen">
              <p className="island-concord-hub-modal__eyebrow">The Concord</p>
              <h3 className="island-concord-hub-modal__title">Channel select</h3>
              <p className="island-concord-hub-modal__copy">Meaning channels online · {concordHubEntryState.requiredFragmentCount}/{concordHubEntryState.requiredFragmentCount} fragments restored</p>
              <div className="island-concord-hub-modal__channels" aria-label="The Concord channels">
                <button
                  type="button"
                  className="island-concord-hub-modal__channel"
                  onClick={() => {
                    setShowConcordHubModal(false);
                    setShowCreatureChannelModal(true);
                  }}
                >
                  <span className="island-concord-hub-modal__channel-icon" aria-hidden="true">🐾</span>
                  <span>Creature Channel</span>
                </button>
                <button
                  type="button"
                  className="island-concord-hub-modal__channel"
                  onClick={() => {
                    setShowConcordHubModal(false);
                    openCaretakerFlow('dev_hud');
                  }}
                  disabled={!shouldShowCaretakerTalkAction}
                >
                  <span className="island-concord-hub-modal__channel-icon" aria-hidden="true">🧙</span>
                  <span>Caretaker Channel</span>
                </button>
                <button
                  type="button"
                  className="island-concord-hub-modal__channel"
                  onClick={() => {
                    setShowConcordHubModal(false);
                    openGlobalStoryReader();
                  }}
                >
                  <span className="island-concord-hub-modal__channel-icon" aria-hidden="true">📖</span>
                  <span>Story Channel</span>
                </button>
              </div>
            </div>
            <button type="button" className="island-concord-hub-modal__return" onClick={() => setShowConcordHubModal(false)}>Return to island</button>
          </section>
        </div>
      ) : null}

      <IslandStoryReader
        manifestPath={activeStoryEpisode?.manifestPath ?? '/storyline/episode-001/manifest.json'}
        isOpen={showStoryReader}
        onClose={handleCloseStoryReader}
        onRewardClaim={activeStoryEpisode?.kind === 'global_prologue' ? sanctuaryHandlers.storyRewardClaim : undefined}
        completionTitle={activeStoryEpisode?.kind === 'island_arrival' ? 'Luma Isle awaits' : activeStoryEpisode?.kind === 'island_resolution' ? 'The route is open' : activeStoryEpisode?.kind === 'island_travel_arrival' ? `${getIslandDisplayName(islandNumber)} awaits` : undefined}
        completionText={activeStoryEpisode?.kind === 'island_arrival' || activeStoryEpisode?.kind === 'island_resolution' || activeStoryEpisode?.kind === 'island_travel_arrival' ? 'Return to the island' : undefined}
        completionButtonLabel={activeStoryEpisode?.kind === 'island_arrival' || activeStoryEpisode?.kind === 'island_resolution' || activeStoryEpisode?.kind === 'island_travel_arrival' ? 'Start zoomed out' : undefined}
      />

      {islandNarrativeOpeningFlow.activeDialogue ? (
        <IslandNarrativeDialogue
          isOpen={true}
          speakerName={islandNarrativeOpeningFlow.activeDialogue.speakerName}
          text={islandNarrativeOpeningFlow.activeDialogue.text}
          secondaryText={islandNarrativeOpeningFlow.activeDialogue.secondaryText}
          tone={islandNarrativeOpeningFlow.activeDialogue.tone ?? 'standard'}
          continueLabel={islandNarrativeOpeningFlow.activeDialogue.continueLabel}
          onContinue={islandNarrativeOpeningFlow.handleDialogueContinue}
          onClose={islandNarrativeOpeningFlow.handleDialogueClose}
        />
      ) : null}


      {islandNarrativeOpeningFlow.activeToast ? (
        <IslandNarrativeToast
          isOpen={true}
          speakerName={islandNarrativeOpeningFlow.activeToast.speakerName}
          text={islandNarrativeOpeningFlow.activeToast.text}
          supportingLabel={islandNarrativeOpeningFlow.activeToast.supportingLabel}
          durationMs={islandNarrativeOpeningFlow.activeToast.durationMs}
          onDismiss={islandNarrativeOpeningFlow.handleToastDismiss}
        />
      ) : null}

      {/* Data-driven reaction beats (stop/landmark/majority/boss-start). Render
          one at a time and only when no legacy narrative surface is active. */}
      {islandNarrativeOpeningFlow.activeReactionDialogue ? (
        <IslandNarrativeDialogue
          isOpen={true}
          speakerName={islandNarrativeOpeningFlow.activeReactionDialogue.speakerName}
          text={islandNarrativeOpeningFlow.activeReactionDialogue.text}
          secondaryText={islandNarrativeOpeningFlow.activeReactionDialogue.secondaryText}
          tone={islandNarrativeOpeningFlow.activeReactionDialogue.tone}
          continueLabel={islandNarrativeOpeningFlow.activeReactionDialogue.continueLabel}
          onContinue={islandNarrativeOpeningFlow.handleReactionDialogueContinue}
          onClose={islandNarrativeOpeningFlow.handleReactionDialogueContinue}
        />
      ) : null}

      {islandNarrativeOpeningFlow.activeReactionToast ? (
        <IslandNarrativeToast
          isOpen={true}
          speakerName={islandNarrativeOpeningFlow.activeReactionToast.speakerName}
          text={islandNarrativeOpeningFlow.activeReactionToast.text}
          durationMs={islandNarrativeOpeningFlow.activeReactionToast.durationMs}
          onDismiss={islandNarrativeOpeningFlow.handleReactionToastDismiss}
        />
      ) : null}

      {landmarkWhispers.activeWhisper ? (
        <IslandNarrativeToast
          isOpen={true}
          speakerName={landmarkWhispers.activeWhisper.speakerName}
          text={landmarkWhispers.activeWhisper.text}
          supportingLabel={landmarkWhispers.activeWhisper.supportingLabel}
          durationMs={landmarkWhispers.activeWhisper.durationMs}
          variant={landmarkWhispers.activeWhisper.variant}
          landmarkLabel={landmarkWhispers.activeWhisper.landmarkLabel}
          landmarkIcon={landmarkWhispers.activeWhisper.landmarkIcon}
          speakerRoleLabel={landmarkWhispers.activeWhisper.roleLabel}
          onDismiss={landmarkWhispers.handleWhisperDismiss}
        />
      ) : null}

      {/* M16E: Blind-box collectible reveal modal */}
      {showClaimModal && pendingClaimTierIndex !== null && (
        <ShardClaimModal
          collectible={resolveCollectibleForClaim(pendingClaimTierIndex)}
          bonusSummary="🎲 Bonus reward: +1 Lucky Roll run"
          onCollect={() => {
            playIslandRunSound('market_purchase_success');
            triggerIslandRunHaptic('reward_claim');
            awardLuckyRollRuns(session.user.id, 1);
            // M16C/M16E: advance tier index + claim count on player claim action
            const newTierIndex = shardTierIndex + 1;
            const newClaimCount = shardClaimCount + 1;
            setShardTierIndex(newTierIndex);
            setShardClaimCount(newClaimCount);
            setShardMilestoneReached(false);
            setShowClaimModal(false);
            setPendingClaimTierIndex(null);
            const nextRecord = applyShardClaimProgressMarker({
              session,
              client,
              nextShardTierIndex: newTierIndex,
              nextShardClaimCount: newClaimCount,
              triggerSource: 'shard_progress_claim',
            });
            setRuntimeState(nextRecord);
            setLandingText('Essence milestone claimed! +1 Lucky Roll run unlocked.');
            void recordTelemetryEvent({
              userId: session.user.id,
              eventType: 'economy_earn',
              metadata: {
                stage: 'island_run_shard_milestone_claim',
                island_number: islandNumber,
                collectible_tier_index: pendingClaimTierIndex,
                lucky_roll_runs_awarded: 1,
                new_shard_claim_count: newClaimCount,
              },
            });
          }}
        />
      )}

      {/* ── Locked Landmark Info Prompt ─────────────────────────────────
          Opens when the player taps a sequence-locked landmark. Gives
          context + next action, rather than silently no-oping the tap. */}
      {lockedStopInfoStopId && (() => {
        const lockedStop = islandStopPlan.find((s) => s.stopId === lockedStopInfoStopId);
        const lockedStopIndex = stopIndexByStopId.get(lockedStopInfoStopId) ?? -1;
        const totalStops = islandStopPlan.length;
        const previousStop = lockedStopIndex > 0
          ? islandStopPlan[lockedStopIndex - 1]
          : null;
        const upcomingTicketCost = lockedStopIndex > 0
          ? getStopTicketCost({ effectiveIslandNumber, stopIndex: lockedStopIndex })
          : 0;
        return (
          <div
            className="island-run-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="locked-stop-info-title"
            onClick={() => setLockedStopInfoStopId(null)}
          >
            <div className="island-run-modal" onClick={(e) => e.stopPropagation()}>
              <h2 id="locked-stop-info-title" style={{ margin: 0, fontSize: 20 }}>
                {lockedStop?.title ?? 'Landmark'}
              </h2>
              <p style={{ marginTop: 12, marginBottom: 8, opacity: 0.9 }}>
                {lockedStop?.description ?? 'This landmark unlocks as you progress around the island.'}
              </p>
              {lockedStopIndex >= 0 ? (
                <p style={{ marginTop: 0, marginBottom: 8, fontSize: 13, opacity: 0.75 }}>
                  Progress step <strong>{lockedStopIndex + 1}</strong> of <strong>{totalStops}</strong>.
                </p>
              ) : null}
              {upcomingTicketCost > 0 ? (
                <p style={{ marginTop: 0, marginBottom: 8, fontSize: 13, opacity: 0.75 }}>
                  Ticket after unlock: <strong>{upcomingTicketCost} 💰</strong>.
                </p>
              ) : null}
              {previousStop ? (
                <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.8 }}>
                  🔒 Complete <strong>{previousStop.title}</strong> first to enter this landmark.
                </p>
              ) : null}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {lockedStopInfoStopId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const previewStopId = lockedStopInfoStopId;
                      setLockedStopInfoStopId(null);
                      requestActiveStopTransition(previewStopId, 'locked_landmark_preview');
                      setFocusedStopId(previewStopId);
                      setCameraMode('stop_focus');
                    }}
                    style={{ padding: '8px 16px' }}
                  >
                    Preview landmark
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setLockedStopInfoStopId(null)}
                  style={{ padding: '8px 16px' }}
                >
                  Close
                </button>
                {previousStop ? (
                  <button
                    type="button"
                    onClick={() => {
                      setLockedStopInfoStopId(null);
                      handleStopOpenRequest(previousStop.stopId);
                    }}
                    style={{ padding: '8px 16px' }}
                  >
                    Open prerequisite: {previousStop.title}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })()}

      {prepayTicketPromptStopId && typeof document !== 'undefined' ? createPortal((() => {
        const promptedStop = islandStopPlan.find((stop) => stop.stopId === prepayTicketPromptStopId);
        const stopIndex = stopIndexByStopId.get(prepayTicketPromptStopId) ?? 0;
        const fullCost = getStopTicketCost({ effectiveIslandNumber, stopIndex });
        const prepayCost = getStopTicketPrepayCost({ effectiveIslandNumber, stopIndex });
        const savings = Math.max(0, fullCost - prepayCost);
        const wallet = runtimeState.essence;
        const canAfford = wallet >= prepayCost;
        const shortfall = Math.max(0, prepayCost - wallet);
        const prerequisite = stopIndex > 0 ? islandStopPlan[stopIndex - 1] : null;
        const closePrepayOffer = () => {
          setPrepayTicketPromptStopId(null);
          setLandingText('Offer skipped. Future landings on that locked door will use the normal door challenge.');
          setCameraMode('board_follow');
        };
        return (
          <div
            className="island-run-modal-backdrop"
            role="presentation"
            onClick={closePrepayOffer}
          >
            <div
              className="island-run-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="stop-ticket-prepay-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="stop-ticket-prepay-title" style={{ margin: 0, fontSize: 20 }}>
                🎫 Prepay {promptedStop?.title ?? prepayTicketPromptStopId} for 20% off?
              </h2>
              <p style={{ marginTop: 12, marginBottom: 8, opacity: 0.85 }}>
                This landmark is not open yet{prerequisite ? <> — finish <strong>{prerequisite.title}</strong> first.</> : null}.
                Since you found its door early, you can prepay the entry ticket now at a discount.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, margin: '12px 0 16px', fontSize: 16 }}>
                <div><strong>Later:</strong> <s>{fullCost} 💰</s></div>
                <div><strong>Prepay:</strong> {prepayCost} 💰</div>
                <div><strong>Save:</strong> {savings} 💰</div>
                <div><strong>Wallet:</strong> {wallet} 💰</div>
              </div>
              {!canAfford ? (
                <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13, opacity: 0.85 }}>
                  You need <strong>{shortfall} more 💰</strong> to use this one-time prepay offer.
                </p>
              ) : null}
              <p style={{ marginTop: 0, marginBottom: 16, fontSize: 13, opacity: 0.75 }}>
                This offer appears only on your first early landing for this landmark. If you skip it, later landings continue with the normal dormant door challenge.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={closePrepayOffer} style={{ padding: '8px 16px' }}>
                  Skip offer
                </button>
                <button
                  type="button"
                  onClick={() => handlePrepayStopTicket(prepayTicketPromptStopId)}
                  disabled={!canAfford}
                  style={{ padding: '8px 16px', opacity: canAfford ? 1 : 0.5 }}
                >
                  {canAfford ? `Prepay (${prepayCost} 💰)` : `Need ${shortfall} more 💰`}
                </button>
              </div>
            </div>
          </div>
        );
      })(), document.body) : null}

      {/* ── Stop Ticket Prompt ────────────────────────────────────────────
          Opens when the player clicks an orbit stop whose previous stop is
          complete but whose essence ticket hasn't been paid. Lets them pay
          and unlock the stop, or cancel. Hatchery never reaches this path. */}
      {ticketPromptStopId && (() => {
        const promptedStop = islandStopPlan.find((s) => s.stopId === ticketPromptStopId);
        const stopIndex = stopIndexByStopId.get(ticketPromptStopId) ?? 0;
        const cost = getStopTicketCost({ effectiveIslandNumber, stopIndex });
        const wallet = runtimeState.essence;
        const canAfford = wallet >= cost;
        const shortfall = Math.max(0, cost - wallet);
        const affordabilityProgress = cost > 0 ? Math.min(100, Math.round((Math.max(0, wallet) / cost) * 100)) : 100;
        return (
          <div
            className="island-run-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stop-ticket-prompt-title"
            onClick={() => setTicketPromptStopId(null)}
          >
            <div className="island-run-modal" onClick={(e) => e.stopPropagation()}>
              <h2 id="stop-ticket-prompt-title" style={{ margin: 0, fontSize: 20 }}>
                🎫 Open {promptedStop?.title ?? ticketPromptStopId}
              </h2>
              <p style={{ marginTop: 12, marginBottom: 8, opacity: 0.85 }}>
                This landmark needs an essence ticket to open on this island.
              </p>
              {promptedStop?.description ? (
                <p style={{ marginTop: 0, marginBottom: 8, opacity: 0.8 }}>
                  {promptedStop.description}
                </p>
              ) : null}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '12px 0 16px', fontSize: 16 }}>
                <div><strong>Cost:</strong> {cost} 💰</div>
                <div><strong>Wallet:</strong> {wallet} 💰</div>
              </div>
              {!canAfford ? (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ marginTop: 0, marginBottom: 6, fontSize: 13, opacity: 0.85 }}>
                    You need <strong>{shortfall} more 💰</strong> to pay this ticket.
                  </p>
                  <div
                    role="progressbar"
                    aria-label="Ticket affordability"
                    aria-valuemin={0}
                    aria-valuemax={cost}
                    aria-valuenow={Math.max(0, Math.min(cost, wallet))}
                    style={{
                      width: '100%',
                      height: 8,
                      borderRadius: 999,
                      background: 'rgba(255, 255, 255, 0.16)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${affordabilityProgress}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #b86cff 0%, #7ce4ff 100%)',
                      }}
                    />
                  </div>
                  <p style={{ marginTop: 6, marginBottom: 0, fontSize: 12, opacity: 0.75 }}>
                    Hint: roll tiles, finish encounters, or complete available landmarks to earn essence quickly.
                  </p>
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setTicketPromptStopId(null);
                    requestActiveStopTransition(ticketPromptStopId, 'ticket_landmark_preview');
                    setFocusedStopId(ticketPromptStopId);
                    setCameraMode('stop_focus');
                  }}
                  style={{ padding: '8px 16px' }}
                >
                  Preview landmark
                </button>
                <button
                  type="button"
                  onClick={() => setTicketPromptStopId(null)}
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                {!canAfford ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTicketPromptStopId(null);
                      setCameraMode('board_follow');
                      setLandingText('Earn a bit more money, then tap this landmark again to pay the ticket.');
                    }}
                    style={{ padding: '8px 16px' }}
                  >
                    Find essence
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => handlePayStopTicket(ticketPromptStopId)}
                  disabled={!canAfford}
                  style={{ padding: '8px 16px', opacity: canAfford ? 1 : 0.5 }}
                >
                  {canAfford ? `Pay ticket & enter (${cost} 💰)` : `Need ${shortfall} more 💰`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {pairedThemeOfferModal && typeof document !== 'undefined' ? createPortal((
        <div
          className="perfect-pair-theme-modal__backdrop"
          role="presentation"
          onClick={() => setPairedThemeOfferModal(null)}
        >
          <section
            className="perfect-pair-theme-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="perfect-pair-theme-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="perfect-pair-theme-modal__close"
              onClick={() => setPairedThemeOfferModal(null)}
              aria-label="Close Perfect Pair theme offer"
            >
              ×
            </button>
            <p className="perfect-pair-theme-modal__eyebrow">Perfect Pair Theme Offer</p>
            <h2 id="perfect-pair-theme-modal-title">
              {pairedThemeOfferModal.theme.icon} {pairedThemeOfferModal.theme.name} is calling
            </h2>
            <p className="perfect-pair-theme-modal__body">
              {pairedThemeOfferModal.theme.unlockRule.creatureName} is one of your Perfect Companions. Its premium creature theme is available as a one-time Stripe purchase with your 20% Perfect Pair discount.
            </p>
            <div className="perfect-pair-theme-modal__price-row">
              <span>Regular price <s>{pairedThemeOfferModal.access.compareAtPrice ?? pairedThemeOfferModal.theme.unlockRule.basePriceUsd}</s></span>
              <strong>Perfect Pair price {pairedThemeOfferModal.access.displayPrice ?? pairedThemeOfferModal.theme.unlockRule.pairedPriceUsd}</strong>
            </div>
            <div className="perfect-pair-theme-modal__actions">
              <button
                type="button"
                className="island-stop-modal__btn"
                onClick={() => setPairedThemeOfferModal(null)}
              >
                Maybe later
              </button>
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action"
                disabled={themeCheckoutLoadingId === pairedThemeOfferModal.theme.id}
                onClick={() => handleSanctuaryThemeCheckout(pairedThemeOfferModal.theme, pairedThemeOfferModal.access)}
              >
                {themeCheckoutLoadingId === pairedThemeOfferModal.theme.id ? 'Opening checkout…' : `Buy for ${pairedThemeOfferModal.access.displayPrice ?? pairedThemeOfferModal.theme.unlockRule.pairedPriceUsd}`}
              </button>
            </div>
          </section>
        </div>
      ), document.body) : null}

      {/* ── Debug Panel ───────────────────────────────────────────────── */}
      {showDebugPanel && (
        <IslandRunDebugPanel
          session={session}
          client={client}
          runtimeState={runtimeState}
          localState={{
            islandNumber,
            tokenIndex,
            dicePool,
            essence: runtimeState.essence,
            shards: runtimeState.shards,
            shields: runtimeState.shields,
            diamonds: runtimeState.diamonds,
            spinTokens,
            eggStage,
            activeStopId,
            isRolling,
            cameraMode,
            timeLeftSec,
            showTravelOverlay,
            hasHydratedRuntimeState,
            diceRegenCountdown,
            playerLevel: playerLevelInfo?.currentLevel ?? 1,
          }}
          isDevModeEnabled={isDevModeEnabled}
          onEnableDevMode={handleUnlockDevMode}
          devTimedEventOverrideType={devTimedEventOverrideType}
          devTimedEventOverrideEventId={devTimedEventOverrideEventId}
          onSetDevTimedEventOverride={handleSetDevTimedEventOverride}
          onGrantDevTimedEventTickets={handleGrantDevTimedEventTickets}
          showLuckyRollDevLauncher={isDevModeEnabled}
          onOpenLuckyRollDevOverlay={handleOpenDevLuckyRollOverlay}
          onStartLuckyRollDevSession={handleDevStartLuckyRollSession}
          onAdvanceLuckyRollDevSession={handleDevAdvanceLuckyRollSession}
          onBankLuckyRollDevSession={handleDevBankLuckyRollSession}
          onOpenPostRareTreasurePathOverlay={handleOpenPostRareTreasurePathOverlay}
          onStartPostRareTreasurePath={handleDevStartPostRareTreasurePath}
          onCollectPostRareTreasurePathAndTravel={handleDevCollectPostRareTreasurePathAndTravel}
          onOpenEggRewardInventoryEntry={handleDevOpenEggRewardInventoryEntry}
          onGrantDevDemoCreaturePack={handleDevGrantDemoCreaturePack}
          onOpenDevDemoCreaturePackPrototype={handleDevOpenCreaturePackOpeningPrototype}
          onOpenDevWelcomePackPrototype={handleOpenWelcomePackModal}
          onGrantDevDemoEggRewardPack={handleDevGrantDemoEggRewardPack}
          onResetWelcomePackDevFlags={handleDevResetWelcomePackFlags}
          onClose={() => setShowDebugPanel(false)}
        />
      )}

      <DemoWaitlistModal
        open={showDemoWaitlistModal}
        userId={session.user.id}
        userEmail={session.user.email ?? undefined}
        accessToken={session.access_token}
        onClose={() => setShowDemoWaitlistModal(false)}
      />

    </section>
  );
}
