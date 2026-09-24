import {
  getIslandRunOrbitArmNumbers,
  ISLAND_RUN_ORBIT_ARM_COUNT,
  ISLAND_RUN_ORBIT_MAX_ISLANDS,
  resolveIslandRunOrbitAddress,
  resolveIslandRunOrbitFocusEntries,
} from '../islandRunOrbitTopology';
import { getIslandDisplayName } from '../islandNames';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandRunOrbitTopologyTests: TestCase[] = [
  {
    name: 'assigns all 120 islands to five unique 24-island arms',
    run: () => {
      const addresses = Array.from(
        { length: ISLAND_RUN_ORBIT_MAX_ISLANDS },
        (_, index) => resolveIslandRunOrbitAddress(index + 1),
      );
      const uniqueAddresses = new Set(addresses.map(({ armIndex, armStep }) => `${armIndex}:${armStep}`));

      assertEqual(uniqueAddresses.size, 120, 'Every island should have one unique orbit address');
      assertEqual(ISLAND_RUN_ORBIT_ARM_COUNT, 5, 'The compass should keep five starfish arms');
      for (let armIndex = 0; armIndex < ISLAND_RUN_ORBIT_ARM_COUNT; armIndex += 1) {
        assertEqual(getIslandRunOrbitArmNumbers(armIndex).length, 24, `Arm ${armIndex + 1} should contain 24 islands`);
      }
    },
  },
  {
    name: 'keeps chapter boundaries on adjacent arms',
    run: () => {
      assertDeepEqual(resolveIslandRunOrbitAddress(24), { islandNumber: 24, armIndex: 0, armStep: 23 }, 'Island 24 should finish the Shores arm');
      assertDeepEqual(resolveIslandRunOrbitAddress(25), { islandNumber: 25, armIndex: 1, armStep: 0 }, 'Island 25 should begin the Wilds arm');
      assertDeepEqual(resolveIslandRunOrbitAddress(120), { islandNumber: 120, armIndex: 4, armStep: 23 }, 'Island 120 should finish the final arm');
    },
  },
  {
    name: 'keeps local browsing sequential across atlas arm boundaries',
    run: () => {
      assertDeepEqual(resolveIslandRunOrbitFocusEntries(1), [null, null, 1, 2, 3], 'The first island has no previous destination');
      assertDeepEqual(resolveIslandRunOrbitFocusEntries(24), [22, 23, 24, 25, 26], 'The local route should not insert a fictional destination');
      assertDeepEqual(resolveIslandRunOrbitFocusEntries(25), [23, 24, 25, 26, 27], 'Both arms remain reachable');
      assertDeepEqual(resolveIslandRunOrbitFocusEntries(120), [118, 119, 120, null, null], 'The final island has no next destination');
      assertDeepEqual(resolveIslandRunOrbitFocusEntries(1, 1), [null, null, 1, null, null], 'A single-island map remains bounded');
    },
  },
  {
    name: 'keeps every focused neighborhood bounded and every island named',
    run: () => {
      const names = Array.from({ length: 120 }, (_, index) => getIslandDisplayName(index + 1));
      assertEqual(new Set(names).size, 120, 'Every map destination should have a distinct name');
      assertEqual(names[119], 'Final Horizon', 'The 120th destination should be the campaign capstone');

      for (let islandNumber = 1; islandNumber <= 120; islandNumber += 1) {
        const entries = resolveIslandRunOrbitFocusEntries(islandNumber);
        assertEqual(entries.length, 5, `Island ${islandNumber} should keep a stable five-slot focus layout`);
        assertEqual(entries.filter((entry) => entry === islandNumber).length, 1, `Island ${islandNumber} should appear once in its focus layout`);
        const numericEntries = entries.filter((entry): entry is number => typeof entry === 'number');
        assertEqual(numericEntries.every((entry) => entry >= 1 && entry <= 120), true, `Island ${islandNumber} should not reference an invalid destination`);
      }
    },
  },
];
