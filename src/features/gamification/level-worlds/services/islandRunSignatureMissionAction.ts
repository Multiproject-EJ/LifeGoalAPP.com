import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import { MAX_BUILD_LEVEL } from './islandRunContractV2EssenceBuild';
import { getIslandRunBossReward } from './islandRunBossReward';
import {
  ISLAND_RUN_ECONOMY_SOURCES,
  recordIslandRunDiceInflow,
} from './islandRunEconomyTelemetry';
import {
  CACTUS_CANYON_ISLAND_NUMBER,
  CACTUS_CANYON_SPIRAL_MAX_SEGMENTS,
  FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET,
  FIRST_LIGHT_ASSEMBLY_ISLAND_NUMBER,
  GREAT_HONEYFALL_MAX_STAGE,
  HONEYCOMB_KINGDOM_ISLAND_NUMBER,
  FROSTWELL_DEPTH_METERS,
  FROSTWELL_ISLAND_NUMBER,
  FISHERMANS_VILLAGE_DRAGON_TRIGGER_KG,
  FISHERMANS_VILLAGE_FISH_TARGET_KG,
  FISHERMANS_VILLAGE_ISLAND_NUMBER,
  ROOTHEART_ISLAND_NUMBER,
  ROOTHEART_POWERWORKS_MAX_STAGE,
  SUNKEN_SANDS_FIRST_TREASURE_DICE,
  SUNKEN_SANDS_FIRST_TREASURE_ID,
  SUNKEN_SANDS_ISLAND_NUMBER,
  SUNKEN_SANDS_TREASURE_ROLL_TARGET,
  getCactusCanyonAvailableDynamite,
  getFirstLightAssemblyAvailableDynamite,
  getGreatHoneyfallAvailableNectar,
  getFrostwellAvailableSpins,
  getFrostwellIceworksTechCost,
  getIslandRunSignatureMissionKey,
  getRootheartPowerworksStageCost,
  getStagedRestorationAvailableCharges,
  getStagedRestorationMissionDescriptor,
  getSunkenSandsTreasureEssenceReward,
  isRootheartPowerworksCollectionComplete,
  resolveCactusCanyonSpiralProgress,
  resolveFirstLightAssemblyCraterProgress,
  resolveGreatHoneyfallProgress,
  resolveFrostwellIceworksProgress,
  resolveFrostwellSpinMeters,
  resolveFishermansVillageFishingProgress,
  resolveRootheartPowerworksProgress,
  resolveSunkenSandsTreasureProgress,
  resolveStagedRestorationMissionProgress,
} from './islandRunSignatureMissions';

export type ActivateStagedRestorationMissionResult =
  | {
      status: 'ok';
      missionId: string;
      activatedStages: number;
      chargesRemaining: number;
      completedAtMs: number | null;
    }
  | { status: 'wrong_island' | 'no_charges' | 'already_complete' | 'unsupported_island' };

/** Canonical spend action shared by the five staged restoration missions. */
export function activateStagedRestorationMissionStage(options: {
  session: Session;
  client: SupabaseClient | null;
}): Promise<ActivateStagedRestorationMissionResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    const descriptor = getStagedRestorationMissionDescriptor(state.currentIslandNumber);
    if (!descriptor) return { status: 'unsupported_island' };
    const progress = resolveStagedRestorationMissionProgress({
      ledger: state.signatureMissionProgressByIsland,
      cycleIndex: state.cycleIndex,
      islandNumber: state.currentIslandNumber,
    });
    if (!progress) return { status: 'wrong_island' };
    if (progress.completedAtMs !== null || progress.activatedStages >= descriptor.stageCount) {
      return { status: 'already_complete' };
    }
    if (getStagedRestorationAvailableCharges(progress) < descriptor.chargeCostPerStage) {
      return { status: 'no_charges' };
    }

    const nowMs = Date.now();
    const activatedStages = Math.min(descriptor.stageCount, progress.activatedStages + 1);
    const completedAtMs = activatedStages >= descriptor.stageCount
      ? progress.completedAtMs ?? nowMs
      : null;
    const nextProgress = {
      ...progress,
      chargesSpent: progress.chargesSpent + descriptor.chargeCostPerStage,
      activatedStages,
      lastActivatedStage: activatedStages,
      completedAtMs,
      updatedAtMs: nowMs,
    };
    const key = getIslandRunSignatureMissionKey(state.cycleIndex, state.currentIslandNumber);
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        signatureMissionProgressByIsland: {
          ...state.signatureMissionProgressByIsland,
          [key]: nextProgress,
        },
      },
      triggerSource: `activate_${descriptor.missionId.replace(/-/g, '_')}_stage`,
    });
    return {
      status: 'ok',
      missionId: descriptor.missionId,
      activatedStages,
      chargesRemaining: getStagedRestorationAvailableCharges(nextProgress),
      completedAtMs,
    };
  });
}

