import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const publicDir = path.join(repoRoot, 'public');
const islandsDir = path.join(publicDir, 'assets', 'islands');
const VALID_Z_BANDS = new Set(['back', 'mid', 'front']);
const VALID_BOSS_STATES = new Set(['idle', 'active', 'attack', 'defeated', 'reward']);
const VALID_ASSET_CAMERA_MODES = new Set(['legacy-camera', 'final-angle']);
const IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpg', '.jpeg', '.png', '.svg', '.webp']);
const ANIMATION_EXTENSIONS = new Set(['.json', '.lottie', '.mp4', '.webm']);
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;
const ROUTE_PROTECTED_RADIUS_RATIO = 0.43;

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
  validateAssetReference(manifestPath, 'scene.ambientBackground', scene.ambientBackground, { required: false, kind: 'image' });
  if (scene.base !== undefined) {
    addWarning(
      manifestPath,
      'scene.base',
      scene.ambientBackground !== undefined
        ? 'is deprecated and ignored while scene.ambientBackground is present'
        : 'is deprecated; use scene.ambientBackground for full-container art',
    );
    validateAssetReference(manifestPath, 'scene.base', scene.base, { required: false, kind: 'image' });
  }
  validateAssetReference(manifestPath, 'scene.boardPlate', scene.boardPlate, { required: false, kind: 'image' });
  validateAssetReference(manifestPath, 'scene.boardCircle', scene.boardCircle, { required: false, kind: 'image' });
  validateAssetReference(manifestPath, 'scene.boardOuterCircle', scene.boardOuterCircle, { required: false, kind: 'image' });
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
    validateAssetReference(manifestPath, `${basePath}.levelZero`, landmark.levelZero, { required: false, kind: 'image' });
    if (landmark.levelZeroPlacement !== undefined) {
      if (!isRecord(landmark.levelZeroPlacement)) {
        addError(manifestPath, `${basePath}.levelZeroPlacement`, 'must be an object when present');
      } else {
        validateFinite(manifestPath, `${basePath}.levelZeroPlacement.x`, landmark.levelZeroPlacement.x);
        validateFinite(manifestPath, `${basePath}.levelZeroPlacement.y`, landmark.levelZeroPlacement.y);
        validatePositive(manifestPath, `${basePath}.levelZeroPlacement.width`, landmark.levelZeroPlacement.width);
        validatePositive(manifestPath, `${basePath}.levelZeroPlacement.height`, landmark.levelZeroPlacement.height);
      }
    }

    if (!Array.isArray(landmark.levels)) {
      addError(manifestPath, `${basePath}.levels`, 'must be an array with 1 to 3 image paths');
      return;
    }
    if (landmark.levels.length < 1 || landmark.levels.length > 3) {
      addError(manifestPath, `${basePath}.levels`, 'must contain 1 to 3 image paths');
    }
    if (landmark.levelScales !== undefined) {
      if (!Array.isArray(landmark.levelScales) || landmark.levelScales.length !== landmark.levels.length) {
        addError(manifestPath, `${basePath}.levelScales`, 'must contain one positive scale for every landmark level');
      } else {
        landmark.levelScales.forEach((scale, levelIndex) => {
          validatePositive(manifestPath, `${basePath}.levelScales[${levelIndex}]`, scale);
          if (levelIndex > 0 && isFiniteNumber(scale) && isFiniteNumber(landmark.levelScales[levelIndex - 1])) {
            const previousScale = landmark.levelScales[levelIndex - 1];
            if (scale <= previousScale) {
              addError(
                manifestPath,
                `${basePath}.levelScales[${levelIndex}]`,
                `must be larger than levelScales[${levelIndex - 1}] (${previousScale})`,
              );
            }
          }
        });
      }
    }
    landmark.levels.forEach((levelPath, levelIndex) => {
      validateAssetReference(manifestPath, `${basePath}.levels[${levelIndex}]`, levelPath, { required: true, kind: 'image' });
    });
  });
}

function validateBoardFoundation(manifestPath, boardFoundation) {
  if (boardFoundation === undefined) return;
  if (!isRecord(boardFoundation)) {
    addError(manifestPath, 'boardFoundation', 'must be an object when present');
    return;
  }
  for (const key of ['surfaceColor', 'highlightColor', 'edgeColor', 'shadowColor']) {
    const value = boardFoundation[key];
    if (typeof value !== 'string' || !HEX_COLOR_PATTERN.test(value.trim())) {
      addError(manifestPath, `boardFoundation.${key}`, 'must be a #RRGGBB or #RRGGBBAA color');
    }
  }
}

