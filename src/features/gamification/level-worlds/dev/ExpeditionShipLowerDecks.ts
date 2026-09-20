import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Lower-deck engineering prototype. No replacement ship or camera-dependent geometry. */
export const LOWER_DECK_CLEARANCE={workshopRoof:-.302,workshopFloor:-.808,creatureFloor:-.3635,shaftRadius:.405,shaftZ:-.12/.84} as const;

export function makeLowerDeckPlate(width:number,depth:number,thickness:number,shaftZ:number){
  const shape=new THREE.Shape();
  shape.moveTo(-width/2,-depth/2);shape.lineTo(width/2,-depth/2);shape.lineTo(width/2,depth/2);shape.lineTo(-width/2,depth/2);shape.closePath();
  const hole=new THREE.Path();hole.absarc(0,shaftZ,LOWER_DECK_CLEARANCE.shaftRadius,0,Math.PI*2,true);shape.holes.push(hole);
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:12,steps:1});
  geometry.rotateX(Math.PI/2);return geometry;
}

/** Coalesce identical material groups, retaining actual triangles and source ownership. */
export function consolidateLowerDeckMesh(mesh:THREE.Mesh){
  if(!Array.isArray(mesh.material))return;
  const source=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry;
  const palette=[...new Set(mesh.material)];const data:Record<string,number[]>={};
  for(const name of Object.keys(source.attributes))data[name]=[];
  const groups:Array<{start:number;count:number;materialIndex:number}>=[];
  let cursor=0;
  palette.forEach((material,materialIndex)=>{
    const start=cursor;
    for(const group of source.groups){
      if((mesh.material as THREE.Material[])[group.materialIndex??0]!==material)continue;
      for(let j=group.start;j<group.start+group.count;j+=3){
        const p=source.getAttribute('position');
        const a=new THREE.Vector3().fromBufferAttribute(p,j),b=new THREE.Vector3().fromBufferAttribute(p,j+1),c=new THREE.Vector3().fromBufferAttribute(p,j+2);
        if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-18)continue;
        for(let v=j;v<j+3;v++)for(const [name,attribute] of Object.entries(source.attributes))
          for(let k=0;k<attribute.itemSize;k++)data[name].push(attribute.array[v*attribute.itemSize+k]);
        cursor+=3;
      }
    }
    if(cursor>start)groups.push({start,count:cursor-start,materialIndex});
  });
  const next=new THREE.BufferGeometry();
  for(const [name,values] of Object.entries(data))next.setAttribute(name,new THREE.Float32BufferAttribute(values,source.getAttribute(name).itemSize));
  for(const group of groups)next.addGroup(group.start,group.count,group.materialIndex);
  next.userData={...mesh.geometry.userData};mesh.geometry.dispose();if(source!==mesh.geometry)source.dispose();
  mesh.geometry=next;mesh.material=palette;
}

/** Retired family-1 experiment. Never used by the active model constructor. */
export function capWorkshopRearInterface(mesh:THREE.Mesh){
  const position=mesh.geometry.getAttribute('position');
  for(let i=0;i<position.count;i++){
    const z=position.getZ(i),y=position.getY(i);
    // Entire overlapping rear ceiling stays below the real separator slab.
    // The forward pressure window is outside Deck01 and keeps its taller arch.
    const blend=THREE.MathUtils.smoothstep(z,.235,.52);
    if(y>LOWER_DECK_CLEARANCE.workshopRoof)position.setY(i,THREE.MathUtils.lerp(LOWER_DECK_CLEARANCE.workshopRoof,y,blend));
  }
  position.needsUpdate=true;mesh.geometry.computeVertexNormals();consolidateLowerDeckMesh(mesh);
  mesh.userData.lowerDeckInterface={rearMaxY:LOWER_DECK_CLEARANCE.workshopRoof,transitionZ:[.235,.52],notVisibilityMask:true};
}

