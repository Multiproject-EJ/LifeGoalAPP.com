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

  const playEndGong = useCallback(() => {
    const context = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = context;

    const now = context.currentTime;
    const output = context.createGain();
    output.gain.setValueAtTime(0.26, now);
    output.connect(context.destination);

    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(4200, now);
    lowpass.Q.setValueAtTime(0.6, now);
    lowpass.connect(output);

    const strikeNoise = context.createBufferSource();
    const strikeDuration = 0.07;
    const strikeBuffer = context.createBuffer(1, Math.floor(context.sampleRate * strikeDuration), context.sampleRate);
    const strikeData = strikeBuffer.getChannelData(0);

    for (let i = 0; i < strikeData.length; i += 1) {
      const envelope = 1 - i / strikeData.length;
      strikeData[i] = (Math.random() * 2 - 1) * envelope;
    }

    const strikeFilter = context.createBiquadFilter();
    strikeFilter.type = 'bandpass';
    strikeFilter.frequency.setValueAtTime(2100, now);
    strikeFilter.Q.setValueAtTime(1.2, now);

    const strikeGain = context.createGain();
    strikeGain.gain.setValueAtTime(0.0001, now);
    strikeGain.gain.exponentialRampToValueAtTime(0.12, now + 0.005);
    strikeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    strikeNoise.buffer = strikeBuffer;
    strikeNoise.connect(strikeFilter);
    strikeFilter.connect(strikeGain);
    strikeGain.connect(lowpass);
    strikeNoise.start(now);
    strikeNoise.stop(now + strikeDuration);

    const partials: Array<{ frequency: number; gain: number; decay: number }> = [
      { frequency: 146, gain: 0.16, decay: 4.2 },
      { frequency: 219, gain: 0.13, decay: 3.8 },
      { frequency: 294, gain: 0.1, decay: 3.2 },
      { frequency: 374, gain: 0.08, decay: 2.8 },
      { frequency: 498, gain: 0.06, decay: 2.4 },
      { frequency: 632, gain: 0.05, decay: 2.1 },
      { frequency: 811, gain: 0.04, decay: 1.8 },
    ];

    partials.forEach(({ frequency, gain, decay }, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';

      const detuneCents = index % 2 === 0 ? -6 : 7;
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.detune.setValueAtTime(detuneCents, now);

      const partialGain = context.createGain();
      partialGain.gain.setValueAtTime(0.0001, now);
      partialGain.gain.exponentialRampToValueAtTime(gain, now + 0.02);
      partialGain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      oscillator.connect(partialGain);
      partialGain.connect(lowpass);

      oscillator.start(now);
      oscillator.stop(now + decay + 0.05);
    });
  }, []);

  const playGuidanceGong = useCallback(() => {
    const context = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = context;

    const now = context.currentTime;
    const output = context.createGain();
    output.gain.setValueAtTime(0.2, now);
    output.connect(context.destination);

    const reverbLikeDelay = context.createDelay(1.2);
    reverbLikeDelay.delayTime.setValueAtTime(0.16, now);
    const delayFeedback = context.createGain();
    delayFeedback.gain.setValueAtTime(0.22, now);
    reverbLikeDelay.connect(delayFeedback);
    delayFeedback.connect(reverbLikeDelay);

    const dryGain = context.createGain();
    dryGain.gain.setValueAtTime(0.86, now);
    const wetGain = context.createGain();
    wetGain.gain.setValueAtTime(0.24, now);

    dryGain.connect(output);
    wetGain.connect(output);
    reverbLikeDelay.connect(wetGain);

    const highShelf = context.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.setValueAtTime(1900, now);
    highShelf.gain.setValueAtTime(2.5, now);
    highShelf.connect(dryGain);
    highShelf.connect(reverbLikeDelay);

    const partials: Array<{ frequency: number; gain: number; decay: number }> = [
      { frequency: 392, gain: 0.12, decay: 4.6 },
      { frequency: 523, gain: 0.1, decay: 4.2 },
      { frequency: 659, gain: 0.08, decay: 3.9 },
      { frequency: 784, gain: 0.06, decay: 3.4 },
      { frequency: 988, gain: 0.05, decay: 3.1 },
    ];

    partials.forEach(({ frequency, gain, decay }, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.detune.setValueAtTime(index % 2 === 0 ? 4 : -4, now);

      const partialGain = context.createGain();
      partialGain.gain.setValueAtTime(0.0001, now);
      partialGain.gain.exponentialRampToValueAtTime(gain, now + 0.03);
      partialGain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      oscillator.connect(partialGain);
      partialGain.connect(highShelf);
      oscillator.start(now);
      oscillator.stop(now + decay + 0.06);
    });
  }, []);

  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (soundEnabled) {
            playEndGong();
          }
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, timeRemaining, onComplete, playEndGong, soundEnabled]);

  useEffect(() => {
    if (!isRunning) return;

    const elapsed = durationSeconds - timeRemaining;

    if (!soundEnabled || !gongIntervalSeconds) return;

    if (elapsed >= nextGongAt && nextGongAt <= durationSeconds) {
      playGuidanceGong();
      setNextGongAt((prev) => prev + gongIntervalSeconds);
    }
  }, [
    isRunning,
    durationSeconds,
    timeRemaining,
    nextGongAt,
    playGuidanceGong,
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
        playGuidanceGong();
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
