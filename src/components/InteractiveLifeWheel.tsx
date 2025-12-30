import { useMemo, useState } from 'react';
import { LIFE_WHEEL_CATEGORIES, type LifeWheelCategoryKey } from '../features/checkins/LifeWheelCheckins';

const RADAR_SIZE = 400;
const RADAR_LEVELS = 5;

type InteractiveLifeWheelProps = {
  onCategorySelect: (categoryKey: LifeWheelCategoryKey) => void;
  selectedCategory: LifeWheelCategoryKey | null;
  goalStats?: Partial<Record<LifeWheelCategoryKey, { mainCount: number; subCount: number }>>;
};

type SliceGeometry = {
  categoryKey: LifeWheelCategoryKey;
  label: string;
  path: string;
  labelX: number;
  labelY: number;
  anchor: 'start' | 'middle' | 'end';
  baseline: 'middle' | 'text-after-edge' | 'text-before-edge';
  angle: number;
};

function buildSliceGeometry(): SliceGeometry[] {
  const center = RADAR_SIZE / 2;
  const radius = center - 40;

  return LIFE_WHEEL_CATEGORIES.map((category, index) => {
    const startAngle = (Math.PI * 2 * index) / LIFE_WHEEL_CATEGORIES.length - Math.PI / 2;
    const endAngle = (Math.PI * 2 * (index + 1)) / LIFE_WHEEL_CATEGORIES.length - Math.PI / 2;
    const midAngle = (startAngle + endAngle) / 2;

    // Calculate path for the slice
    const startX = center + Math.cos(startAngle) * radius;
    const startY = center + Math.sin(startAngle) * radius;
    const endX = center + Math.cos(endAngle) * radius;
    const endY = center + Math.sin(endAngle) * radius;

    const path = `M ${center} ${center} L ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY} Z`;

    // Calculate label position
    const labelRadius = radius + 24;
    const labelX = center + Math.cos(midAngle) * labelRadius;
    const labelY = center + Math.sin(midAngle) * labelRadius;

    let anchor: 'start' | 'middle' | 'end';
    if (Math.abs(Math.cos(midAngle)) < 0.2) {
      anchor = 'middle';
    } else if (Math.cos(midAngle) > 0) {
      anchor = 'start';
    } else {
      anchor = 'end';
    }

    let baseline: 'middle' | 'text-after-edge' | 'text-before-edge';
    if (Math.sin(midAngle) > 0.2) {
      baseline = 'text-before-edge';
    } else if (Math.sin(midAngle) < -0.2) {
      baseline = 'text-after-edge';
    } else {
      baseline = 'middle';
    }

    return {
      categoryKey: category.key,
      label: category.label,
      path,
      labelX,
      labelY,
      anchor,
      baseline,
      angle: midAngle,
    };
  });
}

