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
];
