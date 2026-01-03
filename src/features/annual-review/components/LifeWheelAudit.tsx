import React, { useState, useMemo } from 'react';
import { LIFE_WHEEL_CATEGORIES, LifeWheelCategoryKey } from '../../checkins/LifeWheelCheckins';

type LifeWheelAuditProps = {
  onNext: (data: LifeWheelAuditData) => void;
  onBack: () => void;
  reviewYear: number;
  initialData?: LifeWheelAuditData;
  isLoading?: boolean;
};

export type CategoryReflection = {
  rating: number;
  whatWentWell: string;
  whatNeedsFocus: string;
};

export type LifeWheelAuditData = Record<LifeWheelCategoryKey, CategoryReflection>;

const MAX_SCORE = 10;
const RADAR_SIZE = 320;
const RADAR_LEVELS = 5;

type RadarGeometry = {
  polygonPoints: string;
  levelPolygons: { ratio: number; points: string }[];
  axes: { key: string; x1: number; y1: number; x2: number; y2: number }[];
  labels: {
    key: string;
    text: string;
    x: number;
    y: number;
    anchor: 'start' | 'middle' | 'end';
    baseline: 'middle' | 'text-after-edge' | 'text-before-edge';
  }[];
};

function buildRadarGeometry(ratings: Record<LifeWheelCategoryKey, number>): RadarGeometry {
  const center = RADAR_SIZE / 2;
  const radius = center - 36;

  const pointFor = (ratio: number, index: number) => {
    const angle = (Math.PI * 2 * index) / LIFE_WHEEL_CATEGORIES.length - Math.PI / 2;
    const x = center + Math.cos(angle) * radius * ratio;
    const y = center + Math.sin(angle) * radius * ratio;
    return { x, y };
  };

  const polygonPoints = LIFE_WHEEL_CATEGORIES.map((category, index) => {
    const score = ratings[category.key] ?? 5;
    const ratio = score / MAX_SCORE;
    const { x, y } = pointFor(ratio, index);
    return `${x},${y}`;
  }).join(' ');

  const levelPolygons = Array.from({ length: RADAR_LEVELS }, (_, levelIndex) => {
    const ratio = (levelIndex + 1) / RADAR_LEVELS;
    const points = LIFE_WHEEL_CATEGORIES.map((_, index) => {
      const { x, y } = pointFor(ratio, index);
      return `${x},${y}`;
    }).join(' ');
    return { ratio, points };
  });

  const axes = LIFE_WHEEL_CATEGORIES.map((category, index) => {
    const { x, y } = pointFor(1, index);
    return { key: category.key, x1: center, y1: center, x2: x, y2: y };
  });

  const labels = LIFE_WHEEL_CATEGORIES.map((category, index) => {
    const labelRadius = radius + 20;
    const angle = (Math.PI * 2 * index) / LIFE_WHEEL_CATEGORIES.length - Math.PI / 2;
    const x = center + Math.cos(angle) * labelRadius;
    const y = center + Math.sin(angle) * labelRadius;

    let anchor: 'start' | 'middle' | 'end';
    if (Math.abs(Math.cos(angle)) < 0.2) {
      anchor = 'middle';
    } else if (Math.cos(angle) > 0) {
      anchor = 'start';
    } else {
      anchor = 'end';
    }

    let baseline: 'middle' | 'text-after-edge' | 'text-before-edge';
    if (Math.sin(angle) > 0.2) {
      baseline = 'text-before-edge';
    } else if (Math.sin(angle) < -0.2) {
      baseline = 'text-after-edge';
    } else {
      baseline = 'middle';
    }

    return { key: category.key, text: category.label, x, y, anchor, baseline };
  });

  return { polygonPoints, levelPolygons, axes, labels };
}

