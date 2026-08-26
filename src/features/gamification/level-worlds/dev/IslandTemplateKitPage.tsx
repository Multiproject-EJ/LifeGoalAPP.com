import { useEffect, useMemo, useState } from 'react';
import { TILE_ANCHORS_36 } from '../services/islandBoardLayout';
import { resolveIslandRun3DWorldRoute } from '../services/islandRun3DWorldRouting';
import {
  CELESTIAL_REDOCKING_ROLL_TARGET,
  FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET,
  FIRST_LIGHT_ASSEMBLY_DYNAMITE_TILE_INDICES,
  SUNKEN_SANDS_TREASURE_ROLL_TARGET,
} from '../services/islandRunSignatureMissions';
import { evaluateIslandKit, ISLAND_KIT_SCENE, ISLAND_KIT_VERSION } from './islandCameraLockedKit';
import Island5ThreePilot from './Island5ThreePilot';
import type { IslandRunConstructionPresentation } from '../services/islandRunConstructionPresentation';
import './IslandTemplateKitPage.css';

type ViewMode = 'blueprint' | 'clay' | 'proof' | '3d';
type BuildLevel = 0 | 1 | 2 | 3;

const PROOF_SCENE_SRC = '/assets/islands/_template/proof/starfall-foundry-camera-locked-v2.webp';

