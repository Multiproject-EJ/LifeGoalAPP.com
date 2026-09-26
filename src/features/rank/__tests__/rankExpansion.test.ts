import { RANKS, rankForLevelAndService } from '../rankModel';
import { buildExpandedRankLadder, EXPANDED_RANK_CANDIDATES, expandedRankForJourney, expandedAnchorForLegacyRankId } from '../rankExpansion';
import { rankBadgeSrc, rankBadgeVariantForSize } from '../rankAssets';
import { cumulativeXpForLevel, deriveCombinedJourneyLevel } from '../../gamification/level-worlds/services/combinedJourneyLevel';
import { buildJourneyLevelInputFromOverlay } from '../../gamification/level-worlds/services/dualTrackOverlayAdapter';
import { assert, assertEqual } from '../../gamification/level-worlds/services/__tests__/testHarness';
import { resolveWorldPortalAccess, canOpenWorkspaceWithWorldPortal, type WorldPortalAccessInput } from '../../onboarding/worldPortalAccess';

const oldAccount = '2020-01-01T00:00:00Z';
const nowMs = Date.parse('2026-09-26T12:00:00Z');
const resolve = (xp: number, accountCreatedAt: string | null = oldAccount) => expandedRankForJourney({ xp, accountCreatedAt, nowMs });

