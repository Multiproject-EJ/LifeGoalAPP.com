import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useActions } from '../../../actions/hooks/useActions';
import { useProjects } from '../../../projects/hooks/useProjects';
import {
  buildTowerAndQueue,
  removeBlock,
  placeQueuedBlock,
  getTowerHeight,
  getComboMultiplier,
  applyComboMultiplier,
  calculateBlockRewards,
  calculateLineClearRewards,
  calculateAllClearRewards,
} from './taskTowerState';
import { TaskTowerBlock } from './TaskTowerBlock';
import { TaskTowerScene } from './TaskTowerScene';
import { TaskTowerRewards } from './TaskTowerRewards';
import { LuckyRollCelebration } from '../../daily-treats/LuckyRollCelebration';
import { logGameSession, awardDice, awardGameTokens } from '../../../../services/gameRewards';
import { awardGold } from '../../daily-treats/luckyRollTileEffects';
import type { Action } from '../../../../types/actions';
import type { TowerBlock, TaskTowerSession } from './taskTowerTypes';
import { TOWER_GRID, TASK_TOWER_COMBO } from './taskTowerTypes';
import { playTone, playChime, playCelebrationCascade } from '../../../../utils/audioUtils';
import { triggerCompletionHaptic } from '../../../../utils/completionHaptics';
import './taskTower.css';

// Sound implementations
const playBlockRemove = (comboCount: number) => {
  // Pitch rises with the combo streak so back-to-back clears sound hotter
  playTone(600 + 80 * Math.min(comboCount - 1, 6), 0.15, 'square', 0.2);
};

const playBlockSettle = () => {
  playTone(300, 0.1, 'triangle', 0.15);
};

const playStoreyClear = () => {
  // Golden flash sound
  playChime([800, 1000, 1200], 50, 0.2, 0.3);
};

const playAllClear = () => {
  // Big celebration
  playCelebrationCascade('big');
  playChime([523, 659, 784, 1047], 100, 0.3, 0.35); // Plays simultaneously with cascade
};

const playBlockTap = () => {
  playTone(500, 0.05, 'sine', 0.15);
};

const SHARD_ANIMATION_MS = 450;
const LANDING_ANIMATION_MS = 400;

interface TaskTowerProps {
  session: Session;
  onClose: () => void;
  onComplete: (rewards: { coins: number; dice: number; tokens: number }) => void;
}

type TimeOfDay = 'day' | 'dusk' | 'night';

function resolveTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

interface FloatingReward {
  text: string;
  id: number;
  /** Position within the stage, in percent. Defaults to center. */
  x: number;
  y: number;
}

