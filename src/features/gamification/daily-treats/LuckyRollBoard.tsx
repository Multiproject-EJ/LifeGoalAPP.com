import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { generateDefaultBoard, loadState, saveState, rollDice, moveToken, resetDailyCounters } from './luckyRollState';
import { LuckyRollDiceShop } from './LuckyRollDiceShop';
import { loadCurrencyBalance, deductDice } from '../../../services/gameRewards';
import type { BoardTile, LuckyRollState } from './luckyRollTypes';
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
    
    // Deduct a die
    deductDice(userId, 1, 'Lucky Roll: dice roll');
    
    // Simulate dice tumble animation
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Roll the dice
    const roll = rollDice();
    const now = new Date().toISOString();
    
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
    
    // Animate movement tile by tile
    for (let step = 1; step <= roll; step++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setGameState(prev => {
        const intermediatePosition = (prev.currentPosition + 1) % board.length;
        return { ...prev, currentPosition: intermediatePosition };
      });
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
    
    // Check for lap completion
    if (newState.currentLap > oldLap) {
      setCelebrationLap(newState.currentLap);
      setShowLapCelebration(true);
      
      // Play lap celebration sound (placeholder)
      // playLapCelebration();
      
      setTimeout(() => {
        setShowLapCelebration(false);
      }, 2300); // 400ms fade in + 1500ms hold + 400ms fade out
    }
    
    scrollToToken();
    setIsMoving(false);
    
    // Hide landed tile effect after delay
    setTimeout(() => {
      setLandedTile(null);
    }, 1500);
    
  }, [isRolling, isMoving, gameState, userId, board, scrollToToken]);
  
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
            Coins: {currencyBalance.gameTokens} 🪙
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
        {landedTile && (
          <div className="lucky-roll-landed-effect">
            <span className="lucky-roll-landed-effect__emoji">{landedTile.emoji}</span>
            <span className="lucky-roll-landed-effect__label">{landedTile.label}</span>
            {landedTile.type === 'mini_game' && (
              <span className="lucky-roll-landed-effect__subtitle">Coming Soon</span>
            )}
          </div>
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
    </div>
  );
}
