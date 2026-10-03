import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './IslandRunLoadingScreen.css';

export type IslandRunLoadingStage = 'save' | 'bundle' | 'world';

const STAGE_PROGRESS: Record<IslandRunLoadingStage, { floor: number; ceiling: number; label: string }> = {
  save: { floor: 16, ceiling: 42, label: 'Checking your journey' },
  bundle: { floor: 48, ceiling: 68, label: 'Opening the game world' },
  world: { floor: 74, ceiling: 94, label: 'Rendering your island' },
};

let sharedStartedAtMs: number | null = null;
let sharedLastSeenAtMs = 0;
let sharedProgress = 8;
/** Back-to-back save, bundle and first-frame screens share one progress story. */
const LOADING_SESSION_GAP_MS = 4_000;

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function initializeProgress(stage: IslandRunLoadingStage): number {
  const now = nowMs();
  if (
    sharedStartedAtMs === null
    || sharedProgress >= 100
    || now - sharedLastSeenAtMs > LOADING_SESSION_GAP_MS
  ) {
    sharedStartedAtMs = now;
    sharedProgress = 8;
  }
  sharedLastSeenAtMs = now;
  sharedProgress = Math.max(sharedProgress, STAGE_PROGRESS[stage].floor);
  return Math.round(sharedProgress);
}

/** Call only after the first valid 3D frame is on screen. */
export function markIslandRunLoadingScreenDone(): void {
  sharedProgress = 100;
  sharedLastSeenAtMs = nowMs();
}

function useStagedProgress(stage: IslandRunLoadingStage): number {
  const [progress, setProgress] = useState(() => initializeProgress(stage));

  useEffect(() => {
    const definition = STAGE_PROGRESS[stage];
    setProgress((current) => Math.max(current, definition.floor));
    const interval = window.setInterval(() => {
      sharedLastSeenAtMs = nowMs();
      setProgress((current) => {
        if (current >= definition.ceiling) return current;
        const remaining = definition.ceiling - current;
        const next = Math.min(definition.ceiling, current + Math.max(1, Math.ceil(remaining * 0.12)));
        sharedProgress = Math.max(sharedProgress, next);
        return next;
      });
    }, 180);
    return () => window.clearInterval(interval);
  }, [stage]);

  return progress;
}

export function IslandRunLoadingScreen({
  title = 'Opening your island',
  detail = 'Waking the world…',
  stage = 'world',
  className = '',
}: {
  title?: string;
  detail?: string;
  stage?: IslandRunLoadingStage;
  className?: string;
}) {
  const progress = useStagedProgress(stage);
  return (
    <div className={`ir-loading ${className}`.trim()}>
      <img
        className="ir-loading__art"
        src="/assets/loading/island-run-voyage-loading-v1.webp"
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        decoding="async"
      />
      <span className="ir-loading__shade" aria-hidden="true" />
      <div className="ir-loading__copy">
        <div className="ir-loading__status" role="status" aria-live="polite" aria-atomic="true">
          <span className="ir-loading__stage">{STAGE_PROGRESS[stage].label}</span>
          <strong>{title}</strong>
          <small>{detail}</small>
        </div>
        <div
          className="ir-loading__progress"
          role="progressbar"
          aria-label="Island loading progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-valuetext={`${progress}% ready`}
        >
          <i style={{ width: `${progress}%` }} />
        </div>
        <span className="ir-loading__percent" aria-hidden="true">{progress}%</span>
      </div>
    </div>
  );
}

/** Never trap the player behind a loading screen (slow device, lost WebGL). */
export const ISLAND_RUN_VIEWPORT_LOADING_MAX_MS = 15_000;
const VIEWPORT_LOADING_FADE_MS = 360;

/**
 * The loading screen as a top-level viewport layer. Game elements (top bar,
 * controller, rails, banners, toasts, pop-ups) all render above an in-scene
 * loading screen, so while the island is loading this layer sits above every
 * one of them and blocks taps. It fades out once `active` turns false, or
 * after ISLAND_RUN_VIEWPORT_LOADING_MAX_MS at the latest.
 */
export function IslandRunViewportLoading({
  active,
  title,
  detail,
  stage = 'world',
  maxMs = ISLAND_RUN_VIEWPORT_LOADING_MAX_MS,
}: {
  active: boolean;
  title?: string;
  detail?: string;
  stage?: IslandRunLoadingStage;
  maxMs?: number;
}) {
  const [timedOut, setTimedOut] = useState(false);
  const shown = active && !timedOut;
  const [mounted, setMounted] = useState(shown);

  useEffect(() => {
    if (!active) { setTimedOut(false); return undefined; }
    const timer = window.setTimeout(() => setTimedOut(true), maxMs);
    return () => window.clearTimeout(timer);
  }, [active, maxMs]);

  useEffect(() => {
    if (shown) { setMounted(true); return undefined; }
    const timer = window.setTimeout(() => setMounted(false), VIEWPORT_LOADING_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [shown]);

  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(
    <div className={`ir-loading-viewport island-5-three-pilot__loading${shown ? '' : ' ir-loading-viewport--leaving'}`} aria-busy={shown}>
      <IslandRunLoadingScreen title={title} detail={detail} stage={stage} />
    </div>,
    document.body,
  );
}
