import { beginIslandRunOpeningGame, prepareIslandRunOpeningGames, settleIslandRunOpeningGame } from '../islandRunOpeningGamesAction';
import { createOpeningGamesCampaignLedger } from '../islandRunSignatureMissions';
import { createOpeningGamesCeremonyProgress, OPENING_GAMES_CEREMONY_KEY, resolveOpeningGamesCeremony } from '../islandRunOpeningGames';
import { applyRewardBarState, applyTimedEventTicketSpend } from '../islandRunStateActions';
import { applyIslandRunContractV2RewardBarProgress, canClaimIslandRunContractV2RewardBar, claimIslandRunContractV2RewardBar, ensureIslandRunContractV2ActiveTimedEvent } from '../islandRunContractV2RewardBar';
import { executeIslandRunTileRewardAction } from '../islandRunTileRewardAction';
import { readIslandRunGameStateRecord, resetIslandRunRuntimeCommitCoordinatorForTests, writeIslandRunGameStateRecord, type IslandRunGameStateRecord } from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, getIslandRunStateSnapshot, resetIslandRunStateSnapshot } from '../islandRunStateStore';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';
const session = { user: { id: 'opening-game-action-test', user_metadata: {} } } as import('@supabase/supabase-js').Session;
const ready = () => ({ ...createOpeningGamesCampaignLedger(), [OPENING_GAMES_CEREMONY_KEY]: {
  ...createOpeningGamesCeremonyProgress(), rollsCompleted: 12, venuesPreparedAtMs: 1, teamsWelcomedAtMs: 2, beaconLitAtMs: 3,
} });
const played = () => ({ completed: true, arenaPerformance: { gameId: 'signal_path', rawScore: 45, mastery: 10, stars: 1 as const, durationMs: 60000, mistakes: 0, hintsUsed: 0 }, reward: { dice: 999999 } });
async function seed(overrides: Partial<IslandRunGameStateRecord> = {}) {
  resetIslandRunRuntimeCommitCoordinatorForTests(); __resetIslandRunActionMutexesForTests(); __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
  const initial = readIslandRunGameStateRecord(session);
  const ensured = ensureIslandRunContractV2ActiveTimedEvent({ state: initial, nowMs: Date.now() }).state;
  const state = { ...initial, ...ensured, currentIslandNumber: 2, signatureMissionProgressByIsland: ready(), ...overrides };
  await writeIslandRunGameStateRecord({ session, client: null, record: state });
  resetIslandRunStateSnapshot(session, state);
  return state;
}
const begin = () => beginIslandRunOpeningGame({ session, client: null });
const settle = (attemptId: string, result = played()) => settleIslandRunOpeningGame({ session, client: null, attemptId, result });

