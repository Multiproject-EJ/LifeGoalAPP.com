import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { fetchCheckinsForUser } from '../../services/checkins';
import type { Database } from '../../lib/database.types';
import {
  buildQuestCompassViewModel,
  type QuestCompassForceScore,
} from './questCompassViewModel';

type CheckinRow = Database['public']['Tables']['checkins']['Row'];

type QuestCompassModalProps = {
  session: Session | null;
  onClose: () => void;
  onAskAiGuide: () => void;
  onRefreshAlignment: () => void;
  onStartNextQuest: () => void;
  onOpenGoals: () => void;
  onOpenJournal: () => void;
};

export function QuestCompassModal({
  session,
  onClose,
  onAskAiGuide,
  onRefreshAlignment,
  onStartNextQuest,
  onOpenGoals,
  onOpenJournal,
}: QuestCompassModalProps) {
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [loading, setLoading] = useState(Boolean(session?.user.id));
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!session?.user.id) {
      setCheckins([]);
      setLoading(false);
      setLoadError(null);
      return () => {
        isMounted = false;
      };
    }

    const loadCheckins = async () => {
      setLoading(true);
      setLoadError(null);
      const result = await fetchCheckinsForUser(session.user.id, 6);

      if (!isMounted) return;

      setCheckins(result.data ?? []);
      setLoadError(result.error?.message ?? null);
      setLoading(false);
    };

    void loadCheckins();

    return () => {
      isMounted = false;
    };
  }, [session?.user.id]);

  const viewModel = useMemo(
    () => buildQuestCompassViewModel(checkins),
    [checkins],
  );
  const strongestForce = viewModel.strongestForce;
  const focusForce = viewModel.focusForce;

  return (
    <div
      className="mobile-menu-overlay__hold-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Quest Compass"
    >
      <button
        type="button"
        className="mobile-menu-overlay__hold-backdrop"
        aria-label="Close Quest Compass"
        onClick={onClose}
      />
      <div className="mobile-menu-overlay__hold-panel mobile-menu-overlay__submenu-sheet quest-compass">
        <div className="mobile-menu-overlay__hold-header">
          <div>
            <p className="mobile-menu-overlay__hold-eyebrow">Life Realm Compass</p>
            <h3 className="mobile-menu-overlay__hold-title">Quest Compass</h3>
          </div>
          <button
            type="button"
            className="mobile-menu-overlay__hold-close"
            aria-label="Close Quest Compass"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <p className="quest-compass__copy">
          Read today’s alignment across your six life forces from your latest
          Life Wheel check-in, then choose one small real-life quest.
        </p>

        {loading ? (
          <p className="quest-compass__status">Loading your latest alignment…</p>
        ) : null}
        {loadError ? (
          <p className="quest-compass__status quest-compass__status--warning">
            {loadError}
          </p>
        ) : null}

        <section className="quest-compass__overview" aria-label="Compass overview">
          <div className="quest-compass__orb" aria-hidden="true">
            <span className="quest-compass__orb-center">🧭</span>
            {viewModel.forces.map((force, index) => (
              <span
                key={force.key}
                className={`quest-compass__orb-point quest-compass__orb-point--${index + 1} quest-compass__orb-point--${force.trend}`}
              >
                {force.icon}
              </span>
            ))}
          </div>
          <div className="quest-compass__signal">
            <span className="quest-compass__signal-label">
              {viewModel.hasCheckinData ? 'Latest alignment' : 'No signal yet'}
            </span>
            <strong>
              {viewModel.hasCheckinData
                ? viewModel.summary
                : 'Refresh alignment to wake up your Compass.'}
            </strong>
            <p>
              {viewModel.latestCheckinDateLabel
                ? `Latest check-in: ${viewModel.latestCheckinDateLabel}`
                : 'Complete a Life Wheel check-in to score Fire, Strength, Connection, Wealth, Growth, and Direction.'}
            </p>
          </div>
        </section>

        <div className="quest-compass__spotlight-grid" aria-label="Compass highlights">
          <CompassSpotlightCard
            label="Strongest force"
            force={strongestForce}
            fallback="No strongest force yet"
          />
          <CompassSpotlightCard
            label="Focus force"
            force={focusForce}
            fallback="No focus force yet"
          />
        </div>

        <div className="quest-compass__force-grid" aria-label="Six life forces">
          {viewModel.forces.map((force) => (
            <article key={force.key} className="quest-compass__force-card">
              <span className="quest-compass__force-icon" aria-hidden="true">
                {force.icon}
              </span>
              <div>
                <div className="quest-compass__force-heading">
                  <h4>{force.name}</h4>
                  <span>{force.scoreLabel}</span>
                </div>
                <p className={`quest-compass__trend quest-compass__trend--${force.trend}`}>
                  {force.trendLabel}
                </p>
                <p>{force.summary}</p>
                <small>
                  Signals: {force.contributingCategories.join(', ')}
                </small>
              </div>
            </article>
          ))}
        </div>

        <div className="mobile-menu-overlay__submenu mobile-menu-overlay__submenu--open quest-compass__actions">
          <button
            type="button"
            className="mobile-menu-overlay__submenu-button"
            aria-label="Ask AI Guide about your Quest Compass"
            onClick={onAskAiGuide}
          >
            <span className="mobile-menu-overlay__submenu-icon" aria-hidden="true">🧠</span>
            <span>Ask AI Guide</span>
          </button>
          <button
            type="button"
            className="mobile-menu-overlay__submenu-button"
            aria-label="Refresh your Quest Compass alignment with a check-in"
            onClick={onRefreshAlignment}
          >
            <span className="mobile-menu-overlay__submenu-icon" aria-hidden="true">📊</span>
            <span>Refresh alignment/check-in</span>
          </button>
          <button
            type="button"
            className="mobile-menu-overlay__submenu-button"
            aria-label="Start the next quest from your Quest Compass"
            onClick={onStartNextQuest}
          >
            <span className="mobile-menu-overlay__submenu-icon" aria-hidden="true">🔁</span>
            <span>Start next quest</span>
          </button>
          <button
            type="button"
            className="mobile-menu-overlay__submenu-button"
            aria-label="Open goals from your Quest Compass"
            onClick={onOpenGoals}
          >
            <span className="mobile-menu-overlay__submenu-icon" aria-hidden="true">🎯</span>
            <span>Open goals</span>
          </button>
          <button
            type="button"
            className="mobile-menu-overlay__submenu-button"
            aria-label="Open journal from your Quest Compass"
            onClick={onOpenJournal}
          >
            <span className="mobile-menu-overlay__submenu-icon" aria-hidden="true">📝</span>
            <span>Open journal</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function CompassSpotlightCard({
  label,
  force,
  fallback,
}: {
  label: string;
  force: QuestCompassForceScore | null;
  fallback: string;
}) {
  return (
    <article className="quest-compass__spotlight-card">
      <span className="quest-compass__signal-label">{label}</span>
      {force ? (
        <>
          <strong>
            {force.icon} {force.name} · {force.scoreLabel}
          </strong>
          <p>{force.prompt}</p>
        </>
      ) : (
        <p>{fallback}</p>
      )}
    </article>
  );
}
