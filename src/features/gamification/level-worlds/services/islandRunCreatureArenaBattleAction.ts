import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  EGG_REWARD_RARITY_ROLL_DENOMINATOR,
  EGG_REWARD_RARITY_THRESHOLD,
  type EggRewardInventoryEntry,
  type IslandRunGameStateRecord,
} from './islandRunGameStateStore';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { getIslandRunStateSnapshot, commitIslandRunState } from './islandRunStateStore';
import {
  createIslandRunCreatureArenaBattle,
  getIslandRunArenaShieldPickupCount,
  resolveIslandRunCreatureArenaTurn,
  type IslandRunArenaBattleEvent,
  type IslandRunArenaBattleRejection,
  type IslandRunArenaBattleState,
  type IslandRunArenaPlayerAction,
} from './islandRunCreatureArenaBattle';
import { getIslandRunArenaCreatureForIsland } from './islandRunArenaCreatureRoster';
import { canCreatureBeAcquiredFromSource, getCreatureById } from './creatureCatalog';
import { getBossChallengeLockReason } from './islandRunBossEncounter';
import { getIslandRunBossReward, type IslandRunBossReward } from './islandRunBossReward';

export type StartIslandRunArenaBattleStatus =
  | 'started'
  | 'resumed'
  | 'already_victorious'
  | 'locked'
  | 'unavailable';

export interface StartIslandRunArenaBattleResult {
  status: StartIslandRunArenaBattleStatus;
  record: IslandRunGameStateRecord;
  battle: IslandRunArenaBattleState | null;
  lockReason: string | null;
}

export interface ResolveIslandRunArenaBattleActionResult {
  status: 'resolved' | 'rejected' | 'missing_battle' | 'wrong_island';
  record: IslandRunGameStateRecord;
  battle: IslandRunArenaBattleState | null;
  events: readonly IslandRunArenaBattleEvent[];
  rejection: IslandRunArenaBattleRejection | null;
  rewardEgg: EggRewardInventoryEntry | null;
  standardBossReward: IslandRunBossReward | null;
}

function createArenaRewardEgg(options: {
  islandNumber: number;
  cycleIndex: number;
  creatureId: string;
  creatureTier: 'common' | 'rare';
  grantedAtMs: number;
}): EggRewardInventoryEntry {
  const sourceSessionKey = `creature_arena:${options.cycleIndex}:${options.islandNumber}`;
  const eggRewardId = `${sourceSessionKey}:${options.creatureId}`;
  return {
    eggRewardId,
    source: 'creature_arena',
    sourceSessionKey,
    sourceRunId: sourceSessionKey,
    sourceRewardId: `species_egg:${options.creatureId}`,
    tileId: 0,
    cycleIndex: options.cycleIndex,
    targetIslandNumber: options.islandNumber,
    eggTier: options.creatureTier,
    eggSeed: Math.max(0, (options.islandNumber * 1009) + (options.cycleIndex * 9176)),
    rarityRoll: 0,
    rarityRollDenominator: EGG_REWARD_RARITY_ROLL_DENOMINATOR,
    rarityThreshold: EGG_REWARD_RARITY_THRESHOLD,
    resolverVersion: 'creature_arena_locked_v1',
    status: 'unopened',
    grantedAtMs: options.grantedAtMs,
    openedAtMs: null,
    lockedCreatureId: options.creatureId,
  };
}

export function startIslandRunCreatureArenaBattle(options: {
  session: Session;
  client: SupabaseClient | null;
  islandNumber: number;
  restartAfterDefeat?: boolean;
  nowMs?: number;
}): Promise<StartIslandRunArenaBattleResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const current = getIslandRunStateSnapshot(options.session);
    const rosterEntry = getIslandRunArenaCreatureForIsland(options.islandNumber);
    const creature = rosterEntry ? getCreatureById(rosterEntry.creatureId) : null;
    if (
      current.currentIslandNumber !== options.islandNumber
      || !rosterEntry
      || rosterEntry.implementationStatus !== 'implemented'
      || !creature
      || !canCreatureBeAcquiredFromSource(creature, 'arena')
    ) {
      return { status: 'unavailable', record: current, battle: null, lockReason: null };
    }
    if (current.bossTrialResolvedIslandNumber === options.islandNumber) {
      return {
        status: 'already_victorious',
        record: current,
        battle: current.bossState.arenaBattle ?? null,
        lockReason: null,
      };
    }
    const lockReason = getBossChallengeLockReason({
      stopBuildStateByIndex: current.stopBuildStateByIndex,
      isBossDefeated: false,
    });
    if (lockReason) return { status: 'locked', record: current, battle: null, lockReason };

    const existing = current.bossState.arenaBattle;
    if (existing?.islandNumber === options.islandNumber) {
      if (existing.phase === 'awaiting_command') {
        return { status: 'resumed', record: current, battle: existing, lockReason: null };
      }
      if (existing.phase === 'victory') {
        return { status: 'already_victorious', record: current, battle: existing, lockReason: null };
      }
      if (!options.restartAfterDefeat) {
        return { status: 'resumed', record: current, battle: existing, lockReason: null };
      }
    }

    const battle = createIslandRunCreatureArenaBattle({
      islandNumber: options.islandNumber,
      opponentCreatureId: rosterEntry.creatureId,
      shieldCharges: getIslandRunArenaShieldPickupCount(options.islandNumber),
      encounterSeed: (current.cycleIndex * 1000) + options.islandNumber,
    });
    if (!battle) return { status: 'unavailable', record: current, battle: null, lockReason: null };
    const next: IslandRunGameStateRecord = {
      ...current,
      bossState: { ...current.bossState, arenaBattle: battle },
      runtimeVersion: current.runtimeVersion + 1,
    };
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      record: next,
      triggerSource: options.restartAfterDefeat ? 'creature_arena_retry' : 'creature_arena_start',
    });
    return { status: 'started', record: next, battle, lockReason: null };
  });
}

