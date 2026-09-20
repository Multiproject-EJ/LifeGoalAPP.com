import { eventGamePlaysAvailable, spendEventGamePlay } from './eventGameTicketEconomy';
import { createMinerObserver, type MinerObserver, type MinerObservation } from './crystalMinersTelemetry';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot, subscribeIslandRunState } from './islandRunStateStore';
import { recordEventMinigameCompletion } from './islandRunEventEngine';
import { ISLAND_RUN_ECONOMY_SOURCES, recordIslandRunDiceInflow } from './islandRunEconomyTelemetry';
import { mergeMinerToolGroup, MINER_GROUP_MERGE_LEVEL, upgradeMinerForge, MINER_FORGE_UNLOCKS, discardMinerTool, openMinerGift, claimWaitingMinerGift, arrangeMinerTools, buyMinerTool, createCrystalMinersProgress, getCrystalMinersCareer, settleMinerDig, simulateMinerDig,
  MINER_EVENT_MILESTONES, MINER_LEVEL_COUNT, sanitizeCrystalMinersProgressByEvent, resolveMinerMilestoneReward, type MinerEventTrack, type CrystalMinersProgress, type MinerCommand, type MinerSimulation } from './crystalMinersGame';

const EMPTY_PROGRESS = createCrystalMinersProgress();
export interface MinerActionResult { ok: boolean; failureReason?: string; simulation?: MinerSimulation; rewardLabel?: string; syncPending?: boolean }
export interface CrystalMinersBridge {
  observe: (stage: MinerObservation) => void;
  reportError: (error: unknown, operation: string) => void;
  subscribe: (listener: () => void) => () => void;
  getProgress: () => CrystalMinersProgress;
  getTickets: () => number;
  getDice: () => number;
  getExpiresAt: () => number;
  getEventTrack: () => MinerEventTrack;
  act: (command: MinerCommand, revision: number) => Promise<MinerActionResult>;
}

/** Revision is a compare-and-set token: retries/double taps cannot buy or dig twice. */
export function applyCrystalMinersAction(options: {
  session: Session; client: SupabaseClient | null; eventId: string;
  command: MinerCommand; expectedRevision: number; nowMs?: number; observer?: MinerObserver;
}): Promise<MinerActionResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const startedAt=Date.now();
    const reject=(failureReason:string):MinerActionResult=>{options.observer?.rejected(options.command,failureReason);return {ok:false,failureReason};};
    const current = getIslandRunStateSnapshot(options.session);
    const event = current.activeTimedEvent;
    const nowMs = options.nowMs ?? Date.now();
    if (!event || event.eventId !== options.eventId || event.expiresAtMs <= nowMs) return reject('event_expired');
    const career = getCrystalMinersCareer(current.crystalMinersProgressByEvent) ?? EMPTY_PROGRESS;
    // The forty-cavern campaign and its once-only prizes follow the permanent career.
    const progress = sanitizeCrystalMinersProgressByEvent({ career }).career;
    if (!progress) return reject('invalid_save');
    if (options.expectedRevision !== progress.revision) return reject('stale_action');
    const tickets = current.minigameTicketsByEvent[options.eventId] ?? 0;
    let nextProgress: CrystalMinersProgress | null = null;
    let simulation: MinerSimulation | undefined;
    let playSpend: ReturnType<typeof spendEventGamePlay> = null;
    let rewardState = null;
    let milestoneReward: typeof MINER_EVENT_MILESTONES[number] | undefined;
    switch (options.command.kind) {
      case 'merge_group':
        if(progress.level<MINER_GROUP_MERGE_LEVEL)return reject('group_merge_locked');
        nextProgress=mergeMinerToolGroup(progress,options.command.tier);
        if(!nextProgress)return reject('no_merge_pairs');
        break;
      case 'claim': {
        const target = options.command.milestone;
        milestoneReward = MINER_EVENT_MILESTONES.find(m => m.levels === target);
        if (!milestoneReward || progress.eventTrack.levelsCleared < target) return reject('milestone_locked');
        if (progress.eventTrack.claimedMilestones.includes(target)) return reject('already_claimed');
        nextProgress = { ...progress, ore: progress.ore,
          eventTrack: { ...progress.eventTrack, claimedMilestones: [...progress.eventTrack.claimedMilestones, target] } };
        break;
      }
      case 'upgrade':
        nextProgress = upgradeMinerForge(progress);
        if (!nextProgress) return reject(progress.forgeLevel >= MINER_FORGE_UNLOCKS.length ? 'forge_max' : progress.level < MINER_FORGE_UNLOCKS[progress.forgeLevel] ? 'forge_locked' : 'insufficient_ore');
        break;
      case 'trash':
        nextProgress = discardMinerTool(progress, options.command.slot);
        if (!nextProgress) return reject(progress.tools.filter(Boolean).length <= 1 ? 'last_tool' : 'invalid_tool');
        break;
      case 'open':
        nextProgress = openMinerGift(progress, options.command.slot, Math.random());
        break;
      case 'gift':
        nextProgress = claimWaitingMinerGift(progress);
        break;
      case 'buy':
        nextProgress = buyMinerTool(progress);
        if (!nextProgress) return reject(progress.tools.includes(0) ? 'insufficient_ore' : 'deck_full');
        break;
      case 'move':
        nextProgress = arrangeMinerTools(progress, options.command.from, options.command.to);
        if (!nextProgress) return reject('invalid_move');
        break;
      case 'dig':
        if (progress.eventTrack.levelsCleared >= MINER_LEVEL_COUNT) return reject('campaign_complete');
        if (!progress.tools.some(t => t > 0)) return reject('open_gifts_first');
        playSpend=spendEventGamePlay('crystal_miners',tickets,progress.dropTickets);
        if (!playSpend) return reject('insufficient_tickets');
        simulation = simulateMinerDig(progress);
        nextProgress = {...settleMinerDig(progress, simulation), dropTickets:playSpend.savedPlays+simulation.ticketDrops};
        if (simulation.broken > 0) rewardState = recordEventMinigameCompletion({ state: current, minigameId: 'crystal_miners', nowMs });
        nextProgress.lastReceipt!.rewardProgress = Math.max(0, (rewardState?.rewardBarProgress ?? current.rewardBarProgress) - current.rewardBarProgress);
        break;
    }
    if (!nextProgress) return reject('invalid_action');
    const milestones = milestoneReward ? [milestoneReward] : simulation ? MINER_EVENT_MILESTONES.filter(m=>nextProgress!.eventTrack.levelsCleared>=m.levels && !nextProgress!.eventTrack.claimedMilestones.includes(m.levels)) : [];
    const prizes = milestones.map(m=>resolveMinerMilestoneReward(m,options.session.user.id));
    const prize = prizes.reduce((total,p)=>({dice:total.dice+p.dice,essence:total.essence+p.essence,tickets:total.tickets+p.tickets}),{dice:0,essence:0,tickets:0});
    if (simulation) {
      nextProgress.eventTrack = {...nextProgress.eventTrack,claimedMilestones:[...nextProgress.eventTrack.claimedMilestones,...milestones.map(m=>m.levels)]};
      nextProgress.lastReceipt!.milestoneRewards = prizes.map(p=>p.label);
    }
    nextProgress.dropTickets += prize.tickets;
    const next = { ...current, ...(rewardState ?? {}), runtimeVersion: current.runtimeVersion + 1,
      dicePool: current.dicePool + (prize?.dice ?? 0),
      essence: current.essence + (prize?.essence ?? 0),
      essenceLifetimeEarned: current.essenceLifetimeEarned + (prize?.essence ?? 0),
      minigameTicketsByEvent: playSpend?.ticketsSpent ? { ...current.minigameTicketsByEvent, [options.eventId]: tickets - playSpend.ticketsSpent } : current.minigameTicketsByEvent,
      crystalMinersProgressByEvent: { ...current.crystalMinersProgressByEvent,
        [options.eventId]: { ...nextProgress, revision: progress.revision + 1, updatedAtMs: nowMs } } };
    // Publish and persist one record containing the spend, damage, ore and reward. Closing cannot interrupt settlement.
    const persistence=await commitIslandRunState({ session: options.session, client: options.client, record: next, triggerSource: `crystal_miners_${options.command.kind}` });
    if (prize.dice > 0) recordIslandRunDiceInflow({ source: ISLAND_RUN_ECONOMY_SOURCES.crystalMinersMilestoneDice, amount: prize.dice, sessionId: options.session.user.id, metadata: { eventId: options.eventId, levels: milestones.map(m=>m.levels).join(',') } });
    options.observer?.accepted(options.command,progress,next.crystalMinersProgressByEvent[options.eventId],simulation,Date.now()-startedAt,!persistence.ok);
    return { ok: true, simulation, syncPending:!persistence.ok, rewardLabel: options.command.kind === 'claim' ? prizes[0]?.label : undefined };
  }).catch(error=>{options.observer?.failure(error,options.command.kind);throw error;});
}

