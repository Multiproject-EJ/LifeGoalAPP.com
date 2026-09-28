import * as THREE from 'three';

type BurstOptions={kind:'eruption'|'dive';quality?:'low'|'medium'|'high'};
const clamp=(v:number)=>THREE.MathUtils.clamp(v,0,1);
const random=(i:number,salt=0)=>{const x=Math.sin((i+1)*127.1+salt*311.7)*43758.5453;return x-Math.floor(x);};
/** All motion is sampled from absolute age: deterministic seeking, no accumulated particles. */
export function createSeaDragonWaterBurst({kind,quality='medium'}:BurstOptions){
 const root=new THREE.Group();root.name=`ISLAND_22_${kind.toUpperCase()}_WATER_BURST_V2`;
 const low=quality==='low',isDive=kind==='dive',count=low?64:150,sheets=low?5:8,cols=8,rows=3;
 const water=new THREE.MeshPhysicalMaterial({color:0x72cbd3,roughness:.24,metalness:0,transparent:true,opacity:.56,side:THREE.DoubleSide,depthWrite:false,clearcoat:.35});
 const spray=new THREE.MeshStandardMaterial({color:0xbdeaf0,roughness:.30,transparent:true,opacity:.76,depthWrite:false});
 const foamMat=new THREE.MeshBasicMaterial({color:0xe2f7ef,transparent:true,opacity:.45,side:THREE.DoubleSide,depthWrite:false});
 const mistMat=new THREE.MeshBasicMaterial({color:0xcce9e8,transparent:true,opacity:.065,side:THREE.DoubleSide,depthWrite:false});
 const pos=new Float32Array(sheets*(cols+1)*(rows+1)*3),indices:number[]=[];
 for(let s=0;s<sheets;s++)for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const a=s*(cols+1)*(rows+1)+r*(cols+1)+c,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const sheetGeo=new THREE.BufferGeometry();sheetGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));sheetGeo.setIndex(indices);
 const sheetMesh=new THREE.Mesh(sheetGeo,water);sheetMesh.name='BROKEN_CURVED_WATER_SHEETS';sheetMesh.frustumCulled=false;root.add(sheetMesh);
 // Closed pointed drops, deliberately not spheres or cone primitives.
 const dp:number[]=[],di:number[]=[],profile=[[0,.015],[.22,.09],[.52,.11],[.83,.055],[1,0]];
 for(const[y,r]of profile)for(let j=0;j<6;j++){const a=j/6*Math.PI*2;dp.push(Math.cos(a)*r,y-.5,Math.sin(a)*r);}
 for(let i=0;i<4;i++)for(let j=0;j<6;j++){const a=i*6+j,b=i*6+(j+1)%6,c=a+6,d=b+6;di.push(a,c,b,b,c,d);}
 for(let j=1;j<5;j++)di.push(0,j,j+1);
 const dropGeo=new THREE.BufferGeometry();dropGeo.setAttribute('position',new THREE.Float32BufferAttribute(dp,3));dropGeo.setIndex(di);dropGeo.computeVertexNormals();
 const droplets=new THREE.InstancedMesh(dropGeo,spray,count);droplets.name='BALLISTIC_WATER_DROPLETS';droplets.frustumCulled=false;root.add(droplets);
 // Uneven foam flecks and low, irregular mist fans leave large clear water gaps.
 const fan=new THREE.BufferGeometry(),fp=[0,0,0],fi:number[]=[];
 for(let j=0;j<8;j++){const a=j/8*Math.PI*2,r=.65+random(j,3)*.35;fp.push(Math.cos(a)*r,0,Math.sin(a)*r);fi.push(0,j+1,(j+1)%8+1);}
 fan.setAttribute('position',new THREE.Float32BufferAttribute(fp,3));fan.setIndex(fi);fan.computeVertexNormals();
 const foamCount=low?22:42,foam=new THREE.InstancedMesh(fan,foamMat,foamCount),mist=new THREE.InstancedMesh(fan,mistMat,low?6:10);
 foam.name='DISPERSING_FOAM_FLECKS';mist.name='LOW_DISSIPATING_MIST';foam.frustumCulled=mist.frustumCulled=false;root.add(foam,mist);
 const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),velocity=new THREE.Vector3();
 function place(mesh:THREE.InstancedMesh,i:number,x:number,y:number,z:number,sx:number,sy:number,sz:number,q?:THREE.Quaternion){dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.quaternion.copy(q??new THREE.Quaternion());dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
 const q=new THREE.Quaternion();
 function update(age:number,reducedMotion:boolean){
  const valid=Number.isFinite(age)&&age>=0&&age<2.25;root.visible=valid;if(!valid)return;
  const t=age,motion=reducedMotion?.60:1,fade=1-clamp((t-1.0)/1.25),sheetFade=1-clamp((t-.55)/.65);
  water.opacity=.50*sheetFade;sheetMesh.visible=t<1.2;
  for(let s=0;s<sheets;s++){
   const theta=s/sheets*Math.PI*2+random(s,1)*.25,span=.22+random(s,2)*.31;
   const radius=(isDive?.62:2.65)+(isDive?6.8:4.0)*t;
   const height=Math.max(0,(isDive?18.5:20.0)*t-18*t*t)*motion;
   for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){
    const u=c/cols,v=r/rows,angle=theta+(u-.5)*span;
    const scallop=.67+.33*Math.sin(u*Math.PI),y=.04+height*v*scallop*(.75+random(s,4)*.3);
    const radial=radius+(v*v*.85-v*.25)*height+.14*Math.sin(u*8+s)*v;
    const k=(s*(cols+1)*(rows+1)+r*(cols+1)+c)*3;pos[k]=Math.cos(angle)*radial;pos[k+1]=y;pos[k+2]=Math.sin(angle)*radial;
   }
  }
  sheetGeo.attributes.position.needsUpdate=true;sheetGeo.computeVertexNormals();
  spray.opacity=.78*fade;
  for(let i=0;i<count;i++){
   const delay=random(i,8)*.14,dt=t-delay,a=random(i,9)*Math.PI*2,r0=isDive?.35+random(i,10)*.6:2.5+random(i,10)*.65;
   const speed=(3+random(i,11)*5.0),rise=((isDive?10:8)+random(i,12)*(isDive?8:10))*motion,g=isDive?34:22;
   const y=rise*dt-.5*g*dt*dt,r=r0+speed*dt,visible=dt>=0&&y>=0;
   velocity.set(Math.cos(a)*speed,rise-g*dt,Math.sin(a)*speed).normalize();q.setFromUnitVectors(up,velocity);
   const size=visible?(.65+random(i,13)*1.3)*fade:0;
   place(droplets,i,Math.cos(a)*r,Math.max(.015,y),Math.sin(a)*r,size,size*(.32+random(i,14)*.38),size,q);
  }
  foamMat.opacity=.48*fade*clamp(t/.12);
  for(let i=0;i<foamCount;i++){const a=random(i,20)*Math.PI*2,r=(isDive?.7:2.8)+(2+random(i,21)*4.3)*t;const size=(.18+random(i,22)*.34)*(1+t*.5);place(foam,i,Math.cos(a)*r,.025+random(i,23)*.016,Math.sin(a)*r,size,1,size*.45);}
  mistMat.opacity=.075*fade*Math.sin(clamp(t/1.8)*Math.PI);
  for(let i=0;i<mist.count;i++){const a=random(i,30)*Math.PI*2,r=(isDive?1:2.8)+t*(2+random(i,31)*3);const size=.55+t*.7;dummy.rotation.set(.20*Math.sin(a),a,.16*Math.cos(a));q.copy(dummy.quaternion);place(mist,i,Math.cos(a)*r,.12+Math.sin(clamp(t)*Math.PI)*.3,Math.sin(a)*r,size,1,size*.7,q);}
  droplets.instanceMatrix.needsUpdate=true;foam.instanceMatrix.needsUpdate=true;mist.instanceMatrix.needsUpdate=true;
 }
 update(-1,false);
 return {root,update,dispose(){sheetGeo.dispose();dropGeo.dispose();fan.dispose();water.dispose();spray.dispose();foamMat.dispose();mistMat.dispose();root.removeFromParent();}};
}
