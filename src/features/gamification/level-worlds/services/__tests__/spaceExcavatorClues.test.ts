import { resolveSpaceExcavatorClue } from '../spaceExcavatorClues';
import { assertEqual, type TestCase } from './testHarness';

export const spaceExcavatorCluesTests: TestCase[] = [
  {
    name: 'direct object tile resolves to relic_piece',
    run: () => {
      const clue = resolveSpaceExcavatorClue({ tileId: 12, boardSize: 5, objectTileIds: [12, 13] });
      assertEqual(clue.type, 'relic_piece', 'object tile should resolve to relic_piece');
      assertEqual(clue.shortMessage, 'Relic piece found!', 'relic_piece should use found message');
    },
  },
  {
    name: 'adjacent tile including diagonal resolves to hot',
    run: () => {
      assertEqual(resolveSpaceExcavatorClue({ tileId: 6, boardSize: 5, objectTileIds: [12] }).type, 'hot', 'diagonal adjacent tile should resolve to hot');
      assertEqual(resolveSpaceExcavatorClue({ tileId: 11, boardSize: 5, objectTileIds: [12] }).type, 'hot', 'orthogonal adjacent tile should resolve to hot');
    },
  },
  {
    name: 'manhattan distance two resolves to warm',
    run: () => {
      assertEqual(resolveSpaceExcavatorClue({ tileId: 10, boardSize: 5, objectTileIds: [12] }).type, 'warm', 'horizontal manhattan distance two should resolve to warm');
      assertEqual(resolveSpaceExcavatorClue({ tileId: 2, boardSize: 5, objectTileIds: [12] }).type, 'warm', 'vertical manhattan distance two should resolve to warm');
    },
  },
  {
    name: 'far tile resolves to cold',
    run: () => {
      assertEqual(resolveSpaceExcavatorClue({ tileId: 0, boardSize: 5, objectTileIds: [24] }).type, 'cold', 'far tile should resolve to cold');
    },
  },
  {
    name: 'board edge and corner adjacency does not wrap rows',
    run: () => {
      assertEqual(resolveSpaceExcavatorClue({ tileId: 4, boardSize: 5, objectTileIds: [5] }).type, 'cold', 'edge positions should not wrap across rows');
      assertEqual(resolveSpaceExcavatorClue({ tileId: 0, boardSize: 5, objectTileIds: [6] }).type, 'hot', 'corner diagonal should resolve to hot');
    },
  },
  {
    name: 'invalid tile id safely falls back to cold',
    run: () => {
      assertEqual(resolveSpaceExcavatorClue({ tileId: -1, boardSize: 5, objectTileIds: [0] }).type, 'cold', 'negative tile should resolve to cold');
      assertEqual(resolveSpaceExcavatorClue({ tileId: 25, boardSize: 5, objectTileIds: [24] }).type, 'cold', 'out-of-range tile should resolve to cold');
      assertEqual(resolveSpaceExcavatorClue({ tileId: 0, boardSize: 0, objectTileIds: [0] }).type, 'cold', 'invalid board size should resolve to cold');
    },
  },
];
