/**
 * bossRhythmAudio.ts — procedural WebAudio engine for the Boss Rhythm Battle.
 *
 * Synthesizes the entire soundtrack (kick / snare / hats / bass) from the
 * battle config's beat grid, so the game ships with zero audio assets and the
 * chart stays sample-accurate against `audioCtx.currentTime`. Also provides
 * the SFX palette (fire, hit, miss, hurt, shield, explosion, count-in ticks).
 *
 * If WebAudio is unavailable (or blocked), the handle falls back to a silent
 * `performance.now()` clock with pause accounting so gameplay still works.
 */

import type { BossRhythmConfig } from '../../level-worlds/services/bossRhythmGame';

export interface BossRhythmAudioHandle {
  /** Begin the song timeline (call from a user gesture). */
  start(): void;
  /** Song time in seconds; < config.introSec means the count-in is running. */
  now(): number;
  pause(): void;
  resume(): void;
  /** Fade the music out (used on victory/defeat) while keeping SFX alive. */
  stopMusic(): void;
  dispose(): void;
  setMuted(muted: boolean): void;
  sfx: {
    fire(): void;
    hit(perfect: boolean): void;
    miss(): void;
    hurt(): void;
    shield(): void;
    explosion(): void;
    tick(accent: boolean): void;
  };
}

interface BeatEvent {
  timeSec: number;
  /** 1..3 for phases, 4 for the finale burst. */
  intensity: number;
  beatIndex: number;
  bpm: number;
}

/** Song times (sec) of the four count-in ticks; the last is the accent. */
export const BOSS_RHYTHM_COUNT_TICKS: readonly number[] = [0.2, 0.8, 1.4, 2.0];

function buildBeatGrid(config: BossRhythmConfig): BeatEvent[] {
  const grid: BeatEvent[] = [];
  for (const spec of config.phases) {
    const step = 60 / spec.bpm;
    for (let beat = 0; beat < spec.beats; beat += 1) {
      grid.push({ timeSec: spec.startSec + beat * step, intensity: spec.phase, beatIndex: beat, bpm: spec.bpm });
    }
  }
  const finaleStep = 60 / config.finaleBpm;
  for (let beat = 0; beat < config.finaleBeats; beat += 1) {
    grid.push({ timeSec: config.finaleStartSec + beat * finaleStep, intensity: 4, beatIndex: beat, bpm: config.finaleBpm });
  }
  return grid;
}

/** Minor-feel bass roots per intensity (A2, C3, D3, E3). */
const BASS_ROOTS = [110, 130.81, 146.83, 164.81];
/** 8-beat bass pattern in semitones above the root. */
const BASS_PATTERN = [0, 0, 3, 0, 5, 0, 3, 2];