type HabitatPalette={wood:THREE.Material;cream:THREE.Material;metal:THREE.Material;water:THREE.Material;green:THREE.Material;light:THREE.Material;glass:THREE.Material};
type WorkshopPalette={surface:THREE.Material;frame:THREE.Material;metal:THREE.Material;light:THREE.Material;screen:THREE.Material;glass:THREE.Material};
export function makeConstructiveWorkshopParts(p:WorkshopPalette,hollow=false,high=true){
  const parts:Array<{geometry:THREE.BufferGeometry;material:THREE.Material;name:string}>=[];
  const add=(name:string,g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0)=>{g.translate(x,y,z);parts.push({name,geometry:g,material:m});};
  add('occupied-floor-with-service-aperture',makeLowerDeckPlate(3.48,2,hollow?.006:.12,-.12/.84-.34+.05),p.surface,0,-.808,-.05);
  if(hollow){
    for(const side of [-1,1])add(`underfloor-perimeter-girder-${side}`,new THREE.BoxGeometry(.06,.108,2),p.frame,side*1.65,-.868,-.05);
    add('underfloor-rear-girder',new THREE.BoxGeometry(3.24,.108,.04),p.frame,0,-.868,-1.02);
  }
  // Construct a continuous perforated slab below the upper floor.
  // Unlike clamping old fittings, no two surfaces collapse onto one plane.
  const roof=makeLowerDeckPlate(3.18,1.92,.014,-.12/.84-.34+.02),rp=roof.getAttribute('position');
  for(let i=0;i<rp.count;i++){const z=rp.getZ(i)-.02;rp.setXYZ(i,rp.getX(i),rp.getY(i)-.310,z);}
  roof.computeVertexNormals();add('continuous-separated-roof',roof,p.surface);
  add('rear-pressure-liner',new THREE.BoxGeometry(3.18,hollow?.489:.476,.035),p.frame,0,hollow?-.5665:-.563,-.9475);
  for(const side of [-1,1]){
    add(`side-pressure-sill-${side}`,new THREE.BoxGeometry(.04,.12,1.88),p.frame,side*1.57,-.748,-.02);
    const glass=new THREE.BoxGeometry(.018,.43,1.88,1,1,12),gp=glass.getAttribute('position');
    for(let i=0;i<gp.count;i++){const z=gp.getZ(i)-.02;const bottom=-.688;const top=-.324;gp.setY(i,THREE.MathUtils.lerp(bottom,top,(gp.getY(i)+.215)/.43));gp.setZ(i,z);}
    glass.computeVertexNormals();add(`side-pressure-window-${side}`,glass,p.glass,side*1.575);
    add(`rear-light-cove-${side}`,new THREE.BoxGeometry(.012,.008,1.1),p.light,side*1.50,-.331,-.35);
    add(`bay-guidance-${side}`,new THREE.BoxGeometry(.006,.004,.64),p.metal,side*.80,-.806,.34);
    for(const edge of [-1,1])add(`service-bay-edge-${side}-${edge}`,new THREE.BoxGeometry(.008,.005,.62),p.metal,side*.80+edge*.31,-.8055,.32);
  }
  if(!hollow){
    const front=new THREE.PlaneGeometry(3.12,.481,24,1),fp=front.getAttribute('position');
    for(let i=0;i<fp.count;i++)fp.setZ(i,.94+.055*(1-(fp.getX(i)/1.56)**2));
    front.computeVertexNormals();add('bowed-panoramic-pressure-window',front,p.glass,0,-.5645);
  }
  if(hollow){
    // The straight rear edge seats into floor/roof; the forward edge follows
    // the single bowed pane. These are pressure joints, not a second window.
    const rail=(height:number)=>{
      const g=new THREE.BoxGeometry(3.18,height,1,high?24:12,1,1),vertices=g.getAttribute('position');
      for(let i=0;i<vertices.count;i++){
        const x=THREE.MathUtils.clamp(vertices.getX(i),-1.56,1.56);
        vertices.setZ(i,vertices.getZ(i)<0?.90:.94+.055*(1-(x/1.56)**2)+.010);
      }
      g.computeVertexNormals();return g;
    };
    add('front-pressure-sill',rail(.025),p.metal,0,-.7955,0);
    add('front-pressure-header',rail(.020),p.metal,0,-.320,0);
    for(const side of [-1,1])add(`front-pressure-side-seat-${side}`,new THREE.BoxGeometry(.030,.496,.050),p.metal,side*1.565,-.56,.935);
  }else{
    add('front-pressure-sill',new THREE.BoxGeometry(3.18,.025,.05),p.metal,0,-.7955,.955);
    add('front-pressure-header',new THREE.BoxGeometry(3.18,.014,.07),p.metal,0,-.317,.955);
  }
  // Port equipment island does not occupy the central keel/service shaft.
  add('port-service-turntable',new THREE.CylinderGeometry(.28,.28,.020,32),p.frame,-.80,-.798,.25);
  const ring=new THREE.TorusGeometry(.275,.006,5,32);ring.rotateX(Math.PI/2);add('turntable-safety-ring',ring,p.metal,-.80,-.784,.25);
  for(const x of [-.96,-.64])add(`engine-cradle-${x}`,new THREE.BoxGeometry(.045,.042,.16),p.frame,x,-.767,.25);
  const engine=new THREE.CylinderGeometry(.052,.06,.36,16);engine.rotateZ(Math.PI/2);add('service-engine',engine,p.metal,-.80,-.694,.25);
  for(const x of [-.98,-.62]){const flange=new THREE.TorusGeometry(.06,.009,5,16);flange.rotateY(Math.PI/2);add(`engine-flange-${x}`,flange,p.frame,x,-.694,.25);}
  // Two supported articulated tool stands service that island, leaving the
  // forward cross-aisle and starboard vehicle bay unobstructed.
  for(const side of [-1,1]){
    const x=-.80+side*.28;
    add(`tool-stand-base-${side}`,new THREE.CylinderGeometry(.055,.06,.018,12),p.frame,x,-.799,.15);
    add(`tool-stand-${side}`,new THREE.CylinderGeometry(.014,.022,.14,8),p.metal,x,-.72,.15);
    add(`tool-cross-link-${side}`,new THREE.BoxGeometry(.115,.016,.025),p.frame,x-side*.05,-.65,.15);
    add(`tool-head-${side}`,new THREE.BoxGeometry(.025,.035,.035),p.metal,x-side*.103,-.659,.15);
  }
  for(const x of [.53,1.07])for(const z of [.04,.56])add(`vehicle-clamp-${x}-${z}`,new THREE.BoxGeometry(.08,.018,.045),p.frame,x,-.799,z);
  const guard=new THREE.TorusGeometry(.425,.009,5,32);guard.rotateX(Math.PI/2);add('keel-shaft-guard',guard,p.metal,0,-.686,-.12/.84-.34);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;add(`keel-guard-post-${i}`,new THREE.CylinderGeometry(.006,.006,.122,5),p.metal,Math.cos(a)*.425,-.747,-.12/.84-.34+Math.sin(a)*.425);}
  return parts;
}

