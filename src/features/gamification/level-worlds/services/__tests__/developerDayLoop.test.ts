import {
  buildDeveloperDayLoopMetadataPatch,
  DEVELOPER_DAY_LOOP_MAX_DAY,
  normalizeDeveloperDayLoopDay,
  readDeveloperDayLoopDay,
  resolveDeveloperDayLoopScenario,
} from '../developerDayLoop';
import { assertEqual, assertDeepEqual, type TestCase } from './testHarness';

export const developerDayLoopTests: TestCase[] = [
  {
    name: 'developer day loop clamps invalid day values to its supported range',
    run: () => {
      assertEqual(normalizeDeveloperDayLoopDay('not-a-day'), 1, 'invalid input should resolve to day 1');
      assertEqual(normalizeDeveloperDayLoopDay(-4), 1, 'negative input should resolve to day 1');
      assertEqual(normalizeDeveloperDayLoopDay(3.9), 3, 'fractional input should floor to a whole journey day');
      assertEqual(
        normalizeDeveloperDayLoopDay(DEVELOPER_DAY_LOOP_MAX_DAY + 10),
        DEVELOPER_DAY_LOOP_MAX_DAY,
        'large input should clamp to the maximum supported journey day',
      );
    },
  },
  {
    name: 'day 1 is the only destructive fresh-start scenario',
    run: () => {
      const scenario = resolveDeveloperDayLoopScenario(1);
      assertEqual(scenario.entryPoint, 'founder_welcome', 'day 1 should relaunch founder welcome');
      assertEqual(scenario.resetIslandRunProgress, true, 'day 1 should reset Island Run');
      assertEqual(scenario.startFlowComplete, false, 'day 1 should reopen the first-start flow');
    },
  },
  {
    name: 'later days preserve earned progress and reopen Today',
    run: () => {
      const scenario = resolveDeveloperDayLoopScenario(7);
      assertEqual(scenario.entryPoint, 'today', 'later days should reopen Today');
      assertEqual(scenario.resetIslandRunProgress, false, 'later days should preserve game progress');
      assertEqual(scenario.startFlowComplete, true, 'later days should skip the founder flow');
    },
  },
  {
    name: 'metadata patch persists the journey day without changing the device date',
    run: () => {
      assertDeepEqual(
        buildDeveloperDayLoopMetadataPatch(2, '2026-07-28T12:00:00.000Z'),
        {
          developer_journey_day: 2,
          developer_journey_day_set_at: '2026-07-28T12:00:00.000Z',
          start_flow_complete: true,
        },
        'metadata patch should contain only the developer journey marker and first-start state',
      );
      assertEqual(
        readDeveloperDayLoopDay({ developer_journey_day: '4' }),
        4,
        'stored metadata day should round-trip',
      );
    },
  },
];
