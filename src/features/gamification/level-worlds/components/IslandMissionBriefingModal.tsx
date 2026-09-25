import React from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../utils/scrollLock';
import { triggerIslandRunHaptic } from '../services/islandRunAudio';
import type { IslandMissionBriefingPresentation } from '../services/islandRunMissionBriefing';
import type { IslandMissionTrackerObjective } from '../services/islandRunMissionTracker';
import type { resolveIslandRunCompletion } from '../services/islandRunCompletion';

export type MissionObjectiveAction = 'launch' | 'details';

export interface IslandMissionBriefingModalProps {
  isOpen: boolean;
  presentation: IslandMissionBriefingPresentation | null;
  progress?: readonly IslandMissionTrackerObjective[];
  overallProgressPercent?: number;
  islandCompletion?: ReturnType<typeof resolveIslandRunCompletion> | null;
  objectiveActions?: readonly MissionObjectiveAction[];
  objectiveDetails?: readonly string[];
  acknowledgeLabel?: string;
  onObjectiveSelect?: (objectiveIndex: number) => void;
  primaryActionLabel?: string;
  primaryActionHint?: string;
  primaryActionDisabled?: boolean;
  primaryActionBusy?: boolean;
  variant?: 'default' | 'living-compass';
  milestoneValue?: number;
  milestoneCount?: number;
  onPrimaryAction?: () => void;
  onAcknowledge: () => void;
}

type MissionPhonePhase = 'unfolding' | 'open' | 'folding';

// The phone arrives as a compact pack, unlatches with a click, then slides out
// into a full phone. Keep these in sync with the island-mission-phone-* keyframes.
const MISSION_PHONE_UNFOLD_DURATION_MS = 1100;
const MISSION_PHONE_FOLD_DURATION_MS = 460;
const MISSION_PHONE_UNFOLD_LATCH_MS = 470;
const MISSION_PHONE_UNFOLD_DOCK_MS = 970;
const MISSION_PHONE_FOLD_LATCH_MS = 240;
const MISSION_PHONE_PACK_CENTER_RATIO = 0.135;
const MISSION_PHONE_LAUNCH_SOURCE_SELECTOR = '.island-run-board__mission-phone-rail';

