import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const publicRoot = path.join(repoRoot, 'public');
const allowedRuntimeExtensions = new Set(['.webp', '.avif']);
const rasterExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);
const MAX_RUNTIME_IMAGE_BYTES = 550 * 1024;
const alwaysEnforcedRoots = ['public/assets/story/championships'];

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function gitLines(args) {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function collectCandidatePaths() {
  const changed = new Set([
    ...gitLines(['diff', '--name-only', '--diff-filter=AM', 'HEAD', '--', 'public']),
    ...gitLines(['ls-files', '--others', '--exclude-standard', '--', 'public']),
  ]);

  // After a feature is committed, keep the check useful in CI and pre-push by
  // validating assets introduced or modified by the latest commit.
  const hasParent = gitLines(['rev-parse', '--verify', 'HEAD^']).length > 0;
  if (hasParent) {
    gitLines(['diff', '--name-only', '--diff-filter=AM', 'HEAD^', 'HEAD', '--', 'public'])
      .forEach((file) => changed.add(file));
  }

  alwaysEnforcedRoots.forEach((root) => {
    walk(path.join(repoRoot, root)).forEach((file) => changed.add(path.relative(repoRoot, file)));
  });
  return Array.from(changed);
}

const candidates = collectCandidatePaths()
  .filter((relativePath) => rasterExtensions.has(path.extname(relativePath).toLowerCase()))
  .filter((relativePath) => existsSync(path.join(repoRoot, relativePath)));

const failures = [];
for (const relativePath of candidates) {
  const extension = path.extname(relativePath).toLowerCase();
  const size = statSync(path.join(repoRoot, relativePath)).size;
  if (!allowedRuntimeExtensions.has(extension)) {
    failures.push(`${relativePath}: runtime raster images must be WebP or AVIF`);
  }
  if (size > MAX_RUNTIME_IMAGE_BYTES) {
    failures.push(`${relativePath}: ${(size / 1024).toFixed(0)} KB exceeds the 550 KB mobile budget`);
  }
}

const allPublicRasters = walk(publicRoot).filter((file) => rasterExtensions.has(path.extname(file).toLowerCase()));
const totalBytes = allPublicRasters.reduce((sum, file) => sum + statSync(file).size, 0);

if (failures.length > 0) {
  console.error('Mobile runtime image check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`mobile-images: ${candidates.length} release-relevant images pass WebP/AVIF and ≤550 KB`);
  console.log(`mobile-images: audited ${allPublicRasters.length} public raster assets (${(totalBytes / 1024 / 1024).toFixed(1)} MB total)`);
}
