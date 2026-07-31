import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const audioRoot = join(repoRoot, 'public', 'assets', 'audio');
const manifestPath = join(
  repoRoot,
  'src',
  'features',
  'gamification',
  'level-worlds',
  'services',
  'islandRunAudioAssets.json',
);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const errors = [];
const warnings = [];
const assetPaths = new Set();
const assetIds = new Set();
const assetsByPath = new Map();
const assetSizesByPath = new Map();

function publicPathToDiskPath(publicPath) {
  return join(repoRoot, 'public', publicPath.replace(/^\//, ''));
}

function collectAudioFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name);
    return entry.isDirectory() ? collectAudioFiles(absolutePath) : [absolutePath];
  });
}

for (const asset of manifest.assets) {
  if (assetIds.has(asset.id)) errors.push(`Duplicate asset id: ${asset.id}`);
  if (assetPaths.has(asset.path)) errors.push(`Duplicate asset path: ${asset.path}`);
  assetIds.add(asset.id);
  assetPaths.add(asset.path);
  assetsByPath.set(asset.path, asset);

  if (!asset.path.startsWith('/assets/audio/')) {
    errors.push(`${asset.id} must live under /assets/audio/: ${asset.path}`);
    continue;
  }

  const diskPath = publicPathToDiskPath(asset.path);
  try {
    const stats = statSync(diskPath);
    assetSizesByPath.set(asset.path, stats.size);
    if (!stats.isFile()) errors.push(`${asset.id} is not a file: ${asset.path}`);
    if (stats.size < manifest.minimumAssetBytes) {
      errors.push(`${asset.id} is only ${stats.size} bytes (minimum ${manifest.minimumAssetBytes}): ${asset.path}`);
    }
  } catch {
    errors.push(`Missing asset: ${asset.path}`);
  }

  const filename = asset.path.split('/').at(-1) ?? '';
  const canonicalName = /^(mus|amb|sfx|sting|vo)_[a-z0-9_]+(?:_v\d+)?\.(mp3|ogg)$/;
  if (!asset.legacyFilename && !canonicalName.test(filename)) {
    errors.push(`${asset.id} has a non-canonical filename without legacyFilename=true: ${filename}`);
  }
}

const diskPublicPaths = collectAudioFiles(audioRoot)
  .map((diskPath) => `/${relative(join(repoRoot, 'public'), diskPath).split('\\').join('/')}`)
  .sort();
for (const diskPublicPath of diskPublicPaths) {
  if (!assetPaths.has(diskPublicPath)) errors.push(`Audio file is not declared in the manifest: ${diskPublicPath}`);
}

const mappedPaths = [
  manifest.islandRun.ambiencePath,
  ...Object.values(manifest.islandRun.musicTracks),
  ...Object.values(manifest.islandRun.sfxEvents),
];
for (const mappedPath of mappedPaths) {
  if (!assetPaths.has(mappedPath)) errors.push(`Island Run maps an undeclared asset: ${mappedPath}`);
}

const placeholderPaths = new Set(manifest.islandRun.placeholderPaths);
for (const path of placeholderPaths) {
  const asset = assetsByPath.get(path);
  if (!asset) {
    errors.push(`Placeholder path is not declared as an asset: ${path}`);
  } else if (asset.status !== 'placeholder' || !path.includes('.PLACEHOLDER.')) {
    errors.push(`Placeholder path must have placeholder status and filename marker: ${path}`);
  }
}
for (const asset of manifest.assets.filter((entry) => entry.status === 'placeholder')) {
  if (!placeholderPaths.has(asset.path)) errors.push(`Placeholder asset missing from placeholderPaths: ${asset.path}`);
}

const bundledSfxBytes = manifest.assets
  .filter((asset) => asset.kind === 'sfx')
  .reduce((sum, asset) => sum + (assetSizesByPath.get(asset.path) ?? 0), 0);
if (bundledSfxBytes > manifest.maxBundledSfxBytes) {
  errors.push(`Bundled SFX total ${bundledSfxBytes} bytes exceeds ${manifest.maxBundledSfxBytes}`);
}

const eventsByPath = new Map();
for (const [eventId, path] of Object.entries(manifest.islandRun.sfxEvents)) {
  eventsByPath.set(path, [...(eventsByPath.get(path) ?? []), eventId]);
}
for (const [path, eventIds] of eventsByPath) {
  if (eventIds.length > 1) warnings.push(`${eventIds.length} events share ${path}`);
}

if (errors.length > 0) {
  console.error(`Audio asset validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Audio asset validation passed: ${manifest.assets.length} files, ${Object.keys(manifest.islandRun.sfxEvents).length} SFX events, ${placeholderPaths.size} placeholders.`);
  console.log(`Bundled placeholder SFX budget: ${bundledSfxBytes}/${manifest.maxBundledSfxBytes} bytes.`);
  for (const warning of warnings) console.warn(`Warning: ${warning}`);
}
