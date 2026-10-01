import * as THREE from 'three';
import type { TravelInterludeVignette } from '../services/islandTravelInterlude';

/**
 * Cozy ship-interior travel interlude scene (user request 2026-09-30). A
 * lightweight, purpose-built cut of the expedition ship's living sanctuary:
 * the Great Tree under a glass dome, its wooden tree-house deck with fairy
 * lights, a bench with a steaming coffee mug, and planets drifting past the
 * glass. Built procedurally (no external assets) so it opens instantly on a
 * phone mid-travel instead of loading the full ship model.
 */
export type ShipTravelInteriorQuality = 'high' | 'low';

export interface ShipTravelInteriorScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Advance the scene; `progress` is 0..1 through the interlude. */
  update: (options: { elapsedSeconds: number; progress: number; reducedMotion: boolean; aspect: number }) => void;
  dispose: () => void;
}

interface VignetteCamera {
  from: THREE.Vector3;
  to: THREE.Vector3;
  lookFrom: THREE.Vector3;
  lookTo: THREE.Vector3;
  fov: number;
  /** Azimuth (radians, x = cos, z = sin) the hero planet crosses at mid-scene. */
  planetAzimuth: number;
  planetElevation: number;
}

const DECK_Y = 4.4;
const DOME_RADIUS = 7.2;

const VIGNETTE_CAMERAS: Record<TravelInterludeVignette, VignetteCamera> = {
  // Lying on the deck high in the tree: canopy overhead, the dome and a
  // planet out past the railing.
  'treehouse-deck': {
    from: new THREE.Vector3(0.95, DECK_Y + 0.4, 1.2),
    to: new THREE.Vector3(1.05, DECK_Y + 0.42, 1.32),
    lookFrom: new THREE.Vector3(4.0, DECK_Y + 4.0, 5.1),
    lookTo: new THREE.Vector3(4.3, DECK_Y + 4.15, 4.9),
    fov: 64,
    planetAzimuth: 0.95,
    planetElevation: 0.6,
  },
  // Sitting on the window bench with a cup of coffee, looking at the tree.
  'coffee-by-the-tree': {
    from: new THREE.Vector3(6.15, 1.15, 2.3),
    to: new THREE.Vector3(5.95, 1.18, 2.2),
    lookFrom: new THREE.Vector3(0, 3.7, -0.2),
    lookTo: new THREE.Vector3(0, 3.85, 0.1),
    fov: 56,
    planetAzimuth: 3.5 + 0.3,
    planetElevation: 0.36,
  },
  // On the garden floor at the canopy's edge, gazing up through the dome.
  'dome-stargazing': {
    from: new THREE.Vector3(-2.9, 0.6, 2.7),
    to: new THREE.Vector3(-2.75, 0.62, 2.55),
    lookFrom: new THREE.Vector3(-4.4, 6.4, 3.6),
    lookTo: new THREE.Vector3(-4.2, 6.6, 3.3),
    fov: 66,
    planetAzimuth: 2.3,
    planetElevation: 0.95,
  },
};

