import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
  type IslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, refreshIslandRunStateFromLocal } from '../islandRunStateStore';
import { bankJourneyDiscArenaRound, claimJourneyDiscArenaMilestone, startJourneyDiscArenaRound } from '../islandRunStateActions';
import { JOURNEY_DISC_ARENA_MILESTONES } from '../journeyDiscArenaProgression';
import { assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const USER_ID = 'journey-disc-actions-user';
const EVENT_ID = 'companion_feast:journey-disc-test';
const session = () => ({ user: { id: USER_ID, user_metadata: {} } }) as unknown as import('@supabase/supabase-js').Session;

function reset(overrides: Partial<IslandRunGameStateRecord>): void {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
  const base = readIslandRunGameStateRecord(session());
  void writeIslandRunGameStateRecord({ session: session(), client: null, record: { ...base, ...overrides } });
  refreshIslandRunStateFromLocal(session());
}

export const journeyDiscArenaStateActionsTests: TestCase[] = [
  {
    name: 'one event ticket becomes exactly one deployed weapon disc',
    run: () => {
      reset({ minigameTicketsByEvent: { [EVENT_ID]: 4 } });
      const three = startJourneyDiscArenaRound({ session: session(), client: null, eventId: EVENT_ID, deployedDiscs: 3, nowMs: 100 });
      assertEqual(three.ok, true, 'three-disc launch succeeds');
      assertEqual(three.ticketsRemaining, 1, 'three discs spend exactly three tickets');
      assertEqual(three.progress?.totalDiscsDeployed, 3, 'deployment persists in canonical progress');
      const blocked = startJourneyDiscArenaRound({ session: session(), client: null, eventId: EVENT_ID, deployedDiscs: 2, nowMs: 101 });
      assertEqual(blocked.ok, false, 'two-disc launch is blocked with one ticket');
      assertEqual(blocked.failureReason, 'insufficient_tickets', 'failure is explicit');
      assertEqual(blocked.ticketsRemaining, 1, 'failed launch spends nothing');
    },
  },
  {
    name: 'score banks once and a reached reward milestone claims once',
    run: () => {
      reset({ dicePool: 10, minigameTicketsByEvent: { [EVENT_ID]: 4 } });
      const start = startJourneyDiscArenaRound({ session: session(), client: null, eventId: EVENT_ID, deployedDiscs: 2, nowMs: 100 });
      const bank = bankJourneyDiscArenaRound({ session: session(), client: null, eventId: EVENT_ID, roundId: start.roundId!, score: 180, won: true, deployedDiscs: 2, nowMs: 200 });
      assertEqual(bank.ok, true, 'terminal score banks');
      assertEqual(bank.progress?.eventPoints, 180, 'score feeds Journey Disc reward points');
      const duplicate = bankJourneyDiscArenaRound({ session: session(), client: null, eventId: EVENT_ID, roundId: start.roundId!, score: 180, won: true, deployedDiscs: 2, nowMs: 201 });
      assertEqual(duplicate.applied, false, 'same round cannot double-bank');
      const milestone = JOURNEY_DISC_ARENA_MILESTONES[0]!;
      const claim = claimJourneyDiscArenaMilestone({ session: session(), client: null, eventId: EVENT_ID, milestoneId: milestone.id });
      assertEqual(claim.ok, true, 'reached milestone claims');
      assertEqual(claim.record.dicePool, 10 + (milestone.reward.dice ?? 0), 'declared dice reward reaches canonical wallet');
      const repeat = claimJourneyDiscArenaMilestone({ session: session(), client: null, eventId: EVENT_ID, milestoneId: milestone.id });
      assertEqual(repeat.ok, false, 'reward cannot claim twice');
      assertEqual(repeat.failureReason, 'already_claimed', 'repeat reason is explicit');
    },
  },
  {
    name: 'milestone weapon upgrades and Guardian clearance persist canonically once',
    run: () => {
      reset({ minigameTicketsByEvent: { [EVENT_ID]: 8 } });
      const start = startJourneyDiscArenaRound({ session: session(), client: null, eventId: EVENT_ID, deployedDiscs: 1, nowMs: 100 });
      bankJourneyDiscArenaRound({ session: session(), client: null, eventId: EVENT_ID, roundId: start.roundId!, score: 960, won: true, deployedDiscs: 1, guardianTier: 2, nowMs: 200 });
      const unlockMilestone = JOURNEY_DISC_ARENA_MILESTONES.find((milestone) => milestone.reward.armoryUpgrade === 'aegis_ring')!;
      const claim = claimJourneyDiscArenaMilestone({ session: session(), client: null, eventId: EVENT_ID, milestoneId: unlockMilestone.id });
      assertEqual(claim.ok, true, 'reached armory milestone claims');
      assertEqual(claim.armory.weaponLevels.aegis_ring, 1, 'Aegis Ring unlock is written to the permanent profile');
      assertEqual(claim.armory.rank, 2, 'rank milestone is written to the permanent cross-island profile');
      assertEqual(claim.armory.highestGuardianTierDefeated, 2, 'Guardian II clearance survives the milestone write');
      const repeat = claimJourneyDiscArenaMilestone({ session: session(), client: null, eventId: EVENT_ID, milestoneId: unlockMilestone.id });
      assertEqual(repeat.ok, false, 'idempotency blocks a second weapon upgrade');
      assertEqual(repeat.armory.weaponLevels.aegis_ring, 1, 'repeat claim cannot increment the weapon twice');
    },
  },
];
