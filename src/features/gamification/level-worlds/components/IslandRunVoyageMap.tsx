import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lockPageScroll } from '../../../../utils/scrollLock';
import {
  VOYAGE_ERAS,
  getVoyageEra,
  getVoyageIslandArt,
  getVoyageIslandLabel,
  getVoyageNodeX,
  isVoyageIslandRevealed,
  resolveVoyageIslandStatus,
  type VoyageIslandStatus,
} from '../services/islandVoyageMap';
import './IslandRunVoyageMap.css';

const ROW_HEIGHT = 104;
const BANNER_HEIGHT = 118;
const TOP_PADDING = 40;

interface VoyageItem { kind: 'island' | 'era'; islandNumber: number; y: number }

/**
 * Voyage Map: the island-by-island journey as a winding path from Island 1
 * at the bottom to the final island at the top, grouped into the six eras.
 * Opens scrolled to where you are; tap an island for its details.
 */
export function IslandRunVoyageMap({
  currentIslandNumber,
  currentIslandCompletedStopCount = 0,
  maxIslandCount = 120,
  completedIslandNumbers = [],
  visitedIslandNumbers = [],
  onClose,
}: {
  currentIslandNumber: number;
  currentIslandCompletedStopCount?: number;
  maxIslandCount?: number;
  completedIslandNumbers?: readonly number[];
  visitedIslandNumbers?: readonly number[];
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState(currentIslandNumber);
  const completed = useMemo(() => new Set(completedIslandNumbers), [completedIslandNumbers]);
  const visited = useMemo(() => new Set(visitedIslandNumbers), [visitedIslandNumbers]);

  // Layout top-down: highest island first, each era banner below its first island.
  const { items, height, nodeY } = useMemo(() => {
    const list: VoyageItem[] = [];
    const ys = new Map<number, number>();
    let y = TOP_PADDING;
    for (let island = maxIslandCount; island >= 1; island -= 1) {
      list.push({ kind: 'island', islandNumber: island, y });
      ys.set(island, y + ROW_HEIGHT / 2);
      y += ROW_HEIGHT;
      if (VOYAGE_ERAS.some((era) => era.from === island)) {
        list.push({ kind: 'era', islandNumber: island, y });
        y += BANNER_HEIGHT;
      }
    }
    return { items: list, height: y + 24, nodeY: ys };
  }, [maxIslandCount]);

  useEffect(() => lockPageScroll(), []);
  useEffect(() => {
    const scroller = scrollRef.current;
    const y = nodeY.get(currentIslandNumber);
    if (scroller && y !== undefined) scroller.scrollTop = Math.max(0, y - scroller.clientHeight * 0.55);
  }, [currentIslandNumber, nodeY]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pathFor = (from: number, to: number) => {
    const points: string[] = [];
    for (let island = from; island <= to; island += 1) {
      const y = nodeY.get(island);
      if (y !== undefined) points.push(`${getVoyageNodeX(island)},${y}`);
    }
    return points.length > 1 ? `M${points.join(' L')}` : '';
  };

  const statusFor = (islandNumber: number): VoyageIslandStatus => resolveVoyageIslandStatus({ islandNumber, currentIslandNumber, completed, visited });
  const selectedStatus = statusFor(selected);
  const era = getVoyageEra(currentIslandNumber);
  const eraDone = Math.max(0, currentIslandNumber - era.from);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="voyage-map" role="dialog" aria-modal="true" aria-labelledby="voyage-map-title">
      <header className="voyage-map__header">
        <span>
          <small>🧭 Voyage Map</small>
          <strong id="voyage-map-title">Island {currentIslandNumber} of {maxIslandCount}</strong>
          <em>{era.icon} {era.title} · {eraDone} of {era.to - era.from + 1} islands done</em>
        </span>
        <button type="button" className="voyage-map__close" aria-label="Close map" onClick={onClose}>×</button>
      </header>
      <div className="voyage-map__scroll" ref={scrollRef}>
        <div className="voyage-map__track" style={{ height }}>
          <svg className="voyage-map__path" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true">
            <path d={pathFor(currentIslandNumber, maxIslandCount)} className="voyage-map__path-ahead" vectorEffect="non-scaling-stroke" />
            <path d={pathFor(1, currentIslandNumber)} className="voyage-map__path-done" vectorEffect="non-scaling-stroke" />
          </svg>
          {items.map((item) => {
            if (item.kind === 'era') {
              const entry = VOYAGE_ERAS.find((e) => e.from === item.islandNumber)!;
              return (
                <div key={`era-${entry.id}`} className="voyage-map__era" style={{ top: item.y, '--era': entry.tint } as React.CSSProperties}>
                  <span aria-hidden="true">{entry.icon}</span>
                  <div><small>Era {VOYAGE_ERAS.indexOf(entry) + 1} · Islands {entry.from}–{entry.to}</small><strong>{entry.title}</strong><em>{entry.subtitle}</em></div>
                </div>
              );
            }
            const island = item.islandNumber;
            const status = statusFor(island);
            const revealed = isVoyageIslandRevealed(island, currentIslandNumber);
            const x = getVoyageNodeX(island);
            return (
              <button
                key={island}
                type="button"
                className={`voyage-map__node voyage-map__node--${status}${island % 10 === 0 ? ' voyage-map__node--milestone' : ''}${selected === island ? ' is-selected' : ''}`}
                style={{ top: item.y + ROW_HEIGHT / 2, left: `${x}%` }}
                onClick={() => setSelected(island)}
                aria-label={`Island ${island}: ${getVoyageIslandLabel(island, currentIslandNumber)}, ${status}`}
              >
                <span className="voyage-map__medallion" style={{ backgroundImage: revealed ? `url(${getVoyageIslandArt(island)})` : undefined }}>
                  {status === 'completed' ? <i className="voyage-map__check" aria-hidden="true">✓</i> : null}
                  {status === 'locked' ? <i className="voyage-map__lock" aria-hidden="true">{revealed ? '🔒' : '?'}</i> : null}
                </span>
                <b className="voyage-map__number">{island}</b>
                {status === 'current' ? <span className="voyage-map__ship" aria-hidden="true">🚀</span> : null}
                {status === 'next' ? <span className="voyage-map__here voyage-map__here--next">Next</span> : null}
                <span className={`voyage-map__name${x > 50 ? ' voyage-map__name--left' : ''}`}>
                  {getVoyageIslandLabel(island, currentIslandNumber)}
                  {status === 'current' ? <span className="voyage-map__here-inline">You are here</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <footer className="voyage-map__sheet" aria-live="polite">
        <span className="voyage-map__sheet-art" style={{ backgroundImage: isVoyageIslandRevealed(selected, currentIslandNumber) ? `url(${getVoyageIslandArt(selected)})` : undefined }} aria-hidden="true" />
        <span className="voyage-map__sheet-copy">
          <small>Island {selected} · {getVoyageEra(selected).title}</small>
          <strong>{getVoyageIslandLabel(selected, currentIslandNumber)}</strong>
          <em>
            {selectedStatus === 'current' ? `${currentIslandCompletedStopCount} of 5 objectives complete`
              : selectedStatus === 'completed' ? 'Completed ✓'
                : selectedStatus === 'next' ? 'Your next stop'
                  : `Reach island ${selected} to explore it`}
          </em>
          {selectedStatus === 'current' ? (
            <span className="voyage-map__dots" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <i key={i} className={i < currentIslandCompletedStopCount ? 'is-done' : undefined} />)}</span>
          ) : null}
        </span>
        {selectedStatus === 'current' ? <button type="button" className="voyage-map__continue" onClick={onClose}>Continue →</button> : null}
      </footer>
    </div>,
    document.body,
  );
}
