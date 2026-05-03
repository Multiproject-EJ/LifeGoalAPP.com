import type React from 'react';

/**
 * Reward shape returned from any Island Run minigame on completion.
 * All fields are optional — a game may award only some reward types.
 */
export interface IslandRunMinigameReward {
  dice?: number;
  spinTokens?: number;
  diamonds?: number;
  xp?: number;
}

/**
 * The completion callback contract for all Island Run minigames.
 * Called when the player finishes or exits a minigame.
 */
export interface IslandRunMinigameResult {
  completed: boolean;       // true = player finished/won; false = abandoned/lost
  reward?: IslandRunMinigameReward;
}

/**
 * Props contract every Island Run minigame component must implement.
 */
export interface IslandRunMinigameProps {
  /** Called when the minigame closes, with the outcome */
  onComplete: (result: IslandRunMinigameResult) => void;
  /** Island number — used to scale difficulty */
  islandNumber: number;
  /** Optional: cap on how many tickets/lives the player can spend */
  ticketBudget?: number;
  /** Optional: external controller bridge (used by Shooter Blitz/footer adapter) */
  controllerInput?: IslandRunControllerInputProvider;
  /** Optional launch-time tuning payload from launcher services (event/boss/mystery variants). */
  launchConfig?: Record<string, unknown>;
}

export type IslandRunControllerIntent = 'left' | 'right' | 'fire';

export interface IslandRunControllerInputProvider {
  subscribe: (listener: (intent: IslandRunControllerIntent) => void) => () => void;
}

/**
 * Uniform manifest exported by each mini-game folder's `index.ts`.
 *
 * Phase 1 of the Minigame & Events Consolidation Plan
 * (`docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md`).
 *
 * The manifest is the single public entry point for a mini-game — the registry
 * and launcher should never import the game's internal modules directly. This
 * lets each game lazy-load its bundle and keeps game code isolated from the
 * engine.
 *
 * The `Component` field is typed with a wide `any`-prop shape because existing
 * games (Vision Quest, Shooter Blitz, Partner Wheel) still use bespoke prop
 * signatures (e.g. `{ session, onClose, onComplete }`). A later phase will
 * migrate them to `IslandRunMinigameProps` via adapters; until then the type
 * stays permissive so the manifest can point at the real component without a
 * lie-typed adapter.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MinigameManifestComponent = React.LazyExoticComponent<React.ComponentType<any>>;

export interface MinigameManifest {
  /** Stable registry ID (matches the `IslandRunMinigameId` union). */
  id: string;
  /** Short human-readable label for debug/telemetry. */
  title: string;
  /** Icon (emoji or short string) surfaced in launch UIs and event chips. */
  icon: string;
  /**
   * Lazy-loaded React component that renders the mini-game. Importers MUST
   * wrap this in `<Suspense fallback=…>`. Keeping it lazy is what lets us
   * drop the game's bundle off the critical path.
   */
  Component: MinigameManifestComponent;
}
