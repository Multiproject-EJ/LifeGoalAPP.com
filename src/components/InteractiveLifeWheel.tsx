import { useMemo, useState } from 'react';
import { LIFE_WHEEL_CATEGORIES, type LifeWheelCategoryKey } from '../features/checkins/LifeWheelCheckins';
import { getLifeWheelVisual, hexToRgba } from '../features/life-wheel/lifeWheelVisuals';

const SIZE = 320;
const CENTER = SIZE / 2;
const OUTER_RADIUS = 152;
const INNER_RADIUS = 92;
const PAD_ANGLE = 0.045; // radians of gap between segments

type AreaStat = { mainCount: number; subCount: number; progress?: number };

type InteractiveLifeWheelProps = {
  onCategorySelect: (categoryKey: LifeWheelCategoryKey) => void;
  selectedCategory: LifeWheelCategoryKey | null;
  goalStats?: Partial<Record<LifeWheelCategoryKey, AreaStat>>;
};

type Segment = {
  categoryKey: LifeWheelCategoryKey;
  shortLabel: string;
  label: string;
  color: string;
  emoji: string;
  startAngle: number;
  endAngle: number;
  path: string;
  midAngle: number;
  emojiX: number;
  emojiY: number;
  badgeX: number;
  badgeY: number;
};

function polar(radius: number, angle: number): [number, number] {
  return [CENTER + Math.cos(angle) * radius, CENTER + Math.sin(angle) * radius];
}

/** Path for an annular sector (donut wedge) between two radii and two angles. */
function annularPath(innerR: number, outerR: number, start: number, end: number): string {
  const [oxs, oys] = polar(outerR, start);
  const [oxe, oye] = polar(outerR, end);
  const [ixe, iye] = polar(innerR, end);
  const [ixs, iys] = polar(innerR, start);
  return [
    `M ${oxs} ${oys}`,
    `A ${outerR} ${outerR} 0 0 1 ${oxe} ${oye}`,
    `L ${ixe} ${iye}`,
    `A ${innerR} ${innerR} 0 0 0 ${ixs} ${iys}`,
    'Z',
  ].join(' ');
}

function buildSegments(): Segment[] {
  const count = LIFE_WHEEL_CATEGORIES.length;
  const sweep = (Math.PI * 2) / count;

  return LIFE_WHEEL_CATEGORIES.map((category, index) => {
    const visual = getLifeWheelVisual(category.key);
    const start = sweep * index - Math.PI / 2 + PAD_ANGLE / 2;
    const end = sweep * (index + 1) - Math.PI / 2 - PAD_ANGLE / 2;
    const mid = (start + end) / 2;

    const labelRadius = (OUTER_RADIUS + INNER_RADIUS) / 2;
    const [emojiX, emojiY] = polar(labelRadius, mid);
    const [badgeX, badgeY] = polar(OUTER_RADIUS - 16, mid);

    return {
      categoryKey: category.key,
      shortLabel: category.shortLabel,
      label: visual.label,
      color: visual.color,
      emoji: visual.emoji,
      startAngle: start,
      endAngle: end,
      path: annularPath(INNER_RADIUS, OUTER_RADIUS, start, end),
      midAngle: mid,
      emojiX,
      emojiY,
      badgeX,
      badgeY,
    };
  });
}

export function InteractiveLifeWheel({ onCategorySelect, selectedCategory, goalStats }: InteractiveLifeWheelProps) {
  const [hoveredCategory, setHoveredCategory] = useState<LifeWheelCategoryKey | null>(null);
  const segments = useMemo(() => buildSegments(), []);

  const activeKey = hoveredCategory ?? selectedCategory;
  const activeVisual = activeKey ? getLifeWheelVisual(activeKey) : null;

  return (
    <div className="life-wheel">
      <svg
        className="life-wheel__svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label="Life wheel — tap an area to focus on it and add a goal"
      >
        <g className="life-wheel__segments">
          {segments.map((segment) => {
            const isSelected = selectedCategory === segment.categoryKey;
            const isHovered = hoveredCategory === segment.categoryKey;
            const isActive = isSelected || isHovered;
            const stats = goalStats?.[segment.categoryKey];
            const mainCount = stats?.mainCount ?? 0;
            const progress = Math.max(0, Math.min(1, stats?.progress ?? 0));

            const fill = isActive ? hexToRgba(segment.color, 0.34) : hexToRgba(segment.color, 0.14);
            const className = [
              'life-wheel__segment',
              isSelected ? 'life-wheel__segment--selected' : '',
              isHovered ? 'life-wheel__segment--hovered' : '',
            ]
              .filter(Boolean)
              .join(' ');

            // Progress fills the segment outward from the inner edge.
            const progressOuter = INNER_RADIUS + (OUTER_RADIUS - INNER_RADIUS) * progress;
            const progressPath =
              progress > 0
                ? annularPath(INNER_RADIUS, progressOuter, segment.startAngle, segment.endAngle)
                : null;

            return (
              <g key={segment.categoryKey}>
                <path
                  d={segment.path}
                  className={className}
                  style={{ fill, stroke: segment.color }}
                  onClick={() => onCategorySelect(segment.categoryKey)}
                  onMouseEnter={() => setHoveredCategory(segment.categoryKey)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  role="button"
                  aria-pressed={isSelected}
                  aria-label={`${segment.label}${mainCount > 0 ? `, ${mainCount} goal${mainCount === 1 ? '' : 's'}, ${Math.round(progress * 100)}% done` : ''} — tap to focus`}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onCategorySelect(segment.categoryKey);
                    }
                  }}
                />
                {progressPath ? (
                  <path
                    d={progressPath}
                    className="life-wheel__progress"
                    style={{ fill: hexToRgba(segment.color, 0.6) }}
                  />
                ) : null}
                <text
                  x={segment.emojiX}
                  y={segment.emojiY}
                  className="life-wheel__emoji"
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ pointerEvents: 'none', opacity: isActive ? 1 : 0.92 }}
                >
                  {segment.emoji}
                </text>
                {mainCount > 0 && (
                  <g style={{ pointerEvents: 'none' }}>
                    <circle
                      cx={segment.badgeX}
                      cy={segment.badgeY}
                      r={11}
                      className="life-wheel__badge"
                      style={{ fill: '#ffffff' }}
                    />
                    <text
                      x={segment.badgeX}
                      y={segment.badgeY}
                      className="life-wheel__badge-text"
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{ fill: segment.color }}
                    >
                      {mainCount}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* Center hub */}
        <circle cx={CENTER} cy={CENTER} r={INNER_RADIUS - 8} className="life-wheel__hub" />
        {activeVisual ? (
          <>
            <text
              x={CENTER}
              y={CENTER - 14}
              className="life-wheel__hub-emoji"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {activeVisual.emoji}
            </text>
            <text
              x={CENTER}
              y={CENTER + 22}
              className="life-wheel__hub-label"
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fill: activeVisual.color }}
            >
              {activeVisual.shortLabel}
            </text>
          </>
        ) : (
          <>
            <text
              x={CENTER}
              y={CENTER - 8}
              className="life-wheel__hub-hint"
              textAnchor="middle"
              dominantBaseline="central"
            >
              Tap an area
            </text>
            <text
              x={CENTER}
              y={CENTER + 16}
              className="life-wheel__hub-subhint"
              textAnchor="middle"
              dominantBaseline="central"
            >
              of your life
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
