import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { VaultIslandQuality } from './VaultTreasureIslandModel';

export interface VaultInteriorArchitectureMaterials {
  floor: THREE.Material;
  floorShade: THREE.Material;
  wall: THREE.Material;
  wallTrim: THREE.Material;
  gold: THREE.Material;
  darkGold: THREE.Material;
  silver: THREE.Material;
  enamel: THREE.Material;
  glass: THREE.Material;
  cyanGem: THREE.Material;
  violetGem: THREE.Material;
  warmGlow: THREE.Material;
  cyanGlow: THREE.Material;
}

function segments(quality: VaultIslandQuality, low: number, medium: number, high: number) {
  if (quality === 'low') return low;
  if (quality === 'medium') return medium;
  return high;
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, name: string) {
  const output = new THREE.Mesh(geometry, material);
  output.name = name;
  output.castShadow = true;
  output.receiveShadow = true;
  return output;
}

function box(
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  name: string,
  radius = 0.04,
) {
  const output = mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 3, radius), material, name);
  output.position.set(...position);
  return output;
}

function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments: number,
  material: THREE.Material,
  name: string,
) {
  return mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments), material, name);
}

function horizontalRing(
  radius: number,
  tube: number,
  quality: VaultIslandQuality,
  material: THREE.Material,
  name: string,
) {
  const output = mesh(
    new THREE.TorusGeometry(radius, tube, segments(quality, 8, 10, 12), segments(quality, 48, 72, 96)),
    material,
    name,
  );
  output.rotation.x = Math.PI / 2;
  return output;
}

function archShape(width: number, height: number) {
  const radius = width / 2;
  const springY = height / 2 - radius;
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, springY);
  shape.absarc(0, springY, radius, 0, Math.PI, false);
  shape.lineTo(-width / 2, -height / 2);
  return shape;
}

function archPanel(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  name: string,
) {
  const geometry = new THREE.ExtrudeGeometry(archShape(width, height), {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.025,
    bevelThickness: 0.018,
    curveSegments: 16,
  });
  geometry.center();
  return mesh(geometry, material, name);
}

function archFrame(
  width: number,
  height: number,
  thickness: number,
  depth: number,
  material: THREE.Material,
  name: string,
) {
  const outer = archShape(width, height);
  const innerWidth = Math.max(0.1, width - thickness * 2);
  const innerHeight = Math.max(0.1, height - thickness * 2);
  const inner = archShape(innerWidth, innerHeight);
  outer.holes.push(inner);
  const geometry = new THREE.ExtrudeGeometry(outer, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.018,
    bevelThickness: 0.012,
    curveSegments: 16,
  });
  geometry.center();
  return mesh(geometry, material, name);
}

function tubeAlong(points: THREE.Vector3[], radius: number, material: THREE.Material, name: string) {
  const curve = new THREE.CatmullRomCurve3(points);
  const output = mesh(new THREE.TubeGeometry(curve, Math.max(16, points.length * 5), radius, 8, false), material, name);
  return output;
}

function arcPoints(radius: number, y: number, start = -1.18, end = 1.18, count = 32) {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index <= count; index += 1) {
    const angle = start + (index / count) * (end - start);
    points.push(new THREE.Vector3(Math.sin(angle) * radius, y, -Math.cos(angle) * radius));
  }
  return points;
}

function arcTube(
  radius: number,
  y: number,
  tubeRadius: number,
  material: THREE.Material,
  name: string,
  start = -1.18,
  end = 1.18,
) {
  return tubeAlong(arcPoints(radius, y, start, end), tubeRadius, material, name);
}

