import { island001NarrativeDefinition } from '../definitions/island001Narrative';
import { assert, assertEqual, type TestCase } from '../../services/__tests__/testHarness';

function beat(id: string) {
  const found = island001NarrativeDefinition.beats.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing beat ${id}`);
  return found;
}

export const island001NarrativeTests: TestCase[] = [
  { name: 'I001-B24 targets Hatchery Level 1 completion', run: () => assertEqual(JSON.stringify(beat('I001-B24').trigger), JSON.stringify({ kind: 'landmark_level_completed', islandNumber: 1, stopId: 'hatchery', level: 1 }), 'Expected Hatchery L1 milestone') },
  { name: 'finale setup uses boss_eligible', run: () => assertEqual(beat('I001-B26').trigger.kind, 'boss_eligible', 'Expected boss_eligible trigger') },
  { name: 'resolution uses boss_resolved', run: () => assertEqual(beat('I001-B29').trigger.kind, 'boss_resolved', 'Expected boss_resolved trigger') },
  { name: 'travel-ready beat has display CTA text but no travel action', run: () => { const travelReady = beat('I001-B30') as Record<string, unknown>; assertEqual(travelReady.displayCtaText, 'Follow the restored route', 'Expected display CTA'); assert(!('travel' in travelReady), 'Travel-ready beat must not include travel action'); assert(!('actionId' in travelReady), 'Travel-ready beat must not include actionId'); } },
  { name: 'no permanent feature flag field or dependency is present', run: () => { const serialized = JSON.stringify(island001NarrativeDefinition); assert(!serialized.includes('islandRunNarrativePilotEnabled'), 'Narrative definition must not include permanent narrative feature flag'); } },
  { name: 'approved Island 1 characters are included', run: () => assertEqual(island001NarrativeDefinition.characters.map((character) => character.id).join(','), 'miri,sava,poko,ivo,noctyra', 'Expected approved character IDs') },

  // --- Authored (PR2) beat content for the five landmarks + boss framing ---
  { name: 'every beat trigger is scoped to Island 1', run: () => island001NarrativeDefinition.beats.forEach((b) => assertEqual((b.trigger as { islandNumber: number }).islandNumber, 1, `${b.id} trigger must be Island 1`)) },
  { name: 'every dialogue/toast beat has display text', run: () => island001NarrativeDefinition.beats.filter((b) => b.surface !== 'story_reader').forEach((b) => assert(typeof b.text === 'string' && b.text.trim().length > 0, `${b.id} requires text`)) },
  { name: 'mobile dialogue length stays within the 110-char limit', run: () => island001NarrativeDefinition.beats.forEach((b) => assert(!b.text || b.text.length <= 110, `${b.id} text exceeds mobile limit`)) },
  { name: 'habit/mystery/wisdom stop-opened intros are authored', run: () => { assertEqual(beat('I001-B09').trigger.kind, 'stop_opened', 'B09 habit open'); assertEqual((beat('I001-B14').trigger as { stopId: string }).stopId, 'mystery', 'B14 mystery open'); assertEqual((beat('I001-B19').trigger as { stopId: string }).stopId, 'wisdom', 'B19 wisdom open'); } },
  { name: 'stop-completed beats are authored for all four non-boss stops', run: () => ['I001-B05', 'I001-B10', 'I001-B15', 'I001-B20'].forEach((id) => assertEqual(beat(id).trigger.kind, 'stop_completed', `${id} should be stop_completed`)) },
  { name: 'wisdom reveal carries the non-judgmental restoration framing', run: () => { const b = beat('I001-B20') as Record<string, unknown>; assertEqual(b.secondaryText, 'Aim to free her, not to fight her.', 'Expected reveal framing'); assertEqual(b.priority, 'major', 'Reveal is a major beat'); } },
  { name: 'majority-restored beat uses a 3-of-5 threshold', run: () => assertEqual(JSON.stringify(beat('I001-B25').trigger), JSON.stringify({ kind: 'landmarks_restored_majority', islandNumber: 1, threshold: 3 }), 'Expected majority threshold 3') },
  { name: 'boss framing beats are authored and non-blocking toasts', run: () => { assertEqual(beat('I001-B27').trigger.kind, 'boss_challenge_started', 'B27 boss start'); assertEqual(beat('I001-B27').surface, 'toast', 'B27 must be a non-blocking toast'); assertEqual(beat('I001-B28').trigger.kind, 'boss_midpoint', 'B28 boss midpoint'); } },
  { name: 'shipped B24 still owns the Hatchery L1 reaction (no duplicate B06)', run: () => { assert(!island001NarrativeDefinition.beats.some((b) => b.id === 'I001-B06'), 'B06 must stay omitted'); const l1 = island001NarrativeDefinition.beats.filter((b) => b.trigger.kind === 'landmark_level_completed' && (b.trigger as { stopId: string; level: number }).stopId === 'hatchery' && (b.trigger as { level: number }).level === 1); assertEqual(l1.length, 1, 'Exactly one Hatchery L1 beat should exist'); assertEqual(l1[0].id, 'I001-B24', 'Hatchery L1 stays B24'); } },
];
