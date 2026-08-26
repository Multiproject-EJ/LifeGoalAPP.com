import {
  getIslandMoneyPaletteId,
  getIslandMoneyPaletteLabel,
  ISLAND_MONEY_PALETTE_IDS,
} from '../islandMoneyThemes';
import { assertEqual, type TestCase } from './testHarness';

export const islandMoneyThemesTests: TestCase[] = [
  {
    name: 'cycles the four approved money palettes evenly by island',
    run: () => {
      const expected = ['prism', 'citrus', 'candy', 'metals', 'prism', 'citrus', 'candy', 'metals'];
      expected.forEach((palette, index) => {
        assertEqual(
          getIslandMoneyPaletteId(index + 1),
          palette,
          `Expected Island ${index + 1} to use ${palette}`,
        );
      });
      assertEqual(ISLAND_MONEY_PALETTE_IDS.length, 4, 'Expected exactly four approved palette families');
      assertEqual(getIslandMoneyPaletteId(120), 'metals', 'Expected Island 120 to finish on Metal + Gem');
    },
  },
  {
    name: 'normalizes invalid island numbers without persisted theme state',
    run: () => {
      assertEqual(getIslandMoneyPaletteId(0), 'prism', 'Expected zero to normalize to Island 1');
      assertEqual(getIslandMoneyPaletteId(-9), 'prism', 'Expected negatives to normalize to Island 1');
      assertEqual(getIslandMoneyPaletteId(2.9), 'citrus', 'Expected fractional islands to floor');
      assertEqual(getIslandMoneyPaletteId(Number.POSITIVE_INFINITY), 'prism', 'Expected infinity to normalize safely');
      assertEqual(getIslandMoneyPaletteLabel(4), 'Metal + Gem', 'Expected palette labels to follow the same mapping');
    },
  },
];
