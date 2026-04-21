"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetIslandRunRuntimeCommitCoordinatorForTests = resetIslandRunRuntimeCommitCoordinatorForTests;
exports.getIslandRunRuntimeCommitSyncStateForTests = getIslandRunRuntimeCommitSyncStateForTests;
exports.deriveIslandRunContractV2StopType = deriveIslandRunContractV2StopType;
exports.readIslandRunGameStateRecord = readIslandRunGameStateRecord;
exports.hydrateIslandRunGameStateRecordWithSource = hydrateIslandRunGameStateRecordWithSource;
exports.hydrateIslandRunGameStateRecord = hydrateIslandRunGameStateRecord;
exports.writeIslandRunGameStateRecord = writeIslandRunGameStateRecord;
const demoSession_1 = require("../../../../services/demoSession");
const islandRunDeviceSession_1 = require("./islandRunDeviceSession");
const islandRunEconomy_1 = require("./islandRunEconomy");
const islandRunEntryDebug_1 = require("./islandRunEntryDebug");
const islandRunCommitActionService_1 = require("./islandRunCommitActionService");
const islandRunStopTickets_1 = require("./islandRunStopTickets");
const islandRunBonusTile_1 = require("./islandRunBonusTile");
const ISLAND_RUN_RUNTIME_STATE_TABLE = 'island_run_runtime_state';
const ISLAND_RUN_REMOTE_BACKOFF_MS = 60 * 1000;
const CONTRACT_V2_STOP_COUNT = 5;
const DEFAULT_STOP_BUILD_REQUIRED_ESSENCE = 100; // Placeholder for phase-2 tuning.
const DEFAULT_REWARD_BAR_THRESHOLD = 10; // Placeholder for phase-2 tuning.
const runtimeCommitCoordinatorByUser = new Map();
let runtimeCommitAttemptCounter = 0;
function resetIslandRunRuntimeCommitCoordinatorForTests() {
    runtimeCommitCoordinatorByUser.clear();
    runtimeCommitAttemptCounter = 0;
}
function getIslandRunRuntimeCommitSyncStateForTests(userId) {
    return getRuntimeCommitCoordinator(userId).syncState;
}
function getRuntimeCommitCoordinator(userId) {
    const existing = runtimeCommitCoordinatorByUser.get(userId);
    if (existing)
        return existing;
    const created = {
        syncState: 'idle',
        inFlightCount: 0,
        inFlightActionIds: new Set(),
        parkedActionId: null,
        parkedRecord: null,
        parkedReason: null,
    };
    runtimeCommitCoordinatorByUser.set(userId, created);
    return created;
}
function buildRuntimeCommitAttemptId(userId) {
    runtimeCommitAttemptCounter += 1;
    return `runtime-commit-${userId}-${Date.now()}-${runtimeCommitAttemptCounter}`;
}
/**
 * Lightweight deterministic hash used for client action dedupe keys only.
 * This is intentionally non-cryptographic and not used for security decisions.
 */
