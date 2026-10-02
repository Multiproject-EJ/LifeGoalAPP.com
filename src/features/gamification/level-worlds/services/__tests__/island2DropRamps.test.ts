import { createCrystalDropRamp } from '../../dev/CrystalDropRamp';
import { assert, assertEqual, type TestCase } from './testHarness';

function countMeshes(root: { traverse: (fn: (node: { type?: string }) => void) => void }) {
  let count = 0;
  root.traverse((node) => { if (node.type === 'Mesh') count += 1; });
  return count;
}

export const island2DropRampsTests: TestCase[] = [
  {
    name: 'drop ramps: each build level adds parts (pad → track → loaded pod and lights)',
    run: () => {
      const meshes = [1, 2, 3].map((level) => {
        const ramp = createCrystalDropRamp({ level, size: 1.5 });
        const count = countMeshes(ramp.root);
        ramp.dispose();
        return count;
      });
      assert(meshes[0]! < meshes[1]! && meshes[1]! < meshes[2]!, `levels grow: ${meshes.join(' < ')}`);
      const l2 = createCrystalDropRamp({ level: 2, size: 1.5 });
      assertEqual(l2.pod.visible, false, 'the pod is only loaded at Level 3');
      l2.dispose();
      const l3 = createCrystalDropRamp({ level: 3, size: 1.5 });
      assertEqual(l3.pod.visible, true, 'Level 3 shows the loaded drill pod');
      l3.dispose();
    },
  },
  {
    name: 'drop ramps: the launch slides down the track, leaves the kicker outward, falls below the island, then resets',
    run: () => {
      const ramp = createCrystalDropRamp({ level: 3, size: 1.5 });
      const start = ramp.pod.position.clone();
      ramp.setLaunchProgress(0.2);
      assert(ramp.pod.position.y < start.y, 'sliding down the ramp');
      ramp.setLaunchProgress(0.55);
      assert(ramp.pod.position.z > start.z + 1, 'flies outward, off the island edge (+Z)');
      ramp.setLaunchProgress(0.95);
      assert(ramp.pod.position.y < 0, 'falls below the island into the clouds');
      ramp.setLaunchProgress(1);
      assertEqual(ramp.pod.visible, false, 'gone once it has dived');
      ramp.setLaunchProgress(0);
      assertEqual(ramp.pod.visible, true, 'reloaded on the ramp afterwards');
      assert(ramp.pod.position.distanceTo(start) < 1e-6, 'back at the top of the track');
      ramp.dispose();
    },
  },
  {
    name: 'drop ramps: only runtime Island 002 (not the preserved Island 021 copy), launch before the mine opens, never stranded',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('const dropRampsActive = islandNumber === 2 && !featureAccess.gradual;'), 'runtime Island 002 only');
      assert(board.includes('await playDropRampLaunch();'), 'Crystal Miners waits for the launch');
      assert(board.indexOf('await playDropRampLaunch();') < board.indexOf("setActiveLaunchedMinigameId(gameId);\n      setActiveLaunchedMinigameSource('timed_event');"), 'the launch plays before the mine opens');
      assert(board.includes('window.setTimeout(finish, 4500);'), 'a timeout guarantees the mine still opens');
      const pilot = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      assert(pilot.includes("landmark.id !== 'boss' && outerLandmarkVariantRef.current === 'drop-ramps'"), 'the four corner landmarks become ramps; the centre is untouched');
      assert(pilot.includes('if (dropRampLaunchStartedAt === null && launchRequest.sequence > 0) launchRequest.onComplete?.();'), 'no ramps or reduced motion: complete immediately');
    },
  },
  {
    name: 'opening ceremony: once per player on the Arena home, hover base → celebratory strike → finale, never stranded',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes("const wantsCeremony = arenaCeremonyPreview || (dropRampsActive && activeStopId === 'mystery');"), 'plays when the Arena first opens on Island 002');
      assert(board.includes('const arenaCeremonySeenKey = `islandRun.island2ArenaCeremony.v1:${session.user.id}`;')
        && board.includes("window.localStorage.setItem(arenaCeremonySeenKey, '1');"), 'once per player');
      assert(board.includes("setArenaCeremonyPhase(reducedMotion ? 'cheer' : 'arrival');"), 'reduced motion skips the motion straight to the finale');
      assert(board.includes("onOpeningArenaArrivalComplete={arenaCeremonyPhase === 'arrival' ? () => setArenaCeremonyPhase('strike') : handleOpeningArenaArrivalComplete}"), 'the ceremony arrival never anchors the new-campaign mission');
      assert(board.includes("stormfrontCinematicMode={arenaCeremonyPhase === 'strike' ? 'celebration' : 'storm'}"), 'the strike plays in celebration mode');
      assert(board.includes("const ceiling = arenaCeremonyPhase === 'arrival' ? 12000 : arenaCeremonyPhase === 'strike' ? 9000 : 3600;"), 'every phase has a ceiling');
      const pilot = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      assert(pilot.includes("damagedRoots: stormfrontCinematicRef.current.mode === 'celebration' ? []"), 'the celebration strike breaks nothing');
      assert(pilot.includes("celebration: stormfrontCinematicRef.current.mode === 'celebration',"), 'the celebration plays the short golden timeline');
      const cinematic = fsMod.readFileSync('src/features/gamification/level-worlds/dev/StormfrontCinematic.ts', 'utf8');
      assert(cinematic.includes('const CELEBRATION_TIME_OFFSET = STORMFRONT_CINEMATIC.boom - 1.2;')
        && cinematic.includes('const frame = celebration ? { ...stormFrame, storm: 0, rain: 0, wave: null } : stormFrame;'), 'no dark build-up, rain or lightning wall; strike ~1.2 s in');
      const css = fsMod.readFileSync('src/features/gamification/level-worlds/LevelWorlds.css', 'utf8');
      const finale = css.slice(css.indexOf('@keyframes island-run-arena-ceremony-in'));
      assert(!finale.slice(0, finale.indexOf('}\n}') + 3).includes('opacity: 0; }\n}'), 'the finale only fades in, so it can never end invisible');
    },
  },
];
