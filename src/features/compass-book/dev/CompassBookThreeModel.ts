import * as THREE from 'three';

export type CompassBookThreeQuality = 'low' | 'high';

export type CompassBookThreeMetrics = {
  meshes: number;
  materials: number;
  triangles: number;
};

export type CompassBookThreeModel = {
  root: THREE.Group;
  setOpenProgress: (progress: number) => void;
  animate: (elapsedSeconds: number, reducedMotion: boolean) => void;
  metrics: CompassBookThreeMetrics;
  dispose: () => void;
};

type BookMaterials = {
  leather: THREE.MeshPhysicalMaterial;
  leatherInset: THREE.MeshPhysicalMaterial;
  gilt: THREE.MeshPhysicalMaterial;
  giltDark: THREE.MeshStandardMaterial;
  paper: THREE.MeshStandardMaterial;
  pageEdge: THREE.MeshStandardMaterial;
  ink: THREE.MeshStandardMaterial;
  violet: THREE.MeshPhysicalMaterial;
  glow: THREE.MeshBasicMaterial;
};

function createMaterials(): BookMaterials {
  return {
    leather: new THREE.MeshPhysicalMaterial({
      color: 0x111432,
      roughness: 0.54,
      metalness: 0.04,
      clearcoat: 0.28,
      clearcoatRoughness: 0.58,
    }),
    leatherInset: new THREE.MeshPhysicalMaterial({
      color: 0x20205a,
      roughness: 0.46,
      metalness: 0.08,
      clearcoat: 0.42,
      clearcoatRoughness: 0.32,
    }),
    gilt: new THREE.MeshPhysicalMaterial({
      color: 0xe0a83f,
      roughness: 0.24,
      metalness: 0.88,
      clearcoat: 0.72,
      clearcoatRoughness: 0.15,
    }),
    giltDark: new THREE.MeshStandardMaterial({
      color: 0x82521b,
      roughness: 0.38,
      metalness: 0.72,
    }),
    paper: new THREE.MeshStandardMaterial({
      color: 0xf3e4bd,
      roughness: 0.88,
      metalness: 0,
    }),
    pageEdge: new THREE.MeshStandardMaterial({
      color: 0xc9a86f,
      roughness: 0.72,
      metalness: 0.05,
    }),
    ink: new THREE.MeshStandardMaterial({
      color: 0x20203c,
      roughness: 0.8,
      metalness: 0,
    }),
    violet: new THREE.MeshPhysicalMaterial({
      color: 0x7135c8,
      emissive: 0x2d0f60,
      emissiveIntensity: 0.62,
      roughness: 0.2,
      metalness: 0.34,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    }),
    glow: new THREE.MeshBasicMaterial({
      color: 0x9a68ff,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  };
}

function box(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addCoverCorner(
  parent: THREE.Group,
  x: number,
  z: number,
  material: THREE.Material,
  quality: CompassBookThreeQuality,
) {
  const corner = new THREE.Group();
  const horizontal = box(0.56, 0.075, quality === 'high' ? 0.12 : 0.1, material);
  horizontal.position.x = x > 0 ? -0.18 : 0.18;
  const vertical = box(quality === 'high' ? 0.12 : 0.1, 0.075, 0.56, material);
  vertical.position.z = z > 0 ? -0.18 : 0.18;
  corner.add(horizontal, vertical);
  corner.position.set(x, 0.16, z);
  parent.add(corner);
}

function createCompassMechanism(
  materials: BookMaterials,
  quality: CompassBookThreeQuality,
  name: string,
) {
  const group = new THREE.Group();
  group.name = name;

  const segments = quality === 'high' ? 64 : 24;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.065, quality === 'high' ? 10 : 6, segments),
    materials.gilt,
  );
  ring.rotation.x = Math.PI / 2;
  ring.castShadow = true;
  group.add(ring);

  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.026, 5, segments),
    materials.giltDark,
  );
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.y = 0.012;
  group.add(innerRing);

  const compassDisk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 0.055, segments),
    materials.leatherInset,
  );
  compassDisk.position.y = -0.012;
  compassDisk.castShadow = true;
  group.add(compassDisk);

  const needleRoot = new THREE.Group();
  needleRoot.name = `${name}_NEEDLE`;
  needleRoot.position.y = 0.07;
  const longNeedle = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), materials.gilt);
  longNeedle.scale.set(0.25, 0.11, 1.42);
  longNeedle.castShadow = true;
  needleRoot.add(longNeedle);
  const crossNeedle = new THREE.Mesh(new THREE.OctahedronGeometry(0.27, 0), materials.giltDark);
  crossNeedle.scale.set(1.22, 0.09, 0.23);
  crossNeedle.castShadow = true;
  needleRoot.add(crossNeedle);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), materials.violet);
  gem.position.y = 0.13;
  gem.castShadow = true;
  needleRoot.add(gem);
  group.add(needleRoot);

  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.76, 0.98, segments),
    materials.glow.clone(),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -0.035;
  group.add(glow);

  return { root: group, needleRoot, glow };
}

