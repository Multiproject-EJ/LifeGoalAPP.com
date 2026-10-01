import { assert, assertEqual, type TestCase } from './testHarness';
import { createMinigameFeedbackStore, getMinigameRatingKey, getTypicalRoundMs, resolveRatingFromDrag, shouldAskMinigameRating } from '../minigameFeedback';

export const minigameFeedbackTests: TestCase[] = [
  {
    name: 'minigame feedback: rating only after getting halfway in, once per game per event, never for non-Arena games',
    run: () => {
      const store = createMinigameFeedbackStore();
      const typical = getTypicalRoundMs('space_excavator')!;
      assert(typical > 0, 'catalogue games have a typical round');
      const base = { gameId: 'space_excavator', eventId: 'space_excavator:1', store };
      assert(!shouldAskMinigameRating({ ...base, elapsedMs: typical * 0.3, completed: false }), 'a quick peek is not enough');
      assert(shouldAskMinigameRating({ ...base, elapsedMs: typical * 0.5, completed: false }), 'halfway through asks');
      assert(shouldAskMinigameRating({ ...base, elapsedMs: 1000, completed: true }), 'a finished round asks');
      store.ratings[getMinigameRatingKey('space_excavator', 'space_excavator:1')] = { rating: 4, atMs: 1 };
      assert(!shouldAskMinigameRating({ ...base, elapsedMs: typical, completed: true }), 'asked once per event');
      assert(shouldAskMinigameRating({ ...base, eventId: 'space_excavator:2', elapsedMs: typical, completed: true }), 'a new event may ask again');
      assert(!shouldAskMinigameRating({ gameId: 'shooter_blitz', eventId: null, elapsedMs: 1e9, completed: true, store }), 'boss trials and other games are never rated');
    },
  },
  {
    name: 'minigame feedback: the vertical drag maps to 5 levels; the island-complete screen offers the revisit heart',
    run: async () => {
      assertEqual(resolveRatingFromDrag(0), 1, 'bottom = not for me');
      assertEqual(resolveRatingFromDrag(0.5), 3, 'middle = okay');
      assertEqual(resolveRatingFromDrag(1), 5, 'top = loved it');
      assertEqual(resolveRatingFromDrag(Number.NaN), 1, 'junk input is safe');
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('lastMinigameCompletedRef.current = Boolean(result.completed);'), 'the finished flag is captured');
      assert(board.includes('<MinigameRatingModal'), 'the rating modal is shown');
      assert(board.includes('className={`island-clear-celebration__revisit'), 'the revisit heart is on the island-complete screen');
      const modal = fsMod.readFileSync('src/features/gamification/level-worlds/components/MinigameRatingModal.tsx', 'utf8');
      assert(modal.includes('aria-orientation="vertical"') && modal.includes('useControllerShopScrollLock()') && modal.includes('Skip'), 'accessible vertical slider, scroll locked, optional');
    },
  },
];
