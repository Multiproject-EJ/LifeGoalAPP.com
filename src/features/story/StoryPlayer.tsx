import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { OPPOSITE_DIRECTION, type StoryDirection, type StoryPanel } from './storyTypes';
import './StoryPlayer.css';

interface StoryPlayerProps {
  panels: StoryPanel[];
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  /** Called when advancing past the final scene. Falls back to onClose. */
  onComplete?: () => void;
  completionLabel?: string;
  /** Travel direction used when a scene doesn't specify its own `advance`. */
  defaultAdvance?: StoryDirection;
}

const SWIPE_THRESHOLD = 45;

const ARROW_GLYPH: Record<StoryDirection, string> = {
  left: '‹',
  right: '›',
  up: '⌃',
  down: '⌄',
};

/**
 * Shared, content-agnostic story player. Discrete scenes advanced by a Next
 * button, directional swipe (any of 4 directions), or keyboard. A hovering
 * arrow hint points the way the story travels next — following the "bullet" of
 * the previous scene's exit so the narrative merges with the physical swipe.
 *
 * The same engine drives the island-game story and the vision-board story;
 * only the `panels` differ.
 */
export function StoryPlayer({
  panels,
  isOpen,
  onClose,
  title,
  onComplete,
  completionLabel = 'Finish',
  defaultAdvance = 'right',
}: StoryPlayerProps) {
  const [index, setIndex] = useState(0);
  const [travelDir, setTravelDir] = useState<StoryDirection>(defaultAdvance);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  // Reset to the first scene whenever the player (re)opens or content changes.
  useEffect(() => {
    if (isOpen) {
      setIndex(0);
      setTravelDir(defaultAdvance);
    }
  }, [isOpen, panels, defaultAdvance]);

  const total = panels.length;
  const safeIndex = Math.min(Math.max(index, 0), Math.max(total - 1, 0));
  const panel = panels[safeIndex];
  const isLast = safeIndex >= total - 1;
  const nextDir: StoryDirection = panel?.advance ?? defaultAdvance;

  const goNext = useCallback(
    (dir: StoryDirection) => {
      if (total === 0) return;
      if (safeIndex >= total - 1) {
        if (onComplete) onComplete();
        else onClose();
        return;
      }
      setTravelDir(dir);
      setIndex(safeIndex + 1);
    },
    [safeIndex, total, onComplete, onClose],
  );

  const goPrev = useCallback(
    (dir: StoryDirection) => {
      if (safeIndex <= 0) return;
      setTravelDir(dir);
      setIndex(safeIndex - 1);
    },
    [safeIndex],
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowRight':
        case ' ':
          event.preventDefault();
          goNext('left');
          break;
        case 'ArrowLeft':
          goPrev('right');
          break;
        case 'ArrowUp':
          goPrev('down');
          break;
        case 'ArrowDown':
          event.preventDefault();
          goNext('up');
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, goNext, goPrev]);

  if (!isOpen || total === 0 || !panel) {
    return null;
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;

    if (Math.abs(dx) >= Math.abs(dy)) {
      // Horizontal swipe: left advances, right goes back.
      if (dx < 0) goNext('left');
      else goPrev('right');
    } else {
      // Vertical swipe: up advances, down goes back.
      if (dy < 0) goNext('up');
      else goPrev('down');
    }
  };

  // A scene entering after travelling `travelDir` slides in from the opposite side.
  const enterFrom = OPPOSITE_DIRECTION[travelDir];

  return (
    <div className="story-player" role="dialog" aria-modal="true" aria-label={title ?? 'Story'}>
      <header className="story-player__header">
        <div className="story-player__meta">
          {title && <p className="story-player__eyebrow">{title}</p>}
          <span className="story-player__counter">
            {safeIndex + 1} / {total}
          </span>
        </div>
        <button type="button" className="story-player__close" onClick={onClose} aria-label="Close story">
          ×
        </button>
      </header>

      <div
        className="story-player__stage"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <div
          key={safeIndex}
          className={`story-player__scene story-player__scene--from-${enterFrom}`}
        >
          {panel.type === 'image' && (
            <img
              className="story-player__media"
              src={panel.src}
              alt={panel.alt ?? panel.caption ?? ''}
              draggable={false}
            />
          )}
          {panel.type === 'video' && (
            <video
              className="story-player__media"
              src={panel.src}
              poster={panel.poster}
              controls
              playsInline
              loop={panel.loop}
              autoPlay={panel.mutedAutoplay}
              muted={panel.mutedAutoplay}
            />
          )}
          {panel.type === 'text' && (
            <div className="story-player__text">
              <p>{panel.text}</p>
            </div>
          )}
          {panel.caption && panel.type !== 'text' && (
            <p className="story-player__caption">{panel.caption}</p>
          )}
        </div>

        {/* Directional arrow hint — points where the story travels next. */}
        {!isLast && (
          <button
            type="button"
            className={`story-player__arrow story-player__arrow--${nextDir}`}
            onClick={() => goNext(nextDir)}
            aria-label="Next scene"
          >
            {ARROW_GLYPH[nextDir]}
          </button>
        )}
      </div>

      <footer className="story-player__footer">
        <button
          type="button"
          className="story-player__nav"
          onClick={() => goPrev('right')}
          disabled={safeIndex === 0}
        >
          Back
        </button>
        <div className="story-player__dots" aria-hidden>
          {panels.map((scenePanel, dotIndex) => (
            <span
              key={scenePanel.id ?? dotIndex}
              className={`story-player__dot ${dotIndex === safeIndex ? 'story-player__dot--active' : ''}`}
            />
          ))}
        </div>
        <button
          type="button"
          className="story-player__nav story-player__nav--primary"
          onClick={() => goNext(nextDir)}
        >
          {isLast ? completionLabel : 'Next'}
        </button>
      </footer>
    </div>
  );
}
