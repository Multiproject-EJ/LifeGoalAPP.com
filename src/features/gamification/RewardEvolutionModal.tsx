import type { RewardItem } from '../../types/gamification';
import { getEvolutionSuggestion } from '../../lib/rewardEvolution';
import './RewardEvolutionModal.css';

type Props = {
  reward: RewardItem;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
};

export function RewardEvolutionModal({ reward, onAccept, onDecline, onClose }: Props) {
  const evolved = getEvolutionSuggestion(reward);

  // Dynamic copy based on evolution state
  const getModalCopy = () => {
    if (reward.evolutionState === 0) {
      return {
        title: `💫 Want to level up "${reward.title}"?`,
        prompt: "You've enjoyed this reward 3+ times this week. Want to make it even more meaningful?",
      };
    }
    if (reward.evolutionState === 1) {
      return {
        title: `🌟 Ready to elevate "${reward.title}"?`,
        prompt: "You're getting value from this reward! Want to add some light structure to make it even better?",
      };
    }
    return {
      title: `✨ Want to evolve "${reward.title}"?`,
      prompt: "You've been enjoying this reward. Ready for the next level?",
    };
  };

  const copy = getModalCopy();

  return (
    <div className="reward-evolution-modal" role="dialog" aria-modal="true">
      <div className="reward-evolution-modal__backdrop" onClick={onClose} />
      <div className="reward-evolution-modal__content">
        <h3 className="reward-evolution-modal__title">
          {copy.title}
        </h3>
        <p className="reward-evolution-modal__prompt">
          {copy.prompt}
        </p>

        <div className="reward-evolution-modal__preview">
          <div className="reward-evolution-modal__current">
            <strong>Current:</strong> {reward.title}
          </div>
          <div className="reward-evolution-modal__arrow">→</div>
          <div className="reward-evolution-modal__evolved">
            <strong>Evolved:</strong> {evolved.title}
            <p className="reward-evolution-modal__description">{evolved.description}</p>
          </div>
        </div>

        <div className="reward-evolution-modal__actions">
          <button
            type="button"
            className="reward-evolution-modal__accept"
            onClick={onAccept}
          >
            ✨ Evolve it
          </button>
          <button
            type="button"
            className="reward-evolution-modal__decline"
            onClick={onDecline}
          >
            Keep as-is
          </button>
        </div>
      </div>
    </div>
  );
}
