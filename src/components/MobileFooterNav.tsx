import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { PointsBadge } from './PointsBadge';

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
  isDiodeActive: boolean;
  pointsBadges?: Partial<Record<MobileFooterNavItem['id'], string>>;
  showPointsBadges?: boolean;
  isFlashActive?: boolean;
  isCollapsed?: boolean;
  isSnapActive?: boolean;
  status?: MobileFooterStatus;
  onStatusClick?: () => void;
  onStatusHoldToggle?: () => void;
  onExpand?: () => void;
  onSnapExpand?: () => void;
  pointsBalance?: number;
};

const isNavItem = (item: FooterListItem): item is MobileFooterNavItem => 'id' in item;

export function MobileFooterNav({
  items,
  activeId,
  onSelect,
  onOpenMenu,
  isDiodeActive,
  pointsBadges = {},
  showPointsBadges = false,
  isFlashActive = false,
  isCollapsed = false,
  isSnapActive = false,
  status,
  onStatusClick,
  onStatusHoldToggle,
  onExpand,
  onSnapExpand,
  pointsBalance,
}: MobileFooterNavProps) {
  const [statusHoldProgress, setStatusHoldProgress] = useState(0);
  const [isStatusHoldActive, setIsStatusHoldActive] = useState(false);
  const [isStatusHoldSnap, setIsStatusHoldSnap] = useState(false);
  const [displayPointsBalance, setDisplayPointsBalance] = useState<number | null>(
    typeof pointsBalance === 'number' ? Math.max(0, Math.floor(pointsBalance)) : null,
  );
  const [isPointsAnimating, setIsPointsAnimating] = useState(false);
  const displayPointsBalanceRef = useRef<number | null>(
    typeof pointsBalance === 'number' ? Math.max(0, Math.floor(pointsBalance)) : null,
  );
  const statusHoldRafRef = useRef<number | null>(null);
  const statusHoldTimeoutRef = useRef<number | null>(null);
  const statusHoldStartRef = useRef<number | null>(null);
  const statusHoldTriggeredRef = useRef(false);
  const pointsTimerRef = useRef<number | null>(null);
  const isDiodeOff = !isDiodeActive;
  const listItems: FooterListItem[] = status && items.length
    ? items.length > 1
      ? [items[0], items[1], { type: 'status' }, ...items.slice(2)]
      : [items[0], { type: 'status' }]
    : items;

  const totalColumns = listItems.length || items.length;
  const listStyle = { '--mobile-footer-columns': totalColumns } as CSSProperties;
  const formattedPointsBalance =
    typeof displayPointsBalance === 'number' ? Math.max(0, displayPointsBalance).toLocaleString() : null;
  const shouldShowDiamondCounter = Boolean(isDiodeActive && formattedPointsBalance);
  const isCompactGameStatus = isDiodeOff && isCollapsed;
  const handlePointerDown = () => {
    if (onSnapExpand) {
      onSnapExpand();
      return;
    }
    onExpand?.();
  };
  const holdAccentColor = isDiodeActive ? '248, 113, 113' : '34, 197, 94';

  const clearStatusHoldTimers = () => {
    if (statusHoldRafRef.current !== null) {
      window.cancelAnimationFrame(statusHoldRafRef.current);
      statusHoldRafRef.current = null;
    }
    if (statusHoldTimeoutRef.current !== null) {
      window.clearTimeout(statusHoldTimeoutRef.current);
      statusHoldTimeoutRef.current = null;
    }
  };

  const resetStatusHold = (resetSnap = false) => {
    clearStatusHoldTimers();
    statusHoldStartRef.current = null;
    statusHoldTriggeredRef.current = false;
    setIsStatusHoldActive(false);
    setStatusHoldProgress(0);
    if (resetSnap) {
      setIsStatusHoldSnap(false);
    }
  };

  useEffect(() => {
    return () => {
      clearStatusHoldTimers();
    };
  }, []);

  useEffect(() => {
    displayPointsBalanceRef.current = displayPointsBalance;
  }, [displayPointsBalance]);

  useEffect(() => {
    if (typeof pointsBalance !== 'number') {
      setDisplayPointsBalance(null);
      setIsPointsAnimating(false);
      if (pointsTimerRef.current !== null) {
        window.clearInterval(pointsTimerRef.current);
        pointsTimerRef.current = null;
      }
      return;
    }

    const nextBalance = Math.max(0, Math.floor(pointsBalance));
    setDisplayPointsBalance((current) => {
      if (current === null) {
        return nextBalance;
      }
      return current;
    });

    const startBalance = displayPointsBalanceRef.current ?? nextBalance;

    if (nextBalance <= startBalance) {
      if (pointsTimerRef.current !== null) {
        window.clearInterval(pointsTimerRef.current);
        pointsTimerRef.current = null;
      }
      setDisplayPointsBalance(nextBalance);
      setIsPointsAnimating(false);
      return;
    }

    if (pointsTimerRef.current !== null) {
      window.clearInterval(pointsTimerRef.current);
      pointsTimerRef.current = null;
    }

    setIsPointsAnimating(true);
    let currentValue = startBalance;
    const delta = nextBalance - startBalance;
    const stepInterval = Math.max(24, Math.min(80, Math.round(1200 / Math.max(delta, 1))));

    pointsTimerRef.current = window.setInterval(() => {
      currentValue += 1;
      setDisplayPointsBalance(currentValue);
      if (currentValue >= nextBalance) {
        if (pointsTimerRef.current !== null) {
          window.clearInterval(pointsTimerRef.current);
          pointsTimerRef.current = null;
        }
        setIsPointsAnimating(false);
      }
    }, stepInterval);

    return () => {
      if (pointsTimerRef.current !== null) {
        window.clearInterval(pointsTimerRef.current);
        pointsTimerRef.current = null;
      }
    };
  }, [pointsBalance]);

  const startStatusHold = () => {
    if (!onStatusHoldToggle) {
      return;
    }
    resetStatusHold(true);
    statusHoldTriggeredRef.current = false;
    setIsStatusHoldActive(true);
    statusHoldStartRef.current = window.performance?.now?.() ?? Date.now();
    const HOLD_DURATION_MS = 700;

    const step = (timestamp: number) => {
      if (statusHoldStartRef.current === null) {
        return;
      }
      const elapsed = timestamp - statusHoldStartRef.current;
      const progress = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setStatusHoldProgress(progress);

      if (progress >= 1 && !statusHoldTriggeredRef.current) {
        statusHoldTriggeredRef.current = true;
        onStatusHoldToggle();
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([80, 40, 80, 40, 160]);
        }
        setIsStatusHoldSnap(true);
        setIsStatusHoldActive(false);
        statusHoldTimeoutRef.current = window.setTimeout(() => {
          resetStatusHold(true);
        }, 220);
        return;
      }

      statusHoldRafRef.current = window.requestAnimationFrame(step);
    };

    statusHoldRafRef.current = window.requestAnimationFrame(step);
  };

  const handleStatusPointerUp = () => {
    if (!statusHoldTriggeredRef.current) {
      resetStatusHold();
    }
  };

  const handleStatusClick = () => {
    if (statusHoldTriggeredRef.current) {
      statusHoldTriggeredRef.current = false;
      return;
    }
    onStatusClick?.();
  };

  return (
    <nav
      className={`mobile-footer-nav${isFlashActive ? ' mobile-footer-nav--flash' : ''}${
        isCollapsed ? ' mobile-footer-nav--collapsed' : ''
      }${isSnapActive ? ' mobile-footer-nav--snap' : ''}`}
      aria-label="Primary navigation"
    >
      <div
        className={`mobile-footer-nav__surface ${
          isDiodeOff ? 'mobile-footer-nav__surface--diode-off' : ''
        }${isDiodeActive ? ' mobile-footer-nav__surface--image' : ''}`}
        data-diode-active={isDiodeActive}
        onMouseEnter={onExpand}
        onFocusCapture={onExpand}
        onPointerDown={handlePointerDown}
      >
        {onOpenMenu ? (
          <div className="mobile-footer-nav__menu-row">
            <button type="button" className="mobile-footer-nav__menu-button" onClick={onOpenMenu}>
              <span aria-hidden="true" className="mobile-footer-nav__menu-icon">
                •
              </span>
              <span className="sr-only">Open full navigation</span>
            </button>
          </div>
        ) : null}
        {shouldShowDiamondCounter ? (
          <div
            className={`mobile-footer-nav__diamond-counter${
              isDiodeActive ? ' mobile-footer-nav__diamond-counter--diode-on' : ''
            }${isCollapsed ? ' mobile-footer-nav__diamond-counter--hidden' : ''}${
              isPointsAnimating ? ' mobile-footer-nav__diamond-counter--active' : ''
            }`}
            aria-live="polite"
          >
            <span className="mobile-footer-nav__diamond-icon" aria-hidden="true">
              💎
            </span>
            <span
              className={`mobile-footer-nav__diamond-value${
                isPointsAnimating ? ' mobile-footer-nav__diamond-value--active' : ''
              }`}
            >
              {formattedPointsBalance}
            </span>
          </div>
        ) : null}
        <ul className="mobile-footer-nav__list mobile-footer-nav__list--stacked" style={listStyle}>
          {listItems.map((item) => {
            if ('type' in item && item.type === 'status' && status) {
              return (
                <li key="status" className="mobile-footer-nav__item mobile-footer-nav__status" aria-live="polite">
                  <button
                    type="button"
                    className={`mobile-footer-nav__status-card ${
                      onStatusClick ? 'mobile-footer-nav__status-card--interactive' : ''
                    }${isStatusHoldActive ? ' mobile-footer-nav__status-card--hold' : ''}${
                      isStatusHoldSnap ? ' mobile-footer-nav__status-card--snap' : ''
                    }`}
                    style={
                      {
                        '--status-hold-progress': statusHoldProgress,
                        '--status-hold-accent': holdAccentColor,
                      } as CSSProperties
                    }
                    onClick={handleStatusClick}
                    onPointerDown={startStatusHold}
                    onPointerUp={handleStatusPointerUp}
                    onPointerLeave={handleStatusPointerUp}
                    onPointerCancel={handleStatusPointerUp}
                    aria-label={`View Game of Life details for ${status.label}`}
                    aria-pressed={false}
                    data-game-tab-icon="true"
                  >
                    <div className="mobile-footer-nav__status-header">
                      <span className="mobile-footer-nav__status-icon" aria-hidden="true">
                        {isCompactGameStatus ? '⏻' : status.icon ?? '⭐️'}
                      </span>
                    </div>
                    <span className="mobile-footer-nav__status-label">
                      {isCompactGameStatus ? 'GAME' : status.label}
                    </span>
                    {!isCompactGameStatus && 'progress' in status && status.progress !== undefined ? (
                      <div className="mobile-footer-nav__status-progress" aria-hidden="true">
                        <span
                          className="mobile-footer-nav__status-progress-bar"
                          style={{ width: `${Math.min(Math.max(status.progress, 0), 100)}%` }}
                        />
                      </div>
                    ) : null}
                    {!isCompactGameStatus ? (
                      <span className="mobile-footer-nav__status-level">{status.levelLabel ?? status.label}</span>
                    ) : null}
                  </button>
                </li>
              );
            }

            if (!isNavItem(item)) {
              return null;
            }

            const isActive = item.id === activeId;
            const pointsBadgeValue = showPointsBadges ? pointsBadges[item.id] : undefined;
            return (
              <li key={item.id} className={`mobile-footer-nav__item mobile-footer-nav__item--${item.id}`}>
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
                  <span className="mobile-footer-nav__label">
                    {item.label}
                    {pointsBadgeValue ? (
                      <PointsBadge
                        value={pointsBadgeValue}
                        size="mini"
                        className="mobile-footer-nav__points-badge"
                      />
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
