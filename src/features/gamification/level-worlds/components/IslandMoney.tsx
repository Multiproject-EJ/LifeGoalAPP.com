import React, { type CSSProperties } from 'react';
import {
  getIslandMoneyPaletteId,
  type IslandMoneyNoteTone,
  type IslandMoneyPaletteId,
} from '../services/islandMoneyThemes';
import './IslandMoney.css';

export type IslandMoneyCollectionAmount = 'small' | 'medium' | 'large';

type MoneyParticleStyle = CSSProperties & {
  '--money-delay': string;
  '--money-duration': string;
  '--money-launch-x': string;
  '--money-launch-y': string;
  '--money-fan-x': string;
  '--money-fan-y': string;
  '--money-swirl-x-a': string;
  '--money-swirl-y-a': string;
  '--money-swirl-x-b': string;
  '--money-swirl-y-b': string;
  '--money-stream-x': string;
  '--money-stream-y': string;
  '--money-near-target-x': string;
  '--money-near-target-y': string;
  '--money-target-x': string;
  '--money-target-y': string;
  '--money-roll': string;
  '--money-size': string;
};

type CashWashStyle = CSSProperties & {
  '--money-win-delay': string;
  '--money-win-drift': string;
  '--money-win-duration': string;
  '--money-win-left': string;
  '--money-win-size': string;
  '--money-win-spin': string;
};

type Geometry = {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
};

type JackpotNote = {
  delay: number;
  drift: number;
  duration: number;
  gem: string;
  metal: string;
  phase: number;
  spin: number;
  width: number;
  x: number;
};

const NOTE_TONES: IslandMoneyNoteTone[] = [0, 1, 2, 3];
const PARTICLE_COUNT: Record<IslandMoneyCollectionAmount, number> = {
  small: 8,
  medium: 12,
  large: 18,
};
const DEFAULT_GEOMETRY: Geometry = { startX: 0, startY: 0, targetX: 0, targetY: 0 };

const CASH_WASH_STYLES: CashWashStyle[] = Array.from({ length: 54 }, (_, index) => ({
  '--money-win-delay': `${(index % 14) * 68 + Math.floor(index / 14) * 130}ms`,
  '--money-win-drift': `${((index * 41) % 230) - 115}px`,
  '--money-win-duration': `${1780 + (index % 7) * 115}ms`,
  '--money-win-left': `${3 + ((index * 37) % 95)}%`,
  '--money-win-size': `${46 + (index % 5) * 7}px`,
  '--money-win-spin': `${(index % 2 === 0 ? 1 : -1) * (250 + (index % 6) * 75)}deg`,
}));

