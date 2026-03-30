import { useEffect, useMemo, useState } from 'react';
import type { ConflictType } from '../types/conflictSession';
import type { PrivatePrompt } from '../screens/PrivateCaptureScreen';
import { canTransitionConflictStage, isConflictStage } from '../stateMachine/conflictStateMachine';
import type { ConflictStage } from '../types/conflictSession';
import {
  addConflictParticipant,
  getCurrentUserId,
  createConflictSession,
  getConflictParticipantCount,
  getConflictSessionSnapshot,
  getConflictSessionStatus,
  subscribeConflictSessionStatus,
  updateConflictSessionStatus,
} from '../services/conflictSessions';
import { buildConflictInviteUrl, createConflictInvite, redeemConflictInvite } from '../services/conflictInvites';
import { trackConflictEvent } from '../services/conflictAnalytics';
import { triggerCompletionHaptic } from '../../../utils/completionHaptics';
import { trackAiUpgradePromptClicked, trackAiUpgradePromptShown } from '../../../services/aiEntitlementService';
import {
  generateInnerNextStepRecommendations,
  generateResolutionOptions,
  generateSharedSummaryCards,
} from '../services/conflictAiOrchestrator';
import { resolveSurface } from '../../../surfaces/surfaceContext';
import { buildFallbackInnerRecommendationsForSurface } from '../conflictSurfaceConfig';

type ConflictResolverUiStage =
  | 'mode_selection'
  | 'grounding'
  | 'private_capture'
  | 'inner_next_step'
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
const SHARED_SUMMARY_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bidiot\b/gi, replacement: 'hurtful remark' },
  { pattern: /\bstupid\b/gi, replacement: 'frustrating' },
  { pattern: /\bshut up\b/gi, replacement: 'stop talking' },
  { pattern: /\bhate you\b/gi, replacement: 'felt intense anger' },
  { pattern: /\bworthless\b/gi, replacement: 'unappreciated' },
  { pattern: /\bkill yourself\b/gi, replacement: 'severe harmful phrase removed' },
  { pattern: /\bwhat'?s wrong with you\b/gi, replacement: 'I felt confused by your response' },
];
const BLAME_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\byou always\b/gi, replacement: 'I experienced repeated moments where' },
  { pattern: /\byou never\b/gi, replacement: 'I experienced missing support when' },
  { pattern: /\byou made me\b/gi, replacement: 'I felt' },
  { pattern: /\byou are\b/gi, replacement: 'I experienced this as' },
];

const sanitizeForSharedSummary = (value: string): { text: string; moderationNotes: string[] } => {
  const trimmed = value.trim();
  if (!trimmed) return { text: '', moderationNotes: [] };

  let nextValue = trimmed;
  let escalatoryLanguageSoftened = false;
  let blameLanguageReframed = false;

  for (const { pattern, replacement } of SHARED_SUMMARY_REPLACEMENTS) {
    if (pattern.test(nextValue)) {
      escalatoryLanguageSoftened = true;
      pattern.lastIndex = 0;
      nextValue = nextValue.replace(pattern, replacement);
    }
  }

  for (const { pattern, replacement } of BLAME_PATTERNS) {
    if (pattern.test(nextValue)) {
      blameLanguageReframed = true;
      pattern.lastIndex = 0;
      nextValue = nextValue.replace(pattern, replacement);
    }
  }

  const moderationNotes: string[] = [];
  if (escalatoryLanguageSoftened) {
    moderationNotes.push('Escalatory wording softened');
  }
  if (blameLanguageReframed) {
    moderationNotes.push('Direct-blame wording reframed');
  }

  return { text: nextValue, moderationNotes };
};
const UI_TO_CONFLICT_STAGE: Record<ConflictResolverUiStage, ConflictStage> = {
  mode_selection: 'draft',
  grounding: 'grounding',
  private_capture: 'private_capture',
  inner_next_step: 'agreement',
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
  sequencedLead: 'me' | 'them' | null;
  followUpDate: string;
  lightweightParticipants: string[];
  alignmentReached: boolean;
  proposalQueue: { id: string; text: string }[];
  activeProposalId: string | null;
  sharedSessionId: string | null;
  sharedParticipantCount: number;
};

