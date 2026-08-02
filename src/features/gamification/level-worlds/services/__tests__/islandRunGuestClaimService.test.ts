import { createDemoSession } from '../../../../../services/demoSession';
import {
  ISLAND_RUN_REGISTRY_BONUS_USCT,
  buildGuestClaimProfilePatch,
  buildLocalGuestRuntimeClaimRecord,
  claimLocalIslandRunGuestProgress,
  hasVerifiedClaimedRuntime,
  isPermanentSupabaseUser,
  runtimeClaimFingerprint,
  type IslandRunGuestClaimDependencies,
} from '../islandRunGuestClaimService';
import { readIslandRunGameStateRecord } from '../islandRunGameStateStore';
import {
  ISLAND_RUN_GUEST_FUNNEL_STORAGE_KEY,
  createIslandRunGuestFunnelState,
  readIslandRunGuestFunnelState,
  writeIslandRunGuestFunnelState,
} from '../islandRunGuestFunnelState';
import { assert, assertEqual, createMemoryStorage, type TestCase } from './testHarness';

const permanentUserId = '74260a0b-bad9-4b4c-8872-779aa65b2ba1';

function makePermanentSession() {
  return {
    ...createDemoSession(),
    user: {
      ...createDemoSession().user,
      id: permanentUserId,
      is_anonymous: false,
      created_at: '2026-08-02T00:00:00.000Z',
    },
  } as never;
}

function pendingGuestStorage(source: 'arena' | 'exit' | 'island_1_completion' = 'exit'): Storage {
  const storage = createMemoryStorage();
  writeIslandRunGuestFunnelState({
    ...createIslandRunGuestFunnelState({ guestId: 'guest_local_1', now: 1 }),
    displayName: 'Captain Miri',
    shipName: 'Luma Skiff',
    claimStatus: 'claim_pending',
    claimSource: source,
  }, { storage });
  return storage;
}

