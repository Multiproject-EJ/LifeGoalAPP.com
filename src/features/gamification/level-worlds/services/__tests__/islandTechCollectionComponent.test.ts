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
    name: 'grid splits one coherent image with background-size 300% 300% positioned per slot',
    run: () => {
      includes(gridSource, "backgroundSize: '300% 300%'");
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
      includes(modalSource, 'TECH DISCOVERED');
    },
  },
  {
    name: 'pickup modal renders compact progress and auto-dismisses via its own timer',
    run: () => {
      includes(modalSource, '/ {TECH_COLLECTION_CELL_COUNT} components recovered');
      includes(modalSource, 'window.setTimeout(() => dismissRef.current()');
      includes(modalSource, 'Tap to dismiss');
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
    name: 'celebration uses a generic technology-restored title (no premature Concord state)',
    run: () => {
      includes(celebrationSource, 'TECHNOLOGY RESTORED!');
      notIncludes(celebrationSource, 'CONCORD');
      notIncludes(celebrationSource, 'Concord');
    },
  },
  {
    name: 'celebration requires a deliberate continue and does NOT auto-dismiss',
    run: () => {
      includes(celebrationSource, 'Claim &amp; Continue');
      includes(celebrationSource, 'onClick={() => onContinue()}');
      // No transient auto-dismiss timer that would close the celebration for the player.
      notIncludes(celebrationSource, 'setTimeout');
    },
  },
  {
    name: 'celebration shows the reward breakdown and matches granted totals',
    run: () => {
      ['Final line reward', 'Full collection', 'Total', 'fullBoardRewardDice', 'totalRewardDice'].forEach((n) =>
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
    name: 'board renders the new components and removes the legacy inline modal',
    run: () => {
      includes(boardSource, '<IslandTechCollectionModal');
      includes(boardSource, '<IslandTechCompletionCelebration');
      notIncludes(boardSource, 'island-tech-collection-grid__cell');
    },
  },
  {
    name: 'board routes a newly completed full grid to the deliberate celebration',
    run: () => {
      includes(boardSource, 'resolution.isFullBoardNewlyCompleted');
      includes(boardSource, 'setTechCompletionCelebration({');
      includes(boardSource, 'fullBoardRewardDice: resolution.fullBoardRewardDice');
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
];
