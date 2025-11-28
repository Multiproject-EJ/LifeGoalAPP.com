// ========================================================
// EDGE FUNCTION: send-reminders
// Purpose: Web Push reminders + quick action logging
// Endpoints: /health, /subscribe, /log, /prefs, /cron
// ========================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Type definitions for reminder preferences
interface UserReminderPrefs {
  user_id: string;
  timezone: string;
  window_start: string;
  window_end: string;
  created_at?: string;
  updated_at?: string;
}

interface HabitReminderState {
  habit_id: string;
  last_reminder_sent_at: string | null;
  snooze_until: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathname = url.pathname;

  try {
    // Health check (no auth required)
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

    // GET /prefs - Fetch current user's reminder preferences
    if (pathname.endsWith('/prefs') && req.method === 'GET') {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase
        .from('user_reminder_prefs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // Return default values if no preferences exist
      const prefs: UserReminderPrefs = data || {
        user_id: user.id,
        timezone: 'UTC',
        window_start: '08:00:00',
        window_end: '10:00:00',
      };

      return new Response(JSON.stringify({ success: true, prefs }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /prefs - Update current user's reminder preferences
    if (pathname.endsWith('/prefs') && req.method === 'POST') {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { timezone, window_start, window_end } = body;

      // Validate time format (HH:MM:SS or HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
      if (window_start && !timeRegex.test(window_start)) {
        return new Response(JSON.stringify({ error: 'Invalid window_start format. Use HH:MM or HH:MM:SS' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (window_end && !timeRegex.test(window_end)) {
        return new Response(JSON.stringify({ error: 'Invalid window_end format. Use HH:MM or HH:MM:SS' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const updateData: Partial<UserReminderPrefs> = {
        user_id: user.id,
      };
      if (timezone !== undefined) updateData.timezone = timezone;
      if (window_start !== undefined) updateData.window_start = window_start.length === 5 ? `${window_start}:00` : window_start;
      if (window_end !== undefined) updateData.window_end = window_end.length === 5 ? `${window_end}:00` : window_end;

      const { data, error } = await supabase
        .from('user_reminder_prefs')
        .upsert(updateData, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, prefs: data }), {
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

    // CRON: Send reminders (runs every minute) with idempotent delivery
    if (pathname.endsWith('/cron')) {
      console.log('CRON: Send reminders job triggered');
      
      try {
        // Get current time
        const now = new Date();
        const currentMinute = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        console.log('Checking for reminders at:', currentMinute);

        // Query habits with reminders due now, including user preferences
        const { data: reminders, error: remindersError } = await supabase
          .from('habit_reminders')
          .select(`
            id,
            habit_id,
            local_time,
            days,
            habits_v2 (
              id,
              user_id,
              title,
              emoji
            )
          `)
          .like('local_time', `${currentMinute}:%`);

        if (remindersError) throw remindersError;

        if (!reminders || reminders.length === 0) {
          return new Response(JSON.stringify({ success: true, message: 'No reminders due', count: 0 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Filter by day of week if specified
        const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, etc.
        const dueReminders = reminders.filter(r => {
          if (!r.days || r.days.length === 0) return true; // No day restriction
          return r.days.includes(dayOfWeek);
        });

        console.log(`Found ${dueReminders.length} reminders to send`);

        // Get habit IDs for idempotency check
        const habitIds = dueReminders.map(r => r.habit_id).filter(Boolean);
        
        // Check reminder state to avoid duplicate sends (idempotency)
        const { data: reminderStates, error: stateError } = await supabase
          .from('habit_reminder_state')
          .select('*')
          .in('habit_id', habitIds);

        if (stateError) {
          console.warn('Could not fetch reminder states - proceeding without idempotency check (may result in duplicate reminders):', stateError);
        }

        // Create a map of habit_id -> last_reminder_sent_at
        const stateMap: Record<string, HabitReminderState> = {};
        (reminderStates || []).forEach((state: HabitReminderState) => {
          stateMap[state.habit_id] = state;
        });

        // Filter out habits that have already received a reminder today or are snoozed
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        
        const eligibleReminders = dueReminders.filter(r => {
          const state = stateMap[r.habit_id];
          if (!state) return true; // No state = never sent
          
          // Check snooze
          if (state.snooze_until) {
            const snoozeUntil = new Date(state.snooze_until);
            if (now < snoozeUntil) {
              console.log(`Habit ${r.habit_id} snoozed until ${snoozeUntil}`);
              return false;
            }
          }
          
          // Check if already sent today (idempotency)
          if (state.last_reminder_sent_at) {
            const lastSent = new Date(state.last_reminder_sent_at);
            if (lastSent >= todayStart) {
              console.log(`Habit ${r.habit_id} already reminded today at ${lastSent}`);
              return false;
            }
          }
          
          return true;
        });

        console.log(`${eligibleReminders.length} reminders eligible after idempotency check`);

        if (eligibleReminders.length === 0) {
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'No eligible reminders (already sent or snoozed)', 
            count: 0 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get push subscriptions for users with due reminders
        const userIds = [...new Set(eligibleReminders.map(r => r.habits_v2?.user_id).filter(Boolean))];
        
        const { data: subscriptions, error: subsError } = await supabase
          .from('push_subscriptions')
          .select('*')
          .in('user_id', userIds);

        if (subsError) throw subsError;

        // Fetch user reminder preferences for timezone-aware scheduling
        const { data: userPrefs, error: prefsError } = await supabase
          .from('user_reminder_prefs')
          .select('*')
          .in('user_id', userIds);

        if (prefsError) {
          console.warn('Could not fetch user preferences - using default reminder windows:', prefsError);
        }

        // Create user preferences map
        const prefsMap: Record<string, UserReminderPrefs> = {};
        (userPrefs || []).forEach((pref: UserReminderPrefs) => {
          prefsMap[pref.user_id] = pref;
        });

        // Group reminders by user
        const remindersByUser: Record<string, typeof eligibleReminders> = {};
        eligibleReminders.forEach(reminder => {
          const userId = reminder.habits_v2?.user_id;
          if (userId) {
            if (!remindersByUser[userId]) {
              remindersByUser[userId] = [];
            }
            remindersByUser[userId].push(reminder);
          }
        });

        // Send notifications
        let sentCount = 0;
        let skippedCount = 0;
        const webpush = await import('https://esm.sh/web-push@3.6.6');
        
        // Set VAPID details
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
        
        if (!vapidPublicKey || !vapidPrivateKey) {
          console.warn('VAPID keys not configured, skipping push notifications');
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Reminders found but VAPID not configured', 
            count: eligibleReminders.length 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        webpush.setVapidDetails(
          'mailto:support@lifegoalapp.com',
          vapidPublicKey,
          vapidPrivateKey
        );

        for (const [userId, userReminders] of Object.entries(remindersByUser)) {
          const userSubs = subscriptions?.filter(s => s.user_id === userId) || [];
          const userPref = prefsMap[userId];
          
          // Check if current time is within user's reminder window
          if (userPref) {
            const windowStart = userPref.window_start.substring(0, 5); // HH:MM
            const windowEnd = userPref.window_end.substring(0, 5); // HH:MM
            
            // Convert to minutes since midnight for proper numeric comparison
            const toMinutes = (time: string) => {
              const [h, m] = time.split(':').map(Number);
              return h * 60 + m;
            };
            const currentMins = toMinutes(currentMinute);
            const startMins = toMinutes(windowStart);
            const endMins = toMinutes(windowEnd);
            
            // Handle windows that span midnight (e.g., 22:00 to 06:00)
            const isInWindow = endMins >= startMins
              ? currentMins >= startMins && currentMins <= endMins
              : currentMins >= startMins || currentMins <= endMins;
            
            if (!isInWindow) {
              console.log(`User ${userId} current time ${currentMinute} outside window ${windowStart}-${windowEnd}`);
              skippedCount += userReminders.length;
              continue;
            }
          }
          
          for (const reminder of userReminders) {
            const habit = reminder.habits_v2;
            if (!habit) continue;

            const title = `Time for: ${habit.emoji || '📋'} ${habit.title}`;
            
            // Define notification payload structure
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
            let notificationSent = false;

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
                notificationSent = true;
                sentCount++;
              } catch (error) {
                console.error('Failed to send notification:', error);
                // If subscription is invalid, remove it
                if (error.statusCode === 410 || error.statusCode === 404) {
                  await supabase
                    .from('push_subscriptions')
                    .delete()
                    .eq('endpoint', sub.endpoint);
                }
              }
            }

            // Update reminder state for idempotency (track that we sent this reminder)
            if (notificationSent) {
              const { error: updateError } = await supabase
                .from('habit_reminder_state')
                .upsert({
                  habit_id: habit.id,
                  last_reminder_sent_at: now.toISOString(),
                }, { onConflict: 'habit_id' });

              if (updateError) {
                console.warn(`Failed to update reminder state for habit ${habit.id} - may result in duplicate reminders:`, updateError);
              }
            }
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: `Sent ${sentCount} notifications, skipped ${skippedCount}`, 
          reminders: eligibleReminders.length,
          sent: sentCount,
          skipped: skippedCount
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
