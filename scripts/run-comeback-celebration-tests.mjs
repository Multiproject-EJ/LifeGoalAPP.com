import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-comeback-celebration-tests');
rmSync(outDir, { recursive: true, force: true });

// gameRewards resolves its localStorage handle once, at module load, so the
// browser stubs have to be in place before the compiled suite is required.
function installBrowserStubs() {
  const store = new Map();
  const localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => void store.set(key, String(value)),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
  };
  globalThis.localStorage = localStorage;
  globalThis.window = { localStorage, dispatchEvent: () => true };
  if (typeof globalThis.CustomEvent !== 'function') {
    globalThis.CustomEvent = class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    };
  }
}

try {
  execFileSync('tsc', ['-p', 'tsconfig.comeback-celebration-tests.json'], { stdio: 'inherit' });
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  installBrowserStubs();
  const require = createRequire(import.meta.url);
  const { runAllComebackCelebrationTests } = require(
    path.join(outDir, 'services/__tests__/comebackCelebration.test.js'),
  );
  runAllComebackCelebrationTests();
  console.log('comeback-celebration-tests: all assertions passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
