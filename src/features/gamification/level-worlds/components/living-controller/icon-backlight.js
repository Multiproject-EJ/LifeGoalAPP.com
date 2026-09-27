// Controller icon backlight: icons read as neon outline strips behind the
// glass. A tap flares the strip and it fades back down; Build glows red while
// a build step is affordable (off again once the island is fully built); after
// two minutes without touching the controller every strip dims to a whisper.
export const ICON_BACKLIGHT_IDLE_MS=120000;
export const ICON_BACKLIGHT_IDLE_FADE_MS=3000;
export const ICON_BACKLIGHT_TAP_DECAY_S=1.6;
export const ICON_BACKLIGHT_BUILD_READY='#ff2d55';

/** @returns {{intensity:number,color:string,blur:number,alpha:number}} */
export function iconBacklight({now,pressAt,lastInteractionAt,isBuild,buildReady,baseColor,reduced}){
 const tapAge=Math.max(0,now-pressAt);
 const tap=tapAge<ICON_BACKLIGHT_TAP_DECAY_S*3?Math.exp(-tapAge/ICON_BACKLIGHT_TAP_DECAY_S*2.2):0;
 const idleMs=Math.max(0,(now-lastInteractionAt)*1000-ICON_BACKLIGHT_IDLE_MS);
 const idle=Math.min(1,idleMs/ICON_BACKLIGHT_IDLE_FADE_MS);
 const red=!!(isBuild&&buildReady);
 const pulse=red&&!reduced?.12*Math.sin(now*3.2):0;
 const base=(red?.85:.6)+pulse;
 // Idle dims everything, but a tap always wakes the strip immediately.
 const intensity=Math.max(.12,base*(1-idle*.8))+tap*.9;
 return {intensity,color:red?ICON_BACKLIGHT_BUILD_READY:baseColor,blur:6+intensity*22,alpha:Math.min(1,.45+intensity*.5)};
}
