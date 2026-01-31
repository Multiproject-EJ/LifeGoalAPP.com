import { useEffect, useState } from 'react';
import {
  DEFAULT_SYMBOLS,
  hasOpenedToday,
  loadScratchCardState,
  revealScratchCardForDayWithPersistence,
  type RevealCardResult,
  type ScratchCardState,
} from './scratchCard';
import { ScratchCardReveal } from './ScratchCardReveal';

type CountdownCalendarModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
};

const fallbackState: ScratchCardState = {
  cycleIndex: 1,
  dayInCycle: 1,
  symbolCounts: {},
  revealedSymbols: {},
  cycleMonth: new Date().getMonth(),
  cycleYear: new Date().getFullYear(),
};

export const CountdownCalendarModal = ({
  isOpen,
  onClose,
  userId,
}: CountdownCalendarModalProps) => {
  const [scratchState, setScratchState] = useState<ScratchCardState | null>(null);
  const [revealResult, setRevealResult] = useState<RevealCardResult | null>(null);
  const themes = ['aurora', 'sunset', 'ocean', 'forest'];

  useEffect(() => {
    if (!isOpen) return;
    setScratchState(loadScratchCardState(userId));
    setRevealResult(null);
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const resolvedState = scratchState ?? fallbackState;
  const dayInCycle = resolvedState.dayInCycle;
  const totalDaysInMonth = new Date(
    resolvedState.cycleYear,
    resolvedState.cycleMonth + 1,
    0,
  ).getDate();
  const activeDay = Math.min(dayInCycle, totalDaysInMonth);
  const alreadyOpenedToday = hasOpenedToday(resolvedState);
  const monthLabel = new Date(resolvedState.cycleYear, resolvedState.cycleMonth).toLocaleString(
    'default',
    { month: 'long', year: 'numeric' },
  );
  const themeName = themes[(resolvedState.cycleIndex - 1) % themes.length];

  const subtitle = `Day ${activeDay} of ${totalDaysInMonth} • open any available hatch to reveal your treat.`;
  const isMonthComplete = alreadyOpenedToday && activeDay === totalDaysInMonth;
  const hasOpenableHatch = Array.from({ length: activeDay }, (_, index) => {
    const day = index + 1;
    return !resolvedState.revealedSymbols?.[day];
  }).some(Boolean);

  return (
    <div
      className={`daily-treats-calendar daily-treats-calendar--theme-${themeName}`}
      role="dialog"
      aria-modal="true"
      aria-label="Monthly treat calendar"
    >
      <div className="daily-treats-modal__backdrop" onClick={onClose} role="presentation" />
      <div className="daily-treats-modal__dialog daily-treats-calendar__dialog">
        <button
          type="button"
          className="daily-treats-modal__close"
          aria-label="Close countdown calendar"
          onClick={onClose}
        >
          ×
        </button>
        <div className="daily-treats-calendar__content">
          <p className="daily-treats-modal__eyebrow">Monthly Treat Calendar</p>
          <h3 className="daily-treats-calendar__title">
            {monthLabel} • Cycle {resolvedState.cycleIndex}
          </h3>
          <p className="daily-treats-calendar__subtitle">{subtitle}</p>
          {hasOpenableHatch ? (
            <p className="daily-treats-calendar__hint">Tap any available hatch to open it.</p>
          ) : null}
          <div className="daily-treats-calendar__grid" role="list">
            {Array.from({ length: totalDaysInMonth }, (_, index) => {
              const day = index + 1;
              const revealedSymbol = resolvedState.revealedSymbols?.[day];
              const status = revealedSymbol
                ? 'opened'
                : day === activeDay
                  ? 'today'
                  : day < activeDay
                    ? 'available'
                    : 'locked';
              const label = `Day ${day} ${status === 'today' ? '(today)' : `(${status})`}`;
              const canOpen = day <= activeDay && !revealedSymbol;

              const hatchBody = (
                <>
                  <span className="daily-treats-calendar__hatch-number">{day}</span>
                  {revealedSymbol ? (
                    <span className="daily-treats-calendar__hatch-symbol" aria-hidden="true">
                      {revealedSymbol.emoji}
                    </span>
                  ) : (
                    <span className="daily-treats-calendar__hatch-status">
                      {status === 'opened'
                        ? 'Opened'
                        : status === 'today'
                          ? 'Today'
                          : status === 'available'
                            ? 'Open'
                            : 'Locked'}
                    </span>
                  )}
                </>
              );

              return canOpen ? (
                <button
                  key={`calendar-day-${day}`}
                  type="button"
                  className={`daily-treats-calendar__hatch daily-treats-calendar__hatch--${status} daily-treats-calendar__hatch-button`}
                  role="listitem"
                  aria-label={label}
                  onClick={() => {
                    const result = revealScratchCardForDayWithPersistence(userId, day);
                    if (!result) return;
                    setRevealResult(result);
                    setScratchState(loadScratchCardState(userId));
                  }}
                >
                  {hatchBody}
                </button>
              ) : (
                <div
                  key={`calendar-day-${day}`}
                  className={`daily-treats-calendar__hatch daily-treats-calendar__hatch--${status}`}
                  role="listitem"
                  aria-label={label}
                >
                  {hatchBody}
                </div>
              );
            })}
          </div>
          {alreadyOpenedToday ? (
            <div className="daily-treats-calendar__rest">
              You opened today’s hatch. Come back tomorrow for the next reveal.
            </div>
          ) : null}
          {isMonthComplete ? (
            <div className="daily-treats-calendar__rollover">
              <p className="daily-treats-calendar__rollover-title">Cycle complete 🎉</p>
              <p className="daily-treats-calendar__rollover-copy">
                You finished every hatch for {monthLabel}. A fresh calendar starts tomorrow with a
                brand-new theme.
              </p>
            </div>
          ) : null}
          {revealResult ? <ScratchCardReveal result={revealResult} /> : null}
          <div className="daily-treats-calendar__tracker">
            <p className="daily-treats-calendar__tracker-title">Reward tracker</p>
            <div className="daily-treats-calendar__tracker-grid">
              {DEFAULT_SYMBOLS.map((symbol) => {
                const count = resolvedState.symbolCounts?.[symbol.name] ?? 0;
                const isActive = count > 0;
                const foundSymbols =
                  count > 0
                    ? Array.from({ length: count }, (_, index) => (
                        <span key={`${symbol.name}-${index}`} aria-hidden="true">
                          {symbol.emoji}
                        </span>
                      ))
                    : '—';
                return (
                  <div
                    key={`symbol-tracker-${symbol.name}`}
                    className={`daily-treats-calendar__tracker-item${
                      isActive ? ' daily-treats-calendar__tracker-item--active' : ''
                    }`}
                  >
                    <span className="daily-treats-calendar__tracker-emoji" aria-hidden="true">
                      {symbol.emoji}
                    </span>
                    <span
                      className="daily-treats-calendar__tracker-label"
                      aria-label={`${count} ${symbol.name} collected`}
                    >
                      {foundSymbols}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <button type="button" className="daily-treats-calendar__button" onClick={onClose}>
            Back to Daily Treats
          </button>
        </div>
      </div>
    </div>
  );
};
