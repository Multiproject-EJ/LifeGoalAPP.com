import React, { useEffect, useState, useRef } from 'react';
import { getYearInReviewStats, YearInReviewStats } from '../../../services/annualReviews';
import { LIFE_WHEEL_CATEGORIES } from '../../checkins/LifeWheelCheckins';
import { StatsCard } from './StatsCard';
import { ShareableYearInReview } from './ShareableYearInReview';
import { shareOrDownloadImage } from '../../../utils/imageGenerator';

type StatsRetrospectiveProps = {
  year: number;
  onNext: () => void;
};

/**
 * Step 1: The Retrospective - Display year-in-review statistics
 * Shows user's accomplishments in a "Spotify Wrapped" style layout
 */
export const StatsRetrospective: React.FC<StatsRetrospectiveProps> = ({ year, onNext }) => {
  const [stats, setStats] = useState<YearInReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const shareableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await getYearInReviewStats(year);
      
      if (fetchError) {
        setError('Failed to load your year in review. Please try again.');
        setIsLoading(false);
        return;
      }
      
      setStats(data);
      setIsLoading(false);
    };

    loadStats();
  }, [year]);

  // Get the label for the most active category
  const getMostActiveCategoryLabel = (categoryKey: string | null): string => {
    if (!categoryKey) return 'N/A';
    
    const category = LIFE_WHEEL_CATEGORIES.find(cat => cat.key === categoryKey);
    return category?.label || categoryKey;
  };

  // Handle share/download image
  const handleShareImage = async () => {
    if (!shareableRef.current || !stats) return;

    setIsGeneratingImage(true);
    try {
      await shareOrDownloadImage(
        shareableRef.current,
        `year-in-review-${year}.png`,
        {
          title: `My ${year} in Review`,
          text: `Check out my ${year} achievements! I completed ${stats.total_habits_completed} habits! 🎯`,
        }
      );
    } catch (error) {
      console.error('Failed to generate image:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  if (isLoading) {
    return (
      <div className="review-step">
        <h2>📊 Your {year} in Review</h2>
        <p>Loading your achievements...</p>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="loading-spinner" />
        </div>
        
        <style>{`
          .loading-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid rgba(6, 182, 212, 0.1);
            border-top-color: #06b6d4;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="review-step">
        <h2>📊 Your {year} in Review</h2>
        <div style={{ 
          padding: '2rem', 
          background: '#fef2f2', 
          borderRadius: '12px',
          color: '#991b1b',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
        <div className="step-actions">
          <button className="btn-primary" onClick={onNext}>Continue Anyway</button>
        </div>
      </div>
    );
  }

  return (
    <div className="review-step">
      <div className="retrospective-header">
        <h2>📊 Your {year} in Review</h2>
        <p>Let's celebrate what you accomplished this year!</p>
      </div>

      <div className="stats-grid">
        <StatsCard
          icon="🎯"
          label="Habits Completed"
          value={stats?.total_habits_completed || 0}
          color="linear-gradient(135deg, #06b6d4, #0891b2)"
          delay={0}
        />
        
        <StatsCard
          icon="🔥"
          label="Longest Streak"
          value={`${stats?.longest_streak || 0} days`}
          color="linear-gradient(135deg, #f59e0b, #d97706)"
          delay={150}
        />
        
        <StatsCard
          icon="⭐"
          label="Most Active Area"
          value={getMostActiveCategoryLabel(stats?.most_active_category || null)}
          color="linear-gradient(135deg, #8b5cf6, #7c3aed)"
          delay={300}
        />
      </div>

      <div className="retrospective-message">
        <div className="message-card">
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#0f172a' }}>
            You did amazing! 🎉
          </h3>
          <p style={{ color: '#64748b', lineHeight: '1.6' }}>
            {stats?.total_habits_completed && stats.total_habits_completed > 0 ? (
              <>
                You completed <strong>{stats.total_habits_completed}</strong> habits in {year}. 
                {stats.longest_streak && stats.longest_streak > 0 && (
                  <> Your dedication shows with a {stats.longest_streak}-day streak!</>
                )}
              </>
            ) : (
              <>This is a fresh start! Let's make {year + 1} your best year yet.</>
            )}
          </p>
        </div>
      </div>

      <div className="step-actions">
        <button 
          className="btn-secondary" 
          onClick={handleShareImage}
          disabled={isGeneratingImage}
          style={{ marginRight: 'auto' }}
        >
          {isGeneratingImage ? '⏳ Generating...' : '📸 Share Image'}
        </button>
        <button className="btn-primary" onClick={onNext}>
          Next: Life Wheel Audit →
        </button>
      </div>

      {/* Hidden shareable component for image generation */}
      <div style={{ 
        position: 'fixed', 
        left: '-9999px', 
        top: '-9999px',
        visibility: 'hidden'
      }}>
        <div ref={shareableRef}>
          {stats && <ShareableYearInReview year={year} stats={stats} />}
        </div>
      </div>

      <style>{`
        .retrospective-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .stats-grid {
          display: grid;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        @media (min-width: 640px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .retrospective-message {
          margin-top: 2rem;
        }

        .message-card {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 1.5rem;
          border-radius: 16px;
          border: 2px solid #fbbf24;
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.2);
        }
      `}</style>
    </div>
  );
};
