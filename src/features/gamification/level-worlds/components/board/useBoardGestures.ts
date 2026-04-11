import { useCallback, useEffect, useRef } from 'react';

// ─── Gesture hook for pan, pinch-zoom, double-tap, mouse wheel ──────────────
// Uses PointerEvent for unified mouse + touch handling.
// Reports deltas to the camera hook via callbacks.

export interface GestureCallbacks {
  /** Called during single-finger drag / mouse drag with px delta. */
  onPan: (dx: number, dy: number) => void;
  /** Called during pinch with zoom scale factor and focal point (screen px). */
  onPinchZoom: (scaleFactor: number, focalX: number, focalY: number) => void;
  /** Called when gesture ends with velocity for momentum. */
  onGestureEnd: (velocityX: number, velocityY: number) => void;
  /** Called on double-tap at a screen position. */
  onDoubleTap: (x: number, y: number) => void;
  /** Called on mouse wheel zoom with delta and focal point. */
  onWheelZoom: (delta: number, focalX: number, focalY: number) => void;
}

interface PointerEntry {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  startTime: number;
}

export function useBoardGestures(
  containerRef: React.RefObject<HTMLElement | null>,
  callbacks: GestureCallbacks,
) {
  const pointersRef = useRef<Map<number, PointerEntry>>(new Map());
  const lastPinchDistRef = useRef<number>(0);
  const lastPanTimeRef = useRef<number>(0);
  const panVelocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const elNonNull = el;

    const pointers = pointersRef.current;

    function getDistance(a: PointerEntry, b: PointerEntry) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function getMidpoint(a: PointerEntry, b: PointerEntry) {
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    function onPointerDown(e: PointerEvent) {
      // Capture so we get pointermove even if pointer leaves element
      elNonNull.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        startX: e.clientX,
        startY: e.clientY,
        startTime: performance.now(),
      });

      // Double-tap detection
      if (pointers.size === 1) {
        const now = performance.now();
        const last = lastTapRef.current;
        if (
          now - last.time < 300 &&
          Math.abs(e.clientX - last.x) < 30 &&
          Math.abs(e.clientY - last.y) < 30
        ) {
          callbacksRef.current.onDoubleTap(e.clientX, e.clientY);
          lastTapRef.current = { time: 0, x: 0, y: 0 }; // reset
          return;
        }
        lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
      }

      // Initialize pinch distance if two fingers
      if (pointers.size === 2) {
        const [a, b] = Array.from(pointers.values());
        lastPinchDistRef.current = getDistance(a, b);
      }
    }

    function onPointerMove(e: PointerEvent) {
      const entry = pointers.get(e.pointerId);
      if (!entry) return;

      const prevX = entry.x;
      const prevY = entry.y;
      entry.x = e.clientX;
      entry.y = e.clientY;

      if (pointers.size === 1) {
        // Single finger pan
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        const now = performance.now();
        const dt = Math.max(now - lastPanTimeRef.current, 1) / 1000;
        panVelocityRef.current = { vx: dx / dt, vy: dy / dt };
        lastPanTimeRef.current = now;
        callbacksRef.current.onPan(dx, dy);
      } else if (pointers.size === 2) {
        // Pinch zoom
        const [a, b] = Array.from(pointers.values());
        const dist = getDistance(a, b);
        const prev = lastPinchDistRef.current;
        if (prev > 0) {
          const scaleFactor = dist / prev;
          const mid = getMidpoint(a, b);
          callbacksRef.current.onPinchZoom(scaleFactor, mid.x, mid.y);
        }
        lastPinchDistRef.current = dist;
      }
    }

    function onPointerUp(e: PointerEvent) {
      try { elNonNull.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      pointers.delete(e.pointerId);

      if (pointers.size === 0) {
        // Gesture ended — fire momentum
        const { vx, vy } = panVelocityRef.current;
        // Only fire momentum if there's meaningful velocity
        if (Math.abs(vx) > 50 || Math.abs(vy) > 50) {
          callbacksRef.current.onGestureEnd(vx, vy);
        } else {
          callbacksRef.current.onGestureEnd(0, 0);
        }
        panVelocityRef.current = { vx: 0, vy: 0 };
      } else if (pointers.size === 1) {
        // Went from 2 fingers to 1 — reset pinch state
        lastPinchDistRef.current = 0;
      }
    }

    function onPointerCancel(e: PointerEvent) {
      onPointerUp(e);
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const zoomDelta = -e.deltaY * 0.001; // normalize
      callbacksRef.current.onWheelZoom(zoomDelta, e.clientX, e.clientY);
    }

    // Prevent default touch actions on the board
    elNonNull.style.touchAction = 'none';

    elNonNull.addEventListener('pointerdown', onPointerDown);
    elNonNull.addEventListener('pointermove', onPointerMove);
    elNonNull.addEventListener('pointerup', onPointerUp);
    elNonNull.addEventListener('pointercancel', onPointerCancel);
    elNonNull.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      elNonNull.removeEventListener('pointerdown', onPointerDown);
      elNonNull.removeEventListener('pointermove', onPointerMove);
      elNonNull.removeEventListener('pointerup', onPointerUp);
      elNonNull.removeEventListener('pointercancel', onPointerCancel);
      elNonNull.removeEventListener('wheel', onWheel);
    };
  }, [containerRef]);

  // Return a reset function in case the consumer wants to clear gesture state
  const resetGestures = useCallback(() => {
    pointersRef.current.clear();
    lastPinchDistRef.current = 0;
    panVelocityRef.current = { vx: 0, vy: 0 };
  }, []);

  return { resetGestures };
}
