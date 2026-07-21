import { evaluateIslandKit, ISLAND_KIT_SCENE } from '../../dev/islandCameraLockedKit';
import type { TestCase } from './testHarness';

export const islandCameraLockedKitTests: TestCase[] = [
  {
    name: 'locks the playable board to the exact scene center',
    run: () => {
      const board = ISLAND_KIT_SCENE.playableBoard;
      const centerX = board.x + board.width / 2;
      const centerY = board.y + board.height / 2;
      if (centerX !== ISLAND_KIT_SCENE.centerX || centerY !== ISLAND_KIT_SCENE.centerY) {
        throw new Error(`Expected locked board center, received ${centerX}, ${centerY}`);
      }
    },
  },
  {
    name: 'keeps every production geometry gate passing',
    run: () => {
      const failures = evaluateIslandKit().filter((check) => !check.passed);
      if (failures.length > 0) throw new Error(failures.map((failure) => failure.label).join(', '));
    },
  },
  {
    name: 'doubles landmark envelopes at every build level',
    run: () => {
      const [level1, level2, level3] = ISLAND_KIT_SCENE.landmarkEnvelope.levelSizes;
      if (level2 !== level1 * 2 || level3 !== level2 * 2) {
        throw new Error(`Invalid landmark ladder: ${level1}, ${level2}, ${level3}`);
      }
    },
  },
];
