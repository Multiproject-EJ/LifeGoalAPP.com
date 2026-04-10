/**
 * BoardDiceControl — dice visualization + primary action control.
 *
 * Adapted from the board-repo Dice3D.tsx presentation direction.
 * Uses the transplanted Dice3D visual component, fed by contract dice/busy state.
 *
 * Pure presentation: receives contract snapshot, emits intents only.
 * No gameplay truth — dice outcome is provided by the contract, not generated here.
 */

import type { BoardRendererContractV1, BoardRendererContractV1Intent } from '../services/islandRunBoardRendererContractV1';
import { Dice3D } from './Dice3D';

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
  const step1 = stops.stopList[0];
  const step1Complete = Boolean(step1?.progress.objectiveComplete && step1?.progress.buildComplete);

  const rollBtnClass = [
    'board-dice-control__roll-btn',
    canRoll && !busyRoll ? 'board-dice-control__roll-btn--primary' : '',
    busyRoll ? 'board-dice-control__roll-btn--rolling' : '',
  ].filter(Boolean).join(' ');

  const rollLabel = busyRoll
    ? 'Rolling…'
    : canRoll
      ? `Roll (${resources.dicePool})`
      : !step1Complete
        ? 'Finish Hatchery'
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
            <Dice3D value={lastRolled?.dice[0] ?? 6} isRolling seed={1} />
            <Dice3D value={lastRolled?.dice[1] ?? 4} isRolling seed={2} />
            <span className="board-dice-control__roll-status" aria-live="polite">
              Rolling…
            </span>
          </>
        ) : lastRolled ? (
          /* Last roll result */
          <>
            {lastRolled.dice.map((val, i) => (
              <Dice3D
                key={i}
                value={val}
                isRolling={false}
                seed={i + 1}
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
            <Dice3D value={1} isRolling={false} seed={1} />
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
