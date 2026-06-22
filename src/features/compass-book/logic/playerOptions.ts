/**
 * Pure helpers for the "pick from your own goals/habits" affordance.
 *
 * The player's real goals and habits are loaded (offline-first) elsewhere; these
 * functions only normalize and select that data into compact pick options. No
 * I/O, no React — fully unit-testable.
 */

import type { CompassPickSource } from '../types';

export type CompassPlayerOption = {
  /** Canonical entity id (goal id / habit id). Carried for future bridge reuse. */
  id: string;
  /** Display + the text that fills the answer when tapped. */
  label: string;
};

export type CompassPlayerData = {
  goals: CompassPlayerOption[];
  habits: CompassPlayerOption[];
};

export const EMPTY_COMPASS_PLAYER_DATA: CompassPlayerData = { goals: [], habits: [] };

/** Cap the chip list so a long backlog never floods a fragment. */
export const MAX_PICK_OPTIONS = 12;

/**
 * Trim labels, drop entries without an id or a non-empty label, de-duplicate by
 * id (first wins), and cap to {@link MAX_PICK_OPTIONS}. Order is preserved.
 */
export function normalizePlayerOptions(
  raw: readonly { id: string; label: string | null | undefined }[],
): CompassPlayerOption[] {
  const seen = new Set<string>();
  const out: CompassPlayerOption[] = [];
  for (const item of raw) {
    if (out.length >= MAX_PICK_OPTIONS) break;
    const label = (item.label ?? '').trim();
    if (!item.id || !label) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push({ id: item.id, label });
  }
  return out;
}

/** The options a given pick source draws from. */
export function optionsForPickSource(
  data: CompassPlayerData,
  source: CompassPickSource,
): CompassPlayerOption[] {
  return source === 'player_goals' ? data.goals : data.habits;
}

/** Human label for the source, used in the picker hint ("Tap one of your …"). */
export function pickSourceNoun(source: CompassPickSource): string {
  return source === 'player_goals' ? 'goals' : 'habits';
}
