export type ArchetypeActivationElement =
  | 'fire'
  | 'water'
  | 'earth'
  | 'air'
  | 'light'
  | 'shadow'
  | 'heart'
  | 'mind';

export type ArchetypeActivationCopy = {
  archetypeId: string;
  coreGift: string;
  shadowPattern: string;
  activationTrigger: string;
  growthLesson: string;
  questPrompt: string;
  element?: ArchetypeActivationElement;
  elementIcon?: string;
  note?: string;
};

const FIRE_DIRECTION_NOTE = 'Fire is not the enemy. Fire is energy that needs direction.';

export const ARCHETYPE_ACTIVATION_COPY: Record<string, ArchetypeActivationCopy> = {
  challenger: {
    archetypeId: 'challenger',
    coreGift: 'You bring courage, directness, and the willingness to move when something matters.',
    shadowPattern: 'Your fire can become reactive when it tries to fight every battle at once.',
    activationTrigger: 'Injustice, blocked truth, disrespect, or unnecessary control can ignite action.',
    growthLesson: 'Use fire as directed energy, not collateral damage.',
    questPrompt: 'Where does your courage need a cleaner channel today?',
    element: 'fire',
    elementIcon: '🔥',
    note: FIRE_DIRECTION_NOTE,
  },
  guardian: {
    archetypeId: 'guardian',
    coreGift: 'You protect what matters and create safety through loyalty, steadiness, and care.',
    shadowPattern: 'You may carry too much responsibility or become tense when others do not act with care.',
    activationTrigger: 'Threats to people, values, promises, or stability can activate your protective energy.',
    growthLesson: 'Protection is strongest when it includes clear boundaries, not silent over-responsibility.',
    questPrompt: 'What boundary would protect your energy without closing your heart?',
    element: 'earth',
    elementIcon: '🛡️',
  },
  peacemaker: {
    archetypeId: 'peacemaker',
    coreGift: 'You create warmth, calm, and emotional safety. People often feel accepted around you.',
    shadowPattern: 'To preserve peace, you may over-accommodate, avoid friction, or stay comfortable for too long.',
    activationTrigger: 'Unfairness, conflict, disrespect, or emotional pain can suddenly wake up your fire.',
    growthLesson: 'You do not need pain to earn movement. Practice using small, conscious fire earlier.',
    questPrompt: 'What have you been tolerating that needs a loving but firm response?',
    element: 'fire',
    elementIcon: '🔥',
    note: FIRE_DIRECTION_NOTE,
  },
  analyst: {
    archetypeId: 'analyst',
    coreGift: 'You notice patterns, separate signal from noise, and bring clarity to complicated choices.',
    shadowPattern: 'You may stay in analysis too long when a small next step would teach you more.',
    activationTrigger: 'Confusion, unclear expectations, missing context, or rushed decisions can pull you into overthinking.',
    growthLesson: 'Let insight become action by choosing the smallest safe experiment.',
    questPrompt: 'What is one decision that needs a test, not another round of thinking?',
    element: 'mind',
    elementIcon: '📊',
  },
  strategist: {
    archetypeId: 'strategist',
    coreGift: 'You build structure, sequence, and long-range plans that make effort more reliable.',
    shadowPattern: 'Your discipline can become rigid when the plan matters more than the living moment.',
    activationTrigger: 'Unclear priorities, preventable chaos, or broken systems can activate your need to organize.',
    growthLesson: 'A strong plan should create movement, not delay it until conditions are perfect.',
    questPrompt: 'What plan can you simplify into one concrete action today?',
    element: 'earth',
    elementIcon: '♟️',
  },
};

export function getArchetypeActivationCopy(archetypeId: string): ArchetypeActivationCopy | null {
  return ARCHETYPE_ACTIVATION_COPY[archetypeId] ?? null;
}
