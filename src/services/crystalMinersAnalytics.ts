import type { RecentTelemetryEventRow } from './adminTelemetry';
export interface MinerLevelMetrics {level:number;attempts:number;clears:number;ore:number;chests:number;forge:number;highestTier:number;prepOre:number;dryDrops:number;}
/** Interpret only versioned attempt summaries; lifecycle/blocked/error events cannot inflate play counts. */
export function summarizeMinerTelemetry(events: RecentTelemetryEventRow[], filter?:{balanceVersion?:string;layoutVersion?:number}) {
  const levels=new Map<number,MinerLevelMetrics>();const seen=new Set<string>();const errors=new Map<string,number>();let blocked=0,returns=0,offers=0;
  for(const row of events){
    const m=row.metadata??{};if(m.game_id!=='crystal_miners')continue;if(filter?.balanceVersion&&m.balance_version!==filter.balanceVersion)continue;if(filter?.layoutVersion&&m.layout_version!==filter.layoutVersion)continue;
    if(m.stage==='crystal_miners_ticket_pause'||(m.stage==='crystal_miners_blocked'&&m.reason==='insufficient_tickets'))blocked++;
    if(m.stage==='crystal_miners_resources_earn')returns++;
    if(m.stage==='crystal_miners_resources_tickets'||m.stage==='crystal_miners_resources_shop')offers++;
    if(m.stage==='crystal_miners_error'||m.stage==='crystal_miners_sync_pending'){const key=String(m.operation??'unknown')+': '+String(m.error_name??'sync pending');errors.set(key,(errors.get(key)??0)+1);}
    if(m.stage!=='crystal_miners_attempt'||m.schema_version!==1)continue;
    const key=row.user_id+':'+String(m.attempt_id??row.id);if(seen.has(key))continue;seen.add(key);
    const n=(k:string)=>typeof m[k]==='number'&&Number.isFinite(m[k])?Math.max(0,m[k] as number):0;
    const level=n('level');if(level<1||level>40)continue;
    const entry=levels.get(level)??{level,attempts:0,clears:0,ore:0,chests:0,forge:0,highestTier:0,prepOre:0,dryDrops:0};
    entry.prepOre+=n('prep_ore_spent');entry.dryDrops+=n('ore_gained')===0?1:0;entry.attempts++;entry.clears+=m.outcome==='cleared'?1:0;entry.ore+=n('ore_gained');entry.chests+=n('new_chests');entry.forge+=n('forge_before');entry.highestTier+=n('highest_tier');levels.set(level,entry);
  }
  return {levels:[...levels.values()].sort((a,b)=>a.level-b.level),blocked,returns,offers,errors:[...errors].map(([reason,count])=>({reason,count}))};
}
