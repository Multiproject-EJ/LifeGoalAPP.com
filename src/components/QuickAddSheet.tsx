/**
 * QuickAddSheet — the one fast path to add a goal or a habit anywhere in the app.
 *
 * Mobile-first bottom sheet with two tabs. Each mode needs exactly two taps of
 * input (a title plus a life area) before "Add" is enabled; everything else is
 * optional. Deep planning stays in the existing editors — after a save the
 * sheet points at them as the "make it stronger" path instead of front-loading
 * a big form here.
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Session } from '@supabase/supabase-js';

import {
  LIFE_WHEEL_CATEGORIES,
  type LifeWheelCategoryKey,
} from '../features/checkins/LifeWheelCheckins';
import { insertGoal } from '../services/goals';
import { createHabitV2 } from '../services/habitsV2';
import './QuickAddSheet.css';

export type QuickAddMode = 'goal' | 'habit';

export type QuickAddGoalOption = {
  id: string;
  title: string;
};

export type QuickAddSheetProps = {
  session: Session | null;
  initialMode?: QuickAddMode;
  /** Active goals offered as "supports goal" links in habit mode. */
  goalOptions?: QuickAddGoalOption[];
  /** Called after a successful create so parents can refresh their lists. */
  onCreated?: (mode: QuickAddMode) => void;
  /** Optional "make it stronger" hand-off into the deep editor. */
  onOpenAdvanced?: (mode: QuickAddMode) => void;
  onClose: () => void;
};

const HABIT_EMOJI_CHOICES = ['✨', '💪', '🏃', '📖', '🧘', '💧', '🥗', '🛌'] as const;

type SheetState = 'editing' | 'saving' | 'saved';

