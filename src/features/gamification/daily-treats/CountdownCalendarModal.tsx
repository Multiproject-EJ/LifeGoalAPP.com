import { useEffect, useState, useCallback } from 'react';
import {
  DEFAULT_SYMBOLS,
  hasOpenedToday,
  loadScratchCardState,
  revealScratchCardForDayWithPersistence,
  type RevealCardResult,
  type ScratchCardState,
} from './scratchCard';
import { ScratchCardReveal } from './ScratchCardReveal';
import { CalendarDoorFlip } from './CalendarDoorFlip';
import { CalendarDoorUnwrap } from './CalendarDoorUnwrap';
import { CalendarDoorScratch } from './CalendarDoorScratch';
import { awardDailyTreatGold } from '../../../services/dailyTreats';
import { awardDice } from '../../../services/gameRewards';
import {
  buildPreviewAdventMeta,
  fetchCurrentSeason,
  getActiveAdventMeta,
  getAdventDoorCount,
  getPersonalQuestSeason,
  isHabitCompletedToday,
  openTodayHatch,
  computeDoorStatus,
  getHatchesForDay,
  type CalendarSeasonData,
  type CalendarHatch,
  type DoorType,
  type DoorStatus,
  type HolidayKey,
  type RewardTier,
  type RewardCurrency,
  type RevealMechanic,
  type SeasonType,
} from '../../../services/treatCalendarService';
import { fetchHolidayPreferences } from '../../../services/holidayPreferences';
import { getHolidayThemeAssets } from '../../../services/holidayThemeAssets';

type CountdownCalendarModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  previewHolidayKey?: HolidayKey | null;
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

type RevealState = {
  isRevealing: boolean;
  dayIndex: number;
  doorType: DoorType;
  hatch: CalendarHatch | null;
};

