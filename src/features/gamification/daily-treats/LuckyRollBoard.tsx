import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { generateDefaultBoard, loadState, saveState, rollDice, moveToken, resetDailyCounters } from './luckyRollState';
import { LuckyRollDiceShop } from './LuckyRollDiceShop';
import { loadCurrencyBalance, deductDice } from '../../../services/gameRewards';
import { resolveTileEffect, getGoldBalance, type TileEffectResult } from './luckyRollTileEffects';
import { LuckyRollMiniGameStub } from './LuckyRollMiniGameStub';
import { TaskTower } from '../games/task-tower/TaskTower';
import { LuckyRollCelebration } from './LuckyRollCelebration';
import type { BoardTile, LuckyRollState } from './luckyRollTypes';
import * as sounds from './luckyRollSounds';
import './luckyRollBoard.css';

interface LuckyRollBoardProps {
  session: Session;
  onClose: () => void;
}

export function LuckyRollBoard({ session, onClose }: LuckyRollBoardProps) {
  const userId = session.user.id;
  const [board] = useState<BoardTile[]>(() => generateDefaultBoard());
  const [gameState, setGameState] = useState<LuckyRollState>(() => {
    const loaded = loadState(userId);
    return resetDailyCounters(loaded);
  });
  const [isRolling, setIsRolling] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [showDiceShop, setShowDiceShop] = useState(false);
  const [landedTile, setLandedTile] = useState<BoardTile | null>(null);
  const [showLapCelebration, setShowLapCelebration] = useState(false);
  const [celebrationLap, setCelebrationLap] = useState(0);
  
  // Phase 2 additions
  const [tileEffect, setTileEffect] = useState<TileEffectResult | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showMiniGameStub, setShowMiniGameStub] = useState<string | null>(null);
  const [showTaskTower, setShowTaskTower] = useState(false);
  const [nearMissTiles, setNearMissTiles] = useState<number[]>([]);
  const [consecutivePositives, setConsecutivePositives] = useState(0);
  const [goldBalance, setGoldBalance] = useState(() => getGoldBalance(userId));
  const [mysteryRevealed, setMysteryRevealed] = useState(false);
  
  const boardRef = useRef<HTMLDivElement>(null);
  
  // Load currency balance from gameRewards
  const currencyBalance = useMemo(() => loadCurrencyBalance(userId), [userId]);
  
  // Sync available dice with currency balance
  useEffect(() => {
    if (gameState.availableDice !== currencyBalance.dice) {
      const updated = { ...gameState, availableDice: currencyBalance.dice };
      setGameState(updated);
      saveState(userId, updated);
    }
  }, [currencyBalance.dice, gameState, userId]);
  
  // Save state whenever it changes
  useEffect(() => {
    saveState(userId, gameState);
  }, [userId, gameState]);
  
  // Scroll to keep token visible
  const scrollToToken = useCallback(() => {
    if (boardRef.current) {
      const tokenElement = boardRef.current.querySelector('.lucky-roll-tile--current');
      if (tokenElement) {
        tokenElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, []);
  
  const handleRoll = useCallback(async () => {
    if (isRolling || isMoving || gameState.availableDice === 0) return;
    
    setIsRolling(true);
    setLandedTile(null);
    setTileEffect(null);
    setNearMissTiles([]);
    setMysteryRevealed(false);
    
    // Deduct a die
    deductDice(userId, 1, 'Lucky Roll: dice roll');
    
    // Play dice roll sound
    sounds.playDiceRoll();
    
    // Simulate dice tumble animation
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Roll the dice
    const roll = rollDice();
    const now = new Date().toISOString();
    
    sounds.playDiceSettle();
    
    setGameState(prev => ({
      ...prev,
      lastRoll: roll,
      lastRollTimestamp: now,
      totalRolls: prev.totalRolls + 1,
      rollsToday: prev.rollsToday + 1
    }));
    
    setIsRolling(false);
    
    // Brief pause before moving
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Move the token
    setIsMoving(true);
    
    const oldLap = gameState.currentLap;
    const newState = moveToken(gameState, roll, board.length);
    const detectedNearMisses: number[] = [];
    
    // Animate movement tile by tile with near-miss detection
    for (let step = 1; step <= roll; step++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      sounds.playTokenMove();
      
      setGameState(prev => {
        const intermediatePosition = (prev.currentPosition + 1) % board.length;
        
        // Near-miss detection: check tiles adjacent to current position
        const adjacentIndices = [
          (intermediatePosition - 1 + board.length) % board.length,
          (intermediatePosition + 1) % board.length,
        ];
        
        for (const adjacentIdx of adjacentIndices) {
          const adjacentTile = board[adjacentIdx];
          // Only trigger near-miss if we're NOT landing on it and it's a jackpot or mini-game
          if (
            adjacentIdx !== newState.currentPosition &&
            (adjacentTile.type === 'jackpot' || adjacentTile.type === 'mini_game') &&
            !detectedNearMisses.includes(adjacentIdx)
          ) {
            detectedNearMisses.push(adjacentIdx);
            sounds.playNearMiss();
          }
        }
        
        return { ...prev, currentPosition: intermediatePosition };
      });
    }
    
    // Update near-miss tiles for visual effect
    if (detectedNearMisses.length > 0) {
      setNearMissTiles(detectedNearMisses);
      
      // Clear near-miss glow after animation
      setTimeout(() => {
        setNearMissTiles([]);
      }, 600);
    }
    
    // Update final state
    setGameState(prev => ({
      ...newState,
      availableDice: prev.availableDice - 1,
      lastRoll: roll,
      lastRollTimestamp: now,
      totalRolls: prev.totalRolls + 1,
      rollsToday: prev.rollsToday + 1
    }));
    
    // Show tile landing effect
    const finalTile = board[newState.currentPosition];
    setLandedTile(finalTile);
    
    // Resolve tile effect
    const effect = resolveTileEffect(finalTile, userId);
    setTileEffect(effect);
    
    // Update gold balance display
    setGoldBalance(getGoldBalance(userId));
    
    // Update streak tracking
    const isPositive = ['gain_coins', 'bonus_dice', 'game_token', 'jackpot'].includes(effect.type);
    const isNegativeOrNeutral = ['lose_coins', 'neutral'].includes(effect.type);
    
    if (isPositive) {
      setConsecutivePositives(prev => prev + 1);
    } else if (isNegativeOrNeutral) {
      setConsecutivePositives(0);
    }
    
    // Play tile landing sound
    if (isPositive) {
      sounds.playTileLandPositive();
    } else if (effect.type === 'lose_coins') {
      sounds.playTileLandNegative();
    } else {
      sounds.playTileLandNeutral();
    }
    
    // Check for lap completion
    if (newState.currentLap > oldLap) {
      setCelebrationLap(newState.currentLap);
      setShowLapCelebration(true);
      
      sounds.playLapCelebration();
      
      setTimeout(() => {
        setShowLapCelebration(false);
      }, 2300); // 400ms fade in + 1500ms hold + 400ms fade out
    }
    
    scrollToToken();
    setIsMoving(false);
    
    // Handle mystery tile reveal delay
    if (finalTile.type === 'mystery') {
      sounds.playMysteryReveal();
      
      // Show mystery emoji first for 400ms
      setTimeout(() => {
        setMysteryRevealed(true);
      }, 400);
    }
    
    // Show celebration if appropriate
    if (effect.celebrationType !== 'none') {
      const celebrationDelay = finalTile.type === 'mystery' ? 400 : 0; // Delay for mystery tiles
      
      setTimeout(() => {
        // Check for streak milestone (5+ consecutive positives)
        if (consecutivePositives >= 4 && isPositive) {
          // Show streak badge
          setShowCelebration(true);
          sounds.playStreakActive();
          
          setTimeout(() => {
            setShowCelebration(false);
          }, 1200);
        } else {
          // Show regular celebration
          setShowCelebration(true);
          
          if (effect.celebrationType === 'small') {
            sounds.playCelebrationSmall();
          } else if (effect.celebrationType === 'medium') {
            sounds.playCelebrationMedium();
          } else if (effect.celebrationType === 'big') {
            sounds.playCelebrationBig();
          }
        }
      }, celebrationDelay);
    }
    
    // Handle mini-game trigger
    if (effect.type === 'mini_game' && effect.miniGame) {
      sounds.playMiniGameTrigger();
      setTimeout(() => {
        if (effect.miniGame === 'task_tower') {
          setShowTaskTower(true);
        } else {
          setShowMiniGameStub(effect.miniGame);
        }
      }, 1200); // Show after landing effect
    }
    
    // Hide landed tile effect after delay
    setTimeout(() => {
      setLandedTile(null);
    }, 1500);
    
  }, [isRolling, isMoving, gameState, userId, board, scrollToToken, consecutivePositives]);
  
  const getTileClassName = (tile: BoardTile): string => {
    const classes = ['lucky-roll-tile'];
    
    classes.push(`lucky-roll-tile--${tile.type}`);
    
    if (tile.index === gameState.currentPosition) {
      classes.push('lucky-roll-tile--current');
    }
    
    if (gameState.tilesVisitedThisLap.includes(tile.index) && tile.index !== gameState.currentPosition) {
      classes.push('lucky-roll-tile--visited');
    }
    
    if (landedTile && tile.index === landedTile.index) {
      classes.push('lucky-roll-tile--landing');
    }
    
    // Near-miss glow effect
    if (nearMissTiles.includes(tile.index)) {
      if (tile.type === 'mini_game') {
        classes.push('lucky-roll-tile--near-miss-mini');
      } else {
        classes.push('lucky-roll-tile--near-miss');
      }
    }
    
    return classes.join(' ');
  };
  
  const renderBoard = () => {
    const rows: BoardTile[][] = [];
    
    // Create 6 rows of 5 tiles
    for (let row = 0; row < 6; row++) {
      const rowTiles = board.slice(row * 5, row * 5 + 5);
      
      // Reverse even rows for snake pattern
      if (row % 2 === 1) {
        rowTiles.reverse();
      }
      
      rows.push(rowTiles);
    }
    
    return rows.map((rowTiles, rowIndex) => (
      <div key={rowIndex} className="lucky-roll-board__row">
        {rowTiles.map(tile => (
          <div key={tile.index} className={getTileClassName(tile)}>
            <span className="lucky-roll-tile__emoji" aria-hidden="true">{tile.emoji}</span>
            <span className="lucky-roll-tile__index">{tile.index + 1}</span>
            {tile.index === gameState.currentPosition && (
              <span className="lucky-roll-token" aria-label="Your position">🟠</span>
            )}
          </div>
        ))}
      </div>
    ));
  };
  
  const isMilestone = gameState.currentLap % 5 === 0;
  
  if (showDiceShop) {
    return (
      <LuckyRollDiceShop
        session={session}
        onClose={() => setShowDiceShop(false)}
        onBack={() => setShowDiceShop(false)}
      />
    );
  }
  
  return (
    <div className="lucky-roll-board" role="dialog" aria-modal="true" aria-label="Lucky Roll Board Game">
      <div className="lucky-roll-board__backdrop" onClick={onClose} role="presentation" />
      
      <div className="lucky-roll-board__container">
        {/* Header */}
        <div className="lucky-roll-board__header">
          <h2 className="lucky-roll-board__title">🎲 Lucky Roll</h2>
          <div className="lucky-roll-board__lap">Lap: {gameState.currentLap}</div>
          <button
            type="button"
            className="lucky-roll-board__close"
            onClick={onClose}
            aria-label="Close Lucky Roll"
          >
            ×
          </button>
        </div>
        
        {/* Status bar */}
        <div className="lucky-roll-board__status">
          <div className="lucky-roll-board__stat">
            Dice: {gameState.availableDice} 🎲
          </div>
          <div className="lucky-roll-board__stat">
            Coins: {goldBalance} 🪙
          </div>
          <div className="lucky-roll-board__stat">
            Tokens: {currencyBalance.gameTokens} 🎟️
          </div>
        </div>
        
        {/* Board grid */}
        <div className="lucky-roll-board__grid" ref={boardRef}>
          {renderBoard()}
        </div>
        
        {/* Dice display */}
        <div className="lucky-roll-board__dice-area">
          <div className={`lucky-roll-dice ${isRolling ? 'lucky-roll-dice--rolling' : 'lucky-roll-dice--settled'}`}>
            {isRolling ? '🎲' : gameState.lastRoll > 0 ? `🎲 ${gameState.lastRoll}` : '🎲'}
          </div>
        </div>
        
        {/* Landed tile effect */}
        {landedTile && tileEffect && (
          <div className="lucky-roll-landed-effect">
            <span className="lucky-roll-landed-effect__emoji">{landedTile.emoji}</span>
            <span className="lucky-roll-landed-effect__label">
              {landedTile.type === 'mystery' && !mysteryRevealed ? '❓ Mystery...' : tileEffect.message}
            </span>
            {landedTile.type === 'mini_game' && (
              <span className="lucky-roll-landed-effect__subtitle">Coming Soon</span>
            )}
          </div>
        )}
        
        {/* Celebration overlay */}
        {showCelebration && tileEffect && (
          <LuckyRollCelebration
            type={
              consecutivePositives >= 5 && ['gain_coins', 'bonus_dice', 'game_token', 'jackpot'].includes(tileEffect.type)
                ? 'streak'
                : tileEffect.celebrationType
            }
            message={
              consecutivePositives >= 5 && ['gain_coins', 'bonus_dice', 'game_token', 'jackpot'].includes(tileEffect.type)
                ? `🔥 Hot Streak! ${consecutivePositives} wins!`
                : tileEffect.message
            }
            emoji={landedTile?.emoji}
            onComplete={() => setShowCelebration(false)}
          />
        )}
        
        {/* Actions */}
        <div className="lucky-roll-board__actions">
          <button
            type="button"
            className="lucky-roll-board__roll-button"
            onClick={handleRoll}
            disabled={gameState.availableDice === 0 || isRolling || isMoving}
          >
            {gameState.availableDice === 0 ? 'No Dice - Visit Shop!' : isRolling ? 'Rolling...' : isMoving ? 'Moving...' : 'ROLL THE DICE'}
          </button>
          
          <button
            type="button"
            className="lucky-roll-board__shop-button"
            onClick={() => setShowDiceShop(true)}
          >
            🛒 Dice Shop
          </button>
        </div>
        
        {/* Lap celebration overlay */}
        {showLapCelebration && (
          <div className="lucky-roll-lap-celebration">
            <div className="lucky-roll-lap-celebration__content">
              <span className="lucky-roll-lap-celebration__icon">
                {isMilestone ? '🏆' : '🎉'}
              </span>
              <h3 className="lucky-roll-lap-celebration__title">
                {isMilestone ? `Lap ${celebrationLap} — Milestone!` : `Lap ${celebrationLap}!`}
              </h3>
              <p className="lucky-roll-lap-celebration__subtitle">
                {isMilestone ? 'Amazing progress!' : 'A new journey begins'}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Mini-game stub modal */}
      {showMiniGameStub && (
        <LuckyRollMiniGameStub
          gameId={showMiniGameStub as any}
          userId={userId}
          onClose={() => setShowMiniGameStub(null)}
        />
      )}
      
      {/* Task Tower mini-game */}
      {showTaskTower && (
        <TaskTower
          session={session}
          onClose={() => {
            setShowTaskTower(false);
            // Refresh currency balance
            setGoldBalance(getGoldBalance(userId));
          }}
          onComplete={(rewards) => {
            setShowTaskTower(false);
            // Rewards are already delivered by TaskTower
            // Just refresh currency balance display
            setGoldBalance(getGoldBalance(userId));
          }}
        />
      )}
    </div>
  );
}
