import type { ReactNode } from 'react';

type MobileFooterNavItem = {
  id: string;
  label: string;
  icon: ReactNode;
  ariaLabel?: string;
};

type MobileFooterNavProps = {
  items: MobileFooterNavItem[];
  activeId: string | null;
  onSelect: (itemId: string) => void;
};

export function MobileFooterNav({ items, activeId, onSelect }: MobileFooterNavProps) {
  return (
    <nav className="mobile-footer-nav" aria-label="Primary navigation">
      <ul className="mobile-footer-nav__list">
        {items.map((item) => {
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
    </nav>
  );
}
