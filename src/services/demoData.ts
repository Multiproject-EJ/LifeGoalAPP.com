import type { Json } from '../lib/database.types';
import type {
  Database,
} from '../lib/database.types';

export type GoalRow = Database['public']['Tables']['goals']['Row'];
export type GoalInsert = Database['public']['Tables']['goals']['Insert'];
export type GoalUpdate = Database['public']['Tables']['goals']['Update'];
export type HabitRow = Database['public']['Tables']['habits']['Row'];
export type HabitInsert = Database['public']['Tables']['habits']['Insert'];
export type HabitUpdate = Database['public']['Tables']['habits']['Update'];
export type HabitLogRow = Database['public']['Tables']['habit_logs']['Row'];
export type HabitLogInsert = Database['public']['Tables']['habit_logs']['Insert'];
export type VisionImageRow = Database['public']['Tables']['vision_images']['Row'];
export type VisionImageInsert = Database['public']['Tables']['vision_images']['Insert'];
export type VisionImageUpdate = Database['public']['Tables']['vision_images']['Update'];
export type CheckinRow = Database['public']['Tables']['checkins']['Row'];
export type CheckinInsert = Database['public']['Tables']['checkins']['Insert'];
export type CheckinUpdate = Database['public']['Tables']['checkins']['Update'];
export type NotificationPreferencesRow = Database['public']['Tables']['notification_preferences']['Row'];
export type NotificationPreferencesInsert = Database['public']['Tables']['notification_preferences']['Insert'];
export type NotificationPreferencesUpdate = Database['public']['Tables']['notification_preferences']['Update'];

export const DEMO_USER_ID = 'demo-user-0001';
export const DEMO_USER_EMAIL = 'demo@lifegoalapp.com';
export const DEMO_USER_NAME = 'Demo Creator';

const STORAGE_KEY = 'lifegoalapp-demo-db-v1';

type DemoState = {
  goals: GoalRow[];
  habits: HabitRow[];
  habitLogs: HabitLogRow[];
  visionImages: VisionImageRow[];
  checkins: CheckinRow[];
  notificationPreferences: NotificationPreferencesRow | null;
};

type StructuredCloneFn = <T>(value: T) => T;

const structuredCloneFn: StructuredCloneFn | undefined =
  typeof globalThis.structuredClone === 'function' ? globalThis.structuredClone : undefined;

function clone<T>(value: T): T {
  if (structuredCloneFn) {
    return structuredCloneFn(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  const random = Math.random().toString(16).slice(2, 10);
  return `${prefix}-${random}`;
}

const today = new Date();
const iso = (date: Date) => date.toISOString();

const defaultState: DemoState = {
  goals: [
    {
      id: createId('goal'),
      user_id: DEMO_USER_ID,
      title: 'Launch the LifeGoal beta cohort',
      description: 'Invite 25 early adopters, gather feedback, and iterate on the habit tracker experience.',
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 2, 4)),
      target_date: iso(new Date(today.getFullYear(), today.getMonth() + 1, 15)),
    },
    {
      id: createId('goal'),
      user_id: DEMO_USER_ID,
      title: 'Design the 2024 vision board refresh',
      description: 'Collect inspiring imagery, craft narrative captions, and share with accountability partners.',
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 1, 12)),
      target_date: iso(new Date(today.getFullYear(), today.getMonth() + 2, 1)),
    },
  ],
  habits: [],
  habitLogs: [],
  visionImages: [],
  checkins: [],
  notificationPreferences: null,
};

