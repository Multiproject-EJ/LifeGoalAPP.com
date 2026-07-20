import { useCallback, useEffect, useRef, useState } from 'react';
import './GiftBoxOpeningAnimation.css';

export const GIFT_BOX_OPENING_ASSET = {
  webm: '/assets/animations/gift-box-opening.webm',
  mov: '/assets/animations/gift-box-opening.mov',
  durationMs: 2550,
} as const;

export interface GiftBoxOpeningAnimationProps {
  active?: boolean;
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

function preferredSource(): string {
  if (typeof document === 'undefined') return GIFT_BOX_OPENING_ASSET.webm;
  const probe = document.createElement('video');
  return probe.canPlayType('video/quicktime; codecs="hvc1"') !== ''
    ? GIFT_BOX_OPENING_ASSET.mov
    : GIFT_BOX_OPENING_ASSET.webm;
}

/** Warm only the compact source this browser can play before a reward is opened. */
export function preloadGiftBoxOpeningAnimation(): void {
  if (typeof window === 'undefined' || prefersReducedMotion()) return;
  void fetch(preferredSource(), { cache: 'force-cache' }).catch(() => undefined);
}

export function GiftBoxOpeningAnimation({
  active = true,
  className = '',
  onComplete,
}: GiftBoxOpeningAnimationProps) {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current?.();
  }, []);

  useEffect(() => {
    const query = reducedMotionQuery();
    if (!query) return undefined;
    const update = () => setReducedMotion(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    completedRef.current = false;
  }, [active]);

  useEffect(() => {
    if (!active) return undefined;
    if (reducedMotion) {
      complete();
      return undefined;
    }

    // onEnded is authoritative. The fallback ensures a codec/load failure can
    // never trap someone between a reward being granted and seeing its result.
    const fallbackId = window.setTimeout(complete, GIFT_BOX_OPENING_ASSET.durationMs + 900);
    return () => window.clearTimeout(fallbackId);
  }, [active, complete, reducedMotion]);

  if (!active) return null;

  return (
    <div
      className={['gift-box-opening-animation', className].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
      aria-label="Opening gift"
    >
      {!reducedMotion ? (
        <video
          className="gift-box-opening-animation__video"
          autoPlay
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          controlsList="nodownload noplaybackrate"
          onEnded={complete}
          onError={complete}
        >
          <source src={GIFT_BOX_OPENING_ASSET.mov} type='video/quicktime; codecs="hvc1"' />
          <source src={GIFT_BOX_OPENING_ASSET.webm} type='video/webm; codecs="vp9"' />
        </video>
      ) : null}
      <span className="gift-box-opening-animation__label">Opening your gift…</span>
    </div>
  );
}
