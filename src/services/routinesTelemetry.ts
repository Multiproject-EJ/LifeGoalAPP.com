export type RoutinesTelemetryEvent =
  | 'routines.cinematic_run_started'
  | 'routines.cinematic_step_completed'
  | 'routines.cinematic_run_completed'
  | 'routines.cinematic_run_closed';

export type RoutinesTelemetryPayload = Record<string, unknown>;

export function trackRoutinesTelemetry(
  event: RoutinesTelemetryEvent,
  payload: RoutinesTelemetryPayload,
): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('routines-analytics', { detail: { event, payload } }));
  }

  console.debug('[routines-analytics]', event, payload);
}
