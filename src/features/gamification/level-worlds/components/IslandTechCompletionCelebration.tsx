import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../utils/scrollLock';
import { IslandTechGrid } from './IslandTechGrid';
import { ConfettiBurst } from './ConfettiBurst';
import './IslandTechCollectionModal.css';

/**
 * IslandTechCompletionCelebration — the full-grid (ninth piece) celebration.
 *
 * Unlike the fast pickup modal, this surface does NOT auto-dismiss: the player
 * must deliberately activate the newly restored Concord. The nine-piece grid
 * assembles, resolves into the live device, and then hands the player straight
 * into the communication hub so the collection has an immediate purpose.
 *
 * Presentation only — the dice were already granted by the canonical action
 * upstream; this component just animates the result and reports the deliberate
 * continue. The named Concord unlock is presentation only; canonical access is committed
 * before this animation opens.
 */

export interface TechCompletionCelebrationResult {
  /** All collected slots (expected to be all nine). */
  collectedSlots: number[];
  /** Dice paid for a line completed on the same (ninth) pickup. */
  finalLineRewardDice: number;
  /** Dice paid for completing the full grid (canonically 100). */
  fullBoardRewardDice: number;
  /** Total dice granted for this completion pickup. */
  totalRewardDice: number;
}

export interface IslandTechCompletionCelebrationProps {
  result: TechCompletionCelebrationResult;
  /** Primary payoff: dismiss the celebration and open the live Concord hub. */
  onOpenConcord: () => void;
  /** Keyboard escape hatch — returns focus to the board without opening it. */
  onDismiss: () => void;
  imageSrc?: string;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function IslandTechCompletionCelebration(props: IslandTechCompletionCelebrationProps) {
  const { result, onOpenConcord, onDismiss, imageSrc } = props;
  const titleId = useId();
  const descId = useId();
  const reduced = prefersReducedMotion();
  const continueRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // Move focus to the activation button so it is keyboard-reachable immediately,
  // and restore focus to the board element on close.
  useEffect(() => {
    lastFocusedRef.current = (typeof document !== 'undefined'
      ? (document.activeElement as HTMLElement | null)
      : null);
    continueRef.current?.focus();
    return () => {
      lastFocusedRef.current?.focus?.();
    };
  }, []);

  useEffect(() => lockPageScroll(), []);

  // Enter activates the new capability; Escape remains a conventional dismiss.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  if (typeof document === 'undefined') return null;

  const completionRewardLabel = result.finalLineRewardDice > 0
    ? `+${result.totalRewardDice} dice · final line + full grid`
    : `+${result.totalRewardDice} dice · full grid reward`;

  const body = (
    <div
      className="island-run-overlay-root island-tech-celebration-backdrop"
      data-reduced-motion={reduced ? 'true' : 'false'}
      role="presentation"
    >
      <ConfettiBurst active={!reduced} variant="capstone" />
      <section
        className="island-tech-celebration"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="island-tech-celebration__rays" aria-hidden="true" />
        <p className="island-tech-celebration__eyebrow">Ninth signal recovered</p>
        <h2 id={titleId} className="island-tech-celebration__title">
          THE CONCORD AWAKENS
        </h2>
        <p id={descId} className="island-tech-celebration__subtitle">
          Nine fragments. One voice.
        </p>

        <div className="island-tech-celebration__assembly" aria-label="The nine fragments assemble into the active Concord">
          <div className="island-tech-celebration__energy-ring island-tech-celebration__energy-ring--outer" aria-hidden="true" />
          <div className="island-tech-celebration__energy-ring island-tech-celebration__energy-ring--inner" aria-hidden="true" />
          <div className="island-tech-celebration__grid-stage" aria-hidden="true">
            <IslandTechGrid
              collectedSlots={result.collectedSlots}
              fullyRestored
              reducedMotion={reduced}
              imageSrc={imageSrc}
            />
          </div>
          <img
            className="island-tech-celebration__device"
            src="/tech/Concord_on.webp"
            alt="The restored Concord communication console glowing with power"
          />
          <div className="island-tech-celebration__signal-core" aria-hidden="true">
            <span className="island-tech-celebration__signal-orbit island-tech-celebration__signal-orbit--outer" />
            <span className="island-tech-celebration__signal-orbit island-tech-celebration__signal-orbit--inner" />
            <span className="island-tech-celebration__signal-mark">✦</span>
            <span className="island-tech-celebration__signal-label">ONLINE</span>
          </div>
          <div className="island-tech-celebration__activation-flash" aria-hidden="true" />
        </div>

        <div className="island-tech-celebration__ability" aria-label="Universal communication unlocked">
          <strong>THREE CHANNELS ONLINE</strong>
          <div className="island-tech-celebration__channels" aria-label="Unlocked Concord channels">
            <span><b aria-hidden="true">🐾</b> Creatures</span>
            <span><b aria-hidden="true">✦</b> Caretakers</span>
            <span><b aria-hidden="true">📖</b> Story</span>
          </div>
        </div>

        <p className="island-tech-celebration__reward" aria-label={`Concord completion reward: ${completionRewardLabel}`}>
          <span aria-hidden="true">🎲</span> {completionRewardLabel}
        </p>

        <div className="island-tech-celebration__actions">
          <button
            ref={continueRef}
            type="button"
            className="island-tech-celebration__continue"
            onClick={() => onOpenConcord()}
          >
            <span>Open The Concord</span>
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </section>
    </div>
  );

  return createPortal(body, document.body);
}