export const islandRunGuestClaimServiceTests: TestCase[] = [
  {
    name: 'accepts only permanent Supabase UUID sessions as import targets',
    run: () => {
      assertEqual(isPermanentSupabaseUser(createDemoSession()), false, 'Expected the synthetic demo session to be rejected');
      assertEqual(
        isPermanentSupabaseUser({ user: { id: permanentUserId, is_anonymous: true } } as never),
        false,
        'Expected a Supabase anonymous user to be rejected',
      );
      assertEqual(isPermanentSupabaseUser(makePermanentSession()), true, 'Expected a permanent UUID user to be accepted');
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
  {
    name: 'adds the registration bonus to the first imported snapshot exactly once',
    run: () => {
      const guest = {
        ...readIslandRunGameStateRecord(createDemoSession()),
        runtimeVersion: 42,
        essence: 275,
        essenceLifetimeEarned: 800,
        currentIslandNumber: 2,
      };
      const claimed = buildLocalGuestRuntimeClaimRecord(guest);
      assertEqual(claimed.runtimeVersion, 0, 'Expected a first-write runtime version');
      assertEqual(claimed.essence, 275 + ISLAND_RUN_REGISTRY_BONUS_USCT, 'Expected the spendable USCT bonus');
      assertEqual(claimed.essenceLifetimeEarned, 800 + ISLAND_RUN_REGISTRY_BONUS_USCT, 'Expected lifetime earnings to include the bonus');
      assertEqual(claimed.currentIslandNumber, 2, 'Expected guest progression to be preserved');
      assertEqual(
        runtimeClaimFingerprint({ ...claimed, runtimeVersion: 99 }),
        runtimeClaimFingerprint(claimed),
        'Expected verification to ignore only the server runtime version',
      );
    },
  },
  {
    name: 'imports and remotely verifies a local demo run under the permanent user UUID',
    run: async () => {
      const storage = pendingGuestStorage('island_1_completion');
      const guestRecord = {
        ...readIslandRunGameStateRecord(createDemoSession()),
        runtimeVersion: 17,
        essence: 340,
        essenceLifetimeEarned: 625,
        currentIslandNumber: 2,
        position: 7,
      };
      let committedRecord: typeof guestRecord | null = null;
      let committedUserId = '';
      let commitCount = 0;
      let hydrateCount = 0;
      const profileWrites: Array<Record<string, unknown>> = [];
      const dependencies: IslandRunGuestClaimDependencies = {
        readGuestRuntime: () => guestRecord,
        hydrateTargetRuntime: async () => {
          hydrateCount += 1;
          if (hydrateCount === 1) {
            return { record: readIslandRunGameStateRecord(makePermanentSession()), source: 'fallback_no_row' };
          }
          if (!committedRecord) throw new Error('Expected a committed record before verification');
          return { record: { ...committedRecord, runtimeVersion: 1 }, source: 'table' };
        },
        commitTargetRuntime: async ({ session, record }) => {
          commitCount += 1;
          committedUserId = session.user.id;
          committedRecord = record as typeof guestRecord;
          return { ok: true };
        },
        fetchProfile: async () => ({ data: null, error: null }),
        upsertProfile: async (payload) => {
          profileWrites.push(payload);
          return { data: null, error: null };
        },
      };

      const result = await claimLocalIslandRunGuestProgress({
        session: makePermanentSession(),
        client: {} as never,
        storage,
        now: 10,
        dependencies,
      });

      assertEqual(result.status, 'claimed', 'Expected a verified local guest import');
      assertEqual(committedUserId, permanentUserId, 'Expected the real account UUID to own the commit');
      assert(committedUserId !== createDemoSession().user.id, 'Expected the demo UUID never to reach the remote writer');
      assert(committedRecord !== null, 'Expected a runtime snapshot to be committed');
      const verifiedCommittedRecord = committedRecord as unknown as typeof guestRecord;
      assertEqual(verifiedCommittedRecord.essence, 440, 'Expected the 100 USCT registration reward in the committed snapshot');
      assertEqual(verifiedCommittedRecord.currentIslandNumber, 2, 'Expected Island Run position/progression to survive the import');
      assertEqual(hasVerifiedClaimedRuntime({ ...verifiedCommittedRecord, runtimeVersion: 5 }, verifiedCommittedRecord), true, 'Expected full remote verification');
      assertEqual(profileWrites.length, 1, 'Expected guest identity to be saved once');
      assertEqual(profileWrites[0].user_id, permanentUserId, 'Expected profile ownership to use the permanent UUID');
      assertEqual(profileWrites[0].display_name, 'Captain Miri', 'Expected the chosen captain name to transfer');
      assertEqual(profileWrites[0].workspace_name, 'Luma Skiff', 'Expected the chosen ship name to transfer');

      const claimedState = readIslandRunGuestFunnelState({ storage });
      assertEqual(claimedState.claimStatus, 'claimed', 'Expected claimed only after remote verification');
      assertEqual(claimedState.claimedUserId, permanentUserId, 'Expected the claim marker to identify the account');

      const retry = await claimLocalIslandRunGuestProgress({
        session: makePermanentSession(),
        client: {} as never,
        storage,
        dependencies,
      });
      assertEqual(retry.status, 'already_claimed', 'Expected an idempotent retry result');
      assertEqual(commitCount, 1, 'Expected no duplicate import or registration reward');
      assert(storage.getItem(ISLAND_RUN_GUEST_FUNNEL_STORAGE_KEY) !== null, 'Expected local guest data to remain as a recovery copy');
    },
  },
  {
    name: 'refuses to overwrite progress already stored on the target account',
    run: async () => {
      const storage = pendingGuestStorage();
      const guestRecord = readIslandRunGameStateRecord(createDemoSession());
      let commitCount = 0;
      const dependencies: IslandRunGuestClaimDependencies = {
        readGuestRuntime: () => guestRecord,
        hydrateTargetRuntime: async () => ({
          record: { ...guestRecord, essence: guestRecord.essence + 999 },
          source: 'table',
        }),
        commitTargetRuntime: async () => {
          commitCount += 1;
          return { ok: true };
        },
        fetchProfile: async () => ({ data: null, error: null }),
        upsertProfile: async () => ({ data: null, error: null }),
      };

      const result = await claimLocalIslandRunGuestProgress({
        session: makePermanentSession(),
        client: {} as never,
        storage,
        dependencies,
      });
      assertEqual(result.status, 'conflict', 'Expected an account-progress conflict');
      assertEqual(commitCount, 0, 'Expected no destructive overwrite');
      assertEqual(readIslandRunGuestFunnelState({ storage }).claimStatus, 'claim_failed', 'Expected a recoverable failed marker');
    },
  },
];
