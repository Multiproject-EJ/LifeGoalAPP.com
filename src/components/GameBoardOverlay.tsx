import { useEffect, useState } from 'react';
import boardTopbar from '../assets/board_topbar.webp';
import boardMatchbar from '../assets/board_matchbar.webp';
import boardIconsRight from '../assets/board_icons_right.webp';
import boardController from '../assets/board_controller.webp';
import '../styles/game-board-overlay.css';

type GameBoardOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function GameBoardOverlay({ isOpen, onClose }: GameBoardOverlayProps) {
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
        {/* Top Bar */}
        <div className="game-board-overlay__topbar">
          <img src={boardTopbar} alt="Game board top bar" className="game-board-overlay__topbar-image" />
        </div>

        {/* Middle Section with Match Bar and Side Icons */}
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

          {/* Center Match Bar */}
          <div className="game-board-overlay__matchbar">
            <img src={boardMatchbar} alt="Match progress bar" className="game-board-overlay__matchbar-image" />
          </div>

          {/* Right Side Icons */}
          <div className="game-board-overlay__side-icons game-board-overlay__side-icons--right">
            <img src={boardIconsRight} alt="Game board right icons" className="game-board-overlay__icons-image" />
          </div>
        </div>

        {/* Bottom Controller */}
        <div className="game-board-overlay__controller">
          <img src={boardController} alt="Game controller" className="game-board-overlay__controller-image" />
        </div>
      </div>
    </div>
  );
}
