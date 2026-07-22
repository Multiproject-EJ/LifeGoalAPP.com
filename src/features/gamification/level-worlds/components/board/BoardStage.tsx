import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CANONICAL_BOARD_SIZE, type TileAnchor } from '../../services/islandBoardLayout';
import type { IslandBoardTheme } from '../../services/islandBoardThemes';
import type { IslandTileMapEntry } from '../../services/islandBoardTileMap';
import type { VisibleTechnologyFragment } from '../../services/islandTechnologyFragmentVisuals';
import { logIslandRunEntryDebug } from '../../services/islandRunEntryDebug';
import { useBoardCamera, type CameraVisualBounds } from './useBoardCamera';
import { useBoardGestures } from './useBoardGestures';
import { useTokenAnimation } from './useTokenAnimation';
import { BoardPathCanvas } from './BoardPathCanvas';
import { BoardTileGrid } from './BoardTileGrid';
import { BoardToken } from './BoardToken';
import { BoardParticles } from './BoardParticles';
import { BoardOrbitStops, type OrbitStopVisualData, type StopProgressState } from './BoardOrbitStops';
import { BoardDice3D } from './BoardDice3D';
import { IslandArtLayers, type IslandArtSceneLayout } from './IslandArtLayers';
import type { IslandArtManifest } from '../../services/islandArtManifest';
import type { BossCreatureArtState } from '../../services/islandRunBossEncounter';
import {
  computeDirectionalLead,
  computeHopDurations,
  getShotPreset,
  landingEventForTile,
} from './cameraDirector';

