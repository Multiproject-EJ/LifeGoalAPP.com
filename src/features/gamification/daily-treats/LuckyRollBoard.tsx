import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { generateDefaultBoard, loadState, moveToken, resetDailyCounters, rollDice, saveState } from './luckyRollState';
import { LuckyRollDiceShop } from './LuckyRollDiceShop';
import { deductDice, loadCurrencyBalance } from '../../../services/gameRewards';
import { getGoldBalance, resolveTileEffect, type TileEffectResult } from './luckyRollTileEffects';
import { LuckyRollCelebration } from './LuckyRollCelebration';
import type { BoardTile, LuckyRollState } from './luckyRollTypes';
import * as sounds from './luckyRollSounds';
import { triggerCompletionHaptic } from '../../../utils/completionHaptics';
import { consumeLuckyRollAccess } from '../../../services/luckyRollAccess';
import './luckyRollBoard.css';

interface LuckyRollBoardProps {
  session: Session;
  onClose: () => void;
}

export function LuckyRollBoard({ session, onClose }: LuckyRollBoardProps) {
  const userId = session.user.id;
  const [board] = useState<BoardTile[]>(() => generateDefaultBoard());
  const [gameState, setGameState] = useState<LuckyRollState>(() => resetDailyCounters(loadState(userId)));
  const [isRolling, setIsRolling] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [showDiceShop, setShowDiceShop] = useState(false);
  const [landedTile, setLandedTile] = useState<BoardTile | null>(null);
  const [tileEffect, setTileEffect] = useState<TileEffectResult | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [nearMissTiles, setNearMissTiles] = useState<number[]>([]);
  const [goldBalance, setGoldBalance] = useState(() => getGoldBalance(userId));
  const [mysteryRevealed, setMysteryRevealed] = useState(false);
  const [sessionAccessConsumed, setSessionAccessConsumed] = useState(false);
  const [currencyBalance, setCurrencyBalance] = useState(() => loadCurrencyBalance(userId));
  const boardRef = useRef<HTMLDivElement>(null);

  const refreshCurrencyBalance = useCallback(() => {
    setCurrencyBalance(loadCurrencyBalance(userId));
    setGoldBalance(getGoldBalance(userId));
  }, [userId]);

  useEffect(() => {
    if (gameState.availableDice !== currencyBalance.dice) {
      const updated = { ...gameState, availableDice: currencyBalance.dice };
      setGameState(updated);
      saveState(userId, updated);
    }
  }, [currencyBalance.dice, gameState, userId]);

  useEffect(() => {
    saveState(userId, gameState);
  }, [gameState, userId]);

  const scrollToToken = useCallback(() => {
    if (!boardRef.current) return;
    const tokenElement = boardRef.current.querySelector('.lucky-roll-tile--current');
    if (tokenElement) {
      tokenElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const distanceToFinish = Math.max(0, board.length - 1 - gameState.currentPosition);
  const progressPercent = Math.round((gameState.currentPosition / (board.length - 1)) * 100);

  const applyMovementDelta = useCallback((movementDelta: number) => {
    if (!movementDelta) return;

    setGameState((prev) => {
      const finalPosition = Math.min(board.length - 1, Math.max(0, prev.currentPosition + movementDelta));
      const nextVisited = prev.tilesVisitedThisRun.includes(finalPosition)
        ? prev.tilesVisitedThisRun
        : [...prev.tilesVisitedThisRun, finalPosition];
      return {
        ...prev,
        currentPosition: finalPosition,
        visitHistory: [...prev.visitHistory, finalPosition],
        tilesVisitedThisRun: nextVisited,
        sessionComplete: finalPosition >= board.length - 1,
      };
    });
  }, [board.length]);

  const handleRoll = useCallback(async () => {
    if (isRolling || isMoving || gameState.availableDice === 0 || gameState.sessionComplete) return;

    if (!sessionAccessConsumed) {
      const accessConsumption = consumeLuckyRollAccess(userId);
      if (!accessConsumption.success) return;
      setSessionAccessConsumed(true);
    }

    setIsRolling(true);
    setLandedTile(null);
    setTileEffect(null);
    setNearMissTiles([]);
    setMysteryRevealed(false);

    deductDice(userId, 1, 'Lucky Roll: reward-board roll');
    sounds.playDiceRoll();
    await new Promise((resolve) => setTimeout(resolve, 800));

    const roll = rollDice();
    const now = new Date().toISOString();
    sounds.playDiceSettle();

    setIsRolling(false);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setIsMoving(true);

    const newState = moveToken(gameState, roll, board.length);
    const detectedNearMisses: number[] = [];

    for (let step = 1; step <= roll; step++) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      sounds.playTokenMove();

      setGameState((prev) => {
        const intermediatePosition = Math.min(board.length - 1, prev.currentPosition + 1);
        const adjacentIndices = [
          Math.max(0, intermediatePosition - 1),
          Math.min(board.length - 1, intermediatePosition + 1),
        ];

        for (const adjacentIdx of adjacentIndices) {
          const adjacentTile = board[adjacentIdx];
          if (
            adjacentIdx !== newState.currentPosition &&
            (adjacentTile.type === 'jackpot' || adjacentTile.type === 'finish') &&
            !detectedNearMisses.includes(adjacentIdx)
          ) {
            detectedNearMisses.push(adjacentIdx);
            sounds.playNearMiss();
          }
        }

        return { ...prev, currentPosition: intermediatePosition };
      });
    }

    if (detectedNearMisses.length > 0) {
      setNearMissTiles(detectedNearMisses);
      setTimeout(() => setNearMissTiles([]), 600);
    }

    setGameState((prev) => ({
      ...newState,
      availableDice: prev.availableDice - 1,
      lastRoll: roll,
      lastRollTimestamp: now,
      totalRolls: prev.totalRolls + 1,
      rollsToday: prev.rollsToday + 1,
    }));

    const finalTile = board[newState.currentPosition];
    const effect = resolveTileEffect(finalTile, userId);

    setLandedTile(finalTile);
    setTileEffect(effect);
    refreshCurrencyBalance();

    if (effect.type === 'mystery') {
      sounds.playMysteryReveal();
      setTimeout(() => setMysteryRevealed(true), 400);
    }

    const isPositive = ['gain_coins', 'bonus_dice', 'game_token', 'jackpot', 'boost_step', 'finish'].includes(effect.type);
    if (isPositive) {
      sounds.playTileLandPositive();
    } else if (effect.type === 'lose_coins' || effect.type === 'slow_zone') {
      sounds.playTileLandNegative();
    } else {
      sounds.playTileLandNeutral();
    }

    const celebrationDelay = finalTile.type === 'mystery' ? 400 : 0;
    if (effect.celebrationType !== 'none') {
      setTimeout(() => {
        if (effect.celebrationType === 'medium' || effect.celebrationType === 'big') {
          triggerCompletionHaptic('light', { channel: 'gamification', minIntervalMs: 2600 });
        }
        if (effect.type === 'finish') {
          triggerCompletionHaptic('strong', { channel: 'gamification', minIntervalMs: 3200 });
        }
        setShowCelebration(true);
        if (effect.celebrationType === 'small') sounds.playCelebrationSmall();
        if (effect.celebrationType === 'medium') sounds.playCelebrationMedium();
        if (effect.celebrationType === 'big') sounds.playCelebrationBig();
      }, celebrationDelay);
    }

    if (effect.movementDelta) {
      const movementDelay = finalTile.type === 'mystery' ? 700 : 350;
      setTimeout(() => {
        applyMovementDelta(effect.movementDelta ?? 0);
        refreshCurrencyBalance();
        scrollToToken();
      }, movementDelay);
    }

    scrollToToken();
    setIsMoving(false);
    setTimeout(() => setLandedTile(null), 1800);
  }, [
    applyMovementDelta,
    board,
    gameState,
    isMoving,
    isRolling,
    refreshCurrencyBalance,
    scrollToToken,
    sessionAccessConsumed,
    userId,
  ]);

  const getTileClassName = (tile: BoardTile): string => {
    const classes = ['lucky-roll-tile'];
    classes.push(`lucky-roll-tile--${tile.type}`);

    if (tile.index === gameState.currentPosition) classes.push('lucky-roll-tile--current');
    if (gameState.tilesVisitedThisRun.includes(tile.index) && tile.index !== gameState.currentPosition) {
      classes.push('lucky-roll-tile--visited');
    }
    if (landedTile && tile.index === landedTile.index) classes.push('lucky-roll-tile--landing');
    if (nearMissTiles.includes(tile.index)) {
      classes.push('lucky-roll-tile--near-miss');
    }
    if (tile.type === 'finish') classes.push('lucky-roll-tile--near-miss-mini');

    return classes.join(' ');
  };

  const renderBoard = () => {
    const rows: BoardTile[][] = [];
    for (let row = 0; row < 6; row++) {
      const rowTiles = board.slice(row * 5, row * 5 + 5);
      if (row % 2 === 1) rowTiles.reverse();
      rows.push(rowTiles);
    }

    return rows.map((rowTiles, rowIndex) => (
      <div key={rowIndex} className="lucky-roll-board__row">
        {rowTiles.map((tile) => (
          <div key={tile.index} className={getTileClassName(tile)}>
            <span className="lucky-roll-tile__emoji" aria-hidden="true">{tile.emoji}</span>
            <span className="lucky-roll-tile__index">{tile.index + 1}</span>
            {tile.index === gameState.currentPosition ? (
              <span className="lucky-roll-token" aria-label="Your position">🟠</span>
            ) : null}
          </div>
        ))}
      </div>
    ));
  };

  const finishStateLabel = useMemo(() => {
    if (gameState.sessionComplete) return 'Finish chest claimed';
    if (distanceToFinish === 0) return 'Finish ready';
    return `${distanceToFinish} tiles to finish`;
  }, [distanceToFinish, gameState.sessionComplete]);

  if (showDiceShop) {
    return (
      <LuckyRollDiceShop
        session={session}
        onClose={() => setShowDiceShop(false)}
        onBack={() => {
          setShowDiceShop(false);
          refreshCurrencyBalance();
        }}
      />
    );
  }

  return (
    <div className="lucky-roll-board" role="dialog" aria-modal="true" aria-label="Lucky Roll Reward Board">
      <div className="lucky-roll-board__backdrop" onClick={onClose} role="presentation" />

      <div className="lucky-roll-board__container">
        <div className="lucky-roll-board__header">
          <h2 className="lucky-roll-board__title">🎲 Lucky Roll Reward Run</h2>
          <div className="lucky-roll-board__lap">{finishStateLabel}</div>
          <button type="button" className="lucky-roll-board__close" onClick={onClose} aria-label="Close Lucky Roll">
            ×
          </button>
        </div>

        <div className="lucky-roll-board__status">
          <div className="lucky-roll-board__stat">Rolls: {gameState.availableDice} 🎲</div>
          <div className="lucky-roll-board__stat">Coins: {goldBalance} 🪙</div>
          <div className="lucky-roll-board__stat">Tokens: {currencyBalance.gameTokens} 🎟️</div>
        </div>

        <div className="lucky-roll-board__status" style={{ marginTop: -8 }}>
          <div className="lucky-roll-board__stat">Progress: {progressPercent}%</div>
          <div className="lucky-roll-board__stat">Position: {gameState.currentPosition + 1}/30</div>
          <div className="lucky-roll-board__stat">Finish: Tile 30 🏁</div>
        </div>

        <div className="lucky-roll-board__grid" ref={boardRef}>
          {renderBoard()}
        </div>

        <div className="lucky-roll-board__dice-area">
          <div className={`lucky-roll-dice ${isRolling ? 'lucky-roll-dice--rolling' : 'lucky-roll-dice--settled'}`}>
            {isRolling ? '🎲' : gameState.lastRoll > 0 ? `🎲 ${gameState.lastRoll}` : '🎲'}
          </div>
        </div>

        {landedTile && tileEffect ? (
          <div className="lucky-roll-landed-effect">
            <span className="lucky-roll-landed-effect__emoji">{landedTile.emoji}</span>
            <span className="lucky-roll-landed-effect__label">
              {landedTile.type === 'mystery' && !mysteryRevealed ? '❓ Mystery...' : tileEffect.message}
            </span>
          </div>
        ) : null}

        {showCelebration && tileEffect ? (
          <LuckyRollCelebration
            type={tileEffect.celebrationType}
            message={tileEffect.message}
            emoji={landedTile?.emoji}
            onComplete={() => setShowCelebration(false)}
          />
        ) : null}

        <div className="lucky-roll-board__actions">
          <button
            type="button"
            className="lucky-roll-board__roll-button"
            onClick={handleRoll}
            disabled={gameState.availableDice === 0 || isRolling || isMoving || gameState.sessionComplete}
          >
            {gameState.sessionComplete
              ? 'FINISH CLAIMED'
              : gameState.availableDice === 0
                ? 'No Rolls - Visit Shop!'
                : isRolling
                  ? 'Rolling...'
                  : isMoving
                    ? 'Moving...'
                    : 'ROLL TO THE FINISH'}
          </button>

          <button
            type="button"
            className="lucky-roll-board__shop-button"
            onClick={() => setShowDiceShop(true)}
          >
            🛒 Dice Shop
          </button>
        </div>
      </div>
    </div>
  );
}
