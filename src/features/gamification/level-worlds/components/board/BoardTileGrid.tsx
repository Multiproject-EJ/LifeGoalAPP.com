import { memo, useMemo } from 'react';
import { BoardTile } from './BoardTile';
import type { TileAnchor } from '../../services/islandBoardLayout';
import type { IslandTileMapEntry } from '../../services/islandBoardTileMap';
import type { VisibleTechnologyFragment } from '../../services/islandTechnologyFragmentVisuals';

export interface BoardTileGridProps {
  anchors: TileAnchor[];
  boardWidth: number;
  boardHeight: number;
  stopMap: Map<number, string>;
  tileMap: Record<number, IslandTileMapEntry>;
  trafficLightCharge?: number;
  trafficLightChargeTarget?: number;
  completedEncounterIndices: Set<number>;
  visibleTechnologyFragments?: readonly VisibleTechnologyFragment[];
  tokenIndex: number;
  isSpark36: boolean;
  showDebug: boolean;
  isMinimalBoardArt: boolean;
  /** Uniform board scale forwarded from BoardStage (canonical px → screen px). */
  uniformScale: number;
  toScreen: (anchor: TileAnchor) => { x: number; y: number };
}

/**
 * Renders the ring tiles (36 on the production spark36_ring profile) using
 * memoized BoardTile components. The count is driven by `anchors.length`, not
 * hardcoded, so it follows the active board profile.
 */
