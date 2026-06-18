import { useEffect, useState } from 'react';
import '../styles/game-board-overlay.css';
import { getIslandBackgroundImageSrc } from '../features/gamification/level-worlds/services/islandBackgrounds';

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
          <button
            type="button"
            className={`game-board-overlay__play-button${
              spotlightPlay ? ' game-board-overlay__play-button--spotlight' : ''
            }`}
            onClick={onPlayClick}
            aria-label="Play level one"
          >
            PLAY
          </button>
        </div>
      </div>
    </div>
  );
}
