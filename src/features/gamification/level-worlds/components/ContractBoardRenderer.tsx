/**
 * ContractBoardRenderer — rich presentation component (spark60 board).
 *
 * Receives a canonical BoardRendererContractV1 snapshot and renders the full
 * board presentation using the spark60 board layout (5-stop island map).
 *
 * Does not own or mutate gameplay truth. All user-intent callbacks are
 * supplied by the host via `onIntent`.
 */

import { useMemo } from 'react';
import { getIslandBoardThemeForIslandNumber } from '../services/islandBoardThemes';
import { getIslandBackgroundImageSrc } from '../services/islandBackgrounds';
import type {
  BoardRendererContractV1,
  BoardRendererContractV1Intent,
} from '../services/islandRunBoardRendererContractV1';
import { TransplantedGameHUD } from './TransplantedGameHUD';
import { TransplantedBoardScene } from './TransplantedBoardScene';

export interface ContractBoardRendererProps {
  contract: BoardRendererContractV1;
  onIntent: (intent: BoardRendererContractV1Intent) => void;
  islandNumber: number;
}

export function ContractBoardRenderer({
  contract,
  onIntent,
  islandNumber,
}: ContractBoardRendererProps) {
  const theme = useMemo(() => getIslandBoardThemeForIslandNumber(islandNumber), [islandNumber]);
  const bgSrc = useMemo(() => getIslandBackgroundImageSrc(islandNumber), [islandNumber]);

  return (
    <div className="contract-board-renderer">
      <TransplantedGameHUD contract={contract} onIntent={onIntent} islandNumber={islandNumber} />

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

        <TransplantedBoardScene contract={contract} onIntent={onIntent} />

        <img
          className="island-run-board__depth-mask"
          src={theme.depthMaskImage}
          alt=""
          aria-hidden="true"
        />
      </div>

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
