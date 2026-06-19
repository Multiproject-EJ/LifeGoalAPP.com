import { useEffect, useState } from 'react';
import '../styles/game-board-overlay.css';
import { getIslandBackgroundImageSrc } from '../features/gamification/level-worlds/services/islandBackgrounds';
import {
  ISLAND_RUN_CONTROLLER_SLOT_MAP,
  getIslandRunControllerSlotStyle,
} from '../features/gamification/level-worlds/services/islandRunControllerVisualContract';

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
};

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
  islandDisplayName = 'Island',
  spinsRemaining = 0,
  creatureCollectionCount = 0,
  creatureRewardReadyCount = 0,
  islandSceneSrc = getIslandBackgroundImageSrc(1),
}: GameBoardOverlayProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

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
  const creatureLabel = creatureRewardReadyCount > 0
    ? `🐾 ${creatureRewardReadyCount} ready`
    : `🐾 ${creatureCollectionCount}`;

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
          <h2 className="game-board-overlay__title">My Quest, 2 track Progress</h2>
          <div className="game-board-overlay__controller-shell" aria-label="Game overlay controller menu">
            <button
              type="button"
              className="game-board-overlay__controller-nav-btn game-board-overlay__controller-nav-btn--slot-quest"
              style={getIslandRunControllerSlotStyle(ISLAND_RUN_CONTROLLER_SLOT_MAP.leftUpper)}
              onClick={onTopbarClick}
              disabled={!onTopbarClick}
            >
              🧭 Quest
            </button>
            <button
              type="button"
              className="game-board-overlay__controller-nav-btn game-board-overlay__controller-nav-btn--slot-creatures"
              style={getIslandRunControllerSlotStyle(ISLAND_RUN_CONTROLLER_SLOT_MAP.leftLower)}
              onClick={onCreatureCollectionClick}
              disabled={!onCreatureCollectionClick}
            >
              {creatureLabel}
            </button>
            <button
              type="button"
              className="game-board-overlay__controller-nav-btn game-board-overlay__controller-nav-btn--slot-offers"
              style={getIslandRunControllerSlotStyle(ISLAND_RUN_CONTROLLER_SLOT_MAP.rightLower)}
              onClick={onSpinWinClick}
              disabled={!onSpinWinClick}
            >
              🎡 Spins {spinsRemaining}
            </button>
            <button
              type="button"
              className="game-board-overlay__controller-nav-btn game-board-overlay__controller-nav-btn--slot-garage"
              style={getIslandRunControllerSlotStyle(ISLAND_RUN_CONTROLLER_SLOT_MAP.rightUpper)}
              onClick={onGarageClick}
              disabled={!onGarageClick}
            >
              🧰 Garage
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
