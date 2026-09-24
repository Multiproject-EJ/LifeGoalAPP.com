import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LivingController} from '../../src/features/gamification/level-worlds/components/living-controller/LivingController';
import {ControllerThemeShop} from '../../src/features/gamification/level-worlds/components/living-controller/ControllerThemeShop';
import {IslandRunSolarMapOverlay} from '../../src/features/gamification/level-worlds/components/IslandRunSolarMapOverlay';
function Check(){
 const [map,setMap]=useState(false),[message,setMessage]=useState('Ready'),[mult,setMult]=useState(1);
 const [island,setIsland]=useState(1);
 const [preferred,setPreferred]=useState('ice'),[vault,setVault]=useState(false);
 const [shop,setShop]=useState(false);
 return <main style={{maxWidth:390,margin:'auto',fontFamily:'system-ui'}}>
  <h1>Release component check</h1><p>No gameplay or purchases.</p>
  <button onClick={()=>setMap(true)}>Open Island Map</button>
  <button onClick={()=>{setMessage('Arrival requested');setIsland(n=>n+1);}}>Preview island arrival</button>
  <p>Preview island {island}</p>
  <label>Controller default <select value={preferred} onChange={e=>setPreferred(e.target.value)}><option value="ice">Default Day</option><option value="dark">Default Dark</option></select></label>
  <button onClick={()=>setVault(v=>!v)}>{vault?'Leave Vault':'Enter Vault'}</button>
  <LivingController dark={false} dev={false} dice={24} multiplier={mult} maximum={10} cost={mult}
    key={vault?'vault':'island'} islandNumber={island} preferredTheme={preferred} surface={vault?'treasure':'island'}
    arrivalKey={String(island)} onArrivalImpact={()=>setMessage('Landing impact')}
    rolling={false} autoRolling={false} jackpot={false} buildReady={true} tutorial={false}
    blocked={map} rollDisabled={false} multiplierDisabled={false} canHold={false}
    rollTitle="ROLL" regenLabel="" concordLabel="Story" concordTitle="Story"
    onRoll={()=>setMessage('Roll callback')} onHoldStart={()=>{}} onHoldEnd={()=>{}}
    onHoldCancel={()=>{}} onStopAuto={()=>{}} onMultiplier={()=>setMult(mult===10?1:10)}
    onShop={()=>setShop(true)} onBuild={()=>setMessage('Build callback')}
    onCreatures={()=>setMessage('Creatures callback')} onConcord={()=>setMessage('Story callback')}
    fallback={<p>WebGL fallback</p>}/>
  <p role="status">{message}</p>
  {shop&&<ControllerThemeShop initialTheme="gold" onClose={()=>setShop(false)} onChooseDefault={theme=>{setPreferred(theme);setShop(false);}}/>}
  {map&&<IslandRunSolarMapOverlay currentIslandNumber={17} completedIslandNumbers={[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]} onClose={()=>setMap(false)}/>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<Check/>);
