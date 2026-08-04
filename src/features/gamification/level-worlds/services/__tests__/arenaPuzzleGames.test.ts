import {
  CONCORD_PUZZLES,
  LEXICON_PUZZLES,
  SIGNAL_PATH_GRID_SIZE,
  SIGNAL_PATH_PUZZLES,
  TWIN_SIGIL_PUZZLES,
  differsByOneLetter,
  isConcordSelectionCorrect,
  isSignalPathStepValid,
  resolveArenaMastery,
  validateTwinSigilBoard,
} from '../arenaPuzzleGames';
import {
  ARENA_GAME_CATALOG,
  ARENA_PUZZLE_GAME_IDS,
  selectArenaGamePair,
} from '../islandRunArenaCatalog';
import { assert, assertEqual, type TestCase } from './testHarness';

export const arenaPuzzleGamesTests: TestCase[] = [
  {
    name: 'catalog preserves four rotation games and adds four puzzle exhibitions',
    run: () => {
      const ids = ARENA_GAME_CATALOG.map((game) => game.id);
      assertEqual(new Set(ids).size, ids.length, 'Arena ids must be unique');
      assertEqual(ARENA_GAME_CATALOG.filter((game) => game.availability === 'active_event').length, 4, 'four existing rotation games remain');
      ARENA_PUZZLE_GAME_IDS.forEach((id) => assert(ids.includes(id), `${id} should be in the Arena catalog`));
    },
  },
  {
    name: 'pair selector offers two different families and excludes inactive event games',
    run: () => {
      const pair = selectArenaGamePair({
        activeEventId: 'lucky_spin',
        rankedGameIds: ARENA_GAME_CATALOG.map((game) => game.id),
        disabledGameIds: [],
        recentGameIds: ['momentum_matrix'],
        seed: 'island-1-event-1',
      });
      assert(pair.primary.id !== pair.alternative.id, 'pair entries must differ');
      assert(pair.primary.family !== pair.alternative.family, 'pair should span different game families');
      const pairIds = [pair.primary.id, pair.alternative.id];
      assert(!pairIds.includes('feeding_frenzy'), 'inactive Feeding Frenzy should stay out of the pair');
      assert(!pairIds.includes('space_excavator'), 'inactive Space Excavator should stay out of the pair');
      assert(!pairIds.includes('companion_feast'), 'inactive Companion Feast should stay out of the pair');
    },
  },
  {
    name: 'every Concord puzzle contains three disjoint validated groups of four',
    run: () => {
      CONCORD_PUZZLES.forEach((puzzle) => {
        const words = puzzle.categories.flatMap((category) => category.words);
        assertEqual(words.length, 12, `${puzzle.id}: expected twelve words`);
        assertEqual(new Set(words).size, 12, `${puzzle.id}: words should be unique`);
        puzzle.categories.forEach((category) => {
          assertEqual(isConcordSelectionCorrect(puzzle, category.words)?.id, category.id, `${puzzle.id}: category should validate`);
        });
      });
    },
  },
  {
    name: 'every Lexicon answer changes exactly one letter from the previous answer',
    run: () => {
      LEXICON_PUZZLES.forEach((puzzle) => {
        let previous = puzzle.start;
        puzzle.steps.forEach((step) => {
          assert(differsByOneLetter(previous, step.answer), `${puzzle.id}: ${previous} -> ${step.answer} must change one letter`);
          assert(step.options.includes(step.answer), `${puzzle.id}: options must include ${step.answer}`);
          step.options.forEach((option) => {
            assert(differsByOneLetter(previous, option), `${puzzle.id}: option ${option} must be a legal move from ${previous}`);
          });
          previous = step.answer;
        });
        assertEqual(previous, puzzle.destination, `${puzzle.id}: final answer should reach destination`);
      });
    },
  },
  {
    name: 'puzzle catalog has enough launch variety to avoid immediate repeats',
    run: () => {
      assert(CONCORD_PUZZLES.length >= 6, 'Concord Categories should ship with at least six boards');
      assert(LEXICON_PUZZLES.length >= 6, 'Lexicon Relay should ship with at least six ladders');
      assert(SIGNAL_PATH_PUZZLES.length >= 12, 'Signal Path should ship with at least twelve routes');
      assert(TWIN_SIGIL_PUZZLES.length >= 6, 'Twin Sigils should ship with at least six boards');
    },
  },
  {
    name: 'every Signal Path is a complete adjacent route with ordered markers',
    run: () => {
      SIGNAL_PATH_PUZZLES.forEach((puzzle) => {
        assertEqual(puzzle.path.length, SIGNAL_PATH_GRID_SIZE ** 2, `${puzzle.id}: path should fill the grid`);
        assertEqual(new Set(puzzle.path).size, SIGNAL_PATH_GRID_SIZE ** 2, `${puzzle.id}: path should not revisit cells`);
        puzzle.path.slice(1).forEach((cell, index) => {
          assert(isSignalPathStepValid(puzzle.path[index]!, cell), `${puzzle.id}: path step ${index + 1} should be adjacent`);
        });
        assertEqual(puzzle.markerSteps[0], 0, `${puzzle.id}: first marker starts the route`);
        assertEqual(puzzle.markerSteps[puzzle.markerSteps.length - 1], puzzle.path.length - 1, `${puzzle.id}: final marker ends the route`);
      });
    },
  },
  {
    name: 'Twin Sigils authored solution satisfies all balance laws and givens',
    run: () => {
      TWIN_SIGIL_PUZZLES.forEach((puzzle) => {
        const result = validateTwinSigilBoard(puzzle.solution, puzzle.size);
        assert(result.valid, `${puzzle.id}: solution should be valid`);
        Object.entries(puzzle.givens).forEach(([index, value]) => {
          assertEqual(puzzle.solution[Number(index)], value, `${puzzle.id}: given ${index} must match solution`);
        });
      });
    },
  },
  {
    name: 'normalized mastery rewards completion while penalizing mistakes and hints',
    run: () => {
      const clean = resolveArenaMastery({ completionRatio: 1, mistakes: 0, hints: 0, elapsedSeconds: 30, parSeconds: 60 });
      const assisted = resolveArenaMastery({ completionRatio: 1, mistakes: 2, hints: 2, elapsedSeconds: 90, parSeconds: 60 });
      assertEqual(clean.stars, 3, 'clean solve should earn three stars');
      assert(clean.mastery > assisted.mastery, 'assistance and mistakes should lower mastery');
    },
  },
];