interface ComboState {
  count: number;
  expiresAt: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function TaskTower({ session, onClose, onComplete }: TaskTowerProps) {
  const userId = session.user.id;
  const { actions, loading, completeAction: completeActionHook } = useActions(session);
  const { projects } = useProjects(session);

  const projectColorById = useMemo(
    () => new Map(projects.map(project => [project.id, project.color])),
    [projects],
  );

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
  const [floatingReward, setFloatingReward] = useState<FloatingReward | null>(null);
  const [storeyFlashRows, setStoreyFlashRows] = useState<number[]>([]);
  const [towerOpenedEmpty, setTowerOpenedEmpty] = useState(false);
  const [timeOfDay] = useState<TimeOfDay>(resolveTimeOfDay);
  const [queuedActions, setQueuedActions] = useState<Action[]>([]);
  const [landingBlockIds, setLandingBlockIds] = useState<Set<string>>(new Set());
  const [combo, setCombo] = useState<ComboState | null>(null);
  const [stageShaking, setStageShaking] = useState(false);
  const [overviewMode, setOverviewMode] = useState(false);

  const floatingRewardIdRef = useRef(0);
  const towerBuiltRef = useRef(false);
  const maxComboRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const towerHeight = getTowerHeight(gameSession.blocks);
  // The grid grows with the tower — every open task lives in it — but never
  // renders shorter than the minimum so small towers keep their proportions.
  const gridRows = Math.max(towerHeight, TOWER_GRID.MIN_VISIBLE_ROWS);

  // Tall towers overflow the stage: keep the ground (where the tower
  // stands) in view by resting the scroll at the bottom.
  useEffect(() => {
    const gameArea = gameAreaRef.current;
    if (gameArea) {
      gameArea.scrollTop = gameArea.scrollHeight;
    }
  }, [gameSession.blocks.length, overviewMode]);

  // Build the tower exactly once per open, from a snapshot of the loaded
  // actions. Completing a block refreshes `actions`, and rebuilding from the
  // refreshed list would wipe gravity/animation state mid-flow and re-log
  // the session enter event.
  useEffect(() => {
    if (loading || towerBuiltRef.current) return;
    towerBuiltRef.current = true;

    const { blocks, queued } = buildTowerAndQueue(actions.filter(a => !a.completed));
    setTowerOpenedEmpty(blocks.length === 0);
    setGameSession(prev => ({ ...prev, blocks }));
    setQueuedActions(queued);

    logGameSession(userId, {
      gameId: 'task_tower',
      action: 'enter',
      timestamp: new Date().toISOString(),
      metadata: { blockCount: blocks.length, queuedCount: queued.length },
    });
  }, [loading, actions, userId]);

  // Retire the combo meter when its window lapses without another clear.
  useEffect(() => {
    if (!combo) return;
    const remaining = combo.expiresAt - Date.now();
    if (remaining <= 0) {
      setCombo(null);
      return;
    }
    const timer = setTimeout(() => {
      setCombo(prev => (prev?.expiresAt === combo.expiresAt ? null : prev));
    }, remaining);
    return () => clearTimeout(timer);
  }, [combo]);

  const showFloatingReward = useCallback((text: string, anchorBlockId?: string) => {
    const id = ++floatingRewardIdRef.current;

    // Anchor to the cleared block's position in the stage when we can,
    // falling back to center for storey/system messages.
    let x = 50;
    let y = 50;
    const stageEl = stageRef.current;
    if (anchorBlockId && stageEl) {
      const blockEl = stageEl.querySelector(`[data-block-id="${anchorBlockId}"]`);
      if (blockEl) {
        const stageRect = stageEl.getBoundingClientRect();
        const blockRect = blockEl.getBoundingClientRect();
        if (stageRect.width > 0 && stageRect.height > 0) {
          x = ((blockRect.left + blockRect.width / 2 - stageRect.left) / stageRect.width) * 100;
          y = ((blockRect.top - stageRect.top) / stageRect.height) * 100;
        }
      }
    }

    setFloatingReward({ text, id, x, y });

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

      // Combo streak: consecutive clears inside the window heat up the
      // multiplier; a lapsed window resets to 1.
      const now = Date.now();
      const comboCount = combo && now < combo.expiresAt ? combo.count + 1 : 1;
      setCombo({ count: comboCount, expiresAt: now + TASK_TOWER_COMBO.WINDOW_MS });
      maxComboRef.current = Math.max(maxComboRef.current, comboCount);

      // Block rewards (coins scale with the combo, dice never do)
      const blockRewards = calculateBlockRewards(selectedBlock.category);
      const blockCoins = applyComboMultiplier(blockRewards.coins, comboCount);

      if (blockCoins > 0) {
        awardGold(userId, blockCoins, 'task_tower', `Task Tower: Completed ${selectedBlock.category} block`);
      }
      if (blockRewards.dice > 0) {
        awardDice(userId, blockRewards.dice, 'task_tower', `Task Tower: Completed ${selectedBlock.category} block`);
      }

      const rewardParts = [];
      if (blockCoins > 0) rewardParts.push(`+${blockCoins} 🪙`);
      if (comboCount >= 2) rewardParts.push(`×${getComboMultiplier(comboCount)}`);
      if (blockRewards.dice > 0) rewardParts.push(`+${blockRewards.dice} 🎲`);
      showFloatingReward(rewardParts.join(' '), selectedBlock.id);

      // Compute the whole post-removal outcome up front from the current
      // snapshot; state updaters below stay pure (no side effects inside).
      const blocksBefore = gameSession.blocks;
      const heightBefore = getTowerHeight(blocksBefore);
      const blocksAfterRemoval = removeBlock(blocksBefore, selectedBlock.id);
      const heightAfter = getTowerHeight(blocksAfterRemoval);
      const storeysCleared = Math.max(0, heightBefore - heightAfter);

      // Crane-drop one queued block into the freed space, if any fits.
      let placedBlock: TowerBlock | null = null;
      let remainingQueue = queuedActions;
      if (queuedActions.length > 0) {
        placedBlock = placeQueuedBlock(blocksAfterRemoval, queuedActions[0]);
        if (placedBlock) {
          remainingQueue = queuedActions.slice(1);
        }
      }
      const finalBlocks = placedBlock ? [...blocksAfterRemoval, placedBlock] : blocksAfterRemoval;

      // Blocks that end up lower than they were (plus the crane delivery)
      // play the drop-bounce landing animation.
      const rowBefore = new Map(blocksBefore.map(b => [b.id, b.row]));
      const landingIds = new Set(
        finalBlocks
          .filter(b => {
            const previousRow = rowBefore.get(b.id);
            return previousRow === undefined || b.row < previousRow;
          })
          .map(b => b.id),
      );

      // Mark the block as demolishing (crack flash + shards)
      setGameSession(prev => ({
        ...prev,
        blocksCleared: prev.blocksCleared + 1,
        coinsEarned: prev.coinsEarned + blockCoins,
        diceEarned: prev.diceEarned + blockRewards.dice,
        blocks: prev.blocks.map(b =>
          b.id === selectedBlock.id ? { ...b, animating: true, completed: true } : b
        ),
      }));
      setSelectedBlock(null);
      playBlockRemove(comboCount);

      // Wait for the shard animation to finish
      await sleep(SHARD_ANIMATION_MS);

      // Storey milestone: the tower got a storey shorter. Golden flash on
      // the vanished storey + a shake, and the flat line-clear bonus.
      let storeyCoins = 0;
      let storeyDice = 0;
      if (storeysCleared > 0) {
        const storeyRewards = calculateLineClearRewards(storeysCleared);
        storeyCoins = storeyRewards.coins;
        storeyDice = storeyRewards.dice;

        if (storeyCoins > 0) {
          awardGold(userId, storeyCoins, 'task_tower', `Task Tower: Tower ${storeysCleared} storey(s) shorter`);
        }
        if (storeyDice > 0) {
          awardDice(userId, storeyDice, 'task_tower', `Task Tower: Tower ${storeysCleared} storey(s) shorter`);
        }

        playStoreyClear();
        setStoreyFlashRows([heightBefore - 1]);
        setStageShaking(true);
        setTimeout(() => setStoreyFlashRows([]), 600);
        setTimeout(() => setStageShaking(false), 450);

        const storeyText = [`+${storeyCoins} 🪙`];
        if (storeyDice > 0) storeyText.push(`+${storeyDice} 🎲`);
        showFloatingReward(`Storey cleared! ${storeyText.join(' ')}`);
      }

      // Land the settled tower (and the crane delivery)
      setGameSession(prev => ({
        ...prev,
        blocks: finalBlocks,
        linesCleared: prev.linesCleared + storeysCleared,
        coinsEarned: prev.coinsEarned + storeyCoins,
        diceEarned: prev.diceEarned + storeyDice,
      }));
      setQueuedActions(remainingQueue);
      setLandingBlockIds(landingIds);
      playBlockSettle();

      await sleep(LANDING_ANIMATION_MS);
      setLandingBlockIds(new Set());

      // All clear: nothing left standing and nothing waiting in the queue
      if (finalBlocks.length === 0 && remainingQueue.length === 0) {
        playAllClear();

        const allClearRewards = calculateAllClearRewards();
        if (allClearRewards.coins > 0) {
          awardGold(userId, allClearRewards.coins, 'task_tower', 'Task Tower: All Clear Bonus');
        }
        if (allClearRewards.dice > 0) {
          awardDice(userId, allClearRewards.dice, 'task_tower', 'Task Tower: All Clear Bonus');
        }
        if (allClearRewards.tokens > 0) {
          awardGameTokens(userId, allClearRewards.tokens, 'task_tower', 'Task Tower: All Clear Bonus');
        }

        setGameSession(prev => ({
          ...prev,
          coinsEarned: prev.coinsEarned + allClearRewards.coins,
          diceEarned: prev.diceEarned + allClearRewards.dice,
          tokensEarned: prev.tokensEarned + allClearRewards.tokens,
          isComplete: true,
        }));

        triggerCompletionHaptic('strong', { channel: 'gamification', minIntervalMs: 3000 });
        setShowCelebration(true);

        setTimeout(() => {
          setShowCelebration(false);
          setShowRewards(true);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to complete action:', error);
    }
  }, [selectedBlock, combo, gameSession.blocks, queuedActions, completeActionHook, showFloatingReward, userId]);

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
        maxCombo: maxComboRef.current,
        durationSeconds: Math.max(
          0,
          Math.round((Date.now() - new Date(gameSession.sessionStartTime).getTime()) / 1000),
        ),
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

  // Empty state: the tower had no blocks when it was opened. Checking the
  // live actions list here instead would flip a just-cleared tower into this
  // state before the all-clear celebration can play.
  if (towerOpenedEmpty) {
    return (
      <div className={`task-tower task-tower--${timeOfDay}`}>
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

  const craneTargetPercent = selectedBlock
    ? ((selectedBlock.col + selectedBlock.width / 2) / TOWER_GRID.COLS) * 100
    : 50;

  return (
    <div className={`task-tower task-tower--${timeOfDay}`}>
      <div className="task-tower__backdrop" />

      <div className="task-tower__container">
        <div className="task-tower__header">
          <h2 className="task-tower__title">🗼 Task Tower</h2>
          <div className="task-tower__stats">
            <span className="task-tower__stat">Cleared: {gameSession.blocksCleared}</span>
            {gameSession.linesCleared > 0 && (
              <span className="task-tower__stat">Storeys: {gameSession.linesCleared}</span>
            )}
          </div>
          <div className="task-tower__header-actions">
            <button
              type="button"
              className={`task-tower__zoom-toggle${overviewMode ? ' task-tower__zoom-toggle--active' : ''}`}
              onClick={() => {
                setSelectedBlock(null);
                setOverviewMode(prev => !prev);
              }}
              aria-pressed={overviewMode}
              aria-label={overviewMode ? 'Zoom in to play' : 'Zoom out to see the whole tower'}
              title={overviewMode ? 'Zoom in to play' : 'See the whole tower'}
            >
              {overviewMode ? '🔍' : '🏙️'}
            </button>
            <button
              type="button"
              className="task-tower__close"
              onClick={handleExit}
              aria-label="Exit"
            >
              ✕
            </button>
          </div>
        </div>

        {queuedActions.length > 0 && (
          <div className="task-tower__supply-line" aria-label={`${queuedActions.length} tasks waiting in the supply line`}>
            <span className="task-tower__supply-label">🏗️ Supply line</span>
            <div className="task-tower__supply-chips" aria-hidden="true">
              {queuedActions.slice(0, 3).map(action => (
                <span
                  key={action.id}
                  className={`task-tower__supply-chip task-tower__supply-chip--${action.category}`}
                  title={action.title}
                />
              ))}
              {queuedActions.length > 3 && (
                <span className="task-tower__supply-more">+{queuedActions.length - 3}</span>
              )}
            </div>
          </div>
        )}

        <div
          ref={stageRef}
          className={`task-tower__stage${stageShaking ? ' task-tower__stage--shake' : ''}${overviewMode ? ' task-tower__stage--overview' : ''}`}
        >
          <TaskTowerScene />

          <div className="task-tower__crane" aria-hidden="true">
            <div className="task-tower__crane-boom" />
            <div
              className={`task-tower__crane-trolley${selectedBlock ? ' task-tower__crane-trolley--engaged' : ''}`}
              style={{ left: `${craneTargetPercent}%` }}
            >
              <div className="task-tower__crane-cable" />
              <div className="task-tower__crane-hook" />
            </div>
          </div>

          {combo && (
            <div className="task-tower__combo" key={combo.expiresAt}>
              <span className="task-tower__combo-label">
                {combo.count >= 2 ? `Combo ×${getComboMultiplier(combo.count)}` : 'Combo ready'}
              </span>
              <span className="task-tower__combo-bar">
                <span
                  className="task-tower__combo-fill"
                  style={{ animationDuration: `${TASK_TOWER_COMBO.WINDOW_MS}ms` }}
                />
              </span>
            </div>
          )}

          <div className="task-tower__game-area" ref={gameAreaRef}>
            <div
              className="task-tower__grid"
              style={{
                gridTemplateColumns: `repeat(${TOWER_GRID.COLS}, 1fr)`,
                gridTemplateRows: `repeat(${gridRows}, auto)`,
              }}
            >
              {gameSession.blocks.map(block => (
                <TaskTowerBlock
                  key={block.id}
                  block={block}
                  gridRows={gridRows}
                  projectColor={block.projectId ? projectColorById.get(block.projectId) : undefined}
                  onTap={handleBlockTap}
                  isSelected={selectedBlock?.id === block.id}
                  isLanding={landingBlockIds.has(block.id)}
                />
              ))}

              {storeyFlashRows.map(row => (
                <div
                  key={row}
                  className="task-tower__storey-flash"
                  style={{ gridRow: `${Math.max(1, gridRows - row)}` }}
                />
              ))}
            </div>
          </div>

          {floatingReward && (
            <div
              className="task-tower__floating-reward"
              key={floatingReward.id}
              style={{ left: `${floatingReward.x}%`, top: `${floatingReward.y}%` }}
            >
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
