import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

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
 * reveal runs in three phases:
 *   1. Fragment — a large, glowing centre image of the fragment just recovered
 *      floats over a tinted board. Tapping it launches the fragment into the grid.
 *   2. Flying — a fixed-position clone of the fragment flies from centre stage
 *      into its own (still-empty) 3×3 slot (a FLIP-style transform tween).
 *   3. Grid — the fragment lands: the freshly collected cell brightens dark →
 *      restored and gets a COLLECTED! stamp. Completing a line is surfaced inline
 *      (ROW/COLUMN/LINE COMPLETE +N DICE). Tapping again dismisses.
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
/** Safety cap: force the grid to land even if `transitionend` never fires. */
const FLIGHT_FALLBACK_MS = 700;

type Phase = 'fragment' | 'flying' | 'grid';

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

  // Phase 1 shows the recovered fragment large and glowing; phase 2 flies it into
  // its slot; phase 3 lands it in the 3×3 grid. Manual rollers tap through;
  // auto-roll advances on a timer. `phaseRef` lets the timers read live phase.
  const [phase, setPhase] = useState<Phase>('fragment');
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;

  const isLineEvent = result.newlyCompletedLines.length > 0;
  const fragmentVisual = getTechnologyFragmentVisual(islandNumber, result.slotIndex);
  const fragmentImageSrc = fragmentVisual?.imageSrc ?? imageSrc ?? TECH_COLLECTION_IMAGE_SRC;
  const fragmentPosition = techCollectionCellBackgroundPosition(result.slotIndex);
  const usesWholeGridSprite = !fragmentVisual?.imageSrc;
  const fragmentLabel = fragmentVisual?.alt ?? `Fragment ${result.slotIndex + 1}`;
  const fragmentEmoji = fragmentVisual?.fallbackEmoji ?? '💠';

  const [fragmentAssetFailed, setFragmentAssetFailed] = useState(false);

  // The big fragment art (measured for the flight start), the grid section (to
  // find the destination cell), the flying clone, and the captured start rect.
  const stageArtRef = useRef<HTMLSpanElement>(null);
  const gridSectionRef = useRef<HTMLElement>(null);
  const flyerRef = useRef<HTMLSpanElement>(null);
  const startRectRef = useRef<DOMRect | null>(null);

  // Launch the fragment toward its slot. Under reduced motion (or if the stage
  // couldn't be measured) we skip the flight and land in the grid immediately.
  const beginFlightOrGrid = useCallback(() => {
    if (phaseRef.current !== 'fragment') return;
    const rect = stageArtRef.current?.getBoundingClientRect() ?? null;
    if (reduced || !rect || rect.width === 0) {
      startRectRef.current = null;
      setPhase('grid');
      return;
    }
    startRectRef.current = rect;
    setPhase('flying');
  }, [reduced]);

  // Drive the FLIP tween: pin the clone over the (empty) destination cell and
  // transform it from centre stage into that cell, then land in the grid. Runs
  // in a layout effect so the clone paints at its start rect before it moves.
  useLayoutEffect(() => {
    if (phase !== 'flying') return;
    const start = startRectRef.current;
    const flyer = flyerRef.current;
    const target = gridSectionRef.current?.querySelector<HTMLElement>(
      `[data-tech-slot="${result.slotIndex}"]`,
    );
    if (!start || !flyer || !target) {
      setPhase('grid');
      return;
    }

    const targetRect = target.getBoundingClientRect();
    const startCenterX = start.left + start.width / 2;
    const startCenterY = start.top + start.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const scale = start.width > 0 ? targetRect.width / start.width : 1;
    const dx = targetCenterX - startCenterX;
    const dy = targetCenterY - startCenterY;

    let settled = false;
    const land = () => {
      if (settled) return;
      settled = true;
      setPhase('grid');
    };

    // Force the browser to paint the identity transform before we move, so the
    // CSS transition actually animates from centre stage to the cell.
    void flyer.getBoundingClientRect();
    flyer.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    flyer.style.opacity = '0.85';

    const onEnd = (event: TransitionEvent) => {
      if (event.propertyName === 'transform') land();
    };
    flyer.addEventListener('transitionend', onEnd);
    const fallback = window.setTimeout(land, FLIGHT_FALLBACK_MS);
    return () => {
      flyer.removeEventListener('transitionend', onEnd);
      window.clearTimeout(fallback);
    };
  }, [phase, result.slotIndex]);

  // Auto-roll: the player isn't tapping, so the celebration walks itself through
  // every phase and closes after a fixed dwell. Manual rollers own the pacing and
  // no timer runs — they tap the fragment to fly it in, then tap to close.
  useEffect(() => {
    if (!isAutoRolling) return;
    const closeMs = autoCloseMs ?? AUTO_ROLL_CLOSE_MS;
    const advanceMs = reduced ? 600 : Math.min(AUTO_ROLL_FRAGMENT_MS, Math.max(0, closeMs - 400));
    const advanceHandle = window.setTimeout(() => beginFlightOrGrid(), advanceMs);
    const closeHandle = window.setTimeout(() => dismissRef.current(), closeMs);
    return () => {
      window.clearTimeout(advanceHandle);
      window.clearTimeout(closeHandle);
    };
  }, [isAutoRolling, autoCloseMs, reduced, beginFlightOrGrid]);

  if (typeof document === 'undefined') return null;

  const lineReward = isLineEvent
    ? lineRewardLabel(
        result.newlyCompletedLines.length,
        result.lineRewardDice || result.newlyCompletedLines.length * TECH_COLLECTION_LINE_REWARD_DICE,
      )
    : null;

  // A tap advances the reveal: fragment → (flight) → grid, then grid → dismiss.
  // Tapping mid-flight lands immediately. Auto-roll still lets the player tap
  // through faster than its own timers.
  const advance = () => {
    if (phase === 'fragment') {
      beginFlightOrGrid();
    } else if (phase === 'flying') {
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
          ref={stageArtRef}
          className={`island-tech-fragment__art${
            fragmentAssetFailed ? ' island-tech-fragment__art--fallback' : ''
          }`}
          style={
            fragmentAssetFailed
              ? undefined
              : {
                  backgroundImage: `url("${fragmentImageSrc}")`,
                  backgroundSize: usesWholeGridSprite ? '300% 300%' : 'cover',
                  backgroundPosition: usesWholeGridSprite ? `${fragmentPosition.x}% ${fragmentPosition.y}%` : 'center',
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

  // While the clone is in flight the destination cell stays empty so the fragment
  // visibly *arrives*; the count and line reward hold back until it lands.
  const inFlight = phase === 'flying';
  const gridCollectedSlots = inFlight
    ? result.collectedSlots.filter((slot) => slot !== result.slotIndex)
    : result.collectedSlots;
  const gridNewSlotIndex = inFlight ? null : result.slotIndex;
  const gridCompletedLines = inFlight ? [] : result.newlyCompletedLines;
  const gridCollectedCount = inFlight ? Math.max(0, result.collectedCount - 1) : result.collectedCount;

  const gridReveal = (
    <section
      ref={gridSectionRef}
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
        collectedSlots={gridCollectedSlots}
        newSlotIndex={gridNewSlotIndex}
        completedLines={gridCompletedLines}
        reducedMotion={reduced}
        imageSrc={imageSrc}
        islandNumber={islandNumber}
      />

      <p className="island-tech-modal__progress" role="status">
        {gridCollectedCount} / {TECH_COLLECTION_CELL_COUNT} components recovered
      </p>

      {lineReward && !inFlight ? (
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

  // The flying clone is pinned (fixed) over the viewport at the fragment's last
  // rect, then transformed into its cell. Rendered only during the flight phase.
  const startRect = startRectRef.current;
  const flyer =
    inFlight && startRect ? (
      <span
        ref={flyerRef}
        className={`island-tech-fragment__flyer${
          fragmentAssetFailed ? ' island-tech-fragment__flyer--fallback' : ''
        }`}
        aria-hidden="true"
        style={{
          left: `${startRect.left}px`,
          top: `${startRect.top}px`,
          width: `${startRect.width}px`,
          height: `${startRect.height}px`,
          ...(fragmentAssetFailed
            ? {}
            : {
                backgroundImage: `url("${fragmentImageSrc}")`,
                backgroundSize: usesWholeGridSprite ? '300% 300%' : 'cover',
                backgroundPosition: usesWholeGridSprite ? `${fragmentPosition.x}% ${fragmentPosition.y}%` : 'center',
              }),
        }}
      >
        {fragmentAssetFailed ? (
          <span className="island-tech-fragment__emoji" aria-hidden="true">
            {fragmentEmoji}
          </span>
        ) : null}
      </span>
    ) : null;

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
      {phase === 'fragment' ? (
        fragmentReveal
      ) : (
        <>
          {gridReveal}
          {flyer}
        </>
      )}
    </div>
  );

  return createPortal(body, document.body);
}
