import type { HabitHealthState } from './habitHealth';

export type HabitRecoveryDeckProps = {
  habitId: string;
  habitName: string;
  healthState: Exclude<HabitHealthState, 'active'>;
  canDownsize: boolean;
  disabled?: boolean;
  onRecommit: () => void;
  onDownsize: () => void;
  onRenovateLoop: () => void;
  onChooseSubstitute: () => void;
  onReconnectNorthStar?: () => void;
  onPause: () => void;
  onRelease: () => void;
};

type RecoveryCard = {
  id: string;
  icon: string;
  title: string;
  copy: string;
  actionLabel: string;
  tone: 'violet' | 'blue' | 'gold';
  onSelect: () => void;
  disabled?: boolean;
};

/**
 * A presentational recovery chooser for struggling habits.
 *
 * Every action delegates to an existing habit/Compass flow; this component owns
 * no lifecycle or gameplay writes. Native horizontal scrolling provides the
 * swipe interaction while the buttons keep every strategy keyboard-accessible.
 */
export function HabitRecoveryDeck({
  habitId,
  habitName,
  healthState,
  canDownsize,
  disabled = false,
  onRecommit,
  onDownsize,
  onRenovateLoop,
  onChooseSubstitute,
  onReconnectNorthStar,
  onPause,
  onRelease,
}: HabitRecoveryDeckProps) {
  const cards: RecoveryCard[] = [
    {
      id: 'recommit',
      icon: '↻',
      title: 'Recommit',
      copy: 'Return gently and choose the version you can do today.',
      actionLabel: 'Choose today’s version',
      tone: 'gold',
      onSelect: onRecommit,
    },
    {
      id: 'downsize',
      icon: '◆',
      title: 'Make it smaller',
      copy: canDownsize
        ? 'Protect momentum by moving down one difficulty stage.'
        : 'You are already using the lightest available stage.',
      actionLabel: canDownsize ? 'Downsize now' : 'Lightest stage active',
      tone: 'violet',
      onSelect: onDownsize,
      disabled: !canDownsize,
    },
    {
      id: 'renovate',
      icon: '⟳',
      title: 'Renovate the loop',
      copy: 'Inspect the cue, routine and reward, then run a seven-day experiment.',
      actionLabel: 'Open Deep Fix',
      tone: 'blue',
      onSelect: onRenovateLoop,
    },
    {
      id: 'substitute',
      icon: '⇄',
      title: 'Healthier substitute',
      copy: 'Keep the need or reward, but choose a more supportive way to meet it.',
      actionLabel: 'Find a substitute',
      tone: 'violet',
      onSelect: onChooseSubstitute,
    },
    {
      id: 'north-star',
      icon: '✦',
      title: 'Reconnect North Star',
      copy: 'Check whether this habit still serves what brings you alive and what matters.',
      actionLabel: 'Open Compass Book',
      tone: 'gold',
      onSelect: onReconnectNorthStar ?? (() => {}),
      disabled: !onReconnectNorthStar,
    },
    {
      id: 'pause',
      icon: 'Ⅱ',
      title: 'Pause',
      copy: 'Create breathing room without losing the habit’s history.',
      actionLabel: 'Pause habit',
      tone: 'blue',
      onSelect: onPause,
    },
    {
      id: 'release',
      icon: '◇',
      title: 'Release',
      copy: 'Move this habit out of your active life while keeping its history.',
      actionLabel: 'Deactivate habit',
      tone: 'violet',
      onSelect: onRelease,
    },
  ];

  return (
    <section
      className={`habit-recovery-deck habit-recovery-deck--${healthState}`}
      aria-labelledby={`habit-recovery-${habitId}`}
    >
      <header className="habit-recovery-deck__header">
        <span className="habit-recovery-deck__crystal" aria-hidden="true">◆</span>
        <span>
          <span className="habit-recovery-deck__eyebrow">Recovery route</span>
          <strong id={`habit-recovery-${habitId}`}>
            Choose your next move
          </strong>
        </span>
        <small>Swipe</small>
      </header>
      <p className="habit-recovery-deck__intro">
        This habit needs support, not punishment. Pick one strategy for the next step.
      </p>
      <div className="habit-recovery-deck__rail" role="list" aria-label={`Recovery strategies for ${habitName}`}>
        {cards.map((card) => (
          <article
            key={card.id}
            className={`habit-recovery-card habit-recovery-card--${card.tone}`}
            role="listitem"
          >
            <span className="habit-recovery-card__icon" aria-hidden="true">{card.icon}</span>
            <span className="habit-recovery-card__copy">
              <strong>{card.title}</strong>
              <span>{card.copy}</span>
            </span>
            <button
              type="button"
              disabled={disabled || card.disabled}
              onClick={(event) => {
                event.stopPropagation();
                card.onSelect();
              }}
            >
              {card.actionLabel}
            </button>
          </article>
        ))}
      </div>
      <div className="habit-recovery-deck__swipe-hint" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}
