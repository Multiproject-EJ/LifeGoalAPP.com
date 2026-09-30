import {
  DEPARTURE_DAY_BEATS,
  DEPARTURE_DAY_DURATION,
  DEPARTURE_DAY_REDUCED_MOTION_STILLS,
  isDepartureDayReady,
  resolveDepartureDayBeat,
  resolveDepartureDayFrame,
  resolveDepartureDaySkip,
} from '../islandRunDepartureDay';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunDepartureDayTests: TestCase[] = [
  {
    name: 'Departure Day: five contiguous beats in about 15 seconds',
    run: () => {
      assertEqual(DEPARTURE_DAY_DURATION, 15, 'the brief caps the send-off at about 15 s');
      assertEqual(DEPARTURE_DAY_BEATS.map((beat) => beat.beat).join(','), 'reveal,transform,crew-walk,boarding,departure', 'beat order');
      DEPARTURE_DAY_BEATS.forEach((beat, index) => {
        if (index > 0) assertEqual(beat.start, DEPARTURE_DAY_BEATS[index - 1]!.end, `${beat.beat} starts where the previous beat ends`);
      });
      assertEqual(DEPARTURE_DAY_BEATS[DEPARTURE_DAY_BEATS.length - 1]!.end, DEPARTURE_DAY_DURATION, 'last beat ends the film');
      assertEqual(resolveDepartureDayBeat(0), 'reveal', 'starts on the reveal');
      assertEqual(resolveDepartureDayBeat(99), 'departure', 'holds the last beat');
    },
  },
  {
    name: 'Departure Day: the ship opens for the crowd, closes to leave, and the crew board before lift-off',
    run: () => {
      assertEqual(resolveDepartureDayFrame(0).shipPoseProgress, 1, 'starts in the closed controller shell');
      assertEqual(resolveDepartureDayFrame(7).shipPoseProgress, 0, 'living mode while the crew walk');
      assertEqual(resolveDepartureDayFrame(13).shipPoseProgress, 1, 'closed again to depart');
      const walkStart = resolveDepartureDayFrame(5.5);
      assert(walkStart.crewWalk > 0 && walkStart.shipPoseProgress < 0.2, 'the crew walk overlaps the end of the transform');
      assertEqual(resolveDepartureDayFrame(11.5).boarding, 1, 'everyone is aboard before the ship lifts');
      assertEqual(resolveDepartureDayFrame(11.5).liftOff, 0, 'no lift-off before boarding ends');
      assert(resolveDepartureDayFrame(12.2).door > 0, 'the door opens only at departure');
      assertEqual(resolveDepartureDayFrame(10).door, 0, 'the door stays closed during the ceremony');
      assertEqual(resolveDepartureDayFrame(DEPARTURE_DAY_DURATION).handoff, 1, 'ends fully handed off to Island 001');
      for (let t = 0; t <= DEPARTURE_DAY_DURATION; t += 0.25) {
        const frame = resolveDepartureDayFrame(t);
        assert(frame.crowd >= 0 && frame.crowd <= 1, `crowd energy stays in range at ${t}`);
      }
    },
  },
  {
    name: 'Departure Day: first viewing is required, replays skippable; picker waits for the load; reduced motion uses four stills',
    run: () => {
      assertEqual(resolveDepartureDaySkip({ hasSeenBefore: false }).skippable, false, 'first viewing plays in full');
      assertEqual(resolveDepartureDaySkip({ hasSeenBefore: true }).skippable, true, 'replays can be skipped');
      assert(!isDepartureDayReady(0.8), 'not ready mid-load');
      assert(isDepartureDayReady(1), 'ready when loaded');
      assertEqual(DEPARTURE_DAY_REDUCED_MOTION_STILLS.length, 4, 'four held stills');
      assert(DEPARTURE_DAY_REDUCED_MOTION_STILLS.every((t) => t > 0 && t < DEPARTURE_DAY_DURATION), 'stills fall inside the film');
    },
  },
];
