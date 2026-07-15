import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { createPortal } from 'react-dom';
import { CelebrationFireworks } from './CelebrationFireworks';

export type CelebrationAnimationProps = {
  type: 'habit' | 'journal' | 'action' | 'breathing' | 'levelup' | 'vision';
  xpAmount?: number;
  targetElement?: 'game-icon' | 'fab-button';
  origin?: { x: number; y: number } | null;
  onComplete?: () => void;
};

type CelebrationType = CelebrationAnimationProps['type'];

type ConfettiConfig = {
  particleCount: number;
  spread: number;
  startVelocity: number;
  scalar: number;
  ticks: number;
  colors: string[];
  target: 'game-icon' | 'fab-button';
  cleanupDelay: number;
  pulseDelay: number;
  backdropFadeIn?: number;
  xpFadeIn?: number;
  xpHideDelay?: number;
  backdropFadeOut?: number;
};

// DOM element selectors
const SELECTORS = {
  GAME_ICON: '.mobile-footer-nav__status-card',
  FAB_BUTTON: '.quick-actions-fab__toggle',
  FAB_FALLBACK: '[class*="quick-actions-fab"]',
} as const;

const CONFETTI_CONFIGS: Record<CelebrationType, ConfettiConfig> = {
  habit: {
    particleCount: 28,
    spread: 52,
    startVelocity: 24,
    scalar: 0.7,
    ticks: 80,
    colors: ['#facc15', '#f97316', '#fde68a', '#38bdf8'],
    target: 'game-icon',
    cleanupDelay: 700,
    pulseDelay: 120,
  },
  journal: {
    particleCount: 64,
    spread: 68,
    startVelocity: 32,
    scalar: 0.85,
    ticks: 120,
    colors: ['#c084fc', '#a78bfa', '#f9a8d4', '#fef3c7', '#ffffff'],
    target: 'fab-button',
    cleanupDelay: 2600,
    pulseDelay: 850,
    backdropFadeIn: 120,
    xpFadeIn: 220,
    xpHideDelay: 1900,
    backdropFadeOut: 2050,
  },
  action: {
    particleCount: 26,
    spread: 48,
    startVelocity: 23,
    scalar: 0.68,
    ticks: 80,
    colors: ['#60a5fa', '#22d3ee', '#bfdbfe', '#ffffff'],
    target: 'fab-button',
    cleanupDelay: 700,
    pulseDelay: 120,
  },
  breathing: {
    particleCount: 58,
    spread: 76,
    startVelocity: 26,
    scalar: 0.78,
    ticks: 140,
    colors: ['#7dd3fc', '#67e8f9', '#a7f3d0', '#dbeafe', '#ffffff'],
    target: 'game-icon',
    cleanupDelay: 2600,
    pulseDelay: 900,
    backdropFadeIn: 120,
    xpFadeIn: 240,
    xpHideDelay: 1900,
    backdropFadeOut: 2050,
  },
  levelup: {
    particleCount: 150,
    spread: 92,
    startVelocity: 42,
    scalar: 1,
    ticks: 180,
    colors: ['#facc15', '#f97316', '#38bdf8', '#a78bfa', '#f472b6', '#ffffff'],
    target: 'game-icon',
    cleanupDelay: 5400,
    pulseDelay: 1150,
    backdropFadeIn: 120,
    xpFadeIn: 260,
    xpHideDelay: 3000,
    backdropFadeOut: 4650,
  },
  vision: {
    particleCount: 78,
    spread: 74,
    startVelocity: 34,
    scalar: 0.88,
    ticks: 135,
    colors: ['#60a5fa', '#38bdf8', '#facc15', '#fef3c7', '#ffffff'],
    target: 'game-icon',
    cleanupDelay: 2800,
    pulseDelay: 900,
    backdropFadeIn: 120,
    xpFadeIn: 240,
    xpHideDelay: 2050,
    backdropFadeOut: 2200,
  },
};

const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const getTargetPosition = (targetElement: 'game-icon' | 'fab-button'): { x: number; y: number } | null => {
  if (typeof window === 'undefined') return null;

  let element: HTMLElement | null = null;

  if (targetElement === 'game-icon') {
    element = document.querySelector(SELECTORS.GAME_ICON);
  } else {
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

  // Fallback to the lower-middle area where mobile reward UI usually appears.
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight * 0.72,
  };
};

const toConfettiOrigin = (position: { x: number; y: number }) => {
  if (typeof window === 'undefined') {
    return { x: 0.5, y: 0.6 };
  }

  return {
    x: Math.min(Math.max(position.x / window.innerWidth, 0), 1),
    y: Math.min(Math.max(position.y / window.innerHeight, 0), 1),
  };
};

const fireConfetti = (
  type: CelebrationType,
  config: ConfettiConfig,
  originPosition: { x: number; y: number },
) => {
  const origin = toConfettiOrigin(originPosition);
  const baseOptions = {
    colors: config.colors,
    disableForReducedMotion: true,
    origin,
    scalar: config.scalar,
    spread: config.spread,
    startVelocity: config.startVelocity,
    ticks: config.ticks,
    zIndex: 9998,
  };

  if (type === 'levelup') {
    void confetti({
      ...baseOptions,
      particleCount: Math.round(config.particleCount * 0.55),
      spread: 96,
      origin: { x: 0.5, y: Math.min(origin.y, 0.72) },
    });

    window.setTimeout(() => {
      void confetti({
        ...baseOptions,
        particleCount: Math.round(config.particleCount * 0.25),
        angle: 60,
        spread: 62,
        origin: { x: 0, y: 0.72 },
      });
      void confetti({
        ...baseOptions,
        particleCount: Math.round(config.particleCount * 0.25),
        angle: 120,
        spread: 62,
        origin: { x: 1, y: 0.72 },
      });
    }, 180);

    return;
  }

  void confetti({
    ...baseOptions,
    particleCount: config.particleCount,
  });
};

