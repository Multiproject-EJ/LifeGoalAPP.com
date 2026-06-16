import type { ResolutionOption } from './conflictAiSchemas';
import type { ConflictRoutingMetadata } from '../types/conflictSession';
import { normalizeConflictRoutingForPrompt } from './conflictRoutingPromptContext';

export const DEFAULT_MUTUAL_RESOLUTION_OPTIONS: ResolutionOption[] = [
  {
    id: 'communicate_earlier',
    title: 'Communicate earlier when plans change',
    description: 'Set expectation to notify as soon as timing changes.',
  },
  {
    id: 'weekly_check_in',
    title: 'Run a weekly 10-minute check-in',
    description: 'Create a predictable moment for concerns before they stack.',
  },
  {
    id: 'repair_protocol',
    title: 'Use a 24-hour repair protocol',
    description:
      'Agree to acknowledge and respond within 24 hours after friction.',
  },
];

export const SAFETY_FIRST_RESOLUTION_OPTIONS: ResolutionOption[] = [
  {
    id: 'safety_support_plan',
    title: 'Choose one trusted support step',
    description:
      'Identify a trusted person, advocate, or local support resource you can contact without involving the other person.',
  },
  {
    id: 'document_and_preserve',
    title: 'Document key facts privately',
    description:
      'Keep a calm, factual record of concerning incidents, dates, messages, and any steps you take to protect yourself.',
  },
  {
    id: 'boundary_next_step',
    title: 'Set a safety-first boundary',
    description:
      'Choose one boundary or distance step that reduces risk and does not require negotiation, apology, or agreement.',
  },
];

export function buildResolutionOptionsFallback(
  conflictRouting?: Partial<ConflictRoutingMetadata> | null,
): ResolutionOption[] {
  return normalizeConflictRoutingForPrompt(conflictRouting).safetyFlag
    ? SAFETY_FIRST_RESOLUTION_OPTIONS
    : DEFAULT_MUTUAL_RESOLUTION_OPTIONS;
}
