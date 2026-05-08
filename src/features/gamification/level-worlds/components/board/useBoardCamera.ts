import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createSpring,
  stepSprings,
  SPRING_PRESETS,
  type SpringConfig,
  type SpringState,
} from './springEngine';
import { CAMERA_ZOOM, RESET_CAMERA_ZOOM, type ShotPreset } from './cameraDirector';

// ─── Camera state ────────────────────────────────────────────────────────────

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export type CameraMode = 'board_follow' | 'stop_focus' | 'overview_manual' | 'gesture';

export interface BoardCameraDefaultOptions {
  zoom?: number;
}

export interface CameraVisualBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface UseBoardCameraOptions {
  /** Board container dimensions (px) */
  boardWidth: number;
  boardHeight: number;
  /** Optional full rendered scene bounds, in untransformed stage pixels. */
  visualBounds?: CameraVisualBounds | null;
  /** Spring preset for programmatic camera moves */
  springPreset?: SpringConfig;
}

interface CameraSprings {
  x: SpringState;
  y: SpringState;
  zoom: SpringState;
}

const OVERVIEW_ZOOM = CAMERA_ZOOM.overview;
const FOCUS_ZOOM = CAMERA_ZOOM.travelMedium;
export const DEFAULT_CAMERA_ZOOM = RESET_CAMERA_ZOOM;
const FOLLOW_ZOOM = CAMERA_ZOOM.travelMedium;
export const MANUAL_MIN_CAMERA_ZOOM = RESET_CAMERA_ZOOM;
const MAX_ZOOM = 3.0;
const SCENE_FIT_SAFE_MARGIN = 0.96;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * Keep manual pan inside the visual stage bounds.
 *
 * The camera transform is centered on the board stage, so at or below 1× zoom
 * the stage already fits inside the viewport and manual panning is locked. Once
 * users zoom in, the pan range grows only by the extra scaled content outside
 * the viewport; this prevents dragging the board/art layer completely away.
 */
export function clampCameraPan(
  x: number,
  y: number,
  zoom: number,
  boardWidth: number,
  boardHeight: number,
  visualBounds?: CameraVisualBounds | null,
): Pick<CameraState, 'x' | 'y'> {
  if (visualBounds) {
    return clampCameraPanToVisualBounds(x, y, zoom, boardWidth, boardHeight, visualBounds);
  }

  const halfExtraWidth = Math.max(0, (boardWidth * zoom - boardWidth) / 2);
  const halfExtraHeight = Math.max(0, (boardHeight * zoom - boardHeight) / 2);

  return {
    x: clamp(x, -halfExtraWidth, halfExtraWidth),
    y: clamp(y, -halfExtraHeight, halfExtraHeight),
  };
}

export function computeSceneCameraFrame(
  boardWidth: number,
  boardHeight: number,
  visualBounds?: CameraVisualBounds | null,
  safeMargin = SCENE_FIT_SAFE_MARGIN,
): CameraState {
  if (!visualBounds) return { x: 0, y: 0, zoom: DEFAULT_ZOOM };

  const contentWidth = Math.max(1, visualBounds.right - visualBounds.left);
  const contentHeight = Math.max(1, visualBounds.bottom - visualBounds.top);
  const fitZoom = Math.min(boardWidth / contentWidth, boardHeight / contentHeight) * safeMargin;
  const zoom = Math.min(DEFAULT_ZOOM, clamp(fitZoom, 0.1, MAX_ZOOM));
  return {
    x: centerScenePanForZoom(boardWidth, visualBounds.left, visualBounds.right, zoom),
    y: centerScenePanForZoom(boardHeight, visualBounds.top, visualBounds.bottom, zoom),
    zoom,
  };
}

function centerScenePanForZoom(viewportSize: number, start: number, end: number, zoom: number): number {
  const viewportCenter = viewportSize / 2;
  const contentCenter = (start + end) / 2;
  return zoom * (viewportCenter - contentCenter);
}

