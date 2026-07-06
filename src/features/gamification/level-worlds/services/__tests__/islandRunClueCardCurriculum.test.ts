/**
 * Tests for the Daily Clue Card curriculum adapter. Verifies the ring-tile draw
 * now frames its two questions per chapter (fixing the "same two questions on
 * every island" repetition) while staying well-formed and deterministic.
 */
import { getClueCardPromptsForIsland } from '../islandRunClueCardCurriculum';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunClueCardCurriculumTests: TestCase[] = [
  {
    name: 'every authored island (1..120) yields well-formed prompts',
    run: () => {
      for (let island = 1; island <= 120; island += 1) {
        const p = getClueCardPromptsForIsland(island);
        assert(p.themeLabel.trim().length > 0, `island ${island} empty themeLabel`);
        assert(p.goodQuestion.trim().length > 0, `island ${island} empty goodQuestion`);
        assert(p.badQuestion.trim().length > 0, `island ${island} empty badQuestion`);
        assert(p.typicalDayLabel.trim().length > 0, `island ${island} empty typicalDayLabel`);
        assert(
          p.goodQuestion !== p.badQuestion,
          `island ${island} good/bad questions should differ`,
        );
      }
    },
  },
  {
    name: 'question framing actually varies across islands (not one fixed pair)',
    run: () => {
      const distinct = new Set<string>();
      for (let island = 1; island <= 120; island += 1) {
        const p = getClueCardPromptsForIsland(island);
        distinct.add(`${p.goodQuestion}||${p.badQuestion}`);
      }
      assert(distinct.size >= 12, `expected many distinct question pairs, got ${distinct.size}`);
    },
  },
  {
    name: 'theme label matches the chapter the island belongs to',
    run: () => {
      assertEqual(getClueCardPromptsForIsland(1).themeLabel, 'The Living Wheel', 'island 1');
      assertEqual(getClueCardPromptsForIsland(21).themeLabel, 'The Inner Compass', 'island 21');
      assertEqual(getClueCardPromptsForIsland(41).themeLabel, 'The Living Horizon', 'island 41');
      assertEqual(getClueCardPromptsForIsland(120).themeLabel, 'The Personal Playbook', 'island 120');
    },
  },
  {
    name: 'adjacent islands within a chapter cycle through variants',
    run: () => {
      const a = getClueCardPromptsForIsland(1).goodQuestion;
      const b = getClueCardPromptsForIsland(2).goodQuestion;
      const c = getClueCardPromptsForIsland(3).goodQuestion;
      assert(a !== b || b !== c, 'three consecutive islands should not all be identical');
    },
  },
  {
    name: 'deterministic: same island returns the same prompts',
    run: () => {
      const a = getClueCardPromptsForIsland(63);
      const b = getClueCardPromptsForIsland(63);
      assertEqual(a.goodQuestion, b.goodQuestion, 'stable goodQuestion');
      assertEqual(a.badQuestion, b.badQuestion, 'stable badQuestion');
    },
  },
  {
    name: 'out-of-range islands fall back to the default generic wording',
    run: () => {
      const p = getClueCardPromptsForIsland(0);
      assertEqual(p.goodQuestion, 'What made you feel good today?', 'default good');
      assertEqual(p.badQuestion, 'What, if anything, made you feel bad?', 'default bad');
    },
  },
];
