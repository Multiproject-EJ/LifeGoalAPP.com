import './assembly-topbar-blast.css';

/**
 * Overlay inside the top bar during the big middle Assembly blast: a crack in
 * one panel, sparks, and a small helper robot that flies up, welds it and
 * powers the bar back on. Original SVG art; presentation only.
 */
export function AssemblyTopbarBlast() {
  return (
    <span className="assembly-topbar-blast" aria-hidden="true">
      <svg className="assembly-topbar-blast__crack" viewBox="0 0 120 40" preserveAspectRatio="none">
        <path d="M2 18 L22 15 L30 24 L46 12 L58 22 L70 9 L84 20 L98 14 L118 22" />
        <path d="M46 12 L50 2 M58 22 L60 36 M84 20 L90 32" />
      </svg>
      <span className="assembly-topbar-blast__sparks">
        {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ ['--i' as string]: i }} />)}
      </span>
      <span className="assembly-topbar-blast__robot">
        <svg viewBox="0 0 40 52">
          <path className="assembly-topbar-blast__flame" d="M14 40 Q20 52 26 40 Z" />
          <rect x="9" y="22" width="22" height="18" rx="6" fill="#e0f2fe" stroke="#0e7490" strokeWidth="2" />
          <circle cx="20" cy="14" r="10" fill="#f0f9ff" stroke="#0e7490" strokeWidth="2" />
          <rect x="12" y="10" width="16" height="7" rx="3.5" fill="#0f172a" />
          <circle className="assembly-topbar-blast__eye" cx="16.5" cy="13.5" r="1.8" />
          <circle className="assembly-topbar-blast__eye" cx="23.5" cy="13.5" r="1.8" />
          <line x1="20" y1="4" x2="20" y2="0.5" stroke="#0e7490" strokeWidth="2" />
          <circle cx="20" cy="0.8" r="1.6" fill="#22d3ee" />
          <path className="assembly-topbar-blast__arm" d="M31 28 L38 22" stroke="#0e7490" strokeWidth="3" strokeLinecap="round" />
          <circle className="assembly-topbar-blast__torch" cx="38.5" cy="21.5" r="2.4" />
        </svg>
      </span>
    </span>
  );
}
