import React, {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  GAME_AXES,
  ORDERED_SCENARIO_QUESTIONS,
  getScenarioPosition,
  isAxisStart,
  type ScenarioQuestion,
} from './personalityTestDataV2';
import { scoreScenarioAnswers, describePlaystyle } from './personalityScoringV2';
import { CURRENT_FOUNDATION_VERSION, readStoredFoundation } from './foundationScoring';
import { triggerCompletionHaptic } from '../../utils/completionHaptics';
import { shareOrDownloadImage } from '../../utils/imageGenerator';
import {
  PersonalityScores,
  coerceStoredScores,
  isDimensionMeasured,
  scorePersonality,
} from './personalityScoring';
import {
  buildTopTraitList,
  buildTopTraitSummary,
  TRAIT_LABELS,
} from './personalitySummary';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { isValidUuid } from '../../lib/isValidUuid';
import { queuePersonalityTestResult, type PersonalityTestRecord } from '../../data/personalityTestRepo';
import {
  clearQueuedPersonalityTestMutations,
  loadPersonalityTestHistoryWithSupabase,
  retryFailedPersonalityTestMutations,
  syncPersonalityTestsWithSupabase,
  fetchPersonalityTestsFromSupabase,
  getPersonalityTestQueueStatus,
} from '../../services/personalityTest';
import {
  fetchPersonalityRecommendations,
  type PersonalityRecommendationRow,
} from '../../services/personalityRecommendations';
import {
  BAND_LABELS,
  buildTraitCards,
  getTraitMicroTip,
  type TraitCard,
} from './personalityTraitCopy';
import { ARCHETYPE_DECK } from './archetypes/archetypeDeck';
import { scoreArchetypes, rankArchetypes } from './archetypes/archetypeScoring';
import { buildHand, type ArchetypeHand } from './archetypes/archetypeHandBuilder';
import { DeckSummary } from './deck/DeckSummary';
import { PlayerDeck } from './deck/PlayerDeck';
import { ShadowQuestCard } from './deck/ShadowQuestCard';
import { ShadowJourneyCard } from './deck/ShadowJourneyCard';
import { CollapsibleSection } from './CollapsibleSection';
import { PlaystyleSigil } from './PlaystyleSigil';
import { IdentityLibrary } from './IdentityLibrary';
import { buildIdentityLibrary, countActionableTests } from './identityTestLibrary';
import type { MicroTestResult } from './microTests/microTestScoring';
import type { PlayerState } from './microTests/microTestTriggers';
import { getCompletedMicroTestIds, loadMicroTestResults } from './microTests/microTestStore';
import { mergeMicroTestScores } from './microTests/microTestApply';
import { PlayersHandRevealCeremony, PlayersHandSparkPreview } from '../players_hand/spark-preview';
import {
  isPlayersHandSparkComparisonEnabled,
  isPlayersHandSparkResultEnabled,
} from '../players_hand/playersHandFeatureFlags';
import './deck/deck.css';

type TestStep = 'hub' | 'quiz' | 'results';

const REFRESH_MESSAGE_SHORT_TIMEOUT = 3000;
const REFRESH_MESSAGE_LONG_TIMEOUT = 4000;

const playersHandSparkResultEnabled = isPlayersHandSparkResultEnabled();
const playersHandSparkComparisonEnabled = isPlayersHandSparkComparisonEnabled();

const AXIS_LABELS: Record<keyof PersonalityScores['axes'], string> = {
  regulation_style: 'Regulation Style',
  stress_response: 'Stress Response',
  identity_sensitivity: 'Identity Sensitivity',
  cognitive_entry: 'Cognitive Entry',
  honesty_humility: 'Honesty-Humility',
  emotionality: 'Emotionality',
};

type HandSummary = {
  headline: string;
  strengths: string[];
  tensions: string[];
  nextMove: string;
};

const HAND_SYNERGIES = [
  {
    id: 'steady-executor',
    a: 'conscientiousness',
    b: 'emotional_stability',
    text: 'Steady executor under pressure.',
  },
  {
    id: 'warm-connector',
    a: 'extraversion',
    b: 'agreeableness',
    text: 'Warm connector and motivator.',
  },
  {
    id: 'creative-planner',
    a: 'openness',
    b: 'conscientiousness',
    text: 'Creative planner who ships.',
  },
  {
    id: 'bold-experimenter',
    a: 'openness',
    b: 'stress_response',
    text: 'Bold experimenter, resilient to setbacks.',
  },
];

const HAND_TENSIONS = [
  {
    id: 'big-ideas-follow-through',
    high: 'openness',
    low: 'conscientiousness',
    text: 'Big ideas, inconsistent follow-through.',
    nextMove: 'Try a 3-step daily plan.',
  },
  {
    id: 'steady-but-slow',
    high: 'conscientiousness',
    low: 'openness',
    text: 'Reliable, but slow to embrace new approaches.',
    nextMove: 'Try a 10-minute curiosity sprint.',
  },
  {
    id: 'direct-and-energetic',
    high: 'extraversion',
    low: 'agreeableness',
    text: 'Direct and energetic, may come off abrasive.',
    nextMove: 'Try a clear-ask script.',
  },
  {
    id: 'pressure-heavy',
    high: 'emotional_stability',
    low: 'stress_response',
    text: 'Feels pressure strongly; needs strong recovery rituals.',
    nextMove: 'Try a 5-minute decompression.',
  },
  {
    id: 'sensitive-under-fire',
    high: 'identity_sensitivity',
    low: 'stress_response',
    text: 'Values run deep; stress can feel personal.',
    nextMove: 'Try a 90-second reset.',
  },
];

const SCORE_HIGH = 65;
const SCORE_BALANCED = 40;

function hasHighLow(
  scores: Record<string, number>,
  highKey: string,
  lowKey: string,
): boolean {
  return scores[highKey] >= SCORE_HIGH && scores[lowKey] <= SCORE_BALANCED - 1;
}

function hasHighBalanced(
  scores: Record<string, number>,
  a: string,
  b: string,
): boolean {
  return (
    (scores[a] >= SCORE_HIGH && scores[b] >= SCORE_BALANCED) ||
    (scores[b] >= SCORE_HIGH && scores[a] >= SCORE_BALANCED)
  );
}

function buildHandSummary(traitCards: TraitCard[]): HandSummary {
  const scoreMap = traitCards.reduce<Record<string, number>>((acc, card) => {
    acc[card.key] = card.score;
    return acc;
  }, {});

  const topCards = [...traitCards].sort((a, b) => b.score - a.score).slice(0, 2);
  const headlineParts = topCards.map((card) => card.label);
  const headline =
    headlineParts.length === 2
      ? `Your playstyle leans ${headlineParts[0]} and ${headlineParts[1]}, shaping how you show up.`
      : 'Your playstyle highlights how you show up across your traits.';

  const strengths = HAND_SYNERGIES.filter((rule) =>
    hasHighBalanced(scoreMap, rule.a, rule.b),
  )
    .map((rule) => rule.text)
    .slice(0, 3);

  const tensions = HAND_TENSIONS.filter((rule) => hasHighLow(scoreMap, rule.high, rule.low))
    .map((rule) => rule.text)
    .slice(0, 2);

  const nextMoveRule = HAND_TENSIONS.find((rule) => hasHighLow(scoreMap, rule.high, rule.low));
  const fallbackTip = topCards[0] ? getTraitMicroTip(topCards[0].key) : undefined;
  const nextMove = nextMoveRule?.nextMove ?? fallbackTip ?? 'Try a quick reset ritual.';

  return {
    headline,
    strengths: strengths.length > 0 ? strengths : ['Balanced strengths across your top traits.'],
    tensions:
      tensions.length > 0
        ? tensions
        : ['No major tensions stand out; keep reinforcing your steady habits.'],
    nextMove,
  };
}

