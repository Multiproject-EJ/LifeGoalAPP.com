import { useEffect, useRef } from 'react';

// ─── Ambient board particles + token trail ───────────────────────────────────
// Lightweight canvas-based particle system.

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;    // 0..1 (1 = just born)
  maxLife: number;  // seconds
  size: number;
  color: string;
  type: 'ambient' | 'trail' | 'burst';
}

export interface BoardParticlesProps {
  boardWidth: number;
  boardHeight: number;
  /** Token position for trail emission */
  tokenX: number;
  tokenY: number;
  /** Whether token is currently moving (emit trail) */
  isTokenMoving: boolean;
  /** Trigger a burst at given position */
  burstAt?: { x: number; y: number } | null;
  /** Theme accent color for particles */
  accentColor?: string;
}

const MAX_PARTICLES = 80;
const AMBIENT_SPAWN_RATE = 0.3; // particles per second

export function BoardParticles(props: BoardParticlesProps) {
  const { boardWidth, boardHeight, tokenX, tokenY, isTokenMoving, burstAt, accentColor = 'rgba(180, 220, 255, 0.6)' } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const ambientAccumRef = useRef(0);
  const lastBurstRef = useRef<{ x: number; y: number } | null>(null);
  const tokenMovingRef = useRef(isTokenMoving);
  const tokenPosRef = useRef({ x: tokenX, y: tokenY });

  tokenMovingRef.current = isTokenMoving;
  tokenPosRef.current = { x: tokenX, y: tokenY };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(boardWidth * ratio);
    canvas.height = Math.floor(boardHeight * ratio);
    canvas.style.width = `${boardWidth}px`;
    canvas.style.height = `${boardHeight}px`;

    function loop(now: number) {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      const ctx = canvas!.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(loop); return; }

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, boardWidth, boardHeight);

      const particles = particlesRef.current;

      // --- Spawn ambient sparkles ---
      ambientAccumRef.current += AMBIENT_SPAWN_RATE * dt;
      while (ambientAccumRef.current >= 1 && particles.length < MAX_PARTICLES) {
        ambientAccumRef.current -= 1;
        particles.push({
          x: Math.random() * boardWidth,
          y: Math.random() * boardHeight,
          vx: (Math.random() - 0.5) * 8,
          vy: -Math.random() * 12 - 4,
          life: 1,
          maxLife: 2 + Math.random() * 3,
          size: 1.5 + Math.random() * 2,
          color: accentColor,
          type: 'ambient',
        });
      }

      // --- Spawn token trail ---
      if (tokenMovingRef.current && particles.length < MAX_PARTICLES) {
        const tp = tokenPosRef.current;
        for (let i = 0; i < 2; i++) {
          particles.push({
            x: tp.x + (Math.random() - 0.5) * 10,
            y: tp.y + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 20,
            vy: Math.random() * 15 + 5,
            life: 1,
            maxLife: 0.4 + Math.random() * 0.3,
            size: 2 + Math.random() * 2.5,
            color: 'rgba(100, 200, 255, 0.8)',
            type: 'trail',
          });
        }
      }

      // --- Update & draw ---
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt / p.maxLife;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const alpha = p.life * (p.type === 'burst' ? 0.9 : 0.5);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(loop);
    }

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(rafRef.current);
  }, [boardWidth, boardHeight, accentColor]);

  // Handle burst trigger
  useEffect(() => {
    if (!burstAt || (lastBurstRef.current?.x === burstAt.x && lastBurstRef.current?.y === burstAt.y)) return;
    lastBurstRef.current = burstAt;

    const particles = particlesRef.current;
    const count = Math.min(12, MAX_PARTICLES - particles.length);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 40 + Math.random() * 30;
      particles.push({
        x: burstAt.x,
        y: burstAt.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.5 + Math.random() * 0.3,
        size: 3 + Math.random() * 2,
        color: 'rgba(255, 220, 100, 0.9)',
        type: 'burst',
      });
    }
  }, [burstAt]);

  return (
    <canvas
      ref={canvasRef}
      className="island-run-board__particles"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7 }}
    />
  );
}
