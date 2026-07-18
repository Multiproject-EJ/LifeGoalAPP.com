import { resolveSuperHabitForTitle, type SuperHabitId } from './superHabits';

export type WellbeingShieldScore = { body: number; mind: number; total: number; healthContribution: number; bodyHabitCount: number; mindHabitCount: number };
type ShieldHabit = { id: string; name: string };
type ShieldLog = { habit_id: string; date: string; completed: boolean | null };
const BODY: SuperHabitId[] = ['eat_well', 'move_body', 'sleep_ritual'];
const MIND: SuperHabitId[] = ['journal', 'focus_forge', 'calm_reset', 'plan_tomorrow', 'relationship_ritual'];
export const WELLBEING_SHIELD_EVENT = 'lifegoal:wellbeing-shield-changed';
const STORAGE_KEY = 'lifegoal:wellbeing-shield:v1';

function axisScore(ids: string[], logs: ShieldLog[], today: string, windowStart: string): number {
  if (!ids.length) return 0;
  const relevant = logs.filter((log) => ids.includes(log.habit_id) && log.date >= windowStart && log.date <= today && log.completed);
  const activeDays = new Set(relevant.map((log) => `${log.habit_id}:${log.date}`)).size;
  const weekly = Math.min(1, activeDays / (ids.length * 4));
  const todayRatio = ids.filter((id) => relevant.some((log) => log.habit_id === id && log.date === today)).length / ids.length;
  return Math.round((weekly * 0.6 + todayRatio * 0.4) * 100);
}

export function computeWellbeingShield(habits: ShieldHabit[], logs: ShieldLog[], today: string, windowStart: string): WellbeingShieldScore {
  const bodyIds = habits.filter((habit) => { const match = resolveSuperHabitForTitle(habit.name); return match ? BODY.includes(match.id) : false; }).map((habit) => habit.id);
  const mindIds = habits.filter((habit) => { const match = resolveSuperHabitForTitle(habit.name); return match ? MIND.includes(match.id) : false; }).map((habit) => habit.id);
  const body = axisScore(bodyIds, logs, today, windowStart);
  const mind = axisScore(mindIds, logs, today, windowStart);
  const total = bodyIds.length && mindIds.length ? Math.round((body + mind) / 2) : Math.max(body, mind);
  return { body, mind, total, healthContribution: Math.round(total / 10), bodyHabitCount: bodyIds.length, mindHabitCount: mindIds.length };
}

export function publishWellbeingShield(score: WellbeingShieldScore): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(score));
  window.dispatchEvent(new CustomEvent(WELLBEING_SHIELD_EVENT, { detail: score }));
}

export function readWellbeingShield(): WellbeingShieldScore | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null'); } catch { return null; }
}
