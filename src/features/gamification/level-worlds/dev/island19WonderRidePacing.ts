import * as THREE from 'three';

// Presentation-only: preserve the lift/drop/braking shape, shorten the lap.
export const WONDER_RIDE_SPEED_SCALE = 1.9;

export interface WonderRidePaceSample {
  progress: number;
  seconds: number;
  speed: number;
  mode: 'dispatch' | 'chain-lift' | 'gravity-run' | 'scenic-cruise' | 'station-brakes';
}

/** Distance-domain motion profile. Forward acceleration and backward braking
 * keep speed continuous across authored phases, independent of frame rate. */
export function createWonderRidePacing(
  path: THREE.CurvePath<THREE.Vector3>,
  phaseAt: (progress: number) => string,
) {
  const steps = 1800;
  const length = path.getLength();
  const ds = length / steps;
  const samples: WonderRidePaceSample[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const progress = i / steps;
    const phase = phaseAt(Math.min(progress, 0.999999));
    const tangent = path.getTangent(progress);
    const before = path.getTangent(Math.max(0, progress - 0.001));
    const after = path.getTangent(Math.min(1, progress + 0.001));
    const curvature = before.angleTo(after) / Math.max(0.01, length * 0.002);
    const cornerLimit = Math.sqrt(4.8 / Math.max(curvature, 0.001));
    let speed = 5.8;
    let mode: WonderRidePaceSample['mode'] = 'gravity-run';
    if (phase === 'dispatch') { speed = 1.15; mode = 'dispatch'; }
    else if (phase === 'source-crest' && tangent.y > -0.12) { speed = 0.82; mode = 'chain-lift'; }
    else if (['gold-vault', 'grand-vault', 'diamond-gallery', 'ocean-reveal'].includes(phase)) {
      speed = phase === 'grand-vault' ? 1.15 : phase === 'ocean-reveal' ? 1.35 : 1.0;
      mode = 'scenic-cruise';
    } else if (phase === 'return') {
      speed = tangent.y > 0.12 ? 1.65 : 1.05;
      mode = tangent.y > 0.12 ? 'chain-lift' : 'station-brakes';
    } else if (phase === 'sea-cave') { speed = 1.65; mode = 'scenic-cruise'; }
    samples.push({ progress, seconds: 0, speed: Math.min(speed, cornerLimit), mode });
  }
  samples[0].speed = 0.35;
  samples[steps].speed = 0.3;
  for (let i = 1; i <= steps; i += 1) {
    const slope = path.getTangent(samples[i].progress).y;
    const acceleration = samples[i].mode === 'gravity-run' ? Math.max(0.75, 1.1 - slope * 3.2) : 0.65;
    samples[i].speed = Math.min(samples[i].speed, Math.sqrt(samples[i-1].speed ** 2 + 2 * acceleration * ds));
  }
  for (let i = steps - 1; i >= 0; i -= 1) {
    samples[i].speed = Math.min(samples[i].speed, Math.sqrt(samples[i+1].speed ** 2 + 2 * 1.15 * ds));
  }
  for (let i = 1; i <= steps; i += 1) {
    samples[i].seconds = samples[i-1].seconds + 2 * ds / (samples[i-1].speed + samples[i].speed);
  }
  samples.forEach(sample => {
    sample.speed *= WONDER_RIDE_SPEED_SCALE;
    sample.seconds /= WONDER_RIDE_SPEED_SCALE;
  });
  const durationSeconds = samples[steps].seconds;
  const sampleAtTime = (seconds: number): WonderRidePaceSample => {
    const time = THREE.MathUtils.clamp(seconds, 0, durationSeconds);
    let low = 0;
    let high = steps;
    while (high - low > 1) {
      const mid = (low + high) >> 1;
      if (samples[mid].seconds <= time) low = mid;
      else high = mid;
    }
    const a = samples[low];
    const b = samples[high];
    const dt = time - a.seconds;
    const interval = b.seconds - a.seconds;
    const acceleration = (b.speed - a.speed) / interval;
    return {
      seconds: time,
      progress: Math.min(1, a.progress + (a.speed * dt + 0.5 * acceleration * dt * dt) / length),
      speed: a.speed + acceleration * dt,
      mode: a.mode,
    };
  };
  return { samples, durationSeconds, sampleAtTime };
}