// Points the fly-in/fly-out at the rail button that summoned the phone, so the
// pack visibly leaves and returns to it. Falls back to the lower right edge.
function setMissionPhoneLaunchOrigin(phone: HTMLElement | null): void {
  if (!phone || typeof window === 'undefined') return;
  const phoneRect = phone.getBoundingClientRect();
  const sourceRect = document.querySelector<HTMLElement>(MISSION_PHONE_LAUNCH_SOURCE_SELECTOR)?.getBoundingClientRect();
  const hasSource = Boolean(sourceRect && sourceRect.width > 0 && sourceRect.height > 0);
  const targetX = hasSource && sourceRect ? sourceRect.left + sourceRect.width / 2 : window.innerWidth - 40;
  const targetY = hasSource && sourceRect ? sourceRect.top + sourceRect.height / 2 : window.innerHeight * 0.62;
  const packCenterX = phoneRect.left + phoneRect.width / 2;
  const packCenterY = phoneRect.top + phoneRect.height * MISSION_PHONE_PACK_CENTER_RATIO;
  phone.style.setProperty('--mission-phone-launch-x', `${Math.round(targetX - packCenterX)}px`);
  phone.style.setProperty('--mission-phone-launch-y', `${Math.round(targetY - packCenterY)}px`);
}

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
  islandCompletion,
  objectiveActions = [],
  objectiveDetails = [],
  acknowledgeLabel = 'Accept field order',
  onObjectiveSelect,
  primaryActionLabel,
  primaryActionHint,
  primaryActionDisabled = false,
  primaryActionBusy = false,
  variant = 'default',
  milestoneValue = 0,
  milestoneCount = 0,
  onPrimaryAction,
  onAcknowledge,
}: IslandMissionBriefingModalProps): React.JSX.Element | null {
  const [phase, setPhase] = React.useState<MissionPhonePhase>('unfolding');
  const [selectedObjectiveIndex, setSelectedObjectiveIndex] = React.useState<number | null>(null);
  const titleId = React.useId();
  const acknowledgeRef = React.useRef<HTMLButtonElement | null>(null);
  const phoneRef = React.useRef<HTMLElement | null>(null);
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
    setMissionPhoneLaunchOrigin(phoneRef.current);
    updatePhase('folding');
    window.setTimeout(() => triggerIslandRunHaptic('mission_phone_latch'), MISSION_PHONE_FOLD_LATCH_MS);
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

  React.useLayoutEffect(() => {
    if (isOpen) setMissionPhoneLaunchOrigin(phoneRef.current);
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || phase !== 'unfolding') return undefined;
    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timers = [window.setTimeout(
      () => updatePhase('open'),
      reduceMotion ? 1 : MISSION_PHONE_UNFOLD_DURATION_MS,
    )];
    if (!reduceMotion) {
      timers.push(
        window.setTimeout(() => triggerIslandRunHaptic('mission_phone_latch'), MISSION_PHONE_UNFOLD_LATCH_MS),
        window.setTimeout(() => triggerIslandRunHaptic('mission_phone_dock'), MISSION_PHONE_UNFOLD_DOCK_MS),
      );
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [isOpen, phase, updatePhase]);

  React.useEffect(() => {
    if (phase !== 'open') return undefined;
    const focusTimer = window.setTimeout(() => acknowledgeRef.current?.focus(), 320);
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
    <div className="island-mission-tracker" data-phase={phase} data-variant={variant} data-objective-count={normalizedProgress.length} role="presentation">
      <section
        ref={phoneRef}
        className="island-mission-tracker__phone"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <span className="island-mission-tracker__phone-shadow" aria-hidden="true" />
        <div className="island-mission-tracker__device">
          <span className="island-mission-tracker__edge island-mission-tracker__edge--left" aria-hidden="true"><i /></span>
          <span className="island-mission-tracker__edge island-mission-tracker__edge--right" aria-hidden="true"><i /></span>
          <span className="island-mission-tracker__edge island-mission-tracker__edge--top" aria-hidden="true" />
          <span className="island-mission-tracker__edge island-mission-tracker__edge--bottom" aria-hidden="true" />
          <div className="island-mission-tracker__body">
            <span className="island-mission-tracker__glass" aria-hidden="true" />
            <span className="island-mission-tracker__led" aria-hidden="true" />
            <span className="island-mission-tracker__pack-face" aria-hidden="true">
              <svg viewBox="0 0 48 48" focusable="false">
                <path d="M24 3.5 28.2 19.8 44.5 24 28.2 28.2 24 44.5 19.8 28.2 3.5 24 19.8 19.8z" />
                <path className="island-mission-tracker__pack-face-facet" d="M24 3.5 28.2 19.8 24 24zm20.5 20.5L28.2 28.2 24 24zM24 44.5l-4.2-16.3L24 24zM3.5 24l16.3-4.2L24 24z" />
              </svg>
              <small>Mission · {overallPercent}%</small>
            </span>
            <span className="island-mission-tracker__sheen" aria-hidden="true" />

            <div className="island-mission-tracker__phone-screen" style={islandCompletion ? { overflowY: 'auto' } : undefined}>
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
                          {item.complete && item.label !== 'Build Landmarks' ? 'Done' : item.displayValue ?? `${Math.floor(item.value)} / ${Math.floor(item.target)}`}
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
                        <i key={index} className={index < milestoneValue ? 'is-filled' : undefined} aria-hidden="true">{variant === 'living-compass' ? index + 1 : '⬡'}</i>
                      ))}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    disabled={primaryActionDisabled || primaryActionBusy || phase !== 'open'}
                    onClick={onPrimaryAction}
                  >
                    <span aria-hidden="true">{variant === 'living-compass' ? '✧' : milestoneValue >= milestoneCount && milestoneCount > 0 ? '👑' : '🍯'}</span>
                    <strong>{primaryActionBusy ? variant === 'living-compass' ? 'Awakening…' : 'PRESSURISING…' : primaryActionLabel}</strong>
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
              {islandCompletion ? (
                <details style={{ fontSize: 11, lineHeight: 1.5, marginTop: 8, maxHeight: 135, overflowY: 'auto', flexShrink: 0 }}>
                  <summary aria-label={`Island completion ${islandCompletion.percent}%`} style={{ cursor: 'pointer' }}>
                    Island {islandCompletion.percent}% · {islandCompletion.complete ? 'Ready to travel' : 'View remaining requirements'}
                  </summary>
                  <ul style={{ paddingLeft: 16, margin: '6px 0' }}>
                    {islandCompletion.requirements.map(item => (
                      <li key={item.id}>{item.complete ? '✓' : '○'} {item.label} · {item.value}/{item.target}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
            <span className="island-mission-tracker__bottom-cap" aria-hidden="true"><i /></span>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
