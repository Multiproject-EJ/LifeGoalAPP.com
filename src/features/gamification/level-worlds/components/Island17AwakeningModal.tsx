import React from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TitanMechanismWorkbench } from './TitanMechanismWorkbench';
import { TitanConstellationWorkbench, TitanPotionWorkbench } from './TitanDiscoveryWorkbenches';
import { lockPageScroll } from '../../../../utils/scrollLock';
import { createTitanAwakeningThree } from '../dev/Island17AwakeningThree';
import { TITAN_PHASES, type TitanAwakening, type TitanPuzzleInput } from '../services/island17Awakening';
import './Island17AwakeningModal.css';

function TitanInspection({ progress, replay, onInspect }: { progress: TitanAwakening; replay: number; onInspect: () => void }) {
  const host = React.useRef<HTMLDivElement>(null);
  const latest = React.useRef({progress,replay,onInspect}); latest.current={progress,replay,onInspect};
  const [failed,setFailed]=React.useState(false);
  React.useEffect(()=> {
    if(!host.current) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:true}); } catch {setFailed(true);return;}
    const element=host.current;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5)); renderer.setClearColor(0x07171d,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping;
    element.appendChild(renderer.domElement); renderer.domElement.setAttribute('aria-label','Interactive Titan skull mechanism');
    const scene=new THREE.Scene(); const camera=new THREE.PerspectiveCamera(39,1,.1,40);
    camera.position.set(0,1.2,6.6); camera.lookAt(0,-.2,0);
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.target.set(0,-.2,0); orbit.enablePan=false; orbit.minDistance=4; orbit.maxDistance=9; orbit.enableDamping=false; orbit.update();
    scene.add(new THREE.HemisphereLight(0xbdfcf3,0x665330,2.5));
    const key=new THREE.DirectionalLight(0xffe8ba,3);key.position.set(-3,5,5);scene.add(key);
    const rim=new THREE.DirectionalLight(0x43e9d3,2);rim.position.set(3,2,-2);scene.add(rim);
    const visual=createTitanAwakeningThree();scene.add(visual.root);
    visual.update(latest.current.progress,latest.current.replay);
    const head=visual.root.getObjectByName('TITAN_SUMMONED_HEAD')!;
    const hitMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
    const targets=[[-.48,.06,.85],[.48,.06,.85],[0,-.7,.9]].map(([x,y,z])=>{
      const target=new THREE.Mesh(new THREE.SphereGeometry(.32,12,8),hitMaterial);
      target.position.set(x,y,z);head.add(target);return target;
    });
    const ray=new THREE.Raycaster();let down: {x:number;y:number;id:number}|null=null;
    const pointerDown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY,id:e.pointerId};};
    const pointerUp=(e:PointerEvent)=>{
      if(!down || e.pointerId!==down.id || Math.hypot(e.clientX-down.x,e.clientY-down.y)>7){down=null;return;}
      down=null;
      if(latest.current.progress.phase===0 || latest.current.progress.phase===4){latest.current.onInspect();return;}
      if(latest.current.progress.phase<2 || latest.current.progress.phase>3)return;
      const rect=renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);
      // Front-facing only: don't select an eye through the back of the skull.
      if(camera.position.z>1 && ray.intersectObjects(targets).length)latest.current.onInspect();
    };
    const pointerCancel=()=>{down=null;};
    renderer.domElement.addEventListener('pointerdown',pointerDown);
    renderer.domElement.addEventListener('pointerup',pointerUp);
    renderer.domElement.addEventListener('pointercancel',pointerCancel);
    const resize=()=>{ const w=element.clientWidth,h=element.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};
    const observer=new ResizeObserver(resize);observer.observe(element);resize();
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf=0, start=performance.now();
    const frame=(now:number)=>{visual.update(latest.current.progress,latest.current.replay);visual.animate((now-start)/1000,media.matches);renderer.render(scene,camera);renderer.domElement.dataset.phase=String(latest.current.progress.phase);renderer.domElement.dataset.assetState=String(visual.root.userData.assetState);raf=requestAnimationFrame(frame);};
    raf=requestAnimationFrame(frame);
    return()=>{cancelAnimationFrame(raf);observer.disconnect();orbit.dispose();renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('pointercancel',pointerCancel);hitMaterial.dispose();visual.dispose();renderer.dispose();renderer.domElement.remove();};
  },[]);
  return <div ref={host} className="titan-puzzle__scene">{failed&&<p>3D preview is unavailable on this device. The mechanisms below still work.</p>}</div>;
}
const clues=[
  'The bottles do not explain themselves. The old stone bowl might.',
  'The mixture is alive. Tip the bowl and let it find what sleeps beneath the island.',
  'Turn the skull to look around. Tap its brass eyes to examine the mechanisms inside.',
  'The jaw has opened. Look inside: a glowing channel runs into three loose teeth.',
  'The crown has opened around a two-sided star disk. Examine it before turning anything.',
  'That was no treasure chest. Someone has been waiting inside. Touch the light to set them free.',
  'The last thought has become a living spirit. Its sanctuary will remain on your island.',
];
const hints=['Brush the three marks on the bowl rim. Their order matches the bottle seals.','Drag the pour handle to the right, or use the Pour button.','Follow each eye beam to a sun-shaped receiver, then pull the jaw.','Make one unbroken glowing path from the inlet to the outlet.','The missing guide is scratched into the back of the disk.','Release the spirit.','Replay is visual only.'];
export function Island17AwakeningModal({ progress, busy, feedback, onInput, onClose }: {
  progress: TitanAwakening; busy: boolean; feedback: string;
  onInput: (input: TitanPuzzleInput)=>void; onClose:()=>void;
}) {
  const dialog=React.useRef<HTMLElement>(null), title=React.useId();
  const [hint,setHint]=React.useState(false), [replay,setReplay]=React.useState(0), [pour,setPour]=React.useState(0);
  const [cinematic,setCinematic]=React.useState(false);
  const [inspecting,setInspecting]=React.useState(false);
  const previousPhase=React.useRef(progress.phase);
  React.useEffect(()=>{
    if(progress.phase!==previousPhase.current){
      setHint(false);
      setInspecting(progress.phase===3);
      if(progress.phase===2 || progress.phase===6) setCinematic(true);
      previousPhase.current=progress.phase;
    }
  },[progress.phase]);
  React.useEffect(()=>{if(!cinematic)return;const timer=window.setTimeout(()=>setCinematic(false),window.matchMedia('(prefers-reduced-motion: reduce)').matches?300:4800);return()=>clearTimeout(timer);},[cinematic,replay]);
  React.useEffect(()=>{
    const before=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const unlock=lockPageScroll(); dialog.current?.focus();
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape')onClose();
      if(event.key!=='Tab')return;
      const items=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]')??[]);
      const first=items[0],last=items[items.length-1];
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===dialog.current)){event.preventDefault();first?.focus();}
    };document.addEventListener('keydown',key);
    return()=>{unlock();document.removeEventListener('keydown',key);before?.focus();};
  },[onClose]);
  const phase=progress.phase;
  return createPortal(<div className="titan-puzzle-overlay"><section className="titan-puzzle" ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={title}>
    <header><small>TITAN’S REST · THE LAST THOUGHT</small><button aria-label="Close skull puzzle" onClick={onClose}>×</button></header>
    <h2 id={title}>{cinematic ? phase===6?'Finally, free.':'Something is rising…' : TITAN_PHASES[phase]}</h2>
    <div className="titan-puzzle__steps" aria-label={`Awakening step ${Math.min(phase+1,6)} of 6`}>{['Brew','Summon','Eyes','Jaw','Thought','Release'].map((label,i)=><span key={label} className={phase>i?'done':phase===i?'active':''}>{label}</span>)}</div>
    {inspecting && !cinematic && phase===0
      ? <TitanPotionWorkbench progress={progress} busy={busy} onInput={onInput} onBack={()=>setInspecting(false)}/>
      : inspecting && !cinematic && (phase===2 || phase===3)
      ? <TitanMechanismWorkbench key={phase} progress={progress} busy={busy} onInput={onInput} onBack={()=>setInspecting(false)}/>
      : inspecting && !cinematic && phase===4
      ? <TitanConstellationWorkbench progress={progress} busy={busy} onInput={onInput} onBack={()=>setInspecting(false)}/>
      : <><TitanInspection progress={progress} replay={replay} onInspect={()=>{if(!cinematic)setInspecting(true);}}/>
        {phase>=2 && <p className="titan-puzzle__orbit-help">Drag the skull to turn it · pinch to look closer</p>}
        {phase===0 && !cinematic && <button className="titan-puzzle__inspect" onClick={()=>setInspecting(true)}>Inspect the stone bowl</button>}
        {(phase===2 || phase===3) && !cinematic && <button className="titan-puzzle__inspect" onClick={()=>setInspecting(true)}>{phase===2?'Examine the brass eyes':'Look inside the open jaw'}</button>}</>}
        {phase===4 && !cinematic && !inspecting && <button className="titan-puzzle__inspect" onClick={()=>setInspecting(true)}>Examine the crown disk</button>}
    <div className="titan-puzzle__controls">
      {!inspecting && <p>{clues[phase]}</p>}
      {cinematic ? <button onClick={()=>setCinematic(false)}>Continue</button> : <>
      {phase===1&&<><label>Tip the bowl <input aria-label="Tip the summoning bowl" type="range" min="0" max="100" value={pour} disabled={busy} onChange={e=>setPour(Number(e.target.value))} onPointerUp={()=>{if(pour>=85)onInput({kind:'pour'});else setPour(0);}} onKeyUp={e=>{if(pour>=85&&['ArrowRight','End'].includes(e.key))onInput({kind:'pour'});}}/></label><button className="titan-puzzle__primary" disabled={busy} onClick={()=>onInput({kind:'pour'})}>Pour into the well</button></>}
      {phase===5&&<button className="titan-puzzle__primary" disabled={busy} onClick={()=>onInput({kind:'release'})}>Touch the light · release the spirit</button>}
      {phase===6&&<><button className="titan-puzzle__primary" onClick={onClose}>Return to your island</button><button onClick={()=>{setReplay(v=>v+1);setCinematic(true);}}>Replay the awakening</button></>}
      </>}
      <div className="titan-puzzle__feedback" role="status">{busy?'Saving…':feedback}</div>
      {!cinematic&&phase<6&&<button className="titan-puzzle__hint" onClick={()=>setHint(v=>!v)}>{hint?'Hide hint':'A little hint'}</button>}
      {hint&&<p className="titan-puzzle__hint-text">{hints[phase]}</p>}
      <footer>Progress saves as you tinker. Leave and return any time.</footer>
    </div>
  </section></div>,document.body);
}
