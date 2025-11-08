import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { fetchCheckinsForUser, insertCheckin, updateCheckin } from '../../services/checkins';
import type { Database } from '../../lib/database.types';

type CheckinRow = Database['public']['Tables']['checkins']['Row'];

type LifeWheelCheckinsProps = {
  session: Session;
};

const LIFE_WHEEL_CATEGORIES = [
  { key: 'spirituality_community', label: 'Spirituality & Community' },
  { key: 'finance_wealth', label: 'Finance & Wealth' },
  { key: 'love_relations', label: 'Love & Relations' },
  { key: 'fun_creativity', label: 'Fun & Creativity' },
  { key: 'career_development', label: 'Career & Self Development' },
  { key: 'health_fitness', label: 'Health & Fitness' },
  { key: 'family_friends', label: 'Family & Friends' },
  { key: 'living_spaces', label: 'Living Spaces' },
] as const;

type LifeWheelCategory = (typeof LIFE_WHEEL_CATEGORIES)[number];

type LifeWheelCategoryKey = LifeWheelCategory['key'];

type CheckinScores = Record<LifeWheelCategoryKey, number>;

type Question = {
  id: string;
  categoryKey: LifeWheelCategoryKey;
  text: string;
  imageNumber: number;
};

type QuestionAnswer = {
  questionId: string;
  score: number; // 1-3
  customNote: string;
};

const QUESTIONS: Question[] = [
  // Spirituality & Community
  { id: 'q1', categoryKey: 'spirituality_community', text: 'How connected do you feel to your spiritual or community practices?', imageNumber: 1 },
  { id: 'q2', categoryKey: 'spirituality_community', text: 'How often do you engage in activities that nurture your sense of purpose?', imageNumber: 2 },
  { id: 'q3', categoryKey: 'spirituality_community', text: 'How supported do you feel by your community or spiritual circle?', imageNumber: 3 },
  // Finance & Wealth
  { id: 'q4', categoryKey: 'finance_wealth', text: 'How satisfied are you with your current financial situation?', imageNumber: 4 },
  { id: 'q5', categoryKey: 'finance_wealth', text: 'How well are you managing your savings and investments?', imageNumber: 5 },
  { id: 'q6', categoryKey: 'finance_wealth', text: 'How confident do you feel about your financial future?', imageNumber: 6 },
  // Love & Relations
  { id: 'q7', categoryKey: 'love_relations', text: 'How fulfilling is your romantic relationship or dating life?', imageNumber: 7 },
  { id: 'q8', categoryKey: 'love_relations', text: 'How well do you communicate with your romantic partner?', imageNumber: 8 },
  { id: 'q9', categoryKey: 'love_relations', text: 'How much quality time do you spend with your loved one?', imageNumber: 9 },
  // Fun & Creativity
  { id: 'q10', categoryKey: 'fun_creativity', text: 'How much time do you dedicate to hobbies and creative pursuits?', imageNumber: 10 },
  { id: 'q11', categoryKey: 'fun_creativity', text: 'How often do you engage in activities that bring you joy?', imageNumber: 11 },
  { id: 'q12', categoryKey: 'fun_creativity', text: 'How satisfied are you with your work-life balance for fun activities?', imageNumber: 12 },
  // Career & Self Development
  { id: 'q13', categoryKey: 'career_development', text: 'How satisfied are you with your career progress?', imageNumber: 13 },
  { id: 'q14', categoryKey: 'career_development', text: 'How much are you learning and growing in your professional life?', imageNumber: 14 },
  { id: 'q15', categoryKey: 'career_development', text: 'How aligned is your work with your personal goals?', imageNumber: 15 },
  // Health & Fitness
  { id: 'q16', categoryKey: 'health_fitness', text: 'How would you rate your overall physical health?', imageNumber: 16 },
  { id: 'q17', categoryKey: 'health_fitness', text: 'How consistent are you with exercise and movement?', imageNumber: 17 },
  { id: 'q18', categoryKey: 'health_fitness', text: 'How well are you taking care of your nutrition and sleep?', imageNumber: 18 },
  // Family & Friends
  { id: 'q19', categoryKey: 'family_friends', text: 'How strong is your connection with family members?', imageNumber: 19 },
  { id: 'q20', categoryKey: 'family_friends', text: 'How often do you spend quality time with friends?', imageNumber: 20 },
  { id: 'q21', categoryKey: 'family_friends', text: 'How supported do you feel by your family and friends?', imageNumber: 21 },
  // Living Spaces
  { id: 'q22', categoryKey: 'living_spaces', text: 'How comfortable and organized is your living environment?', imageNumber: 22 },
  { id: 'q23', categoryKey: 'living_spaces', text: 'How much does your home reflect your personality and values?', imageNumber: 23 },
  { id: 'q24', categoryKey: 'living_spaces', text: 'How satisfied are you with your current living situation?', imageNumber: 24 },
];

