import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('.tmp-island-run-tests');
rmSync(outDir, { recursive: true, force: true });

const KNOWN_RUNTIME_EXTENSIONS = ['.js', '.mjs', '.cjs', '.json', '.node'];

function rewriteRelativeSpecifiersToJs(filePath) {
  const source = readFileSync(filePath, 'utf8');
  let rewritten = source;

  const resolveRuntimeSpecifier = (specifier) => {
    if (!(specifier.startsWith('./') || specifier.startsWith('../'))) return specifier;
    if (KNOWN_RUNTIME_EXTENSIONS.some((ext) => specifier.endsWith(ext))) return specifier;

    const basePath = path.resolve(path.dirname(filePath), specifier);
    if (existsSync(basePath) && statSync(basePath).isDirectory()) {
      return `${specifier}/index.js`;
    }
    if (existsSync(`${basePath}.js`)) {
      return `${specifier}.js`;
    }
    return `${specifier}.js`;
  };

  const appendJs = (_, prefix, specifier, suffix) =>
    `${prefix}${resolveRuntimeSpecifier(specifier)}${suffix}`;

  rewritten = rewritten.replace(/(from\s+['"])(\.\.?\/[^'"]+)(['"])/g, appendJs);
  rewritten = rewritten.replace(/(import\s+['"])(\.\.?\/[^'"]+)(['"])/g, appendJs);
  rewritten = rewritten.replace(/(import\s*\(\s*['"])(\.\.?\/[^'"]+)(['"]\s*\))/g, appendJs);
  rewritten = rewritten.replace(
    /(from\s+['"][^'"]+\.json['"])(?!\s+with\s+\{\s*type:\s*['"]json['"]\s*\})/g,
    '$1 with { type: \'json\' }',
  );

  if (rewritten !== source) {
    writeFileSync(filePath, rewritten);
  }
}

function walkAndRewriteJsSpecifiers(rootDir) {
  const entries = readdirSync(rootDir);
  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      walkAndRewriteJsSpecifiers(absolutePath);
      continue;
    }
    if (absolutePath.endsWith('.js')) {
      rewriteRelativeSpecifiersToJs(absolutePath);
    }
  }
}

try {
  execFileSync('./node_modules/.bin/tsc', ['-p', 'tsconfig.island-run-tests.json'], {
    stdio: 'inherit',
  });
  walkAndRewriteJsSpecifiers(outDir);
  writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'module' }));

  const runnerPath = path.join(outDir, 'features/gamification/level-worlds/services/__tests__/runIslandRunServiceTests.js');
  execFileSync('node', ['--experimental-specifier-resolution=node', runnerPath], {
    stdio: 'inherit',
  });
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
