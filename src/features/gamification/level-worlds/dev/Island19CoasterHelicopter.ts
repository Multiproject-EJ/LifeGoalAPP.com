import * as THREE from 'three';

/**
 * Island 019 presentation: the Director's helicopter flies each ordered
 * coaster section in, lowers the crate onto the station pad and leaves.
 * Original procedural geometry; no gameplay authority.
 */
export const ISLAND_19_HELICOPTER_DELIVERY_SECONDS = 6.4;

export interface Island19CoasterHelicopterRuntime {
  root: THREE.Group;
  /** Starts a delivery flight at `elapsedSeconds` (scene clock). */
  playDelivery: (elapsedSeconds: number) => void;
  /** `crateParked`: a delivered, not-yet-installed section waits on the pad. */
  animate: (elapsedSeconds: number, crateParked: boolean, reducedMotion: boolean) => void;
  isFlying: () => boolean;
}

export interface Island19DeliveryPose {
  helicopter: THREE.Vector3;
  heading: number;
  cableLength: number;
  crateAttached: boolean;
  visible: boolean;
}

const START = new THREE.Vector3(-17, 10.5, 7);
const HOVER = new THREE.Vector3(-1.7, 6.2, 1.9);
const EXIT = new THREE.Vector3(18, 11.5, -6);
const PAD = new THREE.Vector3(-1.7, 0.36, 1.9);
const FLY_IN = 2.3;
const LOWER_END = 3.7;
const RELEASE_END = 4.1;

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Pure timeline so the flight is deterministic and testable. */
export function resolveIsland19DeliveryPose(t: number): Island19DeliveryPose {
  const hoverCable = HOVER.y - PAD.y - 0.55;
  if (t < 0 || t >= ISLAND_19_HELICOPTER_DELIVERY_SECONDS) {
    return { helicopter: START.clone(), heading: 0, cableLength: 0.6, crateAttached: false, visible: false };
  }
  if (t < FLY_IN) {
    const k = smooth(t / FLY_IN);
    const position = START.clone().lerp(HOVER, k);
    position.y += Math.sin(k * Math.PI) * 1.2;
    return { helicopter: position, heading: Math.atan2(HOVER.x - START.x, HOVER.z - START.z), cableLength: 0.6, crateAttached: true, visible: true };
  }
  if (t < LOWER_END) {
    const k = smooth((t - FLY_IN) / (LOWER_END - FLY_IN));
    return { helicopter: HOVER.clone(), heading: Math.atan2(HOVER.x - START.x, HOVER.z - START.z) * (1 - k), cableLength: 0.6 + (hoverCable - 0.6) * k, crateAttached: true, visible: true };
  }
  if (t < RELEASE_END) {
    return { helicopter: HOVER.clone(), heading: 0, cableLength: hoverCable, crateAttached: false, visible: true };
  }
  const k = smooth((t - RELEASE_END) / (ISLAND_19_HELICOPTER_DELIVERY_SECONDS - RELEASE_END));
  const position = HOVER.clone().lerp(EXIT, k);
  return { helicopter: position, heading: Math.atan2(EXIT.x - HOVER.x, EXIT.z - HOVER.z) * Math.min(1, k * 3), cableLength: Math.max(0.6, hoverCable * (1 - k * 2)), crateAttached: false, visible: true };
}

function createCrate(materials: { wood: THREE.Material; gold: THREE.Material; red: THREE.Material }) {
  const crate = new THREE.Group();
  crate.name = 'ISLAND_19_COASTER_SECTION_CRATE';
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 1.1), materials.wood);
  const bandA = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.12, 1.14), materials.gold);
  bandA.position.y = 0.2;
  const bandB = bandA.clone();
  bandB.position.y = -0.2;
  const rail = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 6, 16, Math.PI), materials.red);
  rail.position.y = 0.42;
  crate.add(box, bandA, bandB, rail);
  return crate;
}

