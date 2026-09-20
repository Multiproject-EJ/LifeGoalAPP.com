/** Review candidates are deliberately separate from approved production assets and ownership. */
import { CREATURE_BATCH, TWILIGHT_EVOLUTION } from './creatureBatch';
import { EVOLUTION_STUDIES } from './evolutionStudies';
export const MASK_ART_CANDIDATES: Record<string, string> = {
  dreamer: '/assets/archetype-masks/candidates/dreamer-v1.png',
  guardian: '/assets/archetype-masks/candidates/guardian-v1.png',
  caregiver: '/assets/archetype-masks/candidates/caregiver-v2.png',
  analyst: '/assets/archetype-masks/candidates/analyst-v1.png',
};
export const LEGACY_FORM_ART_CANDIDATES: Record<string, Record<number, string>> = {
  'common-bloom-mite': {2:'/assets/creatures/candidates/bloom-mite/form-2-v2.png'},
  'mythic-echo-phoenix': {2:'/assets/creatures/candidates/echo-phoenix/form-2-v1.png'},
  'common-twilight-seed': {
    1: '/assets/creatures/candidates/twilight-seed/form-1-v1.png',
    2: '/assets/creatures/candidates/twilight-seed/form-2-v2.png',
    3: '/assets/creatures/candidates/twilight-seed/form-3-v1.png',
  },
};
export const FORM_ART_CANDIDATES: Record<string, Record<number, string>> = {
  ...LEGACY_FORM_ART_CANDIDATES,
  ...Object.fromEntries(CREATURE_BATCH.map(entry => [entry.familyId, {[entry.form]: entry.card}])),
  'common-twilight-seed': Object.fromEntries(TWILIGHT_EVOLUTION.map(entry => [entry.form, entry.card])),
  ...Object.fromEntries(EVOLUTION_STUDIES.map(line => [line.familyId, Object.fromEntries(line.forms.map(entry => [entry.form, entry.card]))])),
};
export function candidateFormArt(familyId: string, form: number) { return FORM_ART_CANDIDATES[familyId]?.[form] ?? null; }
