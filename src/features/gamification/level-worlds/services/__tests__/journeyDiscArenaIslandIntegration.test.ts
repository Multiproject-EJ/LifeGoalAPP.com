import {
  ISLAND_EVENT_GRID_SLOT_COUNT,
  resolveIslandEventGridSlots,
  resolveJourneyDiscCenterLandmarkPresentation,
  shouldJourneyDiscReplaceTimedEventSurface,
} from '../journeyDiscArenaIslandIntegration';
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
  {
    name: 'Island 006 replaces only the active rotation tile with Journey Disc in a three-row grid',
    run: () => {
      const templates = [
        { eventId: 'feeding_frenzy', displayName: 'Island Workshop', icon: '🛠️' },
        { eventId: 'lucky_spin', displayName: 'Lucky Spin', icon: '🎰' },
        { eventId: 'space_excavator', displayName: 'Space Excavator', icon: '🚀' },
        { eventId: 'companion_feast', displayName: 'Companion Feast', icon: '🐾' },
      ];
      const replacesTimedEvent = shouldJourneyDiscReplaceTimedEventSurface({
        featureEnabled: true,
        islandNumber: 6,
        hasActiveTimedEvent: true,
      });
      const slots = resolveIslandEventGridSlots({
        templates,
        exhibitions: [
          { gameId: 'journey_disc_arena', displayName: 'Journey Disc Arena', icon: '◉' },
          { gameId: 'lexicon_relay', displayName: 'Lexicon Relay', icon: 'A↗' },
        ],
        activeEventType: 'lucky_spin',
        journeyDiscReplacesTimedEvent: replacesTimedEvent,
      });

      assertEqual(replacesTimedEvent, true, 'the chapter exhibition owns the visible event surface');
      assertEqual(slots.length, ISLAND_EVENT_GRID_SLOT_COUNT, 'the grid has three complete rows of four');
      assertEqual(slots[1]?.kind, 'journey_disc', 'Journey Disc occupies the active timed-game slot');
      assertEqual(slots.filter((slot) => slot.kind === 'exhibition').length, 1, 'word exhibition is appended without duplicating Journey Disc');
      assertEqual(slots.filter((slot) => slot.kind === 'empty').length, 7, 'remaining future slots stay visibly reserved');
      assertEqual(
        slots.some((slot) => slot.kind === 'event' && slot.eventId === 'lucky_spin'),
        false,
        'the ordinary active game is absent on Island 006',
      );
    },
  },
  {
    name: 'the ordinary timed game resumes on the island after Journey Disc',
    run: () => {
      const replacesTimedEvent = shouldJourneyDiscReplaceTimedEventSurface({
        featureEnabled: true,
        islandNumber: 7,
        hasActiveTimedEvent: true,
      });
      const slots = resolveIslandEventGridSlots({
        templates: [
          { eventId: 'feeding_frenzy', displayName: 'Island Workshop', icon: '🛠️' },
          { eventId: 'lucky_spin', displayName: 'Lucky Spin', icon: '🎰' },
          { eventId: 'space_excavator', displayName: 'Space Excavator', icon: '🚀' },
          { eventId: 'companion_feast', displayName: 'Companion Feast', icon: '🐾' },
        ],
        exhibitions: [
          { gameId: 'journey_disc_arena', displayName: 'Journey Disc Arena', icon: '◉' },
          { gameId: 'lexicon_relay', displayName: 'Lexicon Relay', icon: 'A↗' },
        ],
        activeEventType: 'lucky_spin',
        journeyDiscReplacesTimedEvent: replacesTimedEvent,
      });

      assertEqual(replacesTimedEvent, false, 'Island 007 restores the rotating event surface');
      assertEqual(
        slots.some((slot) => slot.kind === 'event' && slot.eventId === 'lucky_spin' && slot.active),
        true,
        'Lucky Spin resumes as the active tile without resetting its event',
      );
      assertEqual(slots.some((slot) => slot.kind === 'journey_disc'), false, 'Journey Disc no longer replaces the active timed tile');
      assertEqual(
        slots.some((slot) => slot.kind === 'exhibition' && slot.gameId === 'journey_disc_arena'),
        true,
        'Journey Disc remains discoverable as a chapter-gated exhibition',
      );
      assertEqual(slots.length, ISLAND_EVENT_GRID_SLOT_COUNT, 'the expanded grid remains available');
    },
  },
];
