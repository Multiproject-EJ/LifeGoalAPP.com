import {
  COMPASS_PHASES,
  getCompassDirectionForIsland,
  getCompassPhase,
  getSpokeForIsland,
} from '../compassCurriculum';
import { assert, assertEqual, type TestCase } from './testHarness';

export const compassCurriculumTests: TestCase[] = [
  {
    name: 'the 11 phases tile islands 1..120 with no gaps or overlaps',
    run: () => {
      assertEqual(COMPASS_PHASES.length, 11, 'There are 11 compass phases');
      assertEqual(COMPASS_PHASES[0].islandRange[0], 1, 'First phase starts at island 1');
      assertEqual(COMPASS_PHASES[COMPASS_PHASES.length - 1].islandRange[1], 120, 'Last phase ends at island 120');
      for (let i = 1; i < COMPASS_PHASES.length; i += 1) {
        const prevEnd = COMPASS_PHASES[i - 1].islandRange[1];
        const start = COMPASS_PHASES[i].islandRange[0];
        assertEqual(start, prevEnd + 1, `Phase ${COMPASS_PHASES[i].id} is contiguous`);
      }
    },
  },
  {
    name: 'every island 1..120 resolves to exactly one phase',
    run: () => {
      for (let island = 1; island <= 120; island += 1) {
        const phase = getCompassPhase(island);
        assert(
          island >= phase.islandRange[0] && island <= phase.islandRange[1],
          `Island ${island} falls inside its resolved phase ${phase.id}`,
        );
      }
    },
  },
  {
    name: 'phase boundaries map to the notepad curriculum',
    run: () => {
      assertEqual(getCompassPhase(1).label, 'Compass 1.0', 'Island 1 is Compass 1.0');
      assertEqual(getCompassPhase(20).label, 'Compass 1.0', 'Island 20 is Compass 1.0');
      assertEqual(getCompassPhase(21).label, 'Personality 1.0', 'Island 21 is Personality 1.0');
      assertEqual(getCompassPhase(31).label, 'Habits 1.0', 'Island 31 is Habits 1.0');
      assertEqual(getCompassPhase(60).label, 'Habits 2.0', 'Island 60 is Habits 2.0');
      assertEqual(getCompassPhase(85).shieldHalf, 'body', 'Island 85 is Shield Body');
      assertEqual(getCompassPhase(105).shieldHalf, 'mind', 'Island 105 is Shield Mind');
      assertEqual(getCompassPhase(120).label, 'Compass 2.0', 'Island 120 is Compass 2.0');
    },
  },
  {
    name: 'clamps out-of-range island numbers',
    run: () => {
      assertEqual(getCompassPhase(0).id, 'P1', 'Island 0 clamps to first phase');
      assertEqual(getCompassPhase(999).id, 'P11', 'Island 999 clamps to last phase');
      assertEqual(getCompassPhase(Number.NaN).id, 'P1', 'NaN clamps to first phase');
    },
  },
  {
    name: 'spoke for each island matches its phase',
    run: () => {
      assertEqual(getSpokeForIsland(25), 'personality', 'Personality phase fills personality spoke');
      assertEqual(getSpokeForIsland(45), 'goals', 'Goals phase fills goals spoke');
      assertEqual(getSpokeForIsland(85), 'shield', 'Shield phase fills shield spoke');
      assertEqual(getSpokeForIsland(10), 'center', 'Compass phase fills center');
    },
  },
  {
    name: 'compass phases walk the four ikigai directions in 5-island blocks',
    run: () => {
      assertEqual(getCompassDirectionForIsland(1), 'heart', 'Island 1 → Heart');
      assertEqual(getCompassDirectionForIsland(5), 'heart', 'Island 5 → Heart');
      assertEqual(getCompassDirectionForIsland(6), 'craft', 'Island 6 → Craft');
      assertEqual(getCompassDirectionForIsland(11), 'cause', 'Island 11 → Cause');
      assertEqual(getCompassDirectionForIsland(16), 'livelihood', 'Island 16 → Livelihood');
      assertEqual(getCompassDirectionForIsland(20), 'livelihood', 'Island 20 → Livelihood');
      // Re-fill phase walks the directions again.
      assertEqual(getCompassDirectionForIsland(111), 'heart', 'Island 111 → Heart (re-fill)');
      assertEqual(getCompassDirectionForIsland(120), 'livelihood', 'Island 120 → Livelihood (re-fill)');
    },
  },
  {
    name: 'non-compass islands have no direction',
    run: () => {
      assertEqual(getCompassDirectionForIsland(25), null, 'Personality island has no ikigai direction');
      assertEqual(getCompassDirectionForIsland(85), null, 'Shield island has no ikigai direction');
    },
  },
];
