import { buildJourneyChestClaim } from '../combinedJourneyChestClaim';
import { assertEqual, type TestCase } from './testHarness';

export const combinedJourneyChestClaimTests: TestCase[] = [
  {
    name: 'returns no claimable chest when the feature is disabled',
    run: () => {
      const vm = buildJourneyChestClaim({ enabled: false, level: 10, claimedThresholds: [] });
      assertEqual(vm.claimableThreshold, null, 'disabled feature should expose no chest');
    },
  },
  {
    name: 'returns no claimable chest below the first threshold',
    run: () => {
      const vm = buildJourneyChestClaim({ enabled: true, level: 1, claimedThresholds: [] });
      assertEqual(vm.claimableThreshold, null, 'level 1 has no chest yet');
    },
  },
  {
    name: 'offers the oldest unclaimed threshold first',
    run: () => {
      const vm = buildJourneyChestClaim({ enabled: true, level: 5, claimedThresholds: [2, 3] });
      assertEqual(vm.claimableThreshold, 4, 'should offer the lowest unclaimed threshold');
      assertEqual(vm.rewardPreviewLabel, '10 dice', 'threshold 4 previews dice reward');
      assertEqual(vm.ctaLabel, 'Claim Lv 4 chest', 'CTA names the claimable level');
    },
  },
  {
    name: 'returns no chest once everything up to the level is claimed',
    run: () => {
      const vm = buildJourneyChestClaim({ enabled: true, level: 4, claimedThresholds: [2, 3, 4] });
      assertEqual(vm.claimableThreshold, null, 'fully claimed ladder offers nothing');
    },
  },
  {
    name: 'ignores claimed thresholds above the current level',
    run: () => {
      const vm = buildJourneyChestClaim({ enabled: true, level: 2, claimedThresholds: [5, 6] });
      assertEqual(vm.claimableThreshold, 2, 'threshold 2 is still claimable regardless of higher noise');
    },
  },
  {
    name: 'only offers chests above the launch baseline',
    run: () => {
      const vm = buildJourneyChestClaim({ enabled: true, level: 8, claimedThresholds: [], baselineLevel: 5 });
      assertEqual(vm.claimableThreshold, 6, 'first claimable chest is just above the baseline');
    },
  },
  {
    name: 'returns no chest when the level has not risen past the baseline',
    run: () => {
      const vm = buildJourneyChestClaim({ enabled: true, level: 5, claimedThresholds: [], baselineLevel: 5 });
      assertEqual(vm.claimableThreshold, null, 'no chest until the level climbs past the baseline');
    },
  },
];