export type ReelFishermansVillageCatchResult =
  | {
      status: 'ok';
      catchId: number;
      kind: 'nothing' | 'small' | 'medium' | 'large' | 'colossal';
      kilograms: number;
      fishCaughtKg: number;
      dragonTriggered: boolean;
    }
  | { status: 'wrong_island' | 'nothing_hooked' };

export function reelFishermansVillageCatch(options: {
  session: Session;
  client: SupabaseClient | null;
}): Promise<ReelFishermansVillageCatchResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    if (state.currentIslandNumber !== FISHERMANS_VILLAGE_ISLAND_NUMBER) return { status: 'wrong_island' };
    const progress = resolveFishermansVillageFishingProgress({
      ledger: state.signatureMissionProgressByIsland,
      cycleIndex: state.cycleIndex,
      islandNumber: state.currentIslandNumber,
    });
    const pending = progress.pendingCatch;
    if (!pending) return { status: 'nothing_hooked' };

    const nowMs = Date.now();
    const fishCaughtKg = Math.min(FISHERMANS_VILLAGE_FISH_TARGET_KG, progress.fishCaughtKg + pending.kilograms);
    const dragonTriggered = progress.dragonTriggeredAtMs === null
      && fishCaughtKg >= FISHERMANS_VILLAGE_DRAGON_TRIGGER_KG;
    const completedAtMs = fishCaughtKg >= FISHERMANS_VILLAGE_FISH_TARGET_KG
      ? progress.completedAtMs ?? nowMs
      : progress.completedAtMs;
    const key = getIslandRunSignatureMissionKey(state.cycleIndex, state.currentIslandNumber);
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        signatureMissionProgressByIsland: {
          ...state.signatureMissionProgressByIsland,
          [key]: {
            ...progress,
            successfulCatches: progress.successfulCatches + (pending.kilograms > 0 ? 1 : 0),
            fishCaughtKg,
            pendingCatch: null,
            dragonTriggeredAtMs: dragonTriggered ? nowMs : progress.dragonTriggeredAtMs,
            completedAtMs,
            updatedAtMs: nowMs,
          },
        },
      },
      triggerSource: 'reel_fishermans_village_catch',
    });
    return {
      status: 'ok',
      catchId: pending.catchId,
      kind: pending.kind,
      kilograms: pending.kilograms,
      fishCaughtKg,
      dragonTriggered,
    };
  });
}

export type ReleaseFishermansVillageCatchResult =
  | { status: 'ok'; catchId: number; kind: 'nothing' | 'small' | 'medium' | 'large' | 'colossal' }
  | { status: 'wrong_island' | 'nothing_hooked' };

/**
 * Canonically clears a cast that returned empty or escaped. Reeling remains a
 * presentation interaction, but its outcome must not leave a stale pending
 * catch that reopens after reload.
 */
