import { titanEyeDetent, titanToothDetent, titanToothTrackDetent, titanChannelReach } from '../../components/TitanMechanismWorkbench';
import { titanLensDetent, titanStarAlignment } from '../../components/TitanDiscoveryWorkbenches';
import { resolveIslandMissionBriefingTrigger, markIslandMissionBriefingSeen } from '../islandRunMissionBriefing';
import { applyTitanPuzzleInput, mergeTitanAwakening, sanitizeTitanAwakening, type TitanPuzzleInput } from '../island17Awakening';
import { resolveStagedRestorationMissionProgress, sanitizeIslandRunSignatureMissionProgress, mergeIslandRunSignatureMissionProgress } from '../islandRunSignatureMissions';
import { interactWithTitanSkull } from '../islandRunSignatureMissionAction';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import { readIslandRunGameStateRecord, writeIslandRunGameStateRecord, resetIslandRunRuntimeCommitCoordinatorForTests } from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, refreshIslandRunStateFromLocal, getIslandRunStateSnapshot } from '../islandRunStateStore';
import { resolveIslandRunCompletion } from '../islandRunCompletion';
import { createTitanAwakeningThree, titanRevealPose } from '../../dev/Island17AwakeningThree';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';
import type { Session } from '@supabase/supabase-js';
const session={user:{id:'titan-awakening-test',user_metadata:{}}} as Session;
const solution: TitanPuzzleInput[]=[{kind:'ingredient',index:0},{kind:'ingredient',index:1},{kind:'ingredient',index:2},{kind:'pour'},
  {kind:'eye',index:0,value:1},{kind:'eye',index:1,value:3},{kind:'test'},
  {kind:'tooth',index:0,value:2},{kind:'tooth',index:2,value:1},{kind:'test'},
  {kind:'lens',value:4},{kind:'test'},{kind:'release'}];
