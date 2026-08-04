import { useEffect, useState } from 'react';

type EntranceArtworkOptions = {
  enabled?: boolean;
  maxWaitMs?: number;
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isFirstLightThemeActive = () =>
  typeof document !== 'undefined'
  && document.querySelector('[data-theme="first-light-kingdom"]') !== null;

const decodeImage = async (source: string) => {
  const image = new Image();
  image.src = source;

  if (typeof image.decode === 'function') {
    await image.decode().catch(() => undefined);
    return;
  }

  await new Promise<void>((resolve) => {
    if (image.complete) {
      resolve();
      return;
    }
    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener('error', () => resolve(), { once: true });
  });
};

/**
 * Lets the themed background paint first, then reveals entrance motion only
 * after its artwork has decoded. A timeout keeps navigation resilient if an
 * asset is unavailable, while the double RAF gives the browser a quiet paint
 * before composited movement begins.
 */
export function useEntranceArtworkReady(
  sources: readonly string[],
  { enabled = true, maxWaitMs = 1600 }: EntranceArtworkOptions = {},
) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let firstFrame = 0;
    let secondFrame = 0;
    let timeoutId = 0;
    let revealScheduled = false;

    const reveal = () => {
      if (cancelled || revealScheduled) return;
      revealScheduled = true;
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          if (!cancelled) setIsReady(true);
        });
      });
    };

    setIsReady(false);

    if (!enabled || prefersReducedMotion() || !isFirstLightThemeActive()) {
      setIsReady(true);
      return () => {
        cancelled = true;
      };
    }

    timeoutId = window.setTimeout(reveal, maxWaitMs);
    void Promise.allSettled(sources.map((source) => decodeImage(source))).then(() => {
      window.clearTimeout(timeoutId);
      reveal();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [enabled, maxWaitMs, sources]);

  return isReady;
}
