import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CANONICAL_BOARD_SIZE, type TileAnchor } from '../../services/islandBoardLayout';
import type { IslandBoardTheme } from '../../services/islandBoardThemes';
import type { IslandTileMapEntry } from '../../services/islandBoardTileMap';
import { logIslandRunEntryDebug } from '../../services/islandRunEntryDebug';
import { useBoardCamera, type BoardCameraDefaultOptions } from './useBoardCamera';
import { useBoardGestures } from './useBoardGestures';
import { useTokenAnimation } from './useTokenAnimation';
import { BoardPathCanvas } from './BoardPathCanvas';
import { BoardTileGrid } from './BoardTileGrid';
import { BoardToken } from './BoardToken';
import { BoardParticles } from './BoardParticles';
import { BoardOrbitStops, type OrbitStopVisualData, type StopProgressState } from './BoardOrbitStops';
import { BoardDice3D } from './BoardDice3D';
import { IslandArtLayers } from './IslandArtLayers';
import type { IslandArtManifest } from '../../services/islandArtManifest';
import {
  computeDirectionalLead,
  computeHopDurations,
  getShotPreset,
  landingEventForTile,
} from './cameraDirector';

const BOARD_TILT_X_DEG = 40;
const BOARD_ROTATE_Z_DEG = 0;
/** How long (ms) the pre-roll anticipation push-in holds before travel begins. */
const PRE_ROLL_HOLD_MS = 150;

// ─── BoardStage: the visual orchestrator ─────────────────────────────────────
// Composes camera, gestures, tiles, token, path, particles into the board scene.
// Game logic (rolling, stops, etc.) stays in IslandRunBoardPrototype.

export interface BoardStageProps {
  /** Tile anchors for the current board profile */
  anchors: TileAnchor[];
  /** Current theme */
  theme: IslandBoardTheme;
  /** Normalized v2 island art manifest loaded by the board container. */
  islandArtManifest: IslandArtManifest | null;
  /** Current stop build levels used by v2 landmark art; read-only visual input. */
  landmarkBuildLevels?: number[];
  /** Whether the current island boss has already been resolved/defeated. */
  isBossDefeated?: boolean;
  /** Spark60 ring gradient CSS value */
  spark40RingGradient: string;
  /** Whether this is a spark40 board */
  isSpark40: boolean;
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

  /**
   * When provided, the token animates through this full sequence of tile
   * indices one hop at a time (Monopoly GO style).  The parent sets this to
   * the list of intermediate + final tiles after a dice roll, then clears it
   * (set to null) once the animation completes via `onHopSequenceComplete`.
   * While a hop sequence is active, plain `tokenIndex` changes are ignored.
   */
  pendingHopSequence?: number[] | null;
  /** Called when the hop sequence animation finishes (all hops done). */
  onHopSequenceComplete?: () => void;

  /** Orbit stop visuals */
  orbitStopVisuals: OrbitStopVisualData[];
  activeStopId: string | null;
  getOrbitStopDisplayIcon: (state: StopProgressState | 'shop', icon: string) => string;

  /** Callbacks from game logic */
  onStopClick: (stopId: string) => void;
  /** Expose camera controls to parent */
  onCameraReady?: (controls: BoardStageCameraControls) => void;
  /** Called when the user manually manipulates the board camera. */
  onCameraGesture?: () => void;
  /** Sound/haptic callbacks */
  onTokenHop?: (tileIndex: number) => void;
  onTokenLand?: (tileIndex: number) => void;

  /** 3D dice state */
  isRolling?: boolean;
  diceFaces?: [number, number];
  onDiceRollComplete?: () => void;
}

export interface BoardStageCameraControls {
  goOverview: () => void;
  goDefault: (options?: BoardCameraDefaultOptions) => void;
  goFocusPoint: (screenX: number, screenY: number, zoom?: number) => void;
  goFollowToken: (screenX: number, screenY: number, leadX?: number, leadY?: number) => void;
  goPreRoll: (screenX: number, screenY: number) => void;
  shake: (amplitude?: number, durationMs?: number) => void;
}

