/** Presentation only. Sampling, skipping or replaying this show never writes
 * gameplay state, starts an event clock, or grants a reward. */
export const OPENING_CEREMONY_DURATION_MS = 12_000;
export const OPENING_CEREMONY_REDUCED_DURATION_MS = 1_800;

export interface OpeningCeremonyPlayback {
  startedAtMs: number;
  reducedMotion: boolean;
}

export interface OpeningCeremonyPresentation {
  active: boolean;
  elapsedMs: number;
  reducedMotion: boolean;
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };

export function sampleOpeningCeremony(elapsedMs: number, reducedMotion = false) {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const duration = reducedMotion ? OPENING_CEREMONY_REDUCED_DURATION_MS : OPENING_CEREMONY_DURATION_MS;
  const done = elapsed >= duration;
  const phase = done ? 'complete' : reducedMotion ? 'introduction'
    : elapsed < 2_000 ? 'welcome' : elapsed < 4_800 ? 'beacon'
      : elapsed < 9_500 ? 'celebration' : 'introduction';
  const captions = {
    welcome: 'The teams have arrived. Welcome to the First Games!',
    beacon: 'One beacon. Every island. Let the games begin!',
    celebration: 'The First Games are open!',
    introduction: 'Your reward bar and First Game button are ready. Your first round is free.',
    complete: 'Play your free first round whenever you are ready.',
  };
  return {
    phase, duration, done, caption: captions[phase],
    progress: clamp(elapsed / duration),
    beacon: reducedMotion ? 1 : smooth((elapsed - 1_000) / 2_800),
    windowWarmth: reducedMotion ? 1 : smooth(elapsed / 3_000),
    // Quiet mode has no drifting particles, fireworks, camera movement or pulse.
    fireworks: !reducedMotion && elapsed >= 4_800 && elapsed < 9_500,
    revealReady: reducedMotion || elapsed >= 9_500,
  };
}
