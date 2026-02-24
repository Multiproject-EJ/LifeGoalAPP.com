import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CANONICAL_BOARD_SIZE,
  STOP_TILES,
  TILE_ANCHORS,
  TOKEN_START_TILE_INDEX,
  type TileAnchor,
} from '../services/islandBoardLayout';

const ISLAND_SCENES = [1, 2, 3] as const;
const ROLL_MIN = 1;
const ROLL_MAX = 3;
const DEV_ISLAND_DURATION_SEC = 45;
const DEV_EGG_DURATION_SEC = 40;

type EggTier = 'common' | 'rare' | 'mythic';

interface ActiveEgg {
  tier: EggTier;
  setAtMs: number;
  hatchAtMs: number;
}

const ZBAND_COLORS: Record<TileAnchor['zBand'], string> = {
  back: '#50a5ff',
  mid: '#ffe066',
  front: '#ff4ff5',
};

const STOP_COPY: Record<string, { title: string; description: string }> = {
  hatchery: {
    title: '🥚 Hatchery Stop',
    description: 'Set one egg and track stage progression over time (prototype scaffold).',
  },
  minigame: {
    title: '🎮 Minigame Stop',
    description: 'Stub: launch minigame entry flow here.',
  },
  market: {
    title: '🛒 Market Stop',
    description: 'Stub: spend island currency on offers here.',
  },
  utility: {
    title: '🧰 Utility Stop',
    description: 'Stub: utility interactions go here.',
  },
  boss: {
    title: '👑 Boss Stop',
    description: 'Stub: boss trial UI will open from here.',
  },
};

