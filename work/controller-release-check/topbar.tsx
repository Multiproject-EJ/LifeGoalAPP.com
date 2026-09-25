import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { IslandMoneyNote } from '../../src/features/gamification/level-worlds/components/IslandMoney';
import { IslandHudGlass } from '../../src/features/gamification/level-worlds/components/IslandHudGlass';
import '../../src/features/gamification/level-worlds/LevelWorlds.css';
import '../../src/features/gamification/level-worlds/components/IslandRunThemedTopbar.css';

function Review() {
  const [width, setWidth] = useState(390);
  const [message, setMessage] = useState('Presentation only — no account or wallet changes.');
  return <main style={{ padding: 16, color: '#e7f6ff', fontFamily: 'system-ui' }}>
    <h1>Optical HUD · B / B2</h1><p>{message}</p>
    <label>Phone width <select value={width} onChange={e => setWidth(Number(e.target.value))}>
      {[320, 360, 390, 430].map(w => <option key={w}>{w}</option>)}
    </select></label>
    {['ice', 'dark', 'light', 'snow', 'gold', 'christmas', 'classic', 'wood'].map(theme => <section key={theme}>
      <h2>{theme}</h2>
      <div style={{ width, maxWidth: '100%', position: 'relative', height: 110, background: 'linear-gradient(130deg,#365c6c,#122d40)', borderRadius: 12 }}>
        <div className="island-run-board__topbar island-run-themed-topbar" data-controller-theme={theme}>
          <IslandHudGlass />
          <button className="island-run-board__topbar-avatar" data-rank-tier="bronze" aria-label="Sample player profile" onClick={() => setMessage('Profile tap received')}>E</button>
          <div className="island-run-board__topbar-wallet"><IslandMoneyNote islandNumber={3} tone={2} className="island-run-board__topbar-money-note" /><strong>12,480</strong></div>
          <div className="island-run-board__topbar-chip"><img className="island-run-board__topbar-currency-icon" src="/assets/spin-wheel/daily-momentum/prizes/prize-shards-orb-transparent.png" alt="" /><span className="island-run-themed-topbar__amount">240</span></div>
          <button className="island-run-board__topbar-audio-toggle" aria-label="Audio options" onClick={() => setMessage('Audio tap received')}>♪</button>
          <button className="island-run-board__topbar-menu" aria-label="Board menu" onClick={() => setMessage('Menu tap received')}>☰</button>
        </div>
      </div>
    </section>)}
  </main>;
}
document.body.style.background = '#0b1824';
createRoot(document.getElementById('root')!).render(<Review />);
