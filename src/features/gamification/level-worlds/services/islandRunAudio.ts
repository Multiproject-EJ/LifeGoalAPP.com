/**
 * Island Run — Audio + Haptics service (M10A)
 *
 * Provides typed sound and haptic event dispatch for Island Run game events.
 * All calls are gated behind an in-memory `islandRunAudioEnabled` preference
 * (defaults to `true`) and gracefully no-op when the relevant browser API is
 * unavailable.
 *
 * Audio: lazy HTMLAudioElement playback for mapped SFX assets. Missing files
 * and browser autoplay failures are treated as safe no-ops.
 *
 * Haptics: short mobile-friendly patterns via the Vibration API. In addition
 * to the audio-enabled flag, haptic dispatch additionally honors:
 *   - `prefers-reduced-motion: reduce` (silent no-op for accessibility)
 *   - the global `HapticMode` preference ('off' | 'subtle' | 'balanced') shared
 *     with the rest of the app via `completionHaptics.ts` — 'off' no-ops,
 *     'subtle' attenuates multi-pulse patterns to a single short pulse.
 *   - a per-event throttle so rapid events (tile_land / token_move) can't
 *     saturate the vibration queue.
 */

import { getHapticMode } from '../../../../utils/completionHaptics';

// ─── Types ────────────────────────────────────────────────────────────────────

export type IslandRunSoundEvent =
  | 'roll'
  | 'token_move'
  | 'stop_land'
  | 'island_travel'
  // M10B: hatchery events
  | 'egg_set'
  | 'egg_ready'
  | 'egg_open'
  // M10B: market events
  | 'market_purchase_attempt'
  | 'market_purchase_success'
  | 'market_insufficient_coins'
  // M10C: boss events
  | 'boss_trial_start'
  | 'boss_trial_resolve'
  | 'boss_island_clear'
  // M10C: encounter events
  | 'encounter_trigger'
  | 'encounter_resolve'
  // M10D: stop completion + travel completion
  | 'market_stop_complete'
  | 'island_travel_complete'
  // M8-COMPLETE: shop open + utility stop events
  | 'shop_open'
  | 'utility_stop_complete'
  // Reward bar events
  | 'reward_bar_fill'
  | 'reward_bar_claim_burst'
  | 'reward_bar_cascade'
  // Minigame events
  | 'minigame_open'
  | 'minigame_complete'
  // Sticker events
  | 'sticker_complete';

export type IslandRunHapticEvent =
  | 'roll'
  | 'stop_land'
  | 'island_travel'
  | 'reward_claim'
  // M10B: hatchery + market haptics
  | 'egg_set'
  | 'egg_open'
  | 'market_purchase_success'
  // M10C: boss + encounter haptics
  | 'boss_trial_resolve'
  | 'boss_island_clear'
  | 'encounter_resolve'
  // M10D: stop completion + travel completion
  | 'market_stop_complete'
  | 'island_travel_complete'
  // M8-COMPLETE: utility stop haptic
  | 'utility_stop_complete'
  // Reward bar haptics
  | 'reward_bar_cascade'
  | 'sticker_complete';

// ─── Preference helpers ────────────────────────────────────────────────────────

let islandRunAudioEnabled = true;

export function getIslandRunAudioEnabled(): boolean {
  return islandRunAudioEnabled;
}

export function setIslandRunAudioEnabled(enabled: boolean): void {
  islandRunAudioEnabled = enabled;
}

// ─── SFX playback helpers ─────────────────────────────────────────────────────

const ISLAND_RUN_SFX_VOLUME = 0.42;
const DEFAULT_SFX_MIN_INTERVAL_MS = 40;

const SFX_MIN_INTERVAL_BY_EVENT: Partial<Record<IslandRunSoundEvent, number>> = {
  token_move: 90,
  reward_bar_fill: 70,
};

const islandRunSfxAudioByEvent = new Map<IslandRunSoundEvent, HTMLAudioElement>();
const failedIslandRunSfxAssetPaths = new Set<string>();
const lastSfxFiredAtByEvent: Partial<Record<IslandRunSoundEvent, number>> = {};

