import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LifeWheelCategoryKey } from '../../checkins/LifeWheelCheckins';
import {
  buildLifeWheelCategoryStatsViewModel,
  type LifeWheelCategoryCheckin,
  type LifeWheelCategoryGoal,
  type LifeWheelCategoryHabit,
  type LifeWheelCategoryHabitLog,
} from './lifeWheelCategoryStats';
import { LifeWheelCategoryStatsModal } from './LifeWheelCategoryStatsModal';
import './LifeWheelCategoryStatsModal.css';

type LifeWheelCategoryRealmModalProps = {
  categoryKey: LifeWheelCategoryKey;
  checkins: LifeWheelCategoryCheckin[];
  goals?: LifeWheelCategoryGoal[];
  habits?: LifeWheelCategoryHabit[];
  habitLogs?: LifeWheelCategoryHabitLog[];
  onClose: () => void;
};

function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [active]);
}

export function LifeWheelCategoryRealmModal({
  categoryKey,
  checkins,
  goals,
  habits,
  habitLogs,
  onClose,
}: LifeWheelCategoryRealmModalProps) {
  const [screen, setScreen] = useState<'intro' | 'stats'>('intro');
  const viewModel = useMemo(
    () => buildLifeWheelCategoryStatsViewModel({ categoryKey, checkins, goals, habits, habitLogs }),
    [categoryKey, checkins, goals, habits, habitLogs],
  );

  useBodyScrollLock(true);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    setScreen('intro');
  }, [categoryKey]);

  const modal = (
    <div className="life-wheel-realm" role="dialog" aria-modal="true" aria-labelledby="life-wheel-realm-title">
      <button type="button" className="life-wheel-realm__backdrop" onClick={onClose} aria-label="Close realm stats" />
      {screen === 'stats' ? (
        <LifeWheelCategoryStatsModal viewModel={viewModel} onBack={() => setScreen('intro')} onClose={onClose} />
      ) : (
        <div className="life-wheel-realm__panel life-wheel-realm__panel--intro" role="document">
          <div className="life-wheel-realm__topbar life-wheel-realm__topbar--end">
            <button type="button" className="life-wheel-realm__round-button" onClick={onClose} aria-label="Close realm intro">
              ✕
            </button>
          </div>

          <div className="life-wheel-realm__intro-content">
            <div className="life-wheel-realm__icon-orb" aria-hidden="true">
              <span>{viewModel.icon}</span>
            </div>
            <p className="life-wheel-realm__kicker">Entering {viewModel.shortLabel} Realm</p>
            <h2 id="life-wheel-realm-title">{viewModel.title}</h2>
            <p className="life-wheel-realm__description">{viewModel.description}</p>

            <div className={`life-wheel-realm__hero life-wheel-realm__hero--${viewModel.categoryKey}`}>
              <div>
                <span>{viewModel.heroTone}</span>
                <strong>{viewModel.areaName} Realm</strong>
              </div>
            </div>

            <div className="life-wheel-realm__chips life-wheel-realm__chips--center">
              <span>{viewModel.latestScore === null ? 'Latest score unknown' : `Latest score ${viewModel.latestScore}/10`}</span>
              <span>{viewModel.trendLabel}</span>
            </div>

            {!viewModel.hasSignal ? <p className="life-wheel-realm__empty">{viewModel.emptyState}</p> : null}

            <button type="button" className="life-wheel-realm__primary" onClick={() => setScreen('stats')}>
              View My Stats
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modal, document.body);
}
