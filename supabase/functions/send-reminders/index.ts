// ========================================================
// EDGE FUNCTION: send-reminders
// Purpose: Web Push reminders + quick action logging + per-user/per-habit preferences
// ========================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
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
// Note: Uses inclusive boundaries (current <= end) so reminders can be sent AT the window_end time
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

/**
 * Helper: Check if current time is within quiet hours
 * Supports overnight ranges (e.g., 22:00 to 06:00) where start > end
 * Note: Uses exclusive end boundary (current < end) so reminders CAN be sent AT the quiet_hours_end time
 * @returns true if within quiet hours (should NOT send reminders)
 */
function isWithinQuietHours(
  hours: number,
  minutes: number,
  quietHoursStart: string | null,
  quietHoursEnd: string | null
): boolean {
  // If quiet hours are not configured, not in quiet hours
  if (!quietHoursStart || !quietHoursEnd) {
    return false;
  }

  const [startH, startM] = quietHoursStart.split(':').map(Number);
  const [endH, endM] = quietHoursEnd.split(':').map(Number);
  const current = hours * 60 + minutes;
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;

  if (start <= end) {
    // Normal range (e.g., 09:00 to 17:00)
    return current >= start && current < end;
  } else {
    // Overnight range (e.g., 22:00 to 06:00)
    // Within quiet hours if current >= start OR current < end
    return current >= start || current < end;
  }
}

/**
 * Helper: Check if day is a weekend (Saturday=6 or Sunday=0)
 */
