import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import Island5ThreePilot from '../../src/features/gamification/level-worlds/dev/Island5ThreePilot';
function Review(){
 const [island]=useState(()=>Math.max(1,Math.min(20,Number(new URLSearchParams(location.search).get('island'))||1))),[token,setToken]=useState(0),[sequence,setSequence]=useState<number[]|null>(null);
 return <><header style={{padding:12,position:'relative',zIndex:20,background:'#071320'}}><h1>Pawn visibility review — no gameplay writes</h1>
 <label>Island <select aria-label="Review island" value={island} onChange={e=>{location.search=`?island=${e.target.value}`;}}>{Array.from({length:20},(_,i)=><option key={i} value={i+1}>{String(i+1).padStart(3,'0')}</option>)}</select></label>
 <button disabled={!!sequence} onClick={()=>setSequence(Array.from({length:36},(_,i)=>(token+i+1)%36))}>Review full lap</button>
 <output>Island {island} · tile {token} · {sequence?'moving':'ready'}</output></header>
 <div style={{height:'80vh'}}><Island5ThreePilot key={island} islandNumber={island} buildLevel={3} presentation="embedded" qualityOverride="low" tokenIndex={token} pendingHopSequence={sequence} isRolling={!!sequence} movementSpeedFactor={0.5} onTokenHop={setToken} onHopSequenceComplete={()=>setSequence(null)}/></div></>;
}
createRoot(document.getElementById('root')!).render(<Review/>);
