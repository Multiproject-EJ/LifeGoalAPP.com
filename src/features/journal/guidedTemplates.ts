import type { JournalEntryType } from '../../lib/database.types';
import type { ArchetypeHand, HandCard } from '../identity/archetypes/archetypeHandBuilder';
import type { AxisKey, DimensionKey, TraitKey } from '../identity/personalityTestData';

export type GuidedTemplateRole = 'dominant' | 'secondary' | 'support' | 'shadow' | 'general' | 'trait_band';
export type TraitBand = 'low' | 'balanced' | 'high';

export type GuidedTemplateSection = {
  id: string;
  label: string;
  prompt: string;
};

export type GuidedJournalTemplate = {
  id: string;
  title: string;
  description: string;
  role: GuidedTemplateRole;
  defaultMode: JournalEntryType;
  archetypeIds?: string[];
  dimensionKey?: DimensionKey;
  band?: TraitBand;
  sections: GuidedTemplateSection[];
  aiCoachFollowupPrompt?: string;
};

type DimensionTemplateSet = Record<TraitBand, GuidedJournalTemplate>;

const DIMENSION_ORDER: DimensionKey[] = [
  'openness',
  'conscientiousness',
  'extraversion',
  'agreeableness',
  'emotional_stability',
  'regulation_style',
  'stress_response',
  'identity_sensitivity',
  'cognitive_entry',
  'honesty_humility',
  'emotionality',
];

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  openness: 'Openness',
  conscientiousness: 'Conscientiousness',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  emotional_stability: 'Emotional Stability',
  regulation_style: 'Regulation Style',
  stress_response: 'Stress Response',
  identity_sensitivity: 'Identity Sensitivity',
  cognitive_entry: 'Cognitive Entry',
  honesty_humility: 'Honesty-Humility',
  emotionality: 'Emotionality',
};

const GENERAL_TEMPLATES: GuidedJournalTemplate[] = [
  {
    id: 'general-daily-reset',
    title: 'Daily Reset',
    description: 'Reflect quickly, then choose one action for tomorrow.',
    role: 'general',
    defaultMode: 'quick',
    sections: [
      { id: 'win', label: 'One win', prompt: 'What was one meaningful win today?' },
      { id: 'drain', label: 'One drain', prompt: 'What drained your energy the most?' },
      { id: 'move', label: 'Next move', prompt: 'What is one 10-minute action for tomorrow?' },
    ],
    aiCoachFollowupPrompt:
      'Review my Daily Reset and give me one blind spot, one compassionate reframe, and one 10-minute action.',
  },
  {
    id: 'general-stress-reset',
    title: 'Stress Reset',
    description: 'Name stress clearly and ground in a practical next step.',
    role: 'general',
    defaultMode: 'problem',
    sections: [
      { id: 'trigger', label: 'Trigger', prompt: 'What triggered stress today?' },
      { id: 'story', label: 'Story', prompt: 'What story am I telling myself about it?' },
      { id: 'fact', label: 'Facts', prompt: 'What facts are true regardless of emotion?' },
      { id: 'step', label: 'Next step', prompt: 'What is the smallest helpful step I can take now?' },
    ],
  },
];

const ROLE_TEMPLATES: GuidedJournalTemplate[] = [
  {
    id: 'dominant-leadership-debrief',
    title: 'Leadership Debrief',
    description: 'Use your dominant style well without overdriving it.',
    role: 'dominant',
    defaultMode: 'deep',
    sections: [
      { id: 'mission', label: 'Mission', prompt: 'What mission mattered most today?' },
      { id: 'clarity', label: 'Clarity', prompt: 'Where did I lead clearly versus push too hard?' },
      { id: 'delegation', label: 'Delegation', prompt: 'What can I delegate or simplify tomorrow?' },
    ],
  },
  {
    id: 'secondary-switch-play',
    title: 'Secondary Switch Play',
    description: 'Consciously activate your secondary card for balance.',
    role: 'secondary',
    defaultMode: 'goal',
    sections: [
      { id: 'when', label: 'Situation', prompt: 'Where would my secondary style help most tomorrow?' },
      { id: 'action', label: 'Behavior', prompt: 'What behavior will I use from that style?' },
      { id: 'signal', label: 'Signal', prompt: 'How will I know it worked?' },
    ],
  },
  {
    id: 'support-toolkit-rep',
    title: 'Support Toolkit Rep',
    description: 'Practice a support card in one concrete scenario.',
    role: 'support',
    defaultMode: 'quick',
    sections: [
      { id: 'context', label: 'Context', prompt: 'What context needs a support tool today?' },
      { id: 'tool', label: 'Tool', prompt: 'Which support-card behavior fits best?' },
      { id: 'result', label: 'Result', prompt: 'What changed after I used it?' },
    ],
  },
  {
    id: 'shadow-micro-rep',
    title: 'Shadow Micro Rep',
    description: 'Build your shadow card with safe, tiny exposure reps.',
    role: 'shadow',
    defaultMode: 'problem',
    sections: [
      { id: 'avoidance', label: 'Avoided behavior', prompt: 'What behavior did I avoid?' },
      { id: 'micro', label: '2-minute rep', prompt: 'What is a 2-minute attempt I can do anyway?' },
      { id: 'resistance', label: 'Resistance', prompt: 'How strong is my resistance (1-10)?' },
      { id: 'learning', label: 'Learning', prompt: 'What did I learn from trying?' },
    ],
    aiCoachFollowupPrompt:
      'Coach me gently on this shadow rep: one fear pattern, one reframe, and one next tiny exposure step.',
  },
];

