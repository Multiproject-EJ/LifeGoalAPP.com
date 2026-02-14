// WorldPath Component
// Renders SVG path connecting nodes sequentially

import type { WorldNode } from '../types/levelWorlds';

interface WorldPathProps {
  nodes: WorldNode[];
  boardWidth: number;
  boardHeight: number;
}

export function WorldPath({ nodes, boardWidth, boardHeight }: WorldPathProps) {
  if (nodes.length < 2) return null;

  // Generate SVG path connecting nodes
  const pathData = nodes.reduce((path, node, index) => {
    const x = (node.position.x / 100) * boardWidth;
    const y = (node.position.y / 100) * boardHeight;
    
    if (index === 0) {
      return `M ${x} ${y}`;
    }
    
    // Use quadratic curve for smoother path
    const prevNode = nodes[index - 1];
    const prevX = (prevNode.position.x / 100) * boardWidth;
    const prevY = (prevNode.position.y / 100) * boardHeight;
    
    const midX = (prevX + x) / 2;
    const midY = (prevY + y) / 2;
    
    return `${path} Q ${midX} ${midY} ${x} ${y}`;
  }, '');

  return (
    <svg
      className="world-path"
      width={boardWidth}
      height={boardHeight}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      <defs>
        <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(218, 165, 32, 0.3)" />
          <stop offset="100%" stopColor="rgba(184, 134, 11, 0.3)" />
        </linearGradient>
      </defs>
      
      <path
        d={pathData}
        stroke="url(#pathGradient)"
        strokeWidth="3"
        fill="none"
        strokeDasharray="5,5"
        strokeLinecap="round"
      />
    </svg>
  );
}
