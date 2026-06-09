import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  COMPASS_DIRECTION_META,
  COMPASS_SPOKE_META,
  getCompassDirectionForIsland,
  getCompassPhase,
  type CompassDirection,
  type CompassSpoke,
} from '../services/compassCurriculum';
import {
  COMPASS_SPOKE_COMPLETE_THRESHOLD,
  fetchCompassState,
  recordCompassContribution,
  setCompassCenterStatement,
  type CompassTemplate,
} from '../../../../services/compassState';

interface CompassModalProps {
  session: Session;
  islandNumber: number;
  onClose: () => void;
}

const DIRECTIONS: readonly CompassDirection[] = ['heart', 'craft', 'cause', 'livelihood'];
const SPOKES: readonly CompassSpoke[] = ['personality', 'habits', 'goals', 'shield'];

export function CompassModal({ session, islandNumber, onClose }: CompassModalProps) {
  const phase = useMemo(() => getCompassPhase(islandNumber), [islandNumber]);
  const activeDirection = useMemo(() => getCompassDirectionForIsland(islandNumber), [islandNumber]);

  const [template, setTemplate] = useState<CompassTemplate | null>(null);
  const [directionDraft, setDirectionDraft] = useState('');
  const [centerDraft, setCenterDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await fetchCompassState(session.user.id);
      if (cancelled) return;
      setTemplate(loaded);
      setCenterDraft(loaded.centerStatement ?? '');
      if (activeDirection) {
        setDirectionDraft(loaded.directions[activeDirection] ?? '');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.user.id, activeDirection]);

  const allDirectionsFilled = useMemo(
    () => Boolean(template) && DIRECTIONS.every((dir) => Boolean(template?.directions[dir]?.trim())),
    [template],
  );

  const handleSaveDirection = async () => {
    if (!activeDirection || !directionDraft.trim() || saving) return;
    setSaving(true);
    setStatus(null);
    const updated = await recordCompassContribution({
      userId: session.user.id,
      islandNumber,
      kind: 'wisdom',
      text: directionDraft.trim(),
    });
    setTemplate(updated);
    setSaving(false);
    setStatus('Saved to your Compass.');
  };

  const handleSaveCenter = async () => {
    if (saving) return;
    setSaving(true);
    setStatus(null);
    const updated = await setCompassCenterStatement(session.user.id, centerDraft);
    setTemplate(updated);
    setSaving(false);
    setStatus('True North updated.');
  };

  return (
    <div className="island-stop-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="island-stop-modal island-run-compass-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Compass"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="island-stop-modal__header-row">
          <h3 className="island-stop-modal__title">🧭 Compass — {phase.label}</h3>
          <button type="button" className="island-run-compass-modal__close" aria-label="Close compass" onClick={onClose}>
            ×
          </button>
        </div>

        <p className="island-stop-modal__copy">
          Your life template for this leg of the journey. The Wisdom and Habit stops on each island fill it in.
        </p>

        {!template ? (
          <p className="island-stop-modal__copy">Loading your Compass…</p>
        ) : (
          <>
            {/* ── Ikigai directions (the compass rose) ── */}
            <div className="island-run-compass-modal__rose">
              {DIRECTIONS.map((dir) => {
                const meta = COMPASS_DIRECTION_META[dir];
                const captured = template.directions[dir];
                const isActive = activeDirection === dir;
                return (
                  <div
                    key={dir}
                    className={`island-run-compass-modal__direction${isActive ? ' island-run-compass-modal__direction--active' : ''}${captured ? ' island-run-compass-modal__direction--filled' : ''}`}
                  >
                    <div className="island-run-compass-modal__direction-head">
                      <span aria-hidden="true">{meta.emoji}</span> <strong>{meta.label}</strong>
                      <span className="island-run-compass-modal__point">{meta.compassPoint}</span>
                    </div>
                    {isActive ? (
                      <>
                        <p className="island-run-compass-modal__prompt">{meta.prompt}</p>
                        <textarea
                          className="island-run-compass-modal__input"
                          rows={2}
                          value={directionDraft}
                          placeholder="Your answer…"
                          onChange={(event) => setDirectionDraft(event.target.value)}
                        />
                        <button
                          type="button"
                          className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                          onClick={() => void handleSaveDirection()}
                          disabled={saving || !directionDraft.trim()}
                        >
                          {saving ? 'Saving…' : 'Save direction'}
                        </button>
                      </>
                    ) : captured ? (
                      <p className="island-run-compass-modal__captured">{captured}</p>
                    ) : (
                      <p className="island-run-compass-modal__prompt island-run-compass-modal__prompt--muted">{meta.prompt}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Center: True North ── */}
            <div className="island-run-compass-modal__center">
              <div className="island-run-compass-modal__direction-head">
                <span aria-hidden="true">🧭</span> <strong>True North</strong>
              </div>
              {allDirectionsFilled ? (
                <>
                  <textarea
                    className="island-run-compass-modal__input"
                    rows={2}
                    value={centerDraft}
                    placeholder="In one sentence, where do these four meet?"
                    onChange={(event) => setCenterDraft(event.target.value)}
                  />
                  <button
                    type="button"
                    className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
                    onClick={() => void handleSaveCenter()}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save True North'}
                  </button>
                </>
              ) : (
                <p className="island-run-compass-modal__prompt island-run-compass-modal__prompt--muted">
                  Fill all four directions to synthesise your True North.
                </p>
              )}
            </div>

            {/* ── Spokes progress ── */}
            <div className="island-run-compass-modal__spokes">
              <h4 className="island-run-compass-modal__spokes-title">Your spokes</h4>
              {SPOKES.map((spoke) => {
                const meta = COMPASS_SPOKE_META[spoke];
                const state = template.spokes[spoke];
                const isActive = phase.spoke === spoke;
                const pct = Math.min(100, Math.round((state.entries.length / COMPASS_SPOKE_COMPLETE_THRESHOLD) * 100));
                return (
                  <div
                    key={spoke}
                    className={`island-run-compass-modal__spoke${isActive ? ' island-run-compass-modal__spoke--active' : ''}`}
                  >
                    <div className="island-run-compass-modal__spoke-head">
                      <span aria-hidden="true">{meta.emoji}</span> <strong>{meta.label}</strong>
                      {state.version > 0 ? <span className="island-run-compass-modal__spoke-version">v{state.version}.0</span> : null}
                      <span className="island-run-compass-modal__spoke-status">{state.status.replace('_', ' ')}</span>
                    </div>
                    <div className="island-run-compass-modal__bar" aria-hidden="true">
                      <div className="island-run-compass-modal__bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    {isActive ? (
                      <p className="island-run-compass-modal__prompt island-run-compass-modal__prompt--muted">
                        This phase fills your {meta.label}. Complete the Wisdom and Habit stops to add to it.
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {status ? <p className="island-stop-modal__copy">{status}</p> : null}
          </>
        )}
      </section>
    </div>
  );
}
