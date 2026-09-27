import { CrashReportHost } from './CrashReportHost';
import { captureCrash } from '../../services/crashReports';

/** Development-only preview: ?phase=form|thanks|queued. Never sends anything. */
export default function CrashReportPreview() {
  const params = new URLSearchParams(window.location.search);
  const phase = (params.get('phase') ?? 'form') as 'form' | 'thanks' | 'queued';
  captureCrash({ error: new TypeError("Cannot read properties of undefined (reading 'buildLevel')"), surface: 'level_worlds' });
  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(160deg,#1b3a5c,#0b1a2e)' }}>
      <CrashReportHost preview={{ phase, rewardAmount: phase === 'thanks' ? 20 : undefined }} />
    </div>
  );
}
