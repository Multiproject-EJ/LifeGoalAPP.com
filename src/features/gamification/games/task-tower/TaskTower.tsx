import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useActions } from '../../../actions/hooks/useActions';
import { buildTower, removeBlock, checkLineClears, calculateBlockRewards, calculateLineClearRewards, calculateAllClearRewards } from './taskTowerState';
import { TaskTowerBlock } from './TaskTowerBlock';
import { TaskTowerRewards } from './TaskTowerRewards';
import { LuckyRollCelebration } from '../../daily-treats/LuckyRollCelebration';
import { logGameSession, awardDice, awardGameTokens } from '../../../../services/gameRewards';
import { awardGold } from '../../daily-treats/luckyRollTileEffects';
import type { TowerBlock, TaskTowerSession } from './taskTowerTypes';
import { TOWER_GRID } from './taskTowerTypes';
import { playTone, playChime, playCelebrationCascade } from '../../../../utils/audioUtils';
import './taskTower.css';

// Sound implementations
const playBlockRemove = () => {
  playTone(600, 0.15, 'square', 0.2);
};

const playBlockSettle = () => {
  playTone(300, 0.1, 'triangle', 0.15);
};

const playLineClear = () => {
  // Golden flash sound
  playChime([800, 1000, 1200], 50, 0.2, 0.3);
};

const playAllClear = () => {
  // Big celebration
  playCelebrationCascade('big');
  setTimeout(() => {
    playChime([523, 659, 784, 1047], 100, 0.3, 0.35);
  }, 400);
};

const playBlockTap = () => {
  playTone(500, 0.05, 'sine', 0.15);
};

interface TaskTowerProps {
  session: Session;
  onClose: () => void;
  onComplete: (rewards: { coins: number; dice: number; tokens: number }) => void;
}

