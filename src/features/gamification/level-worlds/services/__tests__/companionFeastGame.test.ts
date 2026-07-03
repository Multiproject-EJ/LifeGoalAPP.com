/**
 * Companion Feast drop-and-merge rules/physics tests.
 * Covers: food ladder integrity, seeded drop queue, merge scoring, physics
 * stepping + merges, danger-line timing, Creature Nudge, result tiers, and
 * run entry/replay ticket guards.
 */
import {
  advanceCompanionFeastDangerTimer,
  applyCompanionFeastNudge,
  canStartCompanionFeastRun,
  COMPANION_FEAST_BOWL_HEIGHT,
  COMPANION_FEAST_DANGER_GRACE_MS,
  COMPANION_FEAST_DANGER_LINE_Y,
  COMPANION_FEAST_DEFAULT_PHYSICS,
  COMPANION_FEAST_FOOD_TIERS,
  COMPANION_FEAST_MAX_DROPPABLE_TIER,
  COMPANION_FEAST_MAX_TIER,
  createCompanionFeastBody,
  getCompanionFeastFoodTier,
  resolveCompanionFeastMergeScore,
  resolveCompanionFeastResultTier,
  rollCompanionFeastDropTier,
  stepCompanionFeastPhysics,
  type CompanionFeastBody,
} from '../companionFeastGame';
import { assert, assertEqual, type TestCase } from './testHarness';

function settleBodies(bodies: CompanionFeastBody[], steps: number): {
  bodies: CompanionFeastBody[];
  totalMergeScore: number;
  mergeCount: number;
} {
  let current = bodies;
  let totalMergeScore = 0;
  let mergeCount = 0;
  for (let i = 0; i < steps; i += 1) {
    const step = stepCompanionFeastPhysics(current, COMPANION_FEAST_DEFAULT_PHYSICS, 16);
    current = step.bodies;
    for (const merge of step.merges) {
      totalMergeScore += merge.score;
      mergeCount += 1;
    }
  }
  return { bodies: current, totalMergeScore, mergeCount };
}

