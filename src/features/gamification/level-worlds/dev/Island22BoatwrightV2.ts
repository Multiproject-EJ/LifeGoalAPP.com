import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import type { Island22PremiumLandmarkFactoryOptions } from './Island22PremiumLandmarkFamilies';

type Groups = { macro: THREE.Group; rigging: THREE.Group; restored: THREE.Group };
const V = (x:number,y:number,z:number) => new THREE.Vector3(x,y,z);

function chamferedBox(w:number,h:number,d:number,b:number) {
  if(b<.012 || Math.min(w,h,d)<.08)return new THREE.BoxGeometry(w,h,d);
  const points:THREE.Vector3[]=[];
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]) {
    points.push(V(x*w/2,y*(h/2-b),z*(d/2-b)),V(x*(w/2-b),y*h/2,z*(d/2-b)),V(x*(w/2-b),y*(h/2-b),z*d/2));
  }
  const geo=new ConvexGeometry(points),pos=geo.attributes.position,n=geo.attributes.normal,uv:number[]=[];
  for(let i=0;i<pos.count;i++) {
    const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));
    if(ny>nx&&ny>nz)uv.push(pos.getX(i)/w+.5,pos.getZ(i)/d+.5);
    else if(nx>nz)uv.push(pos.getZ(i)/d+.5,pos.getY(i)/h+.5);
    else uv.push(pos.getX(i)/w+.5,pos.getY(i)/h+.5);
  }
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return geo;
}

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

