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

const BOARD_TILT_X_DEG = 40;
const BOARD_ROTATE_Z_DEG = 0;

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
  /** Disable decorative board art for production art integration */
  isMinimalBoardArt?: boolean;
  /** Optional tilt overrides for quick camera framing tuning */
  boardTiltXDeg?: number;
  boardRotateZDeg?: number;

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
    isMinimalBoardArt = false,
    boardTiltXDeg = BOARD_TILT_X_DEG,
    boardRotateZDeg = BOARD_ROTATE_Z_DEG,
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
  const [boardSize, setBoardSize] = useState({ width: 360, height: 640 });

  // ── Board size tracking ──────────────────────────────────────────────────
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setBoardSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // ── Coordinate transform (uniform scale + centering) ────────────────────
  // The canonical board is 1000×1000 (square). On a tall phone viewport we
  // scale uniformly by the narrower dimension and center the content so that
  // tile proportions are preserved while the full viewport is filled by the
  // background and camera stage.
  const { uniformScale, offsetX, offsetY } = useMemo(() => {
    const s = Math.min(
      boardSize.width / CANONICAL_BOARD_SIZE.width,
      boardSize.height / CANONICAL_BOARD_SIZE.height,
    );
    return {
      uniformScale: s,
      offsetX: (boardSize.width - CANONICAL_BOARD_SIZE.width * s) / 2,
      offsetY: (boardSize.height - CANONICAL_BOARD_SIZE.height * s) / 2,
    };
  }, [boardSize.width, boardSize.height]);

  const toScreen = useCallback(
    (anchor: TileAnchor) => ({
      x: offsetX + anchor.x * uniformScale,
      y: offsetY + anchor.y * uniformScale,
    }),
    [uniformScale, offsetX, offsetY],
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
    hopDurationMs: 200,
  });

  // Track previous tokenIndex to distinguish movement from initial snap.
  const prevTokenIndexRef = useRef<number | null>(null);

  // Drive token animation: arc-hop when tokenIndex changes, snap on initial render
  // or when anchors array reference changes (island travel reset).
  useEffect(() => {
    const prev = prevTokenIndexRef.current;
    prevTokenIndexRef.current = tokenIndex;

    const anchor = anchors[tokenIndex];
    if (!anchor) return;

    if (prev !== null && prev !== tokenIndex) {
      // Token moved one step — play bezier arc hop animation.
      void tokenAnim.animateHops(anchors, [tokenIndex]);
    } else {
      // Initial render or same index — snap without animation.
      tokenAnim.snapTo(anchor);
    }
  // tokenAnim.animateHops and tokenAnim.snapTo are stable useCallback refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenIndex, anchors]);

  // Particle burst state
  const [burstPos, setBurstPos] = useState<{ x: number; y: number } | null>(null);

  // ── Debug overlay ────────────────────────────────────────────────────────
  const ZBAND_COLORS: Record<string, string> = { back: '#50a5ff', mid: '#ffe066', front: '#ff4ff5' };
  const cameraStageTransform = `${camera.cameraTransform} rotateX(${boardTiltXDeg}deg) rotateZ(${boardRotateZDeg}deg)`;

  return (
    <div
      ref={boardRef}
      className={`island-run-board__stage-wrapper ${isMinimalBoardArt ? 'island-run-board__stage-wrapper--minimal-art' : ''}`}
      style={{ position: 'relative', width: '100%', height: '100%' }}
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
        style={{ transform: cameraStageTransform, willChange: 'transform' }}
      >
        {/* Path overlay image */}
        {theme.pathOverlayImage && !isMinimalBoardArt && (
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
          isMinimalBoardArt={isMinimalBoardArt}
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
          isMinimalBoardArt={isMinimalBoardArt}
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
        {!isMinimalBoardArt && (
          <BoardParticles
            boardWidth={boardSize.width}
            boardHeight={boardSize.height}
            tokenX={tokenAnim.animState.x}
            tokenY={tokenAnim.animState.y}
            isTokenMoving={tokenAnim.animState.isMoving}
            burstAt={burstPos}
          />
        )}
      </div>
    </div>
  );
}
