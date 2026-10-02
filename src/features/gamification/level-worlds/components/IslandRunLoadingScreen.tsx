import { useEffect, useState } from 'react';
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
