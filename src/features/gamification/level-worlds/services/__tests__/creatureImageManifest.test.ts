import { CREATURE_CATALOG } from '../creatureCatalog';
import { getCreatureStageByStageKey, getCreatureStagesForFamily } from '../creatureStageCatalog';
import {
  buildCreatureCutoutPngPath,
  buildCreatureCutoutWebpPath,
  buildCreatureStageCutoutWebpPath,
  CREATURE_SILHOUETTE_PLACEHOLDER_PATH,
  resolveCreatureArtManifest,
  resolveCreatureBackgroundPath,
  resolveCreatureFramePath,
  resolveCreatureImageSource,
  resolveCreatureStageArtManifest,
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
    name: 'resolveCreatureArtManifest returns expected layered paths and cutout candidates',
    run: () => {
      const creature = CREATURE_CATALOG[0];
      const manifest = resolveCreatureArtManifest(creature);
      assertEqual(manifest.cutoutSrc, `/assets/creatures/${creature.imageKey}.webp`, 'cutout path should follow convention');
      assertEqual(manifest.cutoutWebpSrc, `/assets/creatures/${creature.imageKey}.webp`, 'webp cutout path should follow convention');
      assertEqual(manifest.cutoutPngSrc, `/assets/creatures/${creature.imageKey}.png`, 'png fallback path should follow convention');
      assertEqual(manifest.frameSrc, `/assets/creature-frames/${creature.tier}.webp`, 'frame path should follow convention');
      assertEqual(manifest.silhouetteSrc, CREATURE_SILHOUETTE_PLACEHOLDER_PATH, 'silhouette path should be stable');
      assert(typeof manifest.backgroundSrc === 'string' && manifest.backgroundSrc.includes('/assets/creature-backgrounds/'), 'background path should resolve');
      assert(typeof manifest.emojiFallback === 'string' && manifest.emojiFallback.length > 0, 'emoji fallback should exist');
    },
  },
  {
    name: 'cutout path builders resolve deterministic webp and png candidates',
    run: () => {
      const creature = CREATURE_CATALOG[0];
      assertEqual(buildCreatureCutoutWebpPath(creature.imageKey), `/assets/creatures/${creature.imageKey}.webp`, 'webp builder should be deterministic');
      assertEqual(buildCreatureCutoutPngPath(creature.imageKey), `/assets/creatures/${creature.imageKey}.png`, 'png builder should be deterministic');
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

  {
    name: 'staged cutout path helpers resolve deterministic webp candidates',
    run: () => {
      assertEqual(buildCreatureStageCutoutWebpPath('common-pebble-spirit-lv2'), '/assets/creatures/common-pebble-spirit-lv2.webp', 'lv2 staged path should follow convention');
      assertEqual(buildCreatureStageCutoutWebpPath('common-pebble-spirit-lv3'), '/assets/creatures/common-pebble-spirit-lv3.webp', 'lv3 staged path should follow convention');
    },
  },
  {
    name: 'stage catalog and staged art manifest resolve Pebble Spirit line in order',
    run: () => {
      const stages = getCreatureStagesForFamily('common-pebble-spirit');
      assertEqual(stages.length, 3, 'Pebble Spirit family should expose three known stages');
      assertEqual(stages[0]?.stageKey, 'common-pebble-spirit', 'stage one should be base key');
      assertEqual(stages[1]?.stageKey, 'common-pebble-spirit-lv2', 'stage two should be lv2 key');
      assertEqual(stages[2]?.stageKey, 'common-pebble-spirit-lv3', 'stage three should be lv3 key');

      const lv2 = getCreatureStageByStageKey('common-pebble-spirit-lv2');
      const lv3 = getCreatureStageByStageKey('common-pebble-spirit-lv3');
      if (!lv2 || !lv3) throw new Error('Expected staged metadata for lv2 and lv3');

      const lv2Manifest = resolveCreatureStageArtManifest(lv2);
      const lv3Manifest = resolveCreatureStageArtManifest(lv3);
      assertEqual(lv2Manifest.cutoutSrc, '/assets/creatures/common-pebble-spirit-lv2.webp', 'lv2 staged cutout should resolve to staged asset key');
      assertEqual(lv3Manifest.cutoutSrc, '/assets/creatures/common-pebble-spirit-lv3.webp', 'lv3 staged cutout should resolve to staged asset key');
    },
  },
];
