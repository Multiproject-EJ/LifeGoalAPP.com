import { assert, assertEqual, type TestCase } from './testHarness';
import {
  STORMFRONT_CINEMATIC,
  STORMFRONT_MIN_FLASH_GAP_SECONDS,
  STORMFRONT_WAVE_FLASH_TIMES,
  resolveStormfrontCinematicBeat,
  resolveStormfrontCinematicFrame,
} from '../island2StormfrontCinematic';

const sample = (reduced: boolean) => Array.from({ length: Math.ceil(STORMFRONT_CINEMATIC.duration * 100) + 1 }, (_, i) => ({ t: i / 100, ...resolveStormfrontCinematicFrame(i / 100, reduced) }));

export const island2StormfrontCinematicTests: TestCase[] = [
  {
    name: 'island2 stormfront cinematic: storm gathers, the wave approaches and stops, calm, then BOOM and clearing',
    run: () => {
      const order = ['gathering', 'wave', 'calm', 'boom', 'aftermath', 'done'];
      let last = 0;
      for (const frame of sample(false)) {
        const index = order.indexOf(resolveStormfrontCinematicBeat(frame.t));
        assert(index >= last, `beats never go backwards at ${frame.t}`);
        last = index;
      }
      assertEqual(resolveStormfrontCinematicBeat(STORMFRONT_CINEMATIC.duration), 'done', 'ends');
      const wave = sample(false).filter((frame) => frame.wave !== null);
      assert(wave.every((frame, i) => i === 0 || frame.wave! >= wave[i - 1].wave!), 'the wave only advances towards the island');
      assertEqual(resolveStormfrontCinematicFrame(STORMFRONT_CINEMATIC.waveStop + 0.1, false).wave, 1, 'the wave stops at the shore and holds');
      assertEqual(resolveStormfrontCinematicFrame(STORMFRONT_CINEMATIC.waveStart + 1, false).storm, 1, 'full storm during the wave');
      const calm = resolveStormfrontCinematicFrame(STORMFRONT_CINEMATIC.boom - 0.05, false);
      assert(calm.rain === 0 && calm.storm < 0.5 && calm.flash === 0 && calm.boomAge === null, 'rain stopped and clearing, all seems good, before the strike');
      const boom = resolveStormfrontCinematicFrame(STORMFRONT_CINEMATIC.boom + 0.05, false);
      assert(boom.flash > 0.8 && boom.shake > 0.5 && boom.beat === 'boom', 'the strike flashes and shakes');
      const end = resolveStormfrontCinematicFrame(STORMFRONT_CINEMATIC.duration, false);
      assert(end.storm === 0 && end.rain === 0 && end.shake === 0, 'the sky is clear when the add-on message arrives');
    },
  },
  {
    name: 'island2 stormfront cinematic: flashes stay photosensitivity-safe and reduced motion removes flash and shake',
    run: () => {
      const starts = [...STORMFRONT_WAVE_FLASH_TIMES, STORMFRONT_CINEMATIC.boom];
      starts.forEach((at, i) => {
        if (i > 0) assert(at - starts[i - 1] >= STORMFRONT_MIN_FLASH_GAP_SECONDS, `≤ 3 flashes per second (${at})`);
      });
      const reduced = sample(true);
      assert(reduced.every((frame) => frame.flash === 0 && frame.shake === 0), 'reduced motion: no flashes, no shake');
      assert(reduced.some((frame) => frame.storm === 1) && reduced.some((frame) => frame.boomAge !== null), 'reduced motion still tells the story');
    },
  },
  {
    name: 'island2 stormfront: board presents through canonical actions, top-level modals and the 3D pilot',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('void strikeIsland2Stormfront({ session, client })'), 'the strike is a canonical action');
      assert(board.includes('void markIsland2StormfrontSeen({ session, client })'), 'the seen stamp is a canonical action');
      assert(board.includes('fundIsland2StormfrontStructure({ session, client, structureId })'), 'building is a canonical action');
      assert(board.includes('stormfrontAwaitingCinematic && STORMFRONT_DAMAGED_STOP_INDICES.includes(index)'), 'struck landmarks keep Level 3 on screen until the storm is shown');
      assert(board.includes('stormfrontCinematicActive={stormfrontCinematicPlaying}'), 'the storm plays in the 3D board');
      assert(board.includes('addOnMission={showMissionPhoneBriefing ? stormfrontAddOnMission : undefined}'), 'the add-on shows in the Mission Phone');
      assert(board.includes('id: stormfrontMessageId'), 'the add-on arrives as a Mission Phone message');
      assert(!/persistIslandRunRuntimeStatePatch\([^)]*stormfront/i.test(board), 'no UI gameplay writes');
      const modals = fsMod.readFileSync('src/features/gamification/level-worlds/components/Island2StormfrontModals.tsx', 'utf8');
      assert(modals.includes('document.body') && modals.includes('useControllerShopScrollLock()'), 'modals portal to body and lock scrolling');
      const pilot = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      assert(pilot.includes('createIsland2StormfrontCinematic({'), 'the pilot owns the storm scene');
    },
  },
  {
    name: 'island2 stormfront: the grid and hangar stand on the board after the storm, grow per level and carry flags',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const structures = fsMod.readFileSync('src/features/gamification/level-worlds/dev/StormfrontStructures.ts', 'utf8');
      assert(structures.includes('const RODS_BY_LEVEL = [0, 2, 4, 6];'), 'rods grow with the grid level');
      assert(structures.includes('roof.visible = hangarLevel >= 3;') && structures.includes('ribs.forEach((rib) => { rib.visible = hangarLevel >= 2; });'), 'the hangar is covered at Level 3');
      assert(structures.includes('stakeMarkers.forEach((marker) => { marker.visible = hangarLevel === 0; });'), 'survey stakes mark where it will stand');
      assert(structures.includes('floating sky-dock'), 'the hangar never lands on top of a landmark');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes("stormfrontProgress.struckAtMs === null || stormfrontAwaitingCinematic) return null;"), 'structures appear only after the storm has been shown');
      assert(board.includes('onStormfrontStructureClick={isIslandVisualPreview ? undefined : () => setShowStormfrontBuild(true)}'), 'tapping a structure opens the build panel');
      const pilot = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      assert(pilot.includes("const target: LandmarkFlag = !stormfrontLevels ? 'none' : level >= 3 ? 'green' : 'red';"), 'each structure has a flag: red until Level 3, then green');
      assert(pilot.includes('groundRay.camera = camera;'), 'ground probing never trips sprite raycasts');
    },
  },
];
