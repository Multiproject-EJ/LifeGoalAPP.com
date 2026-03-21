import { useMemo, useState } from 'react';
import {
  clearIslandRunExportableDebugLog,
  downloadIslandRunExportableDebugLog,
  downloadIslandRunExportableDebugLogText,
  getIslandRunExportableDebugLog,
} from '../gamification/level-worlds/services/islandRunEntryDebug';

export function GameDebugLogSection() {
  const [message, setMessage] = useState<string | null>(null);
  const snapshot = useMemo(() => getIslandRunExportableDebugLog(), [message]);
  const latestEventTimestamp =
    snapshot.events.length > 0 ? snapshot.events[snapshot.events.length - 1]?.timestamp ?? 'No events yet' : 'No events yet';

  const handleExport = () => {
    const result = downloadIslandRunExportableDebugLog();
    if (!result) {
      setMessage('Game log export is unavailable in this environment.');
      return;
    }

    setMessage(`Exported ${result.filename} with ${result.eventCount} log events.`);
  };

  const handleExportText = () => {
    const result = downloadIslandRunExportableDebugLogText();
    if (!result) {
      setMessage('Text log export is unavailable in this environment.');
      return;
    }

    setMessage(`Exported ${result.filename} as a shareable text log.`);
  };

  const handleClear = () => {
    clearIslandRunExportableDebugLog();
    setMessage('Cleared the saved Island Run debug log on this device.');
  };

  return (
    <section className="account-panel__card" aria-labelledby="game-debug-log">
      <p className="account-panel__eyebrow">Game logs</p>
      <h3 id="game-debug-log">Island Run debug log</h3>
      <p className="account-panel__hint">
        Export recent Island Run events, browser errors, stack traces, runtime snapshots, and matching network traces as JSON or plain text so it is easy to share for debugging.
      </p>
      <dl className="account-panel__details">
        <div>
          <dt>Captured events</dt>
          <dd>{snapshot.events.length}</dd>
        </div>
        <div>
          <dt>Network traces</dt>
          <dd>{snapshot.network.length}</dd>
        </div>
        <div>
          <dt>Last log timestamp</dt>
          <dd>{latestEventTimestamp}</dd>
        </div>
      </dl>
      <div className="account-panel__actions-row" style={{ marginTop: '0.75rem' }}>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleExport}
        >
          Export JSON log
        </button>
        <button
          type="button"
          className="btn"
          onClick={handleExportText}
        >
          Export text log
        </button>
        <button
          type="button"
          className="btn"
          onClick={handleClear}
        >
          Clear log
        </button>
      </div>
      {message ? <p className="account-panel__saving-indicator" style={{ marginTop: '0.5rem' }}>{message}</p> : null}
    </section>
  );
}
