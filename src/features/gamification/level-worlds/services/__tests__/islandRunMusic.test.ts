import {
  getIslandRunBoardMusicPlaylist,
  isIslandRunDreamtIsland,
} from '../islandRunMusic';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandRunMusicTests: TestCase[] = [
  {
    name: 'isIslandRunDreamtIsland marks roughly one in ten positive islands as dreamt',
    run: () => {
      assertEqual(isIslandRunDreamtIsland(1), false, 'island 1 should not be dreamt');
      assertEqual(isIslandRunDreamtIsland(9), false, 'island 9 should not be dreamt');
      assertEqual(isIslandRunDreamtIsland(10), true, 'island 10 should be dreamt');
      assertEqual(isIslandRunDreamtIsland(20), true, 'island 20 should be dreamt');
      assertEqual(isIslandRunDreamtIsland(120), true, 'island 120 should be dreamt');
      assertEqual(isIslandRunDreamtIsland(0), false, 'island 0 should not be dreamt');
    },
  },
  {
    name: 'getIslandRunBoardMusicPlaylist only includes dreamy ambient on dreamt islands',
    run: () => {
      assertDeepEqual(
        getIslandRunBoardMusicPlaylist(1),
        ['luxury-reward', 'event-jackpot', 'boss-rhythm-duel'],
        'non-dreamt islands should start with non-dreamy music',
      );
      assertDeepEqual(
        getIslandRunBoardMusicPlaylist(10),
        ['island-board-ambient', 'luxury-reward', 'boss-rhythm-duel'],
        'dreamt islands should start with dreamy ambient music',
      );
    },
  },
];
