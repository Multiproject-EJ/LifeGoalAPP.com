import { useEffect, useState } from 'react';
import { enableNativeAlertPackage, nativeNotificationDiagnostics, readNativeAlertPreferences, saveNativeAlertPreferences, sendNativeTestAlert, type NativeAlertPreferences } from '../../services/nativeNotifications';

export function NativeNotificationSettings({ userId }: { userId: string }) {
  const [prefs, setPrefs] = useState<NativeAlertPreferences>(() => readNativeAlertPreferences(userId));
  const [status, setStatus] = useState('Checking iPhone notification permission…');
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    const result = await nativeNotificationDiagnostics(userId);
    setPrefs(readNativeAlertPreferences(userId));
    setStatus(result.permission === 'granted' ? `iPhone permission enabled · ${result.pending} upcoming alerts`
      : result.permission === 'denied' ? 'Notifications are off in iPhone Settings. Open Settings → Notifications → HabitGame to enable them.'
      : 'Choose a package below to enable iPhone notifications.');
  };
  useEffect(() => { void refresh().catch(() => setStatus('Unable to read iPhone notification settings.')); }, [userId]);
  const toggle = async (kind: 'eggs' | 'life') => {
    setBusy(true);
    try {
      if (prefs[kind]) saveNativeAlertPreferences(userId, { [kind]: false });
      else await enableNativeAlertPackage(userId, kind);
      await refresh();
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to update notifications.'); }
    finally { setBusy(false); }
  };
  return <section className="native-alert-settings">
    <h3>iPhone notifications</h3>
    <p>Choose what is useful to you. Each package is optional.</p>
    <button type="button" disabled={busy} aria-pressed={prefs.eggs} onClick={() => void toggle('eggs')}>🥚 Egg ready alerts · {prefs.eggs ? 'On' : 'Off'}</button>
    <button type="button" disabled={busy} aria-pressed={prefs.life} onClick={() => void toggle('life')}>🌱 Smart reminders · {prefs.life ? 'On' : 'Off'}</button>
    <p>Up to three useful habit, goal or todo reminders a day. Stalled habits stay quiet. No repeating overdue nudges.</p>
    <p role="status">{status}</p>
    <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await sendNativeTestAlert(userId); setStatus('Test scheduled for 10 seconds from now. Lock your iPhone to check delivery.'); } catch (error) { setStatus(error instanceof Error ? error.message : 'Test could not be scheduled.'); } finally { setBusy(false); } }}>Send test alert</button>
  </section>;
}
