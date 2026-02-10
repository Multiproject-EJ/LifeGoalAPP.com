/**
 * Audio utilities for procedurally generated game sounds
 * Uses Web Audio API to create lightweight sound effects
 */

// Create audio context (shared singleton)
const getAudioContext = (): AudioContext => {
  // Lazy init audio context
  if (!window._audioContext) {
    window._audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return window._audioContext;
};

// Helper to play a frequency for a duration
export const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3): void => {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  
  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
};

// Helper for ascending chime (multiple tones)
export const playChime = (frequencies: number[], interval: number, duration: number, volume: number = 0.3): void => {
  frequencies.forEach((freq, index) => {
    setTimeout(() => playTone(freq, duration, 'sine', volume), index * interval);
  });
};

// Helper for coin jingle (quick descending tones)
export const playCoinJingle = (count: number = 3, volume: number = 0.3): void => {
  const baseFreq = 800;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      playTone(baseFreq - (i * 100), 0.1, 'square', volume);
    }, i * 50);
  }
};

// Helper for whoosh/sweep sound
export const playSweep = (startFreq: number, endFreq: number, duration: number, volume: number = 0.2): void => {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(startFreq, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);
  
  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
};

// Helper for click/tap sound
export const playClick = (volume: number = 0.2): void => {
  playTone(600, 0.05, 'square', volume);
};

// Helper for celebration cascade
export const playCelebrationCascade = (intensity: 'small' | 'medium' | 'big'): void => {
  const configs = {
    small: { count: 3, baseFreq: 600, interval: 80, duration: 0.15 },
    medium: { count: 5, baseFreq: 700, interval: 60, duration: 0.2 },
    big: { count: 8, baseFreq: 800, interval: 50, duration: 0.25 },
  };
  
  const config = configs[intensity];
  for (let i = 0; i < config.count; i++) {
    setTimeout(() => {
      playTone(config.baseFreq + (i * 100), config.duration, 'sine', 0.3);
    }, i * config.interval);
  }
};

declare global {
  interface Window {
    _audioContext?: AudioContext;
  }
}
