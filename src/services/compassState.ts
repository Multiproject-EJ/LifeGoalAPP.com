import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database, Json } from '../lib/database.types';
import { recordGameLifeIntake } from './gameLifeIntake';
import {
  getCompassDirectionForIsland,
  getCompassPhase,
  type CompassDirection,
  type CompassPhase,
  type CompassSpoke,
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

/** Entries needed before a spoke is considered "complete". */
export const COMPASS_SPOKE_COMPLETE_THRESHOLD = 4;

/**
 * A playable Compass session is filled once the current island's Compass box has
 * a saved contribution. During Compass/ikigai phases that means the active
 * direction card is filled; during spoke phases it means that phase's spoke has
 * at least one entry from this island. This lets Island Run landmarks treat the
 * Compass modal as a second, equivalent way to finish the session.
 */
export function isCompassSessionFilledForIsland(template: CompassTemplate, islandNumber: number): boolean {
  const phase = getCompassPhase(islandNumber);
  const direction = getCompassDirectionForIsland(islandNumber);

  if (phase.theme === 'compass' && direction) {
    return Boolean(template.directions[direction]?.trim());
  }

  return template.spokes[phase.spoke].entries.some((entry) => entry.islandNumber === islandNumber);
}

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

function serializeTemplate(template: CompassTemplate): Database['public']['Tables']['compass_state']['Insert'] {
  return {
    user_id: '', // filled by caller
    template_version: template.templateVersion,
    current_phase: template.currentPhase,
    center_statement: template.centerStatement,
    directions: template.directions as Json,
    spokes: template.spokes as unknown as Json,
    completed_phases: template.completedPhases,
    updated_at: new Date().toISOString(),
  };
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

export type RecordCompassContributionInput = {
  userId: string;
  islandNumber: number;
  kind: CompassEntryKind;
  text: string;
  linkedHabitId?: string | null;
};

/**
 * Apply one stop contribution to the Compass template (in-memory), then upsert
 * the whole row, and log the raw signal to game_life_intake. Best-effort: never
 * throws, so it can never block stop completion. Returns the updated template
 * (or the unchanged one on failure) so callers can refresh UI optimistically.
 */
export async function recordCompassContribution(
  input: RecordCompassContributionInput,
): Promise<CompassTemplate> {
  const phase: CompassPhase = getCompassPhase(input.islandNumber);
  const direction = getCompassDirectionForIsland(input.islandNumber) ?? undefined;

  // Always log the raw signal (best-effort, independent of compass_state).
  void recordGameLifeIntake({
    userId: input.userId,
    promptContext: input.kind === 'wisdom' ? 'compass_wisdom' : 'compass_habit',
    islandNumber: input.islandNumber,
    lifeWheelArea: null,
    state: 'completed',
    linkedHabitId: input.linkedHabitId ?? null,
    payload: {
      compass_phase: phase.id,
      spoke: phase.spoke,
      version: phase.version,
      direction: direction ?? null,
      text: input.text,
    },
  });

  const current = await fetchCompassState(input.userId);
  const next = applyContribution(current, {
    phase,
    direction,
    kind: input.kind,
    text: input.text,
    islandNumber: input.islandNumber,
    linkedHabitId: input.linkedHabitId ?? null,
  });

  if (!canUseSupabaseData()) return next;
  try {
    const supabase = getSupabaseClient();
    const row = { ...serializeTemplate(next), user_id: input.userId };
    const { error } = await supabase.from('compass_state').upsert(row, { onConflict: 'user_id' });
    if (error) {
      if (import.meta.env.DEV) console.debug('[compass-state] upsert skipped', error.message);
      return current;
    }
    return next;
  } catch (error) {
    if (import.meta.env.DEV) console.debug('[compass-state] upsert threw', error);
    return current;
  }
}

/**
 * Save the ikigai "True North" center statement. Best-effort; returns the
 * updated template (or the current one on failure).
 */
export async function setCompassCenterStatement(
  userId: string,
  statement: string,
): Promise<CompassTemplate> {
  const current = await fetchCompassState(userId);
  const next: CompassTemplate = { ...current, centerStatement: statement.trim() || null };
  if (!canUseSupabaseData()) return next;
  try {
    const supabase = getSupabaseClient();
    const row = { ...serializeTemplate(next), user_id: userId };
    const { error } = await supabase.from('compass_state').upsert(row, { onConflict: 'user_id' });
    if (error) {
      if (import.meta.env.DEV) console.debug('[compass-state] center upsert skipped', error.message);
      return current;
    }
    return next;
  } catch (error) {
    if (import.meta.env.DEV) console.debug('[compass-state] center upsert threw', error);
    return current;
  }
}

/** Pure reducer: fold one contribution into the template. Exported for tests. */
export function applyContribution(
  template: CompassTemplate,
  contribution: {
    phase: CompassPhase;
    direction?: CompassDirection;
    kind: CompassEntryKind;
    text: string;
    islandNumber: number;
    linkedHabitId?: string | null;
  },
): CompassTemplate {
  const next: CompassTemplate = {
    ...template,
    directions: { ...template.directions },
    spokes: { ...template.spokes },
    completedPhases: [...template.completedPhases],
  };
  const { phase, direction } = contribution;

  next.currentPhase = phase.id;

  const entry: CompassEntry = {
    kind: contribution.kind,
    text: contribution.text,
    islandNumber: contribution.islandNumber,
    phaseId: phase.id,
    spoke: phase.spoke,
    direction,
    linkedHabitId: contribution.linkedHabitId ?? null,
    createdAt: new Date().toISOString(),
  };

  const spoke = next.spokes[phase.spoke];
  const entries = [...spoke.entries, entry];
  const status: CompassSpokeStatus =
    entries.length >= COMPASS_SPOKE_COMPLETE_THRESHOLD ? 'complete' : 'in_progress';
  next.spokes[phase.spoke] = {
    version: Math.max(spoke.version, phase.version),
    status,
    entries,
  };

  // Compass (ikigai) phases capture direction text into the center map.
  if (phase.theme === 'compass' && direction && contribution.text.trim()) {
    next.directions[direction] = contribution.text.trim();
    // Once all four directions are present, mark the template as filled.
    const filled = (['heart', 'craft', 'cause', 'livelihood'] as const).every(
      (key) => typeof next.directions[key] === 'string' && next.directions[key]!.trim().length > 0,
    );
    if (filled && next.templateVersion < phase.version) {
      next.templateVersion = phase.version;
    }
  }

  return next;
}
