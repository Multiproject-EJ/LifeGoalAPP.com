/**
 * Fortune Engine game-rule tests: route wheel weighting/lookup, ring
 * construction (route adjustments, determinism), tap resolution, run-outcome
 * folding (bank / go deeper / crushed), and finale target selection.
 */
import {
  buildFortuneRing,
  FORTUNE_CHALLENGE_MODES,
  FORTUNE_ECHO_PREVIEW_MS,
  FORTUNE_FINALE_TARGET_COUNT,
  FORTUNE_NEW_BEST_EVENT_BONUS_RATIO,
  FORTUNE_PERFECT_BASE_MULTIPLIER,
  FORTUNE_RING_BASE_DURATION_MS,
  FORTUNE_RING_COUNT,
  FORTUNE_RING_REVOLUTION_MS,
  FORTUNE_RING_SEGMENT_COUNT,
  FORTUNE_ROUTES,
  FORTUNE_RUN_HAZARD_LIMIT,
  FORTUNE_RUN_MIN_POINTS,
  FORTUNE_WHEEL_SLOTS,
  getFortuneRouteForSlot,
  isFortunePerfectTapAngle,
  resolveFortuneCrushKeepDivisor,
  resolveFortunePerfectPointsMultiplier,
  resolveFortuneRunMultiplier,
  resolveFortuneRunOutcome,
  resolveFortuneSegmentIndexForAngle,
  resolveFortuneTap,
  rollFortuneChallengeSequence,
  rollFortuneEchoSequence,
  rollFortuneFinaleTargets,
  rollFortuneSignalTarget,
  rollFortuneWheelSlot,
  type FortuneRingSegment,
} from '../fortuneEngineGame';
import { assert, assertEqual, type TestCase } from './testHarness';

