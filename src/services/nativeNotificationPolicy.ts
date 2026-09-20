import { assessHabitHealth, type HabitHealthState } from '../features/habits/habitHealth';

export type NativeAlert = { key: string; title: string; body: string; at: number; habitId?: string };
export function nativeAlertId(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return 100000 + ((hash >>> 0) % 2000000000);
}
export function habitAlertsAllowed(state: HabitHealthState): boolean {
  return state === 'active' || state === 'at_risk';
}
export function habitAlertHealth(lastCompletedOn: string | null, date: string): HabitHealthState {
  return assessHabitHealth({ adherence7: null, lastCompletedOn, referenceDateISO: date }).state;
}
export function eggAlerts(ledger: Record<string, { status: string; setAtMs: number; hatchAtMs: number }>, now: number): NativeAlert[] {
  return Object.entries(ledger).filter(([, egg]) => (egg.status === 'incubating' || egg.status === 'ready') && egg.hatchAtMs > now)
    .map(([key, egg]) => ({ key: `egg:${key}:${egg.setAtMs}`, at: egg.hatchAtMs,
      title: 'Your spaceship has a new arrival 🥚', body: 'Your egg is ready to open. Meet your new companion whenever you’re ready.' }));
}
/** One-shot, bounded schedules: opening the app refreshes useful opportunities. */
export function limitLifeAlerts(alerts: NativeAlert[], now: number): NativeAlert[] {
  const keys = new Set<string>();
  return alerts.filter(a => Number.isFinite(a.at) && a.at > now && a.at <= now + 86400000)
    .sort((a, b) => a.at - b.at).filter(a => { if (keys.has(a.key)) return false; keys.add(a.key); return true; }).slice(0, 3);
}

export function admitDailyLifeAlerts(alerts: NativeAlert[], history: Record<string, string>, dayFor: (at: number) => string): NativeAlert[] {
  const booked = new Map<string, Set<string>>();
  for (const [key, day] of Object.entries(history)) {
    if (!booked.has(day)) booked.set(day, new Set());
    booked.get(day)!.add(key);
  }
  return alerts.filter(alert => {
    const day = dayFor(alert.at), keys = booked.get(day) ?? new Set<string>();
    booked.set(day, keys);
    if (keys.has(alert.key)) return true;
    if (keys.size >= 3) return false;
    keys.add(alert.key); return true;
  });
}
