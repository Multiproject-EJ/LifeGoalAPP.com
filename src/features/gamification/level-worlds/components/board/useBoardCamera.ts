import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createSpring,
  stepSprings,
  SPRING_PRESETS,
  type SpringConfig,
  type SpringState,
} from './springEngine';
import { CAMERA_ZOOM, type ShotPreset } from './cameraDirector';

// ─── Camera state ────────────────────────────────────────────────────────────

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export type CameraMode = 'board_follow' | 'stop_focus' | 'overview_manual' | 'gesture';

export interface UseBoardCameraOptions {
  /** Board container dimensions (px) */
  boardWidth: number;
  boardHeight: number;
  /** Spring preset for programmatic camera moves */
  springPreset?: SpringConfig;
}

interface CameraSprings {
  x: SpringState;
  y: SpringState;
  zoom: SpringState;
}

const OVERVIEW_ZOOM = CAMERA_ZOOM.overview;
const FOCUS_ZOOM = 1.5;
const DEFAULT_ZOOM = CAMERA_ZOOM.boardWide;
const FOLLOW_ZOOM = CAMERA_ZOOM.travelMedium;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3.0;

export function useBoardCamera(options: UseBoardCameraOptions) {
  const { boardWidth, boardHeight, springPreset = SPRING_PRESETS.smooth } = options;

  // The "committed" camera state that the renderer reads each frame.
  const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, zoom: 1 });
  const [mode, setMode] = useState<CameraMode>('board_follow');

  // Spring state lives in a ref to avoid re-renders per tick.
  const springsRef = useRef<CameraSprings>({
    x: createSpring(0),
    y: createSpring(0),
    zoom: createSpring(1),
  });
  const configRef = useRef<SpringConfig>(springPreset);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const activeRef = useRef(false);

  // Keep config ref in sync.
  configRef.current = springPreset;

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

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Smoothly animate to overview (zoomed out, centered). */
  const goOverview = useCallback(() => {
    restoreDefaultSpring();
    const s = springsRef.current;
    s.x.target = 0;
    s.y.target = 0;
    s.zoom.target = OVERVIEW_ZOOM;
    setMode('overview_manual');
    ensureAnimating();
  }, [ensureAnimating, restoreDefaultSpring]);

  /** Smoothly animate to focus on a screen-space point (px). */
  const goFocusPoint = useCallback((screenX: number, screenY: number, zoom = FOCUS_ZOOM) => {
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
    if (preset?.springIn) useSpringConfig(preset.springIn);
    const s = springsRef.current;
    s.x.target = (boardWidth / 2) - screenX;
    s.y.target = (boardHeight / 2) - screenY;
    s.zoom.target = zoom;
    setMode('board_follow');
    ensureAnimating();
  }, [boardWidth, boardHeight, ensureAnimating, useSpringConfig]);

  /** Smoothly return to default camera (no offset, zoom 1). */
  const goDefault = useCallback(() => {
    // Asymmetric spring: use smooth config for the return
    restoreDefaultSpring();
    const s = springsRef.current;
    s.x.target = 0;
    s.y.target = 0;
    s.zoom.target = DEFAULT_ZOOM;
    setMode('board_follow');
    ensureAnimating();
  }, [ensureAnimating, restoreDefaultSpring]);

  /**
   * Pre-roll anticipation beat — micro push-in before the dice even roll.
   * Uses snappy spring for fast in, then the travel/follow will take over.
   */
  const goPreRoll = useCallback((screenX: number, screenY: number, preset?: ShotPreset) => {
    const zoom = preset?.zoom ?? 1.15;
    if (preset?.springIn) useSpringConfig(preset.springIn);
    const s = springsRef.current;
    s.x.target = (boardWidth / 2) - screenX;
    s.y.target = (boardHeight / 2) - screenY;
    s.zoom.target = zoom;
    setMode('board_follow');
    ensureAnimating();
  }, [boardWidth, boardHeight, ensureAnimating, useSpringConfig]);

  /** Return to follow framing after a landing hold, using smooth spring. */
  const goReturnToFollow = useCallback((screenX: number, screenY: number, preset?: ShotPreset) => {
    // Asymmetric: slower out
    if (preset?.springOut) {
      useSpringConfig(preset.springOut);
    } else {
      restoreDefaultSpring();
    }
    const s = springsRef.current;
    s.x.target = (boardWidth / 2) - screenX;
    s.y.target = (boardHeight / 2) - screenY;
    s.zoom.target = FOLLOW_ZOOM;
    setMode('board_follow');
    ensureAnimating();
  }, [boardWidth, boardHeight, ensureAnimating, useSpringConfig, restoreDefaultSpring]);

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
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    const s = springsRef.current;
    // Snap springs to gesture values (no animation)
    s.x.value = x;   s.x.target = x;   s.x.velocity = 0; s.x.atRest = true;
    s.y.value = y;   s.y.target = y;   s.y.velocity = 0; s.y.atRest = true;
    s.zoom.value = clampedZoom; s.zoom.target = clampedZoom; s.zoom.velocity = 0; s.zoom.atRest = true;
    setCamera({ x, y, zoom: clampedZoom });
    setMode('gesture');
  }, []);

  /** Release gesture with momentum — set targets offset by velocity, let spring settle. */
  const releaseGesture = useCallback((velocityX: number, velocityY: number) => {
    const s = springsRef.current;
    const momentumScale = 0.15; // tuning: how far momentum carries
    s.x.target = s.x.value + velocityX * momentumScale;
    s.y.target = s.y.value + velocityY * momentumScale;
    s.x.velocity = velocityX;
    s.y.velocity = velocityY;
    // zoom spring stays at current value (no zoom momentum)
    s.zoom.target = s.zoom.value;
    setMode('gesture');
    ensureAnimating();
  }, [ensureAnimating]);

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
    MIN_ZOOM,
    MAX_ZOOM,
  };
}
