export type CompletionHapticProfile = 'light' | 'medium' | 'strong';

type HapticChannel =
  | 'habit'
  | 'action'
  | 'journal'
  | 'breathing'
  | 'timer'
  | 'navigation'
  | 'gamification'
  | 'conflict';

type CompletionHapticOptions = {
  channel?: HapticChannel;
  minIntervalMs?: number;
};


export type HapticMode = 'off' | 'subtle' | 'balanced';

const HAPTIC_MODE_STORAGE_KEY = 'lifegoal_haptics_mode_v1';

export function getHapticMode(): HapticMode {
  if (typeof window === 'undefined') {
    return 'balanced';
  }

  const saved = window.localStorage.getItem(HAPTIC_MODE_STORAGE_KEY);
  if (saved === 'off' || saved === 'subtle' || saved === 'balanced') {
    return saved;
  }

  return 'balanced';
}

export function setHapticMode(mode: HapticMode): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(HAPTIC_MODE_STORAGE_KEY, mode);
}

function toEffectiveProfile(profile: CompletionHapticProfile, mode: HapticMode): CompletionHapticProfile {
  if (mode !== 'subtle') {
    return profile;
  }

  if (profile === 'strong') {
    return 'medium';
  }

  return 'light';
}

const HAPTIC_PATTERNS: Record<CompletionHapticProfile, number[]> = {
  light: [24],
  medium: [34, 24, 46],
  strong: [42, 24, 42, 24, 72],
};

const DEFAULT_MIN_INTERVAL_MS = 1100;
const GLOBAL_WINDOW_MS = 60_000;
const GLOBAL_MAX_TRIGGERS_PER_WINDOW = 6;
const lastHapticAtByChannel: Partial<Record<HapticChannel, number>> = {};
const globalHapticHistory: number[] = [];

function canTriggerHaptic(channel: HapticChannel, minIntervalMs: number): boolean {
  const now = Date.now();
  const lastTriggeredAt = lastHapticAtByChannel[channel] ?? 0;
  if (now - lastTriggeredAt < minIntervalMs) {
    return false;
  }

  const windowStart = now - GLOBAL_WINDOW_MS;
  while (globalHapticHistory.length > 0 && globalHapticHistory[0] < windowStart) {
    globalHapticHistory.shift();
  }

  if (globalHapticHistory.length >= GLOBAL_MAX_TRIGGERS_PER_WINDOW) {
    return false;
  }

  lastHapticAtByChannel[channel] = now;
  globalHapticHistory.push(now);
  return true;
}

export function triggerCompletionHaptic(profile: CompletionHapticProfile, options: CompletionHapticOptions = {}): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
  }

  const hapticMode = getHapticMode();
  if (hapticMode === 'off') {
    return;
  }

  const channel = options.channel ?? 'action';
  const minIntervalMs = options.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;

  if (!canTriggerHaptic(channel, minIntervalMs)) {
    return;
  }

  navigator.vibrate(HAPTIC_PATTERNS[toEffectiveProfile(profile, hapticMode)]);
}
