import { useEffect, useId, useRef, useState } from 'react';

import { createPortal } from 'react-dom';
import {
  TECH_COLLECTION_CELL_COUNT,
  TECH_COLLECTION_IMAGE_SRC,
  TECH_COLLECTION_LINE_REWARD_DICE,
  techCollectionCellBackgroundPosition,
  type TechCollectionTileType,
} from '../services/islandRunTechCollection';
import { getTechnologyFragmentVisual } from '../services/islandTechnologyFragmentVisuals';
import { IslandTechGrid } from './IslandTechGrid';
import './IslandTechCollectionModal.css';

/**
 * IslandTechCollectionModal — the two-phase 3×3 technology pickup celebration.
 *
 * Shown when a new (non-duplicate, non-full-grid) component is collected. The
 * reveal runs in two phases:
 *   1. Fragment — a large, glowing centre image of the fragment just recovered
 *      floats over a tinted board. Tapping it advances to the grid.
 *   2. Grid — the fragment settles into its neon 3×3 slot; the freshly collected
 *      cell brightens dark → restored and gets a COLLECTED! stamp. Completing a
 *      line is surfaced inline (ROW/COLUMN/LINE COMPLETE +N DICE). Tapping again
 *      dismisses.
 *
 * When auto-roll is engaged the player is hands-off, so the celebration drives
 * itself: it advances fragment → grid on a timer and auto-closes after 4s so the
 * loop can resume. When the player is rolling manually it waits for taps.
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
  /** Island the fragment belongs to — drives the fragment artwork/label. */
  islandNumber: number;
  /** Called on auto-close timeout or tap-to-dismiss. */
  onDismiss: () => void;
  /**
   * When true the player is hands-off (auto-roll engaged): the celebration
   * advances fragment → grid and auto-closes after `autoCloseMs` without a tap.
   */
  isAutoRolling?: boolean;
  /** Total dwell (ms) before auto-close while auto-rolling. */
  autoCloseMs?: number;
  imageSrc?: string;
}

/** Total time the whole celebration stays up while auto-rolling. */
const AUTO_ROLL_CLOSE_MS = 4000;
/** How long the fragment lingers before settling into the grid while auto-rolling. */
const AUTO_ROLL_FRAGMENT_MS = 1700;

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
  const { result, islandNumber, onDismiss, isAutoRolling = false, autoCloseMs, imageSrc } = props;
  const titleId = useId();
  const reduced = prefersReducedMotion();
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  // Phase 1 shows the recovered fragment large and glowing; phase 2 settles it
  // into the 3×3 grid. Manual rollers tap through; auto-roll advances on a timer.
  const [phase, setPhase] = useState<'fragment' | 'grid'>('fragment');

  const isLineEvent = result.newlyCompletedLines.length > 0;
  const fragmentImageSrc = imageSrc ?? TECH_COLLECTION_IMAGE_SRC;
  const fragmentPosition = techCollectionCellBackgroundPosition(result.slotIndex);
  const fragmentVisual = getTechnologyFragmentVisual(islandNumber, result.slotIndex);
  const fragmentLabel = fragmentVisual?.alt ?? `Fragment ${result.slotIndex + 1}`;
  const fragmentEmoji = fragmentVisual?.fallbackEmoji ?? '💠';

  const [fragmentAssetFailed, setFragmentAssetFailed] = useState(false);

  // Auto-roll: the player isn't tapping, so the celebration walks itself through
  // both phases and closes after a fixed dwell. Manual rollers own the pacing and
  // no timer runs — they tap the fragment to reveal the grid, then tap to close.
  useEffect(() => {
    if (!isAutoRolling) return;
    const closeMs = autoCloseMs ?? AUTO_ROLL_CLOSE_MS;
    const advanceMs = reduced ? 600 : Math.min(AUTO_ROLL_FRAGMENT_MS, Math.max(0, closeMs - 400));
    const advanceHandle = window.setTimeout(() => setPhase('grid'), advanceMs);
    const closeHandle = window.setTimeout(() => dismissRef.current(), closeMs);
    return () => {
      window.clearTimeout(advanceHandle);
      window.clearTimeout(closeHandle);
    };
  }, [isAutoRolling, autoCloseMs, reduced]);

  if (typeof document === 'undefined') return null;

  const lineReward = isLineEvent
    ? lineRewardLabel(
        result.newlyCompletedLines.length,
        result.lineRewardDice || result.newlyCompletedLines.length * TECH_COLLECTION_LINE_REWARD_DICE,
      )
    : null;

  // A tap advances the reveal: fragment → grid, then grid → dismiss. Auto-roll
  // still lets the player tap through faster than its own timers.
  const advance = () => {
    if (phase === 'fragment') {
      setPhase('grid');
    } else {
      onDismiss();
    }
  };

  const fragmentReveal = (
    <section
      className="island-tech-fragment"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(event) => event.stopPropagation()}
    >
      <p className="island-tech-fragment__eyebrow">Ancient component found</p>
      <h2 id={titleId} className="island-tech-fragment__title">
        TECH FRAGMENT RECOVERED
      </h2>

      <button
        type="button"
        className="island-tech-fragment__stage"
        onClick={advance}
        aria-label={`${fragmentLabel} recovered. Tap to place it in the grid.`}
      >
        <span className="island-tech-fragment__halo" aria-hidden="true" />
        <span
          className={`island-tech-fragment__art${
            fragmentAssetFailed ? ' island-tech-fragment__art--fallback' : ''
          }`}
          style={
            fragmentAssetFailed
              ? undefined
              : {
                  backgroundImage: `url("${fragmentImageSrc}")`,
                  backgroundSize: '300% 300%',
                  backgroundPosition: `${fragmentPosition.x}% ${fragmentPosition.y}%`,
                }
          }
        >
          {fragmentAssetFailed ? (
            <span className="island-tech-fragment__emoji" aria-hidden="true">
              {fragmentEmoji}
            </span>
          ) : null}
        </span>
        <span className="island-tech-fragment__badge" aria-hidden="true">
          {fragmentEmoji}
        </span>
        {/* Hidden probe: fall back to the emoji if the artwork 404s. */}
        <img
          src={fragmentImageSrc}
          alt=""
          aria-hidden="true"
          className="island-tech-fragment__probe"
          onError={() => setFragmentAssetFailed(true)}
        />
      </button>

      <p className="island-tech-fragment__name">{fragmentLabel}</p>
      <p className="island-tech-fragment__hint" aria-hidden="true">
        Tap to add it to the grid
      </p>
    </section>
  );

  const gridReveal = (
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
  );

  const body = (
    <div
      className={`island-run-overlay-root island-tech-modal-backdrop${
        isLineEvent ? ' island-tech-modal-backdrop--line' : ''
      }${phase === 'fragment' ? ' island-tech-modal-backdrop--fragment' : ''}`}
      data-reduced-motion={reduced ? 'true' : 'false'}
      data-phase={phase}
      role="presentation"
      onClick={() => advance()}
    >
      {phase === 'fragment' ? fragmentReveal : gridReveal}
    </div>
  );

  return createPortal(body, document.body);
}
