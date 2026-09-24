import React from 'react';
import { createRoot } from 'react-dom/client';
import { Island17AwakeningMission } from '../components/Island17AwakeningMission';
import { prepareTitanAwakeningPreview, titanPreviewSession } from '../services/island17AwakeningPreview';
function Preview(){
  const [open,setOpen]=React.useState(false),[ready,setReady]=React.useState(false);
  const close=React.useCallback(()=>setOpen(false),[]);
  React.useEffect(()=>{void prepareTitanAwakeningPreview().then(()=>{setReady(true);setOpen(true);});},[]);
  return <main style={{padding:24}}><h1>Titan’s Last Thought</h1><p>Local development preview · isolated saved progress · no player account.</p><button disabled={!ready} onClick={()=>setOpen(true)}>Open skull puzzle</button> <button disabled={!ready} onClick={()=>{setOpen(false);void prepareTitanAwakeningPreview(true).then(()=>setOpen(true));}}>Reset preview</button>{open&&<Island17AwakeningMission session={titanPreviewSession} client={null} onClose={close}/>}</main>;
}
if(import.meta.env.DEV) {
  const root=import.meta.hot?.data.root ?? createRoot(document.getElementById('root')!);
  if(import.meta.hot) import.meta.hot.data.root=root;
  root.render(<Preview/>);
}
