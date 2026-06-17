import {
  COMPASS_SPOKE_COMPLETE_THRESHOLD,
  applyContribution,
  isCompassSessionFilledForIsland,
  parseCompassState,
  type CompassTemplate,
} from '../../../../../services/compassState';
import { getCompassPhase } from '../compassCurriculum';
import { assert, assertEqual, type TestCase } from './testHarness';

function blankTemplate(): CompassTemplate {
  return parseCompassState(null);
}

export const compassStateReducerTests: TestCase[] = [
  {
    name: 'parseCompassState(null) yields an empty template with all spokes',
    run: () => {
      const template = blankTemplate();
      assertEqual(template.templateVersion, 0, 'Version starts at 0');
      assertEqual(template.spokes.center.status, 'empty', 'Center spoke starts empty');
      assertEqual(template.spokes.shield.entries.length, 0, 'Shield starts with no entries');
    },
  },
  {
    name: 'a habit contribution appends to the phase spoke and sets in_progress',
    run: () => {
      const next = applyContribution(blankTemplate(), {
        phase: getCompassPhase(31), // Habits 1.0
        kind: 'habit',
        text: 'Drink one glass of water',
        islandNumber: 31,
        linkedHabitId: 'habit-1',
      });
      assertEqual(next.spokes.habits.entries.length, 1, 'Habits spoke has one entry');
      assertEqual(next.spokes.habits.status, 'in_progress', 'Spoke is in progress');
      assertEqual(next.spokes.habits.entries[0].linkedHabitId, 'habit-1', 'Entry keeps the linked habit id');
      assertEqual(next.currentPhase, 'P3', 'Current phase updated');
    },
  },
  {
    name: 'a spoke completes once it reaches the threshold',
    run: () => {
      let template = blankTemplate();
      for (let i = 0; i < COMPASS_SPOKE_COMPLETE_THRESHOLD; i += 1) {
        template = applyContribution(template, {
          phase: getCompassPhase(45), // Goals 1.0
          kind: 'wisdom',
          text: `goal reflection ${i}`,
          islandNumber: 45,
        });
      }
      assertEqual(template.spokes.goals.entries.length, COMPASS_SPOKE_COMPLETE_THRESHOLD, 'Reached threshold entries');
      assertEqual(template.spokes.goals.status, 'complete', 'Goals spoke is complete');
    },
  },
  {
    name: 'compass-phase contributions capture ikigai directions and fill the template',
    run: () => {
      let template = blankTemplate();
      const islandsByDirection = { heart: 1, craft: 6, cause: 11, livelihood: 16 };
      for (const [, island] of Object.entries(islandsByDirection)) {
        template = applyContribution(template, {
          phase: getCompassPhase(island),
          direction: getCompassPhase(island).theme === 'compass'
            ? (['heart', 'craft', 'cause', 'livelihood'] as const)[Math.floor((island - 1) / 5)]
            : undefined,
          kind: 'wisdom',
          text: `direction answer ${island}`,
          islandNumber: island,
        });
      }
      assert(Boolean(template.directions.heart), 'Heart direction captured');
      assert(Boolean(template.directions.livelihood), 'Livelihood direction captured');
      assertEqual(template.templateVersion, 1, 'Template version bumps to 1 when all four directions are filled');
    },
  },
  {
    name: 'filled Compass sessions are detected for both direction and spoke phases',
    run: () => {
      const directionTemplate = applyContribution(blankTemplate(), {
        phase: getCompassPhase(1),
        direction: 'heart',
        kind: 'wisdom',
        text: 'I love building useful things',
        islandNumber: 1,
      });
      assertEqual(isCompassSessionFilledForIsland(directionTemplate, 1), true, 'Filled direction counts as current Compass session');
      assertEqual(isCompassSessionFilledForIsland(directionTemplate, 6), false, 'Other direction remains unfilled');

      const spokeTemplate = applyContribution(blankTemplate(), {
        phase: getCompassPhase(31),
        kind: 'habit',
        text: 'Drink one glass of water',
        islandNumber: 31,
      });
      assertEqual(isCompassSessionFilledForIsland(spokeTemplate, 31), true, 'Same-island spoke entry counts as current session');
      assertEqual(isCompassSessionFilledForIsland(spokeTemplate, 32), false, 'Another island in the same spoke still needs its own session box');
    },
  },
  {
    name: 'spoke version tracks the highest phase version seen',
    run: () => {
      let template = applyContribution(blankTemplate(), {
        phase: getCompassPhase(31), // Habits 1.0
        kind: 'habit',
        text: 'v1 habit',
        islandNumber: 31,
      });
      template = applyContribution(template, {
        phase: getCompassPhase(55), // Habits 2.0
        kind: 'habit',
        text: 'v2 habit',
        islandNumber: 55,
      });
      assertEqual(template.spokes.habits.version, 2, 'Habits spoke version advanced to 2');
    },
  },
];
