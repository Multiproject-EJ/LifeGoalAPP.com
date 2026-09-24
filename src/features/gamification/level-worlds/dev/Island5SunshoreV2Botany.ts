import * as THREE from 'three';
import type { Island2WorldMaterials } from './Island2ThreeWorld';
import type { Island3DQuality } from './island5ThreePilotContract';
import { compactStaticGeometry } from './CrownCitadelThreeModel';

/** Folded, tapered and notched leaf surface. Low retains the complete silhouette. */
function frondGeometry(length: number, width: number, segments: number) {
  const positions:number[]=[],uv:number[]=[],indices:number[]=[];
  for(let i=0;i<=segments;i++) {
    const t=i/segments;
    const w=Math.pow(Math.sin(Math.PI*t),.7)*width*(i%2?.72:1);
    const y=Math.sin(Math.PI*t)*length*.18-t*t*length*.28;
    positions.push(t*length,y-.03,-w,t*length,y+.025,0,t*length,y-.03,w);
    uv.push(t,0,t,.5,t,1);
    if(i<segments) {const a=i*3;indices.push(a,a+3,a+1,a+1,a+3,a+4,a+1,a+4,a+2,a+2,a+4,a+5);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
export function createSunshoreV2Palm(x:number,z:number,height:number,m:Island2WorldMaterials,quality:Island3DQuality,phase=0) {
  const root=new THREE.Group();root.name='SUNSHORE_V2_PALM';root.position.set(x,.28,z);root.rotation.y=phase;
  const lean=.18+Math.sin(phase*3)*.11;
  const points=[new THREE.Vector3(0,0,0),new THREE.Vector3(-lean*.2,height*.35,0),new THREE.Vector3(lean*.45,height*.73,.04),new THREE.Vector3(lean,height,.08)];
  const trunkGeo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),quality==='low'?7:12,.095,7,false);
  const p=trunkGeo.attributes.position;
  for(let i=0;i<p.count;i++) {const t=Math.min(1,Math.max(0,p.getY(i)/height));const taper=1-.42*t;p.setZ(i,.08*t+(p.getZ(i)-.08*t)*taper);}
  trunkGeo.computeVertexNormals();
  const trunk=new THREE.Mesh(trunkGeo,m.teak);trunk.name='SUNSHORE_V2_CURVED_PALM_TRUNK';root.add(trunk);
  const crown=new THREE.Group();crown.name='SUNSHORE_V2_PALM_CROWN';crown.position.copy(points[3]);
  const count=quality==='low'?7:10;
  for(let i=0;i<count;i++) {
    const leaf=new THREE.Mesh(frondGeometry(.85+(i%3)*.12,.17,quality==='low'?10:16),[m.leaf,m.leafLight,m.leafDark][i%3]);
    leaf.name=`SUNSHORE_V2_FROND_${i}`;leaf.rotation.y=i/count*Math.PI*2;leaf.rotation.z=.05+Math.sin(i*2)*.18;leaf.position.y=i%2*.06;crown.add(leaf);
  }
  for(let i=0;i<3;i++){const nut=new THREE.Mesh(new THREE.SphereGeometry(.075,7,5),m.teakDark);nut.name=`SUNSHORE_V2_COCONUT_${i}`;nut.position.set(lean+Math.cos(i*2.1)*.1,height-.1,.08+Math.sin(i*2.1)*.1);root.add(nut);}
  root.add(crown);root.userData.swayPhase=phase;
  compactStaticGeometry(root,'SUNSHORE_V2_PALM');return root;
}
export function createSunshoreV2PlantCluster(m:Island2WorldMaterials,quality:Island3DQuality,seed:number) {
  const root=new THREE.Group();root.name='SUNSHORE_V2_UNDERSTORY';
  for(let i=0;i<(quality==='low'?5:8);i++) {
    const leaf=new THREE.Mesh(frondGeometry(.3+i%3*.08,.075,6),i%2?m.leafDark:m.leafLight);leaf.name=`SUNSHORE_V2_FERN_${i}`;leaf.rotation.y=i*2.399+seed;leaf.rotation.z=.4+i%3*.18;root.add(leaf);
  }
  for(let flower=0;flower<2;flower++) {
    const x=Math.cos(seed+flower*2.1)*.17,z=Math.sin(seed+flower*2.1)*.17;
    const height = .24 + .22 * (.5 + .5 * Math.sin(seed * 3 + flower * 2));
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.012,.016,height,5),m.leafDark);
    stem.name='SUNSHORE_FLOWER_STEM';stem.position.set(x,height*.5,z);root.add(stem);
    for(let petal=0;petal<5;petal++) {
      const a=petal*Math.PI*2/5;
      const shape=new THREE.Mesh(new THREE.SphereGeometry(.055,6,4),flower%2?m.flowerCoral:m.flowerPink);shape.name=`SUNSHORE_V2_PETAL_${flower}_${petal}`;shape.scale.set(1.25,.7,.9);shape.rotation.z=Math.cos(a)*.2;shape.position.set(x+Math.cos(a)*.052,height,z+Math.sin(a)*.052);root.add(shape);
    }
    const center=new THREE.Mesh(new THREE.SphereGeometry(.028,6,4),m.mangoGold);center.name=`SUNSHORE_V2_FLOWER_HEART_${flower}`;center.position.set(x,height+.03,z);root.add(center);
  }
  return root;
}
