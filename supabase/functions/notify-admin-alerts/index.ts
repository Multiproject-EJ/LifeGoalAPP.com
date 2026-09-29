import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Sends new admin_alerts rows (waitlist joins, new accounts, ...) as a phone
// push to every device an active admin has registered. Called every minute by
// the "Send Habit Reminders" GitHub workflow with the shared x-cron-secret.
// Each alert is pushed at most once (admin_alerts.pushed_at).

type AdminAlert = { id: string; alert_type: string; title: string; summary: string; created_at: string };
type PushRow = { user_id: string; endpoint: string; p256dh: string; auth: string };

// Alerts older than this are marked as handled without a push, so a device
// registered later never receives a burst of stale notifications.
const MAX_ALERT_AGE_MS = 24 * 60 * 60 * 1000;
// More pending alerts than this are sent as one summary notification.
const MAX_INDIVIDUAL_PUSHES = 3;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function buildNotifications(alerts: AdminAlert[]) {
  if (alerts.length > MAX_INDIVIDUAL_PUSHES) {
    const waitlist = alerts.filter((alert) => alert.alert_type === 'waitlist_joined').length;
    const signups = alerts.filter((alert) => alert.alert_type === 'user_signup').length;
    const parts = [
      waitlist ? `${waitlist} waitlist ${waitlist === 1 ? 'join' : 'joins'}` : null,
      signups ? `${signups} new ${signups === 1 ? 'account' : 'accounts'}` : null,
    ].filter(Boolean);
    return [{
      title: `${alerts.length} new admin alerts`,
      body: parts.length ? parts.join(', ') : 'Open Admin to review them.',
      tag: 'admin-alerts-summary',
    }];
  }
  return alerts.map((alert) => ({ title: alert.title, body: alert.summary, tag: `admin-alert-${alert.id}` }));
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (request) => {
  // Public: the VAPID *public* key browsers need to subscribe to push. The
  // web build may not carry VITE_VAPID_PUBLIC_KEY, so the app can fetch it here.
  if (new URL(request.url).pathname.endsWith('/vapid-public-key')) {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    return new Response(JSON.stringify(publicKey ? { publicKey } : { error: 'VAPID keys not configured' }), {
      status: publicKey ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const expectedSecret = Deno.env.get('CRON_SECRET');
  if (!expectedSecret) return json({ error: 'CRON_SECRET not configured' }, 500);
  if (request.headers.get('x-cron-secret') !== expectedSecret) return json({ error: 'Unauthorized' }, 401);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: pending, error: pendingError } = await supabase
    .from('admin_alerts')
    .select('id, alert_type, title, summary, created_at')
    .is('pushed_at', null)
    .order('created_at', { ascending: true })
    .limit(50);
  if (pendingError) return json({ error: pendingError.message }, 500);
  if (!pending || pending.length === 0) return json({ success: true, pending: 0, sent: 0 });

  const now = Date.now();
  const alerts = pending as AdminAlert[];
  const fresh = alerts.filter((alert) => now - new Date(alert.created_at).getTime() <= MAX_ALERT_AGE_MS);

  const markPushed = async (ids: string[]) => {
    if (ids.length === 0) return;
    await supabase.from('admin_alerts').update({ pushed_at: new Date().toISOString() }).in('id', ids);
  };

  if (fresh.length === 0) {
    await markPushed(alerts.map((alert) => alert.id));
    return json({ success: true, pending: alerts.length, sent: 0, skipped_stale: alerts.length });
  }

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  // Leave alerts unmarked so they go out once the keys are configured.
  if (!vapidPublicKey || !vapidPrivateKey) return json({ success: false, error: 'VAPID keys not configured' }, 500);

  const { data: admins, error: adminError } = await supabase.from('admin_users').select('user_id').eq('active', true);
  if (adminError) return json({ error: adminError.message }, 500);
  const adminIds = (admins ?? []).map((row: { user_id: string }) => row.user_id);

  const { data: devices, error: deviceError } = adminIds.length
    ? await supabase.from('push_subscriptions').select('user_id, endpoint, p256dh, auth').in('user_id', adminIds)
    : { data: [] as PushRow[], error: null };
  if (deviceError) return json({ error: deviceError.message }, 500);

  // No admin device yet: keep fresh alerts pending (they expire after 24h).
  if (!devices || devices.length === 0) {
    await markPushed(alerts.filter((alert) => !fresh.includes(alert)).map((alert) => alert.id));
    return json({ success: true, pending: alerts.length, sent: 0, reason: 'no admin devices registered' });
  }

  const webpush = await import('npm:web-push@3.6.7');
  webpush.setVapidDetails('mailto:support@lifegoalapp.com', vapidPublicKey, vapidPrivateKey);

  let sent = 0;
  let failed = 0;
  const goneEndpoints = new Set<string>();
  for (const notification of buildNotifications(fresh)) {
    const payload = JSON.stringify({ ...notification, data: { url: '/app#admin', topic: 'admin-alert' } });
    for (const device of devices as PushRow[]) {
      if (goneEndpoints.has(device.endpoint)) continue;
      try {
        await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, payload);
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) goneEndpoints.add(device.endpoint);
        console.error('Admin alert push failed:', statusCode ?? (error as Error).message);
      }
    }
  }

  if (goneEndpoints.size > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', [...goneEndpoints]);
  }

  // Mark everything handled when at least one push landed; otherwise retry next minute.
  if (sent > 0) await markPushed(alerts.map((alert) => alert.id));
  else await markPushed(alerts.filter((alert) => !fresh.includes(alert)).map((alert) => alert.id));

  return json({ success: true, pending: alerts.length, sent, failed });
});
