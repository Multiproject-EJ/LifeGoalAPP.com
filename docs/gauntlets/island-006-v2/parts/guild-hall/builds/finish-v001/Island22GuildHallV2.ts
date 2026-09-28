import * as THREE from 'three';
import type { Island22PremiumLandmarkFactoryOptions } from './Island22PremiumLandmarkFamilies';
type Groups = { macro: THREE.Group; operations: THREE.Group; restored: THREE.Group };
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);

/** One continuous guild hall and deliberately buried annex junctions. Factory owns placement and levels. */
export function populateIsland22GuildHallV2({macro,operations,restored}:Groups,{quality}:Island22PremiumLandmarkFactoryOptions){
 const low=quality==='low';
 const material=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.86});
 const plaster=material(0xe4d5b6),stone=material(0x939589),wood=material(0x785b3d),dark=material(0x403526),slate=material(0x465d6d),copper=material(0x688b80);
 slate.side=THREE.DoubleSide;slate.shadowSide=THREE.DoubleSide;
 const grainData=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const k=(y*64+x)*4,v=229+Math.sin(x*.95+Math.sin(y*.08)*.6)*12+Math.sin(x*2.7+y*.025)*5;grainData[k]=grainData[k+1]=grainData[k+2]=v;grainData[k+3]=255;}const grain=new THREE.DataTexture(grainData,64,64,THREE.RGBAFormat);grain.colorSpace=THREE.SRGBColorSpace;grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.needsUpdate=true;wood.map=grain;dark.map=grain;
 const glass=new THREE.MeshStandardMaterial({color:0xe6b05a,emissive:0xeab654,emissiveIntensity:.3,roughness:.5});
 const add=(group:THREE.Group,name:string,geometry:THREE.BufferGeometry,mat:THREE.Material,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,mat);m.name='ISLAND_006_GUILD_'+name;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
 const box=(g:THREE.Group,n:string,w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number)=>add(g,n,new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const beam=(g:THREE.Group,n:string,a:THREE.Vector3,b:THREE.Vector3,w=.085,d=.095,mat=wood)=>{const m=box(g,n,w,a.distanceTo(b),d,mat,0,0,0);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());return m;};
 const tube=(g:THREE.Group,n:string,p:THREE.Vector3[],r:number,mat=wood)=>add(g,n,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p),16,r,5,false),mat);
 const arch=(w:number,h:number)=>{const r=w/2,s=new THREE.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,h-r);s.absarc(0,h-r,r,0,Math.PI,false);s.lineTo(-r,0);return s;};
 const opening=(group:THREE.Group,x:number,y:number,z:number,yaw:number,w:number,h:number,door=false)=>{
  const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=yaw;group.add(g);
  add(g,'ARCH_REVEAL',new THREE.ExtrudeGeometry(arch(w+.16,h+.09),{depth:.075,bevelEnabled:false,curveSegments:low?8:12}),stone);
  add(g,door?'DOUBLE_DOOR':'ARCHED_GLAZING',new THREE.ShapeGeometry(arch(w,h),low?8:12),door?wood:glass,0,.015,.082);
  const r=w/2,points=[V(-r,0,.095),V(-r,h-r,.095)];for(let i=0;i<=12;i++){const a=Math.PI-i/12*Math.PI;points.push(V(Math.cos(a)*r,h-r+Math.sin(a)*r,.095));}points.push(V(r,0,.095));
  tube(g,'ARCH_FRAME',points,.034,dark);box(g,'OPENING_SILL',w+.19,.085,.16,wood,0,-.008,.09);
  box(g,'CENTER_MULLION',.036,h-.025,.05,dark,0,h/2,.105);
  if(!door)box(g,'WINDOW_TRANSOM',w,.035,.05,dark,0,h*.48,.105);
 };
 box(macro,'CONTINUOUS_TERRACE',4.86,.5,3.25,stone,0,.05,.02);box(macro,'TERRACE_CAP',4.96,.10,3.35,stone,0,.275,.02);
 for(let i=0;i<3;i++)box(macro,'BROAD_ENTRY_STEP',1.9,.12,.35,stone,0,-.005+i*.12,1.99-i*.25);
 box(macro,'MAIN_HALL',2.85,1.59,1.94,plaster,0,1.085,0);box(macro,'HALL_STONE_PLINTH',2.93,.25,2.02,stone,0,.445,0);
 for(const x of [-1.425,1.425])for(const z of [-.97,.97])box(macro,'MAIN_CORNER_TIMBER',.115,1.48,.12,wood,x,1.125,z);
 for(const z of [-1,1])box(macro,'MAIN_EAVE_BEAM',2.97,.13,.13,wood,0,1.82,z);
 // Four swept faces share precisely the same corner curves and close at the crown.
 const ring=(t:number)=>({x:.64+1.22*(1-t)**2,z:.5+.86*(1-t)**2,y:1.85+2.17*t});
 const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
 for(let face=0;face<4;face++){
  const p:number[]=[],idx:number[]=[],uv:number[]=[];const a=corners[face],b=corners[(face+1)%4];
  for(let j=0;j<=16;j++){const r=ring(j/16);p.push(a[0]*r.x,r.y,a[1]*r.z,b[0]*r.x,r.y,b[1]*r.z);uv.push(0,j/16,1,j/16);if(j<16){const k=j*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();add(macro,'SWEPT_MANSARD_FACE',geo,slate);
  tube(macro,'SWEPT_HIP_SEAM',Array.from({length:17},(_,j)=>{const r=ring(j/16);return V(a[0]*r.x,r.y+.017,a[1]*r.z);}),.038,wood);
 }
 box(macro,'MANSARD_TOP_SEAL',1.3,.08,1.02,slate,0,4.015,0);
 for(const z of [-1.36,1.36])box(macro,'MANSARD_EAVE',3.8,.1,.115,wood,0,1.845,z);
 for(const x of [-1.86,1.86])box(macro,'MANSARD_SIDE_EAVE',.115,.1,2.79,wood,x,1.845,0);
 // Gabled solids extend to their roof undersides: no roof/wall slot in any view.
 const gable=(g:THREE.Group,name:string,cx:number,cz:number,half:number,depth:number,base:number,eave:number,peak:number)=>{
  const s=new THREE.Shape();s.moveTo(-half,base);s.lineTo(half,base);s.lineTo(half,eave);s.lineTo(0,peak);s.lineTo(-half,eave);s.closePath();
  const geo=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false});geo.translate(cx,0,cz-depth/2);add(g,name+'_WALL',geo,plaster);
  const ext=half+.105,top=peak+.045,slope=(peak-eave)/half;
  for(const side of [-1,1]){const a=V(cx,top,cz-depth/2-.1),b=V(cx+side*ext,top-slope*ext,cz-depth/2-.1),c=V(cx,top,cz+depth/2+.1),d=V(cx+side*ext,top-slope*ext,cz+depth/2+.1);const geom=new THREE.BufferGeometry().setFromPoints([a,b,c,b,d,c]);geom.computeVertexNormals();add(g,name+'_ROOF',geom,slate);for(const z of [cz-depth/2-.12,cz+depth/2+.12]){const run=name==='ATTACHED_WING'&&side*cx<0?Math.abs(cx)-1.43:ext;beam(g,name+'_BARGE',V(cx,top+.025,z),V(cx+side*run,top-slope*run+.025,z),.085,.11);}}
  box(g,name+'_RIDGE',.10,.09,depth+.29,wood,cx,top+.02,cz);
  for(const z of [cz-depth/2-.025,cz+depth/2+.025]){box(g,name+'_TIE',half*2,.09,.1,wood,cx,eave,z);beam(g,name+'_KINGPOST',V(cx,eave,z),V(cx,peak-.025,z),.075,.085);}
 };
 // Portal is a shallow occupied gabled extension, sunk into the hall front and its roof.
 gable(macro,'ENTRY_GABLE',0,1.01,.78,.78,.3,1.81,2.73);
 opening(macro,0,.335,1.411,0,.89,1.36,true);
 for(const x of [-.755,.755])box(macro,'ENTRY_POST',.125,1.46,.14,wood,x,1.07,1.405);
 for(const side of [-1,1]){
  const x=side*1.73;
  gable(operations,'ATTACHED_WING',x,0,.625,1.9,.3,1.46,2.27);
  box(operations,'WING_PLINTH',1.3,.24,1.98,stone,x,.44,0);
  for(const dx of [-.625,.625])for(const z of [-.965,.965])box(operations,'WING_CORNER',.095,1.08,.105,wood,x+dx,.97,z);
  opening(operations,x-.24,.64,.961,0,.26,.64);opening(operations,x+.24,.64,.961,0,.26,.64);
  opening(operations,x,.61,-.961,Math.PI,.43,.7);
  opening(operations,side*2.362,.50,0,side*Math.PI/2,.44,.71);
 }
 for(const x of [-.93,0,.93])opening(macro,x,.67,-.979,Math.PI,.4,.9);
 for(const x of [-1.06,1.06])opening(macro,x,.66,.98,0,.33,.91);
 // Dormers meet the swept roof through a deep buried box; only their exterior faces emerge.
 for(const side of [-1,1]){
  const g=new THREE.Group();g.rotation.y=side<0?Math.PI:0;operations.add(g);
  gable(g,'SEATED_DORMER',0,.60,.28,.51,2.82,3.29,3.57);
  opening(g,0,2.87,.865,0,.31,.42);
 }
 box(operations,'COPPER_CROWN',1.35,.34,1.06,copper,0,4.20,0);box(operations,'CROWN_CAP',1.48,.07,1.17,wood,0,4.405,0);
 for(const x of [-.66,.66])for(const z of [-.5,.5]){
  box(operations,'CROWN_CORNER',.095,.60,.095,wood,x,4.46,z);
  add(operations,'CROWN_FINIAL',new THREE.SphereGeometry(.075,8,6),wood,x,4.8,z);
 }
 // Restored finish follows the approved backing surfaces; every tile has continuous roof below it.
 const iron=material(0x36413f),gold=material(0xb99550);
 const tiles=[material(0x536977),material(0x49616f),material(0x5d707a)];for(const m of tiles){m.side=THREE.DoubleSide;m.shadowSide=THREE.DoubleSide;}
 const stones=[material(0xa7a99a),material(0x969b90),material(0xb0afa0)];
 const quad=(name:string,points:THREE.Vector3[],m:THREE.Material)=>{const g=new THREE.BufferGeometry().setFromPoints([points[0],points[1],points[2],points[1],points[3],points[2]]);g.computeVertexNormals();add(restored,name,g,m);};
 const rows=low?11:15;
 for(let face=0;face<4;face++)for(let row=0;row<rows;row++){
  const a=corners[face],b=corners[(face+1)%4],t0=(row+.045)/rows,t1=(row+.955)/rows,r0=ring(t0),r1=ring(t1);
  const cols=Math.max(4,Math.round((face%2===0?r0.x:r0.z)*(low?7:9)));
  for(let col=0;col<cols;col++){
   const u0=(col+.025)/cols,u1=(col+.975)/cols;
   const point=(r:ReturnType<typeof ring>,u:number)=>V((a[0]+(b[0]-a[0])*u)*(r.x+.009),r.y+.009,(a[1]+(b[1]-a[1])*u)*(r.z+.009));
   quad('MANSARD_SLATE_COURSE',[point(r0,u0),point(r0,u1),point(r1,u0),point(r1,u1)],tiles[(row*5+col*7+face)%3]);
  }
 }
 const gableTiles=(cx:number,cz:number,half:number,depth:number,eave:number,peak:number,rotate=false)=>{
  const ext=half+.105,slope=(peak-eave)/half,top=peak+.045,nr=low?4:6,nc=Math.max(3,Math.round(depth*5));
  for(const side of [-1,1])for(let row=0;row<nr;row++)for(let col=0;col<nc;col++){
   const x0=(row+.025)/nr*ext,x1=(row+.975)/nr*ext,z0=cz-depth/2-.09+(col+.025)/nc*(depth+.18),z1=cz-depth/2-.09+(col+.975)/nc*(depth+.18);
   const point=(x:number,z:number)=>rotate?V(-(cx+side*x),top-slope*x+.014,-z):V(cx+side*x,top-slope*x+.014,z);
   quad('GABLE_SLATE_COURSE',[point(x0,z0),point(x1,z0),point(x0,z1),point(x1,z1)],tiles[(row+col)%3]);
  }
 };
 gableTiles(0,1.01,.78,.78,1.81,2.73);for(const x of [-1.73,1.73])gableTiles(x,0,.625,1.9,1.46,2.27);
 gableTiles(0,.60,.28,.51,3.29,3.57);gableTiles(0,.60,.28,.51,3.29,3.57,true);
 // Shallow rectangular stones read as courses rather than noisy displaced rubble.
 for(let row=0;row<2;row++)for(let col=0;col<12;col++){
  const x=-2.42+(col+.5)*4.84/12;
  for(const z of [-1.617,1.657]){if(z>0&&Math.abs(x)<1.01)continue;box(restored,'TERRACE_STONE',.386,.213,.045,stones[(row+col)%3],x,-.18+(row+.5)*.22,z);}
 }
 for(const x of [-2.437,2.437])for(let row=0;row<2;row++)for(let col=0;col<8;col++)box(restored,'TERRACE_SIDE_STONE',.045,.213,.38,stones[(row+col)%3],x,-.18+(row+.5)*.22,-1.59+(col+.5)*.4);
 for(const z of [-1.014,1.014])for(let col=0;col<8;col++){const x=-1.45+(col+.5)*2.9/8;if(z>0&&Math.abs(x)<.85)continue;box(restored,'HALL_PLINTH_COURSE',.347,.213,.04,stones[col%3],x,.445,z);}
 for(const cx of [-1.73,1.73])for(const z of [-.998,.998])for(let col=0;col<4;col++)box(restored,'WING_PLINTH_COURSE',.303,.21,.04,stones[col%3],cx-.64+(col+.5)*.32,.44,z);
 // Double doors retain their existing silhouette; plank lengths are clipped to the arch.
 for(let i=0;i<8;i++){const x=-.445+(i+.5)*.89/8,h=.915+Math.sqrt(Math.max(0,.445**2-x*x));box(restored,'DOOR_BOARD',.101,h-.035,.025,wood,x,.35+(h-.035)/2,1.509);}
 for(const x of [-.13,.13]){box(restored,'HANDLE_PLATE',.055,.13,.028,iron,x,.93,1.531);const h=add(restored,'DOOR_RING',new THREE.TorusGeometry(.036,.009,4,10),iron,x,.905,1.554);h.rotation.x=0;}
 for(const x of [-.28,.28])for(const y of [.64,1.13])box(restored,'DOOR_STRAP',.24,.038,.027,iron,x,y,1.532);
 // A single sculptural fish establishes the hall's fishing-guild identity.
 const fish=add(restored,'GUILD_FISH_CREST',new THREE.SphereGeometry(1,12,8),gold,-.025,2.115,1.445);fish.scale.set(.31,.135,.055);
 const tail=new THREE.Shape();tail.moveTo(.20,2.115);tail.lineTo(.43,2.265);tail.lineTo(.40,1.99);tail.closePath();add(restored,'FISH_TAIL',new THREE.ExtrudeGeometry(tail,{depth:.045,bevelEnabled:false}),gold,0,0,1.425);
 add(restored,'FISH_EYE',new THREE.SphereGeometry(.018,6,4),iron,-.23,2.15,1.495);
 const fin=new THREE.Shape();fin.moveTo(-.12,2.23);fin.lineTo(.06,2.32);fin.lineTo(.17,2.21);fin.closePath();add(restored,'FISH_FIN',new THREE.ExtrudeGeometry(fin,{depth:.022,bevelEnabled:false}),gold,0,0,1.445);
 for(const x of [-.62,.62]){
  box(restored,'LANTERN_WALL_PLATE',.085,.15,.045,iron,x,1.41,1.49);beam(restored,'LANTERN_ARM',V(x,1.46,1.49),V(x,1.46,1.62),.025,.025,iron);
  box(restored,'LANTERN_LIGHT',.102,.16,.095,glass,x,1.33,1.63);
  for(const dx of [-.06,.06])for(const dz of [-.053,.053])box(restored,'LANTERN_FRAME',.017,.19,.017,iron,x+dx,1.33,1.63+dz);
  box(restored,'LANTERN_CAP',.16,.035,.15,iron,x,1.445,1.63);box(restored,'LANTERN_BASE',.14,.025,.135,iron,x,1.22,1.63);
 }
 // Occupied terrace accessories keep the broad central passage and all apertures clear.
 const nx=1.35,nz=1.40;
 for(const x of [nx-.2,nx+.2])box(restored,'NOTICE_POST',.05,.78,.065,wood,x,.71,nz);
 box(restored,'NOTICE_BACK',.48,.42,.065,dark,nx,.91,nz);box(restored,'NOTICE_PAPER',.33,.30,.014,plaster,nx,.91,nz+.043);
 for(let i=0;i<4;i++)box(restored,'NOTICE_INK',.21-i*.024,.014,.009,wood,nx-.025,.99-i*.05,nz+.055);
 for(const cx of [-1.86,1.98]){
  const z=1.27,profile=[new THREE.Vector2(0,0),new THREE.Vector2(.15,0),new THREE.Vector2(.185,.07),new THREE.Vector2(.20,.23),new THREE.Vector2(.18,.39),new THREE.Vector2(.15,.44),new THREE.Vector2(0,.44)];
  add(restored,'BARREL',new THREE.LatheGeometry(profile,low?10:12),wood,cx,.33,z);
  for(const y of [.40,.67]){const hoop=add(restored,'BARREL_HOOP',new THREE.TorusGeometry(.187,.013,4,12),iron,cx,y,z);hoop.rotation.x=Math.PI/2;}
 }
 for(const side of [-1,1]){
  const xs=[side*1.08,side*2.3];
  for(const x of xs){box(restored,'TERRACE_ROPE_POST',.085,.44,.085,wood,x,.55,1.58);add(restored,'POST_CAP',new THREE.SphereGeometry(.065,8,5),wood,x,.8,1.58);}
  tube(restored,'TERRACE_SAGGING_ROPE',[V(xs[0],.71,1.58),V((xs[0]+xs[1])/2,.61,1.58),V(xs[1],.71,1.58)],.018,wood);
 }

}