const PHONE_OVERVIEW_VERTICAL_BIAS_RATIO = 0.055;
const BOARD_TILT_X_DEG = 47;
const BOARD_ROTATE_Z_DEG = 0;
/** How long (ms) the pre-roll anticipation push-in holds before travel begins. */
const PRE_ROLL_HOLD_MS = 150;
const DICE_SCREEN_MARGIN_X = 58;
const DICE_SCREEN_MARGIN_Y = 64;
const DICE_TOKEN_OFFSET_X = 44;
const DICE_TOKEN_OFFSET_Y = -72;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const getScreenClampRange = (size: number, margin: number) => {
  if (size <= margin * 2) {
    const center = size / 2;
    return { min: center, max: center };
  }

  return { min: margin, max: size - margin };
};

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
  /** Visual state for the separate boss creature layer; arena/scenery remains independent. */
  bossCreatureArtState?: BossCreatureArtState;
  /** Spark36 ring gradient CSS value */
  spark36RingGradient: string;
  /** Whether this is a spark36 board */
  isSpark36: boolean;
  /** Show debug overlay */
  showDebug: boolean;
  /** Disable decorative board art for production art integration */
  isMinimalBoardArt?: boolean;
  /** Pause non-essential board motion while a modal owns the user's attention. */
  isInteractionPaused?: boolean;
  /** Optional tilt overrides for quick camera framing tuning */
  boardTiltXDeg?: number;
  boardRotateZDeg?: number;

  /** Tile state data */
  tileMap: Record<number, IslandTileMapEntry>;
  /** Traffic-light bonus progress rendered on the traffic-light tile itself. */
  trafficLightCharge?: number;
  trafficLightChargeTarget?: number;
  stopMap: Map<number, string>;
  completedEncounterIndices: Set<number>;
  visibleTechnologyFragments?: readonly VisibleTechnologyFragment[];

  /** Token state — the index on the board */
  tokenIndex: number;

  /** Visible island caretaker affordance displayed on the board. */
  caretakerArtSrc?: string;
  caretakerLabel?: string;
  caretakerBubbleText?: string | null;
  /**
   * Tile index the caretaker is anchored to. The caretaker sprite renders on
   * the board plane at this tile (following camera pan/zoom) instead of
   * floating in screen space. When null/undefined the caretaker is hidden.
   */
  caretakerTileIndex?: number | null;
  onCaretakerClick?: () => void;

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
  goDefault: () => void;
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
    bossCreatureArtState,
    spark36RingGradient,
    isSpark36,
    showDebug,
    isMinimalBoardArt = false,
    isInteractionPaused = false,
    boardTiltXDeg = BOARD_TILT_X_DEG,
    boardRotateZDeg = BOARD_ROTATE_Z_DEG,
    tileMap,
    trafficLightCharge = 0,
    trafficLightChargeTarget = 8,
    stopMap,
    completedEncounterIndices,
    visibleTechnologyFragments,
    tokenIndex,
    caretakerArtSrc,
    caretakerLabel = 'Island caretaker',
    caretakerBubbleText = null,
    caretakerTileIndex = null,
    onCaretakerClick,
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

  const sceneLayout = useMemo<IslandArtSceneLayout | null>(() => {
    const sceneSpace = islandArtManifest?.sceneSpace;
    if (!sceneSpace) return null;

    const playableBoardRect = islandArtManifest.playableBoardRect ?? {
      x: 0,
      y: 0,
      width: CANONICAL_BOARD_SIZE.width,
      height: CANONICAL_BOARD_SIZE.height,
    };
    const scaleX = (CANONICAL_BOARD_SIZE.width * uniformScale) / playableBoardRect.width;
    const scaleY = (CANONICAL_BOARD_SIZE.height * uniformScale) / playableBoardRect.height;

    return {
      sceneSpace,
      playableBoardRect,
      toScreenPoint: (x: number, y: number) => ({
        x: offsetX + (x - playableBoardRect.x) * scaleX,
        y: offsetY + (y - playableBoardRect.y) * scaleY,
      }),
      scaleWidth: (width: number) => width * scaleX,
      scaleHeight: (height: number) => height * scaleY,
    };
  }, [islandArtManifest?.playableBoardRect, islandArtManifest?.sceneSpace, offsetX, offsetY, uniformScale]);

  const sceneVisualBounds = useMemo<CameraVisualBounds | null>(() => {
    if (!sceneLayout) return null;
    const topLeft = sceneLayout.toScreenPoint(0, 0);
    const bottomRight = sceneLayout.toScreenPoint(sceneLayout.sceneSpace.width, sceneLayout.sceneSpace.height);
    return {
      left: Math.min(topLeft.x, bottomRight.x),
      top: Math.min(topLeft.y, bottomRight.y),
      right: Math.max(topLeft.x, bottomRight.x),
      bottom: Math.max(topLeft.y, bottomRight.y),
    };
  }, [sceneLayout]);

  // ── Camera ───────────────────────────────────────────────────────────────
  const camera = useBoardCamera({
    boardWidth: boardSize.width,
    boardHeight: boardSize.height,
    visualBounds: sceneVisualBounds,
    overviewVerticalBiasRatio: PHONE_OVERVIEW_VERTICAL_BIAS_RATIO,
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

    // A completed sequence can remain in props for one render while the parent
    // commits the canonical post-roll token index. During that hand-off the
    // tokenIndex prop may still point at the pre-roll tile. Never let the
    // single-step fallback consume that stale value or the piece visibly hops
    // back to its starting tile before moving forward again.
    if (pendingHopSequence === lastHopSequenceRef.current) return;

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
  const diceOverlayPosition = useMemo(() => {
    const tokenX = tokenAnim.animState.x || boardSize.width / 2;
    const tokenY = tokenAnim.animState.y || boardSize.height / 2;
    const tokenScreenX = boardSize.width / 2 + camera.camera.x + (tokenX - boardSize.width / 2) * camera.camera.zoom;
    const tokenScreenY = boardSize.height / 2 + camera.camera.y + (tokenY - boardSize.height / 2) * camera.camera.zoom;
    const inwardOffsetX = tokenScreenX > boardSize.width / 2 ? -DICE_TOKEN_OFFSET_X : DICE_TOKEN_OFFSET_X;
    const preferredX = tokenScreenX + inwardOffsetX;
    const preferredY = tokenScreenY + DICE_TOKEN_OFFSET_Y;
    const xRange = getScreenClampRange(boardSize.width, DICE_SCREEN_MARGIN_X);
    const yRange = getScreenClampRange(boardSize.height, DICE_SCREEN_MARGIN_Y);

    return {
      x: clamp(preferredX, xRange.min, xRange.max),
      y: clamp(preferredY, yRange.min, yRange.max),
    };
  }, [
    boardSize.height,
    boardSize.width,
    camera.camera.x,
    camera.camera.y,
    camera.camera.zoom,
    tokenAnim.animState.x,
    tokenAnim.animState.y,
  ]);
  // Caretaker anchoring — resolve the home tile to screen space, then move the
  // full 3D character behind the back edge of the route. A small tangent nudge
  // keeps the feet off both the tile and the central boss affordance. The
  // premium character art already carries the scene's isometric perspective,
  // so it must not receive an extra X-axis counter-rotation here.
  const caretakerAnchor = caretakerTileIndex !== null && caretakerTileIndex !== undefined
    ? anchors[caretakerTileIndex]
    : undefined;
  const caretakerPlacement = useMemo(() => {
    if (!caretakerAnchor) return null;
    const pos = toScreen(caretakerAnchor);
    const centerX = boardSize.width / 2;
    const centerY = boardSize.height / 2;
    const dx = pos.x - centerX;
    const dy = pos.y - centerY;
    const distance = Math.hypot(dx, dy) || 1;
    const outwardOffset = 150 * uniformScale;
    const tangentOffset = 42 * uniformScale;

    return {
      x: pos.x + (dx / distance) * outwardOffset + (-dy / distance) * tangentOffset,
      y: pos.y + (dy / distance) * outwardOffset + (dx / distance) * tangentOffset,
      scale: caretakerAnchor.scale * uniformScale,
    };
  }, [boardSize.height, boardSize.width, caretakerAnchor, toScreen, uniformScale]);

  const diceOverlayStyle = useMemo<CSSProperties>(() => ({
    position: 'absolute',
    left: diceOverlayPosition.x,
    top: diceOverlayPosition.y,
    transform: 'translate(-50%, -50%)',
    zIndex: 12,
    pointerEvents: 'none',
  }), [diceOverlayPosition.x, diceOverlayPosition.y]);

  return (
    <div
      ref={boardRef}
      className={`island-run-board__stage-wrapper ${isMinimalBoardArt ? 'island-run-board__stage-wrapper--minimal-art' : ''} ${isInteractionPaused ? 'island-run-board__stage-wrapper--paused' : ''}`}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      {/* Gesture capture layer (invisible, on top) */}
      <div
        ref={gestureLayerRef}
        className="island-run-board__gesture-layer"
        style={{ position: 'absolute', inset: 0, zIndex: 10, touchAction: 'none' }}
      />

      {/* Legacy ground-plane art follows the live route's 47deg transform.
          Production `final-angle` assets bypass this stage entirely: their
          finished perspective is authored into the raster and must never be
          tilted or vertically normalized a second time. */}
      <div
        className="island-run-board__board-plane-camera-stage"
        style={{ transform: cameraStageTransform, willChange: 'transform' }}
      >
        <IslandArtLayers
          manifest={islandArtManifest}
          landmarkBuildLevels={landmarkBuildLevels}
          isBossDefeated={isBossDefeated}
          bossCreatureArtState={bossCreatureArtState}
          boardWidth={boardSize.width}
          boardHeight={boardSize.height}
          uniformScale={uniformScale}
          toScreen={toScreen}
          sceneLayout={sceneLayout}
          renderMode="board-plane"
        />
      </div>

      {/* Upright/world art follows camera pan/zoom without a second rotateX. */}
      <div
        className="island-run-board__art-camera-stage"
        style={{ transform: artCameraTransform, willChange: 'transform' }}
      >
        <IslandArtLayers
          manifest={islandArtManifest}
          landmarkBuildLevels={landmarkBuildLevels}
          isBossDefeated={isBossDefeated}
          bossCreatureArtState={bossCreatureArtState}
          boardWidth={boardSize.width}
          boardHeight={boardSize.height}
          uniformScale={uniformScale}
          toScreen={toScreen}
          sceneLayout={sceneLayout}
          renderMode="world"
        />
      </div>

      {/* Gameplay camera stage — tile UI/token/dice keep the board tilt/rotation. */}
      <div
        className="island-run-board__camera-stage"
        style={{ transform: cameraStageTransform, willChange: 'transform' }}
      >
        {/* Path overlay image */}
        {theme.pathOverlayImage && !isMinimalBoardArt && !isSpark36 && (
          <img
            className="island-run-board__path-overlay"
            src={theme.pathOverlayImage}
            alt=""
            aria-hidden="true"
          />
        )}

        {/* Canvas path */}
        {!isSpark36 ? (
          <BoardPathCanvas
            anchors={anchors}
            boardWidth={boardSize.width}
            boardHeight={boardSize.height}
            theme={theme}
            showDebug={showDebug}
            isMinimalBoardArt={isMinimalBoardArt}
            toScreen={toScreen}
          />
        ) : null}

        {/* Spark36 ring */}
        {isSpark36 && (
          <div
            className="island-run-board__spark36-ring"
            style={{
              ['--spark-segment-count' as string]: String(anchors.length),
              ['--spark-ring-segments' as string]: spark36RingGradient,
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
          trafficLightCharge={trafficLightCharge}
          trafficLightChargeTarget={trafficLightChargeTarget}
          completedEncounterIndices={completedEncounterIndices}
          visibleTechnologyFragments={visibleTechnologyFragments}
          tokenIndex={tokenIndex}
          isSpark36={isSpark36}
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
            isPaused={isInteractionPaused}
          />
        )}
      </div>
      {/* 3D Dice — screen-clamped near the token so rolls never leave the viewport. */}
      <BoardDice3D
        value1={diceFaces[0]}
        value2={diceFaces[1]}
        isRolling={isRolling}
        style={diceOverlayStyle}
        onRollComplete={onDiceRollComplete}
      />
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
        {/* Island caretaker — tracked from its home tile on the board plane,
            but nudged outside the tile ring and counter-tilted so it reads as
            an upright standee beside the board. */}
        {caretakerArtSrc && caretakerPlacement ? (
          <button
            type="button"
            className="island-run-board__caretaker"
            onClick={onCaretakerClick}
            aria-label={`Talk to ${caretakerLabel}`}
            style={{
              left: caretakerPlacement.x,
              top: caretakerPlacement.y,
              ['--caretaker-scale' as string]: caretakerPlacement.scale.toFixed(4),
              ['--caretaker-counter-tilt' as string]: '0deg',
            }}
          >
            <span className="island-run-board__caretaker-glow" aria-hidden="true" />
            <img className="island-run-board__caretaker-img" src={caretakerArtSrc} alt="" loading="lazy" decoding="async" />
            {caretakerBubbleText ? (
              <span className="island-run-board__caretaker-bubble" aria-hidden="true">
                {caretakerBubbleText}
              </span>
            ) : null}
            <span className="island-run-board__caretaker-label">Caretaker</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