function toScreen(anchor: TileAnchor, width: number, height: number) {
  return {
    x: (anchor.x / CANONICAL_BOARD_SIZE.width) * width,
    y: (anchor.y / CANONICAL_BOARD_SIZE.height) * height,
  };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function formatClock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function IslandRunBoardPrototype() {
  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showDebug, setShowDebug] = useState(() => new URLSearchParams(window.location.search).get('debugBoard') === '1');
  const [activeScene, setActiveScene] = useState<(typeof ISLAND_SCENES)[number]>(1);
  const [boardSize, setBoardSize] = useState({ width: 360, height: 640 });

  const [hearts, setHearts] = useState(30);
  const [tokenIndex, setTokenIndex] = useState(TOKEN_START_TILE_INDEX);
  const [rollValue, setRollValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [landingText, setLandingText] = useState('Ready to roll');
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [islandNumber, setIslandNumber] = useState(1);
  const [timeLeftSec, setTimeLeftSec] = useState(DEV_ISLAND_DURATION_SEC);
  const [showTravelOverlay, setShowTravelOverlay] = useState(false);
  const [activeEgg, setActiveEgg] = useState<ActiveEgg | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const ticker = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(ticker);
  }, []);

  useEffect(() => {
    const updateBoardSize = () => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      setBoardSize({ width: rect.width, height: rect.height });
    };

    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(boardSize.width * ratio);
    canvas.height = Math.floor(boardSize.height * ratio);
    canvas.style.width = `${boardSize.width}px`;
    canvas.style.height = `${boardSize.height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, boardSize.width, boardSize.height);

    const points = TILE_ANCHORS.map((anchor) => toScreen(anchor, boardSize.width, boardSize.height));
    if (!points.length) return;

    context.lineCap = 'round';
    context.lineJoin = 'round';

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const current = points[i];
      const midX = (prev.x + current.x) / 2;
      const midY = (prev.y + current.y) / 2;
      context.quadraticCurveTo(prev.x, prev.y, midX, midY);
    }

    const last = points[points.length - 1];
    const first = points[0];
    const closeMidX = (last.x + first.x) / 2;
    const closeMidY = (last.y + first.y) / 2;
    context.quadraticCurveTo(last.x, last.y, closeMidX, closeMidY);

    const glowGradient = context.createLinearGradient(0, 0, 0, boardSize.height);
    glowGradient.addColorStop(0, 'rgba(161, 236, 255, 0.28)');
    glowGradient.addColorStop(0.5, 'rgba(247, 218, 138, 0.42)');
    glowGradient.addColorStop(1, 'rgba(214, 174, 92, 0.65)');

    context.strokeStyle = 'rgba(255, 255, 255, 0.26)';
    context.lineWidth = 26;
    context.stroke();

    context.strokeStyle = glowGradient;
    context.lineWidth = 13;
    context.stroke();

    if (showDebug) {
      context.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      context.setLineDash([8, 8]);
      context.lineWidth = 2;
      context.stroke();
      context.setLineDash([]);
    }
  }, [boardSize, showDebug]);

  const stopMap = useMemo(() => {
    const map = new Map<number, string>();
    STOP_TILES.forEach((stop) => map.set(stop.tileIndex, stop.stopId.replace('stop_', '')));
    return map;
  }, []);

  const tokenPosition = toScreen(TILE_ANCHORS[tokenIndex], boardSize.width, boardSize.height);
  const activeStop = activeStopId ? STOP_COPY[activeStopId] : null;

  const eggStage = useMemo(() => {
    if (!activeEgg) return 0;
    const total = Math.max(1, activeEgg.hatchAtMs - activeEgg.setAtMs);
    const progress = Math.min(1, Math.max(0, (nowMs - activeEgg.setAtMs) / total));
    return Math.min(4, Math.max(1, Math.ceil(progress * 4)));
  }, [activeEgg, nowMs]);

  const eggRemainingSec = activeEgg ? Math.max(0, Math.ceil((activeEgg.hatchAtMs - nowMs) / 1000)) : 0;

  useEffect(() => {
    if (showTravelOverlay) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeftSec((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [showTravelOverlay, islandNumber]);

  useEffect(() => {
    if (timeLeftSec > 0 || showTravelOverlay) {
      return;
    }

    setShowTravelOverlay(true);
    setLandingText('Island expired. Traveling to next island...');

    const timeout = window.setTimeout(() => {
      setIslandNumber((value) => value + 1);
      setTokenIndex(TOKEN_START_TILE_INDEX);
      setHearts(30);
      setRollValue(null);
      setActiveStopId(null);
      setTimeLeftSec(DEV_ISLAND_DURATION_SEC);
      setLandingText('Arrived at next island. Ready to roll. Egg progress carried over (prototype).');
      setShowTravelOverlay(false);
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [timeLeftSec, showTravelOverlay]);

  const timerDisplay = formatClock(timeLeftSec);

  const handleRoll = async () => {
    if (isRolling || hearts < 1) {
      return;
    }

    setIsRolling(true);
    setActiveStopId(null);
    setHearts((current) => Math.max(0, current - 1));

    const nextRoll = Math.floor(Math.random() * (ROLL_MAX - ROLL_MIN + 1)) + ROLL_MIN;
    setRollValue(nextRoll);
    setLandingText(`Rolling ${nextRoll}...`);

    let currentIndex = tokenIndex;
    for (let step = 0; step < nextRoll; step += 1) {
      currentIndex = (currentIndex + 1) % TILE_ANCHORS.length;
      setTokenIndex(currentIndex);
      await wait(240);
    }

    const landedStop = stopMap.get(currentIndex);
    if (landedStop) {
      setLandingText(`Landed on STOP: ${landedStop.toUpperCase()} (#${currentIndex})`);
      setActiveStopId(landedStop);
    } else {
      setLandingText(`Landed on tile #${currentIndex}`);
    }

    setIsRolling(false);
  };

  const handleSetEgg = (tier: EggTier) => {
    const start = Date.now();
    setActiveEgg({ tier, setAtMs: start, hatchAtMs: start + DEV_EGG_DURATION_SEC * 1000 });
  };

  return (
    <section className="island-run-prototype">
      <header className="island-run-prototype__header">
        <h2>🏝️ Island Run • M1-M5A Prototype</h2>
        <div className="island-run-prototype__status-row">
          <span>Hearts: <strong>{hearts}</strong></span>
          <span>Tile: <strong>{tokenIndex}</strong></span>
          <span>Island: <strong>{islandNumber}</strong></span>
          <span>Last roll: <strong>{rollValue ?? '-'}</strong></span>
          <span>Ends in: <strong>{timerDisplay}</strong></span>
        </div>
        <p className="island-run-prototype__landing">{landingText}</p>
        <div className="island-run-prototype__controls">
          {ISLAND_SCENES.map((sceneId) => (
            <button
              key={sceneId}
              type="button"
              className={`island-run-prototype__scene-btn ${activeScene === sceneId ? 'island-run-prototype__scene-btn--active' : ''}`}
              onClick={() => setActiveScene(sceneId)}
            >
              BG {sceneId}
            </button>
          ))}
          <button type="button" className="island-run-prototype__debug-btn" onClick={() => setShowDebug((value) => !value)}>
            {showDebug ? 'Hide' : 'Show'} anchor/depth debug
          </button>
          <button
            type="button"
            className="island-run-prototype__roll-btn"
            onClick={handleRoll}
            disabled={isRolling || hearts < 1 || showTravelOverlay}
          >
            {isRolling ? 'Rolling...' : 'Roll (1 heart)'}
          </button>
        </div>
      </header>

      <div ref={boardRef} className={`island-run-board island-run-board--scene-${activeScene}`}>
        <canvas ref={canvasRef} className="island-run-board__path" />

        <div className="island-run-board__tiles">
          {TILE_ANCHORS.map((anchor, index) => {
            const position = toScreen(anchor, boardSize.width, boardSize.height);
            const isStop = stopMap.has(index);

            return (
              <div
                key={anchor.id}
                className={`island-tile island-tile--${anchor.zBand} ${isStop ? 'island-tile--stop' : ''}`}
                style={{
                  left: position.x,
                  top: position.y,
                  transform: `translate(-50%, -50%) scale(${anchor.scale})`,
                }}
              >
                <span>{index + 1}</span>
                {showDebug && <small>{anchor.id}</small>}
              </div>
            );
          })}

          <div
            className={`island-token ${isRolling ? 'island-token--moving' : ''}`}
            style={{
              left: tokenPosition.x,
              top: tokenPosition.y,
            }}
          >
            🚀
          </div>
        </div>

        <img
          className="island-run-board__depth-mask"
          src={`/assets/islands/depth/depth_mask_00${activeScene}.svg`}
          alt=""
          aria-hidden="true"
        />

        {showDebug && (
          <svg className="island-debug-overlay" viewBox={`0 0 ${boardSize.width} ${boardSize.height}`}>
            {TILE_ANCHORS.map((anchor, index) => {
              const position = toScreen(anchor, boardSize.width, boardSize.height);
              const tangentLength = 28;
              const tangentX = position.x + Math.cos((anchor.tangentDeg * Math.PI) / 180) * tangentLength;
              const tangentY = position.y + Math.sin((anchor.tangentDeg * Math.PI) / 180) * tangentLength;

              return (
                <g key={`${anchor.id}_debug`}>
                  <circle cx={position.x} cy={position.y} r="17" fill="none" stroke={ZBAND_COLORS[anchor.zBand]} strokeWidth="2" />
                  <line x1={position.x} y1={position.y} x2={tangentX} y2={tangentY} stroke={ZBAND_COLORS[anchor.zBand]} strokeWidth="2" />
                  <text x={position.x + 10} y={position.y - 12} fill="#fff" fontSize="10">#{index}</text>
                  {stopMap.has(index) && (
                    <text x={position.x + 10} y={position.y + 18} fill="#9ef0ff" fontSize="10">
                      {stopMap.get(index)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {showTravelOverlay && (
        <div className="island-travel-overlay" role="status" aria-live="polite">
          <div className="island-travel-overlay__card">
            <p>✈️ Traveling to Island {islandNumber + 1}...</p>
          </div>
        </div>
      )}

      {activeStop && (
        <div className="island-stop-modal-backdrop" role="presentation">
          <section className="island-stop-modal" role="dialog" aria-modal="true" aria-label={activeStop.title}>
            <h3>{activeStop.title}</h3>
            <p>{activeStop.description}</p>

            {activeStopId === 'hatchery' && (
              <div className="island-hatchery-card">
                {!activeEgg ? (
                  <>
                    <p>No active island egg. Set one:</p>
                    <div className="island-hatchery-card__actions">
                      <button type="button" onClick={() => handleSetEgg('common')}>Set Common Egg</button>
                      <button type="button" onClick={() => handleSetEgg('rare')}>Set Rare Egg</button>
                      <button type="button" onClick={() => handleSetEgg('mythic')}>Set Mythic Egg</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p>Tier: <strong>{activeEgg.tier}</strong></p>
                    <p>Stage: <strong>{eggStage} / 4</strong></p>
                    <p>{eggStage >= 4 ? 'Ready to open (prototype).' : `Hatches in ${formatClock(eggRemainingSec)}`}</p>
                    <div className="island-hatchery-card__actions">
                      <button type="button" onClick={() => setActiveEgg(null)}>
                        {eggStage >= 4 ? 'Open Egg (stub)' : 'Clear Egg (dev)'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <button type="button" onClick={() => setActiveStopId(null)}>Close</button>
          </section>
        </div>
      )}
    </section>
  );
}
