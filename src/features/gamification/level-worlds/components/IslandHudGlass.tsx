import { useId } from 'react';

/** Optical housing only. Actual controls and text stay crisp, accessible DOM. */
export function IslandHudGlass() {
  const id = `hud-${useId().replace(/:/g, '')}`;
  return <svg className="island-hud-glass" viewBox="0 0 600 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-body`} x2="0" y2="1">
        <stop stopColor="var(--hud-glass)" />
        <stop offset=".18" stopColor="var(--hud-depth)" />
        <stop offset=".72" stopColor="var(--hud-glass)" />
        <stop offset="1" stopColor="var(--hud-depth)" />
      </linearGradient>
      <linearGradient id={`${id}-edge`} x2="0" y2="1">
        <stop stopColor="#ffffff" /><stop offset=".12" stopColor="var(--hud-rim)" />
        <stop offset=".34" stopColor="var(--hud-metal)" /><stop offset=".7" stopColor="var(--hud-rim)" />
        <stop offset=".88" stopColor="#ffffff" /><stop offset="1" stopColor="var(--hud-metal)" />
      </linearGradient>
      <linearGradient id={`${id}-cap`} x2=".8" y2="1">
        <stop stopColor="var(--hud-cap-high, #fff)" /><stop offset=".3" stopColor="var(--hud-cap-mid, #e9f5ff)" />
        <stop offset=".62" stopColor="var(--hud-cap-low, #9bbacc)" /><stop offset=".86" stopColor="var(--hud-cap-high, #fff)" />
      </linearGradient>
      <linearGradient id={`${id}-reflection`} x2="0" y2="1"><stop stopColor="#fff" stopOpacity=".65" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
    </defs>
    <rect x="17" y="7" width="566" height="86" rx="31" fill={`url(#${id}-body)`} stroke={`url(#${id}-edge)`} strokeWidth="3" />
    <rect x="24" y="12" width="552" height="76" rx="27" fill="none" stroke="var(--hud-glow)" strokeOpacity=".7" />
    <path d="M48 12H552Q571 12 575 35L564 25H36L25 35Q29 12 48 12Z" fill={`url(#${id}-reflection)`} />
    <path d="M40 19H559M36 82Q300 91 564 82" fill="none" stroke="#efffff" strokeWidth="1.4" strokeOpacity=".85" />
    <path d="M24 13Q4 22 2 49Q4 77 24 87L32 75Q22 50 32 25Z" fill={`url(#${id}-cap)`} stroke="#ffffff90" />
    <path d="M576 13Q596 22 598 49Q596 77 576 87L568 75Q578 50 568 25Z" fill={`url(#${id}-cap)`} stroke="#ffffff90" />
    <path d="M33 15Q18 50 33 85M567 15Q582 50 567 85" fill="none" stroke={`url(#${id}-edge)`} strokeWidth="4" />
    <path d="M48 14L65 14L40 75L34 65ZM524 15L538 15L566 69L560 78Z" fill="#c5f6ff" opacity=".13" />
    <g className="island-hud-glass__glints" fill="#efffff">
      <path d="M132 8l2 6 7 2-7 2-2 5-2-5-7-2 7-2Z" />
      <path d="M471 80l2 4 5 1-5 1-2 4-1-4-5-1 5-1Z" />
    </g>
  </svg>;
}
