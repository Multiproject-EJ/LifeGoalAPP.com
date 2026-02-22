import { useEffect, useState } from 'react';
import boardTopbar from '../assets/IMG_8564.webp';
import boardMatchbar from '../assets/IMG_8562.webp';
import boardIconsRight1 from '../assets/board_icons_right1.webp';
import boardIconsRight2 from '../assets/board_icons_right2.webp';
import boardIconsRight3 from '../assets/board_icons_right3.webp';
import '../styles/game-board-overlay.css';

type GameBoardOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  onPlayClick?: () => void;
  onTopbarClick?: () => void;
  onSpinWinClick?: () => void;
  onHeartsGameplayClick?: () => void;
  onDailyHatchClick?: () => void;
  onBankClick?: () => void;
  onDiamondClick?: () => void;
  onGoldClick?: () => void;
  profilePlaystyleIcon?: string;
  profilePlaystyleLabel?: string;
  currentLevel?: number;
  momentumPercent?: number;
  diamondBalance?: number;
  goldBalance?: number;
};

export function GameBoardOverlay({
  isOpen,
  onClose,
  onPlayClick,
  onTopbarClick,
  onSpinWinClick,
  onHeartsGameplayClick,
  onDailyHatchClick,
  onBankClick,
  onDiamondClick,
  onGoldClick,
  profilePlaystyleIcon,
  profilePlaystyleLabel,
  currentLevel = 1,
  momentumPercent = 0,
  diamondBalance = 0,
  goldBalance = 0,
}: GameBoardOverlayProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

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
            <div className="game-board-overlay__icon-item">
              <button
                type="button"
                className="game-board-overlay__icon-button"
                onClick={onSpinWinClick}
                aria-label="Open Spin & Win"
              >
                <div className="game-board-overlay__icon-placeholder" />
              </button>
              <span className="game-board-overlay__icon-timer">1d 23m</span>
            </div>
            <div className="game-board-overlay__icon-item">
              <button
                type="button"
                className="game-board-overlay__icon-button"
                onClick={onHeartsGameplayClick}
                aria-label="Open Hearts gameplay"
              >
                <div className="game-board-overlay__icon-placeholder" />
              </button>
              <span className="game-board-overlay__icon-timer">2h 15m</span>
            </div>
            <div className="game-board-overlay__icon-item">
              <button
                type="button"
                className="game-board-overlay__icon-button"
                onClick={onDailyHatchClick}
                aria-label="Open Daily Hatch calendar"
              >
                <div className="game-board-overlay__icon-placeholder" />
              </button>
              <span className="game-board-overlay__icon-timer">45m</span>
            </div>
          </div>

          {/* Right Side Icons */}
          <div className="game-board-overlay__side-icons game-board-overlay__side-icons--right">
            <div className="game-board-overlay__right-icon-item">
              <button
                type="button"
                className="game-board-overlay__icon-button game-board-overlay__icon-button--right"
                onClick={onBankClick}
                aria-label="Open bank tab"
              >
                <img src={boardIconsRight1} alt="Bank" className="game-board-overlay__icons-image" />
              </button>
              <span className="game-board-overlay__icon-counter">Bank</span>
            </div>
            <div className="game-board-overlay__right-icon-item">
              <button
                type="button"
                className="game-board-overlay__icon-button game-board-overlay__icon-button--right"
                onClick={onDiamondClick}
                aria-label="Open garage tab"
              >
                <img src={boardIconsRight2} alt="Diamonds" className="game-board-overlay__icons-image" />
              </button>
              <span className="game-board-overlay__icon-counter">{diamondBalance.toLocaleString()}</span>
            </div>
            <div className="game-board-overlay__right-icon-item">
              <button
                type="button"
                className="game-board-overlay__icon-button game-board-overlay__icon-button--right"
                onClick={onGoldClick}
                aria-label="Open player shop tab"
              >
                <img src={boardIconsRight3} alt="Gold" className="game-board-overlay__icons-image" />
              </button>
              <span className="game-board-overlay__icon-counter">{goldBalance.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