export function clampCameraPanToVisualBounds(
  x: number,
  y: number,
  zoom: number,
  boardWidth: number,
  boardHeight: number,
  visualBounds: CameraVisualBounds,
): Pick<CameraState, 'x' | 'y'> {
  const centerX = boardWidth / 2;
  const centerY = boardHeight / 2;
  const transformedLeftWithoutPan = zoom * visualBounds.left + (1 - zoom) * centerX;
  const transformedRightWithoutPan = zoom * visualBounds.right + (1 - zoom) * centerX;
  const transformedTopWithoutPan = zoom * visualBounds.top + (1 - zoom) * centerY;
  const transformedBottomWithoutPan = zoom * visualBounds.bottom + (1 - zoom) * centerY;

  const minX = boardWidth - transformedRightWithoutPan;
  const maxX = -transformedLeftWithoutPan;
  const minY = boardHeight - transformedBottomWithoutPan;
  const maxY = -transformedTopWithoutPan;

  return {
    x: minX <= maxX ? clamp(x, minX, maxX) : centerScenePanForZoom(boardWidth, visualBounds.left, visualBounds.right, zoom),
    y: minY <= maxY ? clamp(y, minY, maxY) : centerScenePanForZoom(boardHeight, visualBounds.top, visualBounds.bottom, zoom),
  };
}

