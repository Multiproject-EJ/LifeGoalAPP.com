import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database, Json } from '../lib/database.types';
import {
  clearQuestOfflineOverlay,
  markQuestDeletedOffline,
  mergeQuestOfflineLinks,
  mergeQuestOfflineRows,
  readQuestOfflineData,
  upsertQuestOfflineBundle,
  writeQuestOfflineData,
} from '../data/questsOfflineRepo';
import { removeLocalHabitV2Record } from '../data/habitsV2OfflineRepo';
import { putLocalHabitCreateOverlay } from './habitsV2';
import { getMutationQueue } from './offline-queue';
import { guardedCloudCall } from './service-health';
import {
  generateClientId,
  shouldQueueAfterFailure,
  toPostgrestError,
} from './offlineWriteThrough';
import {
  groupQuestHabitTags,
  isQuestVisibleOnDate,
  parseBehaviorDesign,
  parseReflectionPlan,
  parseSmartDefinition,
  type Quest,
  type QuestDraft,
  type QuestHabitRole,
  type QuestHabitTag,
  type QuestReflectionType,
  type QuestStatus,
} from '../features/quests/questModel';

type QuestRow = Database['public']['Tables']['quests']['Row'];
type QuestHabitLinkRow = Database['public']['Tables']['quest_habit_links']['Row'];
type QuestReflectionRow = Database['public']['Tables']['quest_reflections']['Row'];
type HabitV2Insert = Database['public']['Tables']['habits_v2']['Insert'];

type ServiceResponse<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

export type QuestHabitLink = QuestHabitLinkRow;

export type QuestBundleInput = {
  questId?: string;
  draft: QuestDraft;
  links: Array<{ habitId: string; role: QuestHabitRole }>;
  newHabitTitle?: string;
};

export type QuestBundleResult = {
  quest: Quest;
  newHabitId: string | null;
  queued: boolean;
};

export type QuestBundleQueuePayload = {
  quest: QuestRow;
  links: Array<{ habit_id: string; role: QuestHabitRole }>;
  newHabit: (HabitV2Insert & { id: string }) | null;
};

export const QUESTS_CHANGED_EVENT = 'lifegoal:quests-changed';

function announceQuestsChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(QUESTS_CHANGED_EVENT));
}

function toJson(value: unknown): Json {
  return value as Json;
}

