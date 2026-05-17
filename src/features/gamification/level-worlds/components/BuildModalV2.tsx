import { useState } from 'react';
import { ShopItemCostLine } from './ShopItemCostLine';

/**
 * BuildModalV2CardData — view-model data for a single landmark card in the
 * horizontal tray.  Derived entirely in IslandRunBoardPrototype; no gameplay
 * logic lives here.
 */
export interface BuildModalV2CardData {
  stopIndex: number;
  stopId: string;
  title: string;
  levelIcon: string;
  buildLevel: number;
  spentEssence: number;
  requiredEssence: number;
  remainingToFull: number;
  isFullyBuilt: boolean;
  /** True when the player has enough essence for at least one step. */
  canAfford: boolean;
  /** isFullyBuilt || !canAfford || isBuildSpendInFlight */
  isBuildDisabled: boolean;
  /** tutorialRowState.isUnavailable || isBuildDisabled */
  isBuildInteractionDisabled: boolean;
  objectiveComplete: boolean;
  isNextCheapest: boolean;
  isTutorialTarget: boolean;
  isTutorialMuted: boolean;
  /** Player essence balance — forwarded to ShopItemCostLine. */
  essenceBalance: number;
  maxBuildLevel: number;
}

export interface BuildModalV2Milestone {
  label: string;
  reached: boolean;
}

