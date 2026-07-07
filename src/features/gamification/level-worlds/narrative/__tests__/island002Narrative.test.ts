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
  { name: 'Pebble Bay identity is preserved while prophecy frame is canonical', run: () => { assertEqual(island002NarrativeDefinition.islandName, 'Pebble Bay', 'island name'); assertEqual(island002NarrativeDefinition.civilizationName, 'The Tidefolk of The Last Word', 'civilization'); } },
  { name: 'approved Island 2 cast preserves Pebble Bay and adds The Last Word', run: () => assertEqual(island002NarrativeDefinition.characters.map((c) => c.id).join(','), 'sela,bryn,tobin,maelis,last-word,ivo', 'Expected approved cast ids') },
  { name: 'every beat id matches I002-B## and trigger is Island 2', run: () => island002NarrativeDefinition.beats.forEach((b) => { assert(/^I002-B\d{2}$/.test(b.id), `bad id ${b.id}`); assertEqual((b.trigger as { islandNumber: number }).islandNumber, 2, `${b.id} island`); }) },
  { name: 'dialogue stays within the mobile length limit', run: () => island002NarrativeDefinition.beats.forEach((b) => { assert(!b.text || b.text.length <= 110, `${b.id} text too long (${b.text?.length})`); assert(!b.secondaryText || b.secondaryText.length <= 110, `${b.id} secondary text too long (${b.secondaryText?.length})`); }) },
  { name: 'first prophecy PR is reaction-only (no deferred illustrated-episode triggers)', run: () => island002NarrativeDefinition.beats.forEach((b) => assert(!DEFERRED_TRIGGER_KINDS.has(b.trigger.kind), `${b.id} uses deferred trigger ${b.trigger.kind}`)) },
  { name: 'The Last Word prophecy and instructions are present in runtime-readable beats', run: () => { assertEqual(beat('I002-B04').text, 'MOVE THE CEREMONY TO THE EAST PLAZA.', 'east plaza instruction'); assertEqual(beat('I002-B09').text, 'DO NOT POWER DOWN THE SECOND SUN.', 'second sun instruction'); assertEqual(beat('I002-B15').text, 'THE REGAL MUST STAND ALONE AT THE FINAL BELL.', 'final bell instruction'); assert(beat('I002-B23').text?.includes('WHEN THE SECOND SUN FALLS'), 'prophecy line present'); } },
  { name: 'wisdom reveal carries Sela finger-removal decision', run: () => { const b = beat('I002-B17'); assertEqual((beat('I002-B17').trigger as { stopId: string }).stopId, 'wisdom', 'reveal is the wisdom completion'); assertEqual(b.priority, 'major', 'reveal is a major beat'); assert(String(b.text).includes('lift my finger'), 'Sela finger-removal choice'); } },
  { name: 'boss framing keeps public rescue and board exposure non-blocking', run: () => { assertEqual(beat('I002-B22').trigger.kind, 'boss_challenge_started', 'B22 start'); assertEqual(beat('I002-B22').surface, 'toast', 'B22 toast'); assertEqual(beat('I002-B23').trigger.kind, 'boss_midpoint', 'B23 midpoint'); assertEqual(beat('I002-B23').speakerId, 'last-word', 'B23 is The Last Word'); } },
  { name: 'finale-setup beat fires on boss eligibility (Sela, major)', run: () => { assertEqual(beat('I002-B24').trigger.kind, 'boss_eligible', 'B24 boss_eligible'); assertEqual(beat('I002-B24').speakerId, 'sela', 'B24 is Sela'); assertEqual(beat('I002-B24').priority, 'major', 'B24 is major'); assertEqual(resolveReactionBeat({ kind: 'boss_eligible', islandNumber: 2 }, 2, island002NarrativeDefinition)?.id, 'I002-B24', 'boss_eligible -> B24'); } },
  { name: 'The Last Word speaker resolves from character registry', run: () => { const boardBeat = beat('I002-B04'); const toast = buildReactionToast(boardBeat, island002NarrativeDefinition); assertEqual(toast?.speakerName, 'The Last Word', 'board speaker resolves'); } },
  { name: 'reaction beats resolve and build their surface payloads from content', run: () => {
    const open = resolveReactionBeat({ kind: 'stop_opened', islandNumber: 2, stopId: 'habit' }, 2, island002NarrativeDefinition);
    assertEqual(open?.id, 'I002-B06', 'habit open -> B06');
    const dialogue = buildReactionDialogue(open!, island002NarrativeDefinition);
    assertEqual(dialogue?.speakerName, 'Sela', 'B06 speaker resolves to Sela');
    const reveal = resolveReactionBeat({ kind: 'stop_completed', islandNumber: 2, stopId: 'wisdom' }, 2, island002NarrativeDefinition);
    assertEqual(buildReactionDialogue(reveal!, island002NarrativeDefinition)?.speakerName, 'Sela', 'reveal speaker resolves to Sela');
  } },
];
