import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CANONICAL_BOARD_SIZE, type TileAnchor } from '../../services/islandBoardLayout';
import type { IslandBoardTheme } from '../../services/islandBoardThemes';
import type { IslandTileMapEntry } from '../../services/islandBoardTileMap';
import { useBoardCamera } from './useBoardCamera';
import { useBoardGestures } from './useBoardGestures';
import { useTokenAnimation } from './useTokenAnimation';
import { BoardPathCanvas } from './BoardPathCanvas';
import { BoardTileGrid } from './BoardTileGrid';
import { BoardToken } from './BoardToken';
import { BoardParticles } from './BoardParticles';
import { BoardOrbitStops, type OrbitStopVisualData, type StopProgressState } from './BoardOrbitStops';

// ─── BoardStage: the visual orchestrator ─────────────────────────────────────
// Composes camera, gestures, tiles, token, path, particles into the board scene.
// Game logic (rolling, stops, etc.) stays in IslandRunBoardPrototype.

export interface BoardStageProps {
  /** Tile anchors for the current board profile */
  anchors: TileAnchor[];
  /** Current theme */
  theme: IslandBoardTheme;
  /** Board background image source */
  backgroundSrc: string;
  isBackgroundAvailable: boolean;
  onBackgroundError: () => void;
  /** Spark60 ring gradient CSS value */
  spark60RingGradient: string;
  /** Whether this is a spark60 board */
  isSpark60: boolean;
  /** Show debug overlay */
  showDebug: boolean;

  /** Tile state data */
  tileMap: Record<number, IslandTileMapEntry>;
  stopMap: Map<number, string>;
  completedEncounterIndices: Set<number>;

  /** Token state — the index on the board */
  tokenIndex: number;

  /** Orbit stop visuals */
  orbitStopVisuals: OrbitStopVisualData[];
  activeStopId: string | null;
  getOrbitStopDisplayIcon: (state: StopProgressState | 'shop', icon: string) => string;

  /** Callbacks from game logic */
  onStopClick: (stopId: string) => void;
  /** Expose camera controls to parent */
  onCameraReady?: (controls: BoardStageCameraControls) => void;
  /** Sound/haptic callbacks */
  onTokenHop?: (tileIndex: number) => void;
  onTokenLand?: (tileIndex: number) => void;
}

export interface BoardStageCameraControls {
  goOverview: () => void;
  goDefault: () => void;
  goFocusPoint: (screenX: number, screenY: number, zoom?: number) => void;
  shake: (amplitude?: number, durationMs?: number) => void;
}

