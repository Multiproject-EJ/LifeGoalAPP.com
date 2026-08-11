import type {
  CompassAnswerValue,
  CompassBlockDefinition,
  CompassBookChapterId,
} from '../types';
import type { CompassPlayerData } from './playerOptions';
import {
  getCompassSignalIdForChapter,
  type CompassIlluminationSignalId,
} from './compassIllumination';

type DraftValues = Record<string, CompassAnswerValue | undefined>;

export type WisdomCompassInsight = {
  signalId: CompassIlluminationSignalId;
  answerSummary: string;
  interpretation: string;
  bridge: string;
  nextStep: string;
  growthNote: string;
};

const INTERPRETATION_BY_CHAPTER: Record<CompassBookChapterId, string> = {
  living_wheel:
    'This adds one honest signal about how life feels now, so later goals and habits can focus where gentle effort may help most.',
  inner_compass:
    'This clarifies a value, need, strength, or counterbalance — useful when a goal looks good on paper but feels wrong in practice.',
  living_horizon:
    'This clarifies the ordinary life your goals are meant to build, not only the achievement at the end.',
  ikigai_map:
    'This tests the overlap between interest, ability, contribution, and real-world fit before you invest heavily.',
  quest_forge:
    'This helps compare goals by meaning, fit, cost, and readiness rather than excitement alone.',
  personal_playbook:
    'This turns self-knowledge into a practical rule for habits that can survive real days, including difficult ones.',
};

const BRIDGE_BY_CHAPTER: Record<CompassBookChapterId, string> = {
  living_wheel: 'Used by the Living Wheel to guide later focus-area, goal, and habit choices.',
  inner_compass: 'Used later to check whether goals and habit styles fit your values and needs.',
  living_horizon: 'Used later to test whether a goal supports the life rhythm you actually want.',
  ikigai_map: 'Used later by Quest Forge when weighing promising directions and practical trials.',
  quest_forge: 'Used by Quest Forge to shape or refine one real goal without creating it automatically.',
  personal_playbook: 'Used by the Personal Playbook to shape a sustainable habit rule and recovery route.',
};

function authoredNextStep(input: {
  chapterId: CompassBookChapterId;
  questionId: string | null;
  answerSummary: string;
  linked: { kind: 'goal' | 'habit'; label: string } | null;
}): string {
  const answer = input.answerSummary;
  const linkedLabel = input.linked ? `“${input.linked.label}”` : null;

  switch (input.chapterId) {
    case 'living_wheel': {
      const needsProtection = /strained|mental_space|avoided|brake|fragile|minimum|emotion/i.test(
        input.questionId ?? '',
      );
      return needsProtection
        ? `Before adding more, ask whether your next goal or habit protects ${answer}; choose one small support if it does not.`
        : `When choosing your next goal or habit, ask how ${answer} could help carry it or make it easier to sustain.`;
    }
    case 'inner_compass': {
      const isCounterbalance = /unlike|overuse|shadow|counterbalance|drift|boundary/i.test(
        input.questionId ?? '',
      );
      return isCounterbalance
        ? `Notice the earliest small sign of ${answer}; choose one counterbalance before the pattern gains momentum.`
        : `Use ${answer} as a decision check: does your next goal and its daily habit make room for it?`;
    }
    case 'living_horizon':
      return `Before accepting a new goal, ask whether it creates more room for ${answer} in an ordinary week.`;
    case 'ikigai_map':
      return `Turn ${answer} into one low-cost real-world experiment before making a larger commitment.`;
    case 'quest_forge':
      return linkedLabel
        ? `Review ${linkedLabel} through this answer and adjust only the next milestone, boundary, or timing that now looks wrong.`
        : `Use ${answer} to refine one goal's next milestone, boundary, or timing before committing more effort.`;
    case 'personal_playbook':
      return linkedLabel
        ? `Apply this clue to ${linkedLabel}: make the next repetition easier to start, finish, or return to.`
        : `Use ${answer} to make one current habit easier to start, finish, or return to on a difficult day.`;
    default:
      return 'Use this clue in one small, reversible choice today; revise it if real life gives you better evidence.';
  }
}

function optionLabel(block: CompassBlockDefinition, optionId: string): string {
  return block.options?.find((option) => option.id === optionId)?.label ?? optionId;
}

function summarizeValue(block: CompassBlockDefinition, value: CompassAnswerValue): string {
  switch (value.kind) {
    case 'choice':
    case 'emotion':
      return optionLabel(block, value.optionId);
    case 'multi_choice':
      return value.optionIds.map((id) => optionLabel(block, id)).join(', ');
    case 'ranking':
      return value.orderedOptionIds.map((id) => optionLabel(block, id)).join(' → ');
    case 'scale':
      return `${value.value} of ${block.max ?? 10}`;
    case 'text':
      return value.text.trim().length > 96
        ? `${value.text.trim().slice(0, 93)}…`
        : value.text.trim();
    case 'confirmation':
      return value.confirmed ? 'Confirmed' : 'Not confirmed';
    default:
      return 'Insight recorded';
  }
}

function linkedEntityLabel(
  values: DraftValues,
  playerData: CompassPlayerData,
): { kind: 'goal' | 'habit'; label: string } | null {
  for (const value of Object.values(values)) {
    if (value?.kind !== 'text' || !value.sourceRef) continue;
    const options = value.sourceRef.kind === 'goal' ? playerData.goals : playerData.habits;
    const option = options.find((item) => item.id === value.sourceRef?.id);
    if (option) return { kind: value.sourceRef.kind, label: option.label };
  }
  return null;
}

export function buildWisdomCompassInsight(input: {
  chapterId: CompassBookChapterId;
  blocks: readonly CompassBlockDefinition[];
  values: DraftValues;
  playerData: CompassPlayerData;
}): WisdomCompassInsight {
  const firstAnswered = input.blocks.find((block) => input.values[block.questionId]);
  const firstValue = firstAnswered ? input.values[firstAnswered.questionId] : undefined;
  const linked = linkedEntityLabel(input.values, input.playerData);
  const answerSummary = firstAnswered && firstValue
    ? summarizeValue(firstAnswered, firstValue)
    : 'Insight recorded';
  const hasGrowthEdgeQuestion = input.blocks.some((block) =>
    /shadow|overuse|drift|brake|fragile|obstacle|warning|strain|avoid/i.test(block.questionId),
  );

  return {
    signalId: getCompassSignalIdForChapter(input.chapterId),
    answerSummary,
    interpretation: INTERPRETATION_BY_CHAPTER[input.chapterId],
    bridge: linked
      ? `Linked to your ${linked.kind}: “${linked.label}”. Nothing changes until you choose to act on it.`
      : BRIDGE_BY_CHAPTER[input.chapterId],
    nextStep: authoredNextStep({
      chapterId: input.chapterId,
      questionId: firstAnswered?.questionId ?? null,
      answerSummary,
      linked,
    }),
    growthNote: hasGrowthEdgeQuestion
      ? 'Treat this as a counterbalance to practise, not a flaw or verdict.'
      : 'Treat this as a useful clue, not a permanent label. You can revise it as life changes.',
  };
}
