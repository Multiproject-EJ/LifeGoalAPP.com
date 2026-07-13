import { useCallback, useEffect, useState } from 'react';
import type { Database } from '../../lib/database.types';

type VisionImageRow = Database['public']['Tables']['vision_images']['Row'];
type VisionImage = VisionImageRow & { publicUrl: string };

type VisionLightboxProps = {
  images: VisionImage[];
  initialIndex: number;
  onClose: () => void;
};

/**
 * Full-screen image viewer. Owns its own active index and keyboard handling
 * (Left/Right to move, Esc to close); the parent only decides when it is open
 * and which image it opens on.
 */
export function VisionLightbox({ images, initialIndex, onClose }: VisionLightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  // Keep the active index valid if the underlying list shrinks while open.
  const safeIndex = Math.min(Math.max(index, 0), Math.max(images.length - 1, 0));
  const image = images[safeIndex];
  const hasMultiple = images.length > 1;

  const showPrev = useCallback(() => {
    setIndex((current) => (images.length === 0 ? current : (current - 1 + images.length) % images.length));
  }, [images.length]);

  const showNext = useCallback(() => {
    setIndex((current) => (images.length === 0 ? current : (current + 1) % images.length));
  }, [images.length]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowLeft') showPrev();
      else if (event.key === 'ArrowRight') showNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, showPrev, showNext]);

  if (!image) return null;

  return (
    <div
      className="vision-board__lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Vision image viewer"
      onClick={onClose}
    >
      <button
        type="button"
        className="vision-board__lightbox-close"
        onClick={onClose}
        aria-label="Close viewer"
      >
        ×
      </button>
      {hasMultiple && (
        <button
          type="button"
          className="vision-board__lightbox-nav vision-board__lightbox-nav--prev"
          onClick={(event) => {
            event.stopPropagation();
            showPrev();
          }}
          aria-label="Previous image"
        >
          ‹
        </button>
      )}
      <figure className="vision-board__lightbox-figure" onClick={(event) => event.stopPropagation()}>
        {image.publicUrl ? (
          <img
            src={image.publicUrl}
            alt={image.caption ?? 'Vision board entry'}
            className="vision-board__lightbox-image"
          />
        ) : (
          <div className="vision-board__placeholder" aria-hidden>
            <span>No preview</span>
          </div>
        )}
        {image.caption && (
          <figcaption className="vision-board__lightbox-caption">{image.caption}</figcaption>
        )}
        {hasMultiple && (
          <p className="vision-board__lightbox-counter">
            {safeIndex + 1} / {images.length}
          </p>
        )}
      </figure>
      {hasMultiple && (
        <button
          type="button"
          className="vision-board__lightbox-nav vision-board__lightbox-nav--next"
          onClick={(event) => {
            event.stopPropagation();
            showNext();
          }}
          aria-label="Next image"
        >
          ›
        </button>
      )}
    </div>
  );
}
