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
export const arenaJourneyTests: TestCase[] = [
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
