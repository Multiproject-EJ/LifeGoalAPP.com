export const ISLAND_RUN_RUNTIME_HYDRATION_STAGE = 'island_run_runtime_state_hydrated' as const;
export const ISLAND_RUN_RUNTIME_HYDRATION_FAILED_STAGE = 'island_run_runtime_state_hydration_failed_unexpected' as const;

export const ISLAND_RUN_RUNTIME_HYDRATION_SOURCES = [
  'table',
  'fallback_demo_or_no_client',
  'fallback_query_error',
  'fallback_backoff_active',
  'fallback_no_row',
] as const;

export type IslandRunRuntimeHydrationSource = (typeof ISLAND_RUN_RUNTIME_HYDRATION_SOURCES)[number];


export const ISLAND_RUN_RUNTIME_HYDRATION_ALERT_DEFAULTS = {
  fallbackRatio24h: 0.35,
  failureCount24h: 25,
  minHydrationEvents24h: 20,
} as const;


const ISLAND_RUN_RUNTIME_HYDRATION_TELEMETRY_PREFIX = 'island_run_runtime_hydration_telemetry';

function getTodayUtcKey() {
  return new Date().toISOString().slice(0, 10);
}

function getTelemetryStorageKey(options: {
  userId: string;
  eventType: 'runtime_state_hydrated' | 'runtime_state_hydration_failed';
  source?: IslandRunRuntimeHydrationSource;
}) {
  const { userId, eventType, source } = options;
  const sourcePart = source ?? 'none';
  return `${ISLAND_RUN_RUNTIME_HYDRATION_TELEMETRY_PREFIX}:${userId}:${eventType}:${sourcePart}:${getTodayUtcKey()}`;
}

export function shouldEmitIslandRunRuntimeHydrationTelemetry(options: {
  userId: string;
  eventType: 'runtime_state_hydrated' | 'runtime_state_hydration_failed';
  source?: IslandRunRuntimeHydrationSource;
}): boolean {
  if (typeof window === 'undefined') return true;

  const key = getTelemetryStorageKey(options);

  try {
    if (window.sessionStorage.getItem(key) === '1') {
      return false;
    }
    window.sessionStorage.setItem(key, '1');
    return true;
  } catch {
    return true;
  }
}