export function BoardStage(props: BoardStageProps) {
  const {
    anchors,
    theme,
    islandArtManifest,
    landmarkBuildLevels = [],
    isBossDefeated = false,
    spark40RingGradient,
    isSpark40,
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
    onCameraGesture,
    onTokenHop,
    onTokenLand,
    pendingHopSequence = null,
    onHopSequenceComplete,
    isRolling = false,
    diceFaces = [1, 1],
    onDiceRollComplete,
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
      goFollowToken: camera.goFollowToken,
      goPreRoll: camera.goPreRoll,
      shake: camera.shake,
    });
  }, [camera.goOverview, camera.goDefault, camera.goFocusPoint, camera.goFollowToken, camera.goPreRoll, camera.shake, onCameraReady]);

  // ── Gestures ─────────────────────────────────────────────────────────────
  const gestureCallbacks = useMemo(() => ({
    onPan: (dx: number, dy: number) => {
      onCameraGesture?.();
      const c = camera.camera;
      camera.setGestureCamera(c.x + dx, c.y + dy, c.zoom);
    },
    onPinchZoom: (scaleFactor: number, focalX: number, focalY: number) => {
      onCameraGesture?.();
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
      onCameraGesture?.();
      if (camera.camera.zoom > 1.2) {
        camera.goOverview();
      } else {
        camera.goDefault();
      }
    },
    onWheelZoom: (delta: number, focalX: number, focalY: number) => {
      onCameraGesture?.();
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
  }), [camera, onCameraGesture]);

  useBoardGestures(gestureLayerRef, gestureCallbacks);

  // Ref for landing-settle setTimeout cleanup
  const landingSettleTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Track the previous hop position for directional lead computation
  const prevHopPosRef = useRef<{ x: number; y: number }>({ x: boardSize.width / 2, y: boardSize.height / 2 });

  // ── Token animation ──────────────────────────────────────────────────────
  const tokenAnim = useTokenAnimation({
    toScreen,
    onHop: onTokenHop,
    onHopPosition: (screenX, screenY, _tileIndex) => {
      // Compute directional lead from previous hop position
      const prev = prevHopPosRef.current;
      const { leadX, leadY } = computeDirectionalLead(prev.x, prev.y, screenX, screenY);
      prevHopPosRef.current = { x: screenX, y: screenY };
      // Camera follows token on each hop with soft spring lag + directional lead
      camera.goFollowToken(screenX, screenY, leadX, leadY);
    },
    onLand: (idx) => {
      onTokenLand?.(idx);
      // Determine camera event kind from stop map (per-stop interest scoring)
      const eventKind = landingEventForTile(idx, stopMap);
      const preset = getShotPreset(eventKind);

      // Landing emphasis: zoom + shake driven by shot preset
      const anchor = anchors[idx];
      if (anchor) {
        const pos = toScreen(anchor);
        camera.goLandingFocus(pos.x, pos.y, preset);
        // Anchor burst to the resolved landing tile position. Reading
        // `tokenAnim.animState` in this callback can be one render behind and
        // place the impact FX on the roll start tile.
        setBurstPos({ x: pos.x, y: pos.y });
      }
      if (preset.shakeAmplitude > 0) {
        camera.shake(preset.shakeAmplitude, preset.shakeDurationMs);
      }

      // Settle back to follow framing after the preset's hold duration
      // Uses smooth spring for the return (asymmetric: fast in, slow out)
      clearTimeout(landingSettleTimeoutRef.current);
      landingSettleTimeoutRef.current = setTimeout(() => {
        const a = anchors[idx];
        if (a) {
          const p = toScreen(a);
          camera.goReturnToFollow(p.x, p.y, preset);
        }
      }, preset.holdMs);
    },
    hopDurationMs: 200,
  });

  // Cleanup landing settle + pre-roll anticipation timeouts on unmount.
  useEffect(() => () => {
    clearTimeout(landingSettleTimeoutRef.current);
    if (preRollTimeoutRef.current !== null) {
      window.clearTimeout(preRollTimeoutRef.current);
      preRollTimeoutRef.current = null;
    }
  }, []);

  // Track previous tokenIndex to distinguish movement from initial snap.
  const prevTokenIndexRef = useRef<number | null>(null);
  // Guard: when a pendingHopSequence is actively animating, ignore tokenIndex prop changes.
  const hopSequenceActiveRef = useRef(false);
  // Track the last pendingHopSequence to detect new sequences.
  const lastHopSequenceRef = useRef<number[] | null>(null);
  // Ensure we notify completion at most once per hop-sequence reference.
  const completedHopSequenceRef = useRef<number[] | null>(null);
  // Allow cancellation of the anticipation delay when effect re-runs/unmounts.
  const preRollTimeoutRef = useRef<number | null>(null);

  // Drive token animation from pendingHopSequence (full sequence) or single-step tokenIndex.
  useEffect(() => {
    // --- Full hop sequence (Monopoly GO style) ---
    if (
      pendingHopSequence
      && pendingHopSequence.length > 0
      && pendingHopSequence !== lastHopSequenceRef.current
    ) {
      logIslandRunEntryDebug('boardstage_hop_start', {
        hopCount: pendingHopSequence.length,
        startTile: pendingHopSequence[0] ?? null,
        endTile: pendingHopSequence[pendingHopSequence.length - 1] ?? null,
        tokenIndexProp: tokenIndex,
      });
      if (preRollTimeoutRef.current !== null) {
        window.clearTimeout(preRollTimeoutRef.current);
        preRollTimeoutRef.current = null;
      }
      lastHopSequenceRef.current = pendingHopSequence;
      completedHopSequenceRef.current = null;
      hopSequenceActiveRef.current = true;
      const tokenX = tokenAnim.animState.x || boardSize.width / 2;
      const tokenY = tokenAnim.animState.y || boardSize.height / 2;

      // Pre-roll anticipation beat — micro push-in before movement
      const preRollPreset = getShotPreset('pre_roll');
      camera.goPreRoll(tokenX, tokenY, preRollPreset);

      // Compute variable hop durations: fast middle hops, slow final hops
      const hopDurations = computeHopDurations(pendingHopSequence.length);

      // Start the hop animation after the anticipation hold
      preRollTimeoutRef.current = window.setTimeout(() => {
        // Reset directional lead tracking from current token position
        prevHopPosRef.current = { x: tokenX, y: tokenY };

        // Switch to smooth travel spring for the movement phase
        camera.goFollowToken(tokenX, tokenY);

        void tokenAnim.animateHops(anchors, pendingHopSequence, hopDurations).then(() => {
          hopSequenceActiveRef.current = false;
          logIslandRunEntryDebug('boardstage_hop_complete', {
            hopCount: pendingHopSequence.length,
            endTile: pendingHopSequence[pendingHopSequence.length - 1] ?? null,
            tokenIndexProp: tokenIndex,
          });
          // NOTE: Do NOT reset `lastHopSequenceRef.current = null` here.
          // Keeping the just-completed sequence reference means that if this
          // effect re-runs before the parent has cleared `pendingHopSequence`
          // (e.g. an unrelated re-render between `.then()` and the parent
          // committing the post-hop state), the
          // `pendingHopSequence !== lastHopSequenceRef.current` guard will
          // be false and we won't replay the animation. The next real roll
          // will pass a fresh array reference, which differs from this one
          // and re-triggers the animation as expected.
          //
          // Update prevTokenIndexRef to the final tile so subsequent
          // single-step changes don't replay the sequence.
          prevTokenIndexRef.current = pendingHopSequence[pendingHopSequence.length - 1] ?? tokenIndex;
          if (completedHopSequenceRef.current !== pendingHopSequence) {
            completedHopSequenceRef.current = pendingHopSequence;
            onHopSequenceComplete?.();
          }
        });
      }, PRE_ROLL_HOLD_MS);
      return () => {
        if (preRollTimeoutRef.current !== null) {
          window.clearTimeout(preRollTimeoutRef.current);
          preRollTimeoutRef.current = null;
        }
      };
    }

    // --- Single-step fallback (used for snap / non-roll index changes) ---
    if (hopSequenceActiveRef.current) return; // ignore while sequence is playing

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenIndex, anchors, pendingHopSequence]);

  // Particle burst state
  const [burstPos, setBurstPos] = useState<{ x: number; y: number } | null>(null);

  // ── Debug overlay ────────────────────────────────────────────────────────
  const ZBAND_COLORS: Record<string, string> = { back: '#50a5ff', mid: '#ffe066', front: '#ff4ff5' };
  const artCameraTransform = camera.cameraTransform;
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

      {/* Art camera stage — follows camera pan/zoom but does not inherit gameplay rotateX/rotateZ. */}
      <div
        className="island-run-board__art-camera-stage"
        style={{ transform: artCameraTransform, willChange: 'transform' }}
      >
        <IslandArtLayers
          manifest={islandArtManifest}
          landmarkBuildLevels={landmarkBuildLevels}
          isBossDefeated={isBossDefeated}
          boardWidth={boardSize.width}
          boardHeight={boardSize.height}
          uniformScale={uniformScale}
          toScreen={toScreen}
        />
      </div>

      {/* Gameplay camera stage — tile UI/token/dice keep the board tilt/rotation. */}
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
        {isSpark40 && (
          <div
            className="island-run-board__spark40-ring"
            style={{
              ['--spark-segment-count' as string]: String(anchors.length),
              ['--spark-ring-segments' as string]: spark40RingGradient,
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
          isSpark40={isSpark40}
          showDebug={showDebug}
          isMinimalBoardArt={isMinimalBoardArt}
          uniformScale={uniformScale}
          toScreen={toScreen}
        />

        {/* Token */}
        <div className="island-run-board__tiles" style={{ pointerEvents: 'none' }}>
          <BoardToken
            animState={tokenAnim.animState}
            zBand={anchors[tokenIndex]?.zBand ?? 'mid'}
          />
        </div>

        {/* 3D Dice — rendered in board-space near the token */}
        <BoardDice3D
          value1={diceFaces[0]}
          value2={diceFaces[1]}
          isRolling={isRolling}
          x={tokenAnim.animState.x}
          y={tokenAnim.animState.y - 52}
          onRollComplete={onDiceRollComplete}
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
      {/*
        Orbit stops HUD — visually shares the board's 3D plane (applies the
        same camera + tilt transform), but sits OUTSIDE the camera-stage DOM
        so it renders above the gesture-capture layer and the stop buttons
        remain clickable. Absent the matching transform the orbit buttons
        would "float" in screen-space while the board zooms/pans/tilts
        behind them (the bug the user reported).
      */}
      <div
        className="island-run-board__orbit-stops-plane"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          transform: cameraStageTransform,
          transformOrigin: 'center center',
          willChange: 'transform',
          zIndex: 11,
        }}
      >
        <BoardOrbitStops
          stopVisuals={orbitStopVisuals}
          activeStopId={activeStopId}
          sceneClass={theme.sceneClass}
          onStopClick={onStopClick}
          getOrbitStopDisplayIcon={getOrbitStopDisplayIcon}
        />
      </div>
    </div>
  );
}
