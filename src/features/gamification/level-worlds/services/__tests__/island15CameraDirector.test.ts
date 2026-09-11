import { PerspectiveCamera, Vector3 } from 'three';
import {
  ISLAND_15_CAMERA_TOUR_STEPS,
  ISLAND_15_PALACE_ROOM_ORDER,
  ISLAND_15_R17_CAMERA_AUTHORITY,
  ISLAND_15_R17_ROOM_CAMERA_DATA,
  hashIsland15CameraPose,
  fitIsland15ExteriorCameraPose,
  resolveIsland15CameraPose,
  resolveIsland15CameraPoseSafety,
  resolveIsland15OrbitControlLimits,
  resolveIsland15PortalEntrySequence,
  resolveIsland15PortalExitSequence,
  resolveIsland15QuietDriftPose,
  resolveIsland15RoomNavigationControl,
  resolveIsland15RoomNavigationHallPose,
  type Island15CameraPoint,
  type Island15PalaceRoomPreset,
} from '../../dev/island15/Island15CameraDirector';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

const LANDMARK_ROOMS = ['hatchery', 'event', 'wisdom', 'habit'] as const;

const distance = (a: Island15CameraPoint, b: Island15CameraPoint) => Math.hypot(
  a[0] - b[0], a[1] - b[1], a[2] - b[2],
);

const polarAngle = (position: Island15CameraPoint, target: Island15CameraPoint) => {
  const dy = position[1] - target[1];
  return Math.acos(dy / distance(position, target));
};

