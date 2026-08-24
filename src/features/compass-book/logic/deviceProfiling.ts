export type CompassBookProfileQuality = 'high' | 'low';

export type CompassBookPerformanceSummary = {
  quality: CompassBookProfileQuality;
  targetFps: number;
  sampleCount: number;
  averageFps: number;
  p95FrameMs: number;
  worstFrameMs: number;
  slowFramePercent: number;
  rating: 'pass' | 'review' | 'fail';
};

export function parseCompassBookProfileQuality(
  value: string | null | undefined,
): CompassBookProfileQuality | null {
  return value === 'high' || value === 'low' ? value : null;
}

export function getCompassBookProfileTargetFps(quality: CompassBookProfileQuality): number {
  return quality === 'high' ? 50 : 55;
}

function percentile(samples: readonly number[], fraction: number): number {
  if (samples.length === 0) return 0;
  const sorted = samples.slice().sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index];
}

/**
 * Summarise a foreground-only requestAnimationFrame trace. The launch decision
 * is deliberately tied to the FPS budgets in the approved Gauntlet; p95,
 * worst-frame, and slow-frame values remain visible diagnostic evidence.
 */
export function summarizeCompassBookPerformance(
  frameTimesMs: readonly number[],
  quality: CompassBookProfileQuality,
): CompassBookPerformanceSummary {
  const samples = frameTimesMs.filter((sample) => Number.isFinite(sample) && sample > 0 && sample < 1_000);
  const targetFps = getCompassBookProfileTargetFps(quality);
  if (samples.length === 0) {
    return {
      quality,
      targetFps,
      sampleCount: 0,
      averageFps: 0,
      p95FrameMs: 0,
      worstFrameMs: 0,
      slowFramePercent: 100,
      rating: 'fail',
    };
  }

  const totalMs = samples.reduce((total, sample) => total + sample, 0);
  const averageFps = (samples.length * 1_000) / totalMs;
  const slowThresholdMs = 1_000 / targetFps;
  const slowFrames = samples.filter((sample) => sample > slowThresholdMs).length;
  const rating = averageFps >= targetFps
    ? 'pass'
    : averageFps >= targetFps * 0.9
      ? 'review'
      : 'fail';

  return {
    quality,
    targetFps,
    sampleCount: samples.length,
    averageFps: Math.round(averageFps * 10) / 10,
    p95FrameMs: Math.round(percentile(samples, 0.95) * 10) / 10,
    worstFrameMs: Math.round(Math.max(...samples) * 10) / 10,
    slowFramePercent: Math.round((slowFrames / samples.length) * 1_000) / 10,
    rating,
  };
}