/** Boatwright-only architecture. Root transforms and construction ownership stay with the landmark factory. */
export function populateIsland22BoatwrightV2(groups:Groups, options:Island22PremiumLandmarkFactoryOptions) {
  const {macro,rigging,restored}=groups;
  const {materials:m,quality}=options;
  const low=quality==='low';
  const plaster=m.plaster.clone();plaster.color.setHex(0xe8d4aa);plaster.roughness=.96;
  const timber=m.timber.clone();timber.color.setHex(0x805532);timber.roughness=.86;
  const dark=m.timberDark.clone();dark.color.setHex(0x403023);dark.roughness=.92;
  const slate=m.roof.clone();slate.color.setHex(0x354854);slate.roughness=.88;
  const stone=m.stone.clone();stone.color.setHex(0x898c7c);stone.roughness=1;
  const deck=m.timber.clone();deck.color.setHex(0xa37b4c);deck.roughness=.92;
  const metal=new THREE.MeshStandardMaterial({color:0x3d4948,metalness:.55,roughness:.6});
  const hullMat=m.timber.clone();hullMat.color.setHex(0xa7804d);hullMat.roughness=.82;
  const grain=woodGrainTexture();
  for(const material of [timber,dark,deck,hullMat]){material.map=grain;material.normalMap=null;material.bumpMap=null;}
  for(const material of [stone,plaster,slate]){material.map=null;material.normalMap=null;material.bumpMap=null;}
  const masonry=[0x96978b,0x80877e,0xa4a393,0x8a9187].map(color=>new THREE.MeshStandardMaterial({color,roughness:.98}));
  const tiles=[0x455861,0x394c59,0x52636a,0x3c505d].map(color=>new THREE.MeshStandardMaterial({color,roughness:.84}));
  const glass=new THREE.MeshStandardMaterial({color:0xf6bc4b,emissive:0xeb9d23,emissiveIntensity:.55,roughness:.45});
  const add=(owner:THREE.Group,name:string,geo:THREE.BufferGeometry,mat:THREE.Material,pos:THREE.Vector3)=>{
    const mesh=new THREE.Mesh(geo,mat);mesh.name='ISLAND_006_BOATWRIGHT_'+name;mesh.position.copy(pos);owner.add(mesh);return mesh;
  };
  const block=(owner:THREE.Group,name:string,w:number,h:number,d:number,mat:THREE.Material,x:number,y:number,z:number,bevel=.018)=>
    add(owner,name,chamferedBox(w,h,d,Math.min(bevel,w*.15,h*.15,d*.15)),mat,V(x,y,z));
  const beam=(owner:THREE.Group,name:string,a:THREE.Vector3,b:THREE.Vector3,w:number,d:number,mat=timber)=>{
    const mesh=block(owner,name,w,a.distanceTo(b),d,mat,0,0,0,.012);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());return mesh;
  };
  const tube=(owner:THREE.Group,name:string,points:THREE.Vector3[],radius:number,mat:THREE.Material,segments=16)=>
    add(owner,name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(8,Math.round(segments*.82)),radius,4,false),mat,V(0,0,0));

  // A continuous quay mass, with construction seams reserved for the finish pass.
  block(macro,'STONE_QUAY',3.70,.54,3.15,stone,0,-.05,0,.08);
  block(macro,'QUAY_TOP',3.91,.12,3.21,stone,0,.26,0,.04);
  for(let i=0;i<3;i++)block(macro,'ENTRY_STEP_'+i,.9,.2,.28,stone,-1.02,-.2+i*.2,1.99-i*.24,.026);

  const cx=-.99,cz=-.08,wallWidth=1.62,wallDepth=1.7,base=.35,eave=1.66,rise=.84;
  const profile=new THREE.Shape();profile.moveTo(-wallWidth/2,base);profile.lineTo(wallWidth/2,base);profile.lineTo(wallWidth/2,eave);profile.lineTo(0,eave+rise);profile.lineTo(-wallWidth/2,eave);profile.closePath();
  const shell=new THREE.ExtrudeGeometry(profile,{depth:wallDepth,bevelEnabled:false,curveSegments:1});shell.translate(cx,0,cz-wallDepth/2);add(macro,'CONTINUOUS_COTTAGE_SHELL',shell,plaster,V(0,0,0));
  block(macro,'COTTAGE_STONE_PLINTH',1.72,.28,1.8,stone,cx,.47,cz,.04);
  for(const x of [-.81,.81])for(const z of [-.85,.85])block(macro,'CORNER_POST',.105,1.26,.12,timber,cx+x,1.06,cz+z,.017);
  for(const z of [-.91,.91]){
    beam(macro,'GABLE_TIE',V(cx-.88,eave,cz+z),V(cx+.88,eave,cz+z),.12,.12);
    beam(macro,'GABLE_KING_POST',V(cx,eave,cz+z),V(cx,eave+rise,cz+z),.115,.13);
  }
  const roofY=(x:number)=>eave+.88- .79*x-.15*x*x;
  // Shared curved roof profile: both sides, trim and slate courses consume this surface.
  for(const side of [-1,1]){
    const vertices:number[]=[],indices:number[]=[],uv:number[]=[];const n=8;
    for(let i=0;i<=n;i++){const x=i/n*1.04,y=roofY(x);vertices.push(cx+side*x,y,cz-1.05,cx+side*x,y,cz+1.05);uv.push(i/n,0,i/n,1);}
    for(let i=0;i<n;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    const roofMaterial=slate.clone();roofMaterial.side=THREE.DoubleSide;add(macro,'CURVED_ROOF_'+side,geo,roofMaterial,V(0,0,0));
    for(const z of [-1.06,1.06]){
      const points=Array.from({length:9},(_,i)=>{const x=i/8*1.06;return V(cx+side*x,roofY(x)+.015,cz+z);});
      for(let i=0;i<points.length-1;i++)beam(macro,'BARGEBOARD',points[i],points[i+1],.1,.105);
    }
    beam(macro,'EAVE_FASCIA',V(cx+side*1.04,roofY(1.04),cz-1.1),V(cx+side*1.04,roofY(1.04),cz+1.1),.13,.13);
  }
  beam(macro,'RIDGE_BEAM',V(cx,roofY(0)+.015,cz-1.15),V(cx,roofY(0)+.015,cz+1.15),.14,.14);
  const brick=new THREE.MeshStandardMaterial({color:0x985d42,roughness:.95});
  block(macro,'CHIMNEY',.29,.77,.31,brick,cx-.3,2.5,cz-.47,.018);
  block(macro,'CHIMNEY_CAP',.38,.1,.39,stone,cx-.3,2.91,cz-.47,.025);
  block(macro,'CHIMNEY_FLUE',.2,.025,.2,dark,cx-.3,2.97,cz-.47,.002);

  // Boat shell is open and continuous from keel to gunwale, with actual interior thickness.
  const boatX=.88,boatZ=.05,boatLength=2.22,boatWidth=.51;
  const hullPoint=(u:number,v:number,inset=0)=>{
    const end=Math.pow(Math.abs(u*2-1),2.6),width=boatWidth*Math.pow(Math.sin(u*Math.PI),.55)+.035;
    const a=v*Math.PI-Math.PI/2;
    return V(boatX+Math.sin(a)*Math.max(.015,width-inset),.6+end*.39+(1-Math.cos(a))*(.59-inset),boatZ+(u-.5)*boatLength);
  };
  const long=low?12:22,cross=low?8:12;
  for(const inside of [false,true]){
    const pos:number[]=[],indices:number[]=[],uv:number[]=[];
    for(let i=0;i<=long;i++)for(let j=0;j<=cross;j++){const p=hullPoint(i/long,j/cross,inside?.045:0);if(inside)p.y+=.045;pos.push(...p.toArray());uv.push(i/long,j/cross);}
    for(let i=0;i<long;i++)for(let j=0;j<cross;j++){const a=i*(cross+1)+j,b=a+cross+1;if(inside)indices.push(a,b,a+1,b,b+1,a+1);else indices.push(a,a+1,b,b,a+1,b+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
    const mat=(inside?deck:hullMat).clone();mat.side=THREE.DoubleSide;add(macro,inside?'HULL_INTERIOR':'HULL_OUTER',g,mat,V(0,0,0));
  }
  for(const end of [0,1]) {
    const positions:number[]=[],indices:number[]=[];
    for(let j=0;j<=cross;j++){
      const outer=hullPoint(end,j/cross),inner=hullPoint(end,j/cross,.045);inner.y+=.045;
      positions.push(...outer.toArray(),...inner.toArray());
      if(j<cross){const a=j*2;if(end===0)indices.push(a,a+1,a+2,a+1,a+3,a+2);else indices.push(a,a+2,a+1,a+1,a+2,a+3);}
    }
    const cap=new THREE.BufferGeometry();cap.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));cap.setIndex(indices);cap.computeVertexNormals();
    const capMat=timber.clone();capMat.side=THREE.DoubleSide;add(macro,'CLOSED_STEM_'+end,cap,capMat,V(0,0,0));
    beam(macro,'STEM_POST_'+end,hullPoint(end,.5),hullPoint(end,0).add(V(0,.025,0)),.07,.065,timber);
  }
  for(const side of [0,1])tube(macro,'GUNWALE',Array.from({length:23},(_,i)=>hullPoint(i/22,side)),.038,timber,28);
  for(const z of [-.69,.66]){
    block(macro,'BOAT_CRADLE_FOOT',1.3,.13,.17,dark,boatX,.41,z,.02);
    const u=(z-boatZ)/boatLength+.5;
    const width=boatWidth*Math.pow(Math.sin(u*Math.PI),.55)+.035;
    const keelY=.6+Math.pow(Math.abs(u*2-1),2.6)*.39;
    const contactY=keelY+(1-Math.cos(Math.asin(.31/width)))*.59;
    for(const side of [-1,1])beam(macro,'BOAT_CRADLE_ARM',V(boatX+side*.56,.44,z),V(boatX+side*.31,contactY-.025,z),.11,.13,dark);
    block(macro,'KEEL_BEARER',.2,keelY-.45+.014,.14,dark,boatX,(keelY+.45+.014)/2,z,.012);
  }
  // Gantry is scaled to the boat and visibly braced into its stone footings.
  for(const x of [.18,1.68]){
    block(macro,'GANTRY_FOOT',.25,.17,.25,stone,x,.41,-.64,.03);
    block(macro,'GANTRY_POST',.16,1.94,.17,timber,x,1.41,-.64,.023);
    beam(macro,'GANTRY_BRACE',V(x,1.92,-.64),V(x+(x<.5?.43:-.43),2.36,-.64),.1,.1);
  }
  block(macro,'GANTRY_CROSSBEAM',1.80,.19,.2,timber,.93,2.43,-.64,.027);
  // L2 owns active rigging; L3 owns finish below. Their transforms never drive gameplay.
  const wheel=add(rigging,'PULLEY',new THREE.TorusGeometry(.11,.026,6,14),metal,V(.91,2.23,-.64));
  tube(rigging,'HOIST_ROPE',[V(.91,2.29,-.67),V(.91,1.68,-.67),V(.91,1.13,-.67)],.012,m.rope,8);
  add(rigging,'HOOK',new THREE.TorusGeometry(.075,.018,5,12,Math.PI*1.6),metal,V(.91,1.11,-.67));
  wheel.rotation.y=.12;


  // Architectural openings are part of the house at every construction level.
  const window=(owner:THREE.Group,x:number,y:number,z:number,w:number,h:number,rotation=0,shutters=true)=>{
    const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rotation;owner.add(g);
    block(g,'WINDOW_RECESS',w+.1,h+.1,.035,dark,0,0,0,.008);
    block(g,'AMBER_GLASS',w-.065,h-.065,.025,glass,0,0,.027,.006);
    for(const side of [-1,1]){
      block(g,'WINDOW_JAMB',.045,h+.09,.075,timber,side*w/2,0,.045,.007);
      block(g,'WINDOW_RAIL',w+.09,.045,.075,timber,0,side*h/2,.045,.007);
      if(shutters){
        block(g,'SHUTTER',.12,h,.048,dark,side*(w/2+.1),0,.017,.013);
        for(const yy of [-h*.32,h*.32])block(g,'SHUTTER_STRAP',.12,.025,.018,metal,side*(w/2+.1),yy,.052,.004);
      }
    }
    block(g,'WINDOW_MULLION',.025,h,.035,timber,0,0,.065,.004);
    block(g,'WINDOW_CROSS',w,.025,.035,timber,0,0,.065,.004);
    block(g,'WINDOW_SILL',w+.2,.07,.18,timber,0,-h/2-.05,.045,.014);
  };
  const doorway=(x:number,z:number,rotation:number)=>{
    const g=new THREE.Group();g.position.set(x,.34,z);g.rotation.y=rotation;macro.add(g);
    const arch=(w:number,h:number)=>{const p=new THREE.Shape();p.moveTo(-w/2,0);p.lineTo(w/2,0);p.lineTo(w/2,h-.19);p.quadraticCurveTo(0,h+.07,-w/2,h-.19);p.closePath();return p;};
    const outer=arch(.79,1.13),inner=arch(.60,.99);outer.holes.push(new THREE.Path(inner.getPoints(12)));
    add(g,'DOOR_ARCH_FRAME',new THREE.ExtrudeGeometry(outer,{depth:.115,bevelEnabled:true,bevelSize:.012,bevelThickness:.01,bevelSegments:1,steps:1,curveSegments:6}),timber,V(0,0,.03));
    add(g,'RECESSED_DOOR',new THREE.ExtrudeGeometry(arch(.6,.99),{depth:.03,bevelEnabled:false,curveSegments:6}),deck,V(0,0,.023));
    for(const dx of [-.2,-.1,0,.1,.2])block(g,'DOOR_PLANK_JOINT',.009,.82,.007,dark,dx,.43,.06,0);
    for(const y of [.18,.65])block(g,'DOOR_HINGE_STRAP',.29,.038,.017,metal,-.13,y,.073,.005);
    add(g,'DOOR_HANDLE',new THREE.TorusGeometry(.033,.009,5,10),metal,V(.19,.48,.08));
    block(g,'DOOR_THRESHOLD',.84,.075,.24,masonry[0],0,.025,.07,.016);
  };
  doorway(cx-.05,cz+.87,0);doorway(cx,cz-.87,Math.PI);
  window(macro,cx,2.025,cz+.867,.37,.39,0,false);
  window(macro,cx,2.025,cz-.867,.37,.39,Math.PI,false);
  for(const side of [-1,1])for(const z of [-.47,.38])window(macro,cx+side*.82,1.13,cz+z,.42,.44,side*Math.PI/2);
  for(const side of [-1,1]){
    beam(macro,'SIDE_SILL_RAIL',V(cx+side*.836,.77,cz-.87),V(cx+side*.836,.77,cz+.87),.07,.07);
    for(const end of [-1,1])beam(macro,'EAVE_KNEE_BRACE',V(cx+side*.85,1.37,cz+end*.70),V(cx+side*.96,roofY(.96)-.10,cz+end*.43),.09,.095);
  }
  // Large stone joints read at phone scale and replace the layered slab appearance.
  for(let row=0;row<2;row++){
    for(const side of [-1,1])for(let i=0;i<8;i++){
      const x=-1.68+i*.48+(row%2?.02:0);
      if(side===1&&x>cx-.49&&x<cx+.49)continue;
      block(macro,'QUAY_FACE_STONE',.458,.244,.17,masonry[(i+row)%4],x,-.16+row*.27,side*1.54,.036);
    }
    for(const side of [-1,1])for(let i=0;i<6;i++)block(macro,'QUAY_SIDE_STONE',.17,.244,.49,masonry[(i*3+row)%4],side*1.84,-.16+row*.27,-1.26+i*.50,.034);
  }
  for(const z of [-.94,.78])for(let i=0;i<5;i++)block(macro,'HOUSE_PLINTH_STONE',.32,.20,.13,masonry[i%4],cx-.66+i*.33,.47,z,.024);
  for(const x of [-1.85,-.14])for(let i=0;i<5;i++)block(macro,'HOUSE_SIDE_PLINTH',.13,.20,.33,masonry[(i+1)%4],x,.47,cz-.67+i*.335,.024);

  if(options.level<2)return;
  // L2 shows planking and the workshop's working equipment.
  for(const side of [-1,1])for(let row=1;row<5;row++){
    const v=side<0?row*.095:1-row*.095;
    tube(rigging,'HULL_PLANK_SEAM',Array.from({length:23},(_,i)=>hullPoint(i/22,v).add(V(side*.004,0,0))),.008,dark,22);
  }
  for(let i=0;i<(low?4:7);i++){
    const u=.12+i/(low?3:6)*.76;
    tube(rigging,'HULL_INTERIOR_RIB',Array.from({length:13},(_,j)=>hullPoint(u,j/12,.061).add(V(0,.071,0))),.021,timber,12);
  }
  for(const u of [.3,.72]){
    const left=hullPoint(u,.05,.075),right=hullPoint(u,.95,.075);
    block(rigging,'BOAT_THWART',right.x-left.x,.055,.13,deck,boatX,(left.y+right.y)/2,boatZ+(u-.5)*boatLength,.012);
  }
  for(const x of [.18,1.68]){
    block(rigging,'GANTRY_IRON_COLLAR',.19,.12,.21,metal,x,2.34,-.64,.008);
    for(const z of [-.755,-.525])add(rigging,'GANTRY_BOLT',new THREE.SphereGeometry(.024,6,4),metal,V(x,2.34,z));
  }
  for(const z of [-.85,-.38,.09,.56,1.03])block(rigging,'YARD_BOARD',1.15,.065,.44,deck,.82,.35,z,.01);

  if(options.level<3)return;
  // L3 finish stays in its existing restoration group for construction/explosion tooling.
  const rows=low?5:7,cols=low?5:7;
  for(const side of [-1,1])for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const x=.07+row*.94/(rows-1),z=cz-.94+col*1.88/(cols-1)+(row%2? .022:-.022);
    const tile=block(restored,'INDIVIDUAL_SLATE',.19,.023,.32,tiles[(row*7+col*3)%4],cx+side*x,roofY(x)+.027,z,0);
    tile.rotation.z=-side*Math.atan(.79+.3*x);
  }
  for(let i=0;i<8;i++){
    const cuff=add(restored,'RIDGE_IRON_STRAP',new THREE.CylinderGeometry(.083,.083,.035,6,1,true,0,Math.PI),metal,V(cx,roofY(0)+.027,cz-1.01+i*.29));cuff.rotation.x=Math.PI/2;
  }
  for(let row=0;row<5;row++){
    const y=2.18+row*.145;
    for(const z of [cz-.635,cz-.305])block(restored,'CHIMNEY_MORTAR',.30,.011,.012,stone,cx-.3,y,z,0);
    for(const x of [cx-.453,cx-.147])block(restored,'CHIMNEY_SIDE_MORTAR',.012,.011,.31,stone,x,y,cz-.47,0);
  }
  // Paving is outside the cottage; uneven joints, not a patterned picture on a slab.
  for(let ix=0;ix<8;ix++)for(let iz=0;iz<7;iz++){
    const x=-1.68+ix*.48,z=-1.35+iz*.44;
    if((x>cx-.88&&x<cx+.88&&z>cz-.97&&z<cz+.97)||(x>.15&&x<1.49&&z>-1.1&&z<1.3))continue;
    block(restored,'QUAY_PAVER',.448,.045,.407,masonry[(ix+iz*3)%4],x,.343+(ix%3)*.003,z,.017);
  }
  const ropeCoil=(x:number,y:number,z:number,r=.12)=>{
    for(let i=0;i<3;i++){
      const ring=add(restored,'ROPE_COIL',new THREE.TorusGeometry(r-i*.021,.012,4,low?10:18),m.rope,V(x,y+i*.008,z));ring.rotation.x=Math.PI/2;
    }
  };
  for(const x of [-1.69,1.68])for(const z of [-1.32,1.34]){
    add(restored,'MOORING_POST',new THREE.CylinderGeometry(.078,.09,.43,8),dark,V(x,.52,z));
    for(let i=0;i<2;i++){
      const ring=add(restored,'BOLLARD_ROPE',new THREE.TorusGeometry(.089,.017,4,12),m.rope,V(x,.60+i*.037,z));ring.rotation.x=Math.PI/2;
    }
  }
  const barrel=(x:number,z:number)=>{
    const points=[V(.115,0,0),V(.145,.07,0),V(.16,.22,0),V(.145,.36,0),V(.115,.40,0)].map(p=>new THREE.Vector2(p.x,p.y));
    add(restored,'BARREL_STAVES',new THREE.LatheGeometry(points,low?8:12),timber,V(x,.36,z));
    add(restored,'BARREL_LID',new THREE.CylinderGeometry(.115,.115,.028,12),deck,V(x,.764,z));
    for(const y of [.43,.69]){const ring=add(restored,'BARREL_HOOP',new THREE.TorusGeometry(.145,.018,5,12),metal,V(x,y,z));ring.rotation.x=Math.PI/2;}
  };
  barrel(-1.60,1.17);barrel(1.59,1.01);ropeCoil(1.38,.40,-1.24);
  block(restored,'WORKBENCH_TOP',.69,.075,.33,timber,-.06,.85,1.25,.015);
  for(const x of [-.32,.2])for(const z of [1.15,1.35])block(restored,'WORKBENCH_LEG',.055,.48,.055,dark,x,.6,z,.008);
  block(restored,'HAND_PLANE',.17,.065,.085,metal,-.04,.925,1.24,.011);
  beam(restored,'MALLET_HANDLE',V(.11,.895,1.35),V(.26,.91,1.28),.022,.022,dark);
  block(restored,'MALLET_HEAD',.04,.06,.1,deck,.27,.93,1.28,.008);
  ropeCoil(.15,.39,1.04,.09);
  for(let i=0;i<3;i++){const board=block(restored,'TIMBER_STOCK',.1,.85,.035,deck,-1.74+i*.12,.78,-1.13,.006);board.rotation.x=-.18;}
  const lantern=(x:number,y:number,z:number,rotation=0)=>{
    const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rotation;restored.add(g);
    beam(g,'LANTERN_BRACKET',V(0,.17,0),V(0,.17,.20),.026,.028,metal);
    add(g,'LANTERN_GLOW',new THREE.CylinderGeometry(.058,.05,.15,6),glass,V(0,0,.17));
    for(const yy of [-.085,.085])add(g,'LANTERN_FRAME',new THREE.CylinderGeometry(.078,.078,.028,6),metal,V(0,yy,.17));
    add(g,'LANTERN_CAP',new THREE.ConeGeometry(.092,.08,6),metal,V(0,.133,.17));
    for(const side of [-1,1])block(g,'LANTERN_BAR',.014,.17,.014,metal,side*.052,0,.20,0);
  };
  lantern(cx+.54,1.31,cz+.91);lantern(cx-.5,1.28,cz-.91,Math.PI);
}
