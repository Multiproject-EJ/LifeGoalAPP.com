import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island22FishermansVillageMaterials } from './Island22FishermansVillageThreeWorld';
type Groups={macro:THREE.Group;finish:THREE.Group};
type Options={quality:Island3DQuality;materials:Island22FishermansVillageMaterials};
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
/** Narrow-plot net mender cottage. Canonical placement remains owned by its world factory. */
export function populateIsland22NetMenderCottageV2({macro}:Groups,{quality}:Options){
 const low=quality==='low',mat=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.88});
 const wood=mat(0x795c3d),dark=mat(0x463b2c),plaster=mat(0xe2d4b6),stone=mat(0x989d90),slate=mat(0x496371);
 slate.shadowSide=THREE.DoubleSide;
 const glass=new THREE.MeshStandardMaterial({color:0xe5be72,emissive:0xf0bb60,emissiveIntensity:.25,roughness:.5});
 const add=(n:string,geo:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0,g=macro)=>{const o=new THREE.Mesh(geo,m);o.name='ISLAND_006_NET_MENDER_'+n;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
 const box=(n:string,w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number,g=macro)=>add(n,new THREE.BoxGeometry(w,h,d),m,x,y,z,g);
 const beam=(n:string,a:THREE.Vector3,b:THREE.Vector3,w=.065,d=.07,m=wood,g=macro)=>{const o=box(n,w,a.distanceTo(b),d,m,0,0,0,g);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());return o;};
 const upward=(n:string,p:THREE.Vector3[],m:THREE.Material)=>{for(let i=0;i<p.length;i+=3)if(p[i+1].clone().sub(p[i]).cross(p[i+2].clone().sub(p[i])).y<0)[p[i+1],p[i+2]]=[p[i+2],p[i+1]];const g=new THREE.BufferGeometry().setFromPoints(p);g.computeVertexNormals();return add(n,g,m);};
 box('CONTINUOUS_TERRACE',1.88,.31,1.62,stone,0,-.105,.08);box('TERRACE_CAP',1.88,.045,1.62,stone,0,.0575,.08);
 box('ENTRY_STEP',.57,.105,.25,stone,.16,-.005,.875);
 // The closed gable follows the same analytic profile as its swept roof.
 const roofY=(x:number)=>2.1-1.35*x+(.303105/.697225)*x*x;
 const shape=new THREE.Shape();shape.moveTo(-.71,.08);shape.lineTo(.71,.08);for(let i=0;i<=16;i++){const x=.71-i/16*1.42;shape.lineTo(x,roofY(Math.abs(x))-.02);}shape.closePath();
 const shell=new THREE.ExtrudeGeometry(shape,{depth:1.22,bevelEnabled:false});shell.translate(0,0,-.61);add('CONTINUOUS_GABLED_SHELL',shell,plaster);
 box('STONE_PLINTH',1.46,.24,1.26,stone,0,.20,0);
 for(const x of [-.712,.712])for(const z of [-.625,.625])box('CORNER_TIMBER',.07,1.08,.07,wood,x,.78,z);
 // Beam ends sit below the sloping roof, with no square end penetrating either sheet.
 for(const z of [-.632,.632])box('GABLE_TIE',1.20,.075,.075,wood,0,1.385,z);
 beam('REAR_KING_POST',V(0,1.43,-.644),V(0,2.055,-.644),.055,.06);
 for(const side of [-1,1]){
  const p:THREE.Vector3[]=[];for(let row=0;row<12;row++){const x0=row/12*.835,x1=(row+1)/12*.835,a=V(side*x0,roofY(x0),-.735),b=V(side*x1,roofY(x1),-.735),c=V(side*x0,roofY(x0),.735),d=V(side*x1,roofY(x1),.735);p.push(a,b,c,b,d,c);}upward('SWEPT_SLATE_ROOF',p,slate);
  for(const z of [-.744,.744]){const curve=new THREE.CatmullRomCurve3(Array.from({length:13},(_,i)=>{const x=i/12*.835;return V(side*x,roofY(x)+.012,z);}));add('CURVED_BARGEBOARD',new THREE.TubeGeometry(curve,12,.034,5,false),wood);}
  box('EAVE_FASCIA',.065,.065,1.52,wood,side*.835,roofY(.835),0);
 }
 box('RIDGE',.08,.075,1.56,wood,0,2.12,0);
 const arch=(w:number,h:number)=>{const r=w/2,s=new THREE.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,h-r);s.absarc(0,h-r,r,0,Math.PI,false);s.closePath();return s;};
 const opening=(x:number,y:number,z:number,yaw:number,w:number,h:number,door=false,arched=false)=>{const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=yaw;macro.add(g);
  if(arched){add('ARCH_REVEAL',new THREE.ExtrudeGeometry(arch(w+.095,h+.05),{depth:.04,bevelEnabled:false,curveSegments:low?8:12}),stone,0,0,0,g);add('ARCHED_DOOR',new THREE.ShapeGeometry(arch(w,h),10),wood,0,.009,.046,g);}
  else{box('OPENING_REVEAL',w+.09,h+.075,.04,dark,0,h/2,0,g);box(door?'SERVICE_DOOR':'WINDOW_GLAZING',w,h,.026,door?wood:glass,0,h/2,.029,g);for(const dx of [-w/2,w/2])box('JAMB',.027,h+.065,.035,wood,dx,h/2,.05,g);box('HEADER',w+.105,.04,.04,wood,0,h+.015,.052,g);}
  box('SILL',w+.12,.05,.105,stone,0,-.005,.047,g);if(!door){box('MULLION',.022,h,.025,wood,0,h/2,.049,g);box('TRANSOM',w,.022,.025,wood,0,h*.5,.049,g);}
 };
 opening(.16,.085,.62,0,.43,.94,true,true);opening(-.43,.49,.62,0,.27,.41);
 opening(-.18,.085,-.62,Math.PI,.37,.86,true);opening(.42,.50,-.62,Math.PI,.24,.36);
 opening(.723,.49,-.04,Math.PI/2,.34,.42);opening(-.723,.60,-.27,-Math.PI/2,.27,.34);
 // Circular loft aperture stays entirely above the supported porch canopy.
 const loft=add('ROUND_LOFT_FRAME',new THREE.TorusGeometry(.128,.028,6,low?16:24),stone,0,1.70,.641);
 add('ROUND_LOFT_GLAZING',new THREE.CircleGeometry(.115,low?16:24),glass,0,1.70,.647);
 box('LOFT_MULLION',.018,.23,.025,wood,0,1.70,.666);box('LOFT_TRANSOM',.23,.018,.025,wood,0,1.70,.666);
 // Compact porch uses side brackets fixed outside the arched door; no floating supports or blocked threshold.
 const porchY=(z:number)=>1.385-(z-.61)*.35;
 const pa=V(-.23,porchY(.60),.60),pb=V(.55,porchY(.60),.60),pc=V(-.23,porchY(.92),.92),pd=V(.55,porchY(.92),.92);upward('PORCH_CANOPY',[pa,pb,pc,pb,pd,pc],slate);
 for(const x of [-.23,.55]){beam('PORCH_BARGE',V(x,porchY(.60)+.012,.60),V(x,porchY(.92)+.012,.92),.047,.055);box('PORCH_WALL_POST',.06,.26,.065,wood,x,1.18,.66);beam('PORCH_BRACKET',V(x,1.065,.665),V(x,porchY(.875)-.02,.875),.048,.052);}
 box('PORCH_FRONT_FASCIA',.84,.055,.055,wood,.16,porchY(.92),.932);
 box('STONE_CHIMNEY',.20,.785,.23,stone,.49,1.7925,-.38);box('CHIMNEY_CAP',.265,.07,.285,stone,.49,2.22,-.38);
}