export function createBossRhythmAudio(config: BossRhythmConfig): BossRhythmAudioHandle {
  type AudioContextCtor = typeof AudioContext;
  const Ctor: AudioContextCtor | undefined =
    typeof window !== 'undefined'
      ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext)
      : undefined;

  let ctx: AudioContext | null = null;
  try {
    ctx = Ctor ? new Ctor() : null;
  } catch {
    ctx = null;
  }

  // ── Silent fallback clock (no WebAudio) ─────────────────────────────────
  let perfStartSec: number | null = null;
  let perfPausedAtSec: number | null = null;

  if (!ctx) {
    const noop = () => {};
    return {
      start() {
        perfStartSec = performance.now() / 1000 + 0.1;
      },
      now() {
        if (perfStartSec === null) return -1;
        const nowSec = perfPausedAtSec ?? performance.now() / 1000;
        return nowSec - perfStartSec;
      },
      pause() {
        if (perfPausedAtSec === null) perfPausedAtSec = performance.now() / 1000;
      },
      resume() {
        if (perfPausedAtSec !== null && perfStartSec !== null) {
          perfStartSec += performance.now() / 1000 - perfPausedAtSec;
          perfPausedAtSec = null;
        }
      },
      stopMusic: noop,
      dispose: noop,
      setMuted: noop,
      sfx: { fire: noop, hit: noop, miss: noop, hurt: noop, shield: noop, explosion: noop, tick: noop },
    };
  }

  const audio = ctx;
  const master = audio.createGain();
  master.gain.value = 0.6;
  master.connect(audio.destination);
  const musicGain = audio.createGain();
  musicGain.gain.value = 0.8;
  musicGain.connect(master);
  const sfxGain = audio.createGain();
  sfxGain.gain.value = 1;
  sfxGain.connect(master);

  // Shared white-noise buffer for percussion / explosions.
  const noiseBuffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
  {
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }

  let songStartCtxSec: number | null = null;
  let schedulerId: number | null = null;
  let musicStopped = false;
  const beatGrid = buildBeatGrid(config);
  let nextBeatIdx = 0;
  let nextTickIdx = 0;

  const env = (node: GainNode, at: number, peak: number, decaySec: number) => {
    node.gain.setValueAtTime(0.0001, at);
    node.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), at + 0.005);
    node.gain.exponentialRampToValueAtTime(0.0001, at + decaySec);
  };

  const playOsc = (options: {
    type: OscillatorType;
    freqFrom: number;
    freqTo?: number;
    at: number;
    decaySec: number;
    peak: number;
    dest: AudioNode;
  }) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = options.type;
    osc.frequency.setValueAtTime(options.freqFrom, options.at);
    if (options.freqTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, options.freqTo), options.at + options.decaySec);
    }
    env(gain, options.at, options.peak, options.decaySec);
    osc.connect(gain);
    gain.connect(options.dest);
    osc.start(options.at);
    osc.stop(options.at + options.decaySec + 0.05);
  };

  const playNoise = (options: {
    at: number;
    decaySec: number;
    peak: number;
    filterType: BiquadFilterType;
    freqFrom: number;
    freqTo?: number;
    dest: AudioNode;
  }) => {
    const src = audio.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = audio.createBiquadFilter();
    filter.type = options.filterType;
    filter.frequency.setValueAtTime(options.freqFrom, options.at);
    if (options.freqTo !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(30, options.freqTo), options.at + options.decaySec);
    }
    const gain = audio.createGain();
    env(gain, options.at, options.peak, options.decaySec);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(options.dest);
    src.start(options.at);
    src.stop(options.at + options.decaySec + 0.05);
  };

  const scheduleBeat = (beat: BeatEvent, at: number) => {
    const stepSec = 60 / beat.bpm;
    // Kick — four on the floor.
    playOsc({ type: 'sine', freqFrom: 150, freqTo: 44, at, decaySec: 0.13, peak: 0.5, dest: musicGain });
    // Snare backbeat on beats 2 & 4 of each bar.
    if (beat.beatIndex % 4 === 1 || beat.beatIndex % 4 === 3) {
      playNoise({ at, decaySec: 0.09, peak: 0.16, filterType: 'bandpass', freqFrom: 1900, dest: musicGain });
    }
    // Hats — off-beat 8ths, plus on-beat from phase 2, 16ths in the finale.
    playNoise({ at: at + stepSec / 2, decaySec: 0.03, peak: 0.06, filterType: 'highpass', freqFrom: 7000, dest: musicGain });
    if (beat.intensity >= 2) {
      playNoise({ at, decaySec: 0.025, peak: 0.045, filterType: 'highpass', freqFrom: 8000, dest: musicGain });
    }
    if (beat.intensity >= 4) {
      playNoise({ at: at + stepSec / 4, decaySec: 0.02, peak: 0.04, filterType: 'highpass', freqFrom: 9000, dest: musicGain });
      playNoise({ at: at + (3 * stepSec) / 4, decaySec: 0.02, peak: 0.04, filterType: 'highpass', freqFrom: 9000, dest: musicGain });
    }
    // Bass line — driving 8ths in an A-minor-ish pattern that climbs each phase.
    const root = BASS_ROOTS[Math.min(BASS_ROOTS.length - 1, beat.intensity - 1)];
    const semis = BASS_PATTERN[beat.beatIndex % BASS_PATTERN.length];
    const freq = root * Math.pow(2, semis / 12);
    playOsc({ type: 'sawtooth', freqFrom: freq, at, decaySec: stepSec * 0.45, peak: 0.11, dest: musicGain });
    if (beat.intensity >= 3) {
      playOsc({ type: 'sawtooth', freqFrom: freq, at: at + stepSec / 2, decaySec: stepSec * 0.3, peak: 0.08, dest: musicGain });
    }
  };

  const runScheduler = () => {
    if (songStartCtxSec === null || musicStopped) return;
    const horizon = audio.currentTime + 0.3;
    while (nextTickIdx < BOSS_RHYTHM_COUNT_TICKS.length) {
      const at = songStartCtxSec + BOSS_RHYTHM_COUNT_TICKS[nextTickIdx];
      if (at > horizon) break;
      const accent = nextTickIdx === BOSS_RHYTHM_COUNT_TICKS.length - 1;
      playOsc({ type: 'sine', freqFrom: accent ? 990 : 660, at: Math.max(at, audio.currentTime), decaySec: 0.08, peak: 0.18, dest: musicGain });
      nextTickIdx += 1;
    }
    while (nextBeatIdx < beatGrid.length) {
      const beat = beatGrid[nextBeatIdx];
      const at = songStartCtxSec + beat.timeSec;
      if (at > horizon) break;
      scheduleBeat(beat, Math.max(at, audio.currentTime));
      nextBeatIdx += 1;
    }
  };

  return {
    start() {
      void audio.resume();
      songStartCtxSec = audio.currentTime + 0.12;
      musicStopped = false;
      nextBeatIdx = 0;
      nextTickIdx = 0;
      runScheduler();
      schedulerId = window.setInterval(runScheduler, 80);
    },
    now() {
      if (songStartCtxSec === null) return -1;
      return audio.currentTime - songStartCtxSec;
    },
    pause() {
      void audio.suspend();
    },
    resume() {
      void audio.resume();
    },
    stopMusic() {
      musicStopped = true;
      if (schedulerId !== null) {
        window.clearInterval(schedulerId);
        schedulerId = null;
      }
      musicGain.gain.setTargetAtTime(0.0001, audio.currentTime, 0.15);
    },
    dispose() {
      if (schedulerId !== null) {
        window.clearInterval(schedulerId);
        schedulerId = null;
      }
      void audio.close().catch(() => {});
    },
    setMuted(muted: boolean) {
      master.gain.setTargetAtTime(muted ? 0 : 0.6, audio.currentTime, 0.02);
    },
    sfx: {
      fire() {
        playOsc({ type: 'square', freqFrom: 880, freqTo: 240, at: audio.currentTime, decaySec: 0.09, peak: 0.09, dest: sfxGain });
      },
      hit(perfect: boolean) {
        const at = audio.currentTime;
        playOsc({ type: 'sine', freqFrom: perfect ? 1318 : 988, at, decaySec: 0.1, peak: 0.14, dest: sfxGain });
        if (perfect) {
          playOsc({ type: 'sine', freqFrom: 1976, at: at + 0.03, decaySec: 0.1, peak: 0.1, dest: sfxGain });
        }
      },
      miss() {
        playOsc({ type: 'triangle', freqFrom: 220, freqTo: 110, at: audio.currentTime, decaySec: 0.16, peak: 0.08, dest: sfxGain });
      },
      hurt() {
        const at = audio.currentTime;
        playOsc({ type: 'sawtooth', freqFrom: 140, freqTo: 55, at, decaySec: 0.25, peak: 0.18, dest: sfxGain });
        playNoise({ at, decaySec: 0.15, peak: 0.12, filterType: 'lowpass', freqFrom: 900, freqTo: 200, dest: sfxGain });
      },
      shield() {
        playOsc({ type: 'sine', freqFrom: 300, freqTo: 900, at: audio.currentTime, decaySec: 0.2, peak: 0.1, dest: sfxGain });
      },
      explosion() {
        const at = audio.currentTime;
        playNoise({ at, decaySec: 1.1, peak: 0.4, filterType: 'lowpass', freqFrom: 3200, freqTo: 90, dest: sfxGain });
        playOsc({ type: 'sine', freqFrom: 70, freqTo: 30, at, decaySec: 0.9, peak: 0.3, dest: sfxGain });
      },
      tick(accent: boolean) {
        playOsc({ type: 'sine', freqFrom: accent ? 990 : 660, at: audio.currentTime, decaySec: 0.07, peak: 0.12, dest: sfxGain });
      },
    },
  };
}
