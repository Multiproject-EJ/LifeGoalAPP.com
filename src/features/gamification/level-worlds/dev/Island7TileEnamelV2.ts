import * as THREE from 'three';

/** Original sea-glass inlay on the existing canonical tile surfaces.
 * No geometry, tile identities, transforms or gameplay state are changed. */
export function applyIsland7TileEnamelV2(material: THREE.MeshStandardMaterial, geometry: THREE.BufferGeometry, night: number) {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  const positions = geometry.getAttribute('position');
  let outerHalfWidth = 0, innerHalfWidth = 0;
  for (let i = 0; i < positions.count; i++) {
    if (Math.abs(positions.getZ(i) - bounds.min.z) < 1e-5) outerHalfWidth = Math.max(outerHalfWidth, Math.abs(positions.getX(i)));
    if (Math.abs(positions.getZ(i) - bounds.max.z) < 1e-5) innerHalfWidth = Math.max(innerHalfWidth, Math.abs(positions.getX(i)));
  }
  const shape = new THREE.Vector4(outerHalfWidth, innerHalfWidth, bounds.min.z, bounds.max.z - bounds.min.z);
  material.roughness = .27;
  if (material instanceof THREE.MeshPhysicalMaterial) { material.clearcoat = .85; material.clearcoatRoughness = .22; }
  material.onBeforeCompile = shader => {
    shader.uniforms.enamelShape = { value: shape };
    shader.uniforms.enamelNight = { value: night };
    shader.vertexShader = 'uniform vec4 enamelShape; varying vec2 vEnamelUv; varying float vEnamelFace;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float enamelV = (position.z-enamelShape.z)/enamelShape.w;
      vEnamelUv = vec2(position.x/(2.0*mix(enamelShape.x,enamelShape.y,enamelV))+.5,enamelV);
      vEnamelFace = normal.y;
    `);
    shader.fragmentShader = 'uniform float enamelNight; varying vec2 vEnamelUv; varying float vEnamelFace;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float enamelTop = smoothstep(.8,.98,vEnamelFace);
      vec2 enamelQ = min(vEnamelUv,1.0-vEnamelUv);
      float enamelEdgeDistance = min(enamelQ.x,enamelQ.y);
      float enamelAA = max(.002,fwidth(enamelEdgeDistance)*.65);
      float enamelGold = 1.0-smoothstep(.037-enamelAA,.037+enamelAA,enamelEdgeDistance);
      float enamelInset = 1.0-smoothstep(max(0.0,.010-enamelAA),.010+enamelAA,abs(enamelEdgeDistance-.09));
      float enamelFlow = sin(vEnamelUv.x*19.0+sin(vEnamelUv.y*13.0)*1.4)
        + .45*sin(vEnamelUv.y*25.0-vEnamelUv.x*9.0);
      float enamelVein = pow(clamp(.5+enamelFlow*.32,0.0,1.0),8.0);
      vec3 enamelGlass = diffuseColor.rgb*(.88+.04*sin(enamelFlow*1.5));
      enamelGlass += vec3(.06,.15,.15)*enamelVein*.18;
      enamelGlass = mix(enamelGlass,vec3(.58,.34,.095),enamelGold);
      enamelGlass = mix(enamelGlass,vec3(.34,.65,.57),enamelInset*.30);
      diffuseColor.rgb = mix(diffuseColor.rgb,enamelGlass,enamelTop);
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance *= mix(1.0,.30,enamelTop);
      totalEmissiveRadiance += enamelTop*enamelNight*(
        vec3(.72,.37,.085)*enamelGold*.70
        + vec3(.12,1.25,1.45)*enamelInset
        + vec3(.015,.10,.14)*enamelVein);
    `);
  };
  material.customProgramCacheKey = () => 'island7-sea-glass-tile-inlay-v1';
  material.needsUpdate = true;
}
