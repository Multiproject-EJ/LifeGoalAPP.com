import {
  applyTrafficLightPass,
  getTrafficLightCharge,
  resolveTrafficLightCoinFlipReward,
  TRAFFIC_LIGHT_CHARGE_TARGET,
  TRAFFIC_LIGHT_TILE_INDEX,
} from '../islandRunTrafficLightTile';
import { assertEqual, type TestCase } from './testHarness';

export const islandRunTrafficLightTileTests: TestCase[] = [
  {
    name: 'traffic light pass increments one light through 7 and unlocks on 8',
    run: () => {
      let ledger = {};
      for (let pass = 1; pass < TRAFFIC_LIGHT_CHARGE_TARGET; pass++) {
        const result = applyTrafficLightPass({ bonusTileChargeByIsland: ledger, islandNumber: 2 });
        assertEqual(result.chargeAfter, pass, `Expected charge ${pass}`);
        assertEqual(result.unlocked, false, 'Expected not unlocked before 8');
        ledger = result.bonusTileChargeByIsland;
      }
      const unlock = applyTrafficLightPass({ bonusTileChargeByIsland: ledger, islandNumber: 2 });
      assertEqual(unlock.chargeAfter, TRAFFIC_LIGHT_CHARGE_TARGET, 'Expected displayed unlock charge to be 8');
      assertEqual(unlock.unlocked, true, 'Expected unlock at 8');
      assertEqual(getTrafficLightCharge(unlock.bonusTileChargeByIsland, 2), 0, 'Expected ledger reset after unlock');
    },
  },
  {
    name: 'traffic light charge uses the canonical traffic tile index only',
    run: () => {
      const ledger = { '4': { [TRAFFIC_LIGHT_TILE_INDEX]: 3, 5: 8 } };
      assertEqual(getTrafficLightCharge(ledger, 4), 3, 'Expected traffic charge to ignore other tile charges');
    },
  },
  {
    name: 'coin flip reward maps heads/tails to mystery boxes and only grants puzzle pieces when some are missing',
    run: () => {
      const reward = resolveTrafficLightCoinFlipReward({ seed: 123, stickerFragments: 3 });
      assertEqual(reward.boxId === 'box_1' || reward.boxId === 'box_2', true, 'Expected one of two mystery boxes');
      assertEqual(reward.stickerFragments === 0 || reward.stickerFragments === 2, true, 'Expected zero or two puzzle pieces when some are missing');
    },
  },
  {
    name: 'coin flip reward never grants puzzle pieces once the sticker is fully collected',
    run: () => {
      for (let seed = 0; seed < 50; seed++) {
        const reward = resolveTrafficLightCoinFlipReward({ seed, stickerFragments: 5 });
        assertEqual(reward.stickerFragments, 0, `Expected no puzzle pieces at seed ${seed} when nothing is missing`);
      }
    },
  },
  {
    name: 'coin flip reward grants two or more puzzle pieces (overflow) when exactly one is missing',
    run: () => {
      let sawGrant = false;
      for (let seed = 0; seed < 200; seed++) {
        const reward = resolveTrafficLightCoinFlipReward({ seed, stickerFragments: 4 });
        assertEqual(reward.stickerFragments === 0 || reward.stickerFragments >= 2, true, `Expected zero or 2+ puzzle pieces at seed ${seed} when one is missing`);
        if (reward.stickerFragments > 0) sawGrant = true;
      }
      assertEqual(sawGrant, true, 'Expected at least one seed to grant puzzle pieces when one is missing');
    },
  },
  {
    name: 'coin flip reward always grants 1-5 event minigame tickets',
    run: () => {
      for (let seed = 0; seed < 50; seed++) {
        const reward = resolveTrafficLightCoinFlipReward({ seed, stickerFragments: 3 });
        assertEqual(reward.minigameTickets >= 1 && reward.minigameTickets <= 5, true, `Expected 1-5 tickets at seed ${seed}, got ${reward.minigameTickets}`);
      }
    },
  },
];
