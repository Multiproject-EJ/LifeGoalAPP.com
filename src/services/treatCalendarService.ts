import { canUseSupabaseDataAsync, getSupabaseClient, getSupabaseUrl } from '../lib/supabaseClient';

// ---------------------------------------------------------------------------
// Holiday keys — must match the ids in HolidayPreferencesSection.HOLIDAY_OPTIONS
// and the values stored in holiday_preferences.holidays.
// ---------------------------------------------------------------------------

export type HolidayKey =
  | 'new_year'
  | 'valentines_day'
  | 'st_patricks_day'
  | 'easter'
  | 'eid_mubarak'
  | 'halloween'
  | 'thanksgiving'
  | 'hanukkah'
  | 'christmas';

// ---------------------------------------------------------------------------
// Reward Types
// ---------------------------------------------------------------------------

export type RewardTier = 1 | 2 | 3 | 4 | 5;
export type RewardCurrency = 'gold' | 'dice' | null;
export type DoorType = 'free' | 'bonus';
export type RevealMechanic = 'flip' | 'scratch' | 'unwrap';
export type SeasonType = 'holiday' | 'personal_quest' | 'birthday' | 'special_event';
export type DoorStatus = 'locked' | 'available' | 'today' | 'opened' | 'missed' | 'catchup';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Calendars with 25+ doors (e.g., Christmas) get bonus dice on final day */
const LONG_CALENDAR_THRESHOLD = 25;

// ---------------------------------------------------------------------------
// Reward Tier Configuration
// ---------------------------------------------------------------------------

/** Maps reward tier to display info */
export const REWARD_TIER_INFO: Record<RewardTier, {
  label: string;
  rarityLabel: string;
  rarityClass: string;
}> = {
  1: { label: 'Nothing today', rarityLabel: '✦ Common', rarityClass: 'common' },
  2: { label: 'Small Gold', rarityLabel: '✦ Common', rarityClass: 'common' },
  3: { label: 'Medium Gold', rarityLabel: '✦✦ Uncommon', rarityClass: 'uncommon' },
  4: { label: 'Large Gold', rarityLabel: '✦✦✦ Rare', rarityClass: 'rare' },
  5: { label: 'Dice Cache', rarityLabel: '🎲 Legendary', rarityClass: 'legendary' },
};

/** Reward amount ranges for each tier */
const REWARD_AMOUNT_RANGES: Record<RewardTier, { min: number; max: number }> = {
  1: { min: 0, max: 0 },         // Empty
  2: { min: 50, max: 150 },      // Small gold
  3: { min: 200, max: 500 },     // Medium gold
  4: { min: 600, max: 900 },     // Large gold
  5: { min: 25, max: 75 },       // Dice cache
};

/**
 * Generate a reward amount for a given tier using a provided rng function.
 * Uses consistent logic across all reward generation.
 */
function getRewardAmountForTier(tier: RewardTier, rng: () => number = Math.random): number {
  const range = REWARD_AMOUNT_RANGES[tier];
  if (tier === 1) return 0;
  return range.min + Math.floor(rng() * (range.max - range.min + 1));
}

/**
 * Simple deterministic pseudo-random number generator (LCG) seeded by a string.
 * Used for Personal Quest seasons so the same ISO week always produces the same doors.
 */