export function InteractiveLifeWheel({ onCategorySelect, selectedCategory, goalStats }: InteractiveLifeWheelProps) {
  const [hoveredCategory, setHoveredCategory] = useState<LifeWheelCategoryKey | null>(null);
  const slices = useMemo(() => buildSliceGeometry(), []);
  const center = RADAR_SIZE / 2;
  const radius = center - 40;
  const indicatorRadius = radius * 0.62;
  const subIndicatorRadius = radius * 0.78;

  const handleSliceClick = (categoryKey: LifeWheelCategoryKey) => {
    onCategorySelect(categoryKey);
  };

  const handleSliceMouseEnter = (categoryKey: LifeWheelCategoryKey) => {
    setHoveredCategory(categoryKey);
  };

  const handleSliceMouseLeave = () => {
    setHoveredCategory(null);
  };

  // Generate grid levels
  const levelPolygons = Array.from({ length: RADAR_LEVELS }, (_, levelIndex) => {
    const ratio = (levelIndex + 1) / RADAR_LEVELS;
    const levelRadius = radius * ratio;
    const points = LIFE_WHEEL_CATEGORIES.map((_, index) => {
      const angle = (Math.PI * 2 * index) / LIFE_WHEEL_CATEGORIES.length - Math.PI / 2;
      const x = center + Math.cos(angle) * levelRadius;
      const y = center + Math.sin(angle) * levelRadius;
      return `${x},${y}`;
    }).join(' ');
    return { ratio, points };
  });

  // Generate axes
  const axes = LIFE_WHEEL_CATEGORIES.map((category, index) => {
    const angle = (Math.PI * 2 * index) / LIFE_WHEEL_CATEGORIES.length - Math.PI / 2;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    return { key: category.key, x1: center, y1: center, x2: x, y2: y };
  });

  return (
    <div className="interactive-life-wheel">
      <svg
        className="interactive-life-wheel__svg"
        viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
        role="img"
        aria-label="Interactive life wheel - click a slice to add a goal"
      >
        {/* Background grid */}
        <g className="interactive-life-wheel__grid">
          {levelPolygons.map((level, index) => (
            <polygon key={index} points={level.points} />
          ))}
        </g>

        {/* Axes */}
        <g className="interactive-life-wheel__axes">
          {axes.map((axis) => (
            <line key={axis.key} x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} />
          ))}
        </g>

        {/* Interactive slices */}
        <g className="interactive-life-wheel__slices">
          {slices.map((slice) => {
            const isSelected = selectedCategory === slice.categoryKey;
            const isHovered = hoveredCategory === slice.categoryKey;
            const className = `interactive-life-wheel__slice ${
              isSelected ? 'interactive-life-wheel__slice--selected' : ''
            } ${isHovered ? 'interactive-life-wheel__slice--hovered' : ''}`;

            return (
              <path
                key={slice.categoryKey}
                d={slice.path}
                className={className}
                onClick={() => handleSliceClick(slice.categoryKey)}
                onMouseEnter={() => handleSliceMouseEnter(slice.categoryKey)}
                onMouseLeave={handleSliceMouseLeave}
                role="button"
                aria-label={`${slice.label} - click to add a goal`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSliceClick(slice.categoryKey);
                  }
                }}
              />
            );
          })}
        </g>

        {/* Labels */}
        <g className="interactive-life-wheel__labels">
          {slices.map((slice) => (
            <text
              key={slice.categoryKey}
              x={slice.labelX}
              y={slice.labelY}
              textAnchor={slice.anchor}
              dominantBaseline={slice.baseline}
              className="interactive-life-wheel__label"
              style={{ pointerEvents: 'none' }}
            >
              {slice.label}
            </text>
          ))}
        </g>

        {/* Goal indicators */}
        {goalStats && (
          <g className="interactive-life-wheel__indicators">
            {slices.map((slice) => {
              const stats = goalStats[slice.categoryKey];
              if (!stats) {
                return null;
              }

              const mainCount = stats.mainCount ?? 0;
              const subCount = stats.subCount ?? 0;
              const mainX = center + Math.cos(slice.angle) * indicatorRadius;
              const mainY = center + Math.sin(slice.angle) * indicatorRadius;
              const subX = center + Math.cos(slice.angle) * subIndicatorRadius;
              const subY = center + Math.sin(slice.angle) * subIndicatorRadius;
              const subStrength = Math.min(subCount, 10) / 10;
              const subFill = `rgba(16, 185, 129, ${0.25 + subStrength * 0.55})`;

              return (
                <g key={slice.categoryKey}>
                  {mainCount > 0 && (
                    <g className="interactive-life-wheel__indicator interactive-life-wheel__indicator--main">
                      <circle cx={mainX} cy={mainY} r={12} />
                      <text x={mainX} y={mainY} textAnchor="middle" dominantBaseline="central">
                        {mainCount}
                      </text>
                    </g>
                  )}
                  {subCount > 0 && (
                    <g className="interactive-life-wheel__indicator interactive-life-wheel__indicator--sub">
                      <circle cx={subX} cy={subY} r={10} style={{ fill: subFill }} />
                      <text x={subX} y={subY} textAnchor="middle" dominantBaseline="central">
                        {subCount}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        )}
      </svg>
    </div>
  );
}
