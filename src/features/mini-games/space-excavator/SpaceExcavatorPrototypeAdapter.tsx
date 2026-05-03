import React from 'react';

export interface SpaceExcavatorPrototypeAdapterResult {
  completed: boolean;
  reward?: {
    dice?: number;
    diamonds?: number;
    xp?: number;
  };
}

export interface SpaceExcavatorPrototypeAdapterProps {
  islandNumber: number;
  ticketBudget?: number;
  launchConfig?: Record<string, unknown>;
  onComplete?: (result: SpaceExcavatorPrototypeAdapterResult) => void;
  onClose?: () => void;
}

/**
 * Inert adapter seam for future Island Run integration.
 *
 * Intentionally does not import standalone prototype bootstraps (`main.tsx`, `App.tsx`),
 * does not import global CSS/theme files, and does not mutate gameplay economy/state.
 */
export function SpaceExcavatorPrototypeAdapter(props: SpaceExcavatorPrototypeAdapterProps): React.JSX.Element {
  const { islandNumber, ticketBudget, launchConfig, onComplete, onClose } = props;

  return (
    <section aria-label="Space Excavator Prototype Adapter" style={{ padding: 16 }}>
      <h2>Space Excavator prototype staged (not integrated)</h2>
      <p>
        This is a safe adapter placeholder. The standalone Treasure Dig prototype is intentionally not mounted yet.
      </p>
      <ul>
        <li>Island: {islandNumber}</li>
        <li>Ticket budget: {typeof ticketBudget === 'number' ? ticketBudget : 'n/a'}</li>
        <li>Launch config: {launchConfig ? 'provided' : 'none'}</li>
      </ul>

      <div style={{ display: 'flex', gap: 8 }}>
        {onComplete ? (
          <button type="button" onClick={() => onComplete({ completed: true })}>
            Complete
          </button>
        ) : null}
        {onClose ? (
          <button type="button" onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>
    </section>
  );
}
