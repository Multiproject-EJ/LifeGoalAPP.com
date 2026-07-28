import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const migration = read('supabase/migrations/0282_admin_operations_alerts.sql');
const dispatcher = read('supabase/functions/dispatch-admin-alerts/index.ts');
const panel = read('src/features/admin/AdminAlertsPanel.tsx');

const requiredMigrationTerms = [
  'CREATE TABLE IF NOT EXISTS public.admin_alerts',
  'CREATE TABLE IF NOT EXISTS public.admin_alert_deliveries',
  "'user_signup'", "'purchase_completed'", "'subscription_changed'", "'support_message'", "'telemetry_report_ready'",
  'admin_alert_on_signup', 'admin_alert_on_case_message', 'admin_alert_on_billing_event', 'telemetry-report:',
  'REVOKE ALL ON FUNCTION public.queue_admin_alert',
];
for (const term of requiredMigrationTerms) {
  if (!migration.includes(term)) throw new Error(`Admin alerts migration missing ${term}`);
}
if (dispatcher.includes('body: alert.summary') || dispatcher.includes('message_body')) {
  throw new Error('Support webhook must not forward support message bodies by default.');
}
if (!dispatcher.includes("'X-LifeGoal-Signature'")) throw new Error('Support webhook requires an authentication header.');
if (!panel.includes('New accounts, purchases, subscription changes')) throw new Error('Admin alert panel is not wired to the expected alert categories.');
if (!panel.includes('subscribeToAdminAlerts')) throw new Error('Admin alerts must update live while an admin is signed in.');
console.log('PASS admin operations alerts foundation guard');
