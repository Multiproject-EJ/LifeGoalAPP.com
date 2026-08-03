import {
  shouldRenderActiveStopModal,
  shouldRenderFirstRunCelebration,
  shouldRenderPerfectCompanionHint,
} from '../islandRunModalVisibility';
import { assertEqual, type TestCase } from './testHarness';

export const islandRunModalVisibilityTests: TestCase[] = [
  {
    name: 'arrival story outranks first-run and active-stop modals',
    run: () => {
      assertEqual(shouldRenderFirstRunCelebration({
        requested: true,
        storyReaderOpen: true,
      }), false, 'first-run celebration should wait behind story');
      assertEqual(shouldRenderActiveStopModal({
        hasActiveStop: true,
        storyReaderOpen: true,
        firstRunCelebrationOpen: true,
      }), false, 'active stop should wait behind story and first-run setup');
    },
  },
  {
    name: 'active stop appears after story and first-run setup close',
    run: () => {
      assertEqual(shouldRenderActiveStopModal({
        hasActiveStop: true,
        storyReaderOpen: false,
        firstRunCelebrationOpen: false,
      }), true, 'active stop should render when higher-priority modals are closed');
    },
  },
  {
    name: 'companion hint waits for hatch reveal and creature card',
    run: () => {
      assertEqual(shouldRenderPerfectCompanionHint({
        requested: true,
        hatchRevealOpen: true,
        creatureCardOpen: false,
      }), false, 'hint should wait behind hatch reveal');
      assertEqual(shouldRenderPerfectCompanionHint({
        requested: true,
        hatchRevealOpen: false,
        creatureCardOpen: true,
      }), false, 'hint should wait behind creature card');
      assertEqual(shouldRenderPerfectCompanionHint({
        requested: true,
        hatchRevealOpen: false,
        creatureCardOpen: false,
      }), true, 'hint should appear after reveal surfaces close');
    },
  },
];
