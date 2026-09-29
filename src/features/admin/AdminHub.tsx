import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Session } from '@supabase/supabase-js';
import {
  fetchAdminOverview,
  fetchAdminWaitlist,
  saveAdminPushDevice,
  type AdminOverview,
  type AdminWaitlistEntry,
} from '../../services/adminHub';
import { getExistingSubscription, isPushSupported, subscribeToPush } from '../../services/pushNotifications';
import { AdminAlertsPanel } from './AdminAlertsPanel';
import { AdminInboxPanel } from './AdminInboxPanel';
import { AdminTelemetryPanel } from './AdminTelemetryPanel';
import { PlayerInsightsPanel } from './PlayerInsightsPanel';
import './adminHub.css';

type AdminTab = 'overview' | 'waitlist' | 'players' | 'telemetry' | 'inbox' | 'dev';

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'waitlist', label: 'Waitlist' },
  { id: 'players', label: 'Players' },
  { id: 'telemetry', label: 'Telemetry' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'dev', label: 'Dev tools' },
];

const WAITLIST_PAGE_SIZE = 50;

type AdminHubProps = {
  session: Session;
  isOpen: boolean;
  onClose: () => void;
  /** Developer and QA tools owned by the settings panel (they need its handlers). */
  devTools: ReactNode;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const sourceLabel = (source: string) => (source === 'island_3_gate' ? 'In-game gate' : 'Landing page');

function useScrollLockAndEscape(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);
}

function PhoneAlertsCard({ session }: { session: Session }) {
  const [state, setState] = useState<'checking' | 'on' | 'off' | 'unsupported' | 'working'>('checking');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isPushSupported()) {
      setState('unsupported');
      return;
    }
    // navigator.serviceWorker.ready never settles without a registered worker.
    const timeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 3000));
    void Promise.race([getExistingSubscription(), timeout]).then((subscription) =>
      setState(subscription ? 'on' : 'off'),
    );
  }, []);

  const enable = async () => {
    setState('working');
    setMessage(null);
    try {
      const subscription = await subscribeToPush();
      const error = await saveAdminPushDevice(session.user.id, subscription);
      if (error) throw error;
      setState('on');
      setMessage('This device will get a notification when someone joins the waitlist or creates an account.');
    } catch (error) {
      setState('off');
      setMessage(error instanceof Error ? error.message : 'Could not turn on alerts for this device.');
    }
  };

  return (
    <section className="admin-hub__card admin-hub__phone" aria-labelledby="admin-hub-phone-title">
      <div>
        <h3 id="admin-hub-phone-title">Phone alerts</h3>
        <p>
          {state === 'on' && 'On for this device.'}
          {state === 'off' && 'Get a push on this device for waitlist joins and new accounts.'}
          {state === 'unsupported' && 'This browser can’t receive push notifications. On iPhone, add HabitGame to your Home Screen first.'}
          {state === 'checking' && 'Checking this device…'}
          {state === 'working' && 'Asking for permission…'}
        </p>
        {message ? <p className="admin-hub__note" role="status">{message}</p> : null}
      </div>
      {state === 'off' || state === 'working' ? (
        <button type="button" className="admin-hub__button" onClick={() => void enable()} disabled={state === 'working'}>
          Turn on
        </button>
      ) : null}
      {state === 'on' ? (
        <button type="button" className="admin-hub__button admin-hub__button--quiet" onClick={() => void enable()}>
          Re-register
        </button>
      ) : null}
    </section>
  );
}

