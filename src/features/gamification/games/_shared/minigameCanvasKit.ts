/**
 * minigameCanvasKit.ts — shared canvas drawing helpers for the event
 * mini-games.
 *
 * This is the pixel-facing half of the shared kit; the deterministic maths
 * (particles, shake, tweens, combo ladders) lives in
 * `level-worlds/services/minigameJuice.ts` where the Island Run test suite can
 * exercise it. Nothing here holds state — every helper takes a context and
 * draws.
 *
 * House style, established by the Fortune Engine rebuild and
 * `docs/gameplay/ISLAND_VISUAL_PRODUCTION_CONTRACT.md`:
 * - supersampled backing store (draw in logical units, scale once at the top);
 * - gradient materials rather than flat fills;
 * - key light from the upper-left, contact shadow beneath;
 * - glow via `shadowBlur`, always restored so it cannot leak into later draws;
 * - silhouettes beat tiny detail at phone scale.
 */
import type { MinigameParticle } from '../../level-worlds/services/minigameJuice';
import { resolveMinigameParticleFade } from '../../level-worlds/services/minigameJuice';

/** Key-light direction shared by every mini-game surface (upper-left). */
export const MINIGAME_LIGHT_DIR = Object.freeze({ x: -0.35, y: -0.42 });

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

/**
 * Whether the player asked for reduced motion. Renderers should skip spawning
 * shake/particles rather than trying to animate them more gently.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Reset, clear and scale a canvas so callers can draw in `logicalSize` units
 * regardless of the backing-store resolution. Mirrors the Fortune Engine's
 * `prepareFortuneCanvas`.
 *
 * Callers MUST `ctx.restore()` when done (this leaves one `save()` on the
 * stack), which `finishMinigameCanvas` does for you.
 */
export function prepareMinigameCanvas(
  canvas: HTMLCanvasElement | null,
  logicalSize: number,
): CanvasRenderingContext2D | null {
  if (!canvas || logicalSize <= 0) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(canvas.width / logicalSize, canvas.height / logicalSize);
  return ctx;
}

/** Pop the transform pushed by `prepareMinigameCanvas`. */
export function finishMinigameCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.restore();
}

/** Degrees → radians with the -90° offset that puts 0° at twelve o'clock. */
export function degToRad(deg: number): number {
  return ((deg - 90) * Math.PI) / 180;
}

