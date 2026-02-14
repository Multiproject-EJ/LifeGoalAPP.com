// WorldBoard Component
// Renders the themed world with positioned nodes and connecting path

import { useRef, useEffect, useState } from 'react';
import type { WorldBoard as WorldBoardType } from '../types/levelWorlds';
import { WorldNode } from './WorldNode';
import { WorldPath } from './WorldPath';

interface WorldBoardProps {
  board: WorldBoardType;
  userId: string;
  onNodeClick: (node: WorldBoardType['nodes'][0]) => void;
}

export function WorldBoard({ board, userId, onNodeClick }: WorldBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      if (boardRef.current) {
        const { width, height } = boardRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const themeClass = `world-board--theme-${board.theme}`;

  return (
    <div className="world-board-container">
      <div className="world-board-header">
        <h2 className="world-board-title">{board.title}</h2>
        <p className="world-board-description">{board.description}</p>
        <div className="world-board-level">Level {board.level}</div>
      </div>

      <div
        ref={boardRef}
        className={`world-board ${themeClass}`}
      >
        <WorldPath
          nodes={board.nodes}
          boardWidth={dimensions.width}
          boardHeight={dimensions.height}
        />

        {board.nodes.map((node) => (
          <WorldNode
            key={node.id}
            node={node}
            userId={userId}
            onNodeClick={onNodeClick}
          />
        ))}
      </div>

      <div className="world-board-progress">
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{
              width: `${(board.nodes.filter(n => n.status === 'completed').length / board.nodes.length) * 100}%`
            }}
          />
        </div>
        <div className="progress-text">
          {board.nodes.filter(n => n.status === 'completed').length} / {board.nodes.length} Objectives Complete
        </div>
      </div>
    </div>
  );
}
