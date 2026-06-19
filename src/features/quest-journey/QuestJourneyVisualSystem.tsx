import { type CSSProperties, type ReactNode, useEffect } from 'react';
import './questJourneyVisualSystem.css';
import { lockPageScroll } from '../../utils/scrollLock';

type QuestPillar = 'identity' | 'direction' | 'execution' | 'companion' | 'progression';

type QuestJourneyShellProps = {
  children: ReactNode;
  className?: string;
  compact?: boolean;
  space?: boolean;
};

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function QuestJourneyShell({ children, className, compact = false, space = false }: QuestJourneyShellProps) {
  return (
    <main className={cx('quest-journey-shell', compact && 'quest-journey-shell--compact', space && 'quest-journey-shell--space', className)}>
      <div className="quest-journey-shell__content">{children}</div>
    </main>
  );
}

type QuestHeroCardProps = {
  eyebrow: string;
  title: string;
  summary: string;
  children?: ReactNode;
  actions?: ReactNode;
  visual?: ReactNode;
  pillar?: QuestPillar;
  meta?: ReactNode;
};

export function QuestHeroCard({ eyebrow, title, summary, children, actions, visual, pillar = 'direction', meta }: QuestHeroCardProps) {
  return (
    <section className={cx('quest-hero-card', `quest-hero-card--${pillar}`)}>
      <div className="quest-hero-card__copy">
        <p className="quest-hero-card__eyebrow">{eyebrow}</p>
        <h1 className="quest-hero-card__title">{title}</h1>
        <p className="quest-hero-card__summary">{summary}</p>
        {meta ? <div className="quest-hero-card__meta">{meta}</div> : null}
        {children ? <div className="quest-hero-card__body">{children}</div> : null}
        {actions ? <div className="quest-hero-card__actions">{actions}</div> : null}
      </div>
      {visual ? <div className="quest-hero-card__visual">{visual}</div> : null}
    </section>
  );
}

type QuestGlassCardProps = {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  interactive?: boolean;
  subtle?: boolean;
  strong?: boolean;
};

export function QuestGlassCard({ title, children, footer, className, interactive = false, subtle = false, strong = false }: QuestGlassCardProps) {
  return (
    <section className={cx('quest-glass-card', interactive && 'quest-glass-card--interactive', subtle && 'quest-glass-card--subtle', strong && 'quest-glass-card--strong', className)}>
      {title ? <h2 className="quest-glass-card__title">{title}</h2> : null}
      <div className="quest-glass-card__body">{children}</div>
      {footer ? <footer className="quest-glass-card__footer">{footer}</footer> : null}
    </section>
  );
}

type QuestSectionHeaderProps = {
  eyebrow?: string;
  title: string;
  summary?: string;
  action?: ReactNode;
};

export function QuestSectionHeader({ eyebrow, title, summary, action }: QuestSectionHeaderProps) {
  return (
    <header className="quest-section-header">
      <div>
        {eyebrow ? <p className="quest-section-header__eyebrow">{eyebrow}</p> : null}
        <h2 className="quest-section-header__title">{title}</h2>
        {summary ? <p className="quest-section-header__summary">{summary}</p> : null}
      </div>
      {action ? <div className="quest-section-header__action">{action}</div> : null}
    </header>
  );
}

type QuestActionProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  full?: boolean;
  icon?: ReactNode;
  variant?: 'gold' | 'progress';
  disabled?: boolean;
  className?: string;
};

export function QuestPrimaryAction({ children, onClick, type = 'button', full = false, icon, variant = 'gold', disabled = false, className }: QuestActionProps) {
  return (
    <button
      type={type}
      className={cx('quest-primary-action', `quest-primary-action--${variant}`, full && 'quest-primary-action--full', className)}
      onClick={onClick}
      disabled={disabled}
    >
      {icon ? <span className="quest-primary-action__icon" aria-hidden="true">{icon}</span> : null}
      <span className="quest-primary-action__label">{children}</span>
    </button>
  );
}

type QuestSecondaryActionProps = Omit<QuestActionProps, 'variant'> & {
  variant?: 'ghost' | 'glass' | 'quiet';
};

