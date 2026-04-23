/**
 * Island Run feature flags.
 *
 * Phase 1 of the Minigame & Events Consolidation Plan
 * (`docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md`).
 *
 * Every flag here defaults to `false` so that adding a flag cannot accidentally
 * change runtime behavior. Later phases flip individual flags on as pieces
 * land. Read via `getIslandRunFeatureFlags()` so a future switch to a remote
 * feature-flag source is a single-call change.
 */

export interface IslandRunFeatureFlags {
  /**
   * Phase 3 — wires the event engine layer (rotation clock, milestone ladders,
   * sticker-fragment routing). While off, `activeTimedEvent` is still read/
   * written by the legacy renderer code paths; the engine is not consulted.
   */
  islandRunEventEngineEnabled: boolean;

  /**
   * Phase 4 — launches the polished Shooter Blitz as the Boss stop mini-game
   * (island 1 first, then island 4), using the footer game-controller image
   * as real input. While off, boss stops use their existing flow.
   */
  islandRunShooterBlitzBossEnabled: boolean;

  /**
   * Phase 5 — adds `task_tower` as a Mystery-stop content variant (alongside
   * breathing / habit_action / checkin_reflection). While off, the rotating
   * Mystery pool is unchanged.
   */
  islandRunTaskTowerMysteryEnabled: boolean;

  /**
   * Phase 5 — adds `vision_quest` as a Mystery-stop content variant. While
   * off, the rotating Mystery pool is unchanged.
   */
  islandRunVisionQuestMysteryEnabled: boolean;

  /**
   * Phase 6 — enables the new Partner Wheel mini-game (Companion Feast event
   * surface). While off, Companion Feast has no dedicated mini-game.
   */
  islandRunPartnerWheelEnabled: boolean;

  /**
   * Phase 2 — adds a Daily Spin Wheel launch button at the bottom of the
   * scrollable Today's Offer dialog. While off, the dialog keeps its current
   * non-scrollable two-button layout and the Daily Spin Wheel remains reachable
   * from the Game Board Overlay.
   */
  todaysOfferSpinEntryEnabled: boolean;
}

const DEFAULT_FLAGS: Readonly<IslandRunFeatureFlags> = Object.freeze({
  islandRunEventEngineEnabled: false,
  islandRunShooterBlitzBossEnabled: true,
  islandRunTaskTowerMysteryEnabled: false,
  islandRunVisionQuestMysteryEnabled: false,
  islandRunPartnerWheelEnabled: false,
  todaysOfferSpinEntryEnabled: false,
});

let currentFlags: IslandRunFeatureFlags = { ...DEFAULT_FLAGS };

/** Read the full flag snapshot. */
export function getIslandRunFeatureFlags(): IslandRunFeatureFlags {
  return currentFlags;
}

/** Read a single flag by key. */
export function isIslandRunFeatureEnabled(key: keyof IslandRunFeatureFlags): boolean {
  return currentFlags[key];
}

/**
 * Test-only override. Overlay is merged on top of current flags; omit keys to
 * leave the rest unchanged.
 *
 * Production code MUST NOT call this — flags are flipped on permanently by
 * editing `DEFAULT_FLAGS` as each phase lands (or later, by wiring a remote
 * config source through `getIslandRunFeatureFlags`).
 */
export function __setIslandRunFeatureFlagsForTests(
  overlay: Partial<IslandRunFeatureFlags>,
): void {
  currentFlags = { ...currentFlags, ...overlay };
}

/** Test-only: reset to the compile-time defaults. */
export function __resetIslandRunFeatureFlagsForTests(): void {
  currentFlags = { ...DEFAULT_FLAGS };
}
