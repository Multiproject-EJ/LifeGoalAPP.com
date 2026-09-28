import * as THREE from 'three';
import type { Island22PremiumLandmarkFactoryOptions } from './Island22PremiumLandmarkFamilies';
type Groups={macro:THREE.Group;gallery:THREE.Group;restored:THREE.Group};
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
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

/** Lighthouse/library geometry only; canonical level groups and placement remain in the factory. */
export function populateIsland22LighthouseV2({macro,gallery,restored}:Groups,{quality}:Island22PremiumLandmarkFactoryOptions){
 const low=quality==='low',segments=low?16:24;
 const mat=(color:number,roughness=.9)=>new THREE.MeshStandardMaterial({color,roughness});
 const stone=mat(0x9b9f92),plaster=mat(0xe3d2ae),wood=mat(0x795537),dark=mat(0x403328),deck=mat(0xa78051),slate=mat(0x425b6b),copper=mat(0xa16b45,.65),iron=mat(0x3d4a49,.6);
 const grain=woodGrainTexture();for(const m of [wood,dark,deck])m.map=grain;
 slate.shadowSide=THREE.DoubleSide;
 const glow=new THREE.MeshStandardMaterial({color:0xf5c669,emissive:0xeeb246,emissiveIntensity:.55,roughness:.4});
 const glazing=new THREE.MeshPhysicalMaterial({color:0xebd6a4,transparent:true,opacity:.38,roughness:.13,metalness:.08,side:THREE.DoubleSide,depthWrite:false});
 const add=(g:THREE.Group,name:string,geo:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0)=>{const mesh=new THREE.Mesh(geo,m);mesh.name='ISLAND_006_LIGHTHOUSE_'+name;mesh.position.set(x,y,z);g.add(mesh);return mesh;};
 const box=(g:THREE.Group,name:string,w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number)=>add(g,name,new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const cyl=(g:THREE.Group,name:string,r:number,h:number,m:THREE.Material,x:number,y:number,z:number,n=segments)=>{const mesh=add(g,name,new THREE.CylinderGeometry(r,r,h,n),m,x,y,z);if(n===8)mesh.rotation.y=Math.PI/8;return mesh;};
 const beam=(g:THREE.Group,name:string,a:THREE.Vector3,b:THREE.Vector3,w:number,d:number,m=wood)=>{const mesh=box(g,name,w,a.distanceTo(b),d,m,0,0,0);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());return mesh;};
 const tube=(g:THREE.Group,name:string,p:THREE.Vector3[],r:number,m:THREE.Material,n=12)=>add(g,name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p),n,r,4,false),m);
 const ring=(g:THREE.Group,name:string,r:number,thickness:number,m:THREE.Material,x:number,y:number,z:number,n=segments)=>{const mesh=add(g,name,new THREE.TorusGeometry(r,thickness,4,n),m,x,y,z);mesh.rotation.x=Math.PI/2;return mesh;};
 const tx=-.73,tz=-.1;
 box(macro,'CONTINUOUS_QUAY',3.93,.53,2.86,stone,.04,-.01,.05);box(macro,'QUAY_CAP',4.02,.12,2.95,stone,.04,.315,.05);
 for(let i=0;i<3;i++)box(macro,'ENTRY_STEP',.95,.17,.34,stone,.74,-.12+i*.17,1.97-i*.26);
 const towerRadius=(y:number)=>.79-(Math.min(3.5,Math.max(.35,y))-.35)/3.15*.21;
 add(macro,'CONTINUOUS_TAPERED_TOWER',new THREE.CylinderGeometry(.58,.79,3.15,segments),stone,tx,1.925,tz);
 add(macro,'TOWER_PLINTH',new THREE.CylinderGeometry(.81,.88,.31,segments),stone,tx,.49,tz);
 const corniceProfile=[new THREE.Vector2(.58,3.43),new THREE.Vector2(.61,3.50),new THREE.Vector2(.66,3.57),new THREE.Vector2(.76,3.64),new THREE.Vector2(.79,3.68)];
 add(macro,'STONE_GALLERY_CORBEL',new THREE.LatheGeometry(corniceProfile,segments),stone,tx,0,tz);
 cyl(macro,'SEALED_TOWER_CROWN',.79,.09,stone,tx,3.69,tz);
 cyl(gallery,'GALLERY_DECK',.96,.12,stone,tx,3.77,tz);
 for(let i=0;i<12;i++){
  const a=i/12*Math.PI*2,x=tx+Math.sin(a)*.89,z=tz+Math.cos(a)*.89;cyl(gallery,'GALLERY_RAIL_POST',.018,.43,iron,x,4.025,z,5);
  beam(gallery,'GALLERY_BRACKET',V(tx+Math.sin(a)*.61,3.5,tz+Math.cos(a)*.61),V(tx+Math.sin(a)*.89,3.72,tz+Math.cos(a)*.89),.09,.09,stone);
 }
 ring(gallery,'GALLERY_HANDRAIL',.89,.021,iron,tx,4.24,tz,24);ring(gallery,'GALLERY_MIDRAIL',.89,.015,iron,tx,4.03,tz,24);
 cyl(gallery,'LANTERN_SILL',.59,.085,iron,tx,3.875,tz,8);
 const glassShell=add(gallery,'LANTERN_GLAZING',new THREE.CylinderGeometry(.54,.54,.61,8,1,true),glazing,tx,4.22,tz);glassShell.rotation.y=Math.PI/8;
 for(let i=0;i<8;i++){
  const a=Math.PI/8+i*Math.PI/4,x=tx+Math.sin(a)*.55,z=tz+Math.cos(a)*.55;box(gallery,'LANTERN_FRAME',.047,.67,.047,iron,x,4.22,z);
 }
 cyl(gallery,'LANTERN_HEADER',.61,.075,iron,tx,4.56,tz,8);
 cyl(gallery,'LAMP_PEDESTAL',.13,.12,copper,tx,3.96,tz,10);cyl(gallery,'BEACON_CORE',.20,.39,glow,tx,4.24,tz,12);
 const lanternRoof=add(gallery,'COPPER_LANTERN_CAP',new THREE.ConeGeometry(.75,.55,8),copper,tx,4.865,tz);lanternRoof.rotation.y=Math.PI/8;
 cyl(gallery,'CAP_DRIP_EDGE',.76,.055,copper,tx,4.59,tz,8);cyl(gallery,'FINIAL_STEM',.031,.21,iron,tx,5.21,tz,6);add(gallery,'FINIAL',new THREE.SphereGeometry(.058,8,5),copper,tx,5.34,tz);
 // Library cottage meets the tower through a deliberate buried wall/roof junction.
 const cx=.82,cz=.10,eave=1.83;
 const roofY=(x:number)=>eave+.79-.66*x-.14*x*x;
 const profile=new THREE.Shape();profile.moveTo(-.9,.38);profile.lineTo(.9,.38);for(let i=0;i<=14;i++){const x=.9-i/14*1.8;profile.lineTo(x,roofY(Math.abs(x))-.035);}profile.closePath();
 const house=new THREE.ExtrudeGeometry(profile,{depth:1.72,bevelEnabled:false});house.translate(cx,0,cz-.86);add(macro,'CONTINUOUS_LIBRARY_COTTAGE',house,plaster);
 box(macro,'LIBRARY_PLINTH',1.88,.24,1.8,stone,cx,.5,cz);
 for(const dx of [-.9,.9])for(const dz of [-.86,.86])box(macro,'LIBRARY_CORNER_POST',.105,1.3,.11,wood,cx+dx,1.11,cz+dz);
 for(const z of [cz-.885,cz+.885]){box(macro,'GABLE_TIE',1.85,.1,.11,wood,cx,eave,z);beam(macro,'GABLE_KING_POST',V(cx,eave,z),V(cx,roofY(0)-.04,z),.085,.11);}
 for(const side of [-1,1]){
  const p:number[]=[],uv:number[]=[],idx:number[]=[];
  for(let i=0;i<=8;i++){const x=i/8*1.075;p.push(cx+side*x,roofY(x),cz-1.015,cx+side*x,roofY(x),cz+1.015);uv.push(i/8,0,i/8,1);if(i<8){const a=i*2;if(side===1)idx.push(a,a+1,a+2,a+1,a+3,a+2);else idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();add(macro,'CURVED_LIBRARY_ROOF',g,slate);
  for(const z of [cz-1.035,cz+1.035])tube(macro,'CURVED_BARGEBOARD',Array.from({length:12},(_,i)=>{const x=i/11*1.075;return V(cx+side*x,roofY(x),z);}),.045,wood,12);
  beam(macro,'EAVE_FASCIA',V(cx+side*1.075,roofY(1.075),cz-1.065),V(cx+side*1.075,roofY(1.075),cz+1.065),.095,.1);
 }
 box(macro,'RIDGE',.105,.095,2.16,wood,cx,roofY(0),cz);
 box(macro,'LIBRARY_CHIMNEY',.26,.68,.29,stone,1.46,2.35,-.35);box(macro,'CHIMNEY_CAP',.36,.09,.39,stone,1.46,2.73,-.35);cyl(macro,'CHIMNEY_POT',.075,.12,copper,1.46,2.825,-.35,8);
 const arch=(w:number,h:number)=>{const p=new THREE.Shape();p.moveTo(-w/2,0);p.lineTo(w/2,0);p.lineTo(w/2,h-w/2);p.absarc(0,h-w/2,w/2,0,Math.PI,false);p.closePath();return p;};
 const opening=(owner:THREE.Group,x:number,y:number,z:number,w:number,h:number,angle=0,door=false,frame=wood)=>{
  const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=angle;if(frame===stone)g.rotateX(-Math.atan(.21/3.15));owner.add(g);const outer=arch(w+.12,h+.065),inner=arch(w,h);outer.holes.push(new THREE.Path(inner.getPoints(10)));
  add(g,'ARCH_FRAME',new THREE.ExtrudeGeometry(outer,{depth:frame===stone?(door?.21:.14):.08,bevelEnabled:false,curveSegments:low?5:7}),frame,0,0,frame===stone?(door?-.13:-.07):0);
  add(g,door?'WOOD_DOOR':'WINDOW_PANES',new THREE.ExtrudeGeometry(inner,{depth:.025,bevelEnabled:false,curveSegments:low?5:7}),door?deck:glow,0,0,.012);
  if(door)box(g,'DOOR_THRESHOLD',w+.19,.065,.19,stone,0,.005,.06);
  else{box(g,'WINDOW_MULLION',.024,h-.035,.035,wood,0,h/2,.06);box(g,'WINDOW_CROSS',w-.01,.025,.035,wood,0,h*.48,.06);box(g,'WINDOW_SILL',w+.19,.055,.15,stone,0,-.025,.04);}
 };
 opening(macro,cx,.405,cz+.876,.47,.97,0,true);for(const dx of [-.59,.59])opening(macro,cx+dx,.96,cz+.876,.28,.52);
 opening(macro,cx,1.99,cz+.876,.27,.36);opening(macro,cx,1.99,cz-.876,.27,.36,Math.PI);
 for(const dx of [-.46,.46])opening(macro,cx+dx,1.0,cz-.876,.37,.54,Math.PI);
 for(const z of [cz-.39,cz+.39])opening(macro,cx+.913,.98,z,.34,.57,Math.PI/2);
 opening(macro,tx,.405,tz+towerRadius(.405)+.075,.40,.88,0,true,stone);
 for(const [a,y] of [[0,1.58],[0,2.58],[Math.PI,1.52],[Math.PI,2.63],[-Math.PI/2,2.11],[Math.PI/2,2.88]]){
  const r=towerRadius(y)+.05;opening(macro,tx+Math.sin(a)*r,y,tz+Math.cos(a)*r,.235,.44,a,false,stone);
 }
 for(const x of [-1.8,1.86])for(const z of [-1.24,1.32])cyl(macro,'MOORING_POST',.068,.38,wood,x,.55,z,7);
 // Stone courses wrap the taper, with alternating joints and actual thickness.
 const stones=[0xa5aa9a,0x969f91,0xabb09f,0x8d978a].map(c=>mat(c,.96));
 const tiles=[0x435c6b,0x4f6672,0x3c5462,0x596e77].map(c=>mat(c,.87));
 const paper=mat(0xe5d6a9),rope=mat(0xc4ad80),bookColors=[0x617873,0xa16241,0xb49251,0x5b6072].map(c=>mat(c,.95));
 const stoneCount=low?12:16;
 for(let row=0;row<10;row++){
  const y0=.66+row*.276,y1=y0+.263;
  for(let i=0;i<stoneCount;i++){
   const a0=(i+(row%2)*.5)/stoneCount*Math.PI*2+.009,a1=(i+1+(row%2)*.5)/stoneCount*Math.PI*2-.009;
   const pos:number[]=[];for(const inset of [0,.04])for(const [a,y] of [[a0,y0],[a1,y0],[a0,y1],[a1,y1]]){const r=towerRadius(y)+.017-inset;pos.push(tx+Math.sin(a)*r,y,tz+Math.cos(a)*r);}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,1,1,0,0,1,0,0,1,1,1],2));g.setIndex([0,1,2,1,3,2,4,6,5,5,6,7,0,4,1,1,4,5,2,3,6,3,7,6,0,2,4,2,6,4,1,5,3,3,5,7]);const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();add(restored,'TOWER_MASONRY_COURSE',flat,stones[(row*3+i)%4]);
  }
 }
 ring(restored,'STONE_CROWN_BAND',.60,.025,stones[0],tx,3.49,tz);
 for(let row=0;row<2;row++){
  for(let i=0;i<9;i++)for(const z of [-1.397,1.497])box(restored,'QUAY_FRONT_BACK_STONE',.421,.237,.065,stones[(i+row)%4],-1.71+i*.435,-.155+row*.26,z);
  for(let i=0;i<7;i++)for(const x of [-1.94,2.02])box(restored,'QUAY_SIDE_STONE',.065,.237,.39,stones[(i+row+2)%4],x,-.155+row*.26,-1.15+i*.4);
 }
 for(let i=0;i<9;i++)box(restored,'FRONT_PAVING',.425,.03,.37,stones[i%4],-1.7+i*.435,.389,1.31);
 for(let i=0;i<5;i++)box(restored,'CHIMNEY_JOINT',.277,.024,.307,stones[i%4],1.46,2.07+i*.13,-.35);
 cyl(restored,'CHIMNEY_FLUE',.049,.014,dark,1.46,2.892,-.35,8);
 // Individual slate tiles consume the shared curved roof profile.
 const roofRows=low?5:6,roofCols=low?8:10;
 for(const side of [-1,1])for(let row=0;row<roofRows;row++){
  const x=.09+row*(.96/roofRows);
  for(let col=0;col<roofCols;col++){
   const tile=box(restored,'LIBRARY_SLATE',.96/roofRows+.027,.023,2.0/roofCols-.012,tiles[(row+col*3)%4],cx+side*x,roofY(x)+.025,cz-.9+col*(1.8/(roofCols-1)));
   tile.rotation.z=-side*Math.atan(.66+.28*x);
  }
 }
 for(let i=0;i<10;i++)box(restored,'RIDGE_CAP',.16,.06,.195,tiles[i%4],cx,roofY(0)+.07,cz-.945+i*.21);
 // Copper seam ribs, clear enclosure and a tiered Fresnel-style optic.
 for(let i=0;i<8;i++){
  const a=Math.PI/8+i*Math.PI/4;
  beam(restored,'CAP_SEAM',V(tx+Math.sin(a)*.735,4.61,tz+Math.cos(a)*.735),V(tx+Math.sin(a)*.03,5.14,tz+Math.cos(a)*.03),.012,.014,copper);
  const b=a+Math.PI/8,r=.54*Math.cos(Math.PI/8)+.008;const paneBar=box(restored,'GLAZING_MULLION',.016,.61,.025,iron,tx+Math.sin(b)*r,4.22,tz+Math.cos(b)*r);paneBar.rotation.y=b;
 }
 for(let i=0;i<5;i++)ring(restored,'FRESNEL_OPTIC_RING',.2+Math.sin(i/4*Math.PI)*.026,.013,copper,tx,4.075+i*.078,tz,10);
 cyl(restored,'BEACON_TOP_REFLECTOR',.21,.025,copper,tx,4.45,tz,12);
 // Planked doors and handles respect the tapered tower opening transform.
 const doorFinish=(x:number,y:number,z:number,w:number,h:number,pitched=false)=>{const g=new THREE.Group();g.position.set(x,y,z);if(pitched)g.rotation.x=-Math.atan(.21/3.15);restored.add(g);for(let i=-2;i<=2;i++)box(g,'DOOR_PLANK_JOINT',.006,h*.76,.009,dark,i*w*.16,h*.42,.041);for(const yy of [.2,h*.65])box(g,'DOOR_HINGE',w*.52,.026,.022,iron,-w*.15,yy,.055);add(g,'DOOR_PULL',new THREE.TorusGeometry(.025,.007,4,10),iron,w*.27,h*.47,.066);};
 doorFinish(cx,.405,cz+.876,.47,.97);doorFinish(tx,.405,tz+towerRadius(.405)+.075,.40,.88,true);
 const lantern=(x:number,y:number,z:number)=>{box(restored,'LANTERN_BRACKET',.027,.19,.075,iron,x,y+.13,z-.075);box(restored,'LANTERN_GLOW',.095,.14,.09,glow,x,y,z);for(const dy of [-.09,.09])box(restored,'LANTERN_CAP',.15,.036,.14,iron,x,y+dy,z);for(const dx of [-.06,.06])box(restored,'LANTERN_FRAME',.015,.15,.11,iron,x+dx,y,z);};
 lantern(tx-.39,1.2,.59);lantern(tx+.39,1.2,.59);
 // Library identity: open-book sign and a sheltered circulating-book cabinet.
 beam(restored,'BOOK_SIGN_ARM',V(-.08,1.66,.99),V(-.53,1.66,.99),.05,.05,iron);beam(restored,'BOOK_SIGN_BRACE',V(-.08,1.43,.99),V(-.40,1.66,.99),.025,.025,iron);
 for(const x of [-.43,-.19])tube(restored,'SIGN_HANGER',[V(x,1.65,.99),V(x,1.49,.99)],.01,iron,4);
 box(restored,'BOOK_SIGN_BOARD',.40,.34,.06,dark,-.31,1.30,.99);
 for(const side of [-1,1]){const page=box(restored,'OPEN_BOOK_PAGES',.125,.18,.023,paper,-.31+side*.065,1.31,1.032);page.rotation.y=-side*.13;}
 box(restored,'BOOK_SPINE',.016,.185,.025,copper,-.31,1.31,1.048);
 const bx=1.43,bz=1.12;
 box(restored,'BOOK_CABINET_BACK',.51,.42,.04,wood,bx,.615,bz-.09);
 for(const x of [bx-.27,bx+.27])box(restored,'BOOK_CABINET_SIDE',.045,.43,.25,wood,x,.615,bz);
 for(const y of [.405,.6,.81])box(restored,'BOOK_SHELF',.56,.035,.25,deck,bx,y,bz);
 const shelter=box(restored,'BOOK_CABINET_SHELTER',.62,.045,.34,slate,bx,.87,bz);shelter.rotation.x=.12;
 for(let row=0;row<2;row++)for(let i=0;i<6;i++){const h=.13+(i%3)*.012;box(restored,'LIBRARY_VOLUME',.055,h,.105,bookColors[(i+row)%4],bx-.2+i*.078,.423+row*.195+h/2,bz+.035);box(restored,'BOOK_SPINE_LABEL',.036,.016,.006,paper,bx-.2+i*.078,.49+row*.195,bz+.09);}
 box(restored,'READING_BENCH_SEAT',1.06,.065,.30,deck,.82,.74,-1.11);
 for(const x of [.38,1.26])for(const z of [-1.2,-1.03])box(restored,'BENCH_LEG',.055,.335,.055,wood,x,.56,z);
 box(restored,'BENCH_BACK',.99,.18,.05,wood,.82,.87,-.98);
 for(const x of [-1.8,1.86])for(const z of [-1.24,1.32])for(const y of [.53,.59,.65])ring(restored,'MOORING_LASHING',.075,.011,rope,x,y,z,10);

}
