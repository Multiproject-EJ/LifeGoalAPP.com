import * as THREE from 'three';
export const MARINA_FILM_SECONDS=48;
export const MARINA_INTERIOR_START=.78;
export const MARINA_PODIUM_START=.84;
export const crowdClock=(p:number)=>p<=.46?p:.46+(p-.46)*2.4;
export const progressFromCrowdClock=(t:number)=>t<=.46?t:.46+(t-.46)/2.4;
export function craftArrival(index:number,count:number){
  if(index===0)return {start:.18,end:.30};
  if(index<4)return {start:.40+(index-1)*.024,end:.45+(index-1)*.025};
  const t=(index-4)/Math.max(1,count-5),start=.50+Math.pow(t,.60)*.15;
  return {start,end:start+THREE.MathUtils.lerp(.075,.025,t)};
}
export interface MarinaDeparture {position:THREE.Vector3;angle:number;spoke:number;end:number;}