export function releaseFishermansVillageCatch(options: {
  session: Session;
  client: SupabaseClient | null;
  reason: 'empty' | 'escaped';
}): Promise<ReleaseFishermansVillageCatchResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    if (state.currentIslandNumber !== FISHERMANS_VILLAGE_ISLAND_NUMBER) return { status: 'wrong_island' };
    const progress = resolveFishermansVillageFishingProgress({
      ledger: state.signatureMissionProgressByIsland,
      cycleIndex: state.cycleIndex,
      islandNumber: state.currentIslandNumber,
    });
    const pending = progress.pendingCatch;
    if (!pending) return { status: 'nothing_hooked' };
    const nowMs = Date.now();
    const key = getIslandRunSignatureMissionKey(state.cycleIndex, state.currentIslandNumber);
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        signatureMissionProgressByIsland: {
          ...state.signatureMissionProgressByIsland,
          [key]: { ...progress, pendingCatch: null, updatedAtMs: nowMs },
        },
      },
      triggerSource: `release_fishermans_village_catch_${options.reason}`,
    });
    return { status: 'ok', catchId: pending.catchId, kind: pending.kind };
  });
}

export type DetonateFirstLightAssemblyChargeResult =
  | {
      status: 'ok';
      sectorBefore: number;
      sectorAfter: number;
      dynamiteRemaining: number;
      completedAtMs: number | null;
    }
  | { status: 'wrong_island' | 'no_dynamite' | 'already_complete' };

export function detonateFirstLightAssemblyCharge(options: {
  session: Session;
  client: SupabaseClient | null;
}): Promise<DetonateFirstLightAssemblyChargeResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    if (state.currentIslandNumber !== FIRST_LIGHT_ASSEMBLY_ISLAND_NUMBER) return { status: 'wrong_island' };
    const progress = resolveFirstLightAssemblyCraterProgress({
      ledger: state.signatureMissionProgressByIsland,
      cycleIndex: state.cycleIndex,
      islandNumber: state.currentIslandNumber,
    });
    if (progress.completedAtMs !== null || progress.chargesDetonated >= FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET) {
      return { status: 'already_complete' };
    }
    if (getFirstLightAssemblyAvailableDynamite(progress) <= 0) return { status: 'no_dynamite' };

    const sectorBefore = progress.chargesDetonated;
    const sectorAfter = Math.min(FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET, sectorBefore + 1);
    const nowMs = Date.now();
    const completedAtMs = sectorAfter >= FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET
      ? progress.completedAtMs ?? nowMs
      : null;
    const key = getIslandRunSignatureMissionKey(state.cycleIndex, state.currentIslandNumber);
    const nextProgress = {
      ...progress,
      chargesDetonated: sectorAfter,
      lastDetonatedSector: sectorBefore,
      completedAtMs,
      updatedAtMs: nowMs,
    };
    const completesMission = completedAtMs !== null;
    const finaleReward = completesMission && state.bossTrialResolvedIslandNumber !== FIRST_LIGHT_ASSEMBLY_ISLAND_NUMBER
      ? getIslandRunBossReward(FIRST_LIGHT_ASSEMBLY_ISLAND_NUMBER)
      : null;
    // Island 001 has no separate Boss landmark. Completing the Assembly mission
    // fulfils the canonical fifth-stop compatibility slot so every downstream
    // island-clear/travel reader still sees one authoritative progression
    // record. Only the four real outer landmarks must be funded by the player.
    const stopStatesByIndex = completesMission
      ? state.stopStatesByIndex.map((entry, index) => index === 4
        ? {
            ...entry,
            objectiveComplete: true,
            buildComplete: true,
            accessUnlocked: true,
            postponedAtMs: null,
            completedAtMs: entry.completedAtMs ?? nowMs,
          }
        : entry)
      : state.stopStatesByIndex;
    const stopBuildStateByIndex = completesMission
      ? state.stopBuildStateByIndex.map((entry, index) => index === 4 && entry
        ? {
            ...entry,
            buildLevel: MAX_BUILD_LEVEL,
            spentEssence: Math.max(entry.spentEssence, entry.requiredEssence),
          }
        : entry)
      : state.stopBuildStateByIndex;
    const completedStopsByIsland = completesMission
      ? {
          ...state.completedStopsByIsland,
          [String(FIRST_LIGHT_ASSEMBLY_ISLAND_NUMBER)]: Array.from(new Set([
            ...(state.completedStopsByIsland[String(FIRST_LIGHT_ASSEMBLY_ISLAND_NUMBER)] ?? []),
            'boss',
          ])),
        }
      : state.completedStopsByIsland;
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        bossTrialResolvedIslandNumber: completesMission
          ? FIRST_LIGHT_ASSEMBLY_ISLAND_NUMBER
          : state.bossTrialResolvedIslandNumber,
        bossState: completesMission
          ? {
              ...state.bossState,
              unlocked: true,
              objectiveComplete: true,
              buildComplete: true,
            }
          : state.bossState,
        stopStatesByIndex,
        stopBuildStateByIndex,
        completedStopsByIsland,
        dicePool: state.dicePool + (finaleReward?.dice ?? 0),
        essence: state.essence + (finaleReward?.essence ?? 0),
        essenceLifetimeEarned: state.essenceLifetimeEarned + (finaleReward?.essence ?? 0),
        spinTokens: state.spinTokens + (finaleReward?.spinTokens ?? 0),
        signatureMissionProgressByIsland: {
          ...state.signatureMissionProgressByIsland,
          [key]: nextProgress,
        },
      },
      triggerSource: 'detonate_first_light_assembly_charge',
    });
    if (finaleReward && finaleReward.dice > 0) {
      recordIslandRunDiceInflow({
        source: ISLAND_RUN_ECONOMY_SOURCES.signatureMissionFinaleDice,
        amount: finaleReward.dice,
        sessionId: options.session.user.id,
        atMs: nowMs,
        metadata: {
          islandNumber: FIRST_LIGHT_ASSEMBLY_ISLAND_NUMBER,
          missionId: nextProgress.missionId,
        },
      });
    }
    return {
      status: 'ok',
      sectorBefore,
      sectorAfter,
      dynamiteRemaining: getFirstLightAssemblyAvailableDynamite(nextProgress),
      completedAtMs,
    };
  });
}

