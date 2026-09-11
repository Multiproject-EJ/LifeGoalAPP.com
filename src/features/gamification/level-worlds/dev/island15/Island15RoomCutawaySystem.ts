import * as THREE from 'three';

export interface Island15RoomCutawayMaterials {
  silver: THREE.Material;
  crystalGlow: THREE.Material;
  violetCrystal: THREE.Material;
}

export interface Island15RoomCutawayOptions {
  host: THREE.Object3D;
  materials: Island15RoomCutawayMaterials;
  width?: number;
  height?: number;
  cutPlaneZ?: number;
  facadeTag?: string;
}

export interface Island15RoomCutawayRuntime {
  root: THREE.Group;
  getProgress: () => number;
  setOpen: (open: boolean, reducedMotion?: boolean) => void;
  update: (deltaSeconds: number, reducedMotion?: boolean) => void;
}

function makeRimMaterial(source: THREE.Material, name: string) {
  const material = source.clone();
  material.name = name;
  material.transparent = true;
  material.opacity = 0;
  material.depthWrite = false;
  return material;
}

function addSectionCap(
  parent: THREE.Group,
  name: string,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  material: THREE.Material,
) {
  const cap = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  cap.name = name;
  cap.position.set(...position);
  cap.castShadow = false;
  cap.receiveShadow = false;
  parent.add(cap);
  return cap;
}

/**
 * Presentation-only reversible room sectioning for Island 015.
 *
 * The host remains fixed in world space. Only objects explicitly tagged as the room's
 * overview facade are hidden; the floor, rear/side walls, roof structure and interior
 * keep their transforms. This system never reads or writes gameplay state.
 */
export function createIsland15RoomCutawaySystem(
  options: Island15RoomCutawayOptions,
): Island15RoomCutawayRuntime {
  const {
    host,
    materials,
    width = 3.35,
    height = 3.55,
    cutPlaneZ = 1.02,
    facadeTag = 'island15OverviewExterior',
  } = options;

  const facadeObjects: THREE.Object3D[] = [];
  host.traverse((object) => {
    if (object.userData[facadeTag]) facadeObjects.push(object);
  });

  const root = new THREE.Group();
  root.name = 'ISLAND_15_ROOM_CUTAWAY_SYSTEM';
  root.userData.partId = 'room-cutaway-system';
  root.userData.partKind = 'part';
  root.userData.partModule = 'presentation/room-cutaway-system';
  root.userData.presentationOnly = true;
  root.position.z = cutPlaneZ;

  const silver = makeRimMaterial(materials.silver, 'ISLAND_15_CUTAWAY_SILVER_CAP_MATERIAL');
  const cyan = makeRimMaterial(materials.crystalGlow, 'ISLAND_15_CUTAWAY_CYAN_RIM_MATERIAL');
  const violet = makeRimMaterial(materials.violetCrystal, 'ISLAND_15_CUTAWAY_VIOLET_RIM_MATERIAL');
  const ownedMaterials = [silver, cyan, violet];
  const halfWidth = width * 0.5;
  const wallCenterY = height * 0.5;
  const capDepth = 0.18;

  addSectionCap(root, 'ISLAND_15_CUTAWAY_LEFT_WALL_CAP', [capDepth, height, capDepth], [-halfWidth, wallCenterY, 0], silver);
  addSectionCap(root, 'ISLAND_15_CUTAWAY_RIGHT_WALL_CAP', [capDepth, height, capDepth], [halfWidth, wallCenterY, 0], silver);
  addSectionCap(root, 'ISLAND_15_CUTAWAY_FLOOR_CAP', [width, 0.13, capDepth], [0, 0.08, 0], silver);
  addSectionCap(root, 'ISLAND_15_CUTAWAY_LEFT_CYAN_EDGE', [0.055, height, capDepth + 0.035], [-halfWidth, wallCenterY, 0.012], cyan);
  addSectionCap(root, 'ISLAND_15_CUTAWAY_RIGHT_VIOLET_EDGE', [0.055, height, capDepth + 0.035], [halfWidth, wallCenterY, 0.012], violet);
  addSectionCap(root, 'ISLAND_15_CUTAWAY_FLOOR_EDGE', [width, 0.045, capDepth + 0.04], [0, 0.13, 0.015], cyan);

  const roofArc = new THREE.Mesh(
    new THREE.TorusGeometry(halfWidth, 0.07, 6, 42, Math.PI),
    silver,
  );
  roofArc.name = 'ISLAND_15_CUTAWAY_ROOF_THICKNESS_CAP';
  roofArc.position.y = height - halfWidth * 0.18;
  roofArc.scale.y = 0.42;
  root.add(roofArc);

  const veilMaterial = new THREE.MeshBasicMaterial({
    name: 'ISLAND_15_CUTAWAY_TRANSITION_VEIL_MATERIAL',
    color: 0x68ddff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.94, height * 0.86), veilMaterial);
  veil.name = 'ISLAND_15_CUTAWAY_TRANSITION_VEIL';
  veil.position.y = wallCenterY;
  veil.position.z = 0.025;
  root.add(veil);
  root.visible = false;
  host.add(root);

  let progress = 0;
  let target = 0;

  const apply = (reducedMotion: boolean) => {
    const open = progress >= 0.035;
    facadeObjects.forEach((object) => {
      object.visible = !open;
    });
    root.visible = open;
    const rimOpacity = THREE.MathUtils.smoothstep(progress, 0.04, 0.42);
    ownedMaterials.forEach((material) => {
      material.opacity = rimOpacity;
      material.needsUpdate = true;
    });
    // Never place a full-room transition plane between the focus camera and
    // the interior. On slower/mobile evidence frames the old veil could remain
    // mid-ease long enough to read as an opaque replacement façade. The
    // luminous section rim already communicates the reversible cut cleanly.
    veil.visible = false;
    veilMaterial.opacity = 0;
  };

  return {
    root,
    getProgress: () => progress,
    setOpen(open, reducedMotion = false) {
      target = open ? 1 : 0;
      if (reducedMotion) progress = target;
      apply(reducedMotion);
    },
    update(deltaSeconds, reducedMotion = false) {
      if (reducedMotion) {
        progress = target;
      } else {
        const response = 1 - Math.exp(-Math.max(deltaSeconds, 1 / 120) * 7.5);
        progress = THREE.MathUtils.lerp(progress, target, response);
        if (Math.abs(progress - target) < 0.002) progress = target;
      }
      apply(reducedMotion);
    },
  };
}
