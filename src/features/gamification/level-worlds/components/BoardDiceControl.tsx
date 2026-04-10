/**
 * BoardDiceControl — dice visualization + primary action control.
 *
 * Adapted from the board-repo Dice3D.tsx presentation direction.
 * Shows styled CSS dice faces instead of emoji, with animation on roll.
 *
 * Pure presentation: receives contract snapshot, emits intents only.
 * No gameplay truth — dice outcome is provided by the contract, not generated here.
 */

import type { BoardRendererContractV1, BoardRendererContractV1Intent } from '../services/islandRunBoardRendererContractV1';

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Dot positions for each die face value 1–6.
 *  Each tuple is [col, row] in a 3×3 grid (0-indexed). */
const DOT_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

interface DieFaceProps {
  value: number;
  isRolling?: boolean;
  isLanded?: boolean;
  isIdle?: boolean;
  label?: string;
}

function DieFace({ value, isRolling, isLanded, isIdle, label }: DieFaceProps) {
  const dots = DOT_POSITIONS[Math.max(1, Math.min(6, value))] ?? DOT_POSITIONS[1];
  const cls = [
    'dice-face',
    isRolling ? 'dice-face--rolling' : '',
    isLanded ? 'dice-face--landed' : '',
    isIdle ? 'dice-face--idle' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} aria-label={label ?? `Die: ${value}`} role="img">
      <div className="dice-face__grid" aria-hidden="true">
        {dots.map(([col, row], i) => (
          <span
            key={i}
            className="dice-face__dot"
            style={{
              gridColumn: col + 1,
              gridRow: row + 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── types ────────────────────────────────────────────────────────────────────

export interface BoardDiceControlProps {
  contract: BoardRendererContractV1;
  onIntent: (intent: BoardRendererContractV1Intent) => void;
}

// ─── component ───────────────────────────────────────────────────────────────

export function BoardDiceControl({ contract, onIntent }: BoardDiceControlProps) {
  const { ui, resources, stops, lastRolled } = contract;
  const { canRoll, canOpenStop, canSpendEssence } = ui.flags;
  const { roll: busyRoll } = ui.busy;

  const rollBtnClass = [
    'board-dice-control__roll-btn',
    canRoll && !busyRoll ? 'board-dice-control__roll-btn--primary' : '',
    busyRoll ? 'board-dice-control__roll-btn--rolling' : '',
  ].filter(Boolean).join(' ');

  const rollLabel = busyRoll
    ? 'Rolling…'
    : canRoll
      ? `Roll (${resources.dicePool})`
      : resources.dicePool === 0
        ? 'Need dice'
        : 'Roll';

  return (
    <div className="board-dice-control" aria-label="Dice and action controls">
      {/* ── dice display ──────────────────────────────────────────────── */}
      <div className="board-dice-control__dice-area">
        {busyRoll ? (
          /* Rolling animation: two dice spinning */
          <>
            <DieFace value={3} isRolling label="Rolling…" />
            <DieFace value={5} isRolling isIdle label="Rolling…" />
            <span className="board-dice-control__roll-status" aria-live="polite">
              Rolling…
            </span>
          </>
        ) : lastRolled ? (
          /* Last roll result */
          <>
            {lastRolled.dice.map((val, i) => (
              <DieFace
                key={i}
                value={val}
                isLanded
                label={`Die ${i + 1}: ${val}`}
              />
            ))}
            <span
              className="board-dice-control__roll-total"
              aria-label={`Total: ${lastRolled.total}`}
              aria-live="polite"
            >
              ={' '}<strong>{lastRolled.total}</strong>
            </span>
          </>
        ) : (
          /* Idle: pool count */
          <>
            <DieFace value={1} isIdle label={`${resources.dicePool} dice available`} />
            <span className="board-dice-control__pool-label" aria-label={`${resources.dicePool} dice`}>
              <strong>{resources.dicePool}</strong>
              <span className="board-dice-control__pool-sub"> dice</span>
            </span>
          </>
        )}
      </div>

      {/* ── primary roll button ───────────────────────────────────────── */}
      <button
        type="button"
        className={rollBtnClass}
        disabled={!canRoll || busyRoll}
        aria-label={rollLabel}
        onClick={() => onIntent({ type: 'roll_requested' })}
      >
        {busyRoll && <span className="board-dice-control__roll-spinner" aria-hidden="true" />}
        {rollLabel}
      </button>

      {/* ── secondary actions ────────────────────────────────────────── */}
      <div className="board-dice-control__secondary-actions">
        <button
          type="button"
          className="board-dice-control__action-btn"
          disabled={!canOpenStop}
          aria-label="Open active stop"
          onClick={() => onIntent({ type: 'open_active_stop_requested' })}
        >
          <span aria-hidden="true">
            {stops.activeStop?.type === 'hatchery' ? '🥚'
              : stops.activeStop?.type === 'boss' ? '👑'
              : '🏝️'}
          </span>
          <span>
            {stops.activeStop?.type === 'hatchery' ? 'Hatchery'
              : stops.activeStop?.type === 'boss' ? 'Boss'
              : 'Stop'}
          </span>
        </button>

        <button
          type="button"
          className="board-dice-control__action-btn"
          disabled={!canSpendEssence}
          aria-label="Build with essence"
          onClick={() => onIntent({ type: 'spend_essence_requested', amount: 1 })}
        >
          <span aria-hidden="true">🔮</span>
          <span>Build</span>
        </button>
      </div>
    </div>
  );
}