export type ActivateGreatHoneyfallReservoirResult =
  | {
      status: 'ok';
      activatedReservoirs: number;
      nectarRemaining: number;
      completedAtMs: number | null;
    }
  | { status: 'wrong_island' | 'no_nectar' | 'already_complete' };

export function activateGreatHoneyfallReservoir(options: {
  session: Session;
  client: SupabaseClient | null;
}): Promise<ActivateGreatHoneyfallReservoirResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    if (state.currentIslandNumber !== HONEYCOMB_KINGDOM_ISLAND_NUMBER) return { status: 'wrong_island' };
    const progress = resolveGreatHoneyfallProgress({
      ledger: state.signatureMissionProgressByIsland,
      cycleIndex: state.cycleIndex,
      islandNumber: state.currentIslandNumber,
    });
    if (progress.completedAtMs !== null || progress.activatedReservoirs >= GREAT_HONEYFALL_MAX_STAGE) {
      return { status: 'already_complete' };
    }
    if (getGreatHoneyfallAvailableNectar(progress) <= 0) return { status: 'no_nectar' };

    const nowMs = Date.now();
    const activatedReservoirs = Math.min(
      GREAT_HONEYFALL_MAX_STAGE,
      progress.activatedReservoirs + 1,
    ) as 1 | 2 | 3 | 4;
    const completedAtMs = activatedReservoirs >= GREAT_HONEYFALL_MAX_STAGE
      ? progress.completedAtMs ?? nowMs
      : null;
    const key = getIslandRunSignatureMissionKey(state.cycleIndex, state.currentIslandNumber);
    const nextProgress = {
      ...progress,
      nectarChargesSpent: progress.nectarChargesSpent + 1,
      activatedReservoirs,
      lastActivatedReservoir: activatedReservoirs,
      completedAtMs,
      updatedAtMs: nowMs,
    };
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        signatureMissionProgressByIsland: {
          ...state.signatureMissionProgressByIsland,
          [key]: nextProgress,
        },
      },
      triggerSource: 'activate_great_honeyfall_reservoir',
    });
    return {
      status: 'ok',
      activatedReservoirs,
      nectarRemaining: getGreatHoneyfallAvailableNectar(nextProgress),
      completedAtMs,
    };
  });
}