// Populate habits and dependent tables once goals exist so references align.
(function seedRelatedData() {
  const goalLaunch = defaultState.goals[0];
  const goalVision = defaultState.goals[1];

  const morningRitualId = createId('habit');
  const outreachHabitId = createId('habit');
  const visionBoardId = createId('habit');

  defaultState.habits = [
    {
      id: morningRitualId,
      goal_id: goalLaunch.id,
      name: 'Morning focus ritual',
      frequency: 'daily',
      schedule: { type: 'daily' } as Json,
    },
    {
      id: outreachHabitId,
      goal_id: goalLaunch.id,
      name: 'Reach out to a beta tester',
      frequency: 'weekly',
      schedule: { type: 'weekly', days: ['mon', 'wed', 'fri'] } as Json,
    },
    {
      id: visionBoardId,
      goal_id: goalVision.id,
      name: 'Source a new inspiration image',
      frequency: 'weekly',
      schedule: { type: 'weekly', days: ['sat'] } as Json,
    },
  ];

  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateIso = date.toISOString().slice(0, 10);
    defaultState.habitLogs.push(
      {
        id: createId('habit-log'),
        habit_id: morningRitualId,
        date: dateIso,
        completed: i % 7 !== 2,
      },
      {
        id: createId('habit-log'),
        habit_id: outreachHabitId,
        date: dateIso,
        completed: i % 3 === 0,
      },
    );
  }

  defaultState.visionImages = [
    {
      id: createId('vision'),
      user_id: DEMO_USER_ID,
      image_path: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80',
      caption: 'Morning deep work setup to stay consistent with focus ritual.',
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 1, 5)),
    },
    {
      id: createId('vision'),
      user_id: DEMO_USER_ID,
      image_path: 'https://images.unsplash.com/photo-1487014679447-9f8336841d58?auto=format&fit=crop&w=800&q=80',
      caption: 'Community celebration after the beta launch milestone.',
      created_at: iso(new Date(today.getFullYear(), today.getMonth() - 1, 20)),
    },
  ];

  defaultState.checkins = [
    {
      id: createId('checkin'),
      user_id: DEMO_USER_ID,
      date: iso(new Date(today.getFullYear(), today.getMonth() - 2, 1)),
      scores: {
        health: 7,
        relationships: 6,
        career: 8,
        personal_growth: 7,
        fun: 5,
        finances: 6,
        giving_back: 4,
        environment: 8,
      },
    },
    {
      id: createId('checkin'),
      user_id: DEMO_USER_ID,
      date: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      scores: {
        health: 8,
        relationships: 7,
        career: 8,
        personal_growth: 8,
        fun: 6,
        finances: 6,
        giving_back: 5,
        environment: 8,
      },
    },
    {
      id: createId('checkin'),
      user_id: DEMO_USER_ID,
      date: iso(new Date(today.getFullYear(), today.getMonth(), 1)),
      scores: {
        health: 8,
        relationships: 8,
        career: 9,
        personal_growth: 8,
        fun: 6,
        finances: 7,
        giving_back: 6,
        environment: 8,
      },
    },
  ];

  defaultState.notificationPreferences = {
    user_id: DEMO_USER_ID,
    habit_reminders_enabled: true,
    habit_reminder_time: '08:00',
    checkin_nudges_enabled: true,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
    subscription: null,
    created_at: iso(new Date(today.getFullYear(), today.getMonth() - 2, 12)),
    updated_at: iso(new Date(today.getFullYear(), today.getMonth(), 2)),
  };
})();

function loadState(): DemoState {
  if (typeof window === 'undefined') {
    return clone(defaultState);
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return clone(defaultState);
    }
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    return {
      goals: parsed.goals ?? clone(defaultState.goals),
      habits: parsed.habits ?? clone(defaultState.habits),
      habitLogs: parsed.habitLogs ?? clone(defaultState.habitLogs),
      visionImages: parsed.visionImages ?? clone(defaultState.visionImages),
      checkins: parsed.checkins ?? clone(defaultState.checkins),
      notificationPreferences:
        parsed.notificationPreferences ?? clone(defaultState.notificationPreferences),
    } satisfies DemoState;
  } catch (error) {
    console.warn('Unable to parse demo data state, falling back to defaults.', error);
    return clone(defaultState);
  }
}

let state = loadState();

function persist() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Unable to persist demo data to localStorage.', error);
  }
}

type StateUpdater<T> = (current: T) => T;

function updateState(updater: StateUpdater<DemoState>) {
  state = updater(state);
  persist();
}

function sortByDateDesc<T extends { created_at?: string | null; date?: string | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aDate = (a.created_at ?? a.date ?? '') as string;
    const bDate = (b.created_at ?? b.date ?? '') as string;
    return aDate > bDate ? -1 : aDate < bDate ? 1 : 0;
  });
}

export function getDemoGoals(userId: string): GoalRow[] {
  return clone(sortByDateDesc(state.goals.filter((goal) => goal.user_id === userId)));
}

export function addDemoGoal(payload: GoalInsert): GoalRow {
  const record: GoalRow = {
    id: payload.id ?? createId('goal'),
    user_id: payload.user_id,
    title: payload.title,
    description: payload.description ?? null,
    created_at: payload.created_at ?? new Date().toISOString(),
    target_date: payload.target_date ?? null,
  };

  updateState((current) => ({ ...current, goals: [record, ...current.goals] }));
  return clone(record);
}

