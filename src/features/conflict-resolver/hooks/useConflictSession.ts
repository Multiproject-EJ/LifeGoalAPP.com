import { useMemo, useState } from 'react';
import type { ConflictType } from '../types/conflictSession';
import type { PrivatePrompt } from '../screens/PrivateCaptureScreen';

type ConflictResolverUiStage = 'mode_selection' | 'grounding' | 'private_capture' | 'ready_for_shared_step';

const GROUNDING_STATEMENTS = [
  'People are not evil at heart.',
  'Miscommunication creates most conflict.',
  'You’re not required to agree. Just understand first.',
] as const;

const PRIVATE_CAPTURE_PROMPTS: readonly PrivatePrompt[] = [
  {
    id: 'what_happened',
    label: 'What happened from your perspective?',
    placeholder: 'Describe the event in your own words…',
  },
  {
    id: 'what_it_meant',
    label: 'What did this mean to you emotionally?',
    placeholder: 'Share how it landed for you…',
  },
  {
    id: 'what_is_needed',
    label: 'What do you need now for things to improve?',
    placeholder: 'Describe what would feel fair or constructive…',
  },
];

export function useConflictSession() {
  const [stage, setStage] = useState<ConflictResolverUiStage>('mode_selection');
  const [selectedType, setSelectedType] = useState<ConflictType | null>(null);
  const [groundingIndex, setGroundingIndex] = useState(0);
  const [promptIndex, setPromptIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const currentPrompt = PRIVATE_CAPTURE_PROMPTS[promptIndex];
  const currentAnswer = answers[currentPrompt.id] ?? '';

  const setCurrentAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentPrompt.id]: value }));
  };

  const goToGrounding = () => {
    if (!selectedType) return;
    setGroundingIndex(0);
    setStage('grounding');
  };

  const nextGroundingStatement = () => {
    setGroundingIndex((prev) => Math.min(prev + 1, GROUNDING_STATEMENTS.length - 1));
  };

  const startPrivateCapture = () => {
    setPromptIndex(0);
    setStage('private_capture');
  };

  const nextPrompt = () => {
    setPromptIndex((prev) => Math.min(prev + 1, PRIVATE_CAPTURE_PROMPTS.length - 1));
  };

  const previousPrompt = () => {
    setPromptIndex((prev) => Math.max(prev - 1, 0));
  };

  const skipPrompt = () => {
    if (promptIndex >= PRIVATE_CAPTURE_PROMPTS.length - 1) {
      setStage('ready_for_shared_step');
      return;
    }
    nextPrompt();
  };

  const finishPrivateCapture = () => {
    setStage('ready_for_shared_step');
  };

  const resetFlow = () => {
    setStage('mode_selection');
    setSelectedType(null);
    setGroundingIndex(0);
    setPromptIndex(0);
    setAnswers({});
  };

  return useMemo(
    () => ({
      stage,
      selectedType,
      setSelectedType,
      goToGrounding,
      groundingIndex,
      groundingStatements: GROUNDING_STATEMENTS,
      nextGroundingStatement,
      startPrivateCapture,
      prompts: PRIVATE_CAPTURE_PROMPTS,
      promptIndex,
      currentAnswer,
      setCurrentAnswer,
      nextPrompt,
      previousPrompt,
      skipPrompt,
      finishPrivateCapture,
      answers,
      resetFlow,
    }),
    [stage, selectedType, groundingIndex, promptIndex, currentAnswer, answers],
  );
}
