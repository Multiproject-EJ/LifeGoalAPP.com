import { ARENA_JOURNEY_KEY, arenaJourney, sanitizeArenaJourney, mergeArenaJourney, introducedArenaGames, pendingArenaIntroductions, canPreviewArenaDemo, canCompareArenaGames } from '../arenaJourney';
import { applyArenaJourneyAction, resolveArenaJourney } from '../arenaJourneyActions';
import { selectArenaGamePair } from '../islandRunArenaCatalog';
import { sanitizeIslandRunSignatureMissionProgress, mergeIslandRunSignatureMissionProgress } from '../islandRunSignatureMissions';
import { readIslandRunGameStateRecord, writeIslandRunGameStateRecord, resetIslandRunRuntimeCommitCoordinatorForTests, type IslandRunGameStateRecord } from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, getIslandRunStateSnapshot, resetIslandRunStateSnapshot } from '../islandRunStateStore';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import { ensureIslandRunContractV2ActiveTimedEvent } from '../islandRunContractV2RewardBar';
import { createCrystalMinersProgress } from '../crystalMinersGame';
import { createJourneyDiscArenaProgress } from '../journeyDiscArenaProgression';
import { applyArenaStadiumAction } from '../arenaStadiumActions';
import { arenaStadiumBlocksRoll, arenaStadiumVisitKey, currentArenaStadium } from '../arenaStadium';
import { applyStopObjectiveProgress, postponeIslandRunStop, syncCompletedStopsForIsland } from '../islandRunStateActions';
import { executeIslandRunRollAction } from '../islandRunRollAction';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';
const session = { user: { id: 'arena-journey-fixture', user_metadata: {} } } as import('@supabase/supabase-js').Session;
async function seed(island = 3, overrides: Partial<IslandRunGameStateRecord> = {}) {
  resetIslandRunRuntimeCommitCoordinatorForTests(); __resetIslandRunActionMutexesForTests(); __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
  const initial = readIslandRunGameStateRecord(session);
  const event = ensureIslandRunContractV2ActiveTimedEvent({ state: initial, nowMs: Date.now() }).state.activeTimedEvent!;
  const state = { ...initial, currentIslandNumber: island, activeTimedEvent: event, minigameTicketsByEvent: { [event.eventId]: 3 }, ...overrides };
  await writeIslandRunGameStateRecord({ session, client: null, record: state }); resetIslandRunStateSnapshot(session, state);
  return state;
}
const action = (command: Parameters<typeof applyArenaJourneyAction>[0]['command'], island = 3) => applyArenaJourneyAction({ session, client: null, expectedIsland: island, command });
const report = { completed: true, arenaPerformance: { gameId: 'signal_path', rawScore: 0, mastery: 0, stars: 1 as const, durationMs: 60000, mistakes: 3, hintsUsed: 0 } };
const all = () => sanitizeArenaJourney({ introduced: { signal_path: 1, crystal_miners: 2, journey_disc_arena: 3 }, played: { signal_path: 4, crystal_miners: 5, journey_disc_arena: 6 } });
const stadiumAction = (command: Parameters<typeof applyArenaStadiumAction>[0]['command'], key = arenaStadiumVisitKey(getIslandRunStateSnapshot(session))) =>
  applyArenaStadiumAction({ session, client: null, expectedVisitKey: key, command });
