import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  COMPASS_ICON_BUBBLE_MS,
  COMPASS_ICON_IDLE_TRANSFORM_MS,
  compassInsightMessage,
  nextCompassNudgeDelayMs,
} from '../services/compassBookIconCue';
import './compass-book-icon.css';

type Phase = 'compass' | 'dust-in' | 'book' | 'dust-out';

const DUST_MS = 650;
const BOOK_HOLD_MS = 2_600;
const DUST = Array.from({ length: 10 }, (_, index) => index);

type Props = {
  islandNumber: number;
  /** True while the current island's Compass fragment is still unopened. */
  hasInsight: boolean;
};

/**
 * A living compass that now and then swirls into magic dust, becomes the
 * Compass Book, opens with a glow and turns back. New insights make the book
 * glow and pop a tiny message that fades away again.
 */
export function CompassBookIcon({ islandNumber, hasInsight }: Props) {
  const [phase, setPhase] = useState<Phase>('compass');
  const [bubble, setBubble] = useState<{ id: number; text: string } | null>(null);
  const timers = useRef<number[]>([]);
  const busy = useRef(false);

  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  const transform = (message?: string) => {
    if (busy.current) return;
    busy.current = true;
    setPhase('dust-in');
    later(() => {
      setPhase('book');
      if (message) setBubble({ id: Date.now(), text: message });
    }, DUST_MS);
    later(() => setPhase('dust-out'), DUST_MS + Math.max(BOOK_HOLD_MS, message ? COMPASS_ICON_BUBBLE_MS : 0));
    later(() => { setPhase('compass'); setBubble(null); busy.current = false; },
      DUST_MS * 2 + Math.max(BOOK_HOLD_MS, message ? COMPASS_ICON_BUBBLE_MS : 0));
  };
  const transformRef = useRef(transform);
  transformRef.current = transform;

  useEffect(() => () => { timers.current.forEach((id) => window.clearTimeout(id)); timers.current = []; }, []);

  // Idle rhythm: the compass occasionally shows it is really a book.
  useEffect(() => {
    if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = window.setInterval(() => transformRef.current(), COMPASS_ICON_IDLE_TRANSFORM_MS);
    return () => window.clearInterval(id);
  }, []);

  // Insight nudges: a few friendly pops per island, then just the glow.
  useEffect(() => {
    if (!hasInsight) return undefined;
    let shown = 0;
    let id = 0;
    const schedule = () => {
      const delay = nextCompassNudgeDelayMs(shown);
      if (delay === null) return;
      id = window.setTimeout(() => {
        transformRef.current(compassInsightMessage(islandNumber, shown));
        shown += 1;
        schedule();
      }, delay);
    };
    schedule();
    return () => window.clearTimeout(id);
  }, [hasInsight, islandNumber]);

  return (
    <span className={`compass-book-icon compass-book-icon--${phase}${hasInsight ? ' compass-book-icon--insight' : ''}`} aria-hidden="true">
      <span className="compass-book-icon__compass">
        <span className="compass-book-icon__face" />
      </span>
      <span className="compass-book-icon__book">
        <span className="compass-book-icon__cover compass-book-icon__cover--left" />
        <span className="compass-book-icon__pages">
          <span className="compass-book-icon__page compass-book-icon__page--l" />
          <span className="compass-book-icon__page compass-book-icon__page--r" />
        </span>
        <span className="compass-book-icon__cover compass-book-icon__cover--right" />
        <span className="compass-book-icon__sigil">✦</span>
      </span>
      <span className="compass-book-icon__dust">
        {DUST.map((index) => <i key={index} style={{ '--i': index } as CSSProperties} />)}
      </span>
      {hasInsight && <span className="compass-book-icon__dot" />}
      {bubble && <span key={bubble.id} className="compass-book-icon__bubble">{bubble.text}</span>}
    </span>
  );
}
