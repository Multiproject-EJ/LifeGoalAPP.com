import { ASSEMBLY_TOPBAR_BLAST_CHARGE, ASSEMBLY_TOPBAR_BLAST_MS, shouldAssemblyBlastHitTopbar } from '../assemblyTopbarBlast';
import { assert, assertEqual, type TestCase } from './testHarness';

export const assemblyTopbarBlastTests: TestCase[] = [
  {
    name: 'Island 001: only the first big middle blast hits the top bar, inside the blast beat',
    run: () => {
      assertEqual(ASSEMBLY_TOPBAR_BLAST_CHARGE, 8, 'act 2 (charges 8–9) is the big middle explosion');
      assert(shouldAssemblyBlastHitTopbar(8), 'the first act-2 blast rattles the bar');
      assert(!shouldAssemblyBlastHitTopbar(7) && !shouldAssemblyBlastHitTopbar(9) && !shouldAssemblyBlastHitTopbar(10), 'once, and not on the finale');
      assert(ASSEMBLY_TOPBAR_BLAST_MS < 5_400, 'the repair finishes before the board resumes');
    },
  },
  {
    name: 'Island 001: the board is inert while the Assembly blast/build plays (controller, top bar, explore dots)',
    run: async () => {
      // @ts-ignore Node-only source contract check.
      const fs = await import('fs');
      const board = fs.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      const css = fs.readFileSync('src/features/gamification/level-worlds/LevelWorlds.css', 'utf8');
      assert(board.includes('const firstLightAssemblyAnimating = firstLightAssemblyPendingSector !== null;'), 'lock follows the committed blast beat');
      assert(board.includes("${firstLightAssemblyAnimating ? ' island-run-prototype--input-locked' : ''}"), 'root gets the input lock');
      assert(board.includes('interactionPaused={doesModalOwnAttention || openingCeremonyPlayback !== null || firstLightAssemblyAnimating}'), 'explore dots hide while it plays');
      assert(/\.island-run-prototype--input-locked \*[^}]*pointer-events: none !important;/.test(css), 'every button is inert');
    },
  },
];
