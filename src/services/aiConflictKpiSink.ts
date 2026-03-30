type KpiSource = 'conflict' | 'ai';

type KpiEventRecord = {
  source: KpiSource;
  event: string;
  payload: Record<string, unknown>;
  timestamp: string;
};

export type KpiSummary = {
  stageCompletionCount: number;
  fallbackRate: number;
  fairnessLintHitRate: number;
  upgradeConversionRate: number;
  totals: {
    aiFallbackEvents: number;
    aiRoutedEvents: number;
    fairnessWarningEvents: number;
    parallelReadCompletions: number;
    upgradeShownEvents: number;
    upgradeClickedEvents: number;
  };
};

const KPI_STORAGE_KEY = 'conflict-resolver:kpi-events:v1';
const MAX_KPI_EVENTS = 600;

function readKpiEvents(): KpiEventRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KPI_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as KpiEventRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeKpiEvents(events: KpiEventRecord[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KPI_STORAGE_KEY, JSON.stringify(events.slice(-MAX_KPI_EVENTS)));
}

export function recordKpiEvent(source: KpiSource, event: string, payload: Record<string, unknown>): void {
  const next: KpiEventRecord = {
    source,
    event,
    payload,
    timestamp: new Date().toISOString(),
  };
  const events = readKpiEvents();
  events.push(next);
  writeKpiEvents(events);
}

function safeRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number((numerator / denominator).toFixed(4));
}

export function getKpiSummary(): KpiSummary {
  const events = readKpiEvents();
  const stageCompletionCount = events.filter((entry) => entry.event === 'conflict.agreement_finalized').length;

  const aiFallbackEvents = events.filter((entry) => entry.event === 'ai.fallback_activated').length;
  const aiRoutedEvents = events.filter((entry) => entry.event === 'ai.quota_consumed').length;

  const fairnessWarningEvents = events.filter((entry) => entry.event === 'conflict.fairness_warning_hit').length;
  const parallelReadCompletions = events.filter((entry) => entry.event === 'conflict.parallel_read_completed').length;

  const upgradeShownEvents = events.filter((entry) => entry.event === 'ai.upgrade_prompt_shown').length;
  const upgradeClickedEvents = events.filter((entry) => entry.event === 'ai.upgrade_prompt_clicked').length;

  return {
    stageCompletionCount,
    fallbackRate: safeRate(aiFallbackEvents, aiFallbackEvents + aiRoutedEvents),
    fairnessLintHitRate: safeRate(fairnessWarningEvents, parallelReadCompletions),
    upgradeConversionRate: safeRate(upgradeClickedEvents, upgradeShownEvents),
    totals: {
      aiFallbackEvents,
      aiRoutedEvents,
      fairnessWarningEvents,
      parallelReadCompletions,
      upgradeShownEvents,
      upgradeClickedEvents,
    },
  };
}

export function clearKpiEvents(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KPI_STORAGE_KEY);
}
