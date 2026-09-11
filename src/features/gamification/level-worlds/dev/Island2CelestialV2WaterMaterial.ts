import * as THREE from 'three';

/** UV.y follows downstream travel; time0 is the reduced-motion presentation. */
export function createCelestialFlowMaterial(kind: 'pool' | 'fall') {
  const material = new THREE.ShaderMaterial({
    name: `ISLAND_2_FLOW_${kind.toUpperCase()}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: {
      time: { value: 0 }, falling: { value: kind === 'fall' ? 1 : 0 },
      deep: { value: new THREE.Color(0x39afd3) },
      shallow: { value: new THREE.Color(0xb5f1f3) },
      foam: { value: new THREE.Color(0xf4ffff) },
    },
    vertexShader: `varying vec2 flowUv;
      void main() { flowUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec2 flowUv;
      uniform float time; uniform float falling;
      uniform vec3 deep; uniform vec3 shallow; uniform vec3 foam;
      void main() {
        vec2 uv=flowUv;
        float strands=sin(uv.x*37. + sin(uv.x*11.)*3. + uv.y*1.8)*.5+.5;
        float travel=sin(uv.y*47.-time*7. + uv.x*9.)*.5+.5;
        float ripple=sin(length(uv-vec2(.48,.52))*43.-time*1.7)*.5+.5;
        float glint=pow(max(0.,sin(uv.x*39.+sin(uv.y*21.-time*.8))),18.);
        float brightness=mix(.28+ripple*.07+glint*.18,.50+strands*.30+travel*.08,falling);
        vec3 color=mix(deep,shallow,brightness);
        color=mix(color,foam,mix(glint*.25,pow(strands,6.)*.62,falling));
        float sides=smoothstep(0.,.07,uv.x)*(1.-smoothstep(.93,1.,uv.x));
        float toe=1.-smoothstep(.87,1.,uv.y);
        float alpha=mix(.83,sides*toe*(.62+strands*.22),falling);
        gl_FragColor=vec4(color,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  material.userData.celestialClock = true;
  return material;
}