function isWeekend(dayOfWeek: number): boolean {
  return dayOfWeek === 0 || dayOfWeek === 6;
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

// Helper: Get today's date string in YYYY-MM-DD format (UTC)
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// Helper: Check if habit is already completed today (idempotency for done action)
async function isHabitCompletedToday(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  habitId: string
): Promise<boolean> {
  const today = getTodayDateString();
  
  const { data, error } = await supabase
    .from('habit_logs_v2')
    .select('id')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .eq('date', today)
    .eq('done', true)
    .limit(1);
  
  if (error) {
    console.error('Error checking habit completion:', error);
    return false; // Allow completion attempt if check fails
  }
  
  return data !== null && data.length > 0;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathname = url.pathname;

  try {
    // ========================================================
    // PUBLIC ENDPOINT: /health
    // No authentication required - anyone can check system status
    // ========================================================
    if (pathname.endsWith('/health') && req.method === 'GET') {
      const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
      
      const healthy = !!(vapidPublicKey && vapidPrivateKey);
      
      return new Response(JSON.stringify({ 
        ok: healthy,
        vapid_configured: healthy,
        message: healthy 
          ? 'Edge Function is healthy and ready to send notifications' 
          : 'VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Edge Function secrets.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    // ========================================================
    // INTERNAL ENDPOINT: /cron
    // Protected by custom header to avoid Supabase Authorization interference
    // MUST come BEFORE auth check to avoid requiring Authorization header
    // ========================================================
    if (pathname.endsWith('/cron')) {
      // Verify CRON secret using custom header (not Authorization)
      const cronSecret = req.headers.get('x-cron-secret');
      const expectedSecret = Deno.env.get('CRON_SECRET');
      
      if (!expectedSecret) {
        console.error('CRON_SECRET not configured in Edge Function secrets');
        return new Response(JSON.stringify({ 
          error: 'CRON endpoint not configured. Set CRON_SECRET in Edge Function secrets.' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (cronSecret !== expectedSecret) {
        console.error('Invalid CRON secret provided');
        return new Response(JSON.stringify({ 
          error: 'Unauthorized: Invalid CRON secret' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log('CRON: Send reminders job triggered');
      
      // Create Supabase client for CRON operations (using service role key, no user auth)
      const cronSupabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const cronSupabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabase = createClient(cronSupabaseUrl, cronSupabaseKey);
      
      try {
        const now = new Date();
        console.log('Server time (UTC):', now.toISOString());

        // OPTIMIZATION: First get users who have active habits with reminders configured
        // This prevents loading subscriptions for users who have no habits or reminders
        // Note: Falls back gracefully if migration not yet applied
        let userIds: string[] = [];
        let subscriptions: Array<{ user_id: string; endpoint: string; p256dh: string; auth: string }> = [];
        let useFallback = false;
        
        const { data: eligibleUserIds, error: usersError } = await supabase
          .rpc('get_users_with_active_reminders');

        if (usersError) {
          // RPC doesn't exist yet, fall back to old method
          console.warn('get_users_with_active_reminders RPC not available, using all subscriptions');
          useFallback = true;
        } else if (!eligibleUserIds || eligibleUserIds.length === 0) {
          // No users with active reminders
          return new Response(JSON.stringify({ success: true, message: 'No users with active habits and reminders', count: 0 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          // OPTIMIZED PATH: Only load subscriptions for users with active reminders
          const eligibleUserIdsList = eligibleUserIds.map(u => u.user_id);
          console.log(`Found ${eligibleUserIdsList.length} users with active habits and reminders`);

          const { data: subs, error: subsError } = await supabase
            .from('push_subscriptions')
            .select('user_id, endpoint, p256dh, auth')
            .in('user_id', eligibleUserIdsList);

          if (subsError) throw subsError;

          if (!subs || subs.length === 0) {
            return new Response(JSON.stringify({ success: true, message: 'No push subscriptions found for eligible users', count: 0 }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          subscriptions = subs;
          userIds = [...new Set(subscriptions.map(s => s.user_id))];
        }

        if (useFallback) {
          // Fallback: get all subscriptions if the RPC fails (migration not applied yet)
          console.log('Using fallback method to get all subscriptions');
          const { data: subs, error: subsError } = await supabase
            .from('push_subscriptions')
            .select('user_id, endpoint, p256dh, auth');

          if (subsError) throw subsError;

          if (!subs || subs.length === 0) {
            return new Response(JSON.stringify({ success: true, message: 'No push subscriptions found', count: 0 }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          subscriptions = subs;
          userIds = [...new Set(subscriptions.map(s => s.user_id))];
        }

        // Get user reminder preferences
        const { data: allPrefs, error: prefsError } = await supabase
          .from('user_reminder_prefs')
          .select('*')
          .in('user_id', userIds);

        if (prefsError) throw prefsError;

        // Build prefs map with defaults
        const prefsMap: Record<string, { 
          timezone: string; 
          window_start: string; 
          window_end: string;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          skip_weekends: boolean;
        }> = {};
        for (const userId of userIds) {
          const userPrefs = allPrefs?.find(p => p.user_id === userId);
          prefsMap[userId] = {
            timezone: userPrefs?.timezone || 'UTC',
            window_start: userPrefs?.window_start || '08:00:00',
            window_end: userPrefs?.window_end || '10:00:00',
            quiet_hours_start: userPrefs?.quiet_hours_start || null,
            quiet_hours_end: userPrefs?.quiet_hours_end || null,
            skip_weekends: userPrefs?.skip_weekends ?? false,
          };
        }

        // Filter users whose current local time is within their reminder window
        // and not in quiet hours, and not on weekend if skip_weekends is enabled
        const eligibleUsers: string[] = [];
        const userLocalTime: Record<string, { hours: number; minutes: number; dayOfWeek: number }> = {};
        for (const userId of userIds) {
          const prefs = prefsMap[userId];
          const localTime = getLocalTimeInTimezone(prefs.timezone);
          userLocalTime[userId] = localTime;
          
          // Check if weekend skip is enabled and it's a weekend
          if (prefs.skip_weekends && isWeekend(localTime.dayOfWeek)) {
            console.log(`User ${userId} skipped: skip_weekends enabled and day is ${localTime.dayOfWeek}`);
            continue;
          }
          
          // Check if within reminder window
          if (!isTimeInWindow(localTime.hours, localTime.minutes, prefs.window_start, prefs.window_end)) {
            continue;
          }
          
          // Check if within quiet hours
          if (isWithinQuietHours(localTime.hours, localTime.minutes, prefs.quiet_hours_start, prefs.quiet_hours_end)) {
            console.log(`User ${userId} skipped: within quiet hours ${prefs.quiet_hours_start}-${prefs.quiet_hours_end}`);
            continue;
          }
          
          eligibleUsers.push(userId);
          console.log(`User ${userId} eligible: ${localTime.hours}:${localTime.minutes} in ${prefs.timezone} within ${prefs.window_start}-${prefs.window_end}`);
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
        const webpush = await import('npm:web-push@3.6.7');
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
              habit_title: string;
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
              habit_title: habit.title,
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


    // ========================================================
    // AUTHENTICATION: Required for all endpoints below
    // User endpoints use JWT (Authorization: Bearer)
    // Internal endpoints use custom headers (x-cron-secret)
    // ========================================================

    // Get auth header for user endpoints
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
        quiet_hours_start: null,
        quiet_hours_end: null,
        skip_weekends: false,
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
      const {
        timezone,
        window_start,
        window_end,
        quiet_hours_start,
        quiet_hours_end,
        skip_weekends,
      } = body;

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

      // Validate quiet hours format if provided (allow null to clear)
      if (quiet_hours_start !== undefined && quiet_hours_start !== null && !timeRegex.test(quiet_hours_start)) {
        return new Response(JSON.stringify({ error: 'Invalid quiet_hours_start format. Use HH:MM or HH:MM:SS' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (quiet_hours_end !== undefined && quiet_hours_end !== null && !timeRegex.test(quiet_hours_end)) {
        return new Response(JSON.stringify({ error: 'Invalid quiet_hours_end format. Use HH:MM or HH:MM:SS' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate quiet hours: both must be provided or both null
      const hasQuietStart = quiet_hours_start !== undefined && quiet_hours_start !== null;
      const hasQuietEnd = quiet_hours_end !== undefined && quiet_hours_end !== null;
      if (hasQuietStart !== hasQuietEnd) {
        return new Response(JSON.stringify({ error: 'Both quiet_hours_start and quiet_hours_end must be set, or both must be null' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      interface UpdateData {
        user_id: string;
        timezone?: string;
        window_start?: string;
        window_end?: string;
        quiet_hours_start?: string | null;
        quiet_hours_end?: string | null;
        skip_weekends?: boolean;
      }
      const updateData: UpdateData = { user_id: user.id };
      if (timezone !== undefined) updateData.timezone = timezone;
      if (window_start !== undefined) updateData.window_start = window_start.length === 5 ? `${window_start}:00` : window_start;
      if (window_end !== undefined) updateData.window_end = window_end.length === 5 ? `${window_end}:00` : window_end;
      if (quiet_hours_start !== undefined) {
        updateData.quiet_hours_start = quiet_hours_start === null ? null : (quiet_hours_start.length === 5 ? `${quiet_hours_start}:00` : quiet_hours_start);
      }
      if (quiet_hours_end !== undefined) {
        updateData.quiet_hours_end = quiet_hours_end === null ? null : (quiet_hours_end.length === 5 ? `${quiet_hours_end}:00` : quiet_hours_end);
      }
      if (skip_weekends !== undefined) updateData.skip_weekends = Boolean(skip_weekends);

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

      // Handle specific actions with idempotency
      let alreadyCompleted = false;
      let wasInserted = false;
      
      if (resolvedAction === 'done') {
        // Check if habit is already completed today (idempotency guard)
        alreadyCompleted = await isHabitCompletedToday(supabase, user.id, habit_id);
        
        if (!alreadyCompleted) {
          // Mark habit as completed with explicit date
          const today = getTodayDateString();
          const { error: habitError } = await supabase.from('habit_logs_v2').insert({
            habit_id,
            user_id: user.id,
            done: true,
            value: null,
            date: today,
          });

          if (habitError) {
            console.error('Failed to log habit completion:', habitError);
          } else {
            wasInserted = true;
          }
        }
      }

      // Log the action (after completion check so we can include context)
      const { error: logError } = await supabase.from('reminder_action_logs').insert({
        habit_id,
        user_id: user.id,
        action: resolvedAction,
        payload: { 
          ...(payload || {}), 
          via: 'push_action',
          already_completed: alreadyCompleted,
        },
      });

      if (logError) {
        console.error('Failed to log reminder action:', logError);
        // Continue even if logging fails - don't block the user
      }

      // Handle snooze action
      if (resolvedAction === 'snooze') {
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

      // Build response with completion status for 'done' action
      const responseBody: { 
        ok: boolean; 
        action: string; 
        completed?: boolean;
        was_already_completed?: boolean;
      } = {
        ok: true,
        action: resolvedAction,
      };
      
      if (resolvedAction === 'done') {
        responseBody.completed = true;
        responseBody.was_already_completed = alreadyCompleted;
      }

      return new Response(JSON.stringify(responseBody), {
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

      // Manage habit_reminders table to enable CRON job to send notifications
      if (enabled !== undefined || preferred_time !== undefined) {
        // Determine if we should upsert or delete the reminder
        const shouldDisableReminder = enabled === false;
        const shouldUpsertReminder = enabled === true || (enabled === undefined && preferred_time !== undefined);
        
        if (shouldDisableReminder) {
          // When disabled: Delete all habit_reminders entries for this habit
          const { error: deleteError } = await supabase
            .from('habit_reminders')
            .delete()
            .eq('habit_id', habit_id);
          
          if (deleteError) {
            console.error('Failed to delete habit_reminders entry:', deleteError);
            // Don't throw - this is a non-critical cleanup operation
          }
        } else if (shouldUpsertReminder) {
          // When enabled or updating preferred_time: Replace habit_reminders entry
          // Determine the local_time to use
          let localTime = updateData.preferred_time;
          
          // If preferred_time not provided in this request, check existing pref or use default
          if (!localTime) {
            // Get existing pref to check if it has a preferred_time
            const { data: existingPref } = await supabase
              .from('habit_reminder_prefs')
              .select('preferred_time')
              .eq('habit_id', habit_id)
              .maybeSingle();
            
            localTime = existingPref?.preferred_time || '08:00:00';
          }
          
          // Delete existing reminders and insert new one (simpler than checking existence)
          const { error: deleteError } = await supabase
            .from('habit_reminders')
            .delete()
            .eq('habit_id', habit_id);
          
          if (deleteError) {
            console.error('Failed to delete existing habit_reminders:', deleteError);
          }
          
          // Insert new reminder with all days configured
          const { error: insertError } = await supabase
            .from('habit_reminders')
            .insert({
              habit_id: habit_id,
              local_time: localTime,
              days: [0, 1, 2, 3, 4, 5, 6] // all days
            });
          
          if (insertError) {
            console.error('Failed to insert habit_reminders entry:', insertError);
            // Don't throw - pref was saved successfully
          }
        }
      }

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

    // ========================================================
    // TODO: Implement batch processing for 1,000+ users
    // When user count exceeds 1,000, process users in batches of 100 using
    // cursor-based pagination to prevent timeouts.
    // See docs/PUSH_NOTIFICATIONS_SCALING_GUIDE.md for implementation details.
    // ========================================================

    // GET /analytics/summary - Get aggregated reminder analytics
    if (pathname.endsWith('/analytics/summary') && req.method === 'GET') {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const rangeParam = url.searchParams.get('range');
      const rangeDays = rangeParam === '7' ? 7 : 30; // Default to 30 days

      try {
        // Call the database function for analytics summary
        const { data, error } = await supabase.rpc('get_reminder_analytics_summary', {
          p_range_days: rangeDays
        });

        if (error) {
          console.error('Analytics summary error:', error);
          // Fallback to raw queries if function not available
          return await getAnalyticsSummaryFallback(supabase, user.id, rangeDays, corsHeaders);
        }

        if (!data || data.length === 0) {
          // Return empty metrics
          return new Response(JSON.stringify({
            rangeDays,
            sends: 0,
            actions: { done: 0, snooze: 0, dismiss: 0 },
            actionRatePct: 0,
            doneRatePct: 0,
            habitsWithPrefs: 0,
            habitsEnabledPct: 0,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const row = data[0];
        return new Response(JSON.stringify({
          rangeDays: row.range_days,
          sends: Number(row.total_sends),
          actions: {
            done: Number(row.done_count),
            snooze: Number(row.snooze_count),
            dismiss: Number(row.dismiss_count),
          },
          actionRatePct: Number(row.action_rate_pct),
          doneRatePct: Number(row.done_rate_pct),
          habitsWithPrefs: Number(row.habits_with_prefs),
          habitsEnabledPct: Number(row.habits_enabled_pct),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        console.error('Analytics summary exception:', err);
        return await getAnalyticsSummaryFallback(supabase, user.id, rangeDays, corsHeaders);
      }
    }

    // GET /analytics/daily - Get daily reminder analytics
    if (pathname.endsWith('/analytics/daily') && req.method === 'GET') {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const rangeParam = url.searchParams.get('range');
      const rangeDays = rangeParam === '7' ? 7 : 30; // Default to 30 days

      try {
        // Call the database function for daily analytics
        const { data, error } = await supabase.rpc('get_reminder_analytics_daily', {
          p_range_days: rangeDays
        });

        if (error) {
          console.error('Analytics daily error:', error);
          // Fallback to raw queries if function not available
          return await getAnalyticsDailyFallback(supabase, user.id, rangeDays, corsHeaders);
        }

        const dailyData = (data || []).map((row: { day: string; sends: number; done: number; snooze: number; dismiss: number }) => ({
          day: row.day,
          sends: Number(row.sends),
          done: Number(row.done),
          snooze: Number(row.snooze),
          dismiss: Number(row.dismiss),
        }));

        return new Response(JSON.stringify(dailyData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        console.error('Analytics daily exception:', err);
        return await getAnalyticsDailyFallback(supabase, user.id, rangeDays, corsHeaders);
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

// Fallback function for analytics summary when database function is not available
async function getAnalyticsSummaryFallback(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  rangeDays: number,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - rangeDays);
  const startDateStr = startDate.toISOString().split('T')[0];

  // Get sends from habit_reminder_state
  const { data: stateData } = await supabase
    .from('habit_reminder_state')
    .select('habit_id, last_reminder_sent_at, habits_v2!inner(user_id)')
    .gte('last_reminder_sent_at', startDateStr);

  const userSends = (stateData || []).filter(
    (s: { habits_v2: { user_id: string } }) => s.habits_v2?.user_id === userId
  );
  const sends = userSends.length;

  // Get actions from reminder_action_logs
  const { data: actionData } = await supabase
    .from('reminder_action_logs')
    .select('action')
    .eq('user_id', userId)
    .gte('created_at', startDateStr);

  const actions = actionData || [];
  const done = actions.filter((a: { action: string }) => a.action === 'done').length;
  const snooze = actions.filter((a: { action: string }) => a.action === 'snooze').length;
  const dismiss = actions.filter((a: { action: string }) => a.action === 'dismiss').length;
  const totalActions = done + snooze + dismiss;

  // Get habits with prefs
  const { data: habitsData } = await supabase
    .from('habits_v2')
    .select('id')
    .eq('user_id', userId)
    .eq('archived', false);

  const habitIds = (habitsData || []).map((h: { id: string }) => h.id);
  
  let habitsWithPrefs = 0;
  let habitsEnabled = 0;
  
  if (habitIds.length > 0) {
    const { data: prefsData } = await supabase
      .from('habit_reminder_prefs')
      .select('habit_id, enabled')
      .in('habit_id', habitIds);

    habitsWithPrefs = (prefsData || []).length;
    habitsEnabled = (prefsData || []).filter((p: { enabled: boolean }) => p.enabled).length;
  }

  const actionRatePct = sends > 0 ? Math.round((totalActions / sends) * 10000) / 100 : 0;
  const doneRatePct = totalActions > 0 ? Math.round((done / totalActions) * 10000) / 100 : 0;
  const habitsEnabledPct = habitsWithPrefs > 0 ? Math.round((habitsEnabled / habitsWithPrefs) * 10000) / 100 : 0;

  return new Response(JSON.stringify({
    rangeDays,
    sends,
    actions: { done, snooze, dismiss },
    actionRatePct,
    doneRatePct,
    habitsWithPrefs,
    habitsEnabledPct,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Fallback function for daily analytics when database function is not available
async function getAnalyticsDailyFallback(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  rangeDays: number,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - rangeDays);

  // Generate date series
  const dates: string[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  const startDateStr = startDate.toISOString().split('T')[0];

  // Get sends from habit_reminder_state
  const { data: stateData } = await supabase
    .from('habit_reminder_state')
    .select('habit_id, last_reminder_sent_at, habits_v2!inner(user_id)')
    .gte('last_reminder_sent_at', startDateStr);

  const userSends = (stateData || []).filter(
    (s: { habits_v2: { user_id: string } }) => s.habits_v2?.user_id === userId
  );

  // Get actions from reminder_action_logs
  const { data: actionData } = await supabase
    .from('reminder_action_logs')
    .select('action, created_at')
    .eq('user_id', userId)
    .gte('created_at', startDateStr);

  // Aggregate by day
  const dailyMap = new Map<string, { sends: number; done: number; snooze: number; dismiss: number }>();
  
  for (const day of dates) {
    dailyMap.set(day, { sends: 0, done: 0, snooze: 0, dismiss: 0 });
  }

  for (const send of userSends) {
    if (send.last_reminder_sent_at) {
      const day = send.last_reminder_sent_at.split('T')[0];
      const entry = dailyMap.get(day);
      if (entry) {
        entry.sends++;
      }
    }
  }

  for (const action of (actionData || [])) {
    if (action.created_at) {
      const day = action.created_at.split('T')[0];
      const entry = dailyMap.get(day);
      if (entry) {
        if (action.action === 'done') entry.done++;
        else if (action.action === 'snooze') entry.snooze++;
        else if (action.action === 'dismiss') entry.dismiss++;
      }
    }
  }

  const dailyData = dates.map(day => ({
    day,
    ...dailyMap.get(day)!,
  }));

  return new Response(JSON.stringify(dailyData), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
