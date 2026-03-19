import { canUseSupabaseData, getSupabaseClient, getSupabaseUrl } from '../lib/supabaseClient';

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
  created_at: string;
  updated_at: string;
};

export type CalendarHatch = {
  id: string;
  season_id: string;
  day_index: number;
  symbol_name: string | null;
  symbol_emoji: string | null;
  numbers: number[] | null;
  number_reward: number | null;
  symbol_reward: string | null;
  reward_payload: Record<string, unknown>;
  created_at: string;
};

export type CalendarProgress = {
  user_id: string;
  season_id: string;
  last_opened_date: string | null;
  last_opened_day: number;
  opened_days: number[];
  symbol_counts: Record<string, number>;
  created_at: string;
  updated_at: string;
};

export type CalendarSeasonData = {
  season: CalendarSeason;
  hatches: CalendarHatch[];
  progress: CalendarProgress | null;
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
    theme_name: 'Christmas Advent',
    displayName: 'Christmas',
    holiday_key: 'christmas',
    countdownStart: { month: 11, day: 1 },
    holidayDate: { month: 11, day: 25 },
    emojis: ['🎄', '⭐', '🎁', '🦌', '🔔', '❄️', '🕯️', '🍪', '🧦', '☃️'],
  },
  {
    theme_name: 'Halloween Countdown',
    displayName: 'Halloween',
    holiday_key: 'halloween',
    countdownStart: { month: 9, day: 1 },
    holidayDate: { month: 9, day: 31 },
    emojis: ['🎃', '👻', '🕷️', '🦇', '🕯️', '💀', '🕸️', '🍬', '🧙', '🌙'],
  },
  {
    // Easter is a movable feast (Mar 22 – Apr 25). The demo window covers the
    // common range; production seasons should seed the exact date per year.
    theme_name: 'Easter Countdown',
    displayName: 'Easter',
    holiday_key: 'easter',
    countdownStart: { month: 2, day: 18 },
    holidayDate: { month: 3, day: 25 },
    emojis: ['🐣', '🌸', '🥚', '🐰', '🌷', '🦋', '🌼', '🍀', '✨', '🌈'],
  },
  {
    // Eid al-Fitr is lunar and shifts each year. This demo window is an
    // approximation; production seasons should seed the exact date per year.
    theme_name: 'Eid Mubarak Countdown',
    displayName: 'Eid Mubarak',
    holiday_key: 'eid_mubarak',
    countdownStart: { month: 2, day: 30 },
    holidayDate: { month: 3, day: 10 },
    emojis: ['🌙', '🕌', '✨', '🤲', '⭐', '🕯️', '🌟', '💛', '🎉', '🪔'],
  },
  {
    theme_name: 'Valentine\'s Countdown',
    displayName: 'Valentine\'s Day',
    holiday_key: 'valentines_day',
    countdownStart: { month: 1, day: 12 },
    holidayDate: { month: 1, day: 14 },
    emojis: ['💘', '❤️', '🌹', '💌', '💝', '🍫', '💕', '✨', '🎀', '💗'],
  },
  {
    theme_name: 'New Year Countdown',
    displayName: 'New Year',
    holiday_key: 'new_year',
    countdownStart: { month: 11, day: 26 },
    holidayDate: { month: 0, day: 1 },
    emojis: ['🎉', '🥂', '🎆', '🎊', '⭐', '✨', '🎇', '🕛', '🥳', '🌟'],
  },
  {
    // US Thanksgiving falls on the 4th Thursday of November (Nov 22–28).
    // The demo window covers Nov 1–28; production seasons should seed the
    // exact date per year.
    theme_name: 'Thanksgiving Countdown',
    displayName: 'Thanksgiving',
    holiday_key: 'thanksgiving',
    countdownStart: { month: 10, day: 1 },
    holidayDate: { month: 10, day: 28 },
    emojis: ['🦃', '🍂', '🌽', '🥧', '🍁', '🌾', '🥕', '🙏', '🍎', '🍠'],
  },
  {
    theme_name: 'Hanukkah Countdown',
    displayName: 'Hanukkah',
    holiday_key: 'hanukkah',
    countdownStart: { month: 11, day: 14 },
    holidayDate: { month: 11, day: 22 },
    emojis: ['🕎', '✡️', '🕯️', '💙', '⭐', '🎁', '🪙', '🥞', '🌟', '✨'],
  },
  {
    theme_name: 'St. Patrick\'s Day Countdown',
    displayName: 'St. Patrick\'s Day',
    holiday_key: 'st_patricks_day',
    countdownStart: { month: 2, day: 10 },
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

/**
 * Pick a demo advent season to display.
 * Prefers the advent whose countdown window includes today;
 * falls back to Christmas as the canonical advent calendar.
 */
function pickDemoAdventMeta(year: number): { meta: AdventMeta; startsOn: string; endsOn: string } {
  const today = new Date();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  for (const meta of ADVENT_META) {
    const { countdownStart: cs, holidayDate: hd } = meta;
    if (isInCountdownWindow(todayM, todayD, cs.month, cs.day, hd.month, hd.day)) {
      const startsOn = new Date(year, cs.month, cs.day).toISOString().split('T')[0];
      const endsOn = new Date(year, hd.month, hd.day).toISOString().split('T')[0];
      return { meta, startsOn, endsOn };
    }
  }

  // Default: Christmas advent in the current year
  const xmas = ADVENT_META[0];
  return {
    meta: xmas,
    startsOn: new Date(year, xmas.countdownStart.month, xmas.countdownStart.day).toISOString().split('T')[0],
    endsOn: new Date(year, xmas.holidayDate.month, xmas.holidayDate.day).toISOString().split('T')[0],
  };
}

/** Build a demo advent season for the nearest matching holiday. */
function buildDemoSeasonData(userId: string): CalendarSeasonData {
  const now = new Date();
  const year = now.getFullYear();
  const { meta, startsOn, endsOn } = pickDemoAdventMeta(year);

  const season: CalendarSeason = {
    id: `demo-season-${meta.holiday_key}`,
    theme_name: meta.theme_name,
    starts_on: startsOn,
    ends_on: endsOn,
    status: 'active',
    holiday_key: meta.holiday_key,
    created_at: new Date(startsOn).toISOString(),
    updated_at: new Date(startsOn).toISOString(),
  };

  const rewardTypes = ['xp', 'shard', 'cosmetic', 'bonus', 'mystery'] as const;

  // Compute the total number of hatch doors (days in the countdown)
  const start = new Date(startsOn);
  const end = new Date(endsOn);
  const totalDays =
    Math.floor(
      (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
        Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
        (1000 * 60 * 60 * 24),
    ) + 1;

  const hatches: CalendarHatch[] = Array.from({ length: totalDays }, (_, i) => {
    const dayIndex = i + 1;
    const rewardType = rewardTypes[dayIndex % rewardTypes.length];
    const emoji = meta.emojis[dayIndex % meta.emojis.length];
    const rewardValue = rewardType === 'xp' ? 20 + (dayIndex % 3) * 10 : 10 + dayIndex;
    return {
      id: `demo-hatch-${dayIndex}`,
      season_id: season.id,
      day_index: dayIndex,
      symbol_name: `reward_${rewardType}`,
      symbol_emoji: emoji,
      numbers: null,
      number_reward: null,
      symbol_reward: rewardType,
      reward_payload: { reward_type: rewardType, reward_value: rewardValue },
      created_at: season.created_at,
    };
  });

  const todayIndex = computeTodayDayIndex(startsOn);

  // Pre-open the first few days up to (but not including) today, to show
  // the scratch-card reveal state in the UI.
  const preOpenedDays = Array.from(
    { length: Math.max(0, Math.min(todayIndex - 1, 5)) },
    (_, i) => i + 1,
  );

  const storedProgress = getDemoProgress(season.id);
  const progress: CalendarProgress = storedProgress ?? {
    user_id: userId,
    season_id: season.id,
    last_opened_date: preOpenedDays.length > 0
      ? new Date(start.getFullYear(), start.getMonth(), preOpenedDays[preOpenedDays.length - 1]).toISOString().split('T')[0]
      : null,
    last_opened_day: preOpenedDays[preOpenedDays.length - 1] ?? 0,
    opened_days: preOpenedDays,
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
  if (!canUseSupabaseData()) {
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
        hatches: (hatches ?? []) as unknown as CalendarHatch[],
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
  if (!canUseSupabaseData()) {
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
 * - the user has not already opened today's hatch
 *
 * @returns The reward_payload for the opened hatch
 */
export async function openTodayHatch(
  userId: string,
  seasonId: string,
  dayIndex: number,
): Promise<ServiceResponse<Record<string, unknown>>> {
  if (!canUseSupabaseData()) {
    // Demo mode: update localStorage progress
    const cached = getDemoSeason();
    const season = cached?.season;
    if (!season) return { data: null, error: new Error('No active demo season') };

    const todayIndex = computeTodayDayIndex(season.starts_on);
    if (dayIndex !== todayIndex) {
      return { data: null, error: new Error(`You can only open today's hatch (day ${todayIndex})`) };
    }

    const progress = getDemoProgress(seasonId) ?? {
      user_id: userId,
      season_id: seasonId,
      last_opened_date: null,
      last_opened_day: 0,
      opened_days: [],
      symbol_counts: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (progress.opened_days.includes(dayIndex)) {
      return { data: null, error: new Error('You already opened today\'s hatch') };
    }

    const hatch = cached?.hatches.find((h) => h.day_index === dayIndex);
    const rewardPayload = hatch?.reward_payload ?? { reward_type: 'xp', reward_value: 10 };

    const updated: CalendarProgress = {
      ...progress,
      last_opened_date: new Date().toISOString().split('T')[0],
      last_opened_day: dayIndex,
      opened_days: [...progress.opened_days, dayIndex],
      updated_at: new Date().toISOString(),
    };

    setDemoProgress(seasonId, updated);

    // Refresh the cached season data so the UI sees the update
    if (cached) {
      setDemoSeason({ ...cached, progress: updated });
    }

    return { data: rewardPayload, error: null };
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
      body: JSON.stringify({ season_id: seasonId, day_index: dayIndex }),
    });

    const body = await response.json();
    if (!response.ok) {
      return { data: null, error: new Error(body.error ?? 'Failed to open hatch') };
    }

    return { data: body.reward_payload as Record<string, unknown>, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}