export function CelebrationAnimation({
  type,
  xpAmount,
  targetElement: targetElementProp,
  origin,
  onComplete,
}: CelebrationAnimationProps) {
  const [showXP, setShowXP] = useState(false);
  const [showBackdrop, setShowBackdrop] = useState(false);
  const [backdropFadingOut, setBackdropFadingOut] = useState(false);
  const [targetPulsing, setTargetPulsing] = useState(false);
  const onCompleteRef = useRef(onComplete);
  const animationStartedRef = useRef(false);

  const config = CONFETTI_CONFIGS[type];
  const allowBackdrop = type !== 'habit' && type !== 'action';
  const allowXP = type !== 'habit' && type !== 'action';
  const targetElement = targetElementProp ?? config.target;

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const cleanup = useCallback(() => {
    setShowXP(false);
    setShowBackdrop(false);
    setBackdropFadingOut(false);
    setTargetPulsing(false);
    onCompleteRef.current?.();
  }, []);

  useEffect(() => {
    if (animationStartedRef.current) {
      return;
    }
    animationStartedRef.current = true;

    const targetPosition = getTargetPosition(targetElement);
    const originPosition = origin ?? targetPosition ?? {
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.72,
    };

    if (!prefersReducedMotion() && type !== 'levelup') {
      fireConfetti(type, config, originPosition);
    }

    const backdropTimeout = allowBackdrop && config.backdropFadeIn !== undefined
      ? window.setTimeout(() => {
        setShowBackdrop(true);
      }, config.backdropFadeIn)
      : null;

    const xpShowTimeout = allowXP && config.xpFadeIn !== undefined
      ? window.setTimeout(() => {
        setShowXP(true);
      }, config.xpFadeIn)
      : null;

    const pulseTimeout = window.setTimeout(() => {
      setTargetPulsing(true);
    }, config.pulseDelay);

    const backdropFadeOutTimeout = allowBackdrop && config.backdropFadeOut !== undefined
      ? window.setTimeout(() => {
        setBackdropFadingOut(true);
      }, config.backdropFadeOut)
      : null;

    const xpTimeout = allowXP && config.xpHideDelay !== undefined
      ? window.setTimeout(() => {
        setShowXP(false);
      }, config.xpHideDelay)
      : null;

    const cleanupTimeout = window.setTimeout(() => {
      cleanup();
    }, config.cleanupDelay);

    // Hard-stop guard so celebrations can never linger if parent renders frequently.
    const hardStopTimeout = window.setTimeout(() => {
      cleanup();
    }, Math.max(config.cleanupDelay + 250, 3500));

    return () => {
      if (backdropTimeout !== null) {
        window.clearTimeout(backdropTimeout);
      }
      if (xpShowTimeout !== null) {
        window.clearTimeout(xpShowTimeout);
      }
      window.clearTimeout(pulseTimeout);
      if (backdropFadeOutTimeout !== null) {
        window.clearTimeout(backdropFadeOutTimeout);
      }
      if (xpTimeout !== null) {
        window.clearTimeout(xpTimeout);
      }
      window.clearTimeout(cleanupTimeout);
      window.clearTimeout(hardStopTimeout);
    };
  }, [allowBackdrop, allowXP, cleanup, config, origin, targetElement, type]);

  // Add pulse class to target element after the burst lands.
  useEffect(() => {
    if (!targetPulsing) return;

    let element: HTMLElement | null = null;
    if (targetElement === 'game-icon') {
      element = document.querySelector(SELECTORS.GAME_ICON);
    } else {
      element = document.querySelector(SELECTORS.FAB_BUTTON);
    }

    const timeout = window.setTimeout(() => {
      element?.classList.remove('collecting-icons');
    }, 300);

    if (element) {
      element.classList.add('collecting-icons');
    }

    return () => {
      window.clearTimeout(timeout);
      element?.classList.remove('collecting-icons');
    };
  }, [targetPulsing, targetElement]);

  const xpOrigin = showXP ? getTargetPosition(targetElement) : null;
  const xpStyle: React.CSSProperties | undefined = xpOrigin
    ? { left: `${xpOrigin.x}px`, top: `${xpOrigin.y}px` }
    : undefined;

  return createPortal(
    <>
      {/* Dimmed backdrop - mutes the background for larger reward moments. */}
      {showBackdrop && allowBackdrop && (
        <div
          className={`celebration-backdrop ${
            type === 'levelup' ? 'celebration-backdrop--levelup' : ''
          } ${
            backdropFadingOut ? 'celebration-backdrop--fading-out' : ''
          }`}
        />
      )}

      {type === 'levelup' ? (
        <CelebrationFireworks
          variant="hero"
          placement="viewport"
          className="celebration-fireworks--level-up"
        />
      ) : null}

      {/* XP indicator - retained while the heavy emoji swarm is replaced by canvas confetti. */}
      {showXP && allowXP && xpAmount ? (
        <div
          className={`celebration-xp ${type === 'levelup' ? 'celebration-xp--levelup' : ''}`}
          style={xpStyle}
        >
          <span className="celebration-xp__value">+{xpAmount}</span>
          <span className="celebration-xp__label">XP</span>
        </div>
      ) : null}
    </>,
    document.body,
  );
}