function hashRuntimeCommitPayload(input) {
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}
function stableRuntimeCommitStringify(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((entry) => stableRuntimeCommitStringify(entry)).join(',')}]`;
    }
    const entries = Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableRuntimeCommitStringify(entryValue)}`);
    return `{${entries.join(',')}}`;
}
function buildRuntimeClientActionId(userId, record) {
    runtimeCommitAttemptCounter += 1;
    return `runtime-${userId}-${runtimeCommitAttemptCounter}-${Math.max(0, Math.floor(record.runtimeVersion))}-${hashRuntimeCommitPayload(stableRuntimeCommitStringify(record))}`;
}
function deriveIslandRunContractV2StopType(index) {
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
function toStopStateEntry(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { objectiveComplete: false, buildComplete: false };
    }
    const candidate = value;
    const completedAtMs = typeof candidate.completedAtMs === 'number' && Number.isFinite(candidate.completedAtMs)
        ? candidate.completedAtMs
        : undefined;
    return {
        objectiveComplete: candidate.objectiveComplete === true,
        buildComplete: candidate.buildComplete === true,
        ...(typeof completedAtMs === 'number' ? { completedAtMs } : {}),
    };
}
function toStopBuildStateEntry(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {
            requiredEssence: DEFAULT_STOP_BUILD_REQUIRED_ESSENCE,
            spentEssence: 0,
            buildLevel: 0,
        };
    }
    const candidate = value;
    return {
        requiredEssence: typeof candidate.requiredEssence === 'number' && Number.isFinite(candidate.requiredEssence)
            ? Math.max(0, Math.floor(candidate.requiredEssence))
            : DEFAULT_STOP_BUILD_REQUIRED_ESSENCE,
        spentEssence: typeof candidate.spentEssence === 'number' && Number.isFinite(candidate.spentEssence)
            ? Math.max(0, Math.floor(candidate.spentEssence))
            : 0,
        buildLevel: typeof candidate.buildLevel === 'number' && Number.isFinite(candidate.buildLevel)
            ? Math.max(0, Math.floor(candidate.buildLevel))
            : 0,
    };
}
function getStorageKey(userId) {
    return `island_run_runtime_state_${userId}`;
}
function getRemoteBackoffStorageKey(userId) {
    return `${getStorageKey(userId)}_remote_backoff_until`;
}
function getPendingWriteStorageKey(userId) {
    return `${getStorageKey(userId)}_pending_write`;
}
function getNormalizedRuntimeStateError(error) {
    return {
        message: typeof error?.message === 'string' ? error.message.trim().toLowerCase() : '',
        code: typeof error?.code === 'string' ? error.code.trim().toLowerCase() : '',
    };
}
function isTransportLikeRuntimeStateError(error) {
    if (!error)
        return false;
    const normalizedError = getNormalizedRuntimeStateError(error);
    const normalizedMessage = normalizedError.message;
    const normalizedCode = normalizedError.code;
    if (!normalizedMessage && !normalizedCode)
        return true;
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
function isSchemaMismatchRuntimeStateError(error) {
    if (!error)
        return false;
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
function getRemoteBackoffUntil(userId) {
    if (typeof window === 'undefined')
        return null;
    try {
        const raw = window.localStorage.getItem(getRemoteBackoffStorageKey(userId));
        if (!raw)
            return null;
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed <= Date.now()) {
            window.localStorage.removeItem(getRemoteBackoffStorageKey(userId));
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
}
function setRemoteBackoffUntil(userId, backoffUntil) {
    if (typeof window === 'undefined')
        return;
    try {
        const storageKey = getRemoteBackoffStorageKey(userId);
        if (backoffUntil === null) {
            window.localStorage.removeItem(storageKey);
            return;
        }
        window.localStorage.setItem(storageKey, String(backoffUntil));
    }
    catch {
        // ignore local persistence failures in prototype mode
    }
}
function activateRemoteBackoff(userId) {
    const backoffUntil = Date.now() + ISLAND_RUN_REMOTE_BACKOFF_MS;
    setRemoteBackoffUntil(userId, backoffUntil);
    return backoffUntil;
}
function getRuntimeStateDebugFields(record) {
    return {
        currentIslandNumber: record.currentIslandNumber,
        bossTrialResolvedIslandNumber: record.bossTrialResolvedIslandNumber,
        cycleIndex: record.cycleIndex,
        tokenIndex: record.tokenIndex,
        spinTokens: record.spinTokens,
        dicePool: record.dicePool,
    };
}
function getDefaultRecord() {
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
        islandStartedAtMs: nowMs,
        islandExpiresAtMs: nowMs + 48 * 60 * 60 * 1000,
        islandShards: 0,
        tokenIndex: 0,
        spinTokens: 0,
        dicePool: islandRunEconomy_1.ISLAND_RUN_DEFAULT_STARTING_DICE,
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
    };
}
function toCreatureCollectionEntry(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    const candidate = value;
    if (typeof candidate.creatureId !== 'string' || !candidate.creatureId.trim())
        return null;
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
            .filter((milestone) => typeof milestone === 'number' && Number.isFinite(milestone))
            .map((milestone) => Math.max(1, Math.floor(milestone))))).sort((a, b) => a - b)
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
function toRecord(value, fallback) {
    const eggTierRaw = value.activeEggTier;
    const activeEggTier = eggTierRaw === 'common' || eggTierRaw === 'rare' || eggTierRaw === 'mythic' ? eggTierRaw : fallback.activeEggTier;
    const normalizedActiveStopIndex = typeof value.activeStopIndex === 'number' && Number.isFinite(value.activeStopIndex)
        ? Math.max(0, Math.min(CONTRACT_V2_STOP_COUNT - 1, Math.floor(value.activeStopIndex)))
        : fallback.activeStopIndex;
    const stopStatesByIndex = Array.isArray(value.stopStatesByIndex)
        ? Array.from({ length: CONTRACT_V2_STOP_COUNT }, (_, index) => toStopStateEntry(value.stopStatesByIndex?.[index]))
        : fallback.stopStatesByIndex;
    const stopBuildStateByIndex = Array.isArray(value.stopBuildStateByIndex)
        ? Array.from({ length: CONTRACT_V2_STOP_COUNT }, (_, index) => toStopBuildStateEntry(value.stopBuildStateByIndex?.[index]))
        : fallback.stopBuildStateByIndex;
    return {
        runtimeVersion: typeof value.runtimeVersion === 'number' && Number.isFinite(value.runtimeVersion)
            ? Math.max(0, Math.floor(value.runtimeVersion))
            : fallback.runtimeVersion,
        firstRunClaimed: typeof value.firstRunClaimed === 'boolean' ? value.firstRunClaimed : fallback.firstRunClaimed,
        dailyHeartsClaimedDayKey: typeof value.dailyHeartsClaimedDayKey === 'string' || value.dailyHeartsClaimedDayKey === null
            ? value.dailyHeartsClaimedDayKey
            : fallback.dailyHeartsClaimedDayKey,
        onboardingDisplayNameLoopCompleted: typeof value.onboardingDisplayNameLoopCompleted === 'boolean'
            ? value.onboardingDisplayNameLoopCompleted
            : fallback.onboardingDisplayNameLoopCompleted,
        storyPrologueSeen: typeof value.storyPrologueSeen === 'boolean'
            ? value.storyPrologueSeen
            : fallback.storyPrologueSeen,
        audioEnabled: typeof value.audioEnabled === 'boolean'
            ? value.audioEnabled
            : fallback.audioEnabled,
        currentIslandNumber: typeof value.currentIslandNumber === 'number' && Number.isFinite(value.currentIslandNumber)
            ? Math.max(1, Math.floor(value.currentIslandNumber))
            : fallback.currentIslandNumber,
        cycleIndex: typeof value.cycleIndex === 'number' && Number.isFinite(value.cycleIndex)
            ? Math.max(0, Math.floor(value.cycleIndex))
            : fallback.cycleIndex,
        bossTrialResolvedIslandNumber: typeof value.bossTrialResolvedIslandNumber === 'number' && Number.isFinite(value.bossTrialResolvedIslandNumber)
            ? Math.max(1, Math.floor(value.bossTrialResolvedIslandNumber))
            : value.bossTrialResolvedIslandNumber === null
                ? null
                : fallback.bossTrialResolvedIslandNumber,
        activeEggTier,
        activeEggSetAtMs: typeof value.activeEggSetAtMs === 'number' && Number.isFinite(value.activeEggSetAtMs)
            ? value.activeEggSetAtMs
            : value.activeEggSetAtMs === null
                ? null
                : fallback.activeEggSetAtMs,
        activeEggHatchDurationMs: typeof value.activeEggHatchDurationMs === 'number' && Number.isFinite(value.activeEggHatchDurationMs)
            ? value.activeEggHatchDurationMs
            : value.activeEggHatchDurationMs === null
                ? null
                : fallback.activeEggHatchDurationMs,
        activeEggIsDormant: typeof value.activeEggIsDormant === 'boolean' ? value.activeEggIsDormant : fallback.activeEggIsDormant,
        perIslandEggs: value.perIslandEggs !== null && typeof value.perIslandEggs === 'object' && !Array.isArray(value.perIslandEggs)
            ? value.perIslandEggs
            : fallback.perIslandEggs,
        islandStartedAtMs: typeof value.islandStartedAtMs === 'number' && Number.isFinite(value.islandStartedAtMs)
            ? value.islandStartedAtMs
            : fallback.islandStartedAtMs,
        islandExpiresAtMs: typeof value.islandExpiresAtMs === 'number' && Number.isFinite(value.islandExpiresAtMs)
            ? value.islandExpiresAtMs
            : fallback.islandExpiresAtMs,
        islandShards: typeof value.islandShards === 'number' && Number.isFinite(value.islandShards)
            ? Math.max(0, Math.floor(value.islandShards))
            : fallback.islandShards,
        tokenIndex: typeof value.tokenIndex === 'number' && Number.isFinite(value.tokenIndex)
            ? Math.max(0, Math.floor(value.tokenIndex))
            : fallback.tokenIndex,
        spinTokens: typeof value.spinTokens === 'number' && Number.isFinite(value.spinTokens)
            ? Math.max(0, Math.floor(value.spinTokens))
            : fallback.spinTokens,
        dicePool: typeof value.dicePool === 'number' && Number.isFinite(value.dicePool)
            ? Math.max(0, Math.floor(value.dicePool))
            : fallback.dicePool,
        shardTierIndex: typeof value.shardTierIndex === 'number' && Number.isFinite(value.shardTierIndex)
            ? Math.max(0, Math.floor(value.shardTierIndex))
            : fallback.shardTierIndex,
        shardClaimCount: typeof value.shardClaimCount === 'number' && Number.isFinite(value.shardClaimCount)
            ? Math.max(0, Math.floor(value.shardClaimCount))
            : fallback.shardClaimCount,
        shields: typeof value.shields === 'number' && Number.isFinite(value.shields)
            ? Math.max(0, Math.floor(value.shields))
            : fallback.shields,
        shards: typeof value.shards === 'number' && Number.isFinite(value.shards)
            ? Math.max(0, Math.floor(value.shards))
            : fallback.shards,
        diamonds: typeof value.diamonds === 'number' && Number.isFinite(value.diamonds)
            ? Math.max(0, Math.floor(value.diamonds))
            : fallback.diamonds,
        creatureTreatInventory: value.creatureTreatInventory !== null && typeof value.creatureTreatInventory === 'object' && !Array.isArray(value.creatureTreatInventory)
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
        companionBonusLastVisitKey: typeof value.companionBonusLastVisitKey === 'string' || value.companionBonusLastVisitKey === null
            ? value.companionBonusLastVisitKey
            : fallback.companionBonusLastVisitKey,
        completedStopsByIsland: value.completedStopsByIsland !== null && typeof value.completedStopsByIsland === 'object' && !Array.isArray(value.completedStopsByIsland)
            ? Object.fromEntries(Object.entries(value.completedStopsByIsland).map(([islandKey, stops]) => [
                islandKey,
                Array.isArray(stops) ? stops.filter((stop) => typeof stop === 'string') : [],
            ]))
            : fallback.completedStopsByIsland,
        stopTicketsPaidByIsland: value.stopTicketsPaidByIsland !== null && typeof value.stopTicketsPaidByIsland === 'object' && !Array.isArray(value.stopTicketsPaidByIsland)
            ? (0, islandRunStopTickets_1.sanitizeStopTicketsPaidByIsland)(value.stopTicketsPaidByIsland)
            : fallback.stopTicketsPaidByIsland,
        bonusTileChargeByIsland: value.bonusTileChargeByIsland !== null && typeof value.bonusTileChargeByIsland === 'object' && !Array.isArray(value.bonusTileChargeByIsland)
            ? (0, islandRunBonusTile_1.sanitizeBonusTileChargeByIsland)(value.bonusTileChargeByIsland)
            : fallback.bonusTileChargeByIsland,
        marketOwnedBundlesByIsland: value.marketOwnedBundlesByIsland !== null && typeof value.marketOwnedBundlesByIsland === 'object' && !Array.isArray(value.marketOwnedBundlesByIsland)
            ? Object.fromEntries(Object.entries(value.marketOwnedBundlesByIsland).map(([islandKey, bundles]) => [
                islandKey,
                bundles !== null && typeof bundles === 'object' && !Array.isArray(bundles)
                    ? {
                        dice_bundle: Boolean(bundles.dice_bundle),
                        heart_bundle: Boolean(bundles.heart_bundle),
                        heart_boost_bundle: Boolean(bundles.heart_boost_bundle),
                    }
                    : {
                        dice_bundle: false,
                        heart_bundle: false,
                        heart_boost_bundle: false,
                    },
            ]))
            : fallback.marketOwnedBundlesByIsland,
        creatureCollection: Array.isArray(value.creatureCollection)
            ? value.creatureCollection
                .map((entry) => toCreatureCollectionEntry(entry))
                .filter((entry) => entry !== null)
            : fallback.creatureCollection,
        activeCompanionId: typeof value.activeCompanionId === 'string' || value.activeCompanionId === null
            ? value.activeCompanionId
            : fallback.activeCompanionId,
        perfectCompanionIds: Array.isArray(value.perfectCompanionIds)
            ? value.perfectCompanionIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
            : fallback.perfectCompanionIds,
        perfectCompanionReasons: value.perfectCompanionReasons !== null && typeof value.perfectCompanionReasons === 'object' && !Array.isArray(value.perfectCompanionReasons)
            ? Object.fromEntries(Object.entries(value.perfectCompanionReasons).map(([creatureId, reason]) => [
                creatureId,
                reason !== null && typeof reason === 'object' && !Array.isArray(reason)
                    ? {
                        strength: Array.isArray(reason.strength)
                            ? reason.strength
                                .filter((item) => typeof item === 'string' && item.trim().length > 0)
                            : [],
                        weaknessSupport: Array.isArray(reason.weaknessSupport)
                            ? reason.weaknessSupport
                                .filter((item) => typeof item === 'string' && item.trim().length > 0)
                            : [],
                        zoneMatch: Boolean(reason.zoneMatch),
                    }
                    : {
                        strength: [],
                        weaknessSupport: [],
                        zoneMatch: false,
                    },
            ]))
            : fallback.perfectCompanionReasons,
        perfectCompanionComputedAtMs: typeof value.perfectCompanionComputedAtMs === 'number' && Number.isFinite(value.perfectCompanionComputedAtMs)
            ? value.perfectCompanionComputedAtMs
            : value.perfectCompanionComputedAtMs === null
                ? null
                : fallback.perfectCompanionComputedAtMs,
        perfectCompanionModelVersion: typeof value.perfectCompanionModelVersion === 'string' || value.perfectCompanionModelVersion === null
            ? value.perfectCompanionModelVersion
            : fallback.perfectCompanionModelVersion,
        perfectCompanionComputedCycleIndex: typeof value.perfectCompanionComputedCycleIndex === 'number' && Number.isFinite(value.perfectCompanionComputedCycleIndex)
            ? Math.max(0, Math.floor(value.perfectCompanionComputedCycleIndex))
            : value.perfectCompanionComputedCycleIndex === null
                ? null
                : fallback.perfectCompanionComputedCycleIndex,
        activeStopIndex: normalizedActiveStopIndex,
        activeStopType: value.activeStopType === 'hatchery'
            || value.activeStopType === 'habit'
            || value.activeStopType === 'mystery'
            || value.activeStopType === 'wisdom'
            || value.activeStopType === 'boss'
            ? value.activeStopType
            : deriveIslandRunContractV2StopType(normalizedActiveStopIndex),
        stopStatesByIndex,
        stopBuildStateByIndex,
        bossState: value.bossState !== null && typeof value.bossState === 'object' && !Array.isArray(value.bossState)
            ? {
                unlocked: Boolean(value.bossState.unlocked),
                objectiveComplete: Boolean(value.bossState.objectiveComplete),
                buildComplete: Boolean(value.bossState.buildComplete),
                ...(typeof value.bossState.completedAtMs === 'number' && Number.isFinite(value.bossState.completedAtMs)
                    ? { completedAtMs: value.bossState.completedAtMs }
                    : {}),
            }
            : fallback.bossState,
        essence: typeof value.essence === 'number' && Number.isFinite(value.essence)
            ? Math.max(0, Math.floor(value.essence))
            : fallback.essence,
        essenceLifetimeEarned: typeof value.essenceLifetimeEarned === 'number' && Number.isFinite(value.essenceLifetimeEarned)
            ? Math.max(0, Math.floor(value.essenceLifetimeEarned))
            : fallback.essenceLifetimeEarned,
        essenceLifetimeSpent: typeof value.essenceLifetimeSpent === 'number' && Number.isFinite(value.essenceLifetimeSpent)
            ? Math.max(0, Math.floor(value.essenceLifetimeSpent))
            : fallback.essenceLifetimeSpent,
        diceRegenState: value.diceRegenState !== null && typeof value.diceRegenState === 'object' && !Array.isArray(value.diceRegenState)
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
        rewardBarProgress: typeof value.rewardBarProgress === 'number' && Number.isFinite(value.rewardBarProgress)
            ? Math.max(0, Math.floor(value.rewardBarProgress))
            : fallback.rewardBarProgress,
        rewardBarThreshold: typeof value.rewardBarThreshold === 'number' && Number.isFinite(value.rewardBarThreshold)
            ? Math.max(1, Math.floor(value.rewardBarThreshold))
            : fallback.rewardBarThreshold,
        rewardBarClaimCountInEvent: typeof value.rewardBarClaimCountInEvent === 'number' && Number.isFinite(value.rewardBarClaimCountInEvent)
            ? Math.max(0, Math.floor(value.rewardBarClaimCountInEvent))
            : fallback.rewardBarClaimCountInEvent,
        rewardBarEscalationTier: typeof value.rewardBarEscalationTier === 'number' && Number.isFinite(value.rewardBarEscalationTier)
            ? Math.max(0, Math.floor(value.rewardBarEscalationTier))
            : fallback.rewardBarEscalationTier,
        rewardBarLastClaimAtMs: typeof value.rewardBarLastClaimAtMs === 'number' && Number.isFinite(value.rewardBarLastClaimAtMs)
            ? value.rewardBarLastClaimAtMs
            : value.rewardBarLastClaimAtMs === null
                ? null
                : fallback.rewardBarLastClaimAtMs,
        rewardBarBoundEventId: typeof value.rewardBarBoundEventId === 'string' || value.rewardBarBoundEventId === null
            ? value.rewardBarBoundEventId
            : fallback.rewardBarBoundEventId,
        rewardBarLadderId: typeof value.rewardBarLadderId === 'string'
            ? value.rewardBarLadderId
            : value.rewardBarLadderId === null
                ? null
                : fallback.rewardBarLadderId,
        activeTimedEvent: value.activeTimedEvent !== null
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
        activeTimedEventProgress: value.activeTimedEventProgress !== null
            && typeof value.activeTimedEventProgress === 'object'
            && !Array.isArray(value.activeTimedEventProgress)
            ? {
                feedingActions: typeof value.activeTimedEventProgress.feedingActions === 'number' && Number.isFinite(value.activeTimedEventProgress.feedingActions)
                    ? Math.max(0, Math.floor(value.activeTimedEventProgress.feedingActions))
                    : fallback.activeTimedEventProgress.feedingActions,
                tokensEarned: typeof value.activeTimedEventProgress.tokensEarned === 'number' && Number.isFinite(value.activeTimedEventProgress.tokensEarned)
                    ? Math.max(0, Math.floor(value.activeTimedEventProgress.tokensEarned))
                    : fallback.activeTimedEventProgress.tokensEarned,
                milestonesClaimed: typeof value.activeTimedEventProgress.milestonesClaimed === 'number' && Number.isFinite(value.activeTimedEventProgress.milestonesClaimed)
                    ? Math.max(0, Math.floor(value.activeTimedEventProgress.milestonesClaimed))
                    : fallback.activeTimedEventProgress.milestonesClaimed,
            }
            : fallback.activeTimedEventProgress,
        stickerProgress: value.stickerProgress !== null && typeof value.stickerProgress === 'object' && !Array.isArray(value.stickerProgress)
            ? {
                fragments: typeof value.stickerProgress.fragments === 'number' && Number.isFinite(value.stickerProgress.fragments)
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
        stickerInventory: value.stickerInventory !== null && typeof value.stickerInventory === 'object' && !Array.isArray(value.stickerInventory)
            ? Object.fromEntries(Object.entries(value.stickerInventory)
                .filter(([key, count]) => typeof key === 'string' && typeof count === 'number' && Number.isFinite(count))
                .map(([key, count]) => [key, Math.max(0, Math.floor(count))]))
            : fallback.stickerInventory,
        lastEssenceDriftLost: typeof value.lastEssenceDriftLost === 'number' && Number.isFinite(value.lastEssenceDriftLost)
            ? Math.max(0, Math.floor(value.lastEssenceDriftLost))
            : fallback.lastEssenceDriftLost,
        minigameTicketsByEvent: sanitizeMinigameTicketsByEvent(value.minigameTicketsByEvent, fallback.minigameTicketsByEvent),
    };
}
/**
 * Coerce an unknown value into a safe `minigameTicketsByEvent` record. Values
 * are clamped to non-negative integers; zero entries are pruned. Unexpected
 * shapes fall back to the provided default.
 */
function sanitizeMinigameTicketsByEvent(value, fallback) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return { ...fallback };
    }
    const result = {};
    for (const [eventId, rawCount] of Object.entries(value)) {
        if (typeof rawCount !== 'number' || !Number.isFinite(rawCount))
            continue;
        const count = Math.max(0, Math.floor(rawCount));
        if (count > 0) {
            result[eventId] = count;
        }
    }
    return result;
}
function mergeStringArrayByUnion(left = [], right = []) {
    return Array.from(new Set([...left, ...right]));
}
function mergeCreatureCollection(remote, local) {
    const byCreatureId = new Map();
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
function mergeRecordForConflict(options) {
    const { remote, local } = options;
    const mergedCompletedStopsByIsland = {
        ...remote.completedStopsByIsland,
        ...local.completedStopsByIsland,
    };
    Object.keys(mergedCompletedStopsByIsland).forEach((islandKey) => {
        mergedCompletedStopsByIsland[islandKey] = mergeStringArrayByUnion(remote.completedStopsByIsland[islandKey] ?? [], local.completedStopsByIsland[islandKey] ?? []);
    });
    // Ticket ledger: union per-island (paying once on one device must not
    // require paying again after syncing). Numbers are unique per island.
    const mergedStopTicketsPaidByIsland = {
        ...remote.stopTicketsPaidByIsland,
        ...local.stopTicketsPaidByIsland,
    };
    Object.keys(mergedStopTicketsPaidByIsland).forEach((islandKey) => {
        const unionSet = new Set([
            ...(remote.stopTicketsPaidByIsland[islandKey] ?? []),
            ...(local.stopTicketsPaidByIsland[islandKey] ?? []),
        ]);
        mergedStopTicketsPaidByIsland[islandKey] = Array.from(unionSet).sort((a, b) => a - b);
    });
    // Bonus-tile charge ledger: per-(island, tileIndex) max. A release on one
    // device zeroes the tile's charge (and prunes it from the map), so taking
    // the max preserves work in progress on the other device rather than silently
    // rolling back to 0. `clampBonusCharge` defends against malformed remote rows.
    const mergedBonusTileChargeByIsland = {};
    const bonusIslandKeys = new Set([
        ...Object.keys(remote.bonusTileChargeByIsland ?? {}),
        ...Object.keys(local.bonusTileChargeByIsland ?? {}),
    ]);
    bonusIslandKeys.forEach((islandKey) => {
        const remoteInner = remote.bonusTileChargeByIsland?.[islandKey] ?? {};
        const localInner = local.bonusTileChargeByIsland?.[islandKey] ?? {};
        const innerKeys = new Set([
            ...Object.keys(remoteInner),
            ...Object.keys(localInner),
        ]);
        const innerMerged = {};
        innerKeys.forEach((idxKey) => {
            const idx = Number(idxKey);
            if (!Number.isFinite(idx) || idx < 0)
                return;
            const r = (0, islandRunBonusTile_1.clampBonusCharge)(remoteInner[idx]);
            const l = (0, islandRunBonusTile_1.clampBonusCharge)(localInner[idx]);
            const merged = Math.max(r, l);
            if (merged > 0)
                innerMerged[Math.floor(idx)] = merged;
        });
        if (Object.keys(innerMerged).length > 0)
            mergedBonusTileChargeByIsland[islandKey] = innerMerged;
    });
    const mergedMarketOwnedBundlesByIsland = {
        ...remote.marketOwnedBundlesByIsland,
        ...local.marketOwnedBundlesByIsland,
    };
    Object.keys(mergedMarketOwnedBundlesByIsland).forEach((islandKey) => {
        mergedMarketOwnedBundlesByIsland[islandKey] = {
            dice_bundle: Boolean(remote.marketOwnedBundlesByIsland[islandKey]?.dice_bundle) || Boolean(local.marketOwnedBundlesByIsland[islandKey]?.dice_bundle),
            heart_bundle: Boolean(remote.marketOwnedBundlesByIsland[islandKey]?.heart_bundle) || Boolean(local.marketOwnedBundlesByIsland[islandKey]?.heart_bundle),
            heart_boost_bundle: Boolean(remote.marketOwnedBundlesByIsland[islandKey]?.heart_boost_bundle) || Boolean(local.marketOwnedBundlesByIsland[islandKey]?.heart_boost_bundle),
        };
    });
    return {
        ...remote,
        ...local,
        runtimeVersion: remote.runtimeVersion,
        perIslandEggs: { ...remote.perIslandEggs, ...local.perIslandEggs },
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
        perfectCompanionReasons: Object.keys(local.perfectCompanionReasons).length > 0
            ? local.perfectCompanionReasons
            : remote.perfectCompanionReasons,
        perfectCompanionComputedAtMs: local.perfectCompanionComputedAtMs ?? remote.perfectCompanionComputedAtMs,
        perfectCompanionModelVersion: local.perfectCompanionModelVersion ?? remote.perfectCompanionModelVersion,
        perfectCompanionComputedCycleIndex: local.perfectCompanionComputedCycleIndex ?? remote.perfectCompanionComputedCycleIndex,
        stickerInventory: {
            ...remote.stickerInventory,
            ...local.stickerInventory,
        },
        lastEssenceDriftLost: Math.max(local.lastEssenceDriftLost, remote.lastEssenceDriftLost),
        minigameTicketsByEvent: mergeMinigameTicketsByEvent(remote.minigameTicketsByEvent, local.minigameTicketsByEvent),
    };
}
function mergeMinigameTicketsByEvent(remote, local) {
    const keys = new Set([...Object.keys(remote), ...Object.keys(local)]);
    const merged = {};
    keys.forEach((key) => {
        const count = Math.max(remote[key] ?? 0, local[key] ?? 0);
        if (count > 0)
            merged[key] = count;
    });
    return merged;
}
function toRemoteRow(record, runtimeVersion, deviceSessionId) {
    return {
        user_id: null,
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
        last_writer_device_session_id: deviceSessionId,
        updated_at: new Date().toISOString(),
    };
}
function readIslandRunGameStateRecord(session) {
    const fallback = getDefaultRecord();
    if (typeof window === 'undefined')
        return fallback;
    try {
        const raw = window.localStorage.getItem(getStorageKey(session.user.id));
        if (!raw)
            return fallback;
        const parsed = JSON.parse(raw);
        return toRecord(parsed, fallback);
    }
    catch {
        return fallback;
    }
}
async function hydrateIslandRunGameStateRecordWithSource(options) {
    const { session, client, forceRemote = false } = options;
    const fallback = readIslandRunGameStateRecord(session);
    if ((0, demoSession_1.isDemoSession)(session) || !client) {
        (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_hydrate_skipped_remote', {
            userId: session.user.id,
            reason: (0, demoSession_1.isDemoSession)(session) ? 'demo_session' : 'missing_client',
            ...getRuntimeStateDebugFields(fallback),
            fallbackCurrentIslandNumber: fallback.currentIslandNumber,
            fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber,
        });
        return { record: fallback, source: 'fallback_demo_or_no_client' };
    }
    const remoteBackoffUntil = getRemoteBackoffUntil(session.user.id);
    if (!forceRemote && remoteBackoffUntil !== null) {
        (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_hydrate_skipped_remote', {
            userId: session.user.id,
            reason: 'remote_backoff_active',
            backoffUntil: new Date(remoteBackoffUntil).toISOString(),
            ...getRuntimeStateDebugFields(fallback),
            fallbackCurrentIslandNumber: fallback.currentIslandNumber,
            fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber,
        });
        return { record: fallback, source: 'fallback_backoff_active' };
    }
    (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_hydrate_query_start', {
        userId: session.user.id,
        table: ISLAND_RUN_RUNTIME_STATE_TABLE,
        ...getRuntimeStateDebugFields(fallback),
        fallbackCurrentIslandNumber: fallback.currentIslandNumber,
        fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber,
    });
    const { data, error } = await client
        .from(ISLAND_RUN_RUNTIME_STATE_TABLE)
        .select('runtime_version,first_run_claimed,daily_hearts_claimed_day_key,onboarding_display_name_loop_completed,story_prologue_seen,audio_enabled,current_island_number,cycle_index,boss_trial_resolved_island_number,active_egg_tier,active_egg_set_at_ms,active_egg_hatch_duration_ms,active_egg_is_dormant,per_island_eggs,island_started_at_ms,island_expires_at_ms,island_shards,token_index,spin_tokens,dice_pool,shard_tier_index,shard_claim_count,shields,shards,diamonds,creature_treat_inventory,companion_bonus_last_visit_key,completed_stops_by_island,stop_tickets_paid_by_island,bonus_tile_charge_by_island,market_owned_bundles_by_island,creature_collection,active_companion_id,perfect_companion_ids,perfect_companion_reasons,perfect_companion_computed_at_ms,perfect_companion_model_version,perfect_companion_computed_cycle_index,active_stop_index,active_stop_type,stop_states_by_index,stop_build_state_by_index,boss_state,essence,essence_lifetime_earned,essence_lifetime_spent,dice_regen_state,reward_bar_progress,reward_bar_threshold,reward_bar_claim_count_in_event,reward_bar_escalation_tier,reward_bar_last_claim_at_ms,reward_bar_bound_event_id,reward_bar_ladder_id,active_timed_event,active_timed_event_progress,sticker_progress,sticker_inventory,last_essence_drift_lost,minigame_tickets_by_event')
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
                const legacyHydratedRecord = toRecord({
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
                    stopTicketsPaidByIsland: (0, islandRunStopTickets_1.sanitizeStopTicketsPaidByIsland)(legacyData.stop_tickets_paid_by_island ?? {}),
                    bonusTileChargeByIsland: (0, islandRunBonusTile_1.sanitizeBonusTileChargeByIsland)(legacyData.bonus_tile_charge_by_island ?? {}),
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
                    lastEssenceDriftLost: legacyData.last_essence_drift_lost ?? fallback.lastEssenceDriftLost,
                    minigameTicketsByEvent: sanitizeMinigameTicketsByEvent(legacyData.minigame_tickets_by_event, fallback.minigameTicketsByEvent),
                }, fallback);
                // Only overwrite localStorage when the remote state is strictly newer.
                // This prevents a stale Supabase row from clobbering local writes whose
                // Supabase commit was interrupted (e.g., a build tap that was in-flight).
                if (legacyHydratedRecord.runtimeVersion > fallback.runtimeVersion && typeof window !== 'undefined') {
                    try {
                        window.localStorage.setItem(getStorageKey(session.user.id), JSON.stringify(legacyHydratedRecord));
                    }
                    catch {
                        // ignore local persistence failures in prototype mode
                    }
                }
                setRemoteBackoffUntil(session.user.id, null);
                (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_hydrate_query_success', {
                    userId: session.user.id,
                    source: 'table_legacy_wildcard',
                    ...getRuntimeStateDebugFields(legacyHydratedRecord),
                });
                return { record: legacyHydratedRecord, source: 'table' };
            }
        }
        const remoteBackoffTriggered = isTransportLikeRuntimeStateError(error) || isSchemaMismatchRuntimeStateError(error);
        const backoffUntil = remoteBackoffTriggered ? activateRemoteBackoff(session.user.id) : null;
        (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_hydrate_query_error', {
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
        (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_hydrate_no_row', {
            userId: session.user.id,
            ...getRuntimeStateDebugFields(fallback),
            fallbackCurrentIslandNumber: fallback.currentIslandNumber,
            fallbackBossTrialResolvedIslandNumber: fallback.bossTrialResolvedIslandNumber,
        });
        return { record: fallback, source: 'fallback_no_row' };
    }
    const hydratedRecord = toRecord({
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
        stopTicketsPaidByIsland: (0, islandRunStopTickets_1.sanitizeStopTicketsPaidByIsland)(data.stop_tickets_paid_by_island ?? {}),
        bonusTileChargeByIsland: (0, islandRunBonusTile_1.sanitizeBonusTileChargeByIsland)(data.bonus_tile_charge_by_island ?? {}),
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
        lastEssenceDriftLost: data.last_essence_drift_lost ?? fallback.lastEssenceDriftLost,
        minigameTicketsByEvent: sanitizeMinigameTicketsByEvent(data.minigame_tickets_by_event, fallback.minigameTicketsByEvent),
    }, fallback);
    // Only overwrite localStorage when the remote state is strictly newer.
    // This prevents a stale Supabase row from clobbering local writes whose
    // Supabase commit was interrupted (e.g., a build tap or essence earn
    // that was still in-flight when the user exited).
    if (hydratedRecord.runtimeVersion > fallback.runtimeVersion && typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(getStorageKey(session.user.id), JSON.stringify(hydratedRecord));
        }
        catch {
            // ignore local persistence failures in prototype mode
        }
    }
    setRemoteBackoffUntil(session.user.id, null);
    (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_hydrate_query_success', {
        userId: session.user.id,
        source: 'table',
        ...getRuntimeStateDebugFields(hydratedRecord),
    });
    return { record: hydratedRecord, source: 'table' };
}
async function hydrateIslandRunGameStateRecord(options) {
    const result = await hydrateIslandRunGameStateRecordWithSource(options);
    return result.record;
}
async function writeIslandRunGameStateRecord(options) {
    const { session, client, record, skipQueueReplay = false, triggerSource = 'runtime_state_write' } = options;
    const existingLocalRecord = readIslandRunGameStateRecord(session);
    const localRecord = {
        ...record,
        runtimeVersion: Math.max(record.runtimeVersion, existingLocalRecord.runtimeVersion),
    };
    const runtimeBaseVersion = Math.max(0, Math.floor(localRecord.runtimeVersion));
    const clientActionId = buildRuntimeClientActionId(session.user.id, localRecord);
    const coordinator = getRuntimeCommitCoordinator(session.user.id);
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(getStorageKey(session.user.id), JSON.stringify(localRecord));
        }
        catch {
            // ignore local persistence failures in prototype mode
        }
    }
    const enqueuePendingWrite = (pendingRecord) => {
        if (typeof window === 'undefined')
            return;
        try {
            window.localStorage.setItem(getPendingWriteStorageKey(session.user.id), JSON.stringify(pendingRecord));
        }
        catch {
            // ignore local persistence failures in prototype mode
        }
    };
    const readPendingWrite = () => {
        if (typeof window === 'undefined')
            return null;
        try {
            const raw = window.localStorage.getItem(getPendingWriteStorageKey(session.user.id));
            if (!raw)
                return null;
            const parsed = JSON.parse(raw);
            return toRecord(parsed, getDefaultRecord());
        }
        catch {
            return null;
        }
    };
    const clearPendingWrite = () => {
        if (typeof window === 'undefined')
            return;
        try {
            window.localStorage.removeItem(getPendingWriteStorageKey(session.user.id));
        }
        catch {
            // ignore local persistence failures in prototype mode
        }
    };
    const parkCommitAction = (reason, parkedRecord) => {
        coordinator.parkedReason = reason;
        coordinator.parkedActionId = buildRuntimeClientActionId(session.user.id, parkedRecord);
        coordinator.parkedRecord = parkedRecord;
    };
    if ((0, demoSession_1.isDemoSession)(session) || !client) {
        enqueuePendingWrite(localRecord);
        (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_persist_skipped_remote', {
            userId: session.user.id,
            reason: (0, demoSession_1.isDemoSession)(session) ? 'demo_session' : 'missing_client',
            ...getRuntimeStateDebugFields(localRecord),
        });
        return { ok: true };
    }
    const deviceSessionId = (0, islandRunDeviceSession_1.getIslandRunDeviceSessionId)(session.user.id);
    const remoteBackoffUntil = getRemoteBackoffUntil(session.user.id);
    if (remoteBackoffUntil !== null) {
        coordinator.syncState = 'blocked_remote_backoff';
        parkCommitAction('backoff', localRecord);
        enqueuePendingWrite(localRecord);
        (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_commit_blocked', {
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
        (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_commit_parked', {
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
        (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_persist_skipped_remote', {
            userId: session.user.id,
            reason: 'remote_backoff_active',
            backoffUntil: new Date(remoteBackoffUntil).toISOString(),
            ...getRuntimeStateDebugFields(localRecord),
        });
        return { ok: true };
    }
    if (coordinator.inFlightActionIds.has(clientActionId) || coordinator.parkedActionId === clientActionId) {
        (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_commit_blocked', {
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
        (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_commit_parked', {
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
    (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_persist_start', {
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
            (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_commit_resumed', {
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
            }
            else {
                return replayResult;
            }
        }
    }
    coordinator.inFlightCount += 1;
    coordinator.inFlightActionIds.add(clientActionId);
    coordinator.syncState = 'committing';
    const tryConditionalWrite = async (candidate) => {
        const expectedVersion = Math.max(0, Math.floor(candidate.runtimeVersion));
        const commitAttemptId = buildRuntimeCommitAttemptId(session.user.id);
        (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_commit_attempt', {
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
        const payload = toRemoteRow(candidate, expectedVersion + 1, deviceSessionId);
        const commitResult = await (0, islandRunCommitActionService_1.commitIslandRunRuntimeSnapshot)({
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
        let writeResult = await tryConditionalWrite(localRecord);
        if (writeResult.status === 'conflict') {
            const latest = await hydrateIslandRunGameStateRecordWithSource({ session, client });
            if (latest.source === 'table') {
                const merged = mergeRecordForConflict({
                    remote: latest.record,
                    local: localRecord,
                });
                writeResult = await tryConditionalWrite(merged);
            }
            else {
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
            const remoteBackoffTriggered = conflictRecoveryGateTriggered
                || isTransportLikeRuntimeStateError(error)
                || isSchemaMismatchRuntimeStateError(error);
            const backoffUntil = remoteBackoffTriggered ? activateRemoteBackoff(session.user.id) : null;
            if (conflictRecoveryGateTriggered) {
                coordinator.syncState = 'blocked_conflict_recovery';
            }
            else if (remoteBackoffTriggered) {
                coordinator.syncState = 'blocked_remote_backoff';
            }
            (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_persist_error', {
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
                (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_commit_blocked', {
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
                    ...localRecord,
                    runtimeVersion: writeResult.nextVersion,
                };
                window.localStorage.setItem(getStorageKey(session.user.id), JSON.stringify(persisted));
            }
            catch {
                // ignore local persistence failures in prototype mode
            }
        }
        coordinator.syncState = 'idle';
        (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_persist_success', {
            userId: session.user.id,
            clientActionId,
            commitAttemptId: buildRuntimeCommitAttemptId(session.user.id),
            runtimeBaseVersion,
            inFlightCount: coordinator.inFlightCount,
            syncState: coordinator.syncState,
            isPersistBlocked: false,
            triggerSource,
            ...getRuntimeStateDebugFields(localRecord),
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
            (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_parked_resume_debug', {
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
            (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_commit_resumed', {
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
            }
            else {
                void Promise.resolve().then(() => writeIslandRunGameStateRecord({
                    session,
                    client,
                    record: resumedRecord,
                    skipQueueReplay: true,
                    triggerSource: nextTriggerSource,
                }));
            }
        }
        return { ok: true };
    }
    finally {
        // Invariant: always clean up in-flight tracking so the coordinator stays consistent.
        // When inFlightCount reaches 0, unconditionally reset syncState to 'idle' to prevent
        // stuck states (e.g. blocked_conflict_recovery persisting after error paths).
        coordinator.inFlightActionIds.delete(clientActionId);
        if (coordinator.inFlightCount <= 0) {
            (0, islandRunEntryDebug_1.logIslandRunEntryDebug)('runtime_state_commit_coordinator_inflight_underflow', {
                userId: session.user.id,
                clientActionId,
                runtimeBaseVersion,
                inFlightCount: coordinator.inFlightCount,
                syncState: coordinator.syncState,
                triggerSource,
            });
            coordinator.inFlightCount = 0;
        }
        else {
            coordinator.inFlightCount -= 1;
        }
        if (coordinator.inFlightCount === 0) {
            coordinator.syncState = 'idle';
        }
    }
}
