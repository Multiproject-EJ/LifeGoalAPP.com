import { useEffect, useState } from 'react';
import '../styles/game-board-overlay.css';
import { getIslandBackgroundImageSrc } from '../features/gamification/level-worlds/services/islandBackgrounds';
import {
  buildDualTrackOverlayViewModel,
  type DualTrackRealLifeInput,
} from '../features/gamification/level-worlds/services/dualTrackOverlayAdapter';
import type { JourneyChestClaimViewModel } from '../features/gamification/level-worlds/services/combinedJourneyChestClaim';
import type { IslandJourneyProgress } from '../features/gamification/level-worlds/services/islandJourneyMilestones';
import {
  RankJourneyModal,
  type RankDefinition,
  type RankProgressView,
} from '../features/rank';
import {
  ISLAND_RUN_CONTROLLER_SLOT_MAP,
  getIslandRunControllerSlotStyle,
} from '../features/gamification/level-worlds/services/islandRunControllerVisualContract';
import { LivingController } from '../features/gamification/level-worlds/components/living-controller/LivingController';
import type { ControllerMenuFaces } from '../features/gamification/level-worlds/components/living-controller/renderer';
import type { TwoTracksToday } from '../features/gamification/level-worlds/services/twoTracksDaily';
import { buildTwoTracksRoad } from '../features/gamification/level-worlds/services/twoTracksRoad';
import { TwoTracksRoad } from './two-tracks/TwoTracksRoad';

/**
 * Presentational-only memory of the last island the dual-track ladder was shown for,
 * persisted per viewer in localStorage so the ladder can "catch up" (animate from the
 * island you last viewed up to your current one) on the next open — even across reloads.
 * This is a UI preference only; it never reads or writes gameplay state.
 */
const DUAL_TRACK_LAST_ISLAND_KEY_PREFIX = 'lifegoal:dual-track:last-island:';

function dualTrackLastIslandKey(viewerId: string | undefined): string {
  return `${DUAL_TRACK_LAST_ISLAND_KEY_PREFIX}${viewerId ?? 'anon'}`;
}

