import React from 'react';
import { useLazyImage } from './useLazyImage.ts';

/** Options used for all secondary world-asset lazy loads. */
const LAZY_OPTIONS: IntersectionObserverInit = { rootMargin: '200px' };

export interface LazyImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  /** Optional low-quality placeholder shown while the real image loads. */
  placeholderSrc?: string;
}

/**
 * LazyImage — renders a secondary world asset that is only loaded once it
 * approaches the viewport, via IntersectionObserver.
 *
 * CSS classes applied:
 *  - `wh-img--lazy`          always (drives the fade-in transition)
 *  - `wh-img--loaded`        once the image has finished loading
 *
 * The fade-in transition is suppressed when the user has
 * `prefers-reduced-motion: reduce` set (handled in world.css).
 */
export function LazyImage({
  src,
  alt,
  width,
  height,
  className,
  placeholderSrc,
}: LazyImageProps) {
  const { ref, loaded } = useLazyImage(src, LAZY_OPTIONS);

  const classes = [
    'wh-img--lazy',
    loaded ? 'wh-img--loaded' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <img
      ref={ref}
      alt={alt}
      width={width}
      height={height}
      className={classes}
      src={placeholderSrc}
      aria-hidden={alt === '' ? 'true' : undefined}
      decoding="async"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}
