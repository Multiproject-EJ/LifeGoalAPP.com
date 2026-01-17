import { useState, useEffect, useRef, useCallback } from 'react';
import type { RevealMode } from '../../types/meditation';
import { getMeditationById, splitIntoChunks } from '../../data/meditationContent';
import './GuidedMeditationPlayer.css';

type GuidedMeditationPlayerProps = {
  isOpen: boolean;
  onClose: () => void;
  meditationId: string;
  durationMinutes: number;
  revealMode: RevealMode;
  onComplete: () => void;
};

export function GuidedMeditationPlayer({
  isOpen,
  onClose,
  meditationId,
  durationMinutes,
  revealMode,
  onComplete,
}: GuidedMeditationPlayerProps) {
  const [chunks, setChunks] = useState<string[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [meditation, setMeditation] = useState(getMeditationById(meditationId));
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);

  const timerRef = useRef<number | null>(null);
  const chunkTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const silenceRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopSpeech = useCallback(() => {
    if (!isVoiceSupported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
  }, [isVoiceSupported]);

  const speakChunk = useCallback(
    (text: string) => {
      if (!isVoiceSupported || !isVoiceEnabled) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      stopSpeech();
      const utterance = new SpeechSynthesisUtterance(trimmed);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isVoiceSupported, isVoiceEnabled, stopSpeech]
  );

  // Calculate pacing
  const totalDurationMs = durationMinutes * 60 * 1000;
  const contentDurationMs = totalDurationMs * 0.9; // 90% for content, 10% for silence
  const silenceDurationMs = totalDurationMs * 0.1;

  // Reset when meditation, duration, or reveal mode changes
  useEffect(() => {
    const newMeditation = getMeditationById(meditationId);
    setMeditation(newMeditation);

    if (newMeditation && !newMeditation.isPlaceholder) {
      const newChunks = splitIntoChunks(newMeditation.content, revealMode);
      setChunks(newChunks);
    } else {
      setChunks([]);
    }

    // Reset state on any change
    handleRestart();
  }, [meditationId, durationMinutes, revealMode]);

  useEffect(() => {
    setIsVoiceSupported(
      typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        'SpeechSynthesisUtterance' in window
    );
  }, []);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopSpeech();
      handleRestart();
    }
  }, [isOpen]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
      stopSpeech();
    };
  }, []);

  // Main timer for tracking elapsed time
  useEffect(() => {
    if (isRunning && !isPaused && !isComplete) {
      timerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setTimeElapsed(elapsed);

        // Check if we've reached the total duration
        if (elapsed >= totalDurationMs) {
          setIsComplete(true);
          setIsRunning(false);
          if (timerRef.current) clearInterval(timerRef.current);
          if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
        }

        if (!silenceRef.current && elapsed >= contentDurationMs) {
          silenceRef.current = true;
          stopSpeech();
        }
      }, 100);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isRunning, isPaused, isComplete, totalDurationMs]);

  // Schedule next chunk reveal
  const scheduleNextChunk = useCallback(() => {
    if (chunks.length === 0 || currentChunkIndex >= chunks.length - 1) {
      return;
    }

    // Define minimum time per chunk based on reveal mode
    const minTimePerChunk = revealMode === 'word' ? 1000 : revealMode === 'sentence' ? 2000 : 3000;
    
    // Calculate time per chunk
    const timePerChunk = contentDurationMs / chunks.length;
    
    // Add a small pause between chunks (500ms to 1500ms based on mode)
    const pauseDuration = revealMode === 'word' ? 500 : revealMode === 'sentence' ? 1000 : 1500;
    
    // Use the maximum of calculated time and minimum time
    const adjustedTimePerChunk = Math.max(timePerChunk - pauseDuration, minTimePerChunk);

    chunkTimerRef.current = window.setTimeout(() => {
      // Check state again before advancing to prevent race conditions
      if (!isRunning || isPaused || isComplete) return;
      
      setCurrentChunkIndex((prev) => Math.min(prev + 1, chunks.length - 1));
    }, adjustedTimePerChunk);
  }, [chunks.length, currentChunkIndex, contentDurationMs, revealMode, isRunning, isPaused, isComplete]);

  // Trigger next chunk when current chunk changes
  useEffect(() => {
    if (isRunning && !isPaused && !isComplete && currentChunkIndex < chunks.length - 1) {
      scheduleNextChunk();
    }

    return () => {
      if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
    };
  }, [currentChunkIndex, isRunning, isPaused, isComplete, scheduleNextChunk, chunks.length]);

  const handleStart = () => {
    if (chunks.length === 0) return;

    setIsRunning(true);
    setIsPaused(false);
    startTimeRef.current = Date.now() - pausedTimeRef.current;
  };

  const handlePause = () => {
    setIsPaused(true);
    setIsRunning(false);
    pausedTimeRef.current = timeElapsed;

    stopSpeech();
    
    if (timerRef.current) clearInterval(timerRef.current);
    if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
  };

  const handleResume = () => {
    setIsPaused(false);
    setIsRunning(true);
    startTimeRef.current = Date.now() - pausedTimeRef.current;
  };

  const handleRestart = () => {
    setIsRunning(false);
    setIsPaused(false);
    setIsComplete(false);
    setCurrentChunkIndex(0);
    setTimeElapsed(0);
    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
    silenceRef.current = false;

    stopSpeech();

    if (timerRef.current) clearInterval(timerRef.current);
    if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
  };

  const handleClose = () => {
    handleRestart();
    onClose();
  };

  const handleCompleteSession = () => {
    stopSpeech();
    onComplete();
    handleClose();
  };

  useEffect(() => {
    if (!isRunning || isPaused || isComplete || !isVoiceEnabled || !isVoiceSupported) {
      return;
    }

    const text = chunks[currentChunkIndex] || '';
    speakChunk(text);
  }, [
    chunks,
    currentChunkIndex,
    isComplete,
    isPaused,
    isRunning,
    isVoiceEnabled,
    isVoiceSupported,
    speakChunk,
  ]);

  const handleToggleVoice = () => {
    if (!isVoiceSupported) return;
    setIsVoiceEnabled((prev) => {
      const next = !prev;
      if (!next) {
        stopSpeech();
      } else if (isRunning && !isPaused && !isComplete) {
        speakChunk(chunks[currentChunkIndex] || '');
      }
      return next;
    });
  };

  if (!isOpen || !meditation) return null;

  const minutes = Math.floor((totalDurationMs - timeElapsed) / 60000);
  const seconds = Math.floor(((totalDurationMs - timeElapsed) % 60000) / 1000);
  const progressPercentage = (timeElapsed / totalDurationMs) * 100;

  // Check if we're in the silence period
  const inSilencePeriod = timeElapsed >= contentDurationMs && !isComplete;

  return (
    <div className="guided-meditation-overlay" onClick={handleClose}>
      <div className="guided-meditation-modal" onClick={(e) => e.stopPropagation()}>
        <button className="guided-meditation-modal__close" onClick={handleClose} aria-label="Close">
          ×
        </button>

        <div className="guided-meditation-modal__content">
          {/* Header */}
          <div className="guided-meditation-modal__header">
            <h2 className="guided-meditation-modal__title">{meditation.title}</h2>
            <p className="guided-meditation-modal__theme">{meditation.theme}</p>
          </div>

          {/* Text Display Area */}
          <div className="guided-meditation-modal__text-container">
            {meditation.isPlaceholder ? (
              <p className="guided-meditation-modal__placeholder">
                {meditation.placeholderMessage || 'This meditation will be added later.'}
              </p>
            ) : inSilencePeriod ? (
              <p className="guided-meditation-modal__silence">
                ... silence ...
              </p>
            ) : (
              <div className="guided-meditation-modal__text">
                {chunks[currentChunkIndex] || ''}
              </div>
            )}
          </div>

          {/* Timer and Progress */}
          <div className="guided-meditation-timer">
            <div className="guided-meditation-timer__display">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            <div className="guided-meditation-timer__progress">
              <div
                className="guided-meditation-timer__progress-bar"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="guided-meditation-timer__info">
              {chunks.length > 0 && !meditation.isPlaceholder && !inSilencePeriod && (
                <span>
                  {currentChunkIndex + 1} of {chunks.length}
                </span>
              )}
              {inSilencePeriod && <span>Silent reflection</span>}
            </div>
          </div>

          {/* Controls */}
          {!meditation.isPlaceholder && (
            <div className="guided-meditation-controls">
              {isVoiceSupported ? (
                <button
                  className={`btn btn--secondary guided-meditation-controls__button guided-meditation-controls__button--voice${isVoiceEnabled ? ' is-active' : ''}`}
                  onClick={handleToggleVoice}
                  aria-pressed={isVoiceEnabled}
                >
                  Voice {isVoiceEnabled ? 'On' : 'Off'}
                </button>
              ) : (
                <span className="guided-meditation-voice__unsupported">
                  Voice not supported on this device.
                </span>
              )}
              {!isRunning && !isPaused && !isComplete && (
                <button
                  className="btn btn--primary guided-meditation-controls__button"
                  onClick={handleStart}
                >
                  Start
                </button>
              )}
              {isRunning && !isPaused && !isComplete && (
                <button
                  className="btn btn--secondary guided-meditation-controls__button"
                  onClick={handlePause}
                >
                  Pause
                </button>
              )}
              {isPaused && !isComplete && (
                <button
                  className="btn btn--primary guided-meditation-controls__button"
                  onClick={handleResume}
                >
                  Resume
                </button>
              )}
              {(isRunning || isPaused) && !isComplete && (
                <button
                  className="btn btn--secondary guided-meditation-controls__button"
                  onClick={handleRestart}
                >
                  Restart
                </button>
              )}
              {isComplete && (
                <button
                  className="btn btn--primary guided-meditation-controls__button"
                  onClick={handleCompleteSession}
                >
                  Complete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
