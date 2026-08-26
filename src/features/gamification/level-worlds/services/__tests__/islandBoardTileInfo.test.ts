import { resolveIslandBoardTileInfo } from '../islandBoardTileInfo';
import type { IslandTileType } from '../islandBoardTileMap';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandBoardTileInfoTests: TestCase[] = [
  {
    name: 'every production tile type has short explorable copy',
    run: () => {
      const tileTypes: IslandTileType[] = [
        'currency',
        'chest',
        'hazard',
        'micro',
        'encounter',
        'card',
        'landmark_door',
        'traffic_light',
        'build_discount',
        'free_ticket',
      ];
      for (const [index, tileType] of tileTypes.entries()) {
        const info = resolveIslandBoardTileInfo({ entry: { index, tileType } });
        assert(info.title.length > 0, `${tileType} should have a title`);
        assert(info.description.length > 0, `${tileType} should have a description`);
        assert(info.description.length < 130, `${tileType} copy should stay compact`);
      }
    },
  },
  {
    name: 'signature mission copy overrides the ordinary tile effect',
    run: () => {
      const info = resolveIslandBoardTileInfo({
        entry: { index: 7, tileType: 'currency', signatureMissionKind: 'first_light_dynamite' },
      });
      assertEqual(info.title, 'Assembly Dynamite', 'Island 1 charge should identify the mission pickup');
      assert(info.description.includes('deepen'), 'Dynamite copy should explain excavation progress');
    },
  },
  {
    name: 'live tile state appears in traffic-light and ticket copy',
    run: () => {
      const traffic = resolveIslandBoardTileInfo({
        entry: { index: 10, tileType: 'traffic_light' },
        trafficLightCharge: 4,
        trafficLightChargeTarget: 8,
      });
      const ticket = resolveIslandBoardTileInfo({
        entry: { index: 30, tileType: 'free_ticket' },
        livingTicketGrowthProgress: 0.42,
      });
      assert(traffic.description.includes('4/8'), 'Traffic light should show current charge');
      assert(ticket.description.includes('42%'), 'Ticket sprout should show regrowth progress');
    },
  },
  {
    name: 'Concord fragment and dormant states take visual priority',
    run: () => {
      const fragment = resolveIslandBoardTileInfo({
        isDormant: true,
        technologyFragment: {
          tileIndex: 2,
          fragmentSlot: 0,
          placeholder: '💠',
          ariaLabel: 'Technology fragment available',
          alt: 'Concord fragment 1',
        },
      });
      const dormant = resolveIslandBoardTileInfo({ isDormant: true });
      assertEqual(fragment.title, 'Concord Fragment', 'Visible fragment should remain discoverable on dormant board');
      assertEqual(dormant.title, 'Dormant Signal', 'Dormant tile should explain activation gate');
    },
  },
];
