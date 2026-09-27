import type { Session } from '@supabase/supabase-js';
import {
  createCrystalMinersProgress,
  createMinerBlocks,
  isMinerCampaignComplete,
  MINER_EVENT_MILESTONES,
  MINER_LEVEL_COUNT,
  resolveCrystalMinersProgressForEvent,
  type CrystalMinersProgress,
} from '../crystalMinersGame';
import { applyCrystalMinersAction } from '../islandRunCrystalMinersActions';
import { selectArenaGamePair } from '../islandRunArenaCatalog';
import { applyDevSkipToNextTimedEvent } from '../islandRunStateActions';
import { readIslandRunGameStateRecord, resetIslandRunRuntimeCommitCoordinatorForTests, writeIslandRunGameStateRecord } from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, getIslandRunStateSnapshot, refreshIslandRunStateFromLocal } from '../islandRunStateStore';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const session = { user: { id: 'crystal-miners-season-test', user_metadata: {} } } as Session;

function finishedCareer(): CrystalMinersProgress {
  return { ...createCrystalMinersProgress(), level: MINER_LEVEL_COUNT, blocks: createMinerBlocks(MINER_LEVEL_COUNT), revision: 57,
    digs: 310, totalScore: 88_000, bestScore: 4_200, dropTickets: 6, forgeLevel: 5,
    eventTrack: { levelsCleared: MINER_LEVEL_COUNT, claimedMilestones: MINER_EVENT_MILESTONES.map(m => m.levels) } };
}

async function seed(eventId: string, checkpoints: Record<string, CrystalMinersProgress>, tickets = 3) {
  resetIslandRunRuntimeCommitCoordinatorForTests(); __resetIslandRunStateStoreForTests(); __resetIslandRunActionMutexesForTests();
  installWindowWithStorage(createMemoryStorage());
  const base = readIslandRunGameStateRecord(session);
  await writeIslandRunGameStateRecord({ session, client: null, record: { ...base, currentIslandNumber: 4,
    activeTimedEvent: { eventId, eventType: 'feeding_frenzy', startedAtMs: 100, expiresAtMs: 100_000, version: 1 },
    rewardBarBoundEventId: eventId, minigameTicketsByEvent: { [eventId]: tickets }, crystalMinersProgressByEvent: checkpoints } });
  refreshIslandRunStateFromLocal(session);
}

export const crystalMinersSeasonTests: TestCase[] = [
  {
    name: 'a finished journey stays finished in its own event and opens a new season in the next one',
    run: () => {
      const done = finishedCareer();
      assert(isMinerCampaignComplete(done), 'all caverns and prizes collected');
      assertEqual(resolveCrystalMinersProgressForEvent({ 'feeding_frenzy:1': done }, 'feeding_frenzy:1'), done, 'same event keeps the trophy state');
      const season = resolveCrystalMinersProgressForEvent({ 'feeding_frenzy:1': done }, 'lucky_spin:2')!;
      assertEqual(season.level, 1, 'fresh first cavern');
      assertEqual(season.eventTrack.levelsCleared, 0, 'fresh journey');
      assertEqual(season.eventTrack.claimedMilestones.length, 0, 'prizes can be earned again');
      assertEqual(season.digs, done.digs, 'arena round receipts stay monotonic');
      assertEqual(season.revision, done.revision, 'saved revision keeps optimistic writes valid');
      assertEqual(season.dropTickets, done.dropTickets, 'paid drop tickets are never lost');
      assertEqual(season.totalScore, done.totalScore, 'league standing carries over');
      assertEqual(resolveCrystalMinersProgressForEvent({ 'feeding_frenzy:1': done }, 'lucky_spin:2'), season, 'stable identity for external-store reads');
    },
  },
  {
    name: 'unclaimed prizes hold the finished journey until they are collected',
    run: () => {
      const done = { ...finishedCareer(), eventTrack: { levelsCleared: MINER_LEVEL_COUNT, claimedMilestones: [1, 10] } };
      assert(!isMinerCampaignComplete(done), 'prizes still waiting');
      assertEqual(resolveCrystalMinersProgressForEvent({ 'feeding_frenzy:1': done }, 'lucky_spin:2'), done, 'no prize is wiped by a season reset');
    },
  },
  {
    name: 'the next event can dig again and saves the new season under that event',
    run: async () => {
      await seed('lucky_spin:2', { 'feeding_frenzy:1': finishedCareer() });
      const result = await applyCrystalMinersAction({ session, client: null, eventId: 'lucky_spin:2', command: { kind: 'dig' }, expectedRevision: 57, nowMs: 500 });
      assert(result.ok, `dig accepted in the new season (${result.failureReason ?? 'ok'})`);
      const saved = getIslandRunStateSnapshot(session).crystalMinersProgressByEvent['lucky_spin:2'];
      assertEqual(saved.revision, 58, 'revision advances');
      assertEqual(saved.digs, 311, 'lifetime digs keep counting');
      assert(saved.eventTrack.levelsCleared <= 1, 'journey restarted from cavern one');
    },
  },
  {
    name: 'a finished game is never offered by the arena, so it cannot trap the stadium',
    run: () => {
      const pair = selectArenaGamePair({ allowedGameIds: ['signal_path', 'crystal_miners'], islandNumber: 4, activeEventId: 'feeding_frenzy',
        rankedGameIds: ['crystal_miners'], disabledGameIds: ['crystal_miners'], seed: 'x' });
      assertEqual(pair.primary?.id, 'signal_path', 'the playable game is offered');
      assertEqual(pair.alternative, null, 'finished game is not a second card');
    },
  },
  {
    name: 'dev skip ends the active event and rotates to the next one',
    run: async () => {
      await seed('feeding_frenzy:1', {});
      const result = applyDevSkipToNextTimedEvent({ session, client: null, nowMs: 5_000 });
      assert(result.changed, 'event rotated');
      assert(result.record.activeTimedEvent?.eventId !== 'feeding_frenzy:1', 'new event id');
      assertEqual(result.record.activeTimedEvent?.eventType, 'lucky_spin', 'next event in sequence');
      assert((result.record.activeTimedEvent?.expiresAtMs ?? 0) > 5_000, 'fresh countdown');
    },
  },
];
