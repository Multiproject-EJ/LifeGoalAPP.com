// Achievement Toast - Animated notification for achievements and level-ups

import { useEffect, useState } from 'react';
import type { GamificationNotification } from '../types/gamification';
import { TIER_COLORS } from '../types/gamification';

interface AchievementToastProps {
  notification: GamificationNotification;
  onDismiss: (id: string) => void;
}

export function AchievementToast({ notification, onDismiss }: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setIsVisible(true), 50);

    // Auto-dismiss after 5 seconds
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => clearTimeout(dismissTimer);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300);
  };

  const getTierColor = () => {
    // Default to gold if no specific tier
    return TIER_COLORS.gold.border;
  };

  const toastClassName = `achievement-toast ${isVisible ? 'achievement-toast--visible' : ''} ${
    isExiting ? 'achievement-toast--exiting' : ''
  } achievement-toast--${notification.notification_type}`;

  return (
    <div className={toastClassName} role="alert" aria-live="polite">
      <button
        className="achievement-toast__close"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
      >
        ✕
      </button>

      <div className="achievement-toast__content">
        {notification.icon && (
          <div className="achievement-toast__icon">{notification.icon}</div>
        )}

        <div className="achievement-toast__text">
          <h3 className="achievement-toast__title">{notification.title}</h3>
          <p className="achievement-toast__message">{notification.message}</p>

          {notification.xp_reward !== null && notification.xp_reward > 0 && (
            <div className="achievement-toast__reward">
              +{notification.xp_reward} XP
            </div>
          )}
        </div>
      </div>

      {/* Confetti animation for achievements */}
      {notification.notification_type === 'achievement_unlock' && (
        <div className="achievement-toast__confetti">
          <span className="confetti-piece">🎉</span>
          <span className="confetti-piece">✨</span>
          <span className="confetti-piece">⭐</span>
          <span className="confetti-piece">🌟</span>
          <span className="confetti-piece">💫</span>
        </div>
      )}
    </div>
  );
}
