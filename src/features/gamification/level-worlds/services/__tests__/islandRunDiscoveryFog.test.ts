import {
  resolveIslandRunDiscoveryProgress,
  resolveIslandRunLandmarkDiscoveryState,
} from '../islandRunDiscoveryFog';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunDiscoveryFogTests: TestCase[] = [
  {
    name: 'maps canonical stop states to presentation-only discovery states',
    run: () => {
      assertEqual(resolveIslandRunLandmarkDiscoveryState('locked'), 'veiled', 'Locked landmark should stay veiled');
      assertEqual(resolveIslandRunLandmarkDiscoveryState('ticket_required'), 'emerging', 'Ticket-ready landmark should begin emerging');
      assertEqual(resolveIslandRunLandmarkDiscoveryState('active'), 'revealed', 'Active landmark should be revealed');
      assertEqual(resolveIslandRunLandmarkDiscoveryState('accessible'), 'revealed', 'Accessible landmark should be revealed');
      assertEqual(resolveIslandRunLandmarkDiscoveryState('postponed'), 'revealed', 'Postponed landmark should remain revealed');
      assertEqual(resolveIslandRunLandmarkDiscoveryState('build_pending'), 'revealed', 'Build-pending landmark should remain revealed');
      assertEqual(resolveIslandRunLandmarkDiscoveryState('completed'), 'restored', 'Completed landmark should look restored');
    },
  },
  {
    name: 'background reveal progress increases as landmarks emerge and restore',
    run: () => {
      const hidden = resolveIslandRunDiscoveryProgress(['veiled', 'veiled', 'veiled', 'veiled', 'veiled']);
      const progressing = resolveIslandRunDiscoveryProgress(['restored', 'revealed', 'emerging', 'veiled', 'veiled']);
      const restored = resolveIslandRunDiscoveryProgress(['restored', 'restored', 'restored', 'restored', 'restored']);
      assertEqual(hidden, 0, 'Fully hidden island should start at zero reveal progress');
      assert(progressing > hidden && progressing < restored, 'Mixed landmark states should produce intermediate reveal progress');
      assertEqual(restored, 1, 'Fully restored island should reach full reveal progress');
    },
  },
];
