import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
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
  rewards?: readonly GiftBoxRewardItem[];
}

export interface GiftBoxRewardItem {
  id: string;
  icon: string;
  /** Short visual value only, for example "500". */
  amount: string;
  /** Complete spoken description, for example "500 Dice". */
  accessibleLabel: string;
}

function reducedMotionQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia('(prefers-reduced-motion: reduce)');
}

function prefersReducedMotion(): boolean {
  return reducedMotionQuery()?.matches ?? false;
}

function preferredSource(): string {
  if (typeof document === 'undefined' || typeof navigator === 'undefined') return GIFT_BOX_OPENING_ASSET.webm;
  const probe = document.createElement('video');
  const userAgent = navigator.userAgent;
  const isAppleWebKit = /AppleWebKit/i.test(userAgent)
    && !/(Chrome|Chromium|CriOS|Edg|EdgiOS|FxiOS|OPR|OPiOS)/i.test(userAgent);
  return isAppleWebKit && probe.canPlayType('video/quicktime; codecs="hvc1"') !== ''
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
  rewards = [],
}: GiftBoxOpeningAnimationProps) {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [started, setStarted] = useState(false);
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
    if (source === GIFT_BOX_OPENING_ASSET.mov) {
      setStarted(false);
      setSource(GIFT_BOX_OPENING_ASSET.webm);
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
    setStarted(false);
    setSource(preferredSource());
  }, [active]);

  useEffect(() => {
    if (!active) return undefined;
    if (reducedMotion) {
      const reducedMotionId = window.setTimeout(complete, rewards.length > 0 ? 900 : 0);
      return () => window.clearTimeout(reducedMotionId);
    }

    // onEnded is authoritative. The fallback ensures a codec/load failure can
    // never trap someone between a reward being granted and seeing its result.
    const fallbackId = window.setTimeout(complete, GIFT_BOX_OPENING_ASSET.durationMs + 900);
    return () => window.clearTimeout(fallbackId);
  }, [active, complete, reducedMotion, rewards.length, source]);

  if (!active) return null;

  // Three rewards fit the 2.55-second lid motion with distinct one-by-one pops.
  const visibleRewards = rewards.slice(0, 3);
  const rewardSpacing = Math.min(86, 280 / Math.max(visibleRewards.length, 1));
  const spokenRewards = visibleRewards.map((reward) => reward.accessibleLabel).join(', ');

  return (
    <div
      className={[
        'gift-box-opening-animation',
        started ? 'gift-box-opening-animation--started' : '',
        visibleRewards.length > 0 ? 'gift-box-opening-animation--with-rewards' : '',
        className,
      ].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
      aria-label={spokenRewards ? `Opening gift: ${spokenRewards}` : 'Opening gift'}
    >
      {visibleRewards.length > 0 ? (
        <div className="gift-box-opening-animation__rewards" aria-hidden="true">
          {visibleRewards.map((reward, index) => {
            const offset = (index - (visibleRewards.length - 1) / 2) * rewardSpacing;
            const style = {
              '--gift-reward-x': `${offset}px`,
              '--gift-reward-delay': `${920 + index * 320}ms`,
            } as CSSProperties;
            return (
              <div key={reward.id} className="gift-box-opening-animation__reward" style={style}>
                <span className="gift-box-opening-animation__reward-icon">{reward.icon}</span>
                <strong className="gift-box-opening-animation__reward-amount">{reward.amount}</strong>
              </div>
            );
          })}
        </div>
      ) : null}
      {!reducedMotion ? (
        <video
          key={source}
          className="gift-box-opening-animation__video"
          autoPlay
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          controlsList="nodownload noplaybackrate"
          onPlaying={() => setStarted(true)}
          onEnded={complete}
          onError={handlePlaybackError}
        >
          <source
            src={source}
            type={source === GIFT_BOX_OPENING_ASSET.mov
              ? 'video/quicktime; codecs="hvc1"'
              : 'video/webm; codecs="vp9"'}
          />
        </video>
      ) : null}
      {visibleRewards.length === 0 ? (
        <span className="gift-box-opening-animation__label">Opening your gift…</span>
      ) : null}
    </div>
  );
}
