import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island22FishermansVillageMaterials } from './Island22FishermansVillageThreeWorld';
type Groups={macro:THREE.Group;finish:THREE.Group};
type Options={quality:Island3DQuality;materials:Island22FishermansVillageMaterials};
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
/** Narrow-plot net mender cottage. Canonical placement remains owned by its world factory. */
export function populateIsland22NetMenderCottageV2({macro,finish}:Groups,{quality}:Options){
 const low=quality==='low',mat=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.88});
 const wood=mat(0x795c3d),dark=mat(0x463b2c),plaster=mat(0xe2d4b6),stone=mat(0x989d90),slate=mat(0x496371);
 slate.shadowSide=THREE.DoubleSide;
 const grainBytes=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const k=(y*64+x)*4,v=231+Math.sin(x*.91+Math.sin(y*.08)*.65)*9+Math.sin(x*2.1+y*.02)*4;grainBytes[k]=grainBytes[k+1]=grainBytes[k+2]=v;grainBytes[k+3]=255;}const grain=new THREE.DataTexture(grainBytes,64,64,THREE.RGBAFormat);grain.colorSpace=THREE.SRGBColorSpace;grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.needsUpdate=true;wood.map=grain;dark.map=grain;
 const glass=new THREE.MeshStandardMaterial({color:0xe5be72,emissive:0xf0bb60,emissiveIntensity:.25,roughness:.5});
 const add=(n:string,geo:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0,g=macro)=>{const o=new THREE.Mesh(geo,m);o.name='ISLAND_006_NET_MENDER_'+n;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
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
 // Staggered low-contrast tiles sit above the frozen closed roof skin.
 const slates=[mat(0x536a76),mat(0x566d78),mat(0x506672)],stones=[mat(0xa2a697),mat(0xabae9d)],iron=mat(0x414a45),rope=mat(0x928469),rust=mat(0xa56540),teal=mat(0x568584),leaf=mat(0x526b44);
 for(const m of slates)m.shadowSide=THREE.DoubleSide;
 const pick=(r:number,c:number,s:number)=>{const n=Math.sin(r*73.17+c*19.73+s*31.29)*43758.5453;return Math.floor((n-Math.floor(n))*3);};
 const quad=(n:string,p:THREE.Vector3[],m:THREE.Material)=>{const points=[p[0],p[1],p[2],p[1],p[3],p[2]];for(let i=0;i<6;i+=3)if(points[i+1].clone().sub(points[i]).cross(points[i+2].clone().sub(points[i])).y<0)[points[i+1],points[i+2]]=[points[i+2],points[i+1]];const g=new THREE.BufferGeometry().setFromPoints(points);g.computeVertexNormals();add(n,g,m,0,0,0,finish);};
 for(const side of [-1,1])for(let row=0;row<(low?6:8);row++)for(let col=0;col<=(low?8:10);col++){
  const nr=low?6:8,nc=low?8:10,shift=row%2*.5,x0=(row+.015)/nr*.833,x1=(row+.985)/nr*.833,z0=Math.max(-.728,-.728+(col-shift+.025)/nc*1.456),z1=Math.min(.728,-.728+(col+1-shift-.025)/nc*1.456);if(z1<=z0)continue;const m=slates[pick(row,col,side)];
  quad('SLATE_COURSE',[V(side*x0,roofY(x0)+.003,z0),V(side*x1,roofY(x1)+.017,z0),V(side*x0,roofY(x0)+.003,z1),V(side*x1,roofY(x1)+.017,z1)],m);
  box('SLATE_LOWER_LIP',.007,.014,z1-z0,m,side*x1,roofY(x1)+.010,(z0+z1)/2,finish);
 }
 for(let row=0;row<3;row++)for(let col=0;col<=6;col++){const shift=row%2*.5,z0=.605+(row+.02)/3*.31,z1=.605+(row+.98)/3*.31,x0=Math.max(-.223,-.223+(col-shift+.025)/6*.766),x1=Math.min(.543,-.223+(col+1-shift-.025)/6*.766);if(x1<=x0)continue;const m=slates[pick(row,col,7)];quad('PORCH_SLATE_COURSE',[V(x0,porchY(z0)+.003,z0),V(x1,porchY(z0)+.003,z0),V(x0,porchY(z1)+.014,z1),V(x1,porchY(z1)+.014,z1)],m);box('PORCH_TILE_LIP',x1-x0,.011,.006,m,(x0+x1)/2,porchY(z1)+.008,z1,finish);}
 for(let i=0;i<10;i++){const cap=add('SLATE_RIDGE_CAP',new THREE.CylinderGeometry(.046,.046,.147,8),slates[1],0,2.13,-.75+(i+.5)*.15,finish);cap.rotation.x=Math.PI/2;}
 for(let row=0;row<2;row++)for(const z of [-.737,.897])for(let col=0;col<8;col++){const x=-.93+(col+.5)*1.86/8;if(z>0&&Math.abs(x-.16)<.30)continue;box('TERRACE_STONE_COURSE',.218,.128,.025,stones[(row+col)%2],x,-.249+(row+.5)*.139,z,finish);}
 for(const x of [-.933,.933])for(let row=0;row<2;row++)for(let col=0;col<7;col++)box('TERRACE_SIDE_COURSE',.014,.128,.216,stones[(row+col)%2],x,-.249+(row+.5)*.139,-.725+(col+.5)*1.61/7,finish);
 for(let row=0;row<2;row++)for(const z of [-.643,.643])for(let col=0;col<6;col++){const x=-.726+(col+.5)*1.452/6;if(z>0&&Math.abs(x-.16)<.27||z<0&&Math.abs(x+.18)<.23)continue;box('PLINTH_STONE',.23,.105,.025,stones[(row+col)%2],x,.085+(row+.5)*.114,z,finish);}
 for(const x of [-.741,.741])for(let row=0;row<2;row++)for(let col=0;col<5;col++)box('SIDE_PLINTH_STONE',.02,.105,.235,stones[(row+col)%2],x,.085+(row+.5)*.114,-.625+(col+.5)*.25,finish);
 for(let row=0;row<4;row++){for(const z of [-.505,-.255])box('CHIMNEY_FRONT_COURSE',.201,.146,.02,stones[row%2],.49,1.64+row*.155,z,finish);for(const x of [.381,.599])box('CHIMNEY_SIDE_COURSE',.018,.146,.228,stones[(row+1)%2],x,1.64+row*.155,-.38,finish);}
 // Shutters are on the right wall, keeping the left window and net separate.
 for(const z of [-.30,.22]){box('RIGHT_WINDOW_SHUTTER',.027,.45,.12,wood,.786,.70,z,finish);for(const y of [.57,.83])box('SHUTTER_STRAP',.016,.023,.13,dark,.805,y,z,finish);}
 for(const d of [{x:.16,z:.676,w:.43,h:.94,arch:true,sign:1},{x:-.18,z:-.666,w:.37,h:.86,arch:false,sign:-1}]){
  for(let i=0;i<6;i++){const x=-d.w/2+(i+.5)*d.w/6,h=d.arch?d.h-d.w/2+Math.sqrt(Math.max(0,(d.w/2)**2-x*x)):d.h;box('DOOR_BOARD',d.w/6-.007,h-.029,.012,wood,d.x+x,.101+(h-.029)/2,d.z,finish);}
  for(const y of [.32,.79])box('DOOR_HINGE',d.w*.48,.023,.015,iron,d.x-d.w*.23,y,d.z+d.sign*.013,finish);add('DOOR_RING',new THREE.TorusGeometry(.025,.007,4,10),iron,d.x+d.w*.27,.54,d.z+d.sign*.026,finish);
 }
 // Shallow net rack stays inside x=-.83 and forward of the existing left window.
 const nx=-.772;for(const z of [.075,.53])box('NET_FRAME_POST',.047,.70,.047,wood,nx,.48,z,finish);for(const y of [.18,.80])box('NET_FRAME_CROSSBAR',.045,.043,.49,wood,nx,y,.3025,finish);
 const netSegments=low?5:7;for(let i=0;i<=netSegments;i++){
  const z=.09+i/netSegments*.425;beam('NET_VERTICAL',V(-.790,.205,z),V(-.795,.785,z),.008,.008,rope,finish);
  const y=.21+i/netSegments*.56;beam('NET_HORIZONTAL',V(-.794,y,.09),V(-.794,y-.018,.515),.008,.008,rope,finish);
 }
 for(const [y,z,m]of [[.57,.19,rust],[.39,.40,teal]] as const){const f=add('FISHING_FLOAT',new THREE.SphereGeometry(.039,8,5),m,-.788,y,z,finish);f.scale.x=.80;const lash=add('FLOAT_ROPE',new THREE.TorusGeometry(.040,.007,4,10),rope,-.79,y,z,finish);lash.rotation.y=Math.PI/2;}
 // Discreet plaque and lantern stay on solid wall piers, outside the entry opening.
 box('FISH_PLAQUE_BACK',.18,.085,.025,wood,.54,.77,.665,finish);const f=add('FISH_PLAQUE_BODY',new THREE.SphereGeometry(1,8,5),stones[1],.52,.77,.686,finish);f.scale.set(.050,.022,.012);const ts=new THREE.Shape();ts.moveTo(.56,.77);ts.lineTo(.615,.802);ts.lineTo(.615,.738);ts.closePath();add('FISH_PLAQUE_TAIL',new THREE.ExtrudeGeometry(ts,{depth:.01,bevelEnabled:false}),stones[1],0,0,.682,finish);
 const lx=-.15;box('LANTERN_WALL_PLATE',.047,.10,.022,iron,lx,1.03,.675,finish);beam('LANTERN_ARM',V(lx,1.07,.679),V(lx,1.07,.752),.017,.018,iron,finish);box('LANTERN_GLAZING',.060,.094,.055,glass,lx,.998,.756,finish);for(const dx of [-.036,.036])for(const dz of [-.033,.033])box('LANTERN_FRAME',.01,.118,.01,iron,lx+dx,.998,.756+dz,finish);box('LANTERN_CAP',.095,.024,.09,iron,lx,1.069,.756,finish);box('LANTERN_BASE',.085,.018,.081,iron,lx,.930,.756,finish);
 add('WINDOW_PLANT_POT',new THREE.CylinderGeometry(.034,.026,.051,8),rust,-.43,.514,.712,finish);for(let i=0;i<5;i++){const a=i/5*Math.PI*2,o=add('WINDOW_PLANT_LEAF',new THREE.SphereGeometry(.026,6,4),leaf,-.43+Math.sin(a)*.019,.556,.712+Math.cos(a)*.016,finish);o.scale.set(.48,1,.55);}

}
