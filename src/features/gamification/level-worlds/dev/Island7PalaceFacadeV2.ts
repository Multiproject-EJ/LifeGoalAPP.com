import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Island3DQuality } from './island5ThreePilotContract';

/** Attach once while the authored palace is still in local space, after its stage
 * meshes are present. All new work belongs to L2; ray targets exclude L3 so paid
 * geometry stays identical when L3 is added. Existing geometry is never mutated. */
export function createIsland7PalaceFacadeV2(palace: THREE.Group, quality: Island3DQuality, neutralMaterial?: THREE.Material) {
  const root=new THREE.Group();root.name='ISLAND_7_PALACE_FACADE_V2';root.userData={constructionLevel:2,macroApproval:'pending',presentationOnly:true};
  const stage=palace.getObjectByName('ISLAND_7_PALACE_V2_L2');
  if(!stage)return {root,setNight:(_amount:number)=>{}};
  palace.updateWorldMatrix(true,true);
  const inverse=new THREE.Matrix4().copy(palace.matrixWorld).invert();
  const gold:THREE.BufferGeometry[]=[],pearl:THREE.BufferGeometry[]=[],shadow:THREE.BufferGeometry[]=[];
  const shape=(w:number,h:number,bottom=0)=>{const s=new THREE.Shape();s.moveTo(-w/2,bottom);s.lineTo(w/2,bottom);s.lineTo(w/2,bottom+h*.62);s.quadraticCurveTo(w/2,bottom+h*.85,0,bottom+h);s.quadraticCurveTo(-w/2,bottom+h*.85,-w/2,bottom+h*.62);s.closePath();return s;};
  const frame=(w:number,h:number,border:number,depth:number,bottom=0)=>{const s=shape(w,h,bottom),hole=shape(w-border*2,h-border*2,bottom+border);s.holes.push(new THREE.Path(hole.getPoints(quality==='low'?3:5)));return new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:quality==='low'?3:5});};
  // Concentric masonry reveals physically embed in the existing entrance bay;
  // the warm door remains visible through all three openings below the pearl.
  const entryOuter=frame(.66,.68,.065,.065,.35);entryOuter.translate(0,0,1.365);pearl.push(entryOuter);
  const entryRecess=frame(.535,.59,.04,.02,.365);entryRecess.translate(0,0,1.410);shadow.push(entryRecess);
  const entryInner=frame(.455,.555,.035,.035,.375);entryInner.translate(0,0,1.415);gold.push(entryInner);
  // Golden structural seams adhere to sampled canopy surface at each segment.
  const canopy=palace.getObjectByName('ISLAND_7_PALACE_V2_INTEGRATED_SHELL_CANOPY_AND_PEARL_BAY');
  const ray=new THREE.Raycaster(),normalMatrix=new THREE.Matrix3();let ribSegments=0,rayHits=0;
  const beam=(a:THREE.Vector3,b:THREE.Vector3,r:number)=>{const delta=b.clone().sub(a),g=new THREE.CylinderGeometry(r,r,delta.length(),quality==='low'?3:4,1,true);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize()));g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);gold.push(g);ribSegments++;};
  if(canopy){const meridians=quality==='low'?4:6,samples=quality==='low'?8:11;
    for(let k=0;k<meridians;k++){
      const angle=(k+.5)*Math.PI*2/meridians,outward=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle));let previous:THREE.Vector3|null=null;
      for(let j=0;j<samples;j++){
        const y=1.38+j/(samples-1)*1.25;
        const origin=outward.clone().multiplyScalar(3).setY(y);origin.z-=.12;origin.applyMatrix4(palace.matrixWorld);
        const direction=outward.clone().negate().transformDirection(palace.matrixWorld);ray.set(origin,direction);
        const hit=ray.intersectObject(canopy,false)[0];if(!hit?.face){previous=null;continue;}
        const point=hit.point.clone().applyMatrix4(inverse);if(point.distanceTo(new THREE.Vector3(0,1.45,1.32))<.47){previous=null;continue;}
        normalMatrix.getNormalMatrix(hit.object.matrixWorld);const normal=hit.face.normal.clone().applyMatrix3(normalMatrix).normalize().transformDirection(inverse);
        point.addScaledVector(normal,.007);rayHits++;
        // Gaps in a raycast profile never become unsupported cross-shell braces.
        if(previous&&previous.distanceTo(point)<.25&&Math.hypot(previous.x-point.x,previous.z-point.z)<.10)beam(previous,point,.018);previous=point;
      }
    }
  }
  // A shallow gold reveal surrounds each existing warm perimeter opening.
  const lower=palace.getObjectByName('ISLAND_7_PALACE_V2_L1');
  const targets:THREE.Object3D[]=[];lower?.traverse(n=>{if(n instanceof THREE.Mesh&&!/WINDOW|STAIRS/.test(n.name))targets.push(n);});
  for(let i=0;i<8;i++){
    const angle=(i+.5)*Math.PI/4,outward=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle));
    ray.set(outward.clone().multiplyScalar(3.2).setY(.97).applyMatrix4(palace.matrixWorld),outward.clone().negate().transformDirection(palace.matrixWorld));
    const hit=ray.intersectObjects(targets,false)[0];if(!hit?.face)continue;
    const point=hit.point.clone().applyMatrix4(inverse);normalMatrix.getNormalMatrix(hit.object.matrixWorld);const normal=hit.face.normal.clone().applyMatrix3(normalMatrix).normalize().transformDirection(inverse);
    const geometry=frame(.225,.49,.026,.018,-.225);geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),normal));geometry.translate(point.x+normal.x*.01,point.y+normal.y*.01,point.z+normal.z*.01);gold.push(geometry);
  }
  const goldMaterial=neutralMaterial??new THREE.MeshStandardMaterial({color:0xe8bc76,metalness:.48,roughness:.36,emissive:0x79501b,emissiveIntensity:.06});
  const pearlMaterial=neutralMaterial??new THREE.MeshStandardMaterial({color:0xe8dac1,metalness:.13,roughness:.45});
  const shadowMaterial=neutralMaterial??new THREE.MeshStandardMaterial({color:0x163840,roughness:.87});
  for(const[name,list,material]of[['GOLD_SURFACE_RIBS_AND_WINDOW_REVEALS',gold,goldMaterial],['PEARL_LAYERED_ENTRANCE',pearl,pearlMaterial],['ENTRY_RECESS',shadow,shadowMaterial]]as const){const normalized=list.map(g=>{const n=g.index?g.toNonIndexed():g;n.deleteAttribute('uv');if(n!==g)g.dispose();return n;});const merged=mergeGeometries(normalized,false);normalized.forEach(g=>g.dispose());if(merged){const mesh=new THREE.Mesh(merged,material);mesh.name='ISLAND_7_PALACE_FACADE_'+name;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.constructionLevel=2;root.add(mesh);}else if(!neutralMaterial)material.dispose();}
  root.userData.surfaceRayHits=rayHits;root.userData.surfaceRibSegments=ribSegments;
  const setNight=(amount:number)=>{if(!neutralMaterial&&goldMaterial instanceof THREE.MeshStandardMaterial)goldMaterial.emissiveIntensity=.06+THREE.MathUtils.clamp(Number.isFinite(amount)?amount:0,0,1)*.12;};
  return {root,setNight};
}
