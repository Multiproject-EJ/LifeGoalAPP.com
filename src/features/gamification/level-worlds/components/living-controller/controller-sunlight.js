// Controller sunlight: the enamel's buried sparkle ("shine") is a full-sun
// treat, not a permanent effect. Full-sun islands light it on arrival and it
// fades after about a minute; sunny and fair islands get an occasional soft
// sunbeam sweeping across the controller. Night, lava, ice and underwater
// worlds get neither. Presentation only.
export const CONTROLLER_SUNLIGHT={
 1:'full_sun',5:'full_sun',11:'full_sun',12:'full_sun',13:'full_sun',
 2:'fair',4:'fair',6:'fair',8:'fair',10:'fair',14:'fair',16:'fair',17:'fair',18:'fair',19:'fair',
};
export const CONTROLLER_SHINE_HOLD_S=50;
export const CONTROLLER_SHINE_FADE_S=10;
export const CONTROLLER_SUNBEAM_SWEEP_S=2.6;

/** @returns {'full_sun'|'fair'|'none'} */
export function controllerSunlight(islandNumber){
 return CONTROLLER_SUNLIGHT[Math.floor(Number(islandNumber)||0)]||'none';
}

/** Shine level 0..1, `age` seconds since the sunny scene began. */
export function controllerShineLevel(sunlight,age){
 if(sunlight!=='full_sun')return 0;
 const a=Math.max(0,age);
 if(a<=CONTROLLER_SHINE_HOLD_S)return 1;
 return Math.max(0,1-(a-CONTROLLER_SHINE_HOLD_S)/CONTROLLER_SHINE_FADE_S);
}

/** Sunbeam sweep progress 0..1 while a beam crosses the controller, else -1. */
export function controllerSunbeam(sunlight,age,reduced){
 if(reduced||sunlight==='none')return -1;
 const period=sunlight==='full_sun'?48:72;
 // First beam a little after arrival, then on a relaxed rhythm.
 const phase=((Math.max(0,age)-8)%period+period)%period;
 return age>=8&&phase<CONTROLLER_SUNBEAM_SWEEP_S?phase/CONTROLLER_SUNBEAM_SWEEP_S:-1;
}
