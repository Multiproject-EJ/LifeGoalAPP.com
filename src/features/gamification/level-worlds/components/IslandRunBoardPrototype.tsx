import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  CANONICAL_BOARD_SIZE,
  TILE_ANCHORS,
  TOKEN_START_TILE_INDEX,
  OUTER_STOP_ANCHORS,
  type TileAnchor,
} from '../services/islandBoardLayout';
import {
  getIslandBoardThemeForIslandNumber,
  type IslandBoardTheme,
} from '../services/islandBoardThemes';
import { getIslandBackgroundImageSrc } from '../services/islandBackgrounds';
import { generateTileMap, getIslandRarity, type IslandTileMapEntry } from '../services/islandBoardTileMap';
import { convertHeartToDicePool, getDicePerHeartForIsland } from '../services/islandRunEconomy';
import { generateIslandStopPlan } from '../services/islandRunStops';
import { getNextIslandOnExpiry, isIslandFullyCleared } from '../services/islandRunProgression';
import { planDailyHeartReward } from '../services/islandRunDailyRewards';
import { recordTelemetryEvent } from '../../../../services/telemetry';
import {
  ISLAND_RUN_RUNTIME_HYDRATION_FAILED_STAGE,
  ISLAND_RUN_RUNTIME_HYDRATION_STAGE,
  shouldEmitIslandRunRuntimeHydrationTelemetry,
} from '../services/islandRunRuntimeTelemetry';
import { useSupabaseAuth } from '../../../auth/SupabaseAuthProvider';
import {
  hydrateIslandRunRuntimeStateWithSource,
  persistIslandRunRuntimeStatePatch,
  readIslandRunRuntimeState,
  resolveCollectibleForClaim,
} from '../services/islandRunRuntimeState';
import { ShardClaimModal } from './ShardClaimModal';
import { IslandRunReflectionComposer } from './IslandRunReflectionComposer';
import { writeIslandRunGameStateRecord, type PerIslandEggEntry } from '../services/islandRunGameStateStore';
import {
  rollEggTierWeighted,
  getRandomHatchDelayMs,
  getEggStageName,
  getEggStageEmoji,
  getEggStageArtSrc,
  rollEggRewards,
  type EggTier,
} from '../services/eggService';
import {
  fetchCreatureCollection,
  collectCreatureForUser,
  fetchActiveCompanionId,
  getCreatureManifestEntries,
  migrateLegacyEggLedgerToCollection,
  saveActiveCompanionId,
  feedCreatureForUser,
  claimCreatureBondMilestoneForUser,
  getUnclaimedBondMilestones,
  CREATURE_BOND_XP_PER_LEVEL,
} from '../services/creatureCollectionService';
import {
  earnCreatureTreatsForUser,
  fetchCreatureTreatInventory,
  spendCreatureTreatForUser,
  type CreatureTreatType,
} from '../services/creatureTreatInventoryService';
import { getCompanionBonusForCreature, getCreatureSpecialtyForCompanion, selectCreatureForEgg } from '../services/creatureCatalog';
import { logIslandRunEntryDebug, setIslandRunDebugRuntimeSnapshotProvider } from '../services/islandRunEntryDebug';
import { awardHearts, logGameSession } from '../../../../services/gameRewards';
import { awardGold } from '../../daily-treats/luckyRollTileEffects';
import { awardLuckyRollRuns } from '../../../../services/luckyRollAccess';
import {
  playIslandRunSound,
  triggerIslandRunHaptic,
  getIslandRunAudioEnabled,
  setIslandRunAudioEnabled,
} from '../services/islandRunAudio';
import { SHARD_EARN, computeShardEarn, getShardTierThreshold, type ShardEarnSource } from '../services/shardMilestoneEngine';
import {
  drawEncounterChallenge,
  rollEncounterReward,
  formatEncounterRewardSummary,
  type EncounterChallenge,
  type EncounterReward,
} from '../services/encounterService';
import { IslandRunMinigameLauncher } from './IslandRunMinigameLauncher';
import { IslandStoryReader } from './IslandStoryReader';
import {
  resolveMinigameForStop,
  type IslandRunMinigameResult,
} from '../services/islandRunMinigameService';
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

const ROLL_MIN = 1;
const ROLL_MAX = 3;
const DICE_PER_ROLL = 2;
const SPIN_MIN = 1;
const SPIN_MAX = 5;
// Production island duration: 72 hours. Use ?devTimer=1 for 45s dev mode.
const IS_DEV_TIMER = typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('devTimer') === '1';
const OPEN_HATCHERY_ON_LOAD = typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('openHatchery') === '1';
const OPEN_ISLAND_STOP_ON_LOAD = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('openIslandStop')
  : null;
const ISLAND_DURATION_SEC = IS_DEV_TIMER ? 45 : 72 * 60 * 60;

// M15C: Special islands get 72h timer; normal islands get 48h timer
const SPECIAL_ISLAND_NUMBERS = new Set([5, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108, 114, 120]);

// M16C: Era emoji cycle for shard pill HUD (shard_tier_index % 7)
const ERA_EMOJIS = ['⚡', '🎳', '🌸', '💡', '🔷', '🌀', '🌈'] as const;
function getShardEraEmoji(islandNum: number, tierIndex: number): string {
  if (SPECIAL_ISLAND_NUMBERS.has(islandNum)) return '🌟';
  return ERA_EMOJIS[tierIndex % ERA_EMOJIS.length];
}

function getIslandDurationMs(islandNum: number): number {
  if (IS_DEV_TIMER) return 45_000;
  return SPECIAL_ISLAND_NUMBERS.has(islandNum) ? 72 * 60 * 60 * 1000 : 48 * 60 * 60 * 1000;
}
// Egg hatch durations are now random (24–72 h production / 15–30 s dev) via eggService.
// Egg tier is assigned randomly on set via rollEggTierWeighted() in eggService.
const MARKET_DICE_BUNDLE_COST = 30;
const MARKET_DICE_BUNDLE_REWARD = 6;
const MARKET_HEART_BUNDLE_COST = 40;
const HEART_BOOST_BUNDLE_COST = 80;

// M8-COMPLETE: utility stop costs
const UTILITY_HEART_REFILL_COST = 50;
const UTILITY_DICE_BONUS_COST = 30;
const UTILITY_TIMER_EXT_COST_DIAMONDS = 3;
const UTILITY_TIMER_EXT_HOURS = 12;
const MAX_HEARTS = 10;
const CREATURE_FEED_COOLDOWN_MS = 8 * 60 * 60 * 1000;
const CREATURE_TREAT_OPTIONS: Array<{ type: CreatureTreatType; label: string; xpGain: number; summary: string }> = [
  { type: 'basic', label: 'Basic Treat', xpGain: 1, summary: '+1 bond XP' },
  { type: 'favorite', label: 'Favorite Snack', xpGain: 2, summary: '+2 bond XP' },
  { type: 'rare', label: 'Rare Feast', xpGain: 4, summary: '+4 bond XP' },
];
const CREATURE_TREAT_EARN_BY_EGG_TIER: Record<EggTier, Partial<Record<CreatureTreatType, number>>> = {
  common: { basic: 1 },
  rare: { basic: 1, favorite: 1 },
  mythic: { favorite: 1, rare: 1 },
};

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

type SanctuaryFilterMode = 'all' | 'reward_ready' | 'active' | 'common' | 'rare' | 'mythic';
type SanctuarySortMode = 'recent' | 'bond' | 'tier' | 'active';

type BondMilestoneReward = {
  level: number;
  label: string;
  summary: string;
  coins?: number;
  hearts?: number;
  spinTokens?: number;
};

