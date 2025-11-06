// ========================================================
// EDGE FUNCTION: auto-progression
// Purpose: Nightly job to evaluate habits and adjust schedule
// ========================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Auto-progression job started');

    // Get all habits with autoprog config
    const { data: habits, error: habitsError } = await supabase
      .from('habits_v2')
      .select('*')
      .not('autoprog', 'is', null);

    if (habitsError) throw habitsError;

    if (!habits || habits.length === 0) {
      console.log('No habits with auto-progression enabled');
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processed = 0;
    const today = new Date().toISOString().split('T')[0];
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const habit of habits) {
      const autoprog = habit.autoprog as any;
      if (!autoprog || !autoprog.mode) continue;

      // Get logs for last 14 days
      const { data: logs, error: logsError } = await supabase
        .from('habit_logs_v2')
        .select('*')
        .eq('habit_id', habit.id)
        .gte('date', fourteenDaysAgo)
        .lte('date', today);

      if (logsError) {
        console.error(`Error fetching logs for habit ${habit.id}:`, logsError);
        continue;
      }

      // Calculate success rate
      const doneDays = new Set(logs?.filter(l => l.done).map(l => l.date) || []);
      const totalDays = 14;
      const successRate = doneDays.size / totalDays;

      console.log(`Habit ${habit.id}: success rate = ${successRate.toFixed(2)}`);

      // Check if we should progress
      const minSuccessRate = autoprog.min_success_rate || 0.75;
      if (successRate < minSuccessRate) {
        console.log(`Habit ${habit.id}: success rate too low, skipping`);
        continue;
      }

      // Update schedule based on mode
      const schedule = habit.schedule as any;
      let updated = false;

      if (autoprog.mode === 'times_per_week' && schedule.mode === 'times_per_week') {
        const increaseBy = autoprog.increase_by || 1;
        const maxValue = autoprog.max_value || 7;
        const currentValue = schedule.value || 3;
        
        if (currentValue < maxValue) {
          const newValue = Math.min(currentValue + increaseBy, maxValue);
          schedule.value = newValue;
          updated = true;
          console.log(`Habit ${habit.id}: increased times_per_week from ${currentValue} to ${newValue}`);
        }
      } else if (autoprog.mode === 'every_n_days' && schedule.mode === 'every_n_days') {
        const decreaseBy = autoprog.decrease_by || 1;
        const minValue = autoprog.min_value || 1;
        const currentValue = schedule.value || 2;
        
        if (currentValue > minValue) {
          const newValue = Math.max(currentValue - decreaseBy, minValue);
          schedule.value = newValue;
          updated = true;
          console.log(`Habit ${habit.id}: decreased every_n_days from ${currentValue} to ${newValue}`);
        }
      }

      if (updated) {
        const { error: updateError } = await supabase
          .from('habits_v2')
          .update({ schedule })
          .eq('id', habit.id);

        if (updateError) {
          console.error(`Error updating habit ${habit.id}:`, updateError);
        } else {
          processed++;
        }
      }
    }

    console.log(`Auto-progression job completed: ${processed} habits updated`);

    return new Response(JSON.stringify({ success: true, processed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Auto-progression error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
