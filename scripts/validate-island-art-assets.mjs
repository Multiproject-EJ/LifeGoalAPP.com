import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const publicDir = path.join(repoRoot, 'public');
const islandsDir = path.join(publicDir, 'assets', 'islands');
const VALID_Z_BANDS = new Set(['back', 'mid', 'front']);
const VALID_BOSS_STATES = new Set(['idle', 'active', 'attack', 'defeated', 'reward']);
const IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpg', '.jpeg', '.png', '.svg', '.webp']);
const ANIMATION_EXTENSIONS = new Set(['.json', '.lottie', '.mp4', '.webm']);

const errors = [];
const warnings = [];

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function addError(manifestPath, fieldPath, message) {
  errors.push(`${path.relative(repoRoot, manifestPath)} ${fieldPath}: ${message}`);
}

function addWarning(manifestPath, fieldPath, message) {
  warnings.push(`${path.relative(repoRoot, manifestPath)} ${fieldPath}: ${message}`);
}

function resolveAssetPath(manifestPath, assetPath) {
  if (typeof assetPath !== 'string' || assetPath.trim().length === 0) return null;
  const trimmed = assetPath.trim();
  if (/^(?:https?:)?\/\//.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return { unsupportedExternal: true, resolvedPath: null };
  }
  if (trimmed.startsWith('/')) {
    return { unsupportedExternal: false, resolvedPath: path.join(publicDir, trimmed.replace(/^\/+/, '')) };
  }
  return { unsupportedExternal: false, resolvedPath: path.resolve(path.dirname(manifestPath), trimmed.replace(/^\.\//, '')) };
}

function validateAssetReference(manifestPath, fieldPath, assetPath, options = {}) {
  const { required = false, kind = 'image' } = options;
  if (assetPath === undefined || assetPath === null || assetPath === '') {
    if (required) addError(manifestPath, fieldPath, 'is required');
    return false;
  }
  if (typeof assetPath !== 'string') {
    addError(manifestPath, fieldPath, 'must be a string asset path');
    return false;
  }
  const resolved = resolveAssetPath(manifestPath, assetPath);
  if (!resolved) {
    if (required) addError(manifestPath, fieldPath, 'is required');
    return false;
  }
  if (resolved.unsupportedExternal) {
    addError(manifestPath, fieldPath, 'external/data/blob asset paths are not supported by the validator');
    return false;
  }
  const extension = path.extname(resolved.resolvedPath).toLowerCase();
  const allowedExtensions = kind === 'animation' ? ANIMATION_EXTENSIONS : IMAGE_EXTENSIONS;
  if (!allowedExtensions.has(extension)) {
    addError(manifestPath, fieldPath, `must reference a ${kind} file (${Array.from(allowedExtensions).join(', ')})`);
    return false;
  }
  if (!existsSync(resolved.resolvedPath) || !statSync(resolved.resolvedPath).isFile()) {
    addError(manifestPath, fieldPath, `referenced file does not exist: ${path.relative(repoRoot, resolved.resolvedPath)}`);
    return false;
  }
  return true;
}

function validateOptionalZBand(manifestPath, fieldPath, zBand) {
  if (zBand === undefined) return;
  if (typeof zBand !== 'string' || !VALID_Z_BANDS.has(zBand)) {
    addError(manifestPath, fieldPath, 'must be one of: back, mid, front');
  }
}

function validateFinite(manifestPath, fieldPath, value) {
  if (!isFiniteNumber(value)) {
    addError(manifestPath, fieldPath, 'must be a finite number');
    return false;
  }
  return true;
}

function validatePositive(manifestPath, fieldPath, value) {
  if (!validateFinite(manifestPath, fieldPath, value)) return false;
  if (value <= 0) {
    addError(manifestPath, fieldPath, 'must be greater than 0');
    return false;
  }
  return true;
}

function validateScene(manifestPath, scene) {
  if (scene === undefined) return;
  if (!isRecord(scene)) {
    addError(manifestPath, 'scene', 'must be an object when present');
    return;
  }
  validateAssetReference(manifestPath, 'scene.base', scene.base, { required: false, kind: 'image' });
  validateAssetReference(manifestPath, 'scene.boardCircle', scene.boardCircle, { required: false, kind: 'image' });
}

function validateLandmarks(manifestPath, landmarks) {
  if (landmarks === undefined) return;
  if (!Array.isArray(landmarks)) {
    addError(manifestPath, 'landmarks', 'must be an array when present');
    return;
  }

  landmarks.forEach((landmark, index) => {
    const basePath = `landmarks[${index}]`;
    if (!isRecord(landmark)) {
      addError(manifestPath, basePath, 'must be an object');
      return;
    }
    if (!Number.isInteger(landmark.stopIndex) || landmark.stopIndex < 0 || landmark.stopIndex > 4) {
      addError(manifestPath, `${basePath}.stopIndex`, 'must be an integer from 0 to 4');
    }
    validateFinite(manifestPath, `${basePath}.x`, landmark.x);
    validateFinite(manifestPath, `${basePath}.y`, landmark.y);
    validatePositive(manifestPath, `${basePath}.width`, landmark.width);
    validatePositive(manifestPath, `${basePath}.height`, landmark.height);
    validateOptionalZBand(manifestPath, `${basePath}.zBand`, landmark.zBand);

    if (!Array.isArray(landmark.levels)) {
      addError(manifestPath, `${basePath}.levels`, 'must be an array with 1 to 3 image paths');
      return;
    }
    if (landmark.levels.length < 1 || landmark.levels.length > 3) {
      addError(manifestPath, `${basePath}.levels`, 'must contain 1 to 3 image paths');
    }
    landmark.levels.forEach((levelPath, levelIndex) => {
      validateAssetReference(manifestPath, `${basePath}.levels[${levelIndex}]`, levelPath, { required: true, kind: 'image' });
    });
  });
}

function validateBoss(manifestPath, boss) {
  if (boss === undefined) return;
  if (!isRecord(boss)) {
    addError(manifestPath, 'boss', 'must be an object when present');
    return;
  }
  validateFinite(manifestPath, 'boss.x', boss.x);
  validateFinite(manifestPath, 'boss.y', boss.y);
  validatePositive(manifestPath, 'boss.width', boss.width);
  validatePositive(manifestPath, 'boss.height', boss.height);
  validateOptionalZBand(manifestPath, 'boss.zBand', boss.zBand);

  if (boss.defaultState !== undefined && (typeof boss.defaultState !== 'string' || !VALID_BOSS_STATES.has(boss.defaultState))) {
    addError(manifestPath, 'boss.defaultState', `must be one of: ${Array.from(VALID_BOSS_STATES).join(', ')}`);
  }

  if (!isRecord(boss.images)) {
    addError(manifestPath, 'boss.images', 'must be an object with at least idle or defaultState image');
  } else {
    const defaultState = typeof boss.defaultState === 'string' && VALID_BOSS_STATES.has(boss.defaultState) ? boss.defaultState : 'idle';
    const hasIdle = typeof boss.images.idle === 'string' && boss.images.idle.trim().length > 0;
    const hasDefault = typeof boss.images[defaultState] === 'string' && boss.images[defaultState].trim().length > 0;
    if (!hasIdle && !hasDefault) {
      addError(manifestPath, 'boss.images', 'must include images.idle or an image for boss.defaultState');
    }

    for (const [state, assetPath] of Object.entries(boss.images)) {
      const fieldPath = `boss.images.${state}`;
      if (!VALID_BOSS_STATES.has(state)) {
        addError(manifestPath, fieldPath, `unsupported boss image state; expected one of: ${Array.from(VALID_BOSS_STATES).join(', ')}`);
        continue;
      }
      validateAssetReference(manifestPath, fieldPath, assetPath, { required: true, kind: 'image' });
    }
  }

  if (boss.animations !== undefined) {
    if (!isRecord(boss.animations)) {
      addError(manifestPath, 'boss.animations', 'must be an object when present');
      return;
    }
    for (const [state, assetPath] of Object.entries(boss.animations)) {
      const fieldPath = `boss.animations.${state}`;
      if (!VALID_BOSS_STATES.has(state)) {
        addError(manifestPath, fieldPath, `unsupported boss animation state; expected one of: ${Array.from(VALID_BOSS_STATES).join(', ')}`);
        continue;
      }
      addWarning(manifestPath, fieldPath, 'animations are reserved for future PRs and are not rendered yet');
      validateAssetReference(manifestPath, fieldPath, assetPath, { required: true, kind: 'animation' });
    }
  }
}

function validateScenery(manifestPath, scenery) {
  if (scenery === undefined) return;
  if (!Array.isArray(scenery)) {
    addError(manifestPath, 'scenery', 'must be an array when present');
    return;
  }

  const ids = new Map();
  scenery.forEach((entry, index) => {
    const basePath = `scenery[${index}]`;
    if (!isRecord(entry)) {
      addError(manifestPath, basePath, 'must be an object');
      return;
    }
    if (typeof entry.id !== 'string' || entry.id.trim().length === 0) {
      addError(manifestPath, `${basePath}.id`, 'must be a non-empty string');
    } else {
      const existingIndex = ids.get(entry.id);
      if (existingIndex !== undefined) {
        addError(manifestPath, `${basePath}.id`, `duplicates scenery[${existingIndex}].id`);
      }
      ids.set(entry.id, index);
    }
    validateAssetReference(manifestPath, `${basePath}.src`, entry.src, { required: true, kind: 'image' });
    validateFinite(manifestPath, `${basePath}.x`, entry.x);
    validateFinite(manifestPath, `${basePath}.y`, entry.y);
    validatePositive(manifestPath, `${basePath}.width`, entry.width);
    validatePositive(manifestPath, `${basePath}.height`, entry.height);
    validateOptionalZBand(manifestPath, `${basePath}.zBand`, entry.zBand);
  });
}

function validateManifest(manifestPath) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    addError(manifestPath, '$', `failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  if (!isRecord(parsed)) {
    addError(manifestPath, '$', 'must be a JSON object');
    return;
  }
  if (parsed.version !== 2) {
    addError(manifestPath, 'version', 'must equal 2');
  }

  if (parsed.coordinateSpace !== undefined) {
    if (!isRecord(parsed.coordinateSpace)) {
      addError(manifestPath, 'coordinateSpace', 'must be an object when present');
    } else {
      validatePositive(manifestPath, 'coordinateSpace.width', parsed.coordinateSpace.width);
      validatePositive(manifestPath, 'coordinateSpace.height', parsed.coordinateSpace.height);
    }
  }

  validateScene(manifestPath, parsed.scene);
  validateLandmarks(manifestPath, parsed.landmarks);
  validateBoss(manifestPath, parsed.boss);
  validateScenery(manifestPath, parsed.scenery);
}

function findManifestPaths() {
  if (!existsSync(islandsDir)) return [];
  return readdirSync(islandsDir)
    .filter((entry) => /^island-\d{3}$/.test(entry))
    .map((entry) => path.join(islandsDir, entry, 'island-art.json'))
    .filter((manifestPath) => existsSync(manifestPath) && statSync(manifestPath).isFile())
    .sort();
}

const manifests = findManifestPaths();
if (manifests.length === 0) {
  console.log('[IslandArtAssets] No island-art.json manifests found.');
  process.exit(0);
}

for (const manifestPath of manifests) {
  validateManifest(manifestPath);
}

for (const warning of warnings) {
  console.warn(`[IslandArtAssets][WARN] ${warning}`);
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`[IslandArtAssets][ERROR] ${error}`);
  }
  console.error(`[IslandArtAssets] FAIL. Manifests checked: ${manifests.length}. Errors: ${errors.length}. Warnings: ${warnings.length}.`);
  process.exit(1);
}

console.log(`[IslandArtAssets] PASS. Manifests checked: ${manifests.length}. Warnings: ${warnings.length}.`);