export const companionFeastGameTests: TestCase[] = [
  {
    name: 'food ladder is strictly increasing in size with unique ids',
    run: () => {
      const ids = new Set(COMPANION_FEAST_FOOD_TIERS.map((t) => t.id));
      assertEqual(ids.size, COMPANION_FEAST_FOOD_TIERS.length, 'tier ids should be unique');
      for (let i = 1; i < COMPANION_FEAST_FOOD_TIERS.length; i += 1) {
        assert(
          COMPANION_FEAST_FOOD_TIERS[i].radius > COMPANION_FEAST_FOOD_TIERS[i - 1].radius,
          `tier ${i} radius should exceed tier ${i - 1}`,
        );
      }
      assertEqual(getCompanionFeastFoodTier(-4).tier, 0, 'tier accessor clamps below zero');
      assertEqual(getCompanionFeastFoodTier(99).tier, COMPANION_FEAST_MAX_TIER, 'tier accessor clamps above max');
    },
  },
  {
    name: 'drop queue is deterministic per seed and only yields droppable tiers',
    run: () => {
      let stateA = 12345;
      let stateB = 12345;
      for (let i = 0; i < 200; i += 1) {
        const [tierA, nextA] = rollCompanionFeastDropTier(stateA);
        const [tierB, nextB] = rollCompanionFeastDropTier(stateB);
        assertEqual(tierA, tierB, 'same seed should produce the same tier sequence');
        assert(tierA >= 0 && tierA <= COMPANION_FEAST_MAX_DROPPABLE_TIER, 'rolled tier should be droppable');
        stateA = nextA;
        stateB = nextB;
      }
    },
  },
  {
    name: 'merge scoring pays the produced tier and doubles at the top of the ladder',
    run: () => {
      assertEqual(
        resolveCompanionFeastMergeScore(0),
        getCompanionFeastFoodTier(1).mergeScore,
        'tier 0 merge should pay tier 1 mergeScore',
      );
      assertEqual(
        resolveCompanionFeastMergeScore(COMPANION_FEAST_MAX_TIER),
        getCompanionFeastFoodTier(COMPANION_FEAST_MAX_TIER).mergeScore * 2,
        'two max-tier dishes should pay a doubled celebration bonus',
      );
    },
  },
  {
    name: 'physics merges two touching same-tier bodies into the next tier',
    run: () => {
      const floorY = COMPANION_FEAST_BOWL_HEIGHT - getCompanionFeastFoodTier(0).radius;
      const bodies = [
        createCompanionFeastBody({ tier: 0, x: 170, y: floorY }),
        createCompanionFeastBody({ tier: 0, x: 190, y: floorY }),
      ];
      const settled = settleBodies(bodies, 30);
      assertEqual(settled.mergeCount, 1, 'exactly one merge should occur');
      assertEqual(settled.bodies.length, 1, 'merged pair should leave a single body');
      assertEqual(settled.bodies[0].tier, 1, 'merged body should be the next tier');
      assertEqual(
        settled.totalMergeScore,
        resolveCompanionFeastMergeScore(0),
        'merge score should match the rules table',
      );
    },
  },
  {
    name: 'physics keeps bodies inside the bowl and settles them on the floor',
    run: () => {
      const bodies = [
        createCompanionFeastBody({ tier: 2, x: 40, y: 40, vx: -500 }),
        createCompanionFeastBody({ tier: 3, x: 300, y: 30, vx: 500 }),
      ];
      const settled = settleBodies(bodies, 240);
      for (const body of settled.bodies) {
        assert(body.x - body.radius >= -0.5, 'body should stay inside the left wall');
        assert(body.x + body.radius <= COMPANION_FEAST_DEFAULT_PHYSICS.width + 0.5, 'body should stay inside the right wall');
        assert(body.y + body.radius <= COMPANION_FEAST_BOWL_HEIGHT + 0.5, 'body should not fall through the floor');
        assert(Math.abs(body.vy) < 60, 'body should settle vertically');
      }
    },
  },
  {
    name: 'two max-tier dishes celebrate and clear instead of producing a new body',
    run: () => {
      const radius = getCompanionFeastFoodTier(COMPANION_FEAST_MAX_TIER).radius;
      const floorY = COMPANION_FEAST_BOWL_HEIGHT - radius;
      const bodies = [
        createCompanionFeastBody({ tier: COMPANION_FEAST_MAX_TIER, x: 120, y: floorY }),
        createCompanionFeastBody({ tier: COMPANION_FEAST_MAX_TIER, x: 240, y: floorY }),
      ];
      const settled = settleBodies(bodies, 60);
      assertEqual(settled.mergeCount, 1, 'max-tier pair should merge once');
      assertEqual(settled.bodies.length, 0, 'max-tier merge should clear both plates');
    },
  },
  {
    name: 'danger line triggers only for settled bodies past spawn grace',
    run: () => {
      const fresh = createCompanionFeastBody({ tier: 0, x: 180, y: COMPANION_FEAST_DANGER_LINE_Y - 30 });
      const freshStep = stepCompanionFeastPhysics([fresh], COMPANION_FEAST_DEFAULT_PHYSICS, 16);
      assertEqual(freshStep.dangerActive, false, 'freshly dropped food should not trigger danger');

      const stale = createCompanionFeastBody({
        tier: 0,
        x: 180,
        y: COMPANION_FEAST_DANGER_LINE_Y - 30,
        spawnGraceMsRemaining: 0,
      });
      // Zero-out gravity so the settled test body stays put and slow.
      const staleStep = stepCompanionFeastPhysics([stale], {
        ...COMPANION_FEAST_DEFAULT_PHYSICS,
        gravity: 0,
      }, 16);
      assertEqual(staleStep.dangerActive, true, 'settled overflow above the line should trigger danger');
    },
  },
  {
    name: 'danger timer resets when the bowl recovers and ends the run at the grace limit',
    run: () => {
      const midway = advanceCompanionFeastDangerTimer({
        dangerActive: true,
        elapsedDangerMs: 0,
        dtMs: COMPANION_FEAST_DANGER_GRACE_MS / 2,
      });
      assertEqual(midway.gameOver, false, 'halfway through grace should not end the run');
      const recovered = advanceCompanionFeastDangerTimer({
        dangerActive: false,
        elapsedDangerMs: midway.elapsedDangerMs,
        dtMs: 16,
      });
      assertEqual(recovered.elapsedDangerMs, 0, 'recovering should reset the danger timer');
      const overflow = advanceCompanionFeastDangerTimer({
        dangerActive: true,
        elapsedDangerMs: midway.elapsedDangerMs,
        dtMs: COMPANION_FEAST_DANGER_GRACE_MS,
      });
      assertEqual(overflow.gameOver, true, 'sustained overflow should end the run');
    },
  },
  {
    name: 'creature nudge is deterministic, pure, and preserves body count',
    run: () => {
      const bodies = [
        createCompanionFeastBody({ tier: 1, x: 100, y: 400 }),
        createCompanionFeastBody({ tier: 2, x: 220, y: 420 }),
      ];
      const beforeVx = bodies.map((b) => b.vx);
      const nudgedA = applyCompanionFeastNudge(bodies, 777);
      const nudgedB = applyCompanionFeastNudge(bodies, 777);
      assertEqual(nudgedA.length, bodies.length, 'nudge should not add or remove bodies');
      assertEqual(bodies[0].vx, beforeVx[0], 'nudge should not mutate input bodies');
      for (let i = 0; i < nudgedA.length; i += 1) {
        assertEqual(nudgedA[i].vx, nudgedB[i].vx, 'same seed should produce the same nudge');
        assert(nudgedA[i].vy < bodies[i].vy, 'nudge should lift bodies upward');
      }
    },
  },
  {
    name: 'result tiers map score bands to escalating dice rewards',
    run: () => {
      assertEqual(resolveCompanionFeastResultTier(0).id, 'nibble', 'zero score is a Nibble');
      assertEqual(resolveCompanionFeastResultTier(150).id, 'snack', 'mid score is a Hearty Snack');
      assertEqual(resolveCompanionFeastResultTier(400).id, 'banquet', 'high score is a Banquet');
      assertEqual(resolveCompanionFeastResultTier(1000).id, 'grand_feast', 'top score is a Grand Feast');
      assertEqual(resolveCompanionFeastResultTier(Number.NaN).id, 'nibble', 'invalid score falls back safely');
      assert(
        resolveCompanionFeastResultTier(1000).rewardDice > resolveCompanionFeastResultTier(0).rewardDice,
        'higher tiers should pay more dice',
      );
    },
  },
  {
    name: 'run guards allow the pre-paid entry run and gate replays on tickets',
    run: () => {
      assertEqual(
        canStartCompanionFeastRun({ entryRunAvailable: true, ticketsRemaining: 0 }),
        true,
        'pre-paid entry run should start with zero tickets remaining',
      );
      assertEqual(
        canStartCompanionFeastRun({ entryRunAvailable: false, ticketsRemaining: 0 }),
        false,
        'replay without tickets should be blocked',
      );
      assertEqual(
        canStartCompanionFeastRun({ entryRunAvailable: false, ticketsRemaining: 1 }),
        true,
        'replay with a ticket should be allowed',
      );
      assertEqual(
        canStartCompanionFeastRun({ entryRunAvailable: false, ticketsRemaining: Number.NaN }),
        false,
        'invalid ticket counts should be blocked',
      );
    },
  },
];
