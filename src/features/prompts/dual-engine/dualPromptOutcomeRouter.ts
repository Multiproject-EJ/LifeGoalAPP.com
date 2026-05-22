import {
  type DualPromptCandidate,
  type DualPromptNormalizedAnswer,
  type DualPromptOutcomeResult,
} from './dualPromptTypes';

export function routeDualPromptOutcome(
  prompt: DualPromptCandidate,
  _answer: DualPromptNormalizedAnswer,
): DualPromptOutcomeResult {
  return {
    destination: prompt.destination,
    status: 'not_implemented',
    promptType: prompt.type,
  };
}
