import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island22FishermansVillageMaterials } from './Island22FishermansVillageThreeWorld';
type Groups={macro:THREE.Group;finish:THREE.Group};
type Options={quality:Island3DQuality;materials:Island22FishermansVillageMaterials};
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
/** Smokehouse cottage geometry only; root owns canonical placement and decorative cluster identity. */
export function populateIsland22SmokehouseCottageV2({macro,finish}:Groups,{quality}:Options){
 const low=quality==='low',mat=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.89});
 const wood=mat(0x795d3f),dark=mat(0x473b2c),plaster=mat(0xe2d2b3),stone=mat(0x989d8e),slate=mat(0x4d6674),clay=mat(0xa47751);
 slate.shadowSide=THREE.DoubleSide;clay.shadowSide=THREE.DoubleSide;
 const data=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const k=(y*64+x)*4,v=230+Math.sin(x*.9+Math.sin(y*.08)*.65)*9+Math.sin(x*2.2+y*.02)*4;data[k]=data[k+1]=data[k+2]=v;data[k+3]=255;}const grain=new THREE.DataTexture(data,64,64,THREE.RGBAFormat);grain.colorSpace=THREE.SRGBColorSpace;grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.needsUpdate=true;wood.map=grain;dark.map=grain;
 const glass=new THREE.MeshStandardMaterial({color:0xaebaa1,emissive:0xe2b367,emissiveIntensity:.14,roughness:.5});
 const add=(n:string,geo:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0,g=macro)=>{const o=new THREE.Mesh(geo,m);o.name='ISLAND_006_SMOKEHOUSE_'+n;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
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
 box('MAIN_ENTRY_STEP',.61,.12,.26,stone,.32,-.002,.87);box('WORKROOM_THRESHOLD',.47,.05,.16,stone,-1.25,.075,.65);
 box('GROUND_STOREY',1.55,.96,1.22,plaster,0,.56,0);box('STONE_PLINTH',1.60,.24,1.27,stone,0,.20,0);box('UPPER_JETTY_BEAM',1.67,.13,1.34,wood,0,1.04,0);
 const roofY=(x:number)=>2.9-1.37*x+.39*x*x;
 const profile=new THREE.Shape();profile.moveTo(-.825,1.105);profile.lineTo(.825,1.105);for(let i=0;i<=16;i++){const x=.825-i/16*1.65;profile.lineTo(x,roofY(Math.abs(x))-.023);}profile.closePath();const shell=new THREE.ExtrudeGeometry(profile,{depth:1.32,bevelEnabled:false});shell.translate(0,0,-.66);add('CLOSED_UPPER_GABLE',shell,plaster);
 for(const x of [-.78,.78])for(const z of [-.625,.625])box('GROUND_CORNER_POST',.08,.88,.08,wood,x,.62,z);
 for(const x of [-.83,.83])for(const z of [-.673,.673])box('UPPER_CORNER_POST',.078,.87,.08,wood,x,1.56,z);
 for(const z of [-.685,.685]){box('GABLE_TIE',1.38,.075,.075,wood,0,2.04,z);if(z>0)box('CENTER_UPPER_POST',.065,.87,.07,wood,0,1.56,z);}
 for(const z of [-.68,.68])for(const x of (z>0?[-.70,-.23,.70]:[-.70,.24,.70]))beam('JETTY_CORBEL',V(x,.87,z*.91),V(x,1.035,z),.075,.075);
 for(const side of [-1,1]){const p:THREE.Vector3[]=[];for(let row=0;row<12;row++){const x0=row/12*.91,x1=(row+1)/12*.91,a=V(side*x0,roofY(x0),-.765),b=V(side*x1,roofY(x1),-.765),c=V(side*x0,roofY(x0),.765),d=V(side*x1,roofY(x1),.765);p.push(a,b,c,b,d,c);}upward('CLOSED_SWEPT_MAIN_ROOF',p,slate);
  for(const z of [-.773,.773]){const curve=new THREE.CatmullRomCurve3(Array.from({length:13},(_,i)=>{const x=i/12*.91;return V(side*x,roofY(x)+.012,z);}));add('SWEPT_BARGEBOARD',new THREE.TubeGeometry(curve,12,.031,5,false),wood);}
  box('EAVE_FASCIA',.065,.065,1.58,wood,side*.91,roofY(.91)-.012,0);
 }
 box('RIDGE',.08,.075,1.60,wood,0,2.91,0);
 const arch=(w:number,h:number)=>{const r=w/2,s=new THREE.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,h-r);s.absarc(0,h-r,r,0,Math.PI,false);s.closePath();return s;};
 const opening=(x:number,y:number,z:number,yaw:number,w:number,h:number,door=false,arched=false)=>{const g=new THREE.Group();macro.add(g);g.position.set(x,y,z);g.rotation.y=yaw;if(arched){add('ARCH_REVEAL',new THREE.ExtrudeGeometry(arch(w+.105,h+.06),{depth:.04,bevelEnabled:false,curveSegments:low?8:12}),stone,0,0,0,g);add('ARCH_DOOR',new THREE.ShapeGeometry(arch(w,h),10),wood,0,.01,.046,g);}else{box('OPENING_REVEAL',w+.09,h+.075,.04,dark,0,h/2,0,g);box(door?'SERVICE_DOOR':'GLAZING',w,h,.028,door?wood:glass,0,h/2,.033,g);for(const dx of [-w/2,w/2])box('JAMB',.028,h+.075,.04,wood,dx,h/2,.053,g);box('HEADER',w+.10,.045,.04,wood,0,h+.016,.053,g);}box('SILL',w+.12,.055,.105,stone,0,-.005,.05,g);if(!door){box('MULLION',.022,h,.028,wood,0,h/2,.056,g);box('TRANSOM',w,.022,.028,wood,0,h*.48,.056,g);}};
 opening(.32,.09,.62,0,.41,.82,true,true);opening(-.40,.40,.62,0,.31,.39);
 for(const x of [-.36,.36])opening(x,1.30,.675,0,.31,.52);
 opening(-.24,.09,-.62,Math.PI,.39,.82,true);opening(.43,.43,-.62,Math.PI,.26,.35);opening(0,1.38,-.675,Math.PI,.34,.43);
 opening(.794,.43,-.08,Math.PI/2,.30,.38);opening(.842,1.36,0,Math.PI/2,.33,.45);opening(-.842,1.69,0,-Math.PI/2,.27,.24);
 add('ROUND_GABLE_FRAME',new THREE.TorusGeometry(.123,.025,6,low?16:24),stone,0,2.40,.689);add('ROUND_GABLE_GLAZING',new THREE.CircleGeometry(.111,20),glass,0,2.40,.697);box('GABLE_MULLION',.018,.22,.025,wood,0,2.40,.713);box('GABLE_TRANSOM',.22,.018,.025,wood,0,2.40,.713);
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
 // Both stacks extend beneath the lowest intersected roof point, with fixed visible caps.
 box('MAIN_CHIMNEY',.22,.95,.25,stone,.47,2.58,-.38);box('MAIN_CHIMNEY_CAP',.285,.075,.315,stone,.47,3.095,-.38);
 box('SMOKEHOUSE_FLUE',.18,.705,.20,stone,-1.39,1.6225,-.04);box('FLUE_CAP',.245,.065,.265,stone,-1.39,2.00,-.04);
 const slates=[mat(0x546c79),mat(0x586f7b),mat(0x506775)],clays=[mat(0xab7954),mat(0xaf7c57),mat(0xa57652)],stones=[mat(0xa3a697),mat(0xadad9b)],iron=mat(0x434b43),blue=mat(0x607f80),fishSkin=mat(0x9c714d);
 for(const m of [...slates,...clays])m.shadowSide=THREE.DoubleSide;
 const pick=(r:number,c:number,side:number)=>{const h=Math.sin(r*73.17+c*19.73+side*31.29)*43758.5453;return Math.floor((h-Math.floor(h))*3);};
 const quad=(n:string,p:THREE.Vector3[],m:THREE.Material)=>{const v=[p[0],p[1],p[2],p[1],p[3],p[2]];for(let i=0;i<6;i+=3)if(v[i+1].clone().sub(v[i]).cross(v[i+2].clone().sub(v[i])).y<0)[v[i+1],v[i+2]]=[v[i+2],v[i+1]];const geo=new THREE.BufferGeometry().setFromPoints(v);geo.computeVertexNormals();add(n,geo,m,0,0,0,finish);};
 for(const side of [-1,1])for(let row=0;row<(low?7:9);row++)for(let col=0;col<=(low?9:12);col++){
  const nr=low?7:9,nc=low?9:12,shift=row%2*.5,x0=(row+.015)/nr*.905,x1=(row+.985)/nr*.905,z0=Math.max(-.758,-.758+(col-shift+.025)/nc*1.516),z1=Math.min(.758,-.758+(col+1-shift-.025)/nc*1.516);if(z1<=z0)continue;const m=slates[pick(row,col,side)];quad('SLATE_COURSE',[V(side*x0,roofY(x0)+.003,z0),V(side*x1,roofY(x1)+.018,z0),V(side*x0,roofY(x0)+.003,z1),V(side*x1,roofY(x1)+.018,z1)],m);box('SLATE_LOWER_LIP',.007,.015,z1-z0,m,side*x1,roofY(x1)+.0105,(z0+z1)/2,finish);
 }
 for(let i=0;i<11;i++){const cap=add('SLATE_RIDGE_CAP',new THREE.CylinderGeometry(.045,.045,.14,8),slates[1],0,2.928,-.78+(i+.5)*1.56/11,finish);cap.rotation.x=Math.PI/2;}
 // Annex tile ends remain outside the frozen wall-clipping plane, including their lips.
 for(let row=0;row<5;row++)for(let col=0;col<=(low?6:8);col++){
  const nc=low?6:8,shift=row%2*.5,x0=-.830-(row+.015)/5*.85,x1=-.830-(row+.985)/5*.85,z0=Math.max(-.334,-.334+(col-shift+.025)/nc*1.028),z1=Math.min(.694,-.334+(col+1-shift-.025)/nc*1.028);if(z1<=z0)continue;const m=clays[pick(row,col,9)];quad('CLAY_WORKROOM_COURSE',[V(x0,annexY(x0)+.003,z0),V(x1,annexY(x1)+.017,z0),V(x0,annexY(x0)+.003,z1),V(x1,annexY(x1)+.017,z1)],m);box('CLAY_LOWER_LIP',.007,.014,z1-z0,m,x1,annexY(x1)+.010,(z0+z1)/2,finish);
 }
 for(let row=0;row<2;row++)for(const z of [-.809,.909])for(let col=0;col<12;col++){const x=-1.71+(col+.5)*2.65/12;if(z>0&&Math.abs(x-.32)<.33)continue;box('TERRACE_MASONRY',.211,.133,.026,stones[(row+col)%2],x,-.252+(row+.5)*.146,z,finish);}
 for(const x of [-1.729,.959])for(let row=0;row<2;row++)for(let col=0;col<8;col++)box('TERRACE_SIDE_MASONRY',.026,.133,.199,stones[(row+col)%2],x,-.252+(row+.5)*.146,-.79+(col+.5)*1.68/8,finish);
 for(let row=0;row<2;row++)for(const z of [-.647,.647])for(let col=0;col<7;col++){const x=-.79+(col+.5)*1.58/7;if(z>0&&Math.abs(x-.32)<.28||z<0&&Math.abs(x+.24)<.26)continue;box('MAIN_PLINTH_COURSE',.214,.105,.026,stones[(row+col)%2],x,.086+(row+.5)*.114,z,finish);}
 for(const x of [.813,-1.632])for(let row=0;row<2;row++)for(let col=0;col<6;col++){const annex=x<0,start=annex?-.264:-.625,span=annex?.888:1.25;box('SIDE_PLINTH_COURSE',.026,.105,span/6-.012,stones[(row+col)%2],x,.086+(row+.5)*.114,start+(col+.5)*span/6,finish);}
 for(const z of [-.284,.644])for(let row=0;row<2;row++)for(let col=0;col<5;col++){const x=-1.612+(col+.5)*.984/5;if(z>0&&Math.abs(x+1.265)<.25)continue;box('WORKROOM_PLINTH_COURSE',.184,.105,.026,stones[(row+col)%2],x,.086+(row+.5)*.114,z,finish);}
 for(let row=0;row<5;row++){for(const x of [.350,.590])box('CHIMNEY_SIDE_COURSE',.025,.148,.245,stones[row%2],x,2.24+row*.157,-.38,finish);for(const z of [-.515,-.245])box('CHIMNEY_FRONT_COURSE',.215,.148,.025,stones[(row+1)%2],.47,2.24+row*.157,z,finish);}
 add('CHIMNEY_POT',new THREE.CylinderGeometry(.063,.078,.11,10),clays[1],.47,3.183,-.38,finish);
 // Four short supports carry the flue hood over visibly dark ventilation slots.
 box('FLUE_VENT_DARK',.184,.055,.204,dark,-1.39,1.948,-.04,finish);for(const x of [-1.476,-1.304])for(const z of [-.136,.056])box('FLUE_HOOD_SUPPORT',.025,.066,.027,stone,x,1.95,z,finish);
 for(const cx of [-.36,.36])for(const side of [-1,1]){box('BLUE_WINDOW_SHUTTER',.105,.55,.027,blue,cx+side*.235,1.56,.732,finish);for(const y of [1.38,1.75])box('SHUTTER_IRON_STRAP',.11,.025,.018,iron,cx+side*.235,y,.753,finish);}
 for(const d of [{x:.32,z:.677,w:.41,h:.82,arch:true,sign:1},{x:-1.265,z:.676,w:.36,h:.82,arch:false,sign:1},{x:-.24,z:-.676,w:.39,h:.82,arch:false,sign:-1}]){
  for(let i=0;i<6;i++){const x=-d.w/2+(i+.5)*d.w/6,h=d.arch?d.h-d.w/2+Math.sqrt(Math.max(0,(d.w/2)**2-x*x)):d.h;box('DOOR_PLANK',d.w/6-.007,h-.03,.013,wood,d.x+x,.105+(h-.03)/2,d.z,finish);}
  for(const y of [.32,.72])box('DOOR_STRAP',d.w*.48,.026,.017,iron,d.x-d.w*.23,y,d.z+d.sign*.012,finish);add('DOOR_RING',new THREE.TorusGeometry(.026,.007,4,10),iron,d.x+d.w*.25,.49,d.z+d.sign*.027,finish);
 }
 // A wall-fixed curing rail occupies the solid pier between workroom and main house doors.
 for(const x of [-.97,-.74])beam('CURING_RAIL_BRACKET',V(x,.93,.629),V(x,.93,.748),.023,.025,iron,finish);
 box('CURING_RAIL',.31,.027,.032,wood,-.855,.93,.75,finish);
 for(let i=0;i<3;i++){
  const x=-.958+i*.102,z=.754;beam('FISH_HANGER',V(x,.93,z),V(x,.825,z),.008,.008,iron,finish);
  const body=add('SMOKED_FISH_BODY',new THREE.SphereGeometry(1,8,6),fishSkin,x,.716,z,finish);body.scale.set(.031,.104,.023);
  const tail=new THREE.Shape();tail.moveTo(x,.624);tail.lineTo(x-.038,.572);tail.lineTo(x,.588);tail.lineTo(x+.038,.572);tail.closePath();add('FORKED_SMOKED_FISH_TAIL',new THREE.ExtrudeGeometry(tail,{depth:.013,bevelEnabled:false}),fishSkin,0,0,z-.006,finish);
  const fin=new THREE.Shape();fin.moveTo(x+.024,.74);fin.lineTo(x+.049,.68);fin.lineTo(x+.02,.674);fin.closePath();add('SMOKED_FISH_FIN',new THREE.ExtrudeGeometry(fin,{depth:.008,bevelEnabled:false}),fishSkin,0,0,z-.004,finish);
  add('SMOKED_FISH_EYE',new THREE.SphereGeometry(.005,5,3),iron,x+.012,.790,z+.021,finish);
 }
 const lx=.64;box('LANTERN_PLATE',.05,.105,.025,iron,lx,.81,.666,finish);beam('LANTERN_ARM',V(lx,.855,.67),V(lx,.855,.765),.018,.018,iron,finish);box('LANTERN_LIGHT',.064,.104,.06,glass,lx,.781,.77,finish);for(const dx of [-.039,.039])for(const dz of [-.036,.036])box('LANTERN_FRAME',.011,.13,.011,iron,lx+dx,.781,.77+dz,finish);box('LANTERN_CAP',.102,.025,.098,iron,lx,.86,.77,finish);box('LANTERN_BASE',.091,.018,.088,iron,lx,.710,.77,finish);

}
