import { lazy, Suspense, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../utils/scrollLock';
import { ShopItemCostLine } from './ShopItemCostLine';
import { CelebrationFireworks } from '../../../../components/CelebrationFireworks';
import type { FastBuildQuote } from '../services/islandRunFastBuild';
import { ISLAND_RUN_FULL_RESTORATION_DICE_REWARD } from '../services/islandRunRestorationReward';
const BuildCelebrationCrew = lazy(() => import('./BuildCelebrationCrew'));
import type { BuildModalV2ViewModel, BuildModalV2PartViewModel } from '../services/islandRunBuildModalV2ViewModel';

function BuildDiceFlight() {
  const flightRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const counter = document.querySelector('.bm2-header__dice')?.getBoundingClientRect();
    if (!counter || !flightRef.current) return;
    flightRef.current.style.setProperty('--dice-target-x', `${counter.left + counter.width / 2}px`);
    flightRef.current.style.setProperty('--dice-target-y', `${counter.top + counter.height / 2}px`);
  }, []);
  return <span ref={flightRef} className="bm2-dice-flight" aria-hidden="true">🎲</span>;
}

export interface BuildModalV2Props {
  isOpen: boolean;
  islandNumber: number;
  essenceAvailable: number;
  diceAvailable?: number;
  fastBuildQuotes?: FastBuildQuote[];
  fastBuildMode?: 'landmark' | 'island';
  buildActionError?: string | null;
  onFastBuild?: (quote: FastBuildQuote) => void;
  onClose: () => void;
  viewModel: BuildModalV2ViewModel;
  isBuildHoldActive: boolean;
  isBuildInteractionLocked: boolean;
  buildInteractionLockLabel: string;
  buildHoldFeedbackLabel: string;
  isBuildModalHatcheryGuidanceActive: boolean;
  discountRate?: number;
  discountExpiresAtMs?: number | null;
  levelReview?: BuildModalV2LevelReview | null;
  onAdvanceLevelReview: () => void;
  onBuildPartChoice: (stopIndex: number, partNumber: BuildModalV2PartViewModel['partNumber']) => void;
  onStartBuildHold: (stopIndex: number) => void;
  onStopBuildHold: () => void;
}

export interface BuildModalV2LevelReview {
  diceAward?: number;
  fastMode?: string;
  title: string;
  stopId: string;
  previousLevel: number;
  level: number;
  presentationSequence: number;
  isFullyBuilt: boolean;
  isAdvanceReady: boolean;
  isAdvanceQueued: boolean;
  hasNextBuild: boolean;
}

