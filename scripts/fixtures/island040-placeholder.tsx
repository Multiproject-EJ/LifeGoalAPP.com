import React from 'react';
import { createRoot } from 'react-dom/client';
import Island5ThreePilot from '../../src/features/gamification/level-worlds/dev/Island5ThreePilot';
import '../../src/features/gamification/level-worlds/dev/IslandTemplateKitPage.css';

// Dev-only responsiveness proof of the actual renderer, without App/auth imports
// or the existing workbench evidence mode's fixed 390×844 phone frame.
if (!import.meta.env.DEV) throw new Error('Local development fixture only');
const params = new URLSearchParams(location.search);
const level = Math.max(0, Math.min(3, Number(params.get('level')) || 0)) as 0 | 1 | 2 | 3;
createRoot(document.getElementById('root')!).render(
  <div style={{ position: 'fixed', inset: 0 }}>
    <Island5ThreePilot islandNumber={40} worldSourceNumber={40} buildLevel={level} />
  </div>,
);