const ARCHETYPE_SPECIFIC_OVERRIDES: GuidedJournalTemplate[] = [
  {
    id: 'commander-clarity-control',
    title: 'Commander: Clarity vs Control',
    description: 'Lead with standards while avoiding over-control.',
    role: 'dominant',
    defaultMode: 'deep',
    archetypeIds: ['commander'],
    sections: [
      { id: 'objective', label: 'Objective', prompt: 'What objective did I set clearly today?' },
      { id: 'overcontrol', label: 'Over-control check', prompt: 'Where did I grip too tightly?' },
      { id: 'repair', label: 'Repair move', prompt: 'What collaborative move can I make tomorrow?' },
    ],
  },
  {
    id: 'strategist-plan-to-action',
    title: 'Strategist: Plan-to-Action Bridge',
    description: 'Convert analysis into a concrete first move.',
    role: 'secondary',
    defaultMode: 'goal',
    archetypeIds: ['strategist'],
    sections: [
      { id: 'long-game', label: 'Long game', prompt: 'What outcome matters most over the next 30 days?' },
      { id: 'today-move', label: 'Today move', prompt: 'What single action starts momentum today?' },
      { id: 'risk', label: 'Risk + mitigation', prompt: 'What likely risk can I pre-plan for now?' },
    ],
  },
];

/**
 * Trait-template matrix (11 dimensions × low/balanced/high).
 * Each entry is a ready-to-use guided prompt set and can be pasted/extended directly.
 */
