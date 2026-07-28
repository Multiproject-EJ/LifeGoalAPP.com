import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type Delivery = { id: string; channel: 'email' | 'support_webhook'; attempts: number; alert_id: string };
type Alert = { id: string; alert_type: string; title: string; summary: string; resource_type: string; resource_id: string | null; metadata: Record<string, unknown>; created_at: string };

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function sendEmail(alert: Alert) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const recipient = Deno.env.get('ADMIN_ALERT_EMAIL');
  const from = Deno.env.get('ADMIN_ALERT_FROM');
  if (!apiKey || !recipient || !from) return { status: 'blocked' as const, error: 'Set RESEND_API_KEY, ADMIN_ALERT_EMAIL, and ADMIN_ALERT_FROM to enable email.' };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [recipient],
      subject: `[LifeGoal] ${alert.title}`,
      text: `${alert.summary}\n\nOpen the authenticated admin area to review the item.\nAlert: ${alert.id}`,
    }),
  });
  if (!response.ok) throw new Error(`Resend returned ${response.status}`);
  return { status: 'sent' as const };
}

async function sendSupportWebhook(alert: Alert) {
  const url = Deno.env.get('SUPPORT_AI_WEBHOOK_URL');
  const secret = Deno.env.get('SUPPORT_AI_WEBHOOK_SECRET');
  if (!url || !secret) return { status: 'blocked' as const, error: 'Set SUPPORT_AI_WEBHOOK_URL and SUPPORT_AI_WEBHOOK_SECRET to enable the support bridge.' };

  // Deliberately send identifiers and routing metadata only. A later, reviewed
  // integration can opt in to message content with explicit data-handling terms.
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-LifeGoal-Signature': secret },
    body: JSON.stringify({ event: 'support_message_received', alert_id: alert.id, resource_id: alert.resource_id, metadata: alert.metadata, occurred_at: alert.created_at }),
  });
  if (!response.ok) throw new Error(`Support webhook returned ${response.status}`);
  return { status: 'sent' as const };
}

Deno.serve(async (request) => {
  const expected = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`;
  if (request.headers.get('authorization') !== expected) return new Response('Unauthorized', { status: 401 });

  const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'));
  const { data: deliveries, error } = await supabase
    .from('admin_alert_deliveries')
    .select('id, channel, attempts, alert_id')
    .in('status', ['pending', 'failed'])
    .lt('attempts', 5)
    .order('created_at', { ascending: true })
    .limit(20);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let sent = 0; let blocked = 0; let failed = 0;
  for (const delivery of (deliveries ?? []) as Delivery[]) {
    const { data: alert, error: alertError } = await supabase.from('admin_alerts').select('*').eq('id', delivery.alert_id).single();
    if (alertError || !alert) { failed += 1; continue; }
    try {
      const result = delivery.channel === 'email' ? await sendEmail(alert as Alert) : await sendSupportWebhook(alert as Alert);
      const status = result.status;
      await supabase.from('admin_alert_deliveries').update({ status, attempts: delivery.attempts + 1, last_error: 'error' in result ? result.error : null, delivered_at: status === 'sent' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', delivery.id);
      if (status === 'sent') sent += 1; else blocked += 1;
    } catch (reason) {
      failed += 1;
      await supabase.from('admin_alert_deliveries').update({ status: 'failed', attempts: delivery.attempts + 1, last_error: reason instanceof Error ? reason.message : String(reason), updated_at: new Date().toISOString() }).eq('id', delivery.id);
    }
  }
  return Response.json({ processed: deliveries?.length ?? 0, sent, blocked, failed });
});