export const island15CameraDirectorTests: TestCase[] = [
  {
    name: 'fits both the mounted small palace and monumental replacement inside phone and desktop frames',
    run: () => {
      const hero = resolveIsland15CameraPose('overview')!;
      const envelopes = [
        { minimum: [-5.72, -0.43, -5.72] as const, maximum: [5.72, 10.476, 5.72] as const },
        { minimum: [-12, -0.3, -15] as const, maximum: [12, 22, 19.5] as const },
      ];
      for (const aspect of [390 / 844, 1600 / 1000]) {
        for (const bounds of envelopes) {
          const fitted = fitIsland15ExteriorCameraPose(hero, bounds, aspect);
          const camera = new PerspectiveCamera(fitted.fov, aspect, 0.1, 500);
          camera.position.set(...fitted.position);
          camera.lookAt(new Vector3(...fitted.target));
          camera.updateMatrixWorld(true);
          let largestNormalizedExtent = 0;
          for (let mask = 0; mask < 8; mask += 1) {
            const corner = new Vector3(...bounds.minimum.map((value, axis) => (
              mask & (1 << axis) ? bounds.maximum[axis] : value
            )) as [number, number, number]).project(camera);
            assert(Math.abs(corner.x) < 0.93, 'stairs and body must remain inside horizontal safe margin');
            assert(Math.abs(corner.y) < 0.85, 'crown and foundation must remain inside vertical safe margin');
            assert(corner.z > -1 && corner.z < 1, 'the palace must lie in front of the camera and within clip planes');
            largestNormalizedExtent = Math.max(largestNormalizedExtent, Math.abs(corner.x) / 0.92, Math.abs(corner.y) / 0.84);
          }
          assert(largestNormalizedExtent > 0.97, 'fitting must use the available frame rather than leave a distant miniature');
          assertEqual(fitted.fov, hero.fov, 'framing preserves the architectural lens');
        }
      }
      const boss = resolveIsland15CameraPose('boss')!;
      assertEqual(fitIsland15ExteriorCameraPose(boss, envelopes[1], 390 / 844), boss, 'interior socket poses must remain unchanged');
    },
  },
  {
    name: 'fits real spire support points without reserving empty upper bounding-box corners',
    run: () => {
      const hero = resolveIsland15CameraPose('overview')!;
      const bounds = { minimum: [-12, 0, -15] as const, maximum: [12, 22, 19.5] as const };
      const points: Island15CameraPoint[] = [[0, 22, 0]];
      for (const x of [-12, 12]) for (const z of [-15, 19.5]) {
        points.push([x, 0, z], [x, 7, z]);
      }
      let tighterFitCount = 0;
      for (const aspect of [390 / 844, 1.6]) {
        const boxFit = fitIsland15ExteriorCameraPose(hero, bounds, aspect);
        const meshFit = fitIsland15ExteriorCameraPose(hero, bounds, aspect, points);
        const meshDistance = distance(meshFit.position, meshFit.target);
        const boxDistance = distance(boxFit.position, boxFit.target);
        assert(meshDistance <= boxDistance + 0.0001, 'surface fitting must never move farther away than the enclosing box');
        if (meshDistance < boxDistance - 0.1) tighterFitCount += 1;
        const camera = new PerspectiveCamera(meshFit.fov, aspect, 0.1, 500);
        camera.position.set(...meshFit.position);
        camera.lookAt(new Vector3(...meshFit.target));
        camera.updateMatrixWorld(true);
        for (const point of points) {
          const projected = new Vector3(...point).project(camera);
          assert(Math.abs(projected.x) < 0.93 && Math.abs(projected.y) < 0.85, 'every occupied surface point must retain the safe margin');
        }
      }
      assert(tighterFitCount > 0, 'surface fitting must reclaim empty spire corners when the viewport is not already width-limited');
      assertDeepEqual(fitIsland15ExteriorCameraPose(hero, bounds, 1.6, []), fitIsland15ExteriorCameraPose(hero, bounds, 1.6), 'empty capture falls back to bounds');
    },
  },
  {
    name: 'maps the four runtime rooms to the corrected R17 quadrants and deterministic navigator order',
    run: () => {
      assertDeepEqual(
        ISLAND_15_PALACE_ROOM_ORDER,
        ['boss', 'hatchery', 'event', 'wisdom', 'habit'],
        'the room navigator must follow Boss, NW Frost, NE Observatory, SW Oracle, SE Bastion',
      );
      assertEqual(ISLAND_15_R17_ROOM_CAMERA_DATA.hatchery.roomName, 'Frost Nest', 'hatchery owns Frost Nest');
      assertEqual(ISLAND_15_R17_ROOM_CAMERA_DATA.hatchery.quadrant, 'NW', 'Frost Nest must be rear-left');
      assertEqual(ISLAND_15_R17_ROOM_CAMERA_DATA.event.roomName, 'Aurora Observatory', 'event owns Observatory');
      assertEqual(ISLAND_15_R17_ROOM_CAMERA_DATA.event.quadrant, 'NE', 'Observatory must be rear-right');
      assertEqual(ISLAND_15_R17_ROOM_CAMERA_DATA.wisdom.roomName, 'Crystal Oracle', 'wisdom owns Oracle');
      assertEqual(ISLAND_15_R17_ROOM_CAMERA_DATA.wisdom.quadrant, 'SW', 'Oracle must be front-left');
      assertEqual(ISLAND_15_R17_ROOM_CAMERA_DATA.habit.roomName, 'Ice Bastion', 'habit owns Bastion');
      assertEqual(ISLAND_15_R17_ROOM_CAMERA_DATA.habit.quadrant, 'SE', 'Bastion must be front-right');
    },
  },
  {
    name: 'authors all six R17 exterior and playable compositions with distinct identities',
    run: () => {
      const ids = ['overview', 'playable-overview', 'survey', 'orbit-left', 'rear', 'orbit-right'] as const;
      const poses = ids.map((id) => resolveIsland15CameraPose(id, { portrait: true }));
      assert(poses.every(Boolean), 'every R17 composition must resolve');
      assertEqual(new Set(poses.map((pose) => pose?.id)).size, 6, 'all six shots need distinct identities');
      assertDeepEqual(
        poses.map((pose) => pose?.intent),
        ['hero-exterior', 'playable-overview', 'high-survey', 'true-profile', 'rear-chevet', 'soothing-vista'],
        'the camera quartet plus rear and playable overview must retain semantic roles',
      );
      assert(poses.every((pose) => pose!.position.every(Number.isFinite)), 'all shot positions must be finite');
      assert(poses.every((pose) => pose!.target.every(Number.isFinite)), 'all shot targets must be finite');
      assertEqual(poses[0]?.fov, 39, 'closed hero keeps the architectural 39-degree lens');
      assertEqual(poses[3]?.fov, 38, 'true east profile keeps the 38-degree lens');
      assert(poses[4]!.position[2] < 0, 'true rear chevet must be north of the palace');
      assert(poses[5]!.position[2] < 0, 'soothing vista must remain a rear three-quarter');
    },
  },
  {
    name: 'scales the exterior envelope outward without widening the frozen lenses',
    run: () => {
      const r17 = resolveIsland15CameraPose('overview', { envelope: { palaceRadius: 13, palaceHeight: 15 } });
      const larger = resolveIsland15CameraPose('overview', { envelope: { palaceRadius: 16, palaceHeight: 18 } });
      assert(Boolean(r17 && larger), 'both envelopes must resolve');
      assert(distance(larger!.position, larger!.target) > distance(r17!.position, r17!.target) * 1.2, 'larger palace must pull the hero camera back');
      assertEqual(larger?.fov, r17?.fov, 'growth cannot be hidden behind a wider lens');
    },
  },
  {
    name: 'keeps room work and reveal camera hashes stable across L1 L2 and L3 inside R17 AIR bounds',
    run: () => {
      LANDMARK_ROOMS.forEach((room) => {
        const workHashes = ([1, 2, 3] as const).map((buildLevel) => {
          const pose = resolveIsland15CameraPose(room, { intent: 'build-work', buildLevel });
          assert(Boolean(pose), `${room} needs a work pose`);
          const safety = resolveIsland15CameraPoseSafety(pose!);
          assertEqual(safety.authoredVolumePass, true, `${room} work camera sphere needs R17 AIR clearance`);
          assertEqual(safety.nearPlanePass, true, `${room} work target must clear the near plane`);
          return hashIsland15CameraPose(pose!);
        });
        assertEqual(new Set(workHashes).size, 1, `${room} work camera cannot drift across levels`);

        const revealHashes = ([1, 2, 3] as const).map((buildLevel) => {
          const pose = resolveIsland15CameraPose(room, { intent: 'build-reveal', buildLevel });
          assert(Boolean(pose), `${room} needs a reveal pose`);
          assertEqual(resolveIsland15CameraPoseSafety(pose!).authoredVolumePass, true, `${room} reveal must remain in its AIR volume`);
          return hashIsland15CameraPose(pose!);
        });
        assertEqual(new Set(revealHashes).size, 1, `${room} reveal camera cannot drift across levels`);

        const work = resolveIsland15CameraPose(room, { intent: 'build-work' })!;
        const reveal = resolveIsland15CameraPose(room, { intent: 'build-reveal' })!;
        assert(reveal.position[1] > work.position[1], `${room} reveal must crane up`);
        assert(reveal.fov - work.fov <= 3, `${room} reveal may widen by at most three degrees`);
      });
    },
  },
  {
    name: 'crosses the physical z14 south portal before opening the Boss cutaway',
    run: () => {
      const stages = resolveIsland15PortalEntrySequence({ portrait: true });
      assertDeepEqual(
        stages.map((stage) => stage.phase),
        ['approach', 'stair-crest', 'threshold', 'crossing', 'boss-wonder', 'boss-settle'],
        'entry must retain all physical and emotional beats',
      );
      assertDeepEqual(
        stages.map((stage) => stage.focusMode),
        ['overview', 'overview', 'overview', 'overview', 'boss', 'boss'],
        'the shell cannot open until the crossing stage has completed inside',
      );
      assertEqual(ISLAND_15_R17_CAMERA_AUTHORITY.southPortal.center[2], 14, 'outer threshold must remain z14');
      assert(stages[2].position[2] > 14, 'threshold eye remains just outside');
      assert(stages[3].position[2] < 13.8, 'crossing endpoint must be at least 0.2 inside');
      assertEqual(stages[3].cameraInsideOuterThreshold, true, 'crossing endpoint must publish inside state');
      assertEqual(stages[4].fov, 52, 'low wonder beat needs the authored lens');
      assert(stages[5].fov <= 62, 'Boss settle must not inherit a diagnostic fisheye');
    },
  },
  {
    name: 'runs the reverse portal sequence outside before restoring the closed overview shell',
    run: () => {
      const stages = resolveIsland15PortalExitSequence({ portrait: true });
      assertDeepEqual(
        stages.map((stage) => stage.phase),
        ['boss-exit-align', 'narthex-return', 'threshold-return', 'exterior-settle'],
        'exit must reverse the physical south route',
      );
      assertDeepEqual(
        stages.map((stage) => stage.focusMode),
        ['boss', 'boss', 'boss', 'overview'],
        'closed overview can return only after the camera is outside',
      );
      assert(stages[2].position[2] > 14, 'threshold-return must finish outside z14');
      assertEqual(stages[2].cameraOutsideOuterThreshold, true, 'outside threshold state must be explicit');
      assertEqual(stages[3].orbitMode, 'exterior', 'final hero must restore exterior controls');
    },
  },
  {
    name: 'uses an Island15 authored OrbitControls envelope for poses the generic clamps would move',
    run: () => {
      const generic = resolveIsland15OrbitControlLimits('exterior');
      const authored = resolveIsland15OrbitControlLimits('authored-interior');
      const threshold = resolveIsland15PortalEntrySequence()[2];
      const thresholdPolar = polarAngle(threshold.position, threshold.target);
      assert(thresholdPolar > generic.maxPolarAngle, 'the physical threshold is intentionally below the generic 69-degree ceiling');
      assert(authored.maxPolarAngle > thresholdPolar, 'authored controls must preserve the physical threshold pose');
      assert(authored.minDistance < generic.minDistance, 'authored controls must preserve close room/portal distances');
      LANDMARK_ROOMS.forEach((room) => {
        assertEqual(resolveIsland15CameraPose(room)?.orbitMode, 'authored-interior', `${room} must opt into clamp bypass`);
      });
    },
  },
  {
    name: 'routes every room arrow through a named Boss Hall arc including Boss endpoints',
    run: () => {
      const ordered = ISLAND_15_PALACE_ROOM_ORDER as readonly Island15PalaceRoomPreset[];
      ordered.forEach((from) => ordered.forEach((to) => {
        if (from === to) {
          assertEqual(resolveIsland15RoomNavigationHallPose(from, to), null, 'same-room focus needs no path');
          return;
        }
        const pose = resolveIsland15RoomNavigationHallPose(from, to);
        assert(Boolean(pose), `${from} -> ${to} needs a Boss Hall route`);
        assertEqual(pose?.intent, 'room-navigation', 'arrow paths must remain named navigation poses');
        assert(Math.hypot(pose!.position[0], pose!.position[2]) <= 2.35 + 0.001, 'Boss arc must stay inside the route annulus');
      }));
      assertDeepEqual(resolveIsland15RoomNavigationControl('hatchery', 'event'), [-1.66, 1.75, 0], 'north cross-hall route must retain its authored side control');
    },
  },
  {
    name: 'keeps quiet breathing below six degrees and uses the R17 continuous tour',
    run: () => {
      const position: Island15CameraPoint = [0, 9, 20];
      const target: Island15CameraPoint = [0, 2, 0];
      const drift = resolveIsland15QuietDriftPose({ position, target, context: 'board', step: 0 });
      const originalYaw = Math.atan2(position[0] - target[0], position[2] - target[2]);
      const driftYaw = Math.atan2(drift.position[0] - target[0], drift.position[2] - target[2]);
      assert(Math.abs(driftYaw - originalYaw) <= Math.PI / 30, 'quiet drift must remain at or below six degrees');
      assertDeepEqual(drift.target, target, 'quiet drift target cannot wander');
      assert(ISLAND_15_CAMERA_TOUR_STEPS.some((step) => step.preset === 'rear'), 'tour needs a true rear chevet shot');
      assertDeepEqual(
        ISLAND_15_CAMERA_TOUR_STEPS.slice(-2).map((step) => step.preset),
        ['boss', 'overview'],
        'tour must end through Boss Hall and the reverse portal route',
      );
    },
  },
  {
    name: 'keeps the Island 015 camera director presentation-only',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const source = fsMod.readFileSync('src/features/gamification/level-worlds/dev/island15/Island15CameraDirector.ts', 'utf8');
      assert(!/persistIslandRunRuntimeStatePatch|islandRunStateActions|commitIslandRunState|useIslandRunState/.test(source), 'camera poses cannot read or write gameplay state');
      assert(!/from ['"].*services\//.test(source), 'the pure camera director cannot depend on gameplay services');
    },
  },
];
