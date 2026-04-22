import type { IslandRunControllerIntent } from '../services/islandRunMinigameTypes';

interface ShooterControllerAdapterProps {
  disabled?: boolean;
  onIntent: (intent: IslandRunControllerIntent) => void;
}

export function ShooterControllerAdapter({ disabled = false, onIntent }: ShooterControllerAdapterProps) {
  return (
    <div className="island-run-shooter-controller" role="group" aria-label="Shooter controls">
      <button
        type="button"
        className="island-run-shooter-controller__btn"
        onClick={() => onIntent('left')}
        disabled={disabled}
        aria-label="Move ship left"
      >
        ◀ Left
      </button>
      <button
        type="button"
        className="island-run-shooter-controller__btn island-run-shooter-controller__btn--fire"
        onClick={() => onIntent('fire')}
        disabled={disabled}
        aria-label="Fire"
      >
        🔥 Fire
      </button>
      <button
        type="button"
        className="island-run-shooter-controller__btn"
        onClick={() => onIntent('right')}
        disabled={disabled}
        aria-label="Move ship right"
      >
        Right ▶
      </button>
    </div>
  );
}