type RadarGeometry = {
  polygonPoints: string;
  levelPolygons: { ratio: number; points: string }[];
  axes: { key: string; x1: number; y1: number; x2: number; y2: number }[];
  labels: {
    key: string;
    text: string;
    x: number;
    y: number;
    anchor: 'start' | 'middle' | 'end';
    baseline: 'middle' | 'text-after-edge' | 'text-before-edge';
  }[];
};

const MAX_SCORE = 10;
const RADAR_SIZE = 320;
const RADAR_LEVELS = 5;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function createDefaultScores(): CheckinScores {
  return LIFE_WHEEL_CATEGORIES.reduce<CheckinScores>((acc, category) => {
    acc[category.key] = 5;
    return acc;
  }, {} as CheckinScores);
}

function parseCheckinScores(scores: CheckinRow['scores']): CheckinScores {
  const fallback = createDefaultScores();
  if (scores && typeof scores === 'object' && !Array.isArray(scores)) {
    const record = scores as Record<string, unknown>;
    for (const category of LIFE_WHEEL_CATEGORIES) {
      const value = record[category.key];
      fallback[category.key] = typeof value === 'number' ? clampScore(value) : 0;
    }
  }
  return fallback;
}

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(MAX_SCORE, Math.max(0, Math.round(value)));
}

function calculateAverage(scores: CheckinScores): number {
  const total = LIFE_WHEEL_CATEGORIES.reduce((sum, category) => sum + (scores[category.key] ?? 0), 0);
  return Number((total / LIFE_WHEEL_CATEGORIES.length).toFixed(1));
}

type TrendDelta = {
  key: LifeWheelCategoryKey;
  label: string;
  delta: number;
  latest: number;
  previous: number;
};

type TrendInsights = {
  previousLabel: string;
  latestAverage: number;
  previousAverage: number;
  averageDelta: number;
  averageDirection: 'up' | 'down' | 'steady';
  improvements: TrendDelta[];
  declines: TrendDelta[];
  stableCount: number;
};

function createTrendInsights(checkins: CheckinRow[]): TrendInsights | null {
  if (checkins.length < 2) {
    return null;
  }

  const [latest, previous] = checkins;
  const latestScores = parseCheckinScores(latest.scores);
  const previousScores = parseCheckinScores(previous.scores);

  const deltas = LIFE_WHEEL_CATEGORIES.map<TrendDelta>((category) => {
    const latestValue = clampScore(latestScores[category.key] ?? 0);
    const previousValue = clampScore(previousScores[category.key] ?? 0);
    return {
      key: category.key,
      label: category.label,
      delta: latestValue - previousValue,
      latest: latestValue,
      previous: previousValue,
    };
  });

  const improvements = deltas
    .filter((item) => item.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);

  const declines = deltas
    .filter((item) => item.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 3);

  const stableCount = deltas.filter((item) => item.delta === 0).length;

  const latestAverage = calculateAverage(latestScores);
  const previousAverage = calculateAverage(previousScores);
  const rawAverageDelta = Number((latestAverage - previousAverage).toFixed(1));
  const averageDelta = Math.abs(rawAverageDelta) < 0.05 ? 0 : rawAverageDelta;
  const averageDirection = averageDelta > 0 ? 'up' : averageDelta < 0 ? 'down' : 'steady';

  return {
    previousLabel: dateFormatter.format(new Date(previous.date)),
    latestAverage,
    previousAverage,
    averageDelta,
    averageDirection,
    improvements,
    declines,
    stableCount,
  };
}

function formatSignedInteger(value: number): string {
  if (value === 0) return '0';
  return `${value > 0 ? '+' : '−'}${Math.abs(value)}`;
}

function formatSignedDecimal(value: number, fractionDigits = 1): string {
  if (Math.abs(value) < 0.05) return '0';
  const rounded = Math.abs(value).toFixed(fractionDigits);
  return `${value > 0 ? '+' : '−'}${rounded}`;
}