function getIslandRunSfxAudio(eventId: IslandRunSoundEvent): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    return null;
  }

  const assetPath = SOUND_ASSET_MAP[eventId];
  if (failedIslandRunSfxAssetPaths.has(assetPath)) {
    return null;
  }

  const existingAudio = islandRunSfxAudioByEvent.get(eventId);
  if (existingAudio) {
    return existingAudio;
  }

  const audio = new Audio(assetPath);
  audio.preload = 'auto';
  audio.volume = ISLAND_RUN_SFX_VOLUME;
  audio.addEventListener('error', () => {
    failedIslandRunSfxAssetPaths.add(assetPath);
  }, { once: true });
  islandRunSfxAudioByEvent.set(eventId, audio);

  return audio;
}

function shouldThrottleIslandRunSfx(eventId: IslandRunSoundEvent): boolean {
  const now = Date.now();
  const lastFiredAt = lastSfxFiredAtByEvent[eventId];
  const minIntervalMs = SFX_MIN_INTERVAL_BY_EVENT[eventId] ?? DEFAULT_SFX_MIN_INTERVAL_MS;

  if (typeof lastFiredAt === 'number' && now - lastFiredAt < minIntervalMs) {
    return true;
  }

  lastSfxFiredAtByEvent[eventId] = now;
  return false;
}

function rewindIslandRunSfxAudio(audio: HTMLAudioElement): void {
  try {
    audio.currentTime = 0;
  } catch {
    // Some mobile browsers can reject currentTime before metadata is available.
  }
}

// ─── Haptic patterns (ms) ─────────────────────────────────────────────────────

const HAPTIC_PATTERNS: Record<IslandRunHapticEvent, number | number[]> = {
  roll: [30],
  stop_land: [20, 40, 20],
  island_travel: [30, 50, 30],
  reward_claim: [20, 30, 20, 30, 20],
  // M10B
  egg_set: [25],
  egg_open: [20, 40, 20, 40, 20],
  market_purchase_success: [20, 40, 20],
  // M10C
  boss_trial_resolve: [50, 30, 50],
  boss_island_clear: [30, 40, 30, 40, 30],
  encounter_resolve: [20, 30, 20],
  // M10D
  market_stop_complete: [20, 30, 20],
  island_travel_complete: [30, 50, 30, 50, 30],
  // M8-COMPLETE
  utility_stop_complete: [20, 35, 20],
  // Reward bar
  reward_bar_cascade: [15, 20, 15, 20, 15, 20, 15],
  sticker_complete: [30, 40, 30, 40, 30, 40, 30],
};

// ─── Sound event map (placeholder — no files needed yet) ──────────────────────

