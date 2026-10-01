import * as THREE from 'three';

/**
 * Garden Puff (common-garden-puff) in real 3D, built in code from its card
 * art (original, no assets): a floating moss ball with a dark carved-wood
 * face mask, glowing green eyes and a sun rune, two broad leaf ears, sprouts
 * and tiny mushrooms on top, a cloth scarf, four vine arms ending in glowing
 * bud lanterns, and hanging rune-leaf charms with a crystal pendant.
 *
 * Exposes the same rig as the Sproutling pet (head, arm/leaf/eye pivots) so
 * the Today pet poses drive it unchanged. About 3 units tall, centred near
 * the origin like the Sproutling rig.
 */
export interface GardenPuffThreeModel {
  root: THREE.Group;
  head: THREE.Group;
  armPivots: THREE.Group[];
  leafPivots: THREE.Group[];
  eyePivots: THREE.Group[];
  /** Idle life: charms sway, lanterns breathe. */
  update: (elapsedSeconds: number, reducedMotion: boolean) => void;
  dispose: () => void;
}

export function createGardenPuffThreeModel(quality: 'low' | 'high' = 'low'): GardenPuffThreeModel {
  const seg = quality === 'high' ? 48 : 32;
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const mat = <T extends THREE.Material>(material: T) => { materials.push(material); return material; };
  const geo = <T extends THREE.BufferGeometry>(geometry: T) => { geometries.push(geometry); return geometry; };

  const moss = mat(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, vertexColors: true }));
  const wood = mat(new THREE.MeshStandardMaterial({ color: '#3a2717', roughness: 0.7 }));
  const leaf = mat(new THREE.MeshStandardMaterial({ color: '#84a23c', roughness: 0.75, side: THREE.DoubleSide }));
  const leafDark = mat(new THREE.MeshStandardMaterial({ color: '#56702a', roughness: 0.8, side: THREE.DoubleSide }));
  const vine = mat(new THREE.MeshStandardMaterial({ color: '#5a4a24', roughness: 0.85 }));
  const cloth = mat(new THREE.MeshStandardMaterial({ color: '#cbbd98', roughness: 0.9, side: THREE.DoubleSide }));
  const glow = mat(new THREE.MeshStandardMaterial({ color: '#dcff8a', emissive: '#b6f24a', emissiveIntensity: 1.6, roughness: 0.4 }));
  const eyeGlow = mat(new THREE.MeshStandardMaterial({ color: '#d9ff7a', emissive: '#a8ff3c', emissiveIntensity: 2.2, roughness: 0.3 }));
  const mushroom = mat(new THREE.MeshStandardMaterial({ color: '#b98f63', roughness: 0.7 }));
  const stem = mat(new THREE.MeshStandardMaterial({ color: '#e6d8b8', roughness: 0.8 }));
  const bell = mat(new THREE.MeshStandardMaterial({ color: '#b98a3c', metalness: 0.7, roughness: 0.35 }));
  const crystal = mat(new THREE.MeshStandardMaterial({ color: '#c8f56a', emissive: '#8fd23a', emissiveIntensity: 0.9, roughness: 0.2, transparent: true, opacity: 0.9 }));

  const root = new THREE.Group();
  root.name = 'GARDEN_PUFF';
  const head = new THREE.Group(); // the whole floating body nods/tilts as one
  head.position.y = 0.15;
  root.add(head);

  // Mossy body: a lumpy sphere with two-tone vertex colour for depth.
  const bodyGeometry = geo(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)));
  const position = bodyGeometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const light = new THREE.Color('#aec653');
  const dark = new THREE.Color('#5c7a26');
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    const n = Math.sin(v.x * 9.1) * Math.cos(v.y * 7.3) * Math.sin(v.z * 8.7);
    v.multiplyScalar(1 + n * 0.035);
    position.setXYZ(i, v.x, v.y, v.z);
    const c = dark.clone().lerp(light, THREE.MathUtils.clamp(0.55 + v.y * 0.35 + n * 0.8, 0, 1));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  bodyGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  bodyGeometry.computeVertexNormals();
  head.add(new THREE.Mesh(bodyGeometry, moss));

  // Face mask: a carved wooden cap on the front.
  // A round cap of the sphere around +Z, a little above centre.
  const mask = new THREE.Mesh(geo(new THREE.SphereGeometry(1.028, seg, 12, 0, Math.PI * 2, 0, 0.62)), wood);
  mask.rotation.x = Math.PI / 2 - 0.12;
  head.add(mask);
  const maskRim = new THREE.Mesh(geo(new THREE.TorusGeometry(Math.sin(0.62) * 1.028, 0.028, 8, seg)), vine);
  maskRim.position.set(0, Math.sin(0.12) * Math.cos(0.62) * 1.028, Math.cos(0.12) * Math.cos(0.62) * 1.028);
  maskRim.rotation.x = -0.12;
  head.add(maskRim);

  // Eyes (blink via scale.y on the pivots) and the sun rune between them.
  const eyePivots: THREE.Group[] = [];
  [-0.34, 0.34].forEach((x) => {
    const pivot = new THREE.Group();
    const eye = new THREE.Mesh(geo(new THREE.SphereGeometry(0.13, 16, 12)), eyeGlow);
    eye.scale.set(1, 1.25, 0.45);
    pivot.add(eye);
    pivot.position.set(x, 0.12, 0.97);
    pivot.lookAt(x * 3, 0.36, 4);
    head.add(pivot);
    eyePivots.push(pivot);
  });
  const rune = new THREE.Group();
  rune.position.set(0, 0.14, 1.02);
  rune.add(new THREE.Mesh(geo(new THREE.TorusGeometry(0.12, 0.018, 8, 28)), glow));
  rune.add(new THREE.Mesh(geo(new THREE.SphereGeometry(0.035, 10, 8)), glow));
  for (let i = 0; i < 8; i += 1) {
    const ray = new THREE.Mesh(geo(new THREE.BoxGeometry(0.014, 0.06, 0.01)), glow);
    const angle = (i / 8) * Math.PI * 2;
    ray.position.set(Math.cos(angle) * 0.17, Math.sin(angle) * 0.17, 0);
    ray.rotation.z = angle - Math.PI / 2;
    rune.add(ray);
  }
  head.add(rune);

  // Cloth scarf with a front knot flap.
  const scarf = new THREE.Mesh(geo(new THREE.TorusGeometry(0.93, 0.085, 10, seg)), cloth);
  scarf.rotation.x = Math.PI / 2 - 0.25;
  scarf.position.y = -0.3;
  head.add(scarf);
  // Soft drape: a rounded cloth triangle lying on the lower front.
  const drapeShape = new THREE.Shape();
  drapeShape.moveTo(-0.42, 0);
  drapeShape.lineTo(0.42, 0);
  drapeShape.quadraticCurveTo(0.12, -0.3, 0.02, -0.46);
  drapeShape.quadraticCurveTo(-0.02, -0.5, -0.06, -0.44);
  drapeShape.quadraticCurveTo(-0.14, -0.3, -0.42, 0);
  const drape = new THREE.Mesh(geo(new THREE.ShapeGeometry(drapeShape, 8)), cloth);
  drape.position.set(0.04, -0.4, 0.93);
  drape.rotation.x = -0.35;
  head.add(drape);
  const drapeRune = new THREE.Mesh(geo(new THREE.TorusGeometry(0.06, 0.012, 6, 18)), glow);
  drapeRune.position.set(0.04, -0.58, 0.9);
  drapeRune.rotation.x = -0.35;
  head.add(drapeRune);

  // Leaf shape shared by ears, arm buds and charms.
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.quadraticCurveTo(0.42, 0.38, 0, 1);
  leafShape.quadraticCurveTo(-0.42, 0.38, 0, 0);
  const leafGeometry = geo(new THREE.ShapeGeometry(leafShape, 8));

  // Two broad leaf ears (sway via leafPivots).
  const leafPivots: THREE.Group[] = [];
  [-1, 1].forEach((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.45, 0.78, 0.05);
    pivot.rotation.z = side * -0.75;
    const ear = new THREE.Mesh(leafGeometry, leaf);
    ear.scale.set(0.95, 1.15, 1);
    ear.rotation.y = side * 0.35;
    pivot.add(ear);
    const rib = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.012, 0.02, 1.05, 5)), leafDark);
    rib.position.y = 0.52;
    pivot.add(rib);
    head.add(pivot);
    leafPivots.push(pivot);
  });

  // Sprouts and tiny mushrooms on the crown.
  const crownBits: Array<[number, number, 'sprout' | 'mushroom']> = [
    [-0.12, 0.08, 'sprout'], [0.1, -0.05, 'sprout'], [0.28, 0.15, 'mushroom'], [-0.3, -0.12, 'mushroom'], [0.02, 0.28, 'mushroom'],
  ];
  crownBits.forEach(([x, z, kind]) => {
    const y = Math.sqrt(Math.max(0, 1 - x * x - z * z)) * 0.99;
    const bit = new THREE.Group();
    bit.position.set(x, y, z);
    bit.lookAt(x * 3, y * 3, z * 3);
    bit.rotateX(Math.PI / 2);
    if (kind === 'sprout') {
      const s = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.012, 0.018, 0.22, 5)), leafDark);
      s.position.y = 0.11;
      bit.add(s);
      [-1, 1].forEach((side) => {
        const tiny = new THREE.Mesh(leafGeometry, leaf);
        tiny.scale.setScalar(0.14);
        tiny.position.y = 0.2;
        tiny.rotation.z = side * -1.1;
        bit.add(tiny);
      });
    } else {
      const s = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.025, 0.03, 0.14, 8)), stem);
      s.position.y = 0.07;
      const cap = new THREE.Mesh(geo(new THREE.SphereGeometry(0.075, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), mushroom);
      cap.position.y = 0.13;
      bit.add(s, cap);
    }
    head.add(bit);
  });

  // Four vine arms ending in glowing bud lanterns: two pivots (left/right).
  const armPivots: THREE.Group[] = [];
  const lanterns: THREE.Mesh[] = [];
  [-1, 1].forEach((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.9, 0, 0);
    [0.35, -0.2].forEach((height, index) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, height, 0),
        new THREE.Vector3(side * 0.35, height + 0.12, 0.05),
        new THREE.Vector3(side * 0.7, height + (index === 0 ? 0.28 : -0.02), 0.08),
      ]);
      pivot.add(new THREE.Mesh(geo(new THREE.TubeGeometry(curve, 12, 0.035, 6)), vine));
      const end = curve.getPoint(1);
      const lantern = new THREE.Mesh(geo(new THREE.SphereGeometry(0.17, 16, 12)), glow);
      lantern.scale.set(1, 1.15, 1);
      lantern.position.copy(end).add(new THREE.Vector3(side * 0.12, 0.02, 0));
      pivot.add(lantern);
      lanterns.push(lantern);
      for (let p = 0; p < 3; p += 1) {
        const petal = new THREE.Mesh(leafGeometry, leaf);
        petal.scale.setScalar(0.3);
        petal.position.copy(lantern.position);
        petal.rotation.set(0, (p / 3) * Math.PI * 2, side * 1.2);
        pivot.add(petal);
      }
    });
    head.add(pivot);
    armPivots.push(pivot);
  });

  // Hanging charms: strings with rune leaves and a crystal pendant.
  const charms = new THREE.Group();
  charms.position.y = -0.85;
  const charmSwing: THREE.Group[] = [];
  [-0.55, -0.28, 0, 0.28, 0.55].forEach((x, index) => {
    const swing = new THREE.Group();
    swing.position.set(x, 0, 0.35 - Math.abs(x) * 0.3);
    const length = index === 2 ? 0.28 : 0.22 + (index % 2) * 0.12;
    const string = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.008, 0.008, length, 4)), vine);
    string.position.y = -length / 2;
    swing.add(string);
    if (index === 2) {
      const gem = new THREE.Mesh(geo(new THREE.OctahedronGeometry(0.1, 0)), crystal);
      gem.scale.set(0.8, 1.5, 0.8);
      gem.position.y = -length - 0.14;
      swing.add(gem);
    } else {
      const charm = new THREE.Mesh(leafGeometry, leaf);
      charm.scale.set(0.34, -0.42, 1);
      charm.position.y = -length;
      swing.add(charm);
      const mark = new THREE.Mesh(geo(new THREE.TorusGeometry(0.045, 0.01, 6, 16)), glow);
      mark.position.set(0, -length - 0.2, 0.01);
      swing.add(mark);
      const b = new THREE.Mesh(geo(new THREE.SphereGeometry(0.035, 8, 6)), bell);
      b.position.y = 0.02;
      swing.add(b);
    }
    charms.add(swing);
    charmSwing.push(swing);
  });
  head.add(charms);

  return {
    root,
    head,
    armPivots,
    leafPivots,
    eyePivots,
    update(elapsedSeconds, reducedMotion) {
      if (reducedMotion) return;
      charmSwing.forEach((swing, index) => { swing.rotation.z = Math.sin(elapsedSeconds * 1.8 + index * 0.9) * 0.12; });
      const pulse = 1.35 + Math.sin(elapsedSeconds * 2.2) * 0.35;
      glow.emissiveIntensity = pulse;
      lanterns.forEach((lantern, index) => { lantern.scale.y = 1.15 + Math.sin(elapsedSeconds * 2 + index) * 0.04; });
    },
    dispose() {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      root.clear();
    },
  };
}
