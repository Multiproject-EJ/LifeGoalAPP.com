import React, { useState, type ReactNode } from 'react';

type CollapsibleSectionProps = {
  title: string;
  /** Optional short hint shown next to the title (e.g. "5 traits"). */
  meta?: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Progressive-disclosure wrapper for the personality results screen. Keeps the
 * hero + deck prominent while tucking detailed breakdowns behind a tap, so the
 * long results page reads as "headline first, details on demand".
 */
export function CollapsibleSection({
  title,
  meta,
  defaultOpen = false,
  className,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`identity-hub__collapsible${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="identity-hub__collapsible-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="identity-hub__collapsible-title">{title}</span>
        {meta ? <span className="identity-hub__collapsible-meta">{meta}</span> : null}
        <span className="identity-hub__collapsible-chevron" aria-hidden="true">
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open ? <div className="identity-hub__collapsible-body">{children}</div> : null}
    </div>
  );
}