const TRAIT_NARRATIVES: Record<
  keyof PersonalityScores['traits'],
  { high: string; mid: string; low: string }
> = {
  openness: {
    high: 'You lean into curiosity and love exploring ideas that expand your worldview.',
    mid: 'You balance imagination with practicality, adapting to what each situation needs.',
    low: 'You feel most grounded with proven routines and practical, concrete thinking.',
  },
  conscientiousness: {
    high: 'You thrive when you can organize your days and follow through on commitments.',
    mid: 'You flex between structure and spontaneity depending on what matters most.',
    low: 'You value freedom and tend to operate best when you can stay flexible.',
  },
  extraversion: {
    high: 'You recharge through people and environments that keep the energy moving.',
    mid: 'You can dial your social energy up or down depending on the context.',
    low: 'You do your best thinking in quieter spaces that allow for deep focus.',
  },
  agreeableness: {
    high: 'You naturally notice what others need and enjoy supporting the people around you.',
    mid: 'You aim for harmony while still standing firm when your values are tested.',
    low: 'You value candor and independence, even if it means challenging the status quo.',
  },
  emotional_stability: {
    high: 'You stay composed under pressure and recover quickly when life feels intense.',
    mid: 'You experience normal ups and downs and are learning what keeps you steady.',
    low: 'Your emotions run deep, so it helps to create space for grounding routines.',
  },
};

const AXIS_NARRATIVES: Record<
  keyof PersonalityScores['axes'],
  { high: string; mid: string; low: string }
> = {
  regulation_style: {
    high: 'Structure helps you stay aligned—clear plans and rituals will keep you steady.',
    mid: 'You can switch between structure and improvisation as your goals evolve.',
    low: 'You flourish with flexibility, so keep systems light and adaptive.',
  },
  stress_response: {
    high: 'You handle stress with resilience and can stay centered when stakes rise.',
    mid: 'You respond to stress with awareness and benefit from regular resets.',
    low: 'Stress can feel intense, so calming practices will make a big difference.',
  },
  identity_sensitivity: {
    high: 'Your identity and values are core anchors—you do best when they are honored.',
    mid: 'You reflect on identity when needed and keep a healthy distance when appropriate.',
    low: 'You adapt to new roles easily and can stay open to shifting priorities.',
  },
  cognitive_entry: {
    high: 'You like to understand the “why” before taking action, so context matters.',
    mid: 'You blend intuition with logic, choosing what feels most effective.',
    low: 'You prefer practical next steps and learn best by doing.',
  },
  honesty_humility: {
    high: 'You value fairness and modesty, and avoid exploiting others for personal gain.',
    mid: 'You balance self-interest with fairness, adapting to social expectations.',
    low: 'You are comfortable promoting your interests and may be more willing to bend rules.',
  },
  emotionality: {
    high: 'You experience emotions deeply and form strong attachments to others.',
    mid: 'You have a balanced emotional life with moderate sensitivity to stress.',
    low: 'You remain calm under pressure and are less affected by emotional concerns.',
  },
};

type Recommendation = {
  id: string;
  icon: string;
  label: string;
  description: string;
};

type AiNarrativeStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';

const RECOMMENDATION_ICONS: Record<string, string> = {
  openness: '🧭',
  conscientiousness: '🗓️',
  extraversion: '🤝',
  agreeableness: '💛',
  emotional_stability: '🧘',
  regulation_style: '🧩',
  stress_response: '🌬️',
  identity_sensitivity: '🪞',
  cognitive_entry: '🧠',
  overall: '✨',
};

const DEFAULT_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'focus-review',
    icon: '🎯',
    label: 'Weekly focus review',
    description: 'Pick one outcome that matters most this week and track it daily.',
  },
  {
    id: 'daily-checkin',
    icon: '📝',
    label: 'Daily check-in',
    description: 'Spend two minutes naming your top priority and emotional state.',
  },
  {
    id: 'breathing-reset',
    icon: '🌬️',
    label: 'Breathing reset',
    description: 'Use a short breathing exercise to reset your nervous system.',
  },
];

const HIGH_THRESHOLD = 65;
const LOW_THRESHOLD = 40;
const HISTORY_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const hasOpenAiKey = (): boolean => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  return typeof apiKey === 'string' && apiKey.trim().length > 0;
};

const getTraitBucket = (value: number) => {
  if (value >= HIGH_THRESHOLD) return 'high';
  if (value <= LOW_THRESHOLD) return 'low';
  return 'mid';
};

const matchesRange = (value: number, minValue: number | null, maxValue: number | null) => {
  if (minValue !== null && value < minValue) {
    return false;
  }
  if (maxValue !== null && value > maxValue) {
    return false;
  }
  return true;
};

const resolveRecommendationScore = (
  scores: PersonalityScores,
  traitKey: string,
): number | null => {
  if (traitKey === 'overall') {
    return 50;
  }

  if (traitKey in scores.traits) {
    return scores.traits[traitKey as keyof PersonalityScores['traits']];
  }

  if (traitKey in scores.axes) {
    return scores.axes[traitKey as keyof PersonalityScores['axes']];
  }

  return null;
};

const buildSupabaseRecommendations = (
  rows: PersonalityRecommendationRow[],
  scores: PersonalityScores,
): Recommendation[] => {
  const matches = rows
    .filter((row) => {
      const value = resolveRecommendationScore(scores, row.trait_key);
      if (value === null) {
        return false;
      }
      return matchesRange(value, row.min_value, row.max_value);
    })
    .sort((a, b) => {
      const priorityA = a.priority ?? 999;
      const priorityB = b.priority ?? 999;
      return priorityA - priorityB;
    })
    .map((row) => ({
      id: row.id,
      icon: RECOMMENDATION_ICONS[row.trait_key] ?? '✨',
      label: row.label,
      description: row.description,
    }));

  return matches;
};

