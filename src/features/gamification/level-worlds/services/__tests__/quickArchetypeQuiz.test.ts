import {
  QUICK_ARCHETYPE_QUESTIONS,
  resolvePlayerArchetypeLabel,
  scoreQuickArchetypeQuiz,
} from '../../../../identity/quickArchetype/quickArchetypeQuiz';
import { assert, assertEqual, type TestCase } from './testHarness';

const allAnswers = (id: string) => Object.fromEntries(QUICK_ARCHETYPE_QUESTIONS.map((q) => [q.id, id]));

export const quickArchetypeQuizTests: TestCase[] = [
  {
    name: 'quick quiz: 8 questions with 4 answers, each answer style leans to its suit',
    run: () => {
      assertEqual(QUICK_ARCHETYPE_QUESTIONS.length, 8, 'eight questions');
      assert(QUICK_ARCHETYPE_QUESTIONS.every((q) => q.answers.length === 4), 'four answers each');
      const suits = ['a', 'b', 'c', 'd'].map((id) => scoreQuickArchetypeQuiz(allAnswers(id)).dominant.suit);
      assertEqual(suits.join(','), 'power,heart,mind,spirit', `answer styles map to suits (got ${suits.join(',')})`);
    },
  },
  {
    name: 'quick quiz: deterministic, and the leaderboard label prefers the account',
    run: () => {
      const answers = { q1: 'a', q2: 'b', q3: 'c', q4: 'd', q5: 'a', q6: 'b', q7: 'c', q8: 'd' };
      assertEqual(scoreQuickArchetypeQuiz(answers).dominant.id, scoreQuickArchetypeQuiz(answers).dominant.id, 'same answers, same card');
      const local = { cardId: 'sage', name: 'Sage', version: 1, atIso: '' };
      assertEqual(resolvePlayerArchetypeLabel({ personality_profile_type: 'Commander' }, local), 'Commander', 'account label wins');
      assertEqual(resolvePlayerArchetypeLabel({ archetype: 'Uncharted' }, local), 'Sage', 'Uncharted counts as none');
      assertEqual(resolvePlayerArchetypeLabel({}, null), null, 'no archetype yet: take the quiz');
    },
  },
  {
    name: 'quick quiz spreads players across the deck, and the game menu opens the scoreboard',
    run: async () => {
      const cards = new Set<string>();
      const ids = ['a', 'b', 'c', 'd'];
      for (let seed = 0; seed < 256; seed += 1) {
        const answers = Object.fromEntries(QUICK_ARCHETYPE_QUESTIONS.map((q, i) => [q.id, ids[(seed >> (i % 4) * 2 ^ i) & 3]]));
        cards.add(scoreQuickArchetypeQuiz(answers).dominant.id);
      }
      assert(cards.size >= 10, `mixed answers reach many cards (got ${cards.size})`);
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      const modal = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunScoreboardModal.tsx', 'utf8');
      assert(board.includes('🏆 Scoreboard'), 'the game menu has a Scoreboard entry');
      assert(board.includes('showSolarMapOverlay || showDevDailySpinPreview || showScoreboard ||'), 'the scoreboard owns attention while open');
      assert(modal.includes("data: { personality_profile_type: dominant.name"), 'the result is saved where the league reads it');
      assert(modal.includes("useState<Phase>(preview?.phase ?? (archetypeLabel ? 'league' : 'intro'))"), 'no archetype yet: the quiz comes first');
    },
  },
];
