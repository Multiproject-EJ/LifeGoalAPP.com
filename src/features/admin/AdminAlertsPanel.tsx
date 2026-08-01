import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isAdminUser } from '../../services/adminRoles';
import { listAdminAlerts, markAdminAlertRead, subscribeToAdminAlerts, type AdminAlert } from '../../services/adminAlerts';

export function AdminAlertsPanel({ session }: { session: Session }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const result = await listAdminAlerts();
    setAlerts(result.data); setError(result.error?.message ?? null);
  }, []);
  useEffect(() => { void isAdminUser(session.user.id).then(setAllowed); }, [session.user.id]);
  useEffect(() => { if (allowed) void load(); }, [allowed, load]);
  useEffect(() => {
    if (!allowed) return;
    return subscribeToAdminAlerts(() => void load());
  }, [allowed, load]);
  if (allowed !== true) return null;
  const unread = alerts.filter((alert) => !alert.read_at).length;
  return <section className="account-panel__card" aria-labelledby="admin-alerts">
    <p className="account-panel__eyebrow">Admin operations</p>
    <h3 id="admin-alerts">Alerts{unread ? ` (${unread} unread)` : ''}</h3>
    <p className="account-panel__hint">Waitlist joins and new account registrations appear here for active admins.</p>
    <button type="button" className="btn" onClick={() => void load()}>Refresh alerts</button>
    {error ? <p className="account-panel__hint">{error}</p> : null}
    <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
      {alerts.length === 0 ? <p className="account-panel__hint">No alerts yet.</p> : alerts.map((alert) => <button key={alert.id} type="button" className="btn" style={{ textAlign: 'left', opacity: alert.read_at ? 0.68 : 1 }} onClick={() => { void markAdminAlertRead(alert.id).then(() => void load()); }}>
        <strong>{alert.title}</strong><br /><span>{alert.summary}</span>
      </button>)}
    </div>
  </section>;
}
