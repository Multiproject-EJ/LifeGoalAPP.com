import {
  fetchHabitReminderPrefs,
  updateHabitReminderPref,
  type HabitWithReminderPref,
} from './habitReminderPrefs';
import {
  enableNativeAlertPackage,
  isNativeNotifications,
  notifyNativeAlertsChanged,
} from './nativeNotifications';

export const QUICK_ITEM_REMINDERS_CHANGED = 'habitgame:quick-item-reminders-changed';
export const SELECTED_REMINDER_LIMIT = 12;

export type NativeTodoReminderPreference = {
  todoId: string;
  title: string;
  todoDate: string;
  time: string;
  at: number;
  updatedAt: number;
};

export type QuickReminderPermission = 'granted' | 'denied' | 'web';

const todoStorageKey = (userId: string) => `habitgame:selected-todo-reminders:v1:${userId}`;

function emitReminderChanges(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(QUICK_ITEM_REMINDERS_CHANGED));
  notifyNativeAlertsChanged();
}

export function normalizeReminderTime(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function reminderDateTime(todoDate: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todoDate)) return null;
  const normalized = normalizeReminderTime(time);
  if (!normalized) return null;
  const [hour, minute] = normalized.split(':').map(Number);
  const candidate = new Date(`${todoDate}T00:00:00`);
  if (!Number.isFinite(candidate.getTime())) return null;
  candidate.setHours(hour, minute, 0, 0);
  return candidate;
}

export function suggestedReminderTime(kind: 'habit' | 'todo', todoDate?: string, now = new Date()): string {
  if (kind === 'habit') return '08:00';
  const candidate = new Date(now);
  candidate.setMinutes(0, 0, 0);
  candidate.setHours(candidate.getHours() + 1);
  if (todoDate && todoDate !== localDateKey(now)) return '09:00';
  return `${String(candidate.getHours()).padStart(2, '0')}:00`;
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isTodoReminderPreference(value: unknown): value is NativeTodoReminderPreference {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<NativeTodoReminderPreference>;
  return typeof record.todoId === 'string'
    && typeof record.title === 'string'
    && typeof record.todoDate === 'string'
    && normalizeReminderTime(record.time ?? '') !== null
    && typeof record.at === 'number'
    && Number.isFinite(record.at)
    && typeof record.updatedAt === 'number'
    && Number.isFinite(record.updatedAt);
}

export function readNativeTodoReminderPreferences(userId: string): Record<string, NativeTodoReminderPreference> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(todoStorageKey(userId)) ?? '{}') as Record<string, unknown>;
    const now = Date.now();
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => isTodoReminderPreference(value) && value.at > now),
    ) as Record<string, NativeTodoReminderPreference>;
  } catch {
    return {};
  }
}

function writeNativeTodoReminderPreferences(
  userId: string,
  reminders: Record<string, NativeTodoReminderPreference>,
): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(todoStorageKey(userId), JSON.stringify(reminders));
}

async function enableSelectedAlerts(userId: string): Promise<QuickReminderPermission> {
  if (!isNativeNotifications()) return 'web';
  const permission = await enableNativeAlertPackage(userId, 'selected');
  return permission === 'granted' ? 'granted' : 'denied';
}

async function assertSelectedReminderCapacity(
  userId: string,
  kind: 'habit' | 'todo',
  itemId: string,
): Promise<void> {
  if (!isNativeNotifications()) return;
  const todos = readNativeTodoReminderPreferences(userId);
  if (kind === 'todo' && Boolean(todos[itemId])) return;
  const habits = await loadHabitQuickReminders();
  const alreadySelected = kind === 'habit'
    ? Boolean(habits[itemId]?.enabled && habits[itemId]?.preferred_time)
    : false;
  if (alreadySelected) return;
  const selectedCount = Object.values(habits).filter((preference) => (
    preference.enabled && Boolean(preference.preferred_time)
  )).length + Object.keys(todos).length;
  if (selectedCount >= SELECTED_REMINDER_LIMIT) {
    throw new Error(`This iPhone can keep ${SELECTED_REMINDER_LIMIT} chosen habit and todo alerts. Clear one first.`);
  }
}

export async function loadHabitQuickReminders(): Promise<Record<string, HabitWithReminderPref>> {
  const { data, error } = await fetchHabitReminderPrefs();
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((preference) => [preference.habit_id, preference]));
}

export async function saveHabitQuickReminder(
  userId: string,
  habitId: string,
  time: string,
): Promise<{ time: string; permission: QuickReminderPermission }> {
  const normalized = normalizeReminderTime(time);
  if (!normalized) throw new Error('Choose a valid reminder time.');
  await assertSelectedReminderCapacity(userId, 'habit', habitId);
  const { error } = await updateHabitReminderPref(habitId, {
    enabled: true,
    preferred_time: normalized,
  });
  if (error) throw error;
  const permission = await enableSelectedAlerts(userId);
  emitReminderChanges();
  return { time: normalized, permission };
}

export async function clearHabitQuickReminder(userId: string, habitId: string): Promise<void> {
  const { error } = await updateHabitReminderPref(habitId, {
    enabled: false,
    preferred_time: null,
  });
  if (error) throw error;
  void userId;
  emitReminderChanges();
}

export async function saveTodoQuickReminder(input: {
  userId: string;
  todoId: string;
  title: string;
  todoDate: string;
  time: string;
  now?: Date;
}): Promise<{ reminder: NativeTodoReminderPreference; permission: QuickReminderPermission }> {
  if (!isNativeNotifications()) {
    throw new Error('Todo alerts are available in the HabitGame iPhone app.');
  }
  const normalized = normalizeReminderTime(input.time);
  const at = normalized ? reminderDateTime(input.todoDate, normalized) : null;
  const now = input.now ?? new Date();
  if (!normalized || !at) throw new Error('Choose a valid reminder time.');
  if (at.getTime() <= now.getTime() + 30_000) {
    throw new Error('Choose a future time for this todo.');
  }
  await assertSelectedReminderCapacity(input.userId, 'todo', input.todoId);
  const reminder: NativeTodoReminderPreference = {
    todoId: input.todoId,
    // Keep exact todo text out of device storage and lock-screen previews.
    title: 'Todo reminder',
    todoDate: input.todoDate,
    time: normalized,
    at: at.getTime(),
    updatedAt: Date.now(),
  };
  writeNativeTodoReminderPreferences(input.userId, {
    ...readNativeTodoReminderPreferences(input.userId),
    [input.todoId]: reminder,
  });
  const permission = await enableSelectedAlerts(input.userId);
  emitReminderChanges();
  return { reminder, permission };
}

export function clearTodoQuickReminder(userId: string, todoId: string): void {
  const reminders = readNativeTodoReminderPreferences(userId);
  if (!(todoId in reminders)) return;
  delete reminders[todoId];
  writeNativeTodoReminderPreferences(userId, reminders);
  emitReminderChanges();
}

export function formatReminderTime(time: string | null | undefined): string {
  return normalizeReminderTime(time ?? '') ?? '';
}
