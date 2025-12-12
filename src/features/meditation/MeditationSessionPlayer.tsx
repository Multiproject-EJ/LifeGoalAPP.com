import { useState, useEffect } from 'react';
import './MeditationSessionPlayer.css';

type MeditationSessionPlayerProps = {
  isOpen: boolean;
  onClose: () => void;
  sessionTitle: string;
  durationSeconds: number;
  onComplete: () => void;
};

export function MeditationSessionPlayer({
  isOpen,
  onClose,
  sessionTitle,
  durationSeconds,
  onComplete,
}: MeditationSessionPlayerProps) {
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');

  useEffect(() => {
    if (!isOpen) {
      setTimeRemaining(durationSeconds);
      setIsRunning(false);
      setBreathPhase('inhale');
    }
  }, [isOpen, durationSeconds]);

  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, timeRemaining, onComplete]);

  useEffect(() => {
    if (!isRunning) return;

    // Breathing cycle: 4s inhale, 2s hold, 6s exhale
    const breathingTimer = setInterval(() => {
      setBreathPhase((current) => {
        if (current === 'inhale') return 'hold';
        if (current === 'hold') return 'exhale';
        return 'inhale';
      });
    }, breathPhase === 'inhale' ? 4000 : breathPhase === 'hold' ? 2000 : 6000);

    return () => clearInterval(breathingTimer);
  }, [isRunning, breathPhase]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const progressPercentage = ((durationSeconds - timeRemaining) / durationSeconds) * 100;

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleClose = () => {
    setIsRunning(false);
    onClose();
  };

  const breathPhaseText = {
    inhale: 'Breathe In',
    hold: 'Hold',
    exhale: 'Breathe Out',
  };

  return (
    <div className="meditation-modal-overlay" onClick={handleClose}>
      <div className="meditation-modal" onClick={(e) => e.stopPropagation()}>
        <button className="meditation-modal__close" onClick={handleClose} aria-label="Close">
          ×
        </button>

        <div className="meditation-modal__content">
          <h2 className="meditation-modal__title">{sessionTitle}</h2>

          <div className="meditation-breathing-circle">
            <div
              className={`meditation-breathing-circle__inner meditation-breathing-circle__inner--${breathPhase}`}
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="meditation-breathing-circle__text">{breathPhaseText[breathPhase]}</span>
            </div>
          </div>

          <div className="meditation-timer">
            <div className="meditation-timer__display">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            <div className="meditation-timer__progress">
              <div
                className="meditation-timer__progress-bar"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          <div className="meditation-controls">
            {!isRunning && timeRemaining > 0 && (
              <button className="btn btn--primary meditation-controls__button" onClick={handleStart}>
                {timeRemaining === durationSeconds ? 'Start' : 'Resume'}
              </button>
            )}
            {isRunning && (
              <button className="btn btn--secondary meditation-controls__button" onClick={handlePause}>
                Pause
              </button>
            )}
            {timeRemaining === 0 && (
              <button className="btn btn--primary meditation-controls__button" onClick={handleClose}>
                Complete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