export function rebuildCreatureMacro(landscape:THREE.Mesh,pods:THREE.InstancedMesh,palette:HabitatPalette,hollow=false){
  const parts:Array<{geometry:THREE.BufferGeometry;material:THREE.Material;name:string}>=[];
  const add=(name:string,geometry:THREE.BufferGeometry,material:THREE.Material,x=0,y=0,z=0)=>{geometry.translate(x,y,z);parts.push({name,geometry,material});};
  // The shaft is real, persistent load/service infrastructure. Floor and roof
  // have matching physical apertures; the habitat circulates around it.
  add('shaft-perforated-floor',makeLowerDeckPlate(3.18,1.55,.006,LOWER_DECK_CLEARANCE.shaftZ+.2),palette.wood,0,-.3635,-.2);
  add('shaft-perforated-ceiling',makeLowerDeckPlate(3.18,1.55,.035,LOWER_DECK_CLEARANCE.shaftZ+.2),palette.cream,0,.02,-.2);
  const guard=new THREE.TorusGeometry(.425,.012,5,32);guard.rotateX(Math.PI/2);add('service-core-guard',guard,palette.metal,0,-.26,LOWER_DECK_CLEARANCE.shaftZ);
  for(let i=0;i<12;i++){const angle=i*Math.PI/6;add(`guard-post-${i}`,new THREE.CylinderGeometry(.006,.006,.122,5),palette.metal,Math.cos(angle)*.425,-.321,LOWER_DECK_CLEARANCE.shaftZ+Math.sin(angle)*.425);}
  for(const side of [-1,1]){
    add(`side-liner-${side}`,new THREE.BoxGeometry(.025,.40,1.55),palette.cream,side*1.5775,-.1825,-.2);
    add(`side-cove-${side}`,new THREE.BoxGeometry(.014,.008,1.48),palette.light,side*1.548,-.005,-.2);
    add(`rear-resting-plinth-${side}`,new THREE.BoxGeometry(.68,.045,.20),palette.wood,side*.85,-.36,-.83);
  }
  add('rear-sill',new THREE.BoxGeometry(3.10,.055,.035),palette.wood,0,-.355,-.9475);
  add('rear-pressure-glass',new THREE.BoxGeometry(3.10,.40,.015),palette.glass,0,-.1825,-.956);
  for(const side of [-1,1])add(`front-pressure-glass-${side}`,new THREE.BoxGeometry(1.46,.40,.015),palette.glass,side*.82,-.1825,.56);
  // A modest side bathing basin, not a second central atrium. Its shallow
  // exposed surface stays below the dry path and outside the shaft reserve.
  const bathX=hollow?-.75:-.86;
  const basin=new THREE.CylinderGeometry(.23,.24,.018,24);basin.scale(1,1,1.50);add('side-bathing-basin',basin,palette.water,bathX,-.377,-.22);
  const rim=new THREE.TorusGeometry(.244,.014,5,28,hollow?Math.PI*1.75:Math.PI*2);if(hollow)rim.rotateZ(THREE.MathUtils.degToRad(65));rim.rotateX(Math.PI/2);rim.scale(1,1,1.5);add('basin-rim',rim,palette.wood,bathX,-.372,-.22);
  if(hollow){
    const ramp=new THREE.BoxGeometry(.15,.02,.10),p=ramp.getAttribute('position');
    for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)>0?THREE.MathUtils.lerp(-.347,-.3635,(p.getX(i)+.075)/.15):-.366);
    ramp.rotateY(-Math.PI/4);ramp.translate(0,-.019,0);ramp.computeVertexNormals();add('low-water-entry',ramp,palette.wood,-.505,0,.1225);
  }else add('low-water-entry',new THREE.BoxGeometry(.13,.015,.15),palette.wood,-.65,-.373,.08);
  for(const [i,z] of [-.62,-.05,.38].entries())for(const side of [-1,1]){
    add(`nest-plinth-${side}-${i}`,new THREE.CylinderGeometry(.17,.175,.045,16),palette.wood,side*1.22,-.36,z);
  }
  add('perch-upright',new THREE.CylinderGeometry(.018,.028,.30,8),palette.wood,1.32,-.2325,-.40);
  for(const [i,y] of [-.23,-.12].entries())add(`perch-${i}`,new THREE.CylinderGeometry(.105,.108,.018,12),palette.wood,1.30,y,-.40);
  // All finishing and botanical detail remains behind the macro gate.
  const mat=parts.map(p=>p.material),geometries=parts.map(p=>p.geometry.index?p.geometry.toNonIndexed():p.geometry);
  // Shift supported furniture off the corrected finish datum. The ceiling
  // and pressure walls stay fixed; this is construction, never pose scaling.
  const stationary=new Set(['shaft-perforated-floor','shaft-perforated-ceiling','side-liner--1','side-liner-1','side-cove--1','side-cove-1','rear-pressure-glass','front-pressure-glass--1','front-pressure-glass-1']);
  parts.forEach((part,i)=>{if(!stationary.has(part.name))geometries[i].translate(0,.019,0);});
  const combined=mergeGeometries(geometries,true)!;landscape.geometry.dispose();landscape.geometry=combined;landscape.material=mat;
  parts.forEach(p=>p.geometry.dispose());geometries.forEach((g,i)=>{if(g!==parts[i].geometry)g.dispose();});
  landscape.userData.componentNames=parts.map(p=>p.name);landscape.userData.lowerDeckMacro={family:hollow?1:2,route:hollow?'authorized-hollow-housing':'retired-lower-deck-family2',productionApproved:false,shaftReserve:LOWER_DECK_CLEARANCE.shaftRadius};
  consolidateLowerDeckMesh(landscape);
  const locations=[[-1.22,-.62],[-1.22,-.05],[-1.22,.38],[1.22,-.62],[1.22,-.05],[1.22,.38],[-.85,-.83],[.85,-.83]];
  const matrix=new THREE.Matrix4();pods.count=locations.length;
  locations.forEach(([x,z],i)=>{matrix.compose(new THREE.Vector3(x,-.302,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),i<6?(x<0?Math.PI/2:-Math.PI/2):0),new THREE.Vector3(.85,.85,.85));pods.setMatrixAt(i,matrix);});
  pods.instanceMatrix.needsUpdate=true;pods.userData.program={...pods.userData.program,pods:pods.count,shaftReserve:LOWER_DECK_CLEARANCE.shaftRadius};
  consolidateLowerDeckMesh(pods);
}

