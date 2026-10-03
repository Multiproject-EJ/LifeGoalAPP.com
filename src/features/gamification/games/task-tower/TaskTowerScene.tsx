/**
 * Decorative parallax backdrop for the Task Tower stage, in the same
 * "citadel above the clouds" look as the Task Tower launcher card: sky,
 * stars, a moon/sun, drifting clouds, two layers of castle spires and the
 * cloud-wrapped stone plinth the tower stands on. Dawn/dusk/night looks are
 * driven entirely by the `task-tower--{timeOfDay}` class on the game root —
 * this component renders the same DOM for all of them. Everything here is
 * aria-hidden and pointer-transparent.
 */

interface Spire {
  /** Left edge in viewBox units. */
  x: number;
  w: number;
  /** Height of the walls (without the roof). */
  h: number;
  /** Roof height; 0 = flat crenellated top. */
  roof: number;
}

const FAR_SPIRES: Spire[] = [
  { x: 0, w: 22, h: 26, roof: 0 },
  { x: 20, w: 14, h: 40, roof: 18 },
  { x: 36, w: 30, h: 22, roof: 0 },
  { x: 64, w: 12, h: 48, roof: 24 },
  { x: 80, w: 26, h: 30, roof: 12 },
  { x: 118, w: 18, h: 36, roof: 16 },
  { x: 150, w: 34, h: 20, roof: 0 },
  { x: 196, w: 14, h: 44, roof: 22 },
  { x: 214, w: 24, h: 28, roof: 10 },
  { x: 252, w: 16, h: 38, roof: 18 },
  { x: 272, w: 30, h: 22, roof: 0 },
  { x: 306, w: 12, h: 52, roof: 26 },
  { x: 322, w: 28, h: 30, roof: 12 },
  { x: 356, w: 16, h: 40, roof: 20 },
  { x: 376, w: 24, h: 24, roof: 0 },
];

const NEAR_SPIRES: Spire[] = [
  { x: -6, w: 40, h: 34, roof: 0 },
  { x: 30, w: 20, h: 58, roof: 26 },
  { x: 54, w: 46, h: 30, roof: 0 },
  { x: 268, w: 50, h: 30, roof: 0 },
  { x: 318, w: 22, h: 64, roof: 30 },
  { x: 344, w: 26, h: 44, roof: 18 },
  { x: 370, w: 36, h: 32, roof: 0 },
];

const FAR_VIEWBOX_HEIGHT = 80;
const NEAR_VIEWBOX_HEIGHT = 100;

/** One silhouette path: walls, then a pointed roof or a crenellated top. */
function spirePath(spire: Spire, viewBoxHeight: number): string {
  const { x, w, h, roof } = spire;
  const base = viewBoxHeight;
  const top = base - h;
  if (roof > 0) {
    const eave = Math.max(1.5, w * 0.12);
    return `M${x} ${base}V${top}H${x - eave}L${x + w / 2} ${top - roof}L${x + w + eave} ${top}H${x + w}V${base}Z`;
  }
  // Crenellations: alternating merlons across the top.
  const merlon = Math.max(3, w / 7);
  let d = `M${x} ${base}V${top - 4}`;
  for (let cx = x, up = true; cx < x + w - 0.01; cx += merlon, up = !up) {
    const next = Math.min(x + w, cx + merlon);
    d += `H${next}V${up ? top : top - 4}`;
  }
  return `${d}V${base}Z`;
}

interface SpireWindow {
  x: number;
  y: number;
  lit: boolean;
}

/** Arched windows for one near spire, with a stable subset lit. */
function spireWindows(spire: Spire): SpireWindow[] {
  const windows: SpireWindow[] = [];
  const top = NEAR_VIEWBOX_HEIGHT - spire.h;
  let index = Math.abs(Math.round(spire.x));
  for (let wx = spire.x + 6; wx + 4 <= spire.x + spire.w - 5; wx += 11) {
    for (let wy = top + 8; wy + 8 <= NEAR_VIEWBOX_HEIGHT - 8; wy += 14) {
      windows.push({ x: wx, y: wy, lit: index % 3 !== 1 });
      index += 5;
    }
  }
  return windows;
}

export function TaskTowerScene() {
  return (
    <div className="task-tower__scene" aria-hidden="true">
      <div className="task-tower__sky" />
      <div className="task-tower__stars" />
      <div className="task-tower__orb" />
      <div className="task-tower__aurora" />
      <div className="task-tower__clouds task-tower__clouds--far" />
      <div className="task-tower__clouds task-tower__clouds--near" />
      <div className="task-tower__haze" />

      <svg
        className="task-tower__skyline task-tower__skyline--far"
        viewBox={`0 0 400 ${FAR_VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
      >
        {FAR_SPIRES.map(spire => (
          <path key={`far-${spire.x}`} d={spirePath(spire, FAR_VIEWBOX_HEIGHT)} />
        ))}
      </svg>

      <svg
        className="task-tower__skyline task-tower__skyline--near"
        viewBox={`0 0 400 ${NEAR_VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
      >
        {NEAR_SPIRES.map(spire => (
          <g key={`near-${spire.x}`}>
            <path d={spirePath(spire, NEAR_VIEWBOX_HEIGHT)} />
            {spire.roof > 0 && (
              <circle
                className="task-tower__skyline-finial"
                cx={spire.x + spire.w / 2}
                cy={NEAR_VIEWBOX_HEIGHT - spire.h - spire.roof - 2}
                r={1.6}
              />
            )}
            {spireWindows(spire).map(window => (
              <path
                key={`window-${window.x}-${window.y}`}
                className={`task-tower__skyline-window${window.lit ? ' task-tower__skyline-window--lit' : ''}`}
                d={`M${window.x} ${window.y + 8}V${window.y + 2}A2 2 0 0 1 ${window.x + 4} ${window.y + 2}V${window.y + 8}Z`}
              />
            ))}
          </g>
        ))}
      </svg>

      <div className="task-tower__cloudbank" />
      <div className="task-tower__ground" />
      <div className="task-tower__vignette" />
    </div>
  );
}
