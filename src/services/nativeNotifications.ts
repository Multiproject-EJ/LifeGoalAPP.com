import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type Weekday } from '@capacitor/local-notifications';
import { admitDailyLifeAlerts, nativeAlertId, type NativeAlert } from './nativeNotificationPolicy';

export const NATIVE_ALERTS_CHANGED = 'habitgame:native-alerts-changed';
export const isNativeNotifications = () => Capacitor.isNativePlatform();
export type NativeAlertPreferences = { eggs: boolean; life: boolean; selected: boolean; eggPromptSeen: boolean };
const storageKey = (userId: string) => `habitgame:native-alerts:v1:${userId}`;
export function readNativeAlertPreferences(userId: string): NativeAlertPreferences {
  try { return { eggs: false, life: false, selected: false, eggPromptSeen: false, ...JSON.parse(localStorage.getItem(storageKey(userId)) ?? '{}') }; }
  catch { return { eggs: false, life: false, selected: false, eggPromptSeen: false }; }
}
export function saveNativeAlertPreferences(userId: string, patch: Partial<NativeAlertPreferences>) {
  localStorage.setItem(storageKey(userId), JSON.stringify({ ...readNativeAlertPreferences(userId), ...patch }));
  notifyNativeAlertsChanged();
}
export function notifyNativeAlertsChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NATIVE_ALERTS_CHANGED));
}
const owner = 'habitgame-native-v1';
const selectedPermissionAttemptKey = (userId: string) => `${storageKey(userId)}:selected-permission-attempted`;
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(action: () => Promise<T>): Promise<T> {
  const next = queue.then(action, action); queue = next.catch(() => undefined); return next;
}
export async function nativeNotificationPermission() {
  return isNativeNotifications() ? (await LocalNotifications.checkPermissions()).display : 'denied';
}
export async function enableNativeAlertPackage(userId: string, kind: 'eggs' | 'life' | 'selected') {
  if (!isNativeNotifications()) return 'denied';
  // A per-item reminder is user intent, independent of the current OS grant.
  // Keeping it enabled lets the coordinator schedule it after permission is
  // granted later in iOS Settings.
  if (kind === 'selected' && !readNativeAlertPreferences(userId).selected) {
    saveNativeAlertPreferences(userId, { selected: true });
  }
  const current = await nativeNotificationPermission();
  const canPrompt = current === 'prompt' || current === 'prompt-with-rationale';
  let permission = current;
  if (canPrompt) {
    if (kind === 'selected' && localStorage.getItem(selectedPermissionAttemptKey(userId)) === '1') return permission;
    permission = (await LocalNotifications.requestPermissions()).display;
    if (kind === 'selected') localStorage.setItem(selectedPermissionAttemptKey(userId), '1');
  }
  if (permission === 'granted') saveNativeAlertPreferences(userId, { [kind]: true, ...(kind === 'eggs' ? { eggPromptSeen: true } : {}) });
  return permission;
}
type RepeatWithWeekday = NonNullable<NativeAlert['repeat']>;
function repeatFor(alert: NativeAlert): RepeatWithWeekday | undefined {
  return alert.repeat;
}
function alertSignature(alert: NativeAlert): string {
  const repeat = repeatFor(alert);
  return JSON.stringify({
    key: alert.key,
    title: alert.title,
    body: alert.body,
    at: repeat ? null : alert.at,
    habitId: alert.habitId ?? null,
    todoId: alert.todoId ?? null,
    repeat: repeat ? {
      hour: repeat.hour,
      minute: repeat.minute,
      weekday: repeat.weekday ?? null,
    } : null,
  });
}

type SelectedAlertKind = 'habit' | 'todo';
type PendingNativeNotification = Awaited<ReturnType<typeof LocalNotifications.getPending>>['notifications'][number];

function isSelectedAlertKind(notification: PendingNativeNotification, kind: SelectedAlertKind): boolean {
  const key = typeof notification.extra?.key === 'string' ? notification.extra.key : '';
  return kind === 'habit'
    ? Boolean(notification.extra?.habitId) || key.startsWith('habit:')
    : Boolean(notification.extra?.todoId) || key.startsWith('todo:');
}