const buildNarrative = (
  scores: PersonalityScores,
  isMeasured: (key: string) => boolean = (key) => isDimensionMeasured(key as never),
): string[] => {
  const traitEntries = Object.entries(scores.traits).sort((a, b) => b[1] - a[1]);
  // Only narrate axes that have real data — an unmeasured HEXACO axis sits at a
  // neutral placeholder and must never be "the key axis" until a micro-test
  // measures it.
  const axisEntries = Object.entries(scores.axes)
    .filter(([key]) => isMeasured(key))
    .sort((a, b) => Math.abs(b[1] - 50) - Math.abs(a[1] - 50));

  const [primaryTraitKey] = traitEntries[0];
  const [secondaryTraitKey] = traitEntries[1];
  const [primaryAxisKey] = axisEntries[0];

  const primaryTrait = primaryTraitKey as keyof PersonalityScores['traits'];
  const secondaryTrait = secondaryTraitKey as keyof PersonalityScores['traits'];
  const primaryAxis = primaryAxisKey as keyof PersonalityScores['axes'];

  const primaryTraitBucket = getTraitBucket(scores.traits[primaryTrait]);
  const secondaryTraitBucket = getTraitBucket(scores.traits[secondaryTrait]);
  const axisBucket = getTraitBucket(scores.axes[primaryAxis]);

  return [
    `${TRAIT_LABELS[primaryTrait]} stands out in your profile. ${
      TRAIT_NARRATIVES[primaryTrait][primaryTraitBucket]
    }`,
    `${TRAIT_LABELS[secondaryTrait]} supports your style. ${
      TRAIT_NARRATIVES[secondaryTrait][secondaryTraitBucket]
    }`,
    `${AXIS_LABELS[primaryAxis]} is a key axis for you. ${
      AXIS_NARRATIVES[primaryAxis][axisBucket]
    }`,
  ];
};

const buildAiNarrative = (scores: PersonalityScores, summary: HandSummary | null): string[] => {
  const topTraits = Object.entries(scores.traits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([key]) => TRAIT_LABELS[key as keyof PersonalityScores['traits']] ?? key);

  const topTraitsLine =
    topTraits.length > 0
      ? `Your strongest signals are ${topTraits.join(' and ')}, shaping your day-to-day playstyle.`
      : 'Your top traits shape a balanced, adaptable playstyle.';

  const handLine = summary
    ? `Your current playstyle highlights ${summary.strengths[0].toLowerCase()}`
    : 'Your playstyle highlights how your traits combine into practical strengths.';

  return [
    'AI narrative (beta): This reflection builds on your trait signals.',
    topTraitsLine,
    `${handLine} Focus your next move on one small habit that reinforces this momentum.`,
  ];
};

const buildRecommendations = (scores: PersonalityScores): Recommendation[] => {
  const picks: Recommendation[] = [];

  if (scores.axes.stress_response <= LOW_THRESHOLD) {
    picks.push({
      id: 'stress-tools',
      icon: '🧘‍♀️',
      label: 'Stress support',
      description: 'Lean on meditation and grounding rituals when things feel heavy.',
    });
  }

  if (scores.axes.regulation_style >= HIGH_THRESHOLD) {
    picks.push({
      id: 'structured-plans',
      icon: '🗓️',
      label: 'Structured planning',
      description: 'Use detailed goal plans and habit streaks to stay on track.',
    });
  } else if (scores.axes.regulation_style <= LOW_THRESHOLD) {
    picks.push({
      id: 'flexible-plans',
      icon: '🌊',
      label: 'Flexible planning',
      description: 'Try lighter habit prompts and focus on momentum over rigidity.',
    });
  }

  if (scores.traits.extraversion >= HIGH_THRESHOLD) {
    picks.push({
      id: 'social-energy',
      icon: '🤝',
      label: 'Social momentum',
      description: 'Plan goals with a buddy or share progress in community spaces.',
    });
  } else if (scores.traits.extraversion <= LOW_THRESHOLD) {
    picks.push({
      id: 'solo-focus',
      icon: '📚',
      label: 'Quiet focus',
      description: 'Block solo deep-work sessions and celebrate private wins.',
    });
  }

  if (scores.traits.openness >= HIGH_THRESHOLD) {
    picks.push({
      id: 'explore',
      icon: '🧭',
      label: 'Explore & learn',
      description: 'Add learning quests or skill sprints that keep curiosity alive.',
    });
  }

  const unique = new Map<string, Recommendation>();
  for (const pick of picks) {
    unique.set(pick.id, pick);
  }

  for (const fallback of DEFAULT_RECOMMENDATIONS) {
    if (unique.size >= 3) break;
    unique.set(fallback.id, fallback);
  }

  return Array.from(unique.values()).slice(0, 3);
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const daysSince = (isoDate: string): number => {
  const taken = new Date(isoDate).getTime();
  if (Number.isNaN(taken)) return 0;
  return Math.max(0, Math.floor((Date.now() - taken) / MS_PER_DAY));
};

const formatHistoryDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return HISTORY_DATE_FORMATTER.format(date);
};

export type PersonalityTestProps = {
  /** Gamification level, used to evaluate micro-test unlock conditions. */
  level?: number;
  /** Current habit streak in days, used to evaluate micro-test unlock conditions. */
  currentStreakDays?: number;
};