export function resolveIslandRunCreatureArenaBattleAction(options: {
  session: Session;
  client: SupabaseClient | null;
  islandNumber: number;
  action: IslandRunArenaPlayerAction;
  nowMs?: number;
}): Promise<ResolveIslandRunArenaBattleActionResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const current = getIslandRunStateSnapshot(options.session);
    if (current.currentIslandNumber !== options.islandNumber) {
      return { status: 'wrong_island', record: current, battle: null, events: [], rejection: null, rewardEgg: null, standardBossReward: null };
    }
    const battle = current.bossState.arenaBattle;
    if (!battle || battle.islandNumber !== options.islandNumber) {
      return { status: 'missing_battle', record: current, battle: null, events: [], rejection: null, rewardEgg: null, standardBossReward: null };
    }
    const resolution = resolveIslandRunCreatureArenaTurn(battle, options.action);
    if (!resolution.accepted) {
      return {
        status: 'rejected',
        record: current,
        battle,
        events: resolution.events,
        rejection: resolution.rejection,
        rewardEgg: null,
        standardBossReward: null,
      };
    }

    const wonNow = resolution.state.phase === 'victory';
    const bossWasAlreadyResolved = current.bossTrialResolvedIslandNumber === options.islandNumber;
    const rosterEntry = getIslandRunArenaCreatureForIsland(options.islandNumber);
    const creature = rosterEntry ? getCreatureById(rosterEntry.creatureId) : null;
    const grantedAtMs = typeof options.nowMs === 'number' && Number.isFinite(options.nowMs)
      ? Math.max(0, Math.floor(options.nowMs))
      : Date.now();
    const candidateEgg = wonNow && creature && (creature.tier === 'common' || creature.tier === 'rare')
      ? createArenaRewardEgg({
          islandNumber: options.islandNumber,
          cycleIndex: current.cycleIndex,
          creatureId: creature.id,
          creatureTier: creature.tier,
          grantedAtMs,
        })
      : null;
    const rewardAlreadyBanked = candidateEgg
      ? current.eggRewardInventory.some((entry) => entry.eggRewardId === candidateEgg.eggRewardId)
      : false;
    const rewardEgg = candidateEgg && !rewardAlreadyBanked ? candidateEgg : null;
    const standardBossReward = wonNow && !bossWasAlreadyResolved
      ? getIslandRunBossReward(options.islandNumber)
      : null;
    const next: IslandRunGameStateRecord = {
      ...current,
      bossTrialResolvedIslandNumber: wonNow ? options.islandNumber : current.bossTrialResolvedIslandNumber,
      eggRewardInventory: rewardEgg ? [...current.eggRewardInventory, rewardEgg] : current.eggRewardInventory,
      dicePool: current.dicePool + (standardBossReward?.dice ?? 0),
      essence: current.essence + (standardBossReward?.essence ?? 0),
      essenceLifetimeEarned: current.essenceLifetimeEarned + (standardBossReward?.essence ?? 0),
      spinTokens: current.spinTokens + (standardBossReward?.spinTokens ?? 0),
      bossState: { ...current.bossState, arenaBattle: resolution.state },
      runtimeVersion: current.runtimeVersion + 1,
    };
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      record: next,
      triggerSource: wonNow ? 'creature_arena_victory' : 'creature_arena_turn',
    });
    return {
      status: 'resolved',
      record: next,
      battle: resolution.state,
      events: resolution.events,
      rejection: null,
      rewardEgg,
      standardBossReward,
    };
  });
}
