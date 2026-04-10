import { useEffect, useMemo, useRef, useState } from 'react';
import {
  TILE_ANCHORS_60,
  STOP_TILE_INDICES_60,
  CANONICAL_BOARD_SIZE,
} from '../services/islandBoardLayout';
import type {
  BoardRendererContractV1,
  BoardRendererContractV1Intent,
  BoardRendererContractV1StopId,
} from '../services/islandRunBoardRendererContractV1';

interface TransplantedBoardSceneProps {
  contract: BoardRendererContractV1;
  onIntent: (intent: BoardRendererContractV1Intent) => void;
}

type SceneTile = {
  id: string;
  index: number;
  icon: string;
  position: { x: number; y: number };
  scale: number;
};

type SceneStop = {
  id: BoardRendererContractV1StopId;
  name: string;
  icon: string;
  position: { x: number; y: number };
  scale: number;
  status: 'locked' | 'active' | 'buildable' | 'completed';
  buildProgress?: number;
  maxBuildProgress?: number;
};

const TILE_ICON_BY_TYPE: Record<string, string> = {
  currency: '🪙',
  chest: '🎁',
  event: '✨',
  hazard: '⚠️',
  egg_shard: '🧩',
  micro: '✅',
  encounter: '⚔️',
};

const STOP_ICON_BY_TYPE: Record<string, string> = {
  hatchery: '🏪',
  habit: '🗼',
  breathing: '🪙',
  wisdom: '🎉',
  boss: '⛰️',
};

const STOP_NAME_BY_TYPE: Record<string, string> = {
  hatchery: 'Hatchery',
  habit: 'Habit Port',
  breathing: 'Breathing Pier',
  wisdom: 'Wisdom Peak',
  boss: 'Boss Summit',
};

function toCenteredPosition(anchor: { x: number; y: number }): { x: number; y: number } {
  return {
    x: anchor.x - CANONICAL_BOARD_SIZE.width / 2,
    y: anchor.y - CANONICAL_BOARD_SIZE.height / 2,
  };
}

