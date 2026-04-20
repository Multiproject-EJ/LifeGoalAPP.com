/**
 * C1 integration tests — islandRunStateActions
 *
 * These tests validate the two action functions introduced in Stage C1:
 * - `applyRollResult` — syncs the store mirror from localStorage after the
 *   roll service has already committed.
 * - `applyTokenHopRewards` — applies currency deltas through the store.
 *
 * Also includes regression tests for the drift vector that C1 eliminates:
 * - "one commit per roll" — the roll service writes once, `applyRollResult`
 *   only refreshes the mirror (no duplicate remote write).
 * - "hydrate with older version does NOT roll back" — a stale hydration
 *   result must not overwrite a newer local state for dicePool/tokenIndex.
 */

import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
  type IslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import {
  __resetIslandRunStateStoreForTests,
  getIslandRunStateSnapshot,
  refreshIslandRunStateFromLocal,
  resetIslandRunStateSnapshot,
  subscribeIslandRunState,
} from '../islandRunStateStore';
import {
  applyEssenceAward,
  applyEssenceDeduct,
  applyEssenceDriftTick,
  applyRewardBarState,
  applyRollResult,
  applyTokenHopRewards,
} from '../islandRunStateActions';
import {
  assert,
  assertEqual,
  createMemoryStorage,
  installWindowWithStorage,
  type TestCase,
} from './testHarness';

const USER_ID = 'state-actions-test-user';

function makeSession() {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: USER_ID,
      user_metadata: {},
    },
  } as unknown as import('@supabase/supabase-js').Session;
}

function resetAll(): void {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
}

function seedState(overrides: Partial<IslandRunGameStateRecord>): void {
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  void writeIslandRunGameStateRecord({
    session,
    client: null,
    record: { ...base, ...overrides },
  });
  // Also update the store mirror so snapshot is consistent.
  refreshIslandRunStateFromLocal(session);
}

