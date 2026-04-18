import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  CANONICAL_BOARD_SIZE,
  TILE_ANCHORS_40,
  TOKEN_START_TILE_INDEX,
  OUTER_STOP_ANCHORS,
  type TileAnchor,
} from '../services/islandBoardLayout';
import { BoardStage, type BoardStageCameraControls } from './board';
import {
  getIslandBoardThemeForIslandNumber,
  type IslandBoardTheme,
} from '../services/islandBoardThemes';
import { getIslandBackgroundImageSrc } from '../services/islandBackgrounds';
import { getIslandDisplayName } from '../services/islandNames';
import { generateTileMap, getIslandRarity, type IslandTileMapEntry } from '../services/islandBoardTileMap';
import { resolveIslandBoardProfile, type IslandBoardProfileId } from '../services/islandBoardProfiles';
import { resolveWrappedTokenIndex } from '../services/islandBoardTopology';
import { ISLAND_RUN_DEFAULT_STARTING_DICE } from '../services/islandRunEconomy';
import { generateIslandStopPlan } from '../services/islandRunStops';
import { isIslandFullyCleared } from '../services/islandRunProgression';
import { recordTelemetryEvent } from '../../../../services/telemetry';
import {
  ISLAND_RUN_RUNTIME_HYDRATION_FAILED_STAGE,
  ISLAND_RUN_RUNTIME_HYDRATION_STAGE,
  type IslandRunRuntimeHydrationSource,
  shouldEmitIslandRunRuntimeHydrationTelemetry,
} from '../services/islandRunRuntimeTelemetry';
import { useSupabaseAuth } from '../../../auth/SupabaseAuthProvider';
import { isDemoSession } from '../../../../services/demoSession';
import {
  hydrateIslandRunRuntimeStateWithSource,
  persistIslandRunRuntimeStatePatch,
  readIslandRunRuntimeState,
  resolveCollectibleForClaim,
  type IslandRunRuntimeState,
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
  type CreatureCollectionEntry,
} from '../services/creatureCollectionService';
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
  selectCreatureForEgg,
  type ShipZone,
} from '../services/creatureCatalog';
import {
  rankCreatureFitsForPlayer,
  selectPerfectCompanions,
  type PlayerHandContext,
} from '../services/creatureFitEngine';
import { readPerfectCompanionRuntimeConfig } from '../services/perfectCompanionConfig';
import { getDefaultZonePreferencesForArchetypes } from '../services/creatureArchetypeBridge';
import { logIslandRunEntryDebug, setIslandRunDebugRuntimeSnapshotProvider } from '../services/islandRunEntryDebug';
import { logGameSession } from '../../../../services/gameRewards';
import { awardGold } from '../../daily-treats/luckyRollTileEffects';
import { awardLuckyRollRuns } from '../../../../services/luckyRollAccess';
import {
  playIslandRunSound,
  triggerIslandRunHaptic,
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
import { executeIslandRunRollAction } from '../services/islandRunRollAction';
import {
  applyEssenceDrift,
  awardIslandRunContractV2Essence,
  getEffectiveIslandNumber,
  getIslandTotalEssenceCost,
  getStopUpgradeCost,
  initStopBuildStatesForIsland,
  isStopBuildFullyComplete,
  MAX_BUILD_LEVEL,
  resolveIslandRunContractV2EssenceEarnForTile,
  spendIslandRunContractV2EssenceOnStopBuild,
} from '../services/islandRunContractV2EssenceBuild';
import {
  applyIslandRunContractV2RewardBarProgress,
  claimIslandRunContractV2RewardBar,
  ensureIslandRunContractV2ActiveTimedEvent,
  resolveChainedRewardBarClaims,
  resolveNextRewardKind,
  REWARD_KIND_ICON,
  TIMED_EVENT_SEQUENCE,
  resolveAvailableMultiplierTiers,
  clampMultiplierToPool,
  resolveDiceCostForMultiplier,
  type RewardBarClaimPayout,
} from '../services/islandRunContractV2RewardBar';
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
} from '../services/islandRunContractV2StopResolver';
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
import { scheduleEggHatchNotification } from '../../../../services/habitAlertNotifications';
import {
  type DiceRegenState,
} from '../services/islandRunDiceRegeneration';
import { IslandRunDebugPanel, type IslandRunDebugLocalState } from './IslandRunDebugPanel';

const ROLL_MIN = 1;
const ROLL_MAX = 6;
const DICE_PER_ROLL = 2;
const SPIN_MIN = 1;
const SPIN_MAX = 5;
// Island duration: 72 hours for special islands, 48 hours for standard islands.
const ISLAND_DURATION_SEC = 72 * 60 * 60;
const ISLAND_RUN_RUNTIME_MIGRATION_COMPLETE = true;
// Canonical contract is now enforced as source-of-truth runtime behavior.
// Legacy pre-contract-v2 movement/energy rules are intentionally disabled.
const ISLAND_RUN_CONTRACT_V2_ENABLED = true;
function resolveRequestedBoardProfileId(): IslandBoardProfileId {
  if (typeof window === 'undefined') return 'spark40_ring';
  const query = new URLSearchParams(window.location.search).get('boardProfile')?.trim().toLowerCase();
  if (query === 'spark40' || query === 'spark40_ring' || query === 'spark40' || query === 'spark40_preview') return 'spark40_ring';
  return 'spark40_ring';
}
const ACTIVE_BOARD_PROFILE = resolveIslandBoardProfile(resolveRequestedBoardProfileId());
const PERFECT_COMPANION_MODEL_VERSION = 'phase3_v1';
// Temporary diagnostics for Stop 1↔2 flicker + roll lock on Island 120 startup.
const ISLAND_RUN_120_STARTUP_DIAGNOSTIC_ISLAND = 120;
const ISLAND_RUN_120_STARTUP_DIAGNOSTIC_WINDOW_MS = 10_000;
const ISLAND_RUN_120_STOP_PAIR_DELIMITER = '_to_';

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
  if (before.hearts !== after.hearts) changedKeys.push('hearts');
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

// M8-COMPLETE: utility stop costs
const UTILITY_HEART_REFILL_COST = 50;
const UTILITY_DICE_BONUS_COST = 30;
const UTILITY_TIMER_EXT_COST_DIAMONDS = 3;
const UTILITY_TIMER_EXT_HOURS = 12;
const UTILITY_ESSENCE_BONUS_COST_DIAMONDS = 3;
const UTILITY_ESSENCE_BONUS_AMOUNT = 15;
const CONTRACT_V2_ESSENCE_SPEND_STEP = 10;
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
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

/* ── Reward bar helpers ──────────────────────────────────────── */
const TIMER_OK_THRESHOLD_MS = 4 * 60 * 60 * 1000;    // > 4 h  → green
const TIMER_WARN_THRESHOLD_MS = 1 * 60 * 60 * 1000;  // 1–4 h → orange; < 1 h → red
const DICE_ROLL_OVERLAY_DURATION_MS = 800;  // how long the "Rolled N!" overlay stays visible

const EVENT_BANNER_META: Readonly<Record<string, { icon: string; displayName: string }>> = {
  feeding_frenzy:   { icon: '🔥', displayName: 'Feeding Frenzy' },
  harvest_sprint:   { icon: '🌾', displayName: 'Harvest Sprint' },
  companion_feast:  { icon: '🐾', displayName: 'Companion Feast' },
  lucky_spin:       { icon: '🎰', displayName: 'Lucky Spin' },
};

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

type SanctuaryFilterMode = 'all' | 'reward_ready' | 'active' | 'common' | 'rare' | 'mythic';
type SanctuarySortMode = 'recent' | 'bond' | 'tier' | 'active';
type SanctuaryZoneFilter = 'all' | ShipZone;
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
      return { level, label: 'Level 3 Cache', summary: '+15 essence', essence: 15 };
    case 5:
      return { level, label: 'Level 5 Care Pack', summary: '+8 dice', dice: 8 };
    case 8:
      return { level, label: 'Level 8 Momentum Pack', summary: '+1 spin token', spinTokens: 1 };
    case 10:
      return { level, label: "Level 10 Captain's Stash", summary: '+25 essence, +8 dice', essence: 25, dice: 8 };
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

function getBossReward(islandNumber: number): { dice: number; essence: number; spinTokens: number } {
  const tier = Math.floor((islandNumber - 1) / 10);
  return {
    dice: 10 + tier * 2,
    essence: 80 + tier * 25,
    spinTokens: tier >= 2 ? 1 : 0,
  };
}

type StopProgressState = 'pending' | 'active' | 'completed' | 'partial' | 'locked';
type IslandRunCameraMode = 'board_follow' | 'stop_focus' | 'overview_manual';



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
};

type MysteryStopReward =
  | { type: 'coins'; amount: number; message: string }
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
  if (randomValue < 0.82) return { type: 'dice', amount: 6, message: '🎲 Mystery recovery! +6 dice.' };

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
  if (state === 'partial') return '🟡';
  if (state === 'active') return '🔓';
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

const SPARK60_TILE_COLOR: Record<IslandTileMapEntry['tileType'], string> = {
  currency: '#f7df7a',
  chest: '#7dd8ff',
  event: '#d39bff',
  hazard: '#ff8f8f',
  egg_shard: '#9ef0ff',
  micro: '#9dffbe',
  encounter: '#ffa765',
  stop: '#7afcff',
};

interface IslandRunBoardPrototypeProps {
  session: Session;
  initialPanel?: 'default' | 'sanctuary';
}

