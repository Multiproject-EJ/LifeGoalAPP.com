import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

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

// Gesture thresholds should feel like one physical detent rather than a
// celebration pattern. These are only used as a web fallback; native builds
// receive the corresponding Capacitor impact style below.
const IMPACT_HAPTIC_PATTERNS: Record<CompletionHapticProfile, number[]> = {
  light: [18],
  medium: [30],
  strong: [48],
};

const DEFAULT_MIN_INTERVAL_MS = 1100;
const GLOBAL_WINDOW_MS = 60_000;
const GLOBAL_MAX_TRIGGERS_PER_WINDOW = 6;
const lastHapticAtByChannel: Partial<Record<HapticChannel, number>> = {};
const globalHapticHistory: number[] = [];

const NATIVE_IMPACT_STYLES: Record<CompletionHapticProfile, ImpactStyle> = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  strong: ImpactStyle.Heavy,
};

function canTriggerHaptic(
  channel: HapticChannel,
  minIntervalMs: number,
  countsTowardGlobalLimit: boolean,
): boolean {
  const now = Date.now();
  const lastTriggeredAt = lastHapticAtByChannel[channel] ?? 0;
  if (now - lastTriggeredAt < minIntervalMs) {
    return false;
  }

  if (countsTowardGlobalLimit) {
    const windowStart = now - GLOBAL_WINDOW_MS;
    while (globalHapticHistory.length > 0 && globalHapticHistory[0] < windowStart) {
      globalHapticHistory.shift();
    }

    if (globalHapticHistory.length >= GLOBAL_MAX_TRIGGERS_PER_WINDOW) {
      return false;
    }

    globalHapticHistory.push(now);
  }

  lastHapticAtByChannel[channel] = now;
  return true;
}

function triggerHaptic(
  profile: CompletionHapticProfile,
  options: CompletionHapticOptions,
  countsTowardGlobalLimit: boolean,
  patterns: Record<CompletionHapticProfile, number[]>,
): void {
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

  if (!canTriggerHaptic(channel, minIntervalMs, countsTowardGlobalLimit)) {
    return;
  }

  const effectiveProfile = toEffectiveProfile(profile, hapticMode);

  if (Capacitor.isNativePlatform()) {
    void Haptics.impact({ style: NATIVE_IMPACT_STYLES[effectiveProfile] }).catch(() => {
      // Haptics are an enhancement; unsupported hardware must not interrupt an action.
    });
    return;
  }

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(patterns[effectiveProfile]);
  }
}

export function triggerCompletionHaptic(profile: CompletionHapticProfile, options: CompletionHapticOptions = {}): void {
  triggerHaptic(profile, options, true, HAPTIC_PATTERNS);
}

/**
 * Emit one tactile impact for a direct-manipulation boundary such as a drag
 * threshold. It still respects reduced-motion and the user's haptic mode, but
 * it is not consumed by the low-frequency completion/celebration budget.
 */
export function triggerImpactHaptic(profile: CompletionHapticProfile, options: CompletionHapticOptions = {}): void {
  triggerHaptic(profile, options, false, IMPACT_HAPTIC_PATTERNS);
}
