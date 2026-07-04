import { resolveIslandBoardProfile } from '../islandBoardProfiles';
import { applyLandmarkDoorTiles, generateTileMap, LANDMARK_DOOR_TILE_CONFIGS, resolveAllLandmarkDoorsRouteToBoss, resolveExpandedLandmarkDoorStopIdForStatuses } from '../islandBoardTileMap';
import { TRAFFIC_LIGHT_TILE_INDEX } from '../islandRunTrafficLightTile';
import { resolveWrappedTokenIndex } from '../islandBoardTopology';
import { generateIslandStopPlan } from '../islandRunStops';
import { resolveIslandRunContractV2Stops } from '../islandRunContractV2StopResolver';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandBoardTopologyTests: TestCase[] = [
  {
    name: 'movement wrap uses profile tile count rather than hardcoded 17',
    run: () => {
      assertEqual(resolveWrappedTokenIndex(16, 1, 17), 0, 'Expected 17-tile topology to wrap 16 -> 0');
      assertEqual(resolveWrappedTokenIndex(34, 3, 36), 1, 'Expected 36-tile topology to wrap 34 + 3 -> 1');
    },
  },
  {
    name: 'v2 stop progression remains strict sequential and independent of board tile indices',
    run: () => {
      const stopPlan = generateIslandStopPlan(7, { profileId: 'spark40_ring' });
      assertEqual(stopPlan.length, 5, 'Expected five-stop plan regardless of board size');

      const result = resolveIslandRunContractV2Stops({
        stopStatesByIndex: [
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
        ],
      });

      assertEqual(result.activeStopIndex, 1, 'Expected second stop to be active after first completion');
      assertDeepEqual(result.statusesByIndex, ['completed', 'active', 'locked', 'locked', 'locked'], 'Expected index-sequential v2 statuses');
    },
  },

  {
    name: 'landmark door overlay reserves four nearest outer landmark tiles',
    run: () => {
      const tileMap = applyLandmarkDoorTiles(generateTileMap(3, 'normal', 'forest', 0));
      const expected = [
        { tileIndex: 32, stopId: 'hatchery' },
        { tileIndex: 5, stopId: 'habit' },
        { tileIndex: 14, stopId: 'mystery' },
        { tileIndex: 23, stopId: 'wisdom' },
      ];

      assertDeepEqual([...LANDMARK_DOOR_TILE_CONFIGS], expected, 'Expected fixed landmark-door tile placement');
      for (const door of expected) {
        const entry = tileMap[door.tileIndex];
        assertEqual(entry.tileType, 'landmark_door', `Expected tile ${door.tileIndex} to be a landmark door`);
        assertEqual(entry.doorStopId, door.stopId, `Expected tile ${door.tileIndex} to route to ${door.stopId}`);
      }
      assertEqual(tileMap.filter((entry) => entry.tileType === 'landmark_door').length, 4, 'Expected exactly four landmark doors');
    },
  },
  {
    name: 'landmark doors all route to boss once boss phase is open',
    run: () => {
      const tileMap = applyLandmarkDoorTiles(generateTileMap(120, 'rare', 'forest', 0), { allDoorsRouteToBoss: true });
      for (const door of LANDMARK_DOOR_TILE_CONFIGS) {
        const entry = tileMap[door.tileIndex];
        assertEqual(entry.tileType, 'landmark_door', `Expected tile ${door.tileIndex} to stay a landmark door`);
        assertEqual(entry.doorStopId, 'boss', `Expected tile ${door.tileIndex} to route to boss`);
        assertEqual(entry.isActiveDoorCluster, true, `Expected tile ${door.tileIndex} to glow for boss routing`);
      }
    },
  },
  {
    name: 'affordable boss ticket routes and glows all four landmark doors',
    run: () => {
      assertEqual(resolveAllLandmarkDoorsRouteToBoss({ bossStatus: 'ticket_required', essence: 219, bossTicketCost: 220 }), false, 'Boss ticket should not reroute doors until affordable');
      assertEqual(resolveAllLandmarkDoorsRouteToBoss({ bossStatus: 'ticket_required', essence: 220, bossTicketCost: 220 }), true, 'Affordable boss ticket should reroute doors');

      const tileMap = applyLandmarkDoorTiles(generateTileMap(120, 'rare', 'forest', 0), {
        allDoorsRouteToBoss: resolveAllLandmarkDoorsRouteToBoss({ bossStatus: 'ticket_required', essence: 220, bossTicketCost: 220 }),
      });
      for (const door of LANDMARK_DOOR_TILE_CONFIGS) {
        const entry = tileMap[door.tileIndex];
        assertEqual(entry.tileType, 'landmark_door', `Expected affordable boss-ticket tile ${door.tileIndex} to stay a landmark door`);
        assertEqual(entry.doorStopId, 'boss', `Expected affordable boss-ticket tile ${door.tileIndex} to route to boss`);
        assertEqual(entry.isActiveDoorCluster, true, `Expected affordable boss-ticket tile ${door.tileIndex} to glow for boss entry`);
      }
    },
  },

  {
    name: 'active hatchery landmark expands to its two neighboring egg-setting tiles',
    run: () => {
      const expandedStopId = resolveExpandedLandmarkDoorStopIdForStatuses(['active', 'locked', 'locked', 'locked', 'locked']);
      assertEqual(expandedStopId, 'hatchery', 'Expected fresh-island active hatchery to select the hatchery door cluster');

      const tileMap = applyLandmarkDoorTiles(generateTileMap(3, 'normal', 'forest', 0), { expandedActiveStopId: expandedStopId });
      for (const tileIndex of [31, 32, 33]) {
        const entry = tileMap[tileIndex];
        assertEqual(entry.tileType, 'landmark_door', `Expected egg-setting tile ${tileIndex} to render as a landmark door`);
        assertEqual(entry.doorStopId, 'hatchery', `Expected egg-setting tile ${tileIndex} to route to hatchery`);
        assertEqual(entry.isActiveDoorCluster, true, `Expected egg-setting tile ${tileIndex} to glow as part of the hatchery cluster`);
      }
      assertEqual(tileMap.filter((entry) => entry.tileType === 'landmark_door').length, 6, 'Expected 6 total doors: hatchery expanded to 3, others remain at 1 each');
    },
  },
  {
    name: 'active habit landmark expands to its two neighboring door tiles',
    run: () => {
      const tileMap = applyLandmarkDoorTiles(generateTileMap(3, 'normal', 'forest', 0), { expandedActiveStopId: 'habit' });
      for (const tileIndex of [4, 5, 6]) {
        const entry = tileMap[tileIndex];
        assertEqual(entry.tileType, 'landmark_door', `Expected tile ${tileIndex} to be a landmark door`);
        assertEqual(entry.doorStopId, 'habit', `Expected tile ${tileIndex} to route to habit`);
        assertEqual(entry.isActiveDoorCluster, true, `Expected tile ${tileIndex} to glow as part of the active habit cluster`);
      }
      assertEqual(tileMap[32].doorStopId, 'hatchery', 'Expected hatchery door to stay unchanged');
      assertEqual(tileMap[14].doorStopId, 'mystery', 'Expected mystery door to stay unchanged');
      assertEqual(tileMap[23].doorStopId, 'wisdom', 'Expected wisdom door to stay unchanged');
      assertEqual(tileMap.filter((entry) => entry.tileType === 'landmark_door').length, 6, 'Expected 6 total doors: habit expanded to 3, others remain at 1 each');
    },
  },
  {
    name: 'ticket-required landmark resolves to glowing neighboring door tiles before payment',
    run: () => {
      const expandedStopId = resolveExpandedLandmarkDoorStopIdForStatuses(['completed', 'ticket_required', 'locked', 'locked', 'locked']);
      assertEqual(expandedStopId, 'habit', 'Expected unpaid next habit ticket to select the habit door cluster');

      const tileMap = applyLandmarkDoorTiles(generateTileMap(3, 'normal', 'forest', 0), { expandedActiveStopId: expandedStopId });
      for (const tileIndex of [4, 5, 6]) {
        const entry = tileMap[tileIndex];
        assertEqual(entry.tileType, 'landmark_door', `Expected unpaid-ticket tile ${tileIndex} to render as a landmark door`);
        assertEqual(entry.doorStopId, 'habit', `Expected unpaid-ticket tile ${tileIndex} to route to habit`);
        assertEqual(entry.isActiveDoorCluster, true, `Expected unpaid-ticket tile ${tileIndex} to glow before the ticket is paid`);
      }
    },
  },
  {
    name: 'default board profile resolves to spark40_ring topology',
    run: () => {
      const defaultProfile = resolveIslandBoardProfile();
      assertEqual(defaultProfile.id, 'spark40_ring', 'Expected spark40_ring as the default active profile');
      assertEqual(defaultProfile.tileCount, 36, 'Expected 36 tiles for the default profile');

      const tileMap = generateTileMap(3, 'normal', 'forest', 0);
      assertEqual(tileMap.length, 36, 'Expected generated tile map length to default to 36');
    },
  },
  {
    name: 'traffic light tile is reserved as one non-door bonus tile',
    run: () => {
      const tileMap = applyLandmarkDoorTiles(generateTileMap(3, 'normal', 'forest', 0));
      assertEqual(tileMap[TRAFFIC_LIGHT_TILE_INDEX].tileType, 'traffic_light', 'Expected traffic light tile to be present');
      assertEqual(tileMap.filter((entry) => entry.tileType === 'traffic_light').length, 1, 'Expected exactly one traffic light tile');
    },
  },
  {
    name: 'explicit spark40 ring profile resolves safely',
    run: () => {
      const previewProfile = resolveIslandBoardProfile('spark40_ring');
      assertEqual(previewProfile.tileCount, 36, 'Expected ring profile to expose 36-tile topology');

      const previewTileMap = generateTileMap(3, 'normal', 'forest', 0, { profileId: 'spark40_ring' });
      assertEqual(previewTileMap.length, 36, 'Expected ring tile map generation to support 36 tiles');
    },
  },
  {
    // P2-10 regression. `seededRandom(0)` previously returned 0 because
    // xorshift from 0 stays at 0, which caused `generateTileMap` to pick
    // `TILE_POOL[0]` (currency) for every tile — a silent degenerate board.
    // Production callers pass `islandNumber ≥ 1`, but any dev/QA path
    // that fed island 0 hit this. The fallback clamp inside seededRandom
    // (`s = (seed | 0) || 1`) restores variety.
    name: 'P2-10: seed=0 does not collapse the tile pool to a single type',
    run: () => {
      const tileMap = generateTileMap(0, 'normal', 'forest', 0);
      assertEqual(tileMap.length, 36, 'Expected 36 tiles for seed 0');
      const uniqueTypes = new Set(tileMap.map((t) => t.tileType));
      // Encounter may not appear for every island; but at minimum the four
      // base pool types should collectively produce >=3 distinct entries.
      // Anything less than 3 means the seeded RNG has collapsed.
      assertEqual(uniqueTypes.size >= 3, true, `Expected tile variety for seed 0, got types: ${[...uniqueTypes].join(', ')}`);
    },
  },
];
