import { useMemo, useState } from 'react';
import { clearKpiEvents, getKpiSummary } from '../../../services/aiConflictKpiSink';

function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function ConflictKpiSnapshot() {
  const [version, setVersion] = useState(0);
  const summary = useMemo(() => getKpiSummary(), [version]);

  return (
    <article className="conflict-resolver__kpi-card" aria-label="Conflict Resolver KPI snapshot">
      <header>
        <h4>Local KPI snapshot</h4>
        <p>Phase 5 diagnostics from client-side analytics sink.</p>
      </header>
      <ul>
        <li>
          <span>Stage completions</span>
          <strong>{summary.stageCompletionCount}</strong>
        </li>
        <li>
          <span>Fallback rate</span>
          <strong>{formatPct(summary.fallbackRate)}</strong>
        </li>
        <li>
          <span>Fairness hit rate</span>
          <strong>{formatPct(summary.fairnessLintHitRate)}</strong>
        </li>
        <li>
          <span>Upgrade conversion</span>
          <strong>{formatPct(summary.upgradeConversionRate)}</strong>
        </li>
      </ul>
      <div className="conflict-resolver__kpi-actions">
        <button type="button" className="btn" onClick={() => setVersion((value) => value + 1)}>
          Refresh
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            clearKpiEvents();
            setVersion((value) => value + 1);
          }}
        >
          Clear
        </button>
      </div>
    </article>
  );
}