function rectangleDistanceFromPoint(rect, point) {
  const dx = Math.max(Math.abs(point.x - rect.x) - (rect.width / 2), 0);
  const dy = Math.max(Math.abs(point.y - rect.y) - (rect.height / 2), 0);
  return Math.hypot(dx, dy);
}

function validateLandmarkRouteClearance(manifestPath, manifest) {
  const { boardFoundation, playableBoardRect, landmarks } = manifest;
  if (!isRecord(boardFoundation) || !isRecord(playableBoardRect) || !Array.isArray(landmarks)) return;
  if (![playableBoardRect.x, playableBoardRect.y, playableBoardRect.width, playableBoardRect.height].every(isFiniteNumber)) return;

  const boardCenter = {
    x: playableBoardRect.x + (playableBoardRect.width / 2),
    y: playableBoardRect.y + (playableBoardRect.height / 2),
  };
  const protectedRadius = Math.min(playableBoardRect.width, playableBoardRect.height)
    * ROUTE_PROTECTED_RADIUS_RATIO;

  landmarks.forEach((landmark, index) => {
    if (!isRecord(landmark)) return;
    const basePath = `landmarks[${index}]`;

    if (isRecord(landmark.levelZeroPlacement)) {
      const plot = landmark.levelZeroPlacement;
      if ([plot.x, plot.y, plot.width, plot.height].every(isFiniteNumber)) {
        const plotClearance = rectangleDistanceFromPoint(plot, boardCenter);
        if (plotClearance < protectedRadius) {
          addError(
            manifestPath,
            `${basePath}.levelZeroPlacement`,
            `enters the protected tile-route radius (${plotClearance.toFixed(1)} < ${protectedRadius.toFixed(1)})`,
          );
        }
      }
    }

    if (![landmark.x, landmark.y, landmark.width, landmark.height].every(isFiniteNumber)) return;
    const imageScale = isFiniteNumber(landmark.imageScale) && landmark.imageScale > 0 ? landmark.imageScale : 1;
    const levelScale = Array.isArray(landmark.levelScales)
      ? Math.max(1, ...landmark.levelScales.filter((scale) => isFiniteNumber(scale) && scale > 0))
      : 1;
    const scale = imageScale * levelScale;
    const scaledWidth = landmark.width * scale;
    const scaledHeight = landmark.height * scale;
    const buildingBottom = landmark.y + (landmark.height / 2);
    const buildingRect = {
      x: landmark.x,
      y: buildingBottom - (scaledHeight / 2),
      width: scaledWidth,
      height: scaledHeight,
    };
    const buildingClearance = rectangleDistanceFromPoint(buildingRect, boardCenter);
    if (buildingClearance < protectedRadius) {
      addError(
        manifestPath,
        basePath,
        `largest L3 placement enters the protected tile-route radius (${buildingClearance.toFixed(1)} < ${protectedRadius.toFixed(1)})`,
      );
    }
  });
}