export type BlastCactusCanyonSpiralSectionResult =
  | {
      status: 'ok';
      segments: number;
      segmentsBefore: number;
      segmentsAfter: number;
      dynamiteRemaining: number;
      completedAtMs: number | null;
    }
  | { status: 'wrong_island' | 'no_dynamite' | 'mission_locked' | 'already_complete' };

export function blastCactusCanyonSpiralSection(options: {
  session: Session;
  client: SupabaseClient | null;
}): Promise<BlastCactusCanyonSpiralSectionResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    if (state.currentIslandNumber !== CACTUS_CANYON_ISLAND_NUMBER) return { status: 'wrong_island' };
    const progress = resolveCactusCanyonSpiralProgress({
      ledger: state.signatureMissionProgressByIsland,
      cycleIndex: state.cycleIndex,
      islandNumber: state.currentIslandNumber,
    });
    if (progress.completedAtMs !== null || progress.segmentsExcavated >= CACTUS_CANYON_SPIRAL_MAX_SEGMENTS) {
      return { status: 'already_complete' };
    }
    if (progress.startedAtMs === null) return { status: 'mission_locked' };
    if (getCactusCanyonAvailableDynamite(progress) <= 0) return { status: 'no_dynamite' };

    const segmentsBefore = progress.segmentsExcavated;
    // One player-earned stick clears one authored gallery section. Keeping the
    // exchange deterministic makes the 3D blast and the persisted rail reveal
    // describe exactly the same event.
    const segmentsAfter = Math.min(CACTUS_CANYON_SPIRAL_MAX_SEGMENTS, segmentsBefore + 1);
    const segments = segmentsAfter - segmentsBefore;
    const nowMs = Date.now();
    const completedAtMs = segmentsAfter >= CACTUS_CANYON_SPIRAL_MAX_SEGMENTS
      ? progress.completedAtMs ?? nowMs
      : null;
    const key = getIslandRunSignatureMissionKey(state.cycleIndex, state.currentIslandNumber);
    const nextProgress = {
      ...progress,
      segmentsExcavated: segmentsAfter,
      dynamiteSpent: progress.dynamiteSpent + 1,
      lastBlastSegments: segments,
      completedAtMs,
      updatedAtMs: nowMs,
    };
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        signatureMissionProgressByIsland: {
          ...state.signatureMissionProgressByIsland,
          [key]: nextProgress,
        },
      },
      triggerSource: 'blast_cactus_canyon_spiral_section',
    });
    return {
      status: 'ok',
      segments,
      segmentsBefore,
      segmentsAfter,
      dynamiteRemaining: getCactusCanyonAvailableDynamite(nextProgress),
      completedAtMs,
    };
  });
}

export type SpinFrostwellDrillWheelResult =
  | { status: 'ok'; meters: number; wheelMeters: number; metersBefore: number; metersAfter: number; spinsRemaining: number }
  | { status: 'wrong_island' | 'no_spins' | 'drilling_complete' | 'already_built' };

export function spinFrostwellDrillWheel(options: {
  session: Session;
  client: SupabaseClient | null;
  /** Test seam. Production callers must leave this unset. */
  random?: () => number;
}): Promise<SpinFrostwellDrillWheelResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    if (state.currentIslandNumber !== FROSTWELL_ISLAND_NUMBER) return { status: 'wrong_island' };
    const progress = resolveFrostwellIceworksProgress({
      ledger: state.signatureMissionProgressByIsland,
      cycleIndex: state.cycleIndex,
      islandNumber: state.currentIslandNumber,
    });
    if (progress.builtAtMs !== null) return { status: 'already_built' };
    if (progress.metersDrilled >= FROSTWELL_DEPTH_METERS) return { status: 'drilling_complete' };
    if (getFrostwellAvailableSpins(progress) <= 0) return { status: 'no_spins' };

    const awarded = resolveFrostwellSpinMeters((options.random ?? Math.random)());
    const metersBefore = progress.metersDrilled;
    const metersAfter = Math.min(FROSTWELL_DEPTH_METERS, metersBefore + awarded);
    const meters = metersAfter - metersBefore;
    const nowMs = Date.now();
    const key = getIslandRunSignatureMissionKey(state.cycleIndex, state.currentIslandNumber);
    const nextProgress = {
      ...progress,
      metersDrilled: metersAfter,
      spinsUsed: progress.spinsUsed + 1,
      lastSpinMeters: meters,
      updatedAtMs: nowMs,
    };
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        signatureMissionProgressByIsland: {
          ...state.signatureMissionProgressByIsland,
          [key]: nextProgress,
        },
      },
      triggerSource: 'spin_frostwell_drill_wheel',
    });
    return {
      status: 'ok',
      meters,
      wheelMeters: awarded,
      metersBefore,
      metersAfter,
      spinsRemaining: getFrostwellAvailableSpins(nextProgress),
    };
  });
}

