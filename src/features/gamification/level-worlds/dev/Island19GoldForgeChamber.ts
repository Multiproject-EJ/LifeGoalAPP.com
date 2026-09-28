import * as THREE from 'three';
import type { Island19CircuitFMaterials } from './Island19CoasterCarnivalCircuitFWorld';
import type { Island3DQuality } from './island5ThreePilotContract';
import { trimGrottoIntersection } from './Island19GrandTreasureGrotto';

/**
 * Island 019 underworld, chamber one: the Gold Forge. A second giant physical
 * cavity carved around the gold-vault leg of the Wonder Express, above the
 * grand treasure grotto. Hidden inside the island, so the underworld stays a
 * surprise until the first ride. Original procedural geometry.
 */
export const ISLAND_19_GOLD_FORGE = Object.freeze({
  decisionId: 'd020',
  center: [-3.7, -3.7, -0.7] as const,
  radii: [3.0, 2.3, 2.9] as const,
});

const center = new THREE.Vector3(...ISLAND_19_GOLD_FORGE.center);
const radii = new THREE.Vector3(...ISLAND_19_GOLD_FORGE.radii);
export const ISLAND_19_GOLD_FORGE_FLOOR_Y = center.y - radii.y * 0.74;

export function goldForgeNorm(point: THREE.Vector3) {
  return ((point.x - center.x) / radii.x) ** 2 + ((point.y - center.y) / radii.y) ** 2 + ((point.z - center.z) / radii.z) ** 2;
}

export function createGoldForgeChamber(
  path: THREE.CurvePath<THREE.Vector3>,
  materials: Island19CircuitFMaterials,
  quality: Island3DQuality,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_19_D020_GOLD_FORGE_CHAMBER';
  const passageSamples = Array.from({ length: 900 }, (_, i) => path.getPoint(i / 899));
  const segments = quality === 'high' ? 72 : quality === 'medium' ? 56 : 40;

  // Warm basalt lining, fired orange near the molten floor.
  const lining = new THREE.SphereGeometry(1, segments, Math.round(segments * 0.66));
  lining.scale(radii.x, radii.y, radii.z).translate(center.x, center.y, center.z);
  const positions = lining.getAttribute('position');
  const colors = new Float32Array(positions.count * 3);
  const point = new THREE.Vector3();
  for (let i = 0; i < positions.count; i += 1) {
    point.fromBufferAttribute(positions, i);
    const strata = Math.sin(point.y * 4.2 + Math.cos(point.x * 1.3) + Math.sin(point.z * 1.1));
    const inward = point.clone().sub(center).normalize();
    point.addScaledVector(inward, -(0.03 + 0.05 * (strata + 1) / 2));
    positions.setXYZ(i, point.x, point.y, point.z);
    const heat = THREE.MathUtils.clamp(1 - (point.y - ISLAND_19_GOLD_FORGE_FLOOR_Y) / (radii.y * 1.6), 0, 1);
    const shade = 0.42 + 0.18 * (strata + 1) / 2;
    colors.set([shade + heat * 0.42, shade * 0.86 + heat * 0.16, shade * 0.8], i * 3);
  }
  lining.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  lining.computeVertexNormals();
  trimGrottoIntersection(lining, (p) => passageSamples.some((sample) => sample.distanceToSquared(p) < 1.7 ** 2));
  const rock = new THREE.MeshStandardMaterial({
    color: 0x3a2b26, roughness: 0.92, side: THREE.DoubleSide, flatShading: true, vertexColors: true,
    emissive: 0x2a0e04, emissiveIntensity: 0.35,
  });
  const shell = new THREE.Mesh(lining, rock);
  shell.name = 'ISLAND_19_D020_PHYSICAL_GOLD_FORGE_LINING';
  root.add(shell);

  // Molten gold pool with a cooler stone rim.
  const moltenMaterial = new THREE.MeshStandardMaterial({
    color: 0xffb020, emissive: 0xff7a00, emissiveIntensity: 1.25, roughness: 0.35, metalness: 0.4,
  });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(radii.x * 0.62, 48), moltenMaterial);
  pool.name = 'ISLAND_19_D020_MOLTEN_GOLD_POOL';
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(center.x, ISLAND_19_GOLD_FORGE_FLOOR_Y, center.z);
  root.add(pool);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radii.x * 0.64, 0.14, 8, 48), materials.wetBasalt);
  rim.rotation.x = Math.PI / 2;
  rim.position.copy(pool.position).add(new THREE.Vector3(0, 0.05, 0));
  root.add(rim);

  // Colossal gold pillars ring the pool (kept clear of the ride sleeve).
  const pillarGeometry = new THREE.CylinderGeometry(0.22, 0.3, 1, 10);
  const pillars = new THREE.InstancedMesh(pillarGeometry, materials.gold, 8);
  pillars.name = 'ISLAND_19_D020_FORGE_PILLARS';
  const matrix = new THREE.Matrix4();
  let pillarCount = 0;
  for (let i = 0; i < 8; i += 1) {
    const angle = i / 8 * Math.PI * 2 + 0.2;
    const x = center.x + Math.cos(angle) * radii.x * 0.8;
    const z = center.z + Math.sin(angle) * radii.z * 0.8;
    const ceiling = center.y + radii.y * Math.sqrt(Math.max(0.05, 1 - 0.64));
    const height = ceiling - ISLAND_19_GOLD_FORGE_FLOOR_Y;
    const mid = new THREE.Vector3(x, ISLAND_19_GOLD_FORGE_FLOOR_Y + height / 2, z);
    if (passageSamples.some((sample) => Math.hypot(sample.x - x, sample.z - z) < 1.25
      && sample.y > ISLAND_19_GOLD_FORGE_FLOOR_Y - 0.5 && sample.y < ceiling + 0.5)) continue;
    matrix.compose(mid, new THREE.Quaternion(), new THREE.Vector3(1, height, 1));
    pillars.setMatrixAt(pillarCount, matrix);
    pillarCount += 1;
  }
  pillars.count = pillarCount;
  root.add(pillars);

  // Hanging forge lanterns.
  const lanternMaterial = new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xffa53a, emissiveIntensity: 1.6 });
  const lanterns = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 8), lanternMaterial, 14);
  lanterns.name = 'ISLAND_19_D020_FORGE_LANTERNS';
  let lanternCount = 0;
  for (let i = 0; i < 14; i += 1) {
    const angle = i * 2.399963;
    const radius = 0.6 + (i % 4) * 0.55;
    const position = new THREE.Vector3(
      center.x + Math.cos(angle) * radius,
      center.y + radii.y * 0.45 - (i % 3) * 0.28,
      center.z + Math.sin(angle) * radius * 0.9,
    );
    if (passageSamples.some((sample) => sample.distanceToSquared(position) < 1.3 ** 2)) continue;
    matrix.makeTranslation(position.x, position.y, position.z);
    lanterns.setMatrixAt(lanternCount, matrix);
    lanternCount += 1;
  }
  lanterns.count = lanternCount;
  root.add(lanterns);

  const glow = new THREE.PointLight(0xff9a2e, 60, 9, 1.6);
  glow.position.set(center.x, ISLAND_19_GOLD_FORGE_FLOOR_Y + 1.1, center.z);
  root.add(glow);

  root.userData = {
    decisionId: ISLAND_19_GOLD_FORGE.decisionId,
    physicalCavity: true,
    center: ISLAND_19_GOLD_FORGE.center,
    radii: ISLAND_19_GOLD_FORGE.radii,
    floorY: ISLAND_19_GOLD_FORGE_FLOOR_Y,
    gameplayAuthority: false,
  };
  return root;
}
