import * as THREE from 'three';
import { ASSEMBLY_UPPER_CONCOURSE_Y } from './Island1AssemblyLayout';
import { ISLAND_5_LANDMARKS } from './island5ThreePilotContract';
import type { Island1WorldMaterials } from './Island1ThreeWorld';
import { compactStaticGeometry } from './CrownCitadelThreeModel';
import { getIsland001V2LandmarkYaw } from './Island1V2Assets';

/** The shared glass lifts consume the reserved forecourt socket on each model. */
export function createAssemblyLandmarkAccess(materials: Island1WorldMaterials, floorY: number) {
  const root=new THREE.Group();root.name='ISLAND_001_LANDMARK_ASSEMBLY_ACCESS';root.userData.presentationOnly=true;
  const galleryY=ASSEMBLY_UPPER_CONCOURSE_Y,surfaceY=.15,topY=surfaceY+.86;
  const glass=new THREE.MeshStandardMaterial({color:0x89cad7,transparent:true,opacity:.22,depthWrite:false,roughness:.18,metalness:.22,side:THREE.DoubleSide});glass.forceSinglePass=true;
  const blue=new THREE.MeshStandardMaterial({color:0x235879,roughness:.23,metalness:.4});
  const limestone=new THREE.MeshStandardMaterial({color:0xe2d6b8,roughness:.6});
  const structure=new THREE.Group();structure.name='CIVIC_LIFT_SHARED_STRUCTURE';root.add(structure);
  const cabins:THREE.Group[]=[];
  const mesh=(parent:THREE.Group,name:string,g:THREE.BufferGeometry,m:THREE.Material,p:THREE.Vector3)=>{const obj=new THREE.Mesh(g,m);obj.name=name;obj.position.copy(p);parent.add(obj);return obj;};
  const ring=(parent:THREE.Group,y:number,r:number,tube=.014)=>{const m=mesh(parent,'LIFT_BRASS_COLLAR',new THREE.TorusGeometry(r,tube,4,16),materials.gold,new THREE.Vector3(0,y,0));m.rotation.x=Math.PI/2;};
  ISLAND_5_LANDMARKS.forEach(def=>{
    if(def.id==='boss')return;
    const yaw=getIsland001V2LandmarkYaw(def.id);
    const socket=new THREE.Vector3(.72,0,1.07).applyAxisAngle(new THREE.Vector3(0,1,0),yaw).add(new THREE.Vector3(...def.position));
    const station=new THREE.Group();station.name=`ASSEMBLY_ACCESS_${def.id}`;station.position.copy(socket);station.rotation.y=yaw;station.userData.landmarkId=def.id;structure.add(station);
    for(const y of [galleryY,surfaceY]) {
      mesh(station,'CIVIC_LIFT_STONE_LANDING',new THREE.CylinderGeometry(.33,.36,.08,20),limestone,new THREE.Vector3(0,y,0));ring(station,y+.045,.31);
    }
    mesh(station,'CIVIC_LIFT_CONTINUOUS_GLASS_SHAFT',new THREE.CylinderGeometry(.27,.27,topY-galleryY,20,1,true),glass,new THREE.Vector3(0,(topY+galleryY)/2,0));
    for(let i=0;i<8;i++) {
      const a=i*Math.PI/4;
      mesh(station,'CIVIC_LIFT_BRASS_MULLION',new THREE.CylinderGeometry(.012,.012,topY-galleryY,5),materials.gold,new THREE.Vector3(Math.sin(a)*.274,(topY+galleryY)/2,Math.cos(a)*.274));
      const points=Array.from({length:9},(_,n)=>{const t=n/8*Math.PI/2;return new THREE.Vector3(Math.sin(a)*Math.cos(t)*.29,topY+Math.sin(t)*.27,Math.cos(a)*Math.cos(t)*.29);});
      mesh(station,'CIVIC_LIFT_DOME_RIB',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),8,.01,4,false),materials.gold,new THREE.Vector3());
    }
    mesh(station,'CIVIC_LIFT_BLUE_DOME',new THREE.SphereGeometry(.284,20,10,0,Math.PI*2,0,Math.PI/2),blue,new THREE.Vector3(0,topY,0));
    [galleryY+.10,surfaceY+.05,topY,topY-.10].forEach(y=>ring(station,y,.282));
    mesh(station,'CIVIC_LIFT_FINIAL',new THREE.SphereGeometry(.036,8,5),materials.gold,new THREE.Vector3(0,topY+.31,0));
    // A real bridge from the consumed socket to the upper concourse.
    const end=socket.clone().setY(galleryY);const radius=Math.hypot(end.x,end.z);end.multiplyScalar(6.53/radius).setY(galleryY);
    const start=socket.clone().setY(galleryY);const delta=end.clone().sub(start),length=delta.length();
    const bridge=new THREE.Group();bridge.position.copy(start.clone().add(end).multiplyScalar(.5));bridge.rotation.y=Math.atan2(delta.x,delta.z);structure.add(bridge);
    mesh(bridge,'GALLERY_ARRIVAL_BRIDGE',new THREE.BoxGeometry(.56,.10,length+.1),limestone,new THREE.Vector3());
    for(const x of [-.27,.27]) {
      mesh(bridge,'GALLERY_BRIDGE_GOLD_RAIL',new THREE.BoxGeometry(.015,.018,length),materials.gold,new THREE.Vector3(x,.30,0));
      for(let i=0;i<4;i++)mesh(bridge,'GALLERY_BRIDGE_BALUSTER',new THREE.CylinderGeometry(.012,.012,.30,5),materials.gold,new THREE.Vector3(x,.15,-length/2+length*i/3));
    }
    const cabin=new THREE.Group();cabin.name=`ASSEMBLY_LIFT_CABIN_${def.id}`;cabin.position.copy(socket);cabin.rotation.y=yaw;root.add(cabin);
    mesh(cabin,'LIFT_CABIN_FLOOR',new THREE.CylinderGeometry(.235,.235,.06,16),materials.gold,new THREE.Vector3(0,.04,0));
    mesh(cabin,'LIFT_CABIN_BLUE_BACK',new THREE.CylinderGeometry(.23,.23,.65,16,1,true,Math.PI/2,Math.PI),blue,new THREE.Vector3(0,.385,0));
    ring(cabin,.72,.237,.012);mesh(cabin,'LIFT_CABIN_WELCOME_LIGHT',new THREE.BoxGeometry(.16,.025,.025),materials.warmGlow,new THREE.Vector3(0,.66,-.225));
    compactStaticGeometry(cabin,`CIVIC_CABIN_${def.id}`);cabins.push(cabin);
  });
  compactStaticGeometry(structure,'CIVIC_LIFTS_AND_GALLERY_BRIDGES');
  function update(progress:number,elapsed:number) {
    root.visible=progress>.82;
    root.scale.y=Math.max(.001,THREE.MathUtils.smoothstep(progress,.82,.98));
    cabins.forEach((cabin,index)=>{
      const phase=((elapsed/12+index/4)%1+1)%1;
      const travel=phase<.5?THREE.MathUtils.smoothstep(phase,.08,.42):1-THREE.MathUtils.smoothstep(phase,.58,.92);
      cabin.position.y=THREE.MathUtils.lerp(galleryY+.07,surfaceY+.07,progress>=1?travel:0);
    });
  }
  update(0,0);return{root,update};
}
