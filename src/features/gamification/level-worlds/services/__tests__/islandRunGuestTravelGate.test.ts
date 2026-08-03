import { shouldGateIslandOneGuestTravel } from '../islandRunGuestTravelGate';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

export const islandRunGuestTravelGateTests = [
  {
    name: 'production guest is gated before leaving Island 1',
    run: () => {
      assertEqual(shouldGateIslandOneGuestTravel({
        islandNumber: 1,
        isDemoSession: true,
        isDevModeEnabled: false,
        guestProgressClaimed: false,
      }), true, 'unsaved production guest should be gated');
    },
  },
  {
    name: 'local dev guest may continue to Island 2 for QA',
    run: () => {
      assertEqual(shouldGateIslandOneGuestTravel({
        islandNumber: 1,
        isDemoSession: true,
        isDevModeEnabled: true,
        guestProgressClaimed: false,
      }), false, 'dev guest should bypass account creation');
    },
  },
  {
    name: 'claimed guest and signed-in sessions are never re-gated',
    run: () => {
      assertEqual(shouldGateIslandOneGuestTravel({
        islandNumber: 1,
        isDemoSession: true,
        isDevModeEnabled: false,
        guestProgressClaimed: true,
      }), false, 'claimed guest should continue');
      assertEqual(shouldGateIslandOneGuestTravel({
        islandNumber: 1,
        isDemoSession: false,
        isDevModeEnabled: false,
        guestProgressClaimed: false,
      }), false, 'signed-in session should continue');
    },
  },
];
