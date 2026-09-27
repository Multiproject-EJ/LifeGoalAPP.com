import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isAdminUser } from '../../services/adminRoles';
import { fetchPlayerInsights, type PlayerInsights } from '../../services/playerInsights';
import { PlayerInsightsView } from './PlayerInsightsView';

type Props = { session: Session };

const LOOKBACK_OPTIONS = [7, 30, 90] as const;

/** Admin-only: where players stop, and where the fun drops. */
export function PlayerInsightsPanel({ session }: Props) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [lookback, setLookback] = useState<(typeof LOOKBACK_OPTIONS)[number]>(30);
  const [insights, setInsights] = useState<PlayerInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void isAdminUser(session.user.id).then((value) => {
      if (active) setIsAdmin(value);
    });
    return () => {
      active = false;
    };
  }, [session.user.id]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await fetchPlayerInsights(lookback);
    setInsights(data);
    setError(loadError ? loadError.message : null);
    setLoading(false);
  }, [lookback]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (isAdmin === null) return <p className="account-panel__hint">Checking access…</p>;
  if (!isAdmin) return <p className="account-panel__hint">Admin access required.</p>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.7rem', flexWrap: 'wrap' }}>
        {LOOKBACK_OPTIONS.map((days) => (
          <button
            key={days}
            type="button"
            className="btn btn--ghost"
            aria-pressed={lookback === days}
            onClick={() => setLookback(days)}
            style={{ fontWeight: lookback === days ? 800 : 500 }}
          >
            {days}d
          </button>
        ))}
        <button type="button" className="btn btn--ghost" onClick={() => void load()} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
      {error ? (
        <p className="account-panel__hint" role="alert">
          {error}. If this is the first run, apply the migration 20260927170000_player_insights.sql in Supabase.
        </p>
      ) : null}
      {insights ? <PlayerInsightsView insights={insights} /> : null}
    </div>
  );
}
