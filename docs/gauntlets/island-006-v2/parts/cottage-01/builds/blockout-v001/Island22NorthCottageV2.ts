import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island22FishermansVillageMaterials } from './Island22FishermansVillageThreeWorld';
type Groups={macro:THREE.Group;finish:THREE.Group};
type Options={quality:Island3DQuality;materials:Island22FishermansVillageMaterials};
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
/** Isolated north cottage architecture. World placement and instance ownership remain outside this module. */
export function populateIsland22NorthCottageV2({macro}:Groups,{quality}:Options){
 const low=quality==='low',mat=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.88});
 const wood=mat(0x73563a),dark=mat(0x493c2b),plaster=mat(0xe4d6b9),stone=mat(0x929889),clay=mat(0xa06d4e),slate=mat(0x516676);
 for(const m of [clay,slate]){m.side=THREE.DoubleSide;m.shadowSide=THREE.DoubleSide;}
 const glass=new THREE.MeshStandardMaterial({color:0xe7c277,emissive:0xf1bb58,emissiveIntensity:.23,roughness:.5});
 const add=(n:string,geo:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0,g=macro)=>{const o=new THREE.Mesh(geo,m);o.name='ISLAND_006_NORTH_COTTAGE_'+n;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
 const box=(n:string,w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number,g=macro)=>add(n,new THREE.BoxGeometry(w,h,d),m,x,y,z,g);
 const beam=(n:string,a:THREE.Vector3,b:THREE.Vector3,w=.07,d=.08,m=wood,g=macro)=>{const o=box(n,w,a.distanceTo(b),d,m,0,0,0,g);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());return o;};
 const tube=(n:string,p:THREE.Vector3[],r:number,m:THREE.Material,g=macro)=>add(n,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p),12,r,5,false),m,0,0,0,g);
 box('CONTINUOUS_TERRACE',2.65,.34,1.89,stone,.325,-.13,.085);box('TERRACE_CAP',2.65,.05,1.89,stone,.325,.035,.085);
 for(let i=0;i<2;i++)box('ENTRY_STEP',.63,.10,.23,stone,.31,-.085+i*.10,1.13-i*.18);
 box('GROUND_STOREY',1.55,.93,1.22,plaster,0,.525,0);box('GROUND_PLINTH',1.60,.22,1.27,stone,0,.16,0);
 box('UPPER_JETTY',1.65,.12,1.32,wood,0,1.01,0);
 // Main ridge runs along X; YZ-profile shell meets the curved roof underside exactly.
 const roofY=(z:number)=>2.70-.98*z-.27*z*z;
 const profile=new THREE.Shape();profile.moveTo(-.66,1.07);profile.lineTo(.66,1.07);for(let i=0;i<=16;i++){const z=.66-i/16*1.32;profile.lineTo(z,roofY(Math.abs(z))-.023);}profile.closePath();
 const shell=new THREE.ExtrudeGeometry(profile,{depth:1.65,bevelEnabled:false});shell.rotateY(Math.PI/2);shell.translate(-.825,0,0);add('UPPER_CONTINUOUS_GABLED_SHELL',shell,plaster);
 for(const x of [-.79,.79])for(const z of [-.615,.615])box('GROUND_CORNER_POST',.08,.86,.08,wood,x,.56,z);
 for(const x of [-.83,.83])for(const z of [-.66,.66])box('UPPER_CORNER_POST',.085,.72,.085,wood,x,1.43,z);
 for(const x of [-.85,.85]){box('SIDE_GABLE_TIE',.09,.10,1.24,wood,x,1.90,0);beam('GABLE_KING_POST',V(x,1.94,0),V(x,2.66,0),.07,.075);}
 for(const z of [-.63,.63])box('FRONT_EAVE_BEAM',1.74,.095,.09,wood,0,1.82,z);
 for(const z of [-.66,.66])for(const x of [-.68,-.20,.27,.69])beam('JETTY_CORBEL',V(x,.82,z*.92),V(x,.99,z*1.03),.075,.075);
 for(const side of [-1,1]){
  const p:number[]=[],idx:number[]=[];for(let i=0;i<=12;i++){const z=i/12*.80;p.push(-.96,roofY(z),side*z,.96,roofY(z),side*z);if(i<12){const k=i*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(idx);geo.computeVertexNormals();add('CURVED_CLAY_ROOF',geo,clay);
  for(const x of [-.97,.97])tube('CURVED_MAIN_BARGE',Array.from({length:13},(_,i)=>{const z=i/12*.8;return V(x,roofY(z)+.015,side*z);}),.038,wood);
  box('ROOF_EAVE_FASCIA',1.98,.075,.075,wood,0,roofY(.8),side*.8);
 }
 box('MAIN_RIDGE',2.02,.085,.095,wood,0,2.72,0);
 const opening=(x:number,y:number,z:number,yaw:number,w:number,h:number,door=false,arched=false)=>{
  const g=new THREE.Group();macro.add(g);g.position.set(x,y,z);g.rotation.y=yaw;
  if(arched){const shape=(width:number,height:number)=>{const r=width/2,s=new THREE.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,height-r);s.absarc(0,height-r,r,0,Math.PI,false);s.closePath();return s;};add('ARCH_REVEAL',new THREE.ExtrudeGeometry(shape(w+.10,h+.06),{depth:.04,bevelEnabled:false,curveSegments:low?8:12}),stone,0,0,0,g);add('ARCH_DOOR',new THREE.ShapeGeometry(shape(w,h),10),wood,0,.01,.046,g);}
  else{box('OPENING_REVEAL',w+.10,h+.09,.055,dark,0,h/2,0,g);box(door?'SERVICE_DOOR':'WINDOW_GLAZING',w,h,.028,door?wood:glass,0,h/2,.036,g);for(const dx of [-w/2,w/2])box('OPENING_JAMB',.035,h+.09,.04,wood,dx,h/2,.055,g);box('OPENING_HEADER',w+.1,.045,.045,wood,0,h+.018,.055,g);}
  box('OPENING_SILL',w+.14,.055,.12,wood,0,-.005,.05,g);
  if(!door){box('MULLION',.025,h,.035,wood,0,h/2,.058,g);box('TRANSOM',w,.025,.035,wood,0,h*.50,.058,g);}
 };
 opening(.32,.07,.62,0,.40,.77,true,true);opening(-.39,.39,.62,0,.31,.40);
 opening(-.10,1.26,.674,0,.42,.45);opening(0,1.28,-.674,Math.PI,.38,.42);
 opening(-.837,1.28,0,-Math.PI/2,.34,.43);opening(.837,1.64,0,Math.PI/2,.30,.23);
 opening(-.25,.07,-.62,Math.PI,.40,.77,true);opening(.43,.39,-.62,Math.PI,.27,.37);opening(-.795,.40,-.05,-Math.PI/2,.31,.38);
 // Low annex is deliberately buried into the main wall; lean-to rises against the parent.
 const annexY=(x:number)=>1.62-(x-.64)*.60;
 const ap=new THREE.Shape();ap.moveTo(.64,.06);ap.lineTo(1.51,.06);ap.lineTo(1.51,annexY(1.51)-.02);ap.lineTo(.64,annexY(.64)-.02);ap.closePath();const ag=new THREE.ExtrudeGeometry(ap,{depth:.82,bevelEnabled:false});ag.translate(0,0,-.23);add('ATTACHED_ANNEX_WALL',ag,plaster);
 box('ANNEX_PLINTH',.93,.22,.87,stone,1.075,.16,.18);
 const rp=new THREE.BufferGeometry().setFromPoints([V(.65,annexY(.65),-.33),V(1.61,annexY(1.61),-.33),V(.65,annexY(.65),.69),V(1.61,annexY(1.61),-.33),V(1.61,annexY(1.61),.69),V(.65,annexY(.65),.69)]);rp.computeVertexNormals();add('ANNEX_LEAN_ROOF',rp,slate);
 for(const z of [-.345,.705])beam('ANNEX_BARGE',V(.67,annexY(.67)+.015,z),V(1.61,annexY(1.61)+.015,z),.07,.08);
 box('ANNEX_FASCIA',.075,.075,1.09,wood,1.61,annexY(1.61),.18);
 for(const z of [-.245,.605])box('ANNEX_CORNER',.065,.90,.065,wood,1.49,.52,z);
 opening(1.12,.07,.602,0,.32,.71,true);opening(1.523,.40,.18,Math.PI/2,.24,.32);opening(1.12,.40,-.244,Math.PI,.27,.32);
 // Front dormer has a closed shell buried in the roof, with an occupied rectangular window.
 const ds=new THREE.Shape();ds.moveTo(-.22,2.02);ds.lineTo(.22,2.02);ds.lineTo(.22,2.41);ds.lineTo(0,2.61);ds.lineTo(-.22,2.41);ds.closePath();const dg=new THREE.ExtrudeGeometry(ds,{depth:.40,bevelEnabled:false});dg.translate(-.12,0,.23);add('DORMER_SHELL',dg,plaster);
 for(const side of [-1,1]){const a=V(-.12,2.64,.18),b=V(-.12+side*.28,2.39,.18),c=V(-.12,2.64,.70),d=V(-.12+side*.28,2.39,.70),g=new THREE.BufferGeometry().setFromPoints([a,b,c,b,d,c]);g.computeVertexNormals();add('DORMER_ROOF',g,clay);beam('DORMER_BARGE',V(-.12,2.65,.72),V(-.12+side*.28,2.40,.72),.055,.065);}
 opening(-.12,2.09,.638,0,.27,.29);
 box('STONE_CHIMNEY',.25,.71,.25,stone,.57,2.64,-.19);box('CHIMNEY_CAP',.32,.085,.32,stone,.57,3.005,-.19);
 // Rear service canopy is carried by two wall brackets, clear of the door aperture.
 const canopy=new THREE.BufferGeometry().setFromPoints([V(-.57,1.06,-.61),V(.07,1.06,-.61),V(-.57,.93,-.93),V(.07,1.06,-.61),V(.07,.93,-.93),V(-.57,.93,-.93)]);canopy.computeVertexNormals();add('REAR_SERVICE_SHELTER',canopy,slate);
 for(const x of [-.53,.03])beam('SHELTER_BRACKET',V(x,.79,-.66),V(x,.96,-.89),.045,.045);box('SHELTER_FASCIA',.68,.05,.06,wood,-.25,.93,-.94);
}
