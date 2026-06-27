import { useEffect, useId, useRef } from 'react';

import { createPortal } from 'react-dom';
import {
  TECH_COLLECTION_CELL_COUNT,
  TECH_COLLECTION_LINE_REWARD_DICE,
  type TechCollectionTileType,
} from '../services/islandRunTechCollection';
import { IslandTechGrid } from './IslandTechGrid';
import './IslandTechCollectionModal.css';

/**
 * IslandTechCollectionModal — the fast 3×3 technology pickup modal.
 *
 * Shown when a new (non-duplicate, non-full-grid) component is collected. The
 * freshly collected cell brightens from dark → restored and gets a COLLECTED!
 * stamp; the modal auto-dismisses after a short dwell. Completing a line is
 * surfaced inline (ROW/COLUMN/LINE COMPLETE +N DICE) but still auto-dismisses.
 *
 * Presentation only: it receives a fully resolved result model and the dice were
 * already granted by the canonical action upstream. It performs no gameplay
 * writes. The full-grid (ninth piece) case is handled by
 * `IslandTechCompletionCelebration`, not this modal.
 */

export interface TechCollectionModalResult {
  /** Slot collected on this pickup (0–8). */
  slotIndex: number;
  tileType: TechCollectionTileType;
  /** Slots collected after this pickup. */
  collectedSlots: number[];
  collectedCount: number;
  /** Line indices (0–7) newly completed by this pickup. */
  newlyCompletedLines: number[];
  lineRewardDice: number;
}

export interface IslandTechCollectionModalProps {
  result: TechCollectionModalResult;
  /** Called on auto-dismiss timeout or tap-to-dismiss. */
  onDismiss: () => void;
  /** Auto-dismiss dwell (ms). A line completion lingers longer than a plain pickup. */
  autoDismissMs?: number;
  imageSrc?: string;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function lineRewardLabel(lineCount: number, dice: number): { headline: string; reward: string } {
  if (lineCount >= 2) {
    return { headline: `${lineCount} LINES COMPLETE`, reward: `+${dice} DICE` };
  }
  return { headline: 'LINE COMPLETE', reward: `+${dice} DICE` };
}

export function IslandTechCollectionModal(props: IslandTechCollectionModalProps) {
  const { result, onDismiss, autoDismissMs, imageSrc } = props;
  const titleId = useId();
  const reduced = prefersReducedMotion();
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  const isLineEvent = result.newlyCompletedLines.length > 0;
  const dwellMs = autoDismissMs ?? (reduced ? 700 : isLineEvent ? 2400 : 1800);

  // Parent owns gameplay; the modal owns its own transient auto-dismiss timer.
  // This transient reveal intentionally does NOT trap or grab focus: it can fire
  // repeatedly during rapid rolling, so stealing focus would be disruptive. The
  // grid + status copy are announced via aria-live instead. Focus stays on the
  // board; the deliberate full-grid celebration handles focus management itself.
  useEffect(() => {
    const handle = window.setTimeout(() => dismissRef.current(), dwellMs);
    return () => window.clearTimeout(handle);
  }, [dwellMs]);

  if (typeof document === 'undefined') return null;

  const lineReward = isLineEvent
    ? lineRewardLabel(
        result.newlyCompletedLines.length,
        result.lineRewardDice || result.newlyCompletedLines.length * TECH_COLLECTION_LINE_REWARD_DICE,
      )
    : null;

  const body = (
    <div
      className={`island-run-overlay-root island-tech-modal-backdrop${
        isLineEvent ? ' island-tech-modal-backdrop--line' : ''
      }`}
      data-reduced-motion={reduced ? 'true' : 'false'}
      role="presentation"
      onClick={() => onDismiss()}
    >
      <section
        className="island-tech-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="island-tech-modal__eyebrow">Ancient component found</p>
        <h2 id={titleId} className="island-tech-modal__title">
          TECH DISCOVERED
        </h2>

        <IslandTechGrid
          collectedSlots={result.collectedSlots}
          newSlotIndex={result.slotIndex}
          completedLines={result.newlyCompletedLines}
          reducedMotion={reduced}
          imageSrc={imageSrc}
        />

        <p className="island-tech-modal__progress" role="status">
          {result.collectedCount} / {TECH_COLLECTION_CELL_COUNT} components recovered
        </p>

        {lineReward ? (
          <p className="island-tech-modal__line-reward">
            <span className="island-tech-modal__line-headline">{lineReward.headline}</span>
            <span className="island-tech-modal__line-dice">{lineReward.reward}</span>
          </p>
        ) : null}

        <p className="island-tech-modal__hint" aria-hidden="true">
          Tap to dismiss
        </p>
      </section>
    </div>
  );

  return createPortal(body, document.body);
}
