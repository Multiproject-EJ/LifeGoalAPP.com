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
  levelReview?: BuildModalV2LevelReview | null;
  onAdvanceLevelReview: () => void;
  onBuildActivePart: (stopIndex: number) => void;
}

export interface BuildModalV2LevelReview {
  title: string;
  level: number;
  isFullyBuilt: boolean;
  isAdvanceReady: boolean;
  isAdvanceQueued: boolean;
  hasNextBuild: boolean;
}

function BuildModalV2CompleteState({ viewModel }: { viewModel: BuildModalV2ViewModel }) {
  return (
    <div className="bm2-complete-state" role="status">
      <div className="bm2-complete-state__icon" aria-hidden="true">🏝️</div>
      <div className="bm2-complete-state__copy">
        <h3>All landmarks restored</h3>
        <p>15 of 15 construction levels complete</p>
      </div>
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

function BuildModalV2LevelReviewState({
  review,
  onAdvance,
}: {
  review: BuildModalV2LevelReview;
  onAdvance: () => void;
}) {
  const actionLabel = review.isAdvanceQueued
    ? 'Next build queued'
    : review.hasNextBuild
      ? review.isAdvanceReady ? 'Continue building' : 'Queue next build'
      : review.isAdvanceReady ? 'Finish review' : 'Queue finish';

  return (
    <div className="bm2-level-review" role="group" aria-label={`${review.title} level ${review.level} review`}>
      <div className="bm2-level-review__copy" role="status" aria-live="polite">
        <span className="bm2-level-review__eyebrow">Construction milestone</span>
        <h3>{review.title} · Level {review.level} complete</h3>
        <p>{review.isFullyBuilt
          ? 'The island is fully restored. Take in the finished landmark.'
          : 'Take in the finished level. The next build opens automatically.'}</p>
        <div className="bm2-level-review__rail" aria-label={`${review.title} completed levels`}>
          {([1, 2, 3] as const).map((level) => (
            <span
              key={level}
              className={`bm2-level-review__level${level <= review.level ? ' bm2-level-review__level--complete' : ''}`}
              aria-label={`Level ${level} ${level <= review.level ? 'complete' : 'not yet complete'}`}
            >
              L{level}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        className={`bm2-level-review__advance${review.isAdvanceQueued ? ' bm2-level-review__advance--queued' : ''}${review.isAdvanceReady ? ' bm2-level-review__advance--ready' : ''}`}
        aria-label={actionLabel}
        onClick={onAdvance}
      >
        <span aria-hidden="true">{review.isAdvanceQueued ? '✓' : '🔨'}</span>
        <strong>{actionLabel}</strong>
        <small>{review.isAdvanceReady ? 'Continue now' : 'Available after 1 second'}</small>
      </button>
      <span className="bm2-level-review__timer" aria-hidden="true" />
    </div>
  );
}

function BuildModalV2PartButton({
  part,
  activeTitle,
  targetLevel,
  activeStopIndex,
  disabledByWalletOrTutorial,
  nextTapEssenceCost,
  onBuildActivePart,
}: {
  part: BuildModalV2PartViewModel;
  activeTitle: string;
  targetLevel: number;
  activeStopIndex: number;
  disabledByWalletOrTutorial: boolean;
  nextTapEssenceCost: number;
  onBuildActivePart: (stopIndex: number) => void;
}) {
  const isActive = part.status === 'active';
  const isDisabled = !isActive || disabledByWalletOrTutorial;
  const metaLabel = part.status === 'complete'
    ? 'Done'
    : part.status === 'locked'
      ? ''
      : `${nextTapEssenceCost} Money`;
  const titleLabel = isActive ? `Build ${part.partNumber}` : `${part.partNumber}`;
  const ariaLabel = part.status === 'complete'
    ? `${activeTitle} Level ${targetLevel}, Part ${part.partNumber} complete`
    : part.status === 'locked'
      ? `${activeTitle} Level ${targetLevel}, Part ${part.partNumber} locked`
      : `Build ${activeTitle} Level ${targetLevel}, Part ${part.partNumber}. ${part.remainingEssence} Money left in this part. Next tap spends ${nextTapEssenceCost} Money.`;

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
      <span className="bm2-part__title">{titleLabel}</span>
      <span className="bm2-part__meta">{metaLabel}</span>
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
  levelReview = null,
  onAdvanceLevelReview,
  onBuildActivePart,
}: BuildModalV2Props) {
  const active = viewModel.activeLandmark;
  const isComplete = viewModel.sequentialBuildView.isFullyBuilt || !active;
  const activePart = active?.activePart ?? 1;
  const canBuildActive = Boolean(active?.canAffordNextTap);
  const progressPercent = active ? Math.round(Math.max(0, Math.min(1, active.progressRatio)) * 100) : 100;
  const discountPercent = Math.round(Math.max(0, discountRate) * 100);
  const discountMinutesLeft = discountExpiresAtMs && discountRate > 0 ? Math.max(1, Math.ceil((discountExpiresAtMs - Date.now()) / 60000)) : 0;
  const hasActiveDiscount = discountPercent > 0 && discountMinutesLeft > 0;

  if (!isOpen) return null;

  const statusLine = active
    ? `${active.spentEssence}/${active.requiredEssence} Money funded`
    : '15 of 15 complete';

  return (
    <div className="island-run-overlay-root bm2-build-mode" role="presentation">
      <section className="bm2-shell" role="dialog" aria-modal="true" aria-label={`Island ${islandNumber} construction mode`}>
        <header className="bm2-header">
          <span className="bm2-header__crest" aria-hidden="true">⚒</span>
          <span className="bm2-header__copy">
            <span className="bm2-header__eyebrow">Island {islandNumber} restoration</span>
            <strong className="bm2-header__title">
              {levelReview
                ? `${levelReview.title} · Level ${levelReview.level} complete`
                : active ? `${active.title} · Level ${active.targetLevel}` : 'Construction complete'}
            </strong>
          </span>
          <span className="bm2-header__essence" aria-label={`${essenceAvailable} Money available`}><span aria-hidden="true">💰</span> {essenceAvailable}</span>
          <button type="button" className="bm2-header__close" onClick={onClose} aria-label="Close build panel">✕</button>
        </header>

        <div className="bm2-build-mode__messages" aria-live="polite">
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
        </div>

        <div className={`bm2-dock ${isComplete && !levelReview ? 'bm2-dock--complete' : ''}${levelReview ? ' bm2-dock--level-review' : ''}`}>
          {levelReview ? (
            <BuildModalV2LevelReviewState review={levelReview} onAdvance={onAdvanceLevelReview} />
          ) : isComplete ? (
            <BuildModalV2CompleteState viewModel={viewModel} />
          ) : (
            <>
              <div className="bm2-dock__summary" aria-live="polite">
                <div className="bm2-hero__copy">
                  <p className="bm2-hero__eyebrow">Step {active.sequencePosition} of {active.totalSequenceSteps}</p>
                  <h3 className="bm2-hero__title">{active.title}</h3>
                  <p className="bm2-hero__subtitle">Level {active.targetLevel} · Part {activePart}/5</p>
                  <p className="bm2-hero__status">{statusLine}</p>
                  <div
                    className="bm2-progress"
                    role="progressbar"
                    aria-label={`${active.title} Level ${active.targetLevel} funding progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressPercent}
                  >
                    <span className="bm2-progress__fill" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className="bm2-hero__cost">
                    {active.canAffordNextTap
                      ? `Next part · ${active.nextTapEssenceCost} Money${discountPercent > 0 ? ` · ${discountPercent}% off` : ''}`
                      : `Need ${Math.max(0, active.nextTapEssenceCost - essenceAvailable)} more Money for the next tap`}
                  </p>
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
                    nextTapEssenceCost={active.nextTapEssenceCost}
                    onBuildActivePart={onBuildActivePart}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
