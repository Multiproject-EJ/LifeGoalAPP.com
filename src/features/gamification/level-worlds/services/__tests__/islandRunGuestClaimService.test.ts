import { buildGuestClaimProfilePatch, isAnonymousSupabaseUser } from '../islandRunGuestClaimService';
import { createIslandRunGuestFunnelState } from '../islandRunGuestFunnelState';
import { assertEqual, type TestCase } from './testHarness';

export const islandRunGuestClaimServiceTests: TestCase[] = [
  {
    name: 'detects Supabase anonymous sessions for in-place upgrade path',
    run: () => {
      assertEqual(isAnonymousSupabaseUser({ user: { id: 'guest-user', is_anonymous: true } } as never), true, 'Expected anonymous session to be detected');
      assertEqual(isAnonymousSupabaseUser({ user: { id: 'real-user', is_anonymous: false } } as never), false, 'Expected permanent session not to claim accidentally');
    },
  },
  {
    name: 'maps guest captain and ship into empty profile fields only',
    run: () => {
      const guestState = {
        ...createIslandRunGuestFunnelState({ guestId: 'guest_1', now: 1 }),
        displayName: 'Captain Miri',
        shipName: 'Luma Skiff',
      };
      const patch = buildGuestClaimProfilePatch({ userId: 'user_1', guestState, existingProfile: null });
      assertEqual(patch.payload.full_name, 'Captain Miri', 'Expected displayName to fill profile full_name');
      assertEqual(patch.payload.display_name, 'Captain Miri', 'Expected displayName to fill profile display_name');
      assertEqual(patch.payload.workspace_name, 'Luma Skiff', 'Expected shipName to fill workspace_name');
      assertEqual(patch.savedDisplayName, true, 'Expected saved display flag');
      assertEqual(patch.savedShipName, true, 'Expected saved ship flag');
    },
  },
  {
    name: 'does not overwrite existing profile identity fields on retry',
    run: () => {
      const guestState = {
        ...createIslandRunGuestFunnelState({ guestId: 'guest_2', now: 2 }),
        displayName: 'Guest Name',
        shipName: 'Guest Ship',
      };
      const patch = buildGuestClaimProfilePatch({
        userId: 'user_2',
        guestState,
        existingProfile: {
          user_id: 'user_2',
          full_name: 'Existing Name',
          display_name: 'Existing Display',
          workspace_name: 'Existing Ship',
        } as never,
      });
      assertEqual(patch.payload.full_name, undefined, 'Expected existing full_name to be preserved');
      assertEqual(patch.payload.display_name, undefined, 'Expected existing display_name to be preserved');
      assertEqual(patch.payload.workspace_name, undefined, 'Expected existing workspace_name to be preserved');
      assertEqual(patch.savedDisplayName, false, 'Expected no duplicate display save on retry');
      assertEqual(patch.savedShipName, false, 'Expected no duplicate ship save on retry');
    },
  },
];