export function mapQuestRow(row: QuestRow): Quest {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    campaignId: row.campaign_id,
    title: row.title,
    outcome: row.outcome,
    kind: row.quest_kind,
    status: row.status,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    lifeWheelCategory: row.life_wheel_category,
    smartDefinition: parseSmartDefinition(row.smart_definition),
    behaviorDesign: parseBehaviorDesign(row.behavior_design),
    reflectionPlan: parseReflectionPlan(row.reflection_plan),
    sourceCompassChapterId: row.source_compass_chapter_id,
    sourceCompassActivityId: row.source_compass_activity_id,
    completedAt: row.completed_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function questToRow(userId: string, draft: QuestDraft, id: string): QuestRow {
  const now = new Date().toISOString();
  const existing = readQuestOfflineData().quests.find((quest) => quest.id === id && quest.user_id === userId);
  return {
    id,
    user_id: userId,
    goal_id: draft.goalId,
    campaign_id: draft.campaignId,
    title: draft.title.trim(),
    outcome: draft.outcome.trim(),
    quest_kind: draft.kind,
    status: draft.status,
    starts_on: draft.startsOn,
    ends_on: draft.endsOn,
    life_wheel_category: draft.lifeWheelCategory,
    smart_definition: toJson(draft.smartDefinition),
    behavior_design: toJson(draft.behaviorDesign),
    reflection_plan: toJson(draft.reflectionPlan),
    source_compass_chapter_id: draft.sourceCompassChapterId,
    source_compass_activity_id: draft.sourceCompassActivityId,
    completed_at: draft.status === 'completed' ? existing?.completed_at ?? now : null,
    archived_at: draft.status === 'archived' ? existing?.archived_at ?? now : null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
}

function localLinksForBundle(
  userId: string,
  questId: string,
  links: Array<{ habit_id: string; role: QuestHabitRole }>,
): QuestHabitLinkRow[] {
  const now = new Date().toISOString();
  const existingByHabitId = new Map(
    readQuestOfflineData().links
      .filter((link) => link.quest_id === questId)
      .map((link) => [link.habit_id, link]),
  );
  return links.map((link) => ({
    id: existingByHabitId.get(link.habit_id)?.id ?? generateClientId(),
    user_id: userId,
    quest_id: questId,
    habit_id: link.habit_id,
    role: link.role,
    created_at: existingByHabitId.get(link.habit_id)?.created_at ?? now,
  }));
}

function localQuestRows(userId: string, statuses?: QuestStatus[]): QuestRow[] {
  return mergeQuestOfflineRows(userId, [])
    .filter((quest) => quest.user_id === userId)
    .filter((quest) => !statuses || statuses.includes(quest.status));
}

export async function fetchQuests(
  userId: string,
  statuses?: QuestStatus[],
): Promise<ServiceResponse<Quest[]>> {
  if (!canUseSupabaseData()) {
    return { data: localQuestRows(userId, statuses).map(mapQuestRow), error: null };
  }

  const result = await guardedCloudCall('database', async () => {
    const response = await getSupabaseClient()
      .from('quests')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (response.error) throw response.error;
    return response.data ?? [];
  });
  if (!result.ok) {
    if (shouldQueueAfterFailure(result.error)) {
      return { data: localQuestRows(userId, statuses).map(mapQuestRow), error: null };
    }
    return { data: null, error: toPostgrestError(result.error) };
  }
  const rows = mergeQuestOfflineRows(userId, result.data)
    .filter((quest) => !statuses || statuses.includes(quest.status));
  return { data: rows.map(mapQuestRow), error: null };
}

/**
 * Saves the Quest, its complete desired habit-link set, and an optional new
 * habit in one database transaction. A recoverable outage writes the same
 * full-state bundle to the durable queue and local overlays.
 */
export async function saveQuestBundle(
  userId: string,
  input: QuestBundleInput,
): Promise<ServiceResponse<QuestBundleResult>> {
  const questId = input.questId ?? generateClientId();
  const newHabitTitle = input.newHabitTitle?.trim() ?? '';
  const newHabitId = newHabitTitle ? generateClientId() : null;
  const selectedHabitIds = new Set(input.links.map((link) => link.habitId));
  if (newHabitId) selectedHabitIds.add(newHabitId);
  const requestedKeystoneId = input.draft.behaviorDesign.keystoneHabitId;
  const linkedKeystoneId = input.links.find((link) => link.role === 'keystone')?.habitId ?? null;
  const finalKeystoneId = requestedKeystoneId && selectedHabitIds.has(requestedKeystoneId)
    ? requestedKeystoneId
    : linkedKeystoneId && selectedHabitIds.has(linkedKeystoneId)
      ? linkedKeystoneId
      : newHabitId;

  const draft: QuestDraft = {
    ...input.draft,
    behaviorDesign: {
      ...input.draft.behaviorDesign,
      keystoneHabitId: finalKeystoneId,
    },
  };
  const quest = questToRow(userId, draft, questId);
  const links = Array.from(selectedHabitIds, (habit_id) => ({
    habit_id,
    role: habit_id === finalKeystoneId ? 'keystone' as const : 'supporting' as const,
  }));
  const localLinks = localLinksForBundle(userId, questId, links);
  const newHabit: (HabitV2Insert & { id: string }) | null = newHabitId ? {
    id: newHabitId,
    user_id: userId,
    title: newHabitTitle,
    emoji: '🧭',
    type: 'boolean',
    status: 'active',
    schedule: { mode: 'daily' },
    start_date: draft.startsOn ?? new Date().toISOString().slice(0, 10),
    archived: false,
    goal_id: draft.goalId,
    habit_intent: `Quest habit for ${draft.title}`,
  } : null;
  const payload: QuestBundleQueuePayload = { quest, links, newHabit };

  const persistOptimistic = async (queued: boolean): Promise<QuestBundleResult> => {
    upsertQuestOfflineBundle(quest, localLinks);
    if (newHabit) await putLocalHabitCreateOverlay(newHabit);
    announceQuestsChanged();
    return { quest: mapQuestRow(quest), newHabitId, queued };
  };

  if (!canUseSupabaseData()) {
    return { data: await persistOptimistic(false), error: null };
  }

  const result = await guardedCloudCall('database', async () => {
    const response = await getSupabaseClient().rpc('save_quest_bundle', {
      p_quest: toJson(quest),
      p_links: toJson(links),
      p_new_habit: newHabit ? toJson(newHabit) : null,
    });
    if (response.error) throw response.error;
    return response.data as QuestRow;
  });
  if (!result.ok) {
    if (!shouldQueueAfterFailure(result.error)) {
      return { data: null, error: toPostgrestError(result.error) };
    }
    const optimistic = await persistOptimistic(true);
    await getMutationQueue().enqueue({
      feature: 'quests',
      operation: 'quest.bundle.save',
      payload,
      dedupeKey: questId,
    });
    return { data: optimistic, error: null };
  }

  clearQuestOfflineOverlay(questId);
  if (newHabitId) await removeLocalHabitV2Record(newHabitId);
  announceQuestsChanged();
  return {
    data: { quest: mapQuestRow(result.data), newHabitId, queued: false },
    error: null,
  };
}

export async function deleteQuest(userId: string, questId: string): Promise<ServiceResponse<Quest>> {
  const optimisticRow = readQuestOfflineData().quests.find((quest) => (
    quest.id === questId && quest.user_id === userId
  )) ?? null;
  if (!canUseSupabaseData()) {
    const removed = markQuestDeletedOffline(userId, questId);
    announceQuestsChanged();
    return { data: removed ? mapQuestRow(removed) : null, error: null };
  }

  const result = await guardedCloudCall('database', async () => {
    const response = await getSupabaseClient()
      .from('quests')
      .delete()
      .eq('id', questId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();
    if (response.error) throw response.error;
    return response.data;
  });
  if (!result.ok) {
    if (!shouldQueueAfterFailure(result.error)) {
      return { data: null, error: toPostgrestError(result.error) };
    }
    markQuestDeletedOffline(userId, questId);
    await getMutationQueue().enqueue({
      feature: 'quests',
      operation: 'quest.delete',
      payload: { userId, questId },
      dedupeKey: questId,
    });
    announceQuestsChanged();
    return { data: optimisticRow ? mapQuestRow(optimisticRow) : null, error: null };
  }
  clearQuestOfflineOverlay(questId);
  announceQuestsChanged();
  return { data: result.data ? mapQuestRow(result.data) : null, error: null };
}

export async function fetchQuestHabitLinks(
  userId: string,
  questId?: string,
): Promise<ServiceResponse<QuestHabitLink[]>> {
  const localOnly = () => mergeQuestOfflineLinks(userId, [])
    .filter((link) => !questId || link.quest_id === questId);
  if (!canUseSupabaseData()) return { data: localOnly(), error: null };

  const result = await guardedCloudCall('database', async () => {
    const response = await getSupabaseClient()
      .from('quest_habit_links')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (response.error) throw response.error;
    return response.data ?? [];
  });
  if (!result.ok) {
    if (shouldQueueAfterFailure(result.error)) return { data: localOnly(), error: null };
    return { data: null, error: toPostgrestError(result.error) };
  }
  const links = mergeQuestOfflineLinks(userId, result.data)
    .filter((link) => !questId || link.quest_id === questId);
  return { data: links, error: null };
}

export async function fetchQuestHabitTags(
  userId: string,
  date = new Date().toISOString().slice(0, 10),
): Promise<ServiceResponse<Record<string, QuestHabitTag[]>>> {
  const [questsResult, linksResult] = await Promise.all([
    fetchQuests(userId, ['active', 'paused', 'completed']),
    fetchQuestHabitLinks(userId),
  ]);
  if (questsResult.error || linksResult.error || !questsResult.data || !linksResult.data) {
    return { data: null, error: questsResult.error ?? linksResult.error };
  }
  const visibleQuests = questsResult.data.filter((quest) => isQuestVisibleOnDate(quest, date));
  const questById = new Map(visibleQuests.map((quest) => [quest.id, quest]));
  return {
    data: groupQuestHabitTags(linksResult.data.flatMap((link) => {
      const quest = questById.get(link.quest_id);
      if (!quest) return [];
      return [{
        habitId: link.habit_id,
        tag: {
          questId: quest.id,
          questTitle: quest.title,
          role: link.role,
          status: quest.status,
          startsOn: quest.startsOn,
          endsOn: quest.endsOn,
          lifeWheelCategory: quest.lifeWheelCategory,
        },
      }];
    })),
    error: null,
  };
}

export async function addQuestReflection(
  userId: string,
  questId: string,
  reflectionType: QuestReflectionType,
  content: string,
  options: { loopObservation?: Json; nextExperiment?: string | null } = {},
): Promise<ServiceResponse<QuestReflectionRow>> {
  const payload: Database['public']['Tables']['quest_reflections']['Insert'] = {
    user_id: userId,
    quest_id: questId,
    reflection_type: reflectionType,
    content: content.trim(),
    loop_observation: options.loopObservation ?? {},
    next_experiment: options.nextExperiment?.trim() || null,
  };
  if (!canUseSupabaseData()) {
    const local = readQuestOfflineData();
    const row: QuestReflectionRow = {
      id: generateClientId(),
      user_id: userId,
      quest_id: questId,
      reflection_type: reflectionType,
      content: payload.content ?? '',
      loop_observation: payload.loop_observation ?? {},
      next_experiment: payload.next_experiment ?? null,
      created_at: new Date().toISOString(),
    };
    local.reflections.push(row);
    writeQuestOfflineData(local);
    return { data: row, error: null };
  }

  const { data, error } = await getSupabaseClient()
    .from('quest_reflections')
    .insert(payload)
    .select('*')
    .single();
  return { data, error };
}
