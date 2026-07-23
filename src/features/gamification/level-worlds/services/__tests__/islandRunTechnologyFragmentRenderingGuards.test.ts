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
    name: 'BoardTile exposes fragment availability while the grid renders the decorative overlay',
    run: () => {
      assertIncludes(boardTile, 'technologyFragment?: VisibleTechnologyFragment', 'BoardTile must receive full fragment identity');
      assertIncludes(boardTile, 'aria-label={technologyFragment ? `Tile ${index + 1}. ${technologyFragment.ariaLabel}` : undefined}', 'tile exposes accessible fragment availability');
      assertIncludes(boardTileGrid, 'data-fragment-slot={fragment.fragmentSlot}', 'fragment slot must be rendered for deterministic styling/tests');
      assertIncludes(boardTileGrid, "tokenIndex === fragment.tileIndex", 'fragment must detect when the token lands on its tile');
      assertIncludes(boardTileGrid, 'island-run-board__technology-fragment--landed', 'landed fragment receives a pickup emphasis state');
      assertIncludes(boardTileGrid, '{fragment.placeholder}', 'emoji must come from fragment placeholder data');
      assertIncludes(boardTileGrid, 'aria-hidden="true"', 'fragment overlay remains decorative');
      assertIncludes(boardTileGrid, 'className={`island-run-board__technology-fragment', 'fragment must use the shared above-tile overlay plane');
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
      assertIncludes(css, '.island-run-board__technology-fragment', 'fragment overlay CSS class exists');
      assertIncludes(css, 'pointer-events: none;', 'fragment cannot block tile taps or swipes');
      assertIncludes(css, 'z-index: 8;', 'fragment overlay stays above ordinary tiles and below the current token layer');
      assertIncludes(css, 'animation-delay: var(--fragment-animation-delay, 0s);', 'fragment uses deterministic slot animation offsets');
      assertIncludes(css, '@keyframes island-technology-fragment-hover', 'hover bob animation exists');
      assertIncludes(boardTileGrid, "['--fragment-hover-scale' as string]", 'idle fragment scale follows its tile perspective scale');
      assertIncludes(css, 'width: 66px;', 'idle fragment starts from the canonical 66px spark-tile footprint');
      assertIncludes(css, '@keyframes island-technology-fragment-landed', 'landing moment has a distinct pickup animation');
      assertIncludes(css, '@media (prefers-reduced-motion: reduce)', 'reduced-motion media query exists');
      assertIncludes(css, 'animation: none;', 'reduced motion disables animations');
    },
  },
];
