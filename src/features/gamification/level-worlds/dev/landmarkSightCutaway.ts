import * as THREE from 'three';

/**
 * Soft see-through tunnel for a landmark that blocks the camera's view of the
 * player piece (user request 2026-09-30). Instead of fading the whole building,
 * only the part along the line camera → piece is gently muted, with a soft
 * edge; the rest of the building stays solid, so it never looks "gone".
 *
 * Works by patching the landmark's (already per-root cloned) built-in materials
 * with a world-space distance-to-segment mask. Presentation only.
 */

const PATCHABLE = new Set([
  'MeshStandardMaterial', 'MeshPhysicalMaterial', 'MeshLambertMaterial',
  'MeshPhongMaterial', 'MeshBasicMaterial', 'MeshToonMaterial', 'MeshMatcapMaterial',
]);

/** Pure mask, mirrored by the shader (exported for tests). */
export function resolveSightCutawayMask(options: {
  point: readonly [number, number, number];
  start: readonly [number, number, number];
  end: readonly [number, number, number];
  radius: number;
}): number {
  const [px, py, pz] = options.point;
  const [sx, sy, sz] = options.start;
  const dx = options.end[0] - sx; const dy = options.end[1] - sy; const dz = options.end[2] - sz;
  const length = Math.max(1e-4, Math.hypot(dx, dy, dz));
  const t = ((px - sx) * dx + (py - sy) * dy + (pz - sz) * dz) / (length * length);
  // Only between the camera and the piece: what is behind the piece stays.
  if (t <= 0.02 || t >= 0.985) return 0;
  const cx = sx + dx * t; const cy = sy + dy * t; const cz = sz + dz * t;
  const distance = Math.hypot(px - cx, py - cy, pz - cz);
  const inner = options.radius * 0.55;
  if (distance <= inner) return 1;
  if (distance >= options.radius) return 0;
  const x = (distance - inner) / (options.radius - inner);
  return 1 - x * x * (3 - 2 * x);
}

/** Minimum coverage inside the tunnel: muted, never erased. */
export const SIGHT_CUTAWAY_MIN_OPACITY = 0.14;

