import {
  formatIslandRunSpinTokenReward,
  resolveIslandRunContractV2RewardHudState,
  resolveIslandRunSpinTokenWalletLabel,
} from '../islandRunContractV2Semantics';
import { assertEqual, type TestCase } from './testHarness';

export const islandRunContractV2SemanticsTests: TestCase[] = [
  {
    name: 'v2 ON: spin token wallet copy is labeled as minigame tokens',
    run: () => {
      assertEqual(resolveIslandRunSpinTokenWalletLabel(true), 'Minigame tokens', 'Expected v2 label to use minigame-token wording');
      assertEqual(formatIslandRunSpinTokenReward({ islandRunContractV2Enabled: true, amount: 1 }), '+1 token', 'Expected singular token wording for v2');
      assertEqual(formatIslandRunSpinTokenReward({ islandRunContractV2Enabled: true, amount: 2 }), '+2 tokens', 'Expected plural token wording for v2');
    },
  },
  {
    name: 'v2 OFF: legacy spin copy remains unchanged',
    run: () => {
      assertEqual(resolveIslandRunSpinTokenWalletLabel(false), 'Spins', 'Expected legacy label to stay as Spins');
      assertEqual(formatIslandRunSpinTokenReward({ islandRunContractV2Enabled: false, amount: 1 }), '+1 spin', 'Expected singular spin wording in legacy mode');
      assertEqual(formatIslandRunSpinTokenReward({ islandRunContractV2Enabled: false, amount: 3 }), '+3 spins', 'Expected plural spin wording in legacy mode');
    },
  },
  {
    name: 'reward HUD state keeps reward-bar values bounded and claimable only when ready',
    run: () => {
      const state = resolveIslandRunContractV2RewardHudState({
        islandRunContractV2Enabled: true,
        runtimeState: {
          activeTimedEvent: {
            eventId: 'evt',
            eventType: 'focus',
            startedAtMs: 100,
            expiresAtMs: 800,
            version: 1,
          },
          rewardBarProgress: 8.8,
          rewardBarThreshold: 4.2,
        },
        nowMs: 300,
      });

      assertEqual(state.rewardBarProgress, 8, 'Expected reward bar progress to be floored');
      assertEqual(state.rewardBarThreshold, 4, 'Expected threshold to be floored and bounded');
      assertEqual(state.canClaimRewardBar, true, 'Expected claimability when progress meets threshold in v2');
      assertEqual(state.timedEventRemainingMs, 500, 'Expected remaining event ms to derive from nowMs');
      assertEqual(state.rewardBarPercent, 100, 'Expected reward bar percent to clamp to 100');
    },
  },
];
