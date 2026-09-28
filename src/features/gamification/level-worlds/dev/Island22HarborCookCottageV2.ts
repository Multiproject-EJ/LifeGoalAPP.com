import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island22FishermansVillageMaterials } from './Island22FishermansVillageThreeWorld';
type Groups={macro:THREE.Group;finish:THREE.Group};
type Options={quality:Island3DQuality;materials:Island22FishermansVillageMaterials};
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
/** Single-storey harbor cook cottage. Canonical placement remains owned by its world factory. */
export function populateIsland22HarborCookCottageV2({macro,finish}:Groups,{quality}:Options){
 const low=quality==='low',mat=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.88});
 const wood=mat(0x795c3d),dark=mat(0x463b2c),plaster=mat(0xe2d4b6),stone=mat(0x989d90),slate=mat(0x536c7b);
 slate.shadowSide=THREE.DoubleSide;
 const data=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const k=(y*64+x)*4,v=230+Math.sin(x*.9+Math.sin(y*.08)*.65)*9+Math.sin(x*2.2+y*.02)*4;data[k]=data[k+1]=data[k+2]=v;data[k+3]=255;}const grain=new THREE.DataTexture(data,64,64,THREE.RGBAFormat);grain.colorSpace=THREE.SRGBColorSpace;grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.needsUpdate=true;wood.map=grain;dark.map=grain;
 const glass=new THREE.MeshStandardMaterial({color:0xe5be72,emissive:0xf0bb60,emissiveIntensity:.25,roughness:.5});
 const add=(n:string,geo:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0,g=macro)=>{const o=new THREE.Mesh(geo,m);o.name='ISLAND_006_HARBOR_COOK_'+n;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
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
 // Timbered loft gable preserves the target's unglazed front triangle.
 for(const x of [-.29,.29])beam('FRONT_GABLE_STUD',V(x,1.43,.643),V(x,roofY(Math.abs(x))-.06,.643),.055,.06);
 for(const z of [-.735,.735])box('RIDGE_END_FINIAL',.09,.16,.09,wood,0,2.325,z); const tiles=[mat(0x586f7d),mat(0x5c7380),mat(0x556c79)],stones=[mat(0xa3a798),mat(0xacaf9f)],blue=mat(0x5e7e89),iron=mat(0x444c44),canvas=mat(0xd3c7a9),rope=mat(0x9c8964);
 for(const m of tiles)m.shadowSide=THREE.DoubleSide;
 const pick=(r:number,c:number,side:number)=>{const h=Math.sin(r*73.17+c*19.73+side*31.29)*43758.5453;return Math.floor((h-Math.floor(h))*3);};
 const quad=(p:THREE.Vector3[],m:THREE.Material)=>{const v=[p[0],p[1],p[2],p[1],p[3],p[2]];for(let i=0;i<6;i+=3)if(v[i+1].clone().sub(v[i]).cross(v[i+2].clone().sub(v[i])).y<0)[v[i+1],v[i+2]]=[v[i+2],v[i+1]];const geo=new THREE.BufferGeometry().setFromPoints(v);geo.computeVertexNormals();add('CLAY_COURSE',geo,m,0,0,0,finish);};
 for(const side of [-1,1])for(let row=0;row<(low?6:8);row++)for(let col=0;col<=(low?8:10);col++){
  const nr=low?6:8,nc=low?8:10,shift=row%2*.5,x0=(row+.015)/nr*.832,x1=(row+.985)/nr*.832,z0=Math.max(-.728,-.728+(col-shift+.025)/nc*1.456),z1=Math.min(.728,-.728+(col+1-shift-.025)/nc*1.456);if(z1<=z0)continue;const m=tiles[pick(row,col,side)];quad([V(side*x0,roofY(x0)+.003,z0),V(side*x1,roofY(x1)+.019,z0),V(side*x0,roofY(x0)+.003,z1),V(side*x1,roofY(x1)+.019,z1)],m);box('CLAY_LOWER_LIP',.007,.016,z1-z0,m,side*x1,roofY(x1)+.011,(z0+z1)/2,finish);
 }
 for(let i=0;i<10;i++){const cap=add('CLAY_RIDGE_CAP',new THREE.CylinderGeometry(.049,.049,.147,8),tiles[1],0,2.28,-.75+(i+.5)*.15,finish);cap.rotation.x=Math.PI/2;}
 for(let row=0;row<2;row++)for(const z of [-.739,.899])for(let col=0;col<8;col++){const x=-.93+(col+.5)*1.86/8;if(z>0&&Math.abs(x-.16)<.31)continue;box('TERRACE_STONE',.218,.128,.026,stones[(row+col)%2],x,-.249+(row+.5)*.139,z,finish);}
 for(const x of [-.945,.945])for(let row=0;row<2;row++)for(let col=0;col<7;col++)box('TERRACE_SIDE_STONE',.026,.128,.216,stones[(row+col)%2],x,-.249+(row+.5)*.139,-.725+(col+.5)*1.61/7,finish);
 for(let row=0;row<2;row++)for(const z of [-.647,.647])for(let col=0;col<6;col++){const x=-.726+(col+.5)*1.452/6;if(z>0&&Math.abs(x-.22)<.28||z<0&&Math.abs(x+.18)<.24)continue;box('PLINTH_STONE',.23,.105,.026,stones[(row+col)%2],x,.085+(row+.5)*.114,z,finish);}
 for(const x of [-.745,.745])for(let row=0;row<2;row++)for(let col=0;col<5;col++)box('SIDE_PLINTH_STONE',.026,.105,.235,stones[(row+col)%2],x,.085+(row+.5)*.114,-.625+(col+.5)*.25,finish);
 const shutters=(x:number,y:number,z:number,yaw:number,w:number,h:number)=>{const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=yaw;finish.add(g);for(const side of [-1,1]){box('BLUE_SHUTTER',.085,h+.03,.027,blue,side*(w/2+.065),h/2,.025,g);for(const yy of [h*.2,h*.8])box('SHUTTER_STRAP',.089,.022,.015,iron,side*(w/2+.065),yy,.047,g);}};
 shutters(-.43,.49,.681,0,.27,.41);shutters(.783,.49,-.04,Math.PI/2,.34,.42);shutters(.42,.50,-.681,Math.PI,.24,.36);
 for(const d of [{x:.22,z:.676,w:.43,h:1.02,arch:true,sign:1},{x:-.18,z:-.676,w:.37,h:.86,arch:false,sign:-1}]){
  for(let i=0;i<6;i++){const x=-d.w/2+(i+.5)*d.w/6,h=d.arch?d.h-d.w/2+Math.sqrt(Math.max(0,(d.w/2)**2-x*x)):d.h;box('DOOR_PLANK',d.w/6-.007,h-.03,.013,wood,d.x+x,.100+(h-.03)/2,d.z,finish);}for(const y of [.32,.83])box('DOOR_STRAP',d.w*.48,.025,.017,iron,d.x-d.w*.23,y,d.z+d.sign*.013,finish);add('DOOR_RING',new THREE.TorusGeometry(.025,.007,4,10),iron,d.x+d.w*.25,.54,d.z+d.sign*.027,finish);
 }
 const lx=.56;box('LANTERN_PLATE',.05,.10,.025,iron,lx,1.02,.665,finish);beam('LANTERN_ARM',V(lx,1.07,.67),V(lx,1.07,.75),.018,.018,iron,finish);box('LANTERN_LIGHT',.064,.10,.06,glass,lx,.997,.755,finish);for(const dx of [-.039,.039])for(const dz of [-.035,.035])box('LANTERN_FRAME',.011,.127,.011,iron,lx+dx,.997,.755+dz,finish);box('LANTERN_CAP',.10,.025,.096,iron,lx,1.075,.755,finish);box('LANTERN_BASE',.09,.018,.085,iron,lx,.927,.755,finish);

 // Wall-hung cookware and herbs identify the cook without occupying the threshold.
 const copper=new THREE.MeshStandardMaterial({color:0xa77549,roughness:.57,metalness:.32}),leaf=mat(0x62774b);
 const px=-.12,pz=.728;beam('PAN_WALL_HOOK',V(px,.99,.652),V(px,.99,pz),.015,.016,iron,finish);beam('PAN_HANDLE',V(px,.98,pz),V(px,.847,pz),.021,.021,iron,finish);
 const pan=add('COPPER_PAN',new THREE.SphereGeometry(1,12,7),copper,px,.79,pz,finish);pan.scale.set(.062,.071,.022);
 const rim=add('PAN_RIM',new THREE.TorusGeometry(.061,.007,4,14),copper,px,.79,pz+.019,finish);rim.scale.y=1.13;
 beam('HERB_BUNDLE_TIE',V(-.087,.85,.708),V(-.087,.58,.724),.009,.01,rope,finish);
 for(let i=0;i<8;i++){const x=-.088+(i%3-1)*.019,y=.73-Math.floor(i/3)*.057,z=.728+(i%2)*.01,o=add('HANGING_HERB_LEAF',new THREE.SphereGeometry(1,6,4),leaf,x,y,z,finish);o.scale.set(.012,.032,.009);o.rotation.z=(i%2?1:-1)*.45;}

}
