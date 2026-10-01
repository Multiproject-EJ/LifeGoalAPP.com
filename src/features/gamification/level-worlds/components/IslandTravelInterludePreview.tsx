import { useState } from 'react';
import { resolveTravelInterludePlan } from '../services/islandTravelInterlude';
import { IslandTravelInterlude } from './IslandTravelInterlude';

/**
 * Development-only preview: /dev/travel-interlude-preview?from=4&to=5
 * (&reduced=1; &t=0.5 freezes the scene at that progress for captures).
 */
export default function IslandTravelInterludePreview() {
  const params = new URLSearchParams(window.location.search);
  const from = Math.max(1, Math.min(120, Number(params.get('from')) || 4));
  const to = Math.max(1, Math.min(120, Number(params.get('to')) || from + 1));
  const reducedMotion = params.get('reduced') === '1';
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(false);
  const plan = resolveTravelInterludePlan({ fromIslandNumber: from, toIslandNumber: to, reducedMotion });
  const frozen = params.get('t');
  const previewProgress = frozen === null ? undefined : Math.max(0, Math.min(1, Number(frozen) || 0));
  return (
    <div style={{ minHeight: '100vh', background: '#0b1024', color: '#fff', display: 'grid', placeItems: 'center' }}>
      {done ? (
        <button type="button" onClick={() => { setDone(false); setRun((value) => value + 1); }}>
          Arrived at Island {to} — replay
        </button>
      ) : (
        <IslandTravelInterlude key={run} plan={plan} previewProgress={previewProgress} onComplete={() => setDone(true)} />
      )}
    </div>
  );
}