export function BoardStage(props: BoardStageProps) {
  const {
    anchors,
    theme,
    backgroundSrc,
    isBackgroundAvailable,
    onBackgroundError,
    spark60RingGradient,
    isSpark60,
    showDebug,
    tileMap,
    stopMap,
    completedEncounterIndices,
    tokenIndex,
    orbitStopVisuals,
    activeStopId,
    getOrbitStopDisplayIcon,
    onStopClick,
    onCameraReady,
    onTokenHop,
    onTokenLand,
  } = props;

  const boardRef = useRef<HTMLDivElement>(null);
  const gestureLayerRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState({ width: 360, height: 360 });

  // ── Board size tracking ──────────────────────────────────────────────────
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      const side = Math.min(rect.width, rect.height);
      setBoardSize({ width: side, height: side });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // ── Coordinate transform ─────────────────────────────────────────────────
  const toScreen = useCallback(
    (anchor: TileAnchor) => ({
      x: (anchor.x / CANONICAL_BOARD_SIZE.width) * boardSize.width,
      y: (anchor.y / CANONICAL_BOARD_SIZE.height) * boardSize.height,
    }),
    [boardSize.width, boardSize.height],
  );

  // ── Camera ───────────────────────────────────────────────────────────────
  const camera = useBoardCamera({
    boardWidth: boardSize.width,
    boardHeight: boardSize.height,
  });

  // Expose camera controls to parent
  useEffect(() => {
    onCameraReady?.({
      goOverview: camera.goOverview,
      goDefault: camera.goDefault,
      goFocusPoint: camera.goFocusPoint,
      shake: camera.shake,
    });
  }, [camera.goOverview, camera.goDefault, camera.goFocusPoint, camera.shake, onCameraReady]);

  // ── Gestures ─────────────────────────────────────────────────────────────
  const gestureCallbacks = useMemo(() => ({
    onPan: (dx: number, dy: number) => {
      const c = camera.camera;
      camera.setGestureCamera(c.x + dx, c.y + dy, c.zoom);
    },
    onPinchZoom: (scaleFactor: number, focalX: number, focalY: number) => {
      const c = camera.camera;
      const newZoom = Math.max(camera.MIN_ZOOM, Math.min(camera.MAX_ZOOM, c.zoom * scaleFactor));
      // Focal-point zoom: adjust x/y so the point under fingers stays fixed
      const zoomRatio = newZoom / c.zoom;
      const boardRect = boardRef.current?.getBoundingClientRect();
      if (boardRect) {
        const relX = focalX - boardRect.left - boardRect.width / 2;
        const relY = focalY - boardRect.top - boardRect.height / 2;
        const newX = c.x - relX * (zoomRatio - 1);
        const newY = c.y - relY * (zoomRatio - 1);
        camera.setGestureCamera(newX, newY, newZoom);
      } else {
        camera.setGestureCamera(c.x, c.y, newZoom);
      }
    },
    onGestureEnd: (vx: number, vy: number) => {
      camera.releaseGesture(vx, vy);
    },
    onDoubleTap: (_x: number, _y: number) => {
      if (camera.camera.zoom > 1.2) {
        camera.goOverview();
      } else {
        camera.goDefault();
      }
    },
    onWheelZoom: (delta: number, focalX: number, focalY: number) => {
      const c = camera.camera;
      const newZoom = Math.max(camera.MIN_ZOOM, Math.min(camera.MAX_ZOOM, c.zoom + delta));
      const zoomRatio = newZoom / c.zoom;
      const boardRect = boardRef.current?.getBoundingClientRect();
      if (boardRect) {
        const relX = focalX - boardRect.left - boardRect.width / 2;
        const relY = focalY - boardRect.top - boardRect.height / 2;
        const newX = c.x - relX * (zoomRatio - 1);
        const newY = c.y - relY * (zoomRatio - 1);
        camera.setGestureCamera(newX, newY, newZoom);
      }
    },
  }), [camera]);

  useBoardGestures(gestureLayerRef, gestureCallbacks);

  // ── Token animation ──────────────────────────────────────────────────────
  const tokenAnim = useTokenAnimation({
    toScreen,
    onHop: onTokenHop,
    onLand: (idx) => {
      onTokenLand?.(idx);
      camera.shake(2.5, 180);
      setBurstPos({ x: tokenAnim.animState.x, y: tokenAnim.animState.y });
    },
    hopDurationMs: 220,
  });

  // Snap token to current position when not animating.
  // We intentionally exclude tokenAnim from deps to avoid re-snapping during animation.
  // snapTo is stable (useCallback with [toScreen]), and isMoving is checked inside.
  useEffect(() => {
    if (!tokenAnim.animState.isMoving) {
      const anchor = anchors[tokenIndex];
      if (anchor) tokenAnim.snapTo(anchor);
    }
  }, [tokenIndex, anchors, toScreen, tokenAnim.animState.isMoving, tokenAnim.snapTo]);

  // Particle burst state
  const [burstPos, setBurstPos] = useState<{ x: number; y: number } | null>(null);

  // ── Debug overlay ────────────────────────────────────────────────────────
  const ZBAND_COLORS: Record<string, string> = { back: '#50a5ff', mid: '#ffe066', front: '#ff4ff5' };

  return (
    <div
      ref={boardRef}
      className="island-run-board__stage-wrapper"
      style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}
    >
      {/* Gesture capture layer (invisible, on top) */}
      <div
        ref={gestureLayerRef}
        className="island-run-board__gesture-layer"
        style={{ position: 'absolute', inset: 0, zIndex: 10, touchAction: 'none' }}
      />

      {/* Camera stage — everything inside moves with the camera */}
      <div
        className="island-run-board__camera-stage"
        style={{ transform: camera.cameraTransform, willChange: 'transform' }}
      >
        {/* Path overlay image */}
        {theme.pathOverlayImage && (
          <img
            className="island-run-board__path-overlay"
            src={theme.pathOverlayImage}
            alt=""
            aria-hidden="true"
          />
        )}

        {/* Canvas path */}
        <BoardPathCanvas
          anchors={anchors}
          boardWidth={boardSize.width}
          boardHeight={boardSize.height}
          theme={theme}
          showDebug={showDebug}
          toScreen={toScreen}
        />

        {/* Spark60 ring */}
        {isSpark60 && (
          <div
            className="island-run-board__spark60-ring"
            style={{
              ['--spark-segment-count' as string]: String(anchors.length),
              ['--spark-ring-segments' as string]: spark60RingGradient,
            }}
            aria-hidden="true"
          />
        )}

        {/* Tile grid */}
        <BoardTileGrid
          anchors={anchors}
          boardWidth={boardSize.width}
          boardHeight={boardSize.height}
          stopMap={stopMap}
          tileMap={tileMap}
          completedEncounterIndices={completedEncounterIndices}
          tokenIndex={tokenIndex}
          isSpark60={isSpark60}
          showDebug={showDebug}
          toScreen={toScreen}
        />

        {/* Token */}
        <div className="island-run-board__tiles" style={{ pointerEvents: 'none' }}>
          <BoardToken
            animState={tokenAnim.animState}
            zBand={anchors[tokenIndex]?.zBand ?? 'mid'}
          />
        </div>

        {/* Orbit stops */}
        <BoardOrbitStops
          stopVisuals={orbitStopVisuals}
          activeStopId={activeStopId}
          sceneClass={theme.sceneClass}
          onStopClick={onStopClick}
          getOrbitStopDisplayIcon={getOrbitStopDisplayIcon}
        />

        {/* Depth mask */}
        <img
          className="island-run-board__depth-mask"
          src={theme.depthMaskImage}
          alt=""
          aria-hidden="true"
        />

        {/* Debug overlay */}
        {showDebug && (
          <svg className="island-debug-overlay" viewBox={`0 0 ${boardSize.width} ${boardSize.height}`}>
            {anchors.map((anchor, index) => {
              const position = toScreen(anchor);
              const tangentLength = 28;
              const tangentX = position.x + Math.cos((anchor.tangentDeg * Math.PI) / 180) * tangentLength;
              const tangentY = position.y + Math.sin((anchor.tangentDeg * Math.PI) / 180) * tangentLength;
              return (
                <g key={`${anchor.id}_debug`}>
                  <circle cx={position.x} cy={position.y} r="17" fill="none" stroke={ZBAND_COLORS[anchor.zBand]} strokeWidth="2" />
                  <line x1={position.x} y1={position.y} x2={tangentX} y2={tangentY} stroke={ZBAND_COLORS[anchor.zBand]} strokeWidth="2" />
                  <text x={position.x + 10} y={position.y - 12} fill="#fff" fontSize="10">#{index}</text>
                  {stopMap.has(index) && (
                    <text x={position.x + 10} y={position.y + 18} fill="#9ef0ff" fontSize="10">
                      {stopMap.get(index)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* Particles (ambient + trail + burst) */}
        <BoardParticles
          boardWidth={boardSize.width}
          boardHeight={boardSize.height}
          tokenX={tokenAnim.animState.x}
          tokenY={tokenAnim.animState.y}
          isTokenMoving={tokenAnim.animState.isMoving}
          burstAt={burstPos}
        />
      </div>
    </div>
  );
}
