import snapshot from './content.snapshot.json';
import { ROSTER_BRIEFS } from './rosterBriefs';
import { ARCHETYPE_DECK, SUIT_COLORS, SUIT_GLYPHS, type SuitKey } from '../identity/archetypes/archetypeDeck';
export { SUIT_COLORS, SUIT_GLYPHS };
export const MASKS = snapshot.masks;
export const FAMILIES = snapshot.families.map(family => ({ ...family,
  mix: family.mix ?? (ROSTER_BRIEFS[family.id]?.slice(0,3) ?? null),
  mixRationale: ROSTER_BRIEFS[family.id]?.[3] ?? 'Retained six-family pilot direction; authored motivation target, not psychological validation.',
  mixStatus: family.mix ? 'pilot' as const : 'draft' as const,
}));
export type Family = typeof FAMILIES[number];
export const getFamily = (id: string) => FAMILIES.find(family => family.id === id);
export const getMask = (id: string) => MASKS.find(mask => mask.id === id);
export const getSuit = (family: Family): SuitKey => ARCHETYPE_DECK.find(a => a.id === family.mix?.[0])?.suit ?? 'spirit';

/** Reserved face grammar: every mask has its own expression, not 32 recoloured faces. */
export const MASK_FACE_BRIEFS: Record<string, string> = {
  commander: 'Level direct gaze; raised outer brow; firm open mouth. Vertical split crest.',
  champion: 'Forward gaze under climbing brows; determined half-open mouth. Swept wedge.',
  strategist: 'Offset measuring gaze; horizontal brow; resting mouth. Stepped square.',
  challenger: 'One inward brow; focused eyes; protesting mouth. Broken diagonal rim.',
  guardian: 'Attentive gaze; strong canopy brow; softened mouth. Broad shelter arch.',
  warlord: 'Narrow intent eyes; heavy inward ridge; clenched mouth. Low angular slab.',
  diplomat: 'Direct welcoming gaze; lifted brow corner; restrained smile. Twin balanced planes.',
  enforcer: 'Straight gaze; flat parallel brows; compressed lip. Severe tapered rectangle.',
  caregiver: 'Downward attentive gaze; softened inner brows; warm small mouth. Cupped oval.',
  mentor: 'Upward encouraging brow; attentive narrow eyes; proud smile. Open fan.',
  peacemaker: 'Level relaxed lids; broad brow arc; released mouth. Horizontal ripple disc.',
  altruist: 'Outward reaching gaze; concerned brow; hopeful parted lips. Open-sided heart plane.',
  empath: 'Moist reflective gaze; gathered brows; tremulous mouth. Unequal soft lobes.',
  healer: 'Low compassionate gaze; protective overhang; quiet mouth. Repaired folded shell.',
  connector: 'Bright outward gaze; lifted cheek planes; laughing mouth. Radiating rounded spokes.',
  devotee: 'Steady sideward gaze; gently raised inner brow; grateful smile. Wrapped teardrop.',
  sage: 'Long resting lids; spacious brow; nearly still mouth. Wide weathered crescent.',
  analyst: 'Pinpoint eyes; one tilted ridge; satisfied mouth corner. Faceted diamond.',
  architect: 'Upward measuring eyes; tiered brows; poised mouth. Interlocking stepped arch.',
  inventor: 'Unequal widened eyes; offset raised brows; excited grin. Cantilevered spiral.',
  scholar: 'Close focused gaze; gently raised brow; tiny delighted mouth. Layered folio shape.',
  detective: 'One narrowed eye; descending ridge; questioning mouth. Off-centre lens frame.',
  philosopher: 'Farward thoughtful gaze; asymmetrical arch; wistful parted mouth. Open-loop contour.',
  engineer: 'Even focused eyes; straight calm brow; satisfied mouth. Braced hexagonal frame.',
  explorer: 'Side-searching eyes; raised leading brow; eager mouth. Tilted forward crescent.',
  creator: 'Upward delighted gaze; dancing brows; expressive broad mouth. Unequal flowing petals.',
  rebel: 'Asymmetrical lids; defiant lifted ridge; crooked knowing smile. Deliberately broken rim.',
  visionary: 'Far-horizon eyes; lifted broad brow; hopeful mouth. Upward flaring crown.',
  mystic: 'Small upward gaze; vaulted brow; awe-parted mouth. Suspended inner oval.',
  dreamer: 'Searching gaze; one lifted brow; tiny parted mouth. Soft offset moonfold.',
  shaman: 'Listening gaze; slow inclined ridge; reverent still mouth. Nested listening hollows.',
  pioneer: 'Forward alert eyes; angled advancing brow; braced mouth. Asymmetric prow.',
};

export function contentReadiness() {
  return { masks: MASKS.length, families: FAMILIES.length, forms: FAMILIES.reduce((n, f) => n + f.forms.length, 0),
    approvedMasks: MASKS.filter(m => m.productionAsset !== null).length,
    approvedForms: FAMILIES.flatMap(f => f.forms).filter(f => f.productionAsset !== null).length };
}
