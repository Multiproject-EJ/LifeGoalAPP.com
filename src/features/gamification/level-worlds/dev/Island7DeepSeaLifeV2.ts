import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Island3DQuality } from './island5ThreePilotContract';

/** Original distant volumetric life. Fixed world routes pass behind the kingdom,
 * with paired eyes attached to the same head poses. No camera/gameplay ownership. */
export function createIsland7DeepSeaLifeV2(quality:Island3DQuality) {
  const root=new THREE.Group();root.name='ISLAND_7_DEEP_SEA_LIFE_V2';
  const count=quality==='low'?2:3;
  const makeBody=()=>{
    const positions:number[]=[],indices:number[]=[];
    const sections=[[-2.6,.035,.045],[-1.5,.19,.25],[-.4,.42,.50],[.55,.46,.55],[1.25,.30,.36],[1.58,.06,.08]],sides=quality==='low'?6:8;
    for(const[x,ry,rz]of sections)for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2;positions.push(x,Math.cos(a)*ry,Math.sin(a)*rz);}
    for(let i=0;i<sections.length-1;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides,c=b+sides,d=a+sides;indices.push(a,b,d,b,c,d);}
    for(const row of[0,sections.length-1]){const c=positions.length/3;positions.push(sections[row][0],0,0);for(let j=0;j<sides;j++){const a=row*sides+j,b=row*sides+(j+1)%sides;row===0?indices.push(c,b,a):indices.push(c,a,b);}}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
  };
  // Closed cambered wings have a finite central thickness and swept tips.
  const wing=(side:number)=>{const p=[.62,-.07,side*.22,-.28,-.04,side*1.1,-.90,-.02,side*1.35,-1.06,-.16,side*.95,-.55,-.12,side*.20,-.38,.09,side*.70,-.38,-.22,side*.70],indices:number[]=[];for(let i=0;i<5;i++){const j=(i+1)%5;indices.push(i,j,5,j,i,6);}let volume=0;for(let i=0;i<indices.length;i+=3){const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;volume+=(p[a]*(p[b+1]*p[c+2]-p[b+2]*p[c+1])+p[a+1]*(p[b+2]*p[c]-p[b]*p[c+2])+p[a+2]*(p[b]*p[c+1]-p[b+1]*p[c]))/6;}if(volume<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();return g;};
  const inputs=[makeBody(),wing(-1),wing(1)].map(g=>{const n=g.toNonIndexed();g.dispose();return n;});
  const geometry=mergeGeometries(inputs,false)!;inputs.forEach(g=>g.dispose());
  const material=new THREE.MeshBasicMaterial({color:0xffffff,fog:false});
  const creatures=new THREE.InstancedMesh(geometry,material,count);creatures.name='ISLAND_7_DISTANT_SWIMMING_SHADOWS';creatures.frustumCulled=false;creatures.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(creatures);
  const eyeGeometry=new THREE.SphereGeometry(.075,6,3);const eyeMaterial=new THREE.MeshBasicMaterial({color:new THREE.Color(0.65,1.8,1.65),transparent:true,opacity:0,depthWrite:false});
  const eyes=new THREE.InstancedMesh(eyeGeometry,eyeMaterial,count*2);eyes.name='ISLAND_7_DISTANT_HEAD_EYES';eyes.frustumCulled=false;eyes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(eyes);
  const pose=new THREE.Object3D(),eyePose=new THREE.Object3D(),eyeLocal=new THREE.Vector3(),eyeWorld=new THREE.Vector3();let night=0,lastElapsed=0;
  const dayShadow=new THREE.Color(0x245e6b),dayWater=new THREE.Color(0x388497),nightShadow=new THREE.Color(0x081a30),nightWater=new THREE.Color(0x0c2942),shadowColor=new THREE.Color(),eyeFade=new THREE.Color();
  const animate=(elapsed:number)=>{
    lastElapsed=Number.isFinite(elapsed)?Math.max(0,elapsed):0;
    for(let i=0;i<count;i++){
      const phase=lastElapsed*(.016+i*.003)+i*2.15;
      // A wide ellipse gives an unbroken pass; all z remain behind the board.
      const x=Math.sin(phase)*(9+i*1.2),z=-16-i*5+Math.cos(phase)*3.0,y=3.4+i*.6+Math.sin(phase*.73+i)*.48;
      const fade=THREE.MathUtils.clamp((-z-13)/20,.05,.86);
      shadowColor.copy(night>.5?nightShadow:dayShadow).lerp(night>.5?nightWater:dayWater,fade);creatures.setColorAt(i,shadowColor);
      eyeFade.setScalar(1-fade*.65);eyes.setColorAt(i*2,eyeFade);eyes.setColorAt(i*2+1,eyeFade);
      const dx=Math.cos(phase)*(9+i*1.2),dz=-Math.sin(phase)*3.0;
      pose.position.set(x,y,z);pose.rotation.set(0,-Math.atan2(dz,dx),Math.sin(phase*.9)*.025);pose.scale.setScalar(1.28+i*.28);pose.updateMatrix();creatures.setMatrixAt(i,pose.matrix);
      for(let side=0;side<2;side++){
        eyeLocal.set(1.10,.015,(side?1:-1)*.397);eyeWorld.copy(eyeLocal).applyMatrix4(pose.matrix);eyePose.position.copy(eyeWorld);eyePose.quaternion.copy(pose.quaternion);
        const visibility=.62+.38*Math.sin(phase*.37+i*.9)**2;
        eyePose.scale.setScalar((1.28+i*.28)*visibility);eyePose.updateMatrix();eyes.setMatrixAt(i*2+side,eyePose.matrix);
      }
    }
    creatures.instanceMatrix.needsUpdate=true;eyes.instanceMatrix.needsUpdate=true;
    if(creatures.instanceColor)creatures.instanceColor.needsUpdate=true;if(eyes.instanceColor)eyes.instanceColor.needsUpdate=true;
    root.updateMatrix();root.updateMatrixWorld(true);creatures.updateMatrix();creatures.updateMatrixWorld(true);eyes.updateMatrix();eyes.updateMatrixWorld(true);
    eyeMaterial.opacity=night*(.52+.12*Math.sin(lastElapsed*.035)**2);
  };
  const setNight=(amount:number)=>{night=THREE.MathUtils.clamp(Number.isFinite(amount)?amount:0,0,1);animate(lastElapsed);};
  animate(0);root.userData={presentationOnly:true,macroApproval:'pending',creatureCount:count,trianglesPerCreature:quality==='low'?92:116,eyeTriangles:count*48,placement:'world-space upper canyon: z -13 to -29, y approximately3–5',reducedMotion:'stop animate calls to freeze all motion'};
  return{root,setNight,animate};
}
