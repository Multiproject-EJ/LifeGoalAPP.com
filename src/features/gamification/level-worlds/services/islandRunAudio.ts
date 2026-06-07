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
  | 'build_upgrade'
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
  | 'sticker_complete'
  // Multiplier button events
  | 'multiplier_cycle'
  | 'multiplier_max';

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

export type IslandRunSoundPlaybackStatus =
  | 'idle'
  | 'disabled'
  | 'throttled'
  | 'unavailable'
  | 'play_requested'
  | 'play_failed'
  | 'asset_failed';

export interface IslandRunAudioDiagnostics {
  sfxEnabled: boolean;
  cachedSfxCount: number;
  failedAssetPaths: string[];
  lastSoundEventId: IslandRunSoundEvent | null;
  lastSoundAssetPath: string | null;
  lastSoundPlaybackStatus: IslandRunSoundPlaybackStatus;
  playAttemptCount: number;
  playFailureCount: number;
}

// ─── Preference helpers ────────────────────────────────────────────────────────

let islandRunSfxEnabled = true;

export function getIslandRunAudioEnabled(): boolean {
  return islandRunSfxEnabled;
}

export function setIslandRunAudioEnabled(enabled: boolean): void {
  islandRunSfxEnabled = enabled;
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
let lastIslandRunSoundEventId: IslandRunSoundEvent | null = null;
let lastIslandRunSoundAssetPath: string | null = null;
let lastIslandRunSoundPlaybackStatus: IslandRunSoundPlaybackStatus = 'idle';
let islandRunSfxPlayAttemptCount = 0;
let islandRunSfxPlayFailureCount = 0;

function recordIslandRunSoundDiagnostics(
  eventId: IslandRunSoundEvent,
  status: IslandRunSoundPlaybackStatus,
  assetPath = SOUND_ASSET_MAP[eventId],
): void {
  lastIslandRunSoundEventId = eventId;
  lastIslandRunSoundAssetPath = assetPath;
  lastIslandRunSoundPlaybackStatus = status;
}

function markIslandRunSfxAssetFailed(eventId: IslandRunSoundEvent): void {
  const assetPath = SOUND_ASSET_MAP[eventId];
  failedIslandRunSfxAssetPaths.add(assetPath);
  recordIslandRunSoundDiagnostics(eventId, 'asset_failed', assetPath);
}

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
    markIslandRunSfxAssetFailed(eventId);
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

// ─── Sound event map ─────────────────────────────────────────────────────────

const AVAILABLE_SOUND_ASSET_PATHS = [
  '/assets/audio/sfx/sfx_dice_roll.mp3',
  '/assets/audio/sfx/sfx_egg_open.mp3',
  '/assets/audio/sfx/sfx_island_clear.mp3',
  '/assets/audio/sfx/sfx_market_success.mp3',
  '/assets/audio/sfx/sfx_reward_bar_claim_burst.mp3',
  '/assets/audio/sfx/sfx_shop_open.mp3',
  '/assets/audio/sfx/sfx_tile_land.mp3',
] as const;

export type IslandRunSoundAssetPath = typeof AVAILABLE_SOUND_ASSET_PATHS[number];

const SOUND_ASSET_MAP: Record<IslandRunSoundEvent, IslandRunSoundAssetPath> = {
  roll: '/assets/audio/sfx/sfx_dice_roll.mp3',
  token_move: '/assets/audio/sfx/sfx_tile_land.mp3',
  stop_land: '/assets/audio/sfx/sfx_tile_land.mp3',
  build_upgrade: '/assets/audio/sfx/sfx_tile_land.mp3',
  island_travel: '/assets/audio/sfx/sfx_tile_land.mp3',
  // Multiplier button events: cycle uses the tile-land dunk; reaching max uses the reward burst as a short pling.
  multiplier_cycle: '/assets/audio/sfx/sfx_tile_land.mp3',
  multiplier_max: '/assets/audio/sfx/sfx_reward_bar_claim_burst.mp3',
  // Hatchery events share the available egg-open chime until bespoke set/ready assets exist.
  egg_set: '/assets/audio/sfx/sfx_egg_open.mp3',
  egg_ready: '/assets/audio/sfx/sfx_egg_open.mp3',
  egg_open: '/assets/audio/sfx/sfx_egg_open.mp3',
  // Market/shop events share available success/open cues until attempt/fail variants exist.
  market_purchase_attempt: '/assets/audio/sfx/sfx_shop_open.mp3',
  market_purchase_success: '/assets/audio/sfx/sfx_market_success.mp3',
  market_insufficient_coins: '/assets/audio/sfx/sfx_shop_open.mp3',
  // Boss/encounter events use available milestone/tile cues until bespoke combat cues exist.
  boss_trial_start: '/assets/audio/sfx/sfx_island_clear.mp3',
  boss_trial_resolve: '/assets/audio/sfx/sfx_island_clear.mp3',
  boss_island_clear: '/assets/audio/sfx/sfx_island_clear.mp3',
  encounter_trigger: '/assets/audio/sfx/sfx_tile_land.mp3',
  encounter_resolve: '/assets/audio/sfx/sfx_tile_land.mp3',
  // Stop completion + travel completion.
  market_stop_complete: '/assets/audio/sfx/sfx_market_success.mp3',
  island_travel_complete: '/assets/audio/sfx/sfx_island_clear.mp3',
  shop_open: '/assets/audio/sfx/sfx_shop_open.mp3',
  utility_stop_complete: '/assets/audio/sfx/sfx_tile_land.mp3',
  // Reward bar/sticker events.
  reward_bar_fill: '/assets/audio/sfx/sfx_dice_roll.mp3',
  reward_bar_claim_burst: '/assets/audio/sfx/sfx_reward_bar_claim_burst.mp3',
  reward_bar_cascade: '/assets/audio/sfx/sfx_reward_bar_claim_burst.mp3',
  // Minigame events use the available shop-open cue as a lightweight modal-open placeholder.
  minigame_open: '/assets/audio/sfx/sfx_shop_open.mp3',
  minigame_complete: '/assets/audio/sfx/sfx_reward_bar_claim_burst.mp3',
  sticker_complete: '/assets/audio/sfx/sfx_reward_bar_claim_burst.mp3',
};

export function getIslandRunSoundAssetPath(eventId: IslandRunSoundEvent): IslandRunSoundAssetPath {
  return SOUND_ASSET_MAP[eventId];
}

export function getIslandRunSoundAssetManifest(): Record<IslandRunSoundEvent, IslandRunSoundAssetPath> {
  return { ...SOUND_ASSET_MAP };
}

export function getAvailableIslandRunSoundAssetPaths(): IslandRunSoundAssetPath[] {
  return [...AVAILABLE_SOUND_ASSET_PATHS];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Plays an Island Run sound effect.
 * Lazily plays the mapped file-based SFX asset for the provided event.
 * Missing files and autoplay rejections are safe no-ops.
 */
export function playIslandRunSound(eventId: IslandRunSoundEvent): void {
  if (!getIslandRunAudioEnabled()) {
    recordIslandRunSoundDiagnostics(eventId, 'disabled');
    return;
  }
  if (shouldThrottleIslandRunSfx(eventId)) {
    recordIslandRunSoundDiagnostics(eventId, 'throttled');
    return;
  }

  const audio = getIslandRunSfxAudio(eventId);
  if (!audio) {
    recordIslandRunSoundDiagnostics(eventId, 'unavailable');
    return;
  }

  const playableAudio = audio.paused || audio.ended
    ? audio
    : audio.cloneNode(true) as HTMLAudioElement;
  playableAudio.volume = ISLAND_RUN_SFX_VOLUME;
  playableAudio.addEventListener('error', () => {
    markIslandRunSfxAssetFailed(eventId);
  }, { once: true });
  rewindIslandRunSfxAudio(playableAudio);

  islandRunSfxPlayAttemptCount += 1;
  recordIslandRunSoundDiagnostics(eventId, 'play_requested');
  void playableAudio.play().catch(() => {
    islandRunSfxPlayFailureCount += 1;
    recordIslandRunSoundDiagnostics(eventId, 'play_failed');
    // Browser autoplay policy, missing files, and decode failures are non-fatal.
  });
}

/**
 * Plays the token-move dunk sound with a randomly chosen playback rate from
 * four presets (0.85 / 0.92 / 1.0 / 1.10) to simulate pieces landing with
 * slightly different "strengths", giving the impression of 4 distinct dunks
 * without requiring separate audio files.
 */

const TOKEN_MOVE_PLAYBACK_RATES = [0.85, 0.92, 1.0, 1.1] as const;

export function playTokenMoveSound(): void {
  if (!getIslandRunAudioEnabled()) {
    recordIslandRunSoundDiagnostics('token_move', 'disabled');
    return;
  }
  if (shouldThrottleIslandRunSfx('token_move')) {
    recordIslandRunSoundDiagnostics('token_move', 'throttled');
    return;
  }

  const audio = getIslandRunSfxAudio('token_move');
  if (!audio) {
    recordIslandRunSoundDiagnostics('token_move', 'unavailable');
    return;
  }

  // Always clone so rapid successive hops can overlap correctly.
  const clone = audio.cloneNode(true) as HTMLAudioElement;
  clone.volume = ISLAND_RUN_SFX_VOLUME;
  clone.playbackRate = TOKEN_MOVE_PLAYBACK_RATES[
    Math.floor(Math.random() * TOKEN_MOVE_PLAYBACK_RATES.length)
  ]!;
  clone.addEventListener('error', () => {
    markIslandRunSfxAssetFailed('token_move');
  }, { once: true });
  rewindIslandRunSfxAudio(clone);

  islandRunSfxPlayAttemptCount += 1;
  recordIslandRunSoundDiagnostics('token_move', 'play_requested');
  void clone.play().catch(() => {
    islandRunSfxPlayFailureCount += 1;
    recordIslandRunSoundDiagnostics('token_move', 'play_failed');
  });
}

export function getIslandRunAudioDiagnostics(): IslandRunAudioDiagnostics {
  return {
    sfxEnabled: islandRunSfxEnabled,
    cachedSfxCount: islandRunSfxAudioByEvent.size,
    failedAssetPaths: Array.from(failedIslandRunSfxAssetPaths).sort(),
    lastSoundEventId: lastIslandRunSoundEventId,
    lastSoundAssetPath: lastIslandRunSoundAssetPath,
    lastSoundPlaybackStatus: lastIslandRunSoundPlaybackStatus,
    playAttemptCount: islandRunSfxPlayAttemptCount,
    playFailureCount: islandRunSfxPlayFailureCount,
  };
}

export function resetIslandRunAudioDiagnosticsForTests(): void {
  islandRunSfxAudioByEvent.clear();
  failedIslandRunSfxAssetPaths.clear();
  for (const eventId of Object.keys(lastSfxFiredAtByEvent) as IslandRunSoundEvent[]) {
    delete lastSfxFiredAtByEvent[eventId];
  }
  lastIslandRunSoundEventId = null;
  lastIslandRunSoundAssetPath = null;
  lastIslandRunSoundPlaybackStatus = 'idle';
  islandRunSfxPlayAttemptCount = 0;
  islandRunSfxPlayFailureCount = 0;
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
