import React, {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AnswerValue,
  PERSONALITY_QUESTION_BANK,
  PersonalityQuestion,
} from './personalityTestData';
import { PersonalityScores, scorePersonality } from './personalityScoring';
import {
  buildTopTraitList,
  buildTopTraitSummary,
  TRAIT_LABELS,
} from './personalitySummary';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { createDemoSession } from '../../services/demoSession';
import { queuePersonalityTestResult, type PersonalityTestRecord } from '../../data/personalityTestRepo';
import {
  loadPersonalityTestHistoryWithSupabase,
  syncPersonalityTestsWithSupabase,
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

type TestStep = 'intro' | 'quiz' | 'results';

type AnswerOption = {
  value: AnswerValue;
  label: string;
};

const ANSWER_OPTIONS: AnswerOption[] = [
  { value: 1, label: 'Strongly disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly agree' },
];

const AXIS_LABELS: Record<keyof PersonalityScores['axes'], string> = {
  regulation_style: 'Regulation Style',
  stress_response: 'Stress Response',
  identity_sensitivity: 'Identity Sensitivity',
  cognitive_entry: 'Cognitive Entry',
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
      ? `Your hand leans ${headlineParts[0]} and ${headlineParts[1]}, shaping how you show up.`
      : 'Your hand highlights how you show up across your traits.';

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

const buildNarrative = (scores: PersonalityScores): string[] => {
  const traitEntries = Object.entries(scores.traits).sort((a, b) => b[1] - a[1]);
  const axisEntries = Object.entries(scores.axes).sort(
    (a, b) => Math.abs(b[1] - 50) - Math.abs(a[1] - 50),
  );

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
    ? `Your current hand highlights ${summary.strengths[0].toLowerCase()}`
    : 'Your hand highlights how your traits combine into practical strengths.';

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

const formatHistoryDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return HISTORY_DATE_FORMATTER.format(date);
};

export default function PersonalityTest() {
  const { session, mode } = useSupabaseAuth();
  const [step, setStep] = useState<TestStep>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const savedResultRef = useRef<string | null>(null);
  const [supabaseRecommendations, setSupabaseRecommendations] = useState<Recommendation[]>([]);
  const [history, setHistory] = useState<PersonalityTestRecord[]>([]);
  const [aiNarrativeEnabled, setAiNarrativeEnabled] = useState(false);
  const [aiNarrativeStatus, setAiNarrativeStatus] = useState<AiNarrativeStatus>('idle');
  const [aiNarrative, setAiNarrative] = useState<string[]>([]);

  const activeSession = useMemo(() => {
    if (session) {
      return session;
    }
    if (mode === 'demo') {
      return createDemoSession();
    }
    return null;
  }, [mode, session]);

  const activeUserId = activeSession?.user?.id ?? null;

  const currentQuestion: PersonalityQuestion | undefined =
    PERSONALITY_QUESTION_BANK[currentIndex];

  const scores = useMemo<PersonalityScores | null>(() => {
    if (step !== 'results') {
      return null;
    }

    return scorePersonality(answers);
  }, [answers, step]);

  const archetypeHand = useMemo<ArchetypeHand | null>(() => {
    if (!scores) {
      return null;
    }

    const archetypeScores = scoreArchetypes(scores, ARCHETYPE_DECK);
    const ranked = rankArchetypes(archetypeScores);
    return buildHand(ranked);
  }, [scores]);

  const narrative = useMemo(() => (scores ? buildNarrative(scores) : []), [scores]);
  const traitCards = useMemo(() => (scores ? buildTraitCards(scores) : []), [scores]);
  const topTraits = useMemo(
    () => (scores ? buildTopTraitList(scores.traits, 2) : []),
    [scores],
  );
  const latestRecord = history[0] ?? null;
  const handSummary = useMemo(
    () => (traitCards.length > 0 ? buildHandSummary(traitCards) : null),
    [traitCards],
  );

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
    setAnswers({});
    savedResultRef.current = null;
  };

  const handleSelect = (value: AnswerValue) => {
    if (!currentQuestion) {
      return;
    }

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handleNext = () => {
    if (!currentQuestion) {
      return;
    }

    if (!answers[currentQuestion.id]) {
      return;
    }

    if (currentIndex >= PERSONALITY_QUESTION_BANK.length - 1) {
      setStep('results');
      return;
    }

    setCurrentIndex((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentIndex === 0) {
      setStep('intro');
      return;
    }

    setCurrentIndex((prev) => prev - 1);
  };

  const handleRetake = () => {
    setStep('quiz');
    setCurrentIndex(0);
    setAnswers({});
    savedResultRef.current = null;
  };

  const handleViewLatest = () => {
    if (!latestRecord) {
      return;
    }

    const restoredAnswers = Object.fromEntries(
      Object.entries(latestRecord.answers ?? {}).map(([key, value]) => [
        key,
        Math.max(1, Math.min(5, Number(value))) as AnswerValue,
      ]),
    );
    setAnswers(restoredAnswers);
    savedResultRef.current = latestRecord.id;
    setStep('results');
  };

  useEffect(() => {
    if (step !== 'results' || !scores || !activeUserId) {
      return;
    }

    if (savedResultRef.current) {
      return;
    }

    queuePersonalityTestResult({
      userId: activeUserId,
      answers,
      scores,
      version: 'v1',
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
  }, [activeUserId, answers, scores, step]);

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

  return (
    <section className="identity-hub">
      <div className="identity-hub__header">
        <div>
          <h2 className="identity-hub__title">🪪 Personality Test</h2>
          <p className="identity-hub__subtitle">
            Get a quick snapshot of how you think, feel, and show up each day.
          </p>
        </div>
      </div>

      {step === 'intro' && (
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
            <span className="identity-hub__chip">⏱️ 4 minutes</span>
            <span className="identity-hub__chip">🧠 29 questions</span>
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

      {step === 'quiz' && currentQuestion && (
        <div className="identity-hub__card">
          <div className="identity-hub__progress">
            Question {currentIndex + 1} / {PERSONALITY_QUESTION_BANK.length}
          </div>
          <h3 className="identity-hub__card-title">{currentQuestion.text}</h3>
          <p className="identity-hub__card-text identity-hub__card-text--compact">
            Pick the response that feels most like you right now.
          </p>
          <div className="identity-hub__options">
            {ANSWER_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`identity-hub__option${
                  answers[currentQuestion.id] === option.value
                    ? ' identity-hub__option--selected'
                    : ''
                }`}
                type="button"
                onClick={() => handleSelect(option.value)}
              >
                <span className="identity-hub__option-value">{option.value}</span>
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
              {currentIndex === PERSONALITY_QUESTION_BANK.length - 1
                ? 'View results'
                : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {step === 'results' && scores && (
        <div className="identity-hub__card">
          <h3 className="identity-hub__card-title">Your snapshot results</h3>
          <p className="identity-hub__card-text identity-hub__card-text--compact">
            A quick snapshot of your traits and what to focus on next.
          </p>
          <div className="identity-hub__results-hero">
            <p className="identity-hub__results-kicker">Top traits</p>
            <div className="identity-hub__chip-row">
              {topTraits.length > 0 ? (
                topTraits.map((trait) => (
                  <span key={trait} className="identity-hub__chip identity-hub__chip--subtle">
                    {trait}
                  </span>
                ))
              ) : (
                <span className="identity-hub__chip identity-hub__chip--subtle">Trait snapshot</span>
              )}
            </div>
            <p className="identity-hub__results-summary">
              {topTraits.length > 0
                ? `Your strongest signals lean ${topTraits.join(' and ')} today.`
                : 'Your strongest signals feel balanced today.'}
            </p>
          </div>
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
                {Object.entries(scores.axes).map(([key, value]) => (
                  <li key={key} className="identity-hub__results-item">
                    <span>{AXIS_LABELS[key as keyof PersonalityScores['axes']]}</span>
                    <span>{value}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {archetypeHand && (
            <div className="identity-hub__section">
              <DeckSummary hand={archetypeHand} microTestCount={0} />
            </div>
          )}
          <div className="identity-hub__section identity-hub__narrative">
            <h4 className="identity-hub__results-title">Profile summary</h4>
            {narrative.map((paragraph) => (
              <p key={paragraph} className="identity-hub__narrative-text">
                {paragraph}
              </p>
            ))}
          </div>
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
          <div className="identity-hub__section identity-hub__trait-hand">
            <h4 className="identity-hub__results-title">Your trait cards</h4>
            <p className="identity-hub__card-text">
              Each card captures a strength and growth edge. Together they form your playstyle
              hand.
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
          </div>
          {handSummary && (
            <div className="identity-hub__section identity-hub__hand-summary">
              <h4 className="identity-hub__results-title">Your hand summary</h4>
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
            </div>
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
          <div className="identity-hub__section identity-hub__history">
            <h4 className="identity-hub__results-title">Recent history</h4>
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
          </div>
          <div className="identity-hub__actions">
            <button className="identity-hub__secondary" type="button" onClick={handleRetake}>
              Retake
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
