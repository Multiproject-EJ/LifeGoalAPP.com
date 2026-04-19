import { useEffect, useRef, useState } from 'react';

/**
 * StatDriftNumbers — floating "+N" delta tokens anchored to a stat chip.
 *
 * Watches a numeric value (e.g. the essence balance) and, whenever it
 * increases, spawns a small floating label that drifts upward and fades out.
 * Purely decorative: `aria-hidden`, `pointerEvents: none`.
 *
 * Honors `prefers-reduced-motion: reduce` by skipping drift entirely so
 * accessibility users still see the underlying stat update instantly without
 * any movement.
 *
 * Usage:
 *   <div style={{ position: 'relative' }}>
 *     <StatChip />
 *     <StatDriftNumbers value={runtimeState.essence} icon="🟣" />
 *   </div>
 *
 * The overlay positions itself absolutely within the nearest positioned
 * ancestor so the caller controls the anchor.
 */

interface DriftToken {
  id: number;
  delta: number;
  /** Random 0..1 horizontal jitter so stacked deltas don't perfectly overlap. */
  xJitter: number;
}

const DRIFT_DURATION_MS = 1100;
/** Hard cap so a burst of deltas (e.g. cascade claim) can't flood the DOM. */
const MAX_DRIFT_TOKENS = 6;

export interface StatDriftNumbersProps {
  /** The numeric stat to watch. When it increases, a drift token spawns. */
  value: number;
  /** Optional icon/emoji rendered next to the "+N" text. */
  icon?: string;
  /**
   * Optional threshold below which tiny deltas are ignored (e.g. to suppress
   * animation noise from rounding). Defaults to 1.
   */
  minDelta?: number;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function StatDriftNumbers(props: StatDriftNumbersProps) {
  const { value, icon, minDelta = 1 } = props;
  const prevValueRef = useRef<number>(value);
  const nextIdRef = useRef<number>(1);
  const [tokens, setTokens] = useState<DriftToken[]>([]);

  useEffect(() => {
    const prev = prevValueRef.current;
    prevValueRef.current = value;

    const delta = value - prev;
    if (delta < minDelta) return;

    // Skip animation entirely when the user prefers reduced motion.
    if (prefersReducedMotion()) return;

    const id = nextIdRef.current++;
    const token: DriftToken = {
      id,
      delta,
      xJitter: Math.random() * 2 - 1, // −1..1
    };

    setTokens((current) => {
      const appended = [...current, token];
      // Drop oldest if we exceed the cap.
      return appended.length > MAX_DRIFT_TOKENS
        ? appended.slice(appended.length - MAX_DRIFT_TOKENS)
        : appended;
    });

    const timer = window.setTimeout(() => {
      setTokens((current) => current.filter((t) => t.id !== id));
    }, DRIFT_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [value, minDelta]);

  if (tokens.length === 0) return null;

  return (
    <span
      className="island-run-stat-drift"
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        pointerEvents: 'none',
        transform: 'translateX(-50%)',
        zIndex: 5,
      }}
    >
      {tokens.map((t) => (
        <span
          key={t.id}
          className="island-run-stat-drift__token"
          style={{
            // Slight horizontal jitter so multiple concurrent drifts don't
            // visually stack into one line of text.
            transform: `translateX(${t.xJitter * 14}px)`,
          }}
        >
          +{t.delta}
          {icon ? ` ${icon}` : null}
        </span>
      ))}
    </span>
  );
}
