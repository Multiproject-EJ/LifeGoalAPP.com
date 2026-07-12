/**
 * Decorative parallax backdrop for the Task Tower stage: sky, drifting
 * clouds, two skyline silhouette layers, and the ground strip the tower
 * stands on. Day/dusk/night looks are driven entirely by the
 * `task-tower--{timeOfDay}` class on the game root — this component renders
 * the same DOM for all of them. Everything here is aria-hidden and
 * pointer-transparent.
 */

interface SkylineBuilding {
  x: number;
  w: number;
  h: number;
}

const FAR_BUILDINGS: SkylineBuilding[] = [
  { x: 0, w: 28, h: 50 },
  { x: 32, w: 20, h: 36 },
  { x: 56, w: 34, h: 60 },
  { x: 94, w: 22, h: 42 },
  { x: 120, w: 30, h: 52 },
  { x: 154, w: 18, h: 32 },
  { x: 176, w: 36, h: 66 },
  { x: 216, w: 24, h: 40 },
  { x: 244, w: 32, h: 56 },
  { x: 280, w: 20, h: 36 },
  { x: 304, w: 38, h: 62 },
  { x: 346, w: 24, h: 44 },
  { x: 374, w: 26, h: 50 },
];

const NEAR_BUILDINGS: SkylineBuilding[] = [
  { x: 8, w: 48, h: 72 },
  { x: 68, w: 36, h: 52 },
  { x: 116, w: 56, h: 84 },
  { x: 184, w: 40, h: 60 },
  { x: 236, w: 52, h: 76 },
  { x: 300, w: 34, h: 48 },
  { x: 344, w: 48, h: 68 },
];

const FAR_VIEWBOX_HEIGHT = 80;
const NEAR_VIEWBOX_HEIGHT = 100;

interface SkylineWindow {
  x: number;
  y: number;
  lit: boolean;
}

/** Grid of windows for one near-skyline building, with a stable pseudo-random subset marked lit. */
function buildingWindows(building: SkylineBuilding): SkylineWindow[] {
  const windows: SkylineWindow[] = [];
  const top = NEAR_VIEWBOX_HEIGHT - building.h;
  let index = building.x;

  for (let wx = building.x + 5; wx + 5 <= building.x + building.w - 4; wx += 10) {
    for (let wy = top + 6; wy + 7 <= NEAR_VIEWBOX_HEIGHT - 6; wy += 12) {
      windows.push({ x: wx, y: wy, lit: index % 3 === 0 });
      index += 7;
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
      <div className="task-tower__clouds task-tower__clouds--far" />
      <div className="task-tower__clouds task-tower__clouds--near" />
      <div className="task-tower__haze" />

      <svg
        className="task-tower__skyline task-tower__skyline--far"
        viewBox={`0 0 400 ${FAR_VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
      >
        {FAR_BUILDINGS.map(building => (
          <rect
            key={`far-${building.x}`}
            x={building.x}
            y={FAR_VIEWBOX_HEIGHT - building.h}
            width={building.w}
            height={building.h}
          />
        ))}
      </svg>

      <svg
        className="task-tower__skyline task-tower__skyline--near"
        viewBox={`0 0 400 ${NEAR_VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
      >
        {NEAR_BUILDINGS.map(building => (
          <g key={`near-${building.x}`}>
            <rect
              x={building.x}
              y={NEAR_VIEWBOX_HEIGHT - building.h}
              width={building.w}
              height={building.h}
            />
            {buildingWindows(building).map(window => (
              <rect
                key={`window-${window.x}-${window.y}`}
                className={`task-tower__skyline-window${window.lit ? ' task-tower__skyline-window--lit' : ''}`}
                x={window.x}
                y={window.y}
                width={5}
                height={7}
              />
            ))}
          </g>
        ))}
      </svg>

      <div className="task-tower__ground" />
      <div className="task-tower__vignette" />
    </div>
  );
}
