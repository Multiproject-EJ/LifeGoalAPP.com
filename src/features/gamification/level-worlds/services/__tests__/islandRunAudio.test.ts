import {
  playIslandRunSound,
  setIslandRunAudioEnabled,
} from '../islandRunAudio';
import { assertEqual, type TestCase } from './testHarness';

type AudioListener = () => void;

class MockAudioElement {
  static created: MockAudioElement[] = [];

  readonly src: string;
  preload = '';
  volume = 1;
  currentTime = 0;
  paused = true;
  ended = false;
  playCount = 0;
  rejectPlay = false;
  private readonly listeners = new Map<string, AudioListener[]>();

  constructor(src: string) {
    this.src = src;
    MockAudioElement.created.push(this);
  }

  addEventListener(type: string, listener: AudioListener): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  cloneNode(): MockAudioElement {
    const clone = new MockAudioElement(this.src);
    clone.preload = this.preload;
    clone.volume = this.volume;
    return clone;
  }

  play(): Promise<void> {
    this.playCount += 1;
    this.paused = false;
    return this.rejectPlay ? Promise.reject(new Error('play rejected')) : Promise.resolve();
  }

  emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }
}

function installMockAudio(): () => void {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousAudio = Object.getOwnPropertyDescriptor(globalThis, 'Audio');

  Object.defineProperty(globalThis, 'window', {
    value: {},
    configurable: true,
  });
  Object.defineProperty(globalThis, 'Audio', {
    value: MockAudioElement,
    configurable: true,
  });

  return () => {
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
  };
}

function withMockNow(now: number): (nextNow: number) => void {
  Date.now = () => now;
  return (nextNow: number) => {
    now = nextNow;
  };
}

function resetMockAudio(): void {
  MockAudioElement.created = [];
  setIslandRunAudioEnabled(true);
}

export const islandRunAudioTests: TestCase[] = [
  {
    name: 'playIslandRunSound lazily creates and plays mapped SFX audio',
    run: async () => {
      const restoreAudio = installMockAudio();
      const originalNow = Date.now;
      try {
        resetMockAudio();
        withMockNow(10_000);

        playIslandRunSound('roll');
        await Promise.resolve();

        assertEqual(MockAudioElement.created.length, 1, 'expected one SFX audio element');
        assertEqual(
          MockAudioElement.created[0].src,
          '/assets/audio/sfx/sfx_dice_roll.mp3',
          'expected roll SFX asset path',
        );
        assertEqual(MockAudioElement.created[0].playCount, 1, 'expected SFX playback');
      } finally {
        Date.now = originalNow;
        restoreAudio();
      }
    },
  },
  {
    name: 'playIslandRunSound respects the Island Run audio toggle',
    run: () => {
      const restoreAudio = installMockAudio();
      const originalNow = Date.now;
      try {
        resetMockAudio();
        withMockNow(20_000);
        setIslandRunAudioEnabled(false);

        playIslandRunSound('egg_set');

        assertEqual(MockAudioElement.created.length, 0, 'audio disabled should not create SFX audio');
      } finally {
        setIslandRunAudioEnabled(true);
        Date.now = originalNow;
        restoreAudio();
      }
    },
  },
  {
    name: 'playIslandRunSound throttles rapid token movement SFX',
    run: () => {
      const restoreAudio = installMockAudio();
      const originalNow = Date.now;
      try {
        resetMockAudio();
        const setNow = withMockNow(30_000);

        playIslandRunSound('token_move');
        playIslandRunSound('token_move');
        setNow(30_091);
        playIslandRunSound('token_move');

        assertEqual(MockAudioElement.created.length, 2, 'expected base audio plus one clone after throttle expires');
        assertEqual(MockAudioElement.created[0].playCount, 1, 'expected first token move playback');
        assertEqual(MockAudioElement.created[1].playCount, 1, 'expected post-throttle clone playback');
      } finally {
        Date.now = originalNow;
        restoreAudio();
      }
    },
  },
  {
    name: 'playIslandRunSound treats missing assets and rejected playback as safe no-ops',
    run: async () => {
      const restoreAudio = installMockAudio();
      const originalNow = Date.now;
      try {
        resetMockAudio();
        const setNow = withMockNow(40_000);

        playIslandRunSound('egg_ready');
        MockAudioElement.created[0].rejectPlay = true;
        MockAudioElement.created[0].emit('error');
        await Promise.resolve();
        setNow(40_100);

        playIslandRunSound('egg_ready');

        assertEqual(MockAudioElement.created.length, 1, 'failed SFX assets should not be recreated');
      } finally {
        Date.now = originalNow;
        restoreAudio();
      }
    },
  },
];
