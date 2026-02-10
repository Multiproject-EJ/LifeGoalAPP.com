import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  calculateRewards,
  getCompletionPercentage,
  formatTimeRemaining,
  getTotalSeconds,
} from './pomodoroSprintState';
import {
  POMODORO_SPRINT_REWARDS,
  type PomodoroSprintDuration,
  type PomodoroSprintSession,
} from './pomodoroSprintTypes';
import { awardGold } from '../../daily-treats/luckyRollTileEffects';
import { awardDice, awardGameTokens, logGameSession } from '../../../../services/gameRewards';
import { LuckyRollCelebration } from '../../daily-treats/LuckyRollCelebration';
import { playTone, playChime } from '../../../../utils/audioUtils';
import './pomodoroSprint.css';

// Sound implementations
const playTimerStart = () => {
  playChime([400, 500, 600], 80, 0.15, 0.25);
};

const playTimerComplete = () => {
  // Satisfying completion chime
  playChime([523, 659, 784, 1047], 100, 0.3, 0.3);
};

const playButtonClick = () => {
  playTone(600, 0.05, 'square', 0.2);
};

interface PomodoroSprintProps {
  session: Session;
  onClose: () => void;
  onComplete: (rewards: { coins: number; dice: number; tokens: number }) => void;
}

export function PomodoroSprint({ session, onClose, onComplete }: PomodoroSprintProps) {
  const userId = session.user.id;
  
  const [gameSession, setGameSession] = useState<PomodoroSprintSession>({
    duration: 25,
    startTime: null,
    elapsedSeconds: 0,
    isRunning: false,
    isComplete: false,
    rewards: {
      coins: 0,
      dice: 0,
      tokens: 0,
    },
  });

  const [selectedDuration, setSelectedDuration] = useState<PomodoroSprintDuration>(25);
  const [showCelebration, setShowCelebration] = useState(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Log game session entry
  useEffect(() => {
    logGameSession(userId, {
      gameId: 'pomodoro_sprint',
      action: 'enter',
      timestamp: new Date().toISOString(),
      metadata: {},
    });

    return () => {
      // Cleanup timer on unmount
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [userId]);

  // Timer logic
  useEffect(() => {
    if (gameSession.isRunning && !gameSession.isComplete) {
      timerIntervalRef.current = setInterval(() => {
        setGameSession((prev) => {
          const newElapsedSeconds = prev.elapsedSeconds + 1;
          const totalSeconds = getTotalSeconds(prev.duration);

          // Check if timer is complete
          if (newElapsedSeconds >= totalSeconds) {
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }

            // Calculate rewards
            const rewards = calculateRewards(prev.duration, newElapsedSeconds);

            // Award rewards
            if (rewards.coins > 0) {
              awardGold(
                userId,
                rewards.coins,
                'pomodoro_sprint',
                `Pomodoro Sprint: Completed ${prev.duration}-minute session`
              );
            }
            if (rewards.dice > 0) {
              awardDice(
                userId,
                rewards.dice,
                'pomodoro_sprint',
                `Pomodoro Sprint: Completed ${prev.duration}-minute session`
              );
            }
            if (rewards.tokens > 0) {
              awardGameTokens(
                userId,
                rewards.tokens,
                'pomodoro_sprint',
                `Pomodoro Sprint: Completed ${prev.duration}-minute session`
              );
            }

            // Log completion
            logGameSession(userId, {
              gameId: 'pomodoro_sprint',
              action: 'complete',
              timestamp: new Date().toISOString(),
              metadata: {
                duration: prev.duration,
                rewards,
              },
            });

            playTimerComplete();

            return {
              ...prev,
              elapsedSeconds: newElapsedSeconds,
              isRunning: false,
              isComplete: true,
              rewards,
            };
          }

          return {
            ...prev,
            elapsedSeconds: newElapsedSeconds,
          };
        });
      }, 1000);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    }
  }, [gameSession.isRunning, gameSession.isComplete, userId]);

  const handleDurationSelect = useCallback((duration: PomodoroSprintDuration) => {
    playButtonClick();
    setSelectedDuration(duration);
    setGameSession((prev) => ({
      ...prev,
      duration,
    }));
  }, []);

  const handleStart = useCallback(() => {
    playTimerStart();
    playButtonClick();
    setGameSession((prev) => ({
      ...prev,
      startTime: new Date().toISOString(),
      isRunning: true,
    }));
  }, []);

  const handleCancel = useCallback(() => {
    playButtonClick();

    // Calculate rewards for early exit
    const rewards = calculateRewards(gameSession.duration, gameSession.elapsedSeconds);

    // Award rewards if any
    if (rewards.coins > 0) {
      awardGold(
        userId,
        rewards.coins,
        'pomodoro_sprint',
        `Pomodoro Sprint: Early exit from ${gameSession.duration}-minute session`
      );
    }
    if (rewards.dice > 0) {
      awardDice(
        userId,
        rewards.dice,
        'pomodoro_sprint',
        `Pomodoro Sprint: Early exit from ${gameSession.duration}-minute session`
      );
    }
    if (rewards.tokens > 0) {
      awardGameTokens(
        userId,
        rewards.tokens,
        'pomodoro_sprint',
        `Pomodoro Sprint: Early exit from ${gameSession.duration}-minute session`
      );
    }

    // Log exit
    logGameSession(userId, {
      gameId: 'pomodoro_sprint',
      action: 'exit',
      timestamp: new Date().toISOString(),
      metadata: {
        duration: gameSession.duration,
        elapsedSeconds: gameSession.elapsedSeconds,
        completionPercentage: getCompletionPercentage(
          gameSession.duration,
          gameSession.elapsedSeconds
        ),
        rewards,
      },
    });

    onComplete(rewards);
    onClose();
  }, [gameSession, userId, onComplete, onClose]);

  const handleComplete = useCallback(() => {
    playButtonClick();
    setShowCelebration(true);
    
    setTimeout(() => {
      onComplete(gameSession.rewards);
      onClose();
    }, 1500);
  }, [gameSession.rewards, onComplete, onClose]);

  const remainingSeconds = getTotalSeconds(gameSession.duration) - gameSession.elapsedSeconds;
  const completionPercentage = getCompletionPercentage(
    gameSession.duration,
    gameSession.elapsedSeconds
  );

  // Calculate circular progress
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (completionPercentage / 100) * circumference;

  return (
    <div className="pomodoro-sprint">
      <div 
        className="pomodoro-sprint__backdrop" 
        onClick={handleCancel}
        role="button"
        tabIndex={0}
        aria-label="Close Pomodoro Sprint"
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter') {
            handleCancel();
          }
        }}
      />
      <div className="pomodoro-sprint__container">
        <button className="pomodoro-sprint__close" onClick={handleCancel}>
          ×
        </button>

        {!gameSession.isRunning && !gameSession.isComplete && (
          <>
            <div className="pomodoro-sprint__header">
              <h2 className="pomodoro-sprint__title">
                <span>🍅</span>
                <span>Pomodoro Sprint</span>
              </h2>
              <p className="pomodoro-sprint__subtitle">
                Enter deep focus mode and earn rewards
              </p>
            </div>

            <div className="pomodoro-sprint__duration-selector">
              {([5, 10, 15, 25] as PomodoroSprintDuration[]).map((duration) => {
                const rewards = POMODORO_SPRINT_REWARDS[duration];
                return (
                  <button
                    key={duration}
                    className={`pomodoro-sprint__duration-button ${
                      selectedDuration === duration
                        ? 'pomodoro-sprint__duration-button--selected'
                        : ''
                    }`}
                    onClick={() => handleDurationSelect(duration)}
                  >
                    <p className="pomodoro-sprint__duration-time">{duration} min</p>
                    <p className="pomodoro-sprint__duration-label">
                      {duration === 25 
                        ? 'Full Pomodoro' 
                        : duration === 15 
                        ? 'Standard Sprint' 
                        : duration === 10 
                        ? 'Short Sprint' 
                        : 'Mini Sprint'}
                    </p>
                    <p className="pomodoro-sprint__duration-rewards">
                      🪙 {rewards.coins}
                      {rewards.dice > 0 && ` · 🎲 ${rewards.dice}`}
                      {rewards.tokens > 0 && ` · 🎟️ ${rewards.tokens}`}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="pomodoro-sprint__actions">
              <button
                className="pomodoro-sprint__button pomodoro-sprint__button--primary"
                onClick={handleStart}
              >
                START FOCUS
              </button>
            </div>
          </>
        )}

        {gameSession.isRunning && !gameSession.isComplete && (
          <>
            <div className="pomodoro-sprint__header">
              <h2 className="pomodoro-sprint__title">
                <span>🍅</span>
                <span>Focus Mode Active</span>
              </h2>
              <p className="pomodoro-sprint__subtitle">
                Stay focused to earn full rewards
              </p>
            </div>

            <div className="pomodoro-sprint__timer">
              <div className="pomodoro-sprint__progress-ring">
                <svg
                  className="pomodoro-sprint__progress-svg"
                  width="200"
                  height="200"
                  viewBox="0 0 200 200"
                >
                  <circle
                    className="pomodoro-sprint__progress-bg"
                    cx="100"
                    cy="100"
                    r={radius}
                  />
                  <circle
                    className="pomodoro-sprint__progress-bar"
                    cx="100"
                    cy="100"
                    r={radius}
                    strokeDasharray={circumference}
                    strokeDashoffset={progressOffset}
                  />
                </svg>
                <div className="pomodoro-sprint__timer-text">
                  {formatTimeRemaining(remainingSeconds)}
                </div>
              </div>
              <p className="pomodoro-sprint__timer-label">
                {Math.floor(completionPercentage)}% complete
              </p>
            </div>

            <div className="pomodoro-sprint__actions">
              <button
                className="pomodoro-sprint__button pomodoro-sprint__button--secondary"
                onClick={handleCancel}
              >
                Exit Early
              </button>
            </div>
          </>
        )}

        {gameSession.isComplete && (
          <>
            <div className="pomodoro-sprint__completion">
              <h2 className="pomodoro-sprint__completion-title">Focus Complete! 🎉</h2>
              <p className="pomodoro-sprint__completion-subtitle">
                You stayed focused for {gameSession.duration} minutes
              </p>

              <div className="pomodoro-sprint__rewards">
                <p className="pomodoro-sprint__rewards-title">Rewards Earned</p>
                <div className="pomodoro-sprint__rewards-list">
                  {gameSession.rewards.coins > 0 && (
                    <div className="pomodoro-sprint__reward-item">
                      <div className="pomodoro-sprint__reward-value">
                        🪙 {gameSession.rewards.coins}
                      </div>
                      <div className="pomodoro-sprint__reward-label">Coins</div>
                    </div>
                  )}
                  {gameSession.rewards.dice > 0 && (
                    <div className="pomodoro-sprint__reward-item">
                      <div className="pomodoro-sprint__reward-value">
                        🎲 {gameSession.rewards.dice}
                      </div>
                      <div className="pomodoro-sprint__reward-label">Dice</div>
                    </div>
                  )}
                  {gameSession.rewards.tokens > 0 && (
                    <div className="pomodoro-sprint__reward-item">
                      <div className="pomodoro-sprint__reward-value">
                        🎟️ {gameSession.rewards.tokens}
                      </div>
                      <div className="pomodoro-sprint__reward-label">Tokens</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pomodoro-sprint__actions">
              <button
                className="pomodoro-sprint__button pomodoro-sprint__button--primary"
                onClick={handleComplete}
              >
                Collect Rewards
              </button>
            </div>
          </>
        )}

        {showCelebration && (
          <LuckyRollCelebration
            type="big"
            message="Focus Complete!"
            emoji="🍅"
            onComplete={() => setShowCelebration(false)}
          />
        )}
      </div>
    </div>
  );
}
