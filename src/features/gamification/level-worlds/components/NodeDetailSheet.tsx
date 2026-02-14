// NodeDetailSheet Component
// Bottom sheet showing objective details and action button

import { useNodeObjectives } from '../hooks/useNodeObjectives';
import type { WorldNode } from '../types/levelWorlds';

interface NodeDetailSheetProps {
  node: WorldNode | null;
  userId: string;
  onClose: () => void;
  onAction: (node: WorldNode) => void;
}

export function NodeDetailSheet({ node, userId, onClose, onAction }: NodeDetailSheetProps) {
  const { getObjectiveDescription, getObjectiveActionText } = useNodeObjectives(userId);

  if (!node) return null;

  const handleAction = () => {
    onAction(node);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="node-detail-sheet-backdrop" onClick={handleBackdropClick}>
      <div className="node-detail-sheet">
        <button
          className="node-detail-sheet__close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="node-detail-sheet__header">
          <span className="node-detail-sheet__emoji">{node.emoji}</span>
          <h2 className="node-detail-sheet__title">{node.label}</h2>
        </div>

        <div className="node-detail-sheet__content">
          <p className="node-detail-sheet__description">
            {getObjectiveDescription(node.objective)}
          </p>

          <div className="node-detail-sheet__rewards">
            <h3>Rewards</h3>
            <div className="node-detail-sheet__reward-list">
              {node.nodeReward.hearts && (
                <div className="reward-item">
                  <span>❤️ {node.nodeReward.hearts}</span>
                </div>
              )}
              {node.nodeReward.dice && (
                <div className="reward-item">
                  <span>🎲 {node.nodeReward.dice}</span>
                </div>
              )}
              {node.nodeReward.coins && (
                <div className="reward-item">
                  <span>🪙 {node.nodeReward.coins}</span>
                </div>
              )}
              {node.nodeReward.xp && (
                <div className="reward-item">
                  <span>⭐ {node.nodeReward.xp} XP</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="node-detail-sheet__actions">
          <button
            className="node-detail-sheet__action-button"
            onClick={handleAction}
          >
            {getObjectiveActionText(node.objective)}
          </button>
        </div>
      </div>
    </div>
  );
}
