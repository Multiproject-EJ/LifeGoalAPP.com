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
  shadow: THREE.Object3D, start: readonly [number,number,number],
  handoff = {position:v(0,25,33), target:v(0,.15,0), fov:44}) {
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
  const oceanBackdrop=new THREE.Mesh(new THREE.PlaneGeometry(1200,1200),new THREE.MeshBasicMaterial({color:'#8cc9d2'}));
  oceanBackdrop.name='ARRIVAL_OCEAN_HORIZON';oceanBackdrop.rotation.x=-Math.PI/2;oceanBackdrop.position.y=-2.8;root.add(oceanBackdrop);
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
    oceanBackdrop.visible=t>=5.2 && t<FIRST_ARRIVAL_DURATION;
    const flight=segment(t,5,12);
    // Sweeping approach: cross the sky, bank toward the coast, then brake over water.
    const approach=new THREE.CubicBezierCurve3(v(-30,27,-28),v(3,22,-19),v(-22,5,7),dock);
    shipPivot.position.copy(approach.getPoint(flight));
    shipPivot.rotation.set(Math.sin(flight*Math.PI)*.18, -.35*(1-flight), Math.sin(flight*Math.PI)*-.48);
    const expansion=segment(t,14,18.4);
    ship.update({timeSeconds:t,pose:'flight',poseProgress:1-expansion,thrust:t<11?.7:.12,hover:t<14?.5:.04,reducedMotion:true});
    // Parent carries the trajectory; the canonical model owns its transformation.
    thrusters.forEach(m=>{m.visible=t<13; m.scale.y=1+Math.sin(t*20)*.08;});
    stars.position.copy(shipPivot.position); stars.position.z+=(t*35)%4;
    stars.visible=t<7; starMat.opacity=.65*(1-segment(t,4,7));
    if(t<FIRST_ARRIVAL_DURATION) {
      restored=false;
      scene.background=space.clone().lerp(daylight,segment(t,4,10)); scene.fog=fog;
      let eye:THREE.Vector3, target=shipPivot.position.clone().add(v(0,.5,0));
      let lens=42;
      // Intentional editorial cuts. Each shot has a restrained camera move of its own.
      if(t<3.4) { // close tracking three-quarter view, hull fills the frame
        eye=shipPivot.position.clone().add(v(7,2.7,10).lerp(v(5.8,2.2,9),segment(t,0,3.4)));
      } else if(t<5.2) { // reverse engine shot before leaving fast travel
        eye=shipPivot.position.clone().add(v(-7,1.6,-11).lerp(v(-5,2.5,-12),segment(t,3.4,5.2)));
      } else if(t<8.2) { // wide destination reveal: establish the island and trajectory
        eye=v(19,29,34).lerp(v(16,27,32),segment(t,5.2,8.2));
        target=v(-9,10,-6);lens=48;
      } else if(t<11.4) { // cut back alongside the banking ship
        eye=shipPivot.position.clone().add(v(8,3,12).lerp(v(10,2,9),segment(t,8.2,11.4)));
        target.add(v(0,.4,0));lens=44;
      } else if(t<14) { // low coastal wide shot: braking and ocean contact
        eye=v(-34,5,26).lerp(v(-32,6,24),segment(t,11.4,14));
        target=dock.clone().lerp(v(-10,1,3),.22);lens=48;
      } else if(t<18.4) { // cut in: watch the mechanical transformation
        eye=dock.clone().add(v(-9,5.8,17).lerp(v(-5,6.8,17),segment(t,14,20)));
        target=dock.clone().add(v(0,1.1,0));lens=42;
      } else if(t<20) { // enter the opened ship; the welcome modal pauses here
        const u=segment(t,18.4,19.8);
        eye=dock.clone().add(v(-5,6.8,17).lerp(v(-1.8,2.7,7),u));
        target=dock.clone().add(v(0,1.6,0));lens=42;
      } else if(t<22.6) { // launch camera: travel with the player toward START
        const u=segment(t,20,22.5);
        target=dock.clone().add(v(1,1.8,2)).lerp(startPoint,u);
        target.y+=Math.sin(u*Math.PI)*3.5;
        eye=target.clone().add(v(-6,4,11));lens=48;
      } else if(t>=25.1 && t<26.5) { // brief close-up confirms the player is settled on START
        target=startPoint.clone().add(v(0,.45,0));
        eye=startPoint.clone().add(v(3.2,2.5,4.4));lens=42;
      } else { // wide crew deployment, then hand control to the normal board camera
        eye=v(-20,22,33).lerp(v(-7,26,37),segment(t,22.6,26));
        target=v(-6,1,3).lerp(v(0,1,0),segment(t,22.6,26));lens=48;
      }
      if(!reduced && t>8.2 && t<11.4) eye.y+=Math.sin(t*31)*.035;
      // Fit the ship and landing path in a narrow phone viewport, without changing shot direction.
      eye.sub(target).multiplyScalar(Math.max(1,.78/camera.aspect)).add(target);
      const handoffMix=segment(t,26.5,29);
      eye.lerp(handoff.position,handoffMix); target.lerp(handoff.target,handoffMix);
      camera.position.copy(eye); camera.lookAt(target); camera.fov=THREE.MathUtils.lerp(lens,handoff.fov,handoffMix); camera.updateProjectionMatrix();
    } else if(!restored) {scene.background=originalBackground;scene.fog=originalFog;camera.position.copy(handoff.position);camera.lookAt(handoff.target);camera.fov=handoff.fov;camera.updateProjectionMatrix();restored=true;}
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
    root.userData.cameraShot=t<3.4?'hull-close':t<5.2?'engines':t<8.2?'island-wide':t<11.4?'descent-close':t<14?'ocean-wide':t<20?'unfold-close':t<22.6?'player-flight':'crew-wide';
    root.userData.playerEndpoint=start;
    return t>=FIRST_ARRIVAL_DURATION;
  }
  return {root, update, handoffTarget:handoff.target, dispose(){
    scene.background=originalBackground;scene.fog=originalFog;root.remove(shipPivot,crew.root);ship.dispose();crew.dispose();
    root.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose(); const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});
    thrusters.forEach(m=>m.geometry.dispose());glowMat.dispose();scene.remove(root);
  }};
}
