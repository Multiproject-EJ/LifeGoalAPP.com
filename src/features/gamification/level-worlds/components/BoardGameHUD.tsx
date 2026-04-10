/**
 * BoardGameHUD — rich top HUD bar for the contract board renderer.
 *
 * Adapted from the board-repo GameHUD.tsx presentation target.
 * Pure presentation: receives contract snapshot + islandNumber, emits no intents.
 * No gameplay truth — all values come from the BoardRendererContractV1 contract.
 */

import type { BoardRendererContractV1 } from '../services/islandRunBoardRendererContractV1';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Ended';
  const totalMin = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const STOP_TYPE_ICONS: Record<string, string> = {
  hatchery: '🥚',
  habit: '📋',
  breathing: '🌬️',
  wisdom: '📖',
  boss: '👑',
};

const STOP_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  completed: 'Done',
  locked: 'Locked',
};

// ─── types ────────────────────────────────────────────────────────────────────

export interface BoardGameHUDProps {
  contract: BoardRendererContractV1;
  islandNumber: number;
}

// ─── component ───────────────────────────────────────────────────────────────

export function BoardGameHUD({ contract, islandNumber }: BoardGameHUDProps) {
  const { resources, rewardBar, stops, event, ui } = contract;
  const activeStop = stops.activeStop;
  const stopIcon = STOP_TYPE_ICONS[activeStop.type] ?? '📍';
  const stopStatusLabel = STOP_STATUS_LABELS[activeStop.status] ?? activeStop.status;
  const busyRoll = ui.busy.roll;

  return (
    <div className="board-hud" aria-label="Game HUD">
      {/* ── top row: island + resources ──────────────────────────────────── */}
      <div className="board-hud__top-row">
        <div className="board-hud__island-chip" aria-label={`Island ${islandNumber}`}>
          <span className="board-hud__island-icon" aria-hidden="true">🌊</span>
          <span className="board-hud__island-label">Island {islandNumber}</span>
        </div>

        <div className="board-hud__resources" role="list" aria-label="Resources">
          <span
            className="board-hud__res-chip board-hud__res-chip--hearts"
            role="listitem"
            aria-label={`Hearts: ${resources.hearts}`}
          >
            <span aria-hidden="true">❤️</span>
            <strong>{resources.hearts}</strong>
          </span>

          <span
            className={`board-hud__res-chip board-hud__res-chip--dice${busyRoll ? ' board-hud__res-chip--busy' : ''}`}
            role="listitem"
            aria-label={`Dice: ${resources.dicePool}`}
          >
            <span aria-hidden="true">🎲</span>
            <strong>{resources.dicePool}</strong>
          </span>

          <span
            className="board-hud__res-chip board-hud__res-chip--coins"
            role="listitem"
            aria-label={`Coins: ${resources.coins}`}
          >
            <span aria-hidden="true">🪙</span>
            <strong>{resources.coins}</strong>
          </span>

          <span
            className="board-hud__res-chip board-hud__res-chip--essence"
            role="listitem"
            aria-label={`Essence: ${resources.essence.current}`}
          >
            <span aria-hidden="true">🔮</span>
            <strong>{resources.essence.current}</strong>
          </span>

          {resources.spinTokens > 0 && (
            <span
              className="board-hud__res-chip board-hud__res-chip--spin"
              role="listitem"
              aria-label={`Spin tokens: ${resources.spinTokens}`}
            >
              <span aria-hidden="true">🌀</span>
              <strong>{resources.spinTokens}</strong>
            </span>
          )}
        </div>
      </div>

      {/* ── second row: active stop + event timer ────────────────────────── */}
      <div className="board-hud__info-row">
        <div
          className={`board-hud__stop-chip board-hud__stop-chip--${activeStop.status}`}
          aria-label={`Active stop: ${activeStop.type} (${stopStatusLabel})`}
        >
          <span aria-hidden="true">{stopIcon}</span>
          <span className="board-hud__stop-name">
            {activeStop.type.charAt(0).toUpperCase() + activeStop.type.slice(1)}
          </span>
          <span className="board-hud__stop-status">{stopStatusLabel}</span>
          <span className="board-hud__stop-index">
            {activeStop.index + 1}/5
          </span>
        </div>

        {event.active && (
          <div
            className="board-hud__event-chip"
            aria-label={`Active event: ${event.label}, ends in ${formatRemaining(event.remainingMs)}`}
          >
            <span aria-hidden="true">⏳</span>
            <span className="board-hud__event-label">{event.label}</span>
            <span className="board-hud__event-timer">{formatRemaining(event.remainingMs)}</span>
          </div>
        )}

        {/* reward bar claimable indicator */}
        {rewardBar.isClaimable && (
          <div className="board-hud__claimable-badge" aria-live="polite">
            <span aria-hidden="true">🎁</span>
            <span>Reward ready!</span>
          </div>
        )}
      </div>
    </div>
  );
}
