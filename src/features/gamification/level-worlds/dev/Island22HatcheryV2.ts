import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import type { Island22PremiumLandmarkFactoryOptions } from './Island22PremiumLandmarkFamilies';
type Groups={macro:THREE.Group;operations:THREE.Group;restored:THREE.Group};
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
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

/** Visual-only hatchery geometry; canonical construction parts stay in the family factory. */
export function populateIsland22HatcheryV2({macro,operations,restored}:Groups,{quality}:Island22PremiumLandmarkFactoryOptions){
 const low=quality==='low';
 const mat=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.88});
 const plaster=mat(0xe3ceb0),wood=mat(0x795337),dark=mat(0x423326),deck=mat(0xa78554),stone=mat(0x8b968d),rope=mat(0xc8b288),slate=mat(0x405665);
 const grain=woodGrainTexture();for(const m of [wood,dark,deck])m.map=grain;
 const glass=new THREE.MeshStandardMaterial({color:0xeeb758,emissive:0xde932c,emissiveIntensity:.35,roughness:.45});
 const water=new THREE.MeshStandardMaterial({color:0x218f9a,roughness:.26,metalness:.18});
 const add=(g:THREE.Group,name:string,geometry:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0)=>{const mesh=new THREE.Mesh(geometry,m);mesh.name='ISLAND_006_HATCHERY_'+name;mesh.position.set(x,y,z);g.add(mesh);return mesh;};
 const box=(g:THREE.Group,name:string,w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number)=>add(g,name,chamferedBox(w,h,d,Math.min(.014,w*.12,h*.12,d*.12)),m,x,y,z);
 const beam=(g:THREE.Group,name:string,a:THREE.Vector3,b:THREE.Vector3,w:number,d:number,m=wood)=>{const mesh=box(g,name,w,a.distanceTo(b),d,m,0,0,0);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());return mesh;};
 const tube=(g:THREE.Group,name:string,points:THREE.Vector3[],r:number,m:THREE.Material,n=10)=>add(g,name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),n,r,4,false),m);
 box(macro,'QUAY',3.65,.5,3.08,stone,0,-.01,0);
 box(macro,'QUAY_CAP',3.76,.12,3.18,stone,0,.3,0);
 for(let i=0;i<3;i++)box(macro,'ENTRY_STEP',.82,.16,.3,stone,.18,-.14+i*.16,1.96-i*.24);
 // Two real open basins with a timber service bridge between them.
 for(const z of [-.74,.42]){
  box(macro,'BASIN_FLOOR',1.92,.12,.95,dark,-.79,.41,z);
  box(macro,'NURSERY_WATER',1.64,.025,.74,water,-.79,.53,z);
  for(const x of [-1.74,.16])box(macro,'BASIN_SIDE',.16,.31,1.06,stone,x,.52,z);
  for(const dz of [-.49,.49])box(macro,'BASIN_END',1.8,.31,.14,stone,-.79,.52,z+dz);
 }
 for(let i=0;i<9;i++)box(macro,'SERVICE_BRIDGE_PLANK',.204,.09,.29,deck,-1.62+i*.205,.72,-.16);
 for(const z of [-.3,-.02])box(macro,'BRIDGE_STRINGER',1.95,.1,.075,wood,-.79,.64,z);
 const cx=1.04,cz=-.36,eave=1.65,rise=.75;
 const roofY=(x:number)=>eave+.8-.78*x-.14*x*x;
 const profile=new THREE.Shape();profile.moveTo(-.65,.36);profile.lineTo(.65,.36);for(let i=0;i<=12;i++){const x=.65-i/12*1.3;profile.lineTo(x,roofY(Math.abs(x))-.035);}profile.closePath();
 const shell=new THREE.ExtrudeGeometry(profile,{depth:1.72,bevelEnabled:false});shell.translate(cx,0,cz-.86);add(macro,'CONTINUOUS_COTTAGE',shell,plaster);
 box(macro,'HOUSE_PLINTH',1.39,.22,1.8,stone,cx,.46,cz);
 for(const dx of [-.65,.65])for(const dz of [-.86,.86])box(macro,'HOUSE_CORNER_POST',.095,1.15,.105,wood,cx+dx,1.06,cz+dz);
 for(const z of [cz-.89,cz+.89]){box(macro,'GABLE_TIE',1.43,.11,.12,wood,cx,eave,z);beam(macro,'KING_POST',V(cx,eave,z),V(cx,eave+rise,z),.09,.11);}
 for(const side of [-1,1]){
  const p:number[]=[],idx:number[]=[],uv:number[]=[];
  for(let i=0;i<=6;i++){const x=i/6*.84;p.push(cx+side*x,roofY(x),cz-1,cx+side*x,roofY(x),cz+1);uv.push(i/6,0,i/6,1);if(i<6){const a=i*2;if(side===1)idx.push(a,a+1,a+2,a+1,a+3,a+2);else idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();add(macro,'CURVED_SLATE_ROOF',geo,slate);
  for(const z of [cz-1.015,cz+1.015])for(let i=0;i<6;i++){const x=i/6*.84,x2=(i+1)/6*.84;beam(macro,'BARGEBOARD',V(cx+side*x,roofY(x),z),V(cx+side*x2,roofY(x2),z),.085,.09);}
  beam(macro,'EAVE',V(cx+side*.84,roofY(.84),cz-1.04),V(cx+side*.84,roofY(.84),cz+1.04),.1,.1);
 }
 box(macro,'RIDGE',.11,.1,2.12,wood,cx,roofY(0),cz);
 box(macro,'CHIMNEY',.27,.64,.29,stone,cx+.3,2.4,cz-.44);box(macro,'CHIMNEY_CAP',.36,.08,.38,stone,cx+.3,2.74,cz-.44);box(macro,'FLUE',.16,.015,.18,dark,cx+.3,2.789,cz-.44);
 // Openings are architectural, present from level one, with no overlapping door/window.
 const window=(x:number,y:number,z:number,w:number,h:number,angle=0)=>{const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=angle;macro.add(g);box(g,'WINDOW_RECESS',w+.1,h+.1,.035,dark,0,0,0);box(g,'AMBER_PANES',w,h,.026,glass,0,0,.027);for(const s of [-1,1]){box(g,'WINDOW_JAMB',.045,h+.09,.08,wood,s*w/2,0,.035);box(g,'WINDOW_RAIL',w+.1,.045,.08,wood,0,s*h/2,.035);}box(g,'MULLION',.028,h,.04,wood,0,0,.065);box(g,'CROSSBAR',w,.028,.04,wood,0,0,.065);box(g,'SILL',w+.18,.065,.15,stone,0,-h/2-.045,.04);};
 window(cx,1.99,cz+.873,.28,.33);window(cx,1.99,cz-.873,.28,.33,Math.PI);
 window(cx+.37,1.05,cz+.873,.25,.42);window(cx,1.1,cz-.873,.49,.46,Math.PI);
 for(const side of [-1,1])for(const z of [cz-.44,cz+.35])window(cx+side*.66,1.1,z,.38,.46,side*Math.PI/2);
 const door=new THREE.Shape();door.moveTo(-.22,0);door.lineTo(.22,0);door.lineTo(.22,.76);door.quadraticCurveTo(.22,.95,0,.955);door.quadraticCurveTo(-.22,.95,-.22,.76);door.closePath();
 add(macro,'ARCHED_DOOR',new THREE.ExtrudeGeometry(door,{depth:.05,bevelEnabled:false,curveSegments:8}),deck,cx-.24,.37,cz+.87);
 for(const x of [-.245,.245])box(macro,'DOOR_JAMB',.065,.75,.09,wood,cx-.24+x,.75,cz+.94);
 tube(macro,'DOOR_ARCH',[V(cx-.485,1.12,cz+.94),V(cx-.41,1.27,cz+.94),V(cx-.24,1.31,cz+.94),V(cx-.07,1.27,cz+.94),V(cx+.005,1.12,cz+.94)],.037,wood,10);
 box(macro,'DOOR_STEP',.61,.08,.24,stone,cx-.24,.4,cz+1.01);
 // Four corner posts carry a gently sagging flexible net. The cottage roof stays clear.
 const netPoint=(u:number,v:number)=>V(-1.68+1.78*u,2.01-.32*Math.sin(Math.PI*u)-.2*Math.sin(Math.PI*v),-1.17+2.0*v);
 for(const x of [-1.68,.1])for(const z of [-1.17,.83]){add(macro,'CANOPY_POST',new THREE.CylinderGeometry(.055,.07,1.75,7),wood,x,1.24,z);box(macro,'POST_FOOT',.19,.14,.19,stone,x,.43,z);}
 for(const t of [0,1]){tube(macro,'NET_EDGE',Array.from({length:9},(_,i)=>netPoint(i/8,t)),.02,rope);tube(macro,'NET_EDGE',Array.from({length:9},(_,i)=>netPoint(t,i/8)),.02,rope);}
 const count=low?9:15;
 for(let i=0;i<=count;i++){const t=i/count;tube(macro,'SAGGING_NET_WEFT',Array.from({length:9},(_,j)=>netPoint(t,j/8)),.006,rope,8);tube(macro,'SAGGING_NET_WARP',Array.from({length:9},(_,j)=>netPoint(j/8,t)),.006,rope,8);}
 for(const x of [-1.73,1.73])for(const z of [-1.42,1.42])add(macro,'DOCK_PILE',new THREE.CylinderGeometry(.075,.075,.35,7),wood,x,.535,z);
 // L2: a working hatchery, with a supported sorting bench and rear drying net.
 const iron=mat(0x384444),ochre=mat(0xce7950),linen=mat(0xe1d6b7);
 box(operations,'SORTING_TABLE',.58,.09,.36,deck,1.38,.86,1.08);
 for(const x of [1.14,1.62])for(const z of [.95,1.21])box(operations,'TABLE_LEG',.07,.46,.07,wood,x,.61,z);
 box(operations,'TABLE_BRACE',.51,.06,.06,wood,1.38,.49,1.08);
 for(const x of [-.18,1.6]){box(operations,'DRYING_POST',.07,1.0,.07,wood,x,.87,-1.45);}
 box(operations,'DRYING_RAIL',1.9,.07,.08,wood,.71,1.35,-1.45);
 for(let i=0;i<12;i++){const x=-.12+i*.15;tube(operations,'DRYING_NET_VERTICAL',[V(x,1.32,-1.45),V(x,1.02,-1.48),V(x,.74+.09*Math.sin(i/11*Math.PI),-1.45)],.005,rope,5);}
 for(let j=0;j<6;j++)tube(operations,'DRYING_NET_HORIZONTAL',[V(-.12,1.3-j*.1,-1.45),V(.7,1.25-j*.08,-1.49),V(1.53,1.3-j*.1,-1.45)],.005,rope,8);
 const basket=(x:number,z:number,r:number)=>{
  add(operations,'BASKET_INTERIOR',new THREE.CylinderGeometry(r*.83,r*.66,.22,10,1,true),dark,x,.49,z);
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;beam(operations,'BASKET_STAVE',V(x+Math.cos(a)*r*.75,.37,z+Math.sin(a)*r*.75),V(x+Math.cos(a)*r,.67,z+Math.sin(a)*r),.027,.027,deck);}
  for(const y of [.4,.48,.56,.65]){const hoop=add(operations,'WOVEN_BASKET_RIM',new THREE.TorusGeometry(r*(.75+(y-.37)*.8),.018,4,12),rope,x,y,z);hoop.rotation.x=Math.PI/2;}
 };
 basket(-1.4,1.3,.18);basket(.34,1.08,.14);
 for(const x of [-1.73,1.73])for(const z of [-1.42,1.42])for(const y of [.48,.54,.6]){const hoop=add(operations,'MOORING_ROPE',new THREE.TorusGeometry(.08,.014,4,10),rope,x,y,z);hoop.rotation.x=Math.PI/2;}
 // L3 finish: staggered slate, stone coursing, ironwork, fish and suspended floats.
 const tiles=[0x3e5663,0x4c6270,0x354c59,0x596d77].map(mat);
 const stones=[0x9b9e8e,0x879588,0xa4aa9b,0x7e8c80].map(mat);
 for(const side of [-1,1])for(let row=0;row<5;row++){
  const x=.075+row*.166;
  for(let col=0;col<9;col++){
   const z=cz-.91+col*.222+(row%2?.018:0);
   const tile=box(restored,'INDIVIDUAL_SLATE',.217,.025,.21,tiles[(row*3+col)%4],cx+side*x,roofY(x)+.026,z);
   tile.rotation.z=-side*Math.atan(.78+.28*x);
  }
 }
 for(let i=0;i<10;i++)box(restored,'RIDGE_CAP',.16,.06,.2,tiles[i%4],cx,roofY(0)+.056,cz-.94+i*.208);
 // Masonry slabs sit outside the solid substrate rather than coplanar with it.
 for(let row=0;row<2;row++)for(let i=0;i<8;i++)for(const side of [-1,1]){
  const x=-1.58+i*.45;box(restored,'QUAY_FRONT_BACK_STONE',.432,.215,.055,stones[(i+row)%4],x,-.13+row*.235,side*1.552);
 }
 for(let row=0;row<2;row++)for(let i=0;i<7;i++)for(const side of [-1,1])box(restored,'QUAY_SIDE_STONE',.055,.215,.418,stones[(i+row+1)%4],side*1.837,-.13+row*.235,-1.3+i*.43);
 for(const z of [-.74,.42]){
  for(const x of [-1.74,.16])for(let i=0;i<4;i++)box(restored,'POOL_COPING',.21,.065,.245,stones[i%4],x,.695,z-.39+i*.26);
  for(const dz of [-.49,.49])for(let i=0;i<7;i++)box(restored,'POOL_COPING',.247,.065,.2,stones[(i+2)%4],-.79-.78+i*.26,.695,z+dz);
 }
 for(let i=0;i<8;i++)box(restored,'FRONT_PAVING',.44,.035,.37,stones[i%4],-1.59+i*.454,.377,1.34);
 for(const z of [cz-.88,cz+.88])for(const dx of [-.52,.52])beam(restored,'GABLE_DIAGONAL',V(cx+dx,eave+.09,z),V(cx+dx*.15,2.32,z),.05,.05,wood);
 for(const dx of [-.16,-.08,0,.08,.16])box(restored,'DOOR_PLANK_JOINT',.007,.67,.009,dark,cx-.24+dx,.75,cz+.927);
 for(const y of [.59,.99])box(restored,'DOOR_HINGE',.2,.03,.025,iron,cx-.34,y,cz+.94);
 add(restored,'DOOR_HANDLE',new THREE.TorusGeometry(.026,.008,4,9),iron,cx-.08,.8,cz+.953);
 const lantern=(x:number,y:number,z:number)=>{box(restored,'LANTERN_BRACKET',.045,.13,.13,iron,x,y+.22,z-.04);box(restored,'LANTERN_GLOW',.1,.15,.09,glass,x,y,z);for(const dy of [-.095,.095])box(restored,'LANTERN_CAP',.15,.04,.14,iron,x,y+dy,z);for(const dx of [-.06,.06])box(restored,'LANTERN_FRAME',.015,.17,.11,iron,x+dx,y,z);};
 lantern(cx-.57,1.21,cz+1.01);
 // Shallow-water fish silhouettes sit at the water surface for mobile readability.
 const fishMat=mat(0x93b6a4);
 const fish=(g:THREE.Group,x:number,y:number,z:number,a:number,scale=1)=>{const f=new THREE.Group();g.add(f);f.position.set(x,y,z);f.rotation.y=a;f.scale.setScalar(scale);const body=add(f,'FISH_BODY',new THREE.SphereGeometry(.075,8,5),fishMat);body.scale.set(1.8,.23,.65);const tail=add(f,'FISH_TAIL',new THREE.ConeGeometry(.048,.09,3),fishMat,-.13,0,0);tail.rotation.z=Math.PI/2;tail.scale.z=.2;};
 for(const z of [-.74,.42])for(let i=0;i<(low?2:3);i++)fish(restored,-1.3+i*.47,.545,z+(i%2?.15:-.12),i*.8-.4,.7);
 fish(restored,1.27,.93,1.08,.4,.65);fish(restored,1.48,.93,1.08,-.2,.6);
 for(const z of [-.7,.42]){const ripple=add(restored,'WATER_RIPPLE',new THREE.TorusGeometry(.16,.004,3,18,Math.PI*1.45),linen,-.9,.55,z);ripple.rotation.x=Math.PI/2;}
 for(const x of [-1.68,.1])for(const z of [-1.17,.83]){
  for(const y of [1.84,1.9]){const tie=add(restored,'NET_LASHING',new THREE.TorusGeometry(.068,.013,4,10),rope,x,y,z);tie.rotation.x=Math.PI/2;}
  tube(restored,'FLOAT_CORD',[V(x,1.93,z),V(x-.05,1.73,z+.1),V(x-.04,1.56,z+.1)],.009,rope,5);
  const buoy=add(restored,'FLOAT_BUOY',new THREE.SphereGeometry(.067,8,6),ochre,x-.04,1.52,z+.1);buoy.scale.y=1.45;
  add(restored,'FLOAT_BAND',new THREE.CylinderGeometry(.068,.068,.06,8),linen,x-.04,1.53,z+.1);
 }
 const lifering=add(restored,'LIFE_RING',new THREE.TorusGeometry(.14,.032,6,16),linen,cx+.68,1.22,cz-.045);lifering.rotation.y=Math.PI/2;
 for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const band=box(restored,'LIFE_RING_BAND',.068,.063,.03,ochre,cx+.714,1.22+Math.sin(a)*.14,cz-.045+Math.cos(a)*.14);band.rotation.x=-a;}

}