export function QuickAddSheet({
  session,
  initialMode = 'goal',
  goalOptions = [],
  onCreated,
  onOpenAdvanced,
  onClose,
}: QuickAddSheetProps): JSX.Element {
  const [mode, setMode] = useState<QuickAddMode>(initialMode);
  const [state, setState] = useState<SheetState>('editing');
  const [error, setError] = useState<string | null>(null);
  const [savedTitle, setSavedTitle] = useState('');

  const [title, setTitle] = useState('');
  const [lifeArea, setLifeArea] = useState<LifeWheelCategoryKey | null>(null);
  const [emoji, setEmoji] = useState<string>(HABIT_EMOJI_CHOICES[0]);
  const [linkedGoalId, setLinkedGoalId] = useState<string | null>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && state !== 'saving') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, state]);

  const switchMode = useCallback((next: QuickAddMode) => {
    setMode(next);
    setError(null);
    setState('editing');
  }, []);

  const canSave = title.trim().length > 0 && state === 'editing';

  const handleSave = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || state !== 'editing') return;
    const userId = session?.user?.id;
    if (!userId) {
      setError('Sign in to save.');
      return;
    }

    setState('saving');
    setError(null);
    try {
      if (mode === 'goal') {
        const { error: saveError } = await insertGoal({
          user_id: userId,
          title: trimmedTitle,
          life_wheel_category: lifeArea,
          status_tag: 'on_track',
        });
        if (saveError) throw new Error(saveError.message);
      } else {
        const schedule = { mode: 'daily' };
        const { error: saveError } = await createHabitV2(
          {
            title: trimmedTitle,
            emoji,
            type: 'boolean',
            schedule,
            autoprog: {
              tier: 'standard',
              baseSchedule: schedule,
              baseTarget: null,
              lastShiftAt: null,
              lastShiftType: null,
            },
            domain_key: lifeArea,
            goal_id: linkedGoalId,
            habit_intent: 'build',
            archived: false,
            status: 'active',
            target_num: null,
            target_unit: null,
          },
          userId,
        );
        if (saveError) throw new Error(saveError.message);
      }

      setSavedTitle(trimmedTitle);
      setState('saved');
      setTitle('');
      setLinkedGoalId(null);
      onCreated?.(mode);
    } catch (saveError) {
      setError(
        saveError instanceof Error && saveError.message
          ? saveError.message
          : 'Could not save. Please try again.',
      );
      setState('editing');
    }
  }, [emoji, lifeArea, linkedGoalId, mode, onCreated, session, state, title]);

  const modeNoun = mode === 'goal' ? 'goal' : 'habit';

  return createPortal(
    <div className="quick-add" role="dialog" aria-modal="true" aria-label="Quick add">
      <button
        type="button"
        className="quick-add__backdrop"
        aria-label="Close quick add"
        onClick={state === 'saving' ? undefined : onClose}
      />
      <div className="quick-add__sheet">
        <div className="quick-add__grabber" aria-hidden="true" />
        <header className="quick-add__header">
          <div className="quick-add__tabs" role="tablist" aria-label="What to add">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'goal'}
              className={`quick-add__tab ${mode === 'goal' ? 'quick-add__tab--active' : ''}`}
              onClick={() => switchMode('goal')}
            >
              🎯 Goal
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'habit'}
              className={`quick-add__tab ${mode === 'habit' ? 'quick-add__tab--active' : ''}`}
              onClick={() => switchMode('habit')}
            >
              🔄 Habit
            </button>
          </div>
          <button
            type="button"
            className="quick-add__close"
            onClick={onClose}
            disabled={state === 'saving'}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        {state === 'saved' ? (
          <div className="quick-add__done" role="status">
            <span className="quick-add__done-emoji" aria-hidden="true">
              ✓
            </span>
            <p className="quick-add__done-title">“{savedTitle}” added.</p>
            <p className="quick-add__done-sub">
              {mode === 'goal'
                ? 'Give it a why, a target date, and a first step to raise its Insight pillar.'
                : 'Give it a cue and an environment rule to make it stick.'}
            </p>
            <div className="quick-add__done-actions">
              {onOpenAdvanced ? (
                <button
                  type="button"
                  className="quick-add__secondary"
                  onClick={() => onOpenAdvanced(mode)}
                >
                  Make it stronger
                </button>
              ) : null}
              <button type="button" className="quick-add__secondary" onClick={() => setState('editing')}>
                Add another
              </button>
              <button type="button" className="quick-add__primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="quick-add__body">
            <label className="quick-add__field">
              <span className="quick-add__label">
                {mode === 'goal' ? 'What do you want to achieve?' : 'What will you repeat?'}
              </span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleSave();
                }}
                placeholder={mode === 'goal' ? 'e.g. Run a 10k in October' : 'e.g. Read 10 pages'}
                maxLength={120}
                autoFocus
                disabled={state === 'saving'}
              />
            </label>

            {mode === 'habit' ? (
              <div className="quick-add__field">
                <span className="quick-add__label">Icon</span>
                <div className="quick-add__chips" role="group" aria-label="Habit icon">
                  {HABIT_EMOJI_CHOICES.map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      className={`quick-add__chip quick-add__chip--emoji ${
                        emoji === choice ? 'quick-add__chip--active' : ''
                      }`}
                      aria-pressed={emoji === choice}
                      onClick={() => setEmoji(choice)}
                      disabled={state === 'saving'}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="quick-add__field">
              <span className="quick-add__label">Life area (optional)</span>
              <div className="quick-add__chips" role="group" aria-label="Life area">
                {LIFE_WHEEL_CATEGORIES.map((category) => (
                  <button
                    key={category.key}
                    type="button"
                    className={`quick-add__chip ${
                      lifeArea === category.key ? 'quick-add__chip--active' : ''
                    }`}
                    aria-pressed={lifeArea === category.key}
                    onClick={() =>
                      setLifeArea((current) => (current === category.key ? null : category.key))
                    }
                    disabled={state === 'saving'}
                  >
                    {category.shortLabel}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'habit' && goalOptions.length > 0 ? (
              <div className="quick-add__field">
                <span className="quick-add__label">Supports a goal (optional)</span>
                <div className="quick-add__chips" role="group" aria-label="Supported goal">
                  {goalOptions.slice(0, 6).map((goal) => (
                    <button
                      key={goal.id}
                      type="button"
                      className={`quick-add__chip ${
                        linkedGoalId === goal.id ? 'quick-add__chip--active' : ''
                      }`}
                      aria-pressed={linkedGoalId === goal.id}
                      onClick={() =>
                        setLinkedGoalId((current) => (current === goal.id ? null : goal.id))
                      }
                      disabled={state === 'saving'}
                    >
                      {goal.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? <p className="quick-add__error">{error}</p> : null}

            <button
              type="button"
              className="quick-add__primary quick-add__primary--full"
              onClick={() => void handleSave()}
              disabled={!canSave}
            >
              {state === 'saving' ? 'Adding…' : `Add ${modeNoun}`}
            </button>
            <p className="quick-add__hint">
              Just a title is enough — you can strengthen it any time.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
