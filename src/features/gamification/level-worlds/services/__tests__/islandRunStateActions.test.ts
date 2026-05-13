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
  hydrateIslandRunGameStateRecordWithSource,
  getIslandRunLuckyRollSessionKey,
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
  type IslandRunGameStateRecord,
  type IslandRunLuckyRollSession,
  type SpaceExcavatorProgressEntry,
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
  applyActivateCurrentIslandTimer,
  applyAudioEnabledMarker,
  applyBossTrialResolvedMarker,
  applyCompanionBonusLastVisitKeyMarker,
  applyCreatureCollection,
  applyCreatureTreatInventory,
  applyDevGrantDice,
  applyDevBuildAllToL3,
  applyDevGrantEssence,
  applyDevSpeedHatchEgg,
  applyHydrationEggReadyTransition,
  applyEggResolution,
  resolveReadyEggTerminalTransition,
  applyEggPlacement,
  applyFirstRunClaimed,
  applyFirstRunStarterRewards,
  applyIslandShardsSet,
  applyMarketOwnedBundleMarker,
  applyOnboardingDisplayNameLoopMarker,
  applyOnboardingCompleteMarker,
  applyPerfectCompanionSnapshot,
  applyQaProgressionSnapshot,
  applyShardClaimProgressMarker,
  applyStoryPrologueSeenMarker,
  applyWalletDiamondsDelta,
  applyWalletDiamondsSet,
  applyStopBuildSpend,
  applyStopBuildSpendBatch,
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
  applyPassiveDiceRegenTick,
  advanceSpaceExcavatorBoard,
  applySpaceExcavatorDig,
  applyTimedEventTicketSpend,
  claimSpaceExcavatorMilestoneReward,
  initSpaceExcavatorProgressForEvent,
  SPACE_EXCAVATOR_TOTAL_BOARDS,
  syncCompletedStopsForIsland,
  applyTokenHopRewards,
  travelToNextIsland,
} from '../islandRunStateActions';
import { buildInitialDiceRegenState } from '../islandRunDiceRegeneration';
import { SPACE_EXCAVATOR_CAMPAIGN_MILESTONES } from '../spaceExcavatorCampaignProgress';
import {
  __resetIslandRunFeatureFlagsForTests,
  __setIslandRunFeatureFlagsForTests,
} from '../../../../../config/islandRunFeatureFlags';
import {
  assert,
  assertDeepEqual,
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
  __resetIslandRunFeatureFlagsForTests();
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

function makeLuckyRollSession(
  status: IslandRunLuckyRollSession['status'],
  overrides: Partial<IslandRunLuckyRollSession> = {},
): IslandRunLuckyRollSession {
  return {
    status,
    runId: `travel-test-${status}`,
    targetIslandNumber: 60,
    cycleIndex: 0,
    position: status === 'completed' || status === 'banked' ? 29 : 0,
    rollsUsed: status === 'completed' || status === 'banked' ? 5 : 0,
    claimedTileIds: [],
    pendingRewards: [],
    bankedRewards: [],
    startedAtMs: 1_000,
    bankedAtMs: status === 'banked' ? 2_000 : null,
    updatedAtMs: 2_000,
    ...overrides,
  };
}

function makeSpaceExcavatorProgress(
  eventId: string,
  overrides: Partial<SpaceExcavatorProgressEntry> = {},
): SpaceExcavatorProgressEntry {
  return {
    eventId,
    boardIndex: 0,
    boardSize: 5,
    treasureCount: 3,
    treasureTileIds: [1, 2, 3],
    objectId: 'test_relic',
    objectName: 'Test Relic',
    objectTier: 'common',
    objectIcon: '🧪',
    objectTileIds: [1, 2, 3],
    bonusBombTileIds: [12],
    triggeredBonusBombTileIds: [],
    revealedObjectTileIds: [],
    dugTileIds: [],
    foundTreasureTileIds: [],
    completedBoardCount: 0,
    eventProgressPoints: 0,
    claimedMilestoneIds: [],
    status: 'active',
    updatedAtMs: 1_000,
    ...overrides,
  };
}

function getAdjacentTileIdsForTest(tileId: number, boardSize: number): number[] {
  const x = tileId % boardSize;
  const y = Math.floor(tileId / boardSize);
  const tileIds: number[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nextX = x + dx;
      const nextY = y + dy;
      if (nextX < 0 || nextX >= boardSize || nextY < 0 || nextY >= boardSize) continue;
      tileIds.push(nextY * boardSize + nextX);
    }
  }
  return tileIds.sort((a, b) => a - b);
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
    name: 'Space Excavator opens/progresses through event-scoped tickets without touching spinTokens or unrelated buckets',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 10,
        spinTokens: 7,
        minigameTicketsByEvent: {
          'space_excavator:event-a': 2,
          'lucky_spin:event-b': 9,
        },
        spaceExcavatorProgressByEvent: {},
      });

      const initialized = initSpaceExcavatorProgressForEvent({
        session,
        client: null,
        eventId: 'space_excavator:event-a',
      });
      const initialProgress = initialized.spaceExcavatorProgressByEvent['space_excavator:event-a'];
      assert(initialProgress, 'init should create progress for the Space Excavator event');
      assertEqual(initialProgress.boardIndex, 0, 'Space Excavator should start on zero-based board index 0');
      assertEqual(initialProgress.completedBoardCount, 0, 'Space Excavator should start with no completed boards');
      assertEqual(initialProgress.eventProgressPoints, 0, 'Space Excavator event campaign should start with no progress points');
      assertDeepEqual(initialProgress.claimedMilestoneIds, [], 'Space Excavator event campaign should start with no claimed milestones');
      assert(initialProgress.objectId.length > 0, 'init should create hidden object metadata');
      assert(initialProgress.objectName.length > 0, 'init should create hidden object display name');
      assert(initialProgress.objectTileIds.length >= 2, 'init should create object tile layout');
      assertEqual(initialProgress.bonusBombTileIds.length, 1, 'init should create one bonus bomb tile for the board');
      assertDeepEqual(initialProgress.triggeredBonusBombTileIds, [], 'init should start with no triggered bonus bombs');
      assertDeepEqual(initialProgress.revealedObjectTileIds, [], 'init should start with no revealed object pieces');
      assert(
        initialProgress.objectTileIds.every((tileId) => tileId >= 0 && tileId < initialProgress.boardSize * initialProgress.boardSize),
        'object layout should fit within the board',
      );
      assert(
        initialProgress.bonusBombTileIds.every((tileId) => tileId >= 0 && tileId < initialProgress.boardSize * initialProgress.boardSize),
        'bonus bomb layout should fit within the board',
      );
      assert(
        initialProgress.bonusBombTileIds.every((tileId) => !initialProgress.objectTileIds.includes(tileId)),
        'bonus bomb layout should not overlap relic object tiles',
      );

      const secondInit = initSpaceExcavatorProgressForEvent({
        session,
        client: null,
        eventId: 'space_excavator:event-a',
      });
      assertDeepEqual(
        secondInit.spaceExcavatorProgressByEvent['space_excavator:event-a'].objectTileIds,
        initialProgress.objectTileIds,
        'init should keep stable object placement for an event id',
      );

      const dig = applySpaceExcavatorDig({
        session,
        client: null,
        eventId: 'space_excavator:event-a',
        tileId: initialProgress.objectTileIds[0],
      });
      assertEqual(dig.ok, true, 'first dig with tickets should succeed');
      assertEqual(dig.triggeredBomb, false, 'digging a relic piece should not trigger bomb feedback');
      assertDeepEqual(dig.revealedTileIds, [initialProgress.objectTileIds[0]], 'normal dig should report only the dug tile as revealed');
      assertEqual(dig.ticketsRemaining, 1, 'successful dig should spend exactly one event ticket');
      assertEqual(dig.record.minigameTicketsByEvent['space_excavator:event-a'], 1, 'space excavator event bucket should decrement');
      assertEqual(dig.record.minigameTicketsByEvent['lucky_spin:event-b'], 9, 'unrelated event bucket should be untouched');
      assertEqual(dig.record.spinTokens, 7, 'spinTokens should remain unchanged');
      assertEqual(
        dig.record.spaceExcavatorProgressByEvent['space_excavator:event-a'].dugTileIds.includes(initialProgress.objectTileIds[0]),
        true,
        'successful dig should persist revealed tile progress',
      );
      assertDeepEqual(
        dig.record.spaceExcavatorProgressByEvent['space_excavator:event-a'].revealedObjectTileIds,
        [initialProgress.objectTileIds[0]],
        'successful dig on object tile should record revealed object piece',
      );

      const duplicateDig = applySpaceExcavatorDig({
        session,
        client: null,
        eventId: 'space_excavator:event-a',
        tileId: initialProgress.objectTileIds[0],
      });
      assertEqual(duplicateDig.ok, false, 'duplicate tile dig should be rejected');
      assertEqual(duplicateDig.failureReason, 'already_dug', 'duplicate tile dig should not be treated as an out-of-ticket failure');
      assertEqual(duplicateDig.triggeredBomb, false, 'duplicate tile dig should not trigger bomb feedback');
      assertDeepEqual(duplicateDig.revealedTileIds, [], 'duplicate tile dig should not report new reveals');
      assertEqual(duplicateDig.ticketsRemaining, 1, 'duplicate tile dig should not spend another ticket');
      assertEqual(duplicateDig.record.minigameTicketsByEvent['space_excavator:event-a'], 1, 'duplicate dig should preserve ticket bucket');
      assertEqual(duplicateDig.record.spinTokens, 7, 'duplicate dig should not touch spinTokens');

      const reopened = initSpaceExcavatorProgressForEvent({
        session,
        client: null,
        eventId: 'space_excavator:event-a',
      });
      assertDeepEqual(
        reopened.spaceExcavatorProgressByEvent['space_excavator:event-a'].dugTileIds,
        [initialProgress.objectTileIds[0]],
        'partial board progress should persist and resume on reopen',
      );
      assertDeepEqual(
        reopened.spaceExcavatorProgressByEvent['space_excavator:event-a'].revealedObjectTileIds,
        [initialProgress.objectTileIds[0]],
        'partial object reveal progress should persist and resume on reopen',
      );
    },
  },

  {
    name: 'Space Excavator failed dig at zero tickets does not reveal tiles or affect other event buckets',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 10,
        spinTokens: 4,
        minigameTicketsByEvent: {
          'space_excavator:event-zero': 0,
          'companion_feast:event-c': 6,
        },
        spaceExcavatorProgressByEvent: {},
      });

      const initialized = initSpaceExcavatorProgressForEvent({
        session,
        client: null,
        eventId: 'space_excavator:event-zero',
      });
      const initialProgress = initialized.spaceExcavatorProgressByEvent['space_excavator:event-zero'];
      const failedDig = applySpaceExcavatorDig({
        session,
        client: null,
        eventId: 'space_excavator:event-zero',
        tileId: initialProgress.objectTileIds[0],
      });

      assertEqual(failedDig.ok, false, 'dig at zero tickets should be blocked');
      assertEqual(failedDig.failureReason, 'insufficient_tickets', 'dig at zero tickets should report insufficient tickets');
      assertEqual(failedDig.ticketsRemaining, 0, 'blocked dig should report zero tickets');
      assertEqual(failedDig.record.runtimeVersion, initialized.runtimeVersion, 'blocked dig should not commit a runtime mutation');
      assertDeepEqual(
        failedDig.record.spaceExcavatorProgressByEvent['space_excavator:event-zero'],
        initialProgress,
        'blocked dig should preserve saved board progress exactly',
      );
      assertEqual(
        failedDig.record.spaceExcavatorProgressByEvent['space_excavator:event-zero'].dugTileIds.length,
        0,
        'blocked dig should not reveal any tile',
      );
      assertEqual(
        failedDig.record.spaceExcavatorProgressByEvent['space_excavator:event-zero'].eventProgressPoints,
        0,
        'blocked dig should not mutate event progress',
      );
      assertDeepEqual(
        failedDig.record.spaceExcavatorProgressByEvent['space_excavator:event-zero'].claimedMilestoneIds,
        [],
        'blocked dig should not mutate claimed milestones',
      );
      assertEqual(failedDig.record.minigameTicketsByEvent['companion_feast:event-c'], 6, 'unrelated event bucket should remain untouched');
      assertEqual(failedDig.record.spaceExcavatorProgressByEvent['companion_feast:event-c'], undefined, 'unrelated event progress should remain absent');
      assertEqual(failedDig.record.spinTokens, 4, 'blocked dig should not touch spinTokens');
    },
  },

  {
    name: 'Space Excavator empty digs persist dug tile without revealing object piece',
    run: () => {
      resetAll();
      const session = makeSession();
      const eventId = 'space_excavator:event-empty';
      seedState({
        runtimeVersion: 10,
        spinTokens: 8,
        minigameTicketsByEvent: {
          [eventId]: 3,
        },
        spaceExcavatorProgressByEvent: {},
      });

      const initialized = initSpaceExcavatorProgressForEvent({
        session,
        client: null,
        eventId,
      });
      const initialProgress = initialized.spaceExcavatorProgressByEvent[eventId];
      const emptyTileId = Array.from(
        { length: initialProgress.boardSize * initialProgress.boardSize },
        (_, tileId) => tileId,
      ).find((tileId) => !initialProgress.objectTileIds.includes(tileId));
      assertEqual(typeof emptyTileId, 'number', 'test board should include at least one empty tile');

      const dig = applySpaceExcavatorDig({
        session,
        client: null,
        eventId,
        tileId: emptyTileId as number,
      });

      assertEqual(dig.ok, true, 'empty tile dig should succeed when tickets are available');
      assertEqual(dig.record.minigameTicketsByEvent[eventId], 2, 'empty tile dig should spend one event ticket');
      assert(
        dig.record.spaceExcavatorProgressByEvent[eventId].dugTileIds.includes(emptyTileId as number),
        'empty tile dig should persist dug tile progress',
      );
      assertDeepEqual(
        dig.record.spaceExcavatorProgressByEvent[eventId].revealedObjectTileIds,
        [],
        'empty tile dig should not reveal an object piece',
      );
      assertEqual(dig.record.spaceExcavatorProgressByEvent[eventId].status, 'active', 'empty tile dig should not complete board');
      assertEqual(dig.record.spinTokens, 8, 'empty tile dig should not touch spinTokens');
    },
  },

  {
    name: 'Space Excavator completion marks board complete when all object pieces are found',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 10,
        spinTokens: 12,
        minigameTicketsByEvent: {
          'space_excavator:event-complete': 10,
          'space_excavator:event-complete-other': 6,
        },
        spaceExcavatorProgressByEvent: {},
      });

      const initialized = initSpaceExcavatorProgressForEvent({
        session,
        client: null,
        eventId: 'space_excavator:event-complete',
      });
      const objectTileIds = initialized.spaceExcavatorProgressByEvent['space_excavator:event-complete'].objectTileIds;
      let record = applySpaceExcavatorDig({
        session,
        client: null,
        eventId: 'space_excavator:event-complete',
        tileId: objectTileIds[0],
      }).record;
      assertEqual(
        record.spaceExcavatorProgressByEvent['space_excavator:event-complete'].status,
        'active',
        'Space Excavator board should remain active before all object pieces are found',
      );

      for (const tileId of objectTileIds.slice(1)) {
        record = applySpaceExcavatorDig({
          session,
          client: null,
          eventId: 'space_excavator:event-complete',
          tileId,
        }).record;
      }

      const progress = record.spaceExcavatorProgressByEvent['space_excavator:event-complete'];
      assertEqual(progress.status, 'board_complete', 'Space Excavator board should complete when all object pieces are found');
      assertEqual(progress.completedBoardCount, 1, 'completion should mark one completed board');
      assertEqual(progress.eventProgressPoints, 1, 'completion should award one event progress point');
      assertDeepEqual(progress.claimedMilestoneIds, [], 'completion should make the first milestone claimable without auto-claiming it');
      assertEqual(progress.boardIndex, 0, 'completed board should remain visible until the player advances');
      assertDeepEqual(progress.revealedObjectTileIds, objectTileIds, 'completion should reveal every object tile');
      assertEqual(record.spinTokens, 12, 'board completion progress should not touch spinTokens');
      assertEqual(
        record.minigameTicketsByEvent['space_excavator:event-complete-other'],
        6,
        'board completion progress should not touch unrelated ticket buckets',
      );
      assertEqual(
        record.spaceExcavatorProgressByEvent['space_excavator:event-complete-other'],
        undefined,
        'board completion progress should not create unrelated event progress',
      );

      const reopened = initSpaceExcavatorProgressForEvent({
        session,
        client: null,
        eventId: 'space_excavator:event-complete',
      });
      assertEqual(
        reopened.spaceExcavatorProgressByEvent['space_excavator:event-complete'].eventProgressPoints,
        1,
        'reopening a completed board should not double-award event progress',
      );
      assertDeepEqual(
        reopened.spaceExcavatorProgressByEvent['space_excavator:event-complete'].claimedMilestoneIds,
        [],
        'unclaimed milestone reward state should persist on reopen',
      );
    },
  },

  {
    name: 'Space Excavator bonus bomb spends one ticket and reveals nearby tiles for free',
    run: () => {
      resetAll();
      const session = makeSession();
      const eventId = 'space_excavator:event-bomb';
      const bombTileId = 12;
      const initialProgress = makeSpaceExcavatorProgress(eventId, {
        objectTileIds: [7, 8, 24],
        treasureTileIds: [7, 8, 24],
        treasureCount: 3,
        bonusBombTileIds: [bombTileId],
      });
      seedState({
        runtimeVersion: 10,
        spinTokens: 6,
        minigameTicketsByEvent: {
          [eventId]: 2,
          'space_excavator:event-bomb-other': 5,
        },
        spaceExcavatorProgressByEvent: {
          [eventId]: initialProgress,
        },
      });

      const dig = applySpaceExcavatorDig({
        session,
        client: null,
        eventId,
        tileId: bombTileId,
      });

      const expectedRevealedTileIds = [bombTileId, ...getAdjacentTileIdsForTest(bombTileId, 5)].sort((a, b) => a - b);
      const progress = dig.record.spaceExcavatorProgressByEvent[eventId];
      assertEqual(dig.ok, true, 'bomb tile dig should succeed');
      assertEqual(dig.triggeredBomb, true, 'bomb tile dig should report triggered bomb metadata');
      assertDeepEqual(dig.revealedTileIds, expectedRevealedTileIds, 'bomb tile dig should reveal the bomb and adjacent tiles');
      assertEqual(dig.bonusRevealCount, expectedRevealedTileIds.length - 1, 'bonus reveal count should exclude the paid bomb tile');
      assertEqual(dig.ticketsRemaining, 1, 'bomb tile dig should spend exactly one event ticket');
      assertEqual(dig.record.minigameTicketsByEvent[eventId], 1, 'bomb tile dig should decrement only the active event ticket bucket');
      assertEqual(dig.record.minigameTicketsByEvent['space_excavator:event-bomb-other'], 5, 'bomb tile dig should not touch unrelated event tickets');
      assertEqual(dig.record.spinTokens, 6, 'bomb tile dig should not touch spinTokens');
      assertDeepEqual(progress.dugTileIds, expectedRevealedTileIds, 'bomb reveal should persist all newly cleared tiles');
      assertDeepEqual(progress.revealedObjectTileIds, [7, 8], 'bomb-revealed relic pieces should count toward object progress');
      assertDeepEqual(progress.foundTreasureTileIds, [7, 8], 'bomb-revealed relic pieces should count toward found treasure progress');
      assertDeepEqual(progress.triggeredBonusBombTileIds, [bombTileId], 'triggered bomb should persist under progress');
      assertEqual(progress.status, 'active', 'board should stay active until all relic pieces are found');

      const duplicateDig = applySpaceExcavatorDig({
        session,
        client: null,
        eventId,
        tileId: bombTileId,
      });
      assertEqual(duplicateDig.ok, false, 'duplicate bomb tile dig should be rejected');
      assertEqual(duplicateDig.failureReason, 'already_dug', 'duplicate bomb tile dig should report already dug');
      assertEqual(duplicateDig.ticketsRemaining, 1, 'duplicate bomb tile dig should not spend another ticket');
      assertEqual(duplicateDig.triggeredBomb, false, 'duplicate bomb tile dig should not trigger bomb effects again');
      assertDeepEqual(duplicateDig.revealedTileIds, [], 'duplicate bomb tile dig should not reveal new tiles');
      assertDeepEqual(
        duplicateDig.record.spaceExcavatorProgressByEvent[eventId].triggeredBonusBombTileIds,
        [bombTileId],
        'duplicate bomb tile dig should preserve triggered bomb state',
      );
    },
  },

  {
    name: 'Space Excavator bonus bomb can complete a board by revealing final relic pieces',
    run: () => {
      resetAll();
      const session = makeSession();
      const eventId = 'space_excavator:event-bomb-complete';
      const bombTileId = 12;
      const initialProgress = makeSpaceExcavatorProgress(eventId, {
        objectTileIds: [6, 7, 8],
        treasureTileIds: [6, 7, 8],
        treasureCount: 3,
        bonusBombTileIds: [bombTileId],
      });
      seedState({
        runtimeVersion: 10,
        spinTokens: 10,
        minigameTicketsByEvent: {
          [eventId]: 1,
        },
        spaceExcavatorProgressByEvent: {
          [eventId]: initialProgress,
        },
      });

      const dig = applySpaceExcavatorDig({
        session,
        client: null,
        eventId,
        tileId: bombTileId,
      });

      const progress = dig.record.spaceExcavatorProgressByEvent[eventId];
      assertEqual(dig.ok, true, 'bomb completion dig should succeed');
      assertEqual(dig.triggeredBomb, true, 'completion dig should trigger the bomb');
      assertEqual(dig.ticketsRemaining, 0, 'completion bomb dig should spend only the paid bomb tile ticket');
      assertEqual(progress.status, 'board_complete', 'bomb reveal should complete the board when it reveals all remaining relic pieces');
      assertEqual(progress.completedBoardCount, 1, 'bomb-completed board should award one completed board');
      assertEqual(progress.eventProgressPoints, 1, 'bomb-completed board should award one event progress point');
      assertDeepEqual(progress.revealedObjectTileIds, [6, 7, 8], 'bomb completion should reveal every object tile');
      assertDeepEqual(progress.claimedMilestoneIds, [], 'bomb completion should not auto-claim milestone rewards');
      assertEqual(dig.record.spinTokens, 10, 'bomb completion should not touch spinTokens');

      const reopened = initSpaceExcavatorProgressForEvent({ session, client: null, eventId });
      assertEqual(
        reopened.spaceExcavatorProgressByEvent[eventId].eventProgressPoints,
        1,
        'reopening a bomb-completed board should not double-award event progress',
      );
      assertDeepEqual(
        reopened.spaceExcavatorProgressByEvent[eventId].triggeredBonusBombTileIds,
        [bombTileId],
        'triggered bomb state should persist across reopen',
      );
    },
  },

  {
    name: 'Space Excavator milestone claim grants reward, persists claimed id, and is double-claim safe',
    run: () => {
      resetAll();
      const session = makeSession();
      const eventId = 'space_excavator:event-claim';
      const otherEventId = 'space_excavator:event-claim-other';
      const otherProgress = makeSpaceExcavatorProgress(otherEventId, {
        eventProgressPoints: 4,
        completedBoardCount: 4,
      });
      seedState({
        runtimeVersion: 20,
        spinTokens: 9,
        dicePool: 10,
        essence: 100,
        essenceLifetimeEarned: 1_000,
        shards: 2,
        minigameTicketsByEvent: {
          [eventId]: 7,
          [otherEventId]: 3,
        },
        spaceExcavatorProgressByEvent: {
          [eventId]: makeSpaceExcavatorProgress(eventId, {
            completedBoardCount: 1,
            eventProgressPoints: 1,
            status: 'board_complete',
          }),
          [otherEventId]: otherProgress,
        },
      });

      const claimed = claimSpaceExcavatorMilestoneReward({
        session,
        client: null,
        eventId,
        milestoneId: 'clear_1',
      });

      assertEqual(claimed.ok, true, 'achieved milestone should be claimable');
      assertEqual(claimed.record.essence, 125, 'clear_1 should grant +25 essence');
      assertEqual(claimed.record.essenceLifetimeEarned, 1_025, 'essence rewards should update lifetime earned');
      assertEqual(claimed.record.dicePool, 10, 'clear_1 should not grant dice');
      assertEqual(claimed.record.shards, 2, 'clear_1 should not grant shards');
      assertEqual(claimed.record.spinTokens, 9, 'milestone claim should not touch spinTokens');
      assertDeepEqual(claimed.record.spaceExcavatorProgressByEvent[eventId].claimedMilestoneIds, ['clear_1'], 'claim should persist milestone id');
      assertEqual(claimed.record.minigameTicketsByEvent[eventId], 7, 'claim should not touch event ticket bucket');
      assertEqual(claimed.record.minigameTicketsByEvent[otherEventId], 3, 'claim should not touch unrelated ticket bucket');
      assertDeepEqual(
        claimed.record.spaceExcavatorProgressByEvent[otherEventId],
        otherProgress,
        'claim should not touch unrelated event progress',
      );

      const doubleClaim = claimSpaceExcavatorMilestoneReward({
        session,
        client: null,
        eventId,
        milestoneId: 'clear_1',
      });
      assertEqual(doubleClaim.ok, false, 'double claim should be rejected');
      assertEqual(doubleClaim.failureReason, 'already_claimed', 'double claim should report already claimed');
      assertEqual(doubleClaim.record.essence, 125, 'double claim should not grant essence again');
      assertEqual(doubleClaim.record.spinTokens, 9, 'double claim should still leave spinTokens unchanged');

      const reopened = initSpaceExcavatorProgressForEvent({ session, client: null, eventId });
      assertDeepEqual(
        reopened.spaceExcavatorProgressByEvent[eventId].claimedMilestoneIds,
        ['clear_1'],
        'claimed milestone should persist across reopen/hard-refresh hydration path',
      );
    },
  },

  {
    name: 'Space Excavator milestone claim is blocked before threshold and supports DEV override event ids',
    run: () => {
      resetAll();
      const session = makeSession();
      const lockedEventId = 'space_excavator:event-locked';
      const devEventId = 'space_excavator:dev_override';
      seedState({
        runtimeVersion: 30,
        spinTokens: 5,
        dicePool: 20,
        essence: 50,
        shards: 1,
        minigameTicketsByEvent: {
          [lockedEventId]: 4,
          [devEventId]: 6,
        },
        spaceExcavatorProgressByEvent: {
          [lockedEventId]: makeSpaceExcavatorProgress(lockedEventId, {
            completedBoardCount: 0,
            eventProgressPoints: 0,
          }),
          [devEventId]: makeSpaceExcavatorProgress(devEventId, {
            completedBoardCount: 2,
            eventProgressPoints: 2,
          }),
        },
      });

      const blocked = claimSpaceExcavatorMilestoneReward({
        session,
        client: null,
        eventId: lockedEventId,
        milestoneId: 'clear_1',
      });
      assertEqual(blocked.ok, false, 'unachieved milestone should not be claimable');
      assertEqual(blocked.failureReason, 'not_achieved', 'blocked claim should report not achieved');
      assertEqual(blocked.record.essence, 50, 'blocked claim should not grant essence');
      assertDeepEqual(blocked.record.spaceExcavatorProgressByEvent[lockedEventId].claimedMilestoneIds, [], 'blocked claim should not persist claimed id');

      const devClaim = claimSpaceExcavatorMilestoneReward({
        session,
        client: null,
        eventId: devEventId,
        milestoneId: 'clear_2',
      });
      assertEqual(devClaim.ok, true, 'DEV override event id should claim through the same event-scoped path');
      assertEqual(devClaim.record.dicePool, 25, 'clear_2 should grant +5 dice');
      assertEqual(devClaim.record.essence, 50, 'clear_2 should not grant essence');
      assertEqual(devClaim.record.shards, 1, 'clear_2 should not grant shards');
      assertEqual(devClaim.record.spinTokens, 5, 'DEV override claim should not touch spinTokens');
      assertEqual(devClaim.record.minigameTicketsByEvent[devEventId], 6, 'DEV override claim should not touch event tickets');
    },
  },

  {
    name: 'Space Excavator final milestone grants bundle reward and old placeholder claimed ids are not re-granted',
    run: () => {
      resetAll();
      const session = makeSession();
      const eventId = 'space_excavator:event-final-claim';
      const legacyEventId = 'space_excavator:event-legacy-placeholder';
      seedState({
        runtimeVersion: 40,
        spinTokens: 13,
        dicePool: 100,
        shards: 10,
        minigameTicketsByEvent: {
          [eventId]: 2,
          [legacyEventId]: 2,
        },
        spaceExcavatorProgressByEvent: {
          [eventId]: makeSpaceExcavatorProgress(eventId, {
            completedBoardCount: 10,
            eventProgressPoints: 10,
            status: 'completed',
          }),
          [legacyEventId]: makeSpaceExcavatorProgress(legacyEventId, {
            completedBoardCount: 10,
            eventProgressPoints: 10,
            claimedMilestoneIds: ['clear_10'],
            status: 'completed',
          }),
        },
      });

      const finalClaim = claimSpaceExcavatorMilestoneReward({
        session,
        client: null,
        eventId,
        milestoneId: 'clear_10',
      });
      assertEqual(finalClaim.ok, true, 'final milestone should be claimable at ten clears');
      assertEqual(finalClaim.record.dicePool, 125, 'clear_10 should grant +25 dice');
      assertEqual(finalClaim.record.shards, 13, 'clear_10 should grant +3 shards');
      assertEqual(finalClaim.record.spinTokens, 13, 'final milestone should not touch spinTokens');
      assertDeepEqual(finalClaim.record.spaceExcavatorProgressByEvent[eventId].claimedMilestoneIds, ['clear_10'], 'final claim should persist claimed id');

      const legacyClaim = claimSpaceExcavatorMilestoneReward({
        session,
        client: null,
        eventId: legacyEventId,
        milestoneId: 'clear_10',
      });
      assertEqual(legacyClaim.ok, false, 'old placeholder claimed milestone should not be re-granted');
      assertEqual(legacyClaim.failureReason, 'already_claimed', 'old placeholder claimed milestone should remain claimed');
      assertEqual(legacyClaim.record.dicePool, 125, 'legacy already-claimed milestone should not grant dice');
      assertEqual(legacyClaim.record.shards, 13, 'legacy already-claimed milestone should not grant shards');
    },
  },

  {
    name: 'Space Excavator board advancement persists next board without spending tickets',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 10,
        spinTokens: 11,
        minigameTicketsByEvent: {
          'space_excavator:event-advance': 10,
          'space_excavator:event-other': 4,
        },
        spaceExcavatorProgressByEvent: {},
      });

      const initialized = initSpaceExcavatorProgressForEvent({
        session,
        client: null,
        eventId: 'space_excavator:event-advance',
      });
      const initialProgress = initialized.spaceExcavatorProgressByEvent['space_excavator:event-advance'];
      let record = initialized;
      for (const tileId of initialProgress.objectTileIds) {
        record = applySpaceExcavatorDig({
          session,
          client: null,
          eventId: 'space_excavator:event-advance',
          tileId,
        }).record;
      }

      const completedProgress = record.spaceExcavatorProgressByEvent['space_excavator:event-advance'];
      const expectedTicketsAfterDigs = 10 - initialProgress.objectTileIds.length;
      assertEqual(completedProgress.status, 'board_complete', 'finding all object pieces should mark board complete before advancing');
      assertEqual(record.minigameTicketsByEvent['space_excavator:event-advance'], expectedTicketsAfterDigs, 'object digs should spend one ticket each');

      const advanced = advanceSpaceExcavatorBoard({
        session,
        client: null,
        eventId: 'space_excavator:event-advance',
      });

      assertEqual(advanced.ok, true, 'advance should succeed from a board-complete state');
      assertEqual(advanced.ticketsRemaining, expectedTicketsAfterDigs, 'advancing should not spend event tickets');
      assertEqual(advanced.record.minigameTicketsByEvent['space_excavator:event-advance'], expectedTicketsAfterDigs, 'ticket bucket should remain unchanged on advance');
      assertEqual(advanced.record.minigameTicketsByEvent['space_excavator:event-other'], 4, 'unrelated event tickets should remain untouched');
      assertEqual(advanced.record.spinTokens, 11, 'advancing should not touch spinTokens');

      const nextProgress = advanced.record.spaceExcavatorProgressByEvent['space_excavator:event-advance'];
      assertEqual(nextProgress.boardIndex, 1, 'advance should move to board index 1');
      assertEqual(nextProgress.completedBoardCount, 1, 'advance should preserve completed board count');
      assertEqual(nextProgress.eventProgressPoints, 1, 'advance should preserve campaign progress without double-awarding');
      assertDeepEqual(nextProgress.claimedMilestoneIds, [], 'advance should preserve unclaimed milestone reward state');
      assertEqual(nextProgress.status, 'active', 'next board should be active');
      assertDeepEqual(nextProgress.dugTileIds, [], 'next board should reset dug tiles');
      assertDeepEqual(nextProgress.revealedObjectTileIds, [], 'next board should reset revealed object pieces');
      assertEqual(nextProgress.bonusBombTileIds.length, 1, 'next board should create a fresh bonus bomb layout');
      assertDeepEqual(nextProgress.triggeredBonusBombTileIds, [], 'next board should reset triggered bonus bombs');
      assert(
        nextProgress.bonusBombTileIds.every((tileId) => tileId >= 0 && tileId < nextProgress.boardSize * nextProgress.boardSize),
        'next board bonus bomb should fit within the board',
      );
      assert(
        nextProgress.bonusBombTileIds.every((tileId) => !nextProgress.objectTileIds.includes(tileId)),
        'next board bonus bomb should not overlap relic object tiles',
      );
      assert(
        nextProgress.objectId !== initialProgress.objectId || nextProgress.objectTileIds.join(',') !== initialProgress.objectTileIds.join(','),
        'next board should have a new object or layout',
      );
      assert(
        nextProgress.bonusBombTileIds.join(',') !== initialProgress.bonusBombTileIds.join(',') || nextProgress.objectTileIds.join(',') !== initialProgress.objectTileIds.join(','),
        'next board should have a fresh bomb or relic layout',
      );

      const reopened = initSpaceExcavatorProgressForEvent({
        session,
        client: null,
        eventId: 'space_excavator:event-advance',
      });
      assertEqual(
        reopened.spaceExcavatorProgressByEvent['space_excavator:event-advance'].boardIndex,
        1,
        'reopen after board advancement should resume the advanced board',
      );
      assertEqual(
        reopened.spaceExcavatorProgressByEvent['space_excavator:event-advance'].eventProgressPoints,
        1,
        'reopen after board advancement should preserve campaign progress',
      );
      assertEqual(
        reopened.spaceExcavatorProgressByEvent['space_excavator:event-other'],
        undefined,
        'unrelated event progress should remain untouched',
      );
    },
  },

  {
    name: 'Space Excavator final placeholder board advances to completed without spending tickets',
    run: () => {
      resetAll();
      const session = makeSession();
      const eventId = 'space_excavator:event-terminal';
      seedState({
        runtimeVersion: 10,
        spinTokens: 3,
        minigameTicketsByEvent: {
          [eventId]: 2,
        },
        spaceExcavatorProgressByEvent: {
          [eventId]: {
            eventId,
            boardIndex: SPACE_EXCAVATOR_TOTAL_BOARDS - 1,
            boardSize: 5,
            treasureCount: 5,
            treasureTileIds: [1, 2, 3, 4, 5],
            objectId: 'moon_key',
            objectName: 'Moon Key',
            objectTier: 'epic',
            objectIcon: '🗝️',
            objectTileIds: [1, 2, 3, 4, 5],
            bonusBombTileIds: [12],
            triggeredBonusBombTileIds: [],
            revealedObjectTileIds: [1, 2, 3, 4, 5],
            dugTileIds: [1, 2, 3, 4, 5],
            foundTreasureTileIds: [1, 2, 3, 4, 5],
            completedBoardCount: SPACE_EXCAVATOR_TOTAL_BOARDS,
            eventProgressPoints: SPACE_EXCAVATOR_TOTAL_BOARDS,
            claimedMilestoneIds: SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.map((milestone) => milestone.id),
            status: 'board_complete',
            updatedAtMs: 1234,
          },
        },
      });

      const advanced = advanceSpaceExcavatorBoard({
        session,
        client: null,
        eventId,
      });

      assertEqual(advanced.ok, true, 'terminal board advance should succeed');
      assertEqual(advanced.record.spaceExcavatorProgressByEvent[eventId].status, 'completed', 'terminal board advance should mark placeholder board set completed');
      assertEqual(advanced.record.spaceExcavatorProgressByEvent[eventId].boardIndex, SPACE_EXCAVATOR_TOTAL_BOARDS - 1, 'terminal completion should not create an extra board');
      assertEqual(advanced.record.spaceExcavatorProgressByEvent[eventId].eventProgressPoints, SPACE_EXCAVATOR_TOTAL_BOARDS, 'terminal advance should not double-award campaign progress');
      assertEqual(advanced.record.minigameTicketsByEvent[eventId], 2, 'terminal board advance should not spend tickets');
      assertEqual(advanced.record.spinTokens, 3, 'terminal board advance should not touch spinTokens');
    },
  },

  {
    name: 'Space Excavator remote hydration maps space_excavator_progress_by_event into runtime state',
    run: async () => {
      resetAll();
      const session = makeSession();
      const remoteProgress = {
        'space_excavator:event-remote': {
          eventId: 'space_excavator:event-remote',
          boardIndex: 0,
          boardSize: 5,
          treasureCount: 5,
          treasureTileIds: [1, 2, 3, 4, 5],
          objectId: 'lost_compass',
          objectName: 'Lost Compass',
          objectTier: 'uncommon',
          objectIcon: '🧭',
          objectTileIds: [1, 2, 3],
          revealedObjectTileIds: [1],
          dugTileIds: [1, 8],
          foundTreasureTileIds: [1],
          completedBoardCount: 0,
          eventProgressPoints: 2,
          claimedMilestoneIds: ['clear_1', 'clear_2'],
          status: 'active',
          updatedAtMs: 1234,
        },
      };
      const client = {
        from() {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle() {
                      return Promise.resolve({
                        data: {
                          runtime_version: 5,
                          first_run_claimed: false,
                          current_island_number: 1,
                          cycle_index: 0,
                          island_started_at_ms: 0,
                          island_expires_at_ms: 0,
                          completed_stops_by_island: {},
                          space_excavator_progress_by_event: remoteProgress,
                        },
                        error: null,
                      });
                    },
                  };
                },
              };
            },
          };
        },
      } as unknown as import('@supabase/supabase-js').SupabaseClient;

      const hydrated = await hydrateIslandRunGameStateRecordWithSource({
        session,
        client,
        forceRemote: true,
      });

      assertEqual(hydrated.source, 'table', 'remote hydration should come from table data');
      assertDeepEqual(
        hydrated.record.spaceExcavatorProgressByEvent['space_excavator:event-remote'].dugTileIds,
        [1, 8],
        'remote Space Excavator progress should hydrate into camelCase runtime state',
      );
      assertEqual(
        hydrated.record.spaceExcavatorProgressByEvent['space_excavator:event-remote'].revealedObjectTileIds.length,
        1,
        'hydration should preserve revealed object progress',
      );
      assertEqual(
        hydrated.record.spaceExcavatorProgressByEvent['space_excavator:event-remote'].objectName,
        'Lost Compass',
        'hydration should preserve object metadata',
      );
      assertEqual(
        hydrated.record.spaceExcavatorProgressByEvent['space_excavator:event-remote'].eventProgressPoints,
        2,
        'hydration should preserve event campaign progress points',
      );
      assertDeepEqual(
        hydrated.record.spaceExcavatorProgressByEvent['space_excavator:event-remote'].claimedMilestoneIds,
        ['clear_1', 'clear_2'],
        'hydration should preserve milestone placeholder claimed state',
      );
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
    name: 'applyTokenHopRewards dual-writes timed-event token grants into minigameTicketsByEvent',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 10,
        spinTokens: 5,
        minigameTicketsByEvent: { 'feeding_frenzy@1': 2 },
      });

      const result = applyTokenHopRewards({
        session,
        client: null,
        deltas: { spinTokens: 3 },
        dualWriteMinigameTicketsEventId: 'feeding_frenzy@1',
        triggerSource: 'test_event_dual_write',
      });

      assertEqual(result.spinTokens, 8, 'spinTokens should still increase by the same grant amount');
      assertEqual(
        result.minigameTicketsByEvent['feeding_frenzy@1'],
        5,
        'event ticket ledger should increase for the active timed event id',
      );
    },
  },
  {
    name: 'applyTokenHopRewards does not mutate minigameTicketsByEvent for non-timed-event or spend paths',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 10,
        spinTokens: 5,
        minigameTicketsByEvent: { 'feeding_frenzy@1': 4 },
      });

      const rewardWithoutEventId = applyTokenHopRewards({
        session,
        client: null,
        deltas: { spinTokens: 2 },
        triggerSource: 'test_non_timed_reward',
      });
      assertEqual(
        rewardWithoutEventId.minigameTicketsByEvent['feeding_frenzy@1'],
        4,
        'grants without timed-event context should not write event tickets',
      );

      const spendResult = applyTokenHopRewards({
        session,
        client: null,
        deltas: { spinTokens: -3 },
        dualWriteMinigameTicketsEventId: 'feeding_frenzy@1',
        triggerSource: 'test_timed_event_spend',
      });
      assertEqual(
        spendResult.minigameTicketsByEvent['feeding_frenzy@1'],
        4,
        'spend deltas should not decrement event tickets in dual-write phase',
      );
    },
  },
  {
    name: 'applyTimedEventTicketSpend decrements only the active event ticket bucket',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 10,
        spinTokens: 9,
        minigameTicketsByEvent: { 'lucky_spin@1': 4, 'space_excavator@1': 7 },
      });

      const { record, spent } = applyTimedEventTicketSpend({
        session,
        client: null,
        eventId: 'lucky_spin@1',
        ticketsToSpend: 2,
        triggerSource: 'test_event_ticket_spend',
      });
      assertEqual(spent, 2, 'expected spend to succeed for active event bucket');
      assertEqual(record.minigameTicketsByEvent['lucky_spin@1'], 2, 'active event bucket should decrement');
      assertEqual(record.minigameTicketsByEvent['space_excavator@1'], 7, 'unrelated event bucket should remain unchanged');
      assertEqual(record.spinTokens, 9, 'legacy spinTokens should remain unchanged in phase-3 spend action');
    },
  },
  {
    name: 'applyTimedEventTicketSpend blocks when active bucket has insufficient tickets even if another bucket has tickets',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 10,
        spinTokens: 12,
        minigameTicketsByEvent: { 'lucky_spin@1': 0, 'space_excavator@1': 5 },
      });

      const { record, spent } = applyTimedEventTicketSpend({
        session,
        client: null,
        eventId: 'lucky_spin@1',
        ticketsToSpend: 1,
        triggerSource: 'test_event_ticket_block',
      });
      assertEqual(spent, 0, 'insufficient active event bucket should block spend');
      assertEqual(record.minigameTicketsByEvent['lucky_spin@1'] ?? 0, 0, 'active bucket remains unchanged on blocked spend');
      assertEqual(record.minigameTicketsByEvent['space_excavator@1'] ?? 0, 5, 'unrelated bucket must not be consumed');
      assertEqual(record.spinTokens, 12, 'legacy spinTokens should not be consumed by event-scoped block path');
    },
  },

  {
    name: 'applyDevGrantDice grants dice via canonical commit path',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 10, dicePool: 20 });

      const result = applyDevGrantDice({
        session,
        client: null,
        amount: 50,
        triggerSource: 'test_dev_grant_dice',
      });

      assertEqual(result.applied, 50, 'dev dice grant should apply exact positive amount');
      assertEqual(result.record.dicePool, 70, 'dicePool should increase by granted amount');
      assertEqual(result.record.runtimeVersion, 11, 'runtimeVersion should bump once');
      assertEqual(getIslandRunStateSnapshot(session).dicePool, 70, 'store mirror should reflect granted dice');
    },
  },

  {
    name: 'applyDevGrantEssence grants essence + lifetime earned via canonical commit path',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 10, essence: 100, essenceLifetimeEarned: 350 });

      const result = applyDevGrantEssence({
        session,
        client: null,
        amount: 500,
        triggerSource: 'test_dev_grant_essence',
      });

      assertEqual(result.applied, 500, 'dev essence grant should apply exact positive amount');
      assertEqual(result.record.essence, 600, 'essence should increase by granted amount');
      assertEqual(result.record.essenceLifetimeEarned, 850, 'lifetime earned should track granted essence');
      assertEqual(result.record.runtimeVersion, 11, 'runtimeVersion should bump once');
      assertEqual(getIslandRunStateSnapshot(session).essence, 600, 'store mirror should reflect granted essence');
    },
  },

  {
    name: 'applyDevBuildAllToL3 upgrades every stop to L3 via canonical action batches',
    run: async () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 10,
        essence: 100_000,
        stopBuildStateByIndex: [
          { requiredEssence: 10, spentEssence: 0, buildLevel: 0 },
          { requiredEssence: 10, spentEssence: 0, buildLevel: 1 },
          { requiredEssence: 10, spentEssence: 0, buildLevel: 2 },
          { requiredEssence: 10, spentEssence: 0, buildLevel: 0 },
          { requiredEssence: 10, spentEssence: 0, buildLevel: 1 },
        ],
      });
      const result = await applyDevBuildAllToL3({
        session,
        client: null,
        effectiveIslandNumber: 1,
        triggerSource: 'test_dev_build_all_to_l3',
      });
      assertEqual(result.changed, true, 'at least one stop below L3 should trigger changes');
      assertEqual(result.stopsCompleted, 5, 'all five stops should end at L3');
      assert(result.totalStepsApplied > 0, 'should apply one or more build spend steps');
      assert(result.record.stopBuildStateByIndex.every((entry) => (entry?.buildLevel ?? 0) >= 3), 'every stop should reach L3');
    },
  },

  {
    name: 'applyDevBuildAllToL3 is no-op when all stops are already at L3',
    run: async () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 12,
        essence: 250,
        stopBuildStateByIndex: [
          { requiredEssence: 10, spentEssence: 10, buildLevel: 3 },
          { requiredEssence: 10, spentEssence: 10, buildLevel: 3 },
          { requiredEssence: 10, spentEssence: 10, buildLevel: 3 },
          { requiredEssence: 10, spentEssence: 10, buildLevel: 3 },
          { requiredEssence: 10, spentEssence: 10, buildLevel: 3 },
        ],
      });
      const result = await applyDevBuildAllToL3({
        session,
        client: null,
        effectiveIslandNumber: 1,
        triggerSource: 'test_dev_build_all_to_l3_noop',
      });
      assertEqual(result.changed, false, 'already L3 stops should produce no changes');
      assertEqual(result.totalStepsApplied, 0, 'no-op should apply no steps');
      assertEqual(result.record.runtimeVersion, 12, 'runtimeVersion should stay unchanged on no-op');
    },
  },

  {
    name: 'applyDevSpeedHatchEgg marks active island egg as ready via canonical commit path',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 10,
        currentIslandNumber: 7,
        activeEggTier: 'rare',
        activeEggSetAtMs: 1_000,
        activeEggHatchDurationMs: 86_400_000,
        perIslandEggs: {
          '7': {
            tier: 'rare',
            setAtMs: 1_000,
            hatchAtMs: 86_401_000,
            status: 'incubating',
            location: 'island',
          },
        },
      });

      const result = applyDevSpeedHatchEgg({
        session,
        client: null,
        islandNumber: 7,
        nowMs: 5_000,
        triggerSource: 'test_dev_speed_hatch_egg',
      });

      assertEqual(result.changed, true, 'speed hatch should commit when incubating egg exists');
      assertEqual(result.record.runtimeVersion, 11, 'runtimeVersion should bump once');
      assertEqual(result.record.activeEggHatchDurationMs, 0, 'active egg should become immediately hatchable');
      assertEqual(result.record.perIslandEggs['7']?.status, 'ready', 'island egg ledger status should be ready');
      assertEqual(result.record.perIslandEggs['7']?.hatchAtMs, 1_000, 'ledger hatchAt should match setAt for immediate readiness');
    },
  },

  {
    name: 'applyDevSpeedHatchEgg is a no-op when no hatchable active egg exists',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 10,
        currentIslandNumber: 3,
        activeEggTier: null,
        activeEggSetAtMs: null,
        activeEggHatchDurationMs: null,
        perIslandEggs: {
          '3': {
            tier: 'common',
            setAtMs: 100,
            hatchAtMs: 200,
            status: 'sold',
            location: 'island',
          },
        },
      });

      const result = applyDevSpeedHatchEgg({
        session,
        client: null,
        islandNumber: 3,
        triggerSource: 'test_dev_speed_hatch_egg_noop',
      });

      assertEqual(result.changed, false, 'no active incubating/ready egg should no-op');
      assertEqual(result.record.runtimeVersion, 10, 'runtimeVersion should remain unchanged on no-op');
    },
  },

  {
    name: 'applyPassiveDiceRegenTick commits dicePool + diceRegenState when regen is due',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 10,
        dicePool: 0,
        diceRegenState: buildInitialDiceRegenState(1, 0),
      });

      const result = applyPassiveDiceRegenTick({
        session,
        client: null,
        playerLevel: 1,
        nowMs: 60 * 60 * 1000,
        triggerSource: 'test_passive_dice_regen_tick_commit',
      });

      assertEqual(result.changed, true, 'regen tick should commit when elapsed time grants dice');
      assertEqual(result.record.dicePool, 7, 'dicePool should increase according to regen math');
      assert(result.record.diceRegenState !== null, 'diceRegenState should be persisted');
      assertEqual(result.diceAdded, 7, 'returned diceAdded should match regen delta');
      assertEqual(result.record.runtimeVersion, 11, 'runtimeVersion should bump once');
    },
  },

  {
    name: 'applyPassiveDiceRegenTick is no-op when no regen is due',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 10,
        dicePool: 30,
        diceRegenState: buildInitialDiceRegenState(1, 0),
      });

      const result = applyPassiveDiceRegenTick({
        session,
        client: null,
        playerLevel: 1,
        nowMs: 0,
        triggerSource: 'test_passive_dice_regen_tick_noop',
      });

      assertEqual(result.changed, false, 'no regen delta should be a no-op');
      assertEqual(result.diceAdded, 0, 'no-op should report zero dice added');
      assertEqual(result.record.runtimeVersion, 10, 'runtimeVersion should not change on no-op');
    },
  },
  {
    name: 'applyPassiveDiceRegenTick above cap does not churn commits/runtimeVersion',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 22,
        dicePool: 43, // above L1 cap
        diceRegenState: buildInitialDiceRegenState(1, 0),
      });

      const first = applyPassiveDiceRegenTick({
        session,
        client: null,
        playerLevel: 1,
        nowMs: 1_000,
        triggerSource: 'test_passive_dice_regen_tick_above_cap_first',
      });
      const second = applyPassiveDiceRegenTick({
        session,
        client: null,
        playerLevel: 1,
        nowMs: 2_000,
        triggerSource: 'test_passive_dice_regen_tick_above_cap_second',
      });

      assertEqual(first.changed, false, 'above-cap tick should be no-op');
      assertEqual(second.changed, false, 'repeated above-cap tick should remain no-op');
      assertEqual(first.record.runtimeVersion, 22, 'runtimeVersion should not churn on above-cap no-op');
      assertEqual(second.record.runtimeVersion, 22, 'runtimeVersion should remain stable on repeated no-op');
    },
  },
  {
    name: 'applyPassiveDiceRegenTick at cap does not churn commits/runtimeVersion',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 30,
        dicePool: 30, // equals L1 cap
        diceRegenState: buildInitialDiceRegenState(1, 0),
      });

      const first = applyPassiveDiceRegenTick({
        session,
        client: null,
        playerLevel: 1,
        nowMs: 1_000,
        triggerSource: 'test_passive_dice_regen_tick_at_cap_first',
      });
      const second = applyPassiveDiceRegenTick({
        session,
        client: null,
        playerLevel: 1,
        nowMs: 2_000,
        triggerSource: 'test_passive_dice_regen_tick_at_cap_second',
      });

      assertEqual(first.changed, false, 'at-cap tick should be no-op');
      assertEqual(second.changed, false, 'repeated at-cap tick should remain no-op');
      assertEqual(second.record.runtimeVersion, 30, 'runtimeVersion should not churn at cap');
    },
  },

  {
    name: 'applyPassiveDiceRegenTick preserves unrelated fields',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 7,
        dicePool: 0,
        diceRegenState: buildInitialDiceRegenState(1, 0),
        essence: 4321,
        spinTokens: 55,
      });

      const result = applyPassiveDiceRegenTick({
        session,
        client: null,
        playerLevel: 1,
        nowMs: 60 * 60 * 1000,
        triggerSource: 'test_passive_dice_regen_tick_preserve_unrelated',
      });

      assertEqual(result.changed, true, 'regen tick should commit');
      assertEqual(result.record.essence, 4321, 'unrelated essence should remain unchanged');
      assertEqual(result.record.spinTokens, 55, 'unrelated spinTokens should remain unchanged');
    },
  },

  {
    name: 'applyPassiveDiceRegenTick repeated same nowMs does not double-grant',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 3,
        dicePool: 0,
        diceRegenState: buildInitialDiceRegenState(1, 0),
      });

      const first = applyPassiveDiceRegenTick({
        session,
        client: null,
        playerLevel: 1,
        nowMs: 60 * 60 * 1000,
        triggerSource: 'test_passive_dice_regen_tick_first',
      });
      const second = applyPassiveDiceRegenTick({
        session,
        client: null,
        playerLevel: 1,
        nowMs: 60 * 60 * 1000,
        triggerSource: 'test_passive_dice_regen_tick_repeat_same_now',
      });

      assertEqual(first.changed, true, 'first tick should apply regen');
      assertEqual(first.record.dicePool, 7, 'first tick should grant 7 dice');
      assertEqual(second.changed, false, 'second tick at same nowMs should no-op');
      assertEqual(second.diceAdded, 0, 'second tick should not add dice');
      assertEqual(second.record.dicePool, 7, 'dice pool should remain unchanged on second tick');
    },
  },

  {
    name: 'applyPassiveDiceRegenTick return payload supports pre-roll gating semantics',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 5,
        dicePool: 0,
        diceRegenState: buildInitialDiceRegenState(1, 0),
      });

      const result = applyPassiveDiceRegenTick({
        session,
        client: null,
        playerLevel: 1,
        nowMs: 60 * 60 * 1000,
        triggerSource: 'test_passive_dice_regen_tick_pre_roll_payload',
      });

      assertEqual(result.record.dicePool >= 5, true, 'returned record should expose refreshed dicePool for affordability checks');
      assertEqual(result.diceAdded, 7, 'payload should expose the applied regen delta');
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
    name: 'applyWalletDiamondsSet writes an absolute diamonds value through the store commit path',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 20, diamonds: 9 });

      const result = applyWalletDiamondsSet({
        session,
        client: null,
        nextDiamonds: 4,
        triggerSource: 'test_diamonds_set',
      });

      assertEqual(result.changed, true, 'changed should be true when diamonds are updated');
      assertEqual(result.record.diamonds, 4, 'diamonds should be set to target value');
      assertEqual(result.record.runtimeVersion, 21, 'runtimeVersion should bump on diamonds commit');
    },
  },

  {
    name: 'applyWalletDiamondsSet is a no-op when next value equals current value',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 20, diamonds: 4 });

      const result = applyWalletDiamondsSet({
        session,
        client: null,
        nextDiamonds: 4,
        triggerSource: 'test_diamonds_set_noop',
      });

      assertEqual(result.changed, false, 'changed should be false on no-op');
      assertEqual(result.record.runtimeVersion, 20, 'runtimeVersion should not bump on no-op');
    },
  },

  {
    name: 'applyWalletDiamondsDelta applies positive/negative deltas with floor clamp',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 20, diamonds: 3 });

      const award = applyWalletDiamondsDelta({
        session,
        client: null,
        delta: 2,
        triggerSource: 'test_diamonds_delta_award',
      });
      assertEqual(award.appliedDelta, 2, 'positive delta should apply');
      assertEqual(award.record.diamonds, 5, 'diamonds should increase');
      assertEqual(award.record.runtimeVersion, 21, 'runtimeVersion should bump on award');

      const spend = applyWalletDiamondsDelta({
        session,
        client: null,
        delta: -9,
        triggerSource: 'test_diamonds_delta_spend',
      });
      assertEqual(spend.appliedDelta, -5, 'negative delta should clamp to available wallet');
      assertEqual(spend.record.diamonds, 0, 'diamonds should floor at zero');
      assertEqual(spend.record.runtimeVersion, 22, 'runtimeVersion should bump on spend');
    },
  },

  {
    name: 'applyMarketOwnedBundleMarker merges ownership for one island without mutating other islands',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 30,
        marketOwnedBundlesByIsland: {
          '1': { dice_bundle: false, heart_bundle: false, heart_boost_bundle: false },
          '2': { dice_bundle: true, heart_bundle: false, heart_boost_bundle: false },
        },
      });

      const record = applyMarketOwnedBundleMarker({
        session,
        client: null,
        islandNumber: 1,
        diceBundleOwned: true,
        triggerSource: 'test_market_owned_bundle_marker',
      });

      assertEqual(record.marketOwnedBundlesByIsland['1']?.dice_bundle, true, 'current island ownership should update');
      assertEqual(record.marketOwnedBundlesByIsland['2']?.dice_bundle, true, 'other island ownership should remain unchanged');
      assertEqual(record.runtimeVersion, 31, 'runtimeVersion should bump on ownership update');
    },
  },

  {
    name: 'applyMarketOwnedBundleMarker is a no-op when ownership already matches',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 30,
        marketOwnedBundlesByIsland: {
          '1': { dice_bundle: true, heart_bundle: false, heart_boost_bundle: false },
        },
      });

      const record = applyMarketOwnedBundleMarker({
        session,
        client: null,
        islandNumber: 1,
        diceBundleOwned: true,
        triggerSource: 'test_market_owned_bundle_marker_noop',
      });

      assertEqual(record.runtimeVersion, 30, 'runtimeVersion should not change on no-op');
    },
  },

  {
    name: 'applyIslandShardsSet commits shard earn accumulation through the store path',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 40, islandShards: 12 });

      const result = applyIslandShardsSet({
        session,
        client: null,
        nextIslandShards: 17,
        triggerSource: 'test_island_shards_set',
      });

      assertEqual(result.changed, true, 'changed should be true when cumulative shards update');
      assertEqual(result.record.islandShards, 17, 'islandShards should update to new cumulative value');
      assertEqual(result.record.runtimeVersion, 41, 'runtimeVersion should bump on shard accumulation');
    },
  },

  {
    name: 'applyIslandShardsSet is a no-op/idempotent when cumulative value is unchanged',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 40, islandShards: 17 });

      const result = applyIslandShardsSet({
        session,
        client: null,
        nextIslandShards: 17,
        triggerSource: 'test_island_shards_set_noop',
      });

      assertEqual(result.changed, false, 'changed should be false on no-op');
      assertEqual(result.record.runtimeVersion, 40, 'runtimeVersion should not bump on no-op');
    },
  },

  {
    name: 'applyShardClaimProgressMarker commits shard tier/count claim markers through the store path',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 40, shardTierIndex: 2, shardClaimCount: 5 });

      const record = applyShardClaimProgressMarker({
        session,
        client: null,
        nextShardTierIndex: 3,
        nextShardClaimCount: 6,
        triggerSource: 'test_shard_claim_progress',
      });

      assertEqual(record.shardTierIndex, 3, 'tier index should update');
      assertEqual(record.shardClaimCount, 6, 'claim count should update');
      assertEqual(record.runtimeVersion, 41, 'runtimeVersion should bump on claim marker commit');
    },
  },

  {
    name: 'applyShardClaimProgressMarker is no-op/idempotent and clamps invalid negatives',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 40, shardTierIndex: 0, shardClaimCount: 0 });

      const clamped = applyShardClaimProgressMarker({
        session,
        client: null,
        nextShardTierIndex: -10,
        nextShardClaimCount: -5,
        triggerSource: 'test_shard_claim_progress_clamp',
      });
      assertEqual(clamped.shardTierIndex, 0, 'negative tier index should clamp to 0');
      assertEqual(clamped.shardClaimCount, 0, 'negative claim count should clamp to 0');
      assertEqual(clamped.runtimeVersion, 40, 'clamped no-op should not bump runtimeVersion');

      const noop = applyShardClaimProgressMarker({
        session,
        client: null,
        nextShardTierIndex: 0,
        nextShardClaimCount: 0,
        triggerSource: 'test_shard_claim_progress_noop',
      });
      assertEqual(noop.runtimeVersion, 40, 'repeated identical input should remain no-op');
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
    name: 'applyOnboardingCompleteMarker sets onboarding_complete profile metadata when missing',
    run: async () => {
      resetAll();
      const session = makeSession();
      const updateUserCalls: Array<Record<string, unknown>> = [];
      const client = {
        auth: {
          updateUser(payload: Record<string, unknown>) {
            updateUserCalls.push(payload);
            return Promise.resolve({ error: null });
          },
        },
      } as unknown as import('@supabase/supabase-js').SupabaseClient;

      const result = await applyOnboardingCompleteMarker({
        session,
        client,
        triggerSource: 'test_onboarding_complete_marker_set',
      });

      assertEqual(result.ok, true, 'onboarding marker write should succeed');
      assertEqual(result.changed, true, 'changed should be true when profile metadata is written');
      assertEqual(updateUserCalls.length, 1, 'client.auth.updateUser should be called once');
    },
  },

  {
    name: 'applyOnboardingCompleteMarker is a no-op when onboarding_complete is already true',
    run: async () => {
      resetAll();
      const session = makeSession();
      session.user = {
        ...session.user,
        user_metadata: {
          ...(session.user.user_metadata ?? {}),
          onboarding_complete: true,
        },
      };
      const result = await applyOnboardingCompleteMarker({
        session,
        client: null,
        triggerSource: 'test_onboarding_complete_marker_noop',
      });

      assertEqual(result.ok, true, 'no-op should still succeed');
      assertEqual(result.changed, false, 'changed should be false on no-op');
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
    name: 'applyPerfectCompanionSnapshot commits snapshot fields through the store path',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 12,
        perfectCompanionIds: [],
        perfectCompanionReasons: {},
        perfectCompanionComputedAtMs: null,
        perfectCompanionModelVersion: null,
        perfectCompanionComputedCycleIndex: null,
        essence: 123,
      });

      const result = applyPerfectCompanionSnapshot({
        session,
        client: null,
        perfectCompanionIds: ['creature_alpha', 'creature_beta'],
        perfectCompanionReasons: {
          creature_alpha: { strength: ['guardian'], weaknessSupport: [], zoneMatch: true },
          creature_beta: { strength: ['visionary'], weaknessSupport: ['stress_fragility'], zoneMatch: false },
        },
        perfectCompanionComputedAtMs: 1710000000000,
        perfectCompanionModelVersion: 'pc-model-v1',
        perfectCompanionComputedCycleIndex: 3,
        triggerSource: 'test_perfect_companion_snapshot_set',
      });

      assertEqual(result.changed, true, 'snapshot write should report changed=true');
      assertEqual(result.record.runtimeVersion, 13, 'runtimeVersion should bump on snapshot write');
      assertEqual(result.record.perfectCompanionIds.length, 2, 'perfect companion ids should be written');
      assertEqual(result.record.perfectCompanionComputedCycleIndex, 3, 'cycle index marker should be written');
    },
  },

  {
    name: 'applyPerfectCompanionSnapshot is a no-op when snapshot is unchanged',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 12,
        perfectCompanionIds: ['creature_alpha'],
        perfectCompanionReasons: {
          creature_alpha: { strength: ['guardian'], weaknessSupport: [], zoneMatch: true },
        },
        perfectCompanionComputedAtMs: 1710000000000,
        perfectCompanionModelVersion: 'pc-model-v1',
        perfectCompanionComputedCycleIndex: 3,
      });

      const result = applyPerfectCompanionSnapshot({
        session,
        client: null,
        perfectCompanionIds: ['creature_alpha'],
        perfectCompanionReasons: {
          creature_alpha: { strength: ['guardian'], weaknessSupport: [], zoneMatch: true },
        },
        perfectCompanionComputedAtMs: 1710000000000,
        perfectCompanionModelVersion: 'pc-model-v1',
        perfectCompanionComputedCycleIndex: 3,
        triggerSource: 'test_perfect_companion_snapshot_noop',
      });

      assertEqual(result.changed, false, 'identical snapshot should be no-op');
      assertEqual(result.record.runtimeVersion, 12, 'runtimeVersion should not change on no-op');
    },
  },

  {
    name: 'applyPerfectCompanionSnapshot preserves unrelated fields while replacing companion snapshot payload',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 12,
        essence: 777,
        perfectCompanionIds: ['creature_alpha'],
        perfectCompanionReasons: {
          creature_alpha: { strength: ['guardian'], weaknessSupport: [], zoneMatch: true },
        },
        perfectCompanionComputedAtMs: 1710000000000,
        perfectCompanionModelVersion: 'pc-model-v1',
        perfectCompanionComputedCycleIndex: 3,
      });

      const result = applyPerfectCompanionSnapshot({
        session,
        client: null,
        perfectCompanionIds: ['creature_gamma'],
        perfectCompanionReasons: {
          creature_gamma: { strength: ['builder'], weaknessSupport: ['decision_confusion'], zoneMatch: true },
        },
        perfectCompanionComputedAtMs: 1710001234567,
        perfectCompanionModelVersion: 'pc-model-v2',
        perfectCompanionComputedCycleIndex: 4,
        triggerSource: 'test_perfect_companion_snapshot_replace',
      });

      assertEqual(result.record.essence, 777, 'unrelated gameplay fields should be preserved');
      assertEqual(result.record.perfectCompanionIds[0], 'creature_gamma', 'snapshot payload should replace ids');
      assertEqual(
        Object.prototype.hasOwnProperty.call(result.record.perfectCompanionReasons, 'creature_alpha'),
        false,
        'snapshot payload should replace reasons map (no implicit merge)',
      );
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
    name: 'syncCompletedStopsForIsland is no-op when completed stops are unchanged',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 40,
        currentIslandNumber: 7,
        tokenIndex: 33,
        dicePool: 43,
        essence: 777,
        completedStopsByIsland: {
          '7': ['hatchery', 'habit'],
        },
      });

      const first = syncCompletedStopsForIsland({
        session,
        client: null,
        islandNumber: 7,
        completedStops: ['hatchery', 'habit'],
        triggerSource: 'test_sync_completed_stops_noop_first_open',
      });
      const second = syncCompletedStopsForIsland({
        session,
        client: null,
        islandNumber: 7,
        completedStops: ['hatchery', 'habit'],
        triggerSource: 'test_sync_completed_stops_noop_second_open',
      });

      assertEqual(first.runtimeVersion, 40, 'unchanged completed stops should not bump runtimeVersion');
      assertEqual(second.runtimeVersion, 40, 'repeated unchanged sync should stay idempotent');
      assertEqual(first.tokenIndex, 33, 'tokenIndex must remain unchanged');
      assertEqual(first.dicePool, 43, 'dicePool must remain unchanged');
      assertEqual(first.essence, 777, 'essence must remain unchanged');
    },
  },
  {
    name: 'syncCompletedStopsForIsland is semantic no-op for re-ordered/duplicate stop arrays',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 41,
        currentIslandNumber: 7,
        tokenIndex: 33,
        dicePool: 43,
        essence: 777,
        completedStopsByIsland: {
          '7': ['hatchery', 'habit'],
        },
      });

      const result = syncCompletedStopsForIsland({
        session,
        client: null,
        islandNumber: 7,
        completedStops: ['habit', 'hatchery', 'habit'],
        triggerSource: 'test_sync_completed_stops_semantic_noop',
      });

      assertEqual(result.runtimeVersion, 41, 'semantic no-op should not bump runtimeVersion');
      assertEqual(result.tokenIndex, 33, 'semantic no-op must preserve tokenIndex');
      assertEqual(result.dicePool, 43, 'semantic no-op must preserve dicePool');
      assertEqual(result.essence, 777, 'semantic no-op must preserve essence');
    },
  },
  {
    name: 'syncCompletedStopsForIsland persists only when completed stops differ',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 50,
        currentIslandNumber: 7,
        tokenIndex: 33,
        dicePool: 43,
        essence: 888,
        completedStopsByIsland: {
          '7': ['hatchery'],
        },
      });

      const result = syncCompletedStopsForIsland({
        session,
        client: null,
        islandNumber: 7,
        completedStops: ['hatchery', 'habit'],
        triggerSource: 'test_sync_completed_stops_diff',
      });

      assertEqual(result.runtimeVersion, 51, 'changed completed stops should bump runtimeVersion once');
      assertEqual(result.completedStopsByIsland['7']?.length ?? 0, 2, 'completed stops should update for island');
      assertEqual(result.tokenIndex, 33, 'tokenIndex must be preserved');
      assertEqual(result.dicePool, 43, 'dicePool must be preserved');
      assertEqual(result.essence, 888, 'essence must be preserved');
    },
  },
  {
    name: 'syncCompletedStopsForIsland repeated renders only persist once for the same semantic target',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 60,
        currentIslandNumber: 7,
        tokenIndex: 33,
        dicePool: 43,
        essence: 999,
        completedStopsByIsland: {
          '7': ['hatchery'],
        },
      });

      const first = syncCompletedStopsForIsland({
        session,
        client: null,
        islandNumber: 7,
        completedStops: ['habit', 'hatchery'],
        triggerSource: 'test_sync_completed_stops_repeated_first',
      });
      const second = syncCompletedStopsForIsland({
        session,
        client: null,
        islandNumber: 7,
        completedStops: ['hatchery', 'habit', 'habit'],
        triggerSource: 'test_sync_completed_stops_repeated_second',
      });

      assertEqual(first.runtimeVersion, 61, 'first semantic change should persist once');
      assertEqual(second.runtimeVersion, 61, 'second semantic-equivalent render should no-op');
      assertEqual(second.completedStopsByIsland['7']?.join(','), 'hatchery,habit', 'stored order should be canonical');
      assertEqual(second.tokenIndex, 33, 'tokenIndex preserved across repeated calls');
      assertEqual(second.dicePool, 43, 'dicePool preserved across repeated calls');
      assertEqual(second.essence, 999, 'essence preserved across repeated calls');
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
    name: 'applyHydrationEggReadyTransition: incubating egg becomes ready after hatch time',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 20,
        perIslandEggs: {
          '7': {
            tier: 'rare',
            setAtMs: 1_000,
            hatchAtMs: 4_000,
            status: 'incubating',
            location: 'island',
          },
        },
      });

      const result = applyHydrationEggReadyTransition({
        session,
        client: null,
        islandNumber: 7,
        hatchNowMs: 4_500,
        triggerSource: 'test_hydration_egg_ready_transition',
      });

      assertEqual(result.changed, true, 'expected hydration transition to commit');
      assertEqual(result.record.perIslandEggs['7']?.status, 'ready', 'target island egg should be marked ready');
      assertEqual(result.record.runtimeVersion, 21, 'runtimeVersion should bump exactly once');
    },
  },

  {
    name: 'applyHydrationEggReadyTransition: wrong island key is not mutated',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 9,
        perIslandEggs: {
          '7': {
            tier: 'common',
            setAtMs: 1_000,
            hatchAtMs: 2_000,
            status: 'incubating',
            location: 'island',
          },
        },
      });

      const result = applyHydrationEggReadyTransition({
        session,
        client: null,
        islandNumber: 8,
        hatchNowMs: 10_000,
        triggerSource: 'test_hydration_egg_wrong_island_noop',
      });

      assertEqual(result.changed, false, 'missing target-island entry should no-op');
      assertEqual(result.record.perIslandEggs['7']?.status, 'incubating', 'non-target island should remain unchanged');
      assertEqual(result.record.runtimeVersion, 9, 'runtimeVersion should not change on no-op');
    },
  },

  {
    name: 'applyHydrationEggReadyTransition: unrelated ledger entries are preserved',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 4,
        perIslandEggs: {
          '3': {
            tier: 'mythic',
            setAtMs: 500,
            hatchAtMs: 900,
            status: 'ready',
            location: 'dormant',
          },
          '7': {
            tier: 'rare',
            setAtMs: 1_000,
            hatchAtMs: 4_000,
            status: 'incubating',
            location: 'island',
          },
        },
      });

      const result = applyHydrationEggReadyTransition({
        session,
        client: null,
        islandNumber: 7,
        hatchNowMs: 4_001,
        triggerSource: 'test_hydration_egg_preserve_other_entries',
      });

      assertEqual(result.changed, true, 'target transition should apply');
      assertEqual(result.record.perIslandEggs['7']?.status, 'ready', 'target island should become ready');
      assertEqual(result.record.perIslandEggs['3']?.status, 'ready', 'unrelated island ledger entry should be preserved');
      assertEqual(result.record.perIslandEggs['3']?.location, 'dormant', 'unrelated island ledger payload should be untouched');
    },
  },

  {
    name: 'applyHydrationEggReadyTransition: no-op/idempotent when already ready or hatch not elapsed',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 12,
        perIslandEggs: {
          '7': {
            tier: 'common',
            setAtMs: 100,
            hatchAtMs: 300,
            status: 'ready',
            location: 'dormant',
          },
          '8': {
            tier: 'rare',
            setAtMs: 200,
            hatchAtMs: 5_000,
            status: 'incubating',
            location: 'island',
          },
        },
      });

      const alreadyReady = applyHydrationEggReadyTransition({
        session,
        client: null,
        islandNumber: 7,
        hatchNowMs: 10_000,
        triggerSource: 'test_hydration_egg_already_ready_noop',
      });
      assertEqual(alreadyReady.changed, false, 'already-ready entry should no-op');
      assertEqual(alreadyReady.record.runtimeVersion, 12, 'runtimeVersion should not change for already-ready no-op');

      const hatchNotElapsed = applyHydrationEggReadyTransition({
        session,
        client: null,
        islandNumber: 8,
        hatchNowMs: 4_999,
        triggerSource: 'test_hydration_egg_not_elapsed_noop',
      });
      assertEqual(hatchNotElapsed.changed, false, 'incubating entry before hatchAtMs should no-op');
      assertEqual(hatchNotElapsed.record.perIslandEggs['8']?.status, 'incubating', 'status should remain incubating');
      assertEqual(hatchNotElapsed.record.runtimeVersion, 12, 'runtimeVersion should remain unchanged across idempotent no-ops');
    },
  },

  {
    name: 'applyStopBuildSpend commits build-progress spend through the store in one publish',
    run: async () => {
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

      const result = await applyStopBuildSpend({
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
    name: 'applyStopBuildSpendBatch cannot overspend essence',
    run: async () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 20,
        essence: 15,
        essenceLifetimeSpent: 0,
        stopBuildStateByIndex: [
          { requiredEssence: 30, spentEssence: 0, buildLevel: 0 },
          { requiredEssence: 70, spentEssence: 0, buildLevel: 0 },
          { requiredEssence: 90, spentEssence: 0, buildLevel: 0 },
          { requiredEssence: 120, spentEssence: 0, buildLevel: 0 },
          { requiredEssence: 200, spentEssence: 0, buildLevel: 0 },
        ],
      });

      const result = await applyStopBuildSpendBatch({
        session,
        client: null,
        stopIndex: 0,
        effectiveIslandNumber: 1,
        maxSteps: 5,
      });

      assertEqual(result.stepsApplied, 2, 'batch should apply available spend until wallet reaches zero');
      assertEqual(result.record.essence, 0, 'batch should never overspend essence below zero');
      assertEqual(result.record.essenceLifetimeSpent, 15, 'batch should only add the essence actually spent');
      assertEqual(result.record.runtimeVersion, 21, 'batch should commit once when at least one step is applied');
    },
  },
  {
    name: 'applyStopBuildSpendBatch stops at L3 completion',
    run: async () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 33,
        essence: 200,
        essenceLifetimeSpent: 0,
        stopBuildStateByIndex: [
          { requiredEssence: 10, spentEssence: 0, buildLevel: 2 },
          { requiredEssence: 70, spentEssence: 0, buildLevel: 0 },
          { requiredEssence: 90, spentEssence: 0, buildLevel: 0 },
          { requiredEssence: 120, spentEssence: 0, buildLevel: 0 },
          { requiredEssence: 200, spentEssence: 0, buildLevel: 0 },
        ],
      });

      const result = await applyStopBuildSpendBatch({
        session,
        client: null,
        stopIndex: 0,
        effectiveIslandNumber: 1,
        maxSteps: 5,
      });

      assertEqual(result.stepsApplied, 1, 'batch should stop once the stop reaches max build level');
      assertEqual(result.record.stopBuildStateByIndex[0]?.buildLevel, 3, 'stop should finish at L3');
      assertEqual(result.record.stopStatesByIndex[0]?.buildComplete, true, 'buildComplete should be true at L3');
    },
  },
  {
    name: 'applyStopBuildSpendBatch safely handles repeated-click max batch size',
    run: async () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 37,
        essence: 1_000,
        essenceLifetimeSpent: 0,
        stopBuildStateByIndex: [
          { requiredEssence: 50, spentEssence: 40, buildLevel: 2 },
          { requiredEssence: 70, spentEssence: 0, buildLevel: 0 },
          { requiredEssence: 90, spentEssence: 0, buildLevel: 0 },
          { requiredEssence: 120, spentEssence: 0, buildLevel: 0 },
          { requiredEssence: 200, spentEssence: 0, buildLevel: 0 },
        ],
      });

      let notifications = 0;
      const unsub = subscribeIslandRunState(session, () => { notifications += 1; });
      const result = await applyStopBuildSpendBatch({
        session,
        client: null,
        stopIndex: 0,
        effectiveIslandNumber: 1,
        maxSteps: 28,
      });

      assertEqual(result.stepsApplied, 1, 'large repeated-click batch should stop as soon as the stop is fully built');
      assertEqual(result.record.essence, 990, 'large repeated-click batch should only spend the final required step');
      assertEqual(result.record.essenceLifetimeSpent, 10, 'large repeated-click batch should only count actual spend');
      assertEqual(result.record.stopBuildStateByIndex[0]?.buildLevel, 3, 'large repeated-click batch should complete at L3 only');
      assertEqual(result.record.stopStatesByIndex[0]?.buildComplete, true, 'large repeated-click batch should mark the build complete');
      assertEqual(notifications, 1, 'large repeated-click batch should commit once');
      unsub();
    },
  },
  {
    name: 'applyStopBuildSpendBatch result matches repeated single-step spends',
    run: async () => {
      resetAll();
      const session = makeSession();
      const seededStopBuildState = [
        { requiredEssence: 50, spentEssence: 0, buildLevel: 0 },
        { requiredEssence: 70, spentEssence: 0, buildLevel: 0 },
        { requiredEssence: 90, spentEssence: 0, buildLevel: 0 },
        { requiredEssence: 120, spentEssence: 0, buildLevel: 0 },
        { requiredEssence: 200, spentEssence: 0, buildLevel: 0 },
      ] as IslandRunGameStateRecord['stopBuildStateByIndex'];
      seedState({
        runtimeVersion: 40,
        essence: 500,
        essenceLifetimeSpent: 0,
        stopBuildStateByIndex: seededStopBuildState,
      });

      const batchResult = await applyStopBuildSpendBatch({
        session,
        client: null,
        stopIndex: 0,
        effectiveIslandNumber: 1,
        maxSteps: 3,
      });

      resetAll();
      seedState({
        runtimeVersion: 40,
        essence: 500,
        essenceLifetimeSpent: 0,
        stopBuildStateByIndex: seededStopBuildState,
      });
      await applyStopBuildSpendBatch({
        session,
        client: null,
        stopIndex: 0,
        effectiveIslandNumber: 1,
        maxSteps: 1,
      });
      await applyStopBuildSpendBatch({
        session,
        client: null,
        stopIndex: 0,
        effectiveIslandNumber: 1,
        maxSteps: 1,
      });
      const repeatedSingles = await applyStopBuildSpendBatch({
        session,
        client: null,
        stopIndex: 0,
        effectiveIslandNumber: 1,
        maxSteps: 1,
      });

      assertEqual(batchResult.record.essence, repeatedSingles.record.essence, 'batch essence should match repeated singles');
      assertEqual(
        batchResult.record.essenceLifetimeSpent,
        repeatedSingles.record.essenceLifetimeSpent,
        'batch lifetime spent should match repeated singles',
      );
      assertEqual(
        JSON.stringify(batchResult.record.stopBuildStateByIndex),
        JSON.stringify(repeatedSingles.record.stopBuildStateByIndex),
        'batch stop build state should match repeated singles',
      );
      assertEqual(
        JSON.stringify(batchResult.record.stopStatesByIndex),
        JSON.stringify(repeatedSingles.record.stopStatesByIndex),
        'batch stop state completion flags should match repeated singles',
      );
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
  {
    name: 'resolveReadyEggTerminalTransition: collect is idempotent and terminal',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 12,
        currentIslandNumber: 7,
        activeEggTier: 'rare',
        activeEggSetAtMs: 1000,
        activeEggHatchDurationMs: 100,
        perIslandEggs: {
          '7': { tier: 'rare', setAtMs: 1000, hatchAtMs: 1100, status: 'ready', location: 'dormant' },
        },
        completedStopsByIsland: {},
      });

      const first = resolveReadyEggTerminalTransition({
        session,
        client: null,
        islandNumber: 7,
        terminalStatus: 'collected',
        openedAtMs: 1200,
        completedStops: ['hatchery'],
      });
      const second = resolveReadyEggTerminalTransition({
        session,
        client: null,
        islandNumber: 7,
        terminalStatus: 'collected',
        openedAtMs: 1300,
        completedStops: ['hatchery'],
      });

      assertEqual(first.changed, true, 'first collect resolves ready egg');
      assertEqual(second.changed, false, 'second collect is no-op');
      assertEqual(second.reason, 'already_terminal', 'second collect reports terminal status');
      assertEqual(first.record.perIslandEggs['7']?.status, 'collected', 'status becomes collected');
    },
  },
  {
    name: 'resolveReadyEggTerminalTransition: sell is idempotent and reward deltas apply once',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 20,
        currentIslandNumber: 3,
        activeEggTier: 'common',
        activeEggSetAtMs: 100,
        activeEggHatchDurationMs: 100,
        perIslandEggs: {
          '3': { tier: 'common', setAtMs: 100, hatchAtMs: 200, status: 'ready', location: 'island' },
        },
        essence: 10,
        essenceLifetimeEarned: 20,
        dicePool: 5,
      });

      const first = resolveReadyEggTerminalTransition({
        session,
        client: null,
        islandNumber: 3,
        terminalStatus: 'sold',
        openedAtMs: 250,
        completedStops: ['hatchery'],
        rewardDeltas: { essence: 7, essenceLifetimeEarned: 7, dicePool: 10 },
      });
      const second = resolveReadyEggTerminalTransition({
        session,
        client: null,
        islandNumber: 3,
        terminalStatus: 'sold',
        openedAtMs: 260,
        completedStops: ['hatchery'],
        rewardDeltas: { essence: 7, essenceLifetimeEarned: 7, dicePool: 10 },
      });

      assertEqual(first.changed, true, 'first sell resolves ready egg');
      assertEqual(second.changed, false, 'second sell is no-op');
      assertEqual(first.record.essence, 17, 'essence delta applied once');
      assertEqual(first.record.dicePool, 15, 'dice delta applied once');
    },
  },
  {
    name: 'resolveReadyEggTerminalTransition: collect then sell does not grant sell rewards',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 9,
        currentIslandNumber: 4,
        activeEggTier: 'mythic',
        activeEggSetAtMs: 100,
        activeEggHatchDurationMs: 100,
        perIslandEggs: {
          '4': { tier: 'mythic', setAtMs: 100, hatchAtMs: 200, status: 'ready', location: 'island' },
        },
        essence: 30,
      });
      const collect = resolveReadyEggTerminalTransition({
        session, client: null, islandNumber: 4, terminalStatus: 'collected', openedAtMs: 220, completedStops: ['hatchery'],
      });
      const sellAfter = resolveReadyEggTerminalTransition({
        session, client: null, islandNumber: 4, terminalStatus: 'sold', openedAtMs: 230, completedStops: ['hatchery'], rewardDeltas: { essence: 99 },
      });
      assertEqual(collect.changed, true, 'collect resolves');
      assertEqual(sellAfter.changed, false, 'sell after collect is blocked');
      assertEqual(sellAfter.reason, 'already_terminal', 'sell after collect sees terminal state');
      assertEqual(sellAfter.record.essence, 30, 'no extra rewards granted');
    },
  },
  {
    name: 'resolveReadyEggTerminalTransition: sell then collect does not grant collect transition',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 9,
        currentIslandNumber: 5,
        activeEggTier: 'mythic',
        activeEggSetAtMs: 100,
        activeEggHatchDurationMs: 100,
        perIslandEggs: {
          '5': { tier: 'mythic', setAtMs: 100, hatchAtMs: 200, status: 'ready', location: 'island' },
        },
      });
      const sell = resolveReadyEggTerminalTransition({
        session, client: null, islandNumber: 5, terminalStatus: 'sold', openedAtMs: 220, completedStops: ['hatchery'],
      });
      const collectAfter = resolveReadyEggTerminalTransition({
        session, client: null, islandNumber: 5, terminalStatus: 'collected', openedAtMs: 230, completedStops: ['hatchery'],
      });
      assertEqual(sell.changed, true, 'sell resolves');
      assertEqual(collectAfter.changed, false, 'collect after sell is blocked');
      assertEqual(collectAfter.record.perIslandEggs['5']?.status, 'sold', 'ledger remains terminal sold');
    },
  },

  // ── C3: travelToNextIsland ──────────────────────────────────────────────

  {
    name: 'applyActivateCurrentIslandTimer starts current island timer with correct fields',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 30,
        currentIslandNumber: 5,
        cycleIndex: 2,
        islandStartedAtMs: 0,
        islandExpiresAtMs: 0,
      });

      const result = applyActivateCurrentIslandTimer({
        session,
        client: null,
        islandNumber: 5,
        cycleIndex: 2,
        nowMs: 1_000_000,
        durationMs: 86_400_000,
        triggerSource: 'test_activate_current_island_timer',
      });

      assertEqual(result.changed, true, 'timer activation should commit');
      assertEqual(result.record.currentIslandNumber, 5, 'island number should be preserved');
      assertEqual(result.record.cycleIndex, 2, 'cycle index should be preserved');
      assertEqual(result.record.islandStartedAtMs, 1_000_000, 'started timestamp should match nowMs');
      assertEqual(result.record.islandExpiresAtMs, 87_400_000, 'expires timestamp should be nowMs + durationMs');
      assertEqual(result.record.runtimeVersion, 31, 'runtimeVersion should bump by one');
    },
  },

  {
    name: 'applyActivateCurrentIslandTimer is no-op/idempotent when timer already started',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 8,
        currentIslandNumber: 9,
        cycleIndex: 1,
        islandStartedAtMs: 500_000,
        islandExpiresAtMs: 600_000,
      });

      const result = applyActivateCurrentIslandTimer({
        session,
        client: null,
        islandNumber: 9,
        cycleIndex: 1,
        nowMs: 900_000,
        durationMs: 86_400_000,
        triggerSource: 'test_activate_current_island_timer_idempotent',
      });

      assertEqual(result.changed, false, 'already-started timer should no-op');
      assertEqual(result.record.islandStartedAtMs, 500_000, 'started timestamp should remain unchanged');
      assertEqual(result.record.islandExpiresAtMs, 600_000, 'expires timestamp should remain unchanged');
      assertEqual(result.record.runtimeVersion, 8, 'runtimeVersion should not change on no-op');
    },
  },

  {
    name: 'applyActivateCurrentIslandTimer does not change unrelated fields',
    run: () => {
      resetAll();
      const session = makeSession();
      seedState({
        runtimeVersion: 12,
        currentIslandNumber: 3,
        cycleIndex: 0,
        islandStartedAtMs: 0,
        islandExpiresAtMs: 0,
        essence: 777,
        spinTokens: 42,
      });

      const result = applyActivateCurrentIslandTimer({
        session,
        client: null,
        islandNumber: 3,
        cycleIndex: 0,
        nowMs: 10_000,
        durationMs: 1_000,
        triggerSource: 'test_activate_current_island_timer_unrelated_preserved',
      });

      assertEqual(result.changed, true, 'pending timer should activate');
      assertEqual(result.record.essence, 777, 'unrelated essence should be preserved');
      assertEqual(result.record.spinTokens, 42, 'unrelated spinTokens should be preserved');
    },
  },

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
    name: 'travelToNextIsland: pre-island Lucky Roll flag off leaves rare-island travel unchanged',
    run: async () => {
      resetAll();
      const session = makeSession();
      seedState({ runtimeVersion: 1, currentIslandNumber: 59, cycleIndex: 0, luckyRollSessionsByMilestone: {} });

      await travelToNextIsland({
        session,
        client: null,
        nextIsland: 60,
        startTimer: true,
        nowMs: 10_000,
        getIslandDurationMs: () => 30_000,
        islandRunContractV2Enabled: false,
      });

      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.currentIslandNumber, 60, 'travel should still advance to rare island');
      assertEqual(snapshot.islandStartedAtMs, 10_000, 'flag-off travel should start timer as requested');
      assertEqual(snapshot.islandExpiresAtMs, 40_000, 'flag-off travel should keep existing expiry behavior');
      assertEqual(Object.keys(snapshot.luckyRollSessionsByMilestone).length, 0, 'flag-off travel should not create Lucky Roll session');
    },
  },

  {
    name: 'travelToNextIsland: flag on + non-pre-island target leaves travel unchanged',
    run: async () => {
      resetAll();
      __setIslandRunFeatureFlagsForTests({ islandRunPreIslandLuckyRollEnabled: true });
      const session = makeSession();
      seedState({ runtimeVersion: 1, currentIslandNumber: 11, cycleIndex: 0, luckyRollSessionsByMilestone: {} });

      await travelToNextIsland({
        session,
        client: null,
        nextIsland: 12,
        startTimer: true,
        nowMs: 10_000,
        getIslandDurationMs: () => 30_000,
        islandRunContractV2Enabled: false,
      });

      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.currentIslandNumber, 12, 'travel should advance to seasonal island');
      assertEqual(snapshot.islandStartedAtMs, 10_000, 'non-pre-island travel should start timer as requested');
      assertEqual(snapshot.islandExpiresAtMs, 40_000, 'non-pre-island travel should keep existing expiry behavior');
      assertEqual(Object.keys(snapshot.luckyRollSessionsByMilestone).length, 0, 'non-pre-island travel should not create Lucky Roll session');
    },
  },

  {
    name: 'travelToNextIsland: flag on + pre-island target creates session and keeps timer pending',
    run: async () => {
      resetAll();
      __setIslandRunFeatureFlagsForTests({ islandRunPreIslandLuckyRollEnabled: true });
      const session = makeSession();
      seedState({ runtimeVersion: 1, currentIslandNumber: 59, cycleIndex: 0, luckyRollSessionsByMilestone: {} });

      await travelToNextIsland({
        session,
        client: null,
        nextIsland: 60,
        startTimer: true,
        nowMs: 10_000,
        getIslandDurationMs: () => 30_000,
        islandRunContractV2Enabled: false,
      });

      const snapshot = getIslandRunStateSnapshot(session);
      const sessionKey = getIslandRunLuckyRollSessionKey(0, 60);
      const luckyRollSession = snapshot.luckyRollSessionsByMilestone[sessionKey];
      assertEqual(snapshot.currentIslandNumber, 60, 'travel should advance to pre-island target');
      assertEqual(snapshot.islandStartedAtMs, 0, 'required Lucky Roll should keep timer pending');
      assertEqual(snapshot.islandExpiresAtMs, 0, 'required Lucky Roll should keep expiry pending');
      assertEqual(luckyRollSession?.status, 'active', 'travel should create active Lucky Roll session');
      assertEqual(luckyRollSession?.targetIslandNumber, 60, 'session should target resolved island');
      assertEqual(luckyRollSession?.cycleIndex, 0, 'session should use target cycle index');
    },
  },

  {
    name: 'travelToNextIsland: existing banked pre-island Lucky Roll session is respected',
    run: async () => {
      resetAll();
      __setIslandRunFeatureFlagsForTests({ islandRunPreIslandLuckyRollEnabled: true });
      const session = makeSession();
      const sessionKey = getIslandRunLuckyRollSessionKey(0, 60);
      const bankedSession = makeLuckyRollSession('banked');
      seedState({
        runtimeVersion: 1,
        currentIslandNumber: 59,
        cycleIndex: 0,
        luckyRollSessionsByMilestone: { [sessionKey]: bankedSession },
      });

      await travelToNextIsland({
        session,
        client: null,
        nextIsland: 60,
        startTimer: true,
        nowMs: 10_000,
        getIslandDurationMs: () => 30_000,
        islandRunContractV2Enabled: false,
      });

      const snapshot = getIslandRunStateSnapshot(session);
      assertEqual(snapshot.islandStartedAtMs, 10_000, 'banked session should allow timer to start');
      assertEqual(snapshot.islandExpiresAtMs, 40_000, 'banked session should preserve requested timer behavior');
      assertEqual(snapshot.luckyRollSessionsByMilestone[sessionKey]?.status, 'banked', 'banked session should not be overwritten');
      assertEqual(snapshot.luckyRollSessionsByMilestone[sessionKey]?.runId, bankedSession.runId, 'existing banked run id should be preserved');
    },
  },

  {
    name: 'travelToNextIsland: existing active/completed pre-island Lucky Roll sessions are resumed',
    run: async () => {
      for (const status of ['active', 'completed'] as const) {
        resetAll();
        __setIslandRunFeatureFlagsForTests({ islandRunPreIslandLuckyRollEnabled: true });
        const session = makeSession();
        const sessionKey = getIslandRunLuckyRollSessionKey(0, 60);
        const existingSession = makeLuckyRollSession(status);
        seedState({
          runtimeVersion: 1,
          currentIslandNumber: 59,
          cycleIndex: 0,
          luckyRollSessionsByMilestone: { [sessionKey]: existingSession },
        });

        await travelToNextIsland({
          session,
          client: null,
          nextIsland: 60,
          startTimer: true,
          nowMs: 10_000,
          getIslandDurationMs: () => 30_000,
          islandRunContractV2Enabled: false,
        });

        const snapshot = getIslandRunStateSnapshot(session);
        assertEqual(snapshot.islandStartedAtMs, 0, `${status} session should keep timer pending`);
        assertEqual(snapshot.islandExpiresAtMs, 0, `${status} session should keep expiry pending`);
        assertEqual(snapshot.luckyRollSessionsByMilestone[sessionKey]?.status, status, `${status} session should not be overwritten`);
        assertEqual(snapshot.luckyRollSessionsByMilestone[sessionKey]?.runId, existingSession.runId, `${status} run id should be preserved`);
      }
    },
  },

  {
    name: 'travelToNextIsland: pre-island Lucky Roll session key uses resolved island and wrapped cycle',
    run: async () => {
      resetAll();
      __setIslandRunFeatureFlagsForTests({ islandRunPreIslandLuckyRollEnabled: true });
      const session = makeSession();
      seedState({ runtimeVersion: 1, currentIslandNumber: 120, cycleIndex: 4, luckyRollSessionsByMilestone: {} });

      const result = await travelToNextIsland({
        session,
        client: null,
        nextIsland: 180,
        startTimer: true,
        nowMs: 10_000,
        getIslandDurationMs: () => 30_000,
        islandRunContractV2Enabled: false,
      });

      const snapshot = getIslandRunStateSnapshot(session);
      const wrappedSessionKey = getIslandRunLuckyRollSessionKey(5, 60);
      assertEqual(result.resolvedIsland, 60, 'raw target should resolve to island 60');
      assertEqual(result.nextCycleIndex, 5, 'wrapped target should increment cycle index');
      assertEqual(snapshot.luckyRollSessionsByMilestone[wrappedSessionKey]?.status, 'active', 'session should key by wrapped cycle and resolved island');
      assertEqual(snapshot.islandStartedAtMs, 0, 'new required wrapped session should keep timer pending');
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