export const islandRunOpeningGamesActionTests: TestCase[] = [
  { name: 'beacon initialises a missing global clock before revealing the free game', async run() {
    const ledger={...ready(),[OPENING_GAMES_CEREMONY_KEY]:{...ready()[OPENING_GAMES_CEREMONY_KEY],beaconLitAtMs:null}};
    const before=await seed({activeTimedEvent:null,rewardBarBoundEventId:null,signatureMissionProgressByIsland:ledger});
    const result=await prepareIslandRunOpeningGames({session,client:null,action:'light-beacon'});
    assertEqual(result.status,'ok','beacon action succeeds');
    const after=getIslandRunStateSnapshot(session);
    assert(after.activeTimedEvent!==null,'canonical event available immediately');
    assertEqual(JSON.stringify(after.minigameTicketsByEvent),JSON.stringify(before.minigameTicketsByEvent),'no premature tickets');
    assert((await begin())!==null,'free game reachable');
  }},
  { name: 'hidden reward channel refuses progress and claims without deleting saved balances', async run() {
    for (const currentIslandNumber of [1,2]) {
      const before = await seed({ currentIslandNumber, firstSessionTutorialState:'complete',
        signatureMissionProgressByIsland:createOpeningGamesCampaignLedger(), rewardBarProgress:10 });
      const input = { state:before, source:{kind:'tile' as const,tileType:'currency'}, nowMs:Date.now() };
      assertEqual(applyIslandRunContractV2RewardBarProgress(input),before,'pure progress unchanged');
      assertEqual(canClaimIslandRunContractV2RewardBar(before),false,'hidden bar not claimable');
      const claim = claimIslandRunContractV2RewardBar({state:before,nowMs:Date.now(),islandNumber:currentIslandNumber});
      assertEqual(claim.payout,null,'no hidden payout');
      assertEqual(claim.state,before,'earned progress retained');
      const applied = applyRewardBarState({session,client:null,nextState:{...before,rewardBarProgress:999,stickerInventory:{fake:99}}});
      assertEqual(applied.rewardBarProgress,10,'stale UI award blocked');
      assertEqual(JSON.stringify(applied.stickerInventory),JSON.stringify(before.stickerInventory),'stale collection grant blocked');
      await executeIslandRunTileRewardAction({session,client:null,islandRunContractV2Enabled:true,
        essenceDelta:2,rewardBarProgress:{source:{kind:'tile',tileType:'currency'}}});
      const after=readIslandRunGameStateRecord(session);
      assertEqual(after.rewardBarProgress,10,'canonical tile preserves cohort context');
      assertEqual(after.essence,before.essence+2,'ordinary essence still earned');
    }
  }},
  { name: 'beacon enables reward progress and legacy bar behavior remains available', async run() {
    for (const ledger of [ready(),{}]) {
      const before=await seed({signatureMissionProgressByIsland:ledger,rewardBarProgress:4});
      const after=applyIslandRunContractV2RewardBarProgress({state:before,source:{kind:'tile',tileType:'currency'},nowMs:Date.now()});
      assertEqual(after.rewardBarProgress,5,'visible channel accrues');
      assertEqual(canClaimIslandRunContractV2RewardBar(after),true,'claim available');
      assert(claimIslandRunContractV2RewardBar({state:after,nowMs:Date.now(),islandNumber:2}).payout!==null,'payout available');
    }
  }},
  { name: 'hidden reward channel retains the shared global event lifecycle', async run() {
    const before=await seed({signatureMissionProgressByIsland:createOpeningGamesCampaignLedger(),activeTimedEvent:null,rewardBarBoundEventId:null});
    const after=applyRewardBarState({session,client:null,nextState:{...before,rewardBarProgress:999}});
    assert(after.activeTimedEvent!==null,'global clock initialized');
    assertEqual(after.rewardBarProgress,0,'no pre-beacon accrual');
  }},
  { name: 'concurrent begin resumes one persisted free attempt without spending tickets', async run() {
    const before = await seed();
    const [a,b] = await Promise.all([begin(), begin()]);
    if (!a || !b) throw Error('Missing launch descriptors');
    assertEqual(a.attemptId,b.attemptId,'same attempt');
    assertEqual(getIslandRunStateSnapshot(session).runtimeVersion, before.runtimeVersion + 1,'one commit');
    assertEqual(JSON.stringify(getIslandRunStateSnapshot(session).minigameTicketsByEvent),JSON.stringify(before.minigameTicketsByEvent),'free entry');
    __resetIslandRunStateStoreForTests();
    assertEqual((await begin())?.attemptId,a.attemptId,'reload resumes persisted attempt');
  }},
  { name: 'participation unlocks events and grants exactly three existing-event tickets once', async run() {
    const before = await seed();
    const launch = (await begin())!;
    const results = await Promise.all([settle(launch.attemptId),settle(launch.attemptId)]);
    assertEqual(results.filter(r => r.status === 'completed').length,1,'one completion');
    const after = readIslandRunGameStateRecord(session);
    const eventId = before.activeTimedEvent!.eventId;
    assertEqual(after.activeTimedEvent!.eventId,eventId,'does not create a parallel event');
    assertEqual(after.minigameTicketsByEvent[eventId],(before.minigameTicketsByEvent[eventId]??0)+3,'starter tickets');
    assertEqual(after.dicePool,before.dicePool,'untrusted game reward ignored');
    assertEqual(resolveOpeningGamesCeremony(after.signatureMissionProgressByIsland).firstTicketBoostEventId,eventId,'grant marker persisted');
    assertEqual((await settle(launch.attemptId)).ticketsGranted,0,'replayed callback inert');
    assertEqual(applyTimedEventTicketSpend({session,client:null,eventId,ticketsToSpend:1}).spent,1,'ordinary event spending unlocked');
  }},
  { name: 'cancelled tutorial gives no award and permits a fresh attempt', async run() {
    const before = await seed(); const launch = (await begin())!;
    const result = await settleIslandRunOpeningGame({session,client:null,attemptId:launch.attemptId,result:{completed:false}});
    assertEqual(result.status,'cancelled','cancel closes');
    assertEqual(result.ticketsGranted,0,'no tickets for cancellation');
    assertEqual(JSON.stringify(readIslandRunGameStateRecord(session).minigameTicketsByEvent),JSON.stringify(before.minigameTicketsByEvent),'balances retained');
    const retry = (await begin())!; assert(retry.attemptId!==launch.attemptId,'new attempt ID');
    assertEqual((await settle(launch.attemptId)).status,'ineligible','late cancelled callback cannot complete new attempt');
  }},
  { name: 'wrong attempt and invalid game result cannot unlock or grant', async run() {
    await seed(); const launch=(await begin())!;
    assertEqual((await settle('wrong')).status,'ineligible','wrong attempt');
    assertEqual((await settle(launch.attemptId,{...played(),arenaPerformance:{...played().arenaPerformance,gameId:'other'}})).status,'invalid-result','wrong game');
    assertEqual((await settle(launch.attemptId,{...played(),arenaPerformance:{...played().arenaPerformance,durationMs:NaN}})).status,'invalid-result','invalid performance');
    assertEqual(resolveOpeningGamesCeremony(getIslandRunStateSnapshot(session).signatureMissionProgressByIsland).completedAtMs,null,'still incomplete');
  }},
  { name: 'ordinary event spend is blocked before the inaugural round even with saved tickets', async run() {
    await seed(); const state=getIslandRunStateSnapshot(session); const eventId=state.activeTimedEvent!.eventId;
    resetIslandRunStateSnapshot(session,{...state,minigameTicketsByEvent:{[eventId]:8}});
    assertEqual(applyTimedEventTicketSpend({session,client:null,eventId,ticketsToSpend:1}).spent,0,'canonical early spend blocked');
    assertEqual(getIslandRunStateSnapshot(session).minigameTicketsByEvent[eventId],8,'earned balance is not removed');
  }},
  { name: 'missing beacon, other islands and legacy saves cannot enter the inaugural flow', async run() {
    for(const overrides of [{signatureMissionProgressByIsland:createOpeningGamesCampaignLedger()},{currentIslandNumber:1},{currentIslandNumber:3},{signatureMissionProgressByIsland:{}}]) {
      const before=await seed(overrides); assertEqual(await begin(),null,'ineligible');
      assertEqual(getIslandRunStateSnapshot(session).runtimeVersion,before.runtimeVersion,'no write');
    }
  }},
];
