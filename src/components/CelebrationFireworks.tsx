import { useEffect, useRef, useState } from 'react';
import './CelebrationFireworks.css';

export type FireworksVariant = 'rapid' | 'hero' | 'capstone';
export type FireworksBackdrop = 'none' | 'adaptive' | 'hero';
export type FireworksPlacement = 'local' | 'viewport';

type FireworksAsset = {
  webm: string;
  mov: string;
  durationMs: number;
};

export const FIREWORKS_ASSETS: Record<FireworksVariant, FireworksAsset> = {
  rapid: {
    webm: '/assets/animations/fireworks-rapid.webm',
    mov: '/assets/animations/fireworks-rapid.mov',
    durationMs: 3600,
  },
  hero: {
    webm: '/assets/animations/fireworks-hero.webm',
    mov: '/assets/animations/fireworks-hero.mov',
    durationMs: 5300,
  },
  capstone: {
    webm: '/assets/animations/fireworks-capstone.webm',
    mov: '/assets/animations/fireworks-capstone.mov',
    durationMs: 7900,
  },
};

export interface CelebrationFireworksProps {
  active?: boolean;
  variant?: FireworksVariant;
  backdrop?: FireworksBackdrop;
  placement?: FireworksPlacement;
  fit?: 'cover' | 'contain';
  className?: string;
  onComplete?: () => void;
}

function reducedMotionQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia('(prefers-reduced-motion: reduce)');
}

function prefersReducedMotion(): boolean {
  return reducedMotionQuery()?.matches ?? false;
}

function preferredSource(asset: FireworksAsset): string {
  if (typeof document === 'undefined') return asset.webm;
  const probe = document.createElement('video');
  const supportsHevcAlpha = probe.canPlayType('video/quicktime; codecs="hvc1"') !== '';
  return supportsHevcAlpha ? asset.mov : asset.webm;
}

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

type NetworkNavigator = Navigator & {
  connection?: { saveData?: boolean };
};

/**
 * Warm only the frequent celebration after first paint. Native Capacitor builds
 * already ship the file locally; on the PWA this primes the browser/SW cache
 * without adding the heavier hero and capstone variants to the startup path.
 */
export function scheduleRapidFireworksPreload(): () => void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return () => undefined;
  if (prefersReducedMotion() || (navigator as NetworkNavigator).connection?.saveData) return () => undefined;

  const idleWindow = window as IdleWindow;
  let cancelled = false;
  const preload = () => {
    if (cancelled) return;
    void fetch(preferredSource(FIREWORKS_ASSETS.rapid), { cache: 'force-cache' }).catch(() => undefined);
  };

  if (idleWindow.requestIdleCallback) {
    const handle = idleWindow.requestIdleCallback(preload, { timeout: 3000 });
    return () => {
      cancelled = true;
      idleWindow.cancelIdleCallback?.(handle);
    };
  }

  const handle = window.setTimeout(preload, 1600);
  return () => {
    cancelled = true;
    window.clearTimeout(handle);
  };
}

export function CelebrationFireworks({
  active = true,
  variant = 'rapid',
  backdrop = 'none',
  placement = 'local',
  fit = 'cover',
  className = '',
  onComplete,
}: CelebrationFireworksProps) {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const completedRef = useRef(false);

  useEffect(() => {
    const query = reducedMotionQuery();
    if (!query) return undefined;
    const update = () => setReducedMotion(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    completedRef.current = false;
  }, [active, variant]);

  useEffect(() => {
    if (!active || !reducedMotion || completedRef.current) return;
    completedRef.current = true;
    onComplete?.();
  }, [active, onComplete, reducedMotion]);

  if (!active) return null;

  const asset = FIREWORKS_ASSETS[variant];
  const classes = [
    'celebration-fireworks',
    `celebration-fireworks--${variant}`,
    `celebration-fireworks--${placement}`,
    className,
  ].filter(Boolean).join(' ');

  const handleComplete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete?.();
  };

  return (
    <div
      className={classes}
      aria-hidden="true"
      style={{ '--celebration-fireworks-fit': fit } as React.CSSProperties}
    >
      {backdrop !== 'none' ? (
        <div className={`celebration-fireworks__backdrop celebration-fireworks__backdrop--${backdrop}`} />
      ) : null}
      {!reducedMotion ? (
        <video
          className="celebration-fireworks__video"
          autoPlay
          muted
          playsInline
          preload={variant === 'rapid' ? 'auto' : 'metadata'}
          disablePictureInPicture
          controlsList="nodownload noplaybackrate"
          onEnded={handleComplete}
          onError={handleComplete}
        >
          <source src={asset.mov} type='video/quicktime; codecs="hvc1"' />
          <source src={asset.webm} type='video/webm; codecs="vp9"' />
        </video>
      ) : null}
    </div>
  );
}
