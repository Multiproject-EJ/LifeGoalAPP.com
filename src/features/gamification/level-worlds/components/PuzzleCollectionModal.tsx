import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useControllerShopScrollLock } from './living-controller/useControllerShopScrollLock';
import {
  resolvePuzzlePiecePath,
  type PuzzleCollectionEntry,
  type PuzzleCollectionView,
} from '../services/puzzleCollection';
import './PuzzleCollectionModal.css';

const VIEW_W = 500;
const VIEW_H = 220;

/** The picture every piece of a puzzle is cut from (original vector art). */
function PuzzlePicture({ entry, idPrefix }: { entry: PuzzleCollectionEntry; idPrefix: string }) {
  const { hue } = entry;
  return (
    <g>
      <defs>
        <linearGradient id={`${idPrefix}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 80% 72%)`} />
          <stop offset="1" stopColor={`hsl(${(hue + 40) % 360} 85% 88%)`} />
        </linearGradient>
      </defs>
      <rect width={VIEW_W} height={VIEW_H} fill={`url(#${idPrefix}-sky)`} />
      <circle cx={400} cy={58} r={30} fill="#fff6c8" opacity={0.9} />
      <path d={`M0,150 C80,110 160,120 250,140 C340,160 420,120 500,130 L500,220 L0,220 Z`} fill={`hsl(${(hue + 150) % 360} 45% 52%)`} />
      <path d={`M0,180 C100,160 200,190 300,175 C390,162 450,180 500,172 L500,220 L0,220 Z`} fill={`hsl(${(hue + 170) % 360} 50% 38%)`} />
      <text x={VIEW_W / 2} y={128} textAnchor="middle" fontSize={92}>{entry.template.icon}</text>
    </g>
  );
}

function PuzzleBoard({ entry, placed, pieces, size, animate }: {
  entry: PuzzleCollectionEntry;
  placed: number;
  pieces: number;
  size: 'hero' | 'mini';
  animate?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={`puzzle-collection__board puzzle-collection__board--${size}`} viewBox={`-24 -4 ${VIEW_W + 48} ${VIEW_H + 8}`} role="img"
      aria-label={`${entry.template.displayName} puzzle: ${placed} of ${pieces} pieces`}>
      <defs>
        {Array.from({ length: pieces }, (_, index) => (
          <clipPath key={index} id={`${id}-piece-${index}`}><path d={resolvePuzzlePiecePath(index)} /></clipPath>
        ))}
      </defs>
      {Array.from({ length: pieces }, (_, index) => {
        const path = resolvePuzzlePiecePath(index);
        if (index >= placed) {
          return <path key={index} d={path} className="puzzle-collection__slot" />;
        }
        return (
          <g key={index} className={animate ? 'puzzle-collection__piece is-animated' : 'puzzle-collection__piece'}
            style={animate ? { animationDelay: `${index * 90}ms` } : undefined}>
            <g clipPath={`url(#${id}-piece-${index})`}><PuzzlePicture entry={entry} idPrefix={`${id}-${index}`} /></g>
            <path d={path} className="puzzle-collection__piece-edge" />
          </g>
        );
      })}
    </svg>
  );
}

/** Island 005+ Puzzle Collection: the current event's jigsaw and the gallery. */
export function PuzzleCollectionModal(props: {
  view: PuzzleCollectionView;
  bonusDice: number;
  bonusMoney: number;
  onClose: () => void;
}) {
  useControllerShopScrollLock();
  const { view } = props;
  const onCloseRef = useRef(props.onClose);
  onCloseRef.current = props.onClose;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onCloseRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const missing = view.piecesPerPuzzle - view.piecesPlaced;

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="puzzle-collection" role="dialog" aria-modal="true" aria-labelledby="puzzle-collection-title">
      <div className="puzzle-collection__backdrop" aria-hidden="true" onClick={props.onClose} />
      <div className="puzzle-collection__dialog">
        <button type="button" className="puzzle-collection__close" aria-label="Close" onClick={props.onClose}>×</button>
        <p className="puzzle-collection__eyebrow">Puzzle Collection</p>
        <h2 id="puzzle-collection-title">{view.current.template.icon} {view.current.template.displayName}</h2>
        <PuzzleBoard entry={view.current} placed={view.piecesPlaced} pieces={view.piecesPerPuzzle} size="hero" animate />
        <p className="puzzle-collection__progress">
          <strong>{view.piecesPlaced}/{view.piecesPerPuzzle}</strong> pieces
          {missing === 1 ? ' · one piece away!' : ''}
        </p>
        <p className="puzzle-collection__hint">
          Fill the reward bar to earn puzzle pieces. Each finished puzzle pays <strong>+{props.bonusDice} 🎲</strong> and <strong>+{props.bonusMoney} 💰</strong>.
        </p>
        <h3 className="puzzle-collection__gallery-title">Collection · {view.distinctCompleted}/{view.entries.length}</h3>
        <ul className="puzzle-collection__gallery">
          {view.entries.map((entry) => (
            <li key={entry.template.eventId} className={entry.completedCount > 0 ? 'is-complete' : 'is-locked'}>
              <PuzzleBoard entry={entry} placed={entry.completedCount > 0 ? view.piecesPerPuzzle : 0} pieces={view.piecesPerPuzzle} size="mini" />
              <span className="puzzle-collection__gallery-name">{entry.template.displayName}</span>
              <span className="puzzle-collection__gallery-count">{entry.completedCount > 0 ? `×${entry.completedCount}` : '—'}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
