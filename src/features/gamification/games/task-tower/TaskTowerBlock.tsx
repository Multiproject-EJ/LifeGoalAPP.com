import { ACTION_CATEGORY_CONFIG } from '../../../../types/actions';
import type { TowerBlock } from './taskTowerTypes';

interface TaskTowerBlockProps {
  block: TowerBlock;
  /** Total rendered grid rows — needed to flip state rows (0 = ground) into CSS grid rows (1 = top). */
  gridRows: number;
  /** Owning project's color, shown as a ribbon so project clusters read as one. */
  projectColor?: string;
  onTap: (block: TowerBlock) => void;
  isSelected: boolean;
  /** Plays the drop-bounce landing animation (block fell or was crane-delivered). */
  isLanding?: boolean;
}

/** Scatter vectors for the demolition shards, in block-relative units. */
const SHARD_VECTORS = [
  { dx: '-140%', dy: '90%', rot: '-160deg' },
  { dx: '-70%', dy: '160%', rot: '120deg' },
  { dx: '-20%', dy: '120%', rot: '-80deg' },
  { dx: '30%', dy: '170%', rot: '200deg' },
  { dx: '90%', dy: '130%', rot: '-120deg' },
  { dx: '150%', dy: '80%', rot: '90deg' },
] as const;

export function TaskTowerBlock({ block, gridRows, projectColor, onTap, isSelected, isLanding = false }: TaskTowerBlockProps) {
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
    gridRow: `${Math.max(1, gridRows - block.row)}`,
  };

  const blockClasses = [
    'task-tower-block',
    `task-tower-block--${block.category}`,
    isSelected && 'task-tower-block--selected',
    block.animating && 'task-tower-block--completing',
    block.completed && 'task-tower-block--completed',
    isLanding && 'task-tower-block--landing',
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={blockClasses}
      style={blockStyle}
      onClick={handleClick}
      disabled={block.completed || block.animating}
      data-block-id={block.id}
      aria-label={`${block.title} - ${categoryConfig.label}`}
    >
      <span className="task-tower-block__icon">{categoryConfig.icon}</span>
      {projectColor && (
        <span
          className="task-tower-block__project-ribbon"
          style={{ background: projectColor }}
          aria-hidden="true"
        />
      )}
      <span className="task-tower-block__title">{block.title}</span>
      {block.category === 'must_do' && !block.completed && (
        <span className="task-tower-block__pulse" aria-hidden="true" />
      )}
      {block.animating && SHARD_VECTORS.map((vector, index) => (
        <span
          key={index}
          className="task-tower-block__shard"
          style={{
            '--shard-dx': vector.dx,
            '--shard-dy': vector.dy,
            '--shard-rot': vector.rot,
            animationDelay: `${index * 15}ms`,
          } as React.CSSProperties}
          aria-hidden="true"
        />
      ))}
    </button>
  );
}
