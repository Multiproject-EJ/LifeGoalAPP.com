import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { PointsBadge } from './PointsBadge';
import { splitGoldBalance } from '../constants/economy';
import mindIcon from '../assets/mind-icon.webp';
import bodyIcon from '../assets/body-icon.webp';

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
  isEnergyMenuOpen?: boolean;
  onEnergyToggle?: () => void;
  onEnergySelect?: (category: 'mind' | 'body') => void;
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
const DAILY_GAME_ICONS = ['💎', '🔑', '🗝️', '🎁', '🔓'];

const getDailyGameIcon = () => {
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return DAILY_GAME_ICONS[dayIndex % DAILY_GAME_ICONS.length];
};

export function MobileFooterNav({
  items,
  activeId,
  onSelect,
  onOpenMenu,
  isEnergyMenuOpen = false,
  onEnergyToggle,
  onEnergySelect,
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
  const [areControlsFaded, setAreControlsFaded] = useState(false);
  const [isDiamondFaded, setIsDiamondFaded] = useState(false);
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
  const controlFadeTimeoutRef = useRef<number | null>(null);
  const diamondFadeTimeoutRef = useRef<number | null>(null);
  const isDiodeOff = !isDiodeActive;
  const listItems: FooterListItem[] = status && items.length
    ? items.length > 1
      ? [items[0], items[1], { type: 'status' }, ...items.slice(2)]
      : [items[0], { type: 'status' }]
    : items;

  const totalColumns = listItems.length || items.length;
  const listStyle = { '--mobile-footer-columns': totalColumns } as CSSProperties;
  const goldBreakdown =
    typeof displayPointsBalance === 'number' ? splitGoldBalance(displayPointsBalance) : null;
  const formattedDiamonds =
    goldBreakdown ? goldBreakdown.diamonds.toLocaleString() : null;
  const formattedGoldRemainder =
    goldBreakdown ? goldBreakdown.goldRemainder.toLocaleString() : null;
  const shouldShowDiamondCounter = Boolean(isDiodeActive && goldBreakdown);
  const isCompactGameStatus = isDiodeOff;
  const compactGameIcon = isDiodeOff ? getDailyGameIcon() : null;
  const handlePointerDown = () => {
    if (isDiodeActive) {
      revealControllerUI();
    }
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

  const clearFadeTimers = () => {
    if (controlFadeTimeoutRef.current !== null) {
      window.clearTimeout(controlFadeTimeoutRef.current);
      controlFadeTimeoutRef.current = null;
    }
    if (diamondFadeTimeoutRef.current !== null) {
      window.clearTimeout(diamondFadeTimeoutRef.current);
      diamondFadeTimeoutRef.current = null;
    }
  };

  const scheduleFadeOut = () => {
    if (!isDiodeActive) {
      return;
    }
    controlFadeTimeoutRef.current = window.setTimeout(() => {
      setAreControlsFaded(true);
    }, 1000);
    diamondFadeTimeoutRef.current = window.setTimeout(() => {
      setIsDiamondFaded(true);
    }, 2000);
  };

  const revealControllerUI = () => {
    if (!isDiodeActive) {
      return;
    }
    clearFadeTimers();
    setAreControlsFaded(false);
    setIsDiamondFaded(false);
    scheduleFadeOut();
  };

  useEffect(() => {
    return () => {
      clearStatusHoldTimers();
      clearFadeTimers();
    };
  }, []);

  useEffect(() => {
    displayPointsBalanceRef.current = displayPointsBalance;
  }, [displayPointsBalance]);

  useEffect(() => {
    clearFadeTimers();
    if (!isDiodeActive) {
      setAreControlsFaded(false);
      setIsDiamondFaded(false);
      return;
    }
    setAreControlsFaded(false);
    setIsDiamondFaded(false);
    scheduleFadeOut();
    return () => {
      clearFadeTimers();
    };
  }, [isDiodeActive]);

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
    const slowDelta = Math.min(delta, 100);
    const slowStepInterval = Math.max(24, Math.min(80, Math.round(1200 / Math.max(slowDelta, 1))));
    const FAST_INTERVAL_MS = 20;
    const MAX_FAST_DURATION_MS = 480;
    const fastTarget = delta > slowDelta ? nextBalance - slowDelta : nextBalance;

    const startSlowPhase = () => {
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
      }, slowStepInterval);
    };

    if (delta > slowDelta) {
      const fastDelta = fastTarget - currentValue;
      const fastSteps = Math.max(1, Math.ceil(MAX_FAST_DURATION_MS / FAST_INTERVAL_MS));
      const fastStepSize = Math.max(1, Math.ceil(fastDelta / fastSteps));
      pointsTimerRef.current = window.setInterval(() => {
        currentValue = Math.min(fastTarget, currentValue + fastStepSize);
        setDisplayPointsBalance(currentValue);
        if (currentValue >= fastTarget) {
          if (pointsTimerRef.current !== null) {
            window.clearInterval(pointsTimerRef.current);
            pointsTimerRef.current = null;
          }
          startSlowPhase();
        }
      }, FAST_INTERVAL_MS);
    } else {
      startSlowPhase();
    }

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
    if (isDiodeActive) {
      revealControllerUI();
    }
    onStatusClick?.();
  };

  return (
    <nav
      className={`mobile-footer-nav${isFlashActive ? ' mobile-footer-nav--flash' : ''}${
        isCollapsed ? ' mobile-footer-nav--collapsed' : ''
      }${isSnapActive ? ' mobile-footer-nav--snap' : ''}${isDiodeActive ? ' mobile-footer-nav--diode-on' : ''}${
        areControlsFaded ? ' mobile-footer-nav--controls-faded' : ''
      }${isDiamondFaded ? ' mobile-footer-nav--diamond-faded' : ''}${
        isEnergyMenuOpen && isDiodeActive ? ' mobile-footer-nav--energy-focus' : ''
      }`}
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
            <button
              type="button"
              className="mobile-footer-nav__menu-button"
              onClick={() => {
                revealControllerUI();
                onOpenMenu();
              }}
            >
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
              {goldBreakdown && goldBreakdown.diamonds > 0 ? '💎' : '🪙'}
            </span>
            <span
              className={`mobile-footer-nav__diamond-value${
                isPointsAnimating ? ' mobile-footer-nav__diamond-value--active' : ''
              }`}
            >
              {goldBreakdown && goldBreakdown.diamonds > 0
                ? `${formattedDiamonds} · 🪙 ${formattedGoldRemainder}`
                : formattedGoldRemainder}
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
                        {isCompactGameStatus ? compactGameIcon : status.icon ?? '⭐️'}
                      </span>
                    </div>
                    <span className="mobile-footer-nav__status-label">
                      {status.label}
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
            const isEnergyItem = item.id === 'breathing-space' && Boolean(onEnergySelect);
            return (
              <li key={item.id} className={`mobile-footer-nav__item mobile-footer-nav__item--${item.id}`}>
                {isEnergyItem ? (
                  <div
                    className={`mobile-footer-nav__energy-menu${
                      isEnergyMenuOpen ? ' mobile-footer-nav__energy-menu--open' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="mobile-footer-nav__energy-button"
                      onClick={() => {
                        revealControllerUI();
                        onEnergySelect?.('mind');
                      }}
                      aria-label="Open mind energy tools"
                    >
                      <img src={mindIcon} alt="Mind icon" className="mobile-footer-nav__energy-icon" />
                      <span className="mobile-footer-nav__energy-label">Mind</span>
                    </button>
                    <button
                      type="button"
                      className="mobile-footer-nav__energy-button"
                      onClick={() => {
                        revealControllerUI();
                        onEnergySelect?.('body');
                      }}
                      aria-label="Open body energy tools"
                    >
                      <img src={bodyIcon} alt="Body icon" className="mobile-footer-nav__energy-icon" />
                      <span className="mobile-footer-nav__energy-label">Body</span>
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  className={`mobile-footer-nav__button ${
                    isActive ? 'mobile-footer-nav__button--active' : ''
                  }`}
                  onClick={() => {
                    revealControllerUI();
                    if (isEnergyItem) {
                      onEnergyToggle?.();
                      return;
                    }
                    onSelect(item.id);
                  }}
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