function countMetrics(root: THREE.Object3D): CompassBookThreeMetrics {
  let meshes = 0;
  let triangles = 0;
  const materials = new Set<THREE.Material>();
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    meshes += 1;
    const geometry = child.geometry;
    triangles += geometry.index
      ? geometry.index.count / 3
      : (geometry.getAttribute('position')?.count ?? 0) / 3;
    const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
    meshMaterials.forEach((material) => materials.add(material));
  });
  return { meshes, materials: materials.size, triangles: Math.round(triangles) };
}

function disposeObject(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
    meshMaterials.forEach((material) => materials.add(material));
  });
  materials.forEach((material) => material.dispose());
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

export function createCompassBookThreeModel(
  quality: CompassBookThreeQuality,
): CompassBookThreeModel {
  const materials = createMaterials();
  const root = new THREE.Group();
  root.name = 'COMPASS_BOOK_THREE_MODEL';

  const backCover = box(2.92, 0.2, 7.36, materials.leather);
  backCover.name = 'COMPASS_BOOK_BACK_COVER';
  backCover.position.set(1.5, 0.04, 0);
  root.add(backCover);

  const backInset = box(2.58, 0.035, 6.94, materials.leatherInset);
  backInset.position.set(1.5, 0.16, 0);
  root.add(backInset);

  const rightPageBlock = box(2.72, 0.38, 7.02, materials.pageEdge);
  rightPageBlock.name = 'COMPASS_BOOK_RIGHT_PAGE_BLOCK';
  rightPageBlock.position.set(1.48, 0.34, -0.015);
  root.add(rightPageBlock);

  const rightPage = box(2.62, 0.055, 6.9, materials.paper);
  rightPage.name = 'COMPASS_BOOK_RIGHT_READING_PAGE';
  rightPage.position.set(1.45, 0.56, -0.03);
  root.add(rightPage);

  const pageLineCount = quality === 'high' ? 8 : 4;
  for (let index = 0; index < pageLineCount; index += 1) {
    const line = box(2.5, 0.016, 0.018, index % 3 === 0 ? materials.giltDark : materials.pageEdge);
    line.name = 'COMPASS_BOOK_PAGE_EDGE_LINE';
    line.position.set(1.48, 0.2 + index * 0.043, 3.51);
    root.add(line);
  }

  const spine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.28, 7.3, quality === 'high' ? 32 : 14),
    materials.leather,
  );
  spine.name = 'COMPASS_BOOK_SPINE';
  spine.rotation.x = Math.PI / 2;
  spine.position.set(0, 0.27, 0);
  spine.castShadow = true;
  root.add(spine);

  const spineRibs = quality === 'high' ? 6 : 4;
  for (let index = 0; index < spineRibs; index += 1) {
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(0.275, 0.032, 6, quality === 'high' ? 24 : 12, Math.PI),
      materials.giltDark,
    );
    rib.rotation.y = Math.PI / 2;
    rib.position.set(-0.025, 0.27, -2.82 + index * (5.64 / Math.max(1, spineRibs - 1)));
    root.add(rib);
  }

  const frontPivot = new THREE.Group();
  frontPivot.name = 'COMPASS_BOOK_FRONT_COVER_HINGE';
  frontPivot.position.set(0, 0.68, 0);
  root.add(frontPivot);

  const frontCover = box(2.96, 0.2, 7.38, materials.leather);
  frontCover.name = 'COMPASS_BOOK_FRONT_COVER';
  frontCover.position.set(1.5, 0, 0);
  frontPivot.add(frontCover);

  const frontInset = box(2.58, 0.045, 6.94, materials.leatherInset);
  frontInset.name = 'COMPASS_BOOK_FRONT_COVER_INSET';
  frontInset.position.set(1.5, 0.12, 0);
  frontPivot.add(frontInset);

  addCoverCorner(frontPivot, 0.28, 3.3, materials.gilt, quality);
  addCoverCorner(frontPivot, 2.72, 3.3, materials.gilt, quality);
  addCoverCorner(frontPivot, 0.28, -3.3, materials.gilt, quality);
  addCoverCorner(frontPivot, 2.72, -3.3, materials.gilt, quality);

  const coverCompass = createCompassMechanism(materials, quality, 'COMPASS_BOOK_COVER_COMPASS');
  coverCompass.root.position.set(1.5, 0.22, -0.05);
  coverCompass.root.scale.setScalar(1.05);
  frontPivot.add(coverCompass.root);

  const titleBarTop = box(1.55, 0.05, 0.04, materials.gilt);
  titleBarTop.position.set(1.5, 0.18, -1.48);
  const titleBarBottom = titleBarTop.clone();
  titleBarBottom.position.z = 1.38;
  frontPivot.add(titleBarTop, titleBarBottom);

  const titleGlyphs = quality === 'high' ? 7 : 3;
  for (let index = 0; index < titleGlyphs; index += 1) {
    const glyph = new THREE.Mesh(new THREE.OctahedronGeometry(0.08 + index % 2 * 0.025, 0), index % 2 ? materials.violet : materials.gilt);
    glyph.name = 'COMPASS_BOOK_COVER_GLYPH';
    glyph.scale.set(0.42, 0.28, 1.2);
    glyph.position.set(0.72 + index * (1.56 / Math.max(1, titleGlyphs - 1)), 0.2, -2.38);
    frontPivot.add(glyph);
  }

  const leftPage = box(2.68, 0.07, 6.92, materials.paper);
  leftPage.name = 'COMPASS_BOOK_LEFT_READING_PAGE';
  leftPage.position.set(1.48, -0.44, -0.03);
  frontPivot.add(leftPage);

  const readingCompass = createCompassMechanism(materials, quality, 'COMPASS_BOOK_READING_COMPASS');
  readingCompass.root.position.set(1.48, -0.56, -0.45);
  readingCompass.root.scale.setScalar(0.82);
  frontPivot.add(readingCompass.root);

  const tabColors = [0x325da8, 0x6542b1, 0x8f3c96, 0x2d7f8f, 0xb67832, 0x4c6eaa, 0x9a6a2c];
  const tabs = new THREE.Group();
  tabs.name = 'COMPASS_BOOK_CHAPTER_TABS';
  for (let index = 0; index < 7; index += 1) {
    const material = new THREE.MeshPhysicalMaterial({
      color: tabColors[index],
      roughness: 0.3,
      metalness: 0.18,
      clearcoat: 0.55,
      clearcoatRoughness: 0.2,
    });
    const tab = box(0.48, 0.09, 0.64, material);
    tab.name = `COMPASS_BOOK_TAB_${index + 1}`;
    tab.position.set(3.07, 0.46, -2.76 + index * 0.91);
    tabs.add(tab);
    const cap = box(0.12, 0.12, 0.42, materials.gilt);
    cap.position.set(3.3, 0.49, tab.position.z);
    tabs.add(cap);
  }
  root.add(tabs);

  const openGlow = new THREE.PointLight(0x9a66ff, quality === 'high' ? 7.2 : 4.1, 8, 2);
  openGlow.name = 'COMPASS_BOOK_VIOLET_PAGE_LIGHT';
  openGlow.position.set(0, 2.3, 0.2);
  root.add(openGlow);

  let openProgress = 0;
  function setOpenProgress(progress: number) {
    openProgress = THREE.MathUtils.clamp(progress, 0, 1);
    const eased = easeInOutCubic(openProgress);
    frontPivot.rotation.z = Math.PI * eased;
    frontPivot.position.y = THREE.MathUtils.lerp(0.68, 0.11, eased);
    root.rotation.y = THREE.MathUtils.lerp(-0.08, 0, eased);
    root.position.x = THREE.MathUtils.lerp(-1.5, 0, eased);
    tabs.visible = eased > 0.38;
    readingCompass.root.visible = eased > 0.48;
    openGlow.intensity = THREE.MathUtils.lerp(0.2, quality === 'high' ? 7.2 : 4.1, eased);
  }
  setOpenProgress(0);

  function animate(elapsedSeconds: number, reducedMotion: boolean) {
    if (reducedMotion) {
      coverCompass.needleRoot.rotation.y = 0.1;
      readingCompass.needleRoot.rotation.y = -0.2;
      (coverCompass.glow.material as THREE.MeshBasicMaterial).opacity = 0.18;
      (readingCompass.glow.material as THREE.MeshBasicMaterial).opacity = 0.2;
      return;
    }
    coverCompass.needleRoot.rotation.y = Math.sin(elapsedSeconds * 0.48) * 0.16;
    readingCompass.needleRoot.rotation.y = Math.sin(elapsedSeconds * 0.38 + 0.7) * 0.24;
    const pulse = 0.19 + (Math.sin(elapsedSeconds * 1.15) + 1) * 0.055;
    (coverCompass.glow.material as THREE.MeshBasicMaterial).opacity = pulse;
    (readingCompass.glow.material as THREE.MeshBasicMaterial).opacity = pulse * (0.72 + openProgress * 0.45);
  }

  return {
    root,
    setOpenProgress,
    animate,
    metrics: countMetrics(root),
    dispose: () => disposeObject(root),
  };
}
