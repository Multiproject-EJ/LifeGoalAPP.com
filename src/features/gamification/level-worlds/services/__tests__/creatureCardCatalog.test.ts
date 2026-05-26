import { CREATURE_CATALOG } from '../creatureCatalog';
import { CREATURE_CARD_CATALOG, getCreatureCardMetadata } from '../creatureCardCatalog';
import { assert, assertEqual, type TestCase } from './testHarness';

function isNonEmpty(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export const creatureCardCatalogTests: TestCase[] = [
  {
    name: 'creature card catalog covers every creature and has no unknown ids',
    run: () => {
      const creatureIds = new Set(CREATURE_CATALOG.map((creature) => creature.id));
      const cardIds = new Set(CREATURE_CARD_CATALOG.map((card) => card.creatureId));

      assertEqual(cardIds.size, CREATURE_CATALOG.length, 'Expected one curated card metadata entry per catalog creature');
      for (const creatureId of creatureIds) {
        assert(cardIds.has(creatureId), `Missing curated card metadata for creature id ${creatureId}`);
      }
      for (const cardId of cardIds) {
        assert(creatureIds.has(cardId), `Found unknown metadata id outside creature catalog: ${cardId}`);
      }
    },
  },
  {
    name: 'every creature resolves non-empty metadata fields with matching id',
    run: () => {
      for (const creature of CREATURE_CATALOG) {
        const metadata = getCreatureCardMetadata(creature);
        assertEqual(metadata.creatureId, creature.id, `Metadata creatureId should match base creature id for ${creature.id}`);
        assert(isNonEmpty(metadata.displayName), `${creature.id}: displayName must be non-empty`);
        assert(isNonEmpty(metadata.shortTitle), `${creature.id}: shortTitle must be non-empty`);
        assert(isNonEmpty(metadata.rarityLabel), `${creature.id}: rarityLabel must be non-empty`);
        assert(isNonEmpty(metadata.flavorQuote), `${creature.id}: flavorQuote must be non-empty`);
        assert(isNonEmpty(metadata.passiveName), `${creature.id}: passiveName must be non-empty`);
        assert(isNonEmpty(metadata.passiveText), `${creature.id}: passiveText must be non-empty`);
        assert(isNonEmpty(metadata.powerLabel), `${creature.id}: powerLabel must be non-empty`);
        assert(isNonEmpty(metadata.statLine), `${creature.id}: statLine must be non-empty`);
        assert(isNonEmpty(metadata.theme.accent), `${creature.id}: theme.accent must be non-empty`);
        assert(isNonEmpty(metadata.theme.template), `${creature.id}: theme.template must be non-empty`);
      }
    },
  },
];
