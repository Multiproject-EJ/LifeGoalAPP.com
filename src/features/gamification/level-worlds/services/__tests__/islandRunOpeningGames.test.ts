import {
  OPENING_GAMES_CAMPAIGN_KEY as CAMPAIGN, OPENING_GAMES_CEREMONY_KEY as CEREMONY,
  advanceOpeningGamesForRoll, advanceOpeningGamesPreparation, beginOpeningGamesInauguralRound,
  createOpeningGamesCampaignMarker, createOpeningGamesCeremonyProgress,
  mergeOpeningGamesCeremonyProgress, resolveOpeningGamesAccess, resolveOpeningGamesContentIsland,
  sanitizeOpeningGamesCeremonyProgress, settleOpeningGamesInauguralRound, usesOpeningGamesCampaign,
  type OpeningGamesCeremonyProgress,
} from '../islandRunOpeningGames';
import { advanceCelestialRedockingForRoll, createOpeningGamesCampaignLedger,
  mergeIslandRunSignatureMissionProgress, normalizeExistingCampaignMissionLedger,
  resolveCelestialRedockingProgress, sanitizeIslandRunSignatureMissionProgress } from '../islandRunSignatureMissions';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

const marker = createOpeningGamesCampaignMarker('opening-games-v1');
const ready = (): OpeningGamesCeremonyProgress => ({
  ...createOpeningGamesCeremonyProgress(), rollsCompleted: 12,
  venuesPreparedAtMs: 1, teamsWelcomedAtMs: 2, beaconLitAtMs: 3, updatedAtMs: 3,
});
const ledger = (p = ready()) => ({ [CAMPAIGN]: marker, [CEREMONY]: p });