function readDualTrackLastIsland(viewerId: string | undefined): number | null {
  try {
    const raw = window.localStorage.getItem(dualTrackLastIslandKey(viewerId));
    if (raw == null) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeDualTrackLastIsland(viewerId: string | undefined, islandNumber: number): void {
  try {
    window.localStorage.setItem(dualTrackLastIslandKey(viewerId), String(islandNumber));
  } catch {
    // Ignore storage failures (private mode, quota); the animation simply won't replay.
  }
}


type RankExtensionTier = 'bronze' | 'silver' | 'gold';

const RANK_EXTENSION_BADGES: Record<RankExtensionTier, { src: string; label: string }> = {
  bronze: { src: '/assets/ranks/Rank_bronze.webp', label: 'Bronze rank extension' },
  silver: { src: '/assets/ranks/Rank_silver.webp', label: 'Silver rank extension' },
  gold: { src: '/assets/ranks/Rank_gold.webp', label: 'Gold rank extension' },
};

function rankExtensionTierForRank(rank: RankDefinition | undefined): RankExtensionTier {
  const rankId = rank?.id ?? 1;
  if (rankId <= 6) return 'bronze';
  if (rankId <= 10) return 'silver';
  return 'gold';
}

type GameBoardOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  onPlayClick?: () => void;
  /** First-run guided mode: only PLAY is interactive and the backdrop can't dismiss. */
  spotlightPlay?: boolean;
  onTopbarClick?: () => void;
  onSpinWinClick?: () => void;
  onLuckyRollClick?: () => void;
  onCreatureCollectionClick?: () => void;
  onGarageClick?: () => void;
  /** Today-menu Actions (same destination as the Today footer's ⚡️ Actions). */
  onActionsClick?: () => void;
  onCompassClick?: () => void;
  profilePlaystyleIcon?: string;
  profileAvatarUrl?: string;
  profilePlaystyleLabel?: string;
  essenceBalance?: number;
  rewardBarProgress?: number;
  rewardBarThreshold?: number;
  rewardBarTier?: number;
  activeTimedEventType?: string | null;
  activeTimedEventExpiresAtMs?: number | null;
  islandNumber?: number;
  islandDisplayName?: string;
  spinsRemaining?: number;
  islandTimeLabel?: string;
  spinWinResetAtMs?: number;
  luckyRollResetAtMs?: number;
  luckyRollRunsRemaining?: number;
  luckyRollStatusLabel?: string;
  showSpinWheel?: boolean;
  showLuckyRoll?: boolean;
  creatureCollectionCount?: number;
  creatureRewardReadyCount?: number;
  islandSceneSrc?: string;
  /** Read-only goal/habit summary used to personalize the Real Life Journey track. */
  realLife?: DualTrackRealLifeInput;
  islandJourneyProgress?: IslandJourneyProgress;
  earnedXpFloor?: number;
  /** Stable per-viewer id used to scope the "catch-up climb" memory (presentational only). */
  viewerId?: string;
  /** Claimable Combined Journey Level chest (R5); null/omitted hides the CTA. */
  journeyChest?: JourneyChestClaimViewModel | null;
  /** True while a chest claim is in flight. */
  journeyChestPending?: boolean;
  /** Transient "+N dice" feedback shown after a successful claim. */
  journeyChestFeedback?: string | null;
  /** Invoked when the user claims the current chest. */
  onClaimJourneyChest?: (thresholdLevel: number) => void;
  /** Current player rank (Combined Journey Level) shown as a node on the spine. */
  currentRank?: RankDefinition;
  /** Rank-band progress for the rank journey modal opened from the spine node. */
  rankProgress?: RankProgressView;
  /** Combined Journey Level (for the rank journey modal). */
  rankLevel?: number;
  /** When true, the spine rank node pulses to signal an unacknowledged promotion. */
  rankHasPendingPromotion?: boolean;
  /** Today's "both tracks" check; null while today's habit logs load. */
  twoTracksToday?: TwoTracksToday | null;
  /** Lifetime spark XP (feeds the Combined Journey Level). */
  twoTracksSparkXp?: number;
  /** Called once today's spark animation has played. */
  onTwoTracksSparkSeen?: () => void;
  /** Hides today's balance nudge. */
  onTwoTracksNudgeDismiss?: () => void;
};

const noop = () => {};

type ControllerHandleActionProps = {
  side: 'left' | 'right';
  slot: 'creatures' | 'offers';
  icon: string;
  label: string;
  onClick?: () => void;
};

function ControllerHandleAction({
  side,
  slot,
  icon,
  label,
  onClick,
}: ControllerHandleActionProps) {
  const slotStyle = side === 'left'
    ? ISLAND_RUN_CONTROLLER_SLOT_MAP.leftLower
    : ISLAND_RUN_CONTROLLER_SLOT_MAP.rightLower;
  const gradientId = `game-board-overlay-handle-${side}`;

  return (
    <button
      type="button"
      className={`game-board-overlay__controller-nav-btn game-board-overlay__controller-nav-btn--slot-${slot}`}
      style={getIslandRunControllerSlotStyle(slotStyle)}
      onClick={onClick}
      disabled={!onClick}
      aria-label={label}
    >
      <svg
        className={`game-board-overlay__controller-handle-shape${
          side === 'left' ? ' game-board-overlay__controller-handle-shape--left' : ''
        }`}
        viewBox="0 0 100 170"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dceff7" stopOpacity="0.52" />
            <stop offset="0.52" stopColor="#77a9c1" stopOpacity="0.28" />
            <stop offset="1" stopColor="#153e59" stopOpacity="0.38" />
          </linearGradient>
        </defs>
        <path
          d="M18 2C43-2 68 1 80 14C91 29 94 57 97 84C101 116 99 146 88 163C82 173 74 173 66 165C55 152 48 130 39 108C31 87 23 66 15 49C8 35 1 22 3 13C5 7 10 4 18 2Z"
          fill={`url(#${gradientId})`}
          stroke="rgba(205, 239, 252, 0.72)"
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="game-board-overlay__controller-handle-content">
        <span className="game-board-overlay__controller-handle-icon" aria-hidden="true">{icon}</span>
        <span className="game-board-overlay__controller-handle-text">{label}</span>
      </span>
    </button>
  );
}

type JourneyHubProps = {
  level: number;
  progressPercent: number;
  nextThresholdLevel: number;
  onOpenRankJourney?: () => void;
  promotionPending: boolean;
  today: TwoTracksToday | null;
  sparkPlaying: boolean;
};

const HUB_RING_RADIUS = 44;
const HUB_RING_LENGTH = 2 * Math.PI * HUB_RING_RADIUS;

/** Stands on today's row: the level ring (opens the rank journey) and today's both-tracks check. */
function JourneyHub({
  level,
  progressPercent,
  nextThresholdLevel,
  onOpenRankJourney,
  promotionPending,
  today,
  sparkPlaying,
}: JourneyHubProps) {
  const dash = (Math.min(100, Math.max(0, progressPercent)) / 100) * HUB_RING_LENGTH;
  const ringLabel = `Combined Journey Level ${level}, ${progressPercent} percent to the level ${nextThresholdLevel} chest`;
  const ring = (
    <>
      <svg className="game-board-overlay__hub-ring-svg" viewBox="0 0 100 100" aria-hidden="true">
        <circle className="game-board-overlay__hub-ring-track" cx="50" cy="50" r={HUB_RING_RADIUS} />
        <circle
          className="game-board-overlay__hub-ring-fill"
          cx="50"
          cy="50"
          r={HUB_RING_RADIUS}
          strokeDasharray={`${dash} ${HUB_RING_LENGTH}`}
        />
      </svg>
      <span className="game-board-overlay__hub-level" aria-hidden="true">
        <span>Lv</span>
        <strong>{level}</strong>
      </span>
    </>
  );
  return (
    <div
      className={`game-board-overlay__hub${sparkPlaying ? ' game-board-overlay__hub--spark' : ''}${
        today?.bothDone ? ' game-board-overlay__hub--both' : ''
      }${promotionPending ? ' game-board-overlay__hub--promotion' : ''}`}
    >
      {onOpenRankJourney ? (
        <button
          type="button"
          className="game-board-overlay__hub-ring"
          onClick={onOpenRankJourney}
          aria-label={`${ringLabel}.${promotionPending ? ' New rank earned.' : ''} Open rank journey`}
        >
          {ring}
        </button>
      ) : (
        <span className="game-board-overlay__hub-ring" role="img" aria-label={ringLabel}>{ring}</span>
      )}
      {sparkPlaying ? (
        <>
          <span className="game-board-overlay__spark game-board-overlay__spark--life" aria-hidden="true" />
          <span className="game-board-overlay__spark game-board-overlay__spark--game" aria-hidden="true" />
          <span className="game-board-overlay__spark-xp" aria-hidden="true">+{today?.sparkXpToday ?? 0} XP ✦</span>
        </>
      ) : null}
    </div>
  );
}

/** Today's both-tracks check: 🌱 life step + 🎲 game step. */
function DailyCheck({ today }: { today: TwoTracksToday | null }) {
  const dailyLabel = !today
    ? 'Habit + roll today'
    : today.bothDone
      ? `Both tracks today${today.streak > 1 ? ` · 🔥${today.streak}` : ''}`
      : today.lifeDone
        ? 'Now roll or build'
        : today.gameDone
          ? 'Now check in a habit'
          : 'Habit + roll today';

  return (
      <span
        className={`game-board-overlay__hub-daily${today?.bothDone ? ' game-board-overlay__hub-daily--both' : ''}`}
        role="status"
        aria-label={`Today: life track ${today?.lifeDone ? 'done' : 'not yet'}, game track ${today?.gameDone ? 'done' : 'not yet'}.`}
      >
        <span className="game-board-overlay__hub-daily-dots" aria-hidden="true">
          <i className={`is-life${today?.lifeDone ? ' is-done' : ''}`}>🌱</i>
          <b />
          <i className={`is-game${today?.gameDone ? ' is-done' : ''}`}>🎲</i>
        </span>
        <span className="game-board-overlay__hub-daily-label" aria-hidden="true">{dailyLabel}</span>
      </span>
  );
}

/** Gentle prompt when one track has been idle for days while the other moves. */
function BalanceNudge({
  today,
  onPlay,
  onCheckIn,
  onDismiss,
}: {
  today: TwoTracksToday | null;
  onPlay: () => void;
  onCheckIn: () => void;
  onDismiss?: () => void;
}) {
  const nudge = today?.balanceNudge;
  if (!nudge) return null;
  const isGame = nudge.lane === 'game';
  return (
    <div className={`game-board-overlay__balance-nudge game-board-overlay__balance-nudge--${nudge.lane}`} role="status">
      <span className="game-board-overlay__balance-nudge-icon" aria-hidden="true">{isGame ? '🎲' : '🌱'}</span>
      <span className="game-board-overlay__balance-nudge-copy">
        <strong>{isGame ? 'Game track is waiting' : 'Life track is waiting'}</strong>
        <small>{isGame ? `No rolls for ${nudge.daysBehind} days` : `No check-ins for ${nudge.daysBehind} days`}</small>
      </span>
      <button type="button" className="game-board-overlay__balance-nudge-go" onClick={isGame ? onPlay : onCheckIn}>
        {isGame ? 'Roll' : 'Check in'}
      </button>
      {onDismiss ? (
        <button type="button" className="game-board-overlay__balance-nudge-close" aria-label="Hide for today" onClick={onDismiss}>×</button>
      ) : null}
    </div>
  );
}

type HorizonChestProps = {
  nextThresholdLevel: number;
  progressPercent: number;
  journeyChest?: JourneyChestClaimViewModel | null;
  journeyChestPending: boolean;
  journeyChestFeedback?: string | null;
  onClaimJourneyChest?: (thresholdLevel: number) => void;
};

/** The next reward, floating at the horizon where the paths fade out. */
function HorizonChest({
  nextThresholdLevel,
  progressPercent,
  journeyChest,
  journeyChestPending,
  journeyChestFeedback,
  onClaimJourneyChest,
}: HorizonChestProps) {
  const claimable = journeyChest && journeyChest.claimableThreshold != null ? journeyChest : null;
  return (
    <div className="game-board-overlay__horizon">
      {claimable ? (
        <button
          type="button"
          className="game-board-overlay__hub-chest game-board-overlay__hub-chest--ready"
          onClick={() => onClaimJourneyChest?.(claimable.claimableThreshold as number)}
          disabled={journeyChestPending}
          aria-label={`${claimable.ctaLabel}: ${claimable.rewardPreviewLabel}`}
        >
          <span className="game-board-overlay__horizon-icon" aria-hidden="true">🎁</span>
          <span>{journeyChestPending ? 'Claiming…' : `Claim · ${claimable.rewardPreviewLabel}`}</span>
        </button>
      ) : (
        <span
          className="game-board-overlay__hub-chest"
          aria-label={`Next reward: level ${nextThresholdLevel} chest, ${100 - progressPercent} percent to go`}
        >
          <span className="game-board-overlay__horizon-icon" aria-hidden="true">🎁</span>
          <span aria-hidden="true">Lv {nextThresholdLevel} chest · {100 - progressPercent}% to go</span>
        </span>
      )}
      {journeyChestFeedback ? (
        <span className="game-board-overlay__hub-feedback" role="status">{journeyChestFeedback}</span>
      ) : null}
    </div>
  );
}

export function GameBoardOverlay({
  isOpen,
  onClose,
  onPlayClick,
  spotlightPlay = false,
  onTopbarClick,
  onSpinWinClick,
  onCreatureCollectionClick,
  onGarageClick,
  onActionsClick,
  onCompassClick,
  essenceBalance = 0,
  rewardBarProgress = 0,
  rewardBarThreshold = 10,
  islandNumber = 1,
  islandDisplayName = 'Island',
  islandSceneSrc = getIslandBackgroundImageSrc(1),
  realLife,
  islandJourneyProgress,
  earnedXpFloor,
  viewerId,
  journeyChest,
  journeyChestPending = false,
  journeyChestFeedback,
  onClaimJourneyChest,
  currentRank,
  rankProgress,
  rankLevel,
  rankHasPendingPromotion = false,
  twoTracksToday = null,
  twoTracksSparkXp,
  onTwoTracksSparkSeen,
  onTwoTracksNudgeDismiss,
}: GameBoardOverlayProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isRankJourneyOpen, setIsRankJourneyOpen] = useState(false);
  const [isLadderClimbing, setIsLadderClimbing] = useState(false);
  const [climbDelta, setClimbDelta] = useState(0);
  const [isSparkPlaying, setIsSparkPlaying] = useState(false);

  // Today's spark plays once, after the track doors have closed, then is marked seen.
  // Keyed to the open animation (not mount) so a slow first paint can't swallow it,
  // and the "seen" timer only starts once the spark is actually on screen.
  const sparkPending = Boolean(isOpen && isAnimating && twoTracksToday?.sparkPending);
  useEffect(() => {
    if (!sparkPending) return;
    let done: ReturnType<typeof setTimeout> | undefined;
    const start = setTimeout(() => {
      setIsSparkPlaying(true);
      done = setTimeout(() => {
        setIsSparkPlaying(false);
        onTwoTracksSparkSeen?.();
      }, 2400);
    }, 1150);
    return () => {
      clearTimeout(start);
      if (done) clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sparkPending]);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // One-shot "catch-up climb" when the island has advanced since the viewer last
  // saw this overlay. Triggered by changed read-model state only (island number),
  // never by gameplay writes. The last-seen value is persisted only after the climb
  // has played, so the rapid mount/remount under React StrictMode can't consume it.
  useEffect(() => {
    if (!isOpen) return;
    const current = Number.isFinite(islandNumber) ? Math.max(1, Math.floor(islandNumber)) : 1;
    const lastSeen = readDualTrackLastIsland(viewerId);
    const advanced = lastSeen !== null && current > lastSeen;

    if (!advanced) {
      writeDualTrackLastIsland(viewerId, current);
      setClimbDelta(0);
      return;
    }

    setClimbDelta(current - lastSeen);
    setIsLadderClimbing(true);
    const timer = setTimeout(() => {
      setIsLadderClimbing(false);
      writeDualTrackLastIsland(viewerId, current);
    }, 1100);
    return () => clearTimeout(timer);
  }, [isOpen, islandNumber, viewerId]);

  if (!shouldRender) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    // In guided first-run mode the player can only advance via PLAY.
    if (spotlightPlay) return;
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const progressPercent = rewardBarThreshold > 0
    ? Math.min(100, Math.max(0, Math.round((rewardBarProgress / rewardBarThreshold) * 100)))
    : 0;
  const dualTrackViewModel = buildDualTrackOverlayViewModel({
    islandNumber,
    islandDisplayName,
    rewardBarProgress,
    rewardBarThreshold,
    realLife,
    islandJourneyProgress,
    earnedXpFloor,
    twoTracksSparkXp,
  });
  const road = buildTwoTracksRoad(dualTrackViewModel, twoTracksToday);
  const rankExtensionBadge = RANK_EXTENSION_BADGES[rankExtensionTierForRank(currentRank)];

  // Same controller as the game; its four buttons mirror the Today footer
  // (✅ Today, ⚡️ Actions, 🌬️ Breathe, 🏆 Score) in the same positions.
  const controllerMenuFaces: ControllerMenuFaces = {
    shop: { glyph: '✅', label: 'Today' },
    build: { glyph: '⚡️', label: 'Actions' },
    creatures: { glyph: '🌬️', label: 'Breathe' },
    concord: { glyph: '🏆', label: 'Score' },
    roll: {
      title: 'PLAY',
      detail: `${islandDisplayName} · ${progressPercent}%`,
      hint: `💰 ${essenceBalance.toLocaleString()} · TAP TO PLAY`,
    },
  };
  const controllerShell = (
          <div className="game-board-overlay__controller-shell" aria-label="Game overlay controller menu">
            <button
              type="button"
              className="game-board-overlay__controller-compass-btn"
              onClick={onCompassClick}
              disabled={!onCompassClick}
              aria-label="Open full navigation menu"
              title="Open menu"
            >
              <span className="game-board-overlay__controller-compass-icon" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="game-board-overlay__controller-nav-btn game-board-overlay__controller-nav-btn--slot-quest"
              style={getIslandRunControllerSlotStyle(ISLAND_RUN_CONTROLLER_SLOT_MAP.leftUpper)}
              onClick={onTopbarClick}
              disabled={!onTopbarClick}
            >
              ✅ Today
            </button>
            <ControllerHandleAction
              side="left"
              slot="creatures"
              icon="🛡️"
              label="Shield"
              onClick={onCreatureCollectionClick}
            />
            <ControllerHandleAction
              side="right"
              slot="offers"
              icon="🏆"
              label="Score"
              onClick={onSpinWinClick}
            />
            <button
              type="button"
              className="game-board-overlay__controller-nav-btn game-board-overlay__controller-nav-btn--slot-garage"
              style={getIslandRunControllerSlotStyle(ISLAND_RUN_CONTROLLER_SLOT_MAP.rightUpper)}
              onClick={onGarageClick}
              disabled={!onGarageClick}
            >
              🚀 Garage
            </button>
            <div
              className="game-board-overlay__controller-badge game-board-overlay__controller-badge--slot"
              style={getIslandRunControllerSlotStyle(ISLAND_RUN_CONTROLLER_SLOT_MAP.centerBadge)}
            >
              {islandDisplayName} · {progressPercent}%
            </div>
            <div
              className="game-board-overlay__controller-play-group"
              style={getIslandRunControllerSlotStyle(ISLAND_RUN_CONTROLLER_SLOT_MAP.centerCore)}
            >
              <button
                type="button"
                className={`game-board-overlay__play-button${
                  spotlightPlay ? ' game-board-overlay__play-button--spotlight' : ''
                }`}
                onClick={onPlayClick}
                aria-label="Play level one"
              >
                <span className="game-board-overlay__play-button-content">
                  <span className="game-board-overlay__play-button-chip">💰 {essenceBalance.toLocaleString()}</span>
                  <span>PLAY</span>
                </span>
              </button>
            </div>
          </div>
  );

  return (
    <div
      className={`game-board-overlay ${isAnimating ? 'game-board-overlay--open' : ''}${
        spotlightPlay ? ' game-board-overlay--spotlight-play' : ''
      }`}
      onClick={handleBackdropClick}
    >
      <div className="game-board-overlay__backdrop" onClick={handleBackdropClick} />
      <div className="game-board-overlay__content">
        <div className="game-board-overlay__island-scene" aria-hidden="true">
          <img
            src={islandSceneSrc}
            alt=""
            className="game-board-overlay__island-scene-img"
          />
        </div>

        <div className="game-board-overlay__middle game-board-overlay__middle--minimal">
          <section className="game-board-overlay__quest-progress" aria-labelledby="game-board-overlay-title">
            <header className="game-board-overlay__header game-board-overlay__header--road">
              <p className="game-board-overlay__eyebrow">Two tracks · one climb</p>
              <h2 id="game-board-overlay-title" className="game-board-overlay__title game-board-overlay__title--sr-only">
                {dualTrackViewModel.title}
              </h2>
            </header>

            <TwoTracksRoad
              road={road}
              progressPercent={dualTrackViewModel.journeyLevel.progressPercentToNextLevel}
              climbDelta={isLadderClimbing ? climbDelta : 0}
              hub={(
                <JourneyHub
                  level={dualTrackViewModel.journeyLevel.level}
                  progressPercent={dualTrackViewModel.journeyLevel.progressPercentToNextLevel}
                  nextThresholdLevel={dualTrackViewModel.journeyLevel.nextThresholdLevel}
                  onOpenRankJourney={currentRank && rankProgress ? () => setIsRankJourneyOpen(true) : undefined}
                  promotionPending={rankHasPendingPromotion}
                  today={twoTracksToday}
                  sparkPlaying={isSparkPlaying}
                />
              )}
              laggingLane={twoTracksToday?.balanceNudge?.lane ?? null}
              today={twoTracksToday}
              daily={(
                <>
                  <DailyCheck today={twoTracksToday} />
                  <BalanceNudge
                    today={twoTracksToday}
                    onPlay={onPlayClick ?? onClose}
                    onCheckIn={onClose}
                    onDismiss={onTwoTracksNudgeDismiss}
                  />
                </>
              )}
              horizon={(
                <HorizonChest
                  nextThresholdLevel={dualTrackViewModel.journeyLevel.nextThresholdLevel}
                  progressPercent={dualTrackViewModel.journeyLevel.progressPercentToNextLevel}
                  journeyChest={journeyChest}
                  journeyChestPending={journeyChestPending}
                  journeyChestFeedback={journeyChestFeedback}
                  onClaimJourneyChest={onClaimJourneyChest}
                />
              )}
            />
          </section>

          {isRankJourneyOpen && currentRank && rankProgress ? (
            <RankJourneyModal
              extensionBadge={rankExtensionBadge}
              level={rankLevel ?? dualTrackViewModel.journeyLevel.level}
              progress={rankProgress}
              onClose={() => setIsRankJourneyOpen(false)}
            />
          ) : null}

          {spotlightPlay ? controllerShell : (
            <div className="game-board-overlay__living-controller">
              <div className="game-board-overlay__controller-extras">
                <button
                  type="button"
                  className="game-board-overlay__controller-extra"
                  onClick={onCompassClick}
                  disabled={!onCompassClick}
                  aria-label="Open full navigation menu"
                >
                  <span aria-hidden="true">☰</span> Menu
                </button>
                <button
                  type="button"
                  className="game-board-overlay__controller-extra"
                  onClick={onGarageClick}
                  disabled={!onGarageClick}
                >
                  <span aria-hidden="true">🚀</span> Garage
                </button>
              </div>
              <LivingController
                arrivalKey={`overlay-${islandNumber}`}
                islandNumber={islandNumber}
                dark={false}
                dev={false}
                dice={1}
                multiplier={1}
                maximum={1}
                cost={1}
                rolling={false}
                autoRolling={false}
                jackpot={false}
                buildReady={false}
                tutorial={false}
                blocked={false}
                rollDisabled={!onPlayClick}
                multiplierDisabled
                canHold={false}
                rollTitle="PLAY"
                regenLabel=""
                concordLabel="Score"
                menuFaces={controllerMenuFaces}
                onRoll={() => onPlayClick?.()}
                onHoldStart={noop}
                onHoldEnd={noop}
                onStopAuto={noop}
                onMultiplier={noop}
                onShop={() => onTopbarClick?.()}
                onBuild={() => (onActionsClick ?? onTopbarClick)?.()}
                onCreatures={() => onCreatureCollectionClick?.()}
                onConcord={() => onSpinWinClick?.()}
                fallback={controllerShell}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
