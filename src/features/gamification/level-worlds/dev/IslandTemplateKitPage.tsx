import { useMemo, useState } from 'react';
import { TILE_ANCHORS_36 } from '../services/islandBoardLayout';
import { evaluateIslandKit, ISLAND_KIT_SCENE, ISLAND_KIT_VERSION } from './islandCameraLockedKit';
import './IslandTemplateKitPage.css';

type ViewMode = 'blueprint' | 'clay' | 'proof';
type BuildLevel = 0 | 1 | 2 | 3;

const PROOF_SCENE_SRC = '/assets/islands/_template/proof/starfall-foundry-camera-locked-v1.webp';

function readInitialPreviewState() {
  const params = new URLSearchParams(window.location.search);
  const requestedMode = params.get('mode');
  const requestedLevel = Number(params.get('level'));
  return {
    mode: requestedMode === 'clay' || requestedMode === 'proof' ? requestedMode : 'blueprint' as ViewMode,
    buildLevel: ([0, 1, 2, 3].includes(requestedLevel) ? requestedLevel : 3) as BuildLevel,
    overlays: params.get('guides') !== '0',
  };
}

function TileRing() {
  return (
    <g className="island-kit-phone__tiles" transform="translate(200 300)">
      <g transform="translate(500 500) scale(1 .73) translate(-500 -500)">
        {TILE_ANCHORS_36.map((anchor, index) => (
          <g key={anchor.id} transform={`translate(${anchor.x} ${anchor.y}) rotate(${anchor.tangentDeg})`}>
            <rect x="-31" y="-49" width="62" height="98" rx="9" className={index % 6 === 0 ? 'island-kit-phone__tile island-kit-phone__tile--key' : 'island-kit-phone__tile'} />
            <path d="M-31 38 L31 38 L25 54 L-25 54 Z" className="island-kit-phone__tile-side" />
          </g>
        ))}
      </g>
    </g>
  );
}

function LandmarkEnvelope({ cx, cy, label, buildLevel }: {
  cx: number;
  cy: number;
  label: string;
  buildLevel: BuildLevel;
}) {
  const height = buildLevel === 0 ? 0 : ISLAND_KIT_SCENE.landmarkEnvelope.levelSizes[buildLevel - 1];
  const width = height;
  const groundY = cy + 76;

  return (
    <g className="island-kit-phone__landmark">
      {buildLevel > 0 ? (
        <>
          <path
            d={`M ${cx - width / 2} ${groundY} L ${cx - width * 0.37} ${groundY - height * 0.72} L ${cx} ${groundY - height} L ${cx + width * 0.37} ${groundY - height * 0.72} L ${cx + width / 2} ${groundY} Z`}
            className={`island-kit-phone__building island-kit-phone__building--l${buildLevel}`}
          />
          <line x1={cx} y1={groundY} x2={cx} y2={groundY - height} className="island-kit-phone__centerline" />
        </>
      ) : (
        <ellipse cx={cx} cy={groundY - 18} rx="96" ry="50" className="island-kit-phone__foundation" />
      )}
      <g transform={`translate(${cx} ${groundY + 35})`}>
        <rect x="-84" y="-22" width="168" height="44" rx="22" className="island-kit-phone__label-pill" />
        <text textAnchor="middle" dominantBaseline="central" className="island-kit-phone__label-text">{label}</text>
      </g>
    </g>
  );
}