export function updateDemoGoal(id: string, payload: GoalUpdate): GoalRow | null {
  let updated: GoalRow | null = null;
  updateState((current) => {
    const goals = current.goals.map((goal) => {
      if (goal.id !== id) return goal;
      updated = {
        ...goal,
        ...payload,
        description: payload.description ?? goal.description,
        target_date: payload.target_date ?? goal.target_date,
      };
      return updated;
    });
    return { ...current, goals };
  });
  return updated ? clone(updated) : null;
}

export function removeDemoGoal(id: string): GoalRow | null {
  let removed: GoalRow | null = null;
  updateState((current) => {
    const goals = current.goals.filter((goal) => {
      if (goal.id === id) {
        removed = goal;
        return false;
      }
      return true;
    });
    const habits = current.habits.filter((habit) => habit.goal_id !== id);
    const habitIds = new Set(habits.map((habit) => habit.id));
    const habitLogs = current.habitLogs.filter((log) => habitIds.has(log.habit_id));
    return { ...current, goals, habits, habitLogs };
  });
  return removed ? clone(removed) : null;
}

export function getDemoHabitsByGoal(goalId: string): HabitRow[] {
  return clone(state.habits.filter((habit) => habit.goal_id === goalId).sort((a, b) => a.name.localeCompare(b.name)));
}

export function getDemoHabitsForUser(userId: string): HabitRow[] {
  const goalIds = new Set(state.goals.filter((goal) => goal.user_id === userId).map((goal) => goal.id));
  return clone(state.habits.filter((habit) => goalIds.has(habit.goal_id)).sort((a, b) => a.name.localeCompare(b.name)));
}

export function upsertDemoHabit(payload: HabitInsert | HabitUpdate): HabitRow {
  let nextRecord: HabitRow | null = null;
  updateState((current) => {
    const habits = [...current.habits];
    if (payload.id) {
      const index = habits.findIndex((habit) => habit.id === payload.id);
      if (index >= 0) {
        const existing = habits[index];
        nextRecord = {
          ...existing,
          ...payload,
          schedule: (payload.schedule ?? existing.schedule) as Json,
        };
        habits[index] = nextRecord;
        return { ...current, habits };
      }
    }

    nextRecord = {
      id: payload.id ?? createId('habit'),
      goal_id: payload.goal_id ?? (payload as HabitInsert).goal_id,
      name: payload.name ?? (payload as HabitInsert).name,
      frequency: payload.frequency ?? (payload as HabitInsert).frequency,
      schedule: (payload.schedule ?? null) as Json,
    };
    habits.push(nextRecord);
    habits.sort((a, b) => a.name.localeCompare(b.name));
    return { ...current, habits };
  });

  if (!nextRecord) {
    throw new Error('Unable to resolve habit payload.');
  }

  return clone(nextRecord);
}

export function removeDemoHabit(id: string): HabitRow | null {
  let removed: HabitRow | null = null;
  updateState((current) => {
    const habits = current.habits.filter((habit) => {
      if (habit.id === id) {
        removed = habit;
        return false;
      }
      return true;
    });
    const habitLogs = current.habitLogs.filter((log) => log.habit_id !== id);
    return { ...current, habits, habitLogs };
  });
  return removed ? clone(removed) : null;
}

export function logDemoHabitCompletion(payload: HabitLogInsert): HabitLogRow {
  const record: HabitLogRow = {
    id: payload.id ?? createId('habit-log'),
    habit_id: payload.habit_id,
    date: payload.date,
    completed: payload.completed ?? true,
  };
  updateState((current) => ({ ...current, habitLogs: [...current.habitLogs, record] }));
  return clone(record);
}

export function clearDemoHabitCompletion(habitId: string, date: string): HabitLogRow | null {
  let removed: HabitLogRow | null = null;
  updateState((current) => {
    const habitLogs = current.habitLogs.filter((log) => {
      if (log.habit_id === habitId && log.date === date) {
        removed = log;
        return false;
      }
      return true;
    });
    return { ...current, habitLogs };
  });
  return removed ? clone(removed) : null;
}

export function getDemoHabitLogsForDate(date: string, habitIds: string[]): HabitLogRow[] {
  if (!habitIds.length) return [];
  const idSet = new Set(habitIds);
  return clone(state.habitLogs.filter((log) => log.date === date && idSet.has(log.habit_id)));
}

export function getDemoHabitLogsForRange(habitIds: string[], startDate: string, endDate: string): HabitLogRow[] {
  if (!habitIds.length) return [];
  const idSet = new Set(habitIds);
  return clone(
    state.habitLogs.filter((log) => {
      if (!idSet.has(log.habit_id)) return false;
      return log.date >= startDate && log.date <= endDate;
    }),
  );
}

