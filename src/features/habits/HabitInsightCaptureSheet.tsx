/**
 * HabitInsightCaptureSheet — quick "what got in the way?" capture for a struggling
 * habit, shown after it's skipped on the Today screen. The user taps cue chips and
 * can add an optional note; on save the parent persists the insight and may award a
 * dice reward (returned from onSubmit so we can show satisfying feedback).
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { CUE_CHIP_GROUPS } from './habitInsightModel';
import './HabitInsightCaptureSheet.css';

export interface HabitInsightCapturePayload {
  cueTags: string[];
  note: string | null;
}

export interface HabitInsightCaptureSheetProps {
  habitTitle: string;
  /** Persist the insight; resolves with the number of dice awarded (0 if none). */
  onSubmit: (payload: HabitInsightCapturePayload) => Promise<number>;
  onClose: () => void;
}

export function HabitInsightCaptureSheet({
  habitTitle,
  onSubmit,
  onClose,
}: HabitInsightCaptureSheetProps): JSX.Element {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [rewardDice, setRewardDice] = useState<number | null>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const toggleChip = useCallback((value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const canSave = selected.size > 0 || note.trim().length > 0;

  const handleSave = useCallback(async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const dice = await onSubmit({
        cueTags: Array.from(selected),
        note: note.trim() ? note.trim() : null,
      });
      setRewardDice(dice);
      window.setTimeout(onClose, dice > 0 ? 1200 : 700);
    } catch (err) {
      console.warn('Failed to save habit insight:', err);
      setSaving(false);
    }
  }, [canSave, note, onClose, onSubmit, saving, selected]);

  return createPortal(
    <div className="habit-insight__overlay" role="dialog" aria-modal="true" aria-label="Quick habit insight">
      <div className="habit-insight__sheet">
        {rewardDice !== null ? (
          <div className="habit-insight__reward" role="status">
            <span className="habit-insight__reward-emoji" aria-hidden>
              {rewardDice > 0 ? '🎲' : '✅'}
            </span>
            <p className="habit-insight__reward-text">
              {rewardDice > 0 ? `Thanks! +${rewardDice} dice` : 'Insight saved'}
            </p>
            <p className="habit-insight__reward-sub">Your coach will use this to help reshape this habit.</p>
          </div>
        ) : (
          <>
            <div className="habit-insight__header">
              <div>
                <span className="habit-insight__eyebrow">Quick insight</span>
                <h2 className="habit-insight__title">What got in the way of “{habitTitle}”?</h2>
              </div>
              <button
                type="button"
                className="habit-insight__close"
                onClick={onClose}
                disabled={saving}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p className="habit-insight__hint">Tap what fits — this teaches your coach the cue behind the slip.</p>

            <div className="habit-insight__groups">
              {CUE_CHIP_GROUPS.map((group) => (
                <div key={group.title} className="habit-insight__group">
                  <span className="habit-insight__group-title">{group.title}</span>
                  <div className="habit-insight__chips">
                    {group.chips.map((chip) => {
                      const active = selected.has(chip.value);
                      return (
                        <button
                          key={chip.value}
                          type="button"
                          className={`habit-insight__chip${active ? ' habit-insight__chip--active' : ''}`}
                          aria-pressed={active}
                          onClick={() => toggleChip(chip.value)}
                        >
                          {chip.emoji && <span aria-hidden>{chip.emoji} </span>}
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <textarea
              className="habit-insight__note"
              placeholder="Add a note (optional) — e.g. “only happens after dinner”"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              maxLength={280}
            />

            <div className="habit-insight__footer">
              <button type="button" className="habit-insight__btn habit-insight__btn--ghost" onClick={onClose} disabled={saving}>
                Not now
              </button>
              <button
                type="button"
                className="habit-insight__btn habit-insight__btn--primary"
                onClick={handleSave}
                disabled={!canSave || saving}
              >
                {saving ? 'Saving…' : 'Save insight'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default HabitInsightCaptureSheet;
