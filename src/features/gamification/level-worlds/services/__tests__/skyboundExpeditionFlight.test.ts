import {
  SKYBOUND_LEVELS,
  SKYBOUND_MAX_STEP_MS,
  SKYBOUND_STARTER_UPGRADES,
  createSkyboundFlight,
  getSkyboundCourseObjects,
  getSkyboundUpgradeCost,
  scoreSkyboundFlight,
  stepSkyboundFlight,
  upgradeSkyboundPart,
  type SkyboundFlightState,
  type SkyboundUpgrades,
} from '../skyboundExpeditionFlight';

type TestCase = { name: string; run: () => void };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function simulate(
  upgrades: SkyboundUpgrades,
  boost: boolean,
  pitch = 0.2,
): SkyboundFlightState {
  let state = createSkyboundFlight({
    power: 1,
    angleDeg: 35,
    upgrades,
    levelId: 'meadow',
  });
  for (let step = 0; step < 2_000 && state.status === 'flying'; step += 1) {
    state = stepSkyboundFlight(state, { pitch, boost }, upgrades, 16);
  }
  return state;
}

export const skyboundExpeditionFlightTests: TestCase[] = [
  {
    name: 'creates the same launch state for the same input',
    run: () => {
      const input = {
        power: 0.83,
        angleDeg: 41,
        upgrades: { launcher: 2, airframe: 1, engine: 3 },
        levelId: 'canyon' as const,
      };
      const first = createSkyboundFlight(input);
      const second = createSkyboundFlight(input);
      assert(JSON.stringify(first) === JSON.stringify(second), 'launch state should be deterministic');
    },
  },
  {
    name: 'makes every launcher level increase throw speed',
    run: () => {
      const speeds = Array.from({ length: 6 }, (_, launcher) => {
        const state = createSkyboundFlight({
          power: 1,
          angleDeg: 35,
          upgrades: { ...SKYBOUND_STARTER_UPGRADES, launcher },
          levelId: 'meadow',
        });
        return Math.hypot(state.vx, state.vy);
      });
      assert(speeds.every((speed, index) => index === 0 || speed > speeds[index - 1]), 'launch speed must rise at each level');
    },
  },
  {
    name: 'clamps long frame gaps to the simulation time budget',
    run: () => {
      const state = createSkyboundFlight({
        power: 1,
        angleDeg: 35,
        upgrades: SKYBOUND_STARTER_UPGRADES,
        levelId: 'meadow',
      });
      const next = stepSkyboundFlight(state, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 2_000);
      assert(next.elapsedMs === SKYBOUND_MAX_STEP_MS, 'large dt should be clamped to 64ms');
    },
  },
  {
    name: 'makes an upgraded pulse drive reach the gate substantially faster',
    run: () => {
      const passive = simulate(SKYBOUND_STARTER_UPGRADES, false);
      const boosted = simulate({ launcher: 0, airframe: 0, engine: 3 }, true);
      assert(passive.status === 'finished', 'a modest climb input should make Meadow fair for a starter craft');
      assert(boosted.status === 'finished', 'the upgraded pulse drive should reach the first gate');
      assert(boosted.elapsedMs < passive.elapsedMs * 0.7, 'pulse drive should create a clearly faster flight');
    },
  },
  {
    name: 'keeps upgrade purchases immutable and progressively more expensive',
    run: () => {
      const starter = { ...SKYBOUND_STARTER_UPGRADES };
      const upgraded = upgradeSkyboundPart(starter, 'airframe');
      assert(starter.airframe === 0, 'source upgrades must not mutate');
      assert(upgraded.airframe === 1, 'selected part should gain one level');
      assert(getSkyboundUpgradeCost('airframe', 1) > getSkyboundUpgradeCost('airframe', 0), 'later upgrades should cost more');
    },
  },
  {
    name: 'increases course goals and awards a completion premium',
    run: () => {
      assert(SKYBOUND_LEVELS[1].goalDistance > SKYBOUND_LEVELS[0].goalDistance, 'canyon should be longer than meadow');
      assert(SKYBOUND_LEVELS[2].goalDistance > SKYBOUND_LEVELS[1].goalDistance, 'storm should be the longest course');
      const finished = {
        ...createSkyboundFlight({
          power: 1,
          angleDeg: 35,
          upgrades: SKYBOUND_STARTER_UPGRADES,
          levelId: 'meadow',
        }),
        status: 'finished' as const,
        x: SKYBOUND_LEVELS[0].goalDistance,
        maxAltitude: 40,
      };
      const landed = { ...finished, status: 'landed' as const };
      assert(scoreSkyboundFlight(finished) > scoreSkyboundFlight(landed), 'finishing the course should beat an equal-distance landing');
    },
  },
  {
    name: 'defines an authored deterministic course mix for every level',
    run: () => {
      for (const level of SKYBOUND_LEVELS) {
        const first = getSkyboundCourseObjects(level.id);
        const second = getSkyboundCourseObjects(level.id);
        assert(JSON.stringify(first) === JSON.stringify(second), `${level.id} objects should be deterministic`);
        assert(first.some((object) => object.kind === 'salvage'), `${level.id} should include salvage`);
        assert(first.some((object) => object.kind === 'wind_ring'), `${level.id} should include a wind ring`);
        assert(first.some((object) => object.kind === 'hazard'), `${level.id} should include a hazard`);
      }
    },
  },
  {
    name: 'collects salvage and clears rings once without mutating prior state',
    run: () => {
      const objects = getSkyboundCourseObjects('meadow');
      const salvage = objects.find((object) => object.kind === 'salvage');
      const ring = objects.find((object) => object.kind === 'wind_ring');
      assert(salvage && ring, 'meadow objects should include salvage and a ring');
      const starter = createSkyboundFlight({
        power: 1,
        angleDeg: 35,
        upgrades: SKYBOUND_STARTER_UPGRADES,
        levelId: 'meadow',
      });
      const beforeSalvage = { ...starter, x: salvage.x - 3, y: salvage.y, lateralX: salvage.lateralX ?? 0, vx: 70, vy: 0 };
      const afterSalvage = stepSkyboundFlight(beforeSalvage, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(beforeSalvage.resolvedObjectIds.length === 0, 'prior state must remain immutable');
      assert(afterSalvage.salvageCollected === 1, 'salvage should collect once');
      assert(afterSalvage.currentStreak === 1, 'salvage should start a streak');
      const beforeRing = { ...afterSalvage, x: ring.x - 3, y: ring.y, lateralX: ring.lateralX ?? 0, vx: 70, vy: 0 };
      const afterRing = stepSkyboundFlight(beforeRing, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(afterRing.ringsCleared === 1, 'ring should clear once');
      assert(afterRing.vx > beforeRing.vx, 'ring should provide forward lift');
      const repeated = stepSkyboundFlight({ ...afterRing, x: ring.x - 2, y: ring.y }, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(repeated.ringsCleared === 1, 'resolved ring must not pay twice');
    },
  },
  {
    name: 'makes hazards break streaks and reduce forward velocity',
    run: () => {
      const hazard = getSkyboundCourseObjects('meadow').find((object) => object.kind === 'hazard');
      assert(hazard, 'meadow should include a hazard');
      const state = {
        ...createSkyboundFlight({
          power: 1,
          angleDeg: 35,
          upgrades: SKYBOUND_STARTER_UPGRADES,
          levelId: 'meadow',
        }),
        x: hazard.x - 3,
        y: hazard.y,
        lateralX: hazard.lateralX ?? 0,
        vx: 70,
        vy: 0,
        currentStreak: 5,
        bestStreak: 5,
      };
      const next = stepSkyboundFlight(state, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(next.hazardHits === 1, 'hazard should register once');
      assert(next.currentStreak === 0, 'hazard should break the current streak');
      assert(next.vx < state.vx, 'hazard should produce a readable speed loss');
    },
  },
  {
    name: 'adds course performance to settlement without creating negative rewards',
    run: () => {
      const base = {
        ...createSkyboundFlight({
          power: 1,
          angleDeg: 35,
          upgrades: SKYBOUND_STARTER_UPGRADES,
          levelId: 'meadow',
        }),
        status: 'landed' as const,
        x: 200,
        maxAltitude: 55,
      };
      const skilled = { ...base, salvageCollected: 5, ringsCleared: 2, bestStreak: 7 };
      const battered = { ...base, hazardHits: 20 };
      assert(scoreSkyboundFlight(skilled) > scoreSkyboundFlight(base), 'course mastery should improve rewards');
      assert(scoreSkyboundFlight(battered) >= 45, 'hazards must not create a negative payout');
    },
  },
  {
    name: 'makes Stabilizer trade speed for damping and wind resistance',
    run: () => {
      const start = {
        ...createSkyboundFlight({
          power: 1,
          angleDeg: 35,
          upgrades: SKYBOUND_STARTER_UPGRADES,
          levelId: 'canyon',
        }),
        x: 40,
        y: 70,
        vx: 55,
        vy: 18,
      };
      const free = stepSkyboundFlight(start, { pitch: 0, boost: false, stabilize: false }, SKYBOUND_STARTER_UPGRADES, 64);
      const stable = stepSkyboundFlight(start, { pitch: 0, boost: false, stabilize: true }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(stable.vx < free.vx, 'Stabilizer should trade forward speed for control');
      assert(Math.abs(stable.vy) < Math.abs(free.vy), 'Stabilizer should damp vertical velocity');
      assert(stable.stabilizer < start.stabilizer, 'active Stabilizer should consume its bounded meter');
      assert(start.stabilizer === 1, 'Stabilizer must not mutate prior state');
    },
  },
];
