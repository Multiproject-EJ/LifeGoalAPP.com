/**
 * Legacy 11-phase Island Run Compass — RETENTION READ PATH ONLY.
 *
 * Nothing writes `compass_state` any more. The four write call sites (the Wisdom
 * stop and three habit-landmark paths) were removed along with `CompassModal`,
 * the only surface that could ever display this template. Island-fragment
 * answering now lives in the Compass Book — see
 * `compass-book/services/compassBookService.ts#isIslandFragmentAnsweredForUser`.
 *
 * What survives here is the ability to *read* what players already wrote, so
 * that text can be exported or migrated into the Book before the table is
 * dropped. Every signal these writes produced was also logged independently to
 * `game_life_intake` (`compass_wisdom` / `compass_habit`), so no signal trail
 * was lost by removing them.
 *
 * Do not add writers back, and do not gate gameplay on this module. Two parts of
 * the legacy curriculum — the Personality and Shield spokes — have no Compass
 * Book equivalent yet; that is the open question to settle before dropping the
 * table, not a reason to resume writing.
 */

import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';
import type {
  CompassDirection,
  CompassSpoke,
} from '../features/gamification/level-worlds/services/compassCurriculum';

type CompassStateRow = Database['public']['Tables']['compass_state']['Row'];

export type CompassEntryKind = 'wisdom' | 'habit';

export type CompassEntry = {
  kind: CompassEntryKind;
  text: string;
  islandNumber: number;
  phaseId: string;
  spoke: CompassSpoke;
  direction?: CompassDirection;
  linkedHabitId?: string | null;
  createdAt: string;
};

export type CompassSpokeStatus = 'empty' | 'in_progress' | 'complete';

export type CompassSpokeState = {
  version: number;
  status: CompassSpokeStatus;
  entries: CompassEntry[];
};

/** Parsed, render-ready view of the player's Compass template. */
export type CompassTemplate = {
  templateVersion: number;
  currentPhase: string | null;
  centerStatement: string | null;
  directions: Partial<Record<CompassDirection, string>>;
  spokes: Record<CompassSpoke, CompassSpokeState>;
  completedPhases: string[];
};

/** Entries a spoke needed before it counted as "complete". Kept so retained
 *  rows can still be interpreted the way they were written. */
export const COMPASS_SPOKE_COMPLETE_THRESHOLD = 4;

const SPOKE_KEYS: readonly CompassSpoke[] = ['center', 'personality', 'habits', 'goals', 'shield'];

function emptySpoke(): CompassSpokeState {
  return { version: 0, status: 'empty', entries: [] };
}

function emptyTemplate(): CompassTemplate {
  return {
    templateVersion: 0,
    currentPhase: null,
    centerStatement: null,
    directions: {},
    spokes: SPOKE_KEYS.reduce<Record<CompassSpoke, CompassSpokeState>>((acc, key) => {
      acc[key] = emptySpoke();
      return acc;
    }, {} as Record<CompassSpoke, CompassSpokeState>),
    completedPhases: [],
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function parseCompassState(row: CompassStateRow | null): CompassTemplate {
  const template = emptyTemplate();
  if (!row) return template;

  template.templateVersion = row.template_version ?? 0;
  template.currentPhase = row.current_phase ?? null;
  template.centerStatement = row.center_statement ?? null;
  template.completedPhases = Array.isArray(row.completed_phases) ? row.completed_phases : [];

  const directions = asRecord(row.directions);
  for (const key of ['heart', 'craft', 'cause', 'livelihood'] as const) {
    const value = directions[key];
    if (typeof value === 'string') template.directions[key] = value;
  }

  const spokes = asRecord(row.spokes);
  for (const key of SPOKE_KEYS) {
    const raw = asRecord(spokes[key]);
    const entries = Array.isArray(raw.entries) ? (raw.entries as CompassEntry[]) : [];
    template.spokes[key] = {
      version: typeof raw.version === 'number' ? raw.version : 0,
      status: (raw.status as CompassSpokeStatus) ?? (entries.length > 0 ? 'in_progress' : 'empty'),
      entries,
    };
  }
  return template;
}

export async function fetchCompassState(userId: string): Promise<CompassTemplate> {
  if (!canUseSupabaseData()) return emptyTemplate();
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('compass_state')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle<CompassStateRow>();
    if (error) {
      if (import.meta.env.DEV) console.debug('[compass-state] fetch skipped', error.message);
      return emptyTemplate();
    }
    return parseCompassState(data ?? null);
  } catch (error) {
    if (import.meta.env.DEV) console.debug('[compass-state] fetch threw', error);
    return emptyTemplate();
  }
}
