import { ARCHETYPE_DECK } from '../identity/archetypes/archetypeDeck';

export const REFINEMENT_VERSION = 'archetype-motives-draft-1' as const;
export const MOTIVE_STATEMENTS: Record<string, string> = {
  commander: 'I want to choose a shared direction and take responsibility for bringing people with me.',
  champion: 'I want to test myself against a demanding goal and inspire others through what I achieve.',
  strategist: 'I want to anticipate what comes next and choose the sequence that gets us there.',
  challenger: 'I want to question a rule or assumption when it limits what people can do.',
  guardian: 'I want to protect what matters, even when holding that boundary is uncomfortable.',
  warlord: 'I want to meet resistance head-on and prevail through determination.',
  diplomat: 'I want to find an agreement that gives people a reason to work together.',
  enforcer: 'I want commitments and standards to mean something, even when I must hold someone accountable.',
  caregiver: 'I want to notice and meet someone’s everyday needs, even when that care goes unseen.',
  mentor: 'I want to help someone develop their own ability, rather than solve everything for them.',
  peacemaker: 'I want to reduce hostility and help people find a way to coexist.',
  altruist: 'I want to contribute to a cause beyond my own circle, even without a personal return.',
  empath: 'I want to understand what an experience feels like from inside another person’s world.',
  healer: 'I want to help restore something hurt or broken, rather than move straight to the next challenge.',
  connector: 'I want to bring people into contact so relationships and communities can grow.',
  devotee: 'I want to remain deeply committed to a person or promise through changing circumstances.',
  sage: 'I want to understand what experience can teach us and turn it into useful wisdom.',
  analyst: 'I want to separate a claim into evidence and assumptions before accepting it.',
  architect: 'I want to design how the parts of a system fit together before building them.',
  inventor: 'I want to experiment with an unusual solution when the familiar one falls short.',
  scholar: 'I want to understand one subject deeply, even when it takes a long period of study.',
  detective: 'I want to follow clues until I can explain what is hidden or does not add up.',
  philosopher: 'I want to examine what an idea means and why it should matter in the first place.',
  engineer: 'I want to build and improve something practical until it works reliably.',
  explorer: 'I want to experience something unfamiliar and discover what is there.',
  creator: 'I want to give an inner idea or feeling a form that others can experience.',
  rebel: 'I want to live by a chosen path rather than accept a role simply because it is expected.',
  visionary: 'I want to see a different possible future and help others see it too.',
  mystic: 'I want to experience wonder and connection beyond what I can fully explain.',
  dreamer: 'I want to imagine possibilities, even before I know whether they can be made real.',
  shaman: 'I want to help people navigate meaningful transitions through shared reflection and symbolic practices.',
  pioneer: 'I want to take the first practical step into new territory, even without a proven route.',
};

export const MOTIVE_QUESTIONS = ARCHETYPE_DECK.map(card => ({
  id: `motive_${card.id}`, archetypeId: card.id, suit: card.suit, statement: MOTIVE_STATEMENTS[card.id],
}));
export const MOTIVE_RATINGS = [
  { value: 1, label: 'Not a pull for me' }, { value: 2, label: 'A little' },
  { value: 3, label: 'Sometimes' }, { value: 4, label: 'Often' }, { value: 5, label: 'A strong pull' },
] as const;

/** Directly reported motivation, separate from inferred foundation traits.
 * One statement per lens is a design prototype, not a validated personality instrument.
 * Completion is required for cross-lens comparisons: skips never become low ratings.
 */
export function scoreRefinement(input: Record<string, unknown>) {
  const answers: Record<string, number> = {};
  for (const question of MOTIVE_QUESTIONS) {
    const value = input[question.id];
    if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5) answers[question.id] = value;
  }
  const archetypes = ARCHETYPE_DECK.map(card => {
    const rating = answers[`motive_${card.id}`];
    return { id: card.id, name: card.name, suit: card.suit, score: rating === undefined ? null : (rating - 1) * 25,
      evidence: rating === undefined ? 0 : 1, missing: rating === undefined ? ['motivation response'] : [] };
  });
  const values = Object.values(answers), answeredCount = values.length;
  const status = answeredCount < MOTIVE_QUESTIONS.length ? 'incomplete' : new Set(values).size < 2 ? 'undifferentiated' : 'ready';
  const total = archetypes.reduce((sum, a) => sum + (a.score ?? 0), 0);
  const mix = status === 'ready' && total > 0 ? Object.fromEntries(archetypes.map(a => [a.id, a.score! / total])) : null;
  return { version: REFINEMENT_VERSION, answers, answeredCount, totalQuestions: MOTIVE_QUESTIONS.length, status, archetypes, mix };
}
export type RefinementEvidence = ReturnType<typeof scoreRefinement>;

/** Authoring fixture only: 5/4/3 for the defining mix, 1 for other motives.
 * Explicitly synthetic; never use to fill missing player answers.
 */
export function authorMotiveFixture(mix: readonly string[]) {
  if (mix.length !== 3 || new Set(mix).size !== 3 || mix.some(id => !MOTIVE_STATEMENTS[id])) throw new Error('Expected three distinct known archetypes');
  return Object.fromEntries(MOTIVE_QUESTIONS.map(q => {
    const index = mix.indexOf(q.archetypeId);
    return [q.id, index < 0 ? 1 : 5 - index];
  }));
}
