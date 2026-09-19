import type { Session } from '@supabase/supabase-js';
import { readIslandRunGameStateRecord, resetIslandRunRuntimeCommitCoordinatorForTests, writeIslandRunGameStateRecord, type IslandRunGameStateRecord } from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, getIslandRunStateSnapshot, resetIslandRunStateSnapshot } from '../islandRunStateStore';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import { applyEggPlacement, applyEggPlacementBatch, resolveReadyEggTerminalTransition, travelToNextIsland } from '../islandRunStateActions';
import { createOpeningGamesCampaignLedger } from '../islandRunSignatureMissions';
import { createOpeningGamesCeremonyProgress, OPENING_GAMES_CEREMONY_KEY } from '../islandRunOpeningGames';
import { resolveIslandRunCompletion } from '../islandRunCompletion';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const session = { user: { id:'early-progression-test', user_metadata:{} } } as Session;
const egg = { tier:'common' as const, setAtMs:10, hatchAtMs:20, status:'incubating' as const, location:'island' as const };
async function seed(overrides: Partial<IslandRunGameStateRecord> = {}) {
  resetIslandRunRuntimeCommitCoordinatorForTests(); __resetIslandRunStateStoreForTests(); __resetIslandRunActionMutexesForTests();
  installWindowWithStorage(createMemoryStorage());
  const state = { ...readIslandRunGameStateRecord(session), currentIslandNumber:2,
    signatureMissionProgressByIsland:createOpeningGamesCampaignLedger(), ...overrides };
  await writeIslandRunGameStateRecord({session,client:null,record:state});
  resetIslandRunStateSnapshot(session,state);
  return state;
}
function place(islandNumber:number) {
  return applyEggPlacement({session,client:null,islandNumber,activeEggTier:'common',activeEggSetAtMs:10,
    activeEggHatchDurationMs:10,perIslandEggEntry:egg,completedStops:['hatchery']});
}
function placeBatch(islandNumber:number, keys:string[]) {
  return applyEggPlacementBatch({session,client:null,islandNumber,activeEggTier:'common',activeEggSetAtMs:10,
    activeEggHatchDurationMs:10,eggEntriesByLedgerKey:Object.fromEntries(keys.map(key=>[key,egg])),completedStops:['hatchery']});
}
async function completeBase(island:number) {
  return seed({currentIslandNumber:island,firstSessionTutorialState:'complete',
    stopStatesByIndex:Array.from({length:5},()=>({objectiveComplete:true,buildComplete:true})),
    stopBuildStateByIndex:Array.from({length:5},()=>({buildLevel:3,requiredEssence:100,spentEssence:100})),
    perIslandEggs:{[island]:{...egg,status:'collected'}},bossTrialResolvedIslandNumber:island});
}
const travel = (island:number) => travelToNextIsland({session,client:null,nextIsland:island+1,completedVisitKey:`0:${island}`,
  startTimer:true,nowMs:1000,getIslandDurationMs:()=>0,islandRunContractV2Enabled:true});

