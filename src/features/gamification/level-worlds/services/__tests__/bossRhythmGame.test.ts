import {
  applyBossRhythmHit,
  BOSS_RHYTHM_ENTRY_TICKET_COST,
  BOSS_RHYTHM_LANE_COUNT,
  buildBossRhythmChart,
  getBossRhythmBossMaxHp,
  getBossRhythmComboMultiplier,
  getBossRhythmConfig,
  getBossRhythmTier,
  judgeBossRhythmTiming,
  resolveBossRhythmOutcome,
  resolveBossRhythmRareReward,
} from '../bossRhythmGame';
import { assert, assertEqual, type TestCase } from './testHarness';

export const bossRhythmGameTests: TestCase[] = [
  {
    name: 'tier resolves 0..11 across the 120-island loop and clamps outside it',
    run: () => {
      assertEqual(getBossRhythmTier(1), 0, 'island 1 → tier 0');
      assertEqual(getBossRhythmTier(10), 0, 'island 10 → tier 0');
      assertEqual(getBossRhythmTier(11), 1, 'island 11 → tier 1');
      assertEqual(getBossRhythmTier(120), 11, 'island 120 → tier 11');
      assertEqual(getBossRhythmTier(500), 11, 'beyond 120 clamps to tier 11');
      assertEqual(getBossRhythmTier(-3), 0, 'invalid islands clamp to tier 0');
    },
  },
  {
    name: 'config escalates across the three phases and tightens with tier',
    run: () => {
      const early = getBossRhythmConfig(1);
      const late = getBossRhythmConfig(120);
      assert(early.phases[0].bpm < early.phases[1].bpm, 'phase 2 faster than phase 1');
      assert(early.phases[1].bpm < early.phases[2].bpm, 'phase 3 faster than phase 2');
      assert(early.phases[2].bpm < early.finaleBpm, 'finale faster than phase 3');
      assert(late.phases[0].bpm > early.phases[0].bpm, 'later islands play faster');
      assert(late.perfectWindowSec < early.perfectWindowSec, 'later islands have tighter perfect windows');
      assert(late.goodWindowSec < early.goodWindowSec, 'later islands have tighter good windows');
      assert(late.goodWindowSec > late.perfectWindowSec, 'good window always wider than perfect');
      assertEqual(early.playerMaxHp, 100, 'player HP baseline is 100');
      assert(early.shieldCharges === 3, 'shield is a limited 3-charge resource');
    },
  },
  {
    name: 'phase start times are strictly increasing and finale follows phase 3',
    run: () => {
      const config = getBossRhythmConfig(42);
      assert(config.phases[0].startSec === config.introSec, 'phase 1 starts after the intro count-in');
      assert(config.phases[0].startSec < config.phases[1].startSec, 'phase 2 after phase 1');
      assert(config.phases[1].startSec < config.phases[2].startSec, 'phase 3 after phase 2');
      assert(config.phases[2].startSec < config.finaleStartSec, 'finale after phase 3');
    },
  },
  {
    name: 'chart is deterministic per island and differs between islands',
    run: () => {
      const a1 = buildBossRhythmChart(getBossRhythmConfig(7));
      const a2 = buildBossRhythmChart(getBossRhythmConfig(7));
      const b = buildBossRhythmChart(getBossRhythmConfig(8));
      assertEqual(a1.events.length, a2.events.length, 'same island → same event count');
      for (let i = 0; i < a1.events.length; i += 1) {
        assertEqual(a1.events[i].timeSec, a2.events[i].timeSec, `event ${i} time deterministic`);
        assertEqual(a1.events[i].lane, a2.events[i].lane, `event ${i} lane deterministic`);
        assertEqual(a1.events[i].kind, a2.events[i].kind, `event ${i} kind deterministic`);
      }
      const signature = (chart: typeof a1) => chart.events.map((e) => `${e.timeSec.toFixed(3)}:${e.lane}:${e.kind}`).join('|');
      assert(signature(a1) !== signature(b), 'different islands produce different charts');
    },
  },
  {
    name: 'every island 1–120 lands in the 60–90s window with 3 phases + finale',
    run: () => {
      for (let island = 1; island <= 120; island += 1) {
        const config = getBossRhythmConfig(island);
        const chart = buildBossRhythmChart(config);
        assert(
          chart.durationSec >= 60 && chart.durationSec <= 90,
          `island ${island}: duration ${chart.durationSec.toFixed(1)}s should be within 60–90s`,
        );
        const phasesSeen = new Set(chart.events.map((e) => e.phase));
        assert(phasesSeen.has(1) && phasesSeen.has(2) && phasesSeen.has(3), `island ${island}: all 3 phases present`);
        assert(chart.events.some((e) => e.finale), `island ${island}: finale events present`);
        assert(chart.events.some((e) => e.finale && e.kind === 'note'), `island ${island}: finale includes notes so the killing blow can land`);
      }
    },
  },
  {
    name: 'chart events are sorted, in-range, and hazards always leave a safe lane',
    run: () => {
      for (const island of [1, 3, 27, 64, 99, 120]) {
        const chart = buildBossRhythmChart(getBossRhythmConfig(island));
        const hazardLanesByTime = new Map<string, Set<number>>();
        let prevTime = -Infinity;
        for (const event of chart.events) {
          assert(event.timeSec >= prevTime, `island ${island}: events sorted by time`);
          prevTime = event.timeSec;
          assert(event.lane >= 0 && event.lane < BOSS_RHYTHM_LANE_COUNT, `island ${island}: lane in range`);
          if (event.kind === 'hazard') {
            const key = event.timeSec.toFixed(4);
            const lanes = hazardLanesByTime.get(key) ?? new Set<number>();
            lanes.add(event.lane);
            hazardLanesByTime.set(key, lanes);
          }
        }
        for (const [time, lanes] of hazardLanesByTime) {
          assert(lanes.size < BOSS_RHYTHM_LANE_COUNT, `island ${island}: hazards at t=${time} must leave a dodge lane`);
        }
      }
    },
  },
  {
    name: 'boss HP is winnable but not trivial relative to the chart',
    run: () => {
      for (const island of [1, 45, 120]) {
        const config = getBossRhythmConfig(island);
        const chart = buildBossRhythmChart(config);
        const allPerfectDamage = chart.noteCount * config.noteDamagePerfect;
        const allGoodDamage = chart.noteCount * config.noteDamageGood;
        assert(chart.bossMaxHp <= allGoodDamage * 1.02 + 1, `island ${island}: all-good play should be enough (or within rounding)`);
        assert(chart.bossMaxHp < allPerfectDamage, `island ${island}: perfect play has clear headroom`);
        assert(chart.bossMaxHp > allGoodDamage * 0.6, `island ${island}: boss HP is not trivial`);
      }
      assert(
        getBossRhythmBossMaxHp(100, 11) > getBossRhythmBossMaxHp(100, 0),
        'boss HP ratio scales with tier',
      );
    },
  },
  {
    name: 'timing judgment maps windows to perfect / good / null',
    run: () => {
      const config = getBossRhythmConfig(1);
      assertEqual(judgeBossRhythmTiming(0, config), 'perfect', 'dead-on press is perfect');
      assertEqual(judgeBossRhythmTiming(config.perfectWindowSec, config), 'perfect', 'edge of perfect window');
      assertEqual(judgeBossRhythmTiming(config.perfectWindowSec + 0.001, config), 'good', 'just outside perfect is good');
      assertEqual(judgeBossRhythmTiming(config.goodWindowSec, config), 'good', 'edge of good window');
      assertEqual(judgeBossRhythmTiming(config.goodWindowSec + 0.001, config), null, 'outside good window is no hit');
      assertEqual(judgeBossRhythmTiming(-config.perfectWindowSec / 2, config), 'perfect', 'early presses judged by absolute delta');
    },
  },
  {
    name: 'scoring applies combo multiplier and tracks max combo',
    run: () => {
      assertEqual(getBossRhythmComboMultiplier(0), 1, 'no combo → 1×');
      assertEqual(getBossRhythmComboMultiplier(20), 2, '20 combo → 2×');
      assertEqual(getBossRhythmComboMultiplier(99), 2, 'multiplier caps at 2×');
      let state = { score: 0, combo: 0, maxCombo: 0 };
      state = applyBossRhythmHit(state, 'perfect');
      assertEqual(state.score, 150, 'first perfect at 1×');
      assertEqual(state.combo, 1, 'combo increments');
      state = applyBossRhythmHit(state, 'good');
      assertEqual(state.score, 150 + Math.round(75 * 1.05), 'second hit uses 1.05×');
      state = applyBossRhythmHit({ score: 0, combo: 20, maxCombo: 25 }, 'perfect');
      assertEqual(state.score, 300, 'capped multiplier doubles the perfect score');
      assertEqual(state.maxCombo, 25, 'max combo never regresses');
    },
  },
  {
    name: 'outcome resolver: boss kill wins, HP loss and song end lose',
    run: () => {
      assertEqual(resolveBossRhythmOutcome({ bossHp: 0, playerHp: 50, songEnded: false }), 'victory', 'boss at 0 → victory');
      assertEqual(resolveBossRhythmOutcome({ bossHp: 0, playerHp: 0, songEnded: true }), 'victory', 'boss kill wins even on the last frame');
      assertEqual(resolveBossRhythmOutcome({ bossHp: 5, playerHp: 0, songEnded: false }), 'defeat_hp', 'player at 0 → defeat');
      assertEqual(resolveBossRhythmOutcome({ bossHp: 5, playerHp: 50, songEnded: true }), 'defeat_time', 'song end with boss alive → defeat');
      assertEqual(resolveBossRhythmOutcome({ bossHp: 5, playerHp: 50, songEnded: false }), 'in_progress', 'otherwise still playing');
    },
  },
  {
    name: 'entry costs one event ticket and rare reward scales with tier + accuracy',
    run: () => {
      assertEqual(BOSS_RHYTHM_ENTRY_TICKET_COST, 1, 'entry costs exactly 1 event ticket');
      assertEqual(resolveBossRhythmRareReward({ islandNumber: 1, accuracy: 0.5 }).diamonds, 2, 'tier 0 base reward');
      assertEqual(resolveBossRhythmRareReward({ islandNumber: 1, accuracy: 0.95 }).diamonds, 3, 'flawless bonus at ≥90% accuracy');
      assertEqual(resolveBossRhythmRareReward({ islandNumber: 120, accuracy: 0.5 }).diamonds, 5, 'tier 11 base reward');
      assertEqual(resolveBossRhythmRareReward({ islandNumber: 120, accuracy: 1 }).diamonds, 6, 'reward caps at 6');
    },
  },
];
