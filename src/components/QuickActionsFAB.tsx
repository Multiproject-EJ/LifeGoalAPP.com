import { useState, useRef, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';

type JournalType = 'standard' | 'quick' | 'deep' | 'brain_dump' | 'life_wheel' | 'secret' | 'goal' | 'time_capsule';

type QuickActionsFABProps = {
  session: Session;
  onCheckHabit?: () => void;
  onJournalNow?: (type: JournalType) => void;
  onOpenLifeCoach?: () => void;
};

type QuickAction = {
  id: string;
  icon: string;
  label: string;
  color: string;
  onClick: () => void;
};

const JOURNAL_TYPES: { type: JournalType; icon: string; label: string }[] = [
  { type: 'quick', icon: '⚡', label: 'Quick' },
  { type: 'standard', icon: '📝', label: 'Standard' },
  { type: 'deep', icon: '🔮', label: 'Deep' },
  { type: 'brain_dump', icon: '🧠', label: 'Brain Dump' },
  { type: 'life_wheel', icon: '🎯', label: 'Life Wheel' },
  { type: 'goal', icon: '🎪', label: 'Goal' },
];

export function QuickActionsFAB({
  session,
  onCheckHabit,
  onJournalNow,
  onOpenLifeCoach,
}: QuickActionsFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showJournalTypes, setShowJournalTypes] = useState(false);
  const [showLifeCoach, setShowLifeCoach] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  // Close FAB menu and reset all states on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowJournalTypes(false);
        // Note: showLifeCoach is not reset here because the Life Coach modal
        // has its own backdrop click handler for closing
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setShowJournalTypes(false);
    }
  };

  const handleCheckHabit = () => {
    onCheckHabit?.();
    setIsOpen(false);
  };

  const handleJournalClick = () => {
    setShowJournalTypes(!showJournalTypes);
  };

  const handleJournalTypeSelect = (type: JournalType) => {
    onJournalNow?.(type);
    setIsOpen(false);
    setShowJournalTypes(false);
  };

  const handleLifeCoachClick = () => {
    setShowLifeCoach(true);
    setIsOpen(false);
  };

  const closeLifeCoach = () => {
    setShowLifeCoach(false);
  };

  const quickActions: QuickAction[] = [
    {
      id: 'check-habit',
      icon: '✅',
      label: 'Check off habit',
      color: '#10b981',
      onClick: handleCheckHabit,
    },
    {
      id: 'journal',
      icon: '📔',
      label: 'Journal Now',
      color: '#8b5cf6',
      onClick: handleJournalClick,
    },
    {
      id: 'life-coach',
      icon: '🤖',
      label: 'Life Coach AI',
      color: '#0ea5e9',
      onClick: handleLifeCoachClick,
    },
  ];

  return (
    <>
      <div
        ref={fabRef}
        className={`quick-actions-fab ${isOpen ? 'quick-actions-fab--open' : ''}`}
      >
        {/* Action buttons that fan out */}
        <div className="quick-actions-fab__actions">
          {quickActions.map((action, index) => (
            <div
              key={action.id}
              className={`quick-actions-fab__action ${isOpen ? 'quick-actions-fab__action--visible' : ''}`}
              style={{
                '--action-index': index,
                '--action-color': action.color,
              } as React.CSSProperties}
            >
              <button
                type="button"
                className="quick-actions-fab__action-btn"
                onClick={action.onClick}
                aria-label={action.label}
                title={action.label}
              >
                <span className="quick-actions-fab__action-icon" aria-hidden="true">
                  {action.icon}
                </span>
              </button>
              <span className="quick-actions-fab__action-label">{action.label}</span>

              {/* Journal type sub-menu */}
              {action.id === 'journal' && showJournalTypes && (
                <div className="quick-actions-fab__submenu">
                  <div className="quick-actions-fab__submenu-title">Choose journal type:</div>
                  <div className="quick-actions-fab__submenu-items">
                    {JOURNAL_TYPES.map((jt) => (
                      <button
                        key={jt.type}
                        type="button"
                        className="quick-actions-fab__submenu-item"
                        onClick={() => handleJournalTypeSelect(jt.type)}
                      >
                        <span aria-hidden="true">{jt.icon}</span>
                        {jt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Main FAB button */}
        <button
          type="button"
          className={`quick-actions-fab__main ${isOpen ? 'quick-actions-fab__main--open' : ''}`}
          onClick={handleToggle}
          aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
          aria-expanded={isOpen}
        >
          <span className="quick-actions-fab__main-icon" aria-hidden="true">
            ✨
          </span>
        </button>
      </div>

      {/* Life Coach AI Modal */}
      {showLifeCoach && (
        <div className="life-coach-modal">
          <div
            className="life-coach-modal__backdrop"
            onClick={closeLifeCoach}
            role="presentation"
          />
          <div className="life-coach-modal__content">
            <button
              type="button"
              className="life-coach-modal__close"
              onClick={closeLifeCoach}
              aria-label="Close Life Coach"
            >
              ×
            </button>
            <div className="life-coach-modal__avatar">
              <div className="life-coach-modal__robot">
                <span className="life-coach-modal__robot-face">🤖</span>
                <div className="life-coach-modal__robot-glow" />
              </div>
            </div>
            <div className="life-coach-modal__messages">
              <div className="life-coach-modal__bubble life-coach-modal__bubble--greeting">
                <p>Hi there! 👋 I'm your Life Coach AI.</p>
              </div>
              <div className="life-coach-modal__bubble life-coach-modal__bubble--main">
                <p>How can I help you today with your goals and habits?</p>
              </div>
              <div className="life-coach-modal__bubble life-coach-modal__bubble--suggestions">
                <p>Here are some things I can help with:</p>
                <ul>
                  <li>💪 Motivation boost</li>
                  <li>🎯 Goal setting advice</li>
                  <li>📊 Progress review</li>
                  <li>🧘 Mindfulness tips</li>
                </ul>
              </div>
            </div>
            <div className="life-coach-modal__hint">
              <p>Coming soon: Full AI conversation capabilities!</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
