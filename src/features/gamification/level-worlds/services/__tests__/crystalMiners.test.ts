import { eventGamePlaysAvailable, eventGamePackPlays, spendEventGamePlay } from '../eventGameTicketEconomy';
import { createMinerObserver, minerErrorDetails, type MinerTelemetryRecord } from '../crystalMinersTelemetry';
import { summarizeMinerTelemetry } from '../../../../../services/crystalMinersAnalytics';
import { ARENA_GAME_CATALOG } from '../islandRunArenaCatalog';
import { resolveIslandEventGridSlots } from '../journeyDiscArenaIslandIntegration';
import { createMinerReplayCamera } from '../crystalMinersReplay';
import type { Session } from '@supabase/supabase-js';
import { minerGiftRarityRoll, MINER_FORGE_UNLOCKS, rollMinerGiftTier, MINER_MAX_TIER, upgradeMinerForge, minerForgeCost, getMinerReadiness, discardMinerTool, arrangeMinerTools, buyMinerTool, createCrystalMinersProgress, createMinerBlocks, openMinerGift, minerBuyCost, simulateMinerDig, settleMinerDig, sanitizeCrystalMinersProgressByEvent, mergeCrystalMinersProgressByEvent, MINER_MAX_STEPS, MINER_EVENT_MILESTONES, resolveMinerMilestoneReward, minerRecommendedTier, minerBuyTier, isMinerRewardCavern, minerChestsRequired, MINER_CHEST_REWARDS } from '../crystalMinersGame';
import { applyCrystalMinersAction, createCrystalMinersBridge } from '../islandRunCrystalMinersActions';
import { getCrystalMinersCareer } from '../crystalMinersGame';
import { applyTimedEventTicketTileGrant, resolveIslandRunTravelState } from '../islandRunStateActions';
import { readIslandRunGameStateRecord, resetIslandRunRuntimeCommitCoordinatorForTests, resolveIslandRunRecordForConflict, writeIslandRunGameStateRecord } from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, refreshIslandRunStateFromLocal, getIslandRunStateSnapshot } from '../islandRunStateStore';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import { resolveEventMinigameCompletionId, shouldResolveEventArenaStopOnMinigameComplete } from '../islandRunMinigameLauncherService';
import { assert, assertEqual, assertDeepEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';
const session = { user: { id:'crystal-miners-test', user_metadata:{} } } as Session;
const eventId='space_excavator:100';
async function seed(tickets=3) {
  resetIslandRunRuntimeCommitCoordinatorForTests(); __resetIslandRunStateStoreForTests(); __resetIslandRunActionMutexesForTests();
  installWindowWithStorage(createMemoryStorage());
  const base=readIslandRunGameStateRecord(session);
  await writeIslandRunGameStateRecord({session,client:null,record:{...base,
    activeTimedEvent:{eventId,eventType:'space_excavator',startedAtMs:100,expiresAtMs:100000,version:1},
    rewardBarBoundEventId:eventId,minigameTicketsByEvent:{[eventId]:tickets}}});
  refreshIslandRunStateFromLocal(session);
}
const action = (command: Parameters<typeof applyCrystalMinersAction>[0]['command'], expectedRevision=0, nowMs=500) => applyCrystalMinersAction({session,client:null,eventId,command,expectedRevision,nowMs});
export const crystalMinersTests: TestCase[] = [
  {name:'game-specific funding quantities apply equally to earned and purchased event tickets',run:()=>{
    assertEqual(eventGamePlaysAvailable('crystal_miners',2),6,'two earned tickets fund six drops');
    assertEqual(eventGamePackPlays('crystal_miners',10),30,'ten-ticket paid pack funds thirty drops');
    assertEqual(eventGamePackPlays('space_excavator',10),10,'other game quantities preserved');
    assertDeepEqual(spendEventGamePlay('crystal_miners',1,0),{ticketsSpent:1,savedPlays:2},'one budget unit funds three distinct drops');
    assertEqual(spendEventGamePlay('crystal_miners',NaN,0),null,'invalid balances cannot fund plays');
  }},
  {name:'funded drop remainder survives reload and cannot spend the shared budget twice',run:async()=>{
    await seed(1);
    assert((await action({kind:'dig'})).ok,'first drop funded');
    assertEqual(getIslandRunStateSnapshot(session).minigameTicketsByEvent[eventId],0,'shared ticket consumed once');
    assertEqual(getCrystalMinersCareer(getIslandRunStateSnapshot(session).crystalMinersProgressByEvent)!.dropTickets,2,'two drops saved');
    __resetIslandRunStateStoreForTests();refreshIslandRunStateFromLocal(session);
    const results=await Promise.all([action({kind:'dig'},1),action({kind:'dig'},1)]);
    assertEqual(results.filter(r=>r.ok).length,1,'one concurrent drop accepted');
    assertEqual(getCrystalMinersCareer(getIslandRunStateSnapshot(session).crystalMinersProgressByEvent)!.dropTickets,1,'only one saved drop consumed');
    assert((await action({kind:'dig'},2)).ok,'last funded drop works without shared tickets');
    assertEqual((await action({kind:'dig'},3)).failureReason,'insufficient_tickets','fourth drop requires more earning');
  }},

  {name:'reward-bar grid includes Crystal Miners once with its own image icon',run:()=>{
    const exhibitions=ARENA_GAME_CATALOG.filter(g=>g.availability==='exhibition').map(g=>({gameId:g.id,displayName:g.displayName,icon:g.iconSrc??g.icon}));
    for(const replaces of [false,true]){const slots=resolveIslandEventGridSlots({templates:[],exhibitions,activeEventType:null,journeyDiscReplacesTimedEvent:replaces});const miners=slots.filter(s=>s.kind==='exhibition'&&s.gameId==='crystal_miners');assertEqual(miners.length,1,'registered once, including chapter replacement grids');assert(miners[0].kind==='exhibition'&&miners[0].icon.endsWith('/crystal-miners/icon.svg'),'uses dedicated icon asset');}
  }},
  {name:'canonical attempt emits one bounded summary after settlement, aggregating preparation and duplicate blocks',run:async()=>{
    await seed();const rows:MinerTelemetryRecord[]=[];
    const context=()=>{const state=getIslandRunStateSnapshot(session);return {progress:getCrystalMinersCareer(state.crystalMinersProgressByEvent)??createCrystalMinersProgress(),tickets:eventGamePlaysAvailable('crystal_miners',state.minigameTicketsByEvent[eventId]??0,getCrystalMinersCareer(state.crystalMinersProgressByEvent)?.dropTickets??0),dice:state.dicePool,island:state.currentIslandNumber};};
    const observer=createMinerObserver({userId:session.user.id,eventId,remoteEnabled:false,context,emit:r=>rows.push(r)});
    const run=(command:Parameters<typeof action>[0],expectedRevision=context().progress.revision)=>applyCrystalMinersAction({session,client:null,eventId,command,expectedRevision,nowMs:500,observer});
    observer.observe('opened');observer.observe('opened');await run({kind:'open',slot:0});await run({kind:'buy'});await run({kind:'move',from:5,to:6});assertEqual(rows.length,1,'preparation emits no per-click cloud traffic');
    const rev=context().progress.revision;await run({kind:'dig'});await run({kind:'dig'},rev);await run({kind:'dig'},rev);
    const attempts=rows.filter(r=>r.stage==='crystal_miners_attempt');assertEqual(attempts.length,1,'one accepted attempt');assertEqual(rows.filter(r=>r.stage==='crystal_miners_blocked').length,1,'duplicate rejection coalesces');
    const m=attempts[0].metadata;assertEqual(m.prep_buy,1,'buy count');assertEqual(m.prep_merge,1,'merge count');assertEqual(m.prep_open,1,'gift count');assertEqual(m.tickets,8,'post-spend drop wallet');assertEqual(m.career_revision,context().progress.revision,'committed revision');assertEqual(m.level,1,'attempt level before advance');assertEqual(m.ticket_cost,1,'transparent cost');assert(Array.isArray(m.lane_power)&&m.lane_power.length===5,'five lane strength values');
  }},
  {name:'ticket exhaustion is observed even when the empty-wallet Drop button is disabled',run:()=>{
    const rows:MinerTelemetryRecord[]=[];const p=createCrystalMinersProgress();const observer=createMinerObserver({userId:'test',eventId,remoteEnabled:false,context:()=>({progress:p,tickets:0,dice:0,island:2}),emit:r=>rows.push(r)});
    observer.observe('opened');observer.observe('opened');assertEqual(rows.filter(r=>r.stage==='crystal_miners_ticket_pause').length,1,'one real empty-wallet entry pause');
  }},
  {name:'mining error reports redact raw messages and reporting failures never interrupt observation',run:()=>{
    const error=new TypeError('secret-token private-email@example.test');error.stack='TypeError: secret-token\n at action (https://private.example/app.tsx:42:3?token=private)';
    const details=minerErrorDetails(error);const json=JSON.stringify(details);assert(!json.includes('secret-token')&&!json.includes('private-email')&&!json.includes('private.example'),'no secrets, message or URL');assertEqual(details.error_locations,'app.tsx:42:3','source location retained');
    const p=createCrystalMinersProgress();const observer=createMinerObserver({userId:'test',eventId,remoteEnabled:false,context:()=>({progress:p,tickets:0,dice:0,island:1}),emit:()=>{throw new Error('telemetry down');}});observer.observe('opened');observer.failure(error,'render');
  }},
  {name:'balance analytics separate real attempts, duplicates, ticket shortages and errors',run:()=>{
    const row=(id:string,metadata:Record<string,unknown>)=>({id,user_id:'test',event_type:'island_run_gameplay_event',occurred_at:'2026-09-19T00:00:00Z',metadata:{game_id:'crystal_miners',schema_version:1,...metadata}});
    const a={stage:'crystal_miners_attempt',attempt_id:'one',level:38,outcome:'retry',ore_gained:20,new_chests:1,highest_tier:8,forge_before:4};
    const data=summarizeMinerTelemetry([row('1',a),row('2',a),row('3',{...a,attempt_id:'two',outcome:'cleared'}),row('4',{stage:'crystal_miners_blocked',reason:'insufficient_tickets'}),row('5',{stage:'crystal_miners_error',operation:'dig',error_name:'TypeError'}),row('6',{stage:'crystal_miners_resources_earn'})]);
    assertEqual(data.levels[0].attempts,2,'duplicates excluded');assertEqual(data.levels[0].clears,1,'clear numerator');assertEqual(data.blocked,1,'ticket pause tracked');assertEqual(data.returns,1,'main-loop return tracked');assertEqual(data.errors.length,1,'errors separate');
  }},

  {name:'every course ends in five finish-line chests, including boss and reward levels',run:()=>{
    for(let level=1;level<=40;level++) {
      const chests=createMinerBlocks(level).filter(b=>b.kind==='treasure');
      assertEqual(chests.length,5,'one chest per path');assert(chests.every(b=>Math.floor(b.id/5)===27 && b.hp>0),'all chests are alive in the bottom row');
    }
  }},
  {name:'finishing a cavern automatically banks its once-only prize with the dig',run:async()=>{
    await seed();const current=getIslandRunStateSnapshot(session);const p=createCrystalMinersProgress();p.tools=Array(25).fill(6);p.blocks=p.blocks.map(b=>({...b,hp:b.id===135?1:0}));
    await writeIslandRunGameStateRecord({session,client:null,record:{...current,crystalMinersProgressByEvent:{[eventId]:p}}});refreshIslandRunStateFromLocal(session);
    const results=await Promise.all([action({kind:'dig'}),action({kind:'dig'})]);assertEqual(results.filter(r=>r.ok).length,1,'one duplicate accepted');
    const after=getIslandRunStateSnapshot(session);const progress=after.crystalMinersProgressByEvent[eventId];assertEqual(progress.level,2,'next cavern ready');assertEqual(after.dicePool,current.dicePool+25,'prize automatically banked');assertDeepEqual(progress.eventTrack.claimedMilestones,[1],'claim saved with dig');assertDeepEqual(progress.lastReceipt?.milestoneRewards,['25 dice'],'result presents banked prize');
    __resetIslandRunStateStoreForTests();refreshIslandRunStateFromLocal(session);assertEqual((await action({kind:'claim',milestone:1},1)).failureReason,'already_claimed','no extra claim after reload');assertEqual(getIslandRunStateSnapshot(session).dicePool,after.dicePool,'no extra grant');
  }},
  {name:'new event retains journey and once-only prizes with permanent equipment',run:async()=>{
    await seed();const current=getIslandRunStateSnapshot(session);const p={...createCrystalMinersProgress(),revision:7,level:4,blocks:createMinerBlocks(4),eventTrack:{levelsCleared:3,claimedMilestones:[1]}};
    const newId='skybound_expedition:900';
    await writeIslandRunGameStateRecord({session,client:null,record:{...current,crystalMinersProgressByEvent:{[eventId]:p},activeTimedEvent:{eventId:newId,eventType:'skybound_expedition',startedAtMs:900,expiresAtMs:100000,version:2},minigameTicketsByEvent:{[newId]:3}}});refreshIslandRunStateFromLocal(session);
    const bridge=createCrystalMinersBridge({session,client:null,eventId:newId});assertEqual(bridge.getProgress().level,4,'career cavern retained');assertEqual(bridge.getEventTrack().levelsCleared,3,'journey retained');
    assertEqual((await applyCrystalMinersAction({session,client:null,eventId:newId,command:{kind:'claim',milestone:1},expectedRevision:7,nowMs:1000})).failureReason,'already_claimed','rotation cannot duplicate career prizes');
    await applyCrystalMinersAction({session,client:null,eventId:newId,command:{kind:'open',slot:0},expectedRevision:7,nowMs:1000});
    assertEqual(bridge.getEventTrack().levelsCleared,3,'first new-event action keeps journey');assertDeepEqual(getIslandRunStateSnapshot(session).crystalMinersProgressByEvent[eventId].eventTrack.claimedMilestones,[1],'old claim history retained');
  }},
  {name:'legacy workshop saves gain an empty reward track without losing upgrades',run:()=>{
    const p=createCrystalMinersProgress();const {eventTrack,...legacy}=p;
    const restored=sanitizeCrystalMinersProgressByEvent({[eventId]:legacy})[eventId];assertDeepEqual(restored.tools,p.tools,'tools intact');assertDeepEqual(restored.eventTrack,{levelsCleared:0,claimedMilestones:[]},'compatible default');
    const bad={...p,eventTrack:{levelsCleared:1,claimedMilestones:[1,1,3,999]}};assertDeepEqual(sanitizeCrystalMinersProgressByEvent({[eventId]:bad})[eventId].eventTrack.claimedMilestones,[1],'invalid/future claim ids rejected');
  }},
  {name:'permanent workshop survives actual island travel and multiple event rotations',run:async()=>{
    await seed(); await action({kind:'move',from:5,to:6}); await action({kind:'buy'},1); await action({kind:'dig'},2);
    const before=getIslandRunStateSnapshot(session);const career=getCrystalMinersCareer(before.crystalMinersProgressByEvent)!;
    const travelled=resolveIslandRunTravelState({current:before,nextIsland:2,startTimer:true,nowMs:600,getIslandDurationMs:()=>86400000,islandRunContractV2Enabled:true}).record;
    assertDeepEqual(getCrystalMinersCareer(travelled.crystalMinersProgressByEvent),career,'canonical travel preserves entire investment');
    const nextEvent='companion_feast:700';
    await writeIslandRunGameStateRecord({session,client:null,record:{...travelled,activeTimedEvent:{eventId:nextEvent,eventType:'companion_feast',startedAtMs:700,expiresAtMs:200000,version:2},rewardBarBoundEventId:nextEvent,rewardBarProgress:0,minigameTicketsByEvent:{...travelled.minigameTicketsByEvent,[nextEvent]:4}}});refreshIslandRunStateFromLocal(session);
    const bridge=createCrystalMinersBridge({session,client:null,eventId:nextEvent});
    assertDeepEqual(bridge.getProgress(),career,'new event opens the same career without re-seeding');
    const dig=await applyCrystalMinersAction({session,client:null,eventId:nextEvent,command:{kind:'dig'},expectedRevision:career.revision,nowMs:800});assert(dig.ok,'new event dig works');
    const after=getIslandRunStateSnapshot(session);assertEqual(after.minigameTicketsByEvent[nextEvent],4,'saved funded drop used before another event ticket');assertEqual(after.minigameTicketsByEvent[eventId],2,'old bucket untouched');
    assertEqual(bridge.getProgress().tools[6],2,'merged tool retained');assertEqual(bridge.getProgress().bought,1,'purchase investment retained');assertEqual(bridge.getProgress().digs,2,'career continues');assert(after.rewardBarProgress>0,'new reward bar credited');
    assertEqual((await action({kind:'dig'},bridge.getProgress().revision,900)).failureReason,'event_expired','stale window cannot spend new tickets');
    __resetIslandRunStateStoreForTests();refreshIslandRunStateFromLocal(session);assertDeepEqual(bridge.getProgress(),getCrystalMinersCareer(after.crystalMinersProgressByEvent),'cross-event career survives reload');
  }},
  {name:'checkpoint pruning always retains newest workshop even under an old event key',run:()=>{
    const p=createCrystalMinersProgress();const checkpoints=Object.fromEntries(Array.from({length:40},(_,i)=>[`event:${i}`,{...p,revision:i,updatedAtMs:i}]));
    checkpoints['event:0']={...p,revision:100,ore:1,updatedAtMs:100};
    const saved=sanitizeCrystalMinersProgressByEvent(checkpoints);assertEqual(Object.keys(saved).length,32,'bounded archive');assertEqual(getCrystalMinersCareer(saved)?.ore,1,'newest spend never lost');
  }},
  {name:'opening gifts is deterministic and never destroys another slot',run:()=>{
    const p=createCrystalMinersProgress();const opened=openMinerGift(p,2)!;assertEqual(opened.tools[2],2,'gift reveals tier');assertEqual(opened.ore,p.ore,'opening costs no ore');assertEqual(openMinerGift(opened,2),null,'cannot open twice');assertEqual(arrangeMinerTools(p,0,1),null,'unopened gifts do not merge');
  }},
  {name:'boss cavern includes one full-width guardian ahead of treasure',run:()=>{
    const blocks=createMinerBlocks(10);assertEqual(blocks.filter(b=>b.kind === 'boss').length,1,'one guardian');
    const boss=blocks.find(b=>b.kind === 'boss')!;assert(boss.id < blocks.find(b=>b.kind === 'treasure')!.id,'boss above treasure');
    const p={...createCrystalMinersProgress(),level:10,blocks,tools:[...Array(25).fill(8)]};const sim=simulateMinerDig(p,false);
    assertEqual(sim.blocks[boss.id].hp,0,'powerful team defeats guardian');assert(sim.treasures>0,'treasure behind guardian accessible');
  }},
  {name:'reward cavern offers soft prizes and freefall in every lane at level ten',run:()=>{
    const blocks=createMinerBlocks(10);assert(!blocks.some(b=>b.hp>0 && ['iron','stone'].includes(b.kind)),'only guardian blocks the reward course');
    for(let col=0;col<5;col++)assert(blocks.filter(b=>b.id%5===col && b.hp>0).length>=6,'every lane rewards coverage');
    const p={...createCrystalMinersProgress(),level:10,blocks,tools:[...Array(10).fill(4),...Array(15).fill(0)]};
    const sim=simulateMinerDig(p,false);assert(sim.broken>=25,'modest distributed tools collect most prizes');assert(sim.gifts>=5,'generous gift haul');assert(sim.treasures>=1,'ordinary tools reach treasure');
    const settled=settleMinerDig(p,sim);assertDeepEqual(settled.tools.slice(0,10),p.tools.slice(0,10),'rewards never consume the upgraded fleet');
  }},
  {name:'all forty levels have the requested reward cadence and a rising difficulty curve',run:()=>{
    const rewardLevels=[];let previousHardness=0;
    for(let level=1;level<=40;level++) {
      const blocks=createMinerBlocks(level);
      if(isMinerRewardCavern(level)) {
        rewardLevels.push(level);assert(blocks.filter(b=>b.hp===0).length>90,'reward course mostly freefall');
        const sim=simulateMinerDig({...createCrystalMinersProgress(),level,blocks:blocks.map(b=>b.kind==='boss'?{...b,hp:0}:b),tools:[...Array(10).fill(2),...Array(15).fill(0)]},false);
        assert(sim.broken>=25 && sim.treasures>=1,'modest tools collect generous rewards even at level forty');
      } else {
        const base=blocks.find(b=>b.kind==='stone' && b.hp>0);
        assert(Boolean(base),'ordinary terrain present');
        // Compare the same material/depth curve, independent of seeded layouts and bosses.
        const normalized=Math.pow(1.13,level-1);assert(normalized>previousHardness,'regular cavern hardness increases');previousHardness=normalized;
      }
    }
    assertDeepEqual(rewardLevels,[10,20,30,40],'exact reward cadence');
    const late={...createCrystalMinersProgress(),level:39,blocks:createMinerBlocks(39)};
    const weak=simulateMinerDig({...late,tools:Array(25).fill(1)},false);
    const strong=simulateMinerDig({...late,tools:Array(25).fill(9)},false);
    assert(strong.broken>weak.broken*3,'upgrades materially improve late-game penetration');assert(strong.depth>weak.depth,'strong fleet gets deeper');
    assert(minerBuyTier(39)>minerBuyTier(1),'shop improves along journey');assert(minerRecommendedTier(39)>minerRecommendedTier(1),'recommended tools rise');
  }},
  {name:'all milestone rewards pay exact main-game balances once, including mystery, tickets and money',run:async()=>{
    await seed(0);const base=getIslandRunStateSnapshot(session);
    const p={...createCrystalMinersProgress(),level:40,blocks:createMinerBlocks(40).map(b=>({...b,hp:0})),eventTrack:{levelsCleared:40,claimedMilestones:[]}};
    await writeIslandRunGameStateRecord({session,client:null,record:{...base,crystalMinersProgressByEvent:{[eventId]:p}}});refreshIslandRunStateFromLocal(session);
    let revision=0;let dice=base.dicePool;let essence=base.essence;let tickets=0;
    for(const milestone of MINER_EVENT_MILESTONES) {
      const reward=resolveMinerMilestoneReward(milestone,session.user.id);
      assert((await action({kind:'claim',milestone:milestone.levels},revision++)).ok,'claim succeeds without entry ticket');
      dice+=reward.dice;essence+=reward.essence;tickets+=reward.tickets;
      const state=getIslandRunStateSnapshot(session);assertEqual(state.dicePool,dice,'exact dice');assertEqual(state.essence,essence,'exact money');assertEqual(state.crystalMinersProgressByEvent[eventId].dropTickets,tickets,'exact game-specific drop tickets');assertEqual(state.minigameTicketsByEvent[eventId]??0,0,'drop rewards cannot be multiplied or spent in other games');
      __resetIslandRunStateStoreForTests();refreshIslandRunStateFromLocal(session);
      assertEqual((await action({kind:'claim',milestone:milestone.levels},revision)).failureReason,'already_claimed','reload does not regrant');
    }
    assertEqual((await action({kind:'dig'},revision)).failureReason,'campaign_complete','no farming after final level');
    assertEqual(getIslandRunStateSnapshot(session).crystalMinersProgressByEvent[eventId].dropTickets,tickets,'completed journey cannot consume tickets');
  }},
  {name:'level forty finishes with its open chests and never creates level forty-one',run:()=>{
    const p={...createCrystalMinersProgress(),level:40,blocks:createMinerBlocks(40),eventTrack:{levelsCleared:39,claimedMilestones:[1,10,15,20,30,35]},tools:Array(25).fill(8)};
    let current=p;
    for(let i=0;i<4 && current.eventTrack.levelsCleared<40;i++)current=settleMinerDig(current,simulateMinerDig(current,false));
    assertEqual(current.eventTrack.levelsCleared,40,'final completion counted');assertEqual(current.level,40,'capped course');assert(current.blocks.filter(b=>b.kind==='treasure').some(b=>b.hp===0),'opened grand vault retained');
    assertDeepEqual(sanitizeCrystalMinersProgressByEvent({done:current}).done,current,'finished journey persists');
  }},
  {name:'old terrain migrates without losing ore, merged tools, or chest damage',run:()=>{
    const old={...createCrystalMinersProgress(),version:1,level:6,ore:999,tools:Array(25).fill(4),blocks:createMinerBlocks(6,1),eventTrack:{levelsCleared:0,claimedMilestones:[]}};
    old.blocks[135].hp=0;
    const migrated=sanitizeCrystalMinersProgressByEvent({old}).old;
    assertEqual(migrated.version,6,'new campaign version');assertEqual(migrated.ore,999,'investment retained');assertDeepEqual(migrated.tools,old.tools,'upgrades retained');assertEqual(migrated.blocks[135].hp,0,'opened chest retained');assertEqual(migrated.eventTrack.levelsCleared,5,'prior levels recognized');
    assertDeepEqual(sanitizeCrystalMinersProgressByEvent({old:migrated}).old,migrated,'migration stable after reload');
  }},
  {name:'normal finish needs one chest; the two hard approaches need two; all paths have distinct prizes',run:()=>{
    for(let level=1;level<=40;level++) {
      const needed=level%10===8 || level%10===9 ? 2 : 1;
      assertEqual(minerChestsRequired(level),needed,'authored chest requirement');
      const p={...createCrystalMinersProgress(),level,tools:Array(25).fill(0),blocks:createMinerBlocks(level).map(b=>({...b,hp:b.kind==='treasure'?1:0}))};
      p.blocks[135].hp=0;assertEqual(simulateMinerDig(p,false).cleared,needed===1,'one chest normal only');
      p.blocks[136].hp=0;assert(simulateMinerDig(p,false).cleared,'two chests pass hard approach');
    }
    assertEqual(new Set(MINER_CHEST_REWARDS.map(r=>r.label)).size,5,'all lane rewards differ');
    for(let col=0;col<5;col++) {
      const p=createCrystalMinersProgress();p.tools=Array(25).fill(0);p.tools[col]=1;p.blocks=p.blocks.map(b=>({...b,hp:b.id===135+col?1:0}));
      const sim=simulateMinerDig(p,false);assertEqual(sim.ore,MINER_CHEST_REWARDS[col].ore,'path pays advertised ore');assertEqual(sim.gifts,MINER_CHEST_REWARDS[col].gifts,'path pays advertised gift');
    }
  }},
  {name:'each tenth-level guardian gates all five lanes before the reward fall',run:()=>{
    for(const level of [10,20,30,40]) {
      const blocks=createMinerBlocks(level);assertEqual(blocks.filter(b=>b.kind==='boss').length,1,'one guardian');
      const p={...createCrystalMinersProgress(),level,blocks,tools:[...Array(5).fill(1),...Array(20).fill(0)]};
      const weak=simulateMinerDig(p,false);assertEqual(weak.treasures,0,'weak tools cannot bypass guardian by outer lanes');assert(!weak.cleared,'live boss prevents clear');
      const strong=simulateMinerDig({...p,tools:Array(25).fill(10)},false);assert(strong.cleared,'strong fleet defeats boss and reaches finish');
    }
    for(const level of [8,9,18,19,28,29,38,39])assert(!createMinerBlocks(level).some(b=>b.kind==='boss'),'approaches are hard terrain, not extra bosses');
  }},
  {name:'a properly upgraded fleet can finish every authored level within eight drops',run:()=>{
    for(let level=1;level<=40;level++) {
      let p: ReturnType<typeof createCrystalMinersProgress>={...createCrystalMinersProgress(),level,blocks:createMinerBlocks(level),eventTrack:{levelsCleared:level-1,claimedMilestones:[]},tools:[...Array(15).fill(Math.min(10,minerRecommendedTier(level)+1)),...Array(10).fill(0)]};
      let cleared=false;
      for(let attempt=0;attempt<8;attempt++) {const sim=simulateMinerDig(p,false);p=settleMinerDig(p,sim);if(sim.cleared){cleared=true;break;}}
      assert(cleared,`level ${level} is reachable with a suitably upgraded fleet`);
    }
  }},
  {name:'version-two saves migrate to five paths without granting unopened new chests',run:()=>{
    const old={...createCrystalMinersProgress(),version:2,level:20,blocks:createMinerBlocks(20,2),eventTrack:{levelsCleared:19,claimedMilestones:[1,10,15]}};
    const saved=sanitizeCrystalMinersProgressByEvent({old}).old;
    assertEqual(saved.blocks.filter(b=>b.kind==='treasure' && b.hp>0).length,5,'all five finish paths begin closed');assertEqual(saved.blocks.filter(b=>b.kind==='boss' && b.hp>0).length,1,'tenth-level guardian present');assertDeepEqual(saved.eventTrack.claimedMilestones,[1,10,15],'already paid claims retained');
  }},
  {name:'ordinary tools hold their chosen lane through every impact and reward',run:()=>{
    const p={...createCrystalMinersProgress(),tools:Array(25).fill(4)};const sim=simulateMinerDig(p);
    for(const frame of sim.frames)for(const body of frame.bodies)assertEqual(body.x,(body.id%5)*60+30,'normal impacts never change lane');
    assert(sim.treasures>=1,'lane control still reaches finish line');
  }},
  {name:'only a rare marked deflector redirects a falling tool',run:()=>{
    const p={...createCrystalMinersProgress(),level:3,blocks:createMinerBlocks(3),tools:Array(25).fill(0)};
    const ramp=p.blocks.find(b=>b.kind==='deflector')!;assert(Boolean(ramp),'authored rare ramp');
    p.blocks=p.blocks.map(b=>({...b,hp:b.kind==='deflector'||b.kind==='treasure'?1:0}));p.tools[ramp.id%5]=4;
    const sim=simulateMinerDig(p);const final=sim.frames[sim.frames.length-1].bodies[0];assertEqual(final.lane,4,'arrow redirects to adjacent lane');assert(Math.abs(final.x-270)<1,'settles in new lane');
    assertEqual(sim.blocks[139].hp,0,'redirected path chest collected');assertEqual(sim.blocks[138].hp,1,'original path chest untouched');
  }},
  {name:'hot-updated older workshops cannot lose tools when the next drop saves new terrain',run:async()=>{
    await seed();const current=getIslandRunStateSnapshot(session);const p={...createCrystalMinersProgress(),version:3,tools:Array(25).fill(5),blocks:createMinerBlocks(1,3)};
    await writeIslandRunGameStateRecord({session,client:null,record:{...current,crystalMinersProgressByEvent:{[eventId]:p as unknown as ReturnType<typeof createCrystalMinersProgress>}}});refreshIslandRunStateFromLocal(session);
    assert((await action({kind:'dig'})).ok,'old workshop accepts new drop');__resetIslandRunStateStoreForTests();refreshIslandRunStateFromLocal(session);
    const saved=getIslandRunStateSnapshot(session).crystalMinersProgressByEvent[eventId];assertEqual(saved.version,6,'current schema saved');assert(saved.tools.every(t=>t===5),'fleet retained after reload');
    const transitional={...saved,version:3};assertDeepEqual(sanitizeCrystalMinersProgressByEvent({transitional}).transitional,saved,'exact current terrain accepted during schema transition');
  }},
  {name:'trash removes only the chosen tool without refunds and protects the last item',run:async()=>{
    const p=createCrystalMinersProgress();const discarded=discardMinerTool(p,5)!;assertEqual(discarded.tools[5],0,'chosen tool removed');assertDeepEqual(discarded.tools.filter(Boolean),p.tools.filter((t,i)=>Boolean(t)&&i!==5),'other items retained');assertEqual(discarded.ore,p.ore,'no refund');assertEqual(discardMinerTool({...p,tools:[1,...Array(24).fill(0)]},0),null,'last item protected');assertEqual(discardMinerTool(p,0),null,'wrapped gifts must first open');
    await seed();const results=await Promise.all([action({kind:'trash',slot:5}),action({kind:'trash',slot:5})]);assertEqual(results.filter(r=>r.ok).length,1,'duplicate trash applied once');
    __resetIslandRunStateStoreForTests();refreshIslandRunStateFromLocal(session);assertEqual(getIslandRunStateSnapshot(session).crystalMinersProgressByEvent[eventId].tools[5],0,'trash persists');assertEqual(getIslandRunStateSnapshot(session).minigameTicketsByEvent[eventId],3,'trashing costs no ticket');
  }},
  {name:'forge upgrades spend only ore, respect level unlocks and persist with the career',run:async()=>{
    await seed();const current=getIslandRunStateSnapshot(session);const p={...createCrystalMinersProgress(),ore:1000};
    await writeIslandRunGameStateRecord({session,client:null,record:{...current,crystalMinersProgressByEvent:{[eventId]:p}}});refreshIslandRunStateFromLocal(session);
    const result=await action({kind:'upgrade'});assert(result.ok,'first forge upgrade');let saved=getIslandRunStateSnapshot(session);
    assertEqual(saved.crystalMinersProgressByEvent[eventId].forgeLevel,1,'one rank');assertEqual(saved.crystalMinersProgressByEvent[eventId].ore,910,'exact displayed ore cost');assertEqual(saved.dicePool,current.dicePool,'no dice spent');assertEqual(saved.minigameTicketsByEvent[eventId],3,'no tickets spent');
    assertEqual((await action({kind:'upgrade'},1)).failureReason,'forge_locked','next rank requires level five');
    __resetIslandRunStateStoreForTests();refreshIslandRunStateFromLocal(session);saved=getIslandRunStateSnapshot(session);assertEqual(getCrystalMinersCareer(saved.crystalMinersProgressByEvent)?.forgeLevel,1,'career rank survives reload');
    const unupgraded=simulateMinerDig(p);const upgraded=simulateMinerDig({...p,forgeLevel:1});assertEqual(upgraded.frames[0].bodies[0].hits,unupgraded.frames[0].bodies[0].hits+2,'every tool gets two extra impacts');
    assertEqual(upgradeMinerForge({...p,ore:minerForgeCost(p)-1}),null,'no ore overdraft');assertEqual(upgradeMinerForge({...p,level:40,forgeLevel:5}),null,'rank cap');
  }},
  {name:'readiness spots critical two-lane approaches without changing outcome or cost',run:()=>{
    const p={...createCrystalMinersProgress(),level:9,blocks:createMinerBlocks(9),tools:[5,...Array(24).fill(0)]};
    const hint=getMinerReadiness(p);assertEqual(hint.stage,'approach','critical approach detected');assertEqual(hint.neededLanes,2,'two lanes needed');assertEqual(hint.readyLanes,1,'concentrated fleet lacks second lane');assertEqual(hint.nextBoss,10,'upcoming boss visible');
    const before=JSON.stringify(p);getMinerReadiness(p);assertEqual(JSON.stringify(p),before,'guidance cannot alter physics or costs');
  }},
  {name:'normal and super gifts honor buying-tier odds, low rolls and rare five-to-ten-tier upgrades',run:()=>{
    assertEqual(rollMinerGiftTier(6,false,.5),6,'usual buying tier');assertEqual(rollMinerGiftTier(6,false,.8),7,'ordinary better tool');assertEqual(rollMinerGiftTier(6,false,.93),1,'rare low tier can be one');assertEqual(rollMinerGiftTier(6,false,.995),11,'jackpot starts five above');assertEqual(rollMinerGiftTier(6,false,.99999),16,'jackpot reaches ten above');
    let regularHigh=0,superHigh=0,regularBase=0;
    for(let i=0;i<10000;i++){const roll=(i+.5)/10000;const ordinary=rollMinerGiftTier(6,false,roll);if(ordinary>=11)regularHigh++;if(ordinary===6)regularBase++;if(rollMinerGiftTier(6,true,roll)>=11)superHigh++;}
    assertEqual(regularBase,7000,'70 percent usual');assertEqual(regularHigh,50,'half-percent ordinary jackpot');assertEqual(superHigh,1500,'15 percent super jackpot');assertEqual(rollMinerGiftTier(18,true,.999),20,'safe tier ceiling');
  }},
  {name:'super gift opening consumes its marker and cannot reroll after reload',run:async()=>{
    await seed();const current=getIslandRunStateSnapshot(session);const p={...createCrystalMinersProgress(),superGiftSlots:[0]};
    await writeIslandRunGameStateRecord({session,client:null,record:{...current,crystalMinersProgressByEvent:{[eventId]:p}}});refreshIslandRunStateFromLocal(session);
    assert((await action({kind:'open',slot:0})).ok,'gift opens');const opened=getIslandRunStateSnapshot(session).crystalMinersProgressByEvent[eventId];assert(!opened.superGiftSlots.includes(0),'box consumed');assert(opened.tools[0]>=1&&opened.tools[0]<=11,'valid super reward');
    __resetIslandRunStateStoreForTests();refreshIslandRunStateFromLocal(session);assertEqual((await action({kind:'open',slot:0},1)).ok,false,'second opening blocked');assertEqual(getIslandRunStateSnapshot(session).crystalMinersProgressByEvent[eventId].tools[0],opened.tools[0],'rolled item persists');
  }},
  {name:'camera returns upward to remaining live tools after its first tool finishes',run:()=>{
    const simulation=simulateMinerDig({...createCrystalMinersProgress(),tools:[4,4,...Array(23).fill(0)]});
    const base=simulation.frames[0];const bodies=base.bodies.map((b,i)=>({...b,active:true,y:i===0?1050:200}));
    const frames=[...Array(20).fill({...base,bodies}),...Array(15).fill({...base,bodies:bodies.map((b,i)=>({...b,active:i!==0}))})];
    const camera=createMinerReplayCamera(frames);assertEqual(camera[19].toolId,0,'follows leading live tool');assertEqual(camera[20].toolId,1,'switches to survivor');assert(camera[20].returning,'signals upward return');assert(camera[34].y<camera[19].y-300,'camera returns up the shaft');assert(camera.every(c=>Number.isFinite(c.y)&&c.y>=0),'camera positions safe');
  }},
  {name:'camera follows overtaking leaders immediately and keeps fast descents in view',run:()=>{
    const base=simulateMinerDig({...createCrystalMinersProgress(),tools:[4,4,...Array(23).fill(0)]}).frames[0];
    const frame=(positions:number[])=>({...base,bodies:base.bodies.map((body,i)=>({...body,active:true,y:positions[i]}))});
    const frames=[frame([300,100]),frame([310,620]),frame([850,700]),frame([860,1000])];
    const camera=createMinerReplayCamera(frames);
    assertDeepEqual(camera.map(c=>c.toolId),[0,1,0,1],'camera switches on every overtake instead of sticking to a slower tool');
    frames.forEach((f,i)=>assert(Math.max(...f.bodies.map(b=>b.y))-camera[i].y<=300,'fastest descent stays within the camera safe area'));
  }},
  {name:'complete forty-level campaigns use canonical upgrades, gift openings, tickets and automatic milestone wallets',run:async()=>{
    for(const buysPerDig of [2,8]) {
      await seed(3);const start=getIslandRunStateSnapshot(session);const originalRandom=Math.random;let randomIndex=buysPerDig*10000;
      Math.random=()=>minerGiftRarityRoll(++randomIndex);
      try {
        const progress=()=>getCrystalMinersCareer(getIslandRunStateSnapshot(session).crystalMinersProgressByEvent)??createCrystalMinersProgress();
        const run=async(command:Parameters<typeof action>[0])=>{const result=await action(command,progress().revision);assert(result.ok,`campaign action ${command.kind} succeeds: ${result.failureReason ?? "ok"}`);return result;};
        const clearedLevels:number[]=[];const returnsAt:number[]=[];const attempts:Record<string,number>={};
        for(let attempt=0;attempt<180&&progress().eventTrack.levelsCleared<40;attempt++) {
          for(let slot=0;slot<25;slot++)if(progress().tools[slot]<0)await run({kind:'open',slot});
          let p=progress();if(p.forgeLevel<5&&p.level>=MINER_FORGE_UNLOCKS[p.forgeLevel]&&p.ore>=minerForgeCost(p))await run({kind:'upgrade'});
          for(let pass=0;pass<30;pass++) {
            p=progress();let pair:number[]|null=null;
            for(let tier=1;tier<MINER_MAX_TIER&&!pair;tier++)for(let from=0;from<25&&!pair;from++)if(p.tools[from]===tier)for(let to=from+1;to<25;to++)if(p.tools[to]===tier&&(from%5===to%5||p.tools.filter(Boolean).length>=23)){pair=[from,to];break;}
            if(!pair)break;await run({kind:'move',from:pair[0],to:pair[1]});
          }
          for(let buy=0;buy<buysPerDig;buy++){p=progress();if(!p.tools.includes(0)||p.ore<minerBuyCost(p))break;await run({kind:'buy'});}
          for(let gift=0;gift<25&&progress().giftsWaiting>0&&progress().tools.includes(0);gift++){await run({kind:'gift'});for(let slot=0;slot<25;slot++)if(progress().tools[slot]<0)await run({kind:'open',slot});}
          const before=getIslandRunStateSnapshot(session);if(eventGamePlaysAvailable('crystal_miners',before.minigameTicketsByEvent[eventId]??0,progress().dropTickets)<1){returnsAt.push(progress().level);assertEqual((await action({kind:'dig'},progress().revision)).failureReason,'insufficient_tickets','real pause at exhausted ticket balance');applyTimedEventTicketTileGrant({session,client:null,eventId,amount:5,triggerSource:'test_modeled_island_earning'});}
          const level=progress().level;attempts[String(level)]=(attempts[String(level)]??0)+1;
          const result=await run({kind:'dig'});if(result.simulation?.cleared)clearedLevels.push(level);
          if(level%10===0){__resetIslandRunStateStoreForTests();refreshIslandRunStateFromLocal(session);}
        }
        const end=getIslandRunStateSnapshot(session);const career=progress();assertEqual(career.eventTrack.levelsCleared,40,'all forty playable through real actions');assertDeepEqual(clearedLevels,Array.from({length:40},(_,i)=>i+1),'no level skipped');assertDeepEqual(career.eventTrack.claimedMilestones,[1,10,15,20,30,35,40],'all milestones automatically paid once');
        const prizes=MINER_EVENT_MILESTONES.map(m=>resolveMinerMilestoneReward(m,session.user.id));assertEqual(end.dicePool,start.dicePool+prizes.reduce((n,p)=>n+p.dice,0),'exact final dice wallet');assertEqual(end.essence,start.essence+prizes.reduce((n,p)=>n+p.essence,0),'exact final money wallet');assert(returnsAt.length>0,'natural earning pauses occur');assert(career.forgeLevel>=3,'policy keeps investing in forge');assert(career.digs>40&&career.digs<65,'upgrading policy meets late resistance without an excessive grind');assert((attempts['38']??0)>1||(attempts['39']??0)>1,'fixed hard approaches still demand repeat preparation');
        console.log('CANONICAL_CAMPAIGN',JSON.stringify({buysPerDig,drops:career.digs,forgeLevel:career.forgeLevel,ore:career.ore,highestTier:Math.max(...career.tools),returnsAt,attempts,diceReward:end.dicePool-start.dicePool,essenceReward:end.essence-start.essence}));
      } finally {Math.random=originalRandom;}
    }
  }},
  {name:'matching tools merge; unlike tools swap; empty destinations move',run:()=>{
    const p=createCrystalMinersProgress();
    const merged=arrangeMinerTools(p,5,6)!; assertEqual(merged.tools[6],2,'same tier upgrades'); assertEqual(merged.tools[5],0,'source consumed');
    const swapped=arrangeMinerTools(merged,6,7)!; assertEqual(swapped.tools[7],2,'different tiers swap'); assertEqual(swapped.tools[6],1,'swap preserves other');
    const moved=arrangeMinerTools(swapped,7,24)!; assertEqual(moved.tools[24],2,'empty slot moves'); assertEqual(moved.tools[7],0,'source empty');
    assertEqual(p.tools[5],1,'input untouched');
  }},
  {name:'invalid and maximum-tier merges do not destroy tools',run:()=>{
    const p=createCrystalMinersProgress();
    for (const [from,to] of [[-1,2],[0,25],[1.5,2],[5,5],[24,0]]) assertEqual(arrangeMinerTools(p,from,to),null,'invalid rejected');
    p.tools[0]=MINER_MAX_TIER;p.tools[1]=MINER_MAX_TIER;assertEqual(arrangeMinerTools(p,0,1),null,'max tier preserved');
  }},
  {name:'purchases cost exactly the displayed ore, and cannot overfill or overdraft',run:()=>{
    const p=createCrystalMinersProgress(); const bought=buyMinerTool(p)!;assertEqual(bought.ore,p.ore-minerBuyCost(p),'correct price');
    assertEqual(buyMinerTool({...p,ore:0}),null,'no overdraft');assertEqual(buyMinerTool({...p,tools:Array(25).fill(1)}),null,'full rack rejected');
  }},
  {name:'simulation is deterministic, bounded, non-mutating and produces damage',run:()=>{
    const p=createCrystalMinersProgress(); const before=JSON.stringify(p);const a=simulateMinerDig(p);const b=simulateMinerDig(p);
    assertDeepEqual(a,b,'same inputs replay exactly');assertEqual(JSON.stringify(p),before,'input unchanged');
    assert(a.broken>0,'first dig breaks terrain'); assert(a.ore>0,'mining earns ore');assert(a.frames[a.frames.length-1].step<=MINER_MAX_STEPS,'bounded');
    assert(a.blocks.every((x,i)=>x.hp<=p.blocks[i].hp),'damage only decreases hp');
  }},
  {name:'repeated expeditions can recover all treasures and advance a cavern',run:()=>{
    let p=createCrystalMinersProgress();p.tools=Array(25).fill(4);
    let cleared=false;
    for(let i=0;i<6;i++){const sim=simulateMinerDig(p,false);p=settleMinerDig(p,sim);if(sim.cleared){cleared=true;break;}}
    assert(cleared,'well-upgraded deck reaches all treasures');assertEqual(p.level,2,'one cavern advancement');assert(p.totalTreasures>=1 && p.totalTreasures<=5,'at least one finish-line chest recovered');
    assertDeepEqual(p.blocks,createMinerBlocks(2),'next cavern starts with its authored terrain');
  }},
  {name:'save sanitizer rejects malformed decks and forged terrain',run:()=>{
    const p=createCrystalMinersProgress();assertDeepEqual(sanitizeCrystalMinersProgressByEvent({[eventId]:p}),{[eventId]:p},'valid roundtrip');
    assertDeepEqual(sanitizeCrystalMinersProgressByEvent({bad:{...p,tools:[Infinity]}}),{},'bad deck rejected');
    const blocks=p.blocks.map(x=>({...x}));blocks[0].kind='treasure';assertDeepEqual(sanitizeCrystalMinersProgressByEvent({bad:{...p,blocks}}),{},'forged treasure rejected');
  }},
  {name:'conflict winner is an entire newer snapshot, without resurrecting spent ore',run:()=>{
    const a={...createCrystalMinersProgress(),ore:99,revision:1};const b={...a,ore:1,revision:2};
    assertEqual(mergeCrystalMinersProgressByEvent({[eventId]:a},{[eventId]:b})[eventId].ore,1,'newer low balance wins');
    assertEqual(mergeCrystalMinersProgressByEvent({[eventId]:b},{[eventId]:a})[eventId].revision,2,'stale write ignored');
  }},
  {name:'one atomic dig spends one ticket, persists damage and credits event progress',run:async()=>{
    await seed();const before=getIslandRunStateSnapshot(session);const result=await action({kind:'dig'});assert(result.ok,'dig succeeds');
    const after=getIslandRunStateSnapshot(session);assertEqual(after.minigameTicketsByEvent[eventId],2,'one ticket spent');
    assert(after.rewardBarProgress>before.rewardBarProgress,'event reward bar credited');assertEqual(after.crystalMinersProgressByEvent[eventId].digs,1,'one dig saved');
    assertEqual(after.dicePool,before.dicePool,'no unconfigured dice minted');
    const stored=readIslandRunGameStateRecord(session);assertDeepEqual(stored.crystalMinersProgressByEvent,after.crystalMinersProgressByEvent,'full save persisted');
  }},
  {name:'duplicate/concurrent commands use compare-and-set, spending and rewarding once',run:async()=>{
    await seed();const results=await Promise.all([action({kind:'dig'}),action({kind:'dig'})]);assertEqual(results.filter(r=>r.ok).length,1,'one action accepted');
    assertEqual(getIslandRunStateSnapshot(session).minigameTicketsByEvent[eventId],2,'single spend');
    const before=JSON.stringify(getIslandRunStateSnapshot(session));assertEqual((await action({kind:'dig'})).ok,false,'replay rejected');assertEqual(JSON.stringify(getIslandRunStateSnapshot(session)),before,'replay inert');
  }},
  {name:'out of tickets does not change any canonical state',run:async()=>{
    await seed(0);const before=JSON.stringify(getIslandRunStateSnapshot(session));assertEqual((await action({kind:'dig'})).failureReason,'insufficient_tickets','reason');assertEqual(JSON.stringify(getIslandRunStateSnapshot(session)),before,'no mutation');
  }},
  {name:'expired and mismatched events cannot spend or reward',run:async()=>{
    await seed();assertEqual((await action({kind:'dig'},0,100001)).failureReason,'event_expired','expired blocked');
    const result=await applyCrystalMinersAction({session,client:null,eventId:'old-event',command:{kind:'dig'},expectedRevision:0,nowMs:500});assertEqual(result.ok,false,'wrong event blocked');
    assertEqual(getIslandRunStateSnapshot(session).minigameTicketsByEvent[eventId],3,'tickets intact');
  }},
  {name:'reload preserves rack, block damage, spend and receipt without another grant',run:async()=>{
    await seed();await action({kind:'move',from:5,to:6});await action({kind:'dig'},1);const expected=getIslandRunStateSnapshot(session);
    __resetIslandRunStateStoreForTests();refreshIslandRunStateFromLocal(session);const restored=getIslandRunStateSnapshot(session);
    assertDeepEqual(restored.crystalMinersProgressByEvent,expected.crystalMinersProgressByEvent,'exact resume');assertEqual(restored.rewardBarProgress,expected.rewardBarProgress,'no extra reward');
  }},
  {name:'remote conflict cannot restore tickets spent by a newer mining action',run:async()=>{
    await seed();const old=getIslandRunStateSnapshot(session);await action({kind:'dig'});const fresh=getIslandRunStateSnapshot(session);
    for(const [remote,local] of [[old,fresh],[fresh,old]]) {const merged=resolveIslandRunRecordForConflict({remote,local,conflictMode:'merge'});assertEqual(merged.minigameTicketsByEvent[eventId],2,'spent ticket stays spent');assertEqual(merged.crystalMinersProgressByEvent[eventId].digs,1,'latest dig retained');}
  }},
  {name:'exit can resolve an Arena objective without double-crediting event rewards',run:()=>{
    const options={launchSource:'timed_event' as const,minigameId:'crystal_miners',completed:true};assertEqual(resolveEventMinigameCompletionId(options),null,'no callback reward');assertEqual(shouldResolveEventArenaStopOnMinigameComplete(options),true,'objective accepted');assertEqual(shouldResolveEventArenaStopOnMinigameComplete({...options,completed:false}),false,'abandon no completion');
  }},
];
