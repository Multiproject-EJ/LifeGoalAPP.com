import {
  createJourneyDiscArmory,
  getJourneyDiscUnlockedWeapons,
  isJourneyDiscArenaIsland,
  mergeJourneyDiscArmory,
  sanitizeJourneyDiscArmory,
  upgradeJourneyDiscWeapon,
} from '../journeyDiscArmory';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const journeyDiscArmoryTests: TestCase[] = [
  {
    name: 'arena returns on the island after every five-island chapter',
    run: () => {
      [1, 5, 7, 10, 12, 15].forEach((island) => assertEqual(isJourneyDiscArenaIsland(island), false, `Island ${island} is not an exhibition island`));
      [6, 11, 16, 21].forEach((island) => assertEqual(isJourneyDiscArenaIsland(island), true, `Island ${island} hosts the exhibition`));
    },
  },
  {
    name: 'weapon unlocks are bounded and survive conflict merges without regression',
    run: () => {
      const initial = createJourneyDiscArmory(10);
      assertEqual(initial.rank, 1, 'permanent fighter rank starts at Kindled');
      assertDeepEqual(getJourneyDiscUnlockedWeapons(initial), ['ram_fin'], 'only the starter Comet Fin begins unlocked');
      const upgraded = upgradeJourneyDiscWeapon(initial, 'aegis_ring', 20).armory;
      assertDeepEqual(getJourneyDiscUnlockedWeapons(upgraded), ['ram_fin', 'aegis_ring'], 'first Aegis upgrade unlocks it');
      const local = sanitizeJourneyDiscArmory({ rank: 3, weaponLevels: { ram_fin: 3, aegis_ring: 0, pulse_vane: 2 }, highestGuardianTierDefeated: 1, updatedAtMs: 30 });
      const merged = mergeJourneyDiscArmory(upgraded, local);
      assertEqual(merged.weaponLevels.ram_fin, 3, 'conflict merge preserves the strongest Comet Fin');
      assertEqual(merged.weaponLevels.aegis_ring, 1, 'conflict merge preserves the remote Aegis unlock');
      assertEqual(merged.weaponLevels.pulse_vane, 2, 'conflict merge preserves the local Pulse Vane');
      assertEqual(merged.highestGuardianTierDefeated, 1, 'Guardian clearance never regresses');
      assertEqual(merged.rank, 3, 'permanent fighter rank never regresses between islands');
      const clamped = sanitizeJourneyDiscArmory({ weaponLevels: { ram_fin: 99, aegis_ring: -4, pulse_vane: 9 }, highestGuardianTierDefeated: 9 });
      assertEqual(clamped.weaponLevels.ram_fin, 5, 'weapon levels cap at five');
      assertEqual(clamped.weaponLevels.aegis_ring, 0, 'negative levels clamp to zero');
      assertEqual(clamped.highestGuardianTierDefeated, 3, 'Guardian clearance caps at tier three');
    },
  },
];
