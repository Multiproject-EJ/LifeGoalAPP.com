import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CelebrationFireworks, type FireworksVariant } from '../../components/CelebrationFireworks';
import { lockPageScroll } from '../../utils/scrollLock';
import type { TodayStarCount } from './todayStarCelebrationModel';
import './TodayStarUpgradeCelebration.css';

type TodayStarUpgradeCelebrationProps = {
  starCount: TodayStarCount;
  onClose: () => void;
};

const STAR_COPY: Record<TodayStarCount, { eyebrow: string; title: string; message: string; action: string }> = {
  1: {
    eyebrow: 'Today upgraded',
    title: 'Your first star is shining!',
    message: 'You turned intention into motion. That is how a strong day begins.',
    action: 'Keep going',
  },
  2: {
    eyebrow: 'Momentum upgraded',
    title: 'Two-star day!',
    message: 'Solid progress is taking shape. Your next good move can make this day legendary.',
    action: 'Carry the momentum',
  },
  3: {
    eyebrow: 'Daily peak reached',
    title: 'Three-star day!',
    message: 'You reached today’s strongest tier. Pause for a moment and enjoy what you built.',
    action: 'Celebrate the day',
  },
};

const FIREWORKS_BY_STAR: Record<TodayStarCount, FireworksVariant> = {
  1: 'rapid',
  2: 'hero',
  3: 'capstone',
};

const IMAGE_BY_STAR: Record<TodayStarCount, string> = {
  1: '/icons/todays_win/todays_win1.webp',
  2: '/icons/todays_win/todays_win2.webp',
  3: '/icons/todays_win/todays_win3.webp',
};

export function TodayStarUpgradeCelebration({ starCount, onClose }: TodayStarUpgradeCelebrationProps) {
  const copy = STAR_COPY[starCount];

  useEffect(() => {
    return lockPageScroll();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`today-star-upgrade today-star-upgrade--${starCount}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="today-star-upgrade-title"
      aria-describedby="today-star-upgrade-message"
    >
      <CelebrationFireworks
        variant={FIREWORKS_BY_STAR[starCount]}
        backdrop="hero"
        placement="viewport"
        fit="cover"
        className="today-star-upgrade__fireworks"
      />
      <div className="today-star-upgrade__glow" aria-hidden="true" />
      <button
        type="button"
        className="today-star-upgrade__dismiss"
        onClick={onClose}
        aria-label="Close star celebration"
      >
        ×
      </button>
      <section className="today-star-upgrade__card">
        <p className="today-star-upgrade__eyebrow">{copy.eyebrow}</p>
        <div className="today-star-upgrade__hero" aria-hidden="true">
          <img src={IMAGE_BY_STAR[starCount]} alt="" />
          <span className="today-star-upgrade__halo" />
        </div>
        <div className="today-star-upgrade__stars" aria-label={`${starCount} of 3 stars earned today`}>
          {[1, 2, 3].map((star) => (
            <span key={star} className={star <= starCount ? 'is-earned' : ''} aria-hidden="true">★</span>
          ))}
        </div>
        <h2 id="today-star-upgrade-title">{copy.title}</h2>
        <p id="today-star-upgrade-message" className="today-star-upgrade__message">{copy.message}</p>
        <button type="button" className="today-star-upgrade__continue" onClick={onClose} autoFocus>
          {copy.action}
        </button>
      </section>
    </div>,
    document.body,
  );
}
