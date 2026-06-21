import { LIFE_WHEEL_AREA_TAXONOMY } from '../../../life-wheel/lifeWheelTaxonomy';
import type { LivingWheelOutput } from '../../logic/projectors/livingWheelProjector';

export type LivingWheelGraphicProps = {
  output: LivingWheelOutput;
  mode: 'compact' | 'full';
};

const POSITIVE = new Set(['joy', 'calm', 'pride', 'hope']);
const NEGATIVE = new Set(['restless', 'anxious', 'frustrated', 'sad', 'drained', 'numb']);

const META_BY_KEY = new Map(
  LIFE_WHEEL_AREA_TAXONOMY.map((entry) => [entry.checkinKey as string, entry]),
);

function labelFor(areaId: string | null): string {
  if (!areaId) return '—';
  return META_BY_KEY.get(areaId)?.shortLabel ?? areaId;
}

function emotionColor(emotion: string | null): string {
  if (!emotion) return '#3b4a6b';
  if (POSITIVE.has(emotion)) return '#34d399';
  if (NEGATIVE.has(emotion)) return '#fb923c';
  return '#60a5fa';
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function wedgePath(cx: number, cy: number, rIn: number, rOut: number, a0: number, a1: number): string {
  const p0 = polar(cx, cy, rOut, a0);
  const p1 = polar(cx, cy, rOut, a1);
  const p2 = polar(cx, cy, rIn, a1);
  const p3 = polar(cx, cy, rIn, a0);
  const large = a1 - a0 <= 180 ? 0 : 1;
  return `M ${p0.x} ${p0.y} A ${rOut} ${rOut} 0 ${large} 1 ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${rIn} ${rIn} 0 ${large} 0 ${p3.x} ${p3.y} Z`;
}

const MOMENTUM_GLYPH: Record<string, string> = { rising: '▲', flat: '–', declining: '▼' };

const MECHANIC_EMOJI: Record<'engine' | 'brake' | 'fragile' | 'lever', string> = {
  engine: '🔧',
  brake: '🛑',
  fragile: '⚠️',
  lever: '🎯',
};

/**
 * App-rendered Living Wheel — the Chapter 1 one-page graphic. Builds entirely
 * from structured output (never bakes player text into an image). Each segment's
 * radial fill encodes the current score; colour encodes emotional weather.
 */
export function LivingWheelGraphic({ output, mode }: LivingWheelGraphicProps) {
  const cx = 110;
  const cy = 110;
  const rIn = 34;
  const rOut = 82;
  const labelR = 96;
  const step = 360 / output.areas.length;
  const gap = 3;

  const mechanicByArea = new Map<string, ('engine' | 'brake' | 'fragile' | 'lever')[]>();
  const addMechanic = (areaId: string | null, kind: 'engine' | 'brake' | 'fragile' | 'lever') => {
    if (!areaId) return;
    const list = mechanicByArea.get(areaId) ?? [];
    list.push(kind);
    mechanicByArea.set(areaId, list);
  };
  addMechanic(output.engineAreaId, 'engine');
  addMechanic(output.brakeAreaId, 'brake');
  addMechanic(output.fragileAreaId, 'fragile');
  addMechanic(output.leverAreaId, 'lever');

  return (
    <div className={`compass-wheel compass-wheel--${mode}`}>
      <svg viewBox="0 0 220 220" role="img" aria-label="Living Wheel" className="compass-wheel__svg">
        <circle cx={cx} cy={cy} r={rOut + 2} className="compass-wheel__rim" />
        {output.areas.map((area, i) => {
          const a0 = i * step + gap / 2;
          const a1 = (i + 1) * step - gap / 2;
          const mid = (a0 + a1) / 2;
          const fillFrac = area.current == null ? 0 : Math.max(0.06, area.current / 10);
          const rFill = rIn + (rOut - rIn) * fillFrac;
          const label = labelFor(area.areaId);
          const labelPos = polar(cx, cy, labelR, mid);
          const glyph = area.momentum ? MOMENTUM_GLYPH[area.momentum] : '';
          const glyphPos = polar(cx, cy, (rIn + rOut) / 2, mid);
          const mechanics = mechanicByArea.get(area.areaId) ?? [];
          const markerPos = polar(cx, cy, rOut - 14, mid);
          return (
            <g key={area.areaId}>
              <path d={wedgePath(cx, cy, rIn, rOut, a0, a1)} className="compass-wheel__track" />
              <path
                d={wedgePath(cx, cy, rIn, rFill, a0, a1)}
                fill={emotionColor(area.emotion)}
                opacity={0.85}
              />
              {glyph ? (
                <text x={glyphPos.x} y={glyphPos.y} className="compass-wheel__glyph" textAnchor="middle">
                  {glyph}
                </text>
              ) : null}
              {mechanics.length > 0 ? (
                <text x={markerPos.x} y={markerPos.y} className="compass-wheel__marker" textAnchor="middle">
                  {MECHANIC_EMOJI[mechanics[0]]}
                </text>
              ) : null}
              {mode === 'full' ? (
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  className="compass-wheel__label"
                  textAnchor={labelPos.x < cx - 4 ? 'end' : labelPos.x > cx + 4 ? 'start' : 'middle'}
                >
                  {label}
                </text>
              ) : null}
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={rIn - 2} className="compass-wheel__hub" />
        <text x={cx} y={cy - 2} className="compass-wheel__hub-title" textAnchor="middle">
          Living
        </text>
        <text x={cx} y={cy + 10} className="compass-wheel__hub-title" textAnchor="middle">
          Wheel
        </text>
      </svg>

      {output.season ? <p className="compass-wheel__season">{output.season}</p> : null}

      <div className="compass-wheel__mechanics">
        <Mechanic emoji={MECHANIC_EMOJI.engine} label="Engine" area={labelFor(output.engineAreaId)} />
        <Mechanic emoji={MECHANIC_EMOJI.brake} label="Brake" area={labelFor(output.brakeAreaId)} />
        <Mechanic emoji={MECHANIC_EMOJI.fragile} label="Fragile" area={labelFor(output.fragileAreaId)} />
        <Mechanic emoji={MECHANIC_EMOJI.lever} label="Lever" area={labelFor(output.leverAreaId)} />
      </div>

      {mode === 'full' ? (
        <>
          {output.nextMove?.text ? (
            <p className="compass-wheel__next">
              <strong>Next move:</strong> {output.nextMove.text}
            </p>
          ) : null}
          {output.wheelStatement ? (
            <p className="compass-wheel__statement">“{output.wheelStatement}”</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Mechanic({ emoji, label, area }: { emoji: string; label: string; area: string }) {
  return (
    <span className="compass-wheel__mechanic">
      <span aria-hidden="true">{emoji}</span>
      <span className="compass-wheel__mechanic-label">{label}</span>
      <span className="compass-wheel__mechanic-area">{area}</span>
    </span>
  );
}
