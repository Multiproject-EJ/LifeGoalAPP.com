export function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message} (expected ${String(expected)}, received ${String(actual)})`);
  }
}

export function assertDeepEqual(actual: unknown, expected: unknown, message: string): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message} (expected ${expectedJson}, received ${actualJson})`);
  }
}

export type TestCase = {
  name: string;
  run: () => void | Promise<void>;
};

export function createMemoryStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map(Object.entries(initial));
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key) ?? null : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

export function installWindowWithStorage(storage: Storage): void {
  const sessionStorage = createMemoryStorage();
  Object.defineProperty(globalThis, 'window', {
    value: {
      localStorage: storage,
      sessionStorage,
      location: { pathname: '/app', search: '', hash: '' },
    },
    configurable: true,
    writable: true,
  });
}