function scaleQuestionScoreToWheel(questionScore: number): number {
  // Scale from 1-3 (question score) to 0-10 (wheel score)
  // 1 (Not Well) -> 0, 2 (Okay) -> 5, 3 (Excellent) -> 10
  return Math.round((questionScore - 1) * 5);
}

function buildRadarGeometry(scores: CheckinScores): RadarGeometry {
  const center = RADAR_SIZE / 2;
  const radius = center - 36;

  const pointFor = (ratio: number, index: number) => {
    const angle = (Math.PI * 2 * index) / LIFE_WHEEL_CATEGORIES.length - Math.PI / 2;
    const x = center + Math.cos(angle) * radius * ratio;
    const y = center + Math.sin(angle) * radius * ratio;
    return { x, y };
  };

  const polygonPoints = LIFE_WHEEL_CATEGORIES.map((category, index) => {
    const score = clampScore(scores[category.key] ?? 0);
    const ratio = score / MAX_SCORE;
    const { x, y } = pointFor(ratio, index);
    return `${x},${y}`;
  }).join(' ');

  const levelPolygons = Array.from({ length: RADAR_LEVELS }, (_, levelIndex) => {
    const ratio = (levelIndex + 1) / RADAR_LEVELS;
    const points = LIFE_WHEEL_CATEGORIES.map((_, index) => {
      const { x, y } = pointFor(ratio, index);
      return `${x},${y}`;
    }).join(' ');
    return { ratio, points };
  });

  const axes = LIFE_WHEEL_CATEGORIES.map((category, index) => {
    const { x, y } = pointFor(1, index);
    return { key: category.key, x1: center, y1: center, x2: x, y2: y };
  });

  const labels = LIFE_WHEEL_CATEGORIES.map((category, index) => {
    const labelRadius = radius + 20;
    const angle = (Math.PI * 2 * index) / LIFE_WHEEL_CATEGORIES.length - Math.PI / 2;
    const x = center + Math.cos(angle) * labelRadius;
    const y = center + Math.sin(angle) * labelRadius;

    let anchor: 'start' | 'middle' | 'end';
    if (Math.abs(Math.cos(angle)) < 0.2) {
      anchor = 'middle';
    } else if (Math.cos(angle) > 0) {
      anchor = 'start';
    } else {
      anchor = 'end';
    }

    let baseline: 'middle' | 'text-after-edge' | 'text-before-edge';
    if (Math.sin(angle) > 0.2) {
      baseline = 'text-before-edge';
    } else if (Math.sin(angle) < -0.2) {
      baseline = 'text-after-edge';
    } else {
      baseline = 'middle';
    }

    return { key: category.key, text: category.label, x, y, anchor, baseline };
  });

  return { polygonPoints, levelPolygons, axes, labels };
}

