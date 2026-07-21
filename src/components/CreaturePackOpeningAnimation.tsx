import { useCallback, useEffect, useRef, useState } from 'react';
import './CreaturePackOpeningAnimation.css';

export const CREATURE_PACK_OPENING_ASSET = {
  webm: '/assets/animations/creature-pack-opening.webm',
  mov: '/assets/animations/creature-pack-opening.mov',
  durationMs: 3200,
} as const;

export interface CreaturePackOpeningAnimationProps {
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
  if (typeof document === 'undefined' || typeof navigator === 'undefined') return CREATURE_PACK_OPENING_ASSET.webm;
  const probe = document.createElement('video');
  const userAgent = navigator.userAgent;
  const isAppleWebKit = /AppleWebKit/i.test(userAgent)
    && !/(Chrome|Chromium|CriOS|Edg|EdgiOS|FxiOS|OPR|OPiOS)/i.test(userAgent);
  return isAppleWebKit && probe.canPlayType('video/quicktime; codecs="hvc1"') !== ''
    ? CREATURE_PACK_OPENING_ASSET.mov
    : CREATURE_PACK_OPENING_ASSET.webm;
}

/** Warm the one compact source appropriate for this browser when a pack modal appears. */
export function preloadCreaturePackOpeningAnimation(): void {
  if (typeof window === 'undefined' || prefersReducedMotion()) return;
  void fetch(preferredSource(), { cache: 'force-cache' }).catch(() => undefined);
}

export function CreaturePackOpeningAnimation({
  active = true,
  className = '',
  onComplete,
}: CreaturePackOpeningAnimationProps) {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [source, setSource] = useState(preferredSource);
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

  const handlePlaybackError = useCallback(() => {
    if (source === CREATURE_PACK_OPENING_ASSET.mov) {
      setSource(CREATURE_PACK_OPENING_ASSET.webm);
      return;
    }
    complete();
  }, [complete, source]);

  useEffect(() => {
    const query = reducedMotionQuery();
    if (!query) return undefined;
    const update = () => setReducedMotion(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    completedRef.current = false;
    setSource(preferredSource());
  }, [active]);

  useEffect(() => {
    if (!active) return undefined;
    if (reducedMotion) {
      complete();
      return undefined;
    }

    // onEnded is authoritative; this fallback prevents a codec/load failure
    // from trapping the player between a granted pack and its reveal screen.
    const fallbackId = window.setTimeout(complete, CREATURE_PACK_OPENING_ASSET.durationMs + 900);
    return () => window.clearTimeout(fallbackId);
  }, [active, complete, reducedMotion, source]);

  if (!active) return null;

  return (
    <div
      className={['creature-pack-opening-animation', className].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
      aria-label="Opening five-card creature pack"
    >
      {!reducedMotion ? (
        <video
          key={source}
          className="creature-pack-opening-animation__video"
          autoPlay
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          controlsList="nodownload noplaybackrate"
          onEnded={complete}
          onError={handlePlaybackError}
        >
          <source
            src={source}
            type={source === CREATURE_PACK_OPENING_ASSET.mov
              ? 'video/quicktime; codecs="hvc1"'
              : 'video/webm; codecs="vp9"'}
          />
        </video>
      ) : null}
      <span className="creature-pack-opening-animation__label">Opening your five-card creature pack…</span>
    </div>
  );
}
