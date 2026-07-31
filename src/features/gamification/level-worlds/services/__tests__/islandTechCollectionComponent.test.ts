// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { assert, type TestCase } from './testHarness';

const base = 'src/features/gamification/level-worlds/components';
const gridSource = readFileSync(`${base}/IslandTechGrid.tsx`, 'utf8');
const modalSource = readFileSync(`${base}/IslandTechCollectionModal.tsx`, 'utf8');
const celebrationSource = readFileSync(`${base}/IslandTechCompletionCelebration.tsx`, 'utf8');
const cssSource = readFileSync(`${base}/IslandTechCollectionModal.css`, 'utf8');
const boardSource = readFileSync(`${base}/IslandRunBoardPrototype.tsx`, 'utf8');

function includes(source: string, expected: string) {
  assert(source.includes(expected), `Missing ${expected}`);
}
function notIncludes(source: string, forbidden: string) {
  assert(!source.includes(forbidden), `Forbidden ${forbidden}`);
}

export const islandTechCollectionComponentTests: TestCase[] = [
  // ── Shared 3×3 image grid ──────────────────────────────────────────────────
  {
    name: 'grid renders actual per-fragment Concord images with sprite fallback positioning',
    run: () => {
      includes(gridSource, 'getTechnologyFragmentVisual');
      includes(gridSource, "backgroundSize: usesWholeGridSprite ? '300% 300%' : 'cover'");
      includes(gridSource, 'techCollectionCellBackgroundPosition');
      includes(gridSource, 'backgroundPosition');
    },
  },
  {
    name: 'grid stamps COLLECTED! on the newly collected slot only',
    run: () => {
      includes(gridSource, 'COLLECTED!');
      includes(gridSource, 'cellIndex === newSlotIndex');
      includes(gridSource, 'island-tech-grid__stamp');
    },
  },
  {
    name: 'grid uses a non-colour collected cue (checkmark) and graceful asset fallback',
    run: () => {
      includes(gridSource, 'island-tech-grid__check');
      includes(gridSource, '✓');
      includes(gridSource, 'onError={() => setAssetFailed(true)}');
      includes(gridSource, "data-asset-failed");
    },
  },
  {
    name: 'css tints uncollected cells dark/desaturated and restores collected cells',
    run: () => {
      includes(cssSource, 'grayscale(0.8) brightness(0.3) saturate(0.35) contrast(0.9)');
      includes(cssSource, 'grayscale(0) brightness(1) saturate(1) contrast(1)');
      includes(cssSource, '.island-tech-grid__cell--locked');
      includes(cssSource, '.island-tech-grid__cell--collected');
    },
  },
  {
    name: 'css disables animation under reduced-motion media query and data attribute',
    run: () => {
      includes(cssSource, '@media (prefers-reduced-motion: reduce)');
      includes(cssSource, "[data-reduced-motion='true']");
    },
  },

  // ── Fast pickup modal ──────────────────────────────────────────────────────
  {
    name: 'pickup modal has dialog semantics with an announced title',
    run: () => {
      ['role="dialog"', 'aria-modal="true"', 'aria-labelledby={titleId}'].forEach((n) => includes(modalSource, n));
      includes(modalSource, 'CONCORD FRAGMENT {result.collectedCount} / {TECH_COLLECTION_CELL_COUNT}');
      includes(modalSource, 'THE CONCORD');
    },
  },
  {
    name: 'pickup modal renders compact progress and auto-dismisses via its own timer',
    run: () => {
      includes(modalSource, '{gridCollectedCount} / {TECH_COLLECTION_CELL_COUNT}');
      includes(modalSource, 'window.setTimeout(() => dismissRef.current()');
      includes(modalSource, 'island-tech-fragment__collected-stamp');
    },
  },
  {
    name: 'pickup modal auto-closes for manual rollers too (not gated on auto-roll)',
    run: () => {
      // The close timer must run unconditionally — a manual pickup should place
      // the fragment and then close itself, using the longer manual dwell.
      includes(modalSource, 'MANUAL_CLOSE_MS');
      includes(modalSource, 'isAutoRolling ? AUTO_ROLL_CLOSE_MS : MANUAL_CLOSE_MS');
      notIncludes(modalSource, 'if (!isAutoRolling) return;');
    },
  },
  {
    name: 'pickup modal surfaces aggregated line-completion reward copy',
    run: () => {
      includes(modalSource, 'LINES COMPLETE');
      includes(modalSource, 'LINE COMPLETE');
      includes(modalSource, 'DICE');
    },
  },
  {
    name: 'pickup modal honours reduced-motion for its dwell + animation flag',
    run: () => {
      includes(modalSource, "matchMedia('(prefers-reduced-motion: reduce)')");
      includes(modalSource, 'data-reduced-motion');
    },
  },

  // ── Full-grid completion celebration ───────────────────────────────────────
  {
    name: 'celebration turns the completed grid into the active Concord and names its purpose',
    run: () => {
      includes(celebrationSource, 'THE CONCORD AWAKENS');
      includes(celebrationSource, '/tech/Concord_on.webp');
      includes(celebrationSource, 'THREE CHANNELS ONLINE');
      ['Creatures', 'Caretakers', 'Story'].forEach((channel) => includes(celebrationSource, channel));
    },
  },
  {
    name: 'celebration requires a deliberate activation and opens the useful Concord surface',
    run: () => {
      includes(celebrationSource, 'Open The Concord');
      includes(celebrationSource, 'onClick={() => onOpenConcord()}');
      includes(boardSource, 'setShowConcordHubModal(true);');
      notIncludes(celebrationSource, 'setTimeout');
    },
  },
  {
    name: 'celebration keeps the already-granted reward visible without overwhelming the unlock',
    run: () => {
      ['final line + full grid', 'full grid reward', 'totalRewardDice'].forEach((n) =>
        includes(celebrationSource, n),
      );
    },
  },
  {
    name: 'celebration has dialog semantics, keyboard-reachable continue, and restrained confetti',
    run: () => {
      ['role="dialog"', 'aria-modal="true"', 'aria-labelledby={titleId}'].forEach((n) =>
        includes(celebrationSource, n),
      );
      includes(celebrationSource, 'continueRef.current?.focus()');
      includes(celebrationSource, 'ConfettiBurst');
      includes(celebrationSource, 'lockPageScroll()');
    },
  },

  // ── Architecture isolation (presentation only) ─────────────────────────────
  {
    name: 'presentation components perform no gameplay writes',
    run: () => {
      [gridSource, modalSource, celebrationSource].forEach((source) => {
        ['setRuntimeState', 'applyTechCollectionState', 'applyTokenHopRewards', 'persistIslandRunRuntimeStatePatch'].forEach(
          (forbidden) => notIncludes(source, forbidden),
        );
      });
    },
  },

  // ── Board integration ──────────────────────────────────────────────────────
  {
    name: 'board renders the shared grid, animated pickup, and full completion celebration',
    run: () => {
      includes(boardSource, '<IslandTechGrid');
      includes(boardSource, '<IslandTechCompletionCelebration');
      includes(boardSource, '<IslandTechCollectionModal');
      notIncludes(boardSource, 'island-tech-collection-grid__cell');
    },
  },
  {
    name: 'board routes a newly completed full grid to the deliberate celebration',
    run: () => {
      includes(boardSource, 'resolution.isFullBoardNewlyCompleted');
      includes(boardSource, 'applyIslandRunTechnologyBuild({');
      includes(boardSource, 'if (!buildResult.changed) return true;');
      includes(boardSource, 'setTechCompletionCelebration({');
      includes(boardSource, 'fullBoardRewardDice: resolution.fullBoardRewardDice');
    },
  },
  {
    name: 'ordinary fragment landings automatically open the shared Concord grid',
    run: () => {
      includes(boardSource, '// Ordinary pickup: open the same Concord grid the controller uses.');
      includes(boardSource, 'setTechCollectionModal({');
      includes(boardSource, 'collectedCount: resolution.nextCollectedCount');
      includes(boardSource, 'setShowConcordHubModal(true);');
      includes(boardSource, '<IslandTechCollectionModal');
      includes(boardSource, 'result={techCollectionModal}');
      includes(boardSource, 'showConcordHubModal && !techCollectionModal');
    },
  },
  {
    name: 'incomplete Concord progress floats over the board without the device console',
    run: () => {
      includes(boardSource, 'island-concord-collection-backdrop');
      includes(boardSource, 'island-concord-collection-float');
      includes(boardSource, 'Tap to close.');
      includes(boardSource, "event.key === 'Enter' || event.key === ' ' || event.key === 'Escape'");
      includes(boardSource, '<span>Story Mode</span>');
      notIncludes(boardSource, 'Concord_off.webp');
    },
  },
  {
    name: 'board keeps reward authority in canonical actions and persists via the existing ledgers',
    run: () => {
      includes(boardSource, 'applyTokenHopRewards({');
      includes(boardSource, 'applyTechCollectionState({');
      includes(boardSource, 'getIslandTechnologyFragmentPlacement(islandNumber, landingTileIndex)');
      includes(boardSource, "triggerSource: 'tech_collection_grid_reward'");
    },
  },
  {
    name: 'board renders only visible fixed fragment tile objects instead of every eligible reward tile',
    run: () => {
      includes(boardSource, 'listVisibleTechnologyFragments(islandNumber, collectedTechTileIndices)');
      includes(boardSource, 'visibleTechnologyFragments={visibleTechnologyFragments}');
      includes(boardSource, 'getIslandTechnologyFragmentPlacement(islandNumber, landingTileIndex)');
      notIncludes(boardSource, 'resolveTechCollectionSlotIndex');
    },
  },
  {
    name: 'board lets Concord fragments collect before special tile routing can steal the landing',
    run: () => {
      includes(boardSource, 'const concordPickup = rollResult.concordFragmentPickup;');
      includes(boardSource, 'if (maybeCollectTechItem(');
      includes(boardSource, 'concordPickup?.reason,');
      includes(boardSource, "} else if (landedTile?.tileType === 'landmark_door' && landedTile.doorStopId)");
      includes(boardSource, 'const maybeCollectTechItem = useCallback((');
      includes(boardSource, "pickupReason: ConcordFragmentPickupReason = 'natural_landing'");
      includes(boardSource, 'if (resolution.isDuplicate) return false;');
    },
  },
  {
    name: 'board gates Island 1 departure behind The Concord unless dev clear is used',
    run: () => {
      includes(boardSource, "getIslandTechnologyAccess(runtimeState, 'the-concord').active");
      includes(boardSource, "source !== 'dev_clear_island'");
      includes(boardSource, 'Build The Concord from all 9 Island 1 fragments before finishing Island 1.');
    },
  },

];
