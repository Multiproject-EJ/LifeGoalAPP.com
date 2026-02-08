/**
 * Lucky Roll Mini-Game Stub Component
 * 
 * Displays branded "Coming Soon" modal for unbuilt mini-games
 * Awards consolation tokens so players don't feel punished
 */

import { useEffect } from 'react';
import { HABIT_GAME_META } from '../../../types/habitGames';
import type { HabitGameId } from '../../../types/habitGames';
import { awardGameTokens } from '../../../services/gameRewards';

interface LuckyRollMiniGameStubProps {
  gameId: HabitGameId;
  userId: string;
  onClose: () => void;
}

export function LuckyRollMiniGameStub({ gameId, userId, onClose }: LuckyRollMiniGameStubProps) {
  const gameMeta = HABIT_GAME_META[gameId];
  
  // Award consolation tokens on mount
  useEffect(() => {
    awardGameTokens(userId, 2, 'lucky_roll', `Lucky Roll: ${gameMeta.label} coming soon consolation`);
  }, [userId, gameMeta.label]);
  
  return (
    <div className="lucky-roll-mini-game-stub">
      <div className="lucky-roll-mini-game-stub__backdrop" onClick={onClose} role="presentation" />
      
      <div 
        className="lucky-roll-mini-game-stub__container"
        style={{
          borderColor: gameMeta.colorAccent,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 2px ${gameMeta.colorAccent}40`,
        }}
      >
        <div className="lucky-roll-mini-game-stub__header">
          <span className="lucky-roll-mini-game-stub__emoji">{gameMeta.emoji}</span>
          <h2 className="lucky-roll-mini-game-stub__title">{gameMeta.label}</h2>
        </div>
        
        <div className="lucky-roll-mini-game-stub__content">
          <p className="lucky-roll-mini-game-stub__tagline">"{gameMeta.description}"</p>
          
          <p className="lucky-roll-mini-game-stub__message">
            This game is being built.<br />
            You'll be able to play it soon!
          </p>
          
          <div className="lucky-roll-mini-game-stub__emotion">
            <span className="lucky-roll-mini-game-stub__emotion-label">Emotion:</span>
            <span className="lucky-roll-mini-game-stub__emotion-value">{gameMeta.emotion}</span>
          </div>
          
          <div 
            className="lucky-roll-mini-game-stub__consolation"
            style={{ background: `${gameMeta.colorAccent}20` }}
          >
            <span className="lucky-roll-mini-game-stub__consolation-text">
              +2 🎟️ Game Tokens awarded!
            </span>
          </div>
        </div>
        
        <button
          type="button"
          className="lucky-roll-mini-game-stub__button"
          onClick={onClose}
          style={{
            background: `linear-gradient(135deg, ${gameMeta.colorAccent} 0%, ${gameMeta.colorAccent}dd 100%)`,
          }}
        >
          Back to Board
        </button>
      </div>
    </div>
  );
}
