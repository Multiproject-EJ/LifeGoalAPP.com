import { EVENT_GAME_PLAYS_PER_TICKET } from './eventGameTicketEconomy';
import { recordTelemetryEvent } from '../../../../services/telemetry';
import { logIslandRunEntryDebug } from './islandRunEntryDebug';
import { getMinerReadiness, minerBuyTier, minerChestsRequired, type CrystalMinersProgress, type MinerCommand, type MinerSimulation } from './crystalMinersGame';

export const CRYSTAL_MINERS_BALANCE_VERSION = '2026-09-19.4';
export type MinerTelemetryRecord = { stage: string; dedupeKey: string; metadata: Record<string, string | number | boolean | number[]> };
export type MinerObservation = 'opened' | 'closed' | 'result_shown' | 'prepared_again' | 'resources_earn' | 'resources_tickets' | 'resources_shop' | 'tail_accelerated';
export interface MinerObserver {
  observe(stage: MinerObservation): void;
  accepted(command: MinerCommand, before: CrystalMinersProgress, after: CrystalMinersProgress, simulation: MinerSimulation | undefined, durationMs: number, syncPending: boolean): void;
  rejected(command: MinerCommand, reason: string): void;
  failure(error: unknown, operation: string): void;
}
function fingerprint(value: string): string { let n=2166136261; for(const c of value)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0; return n.toString(16); }
/** Only error class, fingerprint and source locations leave the device; no raw message, URL, token or player text. */
export function minerErrorDetails(error: unknown) {
  const name=error instanceof Error && ['Error','TypeError','RangeError','ReferenceError','SyntaxError'].includes(error.name)?error.name:'Error';
  const stack=error instanceof Error?error.stack??'':'';
  const locations=(stack.match(/[A-Za-z0-9_.-]+\.(?:tsx?|jsx?):\d+:\d+/g)??[]).slice(0,5).join('|');
  return {error_name:name,error_fingerprint:fingerprint(name+stack),error_locations:locations};
}
/** Aggregate preparation locally. Emit one compact attempt summary, never per frame or collision. */
export function createMinerObserver(options: {
  userId: string; eventId: string; remoteEnabled: boolean;
  context: ()=>{ progress: CrystalMinersProgress; tickets: number; dice: number; island: number };
  emit?: (record: MinerTelemetryRecord)=>void;
}): MinerObserver {
  const playId=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const openedAt=Date.now(); let prep:Record<string,number>={}; const seen=new Set<string>();
  const emit=(stage:string,data:MinerTelemetryRecord['metadata']={},key?:string)=>{
    try {
      const c=options.context(); const p=c.progress;
      const dedupeKey=key??`cm:${playId}:${stage}:${p.revision}`;
      if(seen.has(dedupeKey))return;
      // Session diagnostics are bounded even during unusually long play.
      if(seen.size>=256)seen.delete(seen.values().next().value!); seen.add(dedupeKey);
      const metadata={schema_version:1,game_id:'crystal_miners',balance_version:CRYSTAL_MINERS_BALANCE_VERSION,stage:`crystal_miners_${stage}`,play_id:playId,event_id:options.eventId,event_type:options.eventId.split(':')[0],island_number:c.island,level:p.level,career_revision:p.revision,total_digs:p.digs,tickets:c.tickets,dice:c.dice,ore:p.ore,forge_level:p.forgeLevel,elapsed_ms:Date.now()-openedAt,...data};
      const record={stage:metadata.stage,dedupeKey,metadata};
      if(options.emit){options.emit(record);return;}
      logIslandRunEntryDebug(record.stage,metadata);
      if(options.remoteEnabled)void recordTelemetryEvent({userId:options.userId,eventType:'island_run_gameplay_event',metadata,dedupeKey}).catch(()=>{});
    } catch { /* Reporting must never interrupt a committed game action. */ }
  };
  return {
    observe(stage){try{emit(stage,{...prep});if(stage==='opened'&&options.context().tickets<1)emit('ticket_pause',{source:'entry'});}catch{/* Diagnostics cannot interrupt play. */}},
    accepted(command,before,after,simulation,durationMs,syncPending){
      if(command.kind!=='dig'){
        prep[`prep_${command.kind}`]=(prep[`prep_${command.kind}`]??0)+1;
        prep.prep_ore_spent=(prep.prep_ore_spent??0)+Math.max(0,before.ore-after.ore);
        if(command.kind==='open'){const key=`gift_tier_${after.tools[command.slot]}`;prep[key]=(prep[key]??0)+1;if(before.superGiftSlots.includes(command.slot))prep.super_gifts_opened=(prep.super_gifts_opened??0)+1;}
        if(command.kind==='merge_group')prep.prep_merge=(prep.prep_merge??0)+Math.floor(before.tools.filter(t=>t===command.tier).length/2);
        if(command.kind==='move'&&before.tools[command.from]===before.tools[command.to])prep.prep_merge=(prep.prep_merge??0)+1;
      }
      if(simulation){
        const readiness=getMinerReadiness(before);
        emit('attempt',{...prep,ticket_cost:1,ticket_unit:'drop',drops_per_event_ticket:EVENT_GAME_PLAYS_PER_TICKET.crystal_miners,event_tickets_spent:before.dropTickets>0?0:1,saved_drop_tickets:after.dropTickets,level:before.level,next_level:after.level,attempt_id:`${options.eventId}:${after.revision}`,outcome:simulation.cleared?'cleared':'retry',level_kind:before.level%10===0?'boss_rewards':minerChestsRequired(before.level)===2?'hard_approach':'normal',buy_tier:minerBuyTier(before.level),highest_tier:Math.max(0,...before.tools),tool_count:before.tools.filter(t=>t>0).length,lane_power:readiness.lanePower,ready_lanes:readiness.readyLanes,chests_required:minerChestsRequired(before.level),chests_reached:simulation.blocks.filter(b=>b.kind==='treasure'&&b.hp===0).length,new_chests:simulation.treasures,blocks_broken:simulation.broken,ore_gained:simulation.ore,gifts_gained:simulation.gifts,drop_tickets_gained:simulation.ticketDrops,spawned_tools:simulation.spawnedTools,boss_shots:simulation.bossShots,boss_tools_destroyed:simulation.bossDestroyed,score:simulation.score,depth:simulation.depth,ore_before:before.ore,forge_before:before.forgeLevel,guardian_hp_remaining:simulation.blocks.find(b=>b.kind==='boss')?.hp??0,action_ms:Math.max(0,durationMs),simulation_ms:(simulation.frames[simulation.frames.length-1]?.step??0)/60*1000,sync_pending:syncPending,milestones_claimed:after.eventTrack.claimedMilestones.filter(n=>!before.eventTrack.claimedMilestones.includes(n))},`cm:attempt:${options.eventId}:${after.revision}`);
        prep={};
        try{if(options.context().tickets<1)emit('ticket_pause',{source:'after_drop'});}catch{/* Diagnostics cannot interrupt a committed drop. */}
      } else if(command.kind==='upgrade'||command.kind==='claim')emit(command.kind,{ore_spent:before.ore-after.ore,sync_pending:syncPending},`cm:${command.kind}:${options.eventId}:${after.revision}`);
      if(syncPending)emit('sync_pending',{operation:command.kind},`cm:sync:${options.eventId}:${after.revision}`);
    },
    rejected(command,reason){if(reason==='invalid_save')emit('error',{operation:command.kind,error_name:'InvalidSavedWorkshop',error_code:'CM_INVALID_SAVE'});try{emit('blocked',{operation:command.kind,reason},`cm:blocked:${playId}:${options.context().progress.revision}:${command.kind}:${reason}`);}catch{/* Diagnostics cannot interrupt rejection handling. */}},
    failure(error,operation){emit('error',{operation,...minerErrorDetails(error)});},
  };
}
