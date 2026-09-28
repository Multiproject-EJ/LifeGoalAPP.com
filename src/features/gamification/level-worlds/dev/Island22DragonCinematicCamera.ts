import * as THREE from 'three';
type Anchors={head:THREE.Vector3;body:THREE.Vector3;water:THREE.Vector3;house:THREE.Vector3;parentMatrix:THREE.Matrix4};
/** Stateless shot interpolation keeps seeking, slow playback and production identical. */
export function resolveSeaDragonCinematicCamera(seconds:number,a:Anchors,aspect:number){
 const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
 const portrait=aspect<.75,fit=Math.max(1,Math.min(1.75,.72/Math.max(.3,aspect)));
 const focus=(mix:number)=>a.head.clone().lerp(a.body,mix);
 const eruption=v(0,.1,0).lerp(a.head,.48);
 const shot=(time:number,target:THREE.Vector3,offset:THREE.Vector3,fov:number,fitHero=false)=>({time,target,position:target.clone().add(offset.multiplyScalar(fitHero?fit:1)),fov:portrait&&fitHero?fov+6:fov});
 const fixed=(time:number,position:THREE.Vector3,target:THREE.Vector3,fov:number)=>({time,position,target,fov});
 const keys=[
 fixed(0,v(9.5,8.2,11.5),v(0,.5,0),48),fixed(5.2,v(9.5,8.2,11.5),v(0,.5,0),48),
 fixed(6.45,v(3.1,4.6,3.4),v(0,-3.2,0),48),fixed(6.82,v(3.1,4.6,3.4),v(0,-4.6,0),48),
 fixed(7.12,v(9,12,10),v(0,-.8,0),54),shot(7.9,eruption,v(24,21,26),58),shot(9.65,eruption,v(31,25,34),56),
 shot(11.2,focus(.60),v(25,17,38),54,true),shot(13.4,focus(.64),v(28,17,43),52,true),
 shot(16.2,focus(.65),v(28,15,43),52,true),shot(18.7,focus(.64),v(23,17,45),54,true),
 shot(20.0,focus(.48),v(14,21,46),58,true),shot(21.35,a.water.clone().add(v(0,14,0)),v(25,21,52),60),
 shot(22.25,a.water.clone().add(v(0,2.8,0)),v(17,12,31),56,true),
 shot(23.2,a.house.clone().add(v(0,.8,0)),v(5.8,4.3,7.2),44),
 ];
 let lower=keys[0],upper=keys[keys.length-1];for(let i=1;i<keys.length;i++){if(seconds<=keys[i].time){lower=keys[i-1];upper=keys[i];break;}lower=keys[i];}
 const raw=THREE.MathUtils.clamp((seconds-lower.time)/Math.max(.001,upper.time-lower.time),0,1),t=raw*raw*(3-2*raw);
 return{position:lower.position.clone().lerp(upper.position,t).applyMatrix4(a.parentMatrix),target:lower.target.clone().lerp(upper.target,t).applyMatrix4(a.parentMatrix),fov:THREE.MathUtils.lerp(lower.fov,upper.fov,t)};
}

/** Fit visible anatomy to the real aspect ratio without resizing the creature. */
export function fitSeaDragonCameraToBounds(pose:{position:THREE.Vector3;target:THREE.Vector3;fov:number},bounds:THREE.Box3,aspect:number,weight=1){
 if(bounds.isEmpty())return;
 const forward=pose.target.clone().sub(pose.position).normalize(),right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize(),up=new THREE.Vector3().crossVectors(right,forward).normalize();
 const tanV=Math.tan(THREE.MathUtils.degToRad(pose.fov)*.5)*.90,tanH=tanV*aspect;
 const current=pose.position.distanceTo(pose.target);let required=current;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
  const relative=new THREE.Vector3(x,y,z).sub(pose.target),depth=relative.dot(forward);
  required=Math.max(required,Math.abs(relative.dot(right))/tanH-depth,Math.abs(relative.dot(up))/tanV-depth);
 }
 pose.position.copy(pose.target).addScaledVector(forward,-THREE.MathUtils.lerp(current,required,weight));
}
