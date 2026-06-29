import { island003NarrativeDefinition } from '../definitions/island003Narrative';
import { island004NarrativeDefinition } from '../definitions/island004Narrative';
import { island005NarrativeDefinition } from '../definitions/island005Narrative';
import { resolveReactionBeat } from '../islandNarrativeReactionDispatch';
import type { IslandNarrativeDefinition } from '../islandNarrativeTypes';
import { assert, assertEqual, type TestCase } from '../../services/__tests__/testHarness';

const DEFERRED_TRIGGER_KINDS = new Set([
  'island_entered',
  'arrival_closed',
  'boss_resolved',
  'island_clear_travel_ready',
]);

type Expected = { def: IslandNarrativeDefinition; islandNumber: number; name: string; civ: string; cast: string };

const ISLANDS: Expected[] = [
  { def: island003NarrativeDefinition, islandNumber: 3, name: 'Coconut Cove', civ: 'The Covefolk', cast: 'pip,liko,nuru,tamba,ivo' },
  { def: island004NarrativeDefinition, islandNumber: 4, name: 'Driftwood Isle', civ: 'The Driftfolk', cast: 'wren,fenn,bodie,garran,ivo' },
  { def: island005NarrativeDefinition, islandNumber: 5, name: 'Crown of Tides', civ: 'The Reefborn', cast: 'reev,cael,sprat,thalassa,ivo' },
];

export const island003to005NarrativeTests: TestCase[] = ISLANDS.flatMap(({ def, islandNumber, name, civ, cast }) => {
  const prefix = `I${String(islandNumber).padStart(3, '0')}`;
  const beat = (n: string) => {
    const found = def.beats.find((b) => b.id === `${prefix}-B${n}`);
    if (!found) throw new Error(`Missing ${prefix}-B${n}`);
    return found;
  };
  return [
    { name: `${name}: identity and approved cast`, run: () => {
      assertEqual(def.islandName, name, 'island name');
      assertEqual(def.civilizationName, civ, 'civilization');
      assertEqual(def.characters.map((c) => c.id).join(','), cast, 'cast ids');
    } },
    { name: `${name}: 24 beats, all ${prefix}-B## scoped to island ${islandNumber}`, run: () => {
      assertEqual(def.beats.length, 24, 'beat count');
      def.beats.forEach((b) => {
        assert(new RegExp(`^${prefix}-B\\d{2}$`).test(b.id), `bad id ${b.id}`);
        assertEqual((b.trigger as { islandNumber: number }).islandNumber, islandNumber, `${b.id} island`);
      });
    } },
    { name: `${name}: copy within mobile length limit`, run: () => def.beats.forEach((b) => assert(!b.text || b.text.length <= 110, `${b.id} too long (${b.text?.length})`)) },
    { name: `${name}: reaction-only (no deferred illustrated-episode triggers)`, run: () => def.beats.forEach((b) => assert(!DEFERRED_TRIGGER_KINDS.has(b.trigger.kind), `${b.id} uses deferred ${b.trigger.kind}`)) },
    { name: `${name}: wisdom reveal (B17) is a major guardian reveal with framing`, run: () => {
      const b = beat('17');
      assertEqual((b.trigger as { stopId: string }).stopId, 'wisdom', 'reveal is wisdom completion');
      assertEqual(b.priority, 'major', 'reveal is major');
      assert(typeof b.secondaryText === 'string' && b.secondaryText.length > 0, 'reveal has framing line');
    } },
    { name: `${name}: boss framing beats are non-blocking toasts`, run: () => {
      assertEqual(beat('22').trigger.kind, 'boss_challenge_started', 'B22 start');
      assertEqual(beat('22').surface, 'toast', 'B22 toast');
      assertEqual(beat('23').trigger.kind, 'boss_midpoint', 'B23 midpoint');
      assertEqual(beat('23').surface, 'toast', 'B23 toast');
    } },
    { name: `${name}: finale-setup beat (B24) fires on boss eligibility`, run: () => {
      assertEqual(beat('24').trigger.kind, 'boss_eligible', 'B24 boss_eligible');
      assertEqual(beat('24').priority, 'major', 'B24 is major');
      assertEqual(resolveReactionBeat({ kind: 'boss_eligible', islandNumber }, islandNumber, def)?.id, `${prefix}-B24`, 'boss_eligible round-trips');
    } },
    { name: `${name}: a sample beat round-trips through the dispatch`, run: () => {
      const opened = resolveReactionBeat({ kind: 'stop_opened', islandNumber, stopId: 'habit' }, islandNumber, def);
      assertEqual(opened?.id, `${prefix}-B06`, 'habit open resolves to B06');
    } },
  ];
});
