import { useEffect, useRef, useState } from 'react';

/**
 * Lazy-loads an image via IntersectionObserver.
 * Sets the `src` on the image element only when it enters the viewport,
 * enabling deferred loading of secondary world assets.
 */
export function useLazyImage(
  src: string,
  options?: IntersectionObserverInit,
): { ref: React.RefObject<HTMLImageElement>; loaded: boolean } {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Graceful fallback: if IntersectionObserver is unavailable, load immediately.
    if (typeof IntersectionObserver === 'undefined') {
      el.src = src;
      const handleLoad = () => setLoaded(true);
      el.addEventListener('load', handleLoad, { once: true });
      if (el.complete) setLoaded(true);
      return () => el.removeEventListener('load', handleLoad);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          el.src = src;
          const handleLoad = () => setLoaded(true);
          el.addEventListener('load', handleLoad, { once: true });
          if (el.complete && el.naturalWidth > 0) setLoaded(true);
          observer.disconnect();
        }
      },
      options,
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [src, options]);

  return { ref, loaded };
}
