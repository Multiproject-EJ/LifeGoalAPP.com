import { resolveLandmarkFlag } from '../landmarkFlags';
import { assertEqual, type TestCase } from './testHarness';

export const landmarkFlagsTests: TestCase[] = [
  {
    name: 'Landmark flags: none before building, red while unfinished, green at Level 3 / 100%',
    run: () => {
      assertEqual(resolveLandmarkFlag({ level: 0, percent: 0 }), 'none', 'untouched landmark has no flag yet');
      assertEqual(resolveLandmarkFlag({ level: 0, percent: 12 }), 'red', 'the first build raises a red flag');
      assertEqual(resolveLandmarkFlag({ level: 1 }), 'red', 'Level 1 is still red');
      assertEqual(resolveLandmarkFlag({ level: 2, percent: 99 }), 'red', 'Level 2 at 99% is still red');
      assertEqual(resolveLandmarkFlag({ level: 3 }), 'green', 'Level 3 turns the flag green');
      assertEqual(resolveLandmarkFlag({ level: 2, percent: 100 }), 'green', '100% is green');
      assertEqual(resolveLandmarkFlag({ level: Number.NaN }), 'none', 'bad input is safe');
    },
  },
];
