import './TimerTab.css';

type TimerTabProps = {
  onNavigateToActions?: () => void;
};

export function TimerTab({ onNavigateToActions }: TimerTabProps) {
  return (
    <div className="timer-tab">
      <header className="timer-tab__header">
        <div className="timer-tab__header-content">
          <h2 className="timer-tab__title">Timer</h2>
          <p className="timer-tab__subtitle">Stay focused with a timer session.</p>
        </div>
        <div className="timer-tab__header-actions">
          {onNavigateToActions && (
            <button
              className="timer-tab__header-icon"
              onClick={onNavigateToActions}
              type="button"
              aria-label="Back to Actions"
              title="Back to Actions"
            >
              ⚡️
            </button>
          )}
        </div>
      </header>

      <section className="timer-tab__placeholder">
        <div className="timer-tab__placeholder-card">
          <h3>Timer coming soon</h3>
          <p>Add a timer here to support focus sessions.</p>
        </div>
      </section>
    </div>
  );
}
