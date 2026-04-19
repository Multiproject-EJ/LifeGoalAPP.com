import { useEffect, useRef } from 'react';

/**
 * ConfettiBurst — fullscreen canvas confetti overlay.
 *
 * Drops from the top of the viewport, drifts, flutters, fades. Self-dismissing
 * via `onComplete`; the parent can render it conditionally tied to any trigger
 * (e.g. `showIslandClearCelebration`).
 *
 * Two variants:
 *   - 'standard' → gold / teal / coral rectangles; used on per-island clears.
 *   - 'capstone' → violet / magenta / silver rectangles + star shapes; used
 *     on the 120-cycle rollover to pair with the capstone celebration modal.
 *
 * Respects `prefers-reduced-motion: reduce` — in that mode the component
 * renders nothing and immediately calls `onComplete()` so gated flows still
 * progress normally.
 *
 * Performance: single `<canvas>`, DPR-aware, capped at ~120 pieces, RAF loop
 * that halts itself once every piece has fallen off-screen or expired.
 */

type ConfettiVariant = 'standard' | 'capstone';

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** rotation, radians */
  rot: number;
  /** angular velocity, radians/sec */
  vrot: number;
  /** 0..1 — lifetime progress (1 = just spawned). Falls to 0 over maxLife. */
  life: number;
  maxLife: number;
  width: number;
  height: number;
  color: string;
  /** 'rect' renders a flat tumbling rectangle; 'star' renders a 5-point star. */
  shape: 'rect' | 'star';
  /** For fluttering horizontal wobble. */
  wobblePhase: number;
  wobbleFreq: number;
  wobbleAmp: number;
}

const STANDARD_COLORS = [
  'rgba(255, 215, 95, 0.95)',   // gold
  'rgba(120, 220, 200, 0.95)',  // teal
  'rgba(255, 140, 150, 0.95)',  // coral
  'rgba(255, 255, 255, 0.95)',  // white
];

const CAPSTONE_COLORS = [
  'rgba(180, 140, 255, 0.95)',  // violet
  'rgba(230, 130, 240, 0.95)',  // magenta
  'rgba(210, 210, 245, 0.95)',  // silver-lilac
  'rgba(255, 225, 150, 0.95)',  // warm gold accent
];

const STANDARD_COUNT = 90;
const CAPSTONE_COUNT = 120;
/** Hard ceiling regardless of variant, so a future variant can't blow the budget. */
const MAX_PIECES = 140;

export interface ConfettiBurstProps {
  /**
   * When true (and reduced-motion is not set), the burst spawns on mount and
   * the canvas starts animating. Parent is responsible for unmounting after
   * `onComplete` fires to free the canvas.
   */
  active: boolean;
  variant?: ConfettiVariant;
  /** Fired once every piece has expired or left the viewport. */
  onComplete?: () => void;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function drawStar(ctx: CanvasRenderingContext2D, r: number) {
  // 5-point star, centered on (0,0), outer radius r.
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

export function ConfettiBurst(props: ConfettiBurstProps) {
  const { active, variant = 'standard', onComplete } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const piecesRef = useRef<ConfettiPiece[]>([]);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!active) return;

    // Reduced motion: skip animation entirely and immediately hand control back.
    if (prefersReducedMotion()) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const palette = variant === 'capstone' ? CAPSTONE_COLORS : STANDARD_COLORS;
    const targetCount = variant === 'capstone' ? CAPSTONE_COUNT : STANDARD_COUNT;
    const count = Math.min(targetCount, MAX_PIECES);

    // Spawn pieces along the top edge with a small negative-y spread so the
    // fall-in isn't a perfectly straight curtain.
    const pieces: ConfettiPiece[] = [];
    for (let i = 0; i < count; i++) {
      const isStar = variant === 'capstone' && Math.random() < 0.18;
      pieces.push({
        x: Math.random() * width,
        y: -20 - Math.random() * height * 0.3,
        vx: (Math.random() - 0.5) * 60,
        vy: 120 + Math.random() * 160,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 8,
        life: 1,
        maxLife: 2.4 + Math.random() * 1.8,
        width: isStar ? 9 + Math.random() * 5 : 6 + Math.random() * 6,
        height: isStar ? 9 + Math.random() * 5 : 10 + Math.random() * 8,
        color: palette[Math.floor(Math.random() * palette.length)],
        shape: isStar ? 'star' : 'rect',
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleFreq: 1.5 + Math.random() * 2.5,
        wobbleAmp: 20 + Math.random() * 40,
      });
    }
    piecesRef.current = pieces;
    completedRef.current = false;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }

    function loop(now: number) {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx!.clearRect(0, 0, width, height);

      const list = piecesRef.current;
      let alive = 0;

      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        if (p.life <= 0) continue;

        p.life -= dt / p.maxLife;
        // Gravity acts lightly so pieces flutter rather than plummet.
        p.vy += 40 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vrot * dt;
        p.wobblePhase += p.wobbleFreq * dt;

        const wobble = Math.sin(p.wobblePhase) * p.wobbleAmp * dt;
        const drawX = p.x + wobble;
        const drawY = p.y;

        // Off-screen → retire.
        if (drawY > height + 40 || p.life <= 0) {
          p.life = 0;
          continue;
        }

        alive++;

        const alpha = Math.max(0, Math.min(1, p.life * 1.4));
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = p.color;
        ctx!.save();
        ctx!.translate(drawX, drawY);
        ctx!.rotate(p.rot);
        if (p.shape === 'star') {
          drawStar(ctx!, p.width);
        } else {
          ctx!.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        }
        ctx!.restore();
      }

      ctx!.globalAlpha = 1;

      if (alive > 0) {
        rafRef.current = requestAnimationFrame(loop);
      } else if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
    }

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [active, variant, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="island-run-confetti-burst"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        // Sit above the celebration backdrop (z-index 200) so pieces visually
        // fall in front of the card, but stay strictly decorative.
        zIndex: 210,
      }}
    />
  );
}
