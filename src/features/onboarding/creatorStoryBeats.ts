/**
 * The creator note as a full-screen portrait story: one beat per screen,
 * each with its own animated scene. Lines are taken verbatim from
 * FULL_CREATOR_NOTE so the story never drifts from the note itself.
 */

export type CreatorStoryScene =
  | 'spark'
  | 'checklist'
  | 'storm'
  | 'doubt'
  | 'island'
  | 'quest'
  | 'wheel'
  | 'steps'
  | 'living'
  | 'demo'
  | 'shape'
  | 'thanks';

export type CreatorStoryBeat = {
  id: string;
  scene: CreatorStoryScene;
  /** Big line(s), revealed one after another. */
  lines: string[];
  /** Optional quieter supporting line. */
  whisper?: string;
  /** Background mood: [top, bottom] gradient colours. */
  mood: [string, string];
};

export const CREATOR_STORY_BEATS: CreatorStoryBeat[] = [
  {
    id: 'alive',
    scene: 'spark',
    lines: ['I’m building HabitGame because I believe growth should feel more alive.'],
    mood: ['#05070f', '#141b3a'],
  },
  {
    id: 'hope',
    scene: 'checklist',
    lines: ['Most habit apps begin with a familiar kind of hope.'],
    whisper: 'You open the app, set goals, create habits, and imagine a better version of your life.',
    mood: ['#0b1d3a', '#1d3f6b'],
  },
  {
    id: 'real-life',
    scene: 'storm',
    lines: ['Then real life enters the picture.'],
    whisper: 'You miss a few days. Your energy changes. Your goals stop fitting. Or maybe you simply need to rest.',
    mood: ['#141821', '#2b2f3d'],
  },
  {
    id: 'failed',
    scene: 'doubt',
    lines: ['And when that happens, many habit apps start to feel like proof that you failed.'],
    mood: ['#1a0f14', '#2e1620'],
  },
  {
    id: 'different',
    scene: 'island',
    lines: ['I want HabitGame to feel different.'],
    whisper: 'A cozy game world, so there is always a gentle reason to return.',
    mood: ['#07314a', '#0e7490'],
  },
  {
    id: 'one-quest',
    scene: 'quest',
    lines: ['Your habits, goals, and reflections should feel connected.', 'They should feel like one personal quest.'],
    mood: ['#1b1045', '#3b1f7a'],
  },
  {
    id: 'balance',
    scene: 'wheel',
    lines: ['The goal is not perfection.'],
    whisper: 'A Life Wheel that becomes more balanced over time.',
    mood: ['#0c2a22', '#14532d'],
  },
  {
    id: 'sometimes',
    scene: 'steps',
    lines: [
      'Sometimes the next step is a habit.',
      'Sometimes it is a reflection.',
      'Sometimes it is a reset.',
      'Sometimes it is a small win.',
      'Sometimes it is changing the quest itself.',
    ],
    mood: ['#2a1a05', '#6b3d0a'],
  },
  {
    id: 'living-system',
    scene: 'living',
    lines: ['Your real-life progress grows the game, and the game helps guide you back toward a more aligned life.'],
    mood: ['#062a3a', '#155e75'],
  },
  {
    id: 'mission',
    scene: 'demo',
    lines: ['HabitGame is still in demo mode.', 'But that is the mission.'],
    whisper: 'Some features are live, some are previews, and many are still being built.',
    mood: ['#111827', '#1f2937'],
  },
  {
    id: 'shape',
    scene: 'shape',
    lines: ['I want early users to help shape what gets built next.'],
    mood: ['#1e1b4b', '#4338ca'],
  },
  {
    id: 'thanks',
    scene: 'thanks',
    lines: ['Thank you for being here early.'],
    mood: ['#2a1206', '#7c2d12'],
  },
];

/** Reading time per beat: enough for every line, never rushed or sluggish. */
export function creatorStoryBeatDurationMs(beat: CreatorStoryBeat): number {
  const characters = beat.lines.join(' ').length + (beat.whisper?.length ?? 0) * 0.6;
  return Math.round(Math.min(11_000, Math.max(3_600, 2_200 + characters * 55)));
}

/** Delay before each big line appears within a beat. */
export function creatorStoryLineDelayMs(beat: CreatorStoryBeat, lineIndex: number): number {
  if (beat.lines.length <= 1) return 350;
  const duration = creatorStoryBeatDurationMs(beat);
  return Math.round(350 + (lineIndex * (duration * 0.72)) / beat.lines.length);
}
