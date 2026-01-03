import React from 'react';
import { YearInReviewStats } from '../../../services/annualReviews';
import { LIFE_WHEEL_CATEGORIES } from '../../checkins/LifeWheelCheckins';

type ShareableYearInReviewProps = {
  year: number;
  stats: YearInReviewStats;
};

/**
 * Shareable Year in Review component - designed for social media sharing
 * This component is optimized for capture as an image (1080x1080px for Instagram)
 */
export const ShareableYearInReview: React.FC<ShareableYearInReviewProps> = ({ year, stats }) => {
  // Get the label for the most active category
  const getMostActiveCategoryLabel = (categoryKey: string | null): string => {
    if (!categoryKey) return 'N/A';
    
    const category = LIFE_WHEEL_CATEGORIES.find(cat => cat.key === categoryKey);
    return category?.label || categoryKey;
  };

  return (
    <div 
      className="shareable-year-review"
      style={{
        width: '1080px',
        height: '1080px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '80px 60px',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '80px', 
          fontWeight: '900',
          margin: '0 0 20px 0',
          textShadow: '0 4px 20px rgba(0,0,0,0.3)',
          letterSpacing: '-2px'
        }}>
          {year}
        </h1>
        <p style={{ 
          fontSize: '40px', 
          margin: '0',
          fontWeight: '600',
          opacity: 0.95
        }}>
          My Year in Review
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: '30px',
        margin: '40px 0'
      }}>
        {/* Habits Completed */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          borderRadius: '30px',
          padding: '40px',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ 
            fontSize: '36px', 
            marginBottom: '15px',
            opacity: 0.9,
            fontWeight: '600'
          }}>
            🎯 Habits Completed
          </div>
          <div style={{ 
            fontSize: '100px', 
            fontWeight: '900',
            lineHeight: '1',
            textShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            {stats.total_habits_completed}
          </div>
        </div>

        {/* Grid for two smaller stats */}
        <div style={{ display: 'flex', gap: '30px' }}>
          {/* Longest Streak */}
          <div style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            borderRadius: '30px',
            padding: '40px',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ 
              fontSize: '32px', 
              marginBottom: '15px',
              opacity: 0.9,
              fontWeight: '600'
            }}>
              🔥 Best Streak
            </div>
            <div style={{ 
              fontSize: '70px', 
              fontWeight: '900',
              lineHeight: '1',
              textShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}>
              {stats.longest_streak}
            </div>
            <div style={{ 
              fontSize: '28px', 
              marginTop: '10px',
              opacity: 0.85
            }}>
              days
            </div>
          </div>

          {/* Most Active Area */}
          <div style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            borderRadius: '30px',
            padding: '40px',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <div style={{ 
              fontSize: '32px', 
              marginBottom: '15px',
              opacity: 0.9,
              fontWeight: '600'
            }}>
              ⭐ Top Area
            </div>
            <div style={{ 
              fontSize: '36px', 
              fontWeight: '800',
              lineHeight: '1.2',
              textShadow: '0 4px 20px rgba(0,0,0,0.2)',
              wordBreak: 'break-word'
            }}>
              {getMostActiveCategoryLabel(stats.most_active_category)}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        textAlign: 'center',
        opacity: 0.9
      }}>
        <div style={{ 
          fontSize: '32px', 
          fontWeight: '700',
          marginBottom: '10px'
        }}>
          LifeGoal App
        </div>
        <div style={{ 
          fontSize: '24px', 
          opacity: 0.8
        }}>
          Track your journey, achieve your goals
        </div>
      </div>
    </div>
  );
};
