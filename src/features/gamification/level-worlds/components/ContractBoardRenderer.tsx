/**
 * ContractBoardRenderer — rich presentation component (spark60 board).
 *
 * Receives a canonical BoardRendererContractV1 snapshot and renders the full
 * board presentation using the spark60 board layout (5-stop island map).
 *
 * Board scene is delegated to IslandBoardScene which directly replaces the
 * old 17-tile ellipse layout.
 *
 * Does not own or mutate gameplay truth.  All user-intent callbacks are
 * supplied by the host via `onIntent`.
 *
 * Feature flag: island_run_contract_renderer
 * Toggle: ?island_run_contract_renderer=1  OR  localStorage feature_flag_island_run_contract_renderer=1
 */

import { useMemo } from 'react';
import { getIslandBoardThemeForIslandNumber } from '../services/islandBoardThemes';
import { getIslandBackgroundImageSrc } from '../services/islandBackgrounds';
import type {
  BoardRendererContractV1,
  BoardRendererContractV1Intent,
} from '../services/islandRunBoardRendererContractV1';
import { BoardGameHUD } from './BoardGameHUD';
import { BoardProgressMeter } from './BoardProgressMeter';
import { BoardDiceControl } from './BoardDiceControl';
import { IslandBoardScene } from './IslandBoardScene';

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
  const theme = useMemo(() => getIslandBoardThemeForIslandNumber(islandNumber), [islandNumber]);
  const bgSrc = useMemo(() => getIslandBackgroundImageSrc(islandNumber), [islandNumber]);

  const { canClaimReward } = contract.ui.flags;
  const { roll: busyRoll, claim: busyClaim } = contract.ui.busy;

  return (
    <div className="contract-board-renderer">
      {/* ── GameHUD: top bar with resources + stop info ── */}
      <BoardGameHUD contract={contract} islandNumber={islandNumber} />

      {/* ── Board scene: spark60 island map ── */}
      <div
        className={`island-run-board island-run-board--framed island-run-board--focus island-run-board--${theme.sceneClass} contract-board-renderer__scene`}
        aria-label="Island Run board"
        style={{
          backgroundImage: bgSrc ? `url(${bgSrc})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {theme.pathOverlayImage && (
          <img
            className="island-run-board__path-overlay"
            src={theme.pathOverlayImage}
            alt=""
            aria-hidden="true"
          />
        )}

        {/* New spark60 board scene — replaces old 17-tile canvas renderer */}
        <IslandBoardScene
          contract={contract}
          onIntent={onIntent}
          isRolling={busyRoll}
        />

        <img
          className="island-run-board__depth-mask"
          src={theme.depthMaskImage}
          alt=""
          aria-hidden="true"
        />
      </div>

      {/* ── ProgressMeter: reward bar ── */}
      <BoardProgressMeter
        rewardBar={contract.rewardBar}
        event={contract.event}
        busyClaim={busyClaim}
        canClaim={canClaimReward}
        onIntent={onIntent}
      />

      {/* ── DiceControl: dice visualization + actions ── */}
      <BoardDiceControl contract={contract} onIntent={onIntent} />

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
  );
}
