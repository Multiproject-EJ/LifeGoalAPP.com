// ========================================================
// EDGE FUNCTION: treat-calendar
// Purpose: Monthly Treat Calendar — season info, user progress, hatch opening
// ========================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function err(message: string, status = 400): Response {
  return json({ error: message }, status);
}

/** Resolve today's 1-based day index within the active season. */
function todayDayIndex(startsOn: string): number {
  const start = new Date(startsOn);
  const today = new Date();
  // Use UTC date arithmetic to stay consistent across timezones
  const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.floor((todayUTC - startUTC) / (1000 * 60 * 60 * 24));
  return diffDays + 1; // 1-based
}

Deno.serve(async (req) => {
  // CORS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Authenticate caller
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return err('Missing Authorization header', 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return err('Unauthorized', 401);

  const url = new URL(req.url);
  const pathname = url.pathname;

  // --------------------------------------------------------
  // GET /treat-calendar?season_id=<uuid>
  // Returns active season info + hatches + user progress.
  // If season_id is omitted, the current active season is used.
  // --------------------------------------------------------
  if (req.method === 'GET') {
    const seasonId = url.searchParams.get('season_id');

    let seasonQuery = supabase.from('daily_calendar_seasons').select('*');
    if (seasonId) {
      seasonQuery = seasonQuery.eq('id', seasonId);
    } else {
      seasonQuery = seasonQuery.eq('status', 'active').order('starts_on', { ascending: false }).limit(1);
    }

    const { data: seasons, error: seasonError } = await seasonQuery;
    if (seasonError) return err(seasonError.message, 500);
    if (!seasons || seasons.length === 0) return err('No active season found', 404);

    const season = seasons[0];

    // Fetch all hatches for the season
    const { data: hatches, error: hatchError } = await supabase
      .from('daily_calendar_hatches')
      .select('*')
      .eq('season_id', season.id)
      .order('day_index', { ascending: true });
    if (hatchError) return err(hatchError.message, 500);

    // Fetch user progress for this season
    const { data: progress } = await supabase
      .from('daily_calendar_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('season_id', season.id)
      .maybeSingle();

    const currentDayIndex = todayDayIndex(season.starts_on);

    return json({
      season,
      hatches: hatches ?? [],
      progress: progress ?? null,
      today_day_index: currentDayIndex,
    });
  }

  // --------------------------------------------------------
  // POST /treat-calendar/open
  // Opens today's hatch for the authenticated user.
  // Body: { season_id: string, day_index: number }
  // --------------------------------------------------------
  if (req.method === 'POST' && pathname.endsWith('/open')) {
    let body: { season_id?: string; day_index?: number };
    try {
      body = await req.json();
    } catch {
      return err('Invalid JSON body');
    }

    const { season_id, day_index } = body;
    if (!season_id || day_index === undefined) {
      return err('season_id and day_index are required');
    }

    // Fetch the season
    const { data: season, error: seasonError } = await supabase
      .from('daily_calendar_seasons')
      .select('*')
      .eq('id', season_id)
      .maybeSingle();
    if (seasonError) return err(seasonError.message, 500);
    if (!season) return err('Season not found', 404);
    if (season.status !== 'active') return err('Season is not active', 400);

    // Validate that day_index matches today
    const todayIndex = todayDayIndex(season.starts_on);
    if (day_index !== todayIndex) {
      return err(`You can only open today's hatch (day ${todayIndex}), not day ${day_index}`, 400);
    }

    // Check existing progress — did the user already open today?
    const { data: progress } = await supabase
      .from('daily_calendar_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('season_id', season_id)
      .maybeSingle();

    const openedDays: number[] = progress?.opened_days ?? [];
    if (openedDays.includes(day_index)) {
      return err('You already opened today\'s hatch', 409);
    }

    // Fetch the hatch definition for this day
    const { data: hatch, error: hatchError } = await supabase
      .from('daily_calendar_hatches')
      .select('*')
      .eq('season_id', season_id)
      .eq('day_index', day_index)
      .maybeSingle();
    if (hatchError) return err(hatchError.message, 500);

    // Build the reward payload from the hatch definition (or generate a default)
    const rewardPayload = hatch?.reward_payload ?? {
      reward_type: 'xp',
      reward_value: 10,
    };

    // Insert the reward audit record
    const { error: rewardError } = await supabase.from('daily_calendar_rewards').insert({
      user_id: user.id,
      season_id,
      day_index,
      reward_type: (rewardPayload as Record<string, unknown>).reward_type ?? 'xp',
      reward_payload: rewardPayload,
    });
    if (rewardError) return err(rewardError.message, 500);

    // Upsert progress
    const updatedOpenedDays = [...openedDays, day_index];
    const { error: progressError } = await supabase.from('daily_calendar_progress').upsert(
      {
        user_id: user.id,
        season_id,
        last_opened_date: new Date().toISOString().split('T')[0],
        last_opened_day: day_index,
        opened_days: updatedOpenedDays,
        symbol_counts: progress?.symbol_counts ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,season_id' },
    );
    if (progressError) return err(progressError.message, 500);

    return json({ reward_payload: rewardPayload, day_index, opened_days: updatedOpenedDays });
  }

  return err('Not found', 404);
});
