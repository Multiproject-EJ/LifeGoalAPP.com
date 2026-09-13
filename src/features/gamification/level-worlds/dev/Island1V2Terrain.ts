import * as THREE from 'three';
import { ISLAND_5_LANDMARKS, type Island3DQuality } from './island5ThreePilotContract';

const plots = ISLAND_5_LANDMARKS.filter(p => p.id !== 'boss');
const TAU = Math.PI * 2;
/** XY sea with a dry stair notch; callers rotate -90 degrees about X. */
export function createAssemblySeaGeometry(outerRadius=72,segments=160,rows=8){
  const geometry=new THREE.RingGeometry(7.02,outerRadius,segments,rows),p=geometry.getAttribute('position');
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),r=Math.hypot(x,y),a=Math.abs(Math.atan2(x,-y));
    const inner=a<.16?8.75:7.02,newRadius=inner+(outerRadius-inner)*(r-7.02)/(outerRadius-7.02);
    p.setXY(i,x*newRadius/r,y*newRadius/r);
  }
  p.needsUpdate=true;return geometry;
}
/** A continuous coastline fitted around the unchanged landmark plots. */
export function island001CoastRadius(a: number) {
  let r = 6.12 + .14 * Math.sin(a * 5 + .8) + .10 * Math.sin(a * 9);
  const x = Math.sin(a), z = Math.cos(a);
  for (const plot of plots) {
    const along = x * plot.position[0] + z * plot.position[2];
    const across = x * plot.position[2] - z * plot.position[0];
    if (along > 0 && Math.abs(across) < 1.87) r = Math.max(r, along + Math.sqrt(1.87 ** 2 - across ** 2));
  }
  return r;
}
function groundY(x: number, z: number) {
  const distance = Math.min(...plots.map(p => Math.hypot(x-p.position[0], z-p.position[2])));
  return THREE.MathUtils.lerp(.08, .26, THREE.MathUtils.smoothstep(distance, .9, 1.85));
}
function coloredMesh(name: string, positions: number[], colors: number[], material: THREE.Material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, material); m.name=name; m.receiveShadow=true; return m;
}
/** Stone, gardens and shoreline are presentation only. No route transforms live here. */
export function createIsland001V2Terrain(quality: Island3DQuality, cutaway = false) {
  const root = new THREE.Group(); root.name='ISLAND_001_V2_CONTINUOUS_LIMESTONE';
  root.userData.presentationOnly=true;
  const segments = quality==='low'?96:160;
  const rock = new THREE.MeshStandardMaterial({ color:0xffffff, vertexColors:true, roughness:.92 });
  const stone = new THREE.MeshStandardMaterial({ color:0xffffff, vertexColors:true, roughness:.78 });
  const positions:number[]=[], colors:number[]=[], top:number[]=[], topColors:number[]=[];
  const addTriangle=(out:number[], cols:number[], a:number[], b:number[], c:number[], shade:number[])=>{out.push(...a,...b,...c);cols.push(...shade,...shade,...shade);};
  const layers=[.26,.06,-.13,-.35,-.6,-.86,-1.12,-1.39,-1.68,-1.97,-2.25,-2.55,-2.87,-3.24,-3.9,-4.5,-5.15,-5.8,-6.55];
  function cliffPoint(a:number, row:number) {
    const y=layers[row], t=row/(layers.length-1);
    const flutes=.28*Math.sin(a*23+.25*Math.sin(a*7))+.12*Math.sin(a*47);
    const strata=.07*Math.sin(row*2.3+a*3)+.055*(row%3);
    const upper=island001CoastRadius(a)+flutes*(.2+Math.sin(t*Math.PI)*.8)+strata-.20*t;
    const chamberEnvelope=THREE.MathUtils.lerp(island001CoastRadius(a),7.25+.14*Math.sin(a*23)+.06*Math.sin(a*11),THREE.MathUtils.smoothstep(-y,.05,.55));
    const r=Math.max(upper,chamberEnvelope);
    return [Math.sin(a)*r, row===0?groundY(Math.sin(a)*r,Math.cos(a)*r):y+.055*Math.sin(a*11+row*.4), Math.cos(a)*r];
  }
  for(let i=0;i<segments;i++) {
    const a=i/segments*TAU,b=(i+1)/segments*TAU;
    if(cutaway && Math.cos((a+b)/2)>.03) continue;
    for(let j=0;j<layers.length-1;j++) {
      // Actual doorway geometry. The crown/board above it remains unchanged.
      const doorAngle=Math.abs(Math.atan2(Math.sin((a+b)/2),Math.cos((a+b)/2)));
      if(doorAngle<.165 && layers[j]<=-.60 && layers[j+1]>=-3.90)continue;
      const p=cliffPoint(a,j),q=cliffPoint(b,j),r=cliffPoint(b,j+1),s=cliffPoint(a,j+1);
      const variation=.90+.065*Math.sin(i*2.71+j*1.4)+.035*Math.sin(i*.63);
      const shade=[.72*variation,.67*variation,.55*variation];
      addTriangle(positions,colors,p,r,q,shade);addTriangle(positions,colors,p,s,r,shade);
    }
    const fractions=[0,.08,.29,.45,.67,1];
    for(let j=0;j<fractions.length-1;j++) {
      const point=(angle:number,f:number)=>{const r=2.72+(island001CoastRadius(angle)-2.72)*f;const x=Math.sin(angle)*r,z=Math.cos(angle)*r;return[x,groundY(x,z),z];};
      const p=point(a,fractions[j]),q=point(b,fractions[j]),r=point(b,fractions[j+1]),s=point(a,fractions[j+1]);
      const v=.97+.025*Math.sin(i*5.7+j*3.1), shade=[.57*v,.54*v,.46*v];
      addTriangle(top,topColors,p,r,q,shade);addTriangle(top,topColors,p,s,r,shade);
    }
  }
  const cliff=coloredMesh('ISLAND_001_ERODED_STRATIFIED_CLIFFS',positions,colors,rock);cliff.castShadow=quality!=='low';root.add(cliff);
  root.add(coloredMesh('ISLAND_001_QUIET_CIVIC_STONE_APRON',top,topColors,stone));
  const approachPositions:number[]=[],approachColors:number[]=[];
  plots.forEach(plot=>{
    if(cutaway&&plot.position[2]>0)return;
    const entry=new THREE.Vector3(plot.position[0]-.18,0,plot.position[2]+1.40);
    const start=entry.clone().normalize().multiplyScalar(4.15);
    const control=start.clone().lerp(entry,.48).add(new THREE.Vector3(.12,0,-.08));
    const curve=new THREE.QuadraticBezierCurve3(start,control,entry);
    for(let i=0;i<20;i++){
      const p=curve.getPoint(i/20),q=curve.getPoint((i+1)/20),tangent=q.clone().sub(p).normalize();
      const side=new THREE.Vector3(-tangent.z,0,tangent.x).multiplyScalar(.19);
      const vertices=[p.clone().add(side),p.clone().sub(side),q.clone().sub(side),q.clone().add(side)];
      vertices.forEach(v=>v.y=groundY(v.x,v.z)+.022);
      const shade=i%3===0?[.47,.405,.30]:[.55,.48,.36];
      addTriangle(approachPositions,approachColors,vertices[0].toArray(),vertices[2].toArray(),vertices[1].toArray(),shade);
      addTriangle(approachPositions,approachColors,vertices[0].toArray(),vertices[3].toArray(),vertices[2].toArray(),shade);
    }
  });
  root.add(coloredMesh('ISLAND_001_CONNECTED_LANDMARK_APPROACHES',approachPositions,approachColors,stone));
  const dummy=new THREE.Object3D();
  const greenery=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9});
  const shrubPositions:THREE.Vector3[]=[];
  const beds=[{a:Math.PI,r:5.12,w:1.65,d:.58},{a:Math.PI/2,r:5.15,w:1.65,d:.6},{a:Math.PI*1.5,r:5.15,w:1.65,d:.6},{a:.27,r:5.4,w:.6,d:.43},{a:-.27,r:5.4,w:.6,d:.43}];
  const soil=new THREE.MeshStandardMaterial({color:0x53633c,roughness:.95});
  const curb=new THREE.MeshStandardMaterial({color:0xbfb394,roughness:.83});
  const flowerPoints:THREE.Vector3[]=[];
  beds.forEach((bed,bedIndex)=>{
    const center=new THREE.Vector3(Math.sin(bed.a)*bed.r,.30,Math.cos(bed.a)*bed.r);
    if(cutaway&&center.z>0)return;
    const transform=(x:number,z:number)=>new THREE.Vector3(center.x+Math.cos(bed.a)*x+Math.sin(bed.a)*z,.30,center.z-Math.sin(bed.a)*x+Math.cos(bed.a)*z);
    const border=Array.from({length:25},(_,i)=>{const a=i/24*TAU,noise=1+.045*Math.sin(a*5+bedIndex);return transform(Math.sin(a)*bed.w*noise,Math.cos(a)*bed.d*noise);});
    const p:number[]=[];for(let i=0;i<24;i++)p.push(...center.toArray(),...border[i].toArray(),...border[i+1].toArray());
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();
    const bedMesh=new THREE.Mesh(g,soil);bedMesh.name='ISLAND_001_CONNECTED_PLANTED_COURT';root.add(bedMesh);
    const kerb=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(border.slice(0,-1),true),48,.035,5,true),curb);root.add(kerb);
    const count=quality==='low'?10:16;
    for(let i=0;i<count;i++) {
      const a=i*2.399963,t=Math.sqrt((i+.5)/count)*.83;
      const point=transform(Math.sin(a)*bed.w*t,Math.cos(a)*bed.d*t);point.y=.43+(i%3)*.025;shrubPositions.push(point);
      if(i%3===0)flowerPoints.push(point.clone().add(new THREE.Vector3(.03,.15,0)));
    }
  });
  const flowers=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.075,0),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.85}),flowerPoints.length);flowers.name='ISLAND_001_WARM_PURPLE_GARDEN_BLOOMS';
  flowerPoints.forEach((p,i)=>{dummy.position.copy(p);dummy.rotation.set(0,i,0);dummy.scale.set(1.4,.7,1.1);dummy.updateMatrix();flowers.setMatrixAt(i,dummy.matrix);flowers.setColorAt(i,new THREE.Color(i%3?0xa57bab:0xe1ba70));});root.add(flowers);
  const shrubs=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),greenery,shrubPositions.length);
  shrubs.name='ISLAND_001_GROUPED_COASTAL_GARDENS'; shrubs.castShadow=quality==='high';
  shrubPositions.forEach((p,i)=>{dummy.position.copy(p);dummy.rotation.set(i*.3,i*2.1,0);dummy.scale.set(.20+(i%3)*.07,.19+(i%4)*.025,.24);dummy.updateMatrix();shrubs.setMatrixAt(i,dummy.matrix);shrubs.setColorAt(i,new THREE.Color([0x435b29,0x536d32,0x69803d][i%3]));});root.add(shrubs);
  const trees:THREE.Vector3[]=[];
  for(let i=0;i<28;i++) {
    const a=i/28*TAU+.12,r=island001CoastRadius(a)-.32,x=Math.sin(a)*r,z=Math.cos(a)*r;
    if((cutaway&&z>0)||plots.some(p=>Math.hypot(x-p.position[0],z-p.position[2])<1.65)||Math.abs(x)<.85&&z>4)continue;
    trees.push(new THREE.Vector3(x,groundY(x,z),z));
  }
  const cypressGeometry=new THREE.LatheGeometry([new THREE.Vector2(.02,0),new THREE.Vector2(.1,.17),new THREE.Vector2(.13,.48),new THREE.Vector2(.08,.81),new THREE.Vector2(.015,1.16),new THREE.Vector2(0,1.24)],7);
  const cypress=new THREE.InstancedMesh(cypressGeometry,greenery,trees.length);cypress.name='ISLAND_001_SLENDER_CYPRESS_GROVES';cypress.castShadow=quality!=='low';
  trees.forEach((p,i)=>{dummy.position.copy(p);dummy.rotation.set(0,i*2.7,Math.sin(i)*.025);dummy.scale.setScalar(.75+(i%3)*.12);dummy.updateMatrix();cypress.setMatrixAt(i,dummy.matrix);cypress.setColorAt(i,new THREE.Color(0x365a25));});root.add(cypress);
  const ivyPositions:THREE.Vector3[]=[];
  for(let i=0;i<24;i++){
    const a=i/24*TAU+.11;if(cutaway&&Math.cos(a)>0||Math.abs(Math.sin(a))<.18&&Math.cos(a)>0)continue;
    for(let j=2;j<6+(i%3);j++){
      const p=cliffPoint(a+.014*Math.sin(j+i),j);ivyPositions.push(new THREE.Vector3(p[0]+Math.sin(a)*.09,p[1],p[2]+Math.cos(a)*.09));
    }
  }
  const ivy=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),greenery,ivyPositions.length);ivy.name='ISLAND_001_CLIFF_LEDGE_TRAILING_GARDENS';
  ivyPositions.forEach((p,i)=>{dummy.position.copy(p);dummy.rotation.set(i*.8,i*.5,0);dummy.scale.set(.14+(i%3)*.03,.17+(i%2)*.05,.13);dummy.updateMatrix();ivy.setMatrixAt(i,dummy.matrix);ivy.setColorAt(i,new THREE.Color(i%3?0x657b40:0x7b8e4e));});root.add(ivy);
  const shoreCount=quality==='low'?32:56;
  const shore=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0xb8aa8b,roughness:.95}),shoreCount);shore.name='ISLAND_001_LIMESTONE_SEA_STACKS';
  for(let i=0;i<shoreCount;i++) {
    const a=i/shoreCount*TAU,host=cliffPoint(a,11),r=Math.hypot(host[0],host[2])+.14+(i%3)*.18;
    dummy.position.set(Math.sin(a)*r,-2.5+(i%5)*.07,Math.cos(a)*r);dummy.rotation.set(.2*i,a,.15*i);dummy.scale.set(.20+(i%3)*.1,.28+(i%4)*.14,.22+(i%2)*.13);
    if((cutaway&&dummy.position.z>0)||(Math.abs(dummy.position.x)<1.4&&dummy.position.z>6.5))dummy.scale.setScalar(0);
    dummy.updateMatrix();shore.setMatrixAt(i,dummy.matrix);
  }root.add(shore);
  return root;
}
