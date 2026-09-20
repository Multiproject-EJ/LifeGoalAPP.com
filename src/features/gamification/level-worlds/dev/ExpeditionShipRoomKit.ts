import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

type Shape='box'|'round'|'cylinder'|'leaf';
type Program='apartment'|'tea-market'|'community'|'cinema'|'library'|'gym'|'medical'|'restaurant'|'lift-lobby'|'service';
export interface ShipRoomDefinition {
  name:string;program:Program;position:[number,number,number];yaw:number;width:number;depth:number;slots:number[];
  chases?:Array<{minX:number;maxX:number;minZ:number;maxZ:number;purpose:string}>;
}
export function makeExpeditionRingRoomDefinitions(levels:number[]):ShipRoomDefinition[] {
  const joins:Array<{slot:number;count:number;program:Program;name:string}>=[
    {slot:35,count:2,program:'tea-market',name:'ROOM_TEA_MARKET'},
    {slot:40,count:2,program:'community',name:'ROOM_COMMUNITY'},
    {slot:51,count:2,program:'cinema',name:'ROOM_CINEMA'},
    {slot:46,count:2,program:'library',name:'ROOM_LIBRARY'},
    {slot:68,count:2,program:'gym',name:'ROOM_GYM'},
    {slot:63,count:2,program:'medical',name:'ROOM_MEDICAL'},
    {slot:76,count:3,program:'restaurant',name:'ROOM_RESTAURANT'},
    {slot:82,count:2,program:'apartment',name:'ROOM_APARTMENT_082'},
  ];
  const consumed=new Set<number>(),rooms:ShipRoomDefinition[]=[];
  for(let slot=0;slot<levels.length*14;slot++){
    if(consumed.has(slot))continue;
    const joined=joins.find(j=>j.slot===slot),count=joined?.count??1;
    const level=Math.floor(slot/14),bay=slot%14,side=bay>=9?1:-1;
    const slots=Array.from({length:count},(_,i)=>slot+i);slots.forEach(s=>consumed.add(s));
    const rear=bay<4;
    const room:ShipRoomDefinition={name:joined?.name??`ROOM_APARTMENT_${slot.toString().padStart(3,'0')}`,program:joined?.program??'apartment',slots,
      position:rear?[[-1.52,-1.18,1.18,1.52][bay],levels[level]+.06,-.76]
        :[side*1.58,levels[level]+.06,-.56+(bay-(side>0?9:4))*.28+(count-1)*.14],
      yaw:rear?Math.PI:side*Math.PI/2,width:rear?.32:count*.28-.02,depth:rear?.30:.46};
    // Independent full-volume audit: the old 84 frontage slots include solid
    // power-tower bays, lift shafts and braces. Never count those as bedrooms.
    if([56,59,60,61,62,65,66,67,70,73,74,75,79,80,81].includes(slot)){
      room.program='service';room.name=`STRUCTURAL_SERVICE_BAY_${slot.toString().padStart(3,'0')}`;
    }
    if(slot>=4&&slot<=13)room.depth=[.342,.349,.355,.364,.380][(slot-4)%5];
    if([18,19,20,23,24,25].includes(slot))room.depth=.403;
    if([71,72].includes(slot))room.depth=.251;
    if(slot===76)room.depth=.306;
    if(slot===82)room.depth=.307;
    const recenter=(left:number,right:number)=>{
      const shift=(left+right)/2;
      room.position[0]+=shift*Math.cos(room.yaw);room.position[2]-=shift*Math.sin(room.yaw);
      room.width=right-left;
    };
    if([57,71].includes(slot))recenter(-.16,.101);
    if([58,72].includes(slot))recenter(-.101,.16);
    if(slot===76)recenter(.015,.410);
    if(slot===82)recenter(-.270,.125);
    if([4,9,18,23,32,37].includes(slot)){
      room.program='lift-lobby';room.name=`ROOM_LIFT_LOBBY_${slot.toString().padStart(3,'0')}`;
      room.chases=[{minX:side<0?-.130:.017,maxX:side<0?-.017:.130,minZ:.152,maxZ:.328,purpose:'existing panorama lift'}];
    }
    if(slot===46)room.chases=[{minX:-.270,maxX:-.157,minZ:.152,maxZ:.328,purpose:'existing panorama lift'}];
    if(slot===51)room.chases=[{minX:.157,maxX:.270,minZ:.152,maxZ:.328,purpose:'existing panorama lift'}];
    if(slot===63)room.chases=[{minX:-.270,maxX:-.125,minZ:0,maxZ:.46,purpose:'frozen port power-tower footing'}];
    if(slot===68)room.chases=[{minX:.125,maxX:.270,minZ:0,maxZ:.46,purpose:'frozen starboard power-tower footing'}];
    rooms.push(room);
  }
  return rooms;
}
const COLOR={wood:'#554034',cream:'#e7dbc5',dark:'#1b2a32',blue:'#276477',brass:'#b88b53',green:'#487653',light:'#e8b878',book:'#9b6b55'};
type FinishSurface='wood'|'cream'|'fabric'|'metal'|'brass'|'screen'|'light'|'leaf';
export interface RoomFinishStudy {rooms:string[];materials:Record<FinishSurface,THREE.Material>}
interface Piece {name:string;room:string;shape:Shape;color:string;matrix:THREE.Matrix4;surface?:FinishSurface}

