/**
 * IslandBoardScene — transplanted board scene for the spark60 board layout.
 *
 * Replaces the old 17-tile ellipse (TILE_ANCHORS) with the full 60-tile
 * spark board: five prominent stop nodes connected by segments of path tiles.
 *
 * Structure (adapted from board-repo board scene direction):
 *   - SVG layer: smooth Bezier path lines connecting all tile positions
 *   - Stop nodes: five large hexagonal nodes (hatchery / minigame / market / utility / boss)
 *   - Path tiles: 55 small circle dots for non-stop tiles
 *   - Player token: ship token positioned at current tile
 *
 * Architecture: purely presentational — receives contract data, emits tile_tapped /
 * stop_tapped intents only. No gameplay truth.
 */

import { useMemo, useState, useEffect, useRef } from 'react';
import type React from 'react';
import {
  TILE_ANCHORS_60,
  STOP_TILE_INDICES_60,
  CANONICAL_BOARD_SIZE,
} from '../services/islandBoardLayout';
import type {
  BoardRendererContractV1,
  BoardRendererContractV1Intent,
  BoardRendererContractV1StopId,
} from '../services/islandRunBoardRendererContractV1';

// ─── constants ────────────────────────────────────────────────────────────────

/** Map stop tile index → stop identity metadata for rendering. */
const STOP_META: Record<number, { id: string; icon: string; label: string; colorClass: string }> = {
  0:  { id: 'hatchery', icon: '🥚', label: 'Hatchery', colorClass: 'stop-hatchery' },
  12: { id: 'minigame', icon: '🎮', label: 'Minigame', colorClass: 'stop-minigame' },
  24: { id: 'market',   icon: '🛒', label: 'Market',   colorClass: 'stop-market' },
  36: { id: 'utility',  icon: '🔧', label: 'Utility',  colorClass: 'stop-utility' },
  59: { id: 'boss',     icon: '👑', label: 'Boss',     colorClass: 'stop-boss' },
};

const TILE_TYPE_ICONS: Record<string, string> = {
  currency:  '🪙',
  chest:     '📦',
  event:     '⚡',
  hazard:    '☠️',
  egg_shard: '🧩',
  micro:     '✨',
  encounter: '⚔️',
};

/** Set of stop tile indices for fast lookup. */
const STOP_INDEX_SET = new Set<number>(STOP_TILE_INDICES_60);

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Convert canonical 1000×1000 coord → pixel position inside the scene element. */
function toScreen(cx: number, cy: number, w: number, h: number) {
  return {
    x: (cx / CANONICAL_BOARD_SIZE.width) * w,
    y: (cy / CANONICAL_BOARD_SIZE.height) * h,
  };
}

/**
 * Build a smooth SVG cubic-bezier path string (Catmull-Rom style) through
 * the given screen-space points.  Adjacent control points are computed as
 * 1/6 of the chord between the neighbours so the path passes through every
 * point without overshooting.
 */
function buildSvgPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length < 2) return '';
  const d: string[] = [`M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`];
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const prev = pts[Math.max(0, i - 2)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const cp1x = p0.x + (p1.x - prev.x) / 6;
    const cp1y = p0.y + (p1.y - prev.y) / 6;
    const cp2x = p1.x - (next.x - p0.x) / 6;
    const cp2y = p1.y - (next.y - p0.y) / 6;
    d.push(
      `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`
    );
  }
  return d.join(' ');
}

// ─── types ────────────────────────────────────────────────────────────────────

export interface IslandBoardSceneProps {
  contract: BoardRendererContractV1;
  onIntent: (intent: BoardRendererContractV1Intent) => void;
  /** Whether a roll is currently in progress (shows overlay). */
  isRolling: boolean;
}

// ─── component ───────────────────────────────────────────────────────────────