export function createIsland19CoasterHelicopter(): Island19CoasterHelicopterRuntime {
  const red = new THREE.MeshStandardMaterial({ color: 0xc8322a, roughness: 0.38, metalness: 0.25 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xfff1d0, roughness: 0.5 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xf2b632, roughness: 0.3, metalness: 0.7, emissive: 0x3a2400 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fe6ff, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.72 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b2440, roughness: 0.6 });
  const wood = new THREE.MeshStandardMaterial({ color: 0xb07a3c, roughness: 0.8 });
  const cableMaterial = new THREE.MeshBasicMaterial({ color: 0x3a3a3a });

  const root = new THREE.Group();
  root.name = 'ISLAND_19_COASTER_DELIVERY_HELICOPTER_ROOT';
  root.userData = { presentationOnly: true };

  const heli = new THREE.Group();
  heli.name = 'ISLAND_19_COASTER_DELIVERY_HELICOPTER';
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 18, 12), red);
  body.scale.set(1, 0.82, 1.35);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.07, 6, 24), cream);
  stripe.rotation.y = Math.PI / 2;
  stripe.scale.set(1, 0.84, 1.36);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  cockpit.position.set(0, 0.12, 0.72);
  cockpit.rotation.x = Math.PI / 2.6;
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 2.3, 10), red);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 0.2, -1.9);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.36), cream);
  fin.position.set(0, 0.48, -2.95);
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.1, 0.5, -2.95);
  const tailBlade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.62, 0.08), dark);
  tailRotor.add(tailBlade, tailBlade.clone().rotateX(Math.PI / 2));
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.32, 8), gold);
  mast.position.y = 0.86;
  const mainRotor = new THREE.Group();
  mainRotor.position.y = 1.04;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.04, 0.22), dark);
  mainRotor.add(blade, blade.clone().rotateY(Math.PI / 2));
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), gold);
  mainRotor.add(hub);
  const skids = new THREE.Group();
  for (const x of [-0.55, 0.55]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.9, 6), gold);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(x, -0.86, 0.05);
    const strutA = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.36, 6), gold);
    strutA.position.set(x, -0.7, 0.45);
    const strutB = strutA.clone();
    strutB.position.z = -0.35;
    skids.add(skid, strutA, strutB);
  }
  heli.add(body, stripe, cockpit, boom, fin, tailRotor, mast, mainRotor, skids);
  heli.scale.setScalar(0.72);

  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 5), cableMaterial);
  cable.name = 'ISLAND_19_COASTER_DELIVERY_CABLE';
  const crate = createCrate({ wood, gold, red });
  const parkedCrate = createCrate({ wood, gold, red });
  parkedCrate.name = 'ISLAND_19_COASTER_SECTION_CRATE_PARKED';
  parkedCrate.position.copy(PAD).add(new THREE.Vector3(0, 0.4, 0));
  root.add(heli, cable, crate, parkedCrate);

  let flightStart: number | null = null;
  let pendingStart = false;
  let flying = false;

  const playDelivery = (_elapsedSeconds: number) => {
    pendingStart = true;
  };

  const animate = (elapsedSeconds: number, crateParked: boolean, reducedMotion: boolean) => {
    if (pendingStart) {
      flightStart = elapsedSeconds;
      pendingStart = false;
    }
    const t = flightStart === null || reducedMotion ? -1 : elapsedSeconds - flightStart;
    if (t >= ISLAND_19_HELICOPTER_DELIVERY_SECONDS) flightStart = null;
    const pose = resolveIsland19DeliveryPose(t);
    flying = pose.visible;
    heli.visible = pose.visible;
    cable.visible = pose.visible;
    if (pose.visible) {
      heli.position.copy(pose.helicopter);
      heli.position.y += Math.sin(elapsedSeconds * 3.1) * 0.06;
      heli.rotation.set(0, pose.heading, 0);
      mainRotor.rotation.y = elapsedSeconds * 28;
      tailRotor.rotation.x = elapsedSeconds * 36;
      const hookTop = heli.position.clone().add(new THREE.Vector3(0, -0.6, 0));
      cable.scale.set(1, pose.cableLength, 1);
      cable.position.copy(hookTop).add(new THREE.Vector3(0, -pose.cableLength / 2, 0));
    }
    crate.visible = pose.visible && pose.crateAttached;
    if (crate.visible) {
      crate.position.copy(heli.position).add(new THREE.Vector3(0, -0.6 - pose.cableLength - 0.4, 0));
      crate.rotation.y = Math.sin(elapsedSeconds * 1.4) * 0.18;
    }
    // Once released, the crate sits on the pad until the section is installed.
    parkedCrate.visible = crateParked && !(pose.visible && pose.crateAttached);
  };

  return { root, playDelivery, animate, isFlying: () => flying };
}
