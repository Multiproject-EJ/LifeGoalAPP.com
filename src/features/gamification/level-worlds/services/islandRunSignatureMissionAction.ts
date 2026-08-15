import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import {
  FROSTWELL_DEPTH_METERS,
  FROSTWELL_ISLAND_NUMBER,
  ROOTHEART_ISLAND_NUMBER,
  ROOTHEART_POWERWORKS_MAX_STAGE,
  getFrostwellAvailableSpins,
  getFrostwellIceworksTechCost,
  getIslandRunSignatureMissionKey,
  getRootheartPowerworksStageCost,
  isRootheartPowerworksCollectionComplete,
  resolveFrostwellIceworksProgress,
  resolveFrostwellSpinMeters,
  resolveRootheartPowerworksProgress,
} from './islandRunSignatureMissions';

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
