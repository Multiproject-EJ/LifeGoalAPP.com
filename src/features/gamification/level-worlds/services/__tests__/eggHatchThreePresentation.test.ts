import {
  EGG_HATCH_DURATION_SECONDS,
  EGG_HATCH_PALETTES,
  EGG_HATCH_REDUCED_MOTION_DURATION_SECONDS,
  EGG_HATCH_TIER_PROFILES,
  isEggHatchThreeCreature,
  parseEggHatchPreviewTime,
  resolveEggHatchRuntimeQuality,
  resolveEggFragmentPose,
  resolveEggHatchPose,
} from '../eggHatchThreePresentation';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const eggHatchThreePresentationTests: TestCase[] = [
  {
    name: 'lets the lab animate when no deterministic screenshot time is requested',
    run: () => {
      assertEqual(parseEggHatchPreviewTime(null), null, 'a missing time query must not freeze the hatch at zero');
      assertEqual(parseEggHatchPreviewTime(''), null, 'an empty time query must not freeze the hatch at zero');
      assertEqual(parseEggHatchPreviewTime('0'), 0, 'an explicit zero remains available for deterministic closed-egg captures');
      assertEqual(parseEggHatchPreviewTime('4.45'), 4.45, 'a valid authored phase time should be preserved');
      assertEqual(parseEggHatchPreviewTime('later'), null, 'invalid values must fall back to the live animation clock');
    },
  },
  {
    name: 'stages the full hatch in the authored order and finishes deterministically',
    run: () => {
      const phases = [0, 0.8, 2.4, 3.9, 4.55, 5.45, EGG_HATCH_DURATION_SECONDS]
        .map((time) => resolveEggHatchPose(time).phase);
      assertDeepEqual(phases, ['settle', 'wiggle', 'cracking', 'burst', 'peek', 'reveal', 'complete'], 'the hatch must read as settle, wiggle, crack, burst, peek, reveal, complete');
      const complete = resolveEggHatchPose(EGG_HATCH_DURATION_SECONDS + 10);
      assertEqual(complete.elapsedSeconds, EGG_HATCH_DURATION_SECONDS, 'presentation time should clamp for stable replay captures');
      assertEqual(complete.complete, true, 'the final pose should be explicitly complete');
      assertEqual(complete.revealProgress, 1, 'the creature should be fully revealed');
    },
  },
  {
    name: 'keeps the reduced-motion hatch short and removes rotational shaking',
    run: () => {
      const mid = resolveEggHatchPose(0.58, true);
      assertEqual(mid.eggRotationX, 0, 'reduced motion must remove x-axis shake');
      assertEqual(mid.eggRotationZ, 0, 'reduced motion must remove z-axis shake');
      const complete = resolveEggHatchPose(EGG_HATCH_REDUCED_MOTION_DURATION_SECONDS, true);
      assertEqual(complete.phase, 'complete', 'reduced-motion sequence should reach a stable complete pose');
      assertEqual(complete.complete, true, 'reduced-motion completion must be explicit');
    },
  },
  {
    name: 'defines three structurally distinct egg families rather than colour-only aliases',
    run: () => {
      const profiles = Object.values(EGG_HATCH_TIER_PROFILES);
      assertEqual(profiles.length, 3, 'common, rare and mythic are the three canonical hatch tiers');
      assertEqual(new Set(profiles.map((profile) => profile.shellFamily)).size, 3, 'each tier needs its own shell family');
      assertEqual(new Set(profiles.map((profile) => profile.silhouetteSignature)).size, 3, 'each tier needs its own silhouette signature');
      assertEqual(new Set(profiles.map((profile) => profile.materialClass)).size, 3, 'each rarity must also keep its own physical material class');
      assert(EGG_HATCH_TIER_PROFILES.rare.metalness > EGG_HATCH_TIER_PROFILES.common.metalness, 'rare amber-gold should read more metallic than common pearl ceramic');
      assert(EGG_HATCH_TIER_PROFILES.mythic.emissiveStrength > EGG_HATCH_TIER_PROFILES.common.emissiveStrength, 'mythic cosmic enamel should carry the strongest inner emission');
      assert(EGG_HATCH_TIER_PROFILES.common.referenceArtSrc.includes('Egg_common_lv3'), 'common must name its shipped 2D authority');
      assert(EGG_HATCH_TIER_PROFILES.rare.referenceArtSrc.includes('Egg_rare_lv3'), 'rare must name its shipped 2D authority');
      assert(EGG_HATCH_TIER_PROFILES.mythic.referenceArtSrc.includes('Egg_mystery_lv3'), 'mythic must map to the shipped mystery naming');
      assertEqual(new Set(EGG_HATCH_PALETTES.map((palette) => palette.shell)).size, EGG_HATCH_PALETTES.length, 'colour choices must remain visibly distinct');
    },
  },
  {
    name: 'launches real fragments above the rim before gravity brings them to rest',
    run: () => {
      const launched = resolveEggFragmentPose(2, 0.3);
      const fallen = resolveEggFragmentPose(2, 1);
      assert(launched.position[1] > 0, 'fragment must first fly above its authored shell pivot');
      assert(fallen.position[1] < launched.position[1], 'gravity must bring the fragment down after launch');
      assertEqual(fallen.resting, true, 'completed debris should report a stable resting pose');
      assertDeepEqual(resolveEggFragmentPose(2, 0.3), launched, 'fragment trajectories must be deterministic for replay and screenshot QA');
    },
  },
  {
    name: 'limits the production 3D hatch to Sproutling while other creatures keep the safe fallback',
    run: () => {
      assertEqual(isEggHatchThreeCreature('common-sproutling'), true, 'Sproutling is the approved production 3D hatch');
      assertEqual(isEggHatchThreeCreature('rare-crown-drifter'), false, 'unmodeled creatures must not silently use the Sproutling model');
      assertEqual(isEggHatchThreeCreature(undefined), false, 'missing ids use the existing 2D reveal');
    },
  },
  {
    name: 'selects a conservative automatic hatch quality without persisting device state',
    run: () => {
      assertEqual(resolveEggHatchRuntimeQuality({ prefersReducedMotion: true, hardwareConcurrency: 8 }), 'low', 'reduced motion should prefer the calm low-cost renderer');
      assertEqual(resolveEggHatchRuntimeQuality({ deviceMemoryGb: 2, hardwareConcurrency: 8 }), 'low', 'low-memory devices should use low quality');
      assertEqual(resolveEggHatchRuntimeQuality({ deviceMemoryGb: 8, hardwareConcurrency: 4 }), 'low', 'four-core devices should use low quality');
      assertEqual(resolveEggHatchRuntimeQuality({ hardwareConcurrency: 6, devicePixelRatio: 3 }), 'high', 'modern iOS hardware without deviceMemory should retain the high close-up model');
      assertEqual(resolveEggHatchRuntimeQuality({ deviceMemoryGb: 8, hardwareConcurrency: 8, devicePixelRatio: 2 }), 'high', 'strong devices should use high quality');
    },
  },
];
