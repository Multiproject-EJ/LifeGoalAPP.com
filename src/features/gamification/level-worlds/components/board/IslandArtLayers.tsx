import { useEffect, useState, type CSSProperties } from 'react';
import {
  getIslandArtBoardPlateImageSrc,
  getIslandArtBossImageSrc,
  getIslandArtLandmarkImageSrc,
  type IslandArtManifest,
  type IslandArtRect,
  type IslandArtSpace,
} from '../../services/islandArtManifest';
import type { BossCreatureArtState } from '../../services/islandRunBossEncounter';
import { CANONICAL_BOARD_SIZE, type TileAnchor, type ZBand } from '../../services/islandBoardLayout';

export interface IslandArtSceneLayout {
  sceneSpace: IslandArtSpace;
  playableBoardRect: IslandArtRect;
  toScreenPoint: (x: number, y: number) => { x: number; y: number };
  scaleWidth: (width: number) => number;
  scaleHeight: (height: number) => number;
}

interface IslandArtLayersProps {
  manifest: IslandArtManifest | null;
  landmarkBuildLevels: number[];
  isBossDefeated: boolean;
  bossCreatureArtState?: BossCreatureArtState;
  boardWidth: number;
  boardHeight: number;
  uniformScale: number;
  toScreen: (anchor: TileAnchor) => { x: number; y: number };
  sceneLayout?: IslandArtSceneLayout | null;
}

type BoardArtLayerStyle = CSSProperties & {
  '--island-art-layer-z'?: number;
};

// Visual-only art tuning. These offsets stay in manifest coordinate space so
// they scale with the board without changing tile, stop, or gameplay math.
const BOARD_PLATE_DOWNWARD_OFFSET_RATIO = 0.04;
const BATTLE_CENTER_SCENERY_ID = 'battle-center';
const BATTLE_CENTER_SIZE_SCALE = 2.584;
const BATTLE_CENTER_UPWARD_OFFSET_RATIO = 0.125;
const BOSS_LANDMARK_SIZE_SCALE = 1.7;
const BOSS_LANDMARK_UPWARD_OFFSET_RATIO = 0.1;
const BOSS_LANDMARK_Z_INDEX = 7;

function zIndexForBand(zBand: ZBand | undefined, fallback: number): number {
  switch (zBand) {
    case 'back':
      return 2;
    case 'mid':
      return 4;
    case 'front':
      return 6;
    default:
      return fallback;
  }
}

function makeLayerStyle(options: {
  manifest: IslandArtManifest;
  x: number;
  y: number;
  width: number;
  height: number;
  uniformScale: number;
  toScreen: IslandArtLayersProps['toScreen'];
  zIndex: number;
}): BoardArtLayerStyle {
  const canonicalX = (options.x / options.manifest.coordinateSpace.width) * CANONICAL_BOARD_SIZE.width;
  const canonicalY = (options.y / options.manifest.coordinateSpace.height) * CANONICAL_BOARD_SIZE.height;
  const position = options.toScreen({
    id: 'island_art_layer',
    x: canonicalX,
    y: canonicalY,
    zBand: 'mid',
    tangentDeg: 0,
    scale: 1,
  });
  return {
    left: position.x,
    top: position.y,
    width: (options.width / options.manifest.coordinateSpace.width) * CANONICAL_BOARD_SIZE.width * options.uniformScale,
    height: (options.height / options.manifest.coordinateSpace.height) * CANONICAL_BOARD_SIZE.height * options.uniformScale,
    '--island-art-layer-z': options.zIndex,
  };
}

function makeSceneLayerStyle(options: {
  x: number;
  y: number;
  width: number;
  height: number;
  sceneLayout: IslandArtSceneLayout;
  zIndex: number;
}): BoardArtLayerStyle {
  const position = options.sceneLayout.toScreenPoint(options.x, options.y);
  return {
    left: position.x,
    top: position.y,
    width: options.sceneLayout.scaleWidth(options.width),
    height: options.sceneLayout.scaleHeight(options.height),
    '--island-art-layer-z': options.zIndex,
  };
}

function makeArtLayerStyle(options: {
  manifest: IslandArtManifest;
  x: number;
  y: number;
  width: number;
  height: number;
  uniformScale: number;
  toScreen: IslandArtLayersProps['toScreen'];
  sceneLayout?: IslandArtSceneLayout | null;
  zIndex: number;
}): BoardArtLayerStyle {
  if (options.sceneLayout) {
    return makeSceneLayerStyle({
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      sceneLayout: options.sceneLayout,
      zIndex: options.zIndex,
    });
  }

  return makeLayerStyle({
    manifest: options.manifest,
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    uniformScale: options.uniformScale,
    toScreen: options.toScreen,
    zIndex: options.zIndex,
  });
}

