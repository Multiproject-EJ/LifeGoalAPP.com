/**
 * ContractBoardRenderer — read-only presentation component.
 *
 * Receives a canonical BoardRendererContractV1 snapshot and renders
 * board/token/stop visual state without owning or mutating gameplay truth.
 *
 * All user-intent callbacks (roll, claim, etc.) are supplied by the host
 * and are intentionally no-op / console-logged in the current read-only mount.
 *
 * This component must NOT contain gameplay logic, progression rules, or
 * persistence side-effects. It is purely presentational.
 *
 * Feature flag: island_run_contract_renderer
 * Toggle: ?island_run_contract_renderer=1  OR  localStorage feature_flag_island_run_contract_renderer=1
 */

import { useMemo, useRef, useEffect, useState } from 'react';
import {
  TILE_ANCHORS,
  CANONICAL_BOARD_SIZE,
  type TileAnchor,
} from '../services/islandBoardLayout';
import { getIslandBoardThemeForIslandNumber } from '../services/islandBoardThemes';
import { getIslandBackgroundImageSrc } from '../services/islandBackgrounds';
import type {
  BoardRendererContractV1,
  BoardRendererContractV1Intent,
} from '../services/islandRunBoardRendererContractV1';

// ─── helpers ────────────────────────────────────────────────────────────────

function toScreen(anchor: TileAnchor, width: number, height: number) {
  return {
    x: (anchor.x / CANONICAL_BOARD_SIZE.width) * width,
    y: (anchor.y / CANONICAL_BOARD_SIZE.height) * height,
  };
}

const TILE_TYPE_ICONS: Record<string, string> = {
  currency: '💰',
  chest: '🎁',
  event: '⚡',
  hazard: '☠️',
  egg_shard: '🧩',
  micro: '✨',
  encounter: '⚔️',
};

const STOP_STATE_LABELS: Record<string, string> = {
  active_stop: '🔵',
  completed_stop: '✅',
  locked_stop: '🔒',
};

// ─── types ───────────────────────────────────────────────────────────────────

export interface ContractBoardRendererProps {
  contract: BoardRendererContractV1;
  /** All intents are routed here. In read-only mode the host provides no-op handlers. */
  onIntent: (intent: BoardRendererContractV1Intent) => void;
  /** Island number used to select the visual theme. */
  islandNumber: number;
}

// ─── component ───────────────────────────────────────────────────────────────

