import { ACTION_CATEGORY_CONFIG } from '../../../../types/actions';
import type { TowerBlock } from './taskTowerTypes';
import { TOWER_GRID } from './taskTowerTypes';

interface TaskTowerBlockProps {
  block: TowerBlock;
  onTap: (block: TowerBlock) => void;
  isSelected: boolean;
}

export function TaskTowerBlock({ block, onTap, isSelected }: TaskTowerBlockProps) {
  const categoryConfig = ACTION_CATEGORY_CONFIG[block.category];

  const handleClick = () => {
    if (!block.completed && !block.animating) {
      onTap(block);
    }
  };

  // State row 0 is the ground the tower settles onto, but CSS grid row 1 is
  // the top of the grid — flip so the tower stands on the scene's ground
  // strip and blocks visually drop DOWN when the ones beneath them clear.
  const blockStyle: React.CSSProperties = {
    gridColumn: `${block.col + 1} / span ${block.width}`,
    gridRow: `${TOWER_GRID.MAX_ROWS - block.row}`,
  };

  const blockClasses = [
    'task-tower-block',
    `task-tower-block--${block.category}`,
    isSelected && 'task-tower-block--selected',
    block.animating && 'task-tower-block--completing',
    block.completed && 'task-tower-block--completed',
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={blockClasses}
      style={blockStyle}
      onClick={handleClick}
      disabled={block.completed || block.animating}
      aria-label={`${block.title} - ${categoryConfig.label}`}
    >
      <span className="task-tower-block__icon">{categoryConfig.icon}</span>
      <span className="task-tower-block__title">{block.title}</span>
      {block.category === 'must_do' && !block.completed && (
        <span className="task-tower-block__pulse" aria-hidden="true" />
      )}
    </button>
  );
}
