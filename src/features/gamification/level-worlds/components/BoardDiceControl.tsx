/**
 * BoardDiceControl — dice visualization + primary action control for the
 * contract board renderer.
 *
 * Adapted from the board-repo Dice3D.tsx presentation target.
 * Pure presentation: receives contract snapshot, emits intents only.
 * No gameplay truth — dice outcome is provided by the contract, not generated here.
 */

import type { BoardRendererContractV1, BoardRendererContractV1Intent } from '../services/islandRunBoardRendererContractV1';

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Maps a die face value 1–6 to a Unicode die face emoji. */
function dieFaceEmoji(value: number): string {
  const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  return faces[(value - 1) % 6] ?? '🎲';
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

  // Build roll button label from state
  const rollLabel = busyRoll
    ? 'Rolling…'
    : canRoll
      ? `🎲 Roll (${resources.dicePool} dice)`
      : resources.dicePool === 0
        ? '🎲 Need dice'
        : '🎲 Roll';

  const rollBtnClass = [
    'board-dice-control__roll-btn',
    canRoll && !busyRoll ? 'board-dice-control__roll-btn--primary' : '',
    busyRoll ? 'board-dice-control__roll-btn--rolling' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="board-dice-control" aria-label="Dice and action controls">
      {/* ── dice display ──────────────────────────────────────────────────── */}
      <div className="board-dice-control__dice-area">
        {busyRoll ? (
          /* Rolling animation: show two spinning dice */
          <>
            <span
              className="board-dice-control__die board-dice-control__die--rolling"
              aria-label="Rolling…"
              aria-hidden="true"
            >
              🎲
            </span>
            <span
              className="board-dice-control__die board-dice-control__die--rolling board-dice-control__die--delay"
              aria-hidden="true"
            >
              🎲
            </span>
            <span className="board-dice-control__roll-status" aria-live="polite">
              Rolling…
            </span>
          </>
        ) : lastRolled ? (
          /* Last roll result display */
          <>
            {lastRolled.dice.map((val, i) => (
              <span
                key={i}
                className="board-dice-control__die board-dice-control__die--landed"
                aria-label={`Die ${i + 1}: ${val}`}
              >
                {dieFaceEmoji(val)}
              </span>
            ))}
            <span className="board-dice-control__roll-total" aria-label={`Total: ${lastRolled.total}`} aria-live="polite">
              = <strong>{lastRolled.total}</strong>
            </span>
          </>
        ) : (
          /* Idle: show dice pool count */
          <>
            <span className="board-dice-control__die board-dice-control__die--idle" aria-hidden="true">
              🎲
            </span>
            <span className="board-dice-control__pool-label" aria-label={`${resources.dicePool} dice available`}>
              <strong>{resources.dicePool}</strong>
              <span className="board-dice-control__pool-sub"> dice</span>
            </span>
          </>
        )}
      </div>

      {/* ── primary roll button ───────────────────────────────────────────── */}
      <button
        type="button"
        className={rollBtnClass}
        disabled={!canRoll || busyRoll}
        aria-label={rollLabel}
        onClick={() => onIntent({ type: 'roll_requested' })}
      >
        {rollLabel}
      </button>

      {/* ── secondary action buttons ─────────────────────────────────────── */}
      <div className="board-dice-control__secondary-actions">
        <button
          type="button"
          className="board-dice-control__action-btn"
          disabled={!canOpenStop}
          aria-label="Open active stop"
          onClick={() => onIntent({ type: 'open_active_stop_requested' })}
        >
          <span aria-hidden="true">
            {stops.activeStop.type === 'hatchery' ? '🥚'
              : stops.activeStop.type === 'boss' ? '👑'
              : '🏝️'}
          </span>
          <span>
            {stops.activeStop.type === 'hatchery' ? 'Hatchery'
              : stops.activeStop.type === 'boss' ? 'Boss'
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
