// ========================================================
// EDGE FUNCTION: send-reminders
// Purpose: Web Push reminders + quick action logging
// ========================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathname = url.pathname;

  try {
    // Health check
    if (pathname.endsWith('/health')) {
      return new Response(JSON.stringify({ status: 'ok' }), {
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
      const { endpoint, p256dh, auth } = body;

      if (!endpoint || !p256dh || !auth) {
        return new Response(JSON.stringify({ error: 'Missing subscription fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
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

    // CRON: Send reminders (runs every minute)
    if (pathname.endsWith('/cron')) {
      console.log('CRON: Send reminders job triggered');
      
      try {
        // Get current time rounded to nearest minute
        const now = new Date();
        const currentMinute = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        console.log('Checking for reminders at:', currentMinute);

        // Query habits with reminders due now
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

        // Get push subscriptions for users with due reminders
        const userIds = [...new Set(dueReminders.map(r => r.habits_v2?.user_id).filter(Boolean))];
        
        const { data: subscriptions, error: subsError } = await supabase
          .from('push_subscriptions')
          .select('*')
          .in('user_id', userIds);

        if (subsError) throw subsError;

        // Group reminders by user
        const remindersByUser = {};
        dueReminders.forEach(reminder => {
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
        const webpush = await import('https://esm.sh/web-push@3.6.6');
        
        // Set VAPID details
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
        
        if (!vapidPublicKey || !vapidPrivateKey) {
          console.warn('VAPID keys not configured, skipping push notifications');
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Reminders found but VAPID not configured', 
            count: dueReminders.length 
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
          
          for (const reminder of userReminders) {
            const habit = reminder.habits_v2;
            if (!habit) continue;

            const title = `Time for: ${habit.emoji || '📋'} ${habit.title}`;
            const payload = JSON.stringify({
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
            });

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
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: `Sent ${sentCount} notifications`, 
          reminders: dueReminders.length,
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
