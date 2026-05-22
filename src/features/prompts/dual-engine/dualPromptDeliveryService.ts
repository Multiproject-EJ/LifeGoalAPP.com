import { isDualPromptEligible, type DualPromptEligibilityPolicy } from './dualPromptEligibility';
import { selectBestNextDualPromptCandidate } from './dualPromptPolicyEngine';
import { type DualPromptCandidate, type DualPromptContext, type DualPromptPolicyInputs } from './dualPromptTypes';

export interface DualPromptDeliveryInputs extends DualPromptPolicyInputs {
  eligibilityPolicy?: DualPromptEligibilityPolicy;
}

export function getNextDualEnginePrompt(
  context: DualPromptContext,
  inputs: DualPromptDeliveryInputs,
): DualPromptCandidate | null {
  const candidate = selectBestNextDualPromptCandidate(context, inputs);
  if (!candidate) {
    return null;
  }

  const eligible = isDualPromptEligible(candidate, context, inputs.history, inputs.nowMs, inputs.eligibilityPolicy);
  return eligible ? candidate : null;
}
