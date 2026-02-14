// LevelWorldsHub Component
// Main entry point for Level Worlds campaign mode

import { useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useLevelWorlds } from './hooks/useLevelWorlds';
import { useWorldProgress } from './hooks/useWorldProgress';
import { WorldBoard } from './components/WorldBoard';
import { NodeDetailSheet } from './components/NodeDetailSheet';
import { BoardCompleteOverlay } from './components/BoardCompleteOverlay';
import type { WorldNode } from './types/levelWorlds';

// Import mini-games
import { TaskTower } from '../games/task-tower/TaskTower';
import { PomodoroSprint } from '../games/pomodoro-sprint/PomodoroSprint';
import { VisionQuest } from '../games/vision-quest/VisionQuest';
import { WheelOfWins } from '../games/wheel-of-wins/WheelOfWins';

import './LevelWorlds.css';

interface LevelWorldsHubProps {
  session: Session;
  onClose: () => void;
}

export function LevelWorldsHub({ session, onClose }: LevelWorldsHubProps) {
  const userId = session.user.id;
  const { state, currentBoard, isLoading, completeNode } = useLevelWorlds(userId);
  const { progress } = useWorldProgress(state);

  const [selectedNode, setSelectedNode] = useState<WorldNode | null>(null);
  const [showBoardComplete, setShowBoardComplete] = useState(false);
  const [completedBoard, setCompletedBoard] = useState<typeof currentBoard>(null);

  // Mini-game states
  const [showTaskTower, setShowTaskTower] = useState(false);
  const [showPomodoroSprint, setShowPomodoroSprint] = useState(false);
  const [showVisionQuest, setShowVisionQuest] = useState(false);
  const [showWheelOfWins, setShowWheelOfWins] = useState(false);

  const handleNodeClick = useCallback((node: WorldNode) => {
    if (node.status === 'active') {
      setSelectedNode(node);
    }
  }, []);

  const handleCloseNodeDetail = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNodeAction = useCallback((node: WorldNode) => {
    // Handle different objective types
    if (node.objective.type === 'mini_game') {
      // Launch the appropriate mini-game
      setSelectedNode(null);
      switch (node.objective.game) {
        case 'task_tower':
          setShowTaskTower(true);
          break;
        case 'pomodoro_sprint':
          setShowPomodoroSprint(true);
          break;
        case 'vision_quest':
          setShowVisionQuest(true);
          break;
        case 'wheel_of_wins':
          setShowWheelOfWins(true);
          break;
      }
    } else {
      // For other types, show message that they need to complete in the app
      alert(`Please complete this objective in the ${node.objective.type} section of the app, then return here.`);
      setSelectedNode(null);
    }
  }, []);

  const handleMiniGameComplete = useCallback(async () => {
    // Close all mini-games
    setShowTaskTower(false);
    setShowPomodoroSprint(false);
    setShowVisionQuest(false);
    setShowWheelOfWins(false);

    // Complete the current node if it was a mini-game
    if (selectedNode && selectedNode.objective.type === 'mini_game' && currentBoard) {
      await completeNode(currentBoard.id, selectedNode.id);
      setSelectedNode(null);

      // Check if board is complete
      const allComplete = currentBoard.nodes.every(n => 
        n.id === selectedNode.id || n.status === 'completed'
      );
      
      if (allComplete) {
        setCompletedBoard(currentBoard);
        setShowBoardComplete(true);
      }
    }
  }, [selectedNode, currentBoard, completeNode]);

  const handleBoardContinue = useCallback(() => {
    setShowBoardComplete(false);
    setCompletedBoard(null);
    // The state will automatically load the next board
  }, []);

  // Render mini-games
  if (showTaskTower) {
    return (
      <TaskTower
        session={session}
        onClose={handleMiniGameComplete}
      />
    );
  }

  if (showPomodoroSprint) {
    return (
      <PomodoroSprint
        session={session}
        onClose={handleMiniGameComplete}
      />
    );
  }

  if (showVisionQuest) {
    return (
      <VisionQuest
        session={session}
        onClose={handleMiniGameComplete}
      />
    );
  }

  if (showWheelOfWins) {
    return (
      <WheelOfWins
        session={session}
        onClose={handleMiniGameComplete}
      />
    );
  }

  return (
    <div className="level-worlds-hub">
      <div className="level-worlds-header">
        <button
          className="level-worlds-back-button"
          onClick={onClose}
          aria-label="Back to Lucky Roll"
        >
          ← Back
        </button>

        <h1 className="level-worlds-title">🗺️ Level Worlds Campaign</h1>

        <div className="level-worlds-stats">
          <div className="stat-item">
            <span className="stat-label">Current Level</span>
            <span className="stat-value">{progress.currentBoardLevel}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Boards Completed</span>
            <span className="stat-value">{progress.completedBoards}</span>
          </div>
        </div>
      </div>

      <div className="level-worlds-content">
        {currentBoard ? (
          <WorldBoard
            board={currentBoard}
            userId={userId}
            onNodeClick={handleNodeClick}
          />
        ) : (
          <div className="level-worlds-loading">
            <p>Loading your adventure...</p>
          </div>
        )}
      </div>

      {selectedNode && (
        <NodeDetailSheet
          node={selectedNode}
          userId={userId}
          onClose={handleCloseNodeDetail}
          onAction={handleNodeAction}
        />
      )}

      {showBoardComplete && completedBoard && (
        <BoardCompleteOverlay
          board={completedBoard}
          onContinue={handleBoardContinue}
        />
      )}

      {isLoading && (
        <div className="level-worlds-loading-overlay">
          <div className="spinner" />
        </div>
      )}
    </div>
  );
}
