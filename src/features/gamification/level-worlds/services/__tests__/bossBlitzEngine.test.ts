import {
  BOSS_BLITZ_PLAYER_HITBOX,
  BOSS_BLITZ_WORLD,
  buildBossBlitzVolley,
  buildRingWithGap,
  buildWallWithGap,
  estimateBossBlitzKillSeconds,
  getBossBlitzPhase,
  getBossBlitzTuning,
  resolveBossBlitzAccuracy,
  resolveBossBlitzOutcome,
  type BossBlitzPhase,
} from '../bossBlitzEngine';
import { getBossRhythmConfig, resolveBossRhythmRareReward } from '../bossRhythmGame';
import { assert, assertEqual, type TestCase } from './testHarness';

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
}

export const bossBlitzEngineTests: TestCase[] = [
  {
    name: 'boss blitz: a typical player wins in about a minute on every island, inside song + overtime',
    run: () => {
      for (const island of [1, 3, 25, 60, 120]) {
        const tuning = getBossBlitzTuning(island);
        const seconds = estimateBossBlitzKillSeconds(tuning, 0.65);
        const config = getBossRhythmConfig(island);
        const songEnd = config.finaleStartSec + config.finaleBeats * (60 / config.finaleBpm);
        assert(seconds >= 40 && seconds <= 80, `island ${island}: ~${seconds.toFixed(1)}s to win`);
        assert(seconds < songEnd + tuning.overtimeSec, `island ${island}: winnable before the battle ends`);
        assert(estimateBossBlitzKillSeconds(tuning, 0.3) > seconds, 'missing more takes longer');
      }
      assert(getBossBlitzTuning(120).bossMaxHp > getBossBlitzTuning(1).bossMaxHp, 'later islands are tougher');
      assert(getBossBlitzTuning(120).bulletSpeed > getBossBlitzTuning(1).bulletSpeed, 'and faster');
    },
  },
  {
    name: 'boss blitz: phases follow the remaining core (70% / 40% / 15% final attack)',
    run: () => {
      assertEqual(getBossBlitzPhase(1), 1, 'fresh');
      assertEqual(getBossBlitzPhase(0.7), 2, 'phase 2');
      assertEqual(getBossBlitzPhase(0.4), 3, 'phase 3');
      assertEqual(getBossBlitzPhase(0.15), 4, 'final attack');
    },
  },
  {
    name: 'boss blitz: rings and walls always leave an escape gap wide enough for the hitbox',
    run: () => {
      const ring = buildRingWithGap({ origin: { x: 180, y: 140 }, count: 22, speed: 140, gapAngle: Math.PI / 2, gapWidthRad: 0.85 });
      assert(ring.length < 22 && ring.length >= 18, `gap removes a few bullets (${ring.length})`);
      const downward = ring.filter((b) => Math.abs(Math.atan2(b.vy, b.vx) - Math.PI / 2) < 0.3);
      assertEqual(downward.length, 0, 'nothing fires through the gap');
      for (let trial = 0; trial < 20; trial += 1) {
        const gapX = 50 + trial * 13;
        const wall = buildWallWithGap({ y: 200, gapX, gapWidth: 64, speed: 100 });
        const xs = wall.map((b) => b.x).sort((a, b) => a - b);
        let widest = 0;
        for (let i = 1; i < xs.length; i += 1) widest = Math.max(widest, xs[i]! - xs[i - 1]!);
        assert(widest - 2 * 6 > BOSS_BLITZ_PLAYER_HITBOX * 4, `wall at ${gapX}: gap ${widest}px clears the hitbox`);
      }
    },
  },
  {
    name: 'boss blitz: every phase attacks on the beat, escalates, and beams always warn before they hurt',
    run: () => {
      const tuning = getBossBlitzTuning(3);
      const counts: number[] = [];
      for (const phase of [1, 2, 3, 4] as BossBlitzPhase[]) {
        let bullets = 0;
        let beams = 0;
        const random = seeded(phase);
        for (let beat = 0; beat < 16; beat += 1) {
          const volley = buildBossBlitzVolley({ phase, beat, beatSec: 0.45, songTime: 10 + beat * 0.45, boss: { x: 180, y: 140 }, turrets: [{ x: 100, y: 170, alive: true }, { x: 260, y: 170, alive: true }], player: { x: 180, y: 540 }, tuning, random });
          bullets += volley.bullets.length;
          beams += volley.beams.length;
          volley.beams.forEach((beam) => assert(beam.liveAt - beam.warnAt >= 0.6, 'beam warning lasts over half a second'));
          volley.bullets.forEach((b) => assert(Math.hypot(b.vx, b.vy) <= tuning.bulletSpeed * 1.25, 'bullet speed stays readable'));
        }
        assert(bullets > 0, `phase ${phase} attacks`);
        if (phase === 2 || phase === 3) assert(beams > 0, `phase ${phase} uses warned beams`);
        counts.push(bullets);
      }
      assert(counts[3]! > counts[0]!, `the final attack is denser than phase 1 (${counts.join(' < ')})`);
    },
  },
  {
    name: 'boss blitz: destroyed turrets stop firing',
    run: () => {
      const tuning = getBossBlitzTuning(3);
      const input = { phase: 1 as BossBlitzPhase, beat: 1, beatSec: 0.5, songTime: 5, boss: { x: 180, y: 140 }, player: { x: 180, y: 540 }, tuning, random: seeded(1) };
      const alive = buildBossBlitzVolley({ ...input, turrets: [{ x: 100, y: 170, alive: true }, { x: 260, y: 170, alive: true }] });
      const dead = buildBossBlitzVolley({ ...input, turrets: [{ x: 100, y: 170, alive: false }, { x: 260, y: 170, alive: false }] });
      assert(alive.bullets.length > dead.bullets.length, 'turret volleys only while the turret lives');
    },
  },
  {
    name: 'boss blitz: outcome and reward (no-hit win earns the flawless bonus)',
    run: () => {
      const tuning = getBossBlitzTuning(3);
      assertEqual(resolveBossBlitzOutcome({ bossHp: 0, hearts: 1, songTime: 10, songEndSec: 60, tuning }), 'victory', 'core broken');
      assertEqual(resolveBossBlitzOutcome({ bossHp: 5, hearts: 0, songTime: 10, songEndSec: 60, tuning }), 'defeat_hp', 'ship lost');
      assertEqual(resolveBossBlitzOutcome({ bossHp: 5, hearts: 2, songTime: 70, songEndSec: 60, tuning }), 'in_progress', 'overtime keeps going');
      assertEqual(resolveBossBlitzOutcome({ bossHp: 5, hearts: 2, songTime: 91, songEndSec: 60, tuning }), 'defeat_time', 'until overtime ends');
      const flawless = resolveBossRhythmRareReward({ islandNumber: 3, accuracy: resolveBossBlitzAccuracy(0) }).diamonds;
      const scuffed = resolveBossRhythmRareReward({ islandNumber: 3, accuracy: resolveBossBlitzAccuracy(2) }).diamonds;
      assertEqual(flawless, scuffed + 1, 'flawless bonus');
      assert(BOSS_BLITZ_WORLD.height > BOSS_BLITZ_WORLD.width, 'portrait arena');
    },
  },
  {
    name: 'boss blitz: component wiring — drag to fly, no gameplay writes, dev-only shortcuts',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const source = fsMod.readFileSync('src/features/gamification/games/boss-rhythm/BossRhythmMinigame.tsx', 'utf8');
      assert(source.includes('onPointerMove={onPointerMove}') && source.includes('buildBossBlitzVolley({'), 'drag controls and engine volleys');
      assert(!source.includes('persistIslandRunRuntimeStatePatch') && !source.includes('commitIslandRunState'), 'no gameplay writes from the game');
      assert(source.includes("onComplete({ completed: true, reward: { diamonds: endStats?.diamonds ?? 0 } })"), 'victory goes through onComplete');
      assert((source.match(/import\.meta\.env\.DEV/g) ?? []).length >= 2, 'Win (dev) and the HP preview are dev-only');
      assert(source.includes("window.matchMedia?.('(prefers-reduced-motion: reduce)')"), 'reduced motion respected');
    },
  },
];
