// LevelWorldsHub Component
// Main entry point for Level Worlds campaign mode

import { useState, useCallback, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useLevelWorlds } from './hooks/useLevelWorlds';
import { useWorldProgress } from './hooks/useWorldProgress';
import { WorldBoard } from './components/WorldBoard';
import { NodeDetailSheet } from './components/NodeDetailSheet';
import { BoardCompleteOverlay } from './components/BoardCompleteOverlay';
import { IslandRunBoardPrototype } from './components/IslandRunBoardPrototype';
import type { WorldNode } from './types/levelWorlds';
import { logIslandRunEntryDebug } from './services/islandRunEntryDebug';

// Import mini-games
import { TaskTower } from '../games/task-tower/TaskTower';
import { ShooterBlitz } from '../games/shooter-blitz/ShooterBlitz';
import { VisionQuest } from '../games/vision-quest/VisionQuest';
import { WheelOfWins } from '../games/wheel-of-wins/WheelOfWins';

// Register minigames in the framework registry
import { registerMinigame } from './services/islandRunMinigameRegistry';
import type { IslandRunMinigameProps } from './services/islandRunMinigameTypes';

function ShooterBlitzMinigameAdapter({ islandNumber, onComplete }: IslandRunMinigameProps) {
  return (
    <ShooterBlitz
      islandNumber={islandNumber}
      onComplete={onComplete}
    />
  );
}
registerMinigame({ id: 'shooter_blitz', label: 'Shooter Blitz', component: ShooterBlitzMinigameAdapter });

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
  const [completedBoard, setCompletedBoard] = useState<typeof currentBoard | undefined>(undefined);
  const [notificationMessage, setNotificationMessage] = useState<string>('');

  // Mini-game states
  const [showTaskTower, setShowTaskTower] = useState(false);
  const [showShooterBlitz, setShowShooterBlitz] = useState(false);
  const [showVisionQuest, setShowVisionQuest] = useState(false);
  const [showWheelOfWins, setShowWheelOfWins] = useState(false);

  const islandRunDevParam = new URLSearchParams(window.location.search).get('islandRunDev');
  // Island Run is the production surface. Legacy WorldBoard only renders if ?islandRunDev=0 is set.
  const isIslandRunPrototype = islandRunDevParam !== '0';


  useEffect(() => {
    logIslandRunEntryDebug('level_worlds_hub_mount', {
      userId,
      isIslandRunPrototype,
    });

    return () => {
      logIslandRunEntryDebug('level_worlds_hub_unmount', {
        userId,
      });
    };
  }, [isIslandRunPrototype, userId]);

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
        case 'shooter_blitz':
          setShowShooterBlitz(true);
          break;
        case 'vision_quest':
          setShowVisionQuest(true);
          break;
        case 'wheel_of_wins':
          setShowWheelOfWins(true);
          break;
      }
    } else {
      // For other types, show notification that they need to complete in the app
      const messages: Record<string, string> = {
        habit: 'Complete your habits in the Habits section, then return here.',
        goal: 'Make progress on your goals in the Goals section, then return here.',
        journal: 'Write a journal entry in the Journal section, then return here.',
        personality: 'Complete the personality test in your Profile, then return here.',
        boss: 'Complete all required activities, then return here.'
      };
      setNotificationMessage(messages[node.objective.type] || 'Complete this objective in the app, then return here.');
      setSelectedNode(null);
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => setNotificationMessage(''), 5000);
    }
  }, []);

  const handleMiniGameComplete = useCallback(async () => {
    // Close all mini-games
    setShowTaskTower(false);
    setShowShooterBlitz(false);
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
    setCompletedBoard(undefined);
    // The state will automatically load the next board
  }, []);

  // Render mini-games
  if (showTaskTower) {
    return (
      <TaskTower
        session={session}
        onClose={handleMiniGameComplete}
        onComplete={handleMiniGameComplete}
      />
    );
  }

  if (showShooterBlitz) {
    return (
      <ShooterBlitz
        session={session}
        onClose={handleMiniGameComplete}
        onComplete={handleMiniGameComplete}
      />
    );
  }

  if (showVisionQuest) {
    return (
      <VisionQuest
        session={session}
        onClose={handleMiniGameComplete}
        onComplete={handleMiniGameComplete}
      />
    );
  }

  if (showWheelOfWins) {
    return (
      <WheelOfWins
        session={session}
        onClose={handleMiniGameComplete}
        onComplete={handleMiniGameComplete}
      />
    );
  }

  // Production path: Island Run is the primary surface.
  if (isIslandRunPrototype) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <button
          onClick={onClose}
          aria-label="Back to main app"
          style={{
            position: 'absolute',
            top: '0.75rem',
            left: '0.75rem',
            zIndex: 100,
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '8px',
            padding: '0.35rem 0.75rem',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          ← Back
        </button>
        <IslandRunBoardPrototype session={session} />
      </div>
    );
  }

  // LEGACY — unreachable in production (only rendered when ?islandRunDev=0 is set)
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

      {/* LEGACY — unreachable in production */}
      {selectedNode && (
        <NodeDetailSheet
          node={selectedNode}
          userId={userId}
          onClose={handleCloseNodeDetail}
          onAction={handleNodeAction}
        />
      )}

      {/* LEGACY — unreachable in production */}
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

      {notificationMessage && (
        <div className="level-worlds-notification">
          {notificationMessage}
        </div>
      )}
    </div>
  );
}
