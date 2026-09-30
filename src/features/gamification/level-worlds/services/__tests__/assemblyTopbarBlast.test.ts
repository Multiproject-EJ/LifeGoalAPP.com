import {
  ASSEMBLY_TOPBAR_BEATS,
  ASSEMBLY_TOPBAR_BLAST_CHARGE,
  ASSEMBLY_TOPBAR_BLAST_HAPTIC_PATTERN,
  ASSEMBLY_TOPBAR_BLAST_MS,
  resolveAssemblyBlastBoardWaitMs,
  resolveAssemblyTopbarCrewPoses,
  shouldAssemblyBlastHitTopbar,
} from '../assemblyTopbarBlast';
import { assert, assertEqual, type TestCase } from './testHarness';

export const assemblyTopbarBlastTests: TestCase[] = [
  {
    name: 'Island 001: only the first big middle blast hits the top bar, and the board waits for the repair',
    run: () => {
      assertEqual(ASSEMBLY_TOPBAR_BLAST_CHARGE, 8, 'act 2 (charges 8–9) is the big middle explosion');
      assert(shouldAssemblyBlastHitTopbar(8), 'the first act-2 blast hits the bar');
      assert(!shouldAssemblyBlastHitTopbar(7) && !shouldAssemblyBlastHitTopbar(9) && !shouldAssemblyBlastHitTopbar(10), 'once, and not on the finale');
      assert(resolveAssemblyBlastBoardWaitMs(8, false) > ASSEMBLY_TOPBAR_BLAST_MS, 'the repair finishes before the board resumes');
      assertEqual(resolveAssemblyBlastBoardWaitMs(7, false), 5_400, 'ordinary blasts keep their beat');
      assertEqual(resolveAssemblyBlastBoardWaitMs(10, false), 13_400, 'the finale keeps its build hand-off');
      assertEqual(resolveAssemblyBlastBoardWaitMs(8, true), 0, 'reduced motion never waits');
    },
  },
  {
    name: 'Island 001 top bar repair: the real crew each do one job in order, then leave',
    run: () => {
      const at = (t: number) => Object.fromEntries(resolveAssemblyTopbarCrewPoses(t).map((pose) => [pose.role, pose]));
      assert(!at(1)['heavy-worker']!.visible, 'no robot while the bar is still falling');
      assertEqual(at(4)['heavy-worker']!.motion, 'lift', 'the Heavy Worker lifts the hanging side');
      assertEqual(at(5.5)['project-manager']!.motion, 'work', 'the Project Manager rewires the power');
      const sweepStart = at(ASSEMBLY_TOPBAR_BEATS.sweepStart + 0.1)['mini-artist']!;
      const sweepEnd = at(ASSEMBLY_TOPBAR_BEATS.sweepEnd - 0.1)['mini-artist']!;
      assert(sweepStart.motion === 'paint' && sweepEnd.x > sweepStart.x + 0.5, 'the Mini Artist sweeps the dust across the bar');
      assert(resolveAssemblyTopbarCrewPoses(ASSEMBLY_TOPBAR_BLAST_MS / 1000).every((pose) => !pose.visible), 'everyone has left at the end');
    },
  },
  {
    name: 'Island 001 top bar haptics: a rapid series, one long hard buzz, one small tick',
    run: () => {
      const pulses = ASSEMBLY_TOPBAR_BLAST_HAPTIC_PATTERN.filter((_, index) => index % 2 === 0);
      assert(pulses.slice(0, 6).every((pulse) => pulse <= 40), 'starts with many short pulses');
      assertEqual(Math.max(...pulses), 460, 'one long hard buzz');
      assert(pulses[pulses.length - 1]! < 60, 'ends on one small tick');
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
