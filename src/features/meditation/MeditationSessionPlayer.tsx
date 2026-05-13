import { useState, useEffect, useRef, useCallback } from 'react';
import './MeditationSessionPlayer.css';

type MeditationSessionPlayerProps = {
  isOpen: boolean;
  onClose: () => void;
  sessionTitle: string;
  durationSeconds: number;
  onComplete: () => void;
};

const PHASE_ASSET_SRC_BY_PHASE = {
  inhale: '/icons/Energy/breath-cloud-in.webp',
  hold: '/icons/Energy/breath-cloud-hold.webp',
  exhale: '/icons/Energy/breath-cloud-out.webp',
} as const;

const PHASE_INDEX_BY_PHASE = {
  inhale: 0,
  hold: 1,
  exhale: 2,
} as const;

const PHASE_LABELS: Array<keyof typeof PHASE_INDEX_BY_PHASE> = ['inhale', 'hold', 'exhale'];

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
  const [missingPhaseAssets, setMissingPhaseAssets] = useState<Record<string, true>>({});
  const [mobileBgMissing, setMobileBgMissing] = useState(false);
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
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-20, now);
    compressor.knee.setValueAtTime(30, now);
    compressor.ratio.setValueAtTime(6, now);
    compressor.attack.setValueAtTime(0.003, now);
    compressor.release.setValueAtTime(0.35, now);
    compressor.connect(context.destination);

    const output = context.createGain();
    output.gain.setValueAtTime(0.44, now);
    output.connect(compressor);

    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(3600, now);
    lowpass.Q.setValueAtTime(0.8, now);
    lowpass.connect(output);

    const reverbDelay = context.createDelay(2);
    reverbDelay.delayTime.setValueAtTime(0.23, now);
    const reverbFeedback = context.createGain();
    reverbFeedback.gain.setValueAtTime(0.42, now);
    reverbDelay.connect(reverbFeedback);
    reverbFeedback.connect(reverbDelay);

    const reverbMix = context.createGain();
    reverbMix.gain.setValueAtTime(0.22, now);
    reverbDelay.connect(reverbMix);
    reverbMix.connect(output);

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
    strikeFilter.frequency.setValueAtTime(1650, now);
    strikeFilter.Q.setValueAtTime(0.9, now);

    const strikeGain = context.createGain();
    strikeGain.gain.setValueAtTime(0.0001, now);
    strikeGain.gain.exponentialRampToValueAtTime(0.25, now + 0.005);
    strikeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    strikeNoise.buffer = strikeBuffer;
    strikeNoise.connect(strikeFilter);
    strikeFilter.connect(strikeGain);
    strikeGain.connect(lowpass);
    strikeGain.connect(reverbDelay);
    strikeNoise.start(now);
    strikeNoise.stop(now + strikeDuration);

    const partials: Array<{ frequency: number; gain: number; decay: number }> = [
      { frequency: 94, gain: 0.32, decay: 10.8 },
      { frequency: 141, gain: 0.27, decay: 9.6 },
      { frequency: 208, gain: 0.22, decay: 8.8 },
      { frequency: 289, gain: 0.18, decay: 7.9 },
      { frequency: 391, gain: 0.13, decay: 6.7 },
      { frequency: 524, gain: 0.1, decay: 5.9 },
      { frequency: 703, gain: 0.08, decay: 5.1 },
      { frequency: 931, gain: 0.06, decay: 4.5 },
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
      partialGain.connect(reverbDelay);

      oscillator.start(now);
      oscillator.stop(now + decay + 0.05);
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
      playEndGong();
      setNextGongAt((prev) => prev + gongIntervalSeconds);
    }
  }, [
    isRunning,
    durationSeconds,
    timeRemaining,
    nextGongAt,
    playEndGong,
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
        playEndGong();
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
  const phaseAssetSrc = PHASE_ASSET_SRC_BY_PHASE[breathPhase];
  const phaseAssetMissing = Boolean(missingPhaseAssets[phaseAssetSrc]);
  const startButtonLabel = timeRemaining === durationSeconds ? 'Begin Breathing' : 'Resume';
  const currentPhaseIndex = PHASE_INDEX_BY_PHASE[breathPhase];
  const handlePhaseAssetError = (assetSrc: string) => {
    setMissingPhaseAssets((current) => {
      if (current[assetSrc]) return current;
      return {
        ...current,
        [assetSrc]: true,
      };
    });
  };
  return (
    <div className="meditation-modal-overlay" onClick={handleClose}>
      <div className="meditation-modal" onClick={(e) => e.stopPropagation()}>
        {!mobileBgMissing && (
          <img
            className="meditation-modal__bg-image"
            src="/icons/Energy/breathing-space-bg-mobile.webp"
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
            onError={() => setMobileBgMissing(true)}
          />
        )}
        <button className="meditation-modal__close" onClick={handleClose} aria-label="Close">
          ×
        </button>

        <div className="meditation-modal__content">
          <header className="meditation-modal__header">
            <h2 className="meditation-modal__title">Breathing Space</h2>
            <p className="meditation-modal__subtitle">Take a moment. You’ve got this.</p>
            <span className="meditation-modal__sr-only">{sessionTitle}</span>
          </header>

          <div className="meditation-breathing-circle">
            <div
              className={`meditation-breathing-circle__inner meditation-breathing-circle__inner--${breathPhase}`}
              aria-live="polite"
              aria-atomic="true"
            >
              {!phaseAssetMissing && (
                <img
                  className="meditation-breathing-circle__phase-image"
                  src={phaseAssetSrc}
                  alt=""
                  aria-hidden="true"
                  loading="eager"
                  decoding="async"
                  onError={() => handlePhaseAssetError(phaseAssetSrc)}
                />
              )}
              {phaseAssetMissing && (
                <span className="meditation-breathing-circle__text">{breathPhaseText[breathPhase]}</span>
              )}
            </div>
          </div>
          <div className="meditation-phase-indicator" role="presentation" aria-hidden="true">
            {PHASE_LABELS.map((phase) => (
              <span
                key={phase}
                className={`meditation-phase-indicator__chip ${
                  currentPhaseIndex === PHASE_INDEX_BY_PHASE[phase]
                    ? 'meditation-phase-indicator__chip--active'
                    : ''
                }`}
              >
                {phase.charAt(0).toUpperCase() + phase.slice(1)}
              </span>
            ))}
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
            <div className="meditation-audio-settings__item">
              <label className="meditation-audio-settings__toggle">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(event) => setSoundEnabled(event.target.checked)}
                />
                <span>Sound</span>
              </label>
            </div>
            <div className="meditation-audio-settings__interval">
              <label htmlFor="gong-interval" className="meditation-audio-settings__label">
                Gong
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
                {startButtonLabel}
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
