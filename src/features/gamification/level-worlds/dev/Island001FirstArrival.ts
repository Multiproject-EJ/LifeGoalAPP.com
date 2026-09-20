import * as THREE from 'three';
import {createExpeditionShipThreeModel} from './ExpeditionShipThreeModel';
import {createRobotFamilyModel, type RobotRole} from './RobotFamilyThreeModel';
import {FIRST_ARRIVAL_DURATION, arrivalBeat} from '../services/islandRunFirstArrival';

const ease = (t: number) => { const x = THREE.MathUtils.clamp(t, 0, 1); return x*x*(3-2*x); };
const segment = (t:number,a:number,b:number) => ease((t-a)/(b-a));
const v = (x:number,y:number,z:number) => new THREE.Vector3(x,y,z);
const dock = v(-17, -0.35, 6);
const roles: RobotRole[] = ['heavy-worker','project-manager','mini-artist'];

/** One cinematic in the existing board renderer. Never writes gameplay state. */
export function createIsland001FirstArrival(scene: THREE.Scene, player: THREE.Group,
  shadow: THREE.Object3D, start: readonly [number,number,number]) {
  const root = new THREE.Group(); root.name = 'ISLAND_001_FIRST_ARRIVAL'; scene.add(root);
  const ship = createExpeditionShipThreeModel('low');
  const shipPivot = new THREE.Group(); shipPivot.add(ship.root); shipPivot.scale.setScalar(1.05); root.add(shipPivot);
  const crew = createRobotFamilyModel({quality:'low',showAddonRack:false});
  crew.setExternalRootMotion(true); crew.setMotion('idle'); crew.setEmotion('delighted'); root.add(crew.root);
  for (const role of roles) crew.members[role].scale.setScalar(0.24);
  const originalBackground = scene.background;
  const originalFog = scene.fog;
  const space = new THREE.Color('#030e23');
  const daylight = new THREE.Color('#a6dbe6');
  const fog = new THREE.Fog('#a6dbe6', 80, 220);
  const streakPositions = new Float32Array(140*6);
  for(let i=0;i<140;i++) {
    const a=i*2.39996, r=5+(i%13)*1.7;
    streakPositions.set([Math.cos(a)*r,Math.sin(a)*r,(i%17)*4-34,Math.cos(a)*r,Math.sin(a)*r,(i%17)*4-31],i*6);
  }
  const starGeo=new THREE.BufferGeometry(); starGeo.setAttribute('position',new THREE.BufferAttribute(streakPositions,3));
  const starMat=new THREE.LineBasicMaterial({color:'#a7edff',transparent:true,opacity:.75});
  const stars=new THREE.LineSegments(starGeo,starMat); root.add(stars);
  const rings = Array.from({length:4},(_,i)=>{
    const m = new THREE.Mesh(new THREE.RingGeometry(.96,1,96),new THREE.MeshBasicMaterial({color:'#c6fbff',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
    m.rotation.x=-Math.PI/2; m.position.set(dock.x,-2.59+i*.004,dock.z); root.add(m); return m;
  });
  const glowMat=new THREE.MeshBasicMaterial({color:'#79ecff',transparent:true,opacity:.7,depthWrite:false});
  const thrusters = [-2,0,2].map(x=>{
    const m=new THREE.Mesh(new THREE.ConeGeometry(.22,3,16,1,true),glowMat);
    m.rotation.x=-Math.PI/2; m.position.set(x,-.3,-2.8); shipPivot.add(m); return m;
  });
  const trails=Array.from({length:4},()=>{
    const g=new THREE.BufferGeometry().setFromPoints(Array.from({length:40},()=>v(0,0,0)));
    const m=new THREE.LineBasicMaterial({color:'#b7faff',transparent:true,opacity:.6,depthWrite:false});
    const l=new THREE.Line(g,m); root.add(l); return l;
  });
  const startPoint=new THREE.Vector3(...start);
  let restored=false;
  let playerDelivered=false;
  function update(t:number,delta:number,camera:THREE.PerspectiveCamera, reduced:boolean, constructionActive:boolean) {
    const flight=segment(t,5,12);
    shipPivot.position.copy(v(-28,32,-36).lerp(dock,flight));
    shipPivot.rotation.set(0, -.28*(1-flight), Math.sin(flight*Math.PI)*-.25);
    const expansion=segment(t,14,20);
    ship.update({timeSeconds:t,pose:'flight',poseProgress:1-expansion,thrust:t<11?.7:.12,hover:t<14?.5:.04,reducedMotion:true});
    // Parent carries the trajectory; the canonical model owns its transformation.
    thrusters.forEach(m=>{m.visible=t<13; m.scale.y=1+Math.sin(t*20)*.08;});
    stars.position.copy(shipPivot.position); stars.position.z+=(t*22)%4;
    stars.visible=t<7; starMat.opacity=.65*(1-segment(t,4,7));
    if(t<FIRST_ARRIVAL_DURATION) {
      restored=false;
      scene.background=space.clone().lerp(daylight,segment(t,4,10)); scene.fog=fog;
      const chase=shipPivot.position.clone().add(v(8,5,12));
      const landing=v(-28,9,24); const reveal=v(-24,6,22); const board=v(-5,24,34);
      let eye=chase, target=shipPivot.position.clone();
      if(t>=7) eye=chase.lerp(landing,segment(t,7,12));
      if(t>=13) eye=landing.clone().lerp(reveal,segment(t,13,18));
      if(t>=19) {eye=reveal.clone().lerp(board,segment(t,19,28)); target=shipPivot.position.clone().lerp(v(0,1,0),segment(t,19,27));}
      // Slight restrained turbulence only in the approach, never reduced motion.
      if(!reduced && t>7 && t<11) eye.y+=Math.sin(t*31)*.045;
      eye.sub(target).multiplyScalar(Math.max(1, (0.94 + 0.2 * segment(t,19,22)) / camera.aspect)).add(target);
      camera.position.copy(eye); camera.lookAt(target); camera.fov=44; camera.updateProjectionMatrix();
    } else if(!restored) {scene.background=originalBackground;scene.fog=originalFog;restored=true;}
    rings.forEach((m,i)=>{
      const age=(t-11.6-i*.35);const p=age<0?0:(age%3)/3;
      m.scale.setScalar(2+p*8);
      (m.material as THREE.MeshBasicMaterial).opacity=t>11.6 && t<16 ? .35*(1-p):.045*(1-p);
    });
    crew.update(t,delta,reduced);
    const launch=dock.clone().add(v(1,1.8,2));
    const arrivalTargets=[startPoint,v(-4,1.15,4),v(-2,1.15,5),v(-5,1.15,2)];
    [player,...roles.map(role=>crew.members[role])].forEach((actor,i)=>{
      const begin=20+i*.85, end=begin+2.5, u=segment(t,begin,end);
      if(i===0 && t>=26) {if(!playerDelivered){player.position.copy(startPoint);player.visible=true;shadow.visible=true;playerDelivered=true;} trails[i].visible=false;return;}
      if(i===0) playerDelivered=false;
      actor.visible=t>=begin && (i===0 || !constructionActive);
      if(i===0) shadow.visible=t>=end;
      if(t>=end && i>0) {
        const walkTime=reduced?0:t-end;
        const a=walkTime*.3+i*2.1;
        // Gentle patrol within the clear board apron; roles remain independently readable.
        actor.position.copy(arrivalTargets[i]).add(v(Math.sin(a)*1.8,Math.sin(t*4+i)*.05,Math.cos(a)*.8));
        actor.rotation.y=Math.atan2(Math.cos(a)*1.8,-Math.sin(a)*.8);
      } else {
        actor.position.copy(launch).lerp(arrivalTargets[i],u);
        actor.position.y+=Math.sin(u*Math.PI)*(3.5+i*.25);
        actor.rotation.y=Math.atan2(arrivalTargets[i].x-launch.x,arrivalTargets[i].z-launch.z);
      }
      trails[i].visible=t>=begin && t<end;
      if(trails[i].visible){
        const attr=trails[i].geometry.attributes.position;
        for(let j=0;j<40;j++){const q=Math.max(0,u-.22+j/39*.22);const p=launch.clone().lerp(arrivalTargets[i],q);p.y+=Math.sin(q*Math.PI)*(3.5+i*.25);attr.setXYZ(j,p.x,p.y,p.z);}
        attr.needsUpdate=true; trails[i].geometry.computeBoundingSphere();
      }
    });
    root.userData.beat=arrivalBeat(t);
    root.userData.playerEndpoint=start;
    return t>=FIRST_ARRIVAL_DURATION;
  }
  return {root, update, dispose(){
    scene.background=originalBackground;scene.fog=originalFog;root.remove(shipPivot,crew.root);ship.dispose();crew.dispose();
    root.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose(); const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});
    thrusters.forEach(m=>m.geometry.dispose());glowMat.dispose();scene.remove(root);
  }};
}
