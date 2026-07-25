/**
 * MinigameFxOverlay.tsx — a canvas effects layer that sits *above* a DOM-based
 * mini-game board.
 *
 * Companion Feast renders its whole bowl to canvas, so it drives the juice
 * module directly. Space Excavator (and Island Workshop) render their boards
 * as real DOM elements — accessible `<button>` tiles with labels and focus —
 * which is worth keeping. This overlay gives those games particle bursts and
 * screen shake without giving up their DOM semantics.
 *
 * Usage:
 *   const fx = useRef<MinigameFxHandle>(null);
 *   <div style={{ position: 'relative' }}>
 *     <div ref={boardRef}>…tiles…</div>
 *     <MinigameFxOverlay ref={fx} shakeTargetRef={boardRef} />
 *   </div>
 *   fx.current?.burst({ x, y, palette: ['#fff'] });
 *
 * The render loop is idle-stopped: it only runs while particles or a shake are
 * alive, so a quiet board costs nothing.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import type { RefObject } from 'react';
import {
  createMinigameParticleBurst,
  createMinigameShake,
  MINIGAME_SHAKE_NONE,
  stepMinigameParticles,
  stepMinigameShake,
  type MinigameParticle,
  type MinigameShakeState,
} from '../../level-worlds/services/minigameJuice';
import { drawMinigameParticles, prefersReducedMotion } from './minigameCanvasKit';

export interface MinigameFxBurstOptions {
  /** Overlay-local pixel coordinates (see `toLocalPoint`). */
  x: number;
  y: number;
  palette: readonly string[];
  count?: number;
  speed?: number;
  lifeMs?: number;
  radius?: number;
  /** Cone half-width in radians; omit for a full circle. */
  spreadRad?: number;
  angleRad?: number;
  gravity?: number;
}

export interface MinigameFxHandle {
  /** Spawn a particle burst. No-op under reduced motion. */
  burst: (options: MinigameFxBurstOptions) => void;
  /** Shake the `shakeTargetRef` element. No-op under reduced motion. */
  shake: (magnitude: number, durationMs?: number) => void;
  /** Convert a viewport point (e.g. from getBoundingClientRect) to overlay-local. */
  toLocalPoint: (clientX: number, clientY: number) => { x: number; y: number } | null;
  /** Clear all live effects immediately (board changes, unmount-ish resets). */
  clear: () => void;
}

interface MinigameFxOverlayProps {
  /** Element translated while shaking. Usually the board grid. */
  shakeTargetRef?: RefObject<HTMLElement | null>;
  className?: string;
}

export const MinigameFxOverlay = forwardRef<MinigameFxHandle, MinigameFxOverlayProps>(
  function MinigameFxOverlay({ shakeTargetRef, className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<MinigameParticle[]>([]);
    const paletteRef = useRef<string[]>(['#ffffff']);
    const gravityRef = useRef(520);
    const shakeRef = useRef<MinigameShakeState>(MINIGAME_SHAKE_NONE);
    const rngRef = useRef(((Date.now() % 2147483646) + 1) | 0);
    const rafRef = useRef<number | null>(null);
    const lastFrameAtRef = useRef(0);
    const reducedRef = useRef(false);

    useEffect(() => {
      reducedRef.current = prefersReducedMotion();
    }, []);

    /** Match the backing store to the overlay's CSS box at device resolution. */
    const syncCanvasSize = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    }, []);

    useEffect(() => {
      syncCanvasSize();
      if (typeof ResizeObserver === 'undefined') return undefined;
      const canvas = canvasRef.current;
      if (!canvas) return undefined;
      const observer = new ResizeObserver(() => syncCanvasSize());
      observer.observe(canvas);
      return () => observer.disconnect();
    }, [syncCanvasSize]);

    const applyShakeTransform = useCallback((x: number, y: number) => {
      const target = shakeTargetRef?.current;
      if (!target) return;
      target.style.transform = x === 0 && y === 0 ? '' : `translate(${x}px, ${y}px)`;
    }, [shakeTargetRef]);

    const renderFrame = useCallback((nowMs: number) => {
      const canvas = canvasRef.current;
      const dtMs = lastFrameAtRef.current === 0 ? 16 : nowMs - lastFrameAtRef.current;
      lastFrameAtRef.current = nowMs;

      particlesRef.current = stepMinigameParticles(particlesRef.current, {
        dtMs,
        gravity: gravityRef.current,
        drag: 0.86,
      });
      const shakeStep = stepMinigameShake(shakeRef.current, dtMs);
      shakeRef.current = shakeStep.state;
      applyShakeTransform(shakeStep.offsetX, shakeStep.offsetY);

      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = canvas.width / Math.max(1, canvas.getBoundingClientRect().width);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.scale(dpr, dpr);
          drawMinigameParticles(ctx, particlesRef.current, paletteRef.current);
          ctx.restore();
        }
      }

      // Idle-stop: nothing alive means no loop until the next burst/shake.
      if (particlesRef.current.length === 0 && shakeRef.current.remainingMs <= 0) {
        rafRef.current = null;
        lastFrameAtRef.current = 0;
        applyShakeTransform(0, 0);
        return;
      }
      rafRef.current = requestAnimationFrame(renderFrame);
    }, [applyShakeTransform]);

    const ensureLoop = useCallback(() => {
      if (rafRef.current !== null) return;
      lastFrameAtRef.current = 0;
      rafRef.current = requestAnimationFrame(renderFrame);
    }, [renderFrame]);

    useEffect(() => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }, []);

    useImperativeHandle(ref, () => ({
      burst: (options) => {
        if (reducedRef.current) return;
        paletteRef.current = [...options.palette];
        gravityRef.current = options.gravity ?? 520;
        const [particles, nextRng] = createMinigameParticleBurst({
          x: options.x,
          y: options.y,
          count: options.count ?? 14,
          speed: options.speed ?? 150,
          lifeMs: options.lifeMs ?? 620,
          radius: options.radius ?? 3,
          spreadRad: options.spreadRad,
          angleRad: options.angleRad,
          paletteSize: options.palette.length,
          rngState: rngRef.current,
        });
        rngRef.current = nextRng;
        particlesRef.current = [...particlesRef.current, ...particles];
        ensureLoop();
      },
      shake: (magnitude, durationMs = 280) => {
        if (reducedRef.current) return;
        shakeRef.current = createMinigameShake({
          magnitude,
          durationMs,
          rngState: rngRef.current,
          previous: shakeRef.current,
        });
        ensureLoop();
      },
      toLocalPoint: (clientX, clientY) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return { x: clientX - rect.left, y: clientY - rect.top };
      },
      clear: () => {
        particlesRef.current = [];
        shakeRef.current = MINIGAME_SHAKE_NONE;
        applyShakeTransform(0, 0);
      },
    }), [applyShakeTransform, ensureLoop]);

    return (
      <canvas
        ref={canvasRef}
        className={className}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    );
  },
);