export function IslandRunBoardPrototype({ session, initialPanel = 'default' }: IslandRunBoardPrototypeProps) {
  const { client } = useSupabaseAuth();
  const activeTileAnchors = useMemo(
    () => TILE_ANCHORS_40,
    [],
  );
  const isSpark40BoardProfile = ACTIVE_BOARD_PROFILE.id === 'spark40_ring';
  const boardRef = useRef<HTMLDivElement>(null);
  const topbarMenuRef = useRef<HTMLDivElement>(null);
  const topbarMenuFirstItemRef = useRef<HTMLButtonElement>(null);
  // M16D: track previous shard count to detect island-travel reset (snap fill bar to 0, no animation)
  const prevShardsRef = useRef<number>(0);
  const [shardFillNoTransition, setShardFillNoTransition] = useState(false);
  const [showDebug, setShowDebug] = useState(() => new URLSearchParams(window.location.search).get('debugBoard') === '1');
  const boardRenderTuning = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      showQaHooks: params.get('islandRunQa') === '1',
      isMinimalBoardArt: params.get('minimalBoardArt') === '1',
      boardTiltXDeg: readNumericParam(params, 'boardTiltX', 40, 0, 80),
      boardRotateZDeg: readNumericParam(params, 'boardRotateZ', 0, -45, 45),
    };
  }, []);
  const { showQaHooks, isMinimalBoardArt, boardTiltXDeg, boardRotateZDeg } = boardRenderTuning;
  const [boardSize, setBoardSize] = useState({ width: 360, height: 640 });
  const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);
  const [isHudCollapsed, setIsHudCollapsed] = useState(true);
  const [showTopbarMenu, setShowTopbarMenu] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [cameraMode, setCameraMode] = useState<IslandRunCameraMode>('board_follow');
  const [focusedStopId, setFocusedStopId] = useState<string | null>(null);

  // BoardStage camera controls (set by BoardStage via onCameraReady)
  const boardCameraRef = useRef<BoardStageCameraControls | null>(null);
  // Guard: prevent repeated stop-focus camera jumps after initial hydration
  const hasAppliedInitialStopFocusRef = useRef(false);

  const [dicePool, setDicePool] = useState(ISLAND_RUN_DEFAULT_STARTING_DICE);
  const [tokenIndex, setTokenIndex] = useState(TOKEN_START_TILE_INDEX);
  const [rollValue, setRollValue] = useState<number | null>(null);
  const [rollingDiceFaces, setRollingDiceFaces] = useState<[number, number]>([1, 1]);
  const [isRolling, setIsRolling] = useState(false);
  /** Shown briefly over the dice after the roll animation finishes (e.g. "Rolled 8!") */
  const [diceRollTotalOverlay, setDiceRollTotalOverlay] = useState<string | null>(null);
  /** Full tile-by-tile hop sequence for current roll (Monopoly GO style). */
  const [pendingHopSequence, setPendingHopSequence] = useState<number[] | null>(null);
  const hopSequenceResolverRef = useRef<(() => void) | null>(null);
  const diceRollCompleteResolverRef = useRef<(() => void) | null>(null);
  // Cleanup: resolve any pending hop sequence promise on unmount to prevent leaks
  useEffect(() => () => {
    hopSequenceResolverRef.current?.();
    hopSequenceResolverRef.current = null;
    diceRollCompleteResolverRef.current?.();
    diceRollCompleteResolverRef.current = null;
  }, []);
  const [landingText, setLandingText] = useState('Ready to roll');
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [islandNumber, setIslandNumber] = useState(1);
  const activeTheme = useMemo(() => getIslandBoardThemeForIslandNumber(islandNumber), [islandNumber]);
  const islandBackgroundSrc = useMemo(() => getIslandBackgroundImageSrc(islandNumber), [islandNumber]);
  const [isIslandBackgroundAvailable, setIsIslandBackgroundAvailable] = useState(true);
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
  // M19A: diamonds wallet currency now runtime-state backed for cross-device sync.
  const [diamonds, setDiamonds] = useState<number>(3);
  // M16C: true when islandShards >= current tier threshold; cleared on player claim (M16E)
  const [shardMilestoneReached, setShardMilestoneReached] = useState<boolean>(false);
  // M16E: tier index of a pending (unclaimed) milestone; null when no claim is waiting
  const [pendingClaimTierIndex, setPendingClaimTierIndex] = useState<number | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [mysteryStopReward, setMysteryStopReward] = useState<MysteryStopReward | null>(null);
  const [marketPurchaseFeedback, setMarketPurchaseFeedback] = useState<string | null>(null);
  const [marketOwnedBundles, setMarketOwnedBundles] = useState<Record<'dice_bundle', boolean>>({
    dice_bundle: false,
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
  const [hasHydratedRuntimeState, setHasHydratedRuntimeState] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  // M4-COMPLETE: cycleIndex tracks full laps through 120 islands (island 120 → 1 increments this)
  const [cycleIndex, setCycleIndex] = useState<number>(0);
  // Effective island number for all cost/earn scaling: (cycleIndex × 120 + islandNumber).
  // Island 1 on cycle 1 becomes effective island 121, giving cycle-over-cycle cost escalation.
  const effectiveIslandNumber = cycleIndex * 120 + islandNumber;
  const boardProfileExposureTrackedRef = useRef(false);


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
    if (!showTopbarMenu) {
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
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowTopbarMenu(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [showTopbarMenu]);

  useEffect(() => {
    if (!showTopbarMenu) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      topbarMenuFirstItemRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showTopbarMenu]);

  // B1-3: tile map state — regenerated when islandNumber or dayIndex changes
  const [islandStartedAtMs, setIslandStartedAtMs] = useState<number>(() => Date.now());
  const [islandExpiresAtMs, setIslandExpiresAtMs] = useState<number>(() => Date.now() + getIslandDurationMs(1));
  const [tileMap, setTileMap] = useState<IslandTileMapEntry[]>(() => generateTileMap(1, 'normal', 'forest', 0, { profileId: ACTIVE_BOARD_PROFILE.id }));

  // B2-1: legacy wallet field.
  // In contract-v2 this wallet currently tracks minigame/event tokens (not movement spins).
  const [spinTokens, setSpinTokens] = useState(0);

  // B3-2: minigame launcher state (M11B framework)
  const [activeLaunchedMinigameId, setActiveLaunchedMinigameId] = useState<string | null>(null);

  // B3-3: market interaction gate
  const [marketInteracted, setMarketInteracted] = useState(false);

  // Egg-ready in-app banner: shown when egg transitions to stage 4 or on app open with ready egg
  const [showEggReadyBanner, setShowEggReadyBanner] = useState(false);

  // M14: persistent shop panel state
  const [showShopPanel, setShowShopPanel] = useState(false);
  const [showMarketPanel, setShowMarketPanel] = useState(false);
  const [showBuildPanel, setShowBuildPanel] = useState(false);
  const [showRewardDetailsModal, setShowRewardDetailsModal] = useState(false);
  const [showOutOfDicePurchasePrompt, setShowOutOfDicePurchasePrompt] = useState(false);
  const [isStartingDiceCheckout, setIsStartingDiceCheckout] = useState(false);
  const [diceCheckoutError, setDiceCheckoutError] = useState<string | null>(null);
  const [showSanctuaryPanel, setShowSanctuaryPanel] = useState(false);

  // ── Dice multiplier (dice-pool-gated, Monopoly GO style) ────────────────────
  const [diceMultiplier, setDiceMultiplier] = useState(1);

  // Derived: available tiers (with unlocked status), effective cost, and auto-clamp
  const multiplierTiers = resolveAvailableMultiplierTiers(dicePool);
  const effectiveMultiplier = clampMultiplierToPool(diceMultiplier, dicePool);
  const effectiveDiceCost = resolveDiceCostForMultiplier(effectiveMultiplier);

  // Auto-downgrade multiplier when pool drops below current tier's gate
  // (e.g. after a roll drains dice below the ×10 threshold)
  useEffect(() => {
    if (effectiveMultiplier !== diceMultiplier) {
      setDiceMultiplier(effectiveMultiplier);
    }
  }, [effectiveMultiplier, diceMultiplier]);

  // ── Dice regen countdown (Monopoly GO style: "X rolls ready in MM:SS") ────
  const [diceRegenCountdown, setDiceRegenCountdown] = useState<string | null>(null);
  const [diceRegenRollsReady, setDiceRegenRollsReady] = useState<number | null>(null);

  // NOTE: The useEffect for the dice regen countdown timer is placed after runtimeState declaration below.

  // ── Reward bar animation state ─────────────────────────────────────────────
  const [rewardBarBurstAnimating, setRewardBarBurstAnimating] = useState(false);
  const [rewardBarCascadePayouts, setRewardBarCascadePayouts] = useState<RewardBarClaimPayout[]>([]);
  const [feedParticleActive, setFeedParticleActive] = useState(false);

  // ── Minigame popup dialog ──────────────────────────────────────────────────
  const [showMinigameDialog, setShowMinigameDialog] = useState(false);

  // ── Sticker album dialog ───────────────────────────────────────────────────
  const [showStickerAlbumDialog, setShowStickerAlbumDialog] = useState(false);

  const [creatureCollection, setCreatureCollection] = useState(() => fetchCreatureCollection(session.user.id));
  const [activeCompanionId, setActiveCompanionId] = useState<string | null>(() => fetchActiveCompanionId(session.user.id));
  const [selectedSanctuaryCreatureId, setSelectedSanctuaryCreatureId] = useState<string | null>(null);
  const [sanctuaryFeedback, setSanctuaryFeedback] = useState<string | null>(null);
  const [sanctuaryClockMs, setSanctuaryClockMs] = useState(() => Date.now());
  const [sanctuaryFilterMode, setSanctuaryFilterMode] = useState<SanctuaryFilterMode>('all');
  const [sanctuaryZoneFilter, setSanctuaryZoneFilter] = useState<SanctuaryZoneFilter>('all');
  const [sanctuarySortMode, setSanctuarySortMode] = useState<SanctuarySortMode>('recent');
  const [companionQuestProgress, setCompanionQuestProgress] = useState<CompanionQuestProgress>(() =>
    readCompanionQuestProgress(session.user.id),
  );
  const [companionQuestTop3ViewedDayKey, setCompanionQuestTop3ViewedDayKey] = useState<string | null>(null);
  const [creatureTreatInventory, setCreatureTreatInventory] = useState(() => fetchCreatureTreatInventory(session.user.id));
  const [showPerfectCompanionOnboardingHint, setShowPerfectCompanionOnboardingHint] = useState(false);
  const [perfectCompanionOnboardingCreatureId, setPerfectCompanionOnboardingCreatureId] = useState<string | null>(null);
  const [perfectCompanionOnboardingCreatureName, setPerfectCompanionOnboardingCreatureName] = useState<string | null>(null);

  const [showStoryReader, setShowStoryReader] = useState(false);
  const storySeenStorageKey = `island_run_story_seen_prologue_${session.user.id}`;

  useEffect(() => {
    if (
      showTopbarMenu &&
      (showShopPanel ||
        showMarketPanel ||
        showBuildPanel ||
        showOutOfDicePurchasePrompt ||
        showRewardDetailsModal ||
        showMinigameDialog ||
        showStickerAlbumDialog ||
        showSanctuaryPanel ||
        showStoryReader ||
        showEncounterModal ||
        showClaimModal)
    ) {
      setShowTopbarMenu(false);
    }
  }, [
    showBuildPanel,
    showClaimModal,
    showEncounterModal,
    showMarketPanel,
    showOutOfDicePurchasePrompt,
    showRewardDetailsModal,
    showSanctuaryPanel,
    showShopPanel,
    showStoryReader,
    showTopbarMenu,
  ]);

  // B3-4: utility stop state
  const [utilityInteracted, setUtilityInteracted] = useState(false);
  const [islandIntention, setIslandIntention] = useState('');

  // B3-5: island clear celebration
  const [showIslandClearCelebration, setShowIslandClearCelebration] = useState(false);
  const [islandClearStats, setIslandClearStats] = useState<{ islandNumber: number; diceEarned: number; essenceEarned: number; stopsCleared: number } | null>(null);

  const [runtimeState, setRuntimeState] = useState(() => readIslandRunRuntimeState(session));
  const [runtimeHydrationSource, setRuntimeHydrationSource] = useState<IslandRunRuntimeHydrationSource | null>(null);
  const activeSessionStatusMessage = null;
  const isRetryingSync = false;
  const [perfectCompanionRuntimeConfig, setPerfectCompanionRuntimeConfig] = useState(() => readPerfectCompanionRuntimeConfig(session.user.id));
  const runtimeStateRef = useRef(runtimeState);
  // Guard ref to prevent persist effects from writing stale local state before
  // the hydration effect has applied server values to local state. This prevents
  // the write amplification loop where persist effects see {coins: 0} (initial)
  // vs runtimeState.coins = 30 (hydrated) and emit a redundant write.
  const hasCompletedInitialHydrationSyncRef = useRef(false);
  const companionBonusAppliedVisitKeyRef = useRef<string | null>(null);
  const isOnboardingComplete = Boolean(session.user.user_metadata?.onboarding_complete);
  const isFirstRunClaimed = runtimeState.firstRunClaimed;
  const island120StartupDiagnosticSessionStartMsRef = useRef<number | null>(null);
  const island120StartupSnapshotLoggedRef = useRef(false);
  const island120PendingStopTransitionRef = useRef<{
    source: string;
    requestedStopId: string | null;
  } | null>(null);
  const island120PrevActiveStopIdRef = useRef<string | null>(null);
  const island120ToggleHintCounterByPairRef = useRef<Record<string, number>>({});
  const isIsland120StartupDiagnosticActive = isIsland120StartupDiagnosticTarget(
    runtimeState.currentIslandNumber ?? islandNumber,
  );

  useEffect(() => {
    runtimeStateRef.current = runtimeState;
  }, [runtimeState]);

  // ── Dice regen countdown timer (lives after runtimeState so it can read diceRegenState) ──
  // Uses real elapsed time since lastRegenAtMs so the countdown decrements every
  // second and works correctly when the PWA is reopened after being in the background.
  useEffect(() => {
    const regenState: DiceRegenState | null = runtimeState.diceRegenState ?? null;
    if (!regenState || dicePool >= regenState.maxDice) {
      setDiceRegenCountdown(null);
      setDiceRegenRollsReady(null);
      return;
    }

    function tick() {
      if (!regenState) return;
      const now = Date.now();
      const deficit = Math.max(0, regenState.maxDice - dicePool);
      // How long it takes to fill the full deficit
      const hoursToFill = deficit / Math.max(1, regenState.regenRatePerHour);
      const msToFill = hoursToFill * 60 * 60 * 1000;
      // Elapsed time since last regen tick
      const elapsedMs = Math.max(0, now - regenState.lastRegenAtMs);
      // Remaining = total fill time minus what already elapsed
      const msRemaining = Math.max(0, msToFill - elapsedMs);

      // Rolls ready at full = maxDice / DICE_PER_ROLL
      const totalRollsAtFull = Math.floor(regenState.maxDice / DICE_PER_ROLL);

      const remainingSec = Math.max(0, Math.ceil(msRemaining / 1000));
      const minutes = Math.floor(remainingSec / 60);
      const seconds = remainingSec % 60;
      const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      setDiceRegenCountdown(timeStr);
      setDiceRegenRollsReady(totalRollsAtFull);
    }

    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [dicePool, runtimeState.diceRegenState]);

  useEffect(() => {
    setPerfectCompanionRuntimeConfig(readPerfectCompanionRuntimeConfig(session.user.id));
  }, [session.user.id]);

  const isReconcilingRuntimeStateRef = useRef(false);
  const reconcileRuntimeState = useCallback(async (
    reason: 'focus' | 'visibility',
  ) => {
    if (!client || isReconcilingRuntimeStateRef.current || !hasHydratedRuntimeState) {
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
      if (incomingRuntimeVersion <= currentRuntimeVersion) {
        return;
      }

      const changedKeys = collectHydrationChangedKeysForDiagnostics({
        before: runtimeStateRef.current,
        after: hydrationResult.state,
        islandNumber: hydrationResult.state.currentIslandNumber,
      });
      setRuntimeState(hydrationResult.state);
      logIslandRunEntryDebug('island_run_runtime_reconciled', {
        userId: session.user.id,
        reason,
        previousRuntimeVersion: currentRuntimeVersion,
        incomingRuntimeVersion,
        currentIslandNumber: hydrationResult.state.currentIslandNumber,
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
  }, [client, hasHydratedRuntimeState, session]);

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
      performIslandTravel(persistedIsland + 1, { startTimer: false });
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
        const updatedEntry: PerIslandEggEntry = { ...ledgerEntry, status: 'ready' };
        const updatedLedger = { ...runtimeState.perIslandEggs, [islandKey]: updatedEntry };
        setRuntimeState((prev) => ({ ...prev, perIslandEggs: updatedLedger }));
        if (client) {
          void persistIslandRunRuntimeStatePatch({ session, client, patch: { perIslandEggs: updatedLedger } });
        }
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

    setTokenIndex(runtimeState.tokenIndex ?? TOKEN_START_TILE_INDEX);
    setCoins(runtimeState.coins ?? 0);
    setSpinTokens(runtimeState.spinTokens ?? 0);
    setDicePool(runtimeState.dicePool ?? ISLAND_RUN_DEFAULT_STARTING_DICE);

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
      setMarketOwnedBundles({
        dice_bundle: Boolean(runtimeOwnedBundles.dice_bundle),
      });
    } else if (!ISLAND_RUN_RUNTIME_MIGRATION_COMPLETE) {
      const localStorageKey = `island_run_shop_owned_${session.user.id}_island_${persistedIsland}`;
      try {
        const raw = window.localStorage.getItem(localStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, boolean>;
          if (parsed && typeof parsed === 'object') {
            setMarketOwnedBundles({
              dice_bundle: Boolean(parsed.dice_bundle),
            });
          } else {
            setMarketOwnedBundles({ dice_bundle: false });
          }
        } else {
          setMarketOwnedBundles({ dice_bundle: false });
        }
      } catch {
        setMarketOwnedBundles({ dice_bundle: false });
      }
    } else {
      setMarketOwnedBundles({ dice_bundle: false });
    }
    // M4-COMPLETE: Restore cycleIndex from runtime state
    setCycleIndex(runtimeState.cycleIndex ?? 0);
    setAudioEnabled(runtimeState.audioEnabled ?? true);
    setIslandRunAudioEnabled(runtimeState.audioEnabled ?? true);
    setActiveCompanionId(runtimeState.activeCompanionId ?? fetchActiveCompanionId(session.user.id));
    setCreatureTreatInventory(runtimeState.creatureTreatInventory ?? fetchCreatureTreatInventory(session.user.id));

    // Mark initial hydration sync as complete so persist effects can now safely write.
    // This prevents the write amplification loop by ensuring local state (coins, hearts,
    // etc.) has been synced from runtimeState before persist effects compare them.
    hasCompletedInitialHydrationSyncRef.current = true;
  }, [hasHydratedRuntimeState, runtimeState.activeCompanionId, runtimeState.activeEggHatchDurationMs, runtimeState.activeEggIsDormant, runtimeState.activeEggSetAtMs, runtimeState.activeEggTier, runtimeState.audioEnabled, runtimeState.bossTrialResolvedIslandNumber, runtimeState.currentIslandNumber, runtimeState.cycleIndex, runtimeState.perIslandEggs, runtimeState.islandStartedAtMs, runtimeState.islandExpiresAtMs, runtimeState.islandShards, runtimeState.tokenIndex, runtimeState.hearts, runtimeState.coins, runtimeState.spinTokens, runtimeState.dicePool, runtimeState.shardTierIndex, runtimeState.shardClaimCount, runtimeState.shields, runtimeState.shards, runtimeState.diamonds, runtimeState.creatureTreatInventory, runtimeState.marketOwnedBundlesByIsland, session.user.id]);

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
      : (() => {
          if (ISLAND_RUN_RUNTIME_MIGRATION_COMPLETE) return [];
          if (typeof window === 'undefined') return [];
          const key = `island_run_stops_${session.user.id}_island_${targetIslandNumber}`;
          try {
            const raw = window.localStorage.getItem(key);
            if (!raw) return [];
            const parsed = JSON.parse(raw) as unknown;
            return Array.isArray(parsed)
              ? parsed.filter((x): x is string => typeof x === 'string')
              : [];
          } catch {
            return [];
          }
        })();
    const currentIslandEggEntry = runtimeState.perIslandEggs?.[String(runtimeState.currentIslandNumber ?? islandNumber)] ?? null;
    const hasActiveEggOnLoad = currentIslandEggEntry?.status === 'incubating'
      || currentIslandEggEntry?.status === 'ready'
      || Boolean(
        !currentIslandEggEntry
        && runtimeState.activeEggTier
        && runtimeState.activeEggSetAtMs
        && runtimeState.activeEggHatchDurationMs,
      );
    const islandEggSlotUsedOnLoad = currentIslandEggEntry?.status === 'collected'
      || currentIslandEggEntry?.status === 'sold';
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
        currentIslandEggStatus: currentIslandEggEntry?.status ?? null,
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

    if (openIslandStopOnLoad === 'boss' || openIslandStopOnLoad === 'dynamic') {
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
        currentIslandEggStatus: currentIslandEggEntry?.status ?? null,
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
      setMarketOwnedBundles({
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
    setRuntimeState(localSnapshotBeforeHydration);

    void hydrateIslandRunRuntimeStateWithSource({ session, client })
      .then((hydrationResult) => {
        if (!isActive) return;
        setRuntimeHydrationSource(hydrationResult.source);
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
  const isOwnershipBlocked = false;

  const retryRuntimeSync = useCallback(async () => {
    logIslandRunEntryDebug('island_run_runtime_retry_sync_started', {
      userId: session.user.id,
    });
    try {
      const hydrationResult = await hydrateIslandRunRuntimeStateWithSource({ session, client, forceRemote: true });
      setRuntimeHydrationSource(hydrationResult.source);
      setRuntimeState(hydrationResult.state);

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
  }, [client, session.user.id]);

  useEffect(() => {
    if (!hasHydratedRuntimeState || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const onFocus = () => {
      void reconcileRuntimeState('focus');
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void reconcileRuntimeState('visibility');
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [hasHydratedRuntimeState, reconcileRuntimeState]);

  useEffect(() => {
    setIsDisplayNameLoopCompleted(runtimeState.onboardingDisplayNameLoopCompleted === true);
  }, [runtimeState.onboardingDisplayNameLoopCompleted]);

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
    if (!hasHydratedRuntimeState) return;
    // Guard: Skip until the initial hydration sync effect has applied server values
    // to local state. This prevents the write amplification loop.
    if (!hasCompletedInitialHydrationSyncRef.current) return;
    if (runtimeState.onboardingDisplayNameLoopCompleted === isDisplayNameLoopCompleted) return;
    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: { onboardingDisplayNameLoopCompleted: isDisplayNameLoopCompleted },
    });
    setRuntimeState((current) => ({
      ...current,
      onboardingDisplayNameLoopCompleted: isDisplayNameLoopCompleted,
    }));
  }, [client, hasHydratedRuntimeState, isDisplayNameLoopCompleted, runtimeState.onboardingDisplayNameLoopCompleted, session]);

  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    // Guard: Skip until the initial hydration sync effect has applied server values
    // to local state. This prevents the write amplification loop.
    if (!hasCompletedInitialHydrationSyncRef.current) return;
    if (runtimeState.audioEnabled === audioEnabled) return;
    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: { audioEnabled },
    });
    setRuntimeState((current) => ({
      ...current,
      audioEnabled,
    }));
  }, [audioEnabled, client, hasHydratedRuntimeState, runtimeState.audioEnabled, session]);

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

  // B3-5: island clear celebration auto-dismiss
  useEffect(() => {
    if (showIslandClearCelebration) {
      const t = window.setTimeout(() => setShowIslandClearCelebration(false), 4000);
      return () => window.clearTimeout(t);
    }
  }, [showIslandClearCelebration]);

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

  const getStoredCompletedStopsForIsland = useCallback((targetIslandNumber: number): string[] => {
    const persistedStops = runtimeState.completedStopsByIsland?.[String(targetIslandNumber)];
    if (Array.isArray(persistedStops)) {
      return persistedStops.filter((x): x is string => typeof x === 'string');
    }

    if (typeof window === 'undefined') {
      return [];
    }

    if (ISLAND_RUN_RUNTIME_MIGRATION_COMPLETE) {
      return [];
    }

    const key = `island_run_stops_${session.user.id}_island_${targetIslandNumber}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === 'string')
        : [];
    } catch {
      return [];
    }
  }, [runtimeState.completedStopsByIsland, session.user.id]);

  // M11D: restore completedStops from table-backed runtime state first; fallback to localStorage
  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    const storedStops = getStoredCompletedStopsForIsland(islandNumber);
    if (storedStops.length > 0) {
      setCompletedStops((current) => (areStringArraysEqual(current, storedStops) ? current : storedStops));
      return;
    }
    setCompletedStops((current) => (current.length === 0 ? current : []));
  }, [getStoredCompletedStopsForIsland, hasHydratedRuntimeState, islandNumber]);

  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    // Only set stop-focus camera on first hydration. Subsequent completedStops
    // changes (e.g. during gameplay) must not hijack the camera from the token
    // animation follow mode — that causes the "shaking back and forth" bug.
    if (hasAppliedInitialStopFocusRef.current) return;
    const nextActiveStop = islandStopPlan.find((stop) => !completedStops.includes(stop.stopId));
    if (!nextActiveStop) return;
    hasAppliedInitialStopFocusRef.current = true;
    setFocusedStopId(nextActiveStop.stopId);
    setCameraMode('stop_focus');
  }, [completedStops, hasHydratedRuntimeState, islandNumber, islandStopPlan]);

  const focusNextAvailableStop = useCallback(() => {
    const nextActiveStop = islandStopPlan.find((stop) => !completedStops.includes(stop.stopId));
    if (!nextActiveStop) return;
    setFocusedStopId(nextActiveStop.stopId);
    setCameraMode('stop_focus');
    setLandingText(`Focused on ${nextActiveStop.title}.`);
  }, [completedStops, islandStopPlan]);

  // M11D: persist completedStops to both localStorage and Supabase runtime state
  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    // Guard: Skip until the initial hydration sync effect has applied server values
    // to local state. This prevents the write amplification loop.
    if (!hasCompletedInitialHydrationSyncRef.current) return;
    if (!ISLAND_RUN_RUNTIME_MIGRATION_COMPLETE) {
      const key = `island_run_stops_${session.user.id}_island_${islandNumber}`;
      try {
        window.localStorage.setItem(key, JSON.stringify(completedStops));
      } catch {
        // ignore storage errors
      }
    }
    const islandKey = String(islandNumber);
    const persistedStops = runtimeState.completedStopsByIsland?.[islandKey] ?? [];
    if (areStringArraysEqual(persistedStops, completedStops)) {
      return;
    }
    const patch = { [islandKey]: completedStops };
    const nextRuntimeState = {
      ...runtimeStateRef.current,
      completedStopsByIsland: {
        ...runtimeStateRef.current.completedStopsByIsland,
        ...patch,
      },
    };
    void writeIslandRunGameStateRecord({
      session,
      client,
      record: nextRuntimeState,
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
    // Guard: Skip until the initial hydration sync effect has applied server values
    // to local state. This prevents the write amplification loop where this effect
    // sees stale local state (e.g., coins=0 from useState default) before the
    // hydration effect applies the correct value (e.g., coins=30 from server).
    if (!hasCompletedInitialHydrationSyncRef.current) return;

    const nextPatch = {
      tokenIndex,
      coins,
      spinTokens,
      dicePool,
    };

    if (
      runtimeState.tokenIndex === nextPatch.tokenIndex
      && runtimeState.coins === nextPatch.coins
      && runtimeState.spinTokens === nextPatch.spinTokens
      && runtimeState.dicePool === nextPatch.dicePool
    ) {
      return;
    }

    const nextRuntimeState = {
      ...runtimeStateRef.current,
      ...nextPatch,
    };
    void writeIslandRunGameStateRecord({
      session,
      client,
      record: nextRuntimeState,
    });
    setRuntimeState((current) => ({ ...current, ...nextPatch }));
  }, [client, coins, dicePool, hasHydratedRuntimeState, runtimeState.coins, runtimeState.dicePool, runtimeState.spinTokens, runtimeState.tokenIndex, session, spinTokens, tokenIndex]);

  // M19A: persist diamonds to runtime state (cross-device)
  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    // Guard: Skip until the initial hydration sync effect has applied server values
    // to local state. This prevents the write amplification loop.
    if (!hasCompletedInitialHydrationSyncRef.current) return;
    if (runtimeState.diamonds === diamonds) return;
    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: { diamonds },
    });
    setRuntimeState((current) => ({ ...current, diamonds }));
  }, [client, diamonds, hasHydratedRuntimeState, runtimeState.diamonds, session]);

  // M19A: persist market owned state to runtime state map (and mirror legacy local storage key for compatibility)
  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    // Guard: Skip until the initial hydration sync effect has applied server values
    // to local state. This prevents the write amplification loop.
    if (!hasCompletedInitialHydrationSyncRef.current) return;
    const islandKey = String(islandNumber);
    const persisted = runtimeState.marketOwnedBundlesByIsland?.[islandKey];
    if (
      persisted
      && persisted.dice_bundle === marketOwnedBundles.dice_bundle
    ) {
      return;
    }
    const patch = {
      [islandKey]: {
        dice_bundle: marketOwnedBundles.dice_bundle,
        heart_bundle: false,
        heart_boost_bundle: false,
      },
    };
    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: { marketOwnedBundlesByIsland: patch },
    });
    setRuntimeState((current) => ({
      ...current,
      marketOwnedBundlesByIsland: {
        ...current.marketOwnedBundlesByIsland,
        ...patch,
      },
    }));

    if (!ISLAND_RUN_RUNTIME_MIGRATION_COMPLETE) {
      const key = `island_run_shop_owned_${session.user.id}_island_${islandNumber}`;
      try {
        window.localStorage.setItem(key, JSON.stringify(marketOwnedBundles));
      } catch {
        // ignore storage errors
      }
    }
  }, [client, hasHydratedRuntimeState, islandNumber, marketOwnedBundles, runtimeState.marketOwnedBundlesByIsland, session]);

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
    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        creatureTreatInventory,
      },
    });
    setRuntimeState((current) => ({
      ...current,
      creatureTreatInventory,
    }));
  }, [client, creatureTreatInventory, hasHydratedRuntimeState, runtimeState.creatureTreatInventory, session]);

  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    // Guard: Skip until the initial hydration sync effect has applied server values
    // to local state. This prevents the write amplification loop.
    if (!hasCompletedInitialHydrationSyncRef.current) return;
    const runtimeCollection = runtimeState.creatureCollection ?? [];
    if (JSON.stringify(runtimeCollection) === JSON.stringify(creatureCollection)) return;
    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        creatureCollection,
      },
    });
    setRuntimeState((current) => ({ ...current, creatureCollection }));
  }, [client, creatureCollection, hasHydratedRuntimeState, runtimeState.creatureCollection, session]);

  useEffect(() => {
    if (!hasHydratedRuntimeState) return;
    // Guard: Skip until the initial hydration sync effect has applied server values
    // to local state. This prevents the write amplification loop.
    if (!hasCompletedInitialHydrationSyncRef.current) return;
    if ((runtimeState.activeCompanionId ?? null) === (activeCompanionId ?? null)) return;
    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        activeCompanionId,
      },
    });
    setRuntimeState((current) => ({ ...current, activeCompanionId: activeCompanionId ?? null }));
  }, [activeCompanionId, client, hasHydratedRuntimeState, runtimeState.activeCompanionId, session]);

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
  const awardContractV2Essence = useCallback((amount: number, source: string) => {
    const result = awardIslandRunContractV2Essence({
      islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED,
      essence: runtimeStateRef.current.essence,
      essenceLifetimeEarned: runtimeStateRef.current.essenceLifetimeEarned,
      amount,
    });

    if (result.earned < 1) return;

    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        essence: result.essence,
        essenceLifetimeEarned: result.essenceLifetimeEarned,
      },
    });
    setRuntimeState((current) => ({
      ...current,
      essence: result.essence,
      essenceLifetimeEarned: result.essenceLifetimeEarned,
    }));
    void recordTelemetryEvent({
      userId: session.user.id,
      eventType: 'economy_earn',
      metadata: {
        stage: 'island_run_contract_v2_essence_earn',
        island_number: islandNumber,
        source,
        amount: result.earned,
      },
    });
  }, [client, islandNumber, session.user.id]);

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
    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
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
      },
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
      const ensured = ensureIslandRunContractV2ActiveTimedEvent({
        nowMs: Date.now(),
        state: {
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
      });

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
      const currentEssence = runtimeStateRef.current.essence;
      if (currentEssence <= 0) return;

      // No drift once island is fully cleared — nothing left to spend essence on.
      // Compute egg slot status from the live runtime ref to avoid stale closure issues.
      const currentIslandEntry = runtimeStateRef.current.perIslandEggs?.[String(islandNumber)];
      const currentEggResolved = currentIslandEntry?.status === 'collected'
        || currentIslandEntry?.status === 'sold';
      const islandComplete = isIslandRunFullyClearedV2({
        stopStatesByIndex: runtimeStateRef.current.stopStatesByIndex,
        stopBuildStateByIndex: runtimeStateRef.current.stopBuildStateByIndex,
        hatcheryEggResolved: currentEggResolved,
      });

      const driftResult = applyEssenceDrift({
        essence: currentEssence,
        islandNumber: effectiveIslandNumber,
        elapsedMs: elapsed,
        isIslandComplete: islandComplete,
      });

      if (driftResult.driftLost > 0) {
        setRuntimeState((prev) => ({ ...prev, essence: driftResult.essence }));
        void persistIslandRunRuntimeStatePatch({
          session,
          client,
          patch: { essence: driftResult.essence },
        });
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

  // M13: per-island egg slot usage check
  const islandEggEntry = useMemo(() => runtimeState.perIslandEggs?.[String(islandNumber)] ?? null, [runtimeState.perIslandEggs, islandNumber]);
  const islandEggSlotUsed = useMemo(() => {
    return islandEggEntry?.status === 'collected'
      || islandEggEntry?.status === 'sold';
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

  const stopStateMap = useMemo(() => {
    if (ISLAND_RUN_CONTRACT_V2_ENABLED) {
      // Bridge: legacy completedStops may include stops that v2 stopStatesByIndex
      // hasn't marked objectiveComplete yet (e.g. completed before v2 migration).
      // Merge them so the resolver sees those stops as complete.
      const completedStopsSet = new Set(completedStops);
      const mergedStopStatesByIndex = runtimeState.stopStatesByIndex.map((entry, index) => {
        const stopId = islandStopPlan[index]?.stopId;
        if (stopId && completedStopsSet.has(stopId) && !entry?.objectiveComplete) {
          return { ...(entry ?? { buildComplete: false }), objectiveComplete: true };
        }
        return entry;
      });
      const contractV2Stops = resolveIslandRunContractV2Stops({
        stopStatesByIndex: mergedStopStatesByIndex,
      });
      const map = new Map<string, StopProgressState>();
      islandStopPlan.forEach((stop, index) => {
        let status: StopProgressState = contractV2Stops.statusesByIndex[index] ?? 'locked';
        // Hatchery (index 0): show yellow 'partial' when egg is set but not yet collected/sold.
        // Green 'completed' only once the animal is collected or sold (island-clear condition).
        if (index === 0 && status === 'completed' && !islandEggSlotUsed) {
          status = 'partial';
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
  }, [completedStops, effectiveCompletedStops, islandEggSlotUsed, islandStopPlan, runtimeState.stopStatesByIndex]);

  const stopMap = useMemo(() => {
    const map = new Map<number, string>();
    islandStopPlan.forEach((stop) => map.set(stop.tileIndex, stop.stopId));
    return map;
  }, [islandStopPlan]);

  const gameplayStopMap = useMemo(() => {
    if (ISLAND_RUN_CONTRACT_V2_ENABLED) return new Map<number, string>();
    return stopMap;
  }, [stopMap]);

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

  // Camera zoom-to-stop: when cameraMode is 'stop_focus' and a stop is focused,
  // smoothly zoom the camera to that stop's screen position.
  useEffect(() => {
    if (cameraMode !== 'stop_focus' || !focusedStopId || !boardCameraRef.current) return;
    const visual = orbitStopVisuals.find((v) => v.id === focusedStopId);
    if (!visual) return;
    boardCameraRef.current.goFocusPoint(visual.x, visual.y);
  }, [cameraMode, focusedStopId, orbitStopVisuals]);

  const eggStage = useMemo(() => {
    if (!activeEgg) return 0;
    const total = Math.max(1, activeEgg.hatchAtMs - activeEgg.setAtMs);
    const progress = Math.min(1, Math.max(0, (nowMs - activeEgg.setAtMs) / total));
    return Math.min(4, Math.max(1, Math.ceil(progress * 4)));
  }, [activeEgg, nowMs]);

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
    if (typeof window === 'undefined' || !hasHydratedRuntimeState) {
      return;
    }

    const hasSeenStory = runtimeState.storyPrologueSeen || window.localStorage.getItem(storySeenStorageKey) === 'true';
    if (!hasSeenStory) {
      setShowStoryReader(true);
    }
  }, [hasHydratedRuntimeState, runtimeState.storyPrologueSeen, storySeenStorageKey]);

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
    setTravelOverlayDestinationIsland(nextIsland > 120 ? 1 : nextIsland);
    setTravelOverlayMode('advance');
    setShowTravelOverlay(true);
    setLandingText('Island expired. Next island unlocked — start it when you are ready.');
    playIslandRunSound('island_travel');
    triggerIslandRunHaptic('island_travel');

    const timeout = window.setTimeout(() => {
      performIslandTravel(nextIsland, { startTimer: false });
      setShowTravelOverlay(false);
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [islandNumber, isIslandTimerPendingStart, showTravelOverlay, timeLeftSec]);

  const timerDisplay = isIslandTimerPendingStart ? 'Ready' : formatIslandCountdown(timeLeftSec);
  const step1Stop = islandStopPlan[0] ?? null;
  // Rolling is always free — no stop-gate. step1Complete kept as `true` for
  // diagnostic logging continuity only.
  const legacyStep1Complete = true;
  const step1Complete = true;
  const contractV2StopResolution = resolveIslandRunContractV2Stops({
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
  const legacyIsCurrentIslandFullyCleared = isIslandFullyCleared(islandNumber, effectiveCompletedStops);
  const isCurrentIslandFullyCleared = ISLAND_RUN_CONTRACT_V2_ENABLED
    ? isIslandRunFullyClearedV2({
        stopStatesByIndex: runtimeState.stopStatesByIndex,
        stopBuildStateByIndex: runtimeState.stopBuildStateByIndex,
        hatcheryEggResolved: islandEggSlotUsed,
      })
    : legacyIsCurrentIslandFullyCleared;
  const isEnergyDepletedForRoll = isIslandRunRollEnergyDepleted({
    dicePool,
    dicePerRoll: effectiveDiceCost,
  });
  const rollButtonMode = resolveIslandRunRollButtonMode({
    isRolling,
    dicePool,
    dicePerRoll: effectiveDiceCost,
  });
  const rollButtonLabel = rollButtonMode === 'rolling'
    ? 'Rolling...'
    : rollButtonMode === 'roll'
      ? `Roll (${effectiveDiceCost} dice)`
      : `Need ${effectiveDiceCost} dice to roll`;
  const compactRollButtonLabel = rollButtonMode === 'rolling'
    ? 'Rolling...'
    : rollButtonMode === 'roll'
      ? 'Roll'
      : 'Need dice';
  const rollDisabledReason = showFirstRunCelebration
    ? 'first_run_celebration'
    : isRolling
      ? 'already_rolling'
      : showTravelOverlay
        ? 'travel_overlay'
        : isEnergyDepletedForRoll
          ? 'insufficient_dice'
          : null;
  const canRoll = !showFirstRunCelebration && !isRolling && !showTravelOverlay && dicePool >= effectiveDiceCost;
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
  } = resolveIslandRunContractV2RewardHudState({
    islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED,
    runtimeState,
    nowMs,
  });
  const timedEventRemainingLabel = activeTimedEvent
    ? formatEventRemaining(timedEventRemainingMs)
    : '—';
  const avatarImageUrl = getAvatarImageUrl(session.user);
  const islandDisplayName = getIslandDisplayName(islandNumber);
  const spark40RingSegmentsGradient = useMemo(() => {
    if (!isSpark40BoardProfile || !activeTileAnchors.length) return '';
    const segmentSize = 360 / activeTileAnchors.length;
    const segments = Array.from({ length: activeTileAnchors.length }, (_, index) => {
        const tileType = tileMap[index]?.tileType ?? 'micro';
        const start = (index * segmentSize).toFixed(3);
        const end = ((index + 1) * segmentSize).toFixed(3);
        const color = SPARK60_TILE_COLOR[tileType] ?? '#f0dfad';
        return `${color} ${start}deg ${end}deg`;
      })
      .join(', ');
    return `conic-gradient(from -90deg, ${segments})`;
  }, [activeTileAnchors.length, isSpark40BoardProfile, tileMap]);
  const shouldPromptDicePurchase = dicePool < DICE_PER_ROLL;
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
        isBusy: isRolling || showFirstRunCelebration || showTravelOverlay,
        buttonDisabled: Boolean(rollDisabledReason),
        disabledReason: rollDisabledReason,
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
    rollDisabledReason,
    runtimeState.activeStopIndex,
    runtimeState.completedStopsByIsland,
    runtimeState.currentIslandNumber,
    runtimeState.stopStatesByIndex,
    session.user.id,
    showFirstRunCelebration,
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

  useEffect(() => {
    if (!hasHydratedRuntimeState || isDemoSession(session)) {
      return;
    }

    if (shouldPromptDicePurchase && !wasDicePurchasePromptEligibleRef.current) {
      setShowOutOfDicePurchasePrompt(true);
      setDiceCheckoutError(null);
      setLandingText(`You're out of dice. Open the shop or buy more rolls.`);
    }

    wasDicePurchasePromptEligibleRef.current = shouldPromptDicePurchase;
  }, [hasHydratedRuntimeState, session, shouldPromptDicePurchase]);

  const activateCurrentIsland = useCallback(() => {
    const nowMs = Date.now();
    const durationMs = getIslandDurationMs(islandNumber);
    const expiresAtMs = nowMs + durationMs;
    setIslandStartedAtMs(nowMs);
    setIslandExpiresAtMs(expiresAtMs);
    setTimeLeftSec(Math.ceil(durationMs / 1000));
    setIsIslandTimerPendingStart(false);
    setLandingText(ISLAND_RUN_CONTRACT_V2_ENABLED
      ? 'Island run started. Timer shown for event context only.'
      : 'Island timer started. Roll dice to move!');
    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        currentIslandNumber: islandNumber,
        cycleIndex,
        islandStartedAtMs: nowMs,
        islandExpiresAtMs: expiresAtMs,
      },
    });
    setRuntimeState((current) => ({
      ...current,
      currentIslandNumber: islandNumber,
      cycleIndex,
      islandStartedAtMs: nowMs,
      islandExpiresAtMs: expiresAtMs,
    }));
  }, [client, cycleIndex, islandNumber, session]);

  const handleContractV2RewardBarClaim = () => {
    if (!ISLAND_RUN_CONTRACT_V2_ENABLED) return;

    const nowMs = Date.now();
    // Use chained claims to resolve cascade (Monopoly GO rapid multi-fill)
    const chainResult = resolveChainedRewardBarClaims({
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
      nowMs,
    });

    if (chainResult.payouts.length === 0) {
      setLandingText('Reward bar is not full yet.');
      return;
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

    if (totalMinigameTokens > 0) {
      setSpinTokens((current) => current + totalMinigameTokens);
    }
    if (totalDice > 0) {
      setDicePool((current) => current + totalDice);
    }

    applyContractV2RewardBarRuntimeState(chainResult.state);
    const nextSpinTokens = runtimeStateRef.current.spinTokens + totalMinigameTokens;
    const nextDicePool = runtimeStateRef.current.dicePool + totalDice;
    const nextEssence = runtimeStateRef.current.essence + totalEssence;
    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        spinTokens: nextSpinTokens,
        dicePool: nextDicePool,
        essence: nextEssence,
      },
    });
    setRuntimeState((current) => ({
      ...current,
      spinTokens: nextSpinTokens,
      dicePool: nextDicePool,
      essence: nextEssence,
    }));

    // Trigger burst animation + cascade display
    setRewardBarBurstAnimating(true);
    setRewardBarCascadePayouts(chainResult.payouts);
    setTimeout(() => {
      setRewardBarBurstAnimating(false);
      setRewardBarCascadePayouts([]);
    }, chainResult.payouts.length * 600 + 400);

    const payoutParts: string[] = [];
    if (totalDice > 0) payoutParts.push(`+${totalDice} 🎲`);
    if (totalEssence > 0) payoutParts.push(`+${totalEssence} 🟣`);
    if (totalMinigameTokens > 0) payoutParts.push(`+${totalMinigameTokens} 🎫`);
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
  };

  const handleRoll = async () => {
    const rollDecisionFlags = {
      canRoll,
      showFirstRunCelebration,
      showTravelOverlay,
      step1Complete,
      isRolling,
      dicePool,
      requiredDicePerRoll: effectiveDiceCost,
      isEnergyDepletedForRoll,
      rollButtonMode,
      rollButtonLabel,
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

    if (showFirstRunCelebration) {
      if (isIsland120StartupDiagnosticActive) {
        logIslandRunEntryDebug('island120_roll_interaction', {
          userId: session.user.id,
          action: 'blocked',
          blockReason: 'first_run_celebration',
          ...rollDecisionFlags,
        });
      }
      return;
    }

    // M11C: Step 1 enforcement removed — rolling is always free when dice are available.

    if (isRolling) {
      if (isIsland120StartupDiagnosticActive) {
        logIslandRunEntryDebug('island120_roll_interaction', {
          userId: session.user.id,
          action: 'blocked',
          blockReason: 'already_rolling',
          ...rollDecisionFlags,
        });
      }
      return;
    }

    if (dicePool < effectiveDiceCost) {
      if (isIsland120StartupDiagnosticActive) {
        logIslandRunEntryDebug('island120_roll_interaction', {
          userId: session.user.id,
          action: 'blocked',
          blockReason: 'insufficient_dice',
          ...rollDecisionFlags,
        });
      }
      setLandingText(`Need ${effectiveDiceCost} dice to roll at ×${effectiveMultiplier}.`);
      return;
    }

    setIsRolling(true);
    setCameraMode('board_follow');
    requestActiveStopTransition(null, 'roll_start_close_stop');

    // M10A: roll sound + haptic
    playIslandRunSound('roll');
    triggerIslandRunHaptic('roll');

    const rollResult = await executeIslandRunRollAction({
      session,
      client,
      boardProfileId: ACTIVE_BOARD_PROFILE.id,
      diceMultiplier: effectiveMultiplier,
    });

    if (rollResult.status !== 'ok' || rollResult.total === undefined || rollResult.dieOne === undefined || rollResult.dieTwo === undefined) {
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
      setLandingText(`Need ${effectiveDiceCost} dice to roll at ×${effectiveMultiplier}.`);
      return;
    }
    if (isIsland120StartupDiagnosticActive) {
      logIslandRunEntryDebug('island120_roll_interaction', {
        userId: session.user.id,
        action: 'accepted',
        blockReason: null,
        rollResultStatus: rollResult.status,
        ...rollDecisionFlags,
      });
    }

    const dieOne = rollResult.dieOne;
    const dieTwo = rollResult.dieTwo;
    setRollingDiceFaces([dieOne, dieTwo]);
    const nextRoll = rollResult.total;
    setRollValue(nextRoll);
    setLandingText(`Rolling ${dieOne} + ${dieTwo} = ${nextRoll}...`);

    // Wait for dice animation to finish before moving the token
    await new Promise<void>((resolve) => {
      diceRollCompleteResolverRef.current = resolve;
    });

    // Show the roll total briefly over the dice area
    setDiceRollTotalOverlay(`Rolled ${nextRoll}!`);
    await new Promise<void>((resolve) => { setTimeout(resolve, DICE_ROLL_OVERLAY_DURATION_MS); });
    setDiceRollTotalOverlay(null);

    let currentIndex = tokenIndex;
    const hopIndices: number[] = [];
    for (let step = 0; step < nextRoll; step += 1) {
      currentIndex = resolveWrappedTokenIndex(currentIndex, 1, ACTIVE_BOARD_PROFILE.tileCount);
      hopIndices.push(currentIndex);
    }

    // Set the full hop sequence — BoardStage will animate tile-by-tile
    // with camera follow (Monopoly GO style).
    setPendingHopSequence(hopIndices);
    await new Promise<void>((resolve) => {
      hopSequenceResolverRef.current = resolve;
    });
    setTokenIndex(currentIndex);

    // Sync local state to match what the roll action already persisted.
    // The service deducted effectiveDiceCost (= BASE_DICE_PER_ROLL × multiplier)
    // and wrote the new tokenIndex — we mirror that into React state for the UI.
    const nextDicePool = Math.max(0, dicePool - effectiveDiceCost);
    setDicePool(nextDicePool);
    setRuntimeState((current) => ({
      ...current,
      tokenIndex: currentIndex,
      dicePool: nextDicePool,
    }));

    // Legacy stop-landing path (dead code when ISLAND_RUN_CONTRACT_V2_ENABLED is true, retained for backward compat)
    const landedStopRaw = ISLAND_RUN_CONTRACT_V2_ENABLED ? undefined : gameplayStopMap.get(currentIndex);
    const landedStop = landedStopRaw as string | null;
    if (typeof landedStop === 'string') {
      const stopConfig = islandStopPlan.find((stop) => stop.stopId === landedStop);
      const stopTitle = stopConfig?.title ?? landedStop.toUpperCase();
      const state = stopStateMap.get(landedStop) ?? 'active';

      if (state === 'locked') {
        setLandingText(`Boss stop locked: complete all 5 stops before boss.`);
        requestActiveStopTransition(null, 'tile_land_stop_locked');
      } else {
        setLandingText(`Landed on STOP: ${stopTitle} (#${currentIndex})`);
        requestActiveStopTransition(landedStop, 'tile_land_stop_open');
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

    setIsRolling(false);
  };

  // B2-3: resolve non-stop, non-encounter tile landings with real outcomes
  const resolveTileLanding = (tileType: string) => {
    const mult = Math.max(1, effectiveMultiplier);
    const essenceEarn = resolveIslandRunContractV2EssenceEarnForTile(tileType, { islandNumber: effectiveIslandNumber, seed: Date.now() + tokenIndex }) * mult;
    const EVENT_MESSAGES = [
      '⚡ Island event!',
      '⚡ Something stirs...',
      '⚡ A challenge echoes...',
      '⚡ The island pulses.',
      '⚡ Fortune favors the bold.',
    ];

    const multLabel = mult > 1 ? ` (x${mult})` : '';
    switch (tileType) {
      case 'currency':
        setLandingText(`💰 Currency tile! +${essenceEarn} essence${multLabel}`);
        break;
      case 'chest':
        setLandingText(`🎁 Treasure chest! +${essenceEarn} essence${multLabel}`);
        break;
      case 'hazard':
        setLandingText(essenceEarn > 0 ? `☠️ Hazard! +${essenceEarn} essence (scraped)${multLabel}` : '☠️ Hazard! Nothing gained.');
        break;
      case 'egg_shard':
        setLandingText(`🧩 Egg Shard! +1 shard, +${essenceEarn} essence${multLabel}`);
        awardShards('egg_shard_tile');
        break;
      case 'micro':
        setLandingText(essenceEarn > 0 ? `✨ Micro reward! +${essenceEarn} essence${multLabel}` : '✨ Micro reward!');
        break;
      case 'event':
        setLandingText(EVENT_MESSAGES[(islandNumber + tokenIndex) % EVENT_MESSAGES.length]);
        break;
      default:
        setLandingText(`Landed on tile #${tokenIndex}`);
        break;
    }

    if (essenceEarn > 0) {
      awardContractV2Essence(essenceEarn, `tile_${tileType}`);
    }

    if (ISLAND_RUN_CONTRACT_V2_ENABLED) {
      // Trigger flying feed particle animation for feeding tiles
      const isFeedingTile = tileType === 'egg_shard' || tileType === 'chest' || tileType === 'currency' || tileType === 'micro';
      if (isFeedingTile) {
        setFeedParticleActive(true);
        setTimeout(() => setFeedParticleActive(false), 600);
      }

      const nextRewardBarState = applyIslandRunContractV2RewardBarProgress({
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
        source: { kind: 'tile', tileType },
        nowMs: Date.now(),
        multiplier: mult,
      });
      applyContractV2RewardBarRuntimeState(nextRewardBarState);

      // Auto-claim: if bar is now full, trigger the claim cascade automatically
      // with a short delay for the fill animation to play first
      if (nextRewardBarState.rewardBarProgress >= nextRewardBarState.rewardBarThreshold) {
        playIslandRunSound('reward_bar_fill');
        setTimeout(() => handleContractV2RewardBarClaim(), 500);
      }
    }
  };

  // B2-1: handleSpin — spin-based movement is retired.
  const handleSpin = async () => {
    setLandingText('Spin movement is retired. Use dice rolls to move.');
  };

  /** Mark v2 stop 0 (hatchery) objective as complete when the egg is set.
   *  Build completion for the hatchery is handled separately via the Build Panel.
   *  This keeps stopStatesByIndex objective state in sync with the egg lifecycle. */
  const markHatcheryStopCompleteInV2 = () => {
    if (!ISLAND_RUN_CONTRACT_V2_ENABLED) return;
    const currentStates = runtimeStateRef.current.stopStatesByIndex;
    const entry = currentStates[0];
    if (entry?.objectiveComplete === true) return; // already done
    const nextStopStatesByIndex = currentStates.map((s, index) => {
      if (index !== 0) return s;
      return { ...(s ?? { buildComplete: false }), objectiveComplete: true };
    });
    const stopResolution = resolveIslandRunContractV2Stops({ stopStatesByIndex: nextStopStatesByIndex });
    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        stopStatesByIndex: nextStopStatesByIndex,
        activeStopIndex: stopResolution.activeStopIndex,
        activeStopType: stopResolution.activeStopType,
      },
    });
    setRuntimeState((current) => ({
      ...current,
      stopStatesByIndex: nextStopStatesByIndex,
      activeStopIndex: stopResolution.activeStopIndex,
      activeStopType: stopResolution.activeStopType,
    }));
  };

  // M5-COMPLETE: handleSetEgg — no tier argument; tier assigned randomly (weighted), hatch delay random 24–72 h
  const handleSetEgg = async () => {
    if (isSettingEgg) return;
    setIsSettingEgg(true);
    setLandingText('Setting egg...');
    const start = Date.now();
    const tier = rollEggTierWeighted();
    const hatchDurationMs = getRandomHatchDelayMs();
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
    const eggPatch = {
      activeEggTier: tier,
      activeEggSetAtMs: start,
      activeEggHatchDurationMs: hatchDurationMs,
      activeEggIsDormant: false,
      perIslandEggs: { [islandKey]: ledgerEntry },
      completedStopsByIsland: { [islandKey]: nextCompletedStops },
    };
    const persistResult = await persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: eggPatch,
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
    // Schedule push notification for when the egg is ready to collect
    scheduleEggHatchNotification(session.user.id, nextActiveEgg.hatchAtMs).catch((err) => {
      logIslandRunEntryDebug('egg_hatch_notification_schedule_failed', { error: String(err) });
    });
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
    setRuntimeState((current) => ({
      ...current,
      activeEggTier: tier,
      activeEggSetAtMs: start,
      activeEggHatchDurationMs: hatchDurationMs,
      activeEggIsDormant: false,
      perIslandEggs: { ...current.perIslandEggs, [islandKey]: ledgerEntry },
      completedStopsByIsland: {
        ...current.completedStopsByIsland,
        [islandKey]: nextCompletedStops,
      },
    }));

    if (activeStopId === 'hatchery') {
      if (!isStopCompleted(completedStops, 'hatchery')) {
        awardShards('stop_complete');
        awardWalletShards(1);
      }
      setCompletedStops(nextCompletedStops);
      markHatcheryStopCompleteInV2();
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

    setRuntimeState((current) => ({
      ...current,
      perfectCompanionIds,
      perfectCompanionReasons,
      perfectCompanionComputedAtMs: computedAtMs,
      perfectCompanionModelVersion: PERFECT_COMPANION_MODEL_VERSION,
      perfectCompanionComputedCycleIndex: cycleIndex,
    }));

    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        perfectCompanionIds,
        perfectCompanionReasons,
        perfectCompanionComputedAtMs: computedAtMs,
        perfectCompanionModelVersion: PERFECT_COMPANION_MODEL_VERSION,
        perfectCompanionComputedCycleIndex: cycleIndex,
      },
    });
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

    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        companionBonusLastVisitKey: visitKey,
      },
    });
    setRuntimeState((current) => ({
      ...current,
      companionBonusLastVisitKey: visitKey,
    }));
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
    const baselineCreature = selectCreatureForEgg({
      eggTier: resolvedEgg.tier,
      seed: resolvedEgg.setAtMs,
      islandNumber,
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
    if (!activeEgg || eggStage < 4) return;
    // Guard: prevent collecting if the egg slot is already used (collected/sold)
    if (islandEggSlotUsed) return;
    const resolvedEgg = activeEgg;
    const nowTs = Date.now();
    const creature = resolveHatchedCreatureWithPerfectCompanionBias(resolvedEgg);
    const islandKey = String(islandNumber);
    const existingEntry = runtimeState.perIslandEggs?.[islandKey];
    const hasCollectedPerfectCompanionBeforeCollect = creatureCollection.some((entry) =>
      (runtimeState.perfectCompanionIds ?? []).includes(entry.creatureId),
    );
    const isPerfectCompanionCollected = (runtimeState.perfectCompanionIds ?? []).includes(creature.id);
    const pityWasEligible =
      !hasCollectedPerfectCompanionBeforeCollect
      && islandNumber >= perfectCompanionRuntimeConfig.gameplay.pityIslandThreshold;
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
    markHatcheryStopCompleteInV2();
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
    // Guard: prevent selling if the egg slot is already used (collected/sold)
    if (islandEggSlotUsed) return;
    const resolvedEgg = activeEgg;
    const creature = resolveHatchedCreatureWithPerfectCompanionBias(resolvedEgg);
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
    const specialtySellBonusEssence = activeCompanionSpecialty?.effect === 'sell_bonus_essence'
      ? Math.max(0, Math.floor((bundle.essenceDelta * activeCompanionSpecialty.amount) / 100))
      : 0;
    // Hearts/coins retired — creature sell now awards essence + shards
    const totalSellEssence = bundle.essenceDelta + specialtySellBonusEssence;
    if (totalSellEssence > 0) {
      setRuntimeState((prev) => ({
        ...prev,
        essence: prev.essence + totalSellEssence,
        essenceLifetimeEarned: prev.essenceLifetimeEarned + totalSellEssence,
      }));
    }
    if (bundle.spinTokensDelta > 0) setSpinTokens((t) => t + bundle.spinTokensDelta);
    if (bundle.diamondsDelta > 0) setDiamonds((d) => d + bundle.diamondsDelta);
    if (bundle.shardsDelta > 0) awardWalletShards(bundle.shardsDelta);
    awardShards('egg_open');
    awardWalletShards(2);
    setActiveEgg(null);
    playIslandRunSound('market_purchase_success');
    triggerIslandRunHaptic('market_purchase_success');
    const rewardParts: string[] = [];
    if (bundle.essenceDelta > 0) rewardParts.push(`+${bundle.essenceDelta} 🟣`);
    if (specialtySellBonusEssence > 0) rewardParts.push(`+${specialtySellBonusEssence} 🟣 specialty`);
    if (bundle.shardsDelta > 0) rewardParts.push(`+${bundle.shardsDelta} 🔮 shards`);
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
        reward_essence: bundle.essenceDelta,
        specialty_bonus_essence: specialtySellBonusEssence,
        reward_shards: bundle.shardsDelta,
        reward_spin_tokens: bundle.spinTokensDelta,
        reward_diamonds: bundle.diamondsDelta,
      },
    });
    logIslandRunEntryDebug('island_creature_sold', {
      islandNumber,
      tier: resolvedEgg.tier,
      creatureId: creature.id,
      creatureName: creature.name,
      rewardEssence: bundle.essenceDelta,
      specialtyBonusEssence: specialtySellBonusEssence,
      rewardShards: bundle.shardsDelta,
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
    markHatcheryStopCompleteInV2();
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
          dice: Math.min(perfectCompanionRuntimeConfig.gameplay.encounterBonusCaps.dice, reward.dice > 0 ? 1 : 0),
          spinTokens: Math.min(perfectCompanionRuntimeConfig.gameplay.encounterBonusCaps.spinTokens, reward.spinTokens > 0 ? 0 : 1),
        }
      : { essence: 0, dice: 0, spinTokens: 0 };
    const challengeType = currentEncounterChallenge?.type ?? null;
    const challengeId = currentEncounterChallenge?.id ?? null;

    const totalEncounterEssence = reward.essence + specialtyEncounterBonusEssence + perfectCompanionEncounterBonus.essence;
    const totalEncounterDice = reward.dice + perfectCompanionEncounterBonus.dice;
    const totalEncounterSpinTokens = reward.spinTokens + perfectCompanionEncounterBonus.spinTokens;

    // Award essence to the island run runtime state (not coins — coins are retired)
    setRuntimeState((prev) => ({
      ...prev,
      essence: prev.essence + totalEncounterEssence,
      essenceLifetimeEarned: prev.essenceLifetimeEarned + totalEncounterEssence,
    }));
    if (totalEncounterDice > 0) {
      setDicePool((current) => current + totalEncounterDice);
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
    const summary = formatEncounterRewardSummary(reward);
    const specialtySummaryParts: string[] = [];
    if (specialtyEncounterBonusEssence > 0) specialtySummaryParts.push(`+${specialtyEncounterBonusEssence} essence`);
    if (perfectCompanionEncounterBonus.essence > 0) specialtySummaryParts.push(`+${perfectCompanionEncounterBonus.essence} perfect essence`);
    if (perfectCompanionEncounterBonus.dice > 0) specialtySummaryParts.push(`+${perfectCompanionEncounterBonus.dice} perfect dice`);
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
        reward_dice: reward.dice,
        reward_spin_tokens: reward.spinTokens,
        specialty_bonus_essence: specialtyEncounterBonusEssence,
        perfect_bonus_essence: perfectCompanionEncounterBonus.essence,
        perfect_bonus_dice: perfectCompanionEncounterBonus.dice,
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
          bonus_dice: perfectCompanionEncounterBonus.dice,
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
    setRuntimeState((prev) => ({
      ...prev,
      essence: prev.essence + bossReward.essence,
      essenceLifetimeEarned: prev.essenceLifetimeEarned + bossReward.essence,
    }));
    if (bossReward.spinTokens > 0) {
      setSpinTokens((t) => t + bossReward.spinTokens);
    }
    // M10C: boss_trial_resolve sound + haptic
    playIslandRunSound('boss_trial_resolve');
    triggerIslandRunHaptic('boss_trial_resolve');

    const rewardText = `Boss challenge resolved: +${bossReward.dice} dice, +${bossReward.essence} essence${bossReward.spinTokens > 0 ? `, ${formatIslandRunSpinTokenReward({ islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED, amount: bossReward.spinTokens })}` : ''}.`;
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

    setMarketOwnedBundles((current) => ({
      ...current,
      [bundle]: true,
    }));

    emitMarketPurchaseMarker({
      bundle,
      status: 'already_owned',
      costCoins,
      rewardDice,
      coinsBefore: coins,
      coinsAfter: coins,
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
      const message = `Not enough essence for Dice Bundle (${MARKET_DICE_BUNDLE_COST} required).`;
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

    const newEssence = runtimeState.essence - MARKET_DICE_BUNDLE_COST;
    setRuntimeState((prev) => ({
      ...prev,
      essence: newEssence,
      essenceLifetimeSpent: prev.essenceLifetimeSpent + MARKET_DICE_BUNDLE_COST,
    }));
    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: { essence: newEssence, essenceLifetimeSpent: runtimeState.essenceLifetimeSpent + MARKET_DICE_BUNDLE_COST },
    });
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
    const message = `Purchased Dice Bundle: -${MARKET_DICE_BUNDLE_COST} essence, +${MARKET_DICE_BUNDLE_REWARD} dice.`;
    setMarketOwnedBundles((current) => ({ ...current, dice_bundle: true }));
    setMarketPurchaseFeedback(message);
    setLandingText(message);
    setMarketInteracted(true);
  };
  const performIslandTravel = (nextIsland: number, options?: { startTimer?: boolean }) => {
    const startTimer = options?.startTimer ?? true;
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
    setDicePool(ISLAND_RUN_DEFAULT_STARTING_DICE);
    setTokenIndex(TOKEN_START_TILE_INDEX);
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
    setMarketOwnedBundles({ dice_bundle: false });
    // M8-COMPLETE: clear per-island shop owned state from localStorage on travel
    try {
      window.localStorage.removeItem(`island_run_shop_owned_${session.user.id}_island_${islandNumber}`);
    } catch {
      // ignore storage errors
    }

    // CONTRACT V2: reset stop objective states and initialize fresh building costs for new island.
    if (ISLAND_RUN_CONTRACT_V2_ENABLED) {
      const nextEffectiveIslandNumber = getEffectiveIslandNumber(resolvedIsland, nextCycleIndex);
      const freshStopStates = Array.from({ length: 5 }, () => ({ objectiveComplete: false, buildComplete: false }));
      const freshBuildStates = initStopBuildStatesForIsland(nextEffectiveIslandNumber);
      void persistIslandRunRuntimeStatePatch({
        session,
        client,
        patch: {
          stopStatesByIndex: freshStopStates,
          stopBuildStateByIndex: freshBuildStates,
          activeStopIndex: 0,
          activeStopType: 'hatchery',
        },
      });
      setRuntimeState((current) => ({
        ...current,
        stopStatesByIndex: freshStopStates,
        stopBuildStateByIndex: freshBuildStates,
        activeStopIndex: 0,
        activeStopType: 'hatchery',
      }));
    }
    const nowMs = startTimer ? Date.now() : 0;
    const durationMs = getIslandDurationMs(resolvedIsland);
    const expiresAtMs = startTimer ? nowMs + durationMs : 0;
    setTimeLeftSec(startTimer ? Math.ceil(durationMs / 1000) : 0);
    setIslandStartedAtMs(nowMs);
    setIslandExpiresAtMs(expiresAtMs);
    setIsIslandTimerPendingStart(!startTimer);
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
    setLandingText(startTimer
      ? 'Arrived at new island. Roll dice to move!'
      : 'New island unlocked. Start it when you are ready.');
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

  const handleSpendEssenceOnBuild = (stopIndex: number) => {
    if (!ISLAND_RUN_CONTRACT_V2_ENABLED) return;
    if (stopIndex < 0 || stopIndex >= islandStopPlan.length) return;

    const currentBuildState = runtimeStateRef.current.stopBuildStateByIndex[stopIndex];
    if (!currentBuildState || isStopBuildFullyComplete(currentBuildState)) {
      setLandingText('This building is already fully built!');
      return;
    }

    const spendResult = spendIslandRunContractV2EssenceOnStopBuild({
      islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED,
      stopIndex,
      spendAmount: CONTRACT_V2_ESSENCE_SPEND_STEP,
      essence: runtimeStateRef.current.essence,
      essenceLifetimeSpent: runtimeStateRef.current.essenceLifetimeSpent,
      stopBuildStateByIndex: runtimeStateRef.current.stopBuildStateByIndex,
      stopStatesByIndex: runtimeStateRef.current.stopStatesByIndex,
      effectiveIslandNumber,
    });

    if (spendResult.spent < 1) {
      setLandingText('Not enough Essence to build. Earn more by rolling!');
      return;
    }

    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: {
        essence: spendResult.essence,
        essenceLifetimeSpent: spendResult.essenceLifetimeSpent,
        stopBuildStateByIndex: spendResult.stopBuildStateByIndex,
        stopStatesByIndex: spendResult.stopStatesByIndex,
      },
    });

    setRuntimeState((current) => ({
      ...current,
      essence: spendResult.essence,
      essenceLifetimeSpent: spendResult.essenceLifetimeSpent,
      stopBuildStateByIndex: spendResult.stopBuildStateByIndex,
      stopStatesByIndex: spendResult.stopStatesByIndex,
    }));

    const nextBuildState = spendResult.stopBuildStateByIndex[stopIndex];
    const stopEntry = islandStopPlan[stopIndex];
    const stopLabel = stopEntry?.title ?? stopEntry?.stopId ?? `Stop ${stopIndex + 1}`;

    if (spendResult.leveledUp && nextBuildState.buildLevel >= MAX_BUILD_LEVEL) {
      setLandingText(`🏰 ${stopLabel} fully built! Level ${MAX_BUILD_LEVEL} complete.`);
    } else if (spendResult.leveledUp) {
      setLandingText(`✨ ${stopLabel} upgraded to Level ${nextBuildState.buildLevel}!`);
    } else {
      const remaining = Math.max(0, nextBuildState.requiredEssence - nextBuildState.spentEssence);
      setLandingText(`🔨 ${stopLabel}: ${nextBuildState.spentEssence}/${nextBuildState.requiredEssence} 🟣 (${remaining} left for L${nextBuildState.buildLevel + 1})`);
    }
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

    if (ISLAND_RUN_CONTRACT_V2_ENABLED) {
      const stopIndex = islandStopPlan.findIndex((stop) => stop.stopId === activeStopId);
      if (stopIndex < 0) return;

      const activeStopIndex = resolveIslandRunContractV2Stops({
        stopStatesByIndex: runtimeStateRef.current.stopStatesByIndex,
      }).activeStopIndex;
      if (stopIndex !== activeStopIndex) {
        setLandingText('Only the active stop can be progressed in contract-v2.');
        return;
      }

      const priorStopState = runtimeStateRef.current.stopStatesByIndex[stopIndex] ?? { objectiveComplete: false, buildComplete: false };
      // Objective completion is the only gate for stop UNLOCK — builds are tracked separately.
      const nextStopStatesByIndex = runtimeStateRef.current.stopStatesByIndex.map((entry, index) => {
        if (index !== stopIndex) return entry;
        return {
          ...entry,
          objectiveComplete: true,
        };
      });

      const stopResolution = resolveIslandRunContractV2Stops({
        stopStatesByIndex: nextStopStatesByIndex,
      });

      void persistIslandRunRuntimeStatePatch({
        session,
        client,
        patch: {
          stopStatesByIndex: nextStopStatesByIndex,
          activeStopIndex: stopResolution.activeStopIndex,
          activeStopType: stopResolution.activeStopType,
        },
      });

      setRuntimeState((current) => ({
        ...current,
        stopStatesByIndex: nextStopStatesByIndex,
        activeStopIndex: stopResolution.activeStopIndex,
        activeStopType: stopResolution.activeStopType,
      }));

      if (!priorStopState.objectiveComplete) {
        awardShards('stop_complete');
        awardWalletShards(1);
      }

      if (activeStopId === 'boss') {
        setCompletedStops((current) => ensureStopCompleted(current, 'boss'));
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
        });

        if (nowFullyCleared) {
          const bossReward = getBossReward(islandNumber);
          logGameSession(session.user.id, {
            gameId: 'shooter_blitz',
            action: 'complete',
            timestamp: new Date().toISOString(),
            metadata: {
              stage: 'island_run_boss_island_cleared',
              island_number: islandNumber,
              rewards_granted: { dice: bossReward.dice, coins: 0, essence: bossReward.essence },
            },
          });
          setShowIslandClearCelebration(true);
          setIslandClearStats({
            islandNumber,
            diceEarned: bossReward.dice,
            essenceEarned: bossReward.essence,
            stopsCleared: completedStops.length + 1,
          });
          setShowTravelOverlay(true);
          window.setTimeout(() => {
            const nextIsland = islandNumber + 1;
            setShowTravelOverlay(false);
            performIslandTravel(nextIsland, { startTimer: true });
          }, 1400);
        } else {
          setLandingText('👾 Boss defeated! Open the Build Panel 🔨 and finish all 5 buildings to claim island clear.');
          setActiveStopId(null);
        }
        return;
      }

      setCompletedStops((current) => ensureStopCompleted(current, activeStopId));
      setMysteryStopReward(null);
      setLandingText(`${activeStopId.toUpperCase()} stop objective done! Open 🔨 Build to fund this island's buildings.`);
      setActiveStopId(null);
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
            dice: bossReward.dice,
            coins: 0, // coins retired
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
      });

      setShowTravelOverlay(true);
      window.setTimeout(() => {
        const nextIsland = islandNumber + 1;
        setShowTravelOverlay(false);
        performIslandTravel(nextIsland, { startTimer: true });
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
    setDicePool(ISLAND_RUN_DEFAULT_STARTING_DICE);
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
    setDicePool(ISLAND_RUN_DEFAULT_STARTING_DICE);
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
      const starterDiceBonus = ISLAND_RUN_DEFAULT_STARTING_DICE * 2;
      setCoins((current) => current + 250);
      setDicePool((current) => current + starterDiceBonus);
      setLandingText(`Starter claim complete: +250 coins, +${starterDiceBonus} dice.`);
      setFirstRunStep('launch');
      void recordTelemetryEvent({
        userId: session.user.id,
        eventType: 'onboarding_completed',
        metadata: {
          stage: 'island_run_first_run_rewards_claimed',
          island: islandNumber,
          rewards: { coins: 250, dice_bonus: starterDiceBonus },
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

  const openSanctuaryPanel = useCallback(() => {
    setShowSanctuaryPanel(true);
    setSelectedSanctuaryCreatureId(null);
    setShowPerfectCompanionReason(false);
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
      setShowPerfectCompanionReason(false);
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
        const nextRewardBarState = applyIslandRunContractV2RewardBarProgress({
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
    storyRewardClaim: (essenceReward: number) => {
      if (essenceReward <= 0) {
        return;
      }
      awardContractV2Essence(essenceReward, 'island_story_episode_reward');
      setLandingText(`Story reward claimed: +${essenceReward} essence.`);
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
  };

  const handleStoryRewardClaim = (essenceReward: number) => {
    if (essenceReward <= 0) {
      return;
    }
    setRuntimeState((prev) => ({
      ...prev,
      essence: prev.essence + essenceReward,
      essenceLifetimeEarned: prev.essenceLifetimeEarned + essenceReward,
    }));
    setLandingText(`Story reward claimed: +${essenceReward} essence.`);
  };

  const handleCloseStoryReader = () => {
    setShowStoryReader(false);
    try {
      window.localStorage.setItem(storySeenStorageKey, 'true');
    } catch {
      // ignore localStorage failures
    }
    void persistIslandRunRuntimeStatePatch({
      session,
      client,
      patch: { storyPrologueSeen: true },
    });
    setRuntimeState((current) => ({ ...current, storyPrologueSeen: true }));
  };

  if (isRuntimeSyncBlocked || isOwnershipBlocked) {
    return (
      <section className="island-run-prototype">
        <header className="island-run-prototype__header">
          <p className="island-run-prototype__landing-feed" role="alert">
            {isRuntimeSyncBlocked
              ? 'Island Run sync is currently unavailable for this account, so gameplay is paused on this device to prevent split progress.'
              : 'A newer Island Run state is available from another device. Reload to continue with the latest synced progress.'}
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
              void retryRuntimeSync();
            }}
            disabled={isRetryingSync}
          >
            {isRetryingSync ? 'Retrying…' : 'Reload latest progress'}
          </button>
        </header>
      </section>
    );
  }

  return (
    <section className={`island-run-prototype ${isHudCollapsed ? 'island-run-prototype--hud-collapsed' : ''}`}>
      {!isHudCollapsed ? (
        <header className="island-run-prototype__header">
          <div id="island-run-main-hud">
        <div className="island-run-prototype__always-controls">
            <button
              type="button"
              className={`island-run-prototype__roll-btn island-run-prototype__roll-btn--cta ${rollButtonMode === 'roll' ? 'island-run-prototype__roll-btn--primary' : 'island-run-prototype__roll-btn--convert'}`}
              onClick={handleRoll}
              disabled={Boolean(rollDisabledReason)}
            >
              {rollButtonLabel}
            </button>
          {false && spinTokens > 0 && (
            <button
              type="button"
              className="island-run-prototype__spin-btn"
              onClick={() => void handleSpin()}
              disabled={isRolling}
            >
              🌀 Spin
            </button>
          )}
          {/* M10A: audio toggle */}
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
          {/* M14: persistent HUD Market button */}
          <button
            type="button"
            className="island-run-prototype__shop-btn"
            aria-label="Open market"
            onClick={openShopPanel}
          >
            🛍️ Market
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
          </div>
        {/* M1B: Production HUD — always visible for all logged-in users */}
        <div className="island-run-prototype__status-row island-run-prototype__status-row--production">
          <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--dice">🎲 <strong>{dicePool}</strong></span>
          <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--coins">🪙 <strong>{coins}</strong></span>
          {ISLAND_RUN_CONTRACT_V2_ENABLED && <span className="island-run-prototype__stat-chip">🟣 <strong>{runtimeState.essence}</strong></span>}
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
        {ISLAND_RUN_CONTRACT_V2_ENABLED && activeTimedEvent ? (
          <div className="island-run-prototype__shard-pill" aria-label="Contract-v2 timed event reward bar">
            <div className="island-run-prototype__shard-pill-fill" style={{ width: `${rewardBarPercent}%` }} />
            <span className="island-run-prototype__shard-pill-content">
              <span>{nextRewardIcon} {activeTimedEvent.eventType} · Next: {nextRewardKind}</span>
              <span className="island-run-prototype__shard-pill-count">
                {timedEventRemainingLabel} · {rewardBarProgress}/{rewardBarThreshold} · Tier {runtimeState.rewardBarEscalationTier}{effectiveMultiplier > 1 ? ` · ×${effectiveMultiplier} (−${effectiveDiceCost}/roll)` : ''}
              </span>
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
              <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--dice">Dice: <strong>{dicePool}</strong></span>
              <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--coins">Coins: <strong>{coins}</strong></span>
              <span className="island-run-prototype__stat-chip island-run-prototype__level-chip">LEVEL <strong>{islandNumber}</strong> / 120</span>
              <span className="island-run-prototype__stat-chip">Tile: <strong>{tokenIndex}</strong></span>
              <span className="island-run-prototype__stat-chip">Island: <strong>{islandNumber}</strong></span>
              <span className="island-run-prototype__stat-chip">Last roll: <strong>{rollValue ?? '-'}</strong></span>
              <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--timer">{resolveIslandRunTimerLabel()} <strong>{timerDisplay}</strong></span>
              <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--spin">{spinTokenWalletLabel}: <strong>{spinTokens}</strong></span>
              {/* M11C: stop progress chip */}
              {(() => {
                const nonBossStops = islandStopPlan.filter((s) => s.stopId !== 'boss');
                const completedNonBoss = ISLAND_RUN_CONTRACT_V2_ENABLED
                  ? nonBossStops.filter((s) => stopStateMap.get(s.stopId) === 'completed').length
                  : nonBossStops.filter((s) => effectiveCompletedStops.includes(s.stopId)).length;
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
                    <span className="island-run-prototype__stat-chip island-run-prototype__stat-chip--coins">Coins: <strong>{runtimeVerificationSnapshot.latestHydrationResult?.coins ?? '—'}</strong></span>
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
          {!ISLAND_RUN_CONTRACT_V2_ENABLED && dicePool < DICE_PER_ROLL && (
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
            Simulate wallet shards (+5)
          </button>
        </div>
          </div>
        )}
          </div>
        </header>
      ) : null}

      <div ref={boardRef} className={`island-run-board island-run-board--framed island-run-board--focus island-run-board--${activeTheme.sceneClass} ${(!isIslandBackgroundAvailable || isBackgroundHidden) ? 'island-run-board--no-bg' : ''} ${isHudCollapsed ? 'island-run-board--hud-collapsed' : ''} ${isSpark40BoardProfile ? 'island-run-board--spark40' : ''}`}>
        {isIslandBackgroundAvailable && !isBackgroundHidden && (
          <img
            key={islandBackgroundSrc}
            className="island-run-board__bg"
            src={islandBackgroundSrc}
            alt=""
            aria-hidden="true"
            onError={() => setIsIslandBackgroundAvailable(false)}
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
              🟣 <strong>{runtimeState.essence}</strong>
            </div>
            <button
              type="button"
              className="island-run-board__topbar-menu"
              aria-label="Toggle HUD details"
              aria-expanded={showTopbarMenu}
              aria-haspopup="menu"
              aria-controls="island-run-topbar-menu"
              onClick={() => setShowTopbarMenu((current) => !current)}
            >
              ☰
            </button>
          </div>

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
                  setCameraMode('board_follow');
                  setFocusedStopId(null);
                  boardCameraRef.current?.goDefault();
                  setShowTopbarMenu(false);
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
                  setShowDebugPanel(true);
                  setShowTopbarMenu(false);
                }}
              >
                🔧 Debug panel
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className={`island-run-board__rewardbar${canClaimRewardBar ? ' island-run-board__rewardbar--claimable' : ''}${rewardBarBurstAnimating ? ' island-run-board__rewardbar--burst' : ''}`}
          aria-label="Reward progress"
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
                  {REWARD_KIND_ICON[p.rewardKind]} {p.rewardKind === 'dice' ? `+${p.dice}` : p.rewardKind === 'essence' ? `+${p.essence}` : p.rewardKind === 'minigame_tokens' ? `+${p.minigameTokens}` : `+${p.stickerFragments}`}
                </span>
              ))}
            </div>
          )}
          {/* Decorative themed event banner — only shown when an event is active */}
          {activeTimedEvent ? (() => {
            const meta = EVENT_BANNER_META[activeTimedEvent.eventType] ?? { icon: '⭐', displayName: activeTimedEvent.eventType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) };
            return (
              <div className={`island-run-board__rewardbar-banner island-run-board__rewardbar-banner--${activeTimedEvent.eventType}`}>
                <i className="island-run-board__rewardbar-banner-icon" aria-hidden="true">{meta.icon}</i>
                <span>{meta.displayName}</span>
                <i className="island-run-board__rewardbar-banner-icon" aria-hidden="true">{meta.icon}</i>
              </div>
            );
          })() : null}
          <div className="island-run-board__rewardbar-header">
            <span>{Math.floor(rewardBarProgress)}/{Math.floor(rewardBarThreshold)}</span>
            <span>{`Tier ${runtimeState.rewardBarEscalationTier}`}</span>
          </div>
          {/* Track row: event feed icon → track → single reward endcap (no milestones) */}
          <div className="island-run-board__rewardbar-track-row">
            <span className="island-run-board__rewardbar-avatar-indicator" aria-hidden="true">
              {(EVENT_BANNER_META[activeTimedEvent?.eventType ?? '']?.icon) ?? '⭐'}
            </span>
            <div className="island-run-board__rewardbar-track" role="progressbar" aria-valuenow={Math.floor(rewardBarPercent)} aria-valuemin={0} aria-valuemax={100}>
              <span className="island-run-board__rewardbar-track-fill" style={{ width: `${rewardBarPercent}%` }} />
              {/* Position indicator riding the fill edge */}
              <span className="island-run-board__rewardbar-position" style={{ left: `${Math.min(rewardBarPercent, 100)}%` }} aria-hidden="true" />
            </div>
            {/* Single reward endcap — shows what you'll get next */}
            <span className={`island-run-board__rewardbar-endcap${canClaimRewardBar ? ' island-run-board__rewardbar-endcap--claimable' : ''}`} aria-hidden="true">{nextRewardIcon}</span>
          </div>
          {/* Event timer + multiplier row */}
          <div className="island-run-board__rewardbar-timers">
            <span className={getTimerUrgencyClass(timedEventRemainingMs)}>{timedEventRemainingLabel}</span>
            {effectiveMultiplier > 1 && (
              <span className="island-run-board__rewardbar-multiplier-badge">×{effectiveMultiplier}</span>
            )}
          </div>
        </button>

        {/* Mini-game icon button — positioned near top-right of board */}
        {activeTimedEvent && (
          <button
            type="button"
            className="island-run-board__minigame-icon-btn"
            aria-label="Open mini-game"
            onClick={() => {
              setShowMinigameDialog(true);
              playIslandRunSound('minigame_open');
            }}
          >
            <span className="island-run-board__minigame-icon-emoji" aria-hidden="true">
              {EVENT_BANNER_META[activeTimedEvent.eventType]?.icon ?? '🎮'}
            </span>
            <span className="island-run-board__minigame-icon-label">{spinTokens} 🎫</span>
          </button>
        )}

        {/* Sticker album button */}
        <button
          type="button"
          className="island-run-board__sticker-album-btn"
          aria-label="Sticker album"
          onClick={() => setShowStickerAlbumDialog(true)}
        >
          🧩 {runtimeState.stickerProgress.fragments}/5
        </button>

        <BoardStage
          anchors={activeTileAnchors}
          theme={activeTheme}
          backgroundSrc={islandBackgroundSrc}
          isBackgroundAvailable={isIslandBackgroundAvailable}
          onBackgroundError={() => setIsIslandBackgroundAvailable(false)}
          spark40RingGradient={spark40RingSegmentsGradient}
          isSpark40={isSpark40BoardProfile}
          showDebug={showDebug}
          isMinimalBoardArt={isMinimalBoardArt}
          boardTiltXDeg={boardTiltXDeg}
          boardRotateZDeg={boardRotateZDeg}
          tileMap={tileMap}
          stopMap={stopMap}
          completedEncounterIndices={completedEncounterIndices}
          tokenIndex={tokenIndex}
          orbitStopVisuals={orbitStopVisuals}
          activeStopId={activeStopId}
          getOrbitStopDisplayIcon={getOrbitStopDisplayIcon}
          onStopClick={(stopId) => {
            requestActiveStopTransition(stopId, 'orbit_stop_click');
            setFocusedStopId(stopId);
            setCameraMode('stop_focus');
          }}
          pendingHopSequence={pendingHopSequence}
          onHopSequenceComplete={() => {
            setPendingHopSequence(null);
            hopSequenceResolverRef.current?.();
            hopSequenceResolverRef.current = null;
          }}
          onCameraReady={(controls) => { boardCameraRef.current = controls; }}
          onTokenHop={(tileIndex) => {
            playIslandRunSound('token_move');
          }}
          onTokenLand={(tileIndex) => {
            playIslandRunSound('stop_land');
            triggerIslandRunHaptic('stop_land');
          }}
          isRolling={isRolling}
          diceFaces={rollingDiceFaces}
          onDiceRollComplete={() => {
            diceRollCompleteResolverRef.current?.();
            diceRollCompleteResolverRef.current = null;
          }}
        />
      </div>

      {/* Dice roll total overlay — shown briefly after dice settle */}
      {diceRollTotalOverlay && (
        <div className="island-run-board__dice-roll-overlay" aria-live="polite">
          {diceRollTotalOverlay}
        </div>
      )}

      <div className="island-run-prototype__footer" aria-label="Island Run footer controls">
        <div className="island-run-prototype__footer-main">
          {/* Footer stats row removed: essence icon (duplicate of top bar) and 🎯 roll chip removed per UI cleanup */}

          <div className="island-run-prototype__footer-actions">
            <button
              type="button"
              className="island-run-prototype__footer-nav-btn"
              onClick={openSanctuaryPanel}
            >
              🐾 Creatures
            </button>
            <button
              type="button"
              className="island-run-prototype__footer-nav-btn"
              onClick={() => setShowStoryReader(true)}
            >
              📖 Story
            </button>
            <div className="island-run-prototype__footer-dice-group">
              {/* Multiplier selector — placed above dice for symmetry */}
              <button
                type="button"
                className={`island-run-prototype__footer-multiplier-btn${effectiveMultiplier > 1 ? ' island-run-prototype__footer-multiplier-btn--active' : ''}`}
                onClick={() => {
                  const unlocked = multiplierTiers.filter((t) => t.unlocked).map((t) => t.multiplier);
                  if (unlocked.length <= 1) return;
                  const currentIdx = unlocked.indexOf(effectiveMultiplier);
                  const nextIdx = (currentIdx + 1) % unlocked.length;
                  setDiceMultiplier(unlocked[nextIdx]!);
                }}
                title={`Cost: ${effectiveDiceCost} dice/roll · Max: ×${multiplierTiers.filter((t) => t.unlocked).pop()?.multiplier ?? 1}`}
              >
                ×{effectiveMultiplier}
                {effectiveMultiplier > 1 && <span className="island-run-prototype__footer-nav-btn-cost"> (-{effectiveDiceCost})</span>}
              </button>
              <button
                type="button"
                className={`island-run-prototype__roll-btn island-run-prototype__roll-btn--cta island-run-prototype__roll-btn--footer ${rollButtonMode === 'roll' ? 'island-run-prototype__roll-btn--primary' : 'island-run-prototype__roll-btn--convert'}`}
                onClick={isIslandTimerPendingStart ? activateCurrentIsland : () => void handleRoll()}
                disabled={!isIslandTimerPendingStart && Boolean(rollDisabledReason)}
              >
                <span className="island-run-prototype__footer-roll-btn-content">
                  <span className="island-run-prototype__footer-roll-btn-dice">🎲 {hasHydratedRuntimeState ? dicePool : '—'}{effectiveMultiplier > 1 ? ` ×${effectiveMultiplier}` : ''}</span>
                  <span>{isIslandTimerPendingStart ? 'Start Island' : rollButtonLabel}</span>
                </span>
              </button>
              {/* Dice regen countdown — like Monopoly GO "X rolls ready in MM:SS" */}
              {diceRegenCountdown && diceRegenRollsReady != null && (
                <div className="island-run-prototype__dice-regen-timer" aria-live="polite">
                  <strong>{diceRegenRollsReady}</strong> rolls ready in <strong>{diceRegenCountdown}</strong>
                </div>
              )}
            </div>
            <button
              type="button"
              className="island-run-prototype__footer-nav-btn"
              onClick={openShopPanel}
            >
              🛍️ Market
            </button>
            <button
              type="button"
              className="island-run-prototype__footer-nav-btn"
              onClick={() => setShowBuildPanel(true)}
            >
              🔨 Build
            </button>
            {false && spinTokens > 0 && (
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
                ) : activeEgg && !islandEggSlotUsed && eggStage >= 4 ? (
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
                {/* Essence bonus — spend diamonds (V2: replaces legacy timer extension) */}
                <div className="island-hatchery-card__actions">
                  {ISLAND_RUN_CONTRACT_V2_ENABLED ? (
                    diamonds >= UTILITY_ESSENCE_BONUS_COST_DIAMONDS ? (
                      <button
                        type="button"
                        className="island-stop-modal__btn island-stop-modal__btn--action"
                        onClick={() => {
                          setDiamonds((d) => d - UTILITY_ESSENCE_BONUS_COST_DIAMONDS);
                          setRuntimeState((prev) => ({
                            ...prev,
                            essence: prev.essence + UTILITY_ESSENCE_BONUS_AMOUNT,
                            essenceLifetimeEarned: prev.essenceLifetimeEarned + UTILITY_ESSENCE_BONUS_AMOUNT,
                          }));
                          setUtilityInteracted(true);
                          playIslandRunSound('utility_stop_complete');
                          triggerIslandRunHaptic('utility_stop_complete');
                          void recordTelemetryEvent({ userId: session.user.id, eventType: 'economy_spend', metadata: { stage: 'utility_essence_bonus', island_number: islandNumber, cost_diamonds: UTILITY_ESSENCE_BONUS_COST_DIAMONDS, essence_gained: UTILITY_ESSENCE_BONUS_AMOUNT } });
                          setLandingText(`Essence bonus! -${UTILITY_ESSENCE_BONUS_COST_DIAMONDS} 💎, +${UTILITY_ESSENCE_BONUS_AMOUNT} 🟣`);
                          handleCompleteActiveStop();
                        }}
                      >
                        🟣 Essence Bonus — {UTILITY_ESSENCE_BONUS_COST_DIAMONDS} 💎 → +{UTILITY_ESSENCE_BONUS_AMOUNT} Essence
                      </button>
                    ) : (
                      <p style={{ fontSize: '0.85rem', opacity: 0.65 }}>🟣 Essence Bonus — needs {UTILITY_ESSENCE_BONUS_COST_DIAMONDS} 💎 (have {diamonds})</p>
                    )
                  ) : (
                    diamonds >= UTILITY_TIMER_EXT_COST_DIAMONDS ? (
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
                    )
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
                          <strong>+{bossReward.dice} 🎲</strong>,{' '}
                          <strong>+{bossReward.essence} 🟣</strong>
                          {bossReward.spinTokens > 0
                            ? <>, <strong>{formatIslandRunSpinTokenReward({ islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED, amount: bossReward.spinTokens })}</strong></>
                            : null}
                          , <strong>+3 🔷 shards</strong>
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
                          {bossRewardSummary ?? `Rewards: +${bossReward.essence} 🟣, +3 🔷`}
                        </p>
                        <p className="island-boss-trial__next-hint">Tap <strong>Claim Island Clear</strong> to celebrate and travel.</p>
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

            {showContractV2BuildPanel && contractV2BuildPanelBuildState && contractV2BuildPanelStopState ? (
              <div style={{ marginTop: '0.75rem', marginBottom: '0.5rem', padding: '0.5rem 0.65rem', borderRadius: '10px', background: 'rgba(84, 63, 130, 0.15)', border: '1px solid rgba(197, 172, 255, 0.25)' }}>
                <p className="island-stop-modal__copy" style={{ marginBottom: '0.25rem', fontSize: '0.82rem', opacity: 0.8 }}>
                  🔨 Buildings are funded from the <strong>Build Panel</strong>. Tap the button below at any time.
                </p>
              </div>
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
                  <span className="island-encounter__reward-item">🟣 +{encounterRewardData.essence} essence</span>
                  {encounterRewardData.walletShards && <span className="island-encounter__reward-item">✨ +1 shard</span>}
                  {encounterRewardData.dice > 0 && <span className="island-encounter__reward-item">🎲 +{encounterRewardData.dice} dice</span>}
                  {encounterRewardData.spinTokens > 0 && (
                    <span className="island-encounter__reward-item">🌀 {formatIslandRunSpinTokenReward({ islandRunContractV2Enabled: ISLAND_RUN_CONTRACT_V2_ENABLED, amount: encounterRewardData.spinTokens })}</span>
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

      {showOutOfDicePurchasePrompt && (
        <div className="island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy" role="dialog" aria-modal="true" aria-label="Out of dice">
            <h3 className="island-stop-modal__title">🎲 Out of Dice</h3>
            <p className="island-stop-modal__copy">
              You do not have enough dice to roll right now. Buy more rolls or wait for dice to regenerate.
            </p>
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

      {showRewardDetailsModal && (
        <div className="island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy" role="dialog" aria-modal="true" aria-label="Reward details">
            <h3 className="island-stop-modal__title">🎁 Reward Bar Details</h3>
            <p className="island-stop-modal__copy">
              Progress: <strong>{Math.floor(rewardBarProgress)}</strong> / <strong>{Math.floor(rewardBarThreshold)}</strong> · Tier {runtimeState.rewardBarEscalationTier}
            </p>
            <p className="island-stop-modal__copy">
              Next reward: <strong>{nextRewardIcon} {nextRewardKind.replace(/_/g, ' ')}</strong>
            </p>
            <p className="island-stop-modal__copy">
              {activeTimedEvent?.eventType
                ? `Active event: ${(EVENT_BANNER_META[activeTimedEvent.eventType]?.displayName ?? activeTimedEvent.eventType)}`
                : 'No active timed event right now.'}
            </p>
            <p className="island-stop-modal__copy">
              Claims this event: {runtimeState.rewardBarClaimCountInEvent} · 🧩 Sticker fragments: {runtimeState.stickerProgress.fragments}/5
            </p>
            <p className="island-stop-modal__copy">
              Stickers collected: {Object.values(runtimeState.stickerInventory).reduce((a, b) => a + b, 0)}
              {runtimeState.stickerProgress.fragments >= 4 ? ' — 🎉 Almost a complete sticker!' : ''}
            </p>
            {effectiveMultiplier > 1 && (
              <p className="island-stop-modal__copy">
                🔥 Active multiplier: <strong>×{effectiveMultiplier}</strong> (costs {effectiveDiceCost} dice/roll) — rewards and progress are amplified!
              </p>
            )}
            <p className="island-stop-modal__copy" style={{ opacity: 0.7, fontSize: '0.85em' }}>
              The bar escalates: threshold grows each fill. Higher multipliers unlock with more dice (×2 at 20, ×5 at 100, ×10 at 200, ×50 at 1k, ×100 at 2k). Higher multipliers cost more dice per roll but fill the bar faster!
            </p>
            <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
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
        <div className="island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense" role="dialog" aria-modal="true" aria-label="Egg ready">
            <h3 className="island-stop-modal__title">🌟🥚 Egg Ready to Open!</h3>
            <p className="island-stop-modal__copy">
              Your egg has finished incubating and is ready to open. Head to the Hatchery stop to collect your creature or sell for rewards!
            </p>
            <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
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

      {/* ── Mini-game popup dialog ──────────────────────────────────────── */}
      {showMinigameDialog && (
        <div className="island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy" role="dialog" aria-modal="true" aria-label="Mini-game">
            <h3 className="island-stop-modal__title">
              {activeTimedEvent ? `${EVENT_BANNER_META[activeTimedEvent.eventType]?.icon ?? '🎮'} ${EVENT_BANNER_META[activeTimedEvent.eventType]?.displayName ?? 'Mini-game'}` : '🎮 Mini-game'}
            </h3>
            <p className="island-stop-modal__copy">
              You have <strong>{spinTokens}</strong> 🎫 tokens to spend.
            </p>
            <p className="island-stop-modal__copy">
              Each play costs <strong>3</strong> tokens. Win dice, essence, or sticker fragments!
            </p>
            <p className="island-stop-modal__copy" style={{ opacity: 0.7, fontSize: '0.85em' }}>
              Mini-game prototype — actual gameplay coming soon. For now, spending tokens simulates a play.
            </p>
            <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                disabled={spinTokens < 3}
                onClick={() => {
                  // Mock mini-game play: spend 3 tokens, award random reward
                  const reward = Math.random();
                  setSpinTokens((c) => Math.max(0, c - 3));
                  setRuntimeState((c) => ({ ...c, spinTokens: Math.max(0, c.spinTokens - 3) }));
                  if (reward < 0.4) {
                    const dice = 3 + Math.floor(Math.random() * 8);
                    setDicePool((c) => c + dice);
                    setRuntimeState((c) => ({ ...c, dicePool: c.dicePool + dice }));
                    setLandingText(`🎮 Mini-game: Won +${dice} 🎲!`);
                  } else if (reward < 0.7) {
                    const ess = 5 + Math.floor(Math.random() * 10);
                    setRuntimeState((c) => ({ ...c, essence: c.essence + ess }));
                    setLandingText(`🎮 Mini-game: Won +${ess} 🟣 essence!`);
                  } else {
                    setLandingText('🎮 Mini-game: Better luck next time!');
                  }
                  playIslandRunSound('minigame_complete');
                }}
              >
                {spinTokens >= 3 ? 'Play (3 🎫)' : 'Not enough tokens'}
              </button>
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                onClick={() => setShowMinigameDialog(false)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ── Sticker album dialog ────────────────────────────────────────── */}
      {showStickerAlbumDialog && (
        <div className="island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy" role="dialog" aria-modal="true" aria-label="Sticker album">
            <h3 className="island-stop-modal__title">🧩 Sticker Album</h3>
            <p className="island-stop-modal__copy">
              Fragments: <strong>{runtimeState.stickerProgress.fragments}</strong> / 5
              {runtimeState.stickerProgress.fragments >= 5 ? ' — Ready to create a sticker!' : ''}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '8px 0' }}>
              {TIMED_EVENT_SEQUENCE.map((template) => {
                const count = runtimeState.stickerInventory[template.stickerId] ?? 0;
                return (
                  <div key={template.templateId} style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: count > 0 ? 'rgba(255,215,0,0.15)' : 'rgba(128,128,128,0.1)',
                    border: count > 0 ? '1px solid rgba(255,215,0,0.4)' : '1px solid rgba(128,128,128,0.2)',
                    textAlign: 'center',
                    minWidth: '80px',
                  }}>
                    <div style={{ fontSize: '1.5em' }}>{template.icon}</div>
                    <div style={{ fontSize: '0.75em', opacity: 0.8 }}>{template.eventType.replace(/_/g, ' ')}</div>
                    <div style={{ fontWeight: 'bold' }}>{count > 0 ? `×${count}` : '—'}</div>
                  </div>
                );
              })}
            </div>
            <p className="island-stop-modal__copy">
              Each complete sticker awards <strong>+100 🎲 dice</strong> and <strong>+50 🟣 essence</strong>!
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
        <div className="island-clear-celebration" role="status" aria-live="polite">
          <div className="island-clear-celebration__card island-clear-celebration__card--boss">
            <p className="island-clear-celebration__confetti" aria-hidden="true">🎉✨🏆✨🎉</p>
            <p className="island-clear-celebration__eyebrow">Boss Defeated! Island Cleared!</p>
            <p className="island-clear-celebration__title">🏆 Island {islandClearStats.islandNumber} Complete!</p>
            <div className="island-clear-celebration__rewards">
              <span className="island-clear-celebration__reward-item">🎲 +{islandClearStats.diceEarned}</span>
              <span className="island-clear-celebration__reward-item">🟣 +{islandClearStats.essenceEarned}</span>
              <span className="island-clear-celebration__reward-item">🔷 +3</span>
            </div>
            <p className="island-clear-celebration__stops">✅ {islandClearStats.stopsCleared} stops cleared · 🛍️ Market Tier 2 unlocked</p>
          </div>
        </div>
      )}

      {/* M14: unified shop panel (merged shop + market) */}
      {showShopPanel && (
        <div className="island-stop-modal-backdrop" role="presentation">
          <section className="island-run-shop-panel island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy" role="dialog" aria-modal="true" aria-label="Shop">
            <h3 className="island-stop-modal__title">🛍️ Market</h3>
            <p className="island-stop-modal__copy"><strong>🟣 {runtimeState.essence} essence</strong> · Island {islandNumber}</p>

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
                    🎲 Dice Bundle — {MARKET_DICE_BUNDLE_COST} 🟣 → +{MARKET_DICE_BUNDLE_REWARD} 🎲
                    {runtimeState.essence < MARKET_DICE_BUNDLE_COST && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}> (need {MARKET_DICE_BUNDLE_COST - runtimeState.essence} more)</span>}
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

      {/* Build panel — proper modal with 5 buildings, tap/hold to fund */}
      {showBuildPanel && ISLAND_RUN_CONTRACT_V2_ENABLED && (
        <div className="island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal island-stop-modal--readable island-stop-modal--dense island-stop-modal--longcopy build-panel-modal" role="dialog" aria-modal="true" aria-label="Build overview">
            <h3 className="island-stop-modal__title">🔨 Island Buildings</h3>
            <p className="island-stop-modal__copy" style={{ marginBottom: '0.6rem' }}>
              <strong>🟣 {runtimeState.essence}</strong> Essence available
            </p>

            <div className="build-panel__buildings">
              {islandStopPlan.map((stopEntry, idx) => {
                const buildState = runtimeState.stopBuildStateByIndex[idx];
                const stopState = runtimeState.stopStatesByIndex[idx];
                if (!stopEntry || !buildState) return null;

                const isFullyBuilt = isStopBuildFullyComplete(buildState);
                const remaining = isFullyBuilt ? 0 : Math.max(0, buildState.requiredEssence - buildState.spentEssence);
                const canAfford = runtimeState.essence >= Math.min(CONTRACT_V2_ESSENCE_SPEND_STEP, remaining);
                const levelIcon = ['🏗️', '🏠', '🏡', '🏰'][Math.min(buildState.buildLevel, 3)];

                const handleBuildStart = (e: React.MouseEvent | React.TouchEvent) => {
                  e.preventDefault();
                  if (isFullyBuilt || !canAfford) return;
                  handleSpendEssenceOnBuild(idx);
                  // Hold-to-build: fire repeatedly while held
                  let holdTimer: ReturnType<typeof window.setTimeout> | undefined;
                  let holdInterval: ReturnType<typeof window.setInterval> | undefined;
                  const stopHold = () => {
                    if (holdTimer) window.clearTimeout(holdTimer);
                    if (holdInterval) window.clearInterval(holdInterval);
                    window.removeEventListener('mouseup', stopHold);
                    window.removeEventListener('touchend', stopHold);
                  };
                  holdTimer = window.setTimeout(() => {
                    holdInterval = window.setInterval(() => {
                      // Re-check on each tick: stop if fully built or out of essence.
                      const liveBuildState = runtimeStateRef.current.stopBuildStateByIndex[idx];
                      if (!liveBuildState || isStopBuildFullyComplete(liveBuildState)) {
                        stopHold();
                        return;
                      }
                      if (runtimeStateRef.current.essence < CONTRACT_V2_ESSENCE_SPEND_STEP) {
                        stopHold();
                        return;
                      }
                      handleSpendEssenceOnBuild(idx);
                    }, 150);
                  }, 500);
                  window.addEventListener('mouseup', stopHold, { once: true });
                  window.addEventListener('touchend', stopHold, { once: true });
                };

                return (
                  <div
                    key={stopEntry.stopId}
                    className={`build-panel__building build-panel__building--level-${buildState.buildLevel}${isFullyBuilt ? ' build-panel__building--complete' : ''}`}
                    onMouseDown={!isFullyBuilt ? handleBuildStart : undefined}
                    onTouchStart={!isFullyBuilt ? handleBuildStart : undefined}
                    role="button"
                    tabIndex={isFullyBuilt ? -1 : 0}
                    aria-label={`${stopEntry.title ?? stopEntry.stopId} — Level ${buildState.buildLevel} of ${MAX_BUILD_LEVEL}`}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !isFullyBuilt) {
                        handleSpendEssenceOnBuild(idx);
                      }
                    }}
                  >
                    <div className="build-panel__building-icon">{levelIcon}</div>
                    <div className="build-panel__building-info">
                      <span className="build-panel__building-name">{stopEntry.title ?? stopEntry.stopId}</span>
                      <span className="build-panel__building-status">
                        {isFullyBuilt
                          ? `L${MAX_BUILD_LEVEL} ✅ Fully Built`
                          : `L${buildState.buildLevel + 1}: ${buildState.spentEssence}/${buildState.requiredEssence} 🟣`}
                      </span>
                      <div className="build-panel__level-bar">
                        {Array.from({ length: MAX_BUILD_LEVEL }, (_, li) => (
                          <div
                            key={li}
                            className={`build-panel__level-pip${li < buildState.buildLevel ? ' build-panel__level-pip--done' : li === buildState.buildLevel && !isFullyBuilt ? ' build-panel__level-pip--active' : ''}`}
                          />
                        ))}
                      </div>
                      {!isFullyBuilt && (
                        <span className="build-panel__building-objective">
                          Obj: {stopState?.objectiveComplete ? '✅' : '⏳'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {isCurrentIslandFullyCleared && (
              <div style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                  onClick={() => {
                    setShowBuildPanel(false);
                    const bossReward = getBossReward(islandNumber);
                    logGameSession(session.user.id, {
                      gameId: 'shooter_blitz',
                      action: 'complete',
                      timestamp: new Date().toISOString(),
                      metadata: {
                        stage: 'island_run_boss_island_cleared',
                        island_number: islandNumber,
                        rewards_granted: { dice: bossReward.dice, coins: 0, essence: bossReward.essence },
                      },
                    });
                    setShowIslandClearCelebration(true);
                    setIslandClearStats({
                      islandNumber,
                      diceEarned: bossReward.dice,
                      essenceEarned: bossReward.essence,
                      stopsCleared: 5,
                    });
                    setShowTravelOverlay(true);
                    window.setTimeout(() => {
                      const nextIsland = islandNumber + 1;
                      setShowTravelOverlay(false);
                      performIslandTravel(nextIsland, { startTimer: true });
                    }, 1400);
                  }}
                >
                  🎉 Claim Island Clear!
                </button>
              </div>
            )}

            <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary"
                onClick={() => setShowBuildPanel(false)}
              >
                ✕ Close
              </button>
            </div>
          </section>
        </div>
      )}

      {showPerfectCompanionOnboardingHint && (
        <div className="island-stop-modal-backdrop" role="presentation">
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
                    setActiveCompanionId(perfectCompanionOnboardingCreatureId);
                    saveActiveCompanionId(session.user.id, perfectCompanionOnboardingCreatureId);
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
              <span className="island-run-sanctuary-panel__pill">🔮 Shards: <strong>{runtimeState.shards}</strong></span>
              <span className="island-run-sanctuary-panel__pill">Basic treats: <strong>{creatureTreatInventory.basic}</strong></span>
              <span className="island-run-sanctuary-panel__pill">Favorite snacks: <strong>{creatureTreatInventory.favorite}</strong></span>
              <span className="island-run-sanctuary-panel__pill">Rare feasts: <strong>{creatureTreatInventory.rare}</strong></span>
            </div>

            {/* ── Shard Shop: buy treats & creature items with egg shards ── */}
            <div className="island-hatchery-card" style={{ marginBottom: '0.75rem' }}>
              <p><strong>🔮 Shard Shop</strong> — Spend egg shards on your creatures</p>
              <p style={{ fontSize: '0.82rem', opacity: 0.7, marginBottom: '0.5rem' }}>
                Shards are earned from tiles, egg hatching, and stop completions. Spend them here!
              </p>
              <div className="island-hatchery-card__actions" style={{ flexDirection: 'column', gap: '0.35rem' }}>
                <button
                  type="button"
                  className="island-stop-modal__btn island-stop-modal__btn--action"
                  disabled={runtimeState.shards < 3}
                  onClick={() => {
                    if (runtimeState.shards < 3) return;
                    const newShards = runtimeState.shards - 3;
                    setRuntimeState((prev) => ({ ...prev, shards: newShards }));
                    void persistIslandRunRuntimeStatePatch({ session, client, patch: { shards: newShards } });
                    setCreatureTreatInventory((prev) => ({ ...prev, basic: prev.basic + 2 }));
                    if (session?.user?.id) {
                      earnCreatureTreatsForUser(session.user.id, { basic: 2 });
                    }
                    setLandingText('🔮 Bought 2 Basic Treats for 3 shards!');
                    playIslandRunSound('market_purchase_success');
                  }}
                >
                  🍖 Basic Treat ×2 — 3 🔮 {runtimeState.shards < 3 && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}> (need {3 - runtimeState.shards} more)</span>}
                </button>
                <button
                  type="button"
                  className="island-stop-modal__btn island-stop-modal__btn--action"
                  disabled={runtimeState.shards < 5}
                  onClick={() => {
                    if (runtimeState.shards < 5) return;
                    const newShards = runtimeState.shards - 5;
                    setRuntimeState((prev) => ({ ...prev, shards: newShards }));
                    void persistIslandRunRuntimeStatePatch({ session, client, patch: { shards: newShards } });
                    setCreatureTreatInventory((prev) => ({ ...prev, favorite: prev.favorite + 1 }));
                    if (session?.user?.id) {
                      earnCreatureTreatsForUser(session.user.id, { favorite: 1 });
                    }
                    setLandingText('🔮 Bought 1 Favorite Snack for 5 shards!');
                    playIslandRunSound('market_purchase_success');
                  }}
                >
                  🐟 Favorite Snack ×1 — 5 🔮 {runtimeState.shards < 5 && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}> (need {5 - runtimeState.shards} more)</span>}
                </button>
                <button
                  type="button"
                  className="island-stop-modal__btn island-stop-modal__btn--action"
                  disabled={runtimeState.shards < 10}
                  onClick={() => {
                    if (runtimeState.shards < 10) return;
                    const newShards = runtimeState.shards - 10;
                    setRuntimeState((prev) => ({ ...prev, shards: newShards }));
                    void persistIslandRunRuntimeStatePatch({ session, client, patch: { shards: newShards } });
                    setCreatureTreatInventory((prev) => ({ ...prev, rare: prev.rare + 1 }));
                    if (session?.user?.id) {
                      earnCreatureTreatsForUser(session.user.id, { rare: 1 });
                    }
                    setLandingText('🔮 Bought 1 Rare Feast for 10 shards!');
                    playIslandRunSound('market_purchase_success');
                  }}
                >
                  🍗 Rare Feast ×1 — 10 🔮 {runtimeState.shards < 10 && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}> (need {10 - runtimeState.shards} more)</span>}
                </button>
                <button
                  type="button"
                  className="island-stop-modal__btn island-stop-modal__btn--action"
                  disabled={runtimeState.shards < 8 || !activeCompanion}
                  onClick={() => {
                    if (runtimeState.shards < 8 || !activeCompanion) return;
                    const newShards = runtimeState.shards - 8;
                    setRuntimeState((prev) => ({ ...prev, shards: newShards }));
                    void persistIslandRunRuntimeStatePatch({ session, client, patch: { shards: newShards } });
                    // Award 3 bond XP directly to active companion
                    sanctuaryHandlers.awardBondXp(activeCompanion.creatureId, 3);
                    setLandingText(`🔮 Enrichment Kit applied to ${activeCompanion.creature.name}: +3 bond XP!`);
                    playIslandRunSound('market_purchase_success');
                  }}
                >
                  🧸 Enrichment Kit — 8 🔮 → +3 bond XP to active companion {!activeCompanion && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}> (no active companion)</span>}
                  {activeCompanion && runtimeState.shards < 8 && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}> (need {8 - runtimeState.shards} more)</span>}
                </button>
                <button
                  type="button"
                  className="island-stop-modal__btn island-stop-modal__btn--action"
                  disabled={runtimeState.shards < 20 || !activeCompanion}
                  onClick={() => {
                    if (runtimeState.shards < 20 || !activeCompanion) return;
                    const newShards = runtimeState.shards - 20;
                    setRuntimeState((prev) => ({ ...prev, shards: newShards }));
                    void persistIslandRunRuntimeStatePatch({ session, client, patch: { shards: newShards } });
                    // Award 8 bond XP (habitat upgrade bonus)
                    sanctuaryHandlers.awardBondXp(activeCompanion.creatureId, 8);
                    setLandingText(`🔮 Habitat Upgrade for ${activeCompanion.creature.name}: +8 bond XP!`);
                    playIslandRunSound('market_purchase_success');
                    triggerIslandRunHaptic('market_purchase_success');
                  }}
                >
                  🏠 Habitat Upgrade — 20 🔮 → +8 bond XP to active companion {!activeCompanion && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}> (no active companion)</span>}
                  {activeCompanion && runtimeState.shards < 20 && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}> (need {20 - runtimeState.shards} more)</span>}
                </button>
              </div>
            </div>
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
            {isUsingStarterProfileForPerfectCompanion ? (
              <p className="island-run-sanctuary-panel__starter-note">
                ⭐ Using starter profile until your archetype hand is set.
              </p>
            ) : null}

            {!selectedSanctuaryCreature && collectedCreatures.length > 0 ? (
              <div className="island-run-sanctuary-toolbar">
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
                {topPerfectCompanionEntries.length > 0 ? (
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
                <p className="island-run-sanctuary-zone-capacity__progress-note">
                  Progression unlock: <strong>{sanctuaryTierRevealLabel}</strong>. Deeper slots reveal as your island tier advances.
                </p>
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
                      {perfectCompanionIdSet.has(creature.creatureId) ? (
                        <p className="island-run-sanctuary-card__meta"><strong>⭐ Perfect for your hand</strong></p>
                      ) : null}
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
                const { coins: rewardCoins = 0, dice: rewardDice = 0, spinTokens: rewardSpinTokens = 0 } = result.reward;
                if (rewardCoins > 0) {
                  setCoins((c) => c + rewardCoins);
                  void awardGold(session.user.id, rewardCoins, 'shooter_blitz', 'island_run_minigame_reward');
                }
                if (rewardDice > 0) setDicePool((d) => d + rewardDice);
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
            coins,
            spinTokens,
            eggStage,
            activeStopId,
            isRolling,
            cameraMode,
            timeLeftSec,
            showTravelOverlay,
            islandExpiresAtMs,
            islandStartedAtMs,
            hasHydratedRuntimeState,
            diceRegenCountdown,
          }}
          onClose={() => setShowDebugPanel(false)}
        />
      )}

    </section>
  );
}