export type FundFrostwellIceworksResult =
  | { status: 'ok'; cost: number; builtAtMs: number }
  | { status: 'wrong_island' | 'drilling_incomplete' | 'already_built' | 'insufficient_essence'; cost: number };

export function fundFrostwellIceworks(options: {
  session: Session;
  client: SupabaseClient | null;
}): Promise<FundFrostwellIceworksResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    const cost = getFrostwellIceworksTechCost(state.cycleIndex);
    if (state.currentIslandNumber !== FROSTWELL_ISLAND_NUMBER) return { status: 'wrong_island', cost };
    const progress = resolveFrostwellIceworksProgress({
      ledger: state.signatureMissionProgressByIsland,
      cycleIndex: state.cycleIndex,
      islandNumber: state.currentIslandNumber,
    });
    if (progress.builtAtMs !== null) return { status: 'already_built', cost };
    if (progress.metersDrilled < FROSTWELL_DEPTH_METERS) return { status: 'drilling_incomplete', cost };
    if (state.essence < cost) return { status: 'insufficient_essence', cost };

    const builtAtMs = Date.now();
    const key = getIslandRunSignatureMissionKey(state.cycleIndex, state.currentIslandNumber);
    const next = {
      ...state,
      runtimeVersion: state.runtimeVersion + 1,
      essence: state.essence - cost,
      essenceLifetimeSpent: state.essenceLifetimeSpent + cost,
      signatureMissionProgressByIsland: {
        ...state.signatureMissionProgressByIsland,
        [key]: { ...progress, metersDrilled: FROSTWELL_DEPTH_METERS, builtAtMs, updatedAtMs: builtAtMs },
      },
    };
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      record: next,
      triggerSource: 'fund_frostwell_iceworks',
    });
    return { status: 'ok', cost, builtAtMs };
  });
}

export type FundRootheartPowerworksStageResult =
  | { status: 'ok'; cost: number; buildStage: number; activatedAtMs: number | null }
  | {
      status: 'wrong_island' | 'components_incomplete' | 'already_complete' | 'insufficient_essence';
      cost: number;
      buildStage: number;
    };

export function fundRootheartPowerworksStage(options: {
  session: Session;
  client: SupabaseClient | null;
}): Promise<FundRootheartPowerworksStageResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    const progress = resolveRootheartPowerworksProgress({
      ledger: state.signatureMissionProgressByIsland,
      cycleIndex: state.cycleIndex,
      islandNumber: state.currentIslandNumber,
    });
    const nextStage = Math.min(ROOTHEART_POWERWORKS_MAX_STAGE, progress.buildStage + 1);
    const cost = getRootheartPowerworksStageCost(state.cycleIndex, nextStage);
    if (state.currentIslandNumber !== ROOTHEART_ISLAND_NUMBER) {
      return { status: 'wrong_island', cost, buildStage: progress.buildStage };
    }
    if (progress.buildStage >= ROOTHEART_POWERWORKS_MAX_STAGE) {
      return { status: 'already_complete', cost, buildStage: progress.buildStage };
    }
    if (!isRootheartPowerworksCollectionComplete(progress)) {
      return { status: 'components_incomplete', cost, buildStage: progress.buildStage };
    }
    if (state.essence < cost) {
      return { status: 'insufficient_essence', cost, buildStage: progress.buildStage };
    }

    const nowMs = Date.now();
    const buildStage = nextStage as 1 | 2 | 3;
    const activatedAtMs = buildStage >= ROOTHEART_POWERWORKS_MAX_STAGE
      ? progress.activatedAtMs ?? nowMs
      : null;
    const key = getIslandRunSignatureMissionKey(state.cycleIndex, state.currentIslandNumber);
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        essence: state.essence - cost,
        essenceLifetimeSpent: state.essenceLifetimeSpent + cost,
        signatureMissionProgressByIsland: {
          ...state.signatureMissionProgressByIsland,
          [key]: {
            ...progress,
            buildStage,
            essenceSpent: progress.essenceSpent + cost,
            activatedAtMs,
            updatedAtMs: nowMs,
          },
        },
      },
      triggerSource: 'fund_rootheart_powerworks_stage',
    });
    return { status: 'ok', cost, buildStage, activatedAtMs };
  });
}

