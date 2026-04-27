type DreamReminderWindow = {
  startHour: number;
  endHour: number;
};

const DEFAULT_WINDOW: DreamReminderWindow = {
  startHour: 4,
  endHour: 12,
};

const enabledKey = (userId: string) => `lifegoal.dream-journal-reminder.enabled:${userId}`;
const windowKey = (userId: string) => `lifegoal.dream-journal-reminder.window:${userId}`;
const shownCycleKey = (userId: string) => `lifegoal.dream-journal-reminder.last-shown-cycle:${userId}`;

const clampHour = (value: number) => Math.min(23, Math.max(0, Math.floor(value)));

const toLocalYmd = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addLocalDays = (date: Date, amount: number) => {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + amount);
  return copy;
};

export function getDreamJournalReminderEnabled(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  const stored = window.localStorage.getItem(enabledKey(userId));
  if (stored === null) return false;
  try {
    return Boolean(JSON.parse(stored));
  } catch {
    return false;
  }
}

export function setDreamJournalReminderEnabled(userId: string, enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(enabledKey(userId), JSON.stringify(enabled));
}

export function getDreamJournalReminderWindow(userId: string): DreamReminderWindow {
  if (typeof window === 'undefined') return DEFAULT_WINDOW;
  const stored = window.localStorage.getItem(windowKey(userId));
  if (!stored) return DEFAULT_WINDOW;
  try {
    const parsed = JSON.parse(stored) as Partial<DreamReminderWindow>;
    const startHour = clampHour(typeof parsed.startHour === 'number' ? parsed.startHour : DEFAULT_WINDOW.startHour);
    const endHour = clampHour(typeof parsed.endHour === 'number' ? parsed.endHour : DEFAULT_WINDOW.endHour);
    return { startHour, endHour };
  } catch {
    return DEFAULT_WINDOW;
  }
}

export function setDreamJournalReminderWindow(userId: string, nextWindow: DreamReminderWindow): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    windowKey(userId),
    JSON.stringify({
      startHour: clampHour(nextWindow.startHour),
      endHour: clampHour(nextWindow.endHour),
    } satisfies DreamReminderWindow),
  );
}

export function isHourInDreamReminderWindow(hour: number, reminderWindow: DreamReminderWindow): boolean {
  if (reminderWindow.startHour === reminderWindow.endHour) {
    return true;
  }
  if (reminderWindow.startHour < reminderWindow.endHour) {
    return hour >= reminderWindow.startHour && hour < reminderWindow.endHour;
  }
  return hour >= reminderWindow.startHour || hour < reminderWindow.endHour;
}

export function getDreamReminderCycleKey(now: Date, reminderWindow: DreamReminderWindow): string {
  if (reminderWindow.startHour <= reminderWindow.endHour) {
    return toLocalYmd(now);
  }
  const hour = now.getHours();
  if (hour < reminderWindow.endHour) {
    return toLocalYmd(addLocalDays(now, -1));
  }
  return toLocalYmd(now);
}

export function getDreamJournalReminderLastShownCycle(userId: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(shownCycleKey(userId));
}

export function setDreamJournalReminderLastShownCycle(userId: string, cycleKey: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(shownCycleKey(userId), cycleKey);
}
