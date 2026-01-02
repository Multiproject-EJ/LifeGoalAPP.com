import './QuickStart.css';

interface QuickStartProps {
  onMeditate?: () => void;
  onBreathe?: () => void;
  onBodyPractice?: () => void;
  onJournal?: () => void;
  currentStreak?: number;
  lastActivity?: string;
}

export function QuickStart({
  onMeditate,
  onBreathe,
  onBodyPractice,
  onJournal,
  currentStreak = 0,
  lastActivity,
}: QuickStartProps) {
  return (
    <div className="quick-start">
      <div className="quick-start__header">
        <h3 className="quick-start__title">Quick Start</h3>
        {currentStreak > 0 && (
          <div className="quick-start__streak">
            <span className="quick-start__streak-icon">🔥</span>
            <span className="quick-start__streak-text">{currentStreak} day streak</span>
          </div>
        )}
      </div>

      {lastActivity && (
        <div className="quick-start__resume">
          <button className="quick-start__resume-button" onClick={onMeditate}>
            <span className="quick-start__resume-icon">▶️</span>
            <span className="quick-start__resume-text">Resume {lastActivity}</span>
          </button>
        </div>
      )}

      <div className="quick-start__actions">
        <button className="quick-start__action" onClick={onMeditate}>
          <span className="quick-start__action-icon">🧘</span>
          <span className="quick-start__action-label">Meditate</span>
        </button>
        <button className="quick-start__action" onClick={onBreathe}>
          <span className="quick-start__action-icon">🌬️</span>
          <span className="quick-start__action-label">Breathe</span>
        </button>
        <button className="quick-start__action" onClick={onBodyPractice}>
          <span className="quick-start__action-icon">💪</span>
          <span className="quick-start__action-label">Body</span>
        </button>
        <button className="quick-start__action" onClick={onJournal}>
          <span className="quick-start__action-icon">📝</span>
          <span className="quick-start__action-label">Journal</span>
        </button>
      </div>
    </div>
  );
}
