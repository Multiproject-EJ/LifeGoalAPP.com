import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Session } from '@supabase/supabase-js';
import { lockPageScroll } from '../../../../utils/scrollLock';
import {
  DEFAULT_ARENA_MINIGAME_PREFERENCES,
  getArenaDisabledLimit,
  getArenaPreferenceRows,
  loadArenaMinigamePreferences,
  moveArenaEvent,
  saveArenaMinigamePreferences,
  toggleArenaEvent,
  type ArenaGameId,
  type ArenaMinigamePreferences,
} from '../services/islandRunArenaPreferences';
import type { EventId } from '../services/islandRunEventEngine';

interface IslandRunArenaPreferencesModalProps {
  open: boolean;
  session: Session;
  onClose: () => void;
  onSaved: (preferences: ArenaMinigamePreferences) => void;
  activeEventId: EventId | null;
  onLaunchGame: (gameId: ArenaGameId) => void;
}

export function IslandRunArenaPreferencesModal({
  open,
  session,
  onClose,
  onSaved,
  activeEventId,
  onLaunchGame,
}: IslandRunArenaPreferencesModalProps) {
  const [preferences, setPreferences] = useState<ArenaMinigamePreferences>(
    DEFAULT_ARENA_MINIGAME_PREFERENCES,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const rows = useMemo(() => getArenaPreferenceRows(preferences), [preferences]);

  useEffect(() => {
    if (!open) return undefined;
    const unlock = lockPageScroll();
    let active = true;
    void loadArenaMinigamePreferences(session).then((result) => {
      if (!active) return;
      setPreferences(result.preferences);
      setMessage(result.error);
    });
    return () => {
      active = false;
      unlock();
    };
  }, [open, session]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open || typeof document === 'undefined') return null;

  const move = (eventId: ArenaGameId, direction: -1 | 1) => {
    setMessage(null);
    setPreferences((current) => moveArenaEvent(current, eventId, direction));
  };

  const toggle = (eventId: ArenaGameId) => {
    setPreferences((current) => {
      const result = toggleArenaEvent(current, eventId);
      setMessage(result.reason);
      return result.preferences;
    });
  };

  const save = async () => {
    setSaving(true);
    const result = await saveArenaMinigamePreferences(session, preferences);
    setSaving(false);
    onSaved(result.preferences);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    onClose();
  };

  return createPortal(
    <div className="arena-preferences" role="dialog" aria-modal="true" aria-labelledby="arena-preferences-title">
      <button className="arena-preferences__backdrop" type="button" aria-label="Close Arena settings" onClick={onClose} />
      <section className="arena-preferences__sheet">
        <div className="arena-preferences__handle" aria-hidden="true" />
        <p className="arena-preferences__eyebrow">Diplomatic Arena controls</p>
        <h2 id="arena-preferences-title">Shape your Arena rotation</h2>
        <p className="arena-preferences__intro">
          Put favourites first for full missions. Middle games become quick fights; your lowest active game becomes a
          15-second flash. You can pause {getArenaDisabledLimit()} of {rows.length} games (25%).
        </p>

        <div className="arena-preferences__catalog" aria-label="Arena game catalog">
          {rows.map((row) => {
            const isLiveRotation = row.eventId === activeEventId;
            const canLaunch = !row.disabled && (row.eventId === 'momentum_matrix' || isLiveRotation);
            return (
              <button
                type="button"
                className={`arena-preferences__catalog-card${row.eventId === 'momentum_matrix' ? ' arena-preferences__catalog-card--feature' : ''}`}
                key={`catalog:${row.eventId}`}
                onClick={() => {
                  onClose();
                  onLaunchGame(row.eventId);
                }}
                disabled={!canLaunch}
                aria-label={`${row.displayName}. ${row.disabled ? 'Paused' : row.eventId === 'momentum_matrix' ? 'Exhibition available' : isLiveRotation ? 'Live now' : 'Upcoming rotation'}`}
              >
                {row.artSrc ? <img src={row.artSrc} alt="" /> : <span aria-hidden="true">{row.icon}</span>}
                <strong>{row.displayName}</strong>
                <small>{row.disabled ? 'Paused' : row.eventId === 'momentum_matrix' ? 'Exhibition' : isLiveRotation ? 'Live now' : 'Upcoming'}</small>
              </button>
            );
          })}
        </div>

        <p className="arena-preferences__rank-label">Rank session length</p>
        <ol className="arena-preferences__list">
          {rows.map((row, index) => (
            <li className={`arena-preferences__row${row.disabled ? ' arena-preferences__row--disabled' : ''}`} key={row.eventId}>
              <span className="arena-preferences__rank">{index + 1}</span>
              <span className="arena-preferences__icon" aria-hidden="true">{row.icon}</span>
              <span className="arena-preferences__game">
                <strong>{row.displayName}</strong>
                <small>{row.disabled ? 'Paused' : row.pace === 'full' ? 'Full mission' : row.pace === 'fast' ? 'Quick fight · 45 sec' : 'Flash fight · 15 sec'}</small>
              </span>
              <span className="arena-preferences__moves">
                <button type="button" onClick={() => move(row.eventId, -1)} disabled={index === 0} aria-label={`Move ${row.displayName} up`}>↑</button>
                <button type="button" onClick={() => move(row.eventId, 1)} disabled={index === rows.length - 1} aria-label={`Move ${row.displayName} down`}>↓</button>
              </span>
              <button
                type="button"
                className="arena-preferences__toggle"
                aria-pressed={row.disabled}
                onClick={() => toggle(row.eventId)}
              >
                {row.disabled ? 'Turn on' : 'Pause'}
              </button>
            </li>
          ))}
        </ol>

        {message ? <p className="arena-preferences__message" role="status">{message}</p> : null}
        <div className="arena-preferences__actions">
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save rotation'}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
