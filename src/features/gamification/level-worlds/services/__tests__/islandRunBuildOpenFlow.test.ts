import { resolveIslandRunBuildOpenDisposition } from '../islandRunBuildOpenFlow';
import { assertEqual, type TestCase } from './testHarness';

export const islandRunBuildOpenFlowTests: TestCase[] = [
  {
    name: 'opens Build immediately only when the canonical movement presentation is settled',
    run: () => {
      assertEqual(resolveIslandRunBuildOpenDisposition({ isRolling: false, hasPendingHopSequence: false, isAnimatingHop: false }), 'open_now', 'settled token opens immediately');
      assertEqual(resolveIslandRunBuildOpenDisposition({ isRolling: true, hasPendingHopSequence: false, isAnimatingHop: false }), 'queue_until_landed', 'dice roll queues Build');
      assertEqual(resolveIslandRunBuildOpenDisposition({ isRolling: false, hasPendingHopSequence: true, isAnimatingHop: false }), 'queue_until_landed', 'pending hop sequence queues Build');
      assertEqual(resolveIslandRunBuildOpenDisposition({ isRolling: false, hasPendingHopSequence: false, isAnimatingHop: true }), 'queue_until_landed', 'active hop presentation queues Build');
    },
  },
];
