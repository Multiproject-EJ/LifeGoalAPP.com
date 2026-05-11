import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { isDemoSession } from '../../../../services/demoSession';
import { getIslandRunDeviceSessionId } from './islandRunDeviceSession';
import { ISLAND_RUN_DEFAULT_STARTING_DICE } from './islandRunEconomy';
import type { IslandRunRuntimeHydrationSource } from './islandRunRuntimeTelemetry';
import { logIslandRunEntryDebug } from './islandRunEntryDebug';
import { commitIslandRunRuntimeSnapshot } from './islandRunCommitActionService';
import { sanitizeStopTicketsPaidByIsland } from './islandRunStopTickets';
import {
  clampBonusCharge,
  sanitizeBonusTileChargeByIsland,
  type BonusTileChargeByIsland,
} from './islandRunBonusTile';

export type PerIslandEggStatus = 'incubating' | 'ready' | 'collected' | 'sold';

/** Where an egg lives: on a specific island, or dormant after hatching while the player is away. */
export type PerIslandEggLocation = 'island' | 'dormant';

export interface PerIslandEggEntry {
  tier: 'common' | 'rare' | 'mythic';
  setAtMs: number;
  hatchAtMs: number;
  status: PerIslandEggStatus;
  /** Location flag for dormant/carryover tracking. */
  location?: PerIslandEggLocation;
  /** Unix ms timestamp when the egg was collected or sold. */
  openedAt?: number;
  /** Unix ms timestamp when the hatched animal was collected from the egg. */
  animalCollectedAtMs?: number;
}

/** Key = island number (as string), value = egg entry */
export type PerIslandEggsLedger = Record<string, PerIslandEggEntry>;

export type EggRewardInventorySource = 'treasure_path';
export type EggRewardInventoryTier = 'common' | 'rare';
export type EggRewardInventoryStatus = 'unopened' | 'opened';
export type EggRewardInventoryResolverVersion = 'treasure_path_egg_v1';
export const EGG_REWARD_RARITY_ROLL_DENOMINATOR = 500 as const;
export const EGG_REWARD_RARITY_THRESHOLD = 5 as const;

export interface EggRewardInventoryEntry {
  eggRewardId: string;
  source: EggRewardInventorySource;
  sourceSessionKey: string;
  sourceRunId: string;
  sourceRewardId: string;
  tileId: number;
  cycleIndex: number;
  targetIslandNumber: number;
  eggTier: EggRewardInventoryTier;
  eggSeed: number;
  rarityRoll: number;
  rarityRollDenominator: typeof EGG_REWARD_RARITY_ROLL_DENOMINATOR;
  rarityThreshold: typeof EGG_REWARD_RARITY_THRESHOLD;
  resolverVersion: EggRewardInventoryResolverVersion;
  status: EggRewardInventoryStatus;
  grantedAtMs: number;
  openedAtMs: number | null;
  openedCreatureId?: string;
}

export interface PerfectCompanionReason {
  strength: string[];
  weaknessSupport: string[];
  zoneMatch: boolean;
}

export interface CreatureCollectionRuntimeEntry {
  creatureId: string;
  copies: number;
  firstCollectedAtMs: number;
  lastCollectedAtMs: number;
  lastCollectedIslandNumber: number;
  bondXp: number;
  bondLevel: number;
  lastFedAtMs: number | null;
  claimedBondMilestones: number[];
}



export type IslandRunLuckyRollSessionStatus = 'active' | 'completed' | 'banked' | 'expired';

export type IslandRunLuckyRollRewardType = 'dice' | 'essence' | 'shards' | 'diamonds' | 'sticker' | 'minigame_ticket' | 'gold' | 'game_tokens' | 'unknown';

export interface IslandRunLuckyRollRewardEntry {
  rewardId: string;
  tileId: number;
  rewardType: IslandRunLuckyRollRewardType;
  amount: number;
  eventId?: string;
  metadata?: Record<string, unknown>;
}

export interface IslandRunLuckyRollSession {
  status: IslandRunLuckyRollSessionStatus;
  runId: string;
  targetIslandNumber: number;
  cycleIndex: number;
  position: number;
  rollsUsed: number;
  claimedTileIds: number[];
  pendingRewards: IslandRunLuckyRollRewardEntry[];
  bankedRewards: IslandRunLuckyRollRewardEntry[];
  startedAtMs: number;
  bankedAtMs: number | null;
  updatedAtMs: number;
}

export type IslandRunLuckyRollSessionsByMilestone = Record<string, IslandRunLuckyRollSession>;

export function getIslandRunLuckyRollSessionKey(cycleIndex: number, targetIslandNumber: number): string {
  const safeCycleIndex = Number.isFinite(cycleIndex) ? Math.max(0, Math.floor(cycleIndex)) : 0;
  const safeTargetIslandNumber = Number.isFinite(targetIslandNumber) ? Math.max(1, Math.floor(targetIslandNumber)) : 1;
  return `${safeCycleIndex}:${safeTargetIslandNumber}`;
}

export interface SpaceExcavatorProgressEntry {
  eventId: string;
  boardIndex: number;
  boardSize: number;
  treasureCount: number;
  treasureTileIds: number[];
  dugTileIds: number[];
  foundTreasureTileIds: number[];
  completedBoardCount: number;
  status: 'active' | 'won';
  updatedAtMs: number;
}

export interface IslandRunGameStateRecord {
  runtimeVersion: number;
  firstRunClaimed: boolean;
  dailyHeartsClaimedDayKey: string | null;
  onboardingDisplayNameLoopCompleted: boolean;
  storyPrologueSeen: boolean;
  audioEnabled: boolean;
  currentIslandNumber: number;
  cycleIndex: number;
  bossTrialResolvedIslandNumber: number | null;
  activeEggTier: 'common' | 'rare' | 'mythic' | null;
  activeEggSetAtMs: number | null;
  activeEggHatchDurationMs: number | null;
  activeEggIsDormant: boolean;
  perIslandEggs: PerIslandEggsLedger;
  eggRewardInventory: EggRewardInventoryEntry[];
  islandStartedAtMs: number;
  islandExpiresAtMs: number;
  islandShards: number;
  tokenIndex: number;
  /** Legacy wallet. Do not use as timed-event ticket authority. Timed-event tickets are minigameTicketsByEvent[eventId]. */
  spinTokens: number;
  dicePool: number;
  shardTierIndex: number;
  shardClaimCount: number;
  shields: number;
  shards: number;
  diamonds: number;
  creatureTreatInventory: {
    basic: number;
    favorite: number;
    rare: number;
  };
  companionBonusLastVisitKey: string | null;
  completedStopsByIsland: Record<string, string[]>;
  /**
   * Per-island essence-ticket ledger. Key = islandNumber (string), value = list
   * of stop indices (1–4) whose ticket has been paid for that island visit.
   * Hatchery (index 0) is implicitly always paid and must never appear in the
   * list. See `islandRunStopTickets.ts` for the pay/resolve semantics.
   */
  stopTicketsPaidByIsland: Record<string, number[]>;
  /**
   * Per-(island, tileIndex) bonus-tile charge ledger for the glowing "bonus"
   * ring tile. Outer key = islandNumber (string). Inner key = ring tile index.
   * Value = charge count in [1, BONUS_CHARGE_TARGET]; zero entries are pruned
   * on write. See `islandRunBonusTile.ts` for the accumulator semantics.
   */
  bonusTileChargeByIsland: BonusTileChargeByIsland;
  marketOwnedBundlesByIsland: Record<string, {
    dice_bundle: boolean;
    heart_bundle: boolean;
    heart_boost_bundle: boolean;
  }>;
  creatureCollection: CreatureCollectionRuntimeEntry[];
  activeCompanionId: string | null;
  perfectCompanionIds: string[];
  perfectCompanionReasons: Record<string, PerfectCompanionReason>;
  perfectCompanionComputedAtMs: number | null;
  perfectCompanionModelVersion: string | null;
  perfectCompanionComputedCycleIndex: number | null;
  activeStopIndex: number;
  activeStopType: 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss';
  stopStatesByIndex: Array<{
    objectiveComplete: boolean;
    buildComplete: boolean;
    completedAtMs?: number;
  }>;
  stopBuildStateByIndex: Array<{
    requiredEssence: number;
    spentEssence: number;
    buildLevel: number;
  }>;
  bossState: {
    unlocked: boolean;
    objectiveComplete: boolean;
    buildComplete: boolean;
    completedAtMs?: number;
  };
  essence: number;
  essenceLifetimeEarned: number;
  essenceLifetimeSpent: number;
  diceRegenState: {
    maxDice: number;
    regenRatePerHour: number;
    lastRegenAtMs: number;
  } | null;
  rewardBarProgress: number;
  rewardBarThreshold: number;
  rewardBarClaimCountInEvent: number;
  rewardBarEscalationTier: number;
  rewardBarLastClaimAtMs: number | null;
  rewardBarBoundEventId: string | null;
  rewardBarLadderId: string | null;
  activeTimedEvent: {
    eventId: string;
    eventType: string;
    startedAtMs: number;
    expiresAtMs: number;
    version: number;
  } | null;
  activeTimedEventProgress: {
    feedingActions: number;
    tokensEarned: number;
    milestonesClaimed: number;
  };
  stickerProgress: {
    fragments: number;
    guaranteedAt?: number;
    pityCounter?: number;
  };
  stickerInventory: Record<string, number>;
  lastEssenceDriftLost: number;
  /**
   * Per-timed-event ledger of unused minigame-launch tickets. Key: canonical
   * event id (`feeding_frenzy` | `lucky_spin` | `space_excavator` |
   * `companion_feast` or any future event id). Value: non-negative integer
   * count. Zero entries are pruned on write. Populated by Stripe ticket
   * top-ups and drained by event mini-game launches (Phase 6/7 of the
   * Minigame & Events Consolidation Plan).
   */
  minigameTicketsByEvent: Record<string, number>;
  luckyRollSessionsByMilestone: IslandRunLuckyRollSessionsByMilestone;
  spaceExcavatorProgressByEvent: Record<string, SpaceExcavatorProgressEntry>;
}

const ISLAND_RUN_RUNTIME_STATE_TABLE = 'island_run_runtime_state';
const ISLAND_RUN_REMOTE_BACKOFF_MS = 60 * 1000;
const CONTRACT_V2_STOP_COUNT = 5;
const DEFAULT_STOP_BUILD_REQUIRED_ESSENCE = 100; // Placeholder for phase-2 tuning.
const DEFAULT_REWARD_BAR_THRESHOLD = 10; // Placeholder for phase-2 tuning.

type IslandRunRuntimeCommitSyncState = 'idle' | 'committing' | 'blocked_remote_backoff' | 'blocked_conflict_recovery';
type IslandRunRuntimeCommitParkReason = 'single_flight' | 'backoff' | 'conflict_recovery';

/**
 * Runtime commit coordinator — enforced invariants:
 *
 * 1. Max 1 in-flight commit per user at any time (single-flight via inFlightCount).
 * 2. No commits are attempted while remote backoff is active.
 * 3. Parked writes resume only after the in-flight slot clears (via setTimeout).
 * 4. clientActionId includes a monotonic counter, guaranteeing no false dedupe.
 * 5. syncState always resets to 'idle' in the finally block when inFlightCount === 0.
 */
interface IslandRunRuntimeCommitCoordinator {
  syncState: IslandRunRuntimeCommitSyncState;
  inFlightCount: number;
  inFlightActionIds: Set<string>;
  parkedActionId: string | null;
  parkedRecord: IslandRunGameStateRecord | null;
  parkedReason: IslandRunRuntimeCommitParkReason | null;
}

const runtimeCommitCoordinatorByUser = new Map<string, IslandRunRuntimeCommitCoordinator>();
let runtimeCommitAttemptCounter = 0;

export function resetIslandRunRuntimeCommitCoordinatorForTests(): void {
  runtimeCommitCoordinatorByUser.clear();
  runtimeCommitAttemptCounter = 0;
}

export function getIslandRunRuntimeCommitSyncStateForTests(userId: string): IslandRunRuntimeCommitSyncState {
  return getRuntimeCommitCoordinator(userId).syncState;
}

function getRuntimeCommitCoordinator(userId: string): IslandRunRuntimeCommitCoordinator {
  const existing = runtimeCommitCoordinatorByUser.get(userId);
  if (existing) return existing;

  const created: IslandRunRuntimeCommitCoordinator = {
    syncState: 'idle',
    inFlightCount: 0,
    inFlightActionIds: new Set<string>(),
    parkedActionId: null,
    parkedRecord: null,
    parkedReason: null,
  };
  runtimeCommitCoordinatorByUser.set(userId, created);
  return created;
}

function buildRuntimeCommitAttemptId(userId: string) {
  runtimeCommitAttemptCounter += 1;
  return `runtime-commit-${userId}-${Date.now()}-${runtimeCommitAttemptCounter}`;
}

/**
 * Lightweight deterministic hash used for client action dedupe keys only.
 * This is intentionally non-cryptographic and not used for security decisions.
 */