export function LifeWheelCheckins({ session }: LifeWheelCheckinsProps) {
  const { isConfigured, mode, isAuthenticated } = useSupabaseAuth();
  const isDemoExperience = mode === 'demo' || !isAuthenticated;
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(() => formatISODate(new Date()));
  const [formScores, setFormScores] = useState<CheckinScores>(() => createDefaultScores());
  const [selectedCheckinId, setSelectedCheckinId] = useState<string | null>(null);
  
  // Questionnaire state
  const [isInQuestionnaireMode, setIsInQuestionnaireMode] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, QuestionAnswer>>(new Map());
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [customNote, setCustomNote] = useState('');

  const loadCheckins = useCallback(async () => {
    if (!isConfigured && !isDemoExperience) {
      setCheckins([]);
      setSelectedCheckinId(null);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await fetchCheckinsForUser(session.user.id);
      if (error) throw error;
      const records = data ?? [];
      setCheckins(records);
      if (records.length > 0) {
        setSelectedCheckinId((current) => current ?? records[0].id);
      } else {
        setSelectedCheckinId(null);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load check-in history right now. Please try again soon.',
      );
    } finally {
      setLoading(false);
    }
  }, [isConfigured, isDemoExperience, session.user.id]);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }
    void loadCheckins();
  }, [session?.user?.id, isConfigured, isDemoExperience, loadCheckins]);

  useEffect(() => {
    if (!isConfigured && !isDemoExperience) {
      setCheckins([]);
      setSelectedCheckinId(null);
    }
  }, [isConfigured, isDemoExperience]);

  useEffect(() => {
    if (checkins.length === 0) {
      setFormScores(createDefaultScores());
      return;
    }
    const latest = checkins[0];
    setFormScores(parseCheckinScores(latest.scores));
  }, [checkins]);

  const selectedCheckin = useMemo(() => {
    if (!selectedCheckinId) {
      return checkins[0] ?? null;
    }
    return checkins.find((item) => item.id === selectedCheckinId) ?? null;
  }, [selectedCheckinId, checkins]);

  const selectedScores = useMemo(() => {
    return selectedCheckin ? parseCheckinScores(selectedCheckin.scores) : null;
  }, [selectedCheckin]);

  const radarGeometry = useMemo(() => {
    return selectedScores ? buildRadarGeometry(selectedScores) : null;
  }, [selectedScores]);

  const averageScore = useMemo(() => {
    return selectedScores ? calculateAverage(selectedScores) : 0;
  }, [selectedScores]);

  const trendInsights = useMemo(() => createTrendInsights(checkins), [checkins]);

  const handleScoreChange = (categoryKey: LifeWheelCategoryKey) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = clampScore(Number(event.target.value));
      setFormScores((current) => ({ ...current, [categoryKey]: value }));
    };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!session) {
      setErrorMessage('Sign in to record your life wheel check-ins.');
      return;
    }

    if (!isConfigured && !isDemoExperience) {
      setErrorMessage('Supabase credentials are missing. Update your environment variables to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const existing = checkins.find((item) => item.date === formDate);
      if (existing) {
        const { data, error } = await updateCheckin(existing.id, {
          date: formDate,
          scores: formScores,
        });
        if (error) throw error;
        if (data) {
          setCheckins((current) => {
            const mapped = current.map((item) => (item.id === data.id ? data : item));
            return mapped.sort((a, b) => b.date.localeCompare(a.date));
          });
          setSelectedCheckinId(data.id);
        }
        setSuccessMessage('Check-in updated. Your radar view is refreshed.');
      } else {
        const { data, error } = await insertCheckin({
          user_id: session.user.id,
          date: formDate,
          scores: formScores,
        });
        if (error) throw error;
        if (data) {
          setCheckins((current) => {
            const next = [data, ...current];
            return next.sort((a, b) => b.date.localeCompare(a.date));
          });
          setSelectedCheckinId(data.id);
        }
        setSuccessMessage('Check-in saved! Revisit the history to spot your trends.');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save your check-in right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseLatestScores = () => {
    if (checkins.length === 0) {
      setFormScores(createDefaultScores());
      return;
    }
    setFormScores(parseCheckinScores(checkins[0].scores));
  };

  const startQuestionnaire = () => {
    setIsInQuestionnaireMode(true);
    setCurrentQuestionIndex(0);
    setAnswers(new Map());
    setSelectedOption(null);
    setCustomNote('');
    setFormScores(createDefaultScores());
  };

  const handleAnswerSubmit = () => {
    if (selectedOption === null) return;
    
    const currentQuestion = QUESTIONS[currentQuestionIndex];
    const answer: QuestionAnswer = {
      questionId: currentQuestion.id,
      score: selectedOption,
      customNote: customNote.trim(),
    };
    
    const newAnswers = new Map(answers);
    newAnswers.set(currentQuestion.id, answer);
    setAnswers(newAnswers);
    
    // Update scores for the radar chart
    const categoryAnswers = QUESTIONS
      .filter(q => q.categoryKey === currentQuestion.categoryKey)
      .map(q => newAnswers.get(q.id)?.score || 0)
      .filter(score => score > 0);
    
    if (categoryAnswers.length > 0) {
      const avgScore = categoryAnswers.reduce((sum, s) => sum + s, 0) / categoryAnswers.length;
      const scaledScore = scaleQuestionScoreToWheel(avgScore);
      setFormScores(current => ({
        ...current,
        [currentQuestion.categoryKey]: scaledScore,
      }));
    }
    
    // Move to next question or finish
    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
      setCustomNote('');
    } else {
      // Questionnaire complete, save the check-in
      saveQuestionnaireResults(newAnswers);
    }
  };

  const saveQuestionnaireResults = async (finalAnswers: Map<string, QuestionAnswer>) => {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const finalScores = createDefaultScores();
      
      // Calculate final scores for each category
      LIFE_WHEEL_CATEGORIES.forEach(category => {
        const categoryQuestions = QUESTIONS.filter(q => q.categoryKey === category.key);
        const categoryAnswers = categoryQuestions
          .map(q => finalAnswers.get(q.id)?.score || 0)
          .filter(score => score > 0);
        
        if (categoryAnswers.length > 0) {
          const avgScore = categoryAnswers.reduce((sum, s) => sum + s, 0) / categoryAnswers.length;
          finalScores[category.key] = scaleQuestionScoreToWheel(avgScore);
        }
      });

      const { data, error } = await insertCheckin({
        user_id: session.user.id,
        date: formDate,
        scores: finalScores,
      });
      
      if (error) throw error;
      
      if (data) {
        setCheckins(current => {
          const next = [data, ...current];
          return next.sort((a, b) => b.date.localeCompare(a.date));
        });
        setSelectedCheckinId(data.id);
      }
      
      setSuccessMessage('Wellbeing check-in completed! Your life wheel has been updated.');
      setIsInQuestionnaireMode(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save your check-in.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate current progress scores for the radar chart
  const currentProgressScores = useMemo(() => {
    if (!isInQuestionnaireMode) return null;
    
    const progressScores = createDefaultScores();
    LIFE_WHEEL_CATEGORIES.forEach(category => {
      const categoryQuestions = QUESTIONS.filter(q => q.categoryKey === category.key);
      const categoryAnswers = categoryQuestions
        .map(q => answers.get(q.id)?.score || 0)
        .filter(score => score > 0);
      
      if (categoryAnswers.length > 0) {
        const avgScore = categoryAnswers.reduce((sum, s) => sum + s, 0) / categoryAnswers.length;
        progressScores[category.key] = scaleQuestionScoreToWheel(avgScore);
      }
    });
    
    return progressScores;
  }, [isInQuestionnaireMode, answers]);

  const progressRadarGeometry = useMemo(() => {
    return currentProgressScores ? buildRadarGeometry(currentProgressScores) : null;
  }, [currentProgressScores]);

  // Render questionnaire mode
  if (isInQuestionnaireMode) {
    const currentQuestion = QUESTIONS[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / QUESTIONS.length) * 100;
    
    return (
      <section className="life-wheel life-wheel--questionnaire">
        <div className="questionnaire-container">
          <div className="questionnaire-progress">
            <div className="questionnaire-progress__bar" style={{ width: `${progress}%` }} />
            <span className="questionnaire-progress__text">
              Question {currentQuestionIndex + 1} of {QUESTIONS.length}
            </span>
          </div>

          <div className="questionnaire-content" key={currentQuestion.id}>
            <div className="questionnaire-image">
              {currentQuestion.imageNumber}
            </div>
            
            <h3 className="questionnaire-question">{currentQuestion.text}</h3>
            
            <div className="questionnaire-options">
              <button
                type="button"
                className={`questionnaire-option ${selectedOption === 1 ? 'questionnaire-option--selected' : ''}`}
                onClick={() => setSelectedOption(1)}
              >
                <span className="questionnaire-option__label">Not Well</span>
                <span className="questionnaire-option__score">1</span>
              </button>
              <button
                type="button"
                className={`questionnaire-option ${selectedOption === 2 ? 'questionnaire-option--selected' : ''}`}
                onClick={() => setSelectedOption(2)}
              >
                <span className="questionnaire-option__label">Okay</span>
                <span className="questionnaire-option__score">2</span>
              </button>
              <button
                type="button"
                className={`questionnaire-option ${selectedOption === 3 ? 'questionnaire-option--selected' : ''}`}
                onClick={() => setSelectedOption(3)}
              >
                <span className="questionnaire-option__label">Excellent</span>
                <span className="questionnaire-option__score">3</span>
              </button>
            </div>

            <div className="questionnaire-note">
              <label htmlFor="custom-note">Add your thoughts (optional)</label>
              <textarea
                id="custom-note"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Share any additional insights about this area of your life..."
                rows={3}
              />
            </div>

            <button
              type="button"
              className="questionnaire-submit"
              onClick={handleAnswerSubmit}
              disabled={selectedOption === null || submitting}
            >
              {submitting ? 'Saving...' : currentQuestionIndex === QUESTIONS.length - 1 ? 'Complete Check-in' : 'Next Question'}
            </button>
          </div>

          <div className="questionnaire-wheel">
            <h4>Your Life Wheel</h4>
            {progressRadarGeometry ? (
              <svg
                className="life-wheel__radar"
                viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
                role="img"
                aria-label="Your life wheel progress"
              >
                <g className="life-wheel__radar-grid">
                  {progressRadarGeometry.levelPolygons.map((level) => (
                    <polygon key={level.ratio} points={level.points} />
                  ))}
                </g>
                <g className="life-wheel__radar-axes">
                  {progressRadarGeometry.axes.map((axis) => (
                    <line key={axis.key} x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} />
                  ))}
                </g>
                <polygon className="life-wheel__radar-shape" points={progressRadarGeometry.polygonPoints} />
                <g className="life-wheel__radar-labels">
                  {progressRadarGeometry.labels.map((label) => (
                    <text
                      key={label.key}
                      x={label.x}
                      y={label.y}
                      textAnchor={label.anchor}
                      dominantBaseline={label.baseline}
                    >
                      {label.text}
                    </text>
                  ))}
                </g>
              </svg>
            ) : (
              <div className="life-wheel__empty">
                <p>Your wheel will appear as you answer questions</p>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="life-wheel">
      <header className="life-wheel__header">
        <div>
          <h2>Wellbeing Wheel Check-in</h2>
          <p>
            Take a calming questionnaire to reflect on your wellbeing across 8 life categories.
          </p>
        </div>
        <button
          type="button"
          className="life-wheel__refresh"
          onClick={() => void loadCheckins()}
          disabled={loading || (!isConfigured && !isDemoExperience)}
        >
          {loading ? 'Refreshing…' : 'Refresh history'}
        </button>
      </header>

      {isDemoExperience ? (
        <p className="life-wheel__status life-wheel__status--info">
          Life wheel entries are stored locally in demo mode. Connect Supabase when you&apos;re ready to sync check-ins across
          devices.
        </p>
      ) : !isConfigured ? (
        <p className="life-wheel__status life-wheel__status--warning">
          Add your Supabase credentials so we can sync your check-ins across devices. Until then your entries stay local.
        </p>
      ) : null}

      {errorMessage && <p className="life-wheel__status life-wheel__status--error">{errorMessage}</p>}
      {successMessage && <p className="life-wheel__status life-wheel__status--success">{successMessage}</p>}

      <div className="life-wheel__start-section">
        <button
          type="button"
          className="life-wheel__start-questionnaire"
          onClick={startQuestionnaire}
          disabled={!isConfigured && !isDemoExperience}
        >
          Start New Wellbeing Check-in
        </button>
      </div>

      <div className="life-wheel__grid">
        <div className="life-wheel__panel life-wheel__panel--chart">
          {selectedCheckin && radarGeometry ? (
            <>
              <svg
                className="life-wheel__radar"
                viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
                role="img"
                aria-label={`Life wheel radar chart for ${dateFormatter.format(new Date(selectedCheckin.date))}`}
              >
                <g className="life-wheel__radar-grid">
                  {radarGeometry.levelPolygons.map((level) => (
                    <polygon key={level.ratio} points={level.points} />
                  ))}
                </g>
                <g className="life-wheel__radar-axes">
                  {radarGeometry.axes.map((axis) => (
                    <line key={axis.key} x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} />
                  ))}
                </g>
                <polygon className="life-wheel__radar-shape" points={radarGeometry.polygonPoints} />
                <g className="life-wheel__radar-labels">
                  {radarGeometry.labels.map((label) => (
                    <text
                      key={label.key}
                      x={label.x}
                      y={label.y}
                      textAnchor={label.anchor}
                      dominantBaseline={label.baseline}
                    >
                      {label.text}
                    </text>
                  ))}
                </g>
              </svg>
              <div className="life-wheel__snapshot">
                <h3>{dateFormatter.format(new Date(selectedCheckin.date))}</h3>
                <p>
                  Average score: <strong>{averageScore}</strong>/10. Track improvements by logging a new check-in whenever
                  your priorities shift.
                </p>
              </div>
            </>
          ) : (
            <div className="life-wheel__empty">
              <p>Log your first check-in to unlock the radar chart and trend history.</p>
            </div>
          )}

          <div className="life-wheel__history">
            <h3>Recent check-ins</h3>
            {checkins.length === 0 ? (
              <p>No check-ins yet. Share how each area feels to begin your streak.</p>
            ) : (
              <ul>
                {checkins.map((checkin) => {
                  const isActive = selectedCheckin ? checkin.id === selectedCheckin.id : false;
                  const scores = parseCheckinScores(checkin.scores);
                  const average = calculateAverage(scores);
                  return (
                    <li key={checkin.id}>
                      <button
                        type="button"
                        className={`life-wheel__history-item ${isActive ? 'life-wheel__history-item--active' : ''}`}
                        onClick={() => setSelectedCheckinId(checkin.id)}
                      >
                        <span>{dateFormatter.format(new Date(checkin.date))}</span>
                        <span>{average}/10 avg</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="life-wheel__insights">
            <div className="life-wheel__insights-header">
              <h3>Trend insights</h3>
              <p>
                {trendInsights
                  ? trendInsights.averageDirection === 'steady'
                    ? `Overall balance held steady compared to ${trendInsights.previousLabel}.`
                    : `Overall balance ${
                        trendInsights.averageDirection === 'up' ? 'improved' : 'dipped'
                      } by ${formatSignedDecimal(trendInsights.averageDelta)} points compared to ${
                        trendInsights.previousLabel
                      }.`
                  : 'Log at least two check-ins to unlock week-over-week highlights.'}
              </p>
            </div>

            {trendInsights ? (
              <>
                <p className="life-wheel__insights-meta">
                  Latest average <strong>{trendInsights.latestAverage.toFixed(1)}</strong>/10 • Previous{' '}
                  <strong>{trendInsights.previousAverage.toFixed(1)}</strong>/10
                </p>
                <div className="life-wheel__insight-cards">
                  <section className="life-wheel__insight-card life-wheel__insight-card--lift">
                    <h4>Where you gained momentum</h4>
                    {trendInsights.improvements.length > 0 ? (
                      <ul className="life-wheel__insight-list">
                        {trendInsights.improvements.map((item) => (
                          <li key={item.key}>
                            <span className="life-wheel__insight-label">{item.label}</span>
                            <span className="life-wheel__insight-delta life-wheel__insight-delta--positive">
                              {formatSignedInteger(item.delta)}
                            </span>
                            <span className="life-wheel__insight-score">Now {item.latest}/10</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="life-wheel__insight-empty">No gains yet—celebrate a win with your next check-in.</p>
                    )}
                  </section>

                  <section className="life-wheel__insight-card life-wheel__insight-card--dip">
                    <h4>Where to focus next</h4>
                    {trendInsights.declines.length > 0 ? (
                      <ul className="life-wheel__insight-list">
                        {trendInsights.declines.map((item) => (
                          <li key={item.key}>
                            <span className="life-wheel__insight-label">{item.label}</span>
                            <span className="life-wheel__insight-delta life-wheel__insight-delta--negative">
                              {formatSignedInteger(item.delta)}
                            </span>
                            <span className="life-wheel__insight-score">Now {item.latest}/10</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="life-wheel__insight-empty">No dips detected—keep nurturing these areas.</p>
                    )}
                  </section>
                </div>
                {trendInsights.stableCount > 0 ? (
                  <p className="life-wheel__insights-stable">
                    {trendInsights.stableCount} {trendInsights.stableCount === 1 ? 'area' : 'areas'} held steady. Consistency
                    counts.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div className="life-wheel__panel life-wheel__panel--form">
          <form className="life-wheel__form" onSubmit={handleFormSubmit}>
            <div className="life-wheel__field">
              <label htmlFor="life-wheel-date">Check-in date</label>
              <input
                id="life-wheel-date"
                type="date"
                value={formDate}
                max={formatISODate(new Date())}
                onChange={(event) => setFormDate(event.target.value)}
                required
              />
            </div>

            <div className="life-wheel__field-group">
              {LIFE_WHEEL_CATEGORIES.map((category) => (
                <div className="life-wheel__field" key={category.key}>
                  <label htmlFor={`life-wheel-${category.key}`}>{category.label}</label>
                  <div className="life-wheel__slider">
                    <input
                      id={`life-wheel-${category.key}`}
                      type="range"
                      min={0}
                      max={MAX_SCORE}
                      step={1}
                      value={formScores[category.key] ?? 0}
                      onChange={handleScoreChange(category.key)}
                    />
                    <span>{formScores[category.key] ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="life-wheel__actions">
              <button type="button" className="life-wheel__secondary" onClick={handleUseLatestScores}>
                Use latest scores
              </button>
              <button type="submit" className="life-wheel__primary" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save check-in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
