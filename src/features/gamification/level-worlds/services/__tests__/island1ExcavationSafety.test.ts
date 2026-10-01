import { assert, assertEqual, type TestCase } from './testHarness';
import { createIsland1ExcavationSafety } from '../../dev/Island1ExcavationSafety';

export const island1ExcavationSafetyTests: TestCase[] = [
  {
    name: 'Island 001 excavation: fence, warning signs, rocks and grass ring the open dig and stay inside the crater edge',
    run: () => {
      const safety = createIsland1ExcavationSafety('medium');
      assertEqual(safety.root.visible, false, 'hidden before the first blast');
      const maxRadius = 2.72;
      safety.update({ mouthAt: () => 1.2, visible: true, maxRadius, surfaceY: 0.23 });
      assert(safety.root.visible, 'shown once the dig is open');
      const signs = safety.root.children.filter((child) => child.name.startsWith('ISLAND_001_EXCAVATION_WARNING_SIGN_'));
      assertEqual(signs.length, 4, 'four warning signs');
      for (const sign of signs) {
        const r = Math.hypot(sign.position.x, sign.position.z);
        assert(r > 1.2 && r < maxRadius, 'signs sit between the hole and the route');
      }
      const names = safety.root.children.map((child) => child.name);
      for (const name of ['ISLAND_001_EXCAVATION_FENCE_POSTS', 'ISLAND_001_EXCAVATION_FENCE_RAILS', 'ISLAND_001_EXCAVATION_ROCKS', 'ISLAND_001_EXCAVATION_GRASS_TUFTS']) {
        assert(names.includes(name), `${name} present`);
      }
      // A wide mouth keeps the fence inside the crater edge.
      safety.update({ mouthAt: () => 2.6, visible: true, maxRadius, surfaceY: 0.23 });
      for (const sign of signs) assert(Math.hypot(sign.position.x, sign.position.z) <= maxRadius, 'clamped to the crater edge');
      safety.update({ mouthAt: () => 0, visible: false, maxRadius, surfaceY: 0.23 });
      assertEqual(safety.root.visible, false, 'gone once the Assembly is built');
      safety.dispose();
    },
  },
];