export const LifeWheelAudit: React.FC<LifeWheelAuditProps> = ({ 
  onNext, 
  onBack, 
  reviewYear,
  initialData,
  isLoading = false
}) => {
  const [data, setData] = useState<LifeWheelAuditData>(() => {
    if (initialData) return initialData;
    
    // Initialize with default values
    const defaultData = {} as LifeWheelAuditData;
    LIFE_WHEEL_CATEGORIES.forEach(category => {
      defaultData[category.key] = {
        rating: 5,
        whatWentWell: '',
        whatNeedsFocus: ''
      };
    });
    return defaultData;
  });

  const [selectedCategory, setSelectedCategory] = useState<LifeWheelCategoryKey>(
    LIFE_WHEEL_CATEGORIES[0].key
  );

  // Calculate progress
  const completedCount = useMemo(() => {
    return LIFE_WHEEL_CATEGORIES.filter(cat => {
      const reflection = data[cat.key];
      return reflection.rating > 0 && 
             (reflection.whatWentWell.trim() !== '' || reflection.whatNeedsFocus.trim() !== '');
    }).length;
  }, [data]);

  const allRated = useMemo(() => {
    return LIFE_WHEEL_CATEGORIES.every(cat => data[cat.key].rating > 0);
  }, [data]);

  // Build radar chart geometry
  const ratings = useMemo(() => {
    const result = {} as Record<LifeWheelCategoryKey, number>;
    LIFE_WHEEL_CATEGORIES.forEach(cat => {
      result[cat.key] = data[cat.key].rating;
    });
    return result;
  }, [data]);

  const radarGeometry = useMemo(() => buildRadarGeometry(ratings), [ratings]);

  const handleRatingChange = (categoryKey: LifeWheelCategoryKey, rating: number) => {
    setData(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        rating
      }
    }));
  };

  const handleReflectionChange = (
    categoryKey: LifeWheelCategoryKey,
    field: 'whatWentWell' | 'whatNeedsFocus',
    value: string
  ) => {
    setData(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        [field]: value
      }
    }));
  };

  const handleNext = () => {
    if (!allRated) {
      alert('Please rate all categories before proceeding.');
      return;
    }
    onNext(data);
  };

  const currentCategory = LIFE_WHEEL_CATEGORIES.find(cat => cat.key === selectedCategory);
  const currentReflection = data[selectedCategory];

  return (
    <div className="review-step life-wheel-audit">
      <div className="audit-header">
        <h2>🎯 Life Wheel Audit</h2>
        <p>Rate your satisfaction in key areas of your life during {reviewYear}.</p>
        <div className="progress-indicator">
          <span className="progress-text">
            {completedCount} / {LIFE_WHEEL_CATEGORIES.length} categories reflected
          </span>
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${(completedCount / LIFE_WHEEL_CATEGORIES.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="audit-content">
        {/* Radar Chart */}
        <div className="radar-chart-section">
          <svg 
            viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
            className="radar-chart"
            style={{ maxWidth: '400px', margin: '0 auto' }}
          >
            {/* Background levels */}
            {radarGeometry.levelPolygons.map((level, i) => (
              <polygon
                key={`level-${i}`}
                points={level.points}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            ))}

            {/* Axes */}
            {radarGeometry.axes.map(axis => (
              <line
                key={`axis-${axis.key}`}
                x1={axis.x1}
                y1={axis.y1}
                x2={axis.x2}
                y2={axis.y2}
                stroke="#cbd5e1"
                strokeWidth="1"
              />
            ))}

            {/* Data polygon */}
            <polygon
              points={radarGeometry.polygonPoints}
              fill="url(#radarGradient)"
              fillOpacity="0.4"
              stroke="#06b6d4"
              strokeWidth="2"
            />

            {/* Labels */}
            {radarGeometry.labels.map(label => (
              <text
                key={`label-${label.key}`}
                x={label.x}
                y={label.y}
                textAnchor={label.anchor}
                dominantBaseline={label.baseline}
                className={`radar-label ${selectedCategory === label.key ? 'active' : ''}`}
                onClick={() => setSelectedCategory(label.key as LifeWheelCategoryKey)}
                style={{ cursor: 'pointer' }}
              >
                {label.text}
              </text>
            ))}

            {/* Gradient definition */}
            <defs>
              <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Category Selection Tabs */}
        <div className="category-tabs">
          {LIFE_WHEEL_CATEGORIES.map(category => (
            <button
              key={category.key}
              className={`category-tab ${selectedCategory === category.key ? 'active' : ''} ${
                data[category.key].rating > 0 ? 'completed' : ''
              }`}
              onClick={() => setSelectedCategory(category.key)}
              aria-label={`Rate ${category.label}`}
            >
              <span className="category-label">{category.label}</span>
              <span className="category-rating">{data[category.key].rating}/10</span>
            </button>
          ))}
        </div>

        {/* Rating & Reflection Form */}
        <div className="reflection-form">
          <h3>{currentCategory?.label}</h3>
          
          {/* Rating Slider */}
          <div className="rating-input-group">
            <label htmlFor="rating-slider">
              Satisfaction Rating: <strong>{currentReflection.rating}/10</strong>
            </label>
            <input
              id="rating-slider"
              type="range"
              min="1"
              max="10"
              value={currentReflection.rating}
              onChange={(e) => handleRatingChange(selectedCategory, parseInt(e.target.value))}
              className="rating-slider"
              aria-label={`Rate ${currentCategory?.label} from 1 to 10`}
            />
            <div className="rating-labels">
              <span>1 - Needs Work</span>
              <span>10 - Excellent</span>
            </div>
          </div>

          {/* What Went Well */}
          <div className="reflection-input-group">
            <label htmlFor="what-went-well">
              What went well in {reviewYear}?
            </label>
            <textarea
              id="what-went-well"
              value={currentReflection.whatWentWell}
              onChange={(e) => handleReflectionChange(selectedCategory, 'whatWentWell', e.target.value)}
              placeholder="Reflect on your accomplishments and positive moments..."
              rows={3}
              aria-label={`What went well in ${currentCategory?.label}`}
            />
          </div>

          {/* What Needs Focus */}
          <div className="reflection-input-group">
            <label htmlFor="what-needs-focus">
              What needs focus going forward?
            </label>
            <textarea
              id="what-needs-focus"
              value={currentReflection.whatNeedsFocus}
              onChange={(e) => handleReflectionChange(selectedCategory, 'whatNeedsFocus', e.target.value)}
              placeholder="Identify areas for growth and improvement..."
              rows={3}
              aria-label={`What needs focus in ${currentCategory?.label}`}
            />
          </div>
        </div>
      </div>

      <div className="step-actions">
        <button className="btn-secondary" onClick={onBack} disabled={isLoading}>
          Back
        </button>
        <button 
          className="btn-primary" 
          onClick={handleNext}
          disabled={!allRated || isLoading}
          title={!allRated ? 'Please rate all categories' : ''}
        >
          {isLoading ? 'Saving...' : 'Next: Vision Board →'}
        </button>
      </div>

      <style>{`
        .life-wheel-audit {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .audit-header {
          text-align: center;
        }

        .progress-indicator {
          margin-top: 1rem;
        }

        .progress-text {
          display: block;
          font-size: 0.875rem;
          color: #64748b;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .progress-bar-container {
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(to right, #06b6d4, #3b82f6);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .audit-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .radar-chart-section {
          display: flex;
          justify-content: center;
          padding: 1rem;
        }

        .radar-chart {
          width: 100%;
          height: auto;
        }

        .radar-label {
          font-size: 10px;
          fill: #64748b;
          font-weight: 600;
          transition: all 0.2s;
        }

        .radar-label.active {
          fill: #06b6d4;
          font-weight: 700;
          font-size: 11px;
        }

        .radar-label:hover {
          fill: #0891b2;
        }

        .category-tabs {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 0.5rem;
        }

        .category-tab {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.6));
          backdrop-filter: blur(10px);
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.25rem;
        }

        .category-tab:hover {
          border-color: #06b6d4;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.15);
        }

        .category-tab.active {
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          border-color: #06b6d4;
          color: white;
        }

        .category-tab.completed:not(.active) {
          border-color: #3b82f6;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(6, 182, 212, 0.1));
        }

        .category-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-align: left;
        }

        .category-rating {
          font-size: 0.875rem;
          font-weight: 700;
        }

        .category-tab.active .category-label,
        .category-tab.active .category-rating {
          color: white;
        }

        .reflection-form {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.6));
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 1.5rem;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .reflection-form h3 {
          font-size: 1.25rem;
          margin-bottom: 1.5rem;
          color: #0f172a;
          font-weight: 700;
        }

        .rating-input-group {
          margin-bottom: 1.5rem;
        }

        .rating-input-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 0.5rem;
        }

        .rating-slider {
          width: 100%;
          height: 8px;
          border-radius: 4px;
          outline: none;
          -webkit-appearance: none;
          appearance: none;
          background: linear-gradient(to right, #06b6d4, #3b82f6);
          cursor: pointer;
        }

        .rating-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          border: 3px solid #06b6d4;
        }

        .rating-slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          border: 3px solid #06b6d4;
        }

        .rating-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: #64748b;
        }

        .reflection-input-group {
          margin-bottom: 1.5rem;
        }

        .reflection-input-group:last-child {
          margin-bottom: 0;
        }

        .reflection-input-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 0.5rem;
        }

        .reflection-input-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s;
        }

        .reflection-input-group textarea:focus {
          outline: none;
          border-color: #06b6d4;
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
        }

        .reflection-input-group textarea::placeholder {
          color: #94a3b8;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .category-tabs {
            grid-template-columns: repeat(2, 1fr);
          }

          .radar-chart {
            max-width: 300px;
          }

          .reflection-form {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};