export function useBoardCamera(options: UseBoardCameraOptions) {
  const { boardWidth, boardHeight, visualBounds = null, springPreset = SPRING_PRESETS.smooth } = options;
  const defaultFrame = useMemo(
    () => computeSceneCameraFrame(boardWidth, boardHeight, visualBounds),
    [boardHeight, boardWidth, visualBounds],
  );
  const defaultFrameKey = useMemo(() => JSON.stringify({ boardWidth, boardHeight, visualBounds }), [boardHeight, boardWidth, visualBounds]);
  const minZoom = defaultFrame.zoom;

  // The "committed" camera state that the renderer reads each frame.
  const [camera, setCamera] = useState<CameraState>(() => defaultFrame);
  const [mode, setMode] = useState<CameraMode>('board_follow');

  // Spring state lives in a ref to avoid re-renders per tick.
  const springsRef = useRef<CameraSprings>({
    x: createSpring(defaultFrame.x),
    y: createSpring(defaultFrame.y),
    zoom: createSpring(defaultFrame.zoom),
  });
  const configRef = useRef<SpringConfig>(springPreset);
  const defaultFrameKeyRef = useRef(defaultFrameKey);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const activeRef = useRef(false);

  // Keep config ref in sync.
  configRef.current = springPreset;

  useEffect(() => {
    if (defaultFrameKeyRef.current === defaultFrameKey) return;
    defaultFrameKeyRef.current = defaultFrameKey;

    const s = springsRef.current;
    if (mode !== 'board_follow' || s.zoom.target > DEFAULT_ZOOM + 0.001) return;

    s.x.value = defaultFrame.x;
    s.x.target = defaultFrame.x;
    s.x.velocity = 0;
    s.x.atRest = true;
    s.y.value = defaultFrame.y;
    s.y.target = defaultFrame.y;
    s.y.velocity = 0;
    s.y.atRest = true;
    s.zoom.value = defaultFrame.zoom;
    s.zoom.target = defaultFrame.zoom;
    s.zoom.velocity = 0;
    s.zoom.atRest = true;
    setCamera(defaultFrame);
  }, [defaultFrame, defaultFrameKey, mode]);

  // ── Core animation loop ────────────────────────────────────────────────────
  const tick = useCallback((now: number) => {
    const dt = Math.min((now - lastTimeRef.current) / 1000, 0.064); // cap at ~15fps min
    lastTimeRef.current = now;

    const springs = springsRef.current;
    const anyActive = stepSprings(springs, configRef.current, dt);

    setCamera({ x: springs.x.value, y: springs.y.value, zoom: springs.zoom.value });

    if (anyActive) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      activeRef.current = false;
    }
  }, []);

  const ensureAnimating = useCallback(() => {
    if (!activeRef.current) {
      activeRef.current = true;
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  // Cleanup on unmount.
  useEffect(() => () => { cancelAnimationFrame(rafRef.current); }, []);

  // ── Asymmetric spring helpers ──────────────────────────────────────────────
  /** Temporarily use a given spring config; the next "return" call restores smooth. */
  const useSpringConfig = useCallback((config: SpringConfig) => {
    configRef.current = config;
  }, []);

  const restoreDefaultSpring = useCallback(() => {
    configRef.current = springPreset;
  }, [springPreset]);

  /** Apply spring config from a ShotPreset — extracts the right config key and falls back. */
  const applyPresetSpring = useCallback((
    preset: ShotPreset | undefined,
    phase: 'springIn' | 'springOut',
  ) => {
    const config = preset?.[phase];
    if (config) {
      useSpringConfig(config);
    } else {
      restoreDefaultSpring();
    }
  }, [useSpringConfig, restoreDefaultSpring]);

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Smoothly animate to overview (zoomed out, centered). */
  const goOverview = useCallback(() => {
    restoreDefaultSpring();
    const s = springsRef.current;
    const overviewFrame = visualBounds ? defaultFrame : { x: 0, y: 0, zoom: OVERVIEW_ZOOM };
    s.x.target = overviewFrame.x;
    s.y.target = overviewFrame.y;
    s.zoom.target = overviewFrame.zoom;
    setMode('overview_manual');
    ensureAnimating();
  }, [defaultFrame, ensureAnimating, restoreDefaultSpring, visualBounds]);

  /** Smoothly animate to focus on a screen-space point (px). */
  const goFocusPoint = useCallback((screenX: number, screenY: number, zoom: number = FOCUS_ZOOM) => {
    const s = springsRef.current;
    s.x.target = (boardWidth / 2) - screenX;
    s.y.target = (boardHeight / 2) - screenY;
    s.zoom.target = zoom;
    setMode('stop_focus');
    ensureAnimating();
  }, [boardWidth, boardHeight, ensureAnimating]);

  /**
   * Follow token during movement with directional lead offset.
   *
   * The token is placed at ~40% in its direction of travel (not dead center)
   * so the board "has somewhere to go."  The optional leadX/leadY come from
   * `computeDirectionalLead()` in cameraDirector.ts.
   */
  const goFollowToken = useCallback((
    screenX: number,
    screenY: number,
    leadX = 0,
    leadY = 0,
  ) => {
    const s = springsRef.current;
    s.x.target = (boardWidth / 2) - screenX - leadX;
    s.y.target = (boardHeight / 2) - screenY - leadY;
    s.zoom.target = FOLLOW_ZOOM;
    setMode('board_follow');
    ensureAnimating();
  }, [boardWidth, boardHeight, ensureAnimating]);

  /**
   * Landing focus driven by a ShotPreset from the CameraDirector.
   * Uses the preset's zoom level and switches to its springIn config
   * for the snappy punch-in feel.
   */
  const goLandingFocus = useCallback((
    screenX: number,
    screenY: number,
    preset?: ShotPreset,
  ) => {
    const zoom = preset?.zoom ?? CAMERA_ZOOM.tileClose;
    // Asymmetric spring: use snappy config for the punch-in
    applyPresetSpring(preset, 'springIn');
    const s = springsRef.current;
    s.x.target = (boardWidth / 2) - screenX;
    s.y.target = (boardHeight / 2) - screenY;
    s.zoom.target = zoom;
    setMode('board_follow');
    ensureAnimating();
  }, [boardWidth, boardHeight, ensureAnimating, applyPresetSpring]);

  /** Smoothly return to the minimum manual zoom-out camera framing. */
  const goDefault = useCallback((options?: BoardCameraDefaultOptions) => {
    // Asymmetric spring: use smooth config for the return
    restoreDefaultSpring();
    const s = springsRef.current;
    const targetZoom = options?.zoom ?? defaultFrame.zoom;
    s.x.target = defaultFrame.x;
    s.y.target = defaultFrame.y;
    s.zoom.target = targetZoom;
    setMode('board_follow');
    ensureAnimating();
  }, [defaultFrame.x, defaultFrame.y, defaultFrame.zoom, ensureAnimating, restoreDefaultSpring]);

  /**
   * Pre-roll anticipation beat — micro push-in before the dice even roll.
   * Uses snappy spring for fast in, then the travel/follow will take over.
   */
  const goPreRoll = useCallback((screenX: number, screenY: number, preset?: ShotPreset) => {
    const zoom = preset?.zoom ?? CAMERA_ZOOM.preRoll;
    applyPresetSpring(preset, 'springIn');
    const s = springsRef.current;
    s.x.target = (boardWidth / 2) - screenX;
    s.y.target = (boardHeight / 2) - screenY;
    s.zoom.target = zoom;
    setMode('board_follow');
    ensureAnimating();
  }, [boardWidth, boardHeight, ensureAnimating, applyPresetSpring]);

  /** Return to follow framing after a landing hold, using smooth spring. */
  const goReturnToFollow = useCallback((screenX: number, screenY: number, preset?: ShotPreset) => {
    // Asymmetric: slower out
    applyPresetSpring(preset, 'springOut');
    const s = springsRef.current;
    s.x.target = (boardWidth / 2) - screenX;
    s.y.target = (boardHeight / 2) - screenY;
    s.zoom.target = FOLLOW_ZOOM;
    setMode('board_follow');
    ensureAnimating();
  }, [boardWidth, boardHeight, ensureAnimating, applyPresetSpring]);

  /** Apply a small camera shake (used on token landing). */
  const shake = useCallback((amplitude = 3, durationMs = 200) => {
    const s = springsRef.current;
    const origX = s.x.target;
    const origY = s.y.target;
    // Kick velocity for shake effect
    s.x.velocity = (Math.random() - 0.5) * amplitude * 60;
    s.y.velocity = (Math.random() - 0.5) * amplitude * 60;
    ensureAnimating();

    // After duration, restore targets (spring will settle back)
    setTimeout(() => {
      s.x.target = origX;
      s.y.target = origY;
    }, durationMs);
  }, [ensureAnimating]);

  /** Direct gesture input: immediately set camera position (no spring). */
  const setGestureCamera = useCallback((x: number, y: number, zoom: number) => {
    const clampedZoom = clamp(zoom, minZoom, MAX_ZOOM);
    const clampedPan = clampCameraPan(x, y, clampedZoom, boardWidth, boardHeight, visualBounds);
    const s = springsRef.current;
    // Snap springs to gesture values (no animation)
    s.x.value = clampedPan.x;   s.x.target = clampedPan.x;   s.x.velocity = 0; s.x.atRest = true;
    s.y.value = clampedPan.y;   s.y.target = clampedPan.y;   s.y.velocity = 0; s.y.atRest = true;
    s.zoom.value = clampedZoom; s.zoom.target = clampedZoom; s.zoom.velocity = 0; s.zoom.atRest = true;
    setCamera({ x: clampedPan.x, y: clampedPan.y, zoom: clampedZoom });
    setMode('gesture');
  }, [boardWidth, boardHeight, minZoom, visualBounds]);

  /** Release gesture with momentum — set targets offset by velocity, let spring settle. */
  const releaseGesture = useCallback((velocityX: number, velocityY: number) => {
    const s = springsRef.current;
    const momentumScale = 0.15; // tuning: how far momentum carries
    const rawTargetX = s.x.value + velocityX * momentumScale;
    const rawTargetY = s.y.value + velocityY * momentumScale;
    const clampedPan = clampCameraPan(rawTargetX, rawTargetY, s.zoom.value, boardWidth, boardHeight, visualBounds);
    const hitHorizontalBound = clampedPan.x !== rawTargetX;
    const hitVerticalBound = clampedPan.y !== rawTargetY;

    s.x.target = clampedPan.x;
    s.y.target = clampedPan.y;
    s.x.velocity = hitHorizontalBound ? 0 : velocityX;
    s.y.velocity = hitVerticalBound ? 0 : velocityY;
    // zoom spring stays at current value (no zoom momentum)
    s.zoom.target = s.zoom.value;
    setMode('gesture');
    ensureAnimating();
  }, [boardWidth, boardHeight, ensureAnimating, visualBounds]);

  /** The CSS transform string the camera-stage element should use. */
  const cameraTransform = `translate(${camera.x.toFixed(2)}px, ${camera.y.toFixed(2)}px) scale(${camera.zoom.toFixed(4)})`;

  return {
    camera,
    cameraTransform,
    mode,
    goOverview,
    goFocusPoint,
    goFollowToken,
    goLandingFocus,
    goDefault,
    goPreRoll,
    goReturnToFollow,
    shake,
    setGestureCamera,
    releaseGesture,
    MIN_ZOOM: minZoom,
    MAX_ZOOM,
  };
}
