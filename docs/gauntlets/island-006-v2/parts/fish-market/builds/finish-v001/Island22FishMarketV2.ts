import * as THREE from 'three';
import type { Island22PremiumLandmarkFactoryOptions } from './Island22PremiumLandmarkFamilies';
type Groups={macro:THREE.Group;operations:THREE.Group;restored:THREE.Group};
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
/** Market geometry only. Root factory owns canonical placement and construction visibility. */
export function populateIsland22FishMarketV2({macro,operations,restored}:Groups,{quality}:Island22PremiumLandmarkFactoryOptions){
 const low=quality==='low',mat=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.88});
 const wood=mat(0x816342),dark=mat(0x483d2e),plaster=mat(0xe1d3b4),stone=mat(0x92988a),slate=mat(0x496170),teal=mat(0x70938d),canvas=mat(0xdbd4b9),iron=mat(0x414b47),rope=mat(0xa58b5d);
 for(const m of [slate,teal,canvas]){m.side=THREE.DoubleSide;m.shadowSide=THREE.DoubleSide;}
 const pixels=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const k=(y*64+x)*4,v=227+Math.sin(x*.9+Math.sin(y*.08)*.8)*11+Math.sin(x*2.3+y*.018)*5;pixels[k]=pixels[k+1]=pixels[k+2]=v;pixels[k+3]=255;}const grain=new THREE.DataTexture(pixels,64,64,THREE.RGBAFormat);grain.colorSpace=THREE.SRGBColorSpace;grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.needsUpdate=true;wood.map=grain;dark.map=grain;
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
 // Thin finish follows the approved backing roof and pier; gaps reveal sound substrate.
 const slates=[mat(0x526b79),mat(0x435c6c),mat(0x607783)];for(const m of slates){m.side=THREE.DoubleSide;m.shadowSide=THREE.DoubleSide;}
 const stones=[mat(0xa3a99b),mat(0xb1b2a3),mat(0x909b91)],pale=mat(0xc4d2cd),silver=new THREE.MeshStandardMaterial({color:0xb8ced0,roughness:.48,metalness:.26}),fishBack=mat(0x658b98);
 const quad=(n:string,a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3,d:THREE.Vector3,m:THREE.Material)=>{const g=new THREE.BufferGeometry().setFromPoints([a,b,c,b,d,c]);g.computeVertexNormals();return add(restored,n,g,m);};
 for(const side of [-1,1])for(let row=0;row<(low?6:8);row++)for(let col=0;col<(low?8:11);col++){
  const nr=low?6:8,nc=low?8:11,x0=(row+.025)/nr*1.17,x1=(row+.975)/nr*1.17,z0=cz-.91+(col+.025)/nc*1.82,z1=cz-.91+(col+.975)/nc*1.82;
  quad('SLATE_COURSE',V(cx+side*x0,roofY(x0)+.012,z0),V(cx+side*x1,roofY(x1)+.012,z0),V(cx+side*x0,roofY(x0)+.012,z1),V(cx+side*x1,roofY(x1)+.012,z1),slates[(row*3+col)%3]);
 }
 for(let col=0;col<20;col++)box(restored,'PIER_PLANK',.168,.029,3.18,wood,-1.9+(col+.5)*3.5/20,.31,.2);
 for(let row=0;row<2;row++){
  for(const z of [-1.235,.375])for(let col=0;col<8;col++){const x=cx-1.05+(col+.5)*2.1/8;if(Math.abs(x-cx)<.37)continue;box(restored,'PLINTH_STONE',.25,.146,.032,stones[(row+col)%3],x,.305+(row+.5)*.155,z);}
  for(const x of [-.844,1.284])for(let col=0;col<6;col++)box(restored,'SIDE_PLINTH_STONE',.032,.146,.245,stones[(row+col)%3],x,.305+(row+.5)*.155,-1.21+(col+.5)*1.56/6);
 }
 for(let row=0;row<4;row++)for(const x of [.738,1.002])box(restored,'CHIMNEY_COURSE',.028,.144,.272,stones[row%3],x,1.90+row*.15,-.85);
 for(const z of [-.994,-.706])for(let row=0;row<4;row++)box(restored,'CHIMNEY_COURSE',.244,.144,.028,stones[(row+1)%3],.87,1.90+row*.15,z);
 // Solid door boards are clipped to the existing arch, leaving glazing and trim intact.
 for(const rear of [false,true]){const w=rear?.62:.57,h=rear?1.12:1.10,z=rear?-1.274:.415,sign=rear?-1:1;
  for(let i=0;i<6;i++){const x=-w/2+(i+.5)*w/6,height=h-w/2+Math.sqrt(Math.max(0,(w/2)**2-x*x));box(restored,'DOOR_BOARD',w/6-.01,height-.035,.014,wood,cx+x,.34+(height-.035)/2,z);}
  for(const y of [.60,1.09])box(restored,'DOOR_HINGE',.18,.029,.017,iron,cx-w*.25,y,z+sign*.013);
  const handle=add(restored,'DOOR_HANDLE',new THREE.TorusGeometry(.028,.008,4,9),iron,cx+w*.28,.85,z+sign*.025);
 }
 for(const x of [cx-.69,cx+.69]){
  box(restored,'COUNTER_PALE_BED',.60,.028,.50,pale,x,.731,.91);
  for(const dx of [-.335,.335])box(restored,'COUNTER_SIDE_RIM',.045,.105,.62,wood,x+dx,.762,.91);
  for(const z of [.605,1.215])box(restored,'COUNTER_END_RIM',.70,.105,.045,wood,x,.762,z);
  for(let j=0;j<3;j++)box(restored,'COUNTER_FRONT_BOARD',.63,.08,.022,wood,x,.40+j*.092,1.204);
  for(let i=0;i<(low?4:6);i++){
   const f=new THREE.Group();f.position.set(x+(i%2===0?-.14:.13),.779,.72+Math.floor(i/2)*.165);f.rotation.y=(i%2===0?.22:-.32)+Math.PI/2;f.scale.setScalar(.85);restored.add(f);
   const body=add(f,'SILVER_FISH_BODY',new THREE.SphereGeometry(1,8,5),silver);body.scale.set(.125,.034,.045);
   const back=add(f,'FISH_BLUE_BACK',new THREE.SphereGeometry(1,8,4),fishBack,0,.020,-.002);back.scale.set(.108,.018,.033);
   const tailShape=new THREE.Shape();tailShape.moveTo(.105,0);tailShape.lineTo(.185,.06);tailShape.lineTo(.173,-.054);tailShape.closePath();const tailGeo=new THREE.ExtrudeGeometry(tailShape,{depth:.012,bevelEnabled:false});tailGeo.rotateX(-Math.PI/2);add(f,'FORKED_FISH_TAIL',tailGeo,silver,0,.004,0);
   const finShape=new THREE.Shape();finShape.moveTo(-.02,0);finShape.lineTo(.07,.055);finShape.lineTo(.09,0);finShape.closePath();add(f,'FISH_DORSAL_FIN',new THREE.ExtrudeGeometry(finShape,{depth:.008,bevelEnabled:false}),fishBack,0,.025,-.005);
   add(f,'FISH_EYE',new THREE.SphereGeometry(.007,5,3),iron,-.093,.027,.025);
  }
 }
 // The valance remains low and soft; each band terminates in a restrained sewn scallop.
 for(let stripe=0;stripe<10;stripe++){
  const w=(right-left)/10,x=left+(stripe+.5)*w;const sh=new THREE.Shape();sh.moveTo(-w/2,.01);sh.lineTo(w/2,.01);sh.lineTo(w/2,-.024);sh.quadraticCurveTo(0,-.075,-w/2,-.024);sh.closePath();add(restored,'AWNING_SCALLOP',new THREE.ShapeGeometry(sh,5),stripe%2?canvas:teal,x,1.19,1.194);
 }
 for(const [x,z] of [[-1.70,1.60],[-1.7,-1.21],[1.4,-1.21]]){
  cyl(restored,'MOORING_BOLLARD',.073,.31,wood,x,.485,z);for(let r=0;r<3;r++){const wrap=add(restored,'MOORING_ROPE_WRAP',new THREE.TorusGeometry(.078,.012,4,10),rope,x,.55+r*.025,z);wrap.rotation.x=Math.PI/2;}
 }
 for(const x of [left,right])for(let r=0;r<3;r++){const wrap=add(restored,'CANOPY_LASHING',new THREE.TorusGeometry(.051,.008,4,8),rope,x,1.16+r*.021,1.18);wrap.rotation.x=Math.PI/2;}
 // Small wall lantern, out of the door opening and below the awning attachment.
 const lx=cx+.39;box(restored,'LANTERN_PLATE',.07,.15,.035,iron,lx,1.15,.43);beam(restored,'LANTERN_ARM',V(lx,1.20,.43),V(lx,1.20,.55),.022,.022,iron);
 const glow=new THREE.MeshStandardMaterial({color:0xf0c574,emissive:0xffbf57,emissiveIntensity:.4,roughness:.5});box(restored,'LANTERN_GLASS',.086,.13,.079,glow,lx,1.09,.56);
 for(const dx of [-.052,.052])for(const dz of [-.048,.048])box(restored,'LANTERN_FRAME',.013,.16,.013,iron,lx+dx,1.09,.56+dz);box(restored,'LANTERN_CAP',.135,.03,.13,iron,lx,1.18,.56);box(restored,'LANTERN_BASE',.12,.025,.12,iron,lx,1,.56);
 // Right side sign hangs beside the window from a bracket fixed to the rear corner pier.
 beam(restored,'SIGN_ARM',V(1.27,1.47,-.96),V(1.56,1.47,-.96),.045,.045,dark);beam(restored,'SIGN_BRACE',V(1.27,1.25,-.96),V(1.49,1.47,-.96),.026,.026,iron);
 beam(restored,'SIGN_HANGER_CROSSBAR',V(1.52,1.47,-1.12),V(1.52,1.47,-.80),.035,.035,dark);
 box(restored,'HANGING_SIGN',.048,.32,.44,wood,1.52,1.17,-.96);for(const z of [-1.10,-.82])beam(restored,'SIGN_HANGER',V(1.52,1.46,z),V(1.52,1.33,z),.012,.012,iron);
 const signFish=add(restored,'SIGN_FISH_BODY',new THREE.SphereGeometry(1,10,6),silver,1.551,1.18,-.995);signFish.scale.set(.022,.065,.12);
 const ts=new THREE.Shape();ts.moveTo(-.90,1.18);ts.lineTo(-.78,1.27);ts.lineTo(-.78,1.10);ts.closePath();const tg=new THREE.ExtrudeGeometry(ts,{depth:.02,bevelEnabled:false});tg.rotateY(-Math.PI/2);add(restored,'SIGN_FISH_TAIL',tg,silver,1.563,0,0);
 // Narrow accessories use the left/rear strips; center lane and front-right bridge landing stay open.
 box(restored,'SMALL_CRATE',.28,.28,.30,wood,-1.31,.475,-1.03);for(const y of [.36,.56])box(restored,'CRATE_BAND',.30,.035,.315,dark,-1.31,y,-1.03);
 const profile=[new THREE.Vector2(0,0),new THREE.Vector2(.105,0),new THREE.Vector2(.132,.08),new THREE.Vector2(.138,.20),new THREE.Vector2(.113,.34),new THREE.Vector2(0,.34)];add(restored,'SMALL_BARREL',new THREE.LatheGeometry(profile,10),wood,-1.33,.325,-.53);
 for(const y of [.40,.59]){const hoop=add(restored,'BARREL_HOOP',new THREE.TorusGeometry(.133,.01,4,10),iron,-1.33,y,-.53);hoop.rotation.x=Math.PI/2;}

 const basketProfile=[new THREE.Vector2(.08,0),new THREE.Vector2(.115,.04),new THREE.Vector2(.12,.21),new THREE.Vector2(.107,.22),new THREE.Vector2(.097,.04),new THREE.Vector2(.08,.018)];add(restored,'SMALL_BASKET',new THREE.LatheGeometry(basketProfile,12),rope,-1.28,.325,-.05);for(let row=0;row<5;row++){const weave=add(restored,'BASKET_WEAVE',new THREE.TorusGeometry(.119,.008,4,12),wood,-1.28,.375+row*.036,-.05);weave.rotation.x=Math.PI/2;}

}
