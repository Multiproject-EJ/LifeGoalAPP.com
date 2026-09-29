import { lazy, Suspense, useState } from 'react';
import './assembly-topbar-blast.css';

// The crew renderer (three.js + robot rig) only loads for this one blast;
// Island 001 prefetches it so the robots are ready when the shockwave hits.
const loadAssemblyTopbarCrew = () => import('./AssemblyTopbarCrew');
const AssemblyTopbarCrew = lazy(loadAssemblyTopbarCrew);
export function prefetchAssemblyTopbarCrew(): void {
  void loadAssemblyTopbarCrew().catch(() => undefined);
}

/**
 * Overlay inside the top bar during the big middle Assembly blast: the
 * shockwave tears the bar loose so it hangs, neon segments die, a smoke cloud
 * rolls over and leaves it dusty, and the game's robot crew repairs it
 * (lift, rewire, sweep). Timings follow ASSEMBLY_TOPBAR_BEATS. Presentation only.
 */
export function AssemblyTopbarBlast() {
  // One clock for the CSS beats and the robots.
  const [startedAtMs] = useState(() => performance.now());
  return (
    <span className="assembly-topbar-blast" aria-hidden="true">
      <span className="assembly-topbar-blast__dust" />
      <svg className="assembly-topbar-blast__crack" viewBox="0 0 120 40" preserveAspectRatio="none">
        <path d="M2 18 L22 15 L30 24 L46 12 L58 22 L70 9 L84 20 L98 14 L118 22" />
        <path d="M46 12 L50 2 M58 22 L60 36 M84 20 L90 32" />
      </svg>
      <span className="assembly-topbar-blast__sparks">
        {Array.from({ length: 10 }, (_, i) => <i key={i} style={{ ['--i' as string]: i }} />)}
      </span>
      <span className="assembly-topbar-blast__rewire">
        {Array.from({ length: 6 }, (_, i) => <i key={i} style={{ ['--i' as string]: i }} />)}
      </span>
      <span className="assembly-topbar-blast__smoke">
        {Array.from({ length: 9 }, (_, i) => <i key={i} style={{ ['--i' as string]: i }} />)}
      </span>
      <Suspense fallback={null}><AssemblyTopbarCrew startedAtMs={startedAtMs} /></Suspense>
    </span>
  );
}
