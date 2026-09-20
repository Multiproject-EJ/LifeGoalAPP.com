import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { admitDailyLifeAlerts, nativeAlertId, type NativeAlert } from './nativeNotificationPolicy';

export const NATIVE_ALERTS_CHANGED = 'habitgame:native-alerts-changed';
export const isNativeNotifications = () => Capacitor.isNativePlatform();
export type NativeAlertPreferences = { eggs: boolean; life: boolean; eggPromptSeen: boolean };
const storageKey = (userId: string) => `habitgame:native-alerts:v1:${userId}`;
export function readNativeAlertPreferences(userId: string): NativeAlertPreferences {
  try { return { eggs: false, life: false, eggPromptSeen: false, ...JSON.parse(localStorage.getItem(storageKey(userId)) ?? '{}') }; }
  catch { return { eggs: false, life: false, eggPromptSeen: false }; }
}
export function saveNativeAlertPreferences(userId: string, patch: Partial<NativeAlertPreferences>) {
  localStorage.setItem(storageKey(userId), JSON.stringify({ ...readNativeAlertPreferences(userId), ...patch }));
  window.dispatchEvent(new Event(NATIVE_ALERTS_CHANGED));
}
const owner = 'habitgame-native-v1';
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(action: () => Promise<T>): Promise<T> {
  const next = queue.then(action, action); queue = next.catch(() => undefined); return next;
}
export async function nativeNotificationPermission() {
  return isNativeNotifications() ? (await LocalNotifications.checkPermissions()).display : 'denied';
}
export async function enableNativeAlertPackage(userId: string, kind: 'eggs' | 'life') {
  if (!isNativeNotifications()) return 'denied';
  const current = await nativeNotificationPermission();
  const permission = current === 'prompt' || current === 'prompt-with-rationale'
    ? (await LocalNotifications.requestPermissions()).display : current;
  if (permission === 'granted') saveNativeAlertPreferences(userId, { [kind]: true, ...(kind === 'eggs' ? { eggPromptSeen: true } : {}) });
  return permission;
}
export function syncNativeAlerts(userId: string, scope: 'eggs' | 'life', alerts: NativeAlert[], stillCurrent = () => true) {
  if (!isNativeNotifications()) return Promise.resolve();
  return serialize(async () => {
    if (!stillCurrent()) return;
    const enabled = readNativeAlertPreferences(userId)[scope] && await nativeNotificationPermission() === 'granted';
    let desired = enabled ? alerts.filter(a => a.at > Date.now()).slice(0, scope === 'eggs' ? 48 : 3) : [];
    const historyKey = `${storageKey(userId)}:life-budget`;
    let history: Record<string, string> = {};
    if (scope === 'life') {
      try { history = JSON.parse(localStorage.getItem(historyKey) ?? '{}'); } catch { /* Fresh bounded budget. */ }
      desired = admitDailyLifeAlerts(desired, history, at => new Date(at).toLocaleDateString('en-CA'));
    }
    const { notifications } = await LocalNotifications.getPending();
    if (!stillCurrent()) return;
    const existing = notifications.filter(n => n.extra?.owner === owner && n.extra?.userId === userId && n.extra?.scope === scope);
    const signatures = new Map(desired.map(a => [nativeAlertId(`${userId}:${a.key}`), JSON.stringify(a)]));
    const obsolete = existing.filter(n => signatures.get(n.id) !== n.extra?.signature);
    if (obsolete.length) await LocalNotifications.cancel({ notifications: obsolete.map(n => ({ id: n.id })) });
    const changes = desired.filter(a => !existing.some(n => n.id === nativeAlertId(`${userId}:${a.key}`) && n.extra?.signature === JSON.stringify(a)));
    if (!stillCurrent()) return;
    if (changes.length) await LocalNotifications.schedule({ notifications: changes.map(a => ({
      id: nativeAlertId(`${userId}:${a.key}`), title: a.title, body: a.body,
      schedule: { at: new Date(a.at) }, sound: 'default',
      extra: { owner, userId, scope, key: a.key, habitId: a.habitId, signature: JSON.stringify(a) },
    })) });
    if (scope === 'life' && changes.length) {
      for (const a of changes) history[a.key] = new Date(a.at).toLocaleDateString('en-CA');
      const cutoff = new Date(Date.now() - 3 * 86400000).toLocaleDateString('en-CA');
      localStorage.setItem(historyKey, JSON.stringify(Object.fromEntries(Object.entries(history).filter(([, day]) => day >= cutoff))));
    }
  });
}
export function cancelNativeHabitAlerts(habitIds: string[]) {
  if (!isNativeNotifications() || !habitIds.length) return Promise.resolve();
  return serialize(async () => {
    const { notifications } = await LocalNotifications.getPending();
    const matches = notifications.filter(n => n.extra?.owner === owner && habitIds.includes(n.extra?.habitId));
    if (matches.length) await LocalNotifications.cancel({ notifications: matches.map(n => ({ id: n.id })) });
  });
}
export function clearOtherNativeUsers(currentUserId: string | null) {
  if (!isNativeNotifications()) return Promise.resolve();
  return serialize(async () => {
    const { notifications } = await LocalNotifications.getPending();
    const others = notifications.filter(n => n.extra?.owner === owner && n.extra?.userId !== currentUserId);
    if (others.length) await LocalNotifications.cancel({ notifications: others.map(n => ({ id: n.id })) });
  });
}
export async function nativeNotificationDiagnostics(userId: string) {
  const permission = await nativeNotificationPermission();
  const { notifications } = await LocalNotifications.getPending();
  return { permission, pending: notifications.filter(n => n.extra?.owner === owner && n.extra?.userId === userId).length };
}
export async function sendNativeTestAlert(userId: string) {
  if (await nativeNotificationPermission() !== 'granted') throw new Error('Enable a notification package first.');
  await LocalNotifications.schedule({ notifications: [{ id: nativeAlertId(`${userId}:test`), title: 'HabitGame alerts are working',
    body: 'Your spaceship and useful reminders can now reach this iPhone.', sound: 'default', schedule: { at: new Date(Date.now() + 10000) }, extra: { owner, userId, scope: 'test' } }] });
}
