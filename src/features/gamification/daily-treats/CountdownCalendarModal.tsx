import { useEffect, useState, useCallback, useRef, type CSSProperties } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  DEFAULT_SYMBOLS,
  hasOpenedToday,
  loadScratchCardState,
  revealScratchCardForDayWithPersistence,
  type RevealCardResult,
  type ScratchCardState,
} from './scratchCard';
import confetti from 'canvas-confetti';
import { ScratchCardReveal } from './ScratchCardReveal';
import {
  GiftBoxOpeningAnimation,
  preloadGiftBoxOpeningAnimation,
  type GiftBoxRewardItem,
} from '../../../components/GiftBoxOpeningAnimation';
import { awardDailyTreatDice, awardDailyTreatGold } from '../../../services/dailyTreats';
import { playIslandRunSound } from '../level-worlds/services/islandRunAudio';
import { applyEssenceAward } from '../level-worlds/services/islandRunStateActions';
import {
  buildPreviewAdventMeta,
  fetchCurrentSeason,
  getActiveAdventMeta,
  getAdventDoorCount,
  getHolidayGreetingLabel,
  getPersonalQuestSeason,
  isHabitCompletedToday,
  openTodayHatch,
  computeDoorStatus,
  getHatchesForDay,
  computeStreak,
  formatLocalYmd,
  type CalendarSeasonData,
  type CalendarHatch,
  type DoorType,
  type DoorStatus,
  type HolidayKey,
  type RewardCurrency,
  type SeasonType,
} from '../../../services/treatCalendarService';
import { fetchHolidayPreferences } from '../../../services/holidayPreferences';
import { getHolidayThemeAssets } from '../../../services/holidayThemeAssets';
import { refreshQuestHabit, type QuestHabit } from '../../../services/questHabit';

type CountdownCalendarModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  islandRunSession?: Session | null;
  previewHolidayKey?: HolidayKey | null;
  mode?: 'auto' | 'holiday' | 'personal_quest';
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

type RevealOrigin = {
  x: number;
  y: number;
};

type RewardToast = {
  /** Monotonic id so re-opening a door retriggers the float-in animation. */
  id: number;
  /** Viewport position of the tapped door's center, in px. */
  x: number;
  y: number;
  icon: string;
  label: string;
  tier: number;
};

type PendingGiftReveal = {
  id: number;
  x: number;
  y: number;
  tier: number;
  rewards: GiftBoxRewardItem[];
};

/** ms to wait after press before opening the reveal — lets the spring snap-back animation complete */
const PRESS_ANIMATION_DELAY_MS = 180;

/**
 * The "bonus awakened" celebration banner is a first-use helper, not a daily
 * reminder. It teaches the same-day bonus mechanic the first time a user's
 * Personal Quest bonus wakes up; afterwards the door can keep glowing/tappable
 * without re-showing explanatory copy on future days.
 */
const BONUS_AWAKENED_SEEN_KEY = 'lifegoal:daily-treats:bonus-awakened-first-use-seen';

const hasSeenBonusAwakened = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(BONUS_AWAKENED_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
};

const markBonusAwakenedSeen = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BONUS_AWAKENED_SEEN_KEY, 'true');
  } catch {
    // Ignore storage failures (private mode / quota) — worst case the helper
    // shows again, which is harmless.
  }
};

const DAILY_TREAT_CONFETTI_COLORS = [
  '#fbbf24', // gold
  '#f59e0b', // amber
  '#34d399', // emerald
  '#60a5fa', // sky
  '#a78bfa', // violet
  '#ffffff', // white
];

/**
 * Burst confetti outward from a screen point — the tapped door's center — so
 * opening a door feels tactile. Falls back to the viewport center when no
 * origin is supplied. canvas-confetti renders its own fixed, pointer-events:none
 * canvas above the calendar modal, and no-ops under reduced motion.
 */
const burstDoorConfetti = (origin: RevealOrigin | null): void => {
  if (typeof window === 'undefined') return;
  const x = origin ? origin.x / window.innerWidth : 0.5;
  const y = origin ? origin.y / window.innerHeight : 0.5;
  confetti({
    particleCount: 80,
    spread: 75,
    startVelocity: 42,
    gravity: 0.95,
    scalar: 0.9,
    ticks: 160,
    origin: { x, y },
    colors: DAILY_TREAT_CONFETTI_COLORS,
    disableForReducedMotion: true,
  });
};

