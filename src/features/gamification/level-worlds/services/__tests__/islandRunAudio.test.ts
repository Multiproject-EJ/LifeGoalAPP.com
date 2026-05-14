import {
  playIslandRunSound,
  setIslandRunAudioEnabled,
} from '../islandRunAudio';
import { assertEqual, type TestCase } from './testHarness';

type AudioListener = () => void;
type AudioListenerEntry = {
  listener: AudioListener;
  once: boolean;
};

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
  private readonly listeners = new Map<string, AudioListenerEntry[]>();

  constructor(src: string) {
    this.src = src;
    MockAudioElement.created.push(this);
  }

  addEventListener(type: string, listener: AudioListener, options?: AddEventListenerOptions | boolean): void {
    const existing = this.listeners.get(type) ?? [];
    const once = typeof options === 'object' ? options.once === true : false;
    existing.push({ listener, once });
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
    const entries = this.listeners.get(type) ?? [];
    for (const { listener } of entries) {
      listener();
    }
    this.listeners.set(type, entries.filter((entry) => !entry.once));
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

function installMockNow(now: number): { setNow: (nextNow: number) => void; restore: () => void } {
  const originalNow = Date.now;
  Date.now = () => now;
  return {
    setNow: (nextNow: number) => {
      now = nextNow;
    },
    restore: () => {
      Date.now = originalNow;
    },
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
      const mockNow = installMockNow(10_000);
      try {
        resetMockAudio();

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
        mockNow.restore();
        restoreAudio();
      }
    },
  },
  {
    name: 'playIslandRunSound respects the Island Run audio toggle',
    run: () => {
      const restoreAudio = installMockAudio();
      const mockNow = installMockNow(20_000);
      try {
        resetMockAudio();
        setIslandRunAudioEnabled(false);

        playIslandRunSound('egg_set');

        assertEqual(MockAudioElement.created.length, 0, 'audio disabled should not create SFX audio');
      } finally {
        setIslandRunAudioEnabled(true);
        mockNow.restore();
        restoreAudio();
      }
    },
  },
  {
    name: 'playIslandRunSound throttles rapid token movement SFX',
    run: () => {
      const restoreAudio = installMockAudio();
      const mockNow = installMockNow(30_000);
      try {
        resetMockAudio();

        playIslandRunSound('token_move');
        playIslandRunSound('token_move');
        mockNow.setNow(30_091);
        playIslandRunSound('token_move');

        assertEqual(
          MockAudioElement.created.length,
          2,
          'expected the immediate repeat to be throttled, then one clone after throttle expires',
        );
        assertEqual(MockAudioElement.created[0].playCount, 1, 'expected first token move playback');
        assertEqual(MockAudioElement.created[1].playCount, 1, 'expected post-throttle clone playback');
      } finally {
        mockNow.restore();
        restoreAudio();
      }
    },
  },
  {
    name: 'playIslandRunSound treats missing assets and rejected playback as safe no-ops',
    run: async () => {
      const restoreAudio = installMockAudio();
      const mockNow = installMockNow(40_000);
      try {
        resetMockAudio();

        playIslandRunSound('egg_ready');
        MockAudioElement.created[0].rejectPlay = true;
        MockAudioElement.created[0].emit('error');
        await Promise.resolve();
        mockNow.setNow(40_100);

        playIslandRunSound('egg_ready');

        assertEqual(MockAudioElement.created.length, 1, 'failed SFX assets should not be recreated');
      } finally {
        mockNow.restore();
        restoreAudio();
      }
    },
  },
];
