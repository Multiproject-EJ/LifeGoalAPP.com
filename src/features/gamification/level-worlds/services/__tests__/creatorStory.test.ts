import { assert, type TestCase } from './testHarness';
import { FULL_CREATOR_NOTE } from '../../../../onboarding/FounderWelcome';
import {
  CREATOR_STORY_BEATS,
  creatorStoryBeatDurationMs,
  creatorStoryLineDelayMs,
} from '../../../../onboarding/creatorStoryBeats';

const note = FULL_CREATOR_NOTE.body.join(' ').replace(/\n/g, ' ').toLowerCase();

export const creatorStoryTests: TestCase[] = [
  {
    name: 'creator story: every line is the creator’s own words, verbatim from the note',
    run: () => {
      for (const beat of CREATOR_STORY_BEATS) {
        for (const text of [...beat.lines, ...(beat.whisper ? [beat.whisper] : [])]) {
          // Sentences may be selected, but never reworded.
          for (const sentence of text.split(/(?<=\.)\s+/)) {
            assert(note.includes(sentence.toLowerCase().replace(/\.$/, '')), `"${sentence}" (${beat.id}) comes from the note`);
          }
        }
      }
      assert(CREATOR_STORY_BEATS[CREATOR_STORY_BEATS.length - 1].lines[0] === 'Thank you for being here early.', 'ends on the thank-you');
    },
  },
  {
    name: 'creator story: beats are readable, never rushed, never sluggish, and lines arrive in order',
    run: () => {
      for (const beat of CREATOR_STORY_BEATS) {
        const duration = creatorStoryBeatDurationMs(beat);
        assert(duration >= 3_600 && duration <= 11_000, `${beat.id}: ${duration}ms`);
        for (let i = 1; i < beat.lines.length; i += 1) {
          assert(creatorStoryLineDelayMs(beat, i) > creatorStoryLineDelayMs(beat, i - 1), `${beat.id}: line ${i} after line ${i - 1}`);
          assert(creatorStoryLineDelayMs(beat, i) < duration, `${beat.id}: line ${i} shows before the beat ends`);
        }
      }
      assert(new Set(CREATOR_STORY_BEATS.map((beat) => beat.scene)).size === CREATOR_STORY_BEATS.length, 'every beat has its own scene');
    },
  },
  {
    name: 'creator story: full-screen portal with scroll lock, and both entry points open it',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const story = fsMod.readFileSync('src/features/onboarding/CreatorStory.tsx', 'utf8');
      const css = fsMod.readFileSync('src/features/onboarding/creator-story.css', 'utf8');
      assert(story.includes('createPortal(content, document.body)') && story.includes('lockFullscreenPageScroll()'), 'portal + scroll lock');
      assert(/\.creator-story \{[^}]*position: fixed;[^}]*inset: 0;/.test(css), 'viewport-anchored full screen');
      assert(fsMod.readFileSync('src/features/account/MyAccountPanel.tsx', 'utf8').includes('<CreatorStory'), 'About HabitGame plays the story');
      assert(fsMod.readFileSync('src/features/onboarding/FounderWelcome.tsx', 'utf8').includes('<CreatorStory'), 'founder welcome plays the story');
    },
  },
];
