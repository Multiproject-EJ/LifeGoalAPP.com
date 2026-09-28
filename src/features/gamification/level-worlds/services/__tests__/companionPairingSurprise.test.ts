import { getCreatureById, getCompanionBonusForCreature } from '../creatureCatalog';
import { resolvePairingUpgradeSuggestion, rollCompanionPairingPerk } from '../companionPairingSurprise';
import { assert, assertEqual, type TestCase } from './testHarness';

export const companionPairingSurpriseTests: TestCase[] = [
  {
    name: 'pairing surprise: gifts vary by island visit, mostly natural, stable per visit, occasionally lucky',
    run: () => {
      const creature = getCreatureById('common-sproutling')!;
      const natural = getCompanionBonusForCreature(creature, 1).effect;
      const seen = new Map<string, number>();
      let lucky = 0;
      for (let island = 1; island <= 400; island += 1) {
        const perk = rollCompanionPairingPerk({ creature, bondLevel: 1, seedKey: `p:${creature.id}:0:${island}` });
        seen.set(perk.effect, (seen.get(perk.effect) ?? 0) + 1);
        if (perk.surprise === 'lucky') lucky += 1;
      }
      assert(seen.size === 3, 'every gift family appears across visits');
      assert((seen.get(natural) ?? 0) > 400 * 0.45, 'the natural gift is the most common');
      assert(lucky > 10 && lucky < 100, 'lucky doubles are occasional');
      const a = rollCompanionPairingPerk({ creature, bondLevel: 3, seedKey: 'p:x:0:7' });
      const b = rollCompanionPairingPerk({ creature, bondLevel: 3, seedKey: 'p:x:0:7' });
      assertEqual(JSON.stringify(a), JSON.stringify(b), 'stable for the same visit (no rerolls)');
    },
  },
  {
    name: 'Compass pairing tip: suggest an owned Perfect Match only when the current pet is not one',
    run: () => {
      assertEqual(resolvePairingUpgradeSuggestion({ activeCompanionId: 'a', perfectCompanionIds: ['m'], ownedCreatureIds: ['a', 'm'] }), 'm', 'owned match suggested');
      assertEqual(resolvePairingUpgradeSuggestion({ activeCompanionId: 'm', perfectCompanionIds: ['m'], ownedCreatureIds: ['a', 'm'] }), null, 'already paired with a match');
      assertEqual(resolvePairingUpgradeSuggestion({ activeCompanionId: 'a', perfectCompanionIds: ['m'], ownedCreatureIds: ['a'] }), null, 'never suggest a creature you do not own');
      assertEqual(resolvePairingUpgradeSuggestion({ activeCompanionId: null, perfectCompanionIds: ['m'], ownedCreatureIds: ['m'] }), 'm', 'unpaired players get the tip too');
    },
  },
];
