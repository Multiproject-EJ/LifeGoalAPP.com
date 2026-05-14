import type { ReactNode } from 'react';
import './TodayExpandableActionSection.css';

type TodayExpandableActionSectionTone = 'neutral' | 'accent' | 'success' | 'error' | 'loading';

type TodayExpandableActionSectionProps = {
  id: string;
  icon: ReactNode;
  title: string;
  subtitle?: string | null;
  statusChip?: {
    label: string;
    tone?: TodayExpandableActionSectionTone;
  } | null;
  expanded: boolean;
  onToggle: () => void;
  keepMounted?: boolean;
  children: ReactNode;
};

export function TodayExpandableActionSection({
  id,
  icon,
  title,
  subtitle = null,
  statusChip = null,
  expanded,
  onToggle,
  keepMounted = false,
  children,
}: TodayExpandableActionSectionProps) {
  const panelId = `${id}-panel`;
  const titleId = `${id}-title`;
  const shouldRenderPanel = expanded || keepMounted;

  return (
    <section className={`today-expandable-action-section${expanded ? ' today-expandable-action-section--expanded' : ''}`}>
      <button
        type="button"
        className="today-expandable-action-section__trigger"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="today-expandable-action-section__icon" aria-hidden="true">{icon}</span>
        <span className="today-expandable-action-section__copy">
          <span id={titleId} className="today-expandable-action-section__title">{title}</span>
          {subtitle ? <span className="today-expandable-action-section__subtitle">{subtitle}</span> : null}
        </span>
        {statusChip ? (
          <span
            className={`today-expandable-action-section__chip today-expandable-action-section__chip--${statusChip.tone ?? 'neutral'}`}
          >
            {statusChip.label}
          </span>
        ) : null}
        <span className="today-expandable-action-section__chevron" aria-hidden="true">
          {expanded ? '▾' : '▸'}
        </span>
      </button>
      {shouldRenderPanel ? (
        <div
          id={panelId}
          className="today-expandable-action-section__panel"
          role="region"
          aria-labelledby={titleId}
          hidden={!expanded}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