function resolveElementCenter(element: HTMLElement | null | undefined): { x: number; y: number } | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function IslandMoneyNote({
  islandNumber,
  paletteId,
  tone = 0,
  className = '',
}: {
  islandNumber?: number;
  paletteId?: IslandMoneyPaletteId;
  tone?: IslandMoneyNoteTone;
  className?: string;
}): React.JSX.Element {
  const resolvedPalette = paletteId ?? getIslandMoneyPaletteId(islandNumber ?? 1);
  return (
    <span
      className={`island-money-note island-money-note--palette-${resolvedPalette} island-money-note--tone-${tone}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      <i />
      <b />
      <em>40</em>
      <span className="island-money-note__curl" />
    </span>
  );
}

function buildParticleStyle(index: number, count: number, geometry: Geometry, amount: IslandMoneyCollectionAmount): MoneyParticleStyle {
  const deltaX = geometry.targetX - geometry.startX;
  const deltaY = geometry.targetY - geometry.startY;
  const alternating = index % 2 === 0 ? 1 : -1;
  const fan = count <= 1 ? 0 : (index / (count - 1)) * 2 - 1;
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  const radius = 58 + (index % 3) * 13;
  const angleB = angle + alternating * 1.72;
  const duration = amount === 'large' ? 1760 : amount === 'medium' ? 1640 : 1480;
  return {
    '--money-delay': `${40 + (index % 6) * 24 + Math.floor(index / 6) * 34}ms`,
    '--money-duration': `${duration + (index % 4) * 34}ms`,
    '--money-launch-x': `${((index % 5) - 2) * 2.4}px`,
    '--money-launch-y': `${-48 - (index % 4) * 7}px`,
    '--money-fan-x': `${fan * (88 + (index % 4) * 9)}px`,
    '--money-fan-y': `${-96 + Math.abs(fan) * 30 - (index % 3) * 7}px`,
    '--money-swirl-x-a': `${(deltaX * 0.18 + Math.cos(angle) * radius).toFixed(1)}px`,
    '--money-swirl-y-a': `${(deltaY * 0.35 + Math.sin(angle) * radius * 0.76).toFixed(1)}px`,
    '--money-swirl-x-b': `${(deltaX * 0.34 + Math.cos(angleB) * (radius + 18)).toFixed(1)}px`,
    '--money-swirl-y-b': `${(deltaY * 0.5 + Math.sin(angleB) * (radius + 18) * 0.62).toFixed(1)}px`,
    '--money-stream-x': `${(deltaX * (0.72 + (index % 3) * 0.035)).toFixed(1)}px`,
    '--money-stream-y': `${(deltaY * (0.72 + (index % 3) * 0.035)).toFixed(1)}px`,
    '--money-near-target-x': `${(deltaX * 0.92).toFixed(1)}px`,
    '--money-near-target-y': `${(deltaY * 0.92).toFixed(1)}px`,
    '--money-target-x': `${deltaX.toFixed(1)}px`,
    '--money-target-y': `${deltaY.toFixed(1)}px`,
    '--money-roll': `${alternating * (210 + (index % 7) * 46)}deg`,
    '--money-size': `${amount === 'large' ? 48 + (index % 4) * 5 : amount === 'medium' ? 40 + (index % 4) * 4 : 34 + (index % 3) * 4}px`,
  };
}

export function IslandMoneyCollectionAnimation({
  islandNumber,
  amount = 'medium',
  originPoint,
  targetRef,
  onComplete,
  className = '',
}: {
  islandNumber: number;
  amount?: IslandMoneyCollectionAmount;
  originPoint?: { x: number; y: number } | null;
  targetRef?: React.RefObject<HTMLElement | null>;
  onComplete?: () => void;
  className?: string;
}): React.JSX.Element {
  const [geometry, setGeometry] = React.useState<Geometry>(DEFAULT_GEOMETRY);
  const onCompleteRef = React.useRef(onComplete);
  const paletteId = getIslandMoneyPaletteId(islandNumber);

  React.useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  React.useLayoutEffect(() => {
    const start = originPoint ?? { x: window.innerWidth * 0.5, y: window.innerHeight * 0.62 };
    const target = resolveElementCenter(targetRef?.current) ?? { x: 76, y: Math.max(36, window.innerHeight * 0.055) };
    setGeometry({ startX: start.x, startY: start.y, targetX: target.x, targetY: target.y });

    const targetElement = targetRef?.current;
    const receiveAt = amount === 'large' ? 1540 : amount === 'medium' ? 1430 : 1290;
    const pulseTimer = window.setTimeout(() => targetElement?.classList.add('island-money-wallet-target--receiving'), receiveAt);
    const clearPulseTimer = window.setTimeout(() => targetElement?.classList.remove('island-money-wallet-target--receiving'), receiveAt + 620);
    const finalDelay = Math.ceil(PARTICLE_COUNT[amount] / 6) * 34 + 5 * 24;
    const duration = amount === 'large' ? 1862 : amount === 'medium' ? 1742 : 1582;
    const completeTimer = window.setTimeout(() => onCompleteRef.current?.(), finalDelay + duration + 100);
    return () => {
      window.clearTimeout(pulseTimer);
      window.clearTimeout(clearPulseTimer);
      window.clearTimeout(completeTimer);
      targetElement?.classList.remove('island-money-wallet-target--receiving');
    };
  }, [amount, originPoint, targetRef]);

  const count = PARTICLE_COUNT[amount];
  return (
    <div
      className={`island-money-collection island-money-collection--${amount}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
      style={{ left: geometry.startX, top: geometry.startY }}
    >
      <div className="island-money-collection__poof">
        {Array.from({ length: 6 }, (_, index) => <i key={index} />)}
      </div>
      {Array.from({ length: count }, (_, index) => (
        <span
          className="island-money-collection__particle"
          style={buildParticleStyle(index, count, geometry, amount)}
          key={index}
        >
          <IslandMoneyNote paletteId={paletteId} tone={NOTE_TONES[index % NOTE_TONES.length]} />
          <i className="island-money-collection__trail" />
        </span>
      ))}
    </div>
  );
}

function jackpotUnit(index: number, salt: number): number {
  const value = Math.sin((index + 1) * (salt * 17.17 + 3.91)) * 43758.5453;
  return value - Math.floor(value);
}

function createJackpotNotes(count: number): JackpotNote[] {
  return Array.from({ length: count }, (_, index) => {
    const isBronze = index % 29 === 0;
    const isSilver = !isBronze && index % 17 === 0;
    return {
      delay: jackpotUnit(index, 1) * 1450,
      drift: (jackpotUnit(index, 2) - 0.5) * 360,
      duration: 2450 + jackpotUnit(index, 3) * 1250,
      gem: isBronze ? '#43e28d' : isSilver ? '#a866ff' : '#3f91ff',
      metal: isBronze ? '#c77b42' : isSilver ? '#dce5f2' : index % 6 === 0 ? '#ffe88a' : '#ffc83e',
      phase: jackpotUnit(index, 4) * Math.PI * 2,
      spin: (index % 2 === 0 ? 1 : -1) * (3.4 + jackpotUnit(index, 5) * 6.2),
      width: 22 + jackpotUnit(index, 6) * 47,
      x: jackpotUnit(index, 7),
    };
  });
}

function drawJackpotBill(
  context: CanvasRenderingContext2D,
  note: JackpotNote,
  x: number,
  y: number,
  rotation: number,
  curl: number,
  opacity: number,
): void {
  const width = note.width;
  const height = width * 0.47;
  context.save();
  context.globalAlpha = opacity;
  context.translate(x, y);
  context.rotate(rotation);
  context.scale(curl, 1);
  context.shadowColor = 'rgba(255, 210, 72, 0.76)';
  context.shadowBlur = Math.min(10, width * 0.14);
  context.beginPath();
  context.roundRect(-width / 2, -height / 2, width, height, Math.max(2, height * 0.1));
  context.fillStyle = note.metal;
  context.fill();
  context.shadowBlur = 0;
  context.strokeStyle = 'rgba(255, 250, 207, 0.76)';
  context.lineWidth = Math.max(0.7, width * 0.018);
  context.stroke();
  context.beginPath();
  context.roundRect(-width * 0.42, -height * 0.34, width * 0.84, height * 0.68, Math.max(1, height * 0.06));
  context.strokeStyle = 'rgba(101, 59, 5, 0.52)';
  context.stroke();
  context.beginPath();
  context.arc(0, 0, Math.max(1.8, height * 0.17), 0, Math.PI * 2);
  context.fillStyle = note.gem;
  context.fill();
  context.strokeStyle = 'rgba(255, 255, 255, 0.82)';
  context.stroke();
  context.restore();
}

function BiggestMoneyWinCanvas(): React.JSX.Element {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const notes = React.useMemo(() => createJackpotNotes(1080), []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cssWidth = 1;
    let cssHeight = 1;
    let animationFrame = 0;
    let lastDrawTime = 0;
    const startTime = performance.now();
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.35);
      cssWidth = Math.max(1, bounds.width);
      cssHeight = Math.max(1, bounds.height);
      canvas.width = Math.round(cssWidth * pixelRatio);
      canvas.height = Math.round(cssHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };
    const draw = (now: number) => {
      if (!reducedMotion && now - lastDrawTime < 25) {
        animationFrame = window.requestAnimationFrame(draw);
        return;
      }
      lastDrawTime = now;
      const elapsed = now - startTime;
      context.clearRect(0, 0, cssWidth, cssHeight);
      notes.forEach((note, index) => {
        if (reducedMotion && index >= 36) return;
        const localTime = reducedMotion ? note.duration * 0.52 : elapsed - note.delay;
        if (localTime < 0 || localTime > note.duration) return;
        const progress = localTime / note.duration;
        const eased = 1 - ((1 - progress) ** 3);
        const opacity = Math.min(1, progress / 0.08, (1 - progress) / 0.12);
        const x = note.x * cssWidth + Math.sin(progress * Math.PI * 2 + note.phase) * note.drift;
        const y = cssHeight + note.width - eased * (cssHeight + note.width * 2.4);
        const curl = 0.58 + Math.abs(Math.cos(progress * Math.PI * 4 + note.phase)) * 0.42;
        drawJackpotBill(context, note, x, y, note.phase + note.spin * progress, curl, opacity);
      });
      if (!reducedMotion && elapsed < 5200) animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    resizeObserver?.observe(canvas);
    if (!resizeObserver) window.addEventListener('resize', resize);
    animationFrame = window.requestAnimationFrame(draw);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [notes]);

  return <canvas ref={canvasRef} className="island-money-celebration__canvas" aria-hidden="true" />;
}

export function IslandMoneyCelebration({
  islandNumber,
  variant = 'big',
}: {
  islandNumber: number;
  variant?: 'big' | 'biggest';
}): React.JSX.Element {
  const paletteId = getIslandMoneyPaletteId(islandNumber);
  return (
    <div className={`island-money-celebration island-money-celebration--${variant}`} aria-hidden="true">
      <div className="island-money-celebration__wash" />
      {variant === 'biggest' ? (
        <BiggestMoneyWinCanvas />
      ) : (
        <div className="island-money-celebration__notes">
          {CASH_WASH_STYLES.map((style, index) => (
            <span className="island-money-celebration__note" style={style} key={index}>
              <IslandMoneyNote paletteId={paletteId} tone={NOTE_TONES[index % NOTE_TONES.length]} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
