import * as THREE from 'three';
import type {ShipRoomDefinition} from './ExpeditionShipRoomKit';

/** Real triangle subtraction at the non-structural planted-floor interface.
 * New room floors close the cut; no frozen hull, brace, lift or tower is cut.
 * Attributes and material ownership interpolate with the split triangles.
 */
export function reconcileRoomLandscapeInterfaces(root:THREE.Group,rooms:ShipRoomDefinition[]){
  const landscape=root.getObjectByName('CREATURE_GREEN_BATHING_STREAM_AND_COVE') as THREE.Mesh;
  if(!landscape)return;
  root.updateMatrixWorld(true);
  const inverse=landscape.matrixWorld.clone().invert();
  const boxes=rooms.filter(room=>room.slots[0]<14&&room.program!=='service').map(room=>{
    const node=root.getObjectByName(room.name)!;
    const transform=new THREE.Matrix4().multiplyMatrices(inverse,node.matrixWorld);
    return new THREE.Box3().setFromPoints([-1,1].flatMap(x=>[.001,.222].flatMap(y=>[-.08,room.depth].map(z=>new THREE.Vector3(x*room.width/2,y,z).applyMatrix4(transform)))));
  });
  const source=landscape.geometry;
  const names=Object.keys(source.attributes),sizes=names.map(name=>source.attributes[name].itemSize);
  const positionOffset=sizes.slice(0,names.indexOf('position')).reduce((a,b)=>a+b,0);
  const count=source.index?.count??source.attributes.position.count;
  const output:number[][]=names.map(()=>[]);const geometry=new THREE.BufferGeometry();
  type Vertex=number[];
  const read=(index:number):Vertex=>names.flatMap(name=>{
    const a=source.attributes[name];return Array.from({length:a.itemSize},(_,j)=>a.array[index*a.itemSize+j]);
  });
  const split=(polygon:Vertex[],axis:number,value:number,sign:number)=>{
    const inside:Vertex[]=[],outside:Vertex[]=[];
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i],b=polygon[(i+1)%polygon.length],da=sign*(a[positionOffset+axis]-value),db=sign*(b[positionOffset+axis]-value);
      (da>=0?inside:outside).push(a);
      if((da>=0)!=(db>=0)){
        const t=da/(da-db),p=a.map((v,j)=>v+t*(b[j]-v));inside.push(p);outside.push(p);
      }
    }
    return {inside,outside};
  };
  const subtract=(polygon:Vertex[],box:THREE.Box3)=>{
    const remains:Vertex[][]=[];let inner=polygon;
    for(const [axis,value,sign] of [[0,box.min.x,1],[0,box.max.x,-1],[1,box.min.y,1],[1,box.max.y,-1],[2,box.min.z,1],[2,box.max.z,-1]]){
      const s=split(inner,axis,value,sign);if(s.outside.length>=3)remains.push(s.outside);inner=s.inside;if(inner.length<3)break;
    }
    return remains;
  };
  let vertices=0,lastMaterial=-1;
  for(let i=0;i<count;i+=3){
    const original=[0,1,2].map(j=>read(source.index?source.index.getX(i+j):i+j));
    let polygons=[original];
    for(const box of boxes)polygons=polygons.flatMap(p=>{
      const bounds=new THREE.Box3().setFromPoints(p.map(v=>new THREE.Vector3(...v.slice(positionOffset,positionOffset+3))));
      return bounds.intersectsBox(box)?subtract(p,box):[p];
    });
    const material=source.groups.find(g=>i>=g.start&&i<g.start+g.count)?.materialIndex??0;
    for(const polygon of polygons)for(let j=1;j<polygon.length-1;j++){
      const points=[polygon[0],polygon[j],polygon[j+1]].map(v=>new THREE.Vector3(...v.slice(positionOffset,positionOffset+3)));
      if(new THREE.Vector3().subVectors(points[1],points[0]).cross(new THREE.Vector3().subVectors(points[2],points[0])).lengthSq()<1e-18)continue;
      if(material!==lastMaterial){geometry.addGroup(vertices,0,material);lastMaterial=material;}
      for(const vertex of [polygon[0],polygon[j],polygon[j+1]]){
        let offset=0;names.forEach((_,a)=>{output[a].push(...vertex.slice(offset,offset+sizes[a]));offset+=sizes[a];});vertices++;
      }
      geometry.groups[geometry.groups.length-1].count+=3;
    }
  }
  names.forEach((name,i)=>geometry.setAttribute(name,new THREE.Float32BufferAttribute(output[i],sizes[i])));
  geometry.normalizeNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData={...source.userData,roomLandscapeInterface:{sourceTriangles:count/3,resultTriangles:vertices/3,roomCuts:boxes.length,method:'CPU polygon subtraction inside non-structural planted floor only'}};
  landscape.geometry=geometry;source.dispose();
}

const LEGACY = new Set(['inhabited-deck-facade','occupied-deck-slab-instances','deck-window-instances',
  'PORT_INHABITED_SHOULDER_POD','STARBOARD_INHABITED_SHOULDER_POD',
  'PORT_SHOULDER_POD_GLAZING','STARBOARD_SHOULDER_POD_GLAZING']);
const LIMITS = {minX:(3.05-.515)*.84,maxX:(3.05+.515)*.84,minY:(1.28-.50)*.84,maxY:(1.28+.77)*.84,minZ:(1-.59)*.84,maxZ:(1+.64)*.84};

/** Subtract the four existing room interiors from overlapping legacy wing
 * facade/deck/glazing surfaces. This is part of the opt-in assembled model,
 * not a camera cut. Original vertices and every exterior surface outside the
 * already-enclosed room interfaces are retained, across all modes/views.
 */
