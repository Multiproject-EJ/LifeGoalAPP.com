import { useEffect, useState } from 'react';
import boardTopbar from '../assets/board_topbar.webp';
import boardMatchbar from '../assets/board_matchbar.webp';
import boardIconsRight1 from '../assets/board_icons_right1.webp';
import boardIconsRight2 from '../assets/board_icons_right2.webp';
import boardIconsRight3 from '../assets/board_icons_right3.webp';
import '../styles/game-board-overlay.css';

type GameBoardOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  onTopbarClick?: () => void;
};

export function GameBoardOverlay({ isOpen, onClose, onTopbarClick }: GameBoardOverlayProps) {
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
        </div>

        {/* Secondary Bar - Previously the topbar, now smaller */}
        <div className="game-board-overlay__secondarybar">
          <img src={boardTopbar} alt="Game board secondary bar" className="game-board-overlay__secondarybar-image" />
        </div>

        {/* Middle Section with Side Icons */}
        <div className="game-board-overlay__middle">
          {/* Left Side Icons - Blue Circle Placeholders */}
          <div className="game-board-overlay__side-icons game-board-overlay__side-icons--left">
            <div className="game-board-overlay__icon-item">
              <div className="game-board-overlay__icon-placeholder" />
              <span className="game-board-overlay__icon-timer">1d 23m</span>
            </div>
            <div className="game-board-overlay__icon-item">
              <div className="game-board-overlay__icon-placeholder" />
              <span className="game-board-overlay__icon-timer">2h 15m</span>
            </div>
            <div className="game-board-overlay__icon-item">
              <div className="game-board-overlay__icon-placeholder" />
              <span className="game-board-overlay__icon-timer">45m</span>
            </div>
          </div>

          {/* Right Side Icons */}
          <div className="game-board-overlay__side-icons game-board-overlay__side-icons--right">
            <img src={boardIconsRight1} alt="Game board right icons 1" className="game-board-overlay__icons-image" />
            <img src={boardIconsRight2} alt="Game board right icons 2" className="game-board-overlay__icons-image" />
            <img src={boardIconsRight3} alt="Game board right icons 3" className="game-board-overlay__icons-image" />
          </div>
        </div>
      </div>
    </div>
  );
}
