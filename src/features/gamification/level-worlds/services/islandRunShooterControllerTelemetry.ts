export type ShooterControllerTelemetryEvent = 'controller_attach' | 'controller_detach';
export type ShooterControllerTelemetrySource = 'footer' | 'keyboard';

export interface ShooterControllerTelemetryPayload {
  minigameId: string;
  islandNumber: number;
  source: ShooterControllerTelemetrySource;
}

/**
 * Structured lifecycle telemetry for Shooter Blitz controller sessions.
 * Intentionally console-based (matching other Island Run debug telemetry),
 * so QA can trace attach/detach issues without requiring DB telemetry writes.
 */
export function emitShooterControllerLifecycleTelemetry(
  event: ShooterControllerTelemetryEvent,
  payload: ShooterControllerTelemetryPayload,
): void {
  // eslint-disable-next-line no-console -- structured Island Run QA telemetry line
  console.info('[IslandRunShooterController]', event, payload);
}
