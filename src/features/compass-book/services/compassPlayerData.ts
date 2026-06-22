/**
 * Loads the player's real goals and habits (offline-first) and maps them to
 * compact compass pick options. Read-only: it never creates, updates, or deletes
 * goals/habits. Every read is defensive — any failure degrades to an empty list
 * so a fragment simply shows no chips and falls back to plain text entry.
 */

import { loadGoalsOfflineFirst } from '../../../data/goalsRepo';
import { listLocalHabitsV2ForUser } from '../../../data/habitsV2OfflineRepo';
import {
  EMPTY_COMPASS_PLAYER_DATA,
  normalizePlayerOptions,
  type CompassPlayerData,
  type CompassPlayerOption,
} from '../logic/playerOptions';

export async function loadCompassPlayerData(
  userId: string | null | undefined,
): Promise<CompassPlayerData> {
  if (!userId) return EMPTY_COMPASS_PLAYER_DATA;
  const [goals, habits] = await Promise.all([loadGoalOptions(userId), loadHabitOptions(userId)]);
  return { goals, habits };
}

async function loadGoalOptions(userId: string): Promise<CompassPlayerOption[]> {
  try {
    const records = await loadGoalsOfflineFirst(userId);
    return normalizePlayerOptions(
      records
        .filter((goal) => !goal._deleted)
        .map((goal) => ({ id: goal.id, label: goal.title })),
    );
  } catch {
    return [];
  }
}

async function loadHabitOptions(userId: string): Promise<CompassPlayerOption[]> {
  try {
    const records = await listLocalHabitsV2ForUser(userId);
    return normalizePlayerOptions(
      records
        .filter((record) => record.sync_state !== 'pending_archive')
        .map((record) => ({ id: record.row.id, label: record.row.title })),
    );
  } catch {
    return [];
  }
}
