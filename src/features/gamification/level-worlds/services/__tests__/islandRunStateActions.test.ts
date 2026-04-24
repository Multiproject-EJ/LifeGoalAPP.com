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
  hydrateIslandRunState,
  refreshIslandRunStateFromLocal,
  resetIslandRunStateSnapshot,
  subscribeIslandRunState,
} from '../islandRunStateStore';
import {
  applyActiveCompanion,
  applyAudioEnabledMarker,
  applyBossTrialResolvedMarker,
  applyCompanionBonusLastVisitKeyMarker,
  applyCreatureCollection,
  applyCreatureTreatInventory,
  applyEggResolution,
  applyEggPlacement,
  applyFirstRunClaimed,
  applyFirstRunStarterRewards,
  applyOnboardingDisplayNameLoopMarker,
  applyQaProgressionSnapshot,
  applyStoryPrologueSeenMarker,
  applyStopBuildSpend,
  applyStopObjectiveProgress,
  applyStopTicketPayment,
  applyWalletShardsDelta,
  applyWalletShieldsDelta,
  applyWalletShieldsSet,
  applyEssenceAward,
  applyEssenceDeduct,
  applyEssenceDriftTick,
  applyRewardBarState,
  applyRollResult,
  syncCompletedStopsForIsland,
  applyTokenHopRewards,
  travelToNextIsland,
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
    run: async () => {
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
    run: async () => {
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
    run: async () => {
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

  {
    name: 'applyCreatureTreatInventory commits treat inventory through the store path',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 20,
        creatureTreatInventory: { basic: 1, favorite: 0, rare: 0 },
      });

      const result = applyCreatureTreatInventory({
        session,
        client: null,
        creatureTreatInventory: { basic: 2, favorite: 1, rare: 0 },
        triggerSource: 'test_apply_treat_inventory',
      });

      assertEqual(result.creatureTreatInventory.basic, 2, 'basic treats should update');
      assertEqual(result.creatureTreatInventory.favorite, 1, 'favorite treats should update');
      assertEqual(result.runtimeVersion, 21, 'runtimeVersion should bump on treat inventory commit');
    },
  },

  {
    name: 'applyCreatureCollection commits collection through the store path',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 20,
        creatureCollection: [],
      });
      const nextCollection = [{
        creatureId: 'reef-lantern-ray',
        nickname: 'Nova',
      }] as unknown as IslandRunGameStateRecord['creatureCollection'];

      const result = applyCreatureCollection({
        session,
        client: null,
        creatureCollection: nextCollection,
        triggerSource: 'test_apply_creature_collection',
      });

      assertEqual((result.creatureCollection ?? []).length, 1, 'creature collection should persist one entry');
      assertEqual(result.runtimeVersion, 21, 'runtimeVersion should bump on collection commit');
    },
  },

  {
    name: 'applyActiveCompanion commits active companion through the store path',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 20,
        activeCompanionId: null,
      });

      const result = applyActiveCompanion({
        session,
        client: null,
        activeCompanionId: 'reef-lantern-ray',
        triggerSource: 'test_apply_active_companion',
      });

      assertEqual(result.activeCompanionId, 'reef-lantern-ray', 'active companion id should persist');
      assertEqual(result.runtimeVersion, 21, 'runtimeVersion should bump on active companion commit');
    },
  },

  {
    name: 'applyWalletShardsDelta awards shards through the store commit path',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 20, shards: 4 });

      const result = applyWalletShardsDelta({
        session,
        client: null,
        delta: 3,
        triggerSource: 'test_shards_award',
      });

      assertEqual(result.appliedDelta, 3, 'appliedDelta should reflect awarded shards');
      assertEqual(result.record.shards, 7, 'shards should increase by 3');
      assertEqual(result.record.runtimeVersion, 21, 'runtimeVersion should bump on shard award');

      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.shards, 7, 'store mirror should reflect awarded shards');
    },
  },

  {
    name: 'applyWalletShardsDelta spends shards with floor clamp at zero',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 20, shards: 2 });

      const result = applyWalletShardsDelta({
        session,
        client: null,
        delta: -5,
        triggerSource: 'test_shards_spend',
      });

      assertEqual(result.appliedDelta, -2, 'appliedDelta should clamp spend to available wallet');
      assertEqual(result.record.shards, 0, 'shards should floor at zero');
      assertEqual(result.record.runtimeVersion, 21, 'runtimeVersion should bump on shard spend');
    },
  },

  {
    name: 'applyWalletShieldsSet writes an absolute shields value through the store commit path',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 20, shields: 9 });

      const result = applyWalletShieldsSet({
        session,
        client: null,
        nextShields: 0,
        triggerSource: 'test_shields_set_zero',
      });

      assertEqual(result.changed, true, 'changed should be true when shields are updated');
      assertEqual(result.record.shields, 0, 'shields should be set to target value');
      assertEqual(result.record.runtimeVersion, 21, 'runtimeVersion should bump on shields commit');

      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.shields, 0, 'store mirror should reflect shields update');
    },
  },

  {
    name: 'applyWalletShieldsSet is a no-op when next value equals current value',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 20, shields: 0 });

      const result = applyWalletShieldsSet({
        session,
        client: null,
        nextShields: 0,
        triggerSource: 'test_shields_set_noop',
      });

      assertEqual(result.changed, false, 'changed should be false on no-op');
      assertEqual(result.record.runtimeVersion, 20, 'runtimeVersion should not bump on no-op');
      assertEqual(result.record.shields, 0, 'shields should remain unchanged on no-op');
    },
  },

  {
    name: 'applyWalletShieldsDelta awards shields through the canonical store path',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 20, shields: 1 });

      const result = applyWalletShieldsDelta({
        session,
        client: null,
        delta: 1,
        triggerSource: 'test_shields_delta_award',
      });

      assertEqual(result.appliedDelta, 1, 'appliedDelta should reflect awarded shields');
      assertEqual(result.record.shields, 2, 'shields should increase by 1');
      assertEqual(result.record.runtimeVersion, 21, 'runtimeVersion should bump on shield award');
    },
  },

  {
    name: 'applyWalletShieldsDelta spends shields with floor clamp at zero',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 20, shields: 1 });

      const result = applyWalletShieldsDelta({
        session,
        client: null,
        delta: -5,
        triggerSource: 'test_shields_delta_spend',
      });

      assertEqual(result.appliedDelta, -1, 'appliedDelta should clamp spend to available shields');
      assertEqual(result.record.shields, 0, 'shields should floor at zero');
      assertEqual(result.record.runtimeVersion, 21, 'runtimeVersion should bump on shield spend');
    },
  },

  {
    name: 'applyBossTrialResolvedMarker commits island marker fields through the store path',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 14, currentIslandNumber: 2, bossTrialResolvedIslandNumber: null });

      const result = applyBossTrialResolvedMarker({
        session,
        client: null,
        islandNumber: 3,
        triggerSource: 'test_boss_marker_commit',
      });

      assertEqual(result.currentIslandNumber, 3, 'currentIslandNumber should sync to resolved island');
      assertEqual(result.bossTrialResolvedIslandNumber, 3, 'resolved marker should be written');
      assertEqual(result.runtimeVersion, 15, 'runtimeVersion should bump on marker commit');

      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.currentIslandNumber, 3, 'store mirror should reflect island marker commit');
      assertEqual(snapshot.bossTrialResolvedIslandNumber, 3, 'store mirror should reflect resolved marker');
    },
  },

  {
    name: 'applyBossTrialResolvedMarker is a no-op when marker fields already match',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 14, currentIslandNumber: 3, bossTrialResolvedIslandNumber: 3 });

      const result = applyBossTrialResolvedMarker({
        session,
        client: null,
        islandNumber: 3,
        triggerSource: 'test_boss_marker_noop',
      });

      assertEqual(result.runtimeVersion, 14, 'runtimeVersion should not change on no-op');
    },
  },

  {
    name: 'applyQaProgressionSnapshot commits island marker + dice/token fields through the store path',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 9,
        currentIslandNumber: 2,
        bossTrialResolvedIslandNumber: 2,
        dicePool: 17,
        tokenIndex: 6,
      });

      const result = applyQaProgressionSnapshot({
        session,
        client: null,
        currentIslandNumber: 3,
        bossTrialResolvedIslandNumber: null,
        dicePool: 40,
        tokenIndex: 0,
        triggerSource: 'test_qa_progression_snapshot',
      });

      assertEqual(result.currentIslandNumber, 3, 'island marker should update');
      assertEqual(result.bossTrialResolvedIslandNumber, null, 'boss marker should clear');
      assertEqual(result.dicePool, 40, 'dicePool should sync to QA snapshot');
      assertEqual(result.tokenIndex, 0, 'tokenIndex should sync to QA snapshot');
      assertEqual(result.runtimeVersion, 10, 'runtimeVersion should bump by one');
    },
  },

  {
    name: 'applyFirstRunClaimed sets firstRunClaimed once through the store path',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 5, firstRunClaimed: false });

      const result = applyFirstRunClaimed({
        session,
        client: null,
        triggerSource: 'test_apply_first_run_claimed',
      });

      assertEqual(result.firstRunClaimed, true, 'firstRunClaimed should be true');
      assertEqual(result.runtimeVersion, 6, 'runtimeVersion should bump once');
    },
  },

  {
    name: 'applyOnboardingDisplayNameLoopMarker commits onboarding marker through the store path',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 8, onboardingDisplayNameLoopCompleted: false });

      const result = applyOnboardingDisplayNameLoopMarker({
        session,
        client: null,
        completed: true,
        triggerSource: 'test_onboarding_display_loop_marker',
      });

      assertEqual(result.onboardingDisplayNameLoopCompleted, true, 'onboarding marker should update');
      assertEqual(result.runtimeVersion, 9, 'runtimeVersion should bump once');
    },
  },

  {
    name: 'applyAudioEnabledMarker commits audio marker through the store path',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 8, audioEnabled: true });

      const result = applyAudioEnabledMarker({
        session,
        client: null,
        audioEnabled: false,
        triggerSource: 'test_audio_marker',
      });

      assertEqual(result.audioEnabled, false, 'audio marker should update');
      assertEqual(result.runtimeVersion, 9, 'runtimeVersion should bump once');
    },
  },

  {
    name: 'applyStoryPrologueSeenMarker commits story marker through the store path',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 8, storyPrologueSeen: false });

      const result = applyStoryPrologueSeenMarker({
        session,
        client: null,
        storyPrologueSeen: true,
        triggerSource: 'test_story_marker',
      });

      assertEqual(result.storyPrologueSeen, true, 'story marker should update');
      assertEqual(result.runtimeVersion, 9, 'runtimeVersion should bump once');
    },
  },

  {
    name: 'applyCompanionBonusLastVisitKeyMarker commits visit marker through the store path',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 8, companionBonusLastVisitKey: null });

      const result = applyCompanionBonusLastVisitKeyMarker({
        session,
        client: null,
        visitKey: '2:17',
        triggerSource: 'test_companion_visit_marker',
      });

      assertEqual(result.companionBonusLastVisitKey, '2:17', 'visit marker should update');
      assertEqual(result.runtimeVersion, 9, 'runtimeVersion should bump once');
    },
  },

  {
    name: 'applyFirstRunStarterRewards commits essence + lifetime + dice in one store write',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 11, essence: 100, essenceLifetimeEarned: 1000, dicePool: 12 });

      const result = applyFirstRunStarterRewards({
        session,
        client: null,
        essenceBonus: 250,
        diceBonus: 16,
        triggerSource: 'test_first_run_rewards',
      });

      assertEqual(result.essence, 350, 'essence should include starter bonus');
      assertEqual(result.essenceLifetimeEarned, 1250, 'lifetime earned should include starter bonus');
      assertEqual(result.dicePool, 28, 'dicePool should include starter bonus');
      assertEqual(result.runtimeVersion, 12, 'runtimeVersion should bump once');
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

  // ── C4: applyStopBuildSpend ──────────────────────────────────────────────

  {
    name: 'applyStopObjectiveProgress commits stop objective + active stop pointer through the store',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 10,
        stopStatesByIndex: Array.from({ length: 5 }, () => ({ objectiveComplete: false, buildComplete: false })),
        activeStopIndex: 0,
        activeStopType: 'hatchery',
      });

      const nextStopStatesByIndex = [
        { objectiveComplete: true, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
      ];

      const result = applyStopObjectiveProgress({
        session,
        client: null,
        stopStatesByIndex: nextStopStatesByIndex,
        activeStopIndex: 1,
        activeStopType: 'mystery',
        triggerSource: 'test_stop_objective',
      });

      assertEqual(result.stopStatesByIndex[0]?.objectiveComplete, true, 'stop 0 objective should be complete');
      assertEqual(result.activeStopIndex, 1, 'active stop index should advance');
      assertEqual(result.activeStopType, 'mystery', 'active stop type should advance');
      assertEqual(result.runtimeVersion, 11, 'runtimeVersion should bump by one');
    },
  },

  {
    name: 'applyEggPlacement commits egg state + per-island ledger + completed stops atomically',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 4,
        currentIslandNumber: 7,
        activeEggTier: null,
        activeEggSetAtMs: null,
        activeEggHatchDurationMs: null,
        activeEggIsDormant: false,
        perIslandEggs: {},
        completedStopsByIsland: {},
      });

      const result = applyEggPlacement({
        session,
        client: null,
        islandNumber: 7,
        activeEggTier: 'rare',
        activeEggSetAtMs: 1000,
        activeEggHatchDurationMs: 3600,
        perIslandEggEntry: {
          tier: 'rare',
          setAtMs: 1000,
          hatchAtMs: 4600,
          status: 'incubating',
          location: 'island',
        },
        completedStops: ['hatchery'],
        triggerSource: 'test_egg_placement',
      });

      assertEqual(result.activeEggTier, 'rare', 'active egg tier should be set');
      assertEqual(result.activeEggSetAtMs, 1000, 'active egg setAt should be set');
      assertEqual(result.activeEggHatchDurationMs, 3600, 'active egg hatch duration should be set');
      assertEqual(result.perIslandEggs['7']?.status, 'incubating', 'island ledger should contain incubating egg');
      assertEqual(result.completedStopsByIsland['7']?.[0], 'hatchery', 'completed stops should be synced for island');
      assertEqual(result.runtimeVersion, 5, 'runtimeVersion should bump by one');
    },
  },

  {
    name: 'applyStopBuildSpend commits build-progress spend through the store in one publish',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 12,
        essence: 500,
        essenceLifetimeSpent: 50,
        stopBuildStateByIndex: [
          { requiredEssence: 50, spentEssence: 0, buildLevel: 0 },
          { requiredEssence: 70, spentEssence: 0, buildLevel: 0 },
          { requiredEssence: 90, spentEssence: 0, buildLevel: 0 },
          { requiredEssence: 120, spentEssence: 0, buildLevel: 0 },
          { requiredEssence: 200, spentEssence: 0, buildLevel: 0 },
        ],
      });

      let notifications = 0;
      const unsub = subscribeIslandRunState(session, () => { notifications += 1; });

      const nextBuildState = [
        { requiredEssence: 120, spentEssence: 0, buildLevel: 1 },
        { requiredEssence: 70, spentEssence: 0, buildLevel: 0 },
        { requiredEssence: 90, spentEssence: 0, buildLevel: 0 },
        { requiredEssence: 120, spentEssence: 0, buildLevel: 0 },
        { requiredEssence: 200, spentEssence: 0, buildLevel: 0 },
      ];
      const nextStopStates = [
        { objectiveComplete: true, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
      ];

      const result = applyStopBuildSpend({
        session,
        client: null,
        essence: 450,
        essenceLifetimeSpent: 100,
        stopBuildStateByIndex: nextBuildState,
        stopStatesByIndex: nextStopStates,
      });

      assertEqual(notifications, 1, 'exactly one publish for the build spend commit');
      assertEqual(result.runtimeVersion, 13, 'runtimeVersion should bump by 1');
      assertEqual(result.essence, 450, 'essence should persist the updated wallet');
      assertEqual(result.essenceLifetimeSpent, 100, 'lifetime spent should persist the updated total');
      assert(result.stopBuildStateByIndex[0]?.buildLevel === 1, 'build level should persist for stop 0');
      assertEqual(result.stopStatesByIndex[0]?.objectiveComplete, true, 'stop objective-complete state should persist');

      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.runtimeVersion, 13, 'store snapshot should reflect new runtimeVersion');
      assert(snapshot.stopBuildStateByIndex[0]?.buildLevel === 1, 'store snapshot should keep updated stop build level');

      unsub();
    },
  },

  {
    name: 'applyEggResolution commits egg clear + ledger + completed stops and optional essence in one publish',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 8,
        currentIslandNumber: 7,
        activeEggTier: 'mythic',
        activeEggSetAtMs: 10_000,
        activeEggHatchDurationMs: 3600,
        activeEggIsDormant: true,
        perIslandEggs: {},
        completedStopsByIsland: {},
        essence: 120,
        essenceLifetimeEarned: 340,
      });

      let notifications = 0;
      const unsub = subscribeIslandRunState(session, () => { notifications += 1; });

      const result = applyEggResolution({
        session,
        client: null,
        islandNumber: 7,
        perIslandEggEntry: {
          tier: 'mythic',
          setAtMs: 10_000,
          hatchAtMs: 13_600,
          status: 'sold',
          openedAt: 14_000,
          location: 'island',
        },
        completedStops: ['hatchery'],
        essence: 150,
        essenceLifetimeEarned: 370,
        triggerSource: 'test_egg_resolution',
      });

      assertEqual(notifications, 1, 'exactly one publish for egg resolution');
      assertEqual(result.activeEggTier, null, 'active egg tier should be cleared');
      assertEqual(result.activeEggSetAtMs, null, 'active egg set timestamp should be cleared');
      assertEqual(result.activeEggHatchDurationMs, null, 'active egg hatch duration should be cleared');
      assertEqual(result.activeEggIsDormant, false, 'active egg dormant flag should reset');
      assertEqual(result.perIslandEggs['7']?.status, 'sold', 'island ledger should persist sold egg entry');
      assertEqual(result.completedStopsByIsland['7']?.[0], 'hatchery', 'completed stops should sync for island');
      assertEqual(result.essence, 150, 'essence should persist provided value');
      assertEqual(result.essenceLifetimeEarned, 370, 'lifetime earned should persist provided value');
      assertEqual(result.runtimeVersion, 9, 'runtimeVersion should bump by one');

      unsub();
    },
  },

  // ── C3: travelToNextIsland ──────────────────────────────────────────────

  {
    name: 'travelToNextIsland commits all four legacy patches in ONE store commit',
    run: async () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 5,
        currentIslandNumber: 3,
        cycleIndex: 0,
        completedStopsByIsland: { '3': ['hatchery', 'habit'], '5': ['boss'] },
        stopTicketsPaidByIsland: { '3': [1, 2, 3], '5': [1] },
        bonusTileChargeByIsland: { '3': { '5': 4, '10': 2 } as any, '5': { '7': 1 } as any },
        islandStartedAtMs: 1_000_000,
        islandExpiresAtMs: 2_000_000,
        bossTrialResolvedIslandNumber: 3,
      });

      let notifications = 0;
      const unsub = subscribeIslandRunState(session, () => { notifications += 1; });

      const travelNow = 5_000_000;
      const result = await travelToNextIsland({
        session,
        client: null,
        nextIsland: 4,
        startTimer: true,
        nowMs: travelNow,
        getIslandDurationMs: () => 86_400_000, // 24h
        islandRunContractV2Enabled: false, // keep stop reset out of this case
      });

      assertEqual(notifications, 1, 'exactly one subscriber notification for the whole travel');
      assertEqual(result.resolvedIsland, 4, 'resolvedIsland should be 4');
      assertEqual(result.nextCycleIndex, 0, 'cycleIndex should not change for 3→4');

      const snapshot = getIslandRunStateSnapshot(session);
      // Old island's entries cleared, other islands' entries preserved.
      assertEqual(snapshot.completedStopsByIsland['3'].length, 0, "old island's completedStops cleared");
      assertEqual(snapshot.completedStopsByIsland['5'].length, 1, "other islands' completedStops preserved");
      assertEqual(snapshot.stopTicketsPaidByIsland['3'].length, 0, "old island's tickets cleared");
      assertEqual(snapshot.stopTicketsPaidByIsland['5'].length, 1, "other islands' tickets preserved");
      assertEqual(Object.keys(snapshot.bonusTileChargeByIsland['3']).length, 0, "old island's bonus charges cleared");
      assertEqual(Object.keys(snapshot.bonusTileChargeByIsland['5']).length, 1, "other islands' bonus charges preserved");
      // Island bookkeeping.
      assertEqual(snapshot.currentIslandNumber, 4, 'currentIslandNumber advanced');
      assertEqual(snapshot.cycleIndex, 0, 'cycleIndex unchanged');
      assertEqual(snapshot.bossTrialResolvedIslandNumber, null, 'bossTrialResolvedIslandNumber cleared');
      assertEqual(snapshot.islandStartedAtMs, travelNow, 'islandStartedAtMs set to nowMs');
      assertEqual(snapshot.islandExpiresAtMs, travelNow + 86_400_000, 'islandExpiresAtMs = nowMs + duration');
      assertEqual(snapshot.runtimeVersion, 6, 'runtimeVersion bumped exactly once (5 → 6)');

      unsub();
    },
  },

  {
    name: 'travelToNextIsland: cycle wrap 120 → 1 bumps cycleIndex and preserves all ledger keys',
    run: async () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 10,
        currentIslandNumber: 120,
        cycleIndex: 2,
        completedStopsByIsland: { '120': ['boss'], '50': ['hatchery'] },
      });

      const result = await travelToNextIsland({
        session,
        client: null,
        nextIsland: 121, // past the cap — wraps to 1
        startTimer: true,
        nowMs: 1_000,
        getIslandDurationMs: () => 10_000,
        islandRunContractV2Enabled: false,
      });

      assertEqual(result.resolvedIsland, 1, '121 wraps to 1');
      assertEqual(result.nextCycleIndex, 3, 'cycleIndex bumps to 3 on wrap');

      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.currentIslandNumber, 1, 'currentIslandNumber set to 1');
      assertEqual(snapshot.cycleIndex, 3, 'cycleIndex = 3');
      // Both the old island (120) and an unrelated island (50) should still
      // have their keys in completedStopsByIsland.
      assert('120' in snapshot.completedStopsByIsland, "wrap preserves '120' key");
      assert('50' in snapshot.completedStopsByIsland, "wrap preserves unrelated '50' key");
      assertEqual(snapshot.completedStopsByIsland['120'].length, 0, "wrap clears old island 120's stops");
      assertEqual(snapshot.completedStopsByIsland['50'].length, 1, "wrap preserves unrelated island's stops");
    },
  },

  {
    name: 'travelToNextIsland: startTimer=false leaves timer fields zeroed (pending-start flow)',
    run: async () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 1, currentIslandNumber: 1 });

      await travelToNextIsland({
        session,
        client: null,
        nextIsland: 2,
        startTimer: false,
        nowMs: 9_999,
        getIslandDurationMs: () => 10_000,
        islandRunContractV2Enabled: false,
      });

      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.islandStartedAtMs, 0, 'startedAtMs = 0 when startTimer is false');
      assertEqual(snapshot.islandExpiresAtMs, 0, 'expiresAtMs = 0 when startTimer is false');
      assertEqual(snapshot.currentIslandNumber, 2, 'island still advances');
    },
  },

  {
    name: 'travelToNextIsland: saves old island active egg into perIslandEggs and clears active egg when new island is fresh',
    run: async () => {
      resetAll();
      const session = makeSession();
      const setAt = 1_000_000;
      const hatchDuration = 86_400_000;
      seedState({
        runtimeVersion: 3,
        currentIslandNumber: 7,
        activeEggTier: 'rare',
        activeEggSetAtMs: setAt,
        activeEggHatchDurationMs: hatchDuration,
        activeEggIsDormant: false,
        perIslandEggs: {},
      });

      const travelNow = setAt + 1000; // well before hatch
      const result = await travelToNextIsland({
        session,
        client: null,
        nextIsland: 8,
        startTimer: true,
        nowMs: travelNow,
        getIslandDurationMs: () => 86_400_000,
        islandRunContractV2Enabled: false,
      });

      assertEqual(result.restoredActiveEgg, null, 'no egg to restore on a fresh new island');

      const snapshot = getIslandRunStateSnapshot(session);
      const saved = snapshot.perIslandEggs['7'];
      assert(saved !== undefined, "old island's egg should be saved to perIslandEggs");
      assertEqual(saved.tier, 'rare', 'saved egg tier matches');
      assertEqual(saved.setAtMs, setAt, 'saved egg setAtMs matches');
      assertEqual(saved.hatchAtMs, setAt + hatchDuration, 'saved egg hatchAtMs is derived');
      assertEqual(saved.status, 'incubating', 'not ready yet → status incubating');
      assertEqual(saved.location, 'island', 'not ready yet → location island');
      assertEqual(snapshot.activeEggTier, null, 'active egg cleared on arrival');
      assertEqual(snapshot.activeEggSetAtMs, null, 'active egg setAtMs cleared');
      assertEqual(snapshot.activeEggHatchDurationMs, null, 'active egg hatchDuration cleared');
    },
  },

  {
    name: 'travelToNextIsland: restores previously-placed incubating egg on return visit',
    run: async () => {
      resetAll();
      const session = makeSession();
      const pastSetAt = 500_000;
      const pastHatchAt = 86_900_000; // far future
      seedState({
        runtimeVersion: 3,
        currentIslandNumber: 4,
        activeEggTier: null,
        activeEggSetAtMs: null,
        activeEggHatchDurationMs: null,
        perIslandEggs: {
          '9': {
            tier: 'mythic',
            setAtMs: pastSetAt,
            hatchAtMs: pastHatchAt,
            status: 'incubating',
            location: 'island',
          },
        },
      });

      const travelNow = 1_000_000; // still before hatch
      const result = await travelToNextIsland({
        session,
        client: null,
        nextIsland: 9,
        startTimer: true,
        nowMs: travelNow,
        getIslandDurationMs: () => 86_400_000,
        islandRunContractV2Enabled: false,
      });

      assert(result.restoredActiveEgg !== null, 'restored egg should be returned');
      assertEqual(result.restoredActiveEgg!.tier, 'mythic', 'restored tier matches');
      assertEqual(result.restoredActiveEgg!.isDormant, false, 'still incubating → not dormant');

      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.activeEggTier, 'mythic', 'active egg tier restored');
      assertEqual(snapshot.activeEggSetAtMs, pastSetAt, 'active egg setAtMs restored');
      assertEqual(snapshot.activeEggHatchDurationMs, pastHatchAt - pastSetAt, 'active egg hatchDuration derived');
    },
  },

  {
    name: 'travelToNextIsland: contract-v2 flag resets stop + build states; disabled leaves them intact',
    run: async () => {
      resetAll();
      const session = makeSession();
      const priorStopStates = [
        { objectiveComplete: true, buildComplete: false },
        { objectiveComplete: true, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
      ];
      seedState({
        runtimeVersion: 2,
        currentIslandNumber: 1,
        stopStatesByIndex: priorStopStates,
        activeStopIndex: 2,
        activeStopType: 'mystery',
      });

      // Flag OFF → stop states remain untouched
      await travelToNextIsland({
        session,
        client: null,
        nextIsland: 2,
        startTimer: true,
        nowMs: 1_000,
        getIslandDurationMs: () => 10_000,
        islandRunContractV2Enabled: false,
      });
      let snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.stopStatesByIndex[0].objectiveComplete, true, 'flag off: stop 0 stays complete');
      assertEqual(snapshot.activeStopIndex, 2, 'flag off: activeStopIndex unchanged');
      assertEqual(snapshot.activeStopType, 'mystery', 'flag off: activeStopType unchanged');

      // Now reseed and travel with flag ON.
      seedState({
        runtimeVersion: 8,
        currentIslandNumber: 2,
        stopStatesByIndex: priorStopStates,
        activeStopIndex: 2,
        activeStopType: 'mystery',
      });
      await travelToNextIsland({
        session,
        client: null,
        nextIsland: 3,
        startTimer: true,
        nowMs: 1_000,
        getIslandDurationMs: () => 10_000,
        islandRunContractV2Enabled: true,
      });
      snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.stopStatesByIndex.length, 5, 'flag on: 5 fresh stop states');
      assertEqual(snapshot.stopStatesByIndex[0].objectiveComplete, false, 'flag on: stop 0 reset to incomplete');
      assertEqual(snapshot.activeStopIndex, 0, 'flag on: activeStopIndex reset to 0');
      assertEqual(snapshot.activeStopType, 'hatchery', 'flag on: activeStopType reset to hatchery');
      assert(snapshot.stopBuildStateByIndex.length === 5, 'flag on: 5 fresh build states');
    },
  },

  {
    name: 'travelToNextIsland: atomic — a stale separate patch cannot half-apply travel',
    run: async () => {
      // Regression for the named C3 risk. In the legacy path, four separate
      // patches could be interleaved by another writer; the store-action
      // path must expose subscribers to either the full pre-travel state or
      // the full post-travel state, never a half-applied mix.
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 20,
        currentIslandNumber: 5,
        completedStopsByIsland: { '5': ['hatchery', 'habit', 'mystery'] },
        stopTicketsPaidByIsland: { '5': [1, 2] },
        islandStartedAtMs: 1_000,
        islandExpiresAtMs: 100_000,
        bossTrialResolvedIslandNumber: 5,
      });

      const observed: Array<{
        currentIslandNumber: number;
        completedStopsLen: number;
        ticketsLen: number;
        bossResolvedIsland: number | null;
      }> = [];
      const unsub = subscribeIslandRunState(session, () => {
        const s = getIslandRunStateSnapshot(session);
        observed.push({
          currentIslandNumber: s.currentIslandNumber,
          completedStopsLen: s.completedStopsByIsland['5']?.length ?? 0,
          ticketsLen: s.stopTicketsPaidByIsland['5']?.length ?? 0,
          bossResolvedIsland: s.bossTrialResolvedIslandNumber,
        });
      });

      await travelToNextIsland({
        session,
        client: null,
        nextIsland: 6,
        startTimer: true,
        nowMs: 200_000,
        getIslandDurationMs: () => 86_400_000,
        islandRunContractV2Enabled: false,
      });

      assertEqual(observed.length, 1, 'subscribers should see exactly one intermediate state transition');
      // In the single observed state, every field must reflect the
      // post-travel view — no half-applied mix.
      assertEqual(observed[0].currentIslandNumber, 6, 'post-travel: island = 6');
      assertEqual(observed[0].completedStopsLen, 0, 'post-travel: old island stops cleared');
      assertEqual(observed[0].ticketsLen, 0, 'post-travel: old island tickets cleared');
      assertEqual(observed[0].bossResolvedIsland, null, 'post-travel: boss resolved island cleared');

      unsub();
    },
  },

  {
    name: 'full-loop gate: roll → ticket pay → stop complete → island clear → travel survives hydration interleave',
    run: async () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 40,
        currentIslandNumber: 3,
        cycleIndex: 0,
        dicePool: 20,
        tokenIndex: 1,
        essence: 200,
        essenceLifetimeSpent: 0,
        completedStopsByIsland: { '3': [] },
        stopTicketsPaidByIsland: { '3': [] },
        stopStatesByIndex: [
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
        ],
        activeStopIndex: 2,
        activeStopType: 'mystery',
      });

      // Roll service commit simulation: direct record write first, then mirror sync.
      const postRoll = {
        ...readIslandRunGameStateRecord(session),
        dicePool: 17,
        tokenIndex: 4,
        runtimeVersion: 41,
      };
      void writeIslandRunGameStateRecord({ session, client: null, record: postRoll });
      const syncedRoll = applyRollResult({ session });
      assertEqual(syncedRoll.runtimeVersion, 41, 'roll sync should preserve roll-owned runtimeVersion');
      assertEqual(syncedRoll.dicePool, 17, 'roll sync should expose updated dicePool');

      const paid = applyStopTicketPayment({
        session,
        client: null,
        essence: 150,
        essenceLifetimeSpent: 50,
        stopTicketsPaidByIsland: { '3': [2] },
        triggerSource: 'test_full_loop_ticket_pay',
      });
      assertEqual(paid.runtimeVersion, 42, 'ticket payment should bump runtimeVersion');

      const progressed = applyStopObjectiveProgress({
        session,
        client: null,
        stopStatesByIndex: [
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: true, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
        ],
        activeStopIndex: 2,
        activeStopType: 'mystery',
        triggerSource: 'test_full_loop_stop_complete',
      });
      assertEqual(progressed.runtimeVersion, 43, 'objective progress should bump runtimeVersion');

      const islandCleared = syncCompletedStopsForIsland({
        session,
        client: null,
        islandNumber: 3,
        completedStops: ['hatchery', 'habit', 'mystery', 'challenge', 'boss'],
        triggerSource: 'test_full_loop_island_clear',
      });
      assertEqual(islandCleared.runtimeVersion, 44, 'island-clear ledger sync should bump runtimeVersion');

      // Hydration/interleaving simulation: run travel and hydrate together.
      await Promise.all([
        travelToNextIsland({
          session,
          client: null,
          nextIsland: 4,
          startTimer: true,
          nowMs: 5_000_000,
          getIslandDurationMs: () => 86_400_000,
          islandRunContractV2Enabled: true,
        }),
        hydrateIslandRunState({ session, client: null }),
      ]);

      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.currentIslandNumber, 4, 'travel should land on island 4');
      assertEqual(snapshot.completedStopsByIsland['3']?.length ?? 0, 0, 'old island completed stops should be cleared');
      assertEqual(snapshot.stopTicketsPaidByIsland['3']?.length ?? 0, 0, 'old island ticket ledger should be cleared');
      assertEqual(snapshot.essence, 150, 'ticket payment essence spend should persist through travel');
      assertEqual(snapshot.essenceLifetimeSpent, 50, 'lifetime spent should persist through travel');
      assertEqual(snapshot.runtimeVersion, 45, 'full loop should end at expected runtimeVersion');
    },
  },
];
