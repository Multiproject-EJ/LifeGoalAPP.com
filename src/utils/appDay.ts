/**
 * Canonical "app day" utilities — the single source of truth for when a day
 * starts and ends across the whole app.
 *
 * A day is the user's **local civil day** (rolls over at their local midnight).
 * This matches what "my day" means to a person, and it is already the
 * convention the streak calculator and the Today-tab habit logic use.
 *
 * Use these helpers for anything user-facing that resets daily (habits, daily
 * treats, daily spin, vision star, routines, etc.) so every feature agrees on
 * the same boundary.
 *
 * NOTE: Telemetry/analytics bucketing and database date columns that are gated
 * by server-side `current_date` are intentionally NOT covered here — those form
 * a contract with the backend and must be migrated together with the server.
 */

/** Format a Date as a local `YYYY-MM-DD` key (NOT UTC). */
export function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parse a `YYYY-MM-DD` key into a Date at **local** midnight. */
export function parseISODate(value: string): Date {
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return new Date(value);
  }
  return new Date(year, month - 1, day);
}

/** Add (or subtract, with a negative amount) whole days to a Date. */
export function addDays(date: Date, amount: number): Date {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + amount);
  return copy;
}

/** The canonical "today" key (local `YYYY-MM-DD`). */
export function getTodayKey(now: Date = new Date()): string {
  return formatISODate(now);
}

/** Epoch ms at the start (local midnight) of the given day. */
export function getDayStartMs(date: Date = new Date()): number {
  const start = new Date(date.getTime());
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

/** Epoch ms at the next day boundary (the upcoming local midnight). */
export function getNextDayBoundaryMs(now: Date = new Date()): number {
  const next = new Date(now.getTime());
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next.getTime();
}
