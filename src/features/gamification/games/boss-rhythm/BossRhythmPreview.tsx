import { useState } from 'react';
import { BossRhythmMinigame } from './BossRhythmMinigame';

/** Dev-only preview: /dev/boss-rhythm-preview?island=3 (no gameplay writes). */
export default function BossRhythmPreview() {
  const params = new URLSearchParams(window.location.search);
  const island = Math.max(1, Math.min(120, Number(params.get('island') ?? 3) || 3));
  const [result, setResult] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  if (result) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#050a1a', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <p>{result}</p>
          <button type="button" onClick={() => { setResult(null); setRun((value) => value + 1); }}>Play again</button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#050a1a' }}>
      <BossRhythmMinigame
        key={run}
        islandNumber={island}
        onComplete={(outcome) => setResult(JSON.stringify(outcome))}
      />
    </div>
  );
}
