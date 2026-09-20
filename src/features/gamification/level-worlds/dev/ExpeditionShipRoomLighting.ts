import * as THREE from 'three';

/** Bounded room-local lighting for the finish prototype. The existing large
 * unshadowed sanctuary lights otherwise shine through its opaque partitions.
 * This rejects their rays at the real rectangular enclosure (door excepted),
 * then evaluates two fixture-mounted point sources with Three's existing PBR
 * equations. Furniture contact shadows use explicitly approximate solid-box
 * proxies; this is not a replacement for whole-ship dynamic shadow geometry.
 * All other meshes have roomFinishWeight=0 and keep their original shading. */
export function installExpeditionRoomLighting(root:THREE.Group) {
  const room=root.getObjectByName('ROOM_APARTMENT_005');
  if(!room?.userData.finishStudy)return {sync:()=>{}};
  const width=room.userData.width as number,depth=room.userData.depth as number;
  const worldToRoom=new THREE.Matrix4(),roomToWorld=new THREE.Matrix4();
  const batchToRoom=new THREE.Matrix4().compose(room.position,room.quaternion,room.scale).invert();
  const materials=new Map<THREE.Material,string>();
  const occluders:THREE.Box3[]=[];
  const occludingNames=new Set(['bed-plinth','bed-mattress','wardrobe','desk-chair-base','desk-chair-back','writing-desk-top','headboard','writing-desk-pedestal']);
  root.traverse(object=>{
    if(!(object instanceof THREE.InstancedMesh)||!object.userData.finishSurface)return;
    materials.set(object.material as THREE.Material,object.userData.finishSurface);
    for(const part of object.userData.logicalParts as Array<{name:string;room:string;instanceIndex:number}>){
      if(part.room!==room.name||!occludingNames.has(part.name))continue;
      const matrix=new THREE.Matrix4();object.getMatrixAt(part.instanceIndex,matrix);
      const transform=batchToRoom.clone().multiply(matrix);
      const box=new THREE.Box3().setFromBufferAttribute(object.geometry.attributes.position as THREE.BufferAttribute).applyMatrix4(transform);
      occluders.push(box);
    }
  });
  while(occluders.length<8)occluders.push(new THREE.Box3(new THREE.Vector3(100,100,100),new THREE.Vector3(101,101,101)));
  const sources=[
    {name:'ROOM_005_COVE_EMITTER',position:new THREE.Vector3(0,.202,depth-.045),power:.0018,color:new THREE.Color('#ffd8aa')},
    {name:'ROOM_005_READING_EMITTER',position:new THREE.Vector3(-.060,.124,depth-.037),power:.00055,color:new THREE.Color('#ffe2ba')},
  ];
  for(const source of sources){const anchor=new THREE.Object3D();anchor.name=source.name;anchor.position.copy(source.position);anchor.userData={roomLocalAnalyticPointSource:true,power:source.power,shadowProxy:'eight declared furniture boxes',productionApproved:false};room.add(anchor);}
  const declarations=`
varying float vRoomFinishWeight;
varying vec3 vRoomFinishPosition;
uniform mat4 uFinishedWorldToRoom;
uniform mat4 uFinishedRoomToWorld;
uniform vec3 uFinishedRoomMin;
uniform vec3 uFinishedRoomMax;
uniform vec3 uFinishedOccluderMin[8];
uniform vec3 uFinishedOccluderMax[8];
uniform vec3 uFinishedSourcePosition[2];
uniform vec3 uFinishedSourceColor[2];
uniform float uFinishedSourcePower[2];
vec3 finishViewToRoom(vec3 p){
  vec3 world=(p-viewMatrix[3].xyz)*mat3(viewMatrix);
  return (uFinishedWorldToRoom*vec4(world,1.0)).xyz;
}
vec3 finishSafeDirection(vec3 d){return mix(vec3(0.000001),d,step(vec3(0.000001),abs(d)));}
float finishEnclosureVisibility(vec3 source){
  if(vRoomFinishWeight<0.5)return 1.0;
  vec3 p=vRoomFinishPosition;
  // Exterior faces of the doorway keep their ordinary gallery illumination.
  if(p.z<0.006)return 1.0;
  p=clamp(p,uFinishedRoomMin+vec3(.0005),uFinishedRoomMax-vec3(.0005));
  if(all(greaterThanEqual(source,uFinishedRoomMin))&&all(lessThanEqual(source,uFinishedRoomMax)))return 1.0;
  vec3 d=finishSafeDirection(source-p);
  vec3 exits=max((uFinishedRoomMin-p)/d,(uFinishedRoomMax-p)/d);
  float t=min(exits.x,min(exits.y,exits.z));
  vec3 hit=p+t*d;
  return hit.z<.009&&abs(hit.x)<.056&&hit.y>.002&&hit.y<.165?1.0:0.0;
}
float finishFurnitureVisibility(vec3 source){
  vec3 p=vRoomFinishPosition;
  vec3 d=finishSafeDirection(source-p);
  float visibility=1.0;
  for(int j=0;j<8;j++){
    vec3 a=(uFinishedOccluderMin[j]-p)/d,b=(uFinishedOccluderMax[j]-p)/d;
    vec3 nearT=min(a,b),farT=max(a,b);
    float enter=max(nearT.x,max(nearT.y,nearT.z));
    float leave=min(farT.x,min(farT.y,farT.z));
    // Exclude the receiver's own solid; this is conservative box shadowing.
    if(enter>.003&&enter<.997&&leave>enter)visibility=0.0;
  }
  return visibility;
}
`;
  for(const [material,surface] of materials){
    const original=material.onBeforeCompile;
    const originalKey=material.customProgramCacheKey.bind(material);
    // WebGL's constant default prevents a reused material affecting any mesh
    // outside the explicitly weighted representative geometry.
    Object.assign(material,{defaultAttributeValues:{roomFinishWeight:[0],color:[1,1,1],uv:[0,0],uv1:[0,0]}});
    material.onBeforeCompile=(shader,renderer)=>{
      original.call(material,shader,renderer);
      Object.assign(shader.uniforms,{
        uFinishedWorldToRoom:{value:worldToRoom},uFinishedRoomToWorld:{value:roomToWorld},
        uFinishedRoomMin:{value:new THREE.Vector3(-width/2+.008,.002,.008)},
        uFinishedRoomMax:{value:new THREE.Vector3(width/2-.008,.214,depth-.008)},
        uFinishedOccluderMin:{value:occluders.slice(0,8).map(b=>b.min)},uFinishedOccluderMax:{value:occluders.slice(0,8).map(b=>b.max)},
        uFinishedSourcePosition:{value:sources.map(s=>s.position)},uFinishedSourceColor:{value:sources.map(s=>s.color)},
        uFinishedSourcePower:{value:sources.map(s=>s.power)},
      });
      shader.vertexShader='attribute float roomFinishWeight;\nvarying float vRoomFinishWeight;\nvarying vec3 vRoomFinishPosition;\nuniform mat4 uFinishedWorldToRoom;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
        vec4 finishPosition=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          finishPosition=instanceMatrix*finishPosition;
        #endif
        vRoomFinishPosition=(uFinishedWorldToRoom*modelMatrix*finishPosition).xyz;
        vRoomFinishWeight=roomFinishWeight;
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+declarations);
      let lights=THREE.ShaderChunk.lights_fragment_begin;
      lights=lights.replace('getPointLightInfo( pointLight, geometryPosition, directLight );',
        'getPointLightInfo( pointLight, geometryPosition, directLight ); directLight.color *= finishEnclosureVisibility(finishViewToRoom(pointLight.position));');
      lights=lights.replace('getSpotLightInfo( spotLight, geometryPosition, directLight );',
        'getSpotLightInfo( spotLight, geometryPosition, directLight ); directLight.color *= finishEnclosureVisibility(finishViewToRoom(spotLight.position));');
      lights=lights.replace('getDirectionalLightInfo( directionalLight, directLight );',
        'getDirectionalLightInfo( directionalLight, directLight ); directLight.color *= finishEnclosureVisibility(finishViewToRoom(geometryPosition+directLight.direction*100.0));');
      shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',lights+`
        if(vRoomFinishWeight>.5){
          #if defined(RE_IndirectDiffuse)
            irradiance*=.24;
          #endif
          for(int sourceIndex=0;sourceIndex<2;sourceIndex++){
            vec3 sourceView=(viewMatrix*uFinishedRoomToWorld*vec4(uFinishedSourcePosition[sourceIndex],1.0)).xyz;
            vec3 delta=sourceView-geometryPosition;
            IncidentLight roomLight;
            roomLight.direction=normalize(delta);roomLight.visible=true;
            roomLight.color=uFinishedSourceColor[sourceIndex]*uFinishedSourcePower[sourceIndex]
              /max(dot(delta,delta),.0003)*finishFurnitureVisibility(uFinishedSourcePosition[sourceIndex]);
            RE_Direct(roomLight,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);
          }
        }
      `);
      if(surface==='wood')shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        if(vRoomFinishWeight>.5){
          float phase=vRoomFinishPosition.x*1600.0+sin(vRoomFinishPosition.z*92.0)*2.2+vRoomFinishPosition.y*18.0;
          float grain=sin(phase)*(1.0-smoothstep(.5,2.0,fwidth(phase)));
          diffuseColor.rgb*=.94+.06*grain;
        }
      `);
      if(surface==='fabric')shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',`#include <lights_physical_fragment>
        if(vRoomFinishWeight>.5){
          #ifdef USE_SHEEN
            material.sheenColor=vec3(.12);
          #endif
        }
      `);
      if(surface!=='light'&&surface!=='screen')shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\nif(vRoomFinishWeight>.5)totalEmissiveRadiance*=.12;');
    };
    const priorKey=originalKey();material.customProgramCacheKey=()=>`${priorKey}/room-005-enclosure-pbr-v1/${surface}`;
    material.needsUpdate=true;
  }
  room.userData.finishLighting={method:'scoped-enclosure-occlusion-and-two-point-PBR-sources',contactShadows:'approximate eight furniture solid boxes',globalLightsChanged:false,productionApproved:false};
  return {sync:()=>{room.updateWorldMatrix(true,false);roomToWorld.copy(room.matrixWorld);worldToRoom.copy(room.matrixWorld).invert();}};
}
