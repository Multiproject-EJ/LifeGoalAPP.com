import { useEffect, useState } from 'react';
import boardTopbar from '../assets/IMG_8564.webp';
import boardMatchbar from '../assets/IMG_8562.webp';
import boardIconsRight1 from '../assets/board_icons_right1.webp';
import boardIconsRight2 from '../assets/board_icons_right2.webp';
import spinWheelImg from '../assets/Daily_treats_spinnwheel.webp';
import heartsImg from '../assets/Daily_treats_hearts.webp';
import '../styles/game-board-overlay.css';
import { getIslandBackgroundImageSrc } from '../features/gamification/level-worlds/services/islandBackgrounds';

function formatCountdown(resetAtMs: number | undefined, nowMs: number): string {
  if (!resetAtMs) return '';
  const remainingMs = resetAtMs - nowMs;
  if (remainingMs <= 0) return 'Ready';
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

type GameBoardOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  onPlayClick?: () => void;
  onTopbarClick?: () => void;
  onSpinWinClick?: () => void;
  onLuckyRollClick?: () => void;
  onCreatureCollectionClick?: () => void;
  onGarageClick?: () => void;
  profilePlaystyleIcon?: string;
  profilePlaystyleLabel?: string;
  currentLevel?: number;
  momentumPercent?: number;
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
  onTopbarClick,
  onSpinWinClick,
  onLuckyRollClick,
  onCreatureCollectionClick,
  onGarageClick,
  profilePlaystyleIcon,
  profilePlaystyleLabel,
  currentLevel = 1,
  momentumPercent = 0,
  spinsRemaining = 0,
  islandTimeLabel = '—',
  spinWinResetAtMs,
  luckyRollResetAtMs,
  luckyRollRunsRemaining = 0,
  luckyRollStatusLabel,
  showSpinWheel = false,
  showLuckyRoll = false,
  creatureCollectionCount = 0,
  creatureRewardReadyCount = 0,
  islandSceneSrc = getIslandBackgroundImageSrc(1),
}: GameBoardOverlayProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const activeLeftIconCount = [showSpinWheel, showLuckyRoll].filter(Boolean).length;
  const luckyRollTimerLabel = luckyRollStatusLabel ?? (formatCountdown(luckyRollResetAtMs, nowMs) || 'Reward active');

  useEffect(() => {
    if (spinWinResetAtMs === undefined && luckyRollResetAtMs === undefined) return;
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [spinWinResetAtMs, luckyRollResetAtMs]);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay to trigger animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      // Wait for animation to complete before unmounting
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
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const clampedMomentum = Math.min(100, Math.max(0, momentumPercent));

  return (
    <div
      className={`game-board-overlay ${isAnimating ? 'game-board-overlay--open' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className="game-board-overlay__backdrop" onClick={handleBackdropClick} />
      <div className="game-board-overlay__content">
        {/* Island background scene */}
        <div className="game-board-overlay__island-scene" aria-hidden="true">
          <img
            src={islandSceneSrc}
            alt=""
            className="game-board-overlay__island-scene-img"
          />
        </div>
        {/* Top Bar - Now the matchbar at full width */}
        <div 
          className={`game-board-overlay__topbar ${onTopbarClick ? 'game-board-overlay__topbar--clickable' : ''}`}
          onClick={onTopbarClick}
        >
          <img src={boardMatchbar} alt="Game board top bar" className="game-board-overlay__topbar-image" />
          {profilePlaystyleIcon ? (
            <div className="game-board-overlay__topbar-playstyle" aria-label={profilePlaystyleLabel}>
              <span role="img" aria-hidden="true">
                {profilePlaystyleIcon}
              </span>
            </div>
          ) : null}
          <div
            className={`game-board-overlay__topbar-level ${currentLevel >= 10 ? 'game-board-overlay__topbar-level--double' : ''}`}
            aria-label={`Level ${currentLevel}`}
          >
            Lv.{currentLevel}
          </div>
          <div className="game-board-overlay__momentum" aria-label={`Momentum ${clampedMomentum}%`}>
            <div className="game-board-overlay__momentum-track">
              <div className="game-board-overlay__momentum-fill" style={{ width: `${clampedMomentum}%` }} />
            </div>
            <span className="game-board-overlay__momentum-label">Momentum</span>
          </div>
        </div>

        {/* Secondary Bar - Previously the topbar, now smaller */}
        <div className="game-board-overlay__secondarybar">
          <img src={boardTopbar} alt="Game board secondary bar" className="game-board-overlay__secondarybar-image" />
        </div>

        {/* Middle Section with Side Icons */}
        <div className="game-board-overlay__middle">
          <button
            type="button"
            className="game-board-overlay__play-button"
            onClick={onPlayClick}
            aria-label="Play level one"
          >
            PLAY
          </button>

          {/* Left Side Icons - Blue Circle Placeholders */}
          <div className="game-board-overlay__side-icons game-board-overlay__side-icons--left">
            {showSpinWheel ? (
              <div className="game-board-overlay__icon-item">
                <button
                  type="button"
                  className="game-board-overlay__icon-button"
                  onClick={onSpinWinClick}
                  aria-label="Open Spin Wheel reward"
                >
                  <div className="game-board-overlay__icon-placeholder game-board-overlay__icon-placeholder--asset">
                    <img
                      src={spinWheelImg}
                      alt=""
                      className="game-board-overlay__icon-asset-img"
                    />
                    <span className="game-board-overlay__icon-inner-count" aria-hidden="true">
                      {Math.max(1, spinsRemaining)}
                    </span>
                  </div>
                </button>
                <span className="game-board-overlay__icon-timer">
                  {formatCountdown(spinWinResetAtMs, nowMs) || islandTimeLabel}
                </span>
              </div>
            ) : null}

            {showLuckyRoll ? (
              <div className="game-board-overlay__icon-item">
                <button
                  type="button"
                  className="game-board-overlay__icon-button"
                  onClick={onLuckyRollClick}
                  aria-label="Open Lucky Roll reward"
                >
                  <div className="game-board-overlay__icon-placeholder game-board-overlay__icon-placeholder--asset">
                    <img
                      src={heartsImg}
                      alt=""
                      className="game-board-overlay__icon-asset-img"
                    />
                    {luckyRollRunsRemaining > 0 ? (
                      <span className="game-board-overlay__icon-inner-count" aria-hidden="true">
                        {luckyRollRunsRemaining}
                      </span>
                    ) : null}
                  </div>
                </button>
                <span className="game-board-overlay__icon-timer">
                  {luckyRollTimerLabel}
                </span>
              </div>
            ) : null}

            {activeLeftIconCount === 0 ? (
              <div className="game-board-overlay__icon-item">
                <span className="game-board-overlay__icon-timer">No active reward icons</span>
              </div>
            ) : null}
          </div>

          {/* Right Side Icons */}
          <div className="game-board-overlay__side-icons game-board-overlay__side-icons--right">
            <div className="game-board-overlay__right-icon-item">
              <button
                type="button"
                className="game-board-overlay__icon-button game-board-overlay__icon-button--right"
                onClick={onCreatureCollectionClick}
                aria-label="Open creature collection"
              >
                <img
                  src={boardIconsRight1}
                  alt="Creature collection"
                  className="game-board-overlay__icons-image game-board-overlay__icons-image--bank"
                />
                <span className="game-board-overlay__icon-bank-label">CREATURES</span>
              </button>
              <span className="game-board-overlay__icon-counter">
                {creatureRewardReadyCount > 0
                  ? `${creatureCollectionCount} · ${creatureRewardReadyCount} ready`
                  : creatureCollectionCount.toLocaleString()}
              </span>
            </div>
            <div className="game-board-overlay__right-icon-item">
              <button
                type="button"
                className="game-board-overlay__icon-button game-board-overlay__icon-button--right"
                onClick={onGarageClick}
                aria-label="Open garage tab"
              >
                <img src={boardIconsRight2} alt="Garage" className="game-board-overlay__icons-image" />
              </button>
              <span className="game-board-overlay__icon-counter">Garage</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