export type ClaimSunkenSandsFirstTreasureResult =
  | {
      status: 'ok';
      treasureId: typeof SUNKEN_SANDS_FIRST_TREASURE_ID;
      diceAwarded: number;
      essenceAwarded: number;
      claimedAtMs: number;
    }
  | {
      status: 'wrong_island' | 'not_ready' | 'already_claimed';
      rollsCompleted: number;
    };

export function claimSunkenSandsFirstTreasure(options: {
  session: Session;
  client: SupabaseClient | null;
}): Promise<ClaimSunkenSandsFirstTreasureResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    const progress = resolveSunkenSandsTreasureProgress({
      ledger: state.signatureMissionProgressByIsland,
      cycleIndex: state.cycleIndex,
      islandNumber: state.currentIslandNumber,
    });
    if (state.currentIslandNumber !== SUNKEN_SANDS_ISLAND_NUMBER) {
      return { status: 'wrong_island', rollsCompleted: progress.rollsCompleted };
    }
    if (progress.claimedAtMs !== null) {
      return { status: 'already_claimed', rollsCompleted: progress.rollsCompleted };
    }
    if (progress.rollsCompleted < SUNKEN_SANDS_TREASURE_ROLL_TARGET) {
      return { status: 'not_ready', rollsCompleted: progress.rollsCompleted };
    }

    const claimedAtMs = Date.now();
    const diceAwarded = SUNKEN_SANDS_FIRST_TREASURE_DICE;
    const essenceAwarded = getSunkenSandsTreasureEssenceReward(state.cycleIndex);
    const key = getIslandRunSignatureMissionKey(state.cycleIndex, state.currentIslandNumber);
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        dicePool: state.dicePool + diceAwarded,
        essence: state.essence + essenceAwarded,
        essenceLifetimeEarned: state.essenceLifetimeEarned + essenceAwarded,
        signatureMissionProgressByIsland: {
          ...state.signatureMissionProgressByIsland,
          [key]: {
            ...progress,
            treasureId: SUNKEN_SANDS_FIRST_TREASURE_ID,
            rollsCompleted: SUNKEN_SANDS_TREASURE_ROLL_TARGET,
            revealedAtMs: progress.revealedAtMs ?? claimedAtMs,
            claimedAtMs,
            updatedAtMs: claimedAtMs,
          },
        },
      },
      triggerSource: 'claim_sunken_sands_first_treasure',
    });
    recordIslandRunDiceInflow({
      source: ISLAND_RUN_ECONOMY_SOURCES.signatureTreasureDice,
      amount: diceAwarded,
      sessionId: options.session.user.id,
      atMs: claimedAtMs,
      metadata: {
        islandNumber: SUNKEN_SANDS_ISLAND_NUMBER,
        treasureId: SUNKEN_SANDS_FIRST_TREASURE_ID,
      },
    });
    return {
      status: 'ok',
      treasureId: SUNKEN_SANDS_FIRST_TREASURE_ID,
      diceAwarded,
      essenceAwarded,
      claimedAtMs,
    };
  });
}
