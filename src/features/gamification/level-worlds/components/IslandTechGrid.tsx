import { useState } from 'react';
import {
  TECH_COLLECTION_CELL_COUNT,
  TECH_COLLECTION_IMAGE_SRC,
  TECH_COLLECTION_LINES,
  techCollectionCellBackgroundPosition,
} from '../services/islandRunTechCollection';

/**
 * IslandTechGrid — the shared 3×3 technology image grid.
 *
 * One coherent technology image is drawn into every cell at
 * `background-size: 300% 300%` and positioned per-slot, so the nine cells
 * reassemble one image. Uncollected cells are tinted dark/desaturated; collected
 * cells are restored to full colour; the freshly collected cell animates from
 * dark → scan → restored and receives a COLLECTED! stamp. Reduced-motion callers
 * get the settled state immediately (no pulse/stamp animation).
 *
 * Presentation only — no gameplay state, no I/O. If the image asset fails to
 * load, every cell falls back to a readable solid treatment and a per-cell
 * checkmark so collected state never depends on the artwork.
 */

export interface IslandTechGridProps {
  /** Slots collected (0–8). Order-independent. */
  collectedSlots: readonly number[];
  /** The slot collected on this pickup, highlighted + stamped. Null when none. */
  newSlotIndex?: number | null;
  /** Line indices (0–7) to highlight as freshly completed. */
  completedLines?: readonly number[];
  /** When true the whole grid reads as fully restored + glowing (celebration). */
  fullyRestored?: boolean;
  reducedMotion?: boolean;
  imageSrc?: string;
}

export function IslandTechGrid(props: IslandTechGridProps) {
  const {
    collectedSlots,
    newSlotIndex = null,
    completedLines = [],
    fullyRestored = false,
    reducedMotion = false,
    imageSrc = TECH_COLLECTION_IMAGE_SRC,
  } = props;

  const [assetFailed, setAssetFailed] = useState(false);
  const collected = new Set(collectedSlots);
  const lineCells = new Set<number>();
  completedLines.forEach((lineIndex) => {
    const line = TECH_COLLECTION_LINES[lineIndex] as readonly number[] | undefined;
    line?.forEach((cell) => lineCells.add(cell));
  });

  return (
    <div
      className="island-tech-grid"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-fully-restored={fullyRestored ? 'true' : 'false'}
      data-asset-failed={assetFailed ? 'true' : 'false'}
      role="img"
      aria-label={`Technology grid, ${collected.size} of ${TECH_COLLECTION_CELL_COUNT} components recovered`}
    >
      {/* Single hidden probe image: drives the graceful fallback if the asset 404s. */}
      {!assetFailed ? (
        <img
          src={imageSrc}
          alt=""
          aria-hidden="true"
          className="island-tech-grid__probe"
          onError={() => setAssetFailed(true)}
        />
      ) : null}
      {Array.from({ length: TECH_COLLECTION_CELL_COUNT }, (_, cellIndex) => {
        const isCollected = fullyRestored || collected.has(cellIndex);
        const isNew = cellIndex === newSlotIndex;
        const isLine = lineCells.has(cellIndex);
        const position = techCollectionCellBackgroundPosition(cellIndex);
        return (
          <span
            key={cellIndex}
            className={[
              'island-tech-grid__cell',
              isCollected ? 'island-tech-grid__cell--collected' : 'island-tech-grid__cell--locked',
              isNew ? 'island-tech-grid__cell--new' : '',
              isLine ? 'island-tech-grid__cell--line' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={
              assetFailed
                ? undefined
                : {
                    backgroundImage: `url("${imageSrc}")`,
                    backgroundSize: '300% 300%',
                    backgroundPosition: `${position.x}% ${position.y}%`,
                  }
            }
          >
            {/* Tint/scan veil over the artwork; CSS clears it for collected cells. */}
            <span className="island-tech-grid__veil" aria-hidden="true" />
            {/* Non-colour state cue: a checkmark for collected cells (a11y). */}
            {isCollected ? (
              <span className="island-tech-grid__check" aria-hidden="true">
                ✓
              </span>
            ) : (
              <span className="island-tech-grid__lock" aria-hidden="true">
                ?
              </span>
            )}
            {isNew ? (
              <span className="island-tech-grid__stamp" aria-hidden="true">
                COLLECTED!
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
