import { canUseSupabaseData, getSupabaseClient, getSupabaseUrl } from '../lib/supabaseClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CalendarSeason = {
  id: string;
  theme_name: string;
  starts_on: string; // date string YYYY-MM-DD
  ends_on: string;   // date string YYYY-MM-DD
  status: 'active' | 'archived' | 'draft';
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

/** Build a demo season for the current calendar month. */
function buildDemoSeasonData(userId: string): CalendarSeasonData {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startsOn = new Date(year, month, 1).toISOString().split('T')[0];
  const endsOn = new Date(year, month + 1, 0).toISOString().split('T')[0];

  const season: CalendarSeason = {
    id: 'demo-season-current',
    theme_name: 'Spring Garden',
    starts_on: startsOn,
    ends_on: endsOn,
    status: 'active',
    created_at: new Date(year, month, 1).toISOString(),
    updated_at: new Date(year, month, 1).toISOString(),
  };

  const rewardTypes = ['xp', 'shard', 'cosmetic', 'bonus', 'mystery'] as const;
  const emojis = ['🌸', '🌟', '💎', '🎁', '🌈', '✨', '🦋', '🌺', '🍀', '⭐'];

  const hatches: CalendarHatch[] = Array.from({ length: 31 }, (_, i) => {
    const dayIndex = i + 1;
    const rewardType = rewardTypes[dayIndex % rewardTypes.length];
    const emoji = emojis[dayIndex % emojis.length];
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
      ? new Date(year, month, preOpenedDays[preOpenedDays.length - 1]).toISOString().split('T')[0]
      : null,
    last_opened_day: preOpenedDays[preOpenedDays.length - 1] ?? 0,
    opened_days: preOpenedDays,
    symbol_counts: {},
    created_at: new Date(year, month, 1).toISOString(),
    updated_at: new Date().toISOString(),
  };

  return { season, hatches, progress, today_day_index: todayIndex };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the active season together with all hatch definitions and the
 * caller's progress.  Falls back to demo data in demo mode.
 */
export async function fetchCurrentSeason(userId: string): Promise<ServiceResponse<CalendarSeasonData>> {
  if (!canUseSupabaseData()) {
    const cached = getDemoSeason();
    if (cached) return { data: cached, error: null };
    const demo = buildDemoSeasonData(userId);
    setDemoSeason(demo);
    return { data: demo, error: null };
  }

  try {
    const supabase = getSupabaseClient();
    const { data: seasons, error: seasonError } = await supabase
      .from('daily_calendar_seasons')
      .select('*')
      .eq('status', 'active')
      .order('starts_on', { ascending: false })
      .limit(1);

    if (seasonError) return { data: null, error: new Error(seasonError.message) };
    if (!seasons || seasons.length === 0) return { data: null, error: new Error('No active season') };

    const season = seasons[0] as CalendarSeason;

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
        hatches: (hatches ?? []) as CalendarHatch[],
        progress: progress as CalendarProgress | null,
        today_day_index: computeTodayDayIndex(season.starts_on),
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/**
 * Fetch the user's progress for a specific season.
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
    return { data: data as CalendarProgress | null, error: null };
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
