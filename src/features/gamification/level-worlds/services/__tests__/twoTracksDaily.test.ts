import { assert, assertEqual, type TestCase } from './testHarness';
import {
  advanceTwoTracksLedger,
  gameActivitySignature,
  parseTwoTracksLedger,
  previousTwoTracksDayKey,
  sparkXpForStreak,
  TWO_TRACKS_SPARK_XP,
  type TwoTracksDailyLedger,
} from '../twoTracksDaily';
import { deriveCombinedJourneyLevel, JOURNEY_XP_WEIGHTS } from '../combinedJourneyLevel';
import { buildDualTrackOverlayViewModel, buildJourneyLevelInputFromOverlay } from '../dualTrackOverlayAdapter';

const sig = (tokenIndex: number, spent = 0) => gameActivitySignature({
  currentIslandNumber: 4, cycleIndex: 0, tokenIndex, essenceLifetimeSpent: spent,
});

function playDay(ledger: TwoTracksDailyLedger | null, day: string, steps: Array<{ game: string | null; life: number }>) {
  let current = ledger;
  let today = null as ReturnType<typeof advanceTwoTracksLedger>['today'] | null;
  for (const step of steps) {
    const next = advanceTwoTracksLedger(current, { day, gameSig: step.game, lifeStepsToday: step.life });
    current = next.ledger;
    today = next.today;
  }
  return { ledger: current!, today: today! };
}

