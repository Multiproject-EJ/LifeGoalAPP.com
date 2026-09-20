import { resolveIslandRunFeatureAccess } from '../islandRunFeatureAccess';
import { createOpeningGamesCampaignLedger } from '../islandRunSignatureMissions';
import { createOpeningGamesCeremonyProgress, OPENING_GAMES_CEREMONY_KEY } from '../islandRunOpeningGames';
import { assert, assertEqual, assertDeepEqual, type TestCase } from './testHarness';
import { generateTileMap } from '../islandBoardTileMap';
import { applyIslandRunContractV2RewardBarProgress, resolveNextRewardKind, resolveRewardBarClaimPayoutPreview, ensureIslandRunContractV2ActiveTimedEvent, claimIslandRunContractV2RewardBar, type IslandRunRewardBarRuntimeSlice } from '../islandRunContractV2RewardBar';
import { resolveTrafficLightCoinFlipReward } from '../islandRunTrafficLightTile';

const fresh = () => createOpeningGamesCampaignLedger();
const access = (island: number) => resolveIslandRunFeatureAccess({currentIslandNumber:island, signatureMissionProgressByIsland:fresh()});

export const islandRunFeatureAccessTests: TestCase[] = [
  {name:'caretaker first appears on Island008 for new and existing saves',run(){
    for(const ledger of [{},fresh()])for(let island=1;island<=9;island++){
      assertEqual(resolveIslandRunFeatureAccess({currentIslandNumber:island,signatureMissionProgressByIsland:ledger}).caretakerBoard,island>=8,'caretaker introduction boundary');
    }
  }},
  {name:'Island001 suppresses advanced features for every save without deleting unlocks',run(){
    const earned=fresh();
    earned['0:4']={missionId:'broken-causeway',version:1,claimedPickupTileIndices:[1,8,11,20,26,35],chargesEarned:6,chargesSpent:6,activatedStages:3,lastActivatedStage:3,completedAtMs:400,updatedAtMs:400};
    for(const ledger of [{},fresh(),earned]){
      const before=JSON.stringify(ledger);
      const a=resolveIslandRunFeatureAccess({currentIslandNumber:1,signatureMissionProgressByIsland:ledger});
      assert(!a.rewardChannel&&!a.dailyWheel&&!a.trafficLight&&!a.eventLauncher,'beginner island has no advanced activity');
      assertEqual(JSON.stringify(ledger),before,'earned progress is preserved');
      assertEqual(generateTileMap(1,'normal','forest',0,{signatureMissionProgressByIsland:ledger}).filter(t=>t.tileType==='traffic_light').length,0,'no signal in actual 3D tile map');
    }
  }},
  {name:'actual reward claim replaces early puzzle payout and preserves existing inventory',run(){
    const initial: IslandRunRewardBarRuntimeSlice={signatureMissionProgressByIsland:fresh(),rewardBarProgress:0,rewardBarThreshold:5,rewardBarClaimCountInEvent:0,rewardBarEscalationTier:0,rewardBarLastClaimAtMs:null,rewardBarBoundEventId:null,rewardBarLadderId:null,activeTimedEvent:null,activeTimedEventProgress:{feedingActions:0,tokensEarned:0,milestonesClaimed:0},stickerProgress:{fragments:2},stickerInventory:{keepsake:1}};
    const ensured=ensureIslandRunContractV2ActiveTimedEvent({state:initial,nowMs:1000}).state;
    const ready={...ensured,rewardBarClaimCountInEvent:3,rewardBarProgress:1000,
      signatureMissionProgressByIsland:{...fresh(),[OPENING_GAMES_CEREMONY_KEY]:{
        ...createOpeningGamesCeremonyProgress(),rollsCompleted:12,venuesPreparedAtMs:1,teamsWelcomedAtMs:2,beaconLitAtMs:3,
      }}};
    for(const ledger of [{},fresh()]) {
      const beginner={...ready,currentIslandNumber:1,signatureMissionProgressByIsland:ledger};
      for(const source of [{kind:'tile',tileType:'currency'},{kind:'creature_feed',treatType:'basic'},{kind:'encounter_resolve'},{kind:'event_minigame_complete',minigameId:'test'}] as const) {
        assertDeepEqual(applyIslandRunContractV2RewardBarProgress({state:beginner,source,nowMs:1200,multiplier:10}),beginner,'all progress sources frozen on Island001');
      }
      assertEqual(claimIslandRunContractV2RewardBar({state:beginner,islandNumber:1,nowMs:1200}).payout,null,'legacy and new saves cannot claim on beginner island');
    }
    for(const island of [1,2,3]){
      const result=claimIslandRunContractV2RewardBar({state:ready,islandNumber:island,nowMs:1100});
      if(island===1){
        assertEqual(result.payout,null,'Island001 cannot pay hidden rewards');
        assertDeepEqual(result.state,ready,'saved progress retained');
        continue;
      }
      assert(result.payout,'claim available in isolated payout test');
      assertEqual(result.payout?.rewardKind,island>=3?'sticker_fragments':'essence','actual grant follows policy');
      if(island<3)assertEqual(result.state.stickerProgress.fragments,2,'saved fragments retained, not deleted');
      assertDeepEqual(result.state.stickerInventory,initial.stickerInventory,'owned collection retained');
    }
  }},
  {name:'tile map removes only the early signal, keeping the canonical route intact',run(){
    for(const island of [1,2,3,4]){
      const options={signatureMissionProgressByIsland:fresh()};
      const next=generateTileMap(island,'normal','forest',0,options);
      const legacy=generateTileMap(island,'normal','forest',0);
      assertEqual(next.length,legacy.length,'same route length');
      assertEqual(next.filter(t=>t.tileType==='traffic_light').length,island>=3?1:0,'physical signal eligibility');
      next.forEach((tile,index)=>{
        assertEqual(tile.index,legacy[index]!.index,'tile positions stable');
        if(legacy[index]!.tileType!=='traffic_light') {
          const { signatureMissionKind, signatureMissionAmount, ...baseTile } = legacy[index]!;
          assertDeepEqual(tile,island===4 ? baseTile : legacy[index],'only retired causeway metadata removed on new004');
        }
      });
    }
  }},
  {name:'puzzle reward rotation and its preview agree on the new Island003 introduction',run(){
    for(const island of [1,2,3,4]){
      const ledger=fresh();
      const expected=island>=3?'sticker_fragments':'essence';
      assertEqual(resolveNextRewardKind(3,island,ledger),expected,'rotation uses cohort');
      const preview=resolveRewardBarClaimPayoutPreview({islandNumber:island,state:{activeTimedEvent:null,rewardBarEscalationTier:3,rewardBarClaimCountInEvent:3,signatureMissionProgressByIsland:ledger}});
      assertEqual(preview.rewardKind,expected,'HUD and payout preview match');
      if(island<3)assertEqual(preview.stickerFragments,0,'no early puzzle grants');
    }
  }},
  {name:'traffic-light reward resolver cannot leak puzzle fragments before Island003',run(){
    for(const island of [1,2])for(let seed=0;seed<300;seed++){
      const reward=resolveTrafficLightCoinFlipReward({seed,stickerFragments:0,islandNumber:island,signatureMissionProgressByIsland:fresh()});
      assertEqual(reward.stickerFragments,0,'all sampled early rewards are fragment-free');
    }
  }},
  {name:'earned Vault access unlocks the wheel and survives a return to an earlier island',run(){
    const ledger=fresh();
    ledger['0:4']={missionId:'broken-causeway',version:1,claimedPickupTileIndices:[1,8,11,20,26,35],chargesEarned:6,chargesSpent:6,activatedStages:3,lastActivatedStage:3,completedAtMs:400,updatedAtMs:400};
    for(const island of [4,5])assert(resolveIslandRunFeatureAccess({currentIslandNumber:island,signatureMissionProgressByIsland:ledger}).dailyWheel,'earned entitlement preserved');
  }},
  {name:'unmarked existing saves retain later-island feature access',run(){
    for(const island of [2,3,4,120]){
      const a=resolveIslandRunFeatureAccess({currentIslandNumber:island});
      assert(!a.gradual,'unmarked is legacy, not guessed from island');
      assert(a.trafficLight && a.dailyWheel && a.ordinaryEvents,'other legacy access preserved');
      assertEqual(a.eggs,island>=4,'new eggs start on004 for every save');
      assertEqual(a.puzzleCollection,island>=2,'legacy puzzle introduction unchanged');
    }
  }},
  {name:'new Island001 and002 have no puzzle or traffic-light capability',run(){
    for(const island of [1,2]){
      const a=access(island);
      assert(!a.trafficLight && !a.puzzleCollection && !a.eggs && !a.dailyWheel,'early features absent');
      assert(!a.rewardChannel && !a.eventLauncher,'ceremony required');
    }
  }},
  {name:'Island003 introduces traffic and puzzles without eggs',run(){
    const a=access(3);
    assert(a.trafficLight && a.puzzleCollection,'linked introduction');
    assert(!a.eggs && !a.dailyWheel,'next features stay locked');
  }},
  {name:'Island004 introduces eggs but island number alone cannot unlock the Vault or wheel',run(){
    const a=access(4);
    assert(a.eggs,'egg introduction');
    assert(!a.vault && !a.dailyWheel,'actual entitlement needed');
    assert(!access(120).dailyWheel,'late island is not proof of Vault entitlement');
  }},
  {name:'beacon reveal permits the reward channel and inaugural launcher, not ordinary games',run(){
    const ledger={...fresh(),[OPENING_GAMES_CEREMONY_KEY]:{
      ...createOpeningGamesCeremonyProgress(),rollsCompleted:12,venuesPreparedAtMs:1,teamsWelcomedAtMs:2,beaconLitAtMs:3,
    }};
    const a=resolveIslandRunFeatureAccess({currentIslandNumber:2,signatureMissionProgressByIsland:ledger});
    assert(a.rewardChannel && a.eventLauncher && a.inauguralRound,'guided launch available');
    assert(!a.ordinaryEvents,'inaugural completion still required');
    const before=JSON.stringify(ledger);
    resolveIslandRunFeatureAccess({currentIslandNumber:1,signatureMissionProgressByIsland:ledger});
    assertEqual(JSON.stringify(ledger),before,'selector does not mutate ceremony or enroll saves');
  }},
  {name:'valid inaugural settlement unlocks ordinary events',run(){
    const ledger={...fresh(),[OPENING_GAMES_CEREMONY_KEY]:{
      ...createOpeningGamesCeremonyProgress(),rollsCompleted:12,venuesPreparedAtMs:1,teamsWelcomedAtMs:2,beaconLitAtMs:3,completedAtMs:4,
    }};
    const a=resolveIslandRunFeatureAccess({currentIslandNumber:2,signatureMissionProgressByIsland:ledger});
    assert(a.ordinaryEvents && a.eventLauncher && !a.inauguralRound,'one shared ordinary event route');
  }},
  {name:'invalid ceremony completion cannot bypass its prerequisites',run(){
    const ledger={...fresh(),[OPENING_GAMES_CEREMONY_KEY]:{...createOpeningGamesCeremonyProgress(),completedAtMs:4}};
    const a=resolveIslandRunFeatureAccess({currentIslandNumber:2,signatureMissionProgressByIsland:ledger});
    assert(!a.rewardChannel && !a.ordinaryEvents,'sanitized canonical ceremony governs');
  }},
  {name:'invalid island input fails closed for a new campaign',run(){
    for(const island of [NaN,Infinity,-1,0]){
      const a=access(island);
      assert(!a.trafficLight&&!a.puzzleCollection&&!a.eggs&&!a.rewardChannel&&!a.eventLauncher,'invalid location not eligible');
    }
  }},
  {name:'policy survives JSON round-trip without resetting unlocks',run(){
    const state={currentIslandNumber:3,signatureMissionProgressByIsland:fresh()};
    assertDeepEqual(resolveIslandRunFeatureAccess(JSON.parse(JSON.stringify(state))),resolveIslandRunFeatureAccess(state),'persisted marker stable');
  }},
];
