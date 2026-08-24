import { useCallback, useEffect, useRef, useState } from 'react';
import {
  parseCompassBookProfileQuality,
  summarizeCompassBookPerformance,
  type CompassBookPerformanceSummary,
  type CompassBookProfileQuality,
} from '../logic/deviceProfiling';
import './CompassBookDeviceProfiler.css';

const PROFILE_DURATION_MS = 30_000;

type ProfileReport = CompassBookPerformanceSummary & {
  profileSchema: 'compass-book-3d-device-v1';
  capturedAt: string;
  deviceLabel: string;
  userAgent: string;
  platform: string;
  viewport: { width: number; height: number; devicePixelRatio: number };
  renderer: {
    width: number;
    height: number;
    maxCalls: number;
    maxRenderedTriangles: number;
    modelTriangles: number;
    gpuVendor?: string;
    gpuRenderer?: string;
  };
  page: string;
};

type ActiveProfile = {
  frame: number;
  startedAt: number;
  lastFrameAt: number;
  frameTimesMs: number[];
  quality: CompassBookProfileQuality;
  shell: HTMLElement;
  maxCalls: number;
  maxRenderedTriangles: number;
};

function readMetric(shell: HTMLElement, name: string): number {
  const value = Number(shell.dataset[name] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export function CompassBookDeviceProfiler() {
  const requestedQuality = parseCompassBookProfileQuality(
    new URLSearchParams(window.location.search).get('compass3dQuality'),
  );
  const [status, setStatus] = useState<'idle' | 'running' | 'complete' | 'cancelled'>('idle');
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState('Keep Safari visible for the full 30-second run.');
  const [deviceLabel, setDeviceLabel] = useState('');
  const [report, setReport] = useState<ProfileReport | null>(null);
  const [copyNotice, setCopyNotice] = useState('');
  const activeRef = useRef<ActiveProfile | null>(null);

  const cancel = useCallback((message: string) => {
    const active = activeRef.current;
    if (!active) return;
    window.cancelAnimationFrame(active.frame);
    activeRef.current = null;
    setStatus('cancelled');
    setProgress(0);
    setNotice(message);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') {
        cancel('Run cancelled because Safari left the foreground.');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      const active = activeRef.current;
      if (active) window.cancelAnimationFrame(active.frame);
    };
  }, [cancel]);

  const start = () => {
    if (activeRef.current) return;
    if (document.visibilityState !== 'visible') {
      setStatus('cancelled');
      setNotice('Bring Safari to the foreground before starting.');
      return;
    }
    const shell = document.querySelector<HTMLElement>('.compass-book-three-shell');
    const quality = parseCompassBookProfileQuality(shell?.dataset.quality);
    if (!shell || !quality || !shell.dataset.fps) {
      setStatus('cancelled');
      setNotice('The production 3D book is not ready. Use presentation=3d and wait for the book to appear.');
      return;
    }

    const startedAt = performance.now();
    const active: ActiveProfile = {
      frame: 0,
      startedAt,
      lastFrameAt: 0,
      frameTimesMs: [],
      quality,
      shell,
      maxCalls: 0,
      maxRenderedTriangles: 0,
    };
    activeRef.current = active;
    setReport(null);
    setCopyNotice('');
    setProgress(0);
    setStatus('running');
    setNotice(`Profiling the real ${quality.toUpperCase()} production shell…`);

    const tick = (now: number) => {
      if (activeRef.current !== active) return;
      if (active.lastFrameAt > 0) active.frameTimesMs.push(now - active.lastFrameAt);
      active.lastFrameAt = now;
      active.maxCalls = Math.max(active.maxCalls, readMetric(shell, 'renderCalls'));
      active.maxRenderedTriangles = Math.max(
        active.maxRenderedTriangles,
        readMetric(shell, 'renderedTriangles'),
      );

      const elapsed = now - startedAt;
      setProgress(Math.min(100, Math.round((elapsed / PROFILE_DURATION_MS) * 100)));
      if (elapsed < PROFILE_DURATION_MS) {
        active.frame = window.requestAnimationFrame(tick);
        return;
      }

      const summary = summarizeCompassBookPerformance(active.frameTimesMs, quality);
      const nextReport: ProfileReport = {
        ...summary,
        profileSchema: 'compass-book-3d-device-v1',
        capturedAt: new Date().toISOString(),
        deviceLabel: deviceLabel.trim() || `${navigator.platform || 'iPhone'} · ${screen.width}×${screen.height}`,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio,
        },
        renderer: {
          width: readMetric(shell, 'rendererWidth'),
          height: readMetric(shell, 'rendererHeight'),
          maxCalls: active.maxCalls,
          maxRenderedTriangles: active.maxRenderedTriangles,
          modelTriangles: readMetric(shell, 'modelTriangles'),
          gpuVendor: shell.dataset.gpuVendor,
          gpuRenderer: shell.dataset.gpuRenderer,
        },
        page: shell.dataset.activePage ?? 'unknown',
      };
      activeRef.current = null;
      setProgress(100);
      setReport(nextReport);
      setStatus('complete');
      setNotice(
        summary.rating === 'pass'
          ? `PASS: ${summary.averageFps} FPS meets the ${summary.targetFps} FPS ${quality.toUpperCase()} gate.`
          : `${summary.rating.toUpperCase()}: ${summary.averageFps} FPS is below the ${summary.targetFps} FPS ${quality.toUpperCase()} gate.`,
      );
    };
    active.frame = window.requestAnimationFrame(tick);
  };

  const copyReport = async () => {
    if (!report) return;
    const text = JSON.stringify(report, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotice('Report copied.');
    } catch {
      setCopyNotice('Clipboard was unavailable. Select the report text below and copy it.');
    }
  };

  const selectQuality = (quality: CompassBookProfileQuality) => {
    const params = new URLSearchParams(window.location.search);
    params.set('compass3dQuality', quality);
    window.location.search = params.toString();
  };

  return (
    <aside className="compass-book-device-profiler" data-status={status} data-rating={report?.rating ?? 'pending'}>
      <header>
        <span>PHYSICAL DEVICE PROOF</span>
        <strong>{status === 'running' ? `${progress}%` : report?.rating.toUpperCase() ?? '30 SEC'}</strong>
      </header>
      <div className="compass-book-device-profiler__quality" aria-label="Profiler quality">
        <button type="button" aria-pressed={requestedQuality === 'high'} disabled={status === 'running'} onClick={() => selectQuality('high')}>High</button>
        <button type="button" aria-pressed={requestedQuality === 'low'} disabled={status === 'running'} onClick={() => selectQuality('low')}>Low</button>
      </div>
      {status === 'running' ? (
        <div className="compass-book-device-profiler__progress" aria-label={`${progress}% complete`}>
          <span style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      {!report ? (
        <input
          aria-label="iPhone model"
          disabled={status === 'running'}
          maxLength={48}
          placeholder="iPhone model (for example, iPhone 15)"
          value={deviceLabel}
          onChange={(event) => setDeviceLabel(event.target.value)}
        />
      ) : (
        <dl>
          <div><dt>Quality</dt><dd>{report.quality.toUpperCase()}</dd></div>
          <div><dt>Average</dt><dd>{report.averageFps} FPS</dd></div>
          <div><dt>Target</dt><dd>{report.targetFps} FPS</dd></div>
          <div><dt>P95 frame</dt><dd>{report.p95FrameMs} ms</dd></div>
          <div><dt>Worst</dt><dd>{report.worstFrameMs} ms</dd></div>
          <div><dt>Max calls</dt><dd>{report.renderer.maxCalls}</dd></div>
          <div><dt>Max tris</dt><dd>{Math.round(report.renderer.maxRenderedTriangles / 1_000)}k</dd></div>
        </dl>
      )}
      <div className="compass-book-device-profiler__actions">
        <button type="button" disabled={status === 'running'} onClick={start}>
          {report ? 'Run again' : status === 'cancelled' ? 'Restart profile' : 'Run 30s profile'}
        </button>
        {report ? <button type="button" onClick={() => void copyReport()}>Copy report</button> : null}
      </div>
      <p>{notice}</p>
      {copyNotice ? <p className="compass-book-device-profiler__copy-notice">{copyNotice}</p> : null}
      {report ? <textarea aria-label="Profile report JSON" readOnly value={JSON.stringify(report, null, 2)} /> : null}
    </aside>
  );
}
