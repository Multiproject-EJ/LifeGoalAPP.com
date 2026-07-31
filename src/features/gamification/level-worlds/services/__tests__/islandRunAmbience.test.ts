import {
  applyIslandRunAmbienceState,
  resetIslandRunAmbienceForTests,
} from '../islandRunAmbience';
import { resolveIslandRunAudioPreferences } from '../islandRunAudioPreferences';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

class MockAmbienceAudioElement {
  static created: MockAmbienceAudioElement[] = [];

  readonly src: string;
  loop = false;
  preload = '';
  volume = 1;
  currentTime = 0;
  paused = true;
  playCount = 0;
  pauseCount = 0;

  constructor(src: string) {
    this.src = src;
    MockAmbienceAudioElement.created.push(this);
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
}

function installMockAmbienceAudio(): () => void {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousAudio = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
  Object.defineProperty(globalThis, 'window', {
    value: {},
    configurable: true,
  });
  Object.defineProperty(globalThis, 'Audio', {
    value: MockAmbienceAudioElement,
    configurable: true,
  });

  return () => {
    resetIslandRunAmbienceForTests();
    MockAmbienceAudioElement.created = [];
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

export const islandRunAmbienceTests: TestCase[] = [
  {
    name: 'resolveIslandRunAudioPreferences exposes three independent persisted channels',
    run: () => {
      assertDeepEqual(
        resolveIslandRunAudioPreferences({
          audioEnabled: false,
          musicEnabled: true,
          sfxEnabled: false,
        }),
        {
          ambienceEnabled: false,
          musicEnabled: true,
          sfxEnabled: false,
        },
        'audio compatibility field should resolve only to the ambience channel',
      );
    },
  },
  {
    name: 'ambience engine owns one loop and preserves its playhead across lifecycle suspension',
    run: async () => {
      const restore = installMockAmbienceAudio();
      try {
        applyIslandRunAmbienceState({ enabled: true });
        await Promise.resolve();
        applyIslandRunAmbienceState({ enabled: true });
        await Promise.resolve();

        const audio = MockAmbienceAudioElement.created[0];
        assertEqual(MockAmbienceAudioElement.created.length, 1, 'only one ambience element should be owned');
        assertEqual(audio.playCount, 1, 'reapplying active ambience should not restart the loop');
        assertEqual(audio.loop, true, 'ambience should loop continuously');
        assertEqual(audio.volume, 0.18, 'ambience should use the quiet world-bed volume');

        audio.currentTime = 42;
        applyIslandRunAmbienceState({ enabled: true, suspended: true });
        assertEqual(audio.paused, true, 'backgrounding should pause ambience');
        assertEqual(audio.currentTime, 42, 'backgrounding should preserve the playhead');

        applyIslandRunAmbienceState({ enabled: true, suspended: false });
        await Promise.resolve();
        assertEqual(audio.playCount, 2, 'foregrounding should resume the same ambience element');
        assertEqual(audio.currentTime, 42, 'foregrounding should resume from the preserved playhead');

        applyIslandRunAmbienceState({ enabled: false });
        assertEqual(audio.paused, true, 'preference off should pause ambience');
        assertEqual(audio.currentTime, 0, 'preference off should reset the ambience');
      } finally {
        restore();
      }
    },
  },
];
