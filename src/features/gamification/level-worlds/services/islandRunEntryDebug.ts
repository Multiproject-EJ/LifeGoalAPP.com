const ISLAND_RUN_ENTRY_DEBUG_PARAM = 'islandRunEntryDebug';
const ISLAND_RUN_ENTRY_DEBUG_BUFFER_KEY = 'island_run_entry_debug_buffer_v1';
const ISLAND_RUN_ENTRY_DEBUG_MAX_BUFFER_ITEMS = 200;
const ISLAND_RUN_ENTRY_DEBUG_MAX_NETWORK_ITEMS = 80;

type IslandRunEntryDebugPayload = Record<string, unknown>;

type IslandRunEntryCheckpoint =
  | 'login_click'
  | 'post_redirect_paint'
  | 'session_established'
  | 'island_run_entry_visible'
  | 'blank_screen_observed'
  | 'recovered';

type IslandRunEntryDebugEntry = {
  stage: string;
  timestamp: string;
  pathname: string;
  search: string;
  hash: string;
  payload?: IslandRunEntryDebugPayload;
};

type IslandRunEntryDebugNetworkEntry = {
  name: string;
  initiatorType: string;
  startTime: number;
  duration: number;
  transferSize?: number;
};

type IslandRunEntryDebugEvidence = {
  generatedAt: string;
  location: {
    pathname: string;
    search: string;
    hash: string;
  };
  visibilityState: string;
  events: IslandRunEntryDebugEntry[];
  network: IslandRunEntryDebugNetworkEntry[];
};

declare global {
  interface Window {
    __islandRunEntryDebugDump?: () => IslandRunEntryDebugEntry[];
    __islandRunEntryDebugClear?: () => void;
    __islandRunEntryDebugEvidence?: () => IslandRunEntryDebugEvidence;
    __islandRunEntryDebugMark?: (label: string, payload?: IslandRunEntryDebugPayload) => void;
    __islandRunEntryDebugStartRun?: (scenario: string) => string;
    __islandRunEntryDebugMarkCheckpoint?: (
      checkpoint: IslandRunEntryCheckpoint,
      payload?: IslandRunEntryDebugPayload,
    ) => void;
    __islandRunEntryDebugListenersInstalled?: boolean;
  }
}

function getLocationSnapshot() {
  if (typeof window === 'undefined') {
    return {
      pathname: '',
      search: '',
      hash: '',
    };
  }

  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  };
}

function readDebugBuffer(): IslandRunEntryDebugEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.sessionStorage.getItem(ISLAND_RUN_ENTRY_DEBUG_BUFFER_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as IslandRunEntryDebugEntry[]) : [];
  } catch {
    return [];
  }
}