export function ContractBoardRenderer({
  contract,
  onIntent,
  islandNumber,
}: ContractBoardRendererProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [boardSize, setBoardSize] = useState({ width: 360, height: 640 });
  const [bgAvailable, setBgAvailable] = useState(true);

  const theme = useMemo(() => getIslandBoardThemeForIslandNumber(islandNumber), [islandNumber]);
  const bgSrc = useMemo(() => getIslandBackgroundImageSrc(islandNumber), [islandNumber]);

  // Track board dimensions for responsive layout
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setBoardSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Draw path lines on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = boardSize.width;
    canvas.height = boardSize.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const points = TILE_ANCHORS.map((a) => toScreen(a, boardSize.width, boardSize.height));

    ctx.beginPath();
    ctx.strokeStyle = theme.pathGlowStops?.[1] ?? 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    points.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();
  }, [boardSize, theme.pathGlowStops]);

  // Build a lookup: tileIndex → tile state from contract
  const tileStateByIndex = useMemo(() => {
    const map = new Map<number, string>();
    for (const tile of contract.board.tiles) {
      map.set(tile.index, tile.state);
    }
    return map;
  }, [contract.board.tiles]);

  const tokenTileIndex = contract.token.currentTileIndex;
  const tokenAnchor = TILE_ANCHORS[tokenTileIndex] ?? TILE_ANCHORS[0];
  const tokenPos = toScreen(tokenAnchor, boardSize.width, boardSize.height);

  const isMoving = contract.token.isMoving;

  const { canRoll, canClaimReward, canSpendEssence, canOpenStop } = contract.ui.flags;
  const { roll: busyRoll, claim: busyClaim } = contract.ui.busy;

  return (
    <div className="contract-board-renderer">
      {/* ── board scene ── */}
      <div
        ref={boardRef}
        className={`island-run-board island-run-board--framed island-run-board--focus island-run-board--${theme.sceneClass} ${!bgAvailable ? 'island-run-board--no-bg' : ''} contract-board-renderer__scene`}
        aria-label="Island Run board (read-only view)"
      >
        {bgAvailable && (
          <img
            key={bgSrc}
            className="island-run-board__bg"
            src={bgSrc}
            alt=""
            aria-hidden="true"
            onError={() => setBgAvailable(false)}
          />
        )}

        {theme.pathOverlayImage && (
          <img
            className="island-run-board__path-overlay"
            src={theme.pathOverlayImage}
            alt=""
            aria-hidden="true"
          />
        )}

        <canvas ref={canvasRef} className="island-run-board__path" />

        <div className="island-run-board__lap-label">{contract.board.tileCount}-tile lap</div>

        {/* tiles */}
        <div className="island-run-board__tiles">
          {TILE_ANCHORS.map((anchor, index) => {
            if (index >= contract.board.tileCount) return null;
            const position = toScreen(anchor, boardSize.width, boardSize.height);
            const tileState = tileStateByIndex.get(index) ?? 'default';
            const isStop = tileState !== 'default';
            const contractTile = contract.board.tiles[index];
            const tileType = contractTile?.type ?? '';
            const tileIcon = !isStop && tileType && TILE_TYPE_ICONS[tileType]
              ? TILE_TYPE_ICONS[tileType]
              : isStop
                ? (STOP_STATE_LABELS[tileState] ?? '⬛')
                : String(index + 1);

            return (
              <div
                key={anchor.id}
                className={`island-tile island-tile--${anchor.zBand} ${isStop ? `island-tile--stop island-tile--${tileState}` : ''} ${index === tokenTileIndex ? 'island-tile--token-current' : ''}`}
                style={{
                  left: position.x,
                  top: position.y,
                  transform: `translate(-50%, -50%) scale(${anchor.scale})`,
                }}
              >
                <span className="island-tile__value">{tileIcon}</span>
              </div>
            );
          })}

          {/* token */}
          <div
            className={`island-token ${isMoving ? 'island-token--moving' : ''} island-token--zband-${tokenAnchor.zBand ?? 'mid'}`}
            style={{ left: tokenPos.x, top: tokenPos.y }}
          >
            <div className="island-token__ship" aria-hidden="true">
              <div className="island-token__ship-body" />
              <div className="island-token__ship-fin island-token__ship-fin--left" />
              <div className="island-token__ship-fin island-token__ship-fin--right" />
              <div className="island-token__ship-thruster" />
              <div className="island-token__ship-window" />
            </div>
          </div>
        </div>

        <img
          className="island-run-board__depth-mask"
          src={theme.depthMaskImage}
          alt=""
          aria-hidden="true"
        />
      </div>

      {/* ── read-only HUD ── */}
      <div className="contract-board-renderer__hud" aria-label="Island Run read-only HUD">
        <div className="contract-board-renderer__hud-row">
          {/* Essence */}
          <div className="contract-board-renderer__hud-chip" aria-label={`Essence: ${contract.resources.essence.current}`}>
            <span aria-hidden="true">🔮</span>
            <span>{contract.resources.essence.current}</span>
          </div>

          {/* Reward bar */}
          <div
            className={`contract-board-renderer__hud-chip ${contract.rewardBar.isClaimable ? 'contract-board-renderer__hud-chip--claimable' : ''}`}
            aria-label={`Reward bar: ${contract.rewardBar.progress} / ${contract.rewardBar.nextThreshold}`}
          >
            <span aria-hidden="true">⭐</span>
            <span>{contract.rewardBar.progress}/{contract.rewardBar.nextThreshold}</span>
          </div>

          {/* Active stop */}
          {contract.stops.activeStop && (
            <div className="contract-board-renderer__hud-chip" aria-label={`Active stop: ${contract.stops.activeStop.type}`}>
              <span aria-hidden="true">📍</span>
              <span>{contract.stops.activeStop.type}</span>
            </div>
          )}
        </div>

        {/* Intent buttons — no-op in read-only mode, disabled when flag criteria not met */}
        <div className="contract-board-renderer__hud-actions" aria-label="Disabled intent buttons (read-only mode)">
          <button
            type="button"
            className="contract-board-renderer__intent-btn"
            disabled={!canRoll || busyRoll}
            aria-label="Roll dice (read-only)"
            onClick={() => onIntent({ type: 'roll_requested' })}
          >
            🎲 Roll{busyRoll ? '…' : ''}
          </button>

          <button
            type="button"
            className="contract-board-renderer__intent-btn"
            disabled={!canClaimReward || busyClaim}
            aria-label="Claim reward (read-only)"
            onClick={() => onIntent({ type: 'claim_reward_requested' })}
          >
            🎁 Claim
          </button>

          <button
            type="button"
            className="contract-board-renderer__intent-btn"
            disabled={!canOpenStop}
            aria-label="Open stop (read-only)"
            onClick={() => onIntent({ type: 'open_active_stop_requested' })}
          >
            🏝️ Stop
          </button>

          <button
            type="button"
            className="contract-board-renderer__intent-btn"
            disabled={!canSpendEssence}
            aria-label="Spend essence (read-only)"
            onClick={() => onIntent({ type: 'spend_essence_requested', amount: 1 })}
          >
            🔮 Build
          </button>
        </div>

        {/* Status badge — roll is wired; other intents remain no-op in this slice */}
        <p className="contract-board-renderer__readonly-badge" aria-live="polite">
          🎲 Roll wired · other intents no-op (flag: island_run_contract_renderer)
        </p>

        {/* Errors from contract */}
        {contract.ui.errors.length > 0 && (
          <ul className="contract-board-renderer__errors" aria-label="Renderer errors" role="alert">
            {contract.ui.errors.map((err) => (
              <li key={err.code} className="contract-board-renderer__error-item">
                [{err.scope}] {err.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
