import { useEffect, useState } from 'react';
import { LandmarkBuildVisual, normalizeLandmarkBuildVisualStopId } from './board/LandmarkBuildVisual';
import type { BuildModalV2ViewModel, BuildModalV2PartViewModel } from '../services/islandRunBuildModalV2ViewModel';

export interface BuildModalV2Props {
  isOpen: boolean;
  islandNumber: number;
  essenceAvailable: number;
  onClose: () => void;
  viewModel: BuildModalV2ViewModel;
  isBuildHoldActive: boolean;
  buildHoldFeedbackLabel: string;
  isBuildModalHatcheryGuidanceActive: boolean;
  discountRate?: number;
  discountExpiresAtMs?: number | null;
  onBuildActivePart: (stopIndex: number) => void;
}

function BuildModalV2ArtworkImage(props: { src?: string; alt: string; isPlaceholder: boolean; stopId?: string; buildLevel?: number; title?: string }) {
  const [errored, setErrored] = useState(false);
  if (!props.src || props.isPlaceholder || errored) {
    return (
      <div className="bm2-artwork__placeholder">
        <LandmarkBuildVisual
          stopId={normalizeLandmarkBuildVisualStopId(props.stopId)}
          buildLevel={props.buildLevel ?? 0}
          title={props.title}
          className="bm2-artwork__placeholder-visual"
        />
        <span className="bm2-artwork__placeholder-label">Animated landmark preview</span>
      </div>
    );
  }
  return <img src={props.src} alt={props.alt} className="bm2-artwork__img" onError={() => setErrored(true)} />;
}

function BuildModalV2CompleteState({ viewModel }: { viewModel: BuildModalV2ViewModel }) {
  return (
    <div className="bm2-complete-state">
      <div className="bm2-complete-state__icon" aria-hidden="true">🏝️</div>
      <h3>All landmarks fully restored</h3>
      <p>15 of 15 complete</p>
      <div className="bm2-level-rail" aria-label="All landmark levels completed">
        {viewModel.levelRail.map((item) => (
          <span key={item.level} className="bm2-level-rail__item bm2-level-rail__item--complete" aria-label={`Level ${item.level} completed`}>L{item.level}</span>
        ))}
      </div>
    </div>
  );
}

function BuildModalV2LevelRail({ viewModel }: { viewModel: BuildModalV2ViewModel }) {
  return (
    <div className="bm2-level-rail" aria-label="Active landmark level progress">
      {viewModel.levelRail.map((item) => (
        <span key={item.level} className={`bm2-level-rail__item bm2-level-rail__item--${item.status}`} aria-label={item.ariaLabel}>
          L{item.level}
        </span>
      ))}
    </div>
  );
}

function BuildModalV2PartButton({
  part,
  activeTitle,
  targetLevel,
  activeStopIndex,
  disabledByWalletOrTutorial,
  nextTapCost,
  onBuildActivePart,
}: {
  part: BuildModalV2PartViewModel;
  activeTitle: string;
  targetLevel: number;
  activeStopIndex: number;
  disabledByWalletOrTutorial: boolean;
  nextTapCost: number;
  onBuildActivePart: (stopIndex: number) => void;
}) {
  const isActive = part.status === 'active';
  const isDisabled = !isActive || disabledByWalletOrTutorial;
  const label = part.status === 'complete'
    ? 'Done'
    : part.status === 'locked'
      ? 'Locked'
      : `${part.remainingEssence} left`;
  const ariaLabel = part.status === 'complete'
    ? `${activeTitle} Level ${targetLevel}, Part ${part.partNumber} complete`
    : part.status === 'locked'
      ? `${activeTitle} Level ${targetLevel}, Part ${part.partNumber} locked`
      : `Build ${activeTitle} Level ${targetLevel}, Part ${part.partNumber}. ${part.remainingEssence} Money left in this part. Next tap spends ${nextTapCost} Money.`;

  return (
    <button
      type="button"
      className={`bm2-part bm2-part--${part.status}`}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-label={ariaLabel}
      onClick={isActive && !isDisabled ? () => onBuildActivePart(activeStopIndex) : undefined}
    >
      <span className="bm2-part__icon" aria-hidden="true">{part.status === 'complete' ? '✓' : part.status === 'locked' ? '🔒' : '🔨'}</span>
      <span className="bm2-part__title">Part {part.partNumber}</span>
      <span className="bm2-part__meta">{label}</span>
    </button>
  );
}