function writeDebugBuffer(entries: IslandRunEntryDebugEntry[]) {
  if (typeof window === 'undefined') return;

  try {
    const trimmed = entries.slice(-ISLAND_RUN_ENTRY_DEBUG_MAX_BUFFER_ITEMS);
    window.sessionStorage.setItem(ISLAND_RUN_ENTRY_DEBUG_BUFFER_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore debug buffer persistence failures
  }
}

function collectNetworkEntries(): IslandRunEntryDebugNetworkEntry[] {
  if (typeof window === 'undefined' || typeof window.performance === 'undefined') {
    return [];
  }

  const resources = window.performance
    .getEntriesByType('resource')
    .filter((entry): entry is PerformanceResourceTiming => {
      if (!('name' in entry) || typeof entry.name !== 'string') return false;

      return (
        entry.name.includes('supabase.co') ||
        entry.name.includes('/rest/v1/') ||
        entry.name.includes('island_run_runtime_state')
      );
    })
    .slice(-ISLAND_RUN_ENTRY_DEBUG_MAX_NETWORK_ITEMS)
    .map((entry) => ({
      name: entry.name,
      initiatorType: entry.initiatorType,
      startTime: Number(entry.startTime.toFixed(2)),
      duration: Number(entry.duration.toFixed(2)),
      transferSize: entry.transferSize,
    }));

  return resources;
}

function collectDebugEvidence(): IslandRunEntryDebugEvidence {
  return {
    generatedAt: new Date().toISOString(),
    location: getLocationSnapshot(),
    visibilityState: typeof document === 'undefined' ? 'unknown' : document.visibilityState,
    events: readDebugBuffer(),
    network: collectNetworkEntries(),
  };
}

function createDebugRunId(scenario: string): string {
  const normalizedScenario = scenario.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const safeScenario = normalizedScenario || 'island-run-login';
  return `${safeScenario}-${Date.now().toString(36)}`;
}

export function isIslandRunEntryDebugEnabled(search?: string) {
  const effectiveSearch =
    typeof search === 'string' ? search : typeof window !== 'undefined' ? window.location.search : '';

  const params = new URLSearchParams(effectiveSearch);
  return params.get(ISLAND_RUN_ENTRY_DEBUG_PARAM) === '1';
}

export function logIslandRunEntryDebug(stage: string, payload?: IslandRunEntryDebugPayload) {
  if (!isIslandRunEntryDebugEnabled()) return;

  const entry: IslandRunEntryDebugEntry = {
    stage,
    timestamp: new Date().toISOString(),
    ...getLocationSnapshot(),
    payload,
  };

  const nextBuffer = [...readDebugBuffer(), entry];
  writeDebugBuffer(nextBuffer);

  console.info('[IslandRunEntryDebug]', {
    ...entry,
    ...(payload ?? {}),
  });
}

function installGlobalDebugListeners() {
  if (typeof window === 'undefined') return;
  if (window.__islandRunEntryDebugListenersInstalled) return;

  window.__islandRunEntryDebugListenersInstalled = true;

  window.addEventListener('error', (event) => {
    logIslandRunEntryDebug('window_error', {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    logIslandRunEntryDebug('window_unhandled_rejection', {
      reason:
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : 'unknown_rejection_reason',
    });
  });

  document.addEventListener('visibilitychange', () => {
    logIslandRunEntryDebug('document_visibility_change', {
      visibilityState: document.visibilityState,
    });
  });

  window.addEventListener('pageshow', () => {
    logIslandRunEntryDebug('window_pageshow', {
      visibilityState: document.visibilityState,
    });
  });

  window.addEventListener('pagehide', () => {
    logIslandRunEntryDebug('window_pagehide', {
      visibilityState: document.visibilityState,
    });
  });
}

function installDebugWindowHelpers() {
  if (typeof window === 'undefined') return;
  if (!isIslandRunEntryDebugEnabled()) return;
  if (window.__islandRunEntryDebugDump && window.__islandRunEntryDebugClear && window.__islandRunEntryDebugEvidence) {
    return;
  }

  installGlobalDebugListeners();

  window.__islandRunEntryDebugDump = () => readDebugBuffer();
  window.__islandRunEntryDebugClear = () => writeDebugBuffer([]);
  window.__islandRunEntryDebugEvidence = () => collectDebugEvidence();
  window.__islandRunEntryDebugMark = (label, payload) => {
    logIslandRunEntryDebug('manual_mark', {
      label,
      ...payload,
    });
  };
  window.__islandRunEntryDebugStartRun = (scenario) => {
    const runId = createDebugRunId(scenario);
    logIslandRunEntryDebug('repro_run_started', { scenario, runId });
    return runId;
  };
  window.__islandRunEntryDebugMarkCheckpoint = (checkpoint, payload) => {
    logIslandRunEntryDebug('repro_checkpoint', {
      checkpoint,
      ...payload,
    });
  };

  logIslandRunEntryDebug('debug_helpers_installed', {
    visibilityState: typeof document === 'undefined' ? 'unknown' : document.visibilityState,
  });
}

installDebugWindowHelpers();