/** Read bridge always returns canonical snapshots, never a renderer-owned gameplay mirror. */
export function createCrystalMinersBridge(options: { session: Session; client: SupabaseClient | null; eventId: string }): CrystalMinersBridge {
  const observer=createMinerObserver({userId:options.session.user.id,eventId:options.eventId,remoteEnabled:Boolean(options.client),context:()=>{const state=getIslandRunStateSnapshot(options.session);return {progress:getCrystalMinersCareer(state.crystalMinersProgressByEvent)??EMPTY_PROGRESS,tickets:eventGamePlaysAvailable('crystal_miners',state.minigameTicketsByEvent[options.eventId]??0,getCrystalMinersCareer(state.crystalMinersProgressByEvent)?.dropTickets??0),dice:state.dicePool,island:state.currentIslandNumber};}});
  return {
    observe: observer.observe,
    reportError: observer.failure,
    subscribe: listener => subscribeIslandRunState(options.session, listener),
    getProgress: () => getCrystalMinersCareer(getIslandRunStateSnapshot(options.session).crystalMinersProgressByEvent) ?? EMPTY_PROGRESS,
    getDice: () => getIslandRunStateSnapshot(options.session).dicePool,
    getTickets: () => {const state=getIslandRunStateSnapshot(options.session);return eventGamePlaysAvailable('crystal_miners',state.minigameTicketsByEvent[options.eventId]??0,getCrystalMinersCareer(state.crystalMinersProgressByEvent)?.dropTickets??0);},
    getEventTrack: () => (getCrystalMinersCareer(getIslandRunStateSnapshot(options.session).crystalMinersProgressByEvent) ?? EMPTY_PROGRESS).eventTrack,
    getExpiresAt: () => {
      const event = getIslandRunStateSnapshot(options.session).activeTimedEvent;
      return event?.eventId === options.eventId ? event.expiresAtMs : 0;
    },
    act: (command, expectedRevision) => applyCrystalMinersAction({ ...options, command, expectedRevision, observer }),
  };
}
