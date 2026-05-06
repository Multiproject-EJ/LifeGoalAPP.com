import { useEffect, useState, type CSSProperties } from 'react';
import {
  getIslandArtBoardPlateImageSrc,
  getIslandArtBossImageSrc,
  getIslandArtLandmarkImageSrc,
  type IslandArtManifest,
} from '../../services/islandArtManifest';
import { CANONICAL_BOARD_SIZE, type TileAnchor, type ZBand } from '../../services/islandBoardLayout';

interface IslandArtLayersProps {
  manifest: IslandArtManifest | null;
  landmarkBuildLevels: number[];
  isBossDefeated: boolean;
  boardWidth: number;
  boardHeight: number;
  uniformScale: number;
  toScreen: (anchor: TileAnchor) => { x: number; y: number };
}

type BoardArtLayerStyle = CSSProperties & {
  '--island-art-layer-z'?: number;
};

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

export function IslandArtLayers(props: IslandArtLayersProps) {
  const {
    manifest,
    landmarkBuildLevels,
    isBossDefeated,
    boardWidth,
    boardHeight,
    uniformScale,
    toScreen,
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

  const boardSceneLayerStyle = makeLayerStyle({
    manifest,
    x: manifest.coordinateSpace.width / 2,
    y: manifest.coordinateSpace.height / 2,
    width: manifest.coordinateSpace.width,
    height: manifest.coordinateSpace.height,
    uniformScale,
    toScreen,
    zIndex: 0,
  });

  const bossSrc = getIslandArtBossImageSrc(manifest.boss, isBossDefeated);

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

      {manifest.scenery.map((scenery) => hiddenSources.has(scenery.src) ? null : (
        <img
          key={scenery.id}
          className={`island-art-layers__image island-art-layers__scenery island-art-layers__scenery--${scenery.zBand ?? 'mid'}`}
          src={scenery.src}
          alt=""
          draggable={false}
          style={makeLayerStyle({
            manifest,
            x: scenery.x,
            y: scenery.y,
            width: scenery.width,
            height: scenery.height,
            uniformScale,
            toScreen,
            zIndex: zIndexForBand(scenery.zBand, 3),
          })}
          onError={() => hideSource(scenery.src)}
        />
      ))}

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
            style={makeLayerStyle({
              manifest,
              x: landmark.x,
              y: landmark.y,
              width: landmark.width,
              height: landmark.height,
              uniformScale,
              toScreen,
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
          style={makeLayerStyle({
            manifest,
            x: manifest.boss.x,
            y: manifest.boss.y,
            width: manifest.boss.width,
            height: manifest.boss.height,
            uniformScale,
            toScreen,
            zIndex: zIndexForBand(manifest.boss.zBand, 5),
          })}
          onError={() => hideSource(bossSrc)}
        />
      ) : null}
    </div>
  );
}
