import type { Database } from '../lib/database.types';

export type QuestOfflineRow = Database['public']['Tables']['quests']['Row'];
export type QuestHabitLinkOfflineRow = Database['public']['Tables']['quest_habit_links']['Row'];
export type QuestReflectionOfflineRow = Database['public']['Tables']['quest_reflections']['Row'];

export type QuestOfflineData = {
  quests: QuestOfflineRow[];
  links: QuestHabitLinkOfflineRow[];
  reflections: QuestReflectionOfflineRow[];
  deletedQuestIds: string[];
};

const LOCAL_QUESTS_KEY = 'lifegoal.quests.demo.v1';

export function readQuestOfflineData(): QuestOfflineData {
  if (typeof window === 'undefined') return { quests: [], links: [], reflections: [], deletedQuestIds: [] };
  try {
    const value = JSON.parse(window.localStorage.getItem(LOCAL_QUESTS_KEY) ?? '{}') as Partial<QuestOfflineData>;
    return {
      quests: Array.isArray(value.quests) ? value.quests : [],
      links: Array.isArray(value.links) ? value.links : [],
      reflections: Array.isArray(value.reflections) ? value.reflections : [],
      deletedQuestIds: Array.isArray(value.deletedQuestIds) ? value.deletedQuestIds : [],
    };
  } catch {
    return { quests: [], links: [], reflections: [], deletedQuestIds: [] };
  }
}

export function writeQuestOfflineData(value: QuestOfflineData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_QUESTS_KEY, JSON.stringify(value));
  } catch {
    // The durable mutation queue remains the source of truth if the optional
    // display overlay cannot be persisted (for example, storage quota).
  }
}

export function upsertQuestOfflineBundle(
  quest: QuestOfflineRow,
  links: QuestHabitLinkOfflineRow[],
): void {
  const local = readQuestOfflineData();
  local.quests = [...local.quests.filter((row) => row.id !== quest.id), quest];
  local.links = [...local.links.filter((link) => link.quest_id !== quest.id), ...links];
  local.deletedQuestIds = local.deletedQuestIds.filter((id) => id !== quest.id);
  writeQuestOfflineData(local);
}

export function upsertQuestOfflineRow(quest: QuestOfflineRow): void {
  const local = readQuestOfflineData();
  local.quests = [...local.quests.filter((row) => row.id !== quest.id), quest];
  local.deletedQuestIds = local.deletedQuestIds.filter((id) => id !== quest.id);
  writeQuestOfflineData(local);
}

export function markQuestDeletedOffline(userId: string, questId: string): QuestOfflineRow | null {
  const local = readQuestOfflineData();
  const removed = local.quests.find((quest) => quest.id === questId && quest.user_id === userId) ?? null;
  local.quests = local.quests.filter((quest) => quest.id !== questId);
  local.links = local.links.filter((link) => link.quest_id !== questId);
  local.reflections = local.reflections.filter((reflection) => reflection.quest_id !== questId);
  if (!local.deletedQuestIds.includes(questId)) local.deletedQuestIds.push(questId);
  writeQuestOfflineData(local);
  return removed;
}

export function clearQuestOfflineOverlay(questId: string): void {
  const local = readQuestOfflineData();
  local.quests = local.quests.filter((quest) => quest.id !== questId);
  local.links = local.links.filter((link) => link.quest_id !== questId);
  local.deletedQuestIds = local.deletedQuestIds.filter((id) => id !== questId);
  writeQuestOfflineData(local);
}

export function mergeQuestOfflineRows(
  userId: string,
  remote: QuestOfflineRow[],
): QuestOfflineRow[] {
  const local = readQuestOfflineData();
  const deleted = new Set(local.deletedQuestIds);
  const byId = new Map(remote.filter((quest) => !deleted.has(quest.id)).map((quest) => [quest.id, quest]));
  for (const quest of local.quests.filter((row) => row.user_id === userId)) byId.set(quest.id, quest);
  return Array.from(byId.values()).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function mergeQuestOfflineLinks(
  userId: string,
  remote: QuestHabitLinkOfflineRow[],
): QuestHabitLinkOfflineRow[] {
  const local = readQuestOfflineData();
  const localQuestIds = new Set(local.quests.filter((quest) => quest.user_id === userId).map((quest) => quest.id));
  return [
    ...remote.filter((link) => !localQuestIds.has(link.quest_id) && !local.deletedQuestIds.includes(link.quest_id)),
    ...local.links.filter((link) => link.user_id === userId),
  ];
}
