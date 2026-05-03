/**
 * Central registrar for every Island Run mini-game manifest.
 *
 * Phase 1 of the Minigame & Events Consolidation Plan
 * (`docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md`).
 *
 * This module is intentionally NOT imported by the main bundle. Call
 * `registerAllMinigameManifests()` from wiring code when the event engine or
 * Mystery/Boss launchers are ready to route to the registry (later phases).
 * Until then the registry stays empty and nothing here is pulled into the
 * bundle — each game's component is behind its manifest's `React.lazy`
 * import so the first registration is what actually schedules the chunk.
 */

import { partnerWheelManifest } from '../../games/partner-wheel';
import { shooterBlitzManifest } from '../../games/shooter-blitz';
import { spaceExcavatorManifest } from '../../games/space-excavator';
import { visionQuestManifest } from '../../games/vision-quest';
import type { IslandRunMinigameProps, MinigameManifest } from './islandRunMinigameTypes';
import { registerMinigame } from './islandRunMinigameRegistry';
import type { ComponentType } from 'react';

/** Ordered list of every manifest the game can launch. */
export const ALL_MINIGAME_MANIFESTS: readonly MinigameManifest[] = Object.freeze([
  shooterBlitzManifest,
  spaceExcavatorManifest,
  visionQuestManifest,
  partnerWheelManifest,
]);

let registered = false;

/**
 * Idempotently register every manifest with the minigame registry. Later
 * phases call this from an initialization path once the event engine is live;
 * Phase 1 leaves it uncalled (registry stays empty, launcher shows its
 * "not found" fallback, no behavior change).
 */
export function registerAllMinigameManifests(): void {
  if (registered) return;
  for (const manifest of ALL_MINIGAME_MANIFESTS) {
    // The registry's `IslandRunMinigameEntry.component` expects
    // `ComponentType<IslandRunMinigameProps>`, but the existing Vision Quest / Shooter Blitz / Partner Wheel components still use bespoke props
    // (`{ session, onClose, onComplete }`). Phase 5 introduces per-game
    // adapters that translate registry props → bespoke props and THEN match
    // the type exactly. Until then we narrow through a single explicit cast
    // to the expected component type so the registry entry stays strongly
    // typed for consumers.
    const registryComponent = manifest.Component as unknown as ComponentType<IslandRunMinigameProps>;
    registerMinigame({
      id: manifest.id,
      label: manifest.title,
      component: registryComponent,
    });
  }
  registered = true;
}

/** Test-only: reset registration bookkeeping (registry entries remain). */
export function __resetMinigameManifestsRegisteredFlagForTests(): void {
  registered = false;
}
