import React from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../utils/scrollLock';
import type { IslandMissionBriefingPresentation } from '../services/islandRunMissionBriefing';
import type { IslandMissionTrackerObjective } from '../services/islandRunMissionTracker';

export type MissionObjectiveAction = 'launch' | 'details';

export interface IslandMissionBriefingModalProps {
  isOpen: boolean;
  presentation: IslandMissionBriefingPresentation | null;
  progress?: readonly IslandMissionTrackerObjective[];
  overallProgressPercent?: number;
  objectiveActions?: readonly MissionObjectiveAction[];
  objectiveDetails?: readonly string[];
  acknowledgeLabel?: string;
  onObjectiveSelect?: (objectiveIndex: number) => void;
  primaryActionLabel?: string;
  primaryActionHint?: string;
  primaryActionDisabled?: boolean;
  primaryActionBusy?: boolean;
  milestoneValue?: number;
  milestoneCount?: number;
  onPrimaryAction?: () => void;
  onAcknowledge: () => void;
}

type MissionPhonePhase = 'unfolding' | 'open' | 'folding';

const MISSION_PHONE_UNFOLD_DURATION_MS = 2450;
const MISSION_PHONE_FOLD_DURATION_MS = 320;

function MissionObjectiveGlyph({ label }: { label: string }): React.JSX.Element {
  const normalizedLabel = label.toLowerCase();

  if (normalizedLabel.includes('dynamite')) {
    return (
      <svg className="island-mission-tracker__objective-glyph--demolition" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <g transform="rotate(-6 12 13)">
          <rect x="4.5" y="7.6" width="4" height="12" rx="0.8" />
          <rect x="10" y="6.8" width="4" height="12.8" rx="0.8" />
          <rect x="15.5" y="7.6" width="4" height="12" rx="0.8" />
          <path className="island-mission-tracker__glyph-band" d="M3.8 11.4h16.4v4.1H3.8z" />
        </g>
        <path className="island-mission-tracker__glyph-line" d="M12 7c-.2-2.4 2-3.2 3-4.5" />
        <path className="island-mission-tracker__glyph-spark" d="m16.1 2.8 1.2-1.7.1 2.1 2-.7-1.4 1.6 1.9.9-2.1.2.5 2-1.5-1.4-1 1.8.1-2.1-2 .4 1.7-1.3-1.9-.8 2.1-.3z" />
      </svg>
    );
  }

  if (normalizedLabel.includes('build')) {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M4.1 19.2h15.8v2H4.1zM6.1 9.4h2.7v9H6.1zM10.7 9.4h2.7v9h-2.7zM15.2 9.4h2.7v9h-2.7zM4.6 6.9h14.8v2.6H4.6zM3.6 5.8 12 1.7l8.4 4.1v1.4H3.6z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M5 3.7h14v16.6H5z" />
      <path className="island-mission-tracker__glyph-cutout" d="m8 12.1 2.2 2.3 5.8-6" />
    </svg>
  );
}

