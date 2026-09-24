import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react';
import type { ControllerSnapshot } from './renderer';
import { controllerSwipe, resolveControllerTheme } from './policy.js';
import './LivingController.css';

type Action = 'shop' | 'build' | 'creatures' | 'concord' | 'roll';
export interface LivingControllerProps {
 dark:boolean; dev:boolean; dice:number; multiplier:number; maximum:number; cost:number;
 creatureRewardReady?:boolean; rolling:boolean; autoRolling:boolean; jackpot:boolean; buildReady:boolean; tutorial:boolean;
 blocked:boolean; rollDisabled:boolean; multiplierDisabled:boolean; multiplierMaxJumping?:boolean; canHold:boolean;
 rollTitle:string; regenLabel:string; concordLabel:string; concordTitle?:string; rollHint?:string;
 onRoll:()=>void; onHoldStart:()=>void; onHoldEnd:()=>void; onHoldCancel?:()=>void; onStopAuto:()=>void;
 onMultiplier:()=>void; onShop:()=>void; onBuild:()=>void; onCreatures:()=>void; onConcord:()=>void;
 fallback:ReactNode;
}
export function LivingController(p:LivingControllerProps){
 const [failed,setFailed]=useState(false),[ready,setReady]=useState(false),[collapsed,setCollapsed]=useState(false),[selection,setSelection]=useState('auto');
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [label,setLabel]=useState('');
 const host=useRef<HTMLDivElement>(null),controls=useRef<Record<string,HTMLButtonElement>>({});
 const gesture=useRef<{id:number;x:number;y:number;drag:boolean}|null>(null),suppress=useRef(false),keyboardHeld=useRef(false);
 const snapshot=useRef<ControllerSnapshot>(null!);const callbacks=useRef(p);callbacks.current=p;
 const isCollapsed=collapsed&&!p.tutorial;
 snapshot.current={theme:resolveControllerTheme(p.dark,p.dev,selection),reduced,hidden:isCollapsed,dice:p.dice,multiplier:p.multiplier,maximum:p.maximum,rolling:p.rolling,autoRolling:p.autoRolling,jackpot:p.jackpot,buildReady:p.buildReady,rollTitle:p.rollTitle,regenLabel:p.regenLabel,concordTitle:p.concordTitle??'Story',multiplierMaxJumping:!!p.multiplierMaxJumping};
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReduced(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 useEffect(()=>{if(!host.current)return;let cancelled=false,dispose:(()=>void)|undefined;
   import('./renderer.js').then(({mountLivingController})=>{if(cancelled||!host.current)return;dispose=mountLivingController(host.current,controls.current,()=>snapshot.current,()=>setReady(true),()=>setFailed(true));}).catch(()=>{if(!cancelled)setFailed(true);});
   return()=>{cancelled=true;dispose?.();callbacks.current.onStopAuto();};
 },[]);
 useEffect(()=>{const stop=()=>callbacks.current.onStopAuto();const visibility=()=>{if(document.hidden)stop();};window.addEventListener('blur',stop);document.addEventListener('visibilitychange',visibility);return()=>{window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',visibility);};},[]);
 useEffect(()=>{const release=()=>callbacks.current.onHoldEnd();const cancel=()=>{callbacks.current.onHoldCancel?.();callbacks.current.onStopAuto();};window.addEventListener('pointerup',release);window.addEventListener('pointercancel',cancel);return()=>{window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',cancel);};},[]);
 if(failed)return <>{p.fallback}</>;
 const finishGesture=(e:PointerEvent<HTMLDivElement>,cancel=false)=>{
   const g=gesture.current;if(!g||e.pointerId!==g.id)return;gesture.current=null;
   if(g.drag||cancel){suppress.current=true;p.onHoldCancel?.();p.onStopAuto();}
   if(!cancel&&!p.tutorial){const action=controllerSwipe(e.clientX-g.x,e.clientY-g.y,isCollapsed);if(action){suppress.current=true;p.onStopAuto();setCollapsed(action==='hide');}}
 };
 const actions:Record<Action,()=>void>={shop:p.onShop,build:p.onBuild,creatures:p.onCreatures,concord:p.onConcord,roll:p.onRoll};
 const labels:Record<Action,string>={shop:'Shop',build:p.buildReady?'Build — next step affordable':'Build',creatures:'Creatures',concord:p.concordLabel,roll:`${p.rollTitle} · ${Math.floor(p.dice/Math.max(1,p.cost))} rolls left`};
 return <div className={`living-controller-dock${isCollapsed?' is-collapsed':''}`} data-theme={snapshot.current.theme}>
   {p.dev&&!isCollapsed&&<select className="living-controller-themes" aria-label="Dev controller theme" value={selection} onChange={e=>setSelection(e.target.value)}>
     <option value="auto">Controller: app day/dark</option><option value="light">Default Light (dev)</option><option value="christmas">Christmas (dev)</option><option value="snow">Snow & Gold (dev)</option><option value="classic">Classic Christmas (dev)</option><option value="gold">Gold (dev)</option><option value="wood">Satin Teak (dev)</option>
   </select>}
   <div className={`living-controller${ready?' is-ready':''}`} aria-label={isCollapsed?'Controller hidden — swipe up or press Enter to restore':'Game controller — swipe down to hide'} tabIndex={0}
     onKeyDown={e=>{if(e.target!==e.currentTarget)return;if((isCollapsed&&(e.key==='Enter'||e.key==='ArrowUp'))||(!isCollapsed&&e.key==='ArrowDown'&&!p.tutorial)){e.preventDefault();p.onStopAuto();setCollapsed(!isCollapsed);}}}
     onPointerDownCapture={e=>{if(!e.isPrimary||e.button!==0)return;suppress.current=false;gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,drag:false};}}
     onPointerMoveCapture={e=>{const g=gesture.current;if(!g||g.id!==e.pointerId)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(Math.hypot(dx,dy)>12){g.drag=true;p.onHoldCancel?.();p.onStopAuto();e.currentTarget.setPointerCapture(e.pointerId);}}}
     onPointerUpCapture={e=>finishGesture(e)} onPointerCancel={e=>finishGesture(e,true)}
     onClickCapture={e=>{if(suppress.current&&e.detail!==0){e.preventDefault();e.stopPropagation();return;}if(isCollapsed){e.preventDefault();e.stopPropagation();setCollapsed(false);}}}>
     <div className="living-controller-canvas" ref={host} aria-hidden="true" />
     {!isCollapsed&&<span className="living-controller-label" aria-hidden="true">{label}</span>}
     {(['shop','build','roll','creatures','concord'] as Action[]).map(id=><button key={id} ref={el=>{if(el)controls.current[id]=el;}} type="button" className={`living-controller-hit living-controller-hit--${id}`} aria-label={labels[id]} title={id==='roll'?p.rollHint:labels[id]} tabIndex={isCollapsed?-1:0}
       disabled={isCollapsed||(id==='build'?false:p.blocked)||(id==='roll'&&p.rollDisabled&&!p.autoRolling)}
       onFocus={()=>setLabel(id==='roll'?'':id==='concord'?(p.concordTitle??'Story'):labels[id])} onBlur={()=>{setLabel('');if(id==='roll'){keyboardHeld.current=false;p.onHoldCancel?.();}}}
       onPointerEnter={()=>setLabel(id==='roll'?'':id==='concord'?(p.concordTitle??'Story'):labels[id])} onPointerLeave={()=>{setLabel('');if(id==='roll')p.onHoldCancel?.();}}
       onPointerDown={e=>{if(id==='roll'&&e.button===0&&p.canHold)p.onHoldStart();}} onPointerUp={()=>{if(id==='roll')p.onHoldEnd();}} onPointerCancel={()=>{if(id==='roll')p.onHoldCancel?.();}}
       onKeyDown={e=>{if(id==='roll'&&(e.key===' '||e.key==='Enter')){e.preventDefault();if(!e.repeat){keyboardHeld.current=true;if(p.canHold)p.onHoldStart();}}}}
       onKeyUp={e=>{if(id==='roll'&&(e.key===' '||e.key==='Enter')){e.preventDefault();if(keyboardHeld.current){keyboardHeld.current=false;p.onHoldEnd();p.onRoll();}}}}
       onClick={()=>{if(id!=='roll')p.onStopAuto();actions[id]();}}><span>{labels[id]}</span>{id==='creatures'&&p.creatureRewardReady&&<i className="living-controller-ready-dot" aria-label="Creature reward ready" />}</button>)}
     <button ref={el=>{if(el)controls.current.multiplier=el;}} className="living-controller-multiplier" type="button" tabIndex={isCollapsed?-1:0} disabled={isCollapsed||p.blocked||p.multiplierDisabled}
       aria-label={`Multiplier ×${p.multiplier}. Costs ${p.cost} dice per roll. Maximum ×${p.maximum}. Change multiplier.`}
       onClick={()=>{p.onStopAuto();p.onMultiplier();}}>
       <small>{p.multiplier===p.maximum&&p.maximum>1?'MAX POWER':'ROLL POWER'}</small><strong>×{p.multiplier}</strong><span className="living-controller-meter" aria-hidden="true"><i style={{width:`${Math.min(100,p.multiplier/Math.max(1,p.maximum)*100)}%`}} /></span>
     </button>
   </div>
 </div>;
}
