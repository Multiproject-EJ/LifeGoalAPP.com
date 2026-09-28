import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island22FishermansVillageMaterials } from './Island22FishermansVillageThreeWorld';
type Groups={macro:THREE.Group;finish:THREE.Group};
type Options={quality:Island3DQuality;materials:Island22FishermansVillageMaterials};
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
/** Rope maker cottage geometry only; root owns canonical placement and decorative cluster identity. */
export function populateIsland22RopeMakerCottageV2({macro}:Groups,{quality}:Options){
 const low=quality==='low',mat=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.89});
 const wood=mat(0x795d3f),dark=mat(0x473b2c),plaster=mat(0xe2d2b3),stone=mat(0x989d8e),slate=mat(0xad7952),clay=mat(0xad7952);
 slate.shadowSide=THREE.DoubleSide;clay.shadowSide=THREE.DoubleSide;
 const glass=new THREE.MeshStandardMaterial({color:0xaebaa1,emissive:0xe2b367,emissiveIntensity:.14,roughness:.5});
 const add=(n:string,geo:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0,g=macro)=>{const o=new THREE.Mesh(geo,m);o.name='ISLAND_006_ROPE_MAKER_'+n;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
 const box=(n:string,w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number,g=macro)=>add(n,new THREE.BoxGeometry(w,h,d),m,x,y,z,g);
 const beam=(n:string,a:THREE.Vector3,b:THREE.Vector3,w=.065,d=.07,m=wood,g=macro)=>{const o=box(n,w,a.distanceTo(b),d,m,0,0,0,g);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());return o;};
 const upward=(n:string,p:THREE.Vector3[],m:THREE.Material)=>{
  for(let i=0;i<p.length;i+=3)if(p[i+1].clone().sub(p[i]).cross(p[i+2].clone().sub(p[i])).y<0)[p[i+1],p[i+2]]=[p[i+2],p[i+1]];
  const thickness=.035,vertices:THREE.Vector3[]=[],edges=new Map<string,{a:THREE.Vector3;b:THREE.Vector3;count:number}>();
  const key=(v:THREE.Vector3)=>`${v.x.toFixed(7)},${v.y.toFixed(7)},${v.z.toFixed(7)}`;
  for(let i=0;i<p.length;i+=3){const a=p[i],b=p[i+1],c=p[i+2],down=(v:THREE.Vector3)=>v.clone().add(V(0,-thickness,0));vertices.push(a,b,c,down(a),down(c),down(b));for(const [u,v]of [[a,b],[b,c],[c,a]]){const k=[key(u),key(v)].sort().join('|'),e=edges.get(k);if(e)e.count++;else edges.set(k,{a:u,b:v,count:1});}}
  for(const e of edges.values())if(e.count===1){const ad=e.a.clone().add(V(0,-thickness,0)),bd=e.b.clone().add(V(0,-thickness,0));vertices.push(e.a,ad,e.b,e.b,ad,bd);}
  const g=new THREE.BufferGeometry().setFromPoints(vertices);g.computeVertexNormals();return add(n,g,m);
 };
 box('CONTINUOUS_TERRACE',2.67,.32,1.70,stone,-.385,-.10,.05);box('TERRACE_CAP',2.67,.045,1.70,stone,-.385,.0625,.05);
 box('MAIN_ENTRY_STEP',.61,.12,.26,stone,-.32,-.002,.87);box('WORKROOM_THRESHOLD',.47,.05,.16,stone,-1.25,.075,.65);
 box('GROUND_STOREY',1.55,.96,1.22,plaster,0,.56,0);box('STONE_PLINTH',1.60,.24,1.27,stone,0,.20,0);box('UPPER_JETTY_BEAM',1.67,.13,1.34,wood,0,1.04,0);
 const roofY=(x:number)=>2.9-1.37*x+.39*x*x;
 const profile=new THREE.Shape();profile.moveTo(-.825,1.105);profile.lineTo(.825,1.105);for(let i=0;i<=16;i++){const x=.825-i/16*1.65;profile.lineTo(x,roofY(Math.abs(x))-.023);}profile.closePath();const shell=new THREE.ExtrudeGeometry(profile,{depth:1.32,bevelEnabled:false});shell.translate(0,0,-.66);add('CLOSED_UPPER_GABLE',shell,plaster);
 for(const x of [-.78,.78])for(const z of [-.625,.625])box('GROUND_CORNER_POST',.08,.88,.08,wood,x,.62,z);
 for(const x of [-.83,.83])for(const z of [-.673,.673])box('UPPER_CORNER_POST',.078,.87,.08,wood,x,1.56,z);
 for(const z of [-.685,.685]){box('GABLE_TIE',1.38,.075,.075,wood,0,2.04,z);if(z>0)box('CENTER_UPPER_POST',.065,.87,.07,wood,0,1.56,z);}
 for(const z of [-.68,.68])for(const x of (z>0?[-.70,.24,.70]:[-.70,.24,.70]))beam('JETTY_CORBEL',V(x,.87,z*.91),V(x,1.035,z),.075,.075);
 for(const side of [-1,1]){const p:THREE.Vector3[]=[];for(let row=0;row<12;row++){const x0=row/12*.91,x1=(row+1)/12*.91,a=V(side*x0,roofY(x0),-.765),b=V(side*x1,roofY(x1),-.765),c=V(side*x0,roofY(x0),.765),d=V(side*x1,roofY(x1),.765);p.push(a,b,c,b,d,c);}upward('CLOSED_SWEPT_MAIN_ROOF',p,slate);
  for(const z of [-.773,.773]){const curve=new THREE.CatmullRomCurve3(Array.from({length:13},(_,i)=>{const x=i/12*.91;return V(side*x,roofY(x)+.012,z);}));add('SWEPT_BARGEBOARD',new THREE.TubeGeometry(curve,12,.031,5,false),wood);}
  box('EAVE_FASCIA',.065,.065,1.58,wood,side*.91,roofY(.91)-.012,0);
 }
 box('RIDGE',.08,.075,1.60,wood,0,2.91,0);
 const arch=(w:number,h:number)=>{const r=w/2,s=new THREE.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,h-r);s.absarc(0,h-r,r,0,Math.PI,false);s.closePath();return s;};
 const opening=(x:number,y:number,z:number,yaw:number,w:number,h:number,door=false,arched=false)=>{const g=new THREE.Group();macro.add(g);g.position.set(x,y,z);g.rotation.y=yaw;if(arched){add('ARCH_REVEAL',new THREE.ExtrudeGeometry(arch(w+.105,h+.06),{depth:.04,bevelEnabled:false,curveSegments:low?8:12}),stone,0,0,0,g);add('ARCH_DOOR',new THREE.ShapeGeometry(arch(w,h),10),wood,0,.01,.046,g);}else{box('OPENING_REVEAL',w+.09,h+.075,.04,dark,0,h/2,0,g);box(door?'SERVICE_DOOR':'GLAZING',w,h,.028,door?wood:glass,0,h/2,.033,g);for(const dx of [-w/2,w/2])box('JAMB',.028,h+.075,.04,wood,dx,h/2,.053,g);box('HEADER',w+.10,.045,.04,wood,0,h+.016,.053,g);}box('SILL',w+.12,.055,.105,stone,0,-.005,.05,g);if(!door){box('MULLION',.022,h,.028,wood,0,h/2,.056,g);box('TRANSOM',w,.022,.028,wood,0,h*.48,.056,g);}};
 opening(-.32,.09,.62,0,.41,.82,true,true);opening(.40,.40,.62,0,.31,.39);
 for(const x of [-.36,.36])opening(x,1.30,.675,0,.31,.52);
 opening(-.24,.09,-.62,Math.PI,.39,.82,true);opening(.43,.43,-.62,Math.PI,.26,.35);opening(0,1.38,-.675,Math.PI,.34,.43);
 opening(.794,.43,-.08,Math.PI/2,.30,.38);opening(.842,1.36,0,Math.PI/2,.33,.45);
 for(const z of [-.69,.69])beam('GABLE_KING_POST',V(0,2.09,z),V(0,2.86,z),.065,.07);
 // Left clay lean-to is buried into the main shell; its own closed slab covers the whole workroom.
 const annexY=(x:number)=>1.73+.48*(x+.64);
 const ap=new THREE.Shape();ap.moveTo(-1.60,.085);ap.lineTo(-.64,.085);ap.lineTo(-.64,annexY(-.64)-.022);ap.lineTo(-1.60,annexY(-1.60)-.022);ap.closePath();const annex=new THREE.ExtrudeGeometry(ap,{depth:.86,bevelEnabled:false});annex.translate(0,0,-.25);add('ATTACHED_SMOKEHOUSE',annex,plaster);box('WORKROOM_PLINTH',1.0,.24,.90,stone,-1.12,.20,.18);
 const mainWallBoundary=-.825;
 const aa=V(-1.685,annexY(-1.685),-.34),ab=V(mainWallBoundary,annexY(mainWallBoundary),-.34),ac=V(-1.685,annexY(-1.685),.70),ad=V(mainWallBoundary,annexY(mainWallBoundary),.70);upward('CLOSED_CLAY_LEAN_TO',[aa,ab,ac,ab,ad,ac],clay);
 // Wall-clipped roof and trim use exactly the same inner plane. Closed strip geometry avoids box-beam end projection.
 for(const z of [-.35,.71]){const a=V(-1.685,annexY(-1.685)+.024,z-.029),b=V(mainWallBoundary,annexY(mainWallBoundary)+.024,z-.029),c=V(-1.685,annexY(-1.685)+.024,z+.029),d=V(mainWallBoundary,annexY(mainWallBoundary)+.024,z+.029);upward('WALL_CLIPPED_WORKROOM_BARGE',[a,b,c,b,d,c],wood);}
 box('WORKROOM_EAVE_FASCIA',.06,.065,1.10,wood,-1.685,annexY(-1.685)-.012,.18);
 for(const z of [-.265,.625])box('WORKROOM_OUTER_POST',.07,1.145,.07,wood,-1.586,.6575,z);
 opening(-1.265,.09,.62,0,.36,.82,true);opening(-1.612,.46,.13,-Math.PI/2,.26,.37);opening(-1.10,.46,-.26,Math.PI,.28,.36);
}
