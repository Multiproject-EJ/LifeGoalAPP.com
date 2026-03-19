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
import { awardDailyTreatGold } from '../../../services/dailyTreats';
import {
  getActiveAdventMeta,
  getAdventDoorCount,
} from '../../../services/treatCalendarService';
import { fetchHolidayPreferences } from '../../../services/holidayPreferences';
import { getHolidayThemeAssets } from '../../../services/holidayThemeAssets';

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

/** Map a holiday_key to a CSS theme modifier class. */
const HOLIDAY_THEME: Record<string, string> = {
  christmas:        'christmas',
  halloween:        'halloween',
  easter:           'easter',
  eid_mubarak:      'eid-mubarak',
  valentines_day:   'valentines',
  new_year:         'new-year',
  thanksgiving:     'thanksgiving',
  hanukkah:         'hanukkah',
  st_patricks_day:  'st-patricks',
};

export const CountdownCalendarModal = ({
  isOpen,
  onClose,
  userId,
}: CountdownCalendarModalProps) => {
  const [scratchState, setScratchState] = useState<ScratchCardState | null>(null);
  const [revealResult, setRevealResult] = useState<RevealCardResult | null>(null);
  const [activeAdvent, setActiveAdvent] = useState<ReturnType<typeof getActiveAdventMeta> | undefined>(undefined); // undefined = loading

  // Load holiday preferences then derive the active advent window
  useEffect(() => {
    if (!isOpen) return;
    setRevealResult(null);
    setScratchState(loadScratchCardState(userId));

    const loadAdvent = async () => {
      let enabledHolidays: Set<string> | undefined;
      if (userId) {
        const { data, error } = await fetchHolidayPreferences(userId);
        if (!error && data?.holidays) {
          enabledHolidays = new Set(
            Object.entries(data.holidays)
              .filter(([, v]) => v === true)
              .map(([k]) => k),
          );
        }
        // On error fall through with undefined → all holidays eligible
      }
      setActiveAdvent(getActiveAdventMeta(enabledHolidays));
    };

    void loadAdvent();
  }, [isOpen, userId]);

  useEffect(() => {
    if (!revealResult || !userId) return;
    if (revealResult.goldReward <= 0) return;
    void awardDailyTreatGold(
      userId,
      revealResult.goldReward,
      `Cycle ${revealResult.cycle} Day ${revealResult.day}`,
    );
  }, [revealResult, userId]);

  if (!isOpen) return null;

  // Still loading holiday prefs — avoid a flash of wrong content
  if (activeAdvent === undefined) return null;

  const resolvedState = scratchState ?? fallbackState;
  const alreadyOpenedToday = hasOpenedToday(resolvedState);

  // No active holiday countdown right now — show an empty state
  if (activeAdvent === null) {
    return (
      <div
        className="daily-treats-calendar daily-treats-calendar--holiday-none"
        role="dialog"
        aria-modal="true"
        aria-label="Holiday advent calendar"
      >
        <div className="daily-treats-modal__backdrop" onClick={onClose} role="presentation" />
        <div className="daily-treats-modal__dialog daily-treats-calendar__dialog">
          <button
            type="button"
            className="daily-treats-modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
          <div className="daily-treats-calendar__content">
            <p className="daily-treats-modal__eyebrow">Holiday Advent Calendar</p>
            <h3 className="daily-treats-calendar__title">No holiday countdown active 🗓️</h3>
            <p className="daily-treats-calendar__subtitle">
              Check back when the next holiday season starts! Enable your favourite holidays in
              Settings → Holiday Preferences to unlock their advent calendars.
            </p>
            <button type="button" className="daily-treats-calendar__button" onClick={onClose}>
              Back to Daily Treats
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { meta, daysRemaining } = activeAdvent;
  const totalDoors = getAdventDoorCount(meta);
  const themeMod = HOLIDAY_THEME[meta.holiday_key] ?? 'generic';
  const { calendarBackgroundUrl } = getHolidayThemeAssets(meta.holiday_key);

  // Cap the active day to the advent door count (advent windows are shorter than calendar months)
  const activeDay = Math.min(resolvedState.dayInCycle, totalDoors);

  const countdownLabel =
    daysRemaining === 0
      ? `🎉 Today is ${meta.displayName}!`
      : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} to go`;

  const hasOpenableHatch = Array.from({ length: activeDay }, (_, i) => {
    return !resolvedState.revealedSymbols?.[i + 1];
  }).some(Boolean);

  const isAdventComplete = alreadyOpenedToday && activeDay === totalDoors;

  return (
    <div
      className={`daily-treats-calendar daily-treats-calendar--holiday-${themeMod}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${meta.theme_name} advent calendar`}
    >
      <div className="daily-treats-modal__backdrop" onClick={onClose} role="presentation" />
      <div
        className={`daily-treats-modal__dialog daily-treats-calendar__dialog${
          calendarBackgroundUrl ? ' daily-treats-calendar__dialog--image' : ''
        }`}
        style={
          calendarBackgroundUrl
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.88)), url(${calendarBackgroundUrl})`,
              }
            : undefined
        }
      >
        <button
          type="button"
          className="daily-treats-modal__close"
          aria-label="Close advent calendar"
          onClick={onClose}
        >
          ×
        </button>
        <div className="daily-treats-calendar__content">
          <p className="daily-treats-modal__eyebrow">Holiday Advent Calendar</p>
          <h3 className="daily-treats-calendar__title">
            {meta.emojis[0]} {meta.theme_name}
          </h3>
          <p className="daily-treats-calendar__countdown">{countdownLabel}</p>
          <p className="daily-treats-calendar__subtitle">
            Day {activeDay} of {totalDoors}
            {alreadyOpenedToday
              ? ' • hatch opened for today!'
              : ' • open today\u2019s hatch to reveal your treat.'}
          </p>
          {hasOpenableHatch ? (
            <p className="daily-treats-calendar__hint">Tap today&apos;s hatch to open it.</p>
          ) : null}

          <div className="daily-treats-calendar__grid" role="list">
            {Array.from({ length: totalDoors }, (_, index) => {
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

              // Holiday emoji rotated through the door array; locked doors show a padlock
              const doorEmoji = meta.emojis[(day - 1) % meta.emojis.length];

              const hatchBody = (
                <>
                  <span className="daily-treats-calendar__hatch-number">{day}</span>
                  {revealedSymbol ? (
                    <span className="daily-treats-calendar__hatch-symbol" aria-hidden="true">
                      {revealedSymbol.emoji}
                    </span>
                  ) : (
                    <span className="daily-treats-calendar__hatch-status" aria-hidden="true">
                      {status === 'locked' ? '🔒' : doorEmoji}
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
              You opened today&apos;s hatch {meta.emojis[0]} Come back tomorrow for the next reveal.
            </div>
          ) : null}

          {isAdventComplete ? (
            <div className="daily-treats-calendar__rollover">
              <p className="daily-treats-calendar__rollover-title">
                Advent complete {meta.emojis[0]}
              </p>
              <p className="daily-treats-calendar__rollover-copy">
                You opened every door of the {meta.theme_name}. Enjoy the holiday — see you at the
                next countdown!
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
                    ? Array.from({ length: count }, (_, i) => (
                        <span key={`${symbol.name}-${i}`} aria-hidden="true">
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