export function BuildModalV2({
  isOpen,
  islandNumber,
  essenceAvailable,
  onClose,
  viewModel,
  isBuildHoldActive,
  buildHoldFeedbackLabel,
  isBuildModalHatcheryGuidanceActive,
  discountRate = 0,
  discountExpiresAtMs = null,
  onBuildActivePart,
}: BuildModalV2Props) {
  const active = viewModel.activeLandmark;
  const isComplete = viewModel.sequentialBuildView.isFullyBuilt || !active;
  const activePart = active?.activePart ?? 1;
  const canBuildActive = Boolean(active?.canAffordNextTap);
  const discountPercent = Math.round(Math.max(0, discountRate) * 100);
  const discountMinutesLeft = discountExpiresAtMs && discountRate > 0 ? Math.max(1, Math.ceil((discountExpiresAtMs - Date.now()) / 60000)) : 0;
  const hasActiveDiscount = discountPercent > 0 && discountMinutesLeft > 0;
  const [isDiscountIntroVisible, setIsDiscountIntroVisible] = useState(false);

  useEffect(() => {
    if (!isOpen || !hasActiveDiscount) {
      setIsDiscountIntroVisible(false);
      return undefined;
    }
    setIsDiscountIntroVisible(true);
    const introTimer = window.setTimeout(() => {
      setIsDiscountIntroVisible(false);
    }, 1000);
    return () => window.clearTimeout(introTimer);
  }, [hasActiveDiscount, isOpen, discountExpiresAtMs]);

  if (!isOpen) return null;

  const statusLine = active
    ? `Part ${activePart} of 5 · ${active.spentEssence}/${active.requiredEssence} Money funded`
    : '15 of 15 complete';

  if (isDiscountIntroVisible) {
    return (
      <div className="island-run-overlay-root bm2-discount-intro" role="presentation">
        <section className="bm2-discount-intro__card" role="dialog" aria-modal="true" aria-label="Build Rush discount unlocked" aria-live="assertive">
          <div className="bm2-discount-intro__emoji" aria-hidden="true">🔨</div>
          <p className="bm2-discount-intro__kicker">Special tile!</p>
          <h2 className="bm2-discount-intro__title">Build Rush</h2>
          <p className="bm2-discount-intro__copy">{discountPercent}% off your next builds</p>
        </section>
      </div>
    );
  }

  return (
    <div className="island-run-overlay-root island-stop-modal-backdrop bm2-backdrop" role="presentation">
      <section className="bm2-shell" role="dialog" aria-modal="true" aria-label={`Island ${islandNumber} Buildings`}>
        <header className="bm2-header">
          <span className="bm2-header__title">🔨 Island {islandNumber} Buildings</span>
          <span className="bm2-header__essence" aria-label={`${essenceAvailable} Money available`}>💰 {essenceAvailable}</span>
          <button type="button" className="bm2-header__close" onClick={onClose} aria-label="Close build panel">✕</button>
        </header>

        {isBuildModalHatcheryGuidanceActive && (
          <p className="bm2-tutorial-guidance">Build Hatchery to Level 1 with your tutorial Money.</p>
        )}
        {isBuildHoldActive && <p className="bm2-hold-feedback">{buildHoldFeedbackLabel}</p>}
        {hasActiveDiscount && (
          <div className="bm2-discount-spotlight" aria-label={`Build Rush discount active: ${discountPercent}% off for about ${discountMinutesLeft} minutes`}>
            <span className="bm2-discount-spotlight__bulb" aria-hidden="true">🔨</span>
            <span className="bm2-discount-spotlight__copy">
              <strong>Build Rush</strong>
              <em>{discountPercent}% OFF</em>
              <small>about {discountMinutesLeft} min left</small>
            </span>
          </div>
        )}

        {isComplete ? (
          <BuildModalV2CompleteState viewModel={viewModel} />
        ) : (
          <>
            <div className="bm2-hero" aria-live="polite">
              <div className="bm2-hero__copy">
                <p className="bm2-hero__eyebrow">Step {active.sequencePosition} of {active.totalSequenceSteps}</p>
                <h3 className="bm2-hero__title">{active.title}</h3>
                <p className="bm2-hero__subtitle">Building Level {active.targetLevel}</p>
                <p className="bm2-hero__status">{statusLine}</p>
                <p className="bm2-hero__cost">
                  {active.canAffordNextTap
                    ? `Next tap spends ${discountPercent > 0 ? Math.ceil(active.nextTapCost * (1 - discountRate)) : active.nextTapCost} Money${discountPercent > 0 ? ` (${discountPercent}% off)` : ''}`
                    : `Need ${Math.max(0, Math.ceil(active.nextTapCost * (1 - discountRate)) - essenceAvailable)} more Money for the next tap`}
                </p>
              </div>
              <div className="bm2-artwork bm2-artwork--hero">
                <BuildModalV2ArtworkImage src={active.imageSrc} alt={active.imageAlt} isPlaceholder={active.imageIsPlaceholder} stopId={active.stopId} buildLevel={active.targetLevel} title={active.title} />
              </div>
              <BuildModalV2LevelRail viewModel={viewModel} />
            </div>

            <p className="sr-only">{active.title} Level {active.targetLevel}: {active.completedParts} of 5 construction parts complete. Only the active part can be built.</p>
            <div className="bm2-tray" role="list" aria-label={`${active.title} construction parts`}>
              {viewModel.parts.map((part) => (
                <BuildModalV2PartButton
                  key={part.partNumber}
                  part={part}
                  activeTitle={active.title}
                  targetLevel={active.targetLevel}
                  activeStopIndex={active.stopIndex}
                  disabledByWalletOrTutorial={!canBuildActive}
                  nextTapCost={active.nextTapCost}
                  onBuildActivePart={onBuildActivePart}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
