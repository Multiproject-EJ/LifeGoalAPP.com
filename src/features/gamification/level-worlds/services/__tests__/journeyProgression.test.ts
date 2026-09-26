import { deriveCombinedJourneyLevel as derive } from '../combinedJourneyLevel';
import { buildIslandJourneyMilestones as milestones, type IslandJourneyProgress } from '../islandJourneyMilestones';
import { buildDualTrackOverlayViewModel as view, buildJourneyLevelInputFromOverlay as input } from '../dualTrackOverlayAdapter';
import { readEarnedJourneyXp, recordEarnedJourneyXp, subscribeEarnedJourneyXp } from '../earnedJourneyXp';
import { persistCombinedJourneyProgress } from '../persistCombinedJourneyProgress';
import { combinedJourneyLevelTests } from './combinedJourneyLevel.test';
import { dualTrackOverlayAdapterTests } from './dualTrackOverlayAdapter.test';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage } from './testHarness';

function progress(island: number, cycle = 0, percent = 0, complete = false): IslandJourneyProgress {
  return { currentIslandNumber: island, cycleIndex: cycle, completion: { percent, complete } };
}
const xp = (p: IslandJourneyProgress) => derive(milestones(p)).xp;

// Simulates row filtering at statement execution (not a get-then-set mock).
function clientFixture(initialXp: number | null, failure = false, mirrorFailure = false) {
  let saved = initialXp;
  let league = initialXp;
  const operations: { table: string; owner?: string; cap?: number; update?: { combined_journey_xp: number } }[] = [];
  const client = {
    from(table: string) {
      const operation: typeof operations[number] = { table };
      operations.push(operation);
      const execute = () => {
        if (failure || (mirrorFailure && table === 'adventure_league_entries')) {
          return { data: null, error: new Error('Offline') };
        }
        assertEqual(operation.owner, 'persistence-owner', 'Every query scoped to authenticated owner');
        const current = table === 'gamification_profiles' ? saved : league;
        if (!operation.update) return { data: current === null ? null : { combined_journey_xp: current }, error: null };
        assertEqual(operation.cap, operation.update.combined_journey_xp, 'Conditional write guards against regression');
        if (current === null || current > operation.cap!) return { data: null, error: null };
        if (table === 'gamification_profiles') saved = operation.update.combined_journey_xp;
        else league = operation.update.combined_journey_xp;
        return { data: { combined_journey_xp: operation.update.combined_journey_xp }, error: null };
      };
      const query = {
        update(value: { combined_journey_xp: number }) { operation.update = value; return query; },
        eq(_key: string, owner: string) { operation.owner = owner; return query; },
        lte(_key: string, cap: number) { operation.cap = cap; return query; },
        select(_columns: string) { return query; },
        maybeSingle() { return Promise.resolve(execute()); },
        then(resolve: (value: ReturnType<typeof execute>) => unknown) { return Promise.resolve(execute()).then(resolve); },
      };
      return query;
    },
  };
  return {
    client: client as unknown as Parameters<typeof persistCombinedJourneyProgress>[0],
    stored: () => saved, league: () => league, operations,
  };
}

