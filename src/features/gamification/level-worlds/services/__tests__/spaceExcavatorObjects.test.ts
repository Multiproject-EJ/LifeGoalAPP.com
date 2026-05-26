import { chooseSpaceExcavatorObjectShape } from '../spaceExcavatorObjects';
import { assert, type TestCase } from './testHarness';

export const spaceExcavatorObjectsTests: TestCase[] = [
  {
    name: 'early boards stay in common pool and avoid larger high-tier shapes',
    run: () => {
      for (let boardIndex = 0; boardIndex < 8; boardIndex += 1) {
        const shape = chooseSpaceExcavatorObjectShape('space_excavator:event-a', boardIndex);
        assert(shape.tier === 'common', `board ${boardIndex + 1} should stay common-tier`);
      }
    },
  },
  {
    name: 'late boards can roll epic shapes',
    run: () => {
      let sawEpic = false;
      for (let boardIndex = 26; boardIndex < 60; boardIndex += 1) {
        const shape = chooseSpaceExcavatorObjectShape('space_excavator:event-a', boardIndex);
        if (shape.tier === 'epic') {
          sawEpic = true;
          break;
        }
      }
      assert(sawEpic, 'late progression should include epic shape opportunities');
    },
  },
];
