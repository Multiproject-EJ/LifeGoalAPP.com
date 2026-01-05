import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import './BodyTab.css';

type BodyTabProps = {
  session: Session;
};

type BodyMetrics = {
  weight: number | null;
  sleepHours: number | null;
  hydrationOz: number;
  energyScore: number;
};

export function BodyTab({ session }: BodyTabProps) {
  const { user } = useSupabaseAuth();
  const [metrics, setMetrics] = useState<BodyMetrics>({
    weight: null,
    sleepHours: null,
    hydrationOz: 0,
    energyScore: 75,
  });

  const [hydrationTarget] = useState(100); // 100 oz target

  const handleAddWater = useCallback(() => {
    setMetrics((prev) => ({
      ...prev,
      hydrationOz: Math.min(prev.hydrationOz + 8, hydrationTarget),
    }));
  }, [hydrationTarget]);

  return (
    <div className="body-tab">
      {/* Header Section */}
      <div className="body-tab__header">
        <h1 className="body-tab__title">Body</h1>
        <p className="body-tab__subtitle">Your physical vitality dashboard</p>
      </div>

      {/* At-A-Glance Section */}
      <section className="body-tab__section body-tab__at-a-glance">
        <h2 className="body-tab__section-title">Today's Status</h2>
        
        {/* Body Battery */}
        <div className="body-battery">
          <div className="body-battery__label">
            <span>Body Battery</span>
            <span className="body-battery__score">{metrics.energyScore}%</span>
          </div>
          <div className="body-battery__bar">
            <div
              className="body-battery__fill"
              style={{ width: `${metrics.energyScore}%` }}
            />
          </div>
        </div>

        {/* Daily Rings */}
        <div className="daily-rings">
          <div className="daily-ring">
            <div className="daily-ring__icon">🏃</div>
            <div className="daily-ring__label">Movement</div>
            <div className="daily-ring__value">--</div>
          </div>
          <div className="daily-ring">
            <div className="daily-ring__icon">🍎</div>
            <div className="daily-ring__label">Fuel</div>
            <div className="daily-ring__value">--</div>
          </div>
          <div className="daily-ring">
            <div className="daily-ring__icon">😴</div>
            <div className="daily-ring__label">Rest</div>
            <div className="daily-ring__value">
              {metrics.sleepHours ? `${metrics.sleepHours}h` : '--'}
            </div>
          </div>
        </div>

        {/* Hydration Tracker */}
        <div className="hydration-tracker">
          <div className="hydration-tracker__header">
            <span>💧 Hydration</span>
            <span>
              {metrics.hydrationOz} / {hydrationTarget} oz
            </span>
          </div>
          <div className="hydration-tracker__bar">
            <div
              className="hydration-tracker__fill"
              style={{ width: `${(metrics.hydrationOz / hydrationTarget) * 100}%` }}
            />
          </div>
          <button
            className="hydration-tracker__add-btn"
            onClick={handleAddWater}
            type="button"
          >
            + 8oz
          </button>
        </div>
      </section>

      {/* Active Goals Section */}
      <section className="body-tab__section body-tab__goals">
        <h2 className="body-tab__section-title">Active Goals</h2>
        <div className="body-goals-scroll">
          <div className="body-goal-card body-goal-card--placeholder">
            <div className="body-goal-card__title">Track your first body goal</div>
            <div className="body-goal-card__subtitle">Weight, fitness, or health targets</div>
          </div>
        </div>
      </section>

      {/* Body Habits Section */}
      <section className="body-tab__section body-tab__habits">
        <h2 className="body-tab__section-title">Daily Habits</h2>
        <div className="body-habits-list">
          <div className="body-habit-item body-habit-item--placeholder">
            <span>No vitality habits yet</span>
          </div>
        </div>
      </section>

      {/* Activity Feed Section */}
      <section className="body-tab__section body-tab__activity">
        <h2 className="body-tab__section-title">Recent Activity</h2>
        <div className="body-activity-feed">
          <div className="body-activity-item body-activity-item--placeholder">
            <span>Log your first workout</span>
          </div>
        </div>
      </section>

      {/* Body Gallery Section */}
      <section className="body-tab__section body-tab__gallery">
        <h2 className="body-tab__section-title">Body Gallery</h2>
        <div className="body-gallery-toggle">
          <button className="body-gallery-toggle__btn body-gallery-toggle__btn--active" type="button">
            📸 Physique
          </button>
          <button className="body-gallery-toggle__btn" type="button">
            🩺 Health
          </button>
        </div>
        <div className="body-gallery-preview body-gallery-preview--blurred">
          <div className="body-gallery-preview__placeholder">
            <span>🔒</span>
            <p>Tap to view gallery</p>
          </div>
        </div>
      </section>

      {/* Floating Action Button */}
      <button className="body-tab__fab" type="button" aria-label="Quick actions">
        +
      </button>
    </div>
  );
}
