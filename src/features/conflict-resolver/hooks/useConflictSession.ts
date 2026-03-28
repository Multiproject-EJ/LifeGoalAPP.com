import { useMemo, useState } from 'react';
import type { ConflictType } from '../types/conflictSession';
import type { PrivatePrompt } from '../screens/PrivateCaptureScreen';

type ConflictResolverUiStage =
  | 'mode_selection'
  | 'grounding'
  | 'private_capture'
  | 'collect_pile'
  | 'parallel_read'
  | 'resolution_builder'
  | 'apology_alignment'
  | 'agreement_preview'
  | 'agreement_finalized';

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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useConflictSession() {
  const [stage, setStage] = useState<ConflictResolverUiStage>('mode_selection');
  const [selectedType, setSelectedType] = useState<ConflictType | null>(null);
  const [groundingIndex, setGroundingIndex] = useState(0);
  const [promptIndex, setPromptIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [parallelDecision, setParallelDecision] = useState<'accurate' | 'missing' | null>(null);
  const [parallelAnnotations, setParallelAnnotations] = useState<Record<string, 'accurate' | 'missing' | 'note'>>({});
  const [selectedResolution, setSelectedResolution] = useState<string | null>(null);
  const [whiteFlagOffer, setWhiteFlagOffer] = useState('');
  const [selectedApologyType, setSelectedApologyType] = useState<
    'acknowledge_impact' | 'take_responsibility' | 'repair_action' | 'reassurance' | null
  >(null);
  const [apologyTiming, setApologyTiming] = useState<'simultaneous' | 'sequenced'>('simultaneous');
  const [followUpDate, setFollowUpDate] = useState('');
  const [inviteeEmailDraft, setInviteeEmailDraft] = useState('');
  const [inviteeEmailError, setInviteeEmailError] = useState<string | null>(null);
  const [lightweightParticipants, setLightweightParticipants] = useState<string[]>([]);

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

  const addLightweightParticipant = () => {
    const normalized = inviteeEmailDraft.trim().toLowerCase();
    if (!normalized) {
      setInviteeEmailError('Enter an email before adding.');
      return;
    }
    if (!EMAIL_PATTERN.test(normalized)) {
      setInviteeEmailError('Enter a valid email format.');
      return;
    }
    if (lightweightParticipants.includes(normalized)) {
      setInviteeEmailError('This participant has already been added.');
      return;
    }
    setLightweightParticipants((prev) => [...prev, normalized]);
    setInviteeEmailDraft('');
    setInviteeEmailError(null);
  };

  const removeLightweightParticipant = (email: string) => {
    setLightweightParticipants((prev) => prev.filter((item) => item !== email));
  };

  const updateInviteeEmailDraft = (value: string) => {
    setInviteeEmailDraft(value);
    if (inviteeEmailError) {
      setInviteeEmailError(null);
    }
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
      setStage('collect_pile');
      return;
    }
    nextPrompt();
  };

  const finishPrivateCapture = () => {
    setStage('collect_pile');
  };

  const enterParallelRead = () => {
    setStage('parallel_read');
  };

  const completeParallelRead = (
    decision: 'accurate' | 'missing',
    annotations: Record<string, 'accurate' | 'missing' | 'note'>,
  ) => {
    setParallelDecision(decision);
    setParallelAnnotations(annotations);
    setStage('resolution_builder');
  };

  const resolutionOptions = [
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
      description: 'Agree to acknowledge and respond within 24 hours after friction.',
    },
  ] as const;

  const moveToApologyAlignment = () => {
    setStage('apology_alignment');
  };

  const completeApologyAlignment = () => {
    setStage('agreement_preview');
  };

  const finalizeAgreement = () => {
    setStage('agreement_finalized');
  };

  const agreementSummaryItems = [
    selectedResolution
      ? resolutionOptions.find((option) => option.id === selectedResolution)?.title ?? 'Selected resolution option'
      : 'No predefined option selected.',
    whiteFlagOffer.trim().length > 0 ? `White Flag offer: ${whiteFlagOffer.trim()}` : 'No white-flag offer submitted.',
    selectedApologyType
      ? `Apology type: ${selectedApologyType.replace(/_/g, ' ')} (${apologyTiming})`
      : `Apology type pending (${apologyTiming})`,
  ];

  const summaryCards = [
    {
      id: 'what_happened',
      title: 'What happened',
      text: answers.what_happened || 'No entry yet.',
    },
    {
      id: 'what_it_meant',
      title: 'What it meant',
      text: answers.what_it_meant || 'No entry yet.',
    },
    {
      id: 'what_is_needed',
      title: 'What is needed',
      text: answers.what_is_needed || 'No entry yet.',
    },
  ] as const;

  const resetFlow = () => {
    setStage('mode_selection');
    setSelectedType(null);
    setGroundingIndex(0);
    setPromptIndex(0);
    setAnswers({});
    setParallelDecision(null);
    setParallelAnnotations({});
    setSelectedResolution(null);
    setWhiteFlagOffer('');
    setSelectedApologyType(null);
    setApologyTiming('simultaneous');
    setFollowUpDate('');
    setInviteeEmailDraft('');
    setInviteeEmailError(null);
    setLightweightParticipants([]);
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
      summaryCards,
      enterParallelRead,
      completeParallelRead,
      parallelDecision,
      parallelAnnotations,
      resolutionOptions,
      selectedResolution,
      setSelectedResolution,
      whiteFlagOffer,
      setWhiteFlagOffer,
      moveToApologyAlignment,
      selectedApologyType,
      setSelectedApologyType,
      apologyTiming,
      setApologyTiming,
      completeApologyAlignment,
      followUpDate,
      setFollowUpDate,
      agreementSummaryItems,
      finalizeAgreement,
      inviteeEmailDraft,
      setInviteeEmailDraft: updateInviteeEmailDraft,
      inviteeEmailError,
      lightweightParticipants,
      addLightweightParticipant,
      removeLightweightParticipant,
      resetFlow,
    }),
    [
      stage,
      selectedType,
      groundingIndex,
      promptIndex,
      currentAnswer,
      answers,
      parallelDecision,
      parallelAnnotations,
      selectedResolution,
      whiteFlagOffer,
      selectedApologyType,
      apologyTiming,
      followUpDate,
      inviteeEmailDraft,
      inviteeEmailError,
      lightweightParticipants,
    ],
  );
}
