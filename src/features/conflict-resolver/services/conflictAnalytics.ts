export type ConflictAnalyticsEventName =
  | 'conflict.stage_transition'
  | 'conflict.transition_blocked'
  | 'conflict.shared_session_created'
  | 'conflict.shared_session_joined'
  | 'conflict.invites_generated';

export function trackConflictEvent(event: ConflictAnalyticsEventName, payload: Record<string, unknown>) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('conflict-analytics', { detail: { event, payload } }));
  }
  // Keep debug visibility in dev until server-side analytics sink is wired.
  console.debug('[conflict-analytics]', event, payload);
}
