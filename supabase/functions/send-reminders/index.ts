// ========================================================
// EDGE FUNCTION: send-reminders
// Purpose: Web Push reminders + quick action logging + per-user preferences
// ========================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Log habit from notification action
    if (pathname.endsWith('/log') && req.method === 'POST') {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { habit_id, done, value } = body;

      if (!habit_id) {
        return new Response(JSON.stringify({ error: 'Missing habit_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase.from('habit_logs_v2').insert({
        habit_id,
        user_id: user.id,
        done: done !== false,
        value: value || null,
      });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CRON: Send reminders with per-user timezone preferences and idempotent delivery
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
        for (const userId of userIds) {
          const prefs = prefsMap[userId];
          const { hours, minutes } = getLocalTimeInTimezone(prefs.timezone);
          if (isTimeInWindow(hours, minutes, prefs.window_start, prefs.window_end)) {
            eligibleUsers.push(userId);
            console.log(`User ${userId} eligible: ${hours}:${minutes} in ${prefs.timezone} within ${prefs.window_start}-${prefs.window_end}`);
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

        // Determine which habits need reminders
        const habitsToRemind: Array<{
          habit: typeof habits[0];
          userId: string;
        }> = [];

        for (const habit of habits) {
          const userId = habit.user_id;
          const prefs = prefsMap[userId];
          const state = stateMap[habit.id];
          const { dayOfWeek } = getLocalTimeInTimezone(prefs.timezone);

          // Check if reminder has valid days configuration
          const reminders = habit.habit_reminders || [];
          const hasValidReminder = reminders.some(r => {
            if (!r.days || r.days.length === 0) return true;
            return r.days.includes(dayOfWeek);
          });

          if (!hasValidReminder && reminders.length > 0) continue;

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

        // Send notifications and update state
        let sentCount = 0;
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
              { action: 'done', title: 'Mark Done' },
              { action: 'skip', title: 'Skip' },
            ],
          };
          
          const payload = JSON.stringify(notificationPayload);
          let sentForHabit = false;

          for (const sub of userSubs) {
            try {
              const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              };

              await webpush.sendNotification(pushSubscription, payload);
              sentCount++;
              sentForHabit = true;
            } catch (error) {
              console.error('Failed to send notification:', error);
              if (error.statusCode === 410 || error.statusCode === 404) {
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
          message: `Sent ${sentCount} notifications`, 
          habits: habitsToRemind.length,
          sent: sentCount
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