function seeded(index: number, salt: number): number {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function makePlanetTexture(base: string, band: string, seed: number): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 64);
  for (let i = 0; i < 7; i += 1) {
    ctx.globalAlpha = 0.25 + seeded(i, seed) * 0.35;
    ctx.fillStyle = i % 2 === 0 ? band : base;
    const y = seeded(i, seed + 1) * 64;
    ctx.fillRect(0, y, 128, 2 + seeded(i, seed + 2) * 7);
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createShipTravelInteriorScene(
  vignette: TravelInterludeVignette,
  quality: ShipTravelInteriorQuality,
): ShipTravelInteriorScene {
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T) => { disposables.push(item); return item; };
  const scene = new THREE.Scene();
  scene.name = 'SHIP_TRAVEL_INTERIOR';
  scene.background = new THREE.Color('#0b1024');
  scene.fog = new THREE.Fog('#1a1430', 14, 60);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 120);

  // ── Light: warm lanterns inside, cool starlight outside ───────────────
  scene.add(new THREE.HemisphereLight('#ffd9a8', '#2b2340', 1.1));
  const starlight = new THREE.DirectionalLight('#9fc4ff', 0.9);
  starlight.position.set(6, 10, 4);
  scene.add(starlight);
  const lanternA = new THREE.PointLight('#ffb766', 3.2, 9, 1.6);
  lanternA.position.set(1.4, DECK_Y + 1.1, 0.8);
  scene.add(lanternA);
  const lanternB = new THREE.PointLight('#ffae5c', 2.4, 8, 1.6);
  lanternB.position.set(4.4, 1.8, 1.0);
  scene.add(lanternB);
  const canopyUplight = new THREE.PointLight('#ffd49a', 2.6, 9, 1.4);
  canopyUplight.position.set(0, DECK_Y + 1.6, 0);
  scene.add(canopyUplight);
  // A lantern hangs under the deck so it reads as warm wood from below.
  const underDeckLight = new THREE.PointLight('#ffb35c', 2.2, 7, 1.5);
  underDeckLight.position.set(0.9, DECK_Y - 0.9, 1.2);
  scene.add(underDeckLight);

  // ── Materials ────────────────────────────────────────────────────────
  const bark = track(new THREE.MeshStandardMaterial({ color: '#7a5034', roughness: 0.9 }));
  const foliage = track(new THREE.MeshStandardMaterial({ color: '#6fae55', roughness: 0.85, flatShading: true, emissive: '#1d3a12', emissiveIntensity: 0.35 }));
  const foliageLight = track(new THREE.MeshStandardMaterial({ color: '#a9d173', roughness: 0.85, flatShading: true, emissive: '#2c4512', emissiveIntensity: 0.35 }));
  const wood = track(new THREE.MeshStandardMaterial({ color: '#a8743f', roughness: 0.8 }));
  const darkWood = track(new THREE.MeshStandardMaterial({ color: '#6e4826', roughness: 0.85 }));
  const grass = track(new THREE.MeshStandardMaterial({ color: '#4f7f3d', roughness: 0.95 }));
  const stone = track(new THREE.MeshStandardMaterial({ color: '#c9b79a', roughness: 0.9 }));
  const frame = track(new THREE.MeshStandardMaterial({ color: '#d9d2c3', roughness: 0.4, metalness: 0.5 }));
  const glass = track(new THREE.MeshStandardMaterial({
    color: '#9fd7ff', transparent: true, opacity: 0.07, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false,
  }));
  const fabric = track(new THREE.MeshStandardMaterial({ color: '#d9725a', roughness: 0.95 }));
  const fabricAlt = track(new THREE.MeshStandardMaterial({ color: '#efe1c4', roughness: 0.95 }));
  const ceramic = track(new THREE.MeshStandardMaterial({ color: '#e9785a', roughness: 0.35, emissive: '#3a160c', emissiveIntensity: 0.4 }));
  const coffee = track(new THREE.MeshStandardMaterial({ color: '#3b2314', roughness: 0.2 }));
  const fairy = track(new THREE.MeshBasicMaterial({ color: '#ffd38a' }));
  const lanternGlow = track(new THREE.MeshBasicMaterial({ color: '#ffc77a' }));
  const steamMaterial = track(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.1, depthWrite: false }));

  // ── Floor, path and dome ────────────────────────────────────────────
  const floor = new THREE.Mesh(track(new THREE.CircleGeometry(DOME_RADIUS, 48)), grass);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const path = new THREE.Mesh(track(new THREE.RingGeometry(3.2, 3.9, 48)), stone);
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.01;
  scene.add(path);
  const domeGlass = new THREE.Mesh(track(new THREE.SphereGeometry(DOME_RADIUS, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2)), glass);
  domeGlass.renderOrder = 2;
  scene.add(domeGlass);
  const ribGeometry = track(new THREE.TorusGeometry(DOME_RADIUS, 0.05, 6, 48, Math.PI));
  const ribCount = quality === 'low' ? 6 : 10;
  for (let i = 0; i < ribCount; i += 1) {
    const rib = new THREE.Mesh(ribGeometry, frame);
    rib.rotation.y = (i / ribCount) * Math.PI;
    scene.add(rib);
  }
  [0.32, 0.62, 0.86].forEach((t) => {
    const latitude = t * (Math.PI / 2);
    const ring = new THREE.Mesh(
      track(new THREE.TorusGeometry(Math.cos(latitude) * DOME_RADIUS, 0.04, 6, 48)),
      frame,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = Math.sin(latitude) * DOME_RADIUS;
    scene.add(ring);
  });

  // ── The Great Tree ──────────────────────────────────────────────────
  const tree = new THREE.Group();
  tree.name = 'TRAVEL_GREAT_TREE';
  scene.add(tree);
  const trunk = new THREE.Mesh(track(new THREE.LatheGeometry([
    new THREE.Vector2(0.95, 0),
    new THREE.Vector2(0.7, 0.4),
    new THREE.Vector2(0.55, 2.0),
    new THREE.Vector2(0.45, 4.0),
    new THREE.Vector2(0.32, 6.0),
    new THREE.Vector2(0.2, 6.6),
  ], quality === 'low' ? 10 : 16)), bark);
  tree.add(trunk);
  const branchGeometry = track(new THREE.CylinderGeometry(0.08, 0.16, 1, 7));
  const crownGeometry = track(new THREE.IcosahedronGeometry(1, 1));
  const crownCount = quality === 'low' ? 16 : 26;
  const crowns: THREE.Mesh[] = [];
  for (let i = 0; i < crownCount; i += 1) {
    const angle = seeded(i, 1) * Math.PI * 2;
    const radius = 0.6 + seeded(i, 2) * 2.6;
    const y = DECK_Y + 2.3 + seeded(i, 3) * 2.0 - radius * 0.22;
    const crown = new THREE.Mesh(crownGeometry, i % 3 === 0 ? foliageLight : foliage);
    const size = 0.9 + seeded(i, 4) * 0.8;
    crown.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    crown.scale.set(size, size * 0.8, size);
    crown.userData.phase = seeded(i, 5) * Math.PI * 2;
    crown.userData.baseY = y;
    tree.add(crown);
    crowns.push(crown);
    if (i % 3 === 0) {
      const branch = new THREE.Mesh(branchGeometry, bark);
      const from = new THREE.Vector3(0, y - 1.1, 0);
      const to = crown.position.clone();
      branch.position.copy(from).lerp(to, 0.5);
      branch.scale.y = from.distanceTo(to);
      branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
      tree.add(branch);
    }
  }

  // ── Tree-house deck with railing and fairy lights ───────────────────
  const deck = new THREE.Group();
  deck.name = 'TRAVEL_TREEHOUSE_DECK';
  deck.position.y = DECK_Y;
  scene.add(deck);
  const deckBase = new THREE.Mesh(track(new THREE.CylinderGeometry(2.45, 2.3, 0.14, 40)), wood);
  deckBase.position.y = -0.08;
  deck.add(deckBase);
  const plankWidth = 0.3;
  for (let x = -2.25; x <= 2.25; x += plankWidth) {
    const half = Math.sqrt(Math.max(0, 2.4 * 2.4 - x * x));
    if (half < 0.2) continue;
    const plank = new THREE.Mesh(track(new THREE.BoxGeometry(plankWidth - 0.025, 0.04, half * 2)), Math.round(x / plankWidth) % 2 === 0 ? wood : darkWood);
    plank.position.set(x, 0.01, 0);
    deck.add(plank);
  }
  const postGeometry = track(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6));
  const postCount = 16;
  for (let i = 0; i < postCount; i += 1) {
    const angle = (i / postCount) * Math.PI * 2;
    const post = new THREE.Mesh(postGeometry, darkWood);
    post.position.set(Math.cos(angle) * 2.38, 0.35, Math.sin(angle) * 2.38);
    deck.add(post);
  }
  const rail = new THREE.Mesh(track(new THREE.TorusGeometry(2.38, 0.045, 6, 48)), wood);
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.7;
  deck.add(rail);
  const fairyGeometry = track(new THREE.SphereGeometry(0.035, 6, 4));
  const fairyLights: THREE.Mesh[] = [];
  const fairyCount = quality === 'low' ? 24 : 40;
  for (let i = 0; i < fairyCount; i += 1) {
    const angle = (i / fairyCount) * Math.PI * 2;
    const bulb = new THREE.Mesh(fairyGeometry, fairy);
    bulb.position.set(Math.cos(angle) * 2.38, 0.62 - Math.abs(Math.sin(i * 1.3)) * 0.1, Math.sin(angle) * 2.38);
    deck.add(bulb);
    fairyLights.push(bulb);
  }
  // Cushion, blanket and a lantern where you lie and look up.
  const cushion = new THREE.Mesh(track(new THREE.BoxGeometry(0.7, 0.16, 0.45)), fabricAlt);
  cushion.position.set(0.85, 0.12, 1.05);
  cushion.rotation.y = -0.5;
  deck.add(cushion);
  const blanket = new THREE.Mesh(track(new THREE.BoxGeometry(1.1, 0.1, 0.8)), fabric);
  blanket.position.set(1.35, 0.1, 1.75);
  blanket.rotation.y = -0.6;
  deck.add(blanket);
  const lanternGeometry = track(new THREE.CylinderGeometry(0.1, 0.12, 0.24, 8));
  const deckLantern = new THREE.Mesh(lanternGeometry, lanternGlow);
  deckLantern.position.set(1.7, 0.2, 0.5);
  deck.add(deckLantern);

  // ── Window bench, table and the coffee mug ──────────────────────────
  const bench = new THREE.Group();
  bench.name = 'TRAVEL_WINDOW_BENCH';
  bench.position.set(5.6, 0, 1.7);
  bench.lookAt(0, 0, 0);
  scene.add(bench);
  const seat = new THREE.Mesh(track(new THREE.BoxGeometry(1.8, 0.12, 0.6)), wood);
  seat.position.y = 0.5;
  bench.add(seat);
  const legGeometry = track(new THREE.BoxGeometry(0.1, 0.5, 0.5));
  [-0.75, 0.75].forEach((x) => {
    const leg = new THREE.Mesh(legGeometry, darkWood);
    leg.position.set(x, 0.25, 0);
    bench.add(leg);
  });
  const table = new THREE.Mesh(track(new THREE.CylinderGeometry(0.38, 0.38, 0.06, 20)), wood);
  table.position.set(4.7, 0.78, 1.0);
  scene.add(table);
  const tableLeg = new THREE.Mesh(track(new THREE.CylinderGeometry(0.05, 0.08, 0.76, 8)), darkWood);
  tableLeg.position.set(4.7, 0.38, 1.0);
  scene.add(tableLeg);
  const benchLantern = new THREE.Mesh(lanternGeometry, lanternGlow);
  benchLantern.position.set(4.55, 0.93, 0.85);
  scene.add(benchLantern);

  const mug = new THREE.Group();
  mug.name = 'TRAVEL_COFFEE_MUG';
  const cup = new THREE.Mesh(track(new THREE.CylinderGeometry(0.07, 0.06, 0.15, 16)), ceramic);
  const liquid = new THREE.Mesh(track(new THREE.CircleGeometry(0.062, 16)), coffee);
  liquid.rotation.x = -Math.PI / 2;
  liquid.position.y = 0.065;
  const handle = new THREE.Mesh(track(new THREE.TorusGeometry(0.04, 0.012, 6, 12)), ceramic);
  handle.position.set(0.08, 0, 0);
  mug.add(cup, liquid, handle);
  scene.add(mug);
  const steamGeometry = track(new THREE.SphereGeometry(0.014, 8, 6));
  const steam: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i += 1) {
    const puff = new THREE.Mesh(steamGeometry, steamMaterial);
    puff.userData.offset = i / 6;
    mug.add(puff);
    steam.push(puff);
  }

  // ── Outside the glass: stars, a soft nebula and drifting planets ────
  const starCount = quality === 'low' ? 500 : 900;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    const azimuth = seeded(i, 11) * Math.PI * 2;
    const vertical = seeded(i, 12) * 1.9 - 0.5;
    const radial = Math.sqrt(Math.max(0, 1 - Math.min(1, vertical * vertical)));
    const radius = 70 + seeded(i, 13) * 8;
    starPositions[i * 3] = Math.cos(azimuth) * radial * radius;
    starPositions[i * 3 + 1] = vertical * radius;
    starPositions[i * 3 + 2] = Math.sin(azimuth) * radial * radius;
  }
  const starGeometry = track(new THREE.BufferGeometry());
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeometry, track(new THREE.PointsMaterial({
    color: '#e8f1ff', size: 0.32, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false, fog: false,
  })));
  scene.add(stars);
  const nebula = new THREE.Mesh(
    track(new THREE.SphereGeometry(90, 24, 12)),
    track(new THREE.MeshBasicMaterial({ color: '#2a1d4a', side: THREE.BackSide, fog: false, transparent: true, opacity: 0.55 })),
  );
  scene.add(nebula);

  const planets = new THREE.Group();
  planets.name = 'TRAVEL_DRIFTING_PLANETS';
  scene.add(planets);
  const planetSpecs = [
    { radius: 5.2, distance: 34, base: '#e39a6b', band: '#f6d2a6', ring: true, offset: 0, lift: 0 },
    { radius: 2.2, distance: 40, base: '#6fb5d8', band: '#cdeaf5', ring: false, offset: -0.42, lift: 4 },
    { radius: 1.2, distance: 30, base: '#b9a3e3', band: '#efe6ff', ring: false, offset: 0.5, lift: -2 },
  ];
  const planetMeshes = planetSpecs.map((spec, index) => {
    const texture = makePlanetTexture(spec.base, spec.band, index * 7 + 3);
    if (texture) track(texture);
    const material = track(new THREE.MeshStandardMaterial({
      color: texture ? '#ffffff' : spec.base, map: texture ?? undefined, roughness: 0.85, emissive: spec.base, emissiveIntensity: 0.18, fog: false,
    }));
    const planet = new THREE.Mesh(track(new THREE.SphereGeometry(spec.radius, 32, 18)), material);
    planet.rotation.z = 0.35;
    if (spec.ring) {
      const ringMaterial = track(new THREE.MeshBasicMaterial({ color: '#ffe2b8', transparent: true, opacity: 0.72, side: THREE.DoubleSide, fog: false }));
      const ring = new THREE.Mesh(track(new THREE.RingGeometry(spec.radius * 1.35, spec.radius * 2.0, 48)), ringMaterial);
      ring.rotation.x = Math.PI / 2.4;
      planet.add(ring);
    }
    planets.add(planet);
    return { planet, spec };
  });

  const shot = VIGNETTE_CAMERAS[vignette];
  // The coffee vignette keeps the mug in the lower foreground; elsewhere it
  // sits on the bench table.
  const mugOnTable = new THREE.Vector3(4.82, 0.885, 1.12);
  const lookTarget = new THREE.Vector3();
  const position = new THREE.Vector3();

  const update: ShipTravelInteriorScene['update'] = ({ elapsedSeconds, progress, reducedMotion, aspect }) => {
    const t = reducedMotion ? 0.5 : THREE.MathUtils.clamp(progress, 0, 1);
    const eased = t * t * (3 - 2 * t);
    position.lerpVectors(shot.from, shot.to, eased);
    lookTarget.lerpVectors(shot.lookFrom, shot.lookTo, eased);
    if (!reducedMotion) {
      // A slow breathing bob: you're resting, not walking.
      position.y += Math.sin(elapsedSeconds * 0.9) * 0.015;
    }
    camera.position.copy(position);
    camera.fov = aspect < 0.75 ? shot.fov + 8 : shot.fov;
    camera.aspect = aspect;
    camera.lookAt(lookTarget);
    camera.updateProjectionMatrix();

    if (vignette === 'coffee-by-the-tree') {
      // Hold the mug low-right in view, like your own hands.
      const forward = lookTarget.clone().sub(camera.position).normalize();
      const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
      mug.position.copy(camera.position)
        .addScaledVector(forward, 0.62)
        .addScaledVector(right, aspect < 0.75 ? 0.08 : 0.2)
        .addScaledVector(camera.up, -0.2);
      mug.scale.setScalar(1);
    } else {
      mug.position.copy(mugOnTable);
      mug.scale.setScalar(1);
    }
    steam.forEach((puff, index) => {
      const cycle = reducedMotion ? puff.userData.offset as number : ((elapsedSeconds * 0.35 + (puff.userData.offset as number)) % 1);
      puff.position.set(Math.sin(cycle * 6 + index) * 0.02, 0.1 + cycle * 0.28, 0);
      puff.scale.setScalar(0.6 + cycle * 1.6);
    });

    // Planets slide past the glass: the hero crosses the view at mid-scene.
    const drift = reducedMotion ? 0 : (t - 0.5) * 0.5;
    planetMeshes.forEach(({ planet, spec }, index) => {
      const azimuth = shot.planetAzimuth + spec.offset - drift * (1 + index * 0.25);
      const elevation = shot.planetElevation + spec.lift / spec.distance;
      planet.position.set(
        Math.cos(azimuth) * Math.cos(elevation) * spec.distance,
        Math.sin(elevation) * spec.distance,
        Math.sin(azimuth) * Math.cos(elevation) * spec.distance,
      );
      planet.rotation.y = elapsedSeconds * (reducedMotion ? 0 : 0.05 + index * 0.02);
    });
    stars.rotation.y = reducedMotion ? 0 : -elapsedSeconds * 0.01;

    if (!reducedMotion) {
      crowns.forEach((crown) => {
        crown.position.y = (crown.userData.baseY as number) + Math.sin(elapsedSeconds * 0.7 + (crown.userData.phase as number)) * 0.03;
      });
      fairyLights.forEach((bulb, index) => {
        bulb.visible = Math.sin(elapsedSeconds * 1.6 + index * 0.9) > -0.85;
      });
    }
    lanternA.intensity = 3.2 + (reducedMotion ? 0 : Math.sin(elapsedSeconds * 3.1) * 0.15);
  };

  return {
    scene,
    camera,
    update,
    dispose() {
      disposables.forEach((item) => item.dispose());
    },
  };
}
