import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import {
  LIFE_WHEEL_AREA_TAXONOMY,
  getLifeWheelAreaMeta,
  type LifeWheelArea,
} from '../../../life-wheel/lifeWheelTaxonomy';

export type WisdomLifeAreaMatch = LifeWheelArea | 'no_match';

type WisdomLifeAreaWheelProps = {
  selectedMatch: WisdomLifeAreaMatch | null;
  onSelect: (match: WisdomLifeAreaMatch) => void;
};

const WHEEL_SIZE = 320;
const WHEEL_CENTER = WHEEL_SIZE / 2;
const WHEEL_RADIUS = 146;

const AREA_VISUALS: Record<LifeWheelArea, { color: string; glyph: string; keywords: string }> = {
  Health: { color: '#4ee6a4', glyph: '✦', keywords: 'body · sleep · energy' },
  Mind: { color: '#9c8cff', glyph: '◈', keywords: 'thoughts · calm · meaning' },
  Work: { color: '#57a7ff', glyph: '⌁', keywords: 'projects · focus · growth' },
  Money: { color: '#f6c951', glyph: '◆', keywords: 'bills · admin · security' },
  Love: { color: '#ff7fa0', glyph: '♥', keywords: 'partner · care · intimacy' },
  Connections: { color: '#58d9dc', glyph: '∞', keywords: 'friends · family · belonging' },
  Home: { color: '#61d2b0', glyph: '⌂', keywords: 'space · moving · surroundings' },
  Fun: { color: '#ff9d55', glyph: '✺', keywords: 'play · joy · creativity' },
};

function pointOnCircle(radius: number, degrees: number): { x: number; y: number } {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: WHEEL_CENTER + radius * Math.cos(radians),
    y: WHEEL_CENTER + radius * Math.sin(radians),
  };
}

function wedgePath(index: number): string {
  const slice = 360 / LIFE_WHEEL_AREA_TAXONOMY.length;
  const start = -90 + index * slice + 1.5;
  const end = -90 + (index + 1) * slice - 1.5;
  const first = pointOnCircle(WHEEL_RADIUS, start);
  const second = pointOnCircle(WHEEL_RADIUS, end);
  return [
    `M ${WHEEL_CENTER} ${WHEEL_CENTER}`,
    `L ${first.x} ${first.y}`,
    `A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 0 1 ${second.x} ${second.y}`,
    'Z',
  ].join(' ');
}

function areaAtPointer(event: PointerEvent<SVGSVGElement>): LifeWheelArea | null {
  const bounds = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - bounds.left - bounds.width / 2;
  const y = event.clientY - bounds.top - bounds.height / 2;
  const distance = Math.hypot(x, y);
  if (distance < bounds.width * 0.15 || distance > bounds.width * 0.51) return null;
  const degrees = (Math.atan2(y, x) * 180) / Math.PI;
  const normalized = (degrees + 90 + 360) % 360;
  const index = Math.min(
    LIFE_WHEEL_AREA_TAXONOMY.length - 1,
    Math.floor(normalized / (360 / LIFE_WHEEL_AREA_TAXONOMY.length)),
  );
  return LIFE_WHEEL_AREA_TAXONOMY[index]?.area ?? null;
}

