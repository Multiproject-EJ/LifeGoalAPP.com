import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { lockFullscreenPageScroll } from '../../utils/scrollLock';
import {
  CREATOR_STORY_BEATS,
  creatorStoryBeatDurationMs,
  creatorStoryLineDelayMs,
  type CreatorStoryScene,
} from './creatorStoryBeats';
import './creator-story.css';

type CreatorStoryProps = {
  onClose: () => void;
  /** Opens the plain-text note (kept one tap away at the end). */
  onReadFullNote?: () => void;
  founderName?: string;
  /** Start on a given beat (dev preview). */
  initialBeat?: number;
};

const HOLD_TO_PAUSE_MS = 220;
const WHEEL_AREAS = ['Health', 'Purpose', 'Relationships', 'Growth', 'Money', 'Energy', 'Joy', 'Direction'];
const WHEEL_COLORS = ['#34d399', '#a78bfa', '#f472b6', '#60a5fa', '#facc15', '#fb923c', '#f87171', '#22d3ee'];

function StoryScene({ scene }: { scene: CreatorStoryScene }) {
  switch (scene) {
    case 'spark':
      return (
        <div className="cs-scene cs-spark">
          <span className="cs-spark__core" />
          {Array.from({ length: 10 }, (_, i) => <i key={i} style={{ '--i': i } as CSSProperties} />)}
        </div>
      );
    case 'checklist':
    case 'storm':
      return (
        <div className={`cs-scene cs-list${scene === 'storm' ? ' cs-list--storm' : ''}`}>
          {scene === 'storm' ? (
            <span className="cs-rain">{Array.from({ length: 26 }, (_, i) => <i key={i} style={{ '--i': i } as CSSProperties} />)}</span>
          ) : null}
          <div className="cs-list__card">
            {['Wake at 6', 'Run 5k', 'Read 30 min', 'Meditate', 'Journal'].map((item, i) => (
              <span key={item} className="cs-list__row" style={{ '--i': i } as CSSProperties}>
                <b className="cs-list__tick">✓</b>{item}
              </span>
            ))}
          </div>
        </div>
      );
    case 'doubt':
      return (
        <div className="cs-scene cs-doubt">
          <span className="cs-doubt__streak">🔥 0</span>
          <span className="cs-doubt__crack" />
          <span className="cs-doubt__label">streak lost</span>
        </div>
      );
    case 'island':
      return (
        <div className="cs-scene cs-island">
          <span className="cs-island__sun" />
          <span className="cs-island__land">
            {Array.from({ length: 5 }, (_, i) => <i key={i} className="cs-island__tree" style={{ '--i': i } as CSSProperties} />)}
            {Array.from({ length: 4 }, (_, i) => <b key={i} className="cs-island__light" style={{ '--i': i } as CSSProperties} />)}
          </span>
          <span className="cs-island__sea" />
        </div>
      );
    case 'quest':
      return (
        <div className="cs-scene cs-quest">
          <span className="cs-quest__path" />
          {[['🌱', 'Habits'], ['🎯', 'Goals'], ['📓', 'Reflections']].map(([icon, label], i) => (
            <span key={label} className="cs-quest__orb" style={{ '--i': i } as CSSProperties}>
              <b>{icon}</b><small>{label}</small>
            </span>
          ))}
          <span className="cs-quest__star">✦</span>
        </div>
      );
    case 'wheel': {
      const r = 40;
      const c = 2 * Math.PI * r;
      return (
        <div className="cs-scene cs-wheel">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            {WHEEL_AREAS.map((area, i) => (
              <circle
                key={area}
                cx="50"
                cy="50"
                r={r}
                style={{ '--i': i, stroke: WHEEL_COLORS[i] } as CSSProperties}
                strokeDasharray={`${c / 8 - 1.6} ${c}`}
                transform={`rotate(${i * 45 - 90} 50 50)`}
              />
            ))}
          </svg>
          {WHEEL_AREAS.map((area, i) => (
            <small key={area} className="cs-wheel__label" style={{ '--i': i, '--a': `${i * 45 + 22.5 - 90}deg` } as CSSProperties}>{area}</small>
          ))}
          <span className="cs-wheel__core">✦</span>
        </div>
      );
    }
    case 'steps':
      return (
        <div className="cs-scene cs-steps">
          {['🌱', '📓', '↺', '⭐', '🧭'].map((icon, i) => (
            <span key={icon} className="cs-steps__stone" style={{ '--i': i, '--x': `${i % 2 === 0 ? -18 : 18}%` } as CSSProperties}>{icon}</span>
          ))}
        </div>
      );
    case 'living':
      return (
        <div className="cs-scene cs-living">
          <span className="cs-living__lane cs-living__lane--life" />
          <span className="cs-living__lane cs-living__lane--game" />
          <span className="cs-living__bridge" />
          <span className="cs-living__spark cs-living__spark--life" />
          <span className="cs-living__spark cs-living__spark--game" />
          <span className="cs-living__core">✦</span>
        </div>
      );
    case 'demo':
      return (
        <div className="cs-scene cs-demo">
          {([['Live', 12, 12], ['Preview', 52, 12], ['Building', 12, 36], ['Building', 52, 36]] as const).map(([tag, left, bottom], i) => (
            <span
              key={i}
              className={`cs-demo__block cs-demo__block--${tag.toLowerCase()}`}
              style={{ '--i': i, left: `${left}%`, bottom: `${bottom}%` } as CSSProperties}
            >
              {tag}
            </span>
          ))}
          <span className="cs-demo__crane"><i /></span>
        </div>
      );
    case 'shape':
      return (
        <div className="cs-scene cs-shape">
          {Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--i': i } as CSSProperties} />)}
          <span className="cs-shape__core">✦</span>
        </div>
      );
    case 'thanks':
      return (
        <div className="cs-scene cs-thanks">
          <span className="cs-thanks__sun" />
          <span className="cs-thanks__horizon" />
        </div>
      );
    default:
      return null;
  }
}

/**
 * The creator note as a full-screen portrait story: tap right/left to move,
 * hold to pause, each beat auto-advances when its progress segment fills.
 */
export function CreatorStory({ onClose, onReadFullNote, founderName = 'EJ', initialBeat = 0 }: CreatorStoryProps) {
  const [index, setIndex] = useState(() => Math.min(Math.max(0, initialBeat), CREATOR_STORY_BEATS.length - 1));
  const [paused, setPaused] = useState(false);
  const holdTimer = useRef<number | null>(null);
  const heldRef = useRef(false);
  const beat = CREATOR_STORY_BEATS[index];
  const isLast = index === CREATOR_STORY_BEATS.length - 1;
  const duration = creatorStoryBeatDurationMs(beat);

  useEffect(() => lockFullscreenPageScroll(), []);

  const next = useCallback(() => setIndex((current) => Math.min(current + 1, CREATOR_STORY_BEATS.length - 1)), []);
  const back = useCallback(() => setIndex((current) => Math.max(current - 1, 0)), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight' || event.key === ' ') next();
      else if (event.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [back, next, onClose]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    heldRef.current = false;
    holdTimer.current = window.setTimeout(() => {
      heldRef.current = true;
      setPaused(true);
    }, HOLD_TO_PAUSE_MS);
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    if (heldRef.current) {
      setPaused(false);
      return;
    }
    const x = event.clientX / Math.max(1, window.innerWidth);
    if (x < 0.3) back();
    else next();
  };

  const content = (
    <div
      className={`creator-story${paused ? ' creator-story--paused' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="A note from the creator"
      style={{ '--mood-a': beat.mood[0], '--mood-b': beat.mood[1] } as CSSProperties}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setPaused(false)}
    >
      <div className="creator-story__bg" aria-hidden="true" />
      <div className="creator-story__progress" aria-hidden="true">
        {CREATOR_STORY_BEATS.map((item, i) => (
          <span key={item.id} className="creator-story__segment">
            <i
              key={i === index ? `active-${index}` : item.id}
              className={i < index ? 'is-done' : i === index ? 'is-active' : undefined}
              style={i === index ? { animationDuration: `${duration}ms` } : undefined}
              onAnimationEnd={i === index && !isLast ? next : undefined}
            />
          </span>
        ))}
      </div>
      <div className="creator-story__top">
        <span className="creator-story__byline">A note from the creator</span>
        <button type="button" className="creator-story__close" onClick={onClose} aria-label="Close the creator story">✕</button>
      </div>

      <div className="creator-story__stage" key={beat.id}>
        <StoryScene scene={beat.scene} />
        <div className="creator-story__words" aria-live="polite">
          {beat.lines.map((line, lineIndex) => (
            <p
              key={lineIndex}
              className={`creator-story__line${beat.lines.length > 2 ? ' creator-story__line--stack' : ''}`}
              style={{ animationDelay: `${creatorStoryLineDelayMs(beat, lineIndex)}ms` }}
            >
              {line}
            </p>
          ))}
          {beat.whisper ? (
            <p className="creator-story__whisper" style={{ animationDelay: `${creatorStoryLineDelayMs(beat, beat.lines.length - 1) + 900}ms` }}>
              {beat.whisper}
            </p>
          ) : null}
          {isLast ? (
            <>
              <p className="creator-story__signature">— {founderName}</p>
              <div className="creator-story__actions">
                <button type="button" className="creator-story__primary" onClick={onClose}>Let’s begin</button>
                {onReadFullNote ? (
                  <button type="button" className="creator-story__secondary" onClick={onReadFullNote}>Read the full note</button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
      <p className="creator-story__hint" aria-hidden="true">Tap to continue · hold to pause</p>
    </div>
  );

  return typeof document === 'undefined' ? content : createPortal(content, document.body);
}