/**
 * Map an authoritative reward into the brief floating toast shown near the
 * door. Mirrors RewardCard's icon/label conventions (dice vs gold vs money,
 * and the tier-1 "nothing" door).
 */
const formatRewardToast = (
  reward: { reward_currency: RewardCurrency; reward_amount: number | null; reward_tier?: number | null },
  isPersonalQuest: boolean,
  diceLabel: string,
): { icon: string; label: string; tier: number } => {
  const tier = reward.reward_tier ?? 2;
  const amount = reward.reward_amount ?? 0;
  if (tier === 1 || amount <= 0) {
    return { icon: '✦', label: 'Nothing today', tier };
  }
  if (reward.reward_currency === 'dice') {
    return { icon: '🎲', label: `+${amount} ${diceLabel}`.trim(), tier };
  }
  if (isPersonalQuest) {
    return { icon: '💰', label: `+${amount} Money`, tier };
  }
  return { icon: '🪙', label: `+${amount} Gold`, tier };
};

const formatGiftReward = (
  reward: { reward_currency: RewardCurrency; reward_amount: number | null; reward_tier?: number | null },
  usesMoneyLabel: boolean,
  id: number,
): GiftBoxRewardItem => {
  const amount = Math.max(0, reward.reward_amount ?? 0);
  if ((reward.reward_tier ?? 2) === 1 || amount === 0) {
    return { id: `gift-${id}-empty`, icon: '✦', amount: '0', accessibleLabel: 'Nothing this time' };
  }
  if (reward.reward_currency === 'dice') {
    return { id: `gift-${id}-dice`, icon: '🎲', amount: String(amount), accessibleLabel: `${amount} Dice` };
  }
  const label = usesMoneyLabel ? 'Money' : 'Gold';
  return {
    id: `gift-${id}-${label.toLowerCase()}`,
    icon: usesMoneyLabel ? '💰' : '🪙',
    amount: String(amount),
    accessibleLabel: `${amount} ${label}`,
  };
};

