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
import { getSkyboundFlightStickControl, getSkyboundFlightTelemetry } from '../skyboundFlightFeel';
import { getSkyboundWorldPresentation } from '../../../games/skybound-expedition/skyboundWorldPresentation';

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
    name: 'gives every level a deterministic world identity with multiple visual anchors',
    run: () => {
      const signatures = SKYBOUND_LEVELS.map((level) => {
        const presentation = getSkyboundWorldPresentation(level.id);
        assert(presentation.landmarks.length >= 3, `${level.id} should expose at least three identity anchors`);
        assert(new Set(presentation.landmarks.map((landmark) => landmark.kind)).size >= 3, `${level.id} should combine distinct landmark families`);
        return presentation.signature;
      });
      assert(new Set(signatures).size === SKYBOUND_LEVELS.length, 'each level should have a unique world signature');
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
    name: 'awards a close hazard pass once without also recording a collision',
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
        y: hazard.y + 15,
        lateralX: hazard.lateralX ?? 0,
        vx: 70,
        vy: 0,
        currentStreak: 2,
        bestStreak: 2,
      };
      const closePass = stepSkyboundFlight(state, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(closePass.nearMisses === 1, 'passing through the hazard proximity band should award one near-miss');
      assert(closePass.hazardHits === 0, 'a near-miss must not also count as a collision');
      assert(closePass.currentStreak === 3, 'a near-miss should extend the skill streak');
      const repeated = stepSkyboundFlight(closePass, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(repeated.nearMisses === 1, 'the same hazard must not award more than one near-miss');
      const collision = stepSkyboundFlight({ ...state, y: hazard.y }, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(collision.hazardHits === 1 && collision.nearMisses === 0, 'a direct hit should remain a collision, not a near-miss');
      assert(scoreSkyboundFlight({ ...closePass, status: 'landed' }) > scoreSkyboundFlight({ ...closePass, status: 'landed', nearMisses: 0 }), 'near-misses should add bounded settlement value');
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
  {
    name: 'keeps an early terrain brush recoverable instead of ending the sortie',
    run: () => {
      const state = {
        ...createSkyboundFlight({ power: .35, angleDeg: 24, upgrades: SKYBOUND_STARTER_UPGRADES, levelId: 'meadow' }),
        x: 20,
        y: 1.25,
        vx: 24,
        vy: -5,
        elapsedMs: 700,
        airborneMs: 640,
      };
      const next = stepSkyboundFlight(state, { pitch: .2, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(next.status === 'flying', 'launch grace should turn an early terrain brush into a skim');
      assert(next.vy > 0, 'the skim should give the pilot a readable recovery bounce');
      assert(next.terminalReason === null, 'a recoverable brush must not acquire a terminal reason');
    },
  },
  {
    name: 'ends only a deliberate slow touchdown or a genuinely hard impact',
    run: () => {
      const base = {
        ...createSkyboundFlight({ power: 1, angleDeg: 35, upgrades: SKYBOUND_STARTER_UPGRADES, levelId: 'meadow' }),
        x: 30,
        y: 1.3,
        elapsedMs: 4_000,
        airborneMs: 3_000,
      };
      const landed = stepSkyboundFlight({ ...base, vx: 7, vy: -2, pitchRad: .2 }, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(landed.status === 'landed' && landed.terminalReason === 'touchdown', 'slow level contact should be a controlled touchdown');
      const firstSevereContact = stepSkyboundFlight({ ...base, vx: 26, vy: -22, pitchRad: 1, terrainSkims: 0 }, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(firstSevereContact.status === 'flying' && firstSevereContact.terrainSkims === 1, 'a first severe contact should produce one recoverable Academy skim');
      const crashed = stepSkyboundFlight({ ...base, vx: 26, vy: -24, pitchRad: 1.08, terrainSkims: 2 }, { pitch: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(crashed.status === 'crashed' && crashed.terminalReason === 'hard_impact', 'a steep high-speed impact should still crash');
    },
  },
  {
    name: 'maps the virtual flight stick relative to its own anchor with a dead zone',
    run: () => {
      const neutral = getSkyboundFlightStickControl({ x: 100, y: 100 }, { x: 104, y: 97 }, 82);
      assert(neutral.pitch === 0 && neutral.steer === 0, 'small hand movement should remain inside the stick dead zone');
      const climbRight = getSkyboundFlightStickControl({ x: 100, y: 100 }, { x: 158, y: 48 }, 82);
      assert(climbRight.pitch > 0.5, 'dragging upward should command a climb');
      assert(climbRight.steer > 0.5, 'dragging right should command a right bank');
      assert(climbRight.magnitude > 0.8, 'large displacement should visibly approach full stick deflection');
    },
  },
  {
    name: 'classifies smooth flight, stalls, and damaged airframes deterministically',
    run: () => {
      const base = {
        ...createSkyboundFlight({ power: 1, angleDeg: 35, upgrades: SKYBOUND_STARTER_UPGRADES, levelId: 'meadow' }),
        x: 40, y: 52, vx: 34, vy: 0, pitchRad: 0.08, bankRad: 0.1,
      };
      assert(getSkyboundFlightTelemetry(base).condition === 'smooth', 'level energy flight should read as smooth flow');
      assert(getSkyboundFlightTelemetry({ ...base, vx: 13, pitchRad: 0.55 }).condition === 'stall', 'low-speed nose-high flight should warn of a stall');
      assert(getSkyboundFlightTelemetry({ ...base, integrity: 1, hazardHits: 2 }).condition === 'damaged', 'low integrity should read as airframe strain');
    },
  },
  {
    name: 'tracks smooth flight as a scored skill and keeps a stall recoverable',
    run: () => {
      const base = {
        ...createSkyboundFlight({ power: 1, angleDeg: 35, upgrades: SKYBOUND_STARTER_UPGRADES, levelId: 'meadow' }),
        x: 25, y: 54, vx: 48, vy: 0, pitchRad: 0.06, bankRad: 0, flowCharge:.72,
      };
      const smooth = stepSkyboundFlight(base, { pitch: 0, steer: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(smooth.smoothFlightMs === 64, 'stable energetic flight should accumulate flow time');
      const stallStart = { ...base, vx: 13, vy: 1, pitchRad: 0.62 };
      const stalled = stepSkyboundFlight(stallStart, { pitch: -1, steer: 0, boost: false }, SKYBOUND_STARTER_UPGRADES, 64);
      assert(stalled.status === 'flying', 'a low-energy stall should remain recoverable');
      assert(stalled.stallMs > 0, 'a stall should accumulate readable warning time');
      assert(stalled.vy < stallStart.vy, 'stall physics should begin trading altitude for airspeed');
      const ordinaryScore = scoreSkyboundFlight({ ...smooth, status: 'landed', smoothFlightMs: 0 });
      const flowScore = scoreSkyboundFlight({ ...smooth, status: 'landed', smoothFlightMs: 20_000 });
      assert(flowScore > ordinaryScore, 'holding smooth flow should add a bounded settlement bonus');
    },
  },
  {
    name: 'makes a bare fuselage visibly weaker than a completed aircraft',
    run: () => {
      const bare=createSkyboundFlight({power:1,angleDeg:35,upgrades:SKYBOUND_STARTER_UPGRADES,levelId:'meadow',assemblyLevel:0});
      const complete=createSkyboundFlight({power:1,angleDeg:35,upgrades:SKYBOUND_STARTER_UPGRADES,levelId:'meadow',assemblyLevel:4});
      assert(bare.vx<complete.vx*.65,'bare fuselage should leave the sling with much less forward energy');
      const bareStep=stepSkyboundFlight({...bare,x:20,y:48,vx:30,vy:0},{pitch:1,steer:1,boost:true},SKYBOUND_STARTER_UPGRADES,64);
      const completeStep=stepSkyboundFlight({...complete,x:20,y:48,vx:30,vy:0},{pitch:1,steer:1,boost:true},SKYBOUND_STARTER_UPGRADES,64);
      assert(Math.abs(bareStep.vy)<Math.abs(completeStep.vy),'installed wings and controls should produce stronger pitch authority');
      assert(bareStep.fuel===bare.fuel,'the missing propulsion package must make boost unavailable');
    },
  },
];
