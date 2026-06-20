import { useEffect, useState } from 'react';
import '../styles/game-board-overlay.css';
import { getIslandBackgroundImageSrc } from '../features/gamification/level-worlds/services/islandBackgrounds';
import {
  buildDualTrackOverlayViewModel,
  type DualTrackMilestoneCard,
  type DualTrackRealLifeInput,
} from '../features/gamification/level-worlds/services/dualTrackOverlayAdapter';
import {
  ISLAND_RUN_CONTROLLER_SLOT_MAP,
  getIslandRunControllerSlotStyle,
} from '../features/gamification/level-worlds/services/islandRunControllerVisualContract';

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
  /** Stable per-viewer id used to scope the "catch-up climb" memory (presentational only). */
  viewerId?: string;
};

type DualTrackColumnProps = {
  title: string;
  subtitle: string;
  tone: 'life' | 'game';
  cards: DualTrackMilestoneCard[];
};

function DualTrackColumn({ title, subtitle, tone, cards }: DualTrackColumnProps) {
  const headingId = `game-board-overlay-track-${tone}`;
  return (
    <section className={`game-board-overlay__track game-board-overlay__track--${tone}`} aria-labelledby={headingId}>
      <div className="game-board-overlay__track-header">
        <h3 id={headingId}>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <div className="game-board-overlay__track-ladder" role="list" aria-label={`${title} milestones`}>
        {cards.map((card) => (
          <div
            key={card.id}
            role="listitem"
            className={`game-board-overlay__milestone game-board-overlay__milestone--${card.position}`}
          >
            <span className="game-board-overlay__milestone-icon" aria-hidden="true">
              {card.icon}
              {typeof card.islandNumber === 'number' ? (
                <span className="game-board-overlay__milestone-index">{card.islandNumber}</span>
              ) : null}
            </span>
            <span className="game-board-overlay__milestone-copy">
              <span className="game-board-overlay__milestone-kicker">{card.progressLabel}</span>
              <strong>{card.title}</strong>
              <span>{card.subtitle}</span>
            </span>
            <span className="game-board-overlay__milestone-reward">{card.rewardPreviewLabel}</span>
          </div>
        ))}
      </div>
    </section>
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
  essenceBalance = 0,
  rewardBarProgress = 0,
  rewardBarThreshold = 10,
  islandNumber = 1,
  islandDisplayName = 'Island',
  islandSceneSrc = getIslandBackgroundImageSrc(1),
  realLife,
  viewerId,
}: GameBoardOverlayProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isLadderClimbing, setIsLadderClimbing] = useState(false);
  const [climbDelta, setClimbDelta] = useState(0);

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
  });
  const { collectedCount, totalCount } = dualTrackViewModel.gameProgress;
  const gameTrackSubtitle = collectedCount > 0
    ? `${collectedCount} of ${totalCount} islands explored`
    : 'Begin your first island adventure.';
  const { source: realLifeSource, goalCount, habitCount } = dualTrackViewModel.realLifeProgress;
  const realLifeTrackSubtitle = realLifeSource === 'data'
    ? `${goalCount} goal${goalCount === 1 ? '' : 's'} · ${habitCount} habit${habitCount === 1 ? '' : 's'}`
    : 'Goals, habits, and growth milestones.';

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
            <header className="game-board-overlay__header">
              <p className="game-board-overlay__eyebrow">Two tracks · one climb</p>
              <h2 id="game-board-overlay-title" className="game-board-overlay__title">
                {dualTrackViewModel.title}
              </h2>
              <p className="game-board-overlay__subtitle">{dualTrackViewModel.subtitle}</p>
            </header>

            <div
              className={`game-board-overlay__dual-track-stage${
                isLadderClimbing ? ' game-board-overlay__dual-track-stage--climbing' : ''
              }`}
              role="group"
              aria-label="My Quest and Game Progress tracks"
            >
              {isLadderClimbing && climbDelta > 0 ? (
                <span className="game-board-overlay__climb-burst" aria-hidden="true">
                  +{climbDelta} 🏝️
                </span>
              ) : null}
              <DualTrackColumn
                title="Real Life Journey"
                subtitle={realLifeTrackSubtitle}
                tone="life"
                cards={dualTrackViewModel.realLifeTrack}
              />
              <div
                className="game-board-overlay__progress-spine"
                role="img"
                aria-label={`Combined progress ${dualTrackViewModel.centerSpine.progressPercent} percent`}
              >
                <span className="game-board-overlay__progress-spine-label" aria-hidden="true">{dualTrackViewModel.centerSpine.label}</span>
                <span className="game-board-overlay__progress-spine-orb" aria-hidden="true">
                  {dualTrackViewModel.centerSpine.icon}
                </span>
                <span className="game-board-overlay__progress-spine-rail" aria-hidden="true">
                  <span
                    className="game-board-overlay__progress-spine-fill"
                    style={{ height: `${dualTrackViewModel.centerSpine.progressPercent}%` }}
                  />
                </span>
              </div>
              <DualTrackColumn
                title="Game Journey"
                subtitle={gameTrackSubtitle}
                tone="game"
                cards={dualTrackViewModel.gameTrack}
              />
            </div>
          </section>

          <div className="game-board-overlay__controller-shell" aria-label="Game overlay controller menu">
            <button
              type="button"
              className="game-board-overlay__controller-nav-btn game-board-overlay__controller-nav-btn--slot-quest"
              style={getIslandRunControllerSlotStyle(ISLAND_RUN_CONTROLLER_SLOT_MAP.leftUpper)}
              onClick={onTopbarClick}
              disabled={!onTopbarClick}
            >
              ✅ Today
            </button>
            <button
              type="button"
              className="game-board-overlay__controller-nav-btn game-board-overlay__controller-nav-btn--slot-creatures"
              style={getIslandRunControllerSlotStyle(ISLAND_RUN_CONTROLLER_SLOT_MAP.leftLower)}
              onClick={onCreatureCollectionClick}
              disabled={!onCreatureCollectionClick}
            >
              🛡️ Shield
            </button>
            <button
              type="button"
              className="game-board-overlay__controller-nav-btn game-board-overlay__controller-nav-btn--slot-offers"
              style={getIslandRunControllerSlotStyle(ISLAND_RUN_CONTROLLER_SLOT_MAP.rightLower)}
              onClick={onSpinWinClick}
              disabled={!onSpinWinClick}
            >
              🏆 Score
            </button>
            <button
              type="button"
              className="game-board-overlay__controller-nav-btn game-board-overlay__controller-nav-btn--slot-garage"
              style={getIslandRunControllerSlotStyle(ISLAND_RUN_CONTROLLER_SLOT_MAP.rightUpper)}
              onClick={onGarageClick}
              disabled={!onGarageClick}
            >
              ⚡️ Actions
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
                  <span className="game-board-overlay__play-button-chip">✨ {essenceBalance.toLocaleString()}</span>
                  <span>PLAY</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
