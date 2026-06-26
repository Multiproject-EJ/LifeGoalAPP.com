import React from 'react';

export type WinRewardItem = {
  icon: string;
  label: string;
  value: string;
};

type IslandRunWinCelebrationModalProps = {
  open: boolean;
  title?: string;
  subtitle?: string;
  rewards: WinRewardItem[];
  onCollect: () => void;
};

export default function IslandRunWinCelebrationModal({
  open,
  title = 'Congratulations!',
  subtitle = 'You won',
  rewards,
  onCollect,
}: IslandRunWinCelebrationModalProps) {
  if (!open) return null;

  return (
    <div className="island-run-overlay-root island-win-celebration" role="dialog" aria-modal="true" aria-label="Win celebration rewards">
      <div className="island-win-celebration__card">
        <p className="island-win-celebration__title">{title}</p>
        <p className="island-win-celebration__subtitle">{subtitle}</p>
        <div className="island-win-celebration__rewards" aria-live="polite">
          {rewards.map((reward, index) => (
            <div key={`${reward.label}-${index}`} className="island-win-celebration__reward-item">
              <span className="island-win-celebration__reward-icon" aria-hidden="true">{reward.icon}</span>
              <span className="island-win-celebration__reward-value">{reward.value}</span>
              <span className="island-win-celebration__reward-label">{reward.label}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary island-win-celebration__collect"
          onClick={onCollect}
          autoFocus
        >
          Collect
        </button>
      </div>
    </div>
  );
}
