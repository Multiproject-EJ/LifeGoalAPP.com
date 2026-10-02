import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Island3DQuality } from './island5ThreePilotContract';

/** One original, terrain-grown reef bed under the outward face of the archive.
 * World-space presentation geometry; no board, construction or gameplay ownership. */
export function createIsland7ArchiveReefGardenV2(shelf: THREE.Object3D, quality: Island3DQuality) {
  const root = new THREE.Group(); root.name = 'ISLAND_7_ARCHIVE_CONTINUOUS_REEF_GARDEN_V2';
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0,-1,0);
  shelf.updateWorldMatrix(true,true);
  const ground = (x:number,z:number): THREE.Vector3 | null => {
    if(Math.hypot(x,z)<4.3)return null;
    ray.set(new THREE.Vector3(x,20,z),down);const hit=ray.intersectObject(shelf,true)[0];
    return hit&&hit.point.y>-3.2&&hit.point.y<.3?hit.point.clone():null;
  };
  const rows=quality==='low'?10:16, columns=4;
  const positions:number[]=[],indices:number[]=[],anchors:THREE.Vector3[]=[];
  // A closed irregular encrusting skin follows sampled relief, never a flat disc.
  for(let layer=0;layer<2;layer++)for(let i=0;i<=rows;i++)for(let j=0;j<=columns;j++){
    const u=i/rows,v=j/columns,x=-5.57+u*2.03;
    const z=4.80+(v-.5)*(.32+.12*Math.sin(u*9.4))+.035*Math.sin(u*19);
    const p=ground(x,z);
    if(!p){root.userData.placementFailure={x,z};return {root,setNight:(_amount:number)=>{},animate:(_elapsed:number)=>{}};}
    const point=p.add(new THREE.Vector3(0,layer===0?-.11:-.22,0));positions.push(point.x,point.y,point.z);
    if(layer===0)anchors.push(point.clone());
  }
  const stride=columns+1,layerSize=(rows+1)*stride;
  const quad=(a:number,b:number,c:number,d:number)=>indices.push(a,b,d,b,c,d);
  for(let i=0;i<rows;i++)for(let j=0;j<columns;j++){const a=i*stride+j;quad(a,a+1,a+stride+1,a+stride);quad(a+layerSize,a+stride+layerSize,a+stride+1+layerSize,a+1+layerSize);}
  for(let i=0;i<rows;i++){const a=i*stride,b=a+columns;quad(a,a+stride,a+stride+layerSize,a+layerSize);quad(b,b+layerSize,b+stride+layerSize,b+stride);}
  for(let j=0;j<columns;j++){quad(j,j+layerSize,j+1+layerSize,j+1);const a=rows*stride+j;quad(a,a+1,a+1+layerSize,a+layerSize);}
  const baseGeometry=new THREE.BufferGeometry();baseGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));baseGeometry.setIndex(indices);baseGeometry.computeVertexNormals();
  const baseMaterial=new THREE.MeshStandardMaterial({color:0x243e35,roughness:.92,emissive:0x124c43,emissiveIntensity:.025});
  const branchMaterial=new THREE.MeshStandardMaterial({color:0x54865b,roughness:.72,emissive:0x259eae,emissiveIntensity:.02});
  const tipMaterial=new THREE.MeshStandardMaterial({color:0x8ca875,roughness:.6,emissive:0x71b5cb,emissiveIntensity:.05});
  const pieces:THREE.BufferGeometry[]=[],tips:THREE.BufferGeometry[]=[];
  const branch=(a:THREE.Vector3,b:THREE.Vector3,r:number)=>{const delta=b.clone().sub(a);const g=new THREE.CylinderGeometry(r*.68,r,delta.length(),3,1,true);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize()));g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);pieces.push(g);};
  const count=quality==='low'?7:quality==='medium'?14:18;
  for(let k=0;k<count;k++){
    const u=(k+.35)/count, x=-5.51+u*1.89,z=4.8+Math.sin(k*2.399)*.11;
    const p=ground(x,z);if(!p)continue;p.y+=.035;
    const tier=k%3,height=[.31,.56,.88][tier]*(.84+.16*Math.sin(k*1.7)**2),yaw=k*2.399;
    const local=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z).applyAxisAngle(new THREE.Vector3(0,1,0),yaw).add(p);
    const elbow=local(.045,height*.43,.025),crown=local(-.025,height*.77,.06);
    branch(p,elbow,.047);branch(elbow,crown,.035);
    for(const side of [-1,1]){
      const fork=local(side*height*.23,height*.69,-.04);branch(elbow,fork,.029);
      for(const spread of [-1,1]){
        const end=local(side*height*(.30+spread*.10),height*(.90+spread*.09),spread*height*.15);branch(fork,end,.018);
        for(const twig of [-1,1]){const terminal=end.clone().add(new THREE.Vector3(twig*.055,.065+height*.035,twig*.038));branch(end,terminal,.012);const bud=new THREE.OctahedronGeometry(.027);bud.scale(.7,1.5,.75);bud.translate(terminal.x,terminal.y,terminal.z);tips.push(bud);}
      }
    }
    const end=local(.07,height,.06);branch(crown,end,.023);const bud=new THREE.OctahedronGeometry(.031);bud.translate(end.x,end.y,end.z);tips.push(bud);
  }
  const attach=(name:string,g:THREE.BufferGeometry,m:THREE.Material)=>{const mesh=new THREE.Mesh(g,m);mesh.name=name;mesh.receiveShadow=true;root.add(mesh);};
  attach('ISLAND_7_ARCHIVE_ENCRUSTING_CONTINUOUS_BASE',baseGeometry,baseMaterial);
  for(const [name,list,material] of [['ISLAND_7_ARCHIVE_TIERED_CORAL_BRANCHES',pieces,branchMaterial],['ISLAND_7_ARCHIVE_TIERED_CORAL_TIPS',tips,tipMaterial]] as const){const geometry=mergeGeometries([...list],false);list.forEach(g=>g.dispose());if(geometry)attach(name,geometry,material);else material.dispose();}
  const day=[new THREE.Color(0x243e35),new THREE.Color(0x54865b),new THREE.Color(0x8ca875)];
  const night=[new THREE.Color(0x163b40),new THREE.Color(0x4b9296),new THREE.Color(0xa497d8)];
  const setNight=(value:number)=>{const n=THREE.MathUtils.clamp(Number.isFinite(value)?value:0,0,1);[baseMaterial,branchMaterial,tipMaterial].forEach((m,i)=>m.color.copy(day[i]).lerp(night[i],n));baseMaterial.emissiveIntensity=.025+n*.055;branchMaterial.emissiveIntensity=.02+n*.23;tipMaterial.emissiveIntensity=.05+n*.55;};
  root.userData={presentationOnly:true,representation:'continuous-raycast-archive-reef-bed-v001',macroApproval:'pending',quality,tiers:3,branchingColonies:count,sampledTerrainAnchors:anchors.length};
  root.updateMatrixWorld(true);setNight(0);return {root,setNight,animate:(_elapsed:number)=>{}};
}
