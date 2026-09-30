import { useState, type CSSProperties } from 'react';
import './IslandRunLoadingScreen.css';

/**
 * Island Run loading screen, drawn entirely in code (no image assets): a
 * night sky that slowly warms to dawn, stars twinkling in, an island rising
 * with its lights switching on, and the game controller fading in with its
 * buttons lighting one by one.
 *
 * Loading happens in several back-to-back steps (save check → 3D code →
 * first frame). Every instance shares one clock so the scene keeps coming to
 * life across those steps instead of restarting from dark each time.
 */
let sharedStartedAtMs: number | null = null;
let sharedLastSeenAtMs = 0;
/** A gap longer than this means a new loading session. */
const LOADING_SESSION_GAP_MS = 4_000;

function useSharedLoadingClock(): number {
  const [elapsedMs] = useState(() => {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    if (sharedStartedAtMs === null || now - sharedLastSeenAtMs > LOADING_SESSION_GAP_MS) sharedStartedAtMs = now;
    sharedLastSeenAtMs = now;
    return now - sharedStartedAtMs;
  });
  return elapsedMs;
}

/** Call when the game is on screen so the next load starts from night again. */
export function markIslandRunLoadingScreenDone(): void {
  sharedLastSeenAtMs = typeof performance !== 'undefined' ? performance.now() : 0;
}

const ISLAND_LIGHTS: readonly [number, number][] = [
  [92, 132], [118, 124], [140, 128], [163, 119], [184, 126], [206, 121], [229, 129], [250, 134],
];

export function IslandRunLoadingScreen({
  title = 'Opening your island',
  detail = 'Waking the world…',
  className = '',
}: {
  title?: string;
  detail?: string;
  className?: string;
}) {
  const elapsedMs = useSharedLoadingClock();
  const style = { '--ir-loading-offset': `${-elapsedMs}ms` } as CSSProperties;
  return (
    <div className={`ir-loading ${className}`.trim()} style={style} role="status" aria-live="polite">
      <span className="ir-loading__sky" aria-hidden="true" />
      <span className="ir-loading__dawn" aria-hidden="true" />
      <span className="ir-loading__stars" aria-hidden="true" />
      <span className="ir-loading__cloud ir-loading__cloud--one" aria-hidden="true" />
      <span className="ir-loading__cloud ir-loading__cloud--two" aria-hidden="true" />

      <svg className="ir-loading__island" viewBox="0 0 340 170" aria-hidden="true" preserveAspectRatio="xMidYMax meet">
        <defs>
          <linearGradient id="ir-loading-island-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3f7a5d" />
            <stop offset="1" stopColor="#24483a" />
          </linearGradient>
          <linearGradient id="ir-loading-island-rock" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b3346" />
            <stop offset="1" stopColor="#1a1628" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M58 130 C80 108 118 102 170 104 C222 102 262 110 284 130 C270 142 246 146 214 148 L126 148 C94 146 70 142 58 130 Z" fill="url(#ir-loading-island-top)" />
        <path d="M70 138 C104 150 236 150 272 138 L244 168 L204 162 L170 170 L130 160 L96 166 Z" fill="url(#ir-loading-island-rock)" />
        <ellipse className="ir-loading__path-glow" cx="171" cy="126" rx="78" ry="12" />
        {ISLAND_LIGHTS.map(([x, y], index) => (
          <circle key={index} className="ir-loading__light" cx={x} cy={y} r="2.4" style={{ '--light-index': index } as CSSProperties} />
        ))}
      </svg>

      <svg className="ir-loading__controller" viewBox="0 0 320 196" aria-hidden="true" shapeRendering="geometricPrecision">
        <defs>
          <linearGradient id="ir-loading-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a4f93" />
            <stop offset="1" stopColor="#0f2247" />
          </linearGradient>
          <linearGradient id="ir-loading-grip" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f7fbff" />
            <stop offset="1" stopColor="#c9dcf0" />
          </linearGradient>
          <radialGradient id="ir-loading-screen" cx="0.5" cy="0.45" r="0.7">
            <stop offset="0" stopColor="#7fdcff" />
            <stop offset="1" stopColor="#1f6fb8" />
          </radialGradient>
        </defs>
        <path className="ir-loading__controller-body" d="M62 40 C92 16 228 16 258 40 C298 70 318 142 300 174 C290 192 262 190 246 170 L222 140 C212 130 200 126 186 126 L134 126 C120 126 108 130 98 140 L74 170 C58 190 30 192 20 174 C2 142 22 70 62 40 Z" fill="url(#ir-loading-body)" />
        <path d="M24 168 C10 138 30 82 64 56 C72 90 82 118 96 140 L74 168 C60 186 34 186 24 168 Z" fill="url(#ir-loading-grip)" />
        <path d="M296 168 C310 138 290 82 256 56 C248 90 238 118 224 140 L246 168 C260 186 286 186 296 168 Z" fill="url(#ir-loading-grip)" />
        <rect className="ir-loading__screen" x="112" y="44" width="96" height="52" rx="12" fill="url(#ir-loading-screen)" />
        <text className="ir-loading__screen-text" x="160" y="76" textAnchor="middle">ROLL</text>
        <circle className="ir-loading__button" cx="74" cy="84" r="9" style={{ '--button-index': 0 } as CSSProperties} />
        <circle className="ir-loading__button" cx="246" cy="70" r="7" style={{ '--button-index': 1 } as CSSProperties} />
        <circle className="ir-loading__button" cx="264" cy="88" r="7" style={{ '--button-index': 2 } as CSSProperties} />
        <circle className="ir-loading__button" cx="228" cy="88" r="7" style={{ '--button-index': 3 } as CSSProperties} />
        <circle className="ir-loading__button" cx="246" cy="106" r="7" style={{ '--button-index': 4 } as CSSProperties} />
        <rect className="ir-loading__button" x="142" y="104" width="36" height="8" rx="4" style={{ '--button-index': 5 } as CSSProperties} />
      </svg>

      <div className="ir-loading__copy">
        <strong>{title}</strong>
        <small>{detail}</small>
        <span className="ir-loading__progress" aria-hidden="true"><i /></span>
      </div>
    </div>
  );
}
