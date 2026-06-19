import { useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { createJournalEntry } from '../../../../services/journal';

type MoodAnswer = 'nothing_typical' | 'specific';

interface IslandRunGamifiedJournalCardProps {
  session: Session;
  islandNumber: number;
  onSaved: (message: string) => void;
  onClose: () => void;
}

export function IslandRunGamifiedJournalCard({
  session,
  islandNumber,
  onSaved,
  onClose,
}: IslandRunGamifiedJournalCardProps) {
  const [goodAnswer, setGoodAnswer] = useState<MoodAnswer | null>(null);
  const [badAnswer, setBadAnswer] = useState<MoodAnswer | null>(null);
  const [goodDetail, setGoodDetail] = useState('');
  const [badDetail, setBadDetail] = useState('');
  const [typicalDay, setTypicalDay] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goodLabel = goodAnswer === 'nothing_typical' ? 'Nothing really — a typical day' : goodDetail.trim();
  const badLabel = badAnswer === 'nothing_typical' ? 'Nothing really — a typical day' : badDetail.trim();
  const typicalDayLength = typicalDay.trim().length;
  const canSave = Boolean(goodAnswer)
    && Boolean(badAnswer)
    && (goodAnswer === 'nothing_typical' || goodDetail.trim().length >= 3)
    && (badAnswer === 'nothing_typical' || badDetail.trim().length >= 3)
    && typicalDayLength >= 15
    && !isSaving;

  const progressLabel = useMemo(() => {
    const complete = [goodAnswer, badAnswer, typicalDayLength >= 15].filter(Boolean).length;
    return `${complete}/3 clues gathered`;
  }, [badAnswer, goodAnswer, typicalDayLength]);

  const handleSave = async () => {
    if (!canSave) {
      setError('Answer both feeling cards and describe a typical day in at least 15 characters.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const today = new Date().toISOString().split('T')[0];
    const title = 'Island Run Daily Clue Card';
    const content = [
      'Gamified journal card from Island Run.',
      '',
      `1) What made you feel good today?\n${goodLabel}`,
      '',
      `2) What, if anything, made you feel bad?\n${badLabel}`,
      '',
      `3) Describe a typical day.\n${typicalDay.trim()}`,
    ].join('\n');

    const { error: saveError } = await createJournalEntry({
      user_id: session.user.id,
      entry_date: today,
      title,
      content,
      mood: goodAnswer === 'specific' && badAnswer === 'nothing_typical' ? 'happy' : 'neutral',
      tags: ['island-run', 'gamified-journal', 'daily-clue-card', `island-${islandNumber}`],
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
    onSaved('🃏 Daily Clue Card saved to your journal. Keep rolling.');
  };

  return (
    <div className="island-run-gamified-journal-card">
      <div className="island-run-gamified-journal-card__hero" aria-hidden="true">
        <span className="island-run-gamified-journal-card__card island-run-gamified-journal-card__card--back" />
        <span className="island-run-gamified-journal-card__card island-run-gamified-journal-card__card--front">?</span>
      </div>
      <p className="island-stop-modal__eyebrow">Card stack draw · {progressLabel}</p>
      <h3 className="island-stop-modal__title">Gamified Journal: Daily Clue Card</h3>
      <p className="island-stop-modal__copy">
        Quick answers keep the loop moving. If nothing stood out, choose the typical-day card — that is still useful data.
      </p>

      <section className="island-run-gamified-journal-card__section">
        <strong>1) What made you feel good today?</strong>
        <div className="island-hatchery-card__actions island-run-gamified-journal-card__choices">
          <button type="button" className={`island-stop-modal__btn island-stop-modal__btn--action ${goodAnswer === 'nothing_typical' ? 'island-stop-modal__btn--primary' : ''}`} onClick={() => setGoodAnswer('nothing_typical')}>Nothing really, a typical day</button>
          <button type="button" className={`island-stop-modal__btn island-stop-modal__btn--action ${goodAnswer === 'specific' ? 'island-stop-modal__btn--primary' : ''}`} onClick={() => setGoodAnswer('specific')}>Something specific</button>
        </div>
        {goodAnswer === 'specific' ? <textarea value={goodDetail} onChange={(event) => setGoodDetail(event.target.value)} placeholder="Name the good moment." /> : null}
      </section>

      <section className="island-run-gamified-journal-card__section">
        <strong>2) What, if anything, made you feel bad?</strong>
        <div className="island-hatchery-card__actions island-run-gamified-journal-card__choices">
          <button type="button" className={`island-stop-modal__btn island-stop-modal__btn--action ${badAnswer === 'nothing_typical' ? 'island-stop-modal__btn--primary' : ''}`} onClick={() => setBadAnswer('nothing_typical')}>Nothing really, a typical day</button>
          <button type="button" className={`island-stop-modal__btn island-stop-modal__btn--action ${badAnswer === 'specific' ? 'island-stop-modal__btn--primary' : ''}`} onClick={() => setBadAnswer('specific')}>Something specific</button>
        </div>
        {badAnswer === 'specific' ? <textarea value={badDetail} onChange={(event) => setBadDetail(event.target.value)} placeholder="Name the rough moment." /> : null}
      </section>

      <section className="island-run-gamified-journal-card__section">
        <strong>3) Describe a typical day</strong>
        <textarea value={typicalDay} onChange={(event) => setTypicalDay(event.target.value)} placeholder="What usually happens from morning to night?" />
      </section>

      {error ? <p className="island-run-gamified-journal-card__error" role="alert">{error}</p> : null}

      <div className="island-stop-modal__cta island-stop-modal__cta--balanced">
        <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={onClose}>Keep rolling</button>
        <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary" onClick={handleSave} disabled={!canSave}>{isSaving ? 'Saving…' : 'Save clue card'}</button>
      </div>
    </div>
  );
}
