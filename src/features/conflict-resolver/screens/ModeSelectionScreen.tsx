import { useEffect, useMemo, useState } from 'react';
import type { ConflictType } from '../types/conflictSession';
import type { AppSurface } from '../../../surfaces/surfaceContext';

type ModeSelectionScreenProps = {
  surface?: AppSurface;
  selectedType: ConflictType | null;
  onSelectType: (type: ConflictType) => void;
  onContinue: () => void | Promise<void>;
  sharedSessionId: string | null;
  sharedSessionCodeInput: string;
  onSharedSessionCodeInputChange: (value: string) => void;
  sharedParticipantCount: number;
  sharedSessionLastSyncedAt: string | null;
  onCreateSharedSession: () => void | Promise<void>;
  onJoinSharedSession: () => void | Promise<void>;
  onRefreshSharedSession: () => void | Promise<void>;
  sharedSessionNotice?: string | null;
  sharedSessionError: string | null;
  sharedSessionBusy: boolean;
  recoverableDraft: boolean;
  onResumeDraft: () => void;
  onStartFresh: () => void;
};

export function ModeSelectionScreen({
  surface = 'habitgame',
  selectedType,
  onSelectType,
  onContinue,
  sharedSessionId,
  sharedSessionCodeInput,
  onSharedSessionCodeInputChange,
  sharedParticipantCount,
  sharedSessionLastSyncedAt,
  onCreateSharedSession,
  onJoinSharedSession,
  onRefreshSharedSession,
  sharedSessionNotice,
  sharedSessionError,
  sharedSessionBusy,
  recoverableDraft,
  onResumeDraft,
  onStartFresh,
}: ModeSelectionScreenProps) {
  const isPeaceBetween = surface === 'peacebetween';
  const rotatingCopy = useMemo(
    () => ([
      { title: 'Let’s clear something up', subtitle: 'No blame. Just clarity.' },
      { title: 'No miscommunication', subtitle: 'No judging. No point scoring.' },
      { title: 'Inside each of us lives a different world', subtitle: 'No manipulation. Let’s squash it.' },
    ]),
    [],
  );
  const [copyIndex, setCopyIndex] = useState(0);
  const [isCopyFadingOut, setIsCopyFadingOut] = useState(false);
  const [innerIconMissing, setInnerIconMissing] = useState(false);
  const introSteps = useMemo(
    () => ([
      'Understanding without judgment',
      'Creative ways to meet in the middle',
      'Apologies that truly land',
      'A sense of resolution',
    ]),
    [],
  );
  const [animatedStepIndex, setAnimatedStepIndex] = useState(-1);

  useEffect(() => {
    if (isPeaceBetween) return undefined;
    let fadeTimeoutId: number | null = null;

    const intervalId = window.setInterval(() => {
      setIsCopyFadingOut(true);
      fadeTimeoutId = window.setTimeout(() => {
        setCopyIndex((prev) => (prev + 1) % rotatingCopy.length);
        setIsCopyFadingOut(false);
      }, 280);
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
      if (fadeTimeoutId !== null) {
        window.clearTimeout(fadeTimeoutId);
      }
    };
  }, [isPeaceBetween, rotatingCopy.length]);

  useEffect(() => {
    const prefersReducedMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setAnimatedStepIndex(introSteps.length);
      return undefined;
    }

    setAnimatedStepIndex(-1);
    const timeoutIds = introSteps.map((_, index) => window.setTimeout(() => {
      setAnimatedStepIndex(index);
    }, 650 + (index * 1300)));
    timeoutIds.push(window.setTimeout(() => {
      setAnimatedStepIndex(introSteps.length);
    }, 650 + (introSteps.length * 1300)));

    return () => {
      timeoutIds.forEach((id) => window.clearTimeout(id));
    };
  }, [introSteps]);

  const modeTitle = isPeaceBetween ? 'Where would you like to begin?' : rotatingCopy[copyIndex].title;
  const modeSubtitle = isPeaceBetween
    ? 'Choose a path to bring more clarity, care, and understanding to this conversation.'
    : rotatingCopy[copyIndex].subtitle;

  return (
    <section className="conflict-resolver__screen" aria-labelledby="conflict-mode-title">
      <img
        className="conflict-resolver__hero-image"
        src="/icons/Energy/peace_between.webp"
        alt="Two people reconnecting calmly"
      />
      <header className="conflict-resolver__header conflict-resolver__header--mode">
        <h3
          id="conflict-mode-title"
          className={`conflict-resolver__title conflict-resolver__title--mode ${isCopyFadingOut ? 'conflict-resolver__copy-fade-out' : 'conflict-resolver__copy-fade-in'}`}
        >
          {modeTitle}
        </h3>
        <p
          className={`conflict-resolver__subtitle conflict-resolver__subtitle--mode ${isCopyFadingOut ? 'conflict-resolver__copy-fade-out' : 'conflict-resolver__copy-fade-in'}`}
        >
          {modeSubtitle}
        </p>
      </header>

      <section className="conflict-resolver__intro-points" aria-label="Conflict resolver principles">
        <p className="conflict-resolver__intro-heading">4 guided steps</p>
        <ol className="conflict-resolver__intro-list">
          {introSteps.map((step, index) => {
            const isDone = index < animatedStepIndex;
            const isActive = index === animatedStepIndex;
            return (
              <li
                key={step}
                className={`conflict-resolver__intro-item ${isDone ? 'conflict-resolver__intro-item--done' : ''} ${isActive ? 'conflict-resolver__intro-item--active' : ''}`.trim()}
              >
                <span className="conflict-resolver__intro-node" aria-hidden="true">
                  {isDone ? '✓' : index + 1}
                </span>
                <span className="conflict-resolver__intro-copy">{step}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {recoverableDraft ? (
        <section
          className="conflict-resolver__shared-session-card conflict-resolver__shared-session-card--resume"
          aria-label="Resume previous session"
        >
          <h4>Resume last session?</h4>
          <p>We found a saved conflict draft from your last visit.</p>
          <div className="conflict-resolver__shared-session-actions">
            <button type="button" className="btn btn--primary" onClick={onResumeDraft}>
              Resume saved flow
            </button>
            <button type="button" className="btn" onClick={onStartFresh}>
              Start fresh
            </button>
          </div>
        </section>
      ) : null}

      <div className="conflict-resolver__mode-grid" role="radiogroup" aria-label="Conflict type">
        <button
          type="button"
          role="radio"
          aria-checked={selectedType === 'inner_tension'}
          className={`conflict-resolver__mode-card ${
            selectedType === 'inner_tension' ? 'conflict-resolver__mode-card--selected' : ''
          }`}
          onClick={() => onSelectType('inner_tension')}
        >
          <span className="conflict-resolver__mode-card-media" aria-hidden="true">
            {innerIconMissing ? (
              <span className="conflict-resolver__mode-icon">🧠</span>
            ) : (
              <img
                className="conflict-resolver__mode-icon-image"
                src="/icons/Energy/Inner_tension.webp"
                alt=""
                onError={() => setInnerIconMissing(true)}
              />
            )}
          </span>
          <span className="conflict-resolver__mode-card-copy">
            <span className="conflict-resolver__mode-title">{isPeaceBetween ? 'Personal reflection' : 'Inner Tension'}</span>
            <span className="conflict-resolver__mode-subtitle">
              {isPeaceBetween ? 'Clarify your own feelings before speaking with someone else.' : 'You vs yourself'}
            </span>
          </span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={selectedType === 'shared_conflict'}
          className={`conflict-resolver__mode-card ${
            selectedType === 'shared_conflict' ? 'conflict-resolver__mode-card--selected' : ''
          }`}
          onClick={() => onSelectType('shared_conflict')}
        >
          <span className="conflict-resolver__mode-card-media" aria-hidden="true">
            <span className="conflict-resolver__mode-icon">🤝</span>
          </span>
          <span className="conflict-resolver__mode-card-copy">
            <span className="conflict-resolver__mode-title">{isPeaceBetween ? 'Shared conversation' : 'Shared Conflict'}</span>
            <span className="conflict-resolver__mode-subtitle">
              {isPeaceBetween ? 'Work through this with another person in a guided shared session.' : 'You + others'}
            </span>
          </span>
        </button>
      </div>

      {selectedType === 'shared_conflict' ? (
        <section className="conflict-resolver__shared-session-card" aria-label="Shared conflict session setup">
          <h4>{isPeaceBetween ? 'Shared conversation setup' : 'Shared session setup'}</h4>
          <p>
            {isPeaceBetween
              ? 'Create a secure session code and share it with the other person, or join an existing code.'
              : 'Create a session code and share it with another app user, or join theirs.'}
          </p>

          {sharedSessionId ? (
            <div className="conflict-resolver__shared-session-status">
              <p><strong>Session code:</strong> {sharedSessionId}</p>
              <p><strong>Participants joined:</strong> {sharedParticipantCount}</p>
              <p>
                <strong>Last sync:</strong>{' '}
                {sharedSessionLastSyncedAt ? new Date(sharedSessionLastSyncedAt).toLocaleTimeString() : 'Pending'}
              </p>
              <button type="button" className="btn" onClick={onRefreshSharedSession} disabled={sharedSessionBusy}>
                Refresh participants
              </button>
            </div>
          ) : (
            <>
              <div className="conflict-resolver__shared-session-actions">
                <button type="button" className="btn" onClick={onCreateSharedSession} disabled={sharedSessionBusy}>
                  Create shared session
                </button>
              </div>

              <label htmlFor="shared-session-code" className="conflict-resolver__prompt-label">Join by session code</label>
              <div className="conflict-resolver__shared-session-actions">
                <input
                  id="shared-session-code"
                  className="conflict-resolver__text-input"
                  placeholder="Paste session code"
                  value={sharedSessionCodeInput}
                  onChange={(event) => onSharedSessionCodeInputChange(event.target.value)}
                />
                <button type="button" className="btn" onClick={onJoinSharedSession} disabled={sharedSessionBusy}>
                  Join
                </button>
              </div>
            </>
          )}

          {sharedSessionNotice ? <p className="conflict-resolver__alignment-banner">{sharedSessionNotice}</p> : null}
          {sharedSessionError ? <p className="conflict-resolver__input-error">{sharedSessionError}</p> : null}
        </section>
      ) : null}

      <button
        type="button"
        className="btn btn--primary conflict-resolver__primary-cta"
        disabled={!selectedType || (selectedType === 'shared_conflict' && !sharedSessionId)}
        onClick={onContinue}
      >
        {isPeaceBetween ? 'Begin' : 'Continue'}
      </button>
    </section>
  );
}
