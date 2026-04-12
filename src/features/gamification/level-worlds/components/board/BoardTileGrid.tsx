import { useMemo } from 'react';
import { BoardTile } from './BoardTile';
import type { TileAnchor } from '../../services/islandBoardLayout';
import type { IslandTileMapEntry } from '../../services/islandBoardTileMap';

export interface BoardTileGridProps {
  anchors: TileAnchor[];
  boardWidth: number;
  boardHeight: number;
  stopMap: Map<number, string>;
  tileMap: Record<number, IslandTileMapEntry>;
  completedEncounterIndices: Set<number>;
  tokenIndex: number;
  isSpark60: boolean;
  showDebug: boolean;
  isMinimalBoardArt: boolean;
  toScreen: (anchor: TileAnchor) => { x: number; y: number };
}

/**
 * Renders the grid of 60 tiles using memoized BoardTile components.
 */
export function BoardTileGrid(props: BoardTileGridProps) {
  const {
    anchors,
    stopMap,
    tileMap,
    completedEncounterIndices,
    tokenIndex,
    isSpark60,
    showDebug,
    isMinimalBoardArt,
    toScreen,
  } = props;

  // Pre-compute upcoming indices (next 1-3 tiles after token)
  const upcomingSet = useMemo(() => {
    const set = new Set<number>();
    const count = anchors.length;
    for (let i = 1; i <= 3; i++) {
      set.add((tokenIndex + i) % count);
    }
    return set;
  }, [tokenIndex, anchors.length]);

  return (
    <div className="island-run-board__tiles">
      {anchors.map((anchor, index) => {
        const position = toScreen(anchor);
        const isStop = stopMap.has(index);
        const tileType = tileMap[index]?.tileType;
        const isEncounter = tileType === 'encounter';
        const isEncounterCompleted = isEncounter && completedEncounterIndices.has(index);

        return (
          <BoardTile
            key={anchor.id}
            anchor={anchor}
            index={index}
            position={position}
            isStop={isStop}
            tileType={tileType}
            isEncounter={isEncounter}
            isEncounterCompleted={isEncounterCompleted}
            isTokenCurrent={index === tokenIndex}
            isUpcoming={upcomingSet.has(index)}
              isSpark60={isSpark60}
              tileIndex={index}
              showDebug={showDebug}
              isMinimalBoardArt={isMinimalBoardArt}
            />
          );
        })}
    </div>
  );
}
