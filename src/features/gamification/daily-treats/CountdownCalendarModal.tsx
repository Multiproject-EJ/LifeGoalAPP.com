import { useEffect, useState } from 'react';
import {
  DEFAULT_SYMBOLS,
  hasOpenedToday,
  loadScratchCardState,
  revealScratchCardWithPersistence,
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

  const subtitle = `Day ${activeDay} of ${totalDaysInMonth} • open today’s hatch to reveal your treat.`;
  const showScratchAction = !revealResult && !alreadyOpenedToday;

  return (
    <div
      className="daily-treats-calendar"
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
          <div className="daily-treats-calendar__grid" role="list">
            {Array.from({ length: totalDaysInMonth }, (_, index) => {
              const day = index + 1;
              const revealedSymbol = resolvedState.revealedSymbols?.[day];
              const status = revealedSymbol
                ? 'opened'
                : day === activeDay
                  ? 'today'
                  : day < activeDay
                    ? 'missed'
                    : 'locked';
              const label = `Day ${day} ${status === 'today' ? '(today)' : `(${status})`}`;

              return (
                <div
                  key={`calendar-day-${day}`}
                  className={`daily-treats-calendar__hatch daily-treats-calendar__hatch--${status}`}
                  role="listitem"
                  aria-label={label}
                >
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
                          : status === 'missed'
                            ? 'Missed'
                            : 'Locked'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {showScratchAction ? (
            <button
              type="button"
              className="daily-treats-calendar__button"
              onClick={() => {
                const result = revealScratchCardWithPersistence(userId);
                setRevealResult(result);
                setScratchState(loadScratchCardState(userId));
              }}
            >
              Scratch today’s hatch
            </button>
          ) : null}
          {alreadyOpenedToday ? (
            <div className="daily-treats-calendar__rest">
              You opened today’s hatch. Come back tomorrow for the next reveal.
            </div>
          ) : null}
          {revealResult ? <ScratchCardReveal result={revealResult} /> : null}
          <div className="daily-treats-calendar__tracker">
            <p className="daily-treats-calendar__tracker-title">Reward tracker</p>
            <div className="daily-treats-calendar__tracker-grid">
              {DEFAULT_SYMBOLS.map((symbol) => {
                const count = resolvedState.symbolCounts?.[symbol.name] ?? 0;
                const isActive = count > 0;
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
                    <span className="daily-treats-calendar__tracker-label">
                      {count}/{symbol.needed}
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