function BuildModalV2CompleteState({ viewModel }: { viewModel: BuildModalV2ViewModel }) {
  return (
    <div className="bm2-complete-state" role="status">
      <div className="bm2-complete-state__fireworks" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => <span key={index} />)}
      </div>
      <div className="bm2-complete-state__dice-rain" aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => (
          <img key={index} src="/assets/spin-wheel/daily-momentum/prizes/prize-dice-pair-transparent.png" alt="" />
        ))}
      </div>
      <div className="bm2-complete-state__banner">
        <img
          className="bm2-complete-state__crest"
          src="/assets/island-run/build-modal/completed-crest-v001.png"
          alt="Completed!"
        />
      </div>
      <div className="bm2-complete-state__reward" aria-label={`Full restoration bonus: ${ISLAND_RUN_FULL_RESTORATION_DICE_REWARD} dice, once per visit, in addition to level rewards`}>
        <img src="/assets/spin-wheel/daily-momentum/prizes/prize-dice-pair-transparent.png" alt="" aria-hidden="true" />
        <span><small>Full restoration bonus</small><strong>+{ISLAND_RUN_FULL_RESTORATION_DICE_REWARD} Dice</strong></span>
      </div>
      <div className="bm2-complete-state__copy">
        <h3>All landmarks restored</h3>
        <p>Once per visit · plus level rewards</p>
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
      ? review.isAdvanceReady ? 'Continue building' : 'Celebration playing'
      : review.isAdvanceReady ? 'Finish review' : 'Celebration playing';

  return (
    <div className="bm2-level-review" role="group" aria-label={`${review.title} level ${review.level} review`}>
      <div className="bm2-level-review__copy" role="status" aria-live="polite">
        <span className="bm2-level-review__eyebrow">Construction milestone</span>
        <h3>{review.title} · Level {review.level} complete</h3>
        <p>{review.isFullyBuilt
          ? 'Landmark restored. Ready at full strength.'
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
        disabled={!review.isAdvanceReady}
        aria-disabled={!review.isAdvanceReady}
        onClick={onAdvance}
      >
        <span aria-hidden="true">{review.isAdvanceQueued ? '✓' : '🔨'}</span>
        <strong>{actionLabel}</strong>
        <small>{review.isAdvanceReady ? 'Continue now' : 'Robots and reveal still moving'}</small>
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
  disabledByTutorial,
  disabledByAnimation,
  isBuildHoldActive,
  onBuildPartChoice,
}: {
  part: BuildModalV2PartViewModel;
  activeTitle: string;
  targetLevel: number;
  activeStopIndex: number;
  disabledByTutorial: boolean;
  disabledByAnimation: boolean;
  isBuildHoldActive: boolean;
  onBuildPartChoice: (stopIndex: number, partNumber: BuildModalV2PartViewModel['partNumber']) => void;
}) {
  const isComplete = part.status === 'complete';
  const isDisabled = isComplete || !part.canAfford || disabledByTutorial || disabledByAnimation || isBuildHoldActive;
  const metaLabel = part.status === 'complete'
    ? 'Done'
    : `${part.essenceCost} Money`;
  const titleLabel = isComplete ? `Part ${part.partNumber}` : `Build ${part.partNumber}`;
  const ariaLabel = part.status === 'complete'
    ? `${activeTitle} Level ${targetLevel}, Part ${part.partNumber} complete`
    : `Build ${activeTitle} Level ${targetLevel} through Part ${part.partNumber}. Costs ${part.essenceCost} Money and funds ${part.remainingEssence} construction progress.`;

  return (
    <button
      type="button"
      className={`bm2-part bm2-part--${part.status}${!isComplete ? ' bm2-part--choice' : ''}`}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-label={ariaLabel}
      onClick={!isDisabled ? () => onBuildPartChoice(activeStopIndex, part.partNumber) : undefined}
    >
      <span className="bm2-part__icon" aria-hidden="true">{part.status === 'complete' ? '✓' : '🔨'}</span>
      <span className="bm2-part__title">{titleLabel}</span>
      <span className="bm2-part__meta">{metaLabel}</span>
    </button>
  );
}

function BuildModalV2HoldButton({
  activeTitle,
  activeStopIndex,
  nextTapEssenceCost,
  isActive,
  isDisabled,
  onStartBuildHold,
  onStopBuildHold,
}: {
  activeTitle: string;
  activeStopIndex: number;
  nextTapEssenceCost: number;
  isActive: boolean;
  isDisabled: boolean;
  onStartBuildHold: (stopIndex: number) => void;
  onStopBuildHold: () => void;
}) {
  const startHold = () => {
    if (!isDisabled) onStartBuildHold(activeStopIndex);
  };

  return (
    <button
      type="button"
      className={`bm2-hold-build${isActive ? ' bm2-hold-build--active' : ''}`}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-label={`Press and hold to rapidly build ${activeTitle}. Every construction beat plays and costs up to ${nextTapEssenceCost} Money.`}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        startHold();
      }}
      onPointerUp={onStopBuildHold}
      onPointerCancel={onStopBuildHold}
      onLostPointerCapture={onStopBuildHold}
      onBlur={onStopBuildHold}
      onKeyDown={(event) => {
        if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
          event.preventDefault();
          startHold();
        }
      }}
      onKeyUp={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          onStopBuildHold();
        }
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className="bm2-hold-build__icon" aria-hidden="true">⚒️</span>
      <span className="bm2-hold-build__copy">
        <strong>{isActive ? 'Building… release to stop' : 'Hold to build'}</strong>
        <small>{`${nextTapEssenceCost} Money per step`}</small>
      </span>
      <span className="bm2-hold-build__sequence" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => <i key={index} />)}
      </span>
      <span className="bm2-hold-build__meter" aria-hidden="true" />
    </button>
  );
}