export function TransplantedBoardScene({ contract, onIntent }: TransplantedBoardSceneProps) {
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 0.72 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const tiles = useMemo<SceneTile[]>(() => contract.board.tiles.map((tile, index) => {
    const anchor = TILE_ANCHORS_60[index] ?? TILE_ANCHORS_60[0];
    return {
      id: tile.id,
      index,
      icon: index === 0 ? '🏁' : (TILE_ICON_BY_TYPE[tile.type] ?? '✅'),
      position: toCenteredPosition(anchor),
      scale: anchor.scale,
    };
  }), [contract.board.tiles]);

  const stops = useMemo<SceneStop[]>(() => contract.stops.stopList.map((stop, stopListIndex) => {
    const tileIndex = STOP_TILE_INDICES_60[stopListIndex] ?? 0;
    const anchor = TILE_ANCHORS_60[tileIndex] ?? TILE_ANCHORS_60[0];
    const isBuildable = contract.stops.activeStop.id === stop.id && contract.ui.flags.canSpendEssence;
    return {
      id: stop.id,
      name: STOP_NAME_BY_TYPE[stop.type] ?? stop.type,
      icon: STOP_ICON_BY_TYPE[stop.type] ?? '🏝️',
      position: toCenteredPosition(anchor),
      scale: Math.max(0.92, anchor.scale + 0.17),
      status: stop.status === 'completed' ? 'completed' : stop.status === 'active' ? (isBuildable ? 'buildable' : 'active') : 'locked',
      buildProgress: stop.progress.spentEssence,
      maxBuildProgress: stop.progress.requiredEssence,
    };
  }), [contract.stops.stopList, contract.stops.activeStop.id, contract.ui.flags.canSpendEssence]);

  const currentTileIndex = Math.max(0, Math.min(contract.token.currentTileIndex, tiles.length - 1));
  const tokenPosition = tiles[currentTileIndex]?.position ?? { x: 0, y: 0 };

  useEffect(() => {
    const tile = tiles[currentTileIndex];
    if (!tile) return;
    setCamera((prev) => ({ ...prev, x: -tile.position.x * 0.55, y: -tile.position.y * 0.52, zoom: 0.88 }));
  }, [currentTileIndex, tiles]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onPointerDown = (e: PointerEvent) => { dragRef.current = { x: e.clientX, y: e.clientY }; };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      dragRef.current = { x: e.clientX, y: e.clientY };
      setCamera((prev) => ({ ...prev, x: prev.x + dx * 0.9, y: prev.y + dy * 0.9 }));
    };
    const onPointerUp = () => { dragRef.current = null; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setCamera((prev) => ({ ...prev, zoom: Math.max(0.6, Math.min(1.2, prev.zoom - e.deltaY * 0.0008)) }));
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('wheel', onWheel);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden" style={{ touchAction: 'none' }}>
      <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: '2000px', perspectiveOrigin: '50% 50%' }}>
        <div
          className="relative w-[1200px] h-[1200px]"
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom}) rotateX(15deg) rotateZ(-5deg)`,
            transformStyle: 'preserve-3d',
            zIndex: 1,
            transition: 'transform 450ms cubic-bezier(0.22, 0.61, 0.36, 1)',
          }}
        >
          <PathRibbon tiles={tiles} />

          {tiles.map((tile, index) => {
            const isCurrent = index === currentTileIndex;
            const distanceFromCurrent = currentTileIndex - index;
            const isInTrail = distanceFromCurrent > 0 && distanceFromCurrent <= 8;
            const trailIntensity = isInTrail ? Math.max(0, 1 - (distanceFromCurrent / 8)) : 0;
            const isAhead = index > currentTileIndex && index <= currentTileIndex + 2;
            return (
              <button
                key={tile.id}
                type="button"
                className="absolute"
                style={{
                  left: '50%',
                  top: '50%',
                  marginLeft: `${tile.position.x}px`,
                  marginTop: `${tile.position.y}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: Math.floor(1000 + tile.position.y + (isCurrent ? 100 : 0)),
                }}
                onClick={() => onIntent({ type: 'tile_tapped', tileId: tile.id })}
              >
                <div
                  className="relative rounded-2xl overflow-hidden"
                  style={{
                    width: `${42 * tile.scale}px`,
                    height: `${28 * tile.scale}px`,
                    border: '1.5px solid rgba(120, 180, 255, 0.6)',
                    boxShadow: isCurrent
                      ? '0 0 24px 6px rgba(255, 220, 100, 0.7), 0 0 16px 4px rgba(120, 180, 255, 0.8)'
                      : isInTrail
                        ? `0 0 ${10 * trailIntensity}px ${2 * trailIntensity}px rgba(255,220,100,${0.35 * trailIntensity}), 0 0 12px 3px rgba(120,180,255,0.7)`
                        : isAhead
                          ? '0 0 8px 2px rgba(180, 180, 160, 0.2), 0 0 8px 2px rgba(120, 180, 255, 0.6)'
                          : '0 0 8px 2px rgba(120, 180, 255, 0.5)',
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-xs">
                    <span className={isCurrent ? 'text-amber-700' : 'text-stone-400/70'}>{tile.icon}</span>
                  </div>
                </div>
              </button>
            );
          })}

          {stops.map((stop) => {
            const showProgress = stop.status === 'buildable' && stop.buildProgress != null && stop.maxBuildProgress != null && stop.maxBuildProgress > 0;
            const progressPercent = showProgress ? (stop.buildProgress! / stop.maxBuildProgress!) * 100 : 0;
            const gradient = stop.status === 'completed'
              ? 'from-emerald-500 to-green-600'
              : stop.status === 'buildable'
                ? 'from-amber-500 to-orange-600'
                : stop.status === 'active'
                  ? 'from-indigo-500 to-purple-600'
                  : 'from-gray-400 to-gray-500';

            return (
              <div
                key={stop.id}
                className="absolute"
                style={{
                  left: '50%', top: '50%', marginLeft: `${stop.position.x}px`, marginTop: `${stop.position.y}px`,
                  transform: 'translate(-50%, -50%)', zIndex: Math.floor(2000 + stop.position.y), opacity: stop.status === 'locked' ? 0.6 : 1,
                }}
                onClick={stop.status !== 'locked' ? () => onIntent({ type: 'stop_tapped', stopId: stop.id }) : undefined}
              >
                <div className="relative flex flex-col items-center gap-2 cursor-pointer">
                  <div className={`relative rounded-2xl bg-gradient-to-br ${gradient} shadow-xl flex items-center justify-center`} style={{ width: `${80 * stop.scale}px`, height: `${80 * stop.scale}px` }}>
                    <span className="text-white text-2xl">{stop.status === 'locked' ? '🔒' : stop.icon}</span>
                    {stop.status === 'completed' && <span className="absolute top-1 right-1 bg-white rounded-full p-1 text-emerald-600 text-xs">✓</span>}
                  </div>
                  <div className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm shadow-lg"><p className="font-bold text-gray-800 whitespace-nowrap text-xs">{stop.name}</p></div>
                  {showProgress && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-md flex flex-col items-center min-w-[80px]">
                      <div className="text-[8px] font-semibold text-gray-600 mb-0.5">Building {stop.buildProgress}/{stop.maxBuildProgress}</div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: '50%',
              top: '50%',
              marginLeft: `${tokenPosition.x}px`,
              marginTop: `${tokenPosition.y}px`,
              transform: 'translate(-50%, -50%)',
              transition: 'margin 420ms cubic-bezier(0.22,0.61,0.36,1)',
            }}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-2xl border-4 border-white flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PathRibbon({ tiles }: { tiles: SceneTile[] }) {
  const pathData = useMemo(() => {
    if (tiles.length === 0) return '';
    const points = tiles.map((tile) => ({ x: tile.position.x + 600, y: tile.position.y + 600 }));
    points.push(points[0]);
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i += 1) {
      const prevPoint = points[i - 1];
      const currentPoint = points[i];
      const nextPoint = points[(i + 1) % points.length];
      const cp1x = prevPoint.x + (currentPoint.x - prevPoint.x) * 0.5;
      const cp1y = prevPoint.y + (currentPoint.y - prevPoint.y) * 0.5;
      const cp2x = currentPoint.x - (nextPoint.x - currentPoint.x) * 0.25;
      const cp2y = currentPoint.y - (nextPoint.y - currentPoint.y) * 0.25;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${currentPoint.x} ${currentPoint.y}`;
    }
    return d;
  }, [tiles]);

  return (
    <svg className="absolute inset-0 pointer-events-none" width="1200" height="1200" style={{ left: '50%', top: '50%', marginLeft: '-600px', marginTop: '-600px', zIndex: 500 }}>
      <path d={pathData} fill="none" stroke="oklch(0.60 0.02 35)" strokeWidth="84" strokeLinecap="round" strokeLinejoin="round" opacity="0.05" />
      <path d={pathData} fill="none" stroke="oklch(0.83 0.010 44)" strokeWidth="72" strokeLinecap="round" strokeLinejoin="round" opacity="0.12" />
      <path d={pathData} fill="none" stroke="oklch(0.86 0.008 42)" strokeWidth="68" strokeLinecap="round" strokeLinejoin="round" opacity="0.08" />
    </svg>
  );
}