export function createLandmarkSightCutaway(
  root: THREE.Object3D,
  options: {
    /**
     * Extra roots whose materials also draw this landmark. Some worlds move
     * landmark geometry into shared rigid-surface batches, leaving the
     * landmark's own meshes empty; the box limit keeps other parts solid.
     */
    extraRoots?: () => THREE.Object3D[];
  } = {},
) {
  const uniforms = {
    uCutBoxMin: { value: new THREE.Vector3(-1e6, -1e6, -1e6) },
    uCutBoxMax: { value: new THREE.Vector3(1e6, 1e6, 1e6) },
    uCutStart: { value: new THREE.Vector3() },
    uCutEnd: { value: new THREE.Vector3() },
    uCutRadius: { value: 2 },
    uCutStrength: { value: 0 },
  };
  const materials: THREE.Material[] = [];
  // World packs can stream in after setup, so late materials are patched too.
  const patchNewMaterials = () => [root, ...(options.extraRoots?.() ?? [])].forEach((scanRoot) => scanRoot.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => {
      if (!PATCHABLE.has(material.type) || materials.includes(material) || material.userData.sightCutaway) return;
      material.userData.sightCutaway = true;
      const previous = material.onBeforeCompile;
      // Batched materials pin their own program cache key; extend it so the
      // cutaway program is never shared with an unpatched material.
      if (Object.prototype.hasOwnProperty.call(material, 'customProgramCacheKey')) {
        const previousKey = material.customProgramCacheKey.bind(material);
        material.customProgramCacheKey = () => `${previousKey()}|sight-cutaway-v1`;
      }
      material.onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms, renderer: THREE.WebGLRenderer) => {
        previous?.call(material, shader, renderer);
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vSightCutWorld;')
          .replace('#include <project_vertex>', `#include <project_vertex>
  vec4 sightCutWorld = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    sightCutWorld = instanceMatrix * sightCutWorld;
  #endif
  vSightCutWorld = (modelMatrix * sightCutWorld).xyz;`);
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>
varying vec3 vSightCutWorld;
uniform vec3 uCutStart;
uniform vec3 uCutEnd;
uniform float uCutRadius;
uniform float uCutStrength;
uniform vec3 uCutBoxMin;
uniform vec3 uCutBoxMax;`)
          .replace('#include <dithering_fragment>', `#include <dithering_fragment>
  if (uCutStrength > 0.001) {
    vec3 cutDir = uCutEnd - uCutStart;
    float cutLen2 = max(dot(cutDir, cutDir), 1e-6);
    float cutT = dot(vSightCutWorld - uCutStart, cutDir) / cutLen2;
    float cutDist = distance(vSightCutWorld, uCutStart + cutDir * clamp(cutT, 0.0, 1.0));
    float cutMask = (1.0 - smoothstep(uCutRadius * 0.55, uCutRadius, cutDist)) * step(0.02, cutT) * (1.0 - step(0.985, cutT));
    vec3 cutInside = step(uCutBoxMin, vSightCutWorld) * step(vSightCutWorld, uCutBoxMax);
    cutMask *= cutInside.x * cutInside.y * cutInside.z;
    // Screen-door (dithered) fade: materials stay opaque, so nothing else on
    // the island changes render order, depth or shadows.
    float cutKeep = 1.0 - uCutStrength * cutMask * ${(1 - SIGHT_CUTAWAY_MIN_OPACITY).toFixed(3)};
    vec2 cutCell = mod(floor(gl_FragCoord.xy), 4.0);
    float cutBayer = (cutCell.x < 1.0 ? (cutCell.y < 1.0 ? 0.0 : cutCell.y < 2.0 ? 12.0 : cutCell.y < 3.0 ? 3.0 : 15.0)
      : cutCell.x < 2.0 ? (cutCell.y < 1.0 ? 8.0 : cutCell.y < 2.0 ? 4.0 : cutCell.y < 3.0 ? 11.0 : 7.0)
      : cutCell.x < 3.0 ? (cutCell.y < 1.0 ? 2.0 : cutCell.y < 2.0 ? 14.0 : cutCell.y < 3.0 ? 1.0 : 13.0)
      : (cutCell.y < 1.0 ? 10.0 : cutCell.y < 2.0 ? 6.0 : cutCell.y < 3.0 ? 9.0 : 5.0)) / 16.0 + 1.0 / 32.0;
    if (cutKeep < cutBayer) discard;
  }`);
      };
      material.needsUpdate = true;
      materials.push(material);
    });
  }));
  patchNewMaterials();
  let lastScanAt = -Infinity;

  return {
    /** Eases the tunnel in or out and aims it from `start` (camera) to `end` (piece). */
    update(options: { start: THREE.Vector3; end: THREE.Vector3; radius: number; active: boolean; deltaSeconds: number; reducedMotion: boolean; nowSeconds?: number; box?: THREE.Box3 | null }) {
      if (options.box && !options.box.isEmpty()) {
        uniforms.uCutBoxMin.value.copy(options.box.min).subScalar(0.25);
        uniforms.uCutBoxMax.value.copy(options.box.max).addScalar(0.25);
      }
      const now = options.nowSeconds ?? performance.now() / 1000;
      if (now - lastScanAt > 1) {
        lastScanAt = now;
        patchNewMaterials();
      }
      const target = options.active ? 1 : 0;
      const rate = options.reducedMotion ? 60 : 4.5;
      const current = uniforms.uCutStrength.value;
      uniforms.uCutStrength.value = current + (target - current) * Math.min(1, options.deltaSeconds * rate);
      if (Math.abs(uniforms.uCutStrength.value - target) < 0.002) uniforms.uCutStrength.value = target;
      uniforms.uCutStart.value.copy(options.start);
      uniforms.uCutEnd.value.copy(options.end);
      uniforms.uCutRadius.value = options.radius;
      return uniforms.uCutStrength.value;
    },
    get strength() { return uniforms.uCutStrength.value; },
    get materialCount() { return materials.length; },
  };
}
