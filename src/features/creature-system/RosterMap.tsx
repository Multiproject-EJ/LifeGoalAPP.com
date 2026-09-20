import { useState } from 'react';
import { rosterCoverage } from './rosterCoverage';
import { SUIT_COLORS, SUIT_GLYPHS } from './content';
import { getFamily } from './content';

export function RosterMap({ onOpen }: { onOpen: (id:string)=>void }) {
  const [suit,setSuit]=useState('all');
  const coverage=rosterCoverage();
  return <section className="cs-roster-map">
    <div className="cs-section-title"><div><h2>The personality-to-creature map</h2><p>{coverage.scoredFamilies} draft family targets · {coverage.represented}/32 archetypes represented · {coverage.primaryRepresented}/32 appear as a dominant motivation.</p></div></div>
    <p>Color identifies the archetype suit, not rarity. A creature appears under its three motivations; its stable family code links all its forms. Emotions are authored expression cues—not feelings a player must have.</p>
    <p className="cs-note">44 newly proposed mixes join the six pilot directions. Coverage means a link exists, not that every personality combination has a close match. {coverage.duplicateMixes.length} identical ordered mixes; distinct motivations still require distinct bodies, faces and materials.</p>
    {coverage.sameMotivesDifferentOrder.length>0 && <details className="cs-explanation"><summary>{coverage.sameMotivesDifferentOrder.length} shared-motive groups need differentiation review</summary><p>These families use the same three motives in a different order. That can be intentional, but emotion, body design and practice must justify separate identities. This does not merge families or change forms.</p>{coverage.sameMotivesDifferentOrder.map(([key,ids])=><p key={key}>{ids.map(id=>getFamily(id)?.name).join(' · ')}</p>)}</details>}
    <label className="cs-roster-filter">Archetype suit<select value={suit} onChange={e=>setSuit(e.target.value)}><option value="all">All four suits</option>{Object.keys(SUIT_COLORS).map(s=><option key={s} value={s}>{s}</option>)}</select></label>
    <div className="cs-roster-rows">{coverage.rows.filter(row=>suit==='all'||row.suit===suit).map(row=>{
      const key=row.suit as keyof typeof SUIT_COLORS;
      return <article key={row.id} className="cs-roster-row" style={{borderLeftColor:SUIT_COLORS[key]}}>
        <div><h3><span style={{color:SUIT_COLORS[key]}}>{SUIT_GLYPHS[key]}</span> {row.name}</h3><small>{row.suit} · {row.emotions[0]}</small></div>
        <div><h4>Dominant · {row.dominant.length}</h4>{row.dominant.length?row.dominant.map(f=><button type="button" key={f.id} onClick={()=>onOpen(f.id)}>F{String(f.number).padStart(2,'0')} · {f.name}<small>{f.emotions?.[0]} · {f.mixStatus}</small></button>):<p>No dominant family yet</p>}</div>
        <div><h4>Supporting · {row.supporting.length}</h4>{row.supporting.map(f=><button type="button" key={f.id} onClick={()=>onOpen(f.id)}>F{String(f.number).padStart(2,'0')} · {f.name}</button>)}</div>
      </article>;
    })}</div>
  </section>;
}
