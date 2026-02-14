// WorldNode Component
// Displays a single objective node on the world board

import { useNodeObjectives } from '../hooks/useNodeObjectives';
import type { WorldNode as WorldNodeType } from '../types/levelWorlds';

interface WorldNodeProps {
  node: WorldNodeType;
  userId: string;
  onNodeClick: (node: WorldNodeType) => void;
}

export function WorldNode({ node, userId, onNodeClick }: WorldNodeProps) {
  const { getObjectiveDescription } = useNodeObjectives(userId);
  
  const handleClick = () => {
    if (node.status === 'active') {
      onNodeClick(node);
    }
  };

  const isLocked = node.status === 'locked';
  const isActive = node.status === 'active';
  const isCompleted = node.status === 'completed';

  return (
    <div
      className={`world-node world-node--${node.status}`}
      style={{
        left: `${node.position.x}%`,
        top: `${node.position.y}%`
      }}
      onClick={handleClick}
      role={isActive ? 'button' : undefined}
      aria-label={`${node.label} - ${node.status}`}
      tabIndex={isActive ? 0 : -1}
    >
      <div className="world-node__icon">
        {isCompleted && <span className="world-node__check">✓</span>}
        {isLocked && <span className="world-node__lock">🔒</span>}
        {!isCompleted && !isLocked && (
          <span className="world-node__emoji">{node.emoji}</span>
        )}
      </div>
      
      {isActive && (
        <div className="world-node__pulse" />
      )}
      
      <div className="world-node__label">
        {node.label}
      </div>
    </div>
  );
}
