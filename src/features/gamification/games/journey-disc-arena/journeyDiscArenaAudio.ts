import type { JourneyDiscArenaEvent } from '../../level-worlds/services/journeyDiscArenaGame';

type AudioContextConstructor = typeof AudioContext;

/** Original procedural cues for the development slice; no shipped samples. */
export class JourneyDiscArenaAudio {
  private context: AudioContext | null = null;
  private battleBed: { oscillators: OscillatorNode[]; lfo: OscillatorNode; master: GainNode } | null = null;

  prime(): void {
    if (typeof window === 'undefined') return;
    const Constructor = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
    if (!Constructor) return;
    this.context ??= new Constructor();
    if (this.context.state === 'suspended') void this.context.resume();
  }

  playEvents(events: readonly JourneyDiscArenaEvent[]): void {
    if (events.length === 0 || !this.context || this.context.state !== 'running') return;
    const roundComplete = events.find((event) => event.type === 'round_complete');
    const knockout = events.some((event) => event.type === 'knockout');
    const shieldBreak = events.some((event) => event.type === 'shield_break');
    const surge = events.some((event) => event.type === 'surge');
    const freeze = events.some((event) => event.type === 'freeze');
    const echo = events.some((event) => event.type === 'echo_spawn');
    const speed = events.some((event) => event.type === 'speed_field');
    const strongestImpact = events
      .filter((event): event is Extract<JourneyDiscArenaEvent, { type: 'impact' }> => event.type === 'impact')
      .reduce((best, event) => Math.max(best, event.strength), 0);

    if (freeze) {
      this.tone(980, 240, 0.26, 0.04, 'sine');
    } else if (echo) {
      this.tone(310, 820, 0.24, 0.04, 'triangle');
    } else if (speed) {
      this.tone(280, 610, 0.13, 0.03, 'sawtooth');
    } else if (surge) {
      this.tone(170, 740, 0.22, 0.055, 'sawtooth');
    } else if (knockout) {
      this.tone(210, 52, 0.34, 0.075, 'square');
      this.noise(0.28, 0.11, 0.015);
      this.tone(92, 42, 0.42, 0.09, 'sine', 0.015);
    } else if (shieldBreak) {
      this.tone(520, 95, 0.16, 0.05, 'triangle');
      this.noise(0.12, 0.055);
    } else if (strongestImpact > 0) {
      this.tone(135 + Math.min(90, strongestImpact * 7), 64, 0.095, 0.034, 'sawtooth');
      this.noise(0.055, Math.min(0.06, 0.018 + strongestImpact * 0.003));
    }

    if (roundComplete?.type === 'round_complete') {
      const notes = roundComplete.winner === 'player' ? [392, 523, 659] : roundComplete.winner === 'draw' ? [330, 392] : [247, 196, 147];
      notes.forEach((note, index) => this.tone(note, note * 1.08, 0.18, 0.035, 'triangle', index * 0.105));
    }
  }

  playPlacement(adding: boolean): void {
    this.tone(adding ? 380 : 280, adding ? 690 : 190, 0.075, 0.026, 'triangle');
  }

  playLaunch(): void {
    this.tone(95, 520, 0.22, 0.05, 'sawtooth');
    this.noise(0.09, 0.035, 0.045);
  }

  startBattleBed(): void {
    if (!this.context || this.battleBed) return;
    const now = this.context.currentTime;
    const master = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 620;
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.014, now + 0.22);
    filter.connect(master).connect(this.context.destination);
    const oscillators = [110, 165].map((frequency, index) => {
      const oscillator = this.context!.createOscillator();
      const voice = this.context!.createGain();
      oscillator.type = index === 0 ? 'sawtooth' : 'triangle';
      oscillator.frequency.value = frequency;
      voice.gain.value = index === 0 ? 0.34 : 0.18;
      oscillator.connect(voice).connect(filter);
      oscillator.start(now);
      return oscillator;
    });
    const lfo = this.context.createOscillator();
    const lfoGain = this.context.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 2.4;
    lfoGain.gain.value = 0.004;
    lfo.connect(lfoGain).connect(master.gain);
    lfo.start(now);
    this.battleBed = { oscillators, lfo, master };
  }

  stopBattleBed(): void {
    if (!this.battleBed || !this.context) return;
    const bed = this.battleBed;
    const now = this.context.currentTime;
    bed.master.gain.cancelScheduledValues(now);
    bed.master.gain.setValueAtTime(Math.max(0.0001, bed.master.gain.value), now);
    bed.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    bed.oscillators.forEach((oscillator) => oscillator.stop(now + 0.18));
    bed.lfo.stop(now + 0.18);
    this.battleBed = null;
  }

  dispose(): void {
    this.stopBattleBed();
    if (this.context) void this.context.close();
    this.context = null;
  }

  private tone(
    startFrequency: number,
    endFrequency: number,
    durationSeconds: number,
    volume: number,
    type: OscillatorType,
    delaySeconds = 0,
  ): void {
    if (!this.context) return;
    const start = this.context.currentTime + delaySeconds;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + durationSeconds);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSeconds);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(start + durationSeconds + 0.02);
  }

  private noise(durationSeconds: number, volume: number, delaySeconds = 0): void {
    if (!this.context) return;
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, Math.ceil(sampleRate * durationSeconds), sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const start = this.context.currentTime + delaySeconds;
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSeconds);
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(this.context.destination);
    source.start(start);
  }
}
