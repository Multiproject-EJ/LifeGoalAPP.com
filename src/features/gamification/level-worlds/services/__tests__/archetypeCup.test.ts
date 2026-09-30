import {
  ARCHETYPE_CUP_KEY,
  ARCHETYPE_CUP_MAX_POINTS_PER_ACTIVITY,
  applyArchetypeCupContribution,
  createArchetypeCupProgress,
  mergeArchetypeCupProgress,
  resolveArchetypeCupStandings,
  type ArchetypeCupContribution,
} from '../archetypeCup';
import { sanitizeIslandRunSignatureMissionProgress } from '../islandRunSignatureMissions';
import { assert, assertEqual, type TestCase } from './testHarness';

const contribution = (activityId: string, archetypeId: string, points: number, atMs = 1_000): ArchetypeCupContribution => ({
  activityId, kind: 'habit_check_in', archetypeId, points, atMs,
});

export const archetypeCupTests: TestCase[] = [
  {
    name: 'Archetype Cup: activities add archetype points once, rolled up into suit standings',
    run: () => {
      let progress = createArchetypeCupProgress();
      let result = applyArchetypeCupContribution(progress, 'cup-1', contribution('habit:1', 'caregiver', 5));
      assert(result.applied, 'first contribution applies');
      progress = result.progress;
      assertEqual(progress.seasonId, 'cup-1', 'first contribution opens the season');
      result = applyArchetypeCupContribution(progress, 'cup-1', contribution('habit:1', 'caregiver', 5));
      assert(!result.applied && result.reason === 'duplicate', 'the same activity never scores twice');
      progress = applyArchetypeCupContribution(progress, 'cup-1', contribution('arena:1', 'commander', 12)).progress;
      progress = applyArchetypeCupContribution(progress, 'cup-1', contribution('arena:2', 'mentor', 4)).progress;
      const standings = resolveArchetypeCupStandings(progress);
      assertEqual(standings[0]!.suit, 'power', 'Power leads with 12');
      assertEqual(standings[1]!.suit, 'heart', 'Heart second with 5 + 4');
      assertEqual(standings[1]!.points, 9, 'suit totals roll up archetypes');
      assertEqual(standings[1]!.archetypes[0]!.archetypeId, 'caregiver', 'archetypes are ranked inside a suit');
    },
  },
  {
    name: 'Archetype Cup: invalid input is refused, points are capped, a new season starts from zero',
    run: () => {
      const progress = createArchetypeCupProgress('cup-1');
      assert(!applyArchetypeCupContribution(progress, 'cup-1', contribution('x', 'not-an-archetype', 5)).applied, 'unknown archetype refused');
      assert(!applyArchetypeCupContribution(progress, 'cup-1', contribution('x', 'sage', -3)).applied, 'non-positive points refused');
      const capped = applyArchetypeCupContribution(progress, 'cup-1', contribution('big', 'sage', 10_000)).progress;
      assertEqual(capped.scoresByArchetype.sage, ARCHETYPE_CUP_MAX_POINTS_PER_ACTIVITY, 'points per activity are capped');
      const next = applyArchetypeCupContribution(capped, 'cup-2', contribution('new', 'sage', 3, 2_000)).progress;
      assertEqual(next.seasonId, 'cup-2', 'season switches');
      assertEqual(next.scoresByArchetype.sage, 3, 'new season starts from zero');
    },
  },
  {
    name: 'Archetype Cup: survives the mission ledger sanitiser and merges two saves safely',
    run: () => {
      const saved = applyArchetypeCupContribution(createArchetypeCupProgress(), 'cup-1', contribution('a', 'sage', 7)).progress;
      const ledger = sanitizeIslandRunSignatureMissionProgress({ [ARCHETYPE_CUP_KEY]: { ...saved, scoresByArchetype: { ...saved.scoresByArchetype, bogus: 99 } } });
      const restored = ledger[ARCHETYPE_CUP_KEY] as typeof saved | undefined;
      assertEqual(restored?.scoresByArchetype.sage, 7, 'progress survives sanitising');
      assertEqual(restored?.scoresByArchetype.bogus, undefined, 'unknown archetypes are dropped');
      const other = applyArchetypeCupContribution(saved, 'cup-1', contribution('b', 'mentor', 2, 1_500)).progress;
      const merged = mergeArchetypeCupProgress(saved, other);
      assertEqual(merged.scoresByArchetype.sage, 7, 'shared points are not double counted');
      assertEqual(merged.scoresByArchetype.mentor, 2, 'newer points are kept');
      assert(merged.appliedActivityIds.includes('a') && merged.appliedActivityIds.includes('b'), 'applied ids are unioned');
    },
  },
];
