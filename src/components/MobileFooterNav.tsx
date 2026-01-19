import { useState, type CSSProperties, type ReactNode } from 'react';

type MobileFooterNavItem = {
  id: string;
  label: string;
  icon: ReactNode;
  ariaLabel?: string;
};

type MobileFooterStatus = {
  label: string;
  levelLabel?: string;
  description?: string;
  icon?: ReactNode;
  progress?: number;
};

type FooterListItem = MobileFooterNavItem | { type: 'status' };

type MobileFooterNavProps = {
  items: MobileFooterNavItem[];
  activeId: string | null;
  onSelect: (itemId: string) => void;
  onOpenMenu?: () => void;
  status?: MobileFooterStatus;
  onStatusClick?: () => void;
};

const isNavItem = (item: FooterListItem): item is MobileFooterNavItem => 'id' in item;

export function MobileFooterNav({
  items,
  activeId,
  onSelect,
  onOpenMenu,
  status,
  onStatusClick,
}: MobileFooterNavProps) {
  const [isDiodeActive, setIsDiodeActive] = useState(false);
  const isDiodeOff = !isDiodeActive;
  const listItems: FooterListItem[] = status && items.length
    ? items.length > 1
      ? [items[0], items[1], { type: 'status' }, ...items.slice(2)]
      : [items[0], { type: 'status' }]
    : items;

  const totalColumns = listItems.length || items.length;
  const listStyle = { '--mobile-footer-columns': totalColumns } as CSSProperties;

  return (
    <nav className="mobile-footer-nav" aria-label="Primary navigation">
      <div
        className={`mobile-footer-nav__surface ${
          isDiodeOff ? 'mobile-footer-nav__surface--diode-off' : ''
        }`}
      >
        {onOpenMenu ? (
          <div className="mobile-footer-nav__menu-row">
            <button
              type="button"
              className={`mobile-footer-nav__diode-toggle ${
                isDiodeActive ? 'mobile-footer-nav__diode-toggle--on' : 'mobile-footer-nav__diode-toggle--off'
              }`}
              aria-pressed={isDiodeActive}
              aria-label="Toggle diode indicator"
              onClick={() => setIsDiodeActive((prev) => !prev)}
            />
            <button type="button" className="mobile-footer-nav__menu-button" onClick={onOpenMenu}>
              <span aria-hidden="true" className="mobile-footer-nav__menu-icon">
                •
              </span>
              <span className="sr-only">Open full navigation</span>
            </button>
          </div>
        ) : null}
        <ul className="mobile-footer-nav__list" style={listStyle}>
          {listItems.map((item) => {
            if ('type' in item && item.type === 'status' && status) {
              return (
                <li key="status" className="mobile-footer-nav__item mobile-footer-nav__status" aria-live="polite">
                  <button
                    type="button"
                    className={`mobile-footer-nav__status-card ${
                      onStatusClick ? 'mobile-footer-nav__status-card--interactive' : ''
                    }`}
                    onClick={onStatusClick}
                    aria-label={`View Game of Life details for ${status.label}`}
                    aria-pressed={false}
                  >
                    <div className="mobile-footer-nav__status-header">
                      <span className="mobile-footer-nav__status-icon" aria-hidden="true">{status.icon ?? '⭐️'}</span>
                    </div>
                    <span className="mobile-footer-nav__status-label">{status.label}</span>
                    {'progress' in status && status.progress !== undefined ? (
                      <div className="mobile-footer-nav__status-progress" aria-hidden="true">
                        <span
                          className="mobile-footer-nav__status-progress-bar"
                          style={{ width: `${Math.min(Math.max(status.progress, 0), 100)}%` }}
                        />
                      </div>
                    ) : null}
                    <span className="mobile-footer-nav__status-level">{status.levelLabel ?? status.label}</span>
                  </button>
                </li>
              );
            }

            if (!isNavItem(item)) {
              return null;
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
      </div>
    </nav>
  );
}
