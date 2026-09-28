import * as THREE from 'three';
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
/** Continuous longitudinal cross-sections: skull, cheek and tapered long snout share one skin. */
export const seaDragonHeadSections=[[-1.15,.43,.44,0],[-.85,.47,.49,.035],[-.52,.56,.56,.10],[-.12,.61,.57,.13],[.27,.55,.48,.095],[.62,.43,.32,-.015],[1.06,.38,.235,-.09],[1.44,.29,.19,-.075],[1.62,.10,.105,-.07],[1.66,.006,.012,-.065]];
export function seaDragonHeadGeometry(){
 const sections=seaDragonHeadSections,n=24,p:number[]=[],idx:number[]=[];
 for(const[z,rx,ry,cy]of sections)for(let j=0;j<n;j++){const a=j/n*Math.PI*2;p.push(Math.cos(a)*rx,cy+Math.sin(a)*ry,z);}
 for(let i=0;i<sections.length-1;i++)for(let j=0;j<n;j++){const a=i*n+j,b=i*n+(j+1)%n,c=(i+1)*n+j,d=(i+1)*n+(j+1)%n;idx.push(a,b,c,b,d,c);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
export function taperedOrganicTube(points:THREE.Vector3[],base:number,tip:number,segments=18,sides=8){
 const curve=new THREE.CatmullRomCurve3(points),frames=curve.computeFrenetFrames(segments,false),p:number[]=[],idx:number[]=[];
 for(let i=0;i<=segments;i++){const t=i/segments,c=curve.getPointAt(t),r=THREE.MathUtils.lerp(base,tip,Math.pow(t,.72));for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2,v=c.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);p.push(v.x,v.y,v.z);}}
 for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides,c=(i+1)*sides+j,d=(i+1)*sides+(j+1)%sides;idx.push(a,b,c,b,d,c);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
/** Long flattened scapular root buried in the torso; no circular root cuff. */
function seaDragonShoulderGeometry(side:number){
 const sections=[[.12,0,0,1.08,.28],[.50,-.035,.025,1.00,.27],[.78,-.085,.05,.83,.245],[.96,-.145,.077,.61,.21],[1.12,-.21,.10,.38,.18],[1.30,-.27,.124,.215,.155],[1.46,-.32,.14,.15,.15]];
 const p:number[]=[],idx:number[]=[],n=20;
 // Catmull interpolation of cross-sections keeps the shoulder taper derivative continuous.
 const center=new THREE.CatmullRomCurve3(sections.map(([z,x,y])=>V(x,y,side*z)));
 const profile=new THREE.CatmullRomCurve3(sections.map(([z,x,y,rx,ry])=>V(rx,ry,0)));
 const rows=30;
 for(let i=0;i<=rows;i++){const t=i/rows,c=center.getPoint(t),r=profile.getPoint(t);for(let j=0;j<n;j++){const a=j/n*Math.PI*2;p.push(c.x+Math.cos(a)*r.x,c.y+Math.sin(a)*r.y,c.z);}}
 for(let i=0;i<rows;i++)for(let j=0;j<n;j++){const a=i*n+j,b=i*n+(j+1)%n,c=a+n,d=b+n;if(side>0)idx.push(a,b,c,b,d,c);else idx.push(a,c,b,b,c,d);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
/** Shoulder → elbow → wrist, then three finger rays: the membrane is not rooted at the body. */
export function addSeaDragonArticulatedWing(group:THREE.Group,side:-1|1,skin:THREE.Material,membrane:THREE.Material,ivory:THREE.Material){
 const shoulder=V(0,0,side*.58),elbow=V(-.32,.14,side*1.46),wrist=V(.93,.56,side*2.16);
 const mesh=(n:string,g:THREE.BufferGeometry,m:THREE.Material)=>{const o=new THREE.Mesh(g,m);o.name=group.name+'_'+n;o.castShadow=true;o.receiveShadow=true;group.add(o);return o;};
 mesh('MUSCULAR_SHOULDER_GUSSET',seaDragonShoulderGeometry(side),skin);
 mesh('FOREARM',taperedOrganicTube([elbow,V(.28,.35,side*1.78),wrist],.145,.09,12),skin);
 for(const[p,r]of [[elbow,.15],[wrist,.11]] as const){const o=mesh('ARTICULATED_JOINT',new THREE.SphereGeometry(r,10,7),skin);o.position.copy(p);}
 const tips=[V(2.45,.35,side*4.95),V(-.48,-.12,side*4.35),V(-1.72,-.17,side*3.05)];
 const curves=tips.map((tip,i)=>new THREE.CatmullRomCurve3([wrist,V((wrist.x+tip.x)/2+.18,.46-i*.15,side*(Math.abs(wrist.z+tip.z)/2+.12)),tip]));
 const inner=new THREE.CatmullRomCurve3([wrist,V(-.15,.08,side*1.40),V(-1.0,-.12,side*.60)]);
 const boundaries=[...curves,inner];
 for(let i=0;i<3;i++){
  mesh('WING_FINGER_'+i,taperedOrganicTube(curves[i].getPoints(5),.079,.016,16,7),skin);
  mesh('FINGER_CLAW_'+i,taperedOrganicTube([tips[i],tips[i].clone().add(V(-.065,-.02,side*.08)),tips[i].clone().add(V(-.14,-.12,side*.10))],.034,.002,7,6),ivory);
  const p:number[]=[],idx:number[]=[],rows=12,cols=8;
  for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){const t=r/rows,u=c/cols,scalloped=t*(1-.19*Math.sin(Math.PI*u)*t*t),a=boundaries[i].getPoint(scalloped),b=boundaries[i+1].getPoint(scalloped),v=a.lerp(b,u);v.y+=Math.sin(Math.PI*u)*Math.sin(Math.PI*t)*.13;p.push(v.x,v.y,v.z);}
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const a=r*(cols+1)+c,b=a+cols+1;idx.push(a,b,a+1,a+1,b,b+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();mesh('SCALLOPED_MEMBRANE_PANEL_'+i,g,membrane);
 }
 const forearmPivot=new THREE.Group();forearmPivot.name=group.name+'_ELBOW_PIVOT';forearmPivot.position.copy(elbow);group.add(forearmPivot);
 const wristPivot=new THREE.Group();wristPivot.name=group.name+'_WRIST_PIVOT';wristPivot.position.copy(wrist);group.add(wristPivot);group.updateMatrixWorld(true);forearmPivot.attach(wristPivot);
 for(const child of [...group.children]){if(!(child instanceof THREE.Mesh))continue;if(child.name.includes('FOREARM'))forearmPivot.attach(child);else if(child.name.includes('WING_FINGER')||child.name.includes('FINGER_CLAW')||child.name.includes('SCALLOPED_MEMBRANE')||child.position.distanceTo(wrist)<.001)wristPivot.attach(child);}
 group.userData.setAnatomicalFold=(fold:number)=>{forearmPivot.rotation.y=side*fold*.65;wristPivot.rotation.y=-side*fold*1.0;};

}

/** Closed swept fin, cross-sections have finite camber and thickness in every view. */
export function seaDragonFinVolume(side:number,kind:'tail'|'crest'|'cheek'){
 const p:number[]=[],idx:number[]=[],n=12,rows=18;
 for(let i=0;i<=rows;i++){
  const t=i/rows, belly=Math.sin(Math.PI*t),width=(.04+.43*Math.pow(belly,.75))*(i===rows?.08:1);
  const thickness=kind==='tail'?.018+.115*belly:.012+.040*Math.pow(1-t,.65);
  let c:THREE.Vector3;
  if(kind==='tail')c=V(-.05-1.15*t, .12*Math.sin(Math.PI*t)+.24*t*t,side*(.02+1.35*t));
  else if(kind==='crest')c=V(-.10-.88*t*t,-.18+1.38*t,0);
  else c=V(side*(.39+.41*t),.015+.28*t,-.40-.85*t);
  for(let j=0;j<n;j++){const a=j/n*Math.PI*2;
   const v=kind==='tail'?c.clone().add(V(width*Math.cos(a),thickness*Math.sin(a),0)):
    kind==='crest'?c.clone().add(V((.012+.52*Math.pow(1-t,1.15))*Math.cos(a),0,thickness*Math.sin(a))):c.clone().add(V(thickness*Math.sin(a),(.009+.29*Math.pow(1-t,.95))*Math.cos(a),0));
   p.push(v.x,v.y,v.z);
  }
 }
 for(let i=0;i<rows;i++)for(let j=0;j<n;j++){const a=i*n+j,b=i*n+(j+1)%n,c=a+n,d=b+n;idx.push(a,b,c,b,d,c);}
 for(let j=1;j<n-1;j++){idx.push(0,j+1,j);const a=rows*n;idx.push(a,a+j,a+j+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();
 // Orient each closed surface globally using signed volume.
 let volume=0;const va=new THREE.Vector3(),vb=new THREE.Vector3(),vc=new THREE.Vector3();
 for(let i=0;i<idx.length;i+=3){va.fromArray(p,idx[i]*3);vb.fromArray(p,idx[i+1]*3);vc.fromArray(p,idx[i+2]*3);volume+=va.dot(vb.cross(vc));}
 if(volume<0){for(let i=0;i<idx.length;i+=3)[idx[i+1],idx[i+2]]=[idx[i+2],idx[i+1]];g.setIndex(idx);g.computeVertexNormals();}
 return g;
}