function readInitialPreviewState() {
  const params = new URLSearchParams(window.location.search);
  const requestedMode = params.get('mode');
  const requestedLevelParam = params.get('level');
  const requestedLevel = requestedLevelParam === null ? Number.NaN : Number(requestedLevelParam);
  const islandParam = Number(params.get('island'));
  const islandNumber = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16].includes(islandParam) ? islandParam : 5;
  const worldSourceNumber = resolveIslandRun3DWorldRoute(islandNumber)?.worldSourceNumber ?? 5;
  const constructionProgress = Math.min(1, Math.max(0, Number(params.get('constructionProgress') ?? '0.58')));
  const requestedLandmark = params.get('landmark');
  const constructionLandmark = ['hatchery', 'habit', 'mystery', 'wisdom', 'boss'].includes(requestedLandmark ?? '')
    ? requestedLandmark!
    : 'hatchery';
  const treasureRollsParam = Number(params.get('treasureRolls'));
  const treasureRolls = Number.isFinite(treasureRollsParam)
    ? Math.max(0, Math.min(SUNKEN_SANDS_TREASURE_ROLL_TARGET, Math.floor(treasureRollsParam)))
    : SUNKEN_SANDS_TREASURE_ROLL_TARGET;
  const redockingRollsParam = Number(params.get('redockingRolls'));
  const redockingRolls = Number.isFinite(redockingRollsParam)
    ? Math.max(0, Math.min(CELESTIAL_REDOCKING_ROLL_TARGET, Math.floor(redockingRollsParam)))
    : CELESTIAL_REDOCKING_ROLL_TARGET;
  const assemblyChargesParam = Number(params.get('assemblyCharges'));
  const assemblyCharges = Number.isFinite(assemblyChargesParam)
    ? Math.max(0, Math.min(FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET, Math.floor(assemblyChargesParam)))
    : FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET;
  const assemblyReplay = params.get('assemblyReplay') === '1';
  const honeyfallMissionStageParam = Number(params.get('honeyfallMissionStage'));
  const honeyfallMissionStage = Number.isFinite(honeyfallMissionStageParam)
    ? Math.max(0, Math.min(4, Math.floor(honeyfallMissionStageParam)))
    : 0;
  return {
    mode: requestedMode === 'clay' || requestedMode === 'proof' || requestedMode === '3d'
      ? requestedMode
      : 'blueprint' as ViewMode,
    buildLevel: ([0, 1, 2, 3].includes(requestedLevel) ? requestedLevel : 3) as BuildLevel,
    islandNumber,
    worldSourceNumber,
    treasureRolls,
    redockingRolls,
    assemblyCharges: assemblyReplay ? 0 : assemblyCharges,
    assemblyReplay,
    honeyfallMissionStage,
    honeyfallReplay: params.get('honeyfallReplay') === '1',
    overlays: params.get('guides') !== '0',
    construction: params.get('construction') === '1',
    constructionWorking: params.get('working') !== '0',
    constructionProgress: Number.isFinite(constructionProgress) ? constructionProgress : 0.58,
    constructionLandmark,
    constructionReducedMotion: params.get('reduced') === '1',
    constructionCommissioning: params.get('commissioning') === '1',
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
          <ellipse cx={scene.tileClearance.cx} cy={scene.tileClearance.cy} rx={scene.tileClearance.rx} ry={scene.tileClearance.ry} className="island-kit-phone__ring-clearance" />
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
  const [assemblyCharges, setAssemblyCharges] = useState(initialState.assemblyCharges);
  const [assemblyConstructionSequence, setAssemblyConstructionSequence] = useState(0);
  const [assemblyReplayActive, setAssemblyReplayActive] = useState(initialState.assemblyReplay);
  const checks = useMemo(() => evaluateIslandKit(), []);
  const passCount = checks.filter((check) => check.passed).length;
  const constructionPresentation = useMemo<IslandRunConstructionPresentation | null>(() => {
    if (!initialState.construction) return null;
    return {
      active: true,
      working: initialState.constructionWorking,
      cameraLocked: initialState.constructionWorking,
      completionCelebration: false,
      phase: initialState.constructionProgress < 0.2
        ? 'foundation'
        : initialState.constructionProgress < 0.45
          ? 'frame'
          : initialState.constructionProgress < 0.8
            ? 'assemble'
            : 'finish',
      progress: initialState.constructionProgress,
      sequence: 1,
      sourceLevel: initialState.buildLevel,
      commissioning: initialState.constructionCommissioning,
      cloudCover: initialState.constructionWorking ? 0.46 : 0,
      targetStopId: initialState.constructionLandmark,
      targetLevel: Math.min(3, initialState.buildLevel + 1),
      reducedMotion: initialState.constructionReducedMotion,
    };
  }, [initialState]);
  const evidenceCapture = useMemo(
    () => new URLSearchParams(window.location.search).get('island3dEvidence') === '1',
    [],
  );

  useEffect(() => {
    if (!evidenceCapture) return undefined;
    document.body.classList.add('island-3d-evidence-capture');
    return () => document.body.classList.remove('island-3d-evidence-capture');
  }, [evidenceCapture]);

  useEffect(() => {
    if (!assemblyReplayActive) return undefined;
    if (assemblyCharges >= FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET) {
      setAssemblyReplayActive(false);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setAssemblyCharges((current) => Math.min(FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET, current + 1));
      setAssemblyConstructionSequence((current) => current + 1);
    }, assemblyCharges === 0 ? 500 : 2_680);
    return () => window.clearTimeout(timer);
  }, [assemblyCharges, assemblyReplayActive]);

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
            {(['blueprint', 'clay', 'proof', '3d'] as ViewMode[]).map((option) => (
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
          {mode === '3d' && initialState.islandNumber === 1 ? (
            <div className="island-kit-control-group" data-testid="assembly-crater-preview-controls">
              <span>Assembly crater</span>
              <button
                type="button"
                onClick={() => {
                  setAssemblyReplayActive(false);
                  setAssemblyCharges(0);
                  setAssemblyConstructionSequence(0);
                }}
              >Reset</button>
              <button
                type="button"
                disabled={assemblyReplayActive || assemblyCharges >= FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET}
                onClick={() => {
                  setAssemblyCharges((current) => Math.min(FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET, current + 1));
                  setAssemblyConstructionSequence((current) => current + 1);
                }}
              >Blast next</button>
              <button
                type="button"
                aria-pressed={assemblyReplayActive}
                onClick={() => {
                  if (assemblyReplayActive) {
                    setAssemblyReplayActive(false);
                    return;
                  }
                  setAssemblyCharges(0);
                  setAssemblyConstructionSequence(0);
                  setAssemblyReplayActive(true);
                }}
              >{assemblyReplayActive ? 'Stop full replay' : 'Play full 20'}</button>
              <output aria-live="polite">
                {assemblyReplayActive ? 'Explosions ' : assemblyCharges >= FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET ? 'Assembly sequence ' : ''}
                {assemblyCharges}/{FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET}
              </output>
            </div>
          ) : null}
          <dl className="island-kit-specs">
            <div><dt>Scene</dt><dd>1400 × 1600</dd></div>
            <div><dt>Board anchor</dt><dd>700, 800</dd></div>
            <div><dt>Final angle</dt><dd>0.73 ellipse</dd></div>
            <div><dt>Satellite</dt><dd>520 × 380</dd></div>
          </dl>
        </aside>

        <div
          className={`island-kit-phone${evidenceCapture ? ' island-kit-phone--evidence-frame' : ''}`}
          data-testid="island-kit-phone"
        >
          <div className="island-kit-phone__notch" />
          {mode === '3d' ? (
            <Island5ThreePilot
              islandNumber={initialState.islandNumber}
              worldSourceNumber={initialState.worldSourceNumber}
              buildLevel={buildLevel}
              landmarkBuildLevels={initialState.construction ? {
                hatchery: initialState.constructionLandmark === 'hatchery' ? buildLevel : 3,
                habit: initialState.constructionLandmark === 'habit' ? buildLevel : 3,
                event: initialState.constructionLandmark === 'mystery' ? buildLevel : 3,
                wisdom: initialState.constructionLandmark === 'wisdom' ? buildLevel : 3,
                boss: initialState.constructionLandmark === 'boss' ? buildLevel : 3,
              } : undefined}
              cameraFocusPreset={initialState.construction
                ? initialState.constructionLandmark === 'mystery'
                  ? 'event'
                  : initialState.constructionLandmark as 'hatchery' | 'habit' | 'wisdom' | 'boss'
                : null}
              constructionPresentation={constructionPresentation}
              sunkenSandsTreasurePresentation={{
                revealProgress: initialState.treasureRolls / SUNKEN_SANDS_TREASURE_ROLL_TARGET,
                ready: initialState.treasureRolls >= SUNKEN_SANDS_TREASURE_ROLL_TARGET,
                claimed: false,
              }}
              celestialRedockingPresentation={{
                completedRolls: initialState.redockingRolls,
                targetRolls: CELESTIAL_REDOCKING_ROLL_TARGET,
                dockedPlatformCount: Math.floor(initialState.redockingRolls / 5),
              }}
              firstLightAssemblyCraterPresentation={{
                chargesDetonated: assemblyCharges,
                targetCharges: FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET,
                completed: assemblyCharges >= FIRST_LIGHT_ASSEMBLY_CHARGE_TARGET,
                claimedDynamiteTileIndices: FIRST_LIGHT_ASSEMBLY_DYNAMITE_TILE_INDICES.slice(0, assemblyCharges),
                constructionSequence: assemblyConstructionSequence,
              }}
              greatHoneyfallPresentation={initialState.islandNumber === 14 ? {
                activatedReservoirs: initialState.honeyfallMissionStage as 0 | 1 | 2 | 3 | 4,
                constructionSequence: initialState.honeyfallReplay ? 1 : 0,
              } : undefined}
            />
          ) : (
            <>
              <div className="island-kit-phone__hud"><span>ISLAND TEMPLATE</span><strong>BOARD LOCKED</strong></div>
              <IslandScaffold mode={mode} buildLevel={buildLevel} overlays={overlays} />
              <div className="island-kit-phone__controller"><span>Story</span><strong>Roll</strong><span>Build</span></div>
            </>
          )}
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
