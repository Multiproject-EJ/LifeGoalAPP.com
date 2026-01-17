import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

export type CelebrationAnimationProps = {
  type: 'habit' | 'journal' | 'action' | 'breathing' | 'levelup';
  xpAmount?: number;
  targetElement?: 'game-icon' | 'fab-button';
  origin?: { x: number; y: number } | null;
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

// DOM element selectors
const SELECTORS = {
  GAME_ICON: '.mobile-footer-nav__status-card',
  FAB_BUTTON: '.quick-actions-fab__toggle',
  FAB_FALLBACK: '[class*="quick-actions-fab"]',
} as const;

// Animation timing constants
const TIMING = {
  ICON_START_DELAY: 400,      // ms before icons start appearing
  ICON_STAGGER_DELAY: 200,    // ms between each icon appearing
  BACKDROP_FADE_IN: 450,      // ms when backdrop starts fading in
  XP_FADE_IN: 500,            // ms when XP indicator appears
  FLY_START_DELAY: 1200,      // ms before icons start flying
  XP_HIDE_DELAY: 2500,        // ms before XP indicator fades
  BACKDROP_FADE_OUT: 2300,    // ms when backdrop starts fading out
  CLEANUP_DELAY: 3000,        // ms before full cleanup
  PULSE_DURATION: 300,        // ms for target pulse animation
} as const;

const HABIT_TIMING = {
  ICON_START_DELAY: 0,
  ICON_STAGGER_DELAY: 0,
  BACKDROP_FADE_IN: 0,
  XP_FADE_IN: 0,
  FLY_START_DELAY: 80,
  XP_HIDE_DELAY: 0,
  BACKDROP_FADE_OUT: 0,
  CLEANUP_DELAY: 550,
  PULSE_DURATION: 300,
} as const;

const getTiming = (type: CelebrationAnimationProps['type']) =>
  type === 'habit' ? HABIT_TIMING : TIMING;

const ICON_CONFIGS: Record<CelebrationAnimationProps['type'], IconConfig> = {
  habit: {
    icons: ['⚡'],
    count: 9,  // slightly larger swarm for snappy habit feedback
    target: 'game-icon',
  },
  journal: {
    icons: ['📔', '✍️', '📝', '💭', '✨'],
    count: 8,   // 6-10 icons
    target: 'fab-button',
  },
  action: {
    icons: ['⚡', '✨', '💫', '🚀', '💥'],
    count: 8,   // 6-10 icons
    target: 'fab-button',
  },
  breathing: {
    icons: ['🌬️', '🧘', '💨', '🌊', '☁️', '✨', '🕊️', '🍃'],
    count: 10,  // 8-12 icons
    target: 'game-icon',
  },
  levelup: {
    icons: ['🎉', '🏆', '⭐', '🌟', '💎', '👑', '🎊', '✨'],
    count: 25,  // 20-30 icons
    target: 'game-icon',
  },
};

const getRandomIcon = (icons: string[]): string => {
  return icons[Math.floor(Math.random() * icons.length)];
};

const getRandomPosition = (): { x: number; y: number } => {
  // Check if window is available (for SSR safety)
  if (typeof window === 'undefined') {
    return { x: 0, y: 0 };
  }
  
  // Generate random positions across the viewport
  const x = Math.random() * (window.innerWidth - 100) + 50;
  const y = Math.random() * (window.innerHeight - 100) + 50;
  return { x, y };
};

const getTargetPosition = (targetElement: 'game-icon' | 'fab-button' | 'none'): { x: number; y: number } | null => {
  if (typeof window === 'undefined') return null;
  if (targetElement === 'none') return null;

  let element: HTMLElement | null = null;

  if (targetElement === 'game-icon') {
    element = document.querySelector(SELECTORS.GAME_ICON);
  } else if (targetElement === 'fab-button') {
    element = document.querySelector(SELECTORS.FAB_BUTTON);
    if (!element) {
      // Fallback to any FAB-related element
      element = document.querySelector(SELECTORS.FAB_FALLBACK);
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
  origin,
  onComplete,
}: CelebrationAnimationProps) {
  const [icons, setIcons] = useState<IconInstance[]>([]);
  const [showXP, setShowXP] = useState(false);
  const [showBackdrop, setShowBackdrop] = useState(false);
  const [backdropFadingOut, setBackdropFadingOut] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [targetPulsing, setTargetPulsing] = useState(false);

  const config = ICON_CONFIGS[type];
  const timing = getTiming(type);
  const allowBackdrop = type !== 'habit';
  const allowXP = type !== 'habit';
  const targetElement = targetElementProp ?? config.target;

  const cleanup = useCallback(() => {
    setIcons([]);
    setShowXP(false);
    setShowBackdrop(false);
    setBackdropFadingOut(false);
    setIsFlying(false);
    setTargetPulsing(false);
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    // Generate random icons with initial delay
    const newIcons: IconInstance[] = [];
    for (let i = 0; i < config.count; i++) {
      const position = type === 'habit' && origin ? origin : getRandomPosition();
      newIcons.push({
        id: `icon-${i}-${Date.now()}`,
        icon: getRandomIcon(config.icons),
        x: position.x,
        y: position.y,
        delay: timing.ICON_START_DELAY + (Math.random() * timing.ICON_STAGGER_DELAY),
      });
    }
    setIcons(newIcons);

    // Show backdrop at 450ms
    const backdropTimeout = allowBackdrop
      ? setTimeout(() => {
        setShowBackdrop(true);
      }, timing.BACKDROP_FADE_IN)
      : null;

    // Show XP at 500ms
    const xpShowTimeout = allowXP
      ? setTimeout(() => {
        setShowXP(true);
      }, timing.XP_FADE_IN)
      : null;

    // Start flying animation at 1200ms
    const flyTimeout = setTimeout(() => {
      setIsFlying(true);
      setTargetPulsing(true);
    }, timing.FLY_START_DELAY);

    // Start fading out backdrop at 2300ms
    const backdropFadeOutTimeout = allowBackdrop
      ? setTimeout(() => {
        setBackdropFadingOut(true);
      }, timing.BACKDROP_FADE_OUT)
      : null;

    // Hide XP at 2500ms
    const xpTimeout = allowXP
      ? setTimeout(() => {
        setShowXP(false);
      }, timing.XP_HIDE_DELAY)
      : null;

    // Clean up after animations complete at 3000ms
    const cleanupTimeout = setTimeout(() => {
      cleanup();
    }, timing.CLEANUP_DELAY);

    return () => {
      if (backdropTimeout) {
        clearTimeout(backdropTimeout);
      }
      if (xpShowTimeout) {
        clearTimeout(xpShowTimeout);
      }
      clearTimeout(flyTimeout);
      if (backdropFadeOutTimeout) {
        clearTimeout(backdropFadeOutTimeout);
      }
      if (xpTimeout) {
        clearTimeout(xpTimeout);
      }
      clearTimeout(cleanupTimeout);
    };
  }, [config, cleanup, origin, timing, allowBackdrop, allowXP, type]);

  // Add pulse class to target element
  useEffect(() => {
    if (!targetPulsing) return;

    let element: HTMLElement | null = null;
    if (targetElement === 'game-icon') {
      element = document.querySelector(SELECTORS.GAME_ICON);
    } else if (targetElement === 'fab-button') {
      element = document.querySelector(SELECTORS.FAB_BUTTON);
    }

    if (element) {
      element.classList.add('collecting-icons');
      const timeout = setTimeout(() => {
        element?.classList.remove('collecting-icons');
      }, TIMING.PULSE_DURATION);
      return () => {
        clearTimeout(timeout);
        element?.classList.remove('collecting-icons');
      };
    }
  }, [targetPulsing, targetElement]);

  const targetPos = isFlying ? getTargetPosition(targetElement) : null;
  const xpOrigin = showXP ? getTargetPosition(targetElement) : null;
  const xpStyle: React.CSSProperties | undefined = xpOrigin
    ? { left: `${xpOrigin.x}px`, top: `${xpOrigin.y}px` }
    : undefined;

  return createPortal(
    <>
      {/* Dimmed backdrop - mutes the background */}
      {showBackdrop && allowBackdrop && (
        <div 
          className={`celebration-backdrop ${
            type === 'levelup' ? 'celebration-backdrop--levelup' : ''
          } ${
            backdropFadingOut ? 'celebration-backdrop--fading-out' : ''
          }`} 
        />
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
            className={`celebration-icon celebration-icon--${type} ${
              isFlying ? 'celebration-icon--flying' : ''
            }`}
            style={style}
          >
            {iconInstance.icon}
          </div>
        );
      })}

      {/* XP indicator - the star of the show! */}
      {showXP && allowXP && xpAmount && (
        <div
          className={`celebration-xp ${type === 'levelup' ? 'celebration-xp--levelup' : ''}`}
          style={xpStyle}
        >
          <span className="celebration-xp__value">+{xpAmount}</span>
          <span className="celebration-xp__label">XP</span>
        </div>
      )}
    </>,
    document.body
  );
}
