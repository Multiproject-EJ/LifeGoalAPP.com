import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../utils/scrollLock';
import {
  OPPOSITE_DIRECTION,
  type StoryDirection,
  type StoryPanel,
  type StorySoundtrackConfig,
} from './storyTypes';
import './StoryPlayer.css';

interface StoryPlayerProps {
  panels: StoryPanel[];
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  /** Called when the final-scene CTA is activated. Falls back to onClose. */
  onComplete?: () => void;
  completionLabel?: string;
  /** Disable the final-scene CTA (e.g. a reward already claimed). */
  completionDisabled?: boolean;
  /** Fallback soundtrack when a scene doesn't declare its own. */
  soundtrack?: StorySoundtrackConfig;
  /** Travel direction used when a scene doesn't specify its own `advance`. */
  defaultAdvance?: StoryDirection;
  /** Extra class on the root, used by consumers to theme via CSS variables. */
  className?: string;
  /** Visible and accessible label for leaving the story. */
  closeLabel?: string;
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
 * only the `panels` (and optional theming via `className`) differ.
 */
export function StoryPlayer({
  panels,
  isOpen,
  onClose,
  title,
  onComplete,
  completionLabel = 'Finish',
  completionDisabled = false,
  soundtrack,
  defaultAdvance = 'right',
  className,
  closeLabel = 'Close',
}: StoryPlayerProps) {
  const [index, setIndex] = useState(0);
  const [travelDir, setTravelDir] = useState<StoryDirection>(defaultAdvance);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // Reset to the first scene whenever the player (re)opens or content changes.
  useEffect(() => {
    if (isOpen) {
      setIndex(0);
      setTravelDir(defaultAdvance);
    }
  }, [isOpen, panels, defaultAdvance]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    previouslyFocusedElementRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const previouslyFocusedElement = previouslyFocusedElementRef.current;
    const unlockPageScroll = lockPageScroll(['body', 'documentElement']);
    return () => {
      unlockPageScroll();
      previouslyFocusedElement?.focus();
      previouslyFocusedElementRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    syncPreference();
    if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', syncPreference);
    else mediaQuery.addListener?.(syncPreference);
    return () => {
      if (mediaQuery.removeEventListener) mediaQuery.removeEventListener('change', syncPreference);
      else mediaQuery.removeListener?.(syncPreference);
    };
  }, []);

  const total = panels.length;
  const safeIndex = Math.min(Math.max(index, 0), Math.max(total - 1, 0));
  const panel = panels[safeIndex];
  const isLast = safeIndex >= total - 1;
  const nextDir: StoryDirection = panel?.advance ?? defaultAdvance;
  const hasAudio = panels.some((scene) => scene.soundtrack?.src) || Boolean(soundtrack?.src);
  const activeSoundtrack = panel?.soundtrack ?? soundtrack ?? null;
  const activePanelMediaKey = panel
    ? (panel.type === 'text' ? panel.text : panel.src)
    : '';

  useEffect(() => {
    setMediaFailed(false);
  }, [safeIndex, activePanelMediaKey]);

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

  // Soundtrack for the active scene (falls back to the story-level track).
  useEffect(() => {
    if (!isOpen || !audioEnabled || !activeSoundtrack?.src) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      return;
    }
    const volume = typeof activeSoundtrack.volume === 'number'
      ? Math.min(1, Math.max(0, activeSoundtrack.volume))
      : 0.65;
    const existing = audioRef.current;
    if (existing && existing.src.endsWith(activeSoundtrack.src)) {
      existing.loop = activeSoundtrack.loop ?? true;
      existing.volume = volume;
      void existing.play().catch(() => {});
      return;
    }
    if (existing) {
      existing.pause();
      existing.currentTime = 0;
    }
    const next = new Audio(activeSoundtrack.src);
    next.loop = activeSoundtrack.loop ?? true;
    next.volume = volume;
    audioRef.current = next;
    void next.play().catch(() => {});
    return () => {
      if (audioRef.current === next) next.pause();
    };
  }, [isOpen, audioEnabled, activeSoundtrack?.src, activeSoundtrack?.loop, activeSoundtrack?.volume]);

  useEffect(() => {
    if (!isOpen && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [isOpen]);

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

  const player = (
    <div
      className={`story-player${className ? ` ${className}` : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Story'}
    >
      <header className="story-player__header">
        <div className="story-player__meta">
          {title && <p className="story-player__eyebrow">{title}</p>}
          <span className="story-player__counter">
            {safeIndex + 1} / {total}
          </span>
        </div>
        <div className="story-player__header-right">
          {hasAudio && (
            <button
              type="button"
              className="story-player__icon-btn"
              onClick={() => setAudioEnabled((value) => !value)}
              aria-label={audioEnabled ? 'Mute story audio' : 'Enable story audio'}
              aria-pressed={audioEnabled}
            >
              {audioEnabled ? '🔊' : '🔇'}
            </button>
          )}
          <button
            type="button"
            className="story-player__icon-btn story-player__close"
            ref={closeButtonRef}
            onClick={onClose}
            aria-label={closeLabel}
          >
            {closeLabel}
          </button>
        </div>
      </header>

      <div
        className="story-player__stage"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <div key={safeIndex} className={`story-player__scene story-player__scene--from-${enterFrom}`}>
          {mediaFailed && panel.type !== 'text' && (
            <div className="story-player__media-fallback" role="img" aria-label={panel.caption ?? 'Story visual unavailable'}>
              <span aria-hidden="true">✦</span>
              <p>Visual unavailable. The story can continue.</p>
            </div>
          )}
          {!mediaFailed && panel.type === 'image' && (
            <img
              className="story-player__media"
              src={panel.src}
              alt={panel.alt ?? panel.caption ?? ''}
              draggable={false}
              onError={() => setMediaFailed(true)}
            />
          )}
          {!mediaFailed && panel.type === 'video' && prefersReducedMotion && panel.poster && (
            <img
              className="story-player__media"
              src={panel.poster}
              alt={panel.caption ?? ''}
              draggable={false}
              onError={() => setMediaFailed(true)}
            />
          )}
          {!mediaFailed && panel.type === 'video' && (!prefersReducedMotion || !panel.poster) && (
            <video
              className="story-player__media"
              src={panel.src}
              poster={panel.poster}
              controls
              playsInline
              loop={panel.loop}
              preload="metadata"
              autoPlay={panel.mutedAutoplay && !prefersReducedMotion}
              muted={panel.mutedAutoplay || !audioEnabled}
              onError={() => setMediaFailed(true)}
            />
          )}
          {panel.type === 'text' && (
            <div className="story-player__text">
              <p>{panel.text}</p>
            </div>
          )}
          {panel.caption && <p className="story-player__caption">{panel.caption}</p>}
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
          disabled={isLast && completionDisabled}
          aria-label={isLast ? completionLabel : 'Next'}
        >
          {isLast ? completionLabel : 'Next'}
        </button>
      </footer>
    </div>
  );

  if (typeof document === 'undefined') return player;
  return createPortal(player, document.body);
}
