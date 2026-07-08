import {
  LANDMARK_KEEPERS,
  LANDMARK_WHISPER_DURATION_MS,
  buildArenaTransferWhisper,
  buildHabitWhisper,
  buildHatcheryWhisper,
  buildLandmarkWhisperForStop,
  buildWisdomWhisper,
} from '../landmarkWhispers';
import { assert, assertEqual, type TestCase } from '../../services/__tests__/testHarness';

export const landmarkWhispersTests: TestCase[] = [
  {
    name: 'Landmark Keepers define the four MVP speakers',
    run: () => {
      assertEqual(LANDMARK_KEEPERS.hatchery.speakerName, 'The Hatchery Keeper', 'Expected hatchery keeper');
      assertEqual(LANDMARK_KEEPERS.habit.speakerName, 'The Habit Keeper', 'Expected habit keeper');
      assertEqual(LANDMARK_KEEPERS.arena.speakerName, 'The Arena Keeper', 'Expected arena keeper');
      assertEqual(LANDMARK_KEEPERS.wisdom.speakerName, 'The Wisdom Keeper', 'Expected wisdom keeper');
    },
  },
  {
    name: 'Hatchery Keeper uses egg-ready contextual copy',
    run: () => {
      const whisper = buildHatcheryWhisper({ hasActiveEgg: true, isEggReady: true }, 'ready');
      assertEqual(whisper.speakerName, 'The Hatchery Keeper', 'Expected Hatchery speaker');
      assert(whisper.text.includes('ready') || whisper.text.includes('moment'), 'Expected ready egg copy');
      assertEqual(whisper.durationMs, LANDMARK_WHISPER_DURATION_MS, 'Expected extended story duration');
    },
  },
  {
    name: 'Habit Keeper distinguishes progress from encouragement without shame',
    run: () => {
      const progress = buildHabitWhisper({ hasTodayProgress: true }, 'progress');
      const encouragement = buildHabitWhisper({ hasTodayProgress: false }, 'encouragement');
      assertEqual(progress.speakerName, 'The Habit Keeper', 'Expected Habit speaker');
      assertEqual(encouragement.speakerName, 'The Habit Keeper', 'Expected Habit speaker');
      assert(!encouragement.text.toLowerCase().includes('failed'), 'Encouragement should avoid shaming language');
    },
  },
  {
    name: 'Arena Keeper only speaks for real transfer amounts',
    run: () => {
      assertEqual(buildArenaTransferWhisper({ dice: 0, essence: 0 }), null, 'No transfer should produce no whisper');
      const whisper = buildArenaTransferWhisper({ dice: 2, essence: 5 });
      assert(whisper?.text.includes('+2 dice') && whisper.text.includes('+5 essence'), 'Expected real transfer summary');
    },
  },
  {
    name: 'Wisdom Keeper MVP uses safe static reflection',
    run: () => {
      const whisper = buildWisdomWhisper('wisdom');
      assertEqual(whisper.speakerName, 'The Wisdom Keeper', 'Expected Wisdom speaker');
      assert(whisper.text.length > 20, 'Expected meaningful reflection copy');
    },
  },
  {
    name: 'Stop openings map to only available landmark whispers',
    run: () => {
      const base = { hatchery: { hasActiveEgg: false, isEggReady: false }, habit: { hasTodayProgress: false }, seed: 'map' };
      assertEqual(buildLandmarkWhisperForStop('boss', base), null, 'Boss/arena is not faked without transfer event');
      assertEqual(buildLandmarkWhisperForStop('mystery', base), null, 'Mystery has no MVP keeper');
      assertEqual(buildLandmarkWhisperForStop('wisdom', base)?.speakerName, 'The Wisdom Keeper', 'Wisdom should map');
    },
  },
];
