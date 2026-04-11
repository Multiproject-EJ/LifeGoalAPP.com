import { useCallback, useRef, useState } from 'react';
import {
  createSpring,
  stepSpring,
  SPRING_PRESETS,
  type SpringConfig,
  type SpringState,
} from './springEngine';
import type { TileAnchor } from '../../services/islandBoardLayout';

// ─── Token animation with Bezier arcs, squash/stretch, and rAF ──────────────

export interface TokenAnimState {
  /** Current screen x/y of the token (interpolated during animation) */
  x: number;
  y: number;
  /** Squash/stretch — scaleX and scaleY  */
  scaleX: number;
  scaleY: number;
  /** Whether the token is currently mid-animation */
  isMoving: boolean;
  /** Whether the token just landed (for landing effect) */
  isLanding: boolean;
}

export interface UseTokenAnimationOptions {
  /** Function to convert a TileAnchor to screen coords */
  toScreen: (anchor: TileAnchor) => { x: number; y: number };
  /** Callback on each hop (for sound/haptics) */
  onHop?: (tileIndex: number) => void;
  /** Callback when landing on final tile */
  onLand?: (tileIndex: number) => void;
  /** Ms per hop — defaults to 220 */
  hopDurationMs?: number;
}

// Quadratic bezier interpolation at t ∈ [0,1]
function bezierPoint(
  p0: { x: number; y: number },
  cp: { x: number; y: number },
  p1: { x: number; y: number },
  t: number,
) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * cp.x + t * t * p1.x,
    y: u * u * p0.y + 2 * u * t * cp.y + t * t * p1.y,
  };
}

// Easing: ease-out cubic
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function useTokenAnimation(opts: UseTokenAnimationOptions) {
  const { toScreen, onHop, onLand, hopDurationMs = 220 } = opts;

  const [animState, setAnimState] = useState<TokenAnimState>({
    x: 0, y: 0, scaleX: 1, scaleY: 1, isMoving: false, isLanding: false,
  });

  const rafRef = useRef<number>(0);
  const isAnimatingRef = useRef(false);

  /** Snap token to a tile (no animation) */
  const snapTo = useCallback((anchor: TileAnchor) => {
    const pos = toScreen(anchor);
    setAnimState({
      x: pos.x, y: pos.y,
      scaleX: 1, scaleY: 1,
      isMoving: false, isLanding: false,
    });
  }, [toScreen]);

  /**
   * Animate the token hopping through a sequence of tile anchors.
   * Returns a Promise that resolves when the full animation completes.
   */
  const animateHops = useCallback((
    anchors: TileAnchor[],
    indices: number[],
  ): Promise<void> => {
    return new Promise<void>((resolve) => {
      if (indices.length === 0) { resolve(); return; }

      cancelAnimationFrame(rafRef.current);
      isAnimatingRef.current = true;
      setAnimState((s) => ({ ...s, isMoving: true, isLanding: false }));

      let hopIndex = 0;
      let hopStartTime = 0;
      let fromPos = toScreen(anchors[indices[0] - 1 < 0 ? anchors.length - 1 : indices[0] - 1] ?? anchors[0]);

      function startNextHop(now: number) {
        hopStartTime = now;
        const currentTileIdx = indices[hopIndex];
        fromPos = hopIndex === 0
          ? fromPos
          : toScreen(anchors[indices[hopIndex - 1]]);

        // Fire hop callback
        onHop?.(currentTileIdx);
      }

      function animLoop(now: number) {
        if (!isAnimatingRef.current) { resolve(); return; }
        if (hopStartTime === 0) startNextHop(now);

        const elapsed = now - hopStartTime;
        const progress = Math.min(elapsed / hopDurationMs, 1);
        const eased = easeOutCubic(progress);

        const currentIdx = indices[hopIndex];
        const toPos = toScreen(anchors[currentIdx]);

        // Bezier arc: control point is elevated midpoint
        const arcHeight = 25; // px lift at apex
        const cp = {
          x: (fromPos.x + toPos.x) / 2,
          y: Math.min(fromPos.y, toPos.y) - arcHeight,
        };
        const pos = bezierPoint(fromPos, cp, toPos, eased);

        // Squash & stretch
        let scaleX = 1;
        let scaleY = 1;
        const isLastHop = hopIndex === indices.length - 1;

        if (progress < 0.3) {
          // Launch stretch
          const launchT = progress / 0.3;
          scaleX = 1 - 0.15 * launchT;
          scaleY = 1 + 0.20 * launchT;
        } else if (progress < 0.7) {
          // Normalize
          const midT = (progress - 0.3) / 0.4;
          scaleX = 0.85 + 0.15 * midT;
          scaleY = 1.20 - 0.20 * midT;
        } else if (isLastHop) {
          // Final landing squash
          const landT = (progress - 0.7) / 0.3;
          scaleX = 1 + 0.15 * (1 - landT);
          scaleY = 1 - 0.20 * (1 - landT);
        }

        setAnimState({
          x: pos.x,
          y: pos.y,
          scaleX,
          scaleY,
          isMoving: true,
          isLanding: false,
        });

        if (progress >= 1) {
          // Hop complete
          hopIndex += 1;
          if (hopIndex < indices.length) {
            fromPos = toPos;
            startNextHop(now);
            rafRef.current = requestAnimationFrame(animLoop);
          } else {
            // All hops done — landing!
            isAnimatingRef.current = false;
            setAnimState({
              x: toPos.x,
              y: toPos.y,
              scaleX: 1,
              scaleY: 1,
              isMoving: false,
              isLanding: true,
            });
            onLand?.(currentIdx);

            // Clear landing flag after animation
            setTimeout(() => {
              setAnimState((s) => ({ ...s, isLanding: false }));
            }, 400);

            resolve();
          }
        } else {
          rafRef.current = requestAnimationFrame(animLoop);
        }
      }

      rafRef.current = requestAnimationFrame(animLoop);
    });
  }, [toScreen, onHop, onLand, hopDurationMs]);

  /** Cancel any in-progress animation */
  const cancelAnimation = useCallback(() => {
    isAnimatingRef.current = false;
    cancelAnimationFrame(rafRef.current);
  }, []);

  return {
    animState,
    snapTo,
    animateHops,
    cancelAnimation,
  };
}
