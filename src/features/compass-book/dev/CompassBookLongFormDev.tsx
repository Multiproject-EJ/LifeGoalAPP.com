import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Session } from '@supabase/supabase-js';
import { useCompassBook, type CompassAnswerEntry } from '../hooks/useCompassBook';
import { COMPASS_BOOK_CHAPTERS, getChapterActivities } from '../content/compassBookCurriculum';
import { CompassActivityRenderer } from '../components/CompassActivityRenderer';
import { buildDevSampleActivityAnswers } from '../logic/devLongFormSamples';
import type { CompassAnswerValue, CompassBookChapterId } from '../types';
import '../components/compassBook.css';
import './CompassBookLongFormDev.css';

type Drafts = Record<string, Record<string, CompassAnswerValue | undefined>>;

/**
 * Dev mode: the whole Compass Book as one long form (user request
 * 2026-09-30). Every chapter and activity, answerable in place, saved through
 * the canonical Compass Book hook; "Fill everything" writes sample answers
 * for whatever is still empty so the full book (and its chapter graphics)
 * can be reviewed at once.
 */
export function CompassBookLongFormDev({ session, onClose }: { session: Session | null; onClose: () => void }) {
  const book = useCompassBook(session);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [openChapter, setOpenChapter] = useState<CompassBookChapterId | null>(COMPASS_BOOK_CHAPTERS[0]?.id ?? null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onCloseRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const savedValues = (chapterId: CompassBookChapterId, activityId: string) => {
    const values: Record<string, CompassAnswerValue | undefined> = {};
    for (const answer of book.getChapterState(chapterId)?.answers ?? []) {
      if (answer.activityId === activityId) values[answer.questionId] = answer.value;
    }
    return values;
  };

  const chapterOptionValues = (chapterId: CompassBookChapterId) => {
    const values: Record<string, CompassAnswerValue | undefined> = {};
    for (const answer of book.getChapterState(chapterId)?.answers ?? []) values[answer.questionId] = answer.value;
    for (const activity of getChapterActivities(chapterId)) Object.assign(values, drafts[activity.id] ?? {});
    return values;
  };

  const totals = useMemo(() => {
    let activities = 0;
    let answered = 0;
    for (const chapter of COMPASS_BOOK_CHAPTERS) {
      const state = book.getChapterState(chapter.id);
      for (const activity of getChapterActivities(chapter.id)) {
        activities += 1;
        if (state?.completedActivityIds?.includes(activity.id)) answered += 1;
      }
    }
    return { activities, answered };
  }, [book]);

  const saveActivity = async (chapterId: CompassBookChapterId, activityId: string) => {
    const draft = drafts[activityId] ?? {};
    const entries: CompassAnswerEntry[] = Object.entries(draft)
      .filter((entry): entry is [string, CompassAnswerValue] => entry[1] !== undefined)
      .map(([questionId, value]) => ({ questionId, value }));
    if (entries.length === 0) return;
    setBusy(true);
    try {
      await book.saveActivityAnswers(chapterId, activityId, entries);
      setDrafts((current) => { const next = { ...current }; delete next[activityId]; return next; });
      setStatus(`Saved ${activityId}`);
    } finally {
      setBusy(false);
    }
  };

  const fillEverything = async () => {
    setBusy(true);
    try {
      let filled = 0;
      for (const chapter of COMPASS_BOOK_CHAPTERS) {
        const items: Array<{ activityId: string; entries: CompassAnswerEntry[] }> = [];
        const chapterValues: Record<string, CompassAnswerValue | undefined> = {};
        for (const answer of book.getChapterState(chapter.id)?.answers ?? []) chapterValues[answer.questionId] = answer.value;
        for (const activity of getChapterActivities(chapter.id)) {
          const existing = { ...savedValues(chapter.id, activity.id), ...(drafts[activity.id] ?? {}) };
          const samples = buildDevSampleActivityAnswers(activity.blocks, existing, chapterValues);
          const merged = { ...existing, ...samples };
          Object.assign(chapterValues, merged);
          const entries = Object.entries(merged)
            .filter((entry): entry is [string, CompassAnswerValue] => entry[1] !== undefined)
            .map(([questionId, value]) => ({ questionId, value }));
          if (entries.length > 0) items.push({ activityId: activity.id, entries });
          filled += Object.keys(samples).length;
        }
        if (items.length > 0) await book.saveManyActivityAnswers(chapter.id, items);
      }
      setDrafts({});
      setStatus(`Filled ${filled} empty answers across ${COMPASS_BOOK_CHAPTERS.length} chapters.`);
    } finally {
      setBusy(false);
    }
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="compass-long-form" role="dialog" aria-modal="true" aria-labelledby="compass-long-form-title">
      <div className="compass-long-form__backdrop" aria-hidden="true" onClick={onClose} />
      <div className="compass-long-form__dialog">
        <header className="compass-long-form__header">
          <div>
            <p className="compass-long-form__eyebrow">Dev · Compass Book</p>
            <h2 id="compass-long-form-title">Long-form Q&amp;A</h2>
            <p className="compass-long-form__totals">{totals.answered}/{totals.activities} activities complete</p>
          </div>
          <div className="compass-long-form__actions">
            <button type="button" disabled={busy || !book.ready} onClick={() => void fillEverything()}>Fill everything empty</button>
            <button type="button" className="compass-long-form__close" aria-label="Close" onClick={onClose}>×</button>
          </div>
        </header>
        {status ? <p className="compass-long-form__status" role="status">{status}</p> : null}
        {!book.ready ? <p className="compass-long-form__status">Loading your Compass Book…</p> : null}
        <div className="compass-long-form__body">
          {COMPASS_BOOK_CHAPTERS.map((chapter) => {
            const open = openChapter === chapter.id;
            const state = book.getChapterState(chapter.id);
            const activities = getChapterActivities(chapter.id);
            const done = activities.filter((activity) => state?.completedActivityIds?.includes(activity.id)).length;
            return (
              <section key={chapter.id} className="compass-long-form__chapter">
                <button type="button" className="compass-long-form__chapter-toggle" aria-expanded={open}
                  onClick={() => setOpenChapter(open ? null : chapter.id)}>
                  <span>Chapter {chapter.order} · {chapter.title}</span>
                  <small>{done}/{activities.length}{state?.status === 'complete' ? ' · sealed' : ''}</small>
                </button>
                {open ? activities.map((activity) => {
                  const values = { ...savedValues(chapter.id, activity.id), ...(drafts[activity.id] ?? {}) };
                  const dirty = Boolean(drafts[activity.id] && Object.keys(drafts[activity.id]!).length > 0);
                  return (
                    <article key={activity.id} className="compass-long-form__activity">
                      <h3>
                        <span>Island {String(activity.islandNumber).padStart(3, '0')}</span> {activity.title}
                        {state?.completedActivityIds?.includes(activity.id) ? <em> ✓</em> : null}
                      </h3>
                      <CompassActivityRenderer
                        blocks={activity.blocks}
                        values={values}
                        optionSourceValues={{ ...chapterOptionValues(chapter.id), ...values }}
                        onChange={(questionId, value) => setDrafts((current) => ({
                          ...current,
                          [activity.id]: { ...(current[activity.id] ?? {}), [questionId]: value },
                        }))}
                      />
                      <button type="button" className="compass-long-form__save" disabled={!dirty || busy}
                        onClick={() => void saveActivity(chapter.id, activity.id)}>
                        Save
                      </button>
                    </article>
                  );
                }) : null}
              </section>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
