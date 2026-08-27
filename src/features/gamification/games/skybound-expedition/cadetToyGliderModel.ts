import * as THREE from 'three';

export const CADET_BREAKABLE_PART_IDS = [
  'left-wing', 'right-wing', 'left-tailplane', 'right-tailplane', 'tail-fin', 'canopy', 'nose-cap',
] as const;

export type CadetBreakablePartId = (typeof CADET_BREAKABLE_PART_IDS)[number];

export interface CadetGliderRuntime {
  nodes: Record<string, THREE.Object3D>;
  meshes: Record<string, THREE.Mesh>;
  sockets: Record<string, THREE.Object3D>;
  colliders: Record<string, { type: 'sphere' | 'box'; size: [number, number, number] }>;
  destructionGroups: Record<string, THREE.Object3D[]>;
}

export interface CadetGliderModel extends THREE.Group {
  userData: THREE.Group['userData'] & { sculptRuntime: CadetGliderRuntime };
}

function makeMaterial(color: number, roughness: number, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function makeWingGeometry(side: -1 | 1, tail = false) {
  const length = tail ? 1.18 : 3.05;
  const chord = tail ? 0.72 : 1.34;
  const shape = new THREE.Shape();
  shape.moveTo(0, chord * 0.42);
  shape.lineTo(side * length, tail ? chord * 0.04 : -chord * 0.2);
  shape.lineTo(side * length * 0.9, -chord * 0.42);
  shape.lineTo(0, -chord * 0.28);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: tail ? 0.08 : 0.13,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.035,
    bevelThickness: 0.025,
  });
  geometry.rotateX(Math.PI / 2);
  geometry.center();
  return geometry;
}

function makeFinGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.38, 0);
  shape.lineTo(-0.2, 0.98);
  shape.quadraticCurveTo(0.02, 1.2, 0.22, 0.82);
  shape.lineTo(0.38, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.025,
    bevelThickness: 0.018,
  });
  geometry.center();
  return geometry;
}

function markPart(
  root: THREE.Group,
  runtime: CadetGliderRuntime,
  id: string,
  mesh: THREE.Mesh,
  position: THREE.Vector3,
  collider: { type: 'sphere' | 'box'; size: [number, number, number] },
  breakable = true,
) {
  const pivot = new THREE.Group();
  pivot.name = `${id}__pivot`;
  pivot.position.copy(position);
  pivot.userData.sculptComponentId = id;
  pivot.userData.breakable = breakable;
  pivot.userData.fractureGroup = id;
  mesh.name = id;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  pivot.add(mesh);
  root.add(pivot);
  runtime.nodes[id] = pivot;
  runtime.meshes[id] = mesh;
  runtime.colliders[id] = collider;
  runtime.destructionGroups[id] = breakable ? [pivot] : [];
  return pivot;
}

function addEdgeTrim(parent: THREE.Object3D, side: -1 | 1, tail = false) {
  const length = tail ? 1 : 2.72;
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(length, 0.055, 0.08),
    makeMaterial(0xf5b942, 0.32, 0.35),
  );
  trim.name = side < 0 ? 'left-wing-trim' : 'right-wing-trim';
  trim.position.set(side * length * 0.46, 0.105, tail ? 0.08 : 0.43);
  trim.rotation.y = side * (tail ? 0.08 : 0.12);
  trim.castShadow = true;
  parent.add(trim);
  return trim;
}

function addPanelLine(parent: THREE.Object3D, side: -1 | 1) {
  const line = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 0.026, 0.045),
    makeMaterial(0x0a2344, 0.58, 0.02),
  );
  line.name = side < 0 ? 'left-panel-line' : 'right-panel-line';
  line.position.set(side * 0.98, 0.11, 0.02);
  line.rotation.y = side * 0.16;
  parent.add(line);
  return line;
}

