import * as THREE from 'three';

/** Low-cost, mipmapped caustics: one shared texture lookup, no transmission pass. */
export function configureSunshoreV2Water(ocean: THREE.Mesh) {
  const material = ocean.material as THREE.MeshPhysicalMaterial;
  const size = 512, cells = 12;
  const data = new Uint8Array(size * size * 4);
  const seed = (x: number, y: number) => {
    const a = ((x % cells) + cells) % cells, b = ((y % cells) + cells) % cells;
    return ((a * 127 + b * 311 + a * b * 53) % 997) / 997;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
    // Periodic coordinate warp bends cell edges into water-like caustic ribbons.
    const px = x / size * cells + .28 * Math.sin(v * 3) + .12 * Math.sin(u * 4 + v * 2);
    const py = y / size * cells + .24 * Math.sin(u * 3) + .1 * Math.cos(v * 5 - u * 2);
    const ix = Math.floor(px), iy = Math.floor(py);
    let nearest = 9, second = 9;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const cx = ix + dx, cy = iy + dy;
      const distance = Math.hypot(cx + .18 + seed(cx, cy) * .64 - px, cy + .18 + seed(cy + 7, cx + 3) * .64 - py);
      if (distance < nearest) { second = nearest; nearest = distance; }
      else if (distance < second) second = distance;
    }
    const edge = Math.exp(-(second - nearest) * 29);
    const value = Math.round(229 + edge * 26);
    const i = (y * size + x) * 4;
    data[i] = value; data[i + 1] = value; data[i + 2] = value; data[i + 3] = 255;
  }
  const map = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(13 * 360 / 68, 13 * 360 / 68); map.generateMipmaps = true;
  map.minFilter = THREE.LinearMipmapLinearFilter; map.magFilter = THREE.LinearFilter; map.needsUpdate = true;
  material.map = map;
  material.color.setHex(0x38bdca);
  material.roughness = .24; material.clearcoat = .52; material.opacity = .73;
  const time = { value: 0 };
  material.onBeforeCompile = shader => {
    shader.uniforms.sunshoreTime = time;
    shader.vertexShader = `varying vec3 sunshoreWaterWorld;\n${shader.vertexShader}`.replace('#include <worldpos_vertex>',
      '#include <worldpos_vertex>\nsunshoreWaterWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = `varying vec3 sunshoreWaterWorld;\nuniform float sunshoreTime;\n${shader.fragmentShader}`.replace('#include <color_fragment>', `#include <color_fragment>
      float lagoon = 1.0 - smoothstep(8.0, 18.0, length(sunshoreWaterWorld.xz) + 1.6 * sin(sunshoreWaterWorld.x * .27) * cos(sunshoreWaterWorld.z * .32));
      float shoal = sin(sunshoreWaterWorld.x * .61 + sin(sunshoreWaterWorld.z * .42)) * sin(sunshoreWaterWorld.z * .73);
      diffuseColor.rgb *= mix(vec3(.24, .58, .85), vec3(.8, 1.04, 1.0), lagoon);
      diffuseColor.rgb *= .96 + shoal * .055;
      float ripple = sin(sunshoreWaterWorld.x * 2.4 + sunshoreWaterWorld.z * 1.8 + sunshoreTime * .55);
      diffuseColor.rgb += vec3(.015, .035, .038) * pow(max(0.0, ripple), 12.0) * lagoon;
    `).replace('#include <map_fragment>', `#include <map_fragment>
      #ifdef USE_MAP
        float causticFade = 1.0 - smoothstep(7.0, 15.0, length(sunshoreWaterWorld.xz));
        diffuseColor.rgb /= max(sampledDiffuseColor.rgb, vec3(.001));
        diffuseColor.rgb *= mix(vec3(1.0), sampledDiffuseColor.rgb, causticFade);
      #endif
    `).replace('#include <dithering_fragment>', `#include <dithering_fragment>
      // Fade the distant surface into the exact scene sky after tone mapping.
      float horizonHaze = smoothstep(26.0, 100.0, length(sunshoreWaterWorld.xz));
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.470588, 0.843137, 0.933333), horizonHaze);
      gl_FragColor.a = mix(gl_FragColor.a, 1.0, horizonHaze);
    `);
  };
  material.customProgramCacheKey = () => 'sunshore-v2-lagoon-depth-3';
  return (elapsed: number) => {
    time.value = elapsed;
    map.offset.set(Math.sin(elapsed * .018) * .012, elapsed * .0011);
  };
}