export function TaskTower({ session, onClose, onComplete }: TaskTowerProps) {
  const userId = session.user.id;
  const { actions, loading, completeAction: completeActionHook } = useActions(session);
  
  const [gameSession, setGameSession] = useState<TaskTowerSession>({
    blocks: [],
    blocksCleared: 0,
    linesCleared: 0,
    coinsEarned: 0,
    diceEarned: 0,
    tokensEarned: 0,
    sessionStartTime: new Date().toISOString(),
    isComplete: false,
  });
  
  const [selectedBlock, setSelectedBlock] = useState<TowerBlock | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [floatingReward, setFloatingReward] = useState<{ text: string; id: number } | null>(null);
  const [lineClearAnimation, setLineClearAnimation] = useState<number[]>([]);
  
  const floatingRewardIdRef = useRef(0);

  // Initialize tower on mount
  useEffect(() => {
    if (!loading && actions.length > 0) {
      const blocks = buildTower(actions.filter(a => !a.completed));
      setGameSession(prev => ({ ...prev, blocks }));
      
      // Log game session enter
      logGameSession(userId, {
        gameId: 'task_tower',
        action: 'enter',
        timestamp: new Date().toISOString(),
        metadata: { blockCount: blocks.length },
      });
    }
  }, [loading, actions, userId]);

  const showFloatingReward = useCallback((text: string) => {
    const id = ++floatingRewardIdRef.current;
    setFloatingReward({ text, id });
    
    setTimeout(() => {
      setFloatingReward(prev => prev?.id === id ? null : prev);
    }, 2000);
  }, []);

  const handleBlockTap = useCallback((block: TowerBlock) => {
    playBlockTap();
    setSelectedBlock(block);
  }, []);

  const handleConfirmComplete = useCallback(async () => {
    if (!selectedBlock) return;
    
    try {
      // Complete the real action
      await completeActionHook(selectedBlock.actionId);
      
      // Calculate block rewards
      const blockRewards = calculateBlockRewards(selectedBlock.category);
      
      // Award rewards immediately
      if (blockRewards.coins > 0) {
        awardGold(userId, blockRewards.coins, 'task_tower', `Task Tower: Completed ${selectedBlock.category} block`);
      }
      if (blockRewards.dice > 0) {
        awardDice(userId, blockRewards.dice, 'task_tower', `Task Tower: Completed ${selectedBlock.category} block`);
      }
      
      // Update session
      setGameSession(prev => ({
        ...prev,
        blocksCleared: prev.blocksCleared + 1,
        coinsEarned: prev.coinsEarned + blockRewards.coins,
        diceEarned: prev.diceEarned + blockRewards.dice,
      }));
      
      // Show floating reward
      const rewardParts = [];
      if (blockRewards.coins > 0) rewardParts.push(`+${blockRewards.coins} 🪙`);
      if (blockRewards.dice > 0) rewardParts.push(`+${blockRewards.dice} 🎲`);
      showFloatingReward(rewardParts.join(' '));
      
      // Mark block as animating
      setGameSession(prev => ({
        ...prev,
        blocks: prev.blocks.map(b => 
          b.id === selectedBlock.id ? { ...b, animating: true, completed: true } : b
        ),
      }));
      
      setSelectedBlock(null);
      
      // Play removal animation
      playBlockRemove();
      
      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Remove block and apply gravity
      setGameSession(prev => {
        const remainingBlocks = removeBlock(prev.blocks, selectedBlock.id);
        playBlockSettle();
        
        return { ...prev, blocks: remainingBlocks };
      });
      
      // Wait for gravity to settle
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Check for line clears
      setGameSession(prev => {
        const { clearedRows, blocks: updatedBlocks } = checkLineClears(prev.blocks);
        
        if (clearedRows.length > 0) {
          playLineClear();
          setLineClearAnimation(clearedRows);
          
          // Calculate line clear rewards
          const lineClearRewards = calculateLineClearRewards(clearedRows.length);
          
          // Award line clear rewards immediately
          if (lineClearRewards.coins > 0) {
            awardGold(userId, lineClearRewards.coins, 'task_tower', `Task Tower: Cleared ${clearedRows.length} line(s)`);
          }
          if (lineClearRewards.dice > 0) {
            awardDice(userId, lineClearRewards.dice, 'task_tower', `Task Tower: Cleared ${clearedRows.length} line(s)`);
          }
          
          // Show floating reward for line clears
          const lineClearRewardText = [];
          if (lineClearRewards.coins > 0) lineClearRewardText.push(`+${lineClearRewards.coins} 🪙`);
          if (lineClearRewards.dice > 0) lineClearRewardText.push(`+${lineClearRewards.dice} 🎲`);
          if (lineClearRewardText.length > 0) {
            showFloatingReward(`Line Clear! ${lineClearRewardText.join(' ')}`);
          }
          
          // Clear line clear animation after delay
          setTimeout(() => {
            setLineClearAnimation([]);
          }, 600);
          
          return {
            ...prev,
            blocks: updatedBlocks,
            linesCleared: prev.linesCleared + clearedRows.length,
            coinsEarned: prev.coinsEarned + lineClearRewards.coins,
            diceEarned: prev.diceEarned + lineClearRewards.dice,
          };
        }
        
        return { ...prev, blocks: updatedBlocks };
      });
      
      // Check if all blocks are cleared
      setGameSession(prev => {
        if (prev.blocks.length === 0) {
          playAllClear();
          
          // Calculate all clear bonus
          const allClearRewards = calculateAllClearRewards();
          
          // Award all clear rewards immediately
          if (allClearRewards.coins > 0) {
            awardGold(userId, allClearRewards.coins, 'task_tower', 'Task Tower: All Clear Bonus');
          }
          if (allClearRewards.dice > 0) {
            awardDice(userId, allClearRewards.dice, 'task_tower', 'Task Tower: All Clear Bonus');
          }
          if (allClearRewards.tokens > 0) {
            awardGameTokens(userId, allClearRewards.tokens, 'task_tower', 'Task Tower: All Clear Bonus');
          }
          
          const finalSession = {
            ...prev,
            coinsEarned: prev.coinsEarned + allClearRewards.coins,
            diceEarned: prev.diceEarned + allClearRewards.dice,
            tokensEarned: prev.tokensEarned + allClearRewards.tokens,
            isComplete: true,
          };
          
          // Show all clear celebration
          setShowCelebration(true);
          
          setTimeout(() => {
            setShowCelebration(false);
            setShowRewards(true);
          }, 2000);
          
          return finalSession;
        }
        
        return prev;
      });
      
    } catch (error) {
      console.error('Failed to complete action:', error);
    }
  }, [selectedBlock, completeActionHook, showFloatingReward, userId]);

  const handleCancelComplete = useCallback(() => {
    setSelectedBlock(null);
  }, []);

  const handleCloseRewards = useCallback(() => {
    // Deliver rewards
    onComplete({
      coins: gameSession.coinsEarned,
      dice: gameSession.diceEarned,
      tokens: gameSession.tokensEarned,
    });
    
    // Log session completion
    logGameSession(userId, {
      gameId: 'task_tower',
      action: 'complete',
      timestamp: new Date().toISOString(),
      metadata: {
        blocksCleared: gameSession.blocksCleared,
        linesCleared: gameSession.linesCleared,
        coinsEarned: gameSession.coinsEarned,
        diceEarned: gameSession.diceEarned,
        tokensEarned: gameSession.tokensEarned,
      },
    });
    
    onClose();
  }, [gameSession, onComplete, onClose, userId]);

  const handleExit = useCallback(() => {
    if (gameSession.blocksCleared > 0) {
      // Show rewards if player has cleared any blocks
      setShowRewards(true);
    } else {
      // Otherwise just close
      onClose();
    }
  }, [gameSession.blocksCleared, onClose]);

  // Empty state: no active actions
  if (!loading && actions.filter(a => !a.completed).length === 0) {
    return (
      <div className="task-tower">
        <div className="task-tower__backdrop" />
        
        <div className="task-tower__container">
          <div className="task-tower__header">
            <h2 className="task-tower__title">🗼 Task Tower</h2>
            <button
              type="button"
              className="task-tower__close"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          
          <div className="task-tower__empty-state">
            <p className="task-tower__empty-message">
              No tasks to clear!<br />
              Add some actions first.
            </p>
            <button
              type="button"
              className="task-tower__button"
              onClick={onClose}
            >
              Back to Board
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="task-tower">
      <div className="task-tower__backdrop" />
      
      <div className="task-tower__container">
        <div className="task-tower__header">
          <h2 className="task-tower__title">🗼 Task Tower</h2>
          <div className="task-tower__stats">
            <span className="task-tower__stat">Cleared: {gameSession.blocksCleared}</span>
            {gameSession.linesCleared > 0 && (
              <span className="task-tower__stat">Lines: {gameSession.linesCleared}</span>
            )}
          </div>
          <button
            type="button"
            className="task-tower__close"
            onClick={handleExit}
            aria-label="Exit"
          >
            ✕
          </button>
        </div>
        
        <div className="task-tower__game-area">
          <div 
            className="task-tower__grid"
            style={{
              gridTemplateColumns: `repeat(${TOWER_GRID.COLS}, 1fr)`,
              gridTemplateRows: `repeat(${TOWER_GRID.MAX_ROWS}, auto)`,
            }}
          >
            {gameSession.blocks.map(block => (
              <TaskTowerBlock
                key={block.id}
                block={block}
                onTap={handleBlockTap}
                isSelected={selectedBlock?.id === block.id}
              />
            ))}
            
            {lineClearAnimation.map(row => (
              <div
                key={row}
                className="task-tower__line-clear-flash"
                style={{ gridRow: `${row + 1}` }}
              />
            ))}
          </div>
          
          {floatingReward && (
            <div className="task-tower__floating-reward" key={floatingReward.id}>
              {floatingReward.text}
            </div>
          )}
        </div>
        
        {selectedBlock && (
          <div className="task-tower__confirm-modal">
            <div className="task-tower__confirm-content">
              <h3 className="task-tower__confirm-title">{selectedBlock.title}</h3>
              <p className="task-tower__confirm-message">Complete this task?</p>
              <div className="task-tower__confirm-actions">
                <button
                  type="button"
                  className="task-tower__confirm-button task-tower__confirm-button--confirm"
                  onClick={handleConfirmComplete}
                >
                  Complete ✓
                </button>
                <button
                  type="button"
                  className="task-tower__confirm-button task-tower__confirm-button--cancel"
                  onClick={handleCancelComplete}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {showCelebration && (
        <LuckyRollCelebration 
          type="big" 
          message="🗼 TOWER CLEARED!" 
          onComplete={() => setShowCelebration(false)}
        />
      )}
      
      {showRewards && (
        <TaskTowerRewards
          blocksCleared={gameSession.blocksCleared}
          linesCleared={gameSession.linesCleared}
          coins={gameSession.coinsEarned}
          dice={gameSession.diceEarned}
          tokens={gameSession.tokensEarned}
          allClear={gameSession.isComplete}
          onClose={handleCloseRewards}
        />
      )}
    </div>
  );
}
