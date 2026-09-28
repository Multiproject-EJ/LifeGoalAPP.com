import * as THREE from 'three';
import { createIsland19CoasterCarnivalCircuitFWorld } from '../../dev/Island19CoasterCarnivalCircuitFWorld';
import {
  createIsland19CoasterHelicopter,
  ISLAND_19_HELICOPTER_DELIVERY_SECONDS,
  resolveIsland19DeliveryPose,
} from '../../dev/Island19CoasterHelicopter';
import { assert, assertEqual, type TestCase } from './testHarness';

function railTube(world: ReturnType<typeof createIsland19CoasterCarnivalCircuitFWorld>) {
  return world.root.getObjectByName('ISLAND_19_CIRCUIT_F_LEFT_OUTER_RAIL') as THREE.Mesh;
}

export const coasterDeliveryTests: TestCase[] = [
  {
    name: 'the coaster is hidden on arrival and grows section by section until the train appears',
    run: () => {
      const world = createIsland19CoasterCarnivalCircuitFWorld({ quality: 'low', reducedMotion: true });
      const rails = world.root.getObjectByName('ISLAND_19_CIRCUIT_F_WONDER_CIRCUIT_RAILWAY')!;
      const tube = railTube(world);
      const total = tube.geometry.index!.count;

      world.setCoasterBuildStage(0, 3, false);
      assertEqual(world.getCoasterBuildFraction(), 0, 'nothing is built before the first section');
      assert(!rails.visible, 'no rails are visible on arrival');
      assert(!world.train.visible, 'no train is visible on arrival');

      world.setCoasterBuildStage(1, 3, false);
      const first = world.getCoasterBuildFraction();
      assert(first > 0.1 && first < 0.6, `section 1 reveals the surface lift and crest (${first.toFixed(3)})`);
      assert(rails.visible, 'the first section is visible');
      assert(tube.geometry.drawRange.count > 0 && tube.geometry.drawRange.count < total, 'rails are drawn only up to the built fraction');
      assert(!world.train.visible, 'the train waits for the finished circuit');

      world.setCoasterBuildStage(2, 3, false);
      assert(world.getCoasterBuildFraction() > first && world.getCoasterBuildFraction() < 1, 'section 2 extends the track');
      assert(!world.train.visible, 'still no train with two sections');

      world.setCoasterBuildStage(3, 3, false);
      assertEqual(world.getCoasterBuildFraction(), 1, 'all three sections complete the circuit');
      assert(world.train.visible, 'the train appears once complete');
      assert(tube.geometry.drawRange.count >= total, 'the full rail is drawn');
    },
  },
  {
    name: 'an installed section grows smoothly instead of popping in',
    run: () => {
      const world = createIsland19CoasterCarnivalCircuitFWorld({ quality: 'low', reducedMotion: false });
      world.setCoasterBuildStage(0, 3, false);
      world.setCoasterBuildStage(1, 3, true);
      world.animate(10);
      assert(world.getCoasterBuildFraction() < 0.02, 'growth starts from the previous build');
      world.animate(11.4);
      const mid = world.getCoasterBuildFraction();
      assert(mid > 0.02, 'track extends during the tween');
      world.animate(20);
      world.setCoasterBuildStage(1, 3, true);
      assert(world.getCoasterBuildFraction() >= mid, 'growth settles at the section end');
    },
  },
  {
    name: 'the helicopter flies in, lowers the crate onto the pad, releases it and leaves',
    run: () => {
      assert(!resolveIsland19DeliveryPose(-1).visible, 'hidden before a delivery');
      const arriving = resolveIsland19DeliveryPose(1);
      assert(arriving.visible && arriving.crateAttached, 'flies in carrying the crate');
      const lowering = resolveIsland19DeliveryPose(3.6);
      assert(lowering.crateAttached && lowering.cableLength > arriving.cableLength, 'lowers the crate on a longer cable');
      const released = resolveIsland19DeliveryPose(3.9);
      assert(released.visible && !released.crateAttached, 'releases the crate onto the pad');
      const leaving = resolveIsland19DeliveryPose(ISLAND_19_HELICOPTER_DELIVERY_SECONDS - 0.2);
      assert(leaving.helicopter.distanceTo(released.helicopter) > 5, 'flies away afterwards');
      assert(!resolveIsland19DeliveryPose(ISLAND_19_HELICOPTER_DELIVERY_SECONDS).visible, 'gone after the flight');

      const helicopter = createIsland19CoasterHelicopter();
      const parked = helicopter.root.getObjectByName('ISLAND_19_COASTER_SECTION_CRATE_PARKED')!;
      helicopter.animate(5, false, false);
      assert(!helicopter.isFlying() && !parked.visible, 'idle with nothing ordered');
      helicopter.playDelivery(5);
      helicopter.animate(6, true, false);
      assert(helicopter.isFlying(), 'an order launches the flight');
      assert(!parked.visible, 'the crate is on the cable, not the pad, while carried');
      helicopter.animate(6 + ISLAND_19_HELICOPTER_DELIVERY_SECONDS + 0.1, true, false);
      assert(!helicopter.isFlying() && parked.visible, 'the delivered crate waits on the pad until installed');
      helicopter.animate(30, false, false);
      assert(!parked.visible, 'installing the section clears the crate');
    },
  },
  {
    name: 'the ride is only offered once the coaster is complete, via a modal instead of auto-launch',
    run: async () => {
      // @ts-ignore Node test runner provides fs.
      const fs = await import('fs');
      const pilot = fs.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      assert(pilot.includes('island19CircuitFWorld.getCoasterBuildFraction() < 0.999) return;'), 'rides refuse an unfinished coaster');
      assert(pilot.includes('setWonderRideOfferOpen(true);'), 'completion opens the ride offer');
      assert(!/wonderRidePendingAfterConstruction = false;\s*startWonderRide\(/.test(pilot), 'completion no longer auto-launches the ride');
      assert(pilot.includes('<WonderRideOfferModal'), 'the offer renders as a modal');
      assert(!/const wonderRideUnlocked = isCoasterCarnival && \(\s*isCircuitFPreviewEnabled\s*\|\|/.test(pilot), 'the live world no longer unlocks the ride on arrival');
      const modal = fs.readFileSync('src/features/gamification/level-worlds/dev/WonderRideOfferModal.tsx', 'utf8');
      assert(modal.includes('createPortal') && modal.includes('lockPageScroll()'), 'modal is a scroll-locked portal');
      const css = fs.readFileSync('src/features/gamification/level-worlds/dev/wonder-ride-offer-modal.css', 'utf8');
      assert(/\.wonder-ride-offer \{[^}]*position: fixed/.test(css), 'modal overlay is viewport-fixed');
    },
  },
];