export interface BuildModalV2Props {
  isOpen: boolean;
  islandNumber: number;
  essenceAvailable: number;
  onClose: () => void;
  /** 1 = early, 2 = mid, 3 = late stage artwork */
  artworkStage: 1 | 2 | 3;
  milestones: [BuildModalV2Milestone, BuildModalV2Milestone, BuildModalV2Milestone];
  isBuildHoldActive: boolean;
  buildHoldFeedbackLabel: string;
  isBuildModalHatcheryGuidanceActive: boolean;
  cards: BuildModalV2CardData[];
  /** Called on tap/click for a card (by stopIndex). */
  onBuildTap: (stopIndex: number) => void;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface ArtworkImageProps {
  src: string;
  stage: 1 | 2 | 3;
}

function BuildModalV2ArtworkImage({ src, stage }: ArtworkImageProps) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="bm2-artwork__placeholder" aria-label={`Island stage ${stage} artwork unavailable`}>
        <span className="bm2-artwork__placeholder-icon">🏝️</span>
        <span className="bm2-artwork__placeholder-label">Construction in progress</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Island build progress — stage ${stage}`}
      className="bm2-artwork__img"
      onError={() => setErrored(true)}
      aria-hidden="true"
    />
  );
}

interface ProgressMeterProps {
  milestones: [BuildModalV2Milestone, BuildModalV2Milestone, BuildModalV2Milestone];
}

function BuildModalV2ProgressMeter({ milestones }: ProgressMeterProps) {
  // Rendered bottom-to-top in DOM via flex-column-reverse so milestone 1
  // appears at the bottom and milestone 3 at the top.
  const ordered = [...milestones].reverse() as typeof milestones;
  return (
    <div className="bm2-progress-meter" aria-label="Build progress milestones">
      {ordered.map((m, i) => (
        <div
          key={m.label}
          className={`bm2-progress-meter__step${m.reached ? ' bm2-progress-meter__step--reached' : ''}`}
        >
          <span className="bm2-progress-meter__dot" aria-hidden="true" />
          {i < ordered.length - 1 && (
            <span className="bm2-progress-meter__track" aria-hidden="true" />
          )}
          <span className="bm2-progress-meter__label">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

interface CardProps {
  card: BuildModalV2CardData;
  onBuildTap: (stopIndex: number) => void;
}

function BuildModalV2Card({ card, onBuildTap }: CardProps) {
  const {
    stopIndex,
    stopId,
    title,
    levelIcon,
    buildLevel,
    spentEssence,
    requiredEssence,
    remainingToFull,
    isFullyBuilt,
    isBuildDisabled,
    isBuildInteractionDisabled,
    objectiveComplete,
    isNextCheapest,
    isTutorialTarget,
    isTutorialMuted,
    essenceBalance,
    maxBuildLevel,
  } = card;

  const classNames = [
    'bm2-card',
    `bm2-card--level-${buildLevel}`,
    isFullyBuilt ? 'bm2-card--complete' : '',
    isNextCheapest ? 'bm2-card--next-cheapest' : '',
    isTutorialTarget ? 'bm2-card--tutorial-target' : '',
    isTutorialMuted ? 'bm2-card--tutorial-muted' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      key={stopId}
      className={classNames}
      role="button"
      tabIndex={isBuildInteractionDisabled ? -1 : 0}
      aria-disabled={isBuildInteractionDisabled}
      aria-label={`${title} — Level ${buildLevel} of ${maxBuildLevel}${isTutorialTarget ? ' — tutorial target' : ''}${isTutorialMuted ? ' — unavailable during tutorial' : ''}`}
      onClick={!isBuildInteractionDisabled ? () => onBuildTap(stopIndex) : undefined}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isBuildInteractionDisabled) {
          e.preventDefault();
          onBuildTap(stopIndex);
        }
      }}
    >
      <div className={`bm2-card__icon bm2-card__icon--level-${buildLevel}`}>{levelIcon}</div>
      <span className="bm2-card__name">{title}</span>
      <span className="bm2-card__status">
        {isFullyBuilt
          ? `L${maxBuildLevel} ✅`
          : `L${buildLevel + 1}: ${spentEssence}/${requiredEssence} 🟣`}
      </span>
      {!isFullyBuilt && (
        <span className="bm2-card__full-cost">
          <ShopItemCostLine
            cost={remainingToFull}
            balance={essenceBalance}
            currencyIcon="🟣"
            currencyName="essence"
          />
        </span>
      )}
      <div className="bm2-card__level-bar" aria-hidden="true">
        {Array.from({ length: maxBuildLevel }, (_, li) => (
          <div
            key={li}
            className={`bm2-card__level-pip${li < buildLevel ? ' bm2-card__level-pip--done' : li === buildLevel && !isFullyBuilt ? ' bm2-card__level-pip--active' : ''}`}
          />
        ))}
      </div>
      {!isFullyBuilt && (
        <span className="bm2-card__objective">
          Obj: {objectiveComplete ? '✅' : '⏳'}
        </span>
      )}
      {!isFullyBuilt && isBuildDisabled && (
        <span className="bm2-card__disabled-hint">
          {isFullyBuilt ? null : '🔒'}
        </span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * BuildModalV2 — presentational-only replacement for the vertical Island
 * Buildings modal.
 *
 * Layout:
 *   1. Compact header (title + essence + close)
 *   2. Central artwork area (Island 1 stage images or neutral placeholder)
 *   3. Side vertical progress meter (3 milestones)
 *   4. Bottom horizontal build tray (5 landmark cards, tap-to-build)
 *
 * All state and action callbacks are owned by IslandRunBoardPrototype.
 * Hold-to-build is intentionally omitted in v2 to avoid conflicts with
 * horizontal tray scroll gesture handling.
 */
export function BuildModalV2({
  isOpen,
  islandNumber,
  essenceAvailable,
  onClose,
  artworkStage,
  milestones,
  isBuildHoldActive,
  buildHoldFeedbackLabel,
  isBuildModalHatcheryGuidanceActive,
  cards,
  onBuildTap,
}: BuildModalV2Props) {
  if (!isOpen) return null;

  // Artwork is deterministically path-based for Island 1 only.
  const artworkSrc =
    islandNumber === 1
      ? `/assets/islands/island-001/build-modal/stage-${artworkStage}.webp`
      : null;

  return (
    <div className="island-stop-modal-backdrop bm2-backdrop" role="presentation">
      <section
        className="bm2-shell"
        role="dialog"
        aria-modal="true"
        aria-label="Build Island"
      >
        {/* ── Header ── */}
        <header className="bm2-header">
          <span className="bm2-header__title">🔨 Island {islandNumber} Buildings</span>
          <span className="bm2-header__essence">🟣 {essenceAvailable}</span>
          <button
            type="button"
            className="bm2-header__close"
            onClick={onClose}
            aria-label="Close build panel"
          >
            ✕
          </button>
        </header>

        {/* ── Tutorial guidance ── */}
        {isBuildModalHatcheryGuidanceActive && (
          <p className="bm2-tutorial-guidance">
            Build Hatchery to Level 1 with your tutorial Essence. Other buildings unlock after this step.
          </p>
        )}

        {/* ── Hold feedback (hold-to-build not wired in v2; shown if parent triggers it) ── */}
        {isBuildHoldActive && (
          <p className="bm2-hold-feedback">{buildHoldFeedbackLabel}</p>
        )}

        {/* ── Center: artwork + progress meter ── */}
        <div className="bm2-center">
          <div className="bm2-artwork">
            {artworkSrc ? (
              <BuildModalV2ArtworkImage src={artworkSrc} stage={artworkStage} />
            ) : (
              <div className="bm2-artwork__placeholder">
                <span className="bm2-artwork__placeholder-icon">🏝️</span>
                <span className="bm2-artwork__placeholder-label">Construction in progress</span>
              </div>
            )}
          </div>
          <BuildModalV2ProgressMeter milestones={milestones} />
        </div>

        {/* ── Bottom horizontal tray ── */}
        <div className="bm2-tray" role="list" aria-label="Landmark cards">
          {cards.map((card) => (
            <BuildModalV2Card key={card.stopId} card={card} onBuildTap={onBuildTap} />
          ))}
        </div>
      </section>
    </div>
  );
}
