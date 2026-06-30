import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [isTypicalDayOpen, setIsTypicalDayOpen] = useState(false);
  const [specificDetailTarget, setSpecificDetailTarget] = useState<'good' | 'bad' | null>(null);

  const goodLabel = goodAnswer === 'nothing_typical'
    ? 'Nothing really — a typical day'
    : (goodDetail.trim() || 'Something specific');
  const badLabel = badAnswer === 'nothing_typical'
    ? 'Nothing really — a typical day'
    : (badDetail.trim() || 'Something specific');
  // The typed text is optional — answering both feeling cards is all that is
  // required to save. No minimum character counts.
  const canSave = Boolean(goodAnswer)
    && Boolean(badAnswer)
    && !isSaving;

  const activeSpecificDetailValue = specificDetailTarget === 'good' ? goodDetail : badDetail;

  const progressLabel = useMemo(() => {
    const complete = [goodAnswer, badAnswer].filter(Boolean).length;
    return `${complete}/2 clues gathered`;
  }, [badAnswer, goodAnswer]);

  useEffect(() => {
    if (!specificDetailTarget) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [specificDetailTarget]);

  const selectSpecificAnswer = (target: 'good' | 'bad') => {
    if (target === 'good') {
      setGoodAnswer('specific');
    } else {
      setBadAnswer('specific');
    }
    setSpecificDetailTarget(target);
  };

  const updateActiveSpecificDetail = (value: string) => {
    if (specificDetailTarget === 'good') {
      setGoodDetail(value);
      return;
    }

    setBadDetail(value);
  };

  const closeSpecificDetailModal = () => setSpecificDetailTarget(null);

  const handleSave = async () => {
    if (!canSave) {
      setError('Answer both feeling cards to save this clue card.');
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

      <section className="island-run-gamified-journal-card__section island-run-gamified-journal-card__section--good">
        <strong>1) What made you feel good today?</strong>
        <div className="island-hatchery-card__actions island-run-gamified-journal-card__choices">
          <button type="button" className={`island-stop-modal__btn island-stop-modal__btn--action ${goodAnswer === 'nothing_typical' ? 'island-stop-modal__btn--primary' : ''}`} onClick={() => setGoodAnswer('nothing_typical')}>Nothing really, a typical day</button>
          <button type="button" className={`island-stop-modal__btn island-stop-modal__btn--action ${goodAnswer === 'specific' ? 'island-stop-modal__btn--primary' : ''}`} onClick={() => selectSpecificAnswer('good')}>Something specific</button>
        </div>
        {goodAnswer === 'specific' && goodDetail.trim() ? <p className="island-run-gamified-journal-card__detail-preview">{goodDetail}</p> : null}
      </section>

      <section className="island-run-gamified-journal-card__section island-run-gamified-journal-card__section--bad">
        <strong>2) What, if anything, made you feel bad?</strong>
        <div className="island-hatchery-card__actions island-run-gamified-journal-card__choices">
          <button type="button" className={`island-stop-modal__btn island-stop-modal__btn--action ${badAnswer === 'nothing_typical' ? 'island-stop-modal__btn--primary' : ''}`} onClick={() => setBadAnswer('nothing_typical')}>Nothing really, a typical day</button>
          <button type="button" className={`island-stop-modal__btn island-stop-modal__btn--action ${badAnswer === 'specific' ? 'island-stop-modal__btn--primary' : ''}`} onClick={() => selectSpecificAnswer('bad')}>Something specific</button>
        </div>
        {badAnswer === 'specific' && badDetail.trim() ? <p className="island-run-gamified-journal-card__detail-preview">{badDetail}</p> : null}
      </section>

      <section className="island-run-gamified-journal-card__section island-run-gamified-journal-card__section--optional">
        <button
          type="button"
          className="island-run-gamified-journal-card__toggle"
          aria-expanded={isTypicalDayOpen}
          onClick={() => setIsTypicalDayOpen((isOpen) => !isOpen)}
        >
          <span>Optional: describe a typical day</span>
          <span aria-hidden="true">{isTypicalDayOpen ? '−' : '+'}</span>
        </button>
        {isTypicalDayOpen ? (
          <textarea value={typicalDay} onChange={(event) => setTypicalDay(event.target.value)} placeholder="What usually happens from morning to night?" />
        ) : null}
      </section>

      {error ? <p className="island-run-gamified-journal-card__error" role="alert">{error}</p> : null}

      {specificDetailTarget ? createPortal(
        <div className="island-run-gamified-journal-card__detail-modal" role="dialog" aria-modal="true" aria-labelledby="island-run-specific-detail-title">
          <div className="island-run-gamified-journal-card__detail-modal-panel">
            <h4 id="island-run-specific-detail-title">Add a quick detail?</h4>
            <p>{specificDetailTarget === 'good' ? 'What was the good moment?' : 'What was the rough moment?'}</p>
            <textarea
              autoFocus
              value={activeSpecificDetailValue}
              onChange={(event) => updateActiveSpecificDetail(event.target.value)}
              placeholder={specificDetailTarget === 'good' ? 'Name the good moment.' : 'Name the rough moment.'}
            />
            <div className="island-run-gamified-journal-card__detail-modal-actions">
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={closeSpecificDetailModal}>Skip for now</button>
              <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary" onClick={closeSpecificDetailModal}>Done</button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      <div className="island-stop-modal__cta island-stop-modal__cta--balanced">
        <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--secondary" onClick={onClose}>Keep rolling</button>
        <button type="button" className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary" onClick={handleSave} disabled={!canSave}>{isSaving ? 'Saving…' : 'Save clue card'}</button>
      </div>
    </div>
  );
}
