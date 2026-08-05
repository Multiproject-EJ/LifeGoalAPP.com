/**
 * Legacy Compass retention-read tests.
 *
 * The 11-phase Compass no longer has a write path — `applyContribution`,
 * `recordCompassContribution`, `setCompassCenterStatement` and
 * `isCompassSessionFilledForIsland` were removed with the last writers, so the
 * reducer cases that used to live here have no subject any more.
 *
 * What still matters is that `parseCompassState` can read rows players already
 * wrote, because that is the only path by which their direction text can be
 * exported or migrated into the Compass Book before the table is dropped. These
 * tests guard that parse, including defensive handling of malformed JSONB.
 */

import {
  parseCompassState,
  type CompassTemplate,
} from '../../../../../services/compassState';
import { assert, assertEqual, type TestCase } from './testHarness';

type CompassStateRowLike = Parameters<typeof parseCompassState>[0];

/** A row shaped like one a real player would have written mid-journey. */
function populatedRow(): CompassStateRowLike {
  return {
    user_id: 'user-1',
    template_version: 1,
    current_phase: 'P3',
    center_statement: 'Build useful things with people I trust',
    directions: {
      heart: 'I love building useful things',
      craft: 'Systems thinking',
      cause: 'Helping beginners start',
      livelihood: 'Teaching and tools',
    },
    spokes: {
      habits: {
        version: 1,
        status: 'in_progress',
        entries: [
          {
            kind: 'habit',
            text: 'Drink one glass of water',
            islandNumber: 31,
            phaseId: 'P3',
            spoke: 'habits',
            linkedHabitId: 'habit-1',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    },
    completed_phases: ['P1', 'P2'],
    updated_at: '2026-01-01T00:00:00.000Z',
  } as unknown as CompassStateRowLike;
}

export const compassStateReducerTests: TestCase[] = [
  {
    name: 'parseCompassState(null) yields an empty template with all spokes',
    run: () => {
      const template: CompassTemplate = parseCompassState(null);
      assertEqual(template.templateVersion, 0, 'Version starts at 0');
      assertEqual(template.centerStatement, null, 'No center statement');
      assertEqual(template.spokes.center.status, 'empty', 'Center spoke starts empty');
      assertEqual(template.spokes.shield.entries.length, 0, 'Shield starts with no entries');
      assertEqual(template.completedPhases.length, 0, 'No completed phases');
    },
  },
  {
    name: 'a retained row parses back into readable direction and spoke text',
    run: () => {
      const template = parseCompassState(populatedRow());
      assertEqual(template.templateVersion, 1, 'Template version preserved');
      assertEqual(template.currentPhase, 'P3', 'Current phase preserved');
      assertEqual(
        template.centerStatement,
        'Build useful things with people I trust',
        'True North text preserved',
      );
      assertEqual(template.directions.heart, 'I love building useful things', 'Heart direction preserved');
      assertEqual(template.directions.livelihood, 'Teaching and tools', 'Livelihood direction preserved');
      assertEqual(template.spokes.habits.entries.length, 1, 'Habit spoke entry preserved');
      assertEqual(
        template.spokes.habits.entries[0].text,
        'Drink one glass of water',
        'Entry text preserved for migration',
      );
      assertEqual(template.spokes.habits.entries[0].linkedHabitId, 'habit-1', 'Linked habit id preserved');
      assertEqual(template.completedPhases.length, 2, 'Completed phases preserved');
    },
  },
  {
    name: 'spokes absent from a retained row read back as empty, not undefined',
    run: () => {
      const template = parseCompassState(populatedRow());
      // Only `habits` was persisted; the rest must still be safe to read.
      for (const key of ['center', 'personality', 'goals', 'shield'] as const) {
        assertEqual(template.spokes[key].status, 'empty', `${key} spoke reads as empty`);
        assertEqual(template.spokes[key].entries.length, 0, `${key} spoke has no entries`);
      }
    },
  },
  {
    name: 'malformed JSONB degrades to an empty template instead of throwing',
    run: () => {
      const row = {
        user_id: 'user-1',
        template_version: null,
        current_phase: null,
        center_statement: null,
        directions: 'not-an-object',
        spokes: ['not-an-object'],
        completed_phases: null,
        updated_at: '2026-01-01T00:00:00.000Z',
      } as unknown as CompassStateRowLike;

      const template = parseCompassState(row);
      assertEqual(template.templateVersion, 0, 'Missing version falls back to 0');
      assertEqual(Object.keys(template.directions).length, 0, 'Malformed directions drop out');
      assertEqual(template.spokes.habits.entries.length, 0, 'Malformed spokes read as empty');
      assert(Array.isArray(template.completedPhases), 'Completed phases is always an array');
    },
  },
];