export function installCommandRoomClearance(root:THREE.Group) {
  const hull=root.getObjectByName('STABILIZED_INHABITED_HULL')!;
  const inverse=new THREE.Matrix4(), point=new THREE.Vector3();
  const contains=(p:THREE.Vector3)=>{
    const command=Math.abs(p.x)>LIMITS.minX&&Math.abs(p.x)<LIMITS.maxX
      &&p.y>LIMITS.minY&&p.y<LIMITS.maxY&&Math.abs(p.z)>LIMITS.minZ&&Math.abs(p.z)<LIMITS.maxZ;
    const x=Math.abs(p.x/.84),y=p.y/.84,z=p.z/.84;
    const side=x>1.588&&x<2.032&&Math.abs(z)<.682;
    const rear=x>1.028&&x<1.672&&z> -1.052&&z<-.768;
    let occupiedLevel=false;
    for(let level=0;level<6;level++){const h=y-(-.46+level*.34);if(h>.001&&h<.222)occupiedLevel=true;}
    return command||occupiedLevel&&(side||rear);
  };
  const materials=new Map<THREE.Material,THREE.Material>();
  const signatures=new Map<string,THREE.Material>();
  let depthSource:THREE.MeshDepthMaterial|undefined,distanceSource:THREE.MeshDistanceMaterial|undefined;
  const retired=new Set<THREE.Material>();
  const clippedNames:string[]=[];
  root.traverse(object=>{
    if(!(object instanceof THREE.Mesh)||!LEGACY.has(object.name))return;
    clippedNames.push(object.name);
    const patch=(source:THREE.Material)=>{
      if(materials.has(source))return materials.get(source)!;
      const {uuid:_uuid,metadata:_metadata,name:_name,...serial}=source.toJSON();
      const signature=JSON.stringify(serial);
      retired.add(source);
      const same=signatures.get(signature);
      if(same){materials.set(source,same);return same;}
      const material=source.clone();retired.add(source);
      material.customProgramCacheKey=()=>`command-and-ring-room-interface-v3-${source.type}`;
      material.onBeforeCompile=shader=>{
        shader.uniforms.uCommandHullInverse={value:inverse};
        shader.vertexShader='uniform mat4 uCommandHullInverse; varying vec3 vCommandHullPosition;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
          vec4 commandPosition = vec4(transformed,1.0);
          #ifdef USE_INSTANCING
            commandPosition = instanceMatrix * commandPosition;
          #endif
          vCommandHullPosition = (uCommandHullInverse * modelMatrix * commandPosition).xyz;
          #include <project_vertex>`);
        shader.fragmentShader='varying vec3 vCommandHullPosition;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`
          #include <clipping_planes_fragment>
          if(abs(vCommandHullPosition.x)>${LIMITS.minX.toFixed(6)} && abs(vCommandHullPosition.x)<${LIMITS.maxX.toFixed(6)}
            && vCommandHullPosition.y>${LIMITS.minY.toFixed(6)} && vCommandHullPosition.y<${LIMITS.maxY.toFixed(6)}
            && abs(vCommandHullPosition.z)>${LIMITS.minZ.toFixed(6)} && abs(vCommandHullPosition.z)<${LIMITS.maxZ.toFixed(6)}) discard;
          vec3 roomP = vCommandHullPosition / 0.84;
          bool roomSide = abs(roomP.x)>1.588 && abs(roomP.x)<2.032 && abs(roomP.z)<0.682;
          bool roomRear = abs(roomP.x)>1.028 && abs(roomP.x)<1.672 && roomP.z> -1.052 && roomP.z< -0.768;
          for(int roomLevel=0;roomLevel<6;roomLevel++) {
            float roomH = roomP.y - (-0.46 + float(roomLevel)*0.34);
            if(roomH>0.001 && roomH<0.222 && (roomSide || roomRear)) discard;
          }`);
      };
      materials.set(source,material);signatures.set(signature,material);return material;
    };
    object.material=Array.isArray(object.material)?object.material.map(patch):patch(object.material);
    // The visual void also applies to ray queries; do not leave invisible hits.
    const originalRaycast=object.raycast;
    object.raycast=function(raycaster,hits){
      const candidates:THREE.Intersection[]=[];originalRaycast.call(this,raycaster,candidates);
      candidates.forEach(hit=>{if(!contains(point.copy(hit.point).applyMatrix4(inverse)))hits.push(hit);});
    };
    object.userData.commandRoomInterfaces={...LIMITS,representation:'shader-subtraction-with-matching-raycast',productionApproved:false};
    // Legacy deck shadows must use the same subtraction, not ghost slabs.
    if(object.castShadow){
      depthSource??=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
      distanceSource??=new THREE.MeshDistanceMaterial();
      object.customDepthMaterial=patch(depthSource);
      object.customDistanceMaterial=patch(distanceSource);
    }
  });
  const retained=new Set<THREE.Material>();
  root.traverse(o=>{if(o instanceof THREE.Mesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>retained.add(m));});
  return {
    limits:LIMITS,clippedNames,
    sync:()=>{hull.updateWorldMatrix(true,false);inverse.copy(hull.matrixWorld).invert();},
    dispose:()=>{
      retired.forEach(m=>{if(!retained.has(m))m.dispose();});
      // Main model owns ordinary mesh materials; depth/distance materials are
      // not enumerated there and therefore remain this helper's responsibility.
      const shadows=new Set<THREE.Material>();
      root.traverse(o=>{if(o instanceof THREE.Mesh&&LEGACY.has(o.name)){if(o.customDepthMaterial)shadows.add(o.customDepthMaterial);if(o.customDistanceMaterial)shadows.add(o.customDistanceMaterial);}});
      shadows.forEach(material=>material.dispose());
    },
  };
}
