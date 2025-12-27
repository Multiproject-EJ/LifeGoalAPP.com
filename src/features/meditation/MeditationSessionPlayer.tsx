import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [hasStarted, setHasStarted] = useState(false);
  const [nextGongAt, setNextGongAt] = useState(60);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gongIntervalSeconds, setGongIntervalSeconds] = useState<number | null>(60);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastIntervalRef = useRef<number | null>(gongIntervalSeconds);

  useEffect(() => {
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setTimeRemaining(durationSeconds);
      setIsRunning(false);
      setBreathPhase('inhale');
      setHasStarted(false);
      setNextGongAt(60);
      setSoundEnabled(true);
      setGongIntervalSeconds(60);
      lastIntervalRef.current = 60;
    }
  }, [isOpen, durationSeconds]);

  const playGong = useCallback(() => {
    const context = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = context;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(520, now);
    oscillator.frequency.exponentialRampToValueAtTime(180, now + 1.5);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + 2);
  }, []);

  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (soundEnabled) {
            playGong();
          }
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, timeRemaining, onComplete, playGong, soundEnabled]);

  useEffect(() => {
    if (!isRunning) return;

    const elapsed = durationSeconds - timeRemaining;

    if (!soundEnabled || !gongIntervalSeconds) return;

    if (elapsed >= nextGongAt && nextGongAt <= durationSeconds) {
      playGong();
      setNextGongAt((prev) => prev + gongIntervalSeconds);
    }
  }, [
    isRunning,
    durationSeconds,
    timeRemaining,
    nextGongAt,
    playGong,
    soundEnabled,
    gongIntervalSeconds,
  ]);

  useEffect(() => {
    if (lastIntervalRef.current === gongIntervalSeconds) return;
    lastIntervalRef.current = gongIntervalSeconds;

    if (!gongIntervalSeconds) {
      setNextGongAt(Number.POSITIVE_INFINITY);
      return;
    }

    const elapsed = durationSeconds - timeRemaining;
    const next = elapsed === 0 ? gongIntervalSeconds : elapsed + gongIntervalSeconds - (elapsed % gongIntervalSeconds);
    setNextGongAt(next);
  }, [gongIntervalSeconds, durationSeconds, timeRemaining]);

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
    if (!hasStarted) {
      if (soundEnabled) {
        playGong();
      }
      setHasStarted(true);
    }
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

          <div className="meditation-audio-settings">
            <label className="meditation-audio-settings__toggle">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(event) => setSoundEnabled(event.target.checked)}
              />
              Sound on
            </label>
            <div className="meditation-audio-settings__interval">
              <label htmlFor="gong-interval" className="meditation-audio-settings__label">
                Gong interval
              </label>
              <select
                id="gong-interval"
                className="meditation-audio-settings__select"
                value={gongIntervalSeconds ?? 0}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setGongIntervalSeconds(value === 0 ? null : value);
                }}
                disabled={!soundEnabled}
              >
                <option value={0}>No interval</option>
                <option value={60}>Every 1 minute</option>
              </select>
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