function getBondMilestoneReward(level: number): BondMilestoneReward | null {
  switch (level) {
    case 3:
      return { level, label: 'Level 3 Cache', summary: '+25 coins', coins: 25 };
    case 5:
      return { level, label: 'Level 5 Care Pack', summary: '+1 heart', hearts: 1 };
    case 8:
      return { level, label: 'Level 8 Momentum Pack', summary: '+1 spin token', spinTokens: 1 };
    case 10:
      return { level, label: "Level 10 Captain's Stash", summary: '+40 coins, +1 heart', coins: 40, hearts: 1 };
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

function getBossReward(islandNumber: number): { hearts: number; coins: number; spinTokens: number } {
  const tier = Math.floor((islandNumber - 1) / 10);
  return {
    hearts: 2 + tier,
    coins: 120 + tier * 40,
    spinTokens: tier >= 2 ? 1 : 0,
  };
}

type StopProgressState = 'pending' | 'active' | 'completed' | 'locked';



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
  bundle?: 'dice_bundle' | 'heart_bundle';
  costCoins?: number;
  rewardDice?: number;
  rewardHearts?: number;
  coinsBefore?: number;
  coinsAfter?: number;
  ownedDiceBundle?: boolean;
  ownedHeartBundle?: boolean;
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
};

type MysteryStopReward =
  | { type: 'coins'; amount: number; message: string }
  | { type: 'hearts'; amount: number; message: string }
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

function getCompanionBonusStorageKey(userId: string): string {
  return `island_run_companion_bonus_applied_${userId}`;
}

function toScreen(anchor: TileAnchor, width: number, height: number) {
  return {
    x: (anchor.x / CANONICAL_BOARD_SIZE.width) * width,
    y: (anchor.y / CANONICAL_BOARD_SIZE.height) * height,
  };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function formatClock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function resolveMysteryStopReward(): MysteryStopReward {
  const randomValue = globalThis.crypto?.getRandomValues
    ? (() => {
        const buffer = new Uint32Array(1);
        globalThis.crypto.getRandomValues(buffer);
        return buffer[0] / (0xffffffff + 1);
      })()
    : Math.random();

  if (randomValue < 0.35) {
    return { type: 'coins', amount: 80, message: '🪙 Mystery cache! +80 coins.' };
  }
  if (randomValue < 0.60) {
    return { type: 'dice', amount: 8, message: '🎲 Mystery momentum! +8 dice.' };
  }
  if (randomValue < 0.82) {
    return { type: 'hearts', amount: 1, message: '❤️ Mystery recovery! +1 heart.' };
  }

  return { type: 'lucky_roll', amount: 1, message: '🎲 Lucky Roll unlocked! +1 bonus run.' };
}

function areStringArraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function preloadThemeAssets(theme: IslandBoardTheme) {
  const urls = [theme.depthMaskImage, theme.pathOverlayImage].filter(Boolean) as string[];
  urls.forEach((url) => {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
  });
}

function getStopIcon(kind: string, stopId: string) {
  if (stopId === 'boss') return '👑';
  if (stopId === 'hatchery') return '🥚';

  switch (kind) {
    case 'habit_action':
      return '✅';
    case 'checkin_reflection':
      return '🧭';
    case 'mystery_reward':
      return '🎁';
    case 'utility_support':
      return '🧰';
    case 'event_challenge':
      return '⚡';
    case 'mini_game':
      return '🎮';
    default:
      return '📍';
  }
}

function getOrbitStopDisplayIcon(state: StopProgressState | 'shop', icon: string): string {
  if (state === 'locked') return '🔒';
  if (state === 'completed') return '✅';
  return icon;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const TILE_TYPE_ICONS: Record<string, string> = {
  currency: '💰',
  chest: '🎁',
  event: '⚡',
  hazard: '☠️',
  egg_shard: '🧩',
  micro: '✨',
};

interface IslandRunBoardPrototypeProps {
  session: Session;
  initialPanel?: 'default' | 'sanctuary';
}

export function IslandRunBoardPrototype({ session, initialPanel = 'default' }: IslandRunBoardPrototypeProps) {
  const { client } = useSupabaseAuth();
  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // M16D: track previous shard count to detect island-travel reset (snap fill bar to 0, no animation)
  const prevShardsRef = useRef<number>(0);
  const [shardFillNoTransition, setShardFillNoTransition] = useState(false);
  const [showDebug, setShowDebug] = useState(() => new URLSearchParams(window.location.search).get('debugBoard') === '1');
  const showQaHooks = useMemo(() => new URLSearchParams(window.location.search).get('islandRunQa') === '1', []);
  const [boardSize, setBoardSize] = useState({ width: 360, height: 640 });
  const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);
  const [isHudCollapsed, setIsHudCollapsed] = useState(true);

  const [hearts, setHearts] = useState(5);
  const [dicePool, setDicePool] = useState(() => convertHeartToDicePool(1));
  const [tokenIndex, setTokenIndex] = useState(TOKEN_START_TILE_INDEX);
  const [rollValue, setRollValue] = useState<number | null>(null);
  const [rollingDiceFaces, setRollingDiceFaces] = useState<[number, number]>([1, 1]);
  const [isRolling, setIsRolling] = useState(false);
  const [landingText, setLandingText] = useState('Ready to roll');
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [islandNumber, setIslandNumber] = useState(1);
  const activeTheme = useMemo(() => getIslandBoardThemeForIslandNumber(islandNumber), [islandNumber]);
  const islandBackgroundSrc = useMemo(() => getIslandBackgroundImageSrc(islandNumber), [islandNumber]);
  const [isIslandBackgroundAvailable, setIsIslandBackgroundAvailable] = useState(true);
  const [timeLeftSec, setTimeLeftSec] = useState(ISLAND_DURATION_SEC);
  const [showTravelOverlay, setShowTravelOverlay] = useState(false);
  const [travelOverlayDestinationIsland, setTravelOverlayDestinationIsland] = useState(2);
  const [travelOverlayMode, setTravelOverlayMode] = useState<'advance' | 'retry'>('advance');
  const [step1PromptedIsland, setStep1PromptedIsland] = useState<number | null>(null);
  const [activeEgg, setActiveEgg] = useState<ActiveEgg | null>(null);
  const [isSettingEgg, setIsSettingEgg] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [showOnboardingBooster, setShowOnboardingBooster] = useState(false);
  const [boosterName, setBoosterName] = useState('');
  const [boosterError, setBoosterError] = useState<string | null>(null);
  const [isDisplayNameLoopCompleted, setIsDisplayNameLoopCompleted] = useState(false);
  const [showEncounterModal, setShowEncounterModal] = useState(false);
  const [encounterResolved, setEncounterResolved] = useState(false);
  // M6-COMPLETE: per-visit encounter tracking (Set of completed tile indices)
  const [completedEncounterIndices, setCompletedEncounterIndices] = useState<Set<number>>(() => new Set());
  const [activeEncounterTileIndex, setActiveEncounterTileIndex] = useState<number | null>(null);
  const [showHatcheryHelp, setShowHatcheryHelp] = useState(false);
  // M6-COMPLETE: encounter challenge state machine
  const [currentEncounterChallenge, setCurrentEncounterChallenge] = useState<EncounterChallenge | null>(null);
  const [encounterStep, setEncounterStep] = useState<'challenge' | 'reward'>('challenge');
  const [encounterRewardData, setEncounterRewardData] = useState<EncounterReward | null>(null);
  const [gratitudeText, setGratitudeText] = useState('');
  const [breathingSecondsLeft, setBreathingSecondsLeft] = useState(0);
  const [bossTrialResolved, setBossTrialResolved] = useState(false);
  const [bossRewardSummary, setBossRewardSummary] = useState<string | null>(null);
  // M7-COMPLETE: boss trial flow state machine
  const [bossTrialPhase, setBossTrialPhase] = useState<'idle' | 'in_progress' | 'success' | 'failed'>('idle');
  const [bossTrialTimeLeft, setBossTrialTimeLeft] = useState<number>(0);
  const [bossTrialScore, setBossTrialScore] = useState<number>(0);
  const [bossAttemptCount, setBossAttemptCount] = useState<number>(0);
  const [coins, setCoins] = useState(0);
  const [islandShards, setIslandShards] = useState<number>(0);
  const [shardTierIndex, setShardTierIndex] = useState<number>(0);
  const [shardClaimCount, setShardClaimCount] = useState<number>(0);
  // M17A: shields wallet currency (Body Habit Shield)
  const [shields, setShields] = useState<number>(0);
  // M17C: shards wallet currency (persistent cross-island Shards balance)
  const [shards, setShards] = useState<number>(0);
  // M8-COMPLETE: diamonds wallet currency (earned from mythic egg rewards; spent in utility stop)
  const [diamonds, setDiamonds] = useState<number>(() => {
    try {
      const stored = window.localStorage.getItem(`island_run_diamonds_${session.user.id}`);
      return stored !== null ? Math.max(0, parseInt(stored, 10) || 0) : 3;
    } catch { return 3; }
  });
  // M16C: true when islandShards >= current tier threshold; cleared on player claim (M16E)
  const [shardMilestoneReached, setShardMilestoneReached] = useState<boolean>(false);
  // M16E: tier index of a pending (unclaimed) milestone; null when no claim is waiting
  const [pendingClaimTierIndex, setPendingClaimTierIndex] = useState<number | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [mysteryStopReward, setMysteryStopReward] = useState<MysteryStopReward | null>(null);
  const [marketPurchaseFeedback, setMarketPurchaseFeedback] = useState<string | null>(null);
  const [marketOwnedBundles, setMarketOwnedBundles] = useState<Record<'dice_bundle' | 'heart_bundle' | 'heart_boost_bundle', boolean>>({
    dice_bundle: false,
    heart_bundle: false,
    heart_boost_bundle: false,
  });
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
      hearts?: number;
      coins?: number;
      spinTokens?: number;
      dicePool?: number;
    };
    latestPersistSuccess?: {
      timestamp: string;
      currentIslandNumber?: number;
      bossTrialResolvedIslandNumber?: number | null;
      cycleIndex?: number;
      tokenIndex?: number;
      hearts?: number;
      coins?: number;
      spinTokens?: number;
      dicePool?: number;
    };
  } | null>(null);
  const [firstRunStep, setFirstRunStep] = useState<'celebration' | 'launch'>('celebration');
  const [isPersistingFirstRunCompletion, setIsPersistingFirstRunCompletion] = useState(false);
  const [dailyHeartsClaimed, setDailyHeartsClaimed] = useState(false);
  const [hasHydratedRuntimeState, setHasHydratedRuntimeState] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(() => getIslandRunAudioEnabled());
  // M4-COMPLETE: cycleIndex tracks full laps through 120 islands (island 120 → 1 increments this)
  const [cycleIndex, setCycleIndex] = useState<number>(0);


  useEffect(() => {
    preloadThemeAssets(activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    setIsIslandBackgroundAvailable(true);
  }, [islandBackgroundSrc]);

  // B1-3: tile map state — regenerated when islandNumber or dayIndex changes
  const [islandStartedAtMs, setIslandStartedAtMs] = useState<number>(() => Date.now());
  const [islandExpiresAtMs, setIslandExpiresAtMs] = useState<number>(() => Date.now() + getIslandDurationMs(1));
  const [tileMap, setTileMap] = useState<IslandTileMapEntry[]>(() => generateTileMap(1, 'normal', 'forest', 0));

  // B2-1: spin token state
  const [spinTokens, setSpinTokens] = useState(0);

  // B2-2: token landing animation state
  const [isTokenLanding, setIsTokenLanding] = useState(false);

  // B3-2: minigame launcher state (M11B framework)
  const [activeLaunchedMinigameId, setActiveLaunchedMinigameId] = useState<string | null>(null);

  // B3-3: market interaction gate
  const [marketInteracted, setMarketInteracted] = useState(false);

  // M14: persistent shop panel state
  const [showShopPanel, setShowShopPanel] = useState(false);
  const [showSanctuaryPanel, setShowSanctuaryPanel] = useState(false);
  const [creatureCollection, setCreatureCollection] = useState(() => fetchCreatureCollection(session.user.id));
  const [activeCompanionId, setActiveCompanionId] = useState<string | null>(() => fetchActiveCompanionId(session.user.id));
  const [selectedSanctuaryCreatureId, setSelectedSanctuaryCreatureId] = useState<string | null>(null);
  const [sanctuaryFeedback, setSanctuaryFeedback] = useState<string | null>(null);
  const [sanctuaryClockMs, setSanctuaryClockMs] = useState(() => Date.now());
  const [sanctuaryFilterMode, setSanctuaryFilterMode] = useState<SanctuaryFilterMode>('all');
  const [sanctuarySortMode, setSanctuarySortMode] = useState<SanctuarySortMode>('recent');
  const [creatureTreatInventory, setCreatureTreatInventory] = useState(() => fetchCreatureTreatInventory(session.user.id));

  const [showStoryReader, setShowStoryReader] = useState(false);
  const storySeenStorageKey = `island_run_story_seen_prologue_${session.user.id}`;

  // B3-4: utility stop state
  const [utilityInteracted, setUtilityInteracted] = useState(false);
  const [islandIntention, setIslandIntention] = useState('');

  // B3-5: island clear celebration
  const [showIslandClearCelebration, setShowIslandClearCelebration] = useState(false);
  const [islandClearStats, setIslandClearStats] = useState<{ islandNumber: number; heartsEarned: number; coinsEarned: number; stopsCleared: number } | null>(null);

  const onboardingStorageKey = `gol_onboarding_${session.user.id}`;
  const dailyRewardPlan = planDailyHeartReward(session.user.id);
  const [runtimeState, setRuntimeState] = useState(() => readIslandRunRuntimeState(session));
  const isOnboardingComplete = Boolean(session.user.user_metadata?.onboarding_complete);
  const isFirstRunClaimed = runtimeState.firstRunClaimed;

  useEffect(() => {
    if (!hasHydratedRuntimeState) {
      return;
    }

    const persistedIsland = runtimeState.currentIslandNumber;
    setIslandNumber((current) => (current === persistedIsland ? current : persistedIsland));
    setDicePool(convertHeartToDicePool(persistedIsland));
    setBossTrialResolved(runtimeState.bossTrialResolvedIslandNumber === persistedIsland);

    // M15E: Restore timer from persisted islandExpiresAtMs or apply Catch-up Rule A
    const persistedExpiresAtMs = runtimeState.islandExpiresAtMs;
    if (persistedExpiresAtMs > 0 && persistedExpiresAtMs > Date.now()) {
      // Timer still running — restore from persisted state
      setIslandStartedAtMs(runtimeState.islandStartedAtMs);
      setIslandExpiresAtMs(persistedExpiresAtMs);
      setTimeLeftSec(Math.ceil((persistedExpiresAtMs - Date.now()) / 1000));
    } else if (persistedExpiresAtMs > 0 && !showTravelOverlay) {
      // Catch-up Rule A / M17A: expired islands only advance after a full clear.
      const persistedStops = runtimeState.completedStopsByIsland?.[String(persistedIsland)] ?? [];
      performIslandTravel(getNextIslandOnExpiry(persistedIsland, persistedStops));
    } else if (!showTravelOverlay) {
      // No timer stored (legacy/first-run) — initialize from current island
      const nowMs = Date.now();
      const durationMs = getIslandDurationMs(persistedIsland);
      setIslandStartedAtMs(nowMs);
      setIslandExpiresAtMs(nowMs + durationMs);
      setTimeLeftSec(Math.ceil(durationMs / 1000));
    }

    // B5-3: Restore egg state from runtime state
    // M13: prefer per-island ledger for current island if entry is incubating/ready
    const islandKey = String(persistedIsland);
    const ledgerEntry = runtimeState.perIslandEggs?.[islandKey];
    if (ledgerEntry && (ledgerEntry.status === 'incubating' || ledgerEntry.status === 'ready')) {
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

    setTokenIndex(runtimeState.tokenIndex ?? TOKEN_START_TILE_INDEX);
    setHearts(runtimeState.hearts ?? 5);
    setCoins(runtimeState.coins ?? 0);
    setSpinTokens(runtimeState.spinTokens ?? 0);
    setDicePool(runtimeState.dicePool ?? convertHeartToDicePool(persistedIsland));

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
    // M4-COMPLETE: Restore cycleIndex from runtime state
    setCycleIndex(runtimeState.cycleIndex ?? 0);
  }, [hasHydratedRuntimeState, runtimeState.activeEggHatchDurationMs, runtimeState.activeEggIsDormant, runtimeState.activeEggSetAtMs, runtimeState.activeEggTier, runtimeState.bossTrialResolvedIslandNumber, runtimeState.currentIslandNumber, runtimeState.cycleIndex, runtimeState.perIslandEggs, runtimeState.islandStartedAtMs, runtimeState.islandExpiresAtMs, runtimeState.islandShards, runtimeState.tokenIndex, runtimeState.hearts, runtimeState.coins, runtimeState.spinTokens, runtimeState.dicePool, runtimeState.shardTierIndex, runtimeState.shardClaimCount, runtimeState.shields, runtimeState.shards]);

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
    const persistedStops = runtimeState.completedStopsByIsland?.[String(runtimeState.currentIslandNumber ?? islandNumber)] ?? [];
    if (OPEN_HATCHERY_ON_LOAD) {
      if (shouldAutoOpenIslandStopOnLoad({
        requestedStopId: 'hatchery',
        islandNumber: runtimeState.currentIslandNumber ?? islandNumber,
        completedStopsByIsland: runtimeState.completedStopsByIsland,
      })) {
        setActiveStopId('hatchery');
      }
      // Clean the URL param without a reload
      const url = new URL(window.location.href);
      url.searchParams.delete('openHatchery');
      window.history.replaceState({}, '', url.toString());
      return;
    }

    if (OPEN_ISLAND_STOP_ON_LOAD === 'boss' || OPEN_ISLAND_STOP_ON_LOAD === 'dynamic') {
      if (shouldAutoOpenIslandStopOnLoad({
        requestedStopId: OPEN_ISLAND_STOP_ON_LOAD,
        islandNumber: runtimeState.currentIslandNumber ?? islandNumber,
        completedStopsByIsland: runtimeState.completedStopsByIsland,
      })) {
        setActiveStopId(OPEN_ISLAND_STOP_ON_LOAD);
      }
      // Clean the URL param without a reload
      const url = new URL(window.location.href);
      url.searchParams.delete('openIslandStop');
      window.history.replaceState({}, '', url.toString());
    }
  }, [hasHydratedRuntimeState, islandNumber, runtimeState.completedStopsByIsland, runtimeState.currentIslandNumber]);

  useEffect(() => {
    logIslandRunEntryDebug('island_run_board_mount', {
      userId: session.user.id,
    });

    return () => {
      logIslandRunEntryDebug('island_run_board_unmount', {
        userId: session.user.id,
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
    if (activeStopId === 'market') {
      setMarketPurchaseFeedback('Prototype inventory ready.');
      setMarketInteracted(false);
    }
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

  // M3-COMPLETE: Escape key closes active stop modal
  useEffect(() => {
    if (!activeStopId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setActiveStopId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStopId]);

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
    setCreatureTreatInventory(fetchCreatureTreatInventory(session.user.id));
  }, [session.user.id]);

  useEffect(() => {
    const { collection } = migrateLegacyEggLedgerToCollection({
      userId: session.user.id,
      perIslandEggs: runtimeState.perIslandEggs ?? {},
    });
    setCreatureCollection(collection);
  }, [runtimeState.perIslandEggs, session.user.id]);

  useEffect(() => {
    const stillOwned = creatureCollection.some((entry) => entry.creatureId === activeCompanionId);
    if (activeCompanionId && !stillOwned) {
      setActiveCompanionId(null);
      saveActiveCompanionId(session.user.id, null);
    }
  }, [activeCompanionId, creatureCollection, session.user.id]);

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
        rewardHearts: event.payload?.rewardHearts as number | undefined,
        coinsBefore: event.payload?.coinsBefore as number | undefined,
        coinsAfter: event.payload?.coinsAfter as number | undefined,
        ownedDiceBundle: event.payload?.ownedDiceBundle as boolean | undefined,
        ownedHeartBundle: event.payload?.ownedHeartBundle as boolean | undefined,
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
      setMarketOwnedBundles({
        dice_bundle: false,
        heart_bundle: false,
        heart_boost_bundle: false,
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

    setHasHydratedRuntimeState(false);
    setRuntimeState(readIslandRunRuntimeState(session));

    void hydrateIslandRunRuntimeStateWithSource({ session, client })
      .then((hydrationResult) => {
        if (!isActive) return;
        setRuntimeState(hydrationResult.state);

        logIslandRunEntryDebug('island_run_runtime_hydration_result', {
          userId: session.user.id,
          source: hydrationResult.source,
          currentIslandNumber: hydrationResult.state.currentIslandNumber,
          bossTrialResolvedIslandNumber: hydrationResult.state.bossTrialResolvedIslandNumber,
          cycleIndex: hydrationResult.state.cycleIndex,
          tokenIndex: hydrationResult.state.tokenIndex,
          hearts: hydrationResult.state.hearts,
          coins: hydrationResult.state.coins,
          spinTokens: hydrationResult.state.spinTokens,
          dicePool: hydrationResult.state.dicePool,
        });

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
              hearts: hydrationResult.state.hearts,
              coins: hydrationResult.state.coins,
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
  }, [client, session.user.id]);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(onboardingStorageKey);
    if (!storedValue) {
      setIsDisplayNameLoopCompleted(false);
      return;
    }

    try {
      const parsed = JSON.parse(storedValue) as { stepIndex?: number };
      setIsDisplayNameLoopCompleted((parsed.stepIndex ?? 0) >= 1);
    } catch {
      setIsDisplayNameLoopCompleted(false);
    }
  }, [onboardingStorageKey]);

  useEffect(() => {
    if (!hasHydratedRuntimeState || isOnboardingComplete) return;

    if (!isFirstRunClaimed) {
      setShowFirstRunCelebration(true);
      setFirstRunStep('celebration');
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'onboarding_completed',
        metadata: { stage: 'island_run_first_run_started', island: islandNumber },
      });
    }
  }, [hasHydratedRuntimeState, isFirstRunClaimed, isOnboardingComplete, islandNumber, session.user.id]);

  useEffect(() => {
    setDailyHeartsClaimed(runtimeState.dailyHeartsClaimedDayKey === dailyRewardPlan.dayKey);
  }, [dailyRewardPlan.dayKey, runtimeState.dailyHeartsClaimedDayKey]);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(boardSize.width * ratio);
    canvas.height = Math.floor(boardSize.height * ratio);
    canvas.style.width = `${boardSize.width}px`;
    canvas.style.height = `${boardSize.height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, boardSize.width, boardSize.height);

    const points = TILE_ANCHORS.map((anchor) => toScreen(anchor, boardSize.width, boardSize.height));
    if (!points.length) return;

    context.lineCap = 'round';
    context.lineJoin = 'round';

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const current = points[i];
      const midX = (prev.x + current.x) / 2;
      const midY = (prev.y + current.y) / 2;
      context.quadraticCurveTo(prev.x, prev.y, midX, midY);
    }

    const last = points[points.length - 1];
    const first = points[0];
    const closeMidX = (last.x + first.x) / 2;
    const closeMidY = (last.y + first.y) / 2;
    context.quadraticCurveTo(last.x, last.y, closeMidX, closeMidY);

    const glowGradient = context.createLinearGradient(0, 0, 0, boardSize.height);
    glowGradient.addColorStop(0, activeTheme.pathGlowStops[0]);
    glowGradient.addColorStop(0.5, activeTheme.pathGlowStops[1]);
    glowGradient.addColorStop(1, activeTheme.pathGlowStops[2]);

    context.strokeStyle = 'rgba(255, 255, 255, 0.26)';
    context.lineWidth = 26;
    context.stroke();

    context.strokeStyle = glowGradient;
    context.lineWidth = 13;
    context.stroke();

    if (showDebug) {
      context.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      context.setLineDash([8, 8]);
      context.lineWidth = 2;
      context.stroke();
      context.setLineDash([]);
    }
  }, [activeTheme.pathGlowStops, boardSize, showDebug]);

  // B3-5: island clear celebration auto-dismiss
  useEffect(() => {
    if (showIslandClearCelebration) {
      const t = window.setTimeout(() => setShowIslandClearCelebration(false), 4000);
      return () => window.clearTimeout(t);
    }
  }, [showIslandClearCelebration]);

  const islandStopPlan = useMemo(() => generateIslandStopPlan(islandNumber), [islandNumber]);

  // B1-3: dayIndex computed from island start time
  const dayIndex = useMemo(
    () => Math.floor((nowMs - islandStartedAtMs) / (24 * 60 * 60 * 1000)),
    [nowMs, islandStartedAtMs],
  );

  // B1-3: regenerate tileMap whenever islandNumber or dayIndex changes
  useEffect(() => {
    const rarity = getIslandRarity(islandNumber);
    setTileMap(generateTileMap(islandNumber, rarity, activeTheme.tileThemeId, dayIndex));
  }, [activeTheme.tileThemeId, islandNumber, dayIndex]);

  // B4-4: log dayIndex changes for debug
  useEffect(() => {
    logIslandRunEntryDebug('island_day_index', { islandNumber, dayIndex });
  }, [islandNumber, dayIndex]);

  const [completedStops, setCompletedStops] = useState<string[]>([]);

  // M11D: restore completedStops from table-backed runtime state first; fallback to localStorage
  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    const persistedStops = runtimeState.completedStopsByIsland?.[String(islandNumber)];
    if (Array.isArray(persistedStops)) {
      const sanitizedStops = persistedStops.filter((x): x is string => typeof x === 'string');
      setCompletedStops((current) => (areStringArraysEqual(current, sanitizedStops) ? current : sanitizedStops));
      return;
    }

    const key = `island_run_stops_${session.user.id}_island_${islandNumber}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          const sanitizedStops = parsed.filter((x): x is string => typeof x === 'string');
          setCompletedStops((current) => (areStringArraysEqual(current, sanitizedStops) ? current : sanitizedStops));
          return;
        }
      }
    } catch {
      // ignore storage errors
    }
    setCompletedStops((current) => (current.length === 0 ? current : []));
  }, [hasHydratedRuntimeState, islandNumber, runtimeState.completedStopsByIsland, session.user.id]);

  // M11D: persist completedStops to both localStorage and Supabase runtime state
  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    const key = `island_run_stops_${session.user.id}_island_${islandNumber}`;
    try {
      window.localStorage.setItem(key, JSON.stringify(completedStops));
    } catch {
      // ignore storage errors
    }
    const islandKey = String(islandNumber);
    const persistedStops = runtimeState.completedStopsByIsland?.[islandKey] ?? [];
    if (areStringArraysEqual(persistedStops, completedStops)) {
      return;
    }
    const patch = { [islandKey]: completedStops };
    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        completedStopsByIsland: patch,
      },
    });
    setRuntimeState((current) => ({
      ...current,
      completedStopsByIsland: {
        ...current.completedStopsByIsland,
        ...patch,
      },
    }));
  }, [client, completedStops, hasHydratedRuntimeState, islandNumber, runtimeState.completedStopsByIsland, session]);

  useEffect(() => {
    if (!hasHydratedRuntimeState) return;

    const nextPatch = {
      tokenIndex,
      hearts,
      coins,
      spinTokens,
      dicePool,
    };

    if (
      runtimeState.tokenIndex === nextPatch.tokenIndex
      && runtimeState.hearts === nextPatch.hearts
      && runtimeState.coins === nextPatch.coins
      && runtimeState.spinTokens === nextPatch.spinTokens
      && runtimeState.dicePool === nextPatch.dicePool
    ) {
      return;
    }

    void persistIslandRunRuntimeStatePatch({ session, client, patch: nextPatch });
    setRuntimeState((current) => ({ ...current, ...nextPatch }));
  }, [client, coins, dicePool, hasHydratedRuntimeState, hearts, runtimeState.coins, runtimeState.dicePool, runtimeState.hearts, runtimeState.spinTokens, runtimeState.tokenIndex, session, spinTokens, tokenIndex]);

  // M8-COMPLETE: persist diamonds to localStorage (permanent cross-island balance)
  useEffect(() => {
    try {
      window.localStorage.setItem(`island_run_diamonds_${session.user.id}`, String(diamonds));
    } catch {
      // ignore storage errors
    }
  }, [diamonds, session.user.id]);

  // M8-COMPLETE: restore shop owned state from localStorage on island change
  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    const key = `island_run_shop_owned_${session.user.id}_island_${islandNumber}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        if (parsed && typeof parsed === 'object') {
          setMarketOwnedBundles({
            dice_bundle: Boolean(parsed.dice_bundle),
            heart_bundle: Boolean(parsed.heart_bundle),
            heart_boost_bundle: Boolean(parsed.heart_boost_bundle),
          });
          return;
        }
      }
    } catch {
      // ignore storage errors
    }
    setMarketOwnedBundles({ dice_bundle: false, heart_bundle: false, heart_boost_bundle: false });
  }, [hasHydratedRuntimeState, islandNumber, session.user.id]);

  // M8-COMPLETE: persist shop owned state to localStorage
  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    const key = `island_run_shop_owned_${session.user.id}_island_${islandNumber}`;
    try {
      window.localStorage.setItem(key, JSON.stringify(marketOwnedBundles));
    } catch {
      // ignore storage errors
    }
  }, [marketOwnedBundles, hasHydratedRuntimeState, islandNumber, session.user.id]);

  // M17D: award wallet shards (persistent cross-island balance) by a given amount.
  // This is separate from awardShards (islandShards / Collectible Progress Bar).
  const awardWalletShards = useCallback((amount: number) => {
    setShards((prev) => {
      const next = prev + amount;
      void persistIslandRunRuntimeStatePatch({ session, client, patch: { shards: next } });
      return next;
    });
  }, [session, client]);

  // M16B/M16C: award shards from a given source, update local state, and persist.
  // shard_tier_index does NOT advance here — that happens on player claim (M16E).
  const awardShards = useCallback((source: ShardEarnSource) => {
    const amount = SHARD_EARN[source];
    const result = computeShardEarn(
      { islandShards, shardTierIndex, shardClaimCount },
      amount,
    );
    setIslandShards(result.islandShards);
    // Only persist the cumulative shard count; tier/claim state is unchanged until claim
    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        islandShards: result.islandShards,
      },
    });
    // M16C: set shardMilestoneReached flag (once) when threshold is first crossed
    if (result.shardMilestoneReached && !shardMilestoneReached) {
      setShardMilestoneReached(true);
      // M16E: store the completed tier so the Claim button / modal can show the right collectible
      setPendingClaimTierIndex(shardTierIndex);
      setLandingText((prev) => `${prev} ✨ Shard milestone reached!`);
    }
  }, [islandShards, shardTierIndex, shardClaimCount, shardMilestoneReached, session, client]);

  const stopStateMap = useMemo(() => {
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
  }, [effectiveCompletedStops, islandStopPlan]);

  const stopMap = useMemo(() => {
    const map = new Map<number, string>();
    islandStopPlan.forEach((stop) => map.set(stop.tileIndex, stop.stopId));
    return map;
  }, [islandStopPlan]);

  const tokenPosition = toScreen(TILE_ANCHORS[tokenIndex], boardSize.width, boardSize.height);
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
      const labelOffsetY = index % 2 === 0 ? -38 : 38;

      let visualX = clamp(position.x, horizontalPadding, boardSize.width - horizontalPadding);
      let visualY = clamp(position.y, verticalPadding, boardSize.height - verticalPadding);

      const overlapsBackButtonZone = visualX < 112 && visualY < 128;
      if (overlapsBackButtonZone) {
        visualX = Math.max(visualX, 100);
        visualY = Math.max(visualY, 152);
      }

      return {
        id: stop.stopId,
        label: stop.title.replace(/^\S+\s/, ''),
        x: visualX,
        y: visualY,
        state: stopStateMap.get(stop.stopId) ?? 'active',
        icon: getStopIcon(stop.kind, stop.stopId),
        labelOffsetY,
        labelOffsetX: 0,
        hideLabel: false,
        stopId: stop.stopId,
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
  }, [boardSize.height, boardSize.width, islandStopPlan, stopStateMap]);

  const eggStage = useMemo(() => {
    if (!activeEgg) return 0;
    const total = Math.max(1, activeEgg.hatchAtMs - activeEgg.setAtMs);
    const progress = Math.min(1, Math.max(0, (nowMs - activeEgg.setAtMs) / total));
    return Math.min(4, Math.max(1, Math.ceil(progress * 4)));
  }, [activeEgg, nowMs]);

  // M13: per-island egg slot usage check
  const islandEggEntry = useMemo(() => runtimeState.perIslandEggs?.[String(islandNumber)] ?? null, [runtimeState.perIslandEggs, islandNumber]);

  const islandEggSlotUsed = useMemo(() => {
    return islandEggEntry?.status === 'collected'
      || islandEggEntry?.status === 'sold'
      || islandEggEntry?.status === 'animal_ready'
      || islandEggEntry?.status === 'animal_sold';
  }, [islandEggEntry]);
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
    setCompletedStops((current) => (areStringArraysEqual(current, effectiveCompletedStops) ? current : effectiveCompletedStops));
  }, [completedStops, effectiveCompletedStops, hasHydratedRuntimeState]);

  const eggRemainingSec = activeEgg ? Math.max(0, Math.ceil((activeEgg.hatchAtMs - nowMs) / 1000)) : 0;
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
      hearts,
      coins,
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
    hearts,
    coins,
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
    }
    prevEggStageRef.current = eggStage;
  }, [eggStage]);

  useEffect(() => {
    if (activeStopId !== 'hatchery') {
      setShowHatcheryHelp(false);
    }
  }, [activeStopId]);

  useEffect(() => {
    if (showTravelOverlay) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeftSec(Math.max(0, Math.ceil((islandExpiresAtMs - Date.now()) / 1000)));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [showTravelOverlay, islandNumber, islandExpiresAtMs]);

  useEffect(() => {
    if (!hasHydratedRuntimeState || showFirstRunCelebration || showTravelOverlay) return;

    const step1Stop = islandStopPlan[0];
    const step1Complete = step1Stop
      ? isIslandStopEffectivelyCompleted({
          stopId: step1Stop.stopId,
          completedStops,
          hasActiveEgg: Boolean(activeEgg),
          islandEggSlotUsed,
        })
      : true;
    if (step1Complete) return;
    if (step1PromptedIsland === islandNumber) return;

    if (step1Stop?.stopId) {
      setActiveStopId(step1Stop.stopId);
      setStep1PromptedIsland(islandNumber);
      setLandingText(`Start here: complete Stop 1 (${step1Stop.title}) to unlock dice.`);
    }
  }, [
    hasHydratedRuntimeState,
    showFirstRunCelebration,
    showTravelOverlay,
    islandStopPlan,
    completedStops,
    activeEgg,
    islandEggSlotUsed,
    step1PromptedIsland,
    islandNumber,
  ]);

  useEffect(() => {
    if (!isRolling) return;

    const timer = window.setInterval(() => {
      const left = Math.floor(Math.random() * (ROLL_MAX - ROLL_MIN + 1)) + ROLL_MIN;
      const right = Math.floor(Math.random() * (ROLL_MAX - ROLL_MIN + 1)) + ROLL_MIN;
      setRollingDiceFaces([left, right]);
    }, 90);

    return () => window.clearInterval(timer);
  }, [isRolling]);

  // M15G: Write summary to global key so App.tsx overlay can read islandExpiresAtMs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const summary = {
        islandStartedAtMs,
        islandExpiresAtMs,
        activeEggSetAtMs: activeEgg?.setAtMs ?? null,
        activeEggHatchDurationMs: activeEgg ? activeEgg.hatchAtMs - activeEgg.setAtMs : null,
      };
      window.localStorage.setItem('lifegoal_island_run_runtime_state', JSON.stringify(summary));
    } catch {
      // ignore storage errors
    }
  }, [islandStartedAtMs, islandExpiresAtMs, activeEgg]);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasHydratedRuntimeState) {
      return;
    }

    const hasSeenStory = window.localStorage.getItem(storySeenStorageKey) === 'true';
    if (!hasSeenStory) {
      setShowStoryReader(true);
    }
  }, [hasHydratedRuntimeState, storySeenStorageKey]);

  useEffect(() => {
    if (timeLeftSec > 0 || showTravelOverlay) {
      return;
    }

    const nextIsland = getNextIslandOnExpiry(islandNumber, effectiveCompletedStops);
    const isRetryingCurrentIsland = nextIsland === islandNumber;
    setTravelOverlayDestinationIsland(nextIsland > 120 ? 1 : nextIsland);
    setTravelOverlayMode(isRetryingCurrentIsland ? 'retry' : 'advance');
    setShowTravelOverlay(true);
    setLandingText(
      isRetryingCurrentIsland
        ? `Island ${islandNumber} expired before a full clear. Resetting the same island for another run.`
        : 'Island expired. Traveling to next island...',
    );
    // M10A: island_travel sound + haptic on travel start
    playIslandRunSound('island_travel');
    triggerIslandRunHaptic('island_travel');

    // B4-2 / M17A: expiry only advances after a full clear; otherwise it resets the same island.
    const timeout = window.setTimeout(() => {
      performIslandTravel(nextIsland);
      setShowTravelOverlay(false);
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [client, effectiveCompletedStops, islandNumber, session, showTravelOverlay, timeLeftSec]);

  const timerDisplay = timeLeftSec >= 3600
    ? `${String(Math.floor(timeLeftSec / 3600)).padStart(2, '0')}:${String(Math.floor((timeLeftSec % 3600) / 60)).padStart(2, '0')}`
    : formatClock(timeLeftSec);
  const dicePerHeart = getDicePerHeartForIsland(islandNumber);
  const step1Stop = islandStopPlan[0] ?? null;
  const step1Complete = step1Stop
    ? isIslandStopEffectivelyCompleted({
        stopId: step1Stop.stopId,
        completedStops,
        hasActiveEgg: Boolean(activeEgg),
        islandEggSlotUsed,
      })
    : true;
  const isCurrentIslandFullyCleared = isIslandFullyCleared(islandNumber, effectiveCompletedStops);
  const isEnergyDepletedForRoll = dicePool < DICE_PER_ROLL && hearts < 1;
  const rollButtonMode: 'rolling' | 'step1' | 'roll' | 'convert' = isRolling
    ? 'rolling'
    : !step1Complete
      ? 'step1'
      : dicePool >= DICE_PER_ROLL
        ? 'roll'
        : 'convert';
  const rollButtonLabel = rollButtonMode === 'rolling'
    ? 'Rolling...'
    : rollButtonMode === 'step1'
      ? 'Open Stop 1 (Hatchery)'
      : rollButtonMode === 'roll'
        ? 'Roll (2 dice)'
        : `Convert 1 heart → ${dicePerHeart} dice`;
  const compactRollButtonLabel = rollButtonMode === 'rolling'
    ? 'Rolling...'
    : rollButtonMode === 'step1'
      ? 'Stop 1'
      : rollButtonMode === 'roll'
        ? 'Roll'
        : 'Convert';

  const openStep1Stop = () => {
    if (!step1Stop?.stopId) return;
    setActiveStopId(step1Stop.stopId);
  };

  const handleRoll = async () => {
    if (showFirstRunCelebration) return;

    // M11C: Step 1 enforcement — player must complete Stop 1 before rolling
    if (!step1Complete) {
      setLandingText(`Complete Stop 1 (${step1Stop?.title ?? 'first stop'}) before rolling dice.`);
      openStep1Stop();
      return;
    }

    if (isRolling) {
      return;
    }

    if (dicePool < DICE_PER_ROLL) {
      if (hearts < 1) {
        return;
      }

      setHearts((current) => Math.max(0, current - 1));
      setDicePool((current) => current + convertHeartToDicePool(islandNumber));
      setLandingText(`Converted 1 heart into ${convertHeartToDicePool(islandNumber)} dice rolls.`);
      return;
    }

    setIsRolling(true);
    setActiveStopId(null);
    setDicePool((current) => Math.max(0, current - DICE_PER_ROLL));

    // M10A: roll sound + haptic
    playIslandRunSound('roll');
    triggerIslandRunHaptic('roll');

    const dieOne = Math.floor(Math.random() * (ROLL_MAX - ROLL_MIN + 1)) + ROLL_MIN;
    const dieTwo = Math.floor(Math.random() * (ROLL_MAX - ROLL_MIN + 1)) + ROLL_MIN;
    setRollingDiceFaces([dieOne, dieTwo]);
    const nextRoll = dieOne + dieTwo;
    setRollValue(nextRoll);
    setLandingText(`Rolling ${dieOne} + ${dieTwo} = ${nextRoll}...`);

    let currentIndex = tokenIndex;
    for (let step = 0; step < nextRoll; step += 1) {
      currentIndex = (currentIndex + 1) % TILE_ANCHORS.length;
      setTokenIndex(currentIndex);
      // M10A: token_move sound on each hop
      playIslandRunSound('token_move');
      await wait(240);
    }

    const landedStop = stopMap.get(currentIndex);
    if (landedStop) {
      const stopConfig = islandStopPlan.find((stop) => stop.stopId === landedStop);
      const stopTitle = stopConfig?.title ?? landedStop.toUpperCase();
      const state = stopStateMap.get(landedStop) ?? 'active';

      if (state === 'locked') {
        setLandingText(`Boss stop locked: complete all 5 stops before boss.`);
        setActiveStopId(null);
      } else {
        setLandingText(`Landed on STOP: ${stopTitle} (#${currentIndex})`);
        setActiveStopId(landedStop);
        // M10A: stop_land sound + haptic
        playIslandRunSound('stop_land');
        triggerIslandRunHaptic('stop_land');
        // M10C: boss_trial_start sound when boss modal opens
        if (landedStop === 'boss') {
          playIslandRunSound('boss_trial_start');
        }
      }

      setShowEncounterModal(false);
      setEncounterResolved(false);
    } else if (tileMap[currentIndex]?.tileType === 'encounter') {
      // M6-COMPLETE: check if this encounter tile was already completed this visit
      if (completedEncounterIndices.has(currentIndex)) {
        setLandingText(`Encounter tile (#${currentIndex}) — already completed this visit. ✅`);
        setShowEncounterModal(false);
      } else {
        const challenge = drawEncounterChallenge(islandNumber, currentIndex);
        openEncounterChallenge(challenge, currentIndex);
      }
    } else {
      resolveTileLanding(tileMap[currentIndex]?.tileType ?? 'micro');
      setShowEncounterModal(false);
      setEncounterResolved(false);
    }

    // B2-2: trigger landing animation
    setIsTokenLanding(true);
    window.setTimeout(() => setIsTokenLanding(false), 400);

    setIsRolling(false);
  };

  // B2-3: resolve non-stop, non-encounter tile landings with real outcomes
  const resolveTileLanding = (tileType: string) => {
    const EVENT_MESSAGES = [
      '⚡ Island event!',
      '⚡ Something stirs...',
      '⚡ A challenge echoes...',
      '⚡ The island pulses.',
      '⚡ Fortune favors the bold.',
    ];

    switch (tileType) {
      case 'currency':
        setCoins((c) => c + 15);
        void awardGold(session.user.id, 15, 'shooter_blitz', 'island_run_tile_currency');
        setLandingText('💰 Currency tile! +15 coins');
        break;
      case 'chest':
        setCoins((c) => c + 30);
        setDicePool((d) => d + 5);
        void awardGold(session.user.id, 30, 'shooter_blitz', 'island_run_tile_chest');
        setLandingText('🎁 Treasure chest! +30 coins, +5 dice');
        break;
      case 'hazard':
        setCoins((c) => Math.max(0, c - 10));
        setLandingText('☠️ Hazard! -10 coins');
        break;
      case 'egg_shard':
        setDicePool((d) => d + 2);
        setLandingText('🧩 Egg Shard! +2 dice, +1 shard');
        awardShards('egg_shard_tile');
        break;
      case 'micro':
        setDicePool((d) => d + 3);
        setLandingText('✨ Micro reward! +3 dice');
        break;
      case 'event':
        setLandingText(EVENT_MESSAGES[(islandNumber + tokenIndex) % EVENT_MESSAGES.length]);
        break;
      default:
        setLandingText(`Landed on tile #${tokenIndex}`);
        break;
    }
  };

  // B2-1: handleSpin — costs 1 spin token, rolls SPIN_MIN–SPIN_MAX
  const handleSpin = async () => {
    // M11C: Step 1 enforcement — player must complete Stop 1 before spinning
    if (!step1Complete) {
      setLandingText(`Complete Stop 1 (${step1Stop?.title ?? 'first stop'}) before rolling or spinning.`);
      openStep1Stop();
      return;
    }

    if (isRolling || spinTokens < 1) return;

    setIsRolling(true);
    setActiveStopId(null);
    setSpinTokens((s) => Math.max(0, s - 1));

    playIslandRunSound('roll');
    triggerIslandRunHaptic('roll');

    const nextRoll = Math.floor(Math.random() * (SPIN_MAX - SPIN_MIN + 1)) + SPIN_MIN;
    setRollValue(nextRoll);
    setLandingText(`Spinning ${nextRoll}...`);

    let currentIndex = tokenIndex;
    for (let step = 0; step < nextRoll; step += 1) {
      currentIndex = (currentIndex + 1) % TILE_ANCHORS.length;
      setTokenIndex(currentIndex);
      playIslandRunSound('token_move');
      await wait(240);
    }

    const landedStop = stopMap.get(currentIndex);
    if (landedStop) {
      const stopConfig = islandStopPlan.find((stop) => stop.stopId === landedStop);
      const stopTitle = stopConfig?.title ?? landedStop.toUpperCase();
      const state = stopStateMap.get(landedStop) ?? 'active';

      if (state === 'locked') {
        setLandingText(`Boss stop locked: complete all 5 stops before boss.`);
        setActiveStopId(null);
      } else {
        setLandingText(`Landed on STOP: ${stopTitle} (#${currentIndex})`);
        setActiveStopId(landedStop);
        playIslandRunSound('stop_land');
        triggerIslandRunHaptic('stop_land');
        if (landedStop === 'boss') {
          playIslandRunSound('boss_trial_start');
        }
      }

      setShowEncounterModal(false);
      setEncounterResolved(false);
    } else if (tileMap[currentIndex]?.tileType === 'encounter') {
      // M6-COMPLETE: check if this encounter tile was already completed this visit
      if (completedEncounterIndices.has(currentIndex)) {
        setLandingText(`Encounter tile (#${currentIndex}) — already completed this visit. ✅`);
        setShowEncounterModal(false);
      } else {
        const challenge = drawEncounterChallenge(islandNumber, currentIndex);
        openEncounterChallenge(challenge, currentIndex);
      }
    } else {
      resolveTileLanding(tileMap[currentIndex]?.tileType ?? 'micro');
      setShowEncounterModal(false);
      setEncounterResolved(false);
    }

    // B2-2: trigger landing animation
    setIsTokenLanding(true);
    window.setTimeout(() => setIsTokenLanding(false), 400);

    setIsRolling(false);
  };

  // M5-COMPLETE: handleSetEgg — no tier argument; tier assigned randomly (weighted), hatch delay random 24–72 h
  const handleSetEgg = async () => {
    if (isSettingEgg) return;
    setIsSettingEgg(true);
    setLandingText('Setting egg...');
    const start = Date.now();
    const tier = rollEggTierWeighted();
    const hatchDurationMs = getRandomHatchDelayMs(IS_DEV_TIMER);
    const nextActiveEgg = { tier, setAtMs: start, hatchAtMs: start + hatchDurationMs };
    const islandKey = String(islandNumber);
    const ledgerEntry: PerIslandEggEntry = {
      tier,
      setAtMs: start,
      hatchAtMs: start + hatchDurationMs,
      status: 'incubating',
      location: 'island',
    };
    const nextCompletedStops = activeStopId === 'hatchery'
      ? ensureStopCompleted(completedStops, 'hatchery')
      : completedStops;
    const nextRuntimeState = {
      ...runtimeState,
      activeEggTier: tier,
      activeEggSetAtMs: start,
      activeEggHatchDurationMs: hatchDurationMs,
      activeEggIsDormant: false,
      perIslandEggs: { ...runtimeState.perIslandEggs, [islandKey]: ledgerEntry },
      completedStopsByIsland: {
        ...runtimeState.completedStopsByIsland,
        [islandKey]: nextCompletedStops,
      },
    };
    const persistResult = await writeIslandRunGameStateRecord({
      session,
      client,
      record: nextRuntimeState,
    });

    if (!persistResult.ok) {
      setLandingText(`Could not set egg: ${persistResult.errorMessage}`);
      setIsSettingEgg(false);
      return;
    }

    setActiveEgg(nextActiveEgg);
    // M10B: egg_set sound + haptic
    playIslandRunSound('egg_set');
    triggerIslandRunHaptic('egg_set');
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        stage: 'island_egg_set',
        tier,
        source: 'island_hatchery',
      },
    });
    logIslandRunEntryDebug('island_egg_set', { tier, source: 'island_hatchery' });
    setRuntimeState(nextRuntimeState);

    if (activeStopId === 'hatchery') {
      if (!isStopCompleted(completedStops, 'hatchery')) {
        awardShards('stop_complete');
        awardWalletShards(1);
      }
      setCompletedStops(nextCompletedStops);
      setLandingText(`Egg set! Hatchery stop completed with a ${tier} egg now incubating.`);
      setActiveStopId(null);
    }
    setIsSettingEgg(false);
  };

  const collectedCreatures = useMemo(() => getCreatureManifestEntries(session.user.id), [creatureCollection, session.user.id]);
  const activeCompanion = useMemo(
    () => collectedCreatures.find((creature) => creature.creatureId === activeCompanionId) ?? null,
    [activeCompanionId, collectedCreatures],
  );
  const activeCompanionBonus = useMemo(
    () => (activeCompanion ? getCompanionBonusForCreature(activeCompanion.creature, activeCompanion.bondLevel) : null),
    [activeCompanion],
  );
  const selectedSanctuaryCreature = useMemo(
    () => collectedCreatures.find((creature) => creature.creatureId === selectedSanctuaryCreatureId) ?? null,
    [collectedCreatures, selectedSanctuaryCreatureId],
  );
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
  const sanctuaryRewardReadyCount = useMemo(
    () => collectedCreatures.filter((creature) => getUnclaimedBondMilestones(creature).length > 0).length,
    [collectedCreatures],
  );
  const visibleSanctuaryCreatures = useMemo(() => {
    const filtered = collectedCreatures.filter((creature) => {
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
  }, [activeCompanionId, collectedCreatures, sanctuaryFilterMode, sanctuarySortMode]);

  useEffect(() => {
    if (!hasHydratedRuntimeState || !activeCompanion || !activeCompanionBonus || typeof window === 'undefined') {
      return;
    }

    const visitKey = `${cycleIndex}:${islandNumber}`;
    const storageKey = getCompanionBonusStorageKey(session.user.id);

    try {
      if (window.localStorage.getItem(storageKey) === visitKey) {
        return;
      }
      window.localStorage.setItem(storageKey, visitKey);
    } catch {
      // ignore storage failures and still apply once for this mount
    }

    if (activeCompanionBonus.effect === 'bonus_heart') {
      setHearts((current) => Math.min(MAX_HEARTS, current + activeCompanionBonus.amount));
    } else if (activeCompanionBonus.effect === 'bonus_spin') {
      setSpinTokens((current) => current + activeCompanionBonus.amount);
    } else {
      setDicePool((current) => current + activeCompanionBonus.amount);
    }

    setLandingText(`${activeCompanion.creature.name} supported this island: ${activeCompanionBonus.label}.`);
  }, [
    activeCompanion,
    activeCompanionBonus,
    cycleIndex,
    hasHydratedRuntimeState,
    islandNumber,
    session.user.id,
  ]);

  const handleCollectCreature = () => {
    if (!activeEgg || eggStage < 4) return;
    const resolvedEgg = activeEgg;
    const nowTs = Date.now();
    const creature = selectCreatureForEgg({
      eggTier: resolvedEgg.tier,
      seed: resolvedEgg.setAtMs,
      islandNumber,
    });
    const islandKey = String(islandNumber);
    const existingEntry = runtimeState.perIslandEggs?.[islandKey];
    const nextCompletedStops = ensureStopCompleted(completedStops, 'hatchery');
    const collectedEntry: PerIslandEggEntry = existingEntry
      ? { ...existingEntry, status: 'collected', openedAt: nowTs, location: 'island' }
      : {
          tier: resolvedEgg.tier,
          setAtMs: resolvedEgg.setAtMs,
          hatchAtMs: resolvedEgg.hatchAtMs,
          status: 'collected',
          openedAt: nowTs,
          location: 'island',
        };

    setActiveEgg(null);
    setCreatureCollection(collectCreatureForUser({
      userId: session.user.id,
      creature,
      islandNumber,
      collectedAtMs: nowTs,
    }));
    setCreatureTreatInventory(earnCreatureTreatsForUser(session.user.id, CREATURE_TREAT_EARN_BY_EGG_TIER[resolvedEgg.tier]));
    playIslandRunSound('egg_open');
    triggerIslandRunHaptic('egg_open');
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
      },
    });
    logIslandRunEntryDebug('island_creature_collected', { tier: resolvedEgg.tier, creatureId: creature.id, creatureName: creature.name, source: 'island_hatchery' });
    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        activeEggTier: null,
        activeEggSetAtMs: null,
        activeEggHatchDurationMs: null,
        activeEggIsDormant: false,
        perIslandEggs: { [islandKey]: collectedEntry },
        completedStopsByIsland: { [islandKey]: nextCompletedStops },
      },
    });
    setCompletedStops(nextCompletedStops);
    setRuntimeState((current) => ({
      ...current,
      perIslandEggs: { ...current.perIslandEggs, [islandKey]: collectedEntry },
      completedStopsByIsland: {
        ...current.completedStopsByIsland,
        [islandKey]: nextCompletedStops,
      },
    }));
    if (activeStopId === 'hatchery') {
      setActiveStopId(null);
    }
  };

  const handleSellEggForRewards = () => {
    if (!activeEgg || eggStage < 4) return;
    const resolvedEgg = activeEgg;
    const creature = selectCreatureForEgg({
      eggTier: resolvedEgg.tier,
      seed: resolvedEgg.setAtMs,
      islandNumber,
    });
    const bundle = rollEggRewards(resolvedEgg.tier, resolvedEgg.setAtMs);
    const nowTs = Date.now();
    const islandKey = String(islandNumber);
    const existingEntry = runtimeState.perIslandEggs?.[islandKey];
    const nextCompletedStops = ensureStopCompleted(completedStops, 'hatchery');
    const soldEntry: PerIslandEggEntry = existingEntry
      ? { ...existingEntry, status: 'sold', openedAt: nowTs, location: 'island' }
      : {
          tier: resolvedEgg.tier,
          setAtMs: resolvedEgg.setAtMs,
          hatchAtMs: resolvedEgg.hatchAtMs,
          status: 'sold',
          openedAt: nowTs,
          location: 'island',
        };
    const specialtySellBonusCoins = activeCompanionSpecialty?.effect === 'sell_bonus_coins'
      ? Math.max(0, Math.floor((bundle.coinsDelta * activeCompanionSpecialty.amount) / 100))
      : 0;
    if (bundle.heartsDelta > 0) setHearts((current) => current + bundle.heartsDelta);
    if (bundle.coinsDelta + specialtySellBonusCoins > 0) setCoins((c) => c + bundle.coinsDelta + specialtySellBonusCoins);
    if (bundle.spinTokensDelta > 0) setSpinTokens((t) => t + bundle.spinTokensDelta);
    if (bundle.diamondsDelta > 0) setDiamonds((d) => d + bundle.diamondsDelta);
    awardShards('egg_open');
    awardWalletShards(2);
    void awardGold(session.user.id, bundle.coinsDelta + specialtySellBonusCoins, 'shooter_blitz', 'island_run_hatchery_sell_creature');
    setActiveEgg(null);
    playIslandRunSound('market_purchase_success');
    triggerIslandRunHaptic('market_purchase_success');
    const rewardParts: string[] = [];
    if (bundle.heartsDelta > 0) rewardParts.push(`+${bundle.heartsDelta} ❤️`);
    if (bundle.coinsDelta > 0) rewardParts.push(`+${bundle.coinsDelta} 🪙`);
    if (specialtySellBonusCoins > 0) rewardParts.push(`+${specialtySellBonusCoins} 🪙 specialty`);
    if (bundle.diamondsDelta > 0) rewardParts.push(`+${bundle.diamondsDelta} 💎`);
    if (bundle.spinTokensDelta > 0) rewardParts.push(`+${bundle.spinTokensDelta} 🌀 spin`);
    setLandingText(`Sold ${creature.name}. Rewards: ${rewardParts.join(', ') || 'applied'}.`);
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        stage: 'island_creature_sold',
        island_number: islandNumber,
        tier: resolvedEgg.tier,
        creature_id: creature.id,
        creature_name: creature.name,
        reward_coins: bundle.coinsDelta,
        specialty_bonus_coins: specialtySellBonusCoins,
        reward_hearts: bundle.heartsDelta,
        reward_spin_tokens: bundle.spinTokensDelta,
        reward_diamonds: bundle.diamondsDelta,
      },
    });
    logIslandRunEntryDebug('island_creature_sold', {
      islandNumber,
      tier: resolvedEgg.tier,
      creatureId: creature.id,
      creatureName: creature.name,
      rewardCoins: bundle.coinsDelta,
      specialtyBonusCoins: specialtySellBonusCoins,
      rewardHearts: bundle.heartsDelta,
      rewardSpinTokens: bundle.spinTokensDelta,
      rewardDiamonds: bundle.diamondsDelta,
    });
    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        activeEggTier: null,
        activeEggSetAtMs: null,
        activeEggHatchDurationMs: null,
        activeEggIsDormant: false,
        perIslandEggs: { [islandKey]: soldEntry },
        completedStopsByIsland: { [islandKey]: nextCompletedStops },
      },
    });
    setCompletedStops(nextCompletedStops);
    setRuntimeState((current) => ({
      ...current,
      perIslandEggs: { ...current.perIslandEggs, [islandKey]: soldEntry },
      completedStopsByIsland: {
        ...current.completedStopsByIsland,
        [islandKey]: nextCompletedStops,
      },
    }));
    if (activeStopId === 'hatchery') {
      setActiveStopId(null);
    }
  };


  const handleClaimOnboardingBooster = () => {
    const trimmedName = boosterName.trim();
    if (!trimmedName) {
      setBoosterError('Display name is required.');
      return;
    }

    let nextStepIndex = 1;
    let tokens = 0;
    let unlockedItemIds: string[] = [];

    const existingState = window.localStorage.getItem(onboardingStorageKey);
    if (existingState) {
      try {
        const parsed = JSON.parse(existingState) as {
          stepIndex?: number;
          tokens?: number;
          unlockedItemIds?: string[];
        };
        nextStepIndex = Math.max(1, parsed.stepIndex ?? 0);
        tokens = parsed.tokens ?? 0;
        unlockedItemIds = parsed.unlockedItemIds ?? [];
      } catch {
        // ignore broken storage and write a fresh payload
      }
    }

    window.localStorage.setItem(
      onboardingStorageKey,
      JSON.stringify({
        stepIndex: nextStepIndex,
        tokens,
        unlockedItemIds,
      }),
    );

    setIsDisplayNameLoopCompleted(true);
    setHearts((current) => current + 1);
    setLandingText(`Onboarding display-name loop complete for ${trimmedName}. +1 heart rewarded.`);
    setShowOnboardingBooster(false);
    setBoosterError(null);
  };

  // M6-COMPLETE: Core reward application for encounter completion
  const applyEncounterReward = (reward: EncounterReward) => {
    const specialtyEncounterBonusCoins = activeCompanionSpecialty?.effect === 'encounter_bonus_coins' ? activeCompanionSpecialty.amount : 0;
    const specialtyEncounterBonusHearts = activeCompanionSpecialty?.effect === 'encounter_bonus_hearts' ? activeCompanionSpecialty.amount : 0;
    const challengeType = currentEncounterChallenge?.type ?? null;
    const challengeId = currentEncounterChallenge?.id ?? null;

    setCoins((c) => c + reward.coins + specialtyEncounterBonusCoins);
    void awardGold(session.user.id, reward.coins + specialtyEncounterBonusCoins, 'shooter_blitz', 'island_run_encounter_reward');
    if (reward.heart || specialtyEncounterBonusHearts > 0) {
      setHearts((h) => h + (reward.heart ? 1 : 0) + specialtyEncounterBonusHearts);
      void awardHearts(session.user.id, (reward.heart ? 1 : 0) + specialtyEncounterBonusHearts, 'shooter_blitz', 'Island Run encounter reward');
    }
    if (reward.dice > 0) {
      setDicePool((current) => current + reward.dice);
    }
    if (reward.spinTokens > 0) {
      setSpinTokens((current) => current + reward.spinTokens);
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
    const summary = formatEncounterRewardSummary(reward);
    const specialtySummaryParts: string[] = [];
    if (specialtyEncounterBonusCoins > 0) specialtySummaryParts.push(`+${specialtyEncounterBonusCoins} coins`);
    if (specialtyEncounterBonusHearts > 0) specialtySummaryParts.push(`+${specialtyEncounterBonusHearts} heart${specialtyEncounterBonusHearts === 1 ? '' : 's'}`);
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
        reward_coins: reward.coins,
        reward_heart: reward.heart,
        reward_wallet_shards: reward.walletShards,
        reward_dice: reward.dice,
        reward_spin_tokens: reward.spinTokens,
        specialty_bonus_coins: specialtyEncounterBonusCoins,
        specialty_bonus_hearts: specialtyEncounterBonusHearts,
        specialty_effect: activeCompanionSpecialty?.effect,
      },
    });
  };

  const openEncounterChallenge = (challenge: EncounterChallenge, tileIndex: number) => {
    setCurrentEncounterChallenge(challenge);
    setEncounterStep('challenge');
    setEncounterRewardData(null);
    setGratitudeText('');
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

  // M6-COMPLETE: Breathing auto-complete — called from useEffect when countdown hits 0
  const handleBreathingAutoComplete = () => {
    if (encounterStep !== 'challenge') return;
    const reward = rollEncounterReward({ islandNumber, challengeType: currentEncounterChallenge?.type });
    setEncounterRewardData(reward);
    setEncounterStep('reward');
    applyEncounterReward(reward);
  };

  const handleResolveEncounter = () => {
    if (encounterResolved) return;
    // Legacy path — now delegates to challenge complete flow
    handleEncounterChallengeComplete();
  };

  const handleResolveBossTrial = () => {
    if (bossTrialResolved) {
      return;
    }

    const bossReward = getBossReward(islandNumber);

    awardHearts(session.user.id, bossReward.hearts, 'shooter_blitz', 'Island Run boss trial resolved');
    awardGold(session.user.id, bossReward.coins, 'shooter_blitz', 'Island Run boss trial resolved');

    logGameSession(session.user.id, {
      gameId: 'shooter_blitz',
      action: 'reward',
      timestamp: new Date().toISOString(),
      metadata: {
        stage: 'island_run_boss_trial_resolved',
        reward_hearts: bossReward.hearts,
        reward_coins: bossReward.coins,
        island_number: islandNumber,
      },
    });

    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        stage: 'island_run_boss_trial_resolved',
        source: 'shooter_blitz',
        hearts: bossReward.hearts,
        coins: bossReward.coins,
        island_number: islandNumber,
      },
    });

    setBossTrialResolved(true);
    setHearts((current) => current + bossReward.hearts);
    setCoins((current) => current + bossReward.coins);
    if (bossReward.spinTokens > 0) {
      setSpinTokens((t) => t + bossReward.spinTokens);
    }
    // M10C: boss_trial_resolve sound + haptic
    playIslandRunSound('boss_trial_resolve');
    triggerIslandRunHaptic('boss_trial_resolve');

    const rewardText = `Boss challenge resolved: +${bossReward.hearts} hearts, +${bossReward.coins} coins${bossReward.spinTokens > 0 ? `, +${bossReward.spinTokens} spin` : ''}.`;
    setBossRewardSummary(rewardText);
    setLandingText(`${rewardText} Claim island clear to travel.`);

    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        currentIslandNumber: islandNumber,
        bossTrialResolvedIslandNumber: islandNumber,
      },
    });
    setRuntimeState((current) => ({
      ...current,
      currentIslandNumber: islandNumber,
      bossTrialResolvedIslandNumber: islandNumber,
    }));
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
        // Failed: deduct 1 heart, track attempt
        setHearts((h) => Math.max(0, h - 1));
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

  const handleBossTrialTap = () => {
    if (bossTrialPhase !== 'in_progress') return;
    setBossTrialScore((s) => s + 1);
  };

  const handleBossTrialRetry = () => {
    if (hearts < 1) return;
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
    bundle: 'dice_bundle' | 'heart_bundle';
    status: 'attempt' | 'insufficient_coins' | 'success' | 'already_owned';
    costCoins: number;
    rewardDice?: number;
    rewardHearts?: number;
    coinsBefore: number;
    coinsAfter: number;
    ownedDiceBundle?: boolean;
    ownedHeartBundle?: boolean;
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
        reward_hearts: payload.rewardHearts ?? 0,
        coins_before: payload.coinsBefore,
        coins_after: payload.coinsAfter,
        owned_dice_bundle: payload.ownedDiceBundle,
        owned_heart_bundle: payload.ownedHeartBundle,
      },
    });
  };

  const handleQaTriggerMarketAlreadyOwnedMarker = (bundle: 'dice_bundle' | 'heart_bundle' = 'dice_bundle') => {
    const costCoins = bundle === 'dice_bundle' ? MARKET_DICE_BUNDLE_COST : MARKET_HEART_BUNDLE_COST;
    const rewardDice = bundle === 'dice_bundle' ? MARKET_DICE_BUNDLE_REWARD : undefined;
    const rewardHearts = bundle === 'heart_bundle' ? 1 : undefined;

    setMarketOwnedBundles((current) => ({
      ...current,
      [bundle]: true,
    }));

    emitMarketPurchaseMarker({
      bundle,
      status: 'already_owned',
      costCoins,
      rewardDice,
      rewardHearts,
      coinsBefore: coins,
      coinsAfter: coins,
      ownedDiceBundle: bundle === 'dice_bundle' ? true : marketOwnedBundles.dice_bundle,
      ownedHeartBundle: bundle === 'heart_bundle' ? true : marketOwnedBundles.heart_bundle,
    });

    const message =
      bundle === 'dice_bundle'
        ? 'QA marker: Dice Bundle already owned path emitted.'
        : 'QA marker: Heart Bundle already owned path emitted.';

    setMarketPurchaseFeedback(message);
    setLandingText(message);
  };

  const handleMarketPrototypePurchase = (bundle: 'dice_bundle' | 'heart_bundle') => {
    if (marketOwnedBundles[bundle]) {
      emitMarketPurchaseMarker({
        bundle,
        status: 'already_owned',
        costCoins: bundle === 'dice_bundle' ? MARKET_DICE_BUNDLE_COST : MARKET_HEART_BUNDLE_COST,
        rewardDice: bundle === 'dice_bundle' ? MARKET_DICE_BUNDLE_REWARD : undefined,
        rewardHearts: bundle === 'heart_bundle' ? 1 : undefined,
        coinsBefore: coins,
        coinsAfter: coins,
        ownedDiceBundle: marketOwnedBundles.dice_bundle,
        ownedHeartBundle: marketOwnedBundles.heart_bundle,
      });

      const ownedMessage =
        bundle === 'dice_bundle'
          ? 'Dice Bundle already owned for this island run.'
          : 'Heart Bundle already owned for this island run.';
      setMarketPurchaseFeedback(ownedMessage);
      setLandingText(ownedMessage);
      setMarketInteracted(true);
      return;
    }
    if (bundle === 'dice_bundle') {
      // M10B: market_purchase_attempt sound on purchase tap
      playIslandRunSound('market_purchase_attempt');
      emitMarketPurchaseMarker({
        bundle,
        status: 'attempt',
        costCoins: MARKET_DICE_BUNDLE_COST,
        rewardDice: MARKET_DICE_BUNDLE_REWARD,
        coinsBefore: coins,
        coinsAfter: coins,
      });

      if (coins < MARKET_DICE_BUNDLE_COST) {
        const message = `Not enough coins for Dice Bundle (${MARKET_DICE_BUNDLE_COST} required).`;
        emitMarketPurchaseMarker({
          bundle,
          status: 'insufficient_coins',
          costCoins: MARKET_DICE_BUNDLE_COST,
          rewardDice: MARKET_DICE_BUNDLE_REWARD,
          coinsBefore: coins,
          coinsAfter: coins,
        });
        // M10B: market_insufficient_coins sound on failure
        playIslandRunSound('market_insufficient_coins');
        setMarketPurchaseFeedback(message);
        setLandingText(message);
        setMarketInteracted(true);
        return;
      }

      setCoins((current) => current - MARKET_DICE_BUNDLE_COST);
      setDicePool((current) => current + MARKET_DICE_BUNDLE_REWARD);

      emitMarketPurchaseMarker({
        bundle,
        status: 'success',
        costCoins: MARKET_DICE_BUNDLE_COST,
        rewardDice: MARKET_DICE_BUNDLE_REWARD,
        coinsBefore: coins,
        coinsAfter: coins - MARKET_DICE_BUNDLE_COST,
      });

      // M10B: market_purchase_success sound + haptic
      playIslandRunSound('market_purchase_success');
      triggerIslandRunHaptic('market_purchase_success');
      const message = `Purchased Dice Bundle: -${MARKET_DICE_BUNDLE_COST} coins, +${MARKET_DICE_BUNDLE_REWARD} dice.`;
      setMarketOwnedBundles((current) => ({ ...current, dice_bundle: true }));
      setMarketPurchaseFeedback(message);
      setLandingText(message);
      setMarketInteracted(true);
      return;
    }

    // M10B: market_purchase_attempt sound on purchase tap
    playIslandRunSound('market_purchase_attempt');
    emitMarketPurchaseMarker({
      bundle,
      status: 'attempt',
      costCoins: MARKET_HEART_BUNDLE_COST,
      rewardHearts: 1,
      coinsBefore: coins,
      coinsAfter: coins,
    });

    if (coins < MARKET_HEART_BUNDLE_COST) {
      const message = `Not enough coins for Heart Bundle (${MARKET_HEART_BUNDLE_COST} required).`;
      emitMarketPurchaseMarker({
        bundle,
        status: 'insufficient_coins',
        costCoins: MARKET_HEART_BUNDLE_COST,
        rewardHearts: 1,
        coinsBefore: coins,
        coinsAfter: coins,
      });
      // M10B: market_insufficient_coins sound on failure
      playIslandRunSound('market_insufficient_coins');
      setMarketPurchaseFeedback(message);
      setLandingText(message);
      setMarketInteracted(true);
      return;
    }

    setCoins((current) => current - MARKET_HEART_BUNDLE_COST);
    setHearts((current) => current + 1);

    emitMarketPurchaseMarker({
      bundle,
      status: 'success',
      costCoins: MARKET_HEART_BUNDLE_COST,
      rewardHearts: 1,
      coinsBefore: coins,
      coinsAfter: coins - MARKET_HEART_BUNDLE_COST,
    });

    // M10B: market_purchase_success sound + haptic
    playIslandRunSound('market_purchase_success');
    triggerIslandRunHaptic('market_purchase_success');
    const message = `Purchased Heart Bundle: -${MARKET_HEART_BUNDLE_COST} coins, +1 heart.`;
    setMarketOwnedBundles((current) => ({ ...current, heart_bundle: true }));
    setMarketPurchaseFeedback(message);
    setLandingText(message);
    setMarketInteracted(true);
  };

  // M14: Tier 2 Heart Boost Bundle purchase (available only after boss defeated)
  const handleHeartBoostPurchase = () => {
    if (marketOwnedBundles.heart_boost_bundle) {
      setMarketPurchaseFeedback('Heart Boost Bundle already owned for this island run.');
      setMarketInteracted(true);
      return;
    }
    if (coins < HEART_BOOST_BUNDLE_COST) {
      playIslandRunSound('market_insufficient_coins');
      setMarketPurchaseFeedback(`Not enough coins for Heart Boost Bundle (${HEART_BOOST_BUNDLE_COST} required).`);
      setMarketInteracted(true);
      return;
    }
    playIslandRunSound('market_purchase_attempt');
    setCoins((c) => c - HEART_BOOST_BUNDLE_COST);
    setHearts((h) => h + 3);
    playIslandRunSound('market_purchase_success');
    triggerIslandRunHaptic('market_purchase_success');
    setMarketOwnedBundles((current) => ({ ...current, heart_boost_bundle: true }));
    const message = `Purchased Heart Boost Bundle: -${HEART_BOOST_BUNDLE_COST} coins, +3 hearts.`;
    setMarketPurchaseFeedback(message);
    setLandingText(message);
    setMarketInteracted(true);
  };
  const performIslandTravel = (nextIsland: number) => {
    // M4-COMPLETE: Handle island 120 → 1 wrap with cycle_index increment
    const MAX_ISLAND = 120;
    const wraps = nextIsland > MAX_ISLAND;
    const resolvedIsland = wraps ? ((nextIsland - 1) % MAX_ISLAND) + 1 : Math.max(1, nextIsland);
    const nextCycleIndex = wraps ? cycleIndex + 1 : cycleIndex;

    // M11C/M11D: clear completed stops for the old island before travelling (local + table-backed runtime state)
    const oldIslandKey = String(islandNumber);
    try {
      window.localStorage.removeItem(`island_run_stops_${session.user.id}_island_${islandNumber}`);
    } catch {
      // ignore storage errors
    }
    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        completedStopsByIsland: {
          [oldIslandKey]: [],
        },
      },
    });
    setRuntimeState((current) => ({
      ...current,
      completedStopsByIsland: {
        ...current.completedStopsByIsland,
        [oldIslandKey]: [],
      },
    }));
    // M5-COMPLETE: Save current island egg to perIslandEggs, clear activeEgg, then restore new island egg
    const newIslandKey = String(resolvedIsland);
    // Snapshot perIslandEggs now (before setRuntimeState) to read the new island's entry
    const currentPerIslandEggs = runtimeState.perIslandEggs ?? {};
    let eggPatch: Partial<Parameters<typeof persistIslandRunRuntimeStatePatch>[0]['patch']> = {
      activeEggTier: null,
      activeEggSetAtMs: null,
      activeEggHatchDurationMs: null,
      activeEggIsDormant: false,
    };
    let updatedPerIslandEggs = { ...currentPerIslandEggs };
    if (activeEgg) {
      const travelNow = Date.now();
      const isReady = travelNow >= activeEgg.hatchAtMs;
      const savedEntry: PerIslandEggEntry = {
        tier: activeEgg.tier,
        setAtMs: activeEgg.setAtMs,
        hatchAtMs: activeEgg.hatchAtMs,
        status: isReady ? 'ready' : 'incubating',
        location: isReady ? 'dormant' : 'island',
      };
      updatedPerIslandEggs = { ...updatedPerIslandEggs, [oldIslandKey]: savedEntry };
      eggPatch = { ...eggPatch, perIslandEggs: { [oldIslandKey]: savedEntry } };
    }
    // Restore egg for the new island if one was previously placed there and is not yet collected/sold/converted to a ready animal
    const newIslandEntry = updatedPerIslandEggs[newIslandKey];
    if (newIslandEntry && (newIslandEntry.status === 'incubating' || newIslandEntry.status === 'ready')) {
      const restoreNow = Date.now();
      const isNowReady = restoreNow >= newIslandEntry.hatchAtMs;
      const restoredEgg = {
        tier: newIslandEntry.tier,
        setAtMs: newIslandEntry.setAtMs,
        hatchAtMs: newIslandEntry.hatchAtMs,
        isDormant: isNowReady || newIslandEntry.location === 'dormant',
      };
      setActiveEgg(restoredEgg);
      eggPatch = {
        ...eggPatch,
        activeEggTier: newIslandEntry.tier,
        activeEggSetAtMs: newIslandEntry.setAtMs,
        activeEggHatchDurationMs: newIslandEntry.hatchAtMs - newIslandEntry.setAtMs,
        activeEggIsDormant: restoredEgg.isDormant,
      };
    } else {
      setActiveEgg(null);
    }
    // Always persist egg state changes on island travel (eggPatch always has fields to clear/update)
    void persistIslandRunRuntimeStatePatch({ session, client, patch: eggPatch });
    setRuntimeState((current) => ({
      ...current,
      perIslandEggs: updatedPerIslandEggs,
    }));
    setIslandNumber(resolvedIsland);
    setCycleIndex(nextCycleIndex);
    setDicePool(convertHeartToDicePool(resolvedIsland));
    setTokenIndex(TOKEN_START_TILE_INDEX);
    setHearts(5);
    setRollValue(null);
    setActiveStopId(null);
    setShowEncounterModal(false);
    setEncounterResolved(false);
    // M6-COMPLETE: reset per-visit encounter completion tracking on island travel
    setCompletedEncounterIndices(new Set());
    setActiveEncounterTileIndex(null);
    setCurrentEncounterChallenge(null);
    setEncounterStep('challenge');
    setEncounterRewardData(null);
    setCompletedStops([]);
    setBossTrialResolved(false);
    setBossRewardSummary(null);
    // M7-COMPLETE: reset boss trial phase on island travel
    setBossTrialPhase('idle');
    setBossTrialTimeLeft(0);
    setBossTrialScore(0);
    setBossAttemptCount(0);
    setSpinTokens(0);
    setMarketInteracted(false);
    setMarketOwnedBundles({ dice_bundle: false, heart_bundle: false, heart_boost_bundle: false });
    // M8-COMPLETE: clear per-island shop owned state from localStorage on travel
    try {
      window.localStorage.removeItem(`island_run_shop_owned_${session.user.id}_island_${islandNumber}`);
    } catch {
      // ignore storage errors
    }
    const nowMs = Date.now();
    const durationMs = getIslandDurationMs(resolvedIsland);
    const expiresAtMs = nowMs + durationMs;
    setTimeLeftSec(Math.ceil(durationMs / 1000));
    setIslandStartedAtMs(nowMs);
    setIslandExpiresAtMs(expiresAtMs);
    setUtilityInteracted(false);
    setIslandIntention('');
    setShowIslandClearCelebration(false);
    setIslandClearStats(null);
    // M16C: islandShards, shardTierIndex, shardClaimCount, shardMilestoneReached, and
    // pendingClaimTierIndex are NOT reset on island travel — they are lifetime-cumulative
    // and persist across islands per docs/13_COLLECTIBLE_PROGRESS_BAR.md §3.
    setShowClaimModal(false); // close any open claim modal but preserve pending claim state
    setMysteryStopReward(null);
    setRollValue(null);
    setRollingDiceFaces([1, 1]);
    setStep1PromptedIsland(null);
    setLandingText('Arrived at new island. Complete Stop 1 (Hatchery) to unlock dice.');
    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: { currentIslandNumber: resolvedIsland, cycleIndex: nextCycleIndex, bossTrialResolvedIslandNumber: null, islandStartedAtMs: nowMs, islandExpiresAtMs: expiresAtMs },
    });
    setRuntimeState((current) => ({ ...current, currentIslandNumber: resolvedIsland, cycleIndex: nextCycleIndex, bossTrialResolvedIslandNumber: null, islandStartedAtMs: nowMs, islandExpiresAtMs: expiresAtMs }));
    // M10D: island travel complete sound + haptic
    playIslandRunSound('island_travel_complete');
    triggerIslandRunHaptic('island_travel_complete');
  };

  // B3-2: handleCompleteStopById helper
  const handleCompleteStopById = (stopId: string) => {
    setCompletedStops((current) => current.includes(stopId) ? current : [...current, stopId]);
  };

  const handleCompleteActiveStop = () => {
    if (!activeStopId) return;

    const completionBlockReason = getStopCompletionBlockReason({
      stopId: activeStopId,
      completedStops,
      hasActiveEgg: Boolean(activeEgg),
      islandEggSlotUsed,
      bossTrialResolved,
    });
    if (completionBlockReason) {
      setLandingText(completionBlockReason);
      return;
    }

    if (activeStopId === 'boss') {
      const bossReward = getBossReward(islandNumber);
      setLandingText('Boss stop complete! Island clear. Next island unlocked.');
      setCompletedStops((current) => ensureStopCompleted(current, 'boss'));
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
            hearts: bossReward.hearts,
            coins: bossReward.coins,
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

      // M10C: boss_island_clear sound + haptic
      playIslandRunSound('boss_island_clear');
      triggerIslandRunHaptic('boss_island_clear');

      // B3-5: island clear celebration
      setShowIslandClearCelebration(true);
      setIslandClearStats({
        islandNumber,
        heartsEarned: bossReward.hearts,
        coinsEarned: bossReward.coins,
        stopsCleared: completedStops.length + 1,
      });

      setShowTravelOverlay(true);
      window.setTimeout(() => {
        const nextIsland = islandNumber + 1;
        setShowTravelOverlay(false);
        performIslandTravel(nextIsland);
      }, 1400);
      return;
    }

    if (!isStopCompleted(completedStops, activeStopId)) {
      awardShards('stop_complete');
      awardWalletShards(1);
    }
    setCompletedStops((current) => ensureStopCompleted(current, activeStopId));
    setMysteryStopReward(null);
    setLandingText(`${activeStopId.toUpperCase()} stop completed.`);
    setActiveStopId(null);
  };

  const markOnboardingComplete = async () => {
    if (isOnboardingComplete && isFirstRunClaimed) return true;

    const result = await persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        onboardingComplete: true,
        firstRunClaimed: true,
      },
    });

    if (!result.ok) {
      setLandingText(`Could not complete first-run setup: ${result.errorMessage}`);
      return false;
    }

    setRuntimeState((current) => ({
      ...current,
      firstRunClaimed: true,
    }));

    return true;
  };

  const handleClaimDailyHearts = async (source: 'spin_of_the_day' | 'daily_hatch') => {
    if (!hasHydratedRuntimeState || dailyHeartsClaimed || dailyRewardPlan.source !== source) return;

    const result = await persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        dailyHeartsClaimedDayKey: dailyRewardPlan.dayKey,
      },
    });

    if (!result.ok) {
      setLandingText(`Could not claim daily hearts: ${result.errorMessage}`);
      return;
    }

    setRuntimeState((current) => ({
      ...current,
      dailyHeartsClaimedDayKey: dailyRewardPlan.dayKey,
    }));
    setHearts((current) => current + dailyRewardPlan.hearts);
    setDailyHeartsClaimed(true);
    // M10A: reward_claim haptic on daily hearts claimed
    triggerIslandRunHaptic('reward_claim');
    setLandingText(`Morning reward claimed from ${source === 'spin_of_the_day' ? 'Spin of the Day' : 'Daily Hatch'}: +${dailyRewardPlan.hearts} hearts.`);

    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        source,
        hearts: dailyRewardPlan.hearts,
        day_key: dailyRewardPlan.dayKey,
        stage: 'island_run_daily_hearts_claimed',
      },
    });
  };

  const handleQaMarkBossResolved = () => {
    setBossTrialResolved(true);
    setBossRewardSummary(`QA marker set for island ${islandNumber}.`);
    setLandingText(`QA: boss marker set for island ${islandNumber}.`);

    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        currentIslandNumber: islandNumber,
        bossTrialResolvedIslandNumber: islandNumber,
      },
    });
    setRuntimeState((current) => ({
      ...current,
      currentIslandNumber: islandNumber,
      bossTrialResolvedIslandNumber: islandNumber,
    }));
  };

  const handleQaAdvanceIsland = () => {
    const nextIsland = islandNumber + 1;
    setIslandNumber(nextIsland);
    setDicePool(convertHeartToDicePool(nextIsland));
    setTokenIndex(TOKEN_START_TILE_INDEX);
    setBossTrialResolved(false);
    setBossRewardSummary(null);
    setLandingText(`QA: advanced to island ${nextIsland}.`);

    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        currentIslandNumber: nextIsland,
        bossTrialResolvedIslandNumber: null,
      },
    });
    setRuntimeState((current) => ({
      ...current,
      currentIslandNumber: nextIsland,
      bossTrialResolvedIslandNumber: null,
    }));
  };

  const handleQaResetProgression = () => {
    setIslandNumber(1);
    setDicePool(convertHeartToDicePool(1));
    setTokenIndex(TOKEN_START_TILE_INDEX);
    setBossTrialResolved(false);
    setBossRewardSummary(null);
    setLandingText('QA: progression markers reset to island 1.');

    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        currentIslandNumber: 1,
        bossTrialResolvedIslandNumber: null,
      },
    });
    setRuntimeState((current) => ({
      ...current,
      currentIslandNumber: 1,
      bossTrialResolvedIslandNumber: null,
    }));
  };

  const handleClaimFirstRunRewards = async () => {
    if (firstRunStep === 'celebration') {
      setHearts((current) => current + 5);
      setCoins((current) => current + 250);
      setDicePool((current) => current + convertHeartToDicePool(islandNumber));
      setLandingText('Starter claim complete: +5 hearts, +250 coins, +1 heart worth of dice.');
      setFirstRunStep('launch');
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'onboarding_completed',
        metadata: {
          stage: 'island_run_first_run_rewards_claimed',
          island: islandNumber,
          rewards: { hearts: 5, coins: 250, dice_bonus: convertHeartToDicePool(islandNumber) },
        },
      });
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
    setMarketPurchaseFeedback(null);
    setMarketInteracted(false);
    playIslandRunSound('shop_open');
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: { stage: 'shop_open', island_number: islandNumber },
    });
  };

  const openSanctuaryPanel = useCallback(() => {
    setShowSanctuaryPanel(true);
    setSelectedSanctuaryCreatureId(null);
    setSanctuaryFeedback(null);
    setSanctuaryClockMs(Date.now());
    setSanctuaryFilterMode('all');
    setSanctuarySortMode('recent');
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
      setSanctuaryFeedback(null);
    },
    setActiveCompanion: (creatureId: string | null) => {
      setActiveCompanionId(creatureId);
      saveActiveCompanionId(session.user.id, creatureId);
      const selected = creatureId ? collectedCreatures.find((entry) => entry.creatureId === creatureId) ?? null : null;
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
        selected
          ? `${selected.creature.name} is now your active companion.`
          : 'Active companion cleared.',
      );
    },
    openCreature: (creatureId: string) => {
      setSelectedSanctuaryCreatureId(creatureId);
      setSanctuaryFeedback(null);
      setSanctuaryClockMs(Date.now());
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
      setCreatureTreatInventory(spendCreatureTreatForUser(session.user.id, treatType));
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

      const rewardCoins = reward.coins ?? 0;
      const rewardHearts = reward.hearts ?? 0;
      const rewardSpinTokens = reward.spinTokens ?? 0;

      if (rewardCoins > 0) {
        setCoins((current) => current + rewardCoins);
        void awardGold(session.user.id, rewardCoins, 'shooter_blitz', 'island_run_creature_bond_milestone');
      }
      if (rewardHearts > 0) {
        setHearts((current) => Math.min(MAX_HEARTS, current + rewardHearts));
        void awardHearts(session.user.id, rewardHearts, 'shooter_blitz', 'Island Run creature bond milestone');
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
          reward_coins: rewardCoins,
          reward_hearts: rewardHearts,
          reward_spin_tokens: rewardSpinTokens,
        },
      });
      logIslandRunEntryDebug('sanctuary_bond_reward_claimed', {
        islandNumber,
        creatureId: target.creature.id,
        creatureName: target.creature.name,
        milestoneLevel,
        rewardCoins,
        rewardHearts,
        rewardSpinTokens,
      });
      setSanctuaryFeedback(`${target.creature.name} claimed ${reward.label}: ${reward.summary}.`);
      setLandingText(`${target.creature.name} bond milestone claimed: ${reward.summary}.`);
      playIslandRunSound('market_purchase_success');
      triggerIslandRunHaptic('reward_claim');
    },
    storyRewardClaim: (coinsReward: number) => {
      if (coinsReward <= 0) {
        return;
      }
      setCoins((current) => current + coinsReward);
      void awardGold(session.user.id, coinsReward, 'shooter_blitz', 'island_story_episode_reward');
      setLandingText(`Story reward claimed: +${coinsReward} coins.`);
    },
  };

  const closeSanctuaryPanel = () => {
    setShowSanctuaryPanel(false);
    setSelectedSanctuaryCreatureId(null);
    setSanctuaryFeedback(null);
  };

  const handleSetActiveCompanion = (creatureId: string | null) => {
    setActiveCompanionId(creatureId);
    saveActiveCompanionId(session.user.id, creatureId);
    const selected = creatureId ? collectedCreatures.find((entry) => entry.creatureId === creatureId) ?? null : null;
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
      selected
        ? `${selected.creature.name} is now your active companion.`
        : 'Active companion cleared.',
    );
  };


  const handleOpenSanctuaryCreature = (creatureId: string) => {
    setSelectedSanctuaryCreatureId(creatureId);
    setSanctuaryFeedback(null);
    setSanctuaryClockMs(Date.now());
  };

  const handleFeedSanctuaryCreature = (creatureId: string, treatType: CreatureTreatType) => {
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
    setCreatureTreatInventory(spendCreatureTreatForUser(session.user.id, treatType));
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
  };


  const handleClaimSanctuaryBondReward = (creatureId: string, milestoneLevel: number) => {
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

    const rewardCoins = reward.coins ?? 0;
    const rewardHearts = reward.hearts ?? 0;
    const rewardSpinTokens = reward.spinTokens ?? 0;

    if (rewardCoins > 0) {
      setCoins((current) => current + rewardCoins);
      void awardGold(session.user.id, rewardCoins, 'shooter_blitz', 'island_run_creature_bond_milestone');
    }
    if (rewardHearts > 0) {
      setHearts((current) => Math.min(MAX_HEARTS, current + rewardHearts));
      void awardHearts(session.user.id, rewardHearts, 'shooter_blitz', 'Island Run creature bond milestone');
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
        reward_coins: rewardCoins,
        reward_hearts: rewardHearts,
        reward_spin_tokens: rewardSpinTokens,
      },
    });
    logIslandRunEntryDebug('sanctuary_bond_reward_claimed', {
      islandNumber,
      creatureId: target.creature.id,
      creatureName: target.creature.name,
      milestoneLevel,
      rewardCoins,
      rewardHearts,
      rewardSpinTokens,
    });
    setSanctuaryFeedback(`${target.creature.name} claimed ${reward.label}: ${reward.summary}.`);
    setLandingText(`${target.creature.name} bond milestone claimed: ${reward.summary}.`);
    playIslandRunSound('market_purchase_success');
    triggerIslandRunHaptic('reward_claim');
  };

  const handleStoryRewardClaim = (coinsReward: number) => {
    if (coinsReward <= 0) {
      return;
    }
    setCoins((current) => current + coinsReward);
    void awardGold(session.user.id, coinsReward, 'shooter_blitz', 'island_story_episode_reward');
    setLandingText(`Story reward claimed: +${coinsReward} coins.`);
  };

  const handleCloseStoryReader = () => {
    setShowStoryReader(false);
    try {
      window.localStorage.setItem(storySeenStorageKey, 'true');
    } catch {
      // ignore localStorage failures
    }
  };

  const diceThrowDisplay = (
    <div
      className={`island-run-prototype__dice-throw ${isRolling ? 'island-run-prototype__dice-throw--active' : ''}`}
      aria-live="polite"
    >
      <span className={`island-run-prototype__dice-face ${isRolling ? 'island-run-prototype__dice-face--rolling' : ''}`}>🎲 {rollingDiceFaces[0]}</span>
      <span className={`island-run-prototype__dice-face ${isRolling ? 'island-run-prototype__dice-face--rolling' : ''}`}>🎲 {rollingDiceFaces[1]}</span>
      {rollValue !== null ? <span className="island-run-prototype__dice-total">= {rollValue}</span> : null}
    </div>
  );

  return (
    <section className={`island-run-prototype ${isHudCollapsed ? 'island-run-prototype--hud-collapsed' : ''}`}>
      {!isHudCollapsed ? (
        <header className="island-run-prototype__header">
          <div id="island-run-main-hud">
        <div className="island-run-prototype__always-controls">
          <button
            type="button"
            className={`island-run-prototype__roll-btn island-run-prototype__roll-btn--cta ${rollButtonMode === 'step1' || rollButtonMode === 'roll' ? 'island-run-prototype__roll-btn--primary' : 'island-run-prototype__roll-btn--convert'}`}
            onClick={step1Complete ? handleRoll : openStep1Stop}
            disabled={showFirstRunCelebration || isRolling || (step1Complete && isEnergyDepletedForRoll) || showTravelOverlay}
          >
            {rollButtonLabel}
          </button>
          {spinTokens > 0 && (
            <button
              type="button"
              className="island-run-prototype__spin-btn"
              onClick={() => void handleSpin()}
              disabled={isRolling}
            >
              🌀 Spin
            </button>
          )}
          {/* M10A: audio toggle — persists to localStorage */}
          <button
            type="button"
            className="island-run-prototype__audio-toggle"
            aria-label={audioEnabled ? 'Mute audio and haptics' : 'Unmute audio and haptics'}
            aria-pressed={audioEnabled}
            onClick={() => {
              const next = !audioEnabled;
              setAudioEnabled(next);
              setIslandRunAudioEnabled(next);
            }}
          >
            {audioEnabled ? '🔊' : '🔇'}
          </button>
          {/* M14: persistent HUD Shop button */}
          <button
            type="button"
            className="island-run-prototype__shop-btn"
            aria-label="Open shop"
            onClick={openShopPanel}
          >
            🛍️ Shop
          </button>
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
            aria-label="Open story reader"
            onClick={() => setShowStoryReader(true)}
          >
            📖 Story
          </button>
          {!step1Complete ? (
            <span className="island-run-prototype__stat-chip">Complete Stop 1 to unlock dice 🔒</span>
          ) : null}
        </div>
        {/* M1B: Production HUD — always visible for all logged-in users */}
        <div className="island-run-prototype__status-row island-run-prototype__status-row--production">
          <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--hearts">❤️ <strong>{hearts}</strong></span>
          <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--dice">🎲 <strong>{dicePool}</strong></span>
          <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--coins">🪙 <strong>{coins}</strong></span>
          {activeCompanion && activeCompanionBonus ? (
            <span className="island-run-prototype__stat-chip">
              🐾 <strong>{activeCompanion.creature.name}</strong> · {activeCompanionBonus.label}
            </span>
          ) : null}
          <span className="island-run-prototype__stat-chip island-run-prototype__level-chip">Lvl <strong>{islandNumber}</strong></span>
          <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--timer">⏱ <strong>{timerDisplay}</strong></span>
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
        {/* M17A: shields HUD chip — only shown when player has at least 1 shield */}
        {shields > 0 && (
          <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--shields">
            🛡️ <strong>{shields}</strong>
          </span>
        )}
        {/* M17C: shards wallet HUD chip — only shown when player has at least 1 shard */}
        {shards > 0 && (
          <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--shards">
            ✨ <strong>{shards}</strong>
          </span>
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
              aria-label={`Shard progress: ${islandShards} of ${threshold}`}
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
        {isDevPanelOpen && (
          <div id="island-run-dev-panel">
        <div className="island-run-prototype__hud-grid">
          <div className="island-run-prototype__hud-section">
            <p className="island-run-prototype__hud-label">Run status</p>
            <div className="island-run-prototype__status-row">
              <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--hearts">Hearts: <strong>{hearts}</strong></span>
              <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--dice">Dice: <strong>{dicePool}</strong></span>
              <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--coins">Coins: <strong>{coins}</strong></span>
              <span className="island-run-prototype__stat-chip island-run-prototype__level-chip">LEVEL <strong>{islandNumber}</strong> / 120</span>
              <span className="island-run-prototype__stat-chip">Tile: <strong>{tokenIndex}</strong></span>
              <span className="island-run-prototype__stat-chip">Island: <strong>{islandNumber}</strong></span>
              <span className="island-run-prototype__stat-chip">Last roll: <strong>{rollValue ?? '-'}</strong></span>
              <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--timer">Ends in: <strong>{timerDisplay}</strong></span>
              <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--spin">Spins: <strong>{spinTokens}</strong></span>
              {/* M11C: stop progress chip */}
              {(() => {
                const nonBossStops = islandStopPlan.filter((s) => s.stopId !== 'boss');
                const effectiveCompletedStopSet = new Set(effectiveCompletedStops);
                const completedNonBoss = nonBossStops.filter((s) => effectiveCompletedStopSet.has(s.stopId)).length;
                if (!step1Complete) {
                  return <span className="island-run-prototype__stat-chip">Complete Stop 1 to unlock dice 🔒</span>;
                }
                if (completedNonBoss < nonBossStops.length) {
                  return <span className="island-run-prototype__stat-chip">{completedNonBoss}/{nonBossStops.length} stops done — unlock boss!</span>;
                }
                return <span className="island-run-prototype__stat-chip">✅ All stops cleared</span>;
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
                onClick={() => handleQaTriggerMarketAlreadyOwnedMarker('heart_bundle')}
              >
                QA: Market already-owned (heart)
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
                    <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--hearts">Hearts: <strong>{runtimeVerificationSnapshot.latestHydrationResult?.hearts ?? '—'}</strong></span>
                    <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--coins">Coins: <strong>{runtimeVerificationSnapshot.latestHydrationResult?.coins ?? '—'}</strong></span>
                    <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--spin">Spins: <strong>{runtimeVerificationSnapshot.latestHydrationResult?.spinTokens ?? '—'}</strong></span>
                    <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--dice">Dice: <strong>{runtimeVerificationSnapshot.latestHydrationResult?.dicePool ?? '—'}</strong></span>
                  </div>
                  <p className="island-run-prototype__landing island-run-prototype__qa-note" role="note">
                    Latest persist success: island <strong>{runtimeVerificationSnapshot.latestPersistSuccess?.currentIslandNumber ?? '—'}</strong>, tile <strong>{runtimeVerificationSnapshot.latestPersistSuccess?.tokenIndex ?? '—'}</strong>, hearts <strong>{runtimeVerificationSnapshot.latestPersistSuccess?.hearts ?? '—'}</strong>, dice <strong>{runtimeVerificationSnapshot.latestPersistSuccess?.dicePool ?? '—'}</strong>.
                  </p>
                </div>
              )}
            </div>
          )}
          {(dailyRewardPlan.source === 'spin_of_the_day' || dailyRewardPlan.source === 'daily_hatch') && (
            <button
              type="button"
              className="island-run-prototype__booster-btn"
              onClick={() => void handleClaimDailyHearts(dailyRewardPlan.source)}
              disabled={!hasHydratedRuntimeState || dailyHeartsClaimed}
            >
              {dailyHeartsClaimed
                ? 'Morning hearts claimed'
                : dailyRewardPlan.source === 'spin_of_the_day'
                  ? `Spin of the Day (+${dailyRewardPlan.hearts} hearts)`
                  : `Morning Hearts (+${dailyRewardPlan.hearts} hearts)`}
            </button>
          )}
          {hearts < 1 && dicePool < DICE_PER_ROLL && (
            <button
              type="button"
              className="island-run-prototype__booster-btn"
              onClick={() => {
                setBoosterError(null);
                setShowOnboardingBooster(true);
              }}
              disabled={isDisplayNameLoopCompleted}
            >
              {isDisplayNameLoopCompleted ? 'Onboarding booster used' : 'Use onboarding booster (+1 heart)'}
            </button>
          )}
          {/* M17D: dev simulate wallet shards button */}
          <button
            type="button"
            className="island-run-prototype__debug-btn"
            onClick={() => awardWalletShards(5)}
          >
            Simulate wallet shards (+5)
          </button>
        </div>
          </div>
        )}
          </div>
        </header>
      ) : null}

      <div ref={boardRef} className={`island-run-board island-run-board--framed island-run-board--focus island-run-board--${activeTheme.sceneClass} ${!isIslandBackgroundAvailable ? 'island-run-board--no-bg' : ''} ${isHudCollapsed ? 'island-run-board--hud-collapsed' : ''}`}>
        {isIslandBackgroundAvailable && (
          <img
            key={islandBackgroundSrc}
            className="island-run-board__bg"
            src={islandBackgroundSrc}
            alt=""
            aria-hidden="true"
            onError={() => setIsIslandBackgroundAvailable(false)}
          />
        )}

        {activeTheme.pathOverlayImage && (
          <img
            className="island-run-board__path-overlay"
            src={activeTheme.pathOverlayImage}
            alt=""
            aria-hidden="true"
          />
        )}

        <canvas ref={canvasRef} className="island-run-board__path" />

        <div className="island-run-board__lap-label">17-tile lap</div>

        <div className="island-run-board__orbit-stops">
          {orbitStopVisuals.map((stopVisual) => (
            <button
              key={stopVisual.id}
              type="button"
              className={`island-orbit-stop island-orbit-stop--${stopVisual.state} island-orbit-stop--${activeTheme.sceneClass} ${
                stopVisual.stopId && stopVisual.stopId === activeStopId ? 'island-orbit-stop--selected' : ''
              }`}
              style={{ left: stopVisual.x, top: stopVisual.y }}
              onClick={() => {
                if (stopVisual.stopId && stopVisual.state !== 'locked') setActiveStopId(stopVisual.stopId);
              }}
              disabled={!stopVisual.stopId || stopVisual.state === 'locked'}
              aria-label={`${stopVisual.label} — ${stopVisual.state}`}
            >
              <span className="island-orbit-stop__icon" aria-hidden="true">{getOrbitStopDisplayIcon(stopVisual.state, stopVisual.icon)}</span>
              <span
                className={`island-orbit-stop__label ${stopVisual.hideLabel ? 'island-orbit-stop__label--hidden' : ''}`}
                style={{ transform: `translate(calc(-50% + ${stopVisual.labelOffsetX}px), calc(-50% + ${stopVisual.labelOffsetY}px))` }}
                title={stopVisual.label}
              >
                {stopVisual.label}
              </span>
            </button>
          ))}
        </div>

        <div className="island-run-board__tiles">
          {TILE_ANCHORS.map((anchor, index) => {
            const position = toScreen(anchor, boardSize.width, boardSize.height);
            const isStop = stopMap.has(index);
            const tileType = tileMap[index]?.tileType;
            const isEncounter = tileType === 'encounter';
            // M6-COMPLETE: completed encounter tiles show a distinct visual state
            const isEncounterCompleted = isEncounter && completedEncounterIndices.has(index);
            const tileTypeClass = !isStop && tileType ? `island-tile--${tileType}` : '';

            return (
              <div
                key={anchor.id}
                className={`island-tile island-tile--${anchor.zBand} ${isStop ? 'island-tile--stop' : ''} ${isEncounter ? 'island-tile--encounter' : ''} ${isEncounterCompleted ? 'island-tile--encounter-completed' : ''} ${tileTypeClass} ${
                  index === tokenIndex ? 'island-tile--token-current' : ''
                }`}
                style={{
                  left: position.x,
                  top: position.y,
                  transform: `translate(-50%, -50%) scale(${anchor.scale})`,
                }}
              >
                <span className="island-tile__value">
                  {isEncounterCompleted ? '✅' : isEncounter ? '⚔️' : !isStop && tileType && TILE_TYPE_ICONS[tileType] ? TILE_TYPE_ICONS[tileType] : index + 1}
                </span>
                {showDebug && <small className="island-tile__anchor-id">{anchor.id}</small>}
              </div>
            );
          })}

          <div
            className={`island-token ${isRolling ? 'island-token--moving' : ''} ${isTokenLanding ? 'island-token--landing' : ''} ${`island-token--zband-${TILE_ANCHORS[tokenIndex]?.zBand ?? 'mid'}`}`}
            style={{
              left: tokenPosition.x,
              top: tokenPosition.y,
            }}
          >
            <div className="island-token__ship" aria-hidden="true">
              <div className="island-token__ship-body"/>
              <div className="island-token__ship-fin island-token__ship-fin--left"/>
              <div className="island-token__ship-fin island-token__ship-fin--right"/>
              <div className="island-token__ship-thruster"/>
              <div className="island-token__ship-window"/>
            </div>
          </div>
        </div>

        <img
          className="island-run-board__depth-mask"
          src={activeTheme.depthMaskImage}
          alt=""
          aria-hidden="true"
        />

        {showDebug && (
          <svg className="island-debug-overlay" viewBox={`0 0 ${boardSize.width} ${boardSize.height}`}>
            {TILE_ANCHORS.map((anchor, index) => {
              const position = toScreen(anchor, boardSize.width, boardSize.height);
              const tangentLength = 28;
              const tangentX = position.x + Math.cos((anchor.tangentDeg * Math.PI) / 180) * tangentLength;
              const tangentY = position.y + Math.sin((anchor.tangentDeg * Math.PI) / 180) * tangentLength;

              return (
                <g key={`${anchor.id}_debug`}>
                  <circle cx={position.x} cy={position.y} r="17" fill="none" stroke={ZBAND_COLORS[anchor.zBand]} strokeWidth="2" />
                  <line x1={position.x} y1={position.y} x2={tangentX} y2={tangentY} stroke={ZBAND_COLORS[anchor.zBand]} strokeWidth="2" />
                  <text x={position.x + 10} y={position.y - 12} fill="#fff" fontSize="10">#{index}</text>
                  {stopMap.has(index) && (
                    <text x={position.x + 10} y={position.y + 18} fill="#9ef0ff" fontSize="10">
                      {stopMap.get(index)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <div className="island-run-prototype__footer" aria-label="Island Run footer controls">
        <div className="island-run-prototype__footer-main">
          <div className="island-run-prototype__footer-stats" aria-label="Run resources">
            <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--dice">🎲 <strong>{dicePool}</strong></span>
            <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--hearts">❤️ <strong>{hearts}</strong></span>
            <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--timer">⏱ <strong>{timerDisplay}</strong></span>
            {spinTokens > 0 && (
              <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--spin">🌀 <strong>{spinTokens}</strong></span>
            )}
            <div className="island-run-prototype__footer-dice" aria-label="Dice result">
              {diceThrowDisplay}
            </div>
          </div>

          <div className="island-run-prototype__footer-actions">
            <button
              type="button"
              className={`island-run-prototype__roll-btn island-run-prototype__roll-btn--cta island-run-prototype__roll-btn--footer ${rollButtonMode === 'step1' || rollButtonMode === 'roll' ? 'island-run-prototype__roll-btn--primary' : 'island-run-prototype__roll-btn--convert'}`}
              onClick={step1Complete ? () => void handleRoll() : openStep1Stop}
              disabled={showFirstRunCelebration || isRolling || (step1Complete && isEnergyDepletedForRoll) || showTravelOverlay}
            >
              {rollButtonLabel}
            </button>
            {spinTokens > 0 && (
              <button
                type="button"
                className="island-run-prototype__spin-btn island-run-prototype__spin-btn--footer"
                onClick={() => void handleSpin()}
                disabled={isRolling || spinTokens < 1 || showFirstRunCelebration}
              >
                Spin
              </button>
            )}
            {!isHudCollapsed && (
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
            <button
              type="button"
              className="island-run-prototype__dev-toggle island-run-prototype__dev-toggle--primary island-run-prototype__dev-toggle--footer"
              aria-expanded={!isHudCollapsed}
              aria-controls="island-run-main-hud"
              onClick={() => setIsHudCollapsed((value) => !value)}
            >
              {isHudCollapsed ? 'HUD' : 'Hide HUD'}
            </button>
          </div>
        </div>
      </div>

      {showFirstRunCelebration && (
        <div className="island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy island-stop-modal--onboarding" role="dialog" aria-modal="true" aria-label="First run celebration">
            {firstRunStep === 'celebration' ? (
              <>
                <div className="island-stop-modal__context">
                  <p className="island-stop-modal__eyebrow">First-run setup</p>
                  <h3 className="island-stop-modal__title">🎉 Welcome to Island Run</h3>
                  <p className="island-stop-modal__copy">Claim your starter gifts to begin your first island.</p>
                  <p><strong>Starter gifts:</strong> 💎 1 equivalent + 🪙 250 + ❤️ 5</p>
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
            ) : (
              <>
                <div className="island-stop-modal__context">
                  <p className="island-stop-modal__eyebrow">Launch confirmation</p>
                  <h3 className="island-stop-modal__title">🚀 Launch sequence ready</h3>
                  <p className="island-stop-modal__copy">Your ship is landing on Island 1. Your player piece deploys at the first stop.</p>
                  <p className="island-stop-modal__copy">Tip: spend dice to move tile-to-tile and complete all stops before boss.</p>
                </div>
                <div className="island-stop-modal__cta island-stop-modal__cta--balanced island-stop-modal__cta--anchored">
                  <button
                    type="button"
                    className="supabase-auth__action island-stop-modal__cta-btn island-stop-modal__btn--action"
                    onClick={() => void handleClaimFirstRunRewards()}
                    disabled={isPersistingFirstRunCompletion}
                  >
                    {isPersistingFirstRunCompletion ? 'Saving profile...' : 'Start Island Run'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {showTravelOverlay && (
        <div className="island-travel-overlay" role="status" aria-live="polite">
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

      {activeStop && (
        <div className="island-stop-modal-backdrop" role="presentation">
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
            {activeStopId !== 'hatchery' ? <p><strong>Status:</strong> {stopStateMap.get(activeStop.stopId) ?? 'active'}</p> : null}
            {activeStop.isBehaviorStop ? <p><strong>Behavior stop:</strong> yes (habit/check-in/reflection)</p> : null}

            {activeStopId === 'hatchery' && (
              <>
                <div className="island-hatchery-card">
                {islandEggSlotUsed ? (
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
                ) : activeEgg && eggStage >= 4 ? (
                  /* State 4/5: Egg ready to open (or dormant egg ready on revisit) */
                  <div className="island-hatchery-card__state island-hatchery-card__state--ready">
                    <img
                      className="island-hatchery-card__stage-art"
                      src={getEggStageArtSrc(activeEgg.tier, 4)}
                      alt={`${activeEgg.tier} egg ready to open`}
                    />
                    {activeEgg.isDormant ? (
                      <>
                        <p className="island-hatchery-card__headline">💤 Dormant egg ready!</p>
                        <p className="island-hatchery-card__copy">Your <strong>{activeEgg.tier}</strong> creature is ready. Keep it for your collection or sell it for rewards.</p>
                      </>
                    ) : (
                      <>
                        <p className="island-hatchery-card__headline">🌟 Creature hatched!</p>
                        <p className="island-hatchery-card__copy">Your <strong>{activeEgg.tier}</strong> egg has hatched. Choose whether to collect the creature or sell it now for rewards.</p>
                      </>
                    )}
                    <div className="island-hatchery-card__actions">
                      <button
                        type="button"
                        className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                        onClick={handleCollectCreature}
                      >
                        Collect Creature 🐾
                      </button>
                      <button
                        type="button"
                        className="island-stop-modal__btn island-stop-modal__btn--action"
                        onClick={handleSellEggForRewards}
                      >
                        Sell for Rewards 💰
                      </button>
                    </div>
                  </div>
                ) : activeEgg && eggStage < 4 ? (
                  /* State 3: Egg in progress — show stage name + emoji, NO countdown */
                  <div className="island-hatchery-card__state island-hatchery-card__state--incubating">
                    <img
                      className="island-hatchery-card__stage-art"
                      src={getEggStageArtSrc(activeEgg.tier, eggStage)}
                      alt={`${activeEgg.tier} egg stage ${eggStage}`}
                    />
                    <p className="island-hatchery-card__headline">Stage {eggStage}: {getEggStageName(eggStage)}</p>
                    <p className="island-hatchery-card__copy">
                      Your <strong>{activeEgg.tier}</strong> egg is incubating. Come back soon to collect your reward!
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
                  </div>
                ) : (
                  /* State 2: No egg set — allow setting one */
                  <div className="island-hatchery-card__state island-hatchery-card__state--empty">
                    {islandNumber === 1 ? (
                      <p className="island-hatchery-card__headline">🐣 Welcome! Set your first egg.</p>
                    ) : (
                      <p className="island-hatchery-card__headline">No egg on this island yet.</p>
                    )}
                    <p className="island-hatchery-card__copy">
                      Set an egg now to earn rewards. The tier is a surprise — hatch time is a secret too!
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
                        {isSettingEgg ? 'Setting Egg...' : '🥚 Set Egg'}
                      </button>
                    </div>
                  </div>
                )}
                </div>
              </>
            )}

            {activeStopId === 'minigame' && (
              <div className="island-hatchery-card">
                <p>Launch the minigame to complete this stop and earn rewards.</p>
                <div className="island-hatchery-card__actions">
                  <button
                    type="button"
                    className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                    onClick={() => {
                      setActiveLaunchedMinigameId(resolveMinigameForStop(islandNumber));
                      setActiveStopId(null);
                    }}
                  >
                    ▶ Launch Minigame
                  </button>
                </div>
              </div>
            )}

            {activeStopId === 'utility' && (
              <div className="island-hatchery-card">
                <p className="island-stop-modal__copy"><strong>⚡ Recovery Actions</strong></p>
                {/* Heart refill — hidden when already at max */}
                {hearts < MAX_HEARTS ? (
                  <div className="island-hatchery-card__actions">
                    <button
                      type="button"
                      className="island-stop-modal__btn island-stop-modal__btn--action"
                      disabled={coins < UTILITY_HEART_REFILL_COST}
                      onClick={() => {
                        setCoins((c) => c - UTILITY_HEART_REFILL_COST);
                        setHearts((h) => Math.min(MAX_HEARTS, h + 1));
                        setUtilityInteracted(true);
                        playIslandRunSound('utility_stop_complete');
                        triggerIslandRunHaptic('utility_stop_complete');
                        void recordTelemetryEvent({ userId: session.user.id, eventType: 'economy_spend', metadata: { stage: 'utility_heart_refill', island_number: islandNumber, cost_coins: UTILITY_HEART_REFILL_COST } });
                        setLandingText(`Heart refilled! -${UTILITY_HEART_REFILL_COST} coins, +1 ❤️`);
                        handleCompleteActiveStop();
                      }}
                    >
                      💚 Heart Refill — {UTILITY_HEART_REFILL_COST} 🪙 → +1 ❤️
                      {coins < UTILITY_HEART_REFILL_COST && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}> (need {UTILITY_HEART_REFILL_COST - coins} more)</span>}
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', opacity: 0.65, marginBottom: '0.5rem' }}>❤️ Hearts already full ({hearts}/{MAX_HEARTS})</p>
                )}
                {/* Dice bonus */}
                <div className="island-hatchery-card__actions">
                  <button
                    type="button"
                    className="island-stop-modal__btn island-stop-modal__btn--action"
                    disabled={coins < UTILITY_DICE_BONUS_COST}
                    onClick={() => {
                      setCoins((c) => c - UTILITY_DICE_BONUS_COST);
                      setDicePool((d) => d + 10);
                      setUtilityInteracted(true);
                      playIslandRunSound('utility_stop_complete');
                      triggerIslandRunHaptic('utility_stop_complete');
                      void recordTelemetryEvent({ userId: session.user.id, eventType: 'economy_spend', metadata: { stage: 'utility_dice_bonus', island_number: islandNumber, cost_coins: UTILITY_DICE_BONUS_COST } });
                      setLandingText(`Dice bonus! -${UTILITY_DICE_BONUS_COST} coins, +10 🎲`);
                      handleCompleteActiveStop();
                    }}
                  >
                    🎲 Dice Bonus — {UTILITY_DICE_BONUS_COST} 🪙 → +10 🎲
                    {coins < UTILITY_DICE_BONUS_COST && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}> (need {UTILITY_DICE_BONUS_COST - coins} more)</span>}
                  </button>
                </div>
                {/* Timer extension — spend diamonds */}
                <div className="island-hatchery-card__actions">
                  {diamonds >= UTILITY_TIMER_EXT_COST_DIAMONDS ? (
                    <button
                      type="button"
                      className="island-stop-modal__btn island-stop-modal__btn--action"
                      onClick={() => {
                        setDiamonds((d) => d - UTILITY_TIMER_EXT_COST_DIAMONDS);
                        const extensionMs = UTILITY_TIMER_EXT_HOURS * 60 * 60 * 1000;
                        setIslandExpiresAtMs((current) => current + extensionMs);
                        setUtilityInteracted(true);
                        playIslandRunSound('utility_stop_complete');
                        triggerIslandRunHaptic('utility_stop_complete');
                        void recordTelemetryEvent({ userId: session.user.id, eventType: 'economy_spend', metadata: { stage: 'utility_timer_extension', island_number: islandNumber, cost_diamonds: UTILITY_TIMER_EXT_COST_DIAMONDS, extension_hours: UTILITY_TIMER_EXT_HOURS } });
                        setLandingText(`Timer extended! -${UTILITY_TIMER_EXT_COST_DIAMONDS} 💎, +${UTILITY_TIMER_EXT_HOURS}h`);
                        handleCompleteActiveStop();
                      }}
                    >
                      ⏱ Timer Extension — {UTILITY_TIMER_EXT_COST_DIAMONDS} 💎 → +{UTILITY_TIMER_EXT_HOURS}h
                    </button>
                  ) : (
                    <p style={{ fontSize: '0.85rem', opacity: 0.65 }}>⏱ Timer Extension — needs {UTILITY_TIMER_EXT_COST_DIAMONDS} 💎 (have {diamonds})</p>
                  )}
                </div>
                <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
                  <button
                    type="button"
                    className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                    onClick={() => {
                      setUtilityInteracted(true);
                      handleCompleteActiveStop();
                    }}
                  >
                    ✓ Skip
                  </button>
                </div>
              </div>
            )}

            {activeStopId === 'dynamic' && (
              <div className="island-hatchery-card">
                {activeStop.kind === 'habit_action' ? (
                  <p>✅ Complete one habit or action objective to earn your reward and stabilize momentum.</p>
                ) : activeStop.kind === 'checkin_reflection' ? (
                  <IslandRunReflectionComposer
                    session={session}
                    islandNumber={islandNumber}
                    onSaved={(message) => {
                      setLandingText(message);
                      handleCompleteActiveStop();
                    }}
                  />
                ) : activeStop.kind === 'mystery_reward' ? (
                  <div>
                    <p>🎁 Reveal a mystery reward. Some mystery stops can unlock bonus Lucky Roll runs from Island Run.</p>
                    {mysteryStopReward ? (
                      <div>
                        <p style={{ marginTop: 12 }}>{mysteryStopReward.message}</p>
                        <div className="island-hatchery-card__actions">
                          <button
                            type="button"
                            className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                            onClick={() => {
                              if (mysteryStopReward.type === 'coins') {
                                setCoins((current) => current + mysteryStopReward.amount);
                              } else if (mysteryStopReward.type === 'hearts') {
                                setHearts((current) => Math.min(MAX_HEARTS, current + mysteryStopReward.amount));
                              } else if (mysteryStopReward.type === 'dice') {
                                setDicePool((current) => current + mysteryStopReward.amount);
                              } else if (mysteryStopReward.type === 'lucky_roll') {
                                awardLuckyRollRuns(session.user.id, mysteryStopReward.amount);
                              }

                              setLandingText(mysteryStopReward.message);
                              void recordTelemetryEvent({
                                userId: session.user.id,
                                eventType: 'economy_earn',
                                metadata: {
                                  stage: 'island_run_mystery_stop_claim',
                                  island_number: islandNumber,
                                  reward_type: mysteryStopReward.type,
                                  reward_amount: mysteryStopReward.amount,
                                },
                              });
                              handleCompleteActiveStop();
                            }}
                          >
                            Claim Mystery Reward
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="island-hatchery-card__actions">
                        <button
                          type="button"
                          className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                          onClick={() => setMysteryStopReward(resolveMysteryStopReward())}
                        >
                          Reveal Mystery Reward
                        </button>
                      </div>
                    )}
                  </div>
                ) : activeStop.kind === 'utility_support' ? (
                  <p>🧰 Take a utility or support action — shield up, clean your queue, reroute, or prepare for the next stretch.</p>
                ) : activeStop.kind === 'event_challenge' ? (
                  <p>⚡ A challenge event has emerged. Commit to resolving it for risk/reward tradeoffs on your journey.</p>
                ) : activeStop.kind === 'mini_game' ? (
                  <div>
                    <p>🎮 A mini-game challenge awaits at this stop. Launch it to complete the stop and earn rewards.</p>
                    <div className="island-hatchery-card__actions">
                      <button
                        type="button"
                        className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                        onClick={() => {
                          setActiveLaunchedMinigameId(resolveMinigameForStop(islandNumber));
                          setActiveStopId(null);
                        }}
                      >
                        ▶ Launch Minigame
                      </button>
                    </div>
                  </div>
                ) : (
                  <p>Complete this stop to progress.</p>
                )}
              </div>
            )}

            {activeStop.stopId === 'boss' ? (
              (() => {
                const bossConfig = getBossTrialConfig(islandNumber);
                const bossReward = getBossReward(islandNumber);
                const typeColor = getBossTypeColor(bossConfig.type as BossType);
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
                        <p className="island-boss-trial__challenge-label">
                          <strong>Challenge:</strong>{' '}
                          {bossConfig.type === 'fight'
                            ? `Reach ${bossConfig.scoreTarget} hits before time runs out.`
                            : `Complete ${bossConfig.scoreTarget} actions in ${bossConfig.trialDurationSec}s.`}
                        </p>
                        <p className="island-boss-trial__reward-preview">
                          🎁 Reward on win:{' '}
                          <strong>+{bossReward.hearts} ❤️</strong>,{' '}
                          <strong>+{bossReward.coins} 🪙</strong>
                          {bossReward.spinTokens > 0 ? <>, <strong>+{bossReward.spinTokens} spin</strong></> : null}
                          , <strong>+3 🔷 shards</strong>
                        </p>
                        <p className="island-boss-trial__lives-note">
                          💡 Lives = Hearts — a failed attempt costs 1 ❤️. You have <strong>{hearts}</strong> {hearts === 1 ? 'heart' : 'hearts'}.
                        </p>
                        <div className="island-boss-trial__cta">
                          <button
                            type="button"
                            className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary island-boss-trial__begin-btn"
                            onClick={handleStartBossTrial}
                          >
                            ⚡ Begin Boss Trial
                          </button>
                        </div>
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

                    {/* Success phase: reward summary */}
                    {bossTrialPhase === 'success' && (
                      <div className="island-boss-trial__phase island-boss-trial__phase--success">
                        <p className="island-boss-trial__result island-boss-trial__result--win">🏆 Trial Complete!</p>
                        <p className="island-boss-trial__reward-text">
                          {bossRewardSummary ?? `Rewards: +${bossReward.hearts} ❤️, +${bossReward.coins} 🪙, +3 🔷`}
                        </p>
                        <p className="island-boss-trial__next-hint">Tap <strong>Claim Island Clear</strong> to celebrate and travel.</p>
                      </div>
                    )}

                    {/* Failed phase: heart cost + retry */}
                    {bossTrialPhase === 'failed' && (
                      <div className="island-boss-trial__phase island-boss-trial__phase--failed">
                        <p className="island-boss-trial__result island-boss-trial__result--fail">💔 Trial Failed</p>
                        <p className="island-boss-trial__failed-copy">
                          You scored {bossTrialScore} / {bossConfig.scoreTarget}. 1 heart deducted.
                        </p>
                        <p className="island-boss-trial__hearts-left">
                          Hearts remaining: <strong>{hearts}</strong>
                        </p>
                        {hearts > 0 ? (
                          <div className="island-boss-trial__cta">
                            <button
                              type="button"
                              className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary island-boss-trial__retry-btn"
                              onClick={handleBossTrialRetry}
                            >
                              🔄 Retry (costs 1 ❤️)
                            </button>
                          </div>
                        ) : (
                          <p className="island-boss-trial__no-hearts">
                            ❤️ No hearts left. Return tomorrow for daily hearts or purchase from the shop.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()
            ) : null}

            <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
              {activeStop.stopId !== 'hatchery'
              && activeStop.stopId !== 'boss'
              && activeStop.stopId !== 'utility'
              && activeStop.kind !== 'checkin_reflection'
              && activeStop.kind !== 'mystery_reward' ? (
                <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary" onClick={handleCompleteActiveStop}>
                  Complete Stop
                </button>
              ) : null}
              {activeStop.stopId === 'boss' ? (
                <button
                  type="button"
                  className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                  onClick={handleCompleteActiveStop}
                  disabled={!bossTrialResolved || bossTrialPhase === 'in_progress'}
                >
                  {isCurrentIslandFullyCleared ? '🎉 Claim Island Clear' : 'Claim Island Clear'}
                </button>
              ) : null}
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={() => setActiveStopId(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}


      {showEncounterModal && (
        <div className="island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy island-stop-modal--encounter" role="dialog" aria-modal="true" aria-label="Encounter tile challenge">
            <h3 className="island-stop-modal__title">⚔️ Bonus Encounter</h3>

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
              </>
            )}

            {encounterStep === 'reward' && encounterRewardData && (
              <div className="island-encounter__reward">
                <p className="island-encounter__eyebrow">Challenge Complete! 🎉</p>
                <div className="island-encounter__reward-reveal">
                  <span className="island-encounter__reward-item">🪙 +{encounterRewardData.coins} coins</span>
                  {encounterRewardData.heart && <span className="island-encounter__reward-item">❤️ +1 heart</span>}
                  {encounterRewardData.walletShards && <span className="island-encounter__reward-item">✨ +1 shard</span>}
                  {encounterRewardData.dice > 0 && <span className="island-encounter__reward-item">🎲 +{encounterRewardData.dice} dice</span>}
                  {encounterRewardData.spinTokens > 0 && <span className="island-encounter__reward-item">🌀 +{encounterRewardData.spinTokens} spin</span>}
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
        <div className="island-stop-modal-backdrop" role="presentation">
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

      {showIslandClearCelebration && islandClearStats && (
        <div className="island-clear-celebration" role="status" aria-live="polite">
          <div className="island-clear-celebration__card island-clear-celebration__card--boss">
            <p className="island-clear-celebration__confetti" aria-hidden="true">🎉✨🏆✨🎉</p>
            <p className="island-clear-celebration__eyebrow">Boss Defeated! Island Cleared!</p>
            <p className="island-clear-celebration__title">🏆 Island {islandClearStats.islandNumber} Complete!</p>
            <div className="island-clear-celebration__rewards">
              <span className="island-clear-celebration__reward-item">❤️ +{islandClearStats.heartsEarned}</span>
              <span className="island-clear-celebration__reward-item">🪙 +{islandClearStats.coinsEarned}</span>
              <span className="island-clear-celebration__reward-item">🔷 +3</span>
            </div>
            <p className="island-clear-celebration__stops">✅ {islandClearStats.stopsCleared} stops cleared · 🛍️ Shop Tier 2 unlocked</p>
          </div>
        </div>
      )}

      {/* M14: persistent shop panel */}
      {showShopPanel && (
        <div className="island-stop-modal-backdrop" role="presentation">
          <section className="island-run-shop-panel island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy" role="dialog" aria-modal="true" aria-label="Shop">
            <h3 className="island-stop-modal__title">🛍️ Shop</h3>
            <p className="island-stop-modal__copy"><strong>🪙 {coins} coins</strong></p>

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
                    disabled={coins < MARKET_DICE_BUNDLE_COST}
                    onClick={() => handleMarketPrototypePurchase('dice_bundle')}
                  >
                    🎲 Dice Bundle — {MARKET_DICE_BUNDLE_COST} 🪙 → +{MARKET_DICE_BUNDLE_REWARD} 🎲
                    {coins < MARKET_DICE_BUNDLE_COST && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}> (need {MARKET_DICE_BUNDLE_COST - coins} more)</span>}
                  </button>
                )}
                {marketOwnedBundles.heart_bundle ? (
                  <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" disabled aria-label="Heart Bundle already owned">
                    ❤️ Heart Bundle — Owned ✅
                  </button>
                ) : (
                  <button
                    type="button"
                    className="island-stop-modal__btn island-stop-modal__btn--action"
                    disabled={coins < MARKET_HEART_BUNDLE_COST}
                    onClick={() => handleMarketPrototypePurchase('heart_bundle')}
                  >
                    ❤️ Heart Bundle — {MARKET_HEART_BUNDLE_COST} 🪙 → +1 ❤️
                    {coins < MARKET_HEART_BUNDLE_COST && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}> (need {MARKET_HEART_BUNDLE_COST - coins} more)</span>}
                  </button>
                )}
              </div>
            </div>

            <div className="island-hatchery-card">
              <p><strong>Tier 2 — Post-boss unlock</strong></p>
              {completedStops.includes('boss') ? (
                marketOwnedBundles.heart_boost_bundle ? (
                  <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action" disabled aria-label="Heart Boost Bundle already owned">
                    💗 Heart Boost Bundle — Owned ✅
                  </button>
                ) : (
                  <button
                    type="button"
                    className="island-stop-modal__btn island-stop-modal__btn--action"
                    disabled={coins < HEART_BOOST_BUNDLE_COST}
                    onClick={handleHeartBoostPurchase}
                  >
                    💗 Heart Boost Bundle — {HEART_BOOST_BUNDLE_COST} 🪙 → +3 ❤️
                    {coins < HEART_BOOST_BUNDLE_COST && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}> (need {HEART_BOOST_BUNDLE_COST - coins} more)</span>}
                  </button>
                )
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

      {showSanctuaryPanel && (
        <div
          className="island-stop-modal-backdrop"
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
            <p className="island-stop-modal__eyebrow">Spaceship Sanctuary</p>
            <h3 className="island-stop-modal__title">🐾 Creature Manifest</h3>
            <p className="island-stop-modal__copy">
              The ship now serves as home base for every creature you keep. Check their bond progress, open a detail card, and feed them to deepen the relationship over time.
            </p>

            <div className="island-run-sanctuary-panel__summary">
              <span className="island-run-sanctuary-panel__pill">Species: <strong>{collectedCreatures.length}</strong></span>
              <span className="island-run-sanctuary-panel__pill">Copies: <strong>{collectedCreatures.reduce((sum, creature) => sum + creature.copies, 0)}</strong></span>
              <span className="island-run-sanctuary-panel__pill">
                Active: <strong>{activeCompanion?.creature.name ?? 'None'}</strong>
              </span>
              <span className="island-run-sanctuary-panel__pill">Current island: <strong>{islandNumber}</strong></span>
              <span className="island-run-sanctuary-panel__pill">Rewards ready: <strong>{sanctuaryRewardReadyCount}</strong></span>
              <span className="island-run-sanctuary-panel__pill">Basic treats: <strong>{creatureTreatInventory.basic}</strong></span>
              <span className="island-run-sanctuary-panel__pill">Favorite snacks: <strong>{creatureTreatInventory.favorite}</strong></span>
              <span className="island-run-sanctuary-panel__pill">Rare feasts: <strong>{creatureTreatInventory.rare}</strong></span>
            </div>

            {!selectedSanctuaryCreature && collectedCreatures.length > 0 ? (
              <div className="island-run-sanctuary-toolbar">
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
                <label className="island-run-sanctuary-toolbar__sort">
                  <span>Sort</span>
                  <select value={sanctuarySortMode} onChange={(e) => setSanctuarySortMode(e.target.value as SanctuarySortMode)}>
                    <option value="recent">Reward ready / recent</option>
                    <option value="bond">Highest bond</option>
                    <option value="tier">Highest tier</option>
                    <option value="active">Active first</option>
                  </select>
                </label>
              </div>
            ) : null}

            {sanctuaryFeedback ? <p className="island-run-sanctuary-panel__feedback">{sanctuaryFeedback}</p> : null}

            {selectedSanctuaryCreature ? (
              <section className="island-run-sanctuary-detail">
                <div className="island-run-sanctuary-detail__header">
                  <img
                    className="island-run-sanctuary-detail__art"
                    src={getEggStageArtSrc(selectedSanctuaryCreature.creature.tier, 4)}
                    alt={`${selectedSanctuaryCreature.creature.name} sanctuary detail`}
                  />
                  <div className="island-run-sanctuary-detail__identity">
                    <p className="island-run-sanctuary-card__eyebrow">Island {selectedSanctuaryCreature.lastCollectedIslandNumber} · {selectedSanctuaryCreature.creature.tier}</p>
                    <h4 className="island-run-sanctuary-detail__title">{selectedSanctuaryCreature.creature.name}</h4>
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
                    onClick={() => setSelectedSanctuaryCreatureId(null)}
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
              </section>
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
              <div className="island-run-sanctuary-panel__grid">
                {visibleSanctuaryCreatures.map((creature) => (
                  <article key={creature.creatureId} className="island-run-sanctuary-card">
                    <img
                      className="island-run-sanctuary-card__art"
                      src={getEggStageArtSrc(creature.creature.tier, 4)}
                      alt={`${creature.creature.name} collected creature`}
                    />
                    <div className="island-run-sanctuary-card__body">
                      <p className="island-run-sanctuary-card__eyebrow">
                        Island {creature.lastCollectedIslandNumber} · {creature.creature.tier}
                      </p>
                      <h4 className="island-run-sanctuary-card__title">{creature.creature.name}</h4>
                      <p className="island-run-sanctuary-card__meta">Habitat: <strong>{creature.creature.habitat}</strong></p>
                      <p className="island-run-sanctuary-card__meta">Affinity: <strong>{creature.creature.affinity}</strong></p>
                      <p className="island-run-sanctuary-card__meta">Copies: <strong>x{creature.copies}</strong></p>
                      <p className="island-run-sanctuary-card__meta">Bond level: <strong>{creature.bondLevel}</strong> · Progress <strong>{creature.bondXp % CREATURE_BOND_XP_PER_LEVEL}/{CREATURE_BOND_XP_PER_LEVEL}</strong></p>
                      <p className="island-run-sanctuary-card__meta">
                        Companion bonus: <strong>{getCompanionBonusForCreature(creature.creature, creature.bondLevel).label}</strong>
                      </p>
                      <p className="island-run-sanctuary-card__meta">{getCompanionBonusForCreature(creature.creature, creature.bondLevel).description}</p>
                      <p className="island-run-sanctuary-card__meta">
                        Specialty: <strong>{getCreatureSpecialtyForCompanion(creature.creature, creature.bondLevel).label}</strong>
                      </p>
                      <p className="island-run-sanctuary-card__meta">{getCreatureSpecialtyForCompanion(creature.creature, creature.bondLevel).description}</p>
                      <p className="island-run-sanctuary-card__meta">
                        Next boost at bond level <strong>{getCompanionBonusForCreature(creature.creature, creature.bondLevel).nextBondMilestoneLevel}</strong>
                      </p>
                      {getUnclaimedBondMilestones(creature).length > 0 ? (
                        <div className="island-run-sanctuary-reward">
                          <p className="island-run-sanctuary-reward__title">Reward ready</p>
                          <p className="island-run-sanctuary-card__meta">
                            Bond level {getUnclaimedBondMilestones(creature)[0]} · {getBondMilestoneReward(getUnclaimedBondMilestones(creature)[0])?.summary}
                          </p>
                        </div>
                      ) : null}
                      <div className="island-run-sanctuary-card__progress" aria-hidden="true">
                        <span
                          className="island-run-sanctuary-card__progress-fill"
                          style={{ width: `${((creature.bondXp % CREATURE_BOND_XP_PER_LEVEL) / CREATURE_BOND_XP_PER_LEVEL) * 100}%` }}
                        />
                      </div>
                      <div className="island-hatchery-card__actions">
                        <button
                          type="button"
                          className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                          onClick={() => sanctuaryHandlers.openCreature(creature.creatureId)}
                        >
                          View Details
                        </button>
                        {getUnclaimedBondMilestones(creature).length > 0 ? (
                          <button
                            type="button"
                            className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                            onClick={() => sanctuaryHandlers.claimBondReward(creature.creatureId, getUnclaimedBondMilestones(creature)[0])}
                          >
                            Claim Reward
                          </button>
                        ) : null}
                        {activeCompanionId === creature.creatureId ? (
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
                            onClick={() => sanctuaryHandlers.setActiveCompanion(creature.creatureId)}
                          >
                            Set Active Companion
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
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

      {activeLaunchedMinigameId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, overflow: 'hidden' }}>
          <IslandRunMinigameLauncher
            minigameId={activeLaunchedMinigameId}
            islandNumber={islandNumber}
            onComplete={(result) => {
              if (result.completed && result.reward) {
                const { coins: rewardCoins = 0, dice: rewardDice = 0, hearts: rewardHearts = 0, spinTokens: rewardSpinTokens = 0 } = result.reward;
                if (rewardCoins > 0) {
                  setCoins((c) => c + rewardCoins);
                  void awardGold(session.user.id, rewardCoins, 'shooter_blitz', 'island_run_minigame_reward');
                }
                if (rewardDice > 0) setDicePool((d) => d + rewardDice);
                if (rewardHearts > 0) setHearts((h) => h + rewardHearts);
                if (rewardSpinTokens > 0) setSpinTokens((t) => t + rewardSpinTokens);
                // M17D: award wallet shards on minigame reward
                awardWalletShards(1);
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
              handleCompleteStopById('minigame');
            }}
          />
        </div>
      )}

      <IslandStoryReader
        manifestPath="/storyline/episode-001/manifest.json"
        isOpen={showStoryReader}
        onClose={handleCloseStoryReader}
        onRewardClaim={sanctuaryHandlers.storyRewardClaim}
      />

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
            void persistIslandRunRuntimeStatePatch({
              session,
              client,
              patch: { shardTierIndex: newTierIndex, shardClaimCount: newClaimCount },
            });
            setLandingText('Shard milestone claimed! +1 Lucky Roll run unlocked.');
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

    </section>
  );
}
