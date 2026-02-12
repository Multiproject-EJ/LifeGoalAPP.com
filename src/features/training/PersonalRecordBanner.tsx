// Personal Record Celebration Banner
import { useEffect, useState } from 'react';
import type { PersonalRecord } from './types';

interface PersonalRecordBannerProps {
  record: PersonalRecord;
  onDismiss: () => void;
}

export function PersonalRecordBanner({ record, onDismiss }: PersonalRecordBannerProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);

    // Progress bar animation
    const interval = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - 2));
    }, 100);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [onDismiss]);

  const getRecordLabel = () => {
    switch (record.record_type) {
      case 'max_weight':
        return `Max Weight: ${record.value}kg`;
      case 'max_reps':
        return `Max Reps: ${record.value}`;
      case 'max_volume':
        return `Max Volume: ${record.value}kg`;
      default:
        return '';
    }
  };

  const getImprovement = () => {
    if (record.previous_value === null) {
      return 'First record!';
    }
    const improvement = record.value - record.previous_value;
    const percentage = ((improvement / record.previous_value) * 100).toFixed(1);
    return `+${improvement} (+${percentage}%)`;
  };

  return (
    <div className="pr-banner">
      <button
        className="pr-banner__close"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        ×
      </button>
      <div className="pr-banner__content">
        <div className="pr-banner__icon">🏆</div>
        <div className="pr-banner__text">
          <div className="pr-banner__title">NEW PERSONAL RECORD!</div>
          <div className="pr-banner__exercise">{record.exercise_name}</div>
          <div className="pr-banner__stats">
            <span className="pr-banner__value">{getRecordLabel()}</span>
            <span className="pr-banner__improvement">{getImprovement()}</span>
          </div>
        </div>
      </div>
      <div className="pr-banner__progress" style={{ width: `${progress}%` }} />
    </div>
  );
}
