import React from 'react';

export type UsctCollectionAmount = 'small' | 'medium' | 'large';

export interface UsctCollectionAnimationProps {
  amount?: UsctCollectionAmount;
  originRef?: React.RefObject<HTMLElement | null>;
  targetRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

type Geometry = {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
};

type UsctParticleStyle = React.CSSProperties & {
  '--usct-delay': string;
  '--usct-duration': string;
  '--usct-size': string;
  '--usct-launch-x': string;
  '--usct-launch-y': string;
  '--usct-arc-x': string;
  '--usct-arc-y': string;
  '--usct-target-x': string;
  '--usct-target-y': string;
  '--usct-spin': string;
};

const USCT_TOKEN_ART = '/assets/currency/usct-token.webp';
const PARTICLE_COUNT: Record<UsctCollectionAmount, number> = {
  small: 6,
  medium: 12,
  large: 20,
};

const DEFAULT_GEOMETRY: Geometry = {
  startX: 0,
  startY: 0,
  targetX: 0,
  targetY: 0,
};

function resolveElementCenter(element: HTMLElement | null | undefined): { x: number; y: number } | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function UsctCollectionAnimation({
  amount = 'medium',
  originRef,
  targetRef,
  className = '',
}: UsctCollectionAnimationProps): React.JSX.Element {
  const [geometry, setGeometry] = React.useState<Geometry>(DEFAULT_GEOMETRY);

  React.useLayoutEffect(() => {
    const fallbackStart = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.62,
    };
    const fallbackTarget = {
      x: window.innerWidth - 44,
      y: Math.max(36, window.innerHeight * 0.055),
    };
    const start = resolveElementCenter(originRef?.current) ?? fallbackStart;
    const target = resolveElementCenter(targetRef?.current) ?? fallbackTarget;
    setGeometry({ startX: start.x, startY: start.y, targetX: target.x, targetY: target.y });

    const targetElement = targetRef?.current;
    const pulseDelay = amount === 'large' ? 920 : amount === 'medium' ? 700 : 510;
    const pulseTimer = window.setTimeout(() => {
      targetElement?.classList.add('island-run-usct-wallet-target--receiving');
    }, pulseDelay);
    const clearTimer = window.setTimeout(() => {
      targetElement?.classList.remove('island-run-usct-wallet-target--receiving');
    }, pulseDelay + 720);

    return () => {
      window.clearTimeout(pulseTimer);
      window.clearTimeout(clearTimer);
      targetElement?.classList.remove('island-run-usct-wallet-target--receiving');
    };
  }, [amount, originRef, targetRef]);

  const count = PARTICLE_COUNT[amount];
  const deltaX = geometry.targetX - geometry.startX;
  const deltaY = geometry.targetY - geometry.startY;

  return (
    <div
      className={`island-run-usct-collection island-run-usct-collection--${amount}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
      style={{ left: geometry.startX, top: geometry.startY }}
    >
      {Array.from({ length: count }, (_, index) => {
        const alternating = index % 2 === 0 ? 1 : -1;
        const lane = (index % 5) - 2;
        const spread = amount === 'large' ? 78 : amount === 'medium' ? 58 : 38;
        const launchX = lane * spread * 0.42 + alternating * (18 + (index % 3) * 8);
        const launchY = -30 - (index % 4) * 17 + Math.floor(index / 5) * 7;
        const arcX = deltaX * (0.42 + (index % 4) * 0.035) + launchX * 1.35;
        const arcY = deltaY * 0.38 - 74 - (index % 5) * 12;
        const baseSize = amount === 'large' ? 42 : amount === 'medium' ? 34 : 27;
        const style: UsctParticleStyle = {
          '--usct-delay': `${index * (amount === 'large' ? 34 : amount === 'medium' ? 40 : 48)}ms`,
          '--usct-duration': `${amount === 'large' ? 1080 : amount === 'medium' ? 890 : 700}ms`,
          '--usct-size': `${baseSize + (index % 3) * 5}px`,
          '--usct-launch-x': `${launchX}px`,
          '--usct-launch-y': `${launchY}px`,
          '--usct-arc-x': `${arcX}px`,
          '--usct-arc-y': `${arcY}px`,
          '--usct-target-x': `${deltaX}px`,
          '--usct-target-y': `${deltaY}px`,
          '--usct-spin': `${alternating * (720 + (index % 4) * 180)}deg`,
        };
        return (
          <span className="island-run-usct-collection__particle" style={style} key={index}>
            <img src={USCT_TOKEN_ART} alt="" />
            {index % 4 === 0 ? <i /> : null}
          </span>
        );
      })}
    </div>
  );
}