// ---------------------------------------------------------------------------
// Colour utilities
// ---------------------------------------------------------------------------

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseHexColor(hex: string): [r: number, g: number, b: number] {
  const raw = hex.trim().replace('#', '');
  const full = raw.length === 3
    ? raw.split('').map((c) => c + c).join('')
    : raw.padEnd(6, '0').slice(0, 6);
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

/**
 * Lighten (`amount > 0`) or darken (`amount < 0`) a hex colour by a 0..1
 * fraction, returning an `rgb()` string.
 */
export function shadeColor(hex: string, amount: number): string {
  const [r, g, b] = parseHexColor(hex);
  const mix = amount >= 0 ? 255 : 0;
  const weight = Math.min(1, Math.abs(amount));
  return `rgb(${clampChannel(r + (mix - r) * weight)}, ${clampChannel(g + (mix - g) * weight)}, ${clampChannel(b + (mix - b) * weight)})`;
}

/** Hex colour → `rgba()` string at the given alpha. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHexColor(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

// ---------------------------------------------------------------------------
// Glow
// ---------------------------------------------------------------------------

/**
 * Run `draw` with a glow applied, restoring shadow state afterwards so it
 * cannot bleed into unrelated draws (a very easy canvas bug).
 */
export function withGlow(
  ctx: CanvasRenderingContext2D,
  color: string,
  blur: number,
  draw: () => void,
): void {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  draw();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Glossy orb — the workhorse for round food/gem/token bodies
// ---------------------------------------------------------------------------

export interface GlossyOrbOptions {
  x: number;
  y: number;
  radius: number;
  /** Base hex colour, e.g. `#e0475f`. */
  color: string;
  /** Uniform scale applied about the centre (squash-and-stretch). */
  scale?: number;
  /** 0..1 opacity for the whole orb. */
  alpha?: number;
  /** Emoji or glyph drawn centred on the orb. */
  glyph?: string;
  /** Draw a bright outer ring + glow (used for "special" bodies). */
  highlightRing?: string | null;
  /** Contact shadow beneath the body. Defaults to true. */
  shadow?: boolean;
}

/**
 * Draw a lit sphere: contact shadow, body gradient keyed to the shared light
 * direction, bounce-light rim on the dark side, and a specular hotspot.
 *
 * This is the single biggest visual upgrade over a flat `arc()` + `fill()`.
 */
export function drawGlossyOrb(ctx: CanvasRenderingContext2D, options: GlossyOrbOptions): void {
  const scale = options.scale ?? 1;
  const radius = options.radius * scale;
  if (radius <= 0) return;
  const { x, y, color } = options;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, options.alpha ?? 1));

  // Contact shadow — grounds the body so it doesn't float.
  if (options.shadow !== false) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y + radius * 0.82, radius * 0.78, radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(3, 9, 20, 0.3)';
    ctx.fill();
    ctx.restore();
  }

  // Body: highlight offset toward the key light, falling to a darker edge.
  const hx = x + MINIGAME_LIGHT_DIR.x * radius;
  const hy = y + MINIGAME_LIGHT_DIR.y * radius;
  const body = ctx.createRadialGradient(hx, hy, radius * 0.08, x, y, radius);
  body.addColorStop(0, shadeColor(color, 0.55));
  body.addColorStop(0.42, color);
  body.addColorStop(0.86, shadeColor(color, -0.28));
  body.addColorStop(1, shadeColor(color, -0.46));
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();

  // Bounce light along the lower-right limb.
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.94, Math.PI * 0.12, Math.PI * 0.82);
  ctx.lineWidth = Math.max(1, radius * 0.1);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.stroke();

  // Specular hotspot.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(
    x + MINIGAME_LIGHT_DIR.x * radius * 0.92,
    y + MINIGAME_LIGHT_DIR.y * radius * 0.92,
    radius * 0.3,
    radius * 0.2,
    -Math.PI / 5,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fill();
  ctx.restore();

  // Optional special ring (golden fruit, charged tokens, …).
  if (options.highlightRing) {
    withGlow(ctx, options.highlightRing, radius * 0.5, () => {
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.99, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1.4, radius * 0.12);
      ctx.strokeStyle = options.highlightRing as string;
      ctx.stroke();
    });
  }

  if (options.glyph) {
    ctx.font = `${Math.max(10, Math.floor(radius * 1.05))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(options.glyph, x, y + radius * 0.04);
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Particles
// ---------------------------------------------------------------------------

/**
 * Render a particle field produced by `minigameJuice`. Particles shrink and
 * fade over their remaining life; `palette` is indexed by `paletteIndex`.
 */
export function drawMinigameParticles(
  ctx: CanvasRenderingContext2D,
  particles: readonly MinigameParticle[],
  palette: readonly string[],
): void {
  if (particles.length === 0 || palette.length === 0) return;
  ctx.save();
  for (const particle of particles) {
    const fade = resolveMinigameParticleFade(particle);
    if (fade <= 0) continue;
    const color = palette[particle.paletteIndex % palette.length];
    ctx.globalAlpha = fade;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius * (0.35 + fade * 0.65), 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.restore();
}

/** Four-point sparkle, matching the Fortune Engine's star glyph. */
export function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  fill: string,
): void {
  ctx.beginPath();
  for (let index = 0; index < 8; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (index * Math.PI) / 4;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Rising "+N" score pop, drawn in logical units. */
export function drawScorePop(
  ctx: CanvasRenderingContext2D,
  options: { x: number; y: number; text: string; progress: number; color?: string },
): void {
  const progress = Math.max(0, Math.min(1, options.progress));
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  ctx.font = '800 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(3, 9, 20, 0.65)';
  ctx.strokeText(options.text, options.x, options.y - progress * 34);
  ctx.fillStyle = options.color ?? '#ffe17b';
  ctx.fillText(options.text, options.x, options.y - progress * 34);
  ctx.restore();
}