function IslandScaffold({ mode, buildLevel, overlays }: {
  mode: ViewMode;
  buildLevel: BuildLevel;
  overlays: boolean;
}) {
  const scene = ISLAND_KIT_SCENE;
  return (
    <svg className={`island-kit-phone__scene island-kit-phone__scene--${mode}`} viewBox={`0 0 ${scene.width} ${scene.height}`} role="img" aria-label="Camera-locked island production scaffold">
      <defs>
        <radialGradient id="kitOcean" cx="50%" cy="45%" r="70%">
          <stop offset="0" stopColor="#163d49" />
          <stop offset="1" stopColor="#07141f" />
        </radialGradient>
        <linearGradient id="kitLand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a6d29a" />
          <stop offset="1" stopColor="#315a45" />
        </linearGradient>
      </defs>
      <rect width={scene.width} height={scene.height} fill="url(#kitOcean)" />
      {mode === 'proof' ? <image href={PROOF_SCENE_SRC} x="0" y="0" width={scene.width} height={scene.height} preserveAspectRatio="none" /> : null}
      {mode !== 'proof' ? (
        <>
          <ellipse cx={scene.centerIsland.cx} cy={scene.centerIsland.cy} rx={scene.centerIsland.rx} ry={scene.centerIsland.ry} className="island-kit-phone__center-island" />
          {scene.satellites.map((satellite) => (
            <ellipse key={satellite.id} cx={satellite.cx} cy={satellite.cy} rx={satellite.rx} ry={satellite.ry} className="island-kit-phone__satellite" />
          ))}
        </>
      ) : null}

      {overlays ? (
        <>
          <rect {...scene.phoneSafeArea} className="island-kit-phone__safe-area" />
          <ellipse cx={scene.centerIsland.cx} cy={scene.centerIsland.cy} rx={scene.centerIsland.rx} ry={scene.centerIsland.ry} className="island-kit-phone__outline island-kit-phone__outline--center" />
          {scene.satellites.map((satellite) => <ellipse key={`outline-${satellite.id}`} cx={satellite.cx} cy={satellite.cy} rx={satellite.rx} ry={satellite.ry} className="island-kit-phone__outline" />)}
          <line x1={scene.centerX} y1="110" x2={scene.centerX} y2="1450" className="island-kit-phone__axis" />
          <line x1="65" y1={scene.centerY} x2="1335" y2={scene.centerY} className="island-kit-phone__axis" />
          <ellipse cx={scene.tileRing.cx} cy={scene.tileRing.cy} rx={scene.tileRing.rx + 66} ry={scene.tileRing.ry + 48} className="island-kit-phone__ring-clearance" />
          <circle cx={scene.centerX} cy={scene.centerY} r="16" className="island-kit-phone__anchor" />
        </>
      ) : null}

      <TileRing />
      {mode !== 'proof' ? scene.satellites.map((satellite) => (
        <LandmarkEnvelope key={satellite.id} cx={satellite.cx} cy={satellite.cy} label={satellite.label} buildLevel={buildLevel} />
      )) : null}
      {mode !== 'proof' ? <g className="island-kit-phone__boss-envelope">
        <ellipse cx={scene.centerX} cy={scene.centerY + 46} rx="155" ry="94" />
        <path d="M610 840 L640 640 L700 570 L760 640 L790 840 Z" />
        <text x={scene.centerX} y={scene.centerY + 158} textAnchor="middle">BOSS LANDMARK</text>
      </g> : null}
    </svg>
  );
}

export default function IslandTemplateKitPage() {
  const initialState = useMemo(() => readInitialPreviewState(), []);
  const [mode, setMode] = useState<ViewMode>(initialState.mode);
  const [buildLevel, setBuildLevel] = useState<BuildLevel>(initialState.buildLevel);
  const [overlays, setOverlays] = useState(initialState.overlays);
  const checks = useMemo(() => evaluateIslandKit(), []);
  const passCount = checks.filter((check) => check.passed).length;

  return (
    <main className="island-kit-page">
      <header className="island-kit-header">
        <div>
          <p className="island-kit-eyebrow">DEV ONLY · {ISLAND_KIT_VERSION}</p>
          <h1>120-Island Camera Kit</h1>
          <p>The tile board is immutable. Every biome must fit this camera, center anchor and landmark capacity.</p>
        </div>
        <div className="island-kit-score" data-pass={passCount === checks.length}>
          <strong>{passCount}/{checks.length}</strong>
          <span>geometry checks pass</span>
        </div>
      </header>

      <section className="island-kit-workbench">
        <aside className="island-kit-controls" aria-label="Template controls">
          <div className="island-kit-control-group">
            <span>View</span>
            {(['blueprint', 'clay', 'proof'] as ViewMode[]).map((option) => (
              <button key={option} type="button" aria-pressed={mode === option} onClick={() => setMode(option)}>{option}</button>
            ))}
          </div>
          <div className="island-kit-control-group">
            <span>Landmark envelope</span>
            {([0, 1, 2, 3] as BuildLevel[]).map((level) => (
              <button key={level} type="button" aria-pressed={buildLevel === level} onClick={() => setBuildLevel(level)}>L{level}</button>
            ))}
          </div>
          <label className="island-kit-toggle">
            <input type="checkbox" checked={overlays} onChange={(event) => setOverlays(event.target.checked)} />
            Production guides
          </label>
          <dl className="island-kit-specs">
            <div><dt>Scene</dt><dd>1400 × 1600</dd></div>
            <div><dt>Board anchor</dt><dd>700, 800</dd></div>
            <div><dt>Final angle</dt><dd>0.73 ellipse</dd></div>
            <div><dt>Satellite</dt><dd>550 × 402</dd></div>
          </dl>
        </aside>

        <div className="island-kit-phone" data-testid="island-kit-phone">
          <div className="island-kit-phone__notch" />
          <div className="island-kit-phone__hud"><span>ISLAND TEMPLATE</span><strong>BOARD LOCKED</strong></div>
          <IslandScaffold mode={mode} buildLevel={buildLevel} overlays={overlays} />
          <div className="island-kit-phone__controller"><span>Story</span><strong>Roll</strong><span>Build</span></div>
        </div>

        <aside className="island-kit-checks" aria-label="Geometry checks">
          <h2>Release gate</h2>
          {checks.map((check) => (
            <article key={check.id} data-pass={check.passed}>
              <span>{check.passed ? 'PASS' : 'FAIL'}</span>
              <div><strong>{check.label}</strong><p>{check.detail}</p></div>
            </article>
          ))}
        </aside>
      </section>
    </main>
  );
}
