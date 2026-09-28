import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island22FishermansVillageMaterials } from './Island22FishermansVillageThreeWorld';
type Groups={macro:THREE.Group;finish:THREE.Group};
type Options={quality:Island3DQuality;materials:Island22FishermansVillageMaterials};
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
/** Single-storey sailmaker cottage. Canonical placement remains owned by its world factory. */
export function populateIsland22SailmakerCottageV2({macro}:Groups,{quality}:Options){
 const low=quality==='low',mat=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.88});
 const wood=mat(0x795c3d),dark=mat(0x463b2c),plaster=mat(0xe2d4b6),stone=mat(0x989d90),slate=mat(0xab744f);
 slate.shadowSide=THREE.DoubleSide;
 const glass=new THREE.MeshStandardMaterial({color:0xe5be72,emissive:0xf0bb60,emissiveIntensity:.25,roughness:.5});
 const add=(n:string,geo:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0,g=macro)=>{const o=new THREE.Mesh(geo,m);o.name='ISLAND_006_SAILMAKER_'+n;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
 const box=(n:string,w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number,g=macro)=>add(n,new THREE.BoxGeometry(w,h,d),m,x,y,z,g);
 const beam=(n:string,a:THREE.Vector3,b:THREE.Vector3,w=.065,d=.07,m=wood,g=macro)=>{const o=box(n,w,a.distanceTo(b),d,m,0,0,0,g);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());return o;};
 // Closed roof slabs own their top, downward-facing soffit and all boundary caps.
 const upward=(n:string,p:THREE.Vector3[],m:THREE.Material)=>{
  for(let i=0;i<p.length;i+=3)if(p[i+1].clone().sub(p[i]).cross(p[i+2].clone().sub(p[i])).y<0)[p[i+1],p[i+2]]=[p[i+2],p[i+1]];
  const thickness=.035,vertices:THREE.Vector3[]=[],edges=new Map<string,{a:THREE.Vector3;b:THREE.Vector3;count:number}>();
  const key=(v:THREE.Vector3)=>`${v.x.toFixed(7)},${v.y.toFixed(7)},${v.z.toFixed(7)}`;
  for(let i=0;i<p.length;i+=3){const a=p[i],b=p[i+1],c=p[i+2],down=(v:THREE.Vector3)=>v.clone().add(V(0,-thickness,0));vertices.push(a,b,c,down(a),down(c),down(b));for(const [u,v]of [[a,b],[b,c],[c,a]]){const k=[key(u),key(v)].sort().join('|'),e=edges.get(k);if(e)e.count++;else edges.set(k,{a:u,b:v,count:1});}}
  for(const e of edges.values())if(e.count===1){const ad=e.a.clone().add(V(0,-thickness,0)),bd=e.b.clone().add(V(0,-thickness,0));vertices.push(e.a,ad,e.b,e.b,ad,bd);}
  const g=new THREE.BufferGeometry().setFromPoints(vertices);g.computeVertexNormals();return add(n,g,m);
 };
 box('CONTINUOUS_TERRACE',1.88,.31,1.62,stone,0,-.105,.08);box('TERRACE_CAP',1.88,.045,1.62,stone,0,.0575,.08);
 box('ENTRY_STEP',.57,.105,.25,stone,.16,-.005,.875);
 // The closed gable follows the same analytic profile as its swept roof.
 const roofY=(x:number)=>2.25-1.45*x+.45*x*x;
 const shape=new THREE.Shape();shape.moveTo(-.71,.08);shape.lineTo(.71,.08);for(let i=0;i<=16;i++){const x=.71-i/16*1.42;shape.lineTo(x,roofY(Math.abs(x))-.02);}shape.closePath();
 const shell=new THREE.ExtrudeGeometry(shape,{depth:1.22,bevelEnabled:false});shell.translate(0,0,-.61);add('CONTINUOUS_GABLED_SHELL',shell,plaster);
 box('STONE_PLINTH',1.46,.24,1.26,stone,0,.20,0);
 for(const x of [-.712,.712])for(const z of [-.625,.625])box('CORNER_TIMBER',.07,1.08,.07,wood,x,.78,z);
 // Beam ends sit below the sloping roof, with no square end penetrating either sheet.
 for(const z of [-.632,.632])box('GABLE_TIE',1.20,.075,.075,wood,0,1.385,z);
 beam('REAR_KING_POST',V(0,1.43,-.644),V(0,2.205,-.644),.055,.06);
 for(const side of [-1,1]){
  const p:THREE.Vector3[]=[];for(let row=0;row<12;row++){const x0=row/12*.835,x1=(row+1)/12*.835,a=V(side*x0,roofY(x0),-.735),b=V(side*x1,roofY(x1),-.735),c=V(side*x0,roofY(x0),.735),d=V(side*x1,roofY(x1),.735);p.push(a,b,c,b,d,c);}upward('SWEPT_SLATE_ROOF',p,slate);
  for(const z of [-.744,.744]){const curve=new THREE.CatmullRomCurve3(Array.from({length:13},(_,i)=>{const x=i/12*.835;return V(side*x,roofY(x)+.012,z);}));add('CURVED_BARGEBOARD',new THREE.TubeGeometry(curve,12,.034,5,false),wood);}
  box('EAVE_FASCIA',.065,.065,1.52,wood,side*.835,roofY(.835),0);
 }
 box('RIDGE',.08,.075,1.56,wood,0,2.27,0);
 const arch=(w:number,h:number)=>{const r=w/2,s=new THREE.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,h-r);s.absarc(0,h-r,r,0,Math.PI,false);s.closePath();return s;};
 const opening=(x:number,y:number,z:number,yaw:number,w:number,h:number,door=false,arched=false)=>{const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=yaw;macro.add(g);
  if(arched){add('ARCH_REVEAL',new THREE.ExtrudeGeometry(arch(w+.095,h+.05),{depth:.04,bevelEnabled:false,curveSegments:low?8:12}),stone,0,0,0,g);add('ARCHED_DOOR',new THREE.ShapeGeometry(arch(w,h),10),wood,0,.009,.046,g);}
  else{box('OPENING_REVEAL',w+.09,h+.075,.04,dark,0,h/2,0,g);box(door?'SERVICE_DOOR':'WINDOW_GLAZING',w,h,.026,door?wood:glass,0,h/2,.029,g);for(const dx of [-w/2,w/2])box('JAMB',.027,h+.065,.035,wood,dx,h/2,.05,g);box('HEADER',w+.105,.04,.04,wood,0,h+.015,.052,g);}
  box('SILL',w+.12,.05,.105,stone,0,-.005,.047,g);if(!door){box('MULLION',.022,h,.025,wood,0,h/2,.049,g);box('TRANSOM',w,.022,.025,wood,0,h*.5,.049,g);}
 };
 opening(.22,.085,.62,0,.43,1.02,true,true);opening(-.43,.49,.62,0,.27,.41);
 opening(-.18,.085,-.62,Math.PI,.37,.86,true);opening(.42,.50,-.62,Math.PI,.24,.36);
 opening(.723,.49,-.04,Math.PI/2,.34,.42);opening(-.723,.60,-.27,-Math.PI/2,.27,.34);
 // A modest occupied loft window fills the front gable without a second storey.
 opening(0,1.61,.62,0,.28,.30);
}