export const BoardTileGrid = memo(function BoardTileGrid(props: BoardTileGridProps) {
  const {
    anchors,
    stopMap,
    tileMap,
    trafficLightCharge = 0,
    trafficLightChargeTarget = 8,
    completedEncounterIndices,
    visibleTechnologyFragments = [],
    tokenIndex,
    isSpark36,
    showDebug,
    isMinimalBoardArt,
    uniformScale,
    toScreen,
  } = props;

  const visibleTechnologyFragmentsByTile = useMemo(() => new Map(visibleTechnologyFragments.map((fragment) => [fragment.tileIndex, fragment])), [visibleTechnologyFragments]);

  const trafficLightTile = useMemo(() => {
    const entry = Object.values(tileMap).find((tile) => tile.tileType === 'traffic_light');
    if (!entry) return null;
    const anchor = anchors[entry.index];
    if (!anchor) return null;
    return { anchor, index: entry.index, position: toScreen(anchor) };
  }, [anchors, tileMap, toScreen]);

  // Traffic-light tile turns green only once the green lights are lit (i.e. the
  // charge has reached the green zone of the meter); below that it stays neutral.
  const trafficLightGreenOn = trafficLightCharge >= Math.max(1, trafficLightChargeTarget - 1);

  // Pre-compute upcoming indices (next 1-3 tiles after token)
  const upcomingSet = useMemo(() => {
    const set = new Set<number>();
    const count = anchors.length;
    for (let i = 1; i <= 3; i++) {
      set.add((tokenIndex + i) % count);
    }
    return set;
  }, [tokenIndex, anchors.length]);

  // Tiles adjacent to the token — they get a small delayed ripple bounce on landing.
  const neighborSet = useMemo(() => {
    const count = anchors.length;
    if (count === 0) return new Set<number>();
    return new Set<number>([(tokenIndex + 1) % count, (tokenIndex - 1 + count) % count]);
  }, [tokenIndex, anchors.length]);

  return (
    <div className="island-run-board__tiles">
      {trafficLightTile && (
        <div
          className="island-tile-traffic-light-sign"
          role="status"
          aria-label={`Traffic light bonus ${trafficLightCharge} of ${trafficLightChargeTarget} lights`}
          style={{
            left: trafficLightTile.position.x,
            top: trafficLightTile.position.y,
            ['--tile-rotation-deg' as string]: `${isSpark36 ? trafficLightTile.anchor.tangentDeg + 180 : 0}deg`,
            ['--tile-upright-rotation-deg' as string]: `${isSpark36 ? -(trafficLightTile.anchor.tangentDeg + 180) : 0}deg`,
            ['--tile-render-scale' as string]: (trafficLightTile.anchor.scale * uniformScale).toFixed(4),
            transform: `translate(-50%, -50%) rotate(var(--tile-rotation-deg)) scale(${(trafficLightTile.anchor.scale * uniformScale).toFixed(4)})`,
          }}
        >
          <span className="island-tile-traffic-light-sign__post" aria-hidden="true" />
          <span className="island-tile-traffic-light-sign__panel">
            <span className="island-tile-traffic-light-sign__head" aria-hidden="true">
              {Array.from({ length: Math.min(3, trafficLightChargeTarget) }, (_, index) => {
                const phase = index === 0 ? 'red' : index === 1 ? 'yellow' : 'green';
                const isLit = trafficLightCharge >= Math.min(index + 1, trafficLightChargeTarget);
                return <span key={phase} className={`island-tile-traffic-light-sign__lamp island-tile-traffic-light-sign__lamp--${phase} ${isLit ? 'island-tile-traffic-light-sign__lamp--lit' : ''}`.trim()} />;
              })}
            </span>
            <span className="island-tile-traffic-light-sign__meter" aria-hidden="true">
              {Array.from({ length: trafficLightChargeTarget }, (_, index) => {
                const lightNumber = index + 1;
                const isLit = lightNumber <= trafficLightCharge;
                const greenLightStart = Math.max(1, trafficLightChargeTarget - 1);
                const phase = lightNumber >= greenLightStart ? 'green' : lightNumber >= Math.ceil(trafficLightChargeTarget / 2) ? 'yellow' : 'red';
                return <span key={lightNumber} className={`island-tile-traffic-light-sign__pip island-tile-traffic-light-sign__pip--${phase} ${isLit ? 'island-tile-traffic-light-sign__pip--lit' : ''}`.trim()} />;
              })}
            </span>
            <span className="island-tile-traffic-light-sign__count">{trafficLightCharge}/{trafficLightChargeTarget}</span>
          </span>
        </div>
      )}
      {anchors.map((anchor, index) => {
        const position = toScreen(anchor);
        const isStop = stopMap.has(index);
        const tileType = tileMap[index]?.tileType;
        const isEncounter = tileType === 'encounter';
        const isEncounterCompleted = isEncounter && completedEncounterIndices.has(index);
        const technologyFragment = visibleTechnologyFragmentsByTile.get(index);

        return (
          <BoardTile
            key={anchor.id}
            anchor={anchor}
            index={index}
            position={position}
            isStop={isStop}
            tileType={tileType}
            doorStopId={tileMap[index]?.doorStopId}
            isActiveDoorCluster={tileMap[index]?.isActiveDoorCluster}
            isEncounter={isEncounter}
            isEncounterCompleted={isEncounterCompleted}
            isTokenCurrent={index === tokenIndex}
            isLandingNeighbor={neighborSet.has(index)}
            isUpcoming={upcomingSet.has(index)}
            isSpark36={isSpark36}
            isTrafficLightGreen={tileType === 'traffic_light' && trafficLightGreenOn}
            tileIndex={index}
            showDebug={showDebug}
            isMinimalBoardArt={isMinimalBoardArt}
            technologyFragment={technologyFragment}
            uniformScale={uniformScale}
          />
        );
      })}

      {/* Render collectibles as siblings of every tile. A fragment nested in a
          scaled tile inherits that tile's tiny scale and stacking context,
          which made the Island 1 collectibles 6–9 px and allowed neighbouring
          tiles to paint over them on phones. This dedicated overlay keeps the
          canonical tile association while giving every fragment one reliable
          above-tile plane and a legible screen size. */}
      {visibleTechnologyFragments.map((fragment) => {
        const anchor = anchors[fragment.tileIndex];
        if (!anchor) return null;
        const position = toScreen(anchor);
        const isTokenOnFragment = tokenIndex === fragment.tileIndex;
        const fragmentTileScale = anchor.scale * uniformScale;

        return (
          <span
            key={`technology-fragment-${fragment.fragmentSlot}`}
            className={`island-run-board__technology-fragment${isTokenOnFragment ? ' island-run-board__technology-fragment--landed' : ''}`}
            aria-hidden="true"
            data-fragment-slot={fragment.fragmentSlot}
            data-token-landed={isTokenOnFragment ? 'true' : undefined}
            data-testid={`technology-fragment-${fragment.fragmentSlot}`}
            title={fragment.ariaLabel}
            style={{
              left: position.x,
              top: position.y,
              ['--fragment-animation-delay' as string]: `${fragment.fragmentSlot * -0.11}s`,
              ['--fragment-hover-scale' as string]: (fragmentTileScale * 0.9).toFixed(4),
              ['--fragment-hover-apex-scale' as string]: (fragmentTileScale * 0.96).toFixed(4),
              ['--fragment-landed-start-scale' as string]: (fragmentTileScale * 0.58).toFixed(4),
              ['--fragment-landed-peak-scale' as string]: (fragmentTileScale * 1.72).toFixed(4),
              ['--fragment-landed-settle-scale' as string]: (fragmentTileScale * 1.48).toFixed(4),
            }}
          >
            {fragment.imageSrc ? (
              <img
                className="island-run-board__technology-fragment-image"
                src={fragment.imageSrc}
                alt=""
                aria-hidden="true"
                draggable={false}
              />
            ) : (
              <span className="island-run-board__technology-fragment-emoji" aria-hidden="true">
                {fragment.placeholder}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
});
