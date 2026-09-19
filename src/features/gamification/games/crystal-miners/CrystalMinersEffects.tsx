import type { CSSProperties } from 'react';
import type { MinerHit } from '../../level-worlds/services/crystalMinersGame';

/** Small bounded vector bursts. No particle timers, images or per-frame DOM writes. */
export function MinerBlockImpact({hit,level=1}:{hit:MinerHit;level?:number}) {
  const dust=hit.kind==='stone';const brick=hit.kind==='brick',ore=hit.kind==='ore',obsidian=hit.kind==='obsidian',crystal=hit.kind==='crystal';
  const ice=hit.kind==='ice'||hit.kind==='crystal'||hit.kind==='obsidian';
  const metal=hit.kind==='iron';
  const fire=hit.kind==='ember'||hit.kind==='tnt';
  const color=hit.kind==='charger'?'#a4ffff':hit.kind==='key'?'#ffe199':hit.kind==='gate'?'#c9b4ff':hit.kind==='ore'?'#ffd677':hit.kind==='crystal'?'#8fffd8':hit.kind==='obsidian'?'#d3a6ff':ice?'#baf8ff':metal?'#e7f8ff':fire?'#ffb253':hit.kind==='ticket'?'#fff0a7':hit.kind==='spawner'?'#bea6ff':'#c5b292';
  return <g className={`cm-block-impact cm-impact-${hit.kind}`} transform={`translate(${hit.x},${hit.y})`} aria-hidden="true">
    {hit.broken&&<circle className="cm-impact-ring" r={fire?48:24} fill="none" stroke={color} strokeWidth={fire?5:2}/>}
    {metal&&!hit.broken&&<><path className="cm-electric-flash" d="m-24-7 15 2-7 10 17-9-4 13 23-16-6 11 16-8" fill="none" stroke="#d0f4ff" strokeWidth="2.5"/><circle className="cm-electric-flash" r="12" fill="#fff8ce" opacity=".6"/></>}
    {fire&&hit.broken&&<g className={hit.kind==='ember'?'cm-ember-dissolve':'cm-fire-bloom'}><path d="M0 26C-50 2-26-30-12-44c-4 25 18 6 13-28C42-37 19-18 31-24 63 17 24 42 0 26Z" fill="#ff623a"/><path d="M0 21C-22 0-12-18-2-34 17-10 27 11 0 21Z" fill="#ffeba4"/></g>}
    {hit.kind==='balloon'&&hit.broken&&<><circle className="cm-balloon-pop" r="22" fill="#e78dd9"/><path className="cm-impact-ring" d="M-31-22-16-11M30-24 17-12M-31 23-17 12M30 24 17 12M0-37v17" stroke="#ffcbf7" strokeWidth="4"/></>}
    {hit.kind==='deflector'&&hit.broken&&<path className="cm-route-flash" d={hit.blockId%5===4?'M25-15Q-18-15-30 18m0 0 2-15m-2 15 15-3':'M-25-15Q18-15 30 18m0 0-2-15m2 15-15-3'} fill="none" stroke="#d0caff" strokeWidth="5"/>}
    {hit.kind==='charger'&&hit.broken&&<g className="cm-energy-rise"><path d="m7-30-25 30H0L-9 30 22-9H3z" fill="#c9ffff"/><ellipse rx="27" ry="10" fill="none" stroke="#62f4ff" strokeWidth="3"/></g>}
    {hit.kind==='spawner'&&hit.broken&&<g className="cm-portal-bloom"><ellipse rx="26" ry="14" fill="#663baa99" stroke="#d7b8ff" strokeWidth="4"/><path d="m-4 16 8-31M-14-7Q3-28 18-9" stroke="#f6e4ff" strokeWidth="5" fill="none"/></g>}
    {hit.kind==='gift'&&hit.broken&&<g className="cm-reward-rise"><rect x="-13" y="-13" width="26" height="22" rx="2" fill="#bb82d4" stroke="#ffda8f" strokeWidth="2"/><path d="M0-13V9m-13-11h26M0-13Q-23-29-11-28L0-13Q23-29 11-28Z" fill="none" stroke="#ffda8f" strokeWidth="4"/></g>}
    {hit.kind==='ticket'&&hit.broken&&<g className="cm-reward-rise"><path d="M-22-10H22V-3Q12 2 22 7V14H-22V7Q-12 2-22-3Z" fill="#ffe5a0" stroke="#fff8db" strokeWidth="2"/><text y="8" textAnchor="middle" fill="#694626" fontSize="14" fontWeight="900">+1</text></g>}
    {hit.kind==='key'&&hit.broken&&<g className="cm-key-release" stroke="#ffe399" strokeWidth="4" fill="none"><circle cy="-12" r="8"/><path d="M0-4v25m0-8h10m-10 8h7M-15 0Q-42-24-55 4M15 0Q42-24 55 4"/></g>}
    {hit.kind==='gate'&&hit.broken&&[-1,1].map(side=><path key={side} className="cm-gate-half" style={{'--dx':side*40+'px'} as CSSProperties} d={'M'+side*7+'-19v42m'+side*10+'-38h'+side*13+'v34H'+side*10} stroke="#cfbaff" strokeWidth="5" fill="none"/>)}
    {hit.broken&&Array.from({length:dust?7:obsidian?4:brick?5:ice?9:6},(_,i)=>{
      const angle=i*Math.PI*2/(dust?7:obsidian?4:brick?5:ice?9:6);const dx=Math.cos(angle)*(25+i%3*12);const dy=Math.sin(angle)*31-12;
      return <g key={i} className={'cm-fragment'+(brick||metal||obsidian?' cm-heavy-fragment':'')+(ore?' cm-nugget-fragment':'')+(hit.kind==='ember'?' cm-ash-fragment':'')} style={{'--dx':`${dx}px`,'--dy':`${dy}px`,'--turn':`${i*73}deg`} as CSSProperties}>
        {dust?<circle r={5+i%3*3} fill={color} opacity=".45"/>:brick?<path d="m-7-4 12-2 3 9-13 3z" fill={i%2?'#bc8b66':'#846653'}/>:ore?<path d="m-5-2 6-4 5 5-3 7-7-2z" fill="#efb952" stroke="#ffe9a6"/>:obsidian?<path d="m-8-14 14 5 2 16-9 7-8-13z" fill="#362348" stroke="#bda0df" strokeWidth="1.5"/>:crystal?<path d="m0-9 6 5-2 12-8-2-2-10z" fill={color} stroke="#e1fff3"/>:ice?<path d="m-5-8 10 4-3 13-6-5z" fill={color} stroke="white" strokeWidth=".7"/>:metal?<rect x="-4" y="-3" width="8" height="6" fill="#81939f" stroke="#eaffff"/>:<rect x="-3" y="-3" width="6" height="6" rx="1" fill={hit.kind==='boss'?(level>=30?'#ff976f':'#9cae9c'):color}/>}
      </g>;
    })}
    {!hit.broken&&!metal&&<path className="cm-electric-flash" d="m-14 0 7-3 1-9 5 9 13 2-12 3-3 10-3-10z" fill={color}/>}
    {hit.broken&&['ticket','spawner','balloon','gift','boss','charger','key','gate'].includes(hit.kind)&&<text className="cm-special-label" y="-31" textAnchor="middle" fontSize="12" fontWeight="900" fill={color} stroke="#10262c" strokeWidth="4" paintOrder="stroke">{hit.kind==='charger'?'RECHARGED!':hit.kind==='key'?'GATES UNLOCKED!':hit.kind==='gate'?'PATH OPEN!':hit.kind==='ticket'?'+1 DROP TICKET':hit.kind==='spawner'?'BONUS PICK!':hit.kind==='balloon'?'POP! + GIFT':hit.kind==='boss'?'GUARDIAN DOWN!':'+ GIFT'}</text>}
  </g>;
}