function syncNativeAlertsInternal(
  userId: string,
  scope: 'eggs' | 'life' | 'selected',
  alerts: NativeAlert[],
  stillCurrent: () => boolean,
  selectedKind?: SelectedAlertKind,
) {
  if (!isNativeNotifications()) return Promise.resolve();
  return serialize(async () => {
    if (!stillCurrent()) return;
    const preferences = readNativeAlertPreferences(userId);
    // Existing users who enabled the older Life package keep their per-item
    // habit reminders; new quick reminders can be enabled without also turning
    // on unrelated ambient nudges.
    const enabled = (scope === 'selected' ? preferences.selected || preferences.life : preferences[scope])
      && await nativeNotificationPermission() === 'granted';
    const scopeLimit = scope === 'eggs' ? 48 : scope === 'selected' ? 12 : 3;
    let desired = enabled ? alerts.filter(a => a.at > Date.now()) : [];
    const historyKey = `${storageKey(userId)}:life-budget`;
    let history: Record<string, string> = {};
    if (scope === 'life') {
      try { history = JSON.parse(localStorage.getItem(historyKey) ?? '{}'); } catch { /* Fresh bounded budget. */ }
      desired = admitDailyLifeAlerts(desired, history, at => new Date(at).toLocaleDateString('en-CA'));
    }
    const { notifications } = await LocalNotifications.getPending();
    if (!stillCurrent()) return;
    const existingInScope = notifications.filter(n => n.extra?.owner === owner && n.extra?.userId === userId && n.extra?.scope === scope);
    const existing = selectedKind
      ? existingInScope.filter(notification => isSelectedAlertKind(notification, selectedKind))
      : existingInScope;
    const reservedSlots = selectedKind ? existingInScope.length - existing.length : 0;
    desired = desired.slice(0, Math.max(0, scopeLimit - reservedSlots));
    const signatures = new Map(desired.map(a => [nativeAlertId(`${userId}:${a.key}`), alertSignature(a)]));
    const obsolete = existing.filter(n => signatures.get(n.id) !== n.extra?.signature);
    if (obsolete.length) await LocalNotifications.cancel({ notifications: obsolete.map(n => ({ id: n.id })) });
    const changes = desired.filter(a => !existing.some(n => n.id === nativeAlertId(`${userId}:${a.key}`) && n.extra?.signature === alertSignature(a)));
    if (!stillCurrent()) return;
    if (changes.length) await LocalNotifications.schedule({ notifications: changes.map(a => {
      const repeat = repeatFor(a);
      return {
        id: nativeAlertId(`${userId}:${a.key}`), title: a.title, body: a.body,
        schedule: repeat ? { on: {
          hour: repeat.hour,
          minute: repeat.minute,
          ...(repeat.weekday == null ? {} : { weekday: repeat.weekday as Weekday }),
        } } : { at: new Date(a.at) },
        sound: 'default',
        extra: { owner, userId, scope, key: a.key, habitId: a.habitId, todoId: a.todoId, signature: alertSignature(a) },
      };
    }) });
    if (scope === 'life' && changes.length) {
      for (const a of changes) history[a.key] = new Date(a.at).toLocaleDateString('en-CA');
      const cutoff = new Date(Date.now() - 3 * 86400000).toLocaleDateString('en-CA');
      localStorage.setItem(historyKey, JSON.stringify(Object.fromEntries(Object.entries(history).filter(([, day]) => day >= cutoff))));
    }
  });
}

export function syncNativeAlerts(userId: string, scope: 'eggs' | 'life' | 'selected', alerts: NativeAlert[], stillCurrent = () => true) {
  return syncNativeAlertsInternal(userId, scope, alerts, stillCurrent);
}

/**
 * Reconcile one half of the shared selected scope without interpreting an
 * unavailable half as empty. This lets local todo changes reach iOS while
 * preserving the last-known habit schedule during a network outage.
 */
export function syncSelectedNativeAlerts(
  userId: string,
  kind: SelectedAlertKind,
  alerts: NativeAlert[],
  stillCurrent = () => true,
) {
  return syncNativeAlertsInternal(userId, 'selected', alerts, stillCurrent, kind);
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