export function BuildModalV2({
  isOpen,
  islandNumber,
  essenceAvailable,
  diceAvailable = 0, fastBuildQuotes = [], fastBuildMode, buildActionError, onFastBuild,
  onClose,
  viewModel,
  isBuildHoldActive,
  isBuildInteractionLocked,
  buildInteractionLockLabel,
  buildHoldFeedbackLabel,
  isBuildModalHatcheryGuidanceActive,
  discountRate = 0,
  discountExpiresAtMs = null,
  levelReview = null,
  onAdvanceLevelReview,
  onBuildPartChoice,
  onStartBuildHold,
  onStopBuildHold,
}: BuildModalV2Props) {
  const active = viewModel.activeLandmark;
  const isComplete = viewModel.sequentialBuildView.isFullyBuilt || !active;
  const activePart = active?.activePart ?? 1;
  const canBuildActive = Boolean(active?.canAffordNextTap);
  const progressPercent = active ? Math.round(Math.max(0, Math.min(1, active.progressRatio)) * 100) : 100;
  const discountPercent = Math.round(Math.max(0, discountRate) * 100);
  const discountMinutesLeft = discountExpiresAtMs && discountRate > 0 ? Math.max(1, Math.ceil((discountExpiresAtMs - Date.now()) / 60000)) : 0;
  const hasActiveDiscount = !isComplete && discountPercent > 0 && discountMinutesLeft > 0;

  useEffect(() => {
    if (!isOpen) return;
    return lockPageScroll(['body', 'documentElement']);
  }, [isOpen]);
  if (!isOpen) return null;

  const statusLine = active
    ? `${active.spentEssence}/${active.requiredEssence} Money funded`
    : 'Construction complete';

  return createPortal(
    <div className={`island-run-overlay-root bm2-build-mode${isBuildHoldActive ? ' bm2-build-mode--rapid' : ''}${isComplete && !levelReview ? ' bm2-build-mode--complete' : ''}${!fastBuildMode && (levelReview || isComplete) ? ' bm2-build-mode--celebrating' : ''}`} role="presentation">
      <section className="bm2-shell" role="dialog" aria-modal="true" aria-label={`Island ${islandNumber} construction mode`}>
        <Suspense fallback={null}><BuildCelebrationCrew active={Boolean(levelReview || isComplete || fastBuildMode)} orbit={Boolean(fastBuildMode)} /></Suspense>
        {!fastBuildMode && (levelReview ? levelReview.level === 3 : isComplete) && <CelebrationFireworks key={levelReview?.presentationSequence ?? 'complete'} active variant="rapid" backdrop="none" placement="local" />}
        {!fastBuildMode && levelReview && <div className="bm2-celebration-title" role="status">
          <span>{levelReview?.fastMode ? 'POW! Beautifully built.' : 'Beautifully built!'}</span>
          <h2>{levelReview ? levelReview.title : 'All landmarks built'}</h2>
          <p>{levelReview ? `Level ${levelReview.level} complete` : 'Construction complete'}</p>
          {Boolean(levelReview?.diceAward) && <strong className="bm2-dice-award">🎲 +{levelReview?.diceAward}</strong>}
        </div>}
        {Boolean(levelReview?.diceAward) && <BuildDiceFlight key={levelReview?.presentationSequence} />}
        {fastBuildMode && <div className="bm2-fast-burst" role="status">{fastBuildMode === 'island' ? 'Building every landmark…' : 'Building to Level 3…'}<strong>WHOOSH!</strong></div>}
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
          <span className="bm2-header__dice" aria-label={`${diceAvailable} dice`}>🎲 {diceAvailable}</span>
          <span className="bm2-header__essence" aria-label={`${essenceAvailable} Money available`}><span aria-hidden="true">💰</span> {essenceAvailable}</span>
          <button type="button" className="bm2-header__close" onClick={onClose} aria-label="Close build panel">✕</button>
        </header>

        {!fastBuildMode && isComplete && !levelReview ? <BuildModalV2CompleteState viewModel={viewModel} /> : null}

        <div className="bm2-build-mode__messages" aria-live="polite">
          {buildActionError && <p role="alert">{buildActionError}</p>}
          {isBuildModalHatcheryGuidanceActive && (
            <p className="bm2-tutorial-guidance">Build Hatchery to Level 1 with your tutorial Money.</p>
          )}
          {isBuildHoldActive && <p className="bm2-hold-feedback">{buildHoldFeedbackLabel}</p>}
          {isBuildInteractionLocked && !levelReview && !isComplete && (
            <p className="bm2-animation-lock" role="status">{buildInteractionLockLabel}</p>
          )}
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
          {fastBuildMode ? <p className="bm2-fast-status">Your construction is saved. Enjoy the reveal…</p> : levelReview ? (
            <BuildModalV2LevelReviewState review={levelReview} onAdvance={onAdvanceLevelReview} />
          ) : isComplete ? (
            <button type="button" className="bm2-level-review__advance" onClick={onClose}>Back to island</button>
          ) : active ? (
            <>
              <div className="bm2-dock__summary" aria-live="polite">
                <div className="bm2-dock__topline">
                  <p className="bm2-hero__eyebrow">Step {active.sequencePosition} of {active.totalSequenceSteps}</p>
                  <BuildModalV2LevelRail viewModel={viewModel} />
                </div>
                <div className="bm2-dock__identity">
                  <h3 className="bm2-hero__title">{active.title}</h3>
                  <p className="bm2-hero__meta">Level {active.targetLevel} · Part {activePart}/5 · {statusLine}</p>
                </div>
                <div className="bm2-dock__funding">
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
              </div>

              <p className="sr-only">{active.title} Level {active.targetLevel}: {active.completedParts} of 5 construction parts complete. Choose any unfinished milestone or hold for rapid build.</p>
              <BuildModalV2HoldButton
                activeTitle={active.title}
                activeStopIndex={active.stopIndex}
                nextTapEssenceCost={active.nextTapEssenceCost}
                isActive={isBuildHoldActive}
                isDisabled={isBuildInteractionLocked || !canBuildActive}
                onStartBuildHold={onStartBuildHold}
                onStopBuildHold={onStopBuildHold}
              />
              <div className="bm2-fast-actions">
                {fastBuildQuotes.filter(quote => essenceAvailable >= quote.cost).map(quote => <button type="button" key={quote.mode}
                  className={`bm2-fast-build bm2-fast-build--${quote.mode}`}
                  disabled={isBuildHoldActive || isBuildInteractionLocked || isBuildModalHatcheryGuidanceActive}
                  onClick={() => onFastBuild?.(quote)}>
                  <span className="bm2-fast-build__icon" aria-hidden="true">{quote.mode === 'island' ? '🔥🔥🔥' : '🔥'}</span>
                  <strong>{quote.mode === 'island' ? 'Build all landmarks' : 'Finish landmark'}</strong>
                  <span className="bm2-fast-build__cost"><ShopItemCostLine cost={quote.cost} balance={essenceAvailable} currencyIcon="💰" currencyName="Money" /></span><small>+{quote.levels} 🎲</small>
                </button>)}
              </div>
              <details className="bm2-build-info"><summary aria-label="Building help and individual parts">? Build options</summary>
                <p>Hold to build; release to stop. Each completed level earns 1 die. Fire builds finish the landmark, or all remaining island construction, for the shown total. Activities and adventures remain to play.</p>
                <div className="bm2-tray" role="list" aria-label={`${active.title} construction parts`}>
                  {viewModel.parts.map(part => <BuildModalV2PartButton key={part.partNumber} part={part} activeTitle={active.title}
                    targetLevel={active.targetLevel} activeStopIndex={active.stopIndex}
                    disabledByTutorial={isBuildModalHatcheryGuidanceActive && part.partNumber !== active.activePart}
                    disabledByAnimation={isBuildInteractionLocked} isBuildHoldActive={isBuildHoldActive} onBuildPartChoice={onBuildPartChoice} />)}
                </div>
              </details>
            </>
          ) : null}
        </div>
      </section>
    </div>, document.body
  );
}
