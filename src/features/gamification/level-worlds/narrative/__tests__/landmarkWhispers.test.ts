import {
  LANDMARK_KEEPERS,
  LANDMARK_WHISPER_DURATION_MS,
  buildArenaTransferWhisper,
  buildArenaTransferWhisperFromRewardBundle,
  consumeArenaTransferWhisperBundle,
  buildHabitWhisper,
  buildHatcheryWhisper,
  buildLandmarkWhisperForStop,
  buildWisdomWhisper,
  queueArenaTransferWhisperBundle,
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
    name: 'Arena transfer formatting covers dice, essence, tickets, and creature treats',
    run: () => {
      const whisper = buildArenaTransferWhisper({ dice: 12, essence: 80, tickets: 3, creatureTreats: 1 });
      assert(
        Boolean(
          whisper?.text.includes('+12 dice')
          && whisper.text.includes('+80 essence')
          && whisper.text.includes('+3 tickets')
          && whisper.text.includes('+1 creature treat'),
        ),
        'Expected compact resource summary for all supported transfer types',
      );
    },
  },
  {
    name: 'Arena reward-bundle adapter is presentation-only for concrete amounts',
    run: () => {
      assertEqual(buildArenaTransferWhisperFromRewardBundle({ id: 'empty', source: 'manual_seam', createdAtMs: 1 }), null, 'Empty bundle should not speak');
      const whisper = buildArenaTransferWhisperFromRewardBundle({ id: 'real', source: 'daily_treats', createdAtMs: 1, dice: 25 });
      assertEqual(whisper?.speakerName, 'The Arena Keeper', 'Concrete bundle should produce Arena Keeper whisper');
      assert(whisper?.text.includes('+25 dice') === true, 'Expected concrete dice amount in whisper text');
    },
  },
  {
    name: 'Arena transfer queue consumes once and ignores empty bundles without gameplay writes',
    run: () => {
      const writes: string[] = [];
      const store = new Map<string, string>();
      const previousWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
      (globalThis as unknown as { window?: unknown }).window = {
        localStorage: {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, value: string) => { writes.push(key); store.set(key, value); },
          removeItem: (key: string) => { store.delete(key); },
        } as unknown as Storage,
      } as unknown as Window;
      try {
        queueArenaTransferWhisperBundle('user-1', { source: 'manual_seam', dice: 0 });
        assertEqual(writes.length, 0, 'Empty bundle should not queue');
        queueArenaTransferWhisperBundle('user-1', { source: 'daily_treats', dice: 10, id: 'daily' });
        const first = consumeArenaTransferWhisperBundle('user-1');
        const second = consumeArenaTransferWhisperBundle('user-1');
        assertEqual(first?.dice, 10, 'Real bundle should be consumed');
        assertEqual(second, null, 'Bundle should only be consumed once');
      } finally {
        (globalThis as unknown as { window?: unknown }).window = previousWindow;
      }
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