function validateProductionGeometry(manifestPath, manifest) {
  const { boardFoundation, playableBoardRect, landmarks } = manifest;
  // Legacy islands remain loadable while they are migrated. Declaring the
  // code-owned foundation opts an island into the complete 120-island system.
  if (!isRecord(boardFoundation) || !isRecord(playableBoardRect) || !Array.isArray(landmarks)) return;
  if (![playableBoardRect.x, playableBoardRect.y, playableBoardRect.width, playableBoardRect.height].every(isFiniteNumber)) return;
  if (landmarks.length !== 4) {
    addError(manifestPath, 'landmarks', `production geometry requires exactly four landmark plots; received ${landmarks.length}`);
    return;
  }

  const boardCenter = {
    x: playableBoardRect.x + (playableBoardRect.width / 2),
    y: playableBoardRect.y + (playableBoardRect.height / 2),
  };
  const quadrantKeys = new Set();
  const plotPlacements = [];
  landmarks.forEach((landmark, index) => {
    if (!isRecord(landmark) || !isRecord(landmark.levelZeroPlacement)) {
      addError(manifestPath, `landmarks[${index}].levelZeroPlacement`, 'is required by the 120-island production geometry');
      return;
    }
    const plot = landmark.levelZeroPlacement;
    if (![plot.x, plot.y, plot.width, plot.height].every(isFiniteNumber)) return;
    plotPlacements.push(plot);
    const horizontal = plot.x < boardCenter.x ? 'left' : plot.x > boardCenter.x ? 'right' : 'center';
    const vertical = plot.y < boardCenter.y ? 'rear' : plot.y > boardCenter.y ? 'front' : 'center';
    quadrantKeys.add(`${vertical}-${horizontal}`);
  });

  const expectedQuadrants = ['rear-left', 'rear-right', 'front-left', 'front-right'];
  expectedQuadrants.forEach((quadrant) => {
    if (!quadrantKeys.has(quadrant)) {
      addError(manifestPath, 'landmarks', `production geometry is missing the fixed ${quadrant} plot`);
    }
  });

  if (plotPlacements.length === 4) {
    const centroid = plotPlacements.reduce(
      (sum, plot) => ({ x: sum.x + (plot.x / 4), y: sum.y + (plot.y / 4) }),
      { x: 0, y: 0 },
    );
    const tolerance = 1;
    if (Math.abs(centroid.x - boardCenter.x) > tolerance || Math.abs(centroid.y - boardCenter.y) > tolerance) {
      addError(
        manifestPath,
        'landmarks',
        `four plot centers must balance around board center (${boardCenter.x}, ${boardCenter.y}); received (${centroid.x}, ${centroid.y})`,
      );
    }
  }
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

function validateCompositionAnchor(manifestPath, manifest) {
  const { sceneSpace, playableBoardRect, landmarks } = manifest;
  if (!isRecord(sceneSpace) || !isRecord(playableBoardRect)) return;

  const sceneValues = [sceneSpace.width, sceneSpace.height];
  const boardValues = [
    playableBoardRect.x,
    playableBoardRect.y,
    playableBoardRect.width,
    playableBoardRect.height,
  ];
  if (![...sceneValues, ...boardValues].every(isFiniteNumber)) return;

  const sceneCenter = {
    x: sceneSpace.width / 2,
    y: sceneSpace.height / 2,
  };
  const boardCenter = {
    x: playableBoardRect.x + playableBoardRect.width / 2,
    y: playableBoardRect.y + playableBoardRect.height / 2,
  };
  const tolerance = 0.000001;

  if (
    Math.abs(boardCenter.x - sceneCenter.x) > tolerance
    || Math.abs(boardCenter.y - sceneCenter.y) > tolerance
  ) {
    addError(
      manifestPath,
      'playableBoardRect',
      `must be centered on sceneSpace (${sceneCenter.x}, ${sceneCenter.y}); received (${boardCenter.x}, ${boardCenter.y})`,
    );
  }

  if (!Array.isArray(landmarks) || landmarks.length === 0) return;
  if (!landmarks.every((landmark) => isRecord(landmark) && isFiniteNumber(landmark.x) && isFiniteNumber(landmark.y))) {
    return;
  }

  const landmarkCenter = landmarks.reduce(
    (center, landmark) => ({
      x: center.x + landmark.x / landmarks.length,
      y: center.y + landmark.y / landmarks.length,
    }),
    { x: 0, y: 0 },
  );

  if (
    manifest.assetCameraMode !== 'final-angle'
    && (
      Math.abs(landmarkCenter.x - boardCenter.x) > tolerance
      || Math.abs(landmarkCenter.y - boardCenter.y) > tolerance
    )
  ) {
    addError(
      manifestPath,
      'landmarks',
      `must remain balanced around the playable-board anchor (${boardCenter.x}, ${boardCenter.y}); received centroid (${landmarkCenter.x}, ${landmarkCenter.y})`,
    );
  }
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

  if (
    parsed.assetCameraMode !== undefined
    && (typeof parsed.assetCameraMode !== 'string' || !VALID_ASSET_CAMERA_MODES.has(parsed.assetCameraMode))
  ) {
    addError(manifestPath, 'assetCameraMode', 'must be one of: legacy-camera, final-angle');
  }
  if (parsed.assetCameraMode === 'final-angle') {
    if (parsed.boardPlateImageVerticalScale !== undefined) {
      addError(
        manifestPath,
        'boardPlateImageVerticalScale',
        'must be omitted when assetCameraMode is final-angle; final-camera art cannot receive a second vertical perspective correction',
      );
    }
    if (parsed.boardOuterCircleImageVerticalScale !== undefined) {
      addError(
        manifestPath,
        'boardOuterCircleImageVerticalScale',
        'must be omitted when assetCameraMode is final-angle; final-camera art cannot receive a second vertical perspective correction',
      );
    }
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
  validateBoardFoundation(manifestPath, parsed.boardFoundation);
  validateLandmarks(manifestPath, parsed.landmarks);
  validateBoss(manifestPath, parsed.boss);
  validateScenery(manifestPath, parsed.scenery);
  validateCompositionAnchor(manifestPath, parsed);
  validateLandmarkRouteClearance(manifestPath, parsed);
  validateProductionGeometry(manifestPath, parsed);
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
