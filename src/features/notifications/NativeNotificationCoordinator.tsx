import { lockPageScroll } from '../../utils/scrollLock';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Session } from '@supabase/supabase-js';
import { App as CapacitorApp } from '@capacitor/app';
import { getIslandRunStateSnapshot, subscribeIslandRunState } from '../gamification/level-worlds/services/islandRunStateStore';
import { eggAlerts } from '../../services/nativeNotificationPolicy';
import { buildNativeLifeReminders } from '../../services/nativeLifeReminders';
import { clearOtherNativeUsers, enableNativeAlertPackage, isNativeNotifications, NATIVE_ALERTS_CHANGED, readNativeAlertPreferences, saveNativeAlertPreferences, syncNativeAlerts } from '../../services/nativeNotifications';
import './NativeNotifications.css';

export function NativeNotificationCoordinator({ session }: { session: Session | null }) {
  const [prompt, setPrompt] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    if (!isNativeNotifications()) return;
    let live = true, lifeBusy = false;
    setPrompt(false);
    const userId = session?.user.id ?? null;
    void clearOtherNativeUsers(userId).catch(console.warn);
    if (!session || !userId) return;
    const report = (e: unknown) => console.warn('[native notifications]', e);
    let lastEggFingerprint = '';
    const syncEggs = (force = false) => {
      const ledger = getIslandRunStateSnapshot(session).perIslandEggs;
      const fingerprint = JSON.stringify([ledger, readNativeAlertPreferences(userId).eggs]);
      if (force || fingerprint !== lastEggFingerprint) {
        lastEggFingerprint = fingerprint;
        void syncNativeAlerts(userId, 'eggs', eggAlerts(ledger, Date.now()), () => live).catch(e => { lastEggFingerprint = ''; report(e); });
      }
      if (!readNativeAlertPreferences(userId).eggPromptSeen && Object.values(ledger).some(egg => egg.status === 'incubating' && egg.hatchAtMs > Date.now())) setPrompt(true);
    };
    const syncLife = async () => {
      if (lifeBusy || !live) return; lifeBusy = true;
      try {
        const alerts = readNativeAlertPreferences(userId).life ? await buildNativeLifeReminders(userId) : [];
        if (live) await syncNativeAlerts(userId, 'life', alerts, () => live);
      } catch (e) { report(e); }
      finally { lifeBusy = false; }
    };
    const refresh = () => { syncEggs(true); void syncLife(); };
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    const unsubscribe = subscribeIslandRunState(session, () => syncEggs());
    const listener = CapacitorApp.addListener('appStateChange', ({ isActive }) => { if (isActive) refresh(); });
    window.addEventListener(NATIVE_ALERTS_CHANGED, refresh);
    document.addEventListener('visibilitychange', visible);
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible') void syncLife(); }, 60000);
    refresh();
    return () => { live = false; unsubscribe(); window.clearInterval(interval); void listener.then(handle => handle.remove()); window.removeEventListener(NATIVE_ALERTS_CHANGED, refresh); document.removeEventListener('visibilitychange', visible); };
  }, [session?.user.id]);
  useEffect(() => {
    if (!prompt) return;
    return lockPageScroll();
  }, [prompt]);
  if (!prompt || !session || !isNativeNotifications()) return null;
  const dismiss = () => { saveNativeAlertPreferences(session.user.id, { eggPromptSeen: true }); setPrompt(false); };
  return createPortal(<div className="native-alert-backdrop"><section className="native-alert-dialog" role="dialog" aria-modal="true" aria-labelledby="egg-alert-title">
    <span className="native-alert-egg" aria-hidden="true">🥚</span>
    <h2 id="egg-alert-title">A new companion is on the way</h2>
    <p>Your egg is safe in the spaceship. Would you like one alert when it is ready to open?</p>
    <p>No daily egg reminders. You can change this in Account → Notifications.</p>
    {error && <p role="alert">{error}</p>}
    <button type="button" className="native-alert-enable" disabled={busy} autoFocus onClick={async () => {
      setBusy(true); try {
        const permission = await enableNativeAlertPackage(session.user.id, 'eggs');
        if (permission === 'granted') dismiss();
        else { saveNativeAlertPreferences(session.user.id, { eggPromptSeen: true }); setError('Notifications are off. You can enable HabitGame in iPhone Settings → Notifications.'); }
      } catch { setError('Could not enable alerts. Try again in Account → Notifications.'); }
      finally { setBusy(false); }
    }}>Let me know</button>
    <button type="button" disabled={busy} onClick={dismiss}>Not now</button>
  </section></div>, document.body);
}
