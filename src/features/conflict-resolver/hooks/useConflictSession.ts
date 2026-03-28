import { useEffect, useMemo, useState } from 'react';
import type { ConflictType } from '../types/conflictSession';
import type { PrivatePrompt } from '../screens/PrivateCaptureScreen';
import { canTransitionConflictStage, isConflictStage } from '../stateMachine/conflictStateMachine';
import type { ConflictStage } from '../types/conflictSession';
import {
  addConflictParticipant,
  createConflictSession,
  getConflictParticipantCount,
  getConflictSessionSnapshot,
  getConflictSessionStatus,
  getCurrentUserId,
  subscribeConflictSessionStatus,
  updateConflictSessionStatus,
} from '../services/conflictSessions';

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
const CONFLICT_SESSION_DRAFT_STORAGE_KEY = 'conflict-resolver:draft:v1';
const UI_TO_CONFLICT_STAGE: Record<ConflictResolverUiStage, ConflictStage> = {
  mode_selection: 'draft',
  grounding: 'grounding',
  private_capture: 'private_capture',
  collect_pile: 'shared_read',
  parallel_read: 'shared_read',
  resolution_builder: 'negotiation',
  apology_alignment: 'apology_alignment',
  agreement_preview: 'agreement',
  agreement_finalized: 'closed',
};
const CONFLICT_STAGE_TO_UI: Record<ConflictStage, ConflictResolverUiStage> = {
  draft: 'mode_selection',
  grounding: 'grounding',
  private_capture: 'private_capture',
  shared_read: 'parallel_read',
  negotiation: 'resolution_builder',
  apology_alignment: 'apology_alignment',
  agreement: 'agreement_preview',
  closed: 'agreement_finalized',
};

