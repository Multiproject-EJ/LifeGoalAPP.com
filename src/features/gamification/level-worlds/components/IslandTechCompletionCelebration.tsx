import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TECH_COLLECTION_CELL_COUNT } from '../services/islandRunTechCollection';
import { IslandTechGrid } from './IslandTechGrid';
import { ConfettiBurst } from './ConfettiBurst';
import './IslandTechCollectionModal.css';

/**
 * IslandTechCompletionCelebration — the full-grid (ninth piece) celebration.
 *
 * Unlike the fast pickup modal, this surface does NOT auto-dismiss: the player
 * must press CLAIM & CONTINUE. It reveals the entire technology image fully
 * restored and glowing, confirms all nine components were found, and shows the
 * reward breakdown (any final line reward + the +100 full-collection bonus).
 *
 * Presentation only — the dice were already granted by the canonical action
 * upstream; this component just animates the result and reports the deliberate
 * continue. A generic "TECHNOLOGY RESTORED!" title is used intentionally so this
 * PR does not prematurely introduce named/story technology state.
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
  /** Deliberate dismissal — returns focus to the board. */
  onContinue: () => void;
  imageSrc?: string;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function IslandTechCompletionCelebration(props: IslandTechCompletionCelebrationProps) {
  const { result, onContinue, imageSrc } = props;
  const titleId = useId();
  const descId = useId();
  const reduced = prefersReducedMotion();
  const continueRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // Move focus to the Continue button so it is keyboard-reachable immediately,
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

  // Escape and Enter both fire the deliberate continue.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault();
        onContinue();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onContinue]);

  if (typeof document === 'undefined') return null;

  const hasLineReward = result.finalLineRewardDice > 0;

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
        <p className="island-tech-celebration__eyebrow">Full collection complete</p>
        <h2 id={titleId} className="island-tech-celebration__title">
          TECHNOLOGY RESTORED!
        </h2>
        <p id={descId} className="island-tech-celebration__subtitle">
          All {TECH_COLLECTION_CELL_COUNT} components recovered.
        </p>

        <div className="island-tech-celebration__device">
          <IslandTechGrid
            collectedSlots={result.collectedSlots}
            fullyRestored
            reducedMotion={reduced}
            imageSrc={imageSrc}
          />
        </div>

        <dl className="island-tech-celebration__rewards">
          {hasLineReward ? (
            <div className="island-tech-celebration__reward-row">
              <dt>Final line reward</dt>
              <dd>+{result.finalLineRewardDice} dice</dd>
            </div>
          ) : null}
          <div className="island-tech-celebration__reward-row">
            <dt>Full collection</dt>
            <dd>+{result.fullBoardRewardDice} dice</dd>
          </div>
          <div className="island-tech-celebration__reward-row island-tech-celebration__reward-row--total">
            <dt>Total</dt>
            <dd>+{result.totalRewardDice} dice</dd>
          </div>
        </dl>

        <div className="island-tech-celebration__actions">
          <button
            ref={continueRef}
            type="button"
            className="island-tech-celebration__continue"
            onClick={() => onContinue()}
          >
            Claim &amp; Continue
          </button>
        </div>
      </section>
    </div>
  );

  return createPortal(body, document.body);
}
