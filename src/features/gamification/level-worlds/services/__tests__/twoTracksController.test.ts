import { assert, type TestCase } from './testHarness';

export const twoTracksControllerTests: TestCase[] = [
  {
    name: 'Two Tracks overlay uses the game\'s living controller with the Today-menu icons',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const overlay = fsMod.readFileSync('src/components/GameBoardOverlay.tsx', 'utf8');
      const renderer = fsMod.readFileSync('src/features/gamification/level-worlds/components/living-controller/renderer.js', 'utf8');
      const controller = fsMod.readFileSync('src/features/gamification/level-worlds/components/living-controller/LivingController.tsx', 'utf8');
      assert(overlay.includes('<LivingController'), 'the overlay renders the same controller as the game');
      for (const face of ["glyph: '✅', label: 'Today'", "glyph: '⚡️', label: 'Actions'", "glyph: '🌬️', label: 'Breathe'", "glyph: '🏆', label: 'Score'"]) {
        assert(overlay.includes(face), `button face matches the Today footer: ${face}`);
      }
      assert(overlay.includes('{spotlightPlay ? controllerShell : ('), 'first-run guided PLAY keeps its spotlight shell');
      assert(overlay.includes('fallback={controllerShell}'), 'a WebGL failure falls back to the CSS shell');
      assert(renderer.includes('snapshot.menuFaces&&snapshot.menuFaces[b.id]'), 'the renderer paints menu faces');
      assert(renderer.includes('!snapshot.menuFaces;'), 'no roll-power hologram on the menu controller');
      assert(controller.includes('{!p.menuFaces&&<button'), 'no multiplier button on the menu controller');
    },
  },
];
