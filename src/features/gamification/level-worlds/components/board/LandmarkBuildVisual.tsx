import type { CSSProperties } from 'react';
import { clampIslandArtBuildLevel } from '../../services/islandArtManifest';

export type LandmarkBuildVisualStopId = 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss' | 'landmark';

const STOP_EMOJI: Record<LandmarkBuildVisualStopId, string> = {
  hatchery: '🥚',
  habit: '🌿',
  mystery: '🔮',
  wisdom: '📜',
  boss: '⚔️',
  landmark: '🏛️',
};

const STOP_LABEL: Record<LandmarkBuildVisualStopId, string> = {
  hatchery: 'Hatchery',
  habit: 'Habit Grove',
  mystery: 'Mystery Circle',
  wisdom: 'Wisdom Archive',
  boss: 'Boss Gate',
  landmark: 'Landmark',
};

export function normalizeLandmarkBuildVisualStopId(value: string | undefined): LandmarkBuildVisualStopId {
  if (value === 'hatchery' || value === 'habit' || value === 'mystery' || value === 'wisdom' || value === 'boss') {
    return value;
  }
  return 'landmark';
}

export function LandmarkBuildVisual({
  stopId,
  buildLevel,
  title,
  className = '',
  style,
  compact = false,
}: {
  stopId: LandmarkBuildVisualStopId;
  buildLevel: number;
  title?: string;
  className?: string;
  style?: CSSProperties;
  compact?: boolean;
}) {
  const level = clampIslandArtBuildLevel(buildLevel);
  const safeTitle = title ?? STOP_LABEL[stopId];
  const label = level > 0 ? `${safeTitle} Level ${level}` : `${safeTitle} foundation`;

  return (
    <div
      className={[
        'landmark-build-visual',
        `landmark-build-visual--${stopId}`,
        `landmark-build-visual--level-${level}`,
        compact ? 'landmark-build-visual--compact' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={style}
      role="img"
      aria-label={label}
    >
      <span className="landmark-build-visual__aura" aria-hidden="true" />
      <span className="landmark-build-visual__spark landmark-build-visual__spark--one" aria-hidden="true">✦</span>
      <span className="landmark-build-visual__spark landmark-build-visual__spark--two" aria-hidden="true">✧</span>
      <span className="landmark-build-visual__base" aria-hidden="true" />
      <span className="landmark-build-visual__tower landmark-build-visual__tower--left" aria-hidden="true" />
      <span className="landmark-build-visual__tower landmark-build-visual__tower--right" aria-hidden="true" />
      <span className="landmark-build-visual__core" aria-hidden="true">
        <span className="landmark-build-visual__emoji">{STOP_EMOJI[stopId]}</span>
      </span>
      <span className="landmark-build-visual__flag" aria-hidden="true" />
      <span className="landmark-build-visual__level" aria-hidden="true">L{Math.max(1, level)}</span>
    </div>
  );
}