function makeSeededRng(seed: string): () => number {
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = (Math.imul(31, state) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) | 0;
    return (state >>> 0) / 0x100000000;
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CalendarSeason = {
  id: string;
  theme_name: string;
  /** First day of the advent countdown (inclusive) — YYYY-MM-DD */
  starts_on: string;
  /** Last day / the holiday date (inclusive) — YYYY-MM-DD */
  ends_on: string;
  status: 'active' | 'archived' | 'draft';
  /** Which holiday this advent calendar belongs to, e.g. 'christmas' */
  holiday_key: HolidayKey | null;
  /** Type of season: holiday, personal_quest, birthday, special_event */
  season_type: SeasonType;
  /** User ID owner for personal quest / birthday calendars */
  user_id_owner: string | null;
  created_at: string;
  updated_at: string;
};

export type CalendarHatch = {
  id: string;
  season_id: string;
  day_index: number;
  /** Door type: free (always available) or bonus (habit-gated) */
  door_type: DoorType;
  symbol_name: string | null;
  symbol_emoji: string | null;
  numbers: number[] | null;
  number_reward: number | null;
  symbol_reward: string | null;
  reward_payload: Record<string, unknown>;
  /** Reward currency: gold, dice, or null (empty) */
  reward_currency: RewardCurrency;
  /** Numeric reward amount */
  reward_amount: number | null;
  /** Reward tier: 1=empty, 2=small_gold, 3=medium_gold, 4=large_gold, 5=dice_cache */
  reward_tier: RewardTier | null;
  /** Animation type: flip, scratch, unwrap */
  reveal_mechanic: RevealMechanic;
  created_at: string;
};

export type CalendarProgress = {
  user_id: string;
  season_id: string;
  last_opened_date: string | null;
  last_opened_day: number;
  /** Track opened (day_index, door_type) pairs as "day:type" strings */
  opened_days: number[];
  /** Track opened bonus doors separately */
  opened_bonus_days?: number[];
  symbol_counts: Record<string, number>;
  created_at: string;
  updated_at: string;
};

export type CalendarSeasonData = {
  season: CalendarSeason;
  hatches: CalendarHatch[];
  progress: CalendarProgress | null;
  /** Server-computed day index — the only trusted source for "today" */
  today_day_index: number;
};

type ServiceResponse<T> = {
  data: T | null;
  error: Error | null;
};

// ---------------------------------------------------------------------------
// Demo-mode storage
// ---------------------------------------------------------------------------

const DEMO_SEASON_KEY = 'lifegoal:demo_treat_season';
const DEMO_PROGRESS_KEY = 'lifegoal:demo_treat_progress';

function getDemoSeason(): CalendarSeasonData | null {
  try {
    const stored = localStorage.getItem(DEMO_SEASON_KEY);
    if (stored) return JSON.parse(stored) as CalendarSeasonData;
  } catch {
    // ignore
  }
  return null;
}

function setDemoSeason(data: CalendarSeasonData): void {
  try {
    localStorage.setItem(DEMO_SEASON_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function getDemoProgress(seasonId: string): CalendarProgress | null {
  try {
    const stored = localStorage.getItem(`${DEMO_PROGRESS_KEY}:${seasonId}`);
    if (stored) return JSON.parse(stored) as CalendarProgress;
  } catch {
    // ignore
  }
  return null;
}

function setDemoProgress(seasonId: string, progress: CalendarProgress): void {
  try {
    localStorage.setItem(`${DEMO_PROGRESS_KEY}:${seasonId}`, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

/** Compute which day-index today falls on within the season (1-based). */
function computeTodayDayIndex(startsOn: string): number {
  const start = new Date(startsOn);
  const today = new Date();
  const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.floor((todayUTC - startUTC) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

/**
 * Compute the "today" index for a Personal Quest (treat) calendar.
 *
 * Only one door may be opened per calendar day (Monopoly GO-style).
 * The next available day = highest opened day + 1, but *only* if the
 * last door was opened on a previous calendar day. If the user already
 * opened a door today, the today-index stays at the most recently
 * opened day (so the UI shows it as "opened", not as a new clickable door).
 *
 * If nothing has been opened yet, returns 1.
 */
function computePersonalQuestTodayIndex(
  progress: CalendarProgress | null,
  totalDays: number = 7,
): number {
  if (!progress || progress.opened_days.length === 0) return 1;
  const maxOpened = Math.max(...progress.opened_days);

  // Gate: only advance past the last opened day if `last_opened_date` is
  // strictly before the current calendar date (local midnight comparison).
  const todayStr = new Date().toISOString().split('T')[0];
  if (progress.last_opened_date === todayStr) {
    // Already opened a door today — stay on that day (shows as "opened")
    return Math.min(maxOpened, totalDays);
  }

  return Math.min(maxOpened + 1, totalDays);
}

/**
 * Compute the total number of free doors from a list of hatches.
 * Returns the highest day_index among free doors, or fallback (default 7).
 */
function computeTotalFreeDoors(
  hatches: Array<{ door_type: string; day_index: number }>,
  fallback: number = 7,
): number {
  const freeDayIndices = hatches
    .filter(h => h.door_type === 'free')
    .map(h => h.day_index);
  return freeDayIndices.length > 0 ? Math.max(...freeDayIndices) : fallback;
}

function normalizeRewardCurrency(currency: RewardCurrency | 'diamond' | null): RewardCurrency {
  if (currency === 'diamond') return 'dice';
  return currency;
}

function normalizeRewardAmount(
  currency: RewardCurrency | 'diamond' | null,
  amount: number | null,
): number | null {
  if (amount == null) return null;
  if (currency === 'diamond') {
    // Migrate legacy diamond count into dice payout.
    return Math.max(25, amount * 25);
  }
  return amount;
}

function normalizeHatches(hatches: CalendarHatch[]): CalendarHatch[] {
  return hatches.map((hatch) => {
    const normalizedCurrency = normalizeRewardCurrency(hatch.reward_currency as RewardCurrency | 'diamond' | null);
    return {
      ...hatch,
      reward_currency: normalizedCurrency,
      reward_amount: normalizeRewardAmount(hatch.reward_currency as RewardCurrency | 'diamond' | null, hatch.reward_amount),
      reward_payload:
        hatch.reward_payload && typeof hatch.reward_payload === 'object'
          ? {
              ...hatch.reward_payload,
              reward_type: normalizedCurrency,
              reward_value: normalizeRewardAmount(
                hatch.reward_currency as RewardCurrency | 'diamond' | null,
                hatch.reward_amount,
              ),
            }
          : hatch.reward_payload,
    };
  });
}

// ---------------------------------------------------------------------------
// Advent calendar meta — date ranges and theming per holiday
// ---------------------------------------------------------------------------

export type AdventMeta = {
  theme_name: string;
  /** Short holiday name for display (e.g. "Christmas", "Halloween") */
  displayName: string;
  holiday_key: HolidayKey;
  /** Month (0-based) and day on which the countdown starts */
  countdownStart: { month: number; day: number };
  /** Month (0-based) and day of the holiday itself (last hatch) */
  holidayDate: { month: number; day: number };
  emojis: string[];
};

export type ActiveAdventMetaResult = {
  meta: AdventMeta;
  daysRemaining: number;
  cycleKey: string;
};

const ADVENT_META: AdventMeta[] = [
  {
    // Christmas: 25 doors, Dec 1 → Dec 25 — the gold standard
    theme_name: 'Christmas Advent',
    displayName: 'Christmas',
    holiday_key: 'christmas',
    countdownStart: { month: 11, day: 1 },
    holidayDate: { month: 11, day: 25 },
    emojis: ['🎄', '⭐', '🎁', '🦌', '🔔', '❄️', '🕯️', '🍪', '🧦', '☃️'],
  },
  {
    // Halloween: 7 doors, Oct 25 → Oct 31 — final week only (reduced from 31)
    theme_name: 'Halloween Countdown',
    displayName: 'Halloween',
    holiday_key: 'halloween',
    countdownStart: { month: 9, day: 25 },
    holidayDate: { month: 9, day: 31 },
    emojis: ['🎃', '👻', '🕷️', '🦇', '🕯️', '💀', '🕸️', '🍬', '🧙', '🌙'],
  },
  {
    // Easter: 8 doors, Palm Sunday → Easter Sunday (Holy Week)
    // Movable feast — production seasons should seed the exact date per year.
    // Demo approximation: Mar 30 → Apr 6
    theme_name: 'Easter Countdown',
    displayName: 'Easter',
    holiday_key: 'easter',
    countdownStart: { month: 2, day: 30 },
    holidayDate: { month: 3, day: 6 },
    emojis: ['🐣', '🌸', '🥚', '🐰', '🌷', '🦋', '🌼', '🍀', '✨', '🌈'],
  },
  {
    // Eid: 3 doors — 3 days of Eid al-Fitr
    // Lunar calendar — production seasons should seed the exact date per year.
    // Demo approximation: Apr 29 → May 1
    theme_name: 'Eid Mubarak Countdown',
    displayName: 'Eid Mubarak',
    holiday_key: 'eid_mubarak',
    countdownStart: { month: 3, day: 29 },
    holidayDate: { month: 4, day: 1 },
    emojis: ['🌙', '🕌', '✨', '🤲', '⭐', '🕯️', '🌟', '💛', '🎉', '🪔'],
  },
  {
    // Valentine's: 5 doors, Feb 10 → Feb 14 — extended from 3 for more build-up
    theme_name: 'Valentine\'s Countdown',
    displayName: 'Valentine\'s Day',
    holiday_key: 'valentines_day',
    countdownStart: { month: 1, day: 10 },
    holidayDate: { month: 1, day: 14 },
    emojis: ['💘', '❤️', '🌹', '💌', '💝', '🍫', '💕', '✨', '🎀', '💗'],
  },
  {
    // New Year: 7 doors, Dec 26 → Jan 1 — tight and exciting
    theme_name: 'New Year Countdown',
    displayName: 'New Year',
    holiday_key: 'new_year',
    countdownStart: { month: 11, day: 26 },
    holidayDate: { month: 0, day: 1 },
    emojis: ['🎉', '🥂', '🎆', '🎊', '⭐', '✨', '🎇', '🕛', '🥳', '🌟'],
  },
  {
    // Thanksgiving: 4 doors, Mon → Thu of Thanksgiving week (reduced from 28)
    // US Thanksgiving is 4th Thursday of November — production seasons
    // should seed the exact date per year.
    // Demo approximation: Nov 24 → Nov 27
    theme_name: 'Thanksgiving Countdown',
    displayName: 'Thanksgiving',
    holiday_key: 'thanksgiving',
    countdownStart: { month: 10, day: 24 },
    holidayDate: { month: 10, day: 27 },
    emojis: ['🦃', '🍂', '🌽', '🥧', '🍁', '🌾', '🥕', '🙏', '🍎', '🍠'],
  },
  {
    // Hanukkah: 8 doors, Night 1 → Night 8 — exactly right for 8 nights
    // Lunar calendar — production seasons should seed the exact date per year.
    theme_name: 'Hanukkah Countdown',
    displayName: 'Hanukkah',
    holiday_key: 'hanukkah',
    countdownStart: { month: 11, day: 14 },
    holidayDate: { month: 11, day: 22 },
    emojis: ['🕎', '✡️', '🕯️', '💙', '⭐', '🎁', '🪙', '🥞', '🌟', '✨'],
  },
  {
    // St. Patrick's: 3 doors, Mar 15 → Mar 17 — minor holiday
    theme_name: 'St. Patrick\'s Day Countdown',
    displayName: 'St. Patrick\'s Day',
    holiday_key: 'st_patricks_day',
    countdownStart: { month: 2, day: 15 },
    holidayDate: { month: 2, day: 17 },
    emojis: ['☘️', '🍀', '🌈', '🟢', '🎩', '🪙', '🍺', '✨', '🌿', '⭐'],
  },
];

/**
 * Check whether a given month/day falls within a countdown window.
 * Uses a fixed leap year (2000) as the reference so comparisons are
 * done purely by calendar date rather than by a custom ordinal encoding.
 * Handles windows that cross the year boundary (e.g., New Year: Dec 26 → Jan 1).
 */
function isInCountdownWindow(
  todayMonth: number,
  todayDay: number,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
): boolean {
  const REF_YEAR = 2000; // leap year — safe for all month/day combinations
  const todayMs = new Date(REF_YEAR, todayMonth, todayDay).getTime();
  const startMs = new Date(REF_YEAR, startMonth, startDay).getTime();
  const endMs   = new Date(REF_YEAR, endMonth,   endDay  ).getTime();

  if (startMs <= endMs) {
    // Normal window within the same calendar year
    return todayMs >= startMs && todayMs <= endMs;
  }
  // Window crosses the year boundary (e.g., Dec 26 → Jan 1)
  return todayMs >= startMs || todayMs <= endMs;
}

/**
 * Return the AdventMeta for whichever holiday countdown window contains
 * today, plus the days remaining until the holiday date.
 * Returns null when today is outside every countdown window.
 *
 * @param enabledHolidays - Optional set of holiday_key strings the user has
 *   enabled in their Holiday Preferences.  When supplied, only matching
 *   holidays are considered.  When omitted every holiday is eligible.
 */
export function getActiveAdventMeta(
  enabledHolidays?: Set<string>,
): ActiveAdventMetaResult | null {
  const today = new Date();
  const todayM = today.getMonth();
  const todayD = today.getDate();
  const year   = today.getFullYear();
  const REF_YEAR = 2000;

  for (const meta of ADVENT_META) {
    if (enabledHolidays && !enabledHolidays.has(meta.holiday_key)) continue;

    const { countdownStart: cs, holidayDate: hd } = meta;
    if (!isInCountdownWindow(todayM, todayD, cs.month, cs.day, hd.month, hd.day)) continue;

    // Compute days remaining using local date components to avoid DST/UTC drift.
    // Build Date objects from local year/month/day at midnight so the difference
    // is always exactly N calendar days regardless of the user's timezone.
    const todayLocal    = new Date(year, todayM, todayD);
    // New Year: if the holiday month is before the start month the holiday falls
    // in the next calendar year (e.g. Dec 26 countdown → Jan 1 next year).
    const holidayYear   = hd.month < cs.month ? year + 1 : year;
    const holidayLocal  = new Date(holidayYear, hd.month, hd.day);
    const daysRemaining = Math.max(
      0,
      Math.round((holidayLocal.getTime() - todayLocal.getTime()) / (1000 * 60 * 60 * 24)),
    );

    return {
      meta,
      daysRemaining,
      cycleKey: getAdventCycleKey(meta, today),
    };
  }
  return null;
}

export function getAdventCycleKey(meta: AdventMeta, referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear();
  const crossesYearBoundary = meta.holidayDate.month < meta.countdownStart.month;
  const startYear =
    crossesYearBoundary && referenceDate.getMonth() <= meta.holidayDate.month
      ? year - 1
      : year;

  return `${meta.holiday_key}:${startYear}-${String(meta.countdownStart.month + 1).padStart(2, '0')}-${String(meta.countdownStart.day).padStart(2, '0')}`;
}

export function getAdventMetaByHolidayKey(holidayKey: HolidayKey): AdventMeta | null {
  return ADVENT_META.find((meta) => meta.holiday_key === holidayKey) ?? null;
}

export function buildPreviewAdventMeta(
  holidayKey: HolidayKey,
  referenceDate: Date = new Date(),
): ActiveAdventMetaResult | null {
  const meta = getAdventMetaByHolidayKey(holidayKey);
  if (!meta) return null;

  return {
    meta,
    daysRemaining: 0,
    cycleKey: `preview:${getAdventCycleKey(meta, referenceDate)}`,
  };
}

/**
 * Compute the total number of advent doors for a given meta entry.
 * This is the inclusive day count from countdownStart to holidayDate.
 */
export function getAdventDoorCount(meta: AdventMeta): number {
  const REF_YEAR = 2000;
  const startMs = new Date(REF_YEAR, meta.countdownStart.month, meta.countdownStart.day).getTime();
  // For cross-year windows (New Year), holiday is the following year
  const endYear = meta.holidayDate.month < meta.countdownStart.month ? REF_YEAR + 1 : REF_YEAR;
  const endMs = new Date(endYear, meta.holidayDate.month, meta.holidayDate.day).getTime();
  return Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
}

// ---------------------------------------------------------------------------
// Reveal Mechanic Assignment
// ---------------------------------------------------------------------------

const HOLIDAY_REVEAL_MECHANICS: Record<HolidayKey, {
  standardDoor: RevealMechanic;
  finalDoor: RevealMechanic;
  symbolBonus: RevealMechanic;
}> = {
  christmas:       { standardDoor: 'flip',   finalDoor: 'scratch', symbolBonus: 'unwrap' },
  new_year:        { standardDoor: 'flip',   finalDoor: 'scratch', symbolBonus: 'scratch' },
  valentines_day:  { standardDoor: 'flip',   finalDoor: 'unwrap',  symbolBonus: 'unwrap' },
  easter:          { standardDoor: 'unwrap', finalDoor: 'scratch', symbolBonus: 'flip' },
  eid_mubarak:     { standardDoor: 'unwrap', finalDoor: 'unwrap',  symbolBonus: 'unwrap' },
  halloween:       { standardDoor: 'flip',   finalDoor: 'scratch', symbolBonus: 'scratch' },
  thanksgiving:    { standardDoor: 'flip',   finalDoor: 'unwrap',  symbolBonus: 'flip' },
  hanukkah:        { standardDoor: 'flip',   finalDoor: 'unwrap',  symbolBonus: 'unwrap' },
  st_patricks_day: { standardDoor: 'flip',   finalDoor: 'scratch', symbolBonus: 'flip' },
};

function getRevealMechanic(
  holidayKey: HolidayKey | null,
  dayIndex: number,
  totalDays: number,
  doorType: DoorType,
): RevealMechanic {
  const isFinalDay = dayIndex === totalDays;
  const key = holidayKey ?? 'christmas';
  const mechanics = HOLIDAY_REVEAL_MECHANICS[key];

  if (isFinalDay) return mechanics.finalDoor;
  if (doorType === 'bonus') return mechanics.symbolBonus;
  return mechanics.standardDoor;
}

// ---------------------------------------------------------------------------
// Reward Generation
// ---------------------------------------------------------------------------

/** Holiday flavour text banks for empty doors */
const EMPTY_DOOR_FLAVOUR: Record<HolidayKey, string[]> = {
  christmas: [
    'The elves are saving the good stuff for later 🎄',
    'Santa is checking his list... try tomorrow! 🎅',
    'The North Pole is quiet today ❄️',
  ],
  halloween: [
    'Boo! Nothing here... yet 🎃',
    'The spirits are resting tonight 👻',
    'Check back tomorrow for spookier treats 🕷️',
  ],
  easter: [
    'The bunny is still hiding this one 🐰',
    'Not all eggs hatch at once 🥚',
    'Spring patience brings sweet rewards 🌸',
  ],
  eid_mubarak: [
    'Blessings come in their own time 🌙',
    'The crescent awaits ✨',
    'Tomorrow brings new gifts 🕌',
  ],
  valentines_day: [
    'Love takes time to bloom 🌹',
    'Sweet things are worth the wait 💕',
    'Patience, dear heart 💘',
  ],
  new_year: [
    'The countdown continues... 🎉',
    'Good things come to those who wait 🥂',
    'The best is yet to come ✨',
  ],
  thanksgiving: [
    'Gratitude grows with time 🦃',
    'The harvest is not ready yet 🌾',
    'More blessings are on the way 🙏',
  ],
  hanukkah: [
    'The light grows brighter each night 🕎',
    'Patience is a mitzvah ✡️',
    'More miracles await 🕯️',
  ],
  st_patricks_day: [
    'The leprechaun is hiding this gold 🍀',
    'Luck comes when you least expect it ☘️',
    'Keep searching for that rainbow 🌈',
  ],
};

/** Generate a reward tier distribution for a calendar of given length.
 * Follows the spec schedule exactly:
 *   Short  (3–5 doors): fixed Day 1=Small, Day 2=Medium, Day N-1=Large, Day N=Dice cache
 *   Medium (7–9 doors): fixed 7-day template, extended proportionally for 8–9 doors
 *   Long  (25 doors):   alternating empty/small early, medium build, large D24, dice cache D25
 *
 * @param totalDays - Total number of free doors in the season
 * @param rng       - Optional seeded RNG for deterministic generation (Personal Quest)
 */
function generateRewardSchedule(
  totalDays: number,
  rng: () => number = Math.random,
): Array<{
  tier: RewardTier;
  currency: RewardCurrency;
  amount: number | null;
}> {
  const schedule: Array<{ tier: RewardTier; currency: RewardCurrency; amount: number | null }> = [];

  // Short calendars (3–5 doors): fixed schedule per spec
  // Day 1=Small(100), Day 2=Medium(300), Day N-1=Large(700)[if ≥4], Day N=Dice cache
  if (totalDays <= 5) {
    for (let day = 1; day <= totalDays; day++) {
      if (day === totalDays) {
        schedule.push({ tier: 5, currency: 'dice', amount: 25 });
      } else if (day === totalDays - 1 && totalDays >= 4) {
        schedule.push({ tier: 4, currency: 'gold', amount: 700 });
      } else if (day === 2) {
        schedule.push({ tier: 3, currency: 'gold', amount: 300 });
      } else {
        schedule.push({ tier: 2, currency: 'gold', amount: 100 });
      }
    }
    return schedule;
  }

  // Medium calendars (7–9 doors): every day awards dice (Monopoly GO-style
  // daily treat streak). Day 1 = 25 dice, increasing by 10 each day.
  // Day 7 = 85 dice. For 8-9 door calendars the pattern continues.
  if (totalDays <= 9) {
    for (let day = 1; day <= totalDays; day++) {
      const diceAmount = 25 + (day - 1) * 10; // 25, 35, 45, 55, 65, 75, 85 …
      const tier: RewardTier = day === totalDays ? 5 : day >= totalDays - 1 ? 4 : day >= 4 ? 3 : 2;
      schedule.push({ tier, currency: 'dice', amount: diceAmount });
    }
    return schedule;
  }

  // Long calendars (10–25 doors, mainly Christmas): spec schedule
  // Days 1–10:  alternating Small(100–150) and Empty, no 2 empties in a row, ~50% empty
  // Days 11–20: Small/Medium(150–350), ~30% empty
  // Days 21–23: Medium(400–500)
  // Day 24:     Large(800)
  // Day 25:     Dice cache
  const lastDay = totalDays;
  const penultimate = totalDays - 1;

  // Pre-determine empty days respecting constraints (no 2 in a row, not last 3 days)
  const emptyDays = new Set<number>();
  const firstBlock = Math.min(10, Math.floor(totalDays * 0.4));
  const firstBlockEnd = firstBlock;
  const midBlockEnd = Math.min(20, Math.floor(totalDays * 0.8));

  // First block: ~50% empty
  for (let day = 1; day <= firstBlockEnd; day++) {
    if (day >= lastDay - 2) break;
    if (!emptyDays.has(day - 1) && rng() < 0.5) {
      emptyDays.add(day);
    }
  }

  // Middle block: ~30% empty
  for (let day = firstBlockEnd + 1; day <= midBlockEnd; day++) {
    if (day >= lastDay - 2) break;
    if (!emptyDays.has(day - 1) && rng() < 0.3) {
      emptyDays.add(day);
    }
  }

  for (let day = 1; day <= totalDays; day++) {
    if (day === lastDay) {
      const diceAmount = totalDays >= LONG_CALENDAR_THRESHOLD ? 75 : 50;
      schedule.push({ tier: 5, currency: 'dice', amount: diceAmount });
    } else if (day === penultimate) {
      schedule.push({ tier: 4, currency: 'gold', amount: 800 });
    } else if (day >= lastDay - 3) {
      // Days 21–23 equivalent: Medium gold (400–500)
      const amount = 400 + Math.floor(rng() * 101);
      schedule.push({ tier: 3, currency: 'gold', amount });
    } else if (emptyDays.has(day)) {
      schedule.push({ tier: 1, currency: null, amount: null });
    } else if (day <= firstBlockEnd) {
      // First block non-empty: Small gold (100–150)
      schedule.push({ tier: 2, currency: 'gold', amount: 100 + Math.floor(rng() * 51) });
    } else {
      // Middle block non-empty: Small or Medium gold (150–350)
      const amount = 150 + Math.floor(rng() * 201);
      const tier: RewardTier = amount >= 200 ? 3 : 2;
      schedule.push({ tier, currency: 'gold', amount });
    }
  }

  return schedule;
}

/**
 * Pick a demo advent season to display.
 * Prefers the advent whose countdown window includes today;
 * falls back to Personal Quest Calendar if no holiday is active.
 */
function pickDemoAdventMeta(year: number): { meta: AdventMeta; startsOn: string; endsOn: string } | null {
  const today = new Date();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  for (const meta of ADVENT_META) {
    const { countdownStart: cs, holidayDate: hd } = meta;
    if (isInCountdownWindow(todayM, todayD, cs.month, cs.day, hd.month, hd.day)) {
      const startsOn = new Date(year, cs.month, cs.day).toISOString().split('T')[0];
      // Handle cross-year for New Year
      const endYear = hd.month < cs.month ? year + 1 : year;
      const endsOn = new Date(endYear, hd.month, hd.day).toISOString().split('T')[0];
      return { meta, startsOn, endsOn };
    }
  }

  return null; // No active holiday → will trigger Personal Quest Calendar
}

// ---------------------------------------------------------------------------
// Personal Quest Calendar
// ---------------------------------------------------------------------------

const PERSONAL_QUEST_THEMES = [
  { theme_name: 'Weekly Sprint', displayName: 'Weekly Sprint', emoji: '🧭' },
  { theme_name: 'Focus Reset', displayName: 'Focus Reset', emoji: '🎯' },
  { theme_name: 'Body Builder', displayName: 'Body Builder', emoji: '💪' },
  { theme_name: 'Mind Month', displayName: 'Mind Month', emoji: '🧠' },
  { theme_name: 'Habit Hero', displayName: 'Habit Hero', emoji: '⭐' },
];

/** Compute the ISO week string (YYYY-Www) for a given Date. */
function getIsoWeekString(date: Date): string {
  // ISO week: week containing the first Thursday of the year; week starts Monday
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // ISO: Mon=1, Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function buildPersonalQuestSeasonData(userId: string, refDate: Date = new Date()): CalendarSeasonData {
  // Personal Quest runs weekly, starting Monday
  const dayOfWeek = refDate.getDay(); // 0 = Sunday
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayStart = new Date(refDate);
  mondayStart.setDate(refDate.getDate() - daysToMonday);
  mondayStart.setHours(0, 0, 0, 0);

  const sundayEnd = new Date(mondayStart);
  sundayEnd.setDate(mondayStart.getDate() + 6);

  const startsOn = mondayStart.toISOString().split('T')[0];
  const endsOn = sundayEnd.toISOString().split('T')[0];

  // Deterministic seed: ISO week string so same user sees same doors within a week
  const weekSeed = `${userId}:${getIsoWeekString(mondayStart)}`;
  const rng = makeSeededRng(weekSeed);

  // Pick theme deterministically based on the seed
  const theme = PERSONAL_QUEST_THEMES[Math.floor(rng() * PERSONAL_QUEST_THEMES.length)];

  const season: CalendarSeason = {
    id: `demo-personal-quest-${startsOn}`,
    theme_name: theme.theme_name,
    starts_on: startsOn,
    ends_on: endsOn,
    status: 'active',
    holiday_key: null,
    season_type: 'personal_quest',
    user_id_owner: userId,
    created_at: mondayStart.toISOString(),
    updated_at: mondayStart.toISOString(),
  };

  const totalDays = 7;
  const rewardSchedule = generateRewardSchedule(totalDays, rng);

  // Personal Quest emojis per the spec
  const questEmojis = ['🧭', '⭐', '🏆', '🎯', '💪', '🌟', '✨', '🔥', '💎', '🚀'];

  // Generate hatches with two-door system (deterministic via rng)
  const hatches: CalendarHatch[] = [];
  for (let i = 0; i < totalDays; i++) {
    const dayIndex = i + 1;
    const freeReward = rewardSchedule[i];
    const emoji = questEmojis[dayIndex % questEmojis.length];

    // Free door (always available)
    hatches.push({
      id: `demo-quest-hatch-${dayIndex}-free`,
      season_id: season.id,
      day_index: dayIndex,
      door_type: 'free',
      symbol_name: null,
      symbol_emoji: emoji,
      numbers: null,
      number_reward: null,
      symbol_reward: null,
      reward_payload: freeReward.currency
        ? { reward_type: freeReward.currency, reward_value: freeReward.amount }
        : {},
      reward_currency: freeReward.currency,
      reward_amount: freeReward.amount,
      reward_tier: freeReward.tier,
      reveal_mechanic: dayIndex === totalDays ? 'scratch' : 'flip',
      created_at: season.created_at,
    });

    // Bonus door (habit-gated) — at least one tier above free, min Medium Gold
    const bonusTier: RewardTier = Math.max(3, Math.min(5, freeReward.tier + 1)) as RewardTier;
    const bonusCurrency: RewardCurrency = bonusTier === 5 ? 'dice' : 'gold';
    const bonusAmount = getRewardAmountForTier(bonusTier, rng);

    hatches.push({
      id: `demo-quest-hatch-${dayIndex}-bonus`,
      season_id: season.id,
      day_index: dayIndex,
      door_type: 'bonus',
      symbol_name: null,
      symbol_emoji: emoji,
      numbers: null,
      number_reward: null,
      symbol_reward: null,
      reward_payload: { reward_type: bonusCurrency, reward_value: bonusAmount },
      reward_currency: bonusCurrency,
      reward_amount: bonusAmount,
      reward_tier: bonusTier,
      reveal_mechanic: dayIndex === totalDays ? 'scratch' : 'unwrap',
      created_at: season.created_at,
    });
  }

  const storedProgress = getDemoProgress(season.id);
  const progress: CalendarProgress = storedProgress ?? {
    user_id: userId,
    season_id: season.id,
    last_opened_date: null,
    last_opened_day: 0,
    opened_days: [],
    opened_bonus_days: [],
    symbol_counts: {},
    created_at: season.created_at,
    updated_at: new Date().toISOString(),
  };

  // Personal Quest uses sequential day tracking: next day = last opened + 1
  const todayIndex = computePersonalQuestTodayIndex(progress, totalDays);

  return { season, hatches, progress, today_day_index: todayIndex };
}

/** Build a demo advent season for the nearest matching holiday. */
function buildDemoSeasonData(userId: string): CalendarSeasonData {
  const now = new Date();
  const year = now.getFullYear();
  const picked = pickDemoAdventMeta(year);

  // No active holiday? Return Personal Quest Calendar
  if (!picked) {
    return buildPersonalQuestSeasonData(userId);
  }

  const { meta, startsOn, endsOn } = picked;

  const season: CalendarSeason = {
    id: `demo-season-${meta.holiday_key}`,
    theme_name: meta.theme_name,
    starts_on: startsOn,
    ends_on: endsOn,
    status: 'active',
    holiday_key: meta.holiday_key,
    season_type: 'holiday',
    user_id_owner: null,
    created_at: new Date(startsOn).toISOString(),
    updated_at: new Date(startsOn).toISOString(),
  };

  // Compute the total number of hatch doors (days in the countdown)
  const start = new Date(startsOn);
  const end = new Date(endsOn);
  const totalDays =
    Math.floor(
      (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
        Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
        (1000 * 60 * 60 * 24),
    ) + 1;

  const rewardSchedule = generateRewardSchedule(totalDays);

  // Generate hatches with two-door system
  const hatches: CalendarHatch[] = [];
  for (let i = 0; i < totalDays; i++) {
    const dayIndex = i + 1;
    const freeReward = rewardSchedule[i];
    const emoji = meta.emojis[dayIndex % meta.emojis.length];
    const isFinalDay = dayIndex === totalDays;

    // Free door (always available) — for free doors, give Type 1-2 rewards
    // unless it's the final day which gets the big reward
    const freeTier: RewardTier = isFinalDay ? freeReward.tier : (freeReward.tier <= 2 ? freeReward.tier : 2);
    const freeCurrency: RewardCurrency = isFinalDay ? freeReward.currency : (freeTier === 1 ? null : 'gold');
    const freeAmount = isFinalDay ? freeReward.amount : (freeTier === 1 ? null : getRewardAmountForTier(2));

    hatches.push({
      id: `demo-hatch-${dayIndex}-free`,
      season_id: season.id,
      day_index: dayIndex,
      door_type: 'free',
      symbol_name: null,
      symbol_emoji: emoji,
      numbers: null,
      number_reward: null,
      symbol_reward: null,
      reward_payload: freeCurrency
        ? { reward_type: freeCurrency, reward_value: freeAmount }
        : {},
      reward_currency: freeCurrency,
      reward_amount: freeAmount,
      reward_tier: freeTier,
      reveal_mechanic: getRevealMechanic(meta.holiday_key, dayIndex, totalDays, 'free'),
      created_at: season.created_at,
    });

    // Bonus door (habit-gated) — better rewards (Type 3-5)
    // Bonus door always gets the "real" scheduled reward or better
    const bonusTier: RewardTier = isFinalDay ? 5 : Math.max(3, freeReward.tier) as RewardTier;
    const bonusCurrency: RewardCurrency = bonusTier === 5 ? 'dice' : 'gold';
    // Final day of long calendars (Christmas) gets a larger dice payout; others get standard tier amounts
    const bonusAmount = isFinalDay && totalDays >= LONG_CALENDAR_THRESHOLD
      ? 75
      : getRewardAmountForTier(bonusTier);

    hatches.push({
      id: `demo-hatch-${dayIndex}-bonus`,
      season_id: season.id,
      day_index: dayIndex,
      door_type: 'bonus',
      symbol_name: null,
      symbol_emoji: emoji,
      numbers: null,
      number_reward: null,
      symbol_reward: null,
      reward_payload: { reward_type: bonusCurrency, reward_value: bonusAmount },
      reward_currency: bonusCurrency,
      reward_amount: bonusAmount,
      reward_tier: bonusTier,
      reveal_mechanic: getRevealMechanic(meta.holiday_key, dayIndex, totalDays, 'bonus'),
      created_at: season.created_at,
    });
  }

  const todayIndex = computeTodayDayIndex(startsOn);

  const storedProgress = getDemoProgress(season.id);
  const progress: CalendarProgress = storedProgress ?? {
    user_id: userId,
    season_id: season.id,
    last_opened_date: null,
    last_opened_day: 0,
    opened_days: [],
    opened_bonus_days: [],
    symbol_counts: {},
    created_at: season.created_at,
    updated_at: new Date().toISOString(),
  };

  return { season, hatches, progress, today_day_index: todayIndex };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return a 7-door Personal Quest "Weekly Sprint" season for the current week.
 * This is the always-on fallback — it runs whenever no holiday calendar is active.
 *
 * For authenticated users, attempts to fetch an existing `personal_quest` season
 * from `daily_calendar_seasons` for this week; falls back to a locally-generated
 * deterministic demo season if none exists or if in demo mode.
 *
 * The generated season is deterministic — same ISO week string seed means the
 * same user sees the same doors within a week.
 */
export async function getPersonalQuestSeason(
  userId: string,
): Promise<ServiceResponse<CalendarSeasonData>> {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayStart = new Date(now);
  mondayStart.setDate(now.getDate() - daysToMonday);
  mondayStart.setHours(0, 0, 0, 0);
  const weekStartsOn = mondayStart.toISOString().split('T')[0];

  if (await canUseSupabaseDataAsync()) {
    try {
      const supabase = getSupabaseClient();

      const { data: seasons, error: seasonError } = await supabase
        .from('daily_calendar_seasons')
        .select('*')
        .eq('status', 'active')
        .eq('season_type', 'personal_quest')
        .eq('user_id_owner', userId)
        .eq('starts_on', weekStartsOn)
        .limit(1);

      if (!seasonError && seasons && seasons.length > 0) {
        const season = seasons[0] as unknown as CalendarSeason;

        const [{ data: hatches, error: hatchError }, { data: progress }] = await Promise.all([
          supabase
            .from('daily_calendar_hatches')
            .select('*')
            .eq('season_id', season.id)
            .order('day_index', { ascending: true }),
          supabase
            .from('daily_calendar_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('season_id', season.id)
            .maybeSingle(),
        ]);

        if (!hatchError) {
          const totalDays = computeTotalFreeDoors(
            (hatches ?? []) as Array<{ door_type: string; day_index: number }>,
          );
          return {
            data: {
              season,
              hatches: normalizeHatches((hatches ?? []) as unknown as CalendarHatch[]),
              progress: progress as unknown as CalendarProgress | null,
              today_day_index: computePersonalQuestTodayIndex(
                progress as unknown as CalendarProgress | null,
                totalDays,
              ),
            },
            error: null,
          };
        }
      }
    } catch {
      // Fall through to local generation
    }
  }

  // Demo / unauthenticated / no existing season: generate locally with deterministic seed
  const demo = buildPersonalQuestSeasonData(userId, now);
  // Cache in localStorage so openTodayHatch can find the season data when the
  // locally-generated (non-UUID) season ID is used later.
  setDemoSeason(demo);
  return { data: demo, error: null };
}

/**
 * Fetch the active advent/holiday season together with all hatch definitions
 * and the caller's progress.
 *
 * @param userId    - Authenticated user's ID
 * @param holidayKey - Optional filter: only return a season for this holiday.
 *                    If omitted, the most recently active season is returned.
 */
export async function fetchCurrentSeason(
  userId: string,
  holidayKey?: HolidayKey,
): Promise<ServiceResponse<CalendarSeasonData>> {
  if (!await canUseSupabaseDataAsync()) {
    const cached = getDemoSeason();
    // Invalidate the cache if it's for a different holiday
    if (cached && (!holidayKey || cached.season.holiday_key === holidayKey)) {
      return { data: cached, error: null };
    }
    const demo = buildDemoSeasonData(userId);
    setDemoSeason(demo);
    return { data: demo, error: null };
  }

  try {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('daily_calendar_seasons')
      .select('*')
      .eq('status', 'active')
      .order('starts_on', { ascending: false })
      .limit(1);

    if (holidayKey) {
      query = query.eq('holiday_key', holidayKey);
    }

    const { data: seasons, error: seasonError } = await query;

    if (seasonError) return { data: null, error: new Error(seasonError.message) };
    if (!seasons || seasons.length === 0) return { data: null, error: new Error('No active season') };

    const season = seasons[0] as unknown as CalendarSeason;

    const [{ data: hatches, error: hatchError }, { data: progress }] = await Promise.all([
      supabase
        .from('daily_calendar_hatches')
        .select('*')
        .eq('season_id', season.id)
        .order('day_index', { ascending: true }),
      supabase
        .from('daily_calendar_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('season_id', season.id)
        .maybeSingle(),
    ]);

    if (hatchError) return { data: null, error: new Error(hatchError.message) };

    return {
      data: {
        season,
        hatches: normalizeHatches((hatches ?? []) as unknown as CalendarHatch[]),
        progress: progress as unknown as CalendarProgress | null,
        today_day_index: computeTodayDayIndex(season.starts_on),
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/**
 * Fetch the user's progress for a specific advent season.
 */
export async function fetchUserProgress(
  userId: string,
  seasonId: string,
): Promise<ServiceResponse<CalendarProgress | null>> {
  if (!await canUseSupabaseDataAsync()) {
    return { data: getDemoProgress(seasonId), error: null };
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('daily_calendar_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('season_id', seasonId)
      .maybeSingle();

    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as unknown as CalendarProgress | null, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/**
 * Open today's hatch and claim the reward.
 *
 * Validates:
 * - day_index matches today within the active season
 * - the user has not already opened today's hatch for this door_type
 * - for bonus doors, validates habit completion
 *
 * @returns The reward info including currency, amount, and tier
 */
export async function openTodayHatch(
  userId: string,
  seasonId: string,
  dayIndex: number,
  doorType: DoorType = 'free',
): Promise<ServiceResponse<{
  reward_currency: RewardCurrency;
  reward_amount: number | null;
  reward_tier: RewardTier | null;
  reveal_mechanic: RevealMechanic;
  reward_payload: Record<string, unknown>;
}>> {
  // Season IDs that start with "demo-" are locally-generated (not real DB UUIDs).
  // Always use the local/demo path for these to avoid sending a non-UUID to the
  // backend edge function which expects a valid UUID column value.
  const isLocalSeasonId = seasonId.startsWith('demo-');

  if (!await canUseSupabaseDataAsync() || isLocalSeasonId) {
    // Demo / local mode: update localStorage progress
    const cached = getDemoSeason();
    const season = cached?.season;
    if (!season) return { data: null, error: new Error('No active demo season') };

    const progress = getDemoProgress(seasonId) ?? {
      user_id: userId,
      season_id: seasonId,
      last_opened_date: null,
      last_opened_day: 0,
      opened_days: [],
      opened_bonus_days: [],
      symbol_counts: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Check if this specific door type has been opened already
    const openedDays = doorType === 'free' ? progress.opened_days : (progress.opened_bonus_days ?? []);
    if (openedDays.includes(dayIndex)) {
      return { data: null, error: new Error(`You already opened this ${doorType} hatch`) };
    }

    // Validate the day is openable based on season type
    if (season.season_type === 'personal_quest') {
      // Sequential: only the next available day can be opened
      const totalDays = computeTotalFreeDoors(cached?.hatches ?? []);
      const nextDay = computePersonalQuestTodayIndex(progress, totalDays);
      if (dayIndex !== nextDay) {
        return { data: null, error: new Error(`You can only open day ${nextDay} next`) };
      }
    } else {
      // Holiday: can open today's door or any missed (past) door
      const todayIndex = computeTodayDayIndex(season.starts_on);
      if (dayIndex > todayIndex) {
        return { data: null, error: new Error(`Day ${dayIndex} is not available yet`) };
      }
    }

    // For bonus doors, check if habit is completed (demo mode: always unlocked for testing)
    // In production, this would check actual habit completion

    // Find the hatch for this day and door type
    const hatch = cached?.hatches.find((h) => h.day_index === dayIndex && h.door_type === doorType);
    if (!hatch) {
      return { data: null, error: new Error('Hatch not found') };
    }

    const updated: CalendarProgress = {
      ...progress,
      last_opened_date: new Date().toISOString().split('T')[0],
      last_opened_day: dayIndex,
      opened_days: doorType === 'free' ? [...progress.opened_days, dayIndex] : progress.opened_days,
      opened_bonus_days: doorType === 'bonus'
        ? [...(progress.opened_bonus_days ?? []), dayIndex]
        : (progress.opened_bonus_days ?? []),
      updated_at: new Date().toISOString(),
    };

    setDemoProgress(seasonId, updated);

    // Refresh the cached season data so the UI sees the update
    if (cached) {
      setDemoSeason({ ...cached, progress: updated });
    }

    return {
      data: {
        reward_currency: normalizeRewardCurrency(hatch.reward_currency as RewardCurrency | 'diamond' | null),
        reward_amount: normalizeRewardAmount(
          hatch.reward_currency as RewardCurrency | 'diamond' | null,
          hatch.reward_amount,
        ),
        reward_tier: hatch.reward_tier,
        reveal_mechanic: hatch.reveal_mechanic,
        reward_payload: hatch.reward_payload,
      },
      error: null,
    };
  }

  // Production mode: call the edge function
  try {
    const supabase = getSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return { data: null, error: new Error('Not authenticated') };

    const supabaseUrl = getSupabaseUrl();
    if (!supabaseUrl) return { data: null, error: new Error('Supabase URL not configured') };
    const response = await fetch(`${supabaseUrl}/functions/v1/treat-calendar/open`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ season_id: seasonId, day_index: dayIndex, door_type: doorType }),
    });

    const body = await response.json();
    if (!response.ok) {
      return { data: null, error: new Error(body.error ?? 'Failed to open hatch') };
    }

    return {
      data: {
        reward_currency: normalizeRewardCurrency(body.reward_currency as RewardCurrency | 'diamond' | null),
        reward_amount: normalizeRewardAmount(
          body.reward_currency as RewardCurrency | 'diamond' | null,
          body.reward_amount as number | null,
        ),
        reward_tier: body.reward_tier as RewardTier | null,
        reveal_mechanic: body.reveal_mechanic as RevealMechanic,
        reward_payload: body.reward_payload as Record<string, unknown>,
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

// ---------------------------------------------------------------------------
// Habit Completion Check (for bonus door gating)
// ---------------------------------------------------------------------------

/**
 * Check if the user has completed at least one habit today.
 * Used to gate bonus door access.
 *
 * @param userId - The user's ID
 * @returns true if at least one habit was completed today
 */
export async function isHabitCompletedToday(userId: string): Promise<boolean> {
  if (!await canUseSupabaseDataAsync()) {
    // Demo mode: randomly return true/false with 50% probability.
    // This allows QA and demos to test both locked and unlocked bonus door
    // states without needing to complete actual habits.
    return Math.random() > 0.5;
  }

  try {
    const supabase = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('habit_logs_v2')
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)
      .limit(1);

    if (error) {
      console.warn('Failed to check habit completion:', error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  } catch (e) {
    console.warn('Failed to check habit completion:', e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Door Status Computation
// ---------------------------------------------------------------------------

/**
 * Compute the status of a door in the calendar grid.
 *
 * @param dayIndex - The day index of the door (1-based)
 * @param todayIndex - Today's day index in the season (1-based)
 * @param isOpened - Whether the door has been opened
 * @param doorType - The type of door (free/bonus)
 * @param seasonType - The season type; holiday calendars allow catch-up on missed days
 * @returns The door status
 */
export function computeDoorStatus(
  dayIndex: number,
  todayIndex: number,
  isOpened: boolean,
  doorType: DoorType = 'free',
  seasonType?: SeasonType,
): DoorStatus {
  if (isOpened) return 'opened';
  if (dayIndex === todayIndex) return 'today';
  if (dayIndex < todayIndex) {
    // Holiday calendars allow catch-up on missed days
    if (seasonType === 'holiday') return 'catchup';
    return 'missed';
  }
  if (dayIndex > todayIndex) return 'locked';
  return 'available';
}

/**
 * Get the empty door flavour text for a holiday.
 */
export function getEmptyDoorFlavour(holidayKey: HolidayKey | null): string {
  const key = holidayKey ?? 'christmas';
  const texts = EMPTY_DOOR_FLAVOUR[key] ?? EMPTY_DOOR_FLAVOUR.christmas;
  return texts[Math.floor(Math.random() * texts.length)];
}

/**
 * Get hatches for a specific day, grouped by door type.
 */
export function getHatchesForDay(
  hatches: CalendarHatch[],
  dayIndex: number,
): { free: CalendarHatch | null; bonus: CalendarHatch | null } {
  const dayHatches = hatches.filter((h) => h.day_index === dayIndex);
  return {
    free: dayHatches.find((h) => h.door_type === 'free') ?? null,
    bonus: dayHatches.find((h) => h.door_type === 'bonus') ?? null,
  };
}

// ---------------------------------------------------------------------------
// Streak computation (Monopoly GO-style daily treat streak)
// ---------------------------------------------------------------------------

export type StreakInfo = {
  /** Number of consecutive days the user has opened doors (1-7). */
  currentStreak: number;
  /** Whether the streak is still alive (user opened a door today or yesterday). */
  isActive: boolean;
  /** Streak multiplier label, e.g. "×2" for 2-day streaks. */
  multiplierLabel: string;
  /** Bonus dice awarded for maintaining the streak (0 if streak < 3). */
  streakBonusDice: number;
};

/**
 * Compute the user's current daily treat streak from their progress record.
 *
 * A streak is the number of consecutive calendar days the user has opened
 * at least one door. The streak resets if the user misses a day (Monopoly
 * GO-style). The maximum streak shown is 7 (one full quest cycle).
 *
 * Streak bonuses:
 *   3-day streak:  +5 bonus dice on next open
 *   5-day streak:  +15 bonus dice on next open
 *   7-day streak:  +30 bonus dice on next open (full cycle)
 */
export function computeStreak(progress: CalendarProgress | null): StreakInfo {
  const fallback: StreakInfo = { currentStreak: 0, isActive: false, multiplierLabel: '', streakBonusDice: 0 };
  if (!progress || progress.opened_days.length === 0) return fallback;

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const lastDate = progress.last_opened_date;
  if (!lastDate) return fallback;

  // Streak is alive if the user opened a door today or yesterday
  const isActive = lastDate === todayStr || lastDate === yesterdayStr;
  if (!isActive) return fallback;

  // Count the streak — how many consecutive days have doors been opened?
  // We use the opened_days count as the streak length since each day can
  // only be opened once per calendar day (enforced by computePersonalQuestTodayIndex).
  const currentStreak = Math.min(progress.opened_days.length, 7);

  const multiplierLabel = currentStreak >= 2 ? `×${currentStreak}` : '';
  const streakBonusDice = currentStreak >= 7 ? 30 : currentStreak >= 5 ? 15 : currentStreak >= 3 ? 5 : 0;

  return { currentStreak, isActive, multiplierLabel, streakBonusDice };
}
