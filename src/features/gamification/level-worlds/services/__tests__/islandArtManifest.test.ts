import {
  clampIslandArtBuildLevel,
  getIslandArtAmbientBackgroundSrc,
  getIslandArtBoardCircleImageSrc,
  getIslandArtBoardPlateImageSrc,
  getIslandArtBossImageSrc,
  getIslandArtFolderName,
  getIslandArtLandmarkImageSrc,
  getIslandArtManifestUrl,
  loadIslandArtManifest,
  normalizeIslandArtManifest,
  type IslandArtManifestFetcher,
} from '../islandArtManifest';
import { assert, assertEqual, type TestCase } from './testHarness';

const sampleManifest = {
  version: 2,
  islandNumber: 1,
  coordinateSpace: { width: 1000, height: 1000 },
  scene: {
    ambientBackground: 'scene/ambient-background.webp',
    boardCircle: 'scene/board-circle.webp',
  },
  landmarks: [
    {
      stopIndex: 0,
      x: 120,
      y: 120,
      width: 180,
      height: 180,
      levels: [
        'landmarks/landmark-01-level-01.webp',
        'landmarks/landmark-01-level-02.webp',
        'landmarks/landmark-01-level-03.webp',
      ],
    },
  ],
  scenery: [
    {
      id: 'scenery-01',
      src: 'scenery/scenery-01.webp',
      x: 500,
      y: 720,
      width: 240,
      height: 160,
      zBand: 'front',
    },
  ],
  boss: {
    id: 'boss-01',
    x: 500,
    y: 500,
    width: 220,
    height: 220,
    defaultState: 'idle',
    images: {
      idle: 'boss/boss-idle.webp',
      defeated: 'boss/boss-defeated.webp',
    },
    animations: {
      idle: 'boss/boss-idle.webm',
    },
    zBand: 'mid',
  },
};