/** Shared geometry library for all real ring rooms. Instance colours give
 * distinct surfaces without a material/draw call per book, cushion or room.
 * These are visible fixtures, not gameplay state or accommodation simulation.
 */
export function addExpeditionRingRooms(parent:THREE.Group,material:THREE.Material,quality:'low'|'high',rooms:ShipRoomDefinition[],finishStudy?:RoomFinishStudy) {
  const pieces:Piece[]=[];
  const root=new THREE.Group();root.name='ALIGNED_INHABITED_ROOM_FITOUTS';parent.add(root);
  const frame=new THREE.Matrix4(),matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
  for(const room of rooms){
    const finished=finishStudy?.rooms.includes(room.name)??false;
    frame.compose(new THREE.Vector3(...room.position),q.setFromEuler(new THREE.Euler(0,room.yaw,0)),new THREE.Vector3(1,1,1));
    const node=new THREE.Group();node.name=room.name;node.position.set(...room.position);node.rotation.y=room.yaw;
    node.userData={program:room.program,slots:room.slots,width:room.width,depth:room.depth,height:.22,floorOffset:.002,productionApproved:false,
      doorway:{width:.112,height:.165,clearApproachDepth:.08},reservedVolumes:room.chases??[],ownedFixtureNames:[] as string[]};root.add(node);
    if(room.program==='service'){
      node.userData.habitable=false;node.userData.reason='occupied by frozen power-tower structure; not accommodation';continue;
    }
    const put=(name:string,shape:Shape,color:string,p:number[],s:number[],rotation:number[]= [0,0,0])=>{
      const structure=/^(supported-floor|ceiling|partition|back-wall|door-|front-wall|room-sign|structural-service-chase)/.test(name);
      matrix.compose(new THREE.Vector3(p[0],p[1]+(structure?0:.002),p[2]),q.setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(...s));
      let surface:FinishSurface|undefined;
      if(finished){
        surface=/bed-cover|bed-pillow|mattress|cushion|upholstered|bolster/.test(name)?'fabric'
          :color===COLOR.wood||color===COLOR.book||/floor-board|wall-panel|joinery/.test(name)?'wood'
          :color===COLOR.brass?'brass':color===COLOR.light?'light':color===COLOR.dark?'metal'
          :shape==='leaf'?'leaf':color===COLOR.blue?'screen':'cream';
        // Instance colours compensate the existing shared material's base
        // colour below. No new material, per-room clone or global recolour.
        if(surface==='wood')color=/floor-board/.test(name)?color:'#49372c';
        if(surface==='cream')color=/partition|ceiling|wall|transom/.test(name)?'#b8b1a3':'#d8cbb9';
        if(surface==='fabric')color=name==='bed-cover'?'#466168':'#ddd2bf';
      }
      pieces.push({name,room:room.name,shape,color,surface,matrix:new THREE.Matrix4().multiplyMatrices(frame,matrix)});
      node.userData.ownedFixtureNames.push(name);
    };
    const box=(name:string,color:string,x:number,y:number,z:number,w:number,h:number,d:number,round=false,yaw=0)=>put(name,round?'round':'box',color,[x,y,z],[w,h,d],[0,yaw,0]);
    const cyl=(name:string,color:string,x:number,y:number,z:number,r:number,h:number)=>put(name,'cylinder',color,[x,y,z],[r*2,h,r*2]);
    const plant=(name:string,x:number,z:number)=>{
      cyl(`${name}-pot`,COLOR.brass,x,.020,z,.017,.04);
      for(let i=0;i<6;i++)put(`${name}-leaf-${i}`,'leaf',i%2?COLOR.green:'#718f56',[x+Math.sin(i*2.4)*.011,.055+(i%3)*.018,z+Math.cos(i*2.4)*.01],[.027,.06,.023],[0,i*2.4,(i-2.5)*.16]);
    };
    const seat=(name:string,x:number,z:number,yaw=0,lift=0)=>{
      const place=(suffix:string,color:string,dx:number,dy:number,dz:number,w:number,h:number,d:number,round=false)=>{
        box(`${name}-${suffix}`,color,x+dx*Math.cos(yaw)+dz*Math.sin(yaw),lift+dy,z-dx*Math.sin(yaw)+dz*Math.cos(yaw),w,h,d,round,yaw);
      };
      place('base',COLOR.wood,0,.018,0,.036,.036,.039);
      place('cushion',COLOR.cream,0,.038,0,.048,.012,.047,true);
      place('back',COLOR.cream,0,.063,-.022,.048,.05,.011,true);
      for(const side of [-1,1])place(`arm-${side}`,COLOR.wood,side*.027,.049,0,.006,.007,.039,true);
    };
    const table=(name:string,x:number,z:number,w=.085,d=.085)=>{
      cyl(`${name}-pedestal`,COLOR.brass,x,.025,z,.012,.05);
      box(`${name}-top`,COLOR.wood,x,.054,z,w,.008,d,true);
      box(`${name}-inlay`,COLOR.blue,x,.0585,z,w*.62,.001,d*.55,true);
    };
    const shelf=(name:string,x:number,z:number,w:number)=>{
      box(`${name}-back`,COLOR.wood,x,.085,z,w,.17,.022);
      for(let row=0;row<4;row++){
        box(`${name}-shelf-${row}`,COLOR.brass,x,.017+row*.043,z-.012,w,.004,.042);
        for(let book=0;book<Math.floor(w/.016)-1;book++)box(`${name}-book-${row}-${book}`,book%3===0?COLOR.cream:COLOR.book,x-w*.5+.014+book*.016,.035+row*.043,z-.018,.009,.028+(book%2)*.006,.024);
      }
    };
    const w=room.width,d=room.depth;
    // Every bay has an actual floor/ceiling and aligned doorway. Infill extends
    // only to the existing side pressure glass, not to unsupported backlights.
    box('supported-floor',COLOR.wood,0,-.003,d/2,w,.01,d);
    box('ceiling',COLOR.cream,0,.217,d/2,w,.006,d);
    for(const side of [-1,1])box(`partition-${side}`,COLOR.cream,side*(w/2-.004),.108,d/2,.008,.216,d);
    box('back-wall',COLOR.wood,0,.108,d-.004,w,.216,.008);
    for(const side of [-1,1]){
      box(`door-jamb-${side}`,COLOR.brass,side*.060,.0825,.004,.008,.165,.015);
      box(`front-wall-${side}`,COLOR.cream,side*(.064+(w/2-.064)/2),.108,.004,w/2-.064,.216,.008);
    }
    box('door-header',COLOR.brass,0,.170,.004,.128,.009,.015);
    box('door-transom',COLOR.cream,0,.195,.004,.128,.034,.008);
    box('ceiling-cove',COLOR.light,0,.210,d-.034,w-.03,.003,.008);
    box('room-sign',COLOR.blue,.085,.14,-.005,.031,.022,.002);
    if(room.program!=='lift-lobby')plant('entry-planter',['medical','cinema'].includes(room.program)?w/2-.027:-w/2+.027,.067);
    for(const [index,chase] of (room.chases??[]).entries()){
      // A real lining around the reserved structure. Lift alcoves retain their
      // existing glazed face; a thin boundary frame declares the interface.
      if(chase.purpose.includes('lift')){
        const innerX=chase.minX<0?chase.maxX:chase.minX;
        box(`structural-service-chase-lift-edge-${index}`,COLOR.brass,innerX,.108,(chase.minZ+chase.maxZ)/2,.005,.216,chase.maxZ-chase.minZ);
      } else box(`structural-service-chase-${index}`,COLOR.wood,(chase.minX+chase.maxX)/2,.108,(chase.minZ+chase.maxZ)/2,chase.maxX-chase.minX,.216,chase.maxZ-chase.minZ);
    }
    if(room.program==='apartment'){
      const bedLength=d<.27?.155:.173,bedZ=d-(d<.27?.090:.103);
      box('bed-plinth',COLOR.wood,-.060,.017,bedZ,.084,.034,bedLength,true);
      box('bed-mattress',COLOR.cream,-.060,.041,bedZ,.080,.014,bedLength-.007,true);
      box('bed-cover',COLOR.blue,-.060,.050,bedZ-.028,.081,.004,.089,true);
      box('bed-pillow',COLOR.cream,-.060,.054,d-.040,.057,.012,.030,true);
      box('headboard',COLOR.wood,-.060,.066,d-.016,.090,.105,.01,true);
      const wardrobeZ=d<.35?.050:.11;
      box('wardrobe',COLOR.wood,w/2-.031,.092,wardrobeZ,.041,.184,.08,true);
      box('wardrobe-handle',COLOR.brass,w/2-.054,.093,wardrobeZ,.004,.032,.004);
      table('writing-desk',w/2-.044,d-.056,.06,.07);seat('desk-chair',w/2-.044,d-.132);
      if(finished){
        // Representative meso pass: genuine thin surfaces inside the accepted
        // envelope, not a new room volume or furniture footprint.
        const boardWidth=(w-.018)/8;
        for(let i=0;i<8;i++)box(`floor-board-${i}`,i%3===0?'#554235':i%3===1?'#46352b':'#4e3d31',
          -w/2+.009+boardWidth*(i+.5),.00045,d/2,boardWidth-.0008,.0009,d-.018);
        for(const side of [-1,1]){
          box(`wall-panel-${side}`,COLOR.wood,side*(w/2-.0087),.046,d/2,.001,.088,d-.019);
          box(`wall-panel-cap-${side}`,COLOR.brass,side*(w/2-.0087),.091,d/2,.001,.002,d-.019);
          box(`ceiling-trim-${side}`,COLOR.wood,side*(w/2-.014),.204,d/2,.011,.009,d-.018);
        }
        box('headboard-upholstered-panel',COLOR.cream,-.060,.077,d-.023,.083,.054,.004,true);
        for(const side of [-1,1])box(`headboard-panel-piping-${side}`,COLOR.brass,-.060+side*.040,.077,d-.0255,.0015,.051,.001);
        box('wardrobe-joinery-upper',COLOR.wood,w/2-.0525,.137,wardrobeZ,.0015,.071,.072);
        box('wardrobe-joinery-lower',COLOR.wood,w/2-.0525,.052,wardrobeZ,.0015,.083,.072);
        box('wardrobe-joinery-divider',COLOR.brass,w/2-.0535,.095,wardrobeZ,.001,.0015,.072);
        box('reading-lamp-mount',COLOR.brass,-.060,.132,d-.010,.027,.010,.005,true);
        box('reading-lamp-bracket',COLOR.brass,-.060,.132,d-.022,.003,.003,.025);
        box('reading-lamp-shade',COLOR.dark,-.060,.131,d-.037,.034,.010,.013,true);
        box('reading-lamp-diffuser',COLOR.light,-.060,.126,d-.037,.028,.001,.010);
        box('desk-writing-pad',COLOR.dark,w/2-.044,.060,d-.056,.044,.001,.045,true);
        box('desk-notebook',COLOR.cream,w/2-.044,.062,d-.052,.027,.003,.034);
        box('desk-notebook-spine',COLOR.brass,w/2-.056,.063,d-.052,.002,.002,.032);
        box('bed-throw-edge',COLOR.cream,-.060,.053,bedZ-.068,.076,.0015,.004);
        node.userData.finishStudy={stage:'representative-meso-and-material',productionApproved:false,authority:'13-inhabited-room-pov-authority-v1'};
      }
    } else if(room.program==='tea-market') {
      box('tea-service-counter',COLOR.wood,0,.038,d-.055,w-.045,.076,.080,true);
      box('tea-countertop',COLOR.cream,0,.080,d-.055,w-.035,.008,.088,true);
      for(let i=0;i<5;i++)cyl(`tea-canister-${i}`,COLOR.brass,-.1+i*.05,.097,d-.054,.012,.027);
      for(const x of [-w*.27,w*.27]){table(`tea-table-${x}`,x,.185);seat(`tea-seat-${x}-a`,x-.060,.185,Math.PI/2);seat(`tea-seat-${x}-b`,x+.060,.185,-Math.PI/2);}
    } else if(room.program==='community') {
      for(const side of [-1,1]){
        box(`family-sofa-plinth-${side}`,COLOR.wood,side*(w/2-.055),.009,.255,.078,.018,.20,true);
        box(`family-sofa-${side}`,COLOR.cream,side*(w/2-.055),.039,.255,.085,.05,.21,true);
        box(`sofa-back-${side}`,COLOR.cream,side*(w/2-.018),.073,.255,.019,.060,.21,true);
      }
      table('community-game-table',0,.245,.13,.12);
      for(let i=0;i<9;i++)box(`game-piece-${i}`,i%2?COLOR.blue:COLOR.brass,(i%3-1)*.026,.064,.245+(Math.floor(i/3)-1)*.025,.012,.012,.012,true);
      shelf('toy-and-community-storage',0,d-.026,w*.6);
    } else if(room.program==='cinema') {
      // Family 2: the fixed lift shaft is behind the audience, not between
      // the back row and a rear-wall screen. Side-wall projection changes the
      // room's circulation/visibility topology; no frozen shaft is masked.
      box('cinema-screen-frame',COLOR.dark,-.254,.125,.243,.012,.133,.372,true);
      box('cinema-screen',COLOR.blue,-.247,.125,.243,.002,.112,.350);
      for(let row=0;row<2;row++)for(let column=0;column<2;column++){
        const x=row===0?-.090:.060,z=(row===0?[.150,.355]:[.115,.390])[column],lift=row===1?.022:0;
        if(lift)box(`seating-riser-${column}`,COLOR.wood,x,lift/2,z,.085,lift,.066);
        seat(`cinema-${row}-${column}`,x,z,-Math.PI/2,lift);
      }
      for(const side of [-1,1])box(`cinema-speaker-${side}`,COLOR.dark,-.244,.11,.243+side*.193,.022,.09,.026,true);
      node.userData.cinemaLayout={family:2,projection:'negative-X-side-wall',chairYaw:-Math.PI/2,productionApproved:false};
    } else if(room.program==='library') {
      shelf('reference-library',0,d-.025,w-.04);
      for(const x of [-.075,.175]){table(`reading-desk-${x}`,x,.23,.09,.10);seat(`reading-chair-${x}`,x,.14);box(`open-book-${x}`,COLOR.cream,x,.061,.23,.046,.003,.027);}
    } else if(room.program==='gym') {
      for(const x of [-.180,.055]){
        box(`treadmill-base-${x}`,COLOR.dark,x,.012,.265,.095,.024,.195,true);
        box(`treadmill-belt-${x}`,COLOR.blue,x,.025,.265,.070,.002,.160);
        for(const side of [-1,1])box(`treadmill-rail-${x}-${side}`,COLOR.brass,x+side*.045,.065,.31,.005,.10,.005);
        box(`treadmill-console-${x}`,COLOR.blue,x,.114,.31,.085,.009,.037,true);
      }
      box('stretch-mat',COLOR.green,-.06,.002,.20,.075,.004,.14,true);
      for(let i=0;i<4;i++){cyl(`weight-${i}`,COLOR.dark,-.075+i*.05,.016,d-.032,.016,.032);}
    } else if(room.program==='medical') {
      // The port power-tower footing is frozen structure, not removable room
      // furniture. Its complete occupied envelope is reserved behind a service
      // wall; beds and clinical equipment must remain on the habitable side.
      node.userData.reservedVolume={min:[-.270,0,.008],max:[-.125,.214,.452],purpose:'frozen power-tower service chase'};
      for(const side of [-1,1]){
        const x=side<0?-.055:.180;
        box(`care-bed-base-${side}`,COLOR.wood,x,.022,.275,.085,.044,.173,true);
        box(`care-mattress-${side}`,COLOR.cream,x,.052,.275,.081,.018,.163,true);
        box(`care-pillow-${side}`,COLOR.cream,x,.066,.335,.06,.010,.033,true);
        box(`care-monitor-${side}`,COLOR.blue,x,.12,d-.018,.06,.045,.008,true);
      }
      box('privacy-divider',COLOR.cream,.0675,.090,.285,.008,.18,.17);
      box('clinical-worktop',COLOR.cream,.175,.061,.107,.065,.012,.07,true);
    } else if(room.program==='lift-lobby') {
      const side=room.chases![0].minX<0?-1:1;
      box('lift-call-panel',COLOR.blue,side*.085,.123,.139,.027,.030,.004,true);
      box('lift-threshold',COLOR.brass,side*.071,.003,.144,.102,.006,.012);
      box('waiting-bench-base',COLOR.wood,-side*.100,.019,.260,.033,.038,.115,true);
      box('waiting-bench-cushion',COLOR.cream,-side*.100,.043,.260,.035,.010,.115,true);
    } else {
      box('restaurant-kitchen',COLOR.wood,0,.042,d-.038,w-.04,.084,.06,true);
      box('kitchen-worktop',COLOR.cream,0,.087,d-.041,w-.031,.006,.065,true);
      for(let i=0;i<3;i++)cyl(`kitchen-vessel-${i}`,COLOR.brass,-.10+i*.10,.104,d-.038,.014,.03);
      for(const x of [-.10,.10]){
        table(`dining-table-${x}`,x,.133,.085,.065);
        seat(`dining-seat-${x}-a`,x,.064);seat(`dining-seat-${x}-b`,x,.202,Math.PI);
        cyl(`table-lantern-${x}`,COLOR.light,x,.068,.133,.007,.018);
      }
    }
  }
  const leaf=new THREE.BufferGeometry();
  leaf.setAttribute('position',new THREE.Float32BufferAttribute([0,-.5,0,-.5,0,0,0,0,.13,.5,0,0,0,.5,0],3));
  leaf.setIndex([0,1,2,0,2,3,1,4,2,2,4,3,2,1,0,3,2,0,2,4,1,3,4,2]);leaf.computeVertexNormals();
  const geometries:Record<Shape,THREE.BufferGeometry>={box:new THREE.BoxGeometry(1,1,1),round:quality==='high'?new RoundedBoxGeometry(1,1,1,1,.10):new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(.5,.5,1,quality==='high'?10:6),leaf};
  const finishGeometries:Partial<Record<Shape,THREE.BufferGeometry>>={};
  for(const shape of Object.keys(geometries) as Shape[]){
    if(finishStudy){
      geometries[shape].setAttribute('roomFinishWeight',new THREE.Float32BufferAttribute(new Float32Array(geometries[shape].attributes.position.count),1));
      if(pieces.some(p=>p.shape===shape&&p.surface)){
        const geometry=geometries[shape].clone();geometry.setAttribute('roomFinishWeight',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count).fill(1),1));
        finishGeometries[shape]=geometry;
      }
    }
    const surfaces=[...new Set(pieces.filter(p=>p.shape===shape).map(p=>p.surface))];
    for(const surface of surfaces){
    const selected=pieces.filter(p=>p.shape===shape&&p.surface===surface);
    const sharedMaterial=surface?finishStudy!.materials[surface]:material;
    const mesh=new THREE.InstancedMesh(surface?finishGeometries[shape]!:geometries[shape],sharedMaterial,selected.length);
    mesh.name=`ROOM_FIXTURE_INSTANCES_${shape}${surface?'_'+surface:''}`;
    selected.forEach((piece,i)=>{
      mesh.setMatrixAt(i,piece.matrix);const color=new THREE.Color(piece.color);
      const base=(sharedMaterial as THREE.MeshStandardMaterial).color;
      if(surface&&base){color.r/=Math.max(base.r,.0001);color.g/=Math.max(base.g,.0001);color.b/=Math.max(base.b,.0001);}
      mesh.setColorAt(i,color);
    });
    mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.userData={logicalParts:selected.map(({name,room},instanceIndex)=>({name,room,instanceIndex})),finishSurface:surface,productionApproved:false};
    root.add(mesh);
    }
  }
  root.userData={rooms:rooms.filter(room=>room.program!=='service').length,serviceBays:rooms.filter(room=>room.program==='service').length,fixtures:pieces.length,programs:[...new Set(rooms.map(r=>r.program))],productionApproved:false};
  return root;
}
