import {useState} from 'react';

// Appearance only, owner-scoped on this device. This is NOT a paid ownership ledger.
export function useControllerPreference(owner:string){
 const key=`habitgame:controller-default:v1:${owner}`;
 const read=()=>{try{return localStorage.getItem(key)==='dark'?'dark':'ice';}catch{return 'ice';}};
 const [choice,setChoice]=useState(()=>({key,value:read()}));
 const value=choice.key===key?choice.value:read();
 return [value,(next:string)=>{const value=next==='dark'?'dark':'ice';setChoice({key,value});try{localStorage.setItem(key,value);}catch{/* Session choice remains usable. */}}] as const;
}