export const islandArtManifestTests: TestCase[] = [
  {
    name: 'normalizes island number to island-001 manifest path',
    run: () => {
      assertEqual(getIslandArtFolderName(1), 'island-001', 'Expected island 1 to use the island-001 folder');
      assertEqual(getIslandArtFolderName(12), 'island-012', 'Expected island 12 to use the island-012 folder');
      assertEqual(getIslandArtManifestUrl(1), '/assets/islands/island-001/island-art.json', 'Expected island 1 manifest URL');
      assertEqual(getIslandArtManifestUrl(Number.NaN), '/assets/islands/island-001/island-art.json', 'Expected invalid island to fall back to island 1');
    },
  },
  {
    name: 'normalizes ambientBackground separately from board-circle art',
    run: () => {
      const manifest = normalizeIslandArtManifest(sampleManifest, 1);
      if (!manifest) throw new Error('Expected sample manifest to normalize');
      assertEqual(
        getIslandArtAmbientBackgroundSrc(manifest),
        '/assets/islands/island-001/scene/ambient-background.webp',
        'Expected ambient background to normalize as the full-container scene asset',
      );
      assertEqual(
        getIslandArtBoardCircleImageSrc(manifest),
        '/assets/islands/island-001/scene/board-circle.webp',
        'Expected board-circle art to stay as the board-attached scene asset',
      );
    },
  },

  {
    name: 'normalizes scene.boardPlate as preferred board-attached art',
    run: () => {
      const manifest = normalizeIslandArtManifest({
        version: 2,
        scene: {
          boardPlate: 'scene/board-plate.webp',
        },
      }, 5);
      if (!manifest) throw new Error('Expected boardPlate-only manifest to normalize');
      assertEqual(
        manifest.scene?.boardPlate,
        '/assets/islands/island-005/scene/board-plate.webp',
        'Expected scene.boardPlate to normalize as the preferred board-attached static plate',
      );
      assertEqual(
        getIslandArtBoardPlateImageSrc(manifest),
        '/assets/islands/island-005/scene/board-plate.webp',
        'Expected boardPlate helper to resolve the preferred plate image',
      );
    },
  },
  {
    name: 'prefers scene.boardPlate over scene.boardCircle when both exist',
    run: () => {
      const manifest = normalizeIslandArtManifest({
        version: 2,
        scene: {
          boardPlate: 'scene/board-plate.webp',
          boardCircle: 'scene/board-circle.webp',
        },
      }, 6);
      if (!manifest) throw new Error('Expected dual board art manifest to normalize');
      assertEqual(
        getIslandArtBoardPlateImageSrc(manifest),
        '/assets/islands/island-006/scene/board-plate.webp',
        'Expected boardPlate to be preferred over boardCircle for board-attached art',
      );
      assertEqual(
        getIslandArtBoardCircleImageSrc(manifest),
        '/assets/islands/island-006/scene/board-plate.webp',
        'Expected legacy boardCircle helper to follow the preferred boardPlate helper',
      );
      assertEqual(
        manifest.scene?.boardCircle,
        '/assets/islands/island-006/scene/board-circle.webp',
        'Expected boardCircle to remain normalized as fallback metadata',
      );
    },
  },
  {
    name: 'supports deprecated scene.base as ambient background alias',
    run: () => {
      const manifest = normalizeIslandArtManifest({
        version: 2,
        scene: {
          base: 'scene/base.webp',
          boardCircle: 'scene/board-circle.webp',
        },
      }, 2);
      if (!manifest) throw new Error('Expected base-alias manifest to normalize');
      assertEqual(
        getIslandArtAmbientBackgroundSrc(manifest),
        '/assets/islands/island-002/scene/base.webp',
        'Expected deprecated scene.base to act as ambient background alias',
      );
      assertEqual(
        getIslandArtBoardCircleImageSrc(manifest),
        '/assets/islands/island-002/scene/board-circle.webp',
        'Expected boardCircle to remain separate from ambient alias',
      );
    },
  },

  {
    name: 'prefers scene.ambientBackground over deprecated scene.base when both exist',
    run: () => {
      const manifest = normalizeIslandArtManifest({
        version: 2,
        scene: {
          ambientBackground: 'scene/ambient-v2.webp',
          base: 'scene/base-legacy.webp',
        },
      }, 3);
      if (!manifest) throw new Error('Expected dual-background manifest to normalize');
      assertEqual(
        getIslandArtAmbientBackgroundSrc(manifest),
        '/assets/islands/island-003/scene/ambient-v2.webp',
        'Expected scene.ambientBackground to be the canonical full-container background',
      );
      assertEqual(
        manifest.scene?.base,
        '/assets/islands/island-003/scene/base-legacy.webp',
        'Expected deprecated base to remain available only as migration metadata',
      );
    },
  },
  {
    name: 'returns null when v2 manifest is unavailable',
    run: async () => {
      const fetcher: IslandArtManifestFetcher = async () => ({
        ok: false,
        json: async () => ({}),
      });
      const manifest = await loadIslandArtManifest(1, fetcher);
      assertEqual(manifest, null, 'Expected missing manifest fetch to return null');
    },
  },
  {
    name: 'clamps landmark build level and resolves level image',
    run: () => {
      const manifest = normalizeIslandArtManifest(sampleManifest, 1);
      if (!manifest) throw new Error('Expected sample manifest to normalize');
      const landmark = manifest.landmarks[0];
      assert(landmark, 'Expected normalized landmark');
      assertEqual(clampIslandArtBuildLevel(-2), 0, 'Expected negative build level to clamp to 0');
      assertEqual(clampIslandArtBuildLevel(2.9), 2, 'Expected fractional build level to floor');
      assertEqual(clampIslandArtBuildLevel(999), 3, 'Expected high build level to clamp to 3');
      assertEqual(getIslandArtLandmarkImageSrc(landmark, 0), null, 'Expected unbuilt landmark to have no level image');
      assertEqual(
        getIslandArtLandmarkImageSrc(landmark, 2),
        '/assets/islands/island-001/landmarks/landmark-01-level-02.webp',
        'Expected build level 2 to select level 2 image',
      );
      assertEqual(
        getIslandArtLandmarkImageSrc(landmark, 5),
        '/assets/islands/island-001/landmarks/landmark-01-level-03.webp',
        'Expected over-max build level to select level 3 image',
      );
    },
  },
  {
    name: 'selects boss idle/default and defeated static images',
    run: () => {
      const manifest = normalizeIslandArtManifest(sampleManifest, 1);
      if (!manifest) throw new Error('Expected sample manifest to normalize');
      assertEqual(
        getIslandArtBossImageSrc(manifest.boss, false),
        '/assets/islands/island-001/boss/boss-idle.webp',
        'Expected undefeated boss to use idle image',
      );
      assertEqual(
        getIslandArtBossImageSrc(manifest.boss, true),
        '/assets/islands/island-001/boss/boss-defeated.webp',
        'Expected defeated boss to use defeated image',
      );
    },
  },
  {
    name: 'missing optional layers do not break manifest normalization',
    run: () => {
      const manifest = normalizeIslandArtManifest({
        version: 2,
        islandNumber: 4,
        boss: {
          id: 'boss-04',
          x: 500,
          y: 500,
          width: 220,
          height: 220,
          images: {
            idle: 'boss/boss-idle.webp',
          },
        },
      }, 4);
      if (!manifest) throw new Error('Expected boss-only manifest to normalize as available v2 art');
      assertEqual(manifest.scene, undefined, 'Expected missing scene to stay optional');
      assertEqual(manifest.landmarks.length, 0, 'Expected missing landmarks to normalize to an empty array');
      assertEqual(manifest.scenery.length, 0, 'Expected missing scenery to normalize to an empty array');
      assertEqual(
        getIslandArtBossImageSrc(manifest.boss, true),
        '/assets/islands/island-004/boss/boss-idle.webp',
        'Expected defeated boss to fall back to idle when no defeated image exists',
      );
    },
  },
];