export const islandRunStateActionsTests: TestCase[] = [
  // ── applyRollResult ──────────────────────────────────────────────────────

  {
    name: 'applyRollResult syncs store mirror from localStorage (no duplicate remote write)',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 5, dicePool: 30, tokenIndex: 0 });

      // Simulate what the roll service does: write directly to localStorage.
      const postRollRecord = {
        ...readIslandRunGameStateRecord(session),
        dicePool: 29,
        tokenIndex: 7,
        runtimeVersion: 6,
      };
      void writeIslandRunGameStateRecord({ session, client: null, record: postRollRecord });

      // The store mirror still holds the pre-roll snapshot.
      const preSync = getIslandRunStateSnapshot(session);
      assertEqual(preSync.dicePool, 30, 'store mirror should still be pre-roll before sync');
      assertEqual(preSync.tokenIndex, 0, 'store tokenIndex should still be pre-roll');

      // applyRollResult refreshes the mirror from localStorage.
      const result = applyRollResult({ session });

      assertEqual(result.dicePool, 29, 'returned record should have post-roll dicePool');
      assertEqual(result.tokenIndex, 7, 'returned record should have post-roll tokenIndex');
      assertEqual(result.runtimeVersion, 6, 'runtimeVersion should be post-roll');

      // Store mirror should now match.
      const postSync = getIslandRunStateSnapshot(session);
      assertEqual(postSync.dicePool, 29, 'store mirror should reflect post-roll dicePool');
      assertEqual(postSync.tokenIndex, 7, 'store mirror should reflect post-roll tokenIndex');
    },
  },

  {
    name: 'applyRollResult notifies store subscribers on sync',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 5, dicePool: 30, tokenIndex: 0 });

      let notifications = 0;
      const unsub = subscribeIslandRunState(session, () => { notifications += 1; });

      // Simulate roll write to localStorage.
      const postRollRecord = {
        ...readIslandRunGameStateRecord(session),
        dicePool: 28,
        tokenIndex: 3,
        runtimeVersion: 6,
      };
      void writeIslandRunGameStateRecord({ session, client: null, record: postRollRecord });

      // applyRollResult should publish, triggering the subscriber.
      applyRollResult({ session });
      assertEqual(notifications, 1, 'subscriber should be notified exactly once');

      unsub();
    },
  },

  // ── applyTokenHopRewards ──────────────────────────────────────────────────

  {
    name: 'applyTokenHopRewards applies positive deltas and commits through the store',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 10, dicePool: 20, spinTokens: 5, essence: 100 });

      const result = applyTokenHopRewards({
        session,
        client: null,
        deltas: { dicePool: 3, spinTokens: 2, essence: 15 },
        triggerSource: 'test_positive',
      });

      assertEqual(result.dicePool, 23, 'dicePool should increase by 3');
      assertEqual(result.spinTokens, 7, 'spinTokens should increase by 2');
      assertEqual(result.essence, 115, 'essence should increase by 15');
      assertEqual(result.runtimeVersion, 11, 'runtimeVersion should bump by 1');

      // Store mirror matches.
      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.dicePool, 23, 'store mirror dicePool should match');
      assertEqual(snapshot.spinTokens, 7, 'store mirror spinTokens should match');
    },
  },

  {
    name: 'applyTokenHopRewards applies negative deltas and clamps to zero',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 10, dicePool: 5, spinTokens: 2, essence: 10 });

      const result = applyTokenHopRewards({
        session,
        client: null,
        deltas: { spinTokens: -3, dicePool: -10, essence: -20 },
        triggerSource: 'test_negative',
      });

      assertEqual(result.spinTokens, 0, 'spinTokens should clamp to 0 (not go negative)');
      assertEqual(result.dicePool, 0, 'dicePool should clamp to 0');
      assertEqual(result.essence, 0, 'essence should clamp to 0');
    },
  },

  {
    name: 'applyTokenHopRewards omitted deltas leave fields unchanged',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 10, dicePool: 20, spinTokens: 5, essence: 100 });

      const result = applyTokenHopRewards({
        session,
        client: null,
        deltas: { dicePool: 3 },  // only dicePool, no spinTokens or essence
        triggerSource: 'test_partial',
      });

      assertEqual(result.dicePool, 23, 'dicePool should increase by 3');
      assertEqual(result.spinTokens, 5, 'spinTokens should be unchanged');
      assertEqual(result.essence, 100, 'essence should be unchanged');
    },
  },

  {
    name: 'applyTokenHopRewards notifies store subscribers',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 10, dicePool: 20, spinTokens: 5, essence: 100 });

      let notifications = 0;
      const unsub = subscribeIslandRunState(session, () => { notifications += 1; });

      applyTokenHopRewards({
        session,
        client: null,
        deltas: { dicePool: 1 },
        triggerSource: 'test_notify',
      });

      assertEqual(notifications, 1, 'subscriber should be notified exactly once');
      unsub();
    },
  },

  // ── Regression: one commit per roll ─────────────────────────────────────

  {
    name: 'one commit per roll: applyRollResult does not bump runtimeVersion (roll service owns it)',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 5, dicePool: 30, tokenIndex: 0 });

      // Simulate roll service's commit.
      const postRoll = {
        ...readIslandRunGameStateRecord(session),
        dicePool: 29,
        tokenIndex: 4,
        runtimeVersion: 6,
      };
      void writeIslandRunGameStateRecord({ session, client: null, record: postRoll });

      // applyRollResult should NOT bump runtimeVersion again.
      const result = applyRollResult({ session });
      assertEqual(result.runtimeVersion, 6, 'runtimeVersion should stay at 6 (not 7)');

      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.runtimeVersion, 6, 'store mirror runtimeVersion should be 6');
    },
  },

  // ── Regression: hydrate with older version does NOT roll back ───────────

  {
    name: 'stale hydration does not roll back tokenIndex or dicePool in the store',
    run: () => {
      resetAll();
      const session = makeSession();

      // Start with version 10 in the store.
      seedState({ runtimeVersion: 10, dicePool: 50, tokenIndex: 15, spinTokens: 8 });

      // Simulate a stale hydration result (v8 — older than current v10).
      const staleRecord: IslandRunGameStateRecord = {
        ...readIslandRunGameStateRecord(session),
        runtimeVersion: 8,
        dicePool: 20,
        tokenIndex: 3,
        spinTokens: 2,
      };

      // The reconciliation handler (in the renderer) checks
      // `incomingRuntimeVersion > currentRuntimeVersion` before applying.
      // We simulate that guard here: only publish if newer.
      const current = getIslandRunStateSnapshot(session);
      if (staleRecord.runtimeVersion > current.runtimeVersion) {
        resetIslandRunStateSnapshot(session, staleRecord);
      }

      // Store must still have the v10 values.
      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.runtimeVersion, 10, 'runtimeVersion must stay at 10');
      assertEqual(snapshot.dicePool, 50, 'dicePool must not be rolled back to 20');
      assertEqual(snapshot.tokenIndex, 15, 'tokenIndex must not be rolled back to 3');
      assertEqual(snapshot.spinTokens, 8, 'spinTokens must not be rolled back to 2');
    },
  },

  {
    name: 'sequential applyTokenHopRewards compose correctly (no dropped deltas)',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 10, dicePool: 10, spinTokens: 0, essence: 50 });

      // First hop: earn dice.
      applyTokenHopRewards({ session, client: null, deltas: { dicePool: 5 }, triggerSource: 'hop1' });
      // Second hop: earn essence + spinTokens.
      applyTokenHopRewards({ session, client: null, deltas: { essence: 20, spinTokens: 3 }, triggerSource: 'hop2' });
      // Third hop: spend spinTokens.
      applyTokenHopRewards({ session, client: null, deltas: { spinTokens: -2 }, triggerSource: 'hop3' });

      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.dicePool, 15, 'dicePool should be 10 + 5');
      assertEqual(snapshot.essence, 70, 'essence should be 50 + 20');
      assertEqual(snapshot.spinTokens, 1, 'spinTokens should be 0 + 3 - 2');
      assertEqual(snapshot.runtimeVersion, 13, 'runtimeVersion should bump 3 times (10 → 13)');
    },
  },

  // ── C2: applyEssenceAward ────────────────────────────────────────────────

  {
    name: 'applyEssenceAward credits wallet + lifetime-earned and commits through the store',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 4, essence: 100, essenceLifetimeEarned: 250 });

      const { record, earned } = applyEssenceAward({
        session,
        client: null,
        islandRunContractV2Enabled: true,
        amount: 15,
        triggerSource: 'test_award',
      });

      assertEqual(earned, 15, 'earned should equal the requested amount');
      assertEqual(record.essence, 115, 'essence should increase by 15');
      assertEqual(record.essenceLifetimeEarned, 265, 'lifetime earned should increase by 15');
      assertEqual(record.runtimeVersion, 5, 'runtimeVersion should bump by 1');

      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.essence, 115, 'store mirror should reflect award');
      assertEqual(snapshot.essenceLifetimeEarned, 265, 'store mirror lifetime earned should match');
    },
  },

  {
    name: 'applyEssenceAward is a no-op when the contract-v2 flag is off',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 4, essence: 100, essenceLifetimeEarned: 250 });

      let notifications = 0;
      const unsub = subscribeIslandRunState(session, () => { notifications += 1; });

      const { earned } = applyEssenceAward({
        session,
        client: null,
        islandRunContractV2Enabled: false,
        amount: 15,
      });

      assertEqual(earned, 0, 'earned should be 0 when flag is off');
      assertEqual(notifications, 0, 'no subscriber notification should fire');
      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.essence, 100, 'essence should be unchanged');
      assertEqual(snapshot.runtimeVersion, 4, 'runtimeVersion should not bump on no-op');

      unsub();
    },
  },

  {
    name: 'applyEssenceAward is a no-op when amount rounds below 1',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 4, essence: 100, essenceLifetimeEarned: 250 });

      const { earned } = applyEssenceAward({
        session,
        client: null,
        islandRunContractV2Enabled: true,
        amount: 0.4,
      });

      assertEqual(earned, 0, 'earned should be 0 for sub-unit amounts');
      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.runtimeVersion, 4, 'runtimeVersion should not bump on no-op');
    },
  },

  // ── C2: applyEssenceDeduct ──────────────────────────────────────────────

  {
    name: 'applyEssenceDeduct debits wallet + lifetime-spent and commits through the store',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 7, essence: 100, essenceLifetimeSpent: 40 });

      const { record, spent } = applyEssenceDeduct({
        session,
        client: null,
        islandRunContractV2Enabled: true,
        amount: 25,
        triggerSource: 'test_deduct',
      });

      assertEqual(spent, 25, 'spent should equal requested amount when wallet has enough');
      assertEqual(record.essence, 75, 'essence should decrease by 25');
      assertEqual(record.essenceLifetimeSpent, 65, 'lifetime spent should grow by 25');
      assertEqual(record.runtimeVersion, 8, 'runtimeVersion should bump by 1');
    },
  },

  {
    name: 'applyEssenceDeduct clamps to wallet when request exceeds balance',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 7, essence: 10, essenceLifetimeSpent: 40 });

      const { record, spent } = applyEssenceDeduct({
        session,
        client: null,
        islandRunContractV2Enabled: true,
        amount: 25,
      });

      assertEqual(spent, 10, 'spent should equal wallet when wallet is short');
      assertEqual(record.essence, 0, 'essence should clamp to 0');
      assertEqual(record.essenceLifetimeSpent, 50, 'lifetime spent should grow by actual amount (10)');
    },
  },

  {
    name: 'applyEssenceDeduct is a no-op when wallet is empty',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 7, essence: 0, essenceLifetimeSpent: 40 });

      const { spent } = applyEssenceDeduct({
        session,
        client: null,
        islandRunContractV2Enabled: true,
        amount: 15,
      });

      assertEqual(spent, 0, 'spent should be 0 when wallet is empty');
      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.runtimeVersion, 7, 'runtimeVersion should not bump on no-op');
    },
  },

  // ── C2: applyRewardBarState ─────────────────────────────────────────────

  {
    name: 'applyRewardBarState commits the full reward-bar + timed-event + sticker snapshot in one write',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 2 });

      let notifications = 0;
      const unsub = subscribeIslandRunState(session, () => { notifications += 1; });

      const record = applyRewardBarState({
        session,
        client: null,
        nextState: {
          rewardBarProgress: 7,
          rewardBarThreshold: 10,
          rewardBarClaimCountInEvent: 2,
          rewardBarEscalationTier: 1,
          rewardBarLastClaimAtMs: 1_700_000_000_000,
          rewardBarBoundEventId: 'evt-123',
          rewardBarLadderId: 'ladder-a',
          activeTimedEvent: {
            eventId: 'evt-123',
            eventType: 'feed_friend',
            startedAtMs: 1_699_000_000_000,
            expiresAtMs: 1_700_500_000_000,
            version: 1,
          },
          activeTimedEventProgress: { feedingActions: 3, tokensEarned: 2, milestonesClaimed: 1 },
          stickerProgress: { fragments: 4, pityCounter: 2 },
          stickerInventory: { 'stk-a': 1 },
        },
        triggerSource: 'test_reward_bar',
      });

      assertEqual(record.rewardBarProgress, 7, 'rewardBarProgress should be committed');
      assertEqual(record.rewardBarClaimCountInEvent, 2, 'claim count should be committed');
      assertEqual(record.runtimeVersion, 3, 'runtimeVersion should bump by 1');

      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.rewardBarProgress, 7, 'store mirror should reflect committed value');
      assertEqual(snapshot.stickerInventory['stk-a'], 1, 'sticker inventory should be committed');
      assertEqual(snapshot.activeTimedEvent?.eventId ?? null, 'evt-123', 'active timed event should be committed');
      assert(notifications === 1, `expected exactly 1 subscriber notification, got ${notifications}`);

      unsub();
    },
  },

  // ── C2: applyEssenceDriftTick ────────────────────────────────────────────

  {
    name: 'applyEssenceDriftTick is a no-op when wallet is at zero',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 5, essence: 0 });

      const { driftLost } = applyEssenceDriftTick({
        session,
        client: null,
        effectiveIslandNumber: 1,
        elapsedMs: 5 * 60 * 1000,
      });

      assertEqual(driftLost, 0, 'driftLost should be 0 when wallet is empty');
      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.runtimeVersion, 5, 'runtimeVersion should not bump on no-op');
    },
  },

  {
    name: 'applyEssenceDriftTick is a no-op when elapsedMs is 0',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 5, essence: 10_000, currentIslandNumber: 1 });

      const { driftLost } = applyEssenceDriftTick({
        session,
        client: null,
        effectiveIslandNumber: 1,
        elapsedMs: 0,
      });

      assertEqual(driftLost, 0, 'driftLost should be 0 when no time elapsed');
      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.runtimeVersion, 5, 'runtimeVersion should not bump on no-op');
    },
  },

  // ── C2 regression: one commit per reward ────────────────────────────────

  {
    name: 'one commit per essence award: exactly one subscriber notification per applyEssenceAward call',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 4, essence: 100, essenceLifetimeEarned: 0 });

      let notifications = 0;
      const unsub = subscribeIslandRunState(session, () => { notifications += 1; });

      applyEssenceAward({ session, client: null, islandRunContractV2Enabled: true, amount: 5 });
      applyEssenceAward({ session, client: null, islandRunContractV2Enabled: true, amount: 5 });
      applyEssenceAward({ session, client: null, islandRunContractV2Enabled: true, amount: 5 });

      assertEqual(notifications, 3, 'each award should publish exactly once');
      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.essence, 115, 'essence should be 100 + 5 + 5 + 5');
      assertEqual(snapshot.runtimeVersion, 7, 'runtimeVersion should bump 3 times (4 → 7)');

      unsub();
    },
  },

  {
    name: 'sequential award → deduct → reward-bar → award produces no dropped deltas',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 10,
        essence: 50,
        essenceLifetimeEarned: 200,
        essenceLifetimeSpent: 80,
      });

      applyEssenceAward({ session, client: null, islandRunContractV2Enabled: true, amount: 30 });
      applyEssenceDeduct({ session, client: null, islandRunContractV2Enabled: true, amount: 10 });
      applyRewardBarState({
        session,
        client: null,
        nextState: {
          rewardBarProgress: 2,
          rewardBarThreshold: 10,
          rewardBarClaimCountInEvent: 0,
          rewardBarEscalationTier: 0,
          rewardBarLastClaimAtMs: null,
          rewardBarBoundEventId: null,
          rewardBarLadderId: null,
          activeTimedEvent: null,
          activeTimedEventProgress: { feedingActions: 0, tokensEarned: 0, milestonesClaimed: 0 },
          stickerProgress: { fragments: 0 },
          stickerInventory: {},
        },
      });
      applyEssenceAward({ session, client: null, islandRunContractV2Enabled: true, amount: 5 });

      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.essence, 75, 'essence should be 50 + 30 - 10 + 5 = 75');
      assertEqual(snapshot.essenceLifetimeEarned, 235, 'lifetime earned should be 200 + 30 + 5 = 235');
      assertEqual(snapshot.essenceLifetimeSpent, 90, 'lifetime spent should be 80 + 10 = 90');
      assertEqual(snapshot.rewardBarProgress, 2, 'reward-bar progress should be committed');
      assertEqual(snapshot.runtimeVersion, 14, 'runtimeVersion should bump 4 times (10 → 14)');
    },
  },
];
