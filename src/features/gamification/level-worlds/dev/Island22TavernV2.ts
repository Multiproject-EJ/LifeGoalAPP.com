import * as THREE from 'three';
import type { Island22PremiumLandmarkFactoryOptions } from './Island22PremiumLandmarkFamilies';
type Groups={macro:THREE.Group;lantern:THREE.Group;occupied:THREE.Group};
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
const radial=(r:number,a:number,y:number)=>V(Math.sin(a)*r,y,Math.cos(a)*r);
function woodGrainTexture() {
  const n=128,data=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const grain=Math.sin(x*.85+Math.sin(y*.035+x*.1)*.9)*.035+Math.sin(x*2.1+y*.015)*.022;
    const noise=(Math.sin(x*12.9898+y*78.233)*43758.5453)%1*.016;
    const v=Math.round(225+(grain+noise)*255),i=(y*n+x)*4;
    data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;
  }
  const map=new THREE.DataTexture(data,n,n,THREE.RGBAFormat);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;return map;
}

/** One continuous octagonal tavern; construction ownership remains in the canonical factory. */
export function populateIsland22TavernV2({macro,lantern,occupied}:Groups,{quality}:Island22PremiumLandmarkFactoryOptions){
 const low=quality==='low';
 const mat=(color:number,roughness=.88)=>new THREE.MeshStandardMaterial({color,roughness});
 const plaster=mat(0xe5d1af),wood=mat(0x755034),dark=mat(0x423126),deck=mat(0xa17a4b),stone=mat(0x92988d),slate=mat(0x435968),copper=mat(0x976647,.65);
 // The thin continuous roof casts a solid shadow from either side.
 slate.shadowSide=THREE.DoubleSide;
 const grain=woodGrainTexture();for(const m of [wood,dark,deck])m.map=grain;
 const glass=new THREE.MeshStandardMaterial({color:0xf3bc54,emissive:0xeea236,emissiveIntensity:.42,roughness:.42});
 const add=(g:THREE.Group,name:string,geo:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0)=>{const mesh=new THREE.Mesh(geo,m);mesh.name='ISLAND_006_TAVERN_'+name;mesh.position.set(x,y,z);g.add(mesh);return mesh;};
 const box=(g:THREE.Group,name:string,w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number)=>add(g,name,new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const cylinder=(g:THREE.Group,name:string,r:number,h:number,m:THREE.Material,x:number,y:number,z:number,n=8)=>{const mesh=add(g,name,new THREE.CylinderGeometry(r,r,h,n),m,x,y,z);if(n===8)mesh.rotation.y=Math.PI/8;return mesh;};
 const beam=(g:THREE.Group,name:string,a:THREE.Vector3,b:THREE.Vector3,w:number,d:number,m=wood)=>{const mesh=box(g,name,w,a.distanceTo(b),d,m,0,0,0);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());return mesh;};
 const tube=(g:THREE.Group,name:string,points:THREE.Vector3[],r:number,m:THREE.Material,n=10)=>add(g,name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),n,r,4,false),m);
 cylinder(macro,'STONE_QUAY',2.23,.55,stone,0,-.03,0);cylinder(macro,'QUAY_COPING',2.29,.13,stone,0,.3,0);
 // Front steps and split terrace leave a continuous central approach to the door.
 for(let i=0;i<3;i++)box(macro,'ENTRY_STEP',1.02+i*.07,.16,.33,stone,0,-.1+i*.16,2.59-i*.25);
 for(const side of [-1,1]){
  box(macro,'TERRACE_FRAME',.69,.16,.7,wood,side*.96,.4,1.44);
  for(let i=0;i<5;i++)box(macro,'TERRACE_PLANK',.129,.065,.72,deck,side*.96-.27+i*.135,.5,1.44);
 }
 const roofY=(r:number)=>2.01+1.2*Math.pow(Math.max(0,(1.85-r)/1.3),1.5);
 // Octagonal wall faces close exactly against the round bell-roof underside.
 const shellPositions:number[]=[],shellIndices:number[]=[],shellUvs:number[]=[];
 for(let face=0;face<8;face++)for(let j=0;j<=4;j++){
  const a=-Math.PI/8+face*Math.PI/4,p=radial(1.48,a,0).lerp(radial(1.48,a+Math.PI/4,0),j/4);
  shellPositions.push(p.x,.39,p.z,p.x,roofY(Math.hypot(p.x,p.z))-.012,p.z);shellUvs.push(j/4,0,j/4,1);
  if(j<4){const k=face*10+j*2;shellIndices.push(k,k+2,k+1,k+1,k+2,k+3);}
 }
 const shellGeo=new THREE.BufferGeometry();shellGeo.setAttribute('position',new THREE.Float32BufferAttribute(shellPositions,3));shellGeo.setAttribute('uv',new THREE.Float32BufferAttribute(shellUvs,2));shellGeo.setIndex(shellIndices);shellGeo.computeVertexNormals();add(macro,'CONTINUOUS_OCTAGONAL_SHELL',shellGeo,plaster);
 cylinder(macro,'STONE_PLINTH',1.52,.3,stone,0,.52,0);
 for(let i=0;i<8;i++){
  const a=-Math.PI/8+i*Math.PI/4,p=radial(1.475,a,1.35);
  const post=box(macro,'CORNER_TIMBER',.13,1.52,.13,wood,p.x,p.y,p.z);post.rotation.y=a;
  const a2=a+Math.PI/4;
  beam(macro,'EAVE_TIE',radial(1.49,a,2.1),radial(1.49,a2,2.1),.14,.14);
  beam(macro,'PLINTH_RAIL',radial(1.5,a,.67),radial(1.5,a2,.67),.09,.11);
 }
 const sectorPoint=(r:number,t:number,sector:number)=>radial(r,-Math.PI/8+(sector+t)*Math.PI/4,roofY(r));
 for(let sector=0;sector<8;sector++){
  const p:number[]=[],uv:number[]=[],idx:number[]=[];
  for(let row=0;row<=8;row++){const r=.55+1.3*row/8;for(let col=0;col<=4;col++){p.push(...sectorPoint(r,col/4,sector).toArray());uv.push(col/4,row/8);if(row<8&&col<4){const a=row*5+col;idx.push(a,a+5,a+1,a+1,a+5,a+6);}}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();add(macro,'CONTINUOUS_BELL_ROOF',geo,slate);
  tube(macro,'CONTINUOUS_ROOF_HIP',Array.from({length:17},(_,j)=>sectorPoint(.55+1.3*j/16,0,sector).add(V(0,.055,0))),.029,slate,16);
  tube(macro,'CURVED_EAVE_FASCIA',Array.from({length:9},(_,i)=>sectorPoint(1.85,i/8,sector)),.047,wood,8);
 }
 // Arched openings are tangent to the flat octagonal faces, with continuous shell behind them.
 const arch=(w:number,h:number)=>{const p=new THREE.Shape();p.moveTo(-w/2,0);p.lineTo(w/2,0);p.lineTo(w/2,h-w/2);p.absarc(0,h-w/2,w/2,0,Math.PI,false);p.closePath();return p;};
 const opening=(angle:number,door=false)=>{
  const g=new THREE.Group();g.position.copy(radial(1.373,angle,door?.42:.93));g.rotation.y=angle;macro.add(g);
  const w=door?.72:.46,h=door?1.3:.85,shape=arch(w+.13,h+.075),hole=arch(w,h);shape.holes.push(new THREE.Path(hole.getPoints(12)));
  add(g,'ARCH_FRAME',new THREE.ExtrudeGeometry(shape,{depth:.09,bevelEnabled:false,curveSegments:8}),door?stone:wood,0,0,.005);
  add(g,door?'WOOD_DOOR':'WARM_WINDOW',new THREE.ExtrudeGeometry(arch(w,h),{depth:.025,bevelEnabled:false,curveSegments:8}),door?deck:glass,0,0,.018);
  if(!door){box(g,'WINDOW_MULLION',.035,h-.06,.06,wood,0,h/2,.07);for(const y of [.28,.55])box(g,'WINDOW_CROSS',w-.03,.033,.06,wood,0,y,.07);box(g,'WINDOW_SILL',w+.23,.085,.2,wood,0,-.035,.04);}
  else box(g,'DOOR_THRESHOLD',.99,.08,.25,stone,0,0,.075);
 };
 for(let i=0;i<8;i++)opening(i*Math.PI/4,i===0);
 // The complete sealed base roof remains at L1; the glazed cupola is L2 construction.
 cylinder(macro,'CUPOLA_SOCKET',.62,.16,slate,0,3.23,0);
 cylinder(lantern,'CUPOLA_BASE',.61,.11,wood,0,3.35,0);
 cylinder(lantern,'CUPOLA_GLOW',.49,.59,glass,0,3.68,0);
 for(let i=0;i<8;i++){
  const a=-Math.PI/8+i*Math.PI/4,p=radial(.51,a,3.68);box(lantern,'CUPOLA_POST',.06,.65,.06,wood,p.x,p.y,p.z);
  beam(lantern,'CUPOLA_MID_RAIL',radial(.51,a,3.68),radial(.51,a+Math.PI/4,3.68),.03,.045,wood);
 }
 cylinder(lantern,'CUPOLA_HEADER',.57,.09,wood,0,4.0,0);
 const cap=add(lantern,'COPPER_CUPOLA_CAP',new THREE.ConeGeometry(.74,.52,8),copper,0,4.28,0);cap.rotation.y=Math.PI/8;
 cylinder(lantern,'CAP_EAVE',.75,.065,copper,0,4.03,0);
 cylinder(lantern,'FINIAL_STEM',.035,.23,copper,0,4.59,0,6);add(lantern,'FINIAL',new THREE.SphereGeometry(.073,8,6),copper,0,4.73,0);
 // Service chimney rises through the roof, not a detached cylinder perched above it.
 box(macro,'CHIMNEY',.29,1.11,.31,stone,-.85,2.91,-.45);box(macro,'CHIMNEY_CAP',.41,.11,.43,stone,-.85,3.5,-.45);box(macro,'CHIMNEY_FLUE',.2,.03,.21,dark,-.85,3.57,-.45);
 for(let i=1;i<8;i++){
  const a=i*Math.PI/4;
  const post=radial(2.15,a,.66);cylinder(lantern,'TERRACE_POST',.073,.61,wood,post.x,post.y,post.z,7);
 }
 // Front rail ends stop either side of the approach.
 for(const side of [-1,1])cylinder(lantern,'ENTRY_RAIL_POST',.073,.61,wood,side*.66,.66,1.97,7);
 const railPoints=[V(.66,.91,1.97),...Array.from({length:7},(_,i)=>radial(2.15,(i+1)*Math.PI/4,.91)),V(-.66,.91,1.97)];
 for(let i=0;i<railPoints.length-1;i++)tube(lantern,'TERRACE_ROPE',[railPoints[i],railPoints[i].clone().lerp(railPoints[i+1],.5).add(V(0,-.07,0)),railPoints[i+1]],.019,deck,8);
 // L3: slate courses follow the same roof surface, with closed edges and restrained variation.
 const tiles=[0x435a68,0x4b626d,0x3c5261,0x536871].map(c=>mat(c,.86));
 const masonry=[0x959c8e,0x879285,0xa1a596,0x7f8c81].map(c=>mat(c,.96));
 const iron=mat(0x354440,.6),rope=mat(0xc2aa7b),brick=mat(0xa56c4b);
 for(let sector=0;sector<8;sector++)for(let row=0;row<7;row++){
  const r0=.57+row*.178,r1=r0+.174,cols=low?3+Math.floor(row/2):3+row;
  for(let col=0;col<cols;col++){
   const t0=col/cols+.01,t1=(col+1)/cols-.01;
   const corners=[sectorPoint(r0,t0,sector),sectorPoint(r0,t1,sector),sectorPoint(r1,t0,sector),sectorPoint(r1,t1,sector)];
   const pos:number[]=[];for(const lift of [.036,.012])for(const p of corners)pos.push(p.x,p.y+lift,p.z);
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex([0,2,1,1,2,3,0,1,4,1,5,4,2,6,3,3,6,7,0,4,2,2,4,6,1,3,5,3,7,5]);g.computeVertexNormals();
   add(occupied,'INDIVIDUAL_SLATE_TILE',g,tiles[(sector*3+row+col)%4]);
  }
 }
 // The macro hip caps remain the single owner; slate undersides are backed by the continuous roof.
 const facetBlock=(g:THREE.Group,name:string,face:number,offset:number,r:number,y:number,w:number,h:number,d:number,m:THREE.Material)=>{const a=face*Math.PI/4,p=radial(r,a,y);p.x+=Math.cos(a)*offset;p.z-=Math.sin(a)*offset;const b=box(g,name,w,h,d,m,p.x,p.y,p.z);b.rotation.y=a;return b;};
 for(let face=0;face<8;face++){
  for(let row=0;row<2;row++)for(let i=0;i<4;i++)facetBlock(occupied,'QUAY_MASONRY',face,-.625+i*.417,2.23*Math.cos(Math.PI/8)+.015,-.17+row*.26,.397,.235,.065,masonry[(face+i+row)%4]);
  for(let i=0;i<4;i++)facetBlock(occupied,'QUAY_COPING_STONE',face,-.625+i*.417,2.06,.392,.402,.06,.23,masonry[(face+i)%4]);
  for(let i=0;i<3;i++)facetBlock(occupied,'HOUSE_PLINTH_STONE',face,-.38+i*.38,1.52*Math.cos(Math.PI/8)+.012,.53,.36,.22,.045,masonry[(face+i+1)%4]);
  for(const side of [-1,1]){const a=face*Math.PI/4;const g=new THREE.Group();g.rotation.y=a;g.position.copy(radial(1.39,a,0));occupied.add(g);beam(g,'EAVE_BRACE',V(side*.49,1.8,0),V(side*.29,2.07,.075),.06,.075,wood);}
 }
 for(let i=0;i<5;i++){
  box(occupied,'CHIMNEY_COURSE',.304,.025,.325,masonry[i%4],-.85,2.55+i*.18,-.45);
 }
 cylinder(occupied,'CHIMNEY_POT',.1,.15,brick,-.85,3.61,-.45,8);cylinder(occupied,'CHIMNEY_POT_OPENING',.071,.012,dark,-.85,3.691,-.45,8);
 // Cupola copper seams and glazing mullions.
 for(let i=0;i<8;i++){
  const a=-Math.PI/8+i*Math.PI/4;
  beam(occupied,'COPPER_CAP_SEAM',radial(.72,a,4.06),radial(.03,a,4.55),.015,.02,copper);
  const b=i*Math.PI/4,p=radial(.49*Math.cos(Math.PI/8)+.015,b,3.68);const mullion=box(occupied,'CUPOLA_MULLION',.022,.59,.04,wood,p.x,p.y,p.z);mullion.rotation.y=b;
 }
 // Door planking follows the arched opening and retains a clear route to the steps.
 for(let i=-3;i<=3;i++){const x=i*.088,h=.94+Math.sqrt(Math.max(0,.36*.36-x*x));box(occupied,'DOOR_PLANK_JOINT',.007,h-.04,.008,dark,x,.42+h/2,1.422);}
 for(const y of [.71,1.24])box(occupied,'IRON_DOOR_STRAP',.49,.04,.02,iron,-.07,y,1.439);
 add(occupied,'DOOR_PULL',new THREE.TorusGeometry(.055,.013,5,12),iron,.19,1.02,1.46);
 const wallLantern=(x:number,y:number,z:number)=>{box(occupied,'LANTERN_BRACKET',.035,.21,.05,iron,x,y+.19,z-.08);beam(occupied,'LANTERN_ARM',V(x,y+.28,z-.08),V(x,y+.28,z+.08),.025,.025,iron);box(occupied,'LANTERN_GLOW',.115,.18,.105,glass,x,y,z+.06);for(const dy of [-.115,.115])box(occupied,'LANTERN_CAP',.18,.043,.16,iron,x,y+dy,z+.06);for(const dx of [-.071,.071])box(occupied,'LANTERN_FRAME',.017,.2,.13,iron,x+dx,y,z+.06);};
 wallLantern(-.49,1.64,1.45);wallLantern(.49,1.64,1.45);
 // A compact table and stools on the left pad, with fully supported legs.
 cylinder(occupied,'TABLE_TOP',.235,.075,deck,-.99,.99,1.46,12);cylinder(occupied,'TABLE_PEDESTAL',.05,.4,wood,-.99,.75,1.46,8);
 for(const dz of [-.11,.11])box(occupied,'TABLE_FOOT',.28,.045,.05,wood,-.99,.565,1.46+dz);
 for(const [x,z] of [[-.73,1.65],[-1.19,1.16]]){cylinder(occupied,'STOOL_SEAT',.108,.055,deck,x,.77,z,10);for(const a of [0,Math.PI*2/3,Math.PI*4/3])beam(occupied,'STOOL_LEG',V(x+Math.sin(a)*.07,.54,z+Math.cos(a)*.07),V(x+Math.sin(a)*.055,.74,z+Math.cos(a)*.055),.032,.032,wood);}
 cylinder(occupied,'TABLE_MUG',.032,.07,copper,-.99,1.064,1.44,8);
 const barrel=(a:number)=>{const p=radial(1.78,a,.62);const b=add(occupied,'BARREL_STAVES',new THREE.CylinderGeometry(.16,.17,.46,10),deck,p.x,p.y,p.z);for(const y of [.45,.76]){const band=add(occupied,'BARREL_HOOP',new THREE.TorusGeometry(.169,.013,4,10),iron,p.x,y,p.z);band.rotation.x=Math.PI/2;}cylinder(occupied,'BARREL_LID',.158,.025,wood,p.x,.864,p.z,10);void b;};
 barrel(2.6);barrel(3.1);
 // Timber crate on the right terrace, clear of the front entry.
 box(occupied,'SUPPLY_CRATE',.31,.27,.3,deck,.97,.68,1.48);for(const y of [.57,.8])box(occupied,'CRATE_STRAP',.33,.035,.32,wood,.97,y,1.48);
 for(let i=0;i<3;i++){const coil=add(occupied,'COILED_DOCK_ROPE',new THREE.TorusGeometry(.06+i*.018,.012,4,12),rope,.97,.831,1.48);coil.rotation.x=Math.PI/2;}
 // Sign arm is fixed to a corner timber; two short hangers support its oval board.
 beam(occupied,'SIGN_BRACKET',V(-1.1,2.02,1.1),V(-1.97,2.02,1.1),.075,.07,wood);beam(occupied,'SIGN_BRACE',V(-1.12,1.81,1.1),V(-1.57,2.02,1.1),.04,.04,iron);
 for(const x of [-1.65,-1.88])tube(occupied,'SIGN_HANGER',[V(x,2.01,1.1),V(x,1.86,1.1)],.012,iron,4);
 const sign=cylinder(occupied,'FISH_SIGN_BOARD',.225,.07,wood,-1.76,1.65,1.1,16);sign.rotation.x=Math.PI/2;sign.scale.x=1.25;
 const fish=add(occupied,'FISH_SIGN_EMBLEM',new THREE.SphereGeometry(.095,10,6),copper,-1.75,1.65,1.145);fish.scale.set(1.45,.55,.15);
 const tail=add(occupied,'FISH_SIGN_TAIL',new THREE.ConeGeometry(.06,.1,3),copper,-1.91,1.65,1.145);tail.rotation.z=Math.PI/2;tail.scale.z=.2;
 for(const x of [-.66,.66])for(const y of [.77,.83]){const tie=add(occupied,'POST_ROPE_WRAP',new THREE.TorusGeometry(.078,.012,4,10),rope,x,y,1.97);tie.rotation.x=Math.PI/2;}

}
