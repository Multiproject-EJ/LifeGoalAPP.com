import type { CSSProperties } from 'react';
import type { WellbeingShieldScore } from './wellbeingShield';
import './WellbeingShieldCard.css';

export function WellbeingShieldCard({ score, onOpenSuperHabits }: { score: WellbeingShieldScore; onOpenSuperHabits?: () => void }) {
  return <section className="wellbeing-shield" aria-label={`Wellbeing Shield ${score.total} out of 100`}>
    <div className="wellbeing-shield__crest" style={{ '--shield-fill': `${score.total}%` } as CSSProperties}><span>🛡️</span><strong>{score.total}</strong></div>
    <div className="wellbeing-shield__copy"><small>Body + Mind SuperHabits</small><h3>Wellbeing Shield</h3><p>Your rolling seven-day protection. It adds a bounded <strong>+{score.healthContribution}</strong> signal to Body & Health progress—never more than 10 points.</p><div><span>Body <b>{score.body}</b></span><span>Mind <b>{score.mind}</b></span></div></div>
    {onOpenSuperHabits ? <button type="button" onClick={onOpenSuperHabits}>Open SuperHabits</button> : null}
  </section>;
}
