import { useState, useEffect } from 'react';

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

      <style>{`
        .meditation-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .meditation-modal {
          background: var(--color-bg-elevated, #fff);
          border-radius: 16px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
          position: relative;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .meditation-modal__close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          font-size: 2rem;
          cursor: pointer;
          color: var(--color-text-secondary, #666);
          line-height: 1;
          padding: 0;
          width: 32px;
          height: 32px;
        }

        .meditation-modal__close:hover {
          color: var(--color-text-primary, #000);
        }

        .meditation-modal__content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
        }

        .meditation-modal__title {
          margin: 0;
          font-size: 1.5rem;
          text-align: center;
          color: var(--color-text-primary, #000);
        }

        .meditation-breathing-circle {
          width: 200px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .meditation-breathing-circle__inner {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease-in-out;
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        }

        .meditation-breathing-circle__inner--inhale {
          transform: scale(1.5);
          opacity: 1;
        }

        .meditation-breathing-circle__inner--hold {
          transform: scale(1.5);
          opacity: 0.9;
        }

        .meditation-breathing-circle__inner--exhale {
          transform: scale(1);
          opacity: 0.7;
        }

        .meditation-breathing-circle__text {
          color: white;
          font-weight: 600;
          font-size: 1rem;
          text-align: center;
        }

        .meditation-timer {
          width: 100%;
        }

        .meditation-timer__display {
          font-size: 3rem;
          font-weight: 300;
          text-align: center;
          color: var(--color-text-primary, #000);
          font-variant-numeric: tabular-nums;
        }

        .meditation-timer__progress {
          width: 100%;
          height: 8px;
          background: var(--color-bg-secondary, #f0f0f0);
          border-radius: 4px;
          overflow: hidden;
          margin-top: 1rem;
        }

        .meditation-timer__progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          transition: width 1s linear;
        }

        .meditation-controls {
          display: flex;
          gap: 1rem;
        }

        .meditation-controls__button {
          min-width: 120px;
        }
      `}</style>
    </div>
  );
}
