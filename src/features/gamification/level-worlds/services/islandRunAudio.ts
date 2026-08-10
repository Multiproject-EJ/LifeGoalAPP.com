/**
 * Island Run — Audio + Haptics service (M10A)
 *
 * Provides typed sound and haptic event dispatch for Island Run game events.
 * All calls are gated behind an in-memory `islandRunAudioEnabled` preference
 * (starts muted until the entry audio choice is confirmed) and gracefully no-op
 * when the relevant browser API is unavailable.
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
import audioAssetManifest from './islandRunAudioAssets.json';

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
  | 'multiplier_max'
  // Traffic light coin flip events
  | 'coin_flip'
  | 'coin_reveal'
  | 'tech_item_poof';

export type IslandRunHapticEvent =
  | 'roll'
  | 'stop_land'
  | 'island_travel'
  | 'reward_claim'
  | 'build_part'
  | 'build_level_complete'
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
  | 'sticker_complete'
  // Traffic light coin flip haptic
  | 'coin_reveal'
  // Auto-roll hold: a faint tick when the hold arms, a firmer double when it
  // engages, so the 1.4s charge is felt as well as seen.
  | 'auto_roll_arm'
  | 'auto_roll_engage'
  | 'tech_item_poof';

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
  /** Sound events still mapped to a placeholder recording. See PLACEHOLDER_SOUND_ASSET_PATHS. */
  placeholderEventCount: number;
  /** True while the most recent sound event played a placeholder recording. */
  lastSoundWasPlaceholder: boolean;
}

// ─── Preference helpers ────────────────────────────────────────────────────────

let islandRunSfxEnabled = false;

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
  tech_item_poof: 110,
};

const islandRunSfxAudioByEvent = new Map<IslandRunSoundEvent, HTMLAudioElement>();
const failedIslandRunSfxAssetPaths = new Set<string>();
const lastSfxFiredAtByEvent: Partial<Record<IslandRunSoundEvent, number>> = {};
let lastIslandRunSoundEventId: IslandRunSoundEvent | null = null;
let lastIslandRunSoundAssetPath: string | null = null;
let lastIslandRunSoundPlaybackStatus: IslandRunSoundPlaybackStatus = 'idle';
let islandRunSfxPlayAttemptCount = 0;
let islandRunSfxPlayFailureCount = 0;
const playedIslandRunHatchRevealIds = new Set<string>();
const MAX_REMEMBERED_HATCH_REVEAL_IDS = 64;

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
  build_part: [18],
  build_level_complete: [24, 32, 24, 48, 42],
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
  // Traffic light coin reveal: a celebratory triple buzz on landing.
  coin_reveal: [25, 35, 25, 45, 30],
  tech_item_poof: [12, 18, 12],
  // Deliberately asymmetric: arming is the lightest pulse in the whole map so
  // it reads as "held, not yet committed"; engaging lands harder so the player
  // can lift their eyes off the button once it fires.
  auto_roll_arm: [10],
  auto_roll_engage: [28, 36, 44],
};

// ─── Sound event map ─────────────────────────────────────────────────────────

/**
 * ⚠️ PLACEHOLDER ASSETS — EVERY FILE BELOW IS A PLACEHOLDER AND MUST BE REPLACED.
 *
 * All seven of these are stand-in sounds of unacceptable quality (the dice roll
 * and tile land in particular). They are not "good enough for now" — they are
 * the single biggest drag on how the game feels, and they are what 174 call
 * sites across the board and four mini-games currently play.
 *
 * Do NOT treat the presence of a file here as "this event has a sound".
 * Replacement assets, with generation prompts, are specified in:
 *   docs/audio/02_SFX_ASSET_MANIFEST.md
 *
 * The music tracks under /assets/audio/music/ are NOT placeholders — those are
 * approved originals and must not be regenerated or replaced.
 *
 * When a real asset lands, retire its path in islandRunAudioAssets.json.
 * `npm run check:audio-assets` reports how many placeholders remain.
 */
const AVAILABLE_SOUND_ASSET_PATHS = audioAssetManifest.assets
  .filter((asset) => asset.kind === 'sfx' || asset.kind === 'stinger')
  .map((asset) => asset.path);

export type IslandRunSoundAssetPath = string;

/**
 * Paths still served by placeholder audio. The set shrinks to empty as
 * production recordings replace the temporary cues.
 */
const PLACEHOLDER_SOUND_ASSET_PATHS = new Set<string>(audioAssetManifest.islandRun.placeholderPaths);

/** True while `assetPath` is still served by a placeholder recording. */
export function isPlaceholderSoundAsset(assetPath: string): boolean {
  return PLACEHOLDER_SOUND_ASSET_PATHS.has(assetPath);
}

/** Sound events whose mapped asset is still a placeholder. */
export function getPlaceholderSoundEvents(): IslandRunSoundEvent[] {
  return (Object.keys(SOUND_ASSET_MAP) as IslandRunSoundEvent[])
    .filter((eventId) => isPlaceholderSoundAsset(SOUND_ASSET_MAP[eventId]))
    .sort();
}

const SOUND_ASSET_MAP = audioAssetManifest.islandRun.sfxEvents satisfies Record<IslandRunSoundEvent, IslandRunSoundAssetPath>;

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
 * Plays the creature-hatch sting once for a stable reveal identity.
 *
 * The canonical egg transition already prevents duplicate rewards; this
 * presentation guard separately prevents rerenders or impatient double taps
 * from replaying the hatch sting for the same resolved egg.
 */
export function playIslandRunHatchRevealSound(revealId: string): boolean {
  const normalizedRevealId = revealId.trim();
  if (!normalizedRevealId || playedIslandRunHatchRevealIds.has(normalizedRevealId)) return false;

  if (playedIslandRunHatchRevealIds.size >= MAX_REMEMBERED_HATCH_REVEAL_IDS) {
    const oldestRevealId = playedIslandRunHatchRevealIds.values().next().value;
    if (typeof oldestRevealId === 'string') playedIslandRunHatchRevealIds.delete(oldestRevealId);
  }
  playedIslandRunHatchRevealIds.add(normalizedRevealId);
  playIslandRunSound('egg_open');
  return true;
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
    placeholderEventCount: getPlaceholderSoundEvents().length,
    lastSoundWasPlaceholder: lastIslandRunSoundAssetPath !== null
      && isPlaceholderSoundAsset(lastIslandRunSoundAssetPath),
  };
}

export function resetIslandRunAudioDiagnosticsForTests(): void {
  islandRunSfxAudioByEvent.clear();
  failedIslandRunSfxAssetPaths.clear();
  playedIslandRunHatchRevealIds.clear();
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
