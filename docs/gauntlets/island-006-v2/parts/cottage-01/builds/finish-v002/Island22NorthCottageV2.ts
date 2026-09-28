import * as THREE from 'three';
import type { Island3DQuality } from './island5ThreePilotContract';
import type { Island22FishermansVillageMaterials } from './Island22FishermansVillageThreeWorld';
type Groups={macro:THREE.Group;finish:THREE.Group};
type Options={quality:Island3DQuality;materials:Island22FishermansVillageMaterials};
const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
/** Isolated north cottage architecture. World placement and instance ownership remain outside this module. */
export function populateIsland22NorthCottageV2({macro,finish}:Groups,{quality}:Options){
 const low=quality==='low',mat=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.88});
 const wood=mat(0x73563a),dark=mat(0x493c2b),plaster=mat(0xe4d6b9),stone=mat(0x929889),clay=mat(0xa06d4e),slate=mat(0x516676);
 for(const m of [clay,slate]){m.side=THREE.DoubleSide;m.shadowSide=THREE.DoubleSide;}
 const grainBytes=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const k=(y*64+x)*4,v=230+Math.sin(x*.87+Math.sin(y*.075)*.7)*10+Math.sin(x*2.2+y*.015)*4;grainBytes[k]=grainBytes[k+1]=grainBytes[k+2]=v;grainBytes[k+3]=255;}const grain=new THREE.DataTexture(grainBytes,64,64,THREE.RGBAFormat);grain.colorSpace=THREE.SRGBColorSpace;grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.needsUpdate=true;wood.map=grain;dark.map=grain;
 const glass=new THREE.MeshStandardMaterial({color:0xe7c277,emissive:0xf1bb58,emissiveIntensity:.23,roughness:.5});
 const add=(n:string,geo:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0,g=macro)=>{if(['CURVED_CLAY_ROOF','ANNEX_LEAN_ROOF','DORMER_ROOF','REAR_SERVICE_SHELTER'].includes(n)){const p=geo.getAttribute('position'),ix=geo.getIndex(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();for(let i=0;i<(ix?ix.count:p.count);i+=3){const ia=ix?ix.getX(i):i,ib=ix?ix.getX(i+1):i+1,ic=ix?ix.getX(i+2):i+2;a.fromBufferAttribute(p,ia);b.fromBufferAttribute(p,ib);c.fromBufferAttribute(p,ic);if(b.clone().sub(a).cross(c.clone().sub(a)).y<0){if(ix){ix.setX(i+1,ic);ix.setX(i+2,ib);}else{p.setXYZ(ib,c.x,c.y,c.z);p.setXYZ(ic,b.x,b.y,b.z);}}}geo.computeVertexNormals();}const o=new THREE.Mesh(geo,m);o.name='ISLAND_006_NORTH_COTTAGE_'+n;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
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
 for(const z of [-.245,.605])box('ANNEX_CORNER',.065,1.02,.065,wood,1.49,.575,z);
 opening(1.12,.07,.602,0,.32,.71,true);opening(1.523,.40,.18,Math.PI/2,.24,.32);opening(1.12,.40,-.244,Math.PI,.27,.32);
 // Front dormer has a closed shell buried in the roof, with an occupied rectangular window.
 const ds=new THREE.Shape();ds.moveTo(-.22,2.02);ds.lineTo(.22,2.02);ds.lineTo(.22,2.41);ds.lineTo(0,2.61);ds.lineTo(-.22,2.41);ds.closePath();const dg=new THREE.ExtrudeGeometry(ds,{depth:.40,bevelEnabled:false});dg.translate(-.12,0,.23);add('DORMER_SHELL',dg,plaster);
 for(const side of [-1,1]){const a=V(-.12,2.64,.18),b=V(-.12+side*.28,2.39,.18),c=V(-.12,2.64,.70),d=V(-.12+side*.28,2.39,.70),g=new THREE.BufferGeometry().setFromPoints([a,b,c,b,d,c]);g.computeVertexNormals();add('DORMER_ROOF',g,clay);beam('DORMER_BARGE',V(-.12,2.65,.72),V(-.12+side*.28,2.40,.72),.055,.065);}
 opening(-.12,2.09,.638,0,.27,.29);
 box('STONE_CHIMNEY',.25,.71,.25,stone,.57,2.64,-.19);box('CHIMNEY_CAP',.32,.085,.32,stone,.57,3.005,-.19);
 // Rear service canopy is carried by two wall brackets, clear of the door aperture.
 const canopy=new THREE.BufferGeometry().setFromPoints([V(-.57,1.06,-.61),V(.07,1.06,-.61),V(-.57,.93,-.93),V(.07,1.06,-.61),V(.07,.93,-.93),V(-.57,.93,-.93)]);canopy.computeVertexNormals();add('REAR_SERVICE_SHELTER',canopy,slate);
 for(const x of [-.53,.03])beam('SHELTER_BRACKET',V(x,.79,-.66),V(x,.96,-.89),.045,.045);box('SHELTER_FASCIA',.68,.05,.06,wood,-.25,.93,-.94);
 // Fine finish follows frozen surfaces; winding remains upward even in FrontSide clay studies.
 const tiles=[mat(0xa57555),mat(0xa97857),mat(0x9f7052)],slates=[mat(0x586f7c),mat(0x5c727e)],stones=[mat(0xa3a798),mat(0xb0ad9b)],iron=mat(0x424b44),leaf=mat(0x5c7658),petal=mat(0xd4dece),rope=mat(0xa28b60);
 for(const m of [...tiles,...slates])m.shadowSide=THREE.DoubleSide;
 const quad=(n:string,points:THREE.Vector3[],m:THREE.Material)=>{const pts=[points[0],points[1],points[2],points[1],points[3],points[2]];for(let i=0;i<6;i+=3)if(pts[i+1].clone().sub(pts[i]).cross(pts[i+2].clone().sub(pts[i])).y<0)[pts[i+1],pts[i+2]]=[pts[i+2],pts[i+1]];const geo=new THREE.BufferGeometry().setFromPoints(pts);geo.computeVertexNormals();add(n,geo,m,0,0,0,finish);};
 const tilePick=(row:number,col:number,side:number,count:number)=>{const h=Math.sin(row*73.17+col*19.73+side*31.29)*43758.5453;return Math.floor((h-Math.floor(h))*count);};
 for(const side of [-1,1])for(let row=0;row<(low?5:7);row++)for(let col=0;col<=(low?9:12);col++){
  const nr=low?5:7,nc=low?9:12,offset=row%2*.5,z0=(row+.01)/nr*.80,z1=(row+.99)/nr*.80,x0=Math.max(-.95,-.95+(col-offset+.022)/nc*1.9),x1=Math.min(.95,-.95+(col+1-offset-.022)/nc*1.9);if(x1<=x0)continue;
  const m=tiles[tilePick(row,col,side,3)];
  quad('CLAY_TILE_COURSE',[V(x0,roofY(z0)+.004,side*z0),V(x1,roofY(z0)+.004,side*z0),V(x0,roofY(z1)+.022,side*z1),V(x1,roofY(z1)+.022,side*z1)],m);
  box('CLAY_TILE_LOWER_LIP',x1-x0,.018,.008,m,(x0+x1)/2,roofY(z1)+.013,side*z1,finish);
 }
 for(let col=0;col<11;col++){const cap=add('CLAY_RIDGE_CAP',new THREE.CylinderGeometry(.055,.055,.172,8),tiles[col%3],-.94+(col+.5)*1.88/11,2.735,0,finish);cap.rotation.z=Math.PI/2;}
 for(let row=0;row<5;row++)for(let col=0;col<=7;col++){const offset=row%2*.5,x0=.66+(row+.01)/5*.94,x1=.66+(row+.99)/5*.94,z0=Math.max(-.32,-.32+(col-offset+.025)/7),z1=Math.min(.68,-.32+(col+1-offset-.025)/7);if(z1<=z0)continue;const m=slates[tilePick(row,col,1,2)];quad('ANNEX_SLATE_COURSE',[V(x0,annexY(x0)+.004,z0),V(x1,annexY(x1)+.018,z0),V(x0,annexY(x0)+.004,z1),V(x1,annexY(x1)+.018,z1)],m);box('ANNEX_TILE_LOWER_LIP',.007,.014,z1-z0,m,x1,annexY(x1)+.011,(z0+z1)/2,finish);}
 for(const side of [-1,1])for(let row=0;row<3;row++)for(let col=0;col<=4;col++){const offset=row%2*.5,x0=(row+.015)/3*.28,x1=(row+.985)/3*.28,z0=Math.max(.185,.185+(col-offset+.025)/4*.51),z1=Math.min(.695,.185+(col+1-offset-.025)/4*.51);if(z1<=z0)continue;const m=tiles[tilePick(row,col,side+5,3)];quad('DORMER_CLAY_COURSE',[V(-.12+side*x0,2.64-x0*.25/.28+.004,z0),V(-.12+side*x1,2.64-x1*.25/.28+.018,z0),V(-.12+side*x0,2.64-x0*.25/.28+.004,z1),V(-.12+side*x1,2.64-x1*.25/.28+.018,z1)],m);box('DORMER_TILE_LOWER_LIP',.007,.014,z1-z0,m,-.12+side*x1,2.64-x1*.25/.28+.011,(z0+z1)/2,finish);}
 for(let row=0;row<2;row++)for(const z of [-.647,.647])for(let col=0;col<7;col++){const x=-.80+(col+.5)*1.6/7;if(z>0&&x>.05&&x<.59||z<0&&x>-.51&&x<.01)continue;box('GROUND_STONE_COURSE',.214,.096,.025,stones[(row+col)%2],x,.06+(row+.5)*.104,z,finish);}
 for(const x of [-.812,1.555])for(let row=0;row<2;row++)for(let col=0;col<5;col++){const isAnnex=x>0,z=(isAnnex?-.25:-.63)+(col+.5)*(isAnnex?.87:1.26)/5;box('SIDE_STONE_COURSE',.025,.095,(isAnnex?.87:1.26)/5-.01,stones[(row+col)%2],x,.06+(row+.5)*.104,z,finish);}
 for(const z of [-.266,.626])for(let row=0;row<2;row++)for(let col=0;col<4;col++){const x=.61+(col+.5)*.93/4;if(z>0&&Math.abs(x-1.12)<.22)continue;box('ANNEX_STONE_COURSE',.218,.095,.023,stones[(row+col)%2],x,.06+(row+.5)*.104,z,finish);}
 for(let row=0;row<4;row++)for(const z of [-.326,-.054])box('CHIMNEY_STONE_COURSE',.257,.14,.026,stones[row%2],.57,2.375+row*.151,z,finish);
 for(let row=0;row<4;row++)for(const x of [.433,.707])box('CHIMNEY_SIDE_COURSE',.026,.14,.244,stones[(row+1)%2],x,2.375+row*.151,-.19,finish);
 add('CHIMNEY_POT',new THREE.CylinderGeometry(.07,.085,.17,10),tiles[1],.57,3.115,-.19,finish);
 const shutters=(x:number,y:number,z:number,w:number,h:number,yaw=0)=>{const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=yaw;finish.add(g);for(const side of [-1,1]){box('OPEN_SHUTTER',.12,h+.025,.025,wood,side*(w/2+.105),h/2,.03,g);for(let row=0;row<2;row++)box('SHUTTER_STRAP',.13,.025,.016,dark,side*(w/2+.105),h*(.22+row*.56),.049,g);}};
 shutters(-.10,1.26,.718,.42,.45);shutters(-.39,.39,.664,.31,.40);shutters(-.879,1.28,0,.34,.43,-Math.PI/2);
 // Small flower box sits below the ground-floor left window and leaves the door approach open.
 box('FLOWER_BOX',.43,.10,.16,wood,-.39,.33,.765,finish);box('FLOWER_SOIL',.38,.015,.125,dark,-.39,.386,.765,finish);
 for(let i=0;i<(low?5:8);i++){const x=-.565+i*.048,z=.735+(i%2)*.055;const greenery=add('FLOWER_LEAVES',new THREE.SphereGeometry(.039,6,4),leaf,x,.414,z,finish);greenery.scale.y=.65;add('WHITE_FLOWER',new THREE.SphereGeometry(.018,6,4),petal,x+.007,.45,z,finish);}
 // Door joinery follows original apertures and keeps rear threshold free.
 for(const d of [{x:.32,z:.672,w:.4,h:.77,rear:false,arch:true},{x:1.12,z:.648,w:.32,h:.71,rear:false,arch:false},{x:-.25,z:-.67,w:.4,h:.77,rear:true,arch:false}]){
  for(let i=0;i<5;i++){const x=-d.w/2+(i+.5)*d.w/5,height=d.arch?d.h-d.w/2+Math.sqrt(Math.max(0,(d.w/2)**2-x*x)):d.h;box('DOOR_PLANK',d.w/5-.008,height-.035,.014,wood,d.x+x,.085+(height-.035)/2,d.z,finish);}
  const sign=d.rear?-1:1;for(const y of [.28,.64])box('IRON_DOOR_HINGE',.13,.021,.018,iron,d.x-d.w*.23,y,d.z+sign*.013,finish);add('DOOR_RING_HANDLE',new THREE.TorusGeometry(.025,.007,4,10),iron,d.x+d.w*.24,.46,d.z+sign*.028,finish);
 }
 // Compact wall fish plaque is fixed above the annex entrance; it does not hang into the path.
 box('FISH_PLAQUE',.28,.12,.034,wood,1.12,.91,.65,finish);const fish=add('FISH_PLAQUE_RELIEF',new THREE.SphereGeometry(1,8,5),stones[1],1.10,.91,.676,finish);fish.scale.set(.075,.03,.014);const tail=new THREE.Shape();tail.moveTo(1.16,.91);tail.lineTo(1.225,.945);tail.lineTo(1.225,.875);tail.closePath();add('FISH_PLAQUE_TAIL',new THREE.ExtrudeGeometry(tail,{depth:.012,bevelEnabled:false}),stones[1],0,0,.67,finish);
 // Single small barrel occupies the solid pier between the two doors.
 const barrelProfile=[new THREE.Vector2(0,0),new THREE.Vector2(.083,0),new THREE.Vector2(.103,.07),new THREE.Vector2(.108,.16),new THREE.Vector2(.09,.29),new THREE.Vector2(0,.29)];add('BARREL',new THREE.LatheGeometry(barrelProfile,10),wood,.77,.06,.80,finish);
 for(const y of [.12,.28]){const h=add('BARREL_HOOP',new THREE.TorusGeometry(.103,.01,4,10),iron,.77,y,.80,finish);h.rotation.x=Math.PI/2;}
 for(let i=0;i<3;i++){const coil=add('STORED_ROPE',new THREE.TorusGeometry(.060+i*.012,.009,4,12),rope,.77,.361+i*.012,.80,finish);coil.rotation.x=Math.PI/2;}

}
