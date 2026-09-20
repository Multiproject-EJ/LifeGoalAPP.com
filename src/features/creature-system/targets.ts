import { SCENARIO_QUESTION_BANK } from '../identity/personalityTestDataV2';
import { buildEvidenceProfile, withRefinement } from './personality';
import { authorMotiveFixture } from './refinement';
import { FAMILIES } from './content';

/** Authored, coherent scenario choices, not independent 32-dimensional score guesses.
 * Groups follow planner / bounce-back / co-op / explorer / sprinter question order.
 * These six targets are experimental; the rest of the roster is deliberately unscored.
 */
export const TARGET_BRIEFS = [
  { id: 'common-twilight-seed', label: 'Imaginative, sensitive, exploratory', choices: 'bdcb bdbb bcdd cabb bdbb', intent: 'Leaves room for possibility, feels feedback personally, explores thoughtfully.' },
  { id: 'common-bloom-mite', label: 'Caring, encouraging, steady', choices: 'bbba bbbb bbbb bdcd ccba', intent: 'Small sustainable routines, trusted company, gentle encouragement.' },
  { id: 'mythic-echo-phoenix', label: 'Driven, outgoing, experimental', choices: 'bcac aaaa aaaa daab aaaa', intent: 'Moves quickly, recovers quickly, learns in public and pushes forward.' },
  { id: 'rare-cinder-mouse', label: 'Protective, committed, boundary-setting', choices: 'aaba abbc bbcc bbcd cbaa', intent: 'Keeps commitments, trusts a close circle, resists intrusive advice.' },
  { id: 'mythic-celest-pup', label: 'Independent, mischievous, inventive', choices: 'dccd bcac cdca daaa bdcb', intent: 'Improvises independently, tests unfamiliar ideas, questions the obvious.' },
  { id: 'mythic-lux-leviathan', label: 'Composed, systematic, analytical', choices: 'aada aaaa ccca abbc ccba', intent: 'Plans deliberately, researches first, returns calmly and keeps a steady pace.' },
] as const;

export function answersFromChoices(choices: string) {
  const letters = choices.replace(/\s/g, '');
  if (letters.length !== SCENARIO_QUESTION_BANK.length) throw new Error('Target must answer every scenario');
  return Object.fromEntries(SCENARIO_QUESTION_BANK.map((q, i) => {
    if (!q.options.some(o => o.id === letters[i])) throw new Error(`Invalid choice for ${q.id}`);
    return [q.id, letters[i]];
  }));
}
export const CREATURE_TARGETS = TARGET_BRIEFS.map(target => ({ ...target, profile: buildEvidenceProfile(answersFromChoices(target.choices)) }));

export const REFINED_TARGET_MIXES: Record<string, readonly string[]> = {
  'common-twilight-seed': ['dreamer', 'creator', 'explorer'],
  'common-bloom-mite': ['caregiver', 'empath', 'mentor'],
  'mythic-echo-phoenix': ['champion', 'pioneer', 'commander'],
  'rare-cinder-mouse': ['guardian', 'challenger', 'devotee'],
  'mythic-celest-pup': ['rebel', 'inventor', 'mystic'],
  'mythic-lux-leviathan': ['strategist', 'architect', 'commander'],
};
// Versioned alternative, not a rewrite of the diagnostic baseline above.
export const REFINED_CREATURE_TARGETS = CREATURE_TARGETS.map(target => ({ ...target,
  profile: withRefinement(target.profile, authorMotiveFixture(REFINED_TARGET_MIXES[target.id])),
}));

/** Full-roster draft, same sparse 5/4/3 authoring rule as the six-target control.
 * Do not fabricate foundation responses for the added families.
 */
export const ROSTER_CREATURE_TARGETS = FAMILIES.filter(f => f.mix).map(family => ({
  id: family.id, label: family.name, intent: family.mixRationale,
  profile: withRefinement(buildEvidenceProfile({}), authorMotiveFixture(family.mix!)),
}));