/** One persistent pressure pane at the actual workshop boundary, not in front
 * of a duplicate opaque garage door. Geometry is in stabilized-hull units. */
export function makeHollowGarageWindow(){
  const geometry=new THREE.BoxGeometry(3.12,.481,.010,24,1,1),p=geometry.getAttribute('position');
  for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+.94+.055*(1-(p.getX(i)/1.56)**2));
  geometry.translate(0,-.5645,0);geometry.computeVertexNormals();geometry.scale(.84,.84,.84);geometry.translate(0,-.68*.84,.34*.84);return geometry;
}

export function makeHollowGarageSkirt(){
  const parts:THREE.BufferGeometry[]=[];
  for(const side of [-1,1]){
    const g=new THREE.BoxGeometry(.06,.018,1.42);g.translate(side*1,-1.360,.24);parts.push(g);
    const rear=new THREE.BoxGeometry(.38,.018,.06);rear.translate(side*.78,-1.360,-.44);parts.push(rear);
  }
  const front=new THREE.BoxGeometry(1.94,.018,.06);front.translate(0,-1.360,.92);parts.push(front);
  const result=mergeGeometries(parts,false)!;parts.forEach(g=>g.dispose());
  result.userData={structuralAssembly:{closedMembers:5,singleManifoldUnion:false,pressureBoundary:false,rearServiceOpening:[-.59,.59]}};
  return result;
}
