import { resolveJourneyDiscCenterLandmarkPresentation } from '../journeyDiscArenaIslandIntegration';
import { assertEqual, type TestCase } from './testHarness';

export const journeyDiscArenaIslandIntegrationTests: TestCase[] = [
  {
    name: 'chapter exhibition owns the locked Island 006 centre landmark',
    run: () => {
      const presentation = resolveJourneyDiscCenterLandmarkPresentation({
        featureEnabled: true,
        islandNumber: 6,
        hasActiveTimedEvent: true,
        eventTickets: 4,
        bossStopStatus: 'locked',
      });
      assertEqual(presentation.owner, 'journey_disc_arena', 'Journey Disc owns the centre on Island 006');
      assertEqual(presentation.canEnter, true, 'an event ticket can become a deployed weapon disc');
      assertEqual(presentation.reason, 'event_ready', 'the landmark reports an enterable exhibition');
    },
  },
  {
    name: 'live exhibition stays visible without tickets but cannot start a round',
    run: () => {
      const presentation = resolveJourneyDiscCenterLandmarkPresentation({
        featureEnabled: true,
        islandNumber: 11,
        hasActiveTimedEvent: true,
        eventTickets: 0,
        bossStopStatus: 'locked',
      });
      assertEqual(presentation.owner, 'journey_disc_arena', 'the timed landmark remains visible');
      assertEqual(presentation.canEnter, false, 'zero tickets cannot deploy a disc');
      assertEqual(presentation.reason, 'tickets_required', 'the invitation can explain how to unlock entry');
    },
  },
  {
    name: 'canonical boss finale always regains the centre landmark',
    run: () => {
      (['ticket_required', 'active', 'accessible', 'completed'] as const).forEach((bossStopStatus) => {
        const presentation = resolveJourneyDiscCenterLandmarkPresentation({
          featureEnabled: true,
          islandNumber: 6,
          hasActiveTimedEvent: true,
          eventTickets: 8,
          bossStopStatus,
        });
        assertEqual(presentation.owner, 'canonical_boss', `${bossStopStatus} Boss status keeps Island Run completable`);
        assertEqual(presentation.reason, 'boss_finale_priority', 'the mandatory objective has explicit priority');
      });
    },
  },
  {
    name: 'ordinary islands and disabled rollout retain their canonical landmark',
    run: () => {
      const ordinary = resolveJourneyDiscCenterLandmarkPresentation({
        featureEnabled: true,
        islandNumber: 5,
        hasActiveTimedEvent: true,
        eventTickets: 3,
        bossStopStatus: 'locked',
      });
      const disabled = resolveJourneyDiscCenterLandmarkPresentation({
        featureEnabled: false,
        islandNumber: 6,
        hasActiveTimedEvent: true,
        eventTickets: 3,
        bossStopStatus: 'locked',
      });
      assertEqual(ordinary.reason, 'ineligible_island', 'Island 5 remains its authored arena island');
      assertEqual(disabled.reason, 'feature_disabled', 'rollout flag restores the canonical centre immediately');
    },
  },
];
