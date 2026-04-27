type TodaysWinsReminderWindow = {
  startTime: string; // HH:MM
  endTime: string; // HH:MM
};

const DEFAULT_WINDOW: TodaysWinsReminderWindow = {
  startTime: '21:30',
  endTime: '23:59',
};

const enabledKey = (userId: string) => `lifegoal.todays-wins-reminder.enabled:${userId}`;
const windowKey = (userId: string) => `lifegoal.todays-wins-reminder.window:${userId}`;
const shownCycleKey = (userId: string) => `lifegoal.todays-wins-reminder.last-shown-cycle:${userId}`;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

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

const parseMinutes = (value: string): number | null => {
  if (!TIME_PATTERN.test(value)) return null;
  const [hoursStr, minutesStr] = value.split(':');
  return Number(hoursStr) * 60 + Number(minutesStr);
};

export function getTodaysWinsReminderEnabled(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  const stored = window.localStorage.getItem(enabledKey(userId));
  if (stored === null) return false;
  try {
    return Boolean(JSON.parse(stored));
  } catch {
    return false;
  }
}

export function setTodaysWinsReminderEnabled(userId: string, enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(enabledKey(userId), JSON.stringify(enabled));
}

export function getTodaysWinsReminderWindow(userId: string): TodaysWinsReminderWindow {
  if (typeof window === 'undefined') return DEFAULT_WINDOW;
  const stored = window.localStorage.getItem(windowKey(userId));
  if (!stored) return DEFAULT_WINDOW;
  try {
    const parsed = JSON.parse(stored) as Partial<TodaysWinsReminderWindow>;
    return {
      startTime: parseMinutes(parsed.startTime ?? '') === null ? DEFAULT_WINDOW.startTime : (parsed.startTime as string),
      endTime: parseMinutes(parsed.endTime ?? '') === null ? DEFAULT_WINDOW.endTime : (parsed.endTime as string),
    };
  } catch {
    return DEFAULT_WINDOW;
  }
}

export function setTodaysWinsReminderWindow(userId: string, reminderWindow: TodaysWinsReminderWindow): void {
  if (typeof window === 'undefined') return;
  const startTime = parseMinutes(reminderWindow.startTime) === null ? DEFAULT_WINDOW.startTime : reminderWindow.startTime;
  const endTime = parseMinutes(reminderWindow.endTime) === null ? DEFAULT_WINDOW.endTime : reminderWindow.endTime;
  window.localStorage.setItem(windowKey(userId), JSON.stringify({ startTime, endTime } satisfies TodaysWinsReminderWindow));
}

export function isTimeInTodaysWinsReminderWindow(now: Date, reminderWindow: TodaysWinsReminderWindow): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseMinutes(reminderWindow.startTime);
  const endMinutes = parseMinutes(reminderWindow.endTime);
  if (startMinutes === null || endMinutes === null) return false;
  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export function getTodaysWinsReminderCycleKey(now: Date, reminderWindow: TodaysWinsReminderWindow): string {
  const startMinutes = parseMinutes(reminderWindow.startTime);
  const endMinutes = parseMinutes(reminderWindow.endTime);
  if (startMinutes === null || endMinutes === null || startMinutes <= endMinutes) {
    return toLocalYmd(now);
  }
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (currentMinutes < endMinutes) {
    return toLocalYmd(addLocalDays(now, -1));
  }
  return toLocalYmd(now);
}

export function getTodaysWinsReminderLastShownCycle(userId: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(shownCycleKey(userId));
}

export function setTodaysWinsReminderLastShownCycle(userId: string, cycleKey: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(shownCycleKey(userId), cycleKey);
}
