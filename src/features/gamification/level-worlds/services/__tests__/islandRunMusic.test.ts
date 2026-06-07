import {
  applyIslandRunMusicContext,
  getIslandRunBoardMusicPlaylist,
  isIslandRunDreamtIsland,
  playIslandRunMusic,
  playIslandRunMusicPlaylist,
  resetIslandRunMusicForTests,
  resolveIslandRunMusicContext,
  stopIslandRunMusic,
} from '../islandRunMusic';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

type IntervalCallback = () => void;

class MockMusicAudioElement {
  static created: MockMusicAudioElement[] = [];

  readonly src: string;
  preload = '';
  volume = 1;
  currentTime = 0;
  paused = true;
  loop = false;
  onended: (() => void) | null = null;
  playCount = 0;
  pauseCount = 0;

  constructor(src: string) {
    this.src = src;
    MockMusicAudioElement.created.push(this);
  }

  play(): Promise<void> {
    this.playCount += 1;
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.pauseCount += 1;
    this.paused = true;
  }

  emitEnded(): void {
    this.onended?.();
  }
}

function installMockMusicAudio(): {
  runIntervals: () => void;
  setNow: (nextNow: number) => void;
  restore: () => void;
} {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousAudio = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
  const originalNow = Date.now;
  let now = 10_000;
  let nextTimerId = 1;
  const intervals = new Map<number, IntervalCallback>();

  Date.now = () => now;
  Object.defineProperty(globalThis, 'window', {
    value: {
      setInterval: (callback: IntervalCallback) => {
        const timerId = nextTimerId;
        nextTimerId += 1;
        intervals.set(timerId, callback);
        return timerId;
      },
      clearInterval: (timerId: number) => {
        intervals.delete(timerId);
      },
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'Audio', {
    value: MockMusicAudioElement,
    configurable: true,
  });

  return {
    runIntervals: () => {
      for (const callback of Array.from(intervals.values())) {
        callback();
      }
    },
    setNow: (nextNow: number) => {
      now = nextNow;
    },
    restore: () => {
      resetIslandRunMusicForTests();
      Date.now = originalNow;
      if (previousWindow) {
        Object.defineProperty(globalThis, 'window', previousWindow);
      } else {
        Reflect.deleteProperty(globalThis, 'window');
      }
      if (previousAudio) {
        Object.defineProperty(globalThis, 'Audio', previousAudio);
      } else {
        Reflect.deleteProperty(globalThis, 'Audio');
      }
      MockMusicAudioElement.created = [];
    },
  };
}

function resetMockMusicAudio(): void {
  resetIslandRunMusicForTests();
  MockMusicAudioElement.created = [];
}

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
  {
    name: 'resolveIslandRunMusicContext prioritizes celebration, then shop, then board playlist',
    run: () => {
      assertDeepEqual(
        resolveIslandRunMusicContext({
          musicEnabled: false,
          effectiveIslandNumber: 1,
          showShopPanel: true,
          showIslandClearCelebration: true,
        }),
        { kind: 'none' },
        'disabled music should resolve to none',
      );
      assertDeepEqual(
        resolveIslandRunMusicContext({
          musicEnabled: true,
          effectiveIslandNumber: 1,
          showShopPanel: true,
          showIslandClearCelebration: true,
        }),
        { kind: 'track', trackId: 'new-island-celebration' },
        'celebration music should win over shop music',
      );
      assertDeepEqual(
        resolveIslandRunMusicContext({
          musicEnabled: true,
          effectiveIslandNumber: 1,
          showShopPanel: true,
          showIslandClearCelebration: false,
        }),
        { kind: 'track', trackId: 'market-lounge' },
        'shop music should win over board music',
      );
      assertDeepEqual(
        resolveIslandRunMusicContext({
          musicEnabled: true,
          effectiveIslandNumber: 10,
          showShopPanel: false,
          showIslandClearCelebration: false,
        }),
        { kind: 'playlist', trackIds: ['island-board-ambient', 'luxury-reward', 'boss-rhythm-duel'] },
        'normal board state should resolve to the board playlist',
      );
    },
  },
  {
    name: 'playIslandRunMusic fades in and stopIslandRunMusic fades out before reset',
    run: async () => {
      const mockAudio = installMockMusicAudio();
      try {
        resetMockMusicAudio();

        playIslandRunMusic('market-lounge', { fadeMs: 100 });
        await Promise.resolve();

        const audio = MockMusicAudioElement.created[0];
        assertEqual(audio.src, '/assets/audio/music/Lantern Tide.mp3', 'expected market lounge asset');
        assertEqual(audio.playCount, 1, 'expected track playback');
        assertEqual(audio.volume, 0, 'fade-in should start at zero volume');

        mockAudio.setNow(10_100);
        mockAudio.runIntervals();
        assertEqual(audio.volume, 0.28, 'fade-in should reach the Island Run music volume');

        stopIslandRunMusic('market-lounge', { fadeMs: 100 });
        mockAudio.setNow(10_150);
        mockAudio.runIntervals();
        assertEqual(audio.volume, 0.14, 'fade-out should ramp the current track volume down');
        assertEqual(audio.paused, false, 'track should continue playing until fade-out completes');

        mockAudio.setNow(10_200);
        mockAudio.runIntervals();
        assertEqual(audio.paused, true, 'fade-out completion should pause the track');
        assertEqual(audio.currentTime, 0, 'fade-out completion should reset the track position');
        assertEqual(audio.volume, 0.28, 'stopped tracks should be restored to the default music volume');
      } finally {
        mockAudio.restore();
      }
    },
  },
  {
    name: 'playIslandRunMusicPlaylist keeps looping through playlist tracks',
    run: async () => {
      const mockAudio = installMockMusicAudio();
      try {
        resetMockMusicAudio();

        playIslandRunMusicPlaylist(['luxury-reward', 'event-jackpot'], { fadeMs: 0 });
        await Promise.resolve();
        const firstTrack = MockMusicAudioElement.created[0];

        firstTrack.emitEnded();
        await Promise.resolve();
        const secondTrack = MockMusicAudioElement.created[1];

        secondTrack.emitEnded();
        await Promise.resolve();

        assertEqual(firstTrack.playCount, 2, 'playlist should wrap and replay the first track after the final track ends');
        assertEqual(secondTrack.playCount, 1, 'playlist should play the second track after the first track ends');
      } finally {
        mockAudio.restore();
      }
    },
  },
  {
    name: 'applyIslandRunMusicContext stops board music before starting panel music contexts',
    run: async () => {
      const mockAudio = installMockMusicAudio();
      try {
        resetMockMusicAudio();

        applyIslandRunMusicContext({ kind: 'playlist', trackIds: ['luxury-reward', 'event-jackpot'] }, { fadeMs: 100 });
        await Promise.resolve();
        const boardTrack = MockMusicAudioElement.created[0];
        mockAudio.setNow(10_100);
        mockAudio.runIntervals();

        applyIslandRunMusicContext({ kind: 'track', trackId: 'market-lounge' }, { fadeMs: 100 });
        await Promise.resolve();
        const panelTrack = MockMusicAudioElement.created[1];

        assertEqual(boardTrack.paused, true, 'outgoing board music should stop before panel music starts');
        assertEqual(panelTrack.src, '/assets/audio/music/Lantern Tide.mp3', 'expected panel music to start');
        assertEqual(panelTrack.volume, 0, 'incoming panel music should begin at zero volume');

        mockAudio.setNow(10_200);
        mockAudio.runIntervals();
        assertEqual(boardTrack.paused, true, 'outgoing board music should stop after fade-out');
        assertEqual(panelTrack.volume, 0.28, 'incoming panel music should finish fading in');
      } finally {
        mockAudio.restore();
      }
    },
  },
];
