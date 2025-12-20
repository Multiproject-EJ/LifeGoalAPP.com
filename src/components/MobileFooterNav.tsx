import type { ReactNode } from 'react';

type MobileFooterNavItem = {
  id: string;
  label: string;
  icon: ReactNode;
  ariaLabel?: string;
};

type MobileFooterStatus = {
  label: string;
  description?: string;
  icon?: ReactNode;
  progress?: number;
};

type MobileFooterNavProps = {
  items: MobileFooterNavItem[];
  activeId: string | null;
  onSelect: (itemId: string) => void;
  onOpenMenu?: () => void;
  status?: MobileFooterStatus;
};

export function MobileFooterNav({ items, activeId, onSelect, onOpenMenu, status }: MobileFooterNavProps) {
  const listItems: Array<MobileFooterNavItem | { type: 'status' }> = status && items.length
    ? [items[0], { type: 'status' }, ...items.slice(1)]
    : items;

  const totalColumns = listItems.length || items.length;

  return (
    <nav className="mobile-footer-nav" aria-label="Primary navigation">
      <div className="mobile-footer-nav__surface">
        <ul className="mobile-footer-nav__list" style={{ ['--mobile-footer-columns' as const]: totalColumns }}>
          {listItems.map((item) => {
            if ('type' in item && item.type === 'status' && status) {
              return (
                <li key="status" className="mobile-footer-nav__item mobile-footer-nav__status" aria-live="polite">
                  <div className="mobile-footer-nav__status-card">
                    <div className="mobile-footer-nav__status-header">
                      <span className="mobile-footer-nav__status-icon" aria-hidden="true">{status.icon ?? '⭐️'}</span>
                      <span className="mobile-footer-nav__status-label">{status.label}</span>
                    </div>
                    {status.description ? (
                      <p className="mobile-footer-nav__status-description">{status.description}</p>
                    ) : null}
                    {'progress' in status && status.progress !== undefined ? (
                      <div className="mobile-footer-nav__status-progress" aria-hidden="true">
                        <span
                          className="mobile-footer-nav__status-progress-bar"
                          style={{ width: `${Math.min(Math.max(status.progress, 0), 100)}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            }

            const isActive = item.id === activeId;
            return (
              <li key={item.id} className="mobile-footer-nav__item">
                <button
                  type="button"
                  className={`mobile-footer-nav__button ${
                    isActive ? 'mobile-footer-nav__button--active' : ''
                  }`}
                  onClick={() => onSelect(item.id)}
                  aria-label={item.ariaLabel ?? item.label}
                  aria-pressed={isActive}
                >
                  <span aria-hidden="true" className="mobile-footer-nav__icon">
                    {item.icon}
                  </span>
                  <span className="mobile-footer-nav__label">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {onOpenMenu ? (
          <div className="mobile-footer-nav__menu">
            <button type="button" className="mobile-footer-nav__menu-button" onClick={onOpenMenu}>
              <span aria-hidden="true" className="mobile-footer-nav__menu-icon">
                ☰
              </span>
              <span className="mobile-footer-nav__menu-label">Menu</span>
              <span className="sr-only">Open full navigation</span>
            </button>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