export async function runJourneyProgressionTests(): Promise<void> {
  for (const test of [...combinedJourneyLevelTests, ...dualTrackOverlayAdapterTests]) {
    await test.run();
  }
  let previous = 0;
  for (let cycle = 0; cycle < 3; cycle++) {
    for (let island = 1; island <= 120; island++) {
      for (const percent of [0, 10, 50, 99, 100]) {
        const earned = xp(progress(island, cycle, percent, percent === 100));
        assert(earned >= previous, 'Journey XP monotonic across completion, travel and cycles');
        previous = earned;
      }
    }
  }
  assertEqual(xp(progress(1, 0, 100, true)), 150, 'First clear grants first-voyage bonus immediately');
  assertEqual(xp(progress(2)), 150, 'Travel cannot double-credit first clear');
  assertEqual(xp(progress(120, 0, 100, true)), 12050, 'Final island counted before wrap');
  assertEqual(xp(progress(1, 1)), 12050, 'Wrap retains completed cycle');
  assertEqual(xp(progress(40)), 3950, 'Island 40 remains distinct from Journey level 40');
  assertEqual(xp(progress(NaN, NaN, Infinity)), 0, 'Corrupt input safe');

  const canonical = progress(38, 0, 95);
  const filled = derive(input({ islandJourneyProgress: canonical, rewardBarProgress: 10, rewardBarThreshold: 10 }));
  const claimed = derive(input({ islandJourneyProgress: canonical, rewardBarProgress: 0, rewardBarThreshold: 10 }));
  assertEqual(filled.xp, claimed.xp, 'Claim cannot change XP');
  const vm = view({ islandJourneyProgress: canonical, islandNumber: 1, islandDisplayName: 'Stale island', earnedXpFloor: 5000 });
  assertEqual(vm.gameProgress.currentIsland, 38, 'Canonical state overrides stale display island');
  assertEqual(vm.gameTrack[1].progressLabel, '95% current progress', 'Card shows canonical completion');
  assertEqual(vm.journeyLevel.level, derive({ earnedXpFloor: 5000 }).level, 'Spine shares earned XP');
  assertEqual(view({islandJourneyProgress:progress(120,0,100,true)}).gameProgress.collectedCount,120,'Final collectible counted');
  const withLife = derive({ ...milestones(progress(38)), completedGoals: 5, habitConsistencyScore: 8 });
  const withoutLife = derive({ ...milestones(progress(38)), earnedXpFloor: withLife.xp });
  assertEqual(withoutLife.xp, withLife.xp, 'Removing/loading life data cannot retract recorded XP');
  assert(withoutLife.retainedXp > 0, 'Retained XP is explicit in summary');
  for (const floor of [NaN, Infinity, -100]) assertEqual(derive({earnedXpFloor:floor}).xp,0,'Invalid floor rejected');

  const storage = createMemoryStorage();
  installWindowWithStorage(storage);
  const storageListeners = new Set<(event: StorageEvent) => void>();
  window.addEventListener = ((_type: string, cb: (event: StorageEvent) => void) => { storageListeners.add(cb); }) as typeof window.addEventListener;
  window.removeEventListener = ((_type: string, cb: (event: StorageEvent) => void) => { storageListeners.delete(cb); }) as typeof window.removeEventListener;
  let notifications = 0;
  const unsubscribe = subscribeEarnedJourneyXp('owner-a', () => { notifications++; });
  recordEarnedJourneyXp('owner-a', 5000);
  recordEarnedJourneyXp('owner-a', 10);
  assertEqual(readEarnedJourneyXp('owner-a'),5000,'Lower local writes cannot retract earned XP');
  assertEqual(readEarnedJourneyXp('owner-b'),0,'No cross-owner leakage');
  assertEqual(readEarnedJourneyXp(null),0,'Signed out has no checkpoint');
  assertEqual(notifications,1,'Notify only increasing checkpoints');
  storage.setItem('habitgame:journey:earned-xp:v1:owner-a','6000');
  storageListeners.forEach(cb => cb({key:'habitgame:journey:earned-xp:v1:owner-a'} as StorageEvent));
  assertEqual(readEarnedJourneyXp('owner-a'),6000,'Other-tab progress picked up');
  unsubscribe();
  assertEqual(storageListeners.size,0,'Listener cleanup');
  storage.setItem('habitgame:journey:earned-xp:v1:reload-owner','7000');
  assertEqual(readEarnedJourneyXp('reload-owner'),7000,'Saved checkpoint survives module memory loss');
  storage.setItem = () => { throw new Error('Storage blocked'); };
  recordEarnedJourneyXp('private-owner', 80);
  assertEqual(readEarnedJourneyXp('private-owner'),80,'Memory fallback when browser storage fails');

  const fresh = clientFixture(0);
  const saved = await persistCombinedJourneyProgress(fresh.client,'persistence-owner',{islandsCompleted:39});
  assert(saved.persisted && saved.xp === 3950,'Profile checkpoint persisted');
  assertEqual(fresh.league(),3950,'Existing league mirrored');
  const stale = await persistCombinedJourneyProgress(fresh.client,'persistence-owner',{islandsCompleted:1});
  assertEqual(stale.xp,3950,'Stale write returns winning checkpoint');
  assertEqual(fresh.stored(),3950,'Stale write cannot reduce profile XP');
  const race = clientFixture(0);
  await Promise.all([7000,3000,9000,100].map(earnedXpFloor =>
    persistCombinedJourneyProgress(race.client,'persistence-owner',{earnedXpFloor})));
  assertEqual(race.stored(),9000,'Concurrent filtered updates retain maximum');
  assertEqual(race.league(),9000,'Concurrent league mirrors retain maximum');
  const missing = clientFixture(null);
  assertEqual((await persistCombinedJourneyProgress(missing.client,'persistence-owner',{})).persisted,false,'Missing/RLS-invisible row not reported saved');
  const offline = clientFixture(0,true);
  assertEqual((await persistCombinedJourneyProgress(offline.client,'persistence-owner',{})).persisted,false,'Network failure non-fatal');
  const mirrorFail = clientFixture(0,false,true);
  assert((await persistCombinedJourneyProgress(mirrorFail.client,'persistence-owner',{earnedXpFloor:200})).persisted,'League failure does not invalidate saved profile');
  console.log('journey-progression: existing derivation/adapter suites; 1,800 cycle transitions; canonical completion, reward claims, owner isolation, storage fallback and filtered persistence passed');
}
