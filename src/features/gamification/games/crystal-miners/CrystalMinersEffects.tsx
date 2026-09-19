import type { CSSProperties } from 'react';
import type { MinerHit } from '../../level-worlds/services/crystalMinersGame';

/** Small bounded vector bursts. No particle timers, images or per-frame DOM writes. */
export function MinerBlockImpact({hit}:{hit:MinerHit}) {
  const dust=['stone','brick','ore'].includes(hit.kind);
  const ice=hit.kind==='ice'||hit.kind==='crystal';
  const metal=hit.kind==='iron';
  const fire=hit.kind==='ember'||hit.kind==='tnt';
  const color=ice?'#baf8ff':metal?'#e7f8ff':fire?'#ffb253':hit.kind==='ticket'?'#fff0a7':hit.kind==='spawner'?'#bea6ff':'#c5b292';
  return <g className={`cm-block-impact cm-impact-${hit.kind}`} transform={`translate(${hit.x},${hit.y})`} aria-hidden="true">
    {hit.broken&&<circle className="cm-impact-ring" r={fire?48:24} fill="none" stroke={color} strokeWidth={fire?5:2}/>}
    {metal&&!hit.broken&&<><path className="cm-electric-flash" d="m-24-7 15 2-7 10 17-9-4 13 23-16-6 11 16-8" fill="none" stroke="#d0f4ff" strokeWidth="2.5"/><circle r="12" fill="#fff8ce" opacity=".6"/></>}
    {fire&&hit.broken&&<g className="cm-fire-bloom"><path d="M0 26C-50 2-26-30-12-44c-4 25 18 6 13-28C42-37 19-18 31-24 63 17 24 42 0 26Z" fill="#ff623a"/><path d="M0 21C-22 0-12-18-2-34 17-10 27 11 0 21Z" fill="#ffeba4"/></g>}
    {hit.kind==='balloon'&&hit.broken&&<><circle className="cm-balloon-pop" r="22" fill="#e78dd9"/><path className="cm-impact-ring" d="M-31-22-16-11M30-24 17-12M-31 23-17 12M30 24 17 12M0-37v17" stroke="#ffcbf7" strokeWidth="4"/></>}
    {hit.broken&&Array.from({length:dust?7:ice?9:6},(_,i)=>{
      const angle=i*Math.PI*2/(dust?7:ice?9:6);const dx=Math.cos(angle)*(25+i%3*12);const dy=Math.sin(angle)*31-12;
      return <g key={i} className="cm-fragment" style={{'--dx':`${dx}px`,'--dy':`${dy}px`,'--turn':`${i*73}deg`} as CSSProperties}>
        {dust?<circle r={5+i%3*3} fill={color} opacity=".45"/>:ice?<path d="m-5-8 10 4-3 13-6-5z" fill={color} stroke="white" strokeWidth=".7"/>:metal?<path d="M-2-7 2 7" stroke={color} strokeWidth="2"/>:<rect x="-3" y="-3" width="6" height="6" rx="1" fill={color}/>}
      </g>;
    })}
    {!hit.broken&&!metal&&<path className="cm-electric-flash" d="m-14 0 7-3 1-9 5 9 13 2-12 3-3 10-3-10z" fill={color}/>}
    {hit.broken&&['ticket','spawner','balloon','gift','boss'].includes(hit.kind)&&<text className="cm-special-label" y="-31" textAnchor="middle" fontSize="12" fontWeight="900" fill={color} stroke="#10262c" strokeWidth="4" paintOrder="stroke">{hit.kind==='ticket'?'+1 DROP TICKET':hit.kind==='spawner'?'BONUS PICK!':hit.kind==='balloon'?'POP! + GIFT':hit.kind==='boss'?'GUARDIAN DOWN!':'+ GIFT'}</text>}
  </g>;
}
