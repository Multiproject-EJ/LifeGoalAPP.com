import { ARRIVAL_CONTROLLER_HANDOFF, ARRIVAL_CONTROLLER_SUIT_END, ARRIVAL_CONTROLLER_SUIT_START } from '../../dev/Island001ArrivalController';
import { assert, type TestCase } from './testHarness';

export const island001ArrivalControllerTests: TestCase[] = [
  {
    name: 'Island 001 opening: the real controller flies in and suits up into the white ship before the unfold',
    run: async () => {
      // @ts-ignore Node-only source contract check.
      const fs = await import('fs');
      const arrival = fs.readFileSync('src/features/gamification/level-worlds/dev/Island001FirstArrival.ts', 'utf8');
      const controller = fs.readFileSync('src/features/gamification/level-worlds/dev/Island001ArrivalController.ts', 'utf8');
      assert(controller.includes("'../components/living-controller/controller-shell.glb'"), 'uses the actual game controller shell');
      assert(controller.includes('ARRIVAL_CONTROLLER_TREETOP_WINDOW') && controller.includes('new THREE.Vector3(0, 0.9, 20)'), 'the roll window shows the treetop, seated on the face');
      assert(arrival.includes('ship.root.visible=!arrivalController.update(t,reduced);'), 'the ship only appears once the controller hands off');
      assert(ARRIVAL_CONTROLLER_SUIT_START >= 13 && ARRIVAL_CONTROLLER_SUIT_END <= 14.5, 'suit-up lands between ocean braking and the 14 s unfold');
      assert(ARRIVAL_CONTROLLER_HANDOFF > 0.5 && ARRIVAL_CONTROLLER_HANDOFF < 1, 'the flash covers the swap');
    },
  },
];