export function getDemoVisionImages(userId: string): VisionImageRow[] {
  return clone(
    state.visionImages
      .filter((image) => image.user_id === userId)
      .sort((a, b) => (a.created_at > b.created_at ? -1 : a.created_at < b.created_at ? 1 : 0)),
  );
}

export function addDemoVisionImage(payload: VisionImageInsert): VisionImageRow {
  const record: VisionImageRow = {
    id: payload.id ?? createId('vision'),
    user_id: payload.user_id,
    image_path: payload.image_path,
    caption: payload.caption ?? null,
    created_at: payload.created_at ?? new Date().toISOString(),
  };
  updateState((current) => ({ ...current, visionImages: [record, ...current.visionImages] }));
  return clone(record);
}

export function removeDemoVisionImage(id: string): VisionImageRow | null {
  let removed: VisionImageRow | null = null;
  updateState((current) => {
    const visionImages = current.visionImages.filter((image) => {
      if (image.id === id) {
        removed = image;
        return false;
      }
      return true;
    });
    return { ...current, visionImages };
  });
  return removed ? clone(removed) : null;
}

export function getDemoCheckins(userId: string, limit = 12): CheckinRow[] {
  const rows = state.checkins
    .filter((checkin) => checkin.user_id === userId)
    .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
    .slice(0, limit);
  return clone(rows);
}

export function addDemoCheckin(payload: CheckinInsert): CheckinRow {
  const record: CheckinRow = {
    id: payload.id ?? createId('checkin'),
    user_id: payload.user_id,
    date: payload.date,
    scores: payload.scores,
  };
  updateState((current) => ({ ...current, checkins: [record, ...current.checkins] }));
  return clone(record);
}

export function updateDemoCheckin(id: string, payload: CheckinUpdate): CheckinRow | null {
  let updated: CheckinRow | null = null;
  updateState((current) => {
    const checkins = current.checkins.map((checkin) => {
      if (checkin.id !== id) return checkin;
      updated = { ...checkin, ...payload, scores: payload.scores ?? checkin.scores };
      return updated;
    });
    return { ...current, checkins };
  });
  return updated ? clone(updated) : null;
}

export function getDemoNotificationPreferences(userId: string): NotificationPreferencesRow | null {
  if (state.notificationPreferences?.user_id !== userId) {
    return null;
  }
  return clone(state.notificationPreferences);
}

export function upsertDemoNotificationPreferences(
  userId: string,
  payload: NotificationPreferencesInsert | NotificationPreferencesUpdate,
): NotificationPreferencesRow {
  const record: NotificationPreferencesRow = {
    user_id: userId,
    habit_reminders_enabled:
      'habit_reminders_enabled' in payload
        ? Boolean(payload.habit_reminders_enabled)
        : state.notificationPreferences?.habit_reminders_enabled ?? false,
    habit_reminder_time:
      'habit_reminder_time' in payload
        ? payload.habit_reminder_time ?? null
        : state.notificationPreferences?.habit_reminder_time ?? null,
    checkin_nudges_enabled:
      'checkin_nudges_enabled' in payload
        ? Boolean(payload.checkin_nudges_enabled)
        : state.notificationPreferences?.checkin_nudges_enabled ?? false,
    timezone:
      'timezone' in payload
        ? payload.timezone ?? null
        : state.notificationPreferences?.timezone ?? null,
    subscription:
      'subscription' in payload
        ? (payload.subscription as Json | null)
        : (state.notificationPreferences?.subscription ?? null),
    created_at: state.notificationPreferences?.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  updateState((current) => ({ ...current, notificationPreferences: record }));
  return clone(record);
}

export function clearDemoNotificationPreferences(userId: string): NotificationPreferencesRow | null {
  if (state.notificationPreferences?.user_id !== userId) {
    return null;
  }
  const cleared: NotificationPreferencesRow = {
    ...state.notificationPreferences,
    habit_reminders_enabled: false,
    checkin_nudges_enabled: false,
    habit_reminder_time: null,
    subscription: null,
    updated_at: new Date().toISOString(),
  };
  updateState((current) => ({ ...current, notificationPreferences: cleared }));
  return clone(cleared);
}

export async function fileToDataUrl(file: File | Blob): Promise<string> {
  if (typeof window === 'undefined' || typeof FileReader === 'undefined') {
    throw new Error('FileReader is not available in this environment.');
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to read file as data URL.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export function resetDemoState() {
  state = clone(defaultState);
  persist();
}
