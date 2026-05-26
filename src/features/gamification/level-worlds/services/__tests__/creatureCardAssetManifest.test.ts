import {
  resolveCreatureBacksideMotifSrc,
  resolveCreatureEditionStampSrc,
  resolveCreatureStageArtSrc,
  resolveCreatureTypeIconSrc,
  resolveCreatureVariantBadgeSrc,
} from '../creatureCardAssetManifest';
import { assertEqual, type TestCase } from './testHarness';

export const creatureCardAssetManifestTests: TestCase[] = [
  {
    name: 'resolves deterministic type icon and variant badge paths',
    run: () => {
      assertEqual(resolveCreatureTypeIconSrc('fire'), '/assets/creature-card-icons/types/fire.webp', 'type icon path should follow contract');
      assertEqual(
        resolveCreatureVariantBadgeSrc('holographic'),
        '/assets/creature-card-icons/variant-badges/holographic.webp',
        'variant badge path should follow contract',
      );
    },
  },
  {
    name: 'resolves deterministic stage art path only when both keys are provided',
    run: () => {
      assertEqual(
        resolveCreatureStageArtSrc('common-pebble-spirit', 'lv2'),
        '/assets/creatures/stages/common-pebble-spirit/lv2.webp',
        'stage art path should follow contract',
      );
      assertEqual(resolveCreatureStageArtSrc('', 'lv2'), undefined, 'missing creatureImageKey should resolve undefined');
      assertEqual(resolveCreatureStageArtSrc('common-pebble-spirit', ''), undefined, 'missing stageKey should resolve undefined');
    },
  },
  {
    name: 'resolves deterministic edition stamp and backside motif paths',
    run: () => {
      assertEqual(resolveCreatureEditionStampSrc('first-edition'), '/assets/creature-card-icons/edition-stamps/first-edition.webp', 'edition stamp path should follow contract');
      assertEqual(resolveCreatureBacksideMotifSrc('constellation'), '/assets/creature-card-backs/motifs/constellation.webp', 'backside motif path should follow contract');
    },
  },
  {
    name: 'unsafe or empty keys resolve undefined via safe fallback contract',
    run: () => {
      assertEqual(resolveCreatureTypeIconSrc('   '), undefined, 'blank type icon key should return undefined');
      assertEqual(resolveCreatureVariantBadgeSrc(''), undefined, 'blank variant badge key should return undefined');
      assertEqual(resolveCreatureEditionStampSrc('   '), undefined, 'blank edition stamp key should return undefined');
      assertEqual(resolveCreatureBacksideMotifSrc(''), undefined, 'blank backside motif key should return undefined');
    },
  },
  {
    name: 'resolvers trim keys and do not check network or filesystem existence',
    run: () => {
      assertEqual(resolveCreatureTypeIconSrc('  cosmic  '), '/assets/creature-card-icons/types/cosmic.webp', 'type icon resolver should trim key only');
      assertEqual(
        resolveCreatureStageArtSrc('  unknown-creature  ', '  impossible-stage  '),
        '/assets/creatures/stages/unknown-creature/impossible-stage.webp',
        'stage resolver should be pure path composition without existence checks',
      );
    },
  },
];
