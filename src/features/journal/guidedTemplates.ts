import type { JournalEntryType } from '../../lib/database.types';
import type { ArchetypeHand, HandCard } from '../identity/archetypes/archetypeHandBuilder';

export type GuidedTemplateRole = 'dominant' | 'secondary' | 'support' | 'shadow' | 'general';

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
  sections: GuidedTemplateSection[];
  aiCoachFollowupPrompt?: string;
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

export function getTemplateForCard(role: GuidedTemplateRole, card: HandCard): GuidedJournalTemplate {
  const archetypeSpecific = ARCHETYPE_SPECIFIC_OVERRIDES.find(
    (template) => template.role === role && template.archetypeIds?.includes(card.card.id),
  );

  if (archetypeSpecific) return archetypeSpecific;

  const roleTemplate = ROLE_TEMPLATES.find((template) => template.role === role);
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
    if (!preferredMode) return defaults;
    const matching = defaults.filter((template) => template.defaultMode === preferredMode);
    return matching.length ? matching : defaults;
  }

  templates.push(getTemplateForCard('dominant', hand.dominant));
  templates.push(getTemplateForCard('secondary', hand.secondary));
  templates.push(getTemplateForCard('support', hand.supports[0]));
  templates.push(getTemplateForCard('shadow', hand.shadow));

  const deduped = templates.filter((template, index, arr) => arr.findIndex((item) => item.id === template.id) === index);

  if (!preferredMode) return deduped;

  const matchingMode = deduped.filter((template) => template.defaultMode === preferredMode);
  if (matchingMode.length > 0) return matchingMode;

  return deduped;
}

export function renderTemplateAsMarkdown(template: GuidedJournalTemplate): string {
  const body = template.sections
    .map((section, index) => `${index + 1}. **${section.label}**\n${section.prompt}`)
    .join('\n\n');

  return `# ${template.title}\n\n${template.description}\n\n${body}`;
}
