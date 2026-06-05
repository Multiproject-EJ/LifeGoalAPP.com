import { QUEST_COMPASS_FORCES } from './questCompassForces';

type QuestCompassModalProps = {
  onClose: () => void;
  onAskAiGuide: () => void;
  onRefreshAlignment: () => void;
  onStartNextQuest: () => void;
  onOpenGoals: () => void;
  onOpenJournal: () => void;
};

export function QuestCompassModal({
  onClose,
  onAskAiGuide,
  onRefreshAlignment,
  onStartNextQuest,
  onOpenGoals,
  onOpenJournal,
}: QuestCompassModalProps) {
  return (
    <div
      className="mobile-menu-overlay__hold-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Quest Compass"
    >
      <button
        type="button"
        className="mobile-menu-overlay__hold-backdrop"
        aria-label="Close Quest Compass"
        onClick={onClose}
      />
      <div className="mobile-menu-overlay__hold-panel mobile-menu-overlay__submenu-sheet quest-compass">
        <div className="mobile-menu-overlay__hold-header">
          <div>
            <p className="mobile-menu-overlay__hold-eyebrow">Life Realm Compass</p>
            <h3 className="mobile-menu-overlay__hold-title">Quest Compass</h3>
          </div>
          <button
            type="button"
            className="mobile-menu-overlay__hold-close"
            aria-label="Close Quest Compass"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <p className="quest-compass__copy">
          Read today’s alignment across your six life forces, then choose one
          small real-life quest to move the realm forward.
        </p>

        <section className="quest-compass__overview" aria-label="Compass overview">
          <div className="quest-compass__orb" aria-hidden="true">
            <span className="quest-compass__orb-center">🧭</span>
            {QUEST_COMPASS_FORCES.map((force, index) => (
              <span
                key={force.key}
                className={`quest-compass__orb-point quest-compass__orb-point--${index + 1}`}
              >
                {force.icon}
              </span>
            ))}
          </div>
          <div className="quest-compass__signal">
            <span className="quest-compass__signal-label">MVP signal</span>
            <strong>Static overview</strong>
            <p>
              Dynamic scores can plug into this layout next from check-ins,
              goals, habits, and journal reflections.
            </p>
          </div>
        </section>

        <div className="quest-compass__force-grid" aria-label="Six life forces">
          {QUEST_COMPASS_FORCES.map((force) => (
            <article key={force.key} className="quest-compass__force-card">
              <span className="quest-compass__force-icon" aria-hidden="true">
                {force.icon}
              </span>
              <div>
                <h4>{force.name}</h4>
                <p>{force.summary}</p>
                <small>{force.prompt}</small>
              </div>
            </article>
          ))}
        </div>

        <div className="mobile-menu-overlay__submenu mobile-menu-overlay__submenu--open quest-compass__actions">
          <button type="button" className="mobile-menu-overlay__submenu-button" onClick={onAskAiGuide}>
            <span className="mobile-menu-overlay__submenu-icon" aria-hidden="true">🧠</span>
            <span>Ask AI Guide</span>
          </button>
          <button type="button" className="mobile-menu-overlay__submenu-button" onClick={onRefreshAlignment}>
            <span className="mobile-menu-overlay__submenu-icon" aria-hidden="true">📊</span>
            <span>Refresh alignment</span>
          </button>
          <button type="button" className="mobile-menu-overlay__submenu-button" onClick={onStartNextQuest}>
            <span className="mobile-menu-overlay__submenu-icon" aria-hidden="true">🔁</span>
            <span>Start next quest</span>
          </button>
          <button type="button" className="mobile-menu-overlay__submenu-button" onClick={onOpenGoals}>
            <span className="mobile-menu-overlay__submenu-icon" aria-hidden="true">🎯</span>
            <span>Open goals</span>
          </button>
          <button type="button" className="mobile-menu-overlay__submenu-button" onClick={onOpenJournal}>
            <span className="mobile-menu-overlay__submenu-icon" aria-hidden="true">📝</span>
            <span>Open journal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