function updateFixture(patch: Partial<IslandRunGameStateRecord>) {
  resetIslandRunStateSnapshot(session, { ...getIslandRunStateSnapshot(session), ...patch });
}
export const arenaJourneyTests: TestCase[] = [
  { name: 'stadium requires L3 from004, respects001 and preserves completed legacy stops', async run() {
    await seed(1); assertEqual(await stadiumAction({kind:'enter'}),null,'quiet island');
    await seed(4); assertEqual(await stadiumAction({kind:'enter'}),null,'unbuilt');
    const state=getIslandRunStateSnapshot(session);
    updateFixture({stopBuildStateByIndex:state.stopBuildStateByIndex.map((b,i)=>i===2?{...b,buildLevel:3}:b)});
    assert(await stadiumAction({kind:'enter'}),'built opens even before other activities');
    updateFixture({completedStopsByIsland:{'4':['mystery']}});
    assertEqual(await stadiumAction({kind:'refresh'}),null,'old completion retained without replay');
    assert(!arenaStadiumBlocksRoll(getIslandRunStateSnapshot(session)),'legacy clear not blocked');
  }},
  { name: 'stadium cannot be skipped through postponement or generic completion callers', async run() {
    await seed(3);
    assert(!postponeIslandRunStop({session,client:null,islandNumber:3,stopIndex:2}).ok,'no postponement');
    const state=getIslandRunStateSnapshot(session);
    applyStopObjectiveProgress({session,client:null,stopStatesByIndex:state.stopStatesByIndex.map((s,i)=>i===2?{...s,objectiveComplete:true}:s),activeStopIndex:3,activeStopType:'wisdom'});
    syncCompletedStopsForIsland({session,client:null,islandNumber:3,completedStops:['mystery']});
    assert(!getIslandRunStateSnapshot(session).stopStatesByIndex[2]?.objectiveComplete,'no forged generic credit');
    assert(!(getIslandRunStateSnapshot(session).completedStopsByIsland['3']??[]).includes('mystery'),'ledger also guarded');
  }},
  { name: 'required stadium survives reload and permits zero-ticket earning without completing', async run() {
    const state=await seed(2);
    await stadiumAction({kind:'enter'});
    __resetIslandRunStateStoreForTests();
    assert(currentArenaStadium(getIslandRunStateSnapshot(session)),'saved visit');
    const before=getIslandRunStateSnapshot(session).dicePool;
    assertEqual((await executeIslandRunRollAction({session,client:null})).status,'arena_activity_required','canonical roll guard');
    assertEqual(getIslandRunStateSnapshot(session).dicePool,before,'blocked roll spends nothing');
    updateFixture({minigameTicketsByEvent:{[state.activeTimedEvent!.eventId]:0}});
    assert(!arenaStadiumBlocksRoll(getIslandRunStateSnapshot(session)),'earn recovery');
    assert(!getIslandRunStateSnapshot(session).stopStatesByIndex[2]?.objectiveComplete,'recovery grants no completion');
  }},
  { name: 'old play and opening/cancelling never complete this stadium visit', async run() {
    const state=await seed(3,{signatureMissionProgressByIsland:{[ARENA_JOURNEY_KEY]:all()}});
    const eventId=state.activeTimedEvent!.eventId;
    updateFixture({crystalMinersProgressByEvent:{[eventId]:{...createCrystalMinersProgress(),digs:8}}});
    await stadiumAction({kind:'enter'}); await stadiumAction({kind:'play',gameId:'crystal_miners',eventId});
    await stadiumAction({kind:'refresh'});
    assert(!currentArenaStadium(getIslandRunStateSnapshot(session))?.playedAtMs,'historical digs not this visit');
    await stadiumAction({kind:'play',gameId:'signal_path',eventId});
    const launch=await action({kind:'begin-signal',eventId});
    await action({kind:'settle-signal',attemptId:launch!.attemptId!,result:{completed:false}});
    await stadiumAction({kind:'refresh'});
    assert(!currentArenaStadium(getIslandRunStateSnapshot(session))?.playedAtMs,'cancel no credit');
  }},
  { name: 'one-game stadium completes from a funded terminal Signal round exactly once', async run() {
    const state=await seed(2);const eventId=state.activeTimedEvent!.eventId;
    await action({kind:'introduce',gameId:'signal_path'},2);
    await stadiumAction({kind:'enter'});await stadiumAction({kind:'play',gameId:'signal_path',eventId});
    const launch=await action({kind:'begin-signal',eventId},2);
    await action({kind:'settle-signal',attemptId:launch!.attemptId!,result:report},2);
    const results=await Promise.all([stadiumAction({kind:'refresh'}),stadiumAction({kind:'refresh'})]);
    assertEqual(results.filter(r=>r?.complete).length,1,'one completion');
    const after=getIslandRunStateSnapshot(session);
    assert(after.stopStatesByIndex[2]?.objectiveComplete,'activity completed');
    assertEqual(after.shards,state.shards+1,'one stop wallet reward');
    assertEqual(after.minigameTicketsByEvent[eventId],2,'only round ticket charged');
    assertEqual(Object.keys(resolveArenaJourney(after).comparisons).length,0,'one game never evaluated');
  }},
  { name: 'settled mining round waits for a played-pair answer before granting completion', async run() {
    const state=await seed(3,{signatureMissionProgressByIsland:{[ARENA_JOURNEY_KEY]:sanitizeArenaJourney({introduced:{signal_path:1,crystal_miners:2},played:{signal_path:3}})}});
    const eventId=state.activeTimedEvent!.eventId;
    await stadiumAction({kind:'enter'});await stadiumAction({kind:'play',gameId:'crystal_miners',eventId});
    updateFixture({crystalMinersProgressByEvent:{[eventId]:{...createCrystalMinersProgress(),digs:1}}});
    assert(!(await stadiumAction({kind:'refresh'}))?.complete,'must answer');
    updateFixture({minigameTicketsByEvent:{[eventId]:0}});
    assert(arenaStadiumBlocksRoll(getIslandRunStateSnapshot(session)),'vote cannot use ticket recovery');
    assertEqual(getIslandRunStateSnapshot(session).shards,state.shards,'no early reward');
    await action({kind:'compare',pair:['signal_path','crystal_miners'],winner:'crystal_miners'});
    assert((await stadiumAction({kind:'refresh'}))?.complete,'answer completes');
  }},
  { name: 'banked Disc loss counts without full career victory and duplicate pays no dice', async run() {
    const progress=all();progress.comparisons={'crystal_miners:signal_path':{winner:'signal_path',at:7},'crystal_miners:journey_disc_arena':{winner:'crystal_miners',at:7},'journey_disc_arena:signal_path':{winner:'signal_path',at:7}};
    const state=await seed(6,{signatureMissionProgressByIsland:{[ARENA_JOURNEY_KEY]:progress}});
    updateFixture({stopBuildStateByIndex:state.stopBuildStateByIndex.map((b,i)=>i===2?{...b,buildLevel:3}:b)});
    const eventId=state.activeTimedEvent!.eventId;
    await stadiumAction({kind:'enter'});await stadiumAction({kind:'play',gameId:'journey_disc_arena',eventId});
    updateFixture({journeyDiscArenaProgressByEvent:{[eventId]:{...createJourneyDiscArenaProgress(),roundsCompleted:1,victories:0}}});
    assert((await stadiumAction({kind:'refresh'}))?.complete,'loss qualifies; answered pairs not repeated');
    await stadiumAction({kind:'refresh'});
    assertEqual(getIslandRunStateSnapshot(session).dicePool,state.dicePool+5,'L3 completion dice once');
  }},
  { name: 'stadium rejects stale visits, unreleased games and cross-owner receipts', async run() {
    const state=await seed(2);await action({kind:'introduce',gameId:'signal_path'},2);
    const key=arenaStadiumVisitKey(state);const eventId=state.activeTimedEvent!.eventId;
    await stadiumAction({kind:'enter'});
    assertEqual(await stadiumAction({kind:'play',gameId:'twin_sigils',eventId}),null,'demo no credit');
    await stadiumAction({kind:'play',gameId:'signal_path',eventId});
    const launch=await action({kind:'begin-signal',eventId},2);
    updateFixture({islandStartedAtMs:state.islandStartedAtMs+1});
    assertEqual(await stadiumAction({kind:'refresh'},key),null,'same island new visit');
    assertEqual(await action({kind:'settle-signal',attemptId:launch!.attemptId!,result:report},2),null,'old funded callback');
    assertEqual(currentArenaStadium(getIslandRunStateSnapshot(session)),null,'previous visit ignored');
  }},
  { name: 'stadium sanitizer round-trips and stale merge cannot erase settled participation', async run() {
    await seed(2);await stadiumAction({kind:'enter'});
    const older=resolveArenaJourney(getIslandRunStateSnapshot(session));
    const newer=sanitizeArenaJourney({...older,updatedAtMs:older.updatedAtMs+1,stadium:{...older.stadium,playedAtMs:9,completedAtMs:10}});
    const merged=mergeArenaJourney({...older,updatedAtMs:newer.updatedAtMs+1},newer);
    assertEqual(merged.stadium?.completedAtMs,10,'monotonic same visit');
    assertEqual(sanitizeArenaJourney(JSON.parse(JSON.stringify(merged))).stadium?.playedAtMs,9,'JSON retains');
    assertEqual(sanitizeArenaJourney({stadium:{key:'bad',startedAtMs:1}}).stadium,null,'malformed rejected');
  }},
  { name: 'quiet Island001 keeps the legacy orientation exit while hiding its event surface', async run() {
    // @ts-ignore node types omitted by the Island Run test tsconfig
    const fs = await import('node:fs');
    const source = fs.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
    assert(source.includes('if (__storeState.currentIslandNumber === 1) return null;'), 'clock presentation hidden, not erased');
    assert(source.includes("setArenaBoostStatus(activeStopId === 'mystery' && islandNumber === 1 ? 'no_active_event' : 'idle')"), 'legacy orientation remains completable without an event');
  }},
  { name: 'catalogue grows 0/1/2/3 and contracts on backtracking without erasing progress', run() {
    const p = all();
    for (const [island, count] of [[1,0],[2,1],[3,2],[5,2],[6,3],[40,3],[2,1],[1,0]]) assertEqual(introducedArenaGames(island,p).length,count,'introduced catalogue size');
    assertEqual(Object.keys(p.introduced).length,3,'no mutation');
    for (const bad of [0,-1,NaN,Infinity,2.5]) assertEqual(introducedArenaGames(bad,p).length,0,'invalid island closed');
    assertEqual(pendingArenaIntroductions(6,sanitizeArenaJourney(null)).join(','),'signal_path,crystal_miners,journey_disc_arena','catch-up order');
  }},
  { name: 'demo preview needs verified developer AND individual opt-in; island1 never bypassed', run() {
    for(const dev of [false,true]) for(const enabled of [[],['twin_sigils'] as const]) {
      assertEqual(canPreviewArenaDemo('twin_sigils',2,dev,enabled),dev&&enabled.length>0,'two required gates');
      assert(!canPreviewArenaDemo('twin_sigils',1,dev,enabled),'quiet island');
    }
    assert(!canPreviewArenaDemo('signal_path',2,true,['signal_path']),'release games cannot bypass introduction through lab');
    assertEqual(introducedArenaGames(40,sanitizeArenaJourney({introduced:{twin_sigils:1}})).length,0,'demo never joins catalogue');
  }},
  { name: 'zero and one game selector never fabricates alternatives or restores paused games', run() {
    const input = { islandNumber:2,activeEventId:'lucky_spin' as const,rankedGameIds:[],disabledGameIds:[],seed:'test' };
    assertEqual(selectArenaGamePair({...input,allowedGameIds:[]}).primary,null,'empty');
    const one=selectArenaGamePair({...input,allowedGameIds:['signal_path']});
    assertEqual(one.primary?.id,'signal_path','first game'); assertEqual(one.alternative,null,'no fallback');
    assertEqual(selectArenaGamePair({...input,allowedGameIds:['signal_path'],disabledGameIds:['signal_path']}).primary,null,'paused remains absent');
  }},
  { name: 'comparison requires distinct introduced played games and current island, including developers', run() {
    const p=all();
    assert(canCompareArenaGames(['signal_path','crystal_miners'],3,p),'played pair');
    assert(!canCompareArenaGames(['signal_path','crystal_miners'],2,p),'backtracking');
    assert(!canCompareArenaGames(['signal_path','signal_path'],3,p),'distinct');
    delete p.played.crystal_miners;
    assert(!canCompareArenaGames(['signal_path','crystal_miners'],3,p),'never launched-only');
    assert(!canCompareArenaGames(['signal_path','twin_sigils'],40,p),'no demo');
  }},
  { name: 'typed JSON sanitizer and merge preserve bounded receipts across hydration', run() {
    const p=all(); const ledger=sanitizeIslandRunSignatureMissionProgress(JSON.parse(JSON.stringify({[ARENA_JOURNEY_KEY]:p})));
    assertEqual(introducedArenaGames(6,arenaJourney(ledger)).length,3,'round-trip');
    const left=sanitizeArenaJourney({introduced:{signal_path:4},played:{signal_path:5},updatedAtMs:5});
    const right=sanitizeArenaJourney({introduced:{crystal_miners:6},played:{crystal_miners:7},updatedAtMs:7});
    const merged=mergeIslandRunSignatureMissionProgress({[ARENA_JOURNEY_KEY]:left},{[ARENA_JOURNEY_KEY]:right});
    assertEqual(Object.keys(arenaJourney(merged).played).length,2,'union not last-write loss');
    assertEqual(mergeArenaJourney(left,left).introduced.signal_path,4,'idempotent');
    assertEqual(Object.keys(sanitizeArenaJourney({introduced:{signal_path:NaN},played:{signal_path:4}}).played).length,0,'no orphan plays');
  }},
  { name: 'introduction action rejects early/stale callbacks and never awards currency', async run() {
    const before=await seed(2);
    assertEqual(await action({kind:'introduce',gameId:'crystal_miners'},2),null,'too early');
    assertEqual(await action({kind:'introduce',gameId:'signal_path'},3),null,'stale island');
    assert(await action({kind:'introduce',gameId:'signal_path'},2),'introduce');
    const after=getIslandRunStateSnapshot(session);
    assertEqual(JSON.stringify(after.minigameTicketsByEvent),JSON.stringify(before.minigameTicketsByEvent),'no grant/spend');
    assertEqual(after.dicePool,before.dicePool,'no XP/wallet award');
    __resetIslandRunStateStoreForTests();
    assert(resolveArenaJourney(getIslandRunStateSnapshot(session)).introduced.signal_path,'persisted');
  }},
  { name: 'signal launch atomically spends once with replay-safe settlement; cancelled is not played', async run() {
    const state=await seed(); await action({kind:'introduce',gameId:'signal_path'});
    const command={kind:'begin-signal' as const,eventId:state.activeTimedEvent!.eventId};
    const [a,b]=await Promise.all([action(command),action(command)]);
    assert(a&&b,'launches'); assertEqual(a!.attemptId,b!.attemptId,'one funded attempt');
    assertEqual(getIslandRunStateSnapshot(session).minigameTicketsByEvent[command.eventId],2,'one ticket');
    await action({kind:'settle-signal',attemptId:a!.attemptId!,result:{completed:false}});
    assert(!resolveArenaJourney(getIslandRunStateSnapshot(session)).played.signal_path,'cancel');
    assertEqual(await action({kind:'settle-signal',attemptId:a!.attemptId!,result:report}),null,'stale callback');
    const c=await action(command);
    await action({kind:'settle-signal',attemptId:c!.attemptId!,result:report});
    assert(resolveArenaJourney(getIslandRunStateSnapshot(session)).played.signal_path,'finished low-score/timed-out round counts');
    assertEqual(await action({kind:'settle-signal',attemptId:c!.attemptId!,result:report}),null,'duplicate inert');
  }},
  { name: 'canonical dig/banked loss count, preparation/round start do not', async run() {
    const state=await seed(6,{signatureMissionProgressByIsland:{[ARENA_JOURNEY_KEY]:sanitizeArenaJourney({introduced:all().introduced})}});
    const miner=createCrystalMinersProgress(), disc=createJourneyDiscArenaProgress();
    state.crystalMinersProgressByEvent={a:miner}; state.journeyDiscArenaProgressByEvent={a:disc};
    assert(!resolveArenaJourney(state).played.crystal_miners,'workshop not played');
    assert(!resolveArenaJourney(state).played.journey_disc_arena,'open not played');
    state.crystalMinersProgressByEvent.a={...miner,digs:1}; state.journeyDiscArenaProgressByEvent.a={...disc,roundsCompleted:1,victories:0};
    assert(resolveArenaJourney(state).played.crystal_miners,'drop'); assert(resolveArenaJourney(state).played.journey_disc_arena,'loss');
  }},
  { name: 'vote action revalidates current owner/island and stores no unplayed comparison', async run() {
    await seed();
    const command={kind:'compare' as const,pair:['signal_path','crystal_miners'] as ['signal_path','crystal_miners'],winner:'signal_path' as const};
    assertEqual(await action(command),null,'unplayed');
    await seed(3,{signatureMissionProgressByIsland:{[ARENA_JOURNEY_KEY]:all()}});
    assert(await action(command),'valid vote');
    assertEqual(Object.keys(resolveArenaJourney(getIslandRunStateSnapshot(session)).comparisons).length,1,'saved once');
    const stranger={user:{id:'another-owner',user_metadata:{}}} as import('@supabase/supabase-js').Session;
    assertEqual(Object.keys(resolveArenaJourney(getIslandRunStateSnapshot(stranger)).played).length,0,'owner isolation');
    const current=getIslandRunStateSnapshot(session); resetIslandRunStateSnapshot(session,{...current,currentIslandNumber:1});
    assertEqual(await action(command),null,'travel revalidation');
  }},
];
