/** Presentation-only choreography. Canonical services commit progress before playback. */
export const STAR_BENEATH_FINALE_SECONDS = 12;
export const STAR_BENEATH_STAGE_SECONDS = 2.4;
const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
export interface StarBeneathPose {
  stage: number;
  active: boolean;
  stageReveal: number;
  starRise: number;
  ringUnfold: number;
  constellation: number;
  cooling: number;
  pulse: number;
}
/** Pure absolute-time pose; no frame accumulation, timers, rewards or state writes. */
export function resolveStarBeneathPose(input: {
  stage: number;
  transitionAge: number;
  playing: boolean;
  reducedMotion: boolean;
}): StarBeneathPose {
  const stage = Math.max(0, Math.min(8, Math.floor(Number.isFinite(input.stage) ? input.stage : 0)));
  const final = stage === 8;
  const duration = final ? STAR_BENEATH_FINALE_SECONDS : STAR_BENEATH_STAGE_SECONDS;
  const age = Number.isFinite(input.transitionAge) ? Math.max(0, input.transitionAge) : duration;
  const active = input.playing && !input.reducedMotion && stage > 0 && age < duration;
  const t = active ? age : duration;
  return {
    stage,
    active,
    stageReveal: active ? ease(t / 1.4) : 1,
    starRise: final ? ease((t - 1.2) / 4.0) : 0,
    ringUnfold: final ? ease((t - 4.0) / 3.0) : 0,
    constellation: final ? ease((t - 6.2) / 3.5) : 0,
    cooling: final ? ease((t - 7.5) / 4.0) : 0,
    // One restrained surge; no high-frequency flash or strobe.
    pulse: active ? Math.sin(Math.PI * clamp(t / duration)) : 0,
  };
}

/** A transient playback cursor. It never owns earned cores or completed stages. */
export function createStarBeneathPlayback(apply: (pose: StarBeneathPose) => void) {
  let stage = 0;
  let sequence = 0;
  let pending = false;
  let playing = false;
  let startedAt = 0;
  let active = false;
  const update = (next: { activatedStages: number; constructionSequence?: number }, immediate = false) => {
    const nextStage = Math.max(0, Math.min(8, Math.floor(Number.isFinite(next.activatedStages) ? next.activatedStages : 0)));
    const nextSequence = Math.max(0, Math.floor(Number.isFinite(next.constructionSequence) ? next.constructionSequence! : 0));
    const changed = nextStage !== stage || nextSequence !== sequence;
    stage = nextStage; sequence = nextSequence;
    if (immediate) { pending = false; playing = false; active = false; }
    else if (changed) { pending = stage > 0; active = pending; }
    if (immediate) apply(resolveStarBeneathPose({ stage, transitionAge: 0, playing: false, reducedMotion: true }));
  };
  const animate = (elapsed: number, reducedMotion: boolean, previewAge?: number) => {
    if (pending) { startedAt = elapsed; playing = true; pending = false; }
    const pose = resolveStarBeneathPose({ stage, transitionAge: previewAge ?? elapsed - startedAt, playing: previewAge !== undefined || playing, reducedMotion });
    active = pose.active;
    if (!active && previewAge === undefined) playing = false;
    apply(pose);
    return pose;
  };
  return { update, animate, get active() { return active; } };
}
