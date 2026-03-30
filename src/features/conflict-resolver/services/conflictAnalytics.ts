import { recordKpiEvent } from '../../../services/aiConflictKpiSink';

export type ConflictAnalyticsEventName =
  | 'conflict.stage_transition'
  | 'conflict.transition_blocked'
  | 'conflict.shared_session_created'
  | 'conflict.shared_session_joined'
  | 'conflict.invites_generated'
  | 'conflict.private_capture_advanced'
  | 'conflict.private_capture_skipped'
  | 'conflict.inner_guidance_shown'
  | 'conflict.inner_upgrade_prompt_clicked'
  | 'conflict.fairness_warning_hit'
  | 'conflict.parallel_read_completed'
  | 'conflict.agreement_finalized';

export function trackConflictEvent(event: ConflictAnalyticsEventName, payload: Record<string, unknown>) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('conflict-analytics', { detail: { event, payload } }));
  }
  recordKpiEvent('conflict', event, payload);
  // Keep debug visibility in dev until server-side analytics sink is wired.
  console.debug('[conflict-analytics]', event, payload);
}
