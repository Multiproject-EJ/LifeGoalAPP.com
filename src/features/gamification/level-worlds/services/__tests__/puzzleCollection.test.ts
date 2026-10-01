import { assert, assertEqual, type TestCase } from './testHarness';
import { getEventRotationTemplates } from '../islandRunEventEngine';
import { PUZZLE_PIECES_PER_PUZZLE, resolvePuzzleCollectionView, resolvePuzzlePiecePath } from '../puzzleCollection';
import { resolveIslandRunFeatureAccess } from '../islandRunFeatureAccess';
import { createOpeningGamesCampaignLedger } from '../islandRunSignatureMissions';

export const puzzleCollectionTests: TestCase[] = [
  {
    name: 'puzzle collection: the icon waits for Island 015 on new and existing saves',
    run: () => {
      for (const ledger of [undefined, createOpeningGamesCampaignLedger()]) {
        for (const island of [1, 2, 3, 8, 14]) {
          assert(!resolveIslandRunFeatureAccess({ currentIslandNumber: island, signatureMissionProgressByIsland: ledger }).puzzleCollection, `no puzzle icon on Island ${island}`);
        }
        for (const island of [15, 16, 120]) {
          assert(resolveIslandRunFeatureAccess({ currentIslandNumber: island, signatureMissionProgressByIsland: ledger }).puzzleCollection, `puzzle collection on Island ${island}`);
        }
      }
    },
  },
  {
    name: 'puzzle collection: reward-bar pieces fill the active event puzzle; finished stickers fill the gallery',
    run: () => {
      const templates = getEventRotationTemplates();
      const second = templates[1]!;
      const view = resolvePuzzleCollectionView({
        fragments: 3,
        stickerInventory: { [templates[0]!.stickerId]: 2 },
        activeEventId: `${second.eventId}:1700000000000`,
      });
      assertEqual(view.current.template.eventId, second.eventId, 'the active event puzzle is being filled');
      assertEqual(view.piecesPlaced, 3, 'three pieces placed');
      assertEqual(view.piecesPerPuzzle, 5, 'five-piece puzzles, matching the sticker rule');
      assertEqual(view.completedPuzzles, 2, 'two finished puzzles');
      assertEqual(view.distinctCompleted, 1, 'one gallery picture complete');
      assertEqual(resolvePuzzleCollectionView({ fragments: 0, stickerInventory: {}, activeEventId: null }).current.template.eventId, templates[0]!.eventId, 'no event: first template');
      assertEqual(resolvePuzzleCollectionView({ fragments: Number.NaN, stickerInventory: {}, activeEventId: 'bogus' }).piecesPlaced, 0, 'invalid input is safe');
    },
  },
  {
    name: 'puzzle collection: pieces are closed jigsaw paths that interlock with neighbours',
    run: () => {
      for (let index = 0; index < PUZZLE_PIECES_PER_PUZZLE; index += 1) {
        const path = resolvePuzzlePiecePath(index);
        assert(path.startsWith('M') && path.endsWith('Z'), `piece ${index} is closed`);
        assert(!path.includes('NaN'), `piece ${index} has finite coordinates`);
        const curves = (path.match(/C/g) ?? []).length;
        const expected = (index > 0 ? 2 : 0) + (index < PUZZLE_PIECES_PER_PUZZLE - 1 ? 2 : 0);
        assertEqual(curves, expected, `piece ${index} has a knob on each shared edge`);
      }
    },
  },
];