function arcRibbonGeometry(innerRadius: number, outerRadius: number, start = -1.2, end = 1.2, count = 40) {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index <= count; index += 1) {
    const angle = start + (index / count) * (end - start);
    positions.push(
      Math.sin(angle) * innerRadius, 0, -Math.cos(angle) * innerRadius,
      Math.sin(angle) * outerRadius, 0, -Math.cos(angle) * outerRadius,
    );
    if (index < count) {
      const base = index * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function domeCutawayGeometry(radius: number, verticalScale: number, baseY: number, quality: VaultIslandQuality) {
  const angularSegments = segments(quality, 12, 18, 24);
  const verticalSegments = segments(quality, 6, 9, 12);
  const start = -1.22;
  const end = 1.22;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let yIndex = 0; yIndex <= verticalSegments; yIndex += 1) {
    const theta = 0.14 + (yIndex / verticalSegments) * (Math.PI / 2 - 0.14);
    for (let angleIndex = 0; angleIndex <= angularSegments; angleIndex += 1) {
      const angle = start + (angleIndex / angularSegments) * (end - start);
      positions.push(
        Math.sin(angle) * radius * Math.sin(theta),
        baseY + Math.cos(theta) * radius * verticalScale,
        -Math.cos(angle) * radius * Math.sin(theta),
      );
      if (yIndex < verticalSegments && angleIndex < angularSegments) {
        const row = angularSegments + 1;
        const a = yIndex * row + angleIndex;
        const b = a + 1;
        const c = a + row;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addAtriumFloor(
  root: THREE.Group,
  materials: VaultInteriorArchitectureMaterials,
  quality: VaultIslandQuality,
) {
  const floor = new THREE.Group();
  floor.name = 'vault-palace-atrium-monumental-floor-system';
  const base = cylinder(4.26, 4.38, 0.24, segments(quality, 48, 72, 96), materials.floor, 'vault-palace-atrium-polished-marble-floor');
  base.position.y = -0.02;
  floor.add(base);

  const compass = mesh(
    new THREE.RingGeometry(0.96, 3.96, segments(quality, 32, 48, 64), 1),
    materials.floorShade,
    'vault-palace-atrium-midnight-compass-field',
  );
  compass.rotation.x = -Math.PI / 2;
  compass.position.y = 0.115;
  floor.add(compass);

  for (let index = 0; index < 24; index += 1) {
    const angle = (index / 24) * Math.PI * 2;
    const ray = box([0.035, 0.022, 2.7], [0, 0.145, 0], index % 3 === 0 ? materials.gold : materials.floor, 'vault-palace-atrium-compass-inlay-ray', 0.008);
    ray.rotation.y = angle;
    ray.position.x = Math.sin(angle) * 1.72;
    ray.position.z = Math.cos(angle) * 1.72;
    floor.add(ray);
  }

  for (const radius of [0.92, 2.1, 3.18, 4.0]) {
    const ring = horizontalRing(radius, radius === 4 ? 0.055 : 0.026, quality, materials.gold, 'vault-palace-atrium-floor-gold-ring');
    ring.position.y = 0.16;
    floor.add(ring);
  }
  root.add(floor);
}

function addAtriumRotunda(
  root: THREE.Group,
  materials: VaultInteriorArchitectureMaterials,
  quality: VaultIslandQuality,
) {
  const shell = new THREE.Group();
  shell.name = 'vault-palace-atrium-monumental-two-floor-shell';

  const wall = mesh(
    new THREE.CylinderGeometry(4.08, 4.18, 5.55, segments(quality, 48, 72, 96), 1, true, Math.PI * 0.18, Math.PI * 0.64),
    materials.wall,
    'vault-palace-atrium-continuous-ivory-rotunda-wall',
  );
  wall.position.y = 2.84;
  shell.add(wall);

  const levels = [
    { centerY: 1.32, panelHeight: 1.92, radius: 3.94, galleryY: 2.42, galleryName: 'vault-palace-atrium-first-tall-floor-gallery' },
    { centerY: 3.72, panelHeight: 1.72, radius: 3.82, galleryY: 4.72, galleryName: 'vault-palace-atrium-second-tall-floor-gallery' },
  ];

  levels.forEach((level, levelIndex) => {
    const gallery = new THREE.Group();
    gallery.name = level.galleryName;
    const slab = mesh(arcRibbonGeometry(level.radius - 0.72, level.radius + 0.14), materials.floor, 'vault-palace-atrium-gallery-marble-slab');
    slab.position.y = level.galleryY;
    gallery.add(slab);
    const marbleFascia = arcTube(level.radius - 0.28, level.galleryY - 0.13, 0.135, materials.floor, 'vault-palace-atrium-gallery-substantial-marble-fascia');
    const fascia = arcTube(level.radius - 0.28, level.galleryY - 0.02, 0.045, materials.gold, 'vault-palace-atrium-gallery-deep-gold-cornice');
    gallery.add(marbleFascia, fascia);

    const bayCount = 9;
    for (let index = 0; index < bayCount; index += 1) {
      const t = index / (bayCount - 1);
      const angle = -1.03 + t * 2.06;
      const x = Math.sin(angle) * level.radius;
      const z = -Math.cos(angle) * level.radius;
      const recess = archPanel(0.66, level.panelHeight, 0.08, levelIndex === 0 ? materials.enamel : materials.glass, 'vault-palace-atrium-deep-blue-arched-gallery-recess');
      recess.position.set(x, level.centerY, z + Math.cos(angle) * 0.04);
      recess.rotation.y = -angle;
      gallery.add(recess);
      const marbleFrame = archFrame(0.9, level.panelHeight + 0.26, 0.105, 0.11, materials.floor, 'vault-palace-atrium-layered-arch-ivory-frame');
      marbleFrame.position.set(x, level.centerY, z + Math.cos(angle) * 0.08);
      marbleFrame.rotation.y = -angle;
      gallery.add(marbleFrame);
      const frame = archFrame(0.8, level.panelHeight + 0.14, 0.08, 0.1, materials.gold, 'vault-palace-atrium-layered-arch-gold-frame');
      frame.position.set(x, level.centerY, z + Math.cos(angle) * 0.14);
      frame.rotation.y = -angle;
      gallery.add(frame);
      if (levelIndex === 1) {
        const glass = archPanel(0.5, level.panelHeight - 0.3, 0.025, materials.glass, 'vault-palace-atrium-upper-gallery-blue-glass');
        glass.position.set(x, level.centerY, z + Math.cos(angle) * 0.2);
        glass.rotation.y = -angle;
        gallery.add(glass);
      }

      if (index % 2 === 0) {
        const sconce = mesh(new THREE.OctahedronGeometry(0.08, 1), materials.warmGlow, 'vault-palace-atrium-warm-gallery-sconce');
        sconce.position.set(x, level.centerY - 0.12, z + Math.cos(angle) * 0.24);
        gallery.add(sconce);
      }
    }

    for (let index = 0; index <= bayCount; index += 1) {
      const t = index / bayCount;
      const angle = -1.12 + t * 2.24;
      const radius = level.radius - 0.05;
      const column = cylinder(0.115, 0.145, level.panelHeight + 0.44, segments(quality, 12, 16, 20), materials.floor, 'vault-palace-atrium-monumental-marble-column');
      column.position.set(Math.sin(angle) * radius, level.centerY, -Math.cos(angle) * radius);
      gallery.add(column);
      const capital = box([0.34, 0.12, 0.32], [column.position.x, level.centerY + level.panelHeight / 2 + 0.18, column.position.z], materials.gold, 'vault-palace-atrium-column-gold-capital', 0.025);
      capital.rotation.y = -angle;
      gallery.add(capital);
    }

    for (let index = 0; index < 20; index += 1) {
        const angle = -1.06 + (index / 19) * 2.12;
        const radius = level.radius - 0.82;
        const post = cylinder(0.024, 0.034, 0.54, 8, index % 4 === 0 ? materials.floor : materials.gold, 'vault-palace-atrium-gallery-baluster');
        post.position.set(Math.sin(angle) * radius, level.galleryY + 0.26, -Math.cos(angle) * radius);
        gallery.add(post);
    }
    const rail = arcTube(level.radius - 0.82, level.galleryY + 0.54, 0.04, materials.gold, 'vault-palace-atrium-gallery-continuous-rail', -1.08, 1.08);
    gallery.add(rail);
    shell.add(gallery);
  });

  for (const y of [0.34, 2.45, 4.74, 5.48]) {
    const band = arcTube(y === 5.48 ? 4.02 : 4.08, y, y === 5.48 ? 0.09 : 0.045, y === 0.34 ? materials.darkGold : materials.gold, 'vault-palace-atrium-architectural-cornice-band', -1.24, 1.24);
    shell.add(band);
  }
  root.add(shell);
}

function addAtriumDome(
  root: THREE.Group,
  materials: VaultInteriorArchitectureMaterials,
  quality: VaultIslandQuality,
) {
  const dome = new THREE.Group();
  dome.name = 'vault-palace-atrium-visible-main-dome-underside';
  const radius = 4.02;
  const baseY = 5.48;
  const verticalScale = 0.64;
  const blueShell = mesh(domeCutawayGeometry(radius, verticalScale, baseY, quality), materials.enamel, 'vault-palace-atrium-deep-blue-dome-interior');
  dome.add(blueShell);

  for (let index = 0; index < 13; index += 1) {
    const phi = -1.18 + (index / 12) * 2.36;
    const points: THREE.Vector3[] = [];
    for (let step = 0; step <= 10; step += 1) {
      const theta = 0.14 + (step / 10) * (Math.PI / 2 - 0.14);
      points.push(new THREE.Vector3(
        Math.sin(theta) * radius * Math.sin(phi),
        baseY + Math.cos(theta) * radius * verticalScale,
        -Math.sin(theta) * radius * Math.cos(phi),
      ));
    }
    dome.add(tubeAlong(points, 0.035, materials.gold, 'vault-palace-atrium-dome-substantial-gold-rib'));
  }

  const springRing = arcTube(radius, baseY, 0.075, materials.gold, 'vault-palace-atrium-dome-spring-gold-cornice', -1.24, 1.24);
  dome.add(springRing);
  const oculus = horizontalRing(0.56, 0.085, quality, materials.gold, 'vault-palace-atrium-dome-oculus-gold-ring');
  oculus.position.y = baseY + radius * verticalScale - 0.08;
  dome.add(oculus);
  const oculusGem = cylinder(0.48, 0.48, 0.04, segments(quality, 24, 36, 48), materials.cyanGem, 'vault-palace-atrium-dome-oculus-cyan-gem');
  oculusGem.position.y = oculus.position.y + 0.01;
  dome.add(oculusGem);
  const glow = cylinder(0.68, 0.68, 0.025, segments(quality, 24, 36, 48), materials.cyanGlow, 'vault-palace-atrium-dome-oculus-glow');
  glow.position.y = oculus.position.y - 0.02;
  dome.add(glow);
  root.add(dome);
}

function addGrandEntryAndStair(
  root: THREE.Group,
  materials: VaultInteriorArchitectureMaterials,
  quality: VaultIslandQuality,
) {
  const stair = new THREE.Group();
  stair.name = 'vault-palace-atrium-grand-entry-and-split-stair-system';

  const portal = archPanel(1.48, 2.45, 0.16, materials.enamel, 'vault-palace-atrium-monumental-entry-blue-door');
  portal.position.set(0, 4.04, -3.88);
  stair.add(portal);
  const portalFrame = archFrame(1.78, 2.72, 0.12, 0.18, materials.gold, 'vault-palace-atrium-monumental-entry-gold-frame');
  portalFrame.position.set(0, 4.04, -3.77);
  stair.add(portalFrame);

  const upperLanding = box([2.45, 0.28, 1.42], [0, 3.06, -2.72], materials.floor, 'vault-palace-atrium-entry-landing', 0.08);
  stair.add(upperLanding);
  const landingFascia = box([2.58, 0.26, 0.16], [0, 2.92, -2.0], materials.gold, 'vault-palace-atrium-entry-landing-gold-fascia', 0.035);
  stair.add(landingFascia);

  for (let index = 0; index < 7; index += 1) {
    const step = box([1.34 + index * 0.08, 0.16, 0.34], [0, 3.62 - index * 0.1, -3.55 + index * 0.22], materials.floor, 'vault-palace-atrium-central-entry-marble-step', 0.03);
    stair.add(step);
  }

  for (const side of [-1, 1] as const) {
    const outerRailPoints: THREE.Vector3[] = [];
    const innerRailPoints: THREE.Vector3[] = [];
    for (let index = 0; index < 22; index += 1) {
      const t = index / 21;
      const eased = t * t * (3 - 2 * t);
      const x = side * (0.44 + eased * 1.72);
      const y = 2.84 - t * 2.46;
      const z = -2.08 + t * 2.52;
      const rotationY = side * (-0.06 - eased * 0.42);
      const stepWidth = 0.9 + Math.sin(t * Math.PI) * 0.12;
      const step = box([stepWidth, 0.17, 0.36], [x, y, z], materials.floor, 'vault-palace-atrium-split-descent-marble-step', 0.035);
      step.rotation.y = rotationY;
      stair.add(step);
      if (index % 4 === 0 || index === 21) {
        const outwardX = x + side * stepWidth * 0.43;
        const post = cylinder(0.055, 0.072, 0.68, 10, materials.floor, 'vault-palace-atrium-stair-marble-newel');
        post.position.set(outwardX, y + 0.38, z);
        stair.add(post);
        outerRailPoints.push(new THREE.Vector3(outwardX, y + 0.7, z));
        innerRailPoints.push(new THREE.Vector3(x - side * stepWidth * 0.43, y + 0.66, z));
      }
    }
    stair.add(tubeAlong(outerRailPoints, 0.085, materials.floor, 'vault-palace-atrium-stair-substantial-outer-marble-balustrade'));
    stair.add(tubeAlong(outerRailPoints.map((point) => point.clone().add(new THREE.Vector3(0, 0.09, 0))), 0.035, materials.gold, 'vault-palace-atrium-stair-continuous-outer-gold-rail'));
    stair.add(tubeAlong(innerRailPoints, 0.07, materials.floor, 'vault-palace-atrium-stair-substantial-inner-marble-balustrade'));

    const stringerPoints = outerRailPoints.map((point) => new THREE.Vector3(point.x - side * 0.12, point.y - 0.84, point.z));
    stair.add(tubeAlong(stringerPoints, 0.19, materials.floor, 'vault-palace-atrium-stair-massive-marble-stringer'));
    const lowerLanding = box([1.08, 0.24, 0.76], [side * 2.28, 0.18, 0.52], materials.floor, 'vault-palace-atrium-lower-stair-landing', 0.07);
    lowerLanding.rotation.y = side * -0.4;
    stair.add(lowerLanding);
  }

  const descentVoid = cylinder(1.22, 1.42, 0.3, segments(quality, 32, 48, 64), materials.wallTrim, 'vault-palace-atrium-central-vault-descent-void');
  descentVoid.position.set(0, 0.03, 0.28);
  stair.add(descentVoid);
  const descentRim = horizontalRing(1.4, 0.075, quality, materials.gold, 'vault-palace-atrium-descent-void-gold-rim');
  descentRim.position.set(0, 0.22, 0.28);
  stair.add(descentRim);
  const descentGlow = cylinder(1.12, 1.12, 0.04, segments(quality, 32, 48, 64), materials.cyanGlow, 'vault-palace-atrium-blue-vault-glow-below');
  descentGlow.position.set(0, 0.2, 0.28);
  stair.add(descentGlow);
  root.add(stair);
}

function addGardenPortals(
  root: THREE.Group,
  materials: VaultInteriorArchitectureMaterials,
) {
  const portals = new THREE.Group();
  portals.name = 'vault-palace-atrium-paired-garden-portals';
  for (const side of [-1, 1] as const) {
    const portal = new THREE.Group();
    portal.name = side < 0 ? 'vault-palace-atrium-left-garden-door' : 'vault-palace-atrium-right-garden-door';
    portal.position.set(side * 3.45, 1.18, -0.5);
    portal.rotation.y = side * -0.52;
    const warmOpening = archPanel(0.92, 1.9, 0.08, materials.warmGlow, 'vault-palace-atrium-garden-door-warm-light');
    const frame = archFrame(1.12, 2.12, 0.1, 0.13, materials.gold, 'vault-palace-atrium-garden-door-gold-arch');
    frame.position.z = 0.08;
    const threshold = box([1.28, 0.16, 0.72], [0, -1.0, 0.25], materials.floor, 'vault-palace-atrium-garden-door-threshold', 0.04);
    portal.add(warmOpening, frame, threshold);
    portals.add(portal);
  }
  root.add(portals);
}

export function createVaultPalaceAtriumArchitectureV3(
  materials: VaultInteriorArchitectureMaterials,
  quality: VaultIslandQuality,
) {
  const root = new THREE.Group();
  root.name = 'vault-palace-atrium-architecture-v3';
  root.userData.sculptRuntime = {
    id: 'vault-palace-atrium-architecture-v3',
    constructionFamily: 'open-front-cutaway-arc-supported-bifurcated-stair-family-002',
    reviewUnits: ['atrium-rotunda-shell', 'atrium-dome-oculus', 'atrium-split-grand-stair'],
  };
  addAtriumFloor(root, materials, quality);
  addAtriumRotunda(root, materials, quality);
  addAtriumDome(root, materials, quality);
  addGrandEntryAndStair(root, materials, quality);
  addGardenPortals(root, materials);
  return root;
}
