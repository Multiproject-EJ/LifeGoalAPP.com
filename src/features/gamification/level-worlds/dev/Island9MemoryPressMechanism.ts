import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Island3DQuality, Island5LandmarkDefinition } from './island5ThreePilotContract';
import type { Island9HeartshaftMaterials } from './Island9HeartshaftThreeWorld';
import type { IslandConstructionFactoryOptions } from './IslandConstructionAuthoring';

/** Global F11 initial source-fitted mechanical kit; not visual approval.
 * Original exact crop is authoritative. Source-fit-residual-resolution.v1.json
 * supplies uncertain physical proposals, not manufacturing measurements.
 * Rear pressure vessels, circular hidden sections and bracket engineering are
 * inferred. No generated study supplies geometry. +Z faces source; yaw stays0.
 */
export const MEMORY_PRESS_MECHANISM_SPEC = {
 source:'docs/visual-references/island-009-heartshaft-crucible/009-source.png',
 sourceCrop:'docs/gauntlets/island-009-v2/parts/coupled-structure/family-07/isolation/memory-press-exact-v001.png',
 evidence:'docs/gauntlets/island-009-v2/parts/coupled-structure/source-fit-residual-resolution.v1.json',
 sourceUncertaintyPx:{bandCentre:8,semanticAnchor:12,foundation:20},
 collars:[
  {id:'lower',center:[-.047087925,1.412116424,-.1],radius:.696723011,innerRadius:.595,sourceFront:[159,380],sourceWidth:[130,160]},
  {id:'middle',center:[-.080401038,2.190702640,-.1],radius:.630479667,innerRadius:.535,sourceFront:[155,323],sourceWidth:[125,150]},
  {id:'upper',center:[-.026198472,2.918747722,-.1],radius:.547514073,innerRadius:.465,sourceFront:[161,263],sourceWidth:[110,140]},
 ],
 bandFaceHeight:.25,
 towerFoot:[-.051323842,3.181663773,.26],crownFront:[-.083685248,4.739461017,.26],
 tallAuxTop:[.6,3.445427485,.48],shortAuxTop:[1.034276780,1.702027472,.30],
 primaryBandUpper:[-.192173376,3.939004547,.30],primaryBandLower:[-.4087,2.546,.45],
 driveAxle:[-.948,1.009,.60],
 focusSocket:[0,1.5,0],footprintRadius:1.53,heightCeiling:5.29,
 inference:'Circular collars are inferred because visible rim proxies are occluded, not validated equators. Separate occupied chambers, outer chassis and stepped auxiliary members own their contacts.',
} as const;
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
const phaseNames=['grounded-foundation','lower-furnace-and-pressure-chassis','upper-machine-and-distinct-drives','stepped-auxiliary-machines'];
function part(id:string,level:number){const p=new THREE.Group();p.name='MEMORY_PRESS_MECHANISM_'+id.toUpperCase().replace(/-/g,'_');p.userData={partId:id,keepSeparate:true,buildLevel:level,constructionStage:level,constructionPhase:phaseNames[level],sculptRuntime:{parts:[{id,nodeName:p.name,kind:'part'}],sockets:{},colliders:[],clickable:true,explodable:true}};return p;}
function socket(p:THREE.Object3D,name:string,xyz:readonly number[]){const n=new THREE.Object3D();n.name=name;n.position.set(xyz[0],xyz[1],xyz[2]);n.userData.socket=true;p.add(n);p.userData.sculptRuntime.sockets[name]={nodeName:name,localPosition:[...xyz]};return n;}
function clean(g:THREE.BufferGeometry){const p=g.getAttribute('position'),idx=g.index,out:number[]=[];for(let i=0;i<(idx?.count??p.count);i+=3){const a=[0,1,2].map(k=>idx?idx.getX(i+k):i+k);const v=a.map(j=>new THREE.Vector3().fromBufferAttribute(p,j));if(v[1].sub(v[0]).cross(v[2].sub(v[0])).lengthSq()>1e-20)out.push(...a);}g.setIndex(out);g.clearGroups();return g;}
function mesh(p:THREE.Object3D,name:string,g:THREE.BufferGeometry,m:THREE.Material,at=V(0,0,0)){const n=new THREE.Mesh(clean(g),m);n.name=name;n.position.copy(at);n.castShadow=n.receiveShadow=true;n.userData={buildLevel:p.userData.buildLevel,constructionPhase:p.userData.constructionPhase,explodeWithParent:true};p.add(n);return n;}
function lathe(p:THREE.Object3D,name:string,profile:number[][],segments:number,m:THREE.Material,at=V(0,0,0)){const g=new THREE.LatheGeometry(profile.map(v=>new THREE.Vector2(v[0],v[1])),segments).toNonIndexed();g.computeVertexNormals();return mesh(p,name,g,m,at);}
function beam(p:THREE.Object3D,name:string,a:THREE.Vector3,b:THREE.Vector3,w:number,d:number,m:THREE.Material){const n=mesh(p,name,new THREE.BoxGeometry(w,a.distanceTo(b),d),m,a.clone().lerp(b,.5));n.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());return n;}
function box(p:THREE.Object3D,name:string,at:THREE.Vector3,size:THREE.Vector3,m:THREE.Material){return mesh(p,name,new THREE.BoxGeometry(size.x,size.y,size.z),m,at);}
function roundChamber(p:THREE.Object3D,name:string,r:number,bottom:number,top:number,at:THREE.Vector3,segments:number,m:THREE.Material){return lathe(p,name,[[0,bottom],[r*.83,bottom],[r,bottom+.06],[r,top-.06],[r*.83,top],[0,top]],segments,m,at);}
function seatedPressureVolume(rows:number[][],segments:number){
 const positions:number[]=[],indices:number[]=[];
 for(const [radius,y,cx]of rows)for(let i=0;i<segments;i++){const a=i*Math.PI*2/segments;positions.push(cx+radius*Math.cos(a),y,-.1+radius*Math.sin(a));}
 for(let j=0;j<rows.length-1;j++)for(let i=0;i<segments;i++){const k=(i+1)%segments,a=j*segments+i,b=j*segments+k,c=(j+1)*segments+i,d=(j+1)*segments+k;indices.push(a,c,b,b,c,d);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);clean(g);g.computeVertexNormals();return g;
}
function polygonFoundation(){
 const outline=[[-1.22,.68],[-.72,1.20],[.22,1.43],[1.19,.72],[1.30,.12],[.90,-.71],[.10,-.96],[-.91,-.64],[-1.27,-.06]];
 const verts:number[]=[],idx:number[]=[];const n=outline.length;
 for(const [scale,y]of [[.94,-.04],[1,.07],[.91,.18]])for(const [x,z]of outline)verts.push(x*scale,y,z*scale);
 for(let j=0;j<2;j++)for(let i=0;i<n;i++){const k=(i+1)%n,a=j*n+i,b=j*n+k,c=(j+1)*n+i,d=(j+1)*n+k;idx.push(a,b,c,b,d,c);}
 // Outline is clockwise in XZ, so upward top faces follow reversed order.
 const shape=outline.map(([x,z])=>new THREE.Vector2(x,z));const caps=THREE.ShapeUtils.triangulateShape(shape,[]);
 for(const [a,b,c]of caps){idx.push(a,b,c,2*n+a,2*n+c,2*n+b);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(idx);const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();return flat;
}
function sweep(points:THREE.Vector3[],halfWidth:number,halfDepth:number,segments:number){
 const curve=new THREE.CatmullRomCurve3(points,false,'centripetal');const verts:number[]=[],idx:number[]=[];
 const oct=[[-1,-.65],[-.65,-1],[.65,-1],[1,-.65],[1,.65],[.65,1],[-.65,1],[-1,.65]];
 for(let j=0;j<=segments;j++){const t=j/segments,c=curve.getPoint(t),tangent=curve.getTangent(t).normalize();const across=new THREE.Vector3().crossVectors(V(0,0,1),tangent).normalize(),depth=new THREE.Vector3().crossVectors(tangent,across).normalize();const swelling=1+.15*Math.sin(Math.PI*t);for(const [u,v]of oct)verts.push(...c.clone().addScaledVector(across,u*halfWidth*swelling).addScaledVector(depth,v*halfDepth).toArray());}
 for(let j=0;j<segments;j++)for(let i=0;i<8;i++){const k=(i+1)%8,a=j*8+i,b=j*8+k,c=(j+1)*8+i,d=(j+1)*8+k;idx.push(a,b,c,b,d,c);}
 for(const end of [0,segments]){const center=verts.length/3;verts.push(...curve.getPoint(end/segments).toArray());for(let i=0;i<8;i++){const a=end*8+i,b=end*8+(i+1)%8;if(end===0)idx.push(center,b,a);else idx.push(center,a,b);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(idx);const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();return flat;
}
function batch(p:THREE.Group){p.updateMatrixWorld(true);const buckets=new Map<THREE.Material,THREE.Mesh[]>();for(const n of p.children)if(n instanceof THREE.Mesh&&!Array.isArray(n.material)){const list=buckets.get(n.material)??[];list.push(n);buckets.set(n.material,list);}for(const [m,nodes]of buckets){const inputs=nodes.map(n=>{n.updateMatrix();const g=n.geometry.index?n.geometry.toNonIndexed():n.geometry.clone();g.applyMatrix4(n.matrix);for(const key of Object.keys(g.attributes))if(key!=='position'&&key!=='normal')g.deleteAttribute(key);return g;});const g=mergeGeometries(inputs,false);if(!g)continue;for(const n of nodes)n.removeFromParent();for(const g0 of inputs)g0.dispose();mesh(p,p.name+'_SURFACE_'+m.userData.slot,g,m);}}

export function buildIsland9MemoryPressMechanism(definition:Island5LandmarkDefinition,level:0|1|2|3,quality:Island3DQuality,_materials:Island9HeartshaftMaterials,_options:IslandConstructionFactoryOptions={}){
 const root=part('memory-press',0);root.name='ISLAND_9_HEARTSHAFT_WISDOM_ROOT';root.position.set(...definition.position);root.userData.family='source-fitted-discrete-memory-mechanism';root.userData.authoringProfile=MEMORY_PRESS_MECHANISM_SPEC;root.userData.profileYaw=0;root.userData.approval='unreviewed';
 const material=(color:number,slot:string)=>{const m=new THREE.MeshStandardMaterial({color,roughness:.82,metalness:0});m.userData.slot=slot;return m;};
 const stone=material(0x747a7d,'foundation'),cast=material(0xa1a5a4,'casting'),core=material(0x626c72,'pressure-core');const segments=quality==='high'?48:quality==='medium'?32:24;
 socket(root,'ISLAND_9_WISDOM_FOCUS_SOCKET',[0,1.5,0]);root.userData.sculptRuntime.sockets.focus='ISLAND_9_WISDOM_FOCUS_SOCKET';
 root.userData.sculptRuntime.colliders=[{id:'wisdom-focus-trigger',type:'cylinder',isTrigger:true,radius:1.14}];
 const foundation=part('memory-press-polygonal-foundation',0);root.add(foundation);mesh(foundation,'MEMORY_MECHANISM_GROUNDED_FOOTING',polygonFoundation(),stone);
 // Broad grounded seating masses are stage0 receiving interfaces, not a thin
 // decorative plate; subsequent assemblies keep these same footprints.
 roundChamber(foundation,'FURNACE_GROUND_SEAT',.43,.16,.30,V(-.06,0,-.05),10,stone);
 roundChamber(foundation,'TALL_AUX_GROUND_SEAT',.21,.16,.30,V(.60,0,.48),8,stone);
 roundChamber(foundation,'SHORT_AUX_GROUND_SEAT',.19,.15,.27,V(1.034,0,.30),8,stone);
 box(foundation,'DRIVE_GROUND_SEAT',V(-.948,.26,.60),V(.36,.22,.35),stone);
 socket(foundation,'memory-press/furnace-seat',[-.06,.30,-.05]);socket(foundation,'memory-press/tall-aux-seat',[.60,.30,.48]);socket(foundation,'memory-press/short-aux-seat',[1.034,.27,.30]);socket(foundation,'memory-press/drive-ground-seat',[-.948,.37,.60]);batch(foundation);
 if(level>=1){
  const furnace=part('memory-press-tiered-furnace',1);root.add(furnace);
  const throat=part('memory-press-lower-furnace-throat',1);furnace.add(throat);
  // The lower pressure machine occupies real height beneath the bottom collar.
  lathe(throat,'LOWER_FURNACE_PRESSURE_BODY',[[0,.30],[.39,.30],[.49,.43],[.49,.92],[.55,1.10],[.595,1.287],[0,1.287]],12,core,V(-.047,0,-.10));
  // Front fire/service opening is a thick arch and a recessed closed mechanical
  // chamber, not emission or an empty hole replacing the entire furnace volume.
  const arch=new THREE.Shape();arch.moveTo(-.31,.32);arch.lineTo(-.31,.78);arch.bezierCurveTo(-.31,1.08,.31,1.08,.31,.78);arch.lineTo(.31,.32);arch.closePath();const hole=new THREE.Path();hole.moveTo(-.19,.34);hole.lineTo(.19,.34);hole.lineTo(.19,.77);hole.bezierCurveTo(.19,.95,-.19,.95,-.19,.77);hole.closePath();arch.holes.push(hole);
  mesh(throat,'THICK_FURNACE_FRONT_PORTAL',new THREE.ExtrudeGeometry(arch,{depth:.14,bevelEnabled:false,curveSegments:12}),cast,V(-.06,0,.27));
  socket(throat,'memory-press/lower-collar-seat',[-.047,1.287,-.1]);batch(throat);
  for(const c of MEMORY_PRESS_MECHANISM_SPEC.collars){const collar=part('memory-press-pressure-collar-'+c.id,1);furnace.add(collar);const r=c.radius,ri=c.innerRadius,h=.125;
   lathe(collar,'DISCRETE_PRESSURE_COLLAR_'+c.id,[[ri,-h],[r-.035,-h],[r,-h+.025],[r,h-.025],[r-.035,h],[ri,h],[ri,-h]],segments,cast,V(c.center[0],c.center[1],c.center[2]));
   collar.userData.sourceFit={frontSourcePixel:[...c.sourceFront],widthSourceInterval:[...c.sourceWidth],center:[...c.center],radius:r,bandHeight:.25};
   socket(collar,'memory-press/collar-'+c.id+'-axis',c.center);batch(collar);
  }
  const chambers=part('memory-press-occupied-pressure-chambers',1);furnace.add(chambers);
  mesh(chambers,'BROAD_LOWER_PRESSURE_CHAMBER',seatedPressureVolume([[0,1.287,-.047087925],[.595,1.287,-.047087925],[.595,1.537116424,-.047087925],[.535,2.065702640,-.080401038],[.535,2.190702640,-.080401038],[0,2.190702640,-.080401038]],segments),core);
  mesh(chambers,'BROAD_UPPER_PRESSURE_CHAMBER',seatedPressureVolume([[0,2.190702640,-.080401038],[.535,2.190702640,-.080401038],[.535,2.315702640,-.080401038],[.465,2.793747722,-.026198472],[.465,3.043747722,-.026198472],[0,3.043747722,-.026198472]],segments),core);
  // Four independent load columns follow the collar seats. They carry the
  // separate collars instead of defining another continuous radial bottle.
  const collars=MEMORY_PRESS_MECHANISM_SPEC.collars;
  for(const angle of [Math.PI*.22,Math.PI*.78,Math.PI*1.22,Math.PI*1.78])beam(chambers,'LOWER_COLLAR_RADIAL_LOAD_SEAT',V(-.047+Math.cos(angle)*.32,1.33,-.1+Math.sin(angle)*.32),V(-.047+Math.cos(angle)*.56,1.33,-.1+Math.sin(angle)*.56),.10,.11,cast);
  // r04 keeps the eight-position schedule as engineering inference. The
  // .04 outer rib face is an authored hypothesis, not a recovered dimension.
  // Trapezoidal webs are embedded in the unchanged faceted pressure casing;
  // feet widen only inside the terminal twelve percent of each span.
  const ribContacts=[];
  for(const angle of Array.from({length:8},(_,i)=>Math.PI*(i+.5)/4))for(let j=0;j<2;j++){
   const a=collars[j],b=collars[j+1],length=b.center[1]-a.center[1];
   const rows=[a.center[1],a.center[1]+length*.12,a.center[1]+.125,b.center[1]-.125,b.center[1]-length*.12,b.center[1]].sort((a,b)=>a-b);
   const positions:number[]=[],indices:number[]=[],radial=V(Math.cos(angle),0,Math.sin(angle)),tangent=V(-Math.sin(angle),0,Math.cos(angle));
   const records=[];
   for(const y of rows){const t=(y-a.center[1])/length,bodyT=Math.max(0,Math.min(1,(y-a.center[1]-.125)/(length-.25))),radius=THREE.MathUtils.lerp(a.innerRadius,b.innerRadius,bodyT),cx=THREE.MathUtils.lerp(a.center[0],b.center[0],bodyT),foot=Math.max(0,1-Math.min(t,1-t)/.12),outerHalf=.02+.02*foot,innerHalf=.032+.018*foot,inner=radius-.022,outer=radius+.027+.018*foot;
    for(const [w,r]of [[-innerHalf,inner],[innerHalf,inner],[outerHalf,outer],[-outerHalf,outer]])positions.push(...V(cx,y,-.1).addScaledVector(radial,r).addScaledVector(tangent,w).toArray());
    records.push({y,cx,bodyRadius:radius,innerRadius:inner,outerRadius:outer,outerWidth:outerHalf*2,innerWidth:innerHalf*2});
   }
   for(let k=0;k<rows.length-1;k++)for(let i=0;i<4;i++){const n=(i+1)%4,a=k*4+i,b=k*4+n,c=(k+1)*4+i,d=(k+1)*4+n;indices.push(a,b,c,b,d,c);}
   indices.push(0,2,1,0,3,2);const last=(rows.length-1)*4;indices.push(last,last+1,last+2,last,last+2,last+3);
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();mesh(chambers,'PRESSURE_CHASSIS_COLUMN',flat,cast);
   ribContacts.push({angle,span:j,rows:records,section:'embedded trapezoidal web with local terminal feet',terminalFraction:.12});
  }
  chambers.userData.ribContactSchedule=ribContacts;
  box(chambers,'UPPER_MACHINE_RECEIVING_BLOCK',V(-.05,3.108,-.08),V(.59,.128,.53),cast);
  socket(chambers,'memory-press/upper-machine-seat',[-.05,3.172,-.08]);batch(chambers);
 }
 if(level>=2){
  const upper=part('memory-press-dominant-chimney',2);root.add(upper);
  // F11 additional refinement r03: historical occupied-panel method reused
  // openly, not a new family. Original crop supports two observed adjoining
  // face channels, not a repeated circumferential count. Both continue behind
  // the band; their unequal visible lengths are partly occlusion. Rear plain
  // enclosure, recess depth .045 and hidden continuation are inferred.
  const casingFaces=[[-.065,.245],[.225,.105],[.225,-.255],[.135,-.345],[-.265,-.345],[-.355,-.255],[-.355,.105]];
  const ys=[3.172,3.29,3.36,4.43,4.50,4.59],us=[0,.18,.30,.70,.82,1];
  const castFaces:number[]=[],coreFaces:number[]=[];
  for(let face=0;face<casingFaces.length;face++){
   const a=casingFaces[face],b=casingFaces[(face+1)%casingFaces.length];
   const outward=V(b[1]-a[1],0,a[0]-b[0]).normalize();
   const midpoint=V((a[0]+b[0])/2+.065,0,(a[1]+b[1])/2+.08);
   if(outward.dot(midpoint)<0)outward.negate();
   const channel=face===0||face===6;
   const point=(u:number,y:number)=>{
    const scale=y===3.172?.81:y===3.29?.94:y===4.59?.94:1;
    const v=V(-.065+(a[0]+(b[0]-a[0])*u+.065)*scale,y,-.08+(a[1]+(b[1]-a[1])*u+.08)*scale);
    const du=u>=.30&&u<=.70?1:0,dy=y>=3.36&&y<=4.43?1:0;
    return v.addScaledVector(outward,channel?-.045*du*dy:0);
   };
   for(let j=0;j<ys.length-1;j++)for(let i=0;i<us.length-1;i++){
    const corners=[point(us[i],ys[j]),point(us[i+1],ys[j]),point(us[i+1],ys[j+1]),point(us[i],ys[j+1])];
    const target=channel&&i===2&&j===2?coreFaces:castFaces;
    for(const ids of [[0,1,2],[0,2,3]]){const tri=ids.map(k=>corners[k]);if(tri[1].clone().sub(tri[0]).cross(tri[2].clone().sub(tri[0])).dot(outward)<0)[tri[1],tri[2]]=[tri[2],tri[1]];for(const v of tri)target.push(...v.toArray());}
   }
  }
  for(const [name,positions,mat]of [['CONTINUOUS_FACETED_UPPER_CASTING',castFaces,cast],['TWO_RECESSED_MACHINE_CHANNEL_BACKS',coreFaces,core]] as const){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();mesh(upper,name,g,mat);}
  upper.userData.upperRefinement={round:'r03',seatY:3.172,crownUndersideY:4.59,observedChannelFaces:[0,6],channelDepth:.045,physicalChannelY:[3.36,4.43],hiddenRear:'plain inferred enclosure',continuousOccupiedBody:true,sharedSeatAndCrownClosure:true};
  // Faceted bearing roof, broad and low; finial remains below5.29.
  lathe(upper,'POLYGONAL_MAIN_BEARING_ROOF',[[0,4.59],[.37,4.59],[.43,4.65],[.43,4.75],[.34,4.79],[0,4.79]],8,cast,V(-.065,0,-.08));
  lathe(upper,'MAIN_PRESSURE_FINIAL',[[0,4.77],[.18,4.77],[.18,4.88],[.095,4.94],[.085,5.069],[0,5.069]],8,cast,V(-.09,0,-.10));
  beam(upper,'PRIMARY_BAND_UPPER_BEARING',V(-.192173376,3.939004547,.12),V(...MEMORY_PRESS_MECHANISM_SPEC.primaryBandUpper),.25,.19,cast);
  socket(upper,'memory-press/primary-band-upper',MEMORY_PRESS_MECHANISM_SPEC.primaryBandUpper);batch(upper);
  const primary=part('memory-press-curved-drive-housing',2);root.add(primary);
  const upperContact=V(...MEMORY_PRESS_MECHANISM_SPEC.primaryBandUpper),lowerContact=V(...MEMORY_PRESS_MECHANISM_SPEC.primaryBandLower);
  mesh(primary,'PRIMARY_CURVED_PRESSURE_DRIVE_BAND',sweep([lowerContact,V(-.55,2.78,.44),V(-.61,3.12,.40),V(-.49,3.54,.35),upperContact],.105,.115,32),cast);
  beam(primary,'PRIMARY_LOWER_TRANSFER_BRACKET',lowerContact,V(-.409,2.80,.32),.19,.19,cast);
  socket(primary,'memory-press/primary-band-lower',MEMORY_PRESS_MECHANISM_SPEC.primaryBandLower);batch(primary);
  const drive=part('memory-press-outer-frame-and-drive',2);root.add(drive);
  mesh(drive,'DISTINCT_OUTER_LOAD_FRAME',sweep([V(-.948,.75,.52),V(-1.075,1.52,.34),V(-.99,2.35,.15),V(-.73,3.20,.015),V(-.34,3.92,-.02)],.055,.065,40),cast);
  beam(drive,'OUTER_FRAME_UPPER_SEAT',V(-.34,3.92,-.02),V(-.22,3.92,-.08),.15,.17,cast);
  beam(drive,'DRIVE_BEARING_GROUNDED_PEDESTAL',V(-.948,.37,.60),V(-.948,1.009,.60),.19,.20,core);
  const wheel=part('memory-press-drive-wheel',2);wheel.position.set(...MEMORY_PRESS_MECHANISM_SPEC.driveAxle);drive.add(wheel);
  mesh(wheel,'MEMORY_PRESS_SEPARATE_DRIVE_WHEEL',new THREE.TorusGeometry(.265,.047,8,32),cast);
  const axle=mesh(wheel,'MEMORY_PRESS_DRIVE_AXLE',new THREE.CylinderGeometry(.08,.08,.20,10),core);axle.rotation.x=Math.PI/2;
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;beam(wheel,'MEMORY_DRIVE_SPOKE',V(0,0,0),V(.25*Math.cos(a),.25*Math.sin(a),0),.055,.07,cast);}socket(drive,'memory-press/drive-axle',MEMORY_PRESS_MECHANISM_SPEC.driveAxle);batch(wheel);batch(drive);
 }
 if(level>=3){
  const auxiliaries=part('memory-press-unequal-auxiliary-towers',3);root.add(auxiliaries);
  // Source-supported stepped head/stem/base: head radius is not extruded
  // down through every collar height. Thin outer members remain real solids.
  for(const [id,x,z,top,headRadius]of [['tall',.60,.48,3.445427485,.19],['short',1.03427678,.30,1.702027472,.17]] as const){
   const a=part('memory-press-'+id+'-auxiliary',3);auxiliaries.add(a);const isTall=id==='tall',baseTop=isTall?.65:.48,headBase=top-(isTall?.31:.27),stemRadius=isTall?.11:.095,memberRadius=isTall?.15:.13;
   lathe(a,'STEPPED_'+id+'_GROUND_BODY',[[0,.27],[isTall?.20:.18,.27],[isTall?.21:.19,.35],[isTall?.18:.16,baseTop],[0,baseTop]],8,cast,V(x,0,z));
   roundChamber(a,'OCCUPIED_'+id+'_PRESSURE_STEM',stemRadius,baseTop,headBase,V(x,0,z),10,core);
   for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const px=x+Math.cos(angle)*(memberRadius-.02),pz=z+Math.sin(angle)*(memberRadius-.02);beam(a,'SEPARATE_'+id+'_STEM_MEMBER',V(px,baseTop-.02,pz),V(px,headBase+.04,pz),.038,.038,cast);}
   lathe(a,'STEPPED_'+id+'_HEAD_BEARING',[[0,headBase-.055],[headRadius,headBase-.055],[headRadius,headBase+.055],[headRadius*.70,headBase+.095],[0,headBase+.095]],10,cast,V(x,0,z));
   lathe(a,'FACETED_'+id+'_PRESSURE_TOP',[[0,headBase+.07],[headRadius*.57,headBase+.07],[headRadius*.65,top-.16],[0,top]],5,core,V(x,0,z));
   socket(a,'memory-press/'+id+'-aux-top',[x,top,z]);batch(a);
  }
  // Short explicit bridges own the connections between collars and the tall
  // auxiliary members; no full-height intersecting head-radius cylinder.
  for(const c of MEMORY_PRESS_MECHANISM_SPEC.collars){const axis=V(.6,c.center[1],.48),center=V(c.center[0],c.center[1],c.center[2]);const dir=axis.clone().sub(center).setY(0).normalize();const start=center.clone().addScaledVector(dir,c.radius-.012),end=axis.clone().addScaledVector(dir,-.10);beam(auxiliaries,'TALL_AUX_COLLAR_CONTACT_BRACKET',start,end,.064,.065,cast);}
  socket(auxiliaries,'memory-press/pressure-return',[.6,2.19070264,.48]);batch(auxiliaries);
 }
 root.userData.contactGraph=[['foundation','lower-furnace-throat'],['lower-furnace-throat','lower-pressure-collar'],['pressure-collars','independent-chassis'],['upper-pressure-collar','upper-machine-receiving-block'],['upper-framed-machine','primary-band-upper-bearing'],['upper-pressure-collar','primary-band-lower-bracket'],['grounded-drive-pedestal','drive-wheel'],['drive-wheel','distinct-outer-frame'],['collar-contact-brackets','stepped-tall-auxiliary']];
 root.userData.geometryControls={fixedYaw:0,maximumRadius:1.53,maximumHeight:5.29,additiveLevels:true,meshLevelNotAnimationPhase:true};return root;
}