export function runRankExpansionTests(): void {
  const ranks = EXPANDED_RANK_CANDIDATES;
  assertEqual(ranks.length, 36, '36 candidate ranks');
  assertEqual(new Set(ranks.map(r => r.key)).size, 36, 'Unique stable keys');
  assert(Object.isFrozen(ranks) && ranks.every(Object.isFrozen), 'Immutable candidate ladder');
  ranks.forEach((r, i) => {
    assertEqual(r.ordinal, i + 1, 'Sequential V2 ordinals');
    assertEqual(r.systemVersion, 2, 'Explicit model version');
    assert(!('id' in r), 'V2 ordinals cannot masquerade as legacy IDs');
  });
  for (const family of RANKS) {
    const anchor = expandedAnchorForLegacyRankId(family.id)!;
    const xp = cumulativeXpForLevel(family.minLevel);
    assertEqual(anchor.minJourneyXp, xp, 'Existing family XP floor preserved');
    assertEqual(anchor.minServiceYears, family.minServiceYears, 'Existing age requirement preserved');
    assertEqual(resolve(xp).familyId, family.id, 'Old family still earned at old boundary');
    assertEqual(rankForLevelAndService(family.minLevel, oldAccount, nowMs).id, anchor.familyId, 'V1/V2 family agreement');
  }
  const scheduled = ranks.filter(r => r.minJourneyXp !== null);
  for (let i = 1; i < scheduled.length; i++) {
    const previous = scheduled[i - 1], current = scheduled[i];
    assert(current.minJourneyXp! > previous.minJourneyXp!, 'Strictly ascending XP');
    assertEqual(resolve(current.minJourneyXp!).ordinal, current.ordinal, 'Inclusive threshold');
    assertEqual(resolve(current.minJourneyXp! - 1).ordinal, previous.ordinal, 'Below-threshold boundary');
  }
  assertEqual(resolve(0).key, 'deckhand-1', 'Starter');
  assertEqual(resolve(49).key, 'deckhand-1', 'Below stage II');
  assertEqual(resolve(50).key, 'deckhand-2', 'Stage II within level 1');
  assertEqual(resolve(100).key, 'deckhand-3', 'Stage III within level 1');
  assertEqual(resolve(150).key, 'crewmate-1', 'First island still reaches Crewmate');
  for (const xp of [NaN, Infinity, -1]) assertEqual(resolve(xp).ordinal, 1, 'Safe invalid XP');
  assertEqual(resolve(1e6, null).familyKey, 'wing-commander', 'Guest cannot bypass age gate');
  assertEqual(resolve(1e6).key, 'sky-marshal-1', 'Unresolved endgame stages are not automatically granted');
  assertEqual(ranks.filter(r => r.thresholdStatus === 'unresolved').length, 2, 'Two endgame decisions remain explicit');
  const endgameStageXp = [150000, 160000] as const; // Test fixture, NOT proposed production balance.
  assertEqual(buildExpandedRankLadder(endgameStageXp)[35].minJourneyXp, 160000, 'Explicit endgame configuration');
  assertEqual(expandedRankForJourney({ xp:160000, accountCreatedAt:oldAccount, nowMs, endgameStageXp }).ordinal,36,'Configured top boundary');
  for (const invalid of [[1,2],[160000,150000],[150000,150000],[NaN,160000],[150000,Infinity]]) {
    let threw = false;
    try { buildExpandedRankLadder(invalid as [number,number]); } catch { threw = true; }
    assert(threw, 'Reject invalid endgame curve');
  }
  for (const id of [0,13,1.5,NaN]) assertEqual(expandedAnchorForLegacyRankId(id),undefined,'Reject invalid old ID');
  assertEqual(expandedAnchorForLegacyRankId(12)?.ordinal,34,'V1 rank 12 maps to V2 34, not V2 12');
  assert(rankBadgeSrc(1,'pin') !== rankBadgeSrc(1,'medal'),'Deckhand has distinct paired assets');
  assert(!rankBadgeSrc(1)!.includes('1_deckhand.png'),'Rejected knot no longer used for Deckhand');
  assertEqual(rankBadgeSrc(2,'pin'),rankBadgeSrc(2,'medal'),'Unfinished family retains existing asset');
  for (const size of [24,32,48]) assertEqual(rankBadgeVariantForSize(size),'pin','Compact UI uses pin');
  for (const size of [64,96,280,NaN,-1]) assertEqual(rankBadgeVariantForSize(size),'medal','Large/invalid sizes use medal');

  // Reward-bar claims must not affect Journey progression.
  const before = deriveCombinedJourneyLevel(buildJourneyLevelInputFromOverlay({islandNumber:38,rewardBarProgress:10,rewardBarThreshold:10}));
  const after = deriveCombinedJourneyLevel(buildJourneyLevelInputFromOverlay({islandNumber:38,rewardBarProgress:0,rewardBarThreshold:10}));
  assertEqual(before.level,12,'Reward fill is not island completion');
  assertEqual(after.xp,before.xp,'Reward-bar reset cannot retract XP');
  const arrival40 = deriveCombinedJourneyLevel(buildJourneyLevelInputFromOverlay({islandNumber:40}));
  assertEqual(arrival40.xp,3950,'Island 40 arrival XP');
  assertEqual(arrival40.level,13,'Island 40 arrival is not player level 40');
  assertEqual(cumulativeXpForLevel(40),28080,'Journey level 40 has a separate XP threshold');
  const portalInput: WorldPortalAccessInput = {
    highestReachedIsland:1, hasEarnedPortal:false, isVerifiedDeveloper:false,
    hasVerifiedEarlyAccess:false,
  };
  for (const island of [1,39,NaN,Infinity,-1]) {
    const access=resolveWorldPortalAccess({...portalInput,highestReachedIsland:island});
    assertEqual(access.startSurface,'game','Pre-portal game-first entry');
    assertEqual(access.canClaimPortal,false,'No early council grant');
    assertEqual(access.canLeaveGameForToday,false,'No full-app exit before unlock');
    assertEqual(access.canOpenAccountPrivacySupport,true,'Essential controls stay accessible');
    assertEqual(access.recoveryMode,'reload-preserving-progress','Recovery is not data reset');
  }
  for (const island of [40,41,120,121]) {
    const access=resolveWorldPortalAccess({...portalInput,highestReachedIsland:island});
    assertEqual(access.reason,'council-ready','Island 40 and later invite council');
    assertEqual(access.canClaimPortal,true,'Catch-up handover remains available');
    assertEqual(access.startSurface,'game','Eligibility alone does not falsely record gift');
  }
  for (const grant of ['hasEarnedPortal','isVerifiedDeveloper','hasVerifiedEarlyAccess'] as const) {
    const access=resolveWorldPortalAccess({...portalInput,[grant]:true});
    assertEqual(access.startSurface,'today','Trusted access opens Today');
    assertEqual(access.canOpenFullApp,true,'Full app access');
    assertEqual(access.canClaimPortal,false,'Access override does not grant island 40 progress');
  }
  assertEqual(resolveWorldPortalAccess({...portalInput,highestReachedIsland:40,hasEarnedPortal:true}).canClaimPortal,false,'Already earned portal cannot be re-claimed');
  assertEqual(resolveWorldPortalAccess({...portalInput,highestReachedIsland:1,hasEarnedPortal:true}).startSurface,'today','Portal ownership survives cycle wrap');
  const lockedAccess = resolveWorldPortalAccess(portalInput);
  for (const workspace of ['game','account','support']) assert(canOpenWorkspaceWithWorldPortal(lockedAccess,workspace),'Essential workspace remains reachable');
  for (const workspace of ['planning','habits','goals','journal','actions']) assert(!canOpenWorkspaceWithWorldPortal(lockedAccess,workspace),'Menu/deep-link gate has one policy');
  console.log('world-portal: island boundaries, gated ordinary players, dev/paid access, catch-up, replay and non-destructive recovery policy passed (not yet wired to runtime)');
  console.log('rank-expansion: 36-rank boundaries, 12 preserved anchors, age gates, explicit endgame, asset variants and reward reset invariance passed');
}
