/**
 * Fortune Engine progression tests: launch/golden-launch gating, the 3×3
 * Fortune Core fragment grid, reward-track milestones + view model, run
 * folding, and finale unlock rules.
 */
import {
  applyFortuneRunToProgress,
  awardFortuneCoreFragments,
  buildFortuneEngineTrackViewModel,
  canLaunchFortuneEngine,
  createFortuneEngineProgress,
  FORTUNE_CORE_FRAGMENT_COUNT,
  FORTUNE_CORE_FRAGMENTS,
  FORTUNE_ENGINE_LAUNCH_TICKET_COST,
  FORTUNE_ENGINE_MILESTONES,
  FORTUNE_ENGINE_TRACK_TOTAL_POINTS,
  FORTUNE_FRAGMENT_PITY_RUNS,
  FORTUNE_GOLDEN_STREAK_MULTIPLIER_BONUS,
  FORTUNE_GOLDEN_STREAK_MULTIPLIER_MIN_DAYS,
  FORTUNE_GOLDEN_STREAK_SHIELD_MIN_DAYS,
  getFortuneEngineDayKey,
  getFortuneEngineMilestone,
  getNextFortuneCoreFragmentId,
  getNextFortuneEngineMilestone,
  isFortuneCoreComplete,
  isFortuneFinaleUnlocked,
  isFortuneGoldenLaunchAvailable,
  resolveFortuneCoreFragmentIds,
  resolveFortuneEngineClaimedMilestoneIds,
  resolveGoldenStreakPerks,
  resolveNextGoldenLaunchStreak,
} from '../fortuneEngineProgression';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

const NOW_MS = Date.UTC(2026, 6, 10, 12, 0, 0);

