import React, {useState,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {listVisibleTechnologyFragments} from '../features/gamification/level-worlds/services/islandTechnologyFragmentPlacements';
import {WelcomePackModal} from '../features/gamification/level-worlds/components/WelcomePackModal';
import Island5ThreePilot from '../features/gamification/level-worlds/dev/Island5ThreePilot';
import '../features/gamification/level-worlds/dev/IslandTemplateKitPage.css';
import '../features/gamification/level-worlds/components/Island001Arrival.css';
function Review() {
  const [boardIsland,setBoardIsland]=useState<1|5>(1);
  const [collected,setCollected]=useState<number[]>([]);
  const [showWelcome,setShowWelcome]=useState(false),[welcomeComplete,setWelcomeComplete]=useState(false);
  const previewClaim=React.useCallback(async()=>true,[]);
  const recorder=useRef<MediaRecorder|null>(null);
  const [recordStatus,setRecordStatus]=useState('');
  const record=()=>{
    setDone(false);setSkip(false);setShowWelcome(false);setWelcomeComplete(false);setPreviewTime(undefined);setGeneration(x=>x+1);setRecordStatus('Recording…');
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
  return <><Island5ThreePilot key={`${generation}:${boardIsland}`} islandNumber={boardIsland} worldSourceNumber={boardIsland} visibleTechnologyFragments={listVisibleTechnologyFragments(boardIsland,collected)} trafficLightCharge={8} buildLevel={0} presentation="embedded" qualityOverride="low"
    firstArrivalWaitForWelcome={boardIsland===1 && previewTime===undefined} firstArrivalWelcomeComplete={welcomeComplete} onFirstArrivalWelcome={()=>setShowWelcome(true)}
    firstArrivalPreviewTime={previewTime} firstArrivalActive={boardIsland===1} firstArrivalSkip={skip} onFirstArrivalBeat={setBeat} onFirstArrivalComplete={()=>{setDone(true);if(recorder.current?.state==='recording')recorder.current.stop();}} interactionPaused={boardIsland===1&&!done}/>
    {showWelcome ? <WelcomePackModal open autoCollect deferCreaturePack onClaim={previewClaim} onClose={()=>{setShowWelcome(false);setWelcomeComplete(true);}} /> : null}
    <div className="arrival-caption" style={{visibility:showWelcome?'hidden':'visible'}}><div><div className="arrival-caption__brand">HABITGAME / FIRST LIGHT</div>
      <div className="arrival-review-chapters"><button onClick={()=>{setBoardIsland(boardIsland===1?5:1);setCollected([]);}}>Island {boardIsland===1?'005':'001'}</button>{boardIsland===5 ? <button onClick={()=>setCollected([0,1,2])}>Hide collected fragments</button>:null}{([['Travel',2],['Engines',4.2],['Wide',6.6],['Descent',9],['Ocean',13],['Unfold',17],['Cabin',19.8],['Launch',21.3],['Crew',23],['Settled',25.8],['Board',28]] as const).map(([label,t])=><button key={label} onClick={()=>{setDone(false);setPreviewTime(t);}}>{label}</button>)}</div><button className="arrival-record" onClick={record} disabled={recordStatus==='Recording…'}>{recordStatus || 'Record preview'}</button></div>
      <div className="arrival-caption__bottom"><div><small>{beat}</small><h1>{done ? 'Welcome to Island 001.' : 'A new world. A new beginning.'}</h1></div>
        <button onClick={()=>{if(done || previewTime !== undefined){setDone(false);setSkip(false);setShowWelcome(false);setWelcomeComplete(false);setPreviewTime(undefined);setGeneration(x=>x+1);}else setSkip(true);}}>{done || previewTime !== undefined?'Replay arrival':'Skip arrival'}</button>
      </div></div></>;
}
const reviewRoot = createRoot(document.getElementById('root')!);
reviewRoot.render(<Review/>);

if (import.meta.hot) {
  import.meta.hot.dispose(() => reviewRoot.unmount());
  import.meta.hot.accept(() => window.location.reload());
}
