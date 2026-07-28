import type { Session } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../../../../lib/supabaseClient';
import {
  EVENT_IDS,
  type EventId,
  getEventDisplayMeta,
} from './islandRunEventEngine';

export type ArenaSessionPace = 'flash' | 'fast' | 'full';

export interface ArenaMinigamePreferences {
  rankedEventIds: EventId[];
  disabledEventIds: EventId[];
}

export interface ArenaPreferenceRow {
  user_id: string;
  ranked_event_ids: unknown;
  disabled_event_ids: unknown;
}

export const ARENA_DISABLED_FRACTION = 0.25;
export const DEFAULT_ARENA_MINIGAME_PREFERENCES: ArenaMinigamePreferences = {
  rankedEventIds: [...EVENT_IDS],
  disabledEventIds: [],
};

const LOCAL_STORAGE_PREFIX = 'lifegoal.arena-minigame-preferences.v1';

function getArenaPreferencesClient() {
  // The migration ships in this change; generated database.types will learn
  // the table after the remote schema is applied.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseClient() as any;
}

function isEventId(value: unknown): value is EventId {
  return typeof value === 'string' && (EVENT_IDS as readonly string[]).includes(value);
}

export function getArenaDisabledLimit(totalGames = EVENT_IDS.length): number {
  return Math.max(0, Math.floor(Math.max(0, totalGames) * ARENA_DISABLED_FRACTION));
}

export function normalizeArenaPreferences(value: unknown): ArenaMinigamePreferences {
  const input = value && typeof value === 'object' ? value as Partial<ArenaMinigamePreferences> : {};
  const rankedEventIds = Array.isArray(input.rankedEventIds)
    ? input.rankedEventIds.filter(isEventId)
    : [];
  const uniqueRanked = Array.from(new Set(rankedEventIds));
  EVENT_IDS.forEach((eventId) => {
    if (!uniqueRanked.includes(eventId)) uniqueRanked.push(eventId);
  });

  const disabledLimit = getArenaDisabledLimit(EVENT_IDS.length);
  const disabledEventIds = Array.isArray(input.disabledEventIds)
    ? Array.from(new Set(input.disabledEventIds.filter(isEventId))).slice(0, disabledLimit)
    : [];

  return {
    rankedEventIds: uniqueRanked,
    disabledEventIds,
  };
}

export function moveArenaEvent(
  preferences: ArenaMinigamePreferences,
  eventId: EventId,
  direction: -1 | 1,
): ArenaMinigamePreferences {
  const normalized = normalizeArenaPreferences(preferences);
  const currentIndex = normalized.rankedEventIds.indexOf(eventId);
  const nextIndex = Math.max(0, Math.min(normalized.rankedEventIds.length - 1, currentIndex + direction));
  if (currentIndex < 0 || currentIndex === nextIndex) return normalized;
  const rankedEventIds = [...normalized.rankedEventIds];
  [rankedEventIds[currentIndex], rankedEventIds[nextIndex]] = [
    rankedEventIds[nextIndex]!,
    rankedEventIds[currentIndex]!,
  ];
  return { ...normalized, rankedEventIds };
}

export function toggleArenaEvent(
  preferences: ArenaMinigamePreferences,
  eventId: EventId,
): { preferences: ArenaMinigamePreferences; changed: boolean; reason: string | null } {
  const normalized = normalizeArenaPreferences(preferences);
  const isDisabled = normalized.disabledEventIds.includes(eventId);
  if (isDisabled) {
    return {
      preferences: {
        ...normalized,
        disabledEventIds: normalized.disabledEventIds.filter((id) => id !== eventId),
      },
      changed: true,
      reason: null,
    };
  }
  if (normalized.disabledEventIds.length >= getArenaDisabledLimit(EVENT_IDS.length)) {
    return {
      preferences: normalized,
      changed: false,
      reason: 'You can pause one of the four Arena games (25%). Turn another game back on first.',
    };
  }
  return {
    preferences: {
      ...normalized,
      disabledEventIds: [...normalized.disabledEventIds, eventId],
    },
    changed: true,
    reason: null,
  };
}

export function resolveArenaSessionPace(
  preferences: ArenaMinigamePreferences,
  eventId: EventId,
): ArenaSessionPace | null {
  const normalized = normalizeArenaPreferences(preferences);
  if (normalized.disabledEventIds.includes(eventId)) return null;
  const enabled = normalized.rankedEventIds.filter((id) => !normalized.disabledEventIds.includes(id));
  const index = enabled.indexOf(eventId);
  if (index < 0) return 'fast';
  const edgeSize = Math.max(1, Math.ceil(enabled.length * 0.25));
  if (index < edgeSize) return 'full';
  if (index >= enabled.length - edgeSize) return 'flash';
  return 'fast';
}

export function getArenaSessionSeconds(pace: ArenaSessionPace): number | null {
  if (pace === 'flash') return 15;
  if (pace === 'fast') return 45;
  return null;
}

export function getArenaPreferenceRows(preferences: ArenaMinigamePreferences) {
  const normalized = normalizeArenaPreferences(preferences);
  return normalized.rankedEventIds.map((eventId, index) => ({
    eventId,
    rank: index + 1,
    disabled: normalized.disabledEventIds.includes(eventId),
    pace: resolveArenaSessionPace(normalized, eventId),
    ...getEventDisplayMeta(eventId),
  }));
}

function localStorageKey(userId: string): string {
  return `${LOCAL_STORAGE_PREFIX}:${userId}`;
}

function readLocalPreferences(userId: string): ArenaMinigamePreferences {
  if (typeof window === 'undefined') return normalizeArenaPreferences(null);
  try {
    const raw = window.localStorage.getItem(localStorageKey(userId));
    return normalizeArenaPreferences(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeArenaPreferences(null);
  }
}

function writeLocalPreferences(userId: string, preferences: ArenaMinigamePreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(localStorageKey(userId), JSON.stringify(normalizeArenaPreferences(preferences)));
  } catch {
    // Local persistence is best-effort; Supabase remains the cross-device copy.
  }
}

export async function loadArenaMinigamePreferences(
  session: Session,
): Promise<{ preferences: ArenaMinigamePreferences; error: string | null }> {
  const local = readLocalPreferences(session.user.id);
  if (!canUseSupabaseData()) return { preferences: local, error: null };

  const { data, error } = await getArenaPreferencesClient()
    .from('arena_minigame_preferences')
    .select('user_id,ranked_event_ids,disabled_event_ids')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (error) return { preferences: local, error: 'Arena choices could not sync. They are still saved on this phone.' };
  if (!data) return { preferences: local, error: null };

  const row = data as ArenaPreferenceRow;
  const preferences = normalizeArenaPreferences({
    rankedEventIds: row.ranked_event_ids,
    disabledEventIds: row.disabled_event_ids,
  });
  writeLocalPreferences(session.user.id, preferences);
  return { preferences, error: null };
}

export async function saveArenaMinigamePreferences(
  session: Session,
  next: ArenaMinigamePreferences,
): Promise<{ preferences: ArenaMinigamePreferences; error: string | null }> {
  const preferences = normalizeArenaPreferences(next);
  writeLocalPreferences(session.user.id, preferences);
  if (!canUseSupabaseData()) return { preferences, error: null };

  const { error } = await getArenaPreferencesClient()
    .from('arena_minigame_preferences')
    .upsert({
      user_id: session.user.id,
      ranked_event_ids: preferences.rankedEventIds,
      disabled_event_ids: preferences.disabledEventIds,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  return {
    preferences,
    error: error ? 'Saved on this phone, but cross-device Arena sync will retry later.' : null,
  };
}
