import { useEffect, useState } from 'react';
import { useIslandRunState } from '../../level-worlds/hooks/useIslandRunState';
import { CRYSTAL_PREVIEW_SESSION, crystalPreviewBridge, prepareCrystalMinersPreview } from '../../level-worlds/services/crystalMinersPreviewService';
import CrystalMinersMinigame from './CrystalMinersMinigame';
import './crystalMiners.css';
export default function CrystalMinersPreview() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('device') === 'phone') {
    params.delete('device');
    return <main style={{minHeight:'100vh',background:'#061821',padding:20,display:'grid',placeItems:'center'}}><iframe title="Crystal Miners phone preview" src={`/dev/crystal-miners?${params}`} style={{width:390,maxWidth:'100%',height:844,border:'1px solid #55766e',borderRadius:24}}/></main>;
  }
  return <CrystalMinersPlayablePreview/>;
}
function CrystalMinersPlayablePreview() {
  const [open,setOpen]=useState(true);
  const [ready,setReady]=useState(false);
  const {state}=useIslandRunState(CRYSTAL_PREVIEW_SESSION,null);
  useEffect(()=>{void prepareCrystalMinersPreview().then(()=>setReady(true));},[]);
  if (!ready) return <div className="cm-preview-hub">Opening the mine…</div>;
  return <>
    <main className="cm-preview-hub"><div><p>HABITGAME · LOCAL PLAYTEST</p><h1>Crystal Miners</h1><p>Merge tools, mine the depths and recover treasure. This review uses the same saved-state and reward services as the Event Arena.</p><p>{crystalPreviewBridge.getTickets()} tickets · {crystalPreviewBridge.getProgress().ore} ore · {state.rewardBarProgress} event reward progress · {state.dicePool} dice · {state.essence} Essence</p><button onClick={()=>setOpen(true)}>Enter the mine</button><button onClick={()=>void prepareCrystalMinersPreview(true)}>Refill playtest tickets</button><small>Local preview account only. Your real HabitGame account is untouched. Reload to verify your mine is saved.</small></div></main>
    {open && <CrystalMinersMinigame islandNumber={1} launchConfig={{bridge:crystalPreviewBridge}} onComplete={()=>setOpen(false)}/>}
  </>;
}
