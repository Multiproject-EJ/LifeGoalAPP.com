import {
  ISLAND_22_DRAGON_CINEMATIC_SECONDS,
  ISLAND_22_DRAGON_APERTURE_FILL_RATIO,
  ISLAND_22_DRAGON_ERUPTION_BODY_RADIUS,
  ISLAND_22_DRAGON_ERUPTION_CENTER_OFFSET_XZ,
  ISLAND_22_DRAGON_FOLDED_BODY_LENGTH,
  ISLAND_22_DRAGON_FULL_LAUNCH_TAIL_Y,
  ISLAND_22_DRAGON_TRIGGER_KG,
  ISLAND_22_DRAGON_TRIGGER_LB,
  ISLAND_22_FISH_TARGET_KG,
  ISLAND_22_FISH_TARGET_LB,
  ISLAND_22_POND_APERTURE_RADIUS,
  resolveIsland22WaterDragonPhase,
} from '../../dev/Island22WaterDragonMission';
import {
  createIsland22FishingMissionPrototype,
  island22KilogramsToPounds,
  ISLAND_22_REPAIR_STEPS,
  ISLAND_22_ROD_TILE_INDEX,
  ISLAND_22_SCRIPTED_CATCHES,
  ISLAND_22_TREASURE_DICE_PREVIEW,
} from '../../dev/Island22FishingMissionPrototype';
import { assertEqual, type TestCase } from './testHarness';

export const island22WaterDragonMissionTests: TestCase[] = [
  {
    name: 'keeps the fisherman mission units and disaster trigger explicit',
    run: () => {
      assertEqual(ISLAND_22_FISH_TARGET_KG, 100, 'mission target stays at 100 kg');
      assertEqual(ISLAND_22_FISH_TARGET_LB, 220.5, 'mission target exposes pounds');
      assertEqual(ISLAND_22_DRAGON_TRIGGER_KG, 78, 'dragon disaster starts at the scripted 78 kg total');
      assertEqual(ISLAND_22_DRAGON_TRIGGER_LB, 172, 'dragon trigger exposes pounds');
      assertEqual(ISLAND_22_DRAGON_CINEMATIC_SECONDS, 23.5, 'the longer flight and dive are not rushed');
    },
  },
  {
    name: 'plays every required mission beat in order',
    run: () => {
      assertEqual(resolveIsland22WaterDragonPhase(0), 'vortex', 'pond starts swirling');
      assertEqual(resolveIsland22WaterDragonPhase(3), 'evacuation', 'fishers evacuate');
      assertEqual(resolveIsland22WaterDragonPhase(6), 'ground-shake', 'ground shakes before reveal');
      assertEqual(resolveIsland22WaterDragonPhase(8), 'eruption', 'folded dragon erupts');
      assertEqual(resolveIsland22WaterDragonPhase(11), 'unfurl', 'wings and limbs unfurl after the tail clears');
      assertEqual(resolveIsland22WaterDragonPhase(15), 'flight', 'dragon takes its wider, longer flight');
      assertEqual(resolveIsland22WaterDragonPhase(20.5), 'dive', 'dragon dives into the ocean');
      assertEqual(resolveIsland22WaterDragonPhase(22.8), 'repair-mission', 'concrete repair mission follows the impact splash');
    },
  },
  {
    name: 'makes the first erupting torso nearly fill the drained pond aperture',
    run: () => {
      assertEqual(ISLAND_22_POND_APERTURE_RADIUS, 3.34, 'runtime pond radius remains the scale authority');
      assertEqual(ISLAND_22_DRAGON_ERUPTION_BODY_RADIUS, 3, 'colossus torso radius matches the approved shaft scale');
      if (ISLAND_22_DRAGON_APERTURE_FILL_RATIO < 0.89) {
        throw new Error(`eruption body fills only ${ISLAND_22_DRAGON_APERTURE_FILL_RATIO} of the aperture radius`);
      }
      assertEqual(ISLAND_22_DRAGON_ERUPTION_CENTER_OFFSET_XZ, 0, 'erupting body stays coaxial with the well instead of behind it');
    },
  },
  {
    name: 'clears the entire folded body above the island before unfurling',
    run: () => {
      assertEqual(ISLAND_22_DRAGON_FOLDED_BODY_LENGTH, 24, 'folded launch body length stays explicit');
      if (ISLAND_22_DRAGON_FULL_LAUNCH_TAIL_Y < 9) {
        throw new Error(`launch tail clears only to y=${ISLAND_22_DRAGON_FULL_LAUNCH_TAIL_Y}`);
      }
    },
  },
  {
    name: 'locks the deterministic fishing interruption and rebuild loop',
    run: () => {
      const mission = createIsland22FishingMissionPrototype();
      assertEqual(mission.getState().targetTileIndex, ISLAND_22_ROD_TILE_INDEX, 'rod tile is the first target');
      assertEqual(mission.landOnTargetTile(ISLAND_22_ROD_TILE_INDEX), true, 'landing collects the rod');

      const finishCurrentCatch = () => {
        assertEqual(mission.cast(), true, 'cast activates the next catch tile');
        const target = mission.getState().targetTileIndex;
        if (target === null) throw new Error('cast did not select a fish tile');
        assertEqual(mission.landOnTargetTile(target), true, 'landing hooks the active catch');
        while (mission.getState().phase === 'reeling') mission.pull();
      };

      for (let index = 0; index < 4; index += 1) finishCurrentCatch();
      assertEqual(mission.getState().caughtKilograms, 46, 'ordinary catches stop at 46 kg');
      finishCurrentCatch();
      assertEqual(mission.getState().caughtKilograms, 78, '32 kg monster catch lands at exactly 78 kg');
      assertEqual(mission.getState().phase, 'dragon-cinematic', 'dragon locks fishing input at 78 kg');
      assertEqual(mission.cast(), false, 'casting remains locked during the dragon');

      assertEqual(mission.completeDragonCinematic(), true, 'impact opens the rebuild phase');
      for (let step = 0; step < ISLAND_22_REPAIR_STEPS; step += 1) mission.repair();
      assertEqual(mission.getState().phase, 'ready-to-cast', 'fishing resumes only after five repairs');

      finishCurrentCatch();
      assertEqual(mission.getState().treasureDicePreview, ISLAND_22_TREASURE_DICE_PREVIEW, 'treasure is a previewed mission reward');
      assertEqual(mission.getState().caughtKilograms, 78, 'treasure does not fake fish weight');
      finishCurrentCatch();
      finishCurrentCatch();
      assertEqual(mission.getState().caughtKilograms, 100, 'post-repair catches finish the 100 kg goal');
      assertEqual(mission.getState().phase, 'completed', 'mission completes at 100 kg');
      assertEqual(island22KilogramsToPounds(100), 220.5, 'the public progress bar exposes pounds');
      assertEqual(ISLAND_22_SCRIPTED_CATCHES[4]?.pulls, 10, 'monster catch keeps the intended struggle length');
    },
  },
];
