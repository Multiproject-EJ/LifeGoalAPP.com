import * as THREE from 'three';
import { createIsland19CoasterCarnivalCircuitFWorld } from '../../dev/Island19CoasterCarnivalCircuitFWorld';
import { goldForgeNorm } from '../../dev/Island19GoldForgeChamber';
import { grandGrottoNorm } from '../../dev/Island19GrandTreasureGrotto';
import { WONDER_RIDE_GRAVITY_CAP, WONDER_RIDE_SPEED_SCALE } from '../../dev/island19WonderRidePacing';
import { resolveWonderRideFov } from '../../dev/island19WonderRideCamera';
import wonderRoute from '../../dev/island19WonderRoute.json';
import { assert, assertEqual, type TestCase } from './testHarness';

function spiralKnots() {
  return wonderRoute.knots.filter((knot) => knot.id.startsWith('double-spiral-'));
}

export const wonderExpressUnderworldTests: TestCase[] = [
  {
    name: 'the Wonder Express has a real double spiral inside the grand grotto',
    run: () => {
      const knots = spiralKnots();
      assert(knots.length >= 12, 'the spiral is authored as a dense knot run');
      // Unwrapped winding angle around the grotto axis.
      let sweep = 0;
      for (let i = 1; i < knots.length; i += 1) {
        const [ax, , az] = knots[i - 1].position;
        const [bx, , bz] = knots[i].position;
        let delta = Math.atan2(bz, bx + 1) - Math.atan2(az, ax + 1);
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        sweep += delta;
      }
      assert(Math.abs(sweep) >= Math.PI * 2 * 1.9, `winds about two full turns (${(Math.abs(sweep) / (Math.PI * 2)).toFixed(2)})`);
      const drop = knots[0].position[1] - Math.min(...knots.map((knot) => knot.position[1]));
      assert(drop / (Math.abs(sweep) / (Math.PI * 2)) >= 1.9, 'turns are stacked far enough apart for the rider envelope');
      knots.forEach((knot) => {
        assert(grandGrottoNorm(new THREE.Vector3(...knot.position as [number, number, number])) < 0.95, `${knot.id} stays inside the grotto cavity`);
      });
    },
  },
  {
    name: 'the super-speed drop is the fastest, widest-lens part of the ride and keeps the lap short',
    run: () => {
      const world = createIsland19CoasterCarnivalCircuitFWorld({ quality: 'low', reducedMotion: true });
      const { samples, durationSeconds } = world.pacing;
      const superDrop = samples.filter((sample) => sample.mode === 'super-drop');
      assert(superDrop.length > 10, 'the steep plunge is paced as a super-speed drop');
      const peak = Math.max(...superDrop.map((sample) => sample.speed)) / WONDER_RIDE_SPEED_SCALE;
      const surface = samples.filter((sample) => sample.mode === 'gravity-run' && world.getRideFrame(sample.progress).phase !== 'plunge')
        .map((sample) => sample.speed / WONDER_RIDE_SPEED_SCALE);
      assert(peak > Math.max(...surface) * 1.1, `the drop outruns the surface track (${peak.toFixed(2)})`);
      assert(samples.every((sample) => sample.speed <= WONDER_RIDE_GRAVITY_CAP * WONDER_RIDE_SPEED_SCALE * 1.001 || sample.mode === 'super-drop'), 'only the drop may exceed the gravity cap');
      assert(durationSeconds > 40 && durationSeconds < 50, `the spiral keeps the express lap under 50 s (${durationSeconds.toFixed(1)})`);
      assertEqual(resolveWonderRideFov(1), 68, 'cruising lens stays at 68°');
      assert(resolveWonderRideFov(peak) > 72, 'the drop widens the lens');
      assert(resolveWonderRideFov(20) <= 82, 'the lens never exceeds 82°');
    },
  },
  {
    name: 'two giant underground chambers: the Gold Forge and the grand grotto',
    run: () => {
      const world = createIsland19CoasterCarnivalCircuitFWorld({ quality: 'low', reducedMotion: true });
      const forge = world.root.getObjectByName('ISLAND_19_D020_GOLD_FORGE_CHAMBER')!;
      const grotto = world.root.getObjectByName('ISLAND_19_D019_GRAND_TREASURE_GROTTO')!;
      assert(forge?.userData.physicalCavity && grotto?.userData.physicalCavity, 'both chambers are physical cavities');
      assert(Boolean(forge.getObjectByName('ISLAND_19_D020_MOLTEN_GOLD_POOL')), 'the forge has its molten gold pool');
      const goldVault = world.getRidePhaseStops().find((u) => world.getRideFrame(u).phase === 'gold-vault')!;
      assert(goldForgeNorm(world.getRideFrame(goldVault).position) < 1, 'the ride passes through the Gold Forge');
      const [rx, ry, rz] = forge.userData.radii as number[];
      assert(rx * 2 >= 5.5 && ry * 2 >= 4.5 && rz * 2 >= 5.5, 'the forge is a giant hall, not a tunnel bulge');
      const probe = new THREE.Vector3(...forge.userData.center as [number, number, number]);
      assert(grandGrottoNorm(probe) > 1, 'the two chambers are separate rooms');
      assert(probe.y + ry < 0, 'the forge is fully underground (a surprise from the surface)');
    },
  },
  {
    name: 'chase lights and smoke run with the finished coaster only',
    run: () => {
      const world = createIsland19CoasterCarnivalCircuitFWorld({ quality: 'low', reducedMotion: false });
      const effects = world.root.getObjectByName('ISLAND_19_WONDER_EXPRESS_RIDE_EFFECTS')!;
      const lights = world.root.getObjectByName('ISLAND_19_WONDER_EXPRESS_CHASE_LIGHTS') as THREE.InstancedMesh;
      const smoke = world.root.getObjectByName('ISLAND_19_WONDER_EXPRESS_SMOKE')!;
      assert(lights.count >= 150, 'chase lights line both rails of the underground run');
      assert(smoke.children.length >= 12, 'several smoke puffs rise from the spiral and forge vents');
      world.setCoasterBuildStage(2, 3, false);
      assert(!effects.visible, 'no spectacle before the coaster is finished');
      world.setCoasterBuildStage(3, 3, false);
      assert(effects.visible, 'finished coaster lights up');
      world.animate(1);
      const before = new THREE.Color();
      lights.getColorAt(0, before);
      world.animate(1.2);
      const after = new THREE.Color();
      lights.getColorAt(0, after);
      assert(!before.equals(after), 'the chase wave moves along the track');
      const puff = smoke.children[0] as THREE.Sprite;
      const y1 = puff.position.y;
      world.animate(1.8);
      assert(puff.position.y !== y1, 'smoke keeps drifting');
    },
  },
  {
    name: 'grotto piers never pierce a lower pass of the spiral',
    run: () => {
      const world = createIsland19CoasterCarnivalCircuitFWorld({ quality: 'low', reducedMotion: true });
      const piers = world.root.getObjectByName('ISLAND_19_D019_GROTTO_BALCONY_LOAD_PIERS') as THREE.InstancedMesh;
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      const scale = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const samples = Array.from({ length: 1200 }, (_, index) => world.path.getPoint(index / 1199));
      for (let index = 0; index < piers.count; index += 1) {
        piers.getMatrixAt(index, matrix);
        matrix.decompose(position, quaternion, scale);
        const top = position.y + scale.y / 2;
        const bottom = position.y - scale.y / 2;
        const pierced = samples.some((sample) => sample.y < top - 0.6 && sample.y > bottom
          && Math.hypot(sample.x - position.x, sample.z - position.z) < 0.45);
        assert(!pierced, `pier ${index} stands clear of lower track`);
      }
    },
  },
];
