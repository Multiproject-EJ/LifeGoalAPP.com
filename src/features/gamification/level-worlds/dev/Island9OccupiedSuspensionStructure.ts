import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type {Island3DQuality} from './island5ThreePilotContract';

/** Unwired family15/unit1. Discrete occupied cast machines; hidden rear assembly is inferred. */
export const OCCUPIED_SUSPENSION_PROFILE={family:15,unitFamily:1,source:'shaft-and-suspension-v001.png',inferences:['Hidden pressure-body backs','localized wall embedment','subordinate third support'],stage3Bay:{x:[-.05,.36],y:[.65,1.13],z:[-.21,.21]},approval:'unreviewed'};
export const OCCUPIED_SUSPENSION_FROZEN_OWNERS:Record<string,{level:number;phase:number}>={
 'curved-crane-elbow-wheel':{level:1,phase:3},'curved-crane-rear-wheel':{level:1,phase:3},'curved-crane-tip-sheave':{level:1,phase:4},
 'forked-balance-elbow-wheel':{level:2,phase:3},'forked-balance-tip-sheave':{level:2,phase:4},'crescent-terminal-sheave':{level:2,phase:4},
 'ignition-ring':{level:3,phase:4},'F5_TAUT_SUSPENSION_0':{level:3,phase:5},'F5_TAUT_SUSPENSION_1':{level:3,phase:5},'F5_TAUT_SUSPENSION_2':{level:3,phase:5},
};
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
const find=(root:THREE.Object3D,id:string)=>{let result:THREE.Group|undefined;root.traverse(n=>{if(n instanceof THREE.Group&&n.userData.partId===id)result=n as THREE.Group;});if(!result)throw Error('Missing suspension owner '+id);return result;};
function section(points:number[][],depth:number){const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false});g.translate(0,0,-depth/2);return g;}
function occupiedLoft(rings:number[][]){
 const pos:number[]=[],idx:number[]=[],n=12;
 for(const [y,x,rx,rz]of rings)for(let i=0;i<n;i++){const a=i/n*Math.PI*2;pos.push(x+Math.sin(a)*rx,y,Math.cos(a)*rz);}
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){const k=(i+1)%n,a=j*n+i,b=j*n+k,c=(j+1)*n+i,d=(j+1)*n+k;idx.push(a,b,c,b,d,c);}
 for(const end of [0,rings.length-1]){const c=pos.length/3;pos.push(rings[end][1],rings[end][0],0);for(let i=0;i<n;i++){const a=end*n+i,b=end*n+(i+1)%n;idx.push(...(end?[c,a,b]:[c,b,a]));}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
function castWeb(points:number[][],slots:number[][][],depth:number){const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();for(const vertices of slots){const hole=new THREE.Path();vertices.forEach(([x,y],i)=>i?hole.lineTo(x,y):hole.moveTo(x,y));hole.closePath();shape.holes.push(hole);}const geo=new THREE.ExtrudeGeometry(shape,{depth:depth-.04,bevelEnabled:true,bevelSegments:1,bevelThickness:.02,bevelSize:.02,bevelOffset:-.02});geo.translate(0,0,-depth/2+.02);return geo;}
function webSlot(a:number[],b:number[],half:number){const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy),nx=-dy/l*half,ny=dx/l*half;return [[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny]];}
function annularCase(radius:number,hole:number,depth:number,n:number){const s=new THREE.Shape();s.absarc(0,0,radius,0,Math.PI*2,false);const h=new THREE.Path();h.absarc(0,0,hole,0,Math.PI*2,true);s.holes.push(h);const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:n});g.translate(0,0,-depth/2);return g;}
/** Apply before presentation creation. All sockets and moving descendants retain object identity. */
export function applyIsland9OccupiedSuspensionStructure(boss:THREE.Group,bore:THREE.Mesh,quality:Island3DQuality){
 if(boss.userData.occupiedSuspensionApplied)throw Error('Suspension replacement already applied');
 if(!bore.geometry||!boss.getObjectByName('gantry-foundations/crane-pivot'))throw Error('Expected canonical F06 boss and actual bore');
 boss.updateWorldMatrix(true,true);bore.updateWorldMatrix(true,false);
 const neutral=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.82,metalness:0});const cast=neutral(0xadb0ae),dark=neutral(0x5e6972),rock=neutral(0x676f76);const n=quality==='high'?24:quality==='medium'?18:12;
 const add=(g:THREE.Group,name:string,geo:THREE.BufferGeometry,level:number,phase:number,p=V(0,0,0),mat:THREE.Material=cast)=>{const m=new THREE.Mesh(geo,mat);m.name=name;m.position.copy(p);m.castShadow=m.receiveShadow=true;m.userData={partId:g.userData.partId,constructionBuildLevel:level,constructionStage:phase,constructionPreserveOwnership:true,occupiedSuspension:true};g.add(m);return m;};
 const clear=(g:THREE.Group)=>{for(const child of [...g.children])if(child instanceof THREE.Mesh){g.remove(child);child.geometry.dispose();}};
 const contacts:Array<{owner:string;polygon:number[][];embedment:number}>=[];
 for(let i=0;i<3;i++){
  const seat=find(boss,'gantry-footing-'+i);clear(seat);seat.updateWorldMatrix(true,false);
  for(const sign of [-1,1]){
   const z=i===0&&sign<0?-.59:sign*.29,probe=seat.localToWorld(V(-.50,-.95,z)),angle=Math.atan2(probe.z,probe.x),corners:THREE.Vector3[]=[];
   for(const y of [-1.00,-.65])for(const a of [angle-.022,angle+.022]){const direction=V(Math.cos(a),0,Math.sin(a));const hits=new THREE.Raycaster(V(0,y,0),direction,0,2.68).intersectObject(bore,false);if(!hits.length)throw Error('Missing real bore seat contact');corners.push(hits[0].point.clone());}
   contacts.push({owner:seat.userData.partId,polygon:corners.map(p=>boss.worldToLocal(p.clone()).toArray()),embedment:.035});
   // Two localized occupied corbel cheeks leave the central instrument/tether corridor open.
   // Their rear vertices use sampled rock radii; each cheek is a closed cast wedge.
   const lower=seat.worldToLocal(corners[0].clone().lerp(corners[1],.5)),upper=seat.worldToLocal(corners[2].clone().lerp(corners[3],.5));
   const footprint=[ [lower.x-.035,-1.28],[lower.x+.12,-1.28],[upper.x+.18,-.30],[.24,.55],[.24,.65],[-.28,.65],[-.32,.18],[upper.x-.035,-.74] ];
   add(seat,'F15_WALL_SEATED_CORBEL_'+i+'_'+sign,section(footprint,.14),0,1,V(0,0,(lower.z+upper.z)/2),rock);
   const wallMarker=seat.getObjectByName('gantry-footing-'+i+(sign<0?'/wall-left':'/wall-right'));if(wallMarker){wallMarker.position.copy(lower);wallMarker.userData.actualWallContact=true;}
  }
  // Back crosshead is above the stage1 instrument and behind the stage3 pod.
  add(seat,'F15_FOUNDATION_REAR_CROSSHEAD_'+i,new THREE.BoxGeometry(.14,.12,i===0?.95:.73),0,1,V(-.21,.59,i===0?-.075:0),rock);
 }
 let primary:THREE.Group|undefined;try{primary=find(boss,'curved-crane');}catch{}
 if(primary){
  clear(primary);
  add(primary,'F15_PRIMARY_OCCUPIED_PRESSURE_BODY',occupiedLoft([[1.13,-.01,.27,.28],[1.32,-.01,.30,.28],[1.52,-.025,.225,.215],[1.88,-.025,.23,.23],[2.14,.01,.29,.28],[2.43,.02,.20,.26]]),1,2);
  add(primary,'F15_PRIMARY_REAR_BAY_LOAD',section([[-.30,.65],[-.30,1.24],[-.08,1.24],[-.08,.65]],.54),1,2);
  for(const sign of [-1,1])add(primary,'F15_PRIMARY_BAY_CHEEK_'+sign,section([[-.12,.65],[.28,.65],[.28,1.13],[-.12,1.13]],.08),1,2,V(0,0,sign*.25));
  add(primary,'F15_PRIMARY_ELBOW_BEARING_CASE',annularCase(.45,.105,.58,n),1,3,V(0,2.43,0));
  add(primary,'F15_PRIMARY_RISING_CAST_BOOM',castWeb([[.18,2.48],[.37,2.49],[.86,2.94],[1.72,3.19],[1.99,3.26],[1.98,3.48],[1.67,3.52],[.70,3.15],[.18,2.75]],[webSlot([.34,2.65],[.63,2.91],.035),webSlot([.78,3.045],[1.14,3.18],.055),webSlot([1.24,3.215],[1.64,3.355],.045)],.34),1,4);
  // Two discrete cheeks leave the live cable exit open between the terminal bearing faces.
  for(const sign of [-1,1])add(primary,'F15_PRIMARY_TERMINAL_CASE_'+sign,annularCase(.23,.085,.07,n),1,4,V(1.90,3.34,sign*.24));
 }
 let right:THREE.Group|undefined;try{right=find(boss,'forked-balance-beam');}catch{}
 if(right){
  clear(right);
  add(right,'F15_RIGHT_OCCUPIED_GEAR_BODY',occupiedLoft([[1.12,.05,.30,.34],[1.36,.08,.34,.33],[1.55,.05,.27,.27],[1.84,.04,.28,.31],[2.06,.06,.23,.28],[2.16,.11,.13,.23]]),2,2);
  add(right,'F15_RIGHT_REAR_BAY_LOAD',section([[-.28,.65],[-.28,1.25],[-.06,1.25],[-.06,.65]],.62),2,2);
  for(const sign of [-1,1])add(right,'F15_RIGHT_INSTRUMENT_BAY_CHEEK_'+sign,new THREE.BoxGeometry(.42,.47,.10),2,2,V(.10,.885,sign*.30));
  add(right,'F15_RIGHT_ELBOW_BEARING_CASE',annularCase(.395,.10,.53,n),2,3,V(0,1.94,0));
  add(right,'F15_RIGHT_SHORT_OCCUPIED_BOOM',castWeb([[.12,1.94],[.48,2.00],[1.47,2.23],[1.65,2.32],[1.60,2.55],[1.36,2.55],[.53,2.32],[.10,2.18]],[webSlot([.37,2.13],[.77,2.24],.045),webSlot([.87,2.27],[1.27,2.38],.045)],.24),2,4,V(0,0,.20));
  add(right,'F15_RIGHT_TERMINAL_CASE_1',annularCase(.22,.065,.06,n),2,4,V(1.49,2.38,.24));
  const rear=find(boss,'crescent-counterweight');clear(rear);
  add(rear,'F15_REAR_SUBORDINATE_OCCUPIED_RECEIVER',occupiedLoft([[.65,0,.26,.25],[.79,0,.28,.25],[1.05,.01,.21,.20],[1.25,0,.23,.24],[1.38,0,.17,.20]]),2,2);
  add(rear,'F15_REAR_COMPACT_CAST_LINK',section([[0,1.19],[.20,1.20],[.65,1.55],[1.12,1.76],[1.22,1.79],[1.30,1.84],[1.25,2.04],[.99,2.02],[.47,1.82],[0,1.45]],.26),2,4);
  for(const sign of [-1,1])add(rear,'F15_REAR_TERMINAL_CASE_'+sign,annularCase(.17,.055,.05,n),2,4,V(1.15,1.85,sign*.185));
 }
 for(const [id,level,spindles]of [['curved-crane',1,[[0,2.43,.84,.115,0],[1.90,3.34,.54,.09,0]]],['forked-balance-beam',2,[[0,1.94,.80,.11,0],[1.49,2.38,.30,.07,.12]]],['crescent-counterweight',2,[[1.15,1.85,.42,.065,0]]]] as const){let owner:THREE.Group;try{owner=find(boss,id);}catch{continue;}for(const [i,p]of spindles.entries()){const mesh=add(owner,'F15_FIXED_BEARING_SPINDLE_'+id+'_'+i,new THREE.CylinderGeometry(p[3],p[3],p[2],12),level,3,V(p[0],p[1],p[4]),dark);mesh.rotation.x=Math.PI/2;}}
 const ring=boss.getObjectByName('ISLAND_9_IGNITION_RING_PIVOT');
 if(ring){const shell=ring.getObjectByName('V2_OPEN_IGNITION_ANNULUS');if(!(shell instanceof THREE.Mesh))throw Error('Missing ring shell');const pieces:THREE.BufferGeometry[]=[];
 for(const [inner,outer]of [[.94,.99],[1.13,1.18]])pieces.push(new THREE.LatheGeometry([[inner,0],[outer,0],[outer,.18],[inner,.18],[inner,0]].map(([r,y])=>new THREE.Vector2(r,y)),40).toNonIndexed());
 for(let i=0;i<12;i++){const geo=new THREE.BoxGeometry(.20,.12,.045);geo.translate(1.06,.09,0);geo.rotateY(i*Math.PI/6);pieces.push(geo.toNonIndexed());}
 for(const angle of [-1.74,.45,-2.65]){const geo=new THREE.BoxGeometry(.20,.12,.115);geo.translate(1.06,.09,0);geo.rotateY(-angle);pieces.push(geo.toNonIndexed());}
 const merged=mergeGeometries(pieces,false);pieces.forEach(g=>g.dispose());if(!merged)throw Error('Ring section merge');shell.geometry.dispose();shell.geometry=merged;shell.userData.authoredAnnularSections=true;boss.userData.ringSectionRevision={inner:.94,outer:1.18,bottom:0,top:.18,radialWebs:12,lugSeatWebs:3,subsetOfPriorShell:true};}
 boss.userData.frozenConstructionOwners=OCCUPIED_SUSPENSION_FROZEN_OWNERS;boss.userData.occupiedSuspensionApplied=true;boss.userData.occupiedSuspensionProfile=OCCUPIED_SUSPENSION_PROFILE;boss.userData.wallSeatContacts=contacts;boss.updateWorldMatrix(true,true);return boss;
}
