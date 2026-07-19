import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const briefsDir = path.join(repoRoot, 'tools', 'island-art-factory', 'briefs');
const expectedStops = ['hatchery', 'habit', 'mystery', 'wisdom'];
const expectedLevels = ['foundation', 'operational', 'restored'];
const errors = [];

function fail(file, field, message) {
  errors.push(`${path.relative(repoRoot, file)} ${field}: ${message}`);
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function stringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every(nonEmpty);
}

function readBrief(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    fail(file, '$', `invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

if (!existsSync(briefsDir)) {
  console.error('Island visual production briefs directory is missing.');
  process.exit(1);
}

const files = readdirSync(briefsDir)
  .filter((name) => /^island-\d{3}\.json$/.test(name))
  .sort()
  .map((name) => path.join(briefsDir, name));

if (files.length < 5) {
  errors.push(`Expected at least the five pilot briefs, found ${files.length}.`);
}

const seenIslands = new Set();
for (const file of files) {
  const brief = readBrief(file);
  if (!brief) continue;

  if (brief.version !== 1) fail(file, 'version', 'must equal 1');
  if (!Number.isInteger(brief.islandNumber) || brief.islandNumber < 1 || brief.islandNumber > 120) {
    fail(file, 'islandNumber', 'must be an integer from 1 to 120');
  } else if (seenIslands.has(brief.islandNumber)) {
    fail(file, 'islandNumber', 'duplicates another production brief');
  } else {
    seenIslands.add(brief.islandNumber);
    const expectedName = `island-${String(brief.islandNumber).padStart(3, '0')}.json`;
    if (path.basename(file) !== expectedName) fail(file, '$', `filename must be ${expectedName}`);
  }

  for (const field of ['slug', 'displayName', 'pilotRole', 'restorationChange', 'runtimeRoot', 'sourceNamingExample']) {
    if (!nonEmpty(brief[field])) fail(file, field, 'must be a non-empty string');
  }

  const geometry = brief.boardGeometry ?? {};
  if (geometry.profileId !== 'spark36_ring') fail(file, 'boardGeometry.profileId', 'must remain spark36_ring');
  if (geometry.tileCount !== 36) fail(file, 'boardGeometry.tileCount', 'must remain 36');
  if (geometry.canonicalWidth !== 1000 || geometry.canonicalHeight !== 1000) {
    fail(file, 'boardGeometry', 'canonical board must remain 1000×1000');
  }
  if (geometry.sceneWidth !== 1400 || geometry.sceneHeight !== 1600) {
    fail(file, 'boardGeometry', 'pilot scene must remain 1400×1600');
  }
  const rect = geometry.playableBoardRect ?? {};
  if (rect.x !== 200 || rect.y !== 300 || rect.width !== 1000 || rect.height !== 1000) {
    fail(file, 'boardGeometry.playableBoardRect', 'must remain x=200, y=300, width=1000, height=1000');
  }
  if (geometry.boardTiltDegrees !== 47 || geometry.boardRotationDegrees !== 0) {
    fail(file, 'boardGeometry', 'must match the production 47° tilt and 0° rotation');
  }

  const identity = brief.identity ?? {};
  for (const field of ['civilization', 'guardian', 'biome', 'distortion']) {
    if (!nonEmpty(identity[field])) fail(file, `identity.${field}`, 'must be a non-empty string');
  }
  for (const field of ['materials', 'motifs', 'avoid']) {
    if (!stringArray(brief[field])) fail(file, field, 'must be a non-empty string array');
  }
  if (!Array.isArray(brief.palette) || brief.palette.length < 4) {
    fail(file, 'palette', 'must define at least four named colors');
  } else {
    brief.palette.forEach((entry, index) => {
      if (!nonEmpty(entry?.name)) fail(file, `palette[${index}].name`, 'must be a non-empty string');
      if (typeof entry?.hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(entry.hex)) {
        fail(file, `palette[${index}].hex`, 'must be a six-digit hex color');
      }
    });
  }

  if (!Array.isArray(brief.landmarks) || brief.landmarks.length !== expectedStops.length) {
    fail(file, 'landmarks', 'must define exactly hatchery, habit, mystery, and wisdom');
  } else {
    brief.landmarks.forEach((landmark, index) => {
      if (landmark?.stopId !== expectedStops[index]) {
        fail(file, `landmarks[${index}].stopId`, `must be ${expectedStops[index]} in canonical order`);
      }
      if (!nonEmpty(landmark?.displayName)) fail(file, `landmarks[${index}].displayName`, 'must be non-empty');
      if (!nonEmpty(landmark?.visual)) fail(file, `landmarks[${index}].visual`, 'must be non-empty');
      if (JSON.stringify(landmark?.levels) !== JSON.stringify(expectedLevels)) {
        fail(file, `landmarks[${index}].levels`, 'must be foundation, operational, restored');
      }
    });
  }

  if (!nonEmpty(brief.boss?.name) || !nonEmpty(brief.boss?.visual)) fail(file, 'boss', 'must define name and visual');
  if (!nonEmpty(brief.arena?.name) || !nonEmpty(brief.arena?.visual)) fail(file, 'arena', 'must define name and visual');
}

if (errors.length) {
  console.error('Island visual production brief validation failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Island visual production briefs passed (${files.length} briefs).`);

