import { useState, useRef, useEffect, useMemo, FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AiSupportAssistant } from '../assistant';
import { createBalanceSnapshot, type BalanceAxisKey, type BalanceSnapshot } from '../../services/balanceScore';
import { fetchCheckinsForUser } from '../../services/checkins';
import { getAiCoachAccess } from '../../services/aiCoachAccess';
import { loadAiCoachInstructions } from '../../services/aiCoachInstructions';
import { getDemoCheckins, getDemoHabitLogsForRange, getDemoHabitsForUser } from '../../services/demoData';
import { isDemoSession } from '../../services/demoSession';
import { listHabitLogsForRangeMultiV2, listHabitsV2, type HabitLogV2Row, type HabitV2Row } from '../../services/habitsV2';
import { getScheduledCountForWindow } from '../habits/scheduleInterpreter';
import { classifyHabit } from '../habits/performanceClassifier';

export interface AiCoachProps {
  session: Session;
  onClose: () => void;
  starterQuestion?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface CoachingTopic {
  id: string;
  icon: string;
  title: string;
  description: string;
  prompt: string;
}

type CoachInterventionType = 'imbalance' | 'habit-struggle';

type CoachIntervention = {
  id: string;
  type: CoachInterventionType;
  title: string;
  description: string;
  options: string[];
};

type HabitAdherenceSnapshot = {
  habitId: string;
  habitTitle: string;
  window7: {
    scheduledCount: number;
    completedCount: number;
    percentage: number;
  };
  window30: {
    scheduledCount: number;
    completedCount: number;
    percentage: number;
  };
};

const COACHING_TOPICS: CoachingTopic[] = [
  {
    id: 'motivation',
    icon: '💪',
    title: 'Motivation Boost',
    description: 'Get inspired to tackle your goals',
    prompt: 'I need some motivation to stay on track with my goals.',
  },
  {
    id: 'goal-setting',
    icon: '🎯',
    title: 'Goal Setting',
    description: 'Refine and structure your goals',
    prompt: 'Help me set better goals and create an action plan.',
  },
  {
    id: 'progress-review',
    icon: '📊',
    title: 'Progress Review',
    description: 'Reflect on your journey so far',
    prompt: "Let's review my progress and identify areas for improvement.",
  },
  {
    id: 'mindfulness',
    icon: '🧘',
    title: 'Mindfulness',
    description: 'Find balance and reduce stress',
    prompt: 'I need help with mindfulness and stress management.',
  },
  {
    id: 'habit-building',
    icon: '📆',
    title: 'Habit Building',
    description: 'Create sustainable daily routines',
    prompt: 'How can I build better habits that stick?',
  },
  {
    id: 'overcome-obstacles',
    icon: '🚧',
    title: 'Overcome Obstacles',
    description: 'Navigate challenges and setbacks',
    prompt: "I'm facing challenges with my goals. Can you help me strategize?",
  },
];

const OVERCONFIDENCE_PATTERNS = [
  /\b100%\b/i,
  /\bno doubt\b/i,
  /\bguarantee(d)?\b/i,
  /\bcan(?:not|'t) be wrong\b/i,
  /\babsolutely certain\b/i,
  /\bfor sure\b/i,
];

const FIXATION_PATTERNS = [
  /\bat all costs\b/i,
  /\bno matter what\b/i,
  /\bonly way\b/i,
  /\bcan(?:not|'t) fail\b/i,
  /\bhas to\b/i,
];

const AXIS_REBALANCE_OPTIONS: Record<BalanceAxisKey, string[]> = {
  agency: [
    'Agency reset: pick one 10-minute action that moves a goal forward.',
    'Agency reset: block 15 minutes on the calendar for a single decisive task.',
  ],
  awareness: [
    'Awareness reset: do a 60-second breath pause, then name one feeling.',
    'Awareness reset: write one pattern you notice today, no judgment.',
  ],
  rationality: [
    'Rationality reset: answer “What might I be wrong about today?”',
    'Rationality reset: run a 30-second red team on your main plan.',
  ],
  vitality: [
    'Vitality reset: take a 10-minute walk or stretch.',
    'Vitality reset: add one joy token (music, sunlight, or a quick call).',
  ],
};

const INTERVENTION_LABELS: Record<CoachInterventionType, string> = {
  imbalance: 'Imbalance',
  'habit-struggle': 'Habit friction',
};

const normalizeDateOnly = (date: Date) => date.toISOString().split('T')[0];

const calculatePercentage = (completed: number, scheduled: number) => {
  if (scheduled <= 0) return 0;
  return Math.round((completed / scheduled) * 100);
};

const matchesPattern = (value: string, patterns: RegExp[]) =>
  patterns.some((pattern) => pattern.test(value));

const buildAdherenceSnapshots = async (
  userId: string,
  habits: HabitV2Row[],
  isDemo: boolean,
): Promise<HabitAdherenceSnapshot[]> => {
  if (habits.length === 0) return [];

  const today = new Date();
  const endDate = new Date(today);
  endDate.setHours(23, 59, 59, 999);

  const start7 = new Date(endDate);
  start7.setDate(start7.getDate() - 6);
  start7.setHours(0, 0, 0, 0);

  const start30 = new Date(endDate);
  start30.setDate(start30.getDate() - 29);
  start30.setHours(0, 0, 0, 0);

  const start7Iso = normalizeDateOnly(start7);
  const start30Iso = normalizeDateOnly(start30);
  const endIso = normalizeDateOnly(endDate);
  const habitIds = habits.map((habit) => habit.id);

  let logs: HabitLogV2Row[] = [];

  if (isDemo) {
    logs = getDemoHabitLogsForRange(habitIds, start30Iso, endIso) as HabitLogV2Row[];
  } else {
    const { data, error } = await listHabitLogsForRangeMultiV2({
      userId,
      habitIds,
      startDate: start30Iso,
      endDate: endIso,
    });
    if (error) {
      console.error('Error loading habit logs for coach interventions:', error);
      return habits.map((habit) => ({
        habitId: habit.id,
        habitTitle: habit.title,
        window7: { scheduledCount: 0, completedCount: 0, percentage: 0 },
        window30: { scheduledCount: 0, completedCount: 0, percentage: 0 },
      }));
    }
    logs = data ?? [];
  }

  const completedLogs = logs.filter((log) => log.done);

  return habits.map((habit) => {
    const habitLogs = completedLogs.filter((log) => log.habit_id === habit.id);
    const logs7 = habitLogs.filter((log) => log.date >= start7Iso);
    const scheduled7 = getScheduledCountForWindow(habit, 7, endDate);
    const scheduled30 = getScheduledCountForWindow(habit, 30, endDate);
    const completed7 = logs7.length;
    const completed30 = habitLogs.length;

    return {
      habitId: habit.id,
      habitTitle: habit.title,
      window7: {
        scheduledCount: scheduled7,
        completedCount: completed7,
        percentage: calculatePercentage(completed7, scheduled7),
      },
      window30: {
        scheduledCount: scheduled30,
        completedCount: completed30,
        percentage: calculatePercentage(completed30, scheduled30),
      },
    };
  });
};

const buildImbalanceIntervention = (
  snapshot: BalanceSnapshot,
): CoachIntervention | null => {
  if (snapshot.harmonyStatus === 'harmonized' && snapshot.spread < 2.5) {
    return null;
  }

  const ordered = [...snapshot.axes].sort((a, b) => b.score - a.score);
  const strongest = ordered[0];
  const weakest = ordered[ordered.length - 1];
  const options = AXIS_REBALANCE_OPTIONS[weakest.key] ?? [];

  return {
    id: `imbalance-${snapshot.referenceDate}`,
    type: 'imbalance',
    title: 'Balance intervention',
    description: `Quick check: your ${strongest.title} is strong, but ${weakest.title} is dropping. Do you want a tiny rebalance quest for today?`,
    options,
  };
};

const buildHabitStruggleIntervention = async (
  userId: string,
  habits: HabitV2Row[],
  isDemo: boolean,
): Promise<CoachIntervention | null> => {
  if (habits.length === 0) return null;

  const snapshots = await buildAdherenceSnapshots(userId, habits, isDemo);
  const sorted = [...snapshots].sort((a, b) => a.window7.percentage - b.window7.percentage);
  const candidate = sorted.find((snapshot) => snapshot.window7.scheduledCount >= 2);

  if (!candidate) return null;

  const classification = classifyHabit({
    adherence7: candidate.window7.percentage,
    adherence30: candidate.window30.percentage,
    currentStreak: 0,
  });

  if (classification.suggestedAction !== 'ease') return null;

  return {
    id: `habit-struggle-${candidate.habitId}`,
    type: 'habit-struggle',
    title: 'Habit ease-up',
    description: `This looks like friction, not failure. Want to downshift today’s tier for “${candidate.habitTitle}”? We can keep your Game of Life streaks intact.`,
    options: [
      `Seed (1 min): ${candidate.habitTitle}`,
      `Minimum (5 min): ${candidate.habitTitle}`,
      `Standard: keep ${candidate.habitTitle} as-is`,
    ],
  };
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'welcome-1',
    role: 'assistant',
    content: "Hi there. I’m your AI coach.",
    timestamp: new Date(),
  },
  {
    id: 'welcome-2',
    role: 'assistant',
    content:
      "I’m here to keep the Game of Life playable: small steps, balance, and clear next moves. What would you like to work on today?",
    timestamp: new Date(),
  },
];

export function AiCoach({ session, onClose, starterQuestion }: AiCoachProps) {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showTopics, setShowTopics] = useState(true);
  const [showStrategyAssistant, setShowStrategyAssistant] = useState(false);
  const [interventions, setInterventions] = useState<CoachIntervention[]>([]);
  const [interventionsLoading, setInterventionsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fullName = session.user?.user_metadata?.full_name;
  const userName = (typeof fullName === 'string' ? fullName.split(' ')[0] : null) || 'there';
  const dataAccess = useMemo(() => getAiCoachAccess(session), [session]);
  const demoMode = useMemo(() => isDemoSession(session), [session]);
  const instructionPayload = useMemo(
    () => loadAiCoachInstructions(dataAccess, demoMode),
    [dataAccess, demoMode],
  );

  const accessSummary = useMemo(() => {
    const allowed: string[] = [];
    const blocked: string[] = [];
    const entries = [
      { label: 'Goals', enabled: dataAccess.goals },
      { label: 'Habits', enabled: dataAccess.habits },
      { label: 'Journaling', enabled: dataAccess.journaling },
      { label: 'Reflections', enabled: dataAccess.reflections },
      { label: 'Vision board', enabled: dataAccess.visionBoard },
    ];

    entries.forEach((entry) => {
      if (entry.enabled) {
        allowed.push(entry.label);
      } else {
        blocked.push(entry.label);
      }
    });

    if (blocked.length === 0) {
      return 'All data sources enabled.';
    }

    return `Allowed: ${allowed.join(', ')}. Blocked: ${blocked.join(', ')}.`;
  }, [dataAccess]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let isMounted = true;

    const loadInterventions = async () => {
      setInterventionsLoading(true);
      const nextInterventions: CoachIntervention[] = [];

      if (dataAccess.reflections) {
        const checkins = demoMode
          ? getDemoCheckins(session.user.id, 6)
          : (await fetchCheckinsForUser(session.user.id, 6)).data ?? [];
        const snapshot = createBalanceSnapshot(checkins ?? []);
        if (snapshot) {
          const imbalance = buildImbalanceIntervention(snapshot);
          if (imbalance) {
            nextInterventions.push(imbalance);
          }
        }
      }

      if (dataAccess.habits) {
        const habits = demoMode
          ? (getDemoHabitsForUser(session.user.id) as HabitV2Row[])
          : (await listHabitsV2()).data ?? [];
        const habitIntervention = await buildHabitStruggleIntervention(session.user.id, habits, demoMode);
        if (habitIntervention) {
          nextInterventions.push(habitIntervention);
        }
      }

      if (isMounted) {
        setInterventions(nextInterventions);
        setInterventionsLoading(false);
      }
    };

    void loadInterventions();

    return () => {
      isMounted = false;
    };
  }, [dataAccess.habits, dataAccess.reflections, demoMode, session.user.id]);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const simulateAiResponse = async (userMessage: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simple response logic based on keywords
    const lowerMessage = userMessage.toLowerCase();
    const access = instructionPayload.dataAccess;

    const blockedResponse = (topic: string) =>
      `I don’t have access to your ${topic} data. If you want, share a quick summary and I’ll help you shape a next step.`;

    if (matchesPattern(lowerMessage, OVERCONFIDENCE_PATTERNS)) {
      return `You sound very certain. Want to run a 30-second red team on it? What’s one reason this might be incomplete, and how confident are you: 40%, 70%, 90%?`;
    }

    if (matchesPattern(lowerMessage, FIXATION_PATTERNS)) {
      return `When something becomes “must at all costs,” it can narrow the game. What’s a version of this goal that keeps options open?`;
    }

    if (lowerMessage.includes('motivat')) {
      return `Let’s keep it small and playable, ${userName}. Pick one action you can finish in 10 minutes today. Want two quick options or do you already have one in mind?`;
    }

    if (lowerMessage.includes('goal') || lowerMessage.includes('plan')) {
      if (!access.goals) {
        return blockedResponse('goal');
      }
      return `Let’s make the goal clear and playable. What’s the outcome, and what’s the smallest next move you can take this week?`;
    }

    if (lowerMessage.includes('habit')) {
      if (!access.habits) {
        return blockedResponse('habit');
      }
      return `This sounds like a habit tweak. Want to pick a tier for today: Seed (1 min), Minimum (5 min), or Standard?`;
    }

    if (lowerMessage.includes('stress') || lowerMessage.includes('anxiety') || lowerMessage.includes('overwhelm')) {
      return `Let’s slow the system down. Try a 60-second reset: inhale 4, hold 2, exhale 6, repeat x5. Want a tiny next action after that, or just a reflection question?`;
    }

    if (lowerMessage.includes('challenge') || lowerMessage.includes('difficult') || lowerMessage.includes('struggle')) {
      return `This looks like friction, not failure. What’s the smallest version of the task that still counts as a win today?`;
    }

    if (lowerMessage.includes('progress') || lowerMessage.includes('review')) {
      if (!access.goals && !access.habits) {
        return `Want a quick review? Share one win and one place you felt stuck this week, and we’ll rebalance from there.`;
      }
      return `Let’s do a short review. What’s one win, one drag, and one tiny rebalance you can do today?`;
    }

    // Default response
    if (lowerMessage.includes('journal') || lowerMessage.includes('journaling')) {
      if (!access.journaling) {
        return blockedResponse('journal');
      }
      return `If you want to work from a journal entry, tell me the headline takeaway and one emotion you want to understand.`;
    }

    if (lowerMessage.includes('reflection')) {
      if (!access.reflections) {
        return blockedResponse('reflection');
      }
      return `Let’s make the reflection actionable. What assumption might be wrong, and what would you update next time?`;
    }

    if (lowerMessage.includes('vision') || lowerMessage.includes('board')) {
      if (!access.visionBoard) {
        return blockedResponse('vision board');
      }
      return `Pick one vision board item that feels most alive right now. What tiny action would move it forward this week?`;
    }

    return `Got it, ${userName}. Want to keep this short or go deeper? I can offer two small options or ask one clarifying question.`;
  };

  const handleTopicClick = (topic: CoachingTopic) => {
    setShowTopics(false);
    handleSendMessage(topic.prompt);
  };

  const handleInterventionAction = (option: string) => {
    setShowTopics(false);
    handleSendMessage(option);
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputValue.trim();
    
    if (!textToSend) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const aiResponseText = await simulateAiResponse(textToSend);
      
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiResponseText,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      // TODO: Replace with centralized error reporting/logging service
      console.error('Error generating AI response:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleReset = () => {
    setMessages(INITIAL_MESSAGES);
    setShowTopics(true);
    setInputValue('');
    inputRef.current?.focus();
  };

  return (
    <div className="ai-coach-modal">
      <div
        className="ai-coach-modal__backdrop"
        onClick={onClose}
        role="presentation"
      />
      <div className="ai-coach-modal__container">
        <div className="ai-coach-modal__header">
          <div className="ai-coach-modal__header-content">
            <div className="ai-coach-modal__avatar">
              <div className="ai-coach-modal__robot">
                <span className="ai-coach-modal__robot-face">🤖</span>
                <div className="ai-coach-modal__robot-glow" />
              </div>
            </div>
            <div className="ai-coach-modal__header-text">
              <h2 className="ai-coach-modal__title">AI Life Coach</h2>
              <p className="ai-coach-modal__subtitle">Your personal guide to achieving your goals</p>
            </div>
          </div>
            <div className="ai-coach-modal__header-actions">
              <button
                type="button"
                className="ai-coach-modal__header-btn ai-coach-modal__reset-btn"
                onClick={handleReset}
                aria-label="Reset conversation"
                title="Start new conversation"
              >
                🔄
              </button>
              <button
                type="button"
                className="ai-coach-modal__header-btn ai-coach-modal__strategy-btn"
                onClick={() => setShowStrategyAssistant(true)}
                aria-label="Open AI Strategy Assistant"
                title="Open AI Strategy Assistant"
              >
                🧭
              </button>
              <button
                type="button"
                className="ai-coach-modal__close-btn"
                onClick={onClose}
                aria-label="Close AI Coach"
            >
              ×
            </button>
          </div>
        </div>

        <div className="ai-coach-modal__body">
          <div className="ai-coach-modal__messages">
            {interventions.length > 0 && (
              <section className="ai-coach-modal__interventions">
                <div className="ai-coach-modal__interventions-header">
                  <h3>Coach interventions</h3>
                  {interventionsLoading ? (
                    <span className="ai-coach-modal__interventions-status">Refreshing</span>
                  ) : null}
                </div>
                <div className="ai-coach-modal__interventions-grid">
                  {interventions.map((intervention) => (
                    <article key={intervention.id} className="ai-coach-modal__intervention-card">
                      <div className="ai-coach-modal__intervention-card-header">
                        <span className={`ai-coach-modal__intervention-tag ai-coach-modal__intervention-tag--${intervention.type}`}>
                          {INTERVENTION_LABELS[intervention.type]}
                        </span>
                        <h4>{intervention.title}</h4>
                      </div>
                      <p>{intervention.description}</p>
                      <div className="ai-coach-modal__intervention-actions">
                        {intervention.options.map((option) => (
                          <button
                            key={option}
                            type="button"
                            className="ai-coach-modal__intervention-button"
                            onClick={() => handleInterventionAction(option)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`ai-coach-modal__message ai-coach-modal__message--${message.role}`}
              >
                <div className="ai-coach-modal__message-content">
                  {message.content}
                </div>
                <div className="ai-coach-modal__message-time">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="ai-coach-modal__message ai-coach-modal__message--assistant">
                <div className="ai-coach-modal__message-content">
                  <div className="ai-coach-modal__typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            {showTopics && messages.length === INITIAL_MESSAGES.length && (
              <div className="ai-coach-modal__topics">
                <p className="ai-coach-modal__topics-title">Quick start with a topic:</p>
                <div className="ai-coach-modal__topics-grid">
                  {COACHING_TOPICS.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      className="ai-coach-modal__topic-card"
                      onClick={() => handleTopicClick(topic)}
                    >
                      <span className="ai-coach-modal__topic-icon" aria-hidden="true">
                        {topic.icon}
                      </span>
                      <span className="ai-coach-modal__topic-title">{topic.title}</span>
                      <span className="ai-coach-modal__topic-desc">{topic.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form className="ai-coach-modal__input-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="ai-coach-modal__input"
              placeholder={starterQuestion || 'Type your message here...'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isTyping}
            />
            <button
              type="submit"
              className="ai-coach-modal__send-btn"
              disabled={!inputValue.trim() || isTyping}
              aria-label="Send message"
            >
              <span aria-hidden="true">➤</span>
            </button>
          </form>
        </div>

        <div className="ai-coach-modal__footer">
          <p className="ai-coach-modal__disclaimer">
            💡 This is a simulated AI coach for demonstration purposes. Responses are generated based on common coaching principles.
          </p>
          <p className="ai-coach-modal__disclaimer">
            Privacy controls: {accessSummary} Update in Account → AI Settings.
          </p>
        </div>

        {showStrategyAssistant && (
          <div
            className="ai-coach-modal__strategy-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="AI Strategy Assistant"
          >
            <div
              className="ai-coach-modal__strategy-backdrop"
              onClick={() => setShowStrategyAssistant(false)}
              role="presentation"
            />
            <div className="ai-coach-modal__strategy-panel">
              <div className="ai-coach-modal__strategy-header">
                <div>
                  <p className="ai-coach-modal__strategy-eyebrow">AI Strategy Assistant</p>
                  <h3>Momentum resets, travel buffers, and forecasts</h3>
                </div>
                <button
                  type="button"
                  className="ai-coach-modal__strategy-close"
                  onClick={() => setShowStrategyAssistant(false)}
                  aria-label="Close AI Strategy Assistant"
                >
                  ×
                </button>
              </div>
              <div className="ai-coach-modal__strategy-body">
                <AiSupportAssistant session={session} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