export const TRAIT_TEMPLATE_MATRIX: Record<DimensionKey, DimensionTemplateSet> = {
  openness: {
    low: template('openness', 'low', 'Grounded Curiosity Sprint', 'quick', ['What new idea did I resist today and why?', 'What is one tiny experiment I can run safely this week?', 'What would success look like after one trial?']),
    balanced: template('openness', 'balanced', 'Curiosity + Practicality', 'deep', ['Where did I balance novelty with reality well today?', 'Which idea is worth developing further?', 'What boundaries keep this idea useful?']),
    high: template('openness', 'high', 'Idea Parking + Ship One', 'goal', ['List three exciting ideas currently in your head.', 'Which one deserves execution now, and why?', 'What is the first shippable step in 24 hours?']),
  },
  conscientiousness: {
    low: template('conscientiousness', 'low', 'Frictionless Follow-Through', 'quick', ['What is one task I keep delaying?', 'What 5-minute version can I complete today?', 'What cue will remind me to do it?']),
    balanced: template('conscientiousness', 'balanced', 'System Tune-Up', 'goal', ['What routines supported me this week?', 'Where did flexibility improve my results?', 'What one system tweak raises consistency next week?']),
    high: template('conscientiousness', 'high', 'Standards Without Strain', 'deep', ['Where did high standards help me today?', 'Where did perfectionism slow me down?', 'What is “good enough” for tomorrow’s key task?']),
  },
  extraversion: {
    low: template('extraversion', 'low', 'Quiet Energy Planner', 'quick', ['What social demand drained me today?', 'What solo recovery practice restores me fastest?', 'What single connection still matters tomorrow?']),
    balanced: template('extraversion', 'balanced', 'Energy Mix Check', 'deep', ['How did I balance people-time and alone-time today?', 'Which interactions energized me most?', 'How will I design tomorrow’s energy mix?']),
    high: template('extraversion', 'high', 'Influence With Depth', 'goal', ['Where did I use social energy effectively today?', 'Where did I talk more than I listened?', 'What one conversation deserves deeper attention tomorrow?']),
  },
  agreeableness: {
    low: template('agreeableness', 'low', 'Directness With Warmth', 'problem', ['What conflict needed honesty today?', 'How can I state my view without unnecessary edge?', 'What relationship repair step is needed now?']),
    balanced: template('agreeableness', 'balanced', 'Healthy Boundaries + Care', 'deep', ['Where did I collaborate well today?', 'Where did I protect my own needs appropriately?', 'What boundary will I keep tomorrow?']),
    high: template('agreeableness', 'high', 'No-Resentment Kindness', 'problem', ['Where did I say yes but mean no?', 'What boundary would protect my energy this week?', 'What respectful “no” statement can I use?']),
  },
  emotional_stability: {
    low: template('emotional_stability', 'low', 'Nervous System Reset', 'problem', ['What triggered emotional volatility today?', 'What grounding technique helped even slightly?', 'What preventive step can I set before the next trigger?']),
    balanced: template('emotional_stability', 'balanced', 'Center and Stretch', 'deep', ['What kept me emotionally steady today?', 'Where did I still feel friction?', 'What challenge can I take on from a calm baseline?']),
    high: template('emotional_stability', 'high', 'Calm Without Numbing', 'deep', ['Where did calm help me lead today?', 'Where might I have downplayed valid emotion?', 'What emotion needs fuller expression now?']),
  },
  regulation_style: {
    low: template('regulation_style', 'low', 'Adaptive Day Architecture', 'quick', ['Where did improvising help me today?', 'Where did lack of structure hurt me?', 'What one anchor routine will I keep tomorrow?']),
    balanced: template('regulation_style', 'balanced', 'Plan + Pivot Review', 'goal', ['Which parts of my plan worked as expected?', 'Where did I pivot effectively?', 'What is tomorrow’s must-keep plan block?']),
    high: template('regulation_style', 'high', 'Structure With Breath', 'goal', ['Which routine gave me leverage today?', 'Where did rigidity create friction?', 'What flexibility window can I intentionally add tomorrow?']),
  },
  stress_response: {
    low: template('stress_response', 'low', 'Pressure Recovery Script', 'problem', ['What stress signal appeared first in my body?', 'What helped me recover fastest?', 'What support can I pre-arrange before the next high-pressure block?']),
    balanced: template('stress_response', 'balanced', 'Resilience Debrief', 'deep', ['What pressure did I handle well today?', 'Where did stress still leak into behavior?', 'What one resilience habit should I repeat tomorrow?']),
    high: template('stress_response', 'high', 'Challenge Growth Log', 'goal', ['What hard thing did I stay steady through today?', 'How did I protect others while under pressure?', 'What bigger challenge am I now ready for?']),
  },
  identity_sensitivity: {
    low: template('identity_sensitivity', 'low', 'Values Clarifier', 'deep', ['What value guided my choices today?', 'Where did I act out of convenience instead of conviction?', 'What value-aligned action will I take tomorrow?']),
    balanced: template('identity_sensitivity', 'balanced', 'Identity in Action', 'deep', ['Where did I feel aligned with who I am today?', 'Where did I adapt wisely to context?', 'How can I keep both authenticity and flexibility tomorrow?']),
    high: template('identity_sensitivity', 'high', 'Self-Trust + Flexibility', 'problem', ['What feedback felt personally threatening today?', 'What part of that feedback may still be useful?', 'How can I respond without abandoning my core values?']),
  },
  cognitive_entry: {
    low: template('cognitive_entry', 'low', 'Action-First Learning Loop', 'quick', ['What did I learn by doing today?', 'Where should I pause to think before acting again?', 'What single action-learning loop will I run tomorrow?']),
    balanced: template('cognitive_entry', 'balanced', 'Think-Then-Do Balance', 'goal', ['Where did planning save time today?', 'Where did action teach me faster than planning?', 'What is the right sequence for tomorrow: think first or move first?']),
    high: template('cognitive_entry', 'high', 'Think-to-Action Converter', 'problem', ['What am I overthinking right now?', 'What assumption is blocking movement?', 'What concrete first action can I take in 15 minutes?']),
  },
  honesty_humility: {
    low: template('honesty_humility', 'low', 'Integrity Alignment Check', 'deep', ['Where did ego or image drive my choices today?', 'What truth did I avoid saying or admitting?', 'What repair restores trust tomorrow?']),
    balanced: template('honesty_humility', 'balanced', 'Grounded Confidence Journal', 'deep', ['Where did I stay humble and confident today?', 'Where did I understate or overstate my contribution?', 'What is the most honest way to communicate impact tomorrow?']),
    high: template('honesty_humility', 'high', 'Own Your Value', 'goal', ['Where did I contribute meaningfully today?', 'Where did I downplay my impact too much?', 'What clear self-advocacy move will I make next?']),
  },
  emotionality: {
    low: template('emotionality', 'low', 'Emotion Access Practice', 'deep', ['What feeling did I keep at arm’s length today?', 'Where did emotional distance help me?', 'What safe way can I express one feeling now?']),
    balanced: template('emotionality', 'balanced', 'Emotion Signal Decoder', 'deep', ['What emotions gave useful information today?', 'Where did emotions distort my interpretation?', 'How will I respond skillfully to that signal tomorrow?']),
    high: template('emotionality', 'high', 'Compassionate Containment', 'problem', ['Which emotion felt biggest today?', 'What helped me hold it without spiraling?', 'What boundary or support keeps me resourced tomorrow?']),
  },
};

