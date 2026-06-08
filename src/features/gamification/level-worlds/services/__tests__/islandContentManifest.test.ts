import {
  ONBOARDING_LAST_ISLAND,
  getIslandAct,
  getIslandContentPlan,
  orderAreasForIsland,
} from '../islandContentManifest';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandContentManifestTests: TestCase[] = [
  {
    name: 'maps island numbers to the correct act',
    run: () => {
      assertEqual(getIslandAct(1).key, 'awakening', 'Island 1 is Awakening');
      assertEqual(getIslandAct(24).key, 'awakening', 'Island 24 is Awakening');
      assertEqual(getIslandAct(25).key, 'growth', 'Island 25 is Growth');
      assertEqual(getIslandAct(72).key, 'power', 'Island 72 is Power');
      assertEqual(getIslandAct(96).key, 'mastery', 'Island 96 is Mastery');
      assertEqual(getIslandAct(120).key, 'transcendence', 'Island 120 is Transcendence');
    },
  },
  {
    name: 'clamps out-of-range island numbers',
    run: () => {
      assertEqual(getIslandAct(0).key, 'awakening', 'Island 0 clamps to 1');
      assertEqual(getIslandAct(999).key, 'transcendence', 'Island 999 clamps to 120');
      assertEqual(getIslandContentPlan(Number.NaN).islandNumber, 1, 'NaN clamps to island 1');
    },
  },
  {
    name: 'early islands use the fixed onboarding curriculum',
    run: () => {
      const plan = getIslandContentPlan(1);
      assertEqual(plan.habitSelectionMode, 'fixed_curriculum', 'Island 1 is fixed curriculum');
      assertDeepEqual(plan.curriculumAreas, ['Health'], 'Island 1 focuses Health');
      assertEqual(getIslandContentPlan(ONBOARDING_LAST_ISLAND).habitSelectionMode, 'fixed_curriculum', 'Last onboarding island is fixed');
    },
  },
  {
    name: 'later islands switch to adaptive selection',
    run: () => {
      const plan = getIslandContentPlan(ONBOARDING_LAST_ISLAND + 1);
      assertEqual(plan.habitSelectionMode, 'adaptive', 'Island after onboarding is adaptive');
      assertEqual(plan.curriculumAreas.length, 0, 'Adaptive islands have no curriculum areas');
    },
  },
  {
    name: 'intake stage deepens with the act',
    run: () => {
      assertEqual(getIslandContentPlan(1).intakeStage, 'baseline', 'Act 1 collects baseline');
      assertEqual(getIslandContentPlan(30).intakeStage, 'habit_fit', 'Act 2 collects habit fit');
      assertEqual(getIslandContentPlan(60).intakeStage, 'motivation', 'Act 3 collects motivation');
      assertEqual(getIslandContentPlan(80).intakeStage, 'environment', 'Act 4 collects environment');
      assertEqual(getIslandContentPlan(110).intakeStage, 'reflection', 'Act 5 collects reflection');
    },
  },
  {
    name: 'fixed islands lead with the curriculum area, then adaptive picks',
    run: () => {
      const ordered = orderAreasForIsland(2, ['Money', 'Mind', 'Fun']);
      // Island 2 curriculum is Mind, which is hoisted to the front and de-duped.
      assertDeepEqual(ordered, ['Mind', 'Money', 'Fun'], 'Curriculum area leads, no duplicates');
    },
  },
  {
    name: 'adaptive islands keep the provided ordering',
    run: () => {
      const ordered = orderAreasForIsland(40, ['Money', 'Mind', 'Fun']);
      assertDeepEqual(ordered, ['Money', 'Mind', 'Fun'], 'Adaptive islands preserve order');
    },
  },
  {
    name: 'fixed islands guarantee the curriculum area even with no adaptive picks',
    run: () => {
      const ordered = orderAreasForIsland(1, []);
      assertDeepEqual(ordered, ['Health'], 'Curriculum area always offered on fixed islands');
    },
  },
  {
    name: 'invalid areas are filtered out',
    run: () => {
      const ordered = orderAreasForIsland(40, ['Money', 'Bogus' as never, 'Fun']);
      assert(!ordered.includes('Bogus' as never), 'Unknown area is dropped');
      assertDeepEqual(ordered, ['Money', 'Fun'], 'Only valid areas remain');
    },
  },
];
