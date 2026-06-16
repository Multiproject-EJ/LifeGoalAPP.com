import type { ConflictRoutingType } from '../types/conflictSession';

type ConflictTypeRoutingScreenProps = {
  selectedRoutingType: ConflictRoutingType | null;
  safetyFlag: boolean;
  onSelectRoutingType: (routingType: ConflictRoutingType) => void;
  onContinue: () => void;
  onSafetyLink: () => void;
};

type RoutingCard = {
  id: ConflictRoutingType;
  title: string;
  description: string;
  bestFor: string;
};

export const ROUTING_CARDS: RoutingCard[] = [
  {
    id: 'personality_annoyance',
    title: 'Personality clash / annoyance',
    description: 'They keep doing something that irritates me.',
    bestFor: 'Habits, style differences, tone, or repeated small frustrations.',
  },
  {
    id: 'misunderstanding',
    title: 'Misunderstanding',
    description: 'I think we read the same thing differently.',
    bestFor: 'Unclear intent, bad wording, or assumed meaning.',
  },
  {
    id: 'boundary_issue',
    title: 'Boundary issue',
    description: 'Something feels like it crossed a line.',
    bestFor: 'Repeated overreach, unwanted behavior, emotional space, time, or privacy.',
  },
  {
    id: 'unfairness_imbalance',
    title: 'Unfairness / imbalance',
    description: 'The effort or care feels unequal.',
    bestFor: 'Household labor, emotional labor, workload, or reciprocity.',
  },
  {
    id: 'hurt_broken_trust',
    title: 'Hurt / broken trust',
    description: 'Something damaged trust.',
    bestFor: 'Broken promises, secrecy, dishonesty, betrayal, or public embarrassment.',
  },
  {
    id: 'different_needs_values',
    title: 'Different needs or values',
    description: 'We both want different things.',
    bestFor: 'Priorities, lifestyle, commitment, parenting, money, or life direction.',
  },
  {
    id: 'practical_decision',
    title: 'Practical decision conflict',
    description: 'We need to choose what to do.',
    bestFor: 'Plans, scheduling, moving, spending, tasks, or decisions.',
  },
  {
    id: 'repeated_pattern',
    title: 'Repeated pattern',
    description: 'This keeps happening.',
    bestFor: 'Issues already discussed where nothing really changes.',
  },
  {
    id: 'unsure',
    title: 'I’m not sure yet',
    description: 'Help me figure it out.',
    bestFor: 'Ambiguous situations where no single label feels right yet.',
  },
];

export const getConflictRoutingLabel = (routingType: ConflictRoutingType | null) =>
  ROUTING_CARDS.find((card) => card.id === routingType)?.title ?? null;

export function ConflictTypeRoutingScreen({
  selectedRoutingType,
  safetyFlag,
  onSelectRoutingType,
  onContinue,
  onSafetyLink,
}: ConflictTypeRoutingScreenProps) {
  const showPersonalityCoaching = selectedRoutingType === 'personality_annoyance' && !safetyFlag;

  return (
    <section className="conflict-resolver__screen" aria-labelledby="conflict-routing-title">
      <header className="conflict-resolver__header">
        <h3 id="conflict-routing-title" className="conflict-resolver__title">
          What does this feel closest to right now?
        </h3>
        <p className="conflict-resolver__subtitle">
          You can change this later. This just helps us guide the next step.
        </p>
      </header>

      <div className="conflict-resolver__routing-grid" role="radiogroup" aria-label="Conflict type routing options">
        {ROUTING_CARDS.map((card) => {
          const isSelected = selectedRoutingType === card.id;
          return (
            <button
              key={card.id}
              type="button"
              className={`conflict-resolver__routing-card ${isSelected ? 'conflict-resolver__routing-card--selected' : ''}`.trim()}
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelectRoutingType(card.id)}
            >
              <span className="conflict-resolver__routing-title">{card.title}</span>
              <span className="conflict-resolver__routing-description">{card.description}</span>
              <span className="conflict-resolver__routing-best-for">Best for: {card.bestFor}</span>
            </button>
          );
        })}
      </div>

      {showPersonalityCoaching ? (
        <aside className="conflict-resolver__routing-coaching-panel" aria-label="Personality annoyance coaching">
          <p>
            This may not be about making them different. Some conflicts are about finding the level of irritation you can carry while still acting like yourself.
          </p>
          <p>
            If you’ve become cold, sharp, or mean, it may be a sign that your limit was crossed earlier than you realized.
          </p>
        </aside>
      ) : null}

      <div className={`conflict-resolver__safety-link-panel ${safetyFlag ? 'conflict-resolver__safety-link-panel--active' : ''}`.trim()}>
        <button type="button" className="conflict-resolver__safety-link" onClick={onSafetyLink}>
          I may not feel safe resolving this directly.
        </button>
        {safetyFlag ? (
          <p className="conflict-resolver__safety-note" role="status">
            Safety comes first. This path should move away from normal mutual-resolution framing; you do not have to resolve this directly right now. Consider speaking with someone you trust or a local support service before taking action.
          </p>
        ) : null}
      </div>

      <div className="conflict-resolver__footer-actions">
        <button type="button" className="btn btn--primary" onClick={onContinue} disabled={!selectedRoutingType && !safetyFlag}>
          {safetyFlag ? 'Continue to safety-first reflection' : 'Continue to private reflection'}
        </button>
      </div>
    </section>
  );
}
