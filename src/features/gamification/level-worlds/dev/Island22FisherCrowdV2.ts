import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';

/** Jointed small oilskin fishermen, batched by surface; preserves the existing evacuation input. */
export function createHarborFisherCrowdV2(
  parent: THREE.Group, quality: Island3DQuality,
  platformPose: (index:number,count:number)=>{angle:number;radius:number;yaw:number},
) {
  const count=quality==='low'?7:quality==='medium'?11:15;
  const group=new THREE.Group();group.name='ISLAND_006_FISHER_CREW_V2';parent.add(group);
  const coats=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.66});
  const skin=new THREE.MeshStandardMaterial({color:0xe1a474,roughness:.85});
  const rubber=new THREE.MeshStandardMaterial({color:0x283739,roughness:.75});
  const wool=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1});
  const ivory=new THREE.MeshStandardMaterial({color:0xe0d5b6,roughness:.9});
  const dark=new THREE.MeshStandardMaterial({color:0x302721,roughness:.85});
  const lineMat=new THREE.LineBasicMaterial({color:0xd5dfd3,transparent:true,opacity:.48});
  const batches:THREE.InstancedMesh[]=[];
  const batch=(name:string,geometry:THREE.BufferGeometry,material:THREE.Material,n=count)=>{
    const m=new THREE.InstancedMesh(geometry,material,n);m.name='ISLAND_006_FISHERS_'+name;m.castShadow=true;m.receiveShadow=true;group.add(m);batches.push(m);return m;
  };
  const bodies=batch('OILSKIN_TORSOS',new THREE.CapsuleGeometry(.10,.19,3,10),coats);
  const skirts=batch('COAT_HEMS',new THREE.CylinderGeometry(.112,.14,.15,10),coats);
  const heads=batch('FACES',new THREE.SphereGeometry(.108,12,9),skin);
  const ears=batch('EARS',new THREE.SphereGeometry(.027,7,5),skin,count*2);
  const nose=batch('NOSES',new THREE.SphereGeometry(.026,7,6),skin);
  const eyes=batch('EYES',new THREE.SphereGeometry(.014,6,4),dark,count*2);
  const beards=batch('BEARDS',new THREE.SphereGeometry(.089,10,7),ivory);
  const hats=batch('WOOL_CAPS',new THREE.SphereGeometry(.116,12,8,0,Math.PI*2,0,Math.PI/2),wool);
  const rims=batch('CAP_ROLLS',new THREE.TorusGeometry(.108,.025,5,12),wool);
  const sleeves=batch('BENT_SLEEVES',new THREE.CapsuleGeometry(.04,.12,2,7),coats,count*4);
  const hands=batch('HANDS',new THREE.SphereGeometry(.041,8,6),skin,count*2);
  const legs=batch('TROUSERS',new THREE.CapsuleGeometry(.045,.12,2,7),rubber,count*2);
  const boots=batch('DECK_BOOTS',new THREE.SphereGeometry(1,8,6),rubber,count*2);
  const collars=batch('COLLARS',new THREE.TorusGeometry(.08,.023,5,12),ivory);
  const buttons=batch('COAT_BUTTONS',new THREE.SphereGeometry(.012,5,4),ivory,count*3);
  const rods=batch('RODS',new THREE.CylinderGeometry(.009,.013,1,5),dark);
  const reel=batch('REELS',new THREE.TorusGeometry(.044,.012,5,8),rubber);
  const linePositions=new Float32Array(count*6),lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.BufferAttribute(linePositions,3));
  const lines=new THREE.LineSegments(lineGeo,lineMat);lines.name='ISLAND_006_FISHING_LINES';lines.frustumCulled=false;group.add(lines);
  const dummy=new THREE.Object3D(),parentMatrix=new THREE.Matrix4(),matrix=new THREE.Matrix4();
  const zero=new THREE.Vector3(),scale=new THREE.Vector3(.8,.8,.8),q=new THREE.Quaternion();
  const a=new THREE.Vector3(),b=new THREE.Vector3(),direction=new THREE.Vector3();
  const yAxis=new THREE.Vector3(0,1,0);
  const palette=[0xd4a02c,0x286b70,0xbe6747,0x4b6272,0xd8b553];
  for(let i=0;i<count;i++){
    for(const m of [bodies,skirts])m.setColorAt(i,new THREE.Color(palette[i%palette.length]));
    for(let j=0;j<4;j++)sleeves.setColorAt(i*4+j,new THREE.Color(palette[i%palette.length]));
    for(const m of [hats,rims])m.setColorAt(i,new THREE.Color(i%3===0?0xdca541:i%3===1?0x314e57:0x9b5b42));
  }
  const place=(mesh:THREE.InstancedMesh,index:number,x:number,y:number,z:number,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0)=>{
    dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();matrix.multiplyMatrices(parentMatrix,dummy.matrix);mesh.setMatrixAt(index,matrix);
  };
  const limb=(mesh:THREE.InstancedMesh,index:number,from:THREE.Vector3,to:THREE.Vector3,length:number)=>{
    direction.subVectors(to,from);dummy.position.copy(from).addScaledVector(direction,.5);dummy.quaternion.setFromUnitVectors(yAxis,direction.clone().normalize());dummy.scale.set(1,direction.length()/length,1);dummy.updateMatrix();matrix.multiplyMatrices(parentMatrix,dummy.matrix);mesh.setMatrixAt(index,matrix);
  };
  const update=(progress:number,panic:number)=>{
    for(let i=0;i<count;i++){
      const pose=platformPose(i,count),route=i===0?-1.7:i===1?7.8:3.8+i%4*.8;
      const wobble=Math.sin(progress*Math.PI*10+i)*panic*.12;
      const angle=pose.angle+wobble,r=pose.radius+route*progress;
      const jump=Math.abs(Math.sin(progress*Math.PI*(4+i%3)))*panic*.22;
      const x=Math.cos(angle)*r,z=Math.sin(angle)*r;
      const yaw=Math.atan2(-Math.cos(angle),-Math.sin(angle));
      q.setFromEuler(new THREE.Euler(0,yaw,0));parentMatrix.compose(zero.set(x,.76+jump,z),q,scale);
      const lean=(i%3-1)*.035;
      place(bodies,i,0,.37,.012,1.14,1,.87,.1+lean);
      place(skirts,i,0,.26,0,1.02,1,.86);
      place(heads,i,0,.62,.027,1,1.06,.95);
      place(nose,i,0,.615,.132,1,1,1.25);
      place(beards,i,0,.568,.082,.91,.60,.66);
      place(hats,i,0,.675,.015,1,1,.98,-.12);
      place(rims,i,0,.682,.015,1,1,1,Math.PI/2-.12);
      place(collars,i,0,.51,.01,1,1,1,Math.PI/2);
      for(let j=0;j<3;j++)place(buttons,i*3+j,0,.29+j*.075,.116);
      for(const side of [-1,1]){
        const j=i*2+(side>0?1:0);
        place(ears,j,side*.105,.623,.02,.8,1,.7);
        place(eyes,j,side*.043,.644,.12);
        place(legs,j,side*.065,.13,side===1?.02:-.015,1,1,1);
        place(boots,j,side*.065,.047,.047,.057,.056,.098);
        const shoulder=new THREE.Vector3(side*.121,.465,.01);
        const elbow=new THREE.Vector3(side*.175,.345,.07+panic*.12);
        const hand=new THREE.Vector3(side*.073,.397,.23+panic*.10);
        limb(sleeves,i*4+(side>0?2:0),shoulder,elbow,.20);
        limb(sleeves,i*4+(side>0?3:1),elbow,hand,.20);
        place(hands,j,hand.x,hand.y,hand.z);
      }
      a.set(.073,.398,.25);b.set(.025,1.01,.91);limb(rods,i,a,b,1);
      place(reel,i,.071,.414,.25,1,1,1,0,Math.PI/2);
      b.applyMatrix4(parentMatrix);a.set(0,.04,1.28).applyMatrix4(parentMatrix);
      const k=i*6;linePositions.set([b.x,b.y,b.z,a.x,a.y,a.z],k);
    }
    lines.visible=panic<.3;
    lineGeo.attributes.position.needsUpdate=true;
    for(const m of batches){m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();}
  };
  update(0,0);return update;
}
