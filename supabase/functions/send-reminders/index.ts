// ========================================================
// EDGE FUNCTION: send-reminders
// Purpose: Web Push reminders + quick action logging + per-user/per-habit preferences
// ========================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAYS = [500, 2000]; // ms

// Helper: Sleep for specified milliseconds
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Get local time in a specific timezone
function getLocalTimeInTimezone(timezone: string): { hours: number; minutes: number; dayOfWeek: number } {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    const weekdayStr = parts.find(p => p.type === 'weekday')?.value || 'Sun';
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayOfWeek = dayMap[weekdayStr] ?? 0;
    return { hours, minutes, dayOfWeek };
  } catch {
    // Fallback to UTC
    const now = new Date();
    return { hours: now.getUTCHours(), minutes: now.getUTCMinutes(), dayOfWeek: now.getUTCDay() };
  }
}

// Helper: Check if current time is within a window
function isTimeInWindow(
  hours: number,
  minutes: number,
  windowStart: string,
  windowEnd: string
): boolean {
  const [startH, startM] = windowStart.split(':').map(Number);
  const [endH, endM] = windowEnd.split(':').map(Number);
  const current = hours * 60 + minutes;
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;
  
  if (start <= end) {
    return current >= start && current <= end;
  } else {
    // Window crosses midnight
    return current >= start || current <= end;
  }
}

// Helper: Check if current time is at or after preferred_time
function isAtOrAfterPreferredTime(
  hours: number,
  minutes: number,
  preferredTime: string | null
): boolean {
  if (!preferredTime) return true; // No preferred time means always eligible
  
  const [prefH, prefM] = preferredTime.split(':').map(Number);
  const current = hours * 60 + minutes;
  const preferred = prefH * 60 + prefM;
  
  return current >= preferred;
}

