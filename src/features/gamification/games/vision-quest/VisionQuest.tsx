import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  generatePromptSelection,
  loadVisionQuestState,
  saveJournalEntry,
  calculateRewards,
  formatDate,
} from './visionQuestState';
import {
  MIN_REFLECTION_LENGTH,
  type ReflectionPrompt,
  type VisionQuestSession,
} from './visionQuestTypes';
import { awardGold } from '../../daily-treats/luckyRollTileEffects';
import { awardDice, awardGameTokens, logGameSession } from '../../../../services/gameRewards';
import { LuckyRollCelebration } from '../../daily-treats/LuckyRollCelebration';
import './visionQuest.css';

// Sound stubs (no-op implementations)
const playButtonClick = () => {}; // Sound when clicking buttons
const playReflectionComplete = () => {}; // Sound when reflection is saved

interface VisionQuestProps {
  session: Session;
  onClose: () => void;
  onComplete: (rewards: { coins: number; dice: number; tokens: number }) => void;
}

export function VisionQuest({ session, onClose, onComplete }: VisionQuestProps) {
  const userId = session.user.id;
  
  const [gameSession, setGameSession] = useState<VisionQuestSession>({
    selectedPrompt: null,
    reflectionText: '',
    isComplete: false,
    rewards: {
      coins: 0,
      dice: 0,
      tokens: 0,
    },
  });
  
  const [availablePrompts] = useState<ReflectionPrompt[]>(() => generatePromptSelection());
  const [showCelebration, setShowCelebration] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [savedTimestamp, setSavedTimestamp] = useState<string>('');
  
  // Log game session entry
  useEffect(() => {
    logGameSession(userId, {
      gameId: 'vision_quest',
      action: 'enter',
      timestamp: new Date().toISOString(),
      metadata: {},
    });
  }, [userId]);
  
  const handlePromptSelect = useCallback((prompt: ReflectionPrompt) => {
    playButtonClick();
    setGameSession((prev) => ({
      ...prev,
      selectedPrompt: prompt,
    }));
  }, []);
  
  const handleReflectionChange = useCallback((text: string) => {
    setGameSession((prev) => ({
      ...prev,
      reflectionText: text,
    }));
  }, []);
  
  const handleSubmit = useCallback(() => {
    if (!gameSession.selectedPrompt || gameSession.reflectionText.length < MIN_REFLECTION_LENGTH) {
      return;
    }
    
    playButtonClick();
    
    // Load current state
    const state = loadVisionQuestState(userId);
    
    // Calculate rewards
    const rewards = calculateRewards(gameSession.reflectionText.length, state);
    
    // Save journal entry
    const newState = saveJournalEntry(
      userId,
      gameSession.selectedPrompt.prompt,
      gameSession.reflectionText,
      gameSession.selectedPrompt.zone,
      state
    );
    
    // Award rewards
    if (rewards.coins > 0) {
      awardGold(
        userId,
        rewards.coins,
        `Vision Quest: Reflection on ${gameSession.selectedPrompt.zone}`
      );
    }
    if (rewards.dice > 0) {
      awardDice(
        userId,
        rewards.dice,
        'vision_quest',
        `Vision Quest: Reflection on ${gameSession.selectedPrompt.zone}`
      );
    }
    if (rewards.tokens > 0) {
      awardGameTokens(
        userId,
        rewards.tokens,
        'vision_quest',
        `Vision Quest: Reflection on ${gameSession.selectedPrompt.zone}`
      );
    }
    
    // Log completion
    logGameSession(userId, {
      gameId: 'vision_quest',
      action: 'complete',
      timestamp: new Date().toISOString(),
      metadata: {
        zone: gameSession.selectedPrompt.zone,
        reflectionLength: gameSession.reflectionText.length,
        streak: newState.currentStreak,
        rewards,
      },
    });
    
    playReflectionComplete();
    
    setSavedTimestamp(newState.lastReflectionDate || new Date().toISOString());
    
    setGameSession((prev) => ({
      ...prev,
      isComplete: true,
      rewards,
    }));
    
    setShowConfirmation(true);
    
    // Show celebration after a brief delay
    setTimeout(() => {
      setShowCelebration(true);
    }, 800);
  }, [gameSession, userId]);
  
  const handleComplete = useCallback(() => {
    playButtonClick();
    
    setTimeout(() => {
      onComplete(gameSession.rewards);
      onClose();
    }, 500);
  }, [gameSession.rewards, onComplete, onClose]);
  
  const handleCancel = useCallback(() => {
    playButtonClick();
    
    // Log exit
    logGameSession(userId, {
      gameId: 'vision_quest',
      action: 'exit',
      timestamp: new Date().toISOString(),
      metadata: {
        promptSelected: !!gameSession.selectedPrompt,
        reflectionStarted: gameSession.reflectionText.length > 0,
      },
    });
    
    onClose();
  }, [userId, gameSession, onClose]);
  
  const characterCount = gameSession.reflectionText.length;
  const canSubmit = characterCount >= MIN_REFLECTION_LENGTH;
  
  return (
    <div className="vision-quest">
      <div 
        className="vision-quest__backdrop" 
        onClick={handleCancel}
        role="button"
        tabIndex={0}
        aria-label="Close Vision Quest"
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter') {
            handleCancel();
          }
        }}
      />
      <div className="vision-quest__container">
        <button className="vision-quest__close" onClick={handleCancel}>
          ×
        </button>
        
        {!gameSession.selectedPrompt && !gameSession.isComplete && (
          <>
            <div className="vision-quest__header">
              <h2 className="vision-quest__title">
                <span>🔮</span>
                <span>Vision Quest</span>
              </h2>
              <p className="vision-quest__subtitle">
                Reflect on who you want to become
              </p>
            </div>
            
            <div className="vision-quest__prompts">
              <p className="vision-quest__prompts-label">Choose a reflection prompt:</p>
              {availablePrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  className="vision-quest__prompt-button"
                  onClick={() => handlePromptSelect(prompt)}
                >
                  <span className="vision-quest__prompt-zone">{prompt.zone}</span>
                  <span className="vision-quest__prompt-text">{prompt.prompt}</span>
                </button>
              ))}
            </div>
          </>
        )}
        
        {gameSession.selectedPrompt && !gameSession.isComplete && (
          <>
            <div className="vision-quest__header">
              <h2 className="vision-quest__title">
                <span>🔮</span>
                <span>Your Reflection</span>
              </h2>
              <p className="vision-quest__subtitle">
                Take a moment to reflect deeply
              </p>
            </div>
            
            <div className="vision-quest__reflection">
              <div className="vision-quest__selected-prompt">
                <span className="vision-quest__selected-zone">
                  {gameSession.selectedPrompt.zone}
                </span>
                <p className="vision-quest__selected-text">
                  {gameSession.selectedPrompt.prompt}
                </p>
              </div>
              
              <textarea
                className="vision-quest__textarea"
                placeholder="Write your reflection here... (minimum 20 characters)"
                value={gameSession.reflectionText}
                onChange={(e) => handleReflectionChange(e.target.value)}
                autoFocus
              />
              
              <div className="vision-quest__character-count">
                <span className={characterCount >= MIN_REFLECTION_LENGTH ? 'vision-quest__character-count--valid' : ''}>
                  {characterCount} / {MIN_REFLECTION_LENGTH} characters
                </span>
                {characterCount >= 100 && (
                  <span className="vision-quest__bonus-indicator">✨ Long reflection bonus!</span>
                )}
              </div>
            </div>
            
            <div className="vision-quest__actions">
              <button
                className="vision-quest__button vision-quest__button--secondary"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                className={`vision-quest__button vision-quest__button--primary ${
                  !canSubmit ? 'vision-quest__button--disabled' : ''
                }`}
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                Save Reflection
              </button>
            </div>
          </>
        )}
        
        {gameSession.isComplete && showConfirmation && (
          <>
            <div className="vision-quest__completion">
              <h2 className="vision-quest__completion-title">Reflection Saved 🌟</h2>
              <p className="vision-quest__completion-subtitle">
                Your thoughts have been captured
              </p>
              
              <div className="vision-quest__saved-info">
                <p className="vision-quest__saved-date">
                  {formatDate(savedTimestamp)}
                </p>
                <p className="vision-quest__saved-preview">
                  "{gameSession.reflectionText.slice(0, 80)}
                  {gameSession.reflectionText.length > 80 ? '...' : ''}"
                </p>
              </div>
              
              <div className="vision-quest__rewards">
                <p className="vision-quest__rewards-title">Rewards Earned</p>
                <div className="vision-quest__rewards-list">
                  {gameSession.rewards.coins > 0 && (
                    <div className="vision-quest__reward-item">
                      <div className="vision-quest__reward-value">
                        🪙 {gameSession.rewards.coins}
                      </div>
                      <div className="vision-quest__reward-label">Coins</div>
                    </div>
                  )}
                  {gameSession.rewards.dice > 0 && (
                    <div className="vision-quest__reward-item">
                      <div className="vision-quest__reward-value">
                        🎲 {gameSession.rewards.dice}
                      </div>
                      <div className="vision-quest__reward-label">Dice</div>
                    </div>
                  )}
                  {gameSession.rewards.tokens > 0 && (
                    <div className="vision-quest__reward-item">
                      <div className="vision-quest__reward-value">
                        🎟️ {gameSession.rewards.tokens}
                      </div>
                      <div className="vision-quest__reward-label">Tokens</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="vision-quest__actions">
              <button
                className="vision-quest__button vision-quest__button--primary"
                onClick={handleComplete}
              >
                Continue
              </button>
            </div>
          </>
        )}
        
        {showCelebration && (
          <LuckyRollCelebration
            type="big"
            message="Reflection Complete!"
            emoji="🔮"
            onComplete={() => setShowCelebration(false)}
          />
        )}
      </div>
    </div>
  );
}
