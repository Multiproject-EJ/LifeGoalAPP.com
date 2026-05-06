import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-image-upload-tests');
rmSync(outDir, { recursive: true, force: true });

try {
  execFileSync('./node_modules/.bin/tsc', ['-p', 'tsconfig.image-upload-tests.json'], { stdio: 'inherit' });
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'module' }));
  execFileSync('node', ['--experimental-specifier-resolution=node', path.join(outDir, 'utils/__tests__/runImageUploadOptimizerTests.js')], {
    stdio: 'inherit',
  });
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
