import { useEffect, useState } from 'react';
import {
  countdownToNextCycle,
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
  const isRestDay = dayInCycle > 25;
  const activeDay = Math.min(dayInCycle, 25);
  const countdown = isRestDay ? countdownToNextCycle(dayInCycle) : null;

  const subtitle = isRestDay
    ? `Rest day in progress • next cycle starts in ${countdown}`
    : `Day ${activeDay} of 25 • open today’s hatch to reveal your treat.`;
  const showScratchAction = !isRestDay && !revealResult;
  const revealedCard = revealResult && 'rest' in revealResult ? null : revealResult;
  const restResult = revealResult && 'rest' in revealResult ? revealResult : null;

  return (
    <div
      className="daily-treats-calendar"
      role="dialog"
      aria-modal="true"
      aria-label="25-day countdown calendar"
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
          <p className="daily-treats-modal__eyebrow">25-Day Countdown</p>
          <h3 className="daily-treats-calendar__title">Cycle {resolvedState.cycleIndex}</h3>
          <p className="daily-treats-calendar__subtitle">{subtitle}</p>
          <div className="daily-treats-calendar__grid" role="list">
            {Array.from({ length: 25 }, (_, index) => {
              const day = index + 1;
              const status = isRestDay
                ? 'opened'
                : day < dayInCycle
                  ? 'opened'
                  : day === dayInCycle
                    ? 'today'
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
                  <span className="daily-treats-calendar__hatch-status">
                    {status === 'opened' ? 'Opened' : status === 'today' ? 'Today' : 'Locked'}
                  </span>
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
          {revealedCard ? (
            <ScratchCardReveal result={revealedCard} />
          ) : restResult ? (
            <div className="daily-treats-calendar__rest">
              <p>Rest day active. Next cycle begins in {restResult.nextCycleStartsIn}.</p>
            </div>
          ) : null}
          <button type="button" className="daily-treats-calendar__button" onClick={onClose}>
            Back to Daily Treats
          </button>
        </div>
      </div>
    </div>
  );
};
