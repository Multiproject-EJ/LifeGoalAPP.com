import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {ControllerSnapshot} from './renderer';
import './ControllerThemeShop.css';
import {useControllerShopScrollLock} from './useControllerShopScrollLock';
export const CONTROLLER_DESIGNS = [
 {id:'ice',name:'Default Day',finish:'Pearl shell · ocean-blue energy',free:true},
 {id:'dark',name:'Default Dark',finish:'Midnight shell · electric-blue light',free:true},
 {id:'light',name:'Default Light',finish:'Frosted glass · cool blue heart'},
 {id:'snow',name:'Snow & Gold',finish:'Winter white · warm gilded accents'},
 {id:'gold',name:'Gold',finish:'Treasure-vault gold · luminous details'},
 {id:'wood',name:'Satin Teak',finish:'Warm timber · satin accents'},
 {id:'christmas',name:'Christmas',finish:'Festive colour · holiday lighting'},
 {id:'classic',name:'Classic Christmas',finish:'Traditional holiday finish'},
];
export function ControllerThemeShop({initialTheme,onClose,onChooseDefault}:{initialTheme:string;onClose:()=>void;onChooseDefault:(theme:'ice'|'dark')=>void}){
 const [selected,setSelected]=useState(initialTheme),[browse,setBrowse]=useState(false),[failed,setFailed]=useState(false);
 const host=useRef<HTMLDivElement>(null),dialog=useRef<HTMLElement>(null),current=useRef(selected);current.current=selected;
 const design=CONTROLLER_DESIGNS.find(item=>item.id===selected)??CONTROLLER_DESIGNS[0];
 useControllerShopScrollLock();
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.focus();return()=>{previous?.focus();};},[]);
 useEffect(()=>{let disposed=false,cleanup:(()=>void)|undefined;
  import('./renderer.js').then(({mountLivingController})=>{if(disposed||!host.current)return;
   cleanup=mountLivingController(host.current,{},():ControllerSnapshot=>({theme:current.current,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,hidden:false,dice:24,multiplier:1,maximum:10,rolling:false,autoRolling:false,jackpot:false,buildReady:false,rollTitle:'ROLL',regenLabel:'Controller design preview',blocked:true}),()=>{},()=>setFailed(true));
  }).catch(()=>setFailed(true));return()=>{disposed=true;cleanup?.();};
 },[]);
 return createPortal(<div className="controller-theme-shop-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
  <section className="controller-theme-shop" ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Controller designs" onKeyDown={e=>{
   if(e.key==='Escape'){e.stopPropagation();onClose();}
   if(e.key==='Tab'){const buttons=dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');if(!buttons?.length)return;const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  }}>
   <button className="controller-theme-shop-close" aria-label="Close controller designs" onClick={onClose}>×</button>
   <small>{browse?'THE CONTROLLER COLLECTION':'THIS ISLAND’S SIGNATURE FINISH'}</small>
   <h2>{design.name}</h2><p>{design.finish}</p>
   <div className="controller-theme-shop-preview" ref={host} aria-label={`${design.name} 3D preview`}/>
   {failed&&<p>3D preview unavailable on this device.</p>}
   <div className="controller-theme-shop-actions">
    {design.free?<button onClick={()=>onChooseDefault(design.id as 'ice'|'dark')}>Use as default · Free</button>:<button disabled>29 NOK · Coming soon</button>}
    <button onClick={()=>setBrowse(true)}>Explore all finishes →</button>
   </div>
   <p className="controller-theme-shop-note">Special islands keep their signature finish. Your chosen default returns elsewhere.{!design.free&&' Purchases are not enabled yet.'}</p>
   {browse&&<div className="controller-theme-shop-grid">{CONTROLLER_DESIGNS.map(item=><button key={item.id} aria-pressed={selected===item.id} onClick={()=>setSelected(item.id)}>{item.name}<small>{item.free?'Included':'Preview'}</small></button>)}</div>}
  </section>
 </div>,document.body);
}