function addControlSurface(
  runtime: CadetGliderRuntime,
  parent: THREE.Object3D,
  id: string,
  size: [number, number, number],
  position: [number, number, number],
  surfaceMaterial: THREE.Material,
) {
  const pivot = new THREE.Group();
  pivot.name = `${id}__hinge`;
  pivot.position.set(...position);
  pivot.userData.sculptComponentId = id;
  pivot.userData.joint = 'hinge';
  const surface = new THREE.Mesh(new THREE.BoxGeometry(...size), surfaceMaterial);
  surface.name = id;
  surface.position.z = size[2] * -0.38;
  surface.castShadow = true;
  surface.receiveShadow = true;
  pivot.add(surface);
  parent.add(pivot);
  runtime.nodes[id] = pivot;
  runtime.meshes[id] = surface;
  runtime.colliders[id] = { type:'box', size };
  runtime.destructionGroups[id] = [];
  return pivot;
}

export function createCadetToyGliderModel(): CadetGliderModel {
  const root = new THREE.Group() as CadetGliderModel;
  root.name = 'Cadet Toy Glider Flight Root';
  root.rotation.order = 'YXZ';
  const runtime: CadetGliderRuntime = {
    nodes: { root }, meshes: {}, sockets: {}, colliders: {}, destructionGroups: {},
  };
  root.userData.sculptRuntime = runtime;
  root.userData.actionReadiness = 'named-pivots-colliders-sockets-destruction-groups';

  const white = makeMaterial(0xf6efec, 0.48, 0.02);
  const navy = makeMaterial(0x0a2344, 0.52, 0.03);
  const gold = makeMaterial(0xf3ba4c, 0.3, 0.45);
  const cyan = new THREE.MeshPhysicalMaterial({
    color: 0x55deef, roughness: 0.16, metalness: 0.04, transmission: 0.32,
    transparent: true, opacity: 0.91, clearcoat: 1, clearcoatRoughness: 0.08,
  });

  const fuselage = markPart(root, runtime, 'fuselage-shell',
    new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), white), new THREE.Vector3(),
    { type: 'sphere', size: [0.62, 0.46, 1.92] }, false);
  runtime.meshes['fuselage-shell'].scale.set(0.62, 0.46, 1.92);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), navy);
  belly.name = 'navy-belly-band';
  belly.scale.set(0.56, 0.22, 1.38);
  belly.position.set(0, -0.31, -0.08);
  belly.castShadow = true;
  fuselage.add(belly);
  runtime.nodes['navy-belly-band'] = belly;
  runtime.meshes['navy-belly-band'] = belly;

  markPart(root, runtime, 'nose-cap', new THREE.Mesh(new THREE.SphereGeometry(1, 22, 14), gold),
    new THREE.Vector3(0, -0.01, 1.88), { type: 'sphere', size: [0.43, 0.33, 0.38] });
  runtime.meshes['nose-cap'].scale.set(0.43, 0.33, 0.38);

  const leftWing = markPart(root, runtime, 'left-wing', new THREE.Mesh(makeWingGeometry(-1), white),
    new THREE.Vector3(-0.38, 0.02, 0.18), { type: 'box', size: [3.1, 0.18, 1.35] });
  const leftTrim = addEdgeTrim(leftWing, -1);
  const leftPanel = addPanelLine(leftWing, -1);
  const rightWing = markPart(root, runtime, 'right-wing', new THREE.Mesh(makeWingGeometry(1), white),
    new THREE.Vector3(0.38, 0.02, 0.18), { type: 'box', size: [3.1, 0.18, 1.35] });
  const rightTrim = addEdgeTrim(rightWing, 1);
  const rightPanel = addPanelLine(rightWing, 1);
  runtime.nodes['left-wing-trim'] = leftTrim;
  runtime.meshes['left-wing-trim'] = leftTrim;
  runtime.nodes['right-wing-trim'] = rightTrim;
  runtime.meshes['right-wing-trim'] = rightTrim;
  runtime.nodes['left-panel-line'] = leftPanel;
  runtime.meshes['left-panel-line'] = leftPanel;
  runtime.nodes['right-panel-line'] = rightPanel;
  runtime.meshes['right-panel-line'] = rightPanel;
  addControlSurface(runtime, leftWing, 'left-aileron', [1.35, 0.075, 0.32], [-1.62, 0.08, -0.43], navy);
  addControlSurface(runtime, rightWing, 'right-aileron', [1.35, 0.075, 0.32], [1.62, 0.08, -0.43], navy);

  const leftTail = markPart(root, runtime, 'left-tailplane', new THREE.Mesh(makeWingGeometry(-1, true), white),
    new THREE.Vector3(-0.28, 0.1, -1.42), { type: 'box', size: [1.2, 0.13, 0.75] });
  addEdgeTrim(leftTail, -1, true);
  const rightTail = markPart(root, runtime, 'right-tailplane', new THREE.Mesh(makeWingGeometry(1, true), white),
    new THREE.Vector3(0.28, 0.1, -1.42), { type: 'box', size: [1.2, 0.13, 0.75] });
  addEdgeTrim(rightTail, 1, true);
  addControlSurface(runtime, leftTail, 'left-elevator', [0.52, 0.065, 0.2], [-0.58, 0.07, -0.24], gold);
  addControlSurface(runtime, rightTail, 'right-elevator', [0.52, 0.065, 0.2], [0.58, 0.07, -0.24], gold);

  const tailFin = markPart(root, runtime, 'tail-fin', new THREE.Mesh(makeFinGeometry(), navy),
    new THREE.Vector3(0, 0.56, -1.48), { type: 'box', size: [0.22, 1.05, 0.76] });
  addControlSurface(runtime, tailFin, 'rudder', [0.09, 0.58, 0.24], [0, 0.18, -0.34], gold);
  markPart(root, runtime, 'canopy', new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), cyan),
    new THREE.Vector3(0, 0.48, 0.48), { type: 'sphere', size: [0.39, 0.3, 0.65] });
  runtime.meshes.canopy.scale.set(0.39, 0.3, 0.65);
  runtime.meshes.canopy.rotation.x = -0.16;

  const hookCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.22, 0, 0), new THREE.Vector3(-0.24, -0.24, 0.03),
    new THREE.Vector3(0, -0.34, 0.04), new THREE.Vector3(0.24, -0.24, 0.03),
    new THREE.Vector3(0.22, 0, 0),
  ]);
  const hook = new THREE.Mesh(new THREE.TubeGeometry(hookCurve, 20, 0.045, 8, false), gold);
  hook.name = 'launch-hook';
  hook.position.set(0, -0.38, 1.86);
  hook.castShadow = true;
  root.add(hook);
  runtime.nodes['launch-hook'] = hook;
  runtime.meshes['launch-hook'] = hook;

  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.34, 0.38, 20), navy);
  nozzle.name = 'rear-nozzle';
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.set(0, 0, -1.94);
  nozzle.castShadow = true;
  root.add(nozzle);
  runtime.nodes['rear-nozzle'] = nozzle;
  runtime.meshes['rear-nozzle'] = nozzle;

  const boostSocket = new THREE.Object3D();
  boostSocket.name = 'boost-socket';
  boostSocket.position.set(0, 0, -2.16);
  root.add(boostSocket);
  runtime.sockets['boost-socket'] = boostSocket;
  return root;
}

export function createCadetToyGliderLookDevLights() {
  const lights = new THREE.Group();
  lights.add(new THREE.HemisphereLight(0xdff4ff, 0x293448, 1.6));
  const key = new THREE.DirectionalLight(0xfff1d8, 3.2);
  key.position.set(-5, 8, 7);
  key.castShadow = true;
  lights.add(key);
  const rim = new THREE.DirectionalLight(0x73d9ff, 2.1);
  rim.position.set(5, 3, -5);
  lights.add(rim);
  return lights;
}
