import { resolveSpaceExcavatorClue } from '../spaceExcavatorClues';
import { assertEqual, type TestCase } from './testHarness';

export const spaceExcavatorCluesTests: TestCase[] = [
  {
    name: 'direct object tile resolves to relic_piece',
    run: () => {
      const clue = resolveSpaceExcavatorClue({ tileId: 12, boardSize: 5, objectTileIds: [12, 13] });
      assertEqual(clue.type, 'relic_piece');
      assertEqual(clue.shortMessage, 'Relic piece found!');
    },
  },
  {
    name: 'adjacent tile including diagonal resolves to hot',
    run: () => {
      assertEqual(resolveSpaceExcavatorClue({ tileId: 6, boardSize: 5, objectTileIds: [12] }).type, 'hot');
      assertEqual(resolveSpaceExcavatorClue({ tileId: 11, boardSize: 5, objectTileIds: [12] }).type, 'hot');
    },
  },
  {
    name: 'manhattan distance two resolves to warm',
    run: () => {
      assertEqual(resolveSpaceExcavatorClue({ tileId: 10, boardSize: 5, objectTileIds: [12] }).type, 'warm');
      assertEqual(resolveSpaceExcavatorClue({ tileId: 2, boardSize: 5, objectTileIds: [12] }).type, 'warm');
    },
  },
  {
    name: 'far tile resolves to cold',
    run: () => {
      assertEqual(resolveSpaceExcavatorClue({ tileId: 0, boardSize: 5, objectTileIds: [24] }).type, 'cold');
    },
  },
  {
    name: 'board edge and corner adjacency does not wrap rows',
    run: () => {
      assertEqual(resolveSpaceExcavatorClue({ tileId: 4, boardSize: 5, objectTileIds: [5] }).type, 'cold');
      assertEqual(resolveSpaceExcavatorClue({ tileId: 0, boardSize: 5, objectTileIds: [6] }).type, 'hot');
    },
  },
  {
    name: 'invalid tile id safely falls back to cold',
    run: () => {
      assertEqual(resolveSpaceExcavatorClue({ tileId: -1, boardSize: 5, objectTileIds: [0] }).type, 'cold');
      assertEqual(resolveSpaceExcavatorClue({ tileId: 25, boardSize: 5, objectTileIds: [24] }).type, 'cold');
      assertEqual(resolveSpaceExcavatorClue({ tileId: 0, boardSize: 0, objectTileIds: [0] }).type, 'cold');
    },
  },
];
