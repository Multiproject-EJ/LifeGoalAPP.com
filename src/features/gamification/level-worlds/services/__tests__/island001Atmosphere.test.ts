import {
  ISLAND_001_LIGHTING,
  resolveIsland001DayPosition,
  resolveIsland001Lighting,
  resolveIsland001PathGlow,
  resolveIsland001StreetlightCount,
  resolveIsland001TimeOfDay,
  stepIsland001DayPosition,
} from '../island001Atmosphere';
import { assert, assertEqual, type TestCase } from './testHarness';

const progress = (buildLevels: number[], assemblyComplete = false) => ({ buildLevels, assemblyComplete });

export const island001AtmosphereTests: TestCase[] = [
  {
    name: 'Island 001 time of day follows progress: sunrise → daylight → golden hour → night',
    run: () => {
      assertEqual(resolveIsland001TimeOfDay(resolveIsland001DayPosition(progress([0, 0, 0, 0]))), 'sunrise', 'arrival is sunrise');
      assertEqual(resolveIsland001TimeOfDay(resolveIsland001DayPosition(progress([2, 1, 2, 1]))), 'daylight', 'half built is daylight');
      assertEqual(resolveIsland001TimeOfDay(resolveIsland001DayPosition(progress([3, 3, 3, 3]))), 'golden', 'all Level 3 is golden hour');
      assertEqual(resolveIsland001DayPosition(progress([3, 3, 3, 3], true)), 3, 'buildings and Assembly complete bring night');
      assertEqual(resolveIsland001DayPosition(progress([3, 3, 3, 2], true)), 11 / 6, 'night needs every building at Level 3 too');
      assertEqual(resolveIsland001DayPosition(progress([9, 9, 9, 9])), 2, 'levels above 3 are clamped');
    },
  },
  {
    name: 'Island 001 lighting: daylight keeps today\'s look; night is lit and starry, never pitch black',
    run: () => {
      const day = resolveIsland001Lighting(1);
      assertEqual(day.sunIntensity, ISLAND_001_LIGHTING.daylight.sunIntensity, 'daylight keyframe is exact');
      assertEqual(day.lampGlow, 0, 'lamps are off in daylight');
      const night = resolveIsland001Lighting(3);
      assertEqual(night.lampGlow, 1, 'lamps fully on at night');
      assertEqual(night.stars, 1, 'stars at night');
      assert(night.hemisphereIntensity >= 0.5 && night.environment > 0, 'night keeps the board readable, never pitch black');
      const halfway = resolveIsland001Lighting(2.5);
      assert(halfway.lampGlow > ISLAND_001_LIGHTING.golden.lampGlow && halfway.lampGlow < 1, 'transitions blend between keyframes');
    },
  },
  {
    name: 'Island 001 streetlights arrive with the first Level 1; the path glows as night falls',
    run: () => {
      assertEqual(resolveIsland001StreetlightCount(progress([0, 0, 0, 0]), 16), 0, 'no lamps before any building');
      assertEqual(resolveIsland001StreetlightCount(progress([1, 0, 0, 0]), 16), 2, 'first pair on the first Level 1');
      assertEqual(resolveIsland001StreetlightCount(progress([3, 3, 3, 3]), 16), 16, 'every lamp when all are Level 3');
      assertEqual(resolveIsland001PathGlow(progress([3, 3, 3, 3], true), 0), 0, 'no path glow in daylight');
      assertEqual(resolveIsland001PathGlow(progress([3, 3, 3, 3], true), 1), 1, 'full path glow at night on a finished island');
      assertEqual(resolveIsland001PathGlow(progress([0, 0, 0, 0]), 1), 0, 'an undeveloped path does not glow');
    },
  },
  {
    name: 'Island 001 day eases toward its target instead of swapping',
    run: () => {
      const next = stepIsland001DayPosition(0, 3, 1 / 60);
      assert(next > 0 && next < 0.05, 'one frame moves a little');
      let position = 0;
      for (let frame = 0; frame < 60 * 30; frame += 1) position = stepIsland001DayPosition(position, 3, 1 / 60);
      assertEqual(position, 3, 'settles on the target');
    },
  },
];