export const islandRunEarlyProgressionTests: TestCase[] = [
  {name:'new Islands001–003 reject single and batch eggs without granting stop completion',async run(){
    for(const island of [1,2,3]) {
      const before=await seed({currentIslandNumber:island});
      assertEqual(place(island),before,'single placement rejected');
      assertEqual(placeBatch(island,[String(island),`${island}#egg1`]),before,'batch rejected');
      assertEqual(JSON.stringify(getIslandRunStateSnapshot(session)),JSON.stringify(before),'no wallet/stop/egg/version mutation');
      assertEqual(place(4),before,'forged future-island argument cannot unlock eggs');
    }
  }},
  {name:'Island004 permits placement once but rejects cross-island, malformed and overwritten slots',async run(){
    const before=await seed({currentIslandNumber:4});
    for(const keys of [['1'],['4garbage'],['4#egg3'],['04'],['4#egg1#egg2'],[]]) {
      assertEqual(placeBatch(4,keys),before,'invalid batch remains inert');
    }
    assertEqual(place(1),before,'cannot place an early-island egg from004');
    const placed=place(4);
    assertEqual(placed.perIslandEggs['4']?.status,'incubating','first egg introduced on004');
    assertEqual(placed.runtimeVersion,before.runtimeVersion+1,'one placement');
    assertEqual(place(4),placed,'repeated callback cannot replace egg');
    assertEqual(placeBatch(4,['4','4#egg1']),placed,'mixed batch cannot replace owned egg');
  }},
  {name:'legacy early placement and earned egg resolution are preserved',async run(){
    await seed({currentIslandNumber:1,signatureMissionProgressByIsland:{}});
    assertEqual(place(1).perIslandEggs['1']?.status,'incubating','legacy behavior unchanged');
    const saved=await seed({currentIslandNumber:2,perIslandEggs:{'2':{...egg,status:'ready'}}});
    const result=resolveReadyEggTerminalTransition({session,client:null,islandNumber:2,terminalStatus:'sold',openedAtMs:30,completedStops:['hatchery'],rewardDeltas:{dicePool:5}});
    assert(result.changed,'already earned egg remains resolvable');
    assertEqual(result.record.dicePool,saved.dicePool+5,'earned reward not discarded');
    const duplicate=resolveReadyEggTerminalTransition({session,client:null,islandNumber:2,terminalStatus:'sold',openedAtMs:31,completedStops:['hatchery'],rewardDeltas:{dicePool:5}});
    assertEqual(duplicate.changed,false,'earned egg pays once');
  }},
  {name:'early UI fallback cannot invent a ready egg or collect its reward',async run(){
    const before=await seed();
    const result=resolveReadyEggTerminalTransition({session,client:null,islandNumber:2,terminalStatus:'sold',openedAtMs:30,
      fallbackReadyEgg:egg,completedStops:['hatchery'],rewardDeltas:{dicePool:100}});
    assertEqual(result.reason,'missing_ledger_entry','no canonical egg evidence');
    assertEqual(result.record,before,'phantom reward refused');
  }},
  {name:'Island002 cannot clear or travel before inaugural participation, even with every old requirement complete',async run(){
    const before=await completeBase(2);
    assertEqual(resolveIslandRunCompletion(before).nextRequirement?.id,'opening_ceremony','ceremony is mandatory');
    assert(resolveIslandRunCompletion(before).percent<100,'not falsely complete');
    let rejected=false; try {await travel(2);} catch {rejected=true;}
    assert(rejected,'canonical travel refuses skip');
    let omittedKeyRejected=false;
    try { await travelToNextIsland({session,client:null,nextIsland:3,startTimer:true,nowMs:1000,getIslandDurationMs:()=>0,islandRunContractV2Enabled:true}); }
    catch { omittedKeyRejected=true; }
    assert(omittedKeyRejected,'omitting the optional legacy visit key cannot bypass new-campaign gates');
    assertEqual(getIslandRunStateSnapshot(session),before,'failed travel changes nothing');
    const done={...before,signatureMissionProgressByIsland:{...before.signatureMissionProgressByIsland,
      [OPENING_GAMES_CEREMONY_KEY]:{...createOpeningGamesCeremonyProgress(),rollsCompleted:12,venuesPreparedAtMs:1,teamsWelcomedAtMs:2,beaconLitAtMs:3,completedAtMs:4}}};
    resetIslandRunStateSnapshot(session,done);
    assert(resolveIslandRunCompletion(done).complete,'real ceremony completion enables departure');
    assertEqual((await travel(2)).resolvedIsland,3,'normal travel succeeds');
  }},
  {name:'Island004 requires current-cycle Re-Docking, not an old mission or earned Vault entitlement',async run(){
    const before=await completeBase(4);
    const mission={missionId:'celestial-great-redocking' as const,version:1 as const,rollsCompleted:20,completedAtMs:10,updatedAtMs:10};
    const ledger=before.signatureMissionProgressByIsland;
    const additions: IslandRunGameStateRecord['signatureMissionProgressByIsland'][] = [{},{'0:2':mission},{'1:4':mission},{'0:4':{...mission,rollsCompleted:19}},{'0:4':{...mission,completedAtMs:null}}];
    for(const addition of additions) {
      const state={...before,signatureMissionProgressByIsland:{...ledger,...addition}};
      assertEqual(resolveIslandRunCompletion(state).nextRequirement?.id,'redocking','current mission required');
    }
    const done={...before,signatureMissionProgressByIsland:{...ledger,'0:4':mission}};
    let rejected=false; try {await travel(4);} catch {rejected=true;}
    assert(rejected,'canonical travel refuses unfinished Re-Docking');
    assert(resolveIslandRunCompletion(done).complete,'current-cycle mission enables departure');
    assert(!resolveIslandRunCompletion({...done,cycleIndex:1}).complete,'cycle wrap cannot inherit the mission');
    resetIslandRunStateSnapshot(session,done);
    assertEqual((await travel(4)).resolvedIsland,5,'normal post-mission departure succeeds');
  }},
  {name:'unmarked saves do not acquire new ceremony or Re-Docking departure requirements',async run(){
    for(const island of [2,4]) {
      const state=await completeBase(island);
      assert(resolveIslandRunCompletion({...state,signatureMissionProgressByIsland:{}}).complete,'legacy clear preserved');
    }
  }},
];