export const fortuneEngineProgressionTests: TestCase[] = [
  {
    name: 'launch gating: golden launch is free, ticket launches need a ticket',
    run: () => {
      assertEqual(FORTUNE_ENGINE_LAUNCH_TICKET_COST, 1, 'each launch should cost one ticket');
      assertEqual(
        canLaunchFortuneEngine({ ticketsRemaining: 0, goldenLaunchAvailable: true }),
        true,
        'golden launch should open with zero tickets',
      );
      assertEqual(
        canLaunchFortuneEngine({ ticketsRemaining: 0, goldenLaunchAvailable: false }),
        false,
        'no golden launch and no tickets should block',
      );
      assertEqual(
        canLaunchFortuneEngine({ ticketsRemaining: 1, goldenLaunchAvailable: false }),
        true,
        'one ticket should allow a launch',
      );
      assertEqual(
        canLaunchFortuneEngine({ ticketsRemaining: Number.NaN, goldenLaunchAvailable: false }),
        false,
        'invalid ticket counts should block',
      );
    },
  },
  {
    name: 'golden launch availability follows the local day key',
    run: () => {
      const fresh = createFortuneEngineProgress(NOW_MS);
      assertEqual(isFortuneGoldenLaunchAvailable(fresh, NOW_MS), true, 'fresh progress should offer the golden launch');
      const usedToday = { ...fresh, goldenLaunchDayKey: getFortuneEngineDayKey(NOW_MS) };
      assertEqual(isFortuneGoldenLaunchAvailable(usedToday, NOW_MS), false, 'same-day golden launch should be spent');
      const nextDayMs = NOW_MS + 24 * 60 * 60 * 1000;
      assertEqual(isFortuneGoldenLaunchAvailable(usedToday, nextDayMs), true, 'golden launch should reset the next day');
      assertEqual(isFortuneGoldenLaunchAvailable(null, NOW_MS), true, 'missing progress should default to available');
    },
  },
  {
    name: 'fragment ledger normalizes ids and fills the lowest missing slot first',
    run: () => {
      assertEqual(FORTUNE_CORE_FRAGMENTS.length, FORTUNE_CORE_FRAGMENT_COUNT, 'nine designed fragments');
      assertDeepEqual(
        resolveFortuneCoreFragmentIds([3, 3, -1, 99, 0.5, 1, Number.NaN]),
        [0, 1, 3],
        'fragment ids should be deduped, clamped, floored, and sorted',
      );
      assertEqual(getNextFortuneCoreFragmentId({ fragmentIds: [] }), 0, 'first fragment is slot 0');
      assertEqual(getNextFortuneCoreFragmentId({ fragmentIds: [0, 1, 3] }), 2, 'next fragment is the lowest missing slot');
      assertEqual(
        getNextFortuneCoreFragmentId({ fragmentIds: [0, 1, 2, 3, 4, 5, 6, 7, 8] }),
        null,
        'a full grid awards no further fragments',
      );
      assertEqual(isFortuneCoreComplete({ fragmentIds: [0, 1, 2, 3, 4, 5, 6, 7, 8] }), true, 'nine fragments complete the core');
      assertEqual(isFortuneCoreComplete({ fragmentIds: [0, 1, 2] }), false, 'partial grids are incomplete');
    },
  },
  {
    name: 'applyFortuneRunToProgress accumulates points, best score, and fragments',
    run: () => {
      const fresh = createFortuneEngineProgress(NOW_MS);
      const first = applyFortuneRunToProgress({
        progress: fresh,
        runScore: 120,
        eventPoints: 120,
        fragmentAwarded: true,
        nowMs: NOW_MS + 1000,
      });
      assertEqual(first.progress.eventPoints, 120, 'event points should accumulate');
      assertEqual(first.progress.bestRunScore, 120, 'best score should update');
      assertEqual(first.awardedFragmentId, 0, 'first fragment run should light slot 0');
      assertEqual(first.coreJustCompleted, false, 'one fragment does not complete the core');
      assertEqual(fresh.eventPoints, 0, 'run folding must not mutate the input');

      const second = applyFortuneRunToProgress({
        progress: first.progress,
        runScore: 60,
        eventPoints: 60,
        fragmentAwarded: false,
        nowMs: NOW_MS + 2000,
      });
      assertEqual(second.progress.eventPoints, 180, 'points keep accumulating');
      assertEqual(second.progress.bestRunScore, 120, 'a lower run should not lower the best score');
      assertEqual(second.awardedFragmentId, null, 'no fragment without an award');

      const nearComplete = {
        ...second.progress,
        fragmentIds: [0, 1, 2, 3, 4, 5, 6, 7],
      };
      const completing = applyFortuneRunToProgress({
        progress: nearComplete,
        runScore: 10,
        eventPoints: 10,
        fragmentAwarded: true,
        nowMs: NOW_MS + 3000,
      });
      assertEqual(completing.awardedFragmentId, 8, 'the ninth fragment fills the final slot');
      assertEqual(completing.coreJustCompleted, true, 'the ninth fragment completes the core');
    },
  },
  {
    name: 'milestone ladder climbs strictly and normalizes claimed ids',
    run: () => {
      for (let i = 1; i < FORTUNE_ENGINE_MILESTONES.length; i += 1) {
        assert(
          FORTUNE_ENGINE_MILESTONES[i].pointsRequired > FORTUNE_ENGINE_MILESTONES[i - 1].pointsRequired,
          `milestone ${i + 1} should require more points than milestone ${i}`,
        );
      }
      assertEqual(
        FORTUNE_ENGINE_TRACK_TOTAL_POINTS,
        FORTUNE_ENGINE_MILESTONES[FORTUNE_ENGINE_MILESTONES.length - 1].pointsRequired,
        'track total should equal the final milestone',
      );
      assert(
        FORTUNE_ENGINE_MILESTONES.some((milestone) => (milestone.reward.eventTickets ?? 0) > 0),
        'the reward track should return event tickets somewhere',
      );
      assertEqual(getFortuneEngineMilestone('fortune_1')?.pointsRequired, 60, 'milestone lookup by id');
      assertEqual(getFortuneEngineMilestone('nope'), null, 'unknown milestone ids return null');
      assertEqual(
        getNextFortuneEngineMilestone({ eventPoints: 120 })?.id,
        'fortune_2',
        'next milestone should be the first unreached one',
      );
      assertDeepEqual(
        resolveFortuneEngineClaimedMilestoneIds({ claimedMilestoneIds: ['fortune_2', 'bogus', 'fortune_1', 'fortune_2'] }),
        ['fortune_1', 'fortune_2'],
        'claimed ids should drop unknowns, dedupe, and sort by milestone order',
      );
    },
  },
  {
    name: 'track view model reports claimable/claimed/upcoming states',
    run: () => {
      const progress = {
        ...createFortuneEngineProgress(NOW_MS),
        eventPoints: 200,
        claimedMilestoneIds: ['fortune_1'],
      };
      const track = buildFortuneEngineTrackViewModel(progress);
      assertEqual(track.eventPoints, 200, 'view model should carry the points');
      assertEqual(track.nodes[0].state, 'claimed', 'claimed milestones report claimed');
      assertEqual(track.nodes[1].state, 'claimable', 'reached milestones report claimable');
      assertEqual(track.nodes[2].state, 'upcoming', 'unreached milestones report upcoming');
      assertEqual(track.claimableCount, 1, 'one milestone should be claimable');
      assert(track.fillRatio > 0 && track.fillRatio < 1, 'fill ratio should be partial');
      assertEqual(buildFortuneEngineTrackViewModel(null).eventPoints, 0, 'missing progress renders an empty track');
    },
  },
  {
    name: 'pity counter drops a free fragment after enough fragmentless runs',
    run: () => {
      let progress = createFortuneEngineProgress(NOW_MS);
      for (let run = 1; run < FORTUNE_FRAGMENT_PITY_RUNS; run += 1) {
        const result = applyFortuneRunToProgress({
          progress,
          runScore: 10,
          eventPoints: 10,
          fragmentAwarded: false,
          nowMs: NOW_MS + run,
        });
        assertEqual(result.awardedFragmentId, null, `run ${run} should not award a fragment yet`);
        assertEqual(result.progress.fragmentPityCount, run, 'pity should count fragmentless runs');
        progress = result.progress;
      }
      const pityRun = applyFortuneRunToProgress({
        progress,
        runScore: 10,
        eventPoints: 10,
        fragmentAwarded: false,
        nowMs: NOW_MS + 100,
      });
      assertEqual(pityRun.awardedFragmentId, 0, 'the pity run should drop the next missing fragment');
      assertEqual(pityRun.pityFragment, true, 'the award should be flagged as pity');
      assertEqual(pityRun.progress.fragmentPityCount, 0, 'pity should reset after the drop');

      const earned = applyFortuneRunToProgress({
        progress: { ...pityRun.progress, fragmentPityCount: 2 },
        runScore: 10,
        eventPoints: 10,
        fragmentAwarded: true,
        nowMs: NOW_MS + 200,
      });
      assertEqual(earned.pityFragment, false, 'an earned fragment is not pity');
      assertEqual(earned.progress.fragmentPityCount, 0, 'an earned fragment resets the pity counter');

      const fullCore = {
        ...createFortuneEngineProgress(NOW_MS),
        fragmentIds: [0, 1, 2, 3, 4, 5, 6, 7, 8],
        fragmentPityCount: FORTUNE_FRAGMENT_PITY_RUNS - 1,
      };
      const afterComplete = applyFortuneRunToProgress({
        progress: fullCore,
        runScore: 10,
        eventPoints: 10,
        fragmentAwarded: false,
        nowMs: NOW_MS + 300,
      });
      assertEqual(afterComplete.awardedFragmentId, null, 'a complete core needs no pity fragments');
    },
  },
  {
    name: 'milestone track includes fragment rewards and awardFortuneCoreFragments fills lowest slots',
    run: () => {
      const fragmentMilestones = FORTUNE_ENGINE_MILESTONES.filter((milestone) => (milestone.reward.coreFragments ?? 0) > 0);
      assert(fragmentMilestones.length >= 2, 'the reward track should hand out at least two fragments');

      const award = awardFortuneCoreFragments([0, 2], 2);
      assertDeepEqual(award.awardedIds, [1, 3], 'awards should fill the lowest missing slots');
      assertDeepEqual(award.fragmentIds, [0, 1, 2, 3], 'the ledger should merge and stay sorted');

      const full = awardFortuneCoreFragments([0, 1, 2, 3, 4, 5, 6, 7, 8], 3);
      assertDeepEqual(full.awardedIds, [], 'a complete core absorbs no further fragments');
      assertEqual(awardFortuneCoreFragments([], 0).awardedIds.length, 0, 'zero-count awards do nothing');
    },
  },
  {
    name: 'golden launch streaks extend on consecutive days and unlock perks at 3 and 5',
    run: () => {
      const dayMs = 24 * 60 * 60 * 1000;
      const fresh = createFortuneEngineProgress(NOW_MS);
      assertEqual(resolveNextGoldenLaunchStreak(fresh, NOW_MS), 1, 'the first golden launch starts a streak of 1');

      const yesterday = {
        ...fresh,
        goldenLaunchDayKey: getFortuneEngineDayKey(NOW_MS - dayMs),
        goldenStreakCount: 3,
      };
      assertEqual(resolveNextGoldenLaunchStreak(yesterday, NOW_MS), 4, 'a golden launch the day after extends the streak');

      const lapsed = {
        ...fresh,
        goldenLaunchDayKey: getFortuneEngineDayKey(NOW_MS - 3 * dayMs),
        goldenStreakCount: 6,
      };
      assertEqual(resolveNextGoldenLaunchStreak(lapsed, NOW_MS), 1, 'a missed day restarts the streak');

      const none = resolveGoldenStreakPerks(FORTUNE_GOLDEN_STREAK_MULTIPLIER_MIN_DAYS - 1);
      assertEqual(none.startMultiplierBonus, 0, 'short streaks earn no multiplier bonus');
      assertEqual(none.hazardShields, 0, 'short streaks earn no shield');

      const boosted = resolveGoldenStreakPerks(FORTUNE_GOLDEN_STREAK_MULTIPLIER_MIN_DAYS);
      assertEqual(boosted.startMultiplierBonus, FORTUNE_GOLDEN_STREAK_MULTIPLIER_BONUS, 'day-3 streaks add the multiplier bonus');
      assertEqual(boosted.hazardShields, 0, 'the shield needs a longer streak');

      const shielded = resolveGoldenStreakPerks(FORTUNE_GOLDEN_STREAK_SHIELD_MIN_DAYS);
      assertEqual(shielded.startMultiplierBonus, FORTUNE_GOLDEN_STREAK_MULTIPLIER_BONUS, 'day-5 streaks keep the multiplier bonus');
      assertEqual(shielded.hazardShields, 1, 'day-5 streaks add a hazard shield');
    },
  },
  {
    name: 'finale unlocks with a complete core and closes after completion',
    run: () => {
      const fresh = createFortuneEngineProgress(NOW_MS);
      assertEqual(isFortuneFinaleUnlocked(fresh), false, 'no fragments, no finale');
      const complete = { ...fresh, fragmentIds: [0, 1, 2, 3, 4, 5, 6, 7, 8] };
      assertEqual(isFortuneFinaleUnlocked(complete), true, 'a full core unlocks the finale');
      const done = { ...complete, finaleCompleted: true };
      assertEqual(isFortuneFinaleUnlocked(done), false, 'a stabilised core closes the finale');
      assertEqual(isFortuneFinaleUnlocked(null), false, 'missing progress never unlocks the finale');
    },
  },
];