// Helper: Check if reminder was already sent today (idempotent delivery)
function wasReminderSentToday(lastSentAt: string | null, timezone: string): boolean {
  if (!lastSentAt) return false;
  
  try {
    const lastSent = new Date(lastSentAt);
    const now = new Date();
    
    // Get today's date in the user's timezone
    const todayFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayStr = todayFormatter.format(now);
    const lastSentStr = todayFormatter.format(lastSent);
    
    return todayStr === lastSentStr;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathname = url.pathname;

  try {
    // Health check
    if (pathname.endsWith('/health') && req.method === 'GET') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // GET /prefs - Get current user's reminder preferences
    if (pathname.endsWith('/prefs') && req.method === 'GET') {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: prefs, error: prefsError } = await supabase
        .from('user_reminder_prefs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefsError) throw prefsError;

      // Return defaults if no prefs exist
      const result = prefs || {
        user_id: user.id,
        timezone: 'UTC',
        window_start: '08:00:00',
        window_end: '10:00:00',
        created_at: null,
        updated_at: null,
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT /prefs - Update current user's reminder preferences
    if (pathname.endsWith('/prefs') && req.method === 'PUT') {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { timezone, window_start, window_end } = body;

      // Validate timezone if provided
      if (timezone !== undefined && typeof timezone !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid timezone format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate time format (HH:MM:SS or HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
      if (window_start !== undefined && !timeRegex.test(window_start)) {
        return new Response(JSON.stringify({ error: 'Invalid window_start format. Use HH:MM or HH:MM:SS' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (window_end !== undefined && !timeRegex.test(window_end)) {
        return new Response(JSON.stringify({ error: 'Invalid window_end format. Use HH:MM or HH:MM:SS' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const updateData: Record<string, string> = { user_id: user.id };
      if (timezone !== undefined) updateData.timezone = timezone;
      if (window_start !== undefined) updateData.window_start = window_start.length === 5 ? `${window_start}:00` : window_start;
      if (window_end !== undefined) updateData.window_end = window_end.length === 5 ? `${window_end}:00` : window_end;

      const { data: updatedPrefs, error: updateError } = await supabase
        .from('user_reminder_prefs')
        .upsert(updateData, { onConflict: 'user_id' })
        .select()
        .single();

      if (updateError) throw updateError;

      return new Response(JSON.stringify(updatedPrefs), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Subscribe to push notifications
    if (pathname.endsWith('/subscribe') && req.method === 'POST') {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { endpoint, keys } = body;

      if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
        return new Response(JSON.stringify({ error: 'Missing subscription fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log habit from notification action (done/snooze/dismiss)
    if (pathname.endsWith('/log') && req.method === 'POST') {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { habit_id, action, payload } = body;

      if (!habit_id) {
        return new Response(JSON.stringify({ error: 'Missing habit_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate action
      const validActions = ['done', 'snooze', 'dismiss'];
      const resolvedAction = action || 'done'; // backward compatibility
      if (!validActions.includes(resolvedAction)) {
        return new Response(JSON.stringify({ error: 'Invalid action. Must be done, snooze, or dismiss' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log the action
      const { error: logError } = await supabase.from('reminder_action_logs').insert({
        habit_id,
        user_id: user.id,
        action: resolvedAction,
        payload: payload || null,
      });

      if (logError) {
        console.error('Failed to log reminder action:', logError);
        // Continue even if logging fails - don't block the user
      }

      // Handle specific actions
      if (resolvedAction === 'done') {
        // Mark habit as completed
        const { error: habitError } = await supabase.from('habit_logs_v2').insert({
          habit_id,
          user_id: user.id,
          done: true,
          value: null,
        });

        if (habitError) {
          console.error('Failed to log habit completion:', habitError);
        }
      } else if (resolvedAction === 'snooze') {
        // Set snooze_until to now + 1 day
        const snoozeUntil = new Date();
        snoozeUntil.setDate(snoozeUntil.getDate() + 1);
        
        const { error: snoozeError } = await supabase
          .from('habit_reminder_state')
          .upsert({
            habit_id,
            snooze_until: snoozeUntil.toISOString(),
          }, { onConflict: 'habit_id' });

        if (snoozeError) {
          console.error('Failed to set snooze:', snoozeError);
        }
      }
      // dismiss action only logs, no additional processing

      return new Response(JSON.stringify({ success: true, action: resolvedAction }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /habit-prefs - Get per-habit reminder preferences for all user's habits
    if (pathname.endsWith('/habit-prefs') && req.method === 'GET') {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get user's habits with their reminder prefs
      const { data: habits, error: habitsError } = await supabase
        .from('habits_v2')
        .select('id, title, emoji')
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('title', { ascending: true });

      if (habitsError) throw habitsError;

      if (!habits || habits.length === 0) {
        return new Response(JSON.stringify([]), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const habitIds = habits.map(h => h.id);
      const { data: prefs, error: prefsError } = await supabase
        .from('habit_reminder_prefs')
        .select('*')
        .in('habit_id', habitIds);

      if (prefsError) throw prefsError;

      // Build prefs map
      const prefsMap: Record<string, { enabled: boolean; preferred_time: string | null }> = {};
      for (const pref of (prefs || [])) {
        prefsMap[pref.habit_id] = {
          enabled: pref.enabled,
          preferred_time: pref.preferred_time,
        };
      }

      // Merge habits with prefs (default to enabled=true if no pref exists)
      const result = habits.map(h => ({
        habit_id: h.id,
        title: h.title,
        emoji: h.emoji,
        enabled: prefsMap[h.id]?.enabled ?? true,
        preferred_time: prefsMap[h.id]?.preferred_time ?? null,
      }));

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT /habit-prefs - Update per-habit reminder preference
    if (pathname.endsWith('/habit-prefs') && req.method === 'PUT') {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { habit_id, enabled, preferred_time } = body;

      if (!habit_id) {
        return new Response(JSON.stringify({ error: 'Missing habit_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify habit ownership
      const { data: habit, error: habitError } = await supabase
        .from('habits_v2')
        .select('id')
        .eq('id', habit_id)
        .eq('user_id', user.id)
        .single();

      if (habitError || !habit) {
        return new Response(JSON.stringify({ error: 'Habit not found or not owned by user' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate preferred_time format if provided
      if (preferred_time !== undefined && preferred_time !== null) {
        // Ensure preferred_time is a string
        const timeStr = String(preferred_time);
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
        if (!timeRegex.test(timeStr)) {
          return new Response(JSON.stringify({ error: 'Invalid preferred_time format. Use HH:MM or HH:MM:SS' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Build update data
      const updateData: { habit_id: string; enabled?: boolean; preferred_time?: string | null } = { habit_id };
      if (enabled !== undefined) updateData.enabled = Boolean(enabled);
      if (preferred_time !== undefined) {
        if (preferred_time === null || preferred_time === '') {
          updateData.preferred_time = null;
        } else {
          const timeStr = String(preferred_time);
          updateData.preferred_time = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
        }
      }

      const { data: updatedPref, error: updateError } = await supabase
        .from('habit_reminder_prefs')
        .upsert(updateData, { onConflict: 'habit_id' })
        .select()
        .single();

      if (updateError) throw updateError;

      return new Response(JSON.stringify(updatedPref), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /action-logs - Get recent reminder action logs for current user
    if (pathname.endsWith('/action-logs') && req.method === 'GET') {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);

      const { data: logs, error: logsError } = await supabase
        .from('reminder_action_logs')
        .select(`
          id,
          habit_id,
          action,
          payload,
          created_at,
          habits_v2!inner (
            title,
            emoji
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (logsError) throw logsError;

      return new Response(JSON.stringify(logs || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CRON: Send reminders with per-user timezone preferences, per-habit prefs, and idempotent delivery
    if (pathname.endsWith('/cron')) {
      console.log('CRON: Send reminders job triggered');
      
      try {
        const now = new Date();
        console.log('Server time (UTC):', now.toISOString());

        // Get all users with push subscriptions
        const { data: subscriptions, error: subsError } = await supabase
          .from('push_subscriptions')
          .select('user_id, endpoint, p256dh, auth');

        if (subsError) throw subsError;

        if (!subscriptions || subscriptions.length === 0) {
          return new Response(JSON.stringify({ success: true, message: 'No push subscriptions found', count: 0 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const userIds = [...new Set(subscriptions.map(s => s.user_id))];

        // Get user reminder preferences
        const { data: allPrefs, error: prefsError } = await supabase
          .from('user_reminder_prefs')
          .select('*')
          .in('user_id', userIds);

        if (prefsError) throw prefsError;

        // Build prefs map with defaults
        const prefsMap: Record<string, { timezone: string; window_start: string; window_end: string }> = {};
        for (const userId of userIds) {
          const userPrefs = allPrefs?.find(p => p.user_id === userId);
          prefsMap[userId] = {
            timezone: userPrefs?.timezone || 'UTC',
            window_start: userPrefs?.window_start || '08:00:00',
            window_end: userPrefs?.window_end || '10:00:00',
          };
        }

        // Filter users whose current local time is within their reminder window
        const eligibleUsers: string[] = [];
        const userLocalTime: Record<string, { hours: number; minutes: number; dayOfWeek: number }> = {};
        for (const userId of userIds) {
          const prefs = prefsMap[userId];
          const localTime = getLocalTimeInTimezone(prefs.timezone);
          userLocalTime[userId] = localTime;
          if (isTimeInWindow(localTime.hours, localTime.minutes, prefs.window_start, prefs.window_end)) {
            eligibleUsers.push(userId);
            console.log(`User ${userId} eligible: ${localTime.hours}:${localTime.minutes} in ${prefs.timezone} within ${prefs.window_start}-${prefs.window_end}`);
          }
        }

        if (eligibleUsers.length === 0) {
          return new Response(JSON.stringify({ success: true, message: 'No users in reminder window', count: 0 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get habits with reminders for eligible users
        const { data: habits, error: habitsError } = await supabase
          .from('habits_v2')
          .select(`
            id,
            user_id,
            title,
            emoji,
            archived,
            habit_reminders (
              id,
              local_time,
              days
            )
          `)
          .in('user_id', eligibleUsers)
          .eq('archived', false);

        if (habitsError) throw habitsError;

        if (!habits || habits.length === 0) {
          return new Response(JSON.stringify({ success: true, message: 'No habits found for eligible users', count: 0 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get reminder state for idempotency check
        const habitIds = habits.map(h => h.id);
        const { data: reminderStates, error: statesError } = await supabase
          .from('habit_reminder_state')
          .select('*')
          .in('habit_id', habitIds);

        if (statesError) throw statesError;

        const stateMap: Record<string, { last_reminder_sent_at: string | null; snooze_until: string | null }> = {};
        for (const state of (reminderStates || [])) {
          stateMap[state.habit_id] = {
            last_reminder_sent_at: state.last_reminder_sent_at,
            snooze_until: state.snooze_until,
          };
        }

        // Get per-habit reminder preferences
        const { data: habitPrefs, error: habitPrefsError } = await supabase
          .from('habit_reminder_prefs')
          .select('*')
          .in('habit_id', habitIds);

        if (habitPrefsError) throw habitPrefsError;

        const habitPrefsMap: Record<string, { enabled: boolean; preferred_time: string | null }> = {};
        for (const pref of (habitPrefs || [])) {
          habitPrefsMap[pref.habit_id] = {
            enabled: pref.enabled,
            preferred_time: pref.preferred_time,
          };
        }

        // Determine which habits need reminders
        const habitsToRemind: Array<{
          habit: typeof habits[0];
          userId: string;
        }> = [];

        for (const habit of habits) {
          const userId = habit.user_id;
          const prefs = prefsMap[userId];
          const state = stateMap[habit.id];
          const habitPref = habitPrefsMap[habit.id];
          const localTime = userLocalTime[userId];

          // Check per-habit enabled flag (default to true if not set)
          if (habitPref && habitPref.enabled === false) {
            console.log(`Skipping habit ${habit.id}: reminders disabled for this habit`);
            continue;
          }

          // Check preferred_time if set - only send if current time >= preferred_time
          if (habitPref?.preferred_time) {
            if (!isAtOrAfterPreferredTime(localTime.hours, localTime.minutes, habitPref.preferred_time)) {
              console.log(`Skipping habit ${habit.id}: preferred time ${habitPref.preferred_time} not reached yet`);
              continue;
            }
          }

          // Check if habit has reminders configured and has valid days
          const reminders = habit.habit_reminders || [];
          
          // Skip habits with no reminders configured
          if (reminders.length === 0) continue;
          
          const hasValidReminder = reminders.some(r => {
            if (!r.days || r.days.length === 0) return true;
            return r.days.includes(localTime.dayOfWeek);
          });

          if (!hasValidReminder) continue;

          // Check idempotency - skip if already sent today
          if (state && wasReminderSentToday(state.last_reminder_sent_at, prefs.timezone)) {
            console.log(`Skipping habit ${habit.id}: already reminded today`);
            continue;
          }

          // Check snooze
          if (state?.snooze_until && new Date(state.snooze_until) > now) {
            console.log(`Skipping habit ${habit.id}: snoozed until ${state.snooze_until}`);
            continue;
          }

          habitsToRemind.push({ habit, userId });
        }

        console.log(`Found ${habitsToRemind.length} habits to remind`);

        if (habitsToRemind.length === 0) {
          return new Response(JSON.stringify({ success: true, message: 'No reminders due', count: 0 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Set up web push
        const webpush = await import('https://esm.sh/web-push@3.6.6');
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
        
        if (!vapidPublicKey || !vapidPrivateKey) {
          console.warn('VAPID keys not configured, skipping push notifications');
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Reminders found but VAPID not configured', 
            count: habitsToRemind.length 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        webpush.setVapidDetails(
          'mailto:support@lifegoalapp.com',
          vapidPublicKey,
          vapidPrivateKey
        );

        // Helper function to send notification with retry
        async function sendNotificationWithRetry(
          pushSubscription: { endpoint: string; keys: { p256dh: string; auth: string } },
          payload: string,
          userId: string,
          habitId: string
        ): Promise<{ success: boolean; shouldDelete: boolean }> {
          let lastError: Error | null = null;
          
          for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
              await webpush.sendNotification(pushSubscription, payload);
              return { success: true, shouldDelete: false };
            } catch (error) {
              lastError = error;
              console.error(`Notification attempt ${attempt + 1} failed:`, error.message || error);
              
              // Check for permanent failures (410 Gone, 404 Not Found)
              if (error.statusCode === 410 || error.statusCode === 404) {
                return { success: false, shouldDelete: true };
              }
              
              // If we have retries left, wait before next attempt
              if (attempt < MAX_RETRIES) {
                await sleep(RETRY_DELAYS[attempt]);
              }
            }
          }
          
          // All retries exhausted - log to dead-letter queue
          console.error(`All ${MAX_RETRIES + 1} attempts failed for endpoint ${pushSubscription.endpoint}`);
          const { error: dlError } = await supabase
            .from('reminder_delivery_failures')
            .insert({
              user_id: userId,
              habit_id: habitId,
              endpoint: pushSubscription.endpoint,
              error: lastError?.message || 'Unknown error',
              retry_count: MAX_RETRIES + 1,
            });
          
          if (dlError) {
            console.error('Failed to log to dead-letter queue:', dlError);
          }
          
          return { success: false, shouldDelete: false };
        }

        // Send notifications and update state
        let sentCount = 0;
        let failedCount = 0;
        const habitIdsToUpdate: string[] = [];

        for (const { habit, userId } of habitsToRemind) {
          const userSubs = subscriptions.filter(s => s.user_id === userId);
          
          const title = `Time for: ${habit.emoji || '📋'} ${habit.title}`;
          
          interface NotificationPayload {
            title: string;
            body: string;
            icon: string;
            badge: string;
            tag: string;
            data: {
              habit_id: string;
              url: string;
            };
            actions: Array<{ action: string; title: string }>;
          }
          
          const notificationPayload: NotificationPayload = {
            title,
            body: 'Mark it complete in LifeGoal App',
            icon: '/icons/icon-192x192.svg',
            badge: '/icons/icon-192x192.svg',
            tag: `habit-${habit.id}`,
            data: {
              habit_id: habit.id,
              url: '/#habits',
            },
            actions: [
              { action: 'done', title: 'Done' },
              { action: 'snooze', title: 'Snooze' },
            ],
          };
          
          const payload = JSON.stringify(notificationPayload);
          let sentForHabit = false;

          for (const sub of userSubs) {
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            };

            const result = await sendNotificationWithRetry(pushSubscription, payload, userId, habit.id);
            
            if (result.success) {
              sentCount++;
              sentForHabit = true;
            } else {
              failedCount++;
              if (result.shouldDelete) {
                // Remove invalid subscription
                await supabase
                  .from('push_subscriptions')
                  .delete()
                  .eq('endpoint', sub.endpoint);
              }
            }
          }

          // Mark habit as reminded if at least one notification was sent
          if (sentForHabit) {
            habitIdsToUpdate.push(habit.id);
          }
        }

        // Update reminder state for sent habits (idempotency)
        if (habitIdsToUpdate.length > 0) {
          const stateUpdates = habitIdsToUpdate.map(habitId => ({
            habit_id: habitId,
            last_reminder_sent_at: now.toISOString(),
          }));

          const { error: updateStateError } = await supabase
            .from('habit_reminder_state')
            .upsert(stateUpdates, { onConflict: 'habit_id' });

          if (updateStateError) {
            console.error('Failed to update reminder state:', updateStateError);
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: `Sent ${sentCount} notifications (${failedCount} failed)`, 
          habits: habitsToRemind.length,
          sent: sentCount,
          failed: failedCount
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Error in CRON job:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
