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
  COMPANION_FEAST_BOWL_WIDTH,
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
  advanceCompanionFeastFever,
  COMPANION_FEAST_CHAIN_MULTIPLIERS,
  COMPANION_FEAST_FEVER_CHARGE_TARGET,
  COMPANION_FEAST_FEVER_DURATION_MS,
  COMPANION_FEAST_FEVER_IDLE,
  COMPANION_FEAST_GOLDEN_DROP_PERCENT,
  resolveCompanionFeastChainMultiplier,
  resolveCompanionFeastMergeAward,
  rollCompanionFeastGoldenDrop,
  type CompanionFeastBody,
} from '../companionFeastGame';
import { assert, assertEqual, type TestCase } from './testHarness';

function settleBodies(bodies: CompanionFeastBody[], steps: number): {
  bodies: CompanionFeastBody[];
  totalMergeScore: number;
  mergeCount: number;
  goldenConsumed: number;
} {
  let current = bodies;
  let totalMergeScore = 0;
  let mergeCount = 0;
  let goldenConsumed = 0;
  for (let i = 0; i < steps; i += 1) {
    const step = stepCompanionFeastPhysics(current, COMPANION_FEAST_DEFAULT_PHYSICS, 16);
    current = step.bodies;
    for (const merge of step.merges) {
      totalMergeScore += merge.score;
      goldenConsumed += merge.goldenCount;
      mergeCount += 1;
    }
  }
  return { bodies: current, totalMergeScore, mergeCount, goldenConsumed };
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
      assertEqual(resolveCompanionFeastResultTier(220).id, 'snack', 'mid score is a Hearty Snack');
      assertEqual(resolveCompanionFeastResultTier(600).id, 'banquet', 'high score is a Banquet');
      assertEqual(resolveCompanionFeastResultTier(1200).id, 'grand_feast', 'top score is a Grand Feast');
      assertEqual(resolveCompanionFeastResultTier(2500).id, 'legendary_feast', 'exceptional score is a Legendary Feast');
      assertEqual(resolveCompanionFeastResultTier(Number.NaN).id, 'nibble', 'invalid score falls back safely');
      assert(
        resolveCompanionFeastResultTier(1000).rewardDice > resolveCompanionFeastResultTier(0).rewardDice,
        'higher tiers should pay more dice',
      );
    },
  },
  {
    name: 'run guard gates every run on having a ticket for the first drop',
    run: () => {
      assertEqual(
        canStartCompanionFeastRun({ ticketsRemaining: 0 }),
        false,
        'run without tickets should be blocked (every drop costs a ticket)',
      );
      assertEqual(
        canStartCompanionFeastRun({ ticketsRemaining: 1 }),
        true,
        'run with a ticket should be allowed',
      );
      assertEqual(
        canStartCompanionFeastRun({ ticketsRemaining: Number.NaN }),
        false,
        'invalid ticket counts should be blocked',
      );
    },
  },
  {
    name: 'an unchained, feverless, non-golden merge scores exactly the base value',
    run: () => {
      // This is the compatibility invariant: all uplift must come from
      // skilled/lucky play, never from the baseline merge.
      for (let tier = 0; tier <= COMPANION_FEAST_MAX_TIER; tier += 1) {
        const award = resolveCompanionFeastMergeAward({
          fromTier: tier,
          chainCount: 1,
          feverActive: false,
          goldenCount: 0,
          toTier: tier + 1,
        });
        assertEqual(
          award.score,
          resolveCompanionFeastMergeScore(tier),
          `tier ${tier} baseline merge score is unchanged`,
        );
        assertEqual(award.multiplier, 1, `tier ${tier} baseline merge has no multiplier`);
      }
    },
  },
  {
    name: 'chain multipliers escalate and clamp at the top of the ladder',
    run: () => {
      assertEqual(resolveCompanionFeastChainMultiplier(1), 1, 'a lone merge is unmultiplied');
      assertEqual(resolveCompanionFeastChainMultiplier(0), 1, 'chain counts below 1 clamp up');
      for (let i = 1; i < COMPANION_FEAST_CHAIN_MULTIPLIERS.length; i += 1) {
        assert(
          COMPANION_FEAST_CHAIN_MULTIPLIERS[i] > COMPANION_FEAST_CHAIN_MULTIPLIERS[i - 1],
          'chain multipliers strictly increase',
        );
      }
      const top = COMPANION_FEAST_CHAIN_MULTIPLIERS[COMPANION_FEAST_CHAIN_MULTIPLIERS.length - 1];
      assertEqual(resolveCompanionFeastChainMultiplier(99), top, 'long chains clamp to the top multiplier');
    },
  },
  {
    name: 'chain and fever multiply together, and golden pays a bounded flat bonus',
    run: () => {
      const base = resolveCompanionFeastMergeScore(3);
      const chained = resolveCompanionFeastMergeAward({
        fromTier: 3, chainCount: 3, feverActive: false, goldenCount: 0, toTier: 4,
      });
      assertEqual(chained.score, Math.round(base * 1.5), 'a 3-chain applies the 1.5x rung');

      const fevered = resolveCompanionFeastMergeAward({
        fromTier: 3, chainCount: 3, feverActive: true, goldenCount: 0, toTier: 4,
      });
      assertEqual(fevered.score, Math.round(base * 3), 'fever doubles the chained score');

      const golden = resolveCompanionFeastMergeAward({
        fromTier: 3, chainCount: 1, feverActive: false, goldenCount: 2, toTier: 4,
      });
      assertEqual(golden.score, base * 3, 'two golden fruit add two flat base bonuses');
      assert(golden.multiplier === 1, 'golden does not inflate the multiplier');

      // Ceiling check: the very best case stays bounded and auditable.
      const ceiling = resolveCompanionFeastMergeAward({
        fromTier: 3, chainCount: 99, feverActive: true, goldenCount: 2, toTier: 4,
      });
      assertEqual(ceiling.score, Math.round(base * 6) + base * 2, 'best case is chain(3) x fever(2) plus golden');
    },
  },
  {
    name: 'fever charges from merges, decays while idle, and fires for a fixed window',
    run: () => {
      // Idle time bleeds charge back down.
      const charged = advanceCompanionFeastFever({
        state: COMPANION_FEAST_FEVER_IDLE, dtMs: 16, chargeAdded: 40,
      });
      assert(charged.state.charge > 0, 'merges add charge');
      assert(!charged.justActivated, 'a partial charge does not fire fever');

      // ~40 charge at 4/sec needs >10s of idle time to fully bleed off.
      let decaying = charged.state;
      for (let i = 0; i < 400; i += 1) {
        decaying = advanceCompanionFeastFever({ state: decaying, dtMs: 32 }).state;
      }
      assertEqual(decaying.charge, 0, 'idle charge decays to zero and clamps');

      // Crossing the target fires fever and consumes the meter.
      const fired = advanceCompanionFeastFever({
        state: COMPANION_FEAST_FEVER_IDLE,
        dtMs: 16,
        chargeAdded: COMPANION_FEAST_FEVER_CHARGE_TARGET,
      });
      assert(fired.justActivated, 'reaching the target activates fever');
      assertEqual(fired.state.activeMsRemaining, COMPANION_FEAST_FEVER_DURATION_MS, 'fever runs its full window');
      assertEqual(fired.state.charge, 0, 'activating consumes the meter');
    },
  },
  {
    name: 'fever counts down without decaying, and reports the frame it ends',
    run: () => {
      let state = advanceCompanionFeastFever({
        state: COMPANION_FEAST_FEVER_IDLE,
        dtMs: 16,
        chargeAdded: COMPANION_FEAST_FEVER_CHARGE_TARGET,
      }).state;

      // Charge added mid-fever must not be banked (fever is already maxed).
      const mid = advanceCompanionFeastFever({ state, dtMs: 16, chargeAdded: 50 });
      assertEqual(mid.state.charge, 0, 'charge does not accumulate during fever');
      assert(!mid.justEnded, 'fever is still running');

      let guard = 0;
      let ended = false;
      state = mid.state;
      while (guard < 2000 && !ended) {
        const step = advanceCompanionFeastFever({ state, dtMs: 32 });
        state = step.state;
        ended = step.justEnded;
        guard += 1;
      }
      assert(ended, 'fever eventually ends');
      assertEqual(state.activeMsRemaining, 0, 'fever settles at zero');
    },
  },
  {
    name: 'golden drops are seeded, chainable, and roughly match their advertised rate',
    run: () => {
      const [first, firstNext] = rollCompanionFeastGoldenDrop(4242);
      const [second, secondNext] = rollCompanionFeastGoldenDrop(4242);
      assertEqual(first, second, 'same seed yields the same golden roll');
      assertEqual(firstNext, secondNext, 'same seed yields the same next state');

      let state = 987654;
      let goldenCount = 0;
      const samples = 4000;
      for (let i = 0; i < samples; i += 1) {
        const [golden, next] = rollCompanionFeastGoldenDrop(state);
        state = next;
        if (golden) goldenCount += 1;
      }
      const percent = (goldenCount / samples) * 100;
      assert(
        Math.abs(percent - COMPANION_FEAST_GOLDEN_DROP_PERCENT) < 3,
        `golden rate ${percent.toFixed(1)}% should sit near ${COMPANION_FEAST_GOLDEN_DROP_PERCENT}%`,
      );
    },
  },
  {
    name: 'merge events report how many golden fruit were consumed',
    run: () => {
      const floorY = COMPANION_FEAST_BOWL_HEIGHT - 20;
      const result = settleBodies([
        createCompanionFeastBody({ tier: 1, x: 172, y: floorY, golden: true }),
        createCompanionFeastBody({ tier: 1, x: 188, y: floorY, golden: false }),
      ], 40);
      assertEqual(result.mergeCount, 1, 'the pair merges');
      assertEqual(result.goldenConsumed, 1, 'exactly one golden fruit is reported');
    },
  },
  {
    name: 'a long simulated run keeps every body finite and inside the bowl',
    run: () => {
      // The renderer feeds these straight into canvas coordinates, so a single
      // NaN or escaped body would corrupt the whole frame.
      let bodies: CompanionFeastBody[] = [];
      let rng = 20260725;
      let feverState = COMPANION_FEAST_FEVER_IDLE;
      let totalScore = 0;

      for (let frame = 0; frame < 1500; frame += 1) {
        // Drop a fruit every ~10 frames to keep the bowl busy and merging.
        if (frame % 10 === 0 && bodies.length < 40) {
          const [tier, tierNext] = rollCompanionFeastDropTier(rng);
          rng = tierNext;
          const [golden, goldenNext] = rollCompanionFeastGoldenDrop(rng);
          rng = goldenNext;
          bodies = [...bodies, createCompanionFeastBody({
            tier,
            x: 40 + ((frame * 37) % (COMPANION_FEAST_BOWL_WIDTH - 80)),
            y: 30,
            golden,
          })];
        }

        const step = stepCompanionFeastPhysics(bodies, COMPANION_FEAST_DEFAULT_PHYSICS, 16);
        bodies = step.bodies;

        let chargeAdded = 0;
        for (const merge of step.merges) {
          const award = resolveCompanionFeastMergeAward({
            fromTier: merge.fromTier,
            chainCount: 3,
            feverActive: feverState.activeMsRemaining > 0,
            goldenCount: merge.goldenCount,
            toTier: merge.toTier,
          });
          totalScore += award.score;
          chargeAdded += award.feverCharge;
          assert(Number.isFinite(merge.x) && Number.isFinite(merge.y), 'merge coordinates stay finite');
          assert(Number.isFinite(award.score), 'merge award stays finite');
        }
        feverState = advanceCompanionFeastFever({ state: feverState, dtMs: 16, chargeAdded }).state;

        for (const body of bodies) {
          assert(Number.isFinite(body.x), 'body x stays finite');
          assert(Number.isFinite(body.y), 'body y stays finite');
          assert(Number.isFinite(body.radius) && body.radius > 0, 'body radius stays positive and finite');
          assert(Number.isFinite(body.ageMs) && body.ageMs >= 0, 'body age stays finite and non-negative');
          assert(
            body.x >= -body.radius && body.x <= COMPANION_FEAST_BOWL_WIDTH + body.radius,
            'bodies never escape the bowl horizontally',
          );
          assert(body.y <= COMPANION_FEAST_BOWL_HEIGHT + body.radius, 'bodies never fall through the floor');
        }
      }

      assert(totalScore > 0, 'a busy simulated run scores something');
      assert(Number.isFinite(feverState.charge), 'fever charge stays finite across a long run');
    },
  },
  {
    name: 'a merged dish is never golden, so blessings cannot compound up the ladder',
    run: () => {
      const floorY = COMPANION_FEAST_BOWL_HEIGHT - 20;
      let bodies: CompanionFeastBody[] = [
        createCompanionFeastBody({ tier: 1, x: 172, y: floorY, golden: true }),
        createCompanionFeastBody({ tier: 1, x: 188, y: floorY, golden: true }),
      ];
      for (let i = 0; i < 40; i += 1) {
        bodies = stepCompanionFeastPhysics(bodies, COMPANION_FEAST_DEFAULT_PHYSICS, 16).bodies;
      }
      assertEqual(bodies.length, 1, 'the golden pair merged into one dish');
      assertEqual(bodies[0].golden, false, 'the produced dish is ordinary');
    },
  },
];