async function seed(stages=8) {
  resetIslandRunRuntimeCommitCoordinatorForTests();__resetIslandRunActionMutexesForTests();__resetIslandRunStateStoreForTests();installWindowWithStorage(createMemoryStorage());
  const base=readIslandRunGameStateRecord(session);
  const mission=resolveStagedRestorationMissionProgress({ledger:{},cycleIndex:0,islandNumber:17})!;
  await writeIslandRunGameStateRecord({session,client:null,record:{...base,currentIslandNumber:17,cycleIndex:0,dicePool:123,essence:456,
    signatureMissionProgressByIsland:{'0:17':{...mission,activatedStages:stages,chargesEarned:8,chargesSpent:stages,completedAtMs:stages===8?10:null}},
  }});refreshIslandRunStateFromLocal(session);
}
export const island17AwakeningTests: TestCase[]=[
  {name:'crown lens pointer detents expose a visible seven-star alignment instead of a hidden answer',run:()=>{
    const compass=[[0,-40],[28,-28],[40,0],[28,28],[0,40],[-28,28],[-40,0],[-28,-28]];
    compass.forEach(([x,y],i)=>assertEqual(titanLensDetent(x,y),(i+4)%8,'eight physical lens detents'));
    for(let lens=0;lens<8;lens++){
      const alignment=titanStarAlignment(lens);
      const result=applyTitanPuzzleInput(sanitizeTitanAwakening({phase:4,lens}),{kind:'test'});
      assertEqual(result.status,alignment===7?'ok':'wrong','visible alignment agrees with canonical gate');
    }
  }},
  {name:'physical eye positions and illuminated receivers agree with the canonical jaw latch',run:()=>{
    const directions=[[0,-40],[40,0],[0,40],[-40,0]];
    directions.forEach(([x,y],i)=>assertEqual(titanEyeDetent(x,y),i,'pointer quarter turn'));
    for(let left=0;left<4;left++)for(let right=0;right<4;right++){
      const state=sanitizeTitanAwakening({phase:2,eyes:[left,right]});
      assertEqual(applyTitanPuzzleInput(state,{kind:'test'}).status,left===1&&right===3?'ok':'wrong','only both illuminated receivers release the jaw');
    }
  }},
  {name:'dragging teeth follows the engraved channel and light stops at the first gap',run:()=>{
    assertEqual(titanToothDetent(0,-56),2,'pull up raises tooth');
    assertEqual(titanToothDetent(2,28),1,'pull down lowers tooth');
    assertEqual(titanToothDetent(0,500),0,'bottom stop');assertEqual(titanToothDetent(2,-500),2,'top stop');
    assertEqual(titanToothDetent(1,8),1,'small touch does not move a detent');
    assertEqual(titanToothTrackDetent(70),2,'tap upper track');assertEqual(titanToothTrackDetent(145),1,'tap middle track');assertEqual(titanToothTrackDetent(220),0,'tap lower track');
    for(let a=0;a<3;a++)for(let b=0;b<3;b++)for(let c=0;c<3;c++){
      const teeth=[a,b,c],reach=titanChannelReach(teeth);
      const result=applyTitanPuzzleInput(sanitizeTitanAwakening({phase:3,teeth}),{kind:'test'});
      assertEqual(result.status,reach===3?'ok':'wrong','light reaches outlet exactly when latch releases');
      assertEqual(reach,a!==2?0:b!==0?1:c!==1?2:3,'sequential light propagation');
    }
  }},
  {name:'first throw introduces the mystery exactly once per cycle',run:()=>{
    const options={islandNumber:17,cycleIndex:0,tileCount:36,hopSequence:[1,2],narrativeSeenState:{episodes:{},beats:{}}};
    const trigger=resolveIslandMissionBriefingTrigger(options);assert(trigger,'first throw has a clue');
    const seen=markIslandMissionBriefingSeen(options.narrativeSeenState,trigger,100);
    assertEqual(resolveIslandMissionBriefingTrigger({...options,narrativeSeenState:seen}),null,'not repeated');
    assert(resolveIslandMissionBriefingTrigger({...options,cycleIndex:1,narrativeSeenState:seen}),'fresh cycle');
  }},
  {name:'potion order and puzzle gates reject shortcuts without losing completed mechanisms',run:()=>{
    let state=sanitizeTitanAwakening(null);
    assertEqual(applyTitanPuzzleInput(state,{kind:'release'}).status,'invalid','cannot skip');
    state=applyTitanPuzzleInput(state,{kind:'ingredient',index:0}).state;
    const wrong=applyTitanPuzzleInput(state,{kind:'ingredient',index:2});assertEqual(wrong.status,'wrong','wrong potion');assertEqual(wrong.state.ingredients.length,0,'free reset');
    state=wrong.state;
    for(const input of solution) { const result=applyTitanPuzzleInput(state,input); assertEqual(result.status,'ok','valid input'); state=result.state; }
    assertEqual(state.phase,6,'full sequence');assertEqual(applyTitanPuzzleInput(state,{kind:'release'}).status,'invalid','release cannot repeat');
  }},
  {name:'hydration and conflict merge preserve solved phases and legacy completion without borrowing a cycle',run:()=>{
    const fresh=resolveStagedRestorationMissionProgress({ledger:{},cycleIndex:0,islandNumber:17})!;
    const old={...fresh,activatedStages:8,completedAtMs:1,titanAwakening:undefined};
    const ledger=sanitizeIslandRunSignatureMissionProgress({'0:17':old});
    assert(resolveStagedRestorationMissionProgress({ledger,cycleIndex:0,islandNumber:17})?.titanAwakening?.legacyComplete,'old completed players retain completion');
    assert(!resolveStagedRestorationMissionProgress({ledger,cycleIndex:1,islandNumber:17})?.titanAwakening?.legacyComplete,'new cycle fresh');
    const merged=mergeTitanAwakening(sanitizeTitanAwakening({phase:4,revision:8}),sanitizeTitanAwakening({phase:2,revision:99}));assertEqual(merged.phase,4,'phase wins over stale revision');
    const wire=mergeIslandRunSignatureMissionProgress({'0:17':{...fresh,titanAwakening:merged}},ledger);
    const hydrated=sanitizeIslandRunSignatureMissionProgress(JSON.parse(JSON.stringify(wire)));
    const saved=resolveStagedRestorationMissionProgress({ledger:hydrated,cycleIndex:0,islandNumber:17})!;
    assertEqual(saved.titanAwakening?.phase,4,'merge retains puzzle');assert(saved.titanAwakening?.legacyComplete,'merge retains grandfathering');
  }},
  {name:'canonical actions reject locked, stale, cross-cycle and duplicate input; resume each move; no wallet changes',run:async()=>{
    await seed(7);
    const send=(input:TitanPuzzleInput,expectedRevision:number,cycleIndex=0)=>interactWithTitanSkull({session,client:null,cycleIndex,expectedRevision,input});
    assertEqual((await send(solution[0],0)).status,'locked','spine prerequisite');
    await seed();
    assertEqual((await send(solution[0],0,1)).status,'wrong_island','stale visit');
    const concurrent=await Promise.all([send(solution[0],0),send(solution[0],0)]);
    assertEqual(concurrent.filter(r=>r.status==='ok').length,1,'one accepted');assertEqual(concurrent.filter(r=>r.status==='stale').length,1,'one stale');
    for(const input of solution.slice(1)) {
      const record=getIslandRunStateSnapshot(session);const puzzle=resolveStagedRestorationMissionProgress({ledger:record.signatureMissionProgressByIsland,cycleIndex:0,islandNumber:17})!.titanAwakening!;
      assertEqual((await send(input,puzzle.revision)).status,'ok','next valid interaction');
      __resetIslandRunStateStoreForTests();refreshIslandRunStateFromLocal(session);
    }
    const saved=getIslandRunStateSnapshot(session),before=saved.runtimeVersion;
    const progress=resolveStagedRestorationMissionProgress({ledger:saved.signatureMissionProgressByIsland,cycleIndex:0,islandNumber:17})!;
    assertEqual(progress.titanAwakening?.phase,6,'released after reload');
    assertEqual(saved.dicePool,123,'no additional dice');assertEqual(saved.essence,456,'no spending');
    assertEqual((await send({kind:'release'},progress.titanAwakening!.revision)).status,'invalid','no duplicate release');assertEqual(getIslandRunStateSnapshot(session).runtimeVersion,before,'no duplicate commit');
    assertEqual(resolveIslandRunCompletion(saved).requirements.find(r=>r.id==='signature')?.complete,true,'departure uses release');
  }},
  {name:'new journey cannot depart on spine alone; old completion remains complete',run:async()=>{
    await seed();const state=getIslandRunStateSnapshot(session);
    assertEqual(resolveIslandRunCompletion(state).requirements.find(r=>r.id==='signature')?.complete,false,'puzzle mandatory');
    const current=resolveStagedRestorationMissionProgress({ledger:state.signatureMissionProgressByIsland,cycleIndex:0,islandNumber:17})!;
    assertEqual(resolveIslandRunCompletion({...state,signatureMissionProgressByIsland:{'0:17':{...current,titanAwakening:undefined}}}).requirements.find(r=>r.id==='signature')?.complete,true,'legacy complete');
  }},
  {name:'actual 3D reveal has bounded motion, saved endpoints and presentation-only replay',run:()=>{
    assertEqual(titanRevealPose(0,99,false).visible,false,'empty well');assertEqual(titanRevealPose(2,0,false).lift,0,'starts below');assertEqual(titanRevealPose(2,5,false).lift,1,'ends raised');assertEqual(titanRevealPose(2,0,true).lift,1,'reduced immediate');
    const visual=createTitanAwakeningThree();const saved=sanitizeTitanAwakening({phase:6});visual.update(saved);visual.animate(0,true);
    const spirit=visual.root.getObjectByName('TITAN_FREED_SPIRIT')!;assert(spirit.visible,'spirit persists');assert(Number.isFinite(spirit.position.x),'static pose finite');
    const initial=JSON.stringify(saved);visual.update(saved,1);visual.animate(.5,false);assert(visual.root.userData.revealActive,'replay animates');visual.animate(8,false);assert(!visual.root.userData.revealActive,'replay ends');assertEqual(JSON.stringify(saved),initial,'replay read only');
    visual.animate(9,true);const position=spirit.position.clone();visual.animate(20,true);assert(spirit.position.equals(position),'reduced motion freezes');visual.dispose();
  }},
];
