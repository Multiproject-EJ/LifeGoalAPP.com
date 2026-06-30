// @ts-expect-error Node types are intentionally absent from the lightweight Island Run test tsconfig.
import { readFileSync } from 'node:fs';
import { assert, type TestCase } from './testHarness';

const boardTile = readFileSync('src/features/gamification/level-worlds/components/board/BoardTile.tsx', 'utf8');
const boardTileGrid = readFileSync('src/features/gamification/level-worlds/components/board/BoardTileGrid.tsx', 'utf8');
const prototype = readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
const css = readFileSync('src/features/gamification/level-worlds/LevelWorlds.css', 'utf8');

function assertIncludes(source: string, expected: string, message: string) {
  assert(source.includes(expected), message);
}

export const islandRunTechnologyFragmentRenderingGuardTests: TestCase[] = [
  {
    name: 'BoardTile renders decorative slot-specific fragment emoji, not a separate interactive target',
    run: () => {
      assertIncludes(boardTile, 'technologyFragment?: VisibleTechnologyFragment', 'BoardTile must receive full fragment identity');
      assertIncludes(boardTile, 'data-fragment-slot={technologyFragment.fragmentSlot}', 'fragment slot must be rendered for deterministic styling/tests');
      assertIncludes(boardTile, '{technologyFragment.placeholder}', 'emoji must come from fragment placeholder data');
      assertIncludes(boardTile, 'aria-hidden="true"', 'emoji pop-out remains decorative');
      assertIncludes(boardTile, 'aria-label={technologyFragment ? `Tile ${index + 1}. ${technologyFragment.ariaLabel}` : undefined}', 'tile exposes accessible fragment availability');
      assert(!boardTile.includes('island-tile__popout--${tileType}`'), 'generic tile-type pop-out renderer should not be used for technology fragments');
    },
  },
  {
    name: 'Board data flow passes visible fragment records instead of booleans',
    run: () => {
      assertIncludes(prototype, 'listVisibleTechnologyFragments(islandNumber, collectedTechTileIndices)', 'prototype derives canonical visible fragment records');
      assertIncludes(prototype, 'visibleTechnologyFragments={visibleTechnologyFragments}', 'BoardStage receives fragment records');
      assertIncludes(boardTileGrid, 'new Map(visibleTechnologyFragments.map((fragment) => [fragment.tileIndex, fragment]))', 'grid indexes records by fixed tile');
      assertIncludes(boardTileGrid, 'technologyFragment={technologyFragment}', 'tile receives record for its assigned slot');
    },
  },
  {
    name: 'fragment CSS provides hover depth, pointer safety, z-index below token, and reduced motion',
    run: () => {
      assertIncludes(css, '.island-tile__popout--technology-fragment', 'fragment CSS class exists');
      assertIncludes(css, 'pointer-events: none;', 'fragment cannot block tile taps or swipes');
      assertIncludes(css, 'z-index: 4;', 'fragment z-index stays below token z-index 10');
      assertIncludes(css, 'animation-delay: var(--fragment-animation-delay, 0s);', 'fragment uses deterministic slot animation offsets');
      assertIncludes(css, '@keyframes island-technology-fragment-hover', 'hover bob animation exists');
      assertIncludes(css, '@media (prefers-reduced-motion: reduce)', 'reduced-motion media query exists');
      assertIncludes(css, 'animation: none;', 'reduced motion disables animations');
    },
  },
];
