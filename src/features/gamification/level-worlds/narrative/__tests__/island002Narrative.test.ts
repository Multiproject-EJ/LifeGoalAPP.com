import { island002NarrativeDefinition } from '../definitions/island002Narrative';
import { buildReactionDialogue, buildReactionToast, resolveReactionBeat } from '../islandNarrativeReactionDispatch';
import { assert, assertEqual, type TestCase } from '../../services/__tests__/testHarness';

function beat(id: string) {
  const found = island002NarrativeDefinition.beats.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing beat ${id}`);
  return found;
}

const DEFERRED_TRIGGER_KINDS = new Set([
  'island_entered',
  'arrival_closed',
  'boss_resolved',
  'island_clear_travel_ready',
]);

export const island002NarrativeTests: TestCase[] = [
  { name: 'Pebble Bay identity is set', run: () => { assertEqual(island002NarrativeDefinition.islandName, 'Pebble Bay', 'island name'); assertEqual(island002NarrativeDefinition.civilizationName, 'The Tidefolk', 'civilization'); } },
  { name: 'approved Island 2 cast is included', run: () => assertEqual(island002NarrativeDefinition.characters.map((c) => c.id).join(','), 'sela,bryn,tobin,maelis,ivo', 'Expected approved cast ids') },
  { name: 'every beat id matches I002-B## and trigger is Island 2', run: () => island002NarrativeDefinition.beats.forEach((b) => { assert(/^I002-B\d{2}$/.test(b.id), `bad id ${b.id}`); assertEqual((b.trigger as { islandNumber: number }).islandNumber, 2, `${b.id} island`); }) },
  { name: 'dialogue stays within the mobile length limit', run: () => island002NarrativeDefinition.beats.forEach((b) => assert(!b.text || b.text.length <= 110, `${b.id} text too long (${b.text?.length})`)) },
  { name: 'first content PR is reaction-only (no deferred illustrated-episode triggers)', run: () => island002NarrativeDefinition.beats.forEach((b) => assert(!DEFERRED_TRIGGER_KINDS.has(b.trigger.kind), `${b.id} uses deferred trigger ${b.trigger.kind}`)) },
  { name: 'wisdom reveal carries the lesson + clue framing', run: () => { const b = beat('I002-B17') as Record<string, unknown>; assertEqual((beat('I002-B17').trigger as { stopId: string }).stopId, 'wisdom', 'reveal is the wisdom completion'); assertEqual(b.priority, 'major', 'reveal is a major beat'); assertEqual(b.secondaryText, 'Help her let it go, gently.', 'reveal framing'); } },
  { name: 'boss framing beats are authored as non-blocking toasts', run: () => { assertEqual(beat('I002-B22').trigger.kind, 'boss_challenge_started', 'B22 start'); assertEqual(beat('I002-B22').surface, 'toast', 'B22 toast'); assertEqual(beat('I002-B23').trigger.kind, 'boss_midpoint', 'B23 midpoint'); assertEqual(beat('I002-B23').speakerId, 'maelis', 'B23 is the guardian'); } },
  { name: 'finale-setup beat fires on boss eligibility (wisdom voice, major)', run: () => { assertEqual(beat('I002-B24').trigger.kind, 'boss_eligible', 'B24 boss_eligible'); assertEqual(beat('I002-B24').speakerId, 'bryn', 'B24 is the wisdom voice'); assertEqual(beat('I002-B24').priority, 'major', 'B24 is major'); assertEqual(resolveReactionBeat({ kind: 'boss_eligible', islandNumber: 2 }, 2, island002NarrativeDefinition)?.id, 'I002-B24', 'boss_eligible -> B24'); } },
  { name: 'speaker-less companion beat narrates as the island, not Island 1', run: () => { const companion = beat('I002-B04'); assert(!('speakerId' in companion) || !companion.speakerId, 'B04 has no speaker'); const toast = buildReactionToast(companion, island002NarrativeDefinition); assertEqual(toast?.speakerName, 'Pebble Bay', 'speaker-less beat narrates as Pebble Bay'); } },
  { name: 'reaction beats resolve and build their surface payloads from content', run: () => {
    const open = resolveReactionBeat({ kind: 'stop_opened', islandNumber: 2, stopId: 'habit' }, 2, island002NarrativeDefinition);
    assertEqual(open?.id, 'I002-B06', 'habit open -> B06');
    const dialogue = buildReactionDialogue(open!, island002NarrativeDefinition);
    assertEqual(dialogue?.speakerName, 'Sela', 'B06 speaker resolves to Sela');
    const reveal = resolveReactionBeat({ kind: 'stop_completed', islandNumber: 2, stopId: 'wisdom' }, 2, island002NarrativeDefinition);
    assertEqual(buildReactionDialogue(reveal!, island002NarrativeDefinition)?.speakerName, 'Keeper Bryn', 'reveal speaker resolves to Keeper Bryn');
  } },
];