export const CountdownCalendarModal = ({
  isOpen,
  onClose,
  userId,
  islandRunSession,
  previewHolidayKey,
  mode = 'auto',
}: CountdownCalendarModalProps) => {
  const [scratchState, setScratchState] = useState<ScratchCardState | null>(null);
  const [revealResult, setRevealResult] = useState<RevealCardResult | null>(null);
  const [activeAdvent, setActiveAdvent] = useState<ReturnType<typeof getActiveAdventMeta> | undefined>(undefined);
  const [seasonData, setSeasonData] = useState<CalendarSeasonData | null>(null);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [habitCompleted, setHabitCompleted] = useState(false);
  const [questHabit, setQuestHabit] = useState<QuestHabit | null>(null);
  const [rewardToast, setRewardToast] = useState<RewardToast | null>(null);
  const [pendingGiftReward, setPendingGiftReward] = useState<PendingGiftReveal | null>(null);
  const rewardToastIdRef = useRef(0);
  const [symbolBonusNotification, setSymbolBonusNotification] = useState<string | null>(null);
  const [trackerExpanded, setTrackerExpanded] = useState(false);
  const [showBonusAwakenedPopup, setShowBonusAwakenedPopup] = useState(false);
  const modalOpenSfxPlayedRef = useRef(false);

  // App-level scroll locking owns the Daily Treats calendar lock so closing this
  // modal cannot race with the PWA fullscreen/body restore sequence.
  useEffect(() => {
    if (!isOpen) {
      modalOpenSfxPlayedRef.current = false;
      return;
    }

    if (!modalOpenSfxPlayedRef.current) {
      playIslandRunSound('shop_open');
      modalOpenSfxPlayedRef.current = true;
    }
    preloadGiftBoxOpeningAnimation();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    setRevealResult(null);
    setRewardToast(null);
    setPendingGiftReward(null);
    setSeasonData(null);
    setActiveAdvent(undefined);
    setIsCalendarLoading(false);
  }, [isOpen]);

  // Auto-dismiss the floating reward toast a couple seconds after it appears.
  useEffect(() => {
    if (!rewardToast) return;
    const timer = window.setTimeout(() => {
      setRewardToast((current) => (current?.id === rewardToast.id ? null : current));
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [rewardToast]);

  // Gate the same-day "bonus awakened" celebration banner as a first-use helper.
  // The bonus stays "awakened" (free door opened + quest habit complete + bonus
  // not yet opened) until the bonus door is opened, and the same mechanic can
  // happen again on future days. Persisting a single first-use flag keeps this
  // explanation from becoming a recurring reminder while preserving the glowing
  // active door state. Self-contained (derives its own values) so it can live
  // with the other hooks above the component's conditional early returns.
  useEffect(() => {
    const progress = seasonData?.progress;
    const dayIndex = seasonData?.today_day_index ?? 0;
    if (!seasonData || !habitCompleted || !progress || !dayIndex) {
      setShowBonusAwakenedPopup(false);
      return;
    }
    const { bonus } = getHatchesForDay(seasonData.hatches, dayIndex);
    const freeOpened = progress.opened_days.includes(dayIndex);
    const bonusOpened = progress.opened_bonus_days?.includes(dayIndex) ?? false;
    if (!bonus || !freeOpened || bonusOpened) {
      setShowBonusAwakenedPopup(false);
      return;
    }
    if (hasSeenBonusAwakened()) {
      // Already taught this feature — keep the bonus door active, no banner.
      setShowBonusAwakenedPopup(false);
      return;
    }
    setShowBonusAwakenedPopup(true);
    markBonusAwakenedSeen();
  }, [seasonData, habitCompleted]);

  // Load holiday preferences then derive the active advent window and season data
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    setRevealResult(null);
    setRewardToast(null);
    setSeasonData(null);
    setActiveAdvent(undefined);
    setIsCalendarLoading(true);
    setScratchState(loadScratchCardState(userId));

    const loadData = async () => {
      try {
        if (previewHolidayKey) {
          if (!cancelled) {
            setActiveAdvent(buildPreviewAdventMeta(previewHolidayKey));
          }
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
        
        const advent = mode === 'personal_quest' ? null : getActiveAdventMeta(enabledHolidays);

        // Load season data from service (uses demo mode when not authenticated)
        if (userId) {
          if (advent) {
            // Holiday is active — fetch the holiday season
            const { data: season, error: seasonError } = await fetchCurrentSeason(userId, advent.meta.holiday_key);
            if (seasonError) {
              console.warn('Failed to load season data:', seasonError);
            } else if (season && !cancelled) {
              setSeasonData(season);
            }
          } else if (mode !== 'holiday') {
            // No active holiday — load Personal Quest Calendar as always-on fallback
            const { data: questSeason, error: questError } = await getPersonalQuestSeason(userId);
            if (questError) {
              console.warn('Failed to load personal quest season:', questError);
            } else if (questSeason && !cancelled) {
              setSeasonData(questSeason);
            }
          } else if (!cancelled) {
            setSeasonData(null);
          }
          // Load the user's designated quest habit (if any) then check completion
          const qh = await refreshQuestHabit(userId);
          if (!cancelled) {
            setQuestHabit(qh);
          }
          const completed = await isHabitCompletedToday(userId, qh?.habitId);
          if (!cancelled) {
            setHabitCompleted(completed);
          }
        }

        if (!cancelled) {
          setActiveAdvent(advent);
        }
      } finally {
        if (!cancelled) {
          setIsCalendarLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [isOpen, mode, previewHolidayKey, userId]);

  // Handle gold rewards from legacy scratch card system.
  // Symbol triples (symbolReward !== null) get a separate 'symbol_collection' dispatch
  // plus a brief toast notification; the remaining door gold is dispatched with the standard label.
  useEffect(() => {
    if (!revealResult || !userId) return;

    const SYMBOL_BONUS_GOLD = 150;

    if (revealResult.symbolReward) {
      // Symbol triple completed — dispatch bonus gold with 'symbol_collection' label
      void awardDailyTreatGold(userId, SYMBOL_BONUS_GOLD, 'symbol_collection');
      setSymbolBonusNotification(`🎉 Symbol bonus! +${SYMBOL_BONUS_GOLD} 🪙 Gold for collecting 3 ${revealResult.symbolReward}s`);
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
  // Doors currently mid-open request — blocks double-tap double-opens while
  // the award round-trip is in flight.
  const [openingDoorKey, setOpeningDoorKey] = useState<string | null>(null);

  const handleGiftBoxOpeningComplete = useCallback(() => {
    if (!pendingGiftReward) return;
    setPendingGiftReward(null);
    burstDoorConfetti({ x: pendingGiftReward.x, y: pendingGiftReward.y });
    if (pendingGiftReward.tier > 1) {
      playIslandRunSound('reward_bar_claim_burst');
    }
  }, [pendingGiftReward]);

  const handleOpenDoor = useCallback(async (dayIndex: number, doorType: DoorType, hatch: CalendarHatch, origin: RevealOrigin | null = null) => {
    if (!userId || !seasonData) return;
    const doorKey = `${dayIndex}:${doorType}`;
    if (openingDoorKey) return;
    setOpeningDoorKey(doorKey);
    setDoorError(null);

    // Ordinary doors keep their instant tap feedback. Bonus doors reserve the
    // confetti for the moment the gift animation finishes.
    if (doorType !== 'bonus') {
      burstDoorConfetti(origin);
    }

    try {
      // Call backend to record the open
      const { data: reward, error } = await openTodayHatch(userId, seasonData.season.id, dayIndex, doorType);
      
      if (error) {
        console.error('Failed to open hatch:', error);
        setDoorError(`Could not open door: ${error.message ?? 'Unknown error'}`);
        return;
      }

      // The authoritative server/service response is the source of truth for
      // what was granted (server-side rules can differ from the cached hatch).
      if (!reward) {
        setDoorError('Could not open door: reward details were unavailable.');
        return;
      }

      // Award essence in Island Run sessions; award gold elsewhere.
      if (reward?.reward_currency === 'gold' && reward.reward_amount) {
        if (islandRunSession) {
          applyEssenceAward({
            session: islandRunSession,
            client: null,
            amount: reward.reward_amount,
            islandRunContractV2Enabled: true,
            triggerSource: `daily_treat_day_${dayIndex}_${doorType}_door`,
          });
        } else {
          void awardDailyTreatGold(userId, reward.reward_amount, `Day ${dayIndex} ${doorType} door`);
        }
      }

      // Award dice if applicable
      if (reward?.reward_currency === 'dice' && reward.reward_amount) {
        awardDailyTreatDice({
          userId,
          diceAmount: reward.reward_amount,
          sourceLabel: `Day ${dayIndex} ${doorType} door`,
          islandRunSession,
        });
      }

      // Award streak bonus dice for Personal Quest calendars.
      // We mirror the server-side streak_count update so the bonus reflects
      // the *new* consecutive-day streak (incremented when the previous open
      // was yesterday, reset to 1 after a missed day).
      if (seasonData.season.season_type === 'personal_quest' && doorType === 'free') {
        const todayStr = formatLocalYmd(new Date());
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = formatLocalYmd(yesterdayDate);
        const prev = seasonData.progress;
        const prevStreak = prev?.streak_count ?? prev?.opened_days.length ?? 0;
        const nextStreak =
          prev?.last_opened_date === todayStr
            ? Math.max(1, prevStreak)
            : prev?.last_opened_date === yesterdayStr
              ? prevStreak + 1
              : 1;
        const updatedProgressForStreak = prev
          ? {
              ...prev,
              opened_days: [...prev.opened_days, dayIndex],
              last_opened_date: todayStr,
              streak_count: nextStreak,
            }
          : null;
        const streak = computeStreak(updatedProgressForStreak);
        if (streak.streakBonusDice > 0) {
          awardDailyTreatDice({
            userId,
            diceAmount: streak.streakBonusDice,
            sourceLabel: `${streak.currentStreak}-day streak bonus`,
            islandRunSession,
          });
        }
      }

      // Ordinary doors use the brief anchored toast. Bonus doors pass the exact
      // granted amount into the Gift Box so its icon and number emerge from the
      // opening itself. Tier-1 ("nothing") rewards skip the celebratory sound.
      const rewardSummary = formatRewardToast(
        reward,
        seasonData.season.season_type === 'personal_quest',
        islandRunSession ? '' : 'Game Dice',
      );
      const rewardId = (rewardToastIdRef.current += 1);
      const nextRewardToast: RewardToast = {
        id: rewardId,
        x: origin?.x ?? window.innerWidth / 2,
        y: origin?.y ?? window.innerHeight / 2,
        icon: rewardSummary.icon,
        label: rewardSummary.label,
        tier: rewardSummary.tier,
      };
      if (doorType === 'bonus') {
        setPendingGiftReward({
          id: rewardId,
          x: nextRewardToast.x,
          y: nextRewardToast.y,
          tier: nextRewardToast.tier,
          rewards: [formatGiftReward(
            reward,
            seasonData.season.season_type === 'personal_quest' || Boolean(islandRunSession),
            rewardId,
          )],
        });
      } else {
        if (rewardSummary.tier > 1) {
          playIslandRunSound('reward_bar_claim_burst');
        }
        setRewardToast(nextRewardToast);
      }

      // Refresh season data to update progress
      if (seasonData.season.season_type === 'personal_quest') {
        const { data: updated } = await getPersonalQuestSeason(userId);
        if (updated) setSeasonData(updated);
      } else {
        const { data: updated } = await fetchCurrentSeason(userId, seasonData.season.holiday_key ?? undefined);
        if (updated) setSeasonData(updated);
      }

      // Notify in-app listeners (e.g. the Today-tab TimeBoundOfferRow) that a
      // treat-calendar door was opened so they can refresh their "collected"
      // state without waiting for a window focus / visibility change.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lifegoal:treat-calendar-opened'));
      }
    } catch (err) {
      console.error('Door open failed unexpectedly:', err);
      setDoorError(`Something went wrong opening this door. Please try again.`);
    } finally {
      setOpeningDoorKey(null);
    }
  }, [userId, seasonData, islandRunSession, openingDoorKey]);

  if (!isOpen) return null;

  // Still loading calendar data — avoid a flash of fallback content before the
  // Personal Quest or holiday season request resolves.
  if (activeAdvent === undefined || isCalendarLoading) return null;

  const resolvedState = scratchState ?? fallbackState;
  const alreadyOpenedToday = hasOpenedToday(resolvedState);

  // No season data available — show minimal fallback if Personal Quest also failed to load
  // (only reached if userId is missing or all season fetches failed)
  if (activeAdvent === null && !seasonData) {
    if (mode === 'holiday') {
      return (
        <div
          className="daily-treats-calendar daily-treats-calendar--personal-quest"
          role="dialog"
          aria-modal="true"
          aria-label="Holiday Calendar unavailable"
        >
          <div className="daily-treats-calendar__backdrop" onClick={onClose} role="presentation" />
          <div className="daily-treats-calendar__dialog">
            <button
              type="button"
              className="daily-treats-calendar__close"
              aria-label="Close"
              onClick={onClose}
            >
              ×
            </button>
            <div className="daily-treats-calendar__content">
              <p className="daily-treats-calendar__eyebrow">Holiday Calendar</p>
              <h3 className="daily-treats-calendar__title">No active holiday season</h3>
              <p className="daily-treats-calendar__subtitle">
                Check back during an enabled holiday countdown to open doors here.
              </p>
              <button type="button" className="daily-treats-calendar__button" onClick={onClose}>
                Got it
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className="daily-treats-calendar daily-treats-calendar--personal-quest"
        role="dialog"
        aria-modal="true"
        aria-label="Personal Quest Calendar"
      >
        <div className="daily-treats-calendar__backdrop" onClick={onClose} role="presentation" />
        <div className="daily-treats-calendar__dialog">
          <button
            type="button"
            className="daily-treats-calendar__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
          <div className="daily-treats-calendar__content">
            <p className="daily-treats-calendar__eyebrow">Personal Quest</p>
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
  const calendarBackgroundUrl = isPersonalQuest
    ? '/icons/DAILY%20TREAT/dailymomentumnight.webp'
    : (themeAssets?.calendarBackgroundUrl ?? null);
  // Which text tone keeps copy readable over the calendar art. The Personal
  // Quest night background is very dark → all-light text; holiday art declares
  // its own tone. Without a background image the default light dialog keeps
  // dark text.
  const textTone: 'light' | 'dark' = calendarBackgroundUrl
    ? (isPersonalQuest ? 'light' : (themeAssets?.calendarTextTone ?? 'light'))
    : 'dark';

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
      ? `🎉 Today is ${activeAdvent ? getHolidayGreetingLabel(activeAdvent.meta) : themeName}!`
      : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} to go`;

  const personalQuestStreak = isPersonalQuest && seasonData?.progress
    ? computeStreak(seasonData.progress)
    : null;
  const showPersonalQuestStreak = Boolean(personalQuestStreak && personalQuestStreak.currentStreak >= 2);
  const dailyTreatDiceLabel = islandRunSession ? '' : 'Game Dice';

  // Check if today's free door is already opened
  const todayFreeOpened = progress?.opened_days.includes(todayIndex) ?? false;
  const todayBonusOpened = progress?.opened_bonus_days?.includes(todayIndex) ?? false;
  const isAdventComplete = todayFreeOpened && todayIndex === totalDoors;

  // Pre-compute today's bonus hatch. Bonus doors are same-day overlays for
  // the current calendar day, tracked separately from the free door via
  // opened_bonus_days; they are not the next day's free door.
  const { bonus: todayBonusHatch } = seasonData
    ? getHatchesForDay(seasonData.hatches, todayIndex)
    : { bonus: null };

  // The same-day bonus is an overlay that only becomes reachable *after* today's
  // free door is opened (see canOpenSameDayBonus below, which requires freeOpened).
  // Gate the "Finish your quest habit to wake the door" hint on todayFreeOpened so
  // the calendar doesn't pop into focused "BONUS" mode before the user has even
  // opened today's free door.
  const showLockedBonusHint = Boolean(
    todayBonusHatch && todayFreeOpened && !habitCompleted && !todayBonusOpened,
  );

  return (
    <div
      className={`daily-treats-calendar daily-treats-calendar--holiday-${themeMod} daily-treats-calendar--text-${textTone}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${themeName} calendar`}
    >
      <div className="daily-treats-calendar__backdrop" onClick={onClose} role="presentation" />
      {pendingGiftReward && (
        <div className="daily-treats-calendar__gift-opening" role="presentation">
          <GiftBoxOpeningAnimation
            key={pendingGiftReward.id}
            rewards={pendingGiftReward.rewards}
            onComplete={handleGiftBoxOpeningComplete}
          />
        </div>
      )}
      {rewardToast && (
        <div
          key={rewardToast.id}
          className={`daily-treats-calendar__reward-toast daily-treats-calendar__reward-toast--tier-${rewardToast.tier}`}
          style={{ left: `${rewardToast.x}px`, top: `${rewardToast.y}px` } as CSSProperties}
          role="status"
          aria-live="polite"
        >
          <span className="daily-treats-calendar__reward-toast-icon" aria-hidden="true">{rewardToast.icon}</span>
          <span className="daily-treats-calendar__reward-toast-label">{rewardToast.label}</span>
        </div>
      )}
      <div
        className={`daily-treats-calendar__dialog${
          calendarBackgroundUrl ? ' daily-treats-calendar__dialog--image' : ''
        }`}
        style={
          calendarBackgroundUrl
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.88)), url(${calendarBackgroundUrl})`,
                backgroundSize: 'cover, contain',
                backgroundPosition: 'center, center top',
                backgroundRepeat: 'no-repeat, no-repeat',
              }
            : undefined
        }
      >
        <button
          type="button"
          className="daily-treats-calendar__close"
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
          <p className="daily-treats-calendar__eyebrow">
            {isPersonalQuest ? 'Personal Quest' : (activeAdvent ? `${activeAdvent.meta.displayName} Calendar` : 'Treat Calendar')}
          </p>
          {isPersonalQuest ? (
            <img
              src="/icons/DAILY%20TREAT/dailymomentum_title.webp"
              alt="Daily Momentum"
              className="daily-treats-calendar__title-image"
            />
          ) : (
            <h3 className="daily-treats-calendar__title">
              {themeEmojis[0]} {themeName}
            </h3>
          )}
          <p className="daily-treats-calendar__countdown">{countdownLabel}</p>
          {!isPersonalQuest && (
            <p className="daily-treats-calendar__subtitle">
              {todayFreeOpened
                ? "Today's treat already revealed!"
                : "Open today's door to reveal your treat."}
            </p>
          )}

          {showPersonalQuestStreak && personalQuestStreak ? (
            <div
              className={`daily-treats-calendar__streak${showLockedBonusHint ? ' daily-treats-calendar__streak--bonus-message-active' : ''}`}
              aria-label={`${personalQuestStreak.currentStreak}-day Personal Quest streak`}
            >
              <div className="daily-treats-calendar__streak-orb" aria-hidden="true">
                <span className="daily-treats-calendar__streak-flame">🔥</span>
              </div>
              <div className="daily-treats-calendar__streak-copy">
                <p className="daily-treats-calendar__streak-kicker">Quest streak</p>
                <p className="daily-treats-calendar__streak-label">
                  {`${personalQuestStreak.currentStreak}-day streak${personalQuestStreak.multiplierLabel ? ` ${personalQuestStreak.multiplierLabel}` : ''}`}
                  {personalQuestStreak.streakBonusDice > 0 && ` · +${personalQuestStreak.streakBonusDice} 🎲 ${dailyTreatDiceLabel} bonus`}
                </p>
                {personalQuestStreak.currentStreak > 0 && personalQuestStreak.currentStreak < 7 && (
                  <p className="daily-treats-calendar__streak-hint">
                    Come back tomorrow to keep your streak alive!
                  </p>
                )}
              </div>
              <div className="daily-treats-calendar__streak-bar" aria-hidden="true">
                {Array.from({ length: 7 }, (_, i) => (
                  <div
                    key={`streak-dot-${i}`}
                    className={`daily-treats-calendar__streak-dot${
                      i < personalQuestStreak.currentStreak ? ' daily-treats-calendar__streak-dot--filled' : ''
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {/* Same-day bonus first-use helper — fires only once; on later opens
              the glowing Day tile stays active without re-popping. */}
          {showBonusAwakenedPopup && (
            <div className="daily-treats-calendar__bonus-popup daily-treats-calendar__bonus-popup--same-day">
              <div className="daily-treats-calendar__bonus-popup-icon">✨</div>
              <p className="daily-treats-calendar__bonus-popup-title">Day {todayIndex} bonus awakened</p>
              <p className="daily-treats-calendar__bonus-popup-text">
                {questHabit
                  ? <>You completed <strong>{questHabit.emoji ? `${questHabit.emoji} ` : ''}{questHabit.title}</strong> — tap the glowing Day {todayIndex} card to reveal its same-day bonus.</>
                  : <>Tap the glowing Day {todayIndex} card to reveal its same-day bonus.</>}
              </p>
            </div>
          )}

          <div
            className={`daily-treats-calendar__quest-stage${showLockedBonusHint ? ' daily-treats-calendar__quest-stage--focused' : ''}`}
          >
            {/* Locked bonus door hint — shown only when bonus is not yet unlocked */}
            {showLockedBonusHint && (
              <div className="daily-treats-calendar__bonus-locked-hint">
                <span className="daily-treats-calendar__bonus-locked-kicker">BONUS</span>
                <span className="daily-treats-calendar__bonus-locked-copy">
                  {questHabit
                    ? <>Finish <strong>{questHabit.emoji ? `${questHabit.emoji} ` : ''}{questHabit.title}</strong> to wake the door</>
                    : 'Finish today’s quest habit to wake the door'}
                </span>
              </div>
            )}

            <div className="daily-treats-calendar__grid" role="list">
              {Array.from({ length: totalDoors }, (_, index) => {
                const day = index + 1;
                const isFinalDay = day === totalDoors;
                const { free: freeHatch, bonus: bonusHatch } = seasonData
                  ? getHatchesForDay(seasonData.hatches, day)
                  : { free: null, bonus: null };

                const freeOpened = progress?.opened_days.includes(day) ?? false;

                // Use legacy state for backwards compatibility
                const revealedSymbol = resolvedState.revealedSymbols?.[day];
                const isOpenedLegacy = Boolean(revealedSymbol);

                const seasonType = seasonData?.season.season_type as SeasonType | undefined;
                const status: DoorStatus = computeDoorStatus(day, todayIndex, freeOpened || isOpenedLegacy, 'free', seasonType);

                // Determine if free door can be opened:
                // - 'today' status: always openable
                // - 'catchup' status (holiday missed days): openable
                const canOpenFree = (status === 'today' || status === 'catchup') && !freeOpened && !isOpenedLegacy;
                const canOpenSameDayBonus = Boolean(
                  bonusHatch
                    && day === todayIndex
                    && habitCompleted
                    && !todayBonusOpened
                    && (freeOpened || isOpenedLegacy),
                );

                const doorEmoji = themeEmojis[(day - 1) % themeEmojis.length];
                const statusLabel = status === 'catchup' ? 'missed day, available to open' : status;
                const label = canOpenSameDayBonus
                  ? `Day ${day} same-day bonus door ready`
                  : `Day ${day} ${status === 'today' ? "(today's door)" : `(${statusLabel})`}`;

                // Show dice amount on tile for personal quest calendars.
                // Currency check is defensive — all PQ doors are now dice, but keeps
                // the label correct if the schedule ever changes.
                const diceAmount = isPersonalQuest && freeHatch?.reward_currency === 'dice'
                  ? freeHatch.reward_amount
                  : null;

                const bonusAmountLabel = bonusHatch?.reward_amount != null
                  ? `${bonusHatch.reward_currency === 'dice' ? '🎲' : '✨'} ${bonusHatch.reward_amount}`
                  : 'Bonus';

                const doorBody = canOpenSameDayBonus ? (
                  <>
                    <span className="daily-treats-calendar__hatch-number">Day {day}</span>
                    <span className="daily-treats-calendar__hatch-symbol" aria-hidden="true">🎁</span>
                    <span className="daily-treats-calendar__hatch-bonus-label">Same-day bonus</span>
                    <span className="daily-treats-calendar__hatch-dice">{bonusAmountLabel}</span>
                  </>
                ) : (
                  <>
                    <span className="daily-treats-calendar__hatch-number">Day {day}</span>
                    {(freeOpened || isOpenedLegacy) ? (
                      <span className="daily-treats-calendar__hatch-symbol" aria-hidden="true">
                        {revealedSymbol?.emoji ?? '✓'}
                      </span>
                    ) : (
                      <span className="daily-treats-calendar__hatch-status" aria-hidden="true">
                        {status === 'locked' ? '🔒' : status === 'missed' ? '✗' : status === 'catchup' ? '🔓' : doorEmoji}
                      </span>
                    )}
                    {diceAmount != null && !(freeOpened || isOpenedLegacy) && (
                      <span className="daily-treats-calendar__hatch-dice">
                        🎲 {diceAmount}{dailyTreatDiceLabel ? ` ${dailyTreatDiceLabel}` : ''}
                      </span>
                    )}
                  </>
                );

                return (
                  <div
                    key={`calendar-day-${day}`}
                    className={`daily-treats-calendar__day-pair${isFinalDay ? ' daily-treats-calendar__day-pair--final' : ''}`}
                  >
                    {/* Free door; after today's free reveal, the same tile can awaken as the bonus door. */}
                    {canOpenSameDayBonus && bonusHatch ? (
                      <button
                        type="button"
                        className="daily-treats-calendar__hatch daily-treats-calendar__hatch--bonus-ready daily-treats-calendar__hatch-button"
                        role="listitem"
                        aria-label={label}
                        disabled={openingDoorKey !== null}
                        onClick={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          void handleOpenDoor(day, 'bonus', bonusHatch, {
                            x: rect.left + rect.width / 2,
                            y: rect.top + rect.height / 2,
                          });
                        }}
                      >
                        {doorBody}
                      </button>
                    ) : canOpenFree && freeHatch ? (
                      <button
                        type="button"
                        className={`daily-treats-calendar__hatch daily-treats-calendar__hatch--${status} daily-treats-calendar__hatch-button`}
                        role="listitem"
                        aria-label={label}
                        disabled={openingDoorKey !== null}
                        onClick={(event) => {
                          if (freeHatch) {
                            const rect = event.currentTarget.getBoundingClientRect();
                            void handleOpenDoor(day, 'free', freeHatch, {
                              x: rect.left + rect.width / 2,
                              y: rect.top + rect.height / 2,
                            });
                          } else {
                            // Legacy mode
                            setTimeout(() => {
                              const result = revealScratchCardForDayWithPersistence(userId, day);
                              if (!result) return;
                              setRevealResult(result);
                              setScratchState(loadScratchCardState(userId));
                            }, PRESS_ANIMATION_DELAY_MS);
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
                          }, PRESS_ANIMATION_DELAY_MS);
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
                  </div>
                );
              })}
            </div>
          </div>

          {todayFreeOpened && todayBonusOpened ? (
            <div className="daily-treats-calendar__rest">
              You revealed all of today&apos;s treats {themeEmojis[0]} Come back tomorrow for more!
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
                  ? 'Come back tomorrow to start a new streak!'
                  : 'Enjoy the holiday — see you at the next calendar!'}
              </p>
            </div>
          ) : null}

          {/* Legacy scratch card reveal for backwards compatibility */}
          {revealResult ? <ScratchCardReveal result={revealResult} /> : null}

          {/* Symbol tracker — only for holiday calendars using the scratch mechanic */}
          {!isPersonalQuest && (
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
          )}

          <button type="button" className="daily-treats-calendar__button daily-treats-calendar__button--close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
