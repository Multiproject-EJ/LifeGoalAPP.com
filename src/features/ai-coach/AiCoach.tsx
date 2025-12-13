import { useState, useRef, useEffect, FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AiSupportAssistant } from '../assistant';

export interface AiCoachProps {
  session: Session;
  onClose: () => void;
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
    content: "Hi there! 👋 I'm your AI Life Coach.",
    timestamp: new Date(),
  },
  {
    id: 'welcome-2',
    role: 'assistant',
    content: "I'm here to help you with motivation, goal setting, habit building, and navigating life's challenges. What would you like to work on today?",
    timestamp: new Date(),
  },
];

export function AiCoach({ session, onClose }: AiCoachProps) {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showTopics, setShowTopics] = useState(true);
  const [showStrategyAssistant, setShowStrategyAssistant] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fullName = session.user?.user_metadata?.full_name;
  const userName = (typeof fullName === 'string' ? fullName.split(' ')[0] : null) || 'there';

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

    if (lowerMessage.includes('motivat')) {
      return `Great to hear you're seeking motivation, ${userName}! Remember, every small step forward is progress. Your goals are within reach, and I believe in your ability to achieve them. What specific goal are you working on right now?`;
    }

    if (lowerMessage.includes('goal') || lowerMessage.includes('plan')) {
      return `Setting effective goals is crucial for success! I recommend using the SMART framework: Specific, Measurable, Achievable, Relevant, and Time-bound. Would you like help breaking down a specific goal into actionable steps?`;
    }

    if (lowerMessage.includes('habit')) {
      return `Building lasting habits is all about consistency and starting small! Research shows it takes an average of 66 days to form a new habit. What habit would you like to develop? I can help you create a sustainable routine.`;
    }

    if (lowerMessage.includes('stress') || lowerMessage.includes('anxiety') || lowerMessage.includes('overwhelm')) {
      return `I understand that stress can be challenging. Let's work on some strategies together. Have you tried the 5-4-3-2-1 grounding technique? It helps bring you back to the present moment. Would you like me to guide you through it?`;
    }

    if (lowerMessage.includes('challenge') || lowerMessage.includes('difficult') || lowerMessage.includes('struggle')) {
      return `Challenges are opportunities for growth, ${userName}. Let's break this down together. Can you tell me more about the specific obstacle you're facing? Once we identify it clearly, we can develop a strategy to overcome it.`;
    }

    if (lowerMessage.includes('progress') || lowerMessage.includes('review')) {
      return `Reflecting on your progress is wonderful! Let's celebrate your wins, no matter how small. What have you accomplished recently that you're proud of? And what areas do you feel could use more attention?`;
    }

    // Default response
    return `That's an interesting point, ${userName}. I'm here to support you on your journey. Could you tell me more about what you're hoping to achieve? The more details you share, the better I can help you create a personalized action plan.`;
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
              placeholder="Type your message here..."
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