export function IslandMissionBriefingModal({
  isOpen,
  presentation,
  progress = [],
  overallProgressPercent,
  objectiveActions = [],
  objectiveDetails = [],
  acknowledgeLabel = 'Accept field order',
  onObjectiveSelect,
  primaryActionLabel,
  primaryActionHint,
  primaryActionDisabled = false,
  primaryActionBusy = false,
  milestoneValue = 0,
  milestoneCount = 0,
  onPrimaryAction,
  onAcknowledge,
}: IslandMissionBriefingModalProps): React.JSX.Element | null {
  const [phase, setPhase] = React.useState<MissionPhonePhase>('unfolding');
  const [selectedObjectiveIndex, setSelectedObjectiveIndex] = React.useState<number | null>(null);
  const titleId = React.useId();
  const acknowledgeRef = React.useRef<HTMLButtonElement | null>(null);
  const onAcknowledgeRef = React.useRef(onAcknowledge);
  const onObjectiveSelectRef = React.useRef(onObjectiveSelect);
  const phaseRef = React.useRef<MissionPhonePhase>('unfolding');
  const closeTimerRef = React.useRef<number | null>(null);

  const updatePhase = React.useCallback((nextPhase: MissionPhonePhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const requestFold = React.useCallback((onFolded: () => void) => {
    if (phaseRef.current === 'folding') return;
    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      onFolded();
      return;
    }
    updatePhase('folding');
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onFolded();
    }, MISSION_PHONE_FOLD_DURATION_MS);
  }, [updatePhase]);

  const requestClose = React.useCallback(() => {
    requestFold(() => onAcknowledgeRef.current());
  }, [requestFold]);

  const handleObjectiveClick = React.useCallback((objectiveIndex: number) => {
    const action = objectiveActions[objectiveIndex] ?? 'details';
    if (action === 'details') {
      setSelectedObjectiveIndex(objectiveIndex);
      return;
    }
    requestFold(() => onObjectiveSelectRef.current?.(objectiveIndex));
  }, [objectiveActions, requestFold]);

  React.useEffect(() => {
    onAcknowledgeRef.current = onAcknowledge;
  }, [onAcknowledge]);

  React.useEffect(() => {
    onObjectiveSelectRef.current = onObjectiveSelect;
  }, [onObjectiveSelect]);

  React.useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
      setSelectedObjectiveIndex(null);
      updatePhase('unfolding');
      return undefined;
    }
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    updatePhase(reduceMotion ? 'open' : 'unfolding');
    const unlockScroll = lockPageScroll();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      unlockScroll();
    };
  }, [isOpen, requestClose, updatePhase]);

  React.useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    [
      '/tech/ExpeditionPhone_v19_folded.webp',
      '/tech/ExpeditionPhone_v21_opening.webp',
      '/tech/ExpeditionPhone_v11_open_front.webp',
    ].forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || phase !== 'unfolding') return undefined;
    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(
      () => updatePhase('open'),
      reduceMotion ? 1 : MISSION_PHONE_UNFOLD_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [isOpen, phase, updatePhase]);

  React.useEffect(() => {
    if (phase !== 'open') return undefined;
    const focusTimer = window.setTimeout(() => acknowledgeRef.current?.focus(), 520);
    return () => window.clearTimeout(focusTimer);
  }, [phase]);

  React.useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
  }, []);

  if (!isOpen || !presentation || typeof document === 'undefined') return null;

  const normalizedProgress = progress.map((item) => {
    const target = Math.max(1, item.target);
    const value = Math.max(0, Math.min(target, item.value));
    return { ...item, target, value, complete: value >= target };
  });
  const derivedOverallPercent = normalizedProgress.length > 0
    ? Math.round(normalizedProgress.reduce((total, item) => total + (item.value / item.target), 0) * (100 / normalizedProgress.length))
    : 0;
  const overallPercent = Math.max(0, Math.min(100, Math.round(overallProgressPercent ?? derivedOverallPercent)));
  const missionTitle = presentation.headline;
  const selectedObjective = selectedObjectiveIndex === null
    ? null
    : normalizedProgress[selectedObjectiveIndex] ?? null;

  return createPortal(
    <div className="island-mission-tracker" data-phase={phase} role="presentation">
      <section
        className="island-mission-tracker__phone"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <img
          className="island-mission-tracker__phone-opening"
          src="/tech/ExpeditionPhone_v21_opening.webp"
          alt=""
          aria-hidden="true"
        />
        <img
          className="island-mission-tracker__phone-hardware"
          src="/tech/ExpeditionPhone_v11_open_front.webp"
          alt=""
          aria-hidden="true"
        />

        <div className="island-mission-tracker__phone-screen">
          <button
            ref={acknowledgeRef}
            type="button"
            className="island-mission-tracker__close"
            aria-label={acknowledgeLabel}
            title={acknowledgeLabel}
            onClick={requestClose}
            disabled={phase !== 'open'}
          >
            ×
          </button>

          <header className="island-mission-tracker__command-plate">
            <span className="island-mission-tracker__command-frame" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className="island-mission-tracker__command-insignia" aria-hidden="true">
              <i />
              <svg viewBox="0 0 40 44" focusable="false">
                <path className="island-mission-tracker__insignia-shield" d="M20 2.4 35 8v12.5c0 10-6.2 17.4-15 21.1-8.8-3.7-15-11.1-15-21.1V8z" />
                <path className="island-mission-tracker__insignia-chevron" d="m11.2 14.2 8.8 5.5 8.8-5.5v5L20 24.7l-8.8-5.5zm0 9.1 8.8 5.5 8.8-5.5v5L20 33.8l-8.8-5.5z" />
              </svg>
              <i />
            </span>
            <h2 id={titleId}>{missionTitle}</h2>
          </header>

          {selectedObjective ? (
            <section className="island-mission-tracker__objective-detail" aria-label={`${selectedObjective.label} mission information`}>
              <button
                type="button"
                className="island-mission-tracker__objective-back"
                onClick={() => setSelectedObjectiveIndex(null)}
              >
                <span aria-hidden="true">‹</span> Objectives
              </button>
              <div className="island-mission-tracker__objective-detail-card">
                <span className="island-mission-tracker__objective-detail-glyph" aria-hidden="true">
                  <MissionObjectiveGlyph label={selectedObjective.label} />
                </span>
                <small>Mission objective</small>
                <h3>{selectedObjective.label}</h3>
                <p>{objectiveDetails[selectedObjectiveIndex ?? 0] ?? presentation.primaryObjective}</p>
              </div>
            </section>
          ) : (
            <ol className="island-mission-tracker__checklist" aria-label="Mission objectives">
              {normalizedProgress.map((item, objectiveIndex) => {
                const objectiveLabel = `${item.label}: ${item.complete ? item.completeLabel : `${item.value} of ${item.target}`}`;
                const objectiveContent = (
                  <>
                    <span
                      className="island-mission-tracker__objective-marker"
                      aria-hidden="true"
                      style={{ '--mission-objective-progress': `${Math.round((item.value / item.target) * 360)}deg` } as React.CSSProperties}
                    >
                      <span>
                        {item.complete ? '✓' : <MissionObjectiveGlyph label={item.label} />}
                      </span>
                    </span>
                    <span className="island-mission-tracker__objective-copy">
                      <strong>{item.label}</strong>
                    </span>
                    <span className="island-mission-tracker__objective-count">
                      {item.complete ? 'Done' : item.displayValue ?? `${Math.floor(item.value)} / ${Math.floor(item.target)}`}
                    </span>
                    {onObjectiveSelect ? <span className="island-mission-tracker__objective-chevron" aria-hidden="true">›</span> : null}
                  </>
                );
                return (
                  <li
                    key={item.label}
                    className={item.complete ? 'island-mission-tracker__checklist-item--complete' : undefined}
                  >
                    {onObjectiveSelect ? (
                      <button
                        type="button"
                        className="island-mission-tracker__objective-row island-mission-tracker__objective-row--actionable"
                        aria-label={`${objectiveLabel}. Open objective.`}
                        onClick={() => handleObjectiveClick(objectiveIndex)}
                      >
                        {objectiveContent}
                      </button>
                    ) : (
                      <div className="island-mission-tracker__objective-row" aria-label={objectiveLabel}>
                        {objectiveContent}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {primaryActionLabel && onPrimaryAction ? (
            <div className="island-mission-tracker__mission-action">
              {milestoneCount > 0 ? (
                <span className="island-mission-tracker__milestones" aria-label={`${milestoneValue} of ${milestoneCount} mission stages complete`}>
                  {Array.from({ length: milestoneCount }, (_, index) => (
                    <i key={index} className={index < milestoneValue ? 'is-filled' : undefined} aria-hidden="true">⬡</i>
                  ))}
                </span>
              ) : null}
              <button
                type="button"
                disabled={primaryActionDisabled || primaryActionBusy || phase !== 'open'}
                onClick={onPrimaryAction}
              >
                <span aria-hidden="true">{milestoneValue >= milestoneCount && milestoneCount > 0 ? '👑' : '🍯'}</span>
                <strong>{primaryActionBusy ? 'PRESSURISING…' : primaryActionLabel}</strong>
              </button>
              {primaryActionHint ? <small>{primaryActionHint}</small> : null}
            </div>
          ) : null}

          <footer className="island-mission-tracker__overall" aria-label="Mission progress">
            <span>
              <small>Mission progress</small>
              <strong>{overallPercent}%</strong>
            </span>
            <span
              className="island-mission-tracker__overall-track"
              role="progressbar"
              aria-label="Overall mission progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={overallPercent}
            >
              <i style={{ width: `${overallPercent}%` }} />
            </span>
          </footer>
        </div>
      </section>
    </div>,
    document.body,
  );
}
