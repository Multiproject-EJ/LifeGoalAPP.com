import * as THREE from 'three';
import type { Island22PremiumLandmarkFactoryOptions } from './Island22PremiumLandmarkFamilies';
type Groups={macro:THREE.Group;operations:THREE.Group;restored:THREE.Group};
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
/** Market geometry only. Root factory owns canonical placement and construction visibility. */
export function populateIsland22FishMarketV2({macro,operations}:Groups,{quality}:Island22PremiumLandmarkFactoryOptions){
 const low=quality==='low',mat=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.88});
 const wood=mat(0x816342),dark=mat(0x483d2e),plaster=mat(0xe1d3b4),stone=mat(0x92988a),slate=mat(0x496170),teal=mat(0x70938d),canvas=mat(0xdbd4b9),iron=mat(0x414b47),rope=mat(0xa58b5d);
 for(const m of [slate,teal,canvas]){m.side=THREE.DoubleSide;m.shadowSide=THREE.DoubleSide;}
 const glass=new THREE.MeshStandardMaterial({color:0x83aaa6,roughness:.4,emissive:0xd6b77c,emissiveIntensity:.12});
 const add=(g:THREE.Group,n:string,geo:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0)=>{const o=new THREE.Mesh(geo,m);o.name='ISLAND_006_MARKET_'+n;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
 const box=(g:THREE.Group,n:string,w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number)=>add(g,n,new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const beam=(g:THREE.Group,n:string,a:THREE.Vector3,b:THREE.Vector3,w=.10,d=.10,m=wood)=>{const o=box(g,n,w,a.distanceTo(b),d,m,0,0,0);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());return o;};
 const tube=(g:THREE.Group,n:string,p:THREE.Vector3[],r:number,m:THREE.Material,steps=16)=>add(g,n,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p),steps,r,5,false),m);
 const cyl=(g:THREE.Group,n:string,r:number,h:number,m:THREE.Material,x:number,y:number,z:number)=>add(g,n,new THREE.CylinderGeometry(r,r,h,low?8:12),m,x,y,z);
 box(macro,'CONTINUOUS_PIER_DECK',3.5,.15,3.2,wood,-.15,.225,.2);
 for(const z of [-1.21,1.6]){box(macro,'PIER_STRINGER',3.5,.15,.15,dark,-.15,.08,z);for(const x of [-1.7,-.15,1.4])cyl(macro,'PIER_PILE',.10,1.1,wood,x,-.2,z);for(const pair of [[-1.7,-.15],[-.15,1.4]])for(const flip of [false,true])beam(macro,'PIER_X_BRACE',V(pair[0],flip?-.48:.04,z),V(pair[1],flip?.04:-.48,z),.09,.09);}
 for(const x of [-1.7,1.4]){box(macro,'SIDE_STRINGER',.15,.15,2.8,dark,x,.08,.2);for(const flip of [false,true])beam(macro,'SIDE_X_BRACE',V(x,flip?-.48:.04,-1.2),V(x,flip?.04:-.48,1.6),.09,.09);}
 const cx=.22,cz=-.43,eave=1.62,roofY=(x:number)=>2.4-.60*x-.17*x*x;
 const shape=new THREE.Shape();shape.moveTo(-1.025,.30);shape.lineTo(1.025,.30);for(let i=0;i<=16;i++){const x=1.025-i/16*2.05;shape.lineTo(x,roofY(Math.abs(x))-.027);}shape.closePath();
 const wall=new THREE.ExtrudeGeometry(shape,{depth:1.55,bevelEnabled:false});wall.translate(cx,0,cz-.775);add(macro,'CONTINUOUS_COTTAGE',wall,plaster);
 box(macro,'COTTAGE_STONE_PLINTH',2.1,.32,1.59,stone,cx,.46,cz);
 for(const x of [cx-1.025,cx+1.025])for(const z of [cz-.79,cz+.79])box(macro,'CORNER_POST',.10,1.23,.10,wood,x,.94,z);
 for(const z of [cz-.81,cz+.81]){box(macro,'GABLE_TIE',1.86,.095,.095,wood,cx,eave,z);beam(macro,'KING_POST',V(cx,eave,z),V(cx,2.37,z),.075,.08);}
 for(const side of [-1,1]){
  const p:number[]=[],idx:number[]=[];
  for(let i=0;i<=12;i++){const x=i/12*1.17;p.push(cx+side*x,roofY(x),cz-.92,cx+side*x,roofY(x),cz+.92);if(i<12){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();add(macro,'SWEPT_SLATE_ROOF',g,slate);
  for(const z of [cz-.94,cz+.94])tube(macro,'CURVED_BARGE',Array.from({length:13},(_,i)=>{const x=i/12*1.17;return V(cx+side*x,roofY(x)+.018,z);}),.043,wood);
  box(macro,'EAVE_EDGE',.09,.09,1.9,wood,cx+side*1.17,roofY(1.17),cz);
 }
 box(macro,'RIDGE',.095,.095,1.96,wood,cx,2.42,cz);
 const arch=(w:number,h:number)=>{const r=w/2,s=new THREE.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,h-r);s.absarc(0,h-r,r,0,Math.PI,false);s.closePath();return s;};
 const opening=(x:number,y:number,z:number,yaw:number,w:number,h:number,door=false)=>{
  const g=new THREE.Group();macro.add(g);g.position.set(x,y,z);g.rotation.y=yaw;
  add(g,'ARCH_FRAME',new THREE.ExtrudeGeometry(arch(w+.10,h+.05),{depth:.045,bevelEnabled:false,curveSegments:10}),wood);
  add(g,door?'DOOR':'WINDOW',new THREE.ShapeGeometry(arch(w,h),10),door?dark:glass,0,.015,.051);
  box(g,'CENTER_MULLION',.027,h-.02,.025,wood,0,h/2,.07);if(!door)box(g,'TRANSOM',w,.028,.025,wood,0,h*.5,.07);
  box(g,'SILL',w+.15,.065,.11,wood,0,-.02,.055);
 };
 opening(cx,.32,.353,0,.57,1.10,true);opening(cx-.68,.78,.353,0,.35,.64);opening(cx+.68,.78,.353,0,.35,.64);
 opening(cx,.32,-1.213,Math.PI,.62,1.12,true);opening(1.253,.72,-.42,Math.PI/2,.42,.66);opening(-.813,.72,-.42,-Math.PI/2,.42,.66);
 opening(cx,1.84,.39,0,.30,.31);opening(cx,1.84,-1.25,Math.PI,.30,.31);
 box(macro,'CHIMNEY',.25,.66,.27,stone,.87,2.18,-.85);box(macro,'CHIMNEY_CAP',.32,.09,.34,stone,.87,2.52,-.85);
 // Canvas forms a single sagging sheet, partitioned only for the alternating woven bands.
 const left=cx-1.1,right=cx+1.1,canopyY=(t:number)=>1.62-.34*t-.075*Math.sin(Math.PI*t);
 for(let stripe=0;stripe<10;stripe++){
  const x0=left+stripe/10*(right-left),x1=left+(stripe+1)/10*(right-left),p:number[]=[],idx:number[]=[];
  for(let j=0;j<=10;j++){const t=j/10;p.push(x0,canopyY(t),.42+t*.76,x1,canopyY(t),.42+t*.76);if(j<10){const k=j*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();add(operations,'CANVAS_BAND',g,stripe%2?canvas:teal);
  box(operations,'CANVAS_VALANCE',x1-x0,.105,.022,stripe%2?canvas:teal,(x0+x1)/2,1.233,1.18);
 }
 for(const x of [left,right]){box(operations,'CANOPY_POST',.075,1.06,.075,wood,x,.81,1.18);beam(operations,'CANOPY_SIDE_RAIL',V(x,1.60,.42),V(x,1.275,1.18),.04,.04);}
 box(operations,'CANOPY_FRONT_BAR',2.27,.05,.05,wood,cx,1.27,1.18);
 for(const x of [cx-.69,cx+.69]){box(operations,'COUNTER_BODY',.64,.36,.56,wood,x,.48,.91);box(operations,'COUNTER_TOP',.68,.06,.60,dark,x,.69,.91);for(const dx of [-.27,.27])box(operations,'COUNTER_LEG',.07,.4,.07,wood,x+dx,.50,1.16);}
 // Crane occupies the open left strip; boom and hook swing away from both roof and canvas.
 const mx=-1.55,mz=.61;box(operations,'DERRICK_MAST',.15,2.32,.15,wood,mx,1.46,mz);
 for(const z of [.17,1.12])beam(operations,'DERRICK_FOOT_BRACE',V(mx,.33,z),V(mx,1.47,mz),.10,.10);
 beam(operations,'DERRICK_BOOM',V(mx,2.43,mz),V(-2.35,2.79,mz),.105,.11);
 beam(operations,'DERRICK_DIAGONAL',V(mx,1.37,mz),V(-2.35,2.76,mz),.085,.095);
 for(const y of [1.39,2.43])box(operations,'MAST_IRON_COLLAR',.19,.065,.19,iron,mx,y,mz);
 const pulley=add(operations,'BOOM_PULLEY',new THREE.CylinderGeometry(.072,.072,.075,12),iron,-2.35,2.77,mz);pulley.rotation.x=Math.PI/2;
 for(const x of [-2.38,-2.32])beam(operations,'HOIST_ROPE',V(x,2.75,mz),V(x,1.73,mz),.017,.017,rope);
 const lower=add(operations,'HOOK_PULLEY',new THREE.CylinderGeometry(.055,.055,.065,10),iron,-2.35,1.74,mz);lower.rotation.x=Math.PI/2;
 tube(operations,'OPEN_HOOK',[V(-2.35,1.70,mz),V(-2.35,1.58,mz),V(-2.40,1.49,mz),V(-2.48,1.54,mz),V(-2.46,1.60,mz)],.018,iron,12);
}
