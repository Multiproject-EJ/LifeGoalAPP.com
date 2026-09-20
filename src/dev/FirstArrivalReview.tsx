import React, {useState,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import Island5ThreePilot from '../features/gamification/level-worlds/dev/Island5ThreePilot';
import '../features/gamification/level-worlds/dev/IslandTemplateKitPage.css';
import '../features/gamification/level-worlds/components/Island001Arrival.css';
function Review() {
  const recorder=useRef<MediaRecorder|null>(null);
  const [recordStatus,setRecordStatus]=useState('');
  const record=()=>{
    setDone(false);setSkip(false);setPreviewTime(undefined);setGeneration(x=>x+1);setRecordStatus('Recording…');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const canvas=document.querySelector('canvas')!;
      const stream=canvas.captureStream(30);
      const type=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
      const r=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:6000000});recorder.current=r;
      const chunks:BlobPart[]=[];r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      r.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());const result=await fetch('/__arrival-capture',{method:'POST',body:new Blob(chunks,{type})});setRecordStatus(result.ok?'Recording saved':'Save failed');};r.start();
    }));
  };
  const [previewTime,setPreviewTime]=useState<number|undefined>();
  const [generation,setGeneration]=useState(0),[beat,setBeat]=useState('FAST TRAVEL'),[done,setDone]=useState(false),[skip,setSkip]=useState(false);
  return <><Island5ThreePilot key={generation} islandNumber={1} worldSourceNumber={1} buildLevel={0} presentation="embedded" qualityOverride="low"
    firstArrivalPreviewTime={previewTime} firstArrivalActive firstArrivalSkip={skip} onFirstArrivalBeat={setBeat} onFirstArrivalComplete={()=>{setDone(true);if(recorder.current?.state==='recording')recorder.current.stop();}} interactionPaused={!done}/>
    <div className="arrival-caption"><div><div className="arrival-caption__brand">HABITGAME / FIRST LIGHT</div>
      <div className="arrival-review-chapters">{([['Travel',2],['Descent',9],['Ocean',13],['Unfold',18],['Crew',23],['Board',28]] as const).map(([label,t])=><button key={label} onClick={()=>setPreviewTime(t)}>{label}</button>)}</div><button className="arrival-record" onClick={record} disabled={recordStatus==='Recording…'}>{recordStatus || 'Record preview'}</button></div>
      <div className="arrival-caption__bottom"><div><small>{beat}</small><h1>{done ? 'Welcome to Island 001.' : 'A new world. A new beginning.'}</h1></div>
        <button onClick={()=>{if(done || previewTime !== undefined){setDone(false);setSkip(false);setPreviewTime(undefined);setGeneration(x=>x+1);}else setSkip(true);}}>{done || previewTime !== undefined?'Replay arrival':'Skip arrival'}</button>
      </div></div></>;
}
createRoot(document.getElementById('root')!).render(<Review/>);

if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