// Maps event IDs to future asset paths. Currently no-op since files don't exist.
const SOUND_ASSET_MAP: Record<IslandRunSoundEvent, string> = {
  roll: '/assets/audio/sfx/sfx_dice_roll.mp3',
  token_move: '/assets/audio/sfx/sfx_tile_land.mp3',
  stop_land: '/assets/audio/sfx/sfx_tile_land.mp3',
  island_travel: '/assets/audio/sfx/sfx_spin.mp3',
  // M10B
  egg_set: '/assets/audio/sfx/sfx_egg_set.mp3',
  egg_ready: '/assets/audio/sfx/sfx_egg_ready.mp3',
  egg_open: '/assets/audio/sfx/sfx_egg_open.mp3',
  market_purchase_attempt: '/assets/audio/sfx/sfx_market_attempt.mp3',
  market_purchase_success: '/assets/audio/sfx/sfx_market_success.mp3',
  market_insufficient_coins: '/assets/audio/sfx/sfx_market_fail.mp3',
  // M10C
  boss_trial_start: '/assets/audio/sfx/sfx_boss_start.mp3',
  boss_trial_resolve: '/assets/audio/sfx/sfx_boss_resolve.mp3',
  boss_island_clear: '/assets/audio/sfx/sfx_island_clear.mp3',
  encounter_trigger: '/assets/audio/sfx/sfx_encounter_trigger.mp3',
  encounter_resolve: '/assets/audio/sfx/sfx_encounter_resolve.mp3',
  // M10D
  market_stop_complete: '/assets/audio/sfx/sfx_market_complete.mp3',
  island_travel_complete: '/assets/audio/sfx/sfx_island_travel_complete.mp3',
  // M8-COMPLETE
  shop_open: '/assets/audio/sfx/sfx_shop_open.mp3',
  utility_stop_complete: '/assets/audio/sfx/sfx_utility_complete.mp3',
  // Reward bar
  reward_bar_fill: '/assets/audio/sfx/sfx_reward_bar_fill.mp3',
  reward_bar_claim_burst: '/assets/audio/sfx/sfx_reward_bar_claim_burst.mp3',
  reward_bar_cascade: '/assets/audio/sfx/sfx_reward_bar_cascade.mp3',
  // Minigame
  minigame_open: '/assets/audio/sfx/sfx_minigame_open.mp3',
  minigame_complete: '/assets/audio/sfx/sfx_minigame_complete.mp3',
  // Sticker
  sticker_complete: '/assets/audio/sfx/sfx_sticker_complete.mp3',
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Plays an Island Run sound effect.
 * Lazily plays the mapped file-based SFX asset for the provided event.
 * Missing files and autoplay rejections are safe no-ops.
 */
export function playIslandRunSound(eventId: IslandRunSoundEvent): void {
  if (!getIslandRunAudioEnabled()) return;
  if (shouldThrottleIslandRunSfx(eventId)) return;

  const audio = getIslandRunSfxAudio(eventId);
  if (!audio) return;

  const playableAudio = audio.paused || audio.ended
    ? audio
    : audio.cloneNode(true) as HTMLAudioElement;
  playableAudio.volume = ISLAND_RUN_SFX_VOLUME;
  playableAudio.addEventListener('error', () => {
    failedIslandRunSfxAssetPaths.add(SOUND_ASSET_MAP[eventId]);
  }, { once: true });
  rewindIslandRunSfxAudio(playableAudio);

  void playableAudio.play().catch(() => {
    // Browser autoplay policy, missing files, and decode failures are non-fatal.
  });
}

/**
 * Triggers an Island Run haptic feedback pattern.
 * Uses the Vibration API; gracefully no-ops when unavailable.
 *
 * Respects (in order):
 *   1. `islandRunAudioEnabled` flag (shared with sound effects)
 *   2. `prefers-reduced-motion: reduce`
 *   3. global `HapticMode` — 'off' no-ops, 'subtle' clamps patterns to a
 *      single short pulse (max 30 ms), 'balanced' uses the full pattern
 *   4. a 60 ms per-event throttle to prevent saturation during rapid events
 *      (e.g. hop-by-hop tile_land bursts)
 */
export function triggerIslandRunHaptic(eventId: IslandRunHapticEvent): void {
  if (!getIslandRunAudioEnabled()) return;

  if (typeof window === 'undefined' || !navigator.vibrate) return;

  // Accessibility: skip haptics when user prefers reduced motion.
  if (typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  // Respect the app-wide haptic mode preference.
  const mode = getHapticMode();
  if (mode === 'off') return;

  // Per-event throttle — prevents vibration queue saturation when rapid
  // events fire (e.g. multi-tile token moves, chained reward claims).
  const now = Date.now();
  const lastFiredAt = lastFiredAtByEvent[eventId] ?? 0;
  if (now - lastFiredAt < HAPTIC_MIN_INTERVAL_MS) return;
  lastFiredAtByEvent[eventId] = now;

  const rawPattern = HAPTIC_PATTERNS[eventId];
  const pattern = mode === 'subtle' ? attenuatePattern(rawPattern) : rawPattern;

  try {
    navigator.vibrate(pattern);
  } catch {
    // Vibration API call failed — ignore silently
  }
}

// ─── Haptic throttle + attenuation helpers ────────────────────────────────────

/** Minimum gap between identical haptic events (ms). */
const HAPTIC_MIN_INTERVAL_MS = 60;

const lastFiredAtByEvent: Partial<Record<IslandRunHapticEvent, number>> = {};

/**
 * Collapses a multi-pulse pattern to a single short pulse for 'subtle' mode.
 * Accepts either a bare number or an alternating [on, off, on, …] array and
 * returns a single value clamped to 30 ms — matches the 'light' profile used
 * elsewhere in the app (see `completionHaptics.ts` HAPTIC_PATTERNS.light).
 */
function attenuatePattern(pattern: number | number[]): number {
  if (typeof pattern === 'number') {
    return Math.min(pattern, 30);
  }
  const first = pattern[0] ?? 20;
  return Math.min(first, 30);
}