export function WisdomLifeAreaWheel({
  selectedMatch,
  onSelect,
}: WisdomLifeAreaWheelProps) {
  const initialArea = selectedMatch && selectedMatch !== 'no_match' ? selectedMatch : null;
  const [previewArea, setPreviewArea] = useState<LifeWheelArea | null>(initialArea);
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    setPreviewArea(selectedMatch && selectedMatch !== 'no_match' ? selectedMatch : null);
  }, [selectedMatch]);

  const previewMeta = previewArea ? getLifeWheelAreaMeta(previewArea) : null;
  const previewVisual = previewArea ? AREA_VISUALS[previewArea] : null;

  const updateFromPointer = (event: PointerEvent<SVGSVGElement>) => {
    const area = areaAtPointer(event);
    if (area) setPreviewArea(area);
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    updateFromPointer(event);
  };

  const handlePointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  };

  const handleKeyDown = (event: KeyboardEvent<SVGPathElement>, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setPreviewArea(LIFE_WHEEL_AREA_TAXONOMY[index]?.area ?? null);
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
    const nextIndex = (index + step + LIFE_WHEEL_AREA_TAXONOMY.length)
      % LIFE_WHEEL_AREA_TAXONOMY.length;
    setPreviewArea(LIFE_WHEEL_AREA_TAXONOMY[nextIndex]?.area ?? null);
    svgRef.current
      ?.querySelectorAll<SVGPathElement>('[data-wisdom-wheel-wedge]')
      [nextIndex]
      ?.focus();
  };

  return (
    <div className="wisdom-life-wheel">
      <p className="wisdom-life-wheel__instruction">
        Drag around the wheel. Let the words — not perfection — guide the match.
      </p>
      <div className={`wisdom-life-wheel__stage${isDragging ? ' is-dragging' : ''}`}>
        <div className="wisdom-life-wheel__orbit" aria-hidden="true" />
        <svg
          ref={svgRef}
          className="wisdom-life-wheel__svg"
          viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
          role="radiogroup"
          aria-label="Match the clue to a life area"
          onPointerDown={handlePointerDown}
          onPointerMove={(event) => {
            if (isDragging) updateFromPointer(event);
          }}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <circle className="wisdom-life-wheel__halo" cx={WHEEL_CENTER} cy={WHEEL_CENTER} r="154" />
          {LIFE_WHEEL_AREA_TAXONOMY.map((meta, index) => {
            const visual = AREA_VISUALS[meta.area];
            const isLit = previewArea === meta.area;
            const isCommitted = selectedMatch === meta.area;
            const labelPoint = pointOnCircle(
              107,
              -90 + (index + 0.5) * (360 / LIFE_WHEEL_AREA_TAXONOMY.length),
            );
            return (
              <g key={meta.area}>
                <path
                  data-wisdom-wheel-wedge
                  d={wedgePath(index)}
                  className={`wisdom-life-wheel__wedge${isLit ? ' is-lit' : ''}${isCommitted ? ' is-committed' : ''}`}
                  style={{ '--wisdom-wheel-color': visual.color } as CSSProperties}
                  role="radio"
                  aria-label={`${meta.shortLabel}: ${visual.keywords}`}
                  aria-checked={isCommitted}
                  tabIndex={0}
                  onClick={() => setPreviewArea(meta.area)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                />
                <text
                  className="wisdom-life-wheel__glyph"
                  x={labelPoint.x}
                  y={labelPoint.y - 6}
                  textAnchor="middle"
                  dominantBaseline="central"
                  aria-hidden="true"
                >
                  {visual.glyph}
                </text>
                <text
                  className="wisdom-life-wheel__label"
                  x={labelPoint.x}
                  y={labelPoint.y + 13}
                  textAnchor="middle"
                  dominantBaseline="central"
                  aria-hidden="true"
                >
                  {meta.shortLabel}
                </text>
              </g>
            );
          })}
          <circle className="wisdom-life-wheel__hub" cx={WHEEL_CENTER} cy={WHEEL_CENTER} r="58" />
        </svg>
        <div className="wisdom-life-wheel__center" aria-live="polite">
          <span aria-hidden="true">{previewMeta?.emoji ?? '↻'}</span>
          <strong>{previewMeta?.shortLabel ?? 'Find a match'}</strong>
          <small>{previewVisual?.keywords ?? 'tap or drag'}</small>
        </div>
      </div>

      <div className="wisdom-life-wheel__answers">
        <button
          type="button"
          className={`wisdom-life-wheel__answer wisdom-life-wheel__answer--no${selectedMatch === 'no_match' ? ' is-selected' : ''}`}
          aria-pressed={selectedMatch === 'no_match'}
          onClick={() => onSelect('no_match')}
        >
          <span aria-hidden="true">×</span>
          No clear match
        </button>
        <button
          type="button"
          className="wisdom-life-wheel__answer wisdom-life-wheel__answer--yes"
          disabled={!previewArea}
          onClick={() => {
            if (previewArea) onSelect(previewArea);
          }}
        >
          <span aria-hidden="true">✓</span>
          {previewMeta ? `Match · ${previewMeta.shortLabel}` : 'Choose a wedge'}
        </button>
      </div>
    </div>
  );
}
