import { useEffect, useState, type CSSProperties } from 'react';

const TITLE_LINES = ['ISLAND', 'COMPLETE!'] as const;
/** Each island gets one entrance so repeat completions feel fresh. */
const ENTRANCES = ['wave', 'explode', 'pop', 'shrink'] as const;
export type IslandCompleteTitleEntrance = (typeof ENTRANCES)[number];

export function resolveIslandCompleteTitleEntrance(islandNumber: number): IslandCompleteTitleEntrance {
  const safe = Math.max(1, Math.floor(Number.isFinite(islandNumber) ? islandNumber : 1));
  return ENTRANCES[(safe - 1) % ENTRANCES.length];
}

/**
 * "Island Complete!" as individual letters: plain spans with CSS transforms,
 * so every letter can move on its own at the cost of a few DOM nodes.
 */
export function IslandCompleteTitle({ islandNumber }: { islandNumber: number }) {
  const entrance = resolveIslandCompleteTitleEntrance(islandNumber);
  let letterIndex = 0;
  return (
    <h2 className={`island-complete-title island-complete-title--${entrance}`} aria-label="Island Complete!">
      {TITLE_LINES.map((line) => (
        <span key={line} className="island-complete-title__line" aria-hidden="true">
          {line.split('').map((letter, index) => {
            const style = {
              '--letter-index': letterIndex,
              '--letter-drift': `${((letterIndex * 37) % 11) - 5}`,
            } as CSSProperties;
            letterIndex += 1;
            return (
              <span key={`${line}-${index}`} className="island-complete-title__letter" style={style}>
                {letter}
              </span>
            );
          })}
        </span>
      ))}
    </h2>
  );
}

/** Counts a reward up from zero once its delivery beat starts. */
export function IslandCompleteRewardCount({ value, delayMs }: { value: number; delayMs: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setShown(value);
      return undefined;
    }
    let frame = 0;
    const startAt = performance.now() + delayMs;
    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - startAt) / 650));
      setShown(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, delayMs]);
  return <>{shown}</>;
}
