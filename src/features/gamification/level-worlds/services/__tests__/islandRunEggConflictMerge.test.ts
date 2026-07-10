import type { Session } from '@supabase/supabase-js';
import type { TestCase } from './testHarness';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage } from './testHarness';
import {
  mergeActiveEggFieldsForConflict,
  mergePerIslandEggEntryForConflict,
  mergePerIslandEggsForConflict,
  mergeRecordForConflict,
  readIslandRunGameStateRecord,
  type IslandRunGameStateRecord,
  type PerIslandEggEntry,
} from '../islandRunGameStateStore';

function makeSession(userId = 'egg-merge-user'): Session {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: userId,
      user_metadata: {},
    },
  } as unknown as Session;
}

function makeRecord(overrides: Partial<IslandRunGameStateRecord> = {}): IslandRunGameStateRecord {
  installWindowWithStorage(createMemoryStorage());
  const base = readIslandRunGameStateRecord(makeSession());
  return { ...base, ...overrides };
}

function makeEgg(overrides: Partial<PerIslandEggEntry> = {}): PerIslandEggEntry {
  return {
    tier: 'common',
    setAtMs: 1_000,
    hatchAtMs: 2_000,
    status: 'incubating',
    ...overrides,
  };
}

export const islandRunEggConflictMergeTests: TestCase[] = [
  {
    name: 'per-island entry: newer placement wins the slot regardless of side',
    run: () => {
      const older = makeEgg({ setAtMs: 1_000, status: 'ready' });
      const newer = makeEgg({ setAtMs: 5_000, tier: 'rare' });
      const localWins = mergePerIslandEggEntryForConflict(older, newer);
      assertEqual(localWins?.setAtMs, 5_000, 'newer local placement should win');
      const remoteWins = mergePerIslandEggEntryForConflict(newer, older);
      assertEqual(remoteWins?.setAtMs, 5_000, 'newer remote placement should win');
      assertEqual(remoteWins?.tier, 'rare', 'winning entry should be kept whole');
    },
  },
  {
    name: 'per-island entry: same egg keeps most-advanced status (terminal never rolls back)',
    run: () => {
      const collectedRemote = makeEgg({ status: 'collected', openedAt: 3_000, animalCollectedAtMs: 3_100 });
      const staleLocal = makeEgg({ status: 'ready' });
      const merged = mergePerIslandEggEntryForConflict(collectedRemote, staleLocal);
      assertEqual(merged?.status, 'collected', 'collected should beat stale ready snapshot');
      assertEqual(merged?.openedAt, 3_000, 'terminal metadata should be preserved');
      assertEqual(merged?.animalCollectedAtMs, 3_100, 'collect timestamp should be preserved');

      const readyLocal = mergePerIslandEggEntryForConflict(makeEgg({ status: 'incubating' }), makeEgg({ status: 'ready' }));
      assertEqual(readyLocal?.status, 'ready', 'ready should beat incubating');

      const doubleResolved = mergePerIslandEggEntryForConflict(
        makeEgg({ status: 'sold', openedAt: 4_000 }),
        makeEgg({ status: 'collected', openedAt: 4_500 }),
      );
      assertEqual(doubleResolved?.status, 'collected', 'collected should win a double-resolution race');
    },
  },
  {
    name: 'per-island ledger: merge is a union across islands',
    run: () => {
      const merged = mergePerIslandEggsForConflict(
        { '1': makeEgg({ setAtMs: 100 }), '2': makeEgg({ setAtMs: 200, status: 'collected' }) },
        { '2': makeEgg({ setAtMs: 200, status: 'ready' }), '3': makeEgg({ setAtMs: 300 }) },
      );
      assertEqual(Object.keys(merged).sort().join(','), '1,2,3', 'ledger should union island keys');
      assertEqual(merged['2']?.status, 'collected', 'shared key should resolve by status precedence');
    },
  },
  {
    name: 'active egg: newest placement wins across devices',
    run: () => {
      const remote = makeRecord({
        currentIslandNumber: 4,
        activeEggTier: 'rare',
        activeEggSetAtMs: 9_000,
        activeEggHatchDurationMs: 100_000,
        perIslandEggs: { '4': makeEgg({ tier: 'rare', setAtMs: 9_000, hatchAtMs: 109_000 }) },
      });
      const local = makeRecord({
        currentIslandNumber: 4,
        activeEggTier: 'common',
        activeEggSetAtMs: 5_000,
        activeEggHatchDurationMs: 50_000,
        perIslandEggs: { '4': makeEgg({ tier: 'common', setAtMs: 5_000, hatchAtMs: 55_000 }) },
      });
      const mergedPerIslandEggs = mergePerIslandEggsForConflict(remote.perIslandEggs, local.perIslandEggs);
      const group = mergeActiveEggFieldsForConflict({ remote, local, mergedPerIslandEggs });
      assertEqual(group.activeEggTier, 'rare', 'remote newer egg should win active slot');
      assertEqual(group.activeEggSetAtMs, 9_000, 'remote newer setAtMs should win');
    },
  },
  {
    name: 'active egg: a collect on one device clears a stale active egg on the other',
    run: () => {
      // Device A collected the egg: active cleared, ledger terminal.
      const remote = makeRecord({
        currentIslandNumber: 7,
        activeEggTier: null,
        activeEggSetAtMs: null,
        activeEggHatchDurationMs: null,
        perIslandEggs: { '7': makeEgg({ setAtMs: 6_000, status: 'collected', openedAt: 8_000 }) },
      });
      // Device B still holds the same egg as active + ready.
      const local = makeRecord({
        currentIslandNumber: 7,
        activeEggTier: 'common',
        activeEggSetAtMs: 6_000,
        activeEggHatchDurationMs: 60_000,
        perIslandEggs: { '7': makeEgg({ setAtMs: 6_000, status: 'ready' }) },
      });
      const mergedPerIslandEggs = mergePerIslandEggsForConflict(remote.perIslandEggs, local.perIslandEggs);
      const group = mergeActiveEggFieldsForConflict({ remote, local, mergedPerIslandEggs });
      assertEqual(group.activeEggTier, null, 'active egg should clear after remote collect');
      assertEqual(group.activeEggSetAtMs, null, 'active egg timestamps should clear after remote collect');
    },
  },
  {
    name: 'active egg: remote new egg survives a stale local writer with no egg',
    run: () => {
      const remote = makeRecord({
        currentIslandNumber: 2,
        activeEggTier: 'mythic',
        activeEggSetAtMs: 12_000,
        activeEggHatchDurationMs: 90_000,
        perIslandEggs: { '2': makeEgg({ tier: 'mythic', setAtMs: 12_000, hatchAtMs: 102_000 }) },
      });
      const local = makeRecord({ currentIslandNumber: 2 });
      const mergedPerIslandEggs = mergePerIslandEggsForConflict(remote.perIslandEggs, local.perIslandEggs);
      const group = mergeActiveEggFieldsForConflict({ remote, local, mergedPerIslandEggs });
      assertEqual(group.activeEggTier, 'mythic', 'remote-only active egg should be adopted');
    },
  },
  {
    name: 'mergeRecordForConflict: full record merge applies egg-aware rules',
    run: () => {
      const remote = makeRecord({
        runtimeVersion: 42,
        currentIslandNumber: 3,
        activeEggTier: null,
        activeEggSetAtMs: null,
        activeEggHatchDurationMs: null,
        perIslandEggs: { '3': makeEgg({ setAtMs: 7_000, status: 'collected', openedAt: 9_000 }) },
      });
      const local = makeRecord({
        runtimeVersion: 41,
        currentIslandNumber: 3,
        activeEggTier: 'common',
        activeEggSetAtMs: 7_000,
        activeEggHatchDurationMs: 70_000,
        perIslandEggs: { '3': makeEgg({ setAtMs: 7_000, status: 'ready' }) },
      });
      const merged = mergeRecordForConflict({ remote, local });
      assertEqual(merged.runtimeVersion, 42, 'merge should adopt remote runtime version');
      assertEqual(merged.activeEggTier, null, 'stale local active egg should not survive merge');
      assertEqual(merged.perIslandEggs['3']?.status, 'collected', 'ledger should keep terminal status');
      assert(merged.perIslandEggs['3']?.openedAt === 9_000, 'ledger should keep terminal metadata');
    },
  },
];