export const CountdownCalendarModal = ({
  isOpen,
  onClose,
  userId,
  previewHolidayKey,
}: CountdownCalendarModalProps) => {
  const [scratchState, setScratchState] = useState<ScratchCardState | null>(null);
  const [revealResult, setRevealResult] = useState<RevealCardResult | null>(null);
  const [activeAdvent, setActiveAdvent] = useState<ReturnType<typeof getActiveAdventMeta> | undefined>(undefined);
  const [seasonData, setSeasonData] = useState<CalendarSeasonData | null>(null);
  const [habitCompleted, setHabitCompleted] = useState(false);
  const [revealState, setRevealState] = useState<RevealState | null>(null);
  const [symbolBonusNotification, setSymbolBonusNotification] = useState<string | null>(null);
  const [trackerExpanded, setTrackerExpanded] = useState(false);

  // Load holiday preferences then derive the active advent window and season data
  useEffect(() => {
    if (!isOpen) return;
    setRevealResult(null);
    setRevealState(null);
    setScratchState(loadScratchCardState(userId));

    const loadData = async () => {
      if (previewHolidayKey) {
        setActiveAdvent(buildPreviewAdventMeta(previewHolidayKey));
        return;
      }

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
      }
      
      const advent = getActiveAdventMeta(enabledHolidays);
      setActiveAdvent(advent);

      // Load season data from service (uses demo mode when not authenticated)
      if (userId) {
        if (advent) {
          // Holiday is active — fetch the holiday season
          const { data: season, error: seasonError } = await fetchCurrentSeason(userId, advent.meta.holiday_key);
          if (seasonError) {
            console.warn('Failed to load season data:', seasonError);
          } else if (season) {
            setSeasonData(season);
          }
        } else {
          // No active holiday — load Personal Quest Calendar as always-on fallback
          const { data: questSeason, error: questError } = await getPersonalQuestSeason(userId);
          if (questError) {
            console.warn('Failed to load personal quest season:', questError);
          } else if (questSeason) {
            setSeasonData(questSeason);
          }
        }
        // Check habit completion for bonus door gating
        const completed = await isHabitCompletedToday(userId);
        setHabitCompleted(completed);
      }
    };

    void loadData();
  }, [isOpen, previewHolidayKey, userId]);

  // Handle gold rewards from legacy scratch card system.
  // Symbol triples (symbolReward !== null) get a separate 'symbol_collection' dispatch
  // plus a brief toast notification; the remaining door gold is dispatched with the standard label.
  useEffect(() => {
    if (!revealResult || !userId) return;

    const SYMBOL_BONUS_GOLD = 150;

    if (revealResult.symbolReward) {
      // Symbol triple completed — dispatch bonus gold with 'symbol_collection' label
      void awardDailyTreatGold(userId, SYMBOL_BONUS_GOLD, 'symbol_collection');
      setSymbolBonusNotification(`🎉 Symbol bonus! +${SYMBOL_BONUS_GOLD} 🪙 gold for collecting 3 ${revealResult.symbolReward}s`);
      setTimeout(() => setSymbolBonusNotification(null), 4000);

      // Dispatch only the non-symbol portion of the gold reward
      const doorGold = revealResult.goldReward - SYMBOL_BONUS_GOLD;
      if (doorGold > 0) {
        void awardDailyTreatGold(userId, doorGold, `Cycle ${revealResult.cycle} Day ${revealResult.day}`);
      }
    } else if (revealResult.goldReward > 0) {
      void awardDailyTreatGold(
        userId,
        revealResult.goldReward,
        `Cycle ${revealResult.cycle} Day ${revealResult.day}`,
      );
    }
  }, [revealResult, userId]);

  const [doorError, setDoorError] = useState<string | null>(null);

  const handleOpenDoor = useCallback(async (dayIndex: number, doorType: DoorType, hatch: CalendarHatch) => {
    if (!userId || !seasonData) return;
    setDoorError(null);

    // Start reveal animation
    setRevealState({
      isRevealing: true,
      dayIndex,
      doorType,
      hatch,
    });

    try {
      // Call backend to record the open
      const { data: reward, error } = await openTodayHatch(userId, seasonData.season.id, dayIndex, doorType);
      
      if (error) {
        console.error('Failed to open hatch:', error);
        setDoorError(`Could not open door: ${error.message ?? 'Unknown error'}`);
        setRevealState(null);
        return;
      }

      // Award gold if applicable
      if (reward?.reward_currency === 'gold' && reward.reward_amount) {
        void awardDailyTreatGold(userId, reward.reward_amount, `Day ${dayIndex} ${doorType} door`);
      }

      // Award dice if applicable
      if (reward?.reward_currency === 'dice' && reward.reward_amount) {
        awardDice(userId, reward.reward_amount, 'daily_treats', `Day ${dayIndex} ${doorType} door`);
      }

      // Refresh season data to update progress
      if (seasonData.season.season_type === 'personal_quest') {
        const { data: updated } = await getPersonalQuestSeason(userId);
        if (updated) setSeasonData(updated);
      } else {
        const { data: updated } = await fetchCurrentSeason(userId, seasonData.season.holiday_key ?? undefined);
        if (updated) setSeasonData(updated);
      }
    } catch (err) {
      console.error('Door open failed unexpectedly:', err);
      setDoorError(`Something went wrong opening this door. Please try again.`);
      setRevealState(null);
    }
  }, [userId, seasonData]);

  const handleClaimReward = useCallback(() => {
    setRevealState(null);
  }, []);

  if (!isOpen) return null;

  // Still loading holiday prefs — avoid a flash of wrong content
  if (activeAdvent === undefined) return null;

  const resolvedState = scratchState ?? fallbackState;
  const alreadyOpenedToday = hasOpenedToday(resolvedState);

  // No season data available — show minimal fallback if Personal Quest also failed to load
  // (only reached if userId is missing or all season fetches failed)
  if (activeAdvent === null && !seasonData) {
    return (
      <div
        className="daily-treats-calendar daily-treats-calendar--personal-quest"
        role="dialog"
        aria-modal="true"
        aria-label="Personal Quest Calendar"
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
            <p className="daily-treats-modal__eyebrow">Personal Quest</p>
            <h3 className="daily-treats-calendar__title">🧭 Weekly Sprint</h3>
            <p className="daily-treats-calendar__subtitle">
              Sign in to access your Personal Quest Calendar and earn rewards every day!
            </p>
            <button type="button" className="daily-treats-calendar__button" onClick={onClose}>
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Use season data if available, otherwise fall back to advent meta
  const isPersonalQuest = seasonData?.season.season_type === 'personal_quest';
  const holidayKey = seasonData?.season.holiday_key ?? activeAdvent?.meta.holiday_key ?? null;
  const themeMod = isPersonalQuest ? 'personal-quest' : (holidayKey ? HOLIDAY_THEME[holidayKey] ?? 'generic' : 'generic');
  const themeAssets = holidayKey ? getHolidayThemeAssets(holidayKey) : null;
  const calendarBackgroundUrl = themeAssets?.calendarBackgroundUrl ?? null;

  // Calculate total doors and today's index
  const totalDoors = seasonData
    ? Math.max(...seasonData.hatches.filter(h => h.door_type === 'free').map(h => h.day_index))
    : (activeAdvent ? getAdventDoorCount(activeAdvent.meta) : 7);
  
  const todayIndex = seasonData?.today_day_index ?? Math.min(resolvedState.dayInCycle, totalDoors);
  const progress = seasonData?.progress;

  // Theme info
  const themeName = seasonData?.season.theme_name ?? activeAdvent?.meta.theme_name ?? 'Weekly Sprint';
  const themeEmojis = activeAdvent?.meta.emojis ?? ['🧭', '⭐', '🎯', '🏆', '💪'];
  const daysRemaining = activeAdvent?.daysRemaining ?? 0;

  const countdownLabel = isPersonalQuest
    ? `Day ${todayIndex} of ${totalDoors}`
    : daysRemaining === 0
      ? `🎉 Today is ${activeAdvent?.meta.displayName ?? themeName}!`
      : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} to go`;

  // Check if today's free door is already opened
  const todayFreeOpened = progress?.opened_days.includes(todayIndex) ?? false;
  const todayBonusOpened = progress?.opened_bonus_days?.includes(todayIndex) ?? false;
  const isAdventComplete = todayFreeOpened && todayIndex === totalDoors;

  // Render reveal modal if actively revealing
  if (revealState?.isRevealing && revealState.hatch) {
    const { hatch, dayIndex, doorType } = revealState;
    const emoji = hatch.symbol_emoji ?? themeEmojis[(dayIndex - 1) % themeEmojis.length];
    const tier = hatch.reward_tier ?? 2;
    const currency = hatch.reward_currency;
    const amount = hatch.reward_amount;
    const mechanic = hatch.reveal_mechanic ?? 'flip';

    return (
      <div
        className={`daily-treats-calendar daily-treats-calendar--holiday-${themeMod}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Revealing Day ${dayIndex} ${doorType} door`}
      >
        <div className="daily-treats-modal__backdrop" role="presentation" />
        <div className="daily-treats-modal__dialog daily-treats-calendar__dialog">
          <div className="daily-treats-calendar__content">
            <p className="daily-treats-modal__eyebrow">
              {doorType === 'bonus' ? '🎁 Bonus Door' : 'Daily Door'}
            </p>
            <h3 className="daily-treats-calendar__title">Day {dayIndex}</h3>
            
            {mechanic === 'flip' && (
              <CalendarDoorFlip
                dayNumber={dayIndex}
                emoji={emoji}
                tier={tier as RewardTier}
                currency={currency}
                amount={amount}
                holidayKey={holidayKey}
                onClaim={handleClaimReward}
                isPersonalQuest={isPersonalQuest}
              />
            )}
            {mechanic === 'unwrap' && (
              <CalendarDoorUnwrap
                dayNumber={dayIndex}
                emoji={emoji}
                tier={tier as RewardTier}
                currency={currency}
                amount={amount}
                holidayKey={holidayKey}
                onClaim={handleClaimReward}
                isPersonalQuest={isPersonalQuest}
                variant={doorType === 'bonus' ? 'gift' : 'envelope'}
              />
            )}
            {mechanic === 'scratch' && (
              <CalendarDoorScratch
                dayNumber={dayIndex}
                emoji={emoji}
                tier={tier as RewardTier}
                currency={currency}
                amount={amount}
                holidayKey={holidayKey}
                onClaim={handleClaimReward}
                isPersonalQuest={isPersonalQuest}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`daily-treats-calendar daily-treats-calendar--holiday-${themeMod}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${themeName} calendar`}
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
          aria-label="Close calendar"
          onClick={onClose}
        >
          ×
        </button>
        <div className="daily-treats-calendar__content">
          {symbolBonusNotification && (
            <div className="daily-treats-calendar__symbol-bonus-toast" role="status" aria-live="polite">
              {symbolBonusNotification}
            </div>
          )}
          {doorError && (
            <div className="daily-treats-calendar__error-toast" role="alert" aria-live="assertive">
              {doorError}
            </div>
          )}
          <p className="daily-treats-modal__eyebrow">
            {isPersonalQuest ? 'Personal Quest' : (activeAdvent ? `${activeAdvent.meta.displayName} Calendar` : 'Treat Calendar')}
          </p>
          <h3 className="daily-treats-calendar__title">
            {themeEmojis[0]} {themeName}
          </h3>
          <p className="daily-treats-calendar__countdown">{countdownLabel}</p>
          {!isPersonalQuest && (
            <p className="daily-treats-calendar__subtitle">
              {todayFreeOpened
                ? "Today's treat already revealed!"
                : "Open today's door to reveal your treat."}
            </p>
          )}

          {/* Bonus door status */}
          {!todayBonusOpened && (
            <p className="daily-treats-calendar__bonus-hint">
              {habitCompleted
                ? '✨ Bonus door ready — tap the gift to claim!'
                : '🎁 Complete a habit to unlock your bonus door'}
            </p>
          )}

          <div className="daily-treats-calendar__grid" role="list">
            {Array.from({ length: totalDoors }, (_, index) => {
              const day = index + 1;
              const isFinalDay = day === totalDoors;
              const { free: freeHatch, bonus: bonusHatch } = seasonData
                ? getHatchesForDay(seasonData.hatches, day)
                : { free: null, bonus: null };

              const freeOpened = progress?.opened_days.includes(day) ?? false;
              const bonusOpened = progress?.opened_bonus_days?.includes(day) ?? false;

              // Use legacy state for backwards compatibility
              const revealedSymbol = resolvedState.revealedSymbols?.[day];
              const isOpenedLegacy = Boolean(revealedSymbol);

              const seasonType = seasonData?.season.season_type as SeasonType | undefined;
              const status: DoorStatus = computeDoorStatus(day, todayIndex, freeOpened || isOpenedLegacy, 'free', seasonType);

              // Determine if free door can be opened:
              // - 'today' status: always openable
              // - 'catchup' status (holiday missed days): openable
              const canOpenFree = (status === 'today' || status === 'catchup') && !freeOpened && !isOpenedLegacy;
              const canOpenBonus = day === todayIndex && !bonusOpened && habitCompleted;

              const doorEmoji = themeEmojis[(day - 1) % themeEmojis.length];
              const statusLabel = status === 'catchup' ? 'missed day, available to open' : status;
              const label = `Day ${day} ${status === 'today' ? "(today's door)" : `(${statusLabel})`}`;

              const doorBody = (
                <>
                  <span className="daily-treats-calendar__hatch-number">{day}</span>
                  {(freeOpened || isOpenedLegacy) ? (
                    <span className="daily-treats-calendar__hatch-symbol" aria-hidden="true">
                      {revealedSymbol?.emoji ?? '✓'}
                    </span>
                  ) : (
                    <span className="daily-treats-calendar__hatch-status" aria-hidden="true">
                      {status === 'locked' ? '🔒' : status === 'missed' ? '✗' : status === 'catchup' ? '🔓' : doorEmoji}
                    </span>
                  )}
                </>
              );

              return (
                <div
                  key={`calendar-day-${day}`}
                  className={`daily-treats-calendar__day-pair${isFinalDay ? ' daily-treats-calendar__day-pair--final' : ''}`}
                >
                  {/* Free door */}
                  {canOpenFree && freeHatch ? (
                    <button
                      type="button"
                      className={`daily-treats-calendar__hatch daily-treats-calendar__hatch--${status} daily-treats-calendar__hatch-button`}
                      role="listitem"
                      aria-label={label}
                      onClick={() => {
                        if (freeHatch) {
                          // Brief delay lets the press spring-back animation complete before the reveal replaces the tile
                          setTimeout(() => void handleOpenDoor(day, 'free', freeHatch), 180);
                        } else {
                          // Legacy mode
                          setTimeout(() => {
                            const result = revealScratchCardForDayWithPersistence(userId, day);
                            if (!result) return;
                            setRevealResult(result);
                            setScratchState(loadScratchCardState(userId));
                          }, 180);
                        }
                      }}
                    >
                      {doorBody}
                    </button>
                  ) : canOpenFree && !freeHatch ? (
                    // Legacy mode without season data
                    <button
                      type="button"
                      className={`daily-treats-calendar__hatch daily-treats-calendar__hatch--${status} daily-treats-calendar__hatch-button`}
                      role="listitem"
                      aria-label={label}
                      onClick={() => {
                        setTimeout(() => {
                          const result = revealScratchCardForDayWithPersistence(userId, day);
                          if (!result) return;
                          setRevealResult(result);
                          setScratchState(loadScratchCardState(userId));
                        }, 180);
                      }}
                    >
                      {doorBody}
                    </button>
                  ) : (
                    <div
                      className={`daily-treats-calendar__hatch daily-treats-calendar__hatch--${status}`}
                      role="listitem"
                      aria-label={label}
                    >
                      {doorBody}
                    </div>
                  )}

                  {/* Bonus door indicator for today */}
                  {day === todayIndex && bonusHatch && (
                    <button
                      type="button"
                      className={`daily-treats-calendar__bonus-door ${
                        bonusOpened
                          ? 'daily-treats-calendar__bonus-door--opened'
                          : habitCompleted
                            ? 'daily-treats-calendar__bonus-door--unlocked'
                            : 'daily-treats-calendar__bonus-door--locked'
                      }`}
                      disabled={!canOpenBonus}
                      onClick={() => {
                        if (canOpenBonus) {
                          // Brief delay lets the press animation complete before the reveal appears
                          setTimeout(() => void handleOpenDoor(day, 'bonus', bonusHatch), 150);
                        }
                      }}
                      aria-label={`Bonus door for day ${day}${habitCompleted ? ' - unlocked' : ' - locked'}`}
                    >
                      {bonusOpened ? '✓' : '🎁'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {todayFreeOpened && !todayBonusOpened && habitCompleted && (
            <div className="daily-treats-calendar__bonus-reminder">
              Your bonus door is ready to open! Tap the 🎁 to claim extra rewards.
            </div>
          )}

          {todayFreeOpened && todayBonusOpened ? (
            <div className="daily-treats-calendar__rest">
              You revealed all of today&apos;s treats {themeEmojis[0]} Come back tomorrow for more!
            </div>
          ) : todayFreeOpened ? (
            <div className="daily-treats-calendar__rest">
              You revealed today&apos;s free treat {themeEmojis[0]} 
              {!todayBonusOpened && !habitCompleted && ' Complete a habit to unlock the bonus door!'}
            </div>
          ) : null}

          {isAdventComplete ? (
            <div className="daily-treats-calendar__rollover">
              <p className="daily-treats-calendar__rollover-title">
                {isPersonalQuest ? 'Quest complete' : 'Advent complete'} {themeEmojis[0]}
              </p>
              <p className="daily-treats-calendar__rollover-copy">
                You opened every door of the {themeName}. 
                {isPersonalQuest
                  ? 'A new quest begins next week!'
                  : 'Enjoy the holiday — see you at the next calendar!'}
              </p>
            </div>
          ) : null}

          {/* Legacy scratch card reveal for backwards compatibility */}
          {revealResult ? <ScratchCardReveal result={revealResult} /> : null}

          <div className={`daily-treats-calendar__tracker${trackerExpanded ? '' : ' daily-treats-calendar__tracker--collapsed'}`}>
            <button
              type="button"
              className="daily-treats-calendar__tracker-toggle"
              onClick={() => setTrackerExpanded(prev => !prev)}
              aria-expanded={trackerExpanded}
              aria-label={trackerExpanded ? 'Collapse reward tracker' : 'Expand reward tracker'}
            >
              <span>Reward tracker</span>
              <span aria-hidden="true">{trackerExpanded ? '▲' : '▼'}</span>
            </button>
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
