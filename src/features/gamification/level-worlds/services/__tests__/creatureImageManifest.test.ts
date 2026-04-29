import { CREATURE_CATALOG } from '../creatureCatalog';
import {
  CREATURE_SILHOUETTE_PLACEHOLDER_PATH,
  resolveCreatureArtManifest,
  resolveCreatureBackgroundPath,
  resolveCreatureFramePath,
  resolveCreatureImageSource,
} from '../creatureImageManifest';
import { assert, assertEqual, type TestCase } from './testHarness';

export const creatureImageManifestTests: TestCase[] = [
  {
    name: 'all creatures expose stable imageKey values',
    run: () => {
      const seen = new Set<string>();
      CREATURE_CATALOG.forEach((creature) => {
        assert(typeof creature.imageKey === 'string' && creature.imageKey.length > 0, `Missing imageKey for ${creature.id}`);
        assertEqual(creature.imageKey, creature.id, `imageKey convention should match creature id for ${creature.id}`);
        assert(!seen.has(creature.imageKey), `Duplicate imageKey detected: ${creature.imageKey}`);
        seen.add(creature.imageKey);
      });
    },
  },
  {
    name: 'resolveCreatureArtManifest returns expected layered paths',
    run: () => {
      const creature = CREATURE_CATALOG[0];
      const manifest = resolveCreatureArtManifest(creature);
      assertEqual(manifest.cutoutSrc, `/assets/creatures/${creature.imageKey}.webp`, 'cutout path should follow convention');
      assertEqual(manifest.frameSrc, `/assets/creature-frames/${creature.tier}.webp`, 'frame path should follow convention');
      assertEqual(manifest.silhouetteSrc, CREATURE_SILHOUETTE_PLACEHOLDER_PATH, 'silhouette path should be stable');
      assert(typeof manifest.backgroundSrc === 'string' && manifest.backgroundSrc.includes('/assets/creature-backgrounds/'), 'background path should resolve');
      assert(typeof manifest.emojiFallback === 'string' && manifest.emojiFallback.length > 0, 'emoji fallback should exist');
    },
  },
  {
    name: 'resolveCreatureImageSource falls back to silhouette when cutout is unavailable',
    run: () => {
      const creature = CREATURE_CATALOG.find((entry) => entry.tier === 'mythic') ?? CREATURE_CATALOG[0];
      const withCutout = resolveCreatureImageSource({ creature, hasCutoutAsset: true });
      const withoutCutout = resolveCreatureImageSource({ creature, hasCutoutAsset: false });
      assert(withCutout.src.endsWith(`${creature.imageKey}.webp`), 'cutout path should be used when available');
      assertEqual(withoutCutout.src, CREATURE_SILHOUETTE_PLACEHOLDER_PATH, 'silhouette fallback should be used when missing');
      assert(typeof withoutCutout.fallbackEmoji === 'string' && withoutCutout.fallbackEmoji.length > 0, 'emoji fallback should always be provided');
    },
  },
  {
    name: 'frame/background resolvers are deterministic and tier/zone-safe',
    run: () => {
      assertEqual(resolveCreatureFramePath('common'), '/assets/creature-frames/common.webp', 'common frame path stable');
      const cosmicBackground = resolveCreatureBackgroundPath({ affinity: 'Unknown Affinity', shipZone: 'cosmic' });
      assertEqual(cosmicBackground, '/assets/creature-backgrounds/cosmic.webp', 'unknown affinity should fallback to ship zone');
    },
  },
];
