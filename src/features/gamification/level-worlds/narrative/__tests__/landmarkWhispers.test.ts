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
import {
  buildWisdomKeeperPromptBundle,
  resolveWisdomKeeperAiWhisper,
  sanitizeWisdomKeeperReflection,
} from '../wisdomKeeperAi';
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
    name: 'Wisdom Keeper AI disabled uses static fallback',
    run: async () => {
      const result = await resolveWisdomKeeperAiWhisper({
        aiEnabled: false,
        access: { goals: true, goalEvolution: true, habits: true, journaling: true, reflections: true, visionBoard: true, lifeStage: false },
        context: { goals: [{ title: 'Practice guitar' }] },
        generate: async () => 'Generated reflection that should not be used.',
        seed: 'disabled',
      });
      assertEqual(result.source, 'fallback', 'Disabled AI should use fallback');
      assertEqual(result.whisper.speakerName, 'The Wisdom Keeper', 'Fallback still speaks as Wisdom Keeper');
    },
  },
  {
    name: 'Wisdom Keeper AI error uses static fallback',
    run: async () => {
      const result = await resolveWisdomKeeperAiWhisper({
        aiEnabled: true,
        access: { goals: true, goalEvolution: true, habits: true, journaling: true, reflections: true, visionBoard: true, lifeStage: false },
        generate: async () => { throw new Error('rate limited'); },
        seed: 'error',
      });
      assertEqual(result.source, 'fallback', 'AI errors should use fallback');
      assertEqual(result.reason, 'ai_error', 'Expected ai_error reason');
    },
  },
  {
    name: 'Wisdom Keeper thin context prompt asks for safe generic reflection',
    run: () => {
      const prompt = buildWisdomKeeperPromptBundle(
        { goals: false, goalEvolution: false, habits: false, journaling: false, reflections: false, visionBoard: false, lifeStage: false },
        {},
      );
      assert(prompt.userPrompt.includes('No personal app context is available or allowed'), 'Thin context should be explicit');
      assert(prompt.systemPrompt.includes('priorities, balance, effort, or returning'), 'Prompt should steer generic reflection safely');
    },
  },
  {
    name: 'Wisdom Keeper prompt excludes disallowed private context',
    run: () => {
      const prompt = buildWisdomKeeperPromptBundle(
        { goals: true, goalEvolution: true, habits: true, journaling: false, reflections: false, visionBoard: true, lifeStage: false },
        {
          goals: [{ title: 'Ship demo', progressNote: 'Draft is ready' }],
          recentReflectionSignals: [{ title: 'Private journal', note: 'SECRET_JOURNAL_DETAIL', tags: ['private'] }],
          lifeWheelCheckins: [{ date: '2026-07-08', scores: { health: 7 } }],
        },
      );
      assert(prompt.userPrompt.includes('Ship demo'), 'Allowed goals should be included');
      assert(!prompt.userPrompt.includes('SECRET_JOURNAL_DETAIL'), 'Journal note must be excluded when journaling is disabled');
      assert(!prompt.userPrompt.includes('health'), 'Life wheel data must be excluded when reflections are disabled');
    },
  },
  {
    name: 'Wisdom Keeper output is constrained to short reflection copy',
    run: () => {
      const cleaned = sanitizeWisdomKeeperReflection('A priority is not always the loudest thing. Sometimes it is the quiet thing you keep returning to. Extra sentence. Fourth sentence should be cut.');
      assert(cleaned !== null, 'Expected valid reflection');
      assert((cleaned?.match(/[.!?]/g)?.length ?? 0) <= 3, 'Reflection should be at most 3 sentences');
      assert((cleaned?.length ?? 0) <= 360, 'Reflection should be short-to-medium');
      assertEqual(sanitizeWisdomKeeperReflection('As an AI, you must do this.'), null, 'Unsafe/generic AI output should be rejected');
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
