import { useState, useRef, useEffect, useMemo, FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AiSupportAssistant } from '../assistant';
import { getAiCoachAccess } from '../../services/aiCoachAccess';
import { loadAiCoachInstructions } from '../../services/aiCoachInstructions';
import { isDemoSession } from '../../services/demoSession';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fullName = session.user?.user_metadata?.full_name;
  const userName = (typeof fullName === 'string' ? fullName.split(' ')[0] : null) || 'there';
  const dataAccess = useMemo(() => getAiCoachAccess(session), [session]);
  const instructionPayload = useMemo(
    () => loadAiCoachInstructions(dataAccess, isDemoSession(session)),
    [dataAccess, session],
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
