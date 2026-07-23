import { useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { createJournalEntry } from '../../../../services/journal';
import { getClueCardPromptsForIsland } from '../services/islandRunClueCardCurriculum';

type MoodAnswer = 'nothing_typical' | 'specific';

interface IslandRunGamifiedJournalCardProps {
  session: Session;
  islandNumber: number;
  /** 0-based count of draws already opened on this island visit. */
  drawIndex?: number;
  caretakerArtSrc: string;
  caretakerName?: string;
  onSaved: (message: string) => void;
  onClose: () => void;
}

export function IslandRunGamifiedJournalCard({
  session,
  islandNumber,
  drawIndex = 0,
  caretakerArtSrc,
  caretakerName = 'Caretaker',
  onSaved,
  onClose,
}: IslandRunGamifiedJournalCardProps) {
  const [goodAnswer, setGoodAnswer] = useState<MoodAnswer | null>(null);
  const [badAnswer, setBadAnswer] = useState<MoodAnswer | null>(null);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prompts = useMemo(
    () => getClueCardPromptsForIsland(islandNumber, drawIndex),
    [islandNumber, drawIndex],
  );

  const completedClues = [goodAnswer, badAnswer].filter(Boolean).length;
  const activeClue = goodAnswer === null ? 'bright' : badAnswer === null ? 'heavy' : 'complete';
  const canSave = completedClues === 2 && !isSaving;

  const goodLabel = goodAnswer === 'nothing_typical' ? 'Quiet day' : 'A bright moment';
  const badLabel = badAnswer === 'nothing_typical' ? 'All steady' : 'A rough moment';

  const handleSave = async () => {
    if (!canSave) {
      setError('Pick both clue cards first.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const today = new Date().toISOString().split('T')[0];
    const content = [
      `Caretaker milestone clue · ${prompts.themeLabel}`,
      '',
      `Bright clue: ${prompts.goodQuestion}\n${goodLabel}`,
      '',
      `Heavy clue: ${prompts.badQuestion}\n${badLabel}`,
      ...(note.trim() ? ['', `One-line note: ${note.trim()}`] : []),
    ].join('\n');

    const { error: saveError } = await createJournalEntry({
      user_id: session.user.id,
      entry_date: today,
      title: 'Caretaker Wheel Clue',
      content,
      mood: goodAnswer === 'specific' && badAnswer === 'nothing_typical' ? 'happy' : 'neutral',
      tags: ['island-run', 'gamified-journal', 'daily-clue-card', 'caretaker-clue', `island-${islandNumber}`],
      linked_goal_ids: null,
      linked_habit_ids: null,
      is_private: true,
      type: 'quick',
      mood_score: null,
      category: null,
      unlock_date: null,
      goal_id: null,
    });

    if (saveError) {
      setError(saveError.message);
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    onSaved('🧭 The caretaker saved your wheel clue. Keep exploring.');
  };

  return (
    <div className="island-run-gamified-journal-card" data-clue-step={activeClue}>
      <div className="island-run-gamified-journal-card__visual" aria-hidden="true">
        <div className="island-run-gamified-journal-card__caretaker-frame">
          <img src={caretakerArtSrc} alt="" className="island-run-gamified-journal-card__caretaker" />
        </div>
        <div className="island-run-gamified-journal-card__wheel">
          <img src="/assets/icons/compass-gold-256.webp" alt="" />
        </div>
        <span className="island-run-gamified-journal-card__milestone">Island {islandNumber}</span>
      </div>

      <div className="island-run-gamified-journal-card__heading">
        <p className="island-stop-modal__eyebrow">Rare caretaker encounter · {prompts.themeLabel}</p>
        <h3 className="island-stop-modal__title">{caretakerName} found a wheel clue</h3>
        <p className="island-run-gamified-journal-card__intro">
          Two quick picks. I’ll remember the pattern for you.
        </p>
      </div>

      <div
        className="island-run-gamified-journal-card__progress"
        role="progressbar"
        aria-label="Wheel clues gathered"
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={completedClues}
      >
        <span className={goodAnswer ? 'is-filled' : ''} />
        <span className={badAnswer ? 'is-filled' : ''} />
        <strong>{completedClues}/2</strong>
      </div>

      {activeClue !== 'complete' ? (
        <section className={`island-run-gamified-journal-card__question island-run-gamified-journal-card__question--${activeClue}`}>
          <p className="island-run-gamified-journal-card__step">Clue {activeClue === 'bright' ? '1' : '2'} of 2</p>
          <h4>{activeClue === 'bright' ? prompts.goodQuestion : prompts.badQuestion}</h4>
          <div className="island-run-gamified-journal-card__choices">
            <button
              type="button"
              className="island-run-gamified-journal-card__choice"
              onClick={() => activeClue === 'bright' ? setGoodAnswer('nothing_typical') : setBadAnswer('nothing_typical')}
            >
              <span className="island-run-gamified-journal-card__choice-art" aria-hidden="true">
                {activeClue === 'bright' ? '🌙' : '🌿'}
              </span>
              <strong>{activeClue === 'bright' ? 'Quiet day' : 'All steady'}</strong>
              <small>Nothing stood out</small>
            </button>
            <button
              type="button"
              className="island-run-gamified-journal-card__choice island-run-gamified-journal-card__choice--spark"
              onClick={() => activeClue === 'bright' ? setGoodAnswer('specific') : setBadAnswer('specific')}
            >
              <span className="island-run-gamified-journal-card__choice-art" aria-hidden="true">
                {activeClue === 'bright' ? '✨' : '🌧️'}
              </span>
              <strong>{activeClue === 'bright' ? 'A bright moment' : 'A rough moment'}</strong>
              <small>Something stood out</small>
            </button>
          </div>
        </section>
      ) : (
        <section className="island-run-gamified-journal-card__complete" aria-live="polite">
          <div className="island-run-gamified-journal-card__complete-title">
            <span aria-hidden="true">🧭</span>
            <div>
              <p>Wheel clue found</p>
              <strong>That’s enough for today.</strong>
            </div>
          </div>
          <div className="island-run-gamified-journal-card__summary">
            <button type="button" onClick={() => setGoodAnswer(null)} aria-label="Change bright clue">
              <span aria-hidden="true">☀️</span>{goodLabel}<small>Change</small>
            </button>
            <button type="button" onClick={() => setBadAnswer(null)} aria-label="Change heavy clue">
              <span aria-hidden="true">🌧️</span>{badLabel}<small>Change</small>
            </button>
          </div>
          <label className="island-run-gamified-journal-card__note">
            <span>Optional: one short note</span>
            <input
              value={note}
              maxLength={180}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Name the moment…"
            />
          </label>
        </section>
      )}

      {error ? <p className="island-run-gamified-journal-card__error" role="alert">{error}</p> : null}

      <div className="island-run-gamified-journal-card__actions">
        <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={onClose}>
          Not now
        </button>
        {activeClue === 'complete' ? (
          <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary" onClick={() => void handleSave()} disabled={!canSave}>
            {isSaving ? 'Saving…' : 'Save clue'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