export const fortuneEngineGameTests: TestCase[] = [
  {
    name: 'challenge sequence uses Pulse, Echo and Signal exactly once per run',
    run: () => {
      const [sequence, nextState] = rollFortuneChallengeSequence(12345);
      assertEqual(sequence.length, 3, 'Expected three chambers');
      assertEqual(new Set(sequence).size, 3, 'Chambers must not repeat within a run');
      for (const mode of sequence) {
        assert(FORTUNE_CHALLENGE_MODES[mode] !== undefined, `Unknown challenge mode ${mode}`);
      }
      const [sameSequence, sameNextState] = rollFortuneChallengeSequence(12345);
      assertEqual(JSON.stringify(sequence), JSON.stringify(sameSequence), 'Challenge order must be deterministic');
      assertEqual(nextState, sameNextState, 'Deterministic order must advance to the same state');
      assert(FORTUNE_ECHO_PREVIEW_MS >= 2_000, 'Echo preview must give the player time to memorise');
    },
  },
  {
    name: 'Echo and Signal targets only use reward kinds present in the ring',
    run: () => {
      const segments: FortuneRingSegment[] = [
        { kind: 'points', value: 10, collected: false },
        { kind: 'dice', value: 2, collected: false },
        { kind: 'essence', value: 5, collected: false },
        { kind: 'hazard', value: 0, collected: false },
      ];
      const [echo] = rollFortuneEchoSequence({ segments, ringIndex: 1, rngState: 77 });
      assertEqual(echo.length, 4, 'Second chamber Echo sequence should contain four symbols');
      assert(echo.every((kind) => ['points', 'dice', 'essence'].includes(kind)), 'Echo must not request absent or hazardous symbols');

      const [signal] = rollFortuneSignalTarget({ segments, rngState: 77 });
      assert(signal !== null && ['points', 'dice', 'essence'].includes(signal), 'Signal target must be an available reward kind');
    },
  },
  {
    name: 'route wheel slots cover every route and jackpot stays the rare slice',
    run: () => {
      const counts = new Map<string, number>();
      for (const slot of FORTUNE_WHEEL_SLOTS) {
        counts.set(slot, (counts.get(slot) ?? 0) + 1);
      }
      for (const routeId of Object.keys(FORTUNE_ROUTES)) {
        assert((counts.get(routeId) ?? 0) > 0, `wheel should include the ${routeId} route`);
      }
      assertEqual(counts.get('jackpot'), 1, 'jackpot should occupy exactly one wheel slot');
      const [slotIndex] = rollFortuneWheelSlot(12345);
      assert(slotIndex >= 0 && slotIndex < FORTUNE_WHEEL_SLOTS.length, 'rolled slot index should be in range');
      assertEqual(
        getFortuneRouteForSlot(slotIndex).id,
        FORTUNE_WHEEL_SLOTS[slotIndex],
        'route lookup should match the landed slot',
      );
    },
  },
  {
    name: 'wheel roll is deterministic for a given rng state',
    run: () => {
      const [first, stateAfterFirst] = rollFortuneWheelSlot(987654);
      const [second] = rollFortuneWheelSlot(987654);
      assertEqual(first, second, 'same state should land the same slot');
      const [third] = rollFortuneWheelSlot(stateAfterFirst);
      assert(third >= 0 && third < FORTUNE_WHEEL_SLOTS.length, 'chained roll should stay in range');
    },
  },
  {
    name: 'buildFortuneRing produces a full segment ring and honors route adjustments',
    run: () => {
      const [treasureRing] = buildFortuneRing({ ringIndex: 0, route: FORTUNE_ROUTES.treasure, rngState: 42 });
      assertEqual(treasureRing.segments.length, FORTUNE_RING_SEGMENT_COUNT, 'ring should have the canonical segment count');
      assertEqual(treasureRing.durationMs, FORTUNE_RING_BASE_DURATION_MS, 'treasure route should keep the base timer');
      assertEqual(treasureRing.revolutionMs, FORTUNE_RING_REVOLUTION_MS[0], 'ring 1 should use the slowest pointer');

      const [chronoRing] = buildFortuneRing({ ringIndex: 0, route: FORTUNE_ROUTES.chrono, rngState: 42 });
      assertEqual(
        chronoRing.durationMs,
        FORTUNE_RING_BASE_DURATION_MS + FORTUNE_ROUTES.chrono.ringTimeBonusMs,
        'chrono route should extend the ring timer',
      );

      const countKind = (segments: readonly FortuneRingSegment[], kind: string) =>
        segments.filter((segment) => segment.kind === kind).length;
      const [baseRing] = buildFortuneRing({ ringIndex: 0, route: FORTUNE_ROUTES.chrono, rngState: 7 });
      const [richRing] = buildFortuneRing({ ringIndex: 0, route: FORTUNE_ROUTES.treasure, rngState: 7 });
      assert(
        countKind(richRing.segments, 'points') > countKind(baseRing.segments, 'points'),
        'treasure route should inject extra reward segments',
      );
      const [riskRing] = buildFortuneRing({ ringIndex: 0, route: FORTUNE_ROUTES.risk, rngState: 7 });
      assert(
        countKind(riskRing.segments, 'hazard') > countKind(baseRing.segments, 'hazard'),
        'risk route should inject extra hazard segments',
      );
      const riskPointValues = riskRing.segments.filter((segment) => segment.kind === 'points').map((segment) => segment.value);
      assert(
        riskPointValues.every((value) => value % FORTUNE_ROUTES.risk.rewardValueMultiplier === 0),
        'risk route point values should carry the reward multiplier',
      );

      const [ringA] = buildFortuneRing({ ringIndex: 1, route: FORTUNE_ROUTES.multiplier, rngState: 99 });
      const [ringB] = buildFortuneRing({ ringIndex: 1, route: FORTUNE_ROUTES.multiplier, rngState: 99 });
      assertEqual(
        JSON.stringify(ringA.segments),
        JSON.stringify(ringB.segments),
        'ring construction should be deterministic for a given rng state',
      );
    },
  },
  {
    name: 'segment angle resolution maps the full circle onto segment indices',
    run: () => {
      assertEqual(resolveFortuneSegmentIndexForAngle(0), 0, 'top of the ring is segment 0');
      assertEqual(resolveFortuneSegmentIndexForAngle(359.9), FORTUNE_RING_SEGMENT_COUNT - 1, 'just before the top wraps to the last segment');
      assertEqual(resolveFortuneSegmentIndexForAngle(360), 0, 'a full revolution wraps to segment 0');
      assertEqual(resolveFortuneSegmentIndexForAngle(-15), FORTUNE_RING_SEGMENT_COUNT - 1, 'negative angles normalize');
      const arc = 360 / FORTUNE_RING_SEGMENT_COUNT;
      assertEqual(resolveFortuneSegmentIndexForAngle(arc * 3 + arc / 2), 3, 'mid-segment angles resolve to their segment');
    },
  },
  {
    name: 'resolveFortuneTap collects each segment once and reports hazards',
    run: () => {
      const segments: FortuneRingSegment[] = [
        { kind: 'points', value: 10, collected: false },
        { kind: 'hazard', value: 0, collected: false },
        { kind: 'time', value: 2000, collected: false },
        { kind: 'empty', value: 0, collected: false },
      ];
      const pointsTap = resolveFortuneTap(segments, 0);
      assertEqual(pointsTap.points, 10, 'points tap should pay the segment value');
      assertEqual(pointsTap.collectedSomething, true, 'points tap should collect');
      assertEqual(pointsTap.segments[0].collected, true, 'tapped segment should be marked collected');
      assertEqual(segments[0].collected, false, 'tap resolution must not mutate the input');

      const repeatTap = resolveFortuneTap(pointsTap.segments, 0);
      assertEqual(repeatTap.collectedSomething, false, 'a collected segment should be a no-op');

      const hazardTap = resolveFortuneTap(segments, 1);
      assertEqual(hazardTap.hazardHit, true, 'hazard tap should report the hit');
      assertEqual(hazardTap.points, 0, 'hazard tap should pay nothing');

      const timeTap = resolveFortuneTap(segments, 2);
      assertEqual(timeTap.timeBonusMs, 2000, 'time tap should report the bonus');

      const emptyTap = resolveFortuneTap(segments, 3);
      assertEqual(emptyTap.collectedSomething, false, 'empty segments are no-ops');
    },
  },
  {
    name: 'run multiplier grows per ring and stacks the multiplier route bonus',
    run: () => {
      assertEqual(resolveFortuneRunMultiplier({ ringIndex: 0, route: FORTUNE_ROUTES.treasure }), 1, 'ring 1 base multiplier');
      assertEqual(resolveFortuneRunMultiplier({ ringIndex: 1, route: FORTUNE_ROUTES.treasure }), 1.5, 'ring 2 multiplier');
      assertEqual(resolveFortuneRunMultiplier({ ringIndex: 2, route: FORTUNE_ROUTES.treasure }), 2, 'ring 3 multiplier');
      assertEqual(
        resolveFortuneRunMultiplier({ ringIndex: 2, route: FORTUNE_ROUTES.multiplier }),
        3,
        'multiplier route should add its bonus on top of the ring multiplier',
      );
      assertEqual(FORTUNE_RING_COUNT, 3, 'the engine has three rings');
    },
  },
  {
    name: 'run outcomes: banked runs keep everything, crush penalties deepen per ring, floors apply',
    run: () => {
      const banked = resolveFortuneRunOutcome({
        rawPoints: 100,
        dice: 4,
        essence: 10,
        ringIndex: 1,
        route: FORTUNE_ROUTES.treasure,
        end: 'banked',
      });
      assertEqual(banked.runScore, 150, 'banked runs multiply raw points by the ring multiplier');
      assertEqual(banked.eventPoints, 150, 'event points mirror the run score');
      assertEqual(banked.dice, 4, 'banked runs keep collected dice');
      assertEqual(banked.essence, 10, 'banked runs keep collected essence');
      assertEqual(banked.fragmentAwarded, false, 'plain banked routes award no fragment');

      assertEqual(resolveFortuneCrushKeepDivisor(0), 2, 'ring 1 crush keeps half');
      assertEqual(resolveFortuneCrushKeepDivisor(1), 3, 'ring 2 crush keeps a third');
      assertEqual(resolveFortuneCrushKeepDivisor(2), 4, 'ring 3 crush keeps a quarter');

      const crushedShallow = resolveFortuneRunOutcome({
        rawPoints: 100,
        dice: 5,
        essence: 9,
        ringIndex: 0,
        route: FORTUNE_ROUTES.treasure,
        end: 'crushed',
      });
      assertEqual(crushedShallow.runScore, 50, 'ring-1 crush keeps half the multiplied score');

      const crushedDeep = resolveFortuneRunOutcome({
        rawPoints: 100,
        dice: 5,
        essence: 9,
        ringIndex: 2,
        route: FORTUNE_ROUTES.treasure,
        end: 'crushed',
      });
      assertEqual(crushedDeep.runScore, 50, 'ring-3 crush keeps a quarter of the multiplied score');
      assertEqual(crushedDeep.dice, 2, 'crushed runs drop half the dice');
      assertEqual(crushedDeep.essence, 4, 'crushed runs drop half the essence');
      assertEqual(crushedDeep.fragmentAwarded, false, 'crushed runs never award fragments');

      const scraped = resolveFortuneRunOutcome({
        rawPoints: 0,
        dice: 0,
        essence: 0,
        ringIndex: 0,
        route: FORTUNE_ROUTES.treasure,
        end: 'crushed',
      });
      assertEqual(scraped.runScore, FORTUNE_RUN_MIN_POINTS, 'even a wiped run pays the consolation floor');
      assert(FORTUNE_RUN_HAZARD_LIMIT >= 2, 'hazard limit should allow at least one mistake');
    },
  },
  {
    name: 'fragments come from jackpot, golden launch, or a full descent — only on finished runs',
    run: () => {
      const jackpot = resolveFortuneRunOutcome({
        rawPoints: 20,
        dice: 0,
        essence: 0,
        ringIndex: 0,
        route: FORTUNE_ROUTES.jackpot,
        end: 'banked',
      });
      assertEqual(jackpot.fragmentAwarded, true, 'finished jackpot runs award a fragment');

      const golden = resolveFortuneRunOutcome({
        rawPoints: 20,
        dice: 0,
        essence: 0,
        ringIndex: 0,
        route: FORTUNE_ROUTES.treasure,
        end: 'completed',
        goldenLaunch: true,
      });
      assertEqual(golden.fragmentAwarded, true, 'golden launches guarantee a fragment on finished runs');

      const fullDescent = resolveFortuneRunOutcome({
        rawPoints: 20,
        dice: 0,
        essence: 0,
        ringIndex: 2,
        route: FORTUNE_ROUTES.treasure,
        end: 'completed',
      });
      assertEqual(fullDescent.fragmentAwarded, true, 'finishing all three rings standing awards a fragment');

      const bankedPlain = resolveFortuneRunOutcome({
        rawPoints: 20,
        dice: 0,
        essence: 0,
        ringIndex: 1,
        route: FORTUNE_ROUTES.treasure,
        end: 'banked',
      });
      assertEqual(bankedPlain.fragmentAwarded, false, 'banking early on a plain route earns no fragment');

      const crushedJackpot = resolveFortuneRunOutcome({
        rawPoints: 20,
        dice: 0,
        essence: 0,
        ringIndex: 0,
        route: FORTUNE_ROUTES.jackpot,
        end: 'crushed',
        goldenLaunch: true,
      });
      assertEqual(crushedJackpot.fragmentAwarded, false, 'crushed runs forfeit the fragment');
    },
  },
  {
    name: 'perfect taps multiply points and build a capped combo; hazards and misses reset it',
    run: () => {
      const arc = 360 / FORTUNE_RING_SEGMENT_COUNT;
      assertEqual(isFortunePerfectTapAngle(arc / 2), true, 'the exact center of a segment is Perfect');
      assertEqual(isFortunePerfectTapAngle(arc * 5 + arc / 2), true, 'center of any segment is Perfect');
      assertEqual(isFortunePerfectTapAngle(0.5), false, 'the leading edge of a segment is not Perfect');
      assertEqual(isFortunePerfectTapAngle(arc - 0.5), false, 'the trailing edge of a segment is not Perfect');

      assertEqual(resolveFortunePerfectPointsMultiplier(0), FORTUNE_PERFECT_BASE_MULTIPLIER, 'first Perfect pays the base multiplier');
      assertEqual(resolveFortunePerfectPointsMultiplier(1), 2.5, 'combo stack 1 pays ×2.5');
      assertEqual(resolveFortunePerfectPointsMultiplier(3), 3.5, 'combo stack 3 pays ×3.5');
      assertEqual(resolveFortunePerfectPointsMultiplier(99), 3.5, 'combo multiplier caps at ×3.5');

      const segments: FortuneRingSegment[] = [
        { kind: 'points', value: 10, collected: false },
        { kind: 'points', value: 10, collected: false },
        { kind: 'hazard', value: 0, collected: false },
        { kind: 'dice', value: 2, collected: false },
      ];
      const first = resolveFortuneTap(segments, 0, { perfect: true, comboBefore: 0 });
      assertEqual(first.points, 20, 'a Perfect tap doubles the points value');
      assertEqual(first.perfect, true, 'Perfect flag should be reported');
      assertEqual(first.comboAfter, 1, 'a Perfect tap starts the combo');

      const second = resolveFortuneTap(first.segments, 1, { perfect: true, comboBefore: first.comboAfter });
      assertEqual(second.points, 25, 'a combo Perfect pays the escalated multiplier');
      assertEqual(second.comboAfter, 2, 'consecutive Perfects extend the combo');

      const normal = resolveFortuneTap(second.segments, 3, { perfect: false, comboBefore: second.comboAfter });
      assertEqual(normal.comboAfter, 0, 'a normal collect resets the combo');
      assertEqual(normal.dice, 2, 'dice values are unaffected by the Perfect system');

      const hazard = resolveFortuneTap(second.segments, 2, { perfect: true, comboBefore: 5 });
      assertEqual(hazard.perfect, false, 'a hazard can never be Perfect');
      assertEqual(hazard.comboAfter, 0, 'a hazard resets the combo');

      const legacy = resolveFortuneTap(segments, 0);
      assertEqual(legacy.points, 10, 'taps without Perfect options keep the base value');
      assertEqual(legacy.comboAfter, 0, 'non-Perfect taps carry no combo');
    },
  },
  {
    name: 'beating the previous best run pays bonus event points',
    run: () => {
      const newBest = resolveFortuneRunOutcome({
        rawPoints: 100,
        dice: 0,
        essence: 0,
        ringIndex: 0,
        route: FORTUNE_ROUTES.treasure,
        end: 'banked',
        previousBestScore: 80,
      });
      assertEqual(newBest.newBest, true, 'a higher score should flag a new best');
      assertEqual(
        newBest.eventPoints,
        100 + Math.floor(100 * FORTUNE_NEW_BEST_EVENT_BONUS_RATIO),
        'a new best pays the bonus event points',
      );

      const notBest = resolveFortuneRunOutcome({
        rawPoints: 50,
        dice: 0,
        essence: 0,
        ringIndex: 0,
        route: FORTUNE_ROUTES.treasure,
        end: 'banked',
        previousBestScore: 80,
      });
      assertEqual(notBest.newBest, false, 'a lower score is not a new best');
      assertEqual(notBest.eventPoints, 50, 'no bonus without a new best');

      const firstRun = resolveFortuneRunOutcome({
        rawPoints: 50,
        dice: 0,
        essence: 0,
        ringIndex: 0,
        route: FORTUNE_ROUTES.treasure,
        end: 'banked',
        previousBestScore: 0,
      });
      assertEqual(firstRun.newBest, false, 'the first run has no best to beat');
    },
  },
  {
    name: 'golden streak bonus multiplier stacks onto the run multiplier',
    run: () => {
      assertEqual(
        resolveFortuneRunMultiplier({ ringIndex: 0, route: FORTUNE_ROUTES.treasure, bonusMultiplier: 0.5 }),
        1.5,
        'the streak bonus adds onto the ring multiplier',
      );
      const boosted = resolveFortuneRunOutcome({
        rawPoints: 100,
        dice: 0,
        essence: 0,
        ringIndex: 0,
        route: FORTUNE_ROUTES.treasure,
        end: 'banked',
        bonusMultiplier: 0.5,
      });
      assertEqual(boosted.runScore, 150, 'the streak bonus multiplies the banked score');
    },
  },
  {
    name: 'finale targets are distinct in-range stabiliser segments',
    run: () => {
      const [targets, nextState] = rollFortuneFinaleTargets(2024);
      assertEqual(targets.length, FORTUNE_FINALE_TARGET_COUNT, 'finale should pick the canonical target count');
      assertEqual(new Set(targets).size, targets.length, 'finale targets should be distinct');
      assert(
        targets.every((index) => index >= 0 && index < FORTUNE_RING_SEGMENT_COUNT),
        'finale targets should be valid segment indices',
      );
      const [repeat] = rollFortuneFinaleTargets(2024);
      assertEqual(JSON.stringify(repeat), JSON.stringify(targets), 'finale targets should be deterministic per rng state');
      assert(nextState !== 2024, 'rng state should advance');
    },
  },
];
