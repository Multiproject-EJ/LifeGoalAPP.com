import { useEffect, useRef } from 'react';
import type { AchievementWithProgress } from '../../services/achievements';
import { TIER_LABELS } from '../../types/gamification';

type Props = {
  achievement: AchievementWithProgress;
  onClose: () => void;
};

export function AchievementDetailModal({ achievement, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    dialog.addEventListener('cancel', handleCancel);

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.close();
    };
  }, [onClose]);

  const handleShare = () => {
    const text = `I just unlocked "${achievement.name}" ${achievement.icon} in LifeGoalApp! 🎉`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    }
  };

  const tierLabel = TIER_LABELS[achievement.tier as keyof typeof TIER_LABELS] || achievement.tier;

  return (
    <dialog ref={dialogRef} className="achievement-detail-modal">
      <div className="achievement-detail-modal__header">
        <h2>
          {achievement.icon} {achievement.name}
        </h2>
        <button
          type="button"
          className="achievement-detail-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="achievement-detail-modal__content">
        <div className="achievement-detail-modal__status">
          <span className={`achievement-detail-modal__badge ${achievement.isUnlocked ? 'achievement-detail-modal__badge--unlocked' : 'achievement-detail-modal__badge--locked'}`}>
            {achievement.isUnlocked ? '✅ UNLOCKED' : '🔒 LOCKED'}
          </span>
          <span className="achievement-detail-modal__tier">{tierLabel}</span>
        </div>

        {achievement.unlockedAt && (
          <p className="achievement-detail-modal__unlocked-date">
            Unlocked on {new Date(achievement.unlockedAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        )}

        <div className="achievement-detail-modal__section">
          <h3>Description</h3>
          <p>{achievement.description}</p>
        </div>

        <div className="achievement-detail-modal__section">
          <h3>Requirement</h3>
          <p>
            {achievement.requirement_type.replace(/_/g, ' ')}: {achievement.requirement_value}
          </p>
          {!achievement.isUnlocked && (
            <p className="achievement-detail-modal__progress-text">
              Progress: {achievement.currentProgress}/{achievement.requirement_value} ({achievement.progressPercent}%)
            </p>
          )}
        </div>

        <div className="achievement-detail-modal__section">
          <h3>Rewards</h3>
          <ul className="achievement-detail-modal__rewards">
            <li>✨ {achievement.xp_reward} XP</li>
            <li>💎 {achievement.xp_reward} Points</li>
          </ul>
        </div>

        {achievement.isUnlocked && (
          <div className="achievement-detail-modal__actions">
            <button
              type="button"
              className="achievement-detail-modal__share-button"
              onClick={handleShare}
            >
              📤 Share Achievement
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