export function IslandArtLayers(props: IslandArtLayersProps) {
  const {
    manifest,
    landmarkBuildLevels,
    isBossDefeated,
    bossCreatureArtState,
    boardWidth,
    boardHeight,
    uniformScale,
    toScreen,
    sceneLayout = null,
  } = props;
  const [hiddenSources, setHiddenSources] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setHiddenSources(new Set());
  }, [manifest]);

  const hideSource = (src: string) => {
    setHiddenSources((current) => {
      if (current.has(src)) return current;
      const next = new Set(current);
      next.add(src);
      return next;
    });
  };

  const boardPlateSrc = getIslandArtBoardPlateImageSrc(manifest);

  if (!manifest) return null;

  const boardPlateRect = sceneLayout?.playableBoardRect;
  const boardSceneLayerStyle = makeArtLayerStyle({
    manifest,
    x: boardPlateRect ? boardPlateRect.x + boardPlateRect.width / 2 : manifest.coordinateSpace.width / 2,
    y: boardPlateRect
      ? boardPlateRect.y + boardPlateRect.height * (0.5 + BOARD_PLATE_DOWNWARD_OFFSET_RATIO)
      : manifest.coordinateSpace.height * (0.5 + BOARD_PLATE_DOWNWARD_OFFSET_RATIO),
    width: boardPlateRect?.width ?? manifest.coordinateSpace.width,
    height: boardPlateRect?.height ?? manifest.coordinateSpace.height,
    uniformScale,
    toScreen,
    sceneLayout,
    zIndex: 0,
  });

  const artSpaceHeight = sceneLayout?.sceneSpace.height ?? manifest.coordinateSpace.height;
  const resolvedBossCreatureArtState = bossCreatureArtState ?? (isBossDefeated ? 'defeated' : 'alive');
  const bossSrc = resolvedBossCreatureArtState === 'hidden'
    ? null
    : getIslandArtBossImageSrc(manifest.boss, resolvedBossCreatureArtState === 'defeated');

  return (
    <div
      className="island-art-layers"
      style={{ width: boardWidth, height: boardHeight }}
      aria-hidden="true"
    >
      {boardPlateSrc && !hiddenSources.has(boardPlateSrc) ? (
        <img
          key={`board-plate-${boardPlateSrc}`}
          className="island-art-layers__image island-art-layers__board-circle island-art-layers__board-plate"
          src={boardPlateSrc}
          alt=""
          draggable={false}
          style={{ ...boardSceneLayerStyle, '--island-art-layer-z': 1 } as BoardArtLayerStyle}
          onError={() => hideSource(boardPlateSrc)}
        />
      ) : null}

      {manifest.scenery.map((scenery) => {
        if (hiddenSources.has(scenery.src)) return null;
        const isBattleCenterScenery = scenery.id === BATTLE_CENTER_SCENERY_ID;
        const scenerySizeScale = isBattleCenterScenery ? BATTLE_CENTER_SIZE_SCALE : 1;
        const sceneryUpwardOffset = isBattleCenterScenery
          ? artSpaceHeight * BATTLE_CENTER_UPWARD_OFFSET_RATIO
          : 0;
        return (
          <img
            key={scenery.id}
            className={`island-art-layers__image island-art-layers__scenery island-art-layers__scenery--${scenery.zBand ?? 'mid'}`}
            src={scenery.src}
            alt=""
            draggable={false}
            style={makeArtLayerStyle({
              manifest,
              x: scenery.x,
              y: scenery.y - sceneryUpwardOffset,
              width: scenery.width * scenerySizeScale,
              height: scenery.height * scenerySizeScale,
              uniformScale,
              toScreen,
              sceneLayout,
              zIndex: zIndexForBand(scenery.zBand, 3),
            })}
            onError={() => hideSource(scenery.src)}
          />
        );
      })}

      {manifest.landmarks.map((landmark) => {
        const src = getIslandArtLandmarkImageSrc(landmark, landmarkBuildLevels[landmark.stopIndex] ?? 0);
        if (!src || hiddenSources.has(src)) return null;
        return (
          <img
            key={`${landmark.stopIndex}-${src}`}
            className={`island-art-layers__image island-art-layers__landmark island-art-layers__landmark--${landmark.zBand ?? 'mid'}`}
            src={src}
            alt=""
            draggable={false}
            style={makeArtLayerStyle({
              manifest,
              x: landmark.x,
              y: landmark.y,
              width: landmark.width,
              height: landmark.height,
              uniformScale,
              toScreen,
              sceneLayout,
              zIndex: zIndexForBand(landmark.zBand, 4),
            })}
            onError={() => hideSource(src)}
          />
        );
      })}

      {bossSrc && !hiddenSources.has(bossSrc) && manifest.boss ? (
        <img
          key={`${manifest.boss.id}-${bossSrc}`}
          className={`island-art-layers__image island-art-layers__boss island-art-layers__boss--${manifest.boss.zBand ?? 'mid'}`}
          src={bossSrc}
          alt=""
          draggable={false}
          style={makeArtLayerStyle({
            manifest,
            x: manifest.boss.x,
            y: manifest.boss.y - (
              artSpaceHeight * BOSS_LANDMARK_UPWARD_OFFSET_RATIO
            ),
            width: manifest.boss.width * BOSS_LANDMARK_SIZE_SCALE,
            height: manifest.boss.height * BOSS_LANDMARK_SIZE_SCALE,
            uniformScale,
            toScreen,
            sceneLayout,
            zIndex: BOSS_LANDMARK_Z_INDEX,
          })}
          onError={() => hideSource(bossSrc)}
        />
      ) : null}
    </div>
  );
}
