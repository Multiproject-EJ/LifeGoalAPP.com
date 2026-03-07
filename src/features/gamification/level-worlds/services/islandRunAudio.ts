/**
 * Island Run — Audio + Haptics service (M10A)
 *
 * Provides typed sound and haptic event dispatch for Island Run game events.
 * All calls are gated behind the `islandRunAudioEnabled` localStorage preference
 * (defaults to `true`) and gracefully no-op when the relevant browser API is
 * unavailable.
 *
 * Audio: placeholder wiring only — no audio files required yet. Calls will be
 * no-ops until real assets are wired in a future slice.
 *
 * Haptics: short mobile-friendly patterns via the Vibration API.
 */

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
  | 'utility_stop_complete';

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
  | 'utility_stop_complete';

// ─── Preference helpers ────────────────────────────────────────────────────────

const AUDIO_PREF_KEY = 'islandRunAudioEnabled';

export function getIslandRunAudioEnabled(): boolean {
  try {
    const stored = window.localStorage.getItem(AUDIO_PREF_KEY);
    if (stored === null) return true; // default on
    return stored !== 'false';
  } catch {
    return true;
  }
}

export function setIslandRunAudioEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(AUDIO_PREF_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore storage errors
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
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Plays an Island Run sound effect.
 * Currently a no-op placeholder — asset paths are mapped but files do not yet
 * exist. This function is a safe stub that will activate once real audio
 * assets are added.
 */
export function playIslandRunSound(eventId: IslandRunSoundEvent): void {
  if (!getIslandRunAudioEnabled()) return;

  // Guard: no-op if Web Audio API is unavailable
  if (typeof window === 'undefined' || !window.AudioContext) return;

  // Placeholder: asset path is mapped for future use; no audio file wired yet
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _assetPath = SOUND_ASSET_MAP[eventId];
}

/**
 * Triggers an Island Run haptic feedback pattern.
 * Uses the Vibration API; gracefully no-ops when unavailable.
 */
export function triggerIslandRunHaptic(eventId: IslandRunHapticEvent): void {
  if (!getIslandRunAudioEnabled()) return;

  if (typeof window === 'undefined' || !navigator.vibrate) return;

  const pattern = HAPTIC_PATTERNS[eventId];
  try {
    navigator.vibrate(pattern);
  } catch {
    // Vibration API call failed — ignore silently
  }
}