function OverviewTab({ session, onOpenTab }: { session: Session; onOpenTab: (tab: AdminTab) => void }) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await fetchAdminOverview();
    setOverview(result.data);
    setError(result.error?.message ?? null);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = overview
    ? [
        { label: 'On the waitlist', value: overview.waitlist_total, delta: overview.waitlist_7d, tab: 'waitlist' as AdminTab },
        { label: 'Accounts', value: overview.accounts_total, delta: overview.accounts_7d, tab: null },
        { label: 'Active players (7 days)', value: overview.active_players_7d ?? '—', delta: null, tab: 'players' as AdminTab },
        { label: 'Unread alerts', value: overview.unread_alerts, delta: null, tab: 'inbox' as AdminTab },
      ]
    : [];

  return (
    <div className="admin-hub__stack">
      {error ? <p className="admin-hub__error" role="alert">{error}</p> : null}
      <div className="admin-hub__stats">
        {overview
          ? stats.map((stat) => {
              const content = (
                <>
                  <span className="admin-hub__stat-value">{stat.value}</span>
                  <span className="admin-hub__stat-label">{stat.label}</span>
                  {stat.delta !== null ? <span className="admin-hub__stat-delta">+{stat.delta} this week</span> : null}
                </>
              );
              return stat.tab ? (
                <button key={stat.label} type="button" className="admin-hub__stat" onClick={() => onOpenTab(stat.tab!)}>
                  {content}
                </button>
              ) : (
                <div key={stat.label} className="admin-hub__stat">{content}</div>
              );
            })
          : !error && <p className="admin-hub__note">Loading numbers…</p>}
      </div>

      <PhoneAlertsCard session={session} />

      <section className="admin-hub__card" aria-labelledby="admin-hub-latest-title">
        <div className="admin-hub__card-head">
          <h3 id="admin-hub-latest-title">Latest waitlist joins</h3>
          <button type="button" className="admin-hub__link" onClick={() => onOpenTab('waitlist')}>See all</button>
        </div>
        {overview && overview.latest_waitlist.length === 0 ? <p className="admin-hub__note">No one yet.</p> : null}
        <ul className="admin-hub__list">
          {overview?.latest_waitlist.map((entry) => (
            <li key={`${entry.email}-${entry.created_at}`}>
              <span className="admin-hub__email">{entry.email}</span>
              <span className="admin-hub__meta">{sourceLabel(entry.source)} · {formatDate(entry.created_at)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function WaitlistTab() {
  const [rows, setRows] = useState<AdminWaitlistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const loadPage = useCallback(async (offset: number) => {
    setLoading(true);
    const result = await fetchAdminWaitlist(WAITLIST_PAGE_SIZE, offset);
    setRows((current) => (offset === 0 ? result.data : [...current, ...result.data]));
    setTotal(result.total);
    setError(result.error?.message ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { void loadPage(0); }, [loadPage]);

  const copyEmails = async () => {
    const all = await fetchAdminWaitlist(500, 0);
    try {
      await navigator.clipboard.writeText(all.data.map((row) => row.email).join('\n'));
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  };

  return (
    <section className="admin-hub__card" aria-labelledby="admin-hub-waitlist-title">
      <div className="admin-hub__card-head">
        <h3 id="admin-hub-waitlist-title">Waitlist <span className="admin-hub__count">{total}</span></h3>
        <button type="button" className="admin-hub__button admin-hub__button--quiet" onClick={() => void copyEmails()} disabled={total === 0}>
          {copyState === 'copied' ? 'Copied' : 'Copy all emails'}
        </button>
      </div>
      {copyState === 'failed' ? <p className="admin-hub__note">Copy isn’t available here. Select the emails below instead.</p> : null}
      {error ? <p className="admin-hub__error" role="alert">{error}</p> : null}
      {!loading && rows.length === 0 && !error ? <p className="admin-hub__note">No one has joined yet.</p> : null}
      <ul className="admin-hub__list">
        {rows.map((row) => (
          <li key={row.id ?? row.email}>
            <span className="admin-hub__email">{row.email}</span>
            <span className="admin-hub__meta">{sourceLabel(row.source)} · {formatDate(row.created_at)}</span>
          </li>
        ))}
      </ul>
      {rows.length < total ? (
        <button type="button" className="admin-hub__button admin-hub__button--quiet" onClick={() => void loadPage(rows.length)} disabled={loading}>
          {loading ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </section>
  );
}

export function AdminHub({ session, isOpen, onClose, devTools }: AdminHubProps) {
  const [tab, setTab] = useState<AdminTab>('overview');
  useScrollLockAndEscape(isOpen, onClose);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="admin-hub" role="dialog" aria-modal="true" aria-labelledby="admin-hub-title">
      <div className="admin-hub__backdrop" aria-hidden="true" onClick={onClose} />
      <div className="admin-hub__panel">
        <header className="admin-hub__header">
          <h2 id="admin-hub-title">Admin</h2>
          <button type="button" className="admin-hub__close" onClick={onClose}>Close</button>
        </header>
        <nav className="admin-hub__tabs" role="tablist" aria-label="Admin sections">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={`admin-hub__tab${tab === item.id ? ' is-active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="admin-hub__body" role="tabpanel">
          {tab === 'overview' ? <OverviewTab session={session} onOpenTab={setTab} /> : null}
          {tab === 'waitlist' ? <WaitlistTab /> : null}
          {tab === 'players' ? (
            <section className="admin-hub__legacy" aria-label="Player insights">
              <p className="admin-hub__intro">Where players stop, how long they play on each island, and weekly retention.</p>
              <PlayerInsightsPanel session={session} />
            </section>
          ) : null}
          {tab === 'telemetry' ? (
            <section className="admin-hub__legacy" aria-label="Telemetry">
              <p className="admin-hub__intro">Usage statistics rolled up nightly. Raw events are kept for 30 days.</p>
              <AdminTelemetryPanel session={session} />
            </section>
          ) : null}
          {tab === 'inbox' ? (
            <div className="admin-hub__legacy">
              <AdminAlertsPanel session={session} />
              <section className="account-panel__card" aria-label="Support inbox">
                <AdminInboxPanel session={session} />
              </section>
            </div>
          ) : null}
          {tab === 'dev' ? <div className="admin-hub__legacy">{devTools}</div> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
