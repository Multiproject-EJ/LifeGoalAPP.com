import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { TileAnchor } from '../../services/islandBoardLayout';

export interface TokenAnimState {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  isMoving: boolean;
  isLanding: boolean;
}

export interface UseTokenAnimationOptions {
  toScreen: (anchor: TileAnchor) => { x: number; y: number };
  tokenRef?: RefObject<HTMLElement | null>;
  onHop?: (tileIndex: number) => void;
  onHopPosition?: (screenX: number, screenY: number, tileIndex: number) => void;
  onLand?: (tileIndex: number) => void;
  hopDurationMs?: number;
}

function bezierPoint(p0: { x: number; y: number }, cp: { x: number; y: number }, p1: { x: number; y: number }, t: number) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * cp.x + t * t * p1.x,
    y: u * u * p0.y + 2 * u * t * cp.y + t * t * p1.y,
  };
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function useTokenAnimation(opts: UseTokenAnimationOptions) {
  const { toScreen, tokenRef, onHop, onHopPosition, onLand, hopDurationMs = 220 } = opts;

  const [animState, setAnimState] = useState<TokenAnimState>({
    x: 0, y: 0, scaleX: 1, scaleY: 1, isMoving: false, isLanding: false,
  });

  const rafRef = useRef<number>(0);
  const landingTimeoutRef = useRef<number | null>(null);
  const activeRunRef = useRef<{
    id: number;
    resolve: () => void;
  } | null>(null);
  const nextRunIdRef = useRef(1);
  const animPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const writeTokenTransform = useCallback((x: number, y: number, scaleX = 1, scaleY = 1) => {
    animPosRef.current = { x, y };
    const el = tokenRef?.current;
    if (!el) return;
    el.style.setProperty('--token-x', `${x.toFixed(2)}px`);
    el.style.setProperty('--token-y', `${y.toFixed(2)}px`);
    el.style.setProperty('--token-scale-x', scaleX.toFixed(3));
    el.style.setProperty('--token-scale-y', scaleY.toFixed(3));
  }, [tokenRef]);

  const finishActiveRun = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (landingTimeoutRef.current !== null) {
      window.clearTimeout(landingTimeoutRef.current);
      landingTimeoutRef.current = null;
    }
    const active = activeRunRef.current;
    activeRunRef.current = null;
    active?.resolve();
  }, []);

  const snapTo = useCallback((anchor: TileAnchor) => {
    finishActiveRun();
    const pos = toScreen(anchor);
    writeTokenTransform(pos.x, pos.y, 1, 1);
    setAnimState({ x: pos.x, y: pos.y, scaleX: 1, scaleY: 1, isMoving: false, isLanding: false });
  }, [finishActiveRun, toScreen, writeTokenTransform]);

  const animateHops = useCallback((anchors: TileAnchor[], indices: number[], perHopMs?: number[]): Promise<void> => {
    finishActiveRun();
    if (indices.length === 0) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const runId = nextRunIdRef.current++;
      activeRunRef.current = { id: runId, resolve };
      setAnimState((s) => ({ ...s, isMoving: true, isLanding: false }));

      let hopIndex = 0;
      let hopStartTime = 0;
      let fromPos = { x: animPosRef.current.x, y: animPosRef.current.y };

      function resolveIfCurrent() {
        if (activeRunRef.current?.id !== runId) return;
        const active = activeRunRef.current;
        activeRunRef.current = null;
        active?.resolve();
      }

      function startNextHop(now: number) {
        hopStartTime = now;
        const currentTileIdx = indices[hopIndex];
        fromPos = hopIndex === 0 ? fromPos : toScreen(anchors[indices[hopIndex - 1]]);
        onHop?.(currentTileIdx);
        const targetPos = toScreen(anchors[currentTileIdx]);
        onHopPosition?.(targetPos.x, targetPos.y, currentTileIdx);
      }

      function animLoop(now: number) {
        if (activeRunRef.current?.id !== runId) { resolve(); return; }
        if (hopStartTime === 0) startNextHop(now);
        const currentHopMs = perHopMs?.[hopIndex] ?? hopDurationMs;
        const elapsed = now - hopStartTime;
        const progress = Math.min(elapsed / currentHopMs, 1);
        const eased = easeOutCubic(progress);
        const currentIdx = indices[hopIndex];
        const toPos = toScreen(anchors[currentIdx]);
        const cp = { x: (fromPos.x + toPos.x) / 2, y: Math.min(fromPos.y, toPos.y) - 25 };
        const pos = bezierPoint(fromPos, cp, toPos, eased);
        let scaleX = 1;
        let scaleY = 1;
        const isLastHop = hopIndex === indices.length - 1;
        if (progress < 0.3) {
          const launchT = progress / 0.3;
          scaleX = 1 - 0.15 * launchT;
          scaleY = 1 + 0.20 * launchT;
        } else if (progress < 0.7) {
          const midT = (progress - 0.3) / 0.4;
          scaleX = 0.85 + 0.15 * midT;
          scaleY = 1.20 - 0.20 * midT;
        } else if (isLastHop) {
          const landT = (progress - 0.7) / 0.3;
          scaleX = 1 + 0.15 * (1 - landT);
          scaleY = 1 - 0.20 * (1 - landT);
        }

        writeTokenTransform(pos.x, pos.y, scaleX, scaleY);

        if (progress >= 1) {
          hopIndex += 1;
          if (hopIndex < indices.length) {
            fromPos = toPos;
            startNextHop(now);
            rafRef.current = requestAnimationFrame(animLoop);
            return;
          }
          writeTokenTransform(toPos.x, toPos.y, 1, 1);
          setAnimState({ x: toPos.x, y: toPos.y, scaleX: 1, scaleY: 1, isMoving: false, isLanding: true });
          onLand?.(currentIdx);
          landingTimeoutRef.current = window.setTimeout(() => {
            setAnimState((s) => ({ ...s, isLanding: false }));
            landingTimeoutRef.current = null;
          }, 400);
          resolveIfCurrent();
          return;
        }
        rafRef.current = requestAnimationFrame(animLoop);
      }
      rafRef.current = requestAnimationFrame(animLoop);
    });
  }, [finishActiveRun, hopDurationMs, onHop, onHopPosition, onLand, toScreen, writeTokenTransform]);

  const cancelAnimation = useCallback(() => {
    finishActiveRun();
    setAnimState((s) => ({ ...s, isMoving: false, isLanding: false }));
  }, [finishActiveRun]);

  useEffect(() => () => finishActiveRun(), [finishActiveRun]);

  return { animState, snapTo, animateHops, cancelAnimation, getCurrentPosition: () => animPosRef.current };
}
