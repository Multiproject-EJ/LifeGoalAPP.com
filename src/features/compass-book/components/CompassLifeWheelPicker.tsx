import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import type { CompassBlockOption } from '../types';

type CompassLifeWheelPickerProps = {
  options: readonly CompassBlockOption[];
  selectedId: string | null;
  onSelect: (optionId: string) => void;
};

const WHEEL_META: Record<string, { emoji: string; color: string }> = {
  health_fitness: { emoji: '🌿', color: '#42c98d' },
  spirituality_community: { emoji: '✦', color: '#8e7dff' },
  career_development: { emoji: '🧭', color: '#4d9cff' },
  finance_wealth: { emoji: '💎', color: '#e5b84b' },
  love_relations: { emoji: '♥', color: '#ef6e8e' },
  family_friends: { emoji: '🤝', color: '#53cbd3' },
  living_spaces: { emoji: '⌂', color: '#55bfa7' },
  fun_creativity: { emoji: '✨', color: '#f39a4c' },
};

const NO_MATCH_ID = 'no_match';
const WHEEL_SIZE = 320;
const WHEEL_CENTER = WHEEL_SIZE / 2;
const WHEEL_RADIUS = 146;

function pointOnCircle(radius: number, degrees: number): { x: number; y: number } {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: WHEEL_CENTER + radius * Math.cos(radians),
    y: WHEEL_CENTER + radius * Math.sin(radians),
  };
}

function wedgePath(index: number, total: number): string {
  const slice = 360 / total;
  const gap = Math.min(1.5, slice * 0.06);
  const start = -90 + index * slice + gap;
  const end = -90 + (index + 1) * slice - gap;
  const first = pointOnCircle(WHEEL_RADIUS, start);
  const second = pointOnCircle(WHEEL_RADIUS, end);
  const largeArc = end - start > 180 ? 1 : 0;
  return [
    `M ${WHEEL_CENTER} ${WHEEL_CENTER}`,
    `L ${first.x} ${first.y}`,
    `A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 ${largeArc} 1 ${second.x} ${second.y}`,
    'Z',
  ].join(' ');
}

function optionIndexAtPointer(
  event: PointerEvent<SVGSVGElement>,
  optionCount: number,
): number | null {
  const bounds = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - bounds.left - bounds.width / 2;
  const y = event.clientY - bounds.top - bounds.height / 2;
  const distance = Math.hypot(x, y);
  if (distance < bounds.width * 0.15 || distance > bounds.width * 0.51) return null;
  const degrees = (Math.atan2(y, x) * 180) / Math.PI;
  const normalized = (degrees + 90 + 360) % 360;
  return Math.min(optionCount - 1, Math.floor(normalized / (360 / optionCount)));
}

export function CompassLifeWheelPicker({
  options,
  selectedId,
  onSelect,
}: CompassLifeWheelPickerProps) {
  const wheelOptions = options.filter((option) => WHEEL_META[option.id]);
  const selectedWheelId = wheelOptions.some((option) => option.id === selectedId)
    ? selectedId
    : null;
  const [previewId, setPreviewId] = useState<string | null>(selectedWheelId);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    setPreviewId(selectedWheelId);
  }, [selectedWheelId]);

  const previewOption = wheelOptions.find((option) => option.id === previewId) ?? null;
  const noMatchSelected = selectedId === NO_MATCH_ID;

  function updateFromPointer(event: PointerEvent<SVGSVGElement>) {
    const index = optionIndexAtPointer(event, wheelOptions.length);
    if (index == null) return;
    setPreviewId(wheelOptions[index]?.id ?? null);
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    updateFromPointer(event);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!dragging) return;
    updateFromPointer(event);
  }

  function handlePointerEnd(event: PointerEvent<SVGSVGElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  }

  function handleWedgeKeyDown(event: KeyboardEvent<SVGPathElement>, index: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setPreviewId(wheelOptions[index]?.id ?? null);
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
    const nextIndex = (index + step + wheelOptions.length) % wheelOptions.length;
    setPreviewId(wheelOptions[nextIndex]?.id ?? null);
    const paths = svgRef.current?.querySelectorAll<SVGPathElement>('[data-wheel-wedge]');
    paths?.[nextIndex]?.focus();
  }

  return (
    <div className="compass-life-wheel">
      <p className="compass-life-wheel__hint">
        Drag around the wheel until the closest match lights up.
      </p>
      <div className={`compass-life-wheel__stage${dragging ? ' is-dragging' : ''}`}>
        <svg
          ref={svgRef}
          className="compass-life-wheel__svg"
          viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
          role="radiogroup"
          aria-label="Choose the life area that matches best"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <circle className="compass-life-wheel__halo" cx={WHEEL_CENTER} cy={WHEEL_CENTER} r="154" />
          {wheelOptions.map((option, index) => {
            const meta = WHEEL_META[option.id];
            const lit = previewId === option.id;
            const committed = selectedId === option.id;
            const labelPoint = pointOnCircle(104, -90 + (index + 0.5) * (360 / wheelOptions.length));
            return (
              <g key={option.id}>
                <path
                  data-wheel-wedge
                  d={wedgePath(index, wheelOptions.length)}
                  className={`compass-life-wheel__wedge${lit ? ' is-lit' : ''}${committed ? ' is-committed' : ''}`}
                  style={{ '--wheel-color': meta.color } as CSSProperties}
                  role="radio"
                  aria-label={option.label}
                  aria-checked={committed}
                  tabIndex={0}
                  onClick={() => setPreviewId(option.id)}
                  onKeyDown={(event) => handleWedgeKeyDown(event, index)}
                />
                <text
                  className="compass-life-wheel__emoji"
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  aria-hidden="true"
                >
                  {meta.emoji}
                </text>
              </g>
            );
          })}
          <circle className="compass-life-wheel__hub" cx={WHEEL_CENTER} cy={WHEEL_CENTER} r="55" />
        </svg>
        <div className="compass-life-wheel__center" aria-live="polite">
          <span aria-hidden="true">
            {previewOption ? WHEEL_META[previewOption.id].emoji : noMatchSelected ? '○' : '↻'}
          </span>
          <strong>
            {previewOption?.label ?? (noMatchSelected ? 'No clear match' : 'Move around')}
          </strong>
          <small>{previewOption ? 'Closest match?' : 'Tap or drag'}</small>
        </div>
      </div>

      <div className="compass-life-wheel__actions">
        <button
          type="button"
          className={`compass-life-wheel__answer compass-life-wheel__answer--no${noMatchSelected ? ' is-selected' : ''}`}
          aria-pressed={noMatchSelected}
          onClick={() => onSelect(NO_MATCH_ID)}
        >
          <span aria-hidden="true">×</span>
          No clear match
        </button>
        <button
          type="button"
          className="compass-life-wheel__answer compass-life-wheel__answer--yes"
          disabled={!previewOption}
          onClick={() => {
            if (previewOption) onSelect(previewOption.id);
          }}
        >
          <span aria-hidden="true">✓</span>
          {previewOption ? `Perfect match · ${previewOption.label}` : 'Choose a wedge'}
        </button>
      </div>
    </div>
  );
}