type InnerRecommendation = {
  id: string;
  title: string;
  reason: string;
  ctaLabel: string;
  href: string;
};

type InnerGuidanceMeta = {
  guidancePlan: {
    insightSummary: string;
    patternLinks: string[];
    riskFlags: string[];
    nowPlan: string[];
    weekPlan: string[];
    monthPlan: string[];
  };
  priorityScore: number;
  deepMode: boolean;
  usedContextDomains: string[];
  aiMode: 'premium' | 'free_quota' | 'fallback';
};
type SharedSummaryMeta = {
  aiMode: 'premium' | 'free_quota' | 'fallback';
};
type ResolutionMeta = {
  aiMode: 'premium' | 'free_quota' | 'fallback';
  fairnessWarnings: Array<{ code: string; message: string }>;
};
type InviteJoinState = 'idle' | 'validating' | 'accepted' | 'invalid';

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
  const [sequencedLead, setSequencedLead] = useState<'me' | 'them' | null>(null);
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
  const [recoverableDraft, setRecoverableDraft] = useState<ConflictSessionDraftSnapshot | null>(null);
  const [generatedInviteLinks, setGeneratedInviteLinks] = useState<string[]>([]);
  const [inviteGenerationError, setInviteGenerationError] = useState<string | null>(null);
  const [inviteJoinMessage, setInviteJoinMessage] = useState<string | null>(null);
  const [inviteJoinBootstrapped, setInviteJoinBootstrapped] = useState(false);
  const [inviteJoinState, setInviteJoinState] = useState<InviteJoinState>('idle');
  const [innerRecommendations, setInnerRecommendations] = useState<InnerRecommendation[]>([]);
  const [innerGuidanceMeta, setInnerGuidanceMeta] = useState<InnerGuidanceMeta | null>(null);
  const [sharedSummaryMeta, setSharedSummaryMeta] = useState<SharedSummaryMeta | null>(null);
  const [resolutionMeta, setResolutionMeta] = useState<ResolutionMeta | null>(null);
  const [aiSummaryCards, setAiSummaryCards] = useState<Array<{ id: string; title: string; text: string }> | null>(null);
  const [aiResolutionOptions, setAiResolutionOptions] = useState<Array<{ id: string; title: string; description: string }> | null>(null);

  const currentSurface =
    typeof window !== 'undefined' ? resolveSurface(window.location.hostname) : 'habitgame';

  const applyDraftSnapshot = (parsed: ConflictSessionDraftSnapshot) => {
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
    setSequencedLead(parsed.sequencedLead ?? null);
    setFollowUpDate(parsed.followUpDate ?? '');
    setLightweightParticipants(parsed.lightweightParticipants ?? []);
    setAlignmentReached(Boolean(parsed.alignmentReached));
    setSharedSessionId(parsed.sharedSessionId ?? null);
    setSharedParticipantCount(parsed.sharedParticipantCount ?? 0);
    setSharedSessionStatus((parsed.sharedSessionId ? UI_TO_CONFLICT_STAGE[parsed.stage ?? 'mode_selection'] : null));
    setSharedSessionLastSyncedAt(null);
  };

  const resumeRecoveredDraft = () => {
    if (!recoverableDraft) return;
    applyDraftSnapshot(recoverableDraft);
    setRecoverableDraft(null);
  };

  const discardRecoveredDraft = () => {
    setRecoverableDraft(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CONFLICT_SESSION_DRAFT_STORAGE_KEY);
    }
  };

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
      trackConflictEvent('conflict.transition_blocked', { fromStatus, toStatus, reason: guard.reason });
      return false;
    }

    await updateConflictSessionStatus({ sessionId: sharedSessionId!, status: toStatus });
    setSharedSessionStatus(toStatus);
    setStage(nextStage);
    trackConflictEvent('conflict.stage_transition', { fromStatus, toStatus, shared: true });
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
      trackConflictEvent('conflict.shared_session_created', { sessionId });
    } catch (error) {
      console.error('Failed to create shared conflict session', error);
      const message = error instanceof Error ? error.message : 'Could not create session.';
      if (/signed in/i.test(message)) {
        setSharedSessionError('Please sign in first, then create a shared session code.');
      } else {
        setSharedSessionError(`Could not create session. ${message}`);
      }
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
      trackConflictEvent('conflict.shared_session_joined', { sessionId });
    } catch (error) {
      console.error('Failed to join shared conflict session', error);
      setSharedSessionError('Could not join this session code.');
    } finally {
      setSharedSessionBusy(false);
    }
  };

  const joinSharedSessionFromInviteToken = async (inviteToken: string) => {
    const normalized = inviteToken.trim();
    setInviteJoinState('validating');
    if (!normalized) {
      setSharedSessionError('Invite token is missing from the link.');
      setInviteJoinState('invalid');
      return;
    }

    try {
      setSharedSessionBusy(true);
      setSharedSessionError(null);
      setInviteJoinMessage('Joining session from invite…');
      const userId = await getCurrentUserId();
      const redeemedInvite = await redeemConflictInvite({ inviteToken: normalized, userId });
      await addConflictParticipant({ sessionId: redeemedInvite.session_id, userId, role: 'participant' });
      setSelectedType('shared_conflict');
      setSharedSessionId(redeemedInvite.session_id);
      setSharedSessionCodeInput(redeemedInvite.session_id);
      await refreshSharedParticipantCount(redeemedInvite.session_id);
      const snapshot = await getConflictSessionSnapshot(redeemedInvite.session_id);
      if (isConflictStage(snapshot.status)) {
        setSharedSessionStatus(snapshot.status);
        setStage(CONFLICT_STAGE_TO_UI[snapshot.status]);
      }
      setSharedSessionLastSyncedAt(snapshot.updatedAt);
      setInviteJoinMessage('Invite accepted. Session synced.');
      setInviteJoinState('accepted');
      trackConflictEvent('conflict.shared_session_joined', {
        sessionId: redeemedInvite.session_id,
        source: 'invite_token',
      });
    } catch (error) {
      console.error('Failed to join session from invite token', error);
      setSharedSessionError('Could not redeem this invite link. It may be expired or already used.');
      setInviteJoinMessage(null);
      setInviteJoinState('invalid');
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
    triggerCompletionHaptic('light', { channel: 'conflict', minIntervalMs: 1200 });
    void setStageWithSync('private_capture');
  };

  const nextPrompt = () => {
    setPromptIndex((prev) => Math.min(prev + 1, PRIVATE_CAPTURE_PROMPTS.length - 1));
  };

  const previousPrompt = () => {
    setPromptIndex((prev) => Math.max(prev - 1, 0));
  };

  const skipPrompt = () => {
    trackConflictEvent('conflict.private_capture_skipped', {
      promptId: PRIVATE_CAPTURE_PROMPTS[promptIndex]?.id ?? 'unknown',
      stage,
    });
    if (promptIndex >= PRIVATE_CAPTURE_PROMPTS.length - 1) {
      void setStageWithSync('collect_pile');
      return;
    }
    nextPrompt();
  };

  const finishPrivateCapture = async () => {
    trackConflictEvent('conflict.private_capture_advanced', {
      answeredCount: Object.values(answers).filter((value) => value.trim().length > 0).length,
      totalPrompts: PRIVATE_CAPTURE_PROMPTS.length,
    });
    if (selectedType === 'inner_tension') {
      triggerCompletionHaptic('medium', { channel: 'conflict', minIntervalMs: 1500 });
      const aiResult = await generateInnerNextStepRecommendations({
        sessionId: sharedSessionId,
        answers,
        usedContextDomains: ['reflections'],
      });
      setInnerRecommendations(aiResult.recommendations);
      setInnerGuidanceMeta({
        guidancePlan: aiResult.guidancePlan,
        priorityScore: aiResult.priorityScore,
        deepMode: aiResult.deepMode,
        usedContextDomains: aiResult.usedContextDomains,
        aiMode: aiResult.mode,
      });
      trackConflictEvent('conflict.inner_guidance_shown', {
        mode: aiResult.mode,
        deepMode: aiResult.deepMode,
        usedContextDomains: aiResult.usedContextDomains,
        priorityScore: aiResult.priorityScore,
      });
      void setStageWithSync('inner_next_step');
      return;
    }
    if (selectedType === 'shared_conflict') {
      const summaryResult = await generateSharedSummaryCards({
        sessionId: sharedSessionId,
        answers,
      });
      setAiSummaryCards(summaryResult.summaryCards);
      setSharedSummaryMeta({ aiMode: summaryResult.mode });
      setAiResolutionOptions(null);
      setResolutionMeta(null);
    }
    void setStageWithSync('collect_pile');
  };

  const enterParallelRead = () => {
    setAlignmentReached(false);
    void setStageWithSync('parallel_read');
  };

  const completeParallelRead = async (
    decision: 'accurate' | 'missing',
    annotations: Record<string, 'accurate' | 'missing' | 'note'>,
  ) => {
    setParallelDecision(decision);
    setParallelAnnotations(annotations);
    const allCardsAccurate = PRIVATE_CAPTURE_PROMPTS.every((prompt) => annotations[prompt.id] === 'accurate');
    setAlignmentReached(decision === 'accurate' && allCardsAccurate);
    trackConflictEvent('conflict.parallel_read_completed', {
      decision,
      alignmentReached: decision === 'accurate' && allCardsAccurate,
      annotationCount: Object.keys(annotations).length,
    });
    const summarySource = aiSummaryCards && aiSummaryCards.length > 0
      ? aiSummaryCards
      : [
          { id: 'what_happened', title: 'What happened', text: answers.what_happened ?? '' },
          { id: 'what_it_meant', title: 'What it meant', text: answers.what_it_meant ?? '' },
          { id: 'what_is_needed', title: 'What is needed', text: answers.what_is_needed ?? '' },
        ];
    const aiOptions = await generateResolutionOptions({
      sessionId: sharedSessionId,
      summaryCards: summarySource.map((card) => ({
        id: card.id as 'what_happened' | 'what_it_meant' | 'what_is_needed',
        title: card.title,
        text: card.text,
      })),
    });
    setAiResolutionOptions(aiOptions.options);
      setResolutionMeta({
        aiMode: aiOptions.mode,
        fairnessWarnings: aiOptions.fairnessWarnings,
      });
      if (aiOptions.fairnessWarnings.length > 0) {
        trackConflictEvent('conflict.fairness_warning_hit', {
          warningCount: aiOptions.fairnessWarnings.length,
          warningCodes: aiOptions.fairnessWarnings.map((warning) => warning.code),
          mode: aiOptions.mode,
        });
      }
    void setStageWithSync('resolution_builder');
  };

  const markAlignmentReached = () => {
    setAlignmentReached(true);
    triggerCompletionHaptic('medium', { channel: 'conflict', minIntervalMs: 1600 });
  };

  const defaultResolutionOptions = [
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
  const resolutionOptions = aiResolutionOptions && aiResolutionOptions.length > 0
    ? aiResolutionOptions
    : defaultResolutionOptions;

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
    if (apologyTiming === 'sequenced' && !sequencedLead) return;
    triggerCompletionHaptic('light', { channel: 'conflict', minIntervalMs: 1200 });
    void setStageWithSync('agreement_preview');
  };

  const finalizeAgreement = async () => {
    setInviteGenerationError(null);
    if (sharedSessionId && lightweightParticipants.length > 0) {
      try {
        const currentUserId = await getCurrentUserId();
        const invites = await Promise.all(
          lightweightParticipants.map((email) =>
            createConflictInvite({ sessionId: sharedSessionId, email, createdByUserId: currentUserId }),
          ),
        );
        const links = invites.map((invite) => buildConflictInviteUrl(invite.invite_token));
        setGeneratedInviteLinks(links);
        trackConflictEvent('conflict.invites_generated', { sessionId: sharedSessionId, count: links.length });
      } catch (error) {
        console.error('Failed to generate lightweight invite links', error);
        setInviteGenerationError('Could not generate invite links right now.');
      }
    }
    trackConflictEvent('conflict.agreement_finalized', {
      sharedSessionId,
      lightweightParticipantCount: lightweightParticipants.length,
      hasFollowUpDate: Boolean(followUpDate),
      resolutionChosen: Boolean(selectedResolution || activeProposalId),
    });
    triggerCompletionHaptic('strong', { channel: 'conflict', minIntervalMs: 1800 });
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
    apologyTiming === 'sequenced'
      ? `Sequenced apology lead: ${sequencedLead === 'me' ? 'You first' : sequencedLead === 'them' ? 'Other participant first' : 'Not set'}`
      : 'Apology timing: simultaneous',
  ];

  const canFinalizeAgreement =
    Boolean(selectedResolution || activeProposalId) &&
    Boolean(selectedApologyType) &&
    (apologyTiming === 'simultaneous' || Boolean(sequencedLead));

  const parallelAnnotationItems = Object.entries(parallelAnnotations).map(([key, tag]) => ({
    id: key,
    label: key.replace(/_/g, ' '),
    tag,
  }));

  const summaryCards = aiSummaryCards && aiSummaryCards.length > 0
    ? aiSummaryCards.map((card) => ({
        id: card.id,
        title: card.title,
        text: card.text,
        toneSoftened: false,
        moderationNotes: [],
      }))
    : [
    (() => {
      const raw = answers.what_happened ?? '';
      const sanitized = sanitizeForSharedSummary(raw);
      const useSanitized = selectedType === 'shared_conflict';
      return {
        id: 'what_happened',
        title: 'What happened',
        text: useSanitized ? sanitized.text || 'No entry yet.' : raw || 'No entry yet.',
        toneSoftened: useSanitized && Boolean(raw.trim()) && sanitized.text !== raw.trim(),
        moderationNotes: useSanitized ? sanitized.moderationNotes : [],
      };
    })(),
    (() => {
      const raw = answers.what_it_meant ?? '';
      const sanitized = sanitizeForSharedSummary(raw);
      const useSanitized = selectedType === 'shared_conflict';
      return {
        id: 'what_it_meant',
        title: 'What it meant',
        text: useSanitized ? sanitized.text || 'No entry yet.' : raw || 'No entry yet.',
        toneSoftened: useSanitized && Boolean(raw.trim()) && sanitized.text !== raw.trim(),
        moderationNotes: useSanitized ? sanitized.moderationNotes : [],
      };
    })(),
    (() => {
      const raw = answers.what_is_needed ?? '';
      const sanitized = sanitizeForSharedSummary(raw);
      const useSanitized = selectedType === 'shared_conflict';
      return {
        id: 'what_is_needed',
        title: 'What is needed',
        text: useSanitized ? sanitized.text || 'No entry yet.' : raw || 'No entry yet.',
        toneSoftened: useSanitized && Boolean(raw.trim()) && sanitized.text !== raw.trim(),
        moderationNotes: useSanitized ? sanitized.moderationNotes : [],
      };
    })(),
  ] as const;

  const computedInnerRecommendations = innerRecommendations.length > 0
    ? innerRecommendations
    : buildFallbackInnerRecommendationsForSurface(answers, currentSurface);

  const completeInnerNextStep = () => {
    triggerCompletionHaptic('light', { channel: 'conflict', minIntervalMs: 1200 });
    setStage('agreement_finalized');
  };

  const trackInnerUpgradePromptClick = () => {
    trackAiUpgradePromptClicked('conflict_inner_reflection', {
      stage,
      source: 'inner_next_step',
      mode: innerGuidanceMeta?.aiMode ?? 'unknown',
    });
    trackConflictEvent('conflict.inner_upgrade_prompt_clicked', {
      stage,
      mode: innerGuidanceMeta?.aiMode ?? 'unknown',
      priorityScore: innerGuidanceMeta?.priorityScore ?? null,
    });
  };

  useEffect(() => {
    if (!innerGuidanceMeta || innerGuidanceMeta.aiMode === 'premium') return;
    trackAiUpgradePromptShown('conflict_inner_reflection', {
      stage: 'inner_next_step',
      mode: innerGuidanceMeta.aiMode,
      priorityScore: innerGuidanceMeta.priorityScore,
    });
  }, [innerGuidanceMeta]);

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
    if (inviteJoinBootstrapped || typeof window === 'undefined') return;
    setInviteJoinBootstrapped(true);
    if (!window.location.pathname.startsWith('/conflict/join')) return;

    setInviteJoinState('validating');
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setSharedSessionError('Invite link is missing a token.');
      setInviteJoinState('invalid');
      return;
    }
    void joinSharedSessionFromInviteToken(token);
  }, [inviteJoinBootstrapped]);

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

    if (parsed.stage && parsed.stage !== 'mode_selection') {
      setRecoverableDraft(parsed);
    } else {
      applyDraftSnapshot(parsed);
    }
    setDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated || typeof window === 'undefined' || recoverableDraft) return;
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
      sequencedLead,
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
    sequencedLead,
    followUpDate,
    lightweightParticipants,
    alignmentReached,
    sharedSessionId,
    sharedParticipantCount,
    draftHydrated,
    recoverableDraft,
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
    setSequencedLead(null);
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
    setRecoverableDraft(null);
    setGeneratedInviteLinks([]);
    setInviteGenerationError(null);
    setInviteJoinMessage(null);
    setInviteJoinBootstrapped(false);
    setInviteJoinState('idle');
    setInnerRecommendations([]);
    setInnerGuidanceMeta(null);
    setAiSummaryCards(null);
    setAiResolutionOptions(null);
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
      recoverableDraft: Boolean(recoverableDraft),
      resumeRecoveredDraft,
      discardRecoveredDraft,
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
      sharedSummaryMeta,
      enterParallelRead,
      completeParallelRead,
      parallelDecision,
      parallelAnnotations,
      parallelAnnotationItems,
      alignmentReached,
      markAlignmentReached,
      resolutionOptions,
      resolutionMeta,
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
      sequencedLead,
      setSequencedLead,
      completeApologyAlignment,
      innerRecommendations: computedInnerRecommendations,
      innerGuidanceMeta,
      completeInnerNextStep,
      trackInnerUpgradePromptClick,
      followUpDate,
      setFollowUpDate,
      agreementSummaryItems,
      canFinalizeAgreement,
      finalizeAgreement,
      inviteeEmailDraft,
      setInviteeEmailDraft: updateInviteeEmailDraft,
      inviteeEmailError,
      lightweightParticipants,
      generatedInviteLinks,
      inviteGenerationError,
      inviteJoinMessage,
      inviteJoinState,
      addLightweightParticipant,
      removeLightweightParticipant,
      joinSharedSessionFromInviteToken,
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
      recoverableDraft,
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
      sequencedLead,
      followUpDate,
      computedInnerRecommendations,
      innerGuidanceMeta,
      trackInnerUpgradePromptClick,
      summaryCards,
      sharedSummaryMeta,
      resolutionOptions,
      resolutionMeta,
      inviteeEmailDraft,
      inviteeEmailError,
      lightweightParticipants,
      innerRecommendations,
      aiSummaryCards,
      aiResolutionOptions,
      generatedInviteLinks,
      inviteGenerationError,
      inviteJoinMessage,
      inviteJoinState,
    ],
  );
}