export function QuestSecondaryAction({ children, onClick, type = 'button', full = false, icon, variant = 'glass', disabled = false, className }: QuestSecondaryActionProps) {
  return (
    <button
      type={type}
      className={cx('quest-secondary-action', `quest-secondary-action--${variant}`, full && 'quest-secondary-action--full', className)}
      onClick={onClick}
      disabled={disabled}
    >
      {icon ? <span className="quest-secondary-action__icon" aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}

type QuestToolCardProps = {
  icon?: ReactNode;
  title: string;
  summary: string;
  status?: string;
  recommended?: boolean;
  locked?: boolean;
};

export function QuestToolCard({ icon, title, summary, status, recommended = false, locked = false }: QuestToolCardProps) {
  return (
    <article className={cx('quest-tool-card', recommended && 'quest-tool-card--recommended', locked && 'quest-tool-card--locked')}>
      {icon ? <div className="quest-tool-card__icon" aria-hidden="true">{icon}</div> : null}
      <div className="quest-tool-card__copy">
        <h3 className="quest-tool-card__title">{title}</h3>
        <p className="quest-tool-card__summary">{summary}</p>
      </div>
      {status ? <span className="quest-tool-card__status">{status}</span> : null}
    </article>
  );
}

type QuestMetricRingProps = {
  value: number;
  label: string;
  caption?: string;
  variant?: 'gold' | 'progress' | 'success';
};

export function QuestMetricRing({ value, label, caption, variant = 'progress' }: QuestMetricRingProps) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={cx('quest-metric-ring', `quest-metric-ring--${variant}`)}
      style={{ '--quest-metric-value': `${safeValue}%` } as CSSProperties}
      role="img"
      aria-label={`${label}: ${safeValue}%${caption ? `. ${caption}` : ''}`}
    >
      <div className="quest-metric-ring__inner">
        <strong className="quest-metric-ring__value">{safeValue}%</strong>
        <span className="quest-metric-ring__label">{label}</span>
      </div>
      {caption ? <span className="quest-metric-ring__caption">{caption}</span> : null}
    </div>
  );
}

type QuestProgressBarProps = {
  value: number;
  label: string;
  markerLabel?: string;
};

export function QuestProgressBar({ value, label, markerLabel }: QuestProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="quest-progress-bar" role="group" aria-label={`${label}: ${safeValue}%`}>
      <div className="quest-progress-bar__label-row">
        <span className="quest-progress-bar__label">{label}</span>
        <strong>{safeValue}%</strong>
      </div>
      <div className="quest-progress-bar__track">
        <span className="quest-progress-bar__fill" style={{ width: `${safeValue}%` }} />
        {markerLabel ? <span className="quest-progress-bar__marker" style={{ left: `${safeValue}%` }}>{markerLabel}</span> : null}
      </div>
    </div>
  );
}

type QuestCompanionCardProps = {
  source: string;
  title: string;
  insight: string;
  reason?: string;
  action?: ReactNode;
};

export function QuestCompanionCard({ source, title, insight, reason, action }: QuestCompanionCardProps) {
  return (
    <aside className="quest-companion-card">
      <p className="quest-companion-card__source">{source}</p>
      <h2 className="quest-companion-card__title">{title}</h2>
      <p className="quest-companion-card__insight">{insight}</p>
      {reason ? <p className="quest-companion-card__reason">{reason}</p> : null}
      {action ? <div className="quest-companion-card__action">{action}</div> : null}
    </aside>
  );
}

type QuestLifeAreaChipProps = {
  icon?: ReactNode;
  label: string;
  active?: boolean;
  needsCare?: boolean;
  strong?: boolean;
};

export function QuestLifeAreaChip({ icon, label, active = false, needsCare = false, strong = false }: QuestLifeAreaChipProps) {
  return (
    <span className={cx('quest-life-area-chip', active && 'quest-life-area-chip--active', needsCare && 'quest-life-area-chip--needs-care', strong && 'quest-life-area-chip--strong')}>
      {icon ? <span className="quest-life-area-chip__icon" aria-hidden="true">{icon}</span> : null}
      <span className="quest-life-area-chip__label">{label}</span>
    </span>
  );
}

type QuestTraitCardProps = {
  role: string;
  icon?: ReactNode;
  title: string;
  summary: string;
  variant?: 'dominant' | 'support' | 'growth-edge';
};

export function QuestTraitCard({ role, icon, title, summary, variant = 'support' }: QuestTraitCardProps) {
  return (
    <article className={cx('quest-trait-card', `quest-trait-card--${variant}`)}>
      <p className="quest-trait-card__role">{role}</p>
      {icon ? <div className="quest-trait-card__icon" aria-hidden="true">{icon}</div> : null}
      <h3 className="quest-trait-card__title">{title}</h3>
      <p className="quest-trait-card__summary">{summary}</p>
    </article>
  );
}

type QuestModalSheetProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
};

export function QuestModalSheet({ open, title, children, footer, onClose }: QuestModalSheetProps) {
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const releaseScrollLock = lockPageScroll();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      releaseScrollLock();
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="quest-modal-sheet" role="dialog" aria-modal="true" aria-labelledby="quest-modal-sheet-title">
      <button type="button" className="quest-modal-sheet__backdrop" aria-label="Close preview modal" onClick={onClose} />
      <section className="quest-modal-sheet__panel">
        <header className="quest-modal-sheet__header">
          <h2 id="quest-modal-sheet-title">{title}</h2>
          <button type="button" className="quest-modal-sheet__close" aria-label="Close" onClick={onClose}>×</button>
        </header>
        <div className="quest-modal-sheet__body">{children}</div>
        {footer ? <footer className="quest-modal-sheet__footer">{footer}</footer> : null}
      </section>
    </div>
  );
}
