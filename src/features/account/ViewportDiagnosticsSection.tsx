import { useEffect, useState } from 'react';
import {
  checkViewportNow,
  clearViewportWatchdogEpisodes,
  getViewportMetrics,
  getViewportWatchdogEpisodes,
  subscribeViewportWatchdog,
  type ViewportMetrics,
} from '../../utils/viewportWatchdog';

const formatEpisodeTime = (iso: string) => {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toLocaleString();
};

export function ViewportDiagnosticsSection() {
  const [metrics, setMetrics] = useState<ViewportMetrics>(() => getViewportMetrics());
  const [episodes, setEpisodes] = useState(() => getViewportWatchdogEpisodes());
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeViewportWatchdog((next) => {
      setMetrics(next);
      setEpisodes(getViewportWatchdogEpisodes());
    });
    return unsubscribe;
  }, []);

  const handleCheckNow = () => {
    const next = checkViewportNow();
    setMetrics(next);
    setEpisodes(getViewportWatchdogEpisodes());
    setMessage(
      next.bottomDeficit > 8
        ? `Short viewport detected: ${next.bottomDeficit}px missing at the bottom. A re-layout nudge was attempted.`
        : 'Viewport looks correct right now — no missing space at the bottom.',
    );
  };

  const handleCopy = async () => {
    const payload = JSON.stringify(
      { metrics: getViewportMetrics(), episodes: getViewportWatchdogEpisodes() },
      null,
      2,
    );
    try {
      await navigator.clipboard.writeText(payload);
      setMessage('Diagnostics copied to the clipboard.');
    } catch {
      setMessage('Could not access the clipboard on this device.');
    }
  };

  const handleClear = () => {
    clearViewportWatchdogEpisodes();
    setEpisodes([]);
    setMessage('Cleared the recorded viewport episodes on this device.');
  };

  const lastEpisode = episodes.length > 0 ? episodes[episodes.length - 1] : null;
  const deficitDetected = metrics.bottomDeficit > 8;

  return (
    <section className="account-panel__card" aria-labelledby="viewport-diagnostics">
      <p className="account-panel__eyebrow">Display diagnostics</p>
      <h3 id="viewport-diagnostics">Viewport watchdog</h3>
      <p className="account-panel__hint">
        Tracks the iOS bug where the app window is sized shorter than the screen, leaving a white
        band under the bottom bar. Episodes are recorded automatically so an intermittent glitch can
        be inspected after the fact.
      </p>
      <dl className="account-panel__details">
        <div>
          <dt>Status</dt>
          <dd>{deficitDetected ? `Short by ${metrics.bottomDeficit}px` : 'Correct size'}</dd>
        </div>
        <div>
          <dt>Window height / screen height</dt>
          <dd>
            {metrics.innerHeight}px / {metrics.orientation === 'portrait'
              ? Math.max(metrics.screenHeight, metrics.screenWidth)
              : Math.min(metrics.screenHeight, metrics.screenWidth)}px
          </dd>
        </div>
        <div>
          <dt>Bottom safe-area inset</dt>
          <dd>{metrics.safeAreaBottom}px</dd>
        </div>
        <div>
          <dt>Display mode</dt>
          <dd>{metrics.displayMode}</dd>
        </div>
        <div>
          <dt>Recorded episodes</dt>
          <dd>{episodes.length}</dd>
        </div>
        <div>
          <dt>Last episode</dt>
          <dd>
            {lastEpisode
              ? `${formatEpisodeTime(lastEpisode.startedAt)} — ${lastEpisode.deficitAtStart}px, ${
                  lastEpisode.resolvedAt
                    ? `resolved (${lastEpisode.resolvedBy === 'nudge' ? 'by nudge' : 'externally'})`
                    : 'unresolved'
                }`
              : 'None recorded'}
          </dd>
        </div>
      </dl>
      <div className="account-panel__actions-row" style={{ marginTop: '0.75rem' }}>
        <button type="button" className="btn btn--primary" onClick={handleCheckNow}>
          Re-check now
        </button>
        <button type="button" className="btn" onClick={handleCopy}>
          Copy diagnostics
        </button>
        <button type="button" className="btn" onClick={handleClear}>
          Clear episodes
        </button>
      </div>
      {message ? (
        <p className="account-panel__saving-indicator" style={{ marginTop: '0.5rem' }}>
          {message}
        </p>
      ) : null}
    </section>
  );
}