export const islandRunOpeningGamesTests: TestCase[] = [
  { name: 'missing marker preserves legacy order and event access', run() {
    assert(!usesOpeningGamesCampaign({}), 'missing is legacy');
    assertEqual(resolveOpeningGamesContentIsland({}, 2), 2, 'old sky stays');
    assert(resolveOpeningGamesAccess({}, 1).ordinaryEvents, 'earned access stays');
    assert(!usesOpeningGamesCampaign(normalizeExistingCampaignMissionLedger({})), 'existing empty record is legacy');
  }},
  { name: 'explicit cohort swaps content only and blocks normal games until ceremony', run() {
    const l = createOpeningGamesCampaignLedger();
    assertEqual(resolveOpeningGamesContentIsland(l, 2), 4, 'new palace');
    assertEqual(resolveOpeningGamesContentIsland(l, 4), 2, 'new sky');
    assertEqual(resolveOpeningGamesContentIsland(l, 3), 3, 'others unchanged');
    assert(resolveOpeningGamesAccess(l, 1).orientation, 'orientation available');
    assert(!resolveOpeningGamesAccess(l, 2).ordinaryEvents, 'normal events blocked');
    assert(!resolveOpeningGamesAccess(l, 2).inauguralRound, 'beacon required');
  }},
  { name: 'sanitizer round-trip preserves distinct marker and ceremony keys', run() {
    const l = ledger();
    assertDeepEqual(sanitizeIslandRunSignatureMissionProgress(JSON.parse(JSON.stringify(l))), l, 'round-trip');
    assertDeepEqual(sanitizeIslandRunSignatureMissionProgress({'0:2':marker}), {}, 'marker cannot replace ordinary mission');
    assertDeepEqual(sanitizeIslandRunSignatureMissionProgress({'0:2':ready()}), {}, 'ceremony cannot replace sky ledger');
  }},
  { name: 'legacy wins cohort conflicts without moving or dropping earned mission data', run() {
    const old = normalizeExistingCampaignMissionLedger({});
    const next = ledger();
    const merged = mergeIslandRunSignatureMissionProgress(old, next);
    assert(!usesOpeningGamesCampaign(merged), 'legacy authoritative');
    assertEqual(merged[CEREMONY]?.missionId, 'host-the-first-games', 'ceremony not erased');
    assertDeepEqual(mergeIslandRunSignatureMissionProgress(next, old), merged, 'commutative cohort');
  }},
  { name: 'preparation requires the welcome venue and Arena at L1, then twelve canonical rolls', run() {
    let l = ledger(createOpeningGamesCeremonyProgress());
    const action = (name: 'prepare-venues'|'welcome-teams'|'light-beacon', builds = [3,3,1,0,0]) =>
      advanceOpeningGamesPreparation({ledger:l,islandNumber:2,action:name,buildLevels:builds,nowMs:20});
    assertEqual(action('light-beacon').status, 'previous-step-required', 'ordered');
    assertEqual(action('prepare-venues',[3,3,0,0,0]).status, 'builds-required', 'Arena needs its first funded level');
    assertEqual(action('prepare-venues',[0,3,1,0,0]).status, 'builds-required', 'welcome venue must exist too');
    l = ledger(action('prepare-venues').progress);
    assertEqual(action('welcome-teams').status, 'teams-required', 'rolls required');
    for(let i=0;i<12;i++) l = ledger(advanceOpeningGamesForRoll(l,2,30+i)!);
    assertEqual(advanceOpeningGamesForRoll(l,2,44), null, 'rolls capped');
    l = ledger(action('welcome-teams').progress);
    l = ledger(action('light-beacon').progress);
    assert(resolveOpeningGamesAccess(l,2).inauguralRound, 'inaugural unlocked without external event');
    assert(!resolveOpeningGamesAccess(l,2).ordinaryEvents, 'not completed prematurely');
  }},
  { name: 'only exact active inaugural result completes ceremony; duplicates are inert', run() {
    const active = beginOpeningGamesInauguralRound(ledger(),2,'attempt-a',4)!;
    const settle = (gameId: string, attemptId: string) => settleOpeningGamesInauguralRound({
      ledger:ledger(active),islandNumber:2,attemptId,gameId,outcome:'won',nowMs:5});
    assertEqual(settle('other','attempt-a'),null,'wrong game');
    assertEqual(settle('signal_path','attempt-b'),null,'wrong attempt');
    const completed = settle('signal_path','attempt-a')!;
    assertEqual(completed.completedAtMs,5,'verified win');
    assert(resolveOpeningGamesAccess(ledger(completed),2).ordinaryEvents,'events available');
    assert(resolveOpeningGamesAccess(ledger(completed),17).ordinaryEvents,'account-wide later access');
    assertEqual(settleOpeningGamesInauguralRound({ledger:ledger(completed),islandNumber:2,
      attemptId:'attempt-a',gameId:'signal_path',outcome:'won',nowMs:6}),null,'duplicate');
  }},
  { name: 'participation completes the introduction even on a loss; cancellation permits a fresh retry', run() {
    for(const outcome of ['lost','cancelled'] as const) {
      const active=beginOpeningGamesInauguralRound(ledger(),2,'a',4)!;
      const result=settleOpeningGamesInauguralRound({ledger:ledger(active),islandNumber:2,
        attemptId:'a',gameId:'signal_path',outcome,nowMs:5})!;
      assertEqual(result.completedAtMs,outcome==='lost'?5:null,'a played round is enough, closing is not');
      assertEqual(beginOpeningGamesInauguralRound(ledger(result),2,'a',6),null,'cannot relaunch settled ID');
      assertEqual(Boolean(beginOpeningGamesInauguralRound(ledger(result),2,'b',6)),outcome==='cancelled','only cancellation needs a retry');
    }
  }},
  { name: 'duplicate begin resumes same ID; different active ID is rejected', run() {
    const active=beginOpeningGamesInauguralRound(ledger(),2,'a',4)!;
    assertDeepEqual(beginOpeningGamesInauguralRound(ledger(active),2,'a',5),active,'same ID resumes');
    assertEqual(beginOpeningGamesInauguralRound(ledger(active),2,'b',5),null,'different ID rejected');
    assertEqual(beginOpeningGamesInauguralRound(ledger(),4,'a',4),null,'only island2');
  }},
  { name: 'merge is commutative and idempotent for tied attempts and ticket markers', run() {
    const a={...ready(),activeAttemptId:'a',updatedAtMs:4};
    const b={...ready(),activeAttemptId:'b',updatedAtMs:4};
    assertDeepEqual(mergeOpeningGamesCeremonyProgress(a,b),mergeOpeningGamesCeremonyProgress(b,a),'tied attempts');
    assertDeepEqual(mergeOpeningGamesCeremonyProgress(a,a),a,'idempotent');
    const c={...a,activeAttemptId:null,completedAtMs:5,firstTicketBoostEventId:'event-b'};
    const d={...b,activeAttemptId:null,completedAtMs:6,firstTicketBoostEventId:'event-a'};
    assertDeepEqual(mergeOpeningGamesCeremonyProgress(c,d),mergeOpeningGamesCeremonyProgress(d,c),'ticket markers');
  }},
  { name: 'more than 64 tombstones never resurrects a cancelled attempt after stale merge', run() {
    const active={...ready(),activeAttemptId:'a-new',settledAttemptIds:Array.from({length:64},(_,i)=>'z-'+i),updatedAtMs:4};
    const cancelled=settleOpeningGamesInauguralRound({ledger:ledger(active),islandNumber:2,
      attemptId:'a-new',gameId:'signal_path',outcome:'cancelled',nowMs:5})!;
    const merged=mergeOpeningGamesCeremonyProgress(cancelled,{...active,updatedAtMs:6});
    assertEqual(merged.activeAttemptId,null,'tombstone wins newer stale active');
    assert(merged.settledAttemptIds.includes('a-new'),'cancellation retained');
  }},
  { name: 'malformed milestone prerequisites cannot unlock games', run() {
    const malformed=sanitizeOpeningGamesCeremonyProgress({...ready(),rollsCompleted:0,completedAtMs:4});
    assertEqual(malformed.teamsWelcomedAtMs,null,'roll prerequisite');
    assertEqual(malformed.completedAtMs,null,'later stages cleared');
    assert(!resolveOpeningGamesAccess(ledger(malformed),2).ordinaryEvents,'blocked');
  }},
  { name: 'celestial default read and accepted rolls follow explicit cohort only', run() {
    const v2=advanceCelestialRedockingForRoll({ledger:createOpeningGamesCampaignLedger(),islandNumber:4,cycleIndex:0,nowMs:10});
    assertEqual(resolveCelestialRedockingProgress({ledger:v2.ledger,cycleIndex:0}).rollsCompleted,1,'new default4');
    assertEqual(advanceCelestialRedockingForRoll({ledger:v2.ledger,islandNumber:2,cycleIndex:0,nowMs:11}).rollsCompleted,0,'palace not sky');
    const old=advanceCelestialRedockingForRoll({ledger:{},islandNumber:2,cycleIndex:0,nowMs:10});
    assertEqual(resolveCelestialRedockingProgress({ledger:old.ledger,cycleIndex:0}).rollsCompleted,1,'legacy default2');
  }},
];
