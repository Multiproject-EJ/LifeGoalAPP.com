import { CREATURE_CATALOG } from '../creatureCatalog';
import {
  buildCreatureCardBackView,
  buildCreatureCardFullView,
  buildCreatureCardSimpleView,
  buildCreatureCardV2RecordFromExistingCatalog,
} from '../creatureCardV2Adapter';
import { assert, type TestCase } from './testHarness';

export const creatureCardV2AdapterTests: TestCase[] = [
  {
    name: 'every catalog creature produces a simple v2 view with expected required fields',
    run: () => {
      for (const creature of CREATURE_CATALOG) {
        const view = buildCreatureCardSimpleView(creature);
        assert(view.creatureId === creature.id, `simple view id mismatch: ${creature.id}`);
        assert(view.displayName.trim().length > 0, `${creature.id}: displayName must be non-empty`);
        assert(view.rarityLabel.trim().length > 0, `${creature.id}: rarityLabel must be non-empty`);
        assert(view.image.cutoutSrc.trim().length > 0, `${creature.id}: cutoutSrc must be non-empty`);
        assert(view.image.silhouetteSrc.trim().length > 0, `${creature.id}: silhouetteSrc must be non-empty`);
        assert(view.image.fallbackEmoji.trim().length > 0, `${creature.id}: fallbackEmoji must be non-empty`);
      }
    },
  },
  {
    name: 'every catalog creature produces a full v2 view with safe unsupported placeholders',
    run: () => {
      for (const creature of CREATURE_CATALOG) {
        const view = buildCreatureCardFullView(creature);
        assert(view.creatureId === creature.id, `full view id mismatch: ${creature.id}`);
        assert(view.header.displayName.trim().length > 0, `${creature.id}: header displayName must be non-empty`);
        assert(view.header.rarityLabel.trim().length > 0, `${creature.id}: header rarityLabel must be non-empty`);
        assert(view.header.affinityLabel.trim().length > 0, `${creature.id}: header affinityLabel must be non-empty`);
        assert(view.art.heroSrc.trim().length > 0, `${creature.id}: heroSrc must be non-empty`);
        assert(view.header.creatureNumberLabel === undefined, `${creature.id}: creatureNumberLabel should remain undefined`);
        assert(view.header.typeIconSrc === undefined, `${creature.id}: typeIconSrc should remain undefined`);
        assert(view.tags.strengths.length === 0, `${creature.id}: strengths should be empty`);
        assert(view.tags.weaknesses.length === 0, `${creature.id}: weaknesses should be empty`);
      }
    },
  },
  {
    name: 'back view adapter is pure and does not require runtime player state',
    run: () => {
      for (const creature of CREATURE_CATALOG) {
        const view = buildCreatureCardBackView(creature);
        assert(view.creatureId === creature.id, `back view id mismatch: ${creature.id}`);
        assert(view.favoriteFoods.length === 0, `${creature.id}: favoriteFoods should default empty`);
        assert(view.synergyTags.length === 0, `${creature.id}: synergyTags should default empty`);
        assert(view.eventHistory.length === 0, `${creature.id}: eventHistory should default empty`);
        assert(view.stageEvolutionNotes.length === 0, `${creature.id}: stageEvolutionNotes should default empty`);
      }
    },
  },
  {
    name: 'v2 record projection preserves known data and leaves future fields undefined/empty',
    run: () => {
      for (const creature of CREATURE_CATALOG) {
        const record = buildCreatureCardV2RecordFromExistingCatalog(creature);
        assert(record.creatureId === creature.id, `record id mismatch: ${creature.id}`);
        assert(record.identity.displayName.trim().length > 0, `${creature.id}: record displayName must be non-empty`);
        assert(record.identity.dexNumber === undefined, `${creature.id}: dexNumber should remain undefined`);
        assert(record.identity.typeIconKey === undefined, `${creature.id}: typeIconKey should remain undefined`);
        assert((record.frontFull.abilities ?? []).length === 0, `${creature.id}: frontFull.abilities should remain empty`);
        assert((record.variants ?? []).length === 0, `${creature.id}: variants should remain empty`);
      }
    },
  },
];