function template(
  dimensionKey: DimensionKey,
  band: TraitBand,
  title: string,
  defaultMode: JournalEntryType,
  prompts: [string, string, string],
): GuidedJournalTemplate {
  return {
    id: `trait-${dimensionKey}-${band}`,
    title,
    description: `${DIMENSION_LABELS[dimensionKey]} (${band}) prompt set`,
    role: 'trait_band',
    defaultMode,
    dimensionKey,
    band,
    sections: [
      { id: 'prompt_1', label: 'Prompt 1', prompt: prompts[0] },
      { id: 'prompt_2', label: 'Prompt 2', prompt: prompts[1] },
      { id: 'prompt_3', label: 'Prompt 3', prompt: prompts[2] },
    ],
    aiCoachFollowupPrompt:
      'Use this reflection to give me one blind spot, one compassionate reframe, and one 10-minute action step.',
  };
}

function toBand(score: number): TraitBand {
  if (score < 40) return 'low';
  if (score > 60) return 'high';
  return 'balanced';
}

export function getTemplateForCard(role: Exclude<GuidedTemplateRole, 'general' | 'trait_band'>, card: HandCard): GuidedJournalTemplate {
  const archetypeSpecific = ARCHETYPE_SPECIFIC_OVERRIDES.find(
    (entry) => entry.role === role && entry.archetypeIds?.includes(card.card.id),
  );

  if (archetypeSpecific) return archetypeSpecific;

  const roleTemplate = ROLE_TEMPLATES.find((entry) => entry.role === role);
  if (!roleTemplate) {
    throw new Error(`Missing guided template for role: ${role}`);
  }

  return roleTemplate;
}

export function recommendGuidedTemplates(
  hand: ArchetypeHand | null | undefined,
  preferredMode?: JournalEntryType,
): GuidedJournalTemplate[] {
  const templates: GuidedJournalTemplate[] = [];

  if (!hand) {
    const defaults = [...GENERAL_TEMPLATES];
    return filterByModeOrFallback(defaults, preferredMode);
  }

  templates.push(getTemplateForCard('dominant', hand.dominant));
  templates.push(getTemplateForCard('secondary', hand.secondary));
  templates.push(getTemplateForCard('support', hand.supports[0]));
  templates.push(getTemplateForCard('shadow', hand.shadow));

  const deduped = dedupeById(templates);
  return filterByModeOrFallback(deduped, preferredMode);
}

export function recommendTraitBandTemplates(
  traits: Partial<Record<TraitKey, number>> | null | undefined,
  axes: Partial<Record<AxisKey, number>> | null | undefined,
  preferredMode?: JournalEntryType,
): GuidedJournalTemplate[] {
  const sources: Partial<Record<DimensionKey, number>> = {
    ...traits,
    ...axes,
  };

  const templates = DIMENSION_ORDER
    .map((dimension) => {
      const value = sources[dimension];
      if (typeof value !== 'number') return null;
      const band = toBand(value);
      return TRAIT_TEMPLATE_MATRIX[dimension][band];
    })
    .filter((entry): entry is GuidedJournalTemplate => Boolean(entry));

  const topThree = templates.slice(0, 3);
  return filterByModeOrFallback(topThree, preferredMode);
}

function dedupeById(templates: GuidedJournalTemplate[]): GuidedJournalTemplate[] {
  return templates.filter((template, index, arr) => arr.findIndex((item) => item.id === template.id) === index);
}

function filterByModeOrFallback(
  templates: GuidedJournalTemplate[],
  preferredMode?: JournalEntryType,
): GuidedJournalTemplate[] {
  if (!preferredMode) return templates;
  const matching = templates.filter((template) => template.defaultMode === preferredMode);
  return matching.length > 0 ? matching : templates;
}

export function renderTemplateAsMarkdown(template: GuidedJournalTemplate): string {
  const body = template.sections
    .map((section, index) => `${index + 1}. **${section.label}**\n${section.prompt}`)
    .join('\n\n');

  return `# ${template.title}\n\n${template.description}\n\n${body}`;
}