function hashRuntimeCommitPayload(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function stableRuntimeCommitStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableRuntimeCommitStringify(entry)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableRuntimeCommitStringify(entryValue)}`);
  return `{${entries.join(',')}}`;
}

function buildRuntimeClientActionId(userId: string, record: IslandRunGameStateRecord): string {
  runtimeCommitAttemptCounter += 1;
  return `runtime-${userId}-${runtimeCommitAttemptCounter}-${Math.max(0, Math.floor(record.runtimeVersion))}-${hashRuntimeCommitPayload(stableRuntimeCommitStringify(record))}`;
}

export function deriveIslandRunContractV2StopType(index: number): 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss' {
  switch (index) {
    case 0:
      return 'hatchery';
    case 1:
      return 'habit';
    case 2:
      return 'mystery';
    case 3:
      return 'wisdom';
    case 4:
    default:
      return 'boss';
  }
}

function getDefaultStopStatesByIndex() {
  return Array.from({ length: CONTRACT_V2_STOP_COUNT }, () => ({
    objectiveComplete: false,
    buildComplete: false,
  }));
}

function getDefaultStopBuildStateByIndex() {
  return Array.from({ length: CONTRACT_V2_STOP_COUNT }, () => ({
    requiredEssence: DEFAULT_STOP_BUILD_REQUIRED_ESSENCE,
    spentEssence: 0,
    buildLevel: 0,
  }));
}

function toStopStateEntry(value: unknown): { objectiveComplete: boolean; buildComplete: boolean; completedAtMs?: number } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { objectiveComplete: false, buildComplete: false };
  }

  const candidate = value as Record<string, unknown>;
  const completedAtMs =
    typeof candidate.completedAtMs === 'number' && Number.isFinite(candidate.completedAtMs)
      ? candidate.completedAtMs
      : undefined;

  return {
    objectiveComplete: candidate.objectiveComplete === true,
    buildComplete: candidate.buildComplete === true,
    ...(typeof completedAtMs === 'number' ? { completedAtMs } : {}),
  };
}

function toStopBuildStateEntry(value: unknown): { requiredEssence: number; spentEssence: number; buildLevel: number } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      requiredEssence: DEFAULT_STOP_BUILD_REQUIRED_ESSENCE,
      spentEssence: 0,
      buildLevel: 0,
    };
  }

  const candidate = value as Record<string, unknown>;
  return {
    requiredEssence:
      typeof candidate.requiredEssence === 'number' && Number.isFinite(candidate.requiredEssence)
        ? Math.max(0, Math.floor(candidate.requiredEssence))
        : DEFAULT_STOP_BUILD_REQUIRED_ESSENCE,
    spentEssence:
      typeof candidate.spentEssence === 'number' && Number.isFinite(candidate.spentEssence)
        ? Math.max(0, Math.floor(candidate.spentEssence))
        : 0,
    buildLevel:
      typeof candidate.buildLevel === 'number' && Number.isFinite(candidate.buildLevel)
        ? Math.max(0, Math.floor(candidate.buildLevel))
        : 0,
  };
}

function getStorageKey(userId: string) {
  return `island_run_runtime_state_${userId}`;
}

function getRemoteBackoffStorageKey(userId: string) {
  return `${getStorageKey(userId)}_remote_backoff_until`;
}

function getPendingWriteStorageKey(userId: string) {
  return `${getStorageKey(userId)}_pending_write`;
}

function getNormalizedRuntimeStateError(error: { message?: string | null; code?: string | null } | null | undefined) {
  return {
    message: typeof error?.message === 'string' ? error.message.trim().toLowerCase() : '',
    code: typeof error?.code === 'string' ? error.code.trim().toLowerCase() : '',
  };
}

function isTransportLikeRuntimeStateError(error: { message?: string | null; code?: string | null } | null | undefined): boolean {
  if (!error) return false;

  const normalizedError = getNormalizedRuntimeStateError(error);
  const normalizedMessage = normalizedError.message;
  const normalizedCode = normalizedError.code;

  if (!normalizedMessage && !normalizedCode) return true;

  return [
    normalizedMessage === 'load failed',
    normalizedMessage === 'failed to fetch',
    normalizedMessage.includes('networkerror'),
    normalizedMessage.includes('network request failed'),
    normalizedMessage.includes('fetch failed'),
    normalizedMessage.includes('load failed'),
    normalizedCode === 'failed_to_fetch',
    normalizedCode === 'network_error',
  ].some(Boolean);
}

function isSchemaMismatchRuntimeStateError(error: { message?: string | null; code?: string | null } | null | undefined): boolean {
  if (!error) return false;

  const normalizedError = getNormalizedRuntimeStateError(error);
  const normalizedMessage = normalizedError.message;
  const normalizedCode = normalizedError.code;

  return [
    normalizedCode === '42703',
    normalizedCode === 'pgrst204',
    normalizedMessage.includes('does not exist'),
    normalizedMessage.includes('could not find the'),
    normalizedMessage.includes('schema cache'),
  ].some(Boolean);
}

function getRemoteBackoffUntil(userId: string): number | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(getRemoteBackoffStorageKey(userId));
    if (!raw) return null;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= Date.now()) {
      window.localStorage.removeItem(getRemoteBackoffStorageKey(userId));
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function setRemoteBackoffUntil(userId: string, backoffUntil: number | null) {
  if (typeof window === 'undefined') return;

  try {
    const storageKey = getRemoteBackoffStorageKey(userId);
    if (backoffUntil === null) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, String(backoffUntil));
  } catch {
    // ignore local persistence failures in prototype mode
  }
}

function activateRemoteBackoff(userId: string): number {
  const backoffUntil = Date.now() + ISLAND_RUN_REMOTE_BACKOFF_MS;
  setRemoteBackoffUntil(userId, backoffUntil);
  return backoffUntil;
}

function getRuntimeStateDebugFields(record: Pick<IslandRunGameStateRecord, 'currentIslandNumber' | 'bossTrialResolvedIslandNumber' | 'cycleIndex' | 'tokenIndex' | 'spinTokens' | 'dicePool'>) {
  return {
    currentIslandNumber: record.currentIslandNumber,
    bossTrialResolvedIslandNumber: record.bossTrialResolvedIslandNumber,
    cycleIndex: record.cycleIndex,
    tokenIndex: record.tokenIndex,
    spinTokens: record.spinTokens,
    dicePool: record.dicePool,
  };
}

function getDefaultRecord(): IslandRunGameStateRecord {
  const nowMs = Date.now();
  return {
    runtimeVersion: 0,
    firstRunClaimed: false,
    dailyHeartsClaimedDayKey: null,
    onboardingDisplayNameLoopCompleted: false,
    storyPrologueSeen: false,
    audioEnabled: true,
    currentIslandNumber: 1,
    cycleIndex: 0,
    bossTrialResolvedIslandNumber: null,
    activeEggTier: null,
    activeEggSetAtMs: null,
    activeEggHatchDurationMs: null,
    activeEggIsDormant: false,
    perIslandEggs: {},
    eggRewardInventory: [],
    islandStartedAtMs: nowMs,
    islandExpiresAtMs: nowMs + 48 * 60 * 60 * 1000,
    islandShards: 0,
    tokenIndex: 0,
    spinTokens: 0,
    dicePool: ISLAND_RUN_DEFAULT_STARTING_DICE,
    shardTierIndex: 0,
    shardClaimCount: 0,
    shields: 0,
    shards: 0,
    diamonds: 3,
    creatureTreatInventory: {
      basic: 3,
      favorite: 1,
      rare: 0,
    },
    companionBonusLastVisitKey: null,
    completedStopsByIsland: {},
    stopTicketsPaidByIsland: {},
    bonusTileChargeByIsland: {},
    marketOwnedBundlesByIsland: {},
    creatureCollection: [],
    activeCompanionId: null,
    perfectCompanionIds: [],
    perfectCompanionReasons: {},
    perfectCompanionComputedAtMs: null,
    perfectCompanionModelVersion: null,
    perfectCompanionComputedCycleIndex: null,
    activeStopIndex: 0,
    activeStopType: 'hatchery',
    stopStatesByIndex: getDefaultStopStatesByIndex(),
    stopBuildStateByIndex: getDefaultStopBuildStateByIndex(),
    bossState: {
      unlocked: false,
      objectiveComplete: false,
      buildComplete: false,
    },
    essence: 0,
    essenceLifetimeEarned: 0,
    essenceLifetimeSpent: 0,
    diceRegenState: null,
    rewardBarProgress: 0,
    rewardBarThreshold: DEFAULT_REWARD_BAR_THRESHOLD,
    rewardBarClaimCountInEvent: 0,
    rewardBarEscalationTier: 0,
    rewardBarLastClaimAtMs: null,
    rewardBarBoundEventId: null,
    rewardBarLadderId: null,
    activeTimedEvent: null,
    activeTimedEventProgress: {
      feedingActions: 0,
      tokensEarned: 0,
      milestonesClaimed: 0,
    },
    stickerProgress: {
      fragments: 0,
    },
    stickerInventory: {},
    lastEssenceDriftLost: 0,
    minigameTicketsByEvent: {},
    luckyRollSessionsByMilestone: {},
    spaceExcavatorProgressByEvent: {},
  };
}

function toCreatureCollectionEntry(value: unknown): CreatureCollectionRuntimeEntry | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.creatureId !== 'string' || !candidate.creatureId.trim()) return null;
  const copies = typeof candidate.copies === 'number' && Number.isFinite(candidate.copies) ? Math.max(1, Math.floor(candidate.copies)) : 1;
  const firstCollectedAtMs = typeof candidate.firstCollectedAtMs === 'number' && Number.isFinite(candidate.firstCollectedAtMs)
    ? candidate.firstCollectedAtMs
    : Date.now();
  const lastCollectedAtMs = typeof candidate.lastCollectedAtMs === 'number' && Number.isFinite(candidate.lastCollectedAtMs)
    ? candidate.lastCollectedAtMs
    : firstCollectedAtMs;
  const lastCollectedIslandNumber = typeof candidate.lastCollectedIslandNumber === 'number' && Number.isFinite(candidate.lastCollectedIslandNumber)
    ? Math.max(1, Math.floor(candidate.lastCollectedIslandNumber))
    : 1;
  const bondXp = typeof candidate.bondXp === 'number' && Number.isFinite(candidate.bondXp)
    ? Math.max(0, Math.floor(candidate.bondXp))
    : 0;
  const derivedBondLevel = Math.floor(bondXp / 3) + 1;
  const bondLevel = typeof candidate.bondLevel === 'number' && Number.isFinite(candidate.bondLevel)
    ? Math.max(1, Math.floor(candidate.bondLevel), derivedBondLevel)
    : derivedBondLevel;
  const lastFedAtMs = typeof candidate.lastFedAtMs === 'number' && Number.isFinite(candidate.lastFedAtMs)
    ? candidate.lastFedAtMs
    : null;
  const claimedBondMilestones = Array.isArray(candidate.claimedBondMilestones)
    ? Array.from(new Set(candidate.claimedBondMilestones
      .filter((milestone): milestone is number => typeof milestone === 'number' && Number.isFinite(milestone))
      .map((milestone) => Math.max(1, Math.floor(milestone))))
    ).sort((a, b) => a - b)
    : [];
  return {
    creatureId: candidate.creatureId,
    copies,
    firstCollectedAtMs,
    lastCollectedAtMs,
    lastCollectedIslandNumber,
    bondXp,
    bondLevel,
    lastFedAtMs,
    claimedBondMilestones,
  };
}

function stableEggRewardInventoryStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableEggRewardInventoryStringify(entry)).join(',')}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableEggRewardInventoryStringify(entryValue)}`)
    .join(',')}}`;
}

function resolveDuplicateEggRewardInventoryEntry(
  existing: EggRewardInventoryEntry,
  candidate: EggRewardInventoryEntry,
): EggRewardInventoryEntry {
  const existingStatusRank = existing.status === 'opened' ? 1 : 0;
  const candidateStatusRank = candidate.status === 'opened' ? 1 : 0;
  if (candidateStatusRank !== existingStatusRank) {
    return candidateStatusRank > existingStatusRank ? candidate : existing;
  }

  const existingOpenedAtMs = existing.openedAtMs ?? 0;
  const candidateOpenedAtMs = candidate.openedAtMs ?? 0;
  if (candidateOpenedAtMs !== existingOpenedAtMs) {
    return candidateOpenedAtMs > existingOpenedAtMs ? candidate : existing;
  }

  if (candidate.grantedAtMs !== existing.grantedAtMs) {
    return candidate.grantedAtMs > existing.grantedAtMs ? candidate : existing;
  }

  return stableEggRewardInventoryStringify(candidate) > stableEggRewardInventoryStringify(existing)
    ? candidate
    : existing;
}

function toEggRewardInventoryEntry(value: unknown): EggRewardInventoryEntry | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const eggRewardId = typeof candidate.eggRewardId === 'string' ? candidate.eggRewardId.trim() : '';
  const sourceSessionKey = typeof candidate.sourceSessionKey === 'string' ? candidate.sourceSessionKey.trim() : '';
  const sourceRunId = typeof candidate.sourceRunId === 'string' ? candidate.sourceRunId.trim() : '';
  const sourceRewardId = typeof candidate.sourceRewardId === 'string' ? candidate.sourceRewardId.trim() : '';
  if (!eggRewardId || !sourceSessionKey || !sourceRunId || !sourceRewardId) return null;
  if (candidate.source !== 'treasure_path') return null;
  if (candidate.eggTier !== 'common' && candidate.eggTier !== 'rare') return null;
  if (candidate.resolverVersion !== 'treasure_path_egg_v1') return null;
  if (candidate.status !== 'unopened' && candidate.status !== 'opened') return null;
  if (
    candidate.rarityRollDenominator !== EGG_REWARD_RARITY_ROLL_DENOMINATOR
    || candidate.rarityThreshold !== EGG_REWARD_RARITY_THRESHOLD
  ) {
    return null;
  }
  if (
    typeof candidate.tileId !== 'number'
    || !Number.isFinite(candidate.tileId)
    || typeof candidate.cycleIndex !== 'number'
    || !Number.isFinite(candidate.cycleIndex)
    || typeof candidate.targetIslandNumber !== 'number'
    || !Number.isFinite(candidate.targetIslandNumber)
    || typeof candidate.eggSeed !== 'number'
    || !Number.isFinite(candidate.eggSeed)
    || typeof candidate.rarityRoll !== 'number'
    || !Number.isFinite(candidate.rarityRoll)
    || typeof candidate.grantedAtMs !== 'number'
    || !Number.isFinite(candidate.grantedAtMs)
  ) {
    return null;
  }
  const openedAtMs = typeof candidate.openedAtMs === 'number' && Number.isFinite(candidate.openedAtMs)
    ? Math.max(0, Math.floor(candidate.openedAtMs))
    : candidate.openedAtMs === null
      ? null
      : undefined;
  if (typeof openedAtMs === 'undefined') return null;
  const openedCreatureId = typeof candidate.openedCreatureId === 'string' && candidate.openedCreatureId.trim().length > 0
    ? candidate.openedCreatureId.trim()
    : undefined;

  return {
    eggRewardId,
    source: 'treasure_path',
    sourceSessionKey,
    sourceRunId,
    sourceRewardId,
    tileId: Math.max(0, Math.floor(candidate.tileId)),
    cycleIndex: Math.max(0, Math.floor(candidate.cycleIndex)),
    targetIslandNumber: Math.max(1, Math.floor(candidate.targetIslandNumber)),
    eggTier: candidate.eggTier,
    eggSeed: Math.max(0, Math.floor(candidate.eggSeed)),
    rarityRoll: Math.max(0, Math.floor(candidate.rarityRoll)),
    rarityRollDenominator: EGG_REWARD_RARITY_ROLL_DENOMINATOR,
    rarityThreshold: EGG_REWARD_RARITY_THRESHOLD,
    resolverVersion: 'treasure_path_egg_v1',
    status: candidate.status,
    grantedAtMs: Math.max(0, Math.floor(candidate.grantedAtMs)),
    openedAtMs,
    ...(openedCreatureId ? { openedCreatureId } : {}),
  };
}

export function sanitizeEggRewardInventory(
  value: unknown,
  fallback: EggRewardInventoryEntry[] = [],
): EggRewardInventoryEntry[] {
  if (!Array.isArray(value)) return [...fallback];

  const byEggRewardId = new Map<string, EggRewardInventoryEntry>();
  for (const rawEntry of value) {
    const entry = toEggRewardInventoryEntry(rawEntry);
    if (!entry) continue;
    const existing = byEggRewardId.get(entry.eggRewardId);
    byEggRewardId.set(
      entry.eggRewardId,
      existing ? resolveDuplicateEggRewardInventoryEntry(existing, entry) : entry,
    );
  }

  return Array.from(byEggRewardId.values())
    .sort((a, b) => {
      if (a.grantedAtMs !== b.grantedAtMs) return a.grantedAtMs - b.grantedAtMs;
      return a.eggRewardId.localeCompare(b.eggRewardId);
    });
}

function mergeEggRewardInventory(
  remote: EggRewardInventoryEntry[],
  local: EggRewardInventoryEntry[],
): EggRewardInventoryEntry[] {
  return sanitizeEggRewardInventory([...remote, ...local]);
}

function toRecord(value: Partial<IslandRunGameStateRecord>, fallback: IslandRunGameStateRecord): IslandRunGameStateRecord {
  const eggTierRaw = value.activeEggTier;
  const activeEggTier: 'common' | 'rare' | 'mythic' | null =
    eggTierRaw === 'common' || eggTierRaw === 'rare' || eggTierRaw === 'mythic' ? eggTierRaw : fallback.activeEggTier;
  const normalizedActiveStopIndex =
    typeof value.activeStopIndex === 'number' && Number.isFinite(value.activeStopIndex)
      ? Math.max(0, Math.min(CONTRACT_V2_STOP_COUNT - 1, Math.floor(value.activeStopIndex)))
      : fallback.activeStopIndex;
  const stopStatesByIndex = Array.isArray(value.stopStatesByIndex)
    ? Array.from({ length: CONTRACT_V2_STOP_COUNT }, (_, index) => toStopStateEntry(value.stopStatesByIndex?.[index]))
    : fallback.stopStatesByIndex;
  const stopBuildStateByIndex = Array.isArray(value.stopBuildStateByIndex)
    ? Array.from({ length: CONTRACT_V2_STOP_COUNT }, (_, index) => toStopBuildStateEntry(value.stopBuildStateByIndex?.[index]))
    : fallback.stopBuildStateByIndex;
  return {
    runtimeVersion:
      typeof value.runtimeVersion === 'number' && Number.isFinite(value.runtimeVersion)
        ? Math.max(0, Math.floor(value.runtimeVersion))
        : fallback.runtimeVersion,
    firstRunClaimed: typeof value.firstRunClaimed === 'boolean' ? value.firstRunClaimed : fallback.firstRunClaimed,
    dailyHeartsClaimedDayKey:
      typeof value.dailyHeartsClaimedDayKey === 'string' || value.dailyHeartsClaimedDayKey === null
        ? value.dailyHeartsClaimedDayKey
        : fallback.dailyHeartsClaimedDayKey,
    onboardingDisplayNameLoopCompleted:
      typeof value.onboardingDisplayNameLoopCompleted === 'boolean'
        ? value.onboardingDisplayNameLoopCompleted
        : fallback.onboardingDisplayNameLoopCompleted,
    storyPrologueSeen:
      typeof value.storyPrologueSeen === 'boolean'
        ? value.storyPrologueSeen
        : fallback.storyPrologueSeen,
    audioEnabled:
      typeof value.audioEnabled === 'boolean'
        ? value.audioEnabled
        : fallback.audioEnabled,
    currentIslandNumber:
      typeof value.currentIslandNumber === 'number' && Number.isFinite(value.currentIslandNumber)
        ? Math.max(1, Math.floor(value.currentIslandNumber))
        : fallback.currentIslandNumber,
    cycleIndex:
      typeof value.cycleIndex === 'number' && Number.isFinite(value.cycleIndex)
        ? Math.max(0, Math.floor(value.cycleIndex))
        : fallback.cycleIndex,
    bossTrialResolvedIslandNumber:
      typeof value.bossTrialResolvedIslandNumber === 'number' && Number.isFinite(value.bossTrialResolvedIslandNumber)
        ? Math.max(1, Math.floor(value.bossTrialResolvedIslandNumber))
        : value.bossTrialResolvedIslandNumber === null
          ? null
          : fallback.bossTrialResolvedIslandNumber,
    activeEggTier,
    activeEggSetAtMs:
      typeof value.activeEggSetAtMs === 'number' && Number.isFinite(value.activeEggSetAtMs)
        ? value.activeEggSetAtMs
        : value.activeEggSetAtMs === null
          ? null
          : fallback.activeEggSetAtMs,
    activeEggHatchDurationMs:
      typeof value.activeEggHatchDurationMs === 'number' && Number.isFinite(value.activeEggHatchDurationMs)
        ? value.activeEggHatchDurationMs
        : value.activeEggHatchDurationMs === null
          ? null
          : fallback.activeEggHatchDurationMs,
    activeEggIsDormant: typeof value.activeEggIsDormant === 'boolean' ? value.activeEggIsDormant : fallback.activeEggIsDormant,
    perIslandEggs: value.perIslandEggs !== null && typeof value.perIslandEggs === 'object' && !Array.isArray(value.perIslandEggs)
      ? (value.perIslandEggs as PerIslandEggsLedger)
      : fallback.perIslandEggs,
    eggRewardInventory: sanitizeEggRewardInventory(
      value.eggRewardInventory,
      fallback.eggRewardInventory,
    ),
    islandStartedAtMs:
      typeof value.islandStartedAtMs === 'number' && Number.isFinite(value.islandStartedAtMs)
        ? value.islandStartedAtMs
        : fallback.islandStartedAtMs,
    islandExpiresAtMs:
      typeof value.islandExpiresAtMs === 'number' && Number.isFinite(value.islandExpiresAtMs)
        ? value.islandExpiresAtMs
        : fallback.islandExpiresAtMs,
    islandShards:
      typeof value.islandShards === 'number' && Number.isFinite(value.islandShards)
        ? Math.max(0, Math.floor(value.islandShards))
        : fallback.islandShards,
    tokenIndex:
      typeof value.tokenIndex === 'number' && Number.isFinite(value.tokenIndex)
        ? Math.max(0, Math.floor(value.tokenIndex))
        : fallback.tokenIndex,
    spinTokens:
      typeof value.spinTokens === 'number' && Number.isFinite(value.spinTokens)
        ? Math.max(0, Math.floor(value.spinTokens))
        : fallback.spinTokens,
    dicePool:
      typeof value.dicePool === 'number' && Number.isFinite(value.dicePool)
        ? Math.max(0, Math.floor(value.dicePool))
        : fallback.dicePool,
    shardTierIndex:
      typeof value.shardTierIndex === 'number' && Number.isFinite(value.shardTierIndex)
        ? Math.max(0, Math.floor(value.shardTierIndex))
        : fallback.shardTierIndex,
    shardClaimCount:
      typeof value.shardClaimCount === 'number' && Number.isFinite(value.shardClaimCount)
        ? Math.max(0, Math.floor(value.shardClaimCount))
        : fallback.shardClaimCount,
    shields:
      typeof value.shields === 'number' && Number.isFinite(value.shields)
        ? Math.max(0, Math.floor(value.shields))
        : fallback.shields,
    shards:
      typeof value.shards === 'number' && Number.isFinite(value.shards)
        ? Math.max(0, Math.floor(value.shards))
        : fallback.shards,
    diamonds:
      typeof value.diamonds === 'number' && Number.isFinite(value.diamonds)
        ? Math.max(0, Math.floor(value.diamonds))
        : fallback.diamonds,
    creatureTreatInventory:
      value.creatureTreatInventory !== null && typeof value.creatureTreatInventory === 'object' && !Array.isArray(value.creatureTreatInventory)
        ? {
            basic: typeof value.creatureTreatInventory.basic === 'number' && Number.isFinite(value.creatureTreatInventory.basic)
              ? Math.max(0, Math.floor(value.creatureTreatInventory.basic))
              : fallback.creatureTreatInventory.basic,
            favorite: typeof value.creatureTreatInventory.favorite === 'number' && Number.isFinite(value.creatureTreatInventory.favorite)
              ? Math.max(0, Math.floor(value.creatureTreatInventory.favorite))
              : fallback.creatureTreatInventory.favorite,
            rare: typeof value.creatureTreatInventory.rare === 'number' && Number.isFinite(value.creatureTreatInventory.rare)
              ? Math.max(0, Math.floor(value.creatureTreatInventory.rare))
              : fallback.creatureTreatInventory.rare,
          }
        : fallback.creatureTreatInventory,
    companionBonusLastVisitKey:
      typeof value.companionBonusLastVisitKey === 'string' || value.companionBonusLastVisitKey === null
        ? value.companionBonusLastVisitKey
        : fallback.companionBonusLastVisitKey,
    completedStopsByIsland:
      value.completedStopsByIsland !== null && typeof value.completedStopsByIsland === 'object' && !Array.isArray(value.completedStopsByIsland)
        ? Object.fromEntries(
            Object.entries(value.completedStopsByIsland).map(([islandKey, stops]) => [
              islandKey,
              Array.isArray(stops) ? stops.filter((stop): stop is string => typeof stop === 'string') : [],
            ]),
          )
        : fallback.completedStopsByIsland,
    stopTicketsPaidByIsland:
      value.stopTicketsPaidByIsland !== null && typeof value.stopTicketsPaidByIsland === 'object' && !Array.isArray(value.stopTicketsPaidByIsland)
        ? sanitizeStopTicketsPaidByIsland(value.stopTicketsPaidByIsland as Record<string, number[]>)
        : fallback.stopTicketsPaidByIsland,
    bonusTileChargeByIsland:
      value.bonusTileChargeByIsland !== null && typeof value.bonusTileChargeByIsland === 'object' && !Array.isArray(value.bonusTileChargeByIsland)
        ? sanitizeBonusTileChargeByIsland(value.bonusTileChargeByIsland as BonusTileChargeByIsland)
        : fallback.bonusTileChargeByIsland,
    marketOwnedBundlesByIsland:
      value.marketOwnedBundlesByIsland !== null && typeof value.marketOwnedBundlesByIsland === 'object' && !Array.isArray(value.marketOwnedBundlesByIsland)
        ? Object.fromEntries(
            Object.entries(value.marketOwnedBundlesByIsland).map(([islandKey, bundles]) => [
              islandKey,
              bundles !== null && typeof bundles === 'object' && !Array.isArray(bundles)
                ? {
                    dice_bundle: Boolean((bundles as Record<string, unknown>).dice_bundle),
                    heart_bundle: Boolean((bundles as Record<string, unknown>).heart_bundle),
                    heart_boost_bundle: Boolean((bundles as Record<string, unknown>).heart_boost_bundle),
                  }
                : {
                    dice_bundle: false,
                    heart_bundle: false,
                    heart_boost_bundle: false,
                  },
            ]),
          )
        : fallback.marketOwnedBundlesByIsland,
    creatureCollection:
      Array.isArray(value.creatureCollection)
        ? value.creatureCollection
            .map((entry) => toCreatureCollectionEntry(entry))
            .filter((entry): entry is CreatureCollectionRuntimeEntry => entry !== null)
        : fallback.creatureCollection,
    activeCompanionId:
      typeof value.activeCompanionId === 'string' || value.activeCompanionId === null
        ? value.activeCompanionId
        : fallback.activeCompanionId,
    perfectCompanionIds:
      Array.isArray(value.perfectCompanionIds)
        ? value.perfectCompanionIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        : fallback.perfectCompanionIds,
    perfectCompanionReasons:
      value.perfectCompanionReasons !== null && typeof value.perfectCompanionReasons === 'object' && !Array.isArray(value.perfectCompanionReasons)
        ? Object.fromEntries(
            Object.entries(value.perfectCompanionReasons).map(([creatureId, reason]) => [
              creatureId,
              reason !== null && typeof reason === 'object' && !Array.isArray(reason)
                ? {
                    strength: Array.isArray((reason as unknown as Record<string, unknown>).strength)
                      ? ((reason as unknown as Record<string, unknown>).strength as unknown[])
                          .filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
                      : [],
                    weaknessSupport: Array.isArray((reason as unknown as Record<string, unknown>).weaknessSupport)
                      ? ((reason as unknown as Record<string, unknown>).weaknessSupport as unknown[])
                          .filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
                      : [],
                    zoneMatch: Boolean((reason as unknown as Record<string, unknown>).zoneMatch),
                  }
                : {
                    strength: [],
                    weaknessSupport: [],
                    zoneMatch: false,
                  },
            ]),
          )
        : fallback.perfectCompanionReasons,
    perfectCompanionComputedAtMs:
      typeof value.perfectCompanionComputedAtMs === 'number' && Number.isFinite(value.perfectCompanionComputedAtMs)
        ? value.perfectCompanionComputedAtMs
        : value.perfectCompanionComputedAtMs === null
          ? null
          : fallback.perfectCompanionComputedAtMs,
    perfectCompanionModelVersion:
      typeof value.perfectCompanionModelVersion === 'string' || value.perfectCompanionModelVersion === null
        ? value.perfectCompanionModelVersion
        : fallback.perfectCompanionModelVersion,
    perfectCompanionComputedCycleIndex:
      typeof value.perfectCompanionComputedCycleIndex === 'number' && Number.isFinite(value.perfectCompanionComputedCycleIndex)
        ? Math.max(0, Math.floor(value.perfectCompanionComputedCycleIndex))
        : value.perfectCompanionComputedCycleIndex === null
          ? null
          : fallback.perfectCompanionComputedCycleIndex,
    activeStopIndex: normalizedActiveStopIndex,
    activeStopType:
      value.activeStopType === 'hatchery'
      || value.activeStopType === 'habit'
      || value.activeStopType === 'mystery'
      || value.activeStopType === 'wisdom'
      || value.activeStopType === 'boss'
        ? value.activeStopType
        : deriveIslandRunContractV2StopType(normalizedActiveStopIndex),
    stopStatesByIndex,
    stopBuildStateByIndex,
    bossState:
      value.bossState !== null && typeof value.bossState === 'object' && !Array.isArray(value.bossState)
        ? {
            unlocked: Boolean(value.bossState.unlocked),
            objectiveComplete: Boolean(value.bossState.objectiveComplete),
            buildComplete: Boolean(value.bossState.buildComplete),
            ...(typeof value.bossState.completedAtMs === 'number' && Number.isFinite(value.bossState.completedAtMs)
              ? { completedAtMs: value.bossState.completedAtMs }
              : {}),
          }
        : fallback.bossState,
    essence:
      typeof value.essence === 'number' && Number.isFinite(value.essence)
        ? Math.max(0, Math.floor(value.essence))
        : fallback.essence,
    essenceLifetimeEarned:
      typeof value.essenceLifetimeEarned === 'number' && Number.isFinite(value.essenceLifetimeEarned)
        ? Math.max(0, Math.floor(value.essenceLifetimeEarned))
        : fallback.essenceLifetimeEarned,
    essenceLifetimeSpent:
      typeof value.essenceLifetimeSpent === 'number' && Number.isFinite(value.essenceLifetimeSpent)
        ? Math.max(0, Math.floor(value.essenceLifetimeSpent))
        : fallback.essenceLifetimeSpent,
    diceRegenState:
      value.diceRegenState !== null && typeof value.diceRegenState === 'object' && !Array.isArray(value.diceRegenState)
      && typeof value.diceRegenState.maxDice === 'number'
      && Number.isFinite(value.diceRegenState.maxDice)
      && typeof value.diceRegenState.regenRatePerHour === 'number'
      && Number.isFinite(value.diceRegenState.regenRatePerHour)
      && typeof value.diceRegenState.lastRegenAtMs === 'number'
      && Number.isFinite(value.diceRegenState.lastRegenAtMs)
        ? {
            maxDice: Math.max(0, Math.floor(value.diceRegenState.maxDice)),
            regenRatePerHour: Math.max(0, value.diceRegenState.regenRatePerHour),
            lastRegenAtMs: value.diceRegenState.lastRegenAtMs,
          }
        : value.diceRegenState === null
          ? null
          : fallback.diceRegenState,
    rewardBarProgress:
      typeof value.rewardBarProgress === 'number' && Number.isFinite(value.rewardBarProgress)
        ? Math.max(0, Math.floor(value.rewardBarProgress))
        : fallback.rewardBarProgress,
    rewardBarThreshold:
      typeof value.rewardBarThreshold === 'number' && Number.isFinite(value.rewardBarThreshold)
        ? Math.max(1, Math.floor(value.rewardBarThreshold))
        : fallback.rewardBarThreshold,
    rewardBarClaimCountInEvent:
      typeof value.rewardBarClaimCountInEvent === 'number' && Number.isFinite(value.rewardBarClaimCountInEvent)
        ? Math.max(0, Math.floor(value.rewardBarClaimCountInEvent))
        : fallback.rewardBarClaimCountInEvent,
    rewardBarEscalationTier:
      typeof value.rewardBarEscalationTier === 'number' && Number.isFinite(value.rewardBarEscalationTier)
        ? Math.max(0, Math.floor(value.rewardBarEscalationTier))
        : fallback.rewardBarEscalationTier,
    rewardBarLastClaimAtMs:
      typeof value.rewardBarLastClaimAtMs === 'number' && Number.isFinite(value.rewardBarLastClaimAtMs)
        ? value.rewardBarLastClaimAtMs
        : value.rewardBarLastClaimAtMs === null
          ? null
          : fallback.rewardBarLastClaimAtMs,
    rewardBarBoundEventId:
      typeof value.rewardBarBoundEventId === 'string' || value.rewardBarBoundEventId === null
        ? value.rewardBarBoundEventId
        : fallback.rewardBarBoundEventId,
    rewardBarLadderId:
      typeof value.rewardBarLadderId === 'string'
        ? value.rewardBarLadderId
        : value.rewardBarLadderId === null
          ? null
          : fallback.rewardBarLadderId,
    activeTimedEvent:
      value.activeTimedEvent !== null
      && typeof value.activeTimedEvent === 'object'
      && !Array.isArray(value.activeTimedEvent)
      && typeof value.activeTimedEvent.eventId === 'string'
      && typeof value.activeTimedEvent.eventType === 'string'
      && typeof value.activeTimedEvent.startedAtMs === 'number'
      && Number.isFinite(value.activeTimedEvent.startedAtMs)
      && typeof value.activeTimedEvent.expiresAtMs === 'number'
      && Number.isFinite(value.activeTimedEvent.expiresAtMs)
      && typeof value.activeTimedEvent.version === 'number'
      && Number.isFinite(value.activeTimedEvent.version)
        ? {
            eventId: value.activeTimedEvent.eventId,
            eventType: value.activeTimedEvent.eventType,
            startedAtMs: value.activeTimedEvent.startedAtMs,
            expiresAtMs: value.activeTimedEvent.expiresAtMs,
            version: Math.max(0, Math.floor(value.activeTimedEvent.version)),
          }
        : value.activeTimedEvent === null
          ? null
          : fallback.activeTimedEvent,
    activeTimedEventProgress:
      value.activeTimedEventProgress !== null
      && typeof value.activeTimedEventProgress === 'object'
      && !Array.isArray(value.activeTimedEventProgress)
        ? {
            feedingActions:
              typeof value.activeTimedEventProgress.feedingActions === 'number' && Number.isFinite(value.activeTimedEventProgress.feedingActions)
                ? Math.max(0, Math.floor(value.activeTimedEventProgress.feedingActions))
                : fallback.activeTimedEventProgress.feedingActions,
            tokensEarned:
              typeof value.activeTimedEventProgress.tokensEarned === 'number' && Number.isFinite(value.activeTimedEventProgress.tokensEarned)
                ? Math.max(0, Math.floor(value.activeTimedEventProgress.tokensEarned))
                : fallback.activeTimedEventProgress.tokensEarned,
            milestonesClaimed:
              typeof value.activeTimedEventProgress.milestonesClaimed === 'number' && Number.isFinite(value.activeTimedEventProgress.milestonesClaimed)
                ? Math.max(0, Math.floor(value.activeTimedEventProgress.milestonesClaimed))
                : fallback.activeTimedEventProgress.milestonesClaimed,
          }
        : fallback.activeTimedEventProgress,
    stickerProgress:
      value.stickerProgress !== null && typeof value.stickerProgress === 'object' && !Array.isArray(value.stickerProgress)
        ? {
            fragments:
              typeof value.stickerProgress.fragments === 'number' && Number.isFinite(value.stickerProgress.fragments)
                ? Math.max(0, Math.floor(value.stickerProgress.fragments))
                : fallback.stickerProgress.fragments,
            ...(typeof value.stickerProgress.guaranteedAt === 'number' && Number.isFinite(value.stickerProgress.guaranteedAt)
              ? { guaranteedAt: Math.max(0, Math.floor(value.stickerProgress.guaranteedAt)) }
              : {}),
            ...(typeof value.stickerProgress.pityCounter === 'number' && Number.isFinite(value.stickerProgress.pityCounter)
              ? { pityCounter: Math.max(0, Math.floor(value.stickerProgress.pityCounter)) }
              : {}),
          }
        : fallback.stickerProgress,
    stickerInventory:
      value.stickerInventory !== null && typeof value.stickerInventory === 'object' && !Array.isArray(value.stickerInventory)
        ? Object.fromEntries(
            Object.entries(value.stickerInventory)
              .filter(([key, count]) => typeof key === 'string' && typeof count === 'number' && Number.isFinite(count))
              .map(([key, count]) => [key, Math.max(0, Math.floor(count))]),
          )
        : fallback.stickerInventory,
    lastEssenceDriftLost:
      typeof value.lastEssenceDriftLost === 'number' && Number.isFinite(value.lastEssenceDriftLost)
        ? Math.max(0, Math.floor(value.lastEssenceDriftLost))
        : fallback.lastEssenceDriftLost,
    minigameTicketsByEvent: sanitizeMinigameTicketsByEvent(
      value.minigameTicketsByEvent,
      fallback.minigameTicketsByEvent,
    ),
    luckyRollSessionsByMilestone: sanitizeIslandRunLuckyRollSessionsByMilestone(
      value.luckyRollSessionsByMilestone,
      fallback.luckyRollSessionsByMilestone,
    ),
    spaceExcavatorProgressByEvent: sanitizeSpaceExcavatorProgressByEvent(
      value.spaceExcavatorProgressByEvent,
      fallback.spaceExcavatorProgressByEvent,
    ),
  };
}

/**
 * Coerce an unknown value into a safe `minigameTicketsByEvent` record. Values
 * are clamped to non-negative integers; zero entries are pruned. Unexpected
 * shapes fall back to the provided default.
 */
function sanitizeMinigameTicketsByEvent(
  value: unknown,
  fallback: Record<string, number>,
): Record<string, number> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { ...fallback };
  }
  const result: Record<string, number> = {};
  for (const [eventId, rawCount] of Object.entries(value as Record<string, unknown>)) {
    if (typeof rawCount !== 'number' || !Number.isFinite(rawCount)) continue;
    const count = Math.max(0, Math.floor(rawCount));
    if (count > 0) {
      result[eventId] = count;
    }
  }
  return result;
}

const LUCKY_ROLL_SESSION_STATUSES = new Set<IslandRunLuckyRollSessionStatus>(['active', 'completed', 'banked', 'expired']);
const LUCKY_ROLL_REWARD_TYPES = new Set<IslandRunLuckyRollRewardType>(['dice', 'essence', 'shards', 'diamonds', 'sticker', 'minigame_ticket', 'gold', 'game_tokens', 'unknown']);

function sanitizeLuckyRollRewardEntries(value: unknown): IslandRunLuckyRollRewardEntry[] {
  if (!Array.isArray(value)) return [];

  const rewards: IslandRunLuckyRollRewardEntry[] = [];
  for (const rawEntry of value) {
    if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) continue;
    const entry = rawEntry as Record<string, unknown>;
    if (typeof entry.rewardId !== 'string' || entry.rewardId.trim().length === 0) continue;
    if (typeof entry.tileId !== 'number' || !Number.isFinite(entry.tileId)) continue;
    if (typeof entry.amount !== 'number' || !Number.isFinite(entry.amount)) continue;
    const rewardType = typeof entry.rewardType === 'string' && LUCKY_ROLL_REWARD_TYPES.has(entry.rewardType as IslandRunLuckyRollRewardType)
      ? entry.rewardType as IslandRunLuckyRollRewardType
      : 'unknown';
    const metadata = entry.metadata !== null && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata)
      ? entry.metadata as Record<string, unknown>
      : undefined;
    rewards.push({
      rewardId: entry.rewardId.trim(),
      tileId: Math.max(0, Math.floor(entry.tileId)),
      rewardType,
      amount: Math.max(0, Math.floor(entry.amount)),
      ...(typeof entry.eventId === 'string' && entry.eventId.trim().length > 0 ? { eventId: entry.eventId.trim() } : {}),
      ...(metadata ? { metadata } : {}),
    });
  }
  return rewards;
}

function sanitizeClaimedTileIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((tileId): tileId is number => typeof tileId === 'number' && Number.isFinite(tileId))
      .map((tileId) => Math.max(0, Math.floor(tileId))),
  )).sort((a, b) => a - b);
}

export function sanitizeIslandRunLuckyRollSessionsByMilestone(
  value: unknown,
  fallback: IslandRunLuckyRollSessionsByMilestone = {},
): IslandRunLuckyRollSessionsByMilestone {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...fallback };
  }

  const result: IslandRunLuckyRollSessionsByMilestone = {};
  for (const rawSession of Object.values(value as Record<string, unknown>)) {
    if (!rawSession || typeof rawSession !== 'object' || Array.isArray(rawSession)) continue;
    const session = rawSession as Record<string, unknown>;
    if (typeof session.runId !== 'string' || session.runId.trim().length === 0) continue;
    if (typeof session.targetIslandNumber !== 'number' || !Number.isFinite(session.targetIslandNumber)) continue;
    if (typeof session.cycleIndex !== 'number' || !Number.isFinite(session.cycleIndex)) continue;

    const targetIslandNumber = Math.max(1, Math.floor(session.targetIslandNumber));
    const cycleIndex = Math.max(0, Math.floor(session.cycleIndex));
    const key = getIslandRunLuckyRollSessionKey(cycleIndex, targetIslandNumber);
    const status = typeof session.status === 'string' && LUCKY_ROLL_SESSION_STATUSES.has(session.status as IslandRunLuckyRollSessionStatus)
      ? session.status as IslandRunLuckyRollSessionStatus
      : 'active';
    const startedAtMs = typeof session.startedAtMs === 'number' && Number.isFinite(session.startedAtMs)
      ? Math.max(0, Math.floor(session.startedAtMs))
      : 0;
    const updatedAtMs = typeof session.updatedAtMs === 'number' && Number.isFinite(session.updatedAtMs)
      ? Math.max(0, Math.floor(session.updatedAtMs))
      : startedAtMs;
    const sanitized: IslandRunLuckyRollSession = {
      status,
      runId: session.runId.trim(),
      targetIslandNumber,
      cycleIndex,
      position: typeof session.position === 'number' && Number.isFinite(session.position) ? Math.max(0, Math.floor(session.position)) : 0,
      rollsUsed: typeof session.rollsUsed === 'number' && Number.isFinite(session.rollsUsed) ? Math.max(0, Math.floor(session.rollsUsed)) : 0,
      claimedTileIds: sanitizeClaimedTileIds(session.claimedTileIds),
      pendingRewards: sanitizeLuckyRollRewardEntries(session.pendingRewards),
      bankedRewards: sanitizeLuckyRollRewardEntries(session.bankedRewards),
      startedAtMs,
      bankedAtMs: typeof session.bankedAtMs === 'number' && Number.isFinite(session.bankedAtMs) ? Math.max(0, Math.floor(session.bankedAtMs)) : null,
      updatedAtMs,
    };

    const existing = result[key];
    if (!existing || sanitized.updatedAtMs >= existing.updatedAtMs) {
      result[key] = sanitized;
    }
  }

  return result;
}

function mergeLuckyRollSessionsByMilestone(
  remote: IslandRunLuckyRollSessionsByMilestone,
  local: IslandRunLuckyRollSessionsByMilestone,
): IslandRunLuckyRollSessionsByMilestone {
  const merged: IslandRunLuckyRollSessionsByMilestone = { ...remote };
  for (const [key, localSession] of Object.entries(local)) {
    const remoteSession = merged[key];
    if (!remoteSession || localSession.updatedAtMs > remoteSession.updatedAtMs) {
      merged[key] = localSession;
    }
  }
  return merged;
}

function sanitizeSpaceExcavatorProgressByEvent(value: unknown, fallback: Record<string, SpaceExcavatorProgressEntry>): Record<string, SpaceExcavatorProgressEntry> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...fallback };
  const out: Record<string, SpaceExcavatorProgressEntry> = {};
  for (const [eventId, raw] of Object.entries(value as Record<string, any>)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    if (!Array.isArray(raw.treasureTileIds) || !Array.isArray(raw.dugTileIds) || !Array.isArray(raw.foundTreasureTileIds)) continue;
    out[eventId] = {
      eventId,
      boardIndex: Math.max(0, Math.floor(raw.boardIndex ?? 0)),
      boardSize: Math.max(1, Math.floor(raw.boardSize ?? 5)),
      treasureCount: Math.max(0, Math.floor(raw.treasureCount ?? 0)),
      treasureTileIds: raw.treasureTileIds.filter((n:any)=>Number.isFinite(n)).map((n:any)=>Math.max(0,Math.floor(n))),
      dugTileIds: raw.dugTileIds.filter((n:any)=>Number.isFinite(n)).map((n:any)=>Math.max(0,Math.floor(n))),
      foundTreasureTileIds: raw.foundTreasureTileIds.filter((n:any)=>Number.isFinite(n)).map((n:any)=>Math.max(0,Math.floor(n))),
      completedBoardCount: Math.max(0, Math.floor(raw.completedBoardCount ?? 0)),
      status: raw.status === 'won' ? 'won' : 'active',
      updatedAtMs: Number.isFinite(raw.updatedAtMs) ? Math.max(0, Math.floor(raw.updatedAtMs)) : Date.now(),
    };
  }
  return out;
}

function mergeStringArrayByUnion(left: string[] = [], right: string[] = []): string[] {
  return Array.from(new Set([...left, ...right]));
}

function mergeCreatureCollection(
  remote: CreatureCollectionRuntimeEntry[],
  local: CreatureCollectionRuntimeEntry[],
): CreatureCollectionRuntimeEntry[] {
  const byCreatureId = new Map<string, CreatureCollectionRuntimeEntry>();
  [...remote, ...local].forEach((entry) => {
    const existing = byCreatureId.get(entry.creatureId);
    if (!existing) {
      byCreatureId.set(entry.creatureId, entry);
      return;
    }

    const bondXp = Math.max(existing.bondXp, entry.bondXp);
    byCreatureId.set(entry.creatureId, {
      creatureId: existing.creatureId,
      copies: Math.max(existing.copies, entry.copies),
      firstCollectedAtMs: Math.min(existing.firstCollectedAtMs, entry.firstCollectedAtMs),
      lastCollectedAtMs: Math.max(existing.lastCollectedAtMs, entry.lastCollectedAtMs),
      lastCollectedIslandNumber: Math.max(existing.lastCollectedIslandNumber, entry.lastCollectedIslandNumber),
      bondXp,
      bondLevel: Math.max(existing.bondLevel, entry.bondLevel, Math.floor(bondXp / 3) + 1),
      lastFedAtMs: Math.max(existing.lastFedAtMs ?? 0, entry.lastFedAtMs ?? 0) || null,
      claimedBondMilestones: Array.from(new Set([
        ...existing.claimedBondMilestones,
        ...entry.claimedBondMilestones,
      ])).sort((a, b) => a - b),
    });
  });

  return Array.from(byCreatureId.values())
    .sort((a, b) => b.lastCollectedAtMs - a.lastCollectedAtMs);
}

function mergeRecordForConflict(options: {
  remote: IslandRunGameStateRecord;
  local: IslandRunGameStateRecord;
}): IslandRunGameStateRecord {
  const { remote, local } = options;
  const mergedCompletedStopsByIsland = {
    ...remote.completedStopsByIsland,
    ...local.completedStopsByIsland,
  };
  Object.keys(mergedCompletedStopsByIsland).forEach((islandKey) => {
    mergedCompletedStopsByIsland[islandKey] = mergeStringArrayByUnion(
      remote.completedStopsByIsland[islandKey] ?? [],
      local.completedStopsByIsland[islandKey] ?? [],
    );
  });

  // Ticket ledger: union per-island (paying once on one device must not
  // require paying again after syncing). Numbers are unique per island.
  const mergedStopTicketsPaidByIsland: Record<string, number[]> = {
    ...remote.stopTicketsPaidByIsland,
    ...local.stopTicketsPaidByIsland,
  };
  Object.keys(mergedStopTicketsPaidByIsland).forEach((islandKey) => {
    const unionSet = new Set<number>([
      ...(remote.stopTicketsPaidByIsland[islandKey] ?? []),
      ...(local.stopTicketsPaidByIsland[islandKey] ?? []),
    ]);
    mergedStopTicketsPaidByIsland[islandKey] = Array.from(unionSet).sort((a, b) => a - b);
  });

  // Bonus-tile charge ledger: per-(island, tileIndex) max. A release on one
  // device zeroes the tile's charge (and prunes it from the map), so taking
  // the max preserves work in progress on the other device rather than silently
  // rolling back to 0. `clampBonusCharge` defends against malformed remote rows.
  const mergedBonusTileChargeByIsland: BonusTileChargeByIsland = {};
  const bonusIslandKeys = new Set<string>([
    ...Object.keys(remote.bonusTileChargeByIsland ?? {}),
    ...Object.keys(local.bonusTileChargeByIsland ?? {}),
  ]);
  bonusIslandKeys.forEach((islandKey) => {
    const remoteInner = remote.bonusTileChargeByIsland?.[islandKey] ?? {};
    const localInner = local.bonusTileChargeByIsland?.[islandKey] ?? {};
    const innerKeys = new Set<string>([
      ...Object.keys(remoteInner),
      ...Object.keys(localInner),
    ]);
    const innerMerged: Record<number, number> = {};
    innerKeys.forEach((idxKey) => {
      const idx = Number(idxKey);
      if (!Number.isFinite(idx) || idx < 0) return;
      const r = clampBonusCharge(remoteInner[idx]);
      const l = clampBonusCharge(localInner[idx]);
      const merged = Math.max(r, l);
      if (merged > 0) innerMerged[Math.floor(idx)] = merged;
    });
    if (Object.keys(innerMerged).length > 0) mergedBonusTileChargeByIsland[islandKey] = innerMerged;
  });

  const mergedMarketOwnedBundlesByIsland = {
    ...remote.marketOwnedBundlesByIsland,
    ...local.marketOwnedBundlesByIsland,
  };
  Object.keys(mergedMarketOwnedBundlesByIsland).forEach((islandKey) => {
    mergedMarketOwnedBundlesByIsland[islandKey] = {
      dice_bundle: Boolean(remote.marketOwnedBundlesByIsland[islandKey]?.dice_bundle) || Boolean(local.marketOwnedBundlesByIsland[islandKey]?.dice_bundle),
      heart_bundle: Boolean(remote.marketOwnedBundlesByIsland[islandKey]?.heart_bundle) || Boolean(local.marketOwnedBundlesByIsland[islandKey]?.heart_bundle),
      heart_boost_bundle:
        Boolean(remote.marketOwnedBundlesByIsland[islandKey]?.heart_boost_bundle) || Boolean(local.marketOwnedBundlesByIsland[islandKey]?.heart_boost_bundle),
    };
  });

  return {
    ...remote,
    ...local,
    runtimeVersion: remote.runtimeVersion,
    perIslandEggs: { ...remote.perIslandEggs, ...local.perIslandEggs },
    eggRewardInventory: mergeEggRewardInventory(remote.eggRewardInventory, local.eggRewardInventory),
    creatureTreatInventory: {
      basic: Math.max(remote.creatureTreatInventory.basic, local.creatureTreatInventory.basic),
      favorite: Math.max(remote.creatureTreatInventory.favorite, local.creatureTreatInventory.favorite),
      rare: Math.max(remote.creatureTreatInventory.rare, local.creatureTreatInventory.rare),
    },
    companionBonusLastVisitKey: local.companionBonusLastVisitKey ?? remote.companionBonusLastVisitKey,
    completedStopsByIsland: mergedCompletedStopsByIsland,
    stopTicketsPaidByIsland: mergedStopTicketsPaidByIsland,
    bonusTileChargeByIsland: mergedBonusTileChargeByIsland,
    marketOwnedBundlesByIsland: mergedMarketOwnedBundlesByIsland,
    creatureCollection: mergeCreatureCollection(remote.creatureCollection, local.creatureCollection),
    perfectCompanionIds: local.perfectCompanionIds.length > 0 ? local.perfectCompanionIds : remote.perfectCompanionIds,
    perfectCompanionReasons:
      Object.keys(local.perfectCompanionReasons).length > 0
        ? local.perfectCompanionReasons
        : remote.perfectCompanionReasons,
    perfectCompanionComputedAtMs: local.perfectCompanionComputedAtMs ?? remote.perfectCompanionComputedAtMs,
    perfectCompanionModelVersion: local.perfectCompanionModelVersion ?? remote.perfectCompanionModelVersion,
    perfectCompanionComputedCycleIndex:
      local.perfectCompanionComputedCycleIndex ?? remote.perfectCompanionComputedCycleIndex,
    stickerInventory: {
      ...remote.stickerInventory,
      ...local.stickerInventory,
    },
    lastEssenceDriftLost: Math.max(local.lastEssenceDriftLost, remote.lastEssenceDriftLost),
    minigameTicketsByEvent: mergeMinigameTicketsByEvent(
      remote.minigameTicketsByEvent,
      local.minigameTicketsByEvent,
    ),
    luckyRollSessionsByMilestone: mergeLuckyRollSessionsByMilestone(
      remote.luckyRollSessionsByMilestone,
      local.luckyRollSessionsByMilestone,
    ),
  };
}

function mergeMinigameTicketsByEvent(
  remote: Record<string, number>,
  local: Record<string, number>,
): Record<string, number> {
  const keys = new Set([...Object.keys(remote), ...Object.keys(local)]);
  const merged: Record<string, number> = {};
  keys.forEach((key) => {
    const count = Math.max(remote[key] ?? 0, local[key] ?? 0);
    if (count > 0) merged[key] = count;
  });
  return merged;
}

function toRemoteRow(record: IslandRunGameStateRecord, runtimeVersion: number, deviceSessionId: string) {
  return {
    user_id: null as unknown as string,
    runtime_version: runtimeVersion,
    first_run_claimed: record.firstRunClaimed,
    daily_hearts_claimed_day_key: record.dailyHeartsClaimedDayKey,
    onboarding_display_name_loop_completed: record.onboardingDisplayNameLoopCompleted,
    story_prologue_seen: record.storyPrologueSeen,
    audio_enabled: record.audioEnabled,
    current_island_number: record.currentIslandNumber,
    cycle_index: record.cycleIndex,
    boss_trial_resolved_island_number: record.bossTrialResolvedIslandNumber,
    active_egg_tier: record.activeEggTier,
    active_egg_set_at_ms: record.activeEggSetAtMs,
    active_egg_hatch_duration_ms: record.activeEggHatchDurationMs,
    active_egg_is_dormant: record.activeEggIsDormant,
    per_island_eggs: record.perIslandEggs,
    egg_reward_inventory: record.eggRewardInventory,
    island_started_at_ms: record.islandStartedAtMs,
    island_expires_at_ms: record.islandExpiresAtMs,
    island_shards: record.islandShards,
    token_index: record.tokenIndex,
    spin_tokens: record.spinTokens,
    dice_pool: record.dicePool,
    shard_tier_index: record.shardTierIndex,
    shard_claim_count: record.shardClaimCount,
    shields: record.shields,
    shards: record.shards,
    diamonds: record.diamonds,
    creature_treat_inventory: record.creatureTreatInventory,
    companion_bonus_last_visit_key: record.companionBonusLastVisitKey,
    completed_stops_by_island: record.completedStopsByIsland,
    stop_tickets_paid_by_island: record.stopTicketsPaidByIsland,
    bonus_tile_charge_by_island: record.bonusTileChargeByIsland,
    market_owned_bundles_by_island: record.marketOwnedBundlesByIsland,
    creature_collection: record.creatureCollection,
    active_companion_id: record.activeCompanionId,
    perfect_companion_ids: record.perfectCompanionIds,
    perfect_companion_reasons: record.perfectCompanionReasons,
    perfect_companion_computed_at_ms: record.perfectCompanionComputedAtMs,
    perfect_companion_model_version: record.perfectCompanionModelVersion,
    perfect_companion_computed_cycle_index: record.perfectCompanionComputedCycleIndex,
    active_stop_index: record.activeStopIndex,
    active_stop_type: record.activeStopType,
    stop_states_by_index: record.stopStatesByIndex,
    stop_build_state_by_index: record.stopBuildStateByIndex,
    boss_state: record.bossState,
    essence: record.essence,
    essence_lifetime_earned: record.essenceLifetimeEarned,
    essence_lifetime_spent: record.essenceLifetimeSpent,
    dice_regen_state: record.diceRegenState ?? null,
    reward_bar_progress: record.rewardBarProgress,
    reward_bar_threshold: record.rewardBarThreshold,
    reward_bar_claim_count_in_event: record.rewardBarClaimCountInEvent,
    reward_bar_escalation_tier: record.rewardBarEscalationTier,
    reward_bar_last_claim_at_ms: record.rewardBarLastClaimAtMs,
    reward_bar_bound_event_id: record.rewardBarBoundEventId,
    reward_bar_ladder_id: record.rewardBarLadderId ?? null,
    active_timed_event: record.activeTimedEvent,
    active_timed_event_progress: record.activeTimedEventProgress,
    sticker_progress: record.stickerProgress,
    sticker_inventory: record.stickerInventory,
    last_essence_drift_lost: record.lastEssenceDriftLost,
    minigame_tickets_by_event: record.minigameTicketsByEvent,
    lucky_roll_sessions_by_milestone: record.luckyRollSessionsByMilestone,
    space_excavator_progress_by_event: record.spaceExcavatorProgressByEvent,
    last_writer_device_session_id: deviceSessionId,
    updated_at: new Date().toISOString(),
  };
}

export function readIslandRunGameStateRecord(session: Session): IslandRunGameStateRecord {
  const fallback = getDefaultRecord();

  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(getStorageKey(session.user.id));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<IslandRunGameStateRecord>;
    return toRecord(parsed, fallback);
  } catch {
    return fallback;
  }
}

export type IslandRunGameStateHydrationSource = IslandRunRuntimeHydrationSource;

export async function hydrateIslandRunGameStateRecordWithSource(options: {
  session: Session;
  client: SupabaseClient | null;
  forceRemote?: boolean;
}): Promise<{ record: IslandRunGameStateRecord; source: IslandRunGameStateHydrationSource }> {
  const { session, client, forceRemote = false } = options;
  const fallback = readIslandRunGameStateRecord(session);

  if (isDemoSession(session) || !client) {
    logIslandRunEntryDebug('runtime_state_hydrate_skipped_remote', {
      userId: session.user.id,
      reason: isDemoSession(session) ? 'demo_session' : 'missing_client',
      ...getRuntimeStateDebugFields(fallback),
      fallbackCurrentIslandNumber: fallback.currentIslandNumber,
      fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber,
    });
    return { record: fallback, source: 'fallback_demo_or_no_client' };
  }

  const remoteBackoffUntil = getRemoteBackoffUntil(session.user.id);
  if (!forceRemote && remoteBackoffUntil !== null) {
    logIslandRunEntryDebug('runtime_state_hydrate_skipped_remote', {
      userId: session.user.id,
      reason: 'remote_backoff_active',
      backoffUntil: new Date(remoteBackoffUntil).toISOString(),
      ...getRuntimeStateDebugFields(fallback),
      fallbackCurrentIslandNumber: fallback.currentIslandNumber,
      fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber,
    });
    return { record: fallback, source: 'fallback_backoff_active' };
  }

  logIslandRunEntryDebug('runtime_state_hydrate_query_start', {
    userId: session.user.id,
    table: ISLAND_RUN_RUNTIME_STATE_TABLE,
    ...getRuntimeStateDebugFields(fallback),
    fallbackCurrentIslandNumber: fallback.currentIslandNumber,
    fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber,
  });

  const { data, error } = await client
    .from(ISLAND_RUN_RUNTIME_STATE_TABLE)
    .select('runtime_version,first_run_claimed,daily_hearts_claimed_day_key,onboarding_display_name_loop_completed,story_prologue_seen,audio_enabled,current_island_number,cycle_index,boss_trial_resolved_island_number,active_egg_tier,active_egg_set_at_ms,active_egg_hatch_duration_ms,active_egg_is_dormant,per_island_eggs,egg_reward_inventory,island_started_at_ms,island_expires_at_ms,island_shards,token_index,spin_tokens,dice_pool,shard_tier_index,shard_claim_count,shields,shards,diamonds,creature_treat_inventory,companion_bonus_last_visit_key,completed_stops_by_island,stop_tickets_paid_by_island,bonus_tile_charge_by_island,market_owned_bundles_by_island,creature_collection,active_companion_id,perfect_companion_ids,perfect_companion_reasons,perfect_companion_computed_at_ms,perfect_companion_model_version,perfect_companion_computed_cycle_index,active_stop_index,active_stop_type,stop_states_by_index,stop_build_state_by_index,boss_state,essence,essence_lifetime_earned,essence_lifetime_spent,dice_regen_state,reward_bar_progress,reward_bar_threshold,reward_bar_claim_count_in_event,reward_bar_escalation_tier,reward_bar_last_claim_at_ms,reward_bar_bound_event_id,reward_bar_ladder_id,active_timed_event,active_timed_event_progress,sticker_progress,sticker_inventory,last_essence_drift_lost,minigame_tickets_by_event,lucky_roll_sessions_by_milestone')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    if (isSchemaMismatchRuntimeStateError(error)) {
      const { data: legacyData, error: legacyError } = await client
        .from(ISLAND_RUN_RUNTIME_STATE_TABLE)
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!legacyError && legacyData) {
        const legacyHydratedRecord = toRecord(
          {
            runtimeVersion: legacyData.runtime_version ?? 0,
            firstRunClaimed: legacyData.first_run_claimed,
            dailyHeartsClaimedDayKey: legacyData.daily_hearts_claimed_day_key,
            onboardingDisplayNameLoopCompleted: legacyData.onboarding_display_name_loop_completed ?? false,
            storyPrologueSeen: legacyData.story_prologue_seen ?? false,
            audioEnabled: legacyData.audio_enabled ?? true,
            currentIslandNumber: legacyData.current_island_number ?? fallback.currentIslandNumber,
            cycleIndex: legacyData.cycle_index ?? 0,
            bossTrialResolvedIslandNumber: legacyData.boss_trial_resolved_island_number,
            activeEggTier: legacyData.active_egg_tier,
            activeEggSetAtMs: legacyData.active_egg_set_at_ms,
            activeEggHatchDurationMs: legacyData.active_egg_hatch_duration_ms,
            activeEggIsDormant: legacyData.active_egg_is_dormant,
            perIslandEggs: legacyData.per_island_eggs ?? {},
            eggRewardInventory: sanitizeEggRewardInventory(
              (legacyData as Record<string, unknown>).egg_reward_inventory,
              fallback.eggRewardInventory,
            ),
            islandStartedAtMs: legacyData.island_started_at_ms,
            islandExpiresAtMs: legacyData.island_expires_at_ms,
            islandShards: legacyData.island_shards ?? 0,
            tokenIndex: legacyData.token_index ?? 0,
            spinTokens: legacyData.spin_tokens ?? 0,
            dicePool: legacyData.dice_pool ?? fallback.dicePool,
            shardTierIndex: legacyData.shard_tier_index ?? 0,
            shardClaimCount: legacyData.shard_claim_count ?? 0,
            shields: legacyData.shields ?? 0,
            shards: legacyData.shards ?? 0,
            diamonds: legacyData.diamonds ?? 3,
            creatureTreatInventory: legacyData.creature_treat_inventory ?? fallback.creatureTreatInventory,
            companionBonusLastVisitKey: legacyData.companion_bonus_last_visit_key ?? null,
            completedStopsByIsland: legacyData.completed_stops_by_island ?? {},
            stopTicketsPaidByIsland: sanitizeStopTicketsPaidByIsland(
              ((legacyData as Record<string, unknown>).stop_tickets_paid_by_island as Record<string, number[]> | undefined) ?? {},
            ),
            bonusTileChargeByIsland: sanitizeBonusTileChargeByIsland(
              ((legacyData as Record<string, unknown>).bonus_tile_charge_by_island as BonusTileChargeByIsland | undefined) ?? {},
            ),
            marketOwnedBundlesByIsland: legacyData.market_owned_bundles_by_island ?? {},
            creatureCollection: legacyData.creature_collection ?? [],
            activeCompanionId: legacyData.active_companion_id ?? null,
            perfectCompanionIds: legacyData.perfect_companion_ids ?? fallback.perfectCompanionIds,
            perfectCompanionReasons: legacyData.perfect_companion_reasons ?? fallback.perfectCompanionReasons,
            perfectCompanionComputedAtMs: legacyData.perfect_companion_computed_at_ms ?? fallback.perfectCompanionComputedAtMs,
            perfectCompanionModelVersion: legacyData.perfect_companion_model_version ?? fallback.perfectCompanionModelVersion,
            perfectCompanionComputedCycleIndex: legacyData.perfect_companion_computed_cycle_index ?? fallback.perfectCompanionComputedCycleIndex,
            activeStopIndex: legacyData.active_stop_index ?? fallback.activeStopIndex,
            activeStopType: legacyData.active_stop_type ?? fallback.activeStopType,
            stopStatesByIndex: legacyData.stop_states_by_index ?? fallback.stopStatesByIndex,
            stopBuildStateByIndex: legacyData.stop_build_state_by_index ?? fallback.stopBuildStateByIndex,
            bossState: legacyData.boss_state ?? fallback.bossState,
            essence: legacyData.essence ?? fallback.essence,
            essenceLifetimeEarned: legacyData.essence_lifetime_earned ?? fallback.essenceLifetimeEarned,
            essenceLifetimeSpent: legacyData.essence_lifetime_spent ?? fallback.essenceLifetimeSpent,
            diceRegenState: legacyData.dice_regen_state ?? fallback.diceRegenState,
            rewardBarProgress: legacyData.reward_bar_progress ?? fallback.rewardBarProgress,
            rewardBarThreshold: legacyData.reward_bar_threshold ?? fallback.rewardBarThreshold,
            rewardBarClaimCountInEvent: legacyData.reward_bar_claim_count_in_event ?? fallback.rewardBarClaimCountInEvent,
            rewardBarEscalationTier: legacyData.reward_bar_escalation_tier ?? fallback.rewardBarEscalationTier,
            rewardBarLastClaimAtMs: legacyData.reward_bar_last_claim_at_ms ?? fallback.rewardBarLastClaimAtMs,
            rewardBarBoundEventId: legacyData.reward_bar_bound_event_id ?? fallback.rewardBarBoundEventId,
            rewardBarLadderId: legacyData.reward_bar_ladder_id ?? fallback.rewardBarLadderId,
            activeTimedEvent: legacyData.active_timed_event ?? fallback.activeTimedEvent,
            activeTimedEventProgress: legacyData.active_timed_event_progress ?? fallback.activeTimedEventProgress,
            stickerProgress: legacyData.sticker_progress ?? fallback.stickerProgress,
            stickerInventory: legacyData.sticker_inventory ?? fallback.stickerInventory,
            lastEssenceDriftLost: ((legacyData as Record<string, unknown>).last_essence_drift_lost as number) ?? fallback.lastEssenceDriftLost,
            minigameTicketsByEvent: sanitizeMinigameTicketsByEvent(
              (legacyData as Record<string, unknown>).minigame_tickets_by_event,
              fallback.minigameTicketsByEvent,
            ),
            luckyRollSessionsByMilestone: sanitizeIslandRunLuckyRollSessionsByMilestone(
              (legacyData as Record<string, unknown>).lucky_roll_sessions_by_milestone,
              fallback.luckyRollSessionsByMilestone,
            ),
            spaceExcavatorProgressByEvent: sanitizeSpaceExcavatorProgressByEvent(
              (legacyData as Record<string, unknown>).space_excavator_progress_by_event,
              fallback.spaceExcavatorProgressByEvent,
            ),
          },
          fallback,
        );

        // Only overwrite localStorage when the remote state is strictly newer.
        // This prevents a stale Supabase row from clobbering local writes whose
        // Supabase commit was interrupted (e.g., a build tap that was in-flight).
        if (legacyHydratedRecord.runtimeVersion > fallback.runtimeVersion && typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(getStorageKey(session.user.id), JSON.stringify(legacyHydratedRecord));
          } catch {
            // ignore local persistence failures in prototype mode
          }
        }

        setRemoteBackoffUntil(session.user.id, null);
        logIslandRunEntryDebug('runtime_state_hydrate_query_success', {
          userId: session.user.id,
          source: 'table_legacy_wildcard',
          ...getRuntimeStateDebugFields(legacyHydratedRecord),
        });
        return { record: legacyHydratedRecord, source: 'table' };
      }
    }

    const remoteBackoffTriggered = isTransportLikeRuntimeStateError(error) || isSchemaMismatchRuntimeStateError(error);
    const backoffUntil = remoteBackoffTriggered ? activateRemoteBackoff(session.user.id) : null;

    logIslandRunEntryDebug('runtime_state_hydrate_query_error', {
      userId: session.user.id,
      message: error.message,
      code: error.code ?? null,
      remoteBackoffTriggered,
      remoteBackoffUntil: backoffUntil !== null ? new Date(backoffUntil).toISOString() : null,
      ...getRuntimeStateDebugFields(fallback),
      fallbackCurrentIslandNumber: fallback.currentIslandNumber,
      fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber,
    });
    return { record: fallback, source: 'fallback_query_error' };
  }

  if (!data) {
    logIslandRunEntryDebug('runtime_state_hydrate_no_row', {
      userId: session.user.id,
      ...getRuntimeStateDebugFields(fallback),
      fallbackCurrentIslandNumber: fallback.currentIslandNumber,
      fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber,
    });
    return { record: fallback, source: 'fallback_no_row' };
  }

  const hydratedRecord = toRecord(
    {
      runtimeVersion: data.runtime_version ?? 0,
      firstRunClaimed: data.first_run_claimed,
      dailyHeartsClaimedDayKey: data.daily_hearts_claimed_day_key,
      onboardingDisplayNameLoopCompleted: data.onboarding_display_name_loop_completed ?? false,
      storyPrologueSeen: data.story_prologue_seen ?? false,
      audioEnabled: data.audio_enabled ?? true,
      currentIslandNumber: data.current_island_number ?? fallback.currentIslandNumber,
      cycleIndex: data.cycle_index ?? 0,
      bossTrialResolvedIslandNumber: data.boss_trial_resolved_island_number,
      activeEggTier: data.active_egg_tier,
      activeEggSetAtMs: data.active_egg_set_at_ms,
      activeEggHatchDurationMs: data.active_egg_hatch_duration_ms,
      activeEggIsDormant: data.active_egg_is_dormant,
      perIslandEggs: data.per_island_eggs ?? {},
      eggRewardInventory: sanitizeEggRewardInventory(
        (data as Record<string, unknown>).egg_reward_inventory,
        fallback.eggRewardInventory,
      ),
      islandStartedAtMs: data.island_started_at_ms,
      islandExpiresAtMs: data.island_expires_at_ms,
      islandShards: data.island_shards ?? 0,
      tokenIndex: data.token_index ?? 0,
      spinTokens: data.spin_tokens ?? 0,
      dicePool: data.dice_pool ?? fallback.dicePool,
      shardTierIndex: data.shard_tier_index ?? 0,
      shardClaimCount: data.shard_claim_count ?? 0,
      shields: data.shields ?? 0,
      shards: data.shards ?? 0,
      diamonds: data.diamonds ?? 3,
      creatureTreatInventory: data.creature_treat_inventory ?? fallback.creatureTreatInventory,
      companionBonusLastVisitKey: data.companion_bonus_last_visit_key ?? null,
      completedStopsByIsland: data.completed_stops_by_island ?? {},
      stopTicketsPaidByIsland: sanitizeStopTicketsPaidByIsland(
        ((data as Record<string, unknown>).stop_tickets_paid_by_island as Record<string, number[]> | undefined) ?? {},
      ),
      bonusTileChargeByIsland: sanitizeBonusTileChargeByIsland(
        ((data as Record<string, unknown>).bonus_tile_charge_by_island as BonusTileChargeByIsland | undefined) ?? {},
      ),
      marketOwnedBundlesByIsland: data.market_owned_bundles_by_island ?? {},
      creatureCollection: data.creature_collection ?? [],
      activeCompanionId: data.active_companion_id ?? null,
      perfectCompanionIds: data.perfect_companion_ids ?? fallback.perfectCompanionIds,
      perfectCompanionReasons: data.perfect_companion_reasons ?? fallback.perfectCompanionReasons,
      perfectCompanionComputedAtMs: data.perfect_companion_computed_at_ms ?? fallback.perfectCompanionComputedAtMs,
      perfectCompanionModelVersion: data.perfect_companion_model_version ?? fallback.perfectCompanionModelVersion,
      perfectCompanionComputedCycleIndex: data.perfect_companion_computed_cycle_index ?? fallback.perfectCompanionComputedCycleIndex,
      activeStopIndex: data.active_stop_index ?? fallback.activeStopIndex,
      activeStopType: data.active_stop_type ?? fallback.activeStopType,
      stopStatesByIndex: data.stop_states_by_index ?? fallback.stopStatesByIndex,
      stopBuildStateByIndex: data.stop_build_state_by_index ?? fallback.stopBuildStateByIndex,
      bossState: data.boss_state ?? fallback.bossState,
      essence: data.essence ?? fallback.essence,
      essenceLifetimeEarned: data.essence_lifetime_earned ?? fallback.essenceLifetimeEarned,
      essenceLifetimeSpent: data.essence_lifetime_spent ?? fallback.essenceLifetimeSpent,
      diceRegenState: data.dice_regen_state ?? fallback.diceRegenState,
      rewardBarProgress: data.reward_bar_progress ?? fallback.rewardBarProgress,
      rewardBarThreshold: data.reward_bar_threshold ?? fallback.rewardBarThreshold,
      rewardBarClaimCountInEvent: data.reward_bar_claim_count_in_event ?? fallback.rewardBarClaimCountInEvent,
      rewardBarEscalationTier: data.reward_bar_escalation_tier ?? fallback.rewardBarEscalationTier,
      rewardBarLastClaimAtMs: data.reward_bar_last_claim_at_ms ?? fallback.rewardBarLastClaimAtMs,
      rewardBarBoundEventId: data.reward_bar_bound_event_id ?? fallback.rewardBarBoundEventId,
      rewardBarLadderId: data.reward_bar_ladder_id ?? fallback.rewardBarLadderId,
      activeTimedEvent: data.active_timed_event ?? fallback.activeTimedEvent,
      activeTimedEventProgress: data.active_timed_event_progress ?? fallback.activeTimedEventProgress,
      stickerProgress: data.sticker_progress ?? fallback.stickerProgress,
      stickerInventory: data.sticker_inventory ?? fallback.stickerInventory,
      lastEssenceDriftLost: ((data as Record<string, unknown>).last_essence_drift_lost as number) ?? fallback.lastEssenceDriftLost,
      minigameTicketsByEvent: sanitizeMinigameTicketsByEvent(
        (data as Record<string, unknown>).minigame_tickets_by_event,
        fallback.minigameTicketsByEvent,
      ),
      luckyRollSessionsByMilestone: sanitizeIslandRunLuckyRollSessionsByMilestone(
        (data as Record<string, unknown>).lucky_roll_sessions_by_milestone,
        fallback.luckyRollSessionsByMilestone,
      ),
      spaceExcavatorProgressByEvent: sanitizeSpaceExcavatorProgressByEvent(
        (data as Record<string, unknown>).space_excavator_progress_by_event,
        fallback.spaceExcavatorProgressByEvent,
      ),
    },
    fallback,
  );

  // Only overwrite localStorage when the remote state is strictly newer.
  // This prevents a stale Supabase row from clobbering local writes whose
  // Supabase commit was interrupted (e.g., a build tap or essence earn
  // that was still in-flight when the user exited).
  if (hydratedRecord.runtimeVersion > fallback.runtimeVersion && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(getStorageKey(session.user.id), JSON.stringify(hydratedRecord));
    } catch {
      // ignore local persistence failures in prototype mode
    }
  }

  setRemoteBackoffUntil(session.user.id, null);

  logIslandRunEntryDebug('runtime_state_hydrate_query_success', {
    userId: session.user.id,
    source: 'table',
    ...getRuntimeStateDebugFields(hydratedRecord),
  });

  return { record: hydratedRecord, source: 'table' };
}

export async function hydrateIslandRunGameStateRecord(options: {
  session: Session;
  client: SupabaseClient | null;
  forceRemote?: boolean;
}): Promise<IslandRunGameStateRecord> {
  const result = await hydrateIslandRunGameStateRecordWithSource(options);
  return result.record;
}

export async function writeIslandRunGameStateRecord(options: {
  session: Session;
  client: SupabaseClient | null;
  record: IslandRunGameStateRecord;
  skipQueueReplay?: boolean;
  triggerSource?: string;
}): Promise<{ ok: true } | { ok: false; errorMessage: string }> {
  const { session, client, record, skipQueueReplay = false, triggerSource = 'runtime_state_write' } = options;
  const existingLocalRecord = readIslandRunGameStateRecord(session);
  const localRecord: IslandRunGameStateRecord = {
    ...record,
    runtimeVersion: Math.max(record.runtimeVersion, existingLocalRecord.runtimeVersion),
  };
  const runtimeBaseVersion = Math.max(0, Math.floor(localRecord.runtimeVersion));
  const clientActionId = buildRuntimeClientActionId(session.user.id, localRecord);
  const coordinator = getRuntimeCommitCoordinator(session.user.id);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(getStorageKey(session.user.id), JSON.stringify(localRecord));
    } catch {
      // ignore local persistence failures in prototype mode
    }
  }

  const enqueuePendingWrite = (pendingRecord: IslandRunGameStateRecord) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(getPendingWriteStorageKey(session.user.id), JSON.stringify(pendingRecord));
    } catch {
      // ignore local persistence failures in prototype mode
    }
  };

  const readPendingWrite = (): IslandRunGameStateRecord | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(getPendingWriteStorageKey(session.user.id));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<IslandRunGameStateRecord>;
      return toRecord(parsed, getDefaultRecord());
    } catch {
      return null;
    }
  };

  const clearPendingWrite = () => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(getPendingWriteStorageKey(session.user.id));
    } catch {
      // ignore local persistence failures in prototype mode
    }
  };

  const parkCommitAction = (
    reason: IslandRunRuntimeCommitParkReason,
    parkedRecord: IslandRunGameStateRecord,
  ) => {
    coordinator.parkedReason = reason;
    coordinator.parkedActionId = buildRuntimeClientActionId(session.user.id, parkedRecord);
    coordinator.parkedRecord = parkedRecord;
  };

  if (isDemoSession(session) || !client) {
    enqueuePendingWrite(localRecord);
    logIslandRunEntryDebug('runtime_state_persist_skipped_remote', {
      userId: session.user.id,
      reason: isDemoSession(session) ? 'demo_session' : 'missing_client',
      ...getRuntimeStateDebugFields(localRecord),
    });
    return { ok: true };
  }

  const deviceSessionId = getIslandRunDeviceSessionId(session.user.id);

  const remoteBackoffUntil = getRemoteBackoffUntil(session.user.id);
  if (remoteBackoffUntil !== null) {
    coordinator.syncState = 'blocked_remote_backoff';
    parkCommitAction('backoff', localRecord);
    enqueuePendingWrite(localRecord);
    logIslandRunEntryDebug('runtime_state_commit_blocked', {
      userId: session.user.id,
      reason: 'remote_backoff_active',
      backoffUntil: new Date(remoteBackoffUntil).toISOString(),
      clientActionId,
      commitAttemptId: buildRuntimeCommitAttemptId(session.user.id),
      runtimeBaseVersion,
      inFlightCount: coordinator.inFlightCount,
      syncState: coordinator.syncState,
      isPersistBlocked: true,
      triggerSource,
      ...getRuntimeStateDebugFields(localRecord),
    });
    logIslandRunEntryDebug('runtime_state_commit_parked', {
      userId: session.user.id,
      reason: 'remote_backoff_active',
      backoffUntil: new Date(remoteBackoffUntil).toISOString(),
      clientActionId,
      commitAttemptId: buildRuntimeCommitAttemptId(session.user.id),
      runtimeBaseVersion,
      inFlightCount: coordinator.inFlightCount,
      syncState: coordinator.syncState,
      isPersistBlocked: true,
      triggerSource,
      ...getRuntimeStateDebugFields(localRecord),
    });
    logIslandRunEntryDebug('runtime_state_persist_skipped_remote', {
      userId: session.user.id,
      reason: 'remote_backoff_active',
      backoffUntil: new Date(remoteBackoffUntil).toISOString(),
      ...getRuntimeStateDebugFields(localRecord),
    });
    return { ok: true };
  }

  if (coordinator.inFlightActionIds.has(clientActionId) || coordinator.parkedActionId === clientActionId) {
    logIslandRunEntryDebug('runtime_state_commit_blocked', {
      userId: session.user.id,
      reason: 'duplicate_client_action_id',
      clientActionId,
      commitAttemptId: buildRuntimeCommitAttemptId(session.user.id),
      runtimeBaseVersion,
      inFlightCount: coordinator.inFlightCount,
      syncState: coordinator.syncState,
      isPersistBlocked: true,
      triggerSource,
      ...getRuntimeStateDebugFields(localRecord),
    });
    return { ok: true };
  }

  if (coordinator.inFlightCount > 0) {
    parkCommitAction('single_flight', localRecord);
    // Defence-in-depth: also enqueue to the pending_write localStorage queue so
    // that if the in-flight commit's resume path fails (error / tab close /
    // crash), the next successful write will replay this snapshot rather than
    // silently dropping the user's progress.
    enqueuePendingWrite(localRecord);
    logIslandRunEntryDebug('runtime_state_commit_parked', {
      userId: session.user.id,
      reason: 'single_flight_inflight',
      clientActionId,
      commitAttemptId: buildRuntimeCommitAttemptId(session.user.id),
      runtimeBaseVersion,
      inFlightCount: coordinator.inFlightCount,
      syncState: coordinator.syncState,
      isPersistBlocked: true,
      triggerSource,
      ...getRuntimeStateDebugFields(localRecord),
    });
    return { ok: true };
  }

  logIslandRunEntryDebug('runtime_state_persist_start', {
    userId: session.user.id,
    table: ISLAND_RUN_RUNTIME_STATE_TABLE,
    clientActionId,
    commitAttemptId: buildRuntimeCommitAttemptId(session.user.id),
    runtimeBaseVersion,
    inFlightCount: coordinator.inFlightCount,
    syncState: coordinator.syncState,
    isPersistBlocked: false,
    triggerSource,
    ...getRuntimeStateDebugFields(localRecord),
    runtimeVersion: localRecord.runtimeVersion,
  });

  if (!skipQueueReplay) {
    const pendingWrite = readPendingWrite();
    if (pendingWrite) {
      const resumedActionId = buildRuntimeClientActionId(session.user.id, pendingWrite);
      logIslandRunEntryDebug('runtime_state_commit_resumed', {
        userId: session.user.id,
        reason: 'pending_write_replay',
        clientActionId: resumedActionId,
        commitAttemptId: buildRuntimeCommitAttemptId(session.user.id),
        runtimeBaseVersion: pendingWrite.runtimeVersion,
        inFlightCount: coordinator.inFlightCount,
        syncState: coordinator.syncState,
        isPersistBlocked: false,
        triggerSource,
        ...getRuntimeStateDebugFields(pendingWrite),
      });
      const replayResult = await writeIslandRunGameStateRecord({
        session,
        client,
        record: pendingWrite,
        skipQueueReplay: true,
        triggerSource: 'queue_replay',
      });
      if (replayResult.ok) {
        clearPendingWrite();
      } else {
        return replayResult;
      }
    }
  }

  coordinator.inFlightCount += 1;
  coordinator.inFlightActionIds.add(clientActionId);
  coordinator.syncState = 'committing';

  const tryConditionalWrite = async (candidate: IslandRunGameStateRecord): Promise<
    | { status: 'ok'; nextVersion: number }
    | { status: 'conflict' }
    | { status: 'error'; error: { message?: string | null; code?: string | null } }
  > => {
    const expectedVersion = Math.max(0, Math.floor(candidate.runtimeVersion));
    const commitAttemptId = buildRuntimeCommitAttemptId(session.user.id);
    logIslandRunEntryDebug('runtime_state_commit_attempt', {
      userId: session.user.id,
      clientActionId,
      commitAttemptId,
      runtimeBaseVersion: expectedVersion,
      inFlightCount: coordinator.inFlightCount,
      syncState: coordinator.syncState,
      isPersistBlocked: false,
      triggerSource,
      ...getRuntimeStateDebugFields(candidate),
    });
    const payload = toRemoteRow(candidate, expectedVersion + 1, deviceSessionId) as Record<string, unknown>;
    const commitResult = await commitIslandRunRuntimeSnapshot({
      client,
      deviceSessionId,
      expectedVersion,
      payload,
      clientActionId,
    });

    if (commitResult.status === 'applied' && typeof commitResult.nextVersion === 'number') {
      return { status: 'ok', nextVersion: commitResult.nextVersion };
    }

    if (commitResult.status === 'conflict') {
      return { status: 'conflict' };
    }

    return {
      status: 'error',
      error: commitResult.error ?? { message: 'Unknown commit action error.', code: 'unknown_commit_action_error' },
    };
  };

  try {
    let persistedRecord = localRecord;
    let writeResult = await tryConditionalWrite(localRecord);

    if (writeResult.status === 'conflict') {
      const latest = await hydrateIslandRunGameStateRecordWithSource({ session, client });
      if (latest.source === 'table') {
        const merged = mergeRecordForConflict({
          remote: latest.record,
          local: localRecord,
        });
        writeResult = await tryConditionalWrite(merged);
        if (writeResult.status === 'ok') {
          persistedRecord = merged;
        }
      } else {
        writeResult = {
          status: 'error',
          error: {
            message: 'Runtime state conflict detected and latest server row could not be loaded.',
            code: 'runtime_conflict_remote_unavailable',
          },
        };
      }
    }

    if (writeResult.status === 'error') {
      const { error } = writeResult;
      const conflictRecoveryGateTriggered = getNormalizedRuntimeStateError(error).code === 'runtime_conflict_remote_unavailable';
      const remoteBackoffTriggered =
        conflictRecoveryGateTriggered
        || isTransportLikeRuntimeStateError(error)
        || isSchemaMismatchRuntimeStateError(error);
      const backoffUntil = remoteBackoffTriggered ? activateRemoteBackoff(session.user.id) : null;
      if (conflictRecoveryGateTriggered) {
        coordinator.syncState = 'blocked_conflict_recovery';
      } else if (remoteBackoffTriggered) {
        coordinator.syncState = 'blocked_remote_backoff';
      }

      logIslandRunEntryDebug('runtime_state_persist_error', {
        userId: session.user.id,
        message: error.message,
        code: error.code ?? null,
        remoteBackoffTriggered,
        remoteBackoffUntil: backoffUntil !== null ? new Date(backoffUntil).toISOString() : null,
        clientActionId,
        commitAttemptId: buildRuntimeCommitAttemptId(session.user.id),
        runtimeBaseVersion,
        inFlightCount: coordinator.inFlightCount,
        syncState: coordinator.syncState,
        isPersistBlocked: remoteBackoffTriggered,
        triggerSource,
        ...getRuntimeStateDebugFields(localRecord),
      });

      if (remoteBackoffTriggered) {
        parkCommitAction(conflictRecoveryGateTriggered ? 'conflict_recovery' : 'backoff', localRecord);
        enqueuePendingWrite(localRecord);
        logIslandRunEntryDebug('runtime_state_commit_blocked', {
          userId: session.user.id,
          reason: conflictRecoveryGateTriggered ? 'conflict_recovery_gate_active' : 'remote_backoff_active',
          backoffUntil: backoffUntil !== null ? new Date(backoffUntil).toISOString() : null,
          clientActionId,
          commitAttemptId: buildRuntimeCommitAttemptId(session.user.id),
          runtimeBaseVersion,
          inFlightCount: coordinator.inFlightCount,
          syncState: coordinator.syncState,
          isPersistBlocked: true,
          triggerSource,
          ...getRuntimeStateDebugFields(localRecord),
        });
        return { ok: true };
      }

      // Non-backoff error (e.g. conditional write rejected after conflict-merge
      // retry). Persist the record to the pending_write queue so the next
      // successful commit replays it instead of silently dropping the user's
      // progress. Without this, a transient Supabase error between two rolls
      // could lose the first roll's delta forever.
      enqueuePendingWrite(localRecord);

      return { ok: false, errorMessage: error.message ?? 'Unknown runtime state persistence error.' };
    }

    if (writeResult.status !== 'ok') {
      return { ok: false, errorMessage: 'Runtime state persistence did not reach a terminal success state.' };
    }

    setRemoteBackoffUntil(session.user.id, null);
    clearPendingWrite();

    if (typeof window !== 'undefined') {
      try {
        const persisted = {
          ...persistedRecord,
          runtimeVersion: writeResult.nextVersion,
        };
        window.localStorage.setItem(getStorageKey(session.user.id), JSON.stringify(persisted));
      } catch {
        // ignore local persistence failures in prototype mode
      }
    }

    coordinator.syncState = 'idle';

    logIslandRunEntryDebug('runtime_state_persist_success', {
      userId: session.user.id,
      clientActionId,
      commitAttemptId: buildRuntimeCommitAttemptId(session.user.id),
      runtimeBaseVersion,
      inFlightCount: coordinator.inFlightCount,
      syncState: coordinator.syncState,
      isPersistBlocked: false,
      triggerSource,
      ...getRuntimeStateDebugFields(persistedRecord),
      runtimeVersion: writeResult.nextVersion,
    });

    if (coordinator.parkedRecord && coordinator.parkedActionId && coordinator.parkedActionId !== clientActionId) {
      const resumedRecord = coordinator.parkedRecord;
      const resumedActionId = coordinator.parkedActionId;
      const resumedReason = coordinator.parkedReason;
      coordinator.parkedRecord = null;
      coordinator.parkedActionId = null;
      coordinator.parkedReason = null;

      // Targeted debug log for mobile Safari debugging — captures field-level diff
      // between the parked snapshot and current local state so staleness is visible.
      const currentLocalAtResume = readIslandRunGameStateRecord(session);
      logIslandRunEntryDebug('runtime_state_parked_resume_debug', {
        userId: session.user.id,
        clientActionId: resumedActionId,
        resumedRuntimeVersion: resumedRecord.runtimeVersion,
        currentLocalRuntimeVersion: currentLocalAtResume.runtimeVersion,
        syncState: coordinator.syncState,
        resumedTokenIndex: resumedRecord.tokenIndex,
        currentLocalTokenIndex: currentLocalAtResume.tokenIndex,
        resumedDicePool: resumedRecord.dicePool,
        currentLocalDicePool: currentLocalAtResume.dicePool,
        resumedEssence: resumedRecord.essence,
        currentLocalEssence: currentLocalAtResume.essence,
        reason: resumedReason === 'single_flight' ? 'single_flight_drain' : 'backoff_expired',
      });

      logIslandRunEntryDebug('runtime_state_commit_resumed', {
        userId: session.user.id,
        reason: resumedReason === 'single_flight' ? 'single_flight_drain' : 'backoff_expired',
        clientActionId: resumedActionId,
        commitAttemptId: buildRuntimeCommitAttemptId(session.user.id),
        runtimeBaseVersion: resumedRecord.runtimeVersion,
        inFlightCount: coordinator.inFlightCount,
        syncState: coordinator.syncState,
        isPersistBlocked: false,
        triggerSource: 'resume_from_parked_action',
        ...getRuntimeStateDebugFields(resumedRecord),
      });
      const nextTriggerSource = resumedReason === 'single_flight' ? 'resume_after_single_flight' : 'resume_after_backoff';
      if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
        window.setTimeout(() => {
          void writeIslandRunGameStateRecord({
            session,
            client,
            record: resumedRecord,
            skipQueueReplay: true,
            triggerSource: nextTriggerSource,
          });
        }, 0);
      } else {
        void Promise.resolve().then(() =>
          writeIslandRunGameStateRecord({
            session,
            client,
            record: resumedRecord,
            skipQueueReplay: true,
            triggerSource: nextTriggerSource,
          }),
        );
      }
    }

    return { ok: true };
  } finally {
    // Invariant: always clean up in-flight tracking so the coordinator stays consistent.
    // When inFlightCount reaches 0, unconditionally reset syncState to 'idle' to prevent
    // stuck states (e.g. blocked_conflict_recovery persisting after error paths).
    coordinator.inFlightActionIds.delete(clientActionId);
    if (coordinator.inFlightCount <= 0) {
      logIslandRunEntryDebug('runtime_state_commit_coordinator_inflight_underflow', {
        userId: session.user.id,
        clientActionId,
        runtimeBaseVersion,
        inFlightCount: coordinator.inFlightCount,
        syncState: coordinator.syncState,
        triggerSource,
      });
      coordinator.inFlightCount = 0;
    } else {
      coordinator.inFlightCount -= 1;
    }
    if (coordinator.inFlightCount === 0) {
      coordinator.syncState = 'idle';
    }
  }
}