type ConflictSessionDraftSnapshot = {
  stage: ConflictResolverUiStage;
  selectedType: ConflictType | null;
  groundingIndex: number;
  promptIndex: number;
  answers: Record<string, string>;
  parallelDecision: 'accurate' | 'missing' | null;
  parallelAnnotations: Record<string, 'accurate' | 'missing' | 'note'>;
  selectedResolution: string | null;
  whiteFlagOffer: string;
  selectedApologyType: 'acknowledge_impact' | 'take_responsibility' | 'repair_action' | 'reassurance' | null;
  apologyTiming: 'simultaneous' | 'sequenced';
  followUpDate: string;
  lightweightParticipants: string[];
  alignmentReached: boolean;
  proposalQueue: { id: string; text: string }[];
  activeProposalId: string | null;
  sharedSessionId: string | null;
  sharedParticipantCount: number;
};

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
  const [proposalQueue, setProposalQueue] = useState<{ id: string; text: string }[]>([]);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const [selectedApologyType, setSelectedApologyType] = useState<
    'acknowledge_impact' | 'take_responsibility' | 'repair_action' | 'reassurance' | null
  >(null);
  const [apologyTiming, setApologyTiming] = useState<'simultaneous' | 'sequenced'>('simultaneous');
  const [followUpDate, setFollowUpDate] = useState('');
  const [inviteeEmailDraft, setInviteeEmailDraft] = useState('');
  const [inviteeEmailError, setInviteeEmailError] = useState<string | null>(null);
  const [lightweightParticipants, setLightweightParticipants] = useState<string[]>([]);
  const [alignmentReached, setAlignmentReached] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [sharedSessionId, setSharedSessionId] = useState<string | null>(null);
  const [sharedSessionCodeInput, setSharedSessionCodeInput] = useState('');
  const [sharedParticipantCount, setSharedParticipantCount] = useState(0);
  const [sharedSessionError, setSharedSessionError] = useState<string | null>(null);
  const [sharedSessionBusy, setSharedSessionBusy] = useState(false);
  const [sharedSessionStatus, setSharedSessionStatus] = useState<ConflictStage | null>(null);
  const [sharedSessionLastSyncedAt, setSharedSessionLastSyncedAt] = useState<string | null>(null);

  const currentPrompt = PRIVATE_CAPTURE_PROMPTS[promptIndex];
  const currentAnswer = answers[currentPrompt.id] ?? '';

  const setCurrentAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentPrompt.id]: value }));
  };

  const setStageWithSync = async (nextStage: ConflictResolverUiStage) => {
    const shouldSync = selectedType === 'shared_conflict' && Boolean(sharedSessionId);
    if (!shouldSync) {
      setStage(nextStage);
      return true;
    }

    const fromStatus = sharedSessionStatus ?? UI_TO_CONFLICT_STAGE[stage];
    const toStatus = UI_TO_CONFLICT_STAGE[nextStage];
    const guard = canTransitionConflictStage(fromStatus, toStatus);
    if (!guard.allowed) {
      setSharedSessionError('Stage transition blocked until previous step is completed.');
      return false;
    }

    await updateConflictSessionStatus({ sessionId: sharedSessionId!, status: toStatus });
    setSharedSessionStatus(toStatus);
    setStage(nextStage);
    return true;
  };

  const goToGrounding = async () => {
    if (!selectedType) return;
    if (selectedType === 'shared_conflict' && !sharedSessionId) {
      setSharedSessionError('Create or join a shared session first.');
      return;
    }
    setGroundingIndex(0);
    await setStageWithSync('grounding');
  };

  const refreshSharedParticipantCount = async (sessionId: string) => {
    const count = await getConflictParticipantCount(sessionId);
    setSharedParticipantCount(count);
  };

  const resyncSharedSession = async (sessionId: string) => {
    const snapshot = await getConflictSessionSnapshot(sessionId);
    if (!isConflictStage(snapshot.status)) return;
    setSharedSessionStatus(snapshot.status);
    setSharedSessionLastSyncedAt(snapshot.updatedAt);
    setStage(CONFLICT_STAGE_TO_UI[snapshot.status]);
  };

  const createSharedSession = async () => {
    try {
      setSharedSessionBusy(true);
      setSharedSessionError(null);
      const userId = await getCurrentUserId();
      const sessionId = await createConflictSession({ ownerUserId: userId, conflictType: 'shared_conflict' });
      await addConflictParticipant({ sessionId, userId, role: 'initiator' });
      setSharedSessionId(sessionId);
      await refreshSharedParticipantCount(sessionId);
      setSharedSessionStatus('draft');
    } catch (error) {
      console.error('Failed to create shared conflict session', error);
      setSharedSessionError('Could not create session. Please try again.');
    } finally {
      setSharedSessionBusy(false);
    }
  };

  const joinSharedSession = async () => {
    const sessionId = sharedSessionCodeInput.trim();
    if (!sessionId) {
      setSharedSessionError('Enter a session code to join.');
      return;
    }

    try {
      setSharedSessionBusy(true);
      setSharedSessionError(null);
      const userId = await getCurrentUserId();
      await addConflictParticipant({ sessionId, userId, role: 'participant' });
      setSharedSessionId(sessionId);
      await refreshSharedParticipantCount(sessionId);
      const status = await getConflictSessionStatus(sessionId);
      if (isConflictStage(status)) {
        setSharedSessionStatus(status);
      }
      const snapshot = await getConflictSessionSnapshot(sessionId);
      setSharedSessionLastSyncedAt(snapshot.updatedAt);
    } catch (error) {
      console.error('Failed to join shared conflict session', error);
      setSharedSessionError('Could not join this session code.');
    } finally {
      setSharedSessionBusy(false);
    }
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
    void setStageWithSync('private_capture');
  };

  const nextPrompt = () => {
    setPromptIndex((prev) => Math.min(prev + 1, PRIVATE_CAPTURE_PROMPTS.length - 1));
  };

  const previousPrompt = () => {
    setPromptIndex((prev) => Math.max(prev - 1, 0));
  };

  const skipPrompt = () => {
    if (promptIndex >= PRIVATE_CAPTURE_PROMPTS.length - 1) {
      void setStageWithSync('collect_pile');
      return;
    }
    nextPrompt();
  };

  const finishPrivateCapture = () => {
    void setStageWithSync('collect_pile');
  };

  const enterParallelRead = () => {
    setAlignmentReached(false);
    void setStageWithSync('parallel_read');
  };

  const completeParallelRead = (
    decision: 'accurate' | 'missing',
    annotations: Record<string, 'accurate' | 'missing' | 'note'>,
  ) => {
    setParallelDecision(decision);
    setParallelAnnotations(annotations);
    const allCardsAccurate = PRIVATE_CAPTURE_PROMPTS.every((prompt) => annotations[prompt.id] === 'accurate');
    setAlignmentReached(decision === 'accurate' && allCardsAccurate);
    void setStageWithSync('resolution_builder');
  };

  const markAlignmentReached = () => {
    setAlignmentReached(true);
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
    const hasNegotiationPath = Boolean(selectedResolution) || Boolean(activeProposalId);
    if (!hasNegotiationPath) return;
    void setStageWithSync('apology_alignment');
  };

  const queueWhiteFlagOffer = () => {
    const normalized = whiteFlagOffer.trim();
    if (!normalized) return;

    const nextId = `proposal_${Date.now()}_${proposalQueue.length + 1}`;
    const nextQueue = [...proposalQueue, { id: nextId, text: normalized }];
    setProposalQueue(nextQueue);
    setWhiteFlagOffer('');
    if (!activeProposalId) {
      setActiveProposalId(nextId);
    }
  };

  const promoteProposal = (proposalId: string) => {
    if (!proposalQueue.some((proposal) => proposal.id === proposalId)) return;
    setActiveProposalId(proposalId);
  };

  const removeProposal = (proposalId: string) => {
    setProposalQueue((prev) => prev.filter((proposal) => proposal.id !== proposalId));
    if (activeProposalId === proposalId) {
      setActiveProposalId(null);
    }
  };

  const completeApologyAlignment = () => {
    void setStageWithSync('agreement_preview');
  };

  const finalizeAgreement = () => {
    void setStageWithSync('agreement_finalized');
  };

  const agreementSummaryItems = [
    selectedResolution
      ? resolutionOptions.find((option) => option.id === selectedResolution)?.title ?? 'Selected resolution option'
      : 'No predefined option selected.',
    whiteFlagOffer.trim().length > 0 ? `White Flag offer: ${whiteFlagOffer.trim()}` : 'No white-flag offer submitted.',
    activeProposalId
      ? `Active queued proposal: ${proposalQueue.find((proposal) => proposal.id === activeProposalId)?.text ?? 'Missing proposal.'}`
      : 'No queued proposal promoted yet.',
    proposalQueue.length > 0 ? `Queued proposals: ${proposalQueue.length}` : 'No queued proposals.',
    ...Object.entries(parallelAnnotations).map(([key, tag]) => `${key.replace(/_/g, ' ')} marked: ${tag}`),
    selectedApologyType
      ? `Apology type: ${selectedApologyType.replace(/_/g, ' ')} (${apologyTiming})`
      : `Apology type pending (${apologyTiming})`,
  ];

  const parallelAnnotationItems = Object.entries(parallelAnnotations).map(([key, tag]) => ({
    id: key,
    label: key.replace(/_/g, ' '),
    tag,
  }));

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

  useEffect(() => {
    if (selectedType !== 'shared_conflict' || !sharedSessionId) return;

    let active = true;
    const syncCurrent = async () => {
      try {
        await resyncSharedSession(sharedSessionId);
      } catch (error) {
        console.error('Failed to load shared session status', error);
      }
    };

    void syncCurrent();
    const interval = window.setInterval(() => {
      void syncCurrent();
    }, 10000);
    const onOnline = () => {
      void syncCurrent();
    };
    window.addEventListener('online', onOnline);

    const unsubscribe = subscribeConflictSessionStatus({
      sessionId: sharedSessionId,
      onStatusChange: (nextStatus) => {
        if (!isConflictStage(nextStatus)) return;
        setSharedSessionStatus(nextStatus);
        setStage(CONFLICT_STAGE_TO_UI[nextStatus]);
        setSharedSessionLastSyncedAt(new Date().toISOString());
      },
    });

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('online', onOnline);
      unsubscribe();
    };
  }, [selectedType, sharedSessionId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setDraftHydrated(true);
      return;
    }
    const serialized = window.localStorage.getItem(CONFLICT_SESSION_DRAFT_STORAGE_KEY);
    if (!serialized) {
      setDraftHydrated(true);
      return;
    }

    let parsed: ConflictSessionDraftSnapshot | null = null;
    try {
      parsed = JSON.parse(serialized) as ConflictSessionDraftSnapshot;
    } catch {
      window.localStorage.removeItem(CONFLICT_SESSION_DRAFT_STORAGE_KEY);
      setDraftHydrated(true);
      return;
    }
    if (!parsed || typeof parsed !== 'object') {
      setDraftHydrated(true);
      return;
    }

    setStage(parsed.stage ?? 'mode_selection');
    setSelectedType(parsed.selectedType ?? null);
    setGroundingIndex(parsed.groundingIndex ?? 0);
    setPromptIndex(parsed.promptIndex ?? 0);
    setAnswers(parsed.answers ?? {});
    setParallelDecision(parsed.parallelDecision ?? null);
    setParallelAnnotations(parsed.parallelAnnotations ?? {});
    setSelectedResolution(parsed.selectedResolution ?? null);
    setWhiteFlagOffer(parsed.whiteFlagOffer ?? '');
    setProposalQueue(parsed.proposalQueue ?? []);
    setActiveProposalId(parsed.activeProposalId ?? null);
    setSelectedApologyType(parsed.selectedApologyType ?? null);
    setApologyTiming(parsed.apologyTiming ?? 'simultaneous');
    setFollowUpDate(parsed.followUpDate ?? '');
    setLightweightParticipants(parsed.lightweightParticipants ?? []);
    setAlignmentReached(Boolean(parsed.alignmentReached));
    setSharedSessionId(parsed.sharedSessionId ?? null);
    setSharedParticipantCount(parsed.sharedParticipantCount ?? 0);
    setSharedSessionStatus((parsed.sharedSessionId ? UI_TO_CONFLICT_STAGE[parsed.stage ?? 'mode_selection'] : null));
    setSharedSessionLastSyncedAt(null);
    setDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated || typeof window === 'undefined') return;
    const snapshot: ConflictSessionDraftSnapshot = {
      stage,
      selectedType,
      groundingIndex,
      promptIndex,
      answers,
      parallelDecision,
      parallelAnnotations,
      selectedResolution,
      whiteFlagOffer,
      proposalQueue,
      activeProposalId,
      selectedApologyType,
      apologyTiming,
      followUpDate,
      lightweightParticipants,
      alignmentReached,
      sharedSessionId,
      sharedParticipantCount,
    };
    window.localStorage.setItem(CONFLICT_SESSION_DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
  }, [
    stage,
    selectedType,
    groundingIndex,
    promptIndex,
    answers,
    parallelDecision,
    parallelAnnotations,
    selectedResolution,
    whiteFlagOffer,
    proposalQueue,
    activeProposalId,
    selectedApologyType,
    apologyTiming,
    followUpDate,
    lightweightParticipants,
    alignmentReached,
    sharedSessionId,
    sharedParticipantCount,
    draftHydrated,
  ]);

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
    setProposalQueue([]);
    setActiveProposalId(null);
    setSelectedApologyType(null);
    setApologyTiming('simultaneous');
    setFollowUpDate('');
    setInviteeEmailDraft('');
    setInviteeEmailError(null);
    setLightweightParticipants([]);
    setAlignmentReached(false);
    setSharedSessionId(null);
    setSharedSessionCodeInput('');
    setSharedParticipantCount(0);
    setSharedSessionError(null);
    setSharedSessionBusy(false);
    setSharedSessionStatus(null);
    setSharedSessionLastSyncedAt(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CONFLICT_SESSION_DRAFT_STORAGE_KEY);
    }
  };

  return useMemo(
    () => ({
      stage,
      selectedType,
      setSelectedType,
      goToGrounding,
      createSharedSession,
      joinSharedSession,
      sharedSessionId,
      sharedSessionCodeInput,
      setSharedSessionCodeInput,
      sharedParticipantCount,
      refreshSharedParticipantCount,
      resyncSharedSession,
      sharedSessionError,
      sharedSessionBusy,
      sharedSessionStatus,
      sharedSessionLastSyncedAt,
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
      parallelAnnotationItems,
      alignmentReached,
      markAlignmentReached,
      resolutionOptions,
      selectedResolution,
      setSelectedResolution,
      whiteFlagOffer,
      setWhiteFlagOffer,
      proposalQueue,
      activeProposalId,
      queueWhiteFlagOffer,
      promoteProposal,
      removeProposal,
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
      sharedSessionId,
      sharedSessionCodeInput,
      sharedParticipantCount,
      sharedSessionError,
      sharedSessionBusy,
      sharedSessionStatus,
      sharedSessionLastSyncedAt,
      currentAnswer,
      answers,
      parallelDecision,
      parallelAnnotations,
      parallelAnnotationItems,
      alignmentReached,
      selectedResolution,
      whiteFlagOffer,
      proposalQueue,
      activeProposalId,
      selectedApologyType,
      apologyTiming,
      followUpDate,
      inviteeEmailDraft,
      inviteeEmailError,
      lightweightParticipants,
    ],
  );
}
