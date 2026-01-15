import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

export type CelebrationAnimationProps = {
  type: 'habit' | 'journal' | 'action' | 'levelup';
  xpAmount?: number;
  targetElement?: 'game-icon' | 'fab-button';
  onComplete?: () => void;
};

type IconConfig = {
  icons: string[];
  count: number;
  target: 'game-icon' | 'fab-button' | 'none';
};

type IconInstance = {
  id: string;
  icon: string;
  x: number;
  y: number;
  delay: number;
};

const ICON_CONFIGS: Record<CelebrationAnimationProps['type'], IconConfig> = {
  habit: {
    icons: ['✅', '⭐', '🎯', '💪', '🔥'],
    count: 10,
    target: 'game-icon',
  },
  journal: {
    icons: ['📔', '✍️', '📝', '💭', '✨'],
    count: 8,
    target: 'fab-button',
  },
  action: {
    icons: ['⚡', '✨', '💫', '🚀', '💥'],
    count: 8,
    target: 'fab-button',
  },
  levelup: {
    icons: ['🎉', '🏆', '⭐', '🌟', '💎', '👑', '🎊', '✨'],
    count: 25,
    target: 'game-icon',
  },
};

const getRandomIcon = (icons: string[]): string => {
  return icons[Math.floor(Math.random() * icons.length)];
};

const getRandomPosition = (): { x: number; y: number } => {
  // Generate random positions across the viewport
  const x = Math.random() * (window.innerWidth - 100) + 50;
  const y = Math.random() * (window.innerHeight - 100) + 50;
  return { x, y };
};

const getTargetPosition = (targetElement: 'game-icon' | 'fab-button' | 'none'): { x: number; y: number } | null => {
  if (targetElement === 'none') return null;

  let element: HTMLElement | null = null;

  if (targetElement === 'game-icon') {
    // Try to find the mobile footer nav status card (game icon)
    element = document.querySelector('.mobile-footer-nav__status-card');
  } else if (targetElement === 'fab-button') {
    // Try to find the FAB button
    element = document.querySelector('.quick-actions-fab__toggle');
    if (!element) {
      // Fallback to any FAB-related element
      element = document.querySelector('[class*="quick-actions-fab"]');
    }
  }

  if (element) {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  // Fallback to center of screen if target not found
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  };
};

export function CelebrationAnimation({
  type,
  xpAmount,
  targetElement: targetElementProp,
  onComplete,
}: CelebrationAnimationProps) {
  const [icons, setIcons] = useState<IconInstance[]>([]);
  const [showXP, setShowXP] = useState(true);
  const [isFlying, setIsFlying] = useState(false);
  const [targetPulsing, setTargetPulsing] = useState(false);

  const config = ICON_CONFIGS[type];
  const targetElement = targetElementProp ?? config.target;

  const cleanup = useCallback(() => {
    setIcons([]);
    setShowXP(false);
    setIsFlying(false);
    setTargetPulsing(false);
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    // Generate random icons
    const newIcons: IconInstance[] = [];
    for (let i = 0; i < config.count; i++) {
      const position = getRandomPosition();
      newIcons.push({
        id: `icon-${i}-${Date.now()}`,
        icon: getRandomIcon(config.icons),
        x: position.x,
        y: position.y,
        delay: Math.random() * 200, // Stagger the pop-in animations
      });
    }
    setIcons(newIcons);

    // After 1 second, start flying animation
    const flyTimeout = setTimeout(() => {
      setIsFlying(true);
      setTargetPulsing(true);
    }, 1000);

    // Hide XP after 1.8 seconds
    const xpTimeout = setTimeout(() => {
      setShowXP(false);
    }, 1800);

    // Clean up after animations complete (2 seconds total)
    const cleanupTimeout = setTimeout(() => {
      cleanup();
    }, 2000);

    return () => {
      clearTimeout(flyTimeout);
      clearTimeout(xpTimeout);
      clearTimeout(cleanupTimeout);
    };
  }, [config, cleanup]);

  // Add pulse class to target element
  useEffect(() => {
    if (!targetPulsing) return;

    let element: HTMLElement | null = null;
    if (targetElement === 'game-icon') {
      element = document.querySelector('.mobile-footer-nav__status-card');
    } else if (targetElement === 'fab-button') {
      element = document.querySelector('.quick-actions-fab__toggle');
    }

    if (element) {
      element.classList.add('collecting-icons');
      const timeout = setTimeout(() => {
        element?.classList.remove('collecting-icons');
      }, 300);
      return () => {
        clearTimeout(timeout);
        element?.classList.remove('collecting-icons');
      };
    }
  }, [targetPulsing, targetElement]);

  const targetPos = isFlying ? getTargetPosition(targetElement) : null;

  return createPortal(
    <>
      {/* XP Indicator */}
      {showXP && xpAmount && (
        <div className={`celebration-xp ${type === 'levelup' ? 'celebration-xp--levelup' : ''}`}>
          +{xpAmount} XP
        </div>
      )}

      {/* Celebration Icons */}
      {icons.map((iconInstance) => {
        const style: React.CSSProperties = {
          left: `${iconInstance.x}px`,
          top: `${iconInstance.y}px`,
          animationDelay: `${iconInstance.delay}ms`,
        };

        if (isFlying && targetPos) {
          style.left = `${targetPos.x}px`;
          style.top = `${targetPos.y}px`;
          style.transform = 'scale(0.1)';
          style.opacity = '0';
        }

        return (
          <div
            key={iconInstance.id}
            className={`celebration-icon ${isFlying ? 'celebration-icon--flying' : ''}`}
            style={style}
          >
            {iconInstance.icon}
          </div>
        );
      })}
    </>,
    document.body
  );
}
