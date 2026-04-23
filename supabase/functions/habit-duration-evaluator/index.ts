import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

type DurationHabitRow = {
  id: string;
  user_id: string;
  status: 'active' | 'paused' | 'deactivated' | 'archived';
  duration_mode: string | null;
  duration_end_at: string | null;
  on_duration_end: string | null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const pathname = new URL(req.url).pathname;
  if (!pathname.endsWith('/cron')) {
    return new Response(JSON.stringify({ error: 'Use /cron endpoint' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret =
    Deno.env.get('DURATION_EVAL_CRON_SECRET') ||
    Deno.env.get('CRON_SECRET') ||
    '';

  if (!expectedSecret || cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase environment variables' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const nowIso = new Date().toISOString();
    const { data: dueHabits, error: dueError } = await supabase
      .from('habits_v2')
      .select('id, user_id, status, duration_mode, duration_end_at, on_duration_end')
      .eq('status', 'active')
      .eq('duration_mode', 'fixed_window')
      .lte('duration_end_at', nowIso)
      .returns<DurationHabitRow[]>();

    if (dueError) throw dueError;

    if (!dueHabits || dueHabits.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, paused: 0, deactivated: 0, message: 'No duration-expired habits' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let paused = 0;
    let deactivated = 0;

    for (const habit of dueHabits) {
      if (habit.on_duration_end === 'deactivate') {
        const { error } = await supabase
          .from('habits_v2')
          .update({
            status: 'deactivated',
            deactivated_at: nowIso,
            deactivated_reason: 'Program duration completed automatically (background evaluator)',
            paused_at: null,
            paused_reason: null,
            resume_on: null,
          })
          .eq('id', habit.id);
        if (error) {
          console.error('Failed to deactivate habit', habit.id, error);
          continue;
        }
        deactivated += 1;
      } else {
        const { error } = await supabase
          .from('habits_v2')
          .update({
            status: 'paused',
            paused_at: nowIso,
            paused_reason: 'Program duration completed automatically (background evaluator)',
            resume_on: null,
            deactivated_at: null,
            deactivated_reason: null,
          })
          .eq('id', habit.id);
        if (error) {
          console.error('Failed to pause habit', habit.id, error);
          continue;
        }
        paused += 1;
      }

      // Prevent stale reminder sends for completed programs
      await supabase.from('habit_reminders').delete().eq('habit_id', habit.id);
      await supabase.from('habit_reminder_prefs').upsert({ habit_id: habit.id, enabled: false }, { onConflict: 'habit_id' });
    }

    return new Response(
      JSON.stringify({ success: true, processed: paused + deactivated, paused, deactivated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Duration evaluator failed:', error);
    return new Response(JSON.stringify({ error: 'Duration evaluator failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