export const twoTracksDailyTests: TestCase[] = [
  {
    name: 'two tracks: a habit alone or a roll alone is half the day; both together fire one spark',
    run: () => {
      const a = playDay(null, '2026-09-27', [{ game: sig(3), life: 0 }]);
      assert(!a.today.lifeDone && !a.today.gameDone, 'opening the app is not a step');
      const b = playDay(a.ledger, '2026-09-27', [{ game: sig(3), life: 1 }]);
      assert(b.today.lifeDone && !b.today.gameDone && !b.today.bothDone, 'habit check-in = life step only');
      const c = playDay(b.ledger, '2026-09-27', [{ game: sig(7), life: 1 }]);
      assert(c.today.bothDone && c.today.sparkPending, 'a roll after the habit completes both tracks');
      assertEqual(c.ledger.sparkXp, TWO_TRACKS_SPARK_XP, 'first spark pays the base XP');
      const d = playDay(c.ledger, '2026-09-27', [{ game: sig(9, 40), life: 2 }]);
      assertEqual(d.ledger.bothDays, 1, 'more play the same day never pays twice');
      assertEqual(d.ledger.sparkXp, TWO_TRACKS_SPARK_XP, 'spark XP is once per day');
    },
  },
  {
    name: 'two tracks: yesterday\'s last signature is today\'s baseline, so a build counts too',
    run: () => {
      const day1 = playDay(null, '2026-09-26', [{ game: sig(3), life: 0 }, { game: sig(5, 10), life: 0 }]);
      const morning = playDay(day1.ledger, '2026-09-27', [{ game: sig(5, 10), life: 0 }]);
      assert(!morning.today.gameDone, 'no game step yet today');
      const built = playDay(morning.ledger, '2026-09-27', [{ game: sig(5, 25), life: 0 }]);
      assert(built.today.gameDone, 'spending essence on a build is a game step');
      assert(!playDay(null, '2026-09-27', [{ game: null, life: 3 }]).today.gameDone, 'no record means no game step');
    },
  },
  {
    name: 'two tracks: consecutive both-track days build a capped streak bonus; a gap resets it',
    run: () => {
      let ledger: TwoTracksDailyLedger | null = null;
      let token = 0;
      const days = ['2026-09-20', '2026-09-21', '2026-09-22'];
      for (const day of days) {
        const r = playDay(ledger, day, [{ game: sig(token), life: 0 }, { game: sig(token + 2), life: 1 }]);
        ledger = r.ledger;
        token += 2;
      }
      assertEqual(ledger!.streak, 3, 'three days in a row');
      assertEqual(ledger!.sparkXp, sparkXpForStreak(1) + sparkXpForStreak(2) + sparkXpForStreak(3), 'streak-weighted XP');
      const gap = playDay(ledger, '2026-09-24', [{ game: sig(token), life: 0 }, { game: sig(token + 1), life: 1 }]);
      assertEqual(gap.ledger.streak, 1, 'a missed day restarts the streak');
      const idle = playDay(ledger, '2026-09-25', [{ game: sig(token), life: 0 }]);
      assertEqual(idle.today.streak, 0, 'a lapsed streak shows as zero');
      assert(sparkXpForStreak(50) === sparkXpForStreak(7), 'streak bonus is capped');
      assertEqual(previousTwoTracksDayKey('2026-03-01'), '2026-02-28', 'day keys roll across months');
    },
  },
  {
    name: 'two tracks: a corrupt ledger is ignored rather than trusted',
    run: () => {
      assertEqual(parseTwoTracksLedger('{nope'), null, 'bad JSON');
      assertEqual(parseTwoTracksLedger('{"version":2,"day":"x"}'), null, 'unknown version');
      const parsed = parseTwoTracksLedger('{"version":1,"day":"2026-09-27","sparkXp":-5,"streak":"x"}');
      assert(parsed !== null && parsed.sparkXp === 0 && parsed.streak === 0, 'counters are sanitised');
    },
  },
  {
    name: 'two tracks: every habit check-in and spark is a small step on the Combined Journey Level',
    run: () => {
      const base = deriveCombinedJourneyLevel({ islandsCompleted: 2, habitConsistencyScore: 2 });
      const withSteps = deriveCombinedJourneyLevel({ islandsCompleted: 2, habitConsistencyScore: 2, habitCheckIns: 10 });
      assert(withSteps.lifeXp === base.lifeXp + 10 * JOURNEY_XP_WEIGHTS.perHabitCheckIn, 'check-ins add life XP');
      const withSpark = deriveCombinedJourneyLevel({ islandsCompleted: 2, habitConsistencyScore: 2, twoTracksSparkXp: 30 });
      assertEqual(withSpark.xp, base.xp + 30, 'spark XP is added flat, outside the balance multiplier');
      const input = buildJourneyLevelInputFromOverlay({
        islandNumber: 3,
        realLife: { isAuthenticated: true, habits: [{ id: 'h', title: 'Walk' }], habitCheckInsTotal: 12 },
        twoTracksSparkXp: 20,
      });
      assert(input.habitCheckIns === 12 && input.twoTracksSparkXp === 20, 'overlay inputs reach the level');
    },
  },
  {
    name: 'two tracks: today\'s habit check-ins show as step pips on the current life rung',
    run: () => {
      const vm = buildDualTrackOverlayViewModel({
        islandNumber: 4,
        realLife: {
          isAuthenticated: true,
          goals: [{ id: 'g', title: 'Run a half marathon', status: 'active' }],
          habits: [{ id: 'a', title: 'Walk' }, { id: 'b', title: 'Read' }, { id: 'c', title: 'Stretch' }],
          habitCheckInsToday: 2,
        },
      });
      const current = vm.realLifeTrack.find((card) => card.position === 'current');
      assert(current?.steps?.done === 2 && current.steps.total === 3, 'two of three pips lit');
      assert(current!.steps!.label.includes('+6 XP'), 'label shows the XP the steps earned');
      assert(vm.realLifeTrack.filter((card) => card.steps).length === 1, 'only the current rung carries steps');
    },
  },
  {
    name: 'two tracks: level ring, chest and daily check live in the centre hub; spark is once a day',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const overlay = fsMod.readFileSync('src/components/GameBoardOverlay.tsx', 'utf8');
      const app = fsMod.readFileSync('src/App.tsx', 'utf8');
      assert(overlay.includes('<JourneyHub'), 'the centre hub renders');
      assert(!overlay.includes('game-board-overlay__progress-spine-chest'), 'the chest moved off the thin spine');
      assert(overlay.includes('game-board-overlay__hub-daily'), 'daily both-tracks check is shown');
      assert(overlay.includes('onTwoTracksSparkSeen?.()'), 'spark is marked seen after it plays');
      assert(app.includes('useTwoTracksDaily('), 'App observes both tracks while mounted');
      assert(!/persistIslandRunRuntimeStatePatch|commitIslandRunState/.test(
        fsMod.readFileSync('src/features/gamification/level-worlds/hooks/useTwoTracksDaily.ts', 'utf8'),
      ), 'the daily check only reads gameplay state');
    },
  },
];
