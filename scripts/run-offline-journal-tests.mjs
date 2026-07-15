import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-offline-journal-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  execFileSync('tsc', ['-p', 'tsconfig.offline-journal-tests.json'], {
    stdio: 'inherit',
  });
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
  const require = createRequire(import.meta.url);
  const { runOfflineJournalStorageTests } = require(
    path.join(outDir, 'features/offline-journal/__tests__/offlineJournalStorage.test.js'),
  );
  runOfflineJournalStorageTests();
  console.log('offline-journal-tests: all assertions passed');
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
