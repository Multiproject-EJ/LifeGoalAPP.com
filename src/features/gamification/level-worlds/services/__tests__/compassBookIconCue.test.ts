import {
  COMPASS_ICON_FIRST_NUDGE_MS,
  COMPASS_ICON_MAX_NUDGES,
  COMPASS_ICON_NUDGE_GAP_MS,
  compassInsightMessage,
  compassIslandKey,
  hasUnseenCompassInsight,
  islandHasCompassInsight,
  nextCompassNudgeDelayMs,
} from '../compassBookIconCue';
import { assert, assertEqual, type TestCase } from './testHarness';

export const compassBookIconCueTests: TestCase[] = [
  {
    name: 'islands from 009 carry a new Compass insight until opened on that island visit',
    run: () => {
      assert(!islandHasCompassInsight(8), 'the book arrives on 008 via its own ceremony');
      assert(islandHasCompassInsight(9), 'visible fragments start on 009');
      const key = compassIslandKey(0, 12);
      assert(hasUnseenCompassInsight({ islandNumber: 12, islandKey: key, seenIslandKey: compassIslandKey(0, 11) }), 'new island is unseen');
      assert(!hasUnseenCompassInsight({ islandNumber: 12, islandKey: key, seenIslandKey: key }), 'opening the book clears it');
      assert(compassIslandKey(1, 12) !== key, 'a new cycle is a new visit');
    },
  },
  {
    name: 'insight nudges are few and spaced, then the icon only glows',
    run: () => {
      assertEqual(nextCompassNudgeDelayMs(0), COMPASS_ICON_FIRST_NUDGE_MS, 'first nudge soon after arrival');
      assertEqual(nextCompassNudgeDelayMs(1), COMPASS_ICON_NUDGE_GAP_MS, 'later nudges spaced out');
      assertEqual(nextCompassNudgeDelayMs(COMPASS_ICON_MAX_NUDGES), null, 'no nagging');
      assertEqual(compassInsightMessage(14, 0), 'Island 014 fragment revealed ✦', 'first message names the island');
      assert(compassInsightMessage(14, 1) !== compassInsightMessage(14, 2), 'messages rotate');
    },
  },
];
