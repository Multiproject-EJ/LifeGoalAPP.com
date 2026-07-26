/**
 * CompassRose — the book's signature mark, drawn for real.
 *
 * An engraved sixteen-point rose: long cardinal points, medium intercardinal,
 * short sixteenths, each split lengthwise into a shadowed and a lit half the
 * way etched roses are, inside a ticked degree ring with cardinal letters.
 * Pure presentational SVG — geometry only, no state, no data.
 *
 * Colors come from CSS (`compass-rose--ink` for gold ink on parchment,
 * `compass-rose--gilt` for bright foil on leather/night), so the same drawing
 * works on both of the book's materials.
 */

const CX = 110;
const CY = 110;

type PointSpec = { angle: number; length: number; halfWidth: number };

function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function fmt(n: number): string {
  return n.toFixed(2);
}

/** One rose point as two mirrored triangles: [darkHalf, lightHalf]. */
function pointHalves({ angle, length, halfWidth }: PointSpec): [string, string] {
  const [tx, ty] = polar(length, angle);
  const [lx, ly] = polar(halfWidth, angle - 90);
  const [rx, ry] = polar(halfWidth, angle + 90);
  const dark = `M ${fmt(tx)} ${fmt(ty)} L ${fmt(lx)} ${fmt(ly)} L ${CX} ${CY} Z`;
  const light = `M ${fmt(tx)} ${fmt(ty)} L ${fmt(rx)} ${fmt(ry)} L ${CX} ${CY} Z`;
  return [dark, light];
}

const CARDINALS: PointSpec[] = [0, 90, 180, 270].map((angle) => ({
  angle,
  length: 88,
  halfWidth: 11,
}));
const INTERCARDINALS: PointSpec[] = [45, 135, 225, 315].map((angle) => ({
  angle,
  length: 58,
  halfWidth: 9,
}));
const SIXTEENTHS: PointSpec[] = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map(
  (angle) => ({ angle, length: 34, halfWidth: 6 }),
);

const TICKS = Array.from({ length: 48 }, (_, i) => i * 7.5);

const LETTERS: Array<{ label: string; angle: number }> = [
  { label: 'N', angle: 0 },
  { label: 'E', angle: 90 },
  { label: 'S', angle: 180 },
  { label: 'W', angle: 270 },
];

export type CompassRoseProps = {
  /** `ink` = gold ink on parchment (default); `gilt` = bright foil on leather. */
  tone?: 'ink' | 'gilt';
  size?: number;
  className?: string;
};

export function CompassRose({ tone = 'ink', size = 120, className }: CompassRoseProps) {
  return (
    <svg
      viewBox="0 0 220 220"
      width={size}
      height={size}
      className={`compass-rose compass-rose--${tone} ${className ?? ''}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* Degree ring with ticks, heavier at every 30°. */}
      <circle cx={CX} cy={CY} r={96} className="compass-rose__ring" />
      <circle cx={CX} cy={CY} r={90} className="compass-rose__ring compass-rose__ring--thin" />
      {TICKS.map((deg) => {
        const major = deg % 30 === 0;
        const [x1, y1] = polar(major ? 96 : 94.5, deg);
        const [x2, y2] = polar(90, deg);
        return (
          <line
            key={deg}
            x1={fmt(x1)}
            y1={fmt(y1)}
            x2={fmt(x2)}
            y2={fmt(y2)}
            className={major ? 'compass-rose__tick compass-rose__tick--major' : 'compass-rose__tick'}
          />
        );
      })}

      {/* Points, drawn small-behind-large so the long points read on top. */}
      {[...SIXTEENTHS, ...INTERCARDINALS, ...CARDINALS].map((spec) => {
        const [dark, light] = pointHalves(spec);
        return (
          <g key={spec.angle}>
            <path d={dark} className="compass-rose__half compass-rose__half--dark" />
            <path d={light} className="compass-rose__half compass-rose__half--light" />
          </g>
        );
      })}

      {/* Hub. */}
      <circle cx={CX} cy={CY} r={8.5} className="compass-rose__hub" />
      <circle cx={CX} cy={CY} r={3} className="compass-rose__pin" />

      {/* Cardinal letters, outside the ring. */}
      {LETTERS.map(({ label, angle }) => {
        const [x, y] = polar(107, angle);
        return (
          <text
            key={label}
            x={fmt(x)}
            y={fmt(y)}
            className="compass-rose__letter"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