export default function PersonalityTest({
  level = 1,
  currentStreakDays = 0,
}: PersonalityTestProps = {}) {
  const { session } = useSupabaseAuth();
  const [step, setStep] = useState<TestStep>('hub');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSectionIntro, setShowSectionIntro] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const savedResultRef = useRef<string | null>(null);
  const refreshMessageTimeoutRef = useRef<number | null>(null);
  const [supabaseRecommendations, setSupabaseRecommendations] = useState<Recommendation[]>([]);
  const [history, setHistory] = useState<PersonalityTestRecord[]>([]);
  const [aiNarrativeEnabled, setAiNarrativeEnabled] = useState(false);
  const [aiNarrativeStatus, setAiNarrativeStatus] = useState<AiNarrativeStatus>('idle');
  const [aiNarrative, setAiNarrative] = useState<string[]>([]);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [queuePending, setQueuePending] = useState(0);
  const [queueFailed, setQueueFailed] = useState(0);
  const [showSparkReveal, setShowSparkReveal] = useState(true);
  const shareCardRef = useRef<HTMLDivElement | null>(null);
  const [shareState, setShareState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');

  const activeSession = useMemo(() => {
    if (session) {
      return session;
    }
    return null;
  }, [session]);

  const activeUserId = isValidUuid(activeSession?.user?.id) ? activeSession.user.id : null;

  const currentQuestion: ScenarioQuestion | undefined =
    ORDERED_SCENARIO_QUESTIONS[currentIndex];
  const quizPosition = getScenarioPosition(currentIndex);
  const answeredCount = Object.keys(answers).length;

  // Answered questions within the current axis — drives the charging suit icon.
  const axisAnsweredCount = ORDERED_SCENARIO_QUESTIONS.filter(
    (question) => question.axis === quizPosition.axis.key && answers[question.id],
  ).length;
  const axisCharge = quizPosition.axisSize > 0 ? axisAnsweredCount / quizPosition.axisSize : 0;

  // #3 Live axis needle: where this axis currently sits, from the answers given
  // so far. Undefined until the first answer, so the needle doesn't imply a
  // reading the player hasn't produced yet.
  const liveAxisScore = useMemo(() => {
    if (axisAnsweredCount === 0) return null;
    return scoreScenarioAnswers(answers).axisScores[quizPosition.axis.key];
  }, [answers, axisAnsweredCount, quizPosition.axis.key]);

  // The in-memory session read. Every question is skippable, so this is valid
  // from the first answer onward — it simply reports which dimensions and axes
  // have real data behind them (`measured`) rather than demanding completeness.
  const sessionRead = useMemo(() => {
    if (Object.keys(answers).length === 0) return null;
    return scoreScenarioAnswers(answers);
  }, [answers]);

  const sessionScores = sessionRead?.scores ?? null;
  const foundationScores = step === 'results' ? sessionScores : null;

  // Completed micro-tests for this user, loaded offline-first. Folded into the
  // displayed scores so HEXACO reveals the two deeper axes and evolves the hand.
  const [microResults, setMicroResults] = useState<MicroTestResult[]>([]);
  useEffect(() => {
    setMicroResults(activeUserId ? loadMicroTestResults(activeUserId) : []);
  }, [activeUserId, step]);

  const merged = useMemo(
    () =>
      foundationScores
        ? mergeMicroTestScores(foundationScores, microResults, new Date(), sessionRead?.measured)
        : null,
    [foundationScores, microResults, sessionRead],
  );
  const scores = merged?.scores ?? foundationScores;
  const measuredDimensions = merged?.measured ?? null;
  const isMeasured = useCallback(
    (key: string) => (measuredDimensions ? measuredDimensions.has(key) : isDimensionMeasured(key as never)),
    [measuredDimensions],
  );

  const archetypeHand = useMemo<ArchetypeHand | null>(() => {
    if (!scores) {
      return null;
    }

    const archetypeScores = scoreArchetypes(scores, ARCHETYPE_DECK);
    const ranked = rankArchetypes(archetypeScores);
    return buildHand(ranked);
  }, [scores]);

  const narrative = useMemo(() => (scores ? buildNarrative(scores, isMeasured) : []), [scores, isMeasured]);
  const traitCards = useMemo(() => (scores ? buildTraitCards(scores, isMeasured) : []), [scores, isMeasured]);
  const topTraits = useMemo(
    () => (scores ? buildTopTraitList(scores.traits, 2) : []),
    [scores],
  );
  const latestRecord = history[0] ?? null;
  const storedReadForHero = useMemo(() => readStoredFoundation(latestRecord), [latestRecord]);

  // The five-axis playstyle read shown as the results hero. Prefers this
  // session's answers; falls back to a stored v2 record. Axes where every
  // question was skipped are simply left out rather than shown as a coin-flip.
  const playstyleRead = useMemo(() => {
    const axisScores = sessionRead?.axisScores ?? storedReadForHero?.axisScores;
    const measuredAxes = sessionRead?.measuredAxes ?? storedReadForHero?.measuredAxes;
    if (!axisScores || !measuredAxes) return [];
    return GAME_AXES.filter((axis) => measuredAxes.has(axis.key)).map((axis) => {
      const score = axisScores[axis.key];
      const leansHigh = score >= 50;
      return {
        key: axis.key,
        icon: axis.icon,
        color: axis.color,
        score,
        label: leansHigh ? axis.highLabel : axis.lowLabel,
        opposite: leansHigh ? axis.lowLabel : axis.highLabel,
      };
    });
  }, [sessionRead, storedReadForHero]);

  // Sigil inputs: this session's axes if present, else the stored v2 record's.
  // The previous v2 record (if any) becomes the ghost outline.
  const sigilData = useMemo(() => {
    const axisScores = sessionRead?.axisScores ?? storedReadForHero?.axisScores;
    const measuredAxes = sessionRead?.measuredAxes ?? storedReadForHero?.measuredAxes;
    if (!axisScores || !measuredAxes) return null;

    // Compare against the most recent *other* v2 record so a retake shows movement.
    const previous = history
      .slice(sessionRead ? 0 : 1)
      .map((record) => readStoredFoundation(record))
      .find((read) => read?.axisScores && read.axisScores !== axisScores);

    return {
      axisScores,
      measuredAxes,
      previousAxisScores: previous?.axisScores ?? null,
    };
  }, [sessionRead, storedReadForHero, history]);

  const handSummary = useMemo(
    () => (traitCards.length > 0 ? buildHandSummary(traitCards) : null),
    [traitCards],
  );

  // ── Hub state ─────────────────────────────────────────────────────────────
  // The hub shows the player's current card without re-running the quiz, so it
  // rebuilds the hand from the stored record (plus any micro-test evidence).
  // Prefer the saved record; fall back to the in-memory session so a player
  // whose result has not persisted (guest, or offline before sync) still comes
  // back to their hand instead of an empty "take the test" screen.
  // Read through the version dispatcher so a v1 record keeps using its stored
  // aggregate while a v2 record is rescored from its own answers.
  const storedRead = storedReadForHero;

  const hubHand = useMemo<ArchetypeHand | null>(() => {
    const base = storedRead?.scores ?? sessionScores;
    if (!base) return null;
    const baseMeasured = storedRead?.measured ?? sessionRead?.measured;
    const hubScores = mergeMicroTestScores(base, microResults, new Date(), baseMeasured).scores;
    return buildHand(rankArchetypes(scoreArchetypes(hubScores, ARCHETYPE_DECK)));
  }, [storedRead, sessionScores, sessionRead, microResults]);

  const hasFoundation = Boolean(latestRecord || sessionScores);

  const playerState = useMemo<PlayerState>(
    () => ({
      level,
      currentStreakDays,
      daysSinceFoundationTest: latestRecord ? daysSince(latestRecord.taken_at) : 0,
      completedMicroTests: getCompletedMicroTestIds(microResults),
      foundationTestTaken: hasFoundation,
    }),
    [level, currentStreakDays, latestRecord, microResults, hasFoundation],
  );

  const libraryEntries = useMemo(
    () =>
      buildIdentityLibrary({
        foundationTakenAt: latestRecord?.taken_at ?? null,
        foundationTaken: hasFoundation,
        foundationQuestionCount: ORDERED_SCENARIO_QUESTIONS.length,
        microResults,
        playerState,
      }),
    [latestRecord, hasFoundation, microResults, playerState],
  );

  const actionableTestCount = countActionableTests(libraryEntries);

  const recommendations = useMemo(
    () => {
      if (!scores) {
        return [];
      }

      const remote = supabaseRecommendations;
      if (remote.length === 0) {
        return buildRecommendations(scores);
      }

      const merged = [...remote];
      if (merged.length < 3) {
        for (const fallback of buildRecommendations(scores)) {
          if (!merged.find((item) => item.id === fallback.id)) {
            merged.push(fallback);
          }
          if (merged.length >= 3) {
            break;
          }
        }
      }

      return merged.slice(0, 3);
    },
    [scores, supabaseRecommendations],
  );

  const refreshHistory = useCallback(() => {
    if (!activeUserId) {
      setHistory([]);
      return Promise.resolve();
    }

    return loadPersonalityTestHistoryWithSupabase(activeUserId)
      .then((records) => {
        setHistory(records);
      })
      .catch(() => {
        // Keep existing history on transient errors rather than clearing it.
      });
  }, [activeUserId]);

  const handleStart = () => {
    setStep('quiz');
    setCurrentIndex(0);
    setShowSectionIntro(true);
    setAnswers({});
    savedResultRef.current = null;
  };

  const handleSelect = (optionId: string) => {
    if (!currentQuestion) {
      return;
    }

    const wasAnswered = Boolean(answers[currentQuestion.id]);
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));

    // A light tap on every pick, and a firmer one when this pick completes an
    // axis. triggerCompletionHaptic already honours the user's haptic setting,
    // reduced-motion, and rate limits, and no-ops on web.
    const completesAxis = !wasAnswered && axisAnsweredCount + 1 === quizPosition.axisSize;
    triggerCompletionHaptic(completesAxis ? 'medium' : 'light', {
      channel: completesAxis ? 'gamification' : 'action',
    });
  };

  const advance = () => {
    if (currentIndex >= ORDERED_SCENARIO_QUESTIONS.length - 1) {
      setStep('results');
      return;
    }

    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    // Pause on an axis-intro screen whenever we cross into a new axis.
    if (isAxisStart(nextIndex)) {
      setShowSectionIntro(true);
    }
  };

  const handleNext = () => {
    if (!currentQuestion || !answers[currentQuestion.id]) {
      return;
    }
    advance();
  };

  /** Leave the question unanswered and move on. Skipped questions score nothing. */
  const handleSkip = () => {
    if (!currentQuestion) {
      return;
    }
    setAnswers((prev) => {
      if (!(currentQuestion.id in prev)) return prev;
      const next = { ...prev };
      delete next[currentQuestion.id];
      return next;
    });
    advance();
  };

  const handleBack = () => {
    if (showSectionIntro) {
      if (quizPosition.axisIndex === 0) {
        setStep('hub');
        return;
      }
      setShowSectionIntro(false);
      setCurrentIndex((prev) => prev - 1);
      return;
    }

    if (isAxisStart(currentIndex)) {
      setShowSectionIntro(true);
      return;
    }

    setCurrentIndex((prev) => prev - 1);
  };

  const handleShareHand = async () => {
    const node = shareCardRef.current;
    if (!node) return;
    setShareState('working');
    try {
      await shareOrDownloadImage(node, 'my-playstyle.png', {
        title: 'My playstyle',
        text: playstyleRead.length > 0
          ? `I play ${playstyleRead.map((entry) => entry.label).join(' · ')}.`
          : 'My LifeGoal playstyle.',
      });
      setShareState('done');
    } catch {
      // Sharing is an enhancement; a failure must not disturb the results view.
      setShareState('error');
    }
  };

  const handleRetake = () => {
    setStep('quiz');
    setCurrentIndex(0);
    setShowSectionIntro(true);
    setAnswers({});
    savedResultRef.current = null;
    setShowSparkReveal(true);
  };

  const handleViewLatest = () => {
    if (!latestRecord) {
      return;
    }

    // Only v2 answers (option ids) can be replayed through the v2 bank. A v1
    // record's Likert numbers are meaningless here, so we show its results from
    // the stored aggregate instead of trying to re-score them.
    const restored: Record<string, string> = {};
    for (const [questionId, value] of Object.entries(latestRecord.answers ?? {})) {
      if (typeof value === 'string') restored[questionId] = value;
    }
    setAnswers(restored);
    savedResultRef.current = latestRecord.id;
    setStep('results');
  };

  const setRefreshMessageWithTimeout = useCallback((message: string, timeout: number) => {
    // Clear any existing timeout
    if (refreshMessageTimeoutRef.current !== null) {
      window.clearTimeout(refreshMessageTimeoutRef.current);
      refreshMessageTimeoutRef.current = null;
    }
    
    setRefreshMessage(message);
    refreshMessageTimeoutRef.current = window.setTimeout(() => {
      setRefreshMessage(null);
      refreshMessageTimeoutRef.current = null;
    }, timeout);
  }, []);

  const handleRefreshFromSupabase = async () => {
    if (!activeUserId) {
      setRefreshMessageWithTimeout('No active user session', REFRESH_MESSAGE_SHORT_TIMEOUT);
      return;
    }

    setIsRefreshing(true);
    setRefreshMessage(null);

    try {
      // fetchPersonalityTestsFromSupabase fetches from Supabase and stores records in IndexedDB
      const remoteRecords = await fetchPersonalityTestsFromSupabase(activeUserId);
      await refreshHistory();
      
      if (remoteRecords.length > 0) {
        setRefreshMessageWithTimeout(
          `✓ Loaded ${remoteRecords.length} test${remoteRecords.length > 1 ? 's' : ''} from Supabase`,
          REFRESH_MESSAGE_LONG_TIMEOUT
        );
      } else {
        setRefreshMessageWithTimeout('No tests found in Supabase', REFRESH_MESSAGE_LONG_TIMEOUT);
      }
    } catch (error) {
      setRefreshMessageWithTimeout('Failed to load from Supabase', REFRESH_MESSAGE_LONG_TIMEOUT);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!activeUserId) return;
    await retryFailedPersonalityTestMutations(activeUserId);
    await syncPersonalityTestsWithSupabase(activeUserId);
    const status = await getPersonalityTestQueueStatus(activeUserId);
    setQueuePending(status.pending);
    setQueueFailed(status.failed);
  };

  const handleClearQueue = async () => {
    if (!activeUserId) return;
    const confirmed = window.confirm('Clear unsynced personality test changes on this device?');
    if (!confirmed) return;
    await clearQueuedPersonalityTestMutations(activeUserId);
    const status = await getPersonalityTestQueueStatus(activeUserId);
    setQueuePending(status.pending);
    setQueueFailed(status.failed);
  };

  useEffect(() => {
    if (step !== 'results' || !foundationScores || !activeUserId) {
      return;
    }

    if (savedResultRef.current) {
      return;
    }

    // Persist the FOUNDATION scores/hand — the stored record represents the
    // foundation test event. Micro-test results live in their own local store
    // and are folded in only for display, so they are never double-counted.
    const foundationHand = buildHand(
      rankArchetypes(scoreArchetypes(foundationScores, ARCHETYPE_DECK)),
    );

    queuePersonalityTestResult({
      userId: activeUserId,
      answers,
      scores: foundationScores,
      archetypeHand: foundationHand,
      version: CURRENT_FOUNDATION_VERSION,
    })
      .then((record) => {
        savedResultRef.current = record.id;
        return syncPersonalityTestsWithSupabase(activeUserId);
      })
      .then(() => {
        void refreshHistory();
      })
      .catch(() => {
        // Fail silently; results are still shown locally.
      });
  }, [activeUserId, answers, foundationScores, step]);

  useEffect(() => {
    if (step !== 'results') {
      return;
    }

    void refreshHistory();
  }, [refreshHistory, step]);

  useEffect(() => {
    if (!activeUserId) {
      setHistory([]);
      return;
    }

    let cancelled = false;

    syncPersonalityTestsWithSupabase(activeUserId)
      .catch(() => {
        // Ignore sync failures; we'll still fall back to local history.
      })
      .finally(() => {
        if (!cancelled) {
          void refreshHistory();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeUserId, refreshHistory]);

  useEffect(() => {
    if (!activeUserId) {
      setQueuePending(0);
      setQueueFailed(0);
      return;
    }
    let cancelled = false;
    const loadQueueStatus = async () => {
      const status = await getPersonalityTestQueueStatus(activeUserId);
      if (!cancelled) {
        setQueuePending(status.pending);
        setQueueFailed(status.failed);
      }
    };
    void loadQueueStatus();
    const intervalId = window.setInterval(() => {
      void loadQueueStatus();
    }, 10000);
    const handleOnline = () => {
      void syncPersonalityTestsWithSupabase(activeUserId).finally(() => {
        void loadQueueStatus();
      });
    };
    window.addEventListener('online', handleOnline);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
    };
  }, [activeUserId]);

  useEffect(() => {
    if (!activeUserId || queuePending + queueFailed <= 0) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [activeUserId, queuePending, queueFailed]);

  useEffect(() => {
    if (step !== 'results' || !scores) {
      return;
    }

    let cancelled = false;

    fetchPersonalityRecommendations()
      .then((rows) => {
        if (cancelled) {
          return;
        }
        const filtered = buildSupabaseRecommendations(rows, scores);
        setSupabaseRecommendations(filtered);
      })
      .catch(() => {
        if (!cancelled) {
          setSupabaseRecommendations([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [scores, step]);

  useEffect(() => {
    if (!showSettingsMenu) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      
      const settingsMenu = target.closest('.identity-hub__settings-menu');
      const settingsToggle = target.closest('.identity-hub__settings-toggle');
      
      if (!settingsMenu && !settingsToggle) {
        setShowSettingsMenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSettingsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showSettingsMenu]);

  useEffect(() => {
    if (step !== 'results') {
      setAiNarrativeEnabled(false);
      setAiNarrativeStatus('idle');
      setAiNarrative([]);
      return;
    }

    if (!aiNarrativeEnabled || !scores) {
      return;
    }

    if (!hasOpenAiKey()) {
      setAiNarrativeStatus('unavailable');
      setAiNarrative([]);
      return;
    }

    setAiNarrativeStatus('loading');
    const timeout = window.setTimeout(() => {
      setAiNarrative(buildAiNarrative(scores, handSummary));
      setAiNarrativeStatus('ready');
    }, 900);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [aiNarrativeEnabled, handSummary, scores, step]);

  useEffect(() => {
    // Clean up refresh message timeout on unmount
    return () => {
      if (refreshMessageTimeoutRef.current !== null) {
        window.clearTimeout(refreshMessageTimeoutRef.current);
      }
    };
  }, []);

  return (
    <section className="identity-hub">
      <div className="identity-hub__header">
        <div>
          <h2 className="identity-hub__title">🪪 Your Identity</h2>
          <p className="identity-hub__subtitle">
            Your card, your playstyle, and the check-ins that sharpen them.
          </p>
        </div>
        <button
          type="button"
          className="identity-hub__settings-toggle"
          onClick={() => setShowSettingsMenu(!showSettingsMenu)}
          title="Settings"
          aria-label="Toggle settings menu"
        >
          ⚙️
        </button>
      </div>

      {showSettingsMenu && (
        <div className="identity-hub__settings-menu">
          <button
            type="button"
            className="identity-hub__settings-option"
            onClick={handleRefreshFromSupabase}
            disabled={isRefreshing}
          >
            {isRefreshing ? '⏳ Refreshing...' : '🔄 Refresh from Supabase'}
          </button>
          {refreshMessage && (
            <p className="identity-hub__refresh-message">{refreshMessage}</p>
          )}
          {(queuePending > 0 || queueFailed > 0) && (
            <>
              <button type="button" className="identity-hub__settings-option" onClick={handleRetryFailed}>
                🔁 Retry offline sync
              </button>
              <button type="button" className="identity-hub__settings-option" onClick={handleClearQueue}>
                🧹 Clear offline queue
              </button>
            </>
          )}
        </div>
      )}

      {(queuePending > 0 || queueFailed > 0) && (
        <div className="identity-hub__settings-menu" role="status" aria-live="polite">
          {queueFailed > 0
            ? `⚠️ ${queueFailed} personality test change${queueFailed > 1 ? 's' : ''} failed to sync. We'll retry when you are online.`
            : `💾 ${queuePending} personality test change${queuePending > 1 ? 's are' : ' is'} queued for sync.`}
        </div>
      )}

      {step === 'hub' && hubHand && (
        <>
          <div className="identity-hub__section">
            <DeckSummary hand={hubHand} microTestCount={actionableTestCount} />
          </div>
          <div className="identity-hub__section">
            <IdentityLibrary
              userId={activeUserId}
              entries={libraryEntries}
              foundationScores={
                latestRecord
                  ? coerceStoredScores(latestRecord.traits, latestRecord.axes)
                  : sessionScores
              }
              microResults={microResults}
              onResultsChange={setMicroResults}
              onTakeFoundation={handleStart}
            />
          </div>
          <div className="identity-hub__section">
            <ShadowQuestCard hand={hubHand} userId={activeUserId} />
          </div>
          <div className="identity-hub__actions">
            <button className="identity-hub__cta" type="button" onClick={handleViewLatest}>
              View full results
            </button>
          </div>
        </>
      )}

      {step === 'hub' && !hubHand && (
        <div className="identity-hub__card">
          <h3 className="identity-hub__card-title">Meet your playstyle</h3>
          <p className="identity-hub__card-text">
            Answer quick prompts to surface the traits that shape your goals, habits, and daily
            focus. Your results stay in your private ID space.
          </p>
          <ul className="identity-hub__intro-list">
            <li>Spot your strongest traits and growth edges.</li>
            <li>Get a simple playstyle summary and next-step recommendation.</li>
            <li>Use your trait cards to personalize the rest of LifeGoal.</li>
          </ul>
          <div className="identity-hub__intro-meta">
            <span className="identity-hub__chip">⏱️ 3 minutes</span>
            <span className="identity-hub__chip">🧠 {ORDERED_SCENARIO_QUESTIONS.length} questions</span>
            <span className="identity-hub__chip">🔒 Private</span>
          </div>
          <div className="identity-hub__actions">
            <button className="identity-hub__cta" type="button" onClick={handleStart}>
              Start
            </button>
            {latestRecord && (
              <button
                className="identity-hub__secondary"
                type="button"
                onClick={handleViewLatest}
              >
                View latest ({buildTopTraitSummary(latestRecord.traits)})
              </button>
            )}
          </div>
        </div>
      )}

      {step === 'quiz' && showSectionIntro && (
        <div
          className="identity-hub__card identity-hub__section-intro"
          style={{ '--suit-color': quizPosition.axis.color } as CSSProperties}
        >
          <span className="identity-hub__section-intro-kicker">
            Round {quizPosition.axisIndex + 1} of {GAME_AXES.length}
          </span>
          <span className="identity-hub__section-intro-icon" aria-hidden="true">
            {quizPosition.axis.icon}
          </span>
          <h3 className="identity-hub__card-title">{quizPosition.axis.sectionTitle}</h3>
          <p className="identity-hub__card-text">{quizPosition.axis.blurb}</p>
          <div className="identity-hub__intro-meta">
            <span className="identity-hub__chip identity-hub__chip--subtle">
              {quizPosition.axisSize} quick prompts
            </span>
          </div>
          <div className="identity-hub__actions">
            <button className="identity-hub__secondary" type="button" onClick={handleBack}>
              Previous
            </button>
            <button
              className="identity-hub__cta"
              type="button"
              onClick={() => setShowSectionIntro(false)}
            >
              Deal the questions
            </button>
          </div>
        </div>
      )}

      {step === 'quiz' && !showSectionIntro && currentQuestion && (
        <div
          // Keyed on the question so each one re-runs the deal-in animation.
          key={currentQuestion.id}
          className="identity-hub__card identity-hub__card--dealt identity-hub__quiz-card"
          style={
            {
              '--suit-color': quizPosition.axis.color,
              '--axis-charge': `${Math.round(axisCharge * 100)}%`,
            } as CSSProperties
          }
        >
          <div className="identity-hub__progress-row">
            <span
              className="identity-hub__progress-suit"
              style={{ '--suit-color': quizPosition.axis.color } as CSSProperties}
            >
              <span
                className={`identity-hub__charge${
                  axisCharge >= 1 ? ' identity-hub__charge--full' : ''
                }`}
                aria-hidden="true"
              >
                <span className="identity-hub__charge-icon">{quizPosition.axis.icon}</span>
              </span>
              {quizPosition.axis.highLabel} ↔ {quizPosition.axis.lowLabel} ·{' '}
              {quizPosition.questionInAxis}/{quizPosition.axisSize}
            </span>
            <span className="identity-hub__progress">
              {currentIndex + 1} / {ORDERED_SCENARIO_QUESTIONS.length}
            </span>
          </div>
          <div className="identity-hub__progress-track" aria-hidden="true">
            <div
              className="identity-hub__progress-fill"
              style={{
                width: `${Math.round(((currentIndex + 1) / ORDERED_SCENARIO_QUESTIONS.length) * 100)}%`,
                backgroundColor: quizPosition.axis.color,
              }}
            />
          </div>
          <div
            className="identity-hub__needle"
            role="img"
            aria-label={
              liveAxisScore === null
                ? `${quizPosition.axis.highLabel} to ${quizPosition.axis.lowLabel}: no reading yet`
                : `${quizPosition.axis.highLabel} to ${quizPosition.axis.lowLabel}: leaning ${
                    liveAxisScore >= 50 ? quizPosition.axis.highLabel : quizPosition.axis.lowLabel
                  }`
            }
          >
            <span className="identity-hub__needle-end">{quizPosition.axis.lowLabel}</span>
            <span className="identity-hub__needle-track">
              <span className="identity-hub__needle-tick" aria-hidden="true" />
              {liveAxisScore !== null && (
                <span
                  className="identity-hub__needle-marker"
                  style={{ left: `${liveAxisScore}%` }}
                />
              )}
            </span>
            <span className="identity-hub__needle-end">{quizPosition.axis.highLabel}</span>
          </div>
          <h3 className="identity-hub__card-title">{currentQuestion.text}</h3>
          <p className="identity-hub__card-text identity-hub__card-text--compact">
            Pick whichever is closest to what you'd actually do. There's no right answer here.
          </p>
          <div className="identity-hub__options">
            {currentQuestion.options.map((option) => (
              <button
                key={option.id}
                className={`identity-hub__option identity-hub__option--scenario${
                  answers[currentQuestion.id] === option.id
                    ? ' identity-hub__option--selected'
                    : ''
                }`}
                type="button"
                onClick={() => handleSelect(option.id)}
              >
                <span className="identity-hub__option-label">{option.label}</span>
              </button>
            ))}
          </div>
          <div className="identity-hub__actions">
            <button className="identity-hub__secondary" type="button" onClick={handleBack}>
              Previous
            </button>
            <button
              className="identity-hub__cta"
              type="button"
              onClick={handleNext}
              disabled={!answers[currentQuestion.id]}
            >
              {currentIndex === ORDERED_SCENARIO_QUESTIONS.length - 1
                ? 'View results'
                : 'Continue'}
            </button>
          </div>
          <button type="button" className="identity-hub__skip" onClick={handleSkip}>
            None of these fit — skip this one
          </button>
        </div>
      )}

      {step === 'results' && scores && (
        <div className="identity-hub__card">
          <h3 className="identity-hub__card-title">How you play</h3>
          <p className="identity-hub__card-text identity-hub__card-text--compact">
            Your playstyle read, and what to focus on next.
          </p>
          <div className="identity-hub__results-hero" ref={shareCardRef}>
            <p className="identity-hub__results-kicker">Your playstyle</p>
            {playstyleRead.length > 0 ? (
              <>
                {sigilData && (
                  <div className="identity-hub__sigil-wrap">
                    <PlaystyleSigil
                      axisScores={sigilData.axisScores}
                      measuredAxes={sigilData.measuredAxes}
                      previousAxisScores={sigilData.previousAxisScores}
                    />
                  </div>
                )}
                <ul className="identity-hub__playstyle">
                  {playstyleRead.map((entry) => (
                    <li
                      key={entry.key}
                      className="identity-hub__playstyle-row"
                      style={{ '--suit-color': entry.color } as CSSProperties}
                    >
                      <span className="identity-hub__playstyle-icon" aria-hidden="true">
                        {entry.icon}
                      </span>
                      <span className="identity-hub__playstyle-label">{entry.label}</span>
                      <span className="identity-hub__playstyle-scale" aria-hidden="true">
                        <span
                          className="identity-hub__playstyle-marker"
                          style={{ left: `${entry.score}%` }}
                        />
                      </span>
                      <span className="identity-hub__playstyle-opposite">{entry.opposite}</span>
                    </li>
                  ))}
                </ul>
                <p className="identity-hub__results-summary">
                  {`You play ${playstyleRead.map((entry) => entry.label).join(' · ')}.`}
                </p>
              </>
            ) : (
              <p className="identity-hub__results-summary">
                {topTraits.length > 0
                  ? `Your strongest signals lean ${topTraits.join(' and ')} today.`
                  : 'Your strongest signals feel balanced today.'}
              </p>
            )}
          </div>
          {playstyleRead.length > 0 && (
            <div className="identity-hub__share">
              <button
                type="button"
                className="identity-hub__secondary identity-hub__secondary--compact"
                onClick={handleShareHand}
                disabled={shareState === 'working'}
              >
                {shareState === 'working' ? 'Preparing…' : '📤 Share your hand'}
              </button>
              {shareState === 'error' && (
                <span className="identity-hub__share-note">
                  Could not create the image. Try again, or screenshot instead.
                </span>
              )}
            </div>
          )}
          <CollapsibleSection title="Score breakdown" meta="Big Five + axes">
            <div className="identity-hub__results">
              <div className="identity-hub__results-section">
                <h4 className="identity-hub__results-title">Big Five</h4>
                <ul className="identity-hub__results-list">
                  {Object.entries(scores.traits).map(([key, value]) => (
                    <li key={key} className="identity-hub__results-item">
                      <span>{TRAIT_LABELS[key as keyof PersonalityScores['traits']]}</span>
                      <span>{value}%</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="identity-hub__results-section">
                <h4 className="identity-hub__results-title">Custom Axes</h4>
                <ul className="identity-hub__results-list">
                  {Object.entries(scores.axes)
                    .filter(([key]) => isMeasured(key))
                    .map(([key, value]) => (
                      <li key={key} className="identity-hub__results-item">
                        <span>{AXIS_LABELS[key as keyof PersonalityScores['axes']]}</span>
                        <span>{value}%</span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </CollapsibleSection>
          {archetypeHand && (
            <>
              <div className="identity-hub__section">
                <DeckSummary hand={archetypeHand} microTestCount={0} />
              </div>
              <div className="identity-hub__section">
                <ShadowQuestCard hand={archetypeHand} userId={activeUserId} />
              </div>
              <div className="identity-hub__section">
                <ShadowJourneyCard shadowCard={archetypeHand.shadow.card} records={history} />
              </div>
              {playersHandSparkResultEnabled ? (
                <div className="identity-hub__section">
                  {showSparkReveal ? (
                    <PlayersHandRevealCeremony hand={archetypeHand} onComplete={() => setShowSparkReveal(false)} />
                  ) : (
                    <PlayersHandSparkPreview hand={archetypeHand} title="Players Hand (SPARK style)" />
                  )}
                </div>
              ) : (
                <div className="identity-hub__section">
                  <PlayerDeck hand={archetypeHand} />
                </div>
              )}
              {playersHandSparkComparisonEnabled && (
                <div className="identity-hub__section">
                  <h4 className="identity-hub__results-title">DEV comparison: canonical deck + SPARK preview</h4>
                  <PlayerDeck hand={archetypeHand} />
                  <PlayersHandSparkPreview hand={archetypeHand} title="SPARK hand preview (DEV compare)" />
                </div>
              )}
            </>
          )}
          <CollapsibleSection title="Profile summary" className="identity-hub__narrative">
            {narrative.map((paragraph) => (
              <p key={paragraph} className="identity-hub__narrative-text">
                {paragraph}
              </p>
            ))}
          </CollapsibleSection>
          <div className="identity-hub__section identity-hub__ai-narrative">
            <div className="identity-hub__ai-header">
              <div>
                <h4 className="identity-hub__results-title">AI narrative (optional)</h4>
                <p className="identity-hub__card-text">
                  Turn on an AI-crafted reflection for extra context. This is opt-in and only runs
                  when AI is configured.
                </p>
              </div>
              <button
                className="identity-hub__secondary"
                type="button"
                onClick={() => setAiNarrativeEnabled((prev) => !prev)}
              >
                {aiNarrativeEnabled ? 'Hide AI narrative' : 'Enable AI narrative'}
              </button>
            </div>
            {aiNarrativeEnabled && (
              <div className="identity-hub__ai-body">
                {aiNarrativeStatus === 'loading' && (
                  <p className="identity-hub__ai-status">Generating your AI narrative…</p>
                )}
                {aiNarrativeStatus === 'unavailable' && (
                  <p className="identity-hub__ai-status identity-hub__ai-status--warning">
                    AI narrative is unavailable. Add an OpenAI API key to enable this feature.
                  </p>
                )}
                {aiNarrativeStatus === 'ready' && (
                  <div className="identity-hub__ai-copy">
                    {aiNarrative.map((paragraph) => (
                      <p key={paragraph} className="identity-hub__narrative-text">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <CollapsibleSection
            title="Your trait stats"
            meta={`${traitCards.length} traits`}
            className="identity-hub__trait-hand"
          >
            <p className="identity-hub__card-text">
              Each trait captures a strength and a growth edge. These stats are what power the
              archetype cards in your hand above.
            </p>
            <div className="identity-hub__trait-grid">
              {traitCards.map((card) => (
                <article
                  key={card.key}
                  className="identity-hub__trait-card"
                  style={{ '--trait-color': card.color } as CSSProperties}
                >
                  <div className="identity-hub__trait-header">
                    <div>
                      <p className="identity-hub__trait-title">{card.label}</p>
                      <span
                        className={`identity-hub__trait-band identity-hub__trait-band--${card.band}`}
                      >
                        {BAND_LABELS[card.band]} · {card.score}%
                      </span>
                    </div>
                    <span className="identity-hub__trait-icon" aria-hidden="true">
                      {card.icon}
                    </span>
                  </div>
                  <p className="identity-hub__trait-power">{card.powerLine}</p>
                  <div className="identity-hub__trait-block">
                    <span className="identity-hub__trait-label">Strength</span>
                    <p>{card.strengthLine}</p>
                  </div>
                  <div className="identity-hub__trait-block">
                    <span className="identity-hub__trait-label">Growth Edge</span>
                    <p>{card.growthEdgeLine}</p>
                  </div>
                  {card.microTip && (
                    <p className="identity-hub__trait-tip">Try: {card.microTip}</p>
                  )}
                </article>
              ))}
            </div>
          </CollapsibleSection>
          {handSummary && (
            <CollapsibleSection title="Playstyle summary" className="identity-hub__hand-summary">
              <p className="identity-hub__hand-headline">{handSummary.headline}</p>
              <div className="identity-hub__hand-columns">
                <div>
                  <p className="identity-hub__hand-label">Strengths</p>
                  <ul className="identity-hub__hand-list">
                    {handSummary.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="identity-hub__hand-label">Growth edges</p>
                  <ul className="identity-hub__hand-list">
                    {handSummary.tensions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="identity-hub__hand-next">
                <span className="identity-hub__hand-chip">Next move</span>
                <span>{handSummary.nextMove}</span>
              </div>
            </CollapsibleSection>
          )}
          <div className="identity-hub__section identity-hub__recommendations">
            <h4 className="identity-hub__results-title">Recommended next actions</h4>
            <ul className="identity-hub__recommendations-list">
              {recommendations.map((item) => (
                <li key={item.id} className="identity-hub__recommendations-item">
                  <span className="identity-hub__recommendations-icon">{item.icon}</span>
                  <div>
                    <p className="identity-hub__recommendations-label">{item.label}</p>
                    <p className="identity-hub__recommendations-text">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <CollapsibleSection
            title="Recent history"
            meta={history.length > 0 ? `${history.length}` : undefined}
            className="identity-hub__history"
          >
            {history.length === 0 ? (
              <p className="identity-hub__card-text">
                No saved sessions yet. Complete a test to see your snapshots here.
              </p>
            ) : (
              <ul className="identity-hub__history-list">
                {history.map((record) => (
                  <li key={record.id} className="identity-hub__history-item">
                    <div>
                      <p className="identity-hub__history-date">
                        {formatHistoryDate(record.taken_at)}
                      </p>
                      <p className="identity-hub__history-summary">
                        {buildTopTraitSummary(record.traits)}
                      </p>
                    </div>
                    {record._dirty ? (
                      <span className="identity-hub__history-status">Sync pending</span>
                    ) : (
                      <span className="identity-hub__history-status identity-hub__history-status--synced">
                        Saved
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleSection>
          <div className="identity-hub__actions">
            <button className="identity-hub__secondary" type="button" onClick={() => setStep('hub')}>
              ← Back to Identity
            </button>
            <button className="identity-hub__secondary" type="button" onClick={handleRetake}>
              Retake
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
