import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {createBloomScene} from './BloomBlockout';
import {BLOOM_STUDY_POSTER} from './studyEdition';

type Scene=ReturnType<typeof createBloomScene>;
export function CreaturePopout({origin,onClose}:{origin:DOMRect;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null),stage=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
  const live=useRef<Scene|null>(null),pointer=useRef<{x:number;y:number;startX:number;startY:number}|null>(null);
  const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[part,setPart]=useState('');
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';dialog.current!.showModal();
    let disposed=false,animation:Animation|undefined;
    const loseContext=(event:Event)=>{event.preventDefault();setFailed(true);setReady(false);};
    const surface=canvas.current!;surface.addEventListener('webglcontextlost',loseContext);
    import('./BloomBlockout').then(({createBloomScene})=>{
      if(disposed)return;
      try{
        const scene=createBloomScene(surface,Math.min(900,Math.round(stage.current!.clientWidth*window.devicePixelRatio)));live.current=scene;
        const target=stage.current!.getBoundingClientRect();
        const from='translate('+(origin.x+origin.width/2-target.x-target.width/2)+'px,'+(origin.y+origin.height/2-target.y-target.height/2)+'px) scale('+(origin.width/target.width)+','+(origin.height/target.height)+')';
        animation=stage.current!.animate([{transform:from},{transform:'translate(0,0) scale(1)'}],{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:620,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'});
        animation.finished.then(()=>{if(!disposed)setReady(true);}).catch(()=>{});
      }catch{setFailed(true);}
    }).catch(()=>{if(!disposed)setFailed(true);});
    return ()=>{disposed=true;animation?.cancel();surface.removeEventListener('webglcontextlost',loseContext);live.current?.dispose();live.current=null;dialog.current?.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
  },[origin]);
  const rotate=(delta:number)=>{const s=live.current;if(!s||!ready)return;s.model.root.rotation.y+=delta;s.render();};
  const reset=()=>{const s=live.current;if(!s)return;s.model.root.rotation.set(0,0,0);s.render();setPart('');};
  return createPortal(<dialog ref={dialog} className="cs-theme cs-pop-dialog" aria-label="Bloom Mite 3D study" onCancel={e=>{e.preventDefault();e.stopPropagation();onClose();}} onClick={e=>{e.stopPropagation();if(e.target===dialog.current)onClose();}}>
    <header><span>Bloom Mite · form 2 · rough 3D study</span><button autoFocus type="button" onClick={onClose}>Return to card</button></header>
    <div className="cs-pop-stage" ref={stage}>
      <img src={BLOOM_STUDY_POSTER} alt="" className={failed?'':'cs-pop-fallback'}/>
      <canvas ref={canvas} hidden={failed} tabIndex={ready?0:-1} aria-label="3D Bloom figure. Drag or use left and right arrow keys to rotate. Home resets the card pose."
        onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();rotate(e.key==='ArrowLeft'?-.2:.2);}if(e.key==='Home'){e.preventDefault();reset();}}}
        onPointerDown={e=>{if(!ready)return;pointer.current={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}}
        onPointerMove={e=>{const p=pointer.current,s=live.current;if(!p||!s||!ready)return;s.model.root.rotation.y+=(e.clientX-p.x)*.009;s.model.root.rotation.x=Math.max(-.35,Math.min(.35,s.model.root.rotation.x+(e.clientY-p.y)*.006));p.x=e.clientX;p.y=e.clientY;s.render();}}
        onPointerUp={e=>{const p=pointer.current,s=live.current;pointer.current=null;if(!p||!s)return;if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)<5){const bounds=e.currentTarget.getBoundingClientRect(),x=e.clientX,y=e.clientY;import('three').then(({Raycaster,Vector2})=>{if(live.current!==s)return;const ray=new Raycaster();ray.setFromCamera(new Vector2((x-bounds.x)/bounds.width*2-1,1-(y-bounds.y)/bounds.height*2),s.camera);setPart(ray.intersectObjects(Object.values(s.model.meshes))[0]?.object.userData.partId??'');});}}}
        onPointerCancel={()=>{pointer.current=null;}} onLostPointerCapture={()=>{pointer.current=null;}}/>
    </div>
    <footer><p role="status">{failed?'3D is unavailable on this device. Your card image is still available.':ready?'Drag to rotate · same pose as the study card':'Preparing your figure…'}</p>
      {!failed&&<div><button type="button" disabled={!ready} onClick={()=>rotate(-.4)} aria-label="Rotate left">↶</button><button type="button" disabled={!ready} onClick={reset}>Reset card pose</button><button type="button" disabled={!ready} onClick={()=>rotate(.4)} aria-label="Rotate right">↷</button></div>}
      <small>{part?'Model part: '+part+'. ':''}Approximate blockout—not final creature artwork. Hidden sides are inferred.</small>
    </footer>
  </dialog>,document.body);
}
