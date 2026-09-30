import { getAiPreferences, readAiPreferences, setAiPreferences } from '../aiPreferences';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)} but received ${String(actual)}`);
  }
}

function installFakeWindow(storageWorks: boolean) {
  const store = new Map<string, string>();
  const events: string[] = [];
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        if (!storageWorks) throw new Error('QuotaExceededError');
        store.set(key, value);
      },
    },
    dispatchEvent: (event: { type: string }) => events.push(event.type),
  };
  (globalThis as unknown as { CustomEvent: unknown }).CustomEvent = class {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  };
  return { store, events };
}

export function runAiPreferencesTests(): void {
  const { store, events } = installFakeWindow(true);
  assertEqual(getAiPreferences().aiEnabled, true, 'AI is on by default');
  assertEqual(getAiPreferences().cloudFallback, true, 'cloud backup is on by default');

  setAiPreferences({ cloudFallback: false });
  assertEqual(readAiPreferences().cloudFallback, false, 'turning cloud backup off is remembered');
  assertEqual(readAiPreferences().aiEnabled, true, 'other preferences are kept');
  assertEqual(events.length, 1, 'a change event is sent so open screens update');

  store.set('lifegoal.ai.preferences.v1', '{not json');
  assertEqual(getAiPreferences().aiEnabled, true, 'unreadable storage falls back to defaults');

  installFakeWindow(false);
  setAiPreferences({ aiEnabled: false });
  assertEqual(readAiPreferences().aiEnabled, false, 'a choice still applies when storage is unavailable');
}
