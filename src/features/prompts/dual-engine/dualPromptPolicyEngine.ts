import {
  type DualPromptCandidate,
  type DualPromptContext,
  type DualPromptPolicyInputs,
} from './dualPromptTypes';

const INSIDE_GAME_ALLOWED_FORMATS = new Set(['yes_no', 'choice', 'rating', 'compare'] as const);

function candidateForType(type: DualPromptCandidate['type'], context: DualPromptContext): DualPromptCandidate {
  switch (type) {
    case 'life_wheel_orientation':
      return { type, context, answerFormat: 'choice', destination: 'life_wheel_checkin', priorityScore: 100 };
    case 'tiny_habit_adjustment':
      return { type, context, answerFormat: 'choice', destination: 'habit_update', priorityScore: 90 };
    case 'habit_difficulty_rating':
      return { type, context, answerFormat: 'rating', destination: 'habit_update', priorityScore: 70 };
    case 'blocker_check':
      return { type, context, answerFormat: 'yes_no', destination: 'goal_update', priorityScore: 60 };
    case 'goal_link':
      return { type, context, answerFormat: 'compare', destination: 'goal_update', priorityScore: 50 };
    case 'wisdom_reflection':
      return { type, context, answerFormat: context === 'outside_game' ? 'text_optional' : 'choice', destination: 'reflection', priorityScore: 40 };
  }
}

export function selectBestNextDualPromptCandidate(
  context: DualPromptContext,
  inputs: DualPromptPolicyInputs,
): DualPromptCandidate | null {
  const candidates: DualPromptCandidate[] = [];

  if (!inputs.checkins.hasLifeWheelCheckin || !inputs.profileSignals.hasLifeAreaCoverage) {
    candidates.push(candidateForType('life_wheel_orientation', context));
  }

  if (inputs.habits.hasAny && !inputs.habits.hasSuccessSignal && !inputs.habits.hasDifficultySignal) {
    candidates.push(candidateForType('tiny_habit_adjustment', context));
  }

  if (inputs.habits.hasAny && !inputs.habits.hasDifficultySignal) {
    candidates.push(candidateForType('habit_difficulty_rating', context));
  }

  if (inputs.goals.hasAny) {
    candidates.push(candidateForType('blocker_check', context));
    candidates.push(candidateForType('goal_link', context));
  }

  candidates.push(candidateForType('wisdom_reflection', context));

  const filteredByContext = context === 'inside_game'
    ? candidates.filter((candidate) => INSIDE_GAME_ALLOWED_FORMATS.has(candidate.answerFormat as never))
    : candidates;

  if (filteredByContext.length === 0) {
    return null;
  }

  return filteredByContext.sort((a, b) => b.priorityScore - a.priorityScore)[0] ?? null;
}