export function IslandBoardScene({ contract, onIntent, isRolling }: IslandBoardSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 360, h: 520 });

  // Track container dimensions for responsive tile placement
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const e = entries[0];
      if (e) setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { w, h } = size;

  // Pre-compute screen positions for all 60 tiles
  const screenPos = useMemo(
    () => TILE_ANCHORS_60.map((a) => toScreen(a.x, a.y, w, h)),
    [w, h],
  );

  // Build tile state lookup from contract
  const tileStateByIndex = useMemo(() => {
    const map = new Map<number, { state: string; type: string }>();
    for (const tile of contract.board.tiles) {
      map.set(tile.index, { state: tile.state, type: tile.type });
    }
    return map;
  }, [contract.board.tiles]);

  // Build stop status lookup: tileIndex → stop status from stopList
  const stopStatusByTileIndex = useMemo(() => {
    const map = new Map<number, { status: string; type: string; id: string }>();
    for (const stop of contract.stops.stopList) {
      map.set(stop.index, { status: stop.status, type: stop.type, id: stop.id });
    }
    return map;
  }, [contract.stops.stopList]);

  const tokenIdx = contract.token.currentTileIndex;
  const clampedTokenIdx = Math.max(0, Math.min(59, tokenIdx));
  const tokenPos = screenPos[clampedTokenIdx] ?? screenPos[0];
  const tokenAnchor = TILE_ANCHORS_60[clampedTokenIdx] ?? TILE_ANCHORS_60[0];
  const isMoving = contract.token.isMoving;

  // SVG path through all tile positions
  const pathD = useMemo(() => buildSvgPath(screenPos), [screenPos]);

  return (
    <div
      ref={containerRef}
      className="island-board-v2"
      aria-label="Island Run board"
    >
      {/* ── SVG path layer ─────────────────────────────────────────────── */}
      <svg
        className="island-board-v2__svg"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        aria-hidden="true"
      >
        {/* shadow/glow track */}
        <path
          d={pathD}
          fill="none"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* main track */}
        <path
          d={pathD}
          fill="none"
          stroke="rgba(180,238,255,0.28)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6 10"
        />
      </svg>

      {/* ── Path tiles (non-stop tiles) ────────────────────────────────── */}
      <div className="island-board-v2__tiles" aria-hidden="true">
        {TILE_ANCHORS_60.map((anchor, idx) => {
          if (STOP_INDEX_SET.has(idx)) return null; // stops rendered separately
          const pos = screenPos[idx];
          const tileData = tileStateByIndex.get(idx);
          const tileType = tileData?.type ?? '';
          const isCurrentTile = idx === clampedTokenIdx;
          const icon = TILE_TYPE_ICONS[tileType] ?? null;

          return (
            <button
              key={anchor.id}
              type="button"
              className={[
                'island-path-tile',
                `island-path-tile--${anchor.zBand}`,
                isCurrentTile ? 'island-path-tile--current' : '',
                tileType ? `island-path-tile--${tileType}` : '',
              ].filter(Boolean).join(' ')}
              style={{
                left: pos.x,
                top: pos.y,
                '--tile-s': anchor.scale,
              } as React.CSSProperties}
              aria-label={`Tile ${idx + 1}${icon ? ` (${tileType})` : ''}`}
              onClick={() => onIntent({ type: 'tile_tapped', tileId: anchor.id })}
            >
              {icon && <span className="island-path-tile__icon">{icon}</span>}
            </button>
          );
        })}
      </div>

      {/* ── Stop nodes ────────────────────────────────────────────────── */}
      <div className="island-board-v2__stops">
        {STOP_TILE_INDICES_60.map((stopIdx, rank) => {
          const meta = STOP_META[stopIdx];
          if (!meta) return null;
          const pos = screenPos[stopIdx];
          const anchor = TILE_ANCHORS_60[stopIdx];
          if (!pos || !anchor) return null;
          const stopState = stopStatusByTileIndex.get(stopIdx);
          const status = stopState?.status ?? 'locked';
          const isActiveStop = contract.stops.activeStop?.index === rank;
          const isCurrentTile = stopIdx === clampedTokenIdx;

          return (
            <button
              key={meta.id}
              type="button"
              className={[
                'island-stop-node',
                `island-stop-node--${meta.colorClass}`,
                `island-stop-node--${status}`,
                isActiveStop ? 'island-stop-node--active' : '',
                isCurrentTile ? 'island-stop-node--current' : '',
              ].filter(Boolean).join(' ')}
              style={{
                left: pos.x,
                top: pos.y,
                '--tile-s': anchor.scale,
              } as React.CSSProperties}
              aria-label={`${meta.label} stop (${status})`}
              onClick={() => onIntent({ type: 'stop_tapped', stopId: meta.id as BoardRendererContractV1StopId })}
            >
              <span className="island-stop-node__icon" aria-hidden="true">{meta.icon}</span>
              <span className="island-stop-node__label">{meta.label}</span>
              {isActiveStop && (
                <span className="island-stop-node__badge" aria-hidden="true">▶</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Player token ──────────────────────────────────────────────── */}
      <div
        className={[
          'island-token-v2',
          isMoving ? 'island-token-v2--moving' : '',
          `island-token-v2--${tokenAnchor.zBand}`,
        ].filter(Boolean).join(' ')}
        style={{ left: tokenPos.x, top: tokenPos.y }}
        aria-label={`Player at tile ${clampedTokenIdx + 1}`}
      >
        {/* Ship body */}
        <div className="island-token-v2__ship" aria-hidden="true">
          <div className="island-token-v2__body" />
          <div className="island-token-v2__fin island-token-v2__fin--left" />
          <div className="island-token-v2__fin island-token-v2__fin--right" />
          <div className="island-token-v2__thruster" />
          <div className="island-token-v2__window" />
        </div>
      </div>

      {/* ── Lap / tile counter ────────────────────────────────────────── */}
      <div className="island-board-v2__lap-badge" aria-label={`Tile ${clampedTokenIdx + 1} of ${contract.board.tileCount}`}>
        <span className="island-board-v2__lap-tile">{clampedTokenIdx + 1}</span>
        <span className="island-board-v2__lap-sep">/</span>
        <span className="island-board-v2__lap-total">{contract.board.tileCount}</span>
      </div>

      {/* ── Rolling overlay ───────────────────────────────────────────── */}
      {isRolling && (
        <div className="island-board-v2__roll-overlay" aria-live="polite" aria-label="Rolling dice…">
          <span className="island-board-v2__roll-dice" aria-hidden="true">🎲</span>
          <span>Rolling…</span>
        </div>
      )}
    </div>
  );
}
