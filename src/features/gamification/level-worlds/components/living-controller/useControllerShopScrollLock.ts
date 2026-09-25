import {useEffect} from 'react';
// The catalogue is a nested portal over Supply Dock. Reference counting avoids
// restoring "hidden" forever when parent/child effects clean up in either order.
let locks=0;
let previousOverflow='';
export function useControllerShopScrollLock(){
 useEffect(()=>{
  if(locks++===0){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}
  return()=>{if(--locks===0)document.body.style.overflow=previousOverflow;};
 },[]);
}
